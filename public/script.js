const socket = io('/');
const videoGrid = document.getElementById('video-grid');
const messageContainer = document.getElementById('message-container');
const messageForm = document.getElementById('send-container');
const messageInput = document.getElementById('message-input');

// 1. MINTA NAMA USER SAAT PERTAMA BUKA
const userName = prompt('Siapa nama Anda?') || 'User Asing';

// 2. SETUP PEERJS (Kosongkan agar pakai server publik)
const myPeer = new Peer(); 

const myVideo = document.createElement('video');
myVideo.muted = true; // Agar suara kita tidak memantul (echo)
const peers = {};

// 3. AMBIL AKSES KAMERA & MICROPHONE
navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
}).then(stream => {
  addVideoStream(myVideo, stream);

  // Jika ada panggilan masuk dari orang lain
  myPeer.on('call', call => {
    call.answer(stream);
    const video = document.createElement('video');
    call.on('stream', userVideoStream => {
      addVideoStream(video, userVideoStream);
    });
  });

  // Jika ada user lain yang terhubung
  socket.on('user-connected', (userId, otherUserName) => {
    console.log('User baru bergabung: ' + otherUserName);
    connectToNewUser(userId, stream);
  });
});

// 4. TERIMA RIWAYAT CHAT DARI MONGODB (Ini yang membuat chat tidak hilang)
socket.on('load-messages', oldMessages => {
  oldMessages.forEach(data => {
    appendMessage(data.userName, data.message);
  });
});

// 5. TERIMA CHAT BARU DARI SERVER
socket.on('chat-message', data => {
  appendMessage(data.userName, data.message);
});

// 6. LOGIKA KIRIM CHAT
messageForm.addEventListener('submit', e => {
  e.preventDefault();
  const message = messageInput.value;
  if (message !== "") {
    socket.emit('send-chat-message', message);
    messageInput.value = '';
  }
});

// 7. HUBUNGKAN KE ROOM SAAT PEER SIAP
myPeer.on('open', id => {
  socket.emit('join-room', ROOM_ID, id, userName);
});

socket.on('user-disconnected', userId => {
  if (peers[userId]) peers[userId].close();
});

// FUNGSI PEMBANTU
function connectToNewUser(userId, stream) {
  const call = myPeer.call(userId, stream);
  const video = document.createElement('video');
  call.on('stream', userVideoStream => {
    addVideoStream(video, userVideoStream);
  });
  call.on('close', () => {
    video.remove();
  });
  peers[userId] = call;
}

function addVideoStream(video, stream) {
  video.srcObject = stream;
  video.addEventListener('loadedmetadata', () => {
    video.play();
  });
  videoGrid.append(video);
}

function appendMessage(name, message) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message-item');
  messageElement.innerHTML = `<strong>${name}:</strong> ${message}`;
  messageContainer.append(messageElement);
  
  // Auto-scroll ke bawah saat ada pesan baru
  messageContainer.scrollTop = messageContainer.scrollHeight;
}