const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    // Emulate iPhone 11 (iOS 14)
    await page.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1");
    await page.setViewport({ width: 414, height: 896, isMobile: true, hasTouch: true });
    
    console.log("Navigating...");
    await page.goto("https://zoom.us/rec/share/Su_Qaxd8jBbBF0q3j5Pte-4MluE393oGMc3wcracxpa6hMR-d_REywIrW6LH-nv4.bMb5n7NAmOMfKPGn?startTime=1781959294000");
    
    console.log("Waiting for video element...");
    try {
        await page.waitForSelector('video', { timeout: 10000 });
    } catch (e) {
        console.log("No video tag found initially. Clicking play button...");
        try {
            await page.click('.vjs-big-play-button, .play-button, button');
            await page.waitForSelector('video', { timeout: 5000 });
        } catch (e2) {}
    }
    
    // Wait 3 seconds
    await new Promise(r => setTimeout(r, 3000));
    
    const src = await page.evaluate(() => {
        const v = document.querySelector('video');
        return v ? v.src : 'No video';
    });
    console.log("Video SRC:", src);
    
    await browser.close();
})();
