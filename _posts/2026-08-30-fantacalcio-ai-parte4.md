---
layout: post
title: "Fantacalcio AI, parte 4: ho aggiunto i test e trovato bug che non sapevo di avere"
description: "153 test automatici scritti da zero su un progetto Python. 4 bug di produzione trovati. Documentazione riscritta. E la scoperta che i test non servono a testare — servono a capire."
date: 2026-08-30
categories: ai
tags: [AI, Python, Fantacalcio, Testing, pytest, FastAPI, LocalAI, Refactoring]
cover: https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=1200&auto=format&fit=crop
---

<p class="post-intro">Ciao! Bentornati su <strong>Tech Illuminato</strong>.</p>

Nella parte 3 avevo lasciato entrare un agente AI nel codice per fare code review. Aveva trovato bug, scritto lo script mancante, migliorato l'app web.

Alla fine del post c'era questa riga:

> *"Manca ancora la test suite — è in lista ma la lascio a te decidere se prioritizzarla."*

Ho deciso.

Questa è la parte 4. Quella in cui scrivo 153 test automatici, scopro 4 bug di produzione che nessuna code review aveva trovato, riscrivo tutta la documentazione da zero, e arrivo alla conclusione che i test non servono a quello che pensavo servissero.

---

## Il punto di partenza

Il progetto aveva zero test. Neanche uno.

Non è pigrizia — è la traiettoria normale di un progetto personale che nasce come esperimento. Prima fai funzionare le cose, poi le migliori, poi — forse — le testi.

Il problema è che "forse" tende a diventare "mai".

Avevo già fatto due round di code review con un agente AI. Aveva trovato bug reali, li aveva corretti. Il codice sembrava solido.

Sembrava.

---

## Cosa ho testato e perché

Le funzioni del progetto si dividono in due categorie:

**Funzioni pure** — ricevono dati, restituiscono dati, nessun side effect:
- `calcola_fantavoto()` — calcola il punteggio di un giocatore da una riga CSV
- `aggiorna_stats()` — aggiorna le statistiche cumulative di un giocatore
- `aggiorna_riepilogo()` — aggiorna il riepilogo stagionale
- `calcola_punteggio_formazione()` — simula le sostituzioni e calcola il punteggio
- `lookup_player()`, `detect_roles()`, `build_shortlist()` — logica di ricerca e filtro

**Funzioni con I/O** — leggono file, chiamano API, scrivono su disco:
- `parse()`, `aggiorna()`, `report()` — i comandi CLI principali
- Gli endpoint FastAPI `/chat`, `/players`, `/health`

Per i test statici ho scelto di coprire solo le funzioni pure e gli endpoint tramite `TestClient` con mock. Nessun file reale, nessun Ollama vero, nessuna rete.

Il setup completo:

```bash
# Struttura finale
tests/
├── test_parse_voti.py      # 38 test su calcola_fantavoto
├── test_aggiorna_rosa.py   # 33 test su aggiorna_stats e aggiorna_riepilogo
├── test_genera_report.py   # 20 test su sostituzioni e compatibilità ruoli
├── test_chat_preasta.py    # 38 test su lookup, detect_roles, build_shortlist
└── test_app.py             # 24 test sugli endpoint FastAPI

# Esecuzione
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/pytest
# → 153 passed in 0.31s
```

---

## I 4 bug trovati dai test

### Bug 1 — Porta inviolata sempre attiva, ignorando il config

Questo è il più grave.

`calcola_fantavoto()` in `parse_voti.py` aveva questa logica:

```python
# Codice precedente — sbagliato:
if ruolo_upper in ("P", "D") and gs == 0:
    bonus += bonus_attivi.get("porta_inviolata_bonus", 1)
```

Il problema: controllava solo `gs == 0`, non se la porta inviolata era **attiva** nel config della lega.

Il file `config.json` di ogni lega ha questi campi:

```json
"bonus_attivi": {
    "porta_inviolata_por": true,
    "porta_inviolata_def": false,
    ...
}
```

Il codice li ignorava completamente. Ogni portiere che non subiva gol riceveva sempre +1, anche nelle leghe dove la porta inviolata non era un bonus previsto dal regolamento.

Il test che l'ha trovato:

```python
def test_portiere_pi_disattivata_in_config(self):
    result = calcola_fantavoto(_row(voto=6.0, gs=0), BONUS_MINIMAL, "P")
    assert result == 6.0  # PI disattivata → nessun bonus
    # → FAILED: assert 7.0 == 6.0
```

Fix:

```python
# Codice corretto:
pi_bonus = bonus_attivi.get("porta_inviolata_bonus", 1)
if ruolo_upper == "P" and gs == 0 and bonus_attivi.get("porta_inviolata_por", True):
    bonus += pi_bonus
elif ruolo_upper == "D" and gs == 0 and bonus_attivi.get("porta_inviolata_def", False):
    bonus += pi_bonus
```

