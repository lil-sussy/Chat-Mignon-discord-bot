import { expect } from "chai";
import { FetLifeUser } from "../features/fetlife_api"; // Adjust the path to your implementation

describe("FetLifeUser Tests", function () {
	let flUser: FetLifeUser; // Explicitly type the shared instance

	// Global test configuration variables
	const fetlifeUsername: string | undefined = process.env.FETLIFE_USERNAME; // Set as environment variable
	const fetlifePassword: string | undefined = process.env.FETLIFE_PASSWORD; // Set as environment variable
	const fetlifeProxyUrl: string | undefined = process.env.FETLIFE_PROXY_URL; // Optional proxy URL

	before(async function () {
		// Set up the user instance before running tests
		if (!fetlifeUsername || !fetlifePassword) {
			throw new Error("FETLIFE_USERNAME and FETLIFE_PASSWORD must be set in environment variables.");
		}

		// Initialize the user object
		flUser = new FetLifeUser(fetlifeUsername, fetlifePassword);

		// Configure proxy if provided
		if (fetlifeProxyUrl) {
			if (fetlifeProxyUrl === "auto") {
				await flUser.connection.setProxy("auto");
			} else {
				const proxyUrl = new URL(fetlifeProxyUrl);
				await flUser.connection.setProxy(`${proxyUrl.hostname}:${proxyUrl.port}`, proxyUrl.protocol === "socks:" ? "socks5" : "http");
			}
		}
	});

	it("should log in and retrieve a user ID", async function () {
		// Log in to FetLife
		const loginSuccess: boolean = await flUser.logIn();

		// Ensure the login was successful
		expect(loginSuccess).to.be.true;

		// Check that the user ID is not empty
		expect(flUser.id).to.exist;
		expect(flUser.id).to.be.a("string");
		expect(flUser.id).to.not.be.empty;
	});
});
