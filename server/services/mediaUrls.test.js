import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeProfileAvatar } from './mediaUrls.js';

test('profile media paths and canonical production URLs normalize to stable public paths', () => {
  assert.equal(normalizeProfileAvatar('/media/profiles/usr_123_456.jpg'), '/media/profiles/usr_123_456.jpg');
  assert.equal(
    normalizeProfileAvatar('https://resona.anchorlyhms.com/media/profiles/usr_123_456.jpg'),
    '/media/profiles/usr_123_456.jpg'
  );
  assert.equal(
    normalizeProfileAvatar('http://localhost:8080/media/profiles/usr_123_456.jpg'),
    '/media/profiles/usr_123_456.jpg'
  );
  assert.equal(
    normalizeProfileAvatar('C:\\Resona\\server\\data\\media\\profiles\\usr_123_456.jpg'),
    '/media/profiles/usr_123_456.jpg'
  );
});

test('valid third-party HTTPS avatars are preserved without rewriting', () => {
  const externalUrl = 'https://images.example.net/user/avatar.jpg';
  assert.equal(normalizeProfileAvatar(externalUrl), externalUrl);
});

test('temporary URLs, local host URLs, filesystem paths, and malformed filenames are rejected', () => {
  assert.equal(normalizeProfileAvatar('blob:https://resona.anchorlyhms.com/temp'), null);
  assert.equal(normalizeProfileAvatar('file:///opt/resona/media/profiles/avatar.jpg'), null);
  assert.equal(normalizeProfileAvatar('http://localhost/avatar.jpg'), null);
  assert.equal(normalizeProfileAvatar('/opt/resona/private/avatar.jpg'), null);
  assert.equal(normalizeProfileAvatar('/media/profiles/../avatar.jpg'), null);
  assert.equal(normalizeProfileAvatar(null), null);
});
