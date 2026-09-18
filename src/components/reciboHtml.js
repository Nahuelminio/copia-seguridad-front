/**
 * Plantilla del comprobante de rendición que se manda a imprimir.
 *
 * Vive aparte del componente para poder generarla sin React: así el HTML que se
 * revisa es exactamente el que sale por la impresora, y no una copia parecida.
 */

export const fmt = (n) => `$${Number(n || 0).toLocaleString("es-AR")}`;

// Los nombres salen de la base, así que se escapan antes de armar el HTML.
export const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const fecha = (f) => (f ? new Date(f).toLocaleDateString("es-AR") : "");

/**
 * "Elfbar ice king - 40.000 puffs" -> { modelo: "Elfbar ice king", k: "40k" }
 * El nombre entero no entra en una linea y parte las filas en dos, asi que los
 * puffs se abrevian y van chicos al lado del modelo.
 */
export const partirProducto = (producto) => {
  const [modelo, ...resto] = String(producto).split(" - ");
  const m = resto.join(" ").match(/([\d.\s]+)\s*puffs/i);
  const n = m ? parseInt(m[1].replace(/[^\d]/g, ""), 10) : 0;
  return { modelo: (modelo || "").trim(), k: n ? `${Math.round(n / 1000)}k` : "" };
};

/**
 * Arma las filas y los totales de la rendicion.
 * `devoluciones` (opcional) permite calcularla en el mismo momento del cierre,
 * antes de que el servidor haya guardado las cantidades devueltas.
 */
export function calcularRendicion(evento, devoluciones) {
  const comision = Number(evento.comision_unidad) || 0;

  const filas = (evento.items || [])
    .map((i) => {
      const llevadas = Number(i.cantidad_llevada) || 0;
      const devueltas = devoluciones
        ? Number(devoluciones[i.id]) || 0
        : Number(i.cantidad_devuelta) || 0;
      // Unidades que no vendio la fiesta: se pagaron directo a nosotros, asi
      // que no pagan comision ni entran en lo que la fiesta tiene que rendir.
      const directas = devoluciones
        ? Number(devoluciones[`d${i.id}`]) || 0
        : Number(i.cantidad_directa) || 0;
      const precio = Number(i.precio) || 0;
      const precioDirecto = devoluciones
        ? Number(devoluciones[`p${i.id}`]) || precio
        : Number(i.precio_directo) || precio;
      const vendidas = llevadas - devueltas - directas;
      const { modelo, k } = partirProducto(i.producto);
      return {
        id: i.id,
        modelo,
        k,
        gusto: String(i.gusto).trim(),
        nombre: `${String(i.producto).trim()} - ${String(i.gusto).trim()}`,
        llevadas,
        devueltas,
        directas,
        precioDirecto,
        vendidas,
        precio,
        total: vendidas * precio,
        totalDirecto: directas * precioDirecto,
      };
    })
    // Primero lo que se vendio: es lo que se va a mirar al cobrar
    .sort((a, b) => b.vendidas - a.vendidas || a.nombre.localeCompare(b.nombre));

  const t = filas.reduce(
    (a, f) => ({
      llevadas: a.llevadas + f.llevadas,
      devueltas: a.devueltas + f.devueltas,
      vendidas: a.vendidas + f.vendidas,
      directas: a.directas + f.directas,
      facturado: a.facturado + f.total,
      facturadoDirecto: a.facturadoDirecto + f.totalDirecto,
    }),
    { llevadas: 0, devueltas: 0, vendidas: 0, directas: 0, facturado: 0, facturadoDirecto: 0 }
  );

  // `facturado` es sólo lo que vendió la fiesta: es la base de su comisión y de
  // lo que nos tiene que rendir. Lo cobrado directo va aparte.
  const comisionTotal = t.vendidas * comision;
  return {
    filas,
    ...t,
    comision,
    comisionTotal,
    aRendir: t.facturado - comisionTotal,
    numero: String(evento.id).padStart(5, "0"),
  };
}

/**
 * Filas del remito de entrega: lo que se le deja a la fiesta al empezar.
 * Ordenadas por modelo y gusto, que es como se cuentan las cajas.
 */
export function calcularEntrega(evento) {
  const filas = (evento.items || [])
    .map((i) => {
      const { modelo, k } = partirProducto(i.producto);
      return {
        id: i.id,
        modelo,
        k,
        gusto: String(i.gusto).trim(),
        llevadas: Number(i.cantidad_llevada) || 0,
        precio: Number(i.precio) || 0,
      };
    })
    .filter((f) => f.llevadas > 0)
    .sort((a, b) => a.modelo.localeCompare(b.modelo) || a.gusto.localeCompare(b.gusto));

  return {
    filas,
    unidades: filas.reduce((a, f) => a + f.llevadas, 0),
    modelos: new Set(filas.map((f) => f.modelo)).size,
    // Lo que entra si se vende todo, al precio de catálogo
    valor: filas.reduce((a, f) => a + f.llevadas * f.precio, 0),
    comision: Number(evento.comision_unidad) || 0,
    numero: String(evento.id).padStart(5, "0"),
  };
}

