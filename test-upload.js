require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

async function testUpload() {
    console.log('Testing Cloudinary Upload...');
    const testFile = 'test.txt';
    fs.writeFileSync(testFile, 'This is a test file for EduShare.');

    try {
        const result = await cloudinary.uploader.upload(testFile, {
            resource_type: 'auto',
            folder: 'edushare_test'
        });
        console.log('Upload Successful!');
        console.log('URL:', result.secure_url);
    } catch (error) {
        console.error('Upload Failed:', error);
    } finally {
        fs.unlinkSync(testFile);
    }
}

testUpload();
