const fs = require('fs');
const html1 = fs.readFileSync('/tmp/zoom_page.html', 'utf8');

const startIndex = html1.indexOf('window.__data__ = ');
if (startIndex !== -1) {
    const substring = html1.substring(startIndex);
    const endIndex = substring.indexOf('\n</script>');
    if (endIndex !== -1) {
        let jsonStr = substring.substring('window.__data__ = '.length, endIndex);
        jsonStr = jsonStr.trim().replace(/;$/, '');
        console.log(jsonStr.substring(0, 500));
    }
}