/**
 * Remito de entrega para imprimir y dejarle a la fiesta.
 * Comparte los estilos del comprobante de rendición: la columna "Control" va
 * vacía a propósito, para que cuenten a mano lo que recibieron.
 */
export function htmlEntrega(evento, datos) {
  return `
    <html><head><meta charset="utf-8"><title>Entrega ${esc(evento.nombre)}</title>
    <style>
      @page { margin: 0; }
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      body {
        background: #fff;
        font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
        color: #111; font-size: 12px; line-height: 1.4;
        margin: 0; padding: 14mm 15mm;
        -webkit-print-color-adjust: exact; print-color-adjust: exact;
      }
      .top { display: flex; align-items: flex-end; justify-content: space-between;
             gap: 24px; padding-bottom: 12px; border-bottom: 2px solid #111; }
      .marca { font-size: 9px; letter-spacing: .22em; text-transform: uppercase; color: #888; }
      h1 { font-size: 20px; letter-spacing: .02em; margin: 3px 0 6px; font-weight: 700; }
      .evento { font-size: 13px; font-weight: 600; }
      .lugar { color: #666; font-size: 11px; margin-top: 1px; }
      .meta { text-align: right; color: #666; font-size: 10px; white-space: nowrap; }
      .meta b { display: block; color: #111; font-size: 12px; font-weight: 600; }
      .logos { display: flex; gap: 14px; align-items: center; justify-content: flex-end;
               margin-bottom: 8px; }
      .logos img { height: 40px; width: auto; max-width: 110px; object-fit: contain; }

      .resumen { display: flex; gap: 10px; margin-top: 14px; }
      .resumen div { flex: 1; border: 1px solid #ddd; border-radius: 3px; padding: 8px 10px; }
      .resumen span { display: block; font-size: 8.5px; text-transform: uppercase;
                      letter-spacing: .1em; color: #888; }
      .resumen b { font-size: 16px; font-variant-numeric: tabular-nums; }

      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      thead { display: table-header-group; }
      thead th { font-size: 9px; text-transform: uppercase; letter-spacing: .09em;
                 color: #777; font-weight: 600; padding: 0 8px 7px; text-align: right;
                 border-bottom: 1px solid #ccc; }
      thead th:first-child { text-align: left; padding-left: 0; }
      tbody td { padding: 7px 8px; text-align: right; border-bottom: 1px solid #ededed;
                 font-variant-numeric: tabular-nums; }
      tbody td:first-child { text-align: left; padding-left: 0; }
      tbody tr { break-inside: avoid; }
      .modelo { font-weight: 600; }
      .puffs  { color: #999; font-size: 9.5px; margin-left: 3px; }
      .gusto  { color: #555; }
      .entregadas { font-weight: 700; }
      /* Casillero vacío para que la fiesta escriba lo que contó */
      .control { border-left: 1px solid #ddd; width: 78px; }
      tfoot td { padding: 9px 8px 0; text-align: right; font-weight: 700;
                 border-top: 1.5px solid #111; font-variant-numeric: tabular-nums; }
      tfoot td:first-child { text-align: left; padding-left: 0;
                             font-size: 9px; text-transform: uppercase; letter-spacing: .09em; }
      .pie { margin-top: 16px; padding: 11px 13px; background: #f6f6f6; border-radius: 3px;
             color: #666; font-size: 10px; line-height: 1.65; break-inside: avoid; }
    </style></head>
    <body>
      <div class="top">
        <div>
          <div class="marca">The North Shop</div>
          <h1>Entrega de mercadería</h1>
          <div class="evento">${esc(evento.nombre)}</div>
          ${evento.lugar ? `<div class="lugar">${esc(evento.lugar)}</div>` : ""}
        </div>
        <div class="meta">
          ${
            evento.logos?.length
              ? `<div class="logos">${evento.logos
                  .map((l) => `<img src="${esc(l)}" alt="">`)
                  .join("")}</div>`
              : ""
          }
          <b>N° ${datos.numero}</b>
          ${fecha(evento.fecha)}
        </div>
      </div>

      <div class="resumen">
        <div><span>Unidades entregadas</span><b>${datos.unidades}</b></div>
        <div><span>Modelos</span><b>${datos.modelos}</b></div>
        <div><span>Valor si se vende todo</span><b>${fmt(datos.valor)}</b></div>
      </div>

      <table>
        <colgroup><col><col width="78"><col width="74"><col width="78"></colgroup>
        <thead><tr>
          <th>Producto</th><th>Precio</th><th>Entregadas</th><th>Control</th>
        </tr></thead>
        <tbody>
          ${datos.filas
            .map(
              (f) => `<tr>
                <td><span class="modelo">${esc(f.modelo)}</span>${
                  f.k ? `<span class="puffs">${f.k}</span>` : ""
                } <span class="gusto">· ${esc(f.gusto)}</span></td>
                <td>${fmt(f.precio)}</td>
                <td class="entregadas">${f.llevadas}</td>
                <td class="control"></td>
              </tr>`
            )
            .join("")}
        </tbody>
        <tfoot><tr>
          <td>Total</td><td></td><td>${datos.unidades}</td><td class="control"></td>
        </tr></tfoot>
      </table>

      <div class="pie">
        Estas son las unidades que se dejan en el evento. La columna <b>Control</b> está
        vacía para contar lo recibido y anotarlo al lado.
        El precio es el de venta al público${
          datos.comision
            ? `; la fiesta retiene ${fmt(datos.comision)} por cada unidad vendida`
            : ""
        }. Lo que no se venda vuelve y reingresa a nuestro stock.
      </div>
    </body></html>`;
}

