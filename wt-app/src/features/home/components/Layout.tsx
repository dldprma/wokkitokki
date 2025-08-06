import React from "react";
import Nav from "./Nav";
import "../../../css/Layout.css";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="layout-container">
      <Nav />
      <main className="layout-main">{children}</main>
    </div>
  );
};

export default Layout;
