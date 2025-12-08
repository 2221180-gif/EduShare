const express = require('express');
const router = express.Router();
const Forum = require('../models/Forum');
const User = require('../models/User');

// Middleware to check authentication
function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
}

// List all forum threads
router.get('/', async (req, res) => {
    try {
        const { search, category, courseId, resourceId, sort = 'recent' } = req.query;

        let query = {};

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } },
                { tags: { $regex: search, $options: 'i' } }
            ];
        }

        if (category && category !== 'all') query.category = category;
        if (courseId) query.course = courseId;
        if (resourceId) query.resource = resourceId;

        let threadsQuery = Forum.find(query)
            .populate('author', 'username profile')
            .populate('course', 'title')
            .populate('resource', 'title')
            .populate('replies.author', 'username profile');

        // Apply sorting
        switch (sort) {
            case 'recent':
                threadsQuery = threadsQuery.sort({ isPinned: -1, updatedAt: -1 });
                break;
            case 'popular':
                threadsQuery = threadsQuery.sort({ isPinned: -1, views: -1 });
                break;
            case 'votes':
                threadsQuery = threadsQuery.sort({ isPinned: -1, 'votes.up': -1 });
                break;
            case 'unanswered':
                query['replies.0'] = { $exists: false };
                threadsQuery = threadsQuery.sort({ createdAt: -1 });
                break;
        }

        const threads = await threadsQuery;

        res.render('pages/forums/index', {
            title: 'Discussion Forums - EduShare Connect',
            user: req.session.user,
            threads,
            search: search || '',
            category: category || 'all',
            sort,
            courseId: courseId || '',
            resourceId: resourceId || ''
        });

    } catch (error) {
        console.error('Forums list error:', error);
        res.status(500).send('Server Error');
    }
});

// Create new thread page
router.get('/new', requireAuth, (req, res) => {
    res.render('pages/forums/new', {
        title: 'New Discussion - EduShare Connect',
        user: req.session.user
    });
});

// Create new thread
router.post('/', requireAuth, async (req, res) => {
    try {
        const { title, content, category, tags, courseId, resourceId } = req.body;
        const userId = req.session.user.id;

        const threadData = {
            title,
            content,
            category: category || 'general',
            author: userId
        };

        if (tags) threadData.tags = tags.split(',').map(t => t.trim());
        if (courseId) threadData.course = courseId;
        if (resourceId) threadData.resource = resourceId;

        const thread = new Forum(threadData);
        await thread.save();

        // Award points for creating a thread
        await User.findByIdAndUpdate(userId, {
            $inc: { 'gamification.points': 0.5 }
        });

        res.redirect(`/forums/${thread._id}`);

    } catch (error) {
        console.error('Create thread error:', error);
        res.status(500).send('Error creating thread');
    }
});

// View thread
router.get('/:id', async (req, res) => {
    try {
        const thread = await Forum.findById(req.params.id)
            .populate('author', 'username profile')
            .populate('course', 'title')
            .populate('resource', 'title')
            .populate('replies.author', 'username profile');

        if (!thread) {
            return res.status(404).send('Thread not found');
        }

        // Increment views
        thread.views += 1;
        await thread.save();

        res.render('pages/forums/thread', {
            title: thread.title + ' - EduShare Connect',
            user: req.session.user,
            thread
        });

    } catch (error) {
        console.error('View thread error:', error);
        res.status(500).send('Server Error');
    }
});

// Add reply to thread
router.post('/:id/reply', requireAuth, async (req, res) => {
    try {
        const { content, isAnswer } = req.body;
        const userId = req.session.user.id;

        const thread = await Forum.findById(req.params.id);

        if (!thread) {
            return res.status(404).json({ error: 'Thread not found' });
        }

        if (thread.isLocked) {
            return res.status(403).json({ error: 'Thread is locked' });
        }

        thread.replies.push({
            author: userId,
            content,
            isAnswer: isAnswer === 'true' || isAnswer === true
        });

        await thread.save();

        // Award points for replying
        await User.findByIdAndUpdate(userId, {
            $inc: { 'gamification.points': 0.3 }
        });

        // Populate the new reply
        await thread.populate('replies.author', 'username profile');

        res.json({
            success: true,
            message: 'Reply added successfully',
            reply: thread.replies[thread.replies.length - 1]
        });

    } catch (error) {
        console.error('Add reply error:', error);
        res.status(500).json({ error: 'Error adding reply' });
    }
});

