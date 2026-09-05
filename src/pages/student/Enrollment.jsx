import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../../utils/supabaseClient";
import { toast, Toaster } from "react-hot-toast";
import {
  BookOpen,
  UploadCloud,
  CheckCircle2,
  XCircle,
  Clock,
  ImageIcon,
  CreditCard,
  FileText,
  Trash2,
  Copy,
  Building2,
  CheckSquare,
  Square,
  Layers,
} from "lucide-react";

export default function Enrollment() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [studentId, setStudentId] = useState(null);
  const [classes, setClasses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [selectedClassIds, setSelectedClassIds] = useState([]);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  const BANK_INFO = {
    bank: "BCA",
    accountNumber: "7112175957",
    accountHolder: "Rijal Triana",
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const savedUser = localStorage.getItem("user_session");
      if (!savedUser) throw new Error("Sesi berakhir. Silakan masuk kembali.");
      const user = JSON.parse(savedUser);

      // 1. Ambil student_id
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (studentError || !student) throw new Error("Data atlet tidak ditemukan.");
      setStudentId(student.id);

      // 2. Ambil riwayat pembayaran atlet
      const { data: paymentData, error: payError } = await supabase
        .from("payments")
        .select(`
          id, class_id, amount, status, reject_reason, created_at, receipt_url,
          classes ( name, category )
        `)
        .eq("student_id", student.id)
        .order("created_at", { ascending: false });

      if (payError) throw payError;
      setPayments(paymentData || []);

      // 3. Ambil pendaftaran kelas yang sedang AKTIF (status = 'active')
      const { data: activeEnrollments } = await supabase
        .from("student_enrollments")
        .select("class_id")
        .eq("student_id", student.id)
        .eq("status", "active");

      const activeClassIds = activeEnrollments?.map((e) => e.class_id) || [];

      // Ambil kelas yang pembayarannya masih PENDING agar tidak dibayar ganda
      const pendingPayIds = paymentData
        ?.filter((p) => p.status === "pending")
        .map((p) => p.class_id) || [];

      // P2 & P3: Kelas yang sedang aktif atau menunggu konfirmasi dikecualikan.
      // Kelas yang statusnya 'completed' tetap bisa didaftarkan ulang.
      const excludedClassIds = [...new Set([...activeClassIds, ...pendingPayIds])];

      // 4. Ambil data kelas dan hitung sisa kapasitas kuota aktif
      const [classRes, allEnrollRes] = await Promise.all([
        supabase.from("classes").select("id, name, category, price, max_capacity, max_sessions"),
        supabase.from("student_enrollments").select("class_id").eq("status", "active"),
      ]);

      if (classRes.error) throw classRes.error;
      if (allEnrollRes.error) throw allEnrollRes.error;

      const enrollCountMap = {};
      (allEnrollRes.data || []).forEach((item) => {
        enrollCountMap[item.class_id] = (enrollCountMap[item.class_id] || 0) + 1;
      });

      const availableClasses = (classRes.data || [])
        .filter((c) => !excludedClassIds.includes(c.id))
        .map((c) => {
          const maxCapacity = Number(c.max_capacity) || 20;
          const enrolledCount = Number(enrollCountMap[c.id]) || 0;
          const remainingSeats = Math.max(0, maxCapacity - enrolledCount);
          return {
            ...c,
            max_capacity: maxCapacity,
            enrolled_count: enrolledCount,
            remaining_seats: remainingSeats,
            is_full: remainingSeats <= 0,
          };
        });

      setClasses(availableClasses);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(BANK_INFO.accountNumber);
    toast.success("Nomor rekening BCA berhasil disalin!");
  };

  const handleToggleClass = (classItem) => {
    if (classItem.is_full) return;
    setSelectedClassIds((prev) => {
      if (prev.includes(classItem.id)) {
        return prev.filter((id) => id !== classItem.id);
      } else {
        return [...prev, classItem.id];
      }
    });
  };

  const selectedClasses = classes.filter((c) => selectedClassIds.includes(c.id));
  const totalAmount = selectedClasses.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (selectedFile.size > 4 * 1024 * 1024) {
      toast.error("Ukuran file tidak boleh melebihi 4MB.");
      fileInputRef.current.value = "";
      return;
    }

    const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!validTypes.includes(selectedFile.type)) {
      toast.error("Hanya file JPG, PNG, dan WebP yang diizinkan.");
      fileInputRef.current.value = "";
      return;
    }

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  };

  const clearFile = () => {
    setFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedClassIds.length === 0) {
      return toast.error("Silakan pilih minimal 1 kelas yang ingin diikuti.");
    }
    if (!file) {
      return toast.error("Silakan unggah bukti transfer pembayaran.");
    }

    setSubmitting(true);
    const loadingToast = toast.loading(`Mengunggah pembayaran untuk ${selectedClassIds.length} kelas...`);

    let uploadedReceiptPath = null;
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      uploadedReceiptPath = `receipts/${fileName}`;

      // Unggah bukti transfer ke Supabase Storage bucket 'images'
      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(uploadedReceiptPath, file);

      if (uploadError) throw new Error("Gagal mengunggah bukti: " + uploadError.message);

      const { data: urlData } = supabase.storage.from("images").getPublicUrl(uploadedReceiptPath);
      const receiptUrl = urlData.publicUrl;

      // Batch insert transaksi pembayaran untuk semua kelas terpilih
      const paymentBatch = selectedClasses.map((c) => ({
        student_id: studentId,
        class_id: c.id,
        amount: c.price,
        receipt_url: receiptUrl,
        status: "pending",
      }));

      const { error: insertError } = await supabase.from("payments").insert(paymentBatch);
      if (insertError) throw insertError;

      toast.success(
        `Pengajuan untuk ${selectedClassIds.length} kelas berhasil! Menunggu verifikasi admin.`,
        { id: loadingToast }
      );

      setSelectedClassIds([]);
      clearFile();
      loadData();
    } catch (error) {
      // Rollback file bukti jika insert database gagal (P4)
      if (uploadedReceiptPath) {
        await supabase.storage.from("images").remove([uploadedReceiptPath]);
      }
      toast.error(error.message, { id: loadingToast });
    } finally {
      setSubmitting(false);
    }
  };

  const formatRupiah = (number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(Number(number) || 0);
  };

  const getStatusBadge = (status) => {
    if (status === "approved") {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider border border-emerald-700 shadow-sm">
          <CheckCircle2 size={14} /> Disetujui
        </span>
      );
    }
    if (status === "rejected") {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider border border-rose-700 shadow-sm">
          <XCircle size={14} /> Ditolak
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-400 text-amber-950 rounded-lg text-[10px] font-black uppercase tracking-wider border border-amber-500 shadow-sm">
        <Clock size={14} /> Menunggu
      </span>
    );
  };

  if (loading && payments.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center font-sans">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
        <p className="text-slate-500 text-sm font-medium animate-pulse">Memuat data pendaftaran...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans">
      <Toaster position="top-right" />

      <div className="max-w-7xl mx-auto mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <CreditCard className="text-blue-600" size={28} />
          Pendaftaran Kelas
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Pilih satu atau beberapa kelas latihan renang dan kirim konfirmasi transfer sekaligus.
        </p>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Info Bank & Form Pendaftaran */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-[#0a192f] rounded-3xl p-5 text-white shadow-xl shadow-blue-900/10 relative overflow-hidden border border-blue-600/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                  <Building2 size={16} className="text-cyan-300" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-100">
                  Rekening Pembayaran
                </span>
              </div>
              <span className="text-xs font-black tracking-widest bg-white/20 px-2.5 py-0.5 rounded-md border border-white/20">
                {BANK_INFO.bank}
              </span>
            </div>

            <div className="space-y-1 my-3">
              <p className="text-[11px] text-blue-200">Nomor Rekening</p>
              <div className="flex items-center justify-between bg-white/10 px-3.5 py-2.5 rounded-2xl border border-white/10 backdrop-blur-md">
                <span className="font-mono text-lg font-black tracking-widest text-white">
                  {BANK_INFO.accountNumber}
                </span>
                <button
                  type="button"
                  onClick={handleCopyAccount}
                  className="flex items-center gap-1 bg-cyan-400 hover:bg-cyan-300 text-slate-900 font-bold px-3 py-1.5 rounded-xl text-xs transition-all active:scale-95 shadow-sm"
                  title="Salin Nomor Rekening"
                >
                  <Copy size={13} />
                  Salin
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs mt-3 pt-2 border-t border-white/10 text-blue-100">
              <span className="text-[11px] text-blue-200">Atas Nama:</span>
              <span className="font-bold text-white text-sm">{BANK_INFO.accountHolder}</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <BookOpen size={16} className="text-blue-600" /> Pilih Kelas Latihan
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                {selectedClassIds.length} Dipilih
              </span>
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                  Daftar Kelas Tersedia
                </label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {classes.map((c) => {
                    const isSelected = selectedClassIds.includes(c.id);
                    const sisa = c.remaining_seats ?? 0;

                    return (
                      <div
                        key={c.id}
                        onClick={() => handleToggleClass(c)}
                        className={`p-3 rounded-2xl border-2 transition-all cursor-pointer select-none ${
                          c.is_full
                            ? "opacity-50 border-slate-200 bg-slate-50 cursor-not-allowed"
                            : isSelected
                            ? "border-blue-600 bg-blue-50/70 ring-1 ring-blue-600"
                            : "border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200"
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5 shrink-0">
                            {isSelected ? (
                              <CheckSquare size={16} className="text-blue-600" />
                            ) : (
                              <Square size={16} className="text-slate-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="font-bold text-slate-800 text-xs truncate">{c.name}</h4>
                              <span className="text-[10px] font-black text-blue-700 shrink-0">
                                {formatRupiah(c.price)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                              <span className="uppercase font-semibold">{c.category || "Umum"}</span>
                              <span>
                                {c.is_full ? "Penuh" : `Sisa ${sisa} Kuota`}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {classes.length === 0 && (
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-center">
                      <p className="text-xs text-amber-700 font-medium">
                        Semua kelas yang tersedia saat ini sedang aktif Anda ikuti atau menunggu verifikasi.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {selectedClasses.length > 0 && (
                <div className="p-4 bg-slate-900 rounded-2xl text-white space-y-2.5 text-xs shadow-md">
                  <div className="flex items-center justify-between text-[11px] text-slate-300 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Layers size={13} className="text-cyan-400" /> Kelas yang Dipilih:
                    </span>
                    <span className="font-bold text-white">{selectedClasses.length} Kelas</span>
                  </div>
                  <div className="space-y-1 py-1 border-t border-slate-800">
                    {selectedClasses.map((item) => (
                      <div key={item.id} className="flex justify-between text-[11px] text-slate-300">
                        <span className="truncate pr-2">• {item.name}</span>
                        <span className="font-mono">{formatRupiah(item.price)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                    <span className="font-bold text-cyan-300">Total Pembayaran:</span>
                    <span className="font-black text-white text-base tracking-wide font-mono">
                      {formatRupiah(totalAmount)}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  Unggah Bukti Transfer
                </label>
                {!previewUrl ? (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 bg-slate-50 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors">
                    <UploadCloud size={24} className="text-slate-400 mb-2" />
                    <p className="text-xs text-slate-600 font-medium">Klik untuk memilih file bukti</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, atau WebP (Maksimal 4MB)</p>
                    <input
                      type="file"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/jpeg, image/png, image/jpg, image/webp"
                    />
                  </label>
                ) : (
                  <div className="relative w-full h-40 rounded-xl overflow-hidden border border-slate-200">
                    <img src={previewUrl} alt="Pratinjau Bukti" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={clearFile}
                      className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-full shadow-md hover:bg-rose-700 transition-colors"
                      title="Hapus gambar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting || selectedClassIds.length === 0 || !file}
                className="w-full py-3 bg-slate-900 hover:bg-black text-white font-bold rounded-xl shadow-md transition-all text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  "Mengirim Pembayaran..."
                ) : (
                  <>
                    <CreditCard size={16} />
                    Kirim Pembayaran ({selectedClassIds.length} Kelas)
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Kolom Kanan: Riwayat Pembayaran */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText size={16} className="text-blue-600" /> Riwayat Pembayaran
              </span>
              <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
                {payments.length} Data
              </span>
            </h2>

            <div className="space-y-3">
              {payments.map((p) => {
                const dateObj = new Date(p.created_at);
                const dateStr = dateObj.toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                });

                return (
                  <div key={p.id} className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm">{p.classes?.name}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{dateStr}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-slate-800 text-sm">{formatRupiah(p.amount)}</div>
                        <div className="mt-1">{getStatusBadge(p.status)}</div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-200/60 text-xs">
                      <a
                        href={p.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 font-bold flex items-center gap-1 hover:underline"
                      >
                        <ImageIcon size={14} /> Lihat Bukti Transfer
                      </a>

                      {p.status === "rejected" && p.reject_reason && (
                        <span className="text-rose-600 font-medium text-[11px]">
                          Alasan: {p.reject_reason}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {payments.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <p className="text-sm font-bold text-slate-600">Belum ada riwayat pembayaran</p>
                  <p className="text-xs mt-1">Pilih satu atau beberapa kelas untuk memulai pendaftaran.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}