import React, { useEffect, useState, useMemo } from "react";
import axios from "../utils/axiosInstance";
import { getUsuario } from "../utils/auth";

export default function HistorialPagos() {
  // Memoizamos usuario para evitar que cambie referencia en cada render
  const usuario = useMemo(() => getUsuario(), []);
  const esAdmin = usuario?.rol === "admin";

  const [pagos, setPagos] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [filtros, setFiltros] = useState(null);
  const [sucursalesCargadas, setSucursalesCargadas] = useState(false);

  // Función para cargar sucursales
  const loadSucursales = async () => {
    try {
      if (esAdmin) {
        const res = await axios.get("/sucursales");
        setSucursales(res.data);
      } else if (usuario?.sucursalId) {
        const res = await axios.get(`/sucursales/${usuario.sucursalId}`);
        setSucursales([{ id: res.data.id, nombre: res.data.nombre }]);
      }
    } catch (error) {
      if (!error.response) {
        console.error("❤️‍🔥 Network Error:", error.message);
      } else {
        console.error(
          "💔 Error status:",
          error.response.status,
          error.response.data
        );
      }
    } finally {
      setSucursalesCargadas(true);
    }
  };

  // Inicializamos filtros y cargamos sucursales solo una vez al montar
  useEffect(() => {
    const iniciales = {
      sucursal_id: esAdmin ? "" : usuario?.sucursalId || "",
      fecha_inicio: "",
      fecha_fin: "",
    };
    setFiltros(iniciales);
    loadSucursales();
  }, []);

  // Cargamos pagos automáticamente cuando filtros y sucursales estén listos
  useEffect(() => {
    if (sucursalesCargadas && filtros) {
      cargarPagos();
    }
  }, [sucursalesCargadas, filtros]);

  const cargarPagos = async () => {
    try {
      const params = { ...filtros };
      const res = await axios.get("/historial-pagos", { params });
      setPagos(res.data);
    } catch (error) {
      if (!error.response) {
        console.error("❤️‍🔥 Network Error al cargar pagos:", error.message);
      } else {
        console.error(
          "💔 Error status al cargar pagos:",
          error.response.status,
          error.response.data
        );
      }
      alert("❌ Error al cargar historial de pagos");
    }
  };

  const handleChange = (e) => {
    setFiltros((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleBuscar = (e) => {
    e.preventDefault();
    cargarPagos();
  };

  if (!filtros) return null;

  return (
    <div className="container mt-4">
      <h3 className="mb-4 text-center">💰 Historial de Pagos</h3>

      <form onSubmit={handleBuscar} className="row g-3 mb-4">
        {esAdmin && (
          <div className="col-12 col-sm-6 col-md-3">
            <label className="form-label">Sucursal</label>
            <select
              className="form-select"
              name="sucursal_id"
              value={filtros.sucursal_id}
              onChange={handleChange}
            >
              <option value="">Todas</option>
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="col-12 col-sm-6 col-md-3">
          <label className="form-label">Desde</label>
          <input
            type="date"
            name="fecha_inicio"
            className="form-control"
            value={filtros.fecha_inicio}
            onChange={handleChange}
          />
        </div>

        <div className="col-12 col-sm-6 col-md-3">
          <label className="form-label">Hasta</label>
          <input
            type="date"
            name="fecha_fin"
            className="form-control"
            value={filtros.fecha_fin}
            onChange={handleChange}
          />
        </div>

        <div className="col-12 col-sm-6 col-md-3 d-flex align-items-end">
          <button type="submit" className="btn button-filtros w-100">
            Buscar
          </button>
        </div>
      </form>

      {!esAdmin && sucursales.length > 0 && (
        <p className="text-success text-center mb-4">
          ✅ Estás viendo el historial de pagos de tu sucursal:{" "}
          <strong>{sucursales[0].nombre}</strong>
        </p>
      )}

      <div className="table-responsive">
        <table className="table table-striped table-hover">
          <thead className="table-light">
            <tr>
              <th>#</th>
              <th>Sucursal</th>
              <th>Método</th>
              <th>Monto</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {pagos.map((pago) => (
              <tr key={pago.id}>
                <td>{pago.id}</td>
                <td>{pago.sucursal}</td>
                <td>{pago.metodo}</td>
                <td>${parseFloat(pago.monto).toFixed(2)}</td>
                <td>{new Date(pago.fecha).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
