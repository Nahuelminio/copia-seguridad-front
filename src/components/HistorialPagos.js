import React, { useEffect, useState, useMemo } from "react";
import axios from "../utils/axiosInstance";
import { getUsuario } from "../utils/auth";

export default function HistorialPagos() {
  // Memoizamos usuario para evitar que cambie referencia en cada render
  const usuario = useMemo(() => getUsuario(), []);
  const esAdmin = usuario?.rol === "admin";

  const [pagos, setPagos] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [filtros, setFiltros] = useState(null);
  const [sucursalesCargadas, setSucursalesCargadas] = useState(false);

  // Función para cargar sucursales
  const loadSucursales = async () => {
    try {
      if (esAdmin) {
        const res = await axios.get("/sucursales");
        setSucursales(res.data);
      } else if (usuario?.sucursalId) {
        const res = await axios.get(`/sucursales/${usuario.sucursalId}`);
        setSucursales([{ id: res.data.id, nombre: res.data.nombre }]);
      }
    } catch (error) {
      if (!error.response) {
        console.error("❤️‍🔥 Network Error:", error.message);
      } else {
        console.error(
          "💔 Error status:",
          error.response.status,
          error.response.data
        );
      }
    } finally {
      setSucursalesCargadas(true);
    }
  };

  // Inicializamos filtros y cargamos sucursales solo una vez al montar
  useEffect(() => {
    const iniciales = {
      sucursal_id: esAdmin ? "" : usuario?.sucursalId || "",
      fecha_inicio: "",
      fecha_fin: "",
    };
    setFiltros(iniciales);
    loadSucursales();
  }, []);

  // Cargamos pagos automáticamente cuando filtros y sucursales estén listos
  useEffect(() => {
    if (sucursalesCargadas && filtros) {
      cargarPagos();
    }
  }, [sucursalesCargadas, filtros]);

  const cargarPagos = async () => {
    try {
      const params = { ...filtros };
      const res = await axios.get("/historial-pagos", { params });
      setPagos(res.data);
    } catch (error) {
      if (!error.response) {
        console.error("❤️‍🔥 Network Error al cargar pagos:", error.message);
      } else {
        console.error(
          "💔 Error status al cargar pagos:",
          error.response.status,
          error.response.data
        );
      }
      alert("❌ Error al cargar historial de pagos");
    }
  };

  const handleChange = (e) => {
    setFiltros((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleBuscar = (e) => {
    e.preventDefault();
    cargarPagos();
  };

  const iStyle = { background: "#111827", border: "1px solid #334155", color: "#fff", borderRadius: "8px" };
  const lStyle = { fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "6px" };

  const totalPagos = pagos.reduce((acc, p) => acc + parseFloat(p.monto || 0), 0);

  if (!filtros) return null;

  return (
    <div className="mt-4 px-3" style={{ maxWidth: "1000px", margin: "0 auto" }}>

      {/* Título */}
      <div className="text-center mb-4">
        <h2 className="fw-bold mb-0">Historial de Pagos</h2>
        {!esAdmin && sucursales.length > 0 && (
          <p className="text-white-50 small mb-0">{sucursales[0].nombre}</p>
        )}
      </div>

      {/* Filtros */}
      <form onSubmit={handleBuscar} className="d-flex flex-wrap gap-3 mb-4 justify-content-center">
        {esAdmin && (
          <div style={{ minWidth: "160px", flex: "1" }}>
            <label style={lStyle}>Sucursal</label>
            <select className="form-select" style={iStyle} name="sucursal_id"
              value={filtros.sucursal_id} onChange={handleChange}>
              <option value="">Todas</option>
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>
        )}

        <div style={{ minWidth: "150px", flex: "1" }}>
          <label style={lStyle}>Desde</label>
          <input type="date" name="fecha_inicio" className="form-control input-dark"
            style={iStyle} value={filtros.fecha_inicio} onChange={handleChange} />
        </div>

        <div style={{ minWidth: "150px", flex: "1" }}>
          <label style={lStyle}>Hasta</label>
          <input type="date" name="fecha_fin" className="form-control input-dark"
            style={iStyle} value={filtros.fecha_fin} onChange={handleChange} />
        </div>

        <div className="d-flex align-items-end" style={{ flex: "0" }}>
          <button type="submit" className="btn fw-medium px-4"
            style={{ background: "#1e293b", color: "#fff", border: "1px solid #334155", borderRadius: "8px" }}>
            Buscar
          </button>
        </div>
      </form>

      {/* Total */}
      {pagos.length > 0 && (
        <div className="d-flex justify-content-between align-items-center mb-3">
          <span className="text-white-50 small">{pagos.length} pagos encontrados</span>
          <span className="px-3 py-1 rounded small" style={{ background: "#111827", border: "1px solid #1e293b", color: "#6ee7a0", fontWeight: 600 }}>
            Total: ${totalPagos.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}

      {/* Tabla desktop */}
      <div className="d-none d-md-block" style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #1e293b" }}>
        <div className="d-flex justify-content-between align-items-center px-4 py-3" style={{ background: "#111827", borderBottom: "1px solid #1e293b" }}>
          <span className="fw-semibold text-white" style={{ fontSize: "0.9rem" }}>Pagos</span>
          <span className="badge rounded-pill" style={{ background: "#1e293b", color: "#94a3b8" }}>{pagos.length}</span>
        </div>
        <div className="table-responsive">
          <table className="table table-dark table-hover align-middle mb-0" style={{ fontSize: "0.88rem" }}>
            <thead>
              <tr style={{ color: "#64748b", borderBottom: "1px solid #1e293b" }}>
                {["#", "Sucursal", "Método", "Monto", "Fecha"].map((h) => (
                  <th key={h} className="fw-normal py-2 px-4"
                    style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagos.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-white-50 py-4">Sin resultados</td></tr>
              ) : pagos.map((pago) => (
                <tr key={pago.id}>
                  <td className="px-4 py-2 text-white-50">{pago.id}</td>
                  <td className="px-4 py-2 text-white">{pago.sucursal}</td>
                  <td className="px-4 py-2 text-white">{pago.metodo}</td>
                  <td className="px-4 py-2 fw-semibold" style={{ color: "#6ee7a0" }}>
                    ${parseFloat(pago.monto).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-white-50">{new Date(pago.fecha).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cards mobile */}
      <div className="d-md-none">
        {pagos.length === 0 ? (
          <p className="text-center text-white-50">Sin resultados</p>
        ) : pagos.map((pago) => (
          <div key={pago.id} className="card mb-2 border-0 shadow-sm" style={{ background: "#111827", borderRadius: "10px" }}>
            <div className="card-body py-2 px-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="text-white fw-semibold small">{pago.sucursal}</span>
                <span className="fw-bold" style={{ color: "#6ee7a0" }}>${parseFloat(pago.monto).toFixed(2)}</span>
              </div>
              <div className="text-white-50 small">{pago.metodo} · {new Date(pago.fecha).toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
