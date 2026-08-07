import React, { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import Loader from "../components/Loader";
import { jwtDecode } from "jwt-decode";

const LIMIT = 50;

const iStyle = { background: "#111827", border: "1px solid #334155", color: "#fff", borderRadius: "8px" };
const lStyle = { fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "6px" };

function HistorialVentas() {
  const [ventas, setVentas] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [sucursalId, setSucursalId] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState(false);
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

  useEffect(() => { setPage(1); }, [sucursalId, desde, hasta]);

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
    if (desde) params.set("desde", desde);
    if (hasta) params.set("hasta", hasta);

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
  }, [API, sucursalId, desde, hasta, esSucursal, token, page]);

  const exportarExcel = async () => {
    setExportando(true);
    try {
      const params = new URLSearchParams();
      if (sucursalId) params.set("sucursal_id", sucursalId);
      if (desde) params.set("desde", desde);
      if (hasta) params.set("hasta", hasta);

      const res = await axios.get(`${API}/historial-export?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } });

      const datos = res.data.map((v) => ({
        "ID": v.id,
        "Fecha": v.fecha,
        "Hora": v.hora,
        "Sucursal": v.sucursal,
        "Producto": v.producto,
        "Gusto": v.gusto,
        "Cantidad": Number(v.cantidad),
        "Precio Unitario": Number(v.precio_unitario),
        "Total Venta": Number(v.total),
        "Costo Unitario": Number(v.costo_unitario),
        "Costo Total": Number(v.costo_total),
        "Ganancia": Number(v.ganancia),
      }));

      const ws = XLSX.utils.json_to_sheet(datos);
      ws["!cols"] = [
        { wch: 8 }, { wch: 12 }, { wch: 8 }, { wch: 18 }, { wch: 22 },
        { wch: 22 }, { wch: 8 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 12 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Historial Ventas");
      const nombre = `historial_ventas${desde ? `_${desde}` : ""}${hasta ? `_al_${hasta}` : ""}.xlsx`;
      XLSX.writeFile(wb, nombre);
    } catch {
      alert("Error al exportar");
    } finally {
      setExportando(false);
    }
  };

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

      {/* Filtros */}
      {esAdmin && (
        <div className="d-flex flex-wrap gap-3 mb-4 align-items-end">
          <div style={{ minWidth: "200px", maxWidth: "260px" }}>
            <label style={lStyle}>Sucursal</label>
            <select className="form-select" style={iStyle} value={sucursalId}
              onChange={(e) => setSucursalId(e.target.value)}>
              <option value="">Todas</option>
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>
          <div style={{ minWidth: "150px" }}>
            <label style={lStyle}>Desde</label>
            <input type="date" className="form-control" style={iStyle}
              value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div style={{ minWidth: "150px" }}>
            <label style={lStyle}>Hasta</label>
            <input type="date" className="form-control" style={iStyle}
              value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
          <div>
            <label style={{ ...lStyle, opacity: 0 }}>x</label>
            <button
              className="btn btn-sm d-block"
              style={{ background: "#10b981", color: "#fff", border: "none", borderRadius: "8px",
                padding: "8px 18px", fontWeight: 600, opacity: exportando ? 0.7 : 1 }}
              onClick={exportarExcel}
              disabled={exportando}
            >
              {exportando ? "Exportando…" : "⬇ Exportar Excel"}
            </button>
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
