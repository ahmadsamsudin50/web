import React, { useEffect, useState } from "react";
import { Check, Droplets, Activity, Medal, Star, Sparkles, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "../../utils/supabaseClient";

const iconMap = { Droplets, Activity, Medal, Star };

export default function Course() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchCourses = async () => {
      try {
        const { data } = await supabase
          .from("landing_courses")
          .select("*")
          .order("created_at", { ascending: true });
        if (mounted) setCourses(data || []);
      } catch (e) {
        if (mounted) setCourses([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchCourses();
    return () => {
      mounted = false;
    };
  }, []);

  // Deteksi tampilan mobile vs desktop
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Batas jumlah kartu awal: 1 untuk mobile, 3 untuk desktop
  const initialLimit = isMobile ? 1 : 3;
  const displayedCourses = isExpanded ? courses : courses.slice(0, initialLimit);
  const canToggle = courses.length > initialLimit;

  return (
    <section
      id="course"
      className="relative py-24 lg:py-32 px-6 bg-[#0a192f] overflow-hidden font-sans text-white border-t border-slate-800"
    >
      {/* Efek Cahaya Latar */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-10 -right-32 w-96 h-96 bg-cyan-500/15 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header Bagian */}
        <div className="text-center max-w-2xl mx-auto mb-16 lg:mb-20">
          <span className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300 bg-cyan-950/80 border border-cyan-500/30 px-4 py-1.5 rounded-full inline-flex items-center gap-2 mb-4 shadow-sm">
            <Sparkles size={13} className="text-cyan-400" /> Program Pelatihan
          </span>
          <h3 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
            Pilihan Kelas <span className="text-cyan-400">Renang Terbaik</span>
          </h3>
          <p className="text-slate-400 text-sm md:text-base mt-3 font-medium leading-relaxed">
            Kurikulum bertingkat yang dirancang terstruktur dari pengenalan air hingga persiapan kejuaraan profesional.
          </p>
        </div>

        {/* Grid Kartu Program */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[460px] rounded-[2.5rem] bg-white/[0.03] border border-white/10 animate-pulse p-8"
              ></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
            {displayedCourses.map((c, idx) => {
              const Icon = iconMap[c.icon_name] || Star;
              const isPopular = idx === 1;

              return (
                <div
                  key={c.id}
                  className={`relative rounded-[2.5rem] p-8 flex flex-col justify-between transition-all duration-300 group hover:-translate-y-2 ${
                    isPopular
                      ? "bg-gradient-to-b from-blue-900/60 to-[#0d223f] border-2 border-cyan-400/80 shadow-2xl shadow-cyan-500/10"
                      : "bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-cyan-400/40 shadow-xl"
                  }`}
                >
                  {/* Badge Unggulan */}
                  {isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-400 to-blue-500 text-[#0a192f] text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full shadow-md">
                      Paling Diminati
                    </div>
                  )}

                  <div>
                    {/* Header Kartu */}
                    <div className="flex items-center justify-between gap-4 mb-6">
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                          isPopular
                            ? "bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-400/20"
                            : "bg-white/10 text-cyan-400 group-hover:bg-cyan-400 group-hover:text-slate-950"
                        }`}
                      >
                        <Icon size={26} strokeWidth={2} />
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black text-white tracking-tight">
                          {c.price}
                        </span>
                        <span className="block text-[11px] text-slate-400 font-medium">
                          per periode paket
                        </span>
                      </div>
                    </div>

                    <h4 className="text-xl font-bold text-white mb-2 tracking-tight group-hover:text-cyan-300 transition-colors">
                      {c.title}
                    </h4>

                    <p className="text-xs text-slate-400 leading-relaxed mb-6 font-normal min-h-[38px] line-clamp-2">
                      {c.description}
                    </p>

                    <div className="h-px bg-white/10 mb-6"></div>

                    {/* Daftar Fasilitas */}
                    <div className="space-y-3 mb-8">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Fasilitas Termasuk:
                      </p>
                      <ul className="space-y-2.5">
                        {c.features?.map((f, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2.5 text-xs text-slate-300 font-medium"
                          >
                            <div className="w-4 h-4 rounded-full bg-cyan-400/20 text-cyan-300 flex items-center justify-center shrink-0 mt-0.5">
                              <Check size={11} strokeWidth={3} />
                            </div>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Tombol Aksi */}
                  <a
                    href="/register"
                    className={`w-full py-3.5 px-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md ${
                      isPopular
                        ? "bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black shadow-cyan-400/20"
                        : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
                    }`}
                  >
                    Daftar Kelas Ini
                    <ChevronRight size={15} />
                  </a>
                </div>
              );
            })}
          </div>
        )}

        {courses.length === 0 && !loading && (
          <div className="text-center py-16 bg-white/5 rounded-3xl border border-white/10 max-w-md mx-auto">
            <p className="text-slate-400 text-sm font-medium">
              Belum ada paket program yang dipublikasikan.
            </p>
          </div>
        )}

        {/* Tombol Muat Lebih Banyak / Tutup */}
        {!loading && canToggle && (
          <div className="mt-14 flex justify-center">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-cyan-300 font-bold text-xs tracking-wider uppercase transition-all duration-300 active:scale-95 shadow-lg backdrop-blur-md"
            >
              {isExpanded ? (
                <>
                  <span>Tutup</span>
                  <ChevronUp size={16} />
                </>
              ) : (
                <>
                  <span>Muat Lebih Banyak</span>
                  <ChevronDown size={16} />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}