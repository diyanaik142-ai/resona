import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDownToLine, Check, ChevronLeft, Clipboard, Disc3, Heart, ListPlus, MoreHorizontal, Pause, Play, RefreshCw, Share2, Shuffle, Sparkles, UserRound } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { api, resolveMediaUrl } from '../services/api';
import { formatTime } from '../utils/formatTime';

const fallbackCover = '/assets/default-cover.png';
const IconButton = ({ label, children, onClick, active = false, className = '', disabled = false }) => (
  <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className={`playlist-icon-button ${active ? 'is-active' : ''} ${className}`}>{children}</button>
);
function Artwork({ src, alt, className = '' }) {
  const [imageSrc, setImageSrc] = useState(src || fallbackCover);
  useEffect(() => setImageSrc(src || fallbackCover), [src]);
  return <img src={imageSrc} alt={alt} className={className} onError={() => setImageSrc(fallbackCover)} />;
}
function PlaylistSkeleton() {
  return <div className="playlist-page playlist-skeleton" aria-label="Loading playlist"><div className="playlist-skeleton-bar" /><div className="playlist-skeleton-hero"><div className="playlist-skeleton-cover" /><div className="playlist-skeleton-copy"><span /><span /><span /></div></div><div className="playlist-skeleton-list">{[1, 2, 3].map(item => <span key={item} />)}</div></div>;
}

