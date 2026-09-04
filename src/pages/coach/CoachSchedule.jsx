import React, { useEffect, useState } from "react";
import { supabase } from "../../utils/supabaseClient";
import { toast, Toaster } from "react-hot-toast";
import {
  CalendarDays,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Zap,
  CalendarClock,
  History,
  Layers,
  Users,
  Power,
  X,
} from "lucide-react";

const TABS = [
  { key: "today", label: "Hari Ini", icon: Zap },
  { key: "upcoming", label: "Mendatang", icon: CalendarClock },
  { key: "past", label: "Riwayat", icon: History },
];

export default function CoachSchedule() {
  const [sessions, setSessions] = useState([]);
  const [classesMap, setClassesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("today");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const savedUser = localStorage.getItem("user_session");
        if (!savedUser) throw new Error("Sesi berakhir. Silakan masuk kembali.");
        const user = JSON.parse(savedUser);

        // 1. Dapatkan profil instruktur
        const { data: coachData, error: coachError } = await supabase
          .from("coaches")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (coachError || !coachData) {
          throw new Error("Data pelatih tidak ditemukan.");
        }

        // 2. Ambil referensi nama kelas dan jumlah pendaftaran aktif
        const [classesRes, enrollmentsRes] = await Promise.all([
          supabase.from("classes").select("id, name"),
          supabase.from("student_enrollments").select("class_id").eq("status", "active"),
        ]);

        const enrollCount = {};
        (enrollmentsRes.data || []).forEach((e) => {
          enrollCount[e.class_id] = (enrollCount[e.class_id] || 0) + 1;
        });

        const cMap = {};
        (classesRes.data || []).forEach((c) => {
          cMap[c.id] = {
            name: c.name,
            athletes: enrollCount[c.id] || 0,
          };
        });
        setClassesMap(cMap);

        // 3. Ambil seluruh sesi yang menugaskan pelatih ini
        const { data, error } = await supabase
          .from("sessions")
          .select("*")
          .contains("coach_ids", JSON.stringify([coachData.id]))
          .order("session_date", { ascending: false });

        if (error) throw error;
        setSessions(data || []);
      } catch (err) {
        toast.error("Gagal memuat jadwal: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, activeTab]);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

  const grouped = {
    today: sessions.filter((s) => {
      const t = new Date(s.session_date).getTime();
      return t >= todayStart && t <= todayEnd;
    }),
    upcoming: sessions.filter((s) => new Date(s.session_date).getTime() > todayEnd),
    past: sessions.filter((s) => new Date(s.session_date).getTime() < todayStart),
  };

  let processedSessions = [...grouped[activeTab]];
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    processedSessions = processedSessions.filter((s) => {
      const matchName = s.name.toLowerCase().includes(q);
      const matchClass = s.class_ids?.some((cId) =>
        classesMap[cId]?.name?.toLowerCase().includes(q)
      );
      return matchName || matchClass;
    });
  }

  if (filterStatus !== "all") {
    processedSessions = processedSessions.filter((s) =>
      filterStatus === "active" ? s.is_active === true : s.is_active === false
    );
  }

  if (activeTab === "upcoming" || activeTab === "today") {
    processedSessions.sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime());
  } else {
    processedSessions.sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime());
  }

  const totalPages = Math.ceil(processedSessions.length / ITEMS_PER_PAGE);
  const paginatedSessions = processedSessions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center font-sans">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
        <p className="text-slate-500 text-sm font-medium animate-pulse">Memuat jadwal penugasan instruktur...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <CalendarDays className="text-blue-600" size={28} />
          Jadwal Tugas Melatih
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Daftar sesi latihan renang yang ditugaskan khusus untuk Anda pantau.
        </p>
      </div>

      {/* Ringkasan Statistik */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Tugas", value: sessions.length, color: "text-blue-600", bg: "bg-blue-50/60" },
          { label: "Gerbang Buka", value: sessions.filter((s) => s.is_active).length, color: "text-emerald-600", bg: "bg-emerald-50/60" },
          { label: "Hari Ini", value: grouped.today.length, color: "text-amber-600", bg: "bg-amber-50/60" },
          { label: "Mendatang", value: grouped.upcoming.length, color: "text-indigo-600", bg: "bg-indigo-50/60" },
        ].map((c) => (
          <div key={c.label} className={`rounded-2xl p-4 border border-slate-200 shadow-sm ${c.bg}`}>
            <div className={`text-2xl font-black ${c.color}`}>{c.value}</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Kontrol Tab & Pencarian */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
        <div className="flex gap-2 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
          {TABS.map(({ key, label, icon: Icon }) => {
            const count = grouped[key].length;
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <Icon size={16} />
                {label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari sesi atau nama kelas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 outline-none cursor-pointer"
          >
            <option value="all">Semua Status</option>
            <option value="active">Gerbang Dibuka</option>
            <option value="closed">Ditutup</option>
          </select>
        </div>
      </div>

      {/* Daftar Sesi Tugas */}
      <div className="max-w-7xl mx-auto">
        {paginatedSessions.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 py-16 px-4 text-center text-slate-400 shadow-sm">
            <BookOpen size={36} className="mx-auto mb-3 text-slate-300" />
            <p className="font-bold text-slate-700 text-sm">Tidak ada jadwal sesi pada kategori ini</p>
            <p className="text-xs mt-1">Coba sesuaikan tab atau kata kunci pencarian Anda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paginatedSessions.map((session) => {
              const dateObj = new Date(session.session_date);
              const dayName = dateObj.toLocaleDateString("id-ID", { weekday: "long" });
              const dateFull = dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
              const timeStr = dateObj.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

              const targetClasses = session.class_ids?.map((id) => classesMap[id]).filter(Boolean) || [];
              const totalAthletes = targetClasses.reduce((acc, curr) => acc + curr.athletes, 0);

              return (
                <div key={session.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        session.is_active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                      }`}>
                        <CalendarDays size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm sm:text-base leading-tight">{session.name}</h3>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                          <Clock size={12} className="text-slate-400" />
                          <span>{dayName}, {dateFull} • {timeStr} WIB</span>
                        </div>
                      </div>
                    </div>

                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shrink-0 ${
                      session.is_active
                        ? "bg-emerald-500 text-white border-emerald-600 shadow-sm"
                        : "bg-slate-200 text-slate-700 border-slate-300"
                    }`}>
                      <Power size={11} />
                      {session.is_active ? "Gerbang Terbuka" : "Ditutup"}
                    </span>
                  </div>

                  {/* Rincian Kelas & Atlet Terdaftar */}
                  <div className="border-t border-slate-100 pt-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Layers size={13} className="text-blue-500" /> Kelas Latihan Terkait
                      </span>
                      <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                        <Users size={12} className="text-indigo-500" /> {totalAthletes} Atlet
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {targetClasses.length > 0 ? (
                        targetClasses.map((cls, idx) => (
                          <span
                            key={idx}
                            className="bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                          >
                            <span>{cls.name}</span>
                            <span className="bg-blue-200/60 text-blue-800 px-1.5 py-0.2 rounded text-[10px] font-black">
                              {cls.athletes}
                            </span>
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400">Kelas belum ditentukan</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Kontrol Paginasi */}
        {totalPages > 1 && (
          <div className="mt-6 p-3 bg-white rounded-2xl border border-slate-200 flex justify-between items-center text-xs text-slate-500 shadow-sm">
            <span>
              Halaman <span className="font-bold text-slate-800">{currentPage}</span> dari{" "}
              <span className="font-bold text-slate-800">{totalPages}</span>
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}