/** HTML completo de la hoja a imprimir. */
export function htmlRecibo(evento, datos) {
  return `
    <html><head><meta charset="utf-8"><title>Rendición ${esc(evento.nombre)}</title>
    <style>
      /* Margen de página en cero y el aire puesto en el contenido: con margen
         el navegador imprime arriba y abajo su propio encabezado (la fecha y
         la dirección de donde salió la hoja), y así no entra y no lo pone.
         El precio es que si algún evento ocupa dos hojas, la segunda arranca
         al ras del borde. */
      @page { margin: 0; }
      /* El comprobante es siempre en papel: se fija el esquema claro para que
         no salga invertido si el sistema está en modo oscuro. */
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      body {
        background: #fff;
        font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
        color: #111; font-size: 12px; line-height: 1.4;
        margin: 0; padding: 14mm 15mm;
        -webkit-print-color-adjust: exact; print-color-adjust: exact;
      }

      /* ── Encabezado ── */
      .top { display: flex; align-items: flex-end; justify-content: space-between;
             gap: 24px; padding-bottom: 12px; border-bottom: 2px solid #111; }
      .marca { font-size: 9px; letter-spacing: .22em; text-transform: uppercase; color: #888; }
      h1 { font-size: 20px; letter-spacing: .02em; margin: 3px 0 6px; font-weight: 700; }
      .evento { font-size: 13px; font-weight: 600; }
      .lugar { color: #666; font-size: 11px; margin-top: 1px; }
      .meta { text-align: right; color: #666; font-size: 10px; white-space: nowrap; }
      .meta b { display: block; color: #111; font-size: 12px; font-weight: 600; }
      .logos { display: flex; gap: 14px; align-items: center; justify-content: flex-end;
               margin-bottom: 8px; }
      .logos img { height: 40px; width: auto; max-width: 110px; object-fit: contain; }

      /* ── Detalle ── */
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      /* Si el evento tuvo muchos modelos y pasa a una segunda hoja, el
         encabezado se repite arriba en vez de dejar columnas sin nombre. */
      thead { display: table-header-group; }
      thead th { font-size: 9px; text-transform: uppercase; letter-spacing: .09em;
                 color: #777; font-weight: 600; padding: 0 8px 7px; text-align: right;
                 border-bottom: 1px solid #ccc; }
      thead th:first-child { text-align: left; padding-left: 0; }
      thead th:last-child  { padding-right: 0; }
      tbody td { padding: 6.5px 8px; text-align: right; border-bottom: 1px solid #ededed;
                 font-variant-numeric: tabular-nums; }
      tbody td:first-child { text-align: left; padding-left: 0; }
      tbody td:last-child  { padding-right: 0; font-weight: 600; }
      tbody tr { break-inside: avoid; }
      .modelo { font-weight: 600; }
      .puffs  { color: #999; font-size: 9.5px; margin-left: 3px; }
      .gusto  { color: #555; }
      /* Lo que no se vendió va tenue: se muestra para dejar constancia del
         conteo, pero no compite con lo que hay que cobrar. */
      .cero td { color: #aaa; }
      /* Las que se pagaron directo a nosotros: no las vendio la fiesta */
      .dir { color: #777; }
      .aclara { margin: 10px 0 0 auto; width: 320px; color: #666; font-size: 9.5px;
                line-height: 1.6; break-inside: avoid; }
      .cero .modelo, .cero .gusto { font-weight: 400; color: #aaa; }
      .vend { font-weight: 700; }
      tfoot td { padding: 9px 8px 0; text-align: right; font-weight: 700;
                 border-top: 1.5px solid #111; font-variant-numeric: tabular-nums; }
      tfoot td:first-child { text-align: left; padding-left: 0;
                             font-size: 9px; text-transform: uppercase; letter-spacing: .09em; }
      tfoot td:last-child { padding-right: 0; }

      /* ── Totales ── */
      .totales { margin: 22px 0 0 auto; width: 320px; break-inside: avoid; }
      .totales .ln { display: flex; justify-content: space-between; padding: 6px 12px;
                     color: #555; font-variant-numeric: tabular-nums; }
      .totales .fin { display: flex; justify-content: space-between; align-items: baseline;
                      background: #111; color: #fff; padding: 11px 12px; margin-top: 7px;
                      border-radius: 3px; }
      .totales .fin span:first-child { font-size: 9.5px; letter-spacing: .12em;
                                       text-transform: uppercase; }
      .totales .fin span:last-child { font-size: 18px; font-weight: 700;
                                      font-variant-numeric: tabular-nums; }

      /* ── Pie ── */
      .pie { margin-top: 16px; padding: 11px 13px; background: #f6f6f6; border-radius: 3px;
             color: #666; font-size: 10px; line-height: 1.65; break-inside: avoid; }
    </style></head>
    <body>
      <div class="top">
        <div>
          <div class="marca">The North Shop</div>
          <h1>Rendición de evento</h1>
          <div class="evento">${esc(evento.nombre)}</div>
          ${evento.lugar ? `<div class="lugar">${esc(evento.lugar)}</div>` : ""}
        </div>
        <div class="meta">
          ${
            evento.logos?.length
              ? `<div class="logos">${evento.logos
                  .map((l) => `<img src="${esc(l)}" alt="">`)
                  .join("")}</div>`
              : ""
          }
          <b>N° ${datos.numero}</b>
          ${fecha(evento.fecha)}
        </div>
      </div>

      <table>
        <colgroup>
          <col><col width="62"><col width="72">${
            datos.directas ? `<col width="62">` : ""
          }<col width="66"><col width="76"><col width="86">
        </colgroup>
        <thead><tr>
          <th>Producto</th><th>Dejadas</th><th>Devueltas</th>${
            datos.directas ? `<th>Directo</th>` : ""
          }<th>Vendidas</th><th>Precio</th><th>Total</th>
        </tr></thead>
        <tbody>
          ${datos.filas
            .map(
              (f) => `<tr class="${f.vendidas ? "" : "cero"}">
                <td><span class="modelo">${esc(f.modelo)}</span>${
                  f.k ? `<span class="puffs">${f.k}</span>` : ""
                } <span class="gusto">· ${esc(f.gusto)}</span></td>
                <td>${f.llevadas}</td>
                <td>${f.devueltas}</td>
                ${datos.directas ? `<td class="dir">${f.directas || ""}</td>` : ""}
                <td class="vend">${f.vendidas}</td>
                <td>${fmt(f.precio)}</td>
                <td>${fmt(f.total)}</td>
              </tr>`
            )
            .join("")}
        </tbody>
        <tfoot><tr>
          <td>Totales</td><td>${datos.llevadas}</td><td>${datos.devueltas}</td>
          ${datos.directas ? `<td>${datos.directas}</td>` : ""}
          <td>${datos.vendidas}</td><td></td><td>${fmt(datos.facturado)}</td>
        </tr></tfoot>
      </table>

      <div class="totales">
        <div class="ln"><span>Total facturado</span><span>${fmt(datos.facturado)}</span></div>
        <div class="ln"><span>Comisión de la fiesta · ${datos.vendidas} x ${fmt(
          datos.comision
        )}</span><span>− ${fmt(datos.comisionTotal)}</span></div>
        <div class="fin"><span>Total a rendir</span><span>${fmt(datos.aRendir)}</span></div>
      </div>

      ${
        datos.directas
          ? `<div class="aclara">
               <b>Directo:</b> ${datos.directas} ${
                 datos.directas === 1 ? "unidad que no vendió" : "unidades que no vendió"
               } la fiesta — ${
                 datos.directas === 1 ? "se abonó" : "se abonaron"
               } directamente a The North Shop.
               ${
                 datos.directas === 1 ? "No genera" : "No generan"
               } comisión y ${
                 datos.directas === 1 ? "no entra" : "no entran"
               } en el total a rendir.
             </div>`
          : ""
      }

      <div class="pie">
        La fiesta cobró al cliente el precio de catálogo y retiene ${fmt(
          datos.comision
        )} por cada unidad vendida. El total a rendir es lo facturado menos esa comisión.
        Se dejaron ${datos.llevadas} unidades y volvieron ${datos.devueltas}, que ya
        reingresaron a nuestro stock.
      </div>
    </body></html>`;
}
