import React, { useEffect, useState } from "react";
import axios from "axios";

function ComparadorVentasMensuales() {
  const [ventasMes, setVentasMes] = useState([]);
  const [ventasMesAnterior, setVentasMesAnterior] = useState([]);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());

  const API = process.env.REACT_APP_API_URL;

  const cargarDatos = async () => {
    try {
      // Mes actual
      const resActual = await axios.get(
        `${API}/productos/ventas-mensuales?mes=${mes}&anio=${anio}`
      );
      setVentasMes(resActual.data);

      // Calcular mes anterior
      const fechaActual = new Date(anio, mes - 1);
      const fechaAnterior = new Date(
        fechaActual.setMonth(fechaActual.getMonth() - 1)
      );
      const mesAnt = fechaAnterior.getMonth() + 1;
      const anioAnt = fechaAnterior.getFullYear();

      // Mes anterior
      const resAnterior = await axios.get(
        `${API}/productos/ventas-mensuales?mes=${mesAnt}&anio=${anioAnt}`
      );
      setVentasMesAnterior(resAnterior.data);
    } catch (error) {
      console.error("❌ Error al cargar comparativa", error);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [mes, anio]);

  // 🔍 Sumar ventas totales
  const total = (ventas) =>
    ventas.reduce((acc, s) => acc + (s.total_ventas || 0), 0);

  const totalActual = total(ventasMes);
  const totalAnterior = total(ventasMesAnterior);

  const diferencia = totalActual - totalAnterior;
  const porcentaje =
    totalAnterior > 0 ? ((diferencia / totalAnterior) * 100).toFixed(2) : "N/A";

  return (
    <div className="card p-4 mt-4">
      <h4>📊 Comparativa de Ventas Mensuales</h4>

      <div className="row mb-3">
        <div className="col-md-6">
          <label>Mes</label>
          <input
            type="number"
            min="1"
            max="12"
            className="form-control"
            value={mes}
            onChange={(e) => setMes(parseInt(e.target.value))}
          />
        </div>
        <div className="col-md-6">
          <label>Año</label>
          <input
            type="number"
            min="2020"
            max="2100"
            className="form-control"
            value={anio}
            onChange={(e) => setAnio(parseInt(e.target.value))}
          />
        </div>
      </div>

      <p>
        🟦 Total ventas {mes}/{anio}: <strong>{totalActual}</strong>
      </p>
      <p>
        🔵 Total mes anterior: <strong>{totalAnterior}</strong>
      </p>
      <p>
        📈 Diferencia:{" "}
        <strong className={diferencia >= 0 ? "text-success" : "text-danger"}>
          {diferencia >= 0 ? "+" : ""}
          {diferencia} ({porcentaje}%)
        </strong>
      </p>
    </div>
  );
}

export default ComparadorVentasMensuales;
