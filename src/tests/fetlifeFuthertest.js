// fetchLoginPage.js
const axios = require("axios");
const { URLSearchParams } = require("url");

const fetlifeBaseUrl = "https://fetlife.com"; // Base URL
const loginPageUrl = `${fetlifeBaseUrl}/login`; // Complete URL for the login page

async function fetchCsrfToken() {
	const signInPage = await axios.get(loginPageUrl, {
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
async function refresh__cf_bmCookie() {
  const cringePage = "https://gav2.fetlife.com/vite/assets/application_style-BJSyJdCu.js";
	const signInPage = await axios.get(cringePage, {
		headers: {
			Host: "gav2.fetlife.com",
			"User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0",
			Accept: "*/*",
			"Accept-Language": "en-US,en;q=0.5",
			"Accept-Encoding": "gzip, deflate, br, zstd",
			Referer: "https://fetlife.com/",
			Origin: "https://fetlife.com",
			"Sec-Fetch-Dest": "script",
			"Sec-Fetch-Mode": "cors",
			"Sec-Fetch-Site": "same-site",
			Connection: "keep-alive",
		},
	});

	// Return the __cf_bm cookie from the response headers
	return signInPage.headers['set-cookie'].find(cookie => cookie.startsWith('__cf_bm'));
}

function findCsrfToken(str) {
	const m = str.match(/<meta name="csrf-token" content="([^"]+)"/);
	const decodedNumericEntities = m[1].replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
	return m ? decodedNumericEntities : false;
}

function findUserId(str) {
	// same regex approach as in PHP
	let m = str.match(/FL.user = {\nid\s*=\s*([0-9]+);/);
	if (!m) {
		m = str.match(/var currentUserId\s*=\s*([0-9]+)/);
	}
	return m ? m[1] : false;
}

// Function to fetch the login page
async function fetchLoginPage() {
	try {
		const csrfToken = await fetchCsrfToken();
    const cf_bmCookie = await refresh__cf_bmCookie();

		const postData = new URLSearchParams({
			"user[login]": process.env.FETLIFE_USERNAME,
			"user[password]": process.env.FETLIFE_PASSWORD,
			"user[locale]": "en",
			"user[otp_attempt]": "step_2",
      // "user[remember_me]": "1",
			authenticity_token: csrfToken,
		});
    
		const response = await axios.post(loginPageUrl, postData.toString(), {
			credentials: "include",
			headers: {
				"User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0",
				Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
				"Accept-Language": "en-US,en;q=0.5",
				"Content-Type": "application/x-www-form-urlencoded",
				"Upgrade-Insecure-Requests": "1",
				"Sec-Fetch-Dest": "document",
				"Sec-Fetch-Mode": "navigate",
				"Sec-Fetch-Site": "same-origin",
				"Sec-Fetch-User": "?1",
				Priority: "u=0, i",
				Pragma: "no-cache",
				"Cache-Control": "no-cache",
				Cookie: `language=en; fetlife_pwa=none; _cfuvid=99IFG9_XcHA2cH9_wMibsEpt7iwnxhenSJZQD3NHvjQ-1735319556046-0.0.1.1-604800000; __cf_bm=gKuO.7bwzQdw_7Ql2D9pB9cu.Yu1uzciLdoe6t4Umvg-1735903337-1.0.1.1-CnmhFI83tXblbca3KEz4A.rRfY3qmCTorfwTCXdKVA5MPfWZgf2FviWDTfKBILwUBAXrmmHhNRkzenHlp1759iHuleJpohh4VSC5Oz4kVJA; cf_clearance=gLb6vjZT0iHdoYJIx29bMohJLRDE53O6meSSVHAd03A-1735904402-1.2.1.1-DHNNhQPp5UdI7drfWvcxRRSo6h3i808u5LE.LSvcREHxODI4DUwObmu5HOYRxVHBustNTWAHSiGMICk0Hv.dd2IyODJTsNLyrko09CiwQr5eukHw0v8qj4ZgLzmoGqRgqhFTjYIuv.Ouft.SiePQzUh9oey2WEAmUkeSLqsAO2Ojgn7wIlToQ2JRcoZEQ2.8CYNoS.W2wSyF3LYc21SwTEs1mXwNxUtTyD4TFk_zGVJhOwGKUjwLir3MaonBugHTGxQYh_SRpbVjzFKgTOijPwezW.e4shIwGL5yBcSoSlB7yloiOxgbVOIbLw9Q.QjVawm1u7ufWOPVZgsonfPvs6mtlAj_O0ubQgSUtdgMR6HQXaTLy4m0OPHnR5pQc4iu; _fl_sessionid=b12928b4fc1a5155116a321ab19657da`,
			},
			referrer: "https://fetlife.com/logged_out",
			method: "POST",
			mode: "cors",
		});
		// const response = await axios.post(loginPageUrl, postData.toString(), {
		// 	headers: {
		// 		Host: "fetlife.com",
		// 		"User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0",
		// 		Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
		// 		"Accept-Language": "en-US,en;q=0.5",
		// 		"Accept-Encoding": "gzip, deflate, br, zstd",
		// 		Referer: "https://fetlife.com/logged_out",
		// 		"Upgrade-Insecure-Requests": "1",
		// 		"Sec-Fetch-Dest": "document",
		// 		"Sec-Fetch-Mode": "navigate",
		// 		"Sec-Fetch-Site": "same-origin",
		// 		"Sec-Fetch-User": "?1",
		// 		Connection: "keep-alive",
		// 		Cookie: `language=en; fetlife_pwa=none; ${cf_bmCookie};`,
		// 	},
		// });
    const userID = findUserId(response.data);
		console.log("Response Status:", response.status);
		console.log("new cookies", response.headers.get("set-cookie")); // This will log the HTML of the login page
		console.log("ui cookie", response.headers.get("set-cookie").find(cookie => cookie.startsWith('ui')));
		console.log("UserID:", userID); // This will log the HTML of the login page
	} catch (error) {
		console.error("Error fetching the login page:", error.message);
	}
}

// Execute the function
fetchLoginPage();
