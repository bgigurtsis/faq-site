# Agent Instructions

## Deployment

After committing and pushing any change that should appear on the live site, run a Cloudflare Pages deploy from the repo root:

```powershell
npm run build
npx wrangler pages deploy dist --project-name iconjt-faq --branch main
```

Then verify `https://iconjt-faq.pages.dev/` reflects the change.
