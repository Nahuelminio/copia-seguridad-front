import React, { useState } from "react";
import axios from "axios";

function ImportadorExcel({ onImportar }) {
  const [archivo, setArchivo] = useState(null);
  const [mensaje, setMensaje] = useState("");

  const handleUpload = () => {
    if (!archivo) return alert("Seleccioná un archivo Excel");

    const formData = new FormData();
    formData.append("archivo", archivo);

    axios
      .post(
        `${process.env.REACT_APP_API_URL}/importar-excel`,
        formData
      )
      .then((res) => {
        const { insertados = [], errores = [] } = res.data;
        setMensaje(
          `✔ ${insertados.length} productos importados. ❌ ${errores.length} errores.`
        );
        if (onImportar) onImportar();
      })
      .catch(() => alert("Error al subir el archivo"));
  };

  const handleExport = () => {
    axios
      .get(`${process.env.REACT_APP_API_URL}/exportar-excel`, {
        responseType: "blob",
      })
      .then((res) => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "productos_exportados.xlsx");
        document.body.appendChild(link);
        link.click();
      })
      .catch(() => alert("Error al exportar productos"));
  };

  return (
    <div className="card mb-4">
      <div className="card-header">Importar / Exportar productos Excel</div>
      <div className="card-body">
        <input
          
          type="file"
          accept=".xlsx"
          onChange={(e) => setArchivo(e.target.files[0])}
        />
        <button className="btn btn-dark ms-5 mt-3" onClick={handleUpload}>
          📥 Importar
        </button>
        <button
          className="btn btn-outline-dark ms-5 mt-3"
          onClick={handleExport}
        >
          📤 Exportar
        </button>
        {mensaje && <p className="mt-3">{mensaje}</p>}
      </div>
    </div>
  );
}

export default ImportadorExcel;
