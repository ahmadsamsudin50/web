import React, { useState, useEffect } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  LayoutTemplate,
  Users,
  UserPlus,
  Layers,
  CalendarDays,
  ScanLine,
  ClipboardList,
  ClipboardEdit,
  CreditCard,
  Bell,
  LogOut,
  Menu,
} from "lucide-react";

export default function LayoutAdmin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminName, setAdminName] = useState("Pengelola");
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem("user_session");
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        if (user.full_name) {
          setAdminName(user.full_name);
        }
      } catch (_) {}
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user_session");
    navigate("/login");
  };

  const menuItems = [
    { name: "Gambaran Umum", path: "/admin", icon: <LayoutDashboard size={20} /> },
    {
      name: "Halaman Utama",
      path: "/admin/landing",
      icon: <LayoutTemplate size={20} />,
    },
    { name: "Tingkat Kelas", path: "/admin/classes", icon: <Layers size={20} /> },
    { name: "Registri Atlet", path: "/admin/students", icon: <Users size={20} /> },
    { name: "Kelola Instruktur", path: "/admin/coaches", icon: <UserPlus size={20} /> },
    {
      name: "Verifikasi Pembayaran",
      path: "/admin/payments",
      icon: <CreditCard size={20} />,
    },
    {
      name: "Sesi Latihan",
      path: "/admin/sessions",
      icon: <CalendarDays size={20} />,
    },
    {
      name: "Pengumuman",
      path: "/admin/announcements",
      icon: <Bell size={20} />,
    },
    { name: "Pemindai QR", path: "/admin/scan", icon: <ScanLine size={20} /> },
    {
      name: "Presensi Manual",
      path: "/admin/manual-entry",
      icon: <ClipboardEdit size={20} />,
    },
    {
      name: "Rekapitulasi",
      path: "/admin/recap",
      icon: <ClipboardList size={20} />,
    },
  ];

  const getPageTitle = () => {
    const current = menuItems.find((item) => item.path === location.pathname);
    return current ? current.name : "Panel Administrasi";
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          flex flex-col shadow-2xl lg:shadow-none
          bg-[#0a192f] text-white
          transition-all duration-300 ease-in-out
          ${
            sidebarOpen
              ? "w-64 translate-x-0"
              : "-translate-x-full lg:translate-x-0 lg:w-20 lg:hover:w-64 group overflow-hidden"
          }
        `}
      >
        {/* Logo Area */}
        <div className="h-20 px-5 flex items-center border-b border-white/10 shrink-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden bg-transparent">
            {!imgError ? (
              <img
                src="/sirip_biru.webp"
                alt="Logo Siripbiru"
                className="w-full h-full object-contain"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full bg-blue-600 flex items-center justify-center rounded-xl text-white font-black text-xs">
                SB
              </div>
            )}
          </div>
          <span
            className={`ml-3 font-black text-xl tracking-tight whitespace-nowrap transition-opacity duration-300 ${
              sidebarOpen
                ? "opacity-100"
                : "opacity-0 lg:group-hover:opacity-100"
            }`}
          >
            Sirip<span className="text-cyan-400">biru</span>
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <p
            className={`px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 transition-opacity duration-300 ${
              sidebarOpen
                ? "opacity-100"
                : "opacity-0 lg:group-hover:opacity-100"
            }`}
          >
            Menu Manajemen
          </p>

          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() =>
                  window.innerWidth < 1024 && setSidebarOpen(false)
                }
                title={item.name}
                className={`flex items-center gap-4 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all duration-200 ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className="shrink-0">{item.icon}</div>
                <span
                  className={`whitespace-nowrap transition-opacity duration-300 ${
                    sidebarOpen
                      ? "opacity-100"
                      : "opacity-0 lg:group-hover:opacity-100"
                  }`}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* User / Logout Area */}
        <div className="p-4 border-t border-white/10 shrink-0">
          <button
            onClick={handleLogout}
            title="Keluar Akun"
            className="w-full flex items-center gap-4 px-3.5 py-3 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 rounded-2xl text-xs font-bold transition-all group/logout"
          >
            <div className="shrink-0 group-hover/logout:scale-110 transition-transform">
              <LogOut size={20} />
            </div>
            <span
              className={`whitespace-nowrap transition-opacity duration-300 ${
                sidebarOpen
                  ? "opacity-100"
                  : "opacity-0 lg:group-hover:opacity-100"
              }`}
            >
              Keluar Akun
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 lg:px-8 flex items-center justify-between z-10 sticky top-0 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors lg:hidden"
              aria-label="Buka Menu"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-extrabold text-slate-800 tracking-tight hidden sm:block">
              {getPageTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <p className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[200px]">
                {adminName}
              </p>
              <p className="text-[11px] text-blue-600 font-semibold mt-0.5">
                Administrator Klub
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-black text-xs shadow-sm">
              {adminName?.[0]?.toUpperCase() || "A"}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[#f8fafc]">
          <div className="animate-in fade-in duration-300 h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}