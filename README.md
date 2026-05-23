# IconJT FAQ

A small static FAQ website for IconJT stream lore, designed for free hosting on Cloudflare Pages.

## Edit The Content

The questions and answers live in `index.html`.

To add a new question, duplicate one of the existing blocks:

```html
<details class="faq-item" data-category="iconjt-lore">
  <summary>Your question?</summary>
  <div class="answer">
    <p>Your answer.</p>
  </div>
</details>
```

## Run Locally

Because this is a static site, you can open `index.html` directly in a browser.

If you want a local web server:

```powershell
python -m http.server 8788
```

Then visit `http://localhost:8788`.

## Deploy To Cloudflare Pages

1. Push this folder to a GitHub repository.
2. In Cloudflare, go to **Workers & Pages**.
3. Choose **Create application**.
4. Choose **Pages** and connect your GitHub repository.
5. Use these build settings:

| Setting | Value |
| --- | --- |
| Framework preset | None |
| Build command | Leave blank |
| Build output directory | `/` |

Cloudflare will give you a free subdomain like:

```text
your-project-name.pages.dev
```

You can rename the Pages project in Cloudflare if you want a cleaner subdomain.
