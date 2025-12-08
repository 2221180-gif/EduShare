const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Message = require('../models/Message');

router.get('/', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');

    try {
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

router.get('/history/:userId', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const otherUserId = req.params.userId;
        const currentUserId = req.session.user.id;
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

// DELETE message endpoint
router.post('/message/:messageId/delete', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const message = await Message.findById(req.params.messageId);
        if (!message) return res.status(404).json({ error: 'Message not found' });

        if (message.sender.toString() !== req.session.user.id.toString()) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await Message.findByIdAndDelete(req.params.messageId);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
