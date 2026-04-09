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

  const fmt = (n) =>
    n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const cardBase = {
    background: "#111827",
    borderRadius: "10px",
    borderTop: "3px solid",
  };

  return (
    <div className="mt-2 mb-4">
      <p className="text-white-50 text-center small mb-3 text-uppercase" style={{ letterSpacing: "1px" }}>
        Estado de Deuda — {resumen.sucursal}
      </p>
      <div className="row g-3">
        <div className="col-6 col-md-3">
          <div className="card text-center shadow h-100 border-0" style={{ ...cardBase, borderTopColor: "#6c757d" }}>
            <div className="card-body py-3">
              <div className="text-white-50 small mb-2 text-uppercase" style={{ letterSpacing: "0.5px", fontSize: "0.7rem" }}>Facturado</div>
              <div className="fw-bold text-white" style={{ fontSize: "1.15rem" }}>${fmt(facturado)}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card text-center shadow h-100 border-0" style={{ ...cardBase, borderTopColor: "#198754" }}>
            <div className="card-body py-3">
              <div className="text-white-50 small mb-2 text-uppercase" style={{ letterSpacing: "0.5px", fontSize: "0.7rem" }}>Pagado</div>
              <div className="fw-bold text-success" style={{ fontSize: "1.15rem" }}>${fmt(pagado)}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card text-center shadow h-100 border-0" style={{ ...cardBase, borderTopColor: deuda <= 0 ? "#198754" : "#dc3545", background: deuda <= 0 ? "#0f3d24" : "#3d0f0f" }}>
            <div className="card-body py-3">
              <div className="text-white-50 small mb-2 text-uppercase" style={{ letterSpacing: "0.5px", fontSize: "0.7rem" }}>Deuda</div>
              <div className="fw-bold text-white" style={{ fontSize: "1.15rem" }}>
                ${fmt(deuda)} {deuda <= 0 && "✅"}
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card text-center shadow h-100 border-0" style={{ ...cardBase, borderTopColor: porcentaje === 100 ? "#198754" : porcentaje >= 50 ? "#ffc107" : "#dc3545" }}>
            <div className="card-body py-3">
              <div className="text-white-50 small mb-2 text-uppercase" style={{ letterSpacing: "0.5px", fontSize: "0.7rem" }}>% Pagado</div>
              <div className="fw-bold" style={{ fontSize: "1.15rem", color: porcentaje === 100 ? "#198754" : porcentaje >= 50 ? "#ffc107" : "#dc3545" }}>
                {porcentaje.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResumenDeudasSucursal;
