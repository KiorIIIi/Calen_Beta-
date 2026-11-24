import test from 'node:test';
import assert from 'node:assert/strict';
import { isPrivateHost, assertPublicHttpUrl, fetchPublicUpstream } from '../vite.config.js';

test('isPrivateHost blocks loopback, RFC1918, link-local, CGNAT and local names', () => {
  for (const host of [
    '127.0.0.1', '10.1.2.3', '192.168.0.1', '172.16.0.1', '172.31.255.255',
    '169.254.169.254', '100.64.0.1', '0.0.0.0',
    'localhost', 'printer.local', 'svc.internal', 'sub.localhost',
    '::1', '::', 'fc00::1', 'fd12:3456::1', 'fe80::1'
  ]) {
    assert.equal(isPrivateHost(host), true, host);
  }
});

test('isPrivateHost blocks IPv4-mapped IPv6 loopback and private ranges', () => {
  for (const host of [
    '::ffff:127.0.0.1', '[::ffff:127.0.0.1]', '::ffff:7f00:1',
    '::ffff:192.168.0.1', '::ffff:c0a8:1', '::ffff:10.0.0.1', '::ffff:a00:1',
    '::ffff:169.254.169.254'
  ]) {
    assert.equal(isPrivateHost(host), true, host);
  }
});

test('isPrivateHost still allows public addresses (incl. public mapped IPv6)', () => {
  for (const host of [
    '8.8.8.8', 'example.com', 'moodle.university.edu', '172.32.0.1',
    '2001:4860:4860::8888', '::ffff:8.8.8.8'
  ]) {
    assert.equal(isPrivateHost(host), false, host);
  }
});

test('assertPublicHttpUrl enforces scheme and public-host policy', () => {
  assert.throws(() => assertPublicHttpUrl('ftp://example.com/feed.ics', 'The iCal URL'), /http:\/\/ or https:\/\//);
  assert.throws(() => assertPublicHttpUrl('not a url', 'The iCal URL'), /valid absolute URL/);
  assert.throws(() => assertPublicHttpUrl('http://127.0.0.1/x', 'The iCal URL'), /private or loopback/);
  assert.equal(assertPublicHttpUrl('https://example.com/cal.ics', 'The iCal URL').hostname, 'example.com');
});

test('assertPublicHttpUrl honors the CALEN_ALLOW_PRIVATE_UPSTREAMS escape hatch', () => {
  const prev = process.env.CALEN_ALLOW_PRIVATE_UPSTREAMS;
  process.env.CALEN_ALLOW_PRIVATE_UPSTREAMS = 'true';
  try {
    assert.equal(assertPublicHttpUrl('http://192.168.1.10/moodle', 'The Moodle URL').hostname, '192.168.1.10');
  } finally {
    if (prev === undefined) delete process.env.CALEN_ALLOW_PRIVATE_UPSTREAMS;
    else process.env.CALEN_ALLOW_PRIVATE_UPSTREAMS = prev;
  }
});

test('fetchPublicUpstream re-validates every redirect hop (SSRF via 30x blocked)', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, opts) => {
    calls.push({ url, opts });
    return new Response(null, { status: 302, headers: { location: 'http://127.0.0.1:9/admin' } });
  });
  await assert.rejects(
    fetchPublicUpstream('https://example.com/cal.ics', {}, 'The iCal URL'),
    /private or loopback/
  );
  assert.equal(calls.length, 1, 'must not fetch the private redirect target');
  assert.equal(calls[0].opts.redirect, 'manual');
});

test('fetchPublicUpstream follows public redirects, resolving relative Location', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url) => {
    calls.push(url);
    if (calls.length === 1) {
      return new Response(null, { status: 302, headers: { location: '/final.ics' } });
    }
    return new Response('BEGIN:VCALENDAR\r\nEND:VCALENDAR', { status: 200 });
  });
  const res = await fetchPublicUpstream('https://example.com/cal.ics', {}, 'The iCal URL');
  assert.equal(res.status, 200);
  assert.deepEqual(calls, ['https://example.com/cal.ics', 'https://example.com/final.ics']);
  assert.match(await res.text(), /BEGIN:VCALENDAR/);
});

test('fetchPublicUpstream caps redirect chains', async (t) => {
  let count = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    count++;
    return new Response(null, { status: 302, headers: { location: 'https://example.com/loop' } });
  });
  await assert.rejects(
    fetchPublicUpstream('https://example.com/cal.ics', {}, 'The iCal URL'),
    /redirected too many times/
  );
  assert.equal(count, 6, 'initial request + 5 allowed hops');
});

test('fetchPublicUpstream rejects redirects without a Location header', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 302 }));
  await assert.rejects(
    fetchPublicUpstream('https://example.com/cal.ics', {}, 'The iCal URL'),
    /without a Location header/
  );
});
