---
layout: default
title: Home
---

# Benvenuto nel mio blog!

Questo blog è fatto con Jekyll e GitHub Pages.

{% for post in site.posts %}
- [{{ post.title }}]({{ post.url }})
{% endfor %}
