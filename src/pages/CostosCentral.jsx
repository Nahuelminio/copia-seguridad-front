import React, { useEffect, useState, useCallback } from "react";
import axios from "../utils/axiosInstance";

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

const fmt = (n) =>
  Number(n).toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

const fmtPct = (n) => (n != null ? `${n > 0 ? "+" : ""}${n.toFixed(1)}%` : "—");

function MargenBadge({ pct, teorico }) {
  if (pct == null) return <span style={{ color: "#475569", fontSize: "0.78rem" }}>sin costo</span>;
  const color = pct >= 30 ? "#10b981" : pct >= 10 ? "#f59e0b" : "#f87171";
  return (
    <span
      title={teorico
        ? "Todavía no se vendió: es el margen teórico sobre el precio de lista"
        : "Margen real de lo vendido en el período, en todos los canales"}
      style={{
        background: `${color}18`,
        color,
        border: `1px solid ${color}40`,
        borderRadius: 6,
        padding: "2px 8px",
        fontSize: "0.78rem",
        fontWeight: 700,
        opacity: teorico ? 0.55 : 1,
      }}
    >
      {fmtPct(pct)}{teorico && "*"}
    </span>
  );
}

const fmtUsd = (n) => (n != null ? `USD ${Number(n).toLocaleString("es-AR", { maximumFractionDigits: 2 })}` : "—");

/**
 * Lista de costos por modelo. El costo en pesos se mueve con el dólar de cada
 * compra, así que se muestra el de la última reposición con el rango histórico
 * al lado; el USD es lo que cobra el proveedor y debería quedarse quieto.
 */
