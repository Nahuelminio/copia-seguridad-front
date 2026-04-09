export default function ClienteForm({
  form,
  setForm,
  onSubmit,
  onCancel,
  editando,
  loading,
  sucursales = [],
  esAdmin = false,
}) {
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  return (
    <form className="clientes-form" onSubmit={onSubmit}>
      <div className="clientes-form-header">
        <h2>{editando ? "Editar cliente" : "Nuevo cliente"}</h2>

        {editando && (
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>

      <div className="field">
        <label>Nombre</label>
        <input
          type="text"
          name="nombre"
          value={form.nombre}
          onChange={handleChange}
          placeholder="Ej: Juan Pérez"
          required
        />
      </div>

      <div className="field">
        <label>Teléfono</label>
        <input
          type="text"
          name="telefono"
          value={form.telefono}
          onChange={handleChange}
          placeholder="Ej: 3764123456"
          required
        />
      </div>

      {esAdmin && (
        <div className="field">
          <label>Sucursal</label>
          <select
            name="sucursal_id"
            value={form.sucursal_id}
            onChange={handleChange}
          >
            <option value="">Sin sucursal</option>
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="field">
        <label>Observaciones</label>
        <textarea
          name="observaciones"
          value={form.observaciones}
          onChange={handleChange}
          placeholder="Datos extra del cliente"
          rows={4}
        />
      </div>

      <label className="checkbox-row">
        <input
          type="checkbox"
          name="activo"
          checked={form.activo}
          onChange={handleChange}
        />
        Recibe avisos
      </label>

      <div className="clientes-actions">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading
            ? "Guardando..."
            : editando
              ? "Guardar cambios"
              : "Crear cliente"}
        </button>

        {editando && (
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Limpiar
          </button>
        )}
      </div>
    </form>
  );
}
