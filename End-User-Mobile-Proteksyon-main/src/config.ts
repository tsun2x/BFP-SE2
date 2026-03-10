const baseUrl = process.env.EXPO_PUBLIC_BASE_URL?.trim();

if (!baseUrl) {
	throw new Error('EXPO_PUBLIC_BASE_URL is required. Set it in your Expo environment before building or starting the app.');
}

const normalizedBaseUrl = baseUrl.replace(/\/$/, '');

// Point all API calls to the Node backend (replaces legacy PHP host)
export const API_URL = 'https://outlets-southeast-vertex-apr.trycloudflare.com';
export const NODE_API_URL = 'https://outlets-southeast-vertex-apr.trycloudflare.com';

// Phone number used for Twilio test calls (replace with a real number before testing)
export const TEST_CALLER_PHONE = '+639000000000';
