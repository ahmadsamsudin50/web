import React, { useEffect, useState } from "react";
import { ArrowRight, Sparkles, Trophy, Database, Images } from "lucide-react";
import { supabase } from "../../utils/supabaseClient";

export default function AboutUs() {
  const [aboutData, setAboutData] = useState({
    title: "Tentang Siripbiru",
    subtitle: "Memuat informasi klub...",
  });
  const [gallery, setGallery] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: settings } = await supabase
        .from("landing_settings")
        .select("*")
        .eq("section", "about")
        .single();

      const { data: images } = await supabase
        .from("landing_gallery")
        .select("*")
        .order("sort_order", { ascending: true });

      if (settings) setAboutData(settings);
      if (images) setGallery(images);
    };
    fetchData();
  }, []);

  const titleWords = (aboutData.title || "Tentang Kami").split(" ");
  const firstWord = titleWords[0];
  const restWords = titleWords.slice(1).join(" ");

  return (
    <>
      {/* ===== TENTANG KAMI ===== */}
      <section id="about" className="py-24 lg:py-32 px-6 bg-white font-sans relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Visual Ilustrasi & Foto (Kiri) */}
            <div className="relative w-full min-h-[460px] sm:min-h-[520px] order-2 lg:order-1">
              <div className="absolute top-10 left-6 w-[72%] h-[320px] bg-gradient-to-br from-cyan-400 to-blue-600 rounded-[2.5rem] opacity-20 -rotate-3 transition-transform duration-500 hover:rotate-0"></div>
              
              <div className="absolute top-0 right-0 w-[84%] h-[340px] rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white bg-slate-100">
                <img
                  src={
                    gallery.length > 0
                      ? gallery[0].image_url
                      : "https://images.unsplash.com/photo-1519315901367-f34ff9154487?q=80&w=2070&auto=format&fit=crop"
                  }
                  alt={gallery.length > 0 ? gallery[0].alt_text : "Latihan renang"}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                />
              </div>

              <div className="absolute bottom-0 left-0 w-[62%] h-[240px] rounded-[2rem] overflow-hidden border-8 border-white shadow-2xl bg-slate-100 z-10">
                <img
                  src={
                    gallery.length > 1
                      ? gallery[1].image_url
                      : "https://images.unsplash.com/photo-1530549387789-4c1017266635?q=80&w=2070&auto=format&fit=crop"
                  }
                  alt={gallery.length > 1 ? gallery[1].alt_text : "Atlet renang"}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                />
              </div>
            </div>

            {/* Rincian Konten (Kanan) */}
            <div className="order-1 lg:order-2">
              <span className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 bg-blue-50 border border-blue-100 px-4 py-1.5 rounded-full inline-flex items-center gap-2 mb-4">
                <Sparkles size={13} className="text-blue-600" /> Mengenal Siripbiru
              </span>

              <h3 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-6">
                {firstWord} <span className="text-blue-600">{restWords}</span>
              </h3>

              <p className="text-slate-600 text-sm md:text-base leading-relaxed font-normal mb-8 whitespace-pre-wrap">
                {aboutData.subtitle}
              </p>

              <div className="space-y-4 mb-10">
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Trophy size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      Prestasi & Kurikulum Terukur
                    </h4>
                    <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">
                      Pendekatan teknis terstruktur yang disesuaikan dengan jenjang usia untuk mengasah daya tahan dan kecepatan atlet.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Database size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      Sistem Absensi & Data Digital
                    </h4>
                    <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">
                      Pemantauan kuota sesi kehadiran latihan melalui kartu identitas QR pintar yang terintegrasi langsung ke sistem klub.
                    </p>
                  </div>
                </div>
              </div>

              <a
                href="#course"
                className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-slate-900 hover:bg-black text-white rounded-full text-xs font-bold tracking-wider uppercase transition-all duration-300 shadow-lg shadow-slate-900/10 active:scale-95"
              >
                Jelajahi Program <ArrowRight size={15} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ===== GALERI KEGIATAN ===== */}
      <section id="gallery" className="py-20 lg:py-28 px-6 bg-slate-50 border-t border-slate-200 font-sans">
        <div className="max-w-7xl mx-auto">
          {/* Header Galeri */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <span className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 bg-white border border-slate-200 px-4 py-1.5 rounded-full inline-flex items-center gap-2 mb-3 shadow-sm">
                <Images size={13} className="text-blue-600" /> Rekaman Momen
              </span>
              <h3 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                Galeri <span className="text-blue-600">Kegiatan Klub</span>
              </h3>
            </div>
            <p className="text-slate-500 text-xs md:text-sm max-w-md font-medium">
              
            </p>
          </div>

          {/* Grid Galeri */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 h-[440px] md:h-[480px]">
            {gallery.length >= 4 ? (
              <>
                <div className="relative col-span-2 row-span-2 rounded-3xl overflow-hidden group shadow-md border border-slate-200/80 bg-slate-200">
                  <img
                    src={gallery[0].image_url}
                    alt={gallery[0].alt_text || "Momen latihan"}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-5">
                    <p className="text-white text-xs font-bold truncate">
                      {gallery[0].alt_text || "Aktivitas Latihan Siripbiru"}
                    </p>
                  </div>
                </div>

                <div className="relative col-span-1 row-span-1 rounded-3xl overflow-hidden group shadow-md border border-slate-200/80 bg-slate-200">
                  <img
                    src={gallery[1].image_url}
                    alt={gallery[1].alt_text || "Momen latihan"}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                    <p className="text-white text-xs font-bold truncate">
                      {gallery[1].alt_text || "Pembinaan Teknik"}
                    </p>
                  </div>
                </div>

                <div className="relative col-span-1 row-span-1 rounded-3xl overflow-hidden group shadow-md border border-slate-200/80 bg-slate-200">
                  <img
                    src={gallery[2].image_url}
                    alt={gallery[2].alt_text || "Momen latihan"}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                    <p className="text-white text-xs font-bold truncate">
                      {gallery[2].alt_text || "Latihan Bersama"}
                    </p>
                  </div>
                </div>

                <div className="relative col-span-2 row-span-1 rounded-3xl overflow-hidden group shadow-md border border-slate-200/80 bg-slate-200">
                  <img
                    src={gallery[3].image_url}
                    alt={gallery[3].alt_text || "Momen latihan"}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-5">
                    <p className="text-white text-xs font-bold truncate">
                      {gallery[3].alt_text || "Semangat Juara"}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="col-span-2 md:col-span-4 h-full flex flex-col items-center justify-center text-slate-400 bg-white border border-slate-200 rounded-3xl p-8">
                <Images size={36} className="text-slate-300 mb-2" />
                <p className="font-bold text-slate-600 text-sm">Foto Galeri Belum Lengkap</p>
                <p className="text-xs text-slate-400 mt-1">Tambahkan minimal 4 foto melalui menu Manajer Halaman Depan di panel admin.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}