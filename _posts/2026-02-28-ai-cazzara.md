---
layout: post
title: "L'AI \"Cazzara\": Perché i modelli linguistici inventano la realtà?"
description: "Spesso restiamo a bocca aperta davanti all'AI. Poi afferma che i gatti cucinano lasagne verdi nel lago. Ecco perché succede davvero."
date: 2026-02-28
categories: tech
cover: /ai-cazzara-cover.jpg
---

![Illustrazione: un robot che parla con sicurezza mentre inventa fatti assurdi](/ai-cazzara-thumb.jpeg)

Ciao! Bentornati su **Tech Illuminato**.

Spesso restiamo a bocca aperta davanti alla capacità dell'intelligenza artificiale di scrivere codici complessi o poesie commoventi. Poi, all'improvviso, la stessa tecnologia afferma con assoluta certezza che **i gatti cucinano lasagne verdi nel lago**.

Perché succede? Non è un "bug" nel senso tradizionale, ma una caratteristica intrinseca di come queste macchine sono progettate. Ecco i due pilastri che spiegano le **allucinazioni**.

---

## 1. Il gioco del Completamento Statistico

I modelli linguistici (LLM) non sono enciclopedie che consultano fatti, ma **motori statistici**. Quando rispondono, non stanno "riportando" informazioni da un archivio: stanno calcolando quale parola ha la più alta probabilità di venire dopo la precedente.

L'AI non vede le parole come noi, ma le frammenta in **token** (sillabe o pezzi di parola). Qui scattano due dinamiche cruciali:

<div class="esempio-tech">📦 <strong>Le due trappole statistiche:</strong></div>

- **Previsione statistica:** Il sistema si chiede costantemente: *"Data questa sequenza, qual è il prossimo tassello più probabile secondo i miliardi di testi che ho letto?"*

- **La trappola della fluidità:** Il modello è ottimizzato per essere piacevole e naturale. Se la risposta corretta è rara, l'AI potrebbe scegliere una risposta sbagliata ma *"grammaticalmente molto probabile"*.

In parole povere: se la prima parola è corretta, la seconda è verosimile, la terza può imboccare un **"binario morto"** di significato. Da lì in poi, l'AI continuerà a correre creando un mondo assurdo — ma scritto in un italiano perfetto.

Ecco una simulazione didattica in Python di come un LLM sceglie il prossimo token:

```python
import random

# Tabella di probabilità: dato un token, quali sono i possibili successivi?
# Questi pesi vengono "appresi" durante il training su miliardi di testi.
transizioni = {
    "Napoleone":   {"vinse": 0.30, "perse": 0.25, "era": 0.30, "cucinò": 0.15},
    "vinse":       {"a": 0.60, "contro": 0.30, "la": 0.10},
    "perse":       {"a": 0.70, "contro": 0.20, "tutto": 0.10},
    "a":           {"Waterloo": 0.80, "Parigi": 0.20},
    "cucinò":      {"lasagne": 0.90, "pasta": 0.10},
}

def prossimo_token(token_corrente):
    opzioni = transizioni.get(token_corrente, {})
    if not opzioni:
        return None
    tokens = list(opzioni.keys())
    pesi  = list(opzioni.values())
    return random.choices(tokens, weights=pesi, k=1)[0]

# Genera una frase partendo da "Napoleone"
frase = ["Napoleone"]
for _ in range(3):
    prossimo = prossimo_token(frase[-1])
    if prossimo is None:
        break
    frase.append(prossimo)

print(" ".join(frase))
# Output possibile: "Napoleone vinse a Waterloo"  ✅
# Output possibile: "Napoleone cucinò lasagne"     ❌ (allucinazione!)
```

Nota il 15% di probabilità su `cucinò`: basta che i dati di training siano sporchi o sbilanciati e l'AI imbocca tranquillamente il binario sbagliato — con la stessa voce autorevole.

> 💡 *Te lo spiega Dem*: "È come un autocomplete impazzito. Il telefono ti suggerisce parole che 'suonano bene' dopo le precedenti, anche se il risultato finale non ha senso. Gli LLM fanno la stessa cosa, ma su scala miliardaria."

---

## 2. Lacune e "Junk Food" nei dati di addestramento

Se un'AI è ciò che mangia, **una dieta fatta di informazioni parziali o contraddittorie produrrà risultati indigesti**.

> 💡 *Te lo spiega Dem*: "Siamo quello che mangiamo — vale per noi e vale per l'AI. Se la nutri di spazzatura, ti risponde con spazzatura. Garbage in, garbage out: uno dei principi più antichi dell'informatica, ancora validissimo."

### La scarsità di dati (Low-resource topics)

Sui grandi temi — come la vita di Steve Jobs — l'AI è ferratissima. Sulle **nicchie** (la sagra di un piccolo paese o un vecchio linguaggio di programmazione) la rete statistica è debole. Invece di dire *"non lo so"*, il modello colma il vuoto usando schemi di argomenti simili, mescolando verità e pura invenzione.

### Il conflitto delle fonti

Internet è pieno di bufale e pareri discordanti. Se l'AI legge 1.000 testi che sostengono la tesi A e 500 la tesi B, potrebbe:

