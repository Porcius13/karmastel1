const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function testFetch() {
    const url = 'https://www.supplementler.com/urun/weider-premium-whey-protein-2300-gr-6510';
    try {
        const res = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            }
        });
        const $ = cheerio.load(res.data);
        const data = {
            title: $('title').text(),
            ogImage: $('meta[property="og:image"]').attr('content'),
            twitterImage: $('meta[name="twitter:image"]').attr('content'),
            ldJson: $('script[type="application/ld+json"]').html(),
            images: []
        };

        $('img').each((i, el) => {
            data.images.push({
                src: $(el).attr('src'),
                dataSrc: $(el).attr('data-src'),
                class: $(el).attr('class'),
                id: $(el).attr('id')
            });
        });

        fs.writeFileSync('scripts/supplementler_data.json', JSON.stringify(data, null, 2));
        console.log('Data saved to scripts/supplementler_data.json');
    } catch (e) {
        console.error('Fetch failed:', e.message);
    }
}

testFetch();
