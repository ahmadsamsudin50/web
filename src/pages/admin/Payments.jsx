import React, { useEffect, useState } from "react";
import { supabase } from "../../utils/supabaseClient";
import { toast, Toaster } from "react-hot-toast";
import {
  CreditCard,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  X,
  AlertTriangle,
  CheckSquare,
  Square,
} from "lucide-react";

function CustomConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Ya, Hapus",
  isDestructive = true,
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
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

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("pending");

  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [selectedIds, setSelectedIds] = useState([]);
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
      confirmLabel: confirmLabel || "Ya, Hapus",
      isDestructive: Boolean(isDestructive),
      onConfirm,
    });
  };

  const closeConfirm = () => {
    setConfirmState((prev) => ({ ...prev, isOpen: false, onConfirm: null }));
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          students ( nis, users ( full_name ) ),
          classes ( name, max_capacity )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      toast.error("Gagal memuat data pembayaran: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const filteredPayments = payments.filter((p) => {
    const studentName = p.students?.users?.full_name?.toLowerCase() || "";
    const className = p.classes?.name?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    const matchesSearch = studentName.includes(query) || className.includes(query);
    const matchesStatus = filterStatus === "all" ? true : p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const counts = {
    pending: payments.filter((p) => p.status === "pending").length,
    approved: payments.filter((p) => p.status === "approved").length,
    rejected: payments.filter((p) => p.status === "rejected").length,
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const currentFilteredIds = filteredPayments.map((p) => p.id);
    const isAllSelected =
      currentFilteredIds.length > 0 &&
      currentFilteredIds.every((id) => selectedIds.includes(id));

    if (isAllSelected) {
      setSelectedIds((prev) => prev.filter((id) => !currentFilteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...currentFilteredIds])));
    }
  };

  const isAllCurrentSelected =
    filteredPayments.length > 0 &&
    filteredPayments.every((p) => selectedIds.includes(p.id));

  const openReviewModal = (payment) => {
    setSelectedPayment(payment);
    setIsRejecting(false);
    setRejectReason("");
    setIsModalOpen(true);
  };

  const handleApprove = async () => {
    setActionLoading(true);
    const loadingToast = toast.loading("Memeriksa kapasitas kelas dan menyetujui...");
    try {
      const { count: enrolledCount, error: countError } = await supabase
        .from("student_enrollments")
        .select("*", { count: "exact", head: true })
        .eq("class_id", selectedPayment.class_id)
        .in("status", ["active", "completed"]);

      if (countError) throw countError;

      const maxCapacity = selectedPayment.classes?.max_capacity || 0;
      if (enrolledCount >= maxCapacity) {
        throw new Error(`Kelas telah penuh. Kuota maksimal (${maxCapacity}) siswa sudah tercapai.`);
      }

      const admin = JSON.parse(localStorage.getItem("user_session"));

      const { error: updateError } = await supabase
        .from("payments")
        .update({
          status: "approved",
          processed_by: admin?.id || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedPayment.id);

      if (updateError) throw updateError;

      const { error: enrollError } = await supabase
        .from("student_enrollments")
        .insert([
          {
            student_id: selectedPayment.student_id,
            class_id: selectedPayment.class_id,
            status: "active",
          },
        ]);

      if (enrollError) throw enrollError;

      toast.success("Pembayaran disetujui dan atlet telah terdaftar di kelas!", { id: loadingToast });
      setIsModalOpen(false);
      fetchPayments();
    } catch (error) {
      toast.error(error.message, { id: loadingToast });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error("Harap isi alasan penolakan.");
      return;
    }

    setActionLoading(true);
    const loadingToast = toast.loading("Menolak transaksi...");
    try {
      const admin = JSON.parse(localStorage.getItem("user_session"));
      const { error } = await supabase
        .from("payments")
        .update({
          status: "rejected",
          reject_reason: rejectReason.trim(),
          processed_by: admin?.id || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedPayment.id);

      if (error) throw error;

      toast.success("Pengajuan pembayaran berhasil ditolak.", { id: loadingToast });
      setIsModalOpen(false);
      fetchPayments();
    } catch (error) {
      toast.error(error.message, { id: loadingToast });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSingle = (payment) => {
    triggerConfirm({
      title: "Hapus Riwayat Pembayaran?",
      message: `Apakah Anda yakin ingin menghapus data pembayaran atlet "${payment.students?.users?.full_name || "ini"}"? Tindakan ini permanen.`,
      confirmLabel: "Hapus Permanen",
      isDestructive: true,
      onConfirm: async () => {
        closeConfirm();
        const loadingToast = toast.loading("Menghapus data pembayaran...");
        try {
          const { error } = await supabase.from("payments").delete().eq("id", payment.id);
          if (error) throw error;

          toast.success("Riwayat pembayaran berhasil dihapus.", { id: loadingToast });
          setSelectedIds((prev) => prev.filter((id) => id !== payment.id));
          fetchPayments();
        } catch (error) {
          toast.error("Gagal menghapus: " + error.message, { id: loadingToast });
        }
      },
    });
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;

    triggerConfirm({
      title: `Hapus ${selectedIds.length} Riwayat Pembayaran?`,
      message: `Semua catatan pembayaran yang dicentang (${selectedIds.length} data) akan dihapus secara permanen.`,
      confirmLabel: `Hapus ${selectedIds.length} Data`,
      isDestructive: true,
      onConfirm: async () => {
        closeConfirm();
        const loadingToast = toast.loading(`Menghapus ${selectedIds.length} pembayaran...`);
        try {
          const { error } = await supabase.from("payments").delete().in("id", selectedIds);
          if (error) throw error;

          toast.success(`${selectedIds.length} riwayat pembayaran berhasil dihapus.`, { id: loadingToast });
          setSelectedIds([]);
          fetchPayments();
        } catch (error) {
          toast.error("Gagal menghapus massal: " + error.message, { id: loadingToast });
        }
      },
    });
  };

  const formatRupiah = (number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(number);
  };

  const getStatusBadge = (status) => {
    if (status === "approved") {
      return (
        <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider border border-emerald-700 shadow-sm">
          Disetujui
        </span>
      );
    }
    if (status === "rejected") {
      return (
        <span className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider border border-rose-700 shadow-sm">
          Ditolak
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 bg-amber-400 text-amber-950 rounded-lg text-[10px] font-black uppercase tracking-wider border border-amber-500 shadow-sm">
        Menunggu
      </span>
    );
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

      <div className="max-w-7xl mx-auto mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <CreditCard className="text-blue-600" size={28} />
          Verifikasi Pembayaran
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Periksa, validasi, atau kelola riwayat transaksi pendaftaran kelas atlet.
        </p>
      </div>

      <div className="max-w-7xl mx-auto mb-6 flex gap-2 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
        <button
          onClick={() => {
            setFilterStatus("pending");
            setSelectedIds([]);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
            filterStatus === "pending"
              ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Clock size={16} /> Perlu Peninjauan
          {counts.pending > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 text-white font-bold">
              {counts.pending}
            </span>
          )}
        </button>
        <button
          onClick={() => {
            setFilterStatus("approved");
            setSelectedIds([]);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
            filterStatus === "approved"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <CheckCircle2 size={16} /> Disetujui
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
            {counts.approved}
          </span>
        </button>
        <button
          onClick={() => {
            setFilterStatus("rejected");
            setSelectedIds([]);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
            filterStatus === "rejected"
              ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <XCircle size={16} /> Ditolak
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
            {counts.rejected}
          </span>
        </button>
        <button
          onClick={() => {
            setFilterStatus("all");
            setSelectedIds([]);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
            filterStatus === "all"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          Semua Riwayat
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 text-white font-bold">
            {payments.length}
          </span>
        </button>
      </div>

      <div className="max-w-7xl mx-auto mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama atlet atau kelas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          />
        </div>

        {selectedIds.length > 0 && (
          <button
            type="button"
            onClick={handleDeleteSelected}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all active:scale-95 shrink-0"
          >
            <Trash2 size={16} /> Hapus Terpilih ({selectedIds.length})
          </button>
        )}
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-wider font-bold border-b border-slate-100">
                <th className="px-4 py-4 w-10 text-center">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="p-1 text-slate-400 hover:text-blue-600"
                    title={isAllCurrentSelected ? "Batal pilih semua" : "Pilih semua data"}
                  >
                    {isAllCurrentSelected ? (
                      <CheckSquare size={16} className="text-blue-600" />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                </th>
                <th className="px-6 py-4">Informasi Transaksi</th>
                <th className="px-6 py-4">Data Atlet</th>
                <th className="px-6 py-4">Kelas Tujuan</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredPayments.map((p) => {
                const isSelected = selectedIds.includes(p.id);
                const dateObj = new Date(p.created_at);
                const dateStr = dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
                const timeStr = dateObj.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

                return (
                  <tr
                    key={p.id}
                    className={`transition-colors ${
                      isSelected ? "bg-blue-50/60" : "hover:bg-slate-50/50"
                    }`}
                  >
                    <td className="px-4 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => toggleSelectOne(p.id)}
                        className="p-1 text-slate-400 hover:text-blue-600"
                      >
                        {isSelected ? (
                          <CheckSquare size={16} className="text-blue-600" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 text-sm">{formatRupiah(p.amount)}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{dateStr} • {timeStr} WIB</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 text-sm">{p.students?.users?.full_name || "Atlet"}</div>
                      <div className="text-xs text-slate-500">NIS: {p.students?.nis}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-700 text-sm">{p.classes?.name}</span>
                    </td>
                    <td className="px-6 py-4 text-center">{getStatusBadge(p.status)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => openReviewModal(p)}
                          className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl font-bold text-xs transition-colors"
                        >
                          Tinjau
                        </button>
                        <button
                          onClick={() => handleDeleteSingle(p)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Hapus Transaksi"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-3">
          {filteredPayments.length > 0 && (
            <div className="flex justify-between items-center px-1 text-xs text-slate-500">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="flex items-center gap-2 font-bold text-blue-600"
              >
                {isAllCurrentSelected ? (
                  <CheckSquare size={16} />
                ) : (
                  <Square size={16} />
                )}
                {isAllCurrentSelected ? "Batalkan Pilihan Semua" : "Pilih Semua Data"}
              </button>
              {selectedIds.length > 0 && (
                <span className="font-bold text-slate-700">{selectedIds.length} Terpilih</span>
              )}
            </div>
          )}

          {filteredPayments.map((p) => {
            const isSelected = selectedIds.includes(p.id);
            const dateObj = new Date(p.created_at);
            const dateStr = dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "short" });

            return (
              <div
                key={p.id}
                className={`bg-white border rounded-2xl p-4 shadow-sm space-y-3 transition-all ${
                  isSelected ? "border-blue-500 ring-1 ring-blue-500 bg-blue-50/30" : "border-slate-200"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-2.5">
                    <button
                      type="button"
                      onClick={() => toggleSelectOne(p.id)}
                      className="p-0.5 text-slate-400 hover:text-blue-600 mt-0.5"
                    >
                      {isSelected ? (
                        <CheckSquare size={18} className="text-blue-600" />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">{p.students?.users?.full_name}</h3>
                      <p className="text-xs text-slate-400">NIS: {p.students?.nis}</p>
                    </div>
                  </div>
                  {getStatusBadge(p.status)}
                </div>

                <div className="flex justify-between items-center text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <span>{p.classes?.name}</span>
                  <span className="font-bold text-slate-800">{formatRupiah(p.amount)}</span>
                </div>

                <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                  <span className="text-[11px] text-slate-400">{dateStr}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openReviewModal(p)}
                      className="px-3 py-1 bg-blue-50 text-blue-600 font-bold rounded-lg text-xs"
                    >
                      Tinjau
                    </button>
                    <button
                      onClick={() => handleDeleteSingle(p)}
                      className="p-1.5 text-slate-400 hover:text-rose-600"
                      title="Hapus Transaksi"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredPayments.length === 0 && !loading && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 shadow-sm">
            <AlertTriangle size={36} className="mx-auto mb-2 text-slate-300" />
            <p className="font-bold text-slate-700 text-sm">Tidak ada transaksi ditemukan</p>
            <p className="text-xs mt-1">Coba sesuaikan kata kunci pencarian atau opsi filter status.</p>
          </div>
        )}
      </div>

      {isModalOpen && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-5 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">Tinjau Pembayaran</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center p-2 min-h-[220px]">
              <a href={selectedPayment.receipt_url} target="_blank" rel="noopener noreferrer">
                <img
                  src={selectedPayment.receipt_url}
                  alt="Bukti Transfer"
                  className="max-h-[300px] w-auto object-contain rounded-xl shadow-sm"
                />
              </a>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Nama Atlet:</span>
                <span className="font-bold text-slate-800">{selectedPayment.students?.users?.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kelas:</span>
                <span className="font-bold text-slate-800">{selectedPayment.classes?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Nominal:</span>
                <span className="font-bold text-emerald-600 text-sm">{formatRupiah(selectedPayment.amount)}</span>
              </div>
            </div>

            {isRejecting && selectedPayment.status === "pending" && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-rose-600 uppercase">Alasan Penolakan</label>
                <textarea
                  rows={2}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Tulis alasan spesifik penolakan..."
                  className="w-full p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 outline-none"
                />
              </div>
            )}

            {selectedPayment.status === "pending" && (
              <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-100">
                {!isRejecting ? (
                  <>
                    <button
                      onClick={handleApprove}
                      disabled={actionLoading}
                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                    >
                      <CheckCircle2 size={16} /> Setujui Pembayaran
                    </button>
                    <button
                      onClick={() => setIsRejecting(true)}
                      disabled={actionLoading}
                      className="flex-1 py-3 bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <XCircle size={16} /> Tolak Pembayaran
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setIsRejecting(false)}
                      className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl text-xs"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={actionLoading}
                      className="flex-1 py-2.5 bg-rose-600 text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-95"
                    >
                      Konfirmasi Tolak
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}