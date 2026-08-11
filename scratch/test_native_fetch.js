const url = "https://zoom.us/rec/share/Su_Qaxd8jBbBF0q3j5Pte-4MluE393oGMc3wcracxpa6hMR-d_REywIrW6LH-nv4.bMb5n7NAmOMfKPGn?startTime=1781959294000";

async function run() {
    console.log("Fetching share URL...");
    const res1 = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html1 = await res1.text();
    const cookies = res1.headers.getSetCookie();
    console.log("Cookies:", cookies ? cookies.length : 0);

    let cookieStr = cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '';

    const match1 = html1.match(/window\.__data__\s*=\s*(\{.*?\});/s);
    if (!match1) return console.log("No __data__ in step 1");
    
    const data1 = JSON.parse(match1[1]);
    const meetingId = data1.meetingId;
    console.log("Meeting ID:", meetingId);

    const api_url = `https://zoom.us/nws/recording/1.0/play/share-info/${meetingId}`;
    console.log("Fetching share-info API...", api_url);
    const res2 = await fetch(api_url, { 
        headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': cookieStr } 
    });
    const json2 = await res2.json();
    console.log("Redirect URL:", json2.result.redirectUrl);
    
    const viewUrl = `https://zoom.us${json2.result.redirectUrl}`;
    console.log("Fetching view URL...", viewUrl);
    const res3 = await fetch(viewUrl, { 
        headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': cookieStr } 
    });
    const html3 = await res3.text();
    
    const match3 = html3.match(/window\.__data__\s*=\s*(\{.*?\});/s);
    if (!match3) return console.log("No __data__ in step 3");
    
    const data3 = JSON.parse(match3[1]);
    // Try to find the mp4 URL
    // JSON.stringify to easily search for .mp4
    const str = JSON.stringify(data3);
    const mp4Match = str.match(/https:\/\/[^"]*\.mp4[^"]*/);
    console.log("Found MP4 URL:", mp4Match ? mp4Match[0].substring(0, 50) + "..." : "Not found");
}
run();
