import React, { useEffect, useMemo, useState } from "react";
import axios from "../utils/axiosInstance";
import { getUsuario } from "../utils/auth";

export default function PodsPorSucursalPage() {
  const usuario = getUsuario();
  const esAdmin = (usuario?.rol || "").toLowerCase() === "admin";

  const [data, setData] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [q, setQ] = useState("");
  const [soloConStock, setSoloConStock] = useState(true);
  const [sucursales, setSucursales] = useState([]);
  const [sucursalId, setSucursalId] = useState("");

  // 🔽 NUEVO: controles extra
  const [agrupar, setAgrupar] = useState("modelo"); // "modelo" | "gusto"
  const [orden, setOrden] = useState("total_desc"); // "total_desc" | "total_asc" | "pod" | "sucursal"
  const [page, setPage] = useState(0); // 0-based
  const [pageSize, setPageSize] = useState(200); // 0 = sin límite (máx 500 en backend)

  // Cargar sucursales (sólo admin, para el filtro)
  useEffect(() => {
    if (!esAdmin) return;
    axios
      .get("/sucursales")
      .then((r) => setSucursales(r.data || []))
      .catch(() => setSucursales([]));
  }, [esAdmin, axios]);

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
          page: page,
          page_size: pageSize || undefined,
        },
      })
      .then((r) => setData(Array.isArray(r.data) ? r.data : []))
      .catch((e) => {
        console.error("❌ Error /pods-por-sucursal:", e);
        setData([]);
      })
      .finally(() => setCargando(false));
  };

  // Re-fetch al cambiar filtros principales
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soloConStock, sucursalId, agrupar, orden, page, pageSize]);

  // Agrupar por sucursal y ordenar dentro de cada sucursal según "orden"
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
        : (a, b) => b.total - a.total || a.pod.localeCompare(b.pod); // default total_desc

    for (const grp of map.values()) grp.items.sort(cmp);

    return Array.from(map.values()).sort((a, b) =>
      a.sucursal.localeCompare(b.sucursal)
    );
  }, [data, orden]);

  const totalGlobal = useMemo(
    () => data.reduce((acc, r) => acc + Number(r.total || 0), 0),
    [data]
  );

  const handleBuscar = () => {
    // opcional: volver a la primera página al buscar
    if (page !== 0) setPage(0);
    else fetchData();
  };

  return (
    <div className="container p-3 mt-4">
      <h2 className="mb-3">📦 Pods por sucursal</h2>

      <div className="row g-2 align-items-end mb-3">
        <div className="col-sm-6 col-md-4">
          <label className="form-label">
            Buscar (producto / gusto / código)
          </label>
          <input
            className="form-control"
            placeholder="Ej: Lost Mary, 20.000 puffs..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
          />
        </div>

        {esAdmin && (
          <div className="col-sm-6 col-md-3">
            <label className="form-label">Sucursal</label>
            <select
              className="form-select"
              value={sucursalId}
              onChange={(e) => {
                setSucursalId(e.target.value);
                setPage(0);
              }}
            >
              <option value="">Todas</option>
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="col-sm-6 col-md-2">
          <label className="form-label">Agrupar por</label>
          <select
            className="form-select"
            value={agrupar}
            onChange={(e) => {
              setAgrupar(e.target.value);
              setPage(0);
            }}
          >
            <option value="modelo">Modelo</option>
            <option value="gusto">Gusto</option>
          </select>
        </div>

        <div className="col-sm-6 col-md-2">
          <label className="form-label">Orden</label>
          <select
            className="form-select"
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
          >
            <option value="total_desc">Total ↓</option>
            <option value="total_asc">Total ↑</option>
            <option value="pod">Nombre (A–Z)</option>
            <option value="sucursal">Sucursal</option>
          </select>
        </div>

        <div className="col-sm-6 col-md-1 form-check ms-2">
          <input
            id="chkStock"
            className="form-check-input"
            type="checkbox"
            checked={soloConStock}
            onChange={(e) => {
              setSoloConStock(e.target.checked);
              setPage(0);
            }}
          />
          <label className="form-check-label" htmlFor="chkStock">
            Solo stock
          </label>
        </div>

        <div className="col-sm-6 col-md-2">
          <label className="form-label">Tamaño pág.</label>
          <input
            type="number"
            min={0}
            max={500}
            className="form-control"
            value={pageSize}
            onChange={(e) => {
              const v = Math.max(0, Math.min(500, Number(e.target.value) || 0));
              setPageSize(v);
              setPage(0);
            }}
          />
        </div>

        <div className="col-sm-6 col-md-2">
          <button className="btn btn-dark w-100" onClick={handleBuscar}>
            Buscar
          </button>
        </div>
      </div>

      <div className="d-flex gap-2 mb-3">
        <button
          className="btn btn-outline-secondary"
          disabled={page <= 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          ⟵ Anterior
        </button>
        <button
          className="btn btn-outline-secondary"
          onClick={() => setPage((p) => p + 1)}
        >
          Siguiente ⟶
        </button>
        <div className="ms-2 align-self-center text-muted">
          Página: <strong>{page + 1}</strong>
        </div>
      </div>

      {cargando ? (
        <div className="alert alert-info">Cargando…</div>
      ) : agrupado.length === 0 ? (
        <div className="alert alert-warning">Sin resultados.</div>
      ) : (
        <>
          <div className="alert alert-secondary">
            Total global de pods (esta página): <strong>{totalGlobal}</strong>
          </div>

          {agrupado.map((grp, idx) => {
            const subtotal = grp.items.reduce(
              (acc, it) => acc + Number(it.total || 0),
              0
            );
            return (
              <div key={idx} className="mb-4 p-2">
                <h5 className="mb-2">
                  🏬 {grp.sucursal}{" "}
                  <small className="text-muted">— Total: {subtotal}</small>
                </h5>
                <div className="table-responsive">
                  <table className="table table-md table-striped p-5 align-middle">
                    <thead className="table-dark">
                      <tr>
                        <th>Pod</th>
                        <th className="text-end">Cantidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grp.items.map((it, j) => (
                        <tr key={j}>
                          <td>{it.pod}</td>
                          <td className="text-end">{it.total}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th>Total sucursal</th>
                        <th className="text-end">{subtotal}</th>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
