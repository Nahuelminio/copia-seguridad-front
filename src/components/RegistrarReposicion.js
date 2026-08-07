import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "../utils/axiosInstance";
import { toast } from "react-toastify";

const iStyle = {
  background: "#0d1526",
  border: "1px solid #1e293b",
  color: "#e2e8f0",
  borderRadius: "8px",
};

const lStyle = {
  color: "#94a3b8",
  fontSize: "0.82rem",
  marginBottom: "4px",
};

function RegistrarReposicion() {
  const [gustosTodos, setGustosTodos] = useState([]);   // todos los gustos del sistema
  const [stockSucursal, setStockSucursal] = useState([]); // stock de la sucursal seleccionada
  const [sucursales, setSucursales] = useState([]);

  const [codigoBarra, setCodigoBarra] = useState("");
  const [productoDetectado, setProductoDetectado] = useState(null);

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const [mostrarSinStock, setMostrarSinStock] = useState(true);

  const [loadingSucursales, setLoadingSucursales] = useState(false);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [loadingScan, setLoadingScan] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  const lastScanRequestId = useRef(0);
  const autocompleteRef = useRef(null);
  const inputBuscarRef = useRef(null);

  const CENTRAL_ID = "7";

  const [form, setForm] = useState({
    gusto_id: "",
    sucursal_id: "",
    cantidad: "",
    precio_costo: "",
    precio_costo_usd: "",
  });

  const normalizar = (str = "") =>
    str
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const labelItem = (p) => `${p.producto_nombre} - ${p.gusto}`;

  // Carga inicial: todos los gustos + sucursales
  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoadingProductos(true);
        setLoadingSucursales(true);
        const [gustosRes, sucRes] = await Promise.all([
          axios.get("/gustos-todos"),
          axios.get("/sucursales"),
        ]);
        setGustosTodos(gustosRes.data || []);
        setSucursales(sucRes.data || []);
      } catch {
        toast.error("Error al cargar datos iniciales");
      } finally {
        setLoadingProductos(false);
        setLoadingSucursales(false);
      }
    };
    fetchAll();
  }, []);

  // Cuando cambia la sucursal, carga el stock de esa sucursal para mostrar cantidades
  useEffect(() => {
    if (!form.sucursal_id) { setStockSucursal([]); return; }
    axios.get(`/disponibles?sucursal_id=${form.sucursal_id}`)
      .then(r => setStockSucursal(r.data || []))
      .catch(() => setStockSucursal([]));
  }, [form.sucursal_id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "sucursal_id") {
      setForm((prev) => ({ ...prev, sucursal_id: value, gusto_id: "", cantidad: "", precio_costo: "", precio_costo_usd: "" }));
      setCodigoBarra("");
      setProductoDetectado(null);
      setQuery("");
      setIsOpen(false);
      setHighlightIndex(-1);
      setMostrarSinStock(true);
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Todos los gustos enriquecidos con el stock de la sucursal seleccionada
  const productosConStock = useMemo(() => {
    return gustosTodos.map((g) => {
      const stockRow = stockSucursal.find((s) => String(s.gusto_id) === String(g.gusto_id));
      return { ...g, stock: stockRow ? Number(stockRow.stock) : 0 };
    });
  }, [gustosTodos, stockSucursal]);

  const seleccionado = useMemo(() => {
    return productosConStock.find((p) => String(p.gusto_id) === String(form.gusto_id)) || null;
  }, [productosConStock, form.gusto_id]);

  const resultados = useMemo(() => {
    if (!form.sucursal_id) return [];
    const q = normalizar(query);
    let list = productosConStock;
    if (!mostrarSinStock) {
      list = list.filter((p) => p.stock > 0);
    }
    if (q) {
      list = list.filter((p) => {
        const prod = normalizar(p.producto_nombre);
        const gus = normalizar(p.gusto);
        return prod.includes(q) || gus.includes(q);
      });
    }
    return list.slice(0, 12);
  }, [productosConStock, form.sucursal_id, query, mostrarSinStock]);

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

  const seleccionarItem = (p) => {
    if (!p) return;
    setForm((prev) => ({ ...prev, gusto_id: String(p.gusto_id) }));
    setQuery(labelItem(p));
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
    if (e.key === "Enter" && isOpen) {
      e.preventDefault();
      const p = resultados[highlightIndex] || resultados[0];
      seleccionarItem(p);
    }
  };

  useEffect(() => {
    if (!codigoBarra || !form.sucursal_id) {
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
          `/buscar-por-codigo/${encodeURIComponent(trimmed)}?sucursal_id=${form.sucursal_id}`
        );
        if (requestId !== lastScanRequestId.current) return;
        const gusto = res.data;
        setForm((prev) => ({ ...prev, gusto_id: String(gusto.gusto_id) }));
        setProductoDetectado(`${gusto.producto_nombre} - ${gusto.gusto}`);
        setQuery(`${gusto.producto_nombre} - ${gusto.gusto}`);
        setIsOpen(false);
        setHighlightIndex(-1);
      } catch {
        setForm((prev) => ({ ...prev, gusto_id: "" }));
        setProductoDetectado(null);
        if (trimmed.length >= 6) toast.error("Código no encontrado");
      } finally {
        if (requestId === lastScanRequestId.current) setLoadingScan(false);
      }
    }, 250);
    return () => clearTimeout(delay);
  }, [codigoBarra, form.sucursal_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.gusto_id || !form.sucursal_id) {
      toast.error("Seleccioná sucursal y producto");
      return;
    }
    const cant = Number(form.cantidad);
    if (!cant || cant < 1) {
      toast.error("Cantidad inválida");
      return;
    }
    try {
      setLoadingSubmit(true);
      const payload = {
        gusto_id: Number(form.gusto_id),
        sucursal_id: Number(form.sucursal_id),
        cantidad: cant,
      };
      if (form.sucursal_id === CENTRAL_ID && form.precio_costo !== "") {
        payload.precio_costo = Number(form.precio_costo);
      }
      // El USD es lo que cobra el proveedor: queda guardado por compra, así el
      // costo en pesos se puede comparar contra el dólar de cada momento.
      if (form.sucursal_id === CENTRAL_ID && form.precio_costo_usd !== "") {
        payload.precio_costo_usd = Number(form.precio_costo_usd);
      }
      await axios.post("/reposicion", payload);
      toast.success("Reposición registrada correctamente");
      setForm((prev) => ({ ...prev, gusto_id: "", cantidad: "", precio_costo: "", precio_costo_usd: "" }));
      setCodigoBarra("");
      setProductoDetectado(null);
      setQuery("");
      setIsOpen(false);
      setHighlightIndex(-1);
      // Refresca el stock de la sucursal seleccionada
      try {
        if (form.sucursal_id) {
          const r = await axios.get(`/disponibles?sucursal_id=${form.sucursal_id}`);
          setStockSucursal(r.data || []);
        }
      } catch {}
      inputBuscarRef.current?.focus();
    } catch {
      toast.error("Error al registrar la reposición");
    } finally {
      setLoadingSubmit(false);
    }
  };

  return (
    <div
      className="container mt-5"
      style={{ maxWidth: 560 }}
    >
      <div className="mb-4">
        <h4 style={{ color: "#f1f5f9", fontWeight: 700, marginBottom: 2 }}>
          Registrar Reposición
        </h4>
        <p style={{ color: "#64748b", fontSize: "0.85rem", margin: 0 }}>
          Cargá stock a una sucursal — incluye productos sin stock
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          background: "#111827",
          border: "1px solid #1e293b",
          borderRadius: 14,
          padding: "28px 28px 24px",
        }}
      >
        {/* Sucursal */}
        <div className="mb-3">
          <label style={lStyle}>Sucursal</label>
          <select
            className="form-select"
            name="sucursal_id"
            value={form.sucursal_id}
            onChange={handleChange}
            required
            disabled={loadingSucursales || loadingSubmit}
            style={iStyle}
          >
            <option value="">
              {loadingSucursales ? "Cargando sucursales..." : "Seleccionar sucursal"}
            </option>
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Código de barras */}
        <div className="mb-3">
          <label style={lStyle}>Escanear código de barras (opcional)</label>
          <div className="input-group">
            <input
              type="text"
              className="form-control input-dark"
              value={codigoBarra}
              onChange={(e) => setCodigoBarra(e.target.value)}
              placeholder="Escaneá el código..."
              disabled={!form.sucursal_id || loadingSubmit}
              autoFocus
              style={{ ...iStyle, borderRight: "none" }}
            />
            <span
              className="input-group-text"
              style={{
                background: "#1e293b",
                border: "1px solid #1e293b",
                borderLeft: "none",
                color: "#94a3b8",
                fontSize: "0.8rem",
              }}
            >
              {loadingScan ? "..." : "OK"}
            </span>
          </div>
          {productoDetectado && (
            <div
              style={{
                background: "rgba(16,185,129,0.1)",
                border: "1px solid rgba(16,185,129,0.3)",
                borderRadius: 8,
                padding: "8px 12px",
                marginTop: 8,
                color: "#6ee7a0",
                fontSize: "0.85rem",
              }}
            >
              Detectado: <strong>{productoDetectado}</strong>
            </div>
          )}
        </div>

        {/* Autocomplete */}
        <div className="mb-3" ref={autocompleteRef} style={{ position: "relative" }}>
          <div className="d-flex justify-content-between align-items-center mb-1">
            <label style={{ ...lStyle, marginBottom: 0 }}>Buscar producto o gusto</label>
            <div className="form-check mb-0">
              <input
                className="form-check-input"
                type="checkbox"
                id="mostrarSinStockRepo"
                checked={mostrarSinStock}
                onChange={(e) => setMostrarSinStock(e.target.checked)}
                disabled={!form.sucursal_id || loadingSubmit}
                style={{ cursor: "pointer" }}
              />
              <label
                className="form-check-label"
                htmlFor="mostrarSinStockRepo"
                style={{ color: "#64748b", fontSize: "0.78rem", cursor: "pointer" }}
              >
                Mostrar sin stock
              </label>
            </div>
          </div>

          <input
            ref={inputBuscarRef}
            type="text"
            className="form-control input-dark"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
              setHighlightIndex(-1);
              setForm((prev) => ({ ...prev, gusto_id: "" }));
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={onKeyDownBuscar}
            placeholder="Ej: Ignite, mango, ice, uva..."
            disabled={!form.sucursal_id || loadingSubmit || loadingProductos}
            style={iStyle}
          />

          {isOpen && form.sucursal_id && (
            <div
              className="position-absolute w-100"
              style={{
                zIndex: 1000,
                maxHeight: 260,
                overflowY: "auto",
                left: 0,
                right: 0,
                top: "calc(100% + 4px)",
                background: "#0d1526",
                border: "1px solid #1e293b",
                borderRadius: 8,
                boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
              }}
            >
              {loadingProductos ? (
                <div style={{ padding: "10px 14px", color: "#64748b", fontSize: "0.85rem" }}>
                  Cargando productos...
                </div>
              ) : resultados.length === 0 ? (
                <div style={{ padding: "10px 14px", color: "#64748b", fontSize: "0.85rem" }}>
                  Sin resultados
                </div>
              ) : (
                resultados.map((p, idx) => {
                  const sinStock = Number(p.stock) <= 0;
                  const active = idx === highlightIndex;

                  return (
                    <button
                      key={`${p.gusto_id}-${p.sucursal_id}-${idx}`}
                      type="button"
                      className="d-flex justify-content-between align-items-center w-100"
                      onMouseEnter={() => setHighlightIndex(idx)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => seleccionarItem(p)}
                      style={{
                        background: active ? "#1e293b" : "transparent",
                        border: "none",
                        borderBottom: "1px solid #1e293b",
                        padding: "9px 14px",
                        color: sinStock ? "#f87171" : "#e2e8f0",
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        textAlign: "left",
                        width: "100%",
                      }}
                    >
                      <span>
                        {p.producto_nombre} - {p.gusto}
                        {sinStock && (
                          <span
                            style={{
                              marginLeft: 6,
                              fontSize: "0.75rem",
                              color: "#f87171",
                              opacity: 0.8,
                            }}
                          >
                            (sin stock)
                          </span>
                        )}
                      </span>
                      <span
                        style={{
                          background: sinStock ? "rgba(248,113,113,0.15)" : active ? "#334155" : "#1e293b",
                          color: sinStock ? "#f87171" : "#94a3b8",
                          borderRadius: 5,
                          padding: "1px 8px",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          minWidth: 28,
                          textAlign: "center",
                        }}
                      >
                        {p.stock}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {seleccionado && (
            <div
              style={{
                background: "rgba(99,102,241,0.1)",
                border: "1px solid rgba(99,102,241,0.25)",
                borderRadius: 8,
                padding: "8px 12px",
                marginTop: 8,
                color: "#a5b4fc",
                fontSize: "0.85rem",
              }}
            >
              Seleccionado: <strong>{labelItem(seleccionado)}</strong>
              <span style={{ color: "#64748b", marginLeft: 8 }}>
                — Stock actual:{" "}
                <strong style={{ color: Number(seleccionado.stock) <= 0 ? "#f87171" : "#6ee7a0" }}>
                  {seleccionado.stock}
                </strong>
              </span>
            </div>
          )}
        </div>

        {/* Cantidad */}
        <div className="mb-3">
          <label style={lStyle}>Cantidad a reponer</label>
          <input
            type="number"
            className="form-control"
            name="cantidad"
            value={form.cantidad}
            onChange={handleChange}
            required
            min="1"
            disabled={!form.gusto_id || loadingSubmit}
            style={iStyle}
          />
        </div>

        {/* Precio de costo — solo Central */}
        {form.sucursal_id === CENTRAL_ID && (
          <div className="mb-4">
            <label style={lStyle}>
              Precio de costo ($)
              <span style={{ color: "#475569", fontWeight: 400, marginLeft: 6 }}>— opcional</span>
            </label>
            <input
              type="number"
              className="form-control"
              name="precio_costo"
              value={form.precio_costo}
              onChange={handleChange}
              min="0"
              step="0.01"
              placeholder="¿Cuánto pagaste por unidad?"
              disabled={!form.gusto_id || loadingSubmit}
              style={iStyle}
            />
            <label style={{ ...lStyle, marginTop: 14 }}>
              Precio de costo (USD)
              <span style={{ color: "#475569", fontWeight: 400, marginLeft: 6 }}>— opcional</span>
            </label>
            <input
              type="number"
              className="form-control"
              name="precio_costo_usd"
              value={form.precio_costo_usd}
              onChange={handleChange}
              min="0"
              step="0.01"
              placeholder="¿Cuántos USD por unidad?"
              disabled={!form.gusto_id || loadingSubmit}
              style={iStyle}
            />
            {form.precio_costo !== "" && Number(form.precio_costo_usd) > 0 && (
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 4 }}>
                Te tomó el dólar a{" "}
                <strong style={{ color: "#e2e8f0" }}>
                  ${(Number(form.precio_costo) / Number(form.precio_costo_usd)).toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                </strong>
              </div>
            )}

            {form.precio_costo !== "" && seleccionado?.precio && (
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 4 }}>
                Precio de venta actual: <strong style={{ color: "#e2e8f0" }}>${Number(seleccionado.precio).toLocaleString("es-AR")}</strong>
                {Number(form.precio_costo) > 0 && (
                  <span style={{ marginLeft: 8, color: "#10b981" }}>
                    → Margen: {(((Number(seleccionado.precio) - Number(form.precio_costo)) / Number(form.precio_costo)) * 100).toFixed(1)}%
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          className="w-100"
          disabled={!form.gusto_id || !form.cantidad || loadingSubmit}
          style={{
            background:
              !form.gusto_id || !form.cantidad || loadingSubmit
                ? "#1e293b"
                : "linear-gradient(135deg, #10b981, #059669)",
            border: "none",
            borderRadius: 9,
            color: !form.gusto_id || !form.cantidad || loadingSubmit ? "#475569" : "#fff",
            fontWeight: 600,
            fontSize: "0.95rem",
            padding: "11px 0",
            cursor: !form.gusto_id || !form.cantidad || loadingSubmit ? "not-allowed" : "pointer",
            transition: "opacity 0.2s",
          }}
        >
          {loadingSubmit ? "Registrando..." : "Registrar reposición"}
        </button>
      </form>
    </div>
  );
}

export default RegistrarReposicion;
