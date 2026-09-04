import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../../utils/supabaseClient";
import { ChevronLeft, ChevronRight, Award, User, MapPin } from "lucide-react";

// ===== ICON COMPONENTS =====
const InstagramIcon = ({ size = 15 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const TwitterIcon = ({ size = 15 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
);

const LinkedinIcon = ({ size = 15 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" rx="1" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

// ===== COACH CARD COMPONENT =====
function CoachCard({ c, isTouch }) {
  const [flipped, setFlipped] = useState(false);
  const imgRef = useRef(null);
  const [imgSrc, setImgSrc] = useState("");

  useEffect(() => {
    if (!imgRef.current) return;
    const el = imgRef.current;
    if (el.getAttribute("data-src") && "IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImgSrc(el.getAttribute("data-src"));
            io.unobserve(el);
          }
        });
      });
      io.observe(el);
      return () => io.disconnect();
    }
    setImgSrc(el.getAttribute("data-src") || el.src);
  }, []);

  const handleToggle = () => setFlipped((v) => !v);

  return (
    <div className="w-full h-full flex flex-col justify-between group/card select-none">
      <div className={`flip-card w-full aspect-[4/5] rounded-[2rem] overflow-hidden mb-5 ${flipped ? "is-flipped" : ""}`}>
        <div className="flip-card-inner">
          {/* SISI DEPAN */}
          <div
            className="flip-card-front rounded-[2rem] overflow-hidden cursor-pointer shadow-lg shadow-slate-900/5 group"
            onClick={handleToggle}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleToggle();
            }}
            role="button"
            tabIndex={0}
            aria-label={`Lihat detail profil ${c.name}`}
          >
            <div className="relative w-full h-full bg-slate-900 overflow-hidden">
              <img
                ref={imgRef}
                data-src={c.photo}
                src={imgSrc || ""}
                alt={c.name}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A192F] via-[#0A192F]/40 to-transparent"></div>

              {/* Tag Atas */}
              <div className="absolute top-4 right-4 z-20">
                <span className="px-3 py-1 bg-white/15 backdrop-blur-md border border-white/20 text-cyan-300 text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm">
                  {c.role}
                </span>
              </div>

              {isTouch && (
                <div className="absolute top-4 left-4 z-20 bg-black/40 backdrop-blur-sm text-white/80 text-[10px] px-2.5 py-1 rounded-full font-medium">
                  Sentuh untuk info
                </div>
              )}

              {/* Informasi Bawah */}
              <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
                <p className="text-[11px] font-bold text-cyan-400 tracking-wider uppercase mb-1">
                  {c.speciality}
                </p>
                <h4 className="text-2xl font-bold text-white tracking-tight">
                  {c.name}
                </h4>
                <p className="text-xs text-slate-300 mt-0.5 font-medium">
                  Panggilan: {c.nickname}
                </p>
              </div>
            </div>
          </div>

          {/* SISI BELAKANG */}
          <div
            className="flip-card-back bg-[#0A192F] text-white rounded-[2rem] p-6 sm:p-7 flex flex-col justify-between border-2 border-cyan-400/40 shadow-xl cursor-pointer"
            onClick={handleToggle}
            role="button"
            tabIndex={0}
          >
            <div>
              <div className="flex items-center gap-3.5 mb-5">
                <div className="w-13 h-13 rounded-2xl overflow-hidden border-2 border-cyan-400/60 shrink-0 shadow-md">
                  <img
                    src={c.photo}
                    alt={c.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h4 className="text-base font-bold text-white truncate">
                    {c.name}
                  </h4>
                  <p className="text-cyan-400 text-[10px] uppercase tracking-widest font-black truncate">
                    {c.role}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-white/5 rounded-2xl p-3 border border-white/10 mb-4 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Usia</span>
                  <span className="font-bold text-white">{c.age} Th</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Asal</span>
                  <span className="font-bold text-white truncate block">{c.nationality}</span>
                </div>
              </div>

              <div className="mb-3">
                <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider block mb-1.5 flex items-center gap-1">
                  <Award size={13} /> Prestasi & Lisensi
                </span>
                <ul className="space-y-1.5 max-h-28 overflow-y-auto pr-1 custom-scrollbar">
                  {c.achievements.map((a, j) => (
                    <li key={j} className="text-[11px] text-slate-300 flex items-start gap-1.5 leading-snug">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0"></span>
                      <span>{a}</span>
                    </li>
                  ))}
                  {c.achievements.length === 0 && (
                    <li className="text-[11px] text-slate-400 italic">Belum ada daftar prestasi.</li>
                  )}
                </ul>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-slate-400 text-[11px]">
              <span>Klik kartu untuk membalik</span>
              <div className="flex items-center gap-3 text-slate-300">
                <a href="#" onClick={(e) => e.stopPropagation()} className="hover:text-cyan-400 transition-colors">
                  <InstagramIcon />
                </a>
                <a href="#" onClick={(e) => e.stopPropagation()} className="hover:text-cyan-400 transition-colors">
                  <TwitterIcon />
                </a>
                <a href="#" onClick={(e) => e.stopPropagation()} className="hover:text-cyan-400 transition-colors">
                  <LinkedinIcon />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rincian Teks Bawah */}
      <div className="px-1">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[10px] font-bold text-cyan-600 uppercase tracking-widest">
            {c.role}
          </span>
          <span className="text-[11px] font-semibold text-slate-400">
            {c.speciality}
          </span>
        </div>
        <h4 className="text-xl font-bold text-slate-900 mb-1.5 tracking-tight group-hover/card:text-blue-600 transition-colors">
          {c.name}
        </h4>
        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-normal">
          {c.exp}
        </p>
      </div>
    </div>
  );
}

