function normalizeValues(value) {
  const values = Array.isArray(value) ? value.flat(Infinity) : [value];
  return values
    .flatMap((item) => typeof item === 'string' ? item.split(',') : [])
    .map((item) => item.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
    .filter(Boolean);
}

function trackMetadata(track) {
  return {
    artists: normalizeValues([track.artist, track.artists, track.relatedArtists]),
    genres: normalizeValues([track.genre, track.genreId, track.genres]),
    subgenres: normalizeValues([track.subgenre, track.subgenreId, track.subgenres]),
    languages: normalizeValues([track.language, track.languages]),
    moods: normalizeValues([track.mood, track.moods]),
    styles: normalizeValues([track.style, track.styles]),
    tempo: Number(track.bpm ?? track.tempo)
  };
}

function overlap(left, right) {
  return left.some((value) => right.includes(value));
}

function playablePublished(track) {
  return Boolean(
    track?.id &&
    typeof track.audioUrl === 'string' &&
    track.audioUrl.trim() &&
    track.deleted !== true &&
    track.isPublished !== false &&
    track.available !== false &&
    track.isAvailable !== false &&
    (!track.status || String(track.status).toLowerCase() === 'published')
  );
}

function shuffleTies(tracks, random) {
  const byScore = new Map();
  for (const track of tracks) {
    const tieKey = `${track.relatednessScore}:${track.score}`;
    const bucket = byScore.get(tieKey) || [];
    bucket.push(track);
    byScore.set(tieKey, bucket);
  }
  const result = [];
  for (const bucket of byScore.values()) {
    for (let index = bucket.length - 1; index > 0; index -= 1) {
      const target = Math.floor(random() * (index + 1));
      [bucket[index], bucket[target]] = [bucket[target], bucket[index]];
    }
    result.push(...bucket);
  }
  return result;
}

export function rankRelatedTracks(seedTrack, catalog, { random = Math.random, tasteScores = {} } = {}) {
  if (!seedTrack?.id || !Array.isArray(catalog)) return [];

  const seed = trackMetadata(seedTrack);
  const seen = new Set([String(seedTrack.id)]);
  const scored = [];
  for (const track of catalog) {
    const id = String(track?.id || '');
    if (!id || seen.has(id) || !playablePublished(track)) continue;
    seen.add(id);

    const metadata = trackMetadata(track);
    const signals = [];
    if (overlap(seed.artists, metadata.artists)) signals.push(['same/related artist', 100]);
    if (overlap(seed.subgenres, metadata.subgenres)) signals.push(['same subgenre', 55]);
    if (overlap(seed.genres, metadata.genres)) signals.push(['same genre', 35]);
    if (overlap(seed.languages, metadata.languages)) signals.push(['same language', 25]);
    if (overlap(seed.moods, metadata.moods)) signals.push(['similar mood', 12]);
    if (overlap(seed.styles, metadata.styles)) signals.push(['similar style', 10]);
    if (
      Number.isFinite(seed.tempo) &&
      seed.tempo > 0 &&
      Number.isFinite(metadata.tempo) &&
      metadata.tempo > 0 &&
      Math.abs(seed.tempo - metadata.tempo) <= Math.max(10, seed.tempo * 0.1)
    ) signals.push(['similar tempo', 8]);

    const relatednessScore = signals.reduce((total, [, weight]) => total + weight, 0);
    const personalTieBreak = Math.min(5, Math.max(0, Number(tasteScores[id]) || 0));
    const reasons = signals.map(([label]) => label);
    scored.push({
      ...track,
      relatednessScore,
      score: relatednessScore + personalTieBreak,
      recommendationReason: reasons.length
        ? reasons.join(', ')
        : 'Catalog fallback; no matching metadata'
    });
  }

  scored.sort((left, right) => right.relatednessScore - left.relatednessScore || right.score - left.score);
  return shuffleTies(scored, random);
}
