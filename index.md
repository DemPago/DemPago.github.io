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
