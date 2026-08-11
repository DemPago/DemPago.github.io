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

---

## Aggiornamento in tempo reale — il RAG ancora non legge il listone

Dopo aver configurato anche il workspace **FC-CLASSIC-2026**, ho fatto la domanda principale:

> *"Prepara la mia strategia d'asta"*

Il formato della risposta era perfetto — esattamente il template che avevo definito nel prompt:

```
BUDGET CONSIGLIATO PER REPARTO:
P:   18 cr  (2 acquisti)
D:   80 cr  (9 acquisti)
C:  110 cr  (13 acquisti)
A:  100 cr  (11 acquisti)
Riserva jolly: 20 cr

OBIETTIVI TOP (>50cr):
Rabiot | Ruolo: C | Quota: 22 | Max asta: 35 | Motivazione: Centrocampista completo...

OBIETTIVI MEDI (20-50cr):
Pulisic | Ruolo: C | Quota: 25 | Max asta: 40 ...
Nkunku | Ruolo: A | Quota: 13 | Max asta: 30 ...
De Ketelaere | Ruolo: A | Quota: 17 | Max asta: 35 ...

LOW COST CONSIGLIATI (<20cr):
Gaetano | Ruolo: C | Quota: 7 | Max asta: 15 ...
Samardzic | Ruolo: C | Quota: 12 | Max asta: 20 ...
Ahanor | Ruolo: D | Quota: 6 | Max asta: 12 ...
```

Il problema: **Nkunku non è in Serie A. Rabiot è al Milan ma la quota non corrisponde a quella del listone. Pulisic è al Milan ma anche la sua quota è sbagliata.**

Il modello ha imparato perfettamente il formato — ma sta ancora attingendo al suo training invece di leggere il CSV. Il RAG non sta recuperando i chunk giusti dal listone quando la domanda è generica.

### Dove siamo adesso

| Cosa funziona | Cosa non funziona ancora |
|---|---|
| Formato risposta corretto | Nomi calciatori reali dal listone |
| Risponde in italiano | RAG su domande generiche |
| Ollama stabile con gemma3:4b | Allucinazione su domande ampie |
| Sistema operativo end-to-end | Precisione dei dati |

Il prossimo test è una domanda ancorata a dati specifici:

> *"Elenca tutti i calciatori con ruolo A nel listone con quotazione tra 10 e 20"*

Se risponde con nomi reali → il RAG funziona ma ha bisogno di domande precise.  
Se inventa ancora → il CSV non è indicizzato correttamente e va ricaricato.

**Questa è la parte che nessun tutorial racconta**: configurare un sistema RAG locale non è "carica i documenti e chatta". È un processo iterativo di test, diagnosi e aggiustamento. Lo stiamo facendo in diretta.

---

## Problema 4 — Il CSV è il formato sbagliato per il RAG

Ho fatto il test diagnostico con una domanda più precisa:

> *"Elenca tutti i calciatori con ruolo A nel listone con quotazione tra 10 e 20"*

Risposta del modello:

> *"Ahanor | Ruolo: A | Quota: 6 | Difensore duttile e affidabile..."*  
> *"Samardzic | Ruolo: A | Quota: 12 | Giovane talento..."*  
> *"Zlate | Ruolo: A | Quota: 16 | Attaccante giovane nel Cagliari..."*

Ho verificato nel CSV reale. Risultato:

| Nome | Realtà |
|------|--------|
| Ahanor | Esiste — ma è un **D** (difensore), non un A. Quota 6, non nel range 10-20 |
| Samardzic | Esiste — ma è un **C** (centrocampista), non un A |
| Zlate | **Non esiste** nel listone |

Nel listone ci sono **29 attaccanti reali** con quotazione tra 10 e 20 — Scamacca, Leao, De Ketelaere, Dybala, Raspadori, Lukaku... Il modello non ne ha citato nemmeno uno.

### La causa: il CSV è opaco per il RAG

AnythingLLM indicizza i documenti spezzandoli in chunk di testo. Un CSV viene letto come testo grezzo, una riga dopo l'altra:

```
Scamacca,Atalanta,19,A,32
Leao,Milan,18,A,30
De Ketelaere,Atalanta,17,A,27
```

