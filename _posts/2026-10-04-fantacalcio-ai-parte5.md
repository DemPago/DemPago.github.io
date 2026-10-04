---
layout: post
title: "Fantacalcio AI, parte 5: streaming in tempo reale e simulazione dell'asta"
description: "Ho aggiunto lo streaming token-per-token all'app, sistemato due bug nel codice Python, e poi ho simulato l'asta vera con l'AI che mi consigliava in tempo reale. Ecco com'è andata."
date: 2026-10-04
categories: ai
tags: [AI, Python, Fantacalcio, FastAPI, SSE, Streaming, Pydantic, LocalAI]
cover: https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&auto=format&fit=crop
---

<p class="post-intro">Ciao! Bentornati su <strong>Tech Illuminato</strong>.</p>

Nella parte 4 avevo lasciato il progetto con 153 test, 4 bug corretti e la documentazione finalmente aggiornata. Il sistema era solido, testato, funzionante.

La stagione è iniziata. L'asta si avvicinava.

Avevo un'unica cosa che mi disturbava ancora: l'app web rispondeva "a blocchi". Scrivevi una domanda, aspettavi qualche secondo in silenzio, e poi compariva l'intera risposta tutta in una volta.

Funzionava — ma sembrava spento. Sembrava di parlare con un fax, non con un assistente.

Questa è la parte 5. Quella in cui trasformo il comportamento dell'app, sistemo due problemi nel codice che avevo lasciato in sospeso, e poi simulo una vera sessione d'asta per vedere se il sistema funziona davvero sotto pressione.

---

## Il problema: risposta a blocchi

L'app usa Ollama in locale per generare le risposte. Ollama, come tutti i modelli LLM moderni, produce il testo **token per token** — letteralmente parola dopo parola, in tempo reale.

Il codice precedente usava una chiamata bloccante: aspettava che Ollama finisse di generare l'intera risposta, poi la mandava tutta insieme al browser. Il modello lavorava — ma tu non lo vedevi lavorare.

```python
# Versione precedente — bloccante
resp = await client.post(OLLAMA_URL, json={
    "model": MODEL,
    "messages": messages,
    "stream": False,  # aspetta tutto
})
return JSONResponse({"response": resp.json()["message"]["content"]})
```

Il problema è noto: con un modello 7B su hardware medio, una risposta lunga può richiedere 10-15 secondi. Dieci secondi di silenzio totale, senza nessun feedback che qualcosa stia succedendo.

La soluzione è lo **streaming via SSE** — Server-Sent Events. Il server manda i token uno per uno mentre vengono generati, il browser li riceve e li aggiunge alla UI in tempo reale. Esattamente come ChatGPT, ma tutto in locale.

---

## La soluzione: SSE streaming

SSE è un protocollo semplicissimo: il server apre una connessione HTTP e manda messaggi nel formato `data: ...\n\n`. Il browser li legge man mano che arrivano.

Sul backend, FastAPI ha `StreamingResponse` apposta per questo:

```python
from fastapi.responses import StreamingResponse
import httpx, json

@app.post("/chat")
async def chat(req: ChatRequest):
    # ... costruzione del contesto e dei messaggi ...

    async def generate():
        try:
            async with httpx.AsyncClient(timeout=180) as client:
                async with client.stream("POST", OLLAMA_URL, json={
                    "model": MODEL,
                    "messages": messages,
                    "stream": True,
                    "options": {"temperature": 0.1, "num_ctx": 8192},
                }) as resp:
                    resp.raise_for_status()
                    async for line in resp.aiter_lines():
                        if not line:
                            continue
                        data = json.loads(line)
                        token = data.get("message", {}).get("content", "")
                        if token:
                            yield f"data: {json.dumps({'token': token})}\n\n"
                        if data.get("done"):
                            yield "data: [DONE]\n\n"
        except httpx.ConnectError:
            yield f"data: {json.dumps({'error': 'Ollama non raggiungibile.'})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
```

Il punto chiave: Ollama con `"stream": True` manda una riga JSON per ogni token generato. Ogni riga ha la forma `{"message": {"content": "parola"}, "done": false}`. L'ultima riga ha `"done": true`. Leggo quelle righe una per una e le ritrasmetto al browser.

Sul frontend, il `fetch()` standard non basta — serve leggere lo stream chunk per chunk:

