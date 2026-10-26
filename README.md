# NOODS Landing Page

A playful, retro CPG-style landing page for **NOODS** — prebiotic instant noodles.

## Quick Start

Open `index.html` in a browser, or serve locally:

```bash
python3 -m http.server 8080
```

Then visit [http://localhost:8080](http://localhost:8080).

## Waitlist signup → Shopify customers

The **Be the First to Try** modal collects name, email and an explicit
"email me about the launch" checkbox. The site is static (GitHub Pages), so
signups go to a small Cloudflare Worker in `shopify-waitlist-worker/`, which
holds the Shopify credentials and calls the Shopify Admin GraphQL API. No
Shopify credential ever reaches the browser.

What the Worker does for each signup:

| Customer in Shopify | Result |
|---|---|
| No customer with that email | Creates one with name, tag `NOODS-WAITLIST`, email marketing `SUBSCRIBED` (single opt-in, timestamped) |
| Exists, never subscribed (`NOT_SUBSCRIBED`) | Adds the tag and records the new consent as `SUBSCRIBED` |
| Exists, already `SUBSCRIBED` / `PENDING` | Adds the tag if missing; consent untouched |
| Exists, `UNSUBSCRIBED` (or `INVALID` / `REDACTED`) | Adds the tag; **opt-out is preserved**, never re-subscribed |

Existing customers' names are only filled in if Shopify has no name on file.
Lookups use the exact-match `customerByIdentifier` query, and a "email already
taken" race on create falls back to updating the existing customer, so no
duplicates are created. The browser shows "You're in!" only when the Worker
returns `ok: true` after Shopify confirms the save.

### 1. Shopify setup

1. Open the [Shopify Dev Dashboard](https://dev.shopify.com/dashboard) with the
   account that owns the store and create an app (e.g. "NOODS Waitlist").
2. Create a version with Admin API access scopes **`read_customers`** and
   **`write_customers`** (nothing else is needed), release it, and install it on
   your store.
3. In the app's **Settings**, copy the **Client ID** and **Client secret**.
   The Worker exchanges these for a 24-hour Admin API token
   ([client credentials grant](https://shopify.dev/docs/apps/build/authentication-authorization/client-credentials-grant)).
   The store must be in the same Dev Dashboard organization as the app.

If you already have a legacy custom app with an Admin API access token
(`shpat_…`) and those two scopes, you can set `SHOPIFY_ADMIN_ACCESS_TOKEN`
instead of the client ID/secret.

### 2. Worker environment

| Name | Type | Value |
|---|---|---|
| `SHOPIFY_CLIENT_ID` | secret | App client ID |
| `SHOPIFY_CLIENT_SECRET` | secret | App client secret |
| `SHOPIFY_ADMIN_ACCESS_TOKEN` | secret, optional | Only if using a legacy `shpat_` token instead of the two above |
| `SHOPIFY_STORE_DOMAIN` | var | `your-store.myshopify.com` (the myshopify domain, not your custom domain) |
| `ALLOWED_ORIGINS` | var | `https://aimformytoes.github.io` (comma-separate extra origins, e.g. a custom domain) |
| `SHOPIFY_API_VERSION` | var, optional | Defaults to `2026-10` |
| `WAITLIST_TAG` | var, optional | Defaults to `NOODS-WAITLIST` |

### 3. Deploy

```bash
cd shopify-waitlist-worker
# edit SHOPIFY_STORE_DOMAIN in wrangler.toml first
npx wrangler@4 login
npx wrangler@4 secret put SHOPIFY_CLIENT_ID
npx wrangler@4 secret put SHOPIFY_CLIENT_SECRET
npx wrangler@4 deploy
```

Put the printed `https://noods-waitlist.<account>.workers.dev` URL in
`signupEndpoint` in `js/checkout-config.js` and push to `main`. Until
`signupEndpoint` is set, submitting shows "Signups are not open yet."

Run the Worker's tests with `cd shopify-waitlist-worker && npm test`.

### 4. Verify with a real signup

Submit the live form with an email you control, then in Shopify admin open
**Customers**, filter by tag `NOODS-WAITLIST`, and confirm the customer shows
the name, the tag, and "Subscribed" under email marketing. If the form shows an
error, `npx wrangler@4 tail` in `shopify-waitlist-worker/` shows the reason.

Other modal settings in `js/checkout-config.js`: `submitLabel`,
`successMessage`, `finePrint`.

## Brand assets

| File | Description |
|------|-------------|
| `assets/LOGO.png` | Official NOODS logo |
| `assets/Background.jpeg` | Noodle pattern background |
| `assets/Girls mascot NOODS.png` | Official mascot illustration |
| `assets/hero-video.mp4` | Hero background video |
| `assets/Amy To.jpeg` | Team headshot — Amy To |
| `assets/Francis Press.jpeg` | Team headshot — Francis Press |
| `assets/Cien Khong.jpeg` | Team headshot — Cien Khong |
| `assets/founder-comic-strip.png` | Founder story comic strip (PNG or JPG — update `src` in `index.html` if you use `.jpg`) |

## Brand Palette

| Color  | Hex     |
|--------|---------|
| Yellow | #FFC90A |
| Orange | #FF8A00 |
| Red    | #E63220 |
| Cream  | #F8E7C8 |
| Tan    | #D99A55 |
| Brown  | #5A3424 |
| Black  | #111111 |
