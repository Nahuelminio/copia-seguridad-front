import React, { useCallback, useEffect, useState } from "react";
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

  const [nuevaSucursal, setNuevaSucursal] = useState("");
  const [creandoSuc, setCreandoSuc] = useState(false);

  const [usuarios, setUsuarios] = useState([]);
  // La contraseña la escribe el admin acá y va directo al backend, que la
  // hashea. No se guarda ni se muestra en ningún momento.
  const [nuevoUsuario, setNuevoUsuario] = useState({
    email: "", password: "", rol: "sucursal", sucursal_id: "",
  });
  const [creandoUsr, setCreandoUsr] = useState(false);

  const cargarSucursales = useCallback(async () => {
    try {
      const r = await axios.get("/sucursales");
      setSucursales(r.data || []);
      const inicial = {};
      (r.data || []).forEach((s) => { inicial[s.id] = { telefono: s.telefono || "" }; });
      setEditando(inicial);
    } catch {
      toast.error("Error al cargar sucursales");
    }
  }, []);

  const cargarUsuarios = useCallback(async () => {
    try {
      const r = await axios.get("/auth/usuarios");
      setUsuarios(r.data || []);
    } catch {
      /* Si no es admin no hay usuarios que mostrar; el resto de la página sirve */
    }
  }, []);

  useEffect(() => {
    Promise.all([cargarSucursales(), cargarUsuarios()]).finally(() => setCargando(false));
  }, [cargarSucursales, cargarUsuarios]);

  const crearSucursal = async (e) => {
    e.preventDefault();
    const nombre = nuevaSucursal.trim();
    if (!nombre) return;
    if (sucursales.some((s) => s.nombre.trim().toLowerCase() === nombre.toLowerCase())) {
      return toast.error("Ya existe una sucursal con ese nombre");
    }
    setCreandoSuc(true);
    try {
      await axios.post("/sucursales", { nombre });
      toast.success(`Sucursal "${nombre}" creada`);
      setNuevaSucursal("");
      cargarSucursales();
    } catch (err) {
      toast.error(err.response?.data?.error || "No se pudo crear la sucursal");
    } finally {
      setCreandoSuc(false);
    }
  };

  const crearUsuario = async (e) => {
    e.preventDefault();
    const { email, password, rol, sucursal_id } = nuevoUsuario;
    if (!email.trim()) return toast.error("Falta el email");
    if (password.length < 6) return toast.error("La contraseña tiene que tener al menos 6 caracteres");
    if (rol !== "admin" && !sucursal_id) return toast.error("Elegí a qué sucursal pertenece");

    setCreandoUsr(true);
    try {
      await axios.post("/auth/register", {
        email: email.trim(),
        password,
        rol,
        sucursal_id: rol === "admin" ? null : Number(sucursal_id),
      });
      toast.success(`Usuario ${email.trim()} creado`);
      setNuevoUsuario({ email: "", password: "", rol, sucursal_id: "" });
      cargarUsuarios();
    } catch (err) {
      toast.error(err.response?.data?.error || "No se pudo crear el usuario");
    } finally {
      setCreandoUsr(false);
    }
  };

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
        <h4 className="fw-bold mb-1" style={{ color: "#fff" }}>Sucursales y usuarios</h4>
        <p className="small mb-0" style={{ color: "#94a3b8" }}>
          Crear sucursales, darles acceso y configurar el WhatsApp al que se envían
          los remitos. Formato internacional: <code style={{ color: "#60a5fa" }}>5493XXXXXXXXX</code>
        </p>
      </div>

      {/* ── Nueva sucursal ── */}
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <div className="card-body" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase",
            letterSpacing: "0.05em", marginBottom: 8 }}>
            Nueva sucursal
          </div>
          <form onSubmit={crearSucursal} className="d-flex gap-2 flex-wrap">
            <input className="form-control form-control-sm" style={{ ...inputDark, flex: 1, minWidth: 200 }}
              placeholder="Ej: Villa Sarita" value={nuevaSucursal}
              onChange={(e) => setNuevaSucursal(e.target.value)} />
            <button className="btn btn-sm btn-success" type="submit" disabled={creandoSuc || !nuevaSucursal.trim()}>
              {creandoSuc ? "Creando…" : "Crear sucursal"}
            </button>
          </form>
          <p className="small mb-0" style={{ color: "#64748b", marginTop: 8 }}>
            Nace sin stock ni precios. Después hay que cargarle productos y crear su usuario.
          </p>
        </div>
      </div>

      {/* ── Usuarios ── */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <div className="card-body" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase",
            letterSpacing: "0.05em", marginBottom: 10 }}>
            Usuarios ({usuarios.length})
          </div>

          {usuarios.length > 0 && (
            <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 6 }}>
              {usuarios.map((u) => (
                <div key={u.id} className="d-flex justify-content-between align-items-center flex-wrap"
                  style={{ gap: 8, padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ color: "#e2e8f0", fontSize: "0.88rem" }}>{u.email}</span>
                  <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em",
                      padding: "2px 8px", borderRadius: 999,
                      background: u.rol === "admin" ? "rgba(239,68,68,.15)" : "rgba(255,255,255,.07)",
                      color: u.rol === "admin" ? "#fca5a5" : "#94a3b8" }}>
                      {u.rol}
                    </span>
                    <span style={{ color: "#64748b", fontSize: "0.78rem", minWidth: 110, textAlign: "right" }}>
                      {u.sucursal || "—"}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={crearUsuario} className="row g-2">
            <div className="col-12 col-md-4">
              <input className="form-control form-control-sm" style={inputDark} type="email"
                placeholder="Email" value={nuevoUsuario.email} autoComplete="off"
                onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, email: e.target.value })} />
            </div>
            <div className="col-6 col-md-3">
              <input className="form-control form-control-sm" style={inputDark} type="password"
                placeholder="Contraseña" value={nuevoUsuario.password} autoComplete="new-password"
                onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, password: e.target.value })} />
            </div>
            <div className="col-6 col-md-2">
              <select className="form-select form-select-sm" style={inputDark} value={nuevoUsuario.rol}
                onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, rol: e.target.value })}>
                <option value="sucursal">Sucursal</option>
                <option value="vendedor">Vendedor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="col-8 col-md-2">
              <select className="form-select form-select-sm" style={inputDark}
                value={nuevoUsuario.sucursal_id} disabled={nuevoUsuario.rol === "admin"}
                onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, sucursal_id: e.target.value })}>
                <option value="">Sucursal…</option>
                {sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
            <div className="col-4 col-md-1">
              <button className="btn btn-sm btn-success w-100" type="submit" disabled={creandoUsr}>
                {creandoUsr ? "…" : "Crear"}
              </button>
            </div>
          </form>
          <p className="small mb-0" style={{ color: "#64748b", marginTop: 8 }}>
            La contraseña se guarda encriptada y no se puede volver a ver. Un usuario
            <strong> admin</strong> ve y edita todo el sistema.
          </p>
        </div>
      </div>

      <div style={{ fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase",
        letterSpacing: "0.05em", marginBottom: 10 }}>
        WhatsApp de cada sucursal
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
