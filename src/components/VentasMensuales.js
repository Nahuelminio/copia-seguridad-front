import React, { useEffect, useMemo, useState } from "react";
import axios from "../utils/axiosInstance"; // ✅ Usa axios con token
import VentasPorMesSucursal from "./VentasPorMesSucursal"; // (por si querés usarlo)

function VentasMensuales() {
  const [ventas, setVentas] = useState([]);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [mayorSucursal, setMayorSucursal] = useState(null);
  const [cargando, setCargando] = useState(false);

  const cargarVentas = () => {
    setCargando(true);
    axios
      .get("/ventas-mensuales", { params: { mes, anio } })
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        setVentas(data);

        if (data.length > 0) {
          const max = data.reduce((a, b) =>
            Number(a.total_ventas) > Number(b.total_ventas) ? a : b
          );
          setMayorSucursal(max);
        } else {
          setMayorSucursal(null);
        }
      })
      .catch(() => alert("❌ Error al obtener ventas mensuales"))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargarVentas();
  }, [mes, anio]);

  // 🧮 KPIs / “cuadros”
  const totalGeneral = useMemo(
    () => ventas.reduce((acc, v) => acc + (Number(v.total_ventas) || 0), 0),
    [ventas]
  );

  const cantidadSucursales = ventas.length;
  const sucursalesConVenta = useMemo(
    () => ventas.filter((v) => Number(v.total_ventas) > 0).length,
    [ventas]
  );

  const nf = new Intl.NumberFormat("es-AR"); // 👉 si son cantidades; si es dinero, usá options con currency.

  return (
    <div className="container mt-4">
      <div className="d-flex align-items-center gap-3">
        <h2 className="m-0">Ventas Mensuales</h2>
        <button
          className="btn btn-outline-primary btn-sm"
          onClick={cargarVentas}
          disabled={cargando}
          title="Recargar"
        >
          {cargando ? "Actualizando..." : "Recargar"}
        </button>
      </div>

      {/* Filtros */}
      <div className="row mb-3 mt-2">
        <div className="col-6 col-md-3">
          <label className="form-label">Mes</label>
          <input
            type="number"
            min="1"
            max="12"
            className="form-control"
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
          />
        </div>
        <div className="col-6 col-md-3">
          <label className="form-label">Año</label>
          <input
            type="number"
            className="form-control"
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value))}
          />
        </div>
      </div>

      {/* 🔷 Cuadros/KPIs arriba */}
      <div className="row g-3 mb-3">
        <div className="col-12 col-md-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <small className="text-muted d-block">
                Total (todas las sucursales)
              </small>
              <div className="fs-3 fw-bold">{nf.format(totalGeneral)}</div>
              <div className="text-muted">
                Mes {mes} / {anio}
              </div>
            </div>
          </div>
        </div>

        <div className="col-6 col-md-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <small className="text-muted d-block">
                Sucursales con ventas
              </small>
              <div className="fs-3 fw-bold">
                {nf.format(sucursalesConVenta)}
              </div>
              <div className="text-muted">
                de {nf.format(cantidadSucursales)} reportadas
              </div>
            </div>
          </div>
        </div>

        <div className="col-6 col-md-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <small className="text-muted d-block">Top sucursal</small>
              {mayorSucursal ? (
                <>
                  <div className="fs-6 fw-semibold">
                    {mayorSucursal.sucursal}
                  </div>
                  <div className="fs-4 fw-bold">
                    {nf.format(mayorSucursal.total_ventas)}
                  </div>
                </>
              ) : (
                <div className="text-muted">—</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      {ventas.length === 0 ? (
        <p>No hay ventas registradas para este mes.</p>
      ) : (
        <>
          <table className="table table-bordered">
            <thead className="table-dark">
              <tr>
                <th>Sucursal</th>
                <th className="text-end">Total de Ventas</th>
              </tr>
            </thead>
            <tbody>
              {ventas.map((v, i) => (
                <tr key={i}>
                  <td>{v.sucursal}</td>
                  <td className="text-end">{nf.format(v.total_ventas)}</td>
                </tr>
              ))}
              {/* Fila de total general */}
              <tr className="table-light fw-bold">
                <td>Total general</td>
                <td className="text-end">{nf.format(totalGeneral)}</td>
              </tr>
            </tbody>
          </table>

          {mayorSucursal && (
            <div className="alert alert-success">
              🏆 La sucursal con más ventas fue{" "}
              <strong>{mayorSucursal.sucursal}</strong> con{" "}
              <strong>{nf.format(mayorSucursal.total_ventas)}</strong> ventas.
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default VentasMensuales;
