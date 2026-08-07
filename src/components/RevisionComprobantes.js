import React, { useCallback, useEffect, useState } from "react";
import axios from "../utils/axiosInstance";

const fmt = (n) =>
  Number(n || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const soloFecha = (iso) => (iso ? String(iso).slice(0, 10) : "");

export default function RevisionComprobantes({ onAprobado }) {
  const [pendientes, setPendientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [imagenes, setImagenes] = useState({});   // pago_id -> data URI
  const [edicion, setEdicion] = useState({});     // pago_id -> {monto, fecha, metodo}
  const [procesando, setProcesando] = useState(null);
  const [ampliada, setAmpliada] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await axios.get("/pagos/pendientes");
      setPendientes(res.data || []);
    } catch {
      setPendientes([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const verImagen = async (pagoId) => {
    if (imagenes[pagoId]) return;
    try {
      const res = await axios.get(`/pagos/${pagoId}/comprobante`);
      setImagenes((prev) => ({ ...prev, [pagoId]: res.data.imagen }));
    } catch {
      setImagenes((prev) => ({ ...prev, [pagoId]: null }));
    }
  };

  const campo = (p, key) => {
    const e = edicion[p.id] || {};
    if (key in e) return e[key];
    if (key === "fecha") return soloFecha(p.fecha);
    if (key === "monto") return String(p.monto ?? "");
    return p[key] ?? "";
  };

  const editar = (pagoId, key, valor) =>
    setEdicion((prev) => ({ ...prev, [pagoId]: { ...prev[pagoId], [key]: valor } }));

  const aprobar = async (p) => {
    const monto = Number(campo(p, "monto"));
    if (!monto || monto <= 0) return;
    setProcesando(p.id);
    try {
      await axios.patch(`/pagos/${p.id}/revisar`, {
        monto,
        fecha: campo(p, "fecha"),
        metodo: campo(p, "metodo"),
        sucursal_id: p.sucursal_id,
        referencia: p.referencia,
        estado: "ok",
      });
      setPendientes((prev) => prev.filter((x) => x.id !== p.id));
      if (onAprobado) onAprobado();
    } catch {
      /* el pago queda en la lista para reintentar */
    } finally {
      setProcesando(null);
    }
  };

  const rechazar = async (p) => {
    setProcesando(p.id);
    try {
      await axios.delete(`/pagos/${p.id}/rechazar`);
      setPendientes((prev) => prev.filter((x) => x.id !== p.id));
    } catch {
      /* queda en la lista */
    } finally {
      setProcesando(null);
    }
  };

  if (cargando) {
    return <div style={{ color: "#94a3b8", padding: 16 }}>Cargando…</div>;
  }

  if (!pendientes.length) {
    return (
      <div style={vacio}>No hay comprobantes esperando aprobación.</div>
    );
  }

  return (
    <>
      <div style={{ display: "grid", gap: 14 }}>
        {pendientes.map((p) => {
          const parser = safeParse(p.parser_json);
          const confianza = Number(p.ocr_confianza) || 0;
          const bajaConfianza = confianza > 0 && confianza < 0.7;

          return (
            <div
              key={p.id}
              style={{
                ...card,
                borderLeft: bajaConfianza
                  ? "3px solid #facc15"
                  : "3px solid rgba(255,255,255,0.1)",
              }}
            >
              <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
                <div>
                  <div style={{ color: "#fff", fontWeight: 700 }}>
                    {p.sucursal || p.vendedor || "Sin asignar"}
                  </div>
                  <div style={{ color: "#64748b", fontSize: "0.78rem" }}>
                    {p.vendedor ? "Vendedor · " : ""}Pago #{p.id}
                    {parser?.destinatario ? ` · a ${parser.destinatario}` : ""}
                  </div>
                </div>
                {bajaConfianza && (
                  <span style={badgeAviso}>
                    Lectura dudosa — verificá los datos
                  </span>
                )}
              </div>

              <div className="row g-3">
                <div className="col-md-5">
                  {p.tiene_imagen ? (
                    imagenes[p.id] === undefined ? (
                      <button
                        className="btn btn-sm btn-outline-light w-100"
                        onClick={() => verImagen(p.id)}
                      >
                        Ver comprobante
                      </button>
                    ) : imagenes[p.id] ? (
                      <img
                        src={imagenes[p.id]}
                        alt="Comprobante"
                        style={thumb}
                        onClick={() => setAmpliada(imagenes[p.id])}
                      />
                    ) : (
                      <div style={{ color: "#64748b", fontSize: "0.82rem" }}>
                        No se pudo cargar la imagen
                      </div>
                    )
                  ) : (
                    <div style={{ color: "#64748b", fontSize: "0.82rem" }}>
                      Sin imagen adjunta
                    </div>
                  )}
                </div>

                <div className="col-md-7">
                  <div className="row g-2">
                    <div className="col-6">
                      <label style={label}>Monto</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control form-control-sm"
                        style={inputDark}
                        value={campo(p, "monto")}
                        onChange={(e) => editar(p.id, "monto", e.target.value)}
                      />
                    </div>
                    <div className="col-6">
                      <label style={label}>
                        Fecha
                        {parser?.fecha_asumida && (
                          <span style={avisoFecha}> · no figuraba</span>
                        )}
                      </label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        style={{
                          ...inputDark,
                          ...(parser?.fecha_asumida
                            ? { borderColor: "rgba(250,204,21,0.5)" }
                            : {}),
                        }}
                        value={campo(p, "fecha")}
                        onChange={(e) => editar(p.id, "fecha", e.target.value)}
                      />
                    </div>
                    <div className="col-6">
                      <label style={label}>Método</label>
                      <select
                        className="form-select form-select-sm"
                        style={inputDark}
                        value={campo(p, "metodo")}
                        onChange={(e) => editar(p.id, "metodo", e.target.value)}
                      >
                        {["transferencia", "mp", "efectivo", "tarjeta", "otro"].map(
                          (m) => (
                            <option key={m} value={m} style={optionDark}>
                              {m}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                    <div className="col-6">
                      <label style={label}>Operación</label>
                      <div style={referencia}>{p.referencia || "—"}</div>
                    </div>
                  </div>

                  <div style={montoGrande}>${fmt(campo(p, "monto"))}</div>

                  <div className="d-flex gap-2 mt-3">
                    <button
                      className="btn btn-success btn-sm flex-grow-1"
                      disabled={procesando === p.id}
                      onClick={() => aprobar(p)}
                    >
                      {procesando === p.id ? "…" : "Aprobar pago"}
                    </button>
                    <button
                      className="btn btn-outline-danger btn-sm"
                      disabled={procesando === p.id}
                      onClick={() => rechazar(p)}
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {ampliada && (
        <div style={overlay} onClick={() => setAmpliada(null)}>
          <img src={ampliada} alt="Comprobante" style={imgAmpliada} />
        </div>
      )}
    </>
  );
}

function safeParse(v) {
  if (!v) return null;
  if (typeof v === "object") return v;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}

const card = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
  padding: 18,
};

const vacio = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  padding: "36px 16px",
  textAlign: "center",
  color: "#94a3b8",
};

const thumb = {
  width: "100%",
  maxHeight: 260,
  objectFit: "contain",
  borderRadius: 8,
  background: "#0f172a",
  border: "1px solid rgba(255,255,255,0.1)",
  cursor: "zoom-in",
};

const label = {
  color: "#94a3b8",
  fontSize: "0.72rem",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: 3,
  display: "block",
};

const referencia = {
  color: "#cbd5e1",
  fontSize: "0.82rem",
  padding: "5px 0",
  wordBreak: "break-all",
};

const montoGrande = {
  color: "#4ade80",
  fontWeight: 800,
  fontSize: "1.5rem",
  marginTop: 14,
};

const inputDark = {
  background: "#1e2530",
  border: "1px solid rgba(255,255,255,0.2)",
  color: "#fff",
};

const optionDark = { background: "#1e2530", color: "#fff" };

const avisoFecha = {
  color: "#fde68a",
  textTransform: "none",
  letterSpacing: 0,
  fontWeight: 500,
};

const badgeAviso = {
  background: "rgba(250,204,21,0.15)",
  border: "1px solid rgba(250,204,21,0.4)",
  color: "#fde68a",
  borderRadius: 20,
  padding: "3px 11px",
  fontSize: "0.75rem",
};

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.88)",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  cursor: "zoom-out",
};

const imgAmpliada = {
  maxWidth: "100%",
  maxHeight: "100%",
  objectFit: "contain",
  borderRadius: 8,
};
