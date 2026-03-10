const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { v4: uuidV4 } = require('uuid');
const mongoose = require('mongoose');

app.set('view engine', 'ejs');
app.use(express.static('public'));

// 1. KONEKSI DATABASE
const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI)
  .then(() => console.log("Terhubung ke MongoDB"))
  .catch(err => console.error("Gagal konek ke MongoDB:", err));

// 2. STRUKTUR DATA CHAT
const chatSchema = new mongoose.Schema({
  roomId: String,
  userName: String,
  message: String,
  timestamp: { type: Date, default: Date.now }
});
const Chat = mongoose.model('Chat', chatSchema);

app.get('/', (req, res) => {
  res.redirect(`/${uuidV4()}`);
});

app.get('/:room', (req, res) => {
  res.render('room', { roomId: req.params.room });
});

// 3. LOGIKA REAL-TIME (CHAT & VIDEO)
io.on('connection', socket => {
  // Ditambahkan 'async' agar bisa mengambil data dari database
  socket.on('join-room', async (roomId, userId, userName) => {
    socket.join(roomId);
    
    // Ambil chat lama dari database saat user baru join
    const oldMessages = await Chat.find({ roomId: roomId }).sort({ timestamp: 1 });
    socket.emit('load-messages', oldMessages);

    socket.to(roomId).emit('user-connected', userId, userName);

    // Simpan chat baru ke database
    socket.on('send-chat-message', async (message) => {
      const newChat = new Chat({
        roomId: roomId,
        userName: userName,
        message: message
      });
      await newChat.save(); // Ini yang membuat chat tidak hilang

      io.to(roomId).emit('chat-message', { message: message, userName: userName });
    });

    socket.on('disconnect', () => {
      socket.to(roomId).emit('user-disconnected', userId);
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});