```js
const resp = await fetch('/chat', { method: 'POST', body: JSON.stringify(payload) });
const reader = resp.body.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // l'ultima riga potrebbe essere incompleta

    for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6);
        if (payload === '[DONE]') {
            // fine — renderizza il markdown completo
            bubble.innerHTML = marked.parse(fullText);
            break;
        }
        const data = JSON.parse(payload);
        if (data.token) {
            fullText += data.token;
            bubble.textContent = fullText + '▌'; // cursore lampeggiante
        }
    }
}
```

Il `buffer` è fondamentale: i chunk TCP arrivano in modo arbitrario e una riga SSE può essere spezzata tra due `read()`. Senza il buffer, a volte si parserebbe un JSON parziale e tutto crasherebbe.

Il risultato: il cursore `▌` compare subito, e il testo appare parola per parola mentre il modello lo genera. La risposta finale viene renderizzata come Markdown (grassetti, liste, tabelle) solo quando arriva il `[DONE]`.

---

## Gli altri due fix

Mentre lavoravo allo streaming ho sistemato anche due problemi minori che avevo lasciato in sospeso.

### Default mutabile in Pydantic

Il modello `RosaState` definiva lo slot iniziale così:

```python
# Sbagliato — default mutabile condiviso tra istanze
class RosaState(BaseModel):
    slot: dict = {"P": 3, "D": 8, "C": 8, "A": 6}
```

In Pydantic v2, un default mutabile come `dict` o `list` viene condiviso tra tutte le istanze del modello. Se una request modifica lo slot, la modifica potrebbe "inquinare" le istanze successive.

Il fix è usare `Field(default_factory=...)`:

```python
from pydantic import BaseModel, Field

class RosaState(BaseModel):
    slot: dict = Field(default_factory=lambda: {"P": 3, "D": 8, "C": 8, "A": 6})
```

Con `default_factory`, ogni istanza riceve un dict **nuovo**. Pydantic v2 tra l'altro genera un warning esplicito se usi un default mutabile — avrei dovuto sistemarlo prima.

### Indice giocatori mai usato

Nel codice di avvio c'era questa riga:

```python
# Costruiva un dizionario nome→giocatore — ma nessuno lo usava
_player_index = {p["nome"].lower(): p for p in PLAYERS}
```

L'indice occupava memoria al boot e non veniva mai referenziato. L'endpoint `/players` faceva una scansione lineare su `PLAYERS` direttamente — e per una lista di ~600 giocatori con ricerche che arrivano raramente, la scansione lineare è assolutamente fine.

L'ho rimosso. Tre righe in meno, nessuna perdita funzionale.

---

## La simulazione dell'asta

Con le tre modifiche committate, ho aperto l'app e simulato una sessione d'asta realistica.

Setup: budget 500 crediti, 25 slot da riempire (3P, 8D, 8C, 6A), asta all'inglese classica. Ho iniziato dai portieri — di solito si prendono all'inizio quando le valutazioni sono ancora basse.

**Portieri low cost: il modello sbaglia e si corregge**

![Simulazione asta - portieri low cost](asta-sim-01.png)

Ho chiesto "quale portieri prendo low cost?". L'AI ha risposto subito con Suzuki del Parma — quotazione 7 crediti, FVM 5. Problema: Suzuki non gioca nel Parma.

Ho scritto "Suzuki non sta al Parma" e il modello si è corretto: "Mi scuso per l'errore. In questo caso, consideriamo **Muric** del Sassuolo come opzione low cost." Quotazione 7 crediti, FVM 4.

Questo è il comportamento che mi aspetto da uno strumento di questo tipo: i dati del listone sono corretti (Muric è nel Sassuolo), ma il modello a volte associa un giocatore alla squadra sbagliata nella risposta. La correzione funziona perché il modello ha i dati giusti — basta ridirigere.

**Rosa parziale: Muric confermato, Dimarco già in rosa**

![Simulazione asta - rosa parziale con primi acquisti](asta-sim-02.png)

Dopo aver scritto "ok prendiamo Murici" (errore di battitura mio), il modello ha capito e confermato: "Perfetto! Prendiamo **Muric** del Sassuolo come portiere low cost." Ha anche calcolato correttamente il budget: "utilizzerai 7 dei tuoi 500 crediti rimasti."

La rosa a questo punto aveva già Dimarco (Inter, 50 crediti) come difensore — aggiunto manualmente tramite il form sul lato sinistro. I contatori in alto mostrano la situazione in tempo reale: P 1/3, D 1/8, C 0/8, A 1/6.

