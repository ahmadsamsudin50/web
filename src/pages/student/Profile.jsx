import React, { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "../../utils/supabaseClient";
import { QRCodeSVG } from "qrcode.react";
import { toast, Toaster } from "react-hot-toast";
import {
  Download, User, MapPin, Phone,
  ShieldCheck, Contact, Edit3, X, Save,
  Mail, Lock, Eye, EyeOff, Calendar, Layers, CheckCircle2, AlertCircle, Bell, Info, Clock,
  Sun, Maximize2, Sparkles, Camera, Image as ImageIcon, Trash2
} from "lucide-react";

// Helper: Kompresi gambar client-side menggunakan HTML5 Canvas
const compressImage = (file, maxWidth = 600, maxHeight = 600, quality = 0.75) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // Kompresi ke format WebP untuk efisiensi penyimpanan maksimal
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], `${Date.now()}_avatar.webp`, { type: "image/webp" }));
            } else {
              resolve(file);
            }
          },
          "image/webp",
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

// Komponen Feed Pengumuman Khusus Atlet
function AnnouncementFeed() {
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const { data } = await supabase
        .from("announcements")
        .select("*")
        .eq("is_active", true)
        .in("target_audience", ["all", "student"])
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

export default function Profile() {
  const [studentData, setStudentData] = useState(null);
  const [attendanceCounts, setAttendanceCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const qrRef = useRef(null);
  const fullscreenQrRef = useRef(null);

  // State Fitur Optimasi Pindai Kolam
  const [highBrightnessMode, setHighBrightnessMode] = useState(false);
  const [isFullscreenQrOpen, setIsFullscreenQrOpen] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // State Unggah Foto Profil (Opsional)
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isPhotoRemoved, setIsPhotoRemoved] = useState(false);
  const fileInputRef = useRef(null);

  const [editForm, setEditForm] = useState({
    full_name: '', email: '', password: '', parent_name: '', age: '', phone_number: '', address: ''
  });

  const fetchProfile = useCallback(async () => {
    try {
      const savedUser = localStorage.getItem("user_session");
      if (!savedUser) throw new Error("Sesi berakhir. Silakan masuk kembali.");
      const user = JSON.parse(savedUser);

      // Ambil data profil student beserta avatar_url dan riwayat enrollment
      let profileResult = await supabase
        .from("students")
        .select(`
          id, nis, qr_token, parent_name, age, address, phone_number, avatar_url,
          users ( full_name, email ), 
          student_enrollments ( id, status, class_id, classes ( name, max_sessions ) )
        `)
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileResult.error) {
        profileResult = await supabase
          .from("students")
          .select(`
            id, nis, qr_token, parent_name, age, address, phone_number,
            users ( full_name, email ), 
            student_enrollments ( id, status, class_id, classes ( name, max_sessions ) )
          `)
          .eq("user_id", user.id)
          .single();
      }

      if (profileResult.error) throw profileResult.error;
      setStudentData(profileResult.data);

      // Ambil akumulasi log presensi per enrollment spesifik
      if (profileResult.data?.id) {
        const { data: logs, error: logsError } = await supabase
          .from("attendance_logs")
          .select("enrollment_id, status")
          .eq("student_id", profileResult.data.id)
          .in("status", ["hadir_qr", "hadir_manual"]);

        if (!logsError && logs) {
          const counts = {};
          logs.forEach((log) => {
            if (log.enrollment_id) {
              counts[log.enrollment_id] = (counts[log.enrollment_id] || 0) + 1;
            }
          });
          setAttendanceCounts(counts);
        }
      }
    } catch (err) {
      toast.error("Gagal memuat data profil. Silakan hubungi admin.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const allEnrollments = studentData?.student_enrollments || [];

  const handleDownloadQR = () => {
    const loadingToast = toast.loading("Menyiapkan Kartu Digital Anda...");
    const svgElement = qrRef.current?.querySelector("svg") || fullscreenQrRef.current?.querySelector("svg");
    
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
        link.download = `Siripbiru_Pass_${studentData?.nis || "Atlet"}.png`;
        link.href = pngUrl;
        link.click();
        
        toast.success("Kartu Digital berhasil diunduh!", { id: loadingToast });
      };
      
      img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    } catch (error) {
      toast.error("Gagal mengunduh gambar.", { id: loadingToast });
    }
  };

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Format file harus berupa gambar.");
      return;
    }

    try {
      const compressed = await compressImage(file, 600, 600, 0.75);
      setPhotoFile(compressed);
      setPhotoPreview(URL.createObjectURL(compressed));
      setIsPhotoRemoved(false);
      toast.success("Foto berhasil dipilih!");
    } catch (err) {
      toast.error("Gagal memproses foto.");
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setIsPhotoRemoved(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast.success("Foto profil dikosongkan");
  };

  const openEditModal = () => {
    setEditForm({
      full_name: studentData.users?.full_name || '',
      email: studentData.users?.email || '',
      password: '',
      parent_name: studentData.parent_name || '',
      age: studentData.age || '',
      phone_number: studentData.phone_number || '',
      address: studentData.address || ''
    });
    setPhotoFile(null);
    setPhotoPreview(studentData.avatar_url || null);
    setIsPhotoRemoved(false);
    setShowPassword(false);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const loadingToast = toast.loading("Menyimpan perubahan...");

    try {
      const user = JSON.parse(localStorage.getItem("user_session") || "{}");
      const cleanEmail = editForm.email.trim().toLowerCase();

      // Validasi email
      if (cleanEmail !== user.email?.toLowerCase()) {
        const { data: existingUser } = await supabase
          .from("users")
          .select("id")
          .eq("email", cleanEmail)
          .neq("id", user.id)
          .maybeSingle();

        if (existingUser) {
          throw new Error("Alamat email baru sudah digunakan oleh akun lain.");
        }
      }

      const trimmedPassword = editForm.password.trim();
      const userUpdateData = { 
        full_name: editForm.full_name.trim(),
        email: cleanEmail
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
        .eq("id", user.id);
          
      if (userError) throw userError;

      // Handle upload foto profil opsional atau hapus foto
      let uploadedAvatarUrl = isPhotoRemoved ? null : studentData.avatar_url;

      if (photoFile && !isPhotoRemoved) {
        const fileName = `students/${studentData.id || user.id}_${Date.now()}.webp`;
        
        const { error: uploadError } = await supabase.storage
          .from("images")
          .upload(fileName, photoFile, {
            cacheControl: "3600",
            upsert: true,
            contentType: "image/webp"
          });

        if (uploadError) {
          console.warn("Upload gambar error:", uploadError);
        } else {
          const { data: publicUrlData } = supabase.storage
            .from("images")
            .getPublicUrl(fileName);

          uploadedAvatarUrl = publicUrlData?.publicUrl || uploadedAvatarUrl;
        }
      }

      const studentUpdatePayload = {
        parent_name: editForm.parent_name.trim(),
        age: editForm.age ? parseInt(editForm.age, 10) : null,
        phone_number: editForm.phone_number.trim(),
        address: editForm.address.trim(),
        avatar_url: uploadedAvatarUrl
      };

      const { error: studentError } = await supabase
        .from("students")
        .update(studentUpdatePayload)
        .eq("user_id", user.id);

      if (studentError) {
        delete studentUpdatePayload.avatar_url;
        await supabase
          .from("students")
          .update(studentUpdatePayload)
          .eq("user_id", user.id);
      }

      toast.success("Profil berhasil diperbarui!", { id: loadingToast });
      setIsEditModalOpen(false);
      fetchProfile();
      
      user.full_name = editForm.full_name.trim();
      user.email = cleanEmail;
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
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium animate-pulse">Memuat Kartu Digital...</p>
      </div>
    );
  }

  if (!studentData) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6 font-sans">
        <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-4">
          <Contact size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Profil Tidak Ditemukan</h2>
        <p className="text-slate-500 text-sm max-w-xs">Akun Anda belum terhubung dengan profil atlet. Silakan hubungi administrator.</p>
      </div>
    );
  }

  return (
    <div className="py-6 flex flex-col items-center pb-24 lg:pb-6 font-sans relative px-4">
      <Toaster position="top-center" toastOptions={{ style: { borderRadius: '16px', fontWeight: '500' } }} />
      
      {/* Papan Pengumuman Klub */}
      <AnnouncementFeed />

      <div className="text-center mb-6 flex flex-col items-center">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Kartu Digital</h1>
        <p className="text-slate-500 text-sm mt-1">Tunjukkan kode QR ini untuk pemindaian kehadiran latihan.</p>
      </div>

      {/* Kontrol Cepat Pemindaian di Kolam Renang */}
      <div className="w-full max-w-sm mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setHighBrightnessMode(!highBrightnessMode);
            if (!highBrightnessMode) {
              toast.success("Mode Kontras Terang diaktifkan!");
            }
          }}
          className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 border ${
            highBrightnessMode
              ? "bg-amber-400 text-amber-950 border-amber-500 shadow-sm"
              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-xs"
          }`}
        >
          <Sun size={15} className={highBrightnessMode ? "text-amber-950" : "text-amber-500"} />
          <span>{highBrightnessMode ? "Kontras Normal" : "Mode Pindai Terang"}</span>
        </button>

        <button
          type="button"
          onClick={() => setIsFullscreenQrOpen(true)}
          className="py-2.5 px-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-blue-600 rounded-2xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-95"
          title="Tampilkan QR Layar Penuh"
        >
          <Maximize2 size={15} />
          <span>Layar Penuh</span>
        </button>
      </div>

      <div className="w-full max-w-sm relative group">
        {!highBrightnessMode && (
          <div className="absolute -inset-1 bg-gradient-to-b from-blue-600 to-cyan-400 rounded-[2.5rem] blur-lg opacity-20 group-hover:opacity-40 transition duration-500"></div>
        )}
        
        <div className={`relative rounded-[2rem] overflow-hidden flex flex-col transition-all duration-300 ${
          highBrightnessMode
            ? "bg-white border-4 border-slate-900 shadow-2xl"
            : "bg-white rounded-[2rem] shadow-2xl border border-slate-100"
        }`}>
          <div className={`${highBrightnessMode ? "bg-slate-950 p-5" : "bg-[#0a192f] p-6"} relative overflow-hidden`}>
            <ShieldCheck size={120} className="absolute -right-6 -top-6 text-white/5 rotate-12" />
            
            <div className="relative z-10 flex flex-col items-center text-center">
              {/* Foto Profil Atlet atau Fallback SB Logo */}
              {studentData.avatar_url ? (
                <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/20 shadow-lg mb-3 bg-slate-800">
                  <img
                    src={studentData.avatar_url}
                    alt={studentData.users?.full_name || "Atlet"}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg mb-3 border border-white/10">
                  <span className="font-black text-lg">SB</span>
                </div>
              )}

              <h2 className="text-white font-bold tracking-[0.2em] text-[10px] uppercase mb-3">
                Siripbiru Swim Club
              </h2>
              
              <h3 className="text-xl font-bold text-white mb-0.5 leading-tight">
                {studentData.users?.full_name || "Atlet"}
              </h3>
              <div className="text-cyan-300 text-[10px] font-medium tracking-widest uppercase mb-3.5">
                {studentData.users?.email}
              </div>
              
              {/* Status Kelas & Progres Pertemuan */}
              <div className="flex flex-wrap justify-center gap-1.5 max-w-xs">
                {allEnrollments.length > 0 ? (
                  [...allEnrollments]
                    .sort((a, b) => (a.status === "active" ? -1 : 1))
                    .map((enr, idx) => {
                      const isActive = enr.status === "active";
                      const currentAttend = attendanceCounts[enr.id] || 0;
                      const maxSessions = enr.classes?.max_sessions || 12;
                      return (
                        <div
                          key={enr.id || idx}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border shadow-sm ${
                            isActive
                              ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300"
                              : "bg-slate-700/60 border-slate-600 text-slate-400"
                          }`}
                        >
                          {isActive ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                          <span>{enr.classes?.name}</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 bg-white/10 rounded-md">
                            {isActive ? `${currentAttend}/${maxSessions}` : "Selesai"}
                          </span>
                        </div>
                      );
                    })
                ) : (
                  <div className="inline-block px-3 py-1 bg-rose-500/20 border border-rose-500/30 rounded-full text-rose-200 text-[10px] font-bold tracking-wider uppercase">
                    Belum Ada Kelas Terdaftar
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={`p-8 flex flex-col items-center relative z-10 ${highBrightnessMode ? "bg-white" : "bg-white"}`}>
            <div 
              ref={qrRef} 
              className={`p-3 bg-white rounded-3xl transition-transform duration-500 ${
                highBrightnessMode 
                  ? "border-4 border-black p-4 shadow-none" 
                  : "shadow-[0_0_40px_rgba(0,0,0,0.08)] border border-slate-50 group-hover:scale-105"
              }`}
            >
              {studentData.qr_token ? (
                <QRCodeSVG
                  value={studentData.qr_token}
                  size={highBrightnessMode ? 190 : 180}
                  level={"H"}
                  includeMargin={false}
                  fgColor="#000000"
                />
              ) : (
                <div className="w-[180px] h-[180px] flex items-center justify-center text-slate-400 bg-slate-50 rounded-2xl text-xs font-medium">
                  QR Tidak Tersedia
                </div>
              )}
            </div>
            <p className={`mt-5 font-mono text-xs tracking-widest font-bold ${
              highBrightnessMode ? "text-slate-900 text-sm" : "text-slate-400"
            }`}>
              ID: {studentData.nis}
            </p>
          </div>

          {/* Rincian Data Pribadi Atlet */}
          <div className="bg-slate-50 p-6 border-t border-slate-100 flex flex-col gap-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                <User size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Nama Orang Tua / Wali</p>
                <p className="text-slate-700 font-medium truncate">
                  {studentData.parent_name || "-"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                <Calendar size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Usia Atlet</p>
                <p className="text-slate-700 font-medium truncate">
                  {studentData.age ? `${studentData.age} Tahun` : "-"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                <Phone size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Nomor Kontak Darurat</p>
                <p className="text-slate-700 font-medium truncate">{studentData.phone_number || "-"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                <MapPin size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Alamat Rumah</p>
                <p className="text-slate-700 font-medium truncate">{studentData.address || "-"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 w-full max-w-sm px-4 flex flex-col gap-3">
        <button
          onClick={handleDownloadQR}
          className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/30 transition-all active:scale-95 text-xs sm:text-sm"
        >
          <Download size={18} />
          Simpan Kartu Digital
        </button>
        <button
          onClick={openEditModal}
          className="w-full flex items-center justify-center gap-2 py-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-2xl shadow-sm transition-all active:scale-95 text-xs sm:text-sm"
        >
          <Edit3 size={16} />
          Pengaturan Akun
        </button>
      </div>

      {/* Modal Layar Penuh QR Code */}
      {isFullscreenQrOpen && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full flex flex-col items-center text-center shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsFullscreenQrOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
              title="Tutup"
            >
              <X size={20} />
            </button>

            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full mb-3">
              Siripbiru Pass
            </span>

            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {studentData.users?.full_name || "Atlet"}
            </h3>
            <p className="text-xs text-slate-400 mb-6 font-mono font-semibold">
              NIS: {studentData.nis}
            </p>

            <div 
              ref={fullscreenQrRef}
              className="p-4 bg-white border-4 border-slate-900 rounded-3xl shadow-lg"
            >
              {studentData.qr_token ? (
                <QRCodeSVG
                  value={studentData.qr_token}
                  size={240}
                  level={"H"}
                  includeMargin={false}
                  fgColor="#000000"
                />
              ) : (
                <div className="w-[240px] h-[240px] flex items-center justify-center text-slate-400">
                  QR Tidak Tersedia
                </div>
              )}
            </div>

            <p className="text-xs text-slate-500 mt-6 font-medium">
              Tunjukkan langsung ke pemindai admin di tepi kolam renang
            </p>
          </div>
        </div>
      )}

      {/* Modal Pengaturan Akun & Edit Profil */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0 z-10">
              <div className="flex items-center gap-3 text-blue-600">
                <Edit3 size={20} />
                <h3 className="text-base font-bold tracking-tight text-slate-800">Pengaturan Akun</h3>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 bg-white rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-500 shadow-sm border border-slate-100 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto p-6 custom-scrollbar">
              <form id="editProfileForm" onSubmit={handleEditSubmit} className="space-y-6">
                
                {/* Bagian Foto Profil Atlet */}
                <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="relative mb-3">
                    <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-200 border-2 border-white shadow-md flex items-center justify-center">
                      {photoPreview ? (
                        <img
                          src={photoPreview}
                          alt="Preview Avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User size={36} className="text-slate-400" />
                      )}
                    </div>
                    
                    {/* Tombol Aksi Foto: Upload & Kosongkan */}
                    <div className="absolute -bottom-2 -right-2 flex items-center gap-1">
                      {photoPreview && (
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md transition-all active:scale-90"
                          title="Kosongkan Foto Profil"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all active:scale-90"
                        title="Pilih Foto"
                      >
                        <Camera size={15} />
                      </button>
                    </div>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoSelect}
                    accept="image/*"
                    className="hidden"
                  />
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-700">Foto Profil Atlet</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">NIS</label>
                    <input disabled value={studentData.nis} className="w-full bg-transparent text-sm font-bold text-slate-600 outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Daftar Status Kelas</label>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {allEnrollments.length > 0 ? (
                        [...allEnrollments]
                          .sort((a, b) => (a.status === "active" ? -1 : 1))
                          .map((ac, idx) => (
                            <span
                              key={ac.id || idx}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                ac.status === "active"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-slate-200 text-slate-500"
                              }`}
                            >
                              {ac.classes?.name} {ac.status === "active" ? "(Aktif)" : "(Selesai)"}
                            </span>
                          ))
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400">Belum ada kelas</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-5 bg-blue-50/50 rounded-2xl border border-blue-100">
                  <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <ShieldCheck size={16} /> Akun Login
                  </h4>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Alamat Email</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input required type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full pl-9 pr-4 py-3 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Kata Sandi</label>
                      <span className="text-[10px] text-slate-400 italic">(Kosongkan jika tidak diganti)</span>
                    </div>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type={showPassword ? "text" : "password"} 
                        value={editForm.password} 
                        onChange={e => setEditForm({...editForm, password: e.target.value})} 
                        placeholder="Masukkan kata sandi baru..." 
                        className="w-full pl-9 pr-10 py-3 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm font-mono" 
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2 ml-1">
                    <User size={16} /> Informasi Pribadi
                  </h4>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Nama Lengkap</label>
                    <input required value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm font-medium" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Orang Tua / Wali</label>
                      <input required value={editForm.parent_name} onChange={e => setEditForm({...editForm, parent_name: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm font-medium" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Usia (Tahun)</label>
                      <input type="number" required value={editForm.age} onChange={e => setEditForm({...editForm, age: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm font-medium" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Nomor Telepon</label>
                    <input required placeholder="+62..." value={editForm.phone_number} onChange={e => setEditForm({...editForm, phone_number: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm font-medium" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Alamat Lengkap</label>
                    <textarea required rows="3" value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm resize-none font-medium"></textarea>
                  </div>
                </div>
              </form>
            </div>

            <div className="p-4 border-t border-slate-100 bg-white sticky bottom-0 z-10 flex gap-3">
              <button 
                type="button" 
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors text-xs sm:text-sm"
              >
                Batal
              </button>
              <button 
                type="submit" 
                form="editProfileForm"
                disabled={isSubmitting}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all active:scale-95 flex items-center justify-center gap-2 text-xs sm:text-sm disabled:opacity-70"
              >
                <Save size={16} />
                {isSubmitting ? 'Menyimpan...' : 'Simpan Pengaturan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}