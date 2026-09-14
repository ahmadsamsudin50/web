import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../../utils/supabaseClient";
import { toast, Toaster } from "react-hot-toast";
import * as XLSX from "xlsx";
import {
  ClipboardList,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  CalendarDays,
  X,
  Award,
  Trash2,
  AlertTriangle,
  Users,
} from "lucide-react";

function CustomConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Ya, Hapus",
  isDestructive = true,
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center animate-in zoom-in-95 duration-200">
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${
            isDestructive ? "bg-rose-50 text-rose-500" : "bg-blue-50 text-blue-600"
          }`}
        >
          <AlertTriangle size={28} />
        </div>
        <h3 className="text-base font-black text-slate-800 mb-2">{title}</h3>
        <p className="text-xs text-slate-500 leading-relaxed mb-6">{message}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition-all"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 py-2.5 font-bold rounded-xl text-xs text-white shadow-md transition-all active:scale-95 ${
              isDestructive
                ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/30"
                : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/30"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Recap() {
  const [logs, setLogs] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [attendeeType, setAttendeeType] = useState("student");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterClass, setFilterClass] = useState("all");
  const [studentScope, setStudentScope] = useState("all"); // 'all' atau 'completed_only'
  const [sortOrder, setSortOrder] = useState("desc");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmLabel: "Hapus",
    isDestructive: true,
    onConfirm: null,
  });

  const triggerConfirm = ({ title, message, confirmLabel, isDestructive, onConfirm }) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      confirmLabel: confirmLabel || "Ya, Hapus",
      isDestructive: Boolean(isDestructive),
      onConfirm,
    });
  };

  const closeConfirm = () => {
    setConfirmState((prev) => ({ ...prev, isOpen: false, onConfirm: null }));
  };

  // Mengambil daftar kelas untuk pilihan dropdown filter
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const { data, error } = await supabase
          .from("classes")
          .select("id, name")
          .order("name");
        if (!error && data) {
          setClasses(data);
        }
      } catch (_) {}
    };
    fetchClasses();
  }, []);

  const fetchLogs = async (type) => {
    setLoading(true);
    try {
      if (type === "student") {
        const { data, error } = await supabase
          .from("attendance_logs")
          .select(`
            id, status, scanned_at, enrollment_id, student_id,
            students (
              id, nis, users ( full_name ),
              student_enrollments ( id, status, class_id )
            ),
            student_enrollments ( id, class_id, status, classes ( name ) ),
            sessions ( name, session_date )
          `)
          .not("student_id", "is", null)
          .order("scanned_at", { ascending: false });

        if (error) throw error;
        setLogs(data || []);
      } else {
        const { data, error } = await supabase
          .from("attendance_logs")
          .select(`
            id, status, scanned_at,
            coaches ( specialty, users ( full_name ) ),
            sessions ( name, session_date )
          `)
          .not("coach_id", "is", null)
          .order("scanned_at", { ascending: false });

        if (error) throw error;
        setLogs(data || []);
      }
    } catch (err) {
      toast.error("Gagal mengambil catatan absensi: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(attendeeType);
  }, [attendeeType]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, filterClass, sortOrder, attendeeType, dateFrom, dateTo, studentScope]);

  const handleTypeChange = (type) => {
    setAttendeeType(type);
    setSearchQuery("");
    setFilterStatus("all");
    setFilterClass("all");
    setStudentScope("all");
    setSortOrder("desc");
    setDateFrom("");
    setDateTo("");
    setLogs([]);
  };

  // Helper memeriksa apakah seluruh pendaftaran atlet telah berstatus completed
  const isStudentCompletedAll = (log) => {
    const enrollments = log.students?.student_enrollments;
    if (!enrollments || enrollments.length === 0) return false;
    return enrollments.every((e) => e.status === "completed");
  };

  let processedLogs = [...logs];

  // Filter Sub-navbar: Atlet Masa Latihan Habis
  if (attendeeType === "student" && studentScope === "completed_only") {
    processedLogs = processedLogs.filter((log) => isStudentCompletedAll(log));
  }

  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    processedLogs = processedLogs.filter((log) => {
      if (attendeeType === "student") {
        return (
          log.students?.nis?.toLowerCase().includes(query) ||
          log.students?.users?.full_name?.toLowerCase().includes(query) ||
          log.sessions?.name?.toLowerCase().includes(query) ||
          log.student_enrollments?.classes?.name?.toLowerCase().includes(query)
        );
      } else {
        return (
          log.coaches?.users?.full_name?.toLowerCase().includes(query) ||
          log.coaches?.specialty?.toLowerCase().includes(query) ||
          log.sessions?.name?.toLowerCase().includes(query)
        );
      }
    });
  }

  if (filterStatus !== "all") {
    processedLogs = processedLogs.filter((log) => log.status === filterStatus);
  }

  if (attendeeType === "student" && filterClass !== "all") {
    processedLogs = processedLogs.filter(
      (log) => log.student_enrollments?.class_id === filterClass
    );
  }

  if (dateFrom && dateFrom.trim() !== "") {
    processedLogs = processedLogs.filter(
      (log) => new Date(log.scanned_at) >= new Date(dateFrom + "T00:00:00")
    );
  }
  if (dateTo && dateTo.trim() !== "") {
    processedLogs = processedLogs.filter(
      (log) => new Date(log.scanned_at) <= new Date(dateTo + "T23:59:59")
    );
  }

  processedLogs.sort((a, b) => {
    const dateA = new Date(a.scanned_at).getTime();
    const dateB = new Date(b.scanned_at).getTime();
    return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
  });

  const totalPages = Math.ceil(processedLogs.length / ITEMS_PER_PAGE);
  const paginatedLogs = processedLogs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getStatusLabel = (status) => {
    if (status === "hadir_qr") return "Hadir (QR)";
    if (status === "hadir_manual") return "Hadir (Manual)";
    if (status === "izin") return "Izin";
    if (status === "sakit") return "Sakit";
    if (status === "alpa") return "Alpa";
    return status ? status.replace("_", " ") : "-";
  };

  // Hapus Satu Rekaman Kehadiran
  const handleDeleteSingleLog = (log) => {
    triggerConfirm({
      title: "Hapus Log Kehadiran?",
      message: `Hapus rekaman presensi tanggal ${new Date(log.scanned_at).toLocaleDateString("id-ID")} milik atlet "${log.students?.users?.full_name}"? Tindakan ini permanen.`,
      confirmLabel: "Ya, Hapus",
      isDestructive: true,
      onConfirm: async () => {
        closeConfirm();
        const loadingToast = toast.loading("Menghapus log...");
        try {
          const { error } = await supabase
            .from("attendance_logs")
            .delete()
            .eq("id", log.id);

          if (error) throw error;
          toast.success("Log kehadiran berhasil dihapus!", { id: loadingToast });
          fetchLogs("student");
        } catch (err) {
          toast.error("Gagal menghapus log: " + err.message, { id: loadingToast });
        }
      },
    });
  };

  // Hapus Semua Rekaman Log yang Ditampilkan (Khusus Atlet Habis Masa Latihan)
  const handleDeleteAllCompletedLogs = () => {
    const targetIds = processedLogs.map((l) => l.id);
    if (targetIds.length === 0) return;

    triggerConfirm({
      title: "Hapus Semua Log Masa Latihan Habis?",
      message: `Apakah Anda yakin ingin menghapus ${targetIds.length} rekaman presensi dari seluruh atlet yang telah menyelesaikan masa belajarnya? Tindakan ini tidak dapat dibatalkan.`,
      confirmLabel: `Hapus ${targetIds.length} Rekaman`,
      isDestructive: true,
      onConfirm: async () => {
        closeConfirm();
        const loadingToast = toast.loading(`Menghapus ${targetIds.length} rekaman...`);
        try {
          const { error } = await supabase
            .from("attendance_logs")
            .delete()
            .in("id", targetIds);

          if (error) throw error;
          toast.success(`Berhasil menghapus ${targetIds.length} rekaman absensi!`, { id: loadingToast });
          fetchLogs("student");
        } catch (err) {
          toast.error("Gagal menghapus massal: " + err.message, { id: loadingToast });
        }
      },
    });
  };

  const handleExportExcel = () => {
    const loadingToast = toast.loading("Menyiapkan dokumen Excel...");
    try {
      const excelData = processedLogs.map((log) => {
        const dateObj = new Date(log.scanned_at);
        if (attendeeType === "student") {
          return {
            "Tanggal": dateObj.toLocaleDateString("id-ID"),
            "Waktu": dateObj.toLocaleTimeString("id-ID"),
            "NIS": log.students?.nis || "-",
            "Nama Atlet": log.students?.users?.full_name || "Tidak diketahui",
            "Kelas": log.student_enrollments?.classes?.name || "-",
            "Sesi Latihan": log.sessions?.name || "-",
            "Status Kehadiran": getStatusLabel(log.status),
            "Status Kelulusan": isStudentCompletedAll(log) ? "Masa Belajar Habis" : "Aktif",
          };
        } else {
          return {
            "Tanggal": dateObj.toLocaleDateString("id-ID"),
            "Waktu": dateObj.toLocaleTimeString("id-ID"),
            "Nama Pelatih": log.coaches?.users?.full_name || "Tidak diketahui",
            "Spesialisasi": log.coaches?.specialty || "-",
            "Sesi Latihan": log.sessions?.name || "-",
            "Status Kehadiran": getStatusLabel(log.status),
          };
        }
      });

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        attendeeType === "student" ? "Rekapitulasi Atlet" : "Rekapitulasi Pelatih"
      );
      XLSX.writeFile(
        workbook,
        `Rekap_Presensi_${attendeeType === "student" ? "Atlet" : "Pelatih"}_${Date.now()}.xlsx`
      );
      toast.success("Dokumen Excel berhasil diunduh!", { id: loadingToast });
    } catch (error) {
      toast.error("Gagal mengekspor data ke Excel.", { id: loadingToast });
    }
  };

  const getStatusBadgeStyle = (status) => {
    if (!status) return "bg-slate-100 text-slate-600 border-slate-300";
    const s = status.toLowerCase();
    if (s.includes("hadir_qr")) return "bg-emerald-500 text-white border-emerald-600 shadow-sm";
    if (s.includes("hadir_manual")) return "bg-teal-500 text-white border-teal-600 shadow-sm";
    if (s.includes("izin")) return "bg-blue-500 text-white border-blue-600 shadow-sm";
    if (s.includes("sakit")) return "bg-amber-400 text-amber-950 border-amber-500 shadow-sm";
    if (s.includes("alpa")) return "bg-rose-600 text-white border-rose-700 shadow-sm";
    return "bg-slate-200 text-slate-700 border-slate-300";
  };

  const hasActiveFilters =
    searchQuery ||
    filterStatus !== "all" ||
    (attendeeType === "student" && filterClass !== "all") ||
    dateFrom ||
    dateTo ||
    (attendeeType === "student" && studentScope !== "all");

  const clearAllFilters = () => {
    setSearchQuery("");
    setFilterStatus("all");
    setFilterClass("all");
    setStudentScope("all");
    setDateFrom("");
    setDateTo("");
  };

  // Jumlah atlet habis masa latihan pada rekaman log
  const completedStudentLogsCount = useMemo(() => {
    if (attendeeType !== "student") return 0;
    return logs.filter((l) => isStudentCompletedAll(l)).length;
  }, [logs, attendeeType]);

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans">
      <Toaster position="top-right" />
      <CustomConfirmModal
        isOpen={confirmState.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        isDestructive={confirmState.isDestructive}
      />

      <div className="max-w-7xl mx-auto mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <ClipboardList className="text-blue-600" size={28} />
            Rekapitulasi Kehadiran
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Tinjau, saring, dan ekspor riwayat presensi latihan Siripbiru[cite: 14].
          </p>
        </div>
        <button
          onClick={handleExportExcel}
          disabled={processedLogs.length === 0}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-md text-xs sm:text-sm disabled:opacity-50 transition-all active:scale-95"
        >
          <Download size={16} /> Ekspor ke Excel
        </button>
      </div>

      {/* Navigasi Filter Kategori Atlet & Status Masa Belajar */}
      <div className="max-w-7xl mx-auto mb-4 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="flex gap-2 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
          <button
            onClick={() => handleTypeChange("student")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              attendeeType === "student"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Users size={15} /> Rekap Atlet
          </button>
          <button
            onClick={() => handleTypeChange("coach")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              attendeeType === "coach"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Rekap Pelatih
          </button>
        </div>

        {/* Sub-Filter Khusus Atlet: Semua vs Masa Belajar Habis */}
        {attendeeType === "student" && (
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5 p-1 bg-slate-100 border border-slate-200/80 rounded-xl overflow-x-auto">
              <button
                onClick={() => setStudentScope("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  studentScope === "all"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Semua Atlet
              </button>
              <button
                onClick={() => setStudentScope("completed_only")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  studentScope === "completed_only"
                    ? "bg-amber-500 text-white shadow-sm"
                    : "text-amber-800 hover:bg-amber-100/50"
                }`}
              >
                <Award size={14} /> Masa Latihan Habis
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    studentScope === "completed_only"
                      ? "bg-white/20 text-white"
                      : "bg-amber-200 text-amber-900"
                  }`}
                >
                  {completedStudentLogsCount}
                </span>
              </button>
            </div>

            {/* Tombol Hapus Semua Log untuk Atlet yang Habis Masa Latihan */}
            {studentScope === "completed_only" && processedLogs.length > 0 && (
              <button
                onClick={handleDeleteAllCompletedLogs}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 shrink-0"
                title="Hapus seluruh log yang ditampilkan"
              >
                <Trash2 size={14} />
                <span>Hapus Semua ({processedLogs.length})</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto mb-6 bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={`Cari nama, sesi, atau ${attendeeType === "student" ? "NIS" : "spesialisasi"}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-700 cursor-pointer"
          >
            <option value="all">Semua Status</option>
            <option value="hadir_qr">Hadir (QR)</option>
            <option value="hadir_manual">Hadir (Manual)</option>
            <option value="izin">Izin</option>
            <option value="sakit">Sakit</option>
            <option value="alpa">Alpa</option>
          </select>

          {attendeeType === "student" && (
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-700 cursor-pointer"
            >
              <option value="all">Semua Kelas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
            <CalendarDays size={13} className="text-slate-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-transparent outline-none text-slate-700 cursor-pointer"
            />
            <span className="text-slate-400">-</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-transparent outline-none text-slate-700 cursor-pointer"
            />
          </div>
          <button
            onClick={() => setSortOrder((p) => (p === "desc" ? "asc" : "desc"))}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-600 flex items-center gap-1"
          >
            <ArrowUpDown size={13} /> {sortOrder === "desc" ? "Terbaru" : "Terlama"}
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="px-3 py-2 bg-rose-50 border border-rose-200 rounded-xl font-bold text-rose-600 flex items-center gap-1 hover:bg-rose-100 transition-colors ml-auto"
            >
              <X size={13} /> Bersihkan Filter
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-wider font-bold border-b border-slate-100">
                <th className="px-6 py-4">Waktu Pindai</th>
                <th className="px-6 py-4">Nama Peserta</th>
                <th className="px-6 py-4">Sesi & Kelas</th>
                <th className="px-6 py-4 text-center">Status</th>
                {attendeeType === "student" && studentScope === "completed_only" && (
                  <th className="px-6 py-4 text-right">Aksi</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedLogs.map((log) => {
                const scanDate = new Date(log.scanned_at);
                const dateStr = scanDate.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
                const timeStr = scanDate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
                const isCompleted = attendeeType === "student" && isStudentCompletedAll(log);

                return (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {dateStr} • {timeStr} WIB
                    </td>
                    <td className="px-6 py-4">
                      {attendeeType === "student" ? (
                        <div>
                          <div className="font-bold text-slate-800 flex items-center gap-2">
                            <span>{log.students?.users?.full_name || "Tanpa Nama"}</span>
                            {isCompleted && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                                <Award size={10} /> Habis
                              </span>
                            )}
                          </div>
                          <div className="text-slate-400 font-mono text-[11px]">NIS: {log.students?.nis || "-"}</div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-bold text-slate-800">{log.coaches?.users?.full_name || "Tanpa Nama"}</div>
                          <div className="text-slate-400 text-[11px]">{log.coaches?.specialty || "-"}</div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-700">{log.sessions?.name || "-"}</div>
                      {attendeeType === "student" && (
                        <div className="text-[11px] text-blue-600 font-medium">{log.student_enrollments?.classes?.name || "-"}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${getStatusBadgeStyle(log.status)}`}>
                        {getStatusLabel(log.status)}
                      </span>
                    </td>

                    {/* Tombol Hapus Satuan hanya muncul saat atlet berstatus masa latihan habis */}
                    {attendeeType === "student" && studentScope === "completed_only" && (
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteSingleLog(log)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Hapus catatan presensi ini"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-3">
          {paginatedLogs.map((log) => {
            const scanDate = new Date(log.scanned_at);
            const dateStr = scanDate.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
            const timeStr = scanDate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
            const isCompleted = attendeeType === "student" && isStudentCompletedAll(log);

            return (
              <div key={log.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-slate-800 text-sm">
                        {attendeeType === "student" ? log.students?.users?.full_name : log.coaches?.users?.full_name}
                      </h3>
                      {isCompleted && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300">
                          Habis
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{log.sessions?.name}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border ${getStatusBadgeStyle(log.status)}`}>
                    {getStatusLabel(log.status)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                  <span>{attendeeType === "student" ? log.student_enrollments?.classes?.name : log.coaches?.specialty}</span>
                  <div className="flex items-center gap-2">
                    <span>{dateStr} • {timeStr} WIB</span>
                    {attendeeType === "student" && studentScope === "completed_only" && (
                      <button
                        type="button"
                        onClick={() => handleDeleteSingleLog(log)}
                        className="text-rose-600 p-1 hover:bg-rose-50 rounded"
                        title="Hapus"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {paginatedLogs.length === 0 && !loading && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 shadow-sm">
            <p className="font-bold text-slate-700 text-sm">Tidak ada rekaman kehadiran</p>
            <p className="text-xs mt-1">Coba sesuaikan kata kunci pencarian atau opsi filter status[cite: 14].</p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-4 p-3 bg-white rounded-2xl border border-slate-200 flex items-center justify-between text-xs text-slate-500 shadow-sm">
            <span>
              Halaman <span className="font-bold text-slate-800">{currentPage}</span> dari{" "}
              <span className="font-bold text-slate-800">{totalPages}</span>
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40"
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