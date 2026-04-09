import React, { useEffect, useMemo, useState, useCallback } from "react";

const API_BASE = (
  process.env.REACT_APP_API_URL || "http://localhost:3000"
).replace(/\/+$/, "");
const ADMIN_API_KEY = process.env.REACT_APP_ADMIN_API_KEY || "";

const ESTADOS = [
  { value: "", label: "Todos" },
  { value: "nuevo", label: "Nuevo" },
  { value: "contactado", label: "Contactado" },
  { value: "agregado", label: "Agregado" },
  { value: "descartado", label: "Descartado" },
];
const estadoBadge = (e) =>
  ({
    nuevo: "bg-primary",
    contactado: "bg-warning text-dark",
    agregado: "bg-success",
    descartado: "bg-danger",
  }[e] || "bg-secondary");

function useDebouncedValue(value, delay = 450) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

const toCSV = (rows) => {
  if (!rows?.length) return "";
  const heads = [
    "id",
    "nombre",
    "telefono",
    "sucursal",
    "estado",
    "nota",
    "created_at",
  ];
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [heads.join(",")].concat(
    rows.map((r) =>
      [
        r.id,
        esc(r.nombre),
        esc(r.telefono),
        esc(r.sucursal || ""),
        r.estado || "",
        esc(r.nota || ""),
        r.created_at || "",
      ].join(",")
    )
  );
  return lines.join("\n");
};

