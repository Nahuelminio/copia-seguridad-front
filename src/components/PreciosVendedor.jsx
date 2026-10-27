import React, { useEffect, useState } from "react";
import axios from "../utils/axiosInstance";
import { toast } from "react-toastify";

const fmt = (n) => (n == null ? "—" : "$" + Math.round(Number(n)).toLocaleString("es-AR"));

// Ganancia por unidad con el precio que está escrito (guardado o no), y el
// margen sobre ese precio. En rojo si se vende por debajo del costo.
function ganancia(valor, costo) {
  const p = Number(valor), c = Number(costo);
  if (!valor || !p || !c) return <span style={{ color: "#475569" }}>—</span>;
  const g = p - c;
  const color = g <= 0 ? "#ef4444" : g / p < 0.1 ? "#f59e0b" : "#22c55e";
  return (
    <span style={{ color }}>
      {fmt(g)} <span style={{ fontSize: "0.75rem" }}>({Math.round((g / p) * 100)}%)</span>
    </span>
  );
}

// Precio fijo por modelo que paga el vendedor. Sin esto el vendedor no puede
// vender ese modelo: es a propósito, para que nunca quede un precio tipeado.
export default function PreciosVendedor() {
  const [filas, setFilas] = useState(null);
  const [editando, setEditando] = useState({});
  const [guardando, setGuardando] = useState(null);

  const cargar = () =>
    axios.get("/vendedores/precios")
      .then((r) => setFilas(r.data))
      .catch(() => toast.error("No se pudieron cargar los precios"));

  useEffect(() => { cargar(); }, []);

  const guardar = async (f) => {
    const valor = editando[f.producto_id];
    setGuardando(f.producto_id);
    try {
      await axios.put(`/vendedores/precios/${f.producto_id}`, { precio: valor === "" ? null : Number(valor) });
      toast.success(`${f.nombre}: guardado`);
      setEditando((e) => { const n = { ...e }; delete n[f.producto_id]; return n; });
      cargar();
    } catch (err) {
      toast.error(err?.response?.data?.error || "No se pudo guardar");
    } finally {
      setGuardando(null);
    }
  };

  const iStyle = { background: "#0f1623", border: "1px solid #334155", color: "#fff", borderRadius: 8, width: 120 };

  if (!filas) return <p style={{ color: "#64748b" }}>Cargando...</p>;
  const faltan = filas.filter((f) => f.precio == null).length;

  return (
    <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 12, padding: 16 }}>
      <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
        Lo que el vendedor te paga por unidad. Él no lo puede cambiar, y un modelo sin precio no lo puede vender.
        {faltan > 0 && <span style={{ color: "#f59e0b" }}> Faltan {faltan}.</span>}
      </p>
      <div style={{ overflowX: "auto" }}>
        <table className="table table-dark mb-0" style={{ fontSize: "0.86rem", minWidth: 760 }}>
          <thead>
            <tr>
              <th>Modelo</th><th>Costo</th><th>Lista Central</th><th>Más usado</th><th>Precio vendedor</th><th>Ganancia</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => {
              const enEdicion = f.producto_id in editando;
              const valor = enEdicion ? editando[f.producto_id] : (f.precio != null ? String(Math.round(f.precio)) : "");
              return (
                <tr key={f.producto_id}>
                  <td>{f.nombre}</td>
                  <td style={{ color: "#fca5a5" }}>{fmt(f.costo)}</td>
                  <td style={{ color: "#94a3b8" }}>{fmt(f.precio_lista)}</td>
                  <td style={{ color: "#94a3b8" }}>
                    {f.sugerido != null && f.precio == null && !enEdicion ? (
                      <button className="btn btn-sm" style={{ color: "#93c5fd", padding: 0 }}
                        onClick={() => setEditando((e) => ({ ...e, [f.producto_id]: String(Math.round(f.sugerido)) }))}>
                        {fmt(f.sugerido)} ↦ usar
                      </button>
                    ) : fmt(f.sugerido)}
                  </td>
                  <td>
                    <input type="number" min="0" style={{ ...iStyle, borderColor: f.precio == null ? "#f59e0b" : "#334155" }}
                      value={valor} placeholder="Sin precio"
                      onChange={(e) => setEditando((ed) => ({ ...ed, [f.producto_id]: e.target.value }))} />
                  </td>
                  <td>{ganancia(valor, f.costo)}</td>
                  <td>
                    {enEdicion && (
                      <button className="btn btn-sm btn-success" disabled={guardando === f.producto_id}
                        onClick={() => guardar(f)}>
                        Guardar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
