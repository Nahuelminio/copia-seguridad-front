import React, { useEffect, useState } from "react";
import axios from "axios";
import Loader from "../components/Loader";
import { jwtDecode } from "jwt-decode";

const LIMIT = 50;

const iStyle = { background: "#111827", border: "1px solid #334155", color: "#fff", borderRadius: "8px" };
const lStyle = { fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "6px" };

function HistorialVentas() {
  const [ventas, setVentas] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [sucursalId, setSucursalId] = useState("");
  const [cargando, setCargando] = useState(true);
  const [nombreSucursal, setNombreSucursal] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const API = process.env.REACT_APP_API_URL;
  const token = localStorage.getItem("token");
  const decoded = token ? jwtDecode(token) : {};
  const rol = decoded?.rol?.toLowerCase();
  const esAdmin = rol === "admin";
  const esSucursal = rol === "sucursal";
  const sucursalUsuario = decoded?.sucursalId;

  useEffect(() => {
    if (esSucursal && sucursalUsuario) setSucursalId(sucursalUsuario);
  }, [esSucursal, sucursalUsuario]);

  useEffect(() => { setPage(1); }, [sucursalId]);

  useEffect(() => {
    if (esAdmin) {
      axios.get(`${API}/sucursales`, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => setSucursales(res.data))
        .catch(() => alert("Error al cargar sucursales"));
    }
  }, [API, esAdmin, token]);

  useEffect(() => {
    setCargando(true);
    const params = new URLSearchParams({ page, limit: LIMIT });
    if (sucursalId) params.set("sucursal_id", sucursalId);

    axios.get(`${API}/historial?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        const data = res.data.data ?? [];
        setVentas(data);
        setTotal(res.data.total ?? 0);
        setTotalPages(res.data.totalPages ?? 1);
        if (esSucursal && data.length > 0) setNombreSucursal(data[0].sucursal);
      })
      .catch(() => alert("Error al obtener historial de ventas"))
      .finally(() => setCargando(false));
  }, [API, sucursalId, esSucursal, token, page]);

  const totalFacturado = ventas.reduce((acc, v) => acc + Number(v.precio || 0) * v.cantidad, 0);

  return (
    <div className="mt-4 px-3" style={{ maxWidth: "1400px", margin: "0 auto" }}>

      {/* Título */}
      <div className="text-center mb-4">
        <h2 className="fw-bold mb-0">Historial de Ventas</h2>
        {esSucursal && nombreSucursal && (
          <p className="text-white-50 small mb-0">{nombreSucursal}</p>
        )}
      </div>

      {/* Filtro sucursal (admin) */}
      {esAdmin && (
        <div className="d-flex flex-wrap gap-3 mb-4">
          <div style={{ minWidth: "200px", maxWidth: "280px" }}>
            <label style={lStyle}>Filtrar por sucursal</label>
            <select className="form-select" style={iStyle} value={sucursalId}
              onChange={(e) => setSucursalId(e.target.value)}>
              <option value="">Todas</option>
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {cargando ? (
        <Loader mensaje="Cargando historial de ventas..." />
      ) : (
        <>
          {/* Info y total */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <span className="text-white-50 small">{total} ventas — página {page} de {totalPages}</span>
            <span className="px-3 py-1 rounded small fw-semibold"
              style={{ background: "#111827", border: "1px solid #1e293b", color: "#6ee7a0" }}>
              Total: ${totalFacturado.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Tabla desktop */}
          <div className="d-none d-md-block" style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #1e293b" }}>
            <div className="d-flex justify-content-between align-items-center px-4 py-3"
              style={{ background: "#111827", borderBottom: "1px solid #1e293b" }}>
              <span className="fw-semibold text-white" style={{ fontSize: "0.9rem" }}>Ventas</span>
              <span className="badge rounded-pill" style={{ background: "#1e293b", color: "#94a3b8" }}>{ventas.length}</span>
            </div>
            <div className="table-responsive">
              <table className="table table-dark table-hover align-middle mb-0" style={{ fontSize: "0.88rem" }}>
                <thead>
                  <tr style={{ color: "#64748b", borderBottom: "1px solid #1e293b" }}>
                    {["Fecha", "Sucursal", "Producto", "Gusto", "Cant.", "Precio", "Total"].map((h) => (
                      <th key={h} className="fw-normal py-2 px-3"
                        style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ventas.length === 0 ? (
                    <tr><td colSpan={7} className="text-center text-white-50 py-4">Sin resultados</td></tr>
                  ) : ventas.map((v) => (
                    <tr key={v.id}>
                      <td className="px-3 py-2 text-white-50">{new Date(v.fecha).toLocaleString()}</td>
                      <td className="px-3 py-2 text-white">{v.sucursal}</td>
                      <td className="px-3 py-2 text-white">{v.producto}</td>
                      <td className="px-3 py-2 text-white">{v.gusto}</td>
                      <td className="px-3 py-2 text-white">{v.cantidad}</td>
                      <td className="px-3 py-2 text-white">${Number(v.precio || 0).toFixed(2)}</td>
                      <td className="px-3 py-2 fw-semibold" style={{ color: "#6ee7a0" }}>
                        ${(Number(v.precio || 0) * v.cantidad).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cards mobile */}
          <div className="d-md-none">
            {ventas.length === 0 ? (
              <p className="text-center text-white-50">Sin resultados</p>
            ) : ventas.map((v) => (
              <div key={v.id} className="card mb-2 border-0" style={{ background: "#111827", borderRadius: "10px" }}>
                <div className="card-body py-2 px-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="fw-semibold text-white small">{v.producto} — {v.gusto}</span>
                    <span className="fw-bold small" style={{ color: "#6ee7a0" }}>
                      ${(Number(v.precio || 0) * v.cantidad).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-white-50 small">
                    {v.sucursal} · x{v.cantidad} · ${Number(v.precio || 0).toFixed(2)} c/u
                  </div>
                  <div className="text-white-50 small mt-1">{new Date(v.fecha).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Paginación */}
          <div className="d-flex justify-content-center align-items-center gap-3 mt-4">
            <button className="btn btn-sm fw-medium"
              style={{ background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", borderRadius: "6px" }}
              onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
              Anterior
            </button>
            <span className="text-white-50 small">Página {page} de {totalPages}</span>
            <button className="btn btn-sm fw-medium"
              style={{ background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", borderRadius: "6px" }}
              onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
              Siguiente
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default HistorialVentas;
