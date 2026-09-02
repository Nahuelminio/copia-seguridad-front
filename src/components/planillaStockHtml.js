// Planilla de control de stock para imprimir en A4.
// Separada del componente para poder verificar el HTML con datos reales
// fuera de React.

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/**
 * Agrupa las filas planas del backend en:
 *   [{ sucursal, total, modelos: [{ modelo, total, gustos: [{gusto, cantidad}] }] }]
 * El backend ya devuelve ordenado por sucursal → modelo → gusto, así que
 * alcanza con recorrer una vez.
 */
export function agruparPlanilla(filas) {
  const sucursales = [];
  let sucActual = null;
  let modActual = null;

  for (const f of filas) {
    const cantidad = Number(f.cantidad || 0);

    if (!sucActual || sucActual.sucursal_id !== f.sucursal_id) {
      sucActual = {
        sucursal_id: f.sucursal_id,
        sucursal: f.sucursal,
        total: 0,
        modelos: [],
      };
      sucursales.push(sucActual);
      modActual = null;
    }

    if (!modActual || modActual.modelo !== f.modelo) {
      modActual = { modelo: f.modelo, total: 0, gustos: [] };
      sucActual.modelos.push(modActual);
    }

    modActual.gustos.push({ gusto: f.gusto, cantidad });
    modActual.total += cantidad;
    sucActual.total += cantidad;
  }

  return sucursales;
}

function filasModelo(mod) {
  const gustos = mod.gustos
    .map(
      (g) => `
      <tr>
        <td class="gusto">${esc(g.gusto)}</td>
        <td class="num">${g.cantidad}</td>
        <td class="box"></td>
        <td class="box"></td>
      </tr>`
    )
    .join("");

  return `
    <tbody class="modelo">
      <tr class="cab-modelo">
        <td colspan="2">${esc(mod.modelo)}</td>
        <td class="num-modelo">${mod.total}</td>
        <td></td>
      </tr>
      ${gustos}
    </tbody>`;
}

function bloqueSucursal(suc, fecha, ultima) {
  const modelos = suc.modelos.map(filasModelo).join("");

  return `
  <section class="hoja${ultima ? "" : " salto"}">
    <header>
      <div>
        <h1>Control de stock</h1>
        <p class="sucursal">${esc(suc.sucursal)}</p>
      </div>
      <div class="meta">
        <p>${esc(fecha)}</p>
        <p>Sistema: <strong>${suc.total}</strong> unidades</p>
        <p class="firma">Contó: ______________________</p>
      </div>
    </header>

    <table>
      <thead>
        <tr>
          <th class="th-gusto">Sabor</th>
          <th class="th-num">Sistema</th>
          <th class="th-box">Contado</th>
          <th class="th-box">Dif.</th>
        </tr>
      </thead>
      ${modelos}
    </table>
  </section>`;
}

export function planillaStockHtml(filas, { fecha } = {}) {
  const sucursales = agruparPlanilla(filas);
  const fechaTxt =
    fecha ||
    new Date().toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const cuerpo = sucursales.length
    ? sucursales
        .map((s, i) => bloqueSucursal(s, fechaTxt, i === sucursales.length - 1))
        .join("")
    : `<section class="hoja"><p class="vacio">Sin datos para imprimir.</p></section>`;

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Control de stock</title>
<style>
  @page { size: A4 portrait; margin: 12mm 10mm; }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
    font-size: 10.5pt;
    color: #000;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .hoja { padding: 0; }
  .salto { page-break-after: always; }

  header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #000;
    padding-bottom: 6px;
    margin-bottom: 10px;
  }
  header h1 { font-size: 15pt; margin: 0; letter-spacing: .3px; }
  .sucursal { font-size: 12pt; font-weight: 700; margin: 3px 0 0; }
  .meta { text-align: right; font-size: 9.5pt; }
  .meta p { margin: 0 0 2px; }
  .firma { margin-top: 8px !important; }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  thead th {
    font-size: 8.5pt;
    text-transform: uppercase;
    letter-spacing: .6px;
    text-align: left;
    padding: 4px 6px;
    border-bottom: 1.5px solid #000;
  }
  /* el encabezado se repite arriba de cada página impresa */
  thead { display: table-header-group; }

  .th-num, .th-box { text-align: center; }
  .th-gusto { width: auto; }
  .th-num   { width: 20mm; }
  .th-box   { width: 24mm; }

  /* un modelo no se parte entre dos páginas si entra entero */
  tbody.modelo { page-break-inside: avoid; }

  .cab-modelo td {
    background: #e8e8e8;
    font-weight: 700;
    font-size: 10.5pt;
    padding: 5px 6px;
    border-top: 1px solid #000;
    border-bottom: 1px solid #999;
  }
  .num-modelo { text-align: center; font-weight: 700; }

  td {
    padding: 3.5px 6px;
    border-bottom: 1px solid #ccc;
    vertical-align: middle;
  }
  .gusto { padding-left: 12px; }
  .num   { text-align: center; font-variant-numeric: tabular-nums; }

  /* el cuadrado vacío para anotar a mano */
  .box {
    border-left: 1px solid #ccc;
    height: 7mm;
  }

  .vacio { text-align: center; padding: 40mm 0; color: #666; }
</style>
</head>
<body>
${cuerpo}
</body>
</html>`;
}
