import React, { useState } from "react";
import TablaValorStockSucursal from "../components/TablaValorStockSucursal";
import ResumenFinancieroSucursal from "../components/ResumenFinancieroSucursal";
import VentasMensuales from "../components/VentasMensuales";
import FormularioPagoSucursal from "../components/FormularioPagoSucursal";
import ProductoEditorMasivo from "./ProductoEditorMasivo";
import RankingProductosModal from "../components/estadisticas/RankingProductosModal";

function AdminDashboard() {
  const [recargarResumen, setRecargarResumen] = useState(false);
  const [mostrarEditorMasivo, setMostrarEditorMasivo] = useState(false);

  const manejarPagoExitoso = () => setRecargarResumen((prev) => !prev);

  const abrirModalPago = () => {
    const modalEl = document.getElementById("modalPago");
    if (modalEl) {
      setTimeout(() => {
        new window.bootstrap.Modal(modalEl).show();
      }, 100);
    }
  };

  const abrirModalRanking = () => {
    const modalEl = document.getElementById("modalRankingProductos");
    if (modalEl) {
      setTimeout(() => {
        new window.bootstrap.Modal(modalEl).show();
      }, 100);
    } else {
      console.log("❌ No se encontró el modal");
    }
  };

  return (
    <div className="container-fluid mt-4 px-3 mb-4">
      <h2 className="mb-4 text-center fs-3">Panel de Administración</h2>

      {/* 🔹 MODAL: Registrar nuevo pago */}
      <div
        className="modal fade"
        id="modalPago"
        tabIndex="-1"
        aria-labelledby="modalPagoLabel"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="modalPagoLabel">
                ➕ Registrar nuevo pago
              </h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Cerrar"
              ></button>
            </div>
            <div className="modal-body">
              <FormularioPagoSucursal onPagoExitoso={manejarPagoExitoso} />
            </div>
          </div>
        </div>
      </div>

      {/* 🔘 Botones superiores */}
      <div className="row mt-4 mb-4 justify-content-center">
        <div className="col-12 col-md-6 text-center mb-3">
          <button
            className="btn btn-outline-secondary w-100"
            onClick={abrirModalPago}
          >
            ➕ Registrar nuevo pago
          </button>
        </div>

        <div className="col-12 col-md-6 text-center mb-3">
          <button
            className="btn btn-outline-secondary w-100"
            onClick={abrirModalRanking}
          >
            📈 Ver ranking de productos
          </button>
        </div>
      </div>

      {/* 🔹 Ventas mensuales + resumen financiero */}
      <div className="row g-4">
        <div className="col-12 col-lg-6">
          <div className="card p-3 h-100">
            <h5 className="text-center mb-3">🗓️ Ventas Mensuales</h5>
            <VentasMensuales />
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="card p-3 h-100">
            <h5 className="text-center mb-3">📦 Stock y Resumen Financiero</h5>
            <TablaValorStockSucursal />
            <ResumenFinancieroSucursal recargar={recargarResumen} />
          </div>
        </div>
      </div>

      {/* 🔧 Edición masiva */}
      <button
        className="btn btn-outline-info mb-3 mt-4 w-100"
        onClick={() => setMostrarEditorMasivo(true)}
      >
        Edición Masiva
      </button>

      <ProductoEditorMasivo
        show={mostrarEditorMasivo}
        onClose={() => setMostrarEditorMasivo(false)}
      />

      {/* ✅ Ranking de productos (modal renderizado una sola vez) */}
      <RankingProductosModal />
    </div>
  );
}

export default AdminDashboard;
