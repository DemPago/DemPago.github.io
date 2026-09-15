---
layout: post
title: "Fantacalcio AI, parte 3: ho lasciato entrare un agente nel codice"
description: "Ho usato un agente AI per fare code review del progetto. Bug reali trovati, script mancanti scritti, app web migliorata. Ecco cosa ho imparato a lasciare fare all'AI — e cosa no."
date: 2026-08-30
categories: ai
tags: [AI, Python, Fantacalcio, CodeReview, Refactoring, FastAPI, LocalAI]
cover: https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=1200&auto=format&fit=crop
---

<p class="post-intro">Ciao! Bentornati su <strong>Tech Illuminato</strong>.</p>

Nella parte 2 vi ho raccontato come ho buttato via il RAG e ricostruito tutto da zero con il context stuffing. Alla fine di quell'articolo scrivevo: *"il prossimo aggiornamento arriverà dopo l'asta di agosto."*

L'asta di agosto è arrivata. Ma prima dell'asta è successa un'altra cosa: ho lasciato entrare un agente AI nel codice del progetto.

Non per produrre funzionalità. Per fare **code review**.

Il risultato è stato più interessante di quanto pensassi.

---

## L'esperimento

Ho chiesto a un agente di analizzare il repository dall'esterno — come un collega che non ha mai visto il codice e deve dirmi cosa non va.

Non gli ho detto *"fai tutto"*. Gli ho chiesto *"cosa miglioreresti?"* e poi *"vai, inizia"*.

Quello che è successo nelle ore successive è il contenuto di questo articolo.

---

## I bug che non sapevo di avere

### Bug 1 — Il fantavoto dei portieri era sbagliato da sempre

Questo è il più imbarazzante.

In `parse_voti.py`, la funzione `calcola_fantavoto()` applicava il malus per i gol subiti a **tutti i giocatori**, indipendentemente dal ruolo:

```python
# Codice originale — sbagliato:
malus += gs * -1  # gol subiti portiere (da gestire per ruolo)
```

Il commento stesso diceva *"da gestire per ruolo"*. L'avevo scritto sapendo che era provvisorio, e poi l'avevo dimenticato lì.

Il risultato pratico: un centravanti che si trovava con un `Gs > 0` nel CSV per qualsiasi motivo (errori di importazione, dati sporchi) riceveva un malus che non gli spettava. E i difensori non ricevevano mai il bonus porta inviolata — perché quell'altro campo era hardcodato a `0`:

```python
"porta_inviolata": 0,  # sempre 0, non calcolato mai
```

Entrambi i bug erano lì dal commit iniziale. Li ho corretti:

```python
# Gol subiti: malus solo per portieri
if ruolo_upper == "P":
    malus += gs * -1
elif ruolo_upper == "D" and bonus_attivi.get("gol_subiti_difensori", False):
    malus += gs * -0.5

# Porta inviolata: bonus per P e D se gs == 0
if ruolo_upper in ("P", "D") and gs == 0:
    bonus += bonus_attivi.get("porta_inviolata_bonus", 1)
```

Il ruolo ora viene letto dalla colonna `R` del CSV — quella che Fantacalcio.it esporta di default. Se manca, si degrada silenziosamente senza calcolare malus errati.

### Bug 2 — Una funzione che non faceva niente

In `aggiorna_rosa.py` esisteva questa funzione:

```python
def calcola_fantamedia(rosa_player: dict) -> float | None:
    """Ricalcola la fantamedia da stats_stagione."""
    # ...
    return None  # always returns None
```

Definita, mai chiamata, ritornava sempre `None`. Dead code puro. L'agente l'ha identificata, io l'ho rimossa.

### Bug 3 — Un loop O(n²) per aggiornare 25 giocatori

Sempre in `aggiorna_rosa.py`, il loop di aggiornamento aveva questa struttura:

```python
for player in rosa_aggiornata.get("rosa", []):
    player = aggiorna_stats(player, ...)
    # Poi cercava di reinserire il player aggiornato nell'array:
    for i, p in enumerate(rosa_aggiornata["rosa"]):
        if p["id"] == pid:
            rosa_aggiornata["rosa"][i] = player
            break
```

