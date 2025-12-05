const express = require('express');
const router = express.Router();
const Resource = require('../models/Resource');

router.get('/recommendations', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');

    try {
        const user = await require('../models/User').findById(req.session.user.id);

        // Find resources that match the user's subjects or grade level
        // If user has no profile subjects, fall back to all resources
        let query = {};
        if (user.profile && user.profile.subjects && user.profile.subjects.length > 0) {
            query.subject = { $in: user.profile.subjects };
        }

        // Get recommendations, excluding own uploads
        let recommendations = await Resource.find({
            ...query,
            uploader: { $ne: user._id }
        }).limit(10).populate('uploader', 'username');

        // If no matches found, get trending resources
        if (recommendations.length === 0) {
            recommendations = await Resource.find({
                uploader: { $ne: user._id }
            }).sort({ views: -1 }).limit(5).populate('uploader', 'username');
        }

        res.render('pages/ai-recommendations', {
            title: 'AI Recommendations - EduShare Connect',
            user: req.session.user,
            recommendations
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
