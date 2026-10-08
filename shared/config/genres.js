export const GENRES = [
  {
    id: 'pop',
    name: 'Pop',
    color: 'from-pink-500 to-rose-600',
    subgenres: [
      { id: 'dance-pop', name: 'Dance Pop' },
      { id: 'synthpop', name: 'Synthpop' },
      { id: 'electropop', name: 'Electropop' },
      { id: 'teen-pop', name: 'Teen Pop' },
      { id: 'art-pop', name: 'Art Pop' },
      { id: 'indie-pop', name: 'Indie Pop' }
    ]
  },
  {
    id: 'rock',
    name: 'Rock',
    color: 'from-stone-500 to-stone-700',
    subgenres: [
      { id: 'alternative-rock', name: 'Alternative Rock' },
      { id: 'indie-rock', name: 'Indie Rock' },
      { id: 'hard-rock', name: 'Hard Rock' },
      { id: 'classic-rock', name: 'Classic Rock' },
      { id: 'progressive-rock', name: 'Progressive Rock' },
      { id: 'punk-rock', name: 'Punk Rock' },
      { id: 'post-punk', name: 'Post-Punk' },
      { id: 'grunge', name: 'Grunge' }
    ]
  },
  {
    id: 'hip-hop',
    name: 'Hip-Hop',
    color: 'from-orange-500 to-red-600',
    subgenres: [
      { id: 'rap', name: 'Rap' },
      { id: 'trap', name: 'Trap' },
      { id: 'boom-bap', name: 'Boom Bap' },
      { id: 'conscious-hip-hop', name: 'Conscious Hip-Hop' },
      { id: 'drill', name: 'Drill' },
      { id: 'lo-fi-hip-hop', name: 'Lo-fi Hip-Hop' }
    ]
  },
  {
    id: 'r-and-b',
    name: 'R&B',
    color: 'from-purple-500 to-violet-600',
    subgenres: [
      { id: 'contemporary-r-and-b', name: 'Contemporary R&B' },
      { id: 'neo-soul', name: 'Neo Soul' },
      { id: 'funk', name: 'Funk' },
      { id: 'disco', name: 'Disco' },
      { id: 'quiet-storm', name: 'Quiet Storm' }
    ]
  },
  {
    id: 'electronic',
    name: 'Electronic',
    color: 'from-cyan-500 to-blue-600',
    subgenres: [
      { id: 'edm', name: 'EDM' },
      { id: 'house', name: 'House' },
      { id: 'techno', name: 'Techno' },
      { id: 'trance', name: 'Trance' },
      { id: 'drum-and-bass', name: 'Drum & Bass' },
      { id: 'dubstep', name: 'Dubstep' },
      { id: 'ambient', name: 'Ambient' },
      { id: 'synthwave', name: 'Synthwave' },
      { id: 'garage', name: 'Garage' }
    ]
  },
  {
    id: 'indie',
    name: 'Indie',
    color: 'from-emerald-500 to-teal-600',
    subgenres: [
      { id: 'indie-folk', name: 'Indie Folk' },
      { id: 'dream-pop', name: 'Dream Pop' },
      { id: 'shoegaze', name: 'Shoegaze' },
      { id: 'bedroom-pop', name: 'Bedroom Pop' }
    ]
  },
  {
    id: 'jazz',
    name: 'Jazz',
    color: 'from-amber-500 to-orange-600',
    subgenres: [
      { id: 'smooth-jazz', name: 'Smooth Jazz' },
      { id: 'bebop', name: 'Bebop' },
      { id: 'cool-jazz', name: 'Cool Jazz' },
      { id: 'jazz-fusion', name: 'Jazz Fusion' },
      { id: 'swing', name: 'Swing' }
    ]
  },
  {
    id: 'blues',
    name: 'Blues',
    color: 'from-blue-700 to-indigo-800',
    subgenres: [
      { id: 'chicago-blues', name: 'Chicago Blues' },
      { id: 'delta-blues', name: 'Delta Blues' },
      { id: 'contemporary-blues', name: 'Contemporary Blues' },
      { id: 'rhythm-and-blues', name: 'Rhythm & Blues' }
    ]
  },
  {
    id: 'classical',
    name: 'Classical',
    color: 'from-slate-500 to-slate-700',
    subgenres: [
      { id: 'baroque', name: 'Baroque' },
      { id: 'romantic', name: 'Romantic' },
      { id: 'chamber-music', name: 'Chamber Music' },
      { id: 'choral', name: 'Choral' },
      { id: 'opera', name: 'Opera' },
      { id: 'modern-classical', name: 'Modern Classical' }
    ]
  },
  {
    id: 'lo-fi',
    name: 'Lo-fi',
    color: 'from-fuchsia-400 to-purple-500',
    subgenres: [
      { id: 'chillhop', name: 'Chillhop' },
      { id: 'lo-fi-beats', name: 'Lo-fi Beats' },
      { id: 'study-beats', name: 'Study Beats' }
    ]
  },
  {
    id: 'metal',
    name: 'Metal',
    color: 'from-gray-700 to-gray-900',
    subgenres: [
      { id: 'heavy-metal', name: 'Heavy Metal' },
      { id: 'death-metal', name: 'Death Metal' },
      { id: 'black-metal', name: 'Black Metal' },
      { id: 'doom-metal', name: 'Doom Metal' },
      { id: 'metalcore', name: 'Metalcore' },
      { id: 'nu-metal', name: 'Nu Metal' }
    ]
  },
  {
    id: 'punk',
    name: 'Punk',
    color: 'from-red-600 to-rose-800',
    subgenres: [
      { id: 'pop-punk', name: 'Pop Punk' },
      { id: 'hardcore-punk', name: 'Hardcore Punk' },
      { id: 'post-punk', name: 'Post-Punk' },
      { id: 'ska-punk', name: 'Ska Punk' }
    ]
  },
  {
    id: 'reggae',
    name: 'Reggae',
    color: 'from-green-500 to-yellow-500',
    subgenres: [
      { id: 'roots-reggae', name: 'Roots Reggae' },
      { id: 'dub', name: 'Dub' },
      { id: 'dancehall', name: 'Dancehall' },
      { id: 'ska', name: 'Ska' },
      { id: 'rocksteady', name: 'Rocksteady' }
    ]
  },
  {
    id: 'country',
    name: 'Country',
    color: 'from-yellow-600 to-amber-800',
    subgenres: [
      { id: 'contemporary-country', name: 'Contemporary Country' },
      { id: 'outlaw-country', name: 'Outlaw Country' },
      { id: 'bluegrass', name: 'Bluegrass' },
      { id: 'americana', name: 'Americana' },
      { id: 'honky-tonk', name: 'Honky Tonk' }
    ]
  },
  {
    id: 'folk',
    name: 'Folk',
    color: 'from-emerald-600 to-green-800',
    subgenres: [
      { id: 'contemporary-folk', name: 'Contemporary Folk' },
      { id: 'traditional-folk', name: 'Traditional Folk' },
      { id: 'folk-rock', name: 'Folk Rock' },
      { id: 'anti-folk', name: 'Anti-Folk' }
    ]
  },
  {
    id: 'latin',
    name: 'Latin',
    color: 'from-red-500 to-orange-500',
    subgenres: [
      { id: 'reggaeton', name: 'Reggaeton' },
      { id: 'salsa', name: 'Salsa' },
      { id: 'bachata', name: 'Bachata' },
      { id: 'merengue', name: 'Merengue' },
      { id: 'cumbia', name: 'Cumbia' },
      { id: 'latin-pop', name: 'Latin Pop' }
    ]
  },
  {
    id: 'afrobeats',
    name: 'Afrobeats',
    color: 'from-orange-400 to-amber-600',
    subgenres: [
      { id: 'afro-pop', name: 'Afro-Pop' },
      { id: 'afro-fusion', name: 'Afro-Fusion' },
      { id: 'highlife', name: 'Highlife' }
    ]
  },
  {
    id: 'k-pop',
    name: 'K-Pop',
    color: 'from-pink-400 to-purple-500',
    subgenres: [
      { id: 'k-pop-boy-groups', name: 'K-Pop Boy Groups' },
      { id: 'k-pop-girl-groups', name: 'K-Pop Girl Groups' },
      { id: 'k-r-and-b', name: 'K-R&B' },
      { id: 'k-hip-hop', name: 'K-Hip-Hop' }
    ]
  },
  {
    id: 'j-pop',
    name: 'J-Pop',
    color: 'from-rose-400 to-pink-600',
    subgenres: [
      { id: 'city-pop', name: 'City Pop' },
      { id: 'j-rock', name: 'J-Rock' },
      { id: 'vocaloid', name: 'Vocaloid' },
      { id: 'anime', name: 'Anime' }
    ]
  },
  {
    id: 'indian',
    name: 'Indian',
    color: 'from-orange-500 to-yellow-500',
    subgenres: [
      { id: 'bollywood', name: 'Bollywood' },
      { id: 'indian-pop', name: 'Indian Pop' },
      { id: 'indian-classical', name: 'Indian Classical' },
      { id: 'ghazal', name: 'Ghazal' },
      { id: 'qawwali', name: 'Qawwali' },
      { id: 'sufi', name: 'Sufi' },
      { id: 'bhajan', name: 'Bhajan' },
      { id: 'devotional', name: 'Devotional' },
      { id: 'bhangra', name: 'Bhangra' },
      { id: 'punjabi', name: 'Punjabi' },
      { id: 'tamil', name: 'Tamil' },
      { id: 'telugu', name: 'Telugu' },
      { id: 'malayalam', name: 'Malayalam' },
      { id: 'kannada', name: 'Kannada' },
      { id: 'marathi', name: 'Marathi' },
      { id: 'bengali', name: 'Bengali' },
      { id: 'assamese', name: 'Assamese' },
      { id: 'bhojpuri', name: 'Bhojpuri' },
      { id: 'rajasthani', name: 'Rajasthani' },
      { id: 'haryanvi', name: 'Haryanvi' },
      { id: 'konkani', name: 'Konkani' }
    ]
  },
  {
    id: 'instrumental',
    name: 'Instrumental',
    color: 'from-slate-400 to-gray-500',
    subgenres: [
      { id: 'soundtrack', name: 'Soundtrack' },
      { id: 'game-music', name: 'Game Music' },
      { id: 'score', name: 'Score' },
      { id: 'neo-classical', name: 'Neo-Classical' }
    ]
  },
  {
    id: 'spoken-word',
    name: 'Spoken Word',
    color: 'from-neutral-600 to-stone-700',
    subgenres: [
      { id: 'comedy', name: 'Comedy' },
      { id: 'poetry', name: 'Poetry' },
      { id: 'storytelling', name: 'Storytelling' }
    ]
  },
  {
    id: 'gospel',
    name: 'Gospel',
    color: 'from-sky-400 to-blue-500',
    subgenres: [
      { id: 'contemporary-gospel', name: 'Contemporary Gospel' },
      { id: 'traditional-gospel', name: 'Traditional Gospel' },
      { id: 'christian-contemporary', name: 'Christian Contemporary' }
    ]
  }
];

export const getGenreById = (id) => GENRES.find(g => g.id === id);
export const isValidGenre = (id) => GENRES.some(g => g.id === id);

export const isValidSubgenre = (genreId, subgenreId) => {
  const genre = getGenreById(genreId);
  if (!genre) return false;
  return genre.subgenres.some(sg => sg.id === subgenreId);
};

export const getSubgenreById = (genreId, subgenreId) => {
  const genre = getGenreById(genreId);
  if (!genre) return null;
  return genre.subgenres.find(sg => sg.id === subgenreId) || null;
};
