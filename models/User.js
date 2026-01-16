const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['student', 'teacher', 'admin'],
        default: 'student'
    },
    profile: {
        bio: String,
        subjects: [String],
        avatar: String,
        gradeLevel: String,
        department: {
            type: String,
            enum: [
                'Computer Science & Engineering',
                'Electrical & Electronic Engineering',
                'Mechanical Engineering',
                'Civil Engineering',
                'Business Administration',
                'Economics',
                'English',
                'Mathematics',
                'Physics',
                'Chemistry',
                'Biology',
                'Pharmacy',
                'Architecture',
                'Textile Engineering',
                'Law',
                'Medicine',
                'Other'
            ]
        }
    },
    gamification: {
        points: { type: Number, default: 0 },
        uploads: { type: Number, default: 0 },
        downloads: { type: Number, default: 0 },
        badges: [{
            badgeId: String,
            earnedAt: { type: Date, default: Date.now }
        }],
        streak: {
            current: { type: Number, default: 0 },
            longest: { type: Number, default: 0 },
            lastActivity: Date
        }
    },
    favorites: {
        resources: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Resource'
        }],
        courses: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course'
        }]
    },
    enrolledCourses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    }],
    completedCourses: [{
        course: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course'
        },
        completedAt: Date
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
