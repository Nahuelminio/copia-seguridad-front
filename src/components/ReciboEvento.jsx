import React, { useCallback, useMemo } from "react";
import { calcularRendicion, htmlRecibo, fmt, fecha } from "./reciboHtml";

/**
 * Comprobante de rendición para entregarle a la fiesta.
 *
 * Cuenta las tres cosas que se discuten al final de la noche: cuánto se dejó,
 * cuánto se vendió y cuánto hay que rendirnos. La fiesta le cobra al cliente el
 * precio de catálogo y se queda una comisión fija por unidad vendida, así que
 * lo que nos tiene que pagar es lo facturado menos esa comisión.
 *
 * `evento` es lo que devuelve GET /eventos/:id. Las devoluciones se pueden
 * pasar aparte (`devoluciones`) para poder mostrar el comprobante en el mismo
 * momento del cierre, sin esperar a recargar el evento desde el servidor.
 */
export default function ReciboEvento({ evento, devoluciones, onClose }) {
  const datos = useMemo(
    () => calcularRendicion(evento, devoluciones),
    [evento, devoluciones]
  );

  // Para mandar por WhatsApp sin adjuntar nada
  const copiar = useCallback(() => {
    const l = [
      `RENDICIÓN — ${evento.nombre}`,
      `${fecha(evento.fecha)}${evento.lugar ? ` · ${evento.lugar}` : ""}`,
      "",
      ...datos.filas
        .filter((f) => f.vendidas > 0)
        .map((f) => `${f.vendidas} x ${f.nombre} — ${fmt(f.total)}`),
      "",
      `Dejadas: ${datos.llevadas} · Devueltas: ${datos.devueltas} · Vendidas: ${datos.vendidas}`,
      `Total facturado: ${fmt(datos.facturado)}`,
      `Comisión (${datos.vendidas} x ${fmt(datos.comision)}): -${fmt(datos.comisionTotal)}`,
      `TOTAL A RENDIR: ${fmt(datos.aRendir)}`,
      ...(datos.directas
        ? [
            "",
            `(${datos.directas} unidad${datos.directas === 1 ? "" : "es"} se pagó directo a ` +
              `The North Shop: no lleva comisión y no entra en este total)`,
          ]
        : []),
    ].join("\n");
    navigator.clipboard?.writeText(l);
  }, [evento, datos]);

  const imprimir = useCallback(() => {
    // Se imprime desde un iframe con `srcdoc` y no con document.write() sobre
    // una ventana nueva: escribiendo el documento a mano el navegador lo pinta
    // mientras se parsea y salía cada texto duplicado ("RendRendición").
    // El iframe además no lo bloquea el filtro de pop-ups.
    // Va aparte del sistema para no arrastrar sus estilos oscuros al papel.
    const marco = document.createElement("iframe");
    marco.setAttribute("aria-hidden", "true");
    // Fuera de la vista pero con tamaño real: en display:none el navegador no
    // le calcula el layout y sale la hoja en blanco.
    Object.assign(marco.style, {
      position: "fixed", right: 0, bottom: 0,
      width: "210mm", height: "297mm", border: "0", opacity: "0", pointerEvents: "none",
    });

    marco.onload = () => {
      const v = marco.contentWindow;
      // Espera un frame a que apliquen los estilos y las imágenes de los logos
      const lanzar = () => {
        v.focus();
        v.print();
        // Recién se saca cuando el diálogo se cerró, si no se cancela la impresión
        setTimeout(() => marco.remove(), 1000);
      };
      if (v.document.fonts?.ready) v.document.fonts.ready.then(() => setTimeout(lanzar, 60));
      else setTimeout(lanzar, 200);
    };

    marco.srcdoc = htmlRecibo(evento, datos);
    document.body.appendChild(marco);
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
  const td = { textAlign: "right", padding: "7px 0", borderBottom: "1px solid #16202f", color: "#cbd5e1" };

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
        <div style={{ color: "#f1f5f9", fontWeight: 700 }}>Rendición · {evento.nombre}</div>
        <div style={{ color: "#64748b", fontSize: "0.78rem", marginBottom: 18 }}>
          {fecha(evento.fecha)}
          {evento.lugar && ` · ${evento.lugar}`} · Comprobante N° {datos.numero}
        </div>

        <table style={{ width: "100%", fontSize: "0.82rem" }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: "left" }}>Producto</th>
              <th style={th}>Dejadas</th>
              <th style={th}>Devuelt.</th>
              {datos.directas > 0 && <th style={th}>Directo</th>}
              <th style={th}>Vend.</th>
              <th style={th}>Total</th>
            </tr>
          </thead>
          <tbody>
            {datos.filas.map((f) => (
              <tr key={f.id} style={{ opacity: f.vendidas ? 1 : 0.45 }}>
                <td style={{ ...td, textAlign: "left" }}>{f.nombre}</td>
                <td style={td}>{f.llevadas}</td>
                <td style={td}>{f.devueltas}</td>
                {datos.directas > 0 && (
                  <td style={{ ...td, color: f.directas ? "#38bdf8" : "#475569" }}>
                    {f.directas || ""}
                  </td>
                )}
                <td style={{ ...td, color: f.vendidas ? "#10b981" : "#475569", fontWeight: 600 }}>
                  {f.vendidas}
                </td>
                <td style={td}>{fmt(f.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: 18, marginLeft: "auto", maxWidth: 340 }}>
          {[
            ["Total facturado", fmt(datos.facturado), "#cbd5e1"],
            [
              `Comisión (${datos.vendidas} x ${fmt(datos.comision)})`,
              `- ${fmt(datos.comisionTotal)}`,
              "#94a3b8",
            ],
          ].map(([t, v, c]) => (
            <div key={t} className="d-flex justify-content-between" style={{ padding: "4px 0", color: c, fontSize: "0.84rem" }}>
              <span>{t}</span><span>{v}</span>
            </div>
          ))}
          <div
            className="d-flex justify-content-between"
            style={{
              borderTop: "1px solid #334155", marginTop: 6, paddingTop: 10,
              color: "#10b981", fontWeight: 700, fontSize: "1.05rem",
            }}
          >
            <span>Total a rendir</span><span>{fmt(datos.aRendir)}</span>
          </div>
        </div>

        {datos.directas > 0 && (
          <div style={{ marginTop: 12, marginLeft: "auto", maxWidth: 340,
            color: "#64748b", fontSize: "0.76rem", lineHeight: 1.55 }}>
            Aparte: {datos.directas} unidad{datos.directas === 1 ? "" : "es"} pagada
            {datos.directas === 1 ? "" : "s"} directo a vos por {fmt(datos.facturadoDirecto)}.
            No paga{datos.directas === 1 ? "" : "n"} comisión, así que en total te
            quedan <strong style={{ color: "#10b981" }}>
              {fmt(datos.aRendir + datos.facturadoDirecto)}
            </strong>.
          </div>
        )}

        <div className="d-flex gap-2 mt-4">
          <button className="btn btn-sm flex-fill" onClick={imprimir}
            style={{ background: "#065f46", border: "1px solid #10b981", color: "#6ee7b7", fontWeight: 600 }}>
            Imprimir / PDF
          </button>
          <button className="btn btn-sm flex-fill" onClick={copiar}
            style={{ background: "#0f172a", border: "1px solid #334155", color: "#38bdf8" }}>
            Copiar para WhatsApp
          </button>
          <button className="btn btn-sm" onClick={onClose}
            style={{ background: "transparent", border: "1px solid #334155", color: "#94a3b8" }}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
