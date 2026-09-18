import React, { useCallback, useMemo } from "react";
import { calcularEntrega, htmlEntrega, fmt, fecha } from "./reciboHtml";
import imprimirHoja from "./imprimirHoja";

/**
 * Remito de lo que se le deja a la fiesta al empezar el evento.
 *
 * Es la contraparte de la rendición: esa se arma al cerrar, esta al entregar,
 * para que en el local puedan contar la mercadería contra un papel.
 *
 * `evento` es lo que devuelve GET /eventos/:id.
 */
export default function EntregaEvento({ evento, onClose }) {
  const datos = useMemo(() => calcularEntrega(evento), [evento]);

  const imprimir = useCallback(
    () => imprimirHoja(htmlEntrega(evento, datos)),
    [evento, datos]
  );

  // Para mandarlo por WhatsApp sin adjuntar el PDF
  const copiar = useCallback(() => {
    navigator.clipboard?.writeText(
      [
        `ENTREGA — ${evento.nombre}`,
        `${fecha(evento.fecha)}${evento.lugar ? ` · ${evento.lugar}` : ""}`,
        "",
        ...datos.filas.map((f) => `${f.llevadas} x ${f.modelo} - ${f.gusto}`),
        "",
        `Total: ${datos.unidades} unidades en ${datos.modelos} modelos`,
      ].join("\n")
    );
  }, [evento, datos]);

  const th = {
    textAlign: "right",
    fontSize: "0.62rem",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#64748b",
    fontWeight: 700,
    padding: "0 0 8px",
    borderBottom: "1px solid #1e293b",
  };
  const td = {
    textAlign: "right",
    padding: "7px 0",
    borderBottom: "1px solid #16202f",
    color: "#cbd5e1",
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.78)", zIndex: 1070,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14,
          padding: 24, width: "100%", maxWidth: 680, maxHeight: "88vh", overflow: "auto",
        }}
      >
        <div style={{ color: "#f1f5f9", fontWeight: 700 }}>Entrega · {evento.nombre}</div>
        <div style={{ color: "#64748b", fontSize: "0.78rem", marginBottom: 18 }}>
          {fecha(evento.fecha)}
          {evento.lugar && ` · ${evento.lugar}`} · Remito N° {datos.numero}
        </div>

        {datos.filas.length === 0 ? (
          <p style={{ color: "#94a3b8" }}>
            Este evento todavía no tiene mercadería cargada.
          </p>
        ) : (
          <>
            <table style={{ width: "100%", fontSize: "0.82rem" }}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: "left" }}>Producto</th>
                  <th style={th}>Precio</th>
                  <th style={th}>Dejadas</th>
                </tr>
              </thead>
              <tbody>
                {datos.filas.map((f) => (
                  <tr key={f.id}>
                    <td style={{ ...td, textAlign: "left" }}>
                      {f.modelo} · {f.gusto}
                    </td>
                    <td style={td}>{fmt(f.precio)}</td>
                    <td style={{ ...td, fontWeight: 700, color: "#f1f5f9" }}>{f.llevadas}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div
              className="d-flex justify-content-between"
              style={{
                borderTop: "1px solid #334155", marginTop: 10, paddingTop: 10,
                color: "#f1f5f9", fontWeight: 700,
              }}
            >
              <span>{datos.modelos} modelos</span>
              <span>{datos.unidades} unidades</span>
            </div>
            <div style={{ color: "#64748b", fontSize: "0.78rem", marginTop: 6, textAlign: "right" }}>
              Valor si se vende todo: {fmt(datos.valor)}
            </div>
          </>
        )}

        <div className="d-flex gap-2 mt-4">
          <button
            className="btn btn-sm flex-fill"
            onClick={imprimir}
            disabled={datos.filas.length === 0}
            style={{ background: "#065f46", border: "1px solid #10b981", color: "#6ee7b7", fontWeight: 600 }}
          >
            Imprimir / PDF
          </button>
          <button
            className="btn btn-sm flex-fill"
            onClick={copiar}
            disabled={datos.filas.length === 0}
            style={{ background: "#0f172a", border: "1px solid #334155", color: "#38bdf8" }}
          >
            Copiar para WhatsApp
          </button>
          <button
            className="btn btn-sm"
            onClick={onClose}
            style={{ background: "transparent", border: "1px solid #334155", color: "#94a3b8" }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