### Bug 2 — Gol subiti difensori: chiave config sbagliata

Nella stessa funzione, il malus per i gol subiti dai difensori leggeva una chiave che non esisteva:

```python
# Sbagliato — la chiave nel config è "gol_subiti_def", non "gol_subiti_difensori"
elif ruolo_upper == "D" and bonus_attivi.get("gol_subiti_difensori", False):
```

Risultato: il malus per i difensori non veniva mai applicato, anche nelle leghe dove era attivo. Il test:

```python
def test_difensore_gs_attivo(self):
    result = calcola_fantavoto(_row(voto=6.0, gs=2), BONUS_FULL, "D")
    assert result == 5.0  # 6 - 2*0.5
    # → FAILED: assert 6.0 == 5.0
```

Un singolo carattere di differenza nella stringa — `"gol_subiti_difensori"` vs `"gol_subiti_def"` — che produceva un fantavoto errato in silenzio.

### Bug 3 — fantamedia non aggiornata per giocatori con fantavoto 0

In `aggiorna_rosa.py`, la fantamedia veniva aggiornata con questa condizione:

```python
# Sbagliato — salta il caso fantavoto == 0.0
if fantavoto and not sv:
```

In Python, `0.0` è falsy. Un giocatore espulso al primo minuto, con voto 5 e malus pesanti che portano il fantavoto a `0.0`, non veniva conteggiato nella fantamedia stagionale.

Dopo N partite, la sua fantamedia risultava migliore di quello che era in realtà — perché le partite peggiori venivano saltate.

Fix:

```python
if fantavoto is not None and not sv:
```

Una parola. Il test che l'ha trovato:

```python
def test_fantavoto_zero_aggiorna_fantamedia(self):
    p = _player()
    aggiorna_stats(p, _voto_entry(fantavoto=8.0), BONUS_STANDARD)
    aggiorna_stats(p, _voto_entry(fantavoto=0.0), BONUS_STANDARD)
    # fantamedia = (8.0 + 0.0) / 2 = 4.0
    assert p["stats_stagione"]["fantamedia"] == 4.0
    # → FAILED: assert 8.0 == 4.0
```

### Bug 4 — lookup_player non trovava nomi composti senza spazi

`lookup_player()` in `chat_preasta.py` ha una logica di ricerca in tre fasi: esatta, senza spazi, parziale. Il problema era nella fase "senza spazi":

```python
# Sbagliato — confronta key_ns con k, non con k senza spazi
for k, v in index.items():
    if (len(key_ns) >= 4 and key_ns in k):
        return v
```

Se l'utente scriveva `"DeKetelaere"`, lo script lo cercava nell'indice dove la chiave era `"de ketelaere"`. Il confronto `"deketelaere" in "de ketelaere"` è `False` — spazi di mezzo.

Fix:

```python
for k, v in index.items():
    k_ns = k.replace(" ", "")
    if (len(key_ns) >= 4 and key_ns in k_ns):
        return v
```

Il test:

```python
def test_ricerca_senza_spazi(self):
    result = cp.lookup_player("DeKetelaere", self.index)
    assert result is not None
    # → FAILED: assert None is not None
```

---

## Cosa ho imparato sui test

**I test non servono a testare — servono a specificare.**

Prima di scrivere un test, devi rispondere a una domanda precisa: *esattamente cosa deve fare questa funzione con questo input?* Non "dovrebbe funzionare", non "mi aspetto qualcosa di ragionevole" — esattamente.

`calcola_fantavoto(row, {"porta_inviolata_por": False}, "P")` deve restituire `6.0` o `7.0`?

Finché non scrivi il test, non lo sai con certezza. Puoi credere di saperlo, ma non lo sai. Nel momento in cui scrivi `assert result == 6.0` stai prendendo una decisione esplicita sul comportamento atteso.

Tutti e 4 i bug trovati avevano questa caratteristica: il codice *sembrava* fare la cosa giusta. Solo scrivendo il test mi sono accorto che non la faceva.

**I test su funzioni pure sono quasi gratis.**

`calcola_fantavoto()` riceve un dict e restituisce un float. Non apre file, non chiama API, non scrive su disco. Scrivere 38 test su questa funzione ha richiesto meno di un'ora e ha trovato 2 bug di produzione.

Il rapporto sforzo/risultato su funzioni pure è il migliore che esista.

**I test sulle API sono più complessi ma valgono comunque.**

Testare `/chat` con un mock di Ollama richiede un po' di setup, ma permette di verificare tutti i casi di validazione Pydantic (role invalido, content troppo lungo, troppi giocatori) senza mai avviare il server.

```python
def test_content_troppo_lungo_restituisce_422(self):
    payload = _chat_payload(content="x" * 4001)
    resp = client.post("/chat", json=payload)
    assert resp.status_code == 422
```

Questo test gira in 3 millisecondi. Avrei potuto scoprirlo manualmente solo se qualcuno avesse incollato 4001 caratteri nel campo chat.

