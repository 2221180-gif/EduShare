const express = require('express');
const router = express.Router();
const Note = require('../models/Note');

// Middleware to check authentication
function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

// Get all notes for a user
router.get('/', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { search, resourceId, courseId } = req.query;

        let query = { user: userId };

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } },
                { tags: { $regex: search, $options: 'i' } }
            ];
        }

        if (resourceId) query.resource = resourceId;
        if (courseId) query.course = courseId;

        const notes = await Note.find(query)
            .populate('resource', 'title')
            .populate('course', 'title')
            .sort({ createdAt: -1 });

        res.render('pages/notes/index', {
            title: 'My Notes - EduShare Connect',
            user: req.session.user,
            notes,
            search: search || '',
            resourceId: resourceId || '',
            courseId: courseId || ''
        });

    } catch (error) {
        console.error('Get notes error:', error);
        res.status(500).send('Server Error');
    }
});

// Create a new note
router.post('/', requireAuth, async (req, res) => {
    try {
        const { title, content, resourceId, courseId, lessonId, videoTimestamp, tags, color } = req.body;
        const userId = req.session.user.id;

        const noteData = {
            user: userId,
            title,
            content,
            color: color || '#FFD93D'
        };

        if (resourceId) noteData.resource = resourceId;
        if (courseId) noteData.course = courseId;
        if (lessonId) noteData.lessonId = lessonId;
        if (videoTimestamp) noteData.videoTimestamp = parseInt(videoTimestamp);
        if (tags) noteData.tags = tags.split(',').map(t => t.trim());

        const note = new Note(noteData);
        await note.save();

        res.json({
            success: true,
            message: 'Note created successfully',
            note
        });

    } catch (error) {
        console.error('Create note error:', error);
        res.status(500).json({ error: 'Error creating note' });
    }
});

// Get a specific note
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const note = await Note.findOne({ _id: req.params.id, user: userId })
            .populate('resource', 'title')
            .populate('course', 'title');

        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }

        res.json(note);

    } catch (error) {
        console.error('Get note error:', error);
        res.status(500).json({ error: 'Error fetching note' });
    }
});

// Update a note
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { title, content, tags, color } = req.body;

        const note = await Note.findOne({ _id: req.params.id, user: userId });

        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }

        if (title) note.title = title;
        if (content) note.content = content;
        if (color) note.color = color;
        if (tags) note.tags = tags.split(',').map(t => t.trim());

        await note.save();

        res.json({
            success: true,
            message: 'Note updated successfully',
            note
        });

    } catch (error) {
        console.error('Update note error:', error);
        res.status(500).json({ error: 'Error updating note' });
    }
});

// Delete a note
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const note = await Note.findOneAndDelete({ _id: req.params.id, user: userId });

        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }

        res.json({
            success: true,
            message: 'Note deleted successfully'
        });

    } catch (error) {
        console.error('Delete note error:', error);
        res.status(500).json({ error: 'Error deleting note' });
    }
});

// Export notes (JSON format)
router.get('/export/json', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const notes = await Note.find({ user: userId })
            .populate('resource', 'title')
            .populate('course', 'title')
            .sort({ createdAt: -1 });

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=notes.json');
        res.send(JSON.stringify(notes, null, 2));

    } catch (error) {
        console.error('Export notes error:', error);
        res.status(500).json({ error: 'Error exporting notes' });
    }
});

module.exports = router;
