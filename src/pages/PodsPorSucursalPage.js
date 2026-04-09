import React, { useEffect, useMemo, useState } from "react";
import axios from "../utils/axiosInstance";
import { getUsuario } from "../utils/auth";

const inputStyle = {
  background: "#111827",
  border: "1px solid #334155",
  color: "#fff",
  borderRadius: "8px",
};

const selectStyle = {
  background: "#111827",
  border: "1px solid #334155",
  color: "#fff",
  borderRadius: "8px",
};

const labelStyle = {
  fontSize: "0.78rem",
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  marginBottom: "4px",
};

export default function PodsPorSucursalPage() {
  const usuario = getUsuario();
  const esAdmin = (usuario?.rol || "").toLowerCase() === "admin";

  const [data, setData] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [q, setQ] = useState("");
  const [soloConStock, setSoloConStock] = useState(true);
  const [sucursales, setSucursales] = useState([]);
  const [sucursalId, setSucursalId] = useState("");
  const [agrupar, setAgrupar] = useState("modelo");
  const [orden, setOrden] = useState("total_desc");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(200);

  useEffect(() => {
    if (!esAdmin) return;
    axios
      .get("/sucursales")
      .then((r) => setSucursales(r.data || []))
      .catch(() => setSucursales([]));
  }, [esAdmin]);

  const fetchData = () => {
    setCargando(true);
    axios
      .get("/pods-por-sucursal", {
        params: {
          q: q || undefined,
          solo_con_stock: soloConStock ? 1 : 0,
          sucursal_id: esAdmin && sucursalId ? Number(sucursalId) : undefined,
          agrupar,
          orden,
          page,
          page_size: pageSize || undefined,
        },
      })
      .then((r) => setData(Array.isArray(r.data) ? r.data : []))
      .catch(() => setData())
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soloConStock, sucursalId, agrupar, orden, page, pageSize]);

  const agrupado = useMemo(() => {
    const map = new Map();
    for (const row of data) {
      const key = row.sucursal_id;
      if (!map.has(key)) map.set(key, { sucursal: row.sucursal, items: [] });
      map.get(key).items.push({ pod: row.pod, total: Number(row.total || 0) });
    }
    const cmp =
      orden === "total_asc"
        ? (a, b) => a.total - b.total || a.pod.localeCompare(b.pod)
        : orden === "pod"
        ? (a, b) => a.pod.localeCompare(b.pod)
        : (a, b) => b.total - a.total || a.pod.localeCompare(b.pod);

    for (const grp of map.values()) grp.items.sort(cmp);
    return Array.from(map.values()).sort((a, b) => a.sucursal.localeCompare(b.sucursal));
  }, [data, orden]);

  const totalGlobal = useMemo(
    () => data.reduce((acc, r) => acc + Number(r.total || 0), 0),
    [data]
  );

  const handleBuscar = () => {
    if (page !== 0) setPage(0);
    else fetchData();
  };

  return (
    <div className="mt-4" style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 1rem" }}>

      {/* Título */}
      <div className="text-center mb-4">
        <h2 className="fw-bold mb-0">Pods por Sucursal</h2>
        <p className="text-white-50 small mb-0">Stock agrupado por sucursal</p>
      </div>

      {/* Filtros */}
      <div className="d-flex flex-wrap gap-3 mb-4 justify-content-center">
        <div style={{ minWidth: "220px", flex: "2" }}>
          <label style={labelStyle}>Buscar</label>
          <input
            className="form-control input-dark"
            style={inputStyle}
            placeholder="Producto, gusto, código..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
          />
        </div>

        {esAdmin && (
          <div style={{ minWidth: "150px", flex: "1" }}>
            <label style={labelStyle}>Sucursal</label>
            <select className="form-select" style={selectStyle} value={sucursalId}
              onChange={(e) => { setSucursalId(e.target.value); setPage(0); }}>
              <option value="">Todas</option>
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>
        )}

        <div style={{ minWidth: "130px", flex: "1" }}>
          <label style={labelStyle}>Agrupar por</label>
          <select className="form-select" style={selectStyle} value={agrupar}
            onChange={(e) => { setAgrupar(e.target.value); setPage(0); }}>
            <option value="modelo">Modelo</option>
            <option value="gusto">Gusto</option>
          </select>
        </div>

        <div style={{ minWidth: "140px", flex: "1" }}>
          <label style={labelStyle}>Orden</label>
          <select className="form-select" style={selectStyle} value={orden}
            onChange={(e) => setOrden(e.target.value)}>
            <option value="total_desc">Total mayor</option>
            <option value="total_asc">Total menor</option>
            <option value="pod">Nombre A–Z</option>
            <option value="sucursal">Sucursal</option>
          </select>
        </div>

<div className="d-flex gap-3 align-items-end" style={{ flex: "0" }}>
          <div className="form-check mb-1 d-flex align-items-center gap-2" style={{ whiteSpace: "nowrap" }}>
            <input id="chkStock" className="form-check-input" type="checkbox"
              checked={soloConStock}
              onChange={(e) => { setSoloConStock(e.target.checked); setPage(0); }}
            />
            <label className="form-check-label text-white-50 small" htmlFor="chkStock">
              Solo con stock
            </label>
          </div>
          <button
            className="btn fw-medium mb-1"
            style={{ background: "#1e293b", color: "#fff", border: "1px solid #334155", borderRadius: "8px", whiteSpace: "nowrap" }}
            onClick={handleBuscar}
          >
            Buscar
          </button>
        </div>
      </div>

      {/* Paginación */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <span className="text-white small">
          Página <strong>{page + 1}</strong>
        </span>
        <div className="d-flex gap-2">
          <button
            className="btn btn-sm"
            style={{ background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", borderRadius: "6px" }}
            disabled={page <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Anterior
          </button>
          <button
            className="btn btn-sm"
            style={{ background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", borderRadius: "6px" }}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </button>
        </div>
      </div>

      {/* Contenido */}
      {cargando ? (
        <div className="text-center text-white-50 py-5">Cargando...</div>
      ) : agrupado.length === 0 ? (
        <div className="text-center text-white-50 py-5">Sin resultados.</div>
      ) : (
        <>
          {/* Total global */}
          <div className="mb-4 px-3 py-2 d-inline-block rounded" style={{ background: "#111827", border: "1px solid #1e293b", fontSize: "0.88rem" }}>
            <span className="text-white-50">Total global de pods:</span>{" "}
            <strong className="text-white">{totalGlobal}</strong>
          </div>

          {/* Tablas por sucursal */}
          <div className="row g-4 justify-content-center">
            {agrupado.map((grp, idx) => {
              const subtotal = grp.items.reduce((acc, it) => acc + Number(it.total || 0), 0);
              return (
                <div key={idx} className="col-12 col-lg-7">
                  <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #1e293b" }}>
                    {/* Header sucursal */}
                    <div className="d-flex justify-content-between align-items-center px-4 py-3" style={{ background: "#111827", borderBottom: "1px solid #1e293b" }}>
                      <span className="fw-semibold text-white">{grp.sucursal}</span>
                      <span className="badge rounded-pill" style={{ background: "#1e293b", color: "#94a3b8" }}>
                        {subtotal} unidades
                      </span>
                    </div>

                    {/* Tabla desktop */}
                    <div className="d-none d-sm-block table-responsive">
                      <table className="table table-dark table-hover align-middle mb-0" style={{ fontSize: "0.88rem" }}>
                        <thead>
                          <tr style={{ color: "#64748b", borderBottom: "1px solid #1e293b" }}>
                            <th className="fw-normal py-2 px-4" style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Pod</th>
                            <th className="fw-normal py-2 px-4 text-end" style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Cantidad</th>
                          </tr>
                        </thead>
                        <tbody>
                          {grp.items.map((it, j) => (
                            <tr key={j}>
                              <td className="px-4 py-2 text-white">{it.pod}</td>
                              <td className="px-4 py-2 text-end fw-semibold" style={{ color: it.total === 0 ? "#dc3545" : it.total <= 3 ? "#ffc107" : "#6ee7a0" }}>
                                {it.total}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ borderTop: "1px solid #1e293b" }}>
                            <td className="px-4 py-2 text-white-50 small">Total sucursal</td>
                            <td className="px-4 py-2 text-end fw-bold text-white">{subtotal}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Cards mobile */}
                    <div className="d-sm-none" style={{ background: "#0f172a" }}>
                      {grp.items.map((it, j) => (
                        <div key={j} className="d-flex justify-content-between align-items-center px-4 py-2" style={{ borderBottom: "1px solid #1e293b" }}>
                          <span className="text-white small">{it.pod}</span>
                          <span className="fw-semibold small" style={{ color: it.total === 0 ? "#dc3545" : it.total <= 3 ? "#ffc107" : "#6ee7a0" }}>
                            {it.total}
                          </span>
                        </div>
                      ))}
                      <div className="d-flex justify-content-between px-4 py-2" style={{ borderTop: "1px solid #334155" }}>
                        <span className="text-white-50 small">Total</span>
                        <span className="fw-bold text-white small">{subtotal}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
