import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Menu, X, LogIn } from "lucide-react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-all duration-300 font-sans ${
        scrolled
          ? "bg-[#0a192f]/90 backdrop-blur-md shadow-xl shadow-slate-950/20 py-3.5 border-b border-white/10"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center relative">
        {/* Identitas Logo Statis (Tanpa Efek Hover) */}
        <Link to="/" className="flex items-center gap-2.5 z-50">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-sm shadow-md shadow-blue-600/30 overflow-hidden shrink-0">
            <img
              src="/sirip_biru.webp"
              alt="Logo Siripbiru"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          </div>
          <span className="font-black text-xl tracking-tight text-white">
            Sirip<span className="text-cyan-400">biru</span>
          </span>
        </Link>

        {/* Menu Navigasi Desktop */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-widest text-slate-300">
          <a
            href="#about"
            className="hover:text-cyan-400 transition-colors pb-1 border-b-2 border-transparent hover:border-cyan-400"
          >
            Tentang
          </a>

          <a
            href="#course"
            className="hover:text-cyan-400 transition-colors pb-1 border-b-2 border-transparent hover:border-cyan-400"
          >
            Program
          </a>

          <a
            href="#coach"
            className="hover:text-cyan-400 transition-colors pb-1 border-b-2 border-transparent hover:border-cyan-400"
          >
            Pelatih
          </a>

          <a
            href="#testimonials"
            className="hover:text-cyan-400 transition-colors pb-1 border-b-2 border-transparent hover:border-cyan-400"
          >
            Ulasan
          </a>
        </nav>

        {/* Tombol Masuk Portal Desktop */}
        <div className="hidden md:flex items-center gap-3 z-50">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-black uppercase tracking-wider transition-all duration-300 shadow-md shadow-cyan-400/20 active:scale-95"
          >
            <span>Masuk Portal</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Tombol Menu Seluler */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden text-white z-50 p-2 rounded-xl bg-white/5 border border-white/10"
          aria-label={isMobileMenuOpen ? "Tutup menu" : "Buka menu"}
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Menu Dropdown Seluler */}
      <div
        className={`md:hidden absolute top-full left-0 w-full bg-[#0a192f]/95 backdrop-blur-xl border-t border-white/10 transition-all duration-300 overflow-hidden shadow-2xl ${
          isMobileMenuOpen ? "max-h-96 opacity-100 py-6" : "max-h-0 opacity-0 py-0"
        }`}
      >
        <div className="flex flex-col px-6 gap-5">
          <a
            href="#about"
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-cyan-400 transition-colors"
          >
            Tentang
          </a>

          <a
            href="#course"
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-cyan-400 transition-colors"
          >
            Program
          </a>

          <a
            href="#coach"
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-cyan-400 transition-colors"
          >
            Pelatih
          </a>

          <a
            href="#testimonials"
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-cyan-400 transition-colors"
          >
            Ulasan
          </a>

          <div className="h-px w-full bg-white/10 my-1"></div>

          <Link
            to="/login"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-cyan-400 text-slate-950 text-xs font-black uppercase tracking-wider shadow-md active:scale-95"
          >
            <LogIn size={15} />
            <span>Masuk Portal</span>
          </Link>
        </div>
      </div>
    </header>
  );
}