**Streaming in azione: risposta in costruzione**

![Simulazione asta - risposta in streaming con cursore](asta-sim-03.png)

Qui si vede lo streaming nel momento più evidente: il cursore `▌` è visibile alla fine dell'ultima riga mentre il modello sta ancora generando. La rosa adesso ha 4 giocatori (Muric, Stankovic F., Dimarco, Pongracic), speso 153 crediti su 500.

L'AI sta suggerendo Stankovic F. del Venezia come secondo portiere riserva (6 crediti) e contemporaneamente elenca Thiam del Monza come alternativa più economica (5 crediti). La risposta arriva pezzo per pezzo — nome, squadra, ruolo, quotazione, motivazione — esattamente come scrivere con qualcuno che sta pensando ad alta voce.

---

## Quello che funziona e quello che non funziona

**Quello che funziona bene:**

Lo streaming cambia completamente la percezione d'uso. Con la risposta a blocchi si aspettava in silenzio e non si capiva se il modello stesse lavorando o fosse andato in crash. Con lo streaming, il cursore ti dice subito che qualcosa sta succedendo — e vedi la risposta prendere forma.

Il contesto della rosa funziona. L'app sa quanti crediti hai speso, quanti slot hai liberi per ruolo, e chi hai già in rosa. I consigli tengono conto di tutto questo senza che tu debba ripetere ogni volta la situazione.

I dati sono quelli reali del listone. Il modello non inventa nomi o quotazioni — risponde solo con giocatori presenti nei file Markdown della knowledge base.

**Quello che non funziona (ancora):**

Il modello a volte è troppo prudente. Con budget risicato tende a dire "dipende dalla tua strategia" invece di fare una scelta netta. Per l'asta, dove devi decidere in trenta secondi se rilanciare o no, "dipende" non è abbastanza.

La cronologia conversazione non sopravvive al refresh. I messaggi sono in `localStorage`, quindi se chiudi il browser tutto sparisce. Per un tool che usi solo il giorno dell'asta non è un problema critico, ma è qualcosa che nota.

Non c'è nessun modo di segnare i giocatori che sono già stati aggiudicati ad altri. Se un giocatore è andato a un avversario, l'AI potrebbe comunque consigliartelo. Richiederebbe un meccanismo per marcare i giocatori come "non disponibili" — lista degli aggiudicati.

---

## Stato del progetto

```
Streaming:   SSE token-per-token, cursore live, markdown al completamento
Backend:     FastAPI + Pydantic v2 (default_factory corretto)
Codice:      _player_index rimosso, nessuna variabile inutilizzata
Test:        153 passed (invariati — le modifiche non rompono nulla)
UI:          localStorage per cronologia, /health per stato Ollama
```

Il commit con le tre modifiche è su GitHub:

```bash
git clone https://github.com/DemPago/fantacalcio-ai.git
cd fantacalcio-ai
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.app:app --port 8000
# → http://localhost:8000
```

---

## Quello che ho imparato

Lo streaming non è solo una feature estetica. Cambia la percezione di velocità anche se il tempo totale di generazione è identico. Un'app che ti fa vedere i token arrivare sembra più veloce di una che ti fa aspettare in silenzio — anche se tecnicamente non lo è.

SSE è sottovalutato rispetto a WebSocket. Per questo caso d'uso — un flusso unidirezionale dal server al browser — SSE è più semplice, funziona su HTTP normale, non richiede librerie aggiuntive, e gestisce automaticamente la riconnessione. WebSocket sarebbe overkill.

Il bug del default mutabile in Pydantic è uno di quelli che non si nota mai finché non ti brucia. Il modello funzionava, i test passavano, ma la cosa era sbagliata. Il warning di Pydantic v2 esiste per questo — imparare a leggere i warning invece di silenziandoli vale il tempo che costa.

---

Portiamo luce.

> 💡 *Te lo spiega Dem* — **Grey Jedi Tip:** Aggiungi lo streaming appena puoi, anche su progetti piccoli. Non perché sia tecnicamente necessario — ma perché il feedback visivo cambia come ti senti mentre aspetti. E come ti senti mentre aspetti cambia come percepisci lo strumento.

---

## Il progetto è pubblico

**[github.com/DemPago/fantacalcio-ai](https://github.com/DemPago/fantacalcio-ai)**

Scrivimi nei commenti se stai usando l'app per la tua asta. 👇