| Comportamento | Risultato |
|---|---|
| Creare una "media" | Non corrisponde a nessuna verità |
| Saltare tra versioni | Cortocircuito logico nella stessa frase |

### Bias e "Data di scadenza" (Knowledge Cutoff)

I dati hanno una scadenza. Se un CEO cambia oggi, l'AI (che si ferma al suo ultimo aggiornamento) potrebbe **"allucinare" una fusione** tra il vecchio e il nuovo nome, semplicemente perché i suoi dati si fermano a metà dell'evento.

### Correlazione non è Causalità

L'AI vede che "Napoleone" e "Waterloo" appaiono spesso vicini. Senza una vera comprensione storica, se i dati sono scarsi, potrebbe dedurre che Napoleone abbia **vinto** — solo perché i due termini hanno una forte vicinanza statistica nel suo database.

---

## Come difendersi dalle allucinazioni?

Sapere *perché* l'AI mente è già metà della battaglia. Ecco le contromisure pratiche:

<div class="esempio-tech">📦 <strong>Strategie anti-allucinazione:</strong></div>

1. **Verifica sempre le fonti** — non fidarti ciecamente di nessuna risposta su fatti specifici, date o nomi.
2. **Usa RAG (Retrieval-Augmented Generation)** — sistemi che fanno cercare all'AI le informazioni in un database verificato *prima* di rispondere.
3. **Chiedi all'AI di citare** — "Da dove hai preso questa informazione?" spesso smonta la risposta inventata.
4. **Valuta la confidenza** — alcuni modelli indicano quanto sono "sicuri". Bassa confidenza = alta attenzione.
5. **Prompt specifici** — più il contesto è preciso, meno spazio c'è per la fantasia statistica.

### Prompt scarso vs Prompt ben costruito

La differenza tra un'allucinazione e una risposta utile spesso sta solo in come fai la domanda:

```
# ❌ PROMPT SCARSO — lascia troppo spazio alla fantasia statistica
"Dimmi qualcosa su Napoleone a Waterloo"

# Risposta possibile (inventata con sicurezza):
# "Napoleone vinse brillantemente la battaglia di Waterloo nel 1815,
#  consolidando il dominio francese sull'Europa."


# ✅ PROMPT BEN COSTRUITO — contesto preciso, meno spazio per l'AI di improvvisare
"""
Sei uno storico esperto. Rispondi solo con fatti verificabili.
Se non sei sicuro, di' esplicitamente 'non ho dati sufficienti'.

Domanda: Qual è stato l'esito della battaglia di Waterloo per Napoleone?
"""

# Risposta attesa:
# "Napoleone subì una sconfitta decisiva a Waterloo il 18 giugno 1815,
#  che portò alla sua seconda abdicazione e all'esilio a Sant'Elena."
```

### Come funziona il RAG in pratica

Il RAG (Retrieval-Augmented Generation) è la contromisura più efficace alle allucinazioni. Invece di affidarsi solo alla "memoria" del modello, il sistema va a cercare le informazioni prima di rispondere:

```python
# Schema semplificato di un sistema RAG

def rispondi_con_rag(domanda: str) -> str:
    # 1. RETRIEVE — cerca i documenti rilevanti nel tuo database verificato
    documenti = database.cerca(domanda, top_k=3)
    # es: ["Waterloo 1815: Napoleone sconfitto dai prussiani...",
    #      "La battaglia durò un giorno solo...", ...]

    # 2. AUGMENT — costruisci un prompt arricchito con i fatti reali
    contesto = "\n".join(documenti)
    prompt = f"""
    Usa SOLO le informazioni seguenti per rispondere.
    Se la risposta non è nei documenti, di' 'non lo so'.

    Documenti:
    {contesto}

    Domanda: {domanda}
    """

    # 3. GENERATE — ora l'LLM risponde con dati verificati, non inventati
    risposta = llm.genera(prompt)
    return risposta

# Risultato: l'AI non può "inventare" perché il contesto la vincola ai fatti reali
```

> 💡 *Te lo spiega Dem*: "Il RAG è come dare all'AI un foglietto con i dati giusti prima dell'esame. Non si fida più solo di quello che ricorda — consulta le fonti vere. Questo taglia drasticamente le allucinazioni sui fatti specifici."

---

## Il paradosso dell'AI Cazzara

C'è un'ironia fondamentale in tutto questo: **l'AI mente meglio quando sembra più sicura**. Non esita, non dice "forse". Afferma con la stessa voce autorevole sia la verità storica che la lasagna dei gatti.

Questo non significa che gli LLM siano inutili — tutt'altro. Significa che vanno usati come **strumenti potenti ma da supervisionare**, non come oracoli infallibili.

L'AI è un collaboratore straordinario. Come tutti i collaboratori straordinari, ogni tanto dice una stupidata con una faccia tosta incredibile. Il tuo compito è saperlo e tenerlo d'occhio.

---

## Cosa ne pensi?

Hai mai beccato un'AI in flagrante mentre inventava qualcosa di assurdo? Raccontami nei commenti! 👇

Le allucinazioni più creative valgono un articolo dedicato... 😄
