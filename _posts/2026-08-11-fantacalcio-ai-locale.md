---
layout: post
title: "Ho costruito un assistente AI per il Fantacalcio completamente in locale"
description: "Niente OpenAI, niente abbonamenti, niente dati inviati online. Solo Ollama, AnythingLLM e un po' di Python per avere un consulente di Fantacalcio sempre disponibile sul mio Mac."
date: 2026-08-11
categories: ai
tags: [AI, Ollama, LLM, Fantacalcio, Python, RAG, Privacy, LocalAI]
cover: https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=1200&auto=format&fit=crop
---

<p class="post-intro">Ciao! Bentornati su <strong>Tech Illuminato</strong>.</p>

C'è una cosa che ogni fantallenatore sa: le decisioni più importanti della settimana non si prendono allo stadio. Si prendono il venerdì sera, davanti a un foglio Excel pieno di voti e fantamedie, cercando di capire se schierare quel trequartista in dubbio o rischiare con il centrocampista che gioca fuori casa.

Ho deciso di smettere di farlo da solo.

Ma — e qui sta il punto — non volevo affidarmi a ChatGPT. Non volevo mandare la mia rosa, le mie strategie, i dati della mia lega a un server di OpenAI o di chiunque altro. Il fantacalcio è una cosa seria. La privacy anche.

Quindi ho costruito qualcosa di mio. Tutto in locale. Sul mio Mac. Con modelli open source che girano offline.

---

## Il problema

Giocare al Fantacalcio in modalità **Mantra** è complicato. Non basta sapere chi segna di più: devi gestire 12 ruoli diversi, 11 moduli possibili, regole di sostituzione che cambiano in base alla modalità scelta (Basic, Easy o Master), bonus e malus che si sommano in modi non sempre intuitivi.

Ogni giornata ti trovi a rispondere a domande come:

- *"Se schiero questo 4-1-4-1 e il mio W non gioca, chi scala?"*
- *"Vale la pena pagare 45 crediti all'asta per questo attaccante o ci sono alternative più economiche?"*
- *"Ho ancora 80 crediti e 6 slot da riempire — cosa faccio?"*

Domande che richiedono contesto, dati e ragionamento. Esattamente quello che fa bene un LLM.

---

## L'architettura

```
Fantacalcio.it (dati ufficiali)
        ↓
  File locali (CSV, JSON, Markdown)
        ↓
  AnythingLLM — indicizza e recupera i documenti
        ↓
  Ollama + Qwen3 4B — risponde usando i tuoi dati
        ↓
  Tu (fantallenatore finalmente sereno)
```

Nessun token inviato online. Nessun abbonamento. Nessun dato della tua lega che finisce nei dataset di addestramento di qualcuno.

---

## Lo stack

| Strumento | Cosa fa |
|-----------|---------|
| **Ollama** | Scarica e fa girare i modelli LLM in locale |
| **Qwen3 4B** | Il modello scelto — ottimo per ragionamento e italiano |
| **AnythingLLM** | Interfaccia RAG: carica i documenti e chatta |
| **Python** | Script per elaborare i dati (voti, rosa, statistiche) |
| **GitHub** | Repository pubblico del progetto |

Il punto chiave è il **RAG** — Retrieval Augmented Generation. Invece di sperare che il modello "sappia" qualcosa, gli dai tu i documenti giusti. Lui li legge, li usa come contesto, e risponde in modo preciso e aggiornato.

---

## Cosa ho costruito

Il progetto si chiama **fantacalcio-ai** ed è pubblico su GitHub.

### La knowledge base

Ho creato una knowledge base strutturata con:

- **Regolamento completo** in Mantra e Classic (bonus/malus, ruoli, moduli, logica sostituzioni)
- **Listone 2026-27** con 505 calciatori, ruolo Classic e Mantra, quotazione e FVM
- **20 schede squadre Serie A** generate automaticamente dai dati reali

Le schede squadre le ho generate con uno script Python che legge direttamente il file Excel esportato dal portale della lega. Dieci minuti di lavoro, zero copia-incolla manuali.

### I prompt specializzati

Ho scritto 4 system prompt diversi — uno per ogni tipo di sessione:

| Prompt | Quando usarlo |
|--------|--------------|
| **A — Formazione** | Ogni giornata: chi schiero, chi va in panchina |
| **B — Report** | Dopo la giornata: analisi sostituzioni e punti persi |
| **C — Scambi** | Prima del mercato: valutare offerte e svincolati |
| **D — Asta** | Prima dell'asta: strategia, tetti di spesa, low cost |

