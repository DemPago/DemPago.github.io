---
layout: default
title: Home
---

<div id="post-container">
  <ul class="post-grid" id="post-grid">
    <!-- Posts loaded via JS -->
  </ul>
</div>

<div class="pagination" id="pagination"></div>

<script>
const posts = [
  {% for post in site.posts %}
  {
    url: "{{ post.url }}",
    title: "{{ post.title }}",
    description: "{{ post.description }}",
    date: "{{ post.date | date: "%d %B %Y" }}",
    cover: "{{ post.cover }}"
  }{% unless forloop.last %},{% endunless %}
  {% endfor %}
];

const perPage = 6;
let currentPage = 1;

function renderPosts(page) {
  const grid = document.getElementById('post-grid');
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const pagePosts = posts.slice(start, end);
  
  grid.innerHTML = pagePosts.map(p => `
    <li class="post-card">
      ${p.cover ? `<a href="${p.url}" class="post-card-cover"><img src="${p.cover}" alt="${p.title}"></a>` : ''}
      <div class="post-card-content">
        <h3><a href="${p.url}">${p.title}</a></h3>
        <p class="post-card-desc">${p.description}</p>
        <span class="post-card-date">${p.date}</span>
      </div>
    </li>
  `).join('');
}

function renderPagination() {
  const totalPages = Math.ceil(posts.length / perPage);
  const pag = document.getElementById('pagination');
  
  if (totalPages <= 1) return;
  
  let html = '';
  if (currentPage > 1) {
    html += `<a href="#" onclick="goToPage(${currentPage - 1}); return false;" class="page-btn">← Precedente</a>`;
  }
  
  for (let i = 1; i <= totalPages; i++) {
    if (i === currentPage) {
      html += `<span class="page-current">${i}</span>`;
    } else {
      html += `<a href="#" onclick="goToPage(${i}); return false;" class="page-num">${i}</a>`;
    }
  }
  
  if (currentPage < totalPages) {
    html += `<a href="#" onclick="goToPage(${currentPage + 1}); return false;" class="page-btn">Successivo →</a>`;
  }
  
  pag.innerHTML = html;
}

function goToPage(page) {
  currentPage = page;
  renderPosts(page);
  renderPagination();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

renderPosts(1);
renderPagination();
</script>
