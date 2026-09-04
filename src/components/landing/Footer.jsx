import React, { useEffect, useState } from "react";
import { MapPin, Phone, Mail, ArrowRight, ShieldCheck } from "lucide-react";
import { supabase } from "../../utils/supabaseClient";

/* ===== SVG ICONS ===== */
const InstagramIcon = ({ size = 18 }) => (
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

const FacebookIcon = ({ size = 18 }) => (
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
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const TwitterIcon = ({ size = 18 }) => (
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

export default function Footer() {
  const [contactInfo, setContactInfo] = useState({
    address: "Memuat alamat...",
    phone: "",
    email: "",
  });

  const [socialLinks, setSocialLinks] = useState({
    instagram: "#",
    facebook: "#",
    twitter: "#",
  });

  useEffect(() => {
    const fetchFooterData = async () => {
      const { data } = await supabase
        .from("landing_settings")
        .select("*")
        .in("section", ["footer_contact", "footer_social"]);

      if (data) {
        const contact = data.find((item) => item.section === "footer_contact");
        if (contact) {
          const [phone, email] = contact.action_url
            ? contact.action_url.split("|")
            : ["", ""];
          setContactInfo({
            address: contact.subtitle || "Bandung, Jawa Barat, Indonesia",
            phone: phone || "",
            email: email || "",
          });
        }

        const social = data.find((item) => item.section === "footer_social");
        if (social) {
          const [ig, fb, tw] = social.action_url
            ? social.action_url.split("|")
            : ["#", "#", "#"];
          setSocialLinks({
            instagram: ig || "#",
            facebook: fb || "#",
            twitter: tw || "#",
          });
        }
      }
    };
    fetchFooterData();
  }, []);

  const cleanPhone = contactInfo.phone.replace(/\D/g, "");

  return (
    <footer className="bg-[#050c18] pt-20 pb-10 px-6 border-t border-slate-800 relative overflow-hidden font-sans text-white">
      {/* Efek Ambient Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Area Kolom Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Kolom 1: Profil Klub & Sosial Media */}
          <div className="lg:pr-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white shadow-md shadow-blue-600/30">
                SB
              </div>
              <span className="font-black text-xl tracking-tight text-white">
                Sirip<span className="text-cyan-400">biru</span>
              </span>
            </div>

            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed font-normal">
              Klub renang profesional yang menggabungkan pembinaan teknik fisik terukur dengan integrasi sistem absensi presisi digital untuk melahirkan atlet juara masa depan.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <a
                href={socialLinks.instagram}
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram Siripbiru"
                className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:bg-cyan-400 hover:text-slate-950 hover:border-cyan-400 transition-all duration-300 active:scale-95 shadow-sm"
              >
                <InstagramIcon size={17} />
              </a>
              <a
                href={socialLinks.facebook}
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook Siripbiru"
                className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:bg-cyan-400 hover:text-slate-950 hover:border-cyan-400 transition-all duration-300 active:scale-95 shadow-sm"
              >
                <FacebookIcon size={17} />
              </a>
              <a
                href={socialLinks.twitter}
                target="_blank"
                rel="noreferrer"
                aria-label="Twitter Siripbiru"
                className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:bg-cyan-400 hover:text-slate-950 hover:border-cyan-400 transition-all duration-300 active:scale-95 shadow-sm"
              >
                <TwitterIcon size={17} />
              </a>
            </div>
          </div>

          {/* Kolom 2: Navigasi Cepat */}
          <div>
            <h4 className="text-white font-bold text-base mb-6 tracking-tight flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span> Navigasi
            </h4>
            <ul className="space-y-3.5 text-xs sm:text-sm font-medium">
              {[
                { href: "#about", label: "Tentang Klub" },
                { href: "#course", label: "Program Latihan" },
                { href: "#coach", label: "Tim Pelatih" },
                { href: "#testimonials", label: "Ulasan Atlet" },
                { href: "/login", label: "Portal Masuk" },
              ].map((item, idx) => (
                <li key={idx}>
                  <a
                    href={item.href}
                    className="text-slate-400 hover:text-cyan-300 transition-colors flex items-center gap-2 group"
                  >
                    <ArrowRight
                      size={13}
                      className="text-cyan-400 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all"
                    />
                    <span>{item.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Kolom 3 & 4: Kontak & Alamat */}
          <div className="lg:col-span-2">
            <h4 className="text-white font-bold text-base mb-6 tracking-tight flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span> Informasi Kontak
            </h4>

            <div className="grid sm:grid-cols-2 gap-6">
              {/* Lokasi */}
              <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="w-10 h-10 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center text-cyan-300 shrink-0">
                  <MapPin size={18} />
                </div>
                <div>
                  <p className="text-cyan-300 text-[10px] font-black uppercase tracking-wider mb-1">
                    Sekretariat Klub
                  </p>
                  <p className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap font-medium">
                    {contactInfo.address}
                  </p>
                </div>
              </div>

              {/* Telepon & Email */}
              <div className="space-y-3">
                <a
                  href={cleanPhone ? `https://wa.me/${cleanPhone}` : "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-cyan-400/40 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center text-emerald-400 shrink-0">
                    <Phone size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                      WhatsApp / Telepon
                    </p>
                    <p className="text-slate-200 text-xs font-bold truncate group-hover:text-cyan-300 transition-colors">
                      {contactInfo.phone || "Belum diatur"}
                    </p>
                  </div>
                </a>

                <a
                  href={contactInfo.email ? `mailto:${contactInfo.email}` : "#"}
                  className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-cyan-400/40 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-400/10 border border-blue-400/20 flex items-center justify-center text-cyan-300 shrink-0">
                    <Mail size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                      Email Resmi
                    </p>
                    <p className="text-slate-200 text-xs font-bold truncate group-hover:text-cyan-300 transition-colors">
                      {contactInfo.email || "Belum diatur"}
                    </p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Garis Pembatas & Hak Cipta */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-medium">
          <p>
            &copy; {new Date().getFullYear()} Siripbiru Swim Club. Hak cipta dilindungi undang-undang.
          </p>

          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-cyan-300 transition-colors">
              Kebijakan Privasi
            </a>
            <a href="#" className="hover:text-cyan-300 transition-colors">
              Syarat & Ketentuan
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}