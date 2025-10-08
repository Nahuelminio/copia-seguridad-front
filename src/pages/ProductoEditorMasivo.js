import React, { useEffect, useState } from "react";
import axios from "axios";
import { Modal, Button } from "react-bootstrap";
import { toast } from "react-toastify";

const ProductoEditorMasivo = ({ show, onClose }) => {
  const [productos, setProductos] = useState([]);
  const [filtro, setFiltro] = useState("");
  const API = process.env.REACT_APP_API_URL;

 useEffect(() => {
   if (!show) return; // ⛔ No hagas nada si el modal está cerrado

   const fetchProductos = async () => {
     try {
       const res = await axios.get(`${API}/`, {
         headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
       });
       const productosConDefault = res.data.map((p) => ({
         ...p,
         stock: p.stock ?? 0,
         precio: p.precio ?? 0,
         codigo_barra: p.codigo_barra ?? "",
       }));
       setProductos(productosConDefault);
     } catch (error) {
       console.error("❌ Error al cargar productos:", error);
     }
   };

   fetchProductos(); // ✅ Ejecutar solo cuando `show === true`
 }, [show]);


  const handleChange = (gusto_id, sucursal_id, campo, valor) => {
    setProductos((prev) =>
      prev.map((p) =>
        p.gusto_id === gusto_id && p.sucursal_id === sucursal_id
          ? { ...p, [campo]: valor }
          : p
      )
    );
  };

  const guardarCambios = async () => {
    const cambios = productos
      .filter(
        (p) => !p.codigo_barra || /^[0-9]{5,20}$/.test(p.codigo_barra.trim())
      )
      .map((p) => ({
        gusto_id: p.gusto_id,
        sucursal_id: p.sucursal_id,
        cantidad: parseInt(p.stock),
        precio: parseFloat(p.precio),
        codigo_barra: p.codigo_barra?.trim() || null,
      }));

    try {
      await axios.post(
        `${API}/actualizar-stock-precio`,
        { actualizaciones: cambios },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      toast.success("✅ Cambios guardados correctamente");
    } catch (err) {
      console.error("Error al guardar cambios:", err);
      toast.error("❌ Error al guardar cambios");
    }
  };

  return (
    <Modal show={show} onHide={onClose} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>Edición Masiva de Productos</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="row mb-3">
          <div className="col-md-4">
            <input
              type="text"
              className="form-control"
              placeholder="🔍 Filtrar por producto"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-bordered table-sm">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Gusto</th>
                <th>Sucursal</th>
                <th>Stock</th>
                <th>Precio</th>
                <th>Código de Barras</th>
              </tr>
            </thead>
            <tbody>
              {productos
                .filter((p) =>
                  p.producto_nombre.toLowerCase().includes(filtro.toLowerCase())
                )
                .map((p) => {
                  const esDuplicadoVisual = productos.some(
                    (item) =>
                      item !== p &&
                      item.producto_nombre === p.producto_nombre &&
                      item.gusto === p.gusto &&
                      item.codigo_barra === p.codigo_barra &&
                      item.codigo_barra !== ""
                  );

                  const claseBarra =
                    p.codigo_barra === ""
                      ? "bg-secondary text-white"
                      : esDuplicadoVisual
                      ? "bg-warning"
                      : "";

                  return (
                    <tr key={`${p.gusto_id}-${p.sucursal_id}`}>
                      <td>{p.producto_nombre}</td>
                      <td>{p.gusto}</td>
                      <td>{p.sucursal}</td>
                      <td>
                        <input
                          type="number"
                          value={p.stock}
                          onChange={(e) =>
                            handleChange(
                              p.gusto_id,
                              p.sucursal_id,
                              "stock",
                              e.target.value
                            )
                          }
                          className="form-control"
                          min="0"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={p.precio}
                          onChange={(e) =>
                            handleChange(
                              p.gusto_id,
                              p.sucursal_id,
                              "precio",
                              e.target.value
                            )
                          }
                          className="form-control"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={p.codigo_barra}
                          onChange={(e) =>
                            handleChange(
                              p.gusto_id,
                              p.sucursal_id,
                              "codigo_barra",
                              e.target.value
                            )
                          }
                          className={`form-control ${claseBarra}`}
                          maxLength={20}
                        />
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
        <Button variant="dark" onClick={guardarCambios}>
          Guardar todos los cambios
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ProductoEditorMasivo;