---

## Il secondo giro di fix (oltre i test)

Mentre scrivevo i test, ho trovato anche altri problemi che non erano catturabili automaticamente ma che emergevano rileggendo il codice con occhio critico.

**`chat_preasta.py` supportava solo Classic** — il parametro `--lega` non esisteva. Il README prometteva supporto Mantra ma lo script puntava sempre a `per_ruolo_classic/`. Aggiunto `--lega classic|mantra` che cambia directory, file e system prompt.

```bash
# Adesso funziona anche:
python scripts/chat_preasta.py --lega mantra
```

**Il `.gitignore` escludeva `config.json`** — chi clonava il repo trovava gli script ma non la configurazione necessaria per farli girare. Gli script crashano senza `config.json`. Fixato: il config è ora committato (contiene solo strutture, nessun dato personale).

**`weekly_logs/` non esisteva dopo il clone** — la directory è ignorata da git per non committare i dati personali, ma non c'era nemmeno un placeholder. Aggiunto `.gitkeep` per entrambe le leghe.

**`load_files()` crashava senza messaggio** — se i file MD del listone mancavano, il crash era un generico `FileNotFoundError`. Ora mostra esattamente quali file mancano e rimanda alla sezione del setup.

---

## La documentazione che non funzionava

Ho anche riscritto tutta la documentazione. Il problema era semplice: il README descriveva ancora **AnythingLLM** come stack principale — lo strumento che avevo abbandonato nella parte 2.

Chi clonava il repo oggi trovava:
- Istruzioni per installare AnythingLLM (non serve)
- Nessuna istruzione per avviare l'app web (`uvicorn app.app:app`)
- Nessun esempio dei parametri nuovi di `parse_voti.py`
- Un workflow settimanale con "carica i file su AnythingLLM" a ogni step

Ho riscritto da zero:

**`README.md`** — stack attuale, due modalità (terminale e web) con tabella comparativa, quickstart in 3 step reali.

**`docs/setup.md`** — sostituisce `docs/setup_anythingllm.md`. Guida completa dall'installazione Python all'avvio dell'app, con troubleshooting.

**`docs/workflow_settimanale.md`** — comandi reali copiabili, nessun riferimento ad AnythingLLM, struttura directory documentata.

**Template mancanti** — `formazione_schierata.json.template` per Classic e Mantra, che `genera_report.py` usa ma nessuno sapeva come compilare.

---

## Lo stato attuale

```
Tests:      153 passed, 0 failed (0.31s)
Scripts:    parse_voti.py, aggiorna_rosa.py, genera_report.py, chat_preasta.py
App web:    FastAPI + HTML, localStorage, markdown rendering, /health endpoint
Modalità:   Classic e Mantra (entrambe funzionanti)
Docs:       README, setup.md, workflow_settimanale.md — tutti aggiornati
Templates:  rosa.json e formazione_schierata.json per entrambe le leghe
```

Il progetto è ora clonabile e funzionante da zero seguendo la documentazione.

Per verificarlo: `git clone → pip install -r requirements.txt → pytest` deve dare 153 passed prima ancora di toccare un file di configurazione.

---

## Una riflessione finale

Ho costruito questo progetto per risolvere un problema pratico: prendere decisioni migliori al Fantacalcio senza mandare i miei dati a server esterni.

Lungo la strada ho imparato cose che non mi aspettavo:

- Il RAG non è sempre la risposta giusta per dati strutturati
- I modelli 7B hanno limiti precisi e definiti, non vaghi
- Un agente AI che legge il codice trova bug che il programmatore non trova
- I test trovano bug che neanche l'agente trova
- La documentazione è codice — se non è aggiornata, il progetto non funziona

Ogni parte di questo progetto è stata un esperimento reale, con fallimenti reali e fix reali. Non ho nascosto niente — le allucinazioni di AnythingLLM, il 14B che andava in swapping, i bug nel calcolo del fantavoto.

Questo è il motivo per cui esiste questa serie: non per mostrare come si fa una cosa, ma per documentare come si *impara* a farla.

La stagione 2026-27 inizia. Il sistema è pronto.

Vi dico a fine stagione se ha fatto la differenza in classifica.

Portiamo luce.

> 💡 *Te lo spiega Dem* — **Grey Jedi Tip:** Scrivi i test dopo aver scritto il codice, non prima. Prima di tutto devi capire cosa stai costruendo. Ma scrivili prima di dichiarare "funziona" — perché funziona è una categoria più ampia di quello che pensi.

---

## Il progetto è pubblico

**[github.com/DemPago/fantacalcio-ai](https://github.com/DemPago/fantacalcio-ai)**

Per avviare la suite di test:

```bash
git clone https://github.com/DemPago/fantacalcio-ai.git
cd fantacalcio-ai
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/pytest
```

Scrivimi nei commenti se trovi altri bug. 👇
