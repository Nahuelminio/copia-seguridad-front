import React, { useEffect, useState } from "react";
import axios from "axios";
import { mostrarToast } from "../utils/MostrarToast"; // si estás usando toasts personalizados

function ModalReposicionRapida({ sucursalIdInicial = "" }) {
  const [sucursales, setSucursales] = useState([]);
  const [gustos, setGustos] = useState([]);
  const [sucursalId, setSucursalId] = useState(sucursalIdInicial);
  const [gustoId, setGustoId] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [guardarHistorial, setGuardarHistorial] = useState(false);

  const API = process.env.REACT_APP_API_URL;

  useEffect(() => {
    axios
      .get(`${API}/sucursales`)
      .then((res) => setSucursales(res.data))
      .catch(() => alert("Error al obtener sucursales"));
  }, []);

  useEffect(() => {
    if (!sucursalId) return;
    axios
      .get(`${API}/disponibles?sucursal_id=${sucursalId}`)
      .then((res) => setGustos(res.data))
      .catch(() => alert("Error al cargar gustos"));
  }, [sucursalId]);

  const reponer = (e) => {
    e.preventDefault();
    if (!sucursalId || !gustoId || cantidad < 1) {
      alert("Completa todos los campos");
      return;
    }

    const ruta = guardarHistorial ? "/reposicion" : "/reposicion-rapida";

    axios
      .post(`${API}${ruta}`, {
        sucursal_id: sucursalId,
        gusto_id: gustoId,
        cantidad: parseInt(cantidad),
      })
      .then(() => {
        mostrarToast("Reposición realizada correctamente ✅");
        setCantidad(1);
        setGustoId("");
        setGuardarHistorial(false);
        const modal = window.bootstrap.Modal.getInstance(
          document.getElementById("modalReposicionRapida")
        );
        modal.hide();
      })
      .catch(() => mostrarToast("Error al reponer", "danger"));
  };

  return (
    <div
      className="modal fade"
      id="modalReposicionRapida"
      tabIndex="-1"
      aria-hidden="true"
    >
      <div className="modal-dialog modal-lg">
        <div className="modal-content bg-dark text-white">
          <div className="modal-header">
            <h5 className="modal-title">⚡ Reposición Rápida</h5>
            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
              aria-label="Cerrar"
            ></button>
          </div>
          <div className="modal-body">
            <form onSubmit={reponer} className="row g-3">
              <div className="col-md-4">
                <label className="form-label">🏬 Sucursal</label>
                <select
                  className="form-select"
                  value={sucursalId}
                  onChange={(e) => setSucursalId(e.target.value)}
                >
                  <option value="">Seleccionar</option>
                  {sucursales.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-4">
                <label className="form-label">🧃 Producto - Gusto</label>
                <select
                  className="form-select"
                  value={gustoId}
                  onChange={(e) => setGustoId(e.target.value)}
                >
                  <option value="">Seleccionar</option>
                  {gustos.map((g) => (
                    <option key={g.gusto_id} value={g.gusto_id}>
                      {g.producto_nombre} - {g.gusto}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-2">
                <label className="form-label">Cantidad</label>
                <input
                  type="number"
                  className="form-control"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  min="1"
                />
              </div>

              <div className="col-md-2 d-flex align-items-end">
                <button className="btn btn-success w-100" type="submit">
                  Reponer
                </button>
              </div>

              <div className="col-12">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="guardarHistorial"
                    checked={guardarHistorial}
                    onChange={(e) => setGuardarHistorial(e.target.checked)}
                  />
                  <label
                    className="form-check-label text-white"
                    htmlFor="guardarHistorial"
                  >
                    Guardar esta reposición en el historial
                  </label>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModalReposicionRapida;
