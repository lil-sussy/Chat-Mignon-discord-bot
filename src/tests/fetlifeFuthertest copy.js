// fetchLoginPage.js
const axios = require("axios");
const { URLSearchParams } = require("url");
const fs = require("fs"); // Import the fs module
const { wrapper: axiosCookieJarSupport } = require("axios-cookiejar-support");
const { CookieJar } = require("tough-cookie");

// Create a dedicated axios instance with cookie jar support
const cookieJar = new CookieJar();
const axiosInstance = axios.create({
	baseURL: "https://fetlife.com",
	withCredentials: true,
	headers: {
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
	},
});
axiosCookieJarSupport(axiosInstance);

const fetlifeBaseUrl = "https://fetlife.com"; // Base URL
async function fetchCsrfToken() {
	const signInPage = await axiosInstance.get(`/login`, {
		headers: {
			"User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0",
				Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
				"Accept-Language": "en-US,en;q=0.5",
				"Accept-Encoding": "gzip, deflate, br, zstd",
				Referer: "https://fetlife.com/logged_out",
				"Upgrade-Insecure-Requests": "1",
				"Sec-Fetch-Dest": "document",
				"Sec-Fetch-Mode": "navigate",
				"Sec-Fetch-Site": "same-origin",
				"Sec-Fetch-User": "?1",
				Connection: "keep-alive",
				Cookie: "language=en; fetlife_pwa=none; ",
		},
	});

	// 2) Parse the HTML & get CSRF token
	return findCsrfToken(signInPage.data);
}

function findCsrfToken(str) {
	const m = str.match(/<meta name="csrf-token" content="([^"]+)"/);
	const decodedNumericEntities = m[1].replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
	return m ? decodedNumericEntities : false;
}

