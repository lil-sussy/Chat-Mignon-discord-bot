/*********************************************************************
 * Example Node.js conversion of the original PHP FetLife scraping code.
 *
 * Dependencies you’ll need to install:
 *   npm install axios axios-cookiejar-support tough-cookie jsdom
 *
 * This code is purely illustrative and may need adjustments to run
 * correctly against FetLife or other real-world conditions.
 *********************************************************************/

import axios from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";
import { JSDOM } from "jsdom";
import * as url from "url";

/**
 * Base class
 */
export class FetLife {
	static baseUrl = "https://fetlife.com"; // No trailing slash!
}

/**
 * Handles network connections, logins, logouts, etc.
 */
interface User {
	nickname: string;
	password: string;
	id: string | null;
	connection: FetLifeConnection;
}

interface Proxy {
	host: string;
	port: string;
}

interface ProxyResult {
	url: string;
	type: string;
}

interface HttpResponse {
	body: string;
	curl_info: {
		url: string;
	};
}

interface FetLifeProfileParams {
	usr: FetLifeUser;
	id: string;
	nickname?: string;
	avatar_url?: string;
	age?: string;
	gender?: string;
	role?: string;
	location?: string;
}

export class FetLifeConnection extends FetLife {
	usr: User;
	cookiejar: CookieJar;
	csrfToken: string | null;
	curPage: string | null;
	proxyUrl: string | null;
	proxyType: string | null;
	client: any;

	constructor(usr: User) {
		super();
		this.usr = usr;
		this.cookiejar = new CookieJar();
		this.csrfToken = null;
		this.curPage = null;
		this.proxyUrl = null;
		this.proxyType = null;

		this.client = wrapper(
			axios.create({
				baseURL: FetLife.baseUrl,
				jar: this.cookiejar,
				withCredentials: true,
			})
		);
	}

	/**
	 * Helper to replicate the random proxy scraping logic
	 * from xroxy.com. This is just a conceptual port.
	 */
	async scrapeProxyURL(): Promise<ProxyResult> {
		const targetUrl = "http://www.xroxy.com/proxylist.php?port=&type=Anonymous&ssl=ssl&country=&latency=&reliability=5000";
		const response = await axios.get(targetUrl);
		const html = response.data;
		const dom = new JSDOM(html);
		const document = dom.window.document;

		const rows = Array.from(document.getElementsByTagName("tr"));
		const urls: { host: string; port: string }[] = [];

		rows.forEach((row) => {
			// original logic: if row.class starts with 'row'
			if (row.className && row.className.indexOf("row") === 0) {
				// The <a> inside
				const linkEl = row.getElementsByTagName("a")[0];
				if (!linkEl) return;

				const href = linkEl.getAttribute("href") || "";
				// parse_str($str) in PHP is basically extracting ?host=xxx&port=yyy
				// In Node, let's do it manually:
				const q = new url.URLSearchParams(href);
				const host = q.get("host");
				const port = q.get("port");
				if (host && port) {
					urls.push({ host, port });
				}
			}
		});

		if (urls.length === 0) {
			throw new Error("No proxies found from xroxy");
		}

		// Pick a random index between 0 and urls.length - 1
		// In PHP: mt_rand(0, count($urls) - 1)
		// In mathematics: n = floor(random() * urls.length)
		const n = Math.floor(Math.random() * urls.length);
		const chosen = urls[n];

		// parse_url("https://host:port") in Node
		// This is just to guess if scheme is “socks”
		const fullUrl = `https://${chosen.host}:${chosen.port}`;
		const parsed = url.parse(fullUrl);

		return {
			url: `${parsed.hostname}:${parsed.port}`,
			type: parsed.protocol === "socks:" ? "socks5" : "http",
		};
	}

