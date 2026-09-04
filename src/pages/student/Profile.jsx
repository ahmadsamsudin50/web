import React, { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "../../utils/supabaseClient";
import { QRCodeSVG } from "qrcode.react";
import { toast, Toaster } from "react-hot-toast";
import { 
  Download, User, MapPin, Phone, 
  ShieldCheck, Contact, Edit3, X, Save,
  Mail, Lock, Eye, EyeOff, Calendar, Layers, CheckCircle2, AlertCircle, Bell, Info
} from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const qrRef = useRef(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '', email: '', password: '', parent_name: '', age: '', phone_number: '', address: ''
  });

  const fetchProfile = useCallback(async () => {
    try {
      const savedUser = localStorage.getItem("user_session");
      if (!savedUser) throw new Error("Sesi berakhir. Silakan masuk kembali.");

      const user = JSON.parse(savedUser);

      const { data, error } = await supabase
        .from("students")
        .select(`
          id, nis, qr_token, parent_name, age, address, phone_number, 
          users ( full_name, email ), 
          student_enrollments ( id, status, class_id, classes ( name, max_sessions ) )
        `)
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      setStudentData(data);
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
    setShowPassword(false);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const loadingToast = toast.loading("Menyimpan perubahan...");

    try {
      const user = JSON.parse(localStorage.getItem("user_session"));

      const userUpdateData = { 
        full_name: editForm.full_name,
        email: editForm.email
      };
      if (editForm.password) {
        userUpdateData.password = editForm.password;
      }

      const { error: userError } = await supabase
        .from("users")
        .update(userUpdateData)
        .eq("id", user.id);
      
      if (userError) throw userError;

      const { error: studentError } = await supabase
        .from("students")
        .update({
          parent_name: editForm.parent_name,
          age: editForm.age ? parseInt(editForm.age, 10) : null,
          phone_number: editForm.phone_number,
          address: editForm.address
        })
        .eq("user_id", user.id);

      if (studentError) throw studentError;

      toast.success("Profil berhasil diperbarui!", { id: loadingToast });
      setIsEditModalOpen(false);
      
      fetchProfile();
      
      user.full_name = editForm.full_name;
      user.email = editForm.email;
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

      <div className="text-center mb-8 flex flex-col items-center">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Kartu Digital</h1>
        <p className="text-slate-500 text-sm mt-1">Tunjukkan kode QR ini untuk pemindaian kehadiran latihan.</p>
      </div>

      <div className="w-full max-w-sm relative group">
        <div className="absolute -inset-1 bg-gradient-to-b from-blue-600 to-cyan-400 rounded-[2.5rem] blur-lg opacity-20 group-hover:opacity-40 transition duration-500"></div>
        
        <div className="relative bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
          <div className="bg-[#0a192f] p-6 relative overflow-hidden">
            <ShieldCheck size={120} className="absolute -right-6 -top-6 text-white/5 rotate-12" />
            
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg mb-3 border border-white/10">
                <span className="font-black text-lg">SB</span>
              </div>
              <h2 className="text-white font-bold tracking-[0.2em] text-[10px] uppercase mb-4">
                Siripbiru Swim Club
              </h2>
              
              <h3 className="text-xl font-bold text-white mb-1 leading-tight">
                {studentData.users?.full_name || "Atlet"}
              </h3>
              <div className="text-cyan-300 text-[10px] font-medium tracking-widest uppercase mb-3">
                {studentData.users?.email}
              </div>
              
              {/* Daftar Status Tiap Kelas: Aktif vs Selesai */}
              <div className="flex flex-wrap justify-center gap-1.5 max-w-xs">
                {allEnrollments.length > 0 ? (
                  allEnrollments.map((enr, idx) => {
                    const isActive = enr.status === "active";
                    return (
                      <div
                        key={idx}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                          isActive
                            ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300"
                            : "bg-slate-700/60 border-slate-600 text-slate-400 line-through"
                        }`}
                      >
                        {isActive ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                        <span>{enr.classes?.name}</span>
                        <span className="text-[9px] lowercase font-normal">
                          {isActive ? "(aktif)" : "(selesai)"}
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

          <div className="p-8 flex flex-col items-center bg-white relative z-10">
            <div 
              ref={qrRef} 
              className="p-3 bg-white rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.08)] border border-slate-50 transform group-hover:scale-105 transition-transform duration-500"
            >
              {studentData.qr_token ? (
                <QRCodeSVG
                  value={studentData.qr_token}
                  size={180}
                  level={"H"}
                  includeMargin={false}
                  fgColor="#0a192f"
                />
              ) : (
                <div className="w-[180px] h-[180px] flex items-center justify-center text-slate-400 bg-slate-50 rounded-2xl text-xs font-medium">
                  QR Tidak Tersedia
                </div>
              )}
            </div>
            <p className="mt-5 font-mono text-slate-400 text-xs tracking-widest font-bold">
              ID: {studentData.nis}
            </p>
          </div>

          {/* Rincian Profil Terpisah */}
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
                
                <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">NIS (Hanya Baca)</label>
                    <input disabled value={studentData.nis} className="w-full bg-transparent text-sm font-bold text-slate-600 outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Daftar Status Kelas</label>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {allEnrollments.length > 0 ? (
                        allEnrollments.map((ac, idx) => (
                          <span
                            key={idx}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              ac.status === "active"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-slate-200 text-slate-500 line-through"
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
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Kata Sandi</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type={showPassword ? "text" : "password"} value={editForm.password} onChange={e => setEditForm({...editForm, password: e.target.value})} placeholder="••••••••" className="w-full pl-9 pr-10 py-3 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm font-mono" />
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