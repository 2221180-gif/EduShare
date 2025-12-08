const mongoose = require('mongoose');

const forumSchema = new mongoose.Schema({
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    },
    resource: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Resource'
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['question', 'discussion', 'announcement', 'general'],
        default: 'general'
    },
    tags: [String],
    isPinned: {
        type: Boolean,
        default: false
    },
    isLocked: {
        type: Boolean,
        default: false
    },
    replies: [{
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        content: {
            type: String,
            required: true
        },
        isAnswer: {
            type: Boolean,
            default: false
        },
        votes: {
            up: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            }],
            down: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            }]
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        updatedAt: {
            type: Date,
            default: Date.now
        }
    }],
    views: {
        type: Number,
        default: 0
    },
    votes: {
        up: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        down: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }]
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

// Virtual for reply count
forumSchema.virtual('replyCount').get(function () {
    return this.replies.length;
});

// Virtual for vote score
forumSchema.virtual('voteScore').get(function () {
    return this.votes.up.length - this.votes.down.length;
});

// Update timestamp on save
forumSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Ensure virtuals are included
forumSchema.set('toJSON', { virtuals: true });
forumSchema.set('toObject', { virtuals: true });

// Index for efficient queries
forumSchema.index({ course: 1, createdAt: -1 });
forumSchema.index({ resource: 1, createdAt: -1 });
forumSchema.index({ category: 1, createdAt: -1 });

module.exports = mongoose.model('Forum', forumSchema);
