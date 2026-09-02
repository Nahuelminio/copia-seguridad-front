import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../utils/axiosInstance";

const fmt = (n) =>
  Number(n).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });

const fmtPct = (n) =>
  n != null ? `${n > 0 ? "+" : ""}${n.toFixed(1)}%` : "—";

function MargenBadge({ pct }) {
  if (pct == null)
    return <span style={{ color: "#475569", fontSize: "0.75rem" }}>—</span>;
  const color =
    pct >= 30 ? "#10b981" : pct >= 10 ? "#f59e0b" : "#f87171";
  return (
    <span
      style={{
        background: `${color}18`,
        color,
        border: `1px solid ${color}40`,
        borderRadius: 5,
        padding: "1px 6px",
        fontSize: "0.75rem",
        fontWeight: 700,
      }}
    >
      {fmtPct(pct)}
    </span>
  );
}

export default function ResumenCostosCentral() {
  const navigate = useNavigate();

  const hoy = new Date();
  const desde = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-01`;
  const hasta = hoy.toISOString().slice(0, 10);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    axios
      .get("/costos-central", { params: { desde, hasta } })
      .then((r) => setData(r.data))
      .catch(() => setError("No se pudo cargar"))
      .finally(() => setLoading(false));
  }, [desde, hasta]);

  const labelStyle = {
    color: "#64748b",
    fontSize: "0.68rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: 2,
  };

  if (loading)
    return (
      <div className="text-center py-3">
        <div
          className="spinner-border spinner-border-sm text-secondary"
          role="status"
        />
      </div>
    );

  if (error)
    return <p style={{ color: "#f87171", fontSize: "0.82rem" }}>{error}</p>;

  if (!data || !data.totales)
    return (
      <p style={{ color: "#475569", fontSize: "0.82rem" }}>
        Sin datos este mes.
      </p>
    );

  const { totales, productos } = data;

  // Top 5 products by highest cost
  const top5Costo = [...productos]
    .sort((a, b) => b.costo_total - a.costo_total)
    .slice(0, 5);

  // Top 5 by margin (best margin first, only those with margin data)
  const top5Margen = [...productos]
    .filter((p) => p.margen_pct != null)
    .sort((a, b) => b.margen_pct - a.margen_pct)
    .slice(0, 5);

  const metricas = [
    {
      label: "Invertido en reposición",
      value: fmt(totales.costo_total),
      color: "#f87171",
    },
    {
      label: "Facturado (mes actual)",
      value: fmt(totales.total_facturado),
      color: "#10b981",
    },
    {
      label: "Ganancia",
      value: fmt(totales.ganancia_real),
      color: totales.ganancia_real >= 0 ? "#10b981" : "#f87171",
    },
    {
      label: "Margen general",
      value:
        totales.total_facturado > 0
          ? fmtPct((totales.ganancia_real / totales.total_facturado) * 100)
          : fmtPct(null),
      color: "#6366f1",
    },
  ];

  const rowStyle = {
    borderBottom: "1px solid #1e293b",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "6px 0",
    fontSize: "0.82rem",
  };

  return (
    <div>
      {/* KPI cards */}
      <div className="row g-2 mb-3">
        {metricas.map(({ label, value, color }) => (
          <div className="col-6 col-xl-3" key={label}>
            <div
              style={{
                background: "#0f172a",
                border: `1px solid ${color}28`,
                borderRadius: 9,
                padding: "10px 14px",
              }}
            >
              <p style={labelStyle}>{label}</p>
              <p
                style={{
                  color,
                  fontWeight: 700,
                  fontSize: "1.05rem",
                  margin: 0,
                }}
              >
                {value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Two mini-tables side by side */}
      <div className="row g-3">
        {/* Top costo */}
        <div className="col-12 col-md-6">
          <p
            style={{
              ...labelStyle,
              marginBottom: 8,
              color: "#f87171",
            }}
          >
            Mayor inversión este mes
          </p>
          {top5Costo.length === 0 ? (
            <p style={{ color: "#475569", fontSize: "0.8rem" }}>Sin datos</p>
          ) : (
            top5Costo.map((p) => (
              <div key={p.gusto_id} style={rowStyle}>
                <span style={{ color: "#e2e8f0" }}>
                  {p.producto}{" "}
                  <span style={{ color: "#64748b", fontSize: "0.75rem" }}>
                    {p.gusto}
                  </span>
                </span>
                <span style={{ color: "#f87171", fontWeight: 600 }}>
                  {fmt(p.costo_total)}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Top margen */}
        <div className="col-12 col-md-6">
          <p
            style={{
              ...labelStyle,
              marginBottom: 8,
              color: "#10b981",
            }}
          >
            Mejor margen este mes
          </p>
          {top5Margen.length === 0 ? (
            <p style={{ color: "#475569", fontSize: "0.8rem" }}>
              Cargá precios de costo para ver márgenes.
            </p>
          ) : (
            top5Margen.map((p) => (
              <div key={p.gusto_id} style={rowStyle}>
                <span style={{ color: "#e2e8f0" }}>
                  {p.producto}{" "}
                  <span style={{ color: "#64748b", fontSize: "0.75rem" }}>
                    {p.gusto}
                  </span>
                </span>
                <MargenBadge pct={p.margen_pct} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Products with no cost loaded warning */}
      {(() => {
        const sinCosto = productos.filter((p) => p.margen_pct == null).length;
        if (sinCosto === 0) return null;
        return (
          <p
            style={{
              color: "#f59e0b",
              fontSize: "0.75rem",
              marginTop: 10,
              marginBottom: 0,
            }}
          >
            ⚠ {sinCosto} producto{sinCosto !== 1 ? "s" : ""} sin precio de
            costo cargado — el margen general puede estar incompleto.
          </p>
        );
      })()}

      {/* Link to full page */}
      <div className="mt-3 text-end">
        <button
          onClick={() => navigate("/costos-central")}
          style={{
            background: "transparent",
            border: "1px solid #1e293b",
            borderRadius: 7,
            color: "#94a3b8",
            fontSize: "0.78rem",
            padding: "5px 14px",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#6366f1";
            e.currentTarget.style.color = "#a5b4fc";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#1e293b";
            e.currentTarget.style.color = "#94a3b8";
          }}
        >
          Ver análisis completo →
        </button>
      </div>
    </div>
  );
}
