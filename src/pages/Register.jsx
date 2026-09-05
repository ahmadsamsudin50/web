import React, { useState, useEffect } from "react";
import { supabase } from "../utils/supabaseClient";
import { Link } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { toast, Toaster } from "react-hot-toast";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  MapPin,
  Loader2,
  CheckCircle2,
  Hash,
} from "lucide-react";

export default function Register() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registeredNis, setRegisteredNis] = useState("");
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    confirm_password: "",
    nis: "Memuat...",
    parent_name: "",
    age: "",
    phone_number: "",
    address: "",
  });

  // Fungsi alokasi NIS otomatis dan aman (P3)
  const fetchAvailableNis = async () => {
    try {
      // 1. Coba panggil RPC PostgreSQL jika function sequence sudah dibuat di Supabase
      const { data: rpcNis, error: rpcError } = await supabase.rpc("get_next_student_nis");
      if (!rpcError && rpcNis) {
        setForm((prev) => ({ ...prev, nis: String(rpcNis) }));
        return String(rpcNis);
      }

      // 2. Mekanisme fallback client-side
      const { data, error } = await supabase.from("students").select("nis");
      if (error) throw error;

      const taken = new Set(
        (data || [])
          .map((s) => parseInt(String(s.nis).replace(/\D/g, ""), 10))
          .filter((n) => !isNaN(n) && n > 0)
      );

      let candidate = 1;
      while (taken.has(candidate)) {
        candidate++;
      }

      const allocatedNis = String(candidate);
      setForm((prev) => ({ ...prev, nis: allocatedNis }));
      return allocatedNis;
    } catch {
      setForm((prev) => ({ ...prev, nis: "1" }));
      return "1";
    }
  };

  useEffect(() => {
    fetchAvailableNis();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (form.password !== form.confirm_password) {
      toast.error("Kata sandi dan konfirmasi kata sandi tidak cocok.");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Kata sandi minimal terdiri dari 6 karakter.");
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading("Memproses pendaftaran...");
    let createdUserId = null;

    try {
      const cleanEmail = form.email.trim().toLowerCase();

      // 1. Validasi status email yang sudah terdaftar
      const { data: existingUser } = await supabase
        .from("users")
        .select("id, status")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (existingUser) {
        if (existingUser.status === "pending") {
          throw new Error("Email ini sudah terdaftar dan sedang menunggu persetujuan admin.");
        }
        if (existingUser.status === "active") {
          throw new Error("Email ini sudah terdaftar dan aktif. Silakan menuju halaman masuk.");
        }
        if (existingUser.status === "rejected") {
          // Bersihkan relasi data lama jika pendaftaran sebelumnya ditolak
          const { data: oldStudent } = await supabase
            .from("students")
            .select("id")
            .eq("user_id", existingUser.id)
            .maybeSingle();

          if (oldStudent) {
            await supabase.from("student_enrollments").delete().eq("student_id", oldStudent.id);
            await supabase.from("payments").delete().eq("student_id", oldStudent.id);
            await supabase.from("attendance_logs").delete().eq("student_id", oldStudent.id);
            await supabase.from("students").delete().eq("id", oldStudent.id);
          }
          await supabase.from("users").delete().eq("id", existingUser.id);
        }
      }

      // 2. Alokasikan dan verifikasi NIS tepat sebelum proses insert dilakukan
      let targetNis = form.nis;
      if (!targetNis || targetNis === "Memuat...") {
        targetNis = await fetchAvailableNis();
      }

      const { data: duplicateNis } = await supabase
        .from("students")
        .select("id")
        .eq("nis", targetNis.trim())
        .maybeSingle();

      if (duplicateNis) {
        const freshNis = await fetchAvailableNis();
        throw new Error(`Nomor urut NIS telah terpakai. Sistem telah memperbarui ke nomor urut ${freshNis}. Silakan klik Daftar lagi.`);
      }

      // 3. Simpan akun ke tabel users
      const { data: newUser, error: userError } = await supabase
        .from("users")
        .insert([
          {
            email: cleanEmail,
            password: form.password.trim(),
            full_name: form.full_name.trim(),
            role: "student",
            status: "pending",
          },
        ])
        .select()
        .single();

      if (userError) throw userError;
      createdUserId = newUser.id;

      // 4. Simpan data detail atlet ke tabel students
      const { error: studentError } = await supabase.from("students").insert([
        {
          user_id: newUser.id,
          nis: targetNis.trim(),
          parent_name: form.parent_name.trim(),
          phone_number: form.phone_number.trim(),
          address: form.address.trim(),
          age: form.age ? parseInt(form.age, 10) : null,
          qr_token: `token_student_${uuidv4()}`,
        },
      ]);

      if (studentError) throw studentError;

      setRegisteredNis(targetNis.trim());
      toast.success("Pendaftaran berhasil dicatat!", { id: loadingToast });
      setSuccess(true);
    } catch (error) {
      // Rollback manual jika pembuatan profile gagal di tengah jalan
      if (createdUserId) {
        await supabase.from("students").delete().eq("user_id", createdUserId);
        await supabase.from("users").delete().eq("id", createdUserId);
      }
      toast.error(error.message || "Terjadi kesalahan saat pendaftaran.", { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#0a192f] flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-white rounded-[2rem] p-8 md:p-10 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-6 ring-8 ring-emerald-50/50">
            <CheckCircle2 size={36} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Pendaftaran Berhasil</h2>
          <p className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full mb-3">
            Nomor Induk Siswa (NIS): {registeredNis}
          </p>
          <p className="text-slate-500 font-medium mb-8 text-sm leading-relaxed">
            Data pendaftaran Anda telah tercatat dan sedang menunggu verifikasi oleh pengelola klub.
          </p>
          <Link
            to="/login"
            className="w-full py-3.5 px-4 bg-slate-900 hover:bg-black text-white font-bold rounded-xl shadow-lg transition-all text-sm block"
          >
            Menuju Halaman Masuk
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a192f] flex items-center justify-center p-4 md:p-8 font-sans">
      <Toaster position="top-center" />
      <div className="w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row">
        <div className="hidden md:flex md:w-1/3 bg-blue-600 p-8 flex-col justify-between text-white">
          <div>
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-md overflow-hidden">
              <img src="/sirip_biru.webp" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-2xl font-black tracking-tight mb-3">
              Bergabung dengan Siripbiru
            </h1>
            <p className="text-blue-100 text-sm leading-relaxed">
              Lengkapi formulir pendaftaran atlet untuk mendapatkan kartu digital dan jadwal latihan resmi klub.
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-blue-200">Sudah memiliki akun?</p>
            <Link
              to="/login"
              className="inline-block mt-2 px-5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold transition-colors"
            >
              Masuk Sekarang
            </Link>
          </div>
        </div>

        <div className="w-full md:w-2/3 p-6 md:p-8 flex flex-col justify-center">
          <div className="md:hidden text-center mb-6">
            <h1 className="text-xl font-black text-slate-800 tracking-tight">Pendaftaran Atlet</h1>
            <p className="text-slate-500 text-xs mt-1">Lengkapi data diri Anda di bawah ini</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                    Nama Lengkap
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      required
                      name="full_name"
                      value={form.full_name}
                      onChange={handleChange}
                      disabled={loading}
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                      placeholder="Nama Lengkap"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                    Alamat Email
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      required
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      disabled={loading}
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                      placeholder="alamat@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                    Kata Sandi
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      required
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      disabled={loading}
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      placeholder="Minimal 6 karakter"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                    Konfirmasi Kata Sandi
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      required
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirm_password"
                      value={form.confirm_password}
                      onChange={handleChange}
                      disabled={loading}
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      placeholder="Ulangi kata sandi"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                      NIS (Otomatis)
                    </label>
                    <div className="relative">
                      <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" />
                      <input
                        readOnly
                        name="nis"
                        value={form.nis}
                        className="w-full pl-8 pr-3 py-2.5 bg-blue-50/60 border border-blue-200 text-blue-800 font-bold font-mono rounded-xl text-xs sm:text-sm outline-none cursor-not-allowed"
                        title="Nomor Induk Siswa dialokasikan otomatis dari nomor urut berikutnya"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                      Usia (Tahun)
                    </label>
                    <input
                      required
                      type="number"
                      name="age"
                      value={form.age}
                      onChange={handleChange}
                      disabled={loading}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                      placeholder="Contoh: 12"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                    Nama Orang Tua / Wali
                  </label>
                  <input
                    required
                    name="parent_name"
                    value={form.parent_name}
                    onChange={handleChange}
                    disabled={loading}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    placeholder="Nama orang tua/wali"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                    Nomor WhatsApp
                  </label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      required
                      name="phone_number"
                      value={form.phone_number}
                      onChange={handleChange}
                      disabled={loading}
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                      placeholder="08..."
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                    Alamat Rumah
                  </label>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-3 top-3 text-slate-400" />
                    <textarea
                      required
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      disabled={loading}
                      rows={2}
                      className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none font-medium"
                      placeholder="Alamat lengkap"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-[11px] text-slate-400 text-center sm:text-left">
                Akun akan diverifikasi secara manual oleh administrator klub.
              </p>
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 text-sm active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Memproses...
                  </>
                ) : (
                  "Daftar Sekarang"
                )}
              </button>
            </div>

            <div className="md:hidden text-center mt-3">
              <Link to="/login" className="text-xs text-blue-600 font-bold hover:underline">
                Sudah memiliki akun? Masuk di sini
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}