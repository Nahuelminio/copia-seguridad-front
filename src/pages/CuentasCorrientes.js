import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";

export default function CuentasCorrientes() {
  const [cuentas, setCuentas] = useState([]);
  const [historial, setHistorial] = useState([]);

  const [q, setQ] = useState("");

  const [soloConDeuda, setSoloConDeuda] = useState(true);
  const [orden, setOrden] = useState("saldo_desc");
  const [estado, setEstado] = useState("activas");

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [openNueva, setOpenNueva] = useState(false);
  const [openMov, setOpenMov] = useState(false);
  const [openHist, setOpenHist] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);

  // recordatorios masivos
  const [openMasivo, setOpenMasivo] = useState(false);
  const [colaRecordatorios, setColaRecordatorios] = useState([]);
  const [recordatorioIndex, setRecordatorioIndex] = useState(0);
  const [recordatoriosEnviados, setRecordatoriosEnviados] = useState([]);
  const [recordatoriosOmitidos, setRecordatoriosOmitidos] = useState([]);

  const [formNueva, setFormNueva] = useState({
    cliente_nombre: "",
    telefono: "",
    notas: "",
  });

  const [formEdit, setFormEdit] = useState({
    cliente_nombre: "",
    telefono: "",
    notas: "",
  });

  const [cuentaSel, setCuentaSel] = useState(null);
  const [tipoMov, setTipoMov] = useState("CARGO");
  const [montoMov, setMontoMov] = useState("");
  const [descMov, setDescMov] = useState("");

  const token = localStorage.getItem("token");

  const api = useMemo(() => {
    return axios.create({
      baseURL: process.env.REACT_APP_API_URL,
      headers: { Authorization: `Bearer ${token}` },
    });
  }, [token]);

  const money = useCallback((value) => {
    return Number(value || 0).toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, []);

  const moneyNoDecimals = useCallback((value) => {
    return Number(value || 0).toLocaleString("es-AR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }, []);

  const formatFecha = useCallback((fecha) => {
    if (!fecha) return "-";
    const d = new Date(fecha);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString("es-AR");
  }, []);

  const getErrorMessage = useCallback((error) => {
    return (
      error?.response?.data?.error ||
      error?.message ||
      "Ocurrió un error inesperado"
    );
  }, []);

  const resetNueva = () => {
    setFormNueva({ cliente_nombre: "", telefono: "", notas: "" });
  };

  const resetMovimiento = () => {
    setMontoMov("");
    setDescMov("");
    setTipoMov("CARGO");
  };

  const cerrarNueva = () => {
    setOpenNueva(false);
    resetNueva();
  };

  const cerrarEdit = () => {
    setOpenEdit(false);
    setCuentaSel(null);
    setFormEdit({ cliente_nombre: "", telefono: "", notas: "" });
  };

  const cerrarMov = () => {
    setOpenMov(false);
    resetMovimiento();
  };

  const cerrarHist = () => {
    setOpenHist(false);
    setCuentaSel(null);
    setHistorial([]);
  };

  const cerrarMasivo = () => {
    setOpenMasivo(false);
    setColaRecordatorios([]);
    setRecordatorioIndex(0);
    setRecordatoriosEnviados([]);
    setRecordatoriosOmitidos([]);
  };

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const { data } = await api.get(`/cuentas?estado=${estado}`);
      setCuentas(Array.isArray(data) ? data : []);
    } catch (error) {
      setErrorMsg(getErrorMessage(error));
      setCuentas([]);
    } finally {
      setLoading(false);
    }
  }, [api, estado, getErrorMessage]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const filtradas = useMemo(() => {
    const t = q.trim().toLowerCase();

    const arr = cuentas.filter((c) => {
      const matchTexto =
        !t ||
        (c.cliente_nombre || "").toLowerCase().includes(t) ||
        (c.telefono || "").toLowerCase().includes(t);

      const saldoNum = Number(c.saldo || 0);
      const matchDeuda = !soloConDeuda || saldoNum > 0;

      return matchTexto && matchDeuda;
    });

    arr.sort((a, b) => {
      if (orden === "nombre_asc") {
        return (a.cliente_nombre || "").localeCompare(b.cliente_nombre || "");
      }
      return Number(b.saldo || 0) - Number(a.saldo || 0);
    });

    return arr;
  }, [cuentas, q, soloConDeuda, orden]);

  const totalDeuda = useMemo(() => {
    return cuentas.reduce(
      (acc, c) => acc + Math.max(0, Number(c.saldo || 0)),
      0,
    );
  }, [cuentas]);

  const totalCuentas = useMemo(() => cuentas.length, [cuentas]);

  const deudoresConSaldo = useMemo(() => {
    return cuentas.filter((c) => Number(c.saldo || 0) > 0).length;
  }, [cuentas]);

  const archivadasCount = useMemo(() => {
    return cuentas.filter((c) => Number(c.activo ?? 1) === 0).length;
  }, [cuentas]);

  const top3 = useMemo(() => {
    return [...cuentas]
      .filter((c) => Number(c.saldo || 0) > 0)
      .sort((a, b) => Number(b.saldo || 0) - Number(a.saldo || 0))
      .slice(0, 3);
  }, [cuentas]);

  const deudoresContactables = useMemo(() => {
    return filtradas.filter(
      (c) => Number(c.saldo || 0) > 0 && String(c.telefono || "").trim(),
    );
  }, [filtradas]);

  const clienteRecordatorioActual = useMemo(() => {
    return colaRecordatorios[recordatorioIndex] || null;
  }, [colaRecordatorios, recordatorioIndex]);

  const esUltimoRecordatorio = useMemo(() => {
    return (
      colaRecordatorios.length > 0 &&
      recordatorioIndex === colaRecordatorios.length - 1
    );
  }, [colaRecordatorios.length, recordatorioIndex]);

  const historialConSaldo = useMemo(() => {
    if (!cuentaSel || !historial.length) return [];

    // Reconstrucción del saldo acumulado:
    // El historial viene ordenado DESC (más reciente primero).
    // Partimos del saldo actual y deshacemos cada operación para obtener
    // el saldo ANTES de cada movimiento; luego lo mostramos como saldo POST-operación
    // invirtiendo el delta correctamente.
    let running = Number(cuentaSel.saldo || 0);

    return historial.map((m) => {
      const delta =
        m.tipo === "CARGO" ? Number(m.monto || 0) : -Number(m.monto || 0);
      // saldo_acumulado = saldo después de este movimiento
      const saldoAcumulado = running;
      // deshacemos el movimiento para el siguiente paso hacia atrás en el tiempo
      running = running - delta;

      return {
        ...m,
        saldo_acumulado: saldoAcumulado,
      };
    });
  }, [historial, cuentaSel]);

  const abrirMovimiento = (cuenta, tipo) => {
    if (Number(cuenta?.activo ?? 1) === 0) {
      alert("No se pueden registrar movimientos en una cuenta archivada");
      return;
    }

    setCuentaSel(cuenta);
    setTipoMov(tipo);
    setMontoMov("");
    setDescMov("");
    setOpenMov(true);
  };

  const guardarMovimiento = async () => {
    if (!cuentaSel) return;

    const m = Number(montoMov);
    if (!m || m <= 0) return alert("Monto inválido");

    try {
      setSubmitting(true);
      setErrorMsg("");

      await api.post(`/cuentas/${cuentaSel.id}/movimientos`, {
        tipo: tipoMov,
        monto: m,
        descripcion: descMov.trim(),
      });

      cerrarMov();
      await cargar();
    } catch (error) {
      alert(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const crearCuenta = async () => {
    if (!formNueva.cliente_nombre.trim()) return alert("Falta nombre");

    try {
      setSubmitting(true);
      setErrorMsg("");

      await api.post("/cuentas", {
        cliente_nombre: formNueva.cliente_nombre.trim(),
        telefono: formNueva.telefono.trim(),
        notas: formNueva.notas.trim(),
      });

      cerrarNueva();
      await cargar();
    } catch (error) {
      alert(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const verHistorial = async (cuenta) => {
    try {
      setSubmitting(true);
      setErrorMsg("");
      setCuentaSel(cuenta);

      const { data } = await api.get(`/cuentas/${cuenta.id}/movimientos`);
      setHistorial(Array.isArray(data) ? data : []);
      setOpenHist(true);
    } catch (error) {
      alert(getErrorMessage(error));
      setHistorial([]);
    } finally {
      setSubmitting(false);
    }
  };

  const abrirEditar = (cuenta) => {
    setCuentaSel(cuenta);
    setFormEdit({
      cliente_nombre: cuenta.cliente_nombre || "",
      telefono: cuenta.telefono || "",
      notas: cuenta.notas || "",
    });
    setOpenEdit(true);
  };

  const guardarEdicion = async () => {
    if (!cuentaSel) return;
    if (!formEdit.cliente_nombre.trim()) return alert("Falta nombre");

    try {
      setSubmitting(true);
      setErrorMsg("");

      await api.put(`/cuentas/${cuentaSel.id}`, {
        cliente_nombre: formEdit.cliente_nombre.trim(),
        telefono: formEdit.telefono.trim(),
        notas: formEdit.notas.trim(),
      });

      cerrarEdit();
      await cargar();
    } catch (error) {
      alert(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const archivarCuenta = async (cuenta) => {
    const saldo = Number(cuenta.saldo || 0);

    if (saldo !== 0) {
      return alert("No se puede cerrar/archivar con saldo distinto de 0");
    }

    if (
      !window.confirm(
        `¿Cerrar (archivar) la cuenta de ${cuenta.cliente_nombre}?`,
      )
    ) {
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");
      await api.patch(`/cuentas/${cuenta.id}/archivar`);
      await cargar();
    } catch (error) {
      alert(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const reactivarCuenta = async (cuenta) => {
    try {
      setSubmitting(true);
      setErrorMsg("");
      await api.patch(`/cuentas/${cuenta.id}/reactivar`);
      await cargar();
    } catch (error) {
      alert(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const waLink = (tel) => {
    if (!tel) return "#";
    const digits = String(tel).replace(/\D/g, "");
    if (!digits) return "#";
    const withCountry = digits.startsWith("54") ? digits : `54${digits}`;
    return `https://wa.me/${withCountry}`;
  };

  const esPrimerRecordatorio = (cuenta) => {
    return Number(cuenta?.recordatorios_enviados || 0) === 0;
  };

  const mensajePrimerRecordatorio = (cuenta) => {
    const nombre = cuenta?.cliente_nombre || "cliente";
    const saldo = moneyNoDecimals(cuenta?.saldo || 0);

    return `Hola ${nombre}, ¿cómo estás? Soy *Vapi*, el asistente de *The North Shop* 

Te escribo para presentarme y para avisarte que actualmente tenés un saldo pendiente de *$${saldo}* en tu cuenta corriente.

Cuando te quede cómodo, respondé este mensaje y coordinamos el pago.
Si ya abonaste, podés ignorar este aviso.

¡Muchas gracias!`;
  };

  const mensajeSeguimientoRecordatorio = (cuenta) => {
    const nombre = cuenta?.cliente_nombre || "cliente";
    const saldo = moneyNoDecimals(cuenta?.saldo || 0);

    return `Hola ${nombre}, ¿cómo estás? Te habla *Vapi* de *The North Shop*.

Te recuerdo que tenés un saldo pendiente de *$${saldo}* en tu cuenta corriente.

Cuando puedas, respondé este mensaje y coordinamos el pago.
Si ya abonaste, podés ignorar este aviso.

¡Muchas gracias!`;
  };

  const mensajeRecordatorio = (cuenta) => {
    return esPrimerRecordatorio(cuenta)
      ? mensajePrimerRecordatorio(cuenta)
      : mensajeSeguimientoRecordatorio(cuenta);
  };

  const marcarRecordatorioEnviado = async (cuentaId) => {
    await api.patch(`/cuentas/${cuentaId}/marcar-recordatorio`);
  };

  const abrirWhatsAppRecordatorio = async (
    cuenta,
    { confirmarMarcado = true } = {},
  ) => {
    if (!cuenta?.telefono) {
      alert("Esta cuenta no tiene teléfono cargado");
      return false;
    }

    const saldo = Number(cuenta?.saldo || 0);
    if (saldo <= 0) {
      alert("La cuenta no tiene deuda pendiente");
      return false;
    }

    const digits = String(cuenta.telefono).replace(/\D/g, "");
    if (!digits) {
      alert("El teléfono no es válido");
      return false;
    }

    const withCountry = digits.startsWith("54") ? digits : `54${digits}`;
    const text = encodeURIComponent(mensajeRecordatorio(cuenta));

    window.open(`https://wa.me/${withCountry}?text=${text}`, "_blank");

    if (!confirmarMarcado) return true;

    const result = await Swal.fire({
      icon: "question",
      title: "¿Marcar como enviado?",
      text: "Si ya abriste y enviaste el mensaje, se registrará para que la próxima vez salga el mensaje de seguimiento.",
      showCancelButton: true,
      confirmButtonText: "Sí, marcar",
      cancelButtonText: "Todavía no",
      confirmButtonColor: "#111827",
    });

    if (!result.isConfirmed) return true;

    try {
      setSubmitting(true);
      await marcarRecordatorioEnviado(cuenta.id);
      await cargar();
    } catch (error) {
      alert(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }

    return true;
  };

  const iniciarRecordatoriosMasivos = () => {
    if (!deudoresContactables.length) {
      alert("No hay clientes con deuda y teléfono en la lista actual");
      return;
    }

    setColaRecordatorios(deudoresContactables);
    setRecordatorioIndex(0);
    setRecordatoriosEnviados([]);
    setRecordatoriosOmitidos([]);
    setOpenMasivo(true);
  };

  const abrirWhatsAppActual = async () => {
    if (!clienteRecordatorioActual) return;
    await abrirWhatsAppRecordatorio(clienteRecordatorioActual, {
      confirmarMarcado: false,
    });
  };

  const mostrarResumenRecordatorios = async ({
    ultimoTipo = null,
    ultimoId = null,
  }) => {
    const enviados = new Set(recordatoriosEnviados);
    const omitidos = new Set(recordatoriosOmitidos);

    if (ultimoTipo === "enviado" && ultimoId) enviados.add(ultimoId);
    if (ultimoTipo === "omitido" && ultimoId) omitidos.add(ultimoId);

    const total = colaRecordatorios.length;
    const enviadosCount = enviados.size;
    const omitidosCount = omitidos.size;

    await Swal.fire({
      icon: "success",
      title: "Recordatorios completados",
      html: `
        <div style="font-size:14px; line-height:1.7; text-align:left">
          <div style="padding:8px 0; border-bottom:1px solid #eee;">
            <b>Total procesados:</b> ${total}
          </div>
          <div style="padding:8px 0; color:#166534;">
            <b>Enviados:</b> ${enviadosCount}
          </div>
          <div style="padding:8px 0; color:#92400e;">
            <b>Omitidos:</b> ${omitidosCount}
          </div>
        </div>
      `,
      confirmButtonText: "Cerrar",
      confirmButtonColor: "#111827",
      width: 420,
      background: "#ffffff",
      color: "#111827",
    });

    cerrarMasivo();
  };

  const enviadoYSiguiente = async () => {
    if (!clienteRecordatorioActual) return;

    const actualId = clienteRecordatorioActual.id;

    try {
      setSubmitting(true);
      await marcarRecordatorioEnviado(actualId);

      setRecordatoriosEnviados((prev) =>
        prev.includes(actualId) ? prev : [...prev, actualId],
      );

      if (recordatorioIndex >= colaRecordatorios.length - 1) {
        await cargar();
        await mostrarResumenRecordatorios({
          ultimoTipo: "enviado",
          ultimoId: actualId,
        });
        return;
      }

      setColaRecordatorios((prev) =>
        prev.map((item) =>
          item.id === actualId
            ? {
                ...item,
                recordatorios_enviados:
                  Number(item.recordatorios_enviados || 0) + 1,
              }
            : item,
        ),
      );

      setRecordatorioIndex((prev) => prev + 1);
    } catch (error) {
      alert(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const omitirYSiguiente = async () => {
    if (!clienteRecordatorioActual) return;

    const actualId = clienteRecordatorioActual.id;

    setRecordatoriosOmitidos((prev) =>
      prev.includes(actualId) ? prev : [...prev, actualId],
    );

    if (recordatorioIndex >= colaRecordatorios.length - 1) {
      await mostrarResumenRecordatorios({
        ultimoTipo: "omitido",
        ultimoId: actualId,
      });
      return;
    }

    setRecordatorioIndex((prev) => prev + 1);
  };

  return (
    <div style={styles.page}>
      <style>{css}</style>

      <div style={styles.container}>
        <div className="cc-hero">
          <div>
            <div className="cc-kicker">Gestión financiera</div>
            <h2 style={styles.title}>Cuentas Corrientes</h2>
            <div style={styles.subtitle}>
              {soloConDeuda
                ? "Mostrando solo clientes con saldo pendiente"
                : "Mostrando todas las cuentas"}
            </div>
          </div>

          <div className="cc-hero-actions">
            <button
              className="cc-btn"
              onClick={cargar}
              disabled={loading || submitting}
            >
              {loading ? "Actualizando..." : "Actualizar"}
            </button>

            <button
              className="cc-btn cc-btn-massive"
              onClick={iniciarRecordatoriosMasivos}
              disabled={submitting || !deudoresContactables.length}
              title={
                deudoresContactables.length
                  ? `Iniciar con ${deudoresContactables.length} cliente(s)`
                  : "No hay clientes con deuda y teléfono"
              }
            >
              Iniciar recordatorios
            </button>

            <button
              className="cc-btn cc-btn-primary"
              onClick={() => setOpenNueva(true)}
              disabled={submitting}
            >
              + Nueva cuenta
            </button>
          </div>
        </div>

        {errorMsg && <div className="cc-alert cc-alert-error">{errorMsg}</div>}

        <div className="cc-cards cc-cards-top">
          <div className="cc-stat cc-stat-main">
            <div className="cc-stat-label">Total adeudado</div>
            <div className="cc-stat-value">${money(totalDeuda)}</div>
            <div className="cc-stat-foot">
              Saldo pendiente total del panel actual
            </div>
          </div>

          <div className="cc-stat">
            <div className="cc-stat-label">Total cuentas</div>
            <div className="cc-stat-value">{totalCuentas}</div>
          </div>

          <div className="cc-stat">
            <div className="cc-stat-label">Con deuda</div>
            <div className="cc-stat-value">{deudoresConSaldo}</div>
          </div>

          <div className="cc-stat">
            <div className="cc-stat-label">Archivadas</div>
            <div className="cc-stat-value">{archivadasCount}</div>
          </div>
        </div>

        <div className="cc-toolbar">
          <div className="cc-search-wrap">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre o teléfono..."
              className="cc-input cc-input-search"
            />
          </div>

          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="cc-select"
          >
            <option value="activas">Activas</option>
            <option value="archivadas">Archivadas</option>
            <option value="todas">Todas</option>
          </select>

          <label className="cc-check">
            <input
              type="checkbox"
              checked={soloConDeuda}
              onChange={(e) => setSoloConDeuda(e.target.checked)}
            />
            Solo con deuda
          </label>

          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
            className="cc-select"
          >
            <option value="saldo_desc">Mayor deuda</option>
            <option value="nombre_asc">Nombre A-Z</option>
          </select>
        </div>

        {top3.length > 0 && (
          <div className="cc-block">
            <div className="cc-block-title">Top 3 deudores</div>
            <div className="cc-chips">
              {top3.map((c) => (
                <button
                  key={c.id}
                  className="cc-chip"
                  onClick={() => verHistorial(c)}
                  disabled={submitting}
                  title="Ver historial"
                >
                  <span className="cc-chip-name">{c.cliente_nombre}</span>
                  <span className="cc-chip-dot">•</span>
                  <span className="cc-chip-amount">${money(c.saldo)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="cc-table-shell">
          <div className="cc-table-headline">
            <div>
              <div className="cc-block-title">Listado de cuentas</div>
              <div className="cc-muted">
                Mostrando {filtradas.length} resultado
                {filtradas.length === 1 ? "" : "s"}
              </div>
            </div>
          </div>

          <div className="cc-table-wrap">
            <table className="cc-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Teléfono</th>
                  <th>Saldo</th>
                  <th style={{ width: 620 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="cc-empty">
                      Cargando cuentas...
                    </td>
                  </tr>
                ) : filtradas.length ? (
                  filtradas.map((c) => {
                    const saldo = Number(c.saldo || 0);
                    const activo = Number(c.activo ?? 1);
                    const archivada = activo === 0;
                    const puedeRecordar = saldo > 0 && !!c.telefono;
                    const primerAviso =
                      Number(c.recordatorios_enviados || 0) === 0;

                    return (
                      <tr key={c.id}>
                        <td>
                          <div className="cc-client-cell">
                            <div className="cc-avatar">
                              {(c.cliente_nombre || "?")
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                            <div>
                              <div className="cc-client-name">
                                {c.cliente_nombre}
                                {archivada && (
                                  <span className="cc-badge">Archivada</span>
                                )}
                                {!archivada && (
                                  <span
                                    className={`cc-badge ${
                                      primerAviso
                                        ? "cc-badge-first"
                                        : "cc-badge-follow"
                                    }`}
                                  >
                                    {primerAviso
                                      ? "Primer aviso"
                                      : "Seguimiento"}
                                  </span>
                                )}
                              </div>
                              <div className="cc-muted">ID #{c.id}</div>
                            </div>
                          </div>
                        </td>

                        <td>
                          {c.telefono ? (
                            <a
                              href={waLink(c.telefono)}
                              target="_blank"
                              rel="noreferrer"
                              className="cc-phone"
                              title="Abrir WhatsApp"
                            >
                              {c.telefono}
                            </a>
                          ) : (
                            <span className="cc-muted">-</span>
                          )}
                        </td>

                        <td>
                          <span
                            className={`cc-saldo-pill ${saldo > 0 ? "debe" : "ok"}`}
                          >
                            ${money(saldo)}
                          </span>
                        </td>

                        <td>
                          <div className="cc-actions">
                            <button
                              className="cc-btn"
                              onClick={() => abrirEditar(c)}
                              disabled={submitting}
                            >
                              Editar
                            </button>

                            {activo === 1 && saldo === 0 && (
                              <button
                                className="cc-btn"
                                onClick={() => archivarCuenta(c)}
                                disabled={submitting}
                              >
                                Cerrar
                              </button>
                            )}

                            {archivada && (
                              <button
                                className="cc-btn cc-btn-primary"
                                onClick={() => reactivarCuenta(c)}
                                disabled={submitting}
                              >
                                Reactivar
                              </button>
                            )}

                            <button
                              className="cc-btn cc-btn-soft"
                              onClick={() => abrirMovimiento(c, "CARGO")}
                              disabled={submitting || archivada}
                            >
                              + Sumar
                            </button>

                            <button
                              className="cc-btn cc-btn-soft"
                              onClick={() => abrirMovimiento(c, "PAGO")}
                              disabled={submitting || archivada}
                            >
                              – Restar
                            </button>

                            <button
                              className="cc-btn"
                              onClick={() => verHistorial(c)}
                              disabled={submitting}
                            >
                              Historial
                            </button>

                            <button
                              className="cc-btn cc-btn-wa"
                              onClick={() => abrirWhatsAppRecordatorio(c)}
                              disabled={submitting || !puedeRecordar}
                              title={
                                !c.telefono
                                  ? "No tiene teléfono"
                                  : saldo <= 0
                                    ? "No tiene deuda pendiente"
                                    : primerAviso
                                      ? "Enviar primer recordatorio por WhatsApp"
                                      : "Enviar recordatorio de seguimiento por WhatsApp"
                              }
                            >
                              {primerAviso
                                ? "Primer recordatorio"
                                : "Recordatorio"}
                            </button>
                          </div>

                          {activo === 1 && saldo !== 0 && (
                            <div className="cc-help">
                              Para cerrar la cuenta, el saldo debe quedar en
                              $0,00
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="cc-empty">
                      No hay resultados para mostrar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {openMasivo && (
          <div style={overlay} onClick={cerrarMasivo}>
            <div
              style={{ ...modal, width: "min(700px, 96vw)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="cc-modal-head cc-modal-head-lg">
                <div>
                  <h3 style={{ margin: 0 }}>Recordatorios masivos</h3>
                  <span className="cc-muted">
                    Cliente {recordatorioIndex + 1} de{" "}
                    {colaRecordatorios.length}
                  </span>
                </div>
              </div>

              {clienteRecordatorioActual ? (
                <>
                  <div className="cc-massive-grid">
                    <div className="cc-massive-card">
                      <div className="cc-massive-label">Cliente</div>
                      <div className="cc-massive-value">
                        {clienteRecordatorioActual.cliente_nombre}
                      </div>
                    </div>

                    <div className="cc-massive-card">
                      <div className="cc-massive-label">Teléfono</div>
                      <div className="cc-massive-value">
                        {clienteRecordatorioActual.telefono || "-"}
                      </div>
                    </div>

                    <div className="cc-massive-card">
                      <div className="cc-massive-label">Saldo</div>
                      <div className="cc-massive-value">
                        ${moneyNoDecimals(clienteRecordatorioActual.saldo || 0)}
                      </div>
                    </div>

                    <div className="cc-massive-card">
                      <div className="cc-massive-label">Tipo de mensaje</div>
                      <div className="cc-massive-value">
                        {esPrimerRecordatorio(clienteRecordatorioActual)
                          ? "Presentación"
                          : "Seguimiento"}
                      </div>
                    </div>

                    <div className="cc-massive-card">
                      <div className="cc-massive-label">
                        Marcados como enviados
                      </div>
                      <div className="cc-massive-value">
                        {recordatoriosEnviados.length} /{" "}
                        {colaRecordatorios.length}
                      </div>
                    </div>
                  </div>

                  <div className="cc-message-preview">
                    <div className="cc-message-preview-label">
                      Vista previa del mensaje
                    </div>
                    <pre className="cc-message-preview-text">
                      {mensajeRecordatorio(clienteRecordatorioActual)}
                    </pre>
                  </div>

                  <div className="cc-progress">
                    <div
                      className="cc-progress-bar"
                      style={{
                        width: `${
                          ((recordatorioIndex + 1) / colaRecordatorios.length) *
                          100
                        }%`,
                      }}
                    />
                  </div>

                  <div className="cc-modal-actions" style={{ marginTop: 14 }}>
                    <button
                      className="cc-btn"
                      onClick={cerrarMasivo}
                      disabled={submitting}
                    >
                      Finalizar
                    </button>

                    <button
                      className="cc-btn cc-btn-wa"
                      onClick={abrirWhatsAppActual}
                      disabled={submitting}
                    >
                      Abrir WhatsApp
                    </button>

                    <button
                      className="cc-btn"
                      onClick={omitirYSiguiente}
                      disabled={submitting}
                    >
                      {esUltimoRecordatorio ? "Omitir y finalizar" : "Omitir"}
                    </button>

                    <button
                      className="cc-btn cc-btn-primary"
                      onClick={enviadoYSiguiente}
                      disabled={submitting}
                    >
                      {submitting
                        ? "Guardando..."
                        : esUltimoRecordatorio
                          ? "Finalizar"
                          : "Enviado y siguiente"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="cc-empty">No hay clientes para procesar.</div>
              )}
            </div>
          </div>
        )}

        {openNueva && (
          <div style={overlay} onClick={cerrarNueva}>
            <div style={modal} onClick={(e) => e.stopPropagation()}>
              <div className="cc-modal-head">
                <h3 style={{ margin: 0 }}>Nueva cuenta</h3>
                <span className="cc-muted">Alta manual de cliente</span>
              </div>

              <input
                placeholder="Nombre del cliente"
                value={formNueva.cliente_nombre}
                onChange={(e) =>
                  setFormNueva({
                    ...formNueva,
                    cliente_nombre: e.target.value,
                  })
                }
                style={inp}
              />

              <input
                placeholder="Teléfono (opcional)"
                value={formNueva.telefono}
                onChange={(e) =>
                  setFormNueva({ ...formNueva, telefono: e.target.value })
                }
                style={inp}
              />

              <input
                placeholder="Notas (opcional)"
                value={formNueva.notas}
                onChange={(e) =>
                  setFormNueva({ ...formNueva, notas: e.target.value })
                }
                style={inp}
              />

              <div className="cc-modal-actions">
                <button
                  className="cc-btn"
                  onClick={cerrarNueva}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  className="cc-btn cc-btn-primary"
                  onClick={crearCuenta}
                  disabled={submitting}
                >
                  {submitting ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {openEdit && (
          <div style={overlay} onClick={cerrarEdit}>
            <div style={modal} onClick={(e) => e.stopPropagation()}>
              <div className="cc-modal-head">
                <h3 style={{ margin: 0 }}>Editar cuenta</h3>
                <span className="cc-muted">{cuentaSel?.cliente_nombre}</span>
              </div>

              <input
                placeholder="Nombre del cliente"
                value={formEdit.cliente_nombre}
                onChange={(e) =>
                  setFormEdit({
                    ...formEdit,
                    cliente_nombre: e.target.value,
                  })
                }
                style={inp}
              />

              <input
                placeholder="Teléfono"
                value={formEdit.telefono}
                onChange={(e) =>
                  setFormEdit({ ...formEdit, telefono: e.target.value })
                }
                style={inp}
              />

              <input
                placeholder="Notas"
                value={formEdit.notas}
                onChange={(e) =>
                  setFormEdit({ ...formEdit, notas: e.target.value })
                }
                style={inp}
              />

              <div className="cc-modal-actions">
                <button
                  className="cc-btn"
                  onClick={cerrarEdit}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  className="cc-btn cc-btn-primary"
                  onClick={guardarEdicion}
                  disabled={submitting}
                >
                  {submitting ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {openMov && (
          <div style={overlay} onClick={cerrarMov}>
            <div style={modal} onClick={(e) => e.stopPropagation()}>
              <div className="cc-modal-head">
                <h3 style={{ margin: 0 }}>
                  {tipoMov === "CARGO"
                    ? "Sumar a la deuda"
                    : "Restar deuda (pago)"}
                </h3>
                <span className="cc-muted">{cuentaSel?.cliente_nombre}</span>
              </div>

              <div className="cc-inline-stat">
                <span className="cc-inline-label">Saldo actual</span>
                <span className="cc-inline-value">
                  ${money(cuentaSel?.saldo || 0)}
                </span>
              </div>

              <input
                placeholder="Monto"
                value={montoMov}
                onChange={(e) => setMontoMov(e.target.value)}
                style={inp}
              />

              <input
                placeholder="Descripción (opcional)"
                value={descMov}
                onChange={(e) => setDescMov(e.target.value)}
                style={inp}
              />

              <div className="cc-modal-actions">
                <button
                  className="cc-btn"
                  onClick={cerrarMov}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  className="cc-btn cc-btn-primary"
                  onClick={guardarMovimiento}
                  disabled={submitting}
                >
                  {submitting ? "Confirmando..." : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {openHist && (
          <div style={overlay} onClick={cerrarHist}>
            <div
              style={{ ...modal, width: "min(980px, 96vw)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="cc-modal-head cc-modal-head-lg">
                <div>
                  <h3 style={{ margin: 0 }}>
                    Historial · {cuentaSel?.cliente_nombre}
                  </h3>
                  <span className="cc-muted">
                    Saldo actual: ${money(cuentaSel?.saldo || 0)}
                  </span>
                </div>
              </div>

              <div className="cc-table-wrap" style={{ borderRadius: 14 }}>
                <table className="cc-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>Monto</th>
                      <th>Saldo acumulado</th>
                      <th>Descripción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historialConSaldo.length ? (
                      historialConSaldo.map((m) => (
                        <tr key={m.id}>
                          <td>{formatFecha(m.fecha)}</td>
                          <td>
                            <span
                              className={`cc-type ${
                                m.tipo === "CARGO" ? "cargo" : "pago"
                              }`}
                            >
                              {m.tipo}
                            </span>
                          </td>
                          <td>${money(m.monto)}</td>
                          <td>
                            <strong>${money(m.saldo_acumulado)}</strong>
                          </td>
                          <td>{m.descripcion || "-"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="cc-empty">
                          Sin movimientos
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="cc-modal-actions" style={{ marginTop: 14 }}>
                <button className="cc-btn" onClick={cerrarHist}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "clamp(14px, 2.5vw, 28px)",
    background: "linear-gradient(180deg, #f7f8fb 0%, #f4f5f7 100%)",
    color: "#111827",
  },
  container: {
    maxWidth: 1380,
    margin: "0 auto",
  },
  title: {
    margin: "6px 0 0 0",
    fontSize: "clamp(24px, 2.4vw, 32px)",
    fontWeight: 800,
    letterSpacing: "-0.03em",
  },
  subtitle: {
    fontSize: 13,
    opacity: 0.72,
    marginTop: 6,
  },
};

const css = `
*{ box-sizing:border-box; }

.cc-hero{
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  gap:16px;
  margin-bottom:18px;
  padding:20px;
  border:1px solid rgba(17,24,39,.06);
  border-radius:24px;
  background:linear-gradient(135deg,#ffffff 0%,#f8fafc 100%);
  box-shadow:0 18px 45px rgba(15,23,42,.06);
}

.cc-kicker{
  display:inline-flex;
  align-items:center;
  gap:8px;
  font-size:12px;
  font-weight:800;
  letter-spacing:.08em;
  text-transform:uppercase;
  color:#4b5563;
}

.cc-hero-actions{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
}

.cc-toolbar{
  display:flex;
  flex-wrap:wrap;
  gap:10px;
  align-items:center;
  margin-bottom:16px;
}

.cc-search-wrap{
  flex:1;
  min-width:240px;
}

.cc-input{
  width:100%;
  padding:12px 14px;
  border-radius:14px;
  border:1px solid #e5e7eb;
  background:#fff;
  outline:none;
  transition:.2s ease;
}

.cc-input-search{
  box-shadow:0 8px 20px rgba(15,23,42,.04);
}

.cc-input:focus{
  border-color:#d1d5db;
  box-shadow:0 0 0 4px rgba(17,24,39,.05);
}

.cc-select{
  min-width:150px;
  padding:12px 14px;
  border-radius:14px;
  border:1px solid #e5e7eb;
  background:#fff;
}

.cc-check{
  display:flex;
  align-items:center;
  gap:8px;
  padding:11px 14px;
  border:1px solid #e5e7eb;
  border-radius:14px;
  background:#fff;
  white-space:nowrap;
}

.cc-btn{
  padding:11px 14px;
  border-radius:14px;
  border:1px solid #e5e7eb;
  background:#fff;
  color:#111827;
  cursor:pointer;
  font-weight:800;
  transition:.2s ease;
}

.cc-btn:hover{
  background:#f9fafb;
  transform:translateY(-1px);
}

.cc-btn:disabled{
  opacity:.55;
  cursor:not-allowed;
  transform:none;
}

.cc-btn-primary{
  border-color:#111827;
  background:#111827;
  color:#fff;
}

.cc-btn-primary:hover{
  filter:brightness(1.04);
  background:#111827;
  color:#fff;
}

.cc-btn-soft{
  background:#f9fafb;
}

.cc-btn-wa{
  background:#ecfdf5;
  border-color:#bbf7d0;
  color:#166534;
}

.cc-btn-wa:hover{
  background:#dcfce7;
  color:#166534;
}

.cc-btn-massive{
  background:#eff6ff;
  border-color:#bfdbfe;
  color:#1d4ed8;
}

.cc-btn-massive:hover{
  background:#dbeafe;
  color:#1d4ed8;
}

.cc-alert{
  margin-bottom:14px;
  padding:12px 14px;
  border-radius:16px;
  font-size:14px;
}

.cc-alert-error{
  background:#fff2f2;
  border:1px solid #fecaca;
  color:#991b1b;
}

.cc-cards{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
  gap:12px;
}

.cc-cards-top{
  margin-bottom:18px;
}

.cc-stat{
  border:1px solid rgba(17,24,39,.06);
  border-radius:22px;
  padding:16px;
  background:#fff;
  box-shadow:0 12px 28px rgba(15,23,42,.05);
}

.cc-stat-main{
  grid-column:span 2;
  background:linear-gradient(135deg,#111827 0%, #1f2937 100%);
  color:#fff;
}

.cc-stat-label{
  font-size:12px;
  opacity:.78;
  margin-bottom:8px;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:.04em;
}

.cc-stat-value{
  font-size:clamp(22px, 2vw, 30px);
  font-weight:900;
  letter-spacing:-.03em;
}

.cc-stat-foot{
  margin-top:8px;
  font-size:12px;
  opacity:.75;
}

.cc-block{
  margin-bottom:16px;
}

.cc-block-title{
  font-weight:800;
  font-size:15px;
  margin-bottom:8px;
}

.cc-chips{
  display:flex;
  flex-wrap:wrap;
  gap:10px;
}

.cc-chip{
  display:inline-flex;
  align-items:center;
  gap:8px;
  padding:10px 14px;
  border:none;
  border-radius:999px;
  background:#fff;
  cursor:pointer;
  box-shadow:0 10px 24px rgba(15,23,42,.08);
  font-weight:700;
}

.cc-chip:hover{
  transform:translateY(-1px);
}

.cc-chip:disabled{
  opacity:.6;
  cursor:not-allowed;
}

.cc-chip-name{
  font-weight:800;
}

.cc-chip-dot{
  opacity:.45;
}

.cc-chip-amount{
  color:#991b1b;
}

.cc-table-shell{
  border:1px solid rgba(17,24,39,.06);
  border-radius:24px;
  background:#fff;
  box-shadow:0 18px 40px rgba(15,23,42,.05);
  overflow:hidden;
}

.cc-table-headline{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:12px;
  padding:18px 18px 10px 18px;
}

.cc-table-wrap{
  width:100%;
  overflow:auto;
}

.cc-table{
  width:100%;
  border-collapse:collapse;
  min-width:860px;
}

.cc-table th{
  text-align:left;
  padding:14px 18px;
  font-size:12px;
  color:#6b7280;
  border-bottom:1px solid #f1f5f9;
  background:#fcfcfd;
  text-transform:uppercase;
  letter-spacing:.04em;
}

.cc-table td{
  padding:16px 18px;
  border-bottom:1px solid #f3f4f6;
  vertical-align:middle;
}

.cc-client-cell{
  display:flex;
  align-items:center;
  gap:12px;
}

.cc-avatar{
  width:40px;
  height:40px;
  border-radius:50%;
  display:grid;
  place-items:center;
  background:#111827;
  color:#fff;
  font-weight:900;
  flex-shrink:0;
}

.cc-client-name{
  display:flex;
  align-items:center;
  gap:8px;
  font-weight:800;
  flex-wrap:wrap;
}

.cc-muted{
  color:#6b7280;
  font-size:12px;
}

.cc-badge{
  display:inline-flex;
  align-items:center;
  padding:4px 8px;
  border-radius:999px;
  border:1px solid #e5e7eb;
  background:#f9fafb;
  font-size:11px;
  font-weight:900;
  color:#4b5563;
}

.cc-badge-first{
  background:#eff6ff;
  border-color:#bfdbfe;
  color:#1d4ed8;
}

.cc-badge-follow{
  background:#ecfdf5;
  border-color:#bbf7d0;
  color:#166534;
}

.cc-saldo-pill{
  display:inline-flex;
  align-items:center;
  padding:8px 12px;
  border-radius:999px;
  font-weight:900;
  font-size:13px;
}

.cc-saldo-pill.debe{
  background:#fff1f2;
  color:#be123c;
}

.cc-saldo-pill.ok{
  background:#ecfdf5;
  color:#047857;
}

.cc-actions{
  display:flex;
  gap:8px;
  flex-wrap:wrap;
}

.cc-help{
  margin-top:8px;
  font-size:12px;
  color:#6b7280;
}

.cc-phone{
  font-weight:800;
  color:#111827;
  text-decoration:none;
  border-bottom:1px dashed rgba(17,24,39,.35);
  padding-bottom:1px;
}

.cc-phone:hover{
  border-bottom-style:solid;
}

.cc-empty{
  padding:20px;
  color:#6b7280;
}

.cc-modal-head{
  display:flex;
  flex-direction:column;
  gap:4px;
  margin-bottom:14px;
}

.cc-modal-head-lg{
  margin-bottom:16px;
}

.cc-modal-actions{
  display:flex;
  justify-content:flex-end;
  gap:8px;
}

.cc-inline-stat{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:10px;
  padding:12px 14px;
  margin-bottom:12px;
  border-radius:14px;
  background:#f9fafb;
  border:1px solid #eef2f7;
}

.cc-inline-label{
  color:#6b7280;
  font-size:13px;
}

.cc-inline-value{
  font-weight:900;
}

.cc-type{
  display:inline-flex;
  align-items:center;
  padding:6px 10px;
  border-radius:999px;
  font-weight:800;
  font-size:12px;
}

.cc-type.cargo{
  background:#fff7ed;
  color:#c2410c;
}

.cc-type.pago{
  background:#eff6ff;
  color:#1d4ed8;
}

.cc-massive-grid{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
  gap:10px;
  margin-bottom:14px;
}

.cc-massive-card{
  border:1px solid #e5e7eb;
  border-radius:16px;
  padding:12px;
  background:#f9fafb;
}

.cc-massive-label{
  font-size:12px;
  color:#6b7280;
  margin-bottom:6px;
  text-transform:uppercase;
  letter-spacing:.04em;
  font-weight:700;
}

.cc-massive-value{
  font-size:15px;
  font-weight:800;
  color:#111827;
  word-break:break-word;
}

.cc-message-preview{
  border:1px solid #e5e7eb;
  border-radius:16px;
  background:#fff;
  padding:14px;
}

.cc-message-preview-label{
  font-size:12px;
  color:#6b7280;
  margin-bottom:8px;
  text-transform:uppercase;
  letter-spacing:.04em;
  font-weight:700;
}

.cc-message-preview-text{
  margin:0;
  white-space:pre-wrap;
  word-break:break-word;
  font-family:inherit;
  font-size:14px;
  line-height:1.5;
  color:#111827;
}

.cc-progress{
  margin-top:14px;
  height:10px;
  width:100%;
  background:#e5e7eb;
  border-radius:999px;
  overflow:hidden;
}

.cc-progress-bar{
  height:100%;
  background:linear-gradient(90deg,#111827 0%, #374151 100%);
  border-radius:999px;
  transition:width .2s ease;
}

@media (max-width: 900px){
  .cc-stat-main{
    grid-column:span 1;
  }
}

@media (max-width: 720px){
  .cc-hero{
    flex-direction:column;
    align-items:stretch;
  }

  .cc-hero-actions{
    width:100%;
  }

  .cc-hero-actions .cc-btn{
    flex:1;
  }
}

@media (max-width: 520px){
  .cc-check,
  .cc-select{
    width:100%;
  }

  .cc-hero-actions .cc-btn{
    width:100%;
  }

  .cc-modal-actions{
    flex-direction:column;
  }

  .cc-modal-actions .cc-btn{
    width:100%;
  }
}
`;

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  zIndex: 9999,
  backdropFilter: "blur(4px)",
};

const modal = {
  background: "#fff",
  color: "#111827",
  borderRadius: 22,
  padding: 18,
  width: "min(520px, 96vw)",
  maxHeight: "90vh",
  overflowY: "auto",
  boxShadow: "0 24px 60px rgba(15,23,42,.25)",
};

const inp = {
  width: "100%",
  padding: 12,
  marginBottom: 10,
  borderRadius: 14,
  border: "1px solid #e5e7eb",
  outline: "none",
  background: "#fff",
};
