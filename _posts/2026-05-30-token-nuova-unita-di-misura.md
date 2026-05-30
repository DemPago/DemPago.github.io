---
layout: post
title: "Serve davvero tutta questa velocità? I token sono la nuova unità di misura"
description: "Il mondo AI misura tutto in token al secondo e benchmark di velocità. Ma la vera domanda è: a chi serve correre così forte, e stiamo misurando le cose giuste?"
date: 2026-05-30
categories: tech
tags: [AI, LLM, Performance, Architettura]
cover: https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop
---

<p class="post-intro">Ciao! Bentornati su <strong>Tech Illuminato</strong>.</p>

C'è una metrica che nel 2026 senti ovunque: **token al secondo**. OpenAI la pubblica nei changelog. Anthropic la usa per giustificare i prezzi. Gli ingegneri la citano come un mantra. E nei thread di Hacker News, se il tuo modello non supera i 100 tok/s, è già considerato lento.

Ma facciamo un passo indietro. Cosa è esattamente un token? E soprattutto: serve davvero correre così forte?

---

## Cos'è un token, per chi non l'ha ancora chiesto a voce alta

Un token non è una parola. Non è un carattere. È un frammento di testo — mediamente 3-4 caratteri in inglese, meno in italiano — che i modelli linguistici usano come unità atomica di elaborazione. La parola "straordinario" diventa 3-4 token. "AI" ne è uno solo.

```python
import tiktoken

enc = tiktoken.get_encoding("cl100k_base")  # encoding usato da GPT-4

testo = "Serve davvero tutta questa velocità nei modelli AI?"
tokens = enc.encode(testo)

print(f"Testo: {testo}")
print(f"Numero di token: {len(tokens)}")
print(f"Token decodificati: {[enc.decode([t]) for t in tokens]}")

# Output:
# Numero di token: 13
# Token decodificati: ['Serve', ' davvero', ' tutta', ' questa', ' veloc', 'ità', ' nei', ' modelli', ' AI', '?', ...]
```

Ogni richiesta che fai a un LLM viene misurata in token: quanti ne mandi (input), quanti ne ricevi (output). Il costo, la velocità, il limite di contesto — tutto è espresso in token. Sono diventati la **valuta universale dell'AI**.

> 💡 *Te lo spiega Dem*: "I token sono come le calorie della cucina: li conti solo quando hai un problema, ma intanto li stai consumando ogni volta che mastichi."

---

## La corsa alla velocità: chi la vuole e perché

Facciamo una distinzione che spesso si perde nel rumore:

**Chi ha bisogno di velocità reale:**
- Applicazioni real-time: trascrizione vocale, assistenti in-call, autocomplete nel codice
- Sistemi di trading o monitoraggio dove la latenza è denaro
- Interfacce conversazionali dove l'utente aspetta e ogni secondo conta

**Chi dice di aver bisogno di velocità, ma in realtà no:**
- Batch processing notturno di documenti
- Generazione di report settimanali
- Pipeline di analisi dati asincrone
- La maggior parte delle integrazioni enterprise

<div class="esempio-tech">
⚡ <strong>Il paradosso della velocità:</strong>
<br><br>
GPT-4o genera circa 50-80 token al secondo. Un essere umano legge circa 4-5 parole al secondo, ovvero circa 5-6 token al secondo. Il modello è già 10-15x più veloce di quanto tu riesca a leggere. Eppure la corsa continua.
<br><br>
La domanda giusta non è "quanto veloce?" ma "veloce rispetto a cosa?"
</div>

---

## I token come metro di costo

Qui la questione si fa interessante per chi costruisce sistemi. I token non sono solo una misura di velocità: sono la **principale leva di costo** di qualsiasi architettura AI.

