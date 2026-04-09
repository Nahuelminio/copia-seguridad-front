import React, { useEffect, useMemo, useState } from "react";
import axios from "../utils/axiosInstance";
import { toast } from "react-toastify";

const iStyle = {
  background: "#0d1526",
  border: "1px solid #1e293b",
  color: "#e2e8f0",
  borderRadius: "8px",
};

const lStyle = {
  color: "#94a3b8",
  fontSize: "0.78rem",
  marginBottom: 4,
};

const thStyle = {
  color: "#64748b",
  fontWeight: 600,
  padding: "8px 12px",
  fontSize: "0.78rem",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  borderBottom: "1px solid #1e293b",
};

const tdStyle = {
  color: "#e2e8f0",
  padding: "9px 12px",
  fontSize: "0.88rem",
  borderBottom: "1px solid #1e293b",
};

function VentasMensuales() {
  const [ventas, setVentas] = useState([]);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [mayorSucursal, setMayorSucursal] = useState(null);
  const [cargando, setCargando] = useState(false);

  const cargarVentas = () => {
    setCargando(true);
    axios
      .get("/ventas-mensuales", { params: { mes, anio } })
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        setVentas(data);
        if (data.length > 0) {
          const max = data.reduce((a, b) =>
            Number(a.total_ventas) > Number(b.total_ventas) ? a : b
          );
          setMayorSucursal(max);
        } else {
          setMayorSucursal(null);
        }
      })
      .catch(() => toast.error("Error al obtener ventas mensuales"))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargarVentas();
  }, [mes, anio]);

  const totalGeneral = useMemo(
    () => ventas.reduce((acc, v) => acc + (Number(v.total_ventas) || 0), 0),
    [ventas]
  );

  const cantidadSucursales = ventas.length;
  const sucursalesConVenta = useMemo(
    () => ventas.filter((v) => Number(v.total_ventas) > 0).length,
    [ventas]
  );

  const nf = new Intl.NumberFormat("es-AR");

  const kpiStyle = {
    background: "#0d1526",
    border: "1px solid #1e293b",
    borderRadius: 10,
    padding: "14px 16px",
  };

  return (
    <div>
      {/* Filtros */}
      <div className="d-flex align-items-end gap-3 mb-4 flex-wrap">
        <div>
          <label style={lStyle}>Mes</label>
          <input
            type="number"
            min="1"
            max="12"
            className="form-control form-control-sm"
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            style={{ ...iStyle, width: 72 }}
          />
        </div>
        <div>
          <label style={lStyle}>Año</label>
          <input
            type="number"
            className="form-control form-control-sm"
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value))}
            style={{ ...iStyle, width: 90 }}
          />
        </div>
        <button
          onClick={cargarVentas}
          disabled={cargando}
          style={{
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: 8,
            color: "#94a3b8",
            fontSize: "0.82rem",
            padding: "6px 14px",
            cursor: cargando ? "not-allowed" : "pointer",
          }}
        >
          {cargando ? "..." : "Recargar"}
        </button>
      </div>

      {/* KPIs */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-4">
          <div style={kpiStyle}>
            <p style={{ ...lStyle, marginBottom: 4 }}>Total general</p>
            <div style={{ color: "#f1f5f9", fontSize: "1.5rem", fontWeight: 700, lineHeight: 1.2 }}>
              {nf.format(totalGeneral)}
            </div>
            <p style={{ color: "#475569", fontSize: "0.75rem", marginBottom: 0, marginTop: 2 }}>
              Mes {mes} / {anio}
            </p>
          </div>
        </div>
        <div className="col-6 col-md-4">
          <div style={kpiStyle}>
            <p style={{ ...lStyle, marginBottom: 4 }}>Sucursales activas</p>
            <div style={{ color: "#f1f5f9", fontSize: "1.5rem", fontWeight: 700, lineHeight: 1.2 }}>
              {sucursalesConVenta}
            </div>
            <p style={{ color: "#475569", fontSize: "0.75rem", marginBottom: 0, marginTop: 2 }}>
              de {cantidadSucursales} reportadas
            </p>
          </div>
        </div>
        <div className="col-6 col-md-4">
          <div style={kpiStyle}>
            <p style={{ ...lStyle, marginBottom: 4 }}>Top sucursal</p>
            {mayorSucursal ? (
              <>
                <div style={{ color: "#6ee7a0", fontSize: "0.88rem", fontWeight: 600, lineHeight: 1.3 }}>
                  {mayorSucursal.sucursal}
                </div>
                <div style={{ color: "#f1f5f9", fontSize: "1.3rem", fontWeight: 700 }}>
                  {nf.format(mayorSucursal.total_ventas)}
                </div>
              </>
            ) : (
              <div style={{ color: "#475569" }}>—</div>
            )}
          </div>
        </div>
      </div>

      {/* Tabla */}
      {ventas.length === 0 ? (
        <p style={{ color: "#64748b", fontSize: "0.85rem" }}>
          No hay ventas registradas para este mes.
        </p>
      ) : (
        <div className="table-responsive">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Sucursal</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Total ventas</th>
              </tr>
            </thead>
            <tbody>
              {ventas.map((v, i) => (
                <tr key={i}>
                  <td style={tdStyle}>
                    {v.sucursal}
                    {mayorSucursal?.sucursal === v.sucursal && (
                      <span
                        style={{
                          marginLeft: 8,
                          color: "#fbbf24",
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          letterSpacing: "0.05em",
                        }}
                      >
                        TOP
                      </span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    {nf.format(v.total_ventas)}
                  </td>
                </tr>
              ))}
              <tr style={{ borderTop: "2px solid #334155" }}>
                <td style={{ ...tdStyle, color: "#94a3b8", fontWeight: 700, borderBottom: "none" }}>
                  Total general
                </td>
                <td
                  style={{
                    ...tdStyle,
                    textAlign: "right",
                    color: "#6ee7a0",
                    fontWeight: 700,
                    borderBottom: "none",
                  }}
                >
                  {nf.format(totalGeneral)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default VentasMensuales;
