import axios from "axios";

function buildBaseURL() {
  const raw = (import.meta.env?.VITE_API_URL || "").trim();
  if (!raw) return "/api";
  const cleaned = raw.replace(/\/+$/, "");
  if (/\/api$/i.test(cleaned)) return cleaned;
  return `${cleaned}/api`;
}

const customerApi = axios.create({
  baseURL: buildBaseURL(),
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

customerApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("customer_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

customerApi.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("customer_token");
      localStorage.removeItem("customer_user");
      window.location.href = "/customer/login";
    }
    return Promise.reject(error);
  }
);

export default customerApi;
