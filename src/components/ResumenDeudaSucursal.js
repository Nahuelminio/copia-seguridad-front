import React, { useEffect, useState } from "react";
import axios from "../utils/axiosInstance";

function ResumenDeudasSucursal() {
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCargando(true);
    axios
      .get("/resumen-pagos-sucursal")
      .then((res) => setResumen(res.data))
      .catch((err) => {
        console.error("❌ Error al obtener resumen de deuda:", err);
        setResumen(null);
      })
      .finally(() => setCargando(false));
  }, []);

  if (cargando) {
    return <div className="alert alert-info mt-3">Cargando deuda...</div>;
  }

  if (!resumen) {
    return (
      <div className="alert alert-warning mt-3">
        No se pudo cargar la información de deuda.
      </div>
    );
  }

  const facturado = Number(resumen.total_facturado || 0);
  const pagado = Number(resumen.total_pagado || 0);
  const deuda = facturado - pagado;
  const porcentaje = facturado > 0 ? (pagado / facturado) * 100 : 0;

  return (
    <div className="card p-3 p-md-4 mt-3 shadow-sm">
      <h5 className="mb-3 text-center">Estado de Deuda</h5>
      <div className="table-responsive">
        <table className="table table-bordered table-striped text-center align-middle">
          <thead className="table-dark">
            <tr>
              <th>Sucursal</th>
              <th>Facturado</th>
              <th>Pagado</th>
              <th>Deuda</th>
              <th>% Pagado</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{resumen.sucursal}</td>
              <td>
                $
                {facturado.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td>
                $
                {pagado.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td
                className={
                  deuda <= 0
                    ? "bg-success text-white fw-bold"
                    : "bg-danger text-white fw-bold"
                }
              >
                $
                {deuda.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                {deuda <= 0 && " ✅"}
              </td>
              <td
                className={
                  porcentaje === 100
                    ? "text-success fw-bold"
                    : porcentaje >= 50
                    ? "text-warning fw-bold"
                    : "text-danger fw-bold"
                }
              >
                {porcentaje.toFixed(1)}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ResumenDeudasSucursal;
