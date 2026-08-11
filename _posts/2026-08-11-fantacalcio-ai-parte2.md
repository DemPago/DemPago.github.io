---
layout: post
title: "Fantacalcio AI, parte 2: ho smontato il RAG e ricostruito tutto da zero"
description: "AnythingLLM non funzionava. Allora ho buttato via l'interfaccia, scritto uno script Python, aggiunto una verifica anti-allucinazione, e testato un modello da 14 miliardi di parametri. Ecco com'è andata."
date: 2026-08-11
categories: ai
tags: [AI, Ollama, LLM, Fantacalcio, Python, LocalAI, ContextStuffing]
cover: https://images.unsplash.com/photo-1518604666860-9ed391f76460?w=1200&auto=format&fit=crop
---

<p class="post-intro">Ciao! Bentornati su <strong>Tech Illuminato</strong>.</p>

Nel primo articolo vi ho raccontato come ho costruito un assistente AI per il Fantacalcio completamente in locale. Vi ho anche raccontato che funzionava.

Mentivo — o meglio, ci speravo.

Questa è la parte 2. Quella in cui il RAG si è rivelato la soluzione sbagliata, AnythingLLM è stato smontato pezzo per pezzo, e alla fine ho trovato un approccio che funziona davvero. Con un modello da 14 miliardi di parametri che gira sul mio Mac.

---

## Il problema che non avevo risolto

Alla fine del primo articolo avevo un sistema che *sembrava* funzionare. AnythingLLM caricava i documenti, qwen2.5:7b rispondeva, il formato era corretto.

Il contenuto no.

> *"Chi sono i portieri con quotazione tra 8 e 18?"*

Risposta del sistema:

```
| Nome       | Quotazione | FVM |
|------------|------------|-----|
| Rossi A.   | 5          | 1   |
| Bianchi M. | 5          | 1   |
| Verdi D.   | 5          | 1   |
```

Rossi. Bianchi. Verdi. Nomi placeholder da manuale di italiano per stranieri.

Il modello non stava leggendo il listone. Stava generando testo plausibile a partire dal suo training, riempiendolo con i nomi più generici che conosceva. Il RAG non recuperava nulla di utile, e invece di dire "non so" — inventava.

---

## Perché il RAG falliva

Il RAG — Retrieval Augmented Generation — funziona così: indicizzi i documenti in un database vettoriale, poi ad ogni domanda cerchi i chunk più simili e li passi al modello come contesto.

Il problema è che "similarità semantica" e "query su dati strutturati" sono due cose diverse.

Quando chiedo *"portieri con quotazione tra 8 e 18"*, il sistema vettoriale cerca frasi semanticamente simili a quella domanda. Le righe del listone — *"Falcone gioca nel Lecce, quotazione 8 crediti, FVM 6"* — non sono semanticamente vicine alla domanda. Sono dati. Il retrieval le ignora.

Risultato: il modello riceve un contesto vuoto o parziale, e inventa.

Ho provato tutto: tabelle Markdown, testo piano, file separati per ruolo, soglie di similarità diverse. Il problema non era il formato — era l'architettura.

**Il RAG è ottimo per cercare informazioni in grandi corpus di testo narrativo. È pessimo per filtrare dati strutturati.**

---

## La soluzione: butta via il RAG

La soluzione si chiama **context stuffing**. Invece di cercare i chunk rilevanti, li inietti tutti direttamente nel system prompt.

```python
# Niente AnythingLLM. Niente vettori. Niente retrieval.
# Solo il testo dei file + Ollama via API.

with open("classic_ruolo_P.md") as f:
    portieri = f.read()

system_prompt = f"""Sei un esperto di Fantacalcio Classic.

=== PORTIERI ===
{portieri}

Usa solo questi dati. Non inventare niente."""
```

Il modello vede tutto il testo, non un sottoinsieme scelto da un algoritmo di similarità. Funziona perché il listone per ruolo — 62 portieri, 179 difensori ecc. — non è enorme: circa 13.000 caratteri per i difensori, ben dentro la finestra di contesto di qwen2.5.

---

## Lo script da terminale

Ho scritto `chat_preasta.py` — uno script Python che lancia una chat da terminale con memoria della conversazione.

```
⚽  FANTACALCIO AI — PRE-ASTA CLASSIC 2026-27
═══════════════════════════════════════════════
  505 calciatori pronti. Modello: qwen2.5:14b
  Comandi: /esci  /reset  /storia
═══════════════════════════════════════════════

Tu: dammi una buona difesa per il classic
  [contesto: difensori]
AI: Ecco alcune opzioni per costruire una solida difesa...
```

Tre cose che fa che AnythingLLM non faceva:

**1. Contesto smart per ruolo.** Se scrivi "portieri" carica solo il file dei portieri. Se scrivi "strategia d'asta" carica tutti e quattro. Non spreca token su dati non rilevanti.

**2. Memoria della conversazione.** Ogni domanda include la storia completa degli scambi precedenti. Puoi costruire un ragionamento su più turni senza ricominciare da zero.

**3. Auto-restart di Ollama.** Se il processo va in timeout — e va in timeout — lo script lo rileva, uccide Ollama, lo riavvia e riprova la domanda automaticamente.

```
  [riavvio Ollama...] pronto.
```

Nessun intervento manuale. Nessun terminale da tenere aperto di lato.

---

## Il problema di Budini

Questo è il pezzo che mi ha fatto aggiungere una funzionalità che non avevo pianificato.

Ad un certo punto il modello ha risposto con una valutazione convincente su un certo **Budini**, difensore con quotazione 18 e FVM 29. Confrontato positivamente con Dimarco.

