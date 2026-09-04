import React, { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import { Bell, AlertCircle, Info } from "lucide-react";

export default function AnnouncementFeed({ role = "student" }) {
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const { data } = await supabase
        .from("announcements")
        .select("*")
        .eq("is_active", true)
        .in("target_audience", ["all", role])
        .order("created_at", { ascending: false });

      if (data) setAnnouncements(data);
    };
    fetchAnnouncements();
  }, [role]);

  if (announcements.length === 0) return null;

  return (
    <div className="w-full max-w-4xl mx-auto mb-6 space-y-3 font-sans">
      <div className="flex items-center gap-2 px-1 text-slate-600 text-xs font-bold uppercase tracking-wider">
        <Bell size={14} className="text-blue-600" />
        <span>Papan Pengumuman Klub</span>
      </div>

      {announcements.map((item) => {
        const isUrgent = item.urgency === "urgent";
        const isImportant = item.urgency === "important";

        return (
          <div
            key={item.id}
            className={`p-4 rounded-2xl border transition-all ${
              isUrgent
                ? "bg-rose-50 border-rose-200 text-rose-950 shadow-sm"
                : isImportant
                ? "bg-amber-50 border-amber-200 text-amber-950 shadow-sm"
                : "bg-blue-50/60 border-blue-100 text-slate-800"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                {isUrgent ? (
                  <AlertCircle size={18} className="text-rose-600" />
                ) : isImportant ? (
                  <AlertCircle size={18} className="text-amber-600" />
                ) : (
                  <Info size={18} className="text-blue-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="font-bold text-sm tracking-tight">{item.title}</h4>
                  <span className="text-[10px] text-slate-400 font-medium shrink-0">
                    {new Date(item.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
                <p className="text-xs leading-relaxed opacity-90 whitespace-pre-wrap">
                  {item.content}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}