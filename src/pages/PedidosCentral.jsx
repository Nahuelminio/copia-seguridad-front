import React, { useCallback, useEffect, useState } from "react";
import axios from "../utils/axiosInstance";
import { toast } from "react-toastify";

const card = {
  background: "#111827",
  border: "1px solid #1e293b",
  borderRadius: 12,
  padding: "20px 24px",
};

const fmt = (n) =>
  Number(n || 0).toLocaleString("es-AR", {
    style: "currency", currency: "ARS", maximumFractionDigits: 0,
  });

const ESTADO_COLORS = {
  pendiente:  { bg: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "rgba(245,158,11,0.4)" },
  confirmado: { bg: "rgba(16,185,129,0.12)", color: "#10b981", border: "rgba(16,185,129,0.35)" },
  cancelado:  { bg: "rgba(100,116,139,0.1)", color: "#64748b", border: "rgba(100,116,139,0.3)" },
};

function EstadoBadge({ estado }) {
  const c = ESTADO_COLORS[estado] || ESTADO_COLORS.cancelado;
  return (
    <span style={{
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      borderRadius: 6, padding: "3px 10px", fontSize: "0.75rem", fontWeight: 700,
      textTransform: "capitalize",
    }}>
      {estado}
    </span>
  );
}

function formatFecha(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function PedidosCentral() {
  const [filtro,       setFiltro]       = useState("pendiente");
  const [pedidos,      setPedidos]      = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [expandido,    setExpandido]    = useState(null);
  const [confirmando,  setConfirmando]  = useState(null);
  const [cancelando,   setCancelando]   = useState(null);
  const [detalle,      setDetalle]      = useState({});  // { [id]: items con stock }

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/pedidos-central", { params: { estado: filtro, limit: 50 } });
      setPedidos(res.data.data || []);
    } catch {
      toast.error("Error al cargar pedidos");
    } finally {
      setLoading(false);
    }
  }, [filtro]);

  useEffect(() => { cargar(); }, [cargar]);

  const toggleExpand = async (pedido) => {
    if (expandido === pedido.id) { setExpandido(null); return; }
    setExpandido(pedido.id);
    if (!detalle[pedido.id]) {
      try {
        const res = await axios.get(`/pedidos-central/${pedido.id}`);
        setDetalle((d) => ({ ...d, [pedido.id]: res.data.items }));
      } catch {
        toast.error("Error al cargar detalle");
      }
    }
  };

  const confirmar = async (id) => {
    if (!window.confirm("¿Confirmar este pedido? Se generarán las ventas y se descontará el stock.")) return;
    setConfirmando(id);
    try {
      await axios.post(`/pedidos-central/${id}/confirmar`);
      toast.success("✅ Pedido confirmado — stock actualizado");
      cargar();
      setExpandido(null);
    } catch (e) {
      toast.error(e.response?.data?.error || "Error al confirmar");
    } finally {
      setConfirmando(null);
    }
  };

  const cancelar = async (id) => {
    if (!window.confirm("¿Cancelar este pedido?")) return;
    setCancelando(id);
    try {
      await axios.patch(`/pedidos-central/${id}/cancelar`);
      toast.success("Pedido cancelado");
      cargar();
    } catch (e) {
      toast.error(e.response?.data?.error || "Error al cancelar");
    } finally {
      setCancelando(null);
    }
  };

  const pendientesCount = pedidos.filter((p) => p.estado === "pendiente").length;

  return (
    <div className="container-fluid mt-4 px-3 mb-5">
      {/* Header */}
      <div className="mb-4">
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <div>
            <h4 style={{ color: "#f1f5f9", fontWeight: 700, marginBottom: 4 }}>
              Pedidos Central
              {filtro === "pendiente" && pendientesCount > 0 && (
                <span style={{
                  marginLeft: 10, background: "#f59e0b", color: "#000",
                  fontSize: "0.72rem", fontWeight: 800,
                  borderRadius: 20, padding: "2px 9px", verticalAlign: "middle",
                }}>
                  {pendientesCount}
                </span>
              )}
            </h4>
            <p style={{ color: "#64748b", fontSize: "0.85rem", margin: 0 }}>
              Pedidos recibidos desde el catálogo online · Central (sucursal 7)
            </p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="d-flex gap-2 mb-4 flex-wrap">
        {["pendiente", "confirmado", "cancelado", "todos"].map((e) => (
          <button
            key={e}
            className={`btn btn-sm ${filtro === e ? "btn-light" : "btn-outline-secondary"}`}
            style={{ borderRadius: 20, fontWeight: 600, textTransform: "capitalize" }}
            onClick={() => setFiltro(e)}
          >
            {e}
          </button>
        ))}
        <button
          className="btn btn-sm btn-outline-secondary ms-auto"
          onClick={cargar}
          disabled={loading}
        >
          {loading ? "↻" : "↺"} Actualizar
        </button>
      </div>

      {/* Lista */}
      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border spinner-border-sm text-secondary" role="status" />
        </div>
      )}

      {!loading && pedidos.length === 0 && (
        <div style={card}>
          <p style={{ color: "#475569", margin: 0 }}>
            No hay pedidos {filtro !== "todos" ? filtro + "s" : ""}.
          </p>
        </div>
      )}

      <div className="d-flex flex-column gap-3">
        {pedidos.map((pedido) => {
          const abierto   = expandido === pedido.id;
          const items     = abierto && detalle[pedido.id] ? detalle[pedido.id] : pedido.items || [];
          const totalUds  = items.reduce((s, i) => s + (i.qty || 0), 0);

          return (
            <div
              key={pedido.id}
              style={{
                ...card,
                borderColor: pedido.estado === "pendiente" ? "rgba(245,158,11,0.3)" : "#1e293b",
                padding: 0, overflow: "hidden",
              }}
            >
              {/* Header del pedido */}
              <div
                style={{
                  padding: "16px 20px", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: 12, flexWrap: "wrap",
                }}
                onClick={() => toggleExpand(pedido)}
              >
                <div className="d-flex align-items-center gap-3 flex-wrap">
                  <span style={{ color: "#64748b", fontWeight: 700, fontSize: "0.85rem" }}>
                    #{pedido.id}
                  </span>
                  <EstadoBadge estado={pedido.estado} />
                  {pedido.nombre_cliente && (
                    <span style={{ color: "#e2e8f0", fontSize: "0.82rem", fontWeight: 600 }}>
                      👤 {pedido.nombre_cliente}
                    </span>
                  )}
                  {pedido.telefono_cliente && (
                    <a
                      href={`https://wa.me/${String(pedido.telefono_cliente).replace(/[^\d]/g, "")}`}
                      target="_blank" rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{ color: "#25d366", fontSize: "0.8rem", textDecoration: "none" }}
                    >
                      💬 {pedido.telefono_cliente}
                    </a>
                  )}
                  <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                    {formatFecha(pedido.fecha_creacion)}
                  </span>
                </div>

                <div className="d-flex align-items-center gap-3 flex-wrap">
                  <span style={{ color: "#94a3b8", fontSize: "0.82rem" }}>
                    {totalUds} unidad{totalUds !== 1 ? "es" : ""}
                  </span>
                  {pedido.total > 0 && (
                    <span style={{ color: "#10b981", fontWeight: 700, fontSize: "0.9rem" }}>
                      {fmt(pedido.total)}
                    </span>
                  )}
                  <span style={{ color: "#475569", fontSize: "0.8rem" }}>
                    {abierto ? "▲" : "▼"}
                  </span>
                </div>
              </div>

              {/* Detalle expandido */}
              {abierto && (
                <div style={{ borderTop: "1px solid #1e293b" }}>
                  {/* Items */}
                  <div style={{ padding: "0 20px" }}>
                    <table className="table table-dark mb-0" style={{ fontSize: "0.85rem" }}>
                      <thead>
                        <tr style={{ borderColor: "#1e293b", color: "#64748b", fontSize: "0.72rem", textTransform: "uppercase" }}>
                          <th style={{ padding: "10px 0", fontWeight: 700 }}>Producto / Gusto</th>
                          <th style={{ padding: "10px 0", textAlign: "center" }}>Cant.</th>
                          <th style={{ padding: "10px 0", textAlign: "right" }}>Precio u.</th>
                          <th style={{ padding: "10px 0", textAlign: "right" }}>Subtotal</th>
                          {detalle[pedido.id] && (
                            <th style={{ padding: "10px 0", textAlign: "center" }}>Stock actual</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, i) => {
                          const sinStock = detalle[pedido.id] && (item.stock_actual ?? 0) < item.qty;
                          return (
                            <tr key={i} style={{ borderColor: "#1e293b" }}>
                              <td style={{ padding: "8px 0", color: "#f1f5f9" }}>
                                <div style={{ fontWeight: 600 }}>{item.modelo}</div>
                                <div style={{ color: "#64748b", fontSize: "0.78rem" }}>{item.gusto}</div>
                              </td>
                              <td style={{ padding: "8px 0", textAlign: "center", color: "#e2e8f0" }}>
                                {item.qty}
                              </td>
                              <td style={{ padding: "8px 0", textAlign: "right", color: "#94a3b8" }}>
                                {item.precio > 0 ? fmt(item.precio) : "—"}
                              </td>
                              <td style={{ padding: "8px 0", textAlign: "right", color: "#e2e8f0", fontWeight: 600 }}>
                                {item.precio > 0 ? fmt(item.precio * item.qty) : "—"}
                              </td>
                              {detalle[pedido.id] && (
                                <td style={{ padding: "8px 0", textAlign: "center" }}>
                                  <span style={{ color: sinStock ? "#f87171" : "#94a3b8", fontWeight: sinStock ? 700 : 400 }}>
                                    {item.stock_actual ?? "—"}
                                    {sinStock && " ⚠"}
                                  </span>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                      {pedido.total > 0 && (
                        <tfoot>
                          <tr style={{ borderTop: "2px solid #1e293b" }}>
                            <td colSpan={3} style={{ padding: "8px 0", color: "#64748b", fontWeight: 700, fontSize: "0.8rem" }}>
                              Total
                            </td>
                            <td style={{ padding: "8px 0", textAlign: "right", color: "#10b981", fontWeight: 700 }}>
                              {fmt(pedido.total)}
                            </td>
                            {detalle[pedido.id] && <td />}
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>

                  {/* Pago y envío */}
                  {(pedido.metodo_pago || pedido.direccion) && (
                    <div style={{ padding: "12px 20px 0", display: "flex", flexDirection: "column", gap: 4 }}>
                      {pedido.metodo_pago && (
                        <span style={{ fontSize: "0.82rem" }}>
                          <span style={{ color: "#64748b" }}>💳 Pago: </span>
                          <span style={{
                            color: pedido.metodo_pago === "transferencia" ? "#38bdf8" : "#10b981",
                            fontWeight: 700, textTransform: "capitalize",
                          }}>
                            {pedido.metodo_pago}
                          </span>
                        </span>
                      )}
                      {pedido.direccion && (
                        <span style={{ fontSize: "0.82rem", color: "#e2e8f0" }}>
                          <span style={{ color: "#f59e0b", fontWeight: 700 }}>🚚 Envío → </span>
                          {pedido.direccion}
                          {pedido.referencia && (
                            <span style={{ color: "#64748b" }}> · {pedido.referencia}</span>
                          )}
                        </span>
                      )}
                      {pedido.ubicacion_url && (
                        <a
                          href={pedido.ubicacion_url}
                          target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: "0.82rem", color: "#38bdf8", textDecoration: "none", width: "fit-content" }}
                        >
                          📍 Ver ubicación en el mapa
                        </a>
                      )}
                    </div>
                  )}

                  {/* Notas */}
                  {pedido.notas && (
                    <p style={{ padding: "8px 20px 0", color: "#475569", fontSize: "0.82rem", margin: 0 }}>
                      📝 {pedido.notas}
                    </p>
                  )}

                  {/* Acciones */}
                  {pedido.estado === "pendiente" && (
                    <div style={{ padding: "14px 20px", display: "flex", gap: 10 }}>
                      <button
                        className="btn btn-success btn-sm"
                        disabled={confirmando === pedido.id}
                        onClick={() => confirmar(pedido.id)}
                        style={{ fontWeight: 700, borderRadius: 8 }}
                      >
                        {confirmando === pedido.id ? "Confirmando…" : "✓ Confirmar pedido"}
                      </button>
                      <button
                        className="btn btn-outline-danger btn-sm"
                        disabled={cancelando === pedido.id}
                        onClick={() => cancelar(pedido.id)}
                        style={{ borderRadius: 8 }}
                      >
                        {cancelando === pedido.id ? "…" : "Cancelar"}
                      </button>
                    </div>
                  )}

                  {pedido.estado === "confirmado" && (
                    <div style={{ padding: "10px 20px 14px" }}>
                      <p style={{ color: "#10b981", fontSize: "0.82rem", margin: 0 }}>
                        ✅ Confirmado el {formatFecha(pedido.fecha_confirmacion)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
