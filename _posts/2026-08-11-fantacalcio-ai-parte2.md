---
layout: post
title: "Fantacalcio AI, parte 2: ho smontato il RAG e ricostruito tutto da zero"
description: "AnythingLLM non funzionava. Ho buttato via il RAG, scritto uno script Python, aggiunto verifica anti-allucinazione, query relazionali, quick picks e un refactoring completo. Il 14B fa swapping. Ecco com'è andata davvero."
date: 2026-08-11
categories: ai
tags: [AI, Ollama, LLM, Fantacalcio, Python, LocalAI, ContextStuffing]
cover: https://images.unsplash.com/photo-1518604666860-9ed391f76460?w=1200&auto=format&fit=crop
---

<p class="post-intro">Ciao! Bentornati su <strong>Tech Illuminato</strong>.</p>

Nel primo articolo vi ho raccontato come ho costruito un assistente AI per il Fantacalcio completamente in locale. Vi ho anche raccontato che funzionava.

Mentivo — o meglio, ci speravo.

Questa è la parte 2. Quella in cui il RAG si è rivelato la soluzione sbagliata, AnythingLLM è stato smontato pezzo per pezzo, il 14B si è rivelato inutilizzabile su 16GB, e alla fine ho costruito qualcosa che funziona davvero — con query relazionali, un menu di quick picks, e un refactoring che ha reso il tutto più veloce e robusto.

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

## Il salto al 14B (e il ritorno al 7B)

Tutto il percorso sopra è stato fatto con `qwen2.5:7b` — 7 miliardi di parametri, 4.7GB su disco, gestibile su 16GB di RAM.

Il limite che emergeva era il **ragionamento numerico**. Chiedevi "portieri tra 8 e 15 crediti" e lui ti restituiva anche quelli da 16 e 17. Leggeva i dati correttamente, ma il filtro numerico preciso era approssimativo.

Ho rimosso i modelli inutilizzati — qwen3:4b, deepseek-r1:8b, gemma3:4b, llama3.2:3b, tutti accumulati durante mesi di test — e ho scaricato `qwen2.5:14b`.

9GB su disco. ~11GB in RAM a runtime. Sul mio Mac con 16GB è al limite.

Il test non è andato bene. Il sistema operativo inizia a fare swapping quasi subito, i tempi di risposta esplodono, e dopo due domande Ollama va in timeout. Il 14B su 16GB non è inutilizzabile in assoluto — è inutilizzabile *mentre hai aperto anche il terminale, il browser e qualcos'altro*. Ovvero: inutilizzabile nella realtà.

Ho scaricato `mistral:7b` (4.4GB) come alternativa. Il ragionamento numerico non è miracolosamente migliore rispetto a qwen2.5:7b, ma la gestione del contesto è più stabile e i timeout sono rari. Il modello attuale è `mistral:7b`.

**Lezione:** i parametri non sono marketing, ma la RAM lo è. 16GB è il limite fisico reale per i modelli 7B in uso continuo. Il 14B richiede almeno 24GB per essere utilizzabile senza swapping.

---

## Il problema del linguaggio naturale

Una volta risolto il problema delle allucinazioni di nomi, ne è emerso un altro: il **vocabolario del fantacalciatore**.

Nessuno dice "portieri dello stesso ruolo e squadra del titolare". Tutti dicono *"il secondo di Martinez"*, *"la riserva di Leao"*, *"il panchinaro di De Gea"*.

Il modello capisce la struttura della frase — ma non sa chi è il secondo portiere dell'Inter. Non lo sa perché nel listone c'è solo la lista dei giocatori, non la gerarchia di squadra.

La soluzione non è aggiungere dati sulle gerarchie (che cambiano ogni settimana). È **tradurre il linguaggio naturale in una query sui dati che abbiamo**.

```
"il secondo di Martinez"
        ↓
trova Martinez nel listone → Inter, P
        ↓
restituisci tutti i P dell'Inter tranne Martinez
        ↓
inietta quella lista come contesto esplicito
```

Nessuna inference del modello. Nessun dato esterno. Solo un mapping deterministico fatto dallo script prima di chiamare il modello.

```
Tu: no ma quando si dice secondo di Martinez si intende il suo panchinaro
  ✓ Martinez Jo. (Inter, P, Q:17, FVM:16)
  [relazione rilevata → compagni di ruolo iniettati]
AI: Il secondo portiere dell'Inter nel listone è Calligaris
    (Inter, P, Q:1, FVM:1). Quotazione bassa, adatto come riserva...
```

Stesso principio si applica a *"riserva di"*, *"backup di"*, *"dodicesimo di"*. Il regex cattura il nome del titolare, lo script fa il lookup, inietta i compagni di ruolo. Il modello non deve indovinare niente.

---

## Quick picks: domande pre-costruite

L'altro problema era pratico: durante la pre-asta fai sempre le stesse domande. "Dimmi la difesa più forte." "Chi sono i top 3 attaccanti?" "Costruiscimi una rosa da 250 crediti."

Ogni volta riscrivere la domanda è noioso. Ogni volta il modello riceve tutto il contesto anche quando non serve. E per le rose complete — che richiedono 4 ruoli — una singola chiamata con tutto il listone rischia il timeout.

Ho aggiunto un **menu numerato** che appare all'avvio:

