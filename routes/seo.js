/**
 * SEO Routes - Sitemap, Robots.txt, and Google Verification
 */

const express = require('express');
const router = express.Router();
const { SitemapStream, streamToPromise } = require('sitemap');
const { Readable } = require('stream');

// Import models for sitemap generation
const Resource = require('../models/Resource');
const Course = require('../models/Course');

/**
 * Sitemap.xml Route
 * Dynamically generates sitemap with all pages, resources, and courses
 */
router.get('/sitemap.xml', async (req, res) => {
    try {
        const baseUrl = process.env.SITE_URL || `${req.protocol}://${req.get('host')}`;

        // Create sitemap links array
        const links = [
            // Static pages
            { url: '/', changefreq: 'daily', priority: 1.0 },
            { url: '/login', changefreq: 'monthly', priority: 0.5 },
            { url: '/register', changefreq: 'monthly', priority: 0.5 },
            { url: '/resources', changefreq: 'daily', priority: 0.9 },
            { url: '/resources/upload', changefreq: 'weekly', priority: 0.7 },
            { url: '/courses', changefreq: 'daily', priority: 0.9 },
            { url: '/forums', changefreq: 'daily', priority: 0.8 },
            { url: '/communication', changefreq: 'weekly', priority: 0.7 },
            { url: '/premium', changefreq: 'monthly', priority: 0.6 },
            { url: '/ai-assistant', changefreq: 'weekly', priority: 0.7 },
            { url: '/leaderboard', changefreq: 'daily', priority: 0.6 },
            { url: '/reels', changefreq: 'daily', priority: 0.7 }
        ];

        // Add all resources to sitemap
        const resources = await Resource.find().select('_id updatedAt').lean();
        resources.forEach(resource => {
            links.push({
                url: `/resources/${resource._id}`,
                changefreq: 'weekly',
                priority: 0.8,
                lastmod: resource.updatedAt
            });
        });

        // Add all courses to sitemap
        const courses = await Course.find().select('_id updatedAt').lean();
        courses.forEach(course => {
            links.push({
                url: `/courses/${course._id}`,
                changefreq: 'weekly',
                priority: 0.8,
                lastmod: course.updatedAt
            });
        });

        // Create sitemap stream
        const stream = new SitemapStream({ hostname: baseUrl });

        // Set response headers
        res.header('Content-Type', 'application/xml');

        // Generate sitemap
        const data = await streamToPromise(Readable.from(links).pipe(stream));

        res.send(data);
    } catch (error) {
        console.error('Sitemap generation error:', error);
        res.status(500).send('Error generating sitemap');
    }
});

/**
 * Robots.txt Route
 * Serves robots.txt with sitemap reference
 */
router.get('/robots.txt', (req, res) => {
    const baseUrl = process.env.SITE_URL || `${req.protocol}://${req.get('host')}`;

    const robotsTxt = `# Robots.txt for EduShare Connect
# Allow all search engines to crawl the site

User-agent: *
Allow: /

# Disallow sensitive areas
Disallow: /api/
Disallow: /admin/

# Sitemap location
Sitemap: ${baseUrl}/sitemap.xml
`;

    res.type('text/plain');
    res.send(robotsTxt);
});


module.exports = router;
