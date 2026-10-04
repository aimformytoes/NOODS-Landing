# NOODS Landing Page

A playful, retro CPG-style landing page for **NOODS** — prebiotic instant noodles.

## Quick Start

Open `index.html` in a browser, or serve locally:

```bash
python3 -m http.server 8080
```

Then visit [http://localhost:8080](http://localhost:8080).

## First bundle checkout (email + payment)

The **Be the First to Try** modal collects name and email, then sends customers to **Stripe Checkout** for the First Bundle Release + PR Launch Box.

Edit `js/checkout-config.js`:

| Setting | Purpose |
|---------|---------|
| `stripePaymentLink` | Your [Stripe Payment Link](https://dashboard.stripe.com/payment-links) URL |
| `formEndpoint` | [Formspree](https://formspree.io) form URL (JSON) to store leads |
| `priceLabel` | Price shown in the modal (currently `$14.25` before tax) |
| `priceNote` | Line under price (e.g. shipping at checkout) |
| `bundleItems` | Bullet list of what’s included |

**Stripe setup:** Create a product for the first bundle + PR Launch box, enable Payment Link, and paste the link. The site passes `prefilled_email` and `client_reference_id` (name) into checkout.

**Formspree setup:** Create a form, allow JSON posts, and paste `https://formspree.io/f/your-id`. Submissions include `name`, `email`, and `product`.

Until both URLs are set, the modal still opens but shows a setup message after submit.

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