Loop dentro loop. Per aggiornare 25 giocatori faceva 625 iterazioni.

La correzione è banale — costruire un dict indicizzato per ID prima di iterare:

```python
rosa_by_id = {p["id"]: p for p in rosa_aggiornata.get("rosa", [])}
for pid, voto_entry in voti_by_id.items():
    player = rosa_by_id.get(pid)
    if player:
        aggiorna_stats(player, voto_entry, bonus_attivi)
```

O(n) invece di O(n²). In pratica la differenza è zero su 25 giocatori — ma il pattern era sbagliato concettualmente.

---

## Lo script che mancava

La parte più utile dell'analisi non erano i bug — era questa osservazione:

> *"`genera_report.py` è menzionato nel README e nel `workflow_settimanale.md` ma il file non esiste nel repository."*

Aveva ragione. Avevo scritto la documentazione prima del codice, e poi avevo dimenticato di scrivere il codice.

Lo script è stato creato. Fa quello che doveva fare dall'inizio:

- Legge `voti_giornata.json` della giornata
- Legge `formazione_schierata.json` se esiste
- Calcola il punteggio della formazione simulando le sostituzioni (compatibilità ruoli Classic)
- Produce top 3 / flop 3 automaticamente
- Scrive un `report_GN_XX.md` con tutto strutturato

```bash
python scripts/genera_report.py --lega classic --giornata 5
```

Output:

```markdown
# Report Giornata 5 — CLASSIC 2026-08-30

**Risultato**: VITTORIA 78.5 – 61.0 vs Avversario

## Top 3 della Giornata
- **Leao** — FV: 10.50 (voto base: 6.5) ⚽×2 🎯×1
- **Maignan** — FV: 8.50 (voto base: 7.0) 🔒
- **De Ketelaere** — FV: 8.00 (voto base: 6.0) ⚽×1

## Flop 3 della Giornata
...
```

Nessun LLM. Nessun Ollama. Puro Python deterministico.

---

## L'app web che ho smesso di ignorare

Nella parte 2 avevo scritto: *"L'ho abbandonata per la pre-asta."*

L'agente mi ha fatto notare tre problemi che spiegano perché quell'app non si usava volentieri.

**Problema 1 — La rosa spariva al reload.**

Nessuna persistenza. Ogni volta che ricaricavi la pagina — o il browser si aggiornava da solo durante l'asta — perdevi tutto quello che avevi inserito. Durante un'asta che dura 3-4 ore, questo è un rischio concreto.

Fix: `localStorage`. La rosa viene salvata automaticamente ad ogni modifica e ripristinata al caricamento.

```javascript
function saveState() {
  localStorage.setItem('fantacalcio_ai_state', JSON.stringify(rosa));
}
// Al boot:
rosa = loadState() || defaultRosa;
```

**Problema 2 — Le risposte del modello erano illeggibili.**

Il modello risponde in Markdown. Tabelle, grassetti, elenchi. Il codice renderizzava tutto come testo piano con `escHtml()`, quindi le risposte apparivano così:

```
## Consiglio attaccanti\n\n| Nome | Squadra | Q |\n|------|---------|---|\n| Leao | Milan | 18 |
```

Fix: `marked.js` (12KB, zero dipendenze). Le risposte ora mostrano tabelle vere, testo formattato, titoli.

**Problema 3 — Il listone intero nel prompt ad ogni richiesta.**

`app.py` iniettava tutti i ~600 giocatori nel system prompt ad ogni chiamata. Per i modelli con finestra di contesto default di 2048 token, il listone veniva troncato silenziosamente a metà. I giocatori nella seconda metà del file erano invisibili al modello.

Fix: la stessa logica di `chat_preasta.py`. Il backend rileva i ruoli dalla domanda e inietta solo la shortlist pertinente:

