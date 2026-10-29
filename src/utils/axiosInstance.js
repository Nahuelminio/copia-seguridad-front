// src/utils/axiosInstance.js
import axios from "axios";

const instance = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

// Agrega el token a cada request si existe
instance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
},
  (error) => Promise.reject(error)
);

// Si el servidor dice que el token no sirve (vencido o roto), se limpia y se
// vuelve al login. Antes la pantalla quedaba vacía, fallando en cada pedido.
instance.interceptors.response.use(
  (res) => res,
  (error) => {
    const msg = error?.response?.data?.error || "";
    if (error?.response?.status === 401 && /token/i.test(msg) && window.location.pathname !== "/login") {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default instance;
