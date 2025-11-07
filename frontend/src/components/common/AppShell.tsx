/**
 * Main application shell that provides consistent layout structure.
 * Includes navigation, footer, and background elements for authenticated routes.
 */

import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import BackgroundAnimation from "./BackgroundAnimation";

// Routes where navigation elements should be hidden (auth pages)
const AUTH_ROUTES = [
  "/",
  "/register",
  "/forgot-password",
  "/auth/signin",
  "/candidate/signup",
  "/company/signup"
];

export default function AppShell() {
  const { pathname } = useLocation();
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  return (
    <div
      className="app-shell"
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column"
      }}
    >
      {/* Background animation visible on all routes */}
      <BackgroundAnimation />

      {/* Navigation bar (hidden on auth routes) */}
      {!isAuthRoute && <Navbar />}

      {/* Main content area */}
      <main
        className={isAuthRoute ? "no-nav" : "with-nav"}
        style={{
          flex: "1 1 0%",
          paddingBottom: "120px"
        }}
      >
        <Outlet />
      </main>

      {/* Footer (hidden on auth routes) */}
      {!isAuthRoute && <Footer />}
    </div>
  );
}
