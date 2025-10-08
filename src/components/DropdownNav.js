import React, { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";

function DropdownNav({ id, label, icon, routes }) {
  const location = useLocation();
  const dropdownRef = useRef(null);

  const isActive = routes.some((r) => location.pathname === r.path);

  // Mostrar / ocultar menú
  const toggleDropdown = (e) => {
    e.preventDefault();
    const el = document.getElementById(id);
    new window.bootstrap.Dropdown(el).toggle();
  };

  // Cerrar si se hace clic fuera del dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        const el = document.getElementById(id);
        const bsDropdown = window.bootstrap?.Dropdown.getInstance(el);
        if (bsDropdown) bsDropdown.hide();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [id]);

  return (
    <li className="nav-item dropdown" ref={dropdownRef}>
      <div className="dropdown">
        <button
          className={`btn btn-link nav-link dropdown-toggle text-white ${
            isActive ? "active" : ""
          }`}
          type="button"
          id={id}
          onClick={toggleDropdown}
        >
          {icon} {label}
        </button>
        <ul className="dropdown-menu dropdown-menu-dark" aria-labelledby={id}>
          {routes.map((item, i) => (
            <li key={i}>
              <Link
                className="dropdown-item"
                to={item.path}
                onClick={item.onClick}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}

export default DropdownNav;
