const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Progress = require('../models/Progress');
const User = require('../models/User');

// Middleware to check authentication
function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
}

// List all courses
router.get('/', async (req, res) => {
    try {
        const { search, category, subject, grade, difficulty, sort = 'newest' } = req.query;
        let query = { status: 'published' };

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { tags: { $regex: search, $options: 'i' } }
            ];
        }

        if (category && category !== 'all') query.category = category;
        if (subject && subject !== 'all') query.subject = subject;
        if (grade && grade !== 'all') query.gradeLevel = grade;
        if (difficulty && difficulty !== 'all') query.difficulty = difficulty;

        let coursesQuery = Course.find(query).populate('instructor', 'username profile');

        // Apply sorting
        switch (sort) {
            case 'newest':
                coursesQuery = coursesQuery.sort({ createdAt: -1 });
                break;
            case 'popular':
                coursesQuery = coursesQuery.sort({ 'enrolledStudents': -1, views: -1 });
                break;
            case 'rating':
                coursesQuery = coursesQuery.sort({ createdAt: -1 }); // Will sort by rating after
                break;
            case 'title':
                coursesQuery = coursesQuery.sort({ title: 1 });
                break;
        }

        let courses = await coursesQuery;

        // Calculate average ratings and enrollment count
        courses = courses.map(course => {
            const courseObj = course.toObject();
            if (courseObj.ratings && courseObj.ratings.length > 0) {
                const sum = courseObj.ratings.reduce((acc, r) => acc + r.value, 0);
                courseObj.averageRating = (sum / courseObj.ratings.length).toFixed(1);
            } else {
                courseObj.averageRating = 0;
            }
            courseObj.enrollmentCount = courseObj.enrolledStudents ? courseObj.enrolledStudents.length : 0;
            return courseObj;
        });

        // Sort by rating if requested
        if (sort === 'rating') {
            courses.sort((a, b) => parseFloat(b.averageRating) - parseFloat(a.averageRating));
        }

        res.render('pages/courses/index', {
            title: 'Courses - EduShare Connect',
            user: req.session.user,
            courses,
            search: search || '',
            category: category || 'all',
            subject: subject || 'all',
            grade: grade || 'all',
            difficulty: difficulty || 'all',
            sort
        });

    } catch (error) {
        console.error('Courses list error:', error);
        res.status(500).send('Server Error');
    }
});

// View course details
router.get('/:id', async (req, res) => {
    try {
        const course = await Course.findById(req.params.id)
            .populate('instructor', 'username profile bio')
            .populate('ratings.user', 'username profile');

        if (!course) {
            return res.status(404).send('Course not found');
        }

        // Increment views
        course.views += 1;
        await course.save();

        let userProgress = null;
        let isEnrolled = false;

        if (req.session.user) {
            userProgress = await Progress.findOne({
                user: req.session.user.id,
                course: course._id
            });

            isEnrolled = course.enrolledStudents.includes(req.session.user.id);
        }

        res.render('pages/courses/view', {
            title: course.title + ' - EduShare Connect',
            user: req.session.user,
            course,
            userProgress,
            isEnrolled
        });

    } catch (error) {
        console.error('Course view error:', error);
        res.status(500).send('Server Error');
    }
});

// Enroll in course
router.post('/:id/enroll', requireAuth, async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        const userId = req.session.user.id;

        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }

        // Check if already enrolled
        if (course.enrolledStudents.includes(userId)) {
            return res.json({ success: true, message: 'Already enrolled' });
        }

        // Check if premium and user has access
        if (course.isPremium && course.price > 0) {
            // In a real app, check payment/subscription here
            return res.status(403).json({ error: 'Payment required for premium courses' });
        }

        // Enroll student
        course.enrolledStudents.push(userId);
        await course.save();

        // Add to user's enrolled courses
        await User.findByIdAndUpdate(userId, {
            $addToSet: { enrolledCourses: course._id }
        });

        // Create progress tracking
        const progress = new Progress({
            user: userId,
            course: course._id
        });
        await progress.save();

        // Award points for enrolling
        await User.findByIdAndUpdate(userId, {
            $inc: { 'gamification.points': 1 }
        });

        res.json({
            success: true,
            message: 'Successfully enrolled in course',
            redirectUrl: `/courses/${course._id}/learn`
        });

    } catch (error) {
        console.error('Enrollment error:', error);
        res.status(500).json({ error: 'Error enrolling in course' });
    }
});

// Learning interface (for enrolled students)
router.get('/:id/learn', requireAuth, async (req, res) => {
    try {
        const course = await Course.findById(req.params.id)
            .populate('instructor', 'username profile');

        if (!course) {
            return res.status(404).send('Course not found');
        }

        const userId = req.session.user.id;

        // Check if enrolled
        if (!course.enrolledStudents.includes(userId) && !course.isPremium === false) {
            return res.redirect(`/courses/${course._id}`);
        }

        const progress = await Progress.findOne({
            user: userId,
            course: course._id
        });

        if (!progress) {
            return res.redirect(`/courses/${course._id}`);
        }

        res.render('pages/courses/learn', {
            title: `Learn: ${course.title} - EduShare Connect`,
            user: req.session.user,
            course,
            progress
        });

    } catch (error) {
        console.error('Learning interface error:', error);
        res.status(500).send('Server Error');
    }
});

// Mark lesson as complete
router.post('/:courseId/lesson/complete', requireAuth, async (req, res) => {
    try {
        const { chapterIndex, lessonIndex } = req.body;
        const userId = req.session.user.id;

        const progress = await Progress.findOne({
            user: userId,
            course: req.params.courseId
        });

        if (!progress) {
            return res.status(404).json({ error: 'Progress not found' });
        }

        // Mark lesson complete
        progress.completeLesson(parseInt(chapterIndex), parseInt(lessonIndex));
        await progress.updateCompletionPercentage();
        await progress.save();

        // Award points
        await User.findByIdAndUpdate(userId, {
            $inc: { 'gamification.points': 0.5 }
        });

        // Check if course is now complete
        if (progress.isCompleted() && !progress.certificateIssued) {
            progress.certificateIssued = true;
            progress.certificateIssuedAt = new Date();
            await progress.save();

            // Add to completed courses
            await User.findByIdAndUpdate(userId, {
                $addToSet: {
                    completedCourses: {
                        course: req.params.courseId,
                        completedAt: new Date()
                    }
                },
                $inc: { 'gamification.points': 10 } // Bonus for completion
            });
        }

        res.json({
            success: true,
            completionPercentage: progress.completionPercentage,
            certificateIssued: progress.certificateIssued
        });

    } catch (error) {
        console.error('Mark lesson complete error:', error);
        res.status(500).json({ error: 'Error updating progress' });
    }
});

module.exports = router;
