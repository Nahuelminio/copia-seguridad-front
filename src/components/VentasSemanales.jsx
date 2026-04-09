import React, { useEffect, useState } from "react";
import axios from "axios";
import { Line } from "react-chartjs-2";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

// 🔗 Backend en Render
const API_URL = "https://stock-north.onrender.com";

export default function VentasSemanales() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [semana, setSemana] = useState(42);
  const [anio, setAnio] = useState(2025);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setErrorMsg("");

      try {
        console.log(
          `📡 GET ${API_URL}/public/ventas-semanales?anio=${anio}&semana=${semana}`
        );

        const res = await axios.get(`${API_URL}/public/ventas-semanales`, {
          params: { anio, semana },
        });

        console.log("📊 Datos recibidos:", res.data);
        setData(res.data || []);
      } catch (error) {
        console.error("❌ Error cargando ventas semanales:", error);
        setErrorMsg("Error al cargar ventas semanales.");
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [semana, anio]);

  if (loading) return <p>Cargando ventas semanales...</p>;

  if (errorMsg) {
    return (
      <div>
        <div className="d-flex gap-2 mb-3">
          <input
            type="number"
            placeholder="Semana"
            className="form-control"
            min="1"
            max="52"
            value={semana}
            onChange={(e) => setSemana(e.target.value)}
          />
          <input
            type="number"
            placeholder="Año"
            className="form-control"
            value={anio}
            onChange={(e) => setAnio(e.target.value)}
          />
        </div>
        <p className="text-danger">{errorMsg}</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div>
        <div className="d-flex gap-2 mb-3">
          <input
            type="number"
            placeholder="Semana"
            className="form-control"
            min="1"
            max="52"
            value={semana}
            onChange={(e) => setSemana(e.target.value)}
          />
          <input
            type="number"
            placeholder="Año"
            className="form-control"
            value={anio}
            onChange={(e) => setAnio(e.target.value)}
          />
        </div>

        <p className="text-muted">
          No hay ventas registradas para esa semana y año.
        </p>
      </div>
    );
  }

  const labels = data.map((d) => d.dia);
  const values = data.map((d) => Number(d.total || 0));

  const chartData = {
    labels,
    datasets: [
      {
        label: "Ventas ($)",
        data: values,
        borderWidth: 2,
        tension: 0.3,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: true },
      tooltip: { enabled: true },
    },
  };

  return (
    <div>
      <div className="d-flex gap-2 mb-3">
        <input
          type="number"
          placeholder="Semana"
          className="form-control"
          min="1"
          max="52"
          value={semana}
          onChange={(e) => setSemana(e.target.value)}
        />
        <input
          type="number"
          placeholder="Año"
          className="form-control"
          value={anio}
          onChange={(e) => setAnio(e.target.value)}
        />
      </div>

      <Line data={chartData} options={options} />
    </div>
  );
}
