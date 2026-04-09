import { useEffect, useMemo, useState } from "react";
import { jwtDecode } from "jwt-decode";
import ClienteForm from "../components/ClienteForm";
import clientesService from "../services/clientesService";
import "../styles/clientes.css";

const formInicial = {
  nombre: "",
  telefono: "",
  sucursal_id: "",
  observaciones: "",
  activo: true,
};

function mapClienteToForm(cliente) {
  return {
    nombre: cliente.nombre || "",
    telefono: cliente.telefono || "",
    sucursal_id: cliente.sucursal_id ? String(cliente.sucursal_id) : "",
    observaciones: cliente.observaciones || "",
    activo: !!cliente.activo,
  };
}

function normalizarTelefonoWhatsapp(telefono = "") {
  const limpio = String(telefono).replace(/\D/g, "");

  if (!limpio) return "";

  if (limpio.startsWith("54")) return limpio;
  if (limpio.startsWith("0")) return `54${limpio.slice(1)}`;

  return `54${limpio}`;
}

function abrirWhatsappConMensaje(telefono, mensaje) {
  const telefonoNormalizado = normalizarTelefonoWhatsapp(telefono);

  if (!telefonoNormalizado) {
    throw new Error("El cliente no tiene un teléfono válido");
  }

  const url = `https://wa.me/${telefonoNormalizado}?text=${encodeURIComponent(
    mensaje,
  )}`;

  window.open(url, "_blank");
}

