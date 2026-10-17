---
layout: post
title: "mac-health: capire in 2 secondi perché il Mac è lento"
description: "Ho costruito uno strumento bash per diagnosticare le prestazioni del Mac. RAM, swap, CPU, disco, batteria e stato termico — un comando, un verdetto."
date: 2026-10-17
categories: tech
cover: https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=1200&auto=format&fit=crop
tags: [bash, macOS, CLI, performance, tool, open-source]
---

<p class="post-intro">Ciao! Bentornati su <strong>Tech Illuminato</strong>.</p>

Sei in call con l'AD.

La tua voce arriva con 3 secondi di ritardo.

Ti freezzi.

Lui ti chiede se sei ancora lì.

Chiudi tre tab di Chrome.
Non cambia niente.

Riavvii la webcam.
Peggio.

Nel frattempo lui sta parlando e non capisci se ti sta facendo una domanda o sta concludendo.
Annuisci.
Speriamo bene.

Finita la call ho aperto il terminale — e non sapevo da dove cominciare.

---

## Il problema

Quando il Mac rallenta, le cause possibili sono tante.
RAM esaurita, swap che esplode, CPU al limite, disco pieno, batteria che non regge.

Strumenti come `top` e `htop` ti danno i dati grezzi, ma devi sapere cosa cercare.
In quel momento non hai voglia di fare analisi.

Quello che volevo era semplice: apro il terminale, digito un comando, e in 2 secondi so cosa sta succedendo.

Non esisteva.
L'ho costruito.

---

## mac-health

**mac-health** è uno script bash che raccoglie le metriche chiave del sistema e ti dà un verdetto immediato con i colori del semaforo.

```sh
brew tap dempago/tap
brew install mac-health
mac-health
```

L'output è così:

```
  MAC HEALTH CHECK  —  17/10/2026 14:32

────────────────────────────────────────────
Macchina: MacBook Pro | Apple M2 Pro | 16 GB RAM
Acceso da: 3 days, 4 hours
Carico CPU: 1.45 / 0.98 / 0.87  su 12 core  (1/5/15 min)
────────────────────────────────────────────
Memoria libera: 23%  (sotto pressione)
Memoria compressa: 2.1 GB
Swap usato: 4.2 GB  (attenzione)
────────────────────────────────────────────
Top 5 processi per CPU:
  12.3%  Google Chrome Helper
   8.1%  Slack
   ...
────────────────────────────────────────────
Disco: 96 GB liberi su 494 GB  (usato 19%)
SMART disco: Verified
Termico: ok
Batteria: Normal  (312 cicli, capacità 94%)
────────────────────────────────────────────
Verdetto: Situazione gestibile ma sotto carico. Occhio ai browser.
```

---

## Come leggere i risultati

> 💡 *Te lo spiega Dem*: "Non devi capire tutti i numeri. Guarda solo il Verdetto in fondo — è quello che ti serve."

Detto questo, ecco cosa significano le metriche principali:

| Metrica | Cosa indica |
|---|---|
| **Memoria libera** | Percentuale di RAM disponibile. Sotto il 20% il Mac inizia a soffrire. |
| **Memoria compressa** | RAM che il sistema comprime per guadagnare spazio: sintomo di saturazione. |
| **Swap usato** | La causa n.1 della lentezza. Il Mac usa il disco come RAM di emergenza. Sopra i 6 GB: situazione critica. |
| **Carico CPU** | Load average a 1, 5 e 15 minuti normalizzato per core. Sopra 1.5× inizia ad essere un problema. |
| **SMART disco** | Lo stato di salute del disco. `Failing` significa: fai un backup adesso. |
| **Batteria** | Condizione, cicli e capacità residua. Utile per capire quando è il momento di cambiarla. |

---

## Zero dipendenze

Una cosa a cui tengo: **mac-health non installa nulla**.

Usa solo tool già presenti su macOS — `vm_stat`, `sysctl`, `df`, `diskutil`, `pmset`, `system_profiler`.

Niente `bc`.
Niente Node.
Niente Python.

Funziona su Intel e Apple Silicon.

---

## Le opzioni avanzate

### Monitoraggio in tempo reale

```sh
mac-health --watch 5
```

Aggiorna il report ogni 5 secondi, come `top`.
Utile quando stai aprendo app pesanti e vuoi vedere cosa succede in tempo reale.
`Ctrl+C` per uscire.

### Output JSON per automazioni

```sh
mac-health --json | jq '.verdict, .swap_used_gb'
```

Perfetto per script, cron job o alert automatici.

### Exit codes

```sh
mac-health --fast --quiet || echo "Mac sotto carico (exit $?)"
```

`0` = sistema in salute, `1` = warning, `2` = critico.

### Soglie configurabili

```sh
MAC_HEALTH_SWAP_CRIT=4 mac-health
```

Le soglie di warning e critico sono sovrascrivibili via variabili d'ambiente, senza toccare lo script.

---

## E se lo swap è alto?

Lo swap significa che il Mac ha finito la RAM e sta usando il disco come riserva.

Il disco è decine di volte più lento della RAM.
Per questo il Mac lagga.

Rimedi immediati:

1. Chiudi i tab del browser inutili — Chrome è quasi sempre il colpevole.
2. Chiudi le app che non stai usando.
3. Riavvia per azzerare lo swap completamente.
4. Se succede spesso: la RAM è insufficiente per il tuo carico di lavoro.

---

## Installazione

**Via Homebrew** (consigliato):

```sh
brew tap dempago/tap
brew install mac-health
```

**Manuale**, se non usi Homebrew:

```sh
mkdir -p ~/bin
curl -fsSL https://raw.githubusercontent.com/DemPago/mac-health/main/bin/mac-health -o ~/bin/mac-health
chmod +x ~/bin/mac-health
echo 'export PATH="$HOME/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc
```

---

Il codice è su GitHub, MIT license.
Pull request benvenute.

La prossima volta che sei in call con l'AD e ti freezzi, almeno sai cosa guardare.

Cosa ne pensi? Lascia un commento qui sotto! 👇
