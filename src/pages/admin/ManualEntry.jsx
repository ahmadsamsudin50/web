import React, { useEffect, useState } from "react";
import { supabase } from "../../utils/supabaseClient";
import { toast, Toaster } from "react-hot-toast";
import {
  ClipboardEdit,
  CalendarDays,
  Save,
  Activity,
  Users,
  UserPlus,
  Search,
  CheckSquare,
  Square,
} from "lucide-react";

const getStatusBadgeStyle = (status) => {
  if (!status || status === "belum_absen") {
    return {
      card: "bg-white border-slate-200 text-slate-700 hover:border-slate-300",
      badge: "bg-slate-100 text-slate-600 border-slate-200",
      label: "Belum Absen",
    };
  }
  const s = status.toLowerCase();
  if (s.includes("hadir_qr")) {
    return {
      card: "bg-emerald-50/60 border-emerald-300 text-emerald-950",
      badge: "bg-emerald-500 text-white border-emerald-600",
      label: "Hadir (QR)",
    };
  }
  if (s.includes("hadir_manual")) {
    return {
      card: "bg-teal-50/60 border-teal-300 text-teal-950",
      badge: "bg-teal-500 text-white border-teal-600",
      label: "Hadir (Manual)",
    };
  }
  if (s.includes("izin")) {
    return {
      card: "bg-blue-50/60 border-blue-300 text-blue-950",
      badge: "bg-blue-500 text-white border-blue-600",
      label: "Izin",
    };
  }
  if (s.includes("sakit")) {
    return {
      card: "bg-amber-50/60 border-amber-300 text-amber-950",
      badge: "bg-amber-400 text-amber-950 border-amber-500",
      label: "Sakit",
    };
  }
  if (s.includes("alpa")) {
    return {
      card: "bg-rose-50/60 border-rose-300 text-rose-950",
      badge: "bg-rose-600 text-white border-rose-700",
      label: "Alpa",
    };
  }
  return {
    card: "bg-white border-slate-200 text-slate-700",
    badge: "bg-slate-100 text-slate-600 border-slate-200",
    label: status.replace("_", " "),
  };
};

