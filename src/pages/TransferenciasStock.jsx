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
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

const BADGE = {
  pendiente:  "bg-warning text-dark",
  confirmada: "bg-success",
  cancelada:  "bg-secondary",
};

const cardStyle = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10,
  color: "#fff",
};

const inputDark = {
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.2)",
  color: "#fff",
};

// Los <select> necesitan fondo sólido para que las <option> sean legibles en todos los browsers
const selectDark = {
  background: "#1e2530",
  border: "1px solid rgba(255,255,255,0.2)",
  color: "#fff",
};

const optionDark = { background: "#1e2530", color: "#fff" };

// ─── Mensaje WhatsApp pre-armado ──────────────────────────────────────────────
function enviarWhatsApp({ telefono, sucursal_origen, sucursal_destino, items, notas, fecha }) {
  const lista = items || [];
  const total = lista.reduce((a, it) => a + Number(it.cantidad), 0);

  // Agrupar por producto para mensaje más compacto
  const grupos = {};
  for (const it of lista) {
    if (!grupos[it.producto_nombre]) grupos[it.producto_nombre] = [];
    grupos[it.producto_nombre].push(it);
  }

  const lineasProductos = Object.entries(grupos).map(([prod, gustos]) => {
    const subtotal = gustos.reduce((a, it) => a + Number(it.cantidad), 0);
    const detalle = gustos.map((it) => `  – ${it.gusto}: ${it.cantidad}`).join("\n");
    return `*${prod}* (${subtotal} u.)\n${detalle}`;
  }).join("\n\n");

  const msg = [
    `🚚 *Transferencia de stock – North*`,
    `📅 ${fecha}`,
    ``,
    `*${sucursal_origen} → ${sucursal_destino}*`,
    ``,
    lineasProductos,
    ``,
    `📦 *Total: ${total} unidades*`,
    notas ? `📝 Notas: ${notas}` : null,
    ``,
    `Confirmá recepción respondiendo este mensaje ✓`,
  ].filter((l) => l !== null).join("\n");

  const tel = (telefono || "").replace(/[^\d+]/g, "");
  const url = `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
}

// ─── Generador de remito (abre ventana nueva → print limpio) ──────────────────
function imprimirRemito({ sucursal_origen, sucursal_destino, items, notas, fecha }) {
  const lista = items || [];
  const totalUnidades = lista.reduce((a, it) => a + Number(it.cantidad), 0);

  // Agrupar por producto — elimina repetición de nombres y el wrapping feo
  const grupos = {};
  for (const it of lista) {
    if (!grupos[it.producto_nombre]) grupos[it.producto_nombre] = [];
    grupos[it.producto_nombre].push(it);
  }

  const filas = Object.entries(grupos).map(([producto, gustos], gi) => {
    const subtotal = gustos.reduce((a, it) => a + Number(it.cantidad), 0);
    const gustoFilas = gustos.map((it, i) => `
      <tr class="gusto-row">
        <td class="gusto-cell">${it.gusto}</td>
        <td class="qty-cell">${it.cantidad}</td>
      </tr>`).join("");

    return `
      <tr class="prod-header${gi > 0 ? " not-first" : ""}">
        <td class="prod-name" colspan="2">
          <span class="prod-text">${producto}</span>
          <span class="prod-subtotal">${subtotal} u.</span>
        </td>
      </tr>
      ${gustoFilas}`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <title>Remito — North</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; color: #111; padding: 36px 40px; max-width: 640px; margin: 0 auto; font-size: 13px; }

    /* Encabezado */
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; }
    .brand { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
    .subtitle { color: #6b7280; font-size: 11px; margin-top: 3px; }
    .date-block { text-align: right; }
    .date-label { font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; }
    .date-val { font-size: 13px; font-weight: 600; color: #374151; margin-top: 2px; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 14px 0; }

    /* Ruta origen → destino */
    .route { display: flex; align-items: stretch; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 22px; }
    .route-block { flex: 1; padding: 12px 16px; }
    .route-block.right { text-align: right; border-left: 1px solid #e5e7eb; }
    .route-label { font-size: 9.5px; color: #9ca3af; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 4px; }
    .route-name { font-weight: 800; font-size: 15px; color: #111; }
    .route-arrow { display: flex; align-items: center; justify-content: center; padding: 0 14px; color: #2563eb; font-size: 20px; background: #f9fafb; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; }

    /* Tabla */
    table { width: 100%; border-collapse: collapse; }
    .table-header tr { background: #f3f4f6; }
    .table-header th { padding: 7px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; }
    .table-header th.right { text-align: right; width: 60px; }

    /* Fila de producto (cabecera de grupo) */
    .prod-header td { padding: 10px 10px 4px; border-top: 1px solid #d1d5db; background: #f9fafb; }
    .prod-header.not-first td { border-top: 1px solid #d1d5db; }
    .prod-name { display: flex; justify-content: space-between; align-items: center; }
    .prod-text { font-weight: 700; font-size: 13px; color: #111; }
    .prod-subtotal { font-size: 11px; color: #6b7280; font-weight: 600; background: #e5e7eb; border-radius: 20px; padding: 1px 8px; }

    /* Fila de gusto */
    .gusto-row td { padding: 5px 10px 5px 22px; border-bottom: 1px solid #f3f4f6; }
    .gusto-cell { color: #374151; font-size: 12.5px; }
    .qty-cell { text-align: right; font-weight: 700; font-size: 13px; width: 60px; color: #111; }

    /* Total — fuera del tfoot para evitar duplicado en saltos de página */
    .total-box { display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #111; margin-top: 4px; padding: 10px 10px; font-weight: 700; font-size: 14px; }
    .total-num { font-size: 22px; font-weight: 800; }

    /* Notas */
    .notas { background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 9px 13px; font-size: 12px; color: #92400e; margin-top: 16px; }

    /* Firmas */
    .firmas { display: flex; gap: 32px; margin-top: 36px; }
    .firma-bloque { flex: 1; text-align: center; }
    .firma-linea { border-top: 1px solid #9ca3af; padding-top: 6px; font-size: 11px; color: #6b7280; margin-top: 28px; }

    /* Pie */
    .footer { border-top: 1px solid #e5e7eb; margin-top: 24px; padding-top: 10px; font-size: 10px; color: #9ca3af; text-align: center; }

    @media print {
      body { padding: 20px 28px; }
      .prod-header td { background: #f3f4f6 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .table-header tr { background: #f3f4f6 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">NORTH</div>
      <div class="subtitle">Remito de transferencia de stock</div>
    </div>
    <div class="date-block">
      <div class="date-label">Fecha</div>
      <div class="date-val">${fecha}</div>
    </div>
  </div>
  <hr/>

  <div class="route">
    <div class="route-block">
      <div class="route-label">Origen</div>
      <div class="route-name">${sucursal_origen}</div>
    </div>
    <div class="route-arrow">→</div>
    <div class="route-block right">
      <div class="route-label">Destino</div>
      <div class="route-name">${sucursal_destino}</div>
    </div>
  </div>

  <table>
    <thead class="table-header">
      <tr>
        <th>Producto / Gusto</th>
        <th class="right">Cant.</th>
      </tr>
    </thead>
    <tbody>${filas}</tbody>
  </table>

  <!-- Total FUERA del tfoot → no se duplica en saltos de página -->
  <div class="total-box">
    <span>Total unidades</span>
    <span class="total-num">${totalUnidades}</span>
  </div>

  ${notas ? `<div class="notas"><strong>Notas:</strong> ${notas}</div>` : ""}

  <div class="firmas">
    <div class="firma-bloque"><div class="firma-linea">Entregado por</div></div>
    <div class="firma-bloque"><div class="firma-linea">Recibido por</div></div>
  </div>

  <div class="footer">North — Documento interno · No válido como comprobante fiscal</div>
  <script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=720,height=960");
  if (!win) { alert("Habilitá los pop-ups para generar el PDF"); return; }
  win.document.write(html);
  win.document.close();
}

// ─── Hook: modal de confirmación personalizado ────────────────────────────────

function useConfirm() {
  const [state, setState] = useState({ show: false, title: "", message: "", resolve: null, loading: false });

  const showConfirm = (title, message) =>
    new Promise((resolve) => setState({ show: true, title, message, resolve, loading: false }));

  const handleOk = () => {
    setState((s) => ({ ...s, show: false }));
    state.resolve(true);
  };

  const handleCancel = () => {
    setState((s) => ({ ...s, show: false }));
    state.resolve(false);
  };

  const confirmModal = state.show ? (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)",
        zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={handleCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1e2530", border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 14, padding: "28px 32px", maxWidth: 420, width: "90%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <h6 style={{ color: "#fff", fontWeight: 700, marginBottom: 10 }}>{state.title}</h6>
        <p style={{ color: "#94a3b8", marginBottom: 24, lineHeight: 1.6, whiteSpace: "pre-line" }}>{state.message}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={handleCancel}
            style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.18)", background: "transparent", color: "#cbd5e1", cursor: "pointer", fontWeight: 500 }}
          >
            Cancelar
          </button>
          <button
            onClick={handleOk}
            style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#3b82f6", color: "#fff", cursor: "pointer", fontWeight: 600 }}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { showConfirm, confirmModal };
}

// ─── Sub‑componente: Detalle de transferencia ─────────────────────────────────

function DetalleTransferencia({ transferId, onVolver, onConfirmada }) {
  const [t, setT] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [confirmando, setConfirmando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const { showConfirm, confirmModal } = useConfirm();

  useEffect(() => {
    axios.get(`/transferencias/${transferId}`)
      .then((r) => setT(r.data))
      .catch(() => toast.error("Error al cargar la transferencia"))
      .finally(() => setCargando(false));
  }, [transferId]);

  const handleConfirmar = async () => {
    const ok = await showConfirm(
      "Confirmar transferencia",
      `Origen: ${t.sucursal_origen}\nDestino: ${t.sucursal_destino}\nProductos: ${t.items?.length} ítem(s)\n\nEl stock se descontará de "${t.sucursal_origen}" y se sumará en "${t.sucursal_destino}". Esta acción no se puede deshacer.`
    );
    if (!ok) return;
    setConfirmando(true);
    try {
      await axios.post(`/transferencias/${transferId}/confirmar`);
      toast.success("Transferencia confirmada — stock movido");
      onConfirmada();
    } catch (e) {
      toast.error(e.response?.data?.error || "Error al confirmar");
    } finally {
      setConfirmando(false);
    }
  };

  const handleCancelar = async () => {
    if (!(await showConfirm("Cancelar transferencia", "¿Estás seguro de que querés cancelar esta transferencia? No se puede deshacer."))) return;
    setCancelando(true);
    try {
      await axios.delete(`/transferencias/${transferId}`);
      toast.success("Transferencia cancelada");
      onVolver();
    } catch (e) {
      toast.error(e.response?.data?.error || "Error al cancelar");
    } finally {
      setCancelando(false);
    }
  };

  if (cargando) return <p className="text-center text-muted mt-5">Cargando…</p>;
  if (!t) return null;

  return (
    <div className="container py-4" style={{ maxWidth: 760 }}>
      {/* Acciones */}
      <div className="d-flex gap-2 mb-4 flex-wrap align-items-center">
        <button className="btn btn-outline-secondary btn-sm" onClick={onVolver}>
          ← Volver
        </button>
        <span className={`badge ${BADGE[t.estado] || "bg-secondary"} ms-1`}>{t.estado}</span>
        {t.estado === "pendiente" && (
          <>
            <button
              className="btn btn-success btn-sm"
              disabled={confirmando}
              onClick={handleConfirmar}
            >
              {confirmando ? "Confirmando…" : "Confirmar transferencia"}
            </button>
            <button
              className="btn btn-outline-danger btn-sm"
              disabled={cancelando}
              onClick={handleCancelar}
            >
              {cancelando ? "…" : "Cancelar"}
            </button>
          </>
        )}
        {/* Remito y WhatsApp — disponibles para cualquier estado */}
        <div className="d-flex gap-2 ms-auto">
          <button
            className="btn btn-outline-light btn-sm"
            onClick={() =>
              imprimirRemito({
                sucursal_origen:  t.sucursal_origen,
                sucursal_destino: t.sucursal_destino,
                items: t.items || [],
                notas: t.notas || "",
                fecha: formatFecha(t.fecha_confirmacion || t.fecha_creacion),
              })
            }
          >
            Generar remito
          </button>
          {t.telefono_destino && (
            <button
              className="btn btn-sm fw-semibold"
              style={{ background: "#25d366", color: "#fff", border: "none", borderRadius: 8 }}
              onClick={() =>
                enviarWhatsApp({
                  telefono:         t.telefono_destino,
                  sucursal_origen:  t.sucursal_origen,
                  sucursal_destino: t.sucursal_destino,
                  items: t.items || [],
                  notas: t.notas || "",
                  fecha: formatFecha(t.fecha_confirmacion || t.fecha_creacion),
                })
              }
            >
              Enviar por WhatsApp
            </button>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="card mb-3" style={cardStyle}>
        <div className="card-body">
          <h5 className="fw-bold mb-3" style={{ color: "#fff" }}>Transferencia #{t.id}</h5>
          <div className="row g-3">
            <div className="col-sm-4">
              <div className="small mb-1" style={{ color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.7rem", fontWeight: 600 }}>Origen</div>
              <div className="fw-semibold" style={{ color: "#fff" }}>{t.sucursal_origen}</div>
            </div>
            <div className="col-sm-1 d-flex align-items-center justify-content-center">
              <span style={{ color: "#60a5fa", fontSize: "1.3rem" }}>→</span>
            </div>
            <div className="col-sm-4">
              <div className="small mb-1" style={{ color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.7rem", fontWeight: 600 }}>Destino</div>
              <div className="fw-semibold" style={{ color: "#fff" }}>{t.sucursal_destino}</div>
            </div>
            <div className="col-sm-3">
              <div className="small mb-1" style={{ color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.7rem", fontWeight: 600 }}>Fecha</div>
              <div style={{ color: "#e2e8f0" }}>{formatFecha(t.fecha_creacion)}</div>
              {t.fecha_confirmacion && (
                <div className="small" style={{ color: "#94a3b8", marginTop: 2 }}>
                  Confirmada: {formatFecha(t.fecha_confirmacion)}
                </div>
              )}
            </div>
          </div>
          {t.notas && (
            <div className="mt-3 small" style={{ color: "#94a3b8" }}>
              <strong style={{ color: "#cbd5e1" }}>Notas:</strong> {t.notas}
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="card" style={cardStyle}>
        <div className="card-body p-0">
          <table className="table table-dark table-hover mb-0">
            <thead>
              <tr>
                <th>Producto</th>
                <th className="text-center" style={{ width: 100 }}>Cantidad</th>
                {t.estado === "pendiente" && (
                  <th className="text-center" style={{ width: 130 }}>Stock en origen</th>
                )}
              </tr>
            </thead>
            <tbody>
              {(t.items || []).map((it) => {
                const stockBajo = t.estado === "pendiente" && it.stock_origen < it.cantidad;
                return (
                  <tr key={it.id}>
                    <td>
                      <div className="fw-semibold small">{it.producto_nombre}</div>
                      <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>{it.gusto}</div>
                    </td>
                    <td className="text-center fw-bold">{it.cantidad}</td>
                    {t.estado === "pendiente" && (
                      <td className="text-center small" style={{ color: stockBajo ? "#f87171" : "#4ade80" }}>
                        {it.stock_origen} u.
                        {stockBajo && <div style={{ fontSize: "0.7rem" }}>⚠ insuficiente</div>}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {confirmModal}
    </div>
  );
}

// ─── Sub‑componente: Formulario nueva transferencia ───────────────────────────

function FormNuevaTransferencia({ sucursales, onGuardada, onCancelar }) {
  const [origenId, setOrigenId] = useState("");
  const [destinoId, setDestinoId] = useState("");
  const [notas, setNotas] = useState("");
  const [items, setItems] = useState([]);
  const [productos, setProductos] = useState([]);
  const [queryProducto, setQueryProducto] = useState("");
  const [mostrarDrop, setMostrarDrop] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const { showConfirm, confirmModal } = useConfirm();

  const productoInputRef = useRef(null);

  // Cargar stock del origen cuando cambia
  useEffect(() => {
    if (!origenId) { setProductos([]); setItems([]); return; }
    axios.get(`/disponibles?sucursal_id=${origenId}`)
      .then((r) => setProductos(r.data || []))
      .catch(() => toast.error("Error al cargar productos"));
    setItems([]);
  }, [origenId]);

  // ESC para cerrar dropdown
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") setMostrarDrop(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const productosFiltrados = useMemo(() => {
    const q = normalizar(queryProducto);
    const base = q
      ? productos.filter(
          (p) =>
            normalizar(p.producto_nombre).includes(q) ||
            normalizar(p.gusto).includes(q) ||
            (p.codigo_barra && p.codigo_barra.includes(q))
        )
      : [...productos];
    // Con stock primero, luego por nombre
    return base
      .sort((a, b) => {
        if ((b.stock > 0) !== (a.stock > 0)) return b.stock > 0 ? 1 : -1;
        return normalizar(a.producto_nombre).localeCompare(normalizar(b.producto_nombre));
      })
      .slice(0, 30);
  }, [queryProducto, productos]);

  const seleccionarProducto = (p) => {
    if (items.find((it) => it.gusto_id === p.gusto_id)) {
      toast.info(`${p.producto_nombre} — ${p.gusto} ya está en la lista`);
    } else {
      setItems((prev) => [
        ...prev,
        { gusto_id: p.gusto_id, producto_nombre: p.producto_nombre, gusto: p.gusto, cantidad: 1, stock_disponible: p.stock },
      ]);
    }
    setQueryProducto("");
    setMostrarDrop(false);
    productoInputRef.current?.focus();
  };

  const actualizarCantidad = (gusto_id, val) =>
    setItems((prev) =>
      prev.map((it) =>
        it.gusto_id === gusto_id
          ? { ...it, cantidad: Math.max(1, Math.min(parseInt(val) || 1, it.stock_disponible || 9999)) }
          : it
      )
    );

  const eliminarItem = (gusto_id) =>
    setItems((prev) => prev.filter((it) => it.gusto_id !== gusto_id));

  const puedeGuardar =
    origenId &&
    destinoId &&
    parseInt(origenId) !== parseInt(destinoId) &&
    items.length > 0 &&
    items.every((it) => it.cantidad > 0);

  const hayStockInsuficiente = items.some(
    (it) => it.stock_disponible !== undefined && it.stock_disponible < it.cantidad
  );

  const guardar = async () => {
    if (!puedeGuardar) return;
    if (hayStockInsuficiente) {
      const ok = await showConfirm(
        "Stock insuficiente",
        "Hay ítems con stock insuficiente en el origen.\n¿Guardar de todas formas como borrador?"
      );
      if (!ok) return;
    }
    setGuardando(true);
    try {
      const res = await axios.post("/transferencias", {
        sucursal_origen_id: parseInt(origenId),
        sucursal_destino_id: parseInt(destinoId),
        notas: notas.trim() || undefined,
        items: items.map((it) => ({ gusto_id: it.gusto_id, cantidad: it.cantidad })),
      });
      toast.success("Transferencia creada como pendiente");
      onGuardada(res.data.id);
    } catch (e) {
      toast.error(e.response?.data?.error || "Error al guardar");
    } finally {
      setGuardando(false);
    }
  };

  const sucursalesDestino = sucursales.filter((s) => String(s.id) !== String(origenId));

  return (
    <div className="container py-4" style={{ maxWidth: 760 }}>
      <div className="d-flex align-items-center gap-3 mb-4">
        <button className="btn btn-outline-secondary btn-sm" onClick={onCancelar}>
          ← Volver
        </button>
        <h4 className="mb-0 fw-bold" style={{ color: "#fff" }}>Nueva transferencia de stock</h4>
      </div>

      {/* Origen / Destino */}
      <div className="card mb-3" style={cardStyle}>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-sm-5">
              <label className="form-label fw-semibold">Sucursal origen</label>
              <select
                className="form-select"
                style={selectDark}
                value={origenId}
                onChange={(e) => { setOrigenId(e.target.value); setDestinoId(""); }}
              >
                <option value="" style={optionDark}>— Seleccionar —</option>
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id} style={optionDark}>{s.nombre}</option>
                ))}
              </select>
            </div>
            <div className="col-sm-1 d-flex align-items-end justify-content-center pb-2">
              <span style={{ color: "#60a5fa", fontSize: "1.4rem" }}>→</span>
            </div>
            <div className="col-sm-5">
              <label className="form-label fw-semibold">Sucursal destino</label>
              <select
                className="form-select"
                style={selectDark}
                value={destinoId}
                onChange={(e) => setDestinoId(e.target.value)}
                disabled={!origenId}
              >
                <option value="" style={optionDark}>— Seleccionar —</option>
                {sucursalesDestino.map((s) => (
                  <option key={s.id} value={s.id} style={optionDark}>{s.nombre}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Buscar productos (solo si hay origen seleccionado) */}
      {origenId && (
        <div className="card mb-3" style={cardStyle}>
          <div className="card-body">
            <label className="form-label fw-semibold">
              Agregar producto
              <span className="ms-2 small fw-normal" style={{ color: "#94a3b8" }}>
                (stock disponible en {sucursales.find((s) => String(s.id) === String(origenId))?.nombre})
              </span>
            </label>
            <div className="position-relative">
              <input
                ref={productoInputRef}
                className="form-control input-dark"
                style={inputDark}
                placeholder="Buscar por nombre, gusto o código de barras..."
                value={queryProducto}
                onChange={(e) => { setQueryProducto(e.target.value); setMostrarDrop(true); }}
                onFocus={() => setMostrarDrop(true)}
                onBlur={() => setTimeout(() => setMostrarDrop(false), 180)}
              />
              {mostrarDrop && productosFiltrados.length > 0 && (
                <ul
                  className="dropdown-menu show w-100"
                  style={{ zIndex: 999, maxHeight: 260, overflowY: "auto", background: "#1e2530", border: "1px solid rgba(255,255,255,0.15)" }}
                >
                  {productosFiltrados.map((p) => (
                    <li key={p.gusto_id}>
                      <button
                        className="dropdown-item d-flex justify-content-between align-items-center"
                        style={{ color: "#fff" }}
                        onMouseDown={() => seleccionarProducto(p)}
                      >
                        <span>
                          <span style={{ fontWeight: 600 }}>{p.producto_nombre}</span>
                          <span style={{ color: "#94a3b8", marginLeft: 6 }}>— {p.gusto}</span>
                        </span>
                        <span className={`badge ${p.stock > 0 ? "bg-success" : "bg-danger"} ms-2`}>
                          {p.stock} u.
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabla de ítems — diseño mejorado */}
      {items.length > 0 && (
        <div className="mb-3" style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>

          {/* Cabecera de la tabla */}
          <div style={{ background: "rgba(255,255,255,0.05)", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ color: "#94a3b8", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Productos a transferir
            </span>
            <span style={{ color: "#64748b", fontSize: "0.78rem" }}>
              {items.length} producto{items.length !== 1 ? "s" : ""} · {items.reduce((a, it) => a + it.cantidad, 0)} u. en total
            </span>
          </div>

          {items.map((it, idx) => {
            const stockBajo = it.stock_disponible !== undefined && it.stock_disponible < it.cantidad;
            return (
              <div
                key={it.gusto_id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
                  background: stockBajo ? "rgba(248,113,113,0.05)" : "transparent",
                  borderLeft: stockBajo ? "3px solid #f87171" : "3px solid transparent",
                }}
              >
                {/* Producto */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: "#fff", fontSize: "0.9rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {it.producto_nombre}
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: "0.78rem" }}>{it.gusto}</div>
                  {stockBajo && (
                    <div style={{ color: "#f87171", fontSize: "0.72rem", marginTop: 2 }}>⚠ Stock insuficiente</div>
                  )}
                </div>

                {/* Stock origen */}
                <div style={{ textAlign: "center", minWidth: 80 }}>
                  <div style={{ fontSize: "0.7rem", color: "#64748b", marginBottom: 2 }}>EN ORIGEN</div>
                  <span style={{
                    background: stockBajo ? "rgba(248,113,113,0.15)" : "rgba(74,222,128,0.12)",
                    color: stockBajo ? "#f87171" : "#4ade80",
                    borderRadius: 20,
                    padding: "2px 10px",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                  }}>
                    {it.stock_disponible !== undefined ? `${it.stock_disponible} u.` : "—"}
                  </span>
                </div>

                {/* Cantidad */}
                <div style={{ textAlign: "center", minWidth: 100 }}>
                  <div style={{ fontSize: "0.7rem", color: "#64748b", marginBottom: 4 }}>A MOVER</div>
                  <input
                    className="form-control form-control-sm text-center"
                    type="number"
                    min="1"
                    max={it.stock_disponible || undefined}
                    value={it.cantidad}
                    onChange={(e) => actualizarCantidad(it.gusto_id, e.target.value)}
                    style={{ ...inputDark, width: 72, margin: "0 auto", fontWeight: 700, fontSize: "1rem" }}
                  />
                </div>

                {/* Eliminar */}
                <button
                  style={{
                    background: "none",
                    border: "1px solid rgba(248,113,113,0.3)",
                    color: "#f87171",
                    borderRadius: 8,
                    width: 32,
                    height: 32,
                    cursor: "pointer",
                    fontSize: "1rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "background 0.15s",
                  }}
                  onClick={() => eliminarItem(it.gusto_id)}
                  title="Quitar producto"
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(248,113,113,0.15)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Notas */}
      <div className="card mb-3" style={cardStyle}>
        <div className="card-body">
          <label className="form-label fw-semibold">Notas (opcional)</label>
          <textarea
            className="form-control input-dark"
            style={inputDark}
            rows={2}
            placeholder="Observaciones de la transferencia..."
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
          />
        </div>
      </div>

      {/* Acciones */}
      <div className="d-flex gap-2 align-items-center flex-wrap">
        <button
          className="btn btn-primary"
          disabled={!puedeGuardar || guardando}
          onClick={guardar}
          title={!puedeGuardar ? "Completá origen, destino y al menos un producto" : ""}
        >
          {guardando ? "Guardando…" : "Crear transferencia"}
        </button>
        {items.length > 0 && (() => {
          const sucOrigen  = sucursales.find((s) => String(s.id) === String(origenId));
          const sucDestino = sucursales.find((s) => String(s.id) === String(destinoId));
          const fechaHoy   = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
          const datosRemito = {
            sucursal_origen:  sucOrigen?.nombre  || "—",
            sucursal_destino: sucDestino?.nombre || "—",
            items, notas, fecha: fechaHoy,
          };
          return (
            <>
              <button className="btn btn-outline-secondary" type="button" onClick={() => imprimirRemito(datosRemito)}>
                Generar remito
              </button>
              {sucDestino?.telefono && (
                <button
                  className="btn btn-sm fw-semibold"
                  type="button"
                  style={{ background: "#25d366", color: "#fff", border: "none", borderRadius: 8 }}
                  onClick={() => enviarWhatsApp({ telefono: sucDestino.telefono, ...datosRemito })}
                >
                  Enviar por WhatsApp
                </button>
              )}
            </>
          );
        })()}
        {hayStockInsuficiente && (
          <span style={{ color: "#f87171", fontSize: "0.82rem" }}>
            ⚠ Hay productos sin stock suficiente en el origen
          </span>
        )}
      </div>
      {confirmModal}
    </div>
  );
}

// ─── Componente principal: Lista ──────────────────────────────────────────────

export default function TransferenciasStock() {
  const navigate = useNavigate();

  // Rol (no es un hook — es solo lectura del token)
  const token = localStorage.getItem("token");
  const rol = token ? jwtDecode(token)?.rol : null;

  // Todos los hooks SIEMPRE se declaran antes de cualquier return condicional
  const [vista, setVista] = useState("lista");   // 'lista' | 'nueva' | 'detalle'
  const [detalleId, setDetalleId] = useState(null);
  const [transferencias, setTransferencias] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroOrigen, setFiltroOrigen] = useState("");
  const [filtroDestino, setFiltroDestino] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [cancelandoId, setCancelandoId] = useState(null);
  const { showConfirm, confirmModal } = useConfirm();

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params = new URLSearchParams({ page, limit: 30 });
      if (filtroEstado) params.set("estado", filtroEstado);
      const res = await axios.get(`/transferencias?${params}`);
      setTransferencias(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);
    } catch {
      toast.error("Error al cargar transferencias");
    } finally {
      setCargando(false);
    }
  }, [filtroEstado, page]);

  useEffect(() => {
    if (rol !== "admin") {
      toast.error("Acceso denegado");
      navigate("/dashboard");
      return;
    }
    axios.get("/sucursales").then((r) => setSucursales(r.data || [])).catch(() => {});
    cargar();
  }, [cargar]); // eslint-disable-line

  // Guard: retorno condicional DESPUÉS de todos los hooks
  if (rol !== "admin") return null;

  const cancelar = async (id) => {
    if (!(await showConfirm("Cancelar transferencia", "¿Estás seguro de que querés cancelar esta transferencia?"))) return;
    setCancelandoId(id);
    try {
      await axios.delete(`/transferencias/${id}`);
      toast.success("Transferencia cancelada");
      cargar();
    } catch (e) {
      toast.error(e.response?.data?.error || "Error al cancelar");
    } finally {
      setCancelandoId(null);
    }
  };

  // ── Vistas secundarias ──
  if (vista === "nueva") {
    return (
      <FormNuevaTransferencia
        sucursales={sucursales}
        onCancelar={() => setVista("lista")}
        onGuardada={(id) => { setDetalleId(id); setVista("detalle"); cargar(); }}
      />
    );
  }

  if (vista === "detalle" && detalleId) {
    return (
      <DetalleTransferencia
        transferId={detalleId}
        onVolver={() => { setVista("lista"); cargar(); }}
        onConfirmada={() => { setVista("lista"); cargar(); }}
      />
    );
  }

  // ── Lista principal ──
  return (
    <div className="container py-4" style={{ maxWidth: 960 }}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h4 className="mb-0 fw-bold" style={{ color: "#fff" }}>Transferencias de stock</h4>
          <p className="small mb-0" style={{ color: "#94a3b8" }}>Movimiento de productos entre sucursales</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setVista("nueva")}>
          + Nueva transferencia
        </button>
      </div>

      {/* Filtros */}
      <div className="d-flex gap-2 mb-3 flex-wrap align-items-center">
        {["", "pendiente", "confirmada", "cancelada"].map((e) => (
          <button
            key={e}
            className={`btn btn-sm ${filtroEstado === e ? "btn-primary" : "btn-outline-secondary"}`}
            onClick={() => { setFiltroEstado(e); setPage(1); }}
          >
            {e === "" ? "Todos" : e.charAt(0).toUpperCase() + e.slice(1)}
          </button>
        ))}
        <select
          className="form-select form-select-sm ms-2"
          style={{ ...selectDark, width: "auto", minWidth: 140 }}
          value={filtroOrigen}
          onChange={(e) => setFiltroOrigen(e.target.value)}
        >
          <option value="" style={optionDark}>Origen: todos</option>
          {sucursales.map((s) => <option key={s.id} value={s.nombre} style={optionDark}>{s.nombre}</option>)}
        </select>
        <select
          className="form-select form-select-sm"
          style={{ ...selectDark, width: "auto", minWidth: 140 }}
          value={filtroDestino}
          onChange={(e) => setFiltroDestino(e.target.value)}
        >
          <option value="" style={optionDark}>Destino: todos</option>
          {sucursales.map((s) => <option key={s.id} value={s.nombre} style={optionDark}>{s.nombre}</option>)}
        </select>
        {(filtroOrigen || filtroDestino) && (
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => { setFiltroOrigen(""); setFiltroDestino(""); }}
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Tabla */}
      {(() => {
        const filas = transferencias.filter((t) =>
          (!filtroOrigen  || t.sucursal_origen  === filtroOrigen) &&
          (!filtroDestino || t.sucursal_destino === filtroDestino)
        );
        return cargando ? (
          <p className="text-muted text-center mt-5">Cargando…</p>
        ) : filas.length === 0 ? (
          <div
            className="text-center py-5"
            style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8" }}
          >
            <div>No hay transferencias{filtroEstado ? ` con estado "${filtroEstado}"` : ""}</div>
          </div>
        ) : (
          <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
            <table className="table table-dark table-hover align-middle mb-0" style={{ background: "transparent" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Movimiento</th>
                  <th style={{ ...thStyle, textAlign: "center" }}>Productos</th>
                  <th style={thStyle}>Fecha creación</th>
                  <th style={{ ...thStyle, textAlign: "center" }}>Estado</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
              {filas.map((t) => (
                <tr key={t.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {/* ID */}
                  <td style={{ paddingLeft: 16, color: "#94a3b8", fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                    #{t.id}
                  </td>

                  {/* Origen → Destino */}
                  <td>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <span style={{ fontWeight: 600, color: "#fff" }}>{t.sucursal_origen}</span>
                      <span style={{ color: "#60a5fa", fontSize: "1.1rem", lineHeight: 1 }}>→</span>
                      <span style={{ fontWeight: 600, color: "#fff" }}>{t.sucursal_destino}</span>
                    </div>
                  </td>

                  {/* Cantidad de ítems y unidades */}
                  <td className="text-center">
                    <span style={{
                      background: "rgba(255,255,255,0.12)",
                      color: "#fff",
                      padding: "2px 12px",
                      borderRadius: 20,
                      fontSize: "0.82rem",
                      whiteSpace: "nowrap",
                    }}>
                      {t.total_items} ítem{t.total_items !== 1 ? "s" : ""}
                    </span>
                    {t.total_unidades > 0 && (
                      <div style={{ color: "#94a3b8", fontSize: "0.73rem", marginTop: 2 }}>
                        {t.total_unidades} u.
                      </div>
                    )}
                  </td>

                  {/* Fecha */}
                  <td style={{ whiteSpace: "nowrap" }}>
                    <div style={{ color: "#fff", fontSize: "0.88rem" }}>{formatFecha(t.fecha_creacion)}</div>
                    {t.fecha_confirmacion && (
                      <div style={{ color: "#94a3b8", fontSize: "0.75rem" }}>
                        Confirmada: {formatFecha(t.fecha_confirmacion)}
                      </div>
                    )}
                  </td>

                  {/* Estado */}
                  <td className="text-center">
                    <span className={`badge ${BADGE[t.estado] || "bg-secondary"}`} style={{ fontSize: "0.78rem", padding: "4px 10px" }}>
                      {t.estado}
                    </span>
                  </td>

                  {/* Acciones */}
                  <td>
                    <div className="d-flex gap-1 justify-content-end pe-2">
                      <button
                        className="btn btn-sm btn-outline-light"
                        style={{ fontSize: "0.8rem" }}
                        onClick={() => { setDetalleId(t.id); setVista("detalle"); }}
                      >
                        Ver detalle
                      </button>
                      {t.estado === "pendiente" && (
                        <button
                          className="btn btn-sm btn-outline-danger"
                          style={{ fontSize: "0.8rem" }}
                          disabled={cancelandoId === t.id}
                          onClick={() => cancelar(t.id)}
                        >
                          {cancelandoId === t.id ? "…" : "Cancelar"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>
        );
      })()}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-center gap-2 mt-3">
          <button
            className="btn btn-sm btn-outline-secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ‹ Anterior
          </button>
          <span className="align-self-center small text-muted">{page} / {totalPages}</span>
          <button
            className="btn btn-sm btn-outline-secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente ›
          </button>
        </div>
      )}
      {confirmModal}
    </div>
  );
}

const thStyle = {
  color: "#64748b",
  fontWeight: 600,
  fontSize: "0.75rem",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  paddingTop: 10,
  paddingBottom: 10,
  paddingLeft: 12,
  background: "transparent",
  border: "none",
};