	// A flag to pass to axios to do proxy settings
	async setProxy(urlSpec: string, proxyType: string = "http"): Promise<void> {
		if (urlSpec === "auto") {
			const p = await this.scrapeProxyURL();
			urlSpec = p.url;
			proxyType = p.type;
		}
		this.proxyUrl = urlSpec;
		this.proxyType = proxyType;

		// For Axios, you’d typically do something like:
		//   this.client.defaults.proxy = { host: ..., port: ..., protocol: ... }
		// or you might set an HTTP agent / HTTPS agent for socks.
		// Not all proxy types are trivial to set with Axios, so handle carefully.
		// For brevity, we’ll just store them for now.
	}

	/**
	 * Log in to FetLife
	 *
	 * @return {boolean} True if successful, false otherwise
	 */
	async logIn(): Promise<boolean> {
		// 1) Grab FetLife sign_in page to get CSRF
		// so that the session cookies are set.
		const signInUrl = "/users/sign_in";
		const signInPage = await this.client.get(signInUrl, {
			// Possibly handle proxy config here if you want a global approach
			// see axios documentation for how to handle proxies in Node
		});

		// 2) Parse the HTML & get CSRF token
		const csrfToken = this.findCsrfToken(signInPage.data);
		if (csrfToken) {
			this.setCsrfToken(csrfToken);
		} else {
			throw new Error("CSRF token not found");
		}

		// 3) Post login credentials
		const postData = {
			"user[login]": this.usr.nickname,
			"user[password]": this.usr.password,
			"user[otp_attempt]": "step_1",
			authenticity_token: this.csrfToken,
			utf8: "✓",
		};

		const loginResponse = await this.doHttpPost("/users/sign_in", postData);

		// Now, check if we got a valid user ID
		const userId = this.findUserId(loginResponse.body);
		if (userId) {
			return true;
		} else {
			return false;
		}
	}

	/**
	 * Perform an HTTP POST
	 */
	async doHttpPost(urlPath: string, data: object | string = ""): Promise<HttpResponse> {
		return this.doHttpRequest(urlPath, data, "POST");
	}

	/**
	 * Perform an HTTP GET
	 */
	async doHttpGet(urlPath: string, data: object | string = ""): Promise<HttpResponse> {
		return this.doHttpRequest(urlPath, data, "GET");
	}

	/**
	 * Generic request function
	 * @param {string} urlPath The request URI (e.g., "/users/1")
	 * @param {object|string} data Parameters to send
	 * @param {string} method The HTTP method: 'GET' or 'POST'
	 */
	async doHttpRequest(urlPath: string, data: object | string, method: string = "GET"): Promise<HttpResponse> {
		let response;

		if (method === "GET") {
			// If data is an object, build a query string
			// If data is string, assume the user built their own
			let params = data;
			if (typeof data === "object") {
				params = new url.URLSearchParams(data as Record<string, string>).toString();
			}
			const fullUrl = params ? `${urlPath}?${params}` : urlPath;
			response = await this.client.get(fullUrl);
		} else {
			// POST
			response = await this.client.post(urlPath, new url.URLSearchParams(data as Record<string, string>).toString(), {
				headers: { "Content-Type": "application/x-www-form-urlencoded" },
			});
		}

		// Grab the body
		const body = response.data;
		this.curPage = body;

		// Update CSRF token on each request
		const csrfToken = this.findCsrfToken(body);
    if (!csrfToken) {
      throw new Error("CSRF token not found");
    }
		if (csrfToken !== null) {
			this.setCsrfToken(csrfToken);
		}

		// Return an object mimicking { body, curl_info: ... } from PHP
		return {
			body,
			curl_info: {
				url: response.request?.res?.responseUrl || "", // attempt to store final URL
			},
		};
	}

	/**
	 * Finds current user ID from FetLife’s returned HTML
	 */
	findUserId(str: string): string | false {
		// same regex approach as in PHP
		let m = str.match(/FetLife\.currentUser\.id\s*=\s*([0-9]+);/);
		if (!m) {
			m = str.match(/var currentUserId\s*=\s*([0-9]+)/);
		}
		return m ? m[1] : false;
	}

