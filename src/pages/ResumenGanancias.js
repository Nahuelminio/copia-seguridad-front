import React, { useEffect, useState } from "react";
import axios from "../utils/axiosInstance";

export default function ResumenGanancias() {
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState("");
  const [anio, setAnio] = useState("");

  const obtenerResumen = async () => {
    setLoading(true);
    try {
      const ruta =
        mes && anio
          ? `/resumen-ganancias-mensual?mes=${mes}&anio=${anio}`
          : "/resumen-ganancias";

      console.log("🔗 Ruta:", ruta); // debug opcional
      const res = await axios.get(ruta);
      setDatos(res.data);
    } catch {
      alert("❌ Error al obtener resumen de ganancias");
    } finally {
      setLoading(false);
    }
  };

  // Al cargar por primera vez, mostrar resumen general
  useEffect(() => {
    obtenerResumen();
  }, []);

  // Cuando cambia mes o año, actualizar automáticamente si ambos están completos
  useEffect(() => {
    if (mes && anio) {
      obtenerResumen();
    }
  }, [mes, anio]);

  const formatoMoneda = (valor) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(valor);

  return (
    <div className="container-fluid mt-4 px-2">
      <h2 className="text-center mb-4">Resumen de Ganancias por Sucursal</h2>

      {/* Filtros */}
      <div className="row justify-content-center mb-3">
        <div className="col-md-3 col-6">
          <label className="form-label">Mes</label>
          <select
            className="form-select"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
          >
            <option value="">Todos</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(0, i).toLocaleString("es-AR", { month: "long" })}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-3 col-6">
          <label className="form-label">Año</label>
          <input
            type="number"
            className="form-control"
            placeholder="Ej: 2025"
            value={anio}
            onChange={(e) => setAnio(e.target.value)}
          />
        </div>
      </div>

      {/* Cuerpo */}
      {loading ? (
        <p className="text-center">Cargando datos...</p>
      ) : datos.length === 0 ? (
        <p className="text-center">No hay datos disponibles.</p>
      ) : (
        <>
          <div className="mx-auto" style={{ maxWidth: "950px" }}>
            <div className="table-responsive-md d-none d-md-block">
              <table className="table table-bordered mt-3 mb-0">
                <thead className="table-dark">
                  <tr>
                    <th>Sucursal</th>
                    <th>Total Ventas 💰</th>
                    <th>Costo Total 💸</th>
                    <th>Ganancia 🤑</th>
                    <th>Margen % 📈</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.map((fila, i) => {
                    const margen = fila.total_ventas
                      ? (fila.ganancia / fila.total_ventas) * 100
                      : 0;
                    return (
                      <tr key={i}>
                        <td>{fila.sucursal}</td>
                        <td>{formatoMoneda(fila.total_ventas)}</td>
                        <td>{formatoMoneda(fila.costo_total)}</td>
                        <td>{formatoMoneda(fila.ganancia)}</td>
                        <td>{margen.toFixed(2)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totales generales */}
            <div className="row row-cols-1 row-cols-sm-3 g-2 mt-4">
              <div className="col">
                <div className="alert alert-secondary text-center mb-0">
                  🧾 Total Ventas:{" "}
                  <strong>
                    {formatoMoneda(
                      datos.reduce(
                        (acc, f) => acc + Number(f.total_ventas || 0),
                        0
                      )
                    )}
                  </strong>
                </div>
              </div>
              <div className="col">
                <div className="alert alert-secondary text-center mb-0">
                  💸 Total Costos:{" "}
                  <strong>
                    {formatoMoneda(
                      datos.reduce(
                        (acc, f) => acc + Number(f.costo_total || 0),
                        0
                      )
                    )}
                  </strong>
                </div>
              </div>
              <div className="col">
                <div className="alert alert-secondary text-center mb-0">
                  🧮 Ganancia Total:{" "}
                  <strong>
                    {formatoMoneda(
                      datos.reduce((acc, f) => acc + Number(f.ganancia || 0), 0)
                    )}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Cards móviles */}
          <div className="d-md-none">
            <div className="row g-3 mt-4">
              {datos.map((fila, i) => {
                const margen = fila.total_ventas
                  ? (fila.ganancia / fila.total_ventas) * 100
                  : 0;
                return (
                  <div key={i} className="col-12">
                    <div className="card shadow-sm">
                      <div className="card-body p-3">
                        <h5 className="card-title">{fila.sucursal}</h5>
                        <p className="mb-1">
                          <strong>Ventas:</strong>{" "}
                          {formatoMoneda(fila.total_ventas)}
                        </p>
                        <p className="mb-1">
                          <strong>Costos:</strong>{" "}
                          {formatoMoneda(fila.costo_total)}
                        </p>
                        <p className="mb-1">
                          <strong>Ganancia:</strong>{" "}
                          {formatoMoneda(fila.ganancia)}
                        </p>
                        <p className="mb-0">
                          <strong>Margen:</strong> {margen.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Botón actualizar manual */}
      <div className="d-flex justify-content-center">
        <button
          className="btn button-filtros mt-4 w-50 sm-auto"
          onClick={obtenerResumen}
        >
          Actualizar
        </button>
      </div>
    </div>
  );
}
