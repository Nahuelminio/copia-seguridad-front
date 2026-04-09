import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../utils/axiosInstance";
import { toast } from "react-toastify";
import { jwtDecode } from "jwt-decode";
import FacturaMayorista from "../components/FacturaMayorista";

function formatUsd(n) {
  return Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatFecha(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const BADGE = {
  pendiente: "bg-warning text-dark",
  confirmado: "bg-success",
  cancelado: "bg-secondary",
};

// ─── Vista de detalle / factura ───────────────────────────────────────────────
function DetallePedido({ pedidoId, onVolver }) {
  const [pedido, setPedido] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    axios
      .get(`/mayorista/pedidos/${pedidoId}`)
      .then((r) => setPedido(r.data))
      .catch(() => toast.error("Error al cargar el pedido"))
      .finally(() => setCargando(false));
  }, [pedidoId]);

  if (cargando) return <p className="text-center text-muted mt-5">Cargando…</p>;
  if (!pedido) return null;

  return (
    <FacturaMayorista
      pedido={pedido}
      pedidoId={pedidoId}
      modoVer={pedido.estado !== "pendiente"}
      onVolver={onVolver}
    />
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function PedidosMayorista() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroCliente, setFiltroCliente] = useState("");         // 6. filtro por cliente
  const [filtroClienteInput, setFiltroClienteInput] = useState(""); // input controlado
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pedidoDetalle, setPedidoDetalle] = useState(null);
  const [clientes, setClientes] = useState([]);                   // 6. lista clientes para filtro
  const [mostrarDropFiltro, setMostrarDropFiltro] = useState(false);
  const [deletingId, setDeletingId] = useState(null);            // loading en botón cancelar

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) jwtDecode(token); // solo para verificar token válido
    // cargar clientes para el filtro
    axios.get("/mayorista/clientes").then((r) => setClientes(r.data || [])).catch(() => {});
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params = new URLSearchParams({ page, limit: 30 });
      if (filtroEstado) params.set("estado", filtroEstado);
      if (filtroCliente) params.set("cliente_id", filtroCliente);
      const res = await axios.get(`/mayorista/pedidos?${params}`);
      setPedidos(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);
    } catch {
      toast.error("Error al cargar pedidos");
    } finally {
      setCargando(false);
    }
  }, [filtroEstado, filtroCliente, page]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cancelarPedido = async (id) => {
    if (!window.confirm("¿Cancelar este pedido?")) return;
    setDeletingId(id);
    try {
      await axios.delete(`/mayorista/pedidos/${id}`);
      toast.success("Pedido cancelado");
      cargar();
    } catch (e) {
      toast.error(e.response?.data?.error || "Error al cancelar");
    } finally {
      setDeletingId(null);
    }
  };

  // clientes filtrados para el dropdown del filtro
  const clientesFiltroFiltrados = filtroClienteInput.trim()
    ? clientes.filter((c) =>
        c.nombre.toLowerCase().includes(filtroClienteInput.toLowerCase())
      )
    : clientes.slice(0, 10);

  // vista detalle
  if (pedidoDetalle !== null) {
    return (
      <DetallePedido
        pedidoId={pedidoDetalle}
        onVolver={() => {
          setPedidoDetalle(null);
          cargar();
        }}
      />
    );
  }

  return (
    <div className="container py-4" style={{ maxWidth: 960 }}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <h4 className="mb-0 fw-bold">Pedidos Mayoristas</h4>
        <button className="btn btn-primary btn-sm" onClick={() => navigate("/mayorista/nuevo")}>
          + Nuevo pedido
        </button>
      </div>

      {/* Filtros */}
      <div className="d-flex gap-3 mb-3 flex-wrap align-items-end">
        {/* Filtro estado */}
        <div className="d-flex gap-2 flex-wrap">
          {["", "pendiente", "confirmado", "cancelado"].map((e) => (
            <button
              key={e}
              className={`btn btn-sm ${filtroEstado === e ? "btn-primary" : "btn-outline-secondary"}`}
              onClick={() => { setFiltroEstado(e); setPage(1); }}
            >
              {e === "" ? "Todos" : e.charAt(0).toUpperCase() + e.slice(1)}
            </button>
          ))}
        </div>

        {/* 6. Filtro por cliente */}
        <div className="position-relative" style={{ minWidth: 220 }}>
          <input
            className="form-control form-control-sm input-dark"
            style={inputDark}
            placeholder="Filtrar por cliente..."
            value={filtroClienteInput}
            onChange={(e) => { setFiltroClienteInput(e.target.value); setMostrarDropFiltro(true); }}
            onFocus={() => setMostrarDropFiltro(true)}
            onBlur={() => setTimeout(() => setMostrarDropFiltro(false), 180)}
          />
          {filtroCliente && (
            <button
              className="btn btn-sm btn-link position-absolute top-50 end-0 translate-middle-y pe-2"
              style={{ color: "#94a3b8", textDecoration: "none" }}
              onClick={() => { setFiltroCliente(""); setFiltroClienteInput(""); setPage(1); }}
              title="Quitar filtro"
            >
              ×
            </button>
          )}
          {mostrarDropFiltro && clientesFiltroFiltrados.length > 0 && (
            <ul
              className="dropdown-menu show w-100"
              style={{ background: "#1e2530", border: "1px solid rgba(255,255,255,0.15)", zIndex: 999 }}
            >
              {clientesFiltroFiltrados.map((c) => (
                <li key={c.id}>
                  <button
                    className="dropdown-item"
                    style={{ color: "#fff" }}
                    onMouseDown={() => {
                      setFiltroCliente(c.id);
                      setFiltroClienteInput(c.nombre);
                      setMostrarDropFiltro(false);
                      setPage(1);
                    }}
                  >
                    {c.nombre}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Tabla */}
      {cargando ? (
        <p className="text-muted text-center mt-5">Cargando…</p>
      ) : pedidos.length === 0 ? (
        <div
          className="text-center text-muted py-5"
          style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10 }}
        >
          No hay pedidos {filtroEstado ? `con estado "${filtroEstado}"` : ""}
          {filtroCliente ? ` para ese cliente` : ""}
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-dark table-hover align-middle">
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th className="text-end">Total USD</th>
                <th className="text-end">Total ARS</th>
                <th className="text-center">Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => (
                <tr key={p.id}>
                  <td className="text-muted small">{p.id}</td>
                  <td>
                    <div className="fw-semibold">{p.cliente_nombre}</div>
                    {p.cliente_telefono && (
                      <div className="text-muted small">{p.cliente_telefono}</div>
                    )}
                  </td>
                  <td className="small text-muted">{formatFecha(p.fecha_creacion)}</td>
                  <td className="text-end fw-semibold">$ {formatUsd(p.total_usd)}</td>
                  <td className="text-end small text-muted">
                    {p.total_ars > 0
                      ? `$ ${Number(p.total_ars).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`
                      : "—"}
                  </td>
                  <td className="text-center">
                    <span className={`badge ${BADGE[p.estado] || "bg-secondary"}`}>
                      {p.estado}
                    </span>
                  </td>
                  <td>
                    <div className="d-flex gap-1 justify-content-end">
                      <button
                        className="btn btn-sm btn-outline-light"
                        onClick={() => setPedidoDetalle(p.id)}
                      >
                        Ver
                      </button>
                      {p.estado === "pendiente" && (
                        <>
                          <button
                            className="btn btn-sm btn-outline-warning"
                            onClick={() => navigate(`/mayorista/pedidos/${p.id}/editar`)}
                          >
                            Editar
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            disabled={deletingId === p.id}
                            onClick={() => cancelarPedido(p.id)}
                          >
                            {deletingId === p.id ? "…" : "Cancelar"}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-center gap-2 mt-3">
          <button
            className="btn btn-sm btn-outline-secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ‹ Anterior
          </button>
          <span className="align-self-center small text-muted">{page} / {totalPages}</span>
          <button
            className="btn btn-sm btn-outline-secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente ›
          </button>
        </div>
      )}
    </div>
  );
}

const inputDark = {
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.2)",
  color: "#fff",
};
