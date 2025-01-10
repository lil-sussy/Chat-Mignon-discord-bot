
// Simplify normalHeaders or remove it altogether if you like.
// No explicit Cookie header so the jar is the single source of truth.

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
// Function to fetch the login page

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

		return response.data.entries;
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
		const userNames = extractUserData(html);
		console.log(`User names for event ${eventID}:`, userNames);
		return userNames;
	} catch (error) {
		console.error(`Error fetching RSVPs for event ${eventID}:`, error.message);
	}
}

const extractUserData = (html) => {
  const divs = [];
  const regex = /<div class="sm:w-1\/2 w-full px-1">([\s\S]*?)<\/div>/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const userName = match[1].trim();
    divs.push(userName);
  }
  return divs.map((div) => {
		// Extract userID from the href attribute in the onclick
		const userIDMatch = div.match(/\/users\/(\d+)/);
		const userID = userIDMatch ? userIDMatch[1] : null;

		// Extract username from the title attribute
		const usernameMatch = div.match(/title=\"(.*?)\"/);
		const username = usernameMatch ? usernameMatch[1] : null;

		return { userID, username };
	});

};


async function main() {
	try {
		// Now use the pre-configured axiosInstance
		const data = await fetchEventsNear();

		const events = [];

		for (const event of data) {
			const eventID = event.id; // Assuming each event object has an 'id' property
      const usernames = await fetchEventRsvps(eventID);
			events.push(usernames);
		}

		console.log(events);
	} catch (error) {
		console.error("Error fetching the login page:", error.message);
	}
}

// Execute the function
main();