	/**
	 * Finds user nickname in HTML
	 */
	findUserNickname(str: string): string | false {
		const m = str.match(/<title>([-_A-Za-z0-9]+) - Kinksters - FetLife<\/title>/);
		return m ? m[1] : false;
	}

	/**
	 * Finds CSRF token from the HTML
	 */
	findCsrfToken(str: string): string | false {
		const m = str.match(/<meta name="csrf-token" content="([^"]+)"/);
		return m ? this.decodeNumericEntities(m[1]) : false;
	}

	/**
	 * Some numeric-HTML-entities decode approach
	 */
	decodeNumericEntities(str: string): string {
		// In the original code, there's a create_function with mb_convert_encoding
		// For Node, let's do a simpler approach:
		// Because numeric entity decoding can be tricky, we can do a quick replace:
		return str.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
	}

	setCsrfToken(token: string): void {
		this.csrfToken = token;
	}
}

/**
 * A FetLife User
 */
export class FetLifeUser extends FetLife {
	nickname: string;
	password: string;
	id: string | null;
	connection: FetLifeConnection;

	constructor(nickname: string, password: string) {
		super();
		this.nickname = nickname;
		this.password = password;
		this.id = null;
		this.connection = new FetLifeConnection(this);
	}

	/**
	 * Logs in with provided nickname & password
	 */
	async logIn(): Promise<boolean> {
		const response = await this.connection.logIn();
		if (response) {
			// If successful, try to parse user ID from the page we got
			// The connection itself sets the user ID after login in the code above
			// But we can also do an additional check if we want
      if (this.connection.curPage === null) {
        throw new Error("Failed to log in");
      }
			const userId = this.connection.findUserId(this.connection.curPage);
			if (userId) {
				this.id = userId;
				return true;
			}
		}
		return false;
	}

	/**
	 * Translates a FetLife user nickname to numeric ID
	 */
	async getUserIdByNickname(nickname: string | null = null): Promise<string | null> {
		if (!nickname) {
			nickname = this.nickname;
		}
		// If same user and we already have an ID, return it
		if (nickname === this.nickname && this.id) {
			return this.id;
		} else {
			const result = await this.connection.doHttpGet(`/${nickname}`);
			const finalUrl = result.curl_info.url;
			// finalUrl might be something like ".../users/12345"
			const p = url.parse(finalUrl);
			const parts = p.pathname!.split("/");
			return parts.pop() ?? null;
		}
	}

	/**
	 * Translates a FetLife user ID to their nickname
	 */
	async getUserNicknameById(id: string | null = null): Promise<string | false> {
		if (this.id && !id) {
			id = this.id;
		}
		const result = await this.connection.doHttpGet(`/users/${id}`);
		return this.connection.findUserNickname(result.body);
	}

	/**
	 * Retrieves a FetLife profile by nickname or ID
	 */
	async getUserProfile(who: string | number | null = null): Promise<FetLifeProfile | false> {
		const id = await this.resolveWho(who);
		if (id === null) {
			throw new Error("User ID cannot be null");
		}
		const profile = new FetLifeProfile({ usr: this, id: id.toString() });
		try {
			await profile.populate();
			return profile;
		} catch (err) {
			return false;
		}
	}

	/**
	 * Retrieve user’s friend list
	 */
	async getFriendsOf(who: string | number | null = null, pages: number = 0): Promise<FetLifeProfile[]> {
		const id = await this.resolveWho(who);
		if (id === null) {
			throw new Error("User ID cannot be null");
		}
		return this.getUsersInListing(`/users/${id.toString()}/friends`, pages);
	}

	/**
	 * Helper to interpret "who"
	 */
	async resolveWho(who: string | number | null): Promise<string | number | null> {
		if (who === null || who === undefined) {
			return this.id;
		}
		if (Number.isInteger(who)) {
			who = who.toString();
		}
		// If string is all digits, parse to int
		if (/^\d+$/.test(who as string)) {
			return parseInt(who as string, 10).toString();
		}
		// Otherwise treat as nickname
		return this.getUserIdByNickname(who as string);
	}

