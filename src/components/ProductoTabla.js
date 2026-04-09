import React from "react";

const thStyle = {
  color: "#64748b",
  fontWeight: 600,
  fontSize: "0.72rem",
  letterSpacing: "0.8px",
  textTransform: "uppercase",
  padding: "10px 14px",
  borderBottom: "1px solid #1e293b",
  background: "#111827",
};

const tdStyle = {
  padding: "10px 14px",
  fontSize: "0.88rem",
  borderBottom: "1px solid #0f1929",
  verticalAlign: "middle",
};

function ProductoTabla({ productos, onEliminar, onEditar, esAdmin }) {
  return (
    <div
      className="shadow-sm mt-4"
      style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #1e293b" }}
    >
      {/* Header */}
      <div
        className="d-flex justify-content-between align-items-center px-4 py-3"
        style={{ background: "#111827", borderBottom: "1px solid #1e293b" }}
      >
        <span style={{ color: "#f1f5f9", fontWeight: 600, fontSize: "0.95rem" }}>
          Productos cargados
        </span>
        <span
          style={{
            background: "#1e293b",
            color: "#94a3b8",
            fontWeight: 500,
            fontSize: "0.78rem",
            borderRadius: 20,
            padding: "3px 12px",
          }}
        >
          {productos.length} productos
        </span>
      </div>

      {productos.length === 0 ? (
        <p style={{ color: "#64748b", padding: "16px", marginBottom: 0, fontSize: "0.88rem" }}>
          No hay productos que coincidan con los filtros.
        </p>
      ) : (
        <div className="table-responsive">
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}
          >
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: "center" }}>#</th>
                <th style={thStyle}>Producto</th>
                <th style={thStyle}>Gusto</th>
                <th style={thStyle}>Sucursal</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Stock</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Precio</th>
                {esAdmin && (
                  <th style={{ ...thStyle, textAlign: "center" }}>Acciones</th>
                )}
              </tr>
            </thead>
            <tbody>
              {productos.map((p, i) => (
                <tr
                  key={i}
                  style={{ background: i % 2 === 0 ? "#0d1526" : "#0a1120" }}
                >
                  <td style={{ ...tdStyle, textAlign: "center", color: "#334155" }}>
                    {p.gusto_id}
                  </td>
                  <td style={{ ...tdStyle, color: "#e2e8f0" }}>{p.producto_nombre}</td>
                  <td style={{ ...tdStyle, color: "#cbd5e1" }}>{p.gusto}</td>
                  <td style={{ ...tdStyle, color: "#94a3b8" }}>{p.sucursal}</td>
                  <td style={{ ...tdStyle, textAlign: "center", fontWeight: 600 }}>
                    <span
                      style={{
                        color:
                          p.stock === 0
                            ? "#f87171"
                            : p.stock <= 3
                            ? "#fbbf24"
                            : "#6ee7a0",
                        background:
                          p.stock === 0
                            ? "rgba(248,113,113,0.08)"
                            : p.stock <= 3
                            ? "rgba(251,191,36,0.08)"
                            : "rgba(110,231,160,0.08)",
                        borderRadius: 6,
                        padding: "2px 10px",
                        fontSize: "0.82rem",
                      }}
                    >
                      {p.stock}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center", color: "#e2e8f0" }}>
                    ${parseFloat(p.precio).toFixed(2)}
                  </td>
                  {esAdmin && (
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      <div className="d-flex justify-content-center gap-2">
                        <button
                          style={{
                            background: "#1e293b",
                            color: "#93c5fd",
                            border: "1px solid #1e3a5f",
                            borderRadius: 6,
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            padding: "4px 12px",
                            cursor: "pointer",
                          }}
                          onClick={() => onEditar(p)}
                        >
                          Editar
                        </button>
                        <button
                          style={{
                            background: "rgba(248,113,113,0.08)",
                            color: "#f87171",
                            border: "1px solid rgba(248,113,113,0.2)",
                            borderRadius: 6,
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            padding: "4px 12px",
                            cursor: "pointer",
                          }}
                          onClick={() => {
                            if (window.confirm("¿Eliminar este gusto?"))
                              onEliminar(p.gusto_id);
                          }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ProductoTabla;
