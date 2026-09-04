import React, { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "../../utils/supabaseClient";
import { QRCodeSVG } from "qrcode.react";
import { toast, Toaster } from "react-hot-toast";
import {
  Download, Phone, Medal,
  ShieldCheck, Edit3, X, Save,
  Mail, Lock, Eye, EyeOff, Plus, MinusCircle,
  UploadCloud, User, Award, Calendar, Globe, Bell, Info, AlertCircle
} from "lucide-react";

const inputCls = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium";
const labelCls = "block text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-1 ml-1";

// Komponen Feed Pengumuman Khusus Instruktur
function AnnouncementFeed() {
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const { data } = await supabase
        .from("announcements")
        .select("*")
        .eq("is_active", true)
        .in("target_audience", ["all", "coach"])
        .order("created_at", { ascending: false });

      if (data) setAnnouncements(data);
    };
    fetchAnnouncements();
  }, []);

  if (announcements.length === 0) return null;

  return (
    <div className="w-full max-w-sm mb-6 space-y-3 font-sans">
      <div className="flex items-center gap-2 px-1 text-slate-600 text-xs font-bold uppercase tracking-wider">
        <Bell size={14} className="text-blue-600" />
        <span>Papan Pengumuman Klub</span>
      </div>

      {announcements.map((item) => {
        const isUrgent = item.urgency === "urgent";
        const isImportant = item.urgency === "important";

        return (
          <div
            key={item.id}
            className={`p-4 rounded-2xl border transition-all ${
              isUrgent
                ? "bg-rose-50 border-rose-200 text-rose-950 shadow-sm"
                : isImportant
                ? "bg-amber-50 border-amber-200 text-amber-950 shadow-sm"
                : "bg-blue-50/60 border-blue-100 text-slate-800"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                {isUrgent || isImportant ? (
                  <AlertCircle size={18} className={isUrgent ? "text-rose-600" : "text-amber-600"} />
                ) : (
                  <Info size={18} className="text-blue-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="font-bold text-sm tracking-tight">{item.title}</h4>
                  <span className="text-[10px] text-slate-400 font-medium shrink-0">
                    {new Date(item.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
                <p className="text-xs leading-relaxed opacity-90 whitespace-pre-wrap">
                  {item.content}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CoachProfile() {
  const [coachData, setCoachData] = useState(null);
  const [loading, setLoading] = useState(true);
  const qrRef = useRef(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [photoUploadMethod, setPhotoUploadMethod] = useState("file");
  const [photoFile, setPhotoFile] = useState(null);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState("");
  const [currentPasswordInDb, setCurrentPasswordInDb] = useState("");

  const [editForm, setEditForm] = useState({
    full_name: '', email: '', password: '', specialty: '', phone_number: '',
    nickname: '', role_title: '', experience_desc: '', age: '', nationality: 'Indonesia',
    photo_url: '', achievements: ['']
  });

  const fetchProfile = useCallback(async () => {
    try {
      const savedUser = localStorage.getItem("user_session");
      if (!savedUser) throw new Error("Sesi telah berakhir. Silakan masuk kembali.");
      const user = JSON.parse(savedUser);
      const { data, error } = await supabase
        .from("coaches")
        .select(`
          id, qr_token, specialty, phone_number,
          nickname, role_title, experience_desc, age, nationality, photo_url, achievements,
          users ( id, full_name, email, password )
        `)
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      setCoachData(data);
    } catch (err) {
      toast.error("Gagal memuat data profil. Silakan hubungi admin.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleDownloadQR = () => {
    const loadingToast = toast.loading("Menyiapkan Kartu Digital Instruktur...");
    const svgElement = qrRef.current?.querySelector("svg");
    if (!svgElement) {
      toast.error("Kode QR belum siap.", { id: loadingToast });
      return;
    }
    try {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.onload = () => {
        const padding = 32;
        canvas.width = img.width + padding * 2;
        canvas.height = img.height + padding * 2;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, padding, padding);
        const pngUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.download = `Siripbiru_Instruktur_${coachData?.users?.full_name?.replace(/\s+/g, '_') || "Pass"}.png`;
        link.href = pngUrl;
        link.click();
        toast.success("Kartu digital berhasil diunduh!", { id: loadingToast });
      };
      img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    } catch (error) {
      toast.error("Gagal mengunduh gambar.", { id: loadingToast });
    }
  };

  const openEditModal = () => {
    const existingPassword = coachData.users?.password || '';
    setEditForm({
      full_name: coachData.users?.full_name || '',
      email: coachData.users?.email || '',
      password: existingPassword,
      specialty: coachData.specialty || '',
      phone_number: coachData.phone_number || '',
      nickname: coachData.nickname || '',
      role_title: coachData.role_title || '',
      experience_desc: coachData.experience_desc || '',
      age: coachData.age ?? '',
      nationality: coachData.nationality || 'Indonesia',
      photo_url: coachData.photo_url || '',
      achievements: coachData.achievements?.length > 0 ? coachData.achievements : ['']
    });
    setCurrentPasswordInDb(existingPassword);
    setShowPassword(false);
    setPhotoUploadMethod(coachData.photo_url ? "url" : "file");
    setPhotoFile(null);
    setPreviewPhotoUrl(coachData.photo_url || "");
    setIsEditModalOpen(true);
  };

  const handleAchievementChange = (index, value) => {
    const newAch = [...editForm.achievements];
    newAch[index] = value;
    setEditForm({ ...editForm, achievements: newAch });
  };

  const addAchievement = () => setEditForm({ ...editForm, achievements: [...editForm.achievements, ""] });
  const removeAchievement = (index) => setEditForm({ ...editForm, achievements: editForm.achievements.filter((_, i) => i !== index) });

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

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const loadingToast = toast.loading("Menyimpan perubahan profil...");
    const cleanAchievements = editForm.achievements.filter(a => a.trim() !== "");
    let finalPhotoUrl = editForm.photo_url;

    if (photoUploadMethod === "file" && photoFile) {
      try {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `coaches/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('images').upload(filePath, photoFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('images').getPublicUrl(filePath);
        finalPhotoUrl = urlData.publicUrl;
      } catch (err) {
        toast.error("Gagal mengunggah foto profil: " + err.message, { id: loadingToast });
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const user = JSON.parse(localStorage.getItem("user_session"));
      const trimmedPassword = editForm.password.trim();
      if (trimmedPassword.length < 6) {
        throw new Error("Kata sandi minimal 6 karakter.");
      }

      const userUpdateData = { full_name: editForm.full_name.trim(), email: editForm.email.trim() };
      if (trimmedPassword !== currentPasswordInDb) {
        userUpdateData.password = trimmedPassword;
      }

      const { error: userError } = await supabase.from("users").update(userUpdateData).eq("id", user.id);
      if (userError) throw userError;

      const { error: coachError } = await supabase.from("coaches").update({
        specialty: editForm.specialty.trim(),
        phone_number: editForm.phone_number.trim(),
        nickname: editForm.nickname.trim(),
        role_title: editForm.role_title.trim(),
        experience_desc: editForm.experience_desc.trim(),
        age: editForm.age ? parseInt(editForm.age, 10) : null,
        nationality: editForm.nationality.trim(),
        photo_url: finalPhotoUrl,
        achievements: cleanAchievements
      }).eq("user_id", user.id);

      if (coachError) throw coachError;

      toast.success("Profil berhasil diperbarui!", { id: loadingToast });
      setIsEditModalOpen(false);
      fetchProfile();

      user.full_name = editForm.full_name.trim();
      user.email = editForm.email.trim();
      localStorage.setItem("user_session", JSON.stringify(user));
    } catch (error) {
      toast.error(`Pembaruan gagal: ${error.message}`, { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center font-sans">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
        <p className="text-slate-500 text-sm font-medium animate-pulse">Memuat kartu instruktur...</p>
      </div>
    );
  }

  return (
    <div className="py-6 flex flex-col items-center pb-24 lg:pb-6 font-sans relative px-4">
      <Toaster position="top-center" />

      {/* Papan Pengumuman Klub */}
      <AnnouncementFeed />

      <div className="text-center mb-6 flex flex-col items-center">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Kartu Instruktur</h1>
        <p className="text-slate-500 text-sm mt-1">Tunjukkan kartu digital ini untuk pemindaian absensi latihan.</p>
      </div>

      <div className="w-full max-w-sm relative">
        <div className="relative bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200 flex flex-col">
          <div className="bg-[#0a192f] p-6 text-center text-white relative">
            <ShieldCheck size={100} className="absolute -right-4 -top-4 text-white/5 rotate-12" />
            <div className="relative z-10 flex flex-col items-center">
              {coachData.photo_url ? (
                <img src={coachData.photo_url} alt="Profil" className="w-16 h-16 rounded-2xl object-cover mb-3 border border-white/10 shadow-md" />
              ) : (
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-xl mb-3">SB</div>
              )}
              <h2 className="text-[10px] tracking-widest uppercase text-blue-200 font-bold mb-1">Siripbiru Swim Club</h2>
              <h3 className="text-lg font-bold text-white">{coachData.users?.full_name || "Instruktur"}</h3>
              <div className="text-cyan-300 text-[11px] mt-0.5">{coachData.users?.email}</div>
              <span className="mt-2 px-3 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px] font-bold uppercase tracking-wider border border-emerald-500/30">
                {coachData.role_title || "PELATIH"}
              </span>
            </div>
          </div>

          <div className="p-6 flex flex-col items-center bg-white">
            <div ref={qrRef} className="p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
              {coachData.qr_token ? (
                <QRCodeSVG value={coachData.qr_token} size={160} level="H" fgColor="#0a192f" />
              ) : (
                <div className="w-40 h-40 flex items-center justify-center text-slate-400 text-xs">QR Tidak Tersedia</div>
              )}
            </div>
            <p className="mt-4 text-[10px] tracking-widest text-slate-400 uppercase font-bold">Pindai Untuk Hadir</p>
          </div>

          <div className="bg-slate-50 p-5 border-t border-slate-100 space-y-2.5 text-xs">
            <div className="flex items-center gap-2.5">
              <Medal size={14} className="text-amber-500 shrink-0" />
              <div className="truncate"><span className="text-slate-400">Spesialisasi: </span><span className="font-semibold text-slate-700">{coachData.specialty || "-"}</span></div>
            </div>
            <div className="flex items-center gap-2.5">
              <Phone size={14} className="text-blue-500 shrink-0" />
              <div className="truncate"><span className="text-slate-400">Kontak: </span><span className="font-semibold text-slate-700">{coachData.phone_number || "-"}</span></div>
            </div>
            <div className="flex items-center gap-2.5">
              <Calendar size={14} className="text-indigo-500 shrink-0" />
              <div className="truncate"><span className="text-slate-400">Usia: </span><span className="font-semibold text-slate-700">{coachData.age ? `${coachData.age} Tahun` : "-"}</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 w-full max-w-sm px-4 flex flex-col gap-2.5">
        <button onClick={handleDownloadQR} className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all text-xs sm:text-sm active:scale-95">
          <Download size={18} /> Unduh Kartu Digital
        </button>
        <button onClick={openEditModal} className="w-full flex items-center justify-center gap-2 py-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl shadow-sm transition-all text-xs sm:text-sm active:scale-95">
          <Edit3 size={16} /> Pengaturan Profil
        </button>
      </div>

      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Edit3 size={18} className="text-blue-600" /> Pengaturan Akun & Profil Instruktur
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1 rounded-full text-slate-400 hover:bg-slate-200 transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="overflow-y-auto p-6 space-y-5 text-xs">
              {/* Bagian Akun */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Akses Akun</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Nama Lengkap </label>
                    <input required value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} className={inputCls} placeholder="Nama lengkap Anda" />
                  </div>
                  <div>
                    <label className={labelCls}>Alamat Email</label>
                    <input required type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className={inputCls} placeholder="email@pelatih.com" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Kata Sandi</label>
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} required value={editForm.password} onChange={e => setEditForm({...editForm, password: e.target.value})} className={`${inputCls} pr-10 font-mono`} placeholder="Minimal 6 karakter" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors" title={showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}>
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bagian Profil Publik */}
              <div className="space-y-3 border-t border-slate-100 pt-3">
                <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Profil & Portofolio Melatih</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Nama Panggilan</label>
                    <input required value={editForm.nickname} onChange={e => setEditForm({...editForm, nickname: e.target.value})} className={inputCls} placeholder="Contoh: Coach Budi" />
                  </div>
                  <div>
                    <label className={labelCls}>Posisi / Gelar</label>
                    <input required value={editForm.role_title} onChange={e => setEditForm({...editForm, role_title: e.target.value})} className={inputCls} placeholder="Contoh: Pelatih Prestasi" />
                  </div>
                  <div>
                    <label className={labelCls}>Spesialisasi Renang</label>
                    <input required value={editForm.specialty} onChange={e => setEditForm({...editForm, specialty: e.target.value})} className={inputCls} placeholder="Contoh: Gaya Dada & Gaya Kupu-kupu" />
                  </div>
                  <div>
                    <label className={labelCls}>Nomor WhatsApp</label>
                    <input required value={editForm.phone_number} onChange={e => setEditForm({...editForm, phone_number: e.target.value})} className={inputCls} placeholder="08..." />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelCls}>Usia (Tahun)</label>
                      <input type="number" value={editForm.age} onChange={e => setEditForm({...editForm, age: e.target.value})} className={inputCls} placeholder="Contoh: 28" />
                    </div>
                    <div>
                      <label className={labelCls}>Kewarganegaraan</label>
                      <input value={editForm.nationality} onChange={e => setEditForm({...editForm, nationality: e.target.value})} className={inputCls} placeholder="Indonesia" />
                    </div>
                  </div>
                </div>

                {/* Upload Foto Profil */}
                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-3">
                  <label className="block text-[10px] font-bold tracking-widest uppercase text-blue-900">
                    Foto Profil Instruktur
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 text-xs">
                      <input
                        type="radio"
                        name="coach_photo_opt"
                        checked={photoUploadMethod === "file"}
                        onChange={() => setPhotoUploadMethod("file")}
                        className="w-4 h-4 text-blue-600"
                      />
                      Unggah Berkas
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 text-xs">
                      <input
                        type="radio"
                        name="coach_photo_opt"
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
                        value={editForm.photo_url}
                        onChange={(e) => {
                          setEditForm({ ...editForm, photo_url: e.target.value });
                          setPreviewPhotoUrl(e.target.value);
                        }}
                        className={inputCls}
                        placeholder="https://domain.com/foto-anda.jpg"
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
                        <p className="font-bold text-slate-700">Pratinjau Foto</p>
                        <p className="text-[10px] text-slate-400 truncate max-w-xs">{photoFile ? photoFile.name : previewPhotoUrl}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pengalaman Melatih */}
                <div>
                  <label className={labelCls}>Deskripsi Pengalaman / Lisensi</label>
                  <textarea
                    rows={2}
                    value={editForm.experience_desc}
                    onChange={(e) => setEditForm({ ...editForm, experience_desc: e.target.value })}
                    className={`${inputCls} resize-none`}
                    placeholder="Ringkasan sertifikasi renang, lisensi kepelatihan, dan rekam jejak mengajar..."
                  />
                </div>

                {/* Prestasi */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={labelCls}>Daftar Prestasi & Sertifikasi</label>
                    <button
                      type="button"
                      onClick={addAchievement}
                      className="text-blue-600 font-bold hover:underline flex items-center gap-1 text-[11px]"
                    >
                      <Plus size={12} /> Tambah Prestasi
                    </button>
                  </div>
                  <div className="space-y-2">
                    {editForm.achievements.map((ach, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 font-bold flex items-center justify-center text-[10px] shrink-0">
                          {idx + 1}
                        </span>
                        <input
                          value={ach}
                          onChange={(e) => handleAchievementChange(idx, e.target.value)}
                          className={inputCls}
                          placeholder={`Prestasi atau sertifikasi ${idx + 1}...`}
                        />
                        {editForm.achievements.length > 1 && (
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
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 font-bold text-slate-500 hover:bg-slate-100 rounded-xl text-xs transition-colors">
                  Batal
                </button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all disabled:opacity-50">
                  <Save size={15} /> {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}