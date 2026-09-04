import React, { useState, useEffect, useCallback } from "react";
import { Quote, ChevronLeft, ChevronRight, Star, Sparkles } from "lucide-react";
import { supabase } from "../../utils/supabaseClient";

export default function Testimonials() {
  const [reviews, setReviews] = useState([]);
  const [current, setCurrent] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const fetchReviews = async () => {
      const { data } = await supabase
        .from("landing_testimonials")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (data) setReviews(data);
    };
    fetchReviews();
  }, []);

  const goTo = useCallback(
    (index) => {
      if (isAnimating || reviews.length === 0) return;
      setIsAnimating(true);
      setTimeout(() => {
        setCurrent((index + reviews.length) % reviews.length);
        setIsAnimating(false);
      }, 250);
    },
    [isAnimating, reviews.length],
  );

  const prev = () => goTo(current - 1);
  const next = () => goTo(current + 1);

  // Otomatis berputar tiap 5.5 detik
  useEffect(() => {
    if (reviews.length <= 1) return;
    const timer = setInterval(() => goTo(current + 1), 5500);
    return () => clearInterval(timer);
  }, [current, goTo, reviews.length]);

  if (reviews.length === 0) return null;

  return (
    <section
      id="testimonials"
      className="py-24 lg:py-32 px-6 bg-[#0a192f] relative overflow-hidden font-sans border-t border-slate-800"
    >
      {/* Efek Latar Ambient */}
      <div className="absolute -right-16 top-10 w-96 h-96 bg-blue-600/15 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute -left-16 bottom-10 w-96 h-96 bg-cyan-500/15 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute right-10 top-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
        <Quote size={380} className="text-white" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Bagian Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 lg:mb-20">
          <span className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300 bg-cyan-950/80 border border-cyan-500/30 px-4 py-1.5 rounded-full inline-flex items-center gap-2 mb-4 shadow-sm">
            <Sparkles size={13} className="text-cyan-400" /> Pengalaman Atlet & Orang Tua
          </span>
          <h3 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
            Cerita <span className="text-cyan-400">Keberhasilan</span> Mereka
          </h3>
          <p className="text-slate-400 text-sm md:text-base mt-3 font-medium leading-relaxed">
            Apresiasi dan pengalaman langsung dari para atlet serta orang tua yang telah berlatih bersama Siripbiru Swim Club.
          </p>
        </div>

        <div className="relative">
          <div
            className={`transition-all duration-300 ease-in-out ${
              isAnimating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
            }`}
          >
            {/* Tampilan Desktop (Menampilkan hingga 3 kartu berdampingan) */}
            <div className="hidden md:grid md:grid-cols-3 gap-6 items-stretch">
              {[0, 1, 2].map((offset) => {
                if (reviews.length === 0) return null;
                const index = (current + offset) % reviews.length;
                const r = reviews[index];
                const isHighlight = offset === 0;

                return (
                  <div
                    key={index}
                    className={`rounded-[2.5rem] p-8 flex flex-col justify-between transition-all duration-300 group ${
                      isHighlight
                        ? "bg-gradient-to-b from-blue-900/50 to-[#0d223f] border-2 border-cyan-400/80 shadow-2xl shadow-cyan-500/10 scale-[1.02]"
                        : "bg-white/[0.03] hover:bg-white/[0.06] border border-white/10"
                    }`}
                  >
                    <div>
                      {/* Bintang & Ikon Kutipan */}
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex gap-1 text-amber-400">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={14} fill="currentColor" />
                          ))}
                        </div>
                        <Quote
                          size={28}
                          className={`transition-colors ${
                            isHighlight ? "text-cyan-400" : "text-white/20"
                          }`}
                        />
                      </div>

                      <p className="text-slate-200 leading-relaxed font-normal text-sm mb-8 italic">
                        "{r.text}"
                      </p>
                    </div>

                    {/* Identitas Pemberi Ulasan */}
                    <div className="pt-5 border-t border-white/10 flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-600 text-slate-950 font-black text-sm flex items-center justify-center shrink-0 shadow-md">
                        {r.name?.[0]?.toUpperCase() || "A"}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                          {r.name}
                        </h4>
                        <p className="text-cyan-400 text-[10px] uppercase tracking-wider font-bold truncate mt-0.5">
                          {r.role}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tampilan Seluler / Mobile (1 Kartu Fokus) */}
            <div className="md:hidden">
              <div className="rounded-[2rem] p-7 bg-gradient-to-b from-blue-900/60 to-[#0d223f] border-2 border-cyan-400/80 shadow-xl">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex gap-1 text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={13} fill="currentColor" />
                    ))}
                  </div>
                  <Quote size={24} className="text-cyan-400" />
                </div>

                <p className="text-slate-200 leading-relaxed text-xs italic mb-6">
                  "{reviews[current]?.text}"
                </p>

                <div className="pt-4 border-t border-white/10 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-400 to-blue-600 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                    {reviews[current]?.name?.[0]?.toUpperCase() || "A"}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white truncate">
                      {reviews[current]?.name}
                    </h4>
                    <p className="text-cyan-400 text-[10px] uppercase tracking-wider font-bold truncate mt-0.5">
                      {reviews[current]?.role}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Kontrol Navigasi & Indikator Titik */}
          <div className="flex items-center justify-between mt-10 px-2">
            <div className="flex items-center gap-2">
              {reviews.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`transition-all duration-300 rounded-full ${
                    i === current
                      ? "w-8 h-2 bg-cyan-400 shadow-sm shadow-cyan-400/50"
                      : "w-2 h-2 bg-white/20 hover:bg-white/40"
                  }`}
                  aria-label={`Buka ulasan ke-${i + 1}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={prev}
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/15 text-slate-300 hover:text-white hover:bg-white/10 hover:border-cyan-400/50 flex items-center justify-center transition-all active:scale-95"
                aria-label="Ulasan sebelumnya"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={next}
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/15 text-slate-300 hover:text-white hover:bg-white/10 hover:border-cyan-400/50 flex items-center justify-center transition-all active:scale-95"
                aria-label="Ulasan berikutnya"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}