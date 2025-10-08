import React, { useEffect, useState } from "react";
import axios from "axios";
import Loader from "../components/Loader";
import { jwtDecode } from "jwt-decode";

function HistorialVentas() {
  const [ventas, setVentas] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [sucursalId, setSucursalId] = useState("");
  const [cargando, setCargando] = useState(true);
  const [nombreSucursal, setNombreSucursal] = useState("");

  const API = process.env.REACT_APP_API_URL;

  // Obtener rol y sucursal desde token
  const token = localStorage.getItem("token");
  const decoded = token ? jwtDecode(token) : {};
  const rol = decoded?.rol?.toLowerCase();
  const esAdmin = rol === "admin";
  const esSucursal = rol === "sucursal";
  const sucursalUsuario = decoded?.sucursalId;

  // Si es sucursal, fijar su ID automáticamente
  useEffect(() => {
    if (esSucursal && sucursalUsuario) {
      setSucursalId(sucursalUsuario);
    }
  }, [esSucursal, sucursalUsuario]);

  // Cargar lista de sucursales si es admin
  useEffect(() => {
    if (esAdmin) {
      axios
        .get(`${API}/sucursales`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        .then((res) => setSucursales(res.data))
        .catch(() => alert("Error al cargar sucursales"));
    }
  }, [API, esAdmin, token]);

  // Cargar historial de ventas
  useEffect(() => {
    setCargando(true);

    const url = sucursalId
      ? `${API}/historial?sucursal_id=${sucursalId}`
      : `${API}/historial`;

    axios
      .get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => {
        setVentas(res.data);
        if (esSucursal && res.data.length > 0) {
          setNombreSucursal(res.data[0].sucursal);
        }
      })
      .catch(() => alert("Error al obtener historial de ventas"))
      .finally(() => setCargando(false));
  }, [API, sucursalId, esSucursal, token]);

  const resumen = ventas.reduce(
    (acc, venta) => {
      acc.porSucursal[venta.sucursal] =
        (acc.porSucursal[venta.sucursal] || 0) + venta.cantidad;

      const totalVenta = venta.precio * venta.cantidad;
      acc.total += totalVenta;
      return acc;
    },
    { porSucursal: {}, total: 0 }
  );

  const sucursalTop = Object.entries(resumen.porSucursal).sort(
    (a, b) => b[1] - a[1]
  )[0];

  return (
    <div className="container mt-5">
      <h2>
        📋 Historial de Ventas{" "}
        {esSucursal && nombreSucursal ? `- ${nombreSucursal}` : ""}
      </h2>

      {esAdmin && (
        <div className="row mb-3">
          <div className="col-md-4">
            <label className="form-label">🏬 Filtrar por sucursal</label>
            <select
              className="form-select"
              value={sucursalId}
              onChange={(e) => setSucursalId(e.target.value)}
            >
              <option value="">Todas</option>
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {cargando ? (
        <Loader mensaje="Cargando historial de ventas..." />
      ) : (
        <>
          <table className="table table-sm table-striped align-middle table-bordered border-dark">
            <thead className="table-dark">
              <tr>
                <th className="text-center">Fecha</th>
                <th className="text-center">Sucursal</th>
                <th className="text-center">Producto</th>
                <th className="text-center">Gusto</th>
                <th className="text-center">Cantidad</th>
                <th className="text-center">Precio</th>
                <th className="text-center">Total</th>
              </tr>
            </thead>
            <tbody>
              {ventas.map((v) => (
                <tr key={v.id}>
                  <td className="text-center">
                    {new Date(v.fecha).toLocaleString()}
                  </td>
                  <td className="text-center">{v.sucursal}</td>
                  <td className="text-center">{v.producto}</td>
                  <td className="text-center">{v.gusto}</td>
                  <td className="text-center">{v.cantidad}</td>
                  <td className="text-center">
                    ${Number(v.precio || 0).toFixed(2)}
                  </td>
                  <td className="text-center">
                    ${(Number(v.precio || 0) * v.cantidad).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

        </>
      )}
    </div>
  );
}

export default HistorialVentas;
