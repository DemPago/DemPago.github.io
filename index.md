---
layout: default
title: Home
---

<div class="tabs-container">
  <div class="tabs-pill" role="tablist" aria-label="Categorie articoli">
    <button class="tab-btn active" role="tab" aria-selected="true" aria-controls="panel-tech" id="tab-tech" data-tab="tech">
      💻 Tech
    </button>
    <button class="tab-btn" role="tab" aria-selected="false" aria-controls="panel-business" id="tab-business" data-tab="business">
      🏢 Business
    </button>
    <button class="tab-btn" role="tab" aria-selected="false" aria-controls="panel-tools" id="tab-tools" data-tab="tools">
      🛠️ Strumenti
    </button>
    <div class="tab-indicator" aria-hidden="true"></div>
  </div>
</div>

<div class="tab-panel active" id="panel-tech" role="tabpanel" aria-labelledby="tab-tech">
  {% assign tech_posts = site.posts | reject: "categories", "business" %}
  {% for post in tech_posts %}
    {% unless post.categories contains "business" %}
      {% assign words = post.content | number_of_words %}
      {% assign mins = words | divided_by: 200 %}
      {% if mins < 1 %}{% assign mins = 1 %}{% endif %}
      {% assign m = post.date | date: "%-m" %}
      {% case m %}
        {% when "1" %}{% assign mese = "gennaio" %}
        {% when "2" %}{% assign mese = "febbraio" %}
        {% when "3" %}{% assign mese = "marzo" %}
        {% when "4" %}{% assign mese = "aprile" %}
        {% when "5" %}{% assign mese = "maggio" %}
        {% when "6" %}{% assign mese = "giugno" %}
        {% when "7" %}{% assign mese = "luglio" %}
        {% when "8" %}{% assign mese = "agosto" %}
        {% when "9" %}{% assign mese = "settembre" %}
        {% when "10" %}{% assign mese = "ottobre" %}
        {% when "11" %}{% assign mese = "novembre" %}
        {% when "12" %}{% assign mese = "dicembre" %}
      {% endcase %}
      {% if forloop.first %}
      <a href="{{ post.url }}" class="post-hero">
        {% if post.cover %}
        <img src="{{ post.cover }}" alt="{{ post.title | xml_escape }}" loading="eager">
        {% endif %}
        <div class="post-hero-content">
          <span class="post-card-category cat-tech">Tech</span>
          <h2>{{ post.title }}</h2>
          <p>{{ post.description }}</p>
          <span class="post-card-date">{{ post.date | date: "%d" }} {{ mese }} {{ post.date | date: "%Y" }} · {{ mins }} min di lettura</span>
        </div>
      </a>
      <ul class="post-grid">
      {% else %}
      <li class="post-card">
        {% if post.cover %}
        <a href="{{ post.url }}" class="post-card-cover">
          <img src="{{ post.cover }}" alt="{{ post.title | xml_escape }}" loading="lazy">
        </a>
        {% endif %}
        <div class="post-card-content">
          <span class="post-card-category cat-tech">Tech</span>
          <h3><a href="{{ post.url }}">{{ post.title }}</a></h3>
          <p class="post-card-desc">{{ post.description }}</p>
          <span class="post-card-date">{{ post.date | date: "%d" }} {{ mese }} {{ post.date | date: "%Y" }} · {{ mins }} min di lettura</span>
        </div>
      </li>
      {% endif %}
    {% endunless %}
  {% endfor %}
  </ul>
</div>

