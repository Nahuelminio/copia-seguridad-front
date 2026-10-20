import React, { useCallback, useEffect, useState } from "react";
import axios from "../utils/axiosInstance";
import { toast } from "react-toastify";

/**
 * Los pedidos que mandan los mayoristas desde la lista pública (/lista).
 *
 * Son pedidos a cotizar, no pedidos mayoristas todavía: traen qué y cuánto, y
 * el precio con el que se les mostró la lista. Cuando se acuerda, se carga como
 * pedido mayorista desde la pantalla de siempre.
 *
 * El estado no es decorativo: es lo único que distingue un pedido que hay que
 * contestar de uno que ya se atendió. Un pedido nuevo y uno cerrado se ven
 * igual en Telegram, que es donde llegan.
 */

const ESTADOS = {
  nuevo:    { texto: "Nuevo",    color: "#2563eb" },
  visto:    { texto: "Visto",    color: "#64748b" },
  cotizado: { texto: "Cotizado", color: "#ca8a04" },
  cerrado:  { texto: "Cerrado",  color: "#16a34a" },
};

const plata = (n) =>
  "US$ " + Number(n || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });

const cuando = (f) =>
  new Date(f).toLocaleString("es-AR", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });

export default function PedidosLista() {
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [abierto, setAbierto] = useState(null);
  const [filtro, setFiltro] = useState("pendientes");

  const cargar = useCallback(() => {
    setCargando(true);
    axios
      .get("/pedidos-lista")
      .then((r) => setPedidos(r.data || []))
      .catch(() => toast.error("No pude traer los pedidos"))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const cambiarEstado = (id, estado) => {
    // Se pinta antes de que conteste el servidor: marcar diez pedidos
    // esperando cada vez es insufrible. Si falla, se vuelve a lo que había.
    const antes = pedidos;
    setPedidos((ps) => ps.map((p) => (p.id === id ? { ...p, estado } : p)));
    axios
      .put(`/pedidos-lista/${id}`, { estado })
      .catch(() => {
        setPedidos(antes);
        toast.error("No pude cambiar el estado");
      });
  };

  // Lo que importa es lo que falta contestar; lo cerrado tapa la pantalla
  const visibles = pedidos.filter((p) =>
    filtro === "todos" ? true : p.estado !== "cerrado"
  );

  const copiar = (p) => {
    const texto =
      `Pedido de ${p.quien} — ${cuando(p.fecha)}\n` +
      ["stock", "proveedor"]
        .map((origen) => {
          const r = p.items.filter((i) => i.origen === origen);
          if (!r.length) return "";
          return `\n${origen === "stock" ? "DE LO QUE HAY" : "A PEDIDO"}\n` +
            r.map((i) => `${i.cantidad}x ${i.nombre} — ${plata(i.precio_usd)}`).join("\n");
        })
        .join("") +
      `\n\nTotal: ${plata(p.total_usd)}` +
      (p.nota ? `\nNota: ${p.nota}` : "");
    navigator.clipboard.writeText(texto).then(
      () => toast.success("Copiado"),
      () => toast.error("No pude copiar")
    );
  };

  return (
    <div className="container mt-4" style={{ maxWidth: 900 }}>
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h2 className="fw-bold mb-0">Pedidos de la lista</h2>
          <p className="text-white-50 small mb-0">
            Lo que mandan los mayoristas desde la lista pública
          </p>
        </div>
        <div className="d-flex gap-2">
          <select
            className="form-select form-select-sm"
            style={{ width: 150 }}
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          >
            <option value="pendientes">Sin cerrar</option>
            <option value="todos">Todos</option>
          </select>
          <button className="btn btn-sm btn-outline-light" onClick={cargar}>
            Actualizar
          </button>
        </div>
      </div>

      {cargando && <p className="text-white-50">Cargando...</p>}

      {!cargando && !visibles.length && (
        <div className="text-center text-white-50 py-5">
          {pedidos.length
            ? "No hay pedidos sin cerrar."
            : "Todavía no llegó ningún pedido."}
        </div>
      )}

      {visibles.map((p) => {
        const est = ESTADOS[p.estado] || ESTADOS.nuevo;
        const desplegado = abierto === p.id;
        return (
          <div
            key={p.id}
            className="mb-3"
            style={{
              background: "#1e2530",
              border: "1px solid rgba(255,255,255,0.12)",
              borderLeft: `4px solid ${est.color}`,
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <div
              className="d-flex justify-content-between align-items-center p-3"
              style={{ cursor: "pointer", gap: 12 }}
              onClick={() => setAbierto(desplegado ? null : p.id)}
            >
              <div style={{ minWidth: 0 }}>
                <div className="fw-semibold text-white text-truncate">{p.quien}</div>
                <div className="small text-white-50">
                  {cuando(p.fecha)} · {p.productos} producto{p.productos === 1 ? "" : "s"} ·{" "}
                  {p.unidades} unidad{p.unidades === 1 ? "" : "es"}
                </div>
              </div>
              <div className="text-end" style={{ flex: "none" }}>
                <div className="fw-bold" style={{ color: "#7dd3fc" }}>
                  {plata(p.total_usd)}
                </div>
                <span
                  className="badge"
                  style={{ background: est.color, fontSize: ".7rem" }}
                >
                  {est.texto}
                </span>
              </div>
            </div>

            {desplegado && (
              <div className="px-3 pb-3">
                {p.nota && (
                  <div
                    className="small mb-3 p-2"
                    style={{ background: "rgba(255,255,255,0.05)", borderRadius: 8 }}
                  >
                    {p.nota}
                  </div>
                )}

                {/* Separadas porque son dos cosas distintas de atender: lo
                    que hay sale de Central hoy, lo otro hay que comprarlo. */}
                {["stock", "proveedor"].map((origen) => {
                  const renglones = p.items.filter((i) => i.origen === origen);
                  if (!renglones.length) return null;
                  return (
                    <div key={origen} className="mb-3">
                      <div
                        className="small fw-semibold mb-1"
                        style={{ color: origen === "stock" ? "#4ade80" : "#7dd3fc" }}
                      >
                        {origen === "stock" ? "De lo que hay en Central" : "A pedido"}
                      </div>
                      <table className="table table-sm table-dark mb-0">
                        <tbody>
                          {renglones.map((i) => (
                            <tr key={i.sku}>
                              <td style={{ width: 50 }} className="fw-bold">
                                {i.cantidad}x
                              </td>
                              <td>{i.nombre}</td>
                              <td className="text-end text-white-50" style={{ width: 90 }}>
                                {plata(i.precio_usd)}
                              </td>
                              <td className="text-end" style={{ width: 90 }}>
                                {plata(i.cantidad * i.precio_usd)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}

                <div className="d-flex gap-2 flex-wrap">
                  <button className="btn btn-sm btn-outline-light" onClick={() => copiar(p)}>
                    Copiar para WhatsApp
                  </button>
                  {Object.keys(ESTADOS)
                    .filter((e) => e !== p.estado)
                    .map((e) => (
                      <button
                        key={e}
                        className="btn btn-sm"
                        style={{
                          background: "transparent",
                          border: `1px solid ${ESTADOS[e].color}`,
                          color: ESTADOS[e].color,
                        }}
                        onClick={() => cambiarEstado(p.id, e)}
                      >
                        {ESTADOS[e].texto}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
