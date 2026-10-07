import { usePlayer } from '../../context/PlayerContext';
import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  UploadCloud, 
  BarChart3, 
  Music2, 
  Users, 
  CheckCircle, 
  Clock, 
  Plus, 
  ArrowRight, 
  X, 
  Play, 
  Radio,
  Sparkles,
  Layers,
  UserCheck
} from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase';
import { api } from '../../services/api';
import Avatar from '../Avatar';

/**
 * MobileCreatorHubView - Dedicated mobile workspace for creators
 * Navigation: Overview | Music | Analytics | Profile
 * Includes mobile upload wizard and responsive telemetry cards.
 */
export default function MobileCreatorHubView({ }) {
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

  const { user, creatorData, catalog } = useAuth();
  const [activeTab, setActiveTab] = useState('Overview'); // Overview | Music | Analytics | Profile
  const [musicSubTab, setMusicSubTab] = useState('Releases'); // Releases | Upload
  
  // Upload wizard states
  const [uploadStep, setUploadStep] = useState(1); // 1: Details, 2: Audio & Cover, 3: Review
  const [songTitle, setSongTitle] = useState('');
  const [songGenre, setSongGenre] = useState('Indie');
  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const audioInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const uploads = creatorData?.uploads || [];

  const [applyName, setApplyName] = useState(user?.name || '');
  const [isApplying, setIsApplying] = useState(false);

  const isApproved = creatorData?.isCreator || creatorData?.status === 'approved';

  if (!isApproved) {
    return (
      <div className="pt-6 px-4 space-y-6 max-w-md mx-auto">
        <div className="text-center">
          <div className="w-16 h-16 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Radio className="w-8 h-8 text-teal-400" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Become a Creator</h1>
          <p className="text-slate-400 text-xs mt-2">Publish your original tracks directly to the Resona network.</p>
        </div>
        
        <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-4">
          {creatorData?.status === 'pending' ? (
            <div className="text-center space-y-3 py-6">
              <Clock className="w-10 h-10 text-amber-400 mx-auto" />
              <h3 className="font-bold text-white">Application Under Review</h3>
              <p className="text-xs text-slate-400">Our team is reviewing your application. This usually takes 1-3 business days.</p>
            </div>
          ) : creatorData?.status === 'rejected' ? (
             <div className="text-center space-y-3 py-6">
              <X className="w-10 h-10 text-red-400 mx-auto" />
              <h3 className="font-bold text-white">Application Declined</h3>
              <p className="text-xs text-slate-400">Unfortunately, we cannot approve your creator application at this time.</p>
            </div>
          ) : (
            <>
              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">Artist Name</label>
                <input
                  type="text"
                  value={applyName}
                  onChange={e => setApplyName(e.target.value)}
                  className="w-full py-2.5 px-3.5 rounded-xl glass-card border border-white/10 text-white focus:border-teal-400 focus:outline-none text-sm"
                  placeholder="Enter your artist name"
                />
              </div>
              
              <div className="pt-3">
                <button
                  disabled={isApplying || !applyName.trim()}
                  onClick={async () => {
                    setIsApplying(true);
                    try {
                      await api.creator.apply({ artistName: applyName });
                      window.location.reload(); // Refresh state to show pending
                    } catch (e) {
                      alert(e.message);
                      setIsApplying(false);
                    }
                  }}
                  className="w-full py-3 rounded-xl glass-button-primary font-bold disabled:opacity-50 text-sm"
                >
                  {isApplying ? 'Submitting...' : 'Apply for Creator Access'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6 px-4 pt-2">
      {/* Workspace Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Creator Studio</h1>
          <p className="text-xs text-white/50">Manage your music releases and audience</p>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase tracking-wider">
          Creator
        </span>
      </div>

      {/* Segmented Navigation */}
      <div className="grid grid-cols-4 p-1 rounded-2xl bg-white/[0.04] border border-white/5 text-center">
        {['Overview', 'Music', 'Analytics', 'Profile'].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === tab
                ? 'bg-cyan-500 text-black shadow-sm font-bold'
                : 'text-white/60 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'Overview' && (
        <div className="space-y-4 animate-fade-in">
          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 text-center">
              <p className="text-lg font-black text-white">{uploads.length}</p>
              <p className="text-[10px] text-white/40 uppercase font-semibold mt-0.5">Releases</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 text-center">
              <p className="text-lg font-black text-cyan-400">{creatorData?.stats?.plays ?? 0}</p>
              <p className="text-[10px] text-white/40 uppercase font-semibold mt-0.5">Plays</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 text-center">
              <p className="text-lg font-black text-white">{creatorData?.stats?.followers ?? 0}</p>
              <p className="text-[10px] text-white/40 uppercase font-semibold mt-0.5">Followers</p>
            </div>
          </div>

          {/* Quick Upload CTA */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('Music');
              setMusicSubTab('Upload');
            }}
            className="w-full p-4 rounded-2xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-between text-left active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500 text-black flex items-center justify-center font-bold">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Upload New Track</p>
                <p className="text-[11px] text-white/60">Publish a high-res master recording</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-cyan-400" />
          </button>

          {/* Recent Releases */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider px-1">
              Recent Releases
            </h3>
            {uploads.length === 0 ? (
              <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                <Music2 className="w-8 h-8 text-white/20 mx-auto mb-2" />
                <p className="text-xs font-medium text-white/60">No releases yet</p>
                <p className="text-[11px] text-white/30 mt-0.5">Tap Upload above to release your first song</p>
              </div>
            ) : (
              <div className="space-y-2">
                {uploads.slice(0, 4).map((item, idx) => (
                  <div
                    key={item.title || idx}
                    className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-cyan-400 shrink-0">
                        <Music2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{item.title}</p>
                        <p className="text-[10px] text-white/40">{item.genre || 'Original'}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
                      {item.status || 'Published'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MUSIC TAB */}
      {activeTab === 'Music' && (
        <div className="space-y-4 animate-fade-in">
          {/* Subtabs */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMusicSubTab('Releases')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                musicSubTab === 'Releases'
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'bg-white/[0.02] border-white/5 text-white/50'
              }`}
            >
              Releases ({uploads.length})
            </button>
            <button
              type="button"
              onClick={() => setMusicSubTab('Upload')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                musicSubTab === 'Upload'
                  ? 'bg-cyan-500 text-black border-cyan-500 font-bold'
                  : 'bg-white/[0.02] border-white/5 text-white/50'
              }`}
            >
              + Upload Track
            </button>
          </div>

          {musicSubTab === 'Releases' && (
            <div className="space-y-2">
              {uploads.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                  <UploadCloud className="w-8 h-8 text-white/20 mx-auto mb-2" />
                  <p className="text-xs font-medium text-white/60">No uploaded releases</p>
                  <p className="text-[11px] text-white/30 mt-0.5">Switch to the Upload tab to add music</p>
                </div>
              ) : (
                uploads.map((item, idx) => (
                  <div
                    key={item.title || idx}
                    className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-cyan-400 shrink-0">
                        <Music2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{item.title}</p>
                        <p className="text-[10px] text-white/40">{item.genre || 'Master Audio'}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
                      {item.status || 'Published'}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {musicSubTab === 'Upload' && (
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
              {/* Step indicator */}
              <div className="flex items-center justify-between px-2 text-xs font-bold">
                <span className={uploadStep === 1 ? 'text-cyan-400' : 'text-white/30'}>1. Details</span>
                <span className="text-white/20">→</span>
                <span className={uploadStep === 2 ? 'text-cyan-400' : 'text-white/30'}>2. Files</span>
                <span className="text-white/20">→</span>
                <span className={uploadStep === 3 ? 'text-cyan-400' : 'text-white/30'}>3. Publish</span>
              </div>

              {uploadStep === 1 && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-white/50 block mb-1">Track Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Neon Horizon"
                      value={songTitle}
                      onChange={(e) => setSongTitle(e.target.value)}
                      className="w-full px-3.5 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-base focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-white/50 block mb-1">Genre</label>
                    <select
                      value={songGenre}
                      onChange={(e) => setSongGenre(e.target.value)}
                      className="w-full px-3.5 py-3 rounded-xl bg-[#18181c] border border-white/10 text-white text-base focus:outline-none focus:border-cyan-400"
                    >
                      <option value="Indie">Indie</option>
                      <option value="Electronic">Electronic</option>
                      <option value="Pop">Pop</option>
                      <option value="Rock">Rock</option>
                      <option value="Hip Hop">Hip Hop</option>
                      <option value="Ambient">Ambient</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadStep(2)}
                    disabled={!songTitle.trim()}
                    className="w-full py-3 rounded-xl bg-cyan-500 text-black text-xs font-bold disabled:opacity-40 min-h-[44px]"
                  >
                    Next: Media Files
                  </button>
                </div>
              )}

              {uploadStep === 2 && (
                <div className="space-y-3">
                  <div
                    onClick={() => audioInputRef.current?.click()}
                    className={`p-4 rounded-xl border-2 border-dashed text-center cursor-pointer ${
                      audioFile ? 'border-cyan-400 bg-cyan-500/10' : 'border-white/20 bg-white/[0.02]'
                    }`}
                  >
                    <input
                      type="file"
                      accept="audio/*"
                      ref={audioInputRef}
                      onChange={(e) => setAudioFile(e.target.files[0])}
                      className="hidden"
                    />
                    <UploadCloud className="w-6 h-6 text-cyan-400 mx-auto mb-1" />
                    <p className="text-xs font-semibold text-white truncate">
                      {audioFile ? audioFile.name : 'Select Audio File (MP3, WAV)'}
                    </p>
                    <p className="text-[10px] text-white/40 mt-0.5">Master audio file</p>
                  </div>

                  <div
                    onClick={() => coverInputRef.current?.click()}
                    className={`p-4 rounded-xl border-2 border-dashed text-center cursor-pointer ${
                      coverFile ? 'border-purple-400 bg-purple-500/10' : 'border-white/20 bg-white/[0.02]'
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      ref={coverInputRef}
                      onChange={(e) => setCoverFile(e.target.files[0])}
                      className="hidden"
                    />
                    <UploadCloud className="w-6 h-6 text-purple-400 mx-auto mb-1" />
                    <p className="text-xs font-semibold text-white truncate">
                      {coverFile ? coverFile.name : 'Select Cover Art (JPG, PNG)'}
                    </p>
                    <p className="text-[10px] text-white/40 mt-0.5">Square 1:1 image</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setUploadStep(1)}
                      className="flex-1 py-3 rounded-xl bg-white/5 text-white/70 text-xs font-semibold min-h-[44px]"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadStep(3)}
                      disabled={!audioFile || !coverFile}
                      className="flex-1 py-3 rounded-xl bg-cyan-500 text-black text-xs font-bold disabled:opacity-40 min-h-[44px]"
                    >
                      Review
                    </button>
                  </div>
                </div>
              )}

              {uploadStep === 3 && (
                <div className="space-y-4 text-center">
                  <CheckCircle className="w-10 h-10 text-cyan-400 mx-auto" />
                  <div>
                    <h3 className="text-sm font-bold text-white">Ready for Release</h3>
                    <p className="text-xs text-white/60 mt-0.5">
                      "{songTitle}" ({songGenre})
                    </p>
                  </div>

                  {uploadProgress && (
                    <p className="text-xs font-bold text-cyan-400 animate-pulse">{uploadProgress}</p>
                  )}

                  <button
                    type="button"
                    disabled={isPublishing}
                    onClick={async () => {
                      if (!audioFile || !coverFile) return;
                      setIsPublishing(true);
                      try {
                        setUploadProgress('Uploading audio file...');
                        const audioRef = ref(storage, `tracks/${user.id}/${Date.now()}_${audioFile.name}`);
                        await uploadBytes(audioRef, audioFile);
                        const audioUrl = await getDownloadURL(audioRef);

                        setUploadProgress('Uploading cover art...');
                        const coverRef = ref(storage, `covers/${user.id}/${Date.now()}_${coverFile.name}`);
                        await uploadBytes(coverRef, coverFile);
                        const coverUrl = await getDownloadURL(coverRef);

                        setUploadProgress('Saving track metadata...');
                        const trackData = {
                          title: songTitle || 'Untitled',
                          artist: user?.name || 'Artist',
                          artistId: user?.id,
                          genre: songGenre || 'Indie',
                          audioUrl,
                          cover: coverUrl,
                          createdAt: new Date().toISOString()
                        };

                        await api.tracks.create(trackData);

                        setMusicSubTab('Releases');
                        setUploadStep(1);
                        setSongTitle('');
                        setAudioFile(null);
                        setCoverFile(null);
                        setUploadProgress('');
                      } catch (e) {
                        alert('Upload failed: ' + e.message);
                        setUploadProgress('');
                      } finally {
                        setIsPublishing(false);
                      }
                    }}
                    className="w-full py-3.5 rounded-xl bg-cyan-500 text-black text-xs font-bold disabled:opacity-50 min-h-[44px]"
                  >
                    {isPublishing ? 'Publishing...' : 'Publish Master Track'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ANALYTICS TAB */}
      {activeTab === 'Analytics' && (
        <div className="space-y-4 animate-fade-in">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white">Stream Telemetry</h3>
              <span className="text-[10px] text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded-full">
                7-Day Activity
              </span>
            </div>

            {uploads.length === 0 ? (
              <div className="py-8 text-center">
                <BarChart3 className="w-8 h-8 text-white/20 mx-auto mb-2" />
                <p className="text-xs font-medium text-white/60">No stream data available</p>
                <p className="text-[11px] text-white/30 mt-0.5">Publish tracks to track real-time listener engagement</p>
              </div>
            ) : (
              <div className="h-28 flex items-end justify-between gap-1.5 pt-4">
                {[20, 35, 30, 55, 70, 60, 85].map((val, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-cyan-400/80 rounded-t-md transition-all" style={{ height: `${val}%` }} />
                    <span className="text-[9px] text-white/40">D{idx + 1}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PROFILE TAB */}
      {activeTab === 'Profile' && (
        <div className="space-y-4 animate-fade-in">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center gap-4">
            <Avatar
              user={user}
              className="w-16 h-16 rounded-2xl border-2 border-cyan-400 shrink-0"
            />
            <div className="min-w-0">
              <h3 className="text-base font-bold text-white truncate">{user?.name || 'Artist'}</h3>
              <p className="text-xs text-white/50 truncate">@{user?.username || 'artist'}</p>
              <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
                Verified Creator
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
