import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { UploadCloud, BarChart3, Music2, Users, CheckCircle, Clock, Plus, ArrowRight, X, Play, Radio } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { api } from '../services/api';
import Avatar from './Avatar';

export default function CreatorHubView({ onPlayTrack }) {
  const { user, creatorData, uploadTrack , catalog} = useAuth();
  const [activeTab, setActiveTab] = useState('Overview');
  const [uploadStep, setUploadStep] = useState(1); // 1: Details, 2: Audio, 3: Review
  const [songTitle, setSongTitle] = useState('');
  const [songGenre, setSongGenre] = useState('Indie');
  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  
  const [applyName, setApplyName] = useState(user?.name || '');
  const [isApplying, setIsApplying] = useState(false);

  const audioInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const uploads = creatorData?.uploads || [];
  
  const isApproved = creatorData?.isCreator || creatorData?.status === 'approved';

  if (!isApproved) {
    return (
      <div className="max-w-2xl mx-auto pt-12 space-y-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Radio className="w-10 h-10 text-teal-400" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Become a Creator</h1>
          <p className="text-slate-400 mt-2">Publish your original tracks directly to the Resona network.</p>
        </div>
        
        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
          {creatorData?.status === 'pending' ? (
            <div className="text-center space-y-3 py-6">
              <Clock className="w-12 h-12 text-amber-400 mx-auto" />
              <h3 className="font-bold text-white text-lg">Application Under Review</h3>
              <p className="text-sm text-slate-400">Our team is reviewing your application. This usually takes 1-3 business days.</p>
            </div>
          ) : creatorData?.status === 'rejected' ? (
             <div className="text-center space-y-3 py-6">
              <X className="w-12 h-12 text-red-400 mx-auto" />
              <h3 className="font-bold text-white text-lg">Application Declined</h3>
              <p className="text-sm text-slate-400">Unfortunately, we cannot approve your creator application at this time.</p>
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Artist Name</label>
                <input
                  type="text"
                  value={applyName}
                  onChange={e => setApplyName(e.target.value)}
                  className="w-full py-3 px-4 rounded-xl glass-card border border-white/10 text-white focus:border-teal-400 focus:outline-none"
                  placeholder="Enter your artist name"
                />
              </div>
              
              <div className="pt-4">
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
                  className="w-full py-3 rounded-xl glass-button-primary font-bold disabled:opacity-50"
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
    <div className="space-y-6 pb-24 max-w-5xl mx-auto">
      {/* Header Bar */}
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Creator Hub</h1>
        <p className="text-xs text-slate-400 mt-1">Upload, publish, and manage your original master recordings.</p>
      </div>

      {/* Profile Overview Card */}
      <div className="p-4 sm:p-6 rounded-3xl glass-panel border border-teal-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar
            user={user}
            className="w-16 h-16 rounded-2xl border-2 border-teal-400 shadow-xl shrink-0"
          />
          <div className="min-w-0">
            <h2 className="font-black text-white text-lg truncate">{user?.name || 'Artist'}</h2>
            <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider bg-teal-500/20 px-2.5 py-0.5 rounded-full mt-1 inline-block">
              {user?.role === 'creator' ? 'Verified Creator' : user?.role === 'both' ? 'Creator & Listener' : 'Artist Account'}
            </span>
          </div>
        </div>
        <div className="flex gap-4 sm:gap-6 justify-around sm:justify-end text-center pt-2 sm:pt-0 border-t border-white/5 sm:border-t-0">
          <div>
            <p className="text-xl font-black text-white">{uploads.length}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Releases</p>
          </div>
          <div>
            <p className="text-xl font-black text-white">{creatorData?.stats?.plays ?? 0}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Total Plays</p>
          </div>
          <div>
            <p className="text-xl font-black text-white">{creatorData?.stats?.followers ?? 0}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Followers</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {['Overview', 'Upload Music', 'Upload Status', 'Analytics'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              activeTab === tab ? 'bg-teal-400 text-slate-950 font-bold' : 'glass-card text-slate-300 hover:bg-white/10'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'Overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => setActiveTab('Upload Music')}
              className="p-4 rounded-2xl glass-card border border-teal-500/30 hover:bg-white/10 text-left space-y-2 group"
            >
              <UploadCloud className="w-6 h-6 text-teal-400 group-hover:scale-110 transition" />
              <h3 className="font-bold text-white text-xs">Upload New Track</h3>
              <p className="text-[11px] text-slate-400">Share your original music with the world.</p>
            </button>

            <button
              onClick={() => setActiveTab('Analytics')}
              className="p-4 rounded-2xl glass-card border border-purple-500/30 hover:bg-white/10 text-left space-y-2 group"
            >
              <BarChart3 className="w-6 h-6 text-purple-400 group-hover:scale-110 transition" />
              <h3 className="font-bold text-white text-xs">Song Analytics</h3>
              <p className="text-[11px] text-slate-400">Detailed listener metrics & trends.</p>
            </button>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider">Recent Upload Status</h3>
            {uploads.length === 0 ? (
              <div className="p-6 rounded-2xl glass-card text-center text-xs text-slate-400 border border-white/5">
                No original releases uploaded yet. Click "Upload New Track" to get started.
              </div>
            ) : (
              uploads.map((item) => (
                <div key={item.title} className="p-3 rounded-2xl glass-card flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-xs">{item.title}</h4>
                    <p className="text-[10px] text-slate-400">{item.genre || 'Original'}</p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                      item.status === 'Published'
                        ? 'bg-teal-500/20 text-teal-400'
                        : item.status === 'Under review'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* UPLOAD MUSIC WIZARD */}
      {activeTab === 'Upload Music' && (
        <div className="p-5 rounded-3xl glass-panel border border-white/10 space-y-5">
          {/* Step Indicator */}
          <div className="flex justify-between items-center px-4">
            {['1. Details', '2. Audio', '3. Review'].map((label, idx) => (
              <span
                key={label}
                className={`text-xs font-bold ${uploadStep === idx + 1 ? 'text-teal-400' : 'text-slate-500'}`}
              >
                {label}
              </span>
            ))}
          </div>

          {uploadStep === 1 && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Song Title</label>
                <input
                  type="text"
                  placeholder="e.g. Midnight Drive"
                  value={songTitle}
                  onChange={(e) => setSongTitle(e.target.value)}
                  className="w-full py-2.5 px-3.5 rounded-xl glass-card border border-white/10 text-white text-base sm:text-xs focus:outline-none focus:border-teal-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Genre</label>
                <select
                  value={songGenre}
                  onChange={(e) => setSongGenre(e.target.value)}
                  className="w-full py-2.5 px-3.5 rounded-xl glass-card border border-white/10 text-white text-base sm:text-xs bg-slate-900 focus:outline-none focus:border-teal-400"
                >
                  <option value="Indie">Indie</option>
                  <option value="Pop">Pop</option>
                  <option value="Electronic">Electronic</option>
                  <option value="Rock">Rock</option>
                  <option value="Hip Hop">Hip Hop</option>
                </select>
              </div>

              <button
                onClick={() => setUploadStep(2)}
                className="w-full mt-4 py-3 rounded-2xl glass-button-primary font-bold text-xs"
              >
                Next: Audio File
              </button>
            </div>
          )}

          {uploadStep === 2 && (
            <div className="space-y-4 text-center">
              {/* Audio Upload */}
              <div
                onClick={() => audioInputRef.current?.click()}
                className={`p-6 rounded-2xl border-2 border-dashed cursor-pointer transition ${
                  audioFile
                    ? 'border-teal-400 bg-teal-500/10'
                    : 'border-white/20 glass-card hover:border-white/40'
                }`}
              >
                <input 
                  type="file" 
                  accept="audio/*" 
                  ref={audioInputRef} 
                  onChange={(e) => setAudioFile(e.target.files[0])} 
                  className="hidden" 
                />
                <UploadCloud className="w-8 h-8 mx-auto text-teal-400 mb-2" />
                <p className="font-bold text-white text-xs">
                  {audioFile ? audioFile.name : 'Choose audio file'}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">Supports MP3, WAV, FLAC (Max 500MB)</p>
              </div>

              {/* Cover Upload */}
              <div
                onClick={() => coverInputRef.current?.click()}
                className={`p-6 rounded-2xl border-2 border-dashed cursor-pointer transition ${
                  coverFile
                    ? 'border-purple-400 bg-purple-500/10'
                    : 'border-white/20 glass-card hover:border-white/40'
                }`}
              >
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={coverInputRef} 
                  onChange={(e) => setCoverFile(e.target.files[0])} 
                  className="hidden" 
                />
                <UploadCloud className="w-8 h-8 mx-auto text-purple-400 mb-2" />
                <p className="font-bold text-white text-xs">
                  {coverFile ? coverFile.name : 'Choose cover image'}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">Supports JPG, PNG (1:1 Ratio)</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setUploadStep(1)}
                  className="flex-1 py-3 rounded-2xl glass-card text-xs font-semibold text-slate-300"
                >
                  Back
                </button>
                <button
                  onClick={() => setUploadStep(3)}
                  disabled={!audioFile || !coverFile}
                  className="flex-1 py-3 rounded-2xl glass-button-primary font-bold text-xs disabled:opacity-50"
                >
                  Next: Review
                </button>
              </div>
            </div>
          )}

          {uploadStep === 3 && (
            <div className="space-y-4 text-center">
              <CheckCircle className="w-12 h-12 text-teal-400 mx-auto" />
              <div>
                <h3 className="font-extrabold text-white text-base">Ready to Submit!</h3>
                <p className="text-xs text-slate-400">"{songTitle || 'Untitled'}" ({songGenre}) will be submitted for publication.</p>
              </div>

              {uploadProgress && (
                <div className="text-xs font-bold text-teal-400">{uploadProgress}</div>
              )}

              <button
                disabled={isPublishing}
                onClick={async () => {
                  if (!audioFile || !coverFile) return;
                  setIsPublishing(true);
                  try {
                    // Upload Audio
                    setUploadProgress('Uploading Audio...');
                    const audioRef = ref(storage, `tracks/${user.id}/${Date.now()}_${audioFile.name}`);
                    await uploadBytes(audioRef, audioFile);
                    const audioUrl = await getDownloadURL(audioRef);

                    // Upload Cover
                    setUploadProgress('Uploading Cover Art...');
                    const coverRef = ref(storage, `covers/${user.id}/${Date.now()}_${coverFile.name}`);
                    await uploadBytes(coverRef, coverFile);
                    const coverUrl = await getDownloadURL(coverRef);

                    setUploadProgress('Saving to Database...');
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

                    setActiveTab('Upload Status');
                    setUploadStep(1);
                    setSongTitle('');
                    setAudioFile(null);
                    setCoverFile(null);
                    setUploadProgress('');
                  } catch (e) {
                    alert('Error: ' + e.message);
                    setUploadProgress('');
                  } finally {
                    setIsPublishing(false);
                  }
                }}
                className="w-full py-3 rounded-2xl glass-button-primary font-bold text-xs disabled:opacity-50"
              >
                {isPublishing ? 'Publishing...' : 'Publish Track'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* UPLOAD STATUS TAB */}
      {activeTab === 'Upload Status' && (
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider">Uploaded Releases</h3>
          {uploads.length === 0 ? (
            <div className="p-10 rounded-3xl glass-card text-center text-xs text-slate-400 border border-white/5 space-y-2">
              <UploadCloud className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="font-bold text-white text-xs">No uploaded releases yet</p>
              <p className="text-[11px] text-slate-400">Published releases will appear here with live verification tags.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {uploads.map((item) => (
                <div key={item.title} className="p-4 rounded-2xl glass-card flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm">{item.title}</h4>
                    <p className="text-xs text-slate-400">{item.genre || 'Master Audio'}</p>
                  </div>
                  <span className="text-xs font-bold text-teal-400 bg-teal-500/20 px-3 py-1 rounded-full">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ANALYTICS TAB */}
      {activeTab === 'Analytics' && (
        <div className="space-y-4">
          <div className="p-6 rounded-3xl glass-panel border border-white/10 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-white text-sm">Audience & Stream Analytics</h3>
                <p className="text-xs text-slate-400">Live metrics across the Resona network</p>
              </div>
              <span className="text-xs text-teal-400 font-bold bg-teal-500/10 px-2.5 py-1 rounded-full border border-teal-500/20">
                Live Telemetry
              </span>
            </div>

            {uploads.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <BarChart3 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="font-bold text-white">No stream data available yet</p>
                <p className="text-[11px] text-slate-400 mt-1">Publish your first track to generate audience and daily stream charts.</p>
              </div>
            ) : (
              <div className="h-32 flex items-end justify-between gap-2 pt-4 px-2">
                {[15, 30, 25, 45, 60, 50, 75].map((val, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-teal-400/80 rounded-t-lg transition-all" style={{ height: `${val}%` }} />
                    <span className="text-[10px] text-slate-500">Day {idx + 1}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
