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
        const { search, subject, grade } = req.query;
        let query = {};

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { tags: { $regex: search, $options: 'i' } }
            ];
        }

        if (subject) query.subject = subject;
        if (grade) query.gradeLevel = grade;

        const resources = await Resource.find(query).populate('uploader', 'username').sort({ createdAt: -1 });

        res.render('pages/resources/index', {
            title: 'Resources - EduShare Connect',
            user: req.session.user,
            resources,
            search,
            subject,
            grade
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