<div class="tab-panel" id="panel-business" role="tabpanel" aria-labelledby="tab-business" hidden>
  {% assign business_posts = site.posts | where: "categories", "business" %}
  {% for post in business_posts %}
      {% assign words = post.content | number_of_words %}
      {% assign mins = words | divided_by: 200 %}
      {% if mins < 1 %}{% assign mins = 1 %}{% endif %}
      {% assign m = post.date | date: "%-m" %}
      {% case m %}
        {% when "1" %}{% assign mese = "gennaio" %}
        {% when "2" %}{% assign mese = "febbraio" %}
        {% when "3" %}{% assign mese = "marzo" %}
        {% when "4" %}{% assign mese = "aprile" %}
        {% when "5" %}{% assign mese = "maggio" %}
        {% when "6" %}{% assign mese = "giugno" %}
        {% when "7" %}{% assign mese = "luglio" %}
        {% when "8" %}{% assign mese = "agosto" %}
        {% when "9" %}{% assign mese = "settembre" %}
        {% when "10" %}{% assign mese = "ottobre" %}
        {% when "11" %}{% assign mese = "novembre" %}
        {% when "12" %}{% assign mese = "dicembre" %}
      {% endcase %}
      {% if forloop.first %}
      <a href="{{ post.url }}" class="post-hero">
        {% if post.cover %}
        <img src="{{ post.cover }}" alt="{{ post.title | xml_escape }}" loading="eager">
        {% endif %}
        <div class="post-hero-content">
          <span class="post-card-category cat-business">Business</span>
          <h2>{{ post.title }}</h2>
          <p>{{ post.description }}</p>
          <span class="post-card-date">{{ post.date | date: "%d" }} {{ mese }} {{ post.date | date: "%Y" }} · {{ mins }} min di lettura</span>
        </div>
      </a>
      <ul class="post-grid">
      {% else %}
      <li class="post-card">
        {% if post.cover %}
        <a href="{{ post.url }}" class="post-card-cover">
          <img src="{{ post.cover }}" alt="{{ post.title | xml_escape }}" loading="lazy">
        </a>
        {% endif %}
        <div class="post-card-content">
          <span class="post-card-category cat-business">Business</span>
          <h3><a href="{{ post.url }}">{{ post.title }}</a></h3>
          <p class="post-card-desc">{{ post.description }}</p>
          <span class="post-card-date">{{ post.date | date: "%d" }} {{ mese }} {{ post.date | date: "%Y" }} · {{ mins }} min di lettura</span>
        </div>
      </li>
      {% endif %}
  {% endfor %}
  </ul>
</div>

