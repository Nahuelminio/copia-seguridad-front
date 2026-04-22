import api from "../utils/axiosInstance";

function getArray(res) {
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  return [];
}

function extraerMensajeStock(data) {
  if (typeof data === "string") return data;

  if (Array.isArray(data)) {
    return data.join("\n");
  }

  return (
    data?.mensaje ||
    data?.texto ||
    data?.body ||
    data?.reply ||
    data?.message ||
    ""
  );
}

// Llamamos al proxy del backend para evitar CORS (el backend llama a n8n server-to-server)
const PROXY_MENSAJE_URL = "/clientes/proxy-mensaje";

const clientesService = {
  async obtenerTodos() {
    const res = await api.get("/clientes");
    return res.data;
  },

  async obtenerPorId(id) {
    const res = await api.get(`/clientes/${id}`);
    return res.data;
  },

  async crear(payload) {
    const res = await api.post("/clientes", payload);
    return res.data;
  },

  async editar(id, payload) {
    const res = await api.put(`/clientes/${id}`, payload);
    return res.data;
  },

  async eliminar(id) {
    const res = await api.delete(`/clientes/${id}`);
    return res.data;
  },

  async buscar(q) {
    const res = await api.get("/clientes/buscar", {
      params: { q },
    });
    return res.data;
  },

  async obtenerSucursales() {
    const res = await api.get("/sucursales");
    return getArray(res);
  },
  async generarMensajeNuevoStock(cliente) {
    const payload = {
      modo: "cliente",
      cliente_id: cliente?.id || null,
      nombre: cliente?.nombre || "",
      telefono: cliente?.telefono || "",
      sucursal_id: cliente?.sucursal_id || null,
      sucursal_nombre: cliente?.sucursal_nombre || "",
      observaciones: cliente?.observaciones || "",
    };

    const res = await api.post(PROXY_MENSAJE_URL, payload);
    const mensaje = extraerMensajeStock(res.data);
    if (!mensaje || !String(mensaje).trim()) {
      throw new Error("El workflow no devolvió ningún mensaje");
    }
    return mensaje;
  },

  async generarMensajeDifusionStock({ sucursal_id, sucursal_nombre }) {
    const payload = {
      modo: "difusion",
      sucursal_id: sucursal_id || null,
      sucursal_nombre: sucursal_nombre || "",
    };

    const res = await api.post(PROXY_MENSAJE_URL, payload);
    const mensaje = extraerMensajeStock(res.data);
    if (!mensaje || !String(mensaje).trim()) {
      throw new Error("El workflow no devolvió ningún mensaje");
    }
    return mensaje;
  },
};

export default clientesService;
