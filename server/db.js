const dns = require('dns');
const dnsPromises = dns.promises;

// Set public DNS servers for DNS resolution
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch {
  // Ignored if custom servers cannot be set
}

if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

// Bypasses local router DNS timeouts (EAI_AGAIN) for Turso cloud hostnames
const originalLookup = dns.lookup;
dns.lookup = function (hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  if (hostname && (hostname.includes('turso.io') || hostname.includes('amazonaws.com'))) {
    dnsPromises
      .resolve4(hostname)
      .then((ips) => {
        if (!ips || ips.length === 0) {
          return originalLookup(hostname, options, callback);
        }
        if (options && options.all) {
          callback(null, ips.map((ip) => ({ address: ip, family: 4 })));
        } else {
          callback(null, ips[0], 4);
        }
      })
      .catch(() => {
        originalLookup(hostname, options, callback);
      });
  } else {
    originalLookup(hostname, options, callback);
  }
};

const { createClient } = require('@libsql/client');

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.warn('WARNING: TURSO_DATABASE_URL environment variable is not set.');
}

const rawClient = createClient({
  url: url,
  authToken: authToken,
});

// Detect transient network or DNS lookup glitches (like EAI_AGAIN)
function isTransientNetworkError(err) {
  if (!err) return false;
  const code = err.code || err.cause?.code;
  const message = `${err.message || ''} ${err.cause?.message || ''}`;
  return (
    code === 'EAI_AGAIN' ||
    code === 'ENOTFOUND' ||
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT' ||
    code === 'UND_ERR_CONNECT_TIMEOUT' ||
    message.includes('fetch failed') ||
    message.includes('getaddrinfo')
  );
}

// Wrapper to retry transient errors with slight backoff
async function withRetry(fn, maxRetries = 3) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt < maxRetries && isTransientNetworkError(err)) {
        console.warn(`[db] Transient network error encountered (${err.cause?.code || err.message}). Retrying attempt ${attempt + 1}/${maxRetries}...`);
        await new Promise((resolve) => setTimeout(resolve, attempt * 300));
        continue;
      }
      throw err;
    }
  }
}

// Proxy the client so db.execute, db.batch, etc. automatically retry on transient blips
const db = new Proxy(rawClient, {
  get(target, prop) {
    const original = target[prop];
    if (typeof original === 'function') {
      return function (...args) {
        return withRetry(() => original.apply(target, args));
      };
    }
    return original;
  },
});

module.exports = db;


