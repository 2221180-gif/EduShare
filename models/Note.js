const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    resource: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Resource'
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    },
    lessonId: String, // For specific lesson within a course
    title: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        required: true
    },
    videoTimestamp: {
        type: Number, // in seconds
        default: null
    },
    tags: [String],
    color: {
        type: String,
        default: '#FFD93D' // Yellow highlight
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

// Update timestamp on save
noteSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Index for efficient queries
noteSchema.index({ user: 1, createdAt: -1 });
noteSchema.index({ user: 1, resource: 1 });
noteSchema.index({ user: 1, course: 1 });

module.exports = mongoose.model('Note', noteSchema);
