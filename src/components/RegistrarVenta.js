import React, { useEffect, useState } from "react";
import axios from "../utils/axiosInstance";
import { jwtDecode } from "jwt-decode";
import { toast } from "react-toastify";

function RegistrarVenta() {
  const [sucursales, setSucursales] = useState([]);
  const [sucursalId, setSucursalId] = useState("");
  const [gustos, setGustos] = useState([]);
  const [gustoId, setGustoId] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [codigoBarra, setCodigoBarra] = useState("");
  const [productoDetectado, setProductoDetectado] = useState(null);
  const [rol, setRol] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const decoded = jwtDecode(token);
      setRol(decoded.rol);
      if (decoded.rol !== "admin") {
        setSucursalId(decoded.sucursal_id);
      }
    }

    axios
      .get("/sucursales")
      .then((res) => setSucursales(res.data))
      .catch(() => toast.error("❌ Error al cargar sucursales"));
  }, []);

  const cargarGustosDisponibles = (sucursalId) => {
    axios
      .get(`/disponibles?sucursal_id=${sucursalId}`)
      .then((res) => setGustos(res.data))
      .catch(() => toast.error("❌ Error al cargar gustos"));
  };

  useEffect(() => {
    if (sucursalId) {
      cargarGustosDisponibles(sucursalId);
    }
  }, [sucursalId]);

  useEffect(() => {
    if (!codigoBarra || !sucursalId) return;

    const delay = setTimeout(() => {
      axios
        .get(`/buscar-por-codigo/${codigoBarra}?sucursal_id=${sucursalId}`)
        .then((res) => {
          setGustoId(res.data.gusto_id);
          setProductoDetectado(
            `${res.data.producto_nombre} - ${res.data.gusto}`
          );
        })
        .catch(() => {
          setGustoId("");
          setProductoDetectado(null);
          toast.error("❌ Código no encontrado en esta sucursal");
        });
    }, 300);

    return () => clearTimeout(delay);
  }, [codigoBarra, sucursalId]);

  const registrarManual = (e) => {
    e.preventDefault();

    const payload = {
      gusto_id: parseInt(gustoId),
      sucursal_id: parseInt(sucursalId),
      cantidad: parseInt(cantidad),
    };

    if (!payload.gusto_id || !payload.sucursal_id || !payload.cantidad) {
      toast.error("❌ Faltan campos obligatorios");
      return;
    }

    axios
      .post("/vender", payload)
      .then(() => {
        toast.success("✅ Venta registrada correctamente");
        setCantidad(1);
        setGustoId("");
        setCodigoBarra("");
        setProductoDetectado(null);
        cargarGustosDisponibles(sucursalId);
      })
      .catch((err) => {
        toast.error("❌ Error al registrar venta");
        console.error("❌ Error detalle:", err);
      });
  };

  return (
    <div className="container mt-4">
      <h2>Registrar Venta</h2>

      <form onSubmit={registrarManual}>
        <div className="mb-3">
          <label className="form-label">🏬 Sucursal</label>
          {rol === "admin" ? (
            <select
              className="form-select"
              value={sucursalId}
              onChange={(e) => setSucursalId(e.target.value)}
              required
            >
              <option value="">Seleccione una sucursal</option>
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              className="form-control"
              value={sucursales.find((s) => s.id == sucursalId)?.nombre || ""}
              disabled
            />
          )}
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
            placeholder="Escaneá el código"
            disabled={!sucursalId}
            autoFocus
          />
          {productoDetectado && (
            <div className="alert alert-success p-2 mt-2">
              Detectado: {productoDetectado}
            </div>
          )}
        </div>

        <div className="mb-3">
          <label className="form-label">🍭 Gusto disponible</label>
          <select
            className="form-select"
            value={gustoId}
            onChange={(e) => setGustoId(e.target.value)}
            disabled={!sucursalId}
          >
            <option value="">Seleccione un producto</option>
            {[...gustos]
              .sort((a, b) => b.stock - a.stock)
              .map((g) => (
                <option key={g.gusto_id} value={g.gusto_id}>
                  {g.producto_nombre} - {g.gusto} ({g.stock} disponibles)
                </option>
              ))}
          </select>
        </div>

        <div className="mb-3">
          <label className="form-label">🔢 Cantidad</label>
          <input
            type="number"
            className="form-control"
            min="1"
            value={cantidad}
            onChange={(e) => setCantidad(parseInt(e.target.value))}
            required
            disabled={!sucursalId}
          />
        </div>

        <button type="submit" className="btn  button-filtros">
          Registrar venta
        </button>
      </form>
    </div>
  );
}

export default RegistrarVenta;
