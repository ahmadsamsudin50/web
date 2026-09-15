import React, { useEffect, useState } from "react";
import {
  CalendarDays,
  Clock,
  ArrowRight,
  Sparkles,
  Tag,
  Bookmark,
  Search,
  Layers,
} from "lucide-react";
import { supabase } from "../../utils/supabaseClient";

const parseSchedule = (scheduleData) => {
  if (!scheduleData) return { daysText: "Hari Fleksibel", timeText: "Jam Menyusul" };

  if (typeof scheduleData === "object") {
    const days = Array.isArray(scheduleData.days) ? scheduleData.days.filter(Boolean) : [];
    const startTime = scheduleData.start_time || "";
    const endTime = scheduleData.end_time || "";

    const daysText = days.length > 0 ? days.join(", ") : "Hari Fleksibel";
    const timeText =
      startTime && endTime
        ? `${startTime} - ${endTime} WIB`
        : startTime
        ? `${startTime} WIB`
        : "Waktu Fleksibel";

    return { daysText, timeText };
  }

  if (typeof scheduleData === "string") {
    const parts = scheduleData.split("|");
    if (parts.length > 1) {
      return { daysText: parts[0].trim(), timeText: parts[1].trim() };
    }
    return { daysText: scheduleData.trim(), timeText: "Waktu Fleksibel" };
  }

  return { daysText: "Hari Fleksibel", timeText: "Jam Menyusul" };
};

const getCategoryBadge = (category) => {
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

export default function ScheduleSection() {
  const [classList, setClassList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const { data, error } = await supabase
          .from("classes")
          .select("id, name, category, max_sessions, max_capacity, schedule_info, price")
          .order("name", { ascending: true });

        if (!error && data) {
          setClassList(data);
        }
      } catch (err) {
        console.error("Gagal memuat jadwal latihan:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedules();
  }, []);

  const handleScrollToCourse = (classId) => {
    window.dispatchEvent(
      new CustomEvent("highlight-course-card", { detail: { classId } })
    );

    const targetElement = document.getElementById(`course-card-${classId}`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      const courseSection = document.getElementById("course");
      if (courseSection) {
        courseSection.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const filtered = classList.filter((c) => {
    const q = search.toLowerCase();
    const parsed = parseSchedule(c.schedule_info);
    return (
      c.name?.toLowerCase().includes(q) ||
      c.category?.toLowerCase().includes(q) ||
      parsed.daysText.toLowerCase().includes(q)
    );
  });

  return (
    <section
      id="schedule"
      className="py-20 lg:py-32 px-4 sm:px-6 bg-[#071324] font-sans relative overflow-hidden text-white border-t border-slate-800"
    >
      <div className="absolute top-10 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-10 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <span className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300 bg-cyan-950/80 border border-cyan-500/30 px-4 py-1.5 rounded-full inline-flex items-center gap-2 mb-4 shadow-sm">
            <Sparkles size={13} className="text-cyan-400" /> Agenda Latihan Resmi
          </span>
          <h3 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
            Jadwal Latihan <span className="text-cyan-400">Setiap Kelas</span>
          </h3>
          <p className="text-slate-400 text-xs sm:text-sm md:text-base mt-2.5 font-medium leading-relaxed">
            Tabel agenda rutin setiap jenjang kelas renang. Geser tabel atau klik baris untuk melihat detail program terkait.
          </p>
        </div>

        <div className="max-w-md mx-auto mb-8">
          <div className="relative flex items-center">
            <Search size={16} className="absolute left-4 text-cyan-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama kelas, kategori, atau hari..."
              className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-white/5 border border-white/10 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all backdrop-blur-md"
            />
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-3xl sm:rounded-[2.5rem] overflow-hidden shadow-2xl backdrop-blur-md">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[620px] sm:min-w-[700px]">
              <thead>
                <tr className="bg-white/5 border-b border-white/10 text-cyan-300 text-[10px] sm:text-[11px] uppercase tracking-widest font-black">
                  <th className="py-4 px-4 sm:px-6">Kelas & Kategori</th>
                  <th className="py-4 px-4 sm:px-6">Hari Latihan</th>
                  <th className="py-4 px-4 sm:px-6">Waktu Latihan</th>
                  <th className="py-4 px-4 sm:px-6">Target</th>
                  <th className="py-4 px-4 sm:px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="py-16 text-center text-slate-400">
                      <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                      <p className="font-medium text-xs">Memuat jadwal latihan...</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => {
                    const { daysText, timeText } = parseSchedule(c.schedule_info);

                    return (
                      <tr
                        key={c.id}
                        onClick={() => handleScrollToCourse(c.id)}
                        className="hover:bg-cyan-500/10 active:bg-cyan-500/20 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 sm:py-4 px-4 sm:px-6">
                          <div className="flex items-center gap-2.5 sm:gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-cyan-300 shrink-0 group-hover:bg-cyan-400 group-hover:text-slate-950 transition-colors">
                              <Layers size={16} />
                            </div>
                            <div>
                              <span className="font-bold text-xs sm:text-sm text-white group-hover:text-cyan-300 transition-colors block">
                                {c.name}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.2 mt-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${getCategoryBadge(
                                  c.category
                                )}`}
                              >
                                <Tag size={8} />
                                {c.category || "Umum"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 sm:py-4 px-4 sm:px-6">
                          <div className="flex items-center gap-1.5 sm:gap-2 font-semibold text-slate-200">
                            <CalendarDays size={14} className="text-cyan-400 shrink-0" />
                            <span className="whitespace-nowrap">{daysText}</span>
                          </div>
                        </td>

                        <td className="py-3.5 sm:py-4 px-4 sm:px-6">
                          <div className="flex items-center gap-1.5 sm:gap-2 font-bold text-emerald-300">
                            <Clock size={14} className="text-emerald-400 shrink-0" />
                            <span className="whitespace-nowrap">{timeText}</span>
                          </div>
                        </td>

                        <td className="py-3.5 sm:py-4 px-4 sm:px-6">
                          <div className="flex items-center gap-1 text-slate-300 font-medium whitespace-nowrap">
                            <Bookmark size={12} className="text-blue-400 shrink-0" />
                            <span>{c.max_sessions || 12} Sesi</span>
                          </div>
                        </td>

                        <td className="py-3.5 sm:py-4 px-4 sm:px-6 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleScrollToCourse(c.id);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg sm:rounded-xl bg-cyan-400/10 hover:bg-cyan-400 text-cyan-300 hover:text-slate-950 font-bold text-[11px] sm:text-xs transition-all active:scale-95 border border-cyan-400/30 whitespace-nowrap"
                          >
                            <span>Lihat</span>
                            <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {filtered.length === 0 && !loading && (
          <div className="text-center py-16 bg-white/5 rounded-3xl border border-white/10 max-w-md mx-auto">
            <p className="text-slate-400 text-xs sm:text-sm font-medium">
              Tidak ada jadwal kelas yang cocok dengan pencarian.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}