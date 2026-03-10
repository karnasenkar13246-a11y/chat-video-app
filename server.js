const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { v4: uuidV4 } = require('uuid');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// KONEKSI MONGODB (Fitur Lama Tetap Ada)
const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI).then(() => console.log("Terhubung ke MongoDB"));

// SCHEMA CHAT & ROOM (Fitur Lama + Fitur Baru)
const chatSchema = new mongoose.Schema({
  roomId: String, userName: String, message: String, timestamp: { type: Date, default: Date.now }
});
const Chat = mongoose.model('Chat', chatSchema);

const roomSchema = new mongoose.Schema({
  roomId: { type: String, unique: true },
  password: String
});
const Room = mongoose.model('Room', roomSchema);

// RUTE HALAMAN LOBBY
app.get('/', (req, res) => {
  res.render('index', { error: null });
});

// BUAT ROOM (Fitur Baru)
app.post('/create-room', async (req, res) => {
  const roomId = uuidV4();
  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  const newRoom = new Room({ roomId, password: hashedPassword });
  await newRoom.save();
  res.redirect(`/${roomId}`);
});

// CEK PASSWORD (Fitur Baru)
app.post('/join-room/:room', async (req, res) => {
  const room = await Room.findOne({ roomId: req.params.room });
  if (room) {
    const match = await bcrypt.compare(req.body.password, room.password);
    if (match) {
      // Jika password benar, tampilkan room dengan status authorized
      res.render('room', { roomId: req.params.room, authorized: true });
    } else {
      res.render('index', { error: 'Password Salah!' });
    }
  } else {
    res.redirect('/');
  }
});

app.get('/:room', async (req, res) => {
  const room = await Room.findOne({ roomId: req.params.room });
  if (!room) return res.redirect('/');
  res.render('room', { roomId: req.params.room, authorized: false });
});

// LOGIKA REAL-TIME (Fitur Lama Tetap Ada & Utuh)
io.on('connection', socket => {
  socket.on('join-room', async (roomId, userId, userName) => {
    socket.join(roomId);
    
    const oldMessages = await Chat.find({ roomId: roomId }).sort({ timestamp: 1 });
    socket.emit('load-messages', oldMessages);

    socket.to(roomId).emit('user-connected', userId, userName);

    socket.on('send-chat-message', async (message) => {
      const newChat = new Chat({ roomId, userName, message });
      await newChat.save();
      io.to(roomId).emit('chat-message', { message, userName });
    });

    socket.on('disconnect', () => {
      socket.to(roomId).emit('user-disconnected', userId);
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));