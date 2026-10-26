# flo-website
flo Financial Intelligence — official website. Static site in HTML/CSS/JS: a three.js flow-field hero, four service pillar pages, Beehiiv RSS integration, Cal.com booking, and a scripted FAQ assistant widget (guided prompts + keyword matching, no backend).

## Layout
- `index.html` — homepage: hero, four pillar summaries, client work, one-line flo OS demo link, how we work, about, Smarter by Design, Insights.
- `services/` — the four pillar pages (lead automation, AI admin, websites, dashboards). Each carries Service + FAQPage + BreadcrumbList schema.
- `pricing.html` · `dashboards/` (flo OS demo and the dashboards app) · `flow/` (scroll experience) · `video/` (explainer build).
- `assets/hero-flowfield.js` + `assets/vendor/three.*` — the hero. See `FLO-HERO-BUILD-NOTES.md`.
- `sitemap.xml`, `robots.txt` — update the sitemap when a page is added.

## Environment variables (Netlify → Site settings → Environment)
- `BEEHIIV_API_KEY` — Beehiiv API key for the newsletter signup (`netlify/functions/subscribe.js`).
