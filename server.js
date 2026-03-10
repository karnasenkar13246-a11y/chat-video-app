const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// 1. KONEKSI DATABASE
const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI).then(() => console.log("Terhubung ke MongoDB"));

// 2. SCHEMA DATABASE
const chatSchema = new mongoose.Schema({
  roomId: String, userName: String, message: String, timestamp: { type: Date, default: Date.now }
});
const Chat = mongoose.model('Chat', chatSchema);

const roomSchema = new mongoose.Schema({
  roomId: { type: String, unique: true }, // Ini adalah Nama Grup
  password: String
});
const Room = mongoose.model('Room', roomSchema);

// 3. RUTE HALAMAN LOBBY
app.get('/', (req, res) => {
  res.render('index', { error: null });
});

// 4. MASUK ATAU BUAT GRUP BERDASARKAN NAMA
app.post('/enter-room', async (req, res) => {
  const { roomName, password } = req.body;
  const formattedRoomName = roomName.trim().toLowerCase().replace(/\s+/g, '-');

  let room = await Room.findOne({ roomId: formattedRoomName });

  if (room) {
    const match = await bcrypt.compare(password, room.password);
    if (match) {
      res.render('room', { roomId: formattedRoomName, authorized: true });
    } else {
      res.render('index', { error: 'Password Grup Salah!' });
    }
  } else {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newRoom = new Room({ roomId: formattedRoomName, password: hashedPassword });
    await newRoom.save();
    res.render('room', { roomId: formattedRoomName, authorized: true });
  }
});

app.get('/:room', async (req, res) => {
  const room = await Room.findOne({ roomId: req.params.room });
  if (!room) return res.redirect('/');
  res.render('room', { roomId: req.params.room, authorized: false });
});

app.post('/:room', async (req, res) => {
  const room = await Room.findOne({ roomId: req.params.room });
  if (room) {
    const match = await bcrypt.compare(req.body.password, room.password);
    if (match) {
      res.render('room', { roomId: req.params.room, authorized: true });
    } else {
      res.render('index', { error: 'Password Salah!' });
    }
  } else {
    res.redirect('/');
  }
});

// 5. LOGIKA REAL-TIME
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

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Server jalan di port ${PORT}`));