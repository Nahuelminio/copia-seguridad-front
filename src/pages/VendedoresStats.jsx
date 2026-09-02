import React, { useEffect, useState, useCallback } from "react";
import axios from "../utils/axiosInstance";
import { toast } from "react-toastify";

// ─── Estilos compartidos ──────────────────────────────────────────────────────

const card = {
  background: "#111827",
  border: "1px solid #1e293b",
  borderRadius: 12,
  padding: "20px 24px",
};

const labelSt = {
  color: "#64748b",
  fontSize: "0.72rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const inputSt = {
  background: "#0f172a",
  border: "1px solid #1e293b",
  color: "#e2e8f0",
  borderRadius: 7,
};

const meses = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const fmt = (n) =>
  Number(n).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });

function username(email = "") {
  return email.split("@")[0];
}

/** Nombre para mostrar. Cae al usuario del mail si no tiene nombre cargado. */
function etiqueta(v = {}) {
  return (v.nombre || "").trim() || username(v.email || "");
}

// ─── Semana ISO actual ────────────────────────────────────────────────────────

function getSemanaActual() {
  const hoy = new Date();
  const u = new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()));
  const dia = u.getUTCDay() || 7;
  u.setUTCDate(u.getUTCDate() + 4 - dia);
  const ini = new Date(Date.UTC(u.getUTCFullYear(), 0, 1));
  return {
    semana: Math.ceil(((u - ini) / 86400000 + 1) / 7),
    anio: u.getUTCFullYear(),
  };
}

// ─── NavPeriod: flechas para semana o mes ────────────────────────────────────

function NavPeriod({ label, display, onPrev, onNext }) {
  return (
    <div>
      <p style={labelSt} className="mb-1">{label}</p>
      <div className="d-flex align-items-center gap-2">
        <button className="btn btn-sm btn-outline-secondary" onClick={onPrev}>‹</button>
        <span style={{ color: "#f1f5f9", fontWeight: 600, minWidth: 130, textAlign: "center" }}>
          {display}
        </span>
        <button className="btn btn-sm btn-outline-secondary" onClick={onNext}>›</button>
      </div>
    </div>
  );
}

// ─── DesgloseSucursales ───────────────────────────────────────────────────────

