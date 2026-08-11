const fs = require('fs');
const html = fs.readFileSync('/tmp/zoom_page.html', 'utf8');
const match = html.match(/window\.__data__\s*=\s*(\{.*?\});/);
if (match) {
    const data = JSON.parse(match[1]);
    console.log(JSON.stringify(data, null, 2).substring(0, 500));
}
