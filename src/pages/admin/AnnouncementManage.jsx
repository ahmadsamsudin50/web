import React, { useEffect, useState } from "react";
import { supabase } from "../../utils/supabaseClient";
import { toast, Toaster } from "react-hot-toast";
import {
  Bell,
  Plus,
  Trash2,
  Edit3,
  X,
  Save,
  AlertTriangle,
  Users,
  Search,
  CheckCircle2,
} from "lucide-react";

export default function AnnouncementManage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  const initialForm = {
    title: "",
    content: "",
    target_audience: "all",
    urgency: "normal",
    is_active: true,
  };
  const [form, setForm] = useState(initialForm);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setAnnouncements(data || []);
    } catch (err) {
      toast.error("Gagal memuat pengumuman: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const openAddModal = () => {
    setForm(initialForm);
    setIsEditing(false);
    setCurrentId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setForm({
      title: item.title,
      content: item.content,
      target_audience: item.target_audience,
      urgency: item.urgency,
      is_active: item.is_active,
    });
    setIsEditing(true);
    setCurrentId(item.id);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const loadingToast = toast.loading(
      isEditing ? "Memperbarui pengumuman..." : "Menerbitkan pengumuman..."
    );

    try {
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        target_audience: form.target_audience,
        urgency: form.urgency,
        is_active: form.is_active,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("announcements")
          .update(payload)
          .eq("id", currentId);
        if (error) throw error;
        toast.success("Pengumuman berhasil diperbarui!", { id: loadingToast });
      } else {
        const { error } = await supabase.from("announcements").insert([payload]);
        if (error) throw error;
        toast.success("Pengumuman berhasil diterbitkan!", { id: loadingToast });
      }

      setIsModalOpen(false);
      fetchAnnouncements();
    } catch (err) {
      toast.error(err.message, { id: loadingToast });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus pengumuman ini?")) return;
    const loadingToast = toast.loading("Menghapus...");
    try {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
      toast.success("Pengumuman berhasil dihapus!", { id: loadingToast });
      fetchAnnouncements();
    } catch (err) {
      toast.error(err.message, { id: loadingToast });
    }
  };

  const toggleStatus = async (item) => {
    const { error } = await supabase
      .from("announcements")
      .update({ is_active: !item.is_active })
      .eq("id", item.id);
    if (!error) {
      setAnnouncements(
        announcements.map((a) =>
          a.id === item.id ? { ...a, is_active: !item.is_active } : a
        )
      );
      toast.success("Status tayang diperbarui.");
    }
  };

  const getUrgencyBadge = (urgency) => {
    if (urgency === "urgent") {
      return "bg-rose-100 text-rose-700 border-rose-200";
    }
    if (urgency === "important") {
      return "bg-amber-100 text-amber-800 border-amber-200";
    }
    return "bg-blue-100 text-blue-700 border-blue-200";
  };

  const filteredAnnouncements = announcements.filter(
    (a) =>
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Bell className="text-blue-600" size={28} />
            Kelola Pengumuman Klub
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Siarkan informasi perubahan jadwal, pengurasan kolam, atau agenda kejuaraan.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-md text-xs sm:text-sm transition-all active:scale-95"
        >
          <Plus size={16} /> Buat Pengumuman Baru
        </button>
      </div>

      <div className="max-w-7xl mx-auto mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari judul atau isi pengumuman..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAnnouncements.map((item) => (
          <div
            key={item.id}
            className={`rounded-2xl p-5 border bg-white shadow-sm flex flex-col justify-between transition-all ${
              !item.is_active ? "opacity-60 bg-slate-50" : ""
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getUrgencyBadge(
                    item.urgency
                  )}`}
                >
                  {item.urgency === "urgent"
                    ? "Mendesak"
                    : item.urgency === "important"
                    ? "Penting"
                    : "Informasi"}
                </span>
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                  <Users size={12} />
                  {item.target_audience === "all"
                    ? "Semua"
                    : item.target_audience === "student"
                    ? "Atlet Saja"
                    : "Pelatih Saja"}
                </span>
              </div>

              <h3 className="font-bold text-slate-800 text-base mb-2">{item.title}</h3>
              <p className="text-slate-600 text-xs leading-relaxed whitespace-pre-wrap mb-4">
                {item.content}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => toggleStatus(item)}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                  item.is_active
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-500 border-slate-200"
                }`}
              >
                {item.is_active ? "Aktif Tayang" : "Nonaktif"}
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => openEditModal(item)}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Ubah Pengumuman"
                >
                  <Edit3 size={15} />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Hapus Pengumuman"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredAnnouncements.length === 0 && !loading && (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
            <Bell size={36} className="mx-auto mb-2 text-slate-300" />
            <p className="font-bold text-slate-700 text-sm">Belum ada pengumuman</p>
            <p className="text-xs mt-1">Buat pengumuman pertama Anda untuk disiarkan ke pengguna.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Bell size={18} className="text-blue-600" />
                {isEditing ? "Ubah Pengumuman" : "Buat Pengumuman Baru"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">
                  Judul Pengumuman
                </label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
                  placeholder="Contoh: Pengurasan Kolam Renang Latihan"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">
                    Target Penerima
                  </label>
                  <select
                    value={form.target_audience}
                    onChange={(e) => setForm({ ...form, target_audience: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-medium text-slate-700 cursor-pointer"
                  >
                    <option value="all">Semua (Atlet & Pelatih)</option>
                    <option value="student">Khusus Atlet</option>
                    <option value="coach">Khusus Pelatih</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">
                    Tingkat Kepentingan
                  </label>
                  <select
                    value={form.urgency}
                    onChange={(e) => setForm({ ...form, urgency: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-medium text-slate-700 cursor-pointer"
                  >
                    <option value="normal">Biasa / Informasi</option>
                    <option value="important">Penting</option>
                    <option value="urgent">Mendesak / Darurat</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">
                  Isi Pesan Pengumuman
                </label>
                <textarea
                  required
                  rows={4}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 resize-none"
                  placeholder="Jelaskan detail pengumuman secara rinci..."
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 text-xs pt-1">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                Langsung publikasikan ke beranda pengguna
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-xl text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md active:scale-95 disabled:opacity-50"
                >
                  <Save size={14} />
                  {submitting ? "Menyimpan..." : isEditing ? "Simpan Perubahan" : "Terbitkan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}