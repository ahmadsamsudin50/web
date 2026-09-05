import React, { useEffect, useState } from "react";
import { supabase } from "../../utils/supabaseClient";
import {
  Users,
  Layers,
  CalendarDays,
  Activity,
  TrendingUp,
  BarChart3,
  Loader2,
  HardDrive,
  Database,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";

export default function Dashboard() {
  const [stats, setStats] = useState({
    classes: 0,
    students: 0,
    activeSessions: 0,
    totalLogs: 0,
  });
  const [storageUsage, setStorageUsage] = useState({
    usedMb: 0,
    maxMb: 1024,
    percent: 0,
    fileCount: 0,
  });
  const [dbUsage, setDbUsage] = useState({
    usedMb: 0,
    maxMb: 500, // Kuota Free Tier Database Supabase (500 MB)
    percent: 0,
  });
  const [trendData, setTrendData] = useState([]);
  const [classDistData, setClassDistData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);

      // 1. Ambil Statistik Baris Data
      const { count: classCount } = await supabase
        .from("classes")
        .select("*", { count: "exact", head: true });

      const { count: studentCount } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true });

      const { count: sessionCount } = await supabase
        .from("sessions")
        .select("*", { count: "exact", head: true });

      const { count: logCount } = await supabase
        .from("attendance_logs")
        .select("*", { count: "exact", head: true });

      setStats({
        classes: classCount || 0,
        students: studentCount || 0,
        activeSessions: sessionCount || 0,
        totalLogs: logCount || 0,
      });

      // 2. Hitung Penggunaan Berkas Storage (Bucket: images)
      try {
        const folders = ["", "receipts", "coaches", "gallery"];
        let totalBytes = 0;
        let totalFiles = 0;

        await Promise.all(
          folders.map(async (folder) => {
            const { data, error } = await supabase.storage
              .from("images")
              .list(folder, { limit: 1000 });
            if (!error && data) {
              data.forEach((item) => {
                if (item.metadata?.size) {
                  totalBytes += item.metadata.size;
                  totalFiles += 1;
                }
              });
            }
          })
        );

        const usedMb = Number((totalBytes / (1024 * 1024)).toFixed(2));
        const maxMb = 1024;
        const percent = Math.min(Number(((usedMb / maxMb) * 100).toFixed(1)), 100);

        setStorageUsage({
          usedMb,
          maxMb,
          percent,
          fileCount: totalFiles,
        });
      } catch (_) {}

      // 3. Ambil Ukuran Database PostgreSQL melalui RPC
      try {
        const { data: dbBytes, error: dbError } = await supabase.rpc("get_db_size_bytes");
        if (!dbError && dbBytes) {
          const usedDbMb = Number((Number(dbBytes) / (1024 * 1024)).toFixed(2));
          const maxDbMb = 500;
          const percentDb = Math.min(Number(((usedDbMb / maxDbMb) * 100).toFixed(1)), 100);

          setDbUsage({
            usedMb: usedDbMb,
            maxMb: maxDbMb,
            percent: percentDb,
          });
        }
      } catch (_) {}

      // 4. Ambil Tren Kehadiran
      const { data: logs } = await supabase
        .from("attendance_logs")
        .select(`id, sessions(session_date)`);

      if (logs) {
        const trendMap = {};
        logs.forEach((log) => {
          const dateStr = log.sessions?.session_date;
          if (dateStr) {
            trendMap[dateStr] = (trendMap[dateStr] || 0) + 1;
          }
        });

        const formattedTrend = Object.keys(trendMap)
          .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
          .slice(-7)
          .map((date) => ({
            date: new Date(date).toLocaleDateString("id-ID", {
              month: "short",
              day: "numeric",
            }),
            Kehadiran: trendMap[date],
          }));

        setTrendData(formattedTrend);
      }

      // 5. Ambil Distribusi Atlet per Kelas
      const { data: enrollmentsData } = await supabase
        .from("student_enrollments")
        .select(`classes(name)`)
        .eq("status", "active");

      if (enrollmentsData) {
        const distMap = {};
        enrollmentsData.forEach((enr) => {
          const className = enr.classes?.name || "Belum Ditentukan";
          distMap[className] = (distMap[className] || 0) + 1;
        });

        const formattedDist = Object.keys(distMap)
          .map((key) => ({
            name: key,
            Atlet: distMap[key],
          }))
          .sort((a, b) => b.Atlet - a.Atlet);

        setClassDistData(formattedDist);
      }

      setLoading(false);
    };

    fetchDashboardData();
  }, []);

  const StatCard = ({ title, value, icon, colorClass, bgClass }) => (
    <div className="bg-white p-6 rounded-3xl shadow-xl shadow-blue-900/5 border border-slate-100 flex items-center gap-5 hover:-translate-y-1 transition-transform duration-300">
      <div
        className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${bgClass} ${colorClass}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">
          {title}
        </p>
        <h3 className="text-3xl font-black text-slate-800">{value}</h3>
      </div>
    </div>
  );

  const COLORS = ["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe"];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center font-sans">
        <Loader2 size={40} className="text-blue-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium animate-pulse">
          Menganalisis metrik dasbor...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Gambaran Umum
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Statistik langsung dan metrik performa klub renang.
        </p>
      </div>

      {/* Baris 1: Statistik Operasional */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-5">
        <StatCard
          title="Total Atlet"
          value={stats.students}
          icon={<Users size={22} />}
          colorClass="text-blue-600"
          bgClass="bg-blue-50"
        />
        <StatCard
          title="Total Kelas"
          value={stats.classes}
          icon={<Layers size={22} />}
          colorClass="text-indigo-600"
          bgClass="bg-indigo-50"
        />
        <StatCard
          title="Sesi Latihan"
          value={stats.activeSessions}
          icon={<CalendarDays size={22} />}
          colorClass="text-emerald-600"
          bgClass="bg-emerald-50"
        />
        <StatCard
          title="Total Pindai"
          value={stats.totalLogs}
          icon={<Activity size={22} />}
          colorClass="text-amber-600"
          bgClass="bg-amber-50"
        />
      </div>

      {/* Baris 2: Pemantauan Storage & Database */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
        {/* Kartu Storage Berkas */}
        <div className="bg-white p-6 rounded-3xl shadow-xl shadow-blue-900/5 border border-slate-100 flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
              Storage File (Supabase Bucket)
            </span>
            <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
              <HardDrive size={18} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <h3 className="text-2xl font-black text-slate-800">
                {storageUsage.usedMb} <span className="text-xs text-slate-400 font-bold">MB</span>
              </h3>
              <span className="text-xs font-bold text-slate-400">
                / {storageUsage.maxMb} MB (1 GB)
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-1.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  storageUsage.percent > 85
                    ? "bg-rose-500"
                    : storageUsage.percent > 60
                    ? "bg-amber-500"
                    : "bg-cyan-500"
                }`}
                style={{ width: `${Math.max(storageUsage.percent, 2)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 font-semibold">
              {storageUsage.percent}% terpakai ({storageUsage.fileCount} total file gambar/bukti)
            </p>
          </div>
        </div>

        {/* Kartu Kapasitas Database */}
        <div className="bg-white p-6 rounded-3xl shadow-xl shadow-blue-900/5 border border-slate-100 flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
              Penyimpanan Database (PostgreSQL)
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Database size={18} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <h3 className="text-2xl font-black text-slate-800">
                {dbUsage.usedMb} <span className="text-xs text-slate-400 font-bold">MB</span>
              </h3>
              <span className="text-xs font-bold text-slate-400">
                / {dbUsage.maxMb} MB
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-1.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  dbUsage.percent > 85
                    ? "bg-rose-500"
                    : dbUsage.percent > 60
                    ? "bg-amber-500"
                    : "bg-indigo-600"
                }`}
                style={{ width: `${Math.max(dbUsage.percent, 2)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 font-semibold">
              {dbUsage.percent}% terpakai dari kuota free tier Supabase
            </p>
          </div>
        </div>
      </div>

      {/* Bagian Grafik Analitik */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl shadow-blue-900/5 border border-slate-100 flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Tren Kehadiran
              </h2>
              <p className="text-xs font-medium text-slate-400 mt-0.5">
                Jumlah presensi pada 7 sesi terakhir
              </p>
            </div>
            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="flex-1 w-full mt-4">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={trendData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="colorAttendance"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "16px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                    }}
                    cursor={{
                      stroke: "#cbd5e1",
                      strokeWidth: 1,
                      strokeDasharray: "4 4",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Kehadiran"
                    stroke="#2563eb"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorAttendance)"
                    activeDot={{ r: 6, strokeWidth: 0, fill: "#2563eb" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                Belum ada data kehadiran yang tercatat.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl shadow-blue-900/5 border border-slate-100 flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Distribusi Atlet
              </h2>
              <p className="text-xs font-medium text-slate-400 mt-0.5">
                Jumlah atlet terdaftar per kelompok kelas aktif
              </p>
            </div>
            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
              <BarChart3 size={20} />
            </div>
          </div>
          <div className="flex-1 w-full mt-4">
            {classDistData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={classDistData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ fill: "#f8fafc" }}
                    contentStyle={{
                      borderRadius: "16px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Bar dataKey="Atlet" radius={[6, 6, 0, 0]} maxBarSize={50}>
                    {classDistData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                Belum ada data pendaftaran kelas yang aktif.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}