import React, { useState } from "react";
import axios from "axios";

function CrearSucursal() {
  const [nombre, setNombre] = useState("");
  const API_URL = process.env.REACT_APP_API_URL;

  const crear = (e) => {
    e.preventDefault();
    axios
      .post(`${API_URL}/productos/sucursales`, { nombre })
      .then(() => {
        alert("✅ Sucursal creada");
        setNombre("");
      })
      .catch(() => alert("❌ Error al crear sucursal"));
  };

  return (
    <div className="container mt-5">
      <h2>🏬 Crear nueva sucursal</h2>
      <form onSubmit={crear}>
        <div className="mb-3">
          <label className="form-label">Nombre de la sucursal</label>
          <input
            type="text"
            className="form-control"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
        </div>
        <button className="btn btn-primary">Crear</button>
      </form>
    </div>
  );
}

export default CrearSucursal;
