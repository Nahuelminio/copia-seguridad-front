import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "../utils/axiosInstance";
import QrEvento from "../components/QrEvento";
import ReciboEvento from "../components/ReciboEvento";
import EntregaEvento from "../components/EntregaEvento";
import "../styles/Eventos.css";

// El catálogo del evento vive en el sitio público, no en el sistema.
const CATALOGO = "https://thenorthshop.net";

const card = {
  background: "#111827",
  border: "1px solid #1e293b",
  borderRadius: 12,
  padding: "20px 24px",
};

// Botones: sólo la acción principal lleva color, el resto neutro. Con seis
// botones de seis colores el ojo no sabe dónde mirar.
const btn = {
  background: "#0f172a",
  border: "1px solid #273449",
  color: "#94a3b8",
  borderRadius: 8,
  padding: "5px 12px",
  fontSize: "0.8rem",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const btnPrimario = {
  ...btn,
  background: "#065f46",
  border: "1px solid #10b981",
  color: "#6ee7b7",
  fontWeight: 600,
};

const btnPeligro = { ...btn, border: "1px solid #3f1d1d", color: "#f87171" };

const seccion = {
  fontSize: "0.7rem",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "#475569",
  display: "flex",
  alignItems: "center",
  gap: 12,
  margin: "22px 0 14px",
};

const rayita = { flex: 1, height: 1, background: "#1e293b" };

const label = {
  color: "#64748b",
  fontSize: "0.72rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const fmt = (n) =>
  Number(n).toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

const hoy = () => new Date().toISOString().slice(0, 10);

// Se achica en el navegador antes de mandarlo: los logos que pasan suelen ser
// de varios MB y en la carta se ven a 80px de alto.
const achicarLogo = (file) =>
  new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error("No se pudo leer el archivo"));
    fr.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Ese archivo no es una imagen"));
      img.onload = () => {
        const ALTO = 240;
        const escala = Math.min(1, ALTO / img.height);
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * escala);
        c.height = Math.round(img.height * escala);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        // PNG para no perder la transparencia, que en fondo negro se nota
        resolve(c.toDataURL("image/png"));
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
const RENGLON = { gusto_id: "", cantidad: "", precio: "" };

export default function Eventos() {
  const [eventos, setEventos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [msg, setMsg] = useState(null);

  const [form, setForm] = useState({ nombre: "", lugar: "", fecha: hoy(), comision_unidad: 5000, nota: "" });
  const [items, setItems] = useState([{ ...RENGLON }]);
  const [logos, setLogos] = useState([]);
  const [guardando, setGuardando] = useState(false);

  const [detalle, setDetalle] = useState(null);      // evento abierto para cerrar
  const [devoluciones, setDevoluciones] = useState({});
  const [cerrando, setCerrando] = useState(false);
  const [qr, setQr] = useState(null);   // { url, titulo, subtitulo }
  const [recibo, setRecibo] = useState(null);   // rendición para entregarle a la fiesta
  const [entrega, setEntrega] = useState(null); // remito de lo que se deja al empezar
  // Editar reusa el formulario de arriba: guarda el id y lo que ya tenía
  // asignado, para no contar dos veces el stock que ya salió de Central.
  const [editando, setEditando] = useState(null);
  const [originales, setOriginales] = useState({});
  const [stats, setStats] = useState(null);
  const [verStats, setVerStats] = useState(false);

  const aviso = (text, tipo = "ok") => {
    setMsg({ text, tipo });
    setTimeout(() => setMsg(null), 4000);
  };

  const cargar = useCallback(async () => {
    try {
      const [ev, prod, st] = await Promise.all([
        axios.get("/eventos"),
        // El stock de Central es lo que se puede llevar a una fiesta
        axios.get("/public/productos", { params: { sucursal_id: 7, inStock: 1 } }),
        axios.get("/eventos/estadisticas").catch(() => ({ data: null })),
      ]);
      setEventos(ev.data);
      setProductos(prod.data);
      setStats(st.data);
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

  const comision = Number(form.comision_unidad) || 0;
  const unidades = items.reduce((a, it) => a + (Number(it.cantidad) || 0), 0);
  const bruto = items.reduce(
    (a, it) => a + (Number(it.cantidad) || 0) * (Number(it.precio) || 0), 0);
  // Lo que queda para nosotros: la fiesta se lleva una comisión por unidad
  const neto = bruto - unidades * comision;

  const crear = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return aviso("Ponele un nombre al evento", "error");

    for (const [i, it] of items.entries()) {
      const n = i + 1;
      if (!it.gusto_id) return aviso(`Renglón ${n}: elegí el producto`, "error");
      if (!Number(it.cantidad)) return aviso(`Renglón ${n}: falta la cantidad`, "error");
      if (!Number(it.precio)) return aviso(`Renglón ${n}: falta el precio`, "error");
      if (Number(it.precio) <= comision) {
        return aviso(`Renglón ${n}: a ese precio no te queda nada después de la comisión`, "error");
      }
      const disp = (stockDe[it.gusto_id]?.stock ?? 0) + (originales[it.gusto_id] || 0);
      if (Number(it.cantidad) > disp) {
        return aviso(`Renglón ${n}: podés poner hasta ${disp} y pediste ${it.cantidad}`, "error");
      }
    }

    const cuerpo = {
      ...form,
      logos,
      items: items.map((it) => ({
        gusto_id: Number(it.gusto_id),
        cantidad: Number(it.cantidad),
        precio: Number(it.precio),
      })),
    };

    setGuardando(true);
    try {
      if (editando) {
        await axios.put(`/eventos/${editando}`, cuerpo);
        aviso("Evento actualizado y stock ajustado");
      } else {
        const res = await axios.post("/eventos", cuerpo);
        aviso("Evento creado y stock descontado de Central");
        navigator.clipboard?.writeText(`${CATALOGO}/evento/${res.data.slug}`).catch(() => {});
      }
      limpiarForm();
      cargar();
    } catch (e) {
      aviso(e.response?.data?.error || "No se pudo guardar", "error");
    } finally {
      setGuardando(false);
    }
  };

  const limpiarForm = () => {
    setForm({ nombre: "", lugar: "", fecha: hoy(), comision_unidad: form.comision_unidad, nota: "" });
    setItems([{ ...RENGLON }]);
    setLogos([]);
    setEditando(null);
    setOriginales({});
  };

  const editar = async (id) => {
    try {
      const { data } = await axios.get(`/eventos/${id}`);
      setForm({
        nombre: data.nombre,
        lugar: data.lugar || "",
        fecha: String(data.fecha).slice(0, 10),
        comision_unidad: Number(data.comision_unidad),
        nota: data.nota || "",
      });
      setItems(data.items.map((i) => ({
        gusto_id: String(i.gusto_id),
        cantidad: String(i.cantidad_llevada),
        precio: String(Number(i.precio)),
      })));
      setLogos(data.logos || []);
      setOriginales(Object.fromEntries(data.items.map((i) => [String(i.gusto_id), i.cantidad_llevada])));
      setEditando(id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      aviso(e.response?.data?.error || "No se pudo abrir el evento", "error");
    }
  };

  const reabrir = async (ev) => {
    if (!window.confirm(
      `Reabrir "${ev.nombre}"? Lo que había vuelto a Central sale de nuevo y vas a poder editarlo.`
    )) return;
    try {
      await axios.post(`/eventos/${ev.id}/reabrir`);
      aviso("Evento reabierto");
      cargar();
    } catch (e) {
      aviso(e.response?.data?.error || "No se pudo reabrir", "error");
    }
  };

  const subirLogos = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 3 - logos.length);
    e.target.value = "";
    try {
      const nuevos = await Promise.all(files.map(achicarLogo));
      setLogos((xs) => [...xs, ...nuevos].slice(0, 3));
    } catch (err) {
      aviso(err.message || "No se pudo cargar el logo", "error");
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

  // Rendición de un evento ya cerrado: las devoluciones ya están guardadas,
  // así que alcanza con el detalle del servidor.
  const abrirRecibo = async (id) => {
    try {
      const res = await axios.get(`/eventos/${id}`);
      setRecibo({ evento: res.data });
    } catch {
      aviso("No se pudo abrir la rendición", "error");
    }
  };

  // Remito de lo que se le deja a la fiesta, para que cuenten contra un papel
  const abrirEntrega = async (id) => {
    try {
      const res = await axios.get(`/eventos/${id}`);
      setEntrega(res.data);
    } catch {
      aviso("No se pudo abrir el remito", "error");
    }
  };

  const cerrar = async () => {
    setCerrando(true);
    try {
      const res = await axios.post(`/eventos/${detalle.id}/cerrar`, {
        devoluciones: detalle.items.map((i) => ({
          item_id: i.id,
          cantidad: Number(devoluciones[i.id]) || 0,
          directas: Number(devoluciones[`d${i.id}`]) || 0,
          precio_directo: devoluciones[`p${i.id}`] ?? "",
        })),
      });
      aviso(`Cerrado: ${res.data.vendidas} unidades · ${fmt(res.data.neto)} para vos`);
      // La rendición se abre sola: es el momento en que hay que arreglar con la
      // fiesta, y así no hay que ir a buscarla después.
      setRecibo({ evento: detalle, devoluciones: { ...devoluciones } });
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
    navigator.clipboard?.writeText(slug ? `${CATALOGO}/evento/${slug}` : `${CATALOGO}/fiesta`);
    aviso("Link copiado");
  };

  // Cierre: totales en vivo mientras se cargan las devoluciones
  const resumenCierre = useMemo(() => {
    if (!detalle) return null;
    const com = Number(detalle.comision_unidad) || 0;
    return detalle.items.reduce((acc, i) => {
      const vuelven = Number(devoluciones[i.id]) || 0;
      // Las pagadas directo a nosotros no las vendió la fiesta: no pagan
      // comisión y no entran en lo que ella tiene que rendir.
      const directas = Number(devoluciones[`d${i.id}`]) || 0;
      const precioDir = Number(devoluciones[`p${i.id}`]) || Number(i.precio);
      const vendidas = i.cantidad_llevada - vuelven - directas;
      return {
        vendidas: acc.vendidas + vendidas,
        directas: acc.directas + directas,
        bruto: acc.bruto + vendidas * Number(i.precio),
        directo: acc.directo + directas * precioDir,
        comision: acc.comision + vendidas * com,
        aRendir: acc.aRendir + vendidas * (Number(i.precio) - com),
        neto: acc.neto + vendidas * (Number(i.precio) - com) + directas * precioDir,
      };
    }, { vendidas: 0, directas: 0, bruto: 0, directo: 0, comision: 0, aRendir: 0, neto: 0 });
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

      {/* El QR se imprime una sola vez con este link: siempre muestra el evento
          del día, sin importar cuál sea. */}
      <div style={{ ...card, marginBottom: 16, borderColor: "#334155" }}>
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div style={{ minWidth: 0 }}>
            <p style={{ ...label, color: "#38bdf8", marginBottom: 4 }}>Link fijo para el QR</p>
            <div style={{ color: "#e2e8f0", fontWeight: 600, wordBreak: "break-all" }}>
              {CATALOGO}/fiesta
            </div>
            <p style={{ color: "#64748b", fontSize: "0.78rem", margin: "6px 0 0" }}>
              Imprimí el QR una vez con este link. Muestra solo el evento abierto del día;
              si no hay ninguno, invita a ver el catálogo de siempre.
            </p>
          </div>
          <div className="d-flex gap-2">
            <button onClick={() => setQr({
              url: `${CATALOGO}/fiesta`,
              titulo: "The North Shop",
              subtitulo: "Catálogo de vapers",
            })} style={btnPrimario}>
              Ver QR
            </button>
            <button onClick={() => copiarLink(null)} style={btn}>Copiar</button>
            <a href={`${CATALOGO}/fiesta`} target="_blank" rel="noreferrer" style={{ ...btn, textDecoration: "none" }}>
              Abrir
            </a>
          </div>
        </div>
      </div>

      {msg && (
        <div className={`alert ${msg.tipo === "error" ? "alert-danger" : "alert-success"} py-2`}
          style={{ fontSize: "0.88rem" }}>
          {msg.text}
        </div>
      )}

      {/* ── Nuevo evento ── */}
      <div style={card} className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div style={label}>{editando ? "Editando evento" : "Nuevo evento"}</div>
          {editando && (
            <button type="button" className="btn btn-sm" onClick={limpiarForm}
              style={{ background: "transparent", border: "1px solid #334155", color: "#94a3b8" }}>
              Cancelar edición
            </button>
          )}
        </div>
        <form onSubmit={crear}>
          <div className="row g-3 mb-3">
            <div className="col-12 col-md-4">
              <p style={label} className="mb-1">Nombre</p>
              <input className="ev-in"
                placeholder="Ej: Fiesta Tamo Chelo" value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div className="col-12 col-md-4">
              <p style={label} className="mb-1">Lugar <span style={{ textTransform: "none" }}>(opcional)</span></p>
              <input className="ev-in"
                placeholder="Ej: Club Náutico" value={form.lugar}
                onChange={(e) => setForm({ ...form, lugar: e.target.value })} />
            </div>
            <div className="col-6 col-md-2">
              <p style={label} className="mb-1">Fecha</p>
              <input type="date" className="ev-in"
                value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
            </div>
            <div className="col-6 col-md-2">
              <p style={label} className="mb-1">Comisión x unidad</p>
              <input type="number" min="0" className="ev-in"
                value={form.comision_unidad}
                onChange={(e) => setForm({ ...form, comision_unidad: e.target.value })} />
            </div>
          </div>

          <div className="mb-3">
            <p style={label} className="mb-1">
              Aviso para el cliente <span style={{ textTransform: "none" }}>(opcional)</span>
            </p>
            <input className="ev-in"
              maxLength={300} value={form.nota}
              placeholder="Ej: Hay dos barras. Si no ves alguno, puede estar en la otra o haberse agotado."
              onChange={(e) => setForm({ ...form, nota: e.target.value })} />
            {!form.nota && (
              <button type="button" onClick={() => setForm({ ...form,
                nota: "Hay dos barras. Si no encontrás alguno, puede que se haya vendido o que esté en la otra barra." })}
                style={{ background: "none", border: "none", color: "#38bdf8", fontSize: "0.75rem",
                  padding: "4px 0 0", cursor: "pointer" }}>
                Usar el texto de las dos barras
              </button>
            )}
          </div>

          <div className="mb-3">
            <p style={label} className="mb-1">
              Logos de la fiesta <span style={{ textTransform: "none" }}>(opcional, hasta 3)</span>
            </p>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              {logos.map((src, i) => (
                <div key={i} style={{ position: "relative" }}>
                  <img src={src} alt="" style={{
                    height: 46, width: "auto", background: "#0f172a",
                    border: "1px solid #1e293b", borderRadius: 8, padding: 4 }} />
                  <button type="button" onClick={() => setLogos((xs) => xs.filter((_, k) => k !== i))}
                    title="Quitar"
                    style={{ position: "absolute", top: -7, right: -7, width: 20, height: 20,
                      borderRadius: "50%", background: "#1a0000", border: "1px solid #3f0000",
                      color: "#f87171", fontSize: 12, lineHeight: 1, cursor: "pointer", padding: 0 }}>
                    ×
                  </button>
                </div>
              ))}
              {logos.length < 3 && (
                <label style={{ display: "inline-flex", alignItems: "center",
                  padding: "12px 16px", cursor: "pointer", color: "#64748b",
                  fontSize: "0.8rem", borderStyle: "dashed" }}>
                  + Agregar logo
                  <input type="file" accept="image/*" multiple hidden onChange={subirLogos} />
                </label>
              )}
            </div>
          </div>

          <div style={seccion}>
            <span>Qué dejás</span>
            <span style={rayita} />
          </div>

          <div className="row g-2 d-none d-md-flex" style={{ margin: "0 0 6px", padding: "0 12px" }}>
            <div className="col-md-6"><span style={label}>Producto</span></div>
            <div className="col-md-2"><span style={label}>Cantidad</span></div>
            <div className="col-md-3"><span style={label}>Precio al público</span></div>
            <div className="col-md-1" />
          </div>

          {items.map((it, idx) => {
            const info = stockDe[it.gusto_id];
            return (
              <div key={idx} className="row g-2 align-items-start ev-renglon"
                style={{ marginLeft: 0, marginRight: 0 }}>
                <div className="col-12 col-md-6">
                  <select className="ev-in"
                    value={it.gusto_id} onChange={(e) => elegirProducto(idx, e.target.value)}>
                    <option value="">-- Elegí el producto --</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre} ({p.stock} en Central)</option>
                    ))}
                  </select>
                </div>
                <div className="col-5 col-md-2">
                  <input type="number" min="1" className="ev-in"
                    placeholder="0" value={it.cantidad}
                    onChange={(e) => setItem(idx, "cantidad", e.target.value)} />
                  {info && (() => {
                    const tope = info.stock + (originales[it.gusto_id] || 0);
                    return (
                      <div className={`ev-hint${Number(it.cantidad) > tope ? " pasado" : ""}`}>
                        hasta {tope}
                      </div>
                    );
                  })()}
                </div>
                <div className="col-5 col-md-3">
                  <input type="number" min="1" className="ev-in"
                    placeholder="0" value={it.precio}
                    onChange={(e) => setItem(idx, "precio", e.target.value)} />
                </div>
                <div className="col-2 col-md-1 d-flex justify-content-end">
                  {items.length > 1 && (
                    <button type="button" title="Quitar"
                      onClick={() => setItems((xs) => xs.filter((_, i) => i !== idx))}
                      style={{ ...btnPeligro, padding: "5px 10px", lineHeight: 1 }}>
                      ×
                    </button>
                  )}
                </div>

                {Number(it.cantidad) > 0 && Number(it.precio) > 0 && (
                  <div className="col-12 ev-hint" style={{ marginTop: 2 }}>
                    {it.cantidad} × {fmt(it.precio)} = {fmt(Number(it.cantidad) * Number(it.precio))}
                    {" · "}te quedan {fmt(Number(it.cantidad) * (Number(it.precio) - comision))}
                  </div>
                )}
              </div>
            );
          })}

          <button type="button" onClick={() => setItems((xs) => [...xs, { ...RENGLON }])}
            style={{ width: "100%", background: "transparent", border: "1px dashed #273449",
              color: "#64748b", borderRadius: 10, padding: 10, fontSize: "0.82rem",
              cursor: "pointer", margin: "4px 0 18px" }}>
            + Agregar producto
          </button>

          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3"
            style={{ borderTop: "1px solid #1e293b", paddingTop: 16 }}>
            <div className="d-flex flex-wrap" style={{ gap: 22 }}>
              {[
                { t: "Unidades", v: unidades, c: "#e2e8f0" },
                { t: "Si se vende todo", v: fmt(bruto), c: "#e2e8f0" },
                { t: "Para la fiesta", v: fmt(unidades * comision), c: "#94a3b8" },
                { t: "Te queda", v: fmt(neto), c: "#10b981" },
              ].map((x) => (
                <div key={x.t}>
                  <div style={{ ...label, marginBottom: 2 }}>{x.t}</div>
                  <div style={{ color: x.c, fontWeight: 700, fontSize: "1.05rem" }}>{x.v}</div>
                </div>
              ))}
            </div>
            <button type="submit" disabled={guardando}
              style={{ ...btnPrimario, padding: "9px 18px" }}>
              {guardando
                ? "Guardando..."
                : editando
                ? "Guardar cambios y ajustar stock"
                : "Crear evento y descontar de Central"}
            </button>
          </div>
        </form>
      </div>

      {/* ── Qué se vende en las fiestas ── */}
      {stats?.eventos > 0 && (
        <div style={{ ...card, marginBottom: 16 }}>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div className="d-flex flex-wrap" style={{ gap: 24 }}>
              {[
                { t: "Fiestas cerradas", v: stats.eventos, c: "#e2e8f0" },
                { t: "Vendidas", v: `${stats.vendidas} de ${stats.llevadas}`, c: "#e2e8f0" },
                { t: "Recaudado", v: fmt(stats.bruto), c: "#94a3b8" },
                { t: "Te quedó", v: fmt(stats.neto), c: "#10b981" },
              ].map((x) => (
                <div key={x.t}>
                  <div style={{ ...label, marginBottom: 2 }}>{x.t}</div>
                  <div style={{ color: x.c, fontWeight: 700, fontSize: "1.05rem" }}>{x.v}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setVerStats((v) => !v)} style={btn}>
              {verStats ? "Ocultar detalle" : "Qué se vende en fiestas"}
            </button>
          </div>

          {verStats && (
            <div style={{ marginTop: 18, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr>
                    {["Modelo", "Fiestas", "Llevadas", "Vendidas", "Salida", "Te dejó"].map((h, i) => (
                      <th key={h} style={{ ...label, padding: "8px 10px",
                        borderBottom: "1px solid #1e293b", textAlign: i ? "right" : "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.modelos.map((m) => {
                    // Verde si se vendió casi todo, rojo si volvió casi entero
                    const color = m.salida_pct >= 70 ? "#10b981"
                      : m.salida_pct >= 35 ? "#fbbf24" : "#f87171";
                    const celda = { padding: "9px 10px", borderBottom: "1px solid #1e293b",
                      color: "#cbd5e1", textAlign: "right" };
                    return (
                      <tr key={m.modelo}>
                        <td style={{ ...celda, textAlign: "left", color: "#e2e8f0" }}>
                          {m.modelo.trim()}
                          <div style={{ color: "#64748b", fontSize: "0.72rem" }}>
                            {fmt(m.precio_prom)} promedio
                          </div>
                        </td>
                        <td style={celda}>{m.eventos}</td>
                        <td style={celda}>{m.llevadas}</td>
                        <td style={celda}>{m.vendidas}</td>
                        <td style={{ ...celda, color, fontWeight: 700 }}>{m.salida_pct}%</td>
                        <td style={{ ...celda, color: "#10b981" }}>{fmt(m.neto)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p style={{ color: "#64748b", fontSize: "0.76rem", marginTop: 10 }}>
                <strong>Salida</strong> es cuánto de lo que llevaste se vendió. Cerca del 100%
                significa que te quedaste corto; muy bajo, que llevaste de más.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Listado ── */}
      {cargando && <div className="text-center py-4"><div className="spinner-border text-secondary" /></div>}

      {!cargando && eventos.length === 0 && (
        <div style={{ ...card, textAlign: "center", color: "#64748b" }}>
          Todavía no cargaste ningún evento.
        </div>
      )}

      {eventos.map((ev) => (
        <div key={ev.id} style={{
          ...card, marginBottom: 12, padding: "18px 22px",
          // Filo de color al costado: se distingue de un vistazo cuál sigue abierto
          borderLeft: `3px solid ${ev.estado === "abierto" ? "#10b981" : "#334155"}`,
        }}>
          <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
            <div style={{ minWidth: 0 }}>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <strong style={{ color: "#f1f5f9", fontSize: "1.02rem" }}>{ev.nombre}</strong>
                <span style={{
                  fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.1em",
                  fontWeight: 700, padding: "3px 9px", borderRadius: 999,
                  background: ev.estado === "abierto" ? "#065f4633" : "#1e293b",
                  color: ev.estado === "abierto" ? "#6ee7b7" : "#8296ad",
                }}>{ev.estado}</span>
              </div>
              <div style={{ color: "#64748b", fontSize: "0.78rem", marginTop: 4 }}>
                {new Date(ev.fecha).toLocaleDateString("es-AR")}
                {ev.lugar && ` · ${ev.lugar}`} · {ev.productos} modelos · {ev.unidades} unidades
              </div>
            </div>

            <div className="d-flex gap-2 flex-wrap align-items-start">
              {ev.estado === "abierto" && (
                <>
                  <button onClick={() => setQr({
                    url: `${CATALOGO}/evento/${ev.slug}`,
                    titulo: ev.nombre,
                    subtitulo: ev.lugar || "Catálogo de vapers",
                  })} style={btn}>QR</button>
                  <button onClick={() => copiarLink(ev.slug)} style={btn}>Copiar link</button>
                  <a href={`${CATALOGO}/evento/${ev.slug}`} target="_blank" rel="noreferrer"
                    style={{ ...btn, textDecoration: "none" }}>Abrir</a>
                  <button onClick={() => editar(ev.id)} style={btn}>Editar</button>
                  {/* Para imprimir y dejarle a la fiesta lo que se le entregó */}
                  <button onClick={() => abrirEntrega(ev.id)} style={btn}>Remito</button>
                  <button onClick={() => abrirCierre(ev.id)} style={btnPrimario}>Cerrar</button>
                </>
              )}

              {ev.estado === "cerrado" && (
                <>
                  <button onClick={() => abrirRecibo(ev.id)} style={btnPrimario}>Rendición</button>
                  <button onClick={() => abrirEntrega(ev.id)} style={btn}>Remito</button>
                  <button onClick={() => reabrir(ev)} style={btn}>Reabrir</button>
                </>
              )}
              <button onClick={() => eliminar(ev)} style={btnPeligro}>Eliminar</button>
            </div>
          </div>

          {ev.estado === "cerrado" && (
            <div className="d-flex flex-wrap" style={{
              gap: 24, marginTop: 14, paddingTop: 14, borderTop: "1px solid #1e293b" }}>
              {[
                { t: "Vendidas", v: ev.vendidas, c: "#e2e8f0" },
                { t: "Recaudado", v: fmt(ev.bruto), c: "#e2e8f0" },
                { t: "Para la fiesta", v: fmt(ev.comision), c: "#94a3b8" },
                // Cuando hubo unidades pagadas directo, lo que rinde la fiesta
                // y lo que te queda en total dejan de ser el mismo número.
                ...(Number(ev.directas) > 0
                  ? [
                      { t: "Rinde la fiesta", v: fmt(ev.a_rendir), c: "#e2e8f0" },
                      { t: "Directo a vos", v: fmt(ev.total_directo), c: "#38bdf8" },
                    ]
                  : []),
                { t: "Te quedó", v: fmt(ev.neto), c: "#10b981" },
              ].map((x) => (
                <div key={x.t}>
                  <div style={{ ...label, marginBottom: 2 }}>{x.t}</div>
                  <div style={{ color: x.c, fontWeight: 700 }}>{x.v}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {qr && <QrEvento {...qr} onClose={() => setQr(null)} />}

      {recibo && <ReciboEvento {...recibo} onClose={() => setRecibo(null)} />}
      {entrega && <EntregaEvento evento={entrega} onClose={() => setEntrega(null)} />}

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
              y las devoluciones se reingresan a Central. Si alguna la pagaron directo a vos
              (no la vendió la fiesta), cargala en <em>directo</em>: no paga comisión.
            </p>

            <div className="d-flex justify-content-end gap-2"
              style={{ ...label, marginBottom: 2, paddingRight: 90 }}>
              <span style={{ width: 82, textAlign: "center" }}>vuelven</span>
              <span style={{ width: 82, textAlign: "center" }}>directo</span>
            </div>

            {detalle.items.map((i) => {
              const vuelven = Number(devoluciones[i.id]) || 0;
              const directas = Number(devoluciones[`d${i.id}`]) || 0;
              const vendidas = i.cantidad_llevada - vuelven - directas;
              const sobra = vendidas < 0;
              return (
                <div key={i.id}
                  style={{ padding: "10px 0", borderBottom: "1px solid #1e293b" }}>
                  <div className="d-flex justify-content-between align-items-center gap-2">
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
                        className="ev-in" placeholder="0"
                        style={{ width: 82, textAlign: "right" }}
                        value={devoluciones[i.id]}
                        onChange={(e) => setDevoluciones({ ...devoluciones, [i.id]: e.target.value })} />
                      <input type="number" min="0" max={i.cantidad_llevada}
                        className="ev-in" placeholder="0"
                        style={{ width: 82, textAlign: "right" }}
                        value={devoluciones[`d${i.id}`] ?? ""}
                        onChange={(e) =>
                          setDevoluciones({ ...devoluciones, [`d${i.id}`]: e.target.value })} />
                      <span style={{ color: sobra ? "#f87171" : vendidas > 0 ? "#10b981" : "#475569",
                        fontSize: "0.78rem", minWidth: 82, textAlign: "right" }}>
                        vende {vendidas}
                      </span>
                    </div>
                  </div>

                  {/* El precio de la venta directa puede no ser el del catálogo:
                      suele ser a un compañero y a otro valor. */}
                  {directas > 0 && (
                    <div className="d-flex justify-content-end align-items-center gap-2 mt-2">
                      <span style={{ color: "#64748b", fontSize: "0.74rem" }}>
                        ¿A cuánto {directas === 1 ? "la" : "las"} pagaron?
                      </span>
                      <input type="number" min="0" className="ev-in"
                        placeholder={String(Math.round(Number(i.precio)))}
                        style={{ width: 110, textAlign: "right" }}
                        value={devoluciones[`p${i.id}`] ?? ""}
                        onChange={(e) =>
                          setDevoluciones({ ...devoluciones, [`p${i.id}`]: e.target.value })} />
                      <span style={{ color: "#475569", fontSize: "0.74rem", minWidth: 54, textAlign: "right" }}>
                        c/u
                      </span>
                    </div>
                  )}

                  {sobra && (
                    <div className="ev-hint pasado">
                      Entre devueltas y pagadas directo suman más de las {i.cantidad_llevada} que se llevaron.
                    </div>
                  )}
                </div>
              );
            })}

            <div className="d-flex justify-content-between align-items-center mt-3 pt-3"
              style={{ borderTop: "1px solid #1e293b" }}>
              <div style={{ color: "#94a3b8", fontSize: "0.82rem" }}>
                {resumenCierre.vendidas} vendidas por la fiesta · {fmt(resumenCierre.bruto)} ·{" "}
                {fmt(resumenCierre.comision)} de comisión
                <div style={{ color: "#e2e8f0" }}>
                  Te rinde <strong>{fmt(resumenCierre.aRendir)}</strong>
                </div>
                {resumenCierre.directas > 0 && (
                  <div style={{ color: "#64748b" }}>
                    + {resumenCierre.directas} pagada{resumenCierre.directas === 1 ? "" : "s"} directo
                    a vos · {fmt(resumenCierre.directo)}
                  </div>
                )}
                <div style={{ color: "#10b981", fontWeight: 700, fontSize: "0.95rem" }}>
                  {fmt(resumenCierre.neto)} para vos
                </div>
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
