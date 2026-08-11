const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    // Emulate iPhone 11 (iOS 14)
    await page.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1");
    
    await page.goto("https://zoom.us/rec/share/Su_Qaxd8jBbBF0q3j5Pte-4MluE393oGMc3wcracxpa6hMR-d_REywIrW6LH-nv4.bMb5n7NAmOMfKPGn?startTime=1781959294000");
    
    const cookies = await page.cookies();
    const zm = cookies.find(c => c.name === '_zm_ssid');
    if (zm) {
        console.log("_zm_ssid HttpOnly:", zm.httpOnly);
    } else {
        console.log("_zm_ssid not found. All cookies:", cookies.map(c => c.name));
    }
    
    await browser.close();
})();
