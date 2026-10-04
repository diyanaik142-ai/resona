const fs = require('fs');

const path = 'c:/Edit/Resona/src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove viewportMode and clockTime states
content = content.replace(/\/\/ Viewport mode:.*?const \[viewportMode, setViewportMode\] = useState\('mobile'\);/s, '');
content = content.replace(/\/\/ Time for mobile status bar.*?return \(\) => clearInterval\(interval\);\n  \}, \[\]\);/s, '');

// 2. We will replace everything from "return (" (line 268) down to the end of the return statement with our new responsive layout.
const returnStartStr = '  return (\n    <div className="min-h-screen w-full bg-[#06070B] text-slate-100 flex flex-col items-center justify-center relative overflow-hidden select-none font-sans sm:p-4">';
const index = content.indexOf('return (');
if (index === -1) {
  console.log('Could not find return statement');
  process.exit(1);
}

const newReturn = `  return (
    <div className="min-h-screen w-full bg-[#06070B] text-slate-100 flex flex-col relative overflow-hidden select-none font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-[450px] h-[450px] bg-teal-500/10 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none z-0" />

      {/* HTML5 Master Audio Element */}
      <audio
        ref={audioRef}
        src={currentTrack?.audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleTrackEnded}
      />

      {/* DESKTOP HEADER (Hidden on mobile) */}
      <header className="hidden md:flex h-14 w-full glass-panel border-b border-white/5 px-6 items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('pulse')}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-400 to-cyan-500 flex items-center justify-center font-black text-slate-950 text-sm shadow-md shadow-teal-500/20">
              R
            </div>
            <span className="font-black text-base tracking-wider text-white">RESONA</span>
            <span className="text-[10px] text-teal-400 font-mono px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20">
              STUDIO PRO
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('pulse')}
              className="p-1.5 rounded-full glass-card text-slate-400 hover:text-white transition"
              title="Home"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTab('seek')}
              className="p-1.5 rounded-full glass-card text-slate-400 hover:text-white transition"
              title="Explore"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center: Global Search Bar */}
        <div className="max-w-md w-full mx-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Search songs, artists, soundscapes..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activeTab !== 'seek') setActiveTab('seek');
              }}
              className="w-full py-1.5 pl-10 pr-4 rounded-full glass-card border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-400 transition"
            />
          </div>
        </div>

        {/* Right: Authenticated User Profile Chip & Menu */}
        <div className="relative flex items-center gap-3">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-3 p-1.5 pr-3 rounded-full glass-card border border-white/10 hover:border-teal-500/40 transition group"
          >
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
              alt={user?.name}
              className="w-7 h-7 rounded-full object-cover border border-teal-400/80"
            />
            <div className="text-left">
              <p className="text-xs font-bold text-white group-hover:text-teal-300 transition leading-tight">
                {user?.name || 'Listener'}
              </p>
              <p className="text-[10px] text-teal-400 font-mono leading-tight">{user?.tier || 'Resona Free'}</p>
            </div>
          </button>

          {/* User Profile Dropdown Menu */}
          {showProfileMenu && (
            <div className="absolute right-0 top-12 w-64 glass-panel border border-teal-500/30 rounded-2xl p-3 shadow-2xl space-y-2 z-50">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                <p className="text-xs font-bold text-white">{user?.name}</p>
                <p className="text-[10px] text-slate-400">{user?.email}</p>
                <div className="pt-1 flex items-center gap-1.5 text-[10px] text-teal-400 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Bcrypt Encrypted</span>
                </div>
              </div>

              <div className="space-y-1 pt-1 border-t border-white/5 text-xs">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    setActiveTab('settings');
                  }}
                  className="w-full py-2 px-3 rounded-xl hover:bg-white/10 text-left text-slate-200 flex items-center gap-2 transition"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Account & Settings</span>
                </button>

                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    setShowAuthModal(true);
                  }}
                  className="w-full py-2 px-3 rounded-xl hover:bg-white/10 text-left text-teal-300 flex items-center gap-2 transition"
                >
                  <User className="w-4 h-4 text-teal-400" />
                  <span>Switch Account</span>
                </button>

                <button
                  onClick={async () => {
                    setShowProfileMenu(false);
                    await logout();
                  }}
                  className="w-full py-2 px-3 rounded-xl hover:bg-rose-500/10 text-left text-rose-400 flex items-center gap-2 transition font-bold"
                >
                  <LogOut className="w-4 h-4 text-rose-400" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden z-10 relative">
        {/* DESKTOP SIDEBAR (Hidden on mobile) */}
        <aside className="hidden md:flex w-64 glass-panel border-r border-white/5 flex-col justify-between p-4 shrink-0 overflow-y-auto no-scrollbar z-20">
          <div className="space-y-6">
            <div className="space-y-1">
              {[
                { id: 'pulse', label: 'Home / Pulse', icon: Sparkles },
                { id: 'seek', label: 'Explore & Search', icon: Search },
                { id: 'onair', label: 'On Air Studio', icon: Radio },
                { id: 'shelf', label: 'Your Shelf', icon: Library },
                { id: 'tuned', label: 'Tuned For You', icon: Disc },
                { id: 'curated', label: 'Curated Mixes', icon: Flame },
                { id: 'social', label: 'Social & Huddle', icon: User }
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={\`w-full py-2.5 px-3.5 rounded-2xl flex items-center gap-3.5 transition text-xs font-bold \${
                      isActive
                        ? 'bg-teal-400 text-slate-950 shadow-md shadow-teal-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }\`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Library Section */}
            <div className="space-y-2 pt-4 border-t border-white/5">
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Your Library
                </span>
                <button
                  onClick={() => setActiveTab('shelf')}
                  className="p-1 rounded-lg text-slate-400 hover:text-teal-400 transition"
                  title="View Library"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={() => setActiveTab('shelf')}
                className={\`w-full py-2 px-3 rounded-xl flex items-center gap-3 transition text-xs \${
                  activeTab === 'shelf'
                    ? 'text-teal-300 font-bold bg-white/5'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }\`}
              >
                <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white shrink-0">
                  <Heart className="w-3 h-3 fill-white" />
                </div>
                <div className="text-left min-w-0">
                  <p className="font-bold text-white text-xs truncate">Liked Songs</p>
                  <p className="text-[10px] text-slate-500">{shelf?.likedTrackIds?.length || 0} Tracks</p>
                </div>
              </button>

              <div className="space-y-0.5 max-h-40 overflow-y-auto no-scrollbar">
                {shelf?.playlists?.map((pl) => (
                  <button
                    key={pl.id}
                    onClick={() => {
                      setActiveTab('shelf');
                      handlePlayTrack(MOCK_TRACKS[0]);
                    }}
                    className="w-full py-1.5 px-3 rounded-xl flex items-center gap-2.5 text-xs text-slate-400 hover:text-white hover:bg-white/5 transition truncate text-left"
                  >
                    <Library className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{pl.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Creator Studio & Settings */}
          <div className="space-y-2 pt-4 border-t border-white/5">
            <button
              onClick={() => setActiveTab('creator')}
              className={\`w-full p-3 rounded-2xl glass-card flex items-center gap-3 transition text-left border \${
                activeTab === 'creator'
                  ? 'border-purple-400 bg-purple-500/20 text-white'
                  : 'border-purple-500/20 hover:bg-purple-500/10 text-purple-300'
              }\`}
            >
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                <Radio className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white">Creator Studio</p>
                <p className="text-[10px] text-slate-400 truncate">{creatorData?.uploads?.length || 0} Releases</p>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={\`w-full py-2 px-3 rounded-xl flex items-center gap-3 transition text-xs font-semibold \${
                activeTab === 'settings'
                  ? 'bg-teal-400 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }\`}
            >
              <Settings className="w-4 h-4" />
              <span>Settings & Account</span>
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className={\`flex-1 overflow-y-auto relative custom-scrollbar bg-gradient-to-b from-slate-950/60 to-[#08090E] p-4 md:p-8 \${!deviceSeen || !isAuthenticated ? 'pb-4' : activeTab === 'onair' ? 'pb-4' : 'pb-32 md:pb-8'}\`}>
          {renderCurrentView()}
        </main>
      </div>

      {/* MOBILE MINI PLAYER (Hidden on desktop) */}
      {deviceSeen && isAuthenticated && activeTab !== 'onair' && (
        <div
          onClick={() => setActiveTab('onair')}
          className="md:hidden absolute bottom-[66px] left-3 right-3 glass-panel border border-teal-500/40 bg-slate-950/95 backdrop-blur-xl rounded-2xl p-2 flex items-center justify-between shadow-2xl cursor-pointer z-40 hover:border-teal-400 transition group"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <img
              src={currentTrack.cover}
              alt="Cover"
              className="w-10 h-10 rounded-xl object-cover shadow-md group-hover:scale-105 transition"
            />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-white text-xs truncate group-hover:text-teal-300 transition">
                {currentTrack.title}
              </p>
              <p className="text-[10px] text-slate-400 truncate">{currentTrack.artist}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => toggleLikeTrack(currentTrack.id)}
              className={\`p-1.5 rounded-full transition \${
                isCurrentLiked ? 'text-pink-400' : 'text-slate-500 hover:text-white'
              }\`}
              title="Like Track"
            >
              <Heart className={\`w-4 h-4 \${isCurrentLiked ? 'fill-pink-400' : ''}\`} />
            </button>
            <button
              onClick={handleTogglePlay}
              className="w-9 h-9 rounded-full bg-teal-400 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-teal-500/20 hover:scale-105 transition"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-slate-950" />
              ) : (
                <Play className="w-4 h-4 fill-slate-950 ml-0.5" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAV DOCK (Hidden on desktop) */}
      {deviceSeen && isAuthenticated && (
        <nav className="md:hidden absolute bottom-0 left-0 right-0 glass-panel border-t border-white/10 px-2 py-2 flex justify-around items-center z-40 bg-slate-950/95 backdrop-blur-2xl">
          {[
            { id: 'pulse', label: 'Pulse', icon: Sparkles },
            { id: 'seek', label: 'Seek', icon: Search },
            { id: 'onair', label: 'On Air', icon: Radio },
            { id: 'shelf', label: 'Shelf', icon: Library },
            { id: 'social', label: 'Social', icon: Disc },
            { id: 'settings', label: 'Profile', icon: User }
          ].map((nav) => {
            const Icon = nav.icon;
            const isActive = activeTab === nav.id;
            return (
              <button
                key={nav.id}
                onClick={() => setActiveTab(nav.id)}
                className={\`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition \${
                  isActive ? 'text-teal-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
                }\`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] tracking-tight">{nav.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* DESKTOP MASTER AUDIO PLAYER DOCK (Hidden on mobile) */}
      {deviceSeen && isAuthenticated && (
        <footer className="hidden md:flex h-24 w-full glass-panel border-t border-white/10 px-6 items-center justify-between z-40 shrink-0 bg-slate-950/95 backdrop-blur-2xl">
          <div className="flex items-center gap-4 min-w-[220px] max-w-xs">
            <div className="relative group cursor-pointer" onClick={() => setActiveTab('onair')}>
              <img
                src={currentTrack.cover}
                alt={currentTrack.title}
                className="w-14 h-14 rounded-2xl object-cover shadow-xl border border-white/10 group-hover:scale-105 transition"
              />
              <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                <Maximize2 className="w-4 h-4 text-white" />
              </div>
            </div>

            <div className="min-w-0">
              <h4
                onClick={() => setActiveTab('onair')}
                className="font-bold text-white text-sm truncate hover:text-teal-300 cursor-pointer transition"
              >
                {currentTrack.title}
              </h4>
              <p className="text-xs text-slate-400 truncate">{currentTrack.artist}</p>
            </div>

            <button
              onClick={() => toggleLikeTrack(currentTrack.id)}
              className={\`p-2 rounded-full hover:scale-110 transition \${
                isCurrentLiked ? 'text-pink-400' : 'text-slate-500 hover:text-white'
              }\`}
              title="Like Track"
            >
              <Heart className={\`w-4 h-4 \${isCurrentLiked ? 'fill-pink-400' : ''}\`} />
            </button>
          </div>

          <div className="flex flex-col items-center gap-1.5 flex-1 max-w-xl px-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsShuffle(!isShuffle)}
                className={\`p-1.5 transition \${isShuffle ? 'text-teal-400' : 'text-slate-500 hover:text-white'}\`}
                title="Shuffle"
              >
                <Shuffle className="w-4 h-4" />
              </button>

              <button
                onClick={handlePrevTrack}
                className="p-1.5 text-slate-300 hover:text-white hover:scale-110 transition"
                title="Previous"
              >
                <SkipBack className="w-5 h-5 fill-slate-300" />
              </button>

              <button
                onClick={handleTogglePlay}
                className="w-11 h-11 rounded-full bg-teal-400 text-slate-950 flex items-center justify-center shadow-lg shadow-teal-500/20 hover:scale-105 transition"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-slate-950" />
                ) : (
                  <Play className="w-5 h-5 fill-slate-950 ml-0.5" />
                )}
              </button>

              <button
                onClick={handleNextTrack}
                className="p-1.5 text-slate-300 hover:text-white hover:scale-110 transition"
                title="Next"
              >
                <SkipForward className="w-5 h-5 fill-slate-300" />
              </button>

              <button
                onClick={() => setIsLoop(!isLoop)}
                className={\`p-1.5 transition \${isLoop ? 'text-teal-400' : 'text-slate-500 hover:text-white'}\`}
                title="Repeat"
              >
                <Repeat className="w-4 h-4" />
              </button>
            </div>

            <div className="w-full flex items-center gap-3">
              <span className="text-[10px] font-mono text-slate-400 w-8 text-right">
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.5"
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 rounded-lg appearance-none bg-slate-800 accent-teal-400 cursor-pointer"
              />
              <span className="text-[10px] font-mono text-slate-400 w-8">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 min-w-[200px] justify-end">
            {isPlaying && (
              <div className="hidden lg:flex items-center gap-1 h-5">
                <span className="w-1 bg-teal-400 rounded-full animate-bounce h-3" />
                <span className="w-1 bg-teal-300 rounded-full animate-bounce h-5 [animation-delay:0.15s]" />
                <span className="w-1 bg-teal-400 rounded-full animate-bounce h-2 [animation-delay:0.3s]" />
                <span className="w-1 bg-teal-500 rounded-full animate-bounce h-4 [animation-delay:0.45s]" />
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleMute}
                className="text-slate-400 hover:text-white transition"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 h-1.5 rounded-lg appearance-none bg-slate-800 accent-teal-400 cursor-pointer"
              />
            </div>

            <button
              onClick={() => setActiveTab('onair')}
              className={\`p-2 rounded-xl transition \${
                activeTab === 'onair' ? 'text-teal-400 bg-teal-500/20' : 'text-slate-400 hover:text-white glass-card'
              }\`}
              title="Expand Studio Mode"
            >
              <Radio className="w-4 h-4" />
            </button>
          </div>
        </footer>
      )}

      {/* Switch Account Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}
`;

content = content.substring(0, index) + newReturn;

fs.writeFileSync(path, content, 'utf8');
console.log('App.jsx updated successfully');
