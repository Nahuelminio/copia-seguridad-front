import React from "react";

function ProductoTabla({ productos, onEliminar, onEditar, esAdmin }) {
  return (
    <div className="card p-4">
      <h4>📋 Productos cargados</h4>
      {productos.length === 0 ? (
        <p>No hay productos cargados.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm table-striped align-middle text-nowrap table-bordered border-dark ">
            <thead className="table-dark">
              <tr>
                <th className="text-center">#</th>
                <th>Producto</th>
                <th>Gusto</th>
                <th>Sucursal</th>
                <th className="text-center">Stock</th>
                <th>Precio</th>
                {esAdmin && <th className="text-center">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {productos.map((p, i) => (
                <tr key={i}>
                  <td className="text-center">{p.gusto_id}</td>
                  <td>{p.producto_nombre}</td>
                  <td>{p.gusto}</td>
                  <td>{p.sucursal}</td>
                  <td className="text-center">{p.stock}</td>
                  <td className="text-center">
                    ${parseFloat(p.precio).toFixed(2)}
                  </td>

                  {esAdmin && (
                    <td className="text-center">
                      <div className="d-flex justify-content-center gap-2">
                        <button
                          className="btn btn-dark btn-sm"
                          onClick={() => onEditar(p)}
                        >
                          ✏️
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => {
                            if (window.confirm("¿Eliminar este gusto?")) {
                              onEliminar(p.gusto_id);
                            }
                          }}
                        >
                          🗑️
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
