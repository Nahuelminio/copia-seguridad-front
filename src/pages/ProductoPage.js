import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import ProductoForm from "../components/ProductoForm";
import ProductoTabla from "../components/ProductoTabla";
import ImportadorExcel from "../components/ImportadorExcel";
import "bootstrap/dist/js/bootstrap.bundle";
import ModalReposicionRapida from "../components/ModalReposicionRapida";
import Loader from "../components/Loader";
import { jwtDecode } from "jwt-decode";

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

  // Toast
  const toastRef = useRef(null);
  const [toastMsg, setToastMsg] = useState("");
  const showToast = (msg) => {
    setToastMsg(msg);
    const t = new window.bootstrap.Toast(toastRef.current, {
      delay: 2000,
      autohide: true,
    });
    t.show();
  };

  const API = process.env.REACT_APP_API_URL;

  const cargarProductos = () => {
    setCargando(true);
    const token = localStorage.getItem("token");

    if (token) {
      try {
        const decoded = jwtDecode(token);
        setRol(decoded.rol);
      } catch (err) {
        console.error("Error decodificando el token:", err);
      }
    }

    axios
      .get(`${API}/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setProductos(res.data);
        const unicas = [...new Set(res.data.map((p) => p.sucursal))];
        setSucursales(unicas);
      })
      .catch((err) => {
        console.error("❌ Error al obtener productos", err);
        setProductos([]);
      })
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
    const token = localStorage.getItem("token");
    return axios
      .post(`${API}/agregar`, datos, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(() => {
        cargarProductos();
        showToast("Agregado correctamente ✅");
      })
      .catch(() => {
        alert("❌ No se pudo agregar");
        throw new Error("Agregar falló");
      });
  };

  const editarProducto = (datos) => {
    const token = localStorage.getItem("token");
    const gustoId = Number(productoActual?.gusto_id);

    if (!Number.isFinite(gustoId)) {
      alert("❌ No se pudo identificar el gusto a editar (gusto_id inválido).");
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
      alert("❌ Seleccioná una sucursal.");
      return Promise.reject(new Error("sucursal_id vacío"));
    }
    if (!payload.nuevoGusto) {
      alert("❌ El gusto no puede estar vacío.");
      return Promise.reject(new Error("gusto vacío"));
    }
    if (!Number.isFinite(payload.precio)) {
      alert("❌ Precio inválido.");
      return Promise.reject(new Error("precio inválido"));
    }

    console.log("➡️ Edit payload:", {
      url: `${API}/editar/${gustoId}`,
      payload,
    });

    return axios
      .post(`${API}/editar/${gustoId}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(() => {
        cargarProductos();
        showToast("Editado correctamente ✅");
      })
      .catch((err) => {
        console.error(
          "❌ No se pudo editar",
          err?.response?.data || err.message
        );
        alert(err?.response?.data?.error || "❌ No se pudo editar");
        throw err;
      });
  };

  const eliminarProducto = (gusto_id) => {
    const token = localStorage.getItem("token");
    axios
      .delete(`${API}/eliminar-gusto/${gusto_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(() => {
        cargarProductos();
        showToast("Eliminado correctamente 🗑️");
      })
      .catch(() => alert("❌ No se pudo eliminar"));
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
    <div className="container mt-5 ">
      <h1 className="mb-4">Control de Stock</h1>

      {/* 🔵 Mostrar SOLO si es admin */}
      {rol === "admin" && (
        <>
          <button
            className="btn btn-dark border-white mb-3 w-100"
            onClick={() => abrirModal("crear")}
          >
            ➕ Agregar producto
          </button>
          <button
            className="btn btn-outline-warning mb-3 w-100"
            onClick={() =>
              new window.bootstrap.Modal(
                document.getElementById("modalReposicionRapida")
              ).show()
            }
          >
            ⚡ Reposición Rápida
          </button>
        </>
      )}

      <div className="d-flex justify-content-end mb-2">
        <button
          className="btn btn-outline-secondary btn-sm"
          onClick={() => setOrdenarPorStock(!ordenarPorStock)}
        >
          {ordenarPorStock
            ? "🔽 Mostrar orden original"
            : "🔼 Ordenar por stock"}
        </button>
      </div>

      {/* Filtros */}
      <div className="row mb-4">
        <div className="col-md-4">
          <label className="form-label">🔍 Buscar por nombre</label>
          <input
            type="text"
            className="form-control"
            value={filtroNombre}
            onChange={(e) => setFiltroNombre(e.target.value)}
          />
        </div>
        <div className="col-md-4">
          <label className="form-label">🍭 Buscar por gusto</label>
          <input
            type="text"
            className="form-control"
            value={filtroGusto}
            onChange={(e) => setFiltroGusto(e.target.value)}
          />
        </div>
        <div className="col-md-4">
          <label className="form-label">🏬 Filtrar por sucursal</label>
          <select
            className="form-select"
            value={filtroSucursal}
            onChange={(e) => setFiltroSucursal(e.target.value)}
          >
            <option value="">Todas</option>
            {sucursales.map((s, i) => (
              <option key={i} value={s}>
                {s}
              </option>
            ))}
          </select>
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

      {/* Modal para el formulario */}
      <div
        className="modal fade"
        id="modalProducto"
        tabIndex="-1"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-lg">
          <div className="modal-content form-create text-white">
            <div className="modal-header">
              <h5 className="modal-title">
                {editando ? "✏️ Editar producto" : "➕ Agregar producto"}
              </h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Cerrar"
              ></button>
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
                  } catch {
                    // Si falla, no cerramos el modal
                  }
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

      {/* 🔵 SOLO muestra el modal de reposición si es admin */}
      {rol === "admin" && (
        <ModalReposicionRapida onReposicionExitosa={cargarProductos} />
      )}

      {/* Toast de confirmación */}
      <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 1080 }}>
        <div
          ref={toastRef}
          className="toast text-bg-success border-0"
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          data-bs-delay="2000"
        >
          <div className="d-flex">
            <div className="toast-body">{toastMsg}</div>
            <button
              type="button"
              className="btn-close btn-close-white me-2 m-auto"
              data-bs-dismiss="toast"
              aria-label="Close"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductoPage;
