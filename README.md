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
| `priceLabel` | Base price in the modal (`$14.25`) |
| `priceNote` | Under-price line (`Tax and shipping calculated at checkout`) |
| `bundleItems` | Bullet list of what’s included |

**Stripe setup (typical checkout):**

1. Create a **$14.25** product for the First Bundle + PR Launch box.
2. Create a **Payment Link** for that product.
3. In the Payment Link settings, turn on **Collect taxes automatically** ([Stripe Tax](https://stripe.com/tax)) so sales tax is added when the customer’s address requires it.
4. Under **Shipping**, collect a shipping address and add your **shipping rate(s)** (flat rate, by state, or carrier rates).
5. Paste the Payment Link URL into `stripePaymentLink`.

The landing page shows the **$14.25** item price; Stripe Checkout shows the final total with tax and shipping before they pay. The site passes `prefilled_email` and `client_reference_id` (name) into checkout.

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
