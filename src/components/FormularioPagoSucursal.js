import React, { useState, useEffect } from "react";
import axios from "../utils/axiosInstance"; // ✅ usa instancia con token

function FormularioPagoSucursal({ onPagoExitoso }) {
  const [sucursales, setSucursales] = useState([]);
  const [form, setForm] = useState({
    sucursal_id: "",
    metodo: "",
    monto: "",
  });

  useEffect(() => {
    axios
      .get("/sucursales")
      .then((res) => setSucursales(res.data))
      .catch(() => alert("❌ Error al cargar sucursales"));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    axios
      .post("/registrar-pago", form)
      .then(() => {
        alert("✅ Pago registrado");
        setForm({ sucursal_id: "", metodo: "", monto: "" });
        if (onPagoExitoso) onPagoExitoso(); // 👉 dispara recarga
        const modal = window.bootstrap.Modal.getInstance(
          document.getElementById("modalPago")
        );
        if (modal) modal.hide();
      })
      .catch(() => alert("❌ Error al registrar pago"));
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-3">
        <label className="form-label">🏬 Sucursal</label>
        <select
          className="form-select"
          name="sucursal_id"
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

      <div className="mb-3">
        <label className="form-label">💰 Monto</label>
        <input
          type="number"
          className="form-control"
          name="monto"
          value={form.monto}
          onChange={handleChange}
          required
          min="0"
        />
      </div>

      <div className="mb-3">
        <label className="form-label">🧾 Método de pago</label>
        <input
          type="text"
          className="form-control"
          name="metodo"
          value={form.metodo}
          onChange={handleChange}
          required
        />
      </div>

      <div className="modal-footer">
        <button type="submit" className="btn btn-success w-100">
          Registrar Pago
        </button>
      </div>
    </form>
  );
}

export default FormularioPagoSucursal;
