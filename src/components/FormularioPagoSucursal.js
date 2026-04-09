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
        <label className="form-label" style={labelStyle}>🏬 Sucursal</label>
        <select
          className="form-select"
          style={selectStyle}
          name="sucursal_id"
          value={form.sucursal_id}
          onChange={handleChange}
          required
        >
          <option value="" style={optStyle}>Seleccionar</option>
          {sucursales.map((s) => (
            <option key={s.id} value={s.id} style={optStyle}>
              {s.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <label className="form-label" style={labelStyle}>💰 Monto</label>
        <input
          type="number"
          className="form-control"
          style={inputStyle}
          name="monto"
          value={form.monto}
          onChange={handleChange}
          required
          min="0"
          placeholder="Ej: 50000"
        />
      </div>

      <div className="mb-3">
        <label className="form-label" style={labelStyle}>🧾 Método de pago</label>
        <input
          type="text"
          className="form-control"
          style={inputStyle}
          name="metodo"
          value={form.metodo}
          onChange={handleChange}
          required
          placeholder="Ej: Transferencia, Efectivo..."
        />
      </div>

      <div className="modal-footer" style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 16 }}>
        <button type="submit" className="btn btn-success w-100" style={{ fontWeight: 600 }}>
          Registrar Pago
        </button>
      </div>
    </form>
  );
}

const labelStyle = {
  color: "#e2e8f0",
  fontWeight: 500,
  marginBottom: 6,
};

const inputStyle = {
  background: "#1e2530",
  border: "1px solid rgba(255,255,255,0.15)",
  color: "#fff",
  borderRadius: 8,
};

const selectStyle = {
  background: "#1e2530",
  border: "1px solid rgba(255,255,255,0.15)",
  color: "#fff",
  borderRadius: 8,
};

const optStyle = {
  background: "#1e2530",
  color: "#fff",
};

export default FormularioPagoSucursal;
