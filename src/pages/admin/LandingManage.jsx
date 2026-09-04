import React, { useEffect, useState } from "react";
import { supabase } from "../../utils/supabaseClient";
import { toast, Toaster } from "react-hot-toast";
import {
  LayoutTemplate, Save, Plus, Trash2, Edit3, Type, Star, Layers,
  CheckCircle2, X, MinusCircle, Image as ImageIcon,
  Activity, Droplets, Medal, Eye, EyeOff, MapPin,
  AlertTriangle, Loader2
} from "lucide-react";

// Pemetaan Ikon Program Latihan
const ICON_MAP = { Droplets, Activity, Medal, Star };

const ICON_OPTIONS = [
  { value: "Droplets", label: "Tetes Air — Pemula" },
  { value: "Activity", label: "Aktivitas — Menengah" },
  { value: "Medal",    label: "Medali — Prestasi / Lanjutan" },
  { value: "Star",     label: "Bintang — Umum / Spesial" },
];

function CustomConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmLabel = "Hapus", isDestructive = true }) {
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
              isDestructive ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/30" : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/30"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const Field = ({ label, children }) => (
  <div className="space-y-1.5">
    <label className="block text-[10px] font-bold tracking-[0.12em] uppercase text-slate-400">{label}</label>
    {children}
  </div>
);

const inputCls = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium";

const Btn = ({ children, variant = "primary", loading, className = "", ...props }) => {
  const base = "inline-flex items-center justify-center gap-2 font-bold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs";
  const styles = {
    primary: "bg-slate-900 hover:bg-black text-white px-5 py-2.5 shadow-sm active:scale-[0.98]",
    blue:    "bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 shadow-md shadow-blue-600/20 active:scale-[0.98]",
    ghost:   "text-slate-500 hover:text-slate-800 px-4 py-2.5",
    danger:  "p-2 text-slate-300 hover:text-rose-500",
    outline: "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2",
  };
  return (
    <button className={`${base} ${styles[variant]} ${className}`} disabled={loading} {...props}>
      {loading ? <Loader2 size={14} className="animate-spin" /> : null}
      {children}
    </button>
  );
};

const Modal = ({ open, onClose, title, icon: Icon, children, maxWidth = "max-w-lg" }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`bg-white rounded-3xl shadow-2xl w-full ${maxWidth} flex flex-col max-h-[90vh]`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h3 className="text-base font-bold flex items-center gap-2 text-slate-800">
            {Icon && <Icon size={18} className="text-blue-600" />} {title}
          </h3>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto p-6 flex-1">{children}</div>
      </div>
    </div>
  );
};

const EmptyState = ({ icon: Icon, message }) => (
  <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
    <Icon size={32} className="opacity-30" />
    <p className="text-xs text-center px-4 font-medium">{message}</p>
  </div>
);

