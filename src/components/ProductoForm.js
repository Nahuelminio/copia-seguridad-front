import React, { useEffect, useState } from "react";
import axios from "axios";

function ProductoForm({ modo, producto, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    nombre: "",
    gusto: "",
    sucursal_id: "",
    stock: 0,
    precio: "",
    codigo_barra: "",
  });

  const [sucursales, setSucursales] = useState([]);
  const [codigoError, setCodigoError] = useState("");

  const API = process.env.REACT_APP_API_URL;

  useEffect(() => {
    axios
      .get(`${API}/sucursales`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      .then((res) => setSucursales(res.data))
      .catch((err) => console.error("❌ Error al cargar sucursales", err));
  }, []);

  useEffect(() => {
    if (modo === "editar" && producto) {
      setForm({
        nombre: producto.producto_nombre || "",
        gusto: producto.gusto || "",
        sucursal_id: producto.sucursal_id || "",
        stock: producto.stock || 0,
        precio: producto.precio || "",
        codigo_barra: producto.codigo_barra || "",
      });
    } else {
      setForm({
        nombre: "",
        gusto: "",
        sucursal_id: "",
        stock: 0,
        precio: "",
        codigo_barra: "",
      });
    }
  }, [modo, producto]);

  const verificarCodigo = async (codigo) => {
    if (!codigo || !form.sucursal_id) {
      setCodigoError("");
      return;
    }

    try {
      const params = {
        codigo_barra: codigo,
        sucursal_id: form.sucursal_id,
      };

      if (modo === "editar" && producto?.gusto_id) {
        params.gusto_id = producto.gusto_id;
      }

      const res = await axios.get(`${API}/verificar-codigo`, {
        params,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (res.data.existe) {
        setCodigoError(
          "⚠️ Este código de barras ya está registrado en esta sucursal."
        );
      } else {
        setCodigoError("");
      }
    } catch (err) {
      console.error("❌ Error al verificar código:", err);
      setCodigoError("Error al verificar el código.");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (name === "codigo_barra") {
      verificarCodigo(value);
    }

    if (name === "sucursal_id" && form.codigo_barra) {
      verificarCodigo(form.codigo_barra);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCodigoError("");

    try {
      await onSubmit({
        nombre: form.nombre,
        gusto: form.gusto,
        sucursal_id: form.sucursal_id,
        stock: parseInt(form.stock),
        precio: parseFloat(form.precio),
        codigo_barra: form.codigo_barra || null,
      });

      if (modo !== "editar") {
        setForm({
          nombre: "",
          gusto: "",
          sucursal_id: "",
          stock: 0,
          precio: "",
          codigo_barra: "",
        });
      }
    } catch (error) {
      if (error.response?.data?.error?.includes("código de barras")) {
        setCodigoError(error.response.data.error);
      } else {
        alert("❌ Ocurrió un error al guardar el producto");
      }
    }
  };

  return (
    <div className="card p-4 mb-4 bg-transparent b-1 text-white">
      <form onSubmit={handleSubmit}>
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label">Nombre del producto</label>
            <input
              name="nombre"
              className="form-control"
              value={form.nombre}
              onChange={handleChange}
              required
            />
          </div>

          <div className="col-md-4">
            <label className="form-label">Gusto</label>
            <input
              name="gusto"
              className="form-control"
              value={form.gusto}
              onChange={handleChange}
              required
            />
          </div>

          <div className="col-md-4">
            <label className="form-label">Código de barras</label>
            <input
              name="codigo_barra"
              className={`form-control ${codigoError ? "is-invalid" : ""}`}
              value={form.codigo_barra}
              onChange={handleChange}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.preventDefault();
              }}
              placeholder="Ej: 7790000001234"
            />
            {codigoError && (
              <div className="invalid-feedback">{codigoError}</div>
            )}
          </div>

          <div className="col-md-2">
            <label className="form-label">Sucursal</label>
            <select
              name="sucursal_id"
              className="form-select"
              value={form.sucursal_id}
              onChange={handleChange}
              required
            >
              <option value="">Seleccionar</option>
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-2">
            <label className="form-label">Stock</label>
            <input
              name="stock"
              type="number"
              min="0"
              className="form-control"
              value={form.stock}
              onChange={handleChange}
              required
            />
          </div>

          <div className="col-md-2">
            <label className="form-label">Precio</label>
            <input
              name="precio"
              type="number"
              step="0.01"
              min="0"
              className="form-control"
              value={form.precio}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="mt-3 w-100">
          <button
            className="btn btn-dark me-2 w-100 border-white"
            type="submit"
            disabled={!!codigoError}
          >
            {modo === "editar" ? "Guardar cambios" : "Agregar"}
          </button>
          {modo === "editar" && (
            <button
              className="btn btn-dark mt-2 w-100"
              type="button"
              onClick={onCancel}
            >
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default ProductoForm;
