import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "../utils/axiosInstance";

// El catálogo del evento vive en el sitio público, no en el sistema.
const CATALOGO = "https://thenorthshop.net";

const card = {
  background: "#111827",
  border: "1px solid #1e293b",
  borderRadius: 12,
  padding: "20px 24px",
};

const label = {
  color: "#64748b",
  fontSize: "0.72rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const input = {
  background: "#0f172a",
  border: "1px solid #1e293b",
  color: "#e2e8f0",
  borderRadius: 8,
};

const fmt = (n) =>
  Number(n).toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

const hoy = () => new Date().toISOString().slice(0, 10);
const RENGLON = { gusto_id: "", cantidad: "", precio: "" };

export default function Eventos() {
  const [eventos, setEventos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [msg, setMsg] = useState(null);

  const [form, setForm] = useState({ nombre: "", lugar: "", fecha: hoy() });
  const [items, setItems] = useState([{ ...RENGLON }]);
  const [guardando, setGuardando] = useState(false);

  const [detalle, setDetalle] = useState(null);      // evento abierto para cerrar
  const [devoluciones, setDevoluciones] = useState({});
  const [cerrando, setCerrando] = useState(false);

  const aviso = (text, tipo = "ok") => {
    setMsg({ text, tipo });
    setTimeout(() => setMsg(null), 4000);
  };

  const cargar = useCallback(async () => {
    try {
      const [ev, prod] = await Promise.all([
        axios.get("/eventos"),
        // El stock de Central es lo que se puede llevar a una fiesta
        axios.get("/public/productos", { params: { sucursal_id: 7, inStock: 1 } }),
      ]);
      setEventos(ev.data);
      setProductos(prod.data);
    } catch (e) {
      aviso(e.response?.data?.error || "No se pudieron cargar los eventos", "error");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const stockDe = useMemo(() => {
    const m = {};
    productos.forEach((p) => { m[p.id] = { stock: p.stock, precio: p.precio, nombre: p.nombre }; });
    return m;
  }, [productos]);

  const setItem = (idx, campo, valor) =>
    setItems((xs) => xs.map((it, i) => (i === idx ? { ...it, [campo]: valor } : it)));

  // Al elegir el producto se propone el precio que ya tiene en Central
  const elegirProducto = (idx, gustoId) =>
    setItems((xs) => xs.map((it, i) => (i === idx
      ? { ...it, gusto_id: gustoId, precio: it.precio || (stockDe[gustoId]?.precio ?? "") }
      : it)));

  const total = items.reduce(
    (a, it) => a + (Number(it.cantidad) || 0) * (Number(it.precio) || 0), 0);
  const unidades = items.reduce((a, it) => a + (Number(it.cantidad) || 0), 0);

  const crear = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return aviso("Ponele un nombre al evento", "error");

    for (const [i, it] of items.entries()) {
      const n = i + 1;
      if (!it.gusto_id) return aviso(`Renglón ${n}: elegí el producto`, "error");
      if (!Number(it.cantidad)) return aviso(`Renglón ${n}: falta la cantidad`, "error");
      if (!Number(it.precio)) return aviso(`Renglón ${n}: falta el precio`, "error");
      const disp = stockDe[it.gusto_id]?.stock ?? 0;
      if (Number(it.cantidad) > disp) {
        return aviso(`Renglón ${n}: en Central hay ${disp} y pediste ${it.cantidad}`, "error");
      }
    }

    setGuardando(true);
    try {
      const res = await axios.post("/eventos", {
        ...form,
        items: items.map((it) => ({
          gusto_id: Number(it.gusto_id),
          cantidad: Number(it.cantidad),
          precio: Number(it.precio),
        })),
      });
      aviso("Evento creado y stock descontado de Central");
      setForm({ nombre: "", lugar: "", fecha: hoy() });
      setItems([{ ...RENGLON }]);
      cargar();
      navigator.clipboard?.writeText(`${CATALOGO}/evento/${res.data.slug}`).catch(() => {});
    } catch (e) {
      aviso(e.response?.data?.error || "No se pudo crear", "error");
    } finally {
      setGuardando(false);
    }
  };

  const abrirCierre = async (id) => {
    try {
      const res = await axios.get(`/eventos/${id}`);
      setDetalle(res.data);
      const d = {};
      res.data.items.forEach((i) => { d[i.id] = ""; });
      setDevoluciones(d);
    } catch {
      aviso("No se pudo abrir el evento", "error");
    }
  };

  const cerrar = async () => {
    setCerrando(true);
    try {
      const res = await axios.post(`/eventos/${detalle.id}/cerrar`, {
        devoluciones: detalle.items.map((i) => ({
          item_id: i.id,
          cantidad: Number(devoluciones[i.id]) || 0,
        })),
      });
      aviso(`Cerrado: ${res.data.vendidas} unidades por ${fmt(res.data.recaudado)}`);
      setDetalle(null);
      cargar();
    } catch (e) {
      aviso(e.response?.data?.error || "No se pudo cerrar", "error");
    } finally {
      setCerrando(false);
    }
  };

  const eliminar = async (ev) => {
    const texto = ev.estado === "abierto"
      ? `Eliminar "${ev.nombre}"? Las ${ev.unidades} unidades vuelven a Central.`
      : `Eliminar "${ev.nombre}"? Ya está cerrado, el stock no se toca.`;
    if (!window.confirm(texto)) return;
    try {
      await axios.delete(`/eventos/${ev.id}`);
      aviso("Evento eliminado");
      cargar();
    } catch (e) {
      aviso(e.response?.data?.error || "No se pudo eliminar", "error");
    }
  };

  const copiarLink = (slug) => {
    navigator.clipboard?.writeText(`${CATALOGO}/evento/${slug}`);
    aviso("Link copiado");
  };

  // Cierre: totales en vivo mientras se cargan las devoluciones
  const resumenCierre = useMemo(() => {
    if (!detalle) return null;
    return detalle.items.reduce((acc, i) => {
      const vuelven = Number(devoluciones[i.id]) || 0;
      const vendidas = i.cantidad_llevada - vuelven;
      return { vendidas: acc.vendidas + vendidas, plata: acc.plata + vendidas * Number(i.precio) };
    }, { vendidas: 0, plata: 0 });
  }, [detalle, devoluciones]);

  return (
    <div className="container-fluid mt-4 px-3 mb-5">
      <div className="mb-4">
        <h4 style={{ color: "#f1f5f9", fontWeight: 700, marginBottom: 4 }}>Eventos</h4>
        <p style={{ color: "#64748b", fontSize: "0.85rem", margin: 0 }}>
          Catálogo con QR para las fiestas. Cargás qué dejaste y a qué precio, sale de
          Central, y al cerrar declarás lo que volvió.
        </p>
      </div>

      {msg && (
        <div className={`alert ${msg.tipo === "error" ? "alert-danger" : "alert-success"} py-2`}
          style={{ fontSize: "0.88rem" }}>
          {msg.text}
        </div>
      )}

      {/* ── Nuevo evento ── */}
      <div style={card} className="mb-4">
        <div style={{ ...label, marginBottom: 16 }}>Nuevo evento</div>
        <form onSubmit={crear}>
          <div className="row g-3 mb-3">
            <div className="col-12 col-md-5">
              <p style={label} className="mb-1">Nombre</p>
              <input className="form-control form-control-sm" style={input}
                placeholder="Ej: Fiesta Tamo Chelo" value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div className="col-12 col-md-4">
              <p style={label} className="mb-1">Lugar <span style={{ textTransform: "none" }}>(opcional)</span></p>
              <input className="form-control form-control-sm" style={input}
                placeholder="Ej: Club Náutico" value={form.lugar}
                onChange={(e) => setForm({ ...form, lugar: e.target.value })} />
            </div>
            <div className="col-12 col-md-3">
              <p style={label} className="mb-1">Fecha</p>
              <input type="date" className="form-control form-control-sm" style={input}
                value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
            </div>
          </div>

          {items.map((it, idx) => {
            const info = stockDe[it.gusto_id];
            return (
              <div key={idx} className="row g-2 align-items-end mb-2">
                <div className="col-12 col-md-6">
                  {idx === 0 && <p style={label} className="mb-1">Producto</p>}
                  <select className="form-select form-select-sm" style={input}
                    value={it.gusto_id} onChange={(e) => elegirProducto(idx, e.target.value)}>
                    <option value="">-- Elegí el producto --</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre} ({p.stock} en Central)</option>
                    ))}
                  </select>
                </div>
                <div className="col-5 col-md-2">
                  {idx === 0 && <p style={label} className="mb-1">Cantidad</p>}
                  <input type="number" min="1" className="form-control form-control-sm" style={input}
                    placeholder="0" value={it.cantidad}
                    onChange={(e) => setItem(idx, "cantidad", e.target.value)} />
                  {info && (
                    <div style={{ fontSize: "0.7rem", color: Number(it.cantidad) > info.stock ? "#f87171" : "#475569" }}>
                      hay {info.stock}
                    </div>
                  )}
                </div>
                <div className="col-5 col-md-3">
                  {idx === 0 && <p style={label} className="mb-1">Precio de venta</p>}
                  <input type="number" min="1" className="form-control form-control-sm" style={input}
                    placeholder="0" value={it.precio}
                    onChange={(e) => setItem(idx, "precio", e.target.value)} />
                </div>
                <div className="col-2 col-md-1">
                  {items.length > 1 && (
                    <button type="button" onClick={() => setItems((xs) => xs.filter((_, i) => i !== idx))}
                      style={{ background: "transparent", border: "1px solid #3f0000", color: "#f87171",
                        borderRadius: 8, padding: "4px 10px", cursor: "pointer", width: "100%" }}>
                      ×
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          <button type="button" onClick={() => setItems((xs) => [...xs, { ...RENGLON }])}
            style={{ width: "100%", background: "transparent", border: "1px dashed #334155",
              color: "#64748b", borderRadius: 8, padding: 9, fontSize: "0.82rem",
              cursor: "pointer", margin: "10px 0 16px" }}>
            + Agregar producto
          </button>

          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
              {unidades} unidades · si se vende todo son{" "}
              <strong style={{ color: "#10b981" }}>{fmt(total)}</strong>
            </div>
            <button className="btn btn-sm" type="submit" disabled={guardando}
              style={{ background: "#065f46", border: "1px solid #10b981", color: "#6ee7b7", fontWeight: 600 }}>
              {guardando ? "Creando..." : "Crear evento y descontar de Central"}
            </button>
          </div>
        </form>
      </div>

      {/* ── Listado ── */}
      {cargando && <div className="text-center py-4"><div className="spinner-border text-secondary" /></div>}

      {!cargando && eventos.length === 0 && (
        <div style={{ ...card, textAlign: "center", color: "#64748b" }}>
          Todavía no cargaste ningún evento.
        </div>
      )}

      {eventos.map((ev) => (
        <div key={ev.id} style={{ ...card, marginBottom: 12 }}>
          <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
            <div>
              <div className="d-flex align-items-center gap-2">
                <strong style={{ color: "#f1f5f9" }}>{ev.nombre}</strong>
                <span style={{
                  fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.06em",
                  padding: "2px 8px", borderRadius: 5,
                  background: ev.estado === "abierto" ? "#065f4633" : "#33415533",
                  color: ev.estado === "abierto" ? "#6ee7b7" : "#94a3b8",
                }}>{ev.estado}</span>
              </div>
              <div style={{ color: "#64748b", fontSize: "0.78rem", marginTop: 3 }}>
                {new Date(ev.fecha).toLocaleDateString("es-AR")}
                {ev.lugar && ` · ${ev.lugar}`} · {ev.productos} modelos · {ev.unidades} unidades
              </div>
              {ev.estado === "cerrado" && (
                <div style={{ color: "#10b981", fontSize: "0.82rem", marginTop: 5 }}>
                  Vendidas {ev.vendidas} · {fmt(ev.recaudado)}
                </div>
              )}
            </div>

            <div className="d-flex gap-2 flex-wrap">
              {ev.estado === "abierto" && (
                <>
                  <button className="btn btn-sm" onClick={() => copiarLink(ev.slug)}
                    style={{ background: "#0f172a", border: "1px solid #334155", color: "#38bdf8" }}>
                    Copiar link
                  </button>
                  <a className="btn btn-sm" href={`${CATALOGO}/evento/${ev.slug}`}
                    target="_blank" rel="noreferrer"
                    style={{ background: "#0f172a", border: "1px solid #334155", color: "#94a3b8" }}>
                    Ver
                  </a>
                  <button className="btn btn-sm" onClick={() => abrirCierre(ev.id)}
                    style={{ background: "#065f46", border: "1px solid #10b981", color: "#6ee7b7" }}>
                    Cerrar
                  </button>
                </>
              )}
              <button className="btn btn-sm" onClick={() => eliminar(ev)}
                style={{ background: "#1a0000", border: "1px solid #3f0000", color: "#f87171" }}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* ── Cierre ── */}
      {detalle && (
        <div onClick={() => setDetalle(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 1050,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ ...card, width: "100%", maxWidth: 620, maxHeight: "88vh", overflow: "auto" }}>
            <div style={{ color: "#f1f5f9", fontWeight: 700, marginBottom: 4 }}>
              Cerrar {detalle.nombre}
            </div>
            <p style={{ color: "#64748b", fontSize: "0.8rem" }}>
              Cargá cuántas volvieron de cada modelo. Lo que no vuelve se toma como vendido
              y las devoluciones se reingresan a Central.
            </p>

            {detalle.items.map((i) => {
              const vuelven = Number(devoluciones[i.id]) || 0;
              const vendidas = i.cantidad_llevada - vuelven;
              return (
                <div key={i.id} className="d-flex justify-content-between align-items-center gap-2"
                  style={{ padding: "10px 0", borderBottom: "1px solid #1e293b" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: "#e2e8f0", fontSize: "0.86rem" }}>
                      {i.producto.trim()} — {i.gusto.trim()}
                    </div>
                    <div style={{ color: "#64748b", fontSize: "0.74rem" }}>
                      Llevadas {i.cantidad_llevada} · {fmt(i.precio)} c/u
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <input type="number" min="0" max={i.cantidad_llevada}
                      className="form-control form-control-sm" placeholder="0"
                      style={{ ...input, width: 76, textAlign: "right" }}
                      value={devoluciones[i.id]}
                      onChange={(e) => setDevoluciones({ ...devoluciones, [i.id]: e.target.value })} />
                    <span style={{ color: vendidas > 0 ? "#10b981" : "#475569",
                      fontSize: "0.78rem", minWidth: 82, textAlign: "right" }}>
                      vende {vendidas}
                    </span>
                  </div>
                </div>
              );
            })}

            <div className="d-flex justify-content-between align-items-center mt-3 pt-3"
              style={{ borderTop: "1px solid #1e293b" }}>
              <div style={{ color: "#94a3b8", fontSize: "0.86rem" }}>
                {resumenCierre.vendidas} vendidas ·{" "}
                <strong style={{ color: "#10b981" }}>{fmt(resumenCierre.plata)}</strong>
              </div>
              <div className="d-flex gap-2">
                <button className="btn btn-sm" onClick={() => setDetalle(null)}
                  style={{ background: "transparent", border: "1px solid #334155", color: "#94a3b8" }}>
                  Cancelar
                </button>
                <button className="btn btn-sm" onClick={cerrar} disabled={cerrando}
                  style={{ background: "#065f46", border: "1px solid #10b981", color: "#6ee7b7", fontWeight: 600 }}>
                  {cerrando ? "Cerrando..." : "Confirmar cierre"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
