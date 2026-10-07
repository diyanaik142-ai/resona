const fs = require('fs');

function processFile() {
  let content = fs.readFileSync('src/App.jsx', 'utf8');

  // 1. Remove state declarations for player
  const stateStart = content.indexOf('const [currentTrack, setCurrentTrack] = useState(null);');
  const stateEnd = content.indexOf('const [toastMsg, setToastMsg] = useState(null);');
  if (stateStart !== -1 && stateEnd !== -1) {
    content = content.substring(0, stateStart) + content.substring(stateEnd);
  }

  // 2. Remove audioRef and everything until // Synchronize Real-time Notifications & Presence
  const audioRefStart = content.indexOf('const audioRef = useRef(null);');
  const syncRealTimeStart = content.indexOf('// Synchronize Real-time Notifications & Presence');
  if (audioRefStart !== -1 && syncRealTimeStart !== -1) {
    content = content.substring(0, audioRefStart) + content.substring(syncRealTimeStart);
  }

  // 3. Remove player event handlers: handlePlayTrack through handleSeek
  const handlePlayTrackStart = content.indexOf('// Handle Track Play');
  const handleSeekEnd = content.indexOf('  // Add to Queue');
  if (handlePlayTrackStart !== -1 && handleSeekEnd !== -1) {
    content = content.substring(0, handlePlayTrackStart) + content.substring(handleSeekEnd);
  }

  // 4. Remove Queue management: handleAddToQueue through handleReorderQueue
  const handleAddToQueueStart = content.indexOf('const handleAddToQueue');
  const audioRefStart2 = content.indexOf('const audioRef = useRef(null);'); // wait we already removed it...
  const handleReorderQueueEnd = content.indexOf('const handleReorderQueue = (newQueue) => {\n    setPlayQueue(newQueue);\n  };') + 'const handleReorderQueue = (newQueue) => {\n    setPlayQueue(newQueue);\n  };\n'.length;
  // Let's just find them by index if they exist
  const addQueueStart = content.indexOf('const handleAddToQueue = (track) => {');
  if (addQueueStart !== -1) {
    // find where handleReorderQueue ends
    const reorderEndStr = 'setPlayQueue(newQueue);\n  };';
    const reorderEnd = content.indexOf(reorderEndStr, addQueueStart);
    if (reorderEnd !== -1) {
      content = content.substring(0, addQueueStart) + content.substring(reorderEnd + reorderEndStr.length);
    }
  }

  // 5. Remove the <audio ... /> element
  const audioTagRegex = /<audio\s+ref=\{audioRef\}[\s\S]*?onEnded=\{handleTrackEnded\}\s*\/>/m;
  content = content.replace(audioTagRegex, '');

  // 6. Replace props in component invocations
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
    // using split and join to safely replace all occurrences regardless of exact spaces
    // But since spaces might vary, let's use a regex
    const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\s*${escapeRegExp(p)}`, 'g');
    content = content.replace(regex, '');
  }

  // 7. Replace handlePlayTrack(t) with playTrack(t) in deepLink logic
  content = content.replace(/handlePlayTrack\(t\)/g, 'playTrack(t)');

  // 8. Add usePlayer import and hook
  if (!content.includes('PlayerContext')) {
    content = content.replace(/import React/, "import { usePlayer } from './context/PlayerContext';\nimport React");
  }
  
  // Find where component starts
  const appStart = content.indexOf('export default function App() {');
  if (appStart !== -1) {
    const hookInsertStr = `export default function App() {\n  const { currentTrack, playTrack, setQueue } = usePlayer();\n`;
    content = content.replace('export default function App() {', hookInsertStr);
  }

  fs.writeFileSync('src/App.jsx', content, 'utf8');
}

processFile();
console.log('App.jsx carefully refactored.');
