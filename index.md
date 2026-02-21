---
layout: default
title: Home
---

<ul class="post-grid">
{% for post in paginator.posts %}
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

{% if paginator.total_pages > 1 %}
<div class="pagination">
  {% if paginator.previous_page %}
    <a href="{{ paginator.previous_page_path }}" class="page-btn">← Precedente</a>
  {% endif %}
  
  {% for page in (1..paginator.total_pages) %}
    {% if page == paginator.page %}
      <span class="page-current">{{ page }}</span>
    {% elsif page == 1 %}
      <a href="/" class="page-num">1</a>
    {% else %}
      <a href="/page{{ page }}/" class="page-num">{{ page }}</a>
    {% endif %}
  {% endfor %}
  
  {% if paginator.next_page %}
    <a href="{{ paginator.next_page_path }}" class="page-btn">Successivo →</a>
  {% endif %}
</div>
{% endif %}
