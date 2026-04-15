function readEnv(name) {
  const value = import.meta.env[name];
  return typeof value === "string" ? value.trim() : "";
}

function requireEnv(name) {
  const value = readEnv(name);
  if (!value) {
    throw new Error(
      `${name} is required. Set it in the app environment before starting or building this app.`,
    );
  }
  return value.replace(/\/$/, "");
}

function optionalEnv(name) {
  const value = readEnv(name);
  return value ? value.replace(/\/$/, "") : null;
}

export const API_BASE = requireEnv("VITE_API_URL");
export const SOCKET_BASE = API_BASE.replace(/\/api$/, "");
export const PHP_BACKEND_URL = optionalEnv("VITE_PHP_BACKEND_URL");
