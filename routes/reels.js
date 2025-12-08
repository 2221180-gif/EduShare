const express = require('express');
const router = express.Router();

// Curated educational YouTube Shorts - Real Educational Content
const educationalReels = [
    {
        id: 'IlU-zDU6aQ0',
        title: 'How Does Photosynthesis Work? - Quick Science',
        category: 'Educational',
        thumbnail: 'https://img.youtube.com/vi/IlU-zDU6aQ0/maxresdefault.jpg'
    },
    {
        id: 'VFRXJVq0AkI',
        title: 'The Fastest Way to Learn Multiplication Tables',
        category: 'Study Tips',
        thumbnail: 'https://img.youtube.com/vi/VFRXJVq0AkI/maxresdefault.jpg'
    },
    {
        id: 'eIho2S0ZahI',
        title: 'How to Stay Focused While Studying - Proven Technique',
        category: 'Study Tips',
        thumbnail: 'https://img.youtube.com/vi/eIho2S0ZahI/maxresdefault.jpg'
    },
    {
        id: 'Ji_Y7pp9ALL',
        title: 'Growth Mindset vs Fixed Mindset - Motivational',
        category: 'Motivation',
        thumbnail: 'https://img.youtube.com/vi/Ji_Y7pp9ALL/maxresdefault.jpg'
    },
    {
        id: 'OBwS66EBUcY',
        title: 'How Your Brain Learns - Neuroscience Explained',
        category: 'Educational',
        thumbnail: 'https://img.youtube.com/vi/OBwS66EBUcY/maxresdefault.jpg'
    },
    {
        id: 'ddq8JIMhz7c',
        title: 'Effective Note-Taking Methods for Students',
        category: 'Study Tips',
        thumbnail: 'https://img.youtube.com/vi/ddq8JIMhz7c/maxresdefault.jpg'
    },
    {
        id: 'frAEmhqdLFs',
        title: 'Understanding Climate Change - Science Basics',
        category: 'Educational',
        thumbnail: 'https://img.youtube.com/vi/frAEmhqdLFs/maxresdefault.jpg'
    },
    {
        id: 'lsSC2vx7zFQ',
        title: 'How to Overcome Procrastination as a Student',
        category: 'Motivation',
        thumbnail: 'https://img.youtube.com/vi/lsSC2vx7zFQ/maxresdefault.jpg'
    },
    {
        id: 'sOGhwfspWfQ',
        title: 'Quick Chemistry: What are Chemical Reactions?',
        category: 'Educational',
        thumbnail: 'https://img.youtube.com/vi/sOGhwfspWfQ/maxresdefault.jpg'
    },
    {
        id: 'njVv7J2S9L4',
        title: 'Memory Palace Technique - Remember Anything',
        category: 'Study Tips',
        thumbnail: 'https://img.youtube.com/vi/njVv7J2S9L4/maxresdefault.jpg'
    },

    {
        id: 'njVv7J2S9L4',
        title: 'Be that 1% ❤️‍🔥💯',
        category: 'Study Tips',
        thumbnail: 'https://img.youtube.com/vi/njVv7J2S9L4/maxresdefault.jpg'
    }
];

router.get('/', (req, res) => {
    res.render('pages/reels', {
        title: 'Educational Reels - EduShare Connect',
        user: req.session.user,
        reels: educationalReels
    });
});

module.exports = router;
