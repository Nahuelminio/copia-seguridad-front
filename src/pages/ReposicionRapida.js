import React, { useEffect, useState } from "react";
import axios from "../utils/axiosInstance";
import { jwtDecode } from "jwt-decode";
import { toast } from "react-toastify";

const iStyle = {
  background: "#0d1526",
  border: "1px solid #1e293b",
  color: "#e2e8f0",
  borderRadius: "8px",
};

const lStyle = {
  color: "#94a3b8",
  fontSize: "0.82rem",
  marginBottom: "4px",
};

function ReposicionRapida() {
  const [gustos, setGustos] = useState([]);
  const [gustoId, setGustoId] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [sucursalNombre, setSucursalNombre] = useState("");
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");
  const decoded = token ? jwtDecode(token) : null;
  const sucursalId = decoded?.sucursalId;

  useEffect(() => {
    if (!sucursalId || !token) return;

    axios
      .get(`/productos/disponibles?sucursal_id=${sucursalId}`)
      .then((res) => setGustos(res.data))
      .catch(() => toast.error("Error al obtener productos"));

    axios
      .get("/sucursales")
      .then((res) => {
        const sucursal = res.data.find((s) => s.id === sucursalId);
        if (sucursal) setSucursalNombre(sucursal.nombre);
      })
      .catch(() => {});
  }, [sucursalId, token]);

  const enviar = async (e) => {
    e.preventDefault();
    if (!gustoId || cantidad < 1) {
      toast.error("Completá todos los campos");
      return;
    }
    try {
      setLoading(true);
      await axios.post("/productos/reposicion-rapida", {
        gusto_id: gustoId,
        cantidad: parseInt(cantidad),
      });
      toast.success("Reposición rápida registrada");
      setCantidad(1);
      setGustoId("");
    } catch {
      toast.error("Error al hacer reposición");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5" style={{ maxWidth: 560 }}>
      <div className="mb-4">
        <h4 style={{ color: "#f1f5f9", fontWeight: 700, marginBottom: 2 }}>
          Reposición Rápida
        </h4>
        <p style={{ color: "#64748b", fontSize: "0.85rem", margin: 0 }}>
          Sucursal:{" "}
          <span style={{ color: "#94a3b8", fontWeight: 600 }}>
            {sucursalNombre || sucursalId || "—"}
          </span>
        </p>
      </div>

      <form
        onSubmit={enviar}
        style={{
          background: "#111827",
          border: "1px solid #1e293b",
          borderRadius: 14,
          padding: "28px 28px 24px",
        }}
      >
        <div className="mb-3">
          <label style={lStyle}>Producto - Gusto</label>
          <select
            className="form-select"
            value={gustoId}
            onChange={(e) => setGustoId(e.target.value)}
            required
            disabled={loading}
            style={iStyle}
          >
            <option value="">Seleccionar producto</option>
            {gustos.map((g) => (
              <option key={g.gusto_id} value={g.gusto_id}>
                {g.producto_nombre} - {g.gusto}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label style={lStyle}>Cantidad</label>
          <input
            type="number"
            className="form-control"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            min="1"
            required
            disabled={loading}
            style={iStyle}
          />
        </div>

        <button
          type="submit"
          className="w-100"
          disabled={!gustoId || cantidad < 1 || loading}
          style={{
            background:
              !gustoId || cantidad < 1 || loading
                ? "#1e293b"
                : "linear-gradient(135deg, #10b981, #059669)",
            border: "none",
            borderRadius: 9,
            color: !gustoId || cantidad < 1 || loading ? "#475569" : "#fff",
            fontWeight: 600,
            fontSize: "0.95rem",
            padding: "11px 0",
            cursor: !gustoId || cantidad < 1 || loading ? "not-allowed" : "pointer",
            transition: "opacity 0.2s",
          }}
        >
          {loading ? "Registrando..." : "Reponer"}
        </button>
      </form>
    </div>
  );
}

export default ReposicionRapida;
