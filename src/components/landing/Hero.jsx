import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, ShieldCheck } from "lucide-react";
import { supabase } from "../../utils/supabaseClient";

export default function Hero() {
  const [heroData, setHeroData] = useState({
    title: "Bangun kekuatan. Tingkatkan rekor. Jadilah juara.",
    subtitle: "Siripbiru Swim Club",
    action_url: "/register",
    image_url:
      "https://images.unsplash.com/photo-1530549387789-4c1017266635?q=80&w=2070&auto=format&fit=crop",
  });

  useEffect(() => {
    const fetchHero = async () => {
      const { data } = await supabase
        .from("landing_settings")
        .select("*")
        .eq("section", "hero")
        .single();

      if (data) setHeroData(data);
    };

    fetchHero();
  }, []);

  const isExternalUrl = heroData.action_url?.startsWith("http");

  return (
    <section className="relative w-full min-h-screen flex items-center justify-center lg:justify-end overflow-hidden px-6 lg:px-20 font-sans">
      {/* Gambar Latar Belakang & Gradien Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={
            heroData.image_url ||
            "https://images.unsplash.com/photo-1530549387789-4c1017266635?q=80&w=2070&auto=format&fit=crop"
          }
          alt="Perenang Profesional"
          className="w-full h-full object-cover object-center scale-105 transition-transform duration-1000 ease-out"
        />
        {/* Lapisan Gradien Gelap */}
        <div className="absolute inset-0 bg-[#0A192F]/75 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-l from-[#0A192F] via-[#0A192F]/60 to-transparent"></div>
      </div>

      {/* Efek Ambient Glow */}
      <div className="absolute top-1/4 right-10 w-96 h-96 bg-cyan-500/20 rounded-full blur-[130px] pointer-events-none"></div>

      {/* Konten Utama */}
      <div className="relative z-10 w-full max-w-2xl text-center lg:text-right pt-28 pb-16 flex flex-col items-center lg:items-end">
        {/* Badge Subjudul */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-cyan-300 text-xs font-black uppercase tracking-[0.25em] mb-6 shadow-sm">
          <Sparkles size={13} className="text-cyan-400" />
          <span>{heroData.subtitle}</span>
        </div>

        {/* Judul Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6 leading-[1.15] tracking-tight">
          {heroData.title}
        </h1>

        {/* Deskripsi Tambahan */}
        <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-8 max-w-xl font-medium">
          Kembangkan potensi teknik renang dengan bimbingan pelatih berlisensi dan sistem pencatatan presensi digital terintegrasi.
        </p>

        {/* Tombol Aksi */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {isExternalUrl ? (
            <a
              href={heroData.action_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-4 bg-cyan-400 hover:bg-cyan-300 text-[#0A192F] text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-cyan-400/20 transition-all duration-300 active:scale-95 flex items-center justify-center gap-2.5"
            >
              <span>Mulai Bergabung</span>
              <ArrowRight size={16} />
            </a>
          ) : (
            <Link
              to={heroData.action_url || "/register"}
              className="w-full sm:w-auto px-8 py-4 bg-cyan-400 hover:bg-cyan-300 text-[#0A192F] text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-cyan-400/20 transition-all duration-300 active:scale-95 flex items-center justify-center gap-2.5"
            >
              <span>Mulai Bergabung</span>
              <ArrowRight size={16} />
            </Link>
          )}

          <a
            href="#about"
            className="w-full sm:w-auto px-7 py-4 bg-white/10 hover:bg-white/15 text-white border border-white/15 text-xs font-bold uppercase tracking-widest rounded-2xl backdrop-blur-md transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            Pelajari Lebih Lanjut
          </a>
        </div>

        {/* Statistik Ringkas */}
        <div className="grid grid-cols-3 gap-6 pt-12 mt-12 border-t border-white/15 w-full max-w-lg">
          <div>
            <div className="text-2xl sm:text-3xl font-black text-white">100%</div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Pelatih Resmi</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-cyan-300">Presisi</div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Absensi QR</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-white">Prestasi</div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Kurikulum Nasional</div>
          </div>
        </div>
      </div>
    </section>
  );
}