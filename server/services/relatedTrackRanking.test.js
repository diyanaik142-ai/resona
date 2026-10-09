import assert from 'node:assert/strict';
import test from 'node:test';
import { rankRelatedTracks } from './relatedTrackRanking.js';

const track = (id, metadata = {}) => ({
  id,
  title: id,
  audioUrl: `/media/${id}.mp3`,
  status: 'Published',
  ...metadata
});

test('seed artist and matching genre/subgenre rank above unrelated catalog tracks', () => {
  const seed = track('seed', {
    artist: 'Seed Artist',
    genreId: 'pop',
    subgenreId: 'indie-pop',
    language: 'Hindi'
  });
  const ranked = rankRelatedTracks(seed, [
    track('unrelated', { artist: 'Other', genreId: 'rock' }),
    track('same-genre', { artist: 'Another', genreId: 'pop' }),
    track('same-subgenre', { artist: 'Third', genreId: 'pop', subgenreId: 'indie-pop' }),
    track('same-artist', { artist: 'Seed Artist', genreId: 'rock' }),
    track('related-artist', { artist: 'Neighbor', relatedArtists: ['Seed Artist'] })
  ], { random: () => 0 });

  assert.deepEqual(
    new Set(ranked.slice(0, 2).map((entry) => entry.id)),
    new Set(['same-artist', 'related-artist'])
  );
  assert.deepEqual(ranked.slice(2).map((entry) => entry.id), [
    'same-subgenre', 'same-genre', 'unrelated'
  ]);
  assert.match(ranked[0].recommendationReason, /same\/related artist/);
  assert.equal(ranked.at(-1).relatednessScore, 0);
  assert.match(ranked.at(-1).recommendationReason, /no matching metadata/);
});

test('matching subgenre and language add weighted signals without requiring every field', () => {
  const seed = track('seed', { genreId: 'pop', subgenreId: 'indie-pop', language: 'Hindi' });
  const ranked = rankRelatedTracks(seed, [
    track('language-only', { language: 'Hindi' }),
    track('subgenre-only', { subgenreId: 'indie-pop' }),
    track('both', { genreId: 'pop', subgenreId: 'indie-pop', language: 'Hindi' })
  ], { random: () => 0 });

  assert.deepEqual(ranked.map((entry) => entry.id), ['both', 'subgenre-only', 'language-only']);
  assert.equal(ranked[0].relatednessScore, 115);
});

test('human-readable metadata labels match normalized catalog IDs', () => {
  const seed = track('seed', { genreId: 'pop', subgenreId: 'indie-pop' });
  const ranked = rankRelatedTracks(seed, [
    track('label-values', { genre: 'Pop', subgenres: ['Indie Pop'] })
  ]);

  assert.equal(ranked[0].relatednessScore, 90);
  assert.match(ranked[0].recommendationReason, /same subgenre, same genre/);
});

test('excludes seed, unavailable, unpublished, and duplicate records', () => {
  const seed = track('seed', { genreId: 'pop' });
  const ranked = rankRelatedTracks(seed, [
    seed,
    track('unavailable', { genreId: 'pop', available: false }),
    track('draft', { genreId: 'pop', status: 'Draft' }),
    track('missing-audio', { genreId: 'pop', audioUrl: '' }),
    track('valid', { genreId: 'pop' }),
    track('valid', { genreId: 'pop', title: 'duplicate' })
  ]);

  assert.deepEqual(ranked.map((entry) => entry.id), ['valid']);
});

test('missing seed or candidate metadata safely places candidates in the generic fallback tier', () => {
  const ranked = rankRelatedTracks(track('seed'), [
    track('no-metadata'),
    track('with-genre', { genreId: 'pop' })
  ], { random: () => 0.99 });

  assert.deepEqual(ranked.map((entry) => entry.id), ['no-metadata', 'with-genre']);
  assert.ok(ranked.every((entry) => entry.relatednessScore === 0));
});

test('randomizes only equal relevance scores and leaves stronger matches first', () => {
  const seed = track('seed', { genreId: 'pop' });
  let randomCalls = 0;
  const ranked = rankRelatedTracks(seed, [
    track('same-a', { genreId: 'pop' }),
    track('same-b', { genreId: 'pop' }),
    track('generic')
  ], {
    random: () => {
      randomCalls += 1;
      return 0.99;
    }
  });

  assert.equal(ranked[0].relatednessScore, 35);
  assert.equal(ranked[1].relatednessScore, 35);
  assert.equal(ranked[2].relatednessScore, 0);
  assert.equal(randomCalls, 1);
});
