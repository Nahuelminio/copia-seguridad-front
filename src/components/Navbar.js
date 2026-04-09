import React, { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import DropdownNav from "./DropdownNav";
import { jwtDecode } from "jwt-decode";
import logo from "../assets/logoNorth.png";

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const decoded = token ? jwtDecode(token) : null;
  const rol = decoded?.rol;

  const puedeVerClientes = rol === "admin" || rol === "sucursal";

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
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark px-4" style={{
      background: "rgba(8, 13, 20, 0.92)",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid rgba(255,255,255,0.07)",
      position: "sticky",
      top: 0,
      zIndex: 1000,
      minHeight: "64px",
    }}>
      <div className="container-fluid">
        <Link className="navbar-brand" to="/">
          <img src={logo} alt="North" style={{ height: "52px", width: "auto", filter: "brightness(1.15)" }} />
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
          <ul className="navbar-nav ms-auto" style={{ gap: "4px" }}>
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
                ...(rol === "admin"
                  ? [
                      { path: "/transferencias", label: "Transferir entre sucursales", onClick: cerrarMenu },
                      { path: "/sucursales/gestionar", label: "Teléfonos de sucursales", onClick: cerrarMenu },
                    ]
                  : []),
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
                {
                  path: "/Cuentas-Corrientes",
                  label: "Cuentas Corrientes",
                  onClick: cerrarMenu,
                },
              ]}
            />

            {puedeVerClientes && (
              <li className="nav-item">
                <Link
                  className={`nav-link ${
                    location.pathname === "/clientes" ? "active" : ""
                  }`}
                  to="/clientes"
                  onClick={cerrarMenu}
                >
                  Clientes
                </Link>
              </li>
            )}

            {/* Mayorista: sucursal ve pedidos, admin ve dashboard también */}
            <DropdownNav
              id="dropdownMayorista"
              label="Mayorista"
              routes={[
                {
                  path: "/mayorista",
                  label: "Pedidos",
                  onClick: cerrarMenu,
                },
                {
                  path: "/mayorista/nuevo",
                  label: "Nuevo pedido",
                  onClick: cerrarMenu,
                },
                ...(rol === "admin"
                  ? [{ path: "/mayorista/dashboard", label: "Dashboard mayorista", onClick: cerrarMenu }]
                  : []),
              ]}
            />

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
                      path: "/ordenes-reposicion",
                      label: "Órdenes de reposición",
                      onClick: cerrarMenu,
                    },
                    {
                      path: "/registrarReposicion",
                      label: "Cargar Reposición",
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
