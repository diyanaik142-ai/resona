const fs = require('fs');

function replaceFile(path, search, replace) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.split(search).join(replace);
  fs.writeFileSync(path, content);
}

replaceFile('./src/components/TunedForYouView.jsx', 'onPlayTrack(MOCK_TRACKS[0])', 'onPlayTrack(MOCK_TRACKS.length > 0 ? MOCK_TRACKS[0] : null)');
replaceFile('./src/components/TunedForYouView.jsx', 'onPlayTrack(MOCK_TRACKS[idx % MOCK_TRACKS.length])', 'onPlayTrack(MOCK_TRACKS.length > 0 ? MOCK_TRACKS[idx % MOCK_TRACKS.length] : null)');

replaceFile('./src/components/ShelfView.jsx', 'onPlayTrack(MOCK_TRACKS[i % MOCK_TRACKS.length])', 'onPlayTrack(MOCK_TRACKS.length > 0 ? MOCK_TRACKS[i % MOCK_TRACKS.length] : null)');

replaceFile('./src/components/PulseView.jsx', 'onPlayTrack(MOCK_TRACKS[0])', 'onPlayTrack(MOCK_TRACKS.length > 0 ? MOCK_TRACKS[0] : null)');

replaceFile('./src/components/CuratedExperiencesView.jsx', 'onPlayTrack(MOCK_TRACKS[0])', 'onPlayTrack(MOCK_TRACKS.length > 0 ? MOCK_TRACKS[0] : null)');
replaceFile('./src/components/CuratedExperiencesView.jsx', 'onPlayTrack(MOCK_TRACKS[1])', 'onPlayTrack(MOCK_TRACKS.length > 1 ? MOCK_TRACKS[1] : null)');

replaceFile('./src/App.jsx', 'handlePlayTrack(MOCK_TRACKS[0])', 'handlePlayTrack(MOCK_TRACKS.length > 0 ? MOCK_TRACKS[0] : null)');

