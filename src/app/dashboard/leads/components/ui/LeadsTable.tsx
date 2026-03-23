"use client";
import React, { useState, useMemo, useEffect, useRef } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { createBrowserClient } from "@supabase/ssr";

interface LeadsTableProps {
  leads?: any[]; 
  title?: string;
  buttonColor?: string;
  buttonHover?: string;
  selectedMonth?: string;
  setSelectedMonth?: (val: string) => void;
}

export default function LeadsTable({ 
  leads, 
  title = "Database Leads Live",
  buttonColor = "bg-green-600",
  buttonHover = "hover:bg-green-500",
  selectedMonth,  
  setSelectedMonth
}: LeadsTableProps) {
  
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);
  
  const saveTimerRefs = useRef<Record<string, NodeJS.Timeout>>({});
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [localLeads, setLocalLeads] = useState<any[]>(leads || []);
  const [activePlatform, setActivePlatform] = useState<'all' | 'whatsapp' | 'instagram' | 'gmail'>('all');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [memoValues, setMemoValues] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, 'saving' | 'saved' | 'error' | null>>({});
  
  const [toast, setToast] = useState<{message: string, type: 'error' | 'success'} | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (isMaximized) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isMaximized]);

  const showToast = (message: string, type: 'error' | 'success' = 'error') => {
    setToast({ message, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    return () => {
      Object.values(saveTimerRefs.current).forEach(clearTimeout);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!expandedRowId) return;
    const timer = setTimeout(() => {
      const targets = document.querySelectorAll(`[id^="target-${expandedRowId}-"]`);
      if (targets.length > 0) {
        targets[targets.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        const chatBox = document.getElementById(`mini-chat-${expandedRowId}`);
        if (chatBox) chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
      }
    }, 300); 
    return () => clearTimeout(timer); 
  }, [expandedRowId]);

  useEffect(() => {
    setLocalLeads(leads || []);
    setMemoValues({});
  }, [leads]);

  const [internalMonth, setInternalMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const activeMonth = selectedMonth || internalMonth;

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (setSelectedMonth) setSelectedMonth(val);
    else setInternalMonth(val);
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    const previousLeads = [...localLeads];
    setLocalLeads(prev => prev.map(l => l.id === leadId ? { ...l, agent_status: newStatus } : l));
    const { error } = await supabase.from('leads').update({ agent_status: newStatus }).eq('id', leadId);
    if (error) {
      console.error("Gagal update status:", error);
      setLocalLeads(previousLeads); 
      showToast("Gagal mengubah status, koneksi bermasalah.", "error");
    } else {
      showToast("Status berhasil diperbarui!", "success");
    }
  };

  const handleSaveNote = async (leadId: string) => {
    const note = memoValues[leadId] || "";
    setSaveStatus(prev => ({ ...prev, [leadId]: 'saving' }));
    setLocalLeads(prev => prev.map(l => l.id === leadId ? { ...l, internal_note: note } : l));

    const { error } = await supabase.from('leads').update({ internal_note: note }).eq('id', leadId);
    
    if (error) {
      console.error("Gagal save note:", error);
      setSaveStatus(prev => ({ ...prev, [leadId]: 'error' }));
      showToast("Gagal menyimpan memo internal.", "error");
    } else {
      setSaveStatus(prev => ({ ...prev, [leadId]: 'saved' }));
      if (saveTimerRefs.current[leadId]) clearTimeout(saveTimerRefs.current[leadId]);
      saveTimerRefs.current[leadId] = setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, [leadId]: null }));
      }, 3000);
    }
  };

  const handleAnchorClick = (leadId: string, keywordValue: string) => {
    const formatKw = (str: string) => String(str).toLowerCase().replace(/[^a-z0-9]/g, '');
    const target = document.getElementById(`target-${leadId}-${formatKw(keywordValue)}`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.remove('ring-4', 'ring-yellow-400/80');
      void target.offsetWidth; 
      target.classList.add('ring-4', 'ring-yellow-400/80');
      setTimeout(() => {
        target.classList.remove('ring-4', 'ring-yellow-400/80');
      }, 1500);
    } else {
      showToast("Pesan spesifik untuk data ini tidak ditemukan di log chat.", "error");
    }
  };

  const filteredLeads = useMemo(() => {
    const safeLeads = Array.isArray(localLeads) ? localLeads : [];
    
    return safeLeads.filter(lead => {
      if (activePlatform !== 'all' && lead.platform !== activePlatform) return false;
      if (!lead.created_at) return false;
      const leadDate = new Date(lead.created_at);
      const leadMonthStr = `${leadDate.getFullYear()}-${String(leadDate.getMonth() + 1).padStart(2, '0')}`;
      if (leadMonthStr !== activeMonth) return false;

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const nameMatch = (lead.customer_name || "").toLowerCase().includes(query);
        const phoneMatch = (lead.customer_phone || "").toLowerCase().includes(query);
        const needsMatch = (lead.customer_needs || "").toLowerCase().includes(query);
        const aiMatch = (lead.ai_summary || "").toLowerCase().includes(query);
        
        if (!nameMatch && !phoneMatch && !needsMatch && !aiMatch) return false;
      }
      return true;
    }).map(lead => {
      const badges: { key: string, value: string }[] = [];
      if (lead.customer_needs && lead.customer_needs !== "null" && lead.customer_needs !== "-") badges.push({ key: "Intent", value: lead.customer_needs });
      if (lead.booking_date && lead.booking_date !== "null" && lead.booking_date !== "-") badges.push({ key: "Tgl", value: lead.booking_date });
      if (lead.booking_time && lead.booking_time !== "null" && lead.booking_time !== "-") badges.push({ key: "Jam", value: lead.booking_time });
      if (lead.total_people && lead.total_people !== "null" && lead.total_people !== "-") badges.push({ key: "Pax", value: `${lead.total_people} Org` });
      
      if (lead.metadata && typeof lead.metadata === 'object') {
        Object.entries(lead.metadata).forEach(([k, v]) => {
          const val = String(v);
          if (val && val !== "null" && val !== "-") badges.push({ key: k, value: val });
        });
      }
      if (badges.length === 0) badges.push({ key: "Status", value: "General Inquiry" });
      
      return { ...lead, computedBadges: badges, agent_status: lead.agent_status || 'prospecting' };
    });
  }, [localLeads, activeMonth, activePlatform, searchQuery]);

  const formattedMonthText = useMemo(() => {
    if (!activeMonth) return "Bulan Ini";
    const [year, month] = activeMonth.split('-');
    const date = new Date(Number(year), Number(month) - 1);
    return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  }, [activeMonth]);

  const handleDownloadCSV = () => {
    if (filteredLeads.length === 0) return showToast("Tidak ada data untuk di-export.", "error");
    let csvContent = "Tanggal,Nama Pelanggan,Platform,Kontak,Status,Kebutuhan/Data AI\n";
    const escapeCSV = (val: any) => `"${String(val || "").replace(/"/g, '""')}"`;
    filteredLeads.forEach(lead => {
      const dateStr = new Date(lead.created_at).toLocaleDateString('id-ID');
      const badges = lead.computedBadges.map((b: any) => `${b.key}: ${b.value}`).join(' | ');
      const row = [escapeCSV(dateStr), escapeCSV(lead.customer_name), escapeCSV(lead.platform || 'whatsapp'), escapeCSV(lead.customer_phone), escapeCSV(lead.agent_status), escapeCSV(badges)].join(",");
      csvContent += row + "\n";
    });
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Leads_${formattedMonthText.replace(' ', '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Berhasil mengunduh CSV", "success");
  };

  const handleDownloadPDF = () => {
    if (filteredLeads.length === 0) return showToast(`Tidak ada data leads.`, "error");
    const doc = new jsPDF();
    doc.setFontSize(18); doc.setTextColor(37, 99, 235); doc.text("LAPORAN DATABASE LEADS", 14, 20);
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text(`Periode: ${formattedMonthText} | Platform: ${activePlatform.toUpperCase()}`, 14, 26);
    doc.text(`Total Leads: ${filteredLeads.length} Orang`, 14, 31);
    doc.line(14, 35, 196, 35);
    const tableData = filteredLeads.map((lead, index) => {
      const dateStr = new Date(lead.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      const badges = lead.computedBadges.map((b: any) => `${b.key}: ${b.value}`).join(', ');
      return [index + 1, dateStr, lead.customer_name || 'Customer', lead.customer_phone, badges];
    });
    autoTable(doc, { startY: 42, head: [['No', 'Tanggal', 'Nama Pelanggan', 'Kontak', 'Extracted Data']], body: tableData, theme: 'grid', headStyles: { fillColor: [37, 99, 235] }, styles: { fontSize: 8 } });
    doc.save(`Leads_Report_${formattedMonthText.replace(' ', '_')}.pdf`);
    showToast("Berhasil mengunduh PDF", "success");
  };

  // [UI UPGRADE]: Render Chatlog bergaya Hacker/Cyberpunk
  const renderChatLog = (chatText: string, lead: any) => {
    if (!chatText) return <div className="p-8 bg-slate-900/50 rounded-[2rem] border border-slate-800 text-slate-500 italic text-center shadow-inner text-xs">Riwayat obrolan tidak ditemukan.</div>;
    const formatKw = (str: string) => String(str).toLowerCase().replace(/[^a-z0-9]/g, '');
    const keywordsRaw = (lead.computedBadges || []).map((b: any) => String(b.value)).filter((v: string) => v.length > 2 && v !== "null" && v !== "-");
    const keywords = keywordsRaw.map((v: string) => v.toLowerCase());
    type ChatMessage = { role: 'user' | 'bot' | 'system'; text: string };
    const messages: ChatMessage[] = [];
    let currentRole: 'user' | 'bot' | null = null;
    let currentLines: string[] = [];
    const flushCurrent = () => {
      const text = currentLines.join('\n').trim();
      if (currentRole && text) messages.push({ role: currentRole, text });
      currentLines = [];
    };
    for (const line of chatText.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.includes('--- Sesi Obrolan Baru ---') || trimmed.includes('[History Lama Dipangkas]') || trimmed.startsWith('---')) {
        flushCurrent(); currentRole = null;
        messages.push({ role: 'system', text: trimmed.replace(/^-+|-+$/g, '').trim() });
        continue;
      }
      if (/^user:/i.test(trimmed)) { flushCurrent(); currentRole = 'user'; currentLines.push(trimmed.replace(/^user:/i, '').trim()); } 
      else if (/^bot:/i.test(trimmed)) { flushCurrent(); currentRole = 'bot'; currentLines.push(trimmed.replace(/^bot:/i, '').trim()); } 
      else {
        if (!trimmed) { if (currentRole === 'bot' && currentLines.length > 0) { flushCurrent(); currentRole = 'bot'; } else if (currentRole === 'user') { currentLines.push(""); } } 
        else { if (currentRole) currentLines.push(trimmed); }
      }
    }
    flushCurrent();
    if (messages.length === 0) return <div className="p-8 text-slate-500 italic text-center text-xs">Format chat tidak dikenali.</div>;
    const formatHtml = (text: string) => {
      let safe = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<i>$1</i>').replace(/\n/g, '<br/>');
      return safe;
    };
        
    return messages.map((msg, i) => {
      const isSameAsPrev = i > 0 && messages[i - 1].role === msg.role;
      const marginTop = isSameAsPrev ? 'mt-1' : 'mt-4';
      let matchedKw = null;
      if (msg.role === 'user' && keywords.length > 0) {
        const textLower = msg.text.toLowerCase();
        matchedKw = keywords.find((kw: string) => textLower.includes(kw)) || null;
      }
      const isTarget = !!matchedKw;
      
      if (msg.role === 'system') return <div key={i} className={`flex justify-center opacity-70 ${marginTop}`}><span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] bg-slate-800/80 px-4 py-1.5 rounded-full border border-slate-700 shadow-sm max-w-full break-words text-center backdrop-blur-sm">{msg.text || 'Sesi Baru'}</span></div>;
      
      if (msg.role === 'user') {
        return (
          <div key={i} className={`flex justify-end w-full ${marginTop}`} id={isTarget && matchedKw ? `target-${lead.id}-${formatKw(matchedKw)}` : undefined}>
            <div className={`py-3 px-5 rounded-2xl text-xs font-medium leading-relaxed w-fit max-w-[90%] md:max-w-[80%] break-words whitespace-pre-wrap transition-all duration-700 ${isSameAsPrev ? 'rounded-tr-md' : 'rounded-tr-sm'} ${isTarget ? 'bg-gradient-to-br from-yellow-500 to-amber-600 text-white shadow-[0_0_20px_rgba(251,191,36,0.5)] ring-2 ring-yellow-400/50 scale-[1.02]' : 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]'}`} dangerouslySetInnerHTML={{ __html: formatHtml(msg.text) }} />
          </div>
        );
      }
      
      return <div key={i} className={`flex justify-start w-full ${marginTop}`}><div className={`bg-slate-800/80 text-slate-300 py-3 px-5 rounded-2xl border border-slate-700 shadow-sm text-xs font-medium leading-relaxed w-fit max-w-[90%] md:max-w-[85%] break-words whitespace-pre-wrap backdrop-blur-sm ${isSameAsPrev ? 'rounded-tl-md' : 'rounded-tl-sm'}`} dangerouslySetInnerHTML={{ __html: formatHtml(msg.text) }} /></div>;
    });
  };

  // [UI UPGRADE]: Warna Status Neon Dark Mode
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'ready_to_close': return 'bg-emerald-900/30 text-emerald-400 border-emerald-800/50 shadow-[0_0_10px_rgba(52,211,153,0.1)]';
      case 'negotiating': return 'bg-blue-900/30 text-blue-400 border-blue-800/50 shadow-[0_0_10px_rgba(96,165,250,0.1)]';
      case 'prospecting': return 'bg-purple-900/30 text-purple-400 border-purple-800/50 shadow-[0_0_10px_rgba(192,132,252,0.1)]';
      case 'closed_won': return 'bg-slate-800 text-white border-slate-600 shadow-[0_0_15px_rgba(255,255,255,0.1)]';
      case 'lost': return 'bg-red-900/20 text-red-400/80 border-red-900/50 opacity-80';
      default: return 'bg-slate-800/50 text-slate-400 border-slate-700';
    }
  };

  return (
    <>
      {isMaximized && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[998] transition-opacity animate-[fadeIn_0.3s_ease-out]" 
          onClick={() => setIsMaximized(false)}
        ></div>
      )}

      {/* [UI UPGRADE]: Wrapper Utama Glassmorphism Gelap */}
      <div className={`transition-all duration-500 ease-in-out ${
        isMaximized 
          ? "fixed inset-2 md:inset-6 lg:inset-10 z-[999] bg-slate-950 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col border border-slate-800 overflow-hidden" 
          : "bg-slate-950/40 backdrop-blur-xl rounded-[2.5rem] shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-slate-800/60 overflow-hidden relative max-w-full"
      }`}>
        
        {toast && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] animate-[fadeIn_0.3s_ease-out]">
            <div className={`px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 font-bold text-[10px] uppercase tracking-widest border backdrop-blur-md transition-all ${
              toast.type === 'error' ? 'bg-red-900/90 text-red-100 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]' : 'bg-emerald-900/90 text-emerald-100 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
            }`}>
              <span>{toast.type === 'error' ? '⚠️' : '✅'}</span>
              <span className="truncate max-w-[200px] md:max-w-none">{toast.message}</span>
            </div>
          </div>
        )}

        {/* HEADER SECTION */}
        <div className="p-6 md:p-8 border-b border-slate-800/60 bg-slate-900/40 flex flex-col gap-5 flex-shrink-0">
          
          <div className="flex flex-col xl:flex-row items-center justify-between gap-4">
            <h3 className="font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 text-sm uppercase italic tracking-widest text-center flex-shrink-0 drop-shadow-sm">{title}</h3>
            
            <div className="flex flex-wrap items-center justify-center xl:justify-end gap-3 w-full">
              {/* SEARCH INPUT DARK */}
              <div className="relative w-full sm:w-64 flex-shrink min-w-0">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <input 
                  type="text" 
                  placeholder="Cari nama, nomor, kebutuhan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-700 text-slate-200 text-xs font-medium pl-9 pr-4 py-2.5 rounded-xl outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-inner placeholder:text-slate-500"
                />
              </div>

              {/* MONTH PICKER DARK */}
              <input 
                type="month" 
                value={activeMonth}
                onChange={handleMonthChange}
                className="flex-1 sm:flex-none appearance-none bg-slate-900/60 border border-slate-700 text-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer shadow-inner w-full min-w-[120px] color-scheme-dark"
                style={{ colorScheme: 'dark' }}
              />
              
              <div className="flex gap-2 w-full sm:w-auto">
                 <button onClick={handleDownloadCSV} className="flex-1 sm:flex-none justify-center bg-emerald-900/30 hover:bg-emerald-800/50 text-emerald-400 border border-emerald-800/50 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 flex items-center gap-1.5">
                   CSV
                 </button>
                 <button onClick={handleDownloadPDF} className="flex-1 sm:flex-none justify-center bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] active:scale-95 flex items-center gap-1.5 border border-blue-500">
                   PDF
                 </button>
                 <button 
                  onClick={() => setIsMaximized(!isMaximized)} 
                  className={`hidden sm:flex flex-1 sm:flex-none justify-center px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 items-center gap-1.5 ${
                    isMaximized 
                      ? 'bg-red-900/30 text-red-400 border border-red-800/50 hover:bg-red-900/50' 
                      : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                  }`}
                 >
                  <svg className="w-4 h-4 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isMaximized ? (
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    ) : (
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l-5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    )}
                  </svg>
                  {isMaximized ? "Tutup Expand" : "Expand Data"}
                 </button>
              </div>
            </div>
          </div>

          {/* TABS DARK MODE */}
          <div className="flex gap-2 flex-wrap">
            {['all', 'whatsapp', 'instagram', 'gmail'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActivePlatform(tab as any)}
                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activePlatform === tab 
                  ? 'bg-blue-900/30 text-blue-400 border border-blue-800/50 shadow-[0_0_10px_rgba(59,130,246,0.2)]' 
                  : 'bg-slate-900/30 text-slate-500 border border-slate-800 hover:bg-slate-800 hover:text-slate-300'
                }`}
              >
                {tab === 'all' ? '🌍 Semua' : tab === 'whatsapp' ? '🟩 WhatsApp' : tab === 'instagram' ? '🟪 Instagram' : '🟥 Gmail'}
              </button>
            ))}
          </div>
        </div>

        <div className={`w-full max-w-full overflow-x-auto ${isMaximized ? 'flex-1 overflow-y-auto custom-scrollbar' : 'min-h-[400px] max-h-[600px] overflow-y-auto custom-scrollbar'}`}>
          <table className="w-full text-left table-auto min-w-[800px]">
            <tbody className="divide-y divide-slate-800/60 text-sm font-medium">
              {filteredLeads.length === 0 && (
                 <tr>
                   <td className="p-16 text-center" colSpan={4}>
                     <div className="flex flex-col items-center justify-center text-slate-600">
                       <svg className="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                       <p className="font-bold uppercase text-xs italic tracking-widest">Data tidak ditemukan</p>
                     </div>
                   </td>
                 </tr>
              )}
              
              {filteredLeads.map((lead) => (
                <React.Fragment key={lead.id}>
                  <tr className="hover:bg-slate-800/40 transition-colors duration-300">
                    <td className="px-6 py-5 w-[30%] max-w-[250px] align-top">
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-2xl flex-shrink-0 flex items-center justify-center text-white font-black text-sm shadow-[0_0_10px_rgba(0,0,0,0.5)] border border-slate-700/50 uppercase ${lead.platform === 'instagram' ? 'bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600' : lead.platform === 'gmail' ? 'bg-red-500' : 'bg-slate-900'}`}>
                          {lead.customer_name?.[0] || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-slate-200 text-sm leading-none mb-1.5 flex items-center gap-2 truncate">
                            {lead.customer_name || "Customer"}
                          </p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono truncate">{lead.customer_phone}</p>
                        </div>
                      </div>
                    </td>

                    {/* BADGES DARK MODE */}
                    <td className="px-6 py-5 w-[40%] max-w-[300px] align-top">
                      <div className="flex flex-wrap gap-2 w-full">
                        {lead.computedBadges.map((badge: any, idx: number) => (
                           <span key={idx} className="bg-slate-900/60 text-slate-300 border border-slate-700/50 text-[10px] px-2.5 py-1 rounded-md font-bold shadow-sm inline-block break-words max-w-full backdrop-blur-sm">
                             <span className="text-slate-500 uppercase mr-1">{badge.key}:</span> 
                             <span className="italic whitespace-normal break-words">{badge.value}</span>
                           </span>
                        ))}
                      </div>
                    </td>

                    <td className="px-6 py-5 w-[15%] align-top">
                       <select 
                         value={lead.agent_status}
                         onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                         className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border outline-none cursor-pointer appearance-none w-full text-center truncate ${getStatusColor(lead.agent_status)}`}
                       >
                         <option value="prospecting">⏳ Prospecting</option>
                         <option value="negotiating">💬 Negotiating</option>
                         <option value="ready_to_close">🔥 Ready Close</option>
                         <option value="closed_won">✅ Deal</option>
                         <option value="lost">❌ Batal</option>
                       </select>
                    </td>

                    <td className="px-6 py-5 w-[15%] text-right align-top">
                      <div className="flex items-center justify-end gap-2">
                         <button onClick={() => setExpandedRowId(expandedRowId === lead.id ? null : lead.id)} className="h-9 w-9 bg-slate-800 border border-slate-700 text-slate-400 hover:text-blue-400 hover:border-blue-500/50 hover:bg-slate-700 rounded-xl shadow-sm flex items-center justify-center transition-all flex-shrink-0" title="Lihat Detail">
                           <svg className={`w-4 h-4 transition-transform ${expandedRowId === lead.id ? 'rotate-180 text-blue-400' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                         </button>
                         {lead.platform !== 'instagram' && lead.platform !== 'gmail' && (
                            <a href={`https://wa.me/${lead.customer_phone}`} target="_blank" rel="noopener noreferrer" className={`h-9 w-9 ${buttonColor} ${buttonHover} text-white rounded-xl shadow-[0_0_15px_rgba(34,197,94,0.3)] flex items-center justify-center transition-all hover:-translate-y-0.5 flex-shrink-0`} title="Balas via WA">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                            </a>
                         )}
                      </div>
                    </td>
                  </tr>

                  {/* EXPANDED ROW DARK MODE */}
                  {expandedRowId === lead.id && (
                    <tr className="bg-slate-900/60 border-b-2 border-slate-800/80 shadow-inner">
                      <td colSpan={4} className="p-0">
                        <div className="flex flex-col lg:flex-row gap-6 p-6 md:p-8 animate-[fadeIn_0.2s_ease-in-out]">
                          
                          <div className="w-full lg:w-1/3 flex flex-col gap-4 min-w-0">
                             
                             {/* INTERNAL MEMO DARK */}
                             <div className="bg-yellow-900/10 p-5 rounded-2xl border border-yellow-700/30 shadow-sm relative overflow-hidden backdrop-blur-sm">
                                <div className="absolute top-0 right-0 w-8 h-8 bg-yellow-500/10 rounded-bl-3xl"></div>
                                <h5 className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                  📌 Internal Memo (Staff Only)
                                </h5>
                                <textarea 
                                  placeholder="Ketik catatan sales di sini..."
                                  value={memoValues[lead.id] ?? lead.internal_note ?? ""}
                                  onChange={(e) => setMemoValues(prev => ({ ...prev, [lead.id]: e.target.value }))}
                                  className="w-full bg-slate-900/50 border border-yellow-700/30 rounded-xl p-3 text-xs text-yellow-100 font-medium outline-none focus:bg-slate-900 focus:border-yellow-500/50 transition-all resize-none h-20 placeholder:text-yellow-700/50"
                                />
                                <div className="flex justify-end mt-2">
                                  <button 
                                    onClick={() => handleSaveNote(lead.id)} 
                                    disabled={saveStatus[lead.id] === 'saving'}
                                    className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-sm ${
                                      saveStatus[lead.id] === 'saving' ? 'bg-yellow-900/50 text-yellow-600 cursor-not-allowed border border-yellow-800/50' :
                                      saveStatus[lead.id] === 'saved' ? 'bg-emerald-600 text-white border border-emerald-500' :
                                      saveStatus[lead.id] === 'error' ? 'bg-red-600 text-white border border-red-500' :
                                      'bg-yellow-500 hover:bg-yellow-400 text-yellow-950 active:scale-95 border border-yellow-400'
                                    }`}
                                  >
                                    {saveStatus[lead.id] === 'saving' ? '⏳ Menyimpan...' :
                                     saveStatus[lead.id] === 'saved' ? '✅ Tersimpan' :
                                     saveStatus[lead.id] === 'error' ? '❌ Gagal' : 'Save Note'}
                                  </button>
                                </div>
                             </div>

                             {/* AI ANALYSIS DARK */}
                             <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-700 shadow-sm w-full overflow-hidden backdrop-blur-sm">
                                <h5 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2 drop-shadow-[0_0_5px_rgba(96,165,250,0.5)]">
                                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> AI Analysis
                                </h5>
                                <div className="text-xs text-slate-300 leading-relaxed font-medium break-words whitespace-pre-wrap w-full">
                                  {lead.ai_summary ? (
                                    lead.ai_summary 
                                  ) : (
                                    <span className="italic">
                                      <span className="not-italic mr-1">🤖</span> 
                                      Prospek masuk via <strong className="text-white">{lead.platform || 'sistem'}</strong> atas nama <strong className="text-white">{lead.customer_name || 'klien'}</strong>. 
                                      Klien memiliki intensi terkait <strong className="text-white">"{lead.customer_needs || 'pertanyaan umum'}"</strong>. 
                                      Data berhasil diekstrak dengan status negosiasi saat ini: <span className="uppercase font-bold text-blue-400">{(lead.agent_status || 'prospecting').replace('_', ' ')}</span>.
                                    </span>
                                  )}
                                </div>
                             </div>
                          </div>

                          {/* CHAT HISTORY DARK */}
                          <div className="w-full lg:w-2/3 bg-slate-900/60 border border-slate-700 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.3)] flex flex-col h-[350px] min-w-0 max-w-full backdrop-blur-md">
                             <div className="p-4 border-b border-slate-800 bg-slate-950/50 rounded-t-2xl flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 overflow-hidden w-full">
                               <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap flex-shrink-0">Chat History</h5>
                               <div className="flex gap-2 flex-wrap w-full overflow-hidden">
                                 {lead.computedBadges.filter((b:any)=>b.value && b.value!=="null" && b.value!=="-").map((badge: any, idx: number) => (
                                    <button 
                                      key={idx}
                                      onClick={() => handleAnchorClick(lead.id, badge.value)} 
                                      className="text-[9px] bg-yellow-900/30 text-yellow-500 hover:bg-yellow-900/50 px-3 py-1.5 rounded-lg font-bold transition-all shadow-sm flex items-start gap-1.5 active:scale-95 border border-yellow-700/50 text-left max-w-full"
                                      title="Loncat ke pesan ini"
                                    >
                                        <span className="flex-shrink-0 opacity-80">🎯 <span className="uppercase hidden sm:inline">{badge.key}:</span></span> 
                                        <span className="inline-block break-words whitespace-normal leading-tight text-yellow-100">{badge.value}</span>
                                    </button>
                                 ))}
                               </div>
                             </div>
                             
                             <div id={`mini-chat-${lead.id}`} className="p-5 overflow-y-auto overflow-x-hidden flex-1 custom-scrollbar scroll-smooth w-full bg-slate-950/20">
                               {renderChatLog(lead.full_chat, lead)}
                             </div>
                          </div>

                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}