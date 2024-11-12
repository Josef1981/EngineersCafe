
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let activeUsers = 0;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Set up SQLite database
const db = new sqlite3.Database('./chat.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the chat database.');
});

// Create messages table if it doesn't exist
db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT,
    image TEXT,
    username TEXT
)`);

// Multer setup for handling file uploads
const upload = multer({
    dest: path.join(__dirname, 'public/uploads'),
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
});

// API route to handle image uploads
app.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    const imagePath = `/uploads/${req.file.filename}`;
    const username = req.body.username || 'Unknown';

    // Save image message to the database
    db.run('INSERT INTO messages (content, image, username) VALUES (?, ?, ?)', [null, imagePath, username], (err) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Failed to save image.');
        }
        io.emit('chat image', { imagePath, username });
        res.status(200).send('Image uploaded successfully.');
    });
});

// Serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle socket.io connections
io.on('connection', (socket) => {
    activeUsers++;
    io.emit('update active users', activeUsers);
    console.log('A user connected');

    // Load existing messages from the database and send to the client
    db.all('SELECT content, image, username FROM messages', [], (err, rows) => {
        if (err) {
            console.error(err.message);
            return;
        }
        socket.emit('load messages', { messages: rows, activeUsers });
    });

    // Handle incoming messages
    socket.on('chat message', ({ msg, username }) => {
        db.run('INSERT INTO messages (content, image, username) VALUES (?, ?, ?)', [msg, null, username], (err) => {
            if (err) {
                console.error(err.message);
                return;
            }
            io.emit('chat message', { msg, username });
        });
    });

    // Handle typing event
    socket.on('typing', (username) => {
        socket.broadcast.emit('typing', username);
    });

    // Handle user joined
    socket.on('user joined', (username) => {
        io.emit('chat message', { msg: `${username} انضم إلى المحادثة`, username: 'System' });
    });

    socket.on('disconnect', () => {
        activeUsers--;
        io.emit('update active users', activeUsers);
        console.log('A user disconnected');
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
