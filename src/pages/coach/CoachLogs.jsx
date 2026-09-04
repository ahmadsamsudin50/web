import React, { useEffect, useState } from "react";
import { supabase } from "../../utils/supabaseClient";
import { toast, Toaster } from "react-hot-toast";
import {
  ClipboardList,
  Search,
  CalendarDays,
  Clock,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  X,
} from "lucide-react";

export default function CoachLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortOrder, setSortOrder] = useState("desc");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const savedUser = localStorage.getItem("user_session");
        if (!savedUser) throw new Error("Sesi berakhir. Silakan masuk kembali.");
        const user = JSON.parse(savedUser);

        const { data: coachData, error: coachError } = await supabase
          .from("coaches")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (coachError || !coachData) throw new Error("Profil instruktur tidak ditemukan.");

        const { data, error } = await supabase
          .from("attendance_logs")
          .select(`
            id, status, scanned_at,
            sessions ( name, session_date )
          `)
          .eq("coach_id", coachData.id)
          .order("scanned_at", { ascending: false });

        if (error) throw error;
        setLogs(data || []);
      } catch (err) {
        toast.error("Gagal memuat catatan kehadiran: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, sortOrder, dateFrom, dateTo]);

  let processedLogs = [...logs];
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    processedLogs = processedLogs.filter((log) =>
      log.sessions?.name?.toLowerCase().includes(query)
    );
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

  const getStatusLabel = (status) => {
    if (status === "hadir_qr") return "Hadir (QR)";
    if (status === "hadir_manual") return "Hadir (Manual)";
    if (status === "izin") return "Izin";
    if (status === "sakit") return "Sakit";
    if (status === "alpa") return "Alpa";
    return status ? status.replace("_", " ") : "-";
  };

  const totalPresent = logs.filter((l) => l.status.includes("hadir")).length;
  const totalExcused = logs.filter((l) => l.status === "izin").length;
  const totalSick = logs.filter((l) => l.status === "sakit").length;
  const totalAbsent = logs.filter((l) => l.status === "alpa").length;

  const hasActiveFilters = searchQuery || filterStatus !== "all" || dateFrom || dateTo;
  const clearFilters = () => {
    setSearchQuery("");
    setFilterStatus("all");
    setDateFrom("");
    setDateTo("");
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center font-sans">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
        <p className="text-slate-500 text-sm font-medium animate-pulse">Memuat log kehadiran...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <ClipboardList className="text-blue-600" size={28} />
          Catatan Kehadiran Instruktur
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Riwayat absensi dan rekaman penugasan melatih Anda.
        </p>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Hadir", value: totalPresent, color: "text-emerald-600", bg: "bg-emerald-50/60" },
          { label: "Izin", value: totalExcused, color: "text-blue-600", bg: "bg-blue-50/60" },
          { label: "Sakit", value: totalSick, color: "text-amber-600", bg: "bg-amber-50/60" },
          { label: "Alpa", value: totalAbsent, color: "text-rose-600", bg: "bg-rose-50/60" },
        ].map((card) => (
          <div key={card.label} className={`rounded-2xl p-4 border border-slate-200 shadow-sm ${card.bg}`}>
            <div className={`text-2xl font-black ${card.color}`}>{card.value}</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto mb-6 bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-sm">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama sesi latihan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none font-medium cursor-pointer"
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
              className="bg-transparent outline-none text-xs text-slate-700 cursor-pointer"
            />
            <span className="text-slate-400 text-xs">-</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-transparent outline-none text-xs text-slate-700 cursor-pointer"
            />
          </div>
          <button
            onClick={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-1"
          >
            <ArrowUpDown size={13} /> {sortOrder === "desc" ? "Terbaru" : "Terlama"}
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-600 flex items-center gap-1 hover:bg-rose-100 transition-colors ml-auto"
            >
              <X size={13} /> Bersihkan Filter
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-wider font-bold border-b border-slate-100">
                <th className="px-6 py-4">Waktu Pindai</th>
                <th className="px-6 py-4">Rincian Sesi</th>
                <th className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedLogs.map((log) => {
                const scanDate = new Date(log.scanned_at);
                const dateStr = scanDate.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
                const timeStr = scanDate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
                return (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {dateStr} • {timeStr} WIB
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 text-sm">{log.sessions?.name || "Sesi Latihan"}</div>
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
            const dateStr = scanDate.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
            const timeStr = scanDate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
            return (
              <div key={log.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-slate-800 text-sm">{log.sessions?.name || "Sesi Latihan"}</h3>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${getStatusBadgeStyle(log.status)}`}>
                    {getStatusLabel(log.status)}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{dateStr} • {timeStr} WIB</p>
              </div>
            );
          })}
        </div>

        {paginatedLogs.length === 0 && !loading && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
            <p className="font-bold text-slate-700 text-sm">Tidak ada rekaman kehadiran</p>
            <p className="text-xs mt-1">Coba sesuaikan kata kunci pencarian atau opsi filter Anda.</p>
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