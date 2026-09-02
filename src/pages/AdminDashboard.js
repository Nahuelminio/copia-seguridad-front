import React, { useState } from "react";
import TablaValorStockSucursal from "../components/TablaValorStockSucursal";
import ResumenFinancieroSucursal from "../components/ResumenFinancieroSucursal";
import DeudaVendedores from "../components/DeudaVendedores";
import VentasMensuales from "../components/VentasMensuales";
import FormularioPagoSucursal from "../components/FormularioPagoSucursal";
import ProductoEditorMasivo from "./ProductoEditorMasivo";
import RankingProductosModal from "../components/estadisticas/RankingProductosModal";
import ResumenCostosCentral from "../components/ResumenCostosCentral";
import KpisHoy from "../components/KpisHoy";
import RevisionComprobantes from "../components/RevisionComprobantes";

const cardStyle = {
  background: "#111827",
  border: "1px solid #1e293b",
  borderRadius: 12,
  padding: "24px",
};

const sectionLabelStyle = {
  color: "#64748b",
  fontSize: "0.72rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: 16,
};

function AdminDashboard() {
  const [recargarResumen, setRecargarResumen] = useState(false);
  const [mostrarEditorMasivo, setMostrarEditorMasivo] = useState(false);

  const manejarPagoExitoso = () => setRecargarResumen((prev) => !prev);

  const abrirModal = (id) => {
    const modalEl = document.getElementById(id);
    if (modalEl && window.bootstrap?.Modal) {
      setTimeout(() => new window.bootstrap.Modal(modalEl).show(), 100);
    }
  };

  const acciones = [
    { label: "Registrar nuevo pago", onClick: () => abrirModal("modalPago"), accent: "#10b981" },
    { label: "Ver ranking de productos", onClick: () => abrirModal("modalRankingProductos"), accent: "#6366f1" },
    { label: "Edición masiva de productos", onClick: () => setMostrarEditorMasivo(true), accent: "#3b82f6" },
  ];

  return (
    <div className="container-fluid mt-4 px-3 mb-5">
      {/* Header */}
      <div className="mb-4">
        <h4 style={{ color: "#f1f5f9", fontWeight: 700, marginBottom: 4 }}>
          Panel de Administración
        </h4>
        <p style={{ color: "#64748b", fontSize: "0.85rem", margin: 0 }}>
          Control de ventas, pagos, stock y rendimiento por sucursal.
        </p>
      </div>

      {/* KPIs del día */}
      <KpisHoy />

      {/* Acciones */}
      <div className="row g-3 mb-4">
        {acciones.map(({ label, onClick, accent }) => (
          <div className="col-12 col-md-4" key={label}>
            <button
              className="w-100"
              onClick={onClick}
              style={{
                background: "#111827",
                border: `1px solid ${accent}40`,
                borderRadius: 9,
                color: accent,
                fontWeight: 600,
                fontSize: "0.88rem",
                padding: "11px 0",
                cursor: "pointer",
                transition: "background 0.15s, border-color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${accent}12`;
                e.currentTarget.style.borderColor = accent;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#111827";
                e.currentTarget.style.borderColor = `${accent}40`;
              }}
            >
              {label}
            </button>
          </div>
        ))}
      </div>

      {/* Comprobantes esperando aprobación */}
      <div className="row mb-4">
        <div className="col-12">
          <div style={cardStyle}>
            <p style={sectionLabelStyle}>Comprobantes por aprobar</p>
            <RevisionComprobantes onAprobado={manejarPagoExitoso} />
          </div>
        </div>
      </div>

      {/* Ventas + Resumen financiero */}
      <div className="row g-4 mb-4">
        <div className="col-12 col-lg-6">
          <div style={cardStyle}>
            <p style={sectionLabelStyle}>Ventas mensuales</p>
            <VentasMensuales />
          </div>
        </div>
        <div className="col-12 col-lg-6">
          <div style={cardStyle}>
            <p style={sectionLabelStyle}>Resumen financiero por sucursal</p>
            <ResumenFinancieroSucursal recargar={recargarResumen} />
          </div>
        </div>
      </div>

      {/* Deuda de vendedores: va aparte porque sus pagos se guardan sin
          sucursal y el resumen por sucursal no los ve. */}
      <div className="row mb-4">
        <div className="col-12">
          <div style={cardStyle}>
            <p style={sectionLabelStyle}>Deuda por vendedor</p>
            <DeudaVendedores recargar={recargarResumen} />
          </div>
        </div>
      </div>

      {/* Costos Central */}
      <div className="row mb-4">
        <div className="col-12">
          <div style={cardStyle}>
            <p style={sectionLabelStyle}>Costos Central — mes actual</p>
            <ResumenCostosCentral />
          </div>
        </div>
      </div>

      {/* Stock */}
      <div className="row">
        <div className="col-12">
          <div style={cardStyle}>
            <p style={sectionLabelStyle}>Valor de stock por sucursal</p>
            <TablaValorStockSucursal />
          </div>
        </div>
      </div>

      {/* Modal: Registrar nuevo pago */}
      <div className="modal fade" id="modalPago" tabIndex="-1" aria-labelledby="modalPagoLabel" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content" style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 14 }}>
            <div className="modal-header" style={{ borderBottom: "1px solid #1e293b" }}>
              <h5 className="modal-title" id="modalPagoLabel" style={{ color: "#f1f5f9", fontWeight: 600 }}>
                Registrar nuevo pago
              </h5>
              <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Cerrar" />
            </div>
            <div className="modal-body">
              <FormularioPagoSucursal onPagoExitoso={manejarPagoExitoso} />
            </div>
          </div>
        </div>
      </div>

      <ProductoEditorMasivo show={mostrarEditorMasivo} onClose={() => setMostrarEditorMasivo(false)} />
      <RankingProductosModal />
    </div>
  );
}

export default AdminDashboard;
