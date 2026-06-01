import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../utils/axiosInstance";
import { toast } from "react-toastify";

function useConfirm() {
  const [state, setState] = useState({ show: false, title: "", message: "", resolve: null });

  const showConfirm = (title, message) =>
    new Promise((resolve) => setState({ show: true, title, message, resolve }));

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
          borderRadius: 14, padding: "28px 32px", maxWidth: 440, width: "90%",
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
            style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#22c55e", color: "#fff", cursor: "pointer", fontWeight: 600 }}
          >
            Confirmar pedido
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { showConfirm, confirmModal };
}

function formatUsd(n) {
  return Number(n || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatFecha(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// pedido: { id?, cliente_nombre, cliente_telefono, sucursal_nombre,
//           tipo_cambio, notas, items, total_usd, total_ars, fecha_creacion, estado? }
// modoVer: true cuando se llama desde PedidosMayorista (solo lectura, sin confirmar)
export default function FacturaMayorista({ pedido, onVolver, modoVer = false, pedidoId }) {
  const navigate = useNavigate();
  const facturaRef = useRef(null);
  const { showConfirm, confirmModal } = useConfirm();

  // Preferir siempre el valor del servidor; recalcular sólo si no existe
  const totalArs =
    pedido.total_ars > 0
      ? pedido.total_ars
      : pedido.tipo_cambio > 0
        ? pedido.total_usd * parseFloat(pedido.tipo_cambio)
        : null;

  const handleImprimir = () => {
    window.print();
  };

  const handleConfirmar = async () => {
    if (!pedidoId && !pedido.id) return;
    const idUsado = pedidoId || pedido.id;

    // 4. Confirmación explícita antes de descontar stock
    const cantidadItems = (pedido.items || []).length;
    const confirmado = await showConfirm(
      "Confirmar pedido",
      `Cliente: ${pedido.cliente_nombre}\nProductos: ${cantidadItems} ítem${cantidadItems !== 1 ? "s" : ""}\nTotal: USD ${Number(pedido.total_usd || 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}\n\nEsta acción descontará el stock de Central y no se puede deshacer.`
    );
    if (!confirmado) return;

    try {
      await axios.post(`/mayorista/pedidos/${idUsado}/confirmar`);
      toast.success("Pedido confirmado — stock descontado");
      navigate("/mayorista");
    } catch (e) {
      toast.error(e.response?.data?.error || "Error al confirmar el pedido");
    }
  };

  return (
    <>
      {confirmModal}
      {/* ── Estilos de impresión ── */}
      <style>{`
        @page {
          size: A4;
          margin: 15mm;
        }
        @media print {
          * { visibility: hidden; }
          #factura-wrapper, #factura-wrapper * { visibility: visible; }
          #factura-wrapper {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
          }
          .no-print { display: none !important; }
          .factura-container, .factura-container * {
            background: #fff !important;
            color: #000 !important;
            border-color: #ccc !important;
            box-shadow: none !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .factura-table tr {
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div id="factura-wrapper" className="container py-4" style={{ maxWidth: 740 }}>

        {/* Acciones */}
        <div className="d-flex gap-2 mb-3 no-print flex-wrap">
          {onVolver && (
            <button className="btn btn-outline-secondary btn-sm" onClick={onVolver}>
              ← Editar
            </button>
          )}
          {!modoVer && onVolver === undefined && (
            <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate(-1)}>
              ← Volver
            </button>
          )}
          <button className="btn btn-outline-light btn-sm" onClick={handleImprimir}>
            Imprimir / Guardar PDF
          </button>
          {!modoVer && pedido.estado !== "confirmado" && (
            <button
              className="btn btn-success btn-sm"
              onClick={handleConfirmar}
            >
              Confirmar pedido
            </button>
          )}
          {pedido.estado === "confirmado" && (
            <span className="badge bg-success align-self-center">Pedido confirmado</span>
          )}
        </div>

        {/* Factura imprimible */}
        <div ref={facturaRef} className="factura-container p-4"
          style={{
            background: "#fff",
            color: "#000",
            borderRadius: 8,
            boxShadow: "0 2px 16px rgba(0,0,0,0.3)",
          }}
        >
          {/* Encabezado */}
          <div className="d-flex justify-content-between align-items-start mb-4">
            <div>
              <h4 className="fw-bold mb-0" style={{ color: "#000" }}>NORTH</h4>
              <div style={{ color: "#555", fontSize: "0.85rem" }}>
                {pedido.sucursal_nombre || "Central"}
              </div>
            </div>
            <div className="text-end">
              <div className="fw-bold" style={{ fontSize: "1.1rem", color: "#000" }}>
                PRESUPUESTO MAYORISTA
              </div>
              {pedido.id && (
                <div style={{ color: "#555", fontSize: "0.85rem" }}>N° {pedido.id}</div>
              )}
              <div style={{ color: "#555", fontSize: "0.85rem" }}>
                {formatFecha(pedido.fecha_creacion)}
              </div>
            </div>
          </div>

          <hr style={{ borderColor: "#ccc" }} />

          {/* Datos del cliente */}
          <div className="mb-4">
            <div className="fw-semibold mb-1" style={{ color: "#333", fontSize: "0.85rem" }}>
              CLIENTE
            </div>
            <div className="fw-bold" style={{ fontSize: "1rem", color: "#000" }}>
              {pedido.cliente_nombre}
            </div>
            {pedido.cliente_telefono && (
              <div style={{ color: "#555", fontSize: "0.85rem" }}>{pedido.cliente_telefono}</div>
            )}
          </div>

          {/* Tabla de ítems */}
          <table className="factura-table w-100 mb-3" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #000" }}>
                <th style={thStyle}>Producto</th>
                <th style={{ ...thStyle, textAlign: "center", width: 70 }}>Cant.</th>
                <th style={{ ...thStyle, textAlign: "right", width: 110 }}>Precio USD</th>
                <th style={{ ...thStyle, textAlign: "right", width: 120 }}>Subtotal USD</th>
              </tr>
            </thead>
            <tbody>
              {(pedido.items || []).map((it, i) => (
                <tr key={it.gusto_id || i} style={{ borderBottom: "1px solid #ddd" }}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600 }}>{it.producto_nombre}</div>
                    <div style={{ fontSize: "0.8rem", color: "#666" }}>{it.gusto}</div>
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{it.cantidad}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    $ {formatUsd(it.precio_usd)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    $ {formatUsd((parseFloat(it.precio_usd) || 0) * (parseInt(it.cantidad) || 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totales */}
          <div className="d-flex justify-content-end">
            <table style={{ minWidth: 260 }}>
              <tbody>
                <tr>
                  <td style={{ padding: "4px 12px", color: "#333" }}>Total USD</td>
                  <td
                    className="factura-total"
                    style={{ padding: "4px 0", textAlign: "right", fontWeight: 700, fontSize: "1.1rem", color: "#000" }}
                  >
                    $ {formatUsd(pedido.total_usd)}
                  </td>
                </tr>
                {pedido.tipo_cambio > 0 && totalArs !== null && (
                  <>
                    <tr>
                      <td style={{ padding: "2px 12px", color: "#666", fontSize: "0.82rem" }}>
                        Tipo de cambio
                      </td>
                      <td style={{ padding: "2px 0", textAlign: "right", fontSize: "0.82rem", color: "#666" }}>
                        $ {parseFloat(pedido.tipo_cambio).toLocaleString("es-AR")} ARS/USD
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: "2px 12px", color: "#333", fontSize: "0.88rem" }}>
                        Equivalente ARS
                      </td>
                      <td style={{ padding: "2px 0", textAlign: "right", fontWeight: 600, fontSize: "0.88rem", color: "#000" }}>
                        $ {totalArs.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Notas */}
          {pedido.notas && (
            <div className="mt-4 pt-3" style={{ borderTop: "1px solid #ddd", color: "#555", fontSize: "0.85rem" }}>
              <strong>Notas:</strong> {pedido.notas}
            </div>
          )}

          {/* Pie */}
          <div
            className="mt-4 pt-3 text-center"
            style={{ borderTop: "1px solid #eee", color: "#aaa", fontSize: "0.78rem" }}
          >
            North — Mayorista · Documento no válido como factura fiscal
          </div>
        </div>
      </div>
    </>
  );
}

const thStyle = {
  padding: "8px 6px",
  textAlign: "left",
  fontSize: "0.82rem",
  color: "#000",
  fontWeight: 700,
};

const tdStyle = {
  padding: "8px 6px",
  fontSize: "0.88rem",
  color: "#000",
};