	/**
	 * Checks if we are on the "Home" page
	 */
	isHomePage(str: string): boolean {
		return /<title>Home - FetLife<\/title>/.test(str);
	}

	/**
	 * Checks if we got an HTTP 500 error page
	 */
	isHttp500ErrorPage(str: string): boolean {
		return /<p class="error_code">500 Internal Server Error<\/p>/.test(str);
	}

	/**
	 * Main function to do multi-page user listings
	 * e.g. friends, group members, etc.
	 */
	async getUsersInListing(urlBase: string, pages: number, qs: string = ""): Promise<FetLifeProfile[]> {
		const items = await this.getItemsInListing('//*[contains(@class, "user_in_list")]', urlBase, pages, qs);
		const results = [];

		// Now parse out each “user_in_list” block
		for (const v of items) {
			const doc = v.ownerDocument;

			// The user block might have an <img alt="Nickname" src="..." />
			const img = v.querySelector("img");
			const nickname = img ? img.alt : "";
			const avatarUrl = img ? img.src : "";

			// The <a> might be around it
			const a = v.querySelector("a");
			const userUrl = a ? a.href : "";
			const parts = userUrl.split("/");
			const userId = parts[parts.length - 1];

			// The second <span> might have age/gender/role
			const spans = v.querySelectorAll("span");
			let age, gender, role;
			if (spans.length > 1) {
				// In the original code, parseAgeGenderRole was a separate function
				// We'll just do a quick parse here:
				const text = spans[1].textContent!.trim(); // e.g. "24 M Dom"
				// Maybe it’s "(\d{2})(\S+)? (\S+)?"
				const match = text.match(/^(\d+)(\S+)? (\S+)?$/);
				if (match) {
					age = match[1];
					gender = match[2] || "";
					role = match[3] || "";
				}
			}

			// The <em> might have location text
			const em = v.querySelector("em");
			const location = em ? em.textContent!.trim() : "";

			// Construct the profile object
			const u = new FetLifeProfile({
				usr: this,
				nickname,
				avatar_url: avatarUrl,
				id: userId,
				age,
				gender,
				role,
				location,
			});

			results.push(u);
		}
		return results;
	}

	/**
	 * Repeatedly loads pages of a listing, merges them
	 */
	async getItemsInListing(xpath: string, urlBase: string, pages: number, qs: string = ""): Promise<Element[]> {
		let curPage = 1;
		let out: Element[] = [];

		// 1) load first page
		let x = await this.loadPage(urlBase, curPage, qs);
		let doc = new JSDOM(x.body).window.document;
		let numPages = this.countPaginatedPages(doc);
		if (pages === 0) {
			// means get all pages
			pages = numPages;
		}

		// parse items from this page
		out = out.concat(this.parseItemsInListing(xpath, doc));

		// 2) parse next pages
		while (curPage < numPages && curPage < pages) {
			curPage++;
			x = await this.loadPage(urlBase, curPage, qs);
			doc = new JSDOM(x.body).window.document;
			out = out.concat(this.parseItemsInListing(xpath, doc));
		}
		return out;
	}

	/**
	 * Utility to load a given “page” of a paginated listing
	 */
	async loadPage(baseUrl: string, page: number = 1, qs: string = ""): Promise<HttpResponse> {
		let finalUrl = baseUrl;
		const connector = baseUrl.includes("?") ? "&" : "?";
		if (page > 1) {
			finalUrl += `${connector}page=${page}&`;
		} else if (qs) {
			finalUrl += baseUrl.includes("?") ? "&" : "?";
		}
		if (qs) {
			finalUrl += qs;
		}
		const result = await this.connection.doHttpGet(finalUrl);
		return result;
	}

