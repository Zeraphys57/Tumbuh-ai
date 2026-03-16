"use client";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

interface PriceListProps {
  clientId: string;
  addonType?: string;
  label?: string;
}

export default function PriceListAddon({ 
  clientId, 
  addonType = "price_list", 
  label = "Daftar Harga & Layanan" 
}: PriceListProps) {
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function loadData() {
      if (!clientId) return;
      const { data } = await supabase
        .from("client_addons_data")
        .select("content")
        .eq("client_id", clientId)
        .eq("addon_type", addonType)
        .maybeSingle();
      
      if (data) setContent(data.content);
    }
    loadData();
  }, [clientId, addonType, supabase]);

  const handleSync = async () => {
    if (!clientId) return;
    setIsSaving(true);
    const { error } = await supabase.from("client_addons_data").upsert({
      client_id: clientId,
      addon_type: addonType,
      content: content
    },{ onConflict: 'client_id,addon_type' }
);
    setIsSaving(false);
    if (!error) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  if (!clientId) return null;

  return (
    <div className="bg-emerald-600 p-8 rounded-[2.5rem] shadow-2xl text-white border-4 border-white/5 h-full">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shadow-inner">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 8h6m-5 0a3 3 0 110 6H9l3 3m-3-6h6m6 1a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="font-black text-xl italic uppercase tracking-tighter leading-none">{label}</h3>
          <p className="text-[9px] font-bold opacity-60 uppercase tracking-widest mt-1">Pricing Node Sync</p>
        </div>
      </div>

      <div className="space-y-4">
        <textarea
          className="w-full h-[180px] bg-black/20 rounded-[1.8rem] p-6 text-xs font-bold border border-white/10 focus:ring-4 focus:ring-emerald-400/20 outline-none transition-all text-emerald-50 leading-relaxed resize-none italic"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Contoh: Jahit Kemeja - 150rb, Pasang Resleting - 30rb..."
        />
        
        <button 
          onClick={handleSync}
          disabled={isSaving}
          className={`w-full py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest transition-all shadow-xl active:scale-95 italic ${
            showSuccess ? 'bg-white text-emerald-600' : 'bg-emerald-400 text-emerald-900 hover:bg-white'
          }`}
        >
          {isSaving ? "Uploading Rates..." : showSuccess ? "Rates Synced!" : "Update Price List"}
        </button>
      </div>
    </div>
  );
}