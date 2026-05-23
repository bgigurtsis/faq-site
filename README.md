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

To add a concerned chatter screenshot:

1. Drop the image into `public/concerned/`.
2. In `index.html`, find the `<div class="concerned-grid">` inside the `Hall of Fame` section and copy one of the existing `<figure class="concerned-card">` blocks.
3. Update the `src` and `alt` on the new figure, and put the date the chatter was spotted (e.g. `May 23, 2026`) in the `<figcaption>`. Newest entries go first.

## Concerned Chatter Counter

The concerned chatter counter uses a Cloudflare Pages Function at `/api/concerned-counter`.
It stores the shared count and a per-IP rate-limit record in Cloudflare KV.

Create a KV namespace in Cloudflare, then add this binding to the Pages project:

| Binding | Value |
| --- | --- |
| Variable name | `CONCERNED_COUNTER` |
| KV namespace | The namespace you created for this counter |

The endpoint supports:

- `GET /api/concerned-counter` returns the current count plus the caller's per-IP state: `canIncrement`, `reason` (`null` / `"cooldown"` / `"daily_limit"`), `retryAfterSeconds`, `registrationsRemaining`, `dailyLimit`, and `admin`.
- `POST /api/concerned-counter` increments the count subject to the rate limit: up to 3 registrations per IP in any rolling 24-hour window, with at least 6 hours between two registrations from the same IP. Responds with `429` and a `Retry-After` header when either gate trips.

### Admin Bypass

To skip the rate limit from a known IP (for testing or moderation), set the `CONCERNED_ADMIN_IPS` environment variable on the Pages project to a comma-separated list of `CF-Connecting-IP` values:

```text
CONCERNED_ADMIN_IPS=1.2.3.4,2001:db8::1
```

Either set it via the Cloudflare dashboard (**Pages → your project → Settings → Environment variables**) or with wrangler from this project root:

```powershell
npx wrangler pages secret put CONCERNED_ADMIN_IPS --project-name iconjt-faq
```

When the caller's IP matches the allowlist, the Function bypasses both gates, returns `admin: true` from `GET`, and does not write a per-IP record. Allowlist values live in Cloudflare project settings only — never commit them. Update the value if your IP rotates.

The normal local static server does not run Pages Functions, so the counter will show as unavailable when using `npm run dev`. Test the live counter on Cloudflare Pages after the KV binding is configured.

After deployment, verify:

- `GET /api/concerned-counter` returns JSON with the current count and per-IP state.
- Clicking `Register a concerned chatter` once increments the count and shows `Chatter registered. You can register another in about 6h.`.
- A second click within 6 hours from the same IP is blocked with the cooldown message.
- After 3 successful registrations within 24 hours, further attempts show `Daily limit reached - try again tomorrow.` until the rolling window expires.
- From an admin IP, the button stays enabled, an `Admin bypass active` indicator shows near it, and registrations are not capped.
- Refreshing the page keeps the shared count visible.

## Run Locally

Install dependencies once:

```powershell
npm install
```

Start the local static server:

```powershell
npm run dev
```

Then visit `http://127.0.0.1:5173`.

## Preview In Cursor

Run `npm run dev`, then open `http://127.0.0.1:5173` in Cursor's built-in browser or Simple Browser if available. You can also open the same URL in your system browser.

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
