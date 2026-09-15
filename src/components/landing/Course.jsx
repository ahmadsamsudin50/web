import React, { useEffect, useState, useRef } from "react";
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
  Clock,
  CreditCard,
  Layers,
  Flame,
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

const formatScheduleText = (schedule) => {
  if (!schedule) return null;

  if (typeof schedule === "object") {
    const days = Array.isArray(schedule.days) ? schedule.days.filter(Boolean) : [];
    const startTime = schedule.start_time || "";
    const endTime = schedule.end_time || "";

    if (days.length === 0 && !startTime && !endTime) return null;

    const daysText = days.length > 0 ? days.join(", ") : "Hari Fleksibel";
    const timeText = startTime && endTime ? `${startTime} - ${endTime} WIB` : startTime ? `${startTime} WIB` : "";

    return timeText ? `${daysText} | ${timeText}` : daysText;
  }

  if (typeof schedule === "string") {
    return schedule.trim() ? schedule.trim() : null;
  }

  return null;
};

export default function Course() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [visibleCount, setVisibleCount] = useState(3);

  const [selectedCourseModal, setSelectedCourseModal] = useState(null);
  const [highlightedCourseId, setHighlightedCourseId] = useState(null);
  const highlightTimeoutRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const fetchEnrichedClasses = async () => {
      try {
        let classQuery = supabase
          .from("classes")
          .select("id, name, category, price, max_sessions, max_capacity, schedule_info, created_at")
          .order("created_at", { ascending: true });

        const [classRes, enrollRes, landingRes] = await Promise.all([
          classQuery,
          supabase
            .from("student_enrollments")
            .select("class_id")
            .in("status", ["active", "completed"]),
          supabase
            .from("landing_courses")
            .select("title, description, features, icon_name"),
        ]);

        let classData = classRes.data;
        if (classRes.error) {
          const fallbackClassRes = await supabase
            .from("classes")
            .select("id, name, category, price, max_sessions, max_capacity, created_at")
            .order("created_at", { ascending: true });
          if (fallbackClassRes.error) throw fallbackClassRes.error;
          classData = fallbackClassRes.data;
        }

        const countMap = {};
        (enrollRes.data || []).forEach((item) => {
          countMap[item.class_id] = (countMap[item.class_id] || 0) + 1;
        });

        const landingMap = {};
        (landingRes.data || []).forEach((item) => {
          if (item.title) {
            landingMap[item.title.trim().toLowerCase()] = item;
          }
        });

        const formatted = (classData || []).map((c) => {
          const maxCap = Number(c.max_capacity) || 20;
          const enrolled = Number(countMap[c.id]) || 0;
          const remaining = Math.max(0, maxCap - enrolled);
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
            schedule_info: formatScheduleText(c.schedule_info),
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

  // Listener Event: Auto-show kartu tersembunyi & sorot kartu target
  useEffect(() => {
    const handleHighlightEvent = (e) => {
      const targetId = e.detail?.classId;
      if (!targetId || courses.length === 0) return;

      setSelectedCategory("all");
      setSearchQuery("");

      const targetIndex = courses.findIndex((c) => c.id === targetId);
      if (targetIndex !== -1) {
        setVisibleCount((prev) => Math.max(prev, targetIndex + 1));
      }

      setHighlightedCourseId(targetId);

      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }

      setTimeout(() => {
        const targetElement = document.getElementById(`course-card-${targetId}`);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 200);

      highlightTimeoutRef.current = setTimeout(() => {
        setHighlightedCourseId(null);
      }, 4500);
    };

    window.addEventListener("highlight-course-card", handleHighlightEvent);
    return () => {
      window.removeEventListener("highlight-course-card", handleHighlightEvent);
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    };
  }, [courses]);

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

  const handleCategoryChange = (catKey) => {
    setSelectedCategory(catKey);
    setVisibleCount(isMobile ? 1 : 3);
  };

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    setVisibleCount(isMobile ? 1 : 3);
  };

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

  const getCategoryBadgeClass = (category, isHighlighted) => {
    if (isHighlighted) {
      return "bg-cyan-400 text-slate-950 border-cyan-300 font-black";
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

        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {CATEGORIES.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleCategoryChange(tab.key)}
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

        <div className="max-w-md mx-auto mb-14">
          <div className="relative flex items-center">
            <Search size={18} className="absolute left-4 text-cyan-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Cari nama kelas atau materi pelatihan..."
              className="w-full pl-11 pr-10 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all backdrop-blur-md"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange("")}
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
            {displayedCourses.map((c) => {
              const isHighlighted = highlightedCourseId === c.id;
              const categoryLabel =
                CATEGORIES.find((opt) => opt.key === c.category?.toLowerCase())?.label ||
                c.category;

              return (
                <div
                  key={c.id}
                  id={`course-card-${c.id}`}
                  onClick={() => setSelectedCourseModal(c)}
                  className={`relative rounded-[2.5rem] p-8 flex flex-col justify-between transition-all duration-500 cursor-pointer scroll-mt-32 ${
                    isHighlighted
                      ? "bg-gradient-to-b from-[#0d2a52] to-[#0a1f3d] border-4 border-cyan-300 ring-8 ring-cyan-400/30 shadow-[0_0_60px_rgba(34,211,238,0.5)] scale-[1.03] z-20"
                      : "bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-cyan-400/40 shadow-xl group hover:-translate-y-2"
                  }`}
                >
                  {isHighlighted && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-cyan-300 text-slate-950 text-[11px] font-black uppercase tracking-wider px-5 py-1.5 rounded-full shadow-xl flex items-center gap-1.5 animate-bounce">
                      <Flame size={14} className="text-amber-600 fill-amber-500" />
                      <span>Kelas Pilihan Anda</span>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between gap-4 mb-5">
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                          isHighlighted
                            ? "bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-300/40"
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

                    <div className="mb-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border backdrop-blur-sm transition-colors ${getCategoryBadgeClass(
                          c.category,
                          isHighlighted
                        )}`}
                      >
                        <Tag size={10} className="shrink-0" />
                        <span>{categoryLabel}</span>
                      </span>
                    </div>

                    <h4
                      className={`text-xl font-bold mb-2 tracking-tight transition-colors ${
                        isHighlighted
                          ? "text-cyan-300"
                          : "text-white group-hover:text-cyan-300"
                      }`}
                    >
                      {c.title}
                    </h4>

                    <p className="text-xs text-slate-400 leading-relaxed mb-6 font-normal min-h-[38px] line-clamp-2">
                      {c.description}
                    </p>

                    <div className="h-px bg-white/10 my-6"></div>

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

                        {c.schedule_info && (
                          <li className="flex items-center gap-2.5">
                            <div className="w-4 h-4 rounded-full bg-emerald-400/20 text-emerald-300 flex items-center justify-center shrink-0">
                              <Clock size={11} strokeWidth={3} />
                            </div>
                            <span className="text-emerald-300 font-medium truncate">
                              Jadwal: <b>{c.schedule_info}</b>
                            </span>
                          </li>
                        )}

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
                    onClick={(e) => e.stopPropagation()}
                    className={`w-full py-3.5 px-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md ${
                      isHighlighted
                        ? "bg-cyan-300 hover:bg-white text-slate-950 font-black shadow-lg shadow-cyan-300/40"
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

      {selectedCourseModal && (
        <div
          onClick={() => setSelectedCourseModal(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0f2444] border border-cyan-500/30 rounded-[2.5rem] p-6 sm:p-8 max-w-xl w-full text-white shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
          >
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-400 text-slate-950 flex items-center justify-center shrink-0 shadow-md shadow-cyan-400/20">
                  {getIconElement(selectedCourseModal)}
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-cyan-300 px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/30">
                    {selectedCourseModal.category}
                  </span>
                  <h3 className="text-xl font-bold text-white mt-1 tracking-tight">
                    {selectedCourseModal.title}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedCourseModal(null)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
                title="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto py-5 space-y-5 custom-scrollbar flex-1 pr-1 text-xs sm:text-sm">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-300 mb-1.5">
                  Deskripsi Program
                </p>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {selectedCourseModal.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Biaya Paket</span>
                  <span className="text-base font-black text-white font-mono">
                    {formatRupiah(selectedCourseModal.price)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Target Pertemuan</span>
                  <span className="text-sm font-bold text-white">
                    {selectedCourseModal.max_sessions} Sesi Latihan
                  </span>
                </div>
                <div className="col-span-2 pt-2 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Kapasitas Kursi</span>
                  <span className="text-xs font-semibold text-cyan-300">
                    Sisa {selectedCourseModal.remaining_seats} dari {selectedCourseModal.max_capacity} Kuota
                  </span>
                </div>
              </div>

              {selectedCourseModal.schedule_info && (
                <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
                    <Clock size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                      Jadwal Hari & Jam
                    </span>
                    <span className="text-xs font-bold text-emerald-200">
                      {selectedCourseModal.schedule_info}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-300 mb-2.5">
                  Fasilitas & Keunggulan
                </p>
                <div className="space-y-2">
                  {selectedCourseModal.features && selectedCourseModal.features.length > 0 ? (
                    selectedCourseModal.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2.5 text-slate-300 text-xs">
                        <div className="w-4 h-4 rounded-full bg-cyan-400/20 text-cyan-300 flex items-center justify-center shrink-0">
                          <Check size={11} strokeWidth={3} />
                        </div>
                        <span>{feat}</span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="flex items-center gap-2.5 text-slate-300 text-xs">
                        <div className="w-4 h-4 rounded-full bg-cyan-400/20 text-cyan-300 flex items-center justify-center shrink-0">
                          <Check size={11} strokeWidth={3} />
                        </div>
                        <span>Akses Presensi Kartu QR Digital Mandiri</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-slate-300 text-xs">
                        <div className="w-4 h-4 rounded-full bg-cyan-400/20 text-cyan-300 flex items-center justify-center shrink-0">
                          <Check size={11} strokeWidth={3} />
                        </div>
                        <span>Bimbingan Instruktur Berlisensi Resmi</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedCourseModal(null)}
                className="flex-1 py-3.5 px-4 rounded-2xl text-xs font-bold text-slate-300 bg-white/5 hover:bg-white/10 transition-colors"
              >
                Tutup
              </button>
              <a
                href="/register"
                className="flex-1 py-3.5 px-4 rounded-2xl text-xs font-black text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-400/20 active:scale-95"
              >
                Daftar Kelas Sekarang
                <ChevronRight size={15} />
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}