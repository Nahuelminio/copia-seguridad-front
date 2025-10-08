import React, { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import DropdownNav from "./DropdownNav";
import { jwtDecode } from "jwt-decode";

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const decoded = token ? jwtDecode(token) : null;
  const rol = decoded?.rol;

  useEffect(() => {
    console.log("Navbar montado");
  }, []);

  const cerrarMenu = () => {
    const navbar = document.getElementById("navbarContenido");
    const bsCollapse = window.bootstrap?.Collapse.getInstance(navbar);
    if (bsCollapse) {
      bsCollapse.hide();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token"); // Borra solo el token
    navigate("/"); // Redirige al login
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark px-3 py-2">
      <div className="container-fluid">
        <Link className="navbar-brand fw-bold" to="/">
          Control Stock
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarContenido"
          aria-controls="navbarContenido"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarContenido">
          <ul className="navbar-nav ms-auto text-center">
            {/* Productos y ventas: visible para todos */}
            <DropdownNav
              id="dropdownStock"
              label="Gestión Stock"
              routes={[
                {
                  path: "/productos",
                  label: "Productos",
                  onClick: cerrarMenu,
                },
                {
                  path: "/productosTotal",
                  label: "Pods Por Sucursal",
                  onClick: cerrarMenu,
                },
                {
                  path: "/vender",
                  label: "Registrar Venta",
                  onClick: cerrarMenu,
                },
                {
                  path: "/historial-pagos",
                  label: "Historial Pagos",
                  onClick: cerrarMenu,
                },
                {
                  path: "/historial",
                  label: "Historial Ventas",
                  onClick: cerrarMenu,
                },
              ]}
            />

            {/* Solo admin ve el resto */}
            {rol === "admin" && (
              <>
                <DropdownNav
                  id="dropdownVentas"
                  label="Ventas"
                  routes={[
                    {
                      path: "/vender",
                      label: "Registrar Venta",
                      onClick: cerrarMenu,
                    },
                    {
                      path: "/ventasMensuales",
                      label: "Ventas mensuales",
                      onClick: cerrarMenu,
                    },
                    {
                      path: "/historial",
                      label: "Historial Ventas",
                      onClick: cerrarMenu,
                    },
                  ]}
                />

                <DropdownNav
                  id="dropdownRepo"
                  label="Reposiciones"
                  routes={[
                    {
                      path: "/registrarReposicion",
                      label: "Cargar Reposición",
                      onClick: cerrarMenu,
                    },
                    {
                      path: "/clientes",
                      label: "Clientes",
                      onClick: cerrarMenu,
                    },
                    {
                      path: "/historial",
                      label: "Historial Ventas",
                      onClick: cerrarMenu,
                    },
                    {
                      path: "/historialReposiciones",
                      label: "Historial Reposición",
                      onClick: cerrarMenu,
                    },
                    {
                      path: "/historial-pagos",
                      label: "Historial Pagos",
                      onClick: cerrarMenu,
                    },
                    {
                      path: "/resumen-ganancias",
                      label: "Ganancias",
                      onClick: cerrarMenu,
                    },
                  ]}
                />

                <li className="nav-item">
                  <Link
                    className={`nav-link ${
                      location.pathname === "/dashboard" ? "active" : ""
                    }`}
                    to="/dashboard"
                    onClick={cerrarMenu}
                  >
                    Dashboard
                  </Link>
                </li>
              </>
            )}

            {/* Botón cerrar sesión */}
            <li className="nav-item">
              <button
                className="nav-link btn btn-link text-white"
                onClick={handleLogout}
              >
                Cerrar sesión
              </button>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