```python
# Stima del costo mensile di un sistema RAG con GPT-4o (maggio 2026)
# Prezzi indicativi: input $2.50/1M token, output $10.00/1M token
# Nota: i prezzi reali sono ormai più bassi grazie alla guerra dei prezzi tra provider,
# ma questi valori restano utili come upper bound per una stima conservativa.

richieste_al_giorno = 10_000
token_input_medi = 1_500   # contesto + documento recuperato + domanda utente
token_output_medi = 300    # risposta generata

token_input_mensili = richieste_al_giorno * token_input_medi * 30
token_output_mensili = richieste_al_giorno * token_output_medi * 30

costo_input = (token_input_mensili / 1_000_000) * 2.50
costo_output = (token_output_mensili / 1_000_000) * 10.00
costo_totale = costo_input + costo_output

print(f"Token input/mese:  {token_input_mensili:,}")
print(f"Token output/mese: {token_output_mensili:,}")
print(f"Costo stimato/mese: ${costo_totale:,.2f}")

# Token input/mese:  450,000,000
# Token output/mese: 90,000,000
# Costo stimato/mese: $2,025.00
```

Duemila dollari al mese per 10.000 richieste al giorno. Non è una cifra enorme, ma scala linearmente. Raddoppi il contesto, raddoppi il costo. Aggiungi un sistema di memoria conversazionale che porta ogni chat a 5.000 token? Il budget esplode.

> 💡 *Te lo spiega Dem*: "Il token è diventato quello che il ciclo CPU era negli anni '90: una risorsa finita che devi ottimizzare. Solo che adesso la paghi sulla bolletta ogni mese."

---

## Il problema delle metriche sbagliate

La vera questione non è tecnica. È epistemica: **stiamo misurando le cose giuste?**

I benchmark di velocità misurano token al secondo in condizioni ottimali, con prompt standard, su hardware dedicato. Non misurano:

- La qualità della risposta in relazione alla complessità del task
- Il costo effettivo per "problema risolto correttamente"
- La latenza percepita dall'utente finale (che include rete, preprocessing, rendering)
- Il consumo energetico per task completato

<table class="comparison-table">
  <thead>
    <tr>
      <th class="col-label">📊 Metrica</th>
      <th class="col-1912">Cosa misura</th>
      <th class="col-2026">Cosa non misura</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="row-label">Token/secondo</td>
      <td>Throughput grezzo del modello</td>
      <td>Utilità della risposta</td>
    </tr>
    <tr>
      <td class="row-label">Costo per 1M token</td>
      <td>Prezzo dell'infrastruttura</td>
      <td>Costo per task completato</td>
    </tr>
    <tr>
      <td class="row-label">Context window</td>
      <td>Capacità massima teorica</td>
      <td>Attenzione effettiva sui token lontani</td>
    </tr>
    <tr>
      <td class="row-label">Benchmark MMLU/HumanEval</td>
      <td>Performance su test standardizzati</td>
      <td>Comportamento nel tuo dominio specifico</td>
    </tr>
  </tbody>
</table>

---

## Quando la velocità è davvero il vincolo

Detto tutto questo, ci sono scenari dove la velocità conta eccome. Il caso più interessante è quello degli **agenti AI**: sistemi dove il modello non risponde solo a una domanda, ma ragiona in loop, chiama strumenti, verifica risultati, riprova.

```python
# Schema semplificato di un agente con tool-calling
# In questo contesto, la latenza si moltiplica per ogni step

import time

def simula_agente(task: str, steps: int, latenza_per_step_ms: int):
    """Simula il tempo totale di un agente multi-step."""
    print(f"Task: {task}")
    print(f"Steps pianificati: {steps}")
    print(f"Latenza per step: {latenza_per_step_ms}ms\n")

    tempo_totale = 0
    for i in range(1, steps + 1):
        time.sleep(latenza_per_step_ms / 1000)
        tempo_totale += latenza_per_step_ms
        print(f"  Step {i}: completato ({tempo_totale}ms totali)")

    print(f"\nTempo totale: {tempo_totale / 1000:.1f} secondi")
    print(f"Con latenza dimezzata: {tempo_totale / 2 / 1000:.1f} secondi")

# Un agente che ricerca, analizza e scrive un report
simula_agente(
    task="Analizza competitor e genera report",
    steps=8,
    latenza_per_step_ms=800
)

# Tempo totale: 6.4 secondi
# Con latenza dimezzata: 3.2 secondi
```

