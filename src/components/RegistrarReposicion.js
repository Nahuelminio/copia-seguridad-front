import React, { useEffect, useState } from "react";
import axios from "../utils/axiosInstance";
import { toast } from "react-toastify";

function RegistrarReposicion() {
  const [productos, setProductos] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [codigoBarra, setCodigoBarra] = useState("");
  const [form, setForm] = useState({
    gusto_id: "",
    sucursal_id: "",
    cantidad: "",
  });

  useEffect(() => {
    axios.get("/").then((res) => setProductos(res.data));
    axios.get("/sucursales").then((res) => setSucursales(res.data));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    axios
      .post("/reposicion", form)
      .then(() => {
        toast.success("✅ Reposición registrada correctamente");
        setForm({ gusto_id: "", sucursal_id: "", cantidad: "" });
        setCodigoBarra("");
      })
      .catch(() => toast.error("❌ Error al registrar la reposición"));
  };

  const handleBarcode = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!codigoBarra || !form.sucursal_id) {
        toast.error("Falta el código de barras o la sucursal");
        return;
      }

      axios
        .get(
          `/buscar-por-codigo/${codigoBarra}?sucursal_id=${form.sucursal_id}`
        )
        .then((res) => {
          const gusto = res.data;
          setForm((prev) => ({
            ...prev,
            gusto_id: gusto.gusto_id,
          }));
          toast.success(
            `✅ Detectado: ${gusto.producto_nombre} - ${gusto.gusto}`
          );
        })
        .catch(() => {
          toast.error("❌ Código no encontrado");
          setForm((prev) => ({ ...prev, gusto_id: "" }));
        });
    }
  };

  const productosFiltrados = form.sucursal_id
    ? productos.filter(
        (p) => String(p.sucursal_id) === String(form.sucursal_id)
      )
    : [];

  const gustoDetectado = productos.find(
    (p) =>
      p.gusto_id === form.gusto_id &&
      p.sucursal_id === parseInt(form.sucursal_id)
  );

  const listaParaSelect = gustoDetectado
    ? [...new Set([gustoDetectado, ...productosFiltrados])]
    : productosFiltrados;

  return (
    <div className="container mt-5">
      <h2>Registrar Reposición</h2>
      <form onSubmit={handleSubmit} className="card p-4 mt-3">
        <div className="mb-3">
          <label className="form-label">🏬 Sucursal</label>
          <select
            className="form-select"
            name="sucursal_id"
            value={form.sucursal_id}
            onChange={handleChange}
            required
          >
            <option value="">Seleccionar sucursal</option>
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-3">
          <label className="form-label">
            📷 Escanear código de barras (opcional)
          </label>
          <input
            type="text"
            className="form-control"
            value={codigoBarra}
            onChange={(e) => setCodigoBarra(e.target.value)}
            onKeyDown={handleBarcode}
            placeholder="Escaneá el código y presioná Enter"
            disabled={!form.sucursal_id}
            autoFocus
          />
        </div>

        <div className="mb-3">
          <label className="form-label">🍭 Gusto</label>
          <select
            className="form-select"
            name="gusto_id"
            value={form.gusto_id}
            onChange={handleChange}
            required
            disabled={!form.sucursal_id}
          >
            <option value="">
              {form.sucursal_id
                ? "Seleccionar gusto"
                : "Elegí una sucursal primero"}
            </option>
            {[...listaParaSelect]
              .sort((a, b) => b.stock - a.stock)
              .map((p, index) => (
                <option
                  key={`${p.gusto_id}-${p.sucursal_id || index}`}
                  value={p.gusto_id}
                >
                  {p.producto_nombre} - {p.gusto} ({p.sucursal}) — {p.stock} en
                  stock
                </option>
              ))}
          </select>
        </div>

        <div className="mb-3">
          <label className="form-label">➕ Cantidad a reponer</label>
          <input
            type="number"
            className="form-control"
            name="cantidad"
            value={form.cantidad}
            onChange={handleChange}
            required
            min="1"
            disabled={!form.gusto_id}
          />
        </div>

        <button
          type="submit"
          className="btn btn-dark  w-100"
          disabled={!form.gusto_id || !form.cantidad}
        >
          Registrar manualmente
        </button>
      </form>
    </div>
  );
}

export default RegistrarReposicion;
