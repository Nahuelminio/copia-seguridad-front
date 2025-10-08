import React, { useState } from "react";
import axios from "../../utils/axiosInstance";
import { toast } from "react-toastify";

function RankingProductosModal() {
  const [ranking, setRanking] = useState({});
  const [loading, setLoading] = useState(false);
  const [mes, setMes] = useState("");
  const [anio, setAnio] = useState("");

  const obtenerRanking = async () => {
    if (!mes || !anio) {
      toast.error("🗓️ Seleccioná mes y año");
      return;
    }

    console.log("🔍 Obteniendo ranking con:", { mes, anio });
    setLoading(true);

    try {
      const res = await axios.get(
        `/ranking-productos-sucursal?mes=${mes}&anio=${anio}`
      );
      console.log("✅ Respuesta del backend:", res.data);

      const agrupado = {};
      res.data.forEach((item) => {
        const clave = item.sucursal;
        if (!agrupado[clave]) agrupado[clave] = [];
        agrupado[clave].push({
          producto: item.producto_nombre,
          gusto: item.gusto,
          total: item.total_vendido,
        });
      });

      console.log("📊 Datos agrupados:", agrupado);
      setRanking(agrupado);
    } catch (err) {
      console.error("❌ Error al obtener ranking:", err);
      toast.error("❌ Error al obtener ranking");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal fade"
      id="modalRankingProductos"
      tabIndex="-1"
      aria-hidden="true"
    >
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              📊 Ranking de Productos por Sucursal
            </h5>
            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
              aria-label="Cerrar"
            ></button>
          </div>
          <div className="modal-body">
            {/* Filtros */}
            <div className="row g-2 mb-3">
              <div className="col-md-4">
                <label className="form-label">Mes</label>
                <select
                  className="form-select"
                  value={mes}
                  onChange={(e) => setMes(e.target.value)}
                >
                  <option value="">Mes</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(0, i).toLocaleString("es-AR", {
                        month: "long",
                      })}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Año</label>
                <input
                  type="number"
                  className="form-control"
                  value={anio}
                  onChange={(e) => setAnio(e.target.value)}
                  placeholder="Ej: 2025"
                />
              </div>
              <div className="col-md-4 d-flex align-items-end">
                <button className="btn btn-dark w-100" onClick={obtenerRanking}>
                  Ver ranking
                </button>
              </div>
            </div>

            {/* Contenido */}
            {loading ? (
              <p className="text-center">Cargando ranking...</p>
            ) : Object.keys(ranking).length === 0 ? (
              <p className="text-muted text-center">
                No hay datos para mostrar
              </p>
            ) : (
              Object.entries(ranking).map(([sucursal, productos]) => (
                <div key={sucursal} className="mb-4">
                  <h5 className="fw-bold">{sucursal}</h5>
                  <ul className="list-group">
                    {productos.slice(0, 5).map((item, i) => (
                      <li
                        key={i}
                        className="list-group-item d-flex justify-content-between"
                      >
                        <span>
                          {item.producto} — {item.gusto}
                        </span>
                        <span className="badge bg-success">
                          {item.total} ventas
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RankingProductosModal;
