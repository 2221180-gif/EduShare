const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Middleware to check authentication
function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

// Toggle favorite resource
router.post('/resources/:id', requireAuth, async (req, res) => {
    try {
        const resourceId = req.params.id;
        const userId = req.session.user.id;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const index = user.favorites.resources.indexOf(resourceId);

        if (index > -1) {
            // Remove from favorites
            user.favorites.resources.splice(index, 1);
            await user.save();

            res.json({
                success: true,
                action: 'removed',
                message: 'Removed from favorites'
            });
        } else {
            // Add to favorites
            user.favorites.resources.push(resourceId);
            await user.save();

            res.json({
                success: true,
                action: 'added',
                message: 'Added to favorites'
            });
        }

    } catch (error) {
        console.error('Toggle favorite resource error:', error);
        res.status(500).json({ error: 'Error updating favorites' });
    }
});

// Toggle favorite course
router.post('/courses/:id', requireAuth, async (req, res) => {
    try {
        const courseId = req.params.id;
        const userId = req.session.user.id;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const index = user.favorites.courses.indexOf(courseId);

        if (index > -1) {
            // Remove from favorites
            user.favorites.courses.splice(index, 1);
            await user.save();

            res.json({
                success: true,
                action: 'removed',
                message: 'Removed from favorites'
            });
        } else {
            // Add to favorites
            user.favorites.courses.push(courseId);
            await user.save();

            res.json({
                success: true,
                action: 'added',
                message: 'Added to favorites'
            });
        }

    } catch (error) {
        console.error('Toggle favorite course error:', error);
        res.status(500).json({ error: 'Error updating favorites' });
    }
});

// Get all favorites
router.get('/', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const user = await User.findById(userId)
            .populate({
                path: 'favorites.resources',
                populate: { path: 'uploader', select: 'username profile' }
            })
            .populate({
                path: 'favorites.courses',
                populate: { path: 'instructor', select: 'username profile' }
            });

        if (!user) {
            return res.status(404).send('User not found');
        }

        res.render('pages/favorites', {
            title: 'My Favorites - EduShare Connect',
            user: req.session.user,
            favoriteResources: user.favorites.resources || [],
            favoriteCourses: user.favorites.courses || []
        });

    } catch (error) {
        console.error('Get favorites error:', error);
        res.status(500).send('Server Error');
    }
});

// Check if item is favorited
router.get('/check/:type/:id', requireAuth, async (req, res) => {
    try {
        const { type, id } = req.params;
        const userId = req.session.user.id;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        let isFavorited = false;

        if (type === 'resource') {
            isFavorited = user.favorites.resources.includes(id);
        } else if (type === 'course') {
            isFavorited = user.favorites.courses.includes(id);
        }

        res.json({ isFavorited });

    } catch (error) {
        console.error('Check favorite error:', error);
        res.status(500).json({ error: 'Error checking favorite status' });
    }
});

module.exports = router;
