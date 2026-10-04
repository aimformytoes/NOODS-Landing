/**
 * Checkout & email capture — set these before going live.
 *
 * Stripe: Dashboard → Payment Links → create a link for your First Bundle product.
 * Formspree: https://formspree.io — create a form and paste the endpoint URL.
 */
window.NOODS_CHECKOUT = {
  productName: 'First Bundle Release + PR Launch Box',
  priceLabel: 'Reserve your spot',
  stripePaymentLink: '',
  formEndpoint: '',
  bundleItems: [
    'Early access to the first NOODS bundle release',
    'PR Launch box (launch kit + first-run noodles)',
    'Founding member updates before public launch',
  ],
};
