const rawBaseUrl = process.env.EXPO_PUBLIC_BASE_URL?.trim();

if (!rawBaseUrl) {
  throw new Error(
    "EXPO_PUBLIC_BASE_URL is required. Set it to your deployed backend base URL before starting or building the app.",
  );
}

const baseUrl = rawBaseUrl.replace(/\/$/, "");

// Point all API calls to the Node backend
export const API_URL = baseUrl;
export const NODE_API_URL = baseUrl;

// Phone number used for Twilio test calls (replace with a real number before testing)
export const TEST_CALLER_PHONE = "+639000000000";
