import React, { useEffect, useState } from "react";
import axios from "../utils/axiosInstance";
import { getUsuario } from "../utils/auth";

function ResumenFinancieroSucursal({ recargar }) {
  const usuario = getUsuario();
  const esAdmin = usuario?.rol === "admin";

  const [resumen, setResumen] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [sucursalNombre, setSucursalNombre] = useState("");

  useEffect(() => {
    setCargando(true);

    // Si más adelante querés filtros de fecha, podés pasar params { desde, hasta }
    axios
      .get("/deuda-por-sucursal")
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];

        if (esAdmin) {
          setResumen(data);
        } else {
          // El endpoint ya filtra por la sucursal del token, pero por seguridad:
          const sucursalData =
            data.find(
              (s) => Number(s.sucursal_id) === Number(usuario?.sucursalId)
            ) ||
            data[0] ||
            null;
          setResumen(sucursalData ? [sucursalData] : []);
          setSucursalNombre(sucursalData?.sucursal || "Desconocida");
        }
      })
      .catch((err) => {
        console.error("❌ Error al obtener resumen financiero:", err);
        setResumen([]);
      })
      .finally(() => setCargando(false));
  }, [recargar, esAdmin, usuario?.sucursalId]);

  const totalFacturado = resumen.reduce(
    (acc, s) => acc + Number(s.facturado || 0),
    0
  );
  const totalPagado = resumen.reduce(
    (acc, s) => acc + Number(s.pagado || 0),
    0
  );
  const totalPendiente = totalFacturado - totalPagado;

  return (
    <div className="p-4 mt-4">
      <h4 className="mb-3 text-center">
        {esAdmin
          ? "💰 Resumen financiero por sucursal"
          : `💰 Tu resumen financiero (${sucursalNombre})`}
      </h4>

      {cargando ? (
        <div className="alert alert-info text-center">Cargando resumen...</div>
      ) : resumen.length === 0 ? (
        <div className="alert alert-warning text-center">
          No hay datos para mostrar.
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-bordered table-striped table-sm text-center align-middle">
            <thead className="table-dark">
              <tr>
                <th>Sucursal</th>
                <th>Facturado</th>
                <th>Pagado</th>
                <th>Deuda</th>
                <th>% Pagado</th>
              </tr>
            </thead>
            <tbody>
              {resumen.map((s, i) => {
                const facturado = Number(s.facturado || 0);
                const pagado = Number(s.pagado || 0);
                const deuda = Number(s.deuda ?? facturado - pagado);
                const porcentaje =
                  facturado > 0 ? (pagado / facturado) * 100 : 0;

                return (
                  <tr key={i}>
                    <td>{s.sucursal}</td>
                    <td>${facturado.toFixed(2)}</td>
                    <td>${pagado.toFixed(2)}</td>
                    <td
                      className={
                        deuda <= 0
                          ? "bg-success text-white fw-bold"
                          : "bg-danger text-white fw-bold"
                      }
                    >
                      ${deuda.toFixed(2)} {deuda <= 0 && "✅"}
                    </td>
                    <td
                      className={
                        porcentaje === 100
                          ? "text-success fw-bold"
                          : porcentaje >= 50
                          ? "text-warning fw-bold"
                          : "text-danger fw-bold"
                      }
                    >
                      {porcentaje.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {esAdmin && (
              <tfoot className="fw-bold">
                <tr>
                  <td>Total general</td>
                  <td>${totalFacturado.toFixed(2)}</td>
                  <td>${totalPagado.toFixed(2)}</td>
                  <td>${totalPendiente.toFixed(2)}</td>
                  <td>
                    {totalFacturado > 0
                      ? `${((totalPagado / totalFacturado) * 100).toFixed(1)}%`
                      : "0%"}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}

export default ResumenFinancieroSucursal;
