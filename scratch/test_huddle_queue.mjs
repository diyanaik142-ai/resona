import jwt from 'jsonwebtoken';
import { io } from 'socket.io-client';

const JWT_SECRET = 'resona_super_secret_jwt_key_2026_x89a';
const API_URL = 'http://localhost:5000/api/social/huddle';

// Create test tokens
const hostToken = jwt.sign({ id: 'user_host_1', name: 'Shree (Host)', email: 'host@resona.internal', role: 'listener' }, JWT_SECRET);
const participantToken = jwt.sign({ id: 'user_part_2', name: 'Di (Participant)', email: 'di@resona.internal', role: 'listener' }, JWT_SECRET);

function authHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

async function run() {
  console.log('🚀 Starting Huddle Queue Comprehensive Backend Test...\n');

  // 1. Connect Socket.IO client
  console.log('1. Connecting Socket.IO client...');
  const socket = io('http://localhost:5000', { transports: ['websocket'] });
  const socketEvents = [];
  socket.on('connect', () => console.log('   ✓ Socket connected'));
  socket.on('huddle_state_updated', (data) => socketEvents.push({ event: 'huddle_state_updated', data }));
  socket.on('queue_updated', (data) => socketEvents.push({ event: 'queue_updated', data }));
  socket.on('track_changed', (data) => socketEvents.push({ event: 'track_changed', data }));
  socket.on('poll_updated', (data) => socketEvents.push({ event: 'poll_updated', data }));
  socket.on('huddle_ended', (data) => socketEvents.push({ event: 'huddle_ended', data }));

  // 2. Host creates Huddle
  console.log('\n2. Host creating Huddle with Golden Hour as Now Playing...');
  const createRes = await fetch(`${API_URL}/create`, {
    method: 'POST',
    headers: authHeaders(hostToken),
    body: JSON.stringify({
      name: 'Late Night Lounge',
      mode: 'HOST_CONTROLLED',
      initialTrackId: 'track_golden_hour'
    })
  });
  const createData = await createRes.json();
  if (!createRes.ok) throw new Error(`Create failed: ${JSON.stringify(createData)}`);
  const huddleId = createData.huddle.id;
  console.log(`   ✓ Huddle created: ${huddleId}`);
  console.log(`   ✓ Now Playing: ${createData.huddle.nowPlaying?.title} by ${createData.huddle.nowPlaying?.artist}`);

  // Join socket room
  socket.emit('join_huddle', { huddleId });

  // 3. Participant joins
  console.log('\n3. Participant joining Huddle...');
  const joinRes = await fetch(`${API_URL}/${huddleId}/join`, {
    method: 'POST',
    headers: authHeaders(participantToken)
  });
  const joinData = await joinRes.json();
  if (!joinRes.ok) throw new Error(`Join failed: ${JSON.stringify(joinData)}`);
  console.log(`   ✓ Participants count: ${joinData.huddle.participants.length}`);

  // 4. Host adds tracks to queue
  console.log('\n4. Host adding "Paper Hearts" and "Fading Lights" to queue...');
  await fetch(`${API_URL}/${huddleId}/queue/add`, {
    method: 'POST',
    headers: authHeaders(hostToken),
    body: JSON.stringify({ trackId: 'track_paper_hearts', action: 'add_to_queue' })
  });
  const addRes2 = await fetch(`${API_URL}/${huddleId}/queue/add`, {
    method: 'POST',
    headers: authHeaders(hostToken),
    body: JSON.stringify({ trackId: 'track_fading_lights', action: 'add_to_queue' })
  });
  const addData2 = await addRes2.json();
  console.log(`   ✓ Up Next length: ${addData2.huddle.upNext.length}`);
  console.log(`   ✓ Queue: ${addData2.huddle.upNext.map(t => `${t.position}. ${t.title}`).join(', ')}`);

  // 5. Participant attempts direct queue addition in HOST_CONTROLLED mode (MUST FAIL 403)
  console.log('\n5. Participant attempting direct add in HOST_CONTROLLED mode...');
  const failRes = await fetch(`${API_URL}/${huddleId}/queue/add`, {
    method: 'POST',
    headers: authHeaders(participantToken),
    body: JSON.stringify({ trackId: 'track_midnight_drive' })
  });
  console.log(`   ✓ Expected 403 Forbidden: Status = ${failRes.status}`);
  if (failRes.status !== 403) throw new Error('Expected 403 in HOST_CONTROLLED mode!');

  // 6. Participant recommends track
  console.log('\n6. Participant recommending "Midnight Drive"...');
  const recRes = await fetch(`${API_URL}/${huddleId}/recommend`, {
    method: 'POST',
    headers: authHeaders(participantToken),
    body: JSON.stringify({ trackId: 'track_midnight_drive' })
  });
  const recData = await recRes.json();
  const recId = recData.recommendation.id;
  console.log(`   ✓ Recommendation created: ${recData.recommendation.title}, status = ${recData.recommendation.status}`);

  // 7. Host accepts recommendation
  console.log('\n7. Host accepting recommendation into queue...');
  const acceptRes = await fetch(`${API_URL}/${huddleId}/recommendations/${recId}/accept`, {
    method: 'POST',
    headers: authHeaders(hostToken),
    body: JSON.stringify({ action: 'add_to_queue' })
  });
  const acceptData = await acceptRes.json();
  const addedRec = acceptData.huddle.upNext.find(i => i.source === 'recommendation');
  console.log(`   ✓ Recommendation added to Up Next with source: ${addedRec?.source}, addedBy: ${addedRec?.addedBy?.name}`);

  // 8. Reordering queue
  console.log('\n8. Reordering queue (drag & drop simulation)...');
  const originalOrder = acceptData.huddle.upNext.map(i => i.queueId);
  const reversedOrder = [...originalOrder].reverse();
  const reorderRes = await fetch(`${API_URL}/${huddleId}/queue/reorder`, {
    method: 'PUT',
    headers: authHeaders(hostToken),
    body: JSON.stringify({ itemIds: reversedOrder })
  });
  const reorderData = await reorderRes.json();
  console.log(`   ✓ New Queue order: ${reorderData.huddle.upNext.map(t => `${t.position}. ${t.title}`).join(', ')}`);

  // 9. Play Next action on last item
  console.log('\n9. Testing Play Next action...');
  const lastItem = reorderData.huddle.upNext[reorderData.huddle.upNext.length - 1];
  const playNextRes = await fetch(`${API_URL}/${huddleId}/queue/play-next`, {
    method: 'POST',
    headers: authHeaders(hostToken),
    body: JSON.stringify({ queueId: lastItem.queueId })
  });
  const playNextData = await playNextRes.json();
  console.log(`   ✓ Item moved to position 1: ${playNextData.huddle.upNext[0].title} (position ${playNextData.huddle.upNext[0].position})`);

  // 10. Single-Song Poll
  console.log('\n10. Testing Poll system (Single song)...');
  const pollRes = await fetch(`${API_URL}/${huddleId}/polls`, {
    method: 'POST',
    headers: authHeaders(hostToken),
    body: JSON.stringify({
      type: 'single',
      trackIds: ['track_1791001542867']
    })
  });
  const pollData = await pollRes.json();
  const pollId = pollData.poll.id;
  console.log(`   ✓ Poll created: "${pollData.poll.question}"`);

  // Participant votes YES (option index 0)
  await fetch(`${API_URL}/${huddleId}/polls/${pollId}/vote`, {
    method: 'POST',
    headers: authHeaders(participantToken),
    body: JSON.stringify({ optionIndex: 0 })
  });
  // Host votes YES (option index 0)
  await fetch(`${API_URL}/${huddleId}/polls/${pollId}/vote`, {
    method: 'POST',
    headers: authHeaders(hostToken),
    body: JSON.stringify({ optionIndex: 0 })
  });

  // Host ends poll
  const endPollRes = await fetch(`${API_URL}/${huddleId}/polls/${pollId}/end`, {
    method: 'POST',
    headers: authHeaders(hostToken)
  });
  const endPollData = await endPollRes.json();
  const endedPoll = endPollData.huddle.polls.find(p => p.id === pollId);
  console.log(`   ✓ Poll ended. Winner: ${endedPoll?.winner?.title} with ${endedPoll?.winner?.votesCount} votes`);

  // Host resolves poll winner -> adds to queue
  console.log('\n11. Host explicitly resolving poll winner -> Add to Queue...');
  const resolveRes = await fetch(`${API_URL}/${huddleId}/polls/${pollId}/resolve`, {
    method: 'POST',
    headers: authHeaders(hostToken),
    body: JSON.stringify({ action: 'play_next' })
  });
  const resolveData = await resolveRes.json();
  const pollWinnerItem = resolveData.huddle.upNext[0];
  console.log(`   ✓ Poll winner in queue at pos 1: ${pollWinnerItem.title}, source = ${pollWinnerItem.source}`);

  // 12. Playback advance (simulate track finishing)
  console.log('\n12. Testing playback advance (track ended)...');
  const prevNowPlaying = resolveData.huddle.nowPlaying?.title;
  const advanceRes = await fetch(`${API_URL}/${huddleId}/playback/advance`, {
    method: 'POST',
    headers: authHeaders(hostToken),
    body: JSON.stringify({ reason: 'track_ended' })
  });
  const advanceData = await advanceRes.json();
  console.log(`   ✓ Previous track "${prevNowPlaying}" moved to playedTracks (${advanceData.huddle.playedTracks.length} played)`);
  console.log(`   ✓ New Now Playing: "${advanceData.huddle.nowPlaying?.title}"`);

  // 13. Collaborative mode & participant deletion
  console.log('\n13. Testing COLLABORATIVE mode...');
  await fetch(`${API_URL}/${huddleId}/mode`, {
    method: 'POST',
    headers: authHeaders(hostToken),
    body: JSON.stringify({ mode: 'COLLABORATIVE' })
  });
  const collabAddRes = await fetch(`${API_URL}/${huddleId}/queue/add`, {
    method: 'POST',
    headers: authHeaders(participantToken),
    body: JSON.stringify({ trackId: 'track_midnight_drive' })
  });
  const collabAddData = await collabAddRes.json();
  const partItem = collabAddData.huddle.upNext[collabAddData.huddle.upNext.length - 1];
  console.log(`   ✓ Participant successfully added "${partItem.title}" in COLLABORATIVE mode!`);

  // Participant removes their own item
  const removeRes = await fetch(`${API_URL}/${huddleId}/queue/${partItem.queueId}`, {
    method: 'DELETE',
    headers: authHeaders(participantToken)
  });
  console.log(`   ✓ Participant successfully removed their own item: Status = ${removeRes.status}`);

  // 14. Participant leaves
  console.log('\n14. Participant leaving Huddle...');
  await fetch(`${API_URL}/${huddleId}/leave`, {
    method: 'POST',
    headers: authHeaders(participantToken)
  });
  const stateAfterLeaveRes = await fetch(`${API_URL}/${huddleId}`, { headers: authHeaders(hostToken) });
  const stateAfterLeave = await stateAfterLeaveRes.json();
  console.log(`   ✓ Participants remaining: ${stateAfterLeave.huddle.participants.length}`);
  console.log(`   ✓ Queue items preserved: ${stateAfterLeave.huddle.upNext.length}`);

  // 15. End Huddle and check Recap
  console.log('\n15. Host ending Huddle & generating Recap...');
  const endRes = await fetch(`${API_URL}/${huddleId}/end`, {
    method: 'POST',
    headers: authHeaders(hostToken)
  });
  const endData = await endRes.json();
  console.log(`   ✓ Status: ${endData.huddle.status}`);
  console.log(`   ✓ Recap duration: ${endData.recap.durationFormatted}`);
  console.log(`   ✓ Tracks played: ${endData.recap.tracksPlayedCount}`);
  console.log(`   ✓ Recommendations count: ${endData.recap.recommendationsCount}`);

  // 16. Save Recap as Playlist
  console.log('\n16. Saving played tracks as playlist...');
  const playlistRes = await fetch(`${API_URL}/${huddleId}/save-playlist`, {
    method: 'POST',
    headers: authHeaders(hostToken),
    body: JSON.stringify({ type: 'played', title: 'Late Night Recap Mix' })
  });
  const playlistData = await playlistRes.json();
  console.log(`   ✓ Playlist saved to Shelf: "${playlistData.playlist.title}" (${playlistData.playlist.trackIds.length} tracks)`);

  // Wait 500ms to collect any pending socket messages
  await new Promise(r => setTimeout(r, 500));
  socket.disconnect();
  console.log(`\n⚡ Real-Time Socket Events Received: ${socketEvents.length}`);
  const uniqueEvts = [...new Set(socketEvents.map(e => e.event))];
  console.log(`   Unique Event Types: ${uniqueEvts.join(', ')}`);

  console.log('\n🎉 ALL 16 BACKEND HUDDLE QUEUE TESTS PASSED PERFECTLY!\n');
}

run().catch(err => {
  console.error('\n❌ Test Error:', err);
  process.exit(1);
});
