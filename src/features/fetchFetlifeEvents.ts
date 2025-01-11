import axios, { AxiosInstance } from "axios";
import { URLSearchParams } from "url";
import fs from "fs";
import { wrapper as axiosCookieJarSupport } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";
import { MultiBar, Presets } from 'cli-progress';

// Create a dedicated axios instance with cookie jar support
const cookieJar = new CookieJar();
const axiosInstance: AxiosInstance = axios.create({
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
const extractUserData = (html: string): FetlifeUser[] => {
	const divs: string[] = [];
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

		return { userID, username, discordId: null };
	});
};

async function fetchEventsNear(page: number): Promise<FetlifeEvent[]> {
	try {
		const response = await axiosInstance.get('/events/near', {
			params: {
				page,
        // category: 'social',
				mapbox_location_id: 'locality.510541',
				'search[long]': 2.383964,
				'search[lat]': 48.889484,
				'search[range]': 50000,
				'search[place_name]': '19th arrondissement, Paris, Île-de-France, France',
				'search[bbox]': '2.364728,48.872049,2.41082,48.902148',
				from_date: new Date().toISOString().split('T')[0],
				from_time: new Date().toISOString()
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
		console.error('Error fetching events near:', (error as Error).message);
		return [];
	}
}

async function fetchEventRsvps(eventID: number): Promise<FetlifeUser[]> {
	try {
		const response = await axiosInstance.get(`/events/${eventID}/rsvps`, {
			headers: {
				"User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:134.0) Gecko/20100101 Firefox/134.0",
				Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
				"Accept-Language": "en-US,en;q=0.5",
				"Accept-Encoding": "gzip, deflate, br, zstd",
				Referer: `https://fetlife.com/events/${eventID}`,
				"Upgrade-Insecure-Requests": "1",
				"Sec-Fetch-Dest": "document",
				"Sec-Fetch-Mode": "navigate",
				"Sec-Fetch-Site": "same-origin",
				"Sec-Fetch-User": "?1",
				Connection: "keep-alive",
				Cookie:
					"language=en; _cfuvid=bGHXyKTYlobwXS_7t6yMj6Y8qgNdotK9Nc6mLLi2PSA-1736477463445-0.0.1.1-604800000; fetlife_pwa=none; __cf_bm=NFK4ONvbhGa.sSZ.Quz_OEONDBz3uq6kxVlH.lEIlLE-1736477463-1.0.1.1-SqhiEvO3opeOXClz56lvLts6WedZBIC4FmMq2YprsTr62htULj1R9nPi9Mru0oXwfoKLXe8DbokpPDZsrUUo0Z9kVLwUesWoGZB4EDRA7ss; cf_clearance=RrdV0ivIzVrhanYjA1KvjY2Hfeu_miH2CGp9qCyN15Q-1736477464-1.2.1.1-RD7FoF1xDCGxosBpHcrplmoCG3F65zcgraUh7GtgU6hyqzASW1aDOm4x_0F3uG9LUoFDAgX.7281oiMgpIm_12E1YqxoH8QtmIxydbr31VON_.GxuWZOvRE_hIMGNGoEnwH3LDMw6K_OuQQkWCm2Uhb6OI3YGzoGkUx_KmIKYkvLTg427FX.pH.A7E.rtxQpwe_wKVoPOEHqY27WnAJ43g4BNi_wVt4zmIYPEGIOYnPsCxDV0IaHt_eZDyqOMFShlHVJrwqrnPB0Yk7eqnab1hfEVBJL3Tel9sQi2U0rm2DqsiXG4BiLEteNr_pFVwu7mlB73Drymmoo2Td5h2Rfhw; remember_user_token=eyJfcmFpbHMiOnsibWVzc2FnZSI6Ilcxc3lNRGd3TkRjd05WMHNJaVF5WVNReE1pUTFUM052T0VsSlZVUnVhVkI0ZWs4dk5tNXhMbTVsSWl3aU1UY3pOalEzTnpRNE15NDNOakEzTWpNMElsMD0iLCJleHAiOiIyMDI1LTAxLTI0VDAyOjUxOjIzLjc2MFoiLCJwdXIiOiJjb29raWUucmVtZW1iZXJfdXNlcl90b2tlbiJ9fQ%3D%3D--07fb71169dd175450bf671260464ef82e3a698db",
			},
		});

		const html = response.data;
		const userNames = extractUserData(html);
		// console.log(`User names for event ${eventID}:`, userNames);
		return userNames;
	} catch (error) {
		console.error(`Error fetching RSVPs for event ${eventID}:`, (error as Error).message);
		return [];
	}
}
export interface FetlifeEvent {
	id: number;
	name: string;
	tagline: string;
	description: string;
	cost: string;
	category: string;
	friendly_category: string;
	dress_code: string;
	start_date_time: string;
	end_date_time: string;
	timezone: string;
	type: string;
	privacy: string;
	canceled: boolean;
	passed: boolean;
	private_address: boolean;
	private_link: boolean;
	private_rsvps: boolean;
	interested_count: number;
	attendance: null | string;
	notification_subscription: null | string;
	cover_image: string;
	author: {
		id: number;
	};
	address: string;
	latitude: null | number;
	longitude: null | number;
	location: string;
	interested_friends: any[];
	place: {
		name: string;
		full_name: string;
		timezone: string;
		type: string[];
		location: [number, number];
	};
}

export interface FetlifeUser {
	userID: string | null;
	username: string | null;
	discordId: string | null;
}


interface item {
	event: FetlifeEvent;
	rsvp: FetlifeUser[];
}

export async function fetchRSVPfromAllParisEvents() {
	try {
		const allEvents: FetlifeEvent[] = [];

		for (let page = 1; page <= 10; page++) {
			const events = await fetchEventsNear(page);
			if (events.length === 0) {
				console.log(`No events found on page ${page}, stopping.`);
				break;
			}
			allEvents.push(...events);
		}

		const eventItems: item[] = [];
		console.log("looking for rsvps to all events : " + allEvents.length + " events");

		// Initialize the progress bar
		const progressBar = new MultiBar({
			clearOnComplete: false,
			hideCursor: true,
			format: 'Fetching RSVPs |{bar}| {percentage}% | {value}/{total} Events',
		}, Presets.shades_classic);

		const bar = progressBar.create(allEvents.length, 0);

		for (const event of allEvents) {
			const item: item = {
				event: event,
				rsvp: [],
			};
			const eventID = event.id; // Assuming each event object has an 'id' property
			const usernames = await fetchEventRsvps(eventID);
			item.rsvp = usernames;
			eventItems.push(item);

			// Update the progress bar
			bar.increment();
		}

		progressBar.stop();

		console.log("fetlife refresh done");
		return eventItems;
	} catch (error) {
		console.error("Error fetching the login page:", (error as Error).message);
		return null;
	}
}

export async function fetchEventImage(url: string): Promise<Buffer | null> {
	try {
		const response = await axiosInstance.get(url, {
			responseType: 'arraybuffer',
			headers: {
				"User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:134.0) Gecko/20100101 Firefox/134.0",
				Accept: "image/avif,image/webp,image/png,image/svg+xml,image/*;q=0.8,*/*;q=0.5",
				"Accept-Language": "en-US,en;q=0.5",
				"Accept-Encoding": "gzip, deflate, br, zstd",
				Referer: "https://fetlife.com/",
				"Sec-Fetch-Dest": "image",
				"Sec-Fetch-Mode": "no-cors",
				"Sec-Fetch-Site": "same-site",
				Connection: "keep-alive",
				"Alt-Used": "picav2-u1000.cdn.fetlife.com",
				Cookie:
					"_cfuvid=bGHXyKTYlobwXS_7t6yMj6Y8qgNdotK9Nc6mLLi2PSA-1736477463445-0.0.1.1-604800000; _fl_sessionid=653d1fd8dcdb09797e3de869763d5a7b; remember_user_token=eyJfcmFpbHMiOnsibWVzc2FnZSI6Ilcxc3lNRGd3TkRjd05WMHNJaVF5WVNReE1pUTFUM052T0VsSlZVUnVhVkI0ZWs4dk5tNXhMbTVsSWl3aU1UY3pOalEzTnpRNE15NDNOakEzTWpNMElsMD0iLCJleHAiOiIyMDI1LTAxLTI0VDAyOjUxOjIzLjc2MFoiLCJwdXIiOiJjb29raWUucmVtZW1iZXJfdXNlcl90b2tlbiJ9fQ%3D%3D--07fb71169dd175450bf671260464ef82e3a698db; __cf_bm=8QFuktAPlbshGJmSJ5.qMS1pfAasu_TaDqREE_S6Ftg-1736502099-1.0.1.1-T3z.ZpOXFXA9Ik6BkPFg7Nv9AOO.rlpeM8bBhc546a2LWZ_sH81F.FFnFtBOT0Kvln_3bKQbeNFICmzb0yJHqLVXtoa4N0wcJxFOIedVuE8; cf_clearance=pgJoYGMDc7ecxNW9ju72seTg_SXjcbVw3gge4BYJt4s-1736502099-1.2.1.1-BwFwBXdQjcEiLEX9zgTrxZKOrqSVyBWAiYxk4DhnNU7ZU.MlJS1AFagrjoUQRv0.CxbtEuydXyppi74hKGBTrVNU626BOghLM4i6G1h1yagZfNwamlRqFpX7NjAXDpk1OK98zqtdzW2ACIFXs9axd7b.u898D9e.BQ3yJgbWBg9hGXQvmsB5iUUlL.AHba4co6oUS5arR7ghE1q7mrTkihd2yKKrsIYcA2l7L3hs37vLBrNQxnK",
			},
		});

		console.log("Image fetched successfully:", response.status);
		return Buffer.from(response.data, "base64");
	} catch (error) {
		console.error("Error fetching image:", (error as Error).message);
		return null;
	}
}