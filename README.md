# NOODS Shopify theme

The NOODS landing page as a Shopify Online Store 2.0 theme. The homepage is the
NOODS design (`layout/noods.liquid` + `sections/noods-*.liquid`); every other
page (products, collections, cart, search, account, policies) comes from
Shopify's [Dawn](https://github.com/Shopify/dawn) theme, so the store is ready
for e-commerce. Checkout is Shopify's hosted checkout.

## Where things live

| What | File |
|---|---|
| Page shell, fonts, fixed logo, floating button | `layout/noods.liquid` |
| Hero + noodle marquee | `sections/noods-hero.liquid` |
| "Instant noodles made better" + benefit cards | `sections/noods-products.liquid` |
| Meet the Flavors carousel | `sections/noods-flavors.liquid` |
| How NOODS Started comic | `sections/noods-founder-story.liquid` |
| Footer | `sections/noods-footer.liquid` |
| Waitlist pop-up and form | `snippets/noods-signup-modal.liquid` |
| Styles / animations | `assets/noods.css` |
| Interactions (pop-up, carousel, noodle border, reveals) | `assets/noods.js` |
| Images and video | `assets/noods-*.png`, `noods-background.jpg`, `noods-hero-video.mp4` |
| Homepage section order | `templates/index.json` |

`assets/` must stay flat (no subfolders). Reference files with
`{{ 'file.png' | asset_url }}`. Original artwork that the site does not use is
kept in `source-art/`, which Shopify ignores.

## Waitlist signups → Shopify Customers

The pop-up uses Shopify's native customer form (`{% form 'customer' %}`).
On submit, after the browser checks name, email, and the consent box, the
browser posts to the store's `/contact` endpoint. Shopify then:

- creates the customer, or updates the existing customer with that email (no duplicates),
- sets email marketing to subscribed (or pending, if double opt-in is on),
- adds the `NOODS-WAITLIST` tag and saves the first/last name,
- may show its hCaptcha challenge to suspected bots,
- reloads the homepage with `form.posted_successfully?`, and the pop-up
  reopens showing "You're in!". Errors reopen the pop-up with Shopify's message.

Find signups in **Shopify admin → Customers**, filtered by tag `NOODS-WAITLIST`.

## Deploying

### Option A: GitHub integration (recommended; no tokens)

1. Shopify admin → **Online Store → Themes → Add theme → Connect from GitHub**.
2. Install the Shopify GitHub app if asked, then choose repo
   `aimformytoes/NOODS-Landing` and branch `cursor/shopify-theme-f6c7`
   (or `main` once this is merged).
3. Shopify adds it as an **unpublished** theme. Every push to that branch
   updates it; edits made in the Shopify theme editor are committed back.
4. Use **Preview**, then **Publish** when ready.

### Option B: Shopify CLI

```bash
npm install -g @shopify/cli
shopify theme check
shopify theme push --unpublished --store your-store.myshopify.com   # first time
shopify theme push --theme <theme-id> --store your-store.myshopify.com
```

For non-interactive pushes (CI or a Cursor agent) set `SHOPIFY_FLAG_STORE`
(`your-store.myshopify.com`) and `SHOPIFY_CLI_THEME_TOKEN` (a password from
Shopify's **Theme Access** app).

### Local preview

`shopify theme dev --store your-store.myshopify.com` serves the theme with
live reload against your store's data.

## Brand palette

| Color  | Hex     |
|--------|---------|
| Yellow | #FFC90A |
| Orange | #FF8A00 |
| Red    | #E63220 |
| Cream  | #F8E7C8 |
| Tan    | #D99A55 |
| Brown  | #5A3424 |
| Black  | #111111 |
