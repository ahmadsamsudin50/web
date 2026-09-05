import React, { useEffect, useState } from "react";
import { supabase } from "../../utils/supabaseClient";
import { v4 as uuidv4 } from "uuid";
import { toast, Toaster } from "react-hot-toast";
import {
  UserPlus,
  Edit2,
  Trash2,
  Phone,
  MapPin,
  User,
  Search,
  ArrowUpDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  X,
  Save,
  Eye,
  EyeOff,
  Hash,
  Clock,
  Award,
} from "lucide-react";

function CustomConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Ya, Lanjutkan",
  isDestructive = false,
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
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

export default function StudentManage() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Tab opsi: active, completed_only, pending, rejected
  const [activeTab, setActiveTab] = useState("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClass, setFilterClass] = useState("all");
  const [sortOrder, setSortOrder] = useState("asc");

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [currentPasswordInDb, setCurrentPasswordInDb] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const initialForm = {
    full_name: "",
    email: "",
    password: "",
    nis: "",
    parent_name: "",
    age: "",
    phone_number: "",
    address: "",
  };
  const [formData, setFormData] = useState(initialForm);

  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmLabel: "",
    isDestructive: false,
    onConfirm: null,
  });

  const triggerConfirm = ({ title, message, confirmLabel, isDestructive, onConfirm }) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      confirmLabel: confirmLabel || "Ya, Lanjutkan",
      isDestructive: Boolean(isDestructive),
      onConfirm,
    });
  };

  const closeConfirm = () => {
    setConfirmState((prev) => ({ ...prev, isOpen: false, onConfirm: null }));
  };

  // Mencari nomor urut NIS terendah yang kosong
  const findAvailableNis = async () => {
    try {
      const { data, error } = await supabase.from("students").select("nis");
      if (error) throw error;
      const rawList = Array.isArray(data) ? data : [];
      const taken = new Set(
        rawList
          .map((s) => parseInt(String(s.nis || "").replace(/\D/g, ""), 10))
          .filter((n) => !isNaN(n) && n > 0)
      );
      let candidate = 1;
      while (taken.has(candidate)) {
        candidate++;
      }
      return String(candidate);
    } catch {
      return "1";
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: cls, error: clsError } = await supabase
        .from("classes")
        .select("id, name, category")
        .order("name");

      if (clsError) throw clsError;
      setClasses(Array.isArray(cls) ? cls : []);

      const { data: std, error: stdError } = await supabase
        .from("students")
        .select(`
          *,
          users ( id, full_name, email, password, status ),
          student_enrollments ( id, class_id, status, completed_at, classes ( name, category, max_sessions ) )
        `)
        .order("created_at", { ascending: false });

      if (stdError) throw stdError;

      if (Array.isArray(std)) {
        const formatted = std.map((s) => {
          const enrollments = Array.isArray(s.student_enrollments) ? s.student_enrollments : [];
          return {
            ...s,
            enrollments,
            activeClasses: enrollments.filter((e) => e && e.status === "active"),
            completedClasses: enrollments.filter((e) => e && e.status === "completed"),
          };
        });
        setStudents(formatted);
      } else {
        setStudents([]);
      }
    } catch (err) {
      toast.error("Gagal memuat data: " + err.message);
      setStudents([]);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = async () => {
    const nextNis = await findAvailableNis();
    setFormData({
      ...initialForm,
      nis: nextNis,
    });
    setIsEditing(false);
    setSelectedStudentId(null);
    setSelectedUserId(null);
    setCurrentPasswordInDb("");
    setShowPassword(false);
    setIsFormModalOpen(true);
  };

  const openEditModal = (s) => {
    const existingPassword = s.users?.password || "";
    setFormData({
      full_name: s.users?.full_name || "",
      email: s.users?.email || "",
      password: "", // Dikosongkan agar opsional diubah
      nis: s.nis || "",
      parent_name: s.parent_name || "",
      age: s.age ?? "",
      phone_number: s.phone_number || "",
      address: s.address || "",
    });
    setIsEditing(true);
    setSelectedStudentId(s.id);
    setSelectedUserId(s.user_id);
    setCurrentPasswordInDb(existingPassword);
    setShowPassword(false);
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const loadingToast = toast.loading(
      isEditing ? "Memperbarui data profil..." : "Mendaftarkan atlet baru..."
    );

    try {
      const trimmedPassword = (formData.password || "").trim();

      if (isEditing) {
        const userPayload = {
          full_name: (formData.full_name || "").trim(),
          email: (formData.email || "").trim(),
        };

        // Hanya perbarui password jika user mengisinya
        if (trimmedPassword) {
          if (trimmedPassword.length < 6) {
            throw new Error("Kata sandi baru minimal terdiri dari 6 karakter.");
          }
          userPayload.password = trimmedPassword;
        }

        const { error: userError } = await supabase
          .from("users")
          .update(userPayload)
          .eq("id", selectedUserId);
        if (userError) throw userError;

        const { error: studentError } = await supabase
          .from("students")
          .update({
            nis: (formData.nis || "").trim(),
            parent_name: (formData.parent_name || "").trim(),
            age: formData.age ? parseInt(formData.age, 10) : null,
            phone_number: (formData.phone_number || "").trim(),
            address: (formData.address || "").trim(),
          })
          .eq("id", selectedStudentId);
        if (studentError) throw studentError;

        toast.success("Profil atlet berhasil diperbarui!", { id: loadingToast });
      } else {
        if (!trimmedPassword || trimmedPassword.length < 6) {
          throw new Error("Kata sandi untuk atlet baru wajib minimal 6 karakter.");
        }

        const { data: existingUser } = await supabase
          .from("users")
          .select("id")
          .eq("email", (formData.email || "").trim())
          .maybeSingle();
        if (existingUser) throw new Error("Email ini telah terdaftar di sistem.");

        let targetNis = (formData.nis || "").trim();
        const { data: existingNis } = await supabase
          .from("students")
          .select("id")
          .eq("nis", targetNis)
          .maybeSingle();

        if (existingNis) {
          targetNis = await findAvailableNis();
          setFormData((prev) => ({ ...prev, nis: targetNis }));
          throw new Error(
            "Nomor urut NIS baru saja terpakai. Nomor telah diperbarui otomatis, silakan klik simpan lagi."
          );
        }

        const { data: newUser, error: userError } = await supabase
          .from("users")
          .insert([
            {
              email: (formData.email || "").trim(),
              password: trimmedPassword,
              full_name: (formData.full_name || "").trim(),
              role: "student",
              status: "active",
            },
          ])
          .select()
          .single();
        if (userError) throw userError;

        const { error: studentError } = await supabase.from("students").insert([
          {
            user_id: newUser.id,
            nis: targetNis,
            parent_name: (formData.parent_name || "").trim(),
            age: formData.age ? parseInt(formData.age, 10) : null,
            phone_number: (formData.phone_number || "").trim(),
            address: (formData.address || "").trim(),
            qr_token: uuidv4(),
          },
        ]);

        if (studentError) {
          await supabase.from("users").delete().eq("id", newUser.id);
          throw studentError;
        }

        toast.success(
          "Atlet berhasil didaftarkan! Murid dapat memilih kelas secara mandiri di portal atlet.",
          { id: loadingToast }
        );
      }

      setIsFormModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.message || "Terjadi kesalahan.", { id: loadingToast });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprovalAction = (userId, newStatus, studentName) => {
    const isApprove = newStatus === "active";
    triggerConfirm({
      title: isApprove ? "Setujui Pendaftaran?" : "Tolak Pendaftaran?",
      message: `Konfirmasi ${isApprove ? "persetujuan" : "penolakan"} pendaftaran untuk atlet ${studentName}.`,
      confirmLabel: isApprove ? "Ya, Setujui" : "Ya, Tolak",
      isDestructive: !isApprove,
      onConfirm: async () => {
        closeConfirm();
        const loadingToast = toast.loading("Memproses status akun...");
        try {
          const { error } = await supabase.from("users").update({ status: newStatus }).eq("id", userId);
          if (error) throw error;
          toast.success(`Pendaftaran berhasil ${isApprove ? "disetujui" : "ditolak"}!`, { id: loadingToast });
          fetchData();
        } catch (error) {
          toast.error(`Gagal memproses: ${error.message}`, { id: loadingToast });
        }
      },
    });
  };

  // Safe Cascade Delete
  const handleDeleteStudent = (s) => {
    triggerConfirm({
      title: "Hapus Data Atlet?",
      message: `Apakah Anda yakin ingin menghapus atlet "${s.users?.full_name}"? Seluruh data riwayat presensi, pendaftaran kelas, dan akun login akan dihapus permanen.`,
      confirmLabel: "Hapus Permanen",
      isDestructive: true,
      onConfirm: async () => {
        closeConfirm();
        const loadingToast = toast.loading("Menghapus seluruh rekaman...");
        try {
          // 1. Hapus seluruh log absensi atlet terlebih dahulu
          const { error: logErr } = await supabase
            .from("attendance_logs")
            .delete()
            .eq("student_id", s.id);
          if (logErr) throw logErr;

          // 2. Hapus seluruh pendaftaran kelas
          const { error: enrollErr } = await supabase
            .from("student_enrollments")
            .delete()
            .eq("student_id", s.id);
          if (enrollErr) throw enrollErr;

          // 3. Hapus riwayat pembayaran
          const { error: payErr } = await supabase
            .from("payments")
            .delete()
            .eq("student_id", s.id);
          if (payErr) throw payErr;

          // 4. Hapus data profil atlet
          const { error: studentErr } = await supabase
            .from("students")
            .delete()
            .eq("id", s.id);
          if (studentErr) throw studentErr;

          // 5. Hapus akun pengguna di users
          const { error: userErr } = await supabase
            .from("users")
            .delete()
            .eq("id", s.user_id);
          if (userErr) throw userErr;

          toast.success("Data atlet berhasil dihapus!", { id: loadingToast });
          fetchData();
        } catch (error) {
          toast.error(`Gagal menghapus: ${error.message}`, { id: loadingToast });
        }
      },
    });
  };

  // Filter Tab
  const filteredByTab = Array.isArray(students)
    ? students.filter((s) => {
        if (activeTab === "active") {
          return s.users?.status === "active";
        }
        if (activeTab === "completed_only") {
          return s.users?.status === "active" && s.completedClasses?.length > 0;
        }
        if (activeTab === "pending") {
          return s.users?.status === "pending";
        }
        if (activeTab === "rejected") {
          return s.users?.status === "rejected";
        }
        return true;
      })
    : [];

  const processedStudents = filteredByTab
    .filter((s) => {
      const q = (searchQuery || "").toLowerCase();
      const matchSearch =
        !q ||
        s.users?.full_name?.toLowerCase().includes(q) ||
        s.nis?.toLowerCase().includes(q) ||
        s.parent_name?.toLowerCase().includes(q) ||
        s.phone_number?.toLowerCase().includes(q);

      const hasClass =
        filterClass === "all" ||
        (Array.isArray(s.enrollments) && s.enrollments.some((e) => e.class_id === filterClass));

      return matchSearch && hasClass;
    })
    .sort((a, b) => {
      const nameA = a.users?.full_name?.toLowerCase() || "";
      const nameB = b.users?.full_name?.toLowerCase() || "";
      return sortOrder === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });

  const counts = {
    active: Array.isArray(students) ? students.filter((s) => s.users?.status === "active").length : 0,
    completed: Array.isArray(students)
      ? students.filter((s) => s.users?.status === "active" && s.completedClasses?.length > 0).length
      : 0,
    pending: Array.isArray(students) ? students.filter((s) => s.users?.status === "pending").length : 0,
    rejected: Array.isArray(students) ? students.filter((s) => s.users?.status === "rejected").length : 0,
  };

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
            <UserPlus className="text-blue-600" size={28} />
            Registri Atlet
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Kelola data diri atlet, verifikasi akun, dan pantau status masa latihan siswa.
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-md text-xs sm:text-sm transition-all active:scale-95"
        >
          <Plus size={16} /> Tambah Atlet Baru
        </button>
      </div>

      {/* Baris Tab Navigasi */}
      <div className="max-w-7xl mx-auto mb-6 flex gap-2 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("active")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
            activeTab === "active"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <CheckCircle2 size={16} /> Atlet Terdaftar
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 text-white font-bold">
            {counts.active}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("completed_only")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
            activeTab === "completed_only"
              ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Award size={16} /> Masa Belajar Habis
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              activeTab === "completed_only"
                ? "bg-white/20 text-white"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {counts.completed}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("pending")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
            activeTab === "pending"
              ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <AlertTriangle size={16} /> Menunggu Persetujuan Akun
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">
            {counts.pending}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("rejected")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
            activeTab === "rejected"
              ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <XCircle size={16} /> Ditolak
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold">
            {counts.rejected}
          </span>
        </button>
      </div>

      {/* Filter dan Pencarian */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari atlet berdasarkan nama, NIS, orang tua/wali, atau telepon..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          />
        </div>
        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700 outline-none cursor-pointer"
        >
          <option value="all">Semua Kelas</option>
          {Array.isArray(classes) &&
            classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
        <button
          type="button"
          onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 flex items-center justify-center gap-1.5"
        >
          <ArrowUpDown size={14} /> {sortOrder === "asc" ? "Nama A - Z" : "Nama Z - A"}
        </button>
      </div>

      {/* Tabel Data Atlet */}
      <div className="max-w-7xl mx-auto bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-wider font-bold border-b border-slate-100">
                <th className="px-5 py-3.5">Identitas Atlet</th>
                <th className="px-5 py-3.5">Status Kelas & Pertemuan</th>
                <th className="px-5 py-3.5">Nama Orang Tua / Usia</th>
                <th className="px-5 py-3.5">Kontak & Alamat</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {processedStudents.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                        <User size={16} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-sm">
                          {s.users?.full_name || "Tanpa Nama"}
                        </div>
                        <div className="text-slate-400 font-mono text-[11px]">NIS: {s.nis}</div>
                        <div className="text-slate-400 text-[10px]">{s.users?.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Kolom Status Kelas & Masa Habis */}
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1.5 max-w-xs">
                      {s.enrollments && s.enrollments.length > 0 ? (
                        s.enrollments.map((enr, i) => {
                          const isCompleted = enr.status === "completed";
                          return (
                            <div
                              key={i}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                                isCompleted
                                  ? "bg-amber-50 text-amber-900 border-amber-200"
                                  : "bg-emerald-50 text-emerald-800 border-emerald-200"
                              }`}
                            >
                              {isCompleted ? (
                                <Clock size={11} className="text-amber-600 shrink-0" />
                              ) : (
                                <CheckCircle2 size={11} className="text-emerald-600 shrink-0" />
                              )}
                              <span className={`truncate ${isCompleted ? "line-through opacity-80" : ""}`}>
                                {enr.classes?.name}
                              </span>
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded font-black shrink-0 ${
                                  isCompleted
                                    ? "bg-amber-200/70 text-amber-950"
                                    : "bg-emerald-200/60 text-emerald-950"
                                }`}
                              >
                                {isCompleted ? "Selesai (Habis)" : "Aktif"}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Belum ada kelas</span>
                      )}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-700">{s.parent_name || "-"}</div>
                    <div className="text-slate-400 text-[11px]">
                      {s.age ? `${s.age} Tahun` : "Usia belum diisi"}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <div className="text-slate-600 flex items-center gap-1.5">
                      <Phone size={12} className="text-slate-400 shrink-0" />
                      <span>{s.phone_number || "-"}</span>
                    </div>
                    <div className="text-slate-400 text-[11px] truncate max-w-xs mt-0.5 flex items-center gap-1.5">
                      <MapPin size={12} className="text-slate-400 shrink-0" />
                      <span className="truncate">{s.address || "-"}</span>
                    </div>
                  </td>

                  <td className="px-5 py-4 text-right">
                    {activeTab === "pending" ? (
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleApprovalAction(s.user_id, "active", s.users?.full_name)}
                          className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg font-bold transition-colors"
                        >
                          Setujui
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApprovalAction(s.user_id, "rejected", s.users?.full_name)}
                          className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white rounded-lg font-bold transition-colors"
                        >
                          Tolak
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(s)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ubah Data Diri Atlet"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStudent(s)}
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Hapus Data Atlet"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}

              {processedStudents.length === 0 && !loading && (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-400">
                    Tidak ada data atlet pada kategori ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah/Edit Profil Atlet */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <UserPlus size={18} className="text-blue-600" />
                {isEditing ? "Perbarui Data Diri Atlet" : "Tambah Atlet Baru"}
              </h3>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div className="space-y-3">
                <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Akses Akun</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-600 uppercase text-[10px] mb-1">
                      Nama Lengkap Atlet
                    </label>
                    <input
                      required
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                      placeholder="Nama lengkap"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 uppercase text-[10px] mb-1">
                      Alamat Email
                    </label>
                    <input
                      required
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                      placeholder="email@atlet.com"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-bold text-slate-600 uppercase text-[10px]">
                        Kata Sandi
                      </label>
                      {isEditing && (
                        <span className="text-[10px] text-slate-400 italic">
                          (Kosongkan jika tidak ingin mengubah sandi)
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required={!isEditing}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-3 py-2 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                        placeholder={isEditing ? "Masukkan kata sandi baru..." : "Minimal 6 karakter"}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                        title={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 border-t border-slate-100 pt-3">
                <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                  Data Pribadi Atlet
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-600 uppercase text-[10px] mb-1">
                      Nomor Induk Siswa (NIS)
                    </label>
                    <div className="relative">
                      <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" />
                      <input
                        readOnly
                        value={formData.nis}
                        className="w-full pl-8 pr-3 py-2 bg-blue-50/60 border border-blue-200 text-blue-800 font-bold font-mono rounded-xl text-xs outline-none cursor-not-allowed"
                        title="Nomor urut NIS dihasilkan otomatis oleh sistem"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 uppercase text-[10px] mb-1">
                      Usia (Tahun)
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                      placeholder="Contoh: 14"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 uppercase text-[10px] mb-1">
                      Nama Orang Tua / Wali
                    </label>
                    <input
                      required
                      value={formData.parent_name}
                      onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                      placeholder="Nama wali"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 uppercase text-[10px] mb-1">
                      Nomor WhatsApp
                    </label>
                    <input
                      required
                      value={formData.phone_number}
                      onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                      placeholder="08..."
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-600 uppercase text-[10px] mb-1">
                      Alamat Tempat Tinggal
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 resize-none font-medium"
                      placeholder="Alamat lengkap rumah"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-100 text-[11px] text-slate-500">
                <span className="font-bold text-blue-700">Catatan Sistem:</span> Pemilihan dan aktivasi kelas dilakukan secara mandiri oleh atlet melalui formulir pendaftaran atlet setelah akun disetujui.
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
                >
                  <Save size={14} />
                  {submitting ? "Menyimpan..." : isEditing ? "Simpan Perubahan" : "Daftarkan Atlet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}