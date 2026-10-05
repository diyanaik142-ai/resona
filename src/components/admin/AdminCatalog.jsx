import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { Music, Plus, Search, Trash2, Edit2, Play, Check, X, Upload } from 'lucide-react';
import { GENRES } from '../../config/genres';

export default function AdminCatalog() {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isAdding, setIsAdding] = useState(false);
  const [newTrack, setNewTrack] = useState({ title: '', artist: '', genre: 'pop', status: 'Published', duration: '0:00' });
  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);

  const handleAudioChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAudioFile(file);
      const url = URL.createObjectURL(file);
      const audio = new Audio(url);
      audio.onloadedmetadata = () => {
        const mins = Math.floor(audio.duration / 60);
        const secs = Math.floor(audio.duration % 60);
        setNewTrack(prev => ({
          ...prev,
          duration: `${mins}:${secs.toString().padStart(2, '0')}`
        }));
        URL.revokeObjectURL(url);
      };
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const fetchCatalog = async () => {
    try {
      const data = await api.admin.getCatalog();
      setCatalog(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTrack = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', newTrack.title);
    formData.append('artist', newTrack.artist);
    formData.append('genre', newTrack.genre);
    formData.append('status', newTrack.status);
    formData.append('duration', newTrack.duration);
    if (audioFile) formData.append('audio', audioFile);
    if (coverFile) formData.append('cover', coverFile);

    try {
      await api.admin.uploadTrack(formData);
      setIsAdding(false);
      setNewTrack({ title: '', artist: '', genre: 'pop', status: 'Published', duration: '0:00' });
      setAudioFile(null);
      setCoverFile(null);
      fetchCatalog();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this track?')) return;
    try {
      await api.admin.deleteTrack(id);
      fetchCatalog();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Music className="text-purple-400 w-6 h-6" /> Music Catalog
        </h2>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search catalog..." 
              className="bg-slate-900/50 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-colors"
            />
          </div>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 bg-purple-500 text-white px-4 py-2 rounded-full font-bold text-sm hover:bg-purple-400 transition"
          >
            {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isAdding ? 'Cancel' : 'Add Track'}
          </button>
        </div>
      </div>

      {isAdding && (
        <form onSubmit={handleAddTrack} className="bg-slate-900/50 p-4 sm:p-6 rounded-2xl border border-purple-500/20 space-y-4">
          <h3 className="text-lg font-bold text-white">Add New Track</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Title</label>
              <input required value={newTrack.title} onChange={e => setNewTrack({...newTrack, title: e.target.value})} type="text" className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-purple-500/50 outline-none" placeholder="Track title..." />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Artist</label>
              <input required value={newTrack.artist} onChange={e => setNewTrack({...newTrack, artist: e.target.value})} type="text" className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-purple-500/50 outline-none" placeholder="Artist name..." />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Genre</label>
              <select required value={newTrack.genre} onChange={e => setNewTrack({...newTrack, genre: e.target.value})} className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-purple-500/50 outline-none">
                {GENRES.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Status</label>
              <select value={newTrack.status} onChange={e => setNewTrack({...newTrack, status: e.target.value})} className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-purple-500/50 outline-none">
                <option value="Published">Published</option>
                <option value="Draft">Draft</option>
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:col-span-2">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Audio File</label>
                <input required type="file" accept="audio/*" onChange={handleAudioChange} className="text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-500/10 file:text-purple-400 hover:file:bg-purple-500/20 w-full" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cover Image</label>
                <input required type="file" accept="image/*" onChange={e => setCoverFile(e.target.files[0])} className="text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-500/10 file:text-purple-400 hover:file:bg-purple-500/20 w-full" />
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" className="w-full sm:w-auto bg-purple-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-purple-400 transition shadow-[0_0_20px_rgba(168,85,247,0.3)]">
              Upload Track
            </button>
          </div>
        </form>
      )}

      {/* Desktop Table View */}
      <div className="hidden md:block bg-slate-900/50 rounded-2xl border border-white/5 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 border-b border-white/5 text-slate-400">
            <tr>
              <th className="p-4 font-medium">Cover</th>
              <th className="p-4 font-medium">Title</th>
              <th className="p-4 font-medium">Artist</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Added</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {catalog.map(track => (
              <tr key={track.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="p-4">
                  {track.cover ? (
                    <img src={track.cover} alt="Cover" className="w-10 h-10 rounded-md object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-md bg-white/5 flex items-center justify-center">
                      <Music className="w-4 h-4 text-slate-500" />
                    </div>
                  )}
                </td>
                <td className="p-4 font-bold text-white">{track.title}</td>
                <td className="p-4 text-slate-300">{track.artist}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${track.status === 'Draft' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    {track.status || 'Published'}
                  </span>
                </td>
                <td className="p-4 text-slate-500">{new Date(track.createdAt).toLocaleDateString()}</td>
                <td className="p-4 flex justify-end gap-2">
                  <button onClick={() => handleDelete(track.id)} className="p-2 bg-rose-500/10 text-rose-400 rounded-lg hover:bg-rose-500/20 transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {catalog.length === 0 && !loading && (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-500">Catalog is empty. Add a track to get started.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {catalog.map(track => (
          <div key={track.id} className="bg-slate-900/50 rounded-xl border border-white/5 p-4 flex gap-3 hover:bg-white/[0.02] transition">
            <div className="w-12 h-12 shrink-0">
              {track.cover ? (
                <img src={track.cover} alt="Cover" className="w-full h-full rounded-md object-cover" />
              ) : (
                <div className="w-full h-full rounded-md bg-white/5 flex items-center justify-center">
                  <Music className="w-5 h-5 text-slate-500" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-white text-sm truncate">{track.title}</div>
              <div className="text-xs text-slate-400 truncate">{track.artist}</div>
              <div className="flex flex-wrap gap-2 mt-2 items-center">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${track.status === 'Draft' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                  {track.status || 'Published'}
                </span>
                {track.duration && (
                  <span className="text-[10px] text-slate-500">{track.duration}</span>
                )}
                <span className="text-[10px] text-slate-500 ml-auto">{new Date(track.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex items-center shrink-0 border-l border-white/5 pl-3">
              <button onClick={() => handleDelete(track.id)} className="p-2 bg-rose-500/10 text-rose-400 rounded-lg hover:bg-rose-500/20 transition">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {catalog.length === 0 && !loading && (
          <div className="p-8 text-center text-slate-500 text-sm bg-slate-900/50 rounded-xl border border-white/5">
            Catalog is empty. Add a track to get started.
          </div>
        )}
      </div>
    </div>
  );
}
