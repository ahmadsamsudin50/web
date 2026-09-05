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
  Layers,
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

  // selectedAttendees:
  // - Kategori Coach: coachId
  // - Kategori Student: uniqueKey `${studentId}_${enrollmentId}`
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

      // Ambil enrollment yang berstatus 'active' atau 'completed' agar absensi yang baru saja lulus tetap bisa dikoreksi
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
        .select("student_id, coach_id, enrollment_id, status")
        .eq("session_id", sessionId);

      if (error) throw error;
      const map = {};
      (logs || []).forEach((log) => {
        if (log.student_id && log.enrollment_id) {
          map[`${log.student_id}_${log.enrollment_id}`] = log.status;
        }
        if (log.coach_id) {
          map[log.coach_id] = log.status;
        }
      });
      setExistingLogsMap(map);
    } catch (err) {
      console.error("Gagal memuat log presensi sesi:", err.message);
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
      students.forEach((std) => {
        // Tampilkan enrollment yang aktif di sesi ini, ATAU enrollment berstatus 'completed' yang sudah memiliki catatan log pada sesi ini (agar bisa dikoreksi statusnya)
        const matchingEnrollments = std.student_enrollments?.filter((e) => {
          const isClassInSession = activeSessionData.class_ids?.includes(e.class_id);
          if (!isClassInSession) return false;
          if (e.status === "active") return true;
          if (e.status === "completed" && existingLogsMap[`${std.id}_${e.id}`]) return true;
          return false;
        }) || [];

        matchingEnrollments.forEach((enr) => {
          baseList.push({
            uniqueKey: `${std.id}_${enr.id}`,
            studentId: std.id,
            enrollmentId: enr.id,
            className: enr.classes?.name,
            maxSessions: enr.classes?.max_sessions || 12,
            enrollmentStatus: enr.status,
            nis: std.nis,
            fullName: std.users?.full_name,
          });
        });
      });
    } else {
      baseList = (coaches || [])
        .filter((cch) => activeSessionData.coach_ids?.includes(cch.id))
        .map((cch) => ({
          uniqueKey: cch.id,
          coachId: cch.id,
          specialty: cch.specialty,
          fullName: cch.users?.full_name,
        }));
    }
  }

  const filteredList = baseList.filter((item) => {
    const name = item.fullName?.toLowerCase() || "";
    const identifier = attendeeType === "student" ? item.nis : item.specialty;
    const search = localSearch.toLowerCase();
    const className = item.className?.toLowerCase() || "";
    return (
      name.includes(search) ||
      className.includes(search) ||
      (identifier && identifier.toLowerCase().includes(search))
    );
  });

  const toggleSelection = (key) => {
    setSelectedAttendees((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  const toggleSelectAll = () => {
    const filteredKeys = filteredList.map((i) => i.uniqueKey);
    const allSelected =
      filteredKeys.length > 0 && filteredKeys.every((key) => selectedAttendees.includes(key));

    if (allSelected) {
      setSelectedAttendees((prev) => prev.filter((key) => !filteredKeys.includes(key)));
    } else {
      setSelectedAttendees((prev) => Array.from(new Set([...prev, ...filteredKeys])));
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
      for (const itemKey of selectedAttendees) {
        const item = baseList.find((b) => b.uniqueKey === itemKey);
        if (!item) continue;

        if (attendeeType === "student") {
          const { data: existingLog } = await supabase
            .from("attendance_logs")
            .select("id, status")
            .eq("session_id", form.session_id)
            .eq("student_id", item.studentId)
            .eq("enrollment_id", item.enrollmentId)
            .maybeSingle();

          if (existingLog) {
            await supabase
              .from("attendance_logs")
              .update({
                status: form.status,
                scanned_at: new Date().toISOString(),
              })
              .eq("id", existingLog.id);
          } else {
            await supabase.from("attendance_logs").insert([
              {
                session_id: form.session_id,
                student_id: item.studentId,
                enrollment_id: item.enrollmentId,
                status: form.status,
                scanned_at: new Date().toISOString(),
              },
            ]);
          }

          // Sinkronisasi status kelulusan dua arah (P2)
          const { count: validAttendCount } = await supabase
            .from("attendance_logs")
            .select("*", { count: "exact", head: true })
            .eq("enrollment_id", item.enrollmentId)
            .in("status", ["hadir_qr", "hadir_manual"]);

          const totalAttend = validAttendCount || 0;

          if (totalAttend >= item.maxSessions) {
            // Target sesi terpenuhi -> Tandai selesai (completed)
            await supabase
              .from("student_enrollments")
              .update({
                status: "completed",
                completed_at: new Date().toISOString(),
              })
              .eq("id", item.enrollmentId);
          } else {
            // Kehadiran di bawah target (misalnya status diubah ke izin/sakit/alpa) -> Kembalikan ke active
            await supabase
              .from("student_enrollments")
              .update({
                status: "active",
                completed_at: null,
              })
              .eq("id", item.enrollmentId);
          }
        } else {
          // Kategori Coach
          const { data: existingLog } = await supabase
            .from("attendance_logs")
            .select("id")
            .eq("session_id", form.session_id)
            .eq("coach_id", item.coachId)
            .maybeSingle();

          if (existingLog) {
            await supabase
              .from("attendance_logs")
              .update({
                status: form.status,
                scanned_at: new Date().toISOString(),
              })
              .eq("id", existingLog.id);
          } else {
            await supabase.from("attendance_logs").insert([
              {
                session_id: form.session_id,
                coach_id: item.coachId,
                status: form.status,
                scanned_at: new Date().toISOString(),
              },
            ]);
          }
        }
      }

      toast.success(`Berhasil memperbarui kehadiran untuk ${selectedAttendees.length} peserta!`, {
        id: loadingToast,
      });
      setSelectedAttendees([]);
      setLocalSearch("");
      await fetchSessionLogs(form.session_id);
      await loadData();
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
          Pencatatan kehadiran massal atau penyesuaian status izin, sakit, dan alpa per kelas atlet.
        </p>
      </div>

      <div className="max-w-7xl mx-auto bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Kategori Peserta
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleTypeChange("student")}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs border flex items-center justify-center gap-2 transition-all ${
                    attendeeType === "student"
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <Users size={16} /> Atlet
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange("coach")}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs border flex items-center justify-center gap-2 transition-all ${
                    attendeeType === "coach"
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
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
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
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
                <Save size={16} />{" "}
                {submitting ? "Menyimpan..." : `Simpan ${selectedAttendees.length} Kehadiran`}
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
                  placeholder={`Cari nama ${attendeeType === "student" ? "atlet / kelas" : "pelatih"}...`}
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
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  Pilih sesi aktif terlebih dahulu
                </div>
              ) : filteredList.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  Tidak ada peserta ditemukan untuk sesi ini
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredList.map((item) => {
                    const isSelected = selectedAttendees.includes(item.uniqueKey);
                    const currentStatus = existingLogsMap[item.uniqueKey] || "belum_absen";
                    const styleConfig = getStatusBadgeStyle(currentStatus);

                    return (
                      <div
                        key={item.uniqueKey}
                        onClick={() => toggleSelection(item.uniqueKey)}
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
                            <p className="font-bold truncate text-slate-800">{item.fullName}</p>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border shrink-0 ${styleConfig.badge}`}
                            >
                              {styleConfig.label}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium truncate flex items-center gap-1">
                            {attendeeType === "student" ? (
                              <>
                                <Layers size={11} className="text-blue-500 shrink-0" />
                                <span className="font-bold text-blue-700 truncate">{item.className}</span>
                                <span>(NIS: {item.nis})</span>
                                {item.enrollmentStatus === "completed" && (
                                  <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 rounded ml-1">
                                    Lulus
                                  </span>
                                )}
                              </>
                            ) : (
                              item.specialty || "Pelatih"
                            )}
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
              <Save size={16} />{" "}
              {submitting ? "Menyimpan..." : `Simpan ${selectedAttendees.length} Kehadiran`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}