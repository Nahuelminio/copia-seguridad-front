import React, { useEffect, useState } from "react";
import axios from "../utils/axiosInstance"; // ✅ Usar la instancia con token

function HistorialReposiciones() {
  const [reposiciones, setReposiciones] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [filtroSucursal, setFiltroSucursal] = useState("");
  const [filtroProducto, setFiltroProducto] = useState("");
  const [filtroGusto, setFiltroGusto] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  useEffect(() => {
    axios
      .get("/sucursales")
      .then((res) => setSucursales(res.data))
      .catch(() => alert("❌ Error al cargar sucursales"));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();

    if (filtroSucursal) params.append("sucursal_id", filtroSucursal);
    if (filtroProducto) params.append("producto", filtroProducto);
    if (filtroGusto) params.append("gusto", filtroGusto);
    if (fechaInicio) params.append("fecha_inicio", fechaInicio);
    if (fechaFin) params.append("fecha_fin", fechaFin);

    axios
      .get(`/historial-reposiciones?${params.toString()}`)
      .then((res) => setReposiciones(res.data))
      .catch(() => alert("❌ Error al cargar historial de reposiciones"));
  }, [filtroSucursal, filtroProducto, filtroGusto, fechaInicio, fechaFin]);

  return (
    <div className="container mt-5">
      <h2>📦 Historial de Reposiciones</h2>

      <div className="row mb-3">
        <div className="col-md-3">
          <label className="form-label">🏬 Filtrar por sucursal</label>
          <select
            className="form-select"
            value={filtroSucursal}
            onChange={(e) => setFiltroSucursal(e.target.value)}
          >
            <option value="">Todas</option>
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="col-md-3">
          <label className="form-label">🧃 Filtrar por producto</label>
          <input
            type="text"
            className="form-control"
            value={filtroProducto}
            onChange={(e) => setFiltroProducto(e.target.value)}
          />
        </div>

        <div className="col-md-3">
          <label className="form-label">🍭 Filtrar por gusto</label>
          <input
            type="text"
            className="form-control"
            value={filtroGusto}
            onChange={(e) => setFiltroGusto(e.target.value)}
          />
        </div>

        <div className="col-md-3">
          <label className="form-label">📅 Desde</label>
          <input
            type="date"
            className="form-control"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
          />
        </div>

        <div className="col-md-3 mt-3">
          <label className="form-label">📅 Hasta</label>
          <input
            type="date"
            className="form-control"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
          />
        </div>
      </div>

      <table className="table table-sm table-bordered table-striped">
        <thead className="table-dark">
          <tr>
            <th className="text-center">📅 Fecha</th>
            <th className="text-center">🏬 Sucursal</th>
            <th className="text-center">🧃 Producto</th>
            <th className="text-center">🍭 Gusto</th>
            <th className="text-center">🔢 Cantidad repuesta</th>
          </tr>
        </thead>
        <tbody>
          {reposiciones.length === 0 ? (
            <tr>
              <td colSpan="5" className="text-center">
                No hay reposiciones encontradas.
              </td>
            </tr>
          ) : (
            reposiciones.map((r) => (
              <tr key={r.id}>
                <td className="text-center">
                  {new Date(r.fecha).toLocaleString()}
                </td>
                <td className="text-center">{r.sucursal}</td>
                <td className="text-center">{r.producto}</td>
                <td className="text-center">{r.gusto}</td>
                <td className="text-center">{r.cantidad}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default HistorialReposiciones;
