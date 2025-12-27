const fs = require('fs');
const https = require('https');

const url = "https://www.lcw.com/erkek-kontrast-yaka-yikamali-relax-fit-ceket-kahverengi-kahverengi-o-5230931";
const file = fs.createWriteStream("lcw_dump.html");

https.get(url, {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
}, function (response) {
    response.pipe(file);
    file.on('finish', function () {
        file.close(() => console.log('Download complete'));
    });
}).on('error', function (err) {
    fs.unlink("lcw_dump.html");
    console.error("Error:", err.message);
});
