import React from "react";
import Sidebar from "./Navbar";

function Layout({ children }) {
  return (
    <div className="app-container d-flex">
      <Sidebar />
      <main className="main-content">
        <div className="container-fluid py-4">{children}</div>
      </main>
    </div>
  );
}

export default Layout;