export default function LandingManage() {
  const [activeTab, setActiveTab] = useState("hero");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [hero, setHero] = useState({
    id: null,
    title: "",
    subtitle: "",
    action_url: "",
  });
  const [about, setAbout] = useState({ id: null, title: "", subtitle: "" });
  const [footerContact, setFooterContact] = useState({
    id: null,
    address: "",
    phone: "",
    email: "",
  });
  const [courses, setCourses] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [gallery, setGallery] = useState([]);

  // Modal Kursus
  const [courseModal, setCourseModal] = useState(false);
  const [courseEditing, setCourseEditing] = useState(null);
  const [courseForm, setCourseForm] = useState({
    title: "",
    price: "",
    description: "",
    icon_name: "Droplets",
    features: [""],
  });
  const [courseSaving, setCourseSaving] = useState(false);

  // Modal Testimoni
  const [testiModal, setTestiModal] = useState(false);
  const [testiEditing, setTestiEditing] = useState(null);
  const [testiForm, setTestiForm] = useState({
    name: "",
    role: "",
    text: "",
    is_published: true,
  });
  const [testiSaving, setTestiSaving] = useState(false);

  // Modal Galeri
  const [galleryModal, setGalleryModal] = useState(false);
  const [galleryForm, setGalleryForm] = useState({
    image_url: "",
    alt_text: "",
    sort_order: 0,
  });
  const [gallerySaving, setGallerySaving] = useState(false);
  const [galleryUploadMethod, setGalleryUploadMethod] = useState("url");
  const [galleryFile, setGalleryFile] = useState(null);

  // Dialog Konfirmasi Kustom
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmLabel: "Hapus",
    isDestructive: true,
    onConfirm: null,
  });

  const triggerConfirm = ({ title, message, confirmLabel, isDestructive, onConfirm }) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      confirmLabel: confirmLabel || "Hapus",
      isDestructive: Boolean(isDestructive),
      onConfirm,
    });
  };

  const closeConfirm = () => {
    setConfirmState((prev) => ({ ...prev, isOpen: false, onConfirm: null }));
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [
        { data: settings },
        { data: courseData },
        { data: testiData },
        { data: galleryData },
      ] = await Promise.all([
        supabase.from("landing_settings").select("*"),
        supabase
          .from("landing_courses")
          .select("*")
          .order("created_at", { ascending: true }),
        supabase
          .from("landing_testimonials")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("landing_gallery")
          .select("*")
          .order("sort_order", { ascending: true }),
      ]);

      if (settings) {
        const heroD = settings.find((s) => s.section === "hero");
        const aboutD = settings.find((s) => s.section === "about");
        const footerD = settings.find((s) => s.section === "footer_contact");
        if (heroD) setHero(heroD);
        if (aboutD) setAbout(aboutD);
        if (footerD) {
          const [phone = "", email = ""] = (footerD.action_url || "").split("|");
          setFooterContact({
            id: footerD.id,
            address: footerD.subtitle || "",
            phone,
            email,
          });
        }
      }
      if (courseData) setCourses(courseData);
      if (testiData) setTestimonials(testiData);
      if (galleryData) setGallery(galleryData);
    } catch (err) {
      toast.error("Gagal memuat konten halaman utama: " + err.message);
    }
    setLoading(false);
  };

  const saveHero = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("landing_settings")
      .update({
        title: hero.title,
        subtitle: hero.subtitle,
        action_url: hero.action_url,
      })
      .eq("section", "hero");
    if (error) toast.error("Gagal memperbarui bagian utama (Hero)");
    else toast.success("Bagian utama (Hero) berhasil diperbarui");
    setSaving(false);
  };

  const saveInfo = async () => {
    setSaving(true);
    const [r1, r2] = await Promise.all([
      supabase
        .from("landing_settings")
        .update({ title: about.title, subtitle: about.subtitle })
        .eq("section", "about"),
      supabase
        .from("landing_settings")
        .update({
          subtitle: footerContact.address,
          action_url: `${footerContact.phone}|${footerContact.email}`,
        })
        .eq("section", "footer_contact"),
    ]);
    if (r1.error || r2.error) toast.error("Gagal menyimpan informasi profil & kontak");
    else toast.success("Informasi tentang kami dan kontak berhasil disimpan");
    setSaving(false);
  };

  // Logika Kelola Kursus
  const openNewCourse = () => {
    setCourseEditing(null);
    setCourseForm({
      title: "",
      price: "",
      description: "",
      icon_name: "Droplets",
      features: [""],
    });
    setCourseModal(true);
  };

  const openEditCourse = (course) => {
    setCourseEditing(course.id);
    setCourseForm({
      title: course.title || "",
      price: course.price || "",
      description: course.description || "",
      icon_name: course.icon_name || "Droplets",
      features: course.features?.length ? course.features : [""],
    });
    setCourseModal(true);
  };

  const saveCourse = async (e) => {
    e.preventDefault();
    setCourseSaving(true);
    const payload = {
      ...courseForm,
      features: courseForm.features.filter((f) => f.trim()),
    };
    const { error } = courseEditing
      ? await supabase
          .from("landing_courses")
          .update(payload)
          .eq("id", courseEditing)
      : await supabase.from("landing_courses").insert([payload]);
    if (error) toast.error(error.message);
    else {
      toast.success(courseEditing ? "Paket kursus diperbarui" : "Paket kursus ditambahkan");
      setCourseModal(false);
      fetchAll();
    }
    setCourseSaving(false);
  };

  const deleteCourse = (id, courseTitle) => {
    triggerConfirm({
      title: "Hapus Paket Kursus?",
      message: `Apakah Anda yakin ingin menghapus paket "${courseTitle || "kursus ini"}" dari halaman utama?`,
      confirmLabel: "Hapus Kursus",
      isDestructive: true,
      onConfirm: async () => {
        closeConfirm();
        const { error } = await supabase.from("landing_courses").delete().eq("id", id);
        if (error) toast.error("Gagal menghapus: " + error.message);
        else {
          setCourses((prev) => prev.filter((c) => c.id !== id));
          toast.success("Paket kursus berhasil dihapus");
        }
      },
    });
  };

  const addFeature = () =>
    setCourseForm((p) => ({ ...p, features: [...p.features, ""] }));
  const removeFeature = (i) =>
    setCourseForm((p) => ({
      ...p,
      features: p.features.filter((_, idx) => idx !== i),
    }));
  const changeFeature = (i, v) =>
    setCourseForm((p) => {
      const f = [...p.features];
      f[i] = v;
      return { ...p, features: f };
    });

  // Logika Kelola Testimoni
  const openNewTesti = () => {
    setTestiEditing(null);
    setTestiForm({ name: "", role: "", text: "", is_published: true });
    setTestiModal(true);
  };

  const openEditTesti = (t) => {
    setTestiEditing(t.id);
    setTestiForm({
      name: t.name,
      role: t.role,
      text: t.text,
      is_published: t.is_published,
    });
    setTestiModal(true);
  };

  const saveTesti = async (e) => {
    e.preventDefault();
    setTestiSaving(true);
    const { error } = testiEditing
      ? await supabase
          .from("landing_testimonials")
          .update(testiForm)
          .eq("id", testiEditing)
      : await supabase.from("landing_testimonials").insert([testiForm]);
    if (error) toast.error(error.message);
    else {
      toast.success(testiEditing ? "Ulasan berhasil diperbarui" : "Ulasan berhasil ditambahkan");
      setTestiModal(false);
      fetchAll();
    }
    setTestiSaving(false);
  };

  const deleteTesti = (id, personName) => {
    triggerConfirm({
      title: "Hapus Testimoni?",
      message: `Hapus ulasan yang diberikan oleh "${personName || "pengguna ini"}"?`,
      confirmLabel: "Hapus Testimoni",
      isDestructive: true,
      onConfirm: async () => {
        closeConfirm();
        const { error } = await supabase.from("landing_testimonials").delete().eq("id", id);
        if (error) toast.error("Gagal menghapus: " + error.message);
        else {
          setTestimonials((prev) => prev.filter((t) => t.id !== id));
          toast.success("Ulasan berhasil dihapus");
        }
      },
    });
  };

  const toggleTesti = async (id, current) => {
    const { error } = await supabase
      .from("landing_testimonials")
      .update({ is_published: !current })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      setTestimonials((prev) =>
        prev.map((t) => (t.id === id ? { ...t, is_published: !current } : t))
      );
      toast.success(!current ? "Ulasan dipublikasikan" : "Ulasan disembunyikan");
    }
  };

  // Logika Kelola Galeri
  const openAddGallery = () => {
    setGalleryForm({ image_url: "", alt_text: "", sort_order: gallery.length });
    setGalleryUploadMethod("file");
    setGalleryFile(null);
    setGalleryModal(true);
  };

  const saveGallery = async (e) => {
    e.preventDefault();
    setGallerySaving(true);

    let finalImageUrl = galleryForm.image_url;

    if (galleryUploadMethod === "file" && galleryFile) {
      try {
        const fileExt = galleryFile.name.split(".").pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `gallery/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("images")
          .upload(filePath, galleryFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("images")
          .getPublicUrl(filePath);

        finalImageUrl = urlData.publicUrl;
      } catch (err) {
        toast.error("Gagal mengunggah gambar: " + err.message);
        setGallerySaving(false);
        return;
      }
    } else if (galleryUploadMethod === "url" && !finalImageUrl) {
      toast.error("Harap masukkan tautan URL gambar.");
      setGallerySaving(false);
      return;
    }

    const { error } = await supabase.from("landing_gallery").insert([
      {
        image_url: finalImageUrl,
        alt_text: galleryForm.alt_text,
        sort_order: galleryForm.sort_order,
      },
    ]);

    if (error) toast.error(error.message);
    else {
      toast.success("Gambar berhasil ditambahkan ke galeri");
      setGalleryModal(false);
      fetchAll();
    }
    setGallerySaving(false);
  };

  const deleteGallery = (id) => {
    triggerConfirm({
      title: "Hapus Foto Galeri?",
      message: "Apakah Anda yakin ingin menghapus gambar ini dari etalase galeri publik?",
      confirmLabel: "Hapus Foto",
      isDestructive: true,
      onConfirm: async () => {
        closeConfirm();
        const { error } = await supabase.from("landing_gallery").delete().eq("id", id);
        if (error) toast.error(error.message);
        else {
          setGallery((prev) => prev.filter((g) => g.id !== id));
          toast.success("Gambar berhasil dihapus dari galeri");
        }
      },
    });
  };

  const TABS = [
    { id: "hero", label: "Bagian Utama (Hero)", icon: Type },
    { id: "info", label: "Informasi & Galeri", icon: ImageIcon },
    { id: "courses", label: "Paket Program", icon: Layers },
    { id: "testimonials", label: "Ulasan / Testimoni", icon: Star },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900">
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

      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl text-white shadow-md shadow-blue-600/20">
            <LayoutTemplate size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold leading-none truncate">
              Manajer Halaman Depan
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
              Kelola teks, galeri foto, paket renang, dan ulasan publik
            </p>
          </div>
          {loading && (
            <Loader2 size={16} className="text-blue-600 animate-spin flex-shrink-0" />
          )}
        </div>
      </header>

      <div className="bg-white border-b border-slate-200 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-2 min-w-max">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all duration-200 whitespace-nowrap ${
                  active
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon size={16} /> {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8">
        {/* Tab Bagian Utama */}
        {activeTab === "hero" && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Edit3 size={16} className="text-blue-600" /> Konten Utama (Hero Banner)
              </h2>
              <Field label="Judul Utama (Headline)">
                <input
                  value={hero.title}
                  onChange={(e) => setHero({ ...hero, title: e.target.value })}
                  className={inputCls}
                  placeholder="Contoh: Belajar Renang Profesional Bersama Kami"
                />
              </Field>
              <Field label="Subjudul / Slogan">
                <textarea
                  value={hero.subtitle}
                  onChange={(e) => setHero({ ...hero, subtitle: e.target.value })}
                  rows={3}
                  className={inputCls}
                  placeholder="Deskripsi singkat manfaat klub renang bagi peserta..."
                />
              </Field>
              <Field label="Tautan Aksi Tombol (URL CTA)">
                <input
                  value={hero.action_url}
                  onChange={(e) => setHero({ ...hero, action_url: e.target.value })}
                  className={inputCls}
                  placeholder="https://wa.me/62..."
                />
              </Field>
              <div className="pt-2">
                <Btn
                  variant="blue"
                  loading={saving}
                  onClick={saveHero}
                  className="w-full sm:w-auto"
                >
                  <Save size={15} /> Simpan Perubahan
                </Btn>
              </div>
            </div>

            <div className="lg:col-span-2 bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-6 text-white flex flex-col justify-between shadow-lg shadow-blue-600/20">
              <div>
                <p className="text-[10px] font-bold tracking-widest text-blue-200 uppercase mb-4">
                  Pratinjau Langsung
                </p>
                <h2 className="text-xl font-extrabold leading-tight mb-2 break-words">
                  {hero.title || <span className="opacity-40 italic">Belum ada judul...</span>}
                </h2>
                <p className="text-blue-100 text-xs leading-relaxed">
                  {hero.subtitle || <span className="opacity-40 italic">Belum ada subjudul...</span>}
                </p>
              </div>
              <div className="mt-8 border-t border-white/20 pt-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200 mb-1">Tips Konten</p>
                <p className="text-blue-100 text-xs leading-relaxed">
                  Gunakan kalimat yang padat dan menarik minat orang tua atlet dalam membaca penawaran program.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Informasi & Galeri */}
        {activeTab === "info" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
                <h2 className="text-sm font-bold text-slate-800">
                  Tentang Klub (About Section)
                </h2>
                <Field label="Judul Bagian">
                  <input
                    value={about.title}
                    onChange={(e) => setAbout({ ...about, title: e.target.value })}
                    className={inputCls}
                    placeholder="Tentang Kami"
                  />
                </Field>
                <Field label="Deskripsi Pengantar">
                  <textarea
                    value={about.subtitle}
                    onChange={(e) => setAbout({ ...about, subtitle: e.target.value })}
                    rows={4}
                    className={inputCls}
                    placeholder="Ceritakan tentang sejarah, visi, dan pencapaian klub..."
                  />
                </Field>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <MapPin size={16} className="text-blue-600" /> Kontak Footer
                </h2>
                <Field label="Alamat Lengkap">
                  <textarea
                    value={footerContact.address}
                    onChange={(e) => setFooterContact({ ...footerContact, address: e.target.value })}
                    rows={2}
                    className={inputCls}
                    placeholder="Jl. Kolam Renang No. 1..."
                  />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Nomor WhatsApp">
                    <input
                      value={footerContact.phone}
                      onChange={(e) => setFooterContact({ ...footerContact, phone: e.target.value })}
                      className={inputCls}
                      placeholder="+62..."
                    />
                  </Field>
                  <Field label="Alamat Email">
                    <input
                      value={footerContact.email}
                      onChange={(e) => setFooterContact({ ...footerContact, email: e.target.value })}
                      className={inputCls}
                      placeholder="admin@siripbiru.com"
                    />
                  </Field>
                </div>
                <Btn
                  variant="blue"
                  loading={saving}
                  onClick={saveInfo}
                  className="w-full"
                >
                  <Save size={15} /> Simpan Profil & Kontak
                </Btn>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-sm font-bold text-slate-800">
                  Foto Galeri Kegiatan
                </h2>
                <Btn
                  variant="blue"
                  onClick={openAddGallery}
                  className="py-2 px-3 text-xs"
                >
                  <Plus size={14} /> Tambah Foto
                </Btn>
              </div>

              {gallery.length === 0 ? (
                <EmptyState
                  icon={ImageIcon}
                  message="Belum ada foto galeri. Tambahkan foto kegiatan latihan klub."
                />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto max-h-[500px] p-1">
                  {gallery.map((img) => (
                    <div
                      key={img.id}
                      className="relative group rounded-xl overflow-hidden aspect-[4/3] bg-slate-100 border border-slate-200 shadow-sm"
                    >
                      <img
                        src={img.image_url}
                        alt={img.alt_text || "Galeri"}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-2">
                        {img.alt_text && (
                          <p className="text-white text-[11px] font-medium text-center line-clamp-2">
                            {img.alt_text}
                          </p>
                        )}
                        <button
                          onClick={() => deleteGallery(img.id)}
                          className="p-2 bg-rose-600 text-white rounded-full hover:bg-rose-700 shadow-md active:scale-95"
                          title="Hapus foto"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Paket Program */}
        {activeTab === "courses" && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  Daftar Program Latihan
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Menampilkan {courses.length} paket latihan pada halaman arahan
                </p>
              </div>
              <Btn variant="blue" onClick={openNewCourse}>
                <Plus size={16} /> Buat Paket Baru
              </Btn>
            </div>

            {courses.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                <EmptyState
                  icon={Layers}
                  message="Belum ada paket program latihan. Tambahkan paket pertama Anda."
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {courses.map((course) => {
                  const Icon = ICON_MAP[course.icon_name] || Star;
                  return (
                    <div
                      key={course.id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 flex items-center justify-center bg-blue-50 rounded-xl text-blue-600">
                          <Icon size={20} />
                        </div>
                        <button
                          onClick={() => deleteCourse(course.id, course.title)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Hapus paket"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <h3 className="font-bold text-slate-800 text-sm mb-1">
                        {course.title}
                      </h3>
                      <p className="text-blue-600 font-bold text-xs mb-2">
                        {course.price}
                      </p>
                      <p className="text-xs text-slate-500 mb-4 line-clamp-2 flex-1">
                        {course.description}
                      </p>
                      {course.features?.length > 0 && (
                        <ul className="mb-5 space-y-1.5 border-t border-slate-100 pt-3">
                          {course.features.slice(0, 3).map((f, i) => (
                            <li key={i} className="flex items-center gap-1.5 text-xs text-slate-600">
                              <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
                              <span className="truncate">{f}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <Btn
                        variant="outline"
                        onClick={() => openEditCourse(course)}
                        className="w-full mt-auto"
                      >
                        <Edit3 size={13} /> Ubah Rincian
                      </Btn>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab Ulasan Testimoni */}
        {activeTab === "testimonials" && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  Ulasan & Testimoni
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {testimonials.filter((t) => t.is_published).length} dipublikasikan • {testimonials.filter((t) => !t.is_published).length} konsep
                </p>
              </div>
              <Btn variant="blue" onClick={openNewTesti}>
                <Plus size={16} /> Tambah Testimoni
              </Btn>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              {testimonials.length === 0 ? (
                <EmptyState icon={Star} message="Belum ada testimoni yang ditambahkan." />
              ) : (
                <div className="divide-y divide-slate-100">
                  {testimonials.map((t) => (
                    <div
                      key={t.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-slate-50/50"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                          {t.name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs sm:text-sm text-slate-800">{t.name}</span>
                            <span className="text-slate-400 text-xs">•</span>
                            <span className="text-slate-400 text-xs font-medium">{t.role}</span>
                          </div>
                          <p className="text-xs text-slate-600 italic mt-0.5">
                            "{t.text}"
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => toggleTesti(t.id, t.is_published)}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border flex items-center gap-1.5 transition-colors ${
                            t.is_published
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                          }`}
                        >
                          {t.is_published ? <Eye size={12} /> : <EyeOff size={12} />}
                          {t.is_published ? "Tayang" : "Disimpan"}
                        </button>
                        <button
                          onClick={() => openEditTesti(t)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg"
                          title="Ubah ulasan"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => deleteTesti(t.id, t.name)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg"
                          title="Hapus ulasan"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal Paket Kursus */}
      <Modal
        open={courseModal}
        onClose={() => setCourseModal(false)}
        title={courseEditing ? "Ubah Paket Program" : "Paket Program Baru"}
        icon={Layers}
        maxWidth="max-w-xl"
      >
        <form onSubmit={saveCourse} className="space-y-4">
          <Field label="Nama Paket Kursus">
            <input
              required
              value={courseForm.title}
              onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
              className={inputCls}
              placeholder="Contoh: Kelas Pemula Anak"
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Label Harga / Periode">
              <input
                required
                value={courseForm.price}
                onChange={(e) => setCourseForm({ ...courseForm, price: e.target.value })}
                className={inputCls}
                placeholder="Contoh: Rp 350.000 / Bulan"
              />
            </Field>
            <Field label="Ikon Penanda">
              <select
                value={courseForm.icon_name}
                onChange={(e) => setCourseForm({ ...courseForm, icon_name: e.target.value })}
                className={inputCls}
              >
                {ICON_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Deskripsi Singkat">
            <textarea
              required
              rows={2}
              value={courseForm.description}
              onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
              className={inputCls}
              placeholder="Tuliskan sasaran dan ringkasan pelatihan..."
            />
          </Field>

          <div className="border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Poin Keunggulan / Fasilitas
              </span>
              <button
                type="button"
                onClick={addFeature}
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
              >
                <Plus size={12} /> Tambah Fasilitas
              </button>
            </div>
            <div className="space-y-2">
              {courseForm.features.map((feature, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <input
                    value={feature}
                    onChange={(e) => changeFeature(i, e.target.value)}
                    className={`${inputCls} flex-1`}
                    placeholder={`Poin fasilitas ${i + 1}...`}
                  />
                  {courseForm.features.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeFeature(i)}
                      className="p-1 text-slate-400 hover:text-rose-600"
                    >
                      <MinusCircle size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Btn type="button" variant="ghost" onClick={() => setCourseModal(false)}>
              Batal
            </Btn>
            <Btn type="submit" variant="blue" loading={courseSaving}>
              <Save size={14} /> {courseEditing ? "Simpan Perubahan" : "Simpan Paket"}
            </Btn>
          </div>
        </form>
      </Modal>

      {/* Modal Testimoni */}
      <Modal
        open={testiModal}
        onClose={() => setTestiModal(false)}
        title={testiEditing ? "Ubah Testimoni" : "Tambah Testimoni"}
        icon={Star}
      >
        <form onSubmit={saveTesti} className="space-y-3 text-xs">
          <Field label="Nama Pengirim">
            <input
              required
              value={testiForm.name}
              onChange={(e) => setTestiForm({ ...testiForm, name: e.target.value })}
              className={inputCls}
              placeholder="Nama lengkap wali / atlet"
            />
          </Field>
          <Field label="Peran / Gelar">
            <input
              required
              value={testiForm.role}
              onChange={(e) => setTestiForm({ ...testiForm, role: e.target.value })}
              className={inputCls}
              placeholder="Contoh: Orang Tua Atlet Pemula"
            />
          </Field>
          <Field label="Isi Pesan / Testimoni">
            <textarea
              required
              rows={3}
              value={testiForm.text}
              onChange={(e) => setTestiForm({ ...testiForm, text: e.target.value })}
              className={`${inputCls} resize-none`}
              placeholder="Pendapat atau ulasan selama mengikuti klub..."
            />
          </Field>
          <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={testiForm.is_published}
              onChange={(e) => setTestiForm({ ...testiForm, is_published: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="font-bold text-slate-700">Publikasikan langsung ke halaman depan</span>
          </label>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Btn type="button" variant="ghost" onClick={() => setTestiModal(false)}>
              Batal
            </Btn>
            <Btn type="submit" variant="blue" loading={testiSaving}>
              <Save size={14} /> {testiEditing ? "Simpan Perubahan" : "Simpan Testimoni"}
            </Btn>
          </div>
        </form>
      </Modal>

      {/* Modal Galeri Foto */}
      <Modal
        open={galleryModal}
        onClose={() => setGalleryModal(false)}
        title="Tambah Foto Galeri"
        icon={ImageIcon}
      >
        <form onSubmit={saveGallery} className="space-y-4 text-xs">
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5 font-bold text-slate-700 cursor-pointer">
              <input
                type="radio"
                name="gallery_opt"
                checked={galleryUploadMethod === "file"}
                onChange={() => setGalleryUploadMethod("file")}
                className="w-4 h-4 text-blue-600"
              />
              Unggah File
            </label>
            <label className="flex items-center gap-1.5 font-bold text-slate-700 cursor-pointer">
              <input
                type="radio"
                name="gallery_opt"
                checked={galleryUploadMethod === "url"}
                onChange={() => setGalleryUploadMethod("url")}
                className="w-4 h-4 text-blue-600"
              />
              Tautan URL
            </label>
          </div>

          {galleryUploadMethod === "file" ? (
            <Field label="Pilih Gambar dari Perangkat">
              <input
                type="file"
                accept="image/*"
                required
                onChange={(e) => setGalleryFile(e.target.files[0])}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700"
              />
            </Field>
          ) : (
            <Field label="Tautan URL Gambar">
              <input
                required
                value={galleryForm.image_url}
                onChange={(e) => setGalleryForm({ ...galleryForm, image_url: e.target.value })}
                className={inputCls}
                placeholder="https://domain.com/foto-latihan.jpg"
              />
            </Field>
          )}

          <Field label="Keterangan Foto (Opsional)">
            <input
              value={galleryForm.alt_text}
              onChange={(e) => setGalleryForm({ ...galleryForm, alt_text: e.target.value })}
              className={inputCls}
              placeholder="Contoh: Latihan teknik renang gaya dada"
            />
          </Field>
          <Field label="Nomor Urutan Tampil">
            <input
              type="number"
              min="0"
              value={galleryForm.sort_order}
              onChange={(e) => setGalleryForm({ ...galleryForm, sort_order: parseInt(e.target.value, 10) || 0 })}
              className={inputCls}
            />
          </Field>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Btn type="button" variant="ghost" onClick={() => setGalleryModal(false)}>
              Batal
            </Btn>
            <Btn type="submit" variant="blue" loading={gallerySaving}>
              <Plus size={14} /> Tambahkan ke Galeri
            </Btn>
          </div>
        </form>
      </Modal>
    </div>
  );
}