import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "../utils/axiosInstance";

const card = { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, padding: "16px 20px" };
const label = { fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#64748b", fontWeight: 700 };

// Un color por tipo de movimiento, para reconocerlos de un vistazo
const COLOR = {
  venta: "#10b981",
  venta_publica: "#34d399",
  reposicion: "#38bdf8",
  transferencia_salida: "#f59e0b",
  transferencia_entrada: "#fbbf24",
  mayorista: "#f472b6",
  evento_salida: "#a78bfa",
  evento_devolucion: "#c4b5fd",
  ajuste: "#f87171",
  sin_registrar: "#64748b",
};

const fecha = (f) =>
  new Date(f).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

/**
 * Historial de movimientos de stock.
 *
 * Antes no quedaba registro de quién movía qué: para saber a dónde habían ido
 * unas unidades había que cruzar ventas, reposiciones y transferencias a mano,
 * y los ajustes manuales no dejaban rastro. Lo graba la base con un trigger,
 * así que también entra lo que se toca por fuera del sistema.
 */
export default function MovimientosStock() {
  const [datos, setDatos] = useState(null);
  const [sucursales, setSucursales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [filtros, setFiltros] = useState({ sucursal_id: "", motivo: "", q: "", desde: "", hasta: "" });

  useEffect(() => {
    axios.get("/sucursales").then((r) => setSucursales(r.data || [])).catch(() => {});
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const params = new URLSearchParams();
      Object.entries(filtros).forEach(([k, v]) => { if (v) params.append(k, v); });
      params.append("limite", "300");
      const r = await axios.get(`/movimientos-stock?${params}`);
      setDatos(r.data);
    } catch (e) {
      setError(e.response?.data?.error || "No se pudieron traer los movimientos");
    } finally {
      setCargando(false);
    }
  }, [filtros]);

  useEffect(() => { cargar(); }, [cargar]);

  const movimientos = datos?.movimientos || [];
  const motivos = datos?.motivos || {};

  const resumen = useMemo(() => {
    const entra = movimientos.filter((m) => m.delta > 0).reduce((a, m) => a + m.delta, 0);
    const sale = movimientos.filter((m) => m.delta < 0).reduce((a, m) => a - m.delta, 0);
    const sinRegistrar = movimientos.filter((m) => m.motivo === "sin_registrar").length;
    return { entra, sale, sinRegistrar };
  }, [movimientos]);

  const input = {
    background: "#0d1526", border: "1px solid #2b3b55", color: "#e8eef7",
    borderRadius: 9, padding: "8px 11px", fontSize: "0.85rem", width: "100%",
  };

  return (
    <div className="container-fluid mt-4 px-3 mb-5">
      <div className="mb-4">
        <h4 style={{ color: "#f1f5f9", fontWeight: 700, marginBottom: 4 }}>Movimientos de stock</h4>
        <p style={{ color: "#64748b", fontSize: "0.84rem", margin: 0 }}>
          Todo lo que entra y sale, con el motivo y quién lo hizo.
        </p>
      </div>

      {/* ── Filtros ── */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div className="row g-2">
          <div className="col-12 col-md-3">
            <div style={{ ...label, marginBottom: 4 }}>Producto o sabor</div>
            <input style={input} placeholder="Buscar..." value={filtros.q}
              onChange={(e) => setFiltros({ ...filtros, q: e.target.value })} />
          </div>
          <div className="col-6 col-md-2">
            <div style={{ ...label, marginBottom: 4 }}>Sucursal</div>
            <select style={input} value={filtros.sucursal_id}
              onChange={(e) => setFiltros({ ...filtros, sucursal_id: e.target.value })}>
              <option value="">Todas</option>
              {sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
          <div className="col-6 col-md-2">
            <div style={{ ...label, marginBottom: 4 }}>Motivo</div>
            <select style={input} value={filtros.motivo}
              onChange={(e) => setFiltros({ ...filtros, motivo: e.target.value })}>
              <option value="">Todos</option>
              {Object.entries(motivos).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="col-6 col-md-2">
            <div style={{ ...label, marginBottom: 4 }}>Desde</div>
            <input type="date" style={input} value={filtros.desde}
              onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })} />
          </div>
          <div className="col-6 col-md-2">
            <div style={{ ...label, marginBottom: 4 }}>Hasta</div>
            <input type="date" style={input} value={filtros.hasta}
              onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })} />
          </div>
          <div className="col-12 col-md-1 d-flex align-items-end">
            <button style={{ ...input, cursor: "pointer", background: "#1e293b" }}
              onClick={() => setFiltros({ sucursal_id: "", motivo: "", q: "", desde: "", hasta: "" })}>
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2">{error}</div>}

      {!cargando && movimientos.length > 0 && (
        <div className="d-flex flex-wrap gap-3 mb-3">
          {[
            { t: "Movimientos", v: movimientos.length, c: "#e2e8f0" },
            { t: "Entraron", v: `+${resumen.entra}`, c: "#10b981" },
            { t: "Salieron", v: `-${resumen.sale}`, c: "#f87171" },
          ].map((x) => (
            <div key={x.t} style={{ ...card, flex: "1 1 140px", minWidth: 130 }}>
              <div style={label}>{x.t}</div>
              <div style={{ color: x.c, fontWeight: 700, fontSize: "1.3rem", marginTop: 4 }}>{x.v}</div>
            </div>
          ))}
        </div>
      )}

      {/* Los que no tienen motivo son cambios hechos por fuera del sistema */}
      {resumen.sinRegistrar > 0 && (
        <div style={{ ...card, marginBottom: 16, borderColor: "#78350f", background: "#1c1408", color: "#fbbf24", fontSize: "0.82rem" }}>
          <strong>{resumen.sinRegistrar} movimiento{resumen.sinRegistrar === 1 ? "" : "s"} sin motivo.</strong>{" "}
          Son cambios de stock hechos por fuera del sistema, o desde alguna pantalla que todavía no informa el motivo.
        </div>
      )}

      {cargando && <div className="text-center py-5"><div className="spinner-border text-secondary" /></div>}

      {!cargando && movimientos.length === 0 && (
        <div style={{ ...card, textAlign: "center", color: "#64748b" }}>
          No hay movimientos con esos filtros.
        </div>
      )}

      {!cargando && movimientos.length > 0 && (
        <div style={{ ...card, overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 700, fontSize: "0.84rem" }}>
            <thead>
              <tr style={{ color: "#64748b", fontSize: "0.66rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                <th style={{ textAlign: "left", paddingBottom: 8 }}>Cuándo</th>
                <th style={{ textAlign: "left", paddingBottom: 8 }}>Producto</th>
                <th style={{ textAlign: "left", paddingBottom: 8 }}>Sucursal</th>
                <th style={{ textAlign: "left", paddingBottom: 8 }}>Motivo</th>
                <th style={{ textAlign: "right", paddingBottom: 8 }}>Cambio</th>
                <th style={{ textAlign: "right", paddingBottom: 8 }}>Quedó</th>
                <th style={{ textAlign: "left", paddingBottom: 8 }}>Quién</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map((m) => (
                <tr key={m.id} style={{ borderTop: "1px solid #1e293b" }}>
                  <td style={{ color: "#94a3b8", padding: "8px 0", whiteSpace: "nowrap" }}>{fecha(m.creado_at)}</td>
                  <td style={{ color: "#e2e8f0" }}>
                    {m.producto || `gusto ${m.gusto_id}`}
                    {m.gusto && <span style={{ color: "#64748b" }}> · {m.gusto}</span>}
                  </td>
                  <td style={{ color: "#94a3b8" }}>{m.sucursal || m.sucursal_id}</td>
                  <td>
                    <span style={{
                      color: COLOR[m.motivo] || "#94a3b8", fontSize: "0.78rem",
                      border: `1px solid ${COLOR[m.motivo] || "#334155"}33`,
                      background: `${COLOR[m.motivo] || "#334155"}1a`,
                      borderRadius: 999, padding: "2px 9px", whiteSpace: "nowrap",
                    }}>
                      {m.motivo_texto}
                    </span>
                    {m.referencia && <div style={{ color: "#475569", fontSize: "0.7rem", marginTop: 2 }}>{m.referencia}</div>}
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 700, color: m.delta > 0 ? "#10b981" : "#f87171" }}>
                    {m.delta > 0 ? `+${m.delta}` : m.delta}
                  </td>
                  <td style={{ textAlign: "right", color: "#cbd5e1" }}>{m.cantidad_despues}</td>
                  <td style={{ color: "#64748b", fontSize: "0.76rem" }}>{m.usuario || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
