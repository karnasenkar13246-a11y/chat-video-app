const socket = io('/');
const videoGrid = document.getElementById('video-grid');

// Hapus kode Peer lama, ganti dengan ini:
const myPeer = new Peer();

const myVideo = document.createElement('video');
myVideo.muted = true; // Agar suara kita tidak memantul ke speaker sendiri
const peers = {};

// 1. MINTA AKSES KAMERA & MICROPHONE
navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
}).then(stream => {
  addVideoStream(myVideo, stream);

  // Jika ada panggilan masuk dari orang lain, jawab dengan video kita
  myPeer.on('call', call => {
    call.answer(stream);
    const video = document.createElement('video');
    call.on('stream', userVideoStream => {
      addVideoStream(video, userVideoStream);
    });
  });

  // Jika ada user baru yang join (diberitahu oleh Socket.io)
  socket.on('user-connected', userId => {
    connectToNewUser(userId, stream);
  });
});

// 2. LOGIKA CHAT (KIRIM & TERIMA PESAN)
const messageForm = document.getElementById('send-container');
const messageInput = document.getElementById('message-input');
const messageContainer = document.getElementById('message-container');

messageForm.addEventListener('submit', e => {
  e.preventDefault();
  const message = messageInput.value;
  if (message !== "") {
    socket.emit('send-chat-message', message); // Kirim ke server
    messageInput.value = '';
  }
});

socket.on('chat-message', data => {
  const messageElement = document.createElement('div');
  messageElement.innerHTML = `<b>User:</b> ${data.message}`;
  messageContainer.append(messageElement);
  messageContainer.scrollTop = messageContainer.scrollHeight; // Auto scroll ke bawah
});

// 3. LOGIKA KONEKSI PEER
myPeer.on('open', id => {
  socket.emit('join-room', ROOM_ID, id);
});

socket.on('user-disconnected', userId => {
  if (peers[userId]) peers[userId].close();
});

// Fungsi untuk menghubungkan video ke user baru
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

// Fungsi untuk menampilkan video di layar
function addVideoStream(video, stream) {
  video.srcObject = stream;
  video.addEventListener('loadedmetadata', () => {
    video.play();
  });
  videoGrid.append(video);
}