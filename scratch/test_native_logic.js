const url = "https://zoom.us/rec/share/Su_Qaxd8jBbBF0q3j5Pte-4MluE393oGMc3wcracxpa6hMR-d_REywIrW6LH-nv4.bMb5n7NAmOMfKPGn?startTime=1781959294000";

async function run() {
    const res1 = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html1 = await res1.text();
    const cookiesArr = res1.headers.getSetCookie();
    const cookieStr = cookiesArr.map(c => c.split(';')[0]).join('; ');
    
    const mIdMatch = html1.match(/meetingId:\s*'([^']+)'/);
    const meetingId = mIdMatch[1];
    
    const res2 = await fetch(`https://zoom.us/nws/recording/1.0/play/share-info/${meetingId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': cookieStr, 'Referer': url }
    });
    const json2 = await res2.json();
    const redirectUrl = json2.result.redirectUrl;
    
    const res3 = await fetch(`https://zoom.us${redirectUrl}`, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': cookieStr, 'Referer': url }
    });
    const html3 = await res3.text();
    
    const fIdMatch = html3.match(/fileId:\s*'([^']+)'/);
    const fileId = fIdMatch[1];
    
    const res4 = await fetch(`https://zoom.us/nws/recording/1.0/play/info/${fileId}?continueMode=true&startTime=1781959294000`, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': cookieStr, 'Referer': `https://zoom.us${redirectUrl}` }
    });
    const json4 = await res4.json();
    console.log("SUCCESS!", json4.result.viewMp4Url.substring(0, 50) + "...");
}
run();
