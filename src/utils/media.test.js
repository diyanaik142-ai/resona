import assert from 'node:assert/strict';
import test from 'node:test';
import { getApiBaseUrl, resolveMediaUrl } from './media.js';

const previousWindow = globalThis.window;
globalThis.window = {
  location: {
    protocol: 'https:',
    origin: 'https://resona.anchorlyhms.com',
    hostname: 'resona.anchorlyhms.com',
    port: ''
  }
};

test('relative and production media URLs resolve without duplicate prefixes', () => {
  assert.equal(
    resolveMediaUrl('/media/profiles/usr_123_456.jpg'),
    'https://resona.anchorlyhms.com/media/profiles/usr_123_456.jpg'
  );
  assert.equal(
    resolveMediaUrl('/media/catalog/cover_123.jpg'),
    'https://resona.anchorlyhms.com/media/catalog/cover_123.jpg'
  );
  assert.equal(
    resolveMediaUrl('https://resona.anchorlyhms.com/media/profiles/usr_123_456.jpg'),
    'https://resona.anchorlyhms.com/media/profiles/usr_123_456.jpg'
  );
  assert.equal(
    resolveMediaUrl('https://resona.anchorlyhms.com/media/catalog/cover_123.jpg'),
    'https://resona.anchorlyhms.com/media/catalog/cover_123.jpg'
  );
});

test('legacy development and filesystem profile paths normalize to public media URLs', () => {
  assert.equal(
    resolveMediaUrl('http://localhost:8080/media/profiles/usr_123_456.jpg'),
    'https://resona.anchorlyhms.com/media/profiles/usr_123_456.jpg'
  );
  assert.equal(
    resolveMediaUrl('C:\\Resona\\server\\data\\media\\profiles\\usr_123_456.jpg'),
    'https://resona.anchorlyhms.com/media/profiles/usr_123_456.jpg'
  );
  assert.equal(
    resolveMediaUrl('/opt/resona/media/profiles/usr_123_456.jpg'),
    'https://resona.anchorlyhms.com/media/profiles/usr_123_456.jpg'
  );
});

test('real public artwork is used for missing or invalid media values', () => {
  assert.equal(resolveMediaUrl(null), '/branding/resona-icon.png');
  assert.equal(resolveMediaUrl('C:\\private\\avatar.jpg'), '/branding/resona-icon.png');
  assert.equal(resolveMediaUrl('file:///opt/resona/media/profiles/avatar.jpg'), '/branding/resona-icon.png');
});

test('API base URL follows the active production origin', () => {
  assert.equal(getApiBaseUrl(), 'https://resona.anchorlyhms.com');
});

test('local development uses the backend default port', () => {
  const originalLocation = globalThis.window.location;
  try {
    globalThis.window.location = {
      protocol: 'http:',
      origin: 'http://localhost:5173',
      hostname: 'localhost',
      port: '5173'
    };
    assert.equal(getApiBaseUrl(), 'http://localhost:8090');
  } finally {
    globalThis.window.location = originalLocation;
  }
});

test.after(() => {
  if (previousWindow === undefined) delete globalThis.window;
  else globalThis.window = previousWindow;
});