function Filtros({ q, setQ, estado, setEstado }) {
  return (
    <div className="row g-2 mb-3">
      <div className="col-12 col-md-6">
        <input
          className="form-control"
          placeholder="Buscar por nombre o WhatsApp…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Buscar"
        />
      </div>
      <div className="col-6 col-md-3">
        <select
          className="form-select"
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          aria-label="Filtrar por estado"
        >
          {ESTADOS.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function Toast({ toast, onClose }) {
  if (!toast) return null;
  return (
    <div
      className="alert alert-dark d-flex align-items-center justify-content-between py-2"
      role="status"
    >
      <span className="me-3">ℹ️ {toast}</span>
      <button
        type="button"
        className="btn-close"
        onClick={onClose}
        aria-label="Cerrar"
      ></button>
    </div>
  );
}

export default function AdminLeads() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [estado, setEstado] = useState("");
  const [q, setQ] = useState("");
  const qDebounced = useDebouncedValue(q, 500);

  const [page, setPage] = useState(1);
  const pageSize = 15;

  const headers = useMemo(() => {
    const h = { "Content-Type": "application/json" };
    if (ADMIN_API_KEY) h["x-api-key"] = ADMIN_API_KEY;
    return h;
  }, []);

  const fetchClientes = useCallback(async () => {
    setLoading(true);
    setToast("");
    try {
      const url = new URL(`${API_BASE}/admin/clientes`);
      if (estado) url.searchParams.append("estado", estado);
      if (qDebounced) url.searchParams.append("q", qDebounced);
      url.searchParams.append("limit", "1000");
      const res = await fetch(url.toString(), { headers });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
      setPage(1);
    } catch (e) {
      setToast(`No se pudo cargar la lista. ${e.message}`);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [estado, qDebounced, headers]);

  useEffect(() => {
    fetchClientes();
  }, [estado, qDebounced, fetchClientes]);

  const total = data.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageData = data.slice((page - 1) * pageSize, page * pageSize);

  const setEstadoLead = useCallback(
    async (id, nuevo) => {
      try {
        await fetch(`${API_BASE}/admin/clientes/${id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ estado: nuevo }),
        });
        setData((prev) =>
          prev.map((r) => (r.id === id ? { ...r, estado: nuevo } : r))
        );
        setToast(`Estado actualizado a "${nuevo}".`);
      } catch {
        setToast("No se pudo actualizar el estado.");
      }
    },
    [headers]
  );

  const copyPhone = useCallback(async (phone) => {
    try {
      await navigator.clipboard.writeText(String(phone || ""));
      setToast("WhatsApp copiado.");
    } catch {
      setToast("No se pudo copiar.");
    }
  }, []);

  const downloadCSV = useCallback(() => {
    const csv = toCSV(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: "clientes_comunidad.csv",
    });
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [data]);

  return (
    <div className="container py-4">
      <div className="d-flex flex-column flex-md-row align-items-md-end justify-content-between mb-3">
        <div>
          <h1 className="h4 mb-1">Leads / Comunidad</h1>
          <small className="text-muted">
            Gestioná los contactos que dejaron su WhatsApp.
          </small>
        </div>
        <div className="d-flex gap-2 mt-3 mt-md-0">
          <button onClick={fetchClientes} className="btn btn-dark">
            Actualizar
          </button>
          <button onClick={downloadCSV} className="btn btn-outline-secondary">
            Exportar CSV
          </button>
        </div>
      </div>

      <Filtros q={q} setQ={setQ} estado={estado} setEstado={setEstado} />

      <Toast toast={toast} onClose={() => setToast("")} />

      <div className="table-responsive shadow-sm">
        <table className="table table-hover align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th>Nombre</th>
              <th>WhatsApp</th>
              <th>Sucursal</th>
              <th>Estado</th>
              <th style={{ minWidth: 180 }}>Nota</th>
              <th>Fecha</th>
              <th className="text-end">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i}>
                  <td colSpan="7">
                    <div className="placeholder-glow py-3">
                      <span className="placeholder col-12"></span>
                    </div>
                  </td>
                </tr>
              ))
            ) : pageData.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center text-muted py-4">
                  Sin resultados.
                </td>
              </tr>
            ) : (
              pageData.map((c) => (
                <tr key={c.id}>
                  <td className="fw-semibold">{c.nombre}</td>
                  <td>
                    <span className="font-monospace">{c.telefono}</span>{" "}
                    <button
                      className="btn btn-sm btn-outline-secondary ms-1"
                      onClick={() => copyPhone(c.telefono)}
                      title="Copiar"
                      aria-label={`Copiar WhatsApp de ${c.nombre}`}
                    >
                      Copiar
                    </button>
                  </td>
                  <td>{c.sucursal || "-"}</td>
                  <td>
                    <span className={`badge ${estadoBadge(c.estado)}`}>
                      {c.estado || "—"}
                    </span>
                  </td>
                  <td
                    className="text-truncate"
                    style={{ maxWidth: 260 }}
                    title={c.nota || ""}
                  >
                    {c.nota || "—"}
                  </td>
                  <td>
                    {c.created_at
                      ? new Date(c.created_at).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="text-end">
                    <div
                      className="d-flex flex-row gap-2"
                      role="group"
                      aria-label={`Acciones para ${c.nombre}`}
                    >
                      <button
                        className={`btn btn-warning${
                          c.estado === "contactado" ? " active" : ""
                        }`}
                        onClick={() =>
                          c.estado !== "contactado" &&
                          setEstadoLead(c.id, "contactado")
                        }
                        aria-label={`Marcar ${c.nombre} como contactado`}
                        disabled={c.estado === "contactado"}
                        title={
                          c.estado === "contactado"
                            ? "Ya está contactado"
                            : "Marcar como contactado"
                        }
                      >
                        <span role="img" aria-label="Contactado">
                          📞
                        </span>{" "}
                        Contactado
                      </button>
                      <button
                        className={`btn btn-success${
                          c.estado === "agregado" ? " active" : ""
                        }`}
                        onClick={() =>
                          c.estado !== "agregado" &&
                          setEstadoLead(c.id, "agregado")
                        }
                        aria-label={`Marcar ${c.nombre} como agregado`}
                        disabled={c.estado === "agregado"}
                        title={
                          c.estado === "agregado"
                            ? "Ya está agregado"
                            : "Marcar como agregado"
                        }
                      >
                        <span role="img" aria-label="Agregado">
                          ✅
                        </span>{" "}
                        Agregado
                      </button>
                      <button
                        className={`btn btn-danger${
                          c.estado === "descartado" ? " active" : ""
                        }`}
                        onClick={() =>
                          c.estado !== "descartado" &&
                          setEstadoLead(c.id, "descartado")
                        }
                        aria-label={`Descartar ${c.nombre}`}
                        disabled={c.estado === "descartado"}
                        title={
                          c.estado === "descartado"
                            ? "Ya está descartado"
                            : "Descartar"
                        }
                      >
                        <span role="img" aria-label="Descartado">
                          🗑️
                        </span>{" "}
                        Descartado
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <nav className="d-flex justify-content-between align-items-center mt-3">
        <small className="text-muted">
          {total > 0 ? (
            <>
              Mostrando <strong>{(page - 1) * pageSize + 1}</strong>–
              <strong>{Math.min(page * pageSize, total)}</strong> de{" "}
              <strong>{total}</strong>
            </>
          ) : (
            <>Sin registros</>
          )}
        </small>
        <ul className="pagination mb-0">
          <li className={`page-item ${page === 1 ? "disabled" : ""}`}>
            <button
              className="page-link"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Página anterior"
            >
              Anterior
            </button>
          </li>
          <li className="page-item disabled">
            <span className="page-link">
              Página {page} / {totalPages}
            </span>
          </li>
          <li className={`page-item ${page === totalPages ? "disabled" : ""}`}>
            <button
              className="page-link"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Página siguiente"
            >
              Siguiente
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