function DesgloseSucursales({ sucursales }) {
  if (!sucursales?.length) return null;
  return (
    <div style={{ marginTop: 5, paddingLeft: 12, borderLeft: "2px solid #1e293b" }}>
      {sucursales.map((sc) => (
        <div
          key={sc.sucursal_id}
          className="d-flex justify-content-between align-items-center"
          style={{ fontSize: "0.75rem", padding: "2px 0" }}
        >
          <span style={{ color: "#64748b" }}>
            <span style={{ color: "#3b82f6", marginRight: 5 }}>↳</span>
            {sc.sucursal_nombre}
          </span>
          <span style={{ color: "#94a3b8" }}>
            {sc.total_pares} u. · {fmt(sc.total_monto)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Panel rendición ──────────────────────────────────────────────────────────

// Lunes de la semana de `d`, que es como se cuentan las semanas acá
const lunesDe = (d) => {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  x.setHours(0, 0, 0, 0);
  return x;
};
const masDias = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const aISO = (d) => d.toISOString().slice(0, 10);
const diaCorto = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "2-digit" });

/**
 * Compara, día por día, lo que vendió cada vendedor contra lo que rindió.
 * El total de la semana no alcanza para darse cuenta de un comprobante que
 * quedó sin mandar: suelen pagar al día siguiente, así que sobre el total se
 * compensa y el faltante queda tapado.
 */
function PanelRendicion() {
  const [ancla, setAncla] = useState(new Date());
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);

  const desde = aISO(lunesDe(ancla));
  const hasta = aISO(masDias(lunesDe(ancla), 7));

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    axios
      .get(`/vendedores/conciliacion?desde=${desde}&hasta=${hasta}`)
      .then(({ data }) => { if (vivo) setDatos(data); })
      .catch(() => { if (vivo) setDatos(null); })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [desde, hasta]);

  const conMovimiento = (datos?.vendedores || []).filter((v) => v.detalle.length > 0);
  const btn = { background: "#111827", border: "1px solid #1e293b", color: "#cbd5e1",
    borderRadius: 8, padding: "6px 14px", fontSize: "0.85rem", cursor: "pointer" };

  return (
    <div>
      <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
        <button style={btn} onClick={() => setAncla(masDias(ancla, -7))}>← Semana anterior</button>
        <span style={{ color: "#e2e8f0", fontWeight: 600 }}>
          {diaCorto(desde)} al {diaCorto(aISO(masDias(lunesDe(ancla), 6)))}
        </span>
        <button style={btn} onClick={() => setAncla(masDias(ancla, 7))}>Semana siguiente →</button>
        <button style={btn} onClick={() => setAncla(new Date())}>Esta semana</button>
      </div>

      {cargando && <div style={{ color: "#94a3b8" }}>Cargando…</div>}
      {!cargando && conMovimiento.length === 0 && (
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12,
          padding: 18, color: "#64748b" }}>
          Ningún vendedor tuvo movimiento esta semana.
        </div>
      )}

      {!cargando && conMovimiento.map((v) => (
        <div key={v.id} style={{ background: "#0f172a", border: "1px solid #1e293b",
          borderRadius: 12, padding: "16px 20px", marginBottom: 14,
          borderLeft: v.falta > 0 ? "3px solid #f87171" : "3px solid #10b981" }}>
          <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
            <div>
              <div style={{ color: "#f1f5f9", fontWeight: 700 }}>{etiqueta(v)}</div>
              <div style={{ color: "#64748b", fontSize: "0.78rem" }}>
                {v.unidades} unidades vendidas en la semana
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              {v.falta > 0 ? (
                <>
                  <div style={{ color: "#f87171", fontWeight: 700, fontSize: "1.1rem" }}>
                    Falta {fmt(v.falta)}
                  </div>
                  <div style={{ color: "#64748b", fontSize: "0.74rem" }}>sin rendir</div>
                </>
              ) : (
                <div style={{ color: "#10b981", fontWeight: 700 }}>Al día</div>
              )}
              {v.pendiente > 0 && (
                <div style={{ color: "#fbbf24", fontSize: "0.74rem", marginTop: 2 }}>
                  {fmt(v.pendiente)} esperando que lo apruebes
                </div>
              )}
            </div>
          </div>

          {/* El arrastre explica por qué un día puede tener un pago sin venta */}
          {Math.abs(v.arrastre) > 0 && (
            <div style={{ color: "#64748b", fontSize: "0.76rem", marginTop: 8 }}>
              Venía debiendo {fmt(v.arrastre)} de antes de esta semana.
            </div>
          )}

          <div style={{ overflowX: "auto", marginTop: 12 }}>
            <table style={{ width: "100%", minWidth: 520, fontSize: "0.84rem" }}>
              <thead>
                <tr style={{ color: "#64748b", fontSize: "0.66rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  <th style={{ textAlign: "left", paddingBottom: 8 }}>Día</th>
                  <th style={{ textAlign: "right", paddingBottom: 8 }}>Unid.</th>
                  <th style={{ textAlign: "right", paddingBottom: 8 }}>Vendió</th>
                  <th style={{ textAlign: "right", paddingBottom: 8 }}>Rindió</th>
                  <th style={{ textAlign: "left", paddingBottom: 8, paddingLeft: 14 }}>Cómo</th>
                  <th style={{ textAlign: "right", paddingBottom: 8 }}>Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {v.detalle.map((d) => (
                  <tr key={d.dia} style={{ borderTop: "1px solid #1e293b" }}>
                    <td style={{ color: "#e2e8f0", padding: "8px 0", textTransform: "capitalize" }}>
                      {diaCorto(d.dia)}
                    </td>
                    <td style={{ color: "#94a3b8", textAlign: "right" }}>{d.unidades || "—"}</td>
                    <td style={{ color: "#e2e8f0", textAlign: "right" }}>{fmt(d.vendido)}</td>
                    <td style={{ color: "#10b981", textAlign: "right" }}>{fmt(d.pagado)}</td>
                    <td style={{ color: "#64748b", fontSize: "0.76rem", paddingLeft: 14 }}>
                      {d.pagos_cargados === 0 ? "—" : (
                        <>
                          {d.comprobantes > 0 && `${d.comprobantes} con comprobante`}
                          {d.comprobantes > 0 && d.pagos_cargados - d.comprobantes > 0 && " · "}
                          {d.pagos_cargados - d.comprobantes > 0 &&
                            `${d.pagos_cargados - d.comprobantes} cargado a mano`}
                        </>
                      )}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 600,
                      color: d.diferencia > 0 ? "#f87171" : d.diferencia < 0 ? "#38bdf8" : "#475569" }}>
                      {d.diferencia === 0 ? "—" : fmt(d.diferencia)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ color: "#475569", fontSize: "0.74rem", marginTop: 10, lineHeight: 1.5 }}>
            En rojo, lo que vendió y todavía no rindió ese día. En celeste, lo que pagó
            de más, que suele ser una venta del día anterior.
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Panel deudas ─────────────────────────────────────────────────────────────

function PanelDeudas() {
  const [deudas, setDeudas]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [pagoModal, setPagoModal] = useState(null);   // { id, email }
  const [monto, setMonto]         = useState("");
  const [metodo, setMetodo]       = useState("efectivo");
  const [fecha, setFecha]         = useState(new Date().toISOString().slice(0, 10));
  const [notas, setNotas]         = useState("");
  const [guardando, setGuardando] = useState(false);
  const [historial, setHistorial] = useState(null);   // { id, rows }
  const [eliminando, setEliminando] = useState(null);

  const cargarDeudas = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/vendedores/deudas");
      setDeudas(data);
    } catch {
      toast.error("Error al cargar deudas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarDeudas(); }, [cargarDeudas]);

  const abrirPago = (v) => {
    setPagoModal({ id: v.id, email: v.email, nombre: v.nombre });
    setMonto("");
    setNotas("");
    setFecha(new Date().toISOString().slice(0, 10));
  };

  const cerrarPago = () => setPagoModal(null);

  const registrarPago = async () => {
    if (!monto || Number(monto) <= 0) { toast.error("Ingresá un monto válido"); return; }
    setGuardando(true);
    try {
      await axios.post(`/vendedores/${pagoModal.id}/pago`, {
        monto: Number(monto), metodo, fecha, notas,
      });
      toast.success("Pago registrado ✅");
      cerrarPago();
      cargarDeudas();
    } catch (e) {
      toast.error(e.response?.data?.error || "Error al registrar pago");
    } finally {
      setGuardando(false);
    }
  };

  const toggleHistorial = async (v) => {
    if (historial?.id === v.id) { setHistorial(null); return; }
    try {
      const { data } = await axios.get(`/vendedores/${v.id}/pagos`);
      setHistorial({ id: v.id, rows: data });
    } catch {
      toast.error("Error al cargar historial");
    }
  };

  const eliminarPago = async (pagoId) => {
    setEliminando(pagoId);
    try {
      await axios.delete(`/vendedores/pagos/${pagoId}`);
      toast.success("Pago eliminado");
      const vendedorId = historial.id;
      const { data } = await axios.get(`/vendedores/${vendedorId}/pagos`);
      setHistorial({ id: vendedorId, rows: data });
      cargarDeudas();
    } catch (e) {
      toast.error(e.response?.data?.error || "Error al eliminar");
    } finally {
      setEliminando(null);
    }
  };

  if (loading) return (
    <div className="text-center py-5">
      <div className="spinner-border spinner-border-sm text-secondary" role="status" />
    </div>
  );

  if (!deudas) return null;

  const totalDeuda = deudas.reduce((s, v) => s + v.deuda, 0);

  return (
    <div>
      {/* KPIs rápidos */}
      <div className="row g-3 mb-4">
        {[
          { label: "Facturado total", value: fmt(deudas.reduce((s, v) => s + v.total_facturado, 0)), color: "#94a3b8" },
          { label: "Pagado total",    value: fmt(deudas.reduce((s, v) => s + v.total_pagado, 0)),    color: "#10b981" },
          { label: "Deuda pendiente", value: fmt(totalDeuda), color: totalDeuda <= 0 ? "#10b981" : "#f87171" },
        ].map(({ label, value, color }) => (
          <div className="col-12 col-md-4" key={label}>
            <div style={{ ...card, padding: "14px 20px", borderColor: `${color}25` }}>
              <p style={{ ...labelSt, marginBottom: 4 }}>{label}</p>
              <p style={{ color, fontWeight: 700, fontSize: "1.2rem", margin: 0 }}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div style={{ ...card, padding: 0, overflow: "hidden" }}>
        <table className="table table-dark mb-0" style={{ fontSize: "0.88rem" }}>
          <thead>
            <tr style={{ borderColor: "#1e293b", color: "#64748b", fontSize: "0.72rem", textTransform: "uppercase" }}>
              <th style={{ padding: "12px 16px" }}>Vendedor</th>
              <th style={{ padding: "12px 16px", textAlign: "right" }}>Facturado</th>
              <th style={{ padding: "12px 16px", textAlign: "right" }}>Pagado</th>
              <th style={{ padding: "12px 16px", textAlign: "right" }}>Deuda</th>
              <th style={{ padding: "12px 16px", textAlign: "center", width: 160 }}></th>
            </tr>
          </thead>
          <tbody>
            {deudas.map((v) => {
              const deudaColor = v.deuda <= 0 ? "#10b981" : v.deuda > 50000 ? "#f87171" : "#f59e0b";
              const abierto    = historial?.id === v.id;
              return (
                <React.Fragment key={v.id}>
                  <tr style={{ borderColor: "#1e293b" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ color: "#f1f5f9", fontWeight: 600 }}>{etiqueta(v)}</span>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", color: "#64748b" }}>
                      {fmt(v.total_facturado)}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", color: "#10b981", fontWeight: 600 }}>
                      {fmt(v.total_pagado)}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: deudaColor }}>
                      {fmt(v.deuda)}{v.deuda <= 0 && " (al día)"}
                    </td>
                    <td style={{ padding: "10px 16px", textAlign: "center" }}>
                      <div className="d-flex gap-2 justify-content-center">
                        <button
                          onClick={() => abrirPago(v)}
                          style={{
                            background: "#10b981", border: "none", color: "#fff",
                            borderRadius: 6, padding: "4px 12px",
                            fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
                          }}
                        >
                          + Pago
                        </button>
                        <button
                          onClick={() => toggleHistorial(v)}
                          style={{
                            background: abierto ? "#1e3a5f" : "#1e293b",
                            border: `1px solid ${abierto ? "#3b82f6" : "#334155"}`,
                            color: abierto ? "#93c5fd" : "#94a3b8",
                            borderRadius: 6, padding: "4px 12px",
                            fontSize: "0.78rem", cursor: "pointer",
                          }}
                        >
                          {abierto ? "Cerrar" : "Historial"}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Historial inline */}
                  {abierto && (
                    <tr style={{ borderColor: "#1e293b" }}>
                      <td colSpan={5} style={{ padding: "0 24px 14px 40px", background: "#0a1120" }}>
                        {historial.rows.length === 0 ? (
                          <p style={{ color: "#475569", fontSize: "0.8rem", margin: "10px 0 0" }}>
                            Sin pagos registrados.
                          </p>
                        ) : (
                          <table style={{ width: "100%", fontSize: "0.78rem", marginTop: 10 }}>
                            <thead>
                              <tr style={{ color: "#475569", borderBottom: "1px solid #1e293b" }}>
                                <th style={{ padding: "4px 8px 6px", fontWeight: 600 }}>Fecha</th>
                                <th style={{ padding: "4px 8px 6px", fontWeight: 600 }}>Método</th>
                                <th style={{ padding: "4px 8px 6px", fontWeight: 600, textAlign: "right" }}>Monto</th>
                                <th style={{ padding: "4px 8px 6px", fontWeight: 600 }}>Notas</th>
                                <th style={{ padding: "4px 8px 6px" }}></th>
                              </tr>
                            </thead>
                            <tbody>
                              {historial.rows.map((p) => (
                                <tr key={p.id}>
                                  <td style={{ padding: "4px 8px", color: "#64748b" }}>
                                    {new Date(p.fecha).toLocaleDateString("es-AR", {
                                      day: "2-digit", month: "2-digit", year: "numeric",
                                    })}
                                  </td>
                                  <td style={{ padding: "4px 8px", color: "#94a3b8", textTransform: "capitalize" }}>
                                    {p.metodo}
                                  </td>
                                  <td style={{ padding: "4px 8px", color: "#10b981", fontWeight: 600, textAlign: "right" }}>
                                    {fmt(p.monto)}
                                  </td>
                                  <td style={{ padding: "4px 8px", color: "#475569" }}>{p.notas || "—"}</td>
                                  <td style={{ padding: "4px 8px" }}>
                                    <button
                                      onClick={() => eliminarPago(p.id)}
                                      disabled={eliminando === p.id}
                                      style={{
                                        background: "#3f0000", border: "1px solid #7f1d1d",
                                        color: "#f87171", borderRadius: 5,
                                        padding: "2px 8px", fontSize: "0.72rem",
                                        cursor: "pointer",
                                      }}
                                    >
                                      {eliminando === p.id ? "..." : "Eliminar"}
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal pago */}
      {pagoModal && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
            zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onClick={cerrarPago}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#111827", border: "1px solid #1e293b",
              borderRadius: 14, padding: "28px 32px",
              maxWidth: 400, width: "90%",
              boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
            }}
          >
            <div className="mb-4">
              <h6 style={{ color: "#f1f5f9", fontWeight: 700, margin: 0 }}>Registrar pago</h6>
              <p style={{ color: "#10b981", fontSize: "0.88rem", margin: "4px 0 0", fontWeight: 600 }}>
                {etiqueta(pagoModal)}
              </p>
            </div>

            <div className="mb-3">
              <label style={{ ...labelSt, display: "block", marginBottom: 6 }}>Monto $</label>
              <input
                type="number" className="form-control form-control-sm" style={inputSt}
                value={monto} onChange={(e) => setMonto(e.target.value)}
                placeholder="0" autoFocus
              />
            </div>
            <div className="mb-3">
              <label style={{ ...labelSt, display: "block", marginBottom: 6 }}>Método</label>
              <select className="form-select form-select-sm" style={inputSt} value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="mp">Mercado Pago</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div className="mb-3">
              <label style={{ ...labelSt, display: "block", marginBottom: 6 }}>Fecha</label>
              <input
                type="date" className="form-control form-control-sm" style={inputSt}
                value={fecha} onChange={(e) => setFecha(e.target.value)}
              />
            </div>
            <div className="mb-5">
              <label style={{ ...labelSt, display: "block", marginBottom: 6 }}>Notas (opcional)</label>
              <input
                type="text" className="form-control form-control-sm" style={inputSt}
                value={notas} onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej: pago semana 22"
              />
            </div>

            <div className="d-flex gap-2 justify-content-end">
              <button
                onClick={cerrarPago}
                style={{
                  padding: "8px 20px", borderRadius: 8,
                  border: "1px solid #1e293b", background: "transparent",
                  color: "#94a3b8", cursor: "pointer", fontWeight: 500,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={registrarPago}
                disabled={guardando}
                style={{
                  padding: "8px 24px", borderRadius: 8, border: "none",
                  background: guardando ? "#059669" : "#10b981",
                  color: "#fff", fontWeight: 700, cursor: guardando ? "default" : "pointer",
                  transition: "background 0.15s",
                }}
              >
                {guardando ? "Guardando…" : "Confirmar pago"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Card de vendedor (semana / mes) ─────────────────────────────────────────

function VendedorCard({ v, tab }) {
  return (
    <div style={card}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <p style={{ color: "#f1f5f9", fontWeight: 700, fontSize: "1rem", margin: 0 }}>
            {etiqueta(v)}
          </p>
          <p style={{ color: "#475569", fontSize: "0.75rem", margin: 0 }}>{v.email}</p>
        </div>
        <div className="text-end">
          <p style={{ color: "#10b981", fontWeight: 700, fontSize: "1.15rem", margin: 0 }}>
            {fmt(v.total_monto)}
          </p>
          <p style={{ color: "#64748b", fontSize: "0.8rem", margin: 0 }}>
            {v.total_pares} par{v.total_pares !== 1 ? "es" : ""}
          </p>
        </div>
      </div>

      {/* Sin ventas */}
      {tab === "semana" && v.dias?.length === 0 && (
        <p style={{ color: "#334155", fontSize: "0.82rem", margin: 0 }}>Sin ventas esta semana.</p>
      )}
      {tab === "mes" && v.semanas?.length === 0 && (
        <p style={{ color: "#334155", fontSize: "0.82rem", margin: 0 }}>Sin ventas este mes.</p>
      )}

      {/* Desglose semanal */}
      {tab === "semana" && v.dias?.length > 0 && (
        <div style={{ borderTop: "1px solid #1e293b", paddingTop: 12 }}>
          <p style={labelSt} className="mb-2">Por día</p>
          {v.dias.map((d) => (
            <div key={d.fecha} style={{ marginBottom: 10 }}>
              <div className="d-flex justify-content-between align-items-center">
                <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                  {d.dia}{" "}
                  <span style={{ color: "#475569", fontSize: "0.75rem" }}>
                    {new Date(d.fecha + "T00:00:00").toLocaleDateString("es-AR", {
                      day: "2-digit", month: "2-digit",
                    })}
                  </span>
                </span>
                <span style={{ color: "#e2e8f0", fontSize: "0.88rem", fontWeight: 600 }}>
                  {fmt(d.total_monto)}{" "}
                  <span style={{ color: "#64748b", fontWeight: 400, fontSize: "0.78rem" }}>
                    ({d.total_pares} u.)
                  </span>
                </span>
              </div>
              <DesgloseSucursales sucursales={d.sucursales} />
            </div>
          ))}
        </div>
      )}

      {/* Desglose mensual */}
      {tab === "mes" && v.semanas?.length > 0 && (
        <div style={{ borderTop: "1px solid #1e293b", paddingTop: 12 }}>
          <p style={labelSt} className="mb-2">Por semana</p>
          {v.semanas.map((s, i) => (
            <div key={s.semana_iso} style={{ marginBottom: 10 }}>
              <div className="d-flex justify-content-between align-items-center">
                <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                  Sem. {i + 1}{" "}
                  <span style={{ color: "#475569", fontSize: "0.75rem" }}>
                    (desde{" "}
                    {new Date(s.inicio_semana + "T00:00:00").toLocaleDateString("es-AR", {
                      day: "2-digit", month: "2-digit",
                    })}
                    )
                  </span>
                </span>
                <span style={{ color: "#e2e8f0", fontSize: "0.88rem", fontWeight: 600 }}>
                  {fmt(s.total_monto)}{" "}
                  <span style={{ color: "#64748b", fontWeight: 400, fontSize: "0.78rem" }}>
                    ({s.total_pares} u.)
                  </span>
                </span>
              </div>
              <DesgloseSucursales sucursales={s.sucursales} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Panel Detalle ────────────────────────────────────────────────────────────

function PanelDetalle({ semana, anioSemana, mes, anioMes, setSemana, setAnioSemana, setMes, setAnioMes }) {
  const [modo,    setModo]    = useState("dias"); // "dias" | "semana" | "mes"
  const [dias,    setDias]    = useState(3);
  const [ventas,  setVentas]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [editando, setEditando] = useState(null); // { id, cantidad, precio_unitario }
  const [guardando, setGuardando] = useState(false);
  const [filtroVendedor, setFiltroVendedor] = useState("todos");

  const cargar = useCallback(async () => {
    setLoading(true);
    setVentas(null);
    try {
      let params;
      if (modo === "dias") {
        const hasta = new Date();
        const desde = new Date();
        desde.setDate(desde.getDate() - (dias - 1));
        params = {
          desde: desde.toISOString().slice(0, 10),
          hasta: hasta.toISOString().slice(0, 10),
        };
      } else if (modo === "semana") {
        params = { semana, anio: anioSemana };
      } else {
        params = { mes, anio: anioMes };
      }
      const { data } = await axios.get("/vendedores/ventas/detalle", { params });
      setVentas(data);
    } catch {
      toast.error("Error al cargar detalle");
    } finally {
      setLoading(false);
    }
  }, [modo, dias, semana, anioSemana, mes, anioMes]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirEdit = (v) => setEditando({ id: v.id, cantidad: v.cantidad, precio_unitario: v.precio_unitario });
  const cerrarEdit = () => setEditando(null);

  const guardarEdit = async () => {
    if (!editando) return;
    const cant = Number(editando.cantidad);
    const precio = Number(editando.precio_unitario);
    if (!cant || cant <= 0) { toast.error("Cantidad inválida"); return; }
    if (precio < 0) { toast.error("Precio inválido"); return; }
    setGuardando(true);
    try {
      await axios.put(`/vendedores/ventas/${editando.id}`, { cantidad: cant, precio_unitario: precio });
      toast.success("Venta actualizada");
      cerrarEdit();
      cargar();
    } catch (e) {
      toast.error(e.response?.data?.error || "Error al guardar");
    } finally {
      setGuardando(false);
    }
  };

  // Vendedores únicos para el filtro
  const vendedores = ventas
    ? [...new Map(ventas.map(v => [v.vendedor_id, v.vendedor_email])).entries()]
    : [];

  const ventasFiltradas = ventas
    ? (filtroVendedor === "todos" ? ventas : ventas.filter(v => String(v.vendedor_id) === filtroVendedor))
    : [];

  // Totales del filtro actual
  const totalUnidades = ventasFiltradas.reduce((s, v) => s + v.cantidad, 0);
  const totalMonto    = ventasFiltradas.reduce((s, v) => s + Number(v.total), 0);

  return (
    <div>
      {/* Selector modo + período */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <div className="d-flex gap-2 flex-wrap">
            {[
              { key: "dias",   label: "Últimos días" },
              { key: "semana", label: "Semana" },
              { key: "mes",    label: "Mes" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setModo(key)}
                style={{
                  background: modo === key ? "#8b5cf6" : "#0f172a",
                  border: `1px solid ${modo === key ? "#8b5cf6" : "#1e293b"}`,
                  color: modo === key ? "#fff" : "#94a3b8",
                  borderRadius: 7, padding: "5px 16px",
                  fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {modo === "dias" && (
            <div className="d-flex align-items-center gap-2">
              <span style={{ color: "#64748b", fontSize: "0.82rem" }}>Últimos</span>
              {[1, 3, 7, 14, 30].map(d => (
                <button
                  key={d}
                  onClick={() => setDias(d)}
                  style={{
                    background: dias === d ? "#6d28d9" : "#0f172a",
                    border: `1px solid ${dias === d ? "#8b5cf6" : "#1e293b"}`,
                    color: dias === d ? "#fff" : "#64748b",
                    borderRadius: 6, padding: "3px 12px",
                    fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
                  }}
                >
                  {d}d
                </button>
              ))}
            </div>
          )}

          {modo === "semana" && (
            <NavPeriod
              label="Semana"
              display={`Sem. ${semana} — ${anioSemana}`}
              onPrev={() => semana > 1  ? setSemana(semana - 1) : (setSemana(53), setAnioSemana(anioSemana - 1))}
              onNext={() => semana < 53 ? setSemana(semana + 1) : (setSemana(1),  setAnioSemana(anioSemana + 1))}
            />
          )}

          {modo === "mes" && (
            <NavPeriod
              label="Mes"
              display={`${meses[mes]} ${anioMes}`}
              onPrev={() => mes > 1  ? setMes(mes - 1) : (setMes(12), setAnioMes(anioMes - 1))}
              onNext={() => mes < 12 ? setMes(mes + 1) : (setMes(1),  setAnioMes(anioMes + 1))}
            />
          )}

          {/* Filtro vendedor */}
          {vendedores.length > 0 && (
            <div style={{ marginLeft: "auto" }}>
              <select
                className="form-select form-select-sm"
                style={{ ...inputSt, minWidth: 160, fontSize: "0.82rem" }}
                value={filtroVendedor}
                onChange={e => setFiltroVendedor(e.target.value)}
              >
                <option value="todos">Todos los vendedores</option>
                {vendedores.map(([id, email]) => (
                  <option key={id} value={String(id)}>{username(email)}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* KPIs */}
      {ventas && (
        <div className="row g-3 mb-3">
          {[
            { label: "Ventas",    value: ventasFiltradas.length,    color: "#8b5cf6" },
            { label: "Unidades",  value: totalUnidades,             color: "#f1f5f9" },
            { label: "Total",     value: fmt(totalMonto),           color: "#10b981" },
          ].map(({ label, value, color }) => (
            <div className="col-4" key={label}>
              <div style={{ ...card, padding: "12px 16px", borderColor: `${color}30` }}>
                <p style={{ ...labelSt, marginBottom: 3 }}>{label}</p>
                <p style={{ color, fontWeight: 700, fontSize: "1.1rem", margin: 0 }}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border spinner-border-sm text-secondary" role="status" />
        </div>
      )}

      {/* Tabla */}
      {!loading && ventas && (
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          {ventasFiltradas.length === 0 ? (
            <p style={{ color: "#475569", padding: 20, margin: 0 }}>Sin ventas en este período.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="table table-dark mb-0" style={{ fontSize: "0.82rem", minWidth: 640 }}>
                <thead>
                  <tr style={{ borderColor: "#1e293b", color: "#64748b", fontSize: "0.7rem", textTransform: "uppercase" }}>
                    <th style={{ padding: "10px 14px" }}>Fecha</th>
                    <th style={{ padding: "10px 14px" }}>Vendedor</th>
                    <th style={{ padding: "10px 14px" }}>Producto</th>
                    <th style={{ padding: "10px 14px" }}>Sabor</th>
                    <th style={{ padding: "10px 14px", textAlign: "right" }}>Cant.</th>
                    <th style={{ padding: "10px 14px", textAlign: "right" }}>Precio u.</th>
                    <th style={{ padding: "10px 14px", textAlign: "right" }}>Total</th>
                    <th style={{ padding: "10px 14px", width: 70 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {ventasFiltradas.map(v => {
                    const enEdit = editando?.id === v.id;
                    return (
                      <tr key={v.id} style={{ borderColor: "#1e293b", background: enEdit ? "#0f1e36" : undefined }}>
                        <td style={{ padding: "9px 14px", color: "#64748b", whiteSpace: "nowrap" }}>
                          {new Date(v.fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}
                        </td>
                        <td style={{ padding: "9px 14px", color: "#94a3b8", fontWeight: 600 }}>
                          {username(v.vendedor_email)}
                        </td>
                        <td style={{ padding: "9px 14px", color: "#e2e8f0" }}>{v.producto}</td>
                        <td style={{ padding: "9px 14px", color: "#a78bfa" }}>{v.sabor}</td>
                        <td style={{ padding: "9px 14px", textAlign: "right" }}>
                          {enEdit ? (
                            <input
                              type="number" min="1"
                              value={editando.cantidad}
                              onChange={e => setEditando({ ...editando, cantidad: e.target.value })}
                              style={{ ...inputSt, width: 60, textAlign: "right", padding: "2px 6px", fontSize: "0.82rem" }}
                            />
                          ) : (
                            <span style={{ color: "#f1f5f9", fontWeight: 600 }}>{v.cantidad}</span>
                          )}
                        </td>
                        <td style={{ padding: "9px 14px", textAlign: "right" }}>
                          {enEdit ? (
                            <input
                              type="number" min="0"
                              value={editando.precio_unitario}
                              onChange={e => setEditando({ ...editando, precio_unitario: e.target.value })}
                              style={{ ...inputSt, width: 90, textAlign: "right", padding: "2px 6px", fontSize: "0.82rem" }}
                            />
                          ) : (
                            <span style={{ color: "#94a3b8" }}>{fmt(v.precio_unitario)}</span>
                          )}
                        </td>
                        <td style={{ padding: "9px 14px", textAlign: "right", color: "#10b981", fontWeight: 600 }}>
                          {enEdit
                            ? fmt(Number(editando.cantidad) * Number(editando.precio_unitario))
                            : fmt(v.total)}
                        </td>
                        <td style={{ padding: "9px 14px" }}>
                          {enEdit ? (
                            <div className="d-flex gap-1">
                              <button
                                onClick={guardarEdit}
                                disabled={guardando}
                                style={{
                                  background: "#10b981", border: "none", color: "#fff",
                                  borderRadius: 5, padding: "3px 8px", fontSize: "0.72rem",
                                  fontWeight: 700, cursor: "pointer",
                                }}
                              >
                                {guardando ? "..." : "OK"}
                              </button>
                              <button
                                onClick={cerrarEdit}
                                style={{
                                  background: "transparent", border: "1px solid #334155",
                                  color: "#64748b", borderRadius: 5,
                                  padding: "3px 6px", fontSize: "0.72rem", cursor: "pointer",
                                }}
                              >
                                X
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => abrirEdit(v)}
                              style={{
                                background: "#1e293b", border: "1px solid #334155",
                                color: "#94a3b8", borderRadius: 5,
                                padding: "3px 10px", fontSize: "0.72rem", cursor: "pointer",
                              }}
                            >
                              Editar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal edición: no hay modal, todo es inline */}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function VendedoresStats() {
  const [tab, setTab] = useState("semana");
  const hoy = new Date();

  const semanaHoy = getSemanaActual();
  const [semana,     setSemana]     = useState(semanaHoy.semana);
  const [anioSemana, setAnioSemana] = useState(semanaHoy.anio);
  const [mes,        setMes]        = useState(hoy.getMonth() + 1);
  const [anioMes,    setAnioMes]    = useState(hoy.getFullYear());

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const cargar = useCallback(async () => {
    if (tab === "deudas") return; // deudas tiene su propio fetch
    setLoading(true);
    setError("");
    setData(null);
    try {
      const endpoint = tab === "semana"
        ? { url: "/vendedores/resumen-semana", params: { semana, anio: anioSemana } }
        : { url: "/vendedores/resumen-mes",    params: { mes,    anio: anioMes    } };
      const { data: res } = await axios.get(endpoint.url, { params: endpoint.params });
      setData(res);
    } catch {
      setError("Error al cargar los datos.");
    } finally {
      setLoading(false);
    }
  }, [tab, semana, anioSemana, mes, anioMes]);

  useEffect(() => { cargar(); }, [cargar]);

  const TABS = [
    { key: "semana",  label: "Semana",  activeColor: "#3b82f6" },
    { key: "mes",     label: "Mes",     activeColor: "#3b82f6" },
    { key: "deudas",  label: "Deudas",  activeColor: "#10b981" },
    { key: "rendicion", label: "Rendición", activeColor: "#f59e0b" },
    { key: "detalle", label: "Detalle", activeColor: "#8b5cf6" },
  ];

  return (
    <div className="container-fluid mt-4 px-3 mb-5">
      {/* Header */}
      <div className="mb-4">
        <h4 style={{ color: "#f1f5f9", fontWeight: 700, marginBottom: 4 }}>
          Rendimiento de Vendedores
        </h4>
        <p style={{ color: "#64748b", fontSize: "0.85rem", margin: 0 }}>
          Ventas semanales, mensuales y estado de deudas por vendedor.
        </p>
      </div>

      {/* Tabs */}
      <div className="d-flex gap-2 mb-4 flex-wrap">
        {TABS.map(({ key, label, activeColor }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              background: tab === key ? activeColor : "#111827",
              border:     `1px solid ${tab === key ? activeColor : "#1e293b"}`,
              color:      tab === key ? "#fff" : "#94a3b8",
              borderRadius: 8,
              padding: "7px 20px",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab: deudas */}
      {tab === "deudas" && <PanelDeudas />}

      {/* Tab: rendición — qué vendió contra qué rindió, día por día */}
      {tab === "rendicion" && <PanelRendicion />}

      {/* Tab: detalle */}
      {tab === "detalle" && (
        <PanelDetalle
          semana={semana} anioSemana={anioSemana}
          mes={mes} anioMes={anioMes}
          setSemana={setSemana} setAnioSemana={setAnioSemana}
          setMes={setMes} setAnioMes={setAnioMes}
        />
      )}

      {/* Tab: semana / mes — selector de período */}
      {tab !== "deudas" && (
        <>
          <div style={card} className="mb-4">
            {tab === "semana" ? (
              <div className="d-flex align-items-center gap-4 flex-wrap">
                <NavPeriod
                  label="Semana"
                  display={`Sem. ${semana} — ${anioSemana}`}
                  onPrev={() => semana > 1 ? setSemana(semana - 1) : (setSemana(53), setAnioSemana(anioSemana - 1))}
                  onNext={() => semana < 53 ? setSemana(semana + 1) : (setSemana(1), setAnioSemana(anioSemana + 1))}
                />
                {data?.inicio && (
                  <p style={{ color: "#475569", fontSize: "0.82rem", margin: 0, alignSelf: "flex-end" }}>
                    {new Date(data.inicio + "T00:00:00").toLocaleDateString("es-AR")}
                    {" → "}
                    {new Date(data.fin + "T00:00:00").toLocaleDateString("es-AR")}
                  </p>
                )}
              </div>
            ) : (
              <NavPeriod
                label="Mes"
                display={`${meses[mes]} ${anioMes}`}
                onPrev={() => mes > 1  ? setMes(mes - 1) : (setMes(12), setAnioMes(anioMes - 1))}
                onNext={() => mes < 12 ? setMes(mes + 1) : (setMes(1),  setAnioMes(anioMes + 1))}
              />
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div className="text-center py-5">
              <div className="spinner-border text-secondary" role="status" />
              <p style={{ color: "#64748b", marginTop: 12 }}>Cargando...</p>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="alert alert-danger">{error}</div>
          )}

          {/* Resultados */}
          {!loading && !error && data && (
            <>
              <div className="row g-4">
                {data.vendedores?.length === 0 && (
                  <div className="col-12">
                    <p style={{ color: "#475569" }}>No hay vendedores registrados.</p>
                  </div>
                )}
                {data.vendedores?.map((v) => (
                  <div className="col-12 col-lg-6" key={v.id}>
                    <VendedorCard v={v} tab={tab} />
                  </div>
                ))}
              </div>

              {/* Totales */}
              {data.vendedores?.length > 0 && (
                <div className="mt-4" style={{ ...card, borderColor: "#1e40af40" }}>
                  <p style={labelSt} className="mb-3">
                    Total —{" "}
                    {tab === "semana"
                      ? `Semana ${data.semana} / ${data.anio}`
                      : `${data.mes_nombre} ${data.anio}`}
                  </p>
                  <div className="d-flex gap-5 flex-wrap">
                    <div>
                      <p style={{ color: "#64748b", fontSize: "0.8rem", margin: 0 }}>Monto total</p>
                      <p style={{ color: "#10b981", fontWeight: 700, fontSize: "1.4rem", margin: 0 }}>
                        {fmt(data.vendedores.reduce((s, v) => s + v.total_monto, 0))}
                      </p>
                    </div>
                    <div>
                      <p style={{ color: "#64748b", fontSize: "0.8rem", margin: 0 }}>Unidades</p>
                      <p style={{ color: "#f1f5f9", fontWeight: 700, fontSize: "1.4rem", margin: 0 }}>
                        {data.vendedores.reduce((s, v) => s + v.total_pares, 0)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
