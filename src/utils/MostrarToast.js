export const mostrarToast = (mensaje, tipo = "success") => {
  const colores = {
    success: { fondo: "#d1e7dd", texto: "#0f5132", icono: "✅" },
    danger: { fondo: "#f8d7da", texto: "#842029", icono: "❌" },
    warning: { fondo: "#fff3cd", texto: "#664d03", icono: "⚠️" },
    info: { fondo: "#cff4fc", texto: "#055160", icono: "ℹ️" },
  };

  const estilo = colores[tipo] || colores.info;

  // Crear o obtener contenedor central
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    `;
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.setAttribute("role", "alert");
  toast.setAttribute("aria-live", "assertive");
  toast.setAttribute("aria-atomic", "true");

  toast.style.cssText = `
    background: ${estilo.fondo};
    color: ${estilo.texto};
    border-left: 5px solid ${estilo.texto};
    padding: 12px 20px;
    min-width: 280px;
    border-radius: 10px;
    box-shadow: 0 0 15px rgba(0,0,0,0.2);
    opacity: 0;
    transition: opacity 0.4s ease;
  `;

  toast.innerHTML = `
    <div class="d-flex justify-content-between align-items-center gap-3">
      <div class="fw-semibold">${estilo.icono} ${mensaje}</div>
      <button class="btn btn-sm btn-close" style="filter: invert(1);" onclick="this.closest('div[role=alert]').remove()"></button>
    </div>
  `;

  container.appendChild(toast);

  // Mostrar con animación
  setTimeout(() => {
    toast.style.opacity = "1";
  }, 10);

  // Ocultar y eliminar
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => {
      toast.remove();
      if (!container.hasChildNodes()) {
        container.remove();
      }
    }, 300);
  }, 3000);
};
