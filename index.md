---
layout: default
title: Home
---

<ul class="post-grid" id="post-grid">
{% for post in site.posts limit: 6 %}
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
{% endfor %}
</ul>

<p id="more-msg" style="text-align:center; color:#8b949e; margin-top:2rem;">
  🚀 Altri post in arrivo!
</p>
