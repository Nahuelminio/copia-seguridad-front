import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";

import Navbar from "./components/Navbar";
import ProductoPage from "./pages/ProductoPage";
import AdminDashboard from "./pages/AdminDashboard";
import SucursalDashboard from "./pages/SucursalDashboard";
import RegistrarVenta from "./components/RegistrarVenta";
import CrearSucursal from "./pages/CrearSucursal";
import HistorialVentas from "./components/HistorialVentas";
import VentasMensuales from "./components/VentasMensuales";
import HistorialReposiciones from "./components/HistorialReposiciones";
import RegistrarReposicion from "./components/RegistrarReposicion";
import ReposicionRapida from "./pages/ReposicionRapida";
import HistorialPagos from "./components/HistorialPagos";
import Login from "./pages/Login";
import ResumenGanancias from "./pages/ResumenGanancias";

import PrivateRoute from "./utils/PrivateRoute";
import { getUsuario } from "./utils/auth";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import PodsPorSucursalPage from "./pages/PodsPorSucursalPage";
import AdminLeads from "./pages/AdminLeads";
import CuentasCorrientes from "./pages/CuentasCorrientes";
import Clientes from "./pages/Clientes";
import PedidosMayorista from "./pages/PedidosMayorista";
import NuevoPedidoMayorista from "./pages/NuevoPedidoMayorista";
import DashboardMayorista from "./pages/DashboardMayorista";
import TransferenciasStock from "./pages/TransferenciasStock";
import GestionSucursales from "./pages/GestionSucursales";
import OrdenesReposicion from "./pages/OrdenesReposicion";
import VendedorDashboard from "./pages/VendedorDashboard";
import VendedoresStats from "./pages/VendedoresStats";
import CostosCentral from "./pages/CostosCentral";

// Componente wrapper para mostrar el Navbar solo si no está en login
const AppLayout = ({ children }) => {
  const location = useLocation();
  const usuario = getUsuario();
  const mostrarNavbar = usuario && location.pathname !== "/login";

  return (
    <>
      {mostrarNavbar && <Navbar />}
      {children}
    </>
  );
};

// Wrapper para decidir qué dashboard cargar según el rol
const DashboardWrapper = () => {
  const usuario = getUsuario();
  if (usuario?.rol === "admin") return <AdminDashboard />;
  if (usuario?.rol === "vendedor") return <VendedorDashboard />;
  return <SucursalDashboard />;
};

function App() {
  return (
    <Router>
      <AppLayout>
        <Routes>
          {/* Login público */}
          <Route path="/login" element={<Login />} />

          {/* Dashboard según rol */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <DashboardWrapper />
              </PrivateRoute>
            }
          />

          {/* Rutas comunes */}
          <Route
            path="/productos"
            element={
              <PrivateRoute>
                <ProductoPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/productosTotal"
            element={
              <PrivateRoute>
                <PodsPorSucursalPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/vender"
            element={
              <PrivateRoute>
                <RegistrarVenta />
              </PrivateRoute>
            }
          />
          <Route
            path="/Cuentas-Corrientes"
            element={
              <PrivateRoute>
                <CuentasCorrientes />
              </PrivateRoute>
            }
          />
          <Route
            path="/historial-pagos"
            element={
              <PrivateRoute>
                <HistorialPagos />
              </PrivateRoute>
            }
          />

          {/* Solo admin */}
          <Route
            path="/resumen-ganancias"
            element={
              <PrivateRoute>
                <ResumenGanancias />
              </PrivateRoute>
            }
          />
          {/* Solo admin */}
          <Route
            path="/clientes"
            element={
              <PrivateRoute>
                <Clientes/>
              </PrivateRoute>
            }
          />
          <Route
            path="/crear-sucursal"
            element={
              <PrivateRoute>
                <Clientes />
              </PrivateRoute>
            }
          />
          <Route
            path="/historial"
            element={
              <PrivateRoute>
                <HistorialVentas />
              </PrivateRoute>
            }
          />
          <Route
            path="/ventasMensuales"
            element={
              <PrivateRoute>
                <VentasMensuales />
              </PrivateRoute>
            }
          />

          <Route
            path="/historialReposiciones"
            element={
              <PrivateRoute>
                <HistorialReposiciones />
              </PrivateRoute>
            }
          />
          <Route
            path="/registrarReposicion"
            element={
              <PrivateRoute>
                <RegistrarReposicion />
              </PrivateRoute>
            }
          />
          <Route
            path="/reposicion-rapida"
            element={
              <PrivateRoute>
                <ReposicionRapida />
              </PrivateRoute>
            }
          />

          {/* Mayorista */}
          <Route
            path="/mayorista"
            element={
              <PrivateRoute>
                <PedidosMayorista />
              </PrivateRoute>
            }
          />
          <Route
            path="/mayorista/nuevo"
            element={
              <PrivateRoute>
                <NuevoPedidoMayorista />
              </PrivateRoute>
            }
          />
          <Route
            path="/mayorista/pedidos/:id/editar"
            element={
              <PrivateRoute>
                <NuevoPedidoMayorista />
              </PrivateRoute>
            }
          />
          <Route
            path="/mayorista/dashboard"
            element={
              <PrivateRoute>
                <DashboardMayorista />
              </PrivateRoute>
            }
          />

          {/* Transferencias de stock */}
          <Route
            path="/transferencias"
            element={
              <PrivateRoute>
                <TransferenciasStock />
              </PrivateRoute>
            }
          />

          {/* Órdenes de reposición */}
          <Route
            path="/ordenes-reposicion"
            element={
              <PrivateRoute>
                <OrdenesReposicion />
              </PrivateRoute>
            }
          />
          <Route
            path="/sucursales/gestionar"
            element={
              <PrivateRoute>
                <GestionSucursales />
              </PrivateRoute>
            }
          />
          <Route
            path="/vendedores/stats"
            element={
              <PrivateRoute>
                <VendedoresStats />
              </PrivateRoute>
            }
          />
          <Route
            path="/costos-central"
            element={
              <PrivateRoute>
                <CostosCentral />
              </PrivateRoute>
            }
          />

          {/* Default: redirige al dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </AppLayout>
    </Router>
  );
}

export default App;