<div class="tab-panel" id="panel-tools" role="tabpanel" aria-labelledby="tab-tools" hidden>
  <p style="color:var(--text-muted);font-size:0.95rem;margin-bottom:1.5rem;line-height:1.6;">
    Piccoli tool gratuiti per semplificarti la vita. Niente account, niente server — tutto gira nel tuo browser.
  </p>
  <ul class="post-grid">
    <li class="post-card">
      <a href="/app/curriculum/" class="post-card-cover" style="height:160px;background:#fff;display:block;overflow:hidden;padding:12px 14px;box-sizing:border-box;text-decoration:none;">
        <!-- Mini CV mockup -->
        <div style="display:flex;gap:8px;align-items:flex-start;height:100%;">
          <div style="flex-shrink:0;">
            <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#1a1a2e,#0f3460);"></div>
          </div>
          <div style="flex:1;min-width:0;">
            <div style="height:7px;width:70%;background:#1a1a2e;border-radius:3px;margin-bottom:4px;"></div>
            <div style="height:5px;width:45%;background:#0f3460;border-radius:3px;opacity:0.5;margin-bottom:8px;"></div>
            <div style="display:flex;gap:4px;margin-bottom:8px;">
              <div style="height:4px;width:30%;background:#e5e7eb;border-radius:2px;"></div>
              <div style="height:4px;width:25%;background:#e5e7eb;border-radius:2px;"></div>
              <div style="height:4px;width:20%;background:#e5e7eb;border-radius:2px;"></div>
            </div>
            <div style="height:4px;width:100%;background:#f3f4f6;border-radius:2px;margin-bottom:3px;"></div>
            <div style="height:4px;width:90%;background:#f3f4f6;border-radius:2px;margin-bottom:3px;"></div>
            <div style="height:4px;width:80%;background:#f3f4f6;border-radius:2px;margin-bottom:8px;"></div>
            <div style="display:flex;gap:6px;">
              <div style="flex:2;">
                <div style="height:4px;width:50%;background:#0f3460;border-radius:2px;margin-bottom:4px;opacity:0.7;"></div>
                <div style="height:3px;width:100%;background:#f3f4f6;border-radius:2px;margin-bottom:2px;"></div>
                <div style="height:3px;width:85%;background:#f3f4f6;border-radius:2px;margin-bottom:2px;"></div>
                <div style="height:3px;width:95%;background:#f3f4f6;border-radius:2px;"></div>
              </div>
              <div style="flex:1;border-left:1px solid #e5e7eb;padding-left:6px;">
                <div style="height:4px;width:70%;background:#0f3460;border-radius:2px;margin-bottom:4px;opacity:0.7;"></div>
                <div style="display:flex;flex-wrap:wrap;gap:2px;">
                  <div style="height:10px;width:28px;background:rgba(15,52,96,0.1);border-radius:10px;"></div>
                  <div style="height:10px;width:22px;background:rgba(15,52,96,0.1);border-radius:10px;"></div>
                  <div style="height:10px;width:32px;background:rgba(15,52,96,0.1);border-radius:10px;"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </a>
      <div class="post-card-content">
        <span class="post-card-category cat-tech">Tool</span>
        <h3><a href="/app/curriculum/">Generatore CV</a></h3>
        <p class="post-card-desc">Crea il tuo curriculum vitae professionale con anteprima live e scaricalo in PDF con un click.</p>
      </div>
    </li>
    <li class="post-card">
      <a href="/app/cover-letter/" class="post-card-cover" style="height:160px;background:#fff;display:block;overflow:hidden;padding:14px 16px;box-sizing:border-box;text-decoration:none;">
        <!-- Mini letter mockup -->
        <div style="height:100%;display:flex;flex-direction:column;gap:6px;">
          <div style="padding-bottom:6px;border-bottom:2px solid #1a1a2e;margin-bottom:2px;">
            <div style="height:7px;width:55%;background:#1a1a2e;border-radius:3px;margin-bottom:3px;"></div>
            <div style="height:4px;width:70%;background:#aaa;border-radius:2px;"></div>
          </div>
          <div style="display:flex;justify-content:flex-end;">
            <div style="height:4px;width:30%;background:#ccc;border-radius:2px;"></div>
          </div>
          <div style="padding:4px 6px;background:#f5f6f8;border-left:3px solid #1a1a2e;border-radius:0 2px 2px 0;">
            <div style="height:3px;width:80%;background:#1a1a2e;border-radius:2px;opacity:0.5;"></div>
          </div>
          <div style="height:4px;width:90%;background:#e5e7eb;border-radius:2px;"></div>
          <div style="height:4px;width:100%;background:#e5e7eb;border-radius:2px;"></div>
          <div style="height:4px;width:85%;background:#e5e7eb;border-radius:2px;"></div>
          <div style="height:4px;width:95%;background:#f3f4f6;border-radius:2px;"></div>
          <div style="height:4px;width:75%;background:#f3f4f6;border-radius:2px;"></div>
          <div style="display:flex;gap:3px;margin-top:2px;flex-wrap:wrap;">
            <div style="height:9px;width:44px;background:rgba(15,52,96,0.12);border-radius:10px;border:1px solid rgba(15,52,96,0.2);"></div>
            <div style="height:9px;width:36px;background:rgba(15,52,96,0.12);border-radius:10px;border:1px solid rgba(15,52,96,0.2);"></div>
            <div style="height:9px;width:52px;background:rgba(15,52,96,0.12);border-radius:10px;border:1px solid rgba(15,52,96,0.2);"></div>
          </div>
        </div>
      </a>
      <div class="post-card-content">
        <span class="post-card-category cat-tech">Tool</span>
        <h3><a href="/app/cover-letter/">Lettera di Presentazione</a></h3>
        <p class="post-card-desc">Genera la tua lettera di presentazione in IT o EN con tono e motivazioni personalizzate. Scaricala in PDF o copiala in un click.</p>
      </div>
    </li>
  </ul>
</div>