Per un essere umano è leggibile. Per un sistema RAG è quasi illeggibile — mancano le intestazioni nel contesto di ogni chunk, i numeri non hanno significato senza etichette, e il modello non riesce a ragionare su "filtra per ruolo A e quota > 10".

### La soluzione: convertire in Markdown strutturato

Ho riscritto il listone in Markdown, raggruppato per ruolo con tabelle esplicite:

```markdown
## Ruolo: A (29 calciatori)

| Nome | Squadra | Quota | FVM |
|------|---------|-------|-----|
| Douvikas | Como | 20 | 39 |
| Scamacca | Atalanta | 19 | 32 |
| Leao | Milan | 18 | 30 |
| Berardi | Sassuolo | 18 | 29 |
| De Ketelaere | Atalanta | 17 | 27 |
| Dybala | Roma | 14 | 17 |
| Raspadori | Atalanta | 13 | 16 |
| Lukaku | Napoli | 10 | 11 |
...
```

Ogni chunk ora contiene intestazioni leggibili, nomi reali, squadre reali, numeri con contesto. Il RAG può finalmente trovare quello che cerca.

Il prossimo test dirà se il cambio di formato risolve il problema. Se sì, la lezione è chiara: **il formato del documento conta quanto il contenuto**. Un CSV ben strutturato per Excel è spesso pessimo per un sistema RAG.

---

## Problema 5 — Nessun modello locale piccolo funziona per il RAG

Dopo il fallimento del formato, ho cambiato approccio sui modelli. Situazione finale testata:

| Modello | Dimensione | Problema |
|---------|-----------|---------|
| `qwen3:4b` | 2.5 GB | Thinking mode — timeout totale |
| `deepseek-r1:8b` | 5.2 GB | Thinking mode — timeout totale |
| `gemma3:4b` | 3.3 GB | Risponde ma mescola training e documenti |
| `llama3.2:3b` | 2.0 GB | Risponde ma ignora completamente i documenti |

Con `llama3.2:3b` ho chiesto i portieri disponibili. Risposta:

> *"Alisson Becker, Gianluigi Donnarumma, Emiliano Martinez..."*

Portieri della Premier League e della Nazionale. Il modello leggeva il nome del file (`classic_ruolo_P.md`) ma non il contenuto — citava i portieri più famosi del suo training.

Ho spezzato il listone in 4 file separati per ruolo (P, D, C, A), ho aggiornato il prompt con i riferimenti corretti, ho provato CSV, Markdown, file grandi, file piccoli. Il risultato non cambia: **i modelli da 3-4B parametri non hanno abbastanza capacità di ragionamento per fare RAG affidabile su dati strutturati**.

### La conclusione onesta

AnythingLLM + modelli piccoli funziona bene per:
- Domande su testi narrativi (regolamenti, spiegazioni)
- Riassunti di documenti
- Domande generali con risposte aperte

Non funziona per:
- Filtrare dati strutturati ("dammi gli attaccanti con quota < 15")
- Rispettare vincoli precisi ("solo dati dal documento")
- Ragionamento su tabelle con molte righe

Per questo use case servono **modelli più grandi** (13B+) o un approccio diverso: invece del RAG, passare i dati già filtrati direttamente nel prompt via script Python.

**Il prossimo step**: uno script che interroga il listone localmente e genera un brief di testo compatto da incollare nella chat — così il modello deve solo ragionare su 20-30 righe invece di cercare in 500.

Portiamo luce.

> 💡 *Te lo spiega Dem* — **Grey Jedi Tip:** Prima di pagare l'ennesimo abbonamento a un servizio AI, chiediti se il tuo caso d'uso è abbastanza verticale da funzionare con un modello locale + i tuoi documenti. Nella maggior parte dei casi, la risposta è sì — e i tuoi dati restano tuoi.

---

## Vuoi replicarlo?

Hai bisogno di aiuto per configurare Ollama o AnythingLLM? Stai costruendo qualcosa di simile per un altro dominio?

**Scrivimi nei commenti.** Sono curioso di sapere per quali use case state usando i modelli locali. 👇

---

