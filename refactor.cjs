const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const componentsDir = path.join(srcDir, 'components');

const playerProps = [
  'currentTrack', 'isPlaying', 'currentTime', 'duration', 'volume',
  'isMuted', 'isShuffle', 'isLoop', 'playQueue', 'onPlayTrack',
  'onTogglePlay', 'onNextTrack', 'onPrevTrack', 'onSeek', 'onToggleMute',
  'onToggleShuffle', 'onToggleLoop', 'onAddToQueue', 'onRemoveFromQueue',
  'onClearQueue', 'onReorderQueue', 'handlePlayTrack', 'handleTogglePlay'
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // 1. Remove props from component signature
  // We need to look for export default function ComponentName({ ... })
  const componentMatch = content.match(/export default function\s+[A-Za-z0-9_]+\s*\(\s*\{([\s\S]*?)\}\s*\)/);
  let usesPlayer = false;
  
  if (componentMatch) {
    let propsStr = componentMatch[1];
    let newPropsStr = propsStr;
    let foundProps = [];
    
    for (const prop of playerProps) {
      const regex = new RegExp(`\\b${prop}\\b\\s*,?`, 'g');
      if (regex.test(propsStr)) {
        usesPlayer = true;
        foundProps.push(prop);
        newPropsStr = newPropsStr.replace(regex, '');
      }
    }
    
    if (usesPlayer) {
      content = content.replace(propsStr, newPropsStr);
      
      // Calculate relative path to context
      const relativeLevels = path.relative(path.dirname(filePath), path.join(srcDir, 'context')).replace(/\\/g, '/');
      const importPath = relativeLevels.startsWith('.') ? relativeLevels : `./${relativeLevels}`;
      
      // Add import
      if (!content.includes('PlayerContext')) {
        content = `import { usePlayer } from '${importPath}/PlayerContext';\n` + content;
      }
      
      // Add hook inside component
      // We map the old prop names to the new hook properties
      const hookStr = `
  const {
    currentTrack, isPlaying, currentTime, duration, volume, isMuted, isShuffle, isLoop,
    queue: playQueue,
    playTrack: onPlayTrack,
    playTrack: handlePlayTrack,
    togglePlay: onTogglePlay,
    togglePlay: handleTogglePlay,
    playNext: onNextTrack,
    playPrevious: onPrevTrack,
    seekTo: onSeek,
    setVolume: onVolumeChange,
    toggleMute: onToggleMute,
    toggleShuffle: onToggleShuffle,
    toggleLoop: onToggleLoop,
    addToQueue: onAddToQueue,
    removeFromQueue: onRemoveFromQueue,
    setQueue: onReorderQueue,
    setQueue
  } = usePlayer();
  const onClearQueue = () => setQueue([]);
`;
      
      // Insert right after the component declaration
      content = content.replace(/(export default function\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*\{)/, `$1${hookStr}`);
    }
  }

  // Write back if changed
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Refactored ${path.basename(filePath)}`);
  }
}

function traverseDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      traverseDir(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      processFile(fullPath);
    }
  }
}

traverseDir(componentsDir);
console.log('Done refactoring components.');
