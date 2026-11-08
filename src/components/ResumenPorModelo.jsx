import React from "react";

// Cuántas unidades van de cada modelo, sumando todos sus sabores. Es para
// controlar al armar las cajas: "4 V155" en vez de contar renglón por renglón.
export default function ResumenPorModelo({ items = [] }) {
  const porModelo = new Map();
  for (const it of items) {
    const nombre = it.producto_nombre || "Sin modelo";
    const m = porModelo.get(nombre) || { nombre, unidades: 0, sabores: 0 };
    m.unidades += Number(it.cantidad) || 0;
    m.sabores += 1;
    porModelo.set(nombre, m);
  }
  const filas = [...porModelo.values()].sort((a, b) => b.unidades - a.unidades);
  if (!filas.length) return null;
  const total = filas.reduce((s, f) => s + f.unidades, 0);

  return (
    <div className="mx-auto mt-3" style={{
      maxWidth: 900, background: "#0f172a", border: "1px solid #1e293b",
      borderRadius: 12, padding: "14px 18px", color: "#e2e8f0",
    }}>
      <div style={{ color: "#64748b", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
        Control de cajas · unidades por modelo
      </div>
      {filas.map((f) => (
        <div key={f.nombre} className="d-flex justify-content-between py-1"
          style={{ borderBottom: "1px solid #1e293b", fontSize: "0.92rem" }}>
          <span>
            {f.nombre}{" "}
            <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
              ({f.sabores} sabor{f.sabores !== 1 ? "es" : ""})
            </span>
          </span>
          <strong style={{ fontSize: "1.05rem" }}>{f.unidades}</strong>
        </div>
      ))}
      <div className="d-flex justify-content-between pt-2" style={{ fontSize: "1rem" }}>
        <span style={{ color: "#94a3b8" }}>Total</span>
        <strong style={{ color: "#4ade80", fontSize: "1.15rem" }}>{total} unidades</strong>
      </div>
    </div>
  );
}
