import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "../utils/axiosInstance";
import { jwtDecode } from "jwt-decode";
import { toast } from "react-toastify";

function RegistrarVenta() {
  const [sucursales, setSucursales] = useState([]);
  const [sucursalId, setSucursalId] = useState("");

  const [gustos, setGustos] = useState([]);
  const [gustoId, setGustoId] = useState("");

  const [cantidad, setCantidad] = useState(1);
  // Vendedor: precio fijo por modelo (lo carga el admin) y confirmación antes de registrar
  const [preciosVendedor, setPreciosVendedor] = useState({});
  const [modeloId, setModeloId] = useState("");
  const [confirmando, setConfirmando] = useState(false);

  const [codigoBarra, setCodigoBarra] = useState("");
  const [productoDetectado, setProductoDetectado] = useState(null);

  // 🔎 Autocomplete
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [mostrarSinStock, setMostrarSinStock] = useState(false);

  const [rol, setRol] = useState(null);

  const [loadingSucursales, setLoadingSucursales] = useState(false);
  const [loadingGustos, setLoadingGustos] = useState(false);
  const [loadingScan, setLoadingScan] = useState(false);
  const [loadingVenta, setLoadingVenta] = useState(false);

  // Para evitar race conditions en scan
  const lastScanRequestId = useRef(0);

  // refs UX
  const autocompleteRef = useRef(null);
  const inputBuscarRef = useRef(null);

  // =========================
  // Utils
  // =========================
  const normalizar = (str = "") =>
    str
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const labelGusto = (g) => `${g.producto_nombre} - ${g.gusto}`;

  // =========================
  // INIT: token + sucursales
  // =========================
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const decoded = jwtDecode(token);
      setRol(decoded.rol);
      // Pre-seleccionar sucursal del token (sucursal fija para rol=sucursal, default para vendedor)
      if (decoded.sucursal_id && decoded.rol !== "admin") {
        setSucursalId(String(decoded.sucursal_id));
      }
      if (decoded.rol === "vendedor") {
        axios.get("/vendedores/mis-precios")
          .then((r) => setPreciosVendedor(r.data || {}))
          .catch(() => toast.error("❌ No se pudieron cargar tus precios"));
      }
    }

    const fetchSucursales = async () => {
      try {
        setLoadingSucursales(true);
        const res = await axios.get("/sucursales");
        setSucursales(res.data || []);
      } catch {
        toast.error("❌ Error al cargar sucursales");
      } finally {
        setLoadingSucursales(false);
      }
    };

    fetchSucursales();
  }, []);

  // =========================
  // Cargar gustos disponibles
  // =========================
  const cargarGustosDisponibles = async (sId) => {
    if (!sId) return;
    try {
      setLoadingGustos(true);
      const res = await axios.get(`/disponibles?sucursal_id=${sId}`);
      setGustos(res.data || []);
    } catch {
      toast.error("❌ Error al cargar gustos");
    } finally {
      setLoadingGustos(false);
    }
  };

  useEffect(() => {
    if (!sucursalId) return;

    // reset dependiente de sucursal
    setGustoId("");
    setModeloId("");
    setCodigoBarra("");
    setProductoDetectado(null);

    setQuery("");
    setIsOpen(false);
    setHighlightIndex(-1);
    setMostrarSinStock(false);

    cargarGustosDisponibles(sucursalId).then(() => {
      // Enfocar el input de búsqueda automáticamente al cambiar sucursal
      setTimeout(() => {
        inputBuscarRef.current?.focus();
        setIsOpen(true);
      }, 100);
    });
  }, [sucursalId]);

  // =========================
  // Scan por código (debounce)
  // =========================
  useEffect(() => {
    if (!codigoBarra || !sucursalId) {
      setProductoDetectado(null);
      return;
    }

    const trimmed = codigoBarra.trim();
    if (!trimmed) {
      setProductoDetectado(null);
      return;
    }

    const requestId = ++lastScanRequestId.current;

    const delay = setTimeout(async () => {
      try {
        setLoadingScan(true);
        const res = await axios.get(
          `/buscar-por-codigo/${encodeURIComponent(
            trimmed
          )}?sucursal_id=${sucursalId}`
        );

        if (requestId !== lastScanRequestId.current) return;

        const data = res.data;
        setGustoId(String(data.gusto_id));
        if (data.producto_id) setModeloId(String(data.producto_id));
        setProductoDetectado(`${data.producto_nombre} - ${data.gusto}`);

        // ✅ sincroniza autocomplete con el detectado
        setQuery(`${data.producto_nombre} - ${data.gusto}`);
        setIsOpen(false);
        setHighlightIndex(-1);

      } catch (err) {
        if (requestId !== lastScanRequestId.current) return;

        setGustoId("");
        setProductoDetectado(null);

        if (trimmed.length >= 6) {
          toast.error("❌ Código no encontrado en esta sucursal");
        }
      } finally {
        if (requestId === lastScanRequestId.current) setLoadingScan(false);
      }
    }, 300);

    return () => clearTimeout(delay);
  }, [codigoBarra, sucursalId]);

  // =========================
  // Datos derivados
  // =========================
  const sucursalNombre = useMemo(() => {
    return (
      sucursales.find((s) => String(s.id) === String(sucursalId))?.nombre || ""
    );
  }, [sucursales, sucursalId]);

  const gustosOrdenados = useMemo(() => {
    return [...gustos].sort(
      (a, b) => (Number(b.stock) || 0) - (Number(a.stock) || 0)
    );
  }, [gustos]);

  // ✅ Filtrado para autocomplete
  const resultados = useMemo(() => {
    const q = normalizar(query);
    let list = gustosOrdenados;

    if (!mostrarSinStock) {
      list = list.filter((g) => Number(g.stock) > 0);
    }

    if (q) {
      list = list.filter((g) => {
        const prod = normalizar(g.producto_nombre);
        const gus = normalizar(g.gusto);
        return prod.includes(q) || gus.includes(q);
      });
    }

    return list.slice(0, 12);
  }, [gustosOrdenados, query, mostrarSinStock]);

  const formDisabled = !sucursalId || loadingVenta;

  const seleccionado = useMemo(() => {
    return gustos.find((g) => String(g.gusto_id) === String(gustoId)) || null;
  }, [gustos, gustoId]);

  const esVendedor = rol === "vendedor";

  // Vendedor: primero el modelo, después el sabor. Así no se confunde un
  // "Blue Razz" de un modelo con el de otro, y solo aparece lo que tiene stock.
  const modelos = useMemo(() => {
    const porId = new Map();
    for (const g of gustos) {
      if (Number(g.stock) <= 0) continue;
      const m = porId.get(g.producto_id) || { id: g.producto_id, nombre: g.producto_nombre, stock: 0 };
      m.stock += Number(g.stock);
      porId.set(g.producto_id, m);
    }
    return [...porId.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [gustos]);

  const saboresDelModelo = useMemo(() => {
    return gustos
      .filter((g) => String(g.producto_id) === String(modeloId) && Number(g.stock) > 0)
      .sort((a, b) => a.gusto.localeCompare(b.gusto));
  }, [gustos, modeloId]);

  const precioUnitario = seleccionado
    ? (esVendedor ? preciosVendedor[seleccionado.producto_id] ?? null : Number(seleccionado.precio))
    : null;
  const sinPrecio = esVendedor && seleccionado && precioUnitario == null;

  // =========================
  // Autocomplete: cerrar al click afuera
  // =========================
  useEffect(() => {
    const onMouseDown = (e) => {
      if (!autocompleteRef.current) return;
      if (!autocompleteRef.current.contains(e.target)) {
        setIsOpen(false);
        setHighlightIndex(-1);
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const seleccionarItem = (g) => {
    if (!g) return;
    if (Number(g.stock) <= 0) return;

    setGustoId(String(g.gusto_id));
    setQuery(labelGusto(g));
    setIsOpen(false);
    setHighlightIndex(-1);
  };

  const onKeyDownBuscar = (e) => {
    if (!isOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setIsOpen(true);
      return;
    }

    if (e.key === "Escape") {
      setIsOpen(false);
      setHighlightIndex(-1);
      return;
    }

    if (!resultados.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
      setHighlightIndex((prev) => {
        const next = prev + 1;
        return next >= resultados.length ? 0 : next;
      });
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setIsOpen(true);
      setHighlightIndex((prev) => {
        const next = prev - 1;
        return next < 0 ? resultados.length - 1 : next;
      });
    }

    if (e.key === "Enter") {
      if (isOpen) {
        e.preventDefault();
        const g = resultados[highlightIndex] || resultados[0];
        seleccionarItem(g);
      }
    }
  };

  // =========================
  // Submit venta
  // =========================
  const armarPayload = () => ({
    gusto_id: Number(gustoId),
    sucursal_id: Number(sucursalId),
    cantidad: Number(cantidad),
  });

  const registrarVenta = async (e) => {
    e?.preventDefault();
    if (formDisabled) return;

    const payload = armarPayload();

    if (!payload.gusto_id || !payload.sucursal_id) {
      toast.error("❌ Seleccioná sucursal y producto");
      return;
    }
    if (!payload.cantidad || payload.cantidad < 1) {
      toast.error("❌ Cantidad inválida");
      return;
    }

    if (seleccionado && payload.cantidad > Number(seleccionado.stock)) {
      toast.error(
        `❌ No hay stock suficiente. Disponible: ${seleccionado.stock}`
      );
      return;
    }
    if (sinPrecio) {
      toast.error("❌ Este modelo no tiene precio de vendedor. Avisale al administrador.");
      return;
    }

    // El vendedor revisa todo en grande antes de que se registre
    if (esVendedor && !confirmando) {
      setConfirmando(true);
      return;
    }
    setConfirmando(false);

    try {
      setLoadingVenta(true);
      await axios.post("/vender", payload);

      toast.success("Venta registrada correctamente");

      setCantidad(1);
      setGustoId("");
      setModeloId("");
      setCodigoBarra("");
      setProductoDetectado(null);
      setQuery("");
      setIsOpen(false);
      setHighlightIndex(-1);

      await cargarGustosDisponibles(sucursalId);
      inputBuscarRef.current?.focus();
    } catch (err) {
      toast.error(err?.response?.data?.error || "❌ Error al registrar venta");
      console.error("❌ Error detalle:", err);
    } finally {
      setLoadingVenta(false);
    }
  };

  const iStyle = {
    background: "#111827",
    border: "1px solid #334155",
    color: "#fff",
    borderRadius: "8px",
  };

  const lStyle = {
    fontSize: "0.75rem",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.6px",
    marginBottom: "6px",
  };

  return (
    <div className="mt-4 px-3" style={{ maxWidth: "560px", margin: "0 auto" }}>

      {/* Título */}
      <div className="text-center mb-4">
        <h2 className="fw-bold mb-0">Registrar Venta</h2>
        <p className="text-white-50 small mb-0">
          {sucursalNombre ? sucursalNombre : "Seleccioná una sucursal para comenzar"}
        </p>
      </div>

      <form onSubmit={registrarVenta}>

        {/* Sucursal */}
        <div className="mb-4">
          <label style={lStyle}>Sucursal</label>
          {rol === "admin" ? (
            <select className="form-select" style={iStyle} value={sucursalId}
              onChange={(e) => setSucursalId(e.target.value)}
              required disabled={loadingSucursales || loadingVenta}>
              <option value="">{loadingSucursales ? "Cargando..." : "Seleccioná una sucursal"}</option>
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          ) : (
            <input type="text" className="form-control" style={{ ...iStyle, opacity: 0.6 }}
              value={sucursalNombre} disabled />
          )}
          {rol === "vendedor" && (
            <div className="mt-1" style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
              Vendés desde {sucursalNombre || "tu sucursal"}. El stock se descuenta de ahí.
            </div>
          )}
        </div>

        {/* Código de barras */}
        <div className="mb-4">
          <label style={lStyle}>Escanear código de barras (opcional)</label>
          <div className="d-flex gap-2">
            <input type="text" className="form-control input-dark flex-grow-1" style={iStyle}
              value={codigoBarra}
              onChange={(e) => setCodigoBarra(e.target.value)}
              placeholder="Escaneá el código"
              disabled={!sucursalId || loadingVenta}
              autoFocus
            />
            <span className="d-flex align-items-center px-3 rounded text-white-50 small"
              style={{ background: "#1e293b", border: "1px solid #334155", whiteSpace: "nowrap" }}>
              {loadingScan ? "Buscando..." : "Listo"}
            </span>
          </div>
          {productoDetectado && (
            <div className="mt-2 px-3 py-2 rounded small" style={{ background: "#0f3d24", border: "1px solid #198754", color: "#6ee7a0" }}>
              Detectado: <strong>{productoDetectado}</strong>
            </div>
          )}
        </div>

        {/* Vendedor: modelo y después sabor, solo lo que tiene stock */}
        {esVendedor && (
          <>
            <div className="mb-3">
              <label style={lStyle}>1. Modelo</label>
              <select className="form-select" style={{ ...iStyle, backgroundImage: "none" }}
                value={modeloId}
                onChange={(e) => { setModeloId(e.target.value); setGustoId(""); setCantidad(1); }}
                disabled={!sucursalId || loadingVenta || loadingGustos}>
                <option value="">{loadingGustos ? "Cargando..." : "Elegí el modelo"}</option>
                {modelos.map((m) => (
                  <option key={m.id} value={m.id}>{m.nombre} ({m.stock})</option>
                ))}
              </select>
            </div>
            {modeloId && (
              <div className="mb-4">
                <label style={lStyle}>2. Sabor</label>
                <div className="d-flex flex-wrap gap-2">
                  {saboresDelModelo.map((g) => {
                    const activo = String(g.gusto_id) === String(gustoId);
                    return (
                      <button key={g.gusto_id} type="button"
                        onClick={() => { setGustoId(String(g.gusto_id)); setCantidad(1); }}
                        disabled={loadingVenta}
                        style={{
                          background: activo ? "#166534" : "#111827",
                          border: `1px solid ${activo ? "#22c55e" : "#334155"}`,
                          color: activo ? "#fff" : "#e2e8f0",
                          borderRadius: 8, padding: "8px 12px", fontSize: "0.88rem",
                        }}>
                        {g.gusto} <span style={{ color: activo ? "#bbf7d0" : "#64748b" }}>· {g.stock}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Autocomplete */}
        {!esVendedor && (
        <div className="mb-4" ref={autocompleteRef} style={{ position: "relative" }}>
          <div className="d-flex justify-content-between align-items-center mb-1">
            <label style={lStyle} className="mb-0">Buscar producto o gusto</label>
            <div className="form-check mb-0">
              <input className="form-check-input" type="checkbox" id="mostrarSinStock"
                checked={mostrarSinStock}
                onChange={(e) => setMostrarSinStock(e.target.checked)}
                disabled={!sucursalId || loadingVenta}
              />
              <label className="form-check-label text-white-50 small" htmlFor="mostrarSinStock">
                Mostrar sin stock
              </label>
            </div>
          </div>

          <input ref={inputBuscarRef} type="text" className="form-control input-dark"
            style={iStyle} value={query}
            onChange={(e) => { setQuery(e.target.value); setIsOpen(true); setHighlightIndex(-1); setGustoId(""); }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={onKeyDownBuscar}
            placeholder="Ej: Ignite, mango, ice, uva..."
            disabled={!sucursalId || loadingVenta || loadingGustos}
          />

          {/* Dropdown */}
          {isOpen && sucursalId && (
            <div className="position-absolute w-100" style={{
              zIndex: 1000, maxHeight: 260, overflowY: "auto",
              top: "100%", left: 0, right: 0,
              background: "#0f1623", border: "1px solid #1e293b",
              borderRadius: "8px", marginTop: "4px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            }}>
              {loadingGustos ? (
                <div className="px-3 py-2 text-white-50 small">Cargando productos...</div>
              ) : resultados.length === 0 ? (
                <div className="px-3 py-2 text-white-50 small">Sin resultados</div>
              ) : (
                resultados.map((g, idx) => {
                  const sinStock = Number(g.stock) <= 0;
                  const active = idx === highlightIndex;
                  return (
                    <button key={g.gusto_id} type="button"
                      className="d-flex justify-content-between align-items-center w-100 px-3 py-2"
                      style={{
                        background: active ? "#1e293b" : "transparent",
                        border: "none", borderBottom: "1px solid #1a2236",
                        color: sinStock ? "#4b5563" : "#e2e8f0",
                        cursor: sinStock ? "not-allowed" : "pointer",
                        fontSize: "0.88rem",
                      }}
                      onMouseEnter={() => setHighlightIndex(idx)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => seleccionarItem(g)}
                      disabled={sinStock}
                    >
                      <span>{g.producto_nombre} - {g.gusto}{sinStock && <span className="ms-2 text-muted">(Sin stock)</span>}</span>
                      <span className="badge ms-2" style={{ background: sinStock ? "#1e293b" : "#166534", color: sinStock ? "#4b5563" : "#6ee7a0" }}>
                        {g.stock}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {seleccionado && (
            <div className="mt-2 px-3 py-2 rounded small" style={{ background: "#0c1f3a", border: "1px solid #1e40af", color: "#93c5fd" }}>
              <strong>{labelGusto(seleccionado)}</strong> — Stock disponible: <strong>{seleccionado.stock}</strong>
            </div>
          )}
        </div>
        )}

        {/* Precio fijo del vendedor — no se edita */}
        {gustoId && esVendedor && (
          <div className="mb-4 px-3 py-2 rounded" style={{
            background: sinPrecio ? "#3b1d1d" : "#0c1f3a",
            border: `1px solid ${sinPrecio ? "#dc2626" : "#1e40af"}`,
            color: sinPrecio ? "#fca5a5" : "#93c5fd", fontSize: "0.9rem",
          }}>
            {sinPrecio
              ? "Este modelo todavía no tiene precio de vendedor. Avisale al administrador."
              : <>Tu precio por unidad: <strong>${Number(precioUnitario).toLocaleString("es-AR")}</strong></>}
          </div>
        )}

        {/* Cantidad */}
        <div className="mb-4">
          <label style={lStyle}>Cantidad</label>
          <div className="d-flex gap-2">
            <button type="button" className="btn" style={{ ...iStyle, width: 52, fontSize: "1.2rem" }}
              onClick={() => setCantidad((c) => Math.max(1, Number(c) - 1))}
              disabled={formDisabled || !gustoId}>−</button>
            <input type="number" className="form-control input-dark text-center" style={iStyle}
              min="1" max={seleccionado ? Number(seleccionado.stock) : undefined} value={cantidad}
              onChange={(e) => setCantidad(Number(e.target.value))}
              required disabled={formDisabled || !gustoId}
            />
            <button type="button" className="btn" style={{ ...iStyle, width: 52, fontSize: "1.2rem" }}
              onClick={() => setCantidad((c) => Math.min(Number(seleccionado?.stock) || 1, Number(c) + 1))}
              disabled={formDisabled || !gustoId}>+</button>
          </div>
        </div>

        {/* Botón */}
        <button type="submit"
          className="btn w-100 fw-semibold py-2"
          style={{
            background: formDisabled || !gustoId ? "#1e293b" : "linear-gradient(135deg, #166534, #16a34a)",
            border: "none", borderRadius: "8px", color: "#fff",
            fontSize: "1rem", letterSpacing: "0.3px",
            opacity: formDisabled || !gustoId ? 0.5 : 1,
            transition: "opacity 0.2s",
          }}
          disabled={formDisabled || !gustoId || sinPrecio}
        >
          {loadingVenta ? "Registrando..." : esVendedor ? "Revisar venta" : "Confirmar Venta"}
        </button>
      </form>

      {/* Confirmación del vendedor: todo en grande antes de registrar */}
      {confirmando && seleccionado && (
        <div onClick={() => setConfirmando(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 2000,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: "#111827", border: "1px solid #334155", borderRadius: 14,
            padding: 24, width: "100%", maxWidth: 420, color: "#e2e8f0",
          }}>
            <div style={{ ...lStyle, marginBottom: 12 }}>¿Está bien esta venta?</div>
            <div style={{ fontSize: "0.95rem", color: "#94a3b8" }}>{seleccionado.producto_nombre}</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 12 }}>{seleccionado.gusto}</div>
            <div className="d-flex justify-content-between" style={{ fontSize: "1.05rem" }}>
              <span>Cantidad</span><strong>{cantidad}</strong>
            </div>
            <div className="d-flex justify-content-between" style={{ fontSize: "1.05rem" }}>
              <span>Precio por unidad</span><strong>${Number(precioUnitario).toLocaleString("es-AR")}</strong>
            </div>
            <div className="d-flex justify-content-between mt-2 pt-2" style={{ borderTop: "1px solid #334155", fontSize: "1.3rem" }}>
              <span>Total</span>
              <strong style={{ color: "#22c55e" }}>${(Number(precioUnitario) * Number(cantidad)).toLocaleString("es-AR")}</strong>
            </div>
            <div className="d-flex gap-2 mt-4">
              <button type="button" className="btn flex-fill" style={{ background: "#1e293b", color: "#e2e8f0", border: "1px solid #334155" }}
                onClick={() => setConfirmando(false)}>Volver</button>
              <button type="button" className="btn flex-fill fw-semibold" style={{ background: "#16a34a", color: "#fff", border: "none" }}
                onClick={() => registrarVenta()} disabled={loadingVenta}>
                {loadingVenta ? "Registrando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RegistrarVenta;
