# AGENTS.md — DemPago.github.io

## What this is

Personal Italian-language tech blog hosted on **GitHub Pages**, built with **pure Jekyll**. No Node.js, no npm, no TypeScript, no bundler. All JS/CSS is vanilla. No `Gemfile`, `package.json`, or lockfile of any kind.

---

## Commands

```bash
# Serve locally with live reload
jekyll serve --livereload

# Serve with drafts visible
jekyll serve --drafts --livereload

# Build only (outputs to _site/)
jekyll build
```

**Deploy**: push to `main` → GitHub Pages auto-builds. No CI workflow file exists.

**No lint, no tests, no typecheck** — none of these exist in this project.

---

## Structure

```
_config.yml          ← site config (kramdown, permalink: /:title/)
_layouts/
  default.html       ← sidebar + Firebase visit counter + newsletter popup
  post.html          ← extends default; adds cover, date, share buttons, Giscus comments
  app.html           ← standalone layout for tools (no sidebar, no counter)
_posts/              ← YYYY-MM-DD-slug.md
_drafts/             ← _post-template.md is the canonical template
app/                 ← browser-only mini-tools (CV, cover letter, IP calculator)
main.js              ← all client-side JS (search, tabs, Firebase counter, newsletter)
styles.css           ← all CSS
search.json          ← Jekyll Liquid template generating a JSON search index — NOT a static file
```

---

## Post front matter (required fields)

```yaml
layout: post
title: "Titolo"
description: "Breve descrizione (~160 chars)"
date: YYYY-MM-DD
categories: tech      # OR: business — controls which homepage tab shows the post
cover: /image.jpg     # or https:// URL — used as hero + OG image
tags: [AI, Tech]      # optional
```

- Filename: `_posts/YYYY-MM-DD-slug.md` — date in filename determines `page.date`
- Images go in the **repo root** (e.g. `/titanic.png`) — no `assets/` or `images/` convention

---

## Conventions & gotchas

1. **Category routing is binary**: only `categories: business` → Business tab. Everything else → Tech tab. Multiple categories per post break tab logic.

2. **`search.json` is a Liquid template** — do not replace with a static JSON file. Tags and search are fetched from it at runtime by `main.js`.

3. **`layout: app`** adds `data-layout="app"` to `<body>` which causes `main.js` to skip all blog-specific init. Do not use `layout: post` for tools pages.

4. **No `Gemfile`** — GitHub Pages uses its own implicit Jekyll version. Local `jekyll serve` may render slightly differently.

5. **Firebase API key in `main.js` is intentionally public** — Firestore rules handle access control.

6. **Giscus comments** are tied to repo ID `R_kgDORQ3_vA`. If the repo is forked or renamed, comments break.

7. **All UI strings are in Italian** — do not introduce English strings in templates.

8. **Newsletter popup only appears on `layout: post` pages** (injected conditionally in `default.html`).
