import { useState, useEffect } from 'react';
import { resolveMediaUrl,  api } from '../../services/api';
import { Music, Plus, Search, Trash2, Edit3, GripVertical, Check, X, Image as ImageIcon, Globe, Lock } from 'lucide-react';
import { formatTime } from '../../utils/formatTime';

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

  const fetchPlaylists = async () => {
    try {
      const data = await api.admin.getPlaylists();
      setPlaylists(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load playlists');
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
    setFormTracks(playlist.trackItems || []);
    setActiveView('editor');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this playlist? The songs will remain in the catalog.')) return;
    try {
      await api.admin.deletePlaylist(id);
      await fetchPlaylists();
    } catch (err) {
      alert(err.message);
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
      
      // Ensure unique identities for drag-and-drop ordering when saving
      const tracksToSave = formTracks.map((t, idx) => ({
        playlistItemId: t.playlistItemId || `pi_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        trackId: t.trackId || t.id, // Support dragging from search directly
        position: idx
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
    const newItem = {
      playlistItemId: `pi_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      trackId: track.id,
      track
    };
    setFormTracks([...formTracks, newItem]);
  };

  const removeTrack = (playlistItemId) => {
    setFormTracks(formTracks.filter(t => t.playlistItemId !== playlistItemId));
  };

  const moveTrack = (index, direction) => {
    const newTracks = [...formTracks];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newTracks.length) return;
    const temp = newTracks[index];
    newTracks[index] = newTracks[newIndex];
    newTracks[newIndex] = temp;
    setFormTracks(newTracks);
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
                          <button onClick={() => moveTrack(index, -1)} disabled={index === 0} className="text-slate-500 hover:text-white disabled:opacity-30">
                            <span className="text-[10px]">▲</span>
                          </button>
                          <button onClick={() => moveTrack(index, 1)} disabled={index === formTracks.length - 1} className="text-slate-500 hover:text-white disabled:opacity-30">
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
                    filteredCatalog.map(track => (
                      <div key={track.id} className="flex items-center gap-3 p-2 bg-black/10 rounded-xl hover:bg-white/5 transition">
                        <img src={resolveMediaUrl(track.cover)} alt={track.title} className="w-10 h-10 rounded-lg object-cover" />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate">{track.title}</p>
                          <p className="text-xs text-slate-400 truncate">{track.artist}</p>
                        </div>
                        <button 
                          onClick={() => addTrack(track)}
                          className="px-3 py-1.5 rounded-lg bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 font-bold text-xs flex items-center gap-1 transition"
                        >
                          <Plus className="w-3 h-3" /> Add
                        </button>
                      </div>
                    ))
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
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Admin Playlists</h2>
        <button 
          onClick={handleCreateNew}
          className="px-4 py-2 rounded-xl glass-button-primary font-bold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Create Playlist
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400">
          {error}
        </div>
      )}

      {playlists.length === 0 ? (
        <div className="glass-card p-12 rounded-2xl border border-white/10 text-center">
          <Music className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">No Playlists Yet</h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">Create curated playlists using existing catalog songs to feature on the Resona platform.</p>
          <button onClick={handleCreateNew} className="px-6 py-2.5 rounded-xl glass-button-primary font-bold inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create First Playlist
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {playlists.map(playlist => (
            <div key={playlist.playlistId} className="glass-card rounded-2xl border border-white/10 overflow-hidden group">
              <div className="aspect-square relative bg-slate-900">
                {playlist.coverUrl ? (
                  <img src={resolveMediaUrl(playlist.coverUrl)} alt={playlist.name} className="w-full h-full object-cover transition duration-500 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 bg-gradient-to-br from-slate-800 to-black">
                    <Music className="w-12 h-12 opacity-50 mb-2" />
                    <span className="text-xs font-bold uppercase tracking-widest opacity-50">RESONA</span>
                  </div>
                )}
                <div className="absolute top-3 left-3 flex gap-2">
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${
                    playlist.status === 'published' ? 'bg-teal-500/80 text-white' : 'bg-amber-500/80 text-white'
                  }`}>
                    {playlist.status}
                  </span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition duration-300 flex items-end justify-between p-4">
                  <button 
                    onClick={() => handleEdit(playlist)}
                    className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 transition shadow-xl"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(playlist.playlistId)}
                    className="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center hover:scale-110 transition shadow-xl"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-lg mb-1 truncate">{playlist.name}</h3>
                <p className="text-sm text-slate-400 mb-2 truncate">{playlist.description || 'No description'}</p>
                <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                  <span>{playlist.trackItems?.length || 0} songs</span>
                  <span className="truncate ml-2" title={playlist.playlistId}>{playlist.playlistId.split('_')[1]}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
