export const GENRES = [
  { 
    id: 'pop', name: 'Pop', color: 'from-pink-500 to-rose-600',
    subgenres: ['Dance Pop', 'Synthpop', 'Electropop', 'Teen Pop', 'Art Pop', 'Indie Pop']
  },
  { 
    id: 'rock', name: 'Rock', color: 'from-stone-500 to-stone-700',
    subgenres: ['Alternative Rock', 'Indie Rock', 'Hard Rock', 'Classic Rock', 'Progressive Rock', 'Punk Rock', 'Post-Punk', 'Grunge']
  },
  { 
    id: 'hip-hop', name: 'Hip-Hop', color: 'from-orange-500 to-red-600',
    subgenres: ['Rap', 'Trap', 'Boom Bap', 'Conscious Hip-Hop', 'Drill', 'Lo-fi Hip-Hop']
  },
  { 
    id: 'r-and-b', name: 'R&B', color: 'from-purple-500 to-violet-600',
    subgenres: ['Contemporary R&B', 'Neo Soul', 'Funk', 'Disco', 'Quiet Storm']
  },
  { 
    id: 'electronic', name: 'Electronic', color: 'from-cyan-500 to-blue-600',
    subgenres: ['EDM', 'House', 'Techno', 'Trance', 'Drum & Bass', 'Dubstep', 'Ambient', 'Synthwave', 'Garage']
  },
  { 
    id: 'indie', name: 'Indie', color: 'from-emerald-500 to-teal-600',
    subgenres: ['Indie Folk', 'Dream Pop', 'Shoegaze', 'Bedroom Pop']
  },
  { 
    id: 'jazz', name: 'Jazz', color: 'from-amber-500 to-orange-600',
    subgenres: ['Smooth Jazz', 'Bebop', 'Cool Jazz', 'Jazz Fusion', 'Swing']
  },
  { 
    id: 'blues', name: 'Blues', color: 'from-blue-700 to-indigo-800',
    subgenres: ['Chicago Blues', 'Delta Blues', 'Contemporary Blues', 'Rhythm & Blues']
  },
  { 
    id: 'classical', name: 'Classical', color: 'from-slate-500 to-slate-700',
    subgenres: ['Baroque', 'Romantic', 'Chamber Music', 'Choral', 'Opera', 'Modern Classical']
  },
  { 
    id: 'lo-fi', name: 'Lo-fi', color: 'from-fuchsia-400 to-purple-500',
    subgenres: ['Chillhop', 'Lo-fi Beats', 'Study Beats']
  },
  { 
    id: 'metal', name: 'Metal', color: 'from-gray-700 to-gray-900',
    subgenres: ['Heavy Metal', 'Death Metal', 'Black Metal', 'Doom Metal', 'Metalcore', 'Nu Metal']
  },
  { 
    id: 'punk', name: 'Punk', color: 'from-red-600 to-rose-800',
    subgenres: ['Pop Punk', 'Hardcore Punk', 'Post-Punk', 'Ska Punk']
  },
  { 
    id: 'reggae', name: 'Reggae', color: 'from-green-500 to-yellow-500',
    subgenres: ['Roots Reggae', 'Dub', 'Dancehall', 'Ska', 'Rocksteady']
  },
  { 
    id: 'country', name: 'Country', color: 'from-yellow-600 to-amber-800',
    subgenres: ['Contemporary Country', 'Outlaw Country', 'Bluegrass', 'Americana', 'Honky Tonk']
  },
  { 
    id: 'folk', name: 'Folk', color: 'from-emerald-600 to-green-800',
    subgenres: ['Contemporary Folk', 'Traditional Folk', 'Folk Rock', 'Anti-Folk']
  },
  { 
    id: 'latin', name: 'Latin', color: 'from-red-500 to-orange-500',
    subgenres: ['Reggaeton', 'Salsa', 'Bachata', 'Merengue', 'Cumbia', 'Latin Pop']
  },
  { 
    id: 'afrobeats', name: 'Afrobeats', color: 'from-orange-400 to-amber-600',
    subgenres: ['Afro-Pop', 'Afro-Fusion', 'Highlife']
  },
  { 
    id: 'k-pop', name: 'K-Pop', color: 'from-pink-400 to-purple-500',
    subgenres: ['K-Pop Boy Groups', 'K-Pop Girl Groups', 'K-R&B', 'K-Hip-Hop']
  },
  { 
    id: 'j-pop', name: 'J-Pop', color: 'from-rose-400 to-pink-600',
    subgenres: ['City Pop', 'J-Rock', 'Vocaloid', 'Anime']
  },
  { 
    id: 'indian', name: 'Indian', color: 'from-orange-500 to-yellow-500',
    subgenres: ['Bollywood', 'Indian Pop', 'Indian Classical', 'Ghazal', 'Qawwali', 'Sufi', 'Bhajan', 'Devotional', 'Bhangra', 'Punjabi', 'Tamil', 'Telugu', 'Malayalam', 'Kannada', 'Marathi', 'Bengali', 'Assamese', 'Bhojpuri', 'Rajasthani', 'Haryanvi', 'Konkani']
  },
  { 
    id: 'instrumental', name: 'Instrumental', color: 'from-slate-400 to-gray-500',
    subgenres: ['Soundtrack', 'Game Music', 'Score', 'Neo-Classical']
  },
  { 
    id: 'spoken-word', name: 'Spoken Word', color: 'from-neutral-600 to-stone-700',
    subgenres: ['Comedy', 'Poetry', 'Storytelling']
  },
  { 
    id: 'gospel', name: 'Gospel', color: 'from-sky-400 to-blue-500',
    subgenres: ['Contemporary Gospel', 'Traditional Gospel', 'Christian Contemporary']
  }
];

export const getGenreById = (id) => GENRES.find(g => g.id === id);
export const isValidGenre = (id) => GENRES.some(g => g.id === id);

// Get all subgenres globally or by genre
export const getAllSubgenres = () => {
  const all = new Set();
  GENRES.forEach(g => {
    (g.subgenres || []).forEach(sg => all.add(sg));
  });
  return Array.from(all).sort();
};

