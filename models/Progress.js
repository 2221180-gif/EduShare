const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    enrolledAt: {
        type: Date,
        default: Date.now
    },
    completedLessons: [{
        chapterIndex: Number,
        lessonIndex: Number,
        completedAt: {
            type: Date,
            default: Date.now
        }
    }],
    quizScores: [{
        quizId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Quiz'
        },
        score: Number,
        attemptsCount: Number,
        lastAttemptDate: Date
    }],
    lastAccessedLesson: {
        chapterIndex: Number,
        lessonIndex: Number
    },
    lastAccessedAt: {
        type: Date,
        default: Date.now
    },
    completionPercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    certificateIssued: {
        type: Boolean,
        default: false
    },
    certificateIssuedAt: Date,
    notes: [{
        lessonId: String,
        content: String,
        timestamp: Number, // for video timestamps
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    bookmarks: [{
        chapterIndex: Number,
        lessonIndex: Number,
        addedAt: {
            type: Date,
            default: Date.now
        }
    }]
});

// Create compound index for efficient queries
progressSchema.index({ user: 1, course: 1 }, { unique: true });

// Method to mark lesson as complete
progressSchema.methods.completeLesson = function (chapterIndex, lessonIndex) {
    const existing = this.completedLessons.find(
        l => l.chapterIndex === chapterIndex && l.lessonIndex === lessonIndex
    );

    if (!existing) {
        this.completedLessons.push({
            chapterIndex,
            lessonIndex,
            completedAt: new Date()
        });
    }

    this.lastAccessedLesson = { chapterIndex, lessonIndex };
    this.lastAccessedAt = new Date();
};

// Method to calculate and update completion percentage
progressSchema.methods.updateCompletionPercentage = async function () {
    const Course = mongoose.model('Course');
    const course = await Course.findById(this.course);

    if (!course) return;

    const totalLessons = course.chapters.reduce((total, chapter) =>
        total + chapter.lessons.length, 0
    );

    if (totalLessons > 0) {
        this.completionPercentage = Math.round(
            (this.completedLessons.length / totalLessons) * 100
        );
    }
};

// Method to check if course is completed
progressSchema.methods.isCompleted = function () {
    return this.completionPercentage === 100;
};

module.exports = mongoose.model('Progress', progressSchema);
