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

// SEO Middleware (must be before routes)
const { seoMiddleware } = require('./utils/seo');
app.use(seoMiddleware);

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// SEO Routes (must be first to handle /sitemap.xml and /robots.txt)
app.use('/', require('./routes/seo'));

// Application Routes
app.use('/', require('./routes/auth'));
app.use('/resources', require('./routes/resources'));
app.use('/reviews', require('./routes/reviews'));
app.use('/courses', require('./routes/courses'));
app.use('/favorites', require('./routes/favorites'));
app.use('/notes', require('./routes/notes'));
app.use('/forums', require('./routes/forums'));
app.use('/communication', require('./routes/communication'));
app.use('/premium', require('./routes/premium'));
app.use('/ai', require('./routes/ai'));
app.use('/ai-assistant', require('./routes/ai-chat'));
app.use('/gamification', require('./routes/gamification'));
app.use('/portal', require('./routes/portal'));
app.use('/reels', require('./routes/reels'));


// Home Route - with real-time stats
app.get('/', async (req, res) => {
    try {
        const User = require('./models/User');
        const Resource = require('./models/Resource');
        const Course = require('./models/Course');

        // Fetch real counts from database
        const [userCount, resourceCount, courseCount] = await Promise.all([
            User.countDocuments(),
            Resource.countDocuments(),
            Course.countDocuments()
        ]);

        res.render('pages/index', {
            user: req.session.user,
            title: 'EduShare Connect - Home',
            stats: {
                users: userCount,
                resources: resourceCount,
                courses: courseCount
            }
        });
    } catch (error) {
        console.error('Home page error:', error);
        // Fallback to rendering without stats
        res.render('pages/index', {
            user: req.session.user,
            title: 'EduShare Connect - Home',
            stats: {
                users: 0,
                resources: 0,
                courses: 0
            }
        });
    }
});

// Test route to verify server is working
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'EduShare Connect server is running' });
});

// Track online users
const onlineUsers = new Map(); // userId -> socketId

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join user's personal room
    socket.on('join-user', (userId) => {
        socket.join(`user_${userId}`);
        socket.userId = userId;
        onlineUsers.set(userId, socket.id);
        console.log(`User ${userId} joined their room and is now online`);

        // Broadcast online status to all users
        io.emit('user-online', userId);

        // Send list of all online users to the newly connected user
        socket.emit('online-users', Array.from(onlineUsers.keys()));
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

    // Handle message deletion
    socket.on('delete-message', async (data) => {
        try {
            const { messageId, conversationId } = data;
            const Message = require('./models/Message');

            // Find and delete the message
            const message = await Message.findById(messageId);

            if (message && message.sender.toString() === socket.userId) {
                await Message.findByIdAndDelete(messageId);

                // Notify both users in the conversation
                io.to(conversationId).emit('message-deleted', { messageId });
            }
        } catch (error) {
            console.error('Delete message error:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);

        // Remove from online users and broadcast offline status
        if (socket.userId) {
            onlineUsers.delete(socket.userId);
            io.emit('user-offline', socket.userId);
            console.log(`User ${socket.userId} is now offline`);
        }
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