Quello per l'asta è probabilmente il più utile. Gli chiedi *"Prepara la mia strategia d'asta"* e lui analizza il listone, propone una distribuzione del budget per reparto, identifica i giocatori TOP su cui investire e quelli low cost da prendere a fine asta.

### Gli script Python

Due script per automatizzare il lavoro settimanale:

- **`parse_voti.py`**: legge il CSV dei voti da Fantacalcio.it e genera un JSON strutturato per giornata
- **`aggiorna_rosa.py`**: aggiorna le statistiche stagionali della rosa (fantamedia, media voto, partite giocate) con media mobile incrementale

---

## Come funziona nella pratica

Apro AnythingLLM, vado nel workspace **FC-MANTRA-2026**, cambio il system prompt con quello della sessione che mi serve, e chatto.

Per la formazione:
> *"Ho questi giocatori disponibili questa settimana: [lista]. Qual è la formazione ottimale in 4-3-3? Considera che Theo Hernandez è in dubbio."*

Per l'asta:
> *"Quanto vale Retegui all'asta? Ho un budget di 500 crediti e voglio costruire intorno a lui."*

Per gli scambi:
> *"Mi offrono Osimhen per Lukaku + 15 crediti. Conviene?"*

Il modello risponde usando i dati reali del listone e il regolamento che ho caricato. Non inventa fantamedie. Non confonde i ruoli Mantra con quelli Classic. Non suggerisce giocatori che non esistono nella mia lega.

---

## Cosa ho imparato

**Il RAG è più utile del fine-tuning per casi d'uso specifici.** Invece di addestrare un modello sul fantacalcio (costoso, complesso, che diventa obsoleto ogni stagione), gli dai i documenti aggiornati e lui li usa. Cambiano le quotazioni? Ricarichi il CSV. Nuove regole? Aggiorni il markdown.

**I modelli da 4B parametri sono sorprendentemente capaci.** Qwen3 4B gira fluido su Apple Silicon, risponde in italiano senza problemi, ragiona su strutture dati complesse. Per un uso verticale e documentato come questo, non serve un modello da 70B.

**Il sistema prompt è tutto.** La differenza tra una risposta generica e una risposta utile non sta nel modello — sta in quanto bene hai definito il contesto, le regole e il formato atteso. Ho passato più tempo a scrivere i prompt che a scrivere il codice.

---

## Quello che è andato storto (e come l'ho risolto)

Sarebbe disonesto raccontare solo la parte che funziona. Ecco i due problemi che ho incontrato subito.

### Problema 1 — Risposta in inglese con nomi inventati

La prima volta che ho chiesto *"Prepara la mia strategia d'asta"* il modello ha risposto in inglese. E i giocatori suggeriti si chiamavano **G. Bianchi**, **E. Rossi**, **A. Verdi**.

Nomi placeholder. Nomi che il modello si è inventato perché non stava usando i documenti — stava semplicemente generando testo plausibile sulla base del suo training.

Il problema era doppio:
1. La **modalità chat** era impostata su *Chat* invece di *Query* — in modalità Chat il modello ignora i documenti caricati e risponde di testa sua
2. Mancava nel system prompt l'istruzione esplicita `Rispondi sempre in italiano`

Soluzione: modalità **Query** + aggiunta della riga in fondo al prompt. Dopo la correzione, i nomi erano quelli reali del listone.

### Problema 2 — Timeout totale: Ollama bloccato e qwen3 inutilizzabile

Dopo il primo fix, il pallino continuava a girare senza risposta. Ho fatto debug da terminale:

```bash
curl -s http://localhost:11434/api/generate \
  -d '{"model":"qwen3:4b","prompt":"Ciao","stream":false}' 
# → timeout dopo 60 secondi. Sempre.
```

Problema doppio:

1. **Ollama era bloccato** — il processo girava ma non rispondeva. Soluzione: kill e riavvio manuale
   ```bash
   pkill ollama && sleep 3 && ollama serve
   ```

2. **qwen3:4b ha la modalità "thinking" attiva di default** — prima di rispondere ragiona internamente in modo esteso. Su domande complesse con documenti RAG può girare per minuti senza mai produrre output. Ho provato a disabilitarla via API (`"think":false`) ma su questa versione di Ollama non funziona.

**Soluzione definitiva**: cambiare modello. Ho sostituito `qwen3:4b` con `gemma3:4b` — stesso Mac, stesso hardware, nessuna modalità thinking, risposte in pochi secondi.

