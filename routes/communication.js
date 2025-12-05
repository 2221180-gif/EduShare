const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Message = require('../models/Message');

router.get('/', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');

    try {
        // Find users to chat with (excluding self)
        const users = await User.find({ _id: { $ne: req.session.user.id } }).select('username profile');

        res.render('pages/chat', {
            title: 'Chat - EduShare Connect',
            user: req.session.user,
            users
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

// Get conversation history
router.get('/history/:userId', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const otherUserId = req.params.userId;
        const currentUserId = req.session.user.id;

        // Generate a consistent conversation ID
        const conversationId = [currentUserId, otherUserId].sort().join('_');

        const messages = await Message.find({ conversationId })
            .sort({ createdAt: 1 })
            .populate('sender', 'username');

        res.json({ conversationId, messages });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;
