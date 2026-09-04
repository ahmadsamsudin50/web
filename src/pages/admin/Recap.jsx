import React, { useEffect, useState } from "react";
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
} from "lucide-react";

export default function Recap() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [attendeeType, setAttendeeType] = useState("student");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortOrder, setSortOrder] = useState("desc");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const fetchLogs = async (type) => {
    setLoading(true);
    try {
      if (type === "student") {
        const { data, error } = await supabase
          .from("attendance_logs")
          .select(`
            id, status, scanned_at, enrollment_id,
            students ( nis, users ( full_name ) ),
            student_enrollments ( classes ( name ) ),
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
  }, [searchQuery, filterStatus, sortOrder, attendeeType, dateFrom, dateTo]);

  const handleTypeChange = (type) => {
    setAttendeeType(type);
    setSearchQuery("");
    setFilterStatus("all");
    setSortOrder("desc");
    setDateFrom("");
    setDateTo("");
    setLogs([]);
  };

  let processedLogs = [...logs];
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

  const hasActiveFilters = searchQuery || filterStatus !== "all" || dateFrom || dateTo;
  const clearAllFilters = () => {
    setSearchQuery("");
    setFilterStatus("all");
    setDateFrom("");
    setDateTo("");
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <ClipboardList className="text-blue-600" size={28} />
            Rekapitulasi Kehadiran
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Tinjau, saring, dan ekspor riwayat presensi latihan Siripbiru.
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

      <div className="max-w-7xl mx-auto mb-6 bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              onClick={() => handleTypeChange("student")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                attendeeType === "student" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Atlet
            </button>
            <button
              onClick={() => handleTypeChange("coach")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                attendeeType === "coach" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Pelatih
            </button>
          </div>
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={`Cari nama, sesi, atau ${attendeeType === "student" ? "NIS" : "spesialisasi"}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>
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
                <th className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedLogs.map((log) => {
                const scanDate = new Date(log.scanned_at);
                const dateStr = scanDate.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
                const timeStr = scanDate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

                return (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {dateStr} • {timeStr} WIB
                    </td>
                    <td className="px-6 py-4">
                      {attendeeType === "student" ? (
                        <div>
                          <div className="font-bold text-slate-800">{log.students?.users?.full_name || "Tanpa Nama"}</div>
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
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${getStatusBadgeStyle(log.status)}`}>
                        {getStatusLabel(log.status)}
                      </span>
                    </td>
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

            return (
              <div key={log.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">
                      {attendeeType === "student" ? log.students?.users?.full_name : log.coaches?.users?.full_name}
                    </h3>
                    <p className="text-xs text-slate-400">{log.sessions?.name}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border ${getStatusBadgeStyle(log.status)}`}>
                    {getStatusLabel(log.status)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                  <span>{attendeeType === "student" ? log.student_enrollments?.classes?.name : log.coaches?.specialty}</span>
                  <span>{dateStr} • {timeStr} WIB</span>
                </div>
              </div>
            );
          })}
        </div>

        {paginatedLogs.length === 0 && !loading && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 shadow-sm">
            <p className="font-bold text-slate-700 text-sm">Tidak ada rekaman kehadiran</p>
            <p className="text-xs mt-1">Coba sesuaikan kata kunci pencarian atau opsi filter status.</p>
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