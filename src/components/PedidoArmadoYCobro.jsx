import React, { useCallback, useEffect, useState } from "react";
import axios from "../utils/axiosInstance";
import { toast } from "react-toastify";

const usd = (n) => "USD " + Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ars = (n) => "$ " + Math.round(Number(n || 0)).toLocaleString("es-AR");
const caja = {
  maxWidth: 900, background: "#0f172a", border: "1px solid #1e293b",
  borderRadius: 12, padding: "14px 18px", color: "#e2e8f0",
};
const titulo = { color: "#64748b", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.07em" };

// Debajo de la factura de un pedido: el checklist para armar la caja y, para
// el admin, lo cobrado y lo que falta.
export default function PedidoArmadoYCobro({ pedido, esAdmin }) {
  const [extras, setExtras] = useState(null);
  const [pago, setPago] = useState({ monto: "", moneda: "ARS", nota: "" });
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(() => {
    axios.get(`/mayorista/pedidos/${pedido.id}/extras`)
      .then((r) => setExtras(r.data))
      .catch(() => toast.error("No se pudo cargar el armado y los cobros"));
  }, [pedido.id]);

  useEffect(() => { cargar(); }, [cargar]);

  if (!extras || pedido.estado === "cancelado") return null;

  const items = [...(pedido.items || [])].sort((a, b) =>
    (a.producto_nombre + a.gusto).localeCompare(b.producto_nombre + b.gusto));
  const hechos = items.filter((it) => extras.armado[it.id]).length;
  const completo = items.length > 0 && hechos === items.length;

  const tildar = async (it) => {
    const nuevo = !extras.armado[it.id];
    setExtras((e) => ({ ...e, armado: { ...e.armado, [it.id]: nuevo } }));
    try {
      await axios.patch(`/mayorista/pedidos/${pedido.id}/items/${it.id}/armado`, { armado: nuevo });
    } catch {
      setExtras((e) => ({ ...e, armado: { ...e.armado, [it.id]: !nuevo } }));
      toast.error("No se guardó el tilde");
    }
  };

  const cobrar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await axios.post(`/mayorista/pedidos/${pedido.id}/pagos`, {
        monto: Number(pago.monto), moneda: pago.moneda, nota: pago.nota,
      });
      toast.success("Pago registrado");
      setPago({ monto: "", moneda: pago.moneda, nota: "" });
      cargar();
    } catch (err) {
      toast.error(err?.response?.data?.error || "No se pudo registrar el pago");
    } finally {
      setGuardando(false);
    }
  };

  const borrarPago = async (p) => {
    if (!window.confirm(`¿Borrar el pago de ${p.moneda === "USD" ? usd(p.monto) : ars(p.monto)}?`)) return;
    try {
      await axios.delete(`/mayorista/pagos/${p.id}`);
      cargar();
    } catch {
      toast.error("No se pudo borrar");
    }
  };

  const controlar = async () => {
    await axios.patch(`/mayorista/pedidos/${pedido.id}/cobro-control`, { activo: true });
    cargar();
  };

  const tc = extras.tipo_cambio;
  const iStyle = { background: "#111827", border: "1px solid #334155", color: "#fff", borderRadius: 8 };

  return (
    <>
      {/* Checklist de armado */}
      <div className="mx-auto mt-3" style={caja}>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <span style={titulo}>Armado de la caja</span>
          <strong style={{ color: completo ? "#4ade80" : "#fbbf24" }}>
            {completo ? "✓ Caja completa" : `${hechos} de ${items.length}`}
          </strong>
        </div>
        <div style={{ height: 6, background: "#1e293b", borderRadius: 3, overflow: "hidden", marginBottom: 10 }}>
          <div style={{
            width: `${items.length ? (hechos / items.length) * 100 : 0}%`, height: "100%",
            background: completo ? "#22c55e" : "#f59e0b", transition: "width 0.2s",
          }} />
        </div>
        {items.map((it) => {
          const ok = !!extras.armado[it.id];
          return (
            <label key={it.id} className="d-flex align-items-center gap-3 py-2"
              style={{ borderBottom: "1px solid #1e293b", cursor: "pointer", opacity: ok ? 0.55 : 1 }}>
              <input type="checkbox" checked={ok} onChange={() => tildar(it)}
                style={{ width: 22, height: 22, accentColor: "#22c55e", flexShrink: 0 }} />
              <strong style={{ fontSize: "1.1rem", minWidth: 32, textAlign: "right" }}>{it.cantidad}</strong>
              <span style={{ textDecoration: ok ? "line-through" : "none" }}>
                <span style={{ color: "#94a3b8" }}>{it.producto_nombre}</span> — {it.gusto}
              </span>
            </label>
          );
        })}
      </div>

      {/* Cobro */}
      {esAdmin && pedido.estado === "confirmado" && (
        <div className="mx-auto mt-3 mb-4" style={caja}>
          <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
            <span style={titulo}>Cobro</span>
            {extras.cobro_control ? (
              extras.saldo_usd > 0 ? (
                <strong style={{ color: "#f87171" }}>
                  Debe {usd(extras.saldo_usd)}{tc > 0 && <span style={{ fontWeight: 400 }}> · {ars(extras.saldo_usd * tc)}</span>}
                </strong>
              ) : <strong style={{ color: "#4ade80" }}>✓ Cobrado</strong>
            ) : (
              <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                Pedido anterior al control de cobros: se toma como cobrado.{" "}
                <button type="button" className="btn btn-sm btn-outline-warning ms-1" onClick={controlar}>
                  No estaba pago
                </button>
              </span>
            )}
          </div>
          <div style={{ fontSize: "0.85rem", color: "#94a3b8" }} className="mb-2">
            Total {usd(extras.total_usd)}{tc > 0 && ` · ${ars(extras.total_usd * tc)} (TC ${tc})`} · Cobrado {usd(extras.cobrado_usd)}
          </div>

          {extras.pagos.map((p) => (
            <div key={p.id} className="d-flex justify-content-between align-items-center py-1"
              style={{ borderTop: "1px solid #1e293b", fontSize: "0.88rem" }}>
              <span>
                {new Date(p.fecha).toLocaleDateString("es-AR")} ·{" "}
                <strong>{p.moneda === "USD" ? usd(p.monto) : ars(p.monto)}</strong>
                {p.moneda === "ARS" && <span style={{ color: "#64748b" }}> = {usd(p.monto_usd)}</span>}
                {p.nota && <span style={{ color: "#64748b" }}> · {p.nota}</span>}
              </span>
              <button type="button" className="btn btn-sm" style={{ color: "#f87171" }} onClick={() => borrarPago(p)}>✕</button>
            </div>
          ))}

          {(extras.saldo_usd > 0 || !extras.cobro_control) && (
            <form onSubmit={cobrar} className="d-flex gap-2 flex-wrap mt-2">
              <select value={pago.moneda} onChange={(e) => setPago({ ...pago, moneda: e.target.value })}
                className="form-select" style={{ ...iStyle, width: 90, backgroundImage: "none" }}>
                <option value="ARS">$</option>
                <option value="USD">USD</option>
              </select>
              <input type="number" min="0" step="0.01" required placeholder="Monto"
                value={pago.monto} onChange={(e) => setPago({ ...pago, monto: e.target.value })}
                className="form-control" style={{ ...iStyle, width: 140 }} />
              <input type="text" placeholder="Nota (opcional)" maxLength={255}
                value={pago.nota} onChange={(e) => setPago({ ...pago, nota: e.target.value })}
                className="form-control" style={{ ...iStyle, flex: 1, minWidth: 140 }} />
              {extras.saldo_usd > 0 && (
                <button type="button" className="btn btn-outline-secondary btn-sm"
                  onClick={() => setPago({
                    ...pago,
                    monto: pago.moneda === "USD"
                      ? extras.saldo_usd.toFixed(2)
                      : String(Math.round(extras.saldo_usd * tc)),
                  })}>
                  Todo
                </button>
              )}
              <button type="submit" className="btn btn-success btn-sm" disabled={guardando}>
                {guardando ? "…" : "Registrar pago"}
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
