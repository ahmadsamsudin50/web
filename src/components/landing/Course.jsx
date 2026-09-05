import React, { useEffect, useState } from "react";
import {
  Check,
  Droplets,
  Activity,
  Medal,
  Star,
  Sparkles,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search,
  X,
  Tag,
  Bookmark,
  Users,
} from "lucide-react";
import { supabase } from "../../utils/supabaseClient";

const iconMap = { Droplets, Activity, Medal, Star };

const CATEGORIES = [
  { key: "all", label: "Semua Kategori" },
  { key: "anak-anak", label: "Anak-anak" },
  { key: "dewasa", label: "Dewasa" },
  { key: "profesional", label: "Profesional" },
  { key: "intensif", label: "Intensif" },
];

export default function Course() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [visibleCount, setVisibleCount] = useState(3);

  useEffect(() => {
    let mounted = true;
    const fetchEnrichedClasses = async () => {
      try {
        // Ambil data classes, enrollments, dan landing_courses secara paralel
        const [classRes, enrollRes, landingRes] = await Promise.all([
          supabase
            .from("classes")
            .select("id, name, category, price, max_sessions, max_capacity, created_at")
            .order("created_at", { ascending: true }),
          supabase
            .from("student_enrollments")
            .select("class_id")
            .in("status", ["active", "completed"]),
          supabase
            .from("landing_courses")
            .select("title, description, features, icon_name"),
        ]);

        if (classRes.error) throw classRes.error;

        const countMap = {};
        (enrollRes.data || []).forEach((item) => {
          countMap[item.class_id] = (countMap[item.class_id] || 0) + 1;
        });

        // Buat lookup dictionary untuk deskripsi dari landing_courses
        const landingMap = {};
        (landingRes.data || []).forEach((item) => {
          if (item.title) {
            landingMap[item.title.trim().toLowerCase()] = item;
          }
        });

        const formatted = (classRes.data || []).map((c) => {
          const maxCap = Number(c.max_capacity) || 20;
          const enrolled = Number(countMap[c.id]) || 0;
          const remaining = Math.max(0, maxCap - enrolled);

          // Ambil rincian dari landing_courses bila ada yang cocok dengan nama kelas
          const matchedLanding = landingMap[c.name.trim().toLowerCase()];

          return {
            id: c.id,
            title: c.name,
            category: c.category || "anak-anak",
            price: c.price,
            max_sessions: c.max_sessions || 12,
            max_capacity: maxCap,
            enrolled_count: enrolled,
            remaining_seats: remaining,
            is_full: remaining <= 0,
            // Deskripsi dari landing_courses (dengan fallback)
            description:
              matchedLanding?.description ||
              `Program latihan renang ${c.name} dengan kurikulum terstruktur dan pendampingan pelatih berpengalaman.`,
            features:
              matchedLanding?.features && matchedLanding.features.length > 0
                ? matchedLanding.features
                : null,
            icon_name: matchedLanding?.icon_name || null,
          };
        });

        if (mounted) setCourses(formatted);
      } catch (err) {
        if (mounted) setCourses([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchEnrichedClasses();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 640;
      setIsMobile(mobile);
      setVisibleCount(mobile ? 1 : 3);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setVisibleCount(isMobile ? 1 : 3);
  }, [searchQuery, selectedCategory, isMobile]);

  const formatRupiah = (number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(Number(number) || 0);
  };

  const getIconElement = (course) => {
    if (course.icon_name && iconMap[course.icon_name]) {
      const IconComponent = iconMap[course.icon_name];
      return <IconComponent size={26} strokeWidth={2} />;
    }
    switch (course.category?.toLowerCase()) {
      case "profesional":
        return <Medal size={26} strokeWidth={2} />;
      case "dewasa":
        return <Activity size={26} strokeWidth={2} />;
      case "intensif":
        return <Star size={26} strokeWidth={2} />;
      default:
        return <Droplets size={26} strokeWidth={2} />;
    }
  };

  const getCategoryBadgeClass = (category, isPopular) => {
    if (isPopular) {
      return "bg-cyan-400/20 text-cyan-200 border-cyan-400/30";
    }
    switch (category?.toLowerCase()) {
      case "anak-anak":
        return "bg-cyan-500/10 text-cyan-300 border-cyan-500/25";
      case "dewasa":
        return "bg-blue-500/10 text-blue-300 border-blue-500/25";
      case "profesional":
        return "bg-purple-500/10 text-purple-300 border-purple-500/25";
      case "intensif":
        return "bg-amber-500/10 text-amber-300 border-amber-500/25";
      default:
        return "bg-white/10 text-slate-300 border-white/15";
    }
  };

  const filteredCourses = courses.filter((c) => {
    const q = searchQuery.toLowerCase();
    const titleMatch = c.title?.toLowerCase().includes(q);
    const descMatch = c.description?.toLowerCase().includes(q);
    const searchMatch = titleMatch || descMatch;

    const categoryMatch =
      selectedCategory === "all" ||
      c.category?.toLowerCase() === selectedCategory;

    return searchMatch && categoryMatch;
  });

  const initialLimit = isMobile ? 1 : 3;
  const step = isMobile ? 1 : 3;
  const isAllLoaded = visibleCount >= filteredCourses.length;
  const displayedCourses = filteredCourses.slice(0, visibleCount);

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + step);
  };

  const handleCollapse = () => {
    setVisibleCount(initialLimit);
    const courseSection = document.getElementById("course");
    if (courseSection) {
      courseSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section
      id="course"
      className="relative py-24 lg:py-32 px-6 bg-[#0a192f] overflow-hidden font-sans text-white border-t border-slate-800"
    >
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-10 -right-32 w-96 h-96 bg-cyan-500/15 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
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

        {/* Tab Filter Kategori */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {CATEGORIES.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedCategory(tab.key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedCategory === tab.key
                  ? "bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/20"
                  : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Input Pencarian */}
        <div className="max-w-md mx-auto mb-14">
          <div className="relative flex items-center">
            <Search size={18} className="absolute left-4 text-cyan-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama kelas atau materi pelatihan..."
              className="w-full pl-11 pr-10 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all backdrop-blur-md"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 p-1 text-slate-400 hover:text-white rounded-full transition-colors"
                title="Hapus pencarian"
              >
                <X size={16} />
              </button>
            )}
          </div>
          {(searchQuery || selectedCategory !== "all") && (
            <p className="text-center text-xs text-cyan-300/80 mt-2.5">
              Menemukan {filteredCourses.length} kelas pelatihan
            </p>
          )}
        </div>

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
              const isPopular = idx === 1;
              const categoryLabel =
                CATEGORIES.find((opt) => opt.key === c.category?.toLowerCase())?.label ||
                c.category;

              return (
                <div
                  key={c.id}
                  className={`relative rounded-[2.5rem] p-8 flex flex-col justify-between transition-all duration-300 group hover:-translate-y-2 ${
                    isPopular
                      ? "bg-gradient-to-b from-blue-900/60 to-[#0d223f] border-2 border-cyan-400/80 shadow-2xl shadow-cyan-500/10"
                      : "bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-cyan-400/40 shadow-xl"
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-400 to-blue-500 text-[#0a192f] text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full shadow-md">
                      Paling Diminati
                    </div>
                  )}

                  <div>
                    {/* Header Kartu */}
                    <div className="flex items-center justify-between gap-4 mb-5">
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                          isPopular
                            ? "bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-400/20"
                            : "bg-white/10 text-cyan-400 group-hover:bg-cyan-400 group-hover:text-slate-950"
                        }`}
                      >
                        {getIconElement(c)}
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black text-white tracking-tight">
                          {formatRupiah(c.price)}
                        </span>
                        <span className="block text-[11px] text-slate-400 font-medium">
                          per paket program
                        </span>
                      </div>
                    </div>

                    {/* Tag Kategori */}
                    <div className="mb-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border backdrop-blur-sm ${getCategoryBadgeClass(
                          c.category,
                          isPopular
                        )}`}
                      >
                        <Tag size={10} className="shrink-0" />
                        <span>{categoryLabel}</span>
                      </span>
                    </div>

                    <h4 className="text-xl font-bold text-white mb-2 tracking-tight group-hover:text-cyan-300 transition-colors">
                      {c.title}
                    </h4>

                    <p className="text-xs text-slate-400 leading-relaxed mb-6 font-normal min-h-[38px] line-clamp-2">
                      {c.description}
                    </p>

                    <div className="h-px bg-white/10 my-6"></div>

                    {/* Fasilitas & Target Pertemuan */}
                    <div className="space-y-3 mb-8">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Fasilitas & Ketentuan:
                      </p>
                      <ul className="space-y-2.5 text-xs text-slate-300 font-medium">
                        <li className="flex items-center gap-2.5">
                          <div className="w-4 h-4 rounded-full bg-cyan-400/20 text-cyan-300 flex items-center justify-center shrink-0">
                            <Bookmark size={11} strokeWidth={3} />
                          </div>
                          <span>Target Pertemuan: <b>{c.max_sessions} Sesi Latihan</b></span>
                        </li>

                        {/* Tampilkan fitur kustom dari landing_courses jika ada */}
                        {c.features && c.features.length > 0 ? (
                          c.features.slice(0, 2).map((feat, fIdx) => (
                            <li key={fIdx} className="flex items-center gap-2.5">
                              <div className="w-4 h-4 rounded-full bg-cyan-400/20 text-cyan-300 flex items-center justify-center shrink-0">
                                <Check size={11} strokeWidth={3} />
                              </div>
                              <span className="truncate">{feat}</span>
                            </li>
                          ))
                        ) : (
                          <>
                            <li className="flex items-center gap-2.5">
                              <div className="w-4 h-4 rounded-full bg-cyan-400/20 text-cyan-300 flex items-center justify-center shrink-0">
                                <Check size={11} strokeWidth={3} />
                              </div>
                              <span>Akses Presensi Kartu QR Digital Mandiri</span>
                            </li>
                            <li className="flex items-center gap-2.5">
                              <div className="w-4 h-4 rounded-full bg-cyan-400/20 text-cyan-300 flex items-center justify-center shrink-0">
                                <Check size={11} strokeWidth={3} />
                              </div>
                              <span>Bimbingan Instruktur Berlisensi Resmi</span>
                            </li>
                          </>
                        )}
                      </ul>
                    </div>
                  </div>

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

        {filteredCourses.length === 0 && !loading && (
          <div className="text-center py-16 bg-white/5 rounded-3xl border border-white/10 max-w-md mx-auto">
            <p className="text-slate-400 text-sm font-medium">
              Tidak ada kelas yang sesuai dengan filter atau kata kunci pencarian.
            </p>
          </div>
        )}

        {!loading && filteredCourses.length > initialLimit && (
          <div className="mt-14 flex justify-center">
            {!isAllLoaded ? (
              <button
                onClick={handleLoadMore}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-cyan-300 font-bold text-xs tracking-wider uppercase transition-all duration-300 active:scale-95 shadow-lg backdrop-blur-md"
              >
                <span>Muat Lebih Banyak ({filteredCourses.length - visibleCount} Tersisa)</span>
                <ChevronDown size={16} />
              </button>
            ) : (
              <button
                onClick={handleCollapse}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs tracking-wider uppercase transition-all duration-300 active:scale-95 shadow-lg shadow-cyan-400/20"
              >
                <span>Tutup Semua</span>
                <ChevronUp size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}