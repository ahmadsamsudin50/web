import React, { useEffect, useState } from "react";
import { supabase } from "../../utils/supabaseClient";
import { toast, Toaster } from "react-hot-toast";
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  X,
  Search,
  Bookmark,
  AlertTriangle,
  CreditCard,
  Users,
  Loader2,
  Tag,
} from "lucide-react";

const CATEGORY_OPTIONS = [
  { value: "anak-anak", label: "Anak-anak" },
  { value: "dewasa", label: "Dewasa" },
  { value: "profesional", label: "Profesional" },
  { value: "intensif", label: "Intensif" },
];

function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Hapus",
  isDestructive = true,
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8 flex flex-col items-center text-center">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mb-5 ${
              isDestructive ? "bg-rose-50 text-rose-500" : "bg-amber-50"
            }`}
          >
            <AlertTriangle
              size={30}
              className={isDestructive ? "text-rose-500" : "text-amber-500"}
            />
          </div>
          <h3 className="text-lg font-black text-slate-800 mb-2">{title}</h3>
          <p className="text-sm text-slate-500 leading-relaxed">{message}</p>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 font-bold text-white rounded-2xl shadow-lg transition-all active:scale-95 ${
              isDestructive
                ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/30"
                : "bg-amber-500 hover:bg-amber-600 shadow-amber-500/30"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClassManage() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [originalName, setOriginalName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [form, setForm] = useState({
    name: "",
    category: "anak-anak",
    max_sessions: 12,
    price: 0,
    max_capacity: 20,
  });
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    id: null,
    name: "",
  });

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const [classRes, enrollRes] = await Promise.all([
        supabase
          .from("classes")
          .select("id, name, category, price, max_sessions, max_capacity, created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("student_enrollments")
          .select("class_id")
          .eq("status", "active"), // SINKRONISASI KUOTA (P2): Hanya hitung atlet berstatus active
      ]);

      if (classRes.error) throw classRes.error;
      if (enrollRes.error) throw enrollRes.error;

      const countMap = {};
      (enrollRes.data || []).forEach((item) => {
        countMap[item.class_id] = (countMap[item.class_id] || 0) + 1;
      });

      const classesWithCount = (classRes.data || []).map((c) => ({
        ...c,
        category: c.category || "anak-anak",
        enrolled_count: countMap[c.id] || 0,
      }));
      setClasses(classesWithCount);
    } catch (err) {
      toast.error(`Gagal memuat kelas: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const openAddModal = () => {
    setForm({
      name: "",
      category: "anak-anak",
      max_sessions: 12,
      price: 0,
      max_capacity: 20,
    });
    setIsEditing(false);
    setCurrentId(null);
    setOriginalName("");
    setIsModalOpen(true);
  };

  const openEditModal = (c) => {
    setForm({
      name: c.name || "",
      category: c.category || "anak-anak",
      max_sessions: c.max_sessions ?? 12,
      price: c.price !== null && c.price !== undefined ? Number(c.price) : 0,
      max_capacity: c.max_capacity ?? 20,
    });
    setIsEditing(true);
    setCurrentId(c.id);
    setOriginalName(c.name || "");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanName = form.name.trim();

    if (!cleanName) {
      toast.error("Nama kelas tidak boleh kosong.");
      return;
    }

    // P3: Validasi nama kelas duplikat
    const isDuplicate = classes.some(
      (c) => c.name.toLowerCase() === cleanName.toLowerCase() && c.id !== currentId
    );
    if (isDuplicate) {
      toast.error(`Nama kelas "${cleanName}" sudah digunakan.`);
      return;
    }

    const loadingToast = toast.loading(
      isEditing ? "Memperbarui data kelas..." : "Menyimpan kelas baru..."
    );

    const rawPrice = String(form.price).replace(/[^0-9]/g, "");
    const parsedPrice = rawPrice === "" ? 0 : parseFloat(rawPrice);
    const payload = {
      name: cleanName,
      category: form.category,
      max_sessions: parseInt(form.max_sessions, 10) || 12,
      price: isNaN(parsedPrice) ? 0 : parsedPrice,
      max_capacity: parseInt(form.max_capacity, 10) || 20,
    };

    try {
      const formatRupiahText = new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
      }).format(parsedPrice);

      if (isEditing) {
        const { data, error } = await supabase
          .from("classes")
          .update(payload)
          .eq("id", currentId)
          .select();

        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error("Tidak ada baris yang diperbarui. Periksa izin RLS pada tabel classes.");
        }

        // P3: Sinkronkan ke landing_courses (cari berdasarkan originalName atau nama baru)
        const { data: matchedLanding } = await supabase
          .from("landing_courses")
          .select("id")
          .or(`title.ilike.${originalName.trim()},title.ilike.${cleanName}`)
          .limit(1);

        if (matchedLanding && matchedLanding.length > 0) {
          await supabase
            .from("landing_courses")
            .update({
              title: cleanName,
              price: `${formatRupiahText} / Paket`,
            })
            .eq("id", matchedLanding[0].id);
        }

        toast.success("Kelas berhasil diperbarui!", { id: loadingToast });
      } else {
        const { data, error } = await supabase
          .from("classes")
          .insert([payload])
          .select();

        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error("Gagal menambahkan data. Periksa izin RLS pada tabel classes.");
        }

        // P3: Otomatis tambahkan entri display dasar di landing_courses jika belum ada
        const { data: existingLanding } = await supabase
          .from("landing_courses")
          .select("id")
          .ilike("title", cleanName)
          .maybeSingle();

        if (!existingLanding) {
          await supabase.from("landing_courses").insert([
            {
              title: cleanName,
              price: `${formatRupiahText} / Paket`,
              description: `Program latihan renang kategori ${form.category}.`,
              icon_name: "Droplets",
              features: [`Maksimal ${payload.max_sessions} Sesi Pertemuan`, "Instruktur Bersertifikat"],
            },
          ]);
        }

        toast.success("Kelas baru berhasil dibuat!", { id: loadingToast });
      }

      setIsModalOpen(false);
      await fetchClasses();
    } catch (error) {
      toast.error(`Gagal: ${error.message}`, { id: loadingToast });
    }
  };

  const confirmDelete = (c) => {
    setConfirmModal({ open: true, id: c.id, name: c.name });
  };

  const handleDelete = async () => {
    const classId = confirmModal.id;
    const className = confirmModal.name;
    const loadingToast = toast.loading("Memeriksa dependensi dan menghapus...");
    setConfirmModal({ open: false, id: null, name: "" });

    try {
      // 1. Cek pendaftaran aktif
      const { count: enrollCount, error: enrollErr } = await supabase
        .from("student_enrollments")
        .select("*", { count: "exact", head: true })
        .eq("class_id", classId)
        .eq("status", "active");

      if (enrollErr) throw enrollErr;
      if (enrollCount > 0) {
        throw new Error(`Tidak dapat menghapus. Masih ada ${enrollCount} pendaftaran aktif di kelas ini.`);
      }

      // 2. Cek transaksi pembayaran terkait
      const { count: payCount, error: payErr } = await supabase
        .from("payments")
        .select("*", { count: "exact", head: true })
        .eq("class_id", classId);

      if (payErr) throw payErr;
      if (payCount > 0) {
        throw new Error(`Tidak dapat menghapus. Terdapat ${payCount} catatan transaksi pembayaran untuk kelas ini.`);
      }

      // 3. Bersihkan referensi class_id pada array sesi jadwal (P3)
      const { data: sessionsWithClass } = await supabase
        .from("sessions")
        .select("id, class_ids");

      if (sessionsWithClass) {
        for (const s of sessionsWithClass) {
          if (Array.isArray(s.class_ids) && s.class_ids.includes(classId)) {
            const updatedClassIds = s.class_ids.filter((id) => id !== classId);
            await supabase
              .from("sessions")
              .update({ class_ids: updatedClassIds })
              .eq("id", s.id);
          }
        }
      }

      // 4. Hapus baris kelas
      const { error: deleteErr } = await supabase
        .from("classes")
        .delete()
        .eq("id", classId);

      if (deleteErr) throw deleteErr;

      // 5. Bersihkan data display di landing_courses agar tidak meninggalkan data yatim (P3)
      if (className) {
        await supabase
          .from("landing_courses")
          .delete()
          .ilike("title", className.trim());
      }

      toast.success("Kelas berhasil dihapus.", { id: loadingToast });
      fetchClasses();
    } catch (err) {
      toast.error(err.message, { id: loadingToast });
    }
  };

  const formatRupiah = (number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(Number(number) || 0);
  };

  const getCategoryBadge = (cat) => {
    switch (cat) {
      case "anak-anak":
        return "bg-cyan-50 text-cyan-700 border-cyan-200";
      case "dewasa":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "profesional":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "intensif":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const filteredClasses = classes.filter((c) => {
    const matchQuery = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = filterCategory === "all" || c.category === filterCategory;
    return matchQuery && matchCat;
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans relative">
      <Toaster position="top-right" toastOptions={{ style: { borderRadius: "16px", fontWeight: "500" } }} />

      <ConfirmModal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, id: null, name: "" })}
        onConfirm={handleDelete}
        title="Hapus Kelas Ini?"
        message={
          <>
            Apakah Anda yakin ingin menghapus kelas{" "}
            <span className="font-bold text-slate-700">"{confirmModal.name}"</span>? Seluruh penugasan jadwal dan data halaman utama terkait akan ikut disinkronkan.
          </>
        }
        confirmLabel="Ya, Hapus"
      />

      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Tingkat Kelas</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Kelola kelompok latihan, kategori tingkatan, kuota kapasitas, dan biaya kursus.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-2xl shadow-lg shadow-blue-600/30 transition-all active:scale-95"
        >
          <Plus size={18} /> Kelas Baru
        </button>
      </div>

      <div className="max-w-7xl mx-auto mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={18} className="text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Cari nama kelas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm font-medium"
          />
        </div>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm"
        >
          <option value="all">Semua Kategori</option>
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="max-w-7xl mx-auto bg-white rounded-3xl shadow-xl shadow-blue-900/5 border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-white">
          <h2 className="font-bold text-slate-800">Inventaris Kelas</h2>
          <span className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-bold">
            {filteredClasses.length} Kelas
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[11px] uppercase tracking-widest font-black">
                <th className="px-8 py-4">Detail Kelas</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Harga</th>
                <th className="px-6 py-4">Kapasitas Terisi</th>
                <th className="px-8 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-16 text-center text-slate-400">
                    <Loader2 size={32} className="animate-spin mx-auto text-blue-600 mb-2" />
                    <p className="text-sm font-medium">Memuat data kelas...</p>
                  </td>
                </tr>
              ) : (
                filteredClasses.map((c) => {
                  const maxCap = c.max_capacity ?? 20;
                  const enrolled = c.enrolled_count ?? 0;
                  const isFull = enrolled >= maxCap;
                  const percent = Math.min(Math.round((enrolled / maxCap) * 100), 100);
                  return (
                    <tr key={c.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                            <Layers size={20} />
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 text-base">{c.name}</div>
                            <div className="text-xs text-slate-400 mt-0.5 font-medium flex items-center gap-1.5">
                              <Bookmark size={12} className="text-blue-500" /> Maks {c.max_sessions ?? 12} Sesi Pertemuan
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getCategoryBadge(c.category)}`}>
                          <Tag size={10} />
                          {CATEGORY_OPTIONS.find((opt) => opt.value === c.category)?.label || c.category}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="font-bold text-emerald-600 text-sm flex items-center gap-1.5">
                          <CreditCard size={14} className="text-emerald-500" />
                          {formatRupiah(c.price)}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="w-48">
                          <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                            <span className="flex items-center gap-1.5 text-slate-700">
                              <Users size={14} className="text-indigo-500" />
                              <span className="font-bold">{enrolled}</span> / {maxCap} Siswa Aktif
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isFull
                                  ? "bg-rose-50 text-rose-600 border border-rose-200"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {isFull ? "Penuh" : `${percent}%`}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isFull ? "bg-rose-500" : percent > 80 ? "bg-amber-500" : "bg-blue-600"
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditModal(c)}
                            className="p-2.5 text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm"
                            title="Ubah Kelas"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => confirmDelete(c)}
                            className="p-2.5 text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-xl transition-all shadow-sm"
                            title="Hapus Kelas"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
              {filteredClasses.length === 0 && !loading && (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center text-slate-400">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search size={32} className="text-slate-300" />
                    </div>
                    <p className="font-bold text-slate-600">Tidak ada kelas ditemukan</p>
                    <p className="text-sm mt-1">Coba ganti filter kategori atau kata kunci pencarian.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3 text-blue-600">
                {isEditing ? <Edit2 size={24} /> : <Plus size={24} />}
                <h3 className="text-xl font-bold tracking-tight text-slate-800">
                  {isEditing ? "Ubah Kelas" : "Kelas Baru"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 bg-white rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-500 shadow-sm border border-slate-100 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8">
              <div className="space-y-4 mb-8">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
                    Nama Kelas
                  </label>
                  <input
                    required
                    autoFocus
                    placeholder="misal: Kelas Pemula Anak (Beginner)"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all shadow-inner font-medium text-slate-700"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
                    Kategori Kelas
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all shadow-inner font-bold text-slate-700 cursor-pointer"
                  >
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
                      Maks Target Sesi
                    </label>
                    <input
                      required
                      type="number"
                      min="1"
                      placeholder="12"
                      value={form.max_sessions}
                      onChange={(e) =>
                        setForm({ ...form, max_sessions: parseInt(e.target.value, 10) || 0 })
                      }
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all shadow-inner font-medium text-slate-700"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
                      Kapasitas Kuota
                    </label>
                    <input
                      required
                      type="number"
                      min="1"
                      placeholder="20"
                      value={form.max_capacity}
                      onChange={(e) =>
                        setForm({ ...form, max_capacity: parseInt(e.target.value, 10) || 0 })
                      }
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all shadow-inner font-medium text-slate-700"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
                    Biaya Pendaftaran / Harga (IDR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                      Rp
                    </span>
                    <input
                      required
                      type="number"
                      min="0"
                      step="1000"
                      placeholder="350000"
                      value={form.price}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          price: e.target.value === "" ? 0 : parseFloat(e.target.value),
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-5 py-3.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all shadow-inner font-bold text-emerald-700"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all active:scale-95 flex items-center gap-2"
                >
                  {isEditing ? "Simpan Perubahan" : "Buat Kelas"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}