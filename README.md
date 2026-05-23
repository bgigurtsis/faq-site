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

Install dependencies once:

```powershell
npm install
```

Start the Vite dev server:

```powershell
npm run dev
```

Then visit the local URL Vite prints, usually `http://127.0.0.1:5173`.

## Preview In Cursor

Run `npm run dev`, then open the Vite local URL in Cursor's built-in browser or Simple Browser if available. You can also open the same URL in your system browser.

To check the production build locally:

```powershell
npm run build
npm run preview
```

## Deploy To Cloudflare Pages

1. Push this folder to a GitHub repository.
2. In Cloudflare, go to **Workers & Pages**.
3. Choose **Create application**.
4. Choose **Pages** and connect your GitHub repository.
5. Use these build settings:

| Setting | Value |
| --- | --- |
| Framework preset | None |
| Build command | `npm run build` |
| Build output directory | `dist` |

Cloudflare will give you a free subdomain like:

```text
your-project-name.pages.dev
```

You can rename the Pages project in Cloudflare if you want a cleaner subdomain.
