# NOODS Shopify theme

The NOODS landing page as a Shopify Online Store 2.0 theme. The homepage, flavor
product pages, and cart use the NOODS design (`layout/noods.liquid`). Other pages
(collections, search, account, policies) come from Shopify's
[Dawn](https://github.com/Shopify/dawn) theme. Checkout is Shopify's hosted checkout.

## Where things live

| What | File |
|---|---|
| Page shell, fonts, header, floating button | `layout/noods.liquid` |
| Hero | `sections/noods-hero.liquid` |
| "Instant noodles made better" + benefit cards | `sections/noods-products.liquid` |
| Meet the Flavors carousel | `sections/noods-flavors.liquid` |
| Moving noodle banner | `sections/noods-marquee.liquid` |
| How NOODS Started comic and pride bubbles | `sections/noods-founder-story.liquid` |
| Flavor product page (photos, description, add to cart) | `sections/noods-flavor-product.liquid` |
| Cart | `sections/noods-cart.liquid` |
| Footer | `sections/noods-footer.liquid` |
| Waitlist pop-up and form | `snippets/noods-signup-modal.liquid` |
| Styles / animations | `assets/noods.css` |
| Interactions (pop-up, carousel, noodle border, reveals) | `assets/noods.js` |
| Images and video | `assets/noods-*.png`, `noods-background.jpg`, `noods-hero-video.mp4` |
| Homepage section order | `templates/index.json` |
| Product page template | `templates/product.json` |
| Cart template | `templates/cart.json` |

## Flavor pages

Clicking a cup, or the flavor name under it, opens that flavor’s product page.
Arrows and swipes still rotate the carousel.

In Shopify admin, create one product per flavor. The easiest handles are
`hot-and-spicy`, `savoury-beef`, and `chicken-broth`. On each product, add the
photos, description, and price — those show on the flavor page, and **Add to
cart** sends shoppers to the NOODS cart. If a product uses a different handle,
open the theme editor, select **Meet the Flavors**, and pick that product for
the matching cup. Until the product exists, the cup link has nowhere to land.

`assets/` must stay flat (no subfolders). Reference files with
`{{ 'file.png' | asset_url }}`. Original artwork that the site does not use is
kept in `source-art/`, which Shopify ignores.

## Waitlist signups → Shopify Customers

The pop-up uses Shopify's native customer form (`{% form 'customer' %}`).
On submit, after the browser checks the name and email, the
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

### Option B: GitHub Action

Add two repository secrets (Settings → Secrets and variables → Actions):

| Secret | Value |
|---|---|
| `SHOPIFY_FLAG_STORE` | `your-store.myshopify.com` |
| `SHOPIFY_CLI_THEME_TOKEN` | Password from the free **Theme Access** app |

Pushes to this branch then upload an unpublished theme named **NOODS** (created on the first run, updated after that). The live theme is never changed. Until both secrets exist, the workflow skips.

### Option C: Shopify CLI

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
