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
  const esVendedor = rol === "vendedor";

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

            {/* ── VENDEDOR: menú simplificado ── */}
            {esVendedor ? (
              <>
                <DropdownNav
                  id="dropdownVentasVendedor"
                  label="Ventas"
                  routes={[
                    { path: "/vender",             label: "Registrar venta",    onClick: cerrarMenu },
                    { path: "/historial",           label: "Mis ventas",         onClick: cerrarMenu },
                    { path: "/Cuentas-Corrientes",  label: "Mi cuenta corriente",onClick: cerrarMenu },
                  ]}
                />
                <DropdownNav
                  id="dropdownStockVendedor"
                  label="Stock"
                  routes={[
                    { path: "/productos",      label: "Ver stock",          onClick: cerrarMenu },
                    { path: "/productosTotal", label: "Pods por sucursal",  onClick: cerrarMenu },
                  ]}
                />
                <li className="nav-item">
                  <Link
                    className={`nav-link ${location.pathname === "/dashboard" ? "active" : ""}`}
                    to="/dashboard"
                    onClick={cerrarMenu}
                  >
                    Mi panel
                  </Link>
                </li>
              </>
            ) : (
              <>
                {/* ── Stock: solo inventario ── */}
                <DropdownNav
                  id="dropdownStock"
                  label="Stock"
                  routes={[
                    { path: "/productos",        label: "Productos",                  onClick: cerrarMenu },
                    { path: "/productosTotal",   label: "Pods por sucursal",          onClick: cerrarMenu },
                    ...(rol === "admin" ? [
                      { path: "/transferencias",       label: "Transferir entre sucursales", onClick: cerrarMenu },
                      { path: "/sucursales/gestionar", label: "Teléfonos de sucursales",     onClick: cerrarMenu },
                    ] : []),
                  ]}
                />

                {/* ── Ventas: ventas, pagos y cuentas ── */}
                <DropdownNav
                  id="dropdownVentas"
                  label="Ventas"
                  routes={[
                    { path: "/vender",            label: "Registrar venta",    onClick: cerrarMenu },
                    { path: "/historial",         label: "Historial ventas",   onClick: cerrarMenu },
                    { path: "/historial-pagos",   label: "Historial pagos",    onClick: cerrarMenu },
                    { path: "/Cuentas-Corrientes",label: "Cuentas corrientes", onClick: cerrarMenu },
                    ...(rol === "admin" ? [
                      { path: "/ventasMensuales", label: "Ventas mensuales", onClick: cerrarMenu },
                    ] : []),
                  ]}
                />

                {/* ── Reposiciones: solo admin ── */}
                {rol === "admin" && (
                  <DropdownNav
                    id="dropdownRepo"
                    label="Reposiciones"
                    routes={[
                      { path: "/ordenes-reposicion",   label: "Órdenes de reposición", onClick: cerrarMenu },
                      { path: "/registrarReposicion",  label: "Cargar reposición",     onClick: cerrarMenu },
                      { path: "/historialReposiciones",label: "Historial reposiciones",onClick: cerrarMenu },
                      { path: "/costos-central",       label: "Costos Central",        onClick: cerrarMenu },
                      { path: "/resumen-ganancias",    label: "Ganancias",             onClick: cerrarMenu },
                    ]}
                  />
                )}

                {/* ── Mayorista ── */}
                <DropdownNav
                  id="dropdownMayorista"
                  label="Mayorista"
                  routes={[
                    { path: "/mayorista",           label: "Pedidos",            onClick: cerrarMenu },
                    { path: "/mayorista/nuevo",     label: "Nuevo pedido",       onClick: cerrarMenu },
                    ...(rol === "admin" ? [
                      { path: "/mayorista/dashboard", label: "Dashboard mayorista", onClick: cerrarMenu },
                    ] : []),
                  ]}
                />

                {/* ── Clientes (admin + sucursal) ── */}
                {puedeVerClientes && (
                  <li className="nav-item">
                    <Link
                      className={`nav-link ${location.pathname === "/clientes" ? "active" : ""}`}
                      to="/clientes"
                      onClick={cerrarMenu}
                    >
                      Clientes
                    </Link>
                  </li>
                )}

                {/* ── Vendedores (solo admin) ── */}
                {rol === "admin" && (
                  <DropdownNav
                    id="dropdownVendedores"
                    label="Vendedores"
                    routes={[
                      { path: "/vendedores/stats", label: "Rendimiento vendedores", onClick: cerrarMenu },
                    ]}
                  />
                )}

                {/* ── Dashboard (solo admin) ── */}
                {rol === "admin" && (
                  <li className="nav-item">
                    <Link
                      className={`nav-link ${location.pathname === "/dashboard" ? "active" : ""}`}
                      to="/dashboard"
                      onClick={cerrarMenu}
                    >
                      Dashboard
                    </Link>
                  </li>
                )}
              </>
            )}

            <li className="nav-item">
              <button className="nav-link btn btn-link text-white" onClick={handleLogout}>
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
