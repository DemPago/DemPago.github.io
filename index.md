---
layout: default
title: Home
---

<h2 style="color: var(--accent); margin-bottom: 1rem;">💻 Tech</h2>

<ul class="post-grid">
{% for post in site.posts %}
{% if post.category != "business" %}
  <li class="post-card">
    {% if post.cover %}
    <a href="{{ post.url }}" class="post-card-cover">
      <img src="{{ post.cover }}" alt="{{ post.title }}">
    </a>
    {% endif %}
    <div class="post-card-content">
      <h3><a href="{{ post.url }}">{{ post.title }}</a></h3>
      <p class="post-card-desc">{{ post.description }}</p>
      <span class="post-card-date">{{ post.date | date: "%d %B %Y" }}</span>
    </div>
  </li>
{% endif %}
{% endfor %}
</ul>

<hr style="border: none; border-top: 1px solid var(--border); margin: 3rem 0;">

<h2 style="color: var(--accent); margin-bottom: 1rem;">🏢 Costruisci la tua azienda</h2>

<ul class="post-grid">
{% for post in site.posts %}
{% if post.category == "business" %}
  <li class="post-card">
    {% if post.cover %}
    <a href="{{ post.url }}" class="post-card-cover">
      <img src="{{ post.cover }}" alt="{{ post.title }}">
    </a>
    {% endif %}
    <div class="post-card-content">
      <h3><a href="{{ post.url }}">{{ post.title }}</a></h3>
      <p class="post-card-desc">{{ post.description }}</p>
      <span class="post-card-date">{{ post.date | date: "%d %B %Y" }}</span>
    </div>
  </li>
{% endif %}
{% endfor %}
</ul>