async function copiarTextoAlPortapapeles(texto) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(texto);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = texto;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export default function Clientes() {
  const token = localStorage.getItem("token");
  const decoded = token ? jwtDecode(token) : null;

  const rol = decoded?.rol;
  const sucursalUsuarioId = decoded?.sucursal_id || decoded?.sucursalId || null;
  const esAdmin = rol === "admin";

  const [sucursalDifusionId, setSucursalDifusionId] = useState(
    !esAdmin && sucursalUsuarioId ? String(sucursalUsuarioId) : "",
  );
  const [copiandoDifusion, setCopiandoDifusion] = useState(false);

  const [clientes, setClientes] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [form, setForm] = useState({
    ...formInicial,
    sucursal_id: !esAdmin && sucursalUsuarioId ? String(sucursalUsuarioId) : "",
  });
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [enviandoStockId, setEnviandoStockId] = useState(null);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });

  const resumen = useMemo(() => {
    const activos = clientes.filter((c) => c.activo).length;
    const inactivos = clientes.filter((c) => !c.activo).length;

    return {
      total: clientes.length,
      activos,
      inactivos,
    };
  }, [clientes]);

  useEffect(() => {
    if (!mensaje.texto) return;

    const timer = setTimeout(() => {
      setMensaje({ tipo: "", texto: "" });
    }, 3000);

    return () => clearTimeout(timer);
  }, [mensaje]);

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
  };

  const cargarClientes = async (q = "") => {
    try {
      setCargando(true);

      const data = q.trim()
        ? await clientesService.buscar(q)
        : await clientesService.obtenerTodos();

      setClientes(data);
    } catch (err) {
      console.error(err);
      mostrarMensaje("error", "Error al cargar clientes");
    } finally {
      setCargando(false);
    }
  };

  const cargarSucursales = async () => {
    try {
      const data = await clientesService.obtenerSucursales();

      if (esAdmin) {
        setSucursales(data);
        return;
      }

      const sucursalPropia = data.filter(
        (s) => Number(s.id) === Number(sucursalUsuarioId),
      );

      setSucursales(sucursalPropia);
      setSucursalDifusionId(sucursalUsuarioId ? String(sucursalUsuarioId) : "");

      setForm((prev) => ({
        ...prev,
        sucursal_id: sucursalUsuarioId ? String(sucursalUsuarioId) : "",
      }));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    cargarClientes();
    cargarSucursales();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      cargarClientes(busqueda);
    }, 300);

    return () => clearTimeout(timer);
  }, [busqueda]);

  const resetForm = () => {
    setForm({
      ...formInicial,
      sucursal_id:
        !esAdmin && sucursalUsuarioId ? String(sucursalUsuarioId) : "",
    });
    setEditando(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      if (editando) {
        await clientesService.editar(editando.id, form);
        mostrarMensaje("success", "Cliente editado correctamente");
      } else {
        await clientesService.crear(form);
        mostrarMensaje("success", "Cliente creado correctamente");
      }

      resetForm();
      await cargarClientes(busqueda);
    } catch (err) {
      console.error(err);
      mostrarMensaje(
        "error",
        err?.response?.data?.error || "Error al guardar cliente",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEditar = (cliente) => {
    setEditando(cliente);

    const data = mapClienteToForm(cliente);

    setForm({
      ...data,
      sucursal_id:
        !esAdmin && sucursalUsuarioId
          ? String(sucursalUsuarioId)
          : data.sucursal_id,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEliminar = async (id) => {
    const ok = window.confirm("¿Eliminar cliente?");
    if (!ok) return;

    try {
      await clientesService.eliminar(id);

      if (editando?.id === id) {
        resetForm();
      }

      await cargarClientes(busqueda);
      mostrarMensaje("success", "Cliente eliminado correctamente");
    } catch (err) {
      console.error(err);
      mostrarMensaje("error", "Error al eliminar cliente");
    }
  };

  const handleEnviarNuevoStock = async (cliente) => {
    try {
      if (!cliente?.telefono) {
        mostrarMensaje("error", "Este cliente no tiene teléfono cargado");
        return;
      }

      const sucursalIdFinal =
        cliente?.sucursal_id || sucursalUsuarioId || form?.sucursal_id || "";

      const sucursalNombreFinal =
        cliente?.sucursal_nombre ||
        sucursales.find((s) => Number(s.id) === Number(sucursalIdFinal))
          ?.nombre ||
        "";

      if (!sucursalIdFinal && !sucursalNombreFinal) {
        mostrarMensaje(
          "error",
          "No se pudo identificar la sucursal de este cliente",
        );
        return;
      }

      setEnviandoStockId(cliente.id);

      const mensajeStock = await clientesService.generarMensajeNuevoStock({
        id: cliente.id,
        nombre: cliente.nombre,
        telefono: cliente.telefono,
        sucursal_id: sucursalIdFinal,
        sucursal_nombre: sucursalNombreFinal,
        observaciones: cliente.observaciones,
      });

      abrirWhatsappConMensaje(cliente.telefono, mensajeStock);

      mostrarMensaje(
        "success",
        `Mensaje de stock preparado para ${cliente.nombre}`,
      );
    } catch (err) {
      console.error(err);
      mostrarMensaje(
        "error",
        err?.response?.data?.error ||
          err?.message ||
          "No se pudo generar el mensaje de stock",
      );
    } finally {
      setEnviandoStockId(null);
    }
  };

  const handleCopiarMensajeDifusion = async () => {
    try {
      const sucursalIdFinal = !esAdmin
        ? String(sucursalUsuarioId || "")
        : String(sucursalDifusionId || "");

      if (!sucursalIdFinal) {
        mostrarMensaje("error", "Seleccioná una sucursal para la difusión");
        return;
      }

      const sucursalSeleccionada = sucursales.find(
        (s) => Number(s.id) === Number(sucursalIdFinal),
      );

      const sucursalNombreFinal = sucursalSeleccionada?.nombre || "";

      setCopiandoDifusion(true);

      const mensajeDifusion = await clientesService.generarMensajeDifusionStock(
        {
          sucursal_id: sucursalIdFinal,
          sucursal_nombre: sucursalNombreFinal,
        },
      );

      await copiarTextoAlPortapapeles(mensajeDifusion);

      mostrarMensaje("success", "Mensaje de difusión copiado al portapapeles");
    } catch (err) {
      console.error(err);
      mostrarMensaje(
        "error",
        err?.response?.data?.error ||
          err?.message ||
          "No se pudo generar el mensaje de difusión",
      );
    } finally {
      setCopiandoDifusion(false);
    }
  };

  const limpiarBusqueda = async () => {
    setBusqueda("");
    await cargarClientes("");
  };

  return (
    <div className="clientes-page">
      <div className="clientes-left">
        <ClienteForm
          form={form}
          setForm={setForm}
          onSubmit={handleSubmit}
          onCancel={resetForm}
          editando={!!editando}
          loading={loading}
          sucursales={sucursales}
          esAdmin={esAdmin}
        />
      </div>

      <div className="clientes-right">
        <div className="clientes-topbar">
          <div>
            <h1>Clientes</h1>
            <p>Gestioná tu base de clientes y sus datos de contacto.</p>
          </div>

          <div className="clientes-search-box">
            <input
              type="text"
              placeholder="Buscar por nombre o teléfono"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={limpiarBusqueda}
            >
              Limpiar
            </button>
          </div>
        </div>

        <div className="clientes-stats">
          <div className="stat-card">
            <span>Total</span>
            <strong>{resumen.total}</strong>
          </div>
          <div className="stat-card">
            <span>Activos</span>
            <strong>{resumen.activos}</strong>
          </div>
          <div className="stat-card">
            <span>Inactivos</span>
            <strong>{resumen.inactivos}</strong>
          </div>
        </div>

        <div className="clientes-difusion-box">
          <div className="clientes-difusion-info">
            <h3>Difusión de stock</h3>
            <p>
              Copiá el mensaje listo para pegar en tu lista de difusión de
              WhatsApp.
            </p>
          </div>

          <div className="clientes-difusion-actions">
            {esAdmin ? (
              <select
                value={sucursalDifusionId}
                onChange={(e) => setSucursalDifusionId(e.target.value)}
              >
                <option value="">Seleccionar sucursal</option>
                {sucursales.map((sucursal) => (
                  <option key={sucursal.id} value={sucursal.id}>
                    {sucursal.nombre}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={
                  sucursales.find(
                    (s) => Number(s.id) === Number(sucursalDifusionId),
                  )?.nombre || ""
                }
                disabled
              />
            )}

            <button
              type="button"
              className="btn-whatsapp"
              onClick={handleCopiarMensajeDifusion}
              disabled={copiandoDifusion}
            >
              {copiandoDifusion ? "Copiando..." : "Copiar mensaje difusión"}
            </button>
          </div>
        </div>

        {mensaje.texto && (
          <div
            className={
              mensaje.tipo === "success" ? "alert-success" : "alert-error"
            }
          >
            {mensaje.texto}
          </div>
        )}

        <div className="clientes-table-wrap">
          <table className="clientes-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Sucursal</th>
                <th>Observaciones</th>
                <th>Activo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan="6">Cargando clientes...</td>
                </tr>
              ) : clientes.length ? (
                clientes.map((cliente) => (
                  <tr key={cliente.id}>
                    <td data-label="Nombre">{cliente.nombre}</td>
                    <td data-label="Teléfono">{cliente.telefono}</td>
                    <td data-label="Sucursal">
                      {cliente.sucursal_nombre || "-"}
                    </td>
                    <td data-label="Observaciones">
                      {cliente.observaciones || "-"}
                    </td>
                    <td data-label="Activo">
                      <span
                        className={`badge ${cliente.activo ? "badge-ok" : "badge-off"}`}
                      >
                        {cliente.activo ? "Sí" : "No"}
                      </span>
                    </td>
                    <td data-label="Acciones">
                      <div className="acciones-row">
                        <button
                          type="button"
                          className="btn-whatsapp"
                          onClick={() => handleEnviarNuevoStock(cliente)}
                          disabled={enviandoStockId === cliente.id}
                        >
                          {enviandoStockId === cliente.id
                            ? "Generando..."
                            : "Nuevo stock"}
                        </button>

                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => handleEditar(cliente)}
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          className="btn-danger"
                          onClick={() => handleEliminar(cliente.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6">No hay clientes cargados</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
