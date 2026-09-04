import React, { useEffect, useState, useRef, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "../../utils/supabaseClient";
import { toast, Toaster } from "react-hot-toast";
import {
  ScanLine,
  Video,
  CheckCircle2,
  XCircle,
  CalendarDays,
  Camera,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

function useAudioFeedback() {
  const audioCtx = useRef(null);
  const getCtx = useCallback(() => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.current.state === "suspended") {
      audioCtx.current.resume();
    }
    return audioCtx.current;
  }, []);

  const playSuccess = useCallback(() => {
    try {
      const ctx = getCtx();
      [0, 0.18].forEach((startOffset, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(i === 0 ? 880 : 1100, ctx.currentTime + startOffset);
        gain.gain.setValueAtTime(0.35, ctx.currentTime + startOffset);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startOffset + 0.25);
        osc.start(ctx.currentTime + startOffset);
        osc.stop(ctx.currentTime + startOffset + 0.25);
      });
    } catch (_) {}
  }, [getCtx]);

  const playError = useCallback(() => {
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch (_) {}
  }, [getCtx]);

  return { playSuccess, playError };
}

function useHapticFeedback() {
  const vibrate = useCallback((pattern) => {
    if ("vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);
  const successVibrate = useCallback(() => vibrate([80, 60, 120]), [vibrate]);
  const errorVibrate = useCallback(() => vibrate([300, 100, 300]), [vibrate]);
  return { successVibrate, errorVibrate };
}

export default function ScanQR() {
  const [activeSessions, setActiveSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [scanStatus, setScanStatus] = useState({ type: "idle", message: "" });
  const [cameraError, setCameraError] = useState("");
  const [isCameraStarting, setIsCameraStarting] = useState(false);

  const html5QrCodeRef = useRef(null);
  const isProcessingRef = useRef(false);
  const activeSessionsRef = useRef([]);

  const { playSuccess, playError } = useAudioFeedback();
  const { successVibrate, errorVibrate } = useHapticFeedback();

  useEffect(() => {
    activeSessionsRef.current = activeSessions;
  }, [activeSessions]);

  useEffect(() => {
    const fetchActiveSessions = async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) toast.error("Gagal memuat daftar gerbang aktif.");
      else if (data) setActiveSessions(data);
    };
    fetchActiveSessions();
  }, []);

  const handleBarcodeDecoded = async (decodedText) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    setScanStatus({ type: "info", message: "Memverifikasi Kode QR..." });

    try {
      // 1. Identifikasi data atlet melalui token QR
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("id, users(full_name)")
        .eq("qr_token", decodedText)
        .single();

      if (studentError || !student) throw new Error("Kode QR tidak valid atau belum terdaftar.");

      // 2. Cegah duplikasi absensi pada sesi yang sama
      const { data: existingLog } = await supabase
        .from("attendance_logs")
        .select("id")
        .eq("session_id", selectedSession)
        .eq("student_id", student.id)
        .maybeSingle();

      if (existingLog) {
        throw new Error(`${student.users?.full_name || "Atlet"} sudah melakukan presensi di sesi ini.`);
      }

      // 3. Verifikasi konfigurasi kelas sesi yang dipilih
      const sessionObj = activeSessionsRef.current.find((s) => s.id === selectedSession);
      if (!sessionObj || !sessionObj.class_ids || sessionObj.class_ids.length === 0) {
        throw new Error("Konfigurasi sesi tidak valid (kelas latihan belum ditentukan).");
      }

      // 4. Periksa apakah atlet memiliki pendaftaran yang berstatus 'active' pada kelas sesi ini
      const { data: enrollments, error: enrollError } = await supabase
        .from("student_enrollments")
        .select("id, class_id, status, classes(name, max_sessions)")
        .eq("student_id", student.id)
        .eq("status", "active")
        .in("class_id", sessionObj.class_ids)
        .limit(1);

      if (enrollError || !enrollments || enrollments.length === 0) {
        // Cek apakah sebenarnya pernah terdaftar tetapi statusnya sudah selesai (completed)
        const { data: completedEnrollment } = await supabase
          .from("student_enrollments")
          .select("id, classes(name)")
          .eq("student_id", student.id)
          .eq("status", "completed")
          .in("class_id", sessionObj.class_ids)
          .limit(1);

        if (completedEnrollment && completedEnrollment.length > 0) {
          throw new Error(`Masa latihan ${completedEnrollment[0].classes?.name || "kelas ini"} sudah selesai. Harap daftar ulang.`);
        }

        throw new Error("Atlet tidak terdaftar aktif pada kelas di sesi latihan ini.");
      }

      const activeEnrollment = enrollments[0];

      // 5. Masukkan catatan absensi dengan menyertakan enrollment_id kelas terkait
      const { error: logError } = await supabase
        .from("attendance_logs")
        .insert([
          {
            session_id: selectedSession,
            student_id: student.id,
            status: "hadir_qr",
            enrollment_id: activeEnrollment.id,
          },
        ]);

      if (logError) throw logError;

      // 6. Hitung akumulasi kehadiran khusus untuk enrollment kelas ini
      const { count: attendCount } = await supabase
        .from("attendance_logs")
        .select("*", { count: "exact", head: true })
        .eq("enrollment_id", activeEnrollment.id)
        .in("status", ["hadir_qr", "hadir_manual"]);

      const currentTotal = attendCount || 1;
      const maxSessions = activeEnrollment.classes?.max_sessions || 12;
      let isCompleted = false;

      // Jika jumlah kehadiran mencapai atau melampaui batas maksimal, tandai pendaftaran kelas ini menjadi 'completed'
      if (currentTotal >= maxSessions) {
        await supabase
          .from("student_enrollments")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", activeEnrollment.id);
        isCompleted = true;
      }

      playSuccess();
      successVibrate();

      const message = isCompleted
        ? `${student.users?.full_name} (${activeEnrollment.classes?.name}): Selesai ${currentTotal}/${maxSessions} sesi!`
        : `${student.users?.full_name} (${activeEnrollment.classes?.name}): ${currentTotal}/${maxSessions} Sesi`;

      setScanStatus({ type: "success", message });
    } catch (err) {
      playError();
      errorVibrate();
      setScanStatus({ type: "error", message: err.message });
    } finally {
      setTimeout(() => {
        setScanStatus({ type: "idle", message: "" });
        isProcessingRef.current = false;
      }, 2500);
    }
  };

  useEffect(() => {
    let isSubscribed = true;

    const stopCamera = async () => {
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            await html5QrCodeRef.current.stop();
          }
          await html5QrCodeRef.current.clear();
        } catch (_) {}
        html5QrCodeRef.current = null;
      }
    };

    if (!selectedSession) {
      stopCamera();
      setCameraError("");
      return;
    }

    const startCamera = async () => {
      await stopCamera();
      if (!isSubscribed) return;

      setCameraError("");
      setIsCameraStarting(true);

      const targetEl = document.getElementById("reader");
      if (!targetEl) {
        setIsCameraStarting(false);
        return;
      }

      try {
        const qrCodeInstance = new Html5Qrcode("reader");
        html5QrCodeRef.current = qrCodeInstance;

        const config = {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const edgeSize = Math.floor(minEdge * 0.7);
            return { width: edgeSize, height: edgeSize };
          },
          aspectRatio: 1.0,
        };

        // facingMode: "environment" mengarahkan kamera ke kamera belakang pada perangkat seluler
        await qrCodeInstance.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            handleBarcodeDecoded(decodedText);
          },
          () => {}
        );

        if (isSubscribed) {
          setIsCameraStarting(false);
        }
      } catch (err) {
        if (!isSubscribed) return;
        setIsCameraStarting(false);
        const errMsg = err?.message || String(err);
        if (errMsg.includes("NotAllowedError") || errMsg.includes("Permission denied")) {
          setCameraError("Izin kamera ditolak. Silakan aktifkan izin kamera pada peramban Anda.");
        } else if (errMsg.includes("NotFoundError") || errMsg.includes("DevicesNotFoundError")) {
          setCameraError("Kamera tidak terdeteksi pada perangkat ini.");
        } else {
          setCameraError("Gagal mengakses kamera: " + errMsg);
        }
      }
    };

    const timer = setTimeout(() => {
      startCamera();
    }, 200);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
      stopCamera();
    };
  }, [selectedSession]);

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <ScanLine className="text-blue-600" size={28} />
          Pemindai Presensi QR
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Pindai kartu identitas digital atlet untuk mencatat kehadiran latihan secara langsung.
        </p>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <CalendarDays size={16} /> Pilih Gerbang Latihan
            </h2>
            <select
              value={selectedSession}
              onChange={(e) => {
                setSelectedSession(e.target.value);
                setScanStatus({ type: "idle", message: "" });
              }}
              className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="">-- Pilih Sesi Aktif --</option>
              {activeSessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {activeSessions.length === 0 && (
              <p className="text-xs text-amber-600 mt-2 font-medium">
                Tidak ada sesi aktif. Buka sesi terlebih dahulu di menu <b>Sesi Latihan</b>.
              </p>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              Status Pemindai
            </h2>
            {selectedSession ? (
              cameraError ? (
                <div className="flex items-center gap-2.5 text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200 text-xs font-bold">
                  <AlertTriangle size={16} className="shrink-0" />
                  Kamera Bermasalah
                </div>
              ) : isCameraStarting ? (
                <div className="flex items-center gap-2.5 text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs font-bold">
                  <RefreshCw size={14} className="animate-spin" />
                  Menghubungkan Kamera...
                </div>
              ) : (
                <div className="flex items-center gap-2.5 text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-xs font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                  Kamera Aktif & Siap Memindai
                </div>
              )
            ) : (
              <div className="flex items-center gap-2 text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                Kamera Tidak Aktif
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm min-h-[440px] flex flex-col items-center justify-center relative overflow-hidden">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest self-start mb-4 flex items-center gap-2">
              <Camera size={16} /> Jendela Kamera
            </h2>

            {selectedSession ? (
              <div className="w-full flex flex-col items-center">
                {scanStatus.type !== "idle" && (
                  <div className={`mb-4 px-4 py-3 rounded-xl flex items-center gap-3 w-full max-w-sm text-xs font-bold text-white shadow-md animate-in fade-in zoom-in-95 ${
                    scanStatus.type === "success" ? "bg-emerald-600" : scanStatus.type === "error" ? "bg-rose-600" : "bg-blue-600"
                  }`}>
                    {scanStatus.type === "success" && <CheckCircle2 size={20} className="shrink-0" />}
                    {scanStatus.type === "error" && <XCircle size={20} className="shrink-0" />}
                    {scanStatus.type === "info" && <ScanLine size={20} className="animate-pulse shrink-0" />}
                    <span className="truncate flex-1">{scanStatus.message}</span>
                  </div>
                )}

                {cameraError ? (
                  <div className="p-6 max-w-sm text-center bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 space-y-2">
                    <AlertTriangle size={32} className="mx-auto text-rose-500" />
                    <p className="font-bold text-sm">Gagal Mengakses Kamera</p>
                    <p className="text-xs text-rose-600 leading-relaxed">{cameraError}</p>
                    <p className="text-[11px] text-slate-500 pt-2">
                      Pastikan situs diakses melalui protokol <b>HTTPS</b> atau <b>localhost</b> dan perizinan kamera sudah diizinkan.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="w-full max-w-xs sm:max-w-sm rounded-2xl overflow-hidden border-4 border-slate-100 shadow-inner bg-black relative">
                      <div id="reader" className="w-full"></div>
                      {isCameraStarting && (
                        <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center text-white gap-2">
                          <RefreshCw size={24} className="animate-spin text-blue-400" />
                          <span className="text-xs font-medium">Menyalakan kamera...</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-4 text-center">
                      Arahkan kamera ke Kode QR pada Kartu Digital atlet.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center text-slate-400 py-12">
                <Video size={40} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-bold text-slate-600">Gerbang Belum Dipilih</p>
                <p className="text-xs mt-1">Pilih sesi aktif di panel kiri untuk menyalakan kamera.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}