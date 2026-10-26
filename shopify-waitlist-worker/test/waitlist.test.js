import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest, resetTokenCache, normalizeEmail } from '../src/waitlist.js';

const ORIGIN = 'https://aimformytoes.github.io';
const ENV = {
  SHOPIFY_STORE_DOMAIN: 'noods-test.myshopify.com',
  SHOPIFY_CLIENT_ID: 'client-id',
  SHOPIFY_CLIENT_SECRET: 'client-secret',
  ALLOWED_ORIGINS: ORIGIN,
};

function fakeShopify({ customers = [], failWith = null, raceOnCreate = false } = {}) {
  const state = { customers: customers.map((c) => ({ ...c })), calls: [], tokenRequests: 0 };
  let nextId = 100;

  const respond = (body, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  const find = (email) => state.customers.find((c) => c.email === email) || null;
  const byId = (id) => state.customers.find((c) => c.id === id);
  const view = (c) =>
    c && {
      id: c.id,
      firstName: c.firstName || null,
      lastName: c.lastName || null,
      tags: c.tags,
      defaultEmailAddress: { emailAddress: c.email, marketingState: c.marketingState },
    };

  state.fetch = async (url, init) => {
    if (url.endsWith('/admin/oauth/access_token')) {
      state.tokenRequests += 1;
      const params = new URLSearchParams(init.body);
      assert.equal(params.get('grant_type'), 'client_credentials');
      assert.equal(params.get('client_secret'), 'client-secret');
      return respond({ access_token: `token-${state.tokenRequests}`, expires_in: 86399 });
    }

    assert.match(url, /^https:\/\/noods-test\.myshopify\.com\/admin\/api\/2026-10\/graphql\.json$/);
    assert.ok(init.headers['X-Shopify-Access-Token'].startsWith('token-'));
    const { query, variables } = JSON.parse(init.body);
    const op = query.match(/(?:query|mutation)\s+(\w+)/)[1];
    state.calls.push({ op, variables });

    if (failWith) return failWith();

    switch (op) {
      case 'WaitlistCustomerByEmail':
        return respond({ data: { customer: view(find(variables.identifier.emailAddress)) } });
      case 'WaitlistCustomerCreate': {
        const input = variables.input;
        if (raceOnCreate) {
          state.customers.push({
            id: 'gid://shopify/Customer/race',
            email: input.email,
            tags: [],
            marketingState: 'NOT_SUBSCRIBED',
          });
        }
        if (find(input.email)) {
          return respond({
            data: {
              customerCreate: {
                customer: null,
                userErrors: [{ field: ['email'], message: 'Email has already been taken' }],
              },
            },
          });
        }
        const customer = {
          id: `gid://shopify/Customer/${nextId++}`,
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          tags: input.tags,
          marketingState: input.emailMarketingConsent.marketingState,
          consent: input.emailMarketingConsent,
        };
        state.customers.push(customer);
        return respond({ data: { customerCreate: { customer: view(customer), userErrors: [] } } });
      }
      case 'WaitlistTagsAdd': {
        const c = byId(variables.id);
        c.tags = [...new Set([...c.tags, ...variables.tags])];
        return respond({ data: { tagsAdd: { node: { id: c.id }, userErrors: [] } } });
      }
      case 'WaitlistCustomerName': {
        const c = byId(variables.input.id);
        c.firstName = variables.input.firstName;
        c.lastName = variables.input.lastName;
        return respond({ data: { customerUpdate: { customer: { id: c.id }, userErrors: [] } } });
      }
      case 'WaitlistEmailConsent': {
        const c = byId(variables.input.customerId);
        c.marketingState = variables.input.emailMarketingConsent.marketingState;
        c.consent = variables.input.emailMarketingConsent;
        return respond({
          data: { customerEmailMarketingConsentUpdate: { customer: view(c), userErrors: [] } },
        });
      }
      default:
        throw new Error(`Unexpected operation ${op}`);
    }
  };
  return state;
}

function signup(body, { origin = ORIGIN, method = 'POST', contentType = 'application/json' } = {}) {
  const headers = { Origin: origin };
  if (contentType) headers['Content-Type'] = contentType;
  return new Request('https://noods-waitlist.example.workers.dev/', {
    method,
    headers,
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  });
}

const validBody = { name: 'Mei Lin Tan', email: ' Mei@Example.com ', consent: true };

beforeEach(() => {
  resetTokenCache();
});

test('creates a new subscribed, tagged customer', async () => {
  const shop = fakeShopify();
  const res = await handleRequest(signup(validBody), ENV, shop.fetch);
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.deepEqual(body, { ok: true, status: 'created' });
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  assert.equal(shop.customers.length, 1);
  const [c] = shop.customers;
  assert.equal(c.email, 'mei@example.com');
  assert.equal(c.firstName, 'Mei');
  assert.equal(c.lastName, 'Lin Tan');
  assert.deepEqual(c.tags, ['NOODS-WAITLIST']);
  assert.equal(c.consent.marketingState, 'SUBSCRIBED');
  assert.equal(c.consent.marketingOptInLevel, 'SINGLE_OPT_IN');
  assert.ok(!Number.isNaN(Date.parse(c.consent.consentUpdatedAt)));
});

test('existing never-subscribed customer gets tag and consent without duplication', async () => {
  const shop = fakeShopify({
    customers: [
      { id: 'gid://shopify/Customer/1', email: 'mei@example.com', firstName: 'Mei', tags: ['VIP'], marketingState: 'NOT_SUBSCRIBED' },
    ],
  });
  const res = await handleRequest(signup(validBody), ENV, shop.fetch);
  assert.deepEqual(await res.json(), { ok: true, status: 'existing_subscribed' });
  assert.equal(shop.customers.length, 1);
  assert.deepEqual(shop.customers[0].tags, ['VIP', 'NOODS-WAITLIST']);
  assert.equal(shop.customers[0].marketingState, 'SUBSCRIBED');
  assert.equal(shop.customers[0].firstName, 'Mei');
  assert.ok(!shop.calls.some((call) => call.op === 'WaitlistCustomerCreate'));
  assert.ok(!shop.calls.some((call) => call.op === 'WaitlistCustomerName'));
});

test('unsubscribed customer keeps their opt-out but is tagged', async () => {
  const shop = fakeShopify({
    customers: [
      { id: 'gid://shopify/Customer/2', email: 'mei@example.com', tags: [], marketingState: 'UNSUBSCRIBED' },
    ],
  });
  const res = await handleRequest(signup(validBody), ENV, shop.fetch);
  assert.deepEqual(await res.json(), { ok: true, status: 'existing_consent_preserved' });
  assert.equal(shop.customers[0].marketingState, 'UNSUBSCRIBED');
  assert.deepEqual(shop.customers[0].tags, ['NOODS-WAITLIST']);
  assert.ok(!shop.calls.some((call) => call.op === 'WaitlistEmailConsent'));
});

test('already subscribed and tagged customer is left untouched', async () => {
  const shop = fakeShopify({
    customers: [
      { id: 'gid://shopify/Customer/3', email: 'mei@example.com', firstName: 'M', tags: ['noods-waitlist'], marketingState: 'SUBSCRIBED' },
    ],
  });
  const res = await handleRequest(signup(validBody), ENV, shop.fetch);
  assert.deepEqual(await res.json(), { ok: true, status: 'existing_already_subscribed' });
  assert.deepEqual(shop.calls.map((call) => call.op), ['WaitlistCustomerByEmail']);
});

test('existing customer with no name gets the submitted name', async () => {
  const shop = fakeShopify({
    customers: [
      { id: 'gid://shopify/Customer/4', email: 'mei@example.com', tags: [], marketingState: 'SUBSCRIBED' },
    ],
  });
  await handleRequest(signup(validBody), ENV, shop.fetch);
  assert.equal(shop.customers[0].firstName, 'Mei');
  assert.equal(shop.customers[0].lastName, 'Lin Tan');
});

test('duplicate created concurrently falls back to updating the existing customer', async () => {
  const shop = fakeShopify({ raceOnCreate: true });
  const res = await handleRequest(signup(validBody), ENV, shop.fetch);
  assert.deepEqual(await res.json(), { ok: true, status: 'existing_subscribed' });
  assert.equal(shop.customers.length, 1);
  assert.deepEqual(shop.customers[0].tags, ['NOODS-WAITLIST']);
});

test('token is cached between signups and refreshed after a 401', async () => {
  const shop = fakeShopify();
  await handleRequest(signup(validBody), ENV, shop.fetch);
  await handleRequest(signup({ ...validBody, email: 'other@example.com' }), ENV, shop.fetch);
  assert.equal(shop.tokenRequests, 1);

  let rejected = false;
  const flaky = async (url, init) => {
    if (!url.endsWith('access_token') && !rejected) {
      rejected = true;
      return new Response('{}', { status: 401 });
    }
    return shop.fetch(url, init);
  };
  const res = await handleRequest(signup({ ...validBody, email: 'third@example.com' }), ENV, flaky);
  assert.equal(res.status, 200);
  assert.equal(shop.tokenRequests, 2);
});

test('rejects invalid emails, missing name, and missing consent before calling Shopify', async () => {
  const shop = fakeShopify();
  const cases = [
    [{ ...validBody, email: 'not-an-email' }, 'email'],
    [{ ...validBody, email: 'a@b' }, 'email'],
    [{ ...validBody, email: 'a..b@example.com' }, 'email'],
    [{ ...validBody, name: '   ' }, 'name'],
    [{ ...validBody, consent: false }, 'consent'],
    [{ name: 'Mei', email: 'mei@example.com' }, 'consent'],
  ];
  for (const [body, field] of cases) {
    const res = await handleRequest(signup(body), ENV, shop.fetch);
    assert.equal(res.status, 400);
    assert.equal((await res.json()).field, field);
  }
  assert.equal(shop.calls.length, 0);
  assert.equal(shop.tokenRequests, 0);
});

test('rejects honeypot, wrong origin, wrong method and wrong content type', async () => {
  const shop = fakeShopify();
  assert.equal((await handleRequest(signup({ ...validBody, website: 'spam.biz' }), ENV, shop.fetch)).status, 400);
  assert.equal((await handleRequest(signup(validBody, { origin: 'https://evil.example' }), ENV, shop.fetch)).status, 403);
  assert.equal((await handleRequest(signup(validBody, { method: 'GET' }), ENV, shop.fetch)).status, 405);
  assert.equal((await handleRequest(signup(validBody, { contentType: 'text/plain' }), ENV, shop.fetch)).status, 415);
  assert.equal(shop.calls.length, 0);
});

test('answers CORS preflight for the allowed origin', async () => {
  const req = new Request('https://noods-waitlist.example.workers.dev/', {
    method: 'OPTIONS',
    headers: { Origin: ORIGIN },
  });
  const res = await handleRequest(req, ENV, fakeShopify().fetch);
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), ORIGIN);
});

