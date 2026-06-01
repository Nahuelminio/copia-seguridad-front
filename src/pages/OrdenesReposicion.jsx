import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../utils/axiosInstance";
import { toast } from "react-toastify";
import { jwtDecode } from "jwt-decode";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalizar = (str = "") =>
  String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

function formatFecha(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const BADGE = {
  pendiente:  "bg-warning text-dark",
  confirmada: "bg-success",
  cancelada:  "bg-secondary",
};

const cardStyle = {
  background: "#131920",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 14,
  color: "#fff",
};

const selectDark = { background: "#1e2530", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", borderRadius: 8 };
const optionDark  = { background: "#1e2530", color: "#fff" };
const inputDark   = { background: "#1e2530", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", borderRadius: 8 };

// ─── Hook modal confirmación ──────────────────────────────────────────────────

function useConfirm() {
  const [state, setState] = useState({ show: false, title: "", message: "", resolve: null });

  const showConfirm = (title, message) =>
    new Promise((resolve) => setState({ show: true, title, message, resolve }));

  const handleOk = () => { setState((s) => ({ ...s, show: false })); state.resolve(true); };
  const handleCancel = () => { setState((s) => ({ ...s, show: false })); state.resolve(false); };

  const confirmModal = state.show ? (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={handleCancel}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#1e2530", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: "28px 32px", maxWidth: 420, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
        <h6 style={{ color: "#fff", fontWeight: 700, marginBottom: 10 }}>{state.title}</h6>
        <p style={{ color: "#94a3b8", marginBottom: 24, lineHeight: 1.6, whiteSpace: "pre-line" }}>{state.message}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={handleCancel} style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.18)", background: "transparent", color: "#cbd5e1", cursor: "pointer", fontWeight: 500 }}>Cancelar</button>
          <button onClick={handleOk} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#3b82f6", color: "#fff", cursor: "pointer", fontWeight: 600 }}>Confirmar</button>
        </div>
      </div>
    </div>
  ) : null;

  return { showConfirm, confirmModal };
}

// ─── Remito PDF ───────────────────────────────────────────────────────────────

function imprimirRemito({ sucursal, items, notas, fecha }) {
  const grupos = {};
  for (const it of items) {
    if (!grupos[it.producto_nombre]) grupos[it.producto_nombre] = [];
    grupos[it.producto_nombre].push(it);
  }

  const filas = Object.entries(grupos).map(([prod, gustos]) => `
    <tr><td colspan="2" style="background:#f0f4f8;font-weight:700;padding:6px 10px">${prod}</td></tr>
    ${gustos.map(g => `<tr><td style="padding:5px 10px 5px 22px;color:#444">${g.gusto}</td><td style="text-align:center;font-weight:600">${g.cantidad}</td></tr>`).join("")}
  `).join("");

  const totalUds = items.reduce((s, i) => s + i.cantidad, 0);
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Orden de reposición</title>
  <style>body{font-family:Arial,sans-serif;padding:24px;color:#222}h2{margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:16px}th{background:#222;color:#fff;padding:8px 10px;text-align:left}th:last-child{text-align:center}td{border-bottom:1px solid #e2e8f0}@media print{body{padding:8px}}</style>
  </head><body>
  <h2>Orden de Reposición</h2>
  <p style="color:#555;margin:0">Sucursal: <strong>${sucursal}</strong> &nbsp;|&nbsp; Fecha: ${fecha}</p>
  ${notas ? `<p style="margin-top:8px;color:#666"><em>Notas: ${notas}</em></p>` : ""}
  <table><thead><tr><th>Producto / Gusto</th><th style="width:100px;text-align:center">Cantidad</th></tr></thead>
  <tbody>${filas}</tbody></table>
  <div style="margin-top:16px;font-weight:700;font-size:1.05rem">Total: ${totalUds} unidades</div>
  <script>window.onload=function(){window.print()}<\/script></body></html>`;

  const win = window.open("", "_blank", "width=720,height=960");
  if (!win) { alert("Habilitá los pop-ups para generar el PDF"); return; }
  win.document.write(html);
  win.document.close();
}

// ─── Detalle orden ────────────────────────────────────────────────────────────

function DetalleOrden({ ordenId, onVolver, onConfirmada }) {
  const [orden, setOrden] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [confirmando, setConfirmando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const { showConfirm, confirmModal } = useConfirm();

  useEffect(() => {
    axios.get(`/ordenes-reposicion/${ordenId}`)
      .then((r) => setOrden(r.data))
      .catch(() => toast.error("Error al cargar la orden"))
      .finally(() => setCargando(false));
  }, [ordenId]);

  const handleConfirmar = async () => {
    const ok = await showConfirm(
      "Confirmar orden de reposición",
      `Sucursal: ${orden.sucursal}\nProductos: ${orden.items?.length} ítem(s)\n\nEl stock se sumará en "${orden.sucursal}". Esta acción no se puede deshacer.`
    );
    if (!ok) return;
    setConfirmando(true);
    try {
      await axios.post(`/ordenes-reposicion/${ordenId}/confirmar`);
      toast.success("Orden confirmada — stock actualizado");
      onConfirmada();
    } catch (e) {
      toast.error(e.response?.data?.error || "Error al confirmar");
    } finally {
      setConfirmando(false);
    }
  };

  const handleCancelar = async () => {
    if (!(await showConfirm("Cancelar orden", "¿Estás seguro de que querés cancelar esta orden?"))) return;
    setCancelando(true);
    try {
      await axios.delete(`/ordenes-reposicion/${ordenId}`);
      toast.success("Orden cancelada");
      onVolver();
    } catch (e) {
      toast.error(e.response?.data?.error || "Error al cancelar");
    } finally {
      setCancelando(false);
    }
  };

  if (cargando) return <div className="text-center py-5" style={{ color: "#94a3b8" }}>Cargando...</div>;
  if (!orden) return null;

  return (
    <div className="container py-4" style={{ maxWidth: 760 }}>
      <div className="d-flex gap-2 mb-4 flex-wrap align-items-center">
        <button className="btn btn-outline-secondary btn-sm" onClick={onVolver}>← Volver</button>
        <span className={`badge ${BADGE[orden.estado] || "bg-secondary"} ms-1`}>{orden.estado}</span>
        {orden.estado === "pendiente" && (
          <>
            <button className="btn btn-success btn-sm" disabled={confirmando} onClick={handleConfirmar}>
              {confirmando ? "Confirmando…" : "Confirmar orden"}
            </button>
            <button className="btn btn-outline-danger btn-sm" disabled={cancelando} onClick={handleCancelar}>
              {cancelando ? "…" : "Cancelar"}
            </button>
          </>
        )}
        <div className="ms-auto">
          <button
            className="btn btn-outline-light btn-sm"
            onClick={() => imprimirRemito({ sucursal: orden.sucursal, items: orden.items || [], notas: orden.notas || "", fecha: formatFecha(orden.fecha_confirmacion || orden.fecha_creacion) })}
          >
            Generar remito
          </button>
        </div>
      </div>

      <div className="card mb-3" style={cardStyle}>
        <div className="card-body">
          <h5 className="fw-bold mb-3" style={{ color: "#fff" }}>Orden #{orden.id}</h5>
          <div className="row g-3">
            <div className="col-sm-6">
              <div className="small mb-1" style={{ color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.7rem", fontWeight: 600 }}>Sucursal</div>
              <div className="fw-semibold" style={{ color: "#fff" }}>{orden.sucursal}</div>
            </div>
            <div className="col-sm-6">
              <div className="small mb-1" style={{ color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.7rem", fontWeight: 600 }}>Fecha</div>
              <div style={{ color: "#e2e8f0" }}>{formatFecha(orden.fecha_creacion)}</div>
              {orden.fecha_confirmacion && (
                <div className="small" style={{ color: "#94a3b8", marginTop: 2 }}>Confirmada: {formatFecha(orden.fecha_confirmacion)}</div>
              )}
            </div>
          </div>
          {orden.notas && (
            <div className="mt-3 small" style={{ color: "#94a3b8" }}>
              <strong style={{ color: "#cbd5e1" }}>Notas:</strong> {orden.notas}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={cardStyle}>
        <div className="card-body p-0">
          <table className="table table-dark table-hover mb-0">
            <thead>
              <tr>
                <th>Producto</th>
                <th className="text-center" style={{ width: 90 }}>A reponer</th>
                {orden.items?.some(i => i.precio_costo != null) && (
                  <>
                    <th className="text-center" style={{ width: 100 }}>Costo unit.</th>
                    <th className="text-center" style={{ width: 100 }}>Costo total</th>
                    <th className="text-center" style={{ width: 90 }}>Margen</th>
                  </>
                )}
                <th className="text-center" style={{ width: 110 }}>Stock actual</th>
              </tr>
            </thead>
            <tbody>
              {(orden.items || []).map((it) => {
                const tieneCosto = orden.items?.some(i => i.precio_costo != null);
                const costoTotal = it.precio_costo != null ? it.precio_costo * it.cantidad : null;
                const margenPct = it.precio_costo != null && it.precio_venta != null && it.precio_costo > 0
                  ? (((it.precio_venta - it.precio_costo) / it.precio_costo) * 100).toFixed(1)
                  : null;
                return (
                  <tr key={it.id}>
                    <td>
                      <div className="fw-semibold small">{it.producto_nombre}</div>
                      <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>{it.gusto}</div>
                    </td>
                    <td className="text-center fw-bold">{it.cantidad}</td>
                    {tieneCosto && (
                      <>
                        <td className="text-center small" style={{ color: "#f87171" }}>
                          {it.precio_costo != null ? `$${Number(it.precio_costo).toLocaleString("es-AR")}` : "—"}
                        </td>
                        <td className="text-center small" style={{ color: "#f87171", fontWeight: 600 }}>
                          {costoTotal != null ? `$${costoTotal.toLocaleString("es-AR")}` : "—"}
                        </td>
                        <td className="text-center">
                          {margenPct != null ? (
                            <span style={{
                              background: Number(margenPct) >= 30 ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                              color: Number(margenPct) >= 30 ? "#10b981" : "#f59e0b",
                              borderRadius: 6, padding: "2px 7px", fontSize: "0.78rem", fontWeight: 700,
                            }}>+{margenPct}%</span>
                          ) : <span style={{ color: "#475569", fontSize: "0.78rem" }}>—</span>}
                        </td>
                      </>
                    )}
                    <td className="text-center small" style={{ color: "#4ade80" }}>{it.stock_actual} u.</td>
                  </tr>
                );
              })}
            </tbody>
            {orden.items?.some(i => i.precio_costo != null) && (
              <tfoot>
                <tr style={{ borderTop: "2px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.2)" }}>
                  <td className="fw-bold small" style={{ color: "#94a3b8", padding: "8px 12px" }}>Total</td>
                  <td className="text-center fw-bold">{orden.items.reduce((s, i) => s + i.cantidad, 0)} u.</td>
                  <td />
                  <td className="text-center fw-bold" style={{ color: "#f87171" }}>
                    ${orden.items
                      .filter(i => i.precio_costo != null)
                      .reduce((s, i) => s + i.precio_costo * i.cantidad, 0)
                      .toLocaleString("es-AR")}
                  </td>
                  <td /><td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
      {confirmModal}
    </div>
  );
}

// ─── Formulario nueva orden ───────────────────────────────────────────────────

const CENTRAL_ID = 7;

function FormNuevaOrden({ sucursales, onGuardada, onCancelar }) {
  const [sucursalId, setSucursalId] = useState("");
  const [notas, setNotas] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [productos, setProductos] = useState([]);
  const [items, setItems] = useState([]);
  const [mostrarDrop, setMostrarDrop] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [tipoCambio, setTipoCambio] = useState("");
  const inputRef = useRef(null);
  const dropRef = useRef(null);

  // Cargar todos los gustos (sin filtrar por sucursal — es reposición)
  useEffect(() => {
    if (!sucursalId) { setProductos([]); return; }
    axios.get("/gustos-todos").then((r) => setProductos(r.data || [])).catch(() => {});
  }, [sucursalId]);

  const productosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return [];
    const q = normalizar(busqueda);
    return productos.filter(
      (p) => normalizar(p.producto_nombre || p.nombre || "").includes(q) ||
             normalizar(p.gusto || p.nombre_gusto || "").includes(q) ||
             (p.codigo_barra && String(p.codigo_barra).includes(busqueda))
    ).slice(0, 30);
  }, [busqueda, productos]);

  const esCentral = String(sucursalId) === String(CENTRAL_ID);

  // Helper: convierte USD a ARS usando tipoCambio
  const tc = tipoCambio !== "" ? Number(tipoCambio) : null;
  const usdToArs = (usd) => (tc != null && usd !== "" && usd != null ? Number(usd) * tc : null);

  const agregarItem = (p) => {
    const id = p.gusto_id || p.id;
    if (items.find((i) => i.gusto_id === id)) {
      toast.info("Ya está en la lista");
    } else {
      setItems((prev) => [...prev, {
        gusto_id: id,
        producto_nombre: p.producto_nombre || p.nombre || "—",
        gusto: p.gusto || p.nombre_gusto || "—",
        cantidad: 1,
        precio_costo: "",
      }]);
    }
    setBusqueda("");
    setMostrarDrop(false);
    inputRef.current?.focus();
  };

  const actualizarCantidad = (gusto_id, val) => {
    setItems((prev) => prev.map((i) => i.gusto_id === gusto_id ? { ...i, cantidad: val === "" ? "" : Math.max(1, parseInt(val) || 1) } : i));
  };

  const fijarCantidad = (gusto_id) => {
    setItems((prev) => prev.map((i) => i.gusto_id === gusto_id ? { ...i, cantidad: Math.max(1, parseInt(i.cantidad) || 1) } : i));
  };

  const actualizarPrecioCosto = (gusto_id, val) => {
    setItems((prev) => prev.map((i) => i.gusto_id === gusto_id ? { ...i, precio_costo: val } : i));
  };

  const eliminarItem = (gusto_id) => setItems((prev) => prev.filter((i) => i.gusto_id !== gusto_id));

  const puedeGuardar = sucursalId && items.length > 0 && !guardando;

  const guardar = async () => {
    if (!puedeGuardar) return;
    setGuardando(true);
    try {
      const res = await axios.post("/ordenes-reposicion", {
        sucursal_id: parseInt(sucursalId),
        notas: notas.trim() || undefined,
        items: items.map((i) => {
          let pc = null;
          if (esCentral && i.precio_costo !== "") {
            const usd = Number(i.precio_costo);
            pc = tc != null ? usd * tc : usd; // convert to ARS if exchange rate set, else treat as ARS
          }
          return {
            gusto_id: i.gusto_id,
            cantidad: i.cantidad,
            ...(pc != null ? { precio_costo: pc } : {}),
          };
        }),
      });
      toast.success("Orden creada como pendiente");
      onGuardada(res.data.id);
    } catch (e) {
      toast.error(e.response?.data?.error || "Error al crear la orden");
    } finally {
      setGuardando(false);
    }
  };

  // ESC y click afuera cierran dropdown
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") { setMostrarDrop(false); setBusqueda(""); } };
    const handleClick = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setMostrarDrop(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    window.addEventListener("mousedown", handleClick);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("mousedown", handleClick);
    };
  }, []);

  return (
    <div className="container py-4" style={{ maxWidth: 760 }}>
      <div className="d-flex align-items-center gap-3 mb-4">
        <button className="btn btn-outline-secondary btn-sm" onClick={onCancelar}>← Volver</button>
        <h5 className="fw-bold mb-0" style={{ color: "#fff" }}>Nueva orden de reposición</h5>
      </div>

      {/* Sucursal */}
      <div className="card mb-3" style={cardStyle}>
        <div className="card-body">
          <label className="form-label small fw-semibold" style={{ color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.7rem" }}>
            Sucursal a reponer
          </label>
          <select
            className="form-select"
            style={selectDark}
            value={sucursalId}
            onChange={(e) => { setSucursalId(e.target.value); setItems([]); setBusqueda(""); }}
          >
            <option value="" style={optionDark}>— Seleccionar —</option>
            {sucursales.map((s) => <option key={s.id} value={s.id} style={optionDark}>{s.nombre}</option>)}
          </select>
        </div>
      </div>

      {/* Tipo de cambio (solo Central) */}
      {esCentral && (
        <div className="card mb-3" style={{ ...cardStyle, border: "1px solid rgba(245,158,11,0.35)" }}>
          <div className="card-body">
            <div className="d-flex align-items-center gap-3 flex-wrap">
              <div style={{ flex: 1, minWidth: 200 }}>
                <label className="form-label small fw-semibold" style={{ color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.7rem" }}>
                  💱 Tipo de cambio USD → $ ARS
                </label>
                <div className="d-flex align-items-center gap-2">
                  <span style={{ color: "#94a3b8", fontSize: "0.9rem", flexShrink: 0 }}>1 USD =</span>
                  <input
                    className="form-control form-control-sm"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="ej: 1200"
                    value={tipoCambio}
                    onChange={(e) => setTipoCambio(e.target.value)}
                    style={{ ...inputDark, maxWidth: 130, borderColor: "rgba(245,158,11,0.5)", fontWeight: 700, fontSize: "1rem" }}
                  />
                  <span style={{ color: "#94a3b8", fontSize: "0.9rem", flexShrink: 0 }}>$ ARS</span>
                </div>
              </div>
              <div style={{ color: "#64748b", fontSize: "0.78rem", maxWidth: 260 }}>
                {tc != null
                  ? <span style={{ color: "#f59e0b" }}>Cargá los costos en USD — el sistema los convierte a $ ARS automáticamente al guardar.</span>
                  : <span>Completá el tipo de cambio para cargar costos en USD. Si lo dejás vacío, el campo de costo se tomará como pesos.</span>
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Buscador */}
      {sucursalId && (
        <div className="card mb-3" style={cardStyle}>
          <div className="card-body">
            <label className="form-label small fw-semibold" style={{ color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.7rem" }}>
              Agregar producto
            </label>
            <div ref={dropRef} style={{ position: "relative" }}>
              <input
                ref={inputRef}
                className="form-control"
                style={inputDark}
                placeholder="Buscar por nombre, gusto o código de barras..."
                value={busqueda}
                onChange={(e) => { setBusqueda(e.target.value); setMostrarDrop(true); }}
                onFocus={() => busqueda && setMostrarDrop(true)}
              />
              {mostrarDrop && productosFiltrados.length > 0 && (
                <div style={{
                  position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
                  background: "#1e2530", border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 10, maxHeight: 280, overflowY: "auto", marginTop: 4,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                }}>
                  {productosFiltrados.map((p) => {
                    const id = p.gusto_id || p.id;
                    const yaAgregado = items.some((i) => i.gusto_id === id);
                    return (
                      <div
                        key={id}
                        onClick={() => !yaAgregado && agregarItem(p)}
                        style={{
                          padding: "10px 14px", cursor: yaAgregado ? "default" : "pointer",
                          borderBottom: "1px solid rgba(255,255,255,0.06)",
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          opacity: yaAgregado ? 0.5 : 1,
                        }}
                        onMouseEnter={(e) => { if (!yaAgregado) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <span>
                          <span style={{ color: "#fff", fontWeight: 600, fontSize: "0.88rem" }}>{p.producto_nombre || p.nombre}</span>
                          <span style={{ color: "#94a3b8", fontSize: "0.82rem" }}> — {p.gusto || p.nombre_gusto}</span>
                        </span>
                        {yaAgregado && <span style={{ color: "#4ade80", fontSize: "0.75rem" }}>✓ agregado</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Items agregados */}
            {items.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div className="small fw-semibold mb-2" style={{ color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.7rem" }}>
                  PRODUCTOS A REPONER · {items.length} producto{items.length !== 1 ? "s" : ""} · {items.reduce((s, i) => s + (Number(i.cantidad) || 0), 0)} u. en total
                  {esCentral && !tc && <span style={{ color: "#f59e0b", marginLeft: 8 }}>— Central: podés cargar precio de costo</span>}
                  {esCentral && tc != null && <span style={{ color: "#f59e0b", marginLeft: 8 }}>— Costos en USD · TC: ${tc.toLocaleString("es-AR")}</span>}
                </div>
                {items.map((it) => {
                  const arsUnit = usdToArs(it.precio_costo);
                  const arsTotal = arsUnit != null ? arsUnit * (Number(it.cantidad) || 0) : null;
                  return (
                  <div key={it.gusto_id} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                    background: "rgba(255,255,255,0.04)", borderRadius: 10, marginBottom: 6,
                    border: "1px solid rgba(255,255,255,0.07)", flexWrap: "wrap",
                  }}>
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <div style={{ color: "#fff", fontWeight: 600, fontSize: "0.88rem" }}>{it.producto_nombre}</div>
                      <div style={{ color: "#94a3b8", fontSize: "0.78rem" }}>{it.gusto}</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "0.68rem", color: "#64748b", marginBottom: 4 }}>CANTIDAD</div>
                      <input
                        className="form-control form-control-sm text-center"
                        type="number" min="1"
                        value={it.cantidad}
                        onChange={(e) => actualizarCantidad(it.gusto_id, e.target.value)}
                        onBlur={() => fijarCantidad(it.gusto_id)}
                        style={{ ...inputDark, width: 72, margin: "0 auto", fontWeight: 700, fontSize: "1rem" }}
                      />
                    </div>
                    {esCentral && (
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "0.68rem", color: "#f59e0b", marginBottom: 4 }}>
                          {tc != null ? "COSTO USD" : "COSTO UNIT. $"}
                        </div>
                        <input
                          className="form-control form-control-sm text-center"
                          type="number" min="0" step="0.01"
                          value={it.precio_costo}
                          onChange={(e) => actualizarPrecioCosto(it.gusto_id, e.target.value)}
                          placeholder="—"
                          style={{ ...inputDark, width: 90, margin: "0 auto", fontSize: "0.92rem", borderColor: tc != null ? "rgba(245,158,11,0.5)" : undefined }}
                        />
                        {tc != null && arsUnit != null && (
                          <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: 3 }}>
                            = ${arsUnit.toLocaleString("es-AR", { maximumFractionDigits: 0 })} c/u
                          </div>
                        )}
                      </div>
                    )}
                    {esCentral && tc != null && arsTotal != null && (
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "0.68rem", color: "#64748b", marginBottom: 4 }}>SUBTOTAL ARS</div>
                        <div style={{ color: "#f87171", fontWeight: 600, fontSize: "0.88rem" }}>
                          ${arsTotal.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => eliminarItem(it.gusto_id)}
                      style={{
                        background: "none", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171",
                        borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: "1rem",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}
                    >×</button>
                  </div>
                  );
                })}
                {/* Totals summary when TC is set */}
                {esCentral && tc != null && items.some(i => i.precio_costo !== "") && (() => {
                  const totalUsd = items.reduce((s, i) => {
                    const usd = i.precio_costo !== "" ? Number(i.precio_costo) : 0;
                    return s + usd * (Number(i.cantidad) || 0);
                  }, 0);
                  const totalArs = totalUsd * tc;
                  return (
                    <div style={{
                      marginTop: 10, padding: "10px 14px",
                      background: "rgba(245,158,11,0.08)", borderRadius: 8,
                      border: "1px solid rgba(245,158,11,0.25)",
                      display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center",
                    }}>
                      <div>
                        <span style={{ color: "#64748b", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total USD </span>
                        <span style={{ color: "#f59e0b", fontWeight: 700 }}>
                          USD {totalUsd.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: "#64748b", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>= Total ARS </span>
                        <span style={{ color: "#f87171", fontWeight: 700 }}>
                          ${totalArs.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div style={{ color: "#475569", fontSize: "0.72rem" }}>
                        TC: 1 USD = ${tc.toLocaleString("es-AR")}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notas */}
      {sucursalId && (
        <div className="card mb-3" style={cardStyle}>
          <div className="card-body">
            <label className="form-label small fw-semibold" style={{ color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.7rem" }}>
              Notas (opcional)
            </label>
            <textarea
              className="form-control"
              style={{ ...inputDark, minHeight: 80, resize: "vertical" }}
              placeholder="Observaciones de la reposición..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </div>
        </div>
      )}

      {sucursalId && (
        <div className="d-flex gap-2 align-items-center flex-wrap">
          <button
            className="btn btn-primary"
            disabled={!puedeGuardar}
            onClick={guardar}
            title={!puedeGuardar ? "Seleccioná una sucursal y agregá al menos un producto" : ""}
          >
            {guardando ? "Guardando…" : "Crear orden"}
          </button>
          {items.length > 0 && (
            <button
              className="btn btn-outline-secondary"
              onClick={() => imprimirRemito({
                sucursal: sucursales.find((s) => String(s.id) === String(sucursalId))?.nombre || "—",
                items, notas,
                fecha: new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }),
              })}
            >
              Generar remito borrador
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function OrdenesReposicion() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const rol = token ? jwtDecode(token)?.rol : null;

  const [vista, setVista] = useState("lista");
  const [detalleId, setDetalleId] = useState(null);
  const [ordenes, setOrdenes] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [cancelandoId, setCancelandoId] = useState(null);
  const { showConfirm, confirmModal } = useConfirm();

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params = new URLSearchParams({ page, limit: 30 });
      if (filtroEstado) params.set("estado", filtroEstado);
      const res = await axios.get(`/ordenes-reposicion?${params}`);
      setOrdenes(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);
    } catch {
      toast.error("Error al cargar órdenes");
    } finally {
      setCargando(false);
    }
  }, [page, filtroEstado]);

  useEffect(() => {
    if (rol !== "admin") { toast.error("Acceso denegado"); navigate("/dashboard"); return; }
    axios.get("/sucursales").then((r) => setSucursales(r.data || [])).catch(() => {});
    cargar();
  }, [cargar]); // eslint-disable-line

  if (rol !== "admin") return null;

  const cancelar = async (id) => {
    if (!(await showConfirm("Cancelar orden", "¿Estás seguro de que querés cancelar esta orden?"))) return;
    setCancelandoId(id);
    try {
      await axios.delete(`/ordenes-reposicion/${id}`);
      toast.success("Orden cancelada");
      cargar();
    } catch (e) {
      toast.error(e.response?.data?.error || "Error al cancelar");
    } finally {
      setCancelandoId(null);
    }
  };

  if (vista === "nueva") {
    return <FormNuevaOrden sucursales={sucursales} onGuardada={(id) => { setDetalleId(id); setVista("detalle"); }} onCancelar={() => setVista("lista")} />;
  }

  if (vista === "detalle" && detalleId) {
    return <DetalleOrden ordenId={detalleId} onVolver={() => { setVista("lista"); cargar(); }} onConfirmada={() => { setVista("lista"); cargar(); }} />;
  }

  return (
    <div className="container py-4" style={{ maxWidth: 900 }}>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h4 className="fw-bold mb-1" style={{ color: "#fff" }}>Órdenes de reposición</h4>
          <p className="mb-0 small" style={{ color: "#64748b" }}>Ingreso de stock a sucursales</p>
        </div>
        <button className="btn btn-primary" onClick={() => setVista("nueva")}>+ Nueva orden</button>
      </div>

      {/* Filtros estado */}
      <div className="d-flex gap-2 mb-3 flex-wrap">
        {["", "pendiente", "confirmada", "cancelada"].map((e) => (
          <button
            key={e}
            className={`btn btn-sm ${filtroEstado === e ? "btn-light" : "btn-outline-secondary"}`}
            style={{ borderRadius: 20, fontWeight: 600 }}
            onClick={() => { setFiltroEstado(e); setPage(1); }}
          >
            {e === "" ? "Todos" : e.charAt(0).toUpperCase() + e.slice(1)}
          </button>
        ))}
      </div>

      {cargando ? (
        <div className="text-center py-5" style={{ color: "#94a3b8" }}>Cargando...</div>
      ) : ordenes.length === 0 ? (
        <div className="text-center py-5" style={{ color: "#64748b" }}>No hay órdenes registradas</div>
      ) : (
        <div className="card" style={cardStyle}>
          <div className="card-body p-0">
            <table className="table table-dark table-hover mb-0" style={{ borderRadius: 14, overflow: "hidden" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  <th style={{ padding: "12px 16px", color: "#64748b", fontWeight: 600, fontSize: "0.78rem", textTransform: "uppercase" }}>#</th>
                  <th style={{ padding: "12px 16px", color: "#64748b", fontWeight: 600, fontSize: "0.78rem", textTransform: "uppercase" }}>Sucursal</th>
                  <th style={{ padding: "12px 16px", color: "#64748b", fontWeight: 600, fontSize: "0.78rem", textTransform: "uppercase", textAlign: "center" }}>Productos</th>
                  <th style={{ padding: "12px 16px", color: "#64748b", fontWeight: 600, fontSize: "0.78rem", textTransform: "uppercase" }}>Fecha</th>
                  <th style={{ padding: "12px 16px", color: "#64748b", fontWeight: 600, fontSize: "0.78rem", textTransform: "uppercase", textAlign: "center" }}>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {ordenes.map((o) => (
                  <tr key={o.id}>
                    <td style={{ padding: "12px 16px", color: "#64748b", fontWeight: 600 }}>#{o.id}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ color: "#fff", fontWeight: 600 }}>{o.sucursal}</span>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <span style={{
                        background: "rgba(96,165,250,0.15)", color: "#60a5fa",
                        borderRadius: 20, padding: "3px 10px", fontSize: "0.8rem", fontWeight: 600,
                      }}>
                        {o.total_items} ítem{o.total_items !== 1 ? "s" : ""} · {o.total_unidades} u.
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                      <div style={{ color: "#fff", fontSize: "0.88rem" }}>{formatFecha(o.fecha_creacion)}</div>
                      {o.fecha_confirmacion && (
                        <div style={{ color: "#94a3b8", fontSize: "0.75rem" }}>Confirmada: {formatFecha(o.fecha_confirmacion)}</div>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <span className={`badge ${BADGE[o.estado] || "bg-secondary"}`} style={{ fontSize: "0.78rem", padding: "4px 10px" }}>{o.estado}</span>
                    </td>
                    <td>
                      <div className="d-flex gap-1 justify-content-end pe-2">
                        <button className="btn btn-sm btn-outline-light" style={{ fontSize: "0.8rem" }} onClick={() => { setDetalleId(o.id); setVista("detalle"); }}>
                          Ver detalle
                        </button>
                        {o.estado === "pendiente" && (
                          <button
                            className="btn btn-sm btn-outline-danger"
                            style={{ fontSize: "0.8rem" }}
                            disabled={cancelandoId === o.id}
                            onClick={() => cancelar(o.id)}
                          >
                            {cancelandoId === o.id ? "…" : "Cancelar"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="d-flex justify-content-center gap-2 mt-3">
          <button className="btn btn-sm btn-outline-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹ Anterior</button>
          <span className="align-self-center small text-muted">{page} / {totalPages}</span>
          <button className="btn btn-sm btn-outline-secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente ›</button>
        </div>
      )}
      {confirmModal}
    </div>
  );
}
