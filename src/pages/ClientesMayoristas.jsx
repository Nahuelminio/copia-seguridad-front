import React, { useEffect, useState } from "react";
import axios from "../utils/axiosInstance";
import { toast } from "react-toastify";

const usd = (n) => "USD " + Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fecha = (f) => (f ? new Date(f).toLocaleDateString("es-AR") : "—");
const diasDesde = (f) => (f ? Math.floor((Date.now() - new Date(f)) / 86400000) : null);
const card = { background: "#111827", border: "1px solid #1e293b", borderRadius: 12, padding: 16 };
const titulo = { color: "#64748b", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.07em" };

// Qué compra cada cliente mayorista, cada cuánto y cuánto debe.
export default function ClientesMayoristas() {
  const [clientes, setClientes] = useState(null);
  const [filtro, setFiltro] = useState("");
  const [abierto, setAbierto] = useState(null);

  useEffect(() => {
    axios.get("/mayorista/clientes-resumen")
      .then((r) => setClientes(r.data))
      .catch(() => toast.error("No se pudieron cargar los clientes"));
  }, []);

  if (abierto) return <DetalleCliente id={abierto} onVolver={() => setAbierto(null)} />;

  const lista = (clientes || []).filter((c) =>
    c.nombre.toLowerCase().includes(filtro.toLowerCase()));
  const deudaTotal = (clientes || []).reduce((s, c) => s + c.deuda_usd, 0);

  return (
    <div className="container py-4" style={{ maxWidth: 960 }}>
      <h4 style={{ color: "#f1f5f9", fontWeight: 700 }}>Clientes mayoristas</h4>
      <p style={{ color: "#64748b", fontSize: "0.85rem" }}>
        Lo que compró cada uno, cada cuántos días compra y cuánto debe.
        {deudaTotal > 0 && <strong style={{ color: "#f87171" }}> Te deben {usd(deudaTotal)} en total.</strong>}
      </p>
      <input className="form-control mb-3" placeholder="Buscar cliente" value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        style={{ background: "#111827", border: "1px solid #334155", color: "#fff", maxWidth: 320 }} />

      {!clientes ? <p style={{ color: "#64748b" }}>Cargando…</p> : (
        <div className="table-responsive">
          <table className="table table-dark table-hover align-middle" style={{ fontSize: "0.88rem" }}>
            <thead>
              <tr>
                <th>Cliente</th><th className="text-end">Pedidos</th><th className="text-end">Comprado</th>
                <th>Último pedido</th><th className="text-end">Compra cada</th><th className="text-end">Debe</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => {
                const hace = diasDesde(c.ultimo_pedido);
                // Atrasado: pasó bastante más de lo que suele tardar en volver
                const atrasado = c.cada_dias && hace != null && hace > c.cada_dias * 1.5;
                return (
                  <tr key={c.id} style={{ cursor: "pointer" }} onClick={() => setAbierto(c.id)}>
                    <td>
                      <div className="fw-semibold">{c.nombre}</div>
                      {c.telefono && <div style={{ color: "#64748b", fontSize: "0.78rem" }}>{c.telefono}</div>}
                    </td>
                    <td className="text-end">{c.pedidos}</td>
                    <td className="text-end">{c.pedidos ? usd(c.total_usd) : "—"}</td>
                    <td>
                      {fecha(c.ultimo_pedido)}
                      {hace != null && (
                        <div style={{ fontSize: "0.75rem", color: atrasado ? "#fbbf24" : "#64748b" }}>
                          hace {hace} días{atrasado ? " · tarda más de lo normal" : ""}
                        </div>
                      )}
                    </td>
                    <td className="text-end" style={{ color: "#94a3b8" }}>{c.cada_dias != null ? `${c.cada_dias} días` : "—"}</td>
                    <td className="text-end fw-semibold" style={{ color: c.deuda_usd > 0 ? "#f87171" : "#64748b" }}>
                      {c.deuda_usd > 0 ? usd(c.deuda_usd) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DetalleCliente({ id, onVolver }) {
  const [d, setD] = useState(null);

  useEffect(() => {
    axios.get(`/mayorista/clientes/${id}/historial`)
      .then((r) => setD(r.data))
      .catch(() => toast.error("No se pudo cargar el cliente"));
  }, [id]);

  if (!d) return <p className="text-center mt-5" style={{ color: "#64748b" }}>Cargando…</p>;
  const maxModelo = Math.max(1, ...d.modelos.map((m) => m.unidades));

  return (
    <div className="container py-4" style={{ maxWidth: 960 }}>
      <button className="btn btn-sm btn-outline-light mb-3" onClick={onVolver}>← Clientes</button>
      <h4 style={{ color: "#f1f5f9", fontWeight: 700, marginBottom: 2 }}>{d.cliente.nombre}</h4>
      <p style={{ color: "#64748b", fontSize: "0.85rem" }}>{d.cliente.telefono}</p>

      <div className="d-flex flex-wrap gap-4 mb-3" style={card}>
        {[
          ["Pedidos", d.pedidos.length, "#e2e8f0"],
          ["Comprado", usd(d.total_usd), "#e2e8f0"],
          ["Unidades", d.unidades, "#94a3b8"],
          ["Debe", d.deuda_usd > 0 ? usd(d.deuda_usd) : "Nada", d.deuda_usd > 0 ? "#f87171" : "#4ade80"],
        ].map(([t, v, c]) => (
          <div key={t}><div style={titulo}>{t}</div><div style={{ color: c, fontWeight: 700, fontSize: "1.1rem" }}>{v}</div></div>
        ))}
      </div>

      <div className="row g-3 mb-3">
        <div className="col-md-6">
          <div style={card}>
            <div style={titulo} className="mb-2">Qué modelos compra</div>
            {d.modelos.map((m) => (
              <div key={m.nombre} className="mb-2" style={{ fontSize: "0.86rem" }}>
                <div className="d-flex justify-content-between"><span>{m.nombre}</span><strong>{m.unidades}</strong></div>
                <div style={{ height: 4, background: "#1e293b", borderRadius: 2 }}>
                  <div style={{ width: `${(m.unidades / maxModelo) * 100}%`, height: "100%", background: "#38bdf8", borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="col-md-6">
          <div style={card}>
            <div style={titulo} className="mb-2">Sabores que más pide</div>
            {d.sabores.map((s, i) => (
              <div key={i} className="d-flex justify-content-between py-1" style={{ fontSize: "0.86rem", borderBottom: "1px solid #1e293b" }}>
                <span><span style={{ color: "#64748b" }}>{s.modelo}</span> — {s.sabor}</span><strong>{s.unidades}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={card}>
        <div style={titulo} className="mb-2">Pedidos</div>
        <div className="table-responsive">
          <table className="table table-dark mb-0" style={{ fontSize: "0.86rem" }}>
            <thead><tr><th>#</th><th>Fecha</th><th className="text-end">Unidades</th><th className="text-end">Total</th><th className="text-end">Cobrado</th><th className="text-end">Debe</th></tr></thead>
            <tbody>
              {d.pedidos.map((p) => (
                <tr key={p.id}>
                  <td style={{ color: "#94a3b8" }}>#{p.id}</td>
                  <td>{fecha(p.fecha_confirmacion)}</td>
                  <td className="text-end">{p.unidades}</td>
                  <td className="text-end">{usd(p.total_usd)}</td>
                  <td className="text-end" style={{ color: "#94a3b8" }}>
                    {Number(p.cobro_control) ? usd(p.cobrado_usd) : <span title="Anterior al control de cobros">—</span>}
                  </td>
                  <td className="text-end fw-semibold" style={{ color: p.saldo_usd > 0 ? "#f87171" : "#64748b" }}>
                    {p.saldo_usd > 0 ? usd(p.saldo_usd) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