export default function ManualEntry() {
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [attendeeType, setAttendeeType] = useState("student");
  const [form, setForm] = useState({
    session_id: "",
    status: "hadir_manual",
  });

  const [existingLogsMap, setExistingLogsMap] = useState({});
  const [selectedAttendees, setSelectedAttendees] = useState([]);
  const [localSearch, setLocalSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: sess, error: sessError } = await supabase
        .from("sessions")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      const { data: std, error: stdError } = await supabase
        .from("students")
        .select(`
          id, nis, users(full_name),
          student_enrollments(id, class_id, status, classes(name, max_sessions))
        `)
        .order("nis");

      const { data: cch, error: cchError } = await supabase
        .from("coaches")
        .select("id, specialty, users(full_name)")
        .order("created_at");

      if (sessError) throw sessError;
      if (stdError) throw stdError;
      if (cchError) throw cchError;

      if (sess) setSessions(sess);
      if (std) setStudents(std);
      if (cch) setCoaches(cch);
    } catch (error) {
      toast.error("Gagal memuat data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const fetchSessionLogs = async (sessionId) => {
    if (!sessionId) {
      setExistingLogsMap({});
      return;
    }
    try {
      const { data: logs, error } = await supabase
        .from("attendance_logs")
        .select("student_id, coach_id, status")
        .eq("session_id", sessionId);

      if (error) throw error;

      const map = {};
      (logs || []).forEach((log) => {
        if (log.student_id) map[log.student_id] = log.status;
        if (log.coach_id) map[log.coach_id] = log.status;
      });
      setExistingLogsMap(map);
    } catch (err) {
      console.error("Gagal memuat log kehadiran sesi:", err.message);
    }
  };

  useEffect(() => {
    fetchSessionLogs(form.session_id);
  }, [form.session_id]);

  const handleTypeChange = (type) => {
    setAttendeeType(type);
    setSelectedAttendees([]);
    setLocalSearch("");
  };

  const activeSessionData = sessions.find((s) => s.id === form.session_id);

  let baseList = [];
  if (activeSessionData) {
    if (attendeeType === "student") {
      baseList = students.filter((std) => {
        return std.student_enrollments?.some(
          (e) => e.status === "active" && activeSessionData.class_ids?.includes(e.class_id)
        );
      });
    } else {
      baseList = coaches.filter((cch) =>
        activeSessionData.coach_ids?.includes(cch.id)
      );
    }
  }

  const filteredList = baseList.filter((item) => {
    const name = item.users?.full_name?.toLowerCase() || "";
    const identifier = attendeeType === "student" ? item.nis : item.specialty;
    const search = localSearch.toLowerCase();
    return (
      name.includes(search) ||
      (identifier && identifier.toLowerCase().includes(search))
    );
  });

  const toggleSelection = (id) => {
    setSelectedAttendees((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const filteredIds = filteredList.map((i) => i.id);
    const allSelected = filteredIds.length > 0 && filteredIds.every((id) =>
      selectedAttendees.includes(id)
    );
    if (allSelected) {
      setSelectedAttendees((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedAttendees((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.session_id) {
      toast.error("Silakan pilih sesi yang sedang aktif.");
      return;
    }
    if (selectedAttendees.length === 0) {
      toast.error("Pilih minimal satu peserta.");
      return;
    }

    setSubmitting(true);
    const loadingToast = toast.loading(`Menyimpan ${selectedAttendees.length} catatan kehadiran...`);

    try {
      for (const attendeeId of selectedAttendees) {
        const idField = attendeeType === "student" ? "student_id" : "coach_id";
        let enrollmentId = null;
        let maxSessions = 12;

        if (attendeeType === "student") {
          const studentData = students.find((s) => s.id === attendeeId);
          // Cari pendaftaran kelas yang aktif dan cocok dengan sesi latihan ini
          const activeEnrollment = studentData?.student_enrollments?.find(
            (e) => e.status === "active" && activeSessionData.class_ids?.includes(e.class_id)
          );
          if (activeEnrollment) {
            enrollmentId = activeEnrollment.id;
            maxSessions = activeEnrollment.classes?.max_sessions || 12;
          }
        }

        const { data: existingLog } = await supabase
          .from("attendance_logs")
          .select("id")
          .eq("session_id", form.session_id)
          .eq(idField, attendeeId)
          .maybeSingle();

        if (existingLog) {
          const updatePayload = {
            status: form.status,
            scanned_at: new Date().toISOString(),
          };
          if (enrollmentId) updatePayload.enrollment_id = enrollmentId;
          await supabase.from("attendance_logs").update(updatePayload).eq("id", existingLog.id);
        } else {
          const insertPayload = {
            session_id: form.session_id,
            [idField]: attendeeId,
            status: form.status,
          };
          if (enrollmentId) insertPayload.enrollment_id = enrollmentId;
          await supabase.from("attendance_logs").insert([insertPayload]);
        }

        // Jika siswa hadir dan kuota sesi kelas tersebut telah terpenuhi, ubah status pendaftaran kelas ini menjadi completed
        if (
          attendeeType === "student" &&
          enrollmentId &&
          (form.status === "hadir_manual" || form.status === "hadir_qr")
        ) {
          const { count: attendCount } = await supabase
            .from("attendance_logs")
            .select("*", { count: "exact", head: true })
            .eq("enrollment_id", enrollmentId)
            .in("status", ["hadir_qr", "hadir_manual"]);

          if (attendCount >= maxSessions) {
            await supabase
              .from("student_enrollments")
              .update({ status: "completed", completed_at: new Date().toISOString() })
              .eq("id", enrollmentId);
          }
        }
      }

      toast.success(`Berhasil mencatat kehadiran untuk ${selectedAttendees.length} orang!`, { id: loadingToast });
      setSelectedAttendees([]);
      setLocalSearch("");
      fetchSessionLogs(form.session_id);
      loadData();
    } catch (error) {
      toast.error("Terjadi kendala saat menyimpan: " + error.message, { id: loadingToast });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center font-sans">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
        <p className="text-slate-500 text-sm font-medium animate-pulse">Memuat formulir...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <ClipboardEdit className="text-blue-600" size={28} />
          Entri Presensi Manual
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Pencatatan kehadiran massal atau penyesuaian status izin, sakit, dan alpa.
        </p>
      </div>

      <div className="max-w-7xl mx-auto bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kategori Peserta</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleTypeChange("student")}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs border flex items-center justify-center gap-2 transition-all ${
                    attendeeType === "student" ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <Users size={16} /> Atlet
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange("coach")}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs border flex items-center justify-center gap-2 transition-all ${
                    attendeeType === "coach" ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <UserPlus size={16} /> Pelatih
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <CalendarDays size={13} /> Sesi Latihan Aktif
              </label>
              <select
                required
                value={form.session_id}
                onChange={(e) => {
                  setForm({ ...form, session_id: e.target.value });
                  setSelectedAttendees([]);
                  setLocalSearch("");
                }}
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">-- Pilih Sesi Latihan --</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Activity size={13} /> Status Kehadiran Baru
              </label>
              <select
                required
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="hadir_manual">Hadir (Manual)</option>
                <option value="izin">Izin</option>
                <option value="sakit">Sakit</option>
                <option value="alpa">Alpa</option>
              </select>
            </div>

            <div className="pt-4 hidden md:block">
              <button
                type="submit"
                disabled={submitting || !form.session_id || selectedAttendees.length === 0}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md disabled:opacity-50 transition-all active:scale-95"
              >
                <Save size={16} /> {submitting ? "Menyimpan..." : `Simpan ${selectedAttendees.length} Kehadiran`}
              </button>
            </div>
          </div>

          <div className="flex-[1.5] bg-slate-50 border border-slate-200 rounded-2xl flex flex-col overflow-hidden h-[460px]">
            <div className="p-3 border-b border-slate-200 bg-white flex justify-between items-center gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  disabled={!form.session_id}
                  placeholder={`Cari nama ${attendeeType === "student" ? "atlet" : "pelatih"}...`}
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>
              <button
                type="button"
                onClick={toggleSelectAll}
                disabled={!form.session_id}
                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-50 shrink-0 transition-colors"
              >
                Pilih Semua
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {!form.session_id ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">Pilih sesi aktif terlebih dahulu</div>
              ) : filteredList.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">Tidak ada data ditemukan untuk sesi ini</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredList.map((item) => {
                    const isSelected = selectedAttendees.includes(item.id);
                    const currentStatus = existingLogsMap[item.id] || "belum_absen";
                    const styleConfig = getStatusBadgeStyle(currentStatus);

                    // Ambil pendaftaran aktif yang sesuai dengan sesi latihan ini
                    const relevantEnrollment = attendeeType === "student"
                      ? item.student_enrollments?.find(
                          (e) => e.status === "active" && activeSessionData?.class_ids?.includes(e.class_id)
                        )
                      : null;

                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleSelection(item.id)}
                        className={`p-3 rounded-2xl border-2 flex items-start gap-2.5 cursor-pointer text-xs transition-all shadow-sm ${
                          isSelected
                            ? "ring-2 ring-blue-600 border-blue-600 bg-blue-50/90"
                            : styleConfig.card
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {isSelected ? (
                            <CheckSquare size={16} className="text-blue-600" />
                          ) : (
                            <Square size={16} className="text-slate-400" />
                          )}
                        </div>

                        <div className="truncate flex-1">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <p className="font-bold truncate text-slate-800">{item.users?.full_name}</p>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border shrink-0 ${styleConfig.badge}`}>
                              {styleConfig.label}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium truncate">
                            {attendeeType === "student"
                              ? `NIS: ${item.nis} • ${relevantEnrollment?.classes?.name || "Kelas"}`
                              : item.specialty || "Pelatih"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="md:hidden">
            <button
              type="submit"
              disabled={submitting || !form.session_id || selectedAttendees.length === 0}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md disabled:opacity-50 transition-all active:scale-95"
            >
              <Save size={16} /> {submitting ? "Menyimpan..." : `Simpan ${selectedAttendees.length} Kehadiran`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}