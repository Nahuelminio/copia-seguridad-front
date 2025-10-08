import React, { useEffect, useState } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

function ReposicionRapida() {
  const [gustos, setGustos] = useState([]);
  const [gustoId, setGustoId] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [sucursalNombre, setSucursalNombre] = useState("");

  const API = process.env.REACT_APP_API_URL;
  const token = localStorage.getItem("token");
  const decoded = token ? jwtDecode(token) : null;
  const sucursalId = decoded?.sucursalId;

  // Obtener gustos disponibles para esta sucursal
  useEffect(() => {
    if (!sucursalId || !token) return;

    axios
      .get(`${API}/productos/disponibles?sucursal_id=${sucursalId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setGustos(res.data))
      .catch(() => alert("Error al obtener productos"));

    axios
      .get(`${API}/sucursales`)
      .then((res) => {
        const sucursal = res.data.find((s) => s.id === sucursalId);
        if (sucursal) setSucursalNombre(sucursal.nombre);
      })
      .catch(() => {});
  }, [API, sucursalId, token]); // ✅ dependencias completas

  const enviar = (e) => {
    e.preventDefault();
    if (!gustoId || cantidad < 1) {
      alert("Completá todos los campos");
      return;
    }

    axios
      .post(
        `${API}/productos/reposicion-rapida`,
        {
          gusto_id: gustoId,
          cantidad: parseInt(cantidad),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      .then(() => {
        alert("✅ Reposición rápida realizada");
        setCantidad(1);
        setGustoId("");
      })
      .catch(() => alert("❌ Error al hacer reposición"));
  };

  return (
    <div className="container mt-4">
      <h2>🚚 Reposición Rápida</h2>
      <p className="text-muted">
        Sucursal actual: <strong>{sucursalNombre || sucursalId}</strong>
      </p>

      <form onSubmit={enviar} className="row g-3">
        <div className="col-md-6">
          <label className="form-label">🧃 Producto - Gusto</label>
          <select
            className="form-select"
            value={gustoId}
            onChange={(e) => setGustoId(e.target.value)}
          >
            <option value="">Seleccionar</option>
            {gustos.map((g) => (
              <option key={g.gusto_id} value={g.gusto_id}>
                {g.producto_nombre} - {g.gusto}
              </option>
            ))}
          </select>
        </div>

        <div className="col-md-3">
          <label className="form-label">🔢 Cantidad</label>
          <input
            type="number"
            className="form-control"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            min="1"
          />
        </div>

        <div className="col-md-3 d-flex align-items-end">
          <button className="btn btn-success w-100">Reponer</button>
        </div>
      </form>
    </div>
  );
}

export default ReposicionRapida;
