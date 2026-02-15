---
layout: default
title: Home
---

<ul class="post-list">
{% for post in site.posts %}
  <li>
    <a href="{{ post.url }}">{{ post.title }}</a>
    <p class="date">{{ post.date | date: "%d %B %Y" }}</p>
  </li>
{% endfor %}
</ul>
