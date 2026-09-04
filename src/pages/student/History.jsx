import React, { useEffect, useState } from "react";
import { supabase } from "../../utils/supabaseClient";
import {
  Search,
  Filter,
  ArrowUpDown,
  CalendarDays,
  Clock,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
} from "lucide-react";

export default function History() {
  const [logs, setLogs] = useState([]);
  const [coachesMap, setCoachesMap] = useState({});
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const savedUser = localStorage.getItem("user_session");
        if (!savedUser) return;
        const user = JSON.parse(savedUser);

        const { data: student, error: studentError } = await supabase
          .from("students")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (studentError || !student) throw new Error("Data atlet tidak ditemukan");

        const { data: coachData } = await supabase
          .from("coaches")
          .select("id, users(full_name)");

        const cMap = {};
        if (coachData) {
          coachData.forEach((c) => {
            cMap[c.id] = c.users?.full_name;
          });
        }
        setCoachesMap(cMap);

        const { data: attendanceLogs, error } = await supabase
          .from("attendance_logs")
          .select(
            `
            id, status, scanned_at,
            sessions ( name, session_date, coach_ids ),
            student_enrollments ( classes ( name ) )
          `,
          )
          .eq("student_id", student.id)
          .order("scanned_at", { ascending: false });

        if (error) throw error;
        setLogs(attendanceLogs || []);
      } catch (err) {
        console.error("Gagal mengambil riwayat:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, sortOrder]);

  let processedLogs = [...logs];

  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    processedLogs = processedLogs.filter((log) => {
      const sessionMatch = log.sessions?.name?.toLowerCase().includes(query);
      const classMatch = log.student_enrollments?.classes?.name?.toLowerCase().includes(query);
      return sessionMatch || classMatch;
    });
  }

  if (filterStatus !== "all") {
    processedLogs = processedLogs.filter((log) => log.status === filterStatus);
  }

  processedLogs.sort((a, b) => {
    const dateA = new Date(a.scanned_at).getTime();
    const dateB = new Date(b.scanned_at).getTime();
    return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
  });

  const totalPages = Math.ceil(processedLogs.length / ITEMS_PER_PAGE);
  const paginatedLogs = processedLogs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
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

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium animate-pulse">
          Memuat riwayat Anda...
        </p>
      </div>
    );
  }

  return (
    <div className="py-6 font-sans max-w-7xl mx-auto w-full px-2 sm:px-4">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <ClipboardList className="text-blue-600" size={32} />
            Riwayat Kehadiran
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Lacak catatan latihan renang dan ringkasan kehadiran Anda.
          </p>
        </div>
        <div className="bg-blue-50 text-blue-700 px-5 py-3 rounded-2xl text-sm font-bold border border-blue-100 shadow-sm w-fit">
          Total Rekaman: {processedLogs.length}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative md:col-span-2">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={18} className="text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Cari nama sesi atau kelas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
          />
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Filter size={18} className="text-slate-400" />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm appearance-none cursor-pointer font-medium text-slate-600"
          >
            <option value="all">Semua Status</option>
            <option value="hadir_qr">Hadir (QR)</option>
            <option value="hadir_manual">Hadir (Manual)</option>
            <option value="izin">Izin</option>
            <option value="sakit">Sakit</option>
            <option value="alpa">Alpa</option>
          </select>
        </div>

        <button
          onClick={() =>
            setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))
          }
          className="flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold py-3.5 px-4 rounded-2xl shadow-sm transition-all text-sm"
        >
          <ArrowUpDown
            size={18}
            className={
              sortOrder === "desc" ? "text-blue-600" : "text-slate-400"
            }
          />
          {sortOrder === "desc" ? "Terbaru" : "Terlama"}
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-xl shadow-blue-900/5 border border-slate-100 overflow-hidden flex flex-col min-h-[400px] mb-8">
        <div className="hidden md:block overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[11px] uppercase tracking-widest font-black">
                <th className="px-6 py-4">Waktu Pindai</th>
                <th className="px-6 py-4">Rincian Sesi</th>
                <th className="px-6 py-4">Kelas & Instruktur</th>
                <th className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedLogs.map((log) => {
                const scanDateObj = new Date(log.scanned_at);
                const dateStr = scanDateObj.toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                });
                const timeStr = scanDateObj.toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                const sessionDateObj = new Date(log.sessions?.session_date);
                const sessionDateStr = sessionDateObj.toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });
                const sessionTimeStr = sessionDateObj.toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                const assignedCoaches =
                  log.sessions?.coach_ids?.map(
                    (id) => coachesMap[id] || "Instruktur Tidak Dikenal",
                  ) || [];

                const dynamicClassName = log.student_enrollments?.classes?.name || "Kelas Umum";

                return (
                  <tr
                    key={log.id}
                    className="hover:bg-blue-50/30 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="font-bold text-slate-700 text-sm flex items-center gap-1.5">
                          <CalendarDays size={14} className="text-blue-500" />
                          {dateStr}
                        </div>
                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                          <Clock size={14} />
                          {timeStr} WIB
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800 text-base">
                        {log.sessions?.name || "Sesi Tidak Dikenal"}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Jadwal: {sessionDateStr} • {sessionTimeStr} WIB
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-blue-600 text-sm">
                        {dynamicClassName}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        <span className="font-medium">Pelatih:</span>{" "}
                        {assignedCoaches.length > 0
                          ? assignedCoaches.join(", ")
                          : "Belum ditentukan"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`inline-block px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider ${getStatusBadgeStyle(log.status)}`}
                      >
                        {getStatusLabel(log.status)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-slate-100 p-4 space-y-3">
          {paginatedLogs.map((log) => {
            const scanDateObj = new Date(log.scanned_at);
            const dateStr = scanDateObj.toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });
            const timeStr = scanDateObj.toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            });

            const assignedCoaches =
              log.sessions?.coach_ids?.map(
                (id) => coachesMap[id] || "Instruktur",
              ) || [];

            return (
              <div key={log.id} className="pt-3 first:pt-0 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">{log.sessions?.name || "Sesi Latihan"}</h3>
                    <p className="text-xs text-blue-600 font-semibold mt-0.5">
                      {log.student_enrollments?.classes?.name || "Kelas Umum"}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border shrink-0 ${getStatusBadgeStyle(log.status)}`}>
                    {getStatusLabel(log.status)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Pelatih: {assignedCoaches.join(", ") || "Belum ditentukan"}</span>
                  <span>{dateStr} • {timeStr} WIB</span>
                </div>
              </div>
            );
          })}
        </div>

        {paginatedLogs.length === 0 && !loading && (
          <div className="px-6 py-20 text-center text-slate-400">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search size={32} className="text-slate-300" />
            </div>
            <p className="font-bold text-slate-600 text-lg">
              Tidak ada catatan ditemukan
            </p>
            <p className="text-sm mt-1">
              Coba sesuaikan kata kunci pencarian atau opsi filter Anda.
            </p>
          </div>
        )}

        {totalPages > 0 && (
          <div className="p-4 border-t border-slate-50 flex items-center justify-between bg-slate-50/50">
            <span className="text-xs font-medium text-slate-500 pl-2">
              Halaman{" "}
              <span className="font-bold text-slate-800">{currentPage}</span> dari{" "}
              <span className="font-bold text-slate-800">{totalPages}</span>
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}