import axios from "../utils/axiosInstance";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logoNorth from "../assets/logoNorth.png";

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);

    try {
      const res = await axios.post("/auth/login", { email, password });

      const token = res.data.token;
      localStorage.setItem("token", token);
      console.log("✅ Login exitoso, token guardado");

      if (onLoginSuccess) onLoginSuccess();

      navigate("/dashboard");
    } catch (error) {
      console.error(
        "❌ Error en login:",
        error.response?.data || error.message
      );
      alert(
        "Error en login: " + (error.response?.data?.error || "Algo salió mal")
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-div">
      <div className="d-flex justify-content-center align-items-center vh-100 div-login1">
        <form
          onSubmit={handleSubmit}
          style={{ width: "100%", maxWidth: "500px" }}
        >
          <h2 className="mb-4 text-start">Iniciar sesión</h2>

          <div className="div-input-login bg-transparent mb-3">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="input-login bg-transparent"
              placeholder="usuario@ejemplo.com"
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="mb-3 div-input-login">
            <label className="form-label">Contraseña</label>
            <input
              type="password"
              className="input-login"
              placeholder="••••••••"
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {cargando && (
            <div className="alert alert-dark text-center">
              <div
                className="spinner-border spinner-border-sm me-2"
                role="status"
              />
              Iniciando sesión...
            </div>
          )}

          <button
            type="submit"
            className="button-login w-100 mt-2"
            disabled={cargando}
          >
            {cargando ? "Iniciando sesión..." : "Iniciar sesión"}
          </button>
        </form>
      </div>
      <div className="div-login2 vh-100">
        <img src={logoNorth} alt="Logo North" />
      </div>
    </div>
  );
};

export default Login;
