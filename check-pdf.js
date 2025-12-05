const https = require('https');

const url = 'https://res.cloudinary.com/dzypxcb9n/image/upload/v1733217992/edushare_resources/zt7davrcqons.pdf';

console.log('Checking URL:', url);

https.get(url, (res) => {
    console.log('Status Code:', res.statusCode);
    console.log('Headers:', res.headers);

    if (res.statusCode === 200) {
        console.log('URL is accessible.');
    } else {
        console.log('URL failed.');
    }
}).on('error', (e) => {
    console.error('Error:', e);
});
