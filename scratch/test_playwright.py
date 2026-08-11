import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # Emulate iPhone 11 (iOS 14)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
            viewport={"width": 414, "height": 896},
            is_mobile=True,
            has_touch=True
        )
        page = await context.new_page()
        print("Navigating...")
        await page.goto("https://zoom.us/rec/share/Su_Qaxd8jBbBF0q3j5Pte-4MluE393oGMc3wcracxpa6hMR-d_REywIrW6LH-nv4.bMb5n7NAmOMfKPGn?startTime=1781959294000")
        
        print("Waiting for video element...")
        try:
            await page.wait_for_selector("video", timeout=10000)
        except:
            print("No video tag found initially. Clicking play button...")
            try:
                await page.click(".vjs-big-play-button, .play-button")
                await page.wait_for_selector("video", timeout=5000)
            except:
                pass
                
        # Wait 3 seconds to let React populate the video src
        await page.wait_for_timeout(3000)
        
        src = await page.evaluate("() => { const v = document.querySelector('video'); return v ? v.src : 'No video'; }")
        print("Video SRC:", src)
        
        await browser.close()

asyncio.run(main())
