const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { v4: uuidV4 } = require('uuid');

app.set('view engine', 'ejs');
app.use(express.static('public'));

// Halaman utama: otomatis membuat ID unik untuk grup baru
app.get('/', (req, res) => {
  res.redirect(`/${uuidV4()}`);
});

// Membuka halaman room berdasarkan ID
app.get('/:room', (req, res) => {
  res.render('room', { roomId: req.params.room });
});

// Logika Socket.io (Real-time Chat & Signaling)
io.on('connection', socket => {
  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId);
    
    // Beri tahu orang lain di grup bahwa ada user baru
    socket.to(roomId).emit('user-connected', userId);

    // Kirim pesan chat
    socket.on('send-chat-message', (message) => {
      io.to(roomId).emit('chat-message', { message: message, userId: userId });
    });

    socket.on('disconnect', () => {
      socket.to(roomId).emit('user-disconnected', userId);
    });
  });
});

// Ubah bagian paling bawah server.js
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});
// Pastikan baris ini ada di server.js
const mongoose = require('mongoose');

// Dan pastikan bagian koneksi ini juga ada
const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI)
  .then(() => console.log("Terhubung ke MongoDB"))
  .catch(err => console.error("Gagal konek ke MongoDB:", err));