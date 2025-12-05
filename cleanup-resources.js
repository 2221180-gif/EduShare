require('dotenv').config();
const mongoose = require('mongoose');
const Resource = require('./models/Resource');
const https = require('https');
const fs = require('fs');
const path = require('path');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    console.log('Connected to MongoDB');
    console.log('Scanning for broken resources...');

    const resources = await Resource.find();
    let deletedCount = 0;

    for (const resource of resources) {
        if (!resource.fileUrl) continue;

        const fileUrl = resource.fileUrl;
        console.log(`Checking: ${resource.title} -> ${fileUrl}`);

        if (fileUrl.startsWith('http')) {
            // Check remote URL (Cloudinary)
            await new Promise((resolve) => {
                // Handle spaces in URL
                const encodedUrl = encodeURI(fileUrl);
                https.get(encodedUrl, async (res) => {
                    if (res.statusCode === 404) {
                        console.log(`Deleting broken remote resource: ${resource.title}`);
                        await Resource.findByIdAndDelete(resource._id);
                        deletedCount++;
                    }
                    resolve();
                }).on('error', (e) => {
                    console.error(`Error checking ${resource.title}:`, e.message);
                    resolve();
                });
            });
        } else {
            // Check local file
            // Assuming relative paths are in 'public' folder
            const localPath = path.join(__dirname, 'public', decodeURI(fileUrl));
            if (!fs.existsSync(localPath)) {
                console.log(`Deleting broken local resource: ${resource.title} (File not found: ${localPath})`);
                await Resource.findByIdAndDelete(resource._id);
                deletedCount++;
            }
        }
    }

    console.log(`Cleanup complete. Deleted ${deletedCount} broken resources.`);
    mongoose.disconnect();
});
