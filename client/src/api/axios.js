import axios from "axios";

/** Base path or absolute API URL (no trailing slash). Used for PDF iframe / download URLs. */
export const getApiBasePath = () =>
  (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

// Main Node.js API instance
const api = axios.create({
  baseURL: getApiBasePath(),
  timeout: 15000,
});

// Attach JWT token to every request if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally — clear session and redirect
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// RAG / FastAPI instance
export const ragApi = axios.create({
  baseURL: import.meta.env.VITE_RAG_URL || "http://localhost:8000",
  timeout: 30000,
});

export default api;