Il cambio va fatto in **due posti** in AnythingLLM (l'avevo fatto solo in uno — altro errore da non ripetere):
- Impostazioni Chat → Modello di chat
- Configurazione dell'agente → Modello dell'agente

### La prima risposta che funziona

Dopo tutti questi fix, ho fatto la domanda più semplice possibile per verificare che il sistema leggesse davvero i documenti:

> *"Quanti calciatori ci sono nel listone?"*

Risposta:

> *"Ci sono 261 calciatori nel listone listone_mantra_2026_27.csv."*

Non perfetta — il listone ne ha 505, ma probabilmente AnythingLLM ha recuperato solo una porzione dei chunk. Ma è una risposta **reale, basata sul documento**, non inventata. Il sistema funziona.

### Problema 3 — Allucinazione geografica

Incoraggiato dalla prima risposta, ho chiesto una cosa più complessa: i migliori low cost da prendere all'asta.

Risposta del modello:

> *"Sarsfield | Ruolo: D | Quota: 18 cr | Motivazione: ruolo di rilievo nel **Racing Club**"*  
> *"Mudryk | Ruolo: A/Pc | Quota: 17 cr | Motivazione: giovane promessa del **Chelsea**"*  
> *"Nunez | Ruolo: A/Pc | Quota: 16 cr | Motivazione: ruolo importante al **Liverpool**"*

Racing Club. Chelsea. Liverpool. Tutti giocatori che non esistono nel listone Serie A 2026-27.

E il modello stesso lo ha ammesso subito dopo:

> *"Hai perfettamente ragione! Mi scuso per l'errore. La knowledge base a cui ho accesso si concentra principalmente sui campionati europei, e non ha informazioni dettagliate su tutti i calciatori della Serie A per la stagione 2026-27."*

Questa è l'allucinazione RAG più comune: quando il modello non trova nel documento quello che cerca, **attinge al suo training** invece di dire "non lo so". E nel training ci sono Mudryk, Nunez, Ziyech — ma non i calciatori del listone della tua lega privata.

Il problema in questo caso non è il modello — è la **modalità Query di AnythingLLM** che non stava recuperando i chunk giusti dal CSV. Probabilmente il listone non era stato indicizzato correttamente, o la domanda era troppo vaga per trovare corrispondenze nel vettore.

La soluzione è fare domande ancorate a nomi specifici, non generiche:

```
# Troppo vago → il modello inventa:
"Dammi i migliori low cost"

# Specifico → il modello usa il documento:
"Nel listone, quali calciatori hanno ruolo Pc e quotazione inferiore a 12?"
"Elenca i calciatori del Napoli con ruolo M/C"
```

**La lezione**: con i modelli locali piccoli, vinci con la precisione della domanda, non con la lunghezza del prompt.

---

## Il progetto è pubblico

Tutto il codice, i template, i prompt e la documentazione sono su GitHub:

**[github.com/DemPago/fantacalcio-ai](https://github.com/DemPago/fantacalcio-ai)**

Ho volutamente escluso i dati personali (rosa, config lega, log) dal repo tramite `.gitignore` — è pubblico ma non espone nulla di privato.

Se giochi al Fantacalcio e vuoi adattarlo alla tua lega, puoi forkarlo e personalizzare i config. Se non giochi al Fantacalcio, la struttura RAG locale con Ollama + AnythingLLM funziona per qualsiasi dominio verticale: documentazione tecnica, normative aziendali, knowledge base di prodotto.

---

## Prossimi passi

- Fare domande specifiche per reparto e documentare le risposte reali
- Popolare la rosa dopo l'asta di agosto
- Testare il prompt D durante l'asta in tempo reale
- Valutare un'interfaccia custom in Streamlit per avere i 4 prompt selezionabili con un click

**Seguirà un post di aggiornamento** dopo l'asta — con le risposte reali del modello, i consigli che ho seguito e quelli che ho ignorato. E a fine stagione vi dico se ha fatto la differenza in classifica.

Portiamo luce.

> 💡 *Te lo spiega Dem* — **Grey Jedi Tip:** Prima di pagare l'ennesimo abbonamento a un servizio AI, chiediti se il tuo caso d'uso è abbastanza verticale da funzionare con un modello locale + i tuoi documenti. Nella maggior parte dei casi, la risposta è sì — e i tuoi dati restano tuoi.

---

## Vuoi replicarlo?

Hai bisogno di aiuto per configurare Ollama o AnythingLLM? Stai costruendo qualcosa di simile per un altro dominio?

**Scrivimi nei commenti.** Sono curioso di sapere per quali use case state usando i modelli locali. 👇
