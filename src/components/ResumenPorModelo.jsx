import React, { useEffect, useState } from "react";
import axios from "../utils/axiosInstance";
import { getUsuario } from "../utils/auth";

const usd = (n) => "USD " + Number(n).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Cuántas unidades van de cada modelo, sumando todos sus sabores. Es para
// controlar al armar las cajas: "4 V155" en vez de contar renglón por renglón.
//
// Al admin además le muestra el precio mínimo de cada modelo (su costo en
// dólares con el pase) y lo marca si el pedido lo está cobrando por debajo.
export default function ResumenPorModelo({ items = [] }) {
  const esAdmin = (getUsuario()?.rol || "").toLowerCase() === "admin";
  const [costos, setCostos] = useState({});

  useEffect(() => {
    if (!esAdmin) return;
    axios.get("/mayorista/costos-usd").then((r) => setCostos(r.data || {})).catch(() => {});
  }, [esAdmin]);

  const porModelo = new Map();
  for (const it of items) {
    const nombre = it.producto_nombre || "Sin modelo";
    const m = porModelo.get(nombre) || { nombre, unidades: 0, sabores: 0, facturado: 0, conPrecio: 0 };
    const cant = Number(it.cantidad) || 0;
    const precio = parseFloat(it.precio_usd);
    m.unidades += cant;
    m.sabores += 1;
    if (precio > 0) { m.facturado += precio * cant; m.conPrecio += cant; }
    porModelo.set(nombre, m);
  }
  const filas = [...porModelo.values()].sort((a, b) => b.unidades - a.unidades);
  if (!filas.length) return null;
  const total = filas.reduce((s, f) => s + f.unidades, 0);
  const verCostos = esAdmin && Object.keys(costos).length > 0;

  return (
    <div className="mx-auto mt-3" style={{
      maxWidth: 900, background: "#0f172a", border: "1px solid #1e293b",
      borderRadius: 12, padding: "14px 18px", color: "#e2e8f0",
    }}>
      <div className="d-flex justify-content-between" style={{ color: "#64748b", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
        <span>Control de cajas · unidades por modelo</span>
        {verCostos && <span>Precio / mínimo</span>}
      </div>
      {filas.map((f) => {
        const minimo = costos[f.nombre];
        const promedio = f.conPrecio ? f.facturado / f.conPrecio : null;
        const debajo = minimo != null && promedio != null && promedio < minimo;
        return (
          <div key={f.nombre} className="d-flex justify-content-between align-items-center py-1 gap-2"
            style={{ borderBottom: "1px solid #1e293b", fontSize: "0.92rem" }}>
            <span>
              <strong style={{ fontSize: "1.05rem", marginRight: 8 }}>{f.unidades}</strong>
              {f.nombre}{" "}
              <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                ({f.sabores} sabor{f.sabores !== 1 ? "es" : ""})
              </span>
            </span>
            {verCostos && (
              <span style={{ fontSize: "0.82rem", whiteSpace: "nowrap", textAlign: "right" }}>
                <span style={{ color: debajo ? "#f87171" : "#e2e8f0", fontWeight: 600 }}>
                  {promedio != null ? usd(promedio) : "—"}
                </span>
                <span style={{ color: "#64748b" }}> / </span>
                <span style={{ color: "#fbbf24" }}>{minimo != null ? usd(minimo) : "sin costo"}</span>
                {debajo && <div style={{ color: "#f87171", fontSize: "0.72rem" }}>⚠ debajo del costo</div>}
              </span>
            )}
          </div>
        );
      })}
      <div className="d-flex justify-content-between pt-2" style={{ fontSize: "1rem" }}>
        <span style={{ color: "#94a3b8" }}>Total</span>
        <strong style={{ color: "#4ade80", fontSize: "1.15rem" }}>{total} unidades</strong>
      </div>
      {verCostos && (
        <div className="mt-1" style={{ color: "#475569", fontSize: "0.72rem" }}>
          Mínimo = costo de la última reposición con el pase. Debajo de eso perdés plata.
        </div>
      )}
    </div>
  );
}
