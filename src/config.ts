const rawBaseUrl = process.env.EXPO_PUBLIC_BASE_URL?.trim();

if (!rawBaseUrl) {
  throw new Error(
    "EXPO_PUBLIC_BASE_URL is required. Set it to your deployed backend base URL before starting or building the app.",
  );
}

const baseUrl = rawBaseUrl.replace(/\/$/, "");

export const API_URL = baseUrl;
