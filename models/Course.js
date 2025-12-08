const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    instructor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    thumbnail: {
        type: String,
        default: ''
    },
    category: {
        type: String,
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    gradeLevel: {
        type: String,
        required: true
    },
    isPremium: {
        type: Boolean,
        default: false
    },
    price: {
        type: Number,
        default: 0,
        min: 0
    },
    chapters: [{
        title: {
            type: String,
            required: true
        },
        description: String,
        order: {
            type: Number,
            required: true
        },
        lessons: [{
            title: {
                type: String,
                required: true
            },
            description: String,
            type: {
                type: String,
                enum: ['video', 'article', 'quiz', 'resource'],
                default: 'article'
            },
            content: String, // URL for video, text for article
            resource: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Resource'
            },
            duration: Number, // in minutes
            order: {
                type: Number,
                required: true
            },
            isFree: {
                type: Boolean,
                default: false
            }
        }]
    }],
    learningObjectives: [String],
    prerequisites: [String],
    tags: [String],
    difficulty: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
        default: 'beginner'
    },
    estimatedDuration: {
        type: Number, // in hours
        default: 0
    },
    enrolledStudents: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    ratings: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        value: {
            type: Number,
            min: 1,
            max: 5
        },
        comment: String,
        date: {
            type: Date,
            default: Date.now
        }
    }],
    views: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'],
        default: 'draft'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Calculate total lessons and duration
courseSchema.virtual('totalLessons').get(function () {
    return this.chapters.reduce((total, chapter) => total + chapter.lessons.length, 0);
});

// Calculate average rating
courseSchema.virtual('averageRating').get(function () {
    if (this.ratings.length === 0) return 0;
    const sum = this.ratings.reduce((acc, r) => acc + r.value, 0);
    return (sum / this.ratings.length).toFixed(1);
});

// Update timestamp on save
courseSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Ensure virtuals are included in JSON
courseSchema.set('toJSON', { virtuals: true });
courseSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Course', courseSchema);