// Vote on thread
router.post('/:id/vote', requireAuth, async (req, res) => {
    try {
        const { type } = req.body; // 'up' or 'down'
        const userId = req.session.user.id;

        const thread = await Forum.findById(req.params.id);

        if (!thread) {
            return res.status(404).json({ error: 'Thread not found' });
        }

        // Remove from opposite array
        const oppositeType = type === 'up' ? 'down' : 'up';
        const oppositeIndex = thread.votes[oppositeType].indexOf(userId);
        if (oppositeIndex > -1) {
            thread.votes[oppositeType].splice(oppositeIndex, 1);
        }

        // Toggle vote
        const index = thread.votes[type].indexOf(userId);
        if (index > -1) {
            thread.votes[type].splice(index, 1);
        } else {
            thread.votes[type].push(userId);
        }

        await thread.save();

        res.json({
            success: true,
            upvotes: thread.votes.up.length,
            downvotes: thread.votes.down.length,
            score: thread.voteScore
        });

    } catch (error) {
        console.error('Vote thread error:', error);
        res.status(500).json({ error: 'Error voting' });
    }
});

// Vote on reply
router.post('/:threadId/reply/:replyId/vote', requireAuth, async (req, res) => {
    try {
        const { type } = req.body; // 'up' or 'down'
        const { threadId, replyId } = req.params;
        const userId = req.session.user.id;

        const thread = await Forum.findById(threadId);

        if (!thread) {
            return res.status(404).json({ error: 'Thread not found' });
        }

        const reply = thread.replies.id(replyId);

        if (!reply) {
            return res.status(404).json({ error: 'Reply not found' });
        }

        // Remove from opposite array
        const oppositeType = type === 'up' ? 'down' : 'up';
        const oppositeIndex = reply.votes[oppositeType].indexOf(userId);
        if (oppositeIndex > -1) {
            reply.votes[oppositeType].splice(oppositeIndex, 1);
        }

        // Toggle vote
        const index = reply.votes[type].indexOf(userId);
        if (index > -1) {
            reply.votes[type].splice(index, 1);
        } else {
            reply.votes[type].push(userId);
        }

        await thread.save();

        res.json({
            success: true,
            upvotes: reply.votes.up.length,
            downvotes: reply.votes.down.length,
            score: reply.votes.up.length - reply.votes.down.length
        });

    } catch (error) {
        console.error('Vote reply error:', error);
        res.status(500).json({ error: 'Error voting' });
    }
});

// Mark reply as answer (for thread author or admin)
router.post('/:threadId/reply/:replyId/mark-answer', requireAuth, async (req, res) => {
    try {
        const { threadId, replyId } = req.params;
        const userId = req.session.user.id;

        const thread = await Forum.findById(threadId);

        if (!thread) {
            return res.status(404).json({ error: 'Thread not found' });
        }

        // Check if user is thread author or admin
        if (thread.author.toString() !== userId && req.session.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const reply = thread.replies.id(replyId);

        if (!reply) {
            return res.status(404).json({ error: 'Reply not found' });
        }

        // Unmark other answers
        thread.replies.forEach(r => {
            r.isAnswer = false;
        });

        // Mark this reply as answer
        reply.isAnswer = true;
        await thread.save();

        res.json({
            success: true,
            message: 'Reply marked as answer'
        });

    } catch (error) {
        console.error('Mark answer error:', error);
        res.status(500).json({ error: 'Error marking answer' });
    }
});

// Delete thread (author or admin only)
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const thread = await Forum.findById(req.params.id);

        if (!thread) {
            return res.status(404).json({ error: 'Thread not found' });
        }

        // Check if user is author or admin
        if (thread.author.toString() !== userId && req.session.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await Forum.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Thread deleted successfully'
        });

    } catch (error) {
        console.error('Delete thread error:', error);
        res.status(500).json({ error: 'Error deleting thread' });
    }
});

module.exports = router;
