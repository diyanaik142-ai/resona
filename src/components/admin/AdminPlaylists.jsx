import { useState, useEffect } from 'react';
import { resolveMediaUrl,  api } from '../../services/api';
import { Music, Plus, Search, Trash2, Edit3, Image as ImageIcon, Globe, Lock } from 'lucide-react';
import { addCatalogTrackToPlaylist, removePlaylistItem } from '../../utils/adminPlaylistSelection.js';

const createPlaylistItemId = () => `pi_${globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`}`;

export default function AdminPlaylists() {
  const [playlists, setPlaylists] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('list'); // 'list' | 'editor'
  
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState('draft'); // 'published' | 'draft'
  const [formCover, setFormCover] = useState(null);
  const [formCoverPreview, setFormCoverPreview] = useState(null);
  const [formTracks, setFormTracks] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);

  const fetchPlaylists = async () => {
    try {
      const data = await api.admin.getPlaylists();
      setPlaylists(data || []);
      setError(null);
      return true;
    } catch (err) {
      setError(err.message || 'Failed to load playlists');
      return false;
    }
  };

  const fetchCatalog = async () => {
    try {
      const data = await api.admin.getCatalog();
      setCatalog(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    Promise.all([fetchPlaylists(), fetchCatalog()]).finally(() => setLoading(false));
  }, []);

  const handleCreateNew = () => {
    setEditingPlaylist(null);
    setFormName('');
    setFormDescription('');
    setFormStatus('draft');
    setFormCover(null);
    setFormCoverPreview(null);
    setFormTracks([]);
    setActiveView('editor');
  };

  const handleEdit = (playlist) => {
    setEditingPlaylist(playlist);
    setFormName(playlist.name);
    setFormDescription(playlist.description);
    setFormStatus(playlist.status);
    setFormCover(null);
    setFormCoverPreview(playlist.coverUrl);
    const usedItemIds = new Set();
    setFormTracks((Array.isArray(playlist.trackItems) ? playlist.trackItems : []).map((item) => {
      let playlistItemId = item.playlistItemId;
      if (!playlistItemId || usedItemIds.has(playlistItemId)) {
        playlistItemId = createPlaylistItemId();
      }
      usedItemIds.add(playlistItemId);
      return { ...item, playlistItemId };
    }));
    setActiveView('editor');
  };

  const handleDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    setActionNotice(null);
    try {
      await api.admin.deletePlaylist(deleteTarget.playlistId);
      setDeleteTarget(null);
      const refreshed = await fetchPlaylists();
      setActionNotice(refreshed
        ? { type: 'success', message: `"${deleteTarget.name}" was deleted. Catalog songs were not affected.` }
        : { type: 'error', message: 'The playlist was deleted, but the list could not refresh. Reload to see the latest data.' });
    } catch (err) {
      setActionNotice({ type: 'error', message: err.message || 'Failed to delete playlist.' });
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      alert('Playlist name is required');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('name', formName.trim());
      formData.append('description', formDescription.trim());
      formData.append('status', formStatus);
      
      const tracksToSave = formTracks.map((item, order) => ({
        playlistItemId: item.playlistItemId || createPlaylistItemId(),
        trackId: item.trackId || item.id || item.track?.id,
        order
      }));
      formData.append('trackItems', JSON.stringify(tracksToSave));
      
      if (formCover) {
        formData.append('cover', formCover);
      }

      if (editingPlaylist) {
        await api.admin.updatePlaylist(editingPlaylist.playlistId, formData);
      } else {
        await api.admin.createPlaylist(formData);
      }
      
      await fetchPlaylists();
      setActiveView('list');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCoverChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormCover(file);
      setFormCoverPreview(URL.createObjectURL(file));
    }
  };

  const addTrack = (track) => {
    setFormTracks(current => addCatalogTrackToPlaylist(current, track, createPlaylistItemId));
  };

  const removeTrack = (playlistItemId) => {
    setFormTracks(current => removePlaylistItem(current, playlistItemId));
  };

  const moveTrack = (playlistItemId, direction) => {
    setFormTracks((current) => {
      const index = current.findIndex(item => item.playlistItemId === playlistItemId);
      if (index < 0) return current;
      const newTracks = [...current];
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= newTracks.length) return current;
      const temp = newTracks[index];
      newTracks[index] = newTracks[newIndex];
      newTracks[newIndex] = temp;
      return newTracks;
    });
  };

  const filteredCatalog = catalog.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return t.title.toLowerCase().includes(q) || 
           t.artist.toLowerCase().includes(q) ||
           t.id.toLowerCase().includes(q);
  }).slice(0, 50);

  if (loading && activeView === 'list') {
    return <div className="text-center py-10 text-slate-400">Loading playlists...</div>;
  }

  if (activeView === 'editor') {
    return (
      <div className="space-y-6 animate-fade-in pb-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setActiveView('list')}
              className="text-slate-400 hover:text-white"
            >
              &larr; Back
            </button>
            <h2 className="text-2xl font-bold">{editingPlaylist ? 'Edit Playlist' : 'Create Playlist'}</h2>
          </div>
          <button 
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 rounded-xl glass-button-primary font-bold"
          >
            {loading ? 'Saving...' : 'Save Playlist'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cover Image</label>
                <div className="relative group cursor-pointer" onClick={() => document.getElementById('cover-upload').click()}>
                  <div className={`w-full aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden transition ${formCoverPreview ? 'border-transparent' : 'border-white/20 hover:border-teal-400/50'}`}>
                    {formCoverPreview ? (
                      <>
                        <img src={formCoverPreview} alt="Cover" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                          <Edit3 className="w-8 h-8 text-white" />
                        </div>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-10 h-10 text-slate-500 mb-2" />
                        <span className="text-sm text-slate-400">Upload Cover</span>
                      </>
                    )}
                  </div>
                  <input id="cover-upload" type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Playlist Name *</label>
                <input 
                  type="text" 
                  value={formName} 
                  onChange={e => setFormName(e.target.value)} 
                  placeholder="e.g. Summer Hits 2026"
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-400/50 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description</label>
                <textarea 
                  value={formDescription} 
                  onChange={e => setFormDescription(e.target.value)} 
                  placeholder="Tell listeners what this playlist is about..."
                  rows={3}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-400/50 transition resize-none custom-scrollbar"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Visibility</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setFormStatus('published')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border transition ${formStatus === 'published' ? 'bg-teal-500/20 border-teal-500/50 text-teal-300' : 'bg-black/20 border-white/10 text-slate-400 hover:border-white/20'}`}
                  >
                    <Globe className="w-4 h-4" /> Published
                  </button>
                  <button 
                    onClick={() => setFormStatus('draft')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border transition ${formStatus === 'draft' ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' : 'bg-black/20 border-white/10 text-slate-400 hover:border-white/20'}`}
                  >
                    <Lock className="w-4 h-4" /> Draft
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card p-6 rounded-2xl border border-white/10">
              <h3 className="text-lg font-bold mb-4">Playlist Tracks ({formTracks.length})</h3>
              
              <div className="space-y-2 mb-8">
                {formTracks.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-white/10 rounded-xl text-slate-500">
                    <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No tracks added yet.</p>
                    <p className="text-sm">Search the catalog below to add tracks.</p>
                  </div>
                ) : (
                  formTracks.map((item, index) => {
                    const track = catalog.find(t => t.id === item.trackId) || item.track || {};
                    return (
                      <div key={item.playlistItemId} className="flex items-center gap-3 p-3 bg-black/20 border border-white/5 rounded-xl hover:border-white/10 transition group">
                        <div className="flex flex-col gap-1 px-1">
                          <button onClick={() => moveTrack(item.playlistItemId, -1)} disabled={index === 0} className="text-slate-500 hover:text-white disabled:opacity-30">
                            <span className="text-[10px]">▲</span>
                          </button>
                          <button onClick={() => moveTrack(item.playlistItemId, 1)} disabled={index === formTracks.length - 1} className="text-slate-500 hover:text-white disabled:opacity-30">
                            <span className="text-[10px]">▼</span>
                          </button>
                        </div>
                        <span className="text-sm text-slate-500 font-mono w-6 text-center">{index + 1}</span>
                        <img src={resolveMediaUrl(track.cover || '/assets/default-cover.png')} alt={track.title} className="w-10 h-10 rounded-lg object-cover" />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate">{track.title || 'Unknown Track'}</p>
                          <p className="text-xs text-slate-400 truncate">{track.artist || 'Unknown Artist'}</p>
                        </div>
                        <div className="text-xs text-slate-500 font-mono hidden sm:block">
                          {track.id}
                        </div>
                        <button 
                          onClick={() => removeTrack(item.playlistItemId)}
                          className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  })
                )}
              </div>

              <div className="pt-6 border-t border-white/10">
                <h3 className="text-lg font-bold mb-4">Add from Catalog</h3>
                <div className="relative mb-4">
                  <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by title, artist, or track ID..."
                    className="w-full bg-black/20 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-teal-400/50 transition"
                  />
                </div>
                
                <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                  {filteredCatalog.length === 0 ? (
                    <div className="text-center py-6 text-slate-500">No tracks found</div>
                  ) : (
                    filteredCatalog.map(track => {
                      const isAdded = formTracks.some(item => item.trackId === track.id);
                      return (
                        <div key={track.id} className="flex items-center gap-3 p-2 bg-black/10 rounded-xl hover:bg-white/5 transition">
                          <img src={resolveMediaUrl(track.cover)} alt={track.title} className="w-10 h-10 rounded-lg object-cover" />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate">{track.title}</p>
                            <p className="text-xs text-slate-400 truncate">{track.artist}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => addTrack(track)}
                            disabled={isAdded}
                            className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 transition ${
                              isAdded
                                ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                                : 'bg-teal-500/20 text-teal-300 hover:bg-teal-500/30'
                            }`}
                          >
                            {isAdded ? 'Added' : <><Plus className="w-3 h-3" /> Add</>}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Admin Playlists</h2>
        <button 
          onClick={handleCreateNew}
          className="w-full sm:w-auto justify-center bg-purple-500 text-white px-4 py-2 rounded-full font-bold text-sm hover:bg-purple-400 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Create Playlist
        </button>
      </div>

      {actionNotice && (
        <div
          role={actionNotice.type === 'error' ? 'alert' : 'status'}
          className={`px-4 py-3 rounded-xl border text-sm ${
            actionNotice.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}
        >
          {actionNotice.message}
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400">
          {error}
        </div>
      )}

      {playlists.length === 0 ? (
        <div className="bg-slate-900/50 p-8 sm:p-12 rounded-2xl border border-white/5 text-center">
          <Music className="w-10 h-10 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2">No Playlists Yet</h3>
          <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">Create playlists using songs from the existing catalog.</p>
          <button onClick={handleCreateNew} className="px-6 py-2.5 rounded-xl glass-button-primary font-bold inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create First Playlist
          </button>
        </div>
      ) : (
        <div className="bg-slate-900/50 rounded-2xl border border-white/5 divide-y divide-white/5 overflow-hidden">
          {playlists.map(playlist => {
            const isPublished = String(playlist.status || '').toLowerCase() === 'published';
            const tracks = Array.isArray(playlist.trackItems)
              ? playlist.trackItems
              : Array.isArray(playlist.tracks) ? playlist.tracks : [];
            const updatedAt = playlist.updatedAt ? new Date(playlist.updatedAt) : null;
            const updatedLabel = updatedAt && !Number.isNaN(updatedAt.getTime())
              ? updatedAt.toLocaleDateString()
              : null;

            return (
              <div
                key={playlist.playlistId}
                className="grid grid-cols-[56px_minmax(0,1fr)] sm:flex sm:items-center gap-x-3 gap-y-3 p-3 sm:p-4 hover:bg-white/[0.02] transition-colors"
              >
                <img
                  src={resolveMediaUrl(playlist.coverUrl || '/branding/resona-icon.png')}
                  alt=""
                  className="w-14 h-14 shrink-0 rounded-lg object-cover border border-white/10 bg-slate-950"
                  onError={event => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = '/branding/resona-icon.png';
                  }}
                />
                <div className="min-w-0 self-center">
                  <h3 className="truncate text-sm font-bold text-white" title={playlist.name}>
                    {playlist.name || 'Untitled playlist'}
                  </h3>
                  {playlist.description && (
                    <p className="mt-0.5 truncate text-xs text-slate-400" title={playlist.description}>
                      {playlist.description}
                    </p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isPublished ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {isPublished ? 'Published' : 'Draft'}
                    </span>
                    <span>{tracks.length} {tracks.length === 1 ? 'song' : 'songs'}</span>
                    {updatedLabel && <span>Updated {updatedLabel}</span>}
                  </div>
                </div>
                <div className="col-span-2 flex justify-end gap-2 sm:ml-auto sm:shrink-0">
                  <button
                    type="button"
                    onClick={() => handleEdit(playlist)}
                    className="min-h-10 flex-1 sm:flex-none px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 transition inline-flex items-center justify-center gap-2 text-xs font-bold"
                    aria-label={`Edit ${playlist.name || 'playlist'}`}
                  >
                    <Edit3 className="w-4 h-4" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActionNotice(null);
                      setDeleteTarget(playlist);
                    }}
                    className="min-h-10 flex-1 sm:flex-none px-3 py-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition inline-flex items-center justify-center gap-2 text-xs font-bold"
                    aria-label={`Delete ${playlist.name || 'playlist'}`}
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={event => {
            if (event.target === event.currentTarget && !isDeleting) setDeleteTarget(null);
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-playlist-title"
            aria-describedby="delete-playlist-description"
            className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl sm:p-6"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
              <Trash2 className="h-5 w-5" />
            </div>
            <h3 id="delete-playlist-title" className="text-lg font-bold text-white">Delete playlist?</h3>
            <p id="delete-playlist-description" className="mt-2 break-words text-sm text-slate-400">
              Delete “{deleteTarget.name || 'Untitled playlist'}”? This only removes the playlist. Its catalog songs will remain unchanged.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="min-h-10 rounded-lg border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-white/5 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="min-h-10 rounded-lg bg-rose-500 px-4 py-2 text-sm font-bold text-white hover:bg-rose-400 disabled:cursor-wait disabled:opacity-60"
              >
                {isDeleting ? 'Deleting…' : 'Delete Playlist'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