Ho verificato nel listone:

```bash
grep -i "budini" classic_ruolo_D.md
# → nessun risultato
```

Budini non esiste. Il modello aveva letto il contesto — Dimarco era corretto — ma aveva inventato il termine di paragone.

La soluzione: **verifica preliminare dei nomi propri** prima di chiamare il modello. Lo script ora estrae le parole con iniziale maiuscola dalla domanda, le cerca nel listone, e avvisa prima di sprecare tempo:

```
Tu: confronta Di Marco e Budini
  ✓ Dimarco (Inter, D, Q:32, FVM:66)
  ✗ 'Budini' non trovato nel listone — potrebbe essere un nome inventato
  → Nessun nome valido trovato. Correggi il nome e riprova.
```

Se tutti i nomi nella domanda non esistono nel listone, lo script blocca la chiamata al modello. Zero risposte basate su giocatori inventati.

Vale anche per i nomi storpiati: *"Di Marco"* con spazio viene ricondotto a *"Dimarco"* nel listone. *"De Gea"* viene trovato. *"Szczesny"* — che non è nel listone 2026-27 — viene bloccato.

---

## L'app web (che poi ho abbandonato)

Nel mezzo di tutto questo ho anche costruito un'app web locale — FastAPI + HTML/CSS/JS — con un pannello rosa a sinistra e una chat a destra.

L'idea era bella: aggiungi i giocatori che compri all'asta, il modello vede sempre la tua situazione aggiornata e ti consiglia cosa fare con il budget rimasto.

L'ho abbandonata per la pre-asta.

Il motivo è semplice: durante la sessione di preparazione all'asta non stai gestendo una rosa in tempo reale. Stai esplorando, facendo domande, costruendo una strategia. Per quello, uno script da terminale con memoria della conversazione è più veloce e meno dispersivo di un'interfaccia grafica.

L'app web ha senso durante l'asta vera — quando aggiungi giocatori in tempo reale e vuoi consigli basati su quello che hai già. La riprenderò dopo l'asta di agosto.

---

## Il salto al 14B

Tutto il percorso sopra è stato fatto con `qwen2.5:7b` — 7 miliardi di parametri, 4.7GB su disco, gestibile su 16GB di RAM.

Il limite che emergeva era il **ragionamento numerico**. Chiedevi "portieri tra 8 e 15 crediti" e lui ti restituiva anche quelli da 16 e 17. Leggeva i dati correttamente, ma il filtro numerico preciso era approssimativo.

Ho rimosso i modelli inutilizzati — qwen3:4b, deepseek-r1:8b, gemma3:4b, llama3.2:3b, tutti accumulati durante mesi di test — e ho scaricato `qwen2.5:14b`.

9GB su disco. ~11GB in RAM a runtime. Sul mio Mac con 16GB è al limite: tecnicamente ci sta, ma il sistema operativo ha poco spazio per respirare.

Il test dirà se vale il rischio di swapping.

Il principio che mi ha guidato: **i parametri non sono marketing**. La differenza tra 7B e 14B non è solo "più grande" — è la capacità di tenere in testa più relazioni contemporaneamente mentre ragiona. Per un compito come "filtra questi 62 portieri per quotazione e dimmi chi vale l'asta", quella capacità in più si vede.

O almeno, è quello che speriamo.

---

## Cosa ho imparato stavolta

**Il context stuffing batte il RAG per dati strutturati piccoli.** Se il tuo documento sta in meno di 20.000 token, non hai bisogno di retrieval vettoriale. Inietta tutto e lascia ragionare il modello.

**La verifica pre-modello vale più del prompt engineering.** Aggiungere "non inventare nomi" nel system prompt non basta — il modello inventa lo stesso quando non trova quello che cerca. Verificare i nomi *prima* di chiamare il modello è più robusto di qualsiasi istruzione.

**L'interfaccia giusta dipende dal momento.** App web per l'asta in tempo reale. Script da terminale per la preparazione. Sono use case diversi che meritano strumenti diversi.

**I timeout sono il nemico numero uno dei modelli locali.** Non puoi eliminare il problema — puoi solo gestirlo con un buon sistema di recovery automatico.

---

## Lo stato attuale

```
Modello:    qwen2.5:14b (9GB, ~11GB in RAM)
Script:     chat_preasta.py con contesto smart + verifica nomi
Repository: github.com/DemPago/fantacalcio-ai
Stato:      pronto per la pre-asta
```

Il prossimo aggiornamento arriverà dopo l'asta di agosto — con le domande reali che ho fatto, i consigli che ho seguito, quelli che ho ignorato, e se il 14B ha fatto la differenza rispetto al 7B.

Se il Mac sopravvive.

Portiamo luce.

> 💡 *Te lo spiega Dem* — **Grey Jedi Tip:** Prima di costruire un sistema RAG complesso, chiediti quanti token pesano davvero i tuoi documenti. Se ci stanno in una finestra di contesto, il context stuffing è più semplice, più affidabile e più veloce da debuggare. La complessità aggiuntiva del RAG ha senso solo quando i dati non ci stanno più.

---

## Vuoi replicarlo?

Il codice è pubblico: **[github.com/DemPago/fantacalcio-ai](https://github.com/DemPago/fantacalcio-ai)**

Lo script `scripts/chat_preasta.py` funziona con qualsiasi listone in formato testo piano — basta adattare i percorsi dei file. Se giochi in Mantra invece di Classic, i file per ruolo Mantra sono già nel repo.

Scrivimi nei commenti se lo provi. 👇
