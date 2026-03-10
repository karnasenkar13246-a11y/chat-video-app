const socket = io('/');
const videoGrid = document.getElementById('video-grid');
const messageContainer = document.getElementById('message-container');
const messageForm = document.getElementById('send-container');
const messageInput = document.getElementById('message-input');

// 1. LOGIKA NAMA USER (TETAP TERINGAT)
let userName = localStorage.getItem('chat-username');
if (!userName) {
  userName = prompt('Siapa nama Anda?');
  if (!userName || userName.trim() === "") {
    userName = 'User-' + Math.floor(Math.random() * 1000);
  }
  localStorage.setItem('chat-username', userName);
}

// 2. SETUP PEERJS (VIDEO CALL)
const myPeer = new Peer(); 
const myVideo = document.createElement('video');
myVideo.muted = true;
const peers = {};

// 3. AMBIL AKSES KAMERA & MICROPHONE
navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
}).then(stream => {
  addVideoStream(myVideo, stream);

  myPeer.on('call', call => {
    call.answer(stream);
    const video = document.createElement('video');
    call.on('stream', userVideoStream => {
      addVideoStream(video, userVideoStream);
    });
  });

  socket.on('user-connected', (userId, otherUserName) => {
    console.log('User joined: ' + otherUserName);
    connectToNewUser(userId, stream);
  });
}).catch(err => {
  console.error("Gagal akses kamera:", err);
});

// 4. TERIMA RIWAYAT CHAT DARI DATABASE
socket.on('load-messages', oldMessages => {
  // Kosongkan container sebelum memuat untuk menghindari duplikasi
  messageContainer.innerHTML = '';
  oldMessages.forEach(data => {
    appendMessage(data.userName, data.message);
  });
});

// 5. TERIMA CHAT BARU
socket.on('chat-message', data => {
  appendMessage(data.userName, data.message);
});

// 6. LOGIKA KIRIM CHAT
messageForm.addEventListener('submit', e => {
  e.preventDefault();
  const message = messageInput.value;
  if (message.trim() !== "") {
    socket.emit('send-chat-message', message);
    messageInput.value = '';
  }
});

// 7. BERGABUNG KE ROOM SAAT PEER SIAP
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
  call.on('close', () => video.remove());
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
  messageElement.style.marginBottom = "10px";
  messageElement.innerHTML = `<strong style="color: #007bff">${name}:</strong> <span style="color: white">${message}</span>`;
  messageContainer.append(messageElement);
  messageContainer.scrollTop = messageContainer.scrollHeight;
}