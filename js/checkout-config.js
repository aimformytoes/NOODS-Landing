/**
 * Waitlist signup → Shopify customers.
 *
 * signupEndpoint is the URL of the deployed Cloudflare Worker in
 * shopify-waitlist-worker/ (e.g. https://noods-waitlist.<you>.workers.dev).
 * It is public; Shopify credentials live only in the Worker's secrets.
 */
window.NOODS_CHECKOUT = {
  signupEndpoint: '',
  submitLabel: 'Join the waitlist',
  successMessage:
    "You're on the list! We'll email you about the first bundle and PR Launch box.",
  finePrint: 'We only use your info for launch updates.',
};
