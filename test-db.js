const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/edushare', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(async () => {
    console.log('MongoDB connected');

    const Resource = require('./models/Resource');
    const count = await Resource.countDocuments();
    console.log('Total resources in database:', count);

    if (count > 0) {
        const resources = await Resource.find().limit(6).populate('uploader', 'username');
        console.log('\nSample resources:');
        resources.forEach((r, i) => {
            console.log(`${i + 1}. ${r.title} by ${r.uploader ? r.uploader.username : 'Unknown'}`);
        });
    } else {
        console.log('\n⚠️ No resources found in database!');
    }

    process.exit(0);
}).catch(err => {
    console.error('MongoDB error:', err.message);
    process.exit(1);
});
