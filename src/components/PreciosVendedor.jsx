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
    const { precio, recomendado } = valores(f);
    setGuardando(f.producto_id);
    try {
      await axios.put(`/vendedores/precios/${f.producto_id}`, {
        precio: precio === "" ? null : Number(precio),
        recomendado: recomendado === "" ? null : Number(recomendado),
      });
      toast.success(`${f.nombre}: guardado`);
      setEditando((e) => { const n = { ...e }; delete n[f.producto_id]; return n; });
      cargar();
    } catch (err) {
      toast.error(err?.response?.data?.error || "No se pudo guardar");
    } finally {
      setGuardando(null);
    }
  };

  // Lo que está escrito en la fila: lo editado, o si no lo guardado
  const valores = (f) => ({
    precio: f.precio != null ? String(Math.round(f.precio)) : "",
    recomendado: f.recomendado != null ? String(Math.round(f.recomendado)) : "",
    ...(editando[f.producto_id] || {}),
  });
  const cambiar = (id, campo, v) =>
    setEditando((e) => ({ ...e, [id]: { ...(e[id] || {}), [campo]: v } }));

  const iStyle = { background: "#0f1623", border: "1px solid #334155", color: "#fff", borderRadius: 8, width: 120 };

  if (!filas) return <p style={{ color: "#64748b" }}>Cargando...</p>;
  const faltan = filas.filter((f) => f.precio == null).length;

  return (
    <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 12, padding: 16 }}>
      <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
        Lo que el vendedor te paga por unidad. Él no lo puede cambiar, y un modelo sin precio no lo puede vender.
        La venta recomendada es lo que ve él como sugerencia; vacía, usa el precio de lista.
        {faltan > 0 && <span style={{ color: "#f59e0b" }}> Faltan {faltan}.</span>}
      </p>
      <div style={{ overflowX: "auto" }}>
        <table className="table table-dark mb-0" style={{ fontSize: "0.86rem", minWidth: 900 }}>
          <thead>
            <tr>
              <th>Modelo</th><th>Costo</th><th>Lista Central</th><th>Más usado</th><th>Precio vendedor</th><th>Ganancia</th><th>Venta recomendada</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => {
              const enEdicion = f.producto_id in editando;
              const { precio: valor, recomendado } = valores(f);
              return (
                <tr key={f.producto_id}>
                  <td>{f.nombre}</td>
                  <td style={{ color: "#fca5a5" }}>{fmt(f.costo)}</td>
                  <td style={{ color: "#94a3b8" }}>{fmt(f.precio_lista)}</td>
                  <td style={{ color: "#94a3b8" }}>
                    {f.sugerido != null && f.precio == null && !enEdicion ? (
                      <button className="btn btn-sm" style={{ color: "#93c5fd", padding: 0 }}
                        onClick={() => cambiar(f.producto_id, "precio", String(Math.round(f.sugerido)))}>
                        {fmt(f.sugerido)} ↦ usar
                      </button>
                    ) : fmt(f.sugerido)}
                  </td>
                  <td>
                    <input type="number" min="0" style={{ ...iStyle, borderColor: f.precio == null ? "#f59e0b" : "#334155" }}
                      value={valor} placeholder="Sin precio"
                      onChange={(e) => cambiar(f.producto_id, "precio", e.target.value)} />
                  </td>
                  <td>{ganancia(valor, f.costo)}</td>
                  <td>
                    <input type="number" min="0" style={iStyle}
                      value={recomendado} placeholder={f.precio_lista != null ? `Lista ${Math.round(f.precio_lista)}` : "—"}
                      onChange={(e) => cambiar(f.producto_id, "recomendado", e.target.value)} />
                  </td>
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
