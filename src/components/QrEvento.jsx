import React, { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

/**
 * Muestra el QR de un link para pegarlo en la mesa. Permite imprimirlo o
 * bajarlo como imagen; el QR se genera acá, sin servicios de afuera.
 */
export default function QrEvento({ url, titulo, subtitulo, onClose }) {
  const [png, setPng] = useState("");
  const [error, setError] = useState("");
  const hoja = useRef(null);

  useEffect(() => {
    QRCode.toDataURL(url, {
      width: 1000,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then(setPng)
      .catch(() => setError("No se pudo generar el QR"));
  }, [url]);

  const imprimir = useCallback(() => {
    const v = window.open("", "_blank", "width=780,height=900");
    if (!v) return;
    // Se imprime desde una ventana aparte para no arrastrar los estilos del
    // sistema, que son oscuros y gastarían tinta de más.
    v.document.write(`
      <html><head><title>QR ${titulo}</title>
      <style>
        @page { margin: 18mm; }
        body { font-family: system-ui, sans-serif; text-align: center; color: #000; }
        h1 { font-size: 30px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: .04em; }
        p  { font-size: 15px; color: #444; margin: 0 0 26px; }
        img { width: 74mm; height: 74mm; }
        .pie { margin-top: 22px; font-size: 13px; color: #666; }
        .url { margin-top: 6px; font-size: 12px; color: #999; }
      </style></head>
      <body>
        <h1>${titulo}</h1>
        <p>${subtitulo || ""}</p>
        <img src="${png}" alt="QR" />
        <div class="pie">Escaneá para ver el catálogo y los precios</div>
        <div class="url">${url}</div>
      </body></html>`);
    v.document.close();
    v.focus();
    // Espera a que cargue la imagen, si no imprime la hoja en blanco
    const img = v.document.querySelector("img");
    if (img && !img.complete) img.onload = () => v.print();
    else setTimeout(() => v.print(), 250);
  }, [png, titulo, subtitulo, url]);

  const descargar = () => {
    const a = document.createElement("a");
    a.href = png;
    a.download = `qr-${titulo.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
    a.click();
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.78)", zIndex: 1060,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        ref={hoja}
        style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 14,
          padding: 24, width: "100%", maxWidth: 380, textAlign: "center" }}
      >
        <div style={{ color: "#f1f5f9", fontWeight: 700, marginBottom: 2 }}>{titulo}</div>
        {subtitulo && (
          <div style={{ color: "#64748b", fontSize: "0.8rem", marginBottom: 16 }}>{subtitulo}</div>
        )}

        {error && <div className="alert alert-danger py-2">{error}</div>}

        {png && (
          <img
            src={png}
            alt={`QR de ${titulo}`}
            style={{ width: "100%", maxWidth: 260, borderRadius: 10, background: "#fff", padding: 10 }}
          />
        )}

        <div style={{ color: "#475569", fontSize: "0.72rem", margin: "12px 0 18px", wordBreak: "break-all" }}>
          {url}
        </div>

        <div className="d-flex gap-2">
          <button className="btn btn-sm flex-fill" onClick={imprimir} disabled={!png}
            style={{ background: "#065f46", border: "1px solid #10b981", color: "#6ee7b7", fontWeight: 600 }}>
            Imprimir
          </button>
          <button className="btn btn-sm flex-fill" onClick={descargar} disabled={!png}
            style={{ background: "#0f172a", border: "1px solid #334155", color: "#38bdf8" }}>
            Descargar
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