```
  ┌─ QUICK PICKS ─────────────────────────────────────┐
  │  [ 1] Miglior portiere assoluto
  │  [ 2] Miglior portiere low-cost (quotazione ≤ 5)
  │  [ 3] Difesa più forte possibile
  │  [ 4] Difesa economica (budget ≤ 60 crediti totali)
  │  [ 5] Centrocampo più forte (modulo 3-5-2)
  │  [ 6] Top 3 attaccanti da non perdere
  │  [ 7] Attaccante sorpresa (FVM alto, quotazione bassa)
  │  [ 8] Rosa competitiva completa (3-4-3)
  │  [ 9] Rosa low-cost (budget totale ≤ 250 crediti)
  │  [ 0] Torna alla chat libera
  └────────────────────────────────────────────────────┘
```

Digiti `3`, ottieni la difesa più forte. Digiti `8`, ottieni la rosa completa.

Per le rose complete (pick 8 e 9), lo script fa **4 chiamate separate** — una per ruolo, in sequenza:

```
  [rosa sequenziale: 4 chiamate separate]

  ── PORTIERI ──────────────────────────────
  AI: ...

  ── DIFENSORI ──────────────────────────────
  AI: ...
```

Ogni chiamata riceve solo il contesto del suo ruolo. Niente timeout, niente context overflow. I risultati arrivano man mano invece di aspettare 4 minuti per una risposta sola.

---

## Refactoring: meno token, più robusto

Con il codice che cresceva ho fatto un passaggio di pulizia su tre fronti.

**Performance.** Il `num_ctx` — la finestra di contesto allocata da Ollama — era fisso a 16384 per ogni chiamata. Anche quando stavi chiedendo solo del miglior portiere, con 62 righe di testo. Ora viene calcolato dinamicamente: si stima la dimensione reale del contesto in caratteri, si converte in token (÷4), si arrotonda alla potenza di 2 minima sufficiente. Una domanda sui portieri usa 4096 invece di 16384 — risposta più veloce, meno RAM occupata.

**Struttura.** Le regex erano compilate dentro le funzioni, quindi ricompilate ad ogni chiamata. Ora sono costanti a livello modulo. La logica di lookup del giocatore era duplicata in due posti — ora è una funzione sola (`lookup_player`) usata ovunque.

**Robustezza.** La storia della conversazione ora viene troncata a 10 turni (20 messaggi). Senza limite, dopo una sessione lunga il contesto esplodeva e causava timeout silenziosi. Il gestore degli errori di Ollama ora cattura anche `json.JSONDecodeError` — le risposte malformate non crashano più lo script, restituiscono un messaggio leggibile.

---

## Cosa ho imparato stavolta

**Il context stuffing batte il RAG per dati strutturati piccoli.** Se il tuo documento sta in meno di 20.000 token, non hai bisogno di retrieval vettoriale. Inietta tutto e lascia ragionare il modello.

**La verifica pre-modello vale più del prompt engineering.** Aggiungere "non inventare nomi" nel system prompt non basta. Verificare i nomi *prima* di chiamare il modello è più robusto di qualsiasi istruzione.

**Tradurre il linguaggio naturale in query deterministiche.** Quando l'utente usa vocabolario di dominio ("secondo di", "riserva di"), non chiedere al modello di inferire — scrivi il mapping nello script. È più veloce, non allucinato, e non consuma token.

**Spezzare le chiamate grandi in chiamate piccole.** Una rosa completa in una chiamata sola = timeout probabile. Quattro chiamate per ruolo = nessun timeout, risultati parziali subito, debug più semplice.

**16GB è il tetto reale per i 7B. Il 14B richiede 24GB.** Non è una questione di ottimizzazione — è fisica.

**L'interfaccia giusta dipende dal momento.** App web per l'asta in tempo reale. Script da terminale per la preparazione. Sono use case diversi che meritano strumenti diversi.

---

## Lo stato attuale

```
Modello:    mistral:7b (4.4GB, ~6GB in RAM)
Script:     chat_preasta.py
            ├── contesto smart per ruolo
            ├── verifica nomi anti-allucinazione
            ├── query relazionali (secondo/riserva/panchinaro di X)
            ├── quick picks menu numerato (9 pick)
            ├── rosa sequenziale anti-timeout
            └── num_ctx dinamico + storia troncata
Repository: github.com/DemPago/fantacalcio-ai
Stato:      pronto per la pre-asta
```

Il prossimo aggiornamento arriverà dopo l'asta di agosto — con le domande reali che ho fatto, i consigli che ho seguito, quelli che ho ignorato, e i risultati veri in classifica.

Portiamo luce.

> 💡 *Te lo spiega Dem* — **Grey Jedi Tip:** Prima di aggiungere un layer di intelligenza (RAG, embedding, fine-tuning), chiediti se puoi risolvere il problema con un mapping deterministico nello script. "Secondo di Martinez" → lookup + filter è più veloce, più affidabile e più manutenibile di qualsiasi prompt engineering. Riserva l'AI per le decisioni che richiedono davvero ragionamento.

---

## Vuoi replicarlo?

Il codice è pubblico: **[github.com/DemPago/fantacalcio-ai](https://github.com/DemPago/fantacalcio-ai)**

Lo script `scripts/chat_preasta.py` funziona con qualsiasi listone in formato testo piano — basta adattare i percorsi dei file. Se giochi in Mantra invece di Classic, i file per ruolo Mantra sono già nel repo.

Scrivimi nei commenti se lo provi. 👇
