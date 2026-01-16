const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Login Page
router.get('/login', (req, res) => {
    res.render('pages/login', {
        title: 'Login - EduShare Connect',
        user: req.session.user,
        error: null
    });
});

// Register Page
router.get('/register', (req, res) => {
    res.render('pages/register', {
        title: 'Register - EduShare Connect',
        user: req.session.user,
        error: null
    });
});

// Login Logic
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user || !(await user.comparePassword(password))) {
            return res.render('pages/login', {
                title: 'Login - EduShare Connect',
                user: null,
                error: 'Invalid email or password'
            });
        }

        req.session.user = {
            id: user._id,
            username: user.username,
            role: user.role,
            email: user.email,
            department: user.profile?.department
        };

        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.render('pages/login', {
            title: 'Login - EduShare Connect',
            user: null,
            error: 'An error occurred'
        });
    }
});

// Register Logic
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, role, department } = req.body;

        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.render('pages/register', {
                title: 'Register - EduShare Connect',
                user: null,
                error: 'Username or email already exists'
            });
        }

        const user = new User({
            username,
            email,
            password,
            role: role || 'student',
            profile: {
                department: department || null
            }
        });

        await user.save();

        req.session.user = {
            id: user._id,
            username: user.username,
            role: user.role,
            email: user.email,
            department: user.profile?.department
        };

        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.render('pages/register', {
            title: 'Register - EduShare Connect',
            user: null,
            error: 'An error occurred during registration'
        });
    }
});

// Profile Settings Page
router.get('/profile/settings', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    try {
        const user = await User.findById(req.session.user.id);
        res.render('pages/profile-settings', {
            title: 'Profile Settings - EduShare Connect',
            user: req.session.user,
            userProfile: user,
            success: null,
            error: null
        });
    } catch (error) {
        console.error('Profile settings error:', error);
        res.redirect('/');
    }
});

// Update Profile Settings
router.post('/profile/settings', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    try {
        const { bio, gradeLevel, department, subjects } = req.body;

        const user = await User.findById(req.session.user.id);

        // Initialize profile object if it doesn't exist
        if (!user.profile) {
            user.profile = {};
        }

        // Update profile fields
        if (bio !== undefined && bio !== '') {
            user.profile.bio = bio;
        }
        if (gradeLevel !== undefined && gradeLevel !== '') {
            user.profile.gradeLevel = gradeLevel;
        }
        if (department !== undefined && department !== '') {
            user.profile.department = department;
        }

        // Parse subjects from comma-separated string
        if (subjects) {
            user.profile.subjects = subjects.split(',').map(s => s.trim()).filter(s => s);
        }

        // Mark profile as modified to ensure Mongoose saves it
        user.markModified('profile');
        await user.save();

        // Update session with new department
        req.session.user.department = department;

        res.render('pages/profile-settings', {
            title: 'Profile Settings - EduShare Connect',
            user: req.session.user,
            userProfile: user,
            success: 'Profile updated successfully!',
            error: null
        });
    } catch (error) {
        console.error('Profile update error:', error);
        const user = await User.findById(req.session.user.id);
        res.render('pages/profile-settings', {
            title: 'Profile Settings - EduShare Connect',
            user: req.session.user,
            userProfile: user,
            success: null,
            error: 'Failed to update profile. Please try again.'
        });
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

module.exports = router;