export default function PlaylistView({ playlistId, onNavigate }) {
  const { currentTrack, isPlaying, isLoading: playerLoading, playTrack, addToQueue, togglePlay } = usePlayer();
  const { user, shelf, toggleLikeTrack } = useAuth();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadPlaylist = () => {
    if (!playlistId) return;
    setLoading(true); setError(null);
    api.tracks.getPlaylist(playlistId).then(setPlaylist).catch(err => setError(err.message || 'Unable to load this playlist.')).finally(() => setLoading(false));
  };
  useEffect(() => { loadPlaylist(); }, [playlistId]);
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 96);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  useEffect(() => {
    const close = () => setOpenMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const tracks = useMemo(() => (Array.isArray(playlist?.tracks) ? playlist.tracks : []), [playlist]);
  const likedTrackIds = shelf?.likedTrackIds || [];
  const isOwner = user?.role === 'admin' || Boolean(playlist && (playlist.ownerId === user?.id || playlist.createdBy === user?.id));
  const ownerName = playlist?.owner?.name || playlist?.ownerName || playlist?.createdByName || (playlist?.isAdminCurated ? 'Resona' : '');
  const currentIsInPlaylist = currentTrack && tracks.some(track => track.id === currentTrack.id);
  const isCurrentPlaying = currentIsInPlaylist && isPlaying;

  const playFrom = (track, shuffle = false) => {
    if (!track || tracks.length === 0) return;
    const ordered = shuffle ? [...tracks].sort(() => Math.random() - 0.5) : tracks;
    playTrack(ordered.find(item => item.id === track.id) || ordered[0], ordered);
  };
  const link = () => `${window.location.origin}/playlist/${playlistId}`;
  const handleCopyLink = async () => {
    try { await navigator.clipboard.writeText(link()); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { /* embedded browsers can block clipboard */ }
  };
  const handleShare = async () => {
    if (navigator.share) { try { await navigator.share({ title: playlist?.name || 'Resona playlist', url: link() }); } catch { /* user cancelled */ } } else await handleCopyLink();
  };

  if (loading) return <PlaylistSkeleton />;
  if (error || !playlist) return <div className="playlist-state"><div className="playlist-state-icon"><Disc3 /></div><p className="playlist-eyebrow">Playlist unavailable</p><h1>We couldn’t load this playlist</h1><p>{error || 'The playlist may have been removed or is temporarily offline.'}</p><div className="playlist-state-actions"><button type="button" className="playlist-primary-button" onClick={loadPlaylist}><RefreshCw size={16} /> Retry</button><button type="button" className="playlist-secondary-button" onClick={() => onNavigate('BACK')}>Go back</button></div></div>;

  return <main className={`playlist-page ${scrolled ? 'is-scrolled' : ''}`}>
    <div className="playlist-ambient" style={{ backgroundImage: `linear-gradient(180deg, rgba(5, 8, 15, .2), #08090e 76%), url(${resolveMediaUrl(playlist.coverUrl)})` }} aria-hidden="true" />
    <header className="playlist-topbar">
      <IconButton label="Go back" onClick={() => onNavigate('BACK')}><ChevronLeft size={20} /></IconButton>
      <div className="playlist-compact-title" aria-hidden={!scrolled}><span>Playlist</span><strong>{playlist.name}</strong></div>
      <div className="playlist-menu-wrap"><IconButton label="More playlist actions" onClick={event => { event.stopPropagation(); setOpenMenu(openMenu === 'playlist' ? null : 'playlist'); }}><MoreHorizontal size={20} /></IconButton>
        {openMenu === 'playlist' && <div className="playlist-menu playlist-menu-right" onClick={event => event.stopPropagation()}>
          <button type="button" onClick={handleShare}><Share2 size={16} /> Share playlist</button><button type="button" onClick={handleCopyLink}>{copied ? <Check size={16} /> : <Clipboard size={16} />} {copied ? 'Link copied' : 'Copy link'}</button><button type="button" disabled><Sparkles size={16} /> Beat Code</button>
          {isOwner && <><div className="playlist-menu-divider" /><button type="button" onClick={() => onNavigate('admin')}><Sparkles size={16} /> Edit playlist</button><button type="button" className="is-danger" onClick={() => setOpenMenu(null)}>Delete playlist</button></>}
        </div>}
      </div>
    </header>

    <section className="playlist-hero" aria-labelledby="playlist-title"><div className="playlist-cover-frame"><Artwork src={resolveMediaUrl(playlist.coverUrl)} alt={`${playlist.name} cover`} className="playlist-cover" /></div><div className="playlist-hero-copy"><p className="playlist-eyebrow">Playlist</p><h1 id="playlist-title">{playlist.name}</h1>{playlist.description && <p className="playlist-description">{playlist.description}</p>}<p className="playlist-meta">{ownerName && <><span>{ownerName}</span><i>•</i></>}<span>{tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}</span></p></div></section>

    <section className="playlist-actions" aria-label="Playlist controls"><div className="playlist-actions-secondary"><IconButton label="Save playlist" disabled><Heart size={21} /></IconButton><IconButton label="Download playlist" disabled><ArrowDownToLine size={20} /></IconButton><IconButton label="Shuffle playlist" onClick={() => playFrom(tracks[0], true)} disabled={!tracks.length}><Shuffle size={20} /></IconButton></div><button type="button" className="playlist-play-button" onClick={() => (isCurrentPlaying ? togglePlay() : playFrom(tracks[0]))} disabled={!tracks.length || playerLoading} aria-label={isCurrentPlaying ? 'Pause playlist' : 'Play playlist'}>{isCurrentPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={21} fill="currentColor" />}<span>{isCurrentPlaying ? 'Pause' : 'Play'}</span></button></section>

    <section className="playlist-track-section" aria-labelledby="track-list-heading"><div className="playlist-track-heading"><span id="track-list-heading">Tracks</span><span>{tracks.length}</span></div>
      {tracks.length === 0 ? <div className="playlist-empty"><div className="playlist-state-icon playlist-empty-icon"><Disc3 /></div><h2>No tracks yet</h2><p>This playlist is ready for its first listen.</p></div> : <div className="playlist-track-list">{tracks.map((track, index) => {
        const isTrackCurrent = currentTrack?.id === track.id; const liked = likedTrackIds.includes(track.id);
        return <article key={track.playlistItemId || track.id} className={`playlist-track-row ${isTrackCurrent ? 'is-current' : ''}`} onClick={() => playFrom(track)}>
          <div className="playlist-track-number">{isTrackCurrent && isPlaying ? <span className="playlist-playing-bars"><i /><i /><i /></span> : String(index + 1).padStart(2, '0')}</div><Artwork src={resolveMediaUrl(track.coverUrl || track.cover)} alt="" className="playlist-track-art" /><div className="playlist-track-copy"><h3>{track.title}</h3><p>{track.artist || 'Unknown artist'}</p></div><div className="playlist-track-duration">{formatTime(Number(track.duration) || 0)}</div>
          <IconButton label={liked ? `Remove ${track.title} from Heartbeats` : `Add ${track.title} to Heartbeats`} active={liked} onClick={event => { event.stopPropagation(); toggleLikeTrack(track.id); }}><Heart size={17} fill={liked ? 'currentColor' : 'none'} /></IconButton>
          <div className="playlist-menu-wrap"><IconButton label={`More actions for ${track.title}`} onClick={event => { event.stopPropagation(); setOpenMenu(openMenu === track.id ? null : track.id); }}><MoreHorizontal size={19} /></IconButton>{openMenu === track.id && <div className="playlist-menu playlist-menu-track" onClick={event => event.stopPropagation()}><button type="button" onClick={() => { addToQueue(track); setOpenMenu(null); }}><ListPlus size={16} /> Add to queue</button><button type="button" onClick={() => { toggleLikeTrack(track.id); setOpenMenu(null); }}><Heart size={16} /> {liked ? 'Remove from Heartbeats' : 'Add to Heartbeats'}</button><button type="button" onClick={() => { handleShare(); setOpenMenu(null); }}><Share2 size={16} /> Share</button><button type="button" onClick={() => setOpenMenu(null)}><UserRound size={16} /> View artist</button></div>}</div>
        </article>;
      })}</div>}
    </section><div className="playlist-bottom-space" />
  </main>;
}
