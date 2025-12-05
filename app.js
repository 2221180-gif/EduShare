const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
const http = require('http');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Socket.io setup MUST come before other middleware
const { Server } = require('socket.io');
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/edushare', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('MongoDB connected successfully');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: process.env.SESSION_SECRET || 'edushare_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/', require('./routes/auth'));
app.use('/resources', require('./routes/resources'));
app.use('/communication', require('./routes/communication'));
app.use('/premium', require('./routes/premium'));
app.use('/ai', require('./routes/ai'));
app.use('/ai-assistant', require('./routes/ai-chat'));
app.use('/gamification', require('./routes/gamification'));


// Home Route
app.get('/', (req, res) => {
    res.render('pages/index', {
        user: req.session.user,
        title: 'EduShare Connect - Home'
    });
});

// Test route to verify server is working
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'EduShare Connect server is running' });
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join user's personal room
    socket.on('join-user', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`User ${userId} joined their room`);
    });

    // Join conversation
    socket.on('join-conversation', (conversationId) => {
        socket.join(conversationId);
        console.log(`User joined conversation: ${conversationId}`);
    });

    // Send message
    socket.on('send-message', async (data) => {
        try {
            const { senderId, receiverId, content, conversationId } = data;
            const Message = require('./models/Message');

            const message = new Message({
                sender: senderId,
                receiver: receiverId,
                content,
                conversationId
            });

            await message.save();

            // Populate sender info
            const User = require('./models/User');
            const sender = await User.findById(senderId).select('username profile');
            message.sender = sender;

            // Send to conversation room
            io.to(conversationId).emit('new-message', message);

            // Notify receiver
            io.to(`user_${receiverId}`).emit('message-notification', {
                conversationId,
                message: content,
                sender: sender.username
            });

        } catch (error) {
            console.error('Socket message error:', error);
            socket.emit('message-error', 'Error sending message');
        }
    });

    // Typing indicators
    socket.on('typing-start', (data) => {
        socket.to(data.conversationId).emit('user-typing', {
            userId: data.userId,
            username: data.username
        });
    });

    socket.on('typing-stop', (data) => {
        socket.to(data.conversationId).emit('user-stop-typing', {
            userId: data.userId
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Start Server
server.listen(PORT, () => {
    console.log(`EduShare Connect running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    // Test Socket.io route
    app.get('/test-socket', (req, res) => {
        res.render('pages/test-socket');
    });
});