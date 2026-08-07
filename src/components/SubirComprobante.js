import React, { useRef, useState } from "react";
import axios from "../utils/axiosInstance";

// Achica la foto antes de subirla: el lado más largo a 1400px y JPEG al 70%.
// Una foto de celular pasa de ~4MB a ~150KB sin perder legibilidad del comprobante.
function comprimirImagen(file, maxLado = 1400, calidad = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("El archivo no es una imagen válida"));
      img.onload = () => {
        const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", calidad));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

const fmt = (n) =>
  Number(n || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// La API devuelve aaaa-mm-dd; acá se lee dd/mm/aaaa
const fmtFecha = (f) => {
  const [aa, mm, dd] = String(f || "").split("-");
  return dd && mm && aa ? `${dd}/${mm}/${aa}` : f;
};

export default function SubirComprobante({ sucursales, onCargado }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const [sucursalId, setSucursalId] = useState("");

  const esAdmin = Array.isArray(sucursales) && sucursales.length > 0;

  const elegirArchivo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResultado(null);
    try {
      setPreview(await comprimirImagen(file));
    } catch (err) {
      setError(err.message);
    }
  };

  const enviar = async () => {
    if (!preview) return;
    if (esAdmin && !sucursalId) {
      setError("Elegí a qué sucursal corresponde el pago");
      return;
    }
    setSubiendo(true);
    setError(null);
    try {
      const res = await axios.post("/pagos/comprobante", {
        imagen: preview,
        mime: "image/jpeg",
        ...(esAdmin ? { sucursal_id: Number(sucursalId) } : {}),
      });
      setResultado(res.data.leido);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = "";
      if (onCargado) onCargado();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo cargar el comprobante");
    } finally {
      setSubiendo(false);
    }
  };

  const limpiar = () => {
    setPreview(null);
    setResultado(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div style={card}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ color: "#fff", fontWeight: 600, fontSize: "1rem" }}>
          Cargar comprobante de pago
        </div>
        <div style={{ color: "#94a3b8", fontSize: "0.82rem", marginTop: 3 }}>
          Subí la captura de la transferencia o una foto. Queda pendiente hasta
          que la administración la apruebe.
        </div>
      </div>

      {esAdmin && (
        <select
          className="form-select mb-3"
          style={selectDark}
          value={sucursalId}
          onChange={(e) => setSucursalId(e.target.value)}
        >
          <option value="" style={optionDark}>
            — Sucursal —
          </option>
          {sucursales.map((s) => (
            <option key={s.id} value={s.id} style={optionDark}>
              {s.nombre}
            </option>
          ))}
        </select>
      )}

      {!preview && !resultado && (
        <label style={dropzone}>
          {/* Sin capture="environment": así el celular ofrece cámara Y galería.
              La captura de pantalla del banco se lee mejor que una foto. */}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={elegirArchivo}
            style={{ display: "none" }}
          />
          <div style={{ fontSize: "0.95rem", fontWeight: 500 }}>
            Tocá para elegir el comprobante
          </div>
          <div style={{ color: "#64748b", fontSize: "0.78rem", marginTop: 4 }}>
            Captura de pantalla del banco o foto — las dos sirven
          </div>
        </label>
      )}

      {preview && (
        <>
          <div style={previewBox}>
            <img src={preview} alt="Comprobante" style={previewImg} />
          </div>
          <div className="d-flex gap-2 mt-3">
            <button
              style={{ ...btnEnviar, opacity: subiendo ? 0.65 : 1 }}
              disabled={subiendo}
              onClick={enviar}
            >
              {subiendo ? "Leyendo comprobante…" : "Enviar comprobante"}
            </button>
            <button style={btnSecundario} disabled={subiendo} onClick={limpiar}>
              Cambiar
            </button>
          </div>
        </>
      )}

      {resultado && (
        <div style={okBox}>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>
            Comprobante enviado
          </div>
          <div style={{ display: "grid", gap: 5, fontSize: "0.88rem" }}>
            <Fila etiqueta="Monto" valor={`$${fmt(resultado.monto)}`} destacado />
            <Fila
              etiqueta="Fecha"
              valor={
                resultado.fecha_asumida
                  ? `${fmtFecha(resultado.fecha)} (no figuraba)`
                  : fmtFecha(resultado.fecha)
              }
            />
            <Fila etiqueta="Método" valor={resultado.metodo} />
            {resultado.referencia && (
              <Fila etiqueta="Operación" valor={resultado.referencia} />
            )}
            {resultado.destinatario && (
              <Fila etiqueta="Destino" valor={resultado.destinatario} />
            )}
          </div>
          {resultado.confianza < 0.7 && (
            <div style={avisoBaja}>
              La foto no se leyó del todo bien. Revisá que los datos de arriba
              sean correctos — si no, avisale a administración.
            </div>
          )}
          <div
            style={{ color: "#94a3b8", fontSize: "0.8rem", marginTop: 12 }}
          >
            Queda pendiente de aprobación. Una vez aprobado se descuenta de tu
            deuda.
          </div>
          <button
            className="btn btn-sm btn-outline-light mt-3"
            onClick={limpiar}
          >
            Cargar otro
          </button>
        </div>
      )}

      {error && <div style={errBox}>{error}</div>}
    </div>
  );
}

