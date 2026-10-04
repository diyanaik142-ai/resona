const fs = require('fs');

const socialPath = './src/components/SocialView.jsx';
let social = fs.readFileSync(socialPath, 'utf8');
social = social.replace('const track = MOCK_TRACKS[0];', 'const track = MOCK_TRACKS.length > 0 ? MOCK_TRACKS[0] : null;');
social = social.replace(/"\$\{track\.title\}"/g, '"{track ? track.title : \'Track\'}"');

// In SocialView, track is used in huddle modal, beat code modal, share modal, story modal.
// We should wrap the track parts in {track && ...}
social = social.replace(/<img src=\{track\.cover\} alt="Track" className="w-10 h-10 rounded-xl object-cover" \/>/, '{track && <img src={track.cover} alt="Track" className="w-10 h-10 rounded-xl object-cover" />}');
social = social.replace(/<p className="font-bold text-white text-xs">\{track\.title\}<\/p>/, '{track && <p className="font-bold text-white text-xs">{track.title}</p>}');
social = social.replace(/<p className="text-\[10px\] text-slate-400">\{track\.artist\}<\/p>/, '{track && <p className="text-[10px] text-slate-400">{track.artist}</p>}');

social = social.replace(/<BeatCodeQR cover=\{track\.cover\} primaryColor=\{beatColorHex\} \/>/, '{track ? <BeatCodeQR cover={track.cover} primaryColor={beatColorHex} /> : <div className="w-32 h-32 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500">No Track</div>}');

social = social.replace(/<img src=\{track\.cover\} alt="Story Artwork" className="w-32 h-32 rounded-2xl object-cover shadow-2xl z-10 border border-white\/30" \/>/, '{track && <img src={track.cover} alt="Story Artwork" className="w-32 h-32 rounded-2xl object-cover shadow-2xl z-10 border border-white/30" />}');
social = social.replace(/<h4 className="font-black text-white text-base leading-tight">\{track\.title\}<\/h4>/, '<h4 className="font-black text-white text-base leading-tight">{track ? track.title : "No Track"}</h4>');
social = social.replace(/<p className="text-xs text-slate-300 font-semibold">\{track\.artist\}<\/p>/, '<p className="text-xs text-slate-300 font-semibold">{track ? track.artist : ""}</p>');

social = social.replace(/<img src=\{MOCK_TRACKS\[0\]\.cover\}/g, '{MOCK_TRACKS.length > 0 && <img src={MOCK_TRACKS[0].cover}');
social = social.replace(/<p className="font-bold text-white text-xs">\{MOCK_TRACKS\[0\]\.title\}<\/p>/g, '{MOCK_TRACKS.length > 0 && <p className="font-bold text-white text-xs">{MOCK_TRACKS[0].title}</p>}');
social = social.replace(/<p className="text-\[10px\] text-slate-400">\{MOCK_TRACKS\[0\]\.artist\}<\/p>/g, '{MOCK_TRACKS.length > 0 && <p className="text-[10px] text-slate-400">{MOCK_TRACKS[0].artist}</p>}');

fs.writeFileSync(socialPath, social);


const onAirPath = './src/components/OnAirView.jsx';
let onAir = fs.readFileSync(onAirPath, 'utf8');
onAir = onAir.replace("const track = currentTrack || MOCK_TRACKS[0];", "const track = currentTrack || (MOCK_TRACKS.length > 0 ? MOCK_TRACKS[0] : null);\n  if (!track) return <div className=\"p-8 text-center text-slate-400 mt-20\">No track playing</div>;");
fs.writeFileSync(onAirPath, onAir);
