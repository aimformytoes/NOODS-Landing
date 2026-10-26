const DEFAULT_API_VERSION = '2026-10';
const DEFAULT_TAG = 'NOODS-WAITLIST';
const MAX_BODY_BYTES = 4096;
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000;

const EMAIL_PATTERN = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;
const SHOP_DOMAIN_PATTERN = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;

const LOOKUP_QUERY = `
  query WaitlistCustomerByEmail($identifier: CustomerIdentifierInput!) {
    customer: customerByIdentifier(identifier: $identifier) {
      id
      firstName
      lastName
      tags
      defaultEmailAddress {
        emailAddress
        marketingState
      }
    }
  }
`;

const CREATE_MUTATION = `
  mutation WaitlistCustomerCreate($input: CustomerInput!) {
    customerCreate(input: $input) {
      customer {
        id
        defaultEmailAddress {
          marketingState
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const TAGS_ADD_MUTATION = `
  mutation WaitlistTagsAdd($id: ID!, $tags: [String!]!) {
    tagsAdd(id: $id, tags: $tags) {
      node {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const CONSENT_MUTATION = `
  mutation WaitlistEmailConsent($input: CustomerEmailMarketingConsentUpdateInput!) {
    customerEmailMarketingConsentUpdate(input: $input) {
      customer {
        id
        defaultEmailAddress {
          marketingState
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const NAME_UPDATE_MUTATION = `
  mutation WaitlistCustomerName($input: CustomerInput!) {
    customerUpdate(input: $input) {
      customer {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export class ShopifyError extends Error {
  constructor(message, { retryable = false } = {}) {
    super(message);
    this.name = 'ShopifyError';
    this.retryable = retryable;
  }
}

export class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigError';
  }
}

let tokenCache = null;

export function resetTokenCache() {
  tokenCache = null;
}

function readConfig(env) {
  const domain = String(env.SHOPIFY_STORE_DOMAIN || '').trim().toLowerCase();
  if (!SHOP_DOMAIN_PATTERN.test(domain)) {
    throw new ConfigError('SHOPIFY_STORE_DOMAIN must look like your-store.myshopify.com');
  }
  const staticToken = String(env.SHOPIFY_ADMIN_ACCESS_TOKEN || '').trim();
  const clientId = String(env.SHOPIFY_CLIENT_ID || '').trim();
  const clientSecret = String(env.SHOPIFY_CLIENT_SECRET || '').trim();
  if (!staticToken && !(clientId && clientSecret)) {
    throw new ConfigError(
      'Set SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET (or SHOPIFY_ADMIN_ACCESS_TOKEN)'
    );
  }
  return {
    domain,
    staticToken,
    clientId,
    clientSecret,
    apiVersion: String(env.SHOPIFY_API_VERSION || DEFAULT_API_VERSION).trim(),
    tag: String(env.WAITLIST_TAG || DEFAULT_TAG).trim(),
  };
}

async function getAccessToken(config, fetchImpl, forceRefresh) {
  if (config.staticToken) return config.staticToken;

  const cacheKey = `${config.domain}:${config.clientId}`;
  const now = Date.now();
  if (
    !forceRefresh &&
    tokenCache &&
    tokenCache.key === cacheKey &&
    tokenCache.expiresAt - TOKEN_REFRESH_MARGIN_MS > now
  ) {
    return tokenCache.token;
  }

  const response = await fetchImpl(`https://${config.domain}/admin/oauth/access_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }).toString(),
  });

  if (!response.ok) {
    throw new ShopifyError(`Token request failed with HTTP ${response.status}`);
  }
  const data = await response.json();
  if (!data || typeof data.access_token !== 'string' || !data.access_token) {
    throw new ShopifyError('Token response did not include an access token');
  }

  const ttlSeconds = Number(data.expires_in) > 0 ? Number(data.expires_in) : 86399;
  tokenCache = { key: cacheKey, token: data.access_token, expiresAt: now + ttlSeconds * 1000 };
  return data.access_token;
}

async function shopifyGraphql(config, fetchImpl, query, variables) {
  const url = `https://${config.domain}/admin/api/${config.apiVersion}/graphql.json`;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const token = await getAccessToken(config, fetchImpl, attempt > 0);
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (response.status === 401 && !config.staticToken && attempt === 0) {
      tokenCache = null;
      continue;
    }
    if (response.status === 429) {
      throw new ShopifyError('Shopify rate limit reached', { retryable: true });
    }
    if (!response.ok) {
      throw new ShopifyError(`Shopify Admin API returned HTTP ${response.status}`, {
        retryable: response.status >= 500,
      });
    }

    const payload = await response.json();
    if (payload && Array.isArray(payload.errors) && payload.errors.length) {
      const throttled = payload.errors.some(
        (err) => err && err.extensions && err.extensions.code === 'THROTTLED'
      );
      const messages = payload.errors.map((err) => (err && err.message) || 'Unknown error');
      throw new ShopifyError(`Shopify GraphQL error: ${messages.join('; ')}`, {
        retryable: throttled,
      });
    }
    return payload.data;
  }

  throw new ShopifyError('Shopify rejected the access token');
}

function assertNoUserErrors(result, label) {
  const errors = (result && result.userErrors) || [];
  if (errors.length) {
    const detail = errors
      .map((err) => `${(err.field || []).join('.') || 'input'}: ${err.message}`)
      .join('; ');
    throw new ShopifyError(`${label} failed: ${detail}`);
  }
}

function isEmailTakenError(userErrors) {
  return (userErrors || []).some(
    (err) =>
      Array.isArray(err.field) &&
      err.field.includes('email') &&
      /taken|already/i.test(err.message || '')
  );
}

export function normalizeEmail(value) {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length < 3 || email.length > 254) return null;
  if (!EMAIL_PATTERN.test(email)) return null;
  const [local] = email.split('@');
  if (local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..')) {
    return null;
  }
  return email;
}

export function normalizeName(value) {
  if (typeof value !== 'string') return null;
  const name = value.replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim();
  if (!name || name.length > 100) return null;
  const spaceIndex = name.indexOf(' ');
  if (spaceIndex === -1) return { firstName: name, lastName: '' };
  return { firstName: name.slice(0, spaceIndex), lastName: name.slice(spaceIndex + 1) };
}

function subscribedConsent(nowIso) {
  return {
    marketingState: 'SUBSCRIBED',
    marketingOptInLevel: 'SINGLE_OPT_IN',
    consentUpdatedAt: nowIso,
  };
}

async function lookupCustomer(config, fetchImpl, email) {
  const data = await shopifyGraphql(config, fetchImpl, LOOKUP_QUERY, {
    identifier: { emailAddress: email },
  });
  return (data && data.customer) || null;
}

async function updateExistingCustomer(config, fetchImpl, customer, name, nowIso) {
  const tags = Array.isArray(customer.tags) ? customer.tags : [];
  if (!tags.some((tag) => tag.toLowerCase() === config.tag.toLowerCase())) {
    const data = await shopifyGraphql(config, fetchImpl, TAGS_ADD_MUTATION, {
      id: customer.id,
      tags: [config.tag],
    });
    assertNoUserErrors(data && data.tagsAdd, 'tagsAdd');
  }

  if (!customer.firstName && !customer.lastName && name) {
    const data = await shopifyGraphql(config, fetchImpl, NAME_UPDATE_MUTATION, {
      input: { id: customer.id, firstName: name.firstName, lastName: name.lastName },
    });
    assertNoUserErrors(data && data.customerUpdate, 'customerUpdate');
  }

  const state = customer.defaultEmailAddress && customer.defaultEmailAddress.marketingState;

  // Only customers who never gave or withdrew consent are subscribed here.
  // UNSUBSCRIBED is a deliberate opt-out and is never overridden; INVALID and
  // REDACTED are Shopify-managed states that the API refuses to change.
  if (state === 'NOT_SUBSCRIBED') {
    const data = await shopifyGraphql(config, fetchImpl, CONSENT_MUTATION, {
      input: { customerId: customer.id, emailMarketingConsent: subscribedConsent(nowIso) },
    });
    const result = data && data.customerEmailMarketingConsentUpdate;
    assertNoUserErrors(result, 'customerEmailMarketingConsentUpdate');
    const newState =
      result && result.customer && result.customer.defaultEmailAddress
        ? result.customer.defaultEmailAddress.marketingState
        : null;
    if (newState !== 'SUBSCRIBED' && newState !== 'PENDING') {
      throw new ShopifyError(`Consent update returned state ${newState}`);
    }
    return { status: 'existing_subscribed', marketingState: newState };
  }

  if (state === 'SUBSCRIBED' || state === 'PENDING') {
    return { status: 'existing_already_subscribed', marketingState: state };
  }
  return { status: 'existing_consent_preserved', marketingState: state || null };
}

export async function saveWaitlistSignup(env, input, fetchImpl, now = new Date()) {
  const config = readConfig(env);
  const nowIso = now.toISOString();

  const existing = await lookupCustomer(config, fetchImpl, input.email);
  if (existing) {
    return updateExistingCustomer(config, fetchImpl, existing, input.name, nowIso);
  }

  const data = await shopifyGraphql(config, fetchImpl, CREATE_MUTATION, {
    input: {
      email: input.email,
      firstName: input.name ? input.name.firstName : undefined,
      lastName: input.name && input.name.lastName ? input.name.lastName : undefined,
      tags: [config.tag],
      emailMarketingConsent: subscribedConsent(nowIso),
    },
  });
  const result = data && data.customerCreate;

  if (result && isEmailTakenError(result.userErrors)) {
    const raced = await lookupCustomer(config, fetchImpl, input.email);
    if (!raced) throw new ShopifyError('Email reported as taken but customer not found');
    return updateExistingCustomer(config, fetchImpl, raced, input.name, nowIso);
  }

  assertNoUserErrors(result, 'customerCreate');
  if (!result || !result.customer || !result.customer.id) {
    throw new ShopifyError('customerCreate returned no customer');
  }
  return {
    status: 'created',
    marketingState: result.customer.defaultEmailAddress
      ? result.customer.defaultEmailAddress.marketingState
      : null,
  };
}

function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(status, body, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...(origin ? corsHeaders(origin) : {}),
    },
  });
}

