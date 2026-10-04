import fs from 'fs';

let content = fs.readFileSync('c:/Edit/Resona/src/components/HuddleView.jsx', 'utf8');

const stateToAdd = `
  const [chatMessage, setChatMessage] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [huddle?.history]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    try {
      await api.huddle.sendChatMessage(huddle.id, chatMessage);
      setChatMessage('');
    } catch (err) {
      triggerToast(err.message || 'Failed to send message', true);
    }
  };
`;

content = content.replace('const [notification, setNotification] = useState(null);', 'const [notification, setNotification] = useState(null);' + stateToAdd);

const returnBlockStart = content.indexOf('return (', content.indexOf('const pendingRecs'));
const endMarker = '      {/* ============================================================ */\\n      {/* MODAL 1: REAL CATALOG SEARCH & ADD */}';

let modalIndex = content.indexOf('MODAL 1: REAL CATALOG SEARCH & ADD');
let endOfFileModals = content.lastIndexOf('{/* ============================================================ */}', modalIndex);

if (returnBlockStart === -1 || endOfFileModals === -1) {
  console.log('Could not find markers');
  process.exit(1);
}

const newLayout = `return (
    <div className="flex flex-col md:flex-row gap-4 h-[85vh] max-w-[1400px] mx-auto relative select-none">
      {/* Toast Alert */}
      {notification && (
        <div className={\`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl glass-panel border shadow-2xl flex items-center gap-2.5 animate-bounce \${
          notification.isError ? 'border-rose-500/60 bg-rose-950/90 text-rose-200' : 'border-teal-400/60 bg-slate-900/90 text-teal-200'
        }\`}>
          {notification.isError ? <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" /> : <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />}
          <p className="text-xs font-bold leading-tight">{notification.msg}</p>
        </div>
      )}

      {/* MAIN COLUMN: CHAT & HEADER */}
      <div className="flex-1 flex flex-col glass-panel rounded-3xl border border-white/10 overflow-hidden shadow-2xl bg-slate-900/50 backdrop-blur-md">
        
        {/* HEADER */}
        <div className="p-4 md:p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-black/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-400 shadow-inner">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">{huddle.name}</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300">
                  {huddle.mode === 'COLLABORATIVE' ? 'Collaborative' : 'Host Controlled'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Hosted by <span className="text-white font-semibold">{huddle.hostName}</span> ·{' '}
                <button
                  onClick={() => setShowParticipantsModal(true)}
                  className="hover:text-teal-300 underline font-medium transition"
                >
                  {huddle.participants?.length || 1} listener{huddle.participants?.length === 1 ? '' : 's'}
                </button>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isHost && (
              <button
                onClick={handleToggleMode}
                title="Toggle queue control mode"
                className="py-1.5 px-3 rounded-xl glass-card border border-white/10 hover:border-teal-500/40 text-[11px] font-semibold text-slate-300 flex items-center gap-1.5 transition"
              >
                <Shield className="w-3.5 h-3.5 text-teal-400" />
                <span>{huddle.mode === 'COLLABORATIVE' ? 'Switch to Host-Only' : 'Enable Collab'}</span>
              </button>
            )}

            {isHost ? (
              <button
                onClick={handleEndHuddle}
                className="py-1.5 px-4 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[11px] font-bold transition flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" /> End Huddle
              </button>
            ) : (
              <button
                onClick={handleLeaveHuddle}
                className="py-1.5 px-4 rounded-xl glass-card text-slate-300 border border-white/10 hover:bg-white/10 text-[11px] font-semibold transition flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" /> Leave
              </button>
            )}

            {onClose && (
              <button
                onClick={onClose}
                className="py-1.5 px-3 rounded-xl glass-card text-slate-400 hover:text-white transition text-[11px] font-semibold ml-1"
              >
                Minimize
              </button>
            )}
          </div>
        </div>

        {/* CHAT LOG */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
          {huddle.history && huddle.history.length > 0 ? (
            huddle.history.map((hist) => {
              const isChat = hist.type === 'chat';
              const isMe = hist.userId === user?.id;
              
              if (isChat) {
                return (
                  <div key={hist.id} className={\`flex flex-col \${isMe ? 'items-end' : 'items-start'} gap-1 max-w-[85%] \${isMe ? 'ml-auto' : ''}\`}>
                    <span className="text-[10px] font-semibold text-slate-400 px-1">
                      {hist.userName} <span className="font-normal opacity-50 ml-1">{hist.timeStr}</span>
                    </span>
                    <div className={\`px-4 py-2.5 rounded-2xl text-sm \${isMe ? 'bg-teal-500/20 text-teal-100 rounded-br-sm' : 'bg-white/5 text-slate-200 border border-white/5 rounded-bl-sm'}\`}>
                      {hist.text}
                    </div>
                  </div>
                );
              }

              // System Event
              return (
                <div key={hist.id} className="flex justify-center my-4">
                  <div className="px-3 py-1 rounded-full glass-card border border-white/5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                    <span className="text-[10px] font-medium text-slate-400">{hist.text}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="h-full flex flex-col items-center justify-center space-y-3 opacity-50">
              <Users className="w-12 h-12 text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">Welcome to the Huddle</p>
              <p className="text-xs text-slate-500">Say hi to start the conversation!</p>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* CHAT INPUT */}
        <form onSubmit={handleSendMessage} className="p-4 bg-black/40 border-t border-white/5 shrink-0">
          <div className="relative flex items-center">
            <input
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder="Say something to the room..."
              className="w-full bg-slate-900/60 border border-white/10 rounded-full py-3 pl-4 pr-12 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/50 transition"
            />
            <button
              type="submit"
              disabled={!chatMessage.trim()}
              className="absolute right-2 p-2 rounded-full bg-teal-500 hover:bg-teal-400 disabled:opacity-50 disabled:hover:bg-teal-500 text-slate-950 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          </div>
        </form>
      </div>

      {/* SIDEBAR COLUMN: PLAYBACK & CONTROLS */}
      <div className="w-full md:w-80 lg:w-96 flex flex-col gap-4 shrink-0">
        
        {/* NOW PLAYING CARD */}
        <div className="p-4 rounded-3xl glass-panel border border-teal-500/20 bg-gradient-to-br from-teal-950/30 to-slate-900/50 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-teal-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" /> Now Playing
            </span>
            {isHost && huddle.nowPlaying && (
              <button
                onClick={handleAdvancePlayback}
                title="Skip to next track"
                className="py-1 px-2 rounded-lg hover:bg-white/10 text-[10px] font-bold text-slate-300 flex items-center gap-1 transition"
              >
                Skip <FastForward className="w-3 h-3" />
              </button>
            )}
          </div>

          {huddle.nowPlaying ? (
            <div className="flex gap-3">
              <div className="relative shrink-0">
                <img
                  src={huddle.nowPlaying.artwork || huddle.nowPlaying.cover}
                  alt={huddle.nowPlaying.title}
                  className="w-16 h-16 rounded-xl object-cover shadow-lg border border-white/10"
                />
              </div>
              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <h3 className="font-bold text-white text-sm truncate leading-tight">
                  {huddle.nowPlaying.title}
                </h3>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  {huddle.nowPlaying.artist}
                </p>
                <div className="mt-1.5">
                  <span className="text-[9px] text-teal-300 font-medium bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/10">
                    {huddle.nowPlaying.source === 'poll_winner'
                      ? 'Poll Winner 🏆'
                      : huddle.nowPlaying.source === 'recommendation'
                      ? \`Rec by \${huddle.nowPlaying.addedBy?.name || 'Listener'}\`
                      : \`Added by \${huddle.nowPlaying.addedBy?.name || 'Host'}\`}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-3 text-center opacity-70">
              <Music className="w-6 h-6 text-slate-500 mx-auto mb-1" />
              <p className="text-[11px] font-semibold text-slate-300">Nothing playing</p>
            </div>
          )}
        </div>

        {/* SIDEBAR TABS & CONTENT */}
        <div className="flex-1 flex flex-col glass-panel rounded-3xl border border-white/10 overflow-hidden bg-slate-900/30">
          <div className="flex p-2 gap-1 border-b border-white/5 bg-black/10 shrink-0">
            <button
              onClick={() => setActiveTab('queue')}
              className={\`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 \${
                activeTab === 'queue' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-300'
              }\`}
            >
              <ListMusic className="w-3.5 h-3.5" /> Queue
            </button>
            <button
              onClick={() => setActiveTab('recommendations')}
              className={\`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 relative \${
                activeTab === 'recommendations' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-300'
              }\`}
            >
              <Sparkles className="w-3.5 h-3.5" /> Recs
              {pendingRecs.length > 0 && (
                <span className="absolute top-0 right-1 w-2.5 h-2.5 rounded-full bg-pink-500" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('polls')}
              className={\`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 relative \${
                activeTab === 'polls' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-300'
              }\`}
            >
              <Vote className="w-3.5 h-3.5" /> Polls
              {activePolls.length > 0 && (
                <span className="absolute top-0 right-1 w-2.5 h-2.5 rounded-full bg-purple-500" />
              )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {/* QUEUE TAB */}
            {activeTab === 'queue' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Up Next ({huddle.upNext?.length || 0})</span>
                  <div className="flex gap-1.5">
                    {(isHost || isCollaborative) && (
                      <button
                        onClick={() => {
                          setCatalogAction('add_to_queue');
                          setShowCatalogSearch(true);
                        }}
                        className="py-1 px-2 rounded-lg glass-button-primary text-[10px] font-bold flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3 text-slate-950" /> Add
                      </button>
                    )}
                    {isHost && (
                      <button
                        onClick={() => {
                          setCatalogAction('play_next');
                          setShowCatalogSearch(true);
                        }}
                        className="py-1 px-2 rounded-lg glass-card text-teal-300 border border-teal-500/20 text-[10px] font-semibold hover:bg-white/10"
                      >
                        Play Next
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {huddle.upNext && huddle.upNext.length > 0 ? (
                    huddle.upNext.map((item, index) => {
                      const isOwner = item.addedBy?.id === user?.id;
                      const canDelete = isHost || (isCollaborative && isOwner);
                      const isDragging = draggedIndex === index;
                      const isOver = dragOverIndex === index;
                      return (
                        <div
                          key={item.queueId || item.trackId + index}
                          draggable={isHost}
                          onDragStart={(e) => onDragStart(e, index)}
                          onDragOver={(e) => onDragOver(e, index)}
                          onDrop={(e) => onDrop(e, index)}
                          onDragEnd={onDragEnd}
                          className={\`group p-2 rounded-xl glass-card border transition flex items-center gap-2.5 \${
                            isDragging ? 'opacity-40 border-teal-400' : 'border-white/5 hover:border-white/20'
                          } \${isOver ? 'border-t-2 border-t-teal-400' : ''}\`}
                        >
                          {isHost && (
                            <GripVertical className="w-3 h-3 text-slate-600 cursor-grab active:cursor-grabbing hover:text-teal-400 shrink-0" />
                          )}
                          <img src={item.artwork || item.cover} alt={item.title} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-white text-[11px] truncate leading-tight">{item.title}</p>
                            <p className="text-[9px] text-slate-400 truncate">{item.artist}</p>
                          </div>
                          
                          <div className="relative shrink-0">
                            <button
                              onClick={() => setActiveMenuQueueId(activeMenuQueueId === item.queueId ? null : item.queueId)}
                              className="p-1 rounded-md hover:bg-white/10 text-slate-400"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                            {activeMenuQueueId === item.queueId && (
                              <div className="absolute right-0 top-6 w-36 glass-panel border border-white/20 rounded-xl p-1.5 shadow-2xl z-30 bg-slate-900">
                                {isHost && (
                                  <>
                                    <button onClick={() => handlePlayNext(item.queueId, item.title)} className="w-full py-1.5 px-2 rounded-lg hover:bg-white/10 text-left text-[10px] text-teal-300">Play Next</button>
                                    <button onClick={() => {setActiveMenuQueueId(null); handleReorder(index, 0);}} className="w-full py-1.5 px-2 rounded-lg hover:bg-white/10 text-left text-[10px] text-slate-200">Move to Top</button>
                                  </>
                                )}
                                {canDelete && (
                                  <button onClick={() => handleRemoveQueueItem(item.queueId, item.title)} className="w-full py-1.5 px-2 rounded-lg hover:bg-rose-500/20 text-left text-[10px] text-rose-400 mt-1">Remove</button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-[11px] text-slate-500">Queue is empty</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* RECS TAB */}
            {activeTab === 'recommendations' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Recommendations</span>
                  <button onClick={() => { setCatalogAction('recommend'); setShowCatalogSearch(true); }} className="py-1 px-2 rounded-lg glass-button-primary text-[10px] font-bold">
                    Recommend
                  </button>
                </div>

                <div className="space-y-2">
                  {huddle.recommendations && huddle.recommendations.length > 0 ? (
                    huddle.recommendations.map(rec => (
                      <div key={rec.id} className="p-2.5 rounded-xl glass-card border border-white/5 space-y-2">
                        <div className="flex items-center gap-2.5">
                          <img src={rec.artwork || rec.cover} className="w-8 h-8 rounded-lg object-cover" />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-white text-[11px] truncate">{rec.title}</p>
                            <p className="text-[9px] text-teal-400 truncate">by {rec.recommender?.name}</p>
                          </div>
                        </div>
                        {rec.status === 'pending' && isHost && (
                          <div className="flex gap-1.5 pt-1 border-t border-white/5">
                            <button onClick={() => handleAcceptRecommendation(rec.id, rec.title, 'add_to_queue')} className="flex-1 py-1 rounded bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 text-[9px] font-bold transition">Accept</button>
                            <button onClick={() => handleDismissRecommendation(rec.id)} className="flex-1 py-1 rounded glass-card hover:bg-white/5 text-rose-300 text-[9px] font-bold transition">Dismiss</button>
                          </div>
                        )}
                        {rec.status !== 'pending' && (
                          <div className="pt-1">
                            <span className={\`text-[9px] font-bold px-1.5 py-0.5 rounded \${rec.status === 'accepted' ? 'bg-teal-500/20 text-teal-300' : 'bg-white/5 text-slate-500'}\`}>
                              {rec.status === 'accepted' ? 'Accepted' : 'Dismissed'}
                            </span>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-[11px] text-slate-500">No recommendations yet.</div>
                  )}
                </div>
              </div>
            )}

            {/* POLLS TAB */}
            {activeTab === 'polls' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Polls</span>
                  {isHost && (
                    <button onClick={() => { setSelectedPollTracks([]); setPollQuestion(''); setShowCreatePollModal(true); }} className="py-1 px-2 rounded-lg glass-button-primary text-[10px] font-bold">
                      Create Poll
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {huddle.polls && huddle.polls.length > 0 ? (
                    huddle.polls.map(poll => (
                      <div key={poll.id} className="p-3 rounded-xl glass-card border border-white/5 space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <p className="text-[11px] font-bold text-white leading-tight">{poll.question}</p>
                          {poll.status === 'active' && isHost && (
                            <button onClick={() => handleEndPoll(poll.id)} className="text-[9px] text-rose-400 font-bold shrink-0 hover:underline">End</button>
                          )}
                        </div>
                        <div className="space-y-1">
                          {poll.options.map((opt, idx) => (
                            <div key={idx} onClick={() => poll.status === 'active' && handleVote(poll.id, idx)} className={\`relative p-1.5 rounded-lg border \${poll.userVoteIndex === idx ? 'border-teal-400 bg-teal-500/10' : 'border-white/5 cursor-pointer hover:bg-white/5'} overflow-hidden flex items-center justify-between\`}>
                              <div className="absolute left-0 top-0 bottom-0 bg-teal-500/15 pointer-events-none transition-all" style={{ width: \`\${opt.percentage}%\` }} />
                              <span className="text-[10px] text-white z-10 truncate pl-1">{opt.text}</span>
                              <span className="text-[9px] text-teal-300 font-bold z-10 pr-1">{opt.percentage}%</span>
                            </div>
                          ))}
                        </div>
                        {poll.status === 'ended' && poll.winner && !poll.actionTaken && isHost && (
                          <div className="pt-2 border-t border-white/5 flex gap-1.5">
                            <button onClick={() => handleResolvePoll(poll.id, 'play_next')} className="flex-1 py-1 rounded bg-teal-500/20 hover:bg-teal-500/30 transition text-teal-300 text-[9px] font-bold">Play Next</button>
                            <button onClick={() => handleResolvePoll(poll.id, 'add_to_queue')} className="flex-1 py-1 rounded glass-card hover:bg-white/5 transition text-slate-300 text-[9px] font-bold">Add Queue</button>
                          </div>
                        )}
                        {poll.status === 'ended' && poll.actionTaken && (
                           <div className="text-[9px] text-teal-400 font-medium">Added to Queue: {poll.actionTaken === 'play_next' ? 'Play Next' : 'Up Next'}</div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-[11px] text-slate-500">No active polls.</div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
      
      `;

const finalContent = content.substring(0, returnBlockStart) + newLayout + content.substring(endOfFileModals);
fs.writeFileSync('c:/Edit/Resona/src/components/HuddleView.jsx', finalContent);
console.log('Successfully sliced layout!');
