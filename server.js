const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/user');
const Message = require('./models/message');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static('public'));

// Connect to MongoDB (update with Atlas string if using cloud)
mongoose.connect('mongodb+srv://user1:firstuserwoo101@encrypted-messager.6jmql.mongodb.net/?retryWrites=true&w=majority&appName=encrypted-messager')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Authentication routes
app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();
    res.status(201).send('User created');
  } catch (error) {
    res.status(400).send('Error creating user');
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (user && await bcrypt.compare(password, user.password)) {
    res.status(200).json({ username });
  } else {
    res.status(401).send('Invalid credentials');
  }
});

// Socket.IO for real-time messaging
io.on('connection', (socket) => {
  console.log('A user connected');
  socket.on('userConnected', async (username) => {
    socket.username = username;
    const messages = await Message.find().sort({ timestamp: -1 }).limit(50);
    messages.reverse().forEach((msg) => {
      socket.emit('message', `${msg.username}: ${msg.text}`);
    });
  });
  socket.on('message', async (msg) => {
    const message = new Message({ username: socket.username, text: msg });
    await message.save();
    io.emit('message', `${socket.username}: ${msg}`);
  });
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Start the server
server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});