test('Shopify failures return an error, never ok', async () => {
  const graphqlError = fakeShopify({
    failWith: () =>
      new Response(JSON.stringify({ errors: [{ message: 'Access denied for customerByIdentifier' }] }), { status: 200 }),
  });
  let res = await handleRequest(signup(validBody), ENV, graphqlError.fetch);
  assert.equal(res.status, 502);
  assert.equal((await res.json()).ok, false);

  resetTokenCache();
  const throttled = fakeShopify({
    failWith: () =>
      new Response(JSON.stringify({ errors: [{ message: 'Throttled', extensions: { code: 'THROTTLED' } }] }), { status: 200 }),
  });
  res = await handleRequest(signup(validBody), ENV, throttled.fetch);
  assert.equal(res.status, 503);

  resetTokenCache();
  const badToken = async () => new Response('{"error":"invalid_client"}', { status: 400 });
  res = await handleRequest(signup(validBody), ENV, badToken);
  assert.equal(res.status, 502);
  assert.equal((await res.json()).ok, false);
});

test('misconfigured store domain is refused without sending credentials', async () => {
  let called = false;
  const res = await handleRequest(
    signup(validBody),
    { ...ENV, SHOPIFY_STORE_DOMAIN: 'evil.example.com' },
    async () => {
      called = true;
      return new Response('{}');
    }
  );
  assert.equal(res.status, 500);
  assert.equal(called, false);
});

test('normalizeEmail', () => {
  assert.equal(normalizeEmail('  Hi@NOODS.co '), 'hi@noods.co');
  assert.equal(normalizeEmail('first.last+tag@sub.example.org'), 'first.last+tag@sub.example.org');
  assert.equal(normalizeEmail('no spaces@example.com'), null);
  assert.equal(normalizeEmail(42), null);
});
