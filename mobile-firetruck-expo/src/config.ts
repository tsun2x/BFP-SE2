const baseUrl = process.env.EXPO_PUBLIC_BASE_URL?.trim();

if (!baseUrl) {
	throw new Error('EXPO_PUBLIC_BASE_URL is required. Set it in your Expo environment before building or starting the app.');
}

export const API_URL = 'https://outlets-southeast-vertex-apr.trycloudflare.com';

