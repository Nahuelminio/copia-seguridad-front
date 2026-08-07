import { useState, useEffect, useCallback } from "react";
import axios from "../utils/axiosInstance";
import { jwtDecode } from "jwt-decode";

const getDecoded = () => { try { return jwtDecode(localStorage.getItem("token")); } catch { return null; } };
const fmt = (n) => Math.round(Number(n)).toLocaleString("es-AR");
// Los unitarios chicos (un carbón, un papel) se pierden si se redondean a peso
const fmtUnit = (n) => `$${Number(n).toLocaleString("es-AR", { maximumFractionDigits: n < 100 ? 2 : 0 })}`;
const fmtPaq = (n) => { const v = Number(n); return v % 1 === 0 ? String(v) : v.toFixed(2); };
const STOCK_MIN_TABACO = 1 / 3;
const STOCK_MIN_CARBONES = 4;
const STOCK_MIN_PAPELES = 4;

const StockBar = ({ value, max, color = "#10b981" }) => {
  const pct = Math.min((value / max) * 100, 100);
  const bg = pct < 20 ? "#ef4444" : pct < 50 ? "#f59e0b" : color;
  return (
    <div style={{ background: "#2a2a2a", borderRadius: 8, height: 5, overflow: "hidden", marginTop: 5 }}>
      <div style={{ width: `${pct}%`, background: bg, height: "100%", transition: "width .4s" }} />
    </div>
  );
};

// Tabaco, carbón y aluminio se consumen en cada shisha: entran como insumo y
// suman stock. Lo demás es capital y sólo suma al techo del recupero.
const TIPOS_RENGLON = [
  { v: "tabaco",   t: "Tabaco",   u: "paquetes", u1: "paquete", tipo: "insumo" },
  { v: "carbones", t: "Carbón",   u: "unidades", u1: "carbón",  tipo: "insumo" },
  { v: "papeles",  t: "Aluminio", u: "papeles",  u1: "papel",   tipo: "insumo" },
  { v: "otro",     t: "Otro",     u: null,       u1: null,      tipo: "capital" },
];
const RENGLON_VACIO = { insumo: "tabaco", sabor_id: "", cantidad: "", monto: "", descripcion: "" };

const Modal = ({ titulo, children, onClose }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
    <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: "20px 20px 0 0", padding: 24, width: "100%", maxWidth: 480 }}>
      <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 16 }}>{titulo}</div>
      {children}
      <button style={{ ...s.btnSmall, width: "100%", marginTop: 12, color: "#666" }} onClick={onClose}>Cancelar</button>
    </div>
  </div>
);

