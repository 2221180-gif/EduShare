const express = require('express');
const router = express.Router();
const Resource = require('../models/Resource');
const User = require('../models/User');

// Middleware to check if user is logged in
function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

// Submit a review for a resource
router.post('/:resourceId', requireAuth, async (req, res) => {
    try {
        const { resourceId } = req.params;
        const { rating, comment } = req.body;
        const userId = req.session.user.id;

        // Validate rating
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }

        const resource = await Resource.findById(resourceId);
        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        // Check if user already reviewed this resource
        const existingReviewIndex = resource.ratings.findIndex(
            r => r.user && r.user.toString() === userId
        );

        if (existingReviewIndex !== -1) {
            // Update existing review
            resource.ratings[existingReviewIndex] = {
                user: userId,
                value: parseInt(rating),
                comment: comment || '',
                date: new Date()
            };
        } else {
            // Add new review
            resource.ratings.push({
                user: userId,
                value: parseInt(rating),
                comment: comment || '',
                date: new Date()
            });

            // Award points for reviewing
            await User.findByIdAndUpdate(userId, {
                $inc: { 'gamification.points': 0.2 }
            });
        }

        await resource.save();

        // Populate the user info for the response
        await resource.populate('ratings.user', 'username profile');

        res.json({
            success: true,
            message: 'Review submitted successfully',
            ratings: resource.ratings
        });

    } catch (error) {
        console.error('Review submission error:', error);
        res.status(500).json({ error: 'Error submitting review' });
    }
});

// Get all reviews for a resource
router.get('/:resourceId', async (req, res) => {
    try {
        const { resourceId } = req.params;
        const { sort = 'newest', page = 1, limit = 10 } = req.query;

        const resource = await Resource.findById(resourceId)
            .populate('ratings.user', 'username profile');

        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        let reviews = resource.ratings || [];

        // Sort reviews
        switch (sort) {
            case 'newest':
                reviews.sort((a, b) => new Date(b.date) - new Date(a.date));
                break;
            case 'oldest':
                reviews.sort((a, b) => new Date(a.date) - new Date(b.date));
                break;
            case 'highest':
                reviews.sort((a, b) => b.value - a.value);
                break;
            case 'lowest':
                reviews.sort((a, b) => a.value - b.value);
                break;
        }

        // Pagination
        const start = (parseInt(page) - 1) * parseInt(limit);
        const end = start + parseInt(limit);
        const paginatedReviews = reviews.slice(start, end);

        // Calculate average rating
        const averageRating = reviews.length > 0
            ? (reviews.reduce((sum, r) => sum + r.value, 0) / reviews.length).toFixed(1)
            : 0;

        // Rating distribution
        const distribution = {
            5: reviews.filter(r => r.value === 5).length,
            4: reviews.filter(r => r.value === 4).length,
            3: reviews.filter(r => r.value === 3).length,
            2: reviews.filter(r => r.value === 2).length,
            1: reviews.filter(r => r.value === 1).length
        };

        res.json({
            reviews: paginatedReviews,
            averageRating,
            totalReviews: reviews.length,
            distribution,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: reviews.length,
                pages: Math.ceil(reviews.length / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Get reviews error:', error);
        res.status(500).json({ error: 'Error fetching reviews' });
    }
});

// Delete own review
router.delete('/:resourceId', requireAuth, async (req, res) => {
    try {
        const { resourceId } = req.params;
        const userId = req.session.user.id;

        const resource = await Resource.findById(resourceId);
        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        const reviewIndex = resource.ratings.findIndex(
            r => r.user && r.user.toString() === userId
        );

        if (reviewIndex === -1) {
            return res.status(404).json({ error: 'Review not found' });
        }

        resource.ratings.splice(reviewIndex, 1);
        await resource.save();

        res.json({
            success: true,
            message: 'Review deleted successfully'
        });

    } catch (error) {
        console.error('Delete review error:', error);
        res.status(500).json({ error: 'Error deleting review' });
    }
});

// Report a review (for moderation)
router.post('/:resourceId/report/:reviewIndex', requireAuth, async (req, res) => {
    try {
        const { resourceId, reviewIndex } = req.params;
        const { reason } = req.body;
        const userId = req.session.user.id;

        // In a full implementation, you'd create a Report model
        // For now, we'll just log it
        console.log(`Review reported - Resource: ${resourceId}, Review: ${reviewIndex}, Reason: ${reason}, Reporter: ${userId}`);

        res.json({
            success: true,
            message: 'Review reported for moderation'
        });

    } catch (error) {
        console.error('Report review error:', error);
        res.status(500).json({ error: 'Error reporting review' });
    }
});

module.exports = router;