function findUserId(str) {
	// same regex approach as in PHP
	let m = str.match(/FL.user = {\s*id\s*=\s*([0-9]+);/);
	if (!m) {
		m = str.match(/var currentUserId\s*=\s*([0-9]+)/);
	}
	return m ? m[1] : false;
}

async function fetchCookiesFromUrls(urls) {
	const cookies = new Map();
	for (const url of urls) {
		const response = await axiosInstance.get(url, {
			headers: {
				// "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0",
				// Accept: "*/*",
				// "Accept-Language": "en-US,en;q=0.5",
				// "Accept-Encoding": "gzip, deflate, br, zstd",
				// Referer: "https://fetlife.com/",
				// Origin: "https://fetlife.com",
				// "Sec-Fetch-Dest": "script",
				// "Sec-Fetch-Mode": "cors",
				// "Sec-Fetch-Site": "same-site",
				// Connection: "keep-alive",
				Referer: "https://fetlife.com/",
				Origin: "https://fetlife.com",
			},
		});
		const setCookies = response.headers["set-cookie"];
		if (setCookies) {
			setCookies.forEach((cookie) => {
				const cookieName = cookie.split("=")[0];
				cookies.set(cookieName, cookie);
				cookieJar.setCookieSync(cookie, url);
			});
		}
	}
	return cookies;
}

// Simplify normalHeaders or remove it altogether if you like.
// No explicit Cookie header so the jar is the single source of truth.

// Function to fetch the login page
async function fetchLoginPage() {
	try {
		const urls = [
			"https://gav2.fetlife.com/vite/assets/i18n-en-B32nWQ9x.js",
			"https://gav2.fetlife.com/vite/assets/application_style-BJSyJdCu.js",
			"https://gav2.fetlife.com/vite/assets/i18n-DokRD9wR.js",
			"https://gav2.fetlife.com/vite/assets/application-eEsEIcSA.js",
			"https://gav2.fetlife.com/vite/assets/controller-CrcZEXPm.js",
			"https://gav2.fetlife.com/vite/assets/tags_input-Bz3J-wsg.js",
			"https://gav2.fetlife.com/vite/assets/form_validator_controller-C5VsjArb.js",
			"https://gav2.fetlife.com/vite/assets/index-DKqD94ZC.js",
			"https://gav2.fetlife.com/vite/assets/dom_ready-DM2Vf_4Q.js",
			"https://gav2.fetlife.com/vite/assets/edit_tags-3aC6V8EV.js",
			"https://gav2.fetlife.com/vite/assets/index-BriLBh9p.js",
			"https://gav2.fetlife.com/vite/assets/push_notifications_firebase-D0-dJ6DL.js",
			"https://gav2.fetlife.com/vite/assets/polyfills-legacy-CBq8z5GW.js",
			"https://gav2.fetlife.com/vite/assets/application-legacy-DwJHEEKc.js",
			"https://gav2.fetlife.com/vite/assets/i18n-en-legacy-DGf0JAVa.js",
		];
		const cookiesMap = await fetchCookiesFromUrls(urls);

		// Now use the pre-configured axiosInstance
		const data = await fetchEventsNear();

    const events = [];
		
		for (const event of data) {
			const eventID = event.id; // Assuming each event object has an 'id' property
      events.append(await fetchEventRsvps(eventID))
		}

    console.log(events)

		let response = await axiosInstance.get("/login", {
			Referer: "https://fetlife.com/",
			Origin: "https://fetlife.com",
		});

		const setCookies = response.headers["set-cookie"] || [];
		setCookies.forEach((cookie) => {
			const cookieName = cookie.split("=")[0];
			cookiesMap.set(cookieName, cookie);
			cookieJar.setCookieSync(cookie, `${fetlifeBaseUrl}/login`);
		});

		let html = response.data;
		const csrfToken = findCsrfToken(html);
		fs.writeFileSync("./src/tests/cringe/login.html", html, "utf8");

		const postData = new URLSearchParams({
			"user[login]": process.env.FETLIFE_USERNAME,
			"user[password]": process.env.FETLIFE_PASSWORD,
			"user[locale]": "en",
			"user[otp_attempt]": "step_2",
			authenticity_token: csrfToken,
		});

		response = await axiosInstance.post("/login", postData.toString(), {
			headers: {
				Referrer: "https://fetlife.com/login",
			}
		});

		html = response.data;
		fs.writeFileSync("./src/tests/cringe/postLogin.html", html, "utf8");

		const userID = findUserId(html);
		console.log("Response Status:", response.status);
		console.log("new cookies", response.headers["set-cookie"]);
		console.log(
			"ui cookie",
			response.headers["set-cookie"]?.find((cookie) => cookie.startsWith("ui"))
		);
		console.log("UserID:", userID);
	} catch (error) {
		console.error("Error fetching the login page:", error.message);
	}
}

async function fetchEventsNear() {
	try {
		const now = new Date();
		const fromDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
		const fromTime = now.toISOString(); // Full ISO string

		const response = await axiosInstance.get('/events/near', {
			params: {
				page: 1,
				'categories[]': 'bdsm_party',
				mapbox_location_id: 'locality.510541',
				'search[long]': 2.383964,
				'search[lat]': 48.889484,
				'search[range]': 50000,
				'search[place_name]': '19th arrondissement, Paris, Île-de-France, France',
				'search[bbox]': '2.364728,48.872049,2.41082,48.902148',
				from_date: fromDate,
				from_time: fromTime
			},
			headers: {
				'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:134.0) Gecko/20100101 Firefox/134.0',
				Accept: 'application/json',
				'Accept-Language': 'en-US,en;q=0.5',
				'Accept-Encoding': 'gzip, deflate, br, zstd',
				Referer: 'https://fetlife.com/events/near',
				'Content-Type': 'application/json',
				'Sec-Fetch-Dest': 'empty',
				'Sec-Fetch-Mode': 'cors',
				'Sec-Fetch-Site': 'same-origin',
				Connection: 'keep-alive',
				Cookie: 'language=en; _cfuvid=bGHXyKTYlobwXS_7t6yMj6Y8qgNdotK9Nc6mLLi2PSA-1736477463445-0.0.1.1-604800000; fetlife_pwa=none; _fl_sessionid=653d1fd8dcdb09797e3de869763d5a7b; __cf_bm=NFK4ONvbhGa.sSZ.Quz_OEONDBz3uq6kxVlH.lEIlLE-1736477463-1.0.1.1-SqhiEvO3opeOXClz56lvLts6WedZBIC4FmMq2YprsTr62htULj1R9nPi9Mru0oXwfoKLXe8DbokpPDZsrUUo0Z9kVLwUesWoGZB4EDRA7ss; cf_clearance=RrdV0ivIzVrhanYjA1KvjY2Hfeu_miH2CGp9qCyN15Q-1736477464-1.2.1.1-RD7FoF1xDCGxosBpHcrplmoCG3F65zcgraUh7GtgU6hyqzASW1aDOm4x_0F3uG9LUoFDAgX.7281oiMgpIm_12E1YqxoH8QtmIxydbr31VON_.GxuWZOvRE_hIMGNGoEnwH3LDMw6K_OuQQkWCm2Uhb6OI3YGzoGkUx_KmIKYkvLTg427FX.pH.A7E.rtxQpwe_wKVoPOEHqY27WnAJ43g4BNi_wVt4zmIYPEGIOYnPsCxDV0IaHt_eZDyqOMFShlHVJrwqrnPB0Yk7eqnab1hfEVBJL3Tel9sQi2U0rm2DqsiXG4BiLEteNr_pFVwu7mlB73Drymmoo2Td5h2Rfhw; remember_user_token=eyJfcmFpbHMiOnsibWVzc2FnZSI6Ilcxc3lNRGd3TkRjd05WMHNJaVF5WVNReE1pUTFUM052T0VsSlZVUnVhVkI0ZWs4dk5tNXhMbTVsSWl3aU1UY3pOalEzTnpRNE15NDNOakEzTWpNMElsMD0iLCJleHAiOiIyMDI1LTAxLTI0VDAyOjUxOjIzLjc2MFoiLCJwdXIiOiJjb29raWUucmVtZW1iZXJfdXNlcl90b2tlbiJ9fQ%3D%3D--07fb71169dd175450bf671260464ef82e3a698db'
			}
		});

		console.log('Response Data:', response.data);
		return response.data;
	} catch (error) {
		console.error('Error fetching events near:', error.message);
	}
}

async function fetchEventRsvps(eventID) {
	try {
		const response = await axiosInstance.get(`/events/${eventID}/rsvps`, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:134.0) Gecko/20100101 Firefox/134.0',
				Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
				'Accept-Language': 'en-US,en;q=0.5',
				'Accept-Encoding': 'gzip, deflate, br, zstd',
				Referer: `https://fetlife.com/events/${eventID}`,
				'Upgrade-Insecure-Requests': '1',
				'Sec-Fetch-Dest': 'document',
				'Sec-Fetch-Mode': 'navigate',
				'Sec-Fetch-Site': 'same-origin',
				'Sec-Fetch-User': '?1',
				Connection: 'keep-alive',
				Cookie: 'language=en; _cfuvid=bGHXyKTYlobwXS_7t6yMj6Y8qgNdotK9Nc6mLLi2PSA-1736477463445-0.0.1.1-604800000; fetlife_pwa=none; _fl_sessionid=653d1fd8dcdb09797e3de869763d5a7b; __cf_bm=NFK4ONvbhGa.sSZ.Quz_OEONDBz3uq6kxVlH.lEIlLE-1736477463-1.0.1.1-SqhiEvO3opeOXClz56lvLts6WedZBIC4FmMq2YprsTr62htULj1R9nPi9Mru0oXwfoKLXe8DbokpPDZsrUUo0Z9kVLwUesWoGZB4EDRA7ss; cf_clearance=RrdV0ivIzVrhanYjA1KvjY2Hfeu_miH2CGp9qCyN15Q-1736477464-1.2.1.1-RD7FoF1xDCGxosBpHcrplmoCG3F65zcgraUh7GtgU6hyqzASW1aDOm4x_0F3uG9LUoFDAgX.7281oiMgpIm_12E1YqxoH8QtmIxydbr31VON_.GxuWZOvRE_hIMGNGoEnwH3LDMw6K_OuQQkWCm2Uhb6OI3YGzoGkUx_KmIKYkvLTg427FX.pH.A7E.rtxQpwe_wKVoPOEHqY27WnAJ43g4BNi_wVt4zmIYPEGIOYnPsCxDV0IaHt_eZDyqOMFShlHVJrwqrnPB0Yk7eqnab1hfEVBJL3Tel9sQi2U0rm2DqsiXG4BiLEteNr_pFVwu7mlB73Drymmoo2Td5h2Rfhw; remember_user_token=eyJfcmFpbHMiOnsibWVzc2FnZSI6Ilcxc3lNRGd3TkRjd05WMHNJaVF5WVNReE1pUTFUM052T0VsSlZVUnVhVkI0ZWs4dk5tNXhMbTVsSWl3aU1UY3pOalEzTnpRNE15NDNOakEzTWpNMElsMD0iLCJleHAiOiIyMDI1LTAxLTI0VDAyOjUxOjIzLjc2MFoiLCJwdXIiOiJjb29raWUucmVtZW1iZXJfdXNlcl90b2tlbiJ9fQ%3D%3D--07fb71169dd175450bf671260464ef82e3a698db'
			}
		});

		const html = response.data;
		const userNames = extractUserNames(html);
		console.log(`User names for event ${eventID}:`, userNames);
		return userNames;
	} catch (error) {
		console.error(`Error fetching RSVPs for event ${eventID}:`, error.message);
	}
}

function extractUserNames(html) {
	const userNames = [];
	const regex = /<div class="sm:w-1\/2 w-full px-1">([\s\S]*?)<\/div>/g;
	let match;
	while ((match = regex.exec(html)) !== null) {
		const userName = match[1].trim();
		userNames.push(userName);
	}
	return userNames;
}

// Execute the function
fetchLoginPage();
