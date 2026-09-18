const test = require('node:test');
const assert = require('node:assert/strict');
const { analyzeUrl } = require('../dist/services/url-analysis.service.js');
const { VirusTotalProvider } = require('../dist/services/virustotal.provider.js');
const { authenticate } = require('../dist/middleware/auth.middleware.js');
const { createRateLimiter } = require('../dist/middleware/rate-limit.middleware.js');
const { errorHandler } = require('../dist/middleware/error.middleware.js');
const { isOwnedBy } = require('../dist/utils/ownership.js');

function responseRecorder() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    setHeader(name, value) { this.headers[name] = value; },
  };
}

test('rejects malformed, private, metadata, and internal scan targets', () => {
  for (const url of ['not a url', 'http://127.0.0.1', 'http://localhost', 'http://[::1]', 'http://[::ffff:127.0.0.1]', 'http://[fc00::1]', 'http://[fe80::1]', 'http://169.254.169.254', 'http://10.0.0.1', 'http://172.16.0.1', 'http://192.168.1.1', 'http://100.64.0.1', 'http://internal', 'http://service.local']) {
    assert.throws(() => analyzeUrl(url));
  }
});

test('rejects scan URLs exceeding the configured application limit', () => {
  assert.throws(() => analyzeUrl(`https://example.com/${'a'.repeat(2050)}`), { code: 'INVALID_URL' });
});

test('authentication middleware rejects requests without credentials', () => {
  const res = responseRecorder();
  let nextCalled = false;
  authenticate({ headers: {}, cookies: {} }, res, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { success: false, error: { code: 'UNAUTHORIZED', message: 'No token provided' } });
});

test('authentication middleware rejects malformed bearer credentials safely', () => {
  const res = responseRecorder();
  authenticate({ headers: { authorization: 'Basic not-a-bearer-token' }, cookies: {} }, res, () => {});
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error.code, 'UNAUTHORIZED');
});

test('ownership helper rejects another user', () => {
  assert.equal(isOwnedBy('user-a', 'user-a'), true);
  assert.equal(isOwnedBy('user-a', 'user-b'), false);
});

test('rate limiter returns a safe 429 after its configured threshold', () => {
  const limiter = createRateLimiter({ name: 'test', windowMs: 60_000, max: 1, key: () => 'same-client' });
  let nextCalls = 0;
  limiter({ ip: '127.0.0.1' }, responseRecorder(), () => { nextCalls += 1; });
  const res = responseRecorder();
  limiter({ ip: '127.0.0.1' }, res, () => { nextCalls += 1; });
  assert.equal(nextCalls, 1);
  assert.equal(res.statusCode, 429);
  assert.equal(res.body.error.code, 'RATE_LIMITED');
  assert.ok(res.headers['Retry-After']);
});

test('VirusTotal missing-key behavior does not create evidence', async () => {
  const previous = process.env.VIRUSTOTAL_API_KEY;
  delete process.env.VIRUSTOTAL_API_KEY;
  try {
    const result = await new VirusTotalProvider().lookupUrl('https://example.com/');
    assert.equal(result.status, 'UNAVAILABLE');
    assert.equal(result.malicious, null);
    assert.deepEqual(result.detections, []);
  } finally {
    if (previous === undefined) delete process.env.VIRUSTOTAL_API_KEY;
    else process.env.VIRUSTOTAL_API_KEY = previous;
  }
});

test('VirusTotal status-only responses normalize NOT_FOUND, RATE_LIMITED, and malformed reports safely', async () => {
  const previousKey = process.env.VIRUSTOTAL_API_KEY;
  const previousFetch = global.fetch;
  process.env.VIRUSTOTAL_API_KEY = 'test-key-not-a-real-secret';
  const provider = new VirusTotalProvider();
  try {
    global.fetch = async (_url, init) => {
      assert.equal(init.headers['x-apikey'], 'test-key-not-a-real-secret');
      return new Response('', { status: 404 });
    };
    assert.equal((await provider.lookupUrl('https://example.com/')).status, 'NOT_FOUND');

    global.fetch = async () => new Response('', { status: 429 });
    assert.equal((await provider.lookupUrl('https://example.com/')).status, 'RATE_LIMITED');

    global.fetch = async () => new Response(JSON.stringify({ data: {} }), { status: 200, headers: { 'content-type': 'application/json' } });
    assert.equal((await provider.lookupUrl('https://example.com/')).status, 'ERROR');
  } finally {
    global.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.VIRUSTOTAL_API_KEY;
    else process.env.VIRUSTOTAL_API_KEY = previousKey;
  }
});

test('error middleware hides server internals', () => {
  const res = responseRecorder();
  errorHandler(new Error('postgres://user:password@host/database'), {}, res, () => {});
  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { success: false, error: { code: 'SERVER_ERROR', message: 'Internal Server Error' } });
});

test('error middleware returns a safe input-size response', () => {
  const res = responseRecorder();
  errorHandler({ status: 413, message: 'payload details must not be reflected' }, {}, res, () => {});
  assert.deepEqual(res.body, { success: false, error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' } });
});