export async function handleRequest(request, env, fetchImpl = fetch) {
  const origin = (request.headers.get('Origin') || '').replace(/\/$/, '');
  const originAllowed = origin && allowedOrigins(env).includes(origin);
  const corsOrigin = originAllowed ? origin : null;

  if (!originAllowed) {
    return json(403, { ok: false, error: 'This origin is not allowed.' }, null);
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (request.method !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed.' }, corsOrigin);
  }

  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    return json(415, { ok: false, error: 'Send JSON.' }, corsOrigin);
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return json(413, { ok: false, error: 'Request too large.' }, corsOrigin);
  }

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { ok: false, error: 'Invalid request.' }, corsOrigin);
  }
  if (!body || typeof body !== 'object') {
    return json(400, { ok: false, error: 'Invalid request.' }, corsOrigin);
  }

  // Honeypot: real visitors never see or fill the "website" field.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return json(400, { ok: false, error: 'Invalid request.' }, corsOrigin);
  }

  const email = normalizeEmail(body.email);
  if (!email) {
    return json(400, { ok: false, field: 'email', error: 'Please enter a valid email address.' }, corsOrigin);
  }
  const name = normalizeName(body.name);
  if (!name) {
    return json(400, { ok: false, field: 'name', error: 'Please enter your name.' }, corsOrigin);
  }
  if (body.consent !== true) {
    return json(
      400,
      { ok: false, field: 'consent', error: 'Please confirm you want NOODS launch emails.' },
      corsOrigin
    );
  }

  try {
    const result = await saveWaitlistSignup(env, { email, name }, fetchImpl);
    return json(200, { ok: true, status: result.status }, corsOrigin);
  } catch (err) {
    console.error('Waitlist signup failed:', err && err.name, err && err.message);
    if (err instanceof ConfigError) {
      return json(500, { ok: false, error: 'Signup is temporarily unavailable.' }, corsOrigin);
    }
    if (err instanceof ShopifyError && err.retryable) {
      return json(503, { ok: false, error: 'We are busy right now. Please try again in a minute.' }, corsOrigin);
    }
    return json(502, { ok: false, error: 'We could not save your signup. Please try again.' }, corsOrigin);
  }
}
