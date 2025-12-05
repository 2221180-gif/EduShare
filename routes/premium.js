const express = require('express');
const router = express.Router();
const Resource = require('../models/Resource');

router.get('/', async (req, res) => {
    try {
        const premiumResources = await Resource.find({ isPremium: true })
            .populate('uploader', 'username')
            .sort({ views: -1 });

        res.render('pages/premium', {
            title: 'Premium Content - EduShare Connect',
            user: req.session.user,
            resources: premiumResources
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
