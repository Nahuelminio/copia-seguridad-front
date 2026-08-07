import React, { useEffect, useState } from "react";
import axios from "../utils/axiosInstance";
import * as XLSX from "xlsx";

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

  const exportarExcel = () => {
    const datos = datos_export.map((f) => {
      const margen = f.total_ventas ? (f.ganancia / f.total_ventas) * 100 : 0;
      return {
        "Sucursal": f.sucursal,
        "Ventas Regulares": Number(f.ventas_regulares),
        "Ventas Mayorista": Number(f.ventas_mayorista),
        "Total Ventas": Number(f.total_ventas),
        "Costo Total": Number(f.costo_total),
        "Ganancia": Number(f.ganancia),
        "Margen %": Math.round(margen * 10) / 10,
        "Período": mes && anio ? `${mes}/${anio}` : "Todo",
      };
    });
    const ws = XLSX.utils.json_to_sheet(datos);
    ws["!cols"] = [{ wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ganancias");
    const nombre = `ganancias${mes && anio ? `_${anio}_${String(mes).padStart(2,"0")}` : "_total"}.xlsx`;
    XLSX.writeFile(wb, nombre);
  };

  // alias para usar en exportarExcel sin closure issue
  const datos_export = datos;

  const totalVentas     = datos.reduce((acc, f) => acc + Number(f.total_ventas     || 0), 0);
  const totalMayorista  = datos.reduce((acc, f) => acc + Number(f.ventas_mayorista  || 0), 0);
  const totalCostos     = datos.reduce((acc, f) => acc + Number(f.costo_total       || 0), 0);
  const totalGanancia   = datos.reduce((acc, f) => acc + Number(f.ganancia          || 0), 0);

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
          {/* Tabla desktop */}
          <div className="mx-auto" style={{ maxWidth: "1100px" }}>
            <div className="table-responsive d-none d-md-block">
              <table className="table table-bordered mt-3 mb-0">
                <thead className="table-dark">
                  <tr>
                    <th>Sucursal</th>
                    <th>Ventas Regulares 🏪</th>
                    <th>Ventas Mayorista 📦</th>
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
                        <td>{formatoMoneda(fila.ventas_regulares)}</td>
                        <td>
                          {Number(fila.ventas_mayorista) > 0 ? (
                            <span className="badge bg-info text-dark">
                              {formatoMoneda(fila.ventas_mayorista)}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td><strong>{formatoMoneda(fila.total_ventas)}</strong></td>
                        <td>{formatoMoneda(fila.costo_total)}</td>
                        <td>
                          <strong style={{ color: fila.ganancia >= 0 ? "#198754" : "#dc3545" }}>
                            {formatoMoneda(fila.ganancia)}
                          </strong>
                        </td>
                        <td>{margen.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totales generales */}
            <div className="row row-cols-2 row-cols-sm-4 g-2 mt-4">
              <div className="col">
                <div className="alert alert-secondary text-center mb-0 p-2">
                  <small className="d-block text-muted">Ventas Regulares</small>
                  <strong>{formatoMoneda(totalVentas - totalMayorista)}</strong>
                </div>
              </div>
              <div className="col">
                <div className="alert alert-info text-center mb-0 p-2">
                  <small className="d-block text-muted">Ventas Mayorista</small>
                  <strong>{formatoMoneda(totalMayorista)}</strong>
                </div>
              </div>
              <div className="col">
                <div className="alert alert-secondary text-center mb-0 p-2">
                  <small className="d-block text-muted">Total Costos</small>
                  <strong>{formatoMoneda(totalCostos)}</strong>
                </div>
              </div>
              <div className="col">
                <div className="alert alert-success text-center mb-0 p-2">
                  <small className="d-block text-muted">Ganancia Total</small>
                  <strong>{formatoMoneda(totalGanancia)}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Cards móviles */}
          <div className="d-md-none">
            <div className="row g-3 mt-2">
              {datos.map((fila, i) => {
                const margen = fila.total_ventas
                  ? (fila.ganancia / fila.total_ventas) * 100
                  : 0;
                return (
                  <div key={i} className="col-12">
                    <div className="card shadow-sm">
                      <div className="card-body p-3">
                        <h5 className="card-title mb-2">{fila.sucursal}</h5>
                        <p className="mb-1">
                          <strong>Ventas regulares:</strong>{" "}
                          {formatoMoneda(fila.ventas_regulares)}
                        </p>
                        {Number(fila.ventas_mayorista) > 0 && (
                          <p className="mb-1">
                            <strong>Ventas mayorista:</strong>{" "}
                            <span className="badge bg-info text-dark">
                              {formatoMoneda(fila.ventas_mayorista)}
                            </span>
                          </p>
                        )}
                        <p className="mb-1">
                          <strong>Total ventas:</strong>{" "}
                          {formatoMoneda(fila.total_ventas)}
                        </p>
                        <p className="mb-1">
                          <strong>Costos:</strong>{" "}
                          {formatoMoneda(fila.costo_total)}
                        </p>
                        <p className="mb-1">
                          <strong>Ganancia:</strong>{" "}
                          <span style={{ color: fila.ganancia >= 0 ? "#198754" : "#dc3545", fontWeight: 700 }}>
                            {formatoMoneda(fila.ganancia)}
                          </span>
                        </p>
                        <p className="mb-0">
                          <strong>Margen:</strong> {margen.toFixed(1)}%
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

      {/* Botones */}
      <div className="d-flex justify-content-center gap-3 mt-4">
        <button className="btn button-filtros w-25" onClick={obtenerResumen}>
          Actualizar
        </button>
        {datos.length > 0 && (
          <button
            className="btn w-25"
            style={{ background: "#10b981", color: "#fff", border: "none", fontWeight: 600, borderRadius: "8px" }}
            onClick={exportarExcel}
          >
            ⬇ Exportar Excel
          </button>
        )}
      </div>
    </div>
  );
}