function ListaCostosModal({ onClose }) {
  const [lista, setLista] = useState(null);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState("");
  const [editando, setEditando] = useState(null);   // producto_id
  const [usd, setUsd] = useState("");
  const [modoUsd, setModoUsd] = useState("faltantes");
  const [guardando, setGuardando] = useState(false);
  const [angosto, setAngosto] = useState(window.innerWidth < 700);

  useEffect(() => {
    const onResize = () => setAngosto(window.innerWidth < 700);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const cargar = useCallback(async () => {
    try {
      const res = await axios.get("/costos-central/lista");
      setLista(res.data);
    } catch (e) {
      setError(e.response?.data?.error || "No se pudo cargar la lista");
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const guardarUsd = async (productoId) => {
    if (!Number(usd) || Number(usd) <= 0) { setError("Poné un USD mayor a cero"); return; }
    setGuardando(true);
    setError("");
    try {
      await axios.patch(`/costos-central/producto/${productoId}/usd`, {
        precio_costo_usd: Number(usd),
        modo: modoUsd,
      });
      setEditando(null);
      setUsd("");
      cargar();
    } catch (e) {
      setError(e.response?.data?.error || "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  };

  const visibles = (lista || []).filter(x =>
    x.modelo.toLowerCase().includes(filtro.trim().toLowerCase()));

  const th = { ...label, padding: "8px 10px", borderBottom: "1px solid #1e293b", whiteSpace: "nowrap" };
  const td = { padding: "10px", borderBottom: "1px solid #1e293b", color: "#e2e8f0", verticalAlign: "middle" };

  // En celular la tabla parte los nombres en cuatro líneas y manda dos columnas
  // fuera de pantalla, así que ahí va como lista de tarjetas.
  const editorUsd = (x) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
      <input type="number" step="0.01" min="0" placeholder="10" autoFocus
        className="form-control form-control-sm"
        style={{ background: "#0f172a", border: "1px solid #334155", color: "#e2e8f0", borderRadius: 6, width: 145, textAlign: "right" }}
        value={usd} onChange={e => setUsd(e.target.value)} />
      <select className="form-select form-select-sm"
        style={{ background: "#0f172a", border: "1px solid #334155", color: "#94a3b8", borderRadius: 6, width: 145, fontSize: "0.74rem" }}
        value={modoUsd} onChange={e => setModoUsd(e.target.value)}>
        <option value="faltantes">Solo las vacías</option>
        <option value="todas">Todas</option>
      </select>
      <div style={{ display: "flex", gap: 6 }}>
        <button disabled={guardando} onClick={() => guardarUsd(x.producto_id)}
          style={{ background: "#065f46", border: "1px solid #10b981", color: "#6ee7b7", borderRadius: 6, padding: "3px 10px", fontSize: "0.75rem", cursor: "pointer" }}>
          {guardando ? "..." : "Guardar"}
        </button>
        <button onClick={() => { setEditando(null); setUsd(""); }}
          style={{ background: "transparent", border: "1px solid #334155", color: "#64748b", borderRadius: 6, padding: "3px 10px", fontSize: "0.75rem", cursor: "pointer" }}>
          Cancelar
        </button>
      </div>
    </div>
  );

  const botonUsd = (x) => {
    const usdVaria = x.usd_min != null && Number(x.usd_min) !== Number(x.usd_max);
    return (
      <button
        onClick={() => { setEditando(x.producto_id); setUsd(x.usd_ultimo ?? ""); setModoUsd("faltantes"); }}
        title="Cargar o corregir el costo en USD"
        style={{ background: "transparent", border: "1px dashed #334155", borderRadius: 6, padding: "3px 8px", cursor: "pointer", whiteSpace: "nowrap", color: x.usd_ultimo != null ? "#38bdf8" : "#475569", fontWeight: x.usd_ultimo != null ? 700 : 400 }}>
        {x.usd_ultimo != null ? fmtUsd(x.usd_ultimo) : "cargar"}
        {usdVaria && (
          <div style={{ color: "#f59e0b", fontSize: "0.68rem", fontWeight: 400 }}>
            varió {fmtUsd(x.usd_min)}–{fmtUsd(x.usd_max)}
          </div>
        )}
      </button>
    );
  };

  const subtitulo = (x) =>
    `${x.sabores} sabores${Number(x.sin_costo) > 0 ? ` · ${x.sin_costo} compras sin costo` : ""}`;

  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 1050, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ ...card, width: "100%", maxWidth: 940, maxHeight: "88vh", display: "flex", flexDirection: "column", padding: 0 }}>

        <div style={{ padding: "18px 22px", borderBottom: "1px solid #1e293b", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: "1.05rem" }}>Lista de costos por modelo</div>
            <div style={{ color: "#64748b", fontSize: "0.78rem" }}>
              Costo de la última compra, con el rango histórico al lado
            </div>
          </div>
          <button onClick={onClose}
            style={{ background: "#0f172a", border: "1px solid #1e293b", color: "#94a3b8", borderRadius: 8, padding: "6px 14px", cursor: "pointer" }}>
            Cerrar
          </button>
        </div>

        <div style={{ padding: "12px 22px", borderBottom: "1px solid #1e293b" }}>
          <input type="text" className="form-control form-control-sm" placeholder="Buscar modelo... (ej: ice king)"
            style={{ background: "#0f172a", border: "1px solid #1e293b", color: "#e2e8f0", borderRadius: 8 }}
            value={filtro} onChange={e => setFiltro(e.target.value)} autoFocus />
        </div>

        {error && <div className="alert alert-danger m-3 mb-0 py-2" style={{ fontSize: "0.85rem" }}>{error}</div>}

        <div style={{ overflow: "auto", flex: 1 }}>
          {!lista && !error && (
            <div className="text-center py-5"><div className="spinner-border text-secondary" role="status" /></div>
          )}

          {lista && visibles.length === 0 && (
            <div style={{ color: "#64748b", textAlign: "center", padding: "40px 0" }}>
              {filtro ? "Ningún modelo coincide" : "No hay reposiciones cargadas en la Central"}
            </div>
          )}

          {visibles.length > 0 && (
            angosto ? (
              <div>
                {visibles.map(x => {
                  const varia = x.costo_min != null && Number(x.costo_min) !== Number(x.costo_max);
                  return (
                    <div key={x.producto_id} style={{ padding: "14px 16px", borderBottom: "1px solid #1e293b" }}>
                      <div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: "0.92rem" }}>{x.modelo.trim()}</div>
                      <div style={{ color: "#64748b", fontSize: "0.74rem", marginBottom: 10 }}>{subtitulo(x)}</div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
                        <div>
                          <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: "1.05rem" }}>
                            {x.costo_ultimo != null ? fmt(x.costo_ultimo) : <span style={{ color: "#475569", fontWeight: 400, fontSize: "0.85rem" }}>sin costo</span>}
                          </div>
                          <div style={{ color: "#64748b", fontSize: "0.72rem" }}>
                            {x.costo_ultimo != null && `${varia ? `${fmt(x.costo_min)} – ${fmt(x.costo_max)}` : "sin variación"} · `}
                            {x.unidades} unid.
                          </div>
                        </div>
                        {editando === x.producto_id ? editorUsd(x) : botonUsd(x)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.86rem" }}>
              <thead style={{ position: "sticky", top: 0, background: "#111827" }}>
                <tr>
                  <th style={th}>Modelo</th>
                  {/* Ancho fijo: el editor inline es más ancho que el valor y
                      sin esto se desborda sobre la columna del modelo. */}
                  <th style={{ ...th, textAlign: "right", width: 165, minWidth: 165 }}>USD</th>
                  <th style={{ ...th, textAlign: "right" }}>Costo $</th>
                  <th style={{ ...th, textAlign: "right" }}>Rango $</th>
                  <th style={{ ...th, textAlign: "right" }}>Unid.</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map(x => {
                  const varia = x.costo_min != null && Number(x.costo_min) !== Number(x.costo_max);
                  return (
                    <tr key={x.producto_id}>
                      <td style={td}>
                        <div style={{ fontWeight: 600 }}>{x.modelo.trim()}</div>
                        <div style={{ color: "#64748b", fontSize: "0.74rem" }}>{subtitulo(x)}</div>
                      </td>
                      <td style={{ ...td, textAlign: "right" }}>
                        {editando === x.producto_id ? editorUsd(x) : botonUsd(x)}
                      </td>
                      <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>
                        {x.costo_ultimo != null ? fmt(x.costo_ultimo) : <span style={{ color: "#475569", fontWeight: 400 }}>sin costo</span>}
                      </td>
                      <td style={{ ...td, textAlign: "right", color: "#64748b", fontSize: "0.78rem" }}>
                        {varia ? `${fmt(x.costo_min)} – ${fmt(x.costo_max)}` : "—"}
                      </td>
                      <td style={{ ...td, textAlign: "right", color: "#94a3b8" }}>{x.unidades}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            )
          )}
        </div>

        <div style={{ padding: "10px 22px", borderTop: "1px solid #1e293b", color: "#64748b", fontSize: "0.75rem" }}>
          El USD se guarda en cada reposición nueva. Tocá el valor para cargarlo o corregirlo en las compras ya hechas.
        </div>
      </div>
    </div>
  );
}

export default function CostosCentral() {
  const hoy = new Date();
  const primerDiaMes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-01`;
  const hoyStr = hoy.toISOString().slice(0, 10);

  const [desde, setDesde] = useState(primerDiaMes);
  const [hasta, setHasta] = useState(hoyStr);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [verLista, setVerLista] = useState(false);
  const [orden, setOrden] = useState("costo_total"); // costo_total | margen_pct | unidades_repuestas

  const cargar = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get("/costos-central", { params: { desde, hasta } });
      setData(res.data);
    } catch (e) {
      console.error(e);
      setError("Error al cargar los datos.");
    } finally {
      setLoading(false);
    }
  }, [desde, hasta]);

  useEffect(() => { cargar(); }, [cargar]);

  // --- Edición del costo ---
  // El costo vive en cada reposición, no en el producto. Por eso hay dos modos:
  // completar solo las que quedaron sin costo, o corregir todas las del período.
  const [editando, setEditando] = useState(null);   // gusto_id
  const [nuevoCosto, setNuevoCosto] = useState("");
  const [modo, setModo] = useState("faltantes");
  const [guardando, setGuardando] = useState(false);
  const [avisoEdicion, setAvisoEdicion] = useState(null);

  const abrirEdicion = (p) => {
    setEditando(p.gusto_id);
    setNuevoCosto(p.costo_prom ? String(Math.round(p.costo_prom)) : "");
    // Si le falta costo a alguna reposición, lo más probable es que quiera completarlas
    setModo(p.repos_con_costo < p.repos_total ? "faltantes" : "todas");
    setAvisoEdicion(null);
  };

  const guardarCosto = async (p) => {
    const costo = Number(nuevoCosto);
    if (!costo || costo <= 0) {
      setAvisoEdicion({ tipo: "error", texto: "Poné un costo mayor a cero" });
      return;
    }
    setGuardando(true);
    try {
      const res = await axios.patch(`/costos-central/${p.gusto_id}`, {
        precio_costo: costo,
        modo,
        desde,
        hasta,
      });
      setEditando(null);
      setAvisoEdicion({
        tipo: "ok",
        texto: `${p.gusto}: ${res.data.actualizadas} reposición${res.data.actualizadas !== 1 ? "es" : ""} actualizada${res.data.actualizadas !== 1 ? "s" : ""}`,
      });
      await cargar();
    } catch (e) {
      setAvisoEdicion({
        tipo: "error",
        texto: e.response?.data?.error || "No se pudo guardar el costo",
      });
    } finally {
      setGuardando(false);
    }
  };

  // --- Edición del precio de venta ---
  const [editandoPrecio, setEditandoPrecio] = useState(null);   // gusto_id
  const [nuevoPrecio, setNuevoPrecio] = useState("");
  const [aTodas, setATodas] = useState(false);

  const abrirEdicionPrecio = (p) => {
    setEditandoPrecio(p.gusto_id);
    setNuevoPrecio(p.precio_venta ? String(Math.round(p.precio_venta)) : "");
    setATodas(false);
    setAvisoEdicion(null);
  };

  const guardarPrecio = async (p) => {
    const precio = Number(nuevoPrecio);
    if (!precio || precio <= 0) {
      setAvisoEdicion({ tipo: "error", texto: "Poné un precio mayor a cero" });
      return;
    }
    setGuardando(true);
    try {
      const res = await axios.patch(`/costos-central/${p.gusto_id}/precio`, {
        precio,
        todas_las_sucursales: aTodas,
      });
      setEditandoPrecio(null);
      setAvisoEdicion({
        tipo: "ok",
        texto: res.data.alcance === "todas"
          ? `${p.gusto}: precio actualizado en Central y ${res.data.actualizadas} sucursal${res.data.actualizadas !== 1 ? "es" : ""}`
          : `${p.gusto}: precio actualizado en Central`,
      });
      await cargar();
    } catch (e) {
      setAvisoEdicion({
        tipo: "error",
        texto: e.response?.data?.error || "No se pudo guardar el precio",
      });
    } finally {
      setGuardando(false);
    }
  };

  const productosFiltrados = data?.productos
    ? [...data.productos]
        .filter(p => {
          if (!busqueda) return true;
          const q = busqueda.toLowerCase();
          return p.producto.toLowerCase().includes(q) || p.gusto.toLowerCase().includes(q);
        })
        .sort((a, b) => {
          if (orden === "margen_pct")
            return (b.margen_real_pct ?? b.margen_pct ?? -999) - (a.margen_real_pct ?? a.margen_pct ?? -999);
          if (orden === "unidades_repuestas") return b.unidades_repuestas - a.unidades_repuestas;
          return b.costo_total - a.costo_total;
        })
    : [];

  return (
    <div className="container-fluid mt-4 px-3 mb-5">
      {/* Header */}
      <div className="mb-4 d-flex justify-content-between align-items-start gap-3 flex-wrap">
        <div>
          <h4 style={{ color: "#f1f5f9", fontWeight: 700, marginBottom: 4 }}>
            Costos — Central
          </h4>
          <p style={{ color: "#64748b", fontSize: "0.85rem", margin: 0 }}>
            Análisis de costos de reposición vs. precio de venta. Solo muestra reposiciones con precio de costo cargado.
          </p>
        </div>
        <button onClick={() => setVerLista(true)}
          style={{ background: "#0f172a", border: "1px solid #334155", color: "#38bdf8", borderRadius: 8, padding: "8px 16px", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", whiteSpace: "nowrap" }}>
          Lista de costos
        </button>
      </div>

      {verLista && <ListaCostosModal onClose={() => setVerLista(false)} />}

      {/* Filtros */}
      <div style={card} className="mb-4">
        <div className="row g-3 align-items-end">
          <div className="col-6 col-md-3">
            <p style={label} className="mb-1">Desde</p>
            <input type="date" className="form-control form-control-sm"
              style={{ background: "#0f172a", border: "1px solid #1e293b", color: "#e2e8f0", borderRadius: 8 }}
              value={desde} onChange={e => setDesde(e.target.value)} />
          </div>
          <div className="col-6 col-md-3">
            <p style={label} className="mb-1">Hasta</p>
            <input type="date" className="form-control form-control-sm"
              style={{ background: "#0f172a", border: "1px solid #1e293b", color: "#e2e8f0", borderRadius: 8 }}
              value={hasta} onChange={e => setHasta(e.target.value)} />
          </div>
          <div className="col-12 col-md-4">
            <p style={label} className="mb-1">Buscar producto</p>
            <input type="text" className="form-control form-control-sm" placeholder="Ej: Ignite, mango..."
              style={{ background: "#0f172a", border: "1px solid #1e293b", color: "#e2e8f0", borderRadius: 8 }}
              value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
          <div className="col-12 col-md-2">
            <p style={label} className="mb-1">Ordenar por</p>
            <select className="form-select form-select-sm"
              style={{ background: "#0f172a", border: "1px solid #1e293b", color: "#e2e8f0", borderRadius: 8 }}
              value={orden} onChange={e => setOrden(e.target.value)}>
              <option value="costo_total">Mayor costo</option>
              <option value="margen_pct">Mayor margen</option>
              <option value="unidades_repuestas">Más unidades</option>
            </select>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-secondary" role="status" />
          <p style={{ color: "#64748b", marginTop: 12 }}>Cargando...</p>
        </div>
      )}

      {error && !loading && <div className="alert alert-danger">{error}</div>}

      {!loading && !error && data && (
        <>
          {/* Tarjetas resumen */}
          <div className="row g-3 mb-4">
            {[
              { label: "Invertido en reposición", value: fmt(data.totales.costo_total), color: "#f87171" },
              {
                label: "Facturado (período)",
                value: fmt(data.totales.total_facturado ?? data.totales.total_vendido),
                color: "#10b981",
                // Los tres canales por separado, que es lo que no se veía antes
                detalle: [
                  data.totales.total_vendido > 0 && `${fmt(data.totales.total_vendido)} Central`,
                  data.totales.total_mayorista > 0 && `${fmt(data.totales.total_mayorista)} mayorista`,
                  data.totales.total_sucursales > 0 && `${fmt(data.totales.total_sucursales)} sucursales`,
                  // De eventos entra el neto: la comisión se la queda la fiesta
                  data.totales.total_eventos > 0 && `${fmt(data.totales.total_eventos)} eventos`,
                ].filter(Boolean).join(" · ") || null,
              },
              {
                label: "Costo de lo vendido",
                value: fmt(data.totales.costo_vendido ?? 0),
                color: "#f59e0b",
                detalle: data.totales.unidades_totales
                  ? `${data.totales.unidades_totales} unidades vendidas`
                    + (data.totales.comision_eventos > 0
                      ? ` · ${fmt(data.totales.comision_eventos)} de comisión en fiestas`
                      : "")
                  : null,
              },
              {
                // El margen que de verdad dejó lo vendido, no lo comprado
                label: "Ganancia real",
                value: fmt(data.totales.ganancia_real ?? 0),
                color: (data.totales.ganancia_real ?? 0) >= 0 ? "#10b981" : "#f87171",
                detalle: [
                  `margen ${fmtPct(data.totales.margen_real_pct)}`,
                  data.totales.facturado_sin_costo > 0
                    ? `${fmt(data.totales.facturado_sin_costo)} sin costo cargado`
                    : null,
                ].filter(Boolean).join(" · "),
              },
            ].map(({ label: l, value, color, detalle }) => (
              <div className="col-6 col-md-3" key={l}>
                <div style={{ ...card, borderColor: `${color}30` }}>
                  <p style={{ ...label, marginBottom: 4 }}>{l}</p>
                  <p style={{ color, fontWeight: 700, fontSize: "1.3rem", margin: 0 }}>{value}</p>
                  {detalle && (
                    <p style={{ color: "#64748b", fontSize: "0.68rem", margin: "4px 0 0" }}>{detalle}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Tabla de productos */}
          {productosFiltrados.length === 0 ? (
            <div style={card}>
              <p style={{ color: "#475569", margin: 0 }}>
                {busqueda ? "Sin resultados para esa búsqueda." : "No hay reposiciones con precio de costo en ese período."}
              </p>
            </div>
          ) : (
            <div style={{ ...card, padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table className="table table-dark mb-0" style={{ fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ borderColor: "#1e293b", color: "#64748b", fontSize: "0.72rem", textTransform: "uppercase" }}>
                      <th style={{ padding: "12px 16px", fontWeight: 700 }}>Producto / Gusto</th>
                      <th style={{ padding: "12px 16px", textAlign: "right" }}>Repuesto</th>
                      <th style={{ padding: "12px 16px", textAlign: "right" }} title="Promedio ponderado: suma(cantidad×precio) / suma(cantidad con costo)">
                        Costo prom. ⓘ
                      </th>
                      <th style={{ padding: "12px 16px", textAlign: "right" }}>Costo total</th>
                      <th style={{ padding: "12px 16px", textAlign: "right" }}>Precio venta</th>
                      <th style={{ padding: "12px 16px", textAlign: "right" }}>Margen</th>
                      <th style={{ padding: "12px 16px", textAlign: "right" }}>Vendido</th>
                      <th style={{ padding: "12px 16px", textAlign: "right" }}>Stock actual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productosFiltrados.map((p) => (
                      <tr key={p.gusto_id} style={{ borderColor: "#1e293b" }}>
                        <td style={{ padding: "10px 16px" }}>
                          <span style={{ color: "#f1f5f9", fontWeight: 600 }}>{p.producto}</span>
                          <span style={{ color: "#64748b", marginLeft: 6 }}>{p.gusto}</span>
                          {p.repos_con_costo < p.repos_total && (
                            <span style={{ marginLeft: 8, fontSize: "0.7rem", color: "#f59e0b" }}>
                              ({p.repos_con_costo}/{p.repos_total} con costo)
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right", color: "#e2e8f0" }}>
                          {p.unidades_repuestas} u.
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right" }}>
                          {editando === p.gusto_id ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                              <input
                                type="number"
                                autoFocus
                                value={nuevoCosto}
                                onChange={(e) => setNuevoCosto(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") guardarCosto(p);
                                  if (e.key === "Escape") setEditando(null);
                                }}
                                placeholder="Costo"
                                style={inputCosto}
                              />
                              <div style={{ display: "flex", gap: 4 }}>
                                {[
                                  ["faltantes", `Completar (${p.repos_total - p.repos_con_costo})`],
                                  ["todas", `Todas (${p.repos_total})`],
                                ].map(([v, txt]) => (
                                  <button
                                    key={v}
                                    onClick={() => setModo(v)}
                                    disabled={v === "faltantes" && p.repos_con_costo >= p.repos_total}
                                    style={modo === v ? chipModoActivo : chipModo}
                                  >
                                    {txt}
                                  </button>
                                ))}
                              </div>
                              <div style={{ display: "flex", gap: 4 }}>
                                <button onClick={() => guardarCosto(p)} disabled={guardando} style={btnGuardar}>
                                  {guardando ? "…" : "Guardar"}
                                </button>
                                <button onClick={() => setEditando(null)} disabled={guardando} style={btnCancelar}>
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => abrirEdicion(p)}
                              title="Tocá para corregir o completar el costo"
                              style={celdaCosto}
                            >
                              {p.costo_prom ? (
                                <>
                                  <span style={{ color: "#e2e8f0" }}>{fmt(p.costo_prom)}</span>
                                  {p.costo_prom_parcial && (
                                    <span title={`Solo ${p.unidades_con_costo} de ${p.unidades_repuestas} u. tienen costo cargado`}
                                      style={{ color: "#f59e0b", fontSize: "0.72rem", marginLeft: 4 }}>~</span>
                                  )}
                                </>
                              ) : (
                                <span style={{ color: "#f59e0b" }}>cargar</span>
                              )}
                            </button>
                          )}
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right", color: "#f87171", fontWeight: 600 }}>
                          {p.costo_total > 0 ? fmt(p.costo_total) : "—"}
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right", color: "#e2e8f0" }}>
                          {editandoPrecio === p.gusto_id ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                              <input
                                type="number"
                                autoFocus
                                value={nuevoPrecio}
                                onChange={(e) => setNuevoPrecio(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") guardarPrecio(p);
                                  if (e.key === "Escape") setEditandoPrecio(null);
                                }}
                                placeholder="Precio"
                                style={inputCosto}
                              />
                              <button
                                onClick={() => setATodas((v) => !v)}
                                title="Aplicar el mismo precio en las sucursales que ya tienen este sabor"
                                style={aTodas ? chipModoActivo : chipModo}
                              >
                                {aTodas ? "Central + sucursales" : "Solo Central"}
                              </button>
                              <div style={{ display: "flex", gap: 4 }}>
                                <button onClick={() => guardarPrecio(p)} disabled={guardando} style={btnGuardar}>
                                  {guardando ? "…" : "Guardar"}
                                </button>
                                <button onClick={() => setEditandoPrecio(null)} disabled={guardando} style={btnCancelar}>
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => abrirEdicionPrecio(p)}
                              title="Tocá para cargar o corregir el precio de venta"
                              style={celdaCosto}
                            >
                              {p.precio_venta ? (
                                <span style={{ color: "#e2e8f0" }}>{fmt(p.precio_venta)}</span>
                              ) : (
                                <span style={{ color: "#f59e0b" }}>cargar</span>
                              )}
                            </button>
                          )}
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right" }}>
                          {/* El margen que dejó lo vendido. Si todavía no se
                              vendió nada, se muestra el teórico del precio de lista. */}
                          <MargenBadge
                            pct={p.margen_real_pct ?? p.margen_pct}
                            teorico={p.margen_real_pct == null}
                          />
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right", color: "#10b981" }}>
                          {(p.unidades_totales ?? p.unidades_vendidas) > 0 ? (
                            <>
                              <div>
                                {p.unidades_totales ?? p.unidades_vendidas} u. /{" "}
                                {fmt(p.total_facturado ?? p.total_vendido)}
                              </div>
                              {(p.unidades_mayorista > 0 || p.unidades_sucursales > 0) && (
                                <div style={{ color: "#64748b", fontSize: "0.7rem", marginTop: 2 }}>
                                  {[
                                    p.unidades_vendidas > 0 && `${p.unidades_vendidas} Central`,
                                    p.unidades_mayorista > 0 && `${p.unidades_mayorista} mayorista`,
                                    p.unidades_sucursales > 0 && `${p.unidades_sucursales} sucursales`,
                                  ].filter(Boolean).join(" · ")}
                                  {p.tc_estimado && (
                                    <span
                                      title="Algún pedido mayorista no tenía tipo de cambio: se usó el del pedido más cercano"
                                      style={{ color: "#f59e0b", marginLeft: 4 }}
                                    >~</span>
                                  )}
                                </div>
                              )}
                            </>
                          ) : <span style={{ color: "#475569" }}>—</span>}
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right" }}>
                          <span style={{ color: p.stock_actual <= 0 ? "#f87171" : "#94a3b8" }}>
                            {p.stock_actual}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Totals row */}
                  <tfoot>
                    <tr style={{ borderTop: "2px solid #1e293b", background: "#0f172a" }}>
                      <td style={{ padding: "10px 16px", color: "#94a3b8", fontWeight: 700 }}>
                        {productosFiltrados.length} producto{productosFiltrados.length !== 1 ? "s" : ""}
                      </td>
                      <td style={{ padding: "10px 16px", textAlign: "right", color: "#e2e8f0" }}>
                        {productosFiltrados.reduce((s, p) => s + p.unidades_repuestas, 0)} u.
                      </td>
                      <td />
                      <td style={{ padding: "10px 16px", textAlign: "right", color: "#f87171", fontWeight: 700 }}>
                        {fmt(productosFiltrados.reduce((s, p) => s + p.costo_total, 0))}
                      </td>
                      <td />
                      <td />
                      <td style={{ padding: "10px 16px", textAlign: "right", color: "#10b981", fontWeight: 700 }}>
                        {fmt(productosFiltrados.reduce((s, p) => s + (p.total_facturado ?? p.total_vendido), 0))}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {avisoEdicion && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            padding: "10px 18px",
            borderRadius: 8,
            fontSize: "0.86rem",
            background: avisoEdicion.tipo === "ok" ? "rgba(16,185,129,0.15)" : "rgba(248,113,113,0.15)",
            border: `1px solid ${avisoEdicion.tipo === "ok" ? "rgba(16,185,129,0.5)" : "rgba(248,113,113,0.5)"}`,
            color: avisoEdicion.tipo === "ok" ? "#6ee7a0" : "#fca5a5",
            cursor: "pointer",
          }}
          onClick={() => setAvisoEdicion(null)}
        >
          {avisoEdicion.texto}
        </div>
      )}
    </div>
  );
}

// La celda del costo es un botón: se ve como texto hasta que pasás por encima
const celdaCosto = {
  background: "transparent",
  border: "1px dashed transparent",
  borderRadius: 6,
  padding: "2px 8px",
  cursor: "pointer",
  font: "inherit",
};

const inputCosto = {
  background: "#0f172a",
  border: "1px solid #334155",
  color: "#fff",
  borderRadius: 6,
  padding: "4px 8px",
  width: 110,
  textAlign: "right",
  fontSize: "0.85rem",
};

const chipModo = {
  background: "transparent",
  border: "1px solid #334155",
  color: "#94a3b8",
  borderRadius: 20,
  padding: "2px 9px",
  fontSize: "0.7rem",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const chipModoActivo = {
  ...chipModo,
  background: "rgba(59,130,246,0.18)",
  border: "1px solid rgba(59,130,246,0.6)",
  color: "#93c5fd",
};

const btnGuardar = {
  background: "#2563eb",
  border: "none",
  color: "#fff",
  borderRadius: 6,
  padding: "4px 12px",
  fontSize: "0.76rem",
  fontWeight: 600,
  cursor: "pointer",
};

const btnCancelar = {
  background: "transparent",
  border: "1px solid #334155",
  color: "#94a3b8",
  borderRadius: 6,
  padding: "4px 10px",
  fontSize: "0.76rem",
  cursor: "pointer",
};