## Problema 6 — Il RAG era la soluzione sbagliata

Dopo settimane di debug, la verità è semplice: **il RAG non è lo strumento giusto per questo problema**.

Il RAG serve quando hai molti documenti e vuoi trovare quelli rilevanti. Io ho un solo file da 38.000 caratteri. Non ho bisogno di ricerca vettoriale — ho bisogno che il modello legga tutto e ragioni.

La soluzione si chiama **context stuffing**: invece di caricare i documenti in un vettore e sperare che il retrieval trovi i chunk giusti, si inietta tutto il testo direttamente nel system prompt ad ogni richiesta.

```python
# Niente RAG. Niente AnythingLLM. Solo Python + Ollama.
system_prompt = f"""Sei un esperto di Fantacalcio Classic.

{tutti_i_505_calciatori_in_testo_piano}

Rispondi solo usando questi dati."""

messages = [{"role": "system", "content": system_prompt}] + history
```

Ho scritto uno script da terminale — `chat_preasta.py` — che:
- Carica i 4 file per ruolo (P, D, C, A) all'avvio
- Rileva automaticamente il ruolo rilevante nella domanda e inietta solo quello
- Mantiene la storia completa della conversazione
- Gira con un solo comando: `python3 scripts/chat_preasta.py`

Il test immediato con `qwen2.5:7b`:

> *"Chi sono i portieri con quotazione tra 8 e 15?"*

Risposta:
> *Maignan (Milan, 15), De Gea (Fiorentina, 13), Meret (Napoli, 11), Skorupski (Bologna, 10)...*

Nomi reali. Squadre reali. Dal listone. Senza RAG.

AnythingLLM smontato.

---

## La dipendenza nascosta dai modelli premium

Il context stuffing funziona — ma ha esposto un problema più sottile.

`qwen2.5:7b` trova i dati nel contesto, ma il **ragionamento numerico è approssimativo**. Quando chiedo "portieri tra 8 e 15" lui mi restituisce anche Butez (16) e Martinez Jo. (17). Non capisce il filtro numerico preciso con costanza.

Per la strategia d'asta serve di meglio: confronti, valutazioni, ragionamenti multicritério. E lì i 7B iniziano a mostrare i limiti.

La domanda che questo progetto ha sollevato non è tecnica. È economica:

**Quanto vale la privacy dei miei dati di fantacalcio?**

Per un uso serio — analisi pre-asta con consigli affidabili, ragionamento preciso sui numeri, memoria coerente tra sessioni — la risposta onesta è che servono modelli da 13B in su. Che sul mio hardware non girano in modo accettabile. Che in cloud costano abbonamenti mensili.

Ho costruito questo sistema proprio per evitare quei costi e mantenere i dati locali. Ma il risultato finale è che per avere qualità accettabile, le alternative sono:
- Comprare hardware migliore (Mac con 64GB+ di RAM unificata)
- Tornare ai modelli cloud (OpenAI, Anthropic, Google)
- Accettare i limiti del 7B e usarlo solo per domande semplici

Nessuna di queste è la risposta che speravo. Ma è la risposta onesta.

### Cosa ho imparato davvero

Il fantacalcio era il pretesto. Il vero esperimento era capire **dove passa il confine tra ciò che si può fare in locale e ciò che richiede infrastruttura cloud**.

Il confine passa qui: i modelli locali piccoli sono ottimi per compiti linguistici aperti (riassumi, spiega, traduci). Diventano inaffidabili quando il compito richiede precisione su dati strutturati, ragionamento numerico o memoria a lungo termine.

Per quei compiti, oggi, i modelli premium hanno un vantaggio reale. Non di marketing — tecnico.

Il LocalAI non è morto. Ma non è ancora per tutti i casi d'uso.

Portiamo luce.

> 💡 *Te lo spiega Dem* — **Grey Jedi Tip:** Se stai valutando un sistema AI locale, definisci prima il tipo di ragionamento che ti serve. Per domande aperte su testi, i modelli da 7B funzionano bene. Per analisi su dati strutturati con filtri precisi, considera i costi dell'hardware prima di quelli degli abbonamenti cloud — potrebbero sorprenderti.
