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

const N8N_NUEVO_STOCK_WEBHOOK =
  "https://nahuelminio04.app.n8n.cloud/webhook/f26edb4e-41a0-4252-a06b-b352fd6fb56f";

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

  const response = await fetch(N8N_NUEVO_STOCK_WEBHOOK, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Error al consultar el workflow de nuevo stock");
  }

  const contentType = response.headers.get("content-type") || "";

  let data;
  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  const mensaje = extraerMensajeStock(data);

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

    const response = await fetch(N8N_NUEVO_STOCK_WEBHOOK, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("Error al consultar el workflow de difusión");
    }

    const contentType = response.headers.get("content-type") || "";

    let data;
    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    const mensaje = extraerMensajeStock(data);

    if (!mensaje || !String(mensaje).trim()) {
      throw new Error("El workflow no devolvió ningún mensaje");
    }

    return mensaje;
  },
};

export default clientesService;
