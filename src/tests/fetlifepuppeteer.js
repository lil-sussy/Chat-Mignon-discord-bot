const puppeteer = require("puppeteer-extra");
const fs = require("fs"); // Import the fs module
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const randomUseragent = require('random-useragent');

puppeteer.use(StealthPlugin());

async function loginWithPuppeteer() {
	const browser = await puppeteer.launch({
		headless: false,
		args: [
			'--no-sandbox',
			'--disable-setuid-sandbox',
			'--disable-infobars',
			'--window-position=0,0',
			'--ignore-certifcate-errors',
			'--ignore-certifcate-errors-spki-list',
		],
	});
	const page = await browser.newPage();

	// Set a random user agent
	const userAgent = randomUseragent.getRandom();
	await page.setUserAgent(userAgent);

	// Set the headers for the page
	await page.setExtraHTTPHeaders({
		"accept": "*/*",
		"accept-encoding": "gzip, deflate, br, zstd",
		"accept-language": "en-US,en;q=0.9,fr;q=0.8",
		"cache-control": "no-cache",
		"cookie": "language=en; fetlife_pwa=none; remember_user_token=eyJfcmFpbHMiOnsibWVzc2FnZSI6Ilcxc3hPRGs1TWpFM01GMHNJaVF5WVNReE1pUllhQzh4TUVaWVpYWmlSMjlrUjJkR1pHVkVNM0oxSWl3aU1UY3pOemM1T0RnM01pNDJNekF3TlRZNUlsMD0iLCJleHAiOiIyMDI1LTAyLTA4VDA5OjU0OjMyLjYzMFoiLCJwdXIiOiJjb29raWUucmVtZW1iZXJfdXNlcl90b2tlbiJ9fQ%3D%3D--edff78c1208bce8960c95d0fb13549f6bc910628; _fl_sessionid=19f3f79d766602742b5af1527f6fb118; __cf_bm=2u2a4uCO1ouI8kosqQRo3BLLDuAdx3wrwFllYFNZauU-1737798872-1.0.1.1-a7oc8PmUPQ0Yoq5RukJ1r4_JH3YNrpKjh9s9cW7H4p6nFIVi2B_BeaB0sXGIqisdKk7dngEaXm2X17ISrIK89pe_r1avOkXoyqMyQjGL6.s; _cfuvid=OE9cOkPlUK_G1kYBe0mzbXOI4zYlOjKEY7zN4xL98Vs-1737798872702-0.0.1.1-604800000; cf_clearance=EHjMdIURJGof.xD0SAJROfmq4npw4yMiBClRjrgbXH0-1737798873-1.2.1.1-7CUbFUPmPhRF5R.mRv44qQhUiMPOM1aZ2bEkQ7w3Azm2CBsMOePvpLlo.wQHjO9ClVfrruhP1vfHFudRLuDtd4nB6yICwKEyfpLqkrV9qN6xaJiKXP7V6Ywzlr54FVL3zXBkckYnLslm.3GJv2JAD5UMxRt1ZrjUIhcO1UozxqDSsuLgMvtBooxk03jlYCDvJVkUb_n06pZBd1frbsc7hoKSPur9raiq6IDOCTNWmjLu21P3rUjBm7C2J8cJCjL5hIkmrsBLCvQx2OvK_P8.ZLRsqkuFJMYnJUP04Cx8SfQ",
		"pragma": "no-cache",
		"priority": "u=1, i",
		"sec-ch-ua": "\"Chromium\";v=\"130\", \"Google Chrome\";v=\"130\", \"Not?A_Brand\";v=\"99\"",
		"sec-ch-ua-arch": "\"x86\"",
		"sec-ch-ua-bitness": "\"64\"",
		"sec-ch-ua-full-version": "\"130.0.6723.193\"",
		"sec-ch-ua-full-version-list": "\"Chromium\";v=\"130.0.6723.193\", \"Google Chrome\";v=\"130.0.6723.193\", \"Not?A_Brand\";v=\"99.0.0.0\"",
		"sec-ch-ua-mobile": "?0",
		"sec-ch-ua-model": "\"\"",
		"sec-ch-ua-platform": "\"Linux\"",
		"sec-ch-ua-platform-version": "\"6.12.10\"",
		"sec-fetch-dest": "empty",
		"sec-fetch-mode": "no-cors",
		"sec-fetch-site": "same-origin",
		"Referer": "https://fetlife.com/login",
		"Origin": "https://fetlife.com",
	});

	// Go to the login page, wait for basic DOM to load
	await page.goto("https://fetlife.com/login", { waitUntil: "domcontentloaded" });

	try {
		await page.waitForFunction(() => document.title && !document.title.includes("Just a moment..."), { timeout: 600000 });
		await page.waitForFunction(() => document.title && !document.title.includes("Checking if the site connection is secure..."), { timeout: 60000 });
		await page.waitForFunction(() => document.title && !document.title.includes("please unblock challenges.cloudflare.com to proceed."), { timeout: 60000 });
		const content = await page.content();
    fs.writeFileSync("./src/tests/cringe/login.html", content, "utf8");

		await page.goto("https://fetlife.com/events/near", { waitUntil: "domcontentloaded" });
		await page.waitForFunction(() => document.title && !document.title.includes("please unblock challenges.cloudflare.com to proceed."), { timeout: 60000 });
		await page.waitForFunction(() => document.title && !document.title.includes("Login | FetLife"), { timeout: 60000 });
		await page.waitForFunction(() => document.title && !document.title.includes("Just a moment..."), { timeout: 600000 });
		await page.waitForFunction(() => document.title && !document.title.includes("Checking if the site connection is secure..."), { timeout: 60000 });
    fs.writeFileSync("./src/tests/cringe/events.html", content, "utf8");
	} catch (error) {
		console.error("Error during login process:", error.message);
	} finally {
		await browser.close();
	}
}

// Execute Puppeteer login
loginWithPuppeteer().catch(console.error);
