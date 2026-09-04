import React, { useEffect, useState } from "react";
import Navbar from "../components/landing/Navbar";
import Hero from "../components/landing/Hero";
import AboutUs from "../components/landing/AboutUs";
import Course from "../components/landing/Course";
import Coach from "../components/landing/Coach";
import Testimonials from "../components/landing/Testimonials";
import Footer from "../components/landing/Footer";
import { supabase } from "../utils/supabaseClient";
import { ArrowUp } from "lucide-react";

export default function LandingPage() {
  const [waNumber, setWaNumber] = useState("");
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const fetchWa = async () => {
      const { data } = await supabase
        .from("landing_settings")
        .select("action_url")
        .eq("section", "footer_contact")
        .single();

      if (data?.action_url) {
        const [phone] = data.action_url.split("|");
        setWaNumber(phone.replace(/\D/g, ""));
      }
    };

    fetchWa();
  }, []);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () =>
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans overflow-x-hidden scroll-smooth relative">
      <Navbar />

      <main>
        <Hero />
        <AboutUs />
        <Course />
        <Coach />
        <Testimonials />
      </main>

      <Footer />

      {/* Tombol Melayang */}
      <div className="fixed bottom-7 right-7 z-[99] flex items-center gap-3">
        {/* Tombol Kembali ke Atas */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            title="Kembali ke atas"
            className="relative w-[52px] h-[52px] p-3.5 rounded-2xl flex items-center justify-center
              bg-[#0a192f] text-white
              shadow-[0_8px_32px_rgba(10,25,47,0.45)]
              hover:shadow-[0_12px_40px_rgba(10,25,47,0.6)]
              hover:-translate-y-1 hover:scale-105
              active:scale-95
              transition-all duration-300 ease-out
              border border-white/10
              overflow-hidden
              group"
          >
            <span className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
            <span className="absolute top-0 left-3 right-3 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            <ArrowUp size={20} strokeWidth={2.5} className="relative z-10" />
          </button>
        )}

        {/* Tombol WhatsApp */}
        {waNumber && (
          <a
            href={`https://wa.me/${waNumber}?text=Halo%20Siripbiru%20Swim%20Club,%20saya%20ingin%20tanya%20informasi%20pendaftaran.`}
            target="_blank"
            rel="noreferrer"
            title="Hubungi kami melalui WhatsApp"
            className="relative flex items-center gap-0 rounded-2xl overflow-hidden
              bg-[#25D366] text-white
              shadow-[0_8px_32px_rgba(37,211,102,0.5)]
              hover:shadow-[0_12px_40px_rgba(37,211,102,0.7)]
              hover:-translate-y-1 hover:scale-105
              active:scale-95
              transition-all duration-300 ease-out
              border border-white/20
              group
              pl-0 pr-0 py-0"
          >
            <span className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="absolute top-0 left-3 right-3 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

            <span className="relative z-10 max-w-0 overflow-hidden group-hover:max-w-[140px] transition-all duration-500 ease-in-out whitespace-nowrap text-sm font-extrabold tracking-wide pl-0 group-hover:pl-4">
              Hubungi Kami
            </span>

            <span className="relative z-10 p-3.5 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 32 32"
                width="26"
                height="26"
                fill="white"
              >
                <path d="M16 .5C7.44.5.5 7.44.5 16c0 2.83.74 5.49 2.04 7.8L.5 31.5l7.93-2.07A15.45 15.45 0 0 0 16 31.5C24.56 31.5 31.5 24.56 31.5 16S24.56.5 16 .5zm0 28.3a13.2 13.2 0 0 1-6.72-1.84l-.48-.29-4.71 1.23 1.26-4.6-.31-.5A13.18 13.18 0 0 1 2.8 16C2.8 9.27 8.27 3.8 16 3.8S29.2 9.27 29.2 16 23.73 28.8 16 28.8zm7.24-9.87c-.4-.2-2.35-1.16-2.71-1.29-.37-.13-.63-.2-.9.2s-1.03 1.29-1.26 1.56c-.23.26-.46.3-.86.1a10.8 10.8 0 0 1-3.18-1.96 11.93 11.93 0 0 1-2.2-2.74c-.23-.4-.02-.61.17-.81.18-.18.4-.46.6-.69.2-.23.26-.4.4-.66.13-.26.07-.5-.03-.69-.1-.2-.9-2.16-1.23-2.96-.32-.78-.65-.67-.9-.68h-.76c-.26 0-.69.1-1.06.5s-1.39 1.36-1.39 3.32 1.42 3.85 1.62 4.12c.2.26 2.8 4.27 6.78 5.99.95.41 1.69.65 2.27.83.95.3 1.82.26 2.5.16.76-.11 2.35-.96 2.68-1.89.33-.93.33-1.72.23-1.89-.1-.16-.36-.26-.76-.46z" />
              </svg>
            </span>

            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5">
              <span className="absolute inset-0 rounded-full bg-white opacity-75 animate-ping" />
              <span className="absolute inset-0.5 rounded-full bg-white" />
            </span>
          </a>
        )}
      </div>
    </div>
  );
}