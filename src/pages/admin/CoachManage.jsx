import React, { useEffect, useState } from "react";
import { supabase } from "../../utils/supabaseClient";
import { v4 as uuidv4 } from "uuid";
import { toast, Toaster } from "react-hot-toast";
import {
  UserPlus, Edit3, Trash2, X, Phone, Medal,
  User, Search, Eye, EyeOff, AlertTriangle,
  MinusCircle, Plus, Save, UploadCloud
} from "lucide-react";

const inputCls = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium";
const labelCls = "block text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-1 ml-1";

function CustomConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmLabel = "Ya, Lanjutkan", isDestructive = false }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center animate-in zoom-in-95 duration-200">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${
          isDestructive ? "bg-rose-50 text-rose-500" : "bg-blue-50 text-blue-600"
        }`}>
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

export default function CoachManage() {
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [oldPhotoUrl, setOldPhotoUrl] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // State Unggah Foto
  const [photoUploadMethod, setPhotoUploadMethod] = useState("file");
  const [photoFile, setPhotoFile] = useState(null);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState("");

  const initialFormState = {
    full_name: "",
    email: "",
    password: "",
    specialty: "",
    phone_number: "",
    nickname: "",
    role_title: "",
    experience_desc: "",
    age: "",
    nationality: "Indonesia",
    photo_url: "",
    show_on_landing: true,
    achievements: [""],
  };
  const [form, setForm] = useState(initialFormState);

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

  // Helper pembersihan berkas foto di Supabase Storage (P4)
  const extractStoragePath = (publicUrl) => {
    if (!publicUrl) return null;
    try {
      const parts = publicUrl.split("/images/");
      if (parts.length > 1) {
        return parts[1];
      }
      return null;
    } catch {
      return null;
    }
  };

  const deleteCoachPhotoIfOrphan = async (photoUrl, excludeCoachId = null) => {
    if (!photoUrl) return;
    const filePath = extractStoragePath(photoUrl);
    if (!filePath || !filePath.startsWith("coaches/")) return;

    try {
      let query = supabase
        .from("coaches")
        .select("id", { count: "exact", head: true })
        .eq("photo_url", photoUrl);

      if (excludeCoachId) {
        query = query.neq("id", excludeCoachId);
      }

      const { count } = await query;
      if (!count || count === 0) {
        await supabase.storage.from("images").remove([filePath]);
      }
    } catch (err) {
      console.error("Gagal menghapus file foto pelatih lama:", err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    const { data: coachData, error } = await supabase
      .from("coaches")
      .select("*, users(id, full_name, email, status)")
      .order("created_at", { ascending: false });
    if (coachData) setCoaches(coachData);
    if (error) toast.error("Gagal memuat daftar pelatih: " + error.message);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredCoaches = coaches.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.users?.full_name?.toLowerCase().includes(q) ||
      c.specialty?.toLowerCase().includes(q) ||
      c.role_title?.toLowerCase().includes(q) ||
      c.nickname?.toLowerCase().includes(q)
    );
  });

  const openAddModal = () => {
    setForm(initialFormState);
    setIsEditing(false);
    setCurrentId(null);
    setCurrentUserId(null);
    setOldPhotoUrl("");
    setShowPassword(false);
    setPhotoUploadMethod("file");
    setPhotoFile(null);
    setPreviewPhotoUrl("");
    setIsModalOpen(true);
  };

  const openEditModal = (c) => {
    const existingPhoto = c.photo_url || "";
    setForm({
      full_name: c.users?.full_name || "",
      email: c.users?.email || "",
      password: "",
      specialty: c.specialty || "",
      phone_number: c.phone_number || "",
      nickname: c.nickname || "",
      role_title: c.role_title || "",
      experience_desc: c.experience_desc || "",
      age: c.age || "",
      nationality: c.nationality || "Indonesia",
      photo_url: existingPhoto,
      show_on_landing: c.show_on_landing ?? true,
      achievements: c.achievements?.length > 0 ? c.achievements : [""],
    });
    setIsEditing(true);
    setCurrentId(c.id);
    setCurrentUserId(c.user_id);
    setOldPhotoUrl(existingPhoto);
    setShowPassword(false);
    setPhotoUploadMethod(existingPhoto ? "url" : "file");
    setPhotoFile(null);
    setPreviewPhotoUrl(existingPhoto);
    setIsModalOpen(true);
  };

  const handleAchievementChange = (index, value) => {
    const newAch = [...form.achievements];
    newAch[index] = value;
    setForm({ ...form, achievements: newAch });
  };

  const addAchievement = () =>
    setForm({ ...form, achievements: [...form.achievements, ""] });

  const removeAchievement = (index) =>
    setForm({
      ...form,
      achievements: form.achievements.filter((_, i) => i !== index),
    });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran file foto maksimal 2MB.");
      return;
    }

    const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Format file harus JPG, PNG, atau WebP.");
      return;
    }

    setPhotoFile(file);
    setPreviewPhotoUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const loadingToast = toast.loading(isEditing ? "Memperbarui data pelatih..." : "Mendaftarkan pelatih baru...");
    const cleanAchievements = form.achievements.filter((a) => a.trim() !== "");

    let finalPhotoUrl = form.photo_url;
    let uploadedFilePath = null;

    if (photoUploadMethod === "file" && photoFile) {
      try {
        const fileExt = photoFile.name.split(".").pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        uploadedFilePath = `coaches/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("images")
          .upload(uploadedFilePath, photoFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("images")
          .getPublicUrl(uploadedFilePath);

        finalPhotoUrl = urlData.publicUrl;
      } catch (uploadErr) {
        toast.error("Gagal mengunggah foto profil: " + uploadErr.message, { id: loadingToast });
        setSubmitting(false);
        return;
      }
    }

    let createdUserId = null;

    try {
      const trimmedPassword = form.password.trim();

      if (isEditing) {
        const userUpdateData = {
          full_name: form.full_name.trim(),
          email: form.email.trim().toLowerCase(),
        };

        if (trimmedPassword) {
          if (trimmedPassword.length < 6) {
            throw new Error("Kata sandi baru minimal harus 6 karakter.");
          }
          userUpdateData.password = trimmedPassword;
        }

        const { error: userError } = await supabase
          .from("users")
          .update(userUpdateData)
          .eq("id", currentUserId);

        if (userError) throw userError;

        const { error: coachError } = await supabase
          .from("coaches")
          .update({
            specialty: form.specialty.trim(),
            phone_number: form.phone_number.trim(),
            nickname: form.nickname.trim(),
            role_title: form.role_title.trim(),
            experience_desc: form.experience_desc.trim(),
            age: form.age ? parseInt(form.age, 10) : null,
            nationality: form.nationality.trim(),
            photo_url: finalPhotoUrl,
            show_on_landing: form.show_on_landing,
            achievements: cleanAchievements,
          })
          .eq("id", currentId);

        if (coachError) throw coachError;

        // P4: Hapus foto lama di storage jika ada berkas foto baru yang diunggah
        if (oldPhotoUrl && finalPhotoUrl !== oldPhotoUrl) {
          await deleteCoachPhotoIfOrphan(oldPhotoUrl, currentId);
        }

        toast.success("Data pelatih berhasil diperbarui!", { id: loadingToast });
      } else {
        if (!trimmedPassword || trimmedPassword.length < 6) {
          throw new Error("Kata sandi pelatih baru wajib minimal 6 karakter.");
        }

        const cleanEmail = form.email.trim().toLowerCase();

        const { data: existingUser } = await supabase
          .from("users")
          .select("id")
          .eq("email", cleanEmail)
          .maybeSingle();

        if (existingUser) {
          throw new Error("Alamat email ini sudah terdaftar di sistem.");
        }

        const { data: newUser, error: userError } = await supabase
          .from("users")
          .insert([
            {
              email: cleanEmail,
              password: trimmedPassword,
              full_name: form.full_name.trim(),
              role: "coach",
              status: "active",
            },
          ])
          .select()
          .single();

        if (userError) throw userError;
        createdUserId = newUser.id;

        const { error: coachError } = await supabase.from("coaches").insert([
          {
            user_id: newUser.id,
            specialty: form.specialty.trim(),
            phone_number: form.phone_number.trim(),
            qr_token: `token_coach_${uuidv4()}`,
            nickname: form.nickname.trim(),
            role_title: form.role_title.trim(),
            experience_desc: form.experience_desc.trim(),
            age: form.age ? parseInt(form.age, 10) : null,
            nationality: form.nationality.trim() || "Indonesia",
            photo_url: finalPhotoUrl,
            show_on_landing: form.show_on_landing,
            achievements: cleanAchievements,
          },
        ]);

        if (coachError) {
          throw coachError;
        }

        toast.success("Pelatih berhasil didaftarkan!", { id: loadingToast });
      }

      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      // P3 & P4: Rollback bersih jika gagal di tengah jalan
      if (createdUserId) {
        await supabase.from("users").delete().eq("id", createdUserId);
      }
      if (uploadedFilePath) {
        await supabase.storage.from("images").remove([uploadedFilePath]);
      }
      toast.error(error.message, { id: loadingToast });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (c) => {
    triggerConfirm({
      title: "Hapus Pelatih?",
      message: `Apakah Anda yakin ingin menghapus "${c.users?.full_name}"? Penugasan jadwal melatih, riwayat kehadiran, dan foto profil terkait akan ikut dibersihkan secara permanen.`,
      confirmLabel: "Hapus Permanen",
      isDestructive: true,
      onConfirm: async () => {
        closeConfirm();
        const loadingToast = toast.loading("Menghapus data pelatih...");
        try {
          // 1. Bersihkan catatan kehadiran pelatih
          await supabase.from("attendance_logs").delete().eq("coach_id", c.id);

          // 2. Bersihkan referensi pelatih dari tabel sesi jadwal (P2 & P3)
          const { data: relatedSessions } = await supabase
            .from("sessions")
            .select("id, coach_ids");

          if (relatedSessions) {
            for (const s of relatedSessions) {
              if (Array.isArray(s.coach_ids) && s.coach_ids.includes(c.id)) {
                const updatedCoaches = s.coach_ids.filter((id) => id !== c.id);
                await supabase
                  .from("sessions")
                  .update({ coach_ids: updatedCoaches })
                  .eq("id", s.id);
              }
            }
          }

          // 3. Simpan referensi foto sebelum data baris dihapus (P4)
          const coachPhoto = c.photo_url;

          // 4. Hapus profil pelatih
          const { error: coachErr } = await supabase.from("coaches").delete().eq("id", c.id);
          if (coachErr) throw coachErr;

          // 5. Hapus akun login pengguna
          const { error: userErr } = await supabase.from("users").delete().eq("id", c.user_id);
          if (userErr) throw userErr;

          // 6. Bersihkan file foto dari storage bucket jika tidak dipakai baris lain (P4)
          if (coachPhoto) {
            await deleteCoachPhotoIfOrphan(coachPhoto, c.id);
          }

          toast.success("Pelatih dan berkas terkait berhasil dihapus!", { id: loadingToast });
          fetchData();
        } catch (err) {
          toast.error(`Gagal menghapus: ${err.message}`, { id: loadingToast });
        }
      },
    });
  };

  const toggleLandingStatus = async (id, currentStatus) => {
    const { error } = await supabase
      .from("coaches")
      .update({ show_on_landing: !currentStatus })
      .eq("id", id);

    if (!error) {
      setCoaches(
        coaches.map((c) =>
          c.id === id ? { ...c, show_on_landing: !currentStatus } : c
        )
      );
      toast.success("Status publikasi halaman utama berhasil diubah.");
    }
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
            Kelola Instruktur
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Daftar pelatih renang, foto profil, spesialisasi teknik, dan publikasi profil umum.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-md text-xs sm:text-sm transition-all active:scale-95"
        >
          <Plus size={16} /> Daftarkan Pelatih Baru
        </button>
      </div>

      <div className="max-w-7xl mx-auto mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama, spesialisasi, nama panggilan, atau posisi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="font-bold text-slate-800 text-xs sm:text-sm">Daftar Pelatih</h2>
          <span className="text-[10px] bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-full font-bold">
            {filteredCoaches.length} Pelatih
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[10px] uppercase tracking-wider font-bold border-b border-slate-100">
                <th className="px-6 py-3.5">Identitas & Foto</th>
                <th className="px-6 py-3.5">Spesialisasi & Kontak</th>
                <th className="px-6 py-3.5 text-center">Publikasi Halaman Depan</th>
                <th className="px-6 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredCoaches.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                        {c.photo_url ? (
                          <img src={c.photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User size={20} className="text-slate-400" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-sm">{c.users?.full_name || "Tanpa Nama"}</div>
                        <div className="text-blue-600 font-semibold">{c.role_title || "Pelatih"}</div>
                        <div className="text-[11px] text-slate-400">{c.nickname ? `Panggilan: ${c.nickname}` : ""}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 font-bold text-slate-700">
                      <Medal size={13} className="text-amber-500 shrink-0" />
                      <span>{c.specialty || "Instruktur Umum"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500 mt-1">
                      <Phone size={13} className="text-slate-400 shrink-0" />
                      <span>{c.phone_number || "Tidak ada kontak"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => toggleLandingStatus(c.id, c.show_on_landing)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border transition-all ${
                        c.show_on_landing
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                      }`}
                    >
                      {c.show_on_landing ? "Ditampilkan" : "Disembunyikan"}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => openEditModal(c)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ubah Data Pelatih"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Hapus Pelatih"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCoaches.length === 0 && !loading && (
                <tr>
                  <td colSpan="4" className="py-12 text-center text-slate-400">
                    Tidak ada pelatih yang ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <UserPlus size={18} className="text-blue-600" />
                {isEditing ? "Perbarui Data Pelatih" : "Daftarkan Pelatih Baru"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="space-y-3">
                <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Akses Akun</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Nama Lengkap</label>
                    <input
                      required
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      className={inputCls}
                      placeholder="Nama lengkap pelatih"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Alamat Email</label>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className={inputCls}
                      placeholder="email@siripbiru.com"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className={labelCls}>Kata Sandi</label>
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
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        className={`${inputCls} pr-10 font-mono`}
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
                <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Profil Publik & Portofolio</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Nama Panggilan</label>
                    <input
                      required
                      value={form.nickname}
                      onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                      className={inputCls}
                      placeholder="Contoh: Coach Budi"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Posisi / Gelar</label>
                    <input
                      required
                      value={form.role_title}
                      onChange={(e) => setForm({ ...form, role_title: e.target.value })}
                      className={inputCls}
                      placeholder="Contoh: Kepala Pelatih"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Spesialisasi Renang</label>
                    <input
                      required
                      value={form.specialty}
                      onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                      className={inputCls}
                      placeholder="Gaya Bebas & Kupu-kupu"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Nomor WhatsApp</label>
                    <input
                      required
                      value={form.phone_number}
                      onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                      className={inputCls}
                      placeholder="08..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelCls}>Usia (Tahun)</label>
                      <input
                        type="number"
                        value={form.age}
                        onChange={(e) => setForm({ ...form, age: e.target.value })}
                        className={inputCls}
                        placeholder="Contoh: 28"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Kewarganegaraan</label>
                      <input
                        value={form.nationality}
                        onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                        className={inputCls}
                        placeholder="Indonesia"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-3">
                  <label className="block text-[10px] font-bold tracking-widest uppercase text-blue-900">
                    Foto Profil Instruktur
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 text-xs">
                      <input
                        type="radio"
                        name="photo_upload_opt"
                        checked={photoUploadMethod === "file"}
                        onChange={() => setPhotoUploadMethod("file")}
                        className="w-4 h-4 text-blue-600"
                      />
                      Unggah File
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 text-xs">
                      <input
                        type="radio"
                        name="photo_upload_opt"
                        checked={photoUploadMethod === "url"}
                        onChange={() => setPhotoUploadMethod("url")}
                        className="w-4 h-4 text-blue-600"
                      />
                      Tautan URL Gambar
                    </label>
                  </div>

                  {photoUploadMethod === "file" ? (
                    <div>
                      <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-blue-200 bg-white rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                        <UploadCloud size={24} className="text-blue-500 mb-1" />
                        <span className="text-slate-600 font-semibold text-xs">Pilih foto dari perangkat</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, atau WebP (Maksimal 2MB)</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="url"
                        value={form.photo_url}
                        onChange={(e) => {
                          setForm({ ...form, photo_url: e.target.value });
                          setPreviewPhotoUrl(e.target.value);
                        }}
                        className={inputCls}
                        placeholder="https://domain.com/foto-pelatih.jpg"
                      />
                    </div>
                  )}

                  {previewPhotoUrl && (
                    <div className="flex items-center gap-3 pt-1">
                      <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm shrink-0">
                        <img
                          src={previewPhotoUrl}
                          alt="Pratinjau Foto"
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display = "none"; }}
                        />
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        <p className="font-bold text-slate-700">Pratinjau Foto Terpilih</p>
                        <p className="text-[10px] text-slate-400 truncate max-w-xs">{photoFile ? photoFile.name : previewPhotoUrl}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className={labelCls}>Deskripsi Pengalaman</label>
                  <textarea
                    rows={2}
                    value={form.experience_desc}
                    onChange={(e) => setForm({ ...form, experience_desc: e.target.value })}
                    className={`${inputCls} resize-none`}
                    placeholder="Ringkasan rekam jejak, sertifikasi lisensi, dan jam terbang mengajar..."
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={labelCls}>Daftar Prestasi & Penghargaan</label>
                    <button
                      type="button"
                      onClick={addAchievement}
                      className="text-blue-600 font-bold hover:underline flex items-center gap-1 text-[11px]"
                    >
                      <Plus size={12} /> Tambah Prestasi
                    </button>
                  </div>
                  <div className="space-y-2">
                    {form.achievements.map((ach, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 font-bold flex items-center justify-center text-[10px] shrink-0">
                          {idx + 1}
                        </span>
                        <input
                          value={ach}
                          onChange={(e) => handleAchievementChange(idx, e.target.value)}
                          className={inputCls}
                          placeholder={`Prestasi ${idx + 1}...`}
                        />
                        {form.achievements.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeAchievement(idx)}
                            className="text-slate-300 hover:text-rose-600 p-1"
                          >
                            <MinusCircle size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.show_on_landing}
                      onChange={(e) => setForm({ ...form, show_on_landing: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="font-bold text-slate-700 text-xs">
                      Tampilkan profil pelatih ini di halaman utama (Landing Page)
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <Save size={14} />
                  {submitting ? "Menyimpan..." : isEditing ? "Simpan Perubahan" : "Daftarkan Pelatih"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}