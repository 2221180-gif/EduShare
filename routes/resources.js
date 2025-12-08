const express = require('express');
const router = express.Router();
const Resource = require('../models/Resource');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const axios = require('axios');

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Cloudinary Config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer Cloudinary Storage
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'edushare_resources',
        allowed_formats: ['jpg', 'png', 'pdf', 'doc', 'docx', 'ppt', 'pptx'],
        resource_type: 'auto' // Auto-detect file type
    }
});

const upload = multer({ storage: storage });

// List Resources
router.get('/', async (req, res) => {
    try {
        const { search, subject, grade, minPrice, maxPrice, minRating, sort, page = 1, limit = 12 } = req.query;
        let query = {};

        // Search filter
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { tags: { $regex: search, $options: 'i' } }
            ];
        }

        // Subject and grade filters
        if (subject && subject !== 'all') query.subject = subject;
        if (grade && grade !== 'all') query.gradeLevel = grade;

        // Price filter (for premium resources)
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = parseFloat(minPrice);
            if (maxPrice) query.price.$lte = parseFloat(maxPrice);
        }

        // Get resources with populated fields
        let resourcesQuery = Resource.find(query).populate('uploader', 'username profile');

        // Apply sorting
        switch (sort) {
            case 'newest':
                resourcesQuery = resourcesQuery.sort({ createdAt: -1 });
                break;
            case 'oldest':
                resourcesQuery = resourcesQuery.sort({ createdAt: 1 });
                break;
            case 'popular':
                resourcesQuery = resourcesQuery.sort({ views: -1, downloads: -1 });
                break;
            case 'rating':
                // We'll sort by average rating after fetching
                resourcesQuery = resourcesQuery.sort({ createdAt: -1 });
                break;
            case 'title':
                resourcesQuery = resourcesQuery.sort({ title: 1 });
                break;
            default:
                resourcesQuery = resourcesQuery.sort({ createdAt: -1 });
        }

        // Get total count for pagination
        const totalResources = await Resource.countDocuments(query);

        // Apply pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        resourcesQuery = resourcesQuery.skip(skip).limit(parseInt(limit));

        let resources = await resourcesQuery;

        // Calculate average rating for each resource
        resources = resources.map(resource => {
            const resourceObj = resource.toObject();
            if (resourceObj.ratings && resourceObj.ratings.length > 0) {
                const sum = resourceObj.ratings.reduce((acc, r) => acc + r.value, 0);
                resourceObj.averageRating = (sum / resourceObj.ratings.length).toFixed(1);
            } else {
                resourceObj.averageRating = 0;
            }
            resourceObj.reviewCount = resourceObj.ratings ? resourceObj.ratings.length : 0;
            return resourceObj;
        });

        // Filter by minimum rating if specified
        if (minRating) {
            resources = resources.filter(r => parseFloat(r.averageRating) >= parseFloat(minRating));
        }

        // Sort by rating if that's the selected sort
        if (sort === 'rating') {
            resources.sort((a, b) => parseFloat(b.averageRating) - parseFloat(a.averageRating));
        }

        // Get unique subjects and grades for filter dropdowns
        const subjects = await Resource.distinct('subject');
        const grades = await Resource.distinct('gradeLevel');

        res.render('pages/resources/index', {
            title: 'Resources - EduShare Connect',
            user: req.session.user,
            resources,
            search: search || '',
            subject: subject || 'all',
            grade: grade || 'all',
            minPrice: minPrice || '',
            maxPrice: maxPrice || '',
            minRating: minRating || '',
            sort: sort || 'newest',
            subjects,
            grades,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalResources,
                pages: Math.ceil(totalResources / parseInt(limit))
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

// Upload Page
router.get('/upload/new', (req, res) => {
    if (!req.session.user) return res.redirect('/login');

    res.render('pages/resources/upload', {
        title: 'Upload Resource - EduShare Connect',
        user: req.session.user
    });
});

// Handle Upload
router.post('/upload', upload.single('resourceFile'), async (req, res) => {
    if (!req.session.user) return res.status(401).send('Unauthorized');

    try {
        const { title, description, subject, gradeLevel, tags, isPremium } = req.body;

        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).send('No file uploaded');
        }

        const resource = new Resource({
            title,
            description,
            // Cloudinary returns the URL in path or secure_url
            fileUrl: req.file.path,
            fileType: req.file.format || path.extname(req.file.originalname).substring(1),
            uploader: req.session.user.id,
            subject,
            gradeLevel,
            tags: tags.split(',').map(t => t.trim()),
            isPremium: isPremium === 'on'
        });

        await resource.save();

        // Update user gamification stats
        await User.findByIdAndUpdate(req.session.user.id, {
            $inc: {
                'gamification.uploads': 1,
                'gamification.points': 0.5
            }
        });

        res.redirect('/resources');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error uploading resource');
    }
});

