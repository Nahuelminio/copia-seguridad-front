import React, { useEffect, useState } from "react";
import axios from "../utils/axiosInstance";
import ProductoForm from "../components/ProductoForm";
import ProductoTabla from "../components/ProductoTabla";
import ImportadorExcel from "../components/ImportadorExcel";
import "bootstrap/dist/js/bootstrap.bundle";
import ModalReposicionRapida from "../components/ModalReposicionRapida";
import Loader from "../components/Loader";
import { jwtDecode } from "jwt-decode";
import { toast } from "react-toastify";

const iStyle = {
  background: "#111827",
  border: "1px solid #334155",
  color: "#fff",
  borderRadius: "8px",
};

const lStyle = {
  color: "#94a3b8",
  fontSize: "0.82rem",
  marginBottom: 4,
};

function ProductoPage() {
  const [cargando, setCargando] = useState(false);
  const [productos, setProductos] = useState([]);
  const [editando, setEditando] = useState(false);
  const [productoActual, setProductoActual] = useState(null);
  const [filtroNombre, setFiltroNombre] = useState("");
  const [filtroGusto, setFiltroGusto] = useState("");
  const [filtroSucursal, setFiltroSucursal] = useState("");
  const [sucursales, setSucursales] = useState([]);
  const [ordenarPorStock, setOrdenarPorStock] = useState(false);
  const [rol, setRol] = useState(null);

  const cargarProductos = () => {
    setCargando(true);
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setRol(decoded.rol);
      } catch {}
    }
    axios
      .get("/")
      .then((res) => {
        setProductos(res.data);
        const unicas = [...new Set(res.data.map((p) => p.sucursal))];
        setSucursales(unicas);
      })
      .catch(() => setProductos([]))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  const abrirModal = (modo, producto = null) => {
    setEditando(modo === "editar");
    setProductoActual(producto);
    const modal = new window.bootstrap.Modal(
      document.getElementById("modalProducto")
    );
    modal.show();
  };

  const agregarProducto = (datos) => {
    return axios
      .post("/agregar", datos)
      .then(() => {
        cargarProductos();
        toast.success("Producto agregado correctamente");
      })
      .catch(() => {
        toast.error("No se pudo agregar el producto");
        throw new Error("Agregar falló");
      });
  };

  const editarProducto = (datos) => {
    const gustoId = Number(productoActual?.gusto_id);

    if (!Number.isFinite(gustoId)) {
      toast.error("No se pudo identificar el producto a editar");
      return Promise.reject(new Error("gusto_id inválido"));
    }

    const payload = {
      stock: Number.isFinite(Number(datos.stock)) ? Number(datos.stock) : 0,
      precio: Number(datos.precio),
      sucursal_id: Number(datos.sucursal_id),
      nuevoGusto: String(datos.gusto ?? "").trim(),
      codigo_barra: datos.codigo_barra || null,
    };

    if (!payload.sucursal_id) {
      toast.error("Seleccioná una sucursal");
      return Promise.reject(new Error("sucursal_id vacío"));
    }
    if (!payload.nuevoGusto) {
      toast.error("El gusto no puede estar vacío");
      return Promise.reject(new Error("gusto vacío"));
    }
    if (!Number.isFinite(payload.precio)) {
      toast.error("Precio inválido");
      return Promise.reject(new Error("precio inválido"));
    }

    return axios
      .post(`/editar/${gustoId}`, payload)
      .then(() => {
        cargarProductos();
        toast.success("Producto editado correctamente");
      })
      .catch((err) => {
        toast.error(err?.response?.data?.error || "No se pudo editar el producto");
        throw err;
      });
  };

  const eliminarProducto = (gusto_id) => {
    axios
      .delete(`/eliminar-gusto/${gusto_id}`)
      .then(() => {
        cargarProductos();
        toast.success("Producto eliminado");
      })
      .catch(() => toast.error("No se pudo eliminar el producto"));
  };

  const productosFiltrados = productos
    .filter((p) => {
      const matchNombre = p.producto_nombre
        .toLowerCase()
        .includes(filtroNombre.toLowerCase());
      const matchGusto = p.gusto
        .toLowerCase()
        .includes(filtroGusto.toLowerCase());
      const matchSucursal =
        filtroSucursal === "" || p.sucursal === filtroSucursal;
      return matchNombre && matchGusto && matchSucursal;
    })
    .sort((a, b) => (ordenarPorStock ? b.stock - a.stock : 0));

  return (
    <div className="container mt-5">
      {/* Separador */}
      <div className="d-flex align-items-center gap-3 mb-4 mt-2">
        <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, #1e293b, transparent)" }} />
        <span
          style={{
            color: "#475569",
            fontSize: "0.72rem",
            fontWeight: 700,
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          Control de Stock
        </span>
        <div style={{ flex: 1, height: "1px", background: "linear-gradient(to left, #1e293b, transparent)" }} />
      </div>

      {/* Botones de acción (solo admin) */}
      {rol === "admin" && (
        <div className="row g-2 mb-3">
          <div className="col-12 col-md-6">
            <button
              className="w-100"
              onClick={() => abrirModal("crear")}
              style={{
                background: "#111827",
                border: "1px solid #10b98140",
                borderRadius: 9,
                color: "#10b981",
                fontWeight: 600,
                fontSize: "0.88rem",
                padding: "11px 0",
                cursor: "pointer",
                transition: "background 0.15s, border-color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#10b98112";
                e.currentTarget.style.borderColor = "#10b981";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#111827";
                e.currentTarget.style.borderColor = "#10b98140";
              }}
            >
              Agregar producto
            </button>
          </div>
          <div className="col-12 col-md-6">
            <button
              className="w-100"
              onClick={() =>
                new window.bootstrap.Modal(
                  document.getElementById("modalReposicionRapida")
                ).show()
              }
              style={{
                background: "#111827",
                border: "1px solid #f59e0b40",
                borderRadius: 9,
                color: "#f59e0b",
                fontWeight: 600,
                fontSize: "0.88rem",
                padding: "11px 0",
                cursor: "pointer",
                transition: "background 0.15s, border-color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f59e0b12";
                e.currentTarget.style.borderColor = "#f59e0b";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#111827";
                e.currentTarget.style.borderColor = "#f59e0b40";
              }}
            >
              Reposición Rápida
            </button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="row g-3 mb-3 align-items-end">
        <div className="col-md-4">
          <label style={lStyle}>Buscar por nombre</label>
          <input
            type="text"
            className="form-control input-dark"
            value={filtroNombre}
            onChange={(e) => setFiltroNombre(e.target.value)}
            style={iStyle}
          />
        </div>
        <div className="col-md-4">
          <label style={lStyle}>Buscar por gusto</label>
          <input
            type="text"
            className="form-control input-dark"
            value={filtroGusto}
            onChange={(e) => setFiltroGusto(e.target.value)}
            style={iStyle}
          />
        </div>
        {rol === "admin" && (
          <div className="col-md-3">
            <label style={lStyle}>Filtrar por sucursal</label>
            <select
              className="form-select"
              value={filtroSucursal}
              onChange={(e) => setFiltroSucursal(e.target.value)}
              style={{ ...iStyle, backgroundImage: "none" }}
            >
              <option value="">Todas</option>
              {sucursales.map((s, i) => (
                <option key={i} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className={rol === "admin" ? "col-md-1 d-flex align-items-end" : "col-md-4 d-flex align-items-end justify-content-end"}>
          <button
            className="w-100"
            style={{
              background: ordenarPorStock ? "#1e3a5f" : "#1e293b",
              color: ordenarPorStock ? "#93c5fd" : "#94a3b8",
              border: `1px solid ${ordenarPorStock ? "#3b82f6" : "#334155"}`,
              borderRadius: 8,
              fontSize: "0.78rem",
              fontWeight: 600,
              padding: "8px 10px",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
            onClick={() => setOrdenarPorStock(!ordenarPorStock)}
          >
            {ordenarPorStock ? "Orden original" : "Por stock"}
          </button>
        </div>
      </div>

      {cargando ? (
        <Loader mensaje="Cargando productos..." />
      ) : (
        <ProductoTabla
          productos={productosFiltrados}
          onEliminar={eliminarProducto}
          onEditar={(producto) => abrirModal("editar", producto)}
          esAdmin={rol === "admin"}
        />
      )}

      {/* Modal producto */}
      <div className="modal fade" id="modalProducto" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-lg">
          <div
            className="modal-content"
            style={{
              background: "#111827",
              border: "1px solid #1e293b",
              borderRadius: 14,
              color: "#e2e8f0",
            }}
          >
            <div className="modal-header" style={{ borderBottom: "1px solid #1e293b" }}>
              <h5 className="modal-title" style={{ color: "#f1f5f9", fontWeight: 600 }}>
                {editando ? "Editar producto" : "Agregar producto"}
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                data-bs-dismiss="modal"
                aria-label="Cerrar"
              />
            </div>
            <div className="modal-body">
              <ProductoForm
                modo={editando ? "editar" : "crear"}
                producto={productoActual}
                onSubmit={async (data) => {
                  try {
                    if (editando) {
                      await editarProducto(data);
                    } else {
                      await agregarProducto(data);
                    }
                    const modal = window.bootstrap.Modal.getInstance(
                      document.getElementById("modalProducto")
                    );
                    modal?.hide();
                  } catch {}
                }}
                onCancel={() => {
                  const modal = window.bootstrap.Modal.getInstance(
                    document.getElementById("modalProducto")
                  );
                  modal?.hide();
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {rol === "admin" && (
        <ModalReposicionRapida onReposicionExitosa={cargarProductos} />
      )}
    </div>
  );
}

export default ProductoPage;