In un flusso agentivo con 8 step, dimezzare la latenza significa dimezzare l'attesa dell'utente. Qui la velocità ha un valore concreto e misurabile.

---

## Il rovescio della medaglia: qualità vs velocità

I modelli più veloci sono spesso versioni distillate o quantizzate di quelli grandi. Guadagni in velocità, perdi in ragionamento complesso. Non è un problema se il task è semplice — riassumere, classificare, estrarre. Diventa un problema quando:

- Il contesto è ambiguo e serve ragionamento multi-step
- Gli errori hanno costi reali (codice in produzione, decisioni mediche, contratti)
- La risposta deve essere citabile e verificabile

<div class="esempio-tech">
🔬 <strong>Il trade-off che nessuno mette nel marketing:</strong>
<br><br>
Un modello fast/cheap sbaglia il 15% delle volte su task complessi. Se ogni errore costa 30 minuti di revisione umana, e hai 1.000 task al giorno, stai spendendo 2.500 ore/mese a correggere. Il modello lento e costoso che sbaglia il 3% potrebbe costare meno in totale.
<br><br>
Il token è un'unità di costo. Il task completato correttamente è l'unità di valore. Non sono la stessa cosa.
</div>

---

## Cosa misurare davvero

Se stai costruendo qualcosa con gli LLM, queste sono le metriche che secondo me contano più dei token al secondo:

1. **Task Success Rate** — la percentuale di richieste che producono un output utilizzabile senza revisione
2. **Cost per correct output** — costo totale diviso per i task risolti correttamente
3. **Time to First Token (TTFT)** — non il throughput, ma quanto aspetta l'utente prima di vedere il primo carattere. Un modello che genera 200 tok/s ma impiega 3 secondi prima di iniziare è percepito come lento da qualsiasi utente umano. Il TTFT è la metrica psicologicamente più rilevante: il cervello interpreta il silenzio iniziale come "sta pensando ancora", e oltre i 2 secondi la fiducia nel sistema cala. Throughput alto con TTFT alto è come un ristorante velocissimo in cucina che però ti fa aspettare 10 minuti prima di portarti il menu.
4. **Error recovery rate** — quanto spesso il sistema si corregge da solo senza intervento umano

I benchmark di velocità sono utili per confrontare infrastrutture. Non sono utili per decidere se il tuo prodotto funziona.

> 💡 *Te lo spiega Dem*: "Misurare solo i token al secondo è come valutare un cuoco dal numero di piatti al minuto. Conta qualcosa, ma non è la cosa che conta di più."

---

## Conclusione: la velocità giusta al momento giusto

Non c'è una risposta unica. La velocità conta quando l'utente aspetta in real-time, quando il sistema è agentivo, quando la scala è enorme. Non conta quando processi batch, quando la qualità è critica, quando il costo di un errore supera il costo di aspettare.

I token sono diventati la nuova unità di misura dell'AI — e non è sbagliato. Sono concreti, misurabili, fatturabili. Ma come tutte le metriche, ottimizzare solo quella porta a massimizzare la cosa sbagliata.

La domanda che vale la pena farsi prima di ogni scelta architetturale non è "quanti token al secondo?" ma: **"qual è il costo reale di un errore nel mio sistema, e quanto vale un secondo di attesa per il mio utente?"**

Da lì si parte. Il resto è marketing.

Portiamo luce.

> 💡 *Te lo spiega Dem* — **Grey Jedi Tip:** Prima di scegliere un modello per velocità, scrivi il test che misura quante volte sbaglia sul tuo caso d'uso reale. Il numero ti sorprenderà.

---

## Cosa ne pensate?

Avete già ottimizzato un sistema AI per velocità e poi scoperto che il collo di bottiglia era altrove? Raccontatemi nei commenti o su LinkedIn. 👇
