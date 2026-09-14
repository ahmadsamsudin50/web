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
  Phone,
  Copy,
  X,
  User,
  Loader2,
  ExternalLink,
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

  // State Modal Detail Murid
  const [studentsModal, setStudentsModal] = useState({
    isOpen: false,
    session: null,
    students: [],
    loading: false,
    search: "",
  });

  // State Modal Preview Foto Ukuran Penuh
  const [imagePreviewModal, setImagePreviewModal] = useState({
    isOpen: false,
    url: "",
    name: "",
  });

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

        // 2. Ambil referensi nama kelas dan jumlah pendaftaran aktif saja
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

  const openStudentsList = async (session) => {
    setStudentsModal({
      isOpen: true,
      session,
      students: [],
      loading: true,
      search: "",
    });

    try {
      if (!session.class_ids || session.class_ids.length === 0) {
        setStudentsModal((prev) => ({ ...prev, loading: false }));
        return;
      }

      // Ambil seluruh siswa aktif di kelas-kelas sesi ini beserta avatar_url
      let enrollRes = await supabase
        .from("student_enrollments")
        .select(`
          id, class_id, status,
          classes ( id, name ),
          students (
            id, nis, parent_name, phone_number, avatar_url,
            users ( full_name )
          )
        `)
        .in("class_id", session.class_ids)
        .eq("status", "active");

      // Fallback jika tabel belum memiliki avatar_url
      if (enrollRes.error) {
        enrollRes = await supabase
          .from("student_enrollments")
          .select(`
            id, class_id, status,
            classes ( id, name ),
            students (
              id, nis, parent_name, phone_number,
              users ( full_name )
            )
          `)
          .in("class_id", session.class_ids)
          .eq("status", "active");
      }

      if (enrollRes.error) throw enrollRes.error;
      setStudentsModal((prev) => ({
        ...prev,
        students: enrollRes.data || [],
        loading: false,
      }));
    } catch (err) {
      toast.error("Gagal memuat daftar murid: " + err.message);
      setStudentsModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleCopyPhone = (phone) => {
    if (!phone) return;
    navigator.clipboard.writeText(phone);
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

  const filteredStudentsInModal = studentsModal.students.filter((item) => {
    const q = studentsModal.search.toLowerCase();
    const name = item.students?.users?.full_name?.toLowerCase() || "";
    const nis = item.students?.nis?.toLowerCase() || "";
    const parent = item.students?.parent_name?.toLowerCase() || "";
    const className = item.classes?.name?.toLowerCase() || "";
    return name.includes(q) || nis.includes(q) || parent.includes(q) || className.includes(q);
  });

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center font-sans">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
        <p className="text-slate-500 text-sm font-medium animate-pulse">Memuat jadwal tugas melatih...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans">
      <Toaster position="top-right" />

      {/* Modal Pratinjau Foto Siswa Ukuran Penuh */}
      {imagePreviewModal.isOpen && (
        <div
          onClick={() => setImagePreviewModal({ isOpen: false, url: "", name: "" })}
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl overflow-hidden max-w-sm w-full p-4 shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col items-center cursor-default"
          >
            <button
              onClick={() => setImagePreviewModal({ isOpen: false, url: "", name: "" })}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
            >
              <X size={18} />
            </button>
            <div className="w-56 h-56 rounded-2xl overflow-hidden bg-slate-100 mt-2 mb-3 border border-slate-200 shadow-inner">
              <img
                src={imagePreviewModal.url}
                alt={imagePreviewModal.name}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="font-bold text-slate-800 text-sm text-center truncate w-full px-2">
              {imagePreviewModal.name}
            </p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <CalendarDays className="text-blue-600" size={28} />
          Jadwal Tugas Melatih
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Daftar sesi latihan renang yang ditugaskan khusus untuk Anda pantau[cite: 10].
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
                <div key={session.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow flex flex-col justify-between">
                  <div className="space-y-4">
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
                          <Users size={12} className="text-indigo-500" /> {totalAthletes} Atlet Aktif
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

                  {/* Tombol Aksi Cepat: Daftar Siswa & Kontak */}
                  <div className="pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => openStudentsList(session)}
                      className="w-full py-2.5 px-3 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-bold rounded-xl text-xs border border-slate-200 hover:border-blue-200 transition-all flex items-center justify-center gap-2 active:scale-98"
                    >
                      <Users size={14} className="text-blue-600" />
                      <span>Lihat Murid & Kontak Wali ({totalAthletes})</span>
                    </button>
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

      {/* Modal Ringkas Daftar Siswa & Kontak Orang Tua */}
      {studentsModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Users size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Daftar Murid: {studentsModal.session?.name}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Daftar siswa dan nomor kontak wali pada sesi ini[cite: 10]
                  </p>
                </div>
              </div>
              <button
                onClick={() => setStudentsModal((prev) => ({ ...prev, isOpen: false }))}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Pencarian Siswa */}
            <div className="p-3 border-b border-slate-100 bg-white">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama atlet, kelas, NIS, atau wali..."
                  value={studentsModal.search}
                  onChange={(e) => setStudentsModal((prev) => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>
            </div>

            {/* List Siswa */}
            <div className="overflow-y-auto p-4 flex-1 space-y-2.5">
              {studentsModal.loading ? (
                <div className="py-14 text-center text-slate-400">
                  <Loader2 size={26} className="animate-spin mx-auto text-blue-600 mb-2" />
                  <p className="text-xs font-medium">Memuat data murid...</p>
                </div>
              ) : filteredStudentsInModal.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <User size={30} className="mx-auto mb-2 text-slate-300" />
                  <p className="font-bold text-slate-700 text-xs">Tidak ada murid yang ditemukan</p>
                  <p className="text-[11px] mt-0.5">Belum ada murid terdaftar aktif pada kelas di sesi ini.</p>
                </div>
              ) : (
                filteredStudentsInModal.map((item) => {
                  const phone = item.students?.phone_number;
                  const cleanPhone = phone ? phone.replace(/\D/g, "") : "";
                  const waUrl = cleanPhone
                    ? `https://wa.me/${cleanPhone.startsWith("0") ? "62" + cleanPhone.slice(1) : cleanPhone}`
                    : null;
                  const studentAvatar = item.students?.avatar_url;
                  const studentName = item.students?.users?.full_name || "Atlet";

                  return (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Foto Profil Student dengan Fitur Zoom Preview */}
                        <div
                          onClick={() => {
                            if (studentAvatar) {
                              setImagePreviewModal({
                                isOpen: true,
                                url: studentAvatar,
                                name: studentName,
                              });
                            }
                          }}
                          className={`w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-100 overflow-hidden ${
                            studentAvatar ? "cursor-pointer hover:opacity-85 transition-opacity" : ""
                          }`}
                          title={studentAvatar ? "Klik untuk memperbesar foto" : undefined}
                        >
                          {studentAvatar ? (
                            <img
                              src={studentAvatar}
                              alt={studentName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User size={16} />
                          )}
                        </div>

                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-800 text-xs truncate">
                            {studentName}
                          </h4>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                            <span className="font-mono font-semibold text-blue-600">
                              NIS: {item.students?.nis}
                            </span>
                            <span>•</span>
                            <span className="truncate bg-slate-200/70 text-slate-700 px-1.5 py-0.2 rounded font-medium">
                              {item.classes?.name}
                            </span>
                          </div>
                          {item.students?.parent_name && (
                            <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                              Wali: <span className="font-medium text-slate-600">{item.students?.parent_name}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Kontak Aksi Cepat */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {phone ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleCopyPhone(phone)}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-[11px] font-mono text-slate-700 transition-colors shadow-2xs"
                              title="Salin nomor"
                            >
                              <Copy size={12} className="text-slate-400" />
                              <span>{phone}</span>
                            </button>
                            {waUrl && (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-[11px] transition-colors shadow-xs"
                                title="Chat WhatsApp"
                              >
                                <Phone size={12} />
                                <span>WhatsApp</span>
                                <ExternalLink size={10} className="opacity-80" />
                              </a>
                            )}
                          </>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Tidak ada kontak</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Modal */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-between items-center text-xs text-slate-500 shrink-0">
              <span>
                Total: <b>{filteredStudentsInModal.length}</b> Siswa
              </span>
              <button
                type="button"
                onClick={() => setStudentsModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl font-bold text-slate-700 text-xs transition-colors shadow-2xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}