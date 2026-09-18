/**
 * Manda a imprimir una hoja suelta (HTML completo, con sus propios estilos).
 *
 * Se usa un iframe con `srcdoc` y no document.write() sobre una ventana nueva:
 * escribiendo el documento a mano el navegador lo pinta mientras se parsea y
 * salía cada texto duplicado ("RendRendición"). El iframe además no lo bloquea
 * el filtro de pop-ups, y al ser un documento aparte no arrastra los estilos
 * oscuros del sistema al papel.
 */
export default function imprimirHoja(html) {
  const marco = document.createElement("iframe");
  marco.setAttribute("aria-hidden", "true");
  // Fuera de la vista pero con tamaño real: en display:none el navegador no le
  // calcula el layout y sale la hoja en blanco.
  Object.assign(marco.style, {
    position: "fixed",
    right: 0,
    bottom: 0,
    width: "210mm",
    height: "297mm",
    border: "0",
    opacity: "0",
    pointerEvents: "none",
  });

  marco.onload = () => {
    const v = marco.contentWindow;
    const lanzar = () => {
      v.focus();
      v.print();
      // Recién se saca cuando el diálogo se cerró, si no se cancela la impresión
      setTimeout(() => marco.remove(), 1000);
    };
    // Espera a las fuentes y a las imágenes (los logos del evento)
    if (v.document.fonts?.ready) v.document.fonts.ready.then(() => setTimeout(lanzar, 60));
    else setTimeout(lanzar, 200);
  };

  marco.srcdoc = html;
  document.body.appendChild(marco);
}
