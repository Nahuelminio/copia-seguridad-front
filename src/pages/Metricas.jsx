import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "../utils/axiosInstance";

const fmt = (n) => `$${Math.round(Number(n) || 0).toLocaleString("es-AR")}`;
const pct = (parte, total) => (total > 0 ? `${Math.round((parte / total) * 100)}%` : "—");

const card = {
  background: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: 14,
  padding: "18px 22px",
};
const label = {
  fontSize: "0.62rem",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: "#64748b",
  fontWeight: 700,
};

// Un color por canal, para reconocerlos de un vistazo entre las tarjetas,
// la barra de participación y el detalle.
const COLORES = {
  central: "#38bdf8",
  sucursales: "#10b981",
  vendedores: "#a78bfa",
  eventos: "#f59e0b",
  mayorista: "#f472b6",
  shishas: "#fb923c",
};

const hoy = () => new Date();
const iso = (d) => d.toISOString().slice(0, 10);

/** Lunes de la semana de `d` */
const lunes = (d) => {
  const x = new Date(d);
  const dia = (x.getDay() + 6) % 7; // 0 = lunes
  x.setDate(x.getDate() - dia);
  x.setHours(0, 0, 0, 0);
  return x;
};

const sumarDias = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

// "agosto de 2026" -> "Agosto de 2026" (capitalize de CSS deja "Agosto De 2026")
const nombreMes = (d) => {
  const s = d.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/**
 * De dónde sale la plata.
 *
 * Junta en un solo lugar los canales que hoy están repartidos por el sistema:
 * las ventas de Central, las de los locales, las de los vendedores, los
 * eventos, el mayorista y las shishas. De cada uno muestra cuánto facturó y
 * cuánto dejó, para poder compararlos entre sí.
 */
export default function Metricas() {
  const [paso, setPaso] = useState("mes");        // "mes" | "semana"
  const [ancla, setAncla] = useState(hoy());       // día dentro del período elegido
  const [datos, setDatos] = useState(null);
  const [serie, setSerie] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // El rango es [desde, hasta) — `hasta` exclusivo, así no hay que pelear con
  // la hora del último día.
  const rango = useMemo(() => {
    if (paso === "semana") {
      const d = lunes(ancla);
      return { desde: iso(d), hasta: iso(sumarDias(d, 7)), titulo: `Semana del ${d.toLocaleDateString("es-AR")}` };
    }
    const d = new Date(ancla.getFullYear(), ancla.getMonth(), 1);
    const h = new Date(ancla.getFullYear(), ancla.getMonth() + 1, 1);
    return { desde: iso(d), hasta: iso(h), titulo: nombreMes(d) };
  }, [paso, ancla]);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      // La serie arranca bastante antes del período para poder ver la evolución
      const desdeSerie = paso === "semana"
        ? iso(sumarDias(lunes(ancla), -7 * 11))
        : iso(new Date(ancla.getFullYear(), ancla.getMonth() - 11, 1));

      const [a, b] = await Promise.all([
        axios.get(`/metricas/ingresos?desde=${rango.desde}&hasta=${rango.hasta}`),
        axios.get(`/metricas/serie?desde=${desdeSerie}&hasta=${rango.hasta}&paso=${paso}`),
      ]);
      setDatos(a.data);
      setSerie(b.data.periodos || []);
    } catch (e) {
      setError(e.response?.data?.error || "No se pudieron traer las métricas");
    } finally {
      setCargando(false);
    }
  }, [rango.desde, rango.hasta, paso, ancla]);

  useEffect(() => { cargar(); }, [cargar]);

  // El gráfico entra completo en la compu pero en el celular scrollea, y
  // arrancaba mostrando los períodos más viejos. Interesan los últimos.
  const grafico = useRef(null);
  useEffect(() => {
    if (grafico.current) grafico.current.scrollLeft = grafico.current.scrollWidth;
  }, [serie]);

  const mover = (n) => {
    setAncla((a) =>
      paso === "semana"
        ? sumarDias(a, 7 * n)
        : new Date(a.getFullYear(), a.getMonth() + n, 1)
    );
  };

  const t = datos?.totales;
  // El canal más grande primero: es el que interesa mirar
  const canales = (datos?.canales || [])
    .filter((c) => c.facturado > 0 || c.unidades > 0)
    .sort((a, b) => b.facturado - a.facturado);
  const maxSerie = Math.max(1, ...serie.map((p) => p.facturado));

  const claveActual = paso === "mes" ? rango.desde.slice(0, 7) : rango.desde;

  // El período anterior sale de la misma serie: es el último con ventas antes
  // del que se está mirando. Si no hubo movimiento en el medio, compara contra
  // ese, que es lo que uno querría igual.
  const anterior = useMemo(
    () =>
      [...serie]
        .filter((p) => p.periodo < claveActual)
        .sort((a, b) => a.periodo.localeCompare(b.periodo))
        .pop() || null,
    [serie, claveActual]
  );

  const variacion = (ahora, antes) => {
    if (!antes || antes === 0) return null;
    return ((ahora - antes) / Math.abs(antes)) * 100;
  };

  // Un período que todavía está corriendo va a comparar en desventaja
  const enCurso = rango.hasta > iso(hoy());

  // Si el día de hoy cae dentro del rango que se está viendo, ya estamos en el
  // período actual y el botón "Hoy" no tiene a dónde llevar.
  const enPeriodoActual = iso(hoy()) >= rango.desde && iso(hoy()) < rango.hasta;

  const Delta = ({ v }) => {
    if (v === null || !isFinite(v)) return null;
    const sube = v >= 0;
    return (
      <span style={{ color: sube ? "#10b981" : "#f87171", fontSize: "0.74rem", fontWeight: 600 }}>
        {sube ? "▲" : "▼"} {Math.abs(Math.round(v))}%
      </span>
    );
  };

  const btn = {
    background: "#0f172a",
    border: "1px solid #334155",
    color: "#cbd5e1",
    borderRadius: 9,
    padding: "6px 12px",
    fontSize: "0.82rem",
  };

  return (
    <div className="container-fluid mt-4 px-3 mb-5">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
        <div>
          <h4 style={{ color: "#f1f5f9", fontWeight: 700, marginBottom: 4 }}>
            Fuentes de ingreso
          </h4>
          <p style={{ color: "#64748b", fontSize: "0.84rem", margin: 0 }}>
            Cuánto facturó y cuánto dejó cada parte del negocio.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <div className="d-flex" style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 9 }}>
            {["mes", "semana"].map((p) => (
              <button key={p} onClick={() => setPaso(p)}
                style={{
                  ...btn, border: "none",
                  background: paso === p ? "#1e293b" : "transparent",
                  color: paso === p ? "#f1f5f9" : "#64748b",
                  fontWeight: paso === p ? 700 : 400,
                }}>
                Por {p}
              </button>
            ))}
          </div>
          <button style={btn} onClick={() => mover(-1)}>←</button>
          <span style={{ color: "#e2e8f0", fontWeight: 600, minWidth: 170, textAlign: "center" }}>
            {rango.titulo}
          </span>
          <button style={btn} onClick={() => mover(1)}>→</button>
          {/* Estando ya en el período actual, "Hoy" no tiene nada que hacer y
              parecía que el botón estaba roto. Se apaga y lo dice. */}
          <button
            style={{ ...btn, opacity: enPeriodoActual ? 0.45 : 1, cursor: enPeriodoActual ? "default" : "pointer" }}
            disabled={enPeriodoActual}
            title={enPeriodoActual ? `Ya estás viendo ${paso === "mes" ? "este mes" : "esta semana"}` : "Volver al período actual"}
            onClick={() => setAncla(hoy())}
          >
            Hoy
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2">{error}</div>}
      {cargando && <div className="text-center py-5"><div className="spinner-border text-secondary" /></div>}

      {!cargando && datos && (
        <>
          {/* ── Totales ── */}
          <div className="d-flex flex-wrap gap-3 mb-3">
            {[
              { t: "Facturado", v: fmt(t.facturado), c: "#f1f5f9", d: variacion(t.facturado, anterior?.facturado) },
              { t: "Costo", v: fmt(t.costo), c: "#94a3b8" },
              { t: "Ganancia", v: fmt(t.ganancia), c: "#10b981", d: variacion(t.ganancia, anterior?.ganancia) },
              { t: "Margen", v: pct(t.ganancia, t.facturado), c: "#10b981" },
              { t: "Unidades", v: t.unidades.toLocaleString("es-AR"), c: "#cbd5e1" },
            ].map((x) => (
              // 140px de base para que en el celular entren dos por fila y no
              // haya que scrollear cinco tarjetas para ver los totales
              <div key={x.t} style={{ ...card, flex: "1 1 140px", minWidth: 138, padding: "14px 16px" }}>
                <div style={label}>{x.t}</div>
                <div style={{ color: x.c, fontWeight: 700, fontSize: "1.4rem", marginTop: 4 }}>{x.v}</div>
                {x.d !== undefined && x.d !== null && (
                  <div style={{ marginTop: 2 }}>
                    <Delta v={x.d} />{" "}
                    <span style={{ color: "#475569", fontSize: "0.7rem" }}>
                      vs {paso === "mes" ? "mes ant." : "sem. ant."}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Un período a medio correr siempre va a comparar para abajo */}
          {enCurso && anterior && (
            <div style={{ color: "#64748b", fontSize: "0.76rem", marginTop: -6, marginBottom: 14 }}>
              Este {paso} todavía está en curso, así que la comparación es contra
              un {paso} completo.
            </div>
          )}

          {/* Aviso general de qué tan confiable es la ganancia del período */}
          {t.facturado_sin_costo > 0 && t.facturado_sin_costo / t.facturado > 0.1 && (
            <div style={{
              ...card, marginBottom: 16, borderColor: "#78350f", background: "#1c1408",
              color: "#fbbf24", fontSize: "0.8rem", lineHeight: 1.6,
            }}>
              <strong>Ojo con la ganancia de este período.</strong>{" "}
              {fmt(t.facturado_sin_costo)} de lo facturado ({pct(t.facturado_sin_costo, t.facturado)})
              corresponde a productos sin costo de reposición cargado, así que su costo se cuenta
              como cero y la ganancia sale más alta de lo que fue.
            </div>
          )}

          {/* ── Participación de cada canal ── */}
          {t.facturado > 0 && (
            <div style={{ ...card, marginBottom: 16 }}>
              <div style={{ ...label, marginBottom: 10 }}>Participación en lo facturado</div>
              <div className="d-flex" style={{ height: 14, borderRadius: 999, overflow: "hidden", background: "#1e293b" }}>
                {canales.map((c) => (
                  <div key={c.clave}
                    title={`${c.nombre}: ${fmt(c.facturado)}`}
                    style={{ width: `${(c.facturado / t.facturado) * 100}%`, background: COLORES[c.clave] }} />
                ))}
              </div>
              <div className="d-flex flex-wrap gap-3 mt-2">
                {canales.map((c) => (
                  <span key={c.clave} style={{ color: "#94a3b8", fontSize: "0.76rem" }}>
                    <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 3,
                      background: COLORES[c.clave], marginRight: 5 }} />
                    {c.nombre} {pct(c.facturado, t.facturado)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Detalle por canal ── */}
          <div className="d-flex flex-wrap gap-3 mb-3">
            {canales.map((c) => (
              <div key={c.clave} style={{ ...card, flex: "1 1 300px", borderLeft: `3px solid ${COLORES[c.clave]}` }}>
                <div className="d-flex justify-content-between align-items-baseline">
                  <strong style={{ color: "#f1f5f9" }}>{c.nombre}</strong>
                  <span style={{ color: "#64748b", fontSize: "0.74rem" }}>
                    {c.clave === "mayorista" ? `${c.pedidos} pedidos` : `${c.unidades} u.`}
                  </span>
                </div>
                <div className="d-flex justify-content-between mt-3">
                  <div>
                    <div style={label}>Facturado</div>
                    <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: "1.05rem" }}>{fmt(c.facturado)}</div>
                    {anterior?.canales?.[c.clave] > 0 && (
                      <Delta v={variacion(c.facturado, anterior.canales[c.clave])} />
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={label}>Ganancia</div>
                    <div style={{ color: c.ganancia > 0 ? "#10b981" : "#64748b", fontWeight: 700, fontSize: "1.05rem" }}>
                      {fmt(c.ganancia)}
                    </div>
                    <div style={{ color: "#475569", fontSize: "0.72rem" }}>
                      margen {pct(c.ganancia, c.facturado)}
                    </div>
                  </div>
                </div>

                {/* Avisos de por qué un número puede no ser exacto */}
                {c.facturado_sin_costo > 0 && (
                  <div style={{ color: "#fbbf24", fontSize: "0.72rem", marginTop: 10, lineHeight: 1.5 }}>
                    {fmt(c.facturado_sin_costo)} sin costo cargado ({pct(c.facturado_sin_costo, c.facturado)} de
                    lo facturado): ahí la ganancia sale más alta de lo real.
                  </div>
                )}
                {c.clave === "mayorista" && c.sin_cotizacion > 0 && (
                  <div style={{ color: "#fbbf24", fontSize: "0.72rem", marginTop: 10, lineHeight: 1.5 }}>
                    {c.sin_cotizacion} de {c.pedidos} pedidos se confirmaron sin tipo de cambio: se pasaron a
                    pesos con el dólar del pedido más cercano.
                  </div>
                )}
                {c.clave === "shishas" && c.etapa === "recupero" && (
                  <div style={{ color: "#fbbf24", fontSize: "0.72rem", marginTop: 10, lineHeight: 1.5 }}>
                    En recupero: el margen de {fmt(c.margen)} va a cubrir la inversión, así que todavía no te
                    queda nada. Faltan {fmt(c.falta_para_cubrir)} para empezar el 50/50.
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── Sucursales ── */}
          {datos.sucursales.length > 0 && (
            <div style={{ ...card, marginBottom: 16 }}>
              <div style={{ ...label, marginBottom: 12 }}>Detalle de sucursales</div>
              {/* En el celular la tabla no entra y se apretaba hasta partir los
                  nombres: mejor que scrollee sola. */}
              <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: 420, fontSize: "0.86rem" }}>
                <thead>
                  <tr style={{ color: "#64748b", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    <th style={{ textAlign: "left", paddingBottom: 8 }}>Sucursal</th>
                    <th style={{ textAlign: "right", paddingBottom: 8 }}>Unid.</th>
                    <th style={{ textAlign: "right", paddingBottom: 8 }}>Facturado</th>
                    <th style={{ textAlign: "right", paddingBottom: 8 }}>Ganancia</th>
                    <th style={{ textAlign: "right", paddingBottom: 8 }}>Margen</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.sucursales.map((s) => (
                    <tr key={s.id} style={{ borderTop: "1px solid #1e293b" }}>
                      <td style={{ color: "#e2e8f0", padding: "8px 0" }}>{s.nombre}</td>
                      <td style={{ color: "#94a3b8", textAlign: "right" }}>{s.unidades}</td>
                      <td style={{ color: "#e2e8f0", textAlign: "right" }}>{fmt(s.facturado)}</td>
                      <td style={{ color: "#10b981", textAlign: "right", fontWeight: 600 }}>{fmt(s.ganancia)}</td>
                      <td style={{ color: "#64748b", textAlign: "right" }}>{pct(s.ganancia, s.facturado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}

          {/* ── Evolución ── */}
          {serie.length > 1 && (
            <div style={card}>
              <div style={{ ...label, marginBottom: 14 }}>
                Evolución por {paso} — facturado y ganancia
              </div>
              <div ref={grafico} className="d-flex align-items-end gap-2"
                style={{ height: 170, overflowX: "auto" }}>
                {serie.map((p) => {
                  const esActual = p.periodo === (paso === "mes" ? rango.desde.slice(0, 7) : rango.desde);
                  // Si buena parte del período no tiene costo cargado, su
                  // ganancia está inflada: se marca para no leerla como buena.
                  const dudoso = p.facturado > 0 && p.facturado_sin_costo / p.facturado > 0.25;
                  return (
                    <div key={p.periodo} className="d-flex flex-column align-items-center"
                      style={{ flex: "1 0 46px", minWidth: 46 }}
                      title={`${p.periodo}\nFacturado ${fmt(p.facturado)}\nGanancia ${fmt(p.ganancia)}${
                        dudoso ? `\n⚠ ${fmt(p.facturado_sin_costo)} sin costo cargado: la ganancia está inflada` : ""
                      }`}>
                      <div style={{ position: "relative", width: "100%", height: 130,
                        display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                        {/* La ganancia va dentro de la barra de facturado: se ve
                            la proporción sin necesitar dos escalas. */}
                        <div style={{ width: "70%", height: `${(p.facturado / maxSerie) * 100}%`,
                          background: esActual ? "#1e3a5f" : "#172033",
                          border: `1px solid ${esActual ? "#38bdf8" : "#1e293b"}`,
                          borderRadius: "5px 5px 0 0", position: "relative", display: "flex", alignItems: "flex-end" }}>
                          <div style={{ width: "100%",
                            height: `${p.facturado > 0 ? Math.max(0, (p.ganancia / p.facturado) * 100) : 0}%`,
                            borderRadius: "0 0 3px 3px",
                            // Rayado cuando el costo falta: se ve que ese verde
                            // no es confiable.
                            background: dudoso
                              ? "repeating-linear-gradient(45deg, #10b981 0 4px, #0b3f2f 4px 8px)"
                              : "#10b981",
                            opacity: dudoso ? 0.55 : 0.85 }} />
                        </div>
                      </div>
                      <div style={{ color: esActual ? "#38bdf8" : "#64748b", fontSize: "0.62rem",
                        marginTop: 6, whiteSpace: "nowrap" }}>
                        {paso === "mes" ? p.periodo.slice(2) : p.periodo.slice(5)}
                        {dudoso && <span style={{ color: "#fbbf24" }}> ⚠</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="d-flex gap-3 mt-3" style={{ color: "#64748b", fontSize: "0.74rem" }}>
                <span><span style={{ display: "inline-block", width: 9, height: 9, background: "#172033",
                  border: "1px solid #1e293b", marginRight: 5 }} />Facturado</span>
                <span><span style={{ display: "inline-block", width: 9, height: 9, background: "#10b981",
                  marginRight: 5 }} />Ganancia</span>
                {serie.some((p) => p.facturado > 0 && p.facturado_sin_costo / p.facturado > 0.25) && (
                  <span style={{ color: "#fbbf24" }}>
                    ⚠ rayado = faltan costos cargados, la ganancia de ese período está inflada
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
