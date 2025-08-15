// Frontend for 10-person WebRTC mesh
const SIGNALING_URL = window.location.origin; // same server
const socket = io(SIGNALING_URL, { transports: ["websocket"] });

const peers = new Map(); // id -> RTCPeerConnection
const streams = new Map(); // id -> MediaStream
let localStream = null;
let roomId = "", myName = "";

const $ = id => document.getElementById(id);
const log = t => $("log").textContent = t;
const setCount = () => $("count").textContent = 1 + peers.size;

async function ensureMedia(){
  if (localStream) return localStream;
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    $("local").srcObject = localStream;
    return localStream;
  } catch (e) {
    alert("Камера/Микрофон нээж чадсангүй: " + e.message);
    throw e;
  }
}

function addVideoEl(id, label){
  if (document.getElementById("card-"+id)) return;
  const card = document.createElement("div");
  card.className = "card";
  card.id = "card-"+id;
  card.innerHTML = `<div class="pill">${label}</div><video id="vid-${id}" autoplay playsinline></video>`;
  $("videos").appendChild(card);
}
function removeVideoEl(id){ const el = document.getElementById("card-"+id); if (el) el.remove(); }

function createPC(peerId){
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: ["stun:stun.l.google.com:19302"] }
      // TURN хэрэгтэй бол энд нэмж тохируулна.
    ]
  });
  localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
  pc.ontrack = (e) => {
    const v = document.getElementById(`vid-${peerId}`);
    if (v) v.srcObject = e.streams[0];
  };
  pc.onicecandidate = ({ candidate }) => {
    if (candidate) socket.emit("ice-candidate", { to: peerId, candidate });
  };
  peers.set(peerId, pc);
  return pc;
}

async function makeOffer(toId){
  const pc = peers.get(toId) || createPC(toId);
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  socket.emit("offer", { to: toId, sdp: offer });
}

async function handleOffer(from, sdp){
  const pc = peers.get(from) || createPC(from);
  await pc.setRemoteDescription(new RTCSessionDescription(sdp));
  const ans = await pc.createAnswer();
  await pc.setLocalDescription(ans);
  socket.emit("answer", { to: from, sdp: ans });
}
async function handleAnswer(from, sdp){
  const pc = peers.get(from); if (!pc) return;
  await pc.setRemoteDescription(new RTCSessionDescription(sdp));
}
async function handleIce(from, candidate){
  const pc = peers.get(from); if (!pc) return;
  try { await pc.addIceCandidate(candidate); } catch {}
}
function cleanupPeer(id){
  const pc = peers.get(id); if (pc) pc.close();
  peers.delete(id);
  removeVideoEl(id);
  setCount();
}

// UI
$("mic").onclick = () => {
  const t = localStream.getAudioTracks()[0]; if (!t) return;
  t.enabled = !t.enabled;
  $("mic").textContent = t.enabled ? "Mic" : "Mic (off)";
};
$("cam").onclick = () => {
  const t = localStream.getVideoTracks()[0]; if (!t) return;
  t.enabled = !t.enabled;
  $("cam").textContent = t.enabled ? "Cam" : "Cam (off)";
};
$("leave").onclick = () => {
  Array.from(peers.keys()).forEach(cleanupPeer);
  socket.disconnect();
  log("Room-аас гарлаа.");
  $("join").disabled = false;
  $("leave").disabled = true;
  $("mic").disabled = true;
  $("cam").disabled = true;
};

$("join").onclick = async () => {
  myName = $("name").value.trim() || "Guest";
  roomId = $("room").value.trim() || "room";
  await ensureMedia();

  socket.connect();
  socket.emit("join", { roomId, name: myName });
  $("join").disabled = true;
  $("leave").disabled = false;
  $("mic").disabled = false;
  $("cam").disabled = false;
  log(`"${roomId}" өрөөнд нэвтэрлээ.`);
};

// socket events
socket.on("connect", () => {});
socket.on("peers", async ({ peers: ids }) => {
  ids.slice(0,9).forEach(async id => { // +1 = you => 10
    addVideoEl(id, `Peer ${id.slice(0,4)}`);
    await makeOffer(id);
  });
  setCount();
});
socket.on("peer-joined", ({ id, name }) => {
  addVideoEl(id, name || `Peer ${id.slice(0,4)}`);
  setCount();
});
socket.on("offer", ({ from, sdp }) => handleOffer(from, sdp));
socket.on("answer", ({ from, sdp }) => handleAnswer(from, sdp));
socket.on("ice-candidate", ({ from, candidate }) => handleIce(from, candidate));
socket.on("peer-left", ({ id }) => cleanupPeer(id));
socket.on("disconnect", () => log("Signaling салгалаа."));
