require('dotenv').config();
const mongoose = require('mongoose');
const Resource = require('./models/Resource');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    console.log('Connected to MongoDB');
    try {
        const resource = await Resource.findOne().sort({ createdAt: -1 });
        if (resource) {
            console.log('Latest Resource:', {
                title: resource.title,
                fileUrl: resource.fileUrl,
                fileType: resource.fileType
            });
        } else {
            console.log('No resources found');
        }
    } catch (err) {
        console.error(err);
    } finally {
        mongoose.disconnect();
    }
});
