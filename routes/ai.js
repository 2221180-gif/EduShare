const express = require('express');
const router = express.Router();
const Resource = require('../models/Resource');

// GET /ai/recommendations
router.get('/recommendations', async (req, res) => {
    try {
        // Fetch the latest 6 resources as "AI Picks"
        // In a real scenario, this would use a more complex recommendation engine
        const recommendations = await Resource.find()
            .sort({ createdAt: -1 })
            .limit(6)
            .populate('uploader', 'username');

        res.render('pages/ai-recommendations', {
            title: 'AI Recommendations - EduShare Connect',
            user: req.session.user,
            recommendations: recommendations
        });
    } catch (error) {
        console.error('AI Recommendations error:', error);
        res.render('pages/ai-recommendations', {
            title: 'AI Recommendations - EduShare Connect',
            user: req.session.user,
            recommendations: [],
            error: 'Unable to load recommendations at this time.'
        });
    }
});

router.get('/', (req, res) => {
    res.redirect('/ai/recommendations');
});

module.exports = router;