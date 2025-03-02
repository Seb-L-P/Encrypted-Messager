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

// Middleware to parse JSON and serve static files from "public" folder
app.use(express.json());
app.use(express.static('public'));

// Connect to MongoDB (Replace with your actual connection string and database name)
mongoose.connect('mongodb+srv://user1:firstuserwoo101@encrypted-messager.6jmql.mongodb.net/YourDatabaseName?retryWrites=true&w=majority')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// API route for user signup
app.post('/signup', async (req, res) => {
  try {
    const { username, password } = req.body;
    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();
    return res.status(201).send('User created');
  } catch (error) {
    return res.status(400).send('Error creating user');
  }
});

// API route for user login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (user && await bcrypt.compare(password, user.password)) {
    return res.status(200).json({ username });
  } else {
    return res.status(401).send('Invalid credentials');
  }
});

// Socket.IO event handling for real-time messaging
io.on('connection', (socket) => {
  console.log('A user connected');

  // When a user successfully logs in, they emit "userConnected"
  socket.on('userConnected', async (username) => {
    socket.username = username;
    // Retrieve the last 50 messages (in ascending order)
    const messages = await Message.find().sort({ timestamp: -1 }).limit(50);
    messages.reverse().forEach((msg) => {
      socket.emit('message', `${msg.username}: ${msg.text}`);
    });
  });

  // When a user sends a new chat message
  socket.on('message', async (msg) => {
    const message = new Message({ username: socket.username, text: msg });
    await message.save();
    io.emit('message', `${socket.username}: ${msg}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Start the server on port 3000
server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
