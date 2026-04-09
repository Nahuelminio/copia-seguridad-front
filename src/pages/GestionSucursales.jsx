import React, { useEffect, useState } from "react";
import axios from "../utils/axiosInstance";
import { toast } from "react-toastify";

const cardStyle = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
  color: "#fff",
};

const inputDark = {
  background: "#1e2530",
  border: "1px solid rgba(255,255,255,0.2)",
  color: "#fff",
  borderRadius: 8,
};

export default function GestionSucursales() {
  const [sucursales, setSucursales] = useState([]);
  const [editando, setEditando] = useState({}); // { [id]: { telefono } }
  const [guardando, setGuardando] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    axios.get("/sucursales")
      .then((r) => {
        setSucursales(r.data || []);
        // Inicializar estado de edición con valores actuales
        const inicial = {};
        (r.data || []).forEach((s) => { inicial[s.id] = { telefono: s.telefono || "" }; });
        setEditando(inicial);
      })
      .catch(() => toast.error("Error al cargar sucursales"))
      .finally(() => setCargando(false));
  }, []);

  const guardar = async (s) => {
    setGuardando(s.id);
    try {
      const res = await axios.patch(`/sucursales/${s.id}`, {
        telefono: editando[s.id]?.telefono || null,
      });
      setSucursales((prev) => prev.map((x) => (x.id === s.id ? res.data : x)));
      toast.success(`Teléfono de "${s.nombre}" guardado`);
    } catch (e) {
      toast.error(e.response?.data?.error || "Error al guardar");
    } finally {
      setGuardando(null);
    }
  };

  const cambiar = (id, val) =>
    setEditando((prev) => ({ ...prev, [id]: { ...prev[id], telefono: val } }));

  // Limpiar número: dejar solo dígitos y + para formatear wa.me
  const limpiarTel = (tel) => tel.replace(/[^\d+]/g, "");
  const waLink = (tel) => tel ? `https://wa.me/${limpiarTel(tel)}` : null;

  if (cargando) return <p className="text-center text-muted mt-5">Cargando…</p>;

  return (
    <div className="container py-4" style={{ maxWidth: 720 }}>
      <div className="mb-4">
        <h4 className="fw-bold mb-1" style={{ color: "#fff" }}>Teléfonos de sucursales</h4>
        <p className="small mb-0" style={{ color: "#94a3b8" }}>
          Configurá el número de WhatsApp de cada sucursal para enviar remitos automáticamente.
          Usá formato internacional: <code style={{ color: "#60a5fa" }}>5493XXXXXXXXX</code>
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {sucursales.map((s) => {
          const tel = editando[s.id]?.telefono || "";
          const guardadoActual = s.telefono || "";
          const cambio = tel !== guardadoActual;
          const link = waLink(guardadoActual);

          return (
            <div key={s.id} style={cardStyle}>
              <div className="card-body" style={{ padding: "16px 20px" }}>
                <div className="d-flex align-items-center gap-3 flex-wrap">

                  {/* Nombre de sucursal */}
                  <div style={{ minWidth: 140 }}>
                    <div style={{ fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>
                      Sucursal
                    </div>
                    <div style={{ fontWeight: 700, color: "#fff", fontSize: "1rem" }}>{s.nombre}</div>
                  </div>

                  {/* Input teléfono */}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                      WhatsApp
                    </div>
                    <div className="d-flex gap-2">
                      <input
                        className="form-control form-control-sm"
                        style={inputDark}
                        placeholder="Ej: 5493412345678"
                        value={tel}
                        onChange={(e) => cambiar(s.id, e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && cambio && guardar(s)}
                      />
                      <button
                        className="btn btn-sm btn-primary"
                        disabled={!cambio || guardando === s.id}
                        onClick={() => guardar(s)}
                        style={{ whiteSpace: "nowrap" }}
                      >
                        {guardando === s.id ? "…" : "Guardar"}
                      </button>
                    </div>
                  </div>

                  {/* Link WhatsApp si ya tiene número */}
                  {link && (
                    <a
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-sm"
                      title="Abrir WhatsApp"
                      style={{
                        background: "#25d366",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        padding: "5px 14px",
                        fontWeight: 600,
                        fontSize: "0.82rem",
                        textDecoration: "none",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Probar WA
                    </a>
                  )}
                </div>

                {/* Estado actual */}
                {guardadoActual && (
                  <div className="mt-2" style={{ fontSize: "0.75rem", color: "#4ade80" }}>
                    ✓ Número guardado: {guardadoActual}
                  </div>
                )}
                {!guardadoActual && (
                  <div className="mt-2" style={{ fontSize: "0.75rem", color: "#f59e0b" }}>
                    Sin número configurado
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-3" style={{ background: "rgba(96,165,250,0.08)", borderRadius: 10, border: "1px solid rgba(96,165,250,0.2)" }}>
        <div style={{ color: "#60a5fa", fontWeight: 600, fontSize: "0.85rem", marginBottom: 4 }}>Cómo obtener el número correcto</div>
        <div style={{ color: "#94a3b8", fontSize: "0.82rem" }}>
          Argentina: <code style={{ color: "#fff" }}>549</code> + código de área sin 0 + número sin 15.
          Ejemplo: Rosario (341) 5678901 → <code style={{ color: "#fff" }}>5493415678901</code>
        </div>
      </div>
    </div>
  );
}
