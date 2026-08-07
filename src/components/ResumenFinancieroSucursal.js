import React, { useEffect, useState } from "react";
import axios from "../utils/axiosInstance";
import { getUsuario } from "../utils/auth";

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

function ResumenFinancieroSucursal({ recargar }) {
  const usuario = getUsuario();
  const esAdmin = usuario?.rol === "admin";

  const [resumen, setResumen] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [sucursalNombre, setSucursalNombre] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  useEffect(() => {
    setCargando(true);
    const params = new URLSearchParams();
    if (desde) params.set("desde", desde);
    if (hasta) params.set("hasta", hasta);
    const qs = params.toString() ? `?${params.toString()}` : "";

    axios
      .get(`/deuda-por-sucursal${qs}`)
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        if (esAdmin) {
          setResumen(data);
        } else {
          const sucursalData =
            data.find((s) => Number(s.sucursal_id) === Number(usuario?.sucursalId)) ||
            data[0] ||
            null;
          setResumen(sucursalData ? [sucursalData] : []);
          setSucursalNombre(sucursalData?.sucursal || "Desconocida");
        }
      })
      .catch(() => setResumen([]))
      .finally(() => setCargando(false));
  }, [recargar, desde, hasta, esAdmin, usuario?.sucursalId]);

  const totalFacturado = resumen.reduce((acc, s) => acc + Number(s.facturado || 0), 0);
  const totalPagado = resumen.reduce((acc, s) => acc + Number(s.pagado || 0), 0);
  const totalPendiente = totalFacturado - totalPagado;

  if (cargando) {
    return <p style={{ color: "#64748b", fontSize: "0.85rem" }}>Cargando resumen...</p>;
  }

  if (resumen.length === 0) {
    return <p style={{ color: "#64748b", fontSize: "0.85rem" }}>No hay datos para mostrar.</p>;
  }

  const iStyle = {
    background: "#0f172a", border: "1px solid #334155", color: "#e2e8f0",
    borderRadius: "6px", padding: "4px 8px", fontSize: "0.8rem",
  };

  return (
    <div>
      {/* Filtro de fechas (solo admin) */}
      {esAdmin && (
        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <label style={{ color: "#64748b", fontSize: "0.7rem", display: "block", marginBottom: 3 }}>DESDE</label>
            <input type="date" style={iStyle} value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div>
            <label style={{ color: "#64748b", fontSize: "0.7rem", display: "block", marginBottom: 3 }}>HASTA</label>
            <input type="date" style={iStyle} value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
          {(desde || hasta) && (
            <button
              onClick={() => { setDesde(""); setHasta(""); }}
              style={{ background: "none", border: "1px solid #334155", color: "#94a3b8",
                borderRadius: "6px", padding: "4px 10px", fontSize: "0.75rem", cursor: "pointer", alignSelf: "flex-end" }}
            >
              Limpiar
            </button>
          )}
        </div>
      )}

      {!esAdmin && sucursalNombre && (
        <p style={{ color: "#64748b", fontSize: "0.82rem", marginBottom: 12 }}>
          Sucursal:{" "}
          <span style={{ color: "#94a3b8", fontWeight: 600 }}>{sucursalNombre}</span>
        </p>
      )}

      <div className="table-responsive">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Sucursal</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Facturado</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Pagado</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Deuda</th>
              <th style={{ ...thStyle, textAlign: "right" }}>% Pagado</th>
            </tr>
          </thead>
          <tbody>
            {resumen.map((s, i) => {
              const facturado = Number(s.facturado || 0);
              const pagado = Number(s.pagado || 0);
              const deuda = Number(s.deuda ?? facturado - pagado);
              const porcentaje = facturado > 0 ? (pagado / facturado) * 100 : 0;

              return (
                <tr key={i}>
                  <td style={tdStyle}>{s.sucursal}</td>
                  <td style={{ ...tdStyle, textAlign: "right", color: "#94a3b8" }}>
                    ${facturado.toFixed(2)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", color: "#6ee7a0" }}>
                    ${pagado.toFixed(2)}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "right",
                      color: deuda <= 0 ? "#6ee7a0" : "#f87171",
                      fontWeight: 600,
                    }}
                  >
                    ${deuda.toFixed(2)}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "right",
                      fontWeight: 600,
                      color:
                        porcentaje === 100
                          ? "#6ee7a0"
                          : porcentaje >= 50
                          ? "#fbbf24"
                          : "#f87171",
                    }}
                  >
                    {porcentaje.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
          {esAdmin && (
            <tfoot>
              <tr style={{ borderTop: "2px solid #334155" }}>
                <td style={{ ...tdStyle, color: "#94a3b8", fontWeight: 700, borderBottom: "none" }}>
                  Total general
                </td>
                <td style={{ ...tdStyle, textAlign: "right", color: "#94a3b8", fontWeight: 700, borderBottom: "none" }}>
                  ${totalFacturado.toFixed(2)}
                </td>
                <td style={{ ...tdStyle, textAlign: "right", color: "#6ee7a0", fontWeight: 700, borderBottom: "none" }}>
                  ${totalPagado.toFixed(2)}
                </td>
                <td
                  style={{
                    ...tdStyle,
                    textAlign: "right",
                    fontWeight: 700,
                    borderBottom: "none",
                    color: totalPendiente <= 0 ? "#6ee7a0" : "#f87171",
                  }}
                >
                  ${totalPendiente.toFixed(2)}
                </td>
                <td
                  style={{
                    ...tdStyle,
                    textAlign: "right",
                    fontWeight: 700,
                    borderBottom: "none",
                    color:
                      totalFacturado > 0 && (totalPagado / totalFacturado) * 100 === 100
                        ? "#6ee7a0"
                        : "#fbbf24",
                  }}
                >
                  {totalFacturado > 0
                    ? `${((totalPagado / totalFacturado) * 100).toFixed(1)}%`
                    : "0%"}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

export default ResumenFinancieroSucursal;
