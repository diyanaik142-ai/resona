const fs = require('fs');
let app = fs.readFileSync('src/App.jsx', 'utf8');

// Remove states
app = app.replace(/const \[currentTrack, setCurrentTrack\][\s\S]*?\}\);/m, '');
app = app.replace(/useEffect\(\(\) => \{\s*localStorage.setItem\('resona_play_queue', JSON.stringify\(playQueue\)\);\s*\}, \[playQueue\]\);/m, '');

// Remove audioRef
app = app.replace(/const audioRef = useRef\(null\);/m, '');
app = app.replace(/const playbackSessionRef = useRef[\s\S]*?const recordActivity =[\s\S]*?\}\);/m, '');
app = app.replace(/const handleTimeUpdate =[\s\S]*?const handleSeek = \(valueOrEvent\) => \{[\s\S]*?\};\n/m, '');

// Wait, the regexes are getting complicated. It's better to just do string replacements or regex replacements for the specific functions.

// Remove track playing functions
app = app.replace(/const handlePlayTrack =[\s\S]*?setIsPlaying\(true\);\s*};/m, '');
app = app.replace(/useEffect\(\(\) => \{\s*if \(audioRef.current[\s\S]*?\}, \[currentTrack\]\);/m, '');
app = app.replace(/const handleTogglePlay =[\s\S]*?setIsPlaying\(true\);\s*\}\s*};/m, '');
app = app.replace(/const handleNextTrack =[\s\S]*?handlePlayTrack\(catalog\[nextIdx\]\);\s*\}\s*};/m, '');
app = app.replace(/const handlePrevTrack =[\s\S]*?handlePlayTrack\(catalog\[prevIdx\]\);\s*};/m, '');
app = app.replace(/const handleTimeUpdate =[\s\S]*?\}\s*};/m, '');
app = app.replace(/const handleLoadedMetadata =[\s\S]*?\}\s*};/m, '');
app = app.replace(/const handleTrackEnded =[\s\S]*?handleNextTrack\('ended'\);\s*\}\s*};/m, '');
app = app.replace(/const handleSeek =[\s\S]*?\}\s*};/m, '');

// Remove Queue functions
app = app.replace(/const handleAddToQueue =[\s\S]*?\}\s*};/m, '');
app = app.replace(/const handleRemoveFromQueue =[\s\S]*?return next;\s*\}\);\s*};/m, '');
app = app.replace(/const handleClearQueue =[\s\S]*?showToast\("Queue cleared"\);\s*};/m, '');
app = app.replace(/const handleReorderQueue =[\s\S]*?setPlayQueue\(newQueue\);\s*};/m, '');

// Remove the audio element
app = app.replace(/<audio\s*ref=\{audioRef\}[\s\S]*?onEnded=\{handleTrackEnded\}\s*\/>/m, '');

// Also remove the props from the components rendered in App.jsx
const propsToRemove = [
  'currentTrack={currentTrack}', 'isPlaying={isPlaying}', 'currentTime={currentTime}',
  'duration={duration}', 'volume={volume}', 'isMuted={isMuted}', 'isShuffle={isShuffle}',
  'isLoop={isLoop}', 'playQueue={playQueue}', 'onPlayTrack={handlePlayTrack}',
  'onTogglePlay={handleTogglePlay}', 'onNextTrack={handleNextTrack}', 'onPrevTrack={handlePrevTrack}',
  'onSeek={handleSeek}', 'onToggleMute={() => setIsMuted(m => !m)}',
  'onToggleShuffle={() => setIsShuffle(s => !s)}', 'onToggleLoop={() => setIsLoop(l => !l)}',
  'onAddToQueue={handleAddToQueue}', 'onRemoveFromQueue={handleRemoveFromQueue}',
  'onClearQueue={handleClearQueue}', 'onReorderQueue={handleReorderQueue}'
];

for (const p of propsToRemove) {
  const regex = new RegExp(`\\s*${p.replace(/([()[\]{}])/g, '\\$1')}`, 'g');
  app = app.replace(regex, '');
}

// In deepLink Resolved, change handlePlayTrack to playTrack
app = app.replace(/handlePlayTrack\(t\)/g, 'playTrack(t)');

// Add usePlayer at the top of App component
app = app.replace(/export default function App\(\) \{/, `import { usePlayer } from './context/PlayerContext';\nexport default function App() {\n  const { currentTrack, playTrack, setQueue } = usePlayer();\n`);

// Save
fs.writeFileSync('src/App.jsx', app, 'utf8');
console.log('App.jsx refactored.');
