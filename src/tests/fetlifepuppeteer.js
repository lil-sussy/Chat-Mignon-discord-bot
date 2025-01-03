const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

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

	// Set the headers for the page
	await page.setExtraHTTPHeaders({
		"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.5938.132 Safari/537.36",
		"Accept-Language": "en-US,en;q=0.9",
		"Accept-Encoding": "gzip, deflate, br, zstd",
		"Content-Type": "application/x-www-form-urlencoded",
		"Upgrade-Insecure-Requests": "1",
		"Sec-Fetch-Dest": "document",
		"Sec-Fetch-Mode": "navigate",
		"Sec-Fetch-Site": "same-origin",
		"Sec-Fetch-User": "?1",
		Priority: "u=0, i",
		Pragma: "no-cache",
		"Cache-Control": "no-cache",
	});

	// Go to the login page, wait for basic DOM to load
	await page.goto("https://fetlife.com/login", { waitUntil: "domcontentloaded" });

	// Update the selectors if necessary
	const usernameSelector = 'input[name="user[login]"]'; // Verify this selector
	const passwordSelector = 'input[name="user[password]"]'; // Verify this selector

	try {
		// Wait for the username input to be available
		await page.waitForSelector(usernameSelector, { timeout: 5000 });
		// Wait for the password input to be available
		await page.waitForSelector(passwordSelector, { timeout: 5000 });

		// Fill in the login form
		await page.type(usernameSelector, process.env.FETLIFE_USERNAME);
		await page.type(passwordSelector, process.env.FETLIFE_PASSWORD);

		// Submit the form and wait for navigation
		await Promise.all([page.click('button[type="submit"]'), page.waitForNavigation({ waitUntil: "networkidle2" })]);

		// Log or inspect the page content once logged in
		// Wait for Cloudflare check (when the title no longer contains "Just a moment...")
		await page.waitForFunction(() => document.title && !document.title.includes("Just a moment..."), { timeout: 600000 });
		await page.waitForFunction(() => document.title && !document.title.includes("Checking if the site connection is secure..."), { timeout: 60000 });
		const content = await page.content();
		console.log(content);
	} catch (error) {
		console.error("Error during login process:", error.message);
	} finally {
		await browser.close();
	}
}

// Execute Puppeteer login
loginWithPuppeteer().catch(console.error);