// ===== MAIN COMPONENT =====
export default function Coach() {
  const [coaches, setCoaches] = useState([]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(3);
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const containerRef = useRef(null);
  const autoplayRef = useRef(null);
  const touchStartX = useRef(null);
  const resizeTimeout = useRef(null);

  useEffect(() => {
    const fetchCoaches = async () => {
      const { data, error } = await supabase
        .from("coaches")
        .select(
          `
          id,
          specialty,
          nickname,
          role_title,
          experience_desc,
          age,
          nationality,
          achievements,
          photo_url,
          users ( full_name )
        `,
        )
        .eq("show_on_landing", true)
        .order("created_at", { ascending: true });

      if (data && !error) {
        const formattedCoaches = data.map((c) => ({
          id: c.id,
          name: c.users?.full_name || "Instruktur",
          nickname: c.nickname || "Coach",
          role: c.role_title || "Pelatih",
          exp: c.experience_desc || "Pelatih renang profesional klub Siripbiru.",
          age: c.age || "-",
          nationality: c.nationality || "Indonesia",
          speciality: c.specialty || "Berenang Umum",
          achievements: Array.isArray(c.achievements) ? c.achievements : [],
          photo:
            c.photo_url ||
            "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1470&auto=format&fit=crop",
        }));
        setCoaches(formattedCoaches);
      }
    };

    fetchCoaches();
  }, []);

  useEffect(() => {
    const touch =
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia("(hover: none)").matches;
    setIsTouchDevice(Boolean(touch));

    const calc = () => {
      const w = window.innerWidth;
      const v = w >= 1024 ? 3 : w >= 640 ? 2 : 1;
      setVisible(v);
    };

    const onResize = () => {
      clearTimeout(resizeTimeout.current);
      resizeTimeout.current = setTimeout(calc, 150);
    };
    calc();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(resizeTimeout.current);
    };
  }, []);

  const n = coaches.length;
  const clones = visible;
  const displayed =
    n > 0 ? [...coaches.slice(-clones), ...coaches, ...coaches.slice(0, clones)] : [];

  useEffect(() => {
    setIndex(clones);
  }, [visible, n]);

  const getSlideWidth = () => {
    if (!containerRef.current) return 0;
    return containerRef.current.clientWidth / visible;
  };

  const translateX = () => `translateX(${-(index * getSlideWidth())}px)`;

  useEffect(() => {
    if (isPaused || n === 0) return;
    autoplayRef.current = setInterval(() => setIndex((i) => i + 1), 4500);
    return () => clearInterval(autoplayRef.current);
  }, [isPaused, n]);

  const pauseAndResume = (timeout = 4000) => {
    setIsPaused(true);
    clearInterval(autoplayRef.current);
    setTimeout(() => setIsPaused(false), timeout);
  };

  const handleTransitionEnd = () => {
    const maxIndex = clones + n - 1;
    if (index > maxIndex) {
      setTransitionEnabled(false);
      setIndex(clones);
    } else if (index < clones) {
      setTransitionEnabled(false);
      setIndex(maxIndex);
    }
  };

  useEffect(() => {
    if (!transitionEnabled) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setTransitionEnabled(true));
      });
    }
  }, [transitionEnabled]);

  const prev = () => {
    pauseAndResume();
    setIndex((i) => i - 1);
  };

  const next = () => {
    pauseAndResume();
    setIndex((i) => i + 1);
  };

  const goTo = (realIdx) => {
    pauseAndResume();
    setIndex(clones + realIdx);
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    setIsPaused(true);
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 50) setIndex((i) => i + 1);
    if (diff < -50) setIndex((i) => i - 1);
    touchStartX.current = null;
    setTimeout(() => setIsPaused(false), 1200);
  };

  const handleKeyDownRoot = (e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      next();
    } else if (e.key === "Home") {
      e.preventDefault();
      goTo(0);
    } else if (e.key === "End") {
      e.preventDefault();
      goTo(n - 1);
    }
  };

  return (
    <section id="coach" className="py-24 lg:py-32 px-6 bg-[#f8fafc] relative overflow-hidden font-sans">
      <style>{`
        .flip-card { perspective: 1200px; }
        .flip-card-inner {
          position: relative; width: 100%; height: 100%;
          transition: transform 0.65s cubic-bezier(0.4, 0.2, 0.2, 1);
          transform-style: preserve-3d;
        }
        @media (hover: hover) {
          .flip-card:hover .flip-card-inner { transform: rotateY(180deg); }
        }
        .flip-card.is-flipped .flip-card-inner { transform: rotateY(180deg); }
        .flip-card-front, .flip-card-back {
          position: absolute; width: 100%; height: 100%;
          backface-visibility: hidden; -webkit-backface-visibility: hidden;
        }
        .flip-card-back { transform: rotateY(180deg); }
      `}</style>

      <div className="max-w-7xl mx-auto relative">
        {/* HEADER SECTION */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 bg-blue-50 border border-blue-100 px-4 py-1.5 rounded-full inline-block mb-3">
            Tim Pelatih Profesional
          </span>
          <h3 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Instruktur <span className="text-blue-600">Terbaik</span> Klub
          </h3>
          <p className="text-slate-500 text-sm md:text-base mt-3 font-medium">
            Didukung oleh pelatih renang berlisensi nasional yang berdedikasi membimbing teknik, ketahanan, dan prestasi atlet.
          </p>
        </div>

        {/* CAROUSEL WRAPPER */}
        <div
          className="relative px-2 sm:px-4"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          ref={containerRef}
          role="region"
          aria-label="Carousel Pelatih"
          tabIndex={0}
          onKeyDown={handleKeyDownRoot}
          onFocus={() => setIsPaused(true)}
          onBlur={() => setIsPaused(false)}
        >
          {/* TRACK VIEWPORT */}
          <div className="overflow-hidden w-full py-4">
            <div
              className="flex items-stretch"
              aria-live="polite"
              onTransitionEnd={handleTransitionEnd}
              style={{
                transform: translateX(),
                transition: transitionEnabled ? "transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)" : "none",
              }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {displayed.map((c, i) => (
                <div
                  key={`slide-${c.id || i}`}
                  className="shrink-0 p-3 sm:p-4 box-border flex flex-col"
                  style={{ width: `${100 / visible}%` }}
                >
                  <CoachCard c={c} isTouch={isTouchDevice} />
                </div>
              ))}
            </div>
          </div>

          {/* TOMBOL NAVIGASI SAMPING */}
          {n > visible && (
            <>
              <button
                onClick={prev}
                className="absolute -left-2 sm:-left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-300 shadow-xl flex items-center justify-center transition-all active:scale-95 z-20"
                aria-label="Pelatih sebelumnya"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={next}
                className="absolute -right-2 sm:-right-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-300 shadow-xl flex items-center justify-center transition-all active:scale-95 z-20"
                aria-label="Pelatih berikutnya"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}

          {/* TITIK INDIKATOR (DOTS) */}
          <div className="flex justify-center gap-2 mt-8">
            {coaches.map((_, i) => (
              <button
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index - clones === i ? "w-7 bg-blue-600 shadow-sm shadow-blue-600/30" : "w-2 bg-slate-200 hover:bg-slate-300"
                }`}
                onClick={() => goTo(i)}
                aria-label={`Lihat pelatih ke-${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}