```python
def build_context_for_query(messages):
    recent_text = " ".join(m["content"] for m in messages[-4:] if m["role"] == "user")
    roles = detect_roles(recent_text)
    return "\n\n".join(build_shortlist(r) for r in roles)
```

Stesso codice già testato nel CLI, finalmente portato nel backend.

---

## Il fix che sembrava banale

`pandas` era in `requirements.txt` da quando ho creato il progetto. Non veniva usato da nessuna parte nel codice — avevo pianificato di usarlo e poi ho scelto il modulo `csv` della stdlib.

```diff
- pandas>=2.0.0
  rich>=13.0.0
  typer>=0.9.0
+ fastapi>=0.111.0
+ uvicorn>=0.30.0
+ httpx>=0.27.0
```

30MB di dipendenza rimossa. Le dipendenze mancanti per l'app web aggiunte.

---

## Cosa ho imparato su come usare un agente per il codice

Dopo questa sessione ho alcune osservazioni su come funziona — e non funziona — usare un agente per rivedere codice reale.

**Quello che funziona bene:**

- Trovare dead code e inconsistenze di schema (il `return None` in `calcola_fantamedia`, il malus ai non-portieri)
- Identificare feature documentate ma non implementate (il `genera_report.py` mancante)
- Portare pattern già usati in un posto in altri posti dove mancano (`build_shortlist` dal CLI al backend)
- Fix meccanici: `pkill` cross-platform, `alert()` → messaggi inline, `localStorage`

**Quello che richiede ancora giudizio umano:**

- Decidere se una feature vale la complessità aggiuntiva
- Scegliere le priorità quando ci sono dieci cose da fixare
- Valutare se un cambiamento introduce regressioni nel contesto specifico della lega

L'agente ha trovato il bug del `porta_inviolata`. Ma non sapeva che il mio config.json aveva già il campo `porta_inviolata_por: true` — ho dovuto collegare i pezzi.

---

## Lo stato attuale del progetto

```
Scripts:
  parse_voti.py      ✓ fantavoto corretto per ruolo, porta inviolata calcolata
  aggiorna_rosa.py   ✓ dead code rimosso, O(n) invece di O(n²)
  genera_report.py   ✓ creato (era documentato ma non esisteva)
  chat_preasta.py    ✓ kill cross-platform, input sanitizzato

App web (app/):
  app.py             ✓ CORS, num_ctx=8192, shortlist dinamica per ruolo
  index.html         ✓ localStorage, marked.js, errori inline, tasto "Azzera rosa"

Generale:
  requirements.txt   ✓ pandas rimosso, dipendenze web aggiunte
  rosa.json.template ✓ aggiunto per classic e mantra
```

L'asta è domani sera. Il sistema è più robusto di quanto non fosse due settimane fa.

---

## Una riflessione finale

C'è una cosa strana nel far revisionare il tuo codice da un agente: ti aspetti che trovi i problemi grandi, e invece trova quelli piccoli che non avresti mai cercato.

Il `porta_inviolata` hardcodato a `0` non ha mai causato un crash. Non avrei mai aperto quel file per debuggarlo. Ma stava producendo fantasiavoti sbagliati in silenzio da quando ho scritto il primo commit.

È la categoria di bug che i test troverebbero — se li avessi scritti. Che la code review manuale trova — se avessi un team. Che un agente trova perché legge tutto il codice senza stancarsi, senza saltare la parte noiosa.

Non so ancora se sarà utile all'asta. Ve lo dico nella parte 4.

Portiamo luce.

> 💡 *Te lo spiega Dem* — **Grey Jedi Tip:** Prima di chiedere a un agente di *scrivere* codice, prova a chiedergli di *leggere* quello che hai già. Trova i bug silenziosi meglio di quanto faccia un test scritto dopo il fatto.

---

## Vuoi replicarlo?

Il codice aggiornato è su GitHub: **[github.com/DemPago/fantacalcio-ai](https://github.com/DemPago/fantacalcio-ai)**

Commenta qui sotto se provi `genera_report.py` — sono curioso di sapere se il calcolo delle sostituzioni Classic regge con dati reali. 👇