// PDF Proxy Route - Serves PDFs from Cloudinary through our server to avoid CORS issues
router.get('/pdf-proxy/:id', async (req, res) => {
    try {
        const resource = await Resource.findById(req.params.id);

        if (!resource || resource.fileType !== 'pdf') {
            return res.status(404).send('PDF not found');
        }

        // Fetch PDF from Cloudinary
        const response = await axios.get(resource.fileUrl, {
            responseType: 'stream'
        });

        // Set proper headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline');

        // Stream the PDF to the client
        response.data.pipe(res);
    } catch (error) {
        console.error('PDF proxy error:', error);
        res.status(500).send('Error loading PDF');
    }
});

// Autocomplete endpoint for search suggestions
router.get('/autocomplete', async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.length < 2) {
            return res.json([]);
        }

        // Get unique titles matching the query
        const resources = await Resource.find({
            title: { $regex: q, $options: 'i' }
        })
            .select('title')
            .limit(10);

        const suggestions = resources.map(r => r.title);
        res.json(suggestions);

    } catch (error) {
        console.error('Autocomplete error:', error);
        res.json([]);
    }
});

// API endpoint for loading more resources (infinite scroll)
router.get('/api/load-more', async (req, res) => {
    try {
        const { search, subject, grade, minPrice, maxPrice, minRating, sort, page = 1, limit = 12 } = req.query;
        let query = {};

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { tags: { $regex: search, $options: 'i' } }
            ];
        }

        if (subject && subject !== 'all') query.subject = subject;
        if (grade && grade !== 'all') query.gradeLevel = grade;

        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = parseFloat(minPrice);
            if (maxPrice) query.price.$lte = parseFloat(maxPrice);
        }

        const totalResources = await Resource.countDocuments(query);
        const skip = (parseInt(page) - 1) * parseInt(limit);

        let resourcesQuery = Resource.find(query)
            .populate('uploader', 'username profile')
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        let resources = await resourcesQuery;

        resources = resources.map(resource => {
            const resourceObj = resource.toObject();
            if (resourceObj.ratings && resourceObj.ratings.length > 0) {
                const sum = resourceObj.ratings.reduce((acc, r) => acc + r.value, 0);
                resourceObj.averageRating = (sum / resourceObj.ratings.length).toFixed(1);
            } else {
                resourceObj.averageRating = 0;
            }
            resourceObj.reviewCount = resourceObj.ratings ? resourceObj.ratings.length : 0;
            return resourceObj;
        });

        if (minRating) {
            resources = resources.filter(r => parseFloat(r.averageRating) >= parseFloat(minRating));
        }

        res.json({
            resources,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalResources,
                pages: Math.ceil(totalResources / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Load more error:', error);
        res.status(500).json({ error: 'Error loading resources' });
    }
});

// Download Resource (increment counter)
router.get('/:id/download', async (req, res) => {
    try {
        const resource = await Resource.findById(req.params.id);

        if (!resource) {
            return res.status(404).send('Resource not found');
        }

        // Increment download counter
        resource.downloads = (resource.downloads || 0) + 1;
        await resource.save();

        // Update uploader's gamification stats
        if (resource.uploader) {
            await User.findByIdAndUpdate(resource.uploader, {
                $inc: { 'gamification.downloads': 1 }
            });
        }

        // Update downloader's stats if logged in
        if (req.session.user) {
            await User.findByIdAndUpdate(req.session.user.id, {
                $inc: { 'gamification.points': 0.1 }
            });
        }

        // Redirect to the actual file URL
        res.redirect(resource.fileUrl);

    } catch (error) {
        console.error('Download error:', error);
        res.status(500).send('Error downloading resource');
    }
});

// View Resource
router.get('/:id', async (req, res) => {
    try {
        const resource = await Resource.findById(req.params.id)
            .populate('uploader', 'username profile')
            .populate('ratings.user', 'username');

        if (!resource) return res.status(404).send('Resource not found');

        // Increment views
        resource.views += 1;
        await resource.save();

        res.render('pages/resources/view', {
            title: resource.title + ' - EduShare Connect',
            user: req.session.user,
            resource
        });
    } catch (error) {
        // If the ID is not a valid ObjectId (like "upload" if the route was wrong), handle it
        if (req.originalUrl.includes('/upload')) return res.redirect('/resources/upload/new');

        console.error(error);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
