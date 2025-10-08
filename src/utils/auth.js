// src/utils/auth.js
import { jwtDecode } from "jwt-decode";

export function getUsuario() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    const payload = jwtDecode(token); // más seguro y limpio
    return payload; // { userId, sucursalId, rol, exp, ... }
  } catch (e) {
    console.error("Token inválido:", e);
    return null;
  }
}
