export const GENRES = [
  { id: 'pop', name: 'Pop', color: 'from-pink-500 to-rose-600' },
  { id: 'hip-hop', name: 'Hip-Hop', color: 'from-orange-500 to-red-600' },
  { id: 'electronic', name: 'Electronic', color: 'from-cyan-500 to-blue-600' },
  { id: 'r-and-b', name: 'R&B', color: 'from-purple-500 to-violet-600' },
  { id: 'rock', name: 'Rock', color: 'from-stone-500 to-stone-700' },
  { id: 'indie', name: 'Indie', color: 'from-emerald-500 to-teal-600' },
  { id: 'jazz', name: 'Jazz', color: 'from-amber-500 to-orange-600' },
  { id: 'classical', name: 'Classical', color: 'from-slate-500 to-slate-700' },
  { id: 'acoustic', name: 'Acoustic', color: 'from-indigo-500 to-blue-600' },
];

export const getGenreById = (id) => GENRES.find(g => g.id === id);
export const isValidGenre = (id) => GENRES.some(g => g.id === id);
