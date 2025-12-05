const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Leaderboard Route
router.get('/leaderboard', async (req, res) => {
    try {
        // Fetch top 50 users sorted by points decending
        const topUsers = await User.find({ 'gamification.points': { $gt: 0 } })
            .sort({ 'gamification.points': -1 })
            .limit(50)
            .select('username profile gamification');

        res.render('pages/leaderboard', {
            title: 'Leaderboard - EduShare Connect',
            user: req.session.user,
            topUsers
        });
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