export default function ShishaPage() {
  const esAdmin = getDecoded()?.rol === "admin";

  const [config, setConfig] = useState(null);
  const [sabores, setSabores] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [totales, setTotales] = useState({ recaudado: 0, costos: 0, ganancia: 0 });
  const [ranking, setRanking] = useState({});
  const [resumen, setResumen] = useState(null);
  // Sin fecha por default: el historial abre mostrando todo. El backend ignora
  // el filtro cuando vienen vacías.
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [cargando, setCargando] = useState(false);
  const [msg, setMsg] = useState(null);
  const [saborSeleccionado, setSaborSeleccionado] = useState("");
  const [nota, setNota] = useState("");
  const [tab, setTab] = useState("vender");
  const [confirmando, setConfirmando] = useState(null); // { tipo }
  const [anulando, setAnulando] = useState(null); // venta a anular

  const [formInsumos, setFormInsumos] = useState({ carbones: "", papeles: "" });
  const [formConfig, setFormConfig] = useState({ precio_dolar: "", precio_nueva: "", precio_recarga: "" });
  const [editandoConfig, setEditandoConfig] = useState(false);
  const [nuevoSabor, setNuevoSabor] = useState("");
  const [stockSabor, setStockSabor] = useState({ id: "", paquetes: "" });
  const saborAjuste = sabores.find(x => String(x.id) === String(stockSabor.id));

  // Cuenta / Pagos Fagu
  const [cuenta, setCuenta] = useState(null);
  const [pagoForm, setPagoForm] = useState({ monto: "", metodo: "efectivo", fecha: new Date().toISOString().slice(0, 10), notas: "" });
  const [compraFecha, setCompraFecha] = useState(new Date().toISOString().slice(0, 10));
  const [compraItems, setCompraItems] = useState([{ ...RENGLON_VACIO }]);
  const [guardandoInversion, setGuardandoInversion] = useState(false);
  const [eliminandoInversion, setEliminandoInversion] = useState(null);
  const [guardandoPago, setGuardandoPago] = useState(false);
  const [eliminandoPago, setEliminandoPago] = useState(null);

  const cargarCuenta = useCallback(async () => {
    try {
      const res = await axios.get("/shisha/cuenta");
      setCuenta(res.data);
    } catch { /* endpoint puede no estar disponible aún */ }
  }, []);

  const registrarPago = async (e) => {
    e.preventDefault();
    if (!pagoForm.monto || Number(pagoForm.monto) <= 0) { flash("Ingresá un monto válido", "danger"); return; }
    setGuardandoPago(true);
    try {
      await axios.post("/shisha/cuenta/pago", { ...pagoForm, monto: Number(pagoForm.monto) });
      flash("Pago registrado", "success");
      setPagoForm({ monto: "", metodo: "efectivo", fecha: new Date().toISOString().slice(0, 10), notas: "" });
      cargarCuenta();
    } catch (e) {
      flash(e.response?.data?.error || "Error al registrar", "danger");
    } finally {
      setGuardandoPago(false);
    }
  };

  const eliminarPago = async (id) => {
    setEliminandoPago(id);
    try {
      await axios.delete(`/shisha/cuenta/pago/${id}`);
      cargarCuenta();
    } catch {
      flash("Error al eliminar pago", "danger");
    } finally {
      setEliminandoPago(null);
    }
  };

  const setItem = (idx, campo, valor) =>
    setCompraItems(items => items.map((it, i) => (i === idx ? { ...it, [campo]: valor } : it)));

  const agregarRenglon = () => setCompraItems(items => [...items, { ...RENGLON_VACIO }]);
  const quitarRenglon = (idx) => setCompraItems(items => items.filter((_, i) => i !== idx));

  const totalCompra = compraItems.reduce((a, it) => a + (Number(it.monto) || 0), 0);

  const registrarCompra = async (e) => {
    e.preventDefault();
    if (totalCompra <= 0) { flash("Cargá el monto de cada renglón", "danger"); return; }

    for (const [i, it] of compraItems.entries()) {
      const n = i + 1;
      if (!Number(it.monto)) { flash(`Renglón ${n}: falta el monto`, "danger"); return; }
      if (it.insumo !== "otro" && !Number(it.cantidad)) { flash(`Renglón ${n}: falta la cantidad`, "danger"); return; }
      if (it.insumo === "tabaco" && !it.sabor_id) { flash(`Renglón ${n}: elegí el sabor`, "danger"); return; }
      if (it.insumo === "otro" && !it.descripcion.trim()) { flash(`Renglón ${n}: poné qué compraste`, "danger"); return; }
    }

    setGuardandoInversion(true);
    try {
      await axios.post("/shisha/compra", {
        fecha: compraFecha,
        items: compraItems.map(it => ({
          insumo: it.insumo,
          sabor_id: it.sabor_id || null,
          cantidad: Number(it.cantidad) || null,
          monto: Number(it.monto),
          descripcion: it.descripcion.trim(),
        })),
      });
      flash("Compra cargada y stock actualizado", "success");
      setCompraItems([{ ...RENGLON_VACIO }]);
      cargarCuenta();
      cargarConfig();
      cargarSabores();
    } catch (e) {
      flash(e.response?.data?.error || "Error al registrar", "danger");
    } finally {
      setGuardandoInversion(false);
    }
  };

  const eliminarInversion = async (id) => {
    setEliminandoInversion(id);
    try {
      await axios.delete(`/shisha/inversion/${id}`);
      // Borrar una compra devuelve el stock que había sumado
      cargarCuenta();
      cargarConfig();
      cargarSabores();
    } catch {
      flash("Error al eliminar inversión", "danger");
    } finally {
      setEliminandoInversion(null);
    }
  };

  const cargarConfig = useCallback(async () => {
    const res = await axios.get("/shisha/config");
    setConfig(res.data);
    setFormConfig({ precio_dolar: res.data.precio_dolar, precio_nueva: res.data.precio_nueva, precio_recarga: res.data.precio_recarga });
  }, []);

  const cargarSabores = useCallback(async () => {
    const res = await axios.get("/shisha/sabores");
    setSabores(res.data);
  }, []);

  const cargarVentas = useCallback(async () => {
    const res = await axios.get("/shisha/ventas", { params: { desde, hasta } });
    setVentas(res.data.ventas);
    setTotales(res.data.totales);
    setRanking(res.data.ranking || {});
  }, [desde, hasta]);

  const cargarResumen = useCallback(async () => {
    const res = await axios.get("/shisha/resumen");
    setResumen(res.data);
  }, []);

  // La cuenta la piden los dos: la sucursal ve el avance del recupero y su
  // deuda, el admin además el detalle de compras y su ganancia.
  useEffect(() => { cargarConfig(); cargarSabores(); cargarResumen(); cargarCuenta(); }, [cargarConfig, cargarSabores, cargarResumen, cargarCuenta]);
  useEffect(() => { cargarVentas(); }, [cargarVentas]);

  const flash = (texto, tipo = "success") => {
    setMsg({ texto, tipo });
    setTimeout(() => setMsg(null), 3500);
  };

  const confirmarAlquiler = (tipo) => {
    if (!saborSeleccionado) return flash("Seleccioná un sabor", "warning");
    setConfirmando(tipo);
  };

  const registrarAlquiler = async () => {
    const tipo = confirmando;
    setConfirmando(null);
    setCargando(true);
    try {
      const res = await axios.post("/shisha/alquiler", { tipo, sabor_id: saborSeleccionado, nota: nota || null });
      flash(`${tipo === "nueva" ? "Nueva shisha" : "Recarga"} registrada — Ganancia: $${fmt(res.data.ganancia)}`);
      setSabores(res.data.sabores);
      setNota("");
      cargarConfig();
      cargarVentas();
      cargarResumen();
    } catch (e) {
      flash(e.response?.data?.error || "Error al registrar", "danger");
    }
    setCargando(false);
  };

  const anularVenta = async () => {
    if (!anulando) return;
    try {
      await axios.put(`/shisha/ventas/${anulando.id}/anular`);
      flash("Venta anulada y stock devuelto");
      setAnulando(null);
      cargarConfig();
      cargarSabores();
      cargarVentas();
      cargarResumen();
    } catch (e) {
      flash(e.response?.data?.error || "Error al anular", "danger");
    }
  };

  const cargarInsumos = async (e) => {
    e.preventDefault();
    // Un campo vacío significa "no lo conté": se manda el valor actual para no
    // pisar con cero lo que no se revisó.
    const val = (campo) =>
      formInsumos[campo] === "" ? Number(config[campo]) || 0 : Number(formInsumos[campo]);

    await axios.put("/shisha/insumos", {
      carbones: val("carbones"),
      papeles: val("papeles"),
      modo: "fijar",
    });
    setFormInsumos({ carbones: "", papeles: "" });
    flash("Stock corregido");
    cargarConfig();
  };

  const agregarSabor = async (e) => {
    e.preventDefault();
    if (!nuevoSabor.trim()) return;
    const res = await axios.post("/shisha/sabores", { nombre: nuevoSabor.trim() });
    setSabores(res.data);
    setNuevoSabor("");
    flash("Sabor agregado");
  };

  const cargarStockSabor = async (e) => {
    e.preventDefault();
    if (!stockSabor.id || stockSabor.paquetes === "") return;
    const res = await axios.put(`/shisha/sabores/${stockSabor.id}/stock`, {
      paquetes: Number(stockSabor.paquetes),
      modo: "fijar",
    });
    setSabores(res.data);
    setStockSabor({ id: "", paquetes: "" });
    flash("Stock corregido");
  };

  const toggleSabor = async (id) => {
    const res = await axios.put(`/shisha/sabores/${id}/toggle`);
    setSabores(res.data);
  };

  const guardarConfig = async (e) => {
    e.preventDefault();
    await axios.put("/shisha/config", { precio_dolar: Number(formConfig.precio_dolar), precio_nueva: Number(formConfig.precio_nueva), precio_recarga: Number(formConfig.precio_recarga) });
    setEditandoConfig(false);
    flash("Configuración guardada");
    cargarConfig();
  };

  if (!config) return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#555" }}>Cargando...</div>
    </div>
  );

  const saboresActivos = sabores.filter(x => x.activo);
  const costoEstimado = (4 / 3 + 0.4 + 0.13) * config.precio_dolar;
  const rankingOrdenado = Object.entries(ranking).sort((a, b) => b[1] - a[1]);
  const saborElegido = sabores.find(x => String(x.id) === String(saborSeleccionado));

  // Alertas de stock bajo
  const alertas = [
    ...saboresActivos.filter(x => x.stock_paquetes < STOCK_MIN_TABACO).map(x => `Tabaco ${x.nombre} agotado`),
    config.carbones < STOCK_MIN_CARBONES ? `Carbones bajos (${config.carbones} unidades)` : null,
    config.papeles < STOCK_MIN_PAPELES ? `Papel aluminio bajo (${config.papeles} unidades)` : null,
  ].filter(Boolean);

  // Comparación mes anterior
  const difGanancia = resumen ? Number(resumen.actual.ganancia) - Number(resumen.anterior.ganancia) : 0;

  return (
    <div style={s.page}>
      {/* HEADER */}
      <div style={s.header}>
        <div style={s.headerInner}>
          <div>
            <div style={s.headerTitle}>Shisha</div>
            <div style={s.headerSub}>Fagu Bar</div>
          </div>
          <div style={s.headerRight}>
            <div style={s.headerDolar}>USD ${Number(config.precio_dolar).toLocaleString()}</div>
            <div style={s.headerDolarLabel}>precio dólar</div>
          </div>
        </div>
      </div>

      {/* ALERTAS STOCK */}
      {alertas.length > 0 && (
        <div style={s.alertaStock}>
          <div style={s.alertaInner}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#fbbf24" }}>!</span>
            <div>{alertas.map((a, i) => <div key={i} style={{ fontSize: 12, color: "#fbbf24" }}>{a}</div>)}</div>
          </div>
        </div>
      )}

      {/* FLASH */}
      {msg && (
        <div style={{ ...s.flash, background: msg.tipo === "danger" ? "#7f1d1d" : msg.tipo === "warning" ? "#78350f" : "#064e3b" }}>
          {msg.texto}
        </div>
      )}

      {/* TABS */}
      <div style={s.tabsWrap}><div style={s.tabs}>
        {[
          { key: "vender", label: "Vender" },
          { key: "historial", label: "Historial" },
          { key: "resumen", label: "Resumen" },
          ...(esAdmin ? [{ key: "admin", label: "Admin" }] : []),
        ].map(t => (
          <button key={t.key} style={{ ...s.tab, ...(tab === t.key ? s.tabActive : {}) }} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div></div>

      <div style={s.content}>

        {/* ── VENDER ── */}
        {tab === "vender" && (
          <>
            <div style={s.card}>
              <div style={s.cardTitle}>Elegí el sabor</div>
              {saboresActivos.length === 0 && <div style={s.muted}>Sin sabores activos.</div>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {saboresActivos.map(x => {
                  const sel = String(saborSeleccionado) === String(x.id);
                  return (
                    <button key={x.id} style={{ ...s.saborBtn, ...(sel ? s.saborBtnSelected : {}) }}
                      onClick={() => setSaborSeleccionado(String(x.id))}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{x.nombre}</div>
                      <div style={{ fontSize: 11, color: sel ? "#86efac" : "#666", marginTop: 2 }}>
                        {fmtPaq(x.stock_paquetes)} paq.
                      </div>
                      <StockBar value={x.stock_paquetes} max={3} color={sel ? "#86efac" : "#10b981"} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Nota opcional */}
            <div style={s.card}>
              <div style={s.cardTitle}>Nota (opcional)</div>
              <input
                type="text"
                style={s.input}
                placeholder="Ej: mesa 3, cliente VIP..."
                value={nota}
                onChange={e => setNota(e.target.value)}
                maxLength={200}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <button style={{ ...s.btnPrimary, opacity: cargando ? .6 : 1 }} onClick={() => confirmarAlquiler("nueva")} disabled={cargando}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#888", letterSpacing: "0.05em" }}>NUEVA</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Nueva</div>
                <div style={{ fontSize: 13, color: "#86efac", marginTop: 2 }}>${fmt(config.precio_nueva)}</div>
                <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>costo ~${fmt(costoEstimado)}</div>
              </button>
              <button style={{ ...s.btnSecondary, opacity: cargando ? .6 : 1 }} onClick={() => confirmarAlquiler("recarga")} disabled={cargando}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#888", letterSpacing: "0.05em" }}>RECARGA</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Recarga</div>
                <div style={{ fontSize: 13, color: "#93c5fd", marginTop: 2 }}>${fmt(config.precio_recarga)}</div>
                <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>costo ~${fmt(costoEstimado)}</div>
              </button>
            </div>

            <div style={s.card}>
              <div style={s.cardTitle}>Stock general</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={s.statMini}>
                  
                  <div style={{ fontSize: 24, fontWeight: 700, color: config.carbones < STOCK_MIN_CARBONES ? "#f87171" : "#e5e7eb" }}>{config.carbones}</div>
                  <div style={{ fontSize: 11, color: "#555" }}>carbones</div>
                  <StockBar value={config.carbones} max={50} />
                </div>
                <div style={s.statMini}>
                  
                  <div style={{ fontSize: 24, fontWeight: 700, color: config.papeles < STOCK_MIN_PAPELES ? "#f87171" : "#e5e7eb" }}>{config.papeles}</div>
                  <div style={{ fontSize: 11, color: "#555" }}>papeles</div>
                  <StockBar value={config.papeles} max={50} />
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── HISTORIAL ── */}
        {tab === "historial" && (
          <>
            <div style={s.card}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input type="date" style={{ ...s.input, flex: 1 }} value={desde} onChange={e => setDesde(e.target.value)} />
                <span style={{ color: "#444" }}>→</span>
                <input type="date" style={{ ...s.input, flex: 1 }} value={hasta} onChange={e => setHasta(e.target.value)} />
                <button style={s.btnSmall} onClick={cargarVentas}>Filtrar</button>
                {(desde || hasta) && (
                  <button style={s.btnSmall} onClick={() => { setDesde(""); setHasta(""); }}>
                    Ver todo
                  </button>
                )}
              </div>
              {!desde && !hasta && (
                <div style={{ fontSize: 11, color: "#555", marginTop: 8 }}>
                  Mostrando todas las ventas
                </div>
              )}
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: esAdmin ? "1fr 1fr 1fr" : "1fr",
              gap: 10, marginBottom: 14,
            }}>
              <div style={s.statCard}>
                <div style={s.statLabel}>Recaudado</div>
                <div style={s.statValue}>${fmt(totales.recaudado)}</div>
              </div>
              {/* El margen teórico por shisha solo le sirve al dueño: no es la
                  ganancia real del trato, que depende del recupero. */}
              {esAdmin && (
                <>
                  <div style={s.statCard}>
                    <div style={s.statLabel}>Costos</div>
                    <div style={{ ...s.statValue, color: "#f87171" }}>${fmt(totales.costos)}</div>
                  </div>
                  <div style={{ ...s.statCard, background: "#052e16", border: "1px solid #166534" }}>
                    <div style={s.statLabel}>Ganancia</div>
                    <div style={{ ...s.statValue, color: "#4ade80" }}>${fmt(totales.ganancia)}</div>
                  </div>
                </>
              )}
            </div>

            {/* Avance del recupero de la inversión — lo ven los dos */}
            {cuenta && cuenta.total_capital > 0 && (
              <div style={{ ...s.card, marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                  <div style={s.cardTitle}>Recupero del capital</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: cuenta.etapa === "reparto" ? "#4ade80" : "#facc15" }}>
                    {Math.min(100, Math.round((cuenta.capital_recuperado / cuenta.total_capital) * 100))}%
                  </div>
                </div>

                <div style={{ height: 8, background: "#1a1a1a", borderRadius: 99, overflow: "hidden", marginBottom: 12 }}>
                  <div style={{
                    height: "100%",
                    width: `${Math.min(100, (cuenta.capital_recuperado / cuenta.total_capital) * 100)}%`,
                    background: cuenta.etapa === "reparto" ? "#22c55e" : "#eab308",
                    borderRadius: 99,
                  }} />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#888", marginBottom: 10 }}>
                  <span>${fmt(cuenta.capital_recuperado)} recuperado</span>
                  <span>de ${fmt(cuenta.total_capital)}</span>
                </div>

                <div style={{
                  fontSize: 12, padding: "8px 12px", borderRadius: 8,
                  background: cuenta.etapa === "reparto" ? "#052e1a" : "#1a1005",
                  border: `1px solid ${cuenta.etapa === "reparto" ? "#0f5c33" : "#5c3d05"}`,
                  color: cuenta.etapa === "reparto" ? "#4ade80" : "#facc15",
                }}>
                  {cuenta.etapa === "reparto"
                    ? "Capital cubierto — a partir de acá se reparte 50/50"
                    : `Faltan $${fmt(cuenta.falta_para_cubrir)} de ganancia para cubrir el capital y pasar al 50/50`}
                </div>

                {/* El costo del tabaco y el carbón se repone en cada venta, no
                    corre la meta: por eso va aparte del recupero. */}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 11, color: "#666" }}>
                  <span>Insumos ya repuestos en ventas</span>
                  <span style={{ color: "#a78bfa" }}>${fmt(cuenta.insumos_consumidos)}</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, paddingTop: 12, borderTop: "1px solid #1a1a1a" }}>
                  <span style={{ fontSize: 12, color: "#888" }}>Pendiente de pago</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: cuenta.deuda > 0 ? "#f87171" : "#4ade80" }}>
                    ${fmt(cuenta.deuda)}
                  </span>
                </div>
              </div>
            )}

            {rankingOrdenado.length > 0 && (
              <div style={s.card}>
                <div style={s.cardTitle}>Sabor más pedido</div>
                {rankingOrdenado.map(([nombre, cant], i) => (
                  <div key={nombre} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: i === 0 ? "#fbbf24" : "#444", fontSize: 13 }}>#{i + 1}</span>
                      <span style={{ fontSize: 14, fontWeight: i === 0 ? 700 : 400 }}>{nombre}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ background: "#1f1f1f", borderRadius: 6, height: 6, width: 70, overflow: "hidden" }}>
                        <div style={{ width: `${(cant / rankingOrdenado[0][1]) * 100}%`, background: i === 0 ? "#a78bfa" : "#3f3f3f", height: "100%" }} />
                      </div>
                      <span style={{ color: "#a78bfa", fontSize: 13, fontWeight: 600, minWidth: 20, textAlign: "right" }}>{cant}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={s.card}>
              <div style={s.cardTitle}>Alquileres ({ventas.length})</div>
              {ventas.length === 0 && <div style={s.muted}>Sin registros en este período</div>}
              {ventas.map(v => (
                <div key={v.id} style={s.ventaRow}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ ...s.badge, background: v.tipo === "nueva" ? "#1c1c1c" : "#0f172a", border: `1px solid ${v.tipo === "nueva" ? "#3f3f3f" : "#1e3a5f"}` }}>
                        {v.tipo === "nueva" ? "Nueva" : "Recarga"}
                      </span>
                      {v.sabor_nombre && <span style={{ fontSize: 12, color: "#a78bfa" }}>{v.sabor_nombre}</span>}
                    </div>
                    {v.nota && <div style={{ fontSize: 11, color: "#fbbf24", marginTop: 3 }}>· {v.nota}</div>}
                    <div style={{ fontSize: 11, color: "#444", marginTop: 3 }}>{new Date(v.created_at).toLocaleString("es-AR")}</div>
                  </div>
                  <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>${fmt(v.precio_venta)}</div>
                    <div style={{ fontSize: 11, color: "#4ade80" }}>+${fmt(v.ganancia)}</div>
                    <button style={{ ...s.btnSmall, fontSize: 11, padding: "2px 8px", color: "#f87171", background: "#1a0000", border: "1px solid #3f0000" }}
                      onClick={() => setAnulando(v)}>Anular</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── RESUMEN ── */}
        {tab === "resumen" && resumen && (
          <>
            <div style={s.card}>
              <div style={s.cardTitle}>Este mes</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div style={s.statCard}>
                  <div style={s.statLabel}>Alquileres</div>
                  <div style={s.statValue}>{resumen.actual.cantidad}</div>
                </div>
                <div style={s.statCard}>
                  <div style={s.statLabel}>Recaudado</div>
                  <div style={s.statValue}>${fmt(resumen.actual.recaudado)}</div>
                </div>
              </div>
              <div style={{ ...s.statCard, background: "#052e16", border: "1px solid #166534", textAlign: "center", padding: 16 }}>
                <div style={s.statLabel}>Ganancia del mes</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: "#4ade80" }}>${fmt(resumen.actual.ganancia)}</div>
                {resumen.anterior.ganancia > 0 && (
                  <div style={{ fontSize: 12, color: difGanancia >= 0 ? "#4ade80" : "#f87171", marginTop: 4 }}>
                    {difGanancia >= 0 ? "▲" : "▼"} ${fmt(Math.abs(difGanancia))} vs mes anterior
                  </div>
                )}
              </div>
            </div>

            <div style={s.card}>
              <div style={s.cardTitle}>Mes anterior</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={s.statCard}>
                  <div style={s.statLabel}>Alquileres</div>
                  <div style={s.statValue}>{resumen.anterior.cantidad}</div>
                </div>
                <div style={s.statCard}>
                  <div style={s.statLabel}>Ganancia</div>
                  <div style={s.statValue}>${fmt(resumen.anterior.ganancia)}</div>
                </div>
              </div>
            </div>

            <div style={s.card}>
              <div style={s.cardTitle}>Sabores más pedidos</div>
              {resumen.saborTop.length === 0 && <div style={s.muted}>Sin datos</div>}
              {resumen.saborTop.map((x, i) => (
                <div key={x.sabor_nombre} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 13, color: "#555", fontWeight: 700, minWidth: 20 }}>#{i + 1}</span>
                    <span style={{ fontSize: 15, fontWeight: i === 0 ? 700 : 400 }}>{x.sabor_nombre}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ background: "#1f1f1f", borderRadius: 6, height: 6, width: 80, overflow: "hidden" }}>
                      <div style={{ width: `${(x.total / resumen.saborTop[0].total) * 100}%`, background: "#a78bfa", height: "100%" }} />
                    </div>
                    <span style={{ color: "#a78bfa", fontWeight: 700, fontSize: 14, minWidth: 24, textAlign: "right" }}>{x.total}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── ADMIN ── */}
        {tab === "admin" && esAdmin && (
          <>
            {/* Ajuste, no reposición: si entró mercadería va por Compras, que
                además registra el gasto. Acá sólo se corrige lo que ya hay. */}
            <div style={s.card}>
              <div style={s.cardTitle}>Control de stock</div>
              <div style={s.hint}>
                Para reponer usá <b style={{ color: "#a78bfa" }}>Compras del negocio</b> en
                el tab Cuenta Fagu: suma el stock y registra el gasto. Acá corregís lo que
                el sistema dice mal — el stock queda exactamente en lo que cargues.
                Lo que dejes vacío no se toca.
              </div>

              <form onSubmit={cargarInsumos}>
                <div style={s.formGroup}>
                  <label style={s.label}>
                    Carbones contados<span style={s.actual}> · el sistema dice {config.carbones}</span>
                  </label>
                  <input type="number" style={s.input} min="0" placeholder={String(config.carbones)}
                    value={formInsumos.carbones} onChange={e => setFormInsumos({ ...formInsumos, carbones: e.target.value })} />
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>
                    Papeles contados<span style={s.actual}> · el sistema dice {config.papeles}</span>
                  </label>
                  <input type="number" style={s.input} min="0" placeholder={String(config.papeles)}
                    value={formInsumos.papeles} onChange={e => setFormInsumos({ ...formInsumos, papeles: e.target.value })} />
                </div>
                <button style={s.btnPrimary} type="submit">Corregir carbón y aluminio</button>
              </form>

              <div style={{ borderTop: "1px solid #1f1f1f", margin: "20px 0 16px" }} />

              <form onSubmit={cargarStockSabor}>
                <div style={s.formGroup}>
                  <label style={s.label}>Sabor</label>
                  <select style={s.input} value={stockSabor.id} onChange={e => setStockSabor({ ...stockSabor, id: e.target.value })}>
                    <option value="">-- Elegí un sabor --</option>
                    {sabores.map(x => (
                      <option key={x.id} value={x.id}>{x.nombre} ({fmtPaq(x.stock_paquetes)} paq.)</option>
                    ))}
                  </select>
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>
                    Paquetes contados
                    {saborAjuste && <span style={s.actual}> · el sistema dice {fmtPaq(saborAjuste.stock_paquetes)}</span>}
                  </label>
                  <input type="number" style={s.input} step="0.5" min="0" placeholder="0"
                    value={stockSabor.paquetes} onChange={e => setStockSabor({ ...stockSabor, paquetes: e.target.value })} />
                </div>
                <button style={s.btnPrimary} type="submit">Corregir tabaco</button>
              </form>
            </div>

            <div style={s.card}>
              <div style={s.cardTitle}>Sabores</div>
              {sabores.map(x => (
                <div key={x.id} style={s.saborRow}>
                  <div>
                    <div style={{ fontSize: 14, color: x.activo ? "#e5e7eb" : "#444", textDecoration: x.activo ? "none" : "line-through" }}>{x.nombre}</div>
                    <div style={{ fontSize: 11, color: "#555" }}>{fmtPaq(x.stock_paquetes)} paq.</div>
                  </div>
                  <button style={{ ...s.btnSmall, background: x.activo ? "#3f0000" : "#052e16", color: x.activo ? "#f87171" : "#4ade80" }}
                    onClick={() => toggleSabor(x.id)}>
                    {x.activo ? "Desactivar" : "Activar"}
                  </button>
                </div>
              ))}
              <div style={{ marginTop: 12, borderTop: "1px solid #1f1f1f", paddingTop: 12 }}>
                <form onSubmit={agregarSabor} style={{ display: "flex", gap: 8 }}>
                  <input type="text" style={{ ...s.input, flex: 1 }} placeholder="Nuevo sabor..." value={nuevoSabor}
                    onChange={e => setNuevoSabor(e.target.value)} />
                  <button style={{ ...s.btnSmall, padding: "8px 16px" }} type="submit">+ Agregar</button>
                </form>
              </div>
            </div>

            {/* ── CUENTA FAGU ── */}
            {cuenta && (
              <div style={s.card}>
                <div style={s.cardTitle}>Cuenta Fagu</div>

                {/* Etapa: recupero (100% deuda) o reparto (50/50 superado el techo) */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, marginBottom: 14,
                  padding: "8px 12px", borderRadius: 8,
                  background: cuenta.etapa === "reparto" ? "#052e1a" : "#1a1005",
                  border: `1px solid ${cuenta.etapa === "reparto" ? "#0f5c33" : "#5c3d05"}`,
                }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: cuenta.etapa === "reparto" ? "#4ade80" : "#facc15" }}>
                    {cuenta.etapa === "reparto" ? "50/50 — capital cubierto" : "100% recupero — cubriendo capital"}
                  </span>
                  {cuenta.etapa === "recupero" && cuenta.total_capital > 0 && (
                    <span style={{ fontSize: 11, color: "#888" }}>
                      · faltan ${fmt(cuenta.falta_para_cubrir)} de ganancia
                    </span>
                  )}
                </div>

                {/* KPIs */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  {[
                    { label: "Capital", value: `$${fmt(cuenta.total_capital)}`, color: "#60a5fa" },
                    { label: "Insumos comprados", value: `$${fmt(cuenta.insumos_comprados)}`, color: "#a78bfa" },
                  ].map(k => (
                    <div key={k.label} style={{ background: "#0a0a0a", borderRadius: 10, padding: "10px 12px", border: "1px solid #1f1f1f" }}>
                      <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", marginBottom: 4 }}>{k.label}</div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: k.color }}>{k.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
                  {[
                    { label: "Pagado", value: `$${fmt(cuenta.total_pagado)}`, color: "#10b981" },
                    { label: "Deuda", value: `$${fmt(cuenta.deuda)}`, color: cuenta.deuda <= 0 ? "#10b981" : "#f87171" },
                    { label: "Tu ganancia (reparto)", value: `$${fmt(cuenta.ganancia_tuya)}`, color: "#10b981" },
                  ].map(k => (
                    <div key={k.label} style={{ background: "#0a0a0a", borderRadius: 10, padding: "10px 12px", border: "1px solid #1f1f1f" }}>
                      <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", marginBottom: 4 }}>{k.label}</div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: k.color }}>{k.value}</div>
                    </div>
                  ))}
                </div>

                {/* Formulario pago */}
                <form onSubmit={registrarPago} style={{ marginBottom: 20 }}>
                  <div style={s.formGroup}>
                    <label style={s.label}>Monto $</label>
                    <input type="number" style={s.input} placeholder="0" min="1"
                      value={pagoForm.monto} onChange={e => setPagoForm({ ...pagoForm, monto: e.target.value })} />
                  </div>
                  <div style={s.formGroup}>
                    <label style={s.label}>Método</label>
                    <select style={s.input} value={pagoForm.metodo} onChange={e => setPagoForm({ ...pagoForm, metodo: e.target.value })}>
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="mp">Mercado Pago</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                  <div style={s.formGroup}>
                    <label style={s.label}>Fecha</label>
                    <input type="date" style={s.input}
                      value={pagoForm.fecha} onChange={e => setPagoForm({ ...pagoForm, fecha: e.target.value })} />
                  </div>
                  <div style={s.formGroup}>
                    <label style={s.label}>Notas (opcional)</label>
                    <input type="text" style={s.input} placeholder="Ej: pago semana 27"
                      value={pagoForm.notas} onChange={e => setPagoForm({ ...pagoForm, notas: e.target.value })} />
                  </div>
                  <button style={s.btnPrimary} type="submit" disabled={guardandoPago}>
                    {guardandoPago ? "Guardando..." : "Registrar pago"}
                  </button>
                </form>

                {/* Historial pagos */}
                {cuenta.historial?.length > 0 && (
                  <>
                    <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", marginBottom: 10 }}>Historial</div>
                    {cuenta.historial.map(p => (
                      <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #1a1a1a" }}>
                        <div>
                          <div style={{ fontWeight: 600, color: "#10b981" }}>${fmt(p.monto)}</div>
                          <div style={{ fontSize: 11, color: "#555" }}>
                            {new Date(p.fecha).toLocaleDateString("es-AR")} · {p.metodo}
                            {p.notas ? ` · ${p.notas}` : ""}
                          </div>
                        </div>
                        <button
                          onClick={() => eliminarPago(p.id)}
                          disabled={eliminandoPago === p.id}
                          style={{ background: "#1a0000", border: "1px solid #3f0000", color: "#f87171", borderRadius: 6, padding: "3px 10px", fontSize: 11, cursor: "pointer" }}
                        >
                          {eliminandoPago === p.id ? "..." : "Eliminar"}
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* ── INVERSIÓN SHISHA ── */}
            {cuenta && (
              <div style={s.card}>
                <div style={s.cardTitle}>Compras del negocio</div>
                <div style={{ fontSize: 12, color: "#666", marginBottom: 16 }}>
                  El <b style={{ color: "#60a5fa" }}>capital</b> se compra una vez y forma el techo
                  a recuperar. Los <b style={{ color: "#a78bfa" }}>insumos</b> se consumen en cada
                  shisha y se te reponen venta por venta, sin correr la meta.
                </div>

                <form onSubmit={registrarCompra} style={{ marginBottom: 20 }}>
                  <div style={s.formGroup}>
                    <label style={s.label}>Fecha de la compra</label>
                    <input type="date" style={s.input}
                      value={compraFecha} onChange={e => setCompraFecha(e.target.value)} />
                  </div>

                  {compraItems.map((it, idx) => {
                    const def = TIPOS_RENGLON.find(t => t.v === it.insumo);
                    return (
                      <div key={idx} style={s.renglon}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: ".5px" }}>
                            Renglón {idx + 1}
                          </div>
                          {compraItems.length > 1 && (
                            <button type="button" onClick={() => quitarRenglon(idx)}
                              style={{ background: "none", border: "none", color: "#f87171", fontSize: 11, cursor: "pointer" }}>
                              Quitar
                            </button>
                          )}
                        </div>

                        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                          {TIPOS_RENGLON.map(t => (
                            <button key={t.v} type="button" onClick={() => setItem(idx, "insumo", t.v)}
                              style={{
                                flex: 1, cursor: "pointer", borderRadius: 8, padding: "7px 4px", fontSize: 12,
                                background: it.insumo === t.v ? (t.tipo === "insumo" ? "#a78bfa18" : "#60a5fa18") : "transparent",
                                border: `1px solid ${it.insumo === t.v ? (t.tipo === "insumo" ? "#a78bfa" : "#60a5fa") : "#2a2a2a"}`,
                                color: it.insumo === t.v ? (t.tipo === "insumo" ? "#a78bfa" : "#60a5fa") : "#777",
                                fontWeight: it.insumo === t.v ? 600 : 400,
                              }}>
                              {t.t}
                            </button>
                          ))}
                        </div>

                        {it.insumo === "tabaco" && (
                          <div style={s.formGroup}>
                            <label style={s.label}>Sabor</label>
                            <select style={s.input} value={it.sabor_id}
                              onChange={e => setItem(idx, "sabor_id", e.target.value)}>
                              <option value="">-- Elegí el sabor --</option>
                              {sabores.map(x => <option key={x.id} value={x.id}>{x.nombre}</option>)}
                            </select>
                          </div>
                        )}

                        <div style={{ display: "flex", gap: 8 }}>
                          {def.u && (
                            <div style={{ ...s.formGroup, flex: 1 }}>
                              <label style={s.label}>{def.u}</label>
                              <input type="number" style={s.input} min="0" step={it.insumo === "tabaco" ? "0.5" : "1"}
                                placeholder="0" value={it.cantidad}
                                onChange={e => setItem(idx, "cantidad", e.target.value)} />
                            </div>
                          )}
                          <div style={{ ...s.formGroup, flex: 1 }}>
                            <label style={s.label}>Total pagado $</label>
                            <input type="number" style={s.input} min="1" placeholder="0"
                              value={it.monto} onChange={e => setItem(idx, "monto", e.target.value)} />
                          </div>
                        </div>

                        {it.insumo === "otro" ? (
                          <div style={s.formGroup}>
                            <label style={s.label}>Qué compraste</label>
                            <input type="text" style={s.input} placeholder="Ej: 2 shishas + quemadores"
                              value={it.descripcion} onChange={e => setItem(idx, "descripcion", e.target.value)} />
                          </div>
                        ) : (
                          Number(it.cantidad) > 0 && Number(it.monto) > 0 && (
                            <div style={{ fontSize: 11, color: "#555" }}>
                              {fmtUnit(Number(it.monto) / Number(it.cantidad))} por {def.u1}
                            </div>
                          )
                        )}
                      </div>
                    );
                  })}

                  <button type="button" onClick={agregarRenglon} style={s.btnAgregarRenglon}>
                    + Agregar otro renglón
                  </button>

                  <div style={s.totalCompra}>
                    <span style={{ color: "#666", fontSize: 12 }}>Total de la compra</span>
                    <span style={{ fontWeight: 700, fontSize: 17 }}>${fmt(totalCompra)}</span>
                  </div>

                  <button style={s.btnPrimary} type="submit" disabled={guardandoInversion}>
                    {guardandoInversion ? "Guardando..." : "Cargar compra y sumar stock"}
                  </button>
                </form>

                {cuenta.inversiones?.length > 0 ? (
                  <>
                    <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", marginBottom: 10 }}>
                      Capital ${fmt(cuenta.total_capital)} · Insumos ${fmt(cuenta.insumos_comprados)}
                    </div>
                    {cuenta.inversiones.map(i => (
                      <div key={i.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #1a1a1a" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontWeight: 600, color: i.tipo === "insumo" ? "#a78bfa" : "#60a5fa" }}>${fmt(i.monto)}</span>
                            <span style={{
                              fontSize: 9, textTransform: "uppercase", letterSpacing: "0.5px",
                              padding: "1px 6px", borderRadius: 4,
                              background: i.tipo === "insumo" ? "#a78bfa18" : "#60a5fa18",
                              color: i.tipo === "insumo" ? "#a78bfa" : "#60a5fa",
                            }}>{i.tipo}</span>
                          </div>
                          <div style={{ fontSize: 11, color: "#555" }}>
                            {new Date(i.fecha).toLocaleDateString("es-AR")} ·{" "}
                            {i.cantidad > 0
                              ? `${fmtPaq(i.cantidad)} ${i.insumo === "tabaco" ? `paq. ${i.sabor}` : i.insumo === "carbones" ? "carbones" : "papeles"}`
                              : i.descripcion}
                          </div>
                        </div>
                        <button
                          onClick={() => eliminarInversion(i.id)}
                          disabled={eliminandoInversion === i.id}
                          style={{ background: "#1a0000", border: "1px solid #3f0000", color: "#f87171", borderRadius: 6, padding: "3px 10px", fontSize: 11, cursor: "pointer" }}
                        >
                          {eliminandoInversion === i.id ? "..." : "Eliminar"}
                        </button>
                      </div>
                    ))}
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: "#666", textAlign: "center", padding: "16px 0" }}>
                    Todavía no cargaste ninguna compra. Mientras tanto, toda venta se cuenta
                    como 100% deuda de Fagu, igual que antes.
                  </div>
                )}
              </div>
            )}

            <div style={s.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={s.cardTitle}>Configuración de precios</div>
                <button style={{ ...s.btnSmall, fontSize: 12 }} onClick={() => setEditandoConfig(!editandoConfig)}>
                  {editandoConfig ? "Cancelar" : "Editar"}
                </button>
              </div>
              {!editandoConfig ? (
                [{ label: "Precio del dólar", value: `$${fmt(config.precio_dolar)}` },
                 { label: "Nueva shisha", value: `$${fmt(config.precio_nueva)}` },
                 { label: "Recarga", value: `$${fmt(config.precio_recarga)}` }].map(r => (
                  <div key={r.label} style={s.configRow}>
                    <span style={{ color: "#888", fontSize: 14 }}>{r.label}</span>
                    <span style={{ fontWeight: 600 }}>{r.value}</span>
                  </div>
                ))
              ) : (
                <form onSubmit={guardarConfig}>
                  {[{ label: "Precio del dólar", key: "precio_dolar" },
                    { label: "Nueva shisha", key: "precio_nueva" },
                    { label: "Recarga", key: "precio_recarga" }].map(f => (
                    <div key={f.key} style={s.formGroup}>
                      <label style={s.label}>{f.label}</label>
                      <input type="number" style={s.input} value={formConfig[f.key]}
                        onChange={e => setFormConfig({ ...formConfig, [f.key]: e.target.value })} />
                    </div>
                  ))}
                  <button style={s.btnPrimary} type="submit">Guardar cambios</button>
                </form>
              )}
            </div>
          </>
        )}
      </div>

      {/* MODAL CONFIRMAR ALQUILER */}
      {confirmando && (
        <Modal titulo={`Confirmar ${confirmando === "nueva" ? "nueva shisha" : "recarga"}`} onClose={() => setConfirmando(null)}>
          <div style={{ color: "#888", fontSize: 14, marginBottom: 16 }}>
            <div>Sabor: <strong style={{ color: "#a78bfa" }}>{saborElegido?.nombre || "-"}</strong></div>
            <div>Precio: <strong style={{ color: "#e5e7eb" }}>${fmt(confirmando === "nueva" ? config.precio_nueva : config.precio_recarga)}</strong></div>
            {nota && <div>Nota: <strong style={{ color: "#fbbf24" }}>{nota}</strong></div>}
          </div>
          <button style={{ ...s.btnPrimary, background: confirmando === "nueva" ? "#1a1a1a" : "#0f172a" }} onClick={registrarAlquiler}>
            Confirmar
          </button>
        </Modal>
      )}

      {/* MODAL ANULAR */}
      {anulando && (
        <Modal titulo="¿Anular esta venta?" onClose={() => setAnulando(null)}>
          <div style={{ color: "#888", fontSize: 14, marginBottom: 16 }}>
            <div>Tipo: <strong style={{ color: "#e5e7eb" }}>{anulando.tipo === "nueva" ? "Nueva shisha" : "Recarga"}</strong></div>
            {anulando.sabor_nombre && <div>Sabor: <strong style={{ color: "#a78bfa" }}>{anulando.sabor_nombre}</strong></div>}
            <div style={{ marginTop: 8, color: "#f87171", fontSize: 12 }}>Los insumos van a volver al stock.</div>
          </div>
          <button style={{ ...s.btnPrimary, background: "#3f0000", border: "1px solid #7f1d1d" }} onClick={anularVenta}>
            Sí, anular
          </button>
        </Modal>
      )}
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", background: "#0a0a0a", color: "#e5e7eb", fontFamily: "'Inter', sans-serif", paddingBottom: 60 },
  wrap: { maxWidth: 560, margin: "0 auto" },
  header: { background: "linear-gradient(135deg, #111 0%, #161616 100%)", borderBottom: "1px solid #1f1f1f", padding: "20px 20px 18px" },
  headerInner: { maxWidth: 560, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px", display: "flex", alignItems: "center", gap: 8 },
  headerSub: { fontSize: 12, color: "#444", marginTop: 3, letterSpacing: "0.05em", textTransform: "uppercase" },
  headerRight: { textAlign: "right" },
  headerDolar: { fontSize: 15, fontWeight: 700, color: "#fbbf24", background: "#2a1f00", border: "1px solid #78350f", borderRadius: 8, padding: "4px 10px" },
  headerDolarLabel: { fontSize: 10, color: "#555", marginTop: 4, textAlign: "center" },
  alertaStock: { background: "#1c1000", borderBottom: "1px solid #78350f", padding: "10px 20px", display: "flex", gap: 10, alignItems: "flex-start" },
  alertaInner: { maxWidth: 560, margin: "0 auto", display: "flex", gap: 10, alignItems: "flex-start", width: "100%" },
  flash: { maxWidth: 560, margin: "12px auto 0", padding: "11px 16px", borderRadius: 10, fontSize: 13, color: "#e5e7eb" },
  tabsWrap: { background: "#0f0f0f", borderBottom: "1px solid #1a1a1a", position: "sticky", top: 0, zIndex: 10 },
  tabs: { maxWidth: 560, margin: "0 auto", display: "flex" },
  tab: { flex: 1, padding: "14px 0", background: "none", border: "none", color: "#444", fontSize: 13, fontWeight: 500, cursor: "pointer", borderBottom: "2px solid transparent", transition: "color .2s" },
  tabActive: { color: "#e5e7eb", borderBottom: "2px solid #a78bfa" },
  content: { padding: "20px 16px", maxWidth: 560, margin: "0 auto" },
  card: { background: "#111", border: "1px solid #1e1e1e", borderRadius: 16, padding: 18, marginBottom: 14 },
  cardTitle: { fontSize: 11, fontWeight: 700, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 },
  muted: { color: "#444", fontSize: 13 },
  saborBtn: { background: "#161616", border: "1px solid #252525", borderRadius: 12, padding: "12px 14px", cursor: "pointer", textAlign: "left", color: "#e5e7eb", transition: "border-color .15s" },
  saborBtnSelected: { background: "#0a1f12", border: "1px solid #15803d" },
  btnPrimary: { width: "100%", background: "#161616", border: "1px solid #2a2a2a", borderRadius: 16, padding: "20px 12px", cursor: "pointer", color: "#e5e7eb", textAlign: "center", display: "block", transition: "border-color .15s" },
  btnSecondary: { width: "100%", background: "#0c1220", border: "1px solid #1e3a5f", borderRadius: 16, padding: "20px 12px", cursor: "pointer", color: "#e5e7eb", textAlign: "center", display: "block" },
  btnSmall: { background: "#1a1a1a", border: "1px solid #252525", borderRadius: 8, padding: "7px 13px", cursor: "pointer", color: "#e5e7eb", fontSize: 13, whiteSpace: "nowrap" },
  statMini: { background: "#161616", border: "1px solid #1e1e1e", borderRadius: 14, padding: 16, textAlign: "center" },
  statCard: { background: "#161616", border: "1px solid #1e1e1e", borderRadius: 14, padding: "16px 12px", textAlign: "center", display: "flex", flexDirection: "column", gap: 6 },
  statLabel: { fontSize: 10, fontWeight: 700, color: "#444", textTransform: "uppercase", letterSpacing: "0.06em", lineHeight: 1 },
  statValue: { fontSize: 20, fontWeight: 800, lineHeight: 1 },
  ventaRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "13px 0", borderBottom: "1px solid #161616" },
  badge: { fontSize: 11, padding: "3px 9px", borderRadius: 20, color: "#9ca3af", fontWeight: 500 },
  saborRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: "1px solid #161616" },
  configRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #161616" },
  formGroup: { marginBottom: 14 },
  label: { display: "block", fontSize: 12, color: "#555", marginBottom: 7, fontWeight: 500 },
  actual: { color: "#3f3f3f", fontWeight: 400 },
  renglon: { background: "#0d0d0d", border: "1px solid #1f1f1f", borderRadius: 10, padding: 14, marginBottom: 10 },
  btnAgregarRenglon: { width: "100%", background: "transparent", border: "1px dashed #2a2a2a", color: "#666", borderRadius: 10, padding: "10px", fontSize: 12, cursor: "pointer", marginBottom: 14 },
  totalCompra: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderTop: "1px solid #1f1f1f", marginBottom: 12 },
  hint: { fontSize: 11, color: "#666", background: "#141414", border: "1px solid #222", borderRadius: 8, padding: "8px 10px", marginBottom: 12, lineHeight: 1.5 },
  input: { width: "100%", background: "#161616", border: "1px solid #252525", borderRadius: 10, padding: "11px 14px", color: "#e5e7eb", fontSize: 14, outline: "none", boxSizing: "border-box" },
};
