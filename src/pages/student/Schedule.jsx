import React, { useEffect, useState } from "react";
import { supabase } from "../../utils/supabaseClient";
import { toast, Toaster } from "react-hot-toast";
import {
  CalendarDays,
  Clock,
  Search,
  BookOpen,
  Zap,
  CalendarClock,
  History as HistoryIcon,
  UserCheck,
  Phone,
  Copy,
  Layers,
  Power,
} from "lucide-react";

const TABS = [
  { key: "upcoming", label: "Mendatang", icon: CalendarClock },
  { key: "today", label: "Hari Ini", icon: Zap },
  { key: "past", label: "Riwayat", icon: HistoryIcon },
];

export default function Schedule() {
  const [sessions, setSessions] = useState([]);
  const [coachesMap, setCoachesMap] = useState({});
  const [classesMap, setClassesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const savedUser = localStorage.getItem("user_session");
        if (!savedUser) throw new Error("Sesi berakhir. Silakan masuk kembali.");
        const user = JSON.parse(savedUser);

        // 1. Dapatkan student_id dan daftar kelas aktif saja
        const { data: studentData, error: studentError } = await supabase
          .from("students")
          .select("id, student_enrollments(class_id, status, classes(name))")
          .eq("user_id", user.id)
          .single();

        if (studentError || !studentData) throw new Error("Data atlet tidak ditemukan.");

        // Hanya kelas dengan status 'active' yang jadwalnya akan diproses
        const activeEnrollments = studentData.student_enrollments?.filter(
          (e) => e.status === "active"
        ) || [];
        const activeClassIds = activeEnrollments.map((e) => e.class_id);

        const cMapNames = {};
        activeEnrollments.forEach((e) => {
          cMapNames[e.class_id] = e.classes?.name;
        });
        setClassesMap(cMapNames);

        let sessionData = [];
        if (activeClassIds.length > 0) {
          const { data: allSessions, error: sessionError } = await supabase
            .from("sessions")
            .select("id, name, session_date, is_active, class_ids, coach_ids")
            .order("session_date", { ascending: true });

          if (sessionError) throw sessionError;

          // Saring sesi yang mencakup kelas aktif atlet
          sessionData = (allSessions || []).filter((session) => {
            if (!session.class_ids) return false;
            return session.class_ids.some((cId) => activeClassIds.includes(cId));
          });
        }

        // 2. Ambil data pelatih untuk nama, nomor telepon, dan spesialisasi
        const { data: coachData, error: coachError } = await supabase
          .from("coaches")
          .select("id, specialty, phone_number, users(full_name)");

        if (coachError) throw coachError;

        const cMap = {};
        (coachData || []).forEach((c) => {
          cMap[c.id] = {
            name: c.users?.full_name || "Pelatih",
            specialty: c.specialty,
            phone: c.phone_number,
          };
        });
        setCoachesMap(cMap);
        setSessions(sessionData);
      } catch (err) {
        toast.error("Gagal memuat jadwal: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCopyPhone = (phoneNumber) => {
    if (!phoneNumber) return;
    navigator.clipboard.writeText(phoneNumber);
    toast.success("Nomor telepon berhasil disalin!");
  };

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

  let processedSessions = [...(grouped[activeTab] || [])];

  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    processedSessions = processedSessions.filter((s) => {
      const matchName = s.name.toLowerCase().includes(query);
      const matchClass = s.class_ids?.some((cId) =>
        classesMap[cId]?.toLowerCase().includes(query)
      );
      return matchName || matchClass;
    });
  }

  if (activeTab === "upcoming" || activeTab === "today") {
    processedSessions.sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime());
  } else {
    processedSessions.sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime());
  }

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center font-sans">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
        <p className="text-slate-500 text-sm font-medium animate-pulse">Memuat jadwal latihan...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <CalendarDays className="text-blue-600" size={28} />
          Jadwal Latihan Saya
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Informasi sesi renang aktif, status gerbang pemindai, dan kontak instruktur yang bertugas.
        </p>
      </div>

      <div className="max-w-7xl mx-auto mb-6 flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
        <div className="flex gap-2 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
          {TABS.map(({ key, label, icon: Icon }) => {
            const count = grouped[key]?.length || 0;
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

        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari sesi atau kelas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {processedSessions.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 py-16 px-4 text-center text-slate-400 shadow-sm">
            <BookOpen size={36} className="mx-auto mb-3 text-slate-300" />
            <p className="font-bold text-slate-700 text-sm">Tidak ada sesi yang ditemukan</p>
            <p className="text-xs mt-1">Hanya sesi dari kelas yang aktif diikuti yang akan ditampilkan di sini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {processedSessions.map((session) => {
              const dateObj = new Date(session.session_date);
              const dayName = dateObj.toLocaleDateString("id-ID", { weekday: "long" });
              const dateFull = dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
              const timeStr = dateObj.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
              const assignedCoaches = session.coach_ids?.map((id) => coachesMap[id] || { name: "Instruktur", phone: "" }) || [];

              // Ambil nama-nama kelas yang aktif diikuti atlet pada sesi ini
              const relevantClassNames = session.class_ids
                ?.map((cId) => classesMap[cId])
                .filter(Boolean) || [];

              return (
                <div key={session.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        session.is_active ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                      }`}>
                        <CalendarDays size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm sm:text-base leading-tight">{session.name}</h3>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                          <Clock size={12} className="text-slate-400" />
                          <span>{dayName}, {dateFull} • {timeStr} WIB</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {/* Status Buka/Tutup Presensi QR */}
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        session.is_active
                          ? "bg-emerald-500 text-white border-emerald-600 shadow-sm"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}>
                        <Power size={10} />
                        {session.is_active ? "Gerbang Dibuka" : "Ditutup"}
                      </span>

                      {/* Tag Kelas Aktif Terkait */}
                      <div className="flex flex-wrap gap-1 justify-end">
                        {relevantClassNames.map((className, idx) => (
                          <span
                            key={idx}
                            className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1"
                          >
                            <Layers size={10} />
                            {className}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Instruktur Bertugas */}
                  <div className="border-t border-slate-100 pt-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2.5">
                      <UserCheck size={14} className="text-indigo-500" /> Instruktur Bertugas
                    </span>
                    <div className="flex flex-wrap gap-2.5">
                      {assignedCoaches.length > 0 ? (
                        assignedCoaches.map((coach, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700 flex flex-col gap-1.5 min-w-[190px] flex-1 sm:flex-none shadow-sm"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-slate-800 truncate">{coach.name}</span>
                              {coach.specialty && (
                                <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-semibold border border-blue-100 shrink-0">
                                  {coach.specialty}
                                </span>
                              )}
                            </div>
                            {coach.phone ? (
                              <button
                                type="button"
                                onClick={() => handleCopyPhone(coach.phone)}
                                className="flex items-center justify-between gap-1.5 px-2 py-1 bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 rounded-lg text-indigo-600 transition-all text-[11px] font-mono active:scale-95 group"
                                title="Klik untuk menyalin nomor telepon"
                              >
                                <span className="flex items-center gap-1.5 truncate">
                                  <Phone size={12} className="text-indigo-500 shrink-0" />
                                  <span className="font-medium text-slate-700 group-hover:text-indigo-700 truncate">
                                    {coach.phone}
                                  </span>
                                </span>
                                <Copy size={12} className="text-slate-400 group-hover:text-indigo-600 shrink-0" />
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                <Phone size={11} className="text-slate-300" /> Tidak ada kontak
                              </span>
                            )}
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400">Belum ditentukan</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}