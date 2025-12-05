const express = require('express');
const router = express.Router();
const Parser = require('rss-parser');
const parser = new Parser();

// Google News RSS URLs
// query: "Bangladesh Education"
const NEWS_RSS_URL = 'https://news.google.com/rss/search?q=Bangladesh+Education&hl=en-BD&gl=BD&ceid=BD:en';
// query: "Bangladesh Job Circular"
const JOBS_RSS_URL = 'https://news.google.com/rss/search?q=Bangladesh+Job+Circular&hl=en-BD&gl=BD&ceid=BD:en';

router.get('/', async (req, res) => {
    try {
        // Fetch both feeds in parallel
        const [newsFeed, jobsFeed] = await Promise.all([
            parser.parseURL(NEWS_RSS_URL),
            parser.parseURL(JOBS_RSS_URL)
        ]);

        // Process items to look nicer (limit to 10 each)
        const news = newsFeed.items.slice(0, 15).map(item => ({
            title: item.title,
            link: item.link,
            pubDate: new Date(item.pubDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
            source: item.source || 'Google News',
            snippet: item.contentSnippet || ''
        }));

        const jobs = jobsFeed.items.slice(0, 15).map(item => ({
            title: item.title,
            link: item.link,
            pubDate: new Date(item.pubDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
            source: item.source || 'Google News',
            snippet: item.contentSnippet || ''
        }));

        res.render('pages/portal', {
            title: 'News & Jobs Portal - EduShare Connect',
            user: req.session.user,
            news,
            jobs
        });
    } catch (error) {
        console.error('RSS Feed Error:', error);
        res.render('pages/portal', {
            title: 'News & Jobs Portal - EduShare Connect',
            user: req.session.user,
            news: [],
            jobs: [],
            error: 'Unable to load news data at this time.'
        });
    }
});

module.exports = router;
