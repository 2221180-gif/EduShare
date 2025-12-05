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
            email: user.email
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
        const { username, email, password, role } = req.body;

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
            role: role || 'student'
        });

        await user.save();

        req.session.user = {
            id: user._id,
            username: user.username,
            role: user.role,
            email: user.email
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

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

module.exports = router;