function Fila({ etiqueta, valor, destacado }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: "#94a3b8" }}>{etiqueta}</span>
      <span
        style={{
          color: "#fff",
          fontWeight: destacado ? 700 : 500,
          fontSize: destacado ? "1.05rem" : undefined,
          textAlign: "right",
        }}
      >
        {valor}
      </span>
    </div>
  );
}

const card = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
  padding: 20,
  maxWidth: 520,
  margin: "0 auto",
};

const dropzone = {
  display: "block",
  textAlign: "center",
  padding: "34px 16px",
  border: "2px dashed rgba(255,255,255,0.2)",
  borderRadius: 10,
  color: "#cbd5e1",
  cursor: "pointer",
};

// El contenedor se ajusta a la imagen en vez de dejar barras negras a los
// costados: los comprobantes suelen ser capturas altas y angostas.
const previewBox = {
  display: "flex",
  justifyContent: "center",
  padding: 10,
  borderRadius: 10,
  background: "#0f172a",
  border: "1px solid rgba(255,255,255,0.1)",
};

const previewImg = {
  maxWidth: "100%",
  maxHeight: 320,
  width: "auto",
  borderRadius: 6,
  display: "block",
};

const btnBase = {
  border: "none",
  borderRadius: 8,
  fontWeight: 600,
  fontSize: "0.92rem",
  padding: "11px 18px",
  cursor: "pointer",
};

const btnEnviar = {
  ...btnBase,
  flex: 1,
  background: "linear-gradient(135deg, #1e3a8a, #2563eb)",
  color: "#fff",
};

const btnSecundario = {
  ...btnBase,
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.25)",
  color: "#cbd5e1",
};

const okBox = {
  background: "rgba(34,197,94,0.08)",
  border: "1px solid rgba(34,197,94,0.3)",
  borderRadius: 10,
  padding: 16,
  color: "#fff",
};

const avisoBaja = {
  background: "rgba(250,204,21,0.1)",
  border: "1px solid rgba(250,204,21,0.35)",
  borderRadius: 8,
  padding: "9px 12px",
  color: "#fde68a",
  fontSize: "0.82rem",
  marginTop: 12,
};

const errBox = {
  background: "rgba(248,113,113,0.1)",
  border: "1px solid rgba(248,113,113,0.35)",
  borderRadius: 8,
  padding: "10px 13px",
  color: "#fca5a5",
  fontSize: "0.86rem",
  marginTop: 14,
};

const selectDark = {
  background: "#1e2530",
  border: "1px solid rgba(255,255,255,0.2)",
  color: "#fff",
};

const optionDark = { background: "#1e2530", color: "#fff" };
