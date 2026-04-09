import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "../utils/axiosInstance";
import { toast } from "react-toastify";
import { jwtDecode } from "jwt-decode";
import FacturaMayorista from "../components/FacturaMayorista";

// ─── helpers ─────────────────────────────────────────────────────────────────

const normalizar = (str = "") =>
  String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

function formatUsd(n) {
  return Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function NuevoPedidoMayorista() {
  const navigate = useNavigate();
  const { id: pedidoId } = useParams();

  // ── Estado del pedido ──
  const [cliente, setCliente] = useState(null);
  const [tipoCambio, setTipoCambio] = useState("");
  const [notas, setNotas] = useState("");
  const [items, setItems] = useState([]);

  // ── Búsqueda de clientes ──
  const [queryCliente, setQueryCliente] = useState("");
  const [clientesSugeridos, setClientesSugeridos] = useState([]);
  const [mostrarDropCliente, setMostrarDropCliente] = useState(false);
  const [mostrarModalCliente, setMostrarModalCliente] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({ nombre: "", telefono: "", observaciones: "" });

  // ── Búsqueda de productos ──
  const [queryProducto, setQueryProducto] = useState("");
  const [productos, setProductos] = useState([]);
  // productosFiltrados se computa con useMemo (sin estado intermedio)
  const [mostrarDropProducto, setMostrarDropProducto] = useState(false);
  const [ocultarSinStock, setOcultarSinStock] = useState(true); // 8. toggle sin stock

  // ── UI ──
  const [loading, setLoading] = useState(false);
  const [mostrarFactura, setMostrarFactura] = useState(false);
  const [sucursalCentral, setSucursalCentral] = useState(null);
  const [rol, setRol] = useState(null);

  const clienteInputRef = useRef(null);
  const productoInputRef = useRef(null);

  // ── Init ──
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const dec = jwtDecode(token);
      setRol(dec.rol);
    }
    cargarSucursalCentral();
  }, []);

  useEffect(() => {
    if (sucursalCentral) cargarProductos(sucursalCentral.id);
  }, [sucursalCentral]);

  useEffect(() => {
    if (pedidoId) cargarPedidoExistente();
  }, [pedidoId]); // eslint-disable-line

  // ── Cargar sucursal central ──
  const cargarSucursalCentral = async () => {
    try {
      const res = await axios.get("/sucursales");
      const central = (res.data || []).find((s) => normalizar(s.nombre).includes("central"));
      setSucursalCentral(central || res.data?.[0] || null);
    } catch {
      toast.error("Error al cargar sucursales");
    }
  };

  // ── Cargar productos disponibles ──
  const cargarProductos = async (sucId) => {
    try {
      const res = await axios.get(`/disponibles?sucursal_id=${sucId}`);
      setProductos(res.data || []);
    } catch {
      toast.error("Error al cargar productos");
    }
  };

  // ── Cargar pedido para edición (9. con stock actualizado) ──
  const cargarPedidoExistente = async () => {
    try {
      const [resPedido, resSucursal] = await Promise.all([
        axios.get(`/mayorista/pedidos/${pedidoId}`),
        axios.get("/sucursales"),
      ]);
      const p = resPedido.data;

      // buscar sucursal central para obtener stock actualizado
      const central = (resSucursal.data || []).find((s) =>
        normalizar(s.nombre).includes("central")
      );
      setSucursalCentral(central || resSucursal.data?.[0] || null);

      // stock actualizado por gusto
      let stockMap = {};
      if (central) {
        try {
          const resStock = await axios.get(`/disponibles?sucursal_id=${central.id}`);
          (resStock.data || []).forEach((pr) => { stockMap[pr.gusto_id] = pr.stock; });
        } catch {}
      }

      setCliente({ id: p.cliente_id, nombre: p.cliente_nombre, telefono: p.cliente_telefono });
      setQueryCliente(p.cliente_nombre);
      setTipoCambio(String(p.tipo_cambio || ""));
      setNotas(p.notas || "");
      setItems(
        (p.items || []).map((it) => ({
          gusto_id: it.gusto_id,
          producto_nombre: it.producto_nombre,
          gusto: it.gusto,
          cantidad: it.cantidad,
          precio_usd: String(it.precio_usd),
          stock_disponible: stockMap[it.gusto_id] ?? undefined, // 9.
        }))
      );
    } catch {
      toast.error("Error al cargar el pedido");
    }
  };

  // ── Buscar clientes mayoristas ──
  useEffect(() => {
    if (!queryCliente.trim() || mostrarFactura) {
      setClientesSugeridos([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await axios.get(`/mayorista/clientes?q=${encodeURIComponent(queryCliente)}`);
        setClientesSugeridos(res.data || []);
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [queryCliente, mostrarFactura]);

  // ── Filtrar productos (8. respeta toggle sin stock) ──
  const productosFiltrados = useMemo(() => {
    if (!queryProducto.trim()) return [];
    const q = normalizar(queryProducto);
    let lista = productos.filter(
      (p) =>
        normalizar(p.producto_nombre).includes(q) ||
        normalizar(p.gusto).includes(q) ||
        (p.codigo_barra && p.codigo_barra.includes(q))
    );
    if (ocultarSinStock) lista = lista.filter((p) => p.stock > 0);
    return lista.slice(0, 20);
  }, [queryProducto, productos, ocultarSinStock]);

  // ── ESC para cerrar modales / dropdowns ──
  useEffect(() => {
    const handler = (e) => {
      if (e.key !== "Escape") return;
      if (mostrarModalCliente) { setMostrarModalCliente(false); return; }
      if (mostrarDropCliente) { setMostrarDropCliente(false); return; }
      if (mostrarDropProducto) { setMostrarDropProducto(false); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [mostrarModalCliente, mostrarDropCliente, mostrarDropProducto]);

  // ── Advertir antes de salir si hay cambios sin guardar ──
  useEffect(() => {
    const hayDatos = items.length > 0 || cliente !== null;
    if (!hayDatos) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [items, cliente]);

  // ── Seleccionar producto ──
  const seleccionarProducto = (p) => {
    const yaExiste = items.find((it) => it.gusto_id === p.gusto_id);
    if (yaExiste) {
      toast.info(`${p.producto_nombre} — ${p.gusto} ya está en el pedido`);
    } else {
      setItems((prev) => [
        ...prev,
        {
          gusto_id: p.gusto_id,
          producto_nombre: p.producto_nombre,
          gusto: p.gusto,
          cantidad: 1,
          precio_usd: "",
          stock_disponible: p.stock,
        },
      ]);
    }
    setQueryProducto("");
    setMostrarDropProducto(false);
    productoInputRef.current?.focus();
  };

  const actualizarItem = (gusto_id, campo, valor) =>
    setItems((prev) => prev.map((it) => (it.gusto_id === gusto_id ? { ...it, [campo]: valor } : it)));

  const eliminarItem = (gusto_id) =>
    setItems((prev) => prev.filter((it) => it.gusto_id !== gusto_id));

  // ── Totales ──
  const totalUsd = items.reduce(
    (acc, it) => acc + (parseFloat(it.precio_usd) || 0) * (parseInt(it.cantidad) || 0),
    0
  );
  const totalArs = parseFloat(tipoCambio) > 0 ? totalUsd * parseFloat(tipoCambio) : null;

  // ── Validación (2. precio debe ser > 0) ──
  const puedeGuardar =
    cliente &&
    items.length > 0 &&
    items.every((it) => it.cantidad > 0 && parseFloat(it.precio_usd) > 0);

  // ── Guardar borrador ──
  const guardarBorrador = async () => {
    if (!puedeGuardar) return;
    setLoading(true);
    try {
      const payload = {
        cliente_id: cliente.id,
        tipo_cambio: parseFloat(tipoCambio) || 0,
        notas,
        items: items.map((it) => ({
          gusto_id: it.gusto_id,
          cantidad: parseInt(it.cantidad),
          precio_usd: parseFloat(it.precio_usd),
        })),
        ...(rol === "admin" && sucursalCentral ? { sucursal_id: sucursalCentral.id } : {}),
      };
      if (pedidoId) {
        await axios.put(`/mayorista/pedidos/${pedidoId}`, payload);
        toast.success("Pedido actualizado");
      } else {
        const res = await axios.post("/mayorista/pedidos", payload);
        toast.success("Pedido guardado como borrador");
        navigate(`/mayorista/pedidos/${res.data.id}`);
      }
    } catch (e) {
      toast.error(e.response?.data?.error || "Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  // ── Crear cliente mayorista ──
  const crearClienteMayorista = async () => {
    if (!nuevoCliente.nombre.trim()) { toast.error("El nombre es obligatorio"); return; }
    try {
      const res = await axios.post("/mayorista/clientes", nuevoCliente);
      setCliente(res.data);
      setQueryCliente(res.data.nombre);
      setMostrarModalCliente(false);
      setNuevoCliente({ nombre: "", telefono: "", observaciones: "" });
      toast.success("Cliente creado");
    } catch (e) {
      toast.error(e.response?.data?.error || "Error al crear cliente");
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (mostrarFactura) {
    return (
      <FacturaMayorista
        pedido={{
          cliente_nombre: cliente?.nombre,
          cliente_telefono: cliente?.telefono,
          sucursal_nombre: sucursalCentral?.nombre || "Central",
          tipo_cambio: tipoCambio,
          notas,
          items,
          total_usd: totalUsd,
          total_ars: totalArs,
          fecha_creacion: new Date().toISOString(),
        }}
        onVolver={() => setMostrarFactura(false)}
      />
    );
  }

  return (
    <div className="container py-4" style={{ maxWidth: 860 }}>
      <div className="d-flex align-items-center gap-3 mb-4">
        <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate("/mayorista")}>
          ← Volver
        </button>
        <h4 className="mb-0 fw-bold">
          {pedidoId ? "Editar pedido mayorista" : "Nuevo pedido mayorista"}
        </h4>
      </div>

      {/* ── Cliente ── */}
      <div className="card mb-3" style={cardStyle}>
        <div className="card-body">
          <label className="form-label fw-semibold">Cliente mayorista</label>
          <div className="d-flex gap-2">
            <div className="position-relative flex-grow-1">
              <input
                ref={clienteInputRef}
                className="form-control input-dark"
                placeholder="Buscar cliente..."
                value={queryCliente}
                onChange={(e) => { setQueryCliente(e.target.value); setCliente(null); setMostrarDropCliente(true); }}
                onFocus={() => setMostrarDropCliente(true)}
                onBlur={() => setTimeout(() => setMostrarDropCliente(false), 180)}
                style={inputDark}
              />
              {/* 7. Dropdown con estado vacío */}
              {mostrarDropCliente && queryCliente.trim() && (
                <ul
                  className="dropdown-menu show w-100"
                  style={{ background: "#1e2530", border: "1px solid rgba(255,255,255,0.15)", zIndex: 999 }}
                >
                  {clientesSugeridos.length > 0 ? (
                    clientesSugeridos.map((c) => (
                      <li key={c.id}>
                        <button
                          className="dropdown-item"
                          style={{ color: "#fff" }}
                          onMouseDown={() => { setCliente(c); setQueryCliente(c.nombre); setMostrarDropCliente(false); }}
                        >
                          <strong>{c.nombre}</strong>
                          {c.telefono && (
                            <span style={{ color: "#94a3b8", marginLeft: 8, fontSize: "0.85rem" }}>
                              {c.telefono}
                            </span>
                          )}
                        </button>
                      </li>
                    ))
                  ) : (
                    // 7. No encontrado → sugerir crear
                    <li>
                      <button
                        className="dropdown-item d-flex align-items-center gap-2"
                        style={{ color: "#94a3b8", fontStyle: "italic" }}
                        onMouseDown={() => {
                          setNuevoCliente((p) => ({ ...p, nombre: queryCliente }));
                          setMostrarModalCliente(true);
                          setMostrarDropCliente(false);
                        }}
                      >
                        <span>Sin resultados —</span>
                        <span style={{ color: "#60a5fa" }}>+ Crear "{queryCliente}"</span>
                      </button>
                    </li>
                  )}
                </ul>
              )}
            </div>
            <button className="btn btn-outline-primary btn-sm" onClick={() => setMostrarModalCliente(true)}>
              + Nuevo
            </button>
          </div>
          {cliente && (
            <div className="mt-2 small text-success">
              ✓ {cliente.nombre}{cliente.telefono && ` · ${cliente.telefono}`}
            </div>
          )}
        </div>
      </div>

      {/* ── Tipo de cambio y notas ── */}
      <div className="card mb-3" style={cardStyle}>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-sm-4">
              <label className="form-label fw-semibold">Tipo de cambio (ARS por USD)</label>
              <input
                className="form-control input-dark"
                type="number"
                min="0"
                step="any"
                placeholder="Ej: 1250"
                value={tipoCambio}
                onChange={(e) => setTipoCambio(e.target.value)}
                style={inputDark}
              />
              <small style={{ userSelect: "none", color: "#64748b" }}>
                Opcional — para mostrar equivalente en ARS
              </small>
            </div>
            <div className="col-sm-8">
              <label className="form-label fw-semibold">Notas (opcional)</label>
              <textarea
                className="form-control input-dark"
                rows={2}
                placeholder="Observaciones del pedido..."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                style={inputDark}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Agregar productos ── */}
      <div className="card mb-3" style={cardStyle}>
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <label className="form-label fw-semibold mb-0">Agregar producto</label>
            {/* 8. Toggle sin stock */}
            <div className="form-check form-switch mb-0">
              <input
                className="form-check-input"
                type="checkbox"
                id="toggleSinStock"
                checked={ocultarSinStock}
                onChange={(e) => setOcultarSinStock(e.target.checked)}
              />
              <label className="form-check-label small" htmlFor="toggleSinStock" style={{ color: "#94a3b8" }}>
                Ocultar sin stock
              </label>
            </div>
          </div>
          <div className="position-relative">
            <input
              ref={productoInputRef}
              className="form-control input-dark"
              placeholder="Buscar por nombre, gusto o código de barras..."
              value={queryProducto}
              onChange={(e) => { setQueryProducto(e.target.value); setMostrarDropProducto(true); }}
              onFocus={() => setMostrarDropProducto(true)}
              onBlur={() => setTimeout(() => setMostrarDropProducto(false), 180)}
              style={inputDark}
            />
            {mostrarDropProducto && productosFiltrados.length > 0 && (
              <ul
                className="dropdown-menu show w-100"
                style={{ zIndex: 999, maxHeight: 260, overflowY: "auto", background: "#1e2530", border: "1px solid rgba(255,255,255,0.15)" }}
              >
                {productosFiltrados.map((p) => (
                  <li key={p.gusto_id}>
                    <button
                      className="dropdown-item d-flex justify-content-between align-items-center"
                      onMouseDown={() => seleccionarProducto(p)}
                      style={{ color: "#fff" }}
                    >
                      <span>
                        <span style={{ fontWeight: 600 }}>{p.producto_nombre}</span>
                        <span style={{ color: "#94a3b8", marginLeft: 6 }}>— {p.gusto}</span>
                      </span>
                      <span className={`badge ${p.stock > 0 ? "bg-success" : "bg-danger"} ms-2`}>
                        {p.stock} u.
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabla de ítems ── */}
      {items.length > 0 && (
        <div className="card mb-3" style={cardStyle}>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-dark table-hover mb-0">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th style={{ width: 90 }}>Cantidad</th>
                    <th style={{ width: 130 }}>Precio USD</th>
                    <th style={{ width: 110 }} className="text-end">Subtotal</th>
                    <th style={{ width: 42 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => {
                    const sinPrecio = !it.precio_usd || parseFloat(it.precio_usd) <= 0;
                    const stockBajo = it.stock_disponible !== undefined && it.stock_disponible < it.cantidad;
                    return (
                      <tr
                        key={it.gusto_id}
                        style={sinPrecio ? { borderLeft: "3px solid #f59e0b" } : {}} // 5. highlight sin precio
                      >
                        <td>
                          <div className="fw-semibold small">{it.producto_nombre}</div>
                          <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>{it.gusto}</div>
                          {it.stock_disponible !== undefined && (
                            <div
                              className="small"
                              style={{ fontSize: "0.73rem", color: stockBajo ? "#f87171" : "#4ade80" }}
                            >
                              Stock: {it.stock_disponible} u.
                              {stockBajo && " ⚠ insuficiente"}
                            </div>
                          )}
                          {/* 5. Aviso sin precio */}
                          {sinPrecio && (
                            <div style={{ fontSize: "0.72rem", color: "#f59e0b" }}>
                              ⚠ Falta ingresar precio
                            </div>
                          )}
                        </td>
                        <td>
                          <input
                            className="form-control form-control-sm text-center input-dark"
                            type="number"
                            min="1"
                            value={it.cantidad}
                            onChange={(e) =>
                              actualizarItem(it.gusto_id, "cantidad", Math.max(1, parseInt(e.target.value) || 1))
                            }
                            style={{ ...inputDark, width: 72 }}
                          />
                        </td>
                        <td>
                          <div className="input-group input-group-sm">
                            <span className="input-group-text bg-dark text-white border-secondary">$</span>
                            <input
                              className={`form-control input-dark ${sinPrecio ? "border-warning" : ""}`}
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              value={it.precio_usd}
                              onChange={(e) => actualizarItem(it.gusto_id, "precio_usd", e.target.value)}
                              style={{
                                ...inputDark,
                                borderColor: sinPrecio ? "#f59e0b" : undefined,
                              }}
                            />
                          </div>
                        </td>
                        <td className="text-end fw-semibold">
                          $ {formatUsd((parseFloat(it.precio_usd) || 0) * (parseInt(it.cantidad) || 0))}
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => eliminarItem(it.gusto_id)}
                            title="Eliminar"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="text-end fw-bold">Total USD</td>
                    <td className="text-end fw-bold text-warning">$ {formatUsd(totalUsd)}</td>
                    <td></td>
                  </tr>
                  {totalArs !== null && (
                    <tr>
                      <td colSpan={3} className="text-end fw-semibold small" style={{ color: "#64748b" }}>
                        Equivalente ARS (× {parseFloat(tipoCambio).toLocaleString("es-AR")})
                      </td>
                      <td className="text-end fw-semibold small text-info">
                        $ {totalArs.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                      </td>
                      <td></td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Acciones ── */}
      <div className="d-flex gap-2 flex-wrap align-items-center">
        <button
          className="btn btn-secondary"
          disabled={!puedeGuardar || loading}
          onClick={guardarBorrador}
          title={!puedeGuardar ? "Completá todos los precios antes de guardar" : ""}
        >
          {loading ? "Guardando..." : pedidoId ? "Actualizar borrador" : "Guardar borrador"}
        </button>
        {puedeGuardar && (
          <button className="btn btn-outline-info" onClick={() => setMostrarFactura(true)}>
            Ver factura
          </button>
        )}
        {/* 2. Aviso cuando hay items sin precio */}
        {items.length > 0 && !puedeGuardar && items.some((it) => !it.precio_usd || parseFloat(it.precio_usd) <= 0) && (
          <span style={{ color: "#f59e0b", fontSize: "0.82rem" }}>
            ⚠ Hay productos sin precio cargado
          </span>
        )}
      </div>

      {/* ── Modal nuevo cliente ── */}
      {mostrarModalCliente && (
        <div
          className="modal show d-block"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={(e) => e.target === e.currentTarget && setMostrarModalCliente(false)}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-dark text-white border-secondary">
              <div className="modal-header border-secondary">
                <h5 className="modal-title">Nuevo cliente mayorista</h5>
                <button className="btn-close btn-close-white" onClick={() => setMostrarModalCliente(false)} />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Nombre *</label>
                  <input
                    className="form-control input-dark"
                    style={inputDark}
                    value={nuevoCliente.nombre}
                    onChange={(e) => setNuevoCliente((p) => ({ ...p, nombre: e.target.value }))}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Teléfono</label>
                  <input
                    className="form-control input-dark"
                    style={inputDark}
                    value={nuevoCliente.telefono}
                    onChange={(e) => setNuevoCliente((p) => ({ ...p, telefono: e.target.value }))}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Observaciones</label>
                  <textarea
                    className="form-control input-dark"
                    style={inputDark}
                    rows={2}
                    value={nuevoCliente.observaciones}
                    onChange={(e) => setNuevoCliente((p) => ({ ...p, observaciones: e.target.value }))}
                  />
                </div>
              </div>
              <div className="modal-footer border-secondary">
                <button className="btn btn-outline-secondary" onClick={() => setMostrarModalCliente(false)}>
                  Cancelar
                </button>
                <button className="btn btn-primary" onClick={crearClienteMayorista}>
                  Crear cliente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const cardStyle = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10,
  color: "#fff",
};

const inputDark = {
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.2)",
  color: "#fff",
};
