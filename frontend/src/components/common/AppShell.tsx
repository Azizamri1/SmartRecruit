import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import BackgroundAnimation from "./BackgroundAnimation";

const HIDE_ON = [
  "/", "/register", "/forgot-password",
  "/auth/signin", "/candidate/signup", "/company/signup"
];

export default function AppShell() {
  const { pathname } = useLocation();
  const hide = HIDE_ON.includes(pathname);
  return (
    <div className="app-shell" style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <BackgroundAnimation />   {/* always on, all routes */}
      {!hide && <Navbar />}
      <main className={hide ? "no-nav" : "with-nav"} style={{ flex: "1 1 0%", paddingBottom: "120px" }}>
        <Outlet />
      </main>
      {!hide && <Footer />}
    </div>
  );
}