	/**
	 * Tries to count the number of pages in a listing
	 */
	countPaginatedPages(doc: Document): number {
		// The original code uses an XPath for: //a[@class="next_page"]/../a
		// Then the second to last item is the total number of pages
		// Let’s replicate concept in Node with querySelectorAll
		const nextPage = doc.querySelector("a.next_page");
		if (!nextPage) {
			return 1;
		}
		// If we found next_page, let’s see siblings
		// We can attempt something simpler
		const pageLinks = Array.from(nextPage.parentElement!.querySelectorAll("a"));
		// Typically the last “...some number” link is second to last in array
		// but we’ll find the biggest numeric
		let maxPage = 1;
		for (const a of pageLinks) {
			const val = parseInt(a.textContent ?? "", 10);
			if (!isNaN(val)) {
				maxPage = Math.max(maxPage, val);
			}
		}
		return maxPage;
	}

	/**
	 * parseItemsInListing
	 */
	parseItemsInListing(xpath: string, doc: Document): Element[] {
		// In Node, we can do an XPath approach with jsdom’s eval or other methods,
		// but for simplicity, we’ll do a querySelectorAll that approximates the usage.
		// If we truly want to do an XPath, we could do:
		//   const xp = doc.evaluate(xpath, doc, null, ...
		// But let's keep it short:
		const items: Element[] = [];

		// Quick hack: let’s do an actual XPath from jsdom
		const evaluator = new doc.defaultView!.XPathEvaluator();
		const result = evaluator.evaluate(xpath, doc, null, doc.defaultView!.XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
		for (let i = 0; i < result.snapshotLength; i++) {
			items.push(result.snapshotItem(i) as Element);
		}
		return items;
	}
}

/**
 * A FetLifeProfile.  In the original code, FetLifeProfile extends FetLifeContent,
 * so let’s also define a FetLifeContent base class to mirror it.
 */
export class FetLifeContent extends FetLife {
	constructor(params = {}) {
		super();
		Object.assign(this, params);
	}

	// Here we replicate what the parent classes in PHP did:
	async populate() {
		// Overridden by child
	}

	// ...
}

export class FetLifeProfile extends FetLifeContent {
	usr: FetLifeUser;
	id: string;
	nickname?: string;
	avatar_url?: string;
	age?: string;
	gender?: string;
	role?: string;
	location?: string;

	constructor(params: FetLifeProfileParams) {
		super(params);
		// The constructor in the original code unsets "creator"
		// because a Profile does not have a 'creator'.
    // @ts-ignore
		if (this.creator) {
			// @ts-ignore
			delete this.creator;
		}
	}

	getUrl(): string {
		return `/users/${this.id}`;
	}

	async populate(): Promise<void> {
		// Attempt to fetch the user page
		const resp = await this.usr.connection.doHttpGet(this.getUrl());
		const html = resp.body;

		// If we got bounced to home or 500
		if (this.usr.isHomePage(html) || this.usr.isHttp500ErrorPage(html)) {
			throw new Error("FetLife Profile does not exist or returned an error.");
		}

		const { document } = new JSDOM(html).window;

		// This is just a small subset of what the original parseHtml did.
		// The original code merges group info, event info, etc.
		// You can replicate all those details similarly:

		// nickname from <img alt="nickname">
		const pan = document.querySelector(".pan");
		if (pan) {
			this.avatar_url = pan.getAttribute("src") ?? undefined;
		}

		// <h2><span> 24 M Dom </span></h2> example
		const h2 = document.querySelector("h2");
		if (h2) {
			const span = h2.querySelector("span");
			if (span) {
				const text = span.textContent!.trim();
				const match = text.match(/^(\d+)(\S+)? (\S+)?$/);
				if (match) {
					this.age = match[1];
					this.gender = match[2] || "";
					this.role = match[3] || "";
				}
			}
		}

		const em = document.querySelector("em");
		if (em) {
			this.location = em.textContent!.trim();
		}

		// And so forth...
		// For a full 1:1 port, replicate the entire parse logic from the PHP.
	}
}

/**
 * You can similarly create FetLifeWriting, FetLifePicture, etc.
 * This illustration gives you the major pattern for rewriting
 * the original PHP classes in Node + axios/jsdom style.
 */
