"use client";
import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";

// --- IMPORT KOMPONEN UI INTI ---
import StatsBoard from "./ui/StatsBoard";
import LeadsTable from "./ui/LeadsTable";
import AITrainer from "./ui/AITrainer";
import RefreshEngine from "./ui/RefreshEngine";
import WeeklyAnalyticsChart from "./ui/WeeklyAnalyticsChart";
import LiveChat from "./ui/LiveChat";
import EmergencyContact from "./ui/EmergencyContact";
import RAGTrainer from "./ui/RAGTrainer"; 

export default function DefaultDashboard() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [clientId, setClientId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [clientName, setClientName] = useState("");
  
  // STATE UNTUK ADD-ON KNOWLEDGE DASAR
  const [clientFeatures, setClientFeatures] = useState<any>({});
  const [dailyInfo, setDailyInfo] = useState("");
  const [isSavingAddon, setIsSavingAddon] = useState(false);

  const [adminPhone, setAdminPhone] = useState("");
  const [isSavingPhone, setIsSavingPhone] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 1. FUNGSI FETCH DATA
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) {
         setLoading(false);
         return;
      }

      const id = session.user.user_metadata?.client_id;
      const name = session.user.user_metadata?.name || "Admin";
      
      if (!id) {
         setLoading(false);
         return;
      }

      setClientId(id);
      setClientName(name);

      const [leadsRes, clientRes, addonRes] = await Promise.all([
        supabase
          .from("leads")
          .select("id, client_id, customer_name, customer_phone, customer_needs, total_people, booking_date, booking_time, is_bot_active, platform, created_at, full_chat") 
          .eq("client_id", id)
          .order("created_at", { ascending: false }),
        supabase.from("clients").select("system_prompt, features").eq("id", id).maybeSingle(),
        supabase.from("client_addons_data").select("content").eq("client_id", id).eq("addon_type", "daily_menu").maybeSingle()
      ]);

      if (leadsRes.data) setLeads(leadsRes.data);
      if (clientRes.data) {
        setPrompt(clientRes.data.system_prompt || "");
        
        // Tarik features JSON dan masukkan nomor WA Admin ke State
        const featuresObj = clientRes.data.features || {};
        setClientFeatures(featuresObj);
        setAdminPhone(featuresObj.admin_whatsapp_number || ""); 
      }
      if (addonRes.data) setDailyInfo(addonRes.data.content || "");

    } catch (err) {
      console.error("Refresh Failed:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // 2. REAL-TIME SUBSCRIPTION
  useEffect(() => {
    fetchData();
    if (!clientId) return;

    const channel = supabase
      .channel(`realtime-leads-${clientId}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'leads', filter: `client_id=eq.${clientId}` }, 
        (payload) => {
          setLeads((currentLeads) => [payload.new, ...currentLeads]);
        }
      )
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'leads', filter: `client_id=eq.${clientId}` }, 
        (payload) => {
          setLeads((currentLeads) => currentLeads.map(lead => lead.id === payload.new.id ? payload.new : lead));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData, supabase, clientId]);

  // 3. FUNGSI UPDATE DATA
  const handleUpdateDailyInfo = async () => {
    if (!clientId) return;
    setIsSavingAddon(true);
    const { error } = await supabase.from("client_addons_data").upsert({ 
      client_id: clientId, addon_type: "daily_menu", content: dailyInfo 
    }, { onConflict: 'client_id,addon_type' });
    setIsSavingAddon(false);
    if (!error) { setShowToast(true); setTimeout(() => setShowToast(false), 3000); }
  };

  const handleUpdatePrompt = async () => {
    if (!clientId) return;
    setIsSaving(true);
    await supabase.from("clients").update({ system_prompt: prompt }).eq("id", clientId);
    setIsSaving(false);
    setShowToast(true); setTimeout(() => setShowToast(false), 3000);
  };

  const handleUpdateAdminPhone = async () => {
    if (!clientId) return;
    setIsSavingPhone(true);
    
    // Gabungkan nomor WA baru ke dalam objek features
    const updatedFeatures = { 
      ...clientFeatures, 
      admin_whatsapp_number: adminPhone 
    };

    const { error } = await supabase.from("clients").update({ features: updatedFeatures }).eq("id", clientId);
    
    setIsSavingPhone(false);
    if (!error) { 
      setClientFeatures(updatedFeatures);
      setShowToast(true); 
      setTimeout(() => setShowToast(false), 3000); 
    } else {
      console.error("Gagal menyimpan nomor WA", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center gap-4">
        <div className="w-8 h-8 border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">Memuat Workspace...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] p-4 md:p-8 font-sans text-slate-900 pb-20">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[999] animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-slate-900 text-white px-8 py-4 rounded-3xl shadow-2xl border border-slate-700 uppercase text-[10px] font-black italic tracking-widest text-center flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            Sistem Diperbarui!
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="max-w-[1600px] mx-auto mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">
            Workspace: <span className="text-blue-600">{clientName}</span>
          </h1>
          <p className="text-slate-400 font-bold mt-1 text-[10px] uppercase tracking-[0.2em]">Tumbuh AI • Standard Operations</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleLogout} className="bg-white border border-slate-200 text-slate-500 hover:text-red-500 hover:border-red-200 px-6 py-3 rounded-2xl font-black transition-all text-[10px] uppercase shadow-sm active:scale-95">Logout</button>
          <RefreshEngine onRefresh={fetchData} loading={loading} />
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* KOLOM KIRI: OPERATIONS (8/12) */}
        <div className="lg:col-span-8 space-y-8">
          
          <StatsBoard totalLeads={leads.length} themeColor="blue" />

          <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
             <WeeklyAnalyticsChart leads={leads} />
          </div>

          <LeadsTable leads={leads} title="Database Pelanggan Terkini" buttonColor="bg-blue-600" />

          {/* LIVE CHAT TERMINAL */}
          <div className="mt-10 bg-slate-900 rounded-[3rem] p-2 shadow-xl overflow-hidden border border-slate-800">
             <div className="px-8 py-5 flex items-center justify-between border-b border-white/10">
                <div>
                   <h2 className="text-white text-lg font-black italic tracking-widest uppercase">Communication Terminal</h2>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Live Human Takeover Module</p>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
                   <span className="text-green-500 text-[10px] font-black uppercase tracking-widest">Active</span>
                </div>
             </div>
             <div className="bg-white rounded-b-[2.5rem] overflow-hidden">
                <LiveChat />
             </div>
          </div>

        </div>

        {/* KOLOM KANAN: KNOWLEDGE & SETTINGS (4/12) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* FITUR KNOWLEDGE NODE */}
          {clientFeatures?.has_addon && (
            <div className="bg-blue-600 p-8 rounded-[2.5rem] shadow-lg text-white h-fit border-4 border-blue-500/30">
               <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477-4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                  </div>
                  <h3 className="font-black text-xl italic uppercase tracking-tighter">
                    {clientFeatures?.addon_label || "Update Harian"}
                  </h3>
               </div>
               <div className="space-y-4">
                  <textarea 
                    className="w-full h-[150px] bg-white/10 rounded-[1.5rem] p-5 text-xs font-medium border border-white/20 focus:ring-2 focus:ring-white outline-none transition-all text-white resize-none placeholder-white/50"
                    value={dailyInfo}
                    onChange={(e) => setDailyInfo(e.target.value)}
                    placeholder={clientFeatures?.addon_placeholder || "Ketik informasi tambahan untuk AI di sini..."}
                  />
                  <button onClick={handleUpdateDailyInfo} disabled={isSavingAddon} className="w-full bg-white text-blue-700 py-4 rounded-[1.2rem] font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all shadow-md active:scale-95">
                    {isSavingAddon ? "Menyimpan..." : "Simpan Info"}
                  </button>
               </div>
            </div>
          )}

          {/* AI TRAINER INTI (MANUAL) */}
          <AITrainer 
            prompt={prompt} 
            setPrompt={setPrompt} 
            handleUpdatePrompt={handleUpdatePrompt} 
            isSaving={isSaving} 
            setShowToast={setShowToast} 
          />

          {/* ========================================================
             UI RAG TRAINER (SUNTIK OTAK PDF)
          ======================================================== */}
          {/* Karena komponen RAGTrainer minta clientId berupa "slug" / string, kita lemparkan UUID asli dari state `clientId` ini (Pastikan API Bos bisa menerima ID ini). */}
          <RAGTrainer clientId={clientId} />

          {/* ========================================================
             UI PENGATURAN NOTIFIKASI DARURAT
          ======================================================== */}
          <EmergencyContact 
             adminPhone={adminPhone}
             setAdminPhone={setAdminPhone}
             handleUpdateAdminPhone={handleUpdateAdminPhone}
             isSavingPhone={isSavingPhone}
          />

          {/* FOOTER BRANDING STANDARD */}
          <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] flex flex-col items-center justify-center text-center opacity-80 mt-8 shadow-sm">
             <div className="text-xl font-black tracking-tighter mb-1 text-slate-800">TUMBUH<span className="text-blue-600">.AI</span></div>
             <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Core Engine V1.0</div>
          </div>
          
        </div>
      </div>
    </div>
  );
}