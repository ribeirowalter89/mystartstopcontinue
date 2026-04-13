const apiBaseFromEnv = import.meta.env.VITE_API_BASE_URL as string | undefined;
const wsBaseFromEnv = import.meta.env.VITE_WS_BASE_URL as string | undefined;

export const API_BASE_URL = apiBaseFromEnv || "http://localhost:3001";

export const WS_BASE_URL =
  wsBaseFromEnv ||
  API_BASE_URL.replace("https://", "wss://").replace("http://", "ws://");
