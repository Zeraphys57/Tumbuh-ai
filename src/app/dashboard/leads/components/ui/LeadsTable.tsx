"use client";
import React, { useState, useMemo, useEffect, useRef } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { createBrowserClient } from "@supabase/ssr";

interface LeadsTableProps {
  leads: any[];
  title?: string;
  buttonColor?: string;
  buttonHover?: string;
  selectedMonth?: string;
  setSelectedMonth?: (val: string) => void;
}

export default function LeadsTable({ 
  leads, 
  title = "Database Leads Live",
  buttonColor = "bg-green-500",
  buttonHover = "hover:bg-green-600",
  selectedMonth,  
  setSelectedMonth
}: LeadsTableProps) {
  
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);
  
  const saveTimerRefs = useRef<Record<string, NodeJS.Timeout>>({});
  // [BARU]: Ref untuk Timer Toast Notifikasi
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [localLeads, setLocalLeads] = useState<any[]>([]);
  const [activePlatform, setActivePlatform] = useState<'all' | 'whatsapp' | 'instagram' | 'gmail'>('all');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [memoValues, setMemoValues] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, 'saving' | 'saved' | 'error' | null>>({});
  
  // [BARU]: State untuk Modern Toast Notification
  const [toast, setToast] = useState<{message: string, type: 'error' | 'success'} | null>(null);

  // [BARU]: Fungsi Panggil Toast yang Elegan
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
    setLocalLeads(leads);
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
      
      // Efek kedip awal
      target.classList.remove('ring-4', 'ring-yellow-400/80');
      void target.offsetWidth; // Trigger reflow browser
      target.classList.add('ring-4', 'ring-yellow-400/80');

      // [FIX CLAUDE]: Cleanup matikan efek nyala setelah 1.5 detik
      setTimeout(() => {
        target.classList.remove('ring-4', 'ring-yellow-400/80');
      }, 1500);

    } else {
      showToast("Pesan spesifik untuk data ini tidak ditemukan di log chat.", "error");
    }
  };

  const filteredLeads = useMemo(() => {
    return localLeads.filter(lead => {
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
      
      // 1. Intent/Needs selalu di posisi PERTAMA (Informasi paling mahal buat Sales)
      if (lead.customer_needs && lead.customer_needs !== "null" && lead.customer_needs !== "-") {
        badges.push({ key: "Intent", value: lead.customer_needs });
      }

      // 2. Data Booking dengan filter anti-sampah ("null" atau "-")
      if (lead.booking_date && lead.booking_date !== "null" && lead.booking_date !== "-") {
        badges.push({ key: "Tgl", value: lead.booking_date });
      }
      
      if (lead.booking_time && lead.booking_time !== "null" && lead.booking_time !== "-") {
        badges.push({ key: "Jam", value: lead.booking_time });
      }
      
      if (lead.total_people && lead.total_people !== "null" && lead.total_people !== "-") {
        badges.push({ key: "Pax", value: `${lead.total_people} Org` });
      }
      
      // 3. Metadata tambahan dengan guard yang sama
      if (lead.metadata && typeof lead.metadata === 'object') {
        Object.entries(lead.metadata).forEach(([k, v]) => {
          const val = String(v);
          if (val && val !== "null" && val !== "-") {
            badges.push({ key: k, value: val });
          }
        });
      }

      // Fallback kalau bener-bener nggak ada data yang tertangkap
      if (badges.length === 0) {
        badges.push({ key: "Status", value: "General Inquiry" });
      }
      
      return { 
        ...lead, 
        computedBadges: badges, 
        agent_status: lead.agent_status || 'prospecting' 
      };
    });
  }, [localLeads, activeMonth, activePlatform, searchQuery]);

  const formattedMonthText = useMemo(() => {
    if (!activeMonth) return "Bulan Ini";
    const [year, month] = activeMonth.split('-');
    const date = new Date(Number(year), Number(month) - 1);
    return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  }, [activeMonth]);

  const handleDownloadCSV = () => {
    // [FIX]: Bye-bye Alert!
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
    // [FIX]: Bye-bye Alert!
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

    autoTable(doc, {
      startY: 42,
      head: [['No', 'Tanggal', 'Nama Pelanggan', 'Kontak', 'Extracted Data']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] }, styles: { fontSize: 8 }
    });
    doc.save(`Leads_Report_${formattedMonthText.replace(' ', '_')}.pdf`);
    showToast("Berhasil mengunduh PDF", "success");
  };

  const renderChatLog = (chatText: string, lead: any) => {
    if (!chatText) return <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 text-slate-400 italic text-center shadow-inner text-xs">Riwayat obrolan tidak ditemukan.</div>;
    
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
    
    if (messages.length === 0) return <div className="p-8 text-slate-400 italic text-center text-xs">Format chat tidak dikenali.</div>;
    
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

      if (msg.role === 'system') return <div key={i} className={`flex justify-center opacity-70 ${marginTop}`}><span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] bg-white px-4 py-1.5 rounded-full border border-slate-200 shadow-sm">{msg.text || 'Sesi Baru'}</span></div>;
      
      if (msg.role === 'user') {
        return (
          <div key={i} className={`flex justify-end w-full ${marginTop}`} id={isTarget && matchedKw ? `target-${lead.id}-${formatKw(matchedKw)}` : undefined}>
            <div 
              className={`py-3 px-5 rounded-2xl text-xs font-medium leading-relaxed max-w-[80%] transition-all duration-700 ${isSameAsPrev ? 'rounded-tr-md' : 'rounded-tr-sm'} 
              ${isTarget ? 'bg-gradient-to-br from-yellow-400 to-amber-600 text-white shadow-[0_0_20px_rgba(251,191,36,0.6)] ring-4 ring-yellow-400/30 scale-[1.02]' : 'bg-indigo-600 text-white shadow-sm'}`} 
              dangerouslySetInnerHTML={{ __html: formatHtml(msg.text) }} 
            />
          </div>
        );
      }
      
      return <div key={i} className={`flex justify-start w-full ${marginTop}`}><div className={`bg-white text-slate-700 py-3 px-5 rounded-2xl border border-slate-200 shadow-sm text-xs font-medium leading-relaxed max-w-[85%] ${isSameAsPrev ? 'rounded-tl-md' : 'rounded-tl-sm'}`} dangerouslySetInnerHTML={{ __html: formatHtml(msg.text) }} /></div>;
    });
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'ready_to_close': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'negotiating': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'prospecting': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'closed_won': return 'bg-slate-800 text-white border-slate-700 shadow-md';
      case 'lost': return 'bg-red-100 text-red-700 border-red-200 opacity-70';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-2xl border border-white overflow-hidden relative">
      
      {/* [BARU]: FLOATING TOAST NOTIFICATION UI */}
      {toast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[1000] animate-[fadeIn_0.3s_ease-out]">
          <div className={`px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 font-bold text-[10px] uppercase tracking-widest border backdrop-blur-md transition-all ${
            toast.type === 'error' ? 'bg-red-600/95 text-white border-red-500 shadow-red-500/20' : 'bg-emerald-500/95 text-white border-emerald-400 shadow-emerald-500/20'
          }`}>
            <span>{toast.type === 'error' ? '⚠️' : '✅'}</span>
            {toast.message}
          </div>
        </div>
      )}

      <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-5">
        
        <div className="flex flex-col xl:flex-row items-center justify-between gap-4">
          <h3 className="font-black text-slate-800 text-sm uppercase italic tracking-widest text-center flex-shrink-0">{title}</h3>
          
          <div className="flex flex-wrap items-center justify-center xl:justify-end gap-3 w-full">
            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <input 
                type="text" 
                placeholder="Cari nama, nomor, kebutuhan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-medium pl-9 pr-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm placeholder:text-slate-400"
              />
            </div>

            <input 
              type="month" 
              value={activeMonth}
              onChange={handleMonthChange}
              className="appearance-none bg-white border border-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer shadow-sm"
            />
            
            <div className="flex gap-2">
               <button onClick={handleDownloadCSV} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 flex items-center gap-1.5">
                 CSV
               </button>
               <button onClick={handleDownloadPDF} className="bg-slate-900 hover:bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center gap-1.5">
                 PDF
               </button>
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {['all', 'whatsapp', 'instagram', 'gmail'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActivePlatform(tab as any)}
              className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activePlatform === tab 
                ? 'bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-sm' 
                : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50 hover:text-slate-600'
              }`}
            >
              {tab === 'all' ? '🌍 Semua' : tab === 'whatsapp' ? '🟩 WhatsApp' : tab === 'instagram' ? '🟪 Instagram' : '🟥 Gmail'}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto min-h-[400px] max-h-[600px] overflow-y-auto custom-scrollbar">
        <table className="w-full text-left">
          <tbody className="divide-y divide-slate-100 text-sm font-medium">
            {filteredLeads.length === 0 && (
               <tr>
                 <td className="p-16 text-center" colSpan={4}>
                   <div className="flex flex-col items-center justify-center text-slate-400">
                     <svg className="w-12 h-12 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                     <p className="font-bold uppercase text-xs italic tracking-widest">Data tidak ditemukan</p>
                   </div>
                 </td>
               </tr>
            )}
            
            {filteredLeads.map((lead) => (
              <React.Fragment key={lead.id}>
                <tr className="hover:bg-indigo-50/20 transition-all duration-300">
                  <td className="px-6 py-5 w-[30%]">
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-2xl flex-shrink-0 flex items-center justify-center text-white font-black text-sm shadow-md uppercase ${lead.platform === 'instagram' ? 'bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600' : lead.platform === 'gmail' ? 'bg-red-500' : 'bg-slate-900'}`}>
                        {lead.customer_name?.[0] || '?'}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-sm leading-none mb-1.5 flex items-center gap-2">
                          {lead.customer_name || "Customer"}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">{lead.customer_phone}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-5 w-[40%]">
                    <div className="flex flex-wrap gap-2">
                      {lead.computedBadges.map((badge: any, idx: number) => (
                         <span key={idx} className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] px-2.5 py-1 rounded-md font-bold shadow-sm">
                           <span className="text-slate-400 uppercase mr-1">{badge.key}:</span> 
                           <span className="italic">{badge.value}</span>
                         </span>
                      ))}
                    </div>
                  </td>

                  <td className="px-6 py-5 w-[15%]">
                     <select 
                       value={lead.agent_status}
                       onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                       className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border shadow-sm outline-none cursor-pointer appearance-none ${getStatusColor(lead.agent_status)}`}
                     >
                       <option value="prospecting">⏳ Prospecting</option>
                       <option value="negotiating">💬 Negotiating</option>
                       <option value="ready_to_close">🔥 Ready Close</option>
                       <option value="closed_won">✅ Deal (Won)</option>
                       <option value="lost">❌ Batal (Lost)</option>
                     </select>
                  </td>

                  <td className="px-6 py-5 w-[15%] text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button onClick={() => setExpandedRowId(expandedRowId === lead.id ? null : lead.id)} className="h-9 w-9 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 rounded-xl shadow-sm flex items-center justify-center transition-all" title="Lihat Detail">
                         <svg className={`w-4 h-4 transition-transform ${expandedRowId === lead.id ? 'rotate-180 text-indigo-600' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                       </button>
                       {lead.platform !== 'instagram' && lead.platform !== 'gmail' && (
                          <a href={`https://wa.me/${lead.customer_phone}`} target="_blank" rel="noopener noreferrer" className={`h-9 w-9 ${buttonColor} ${buttonHover} text-white rounded-xl shadow-md flex items-center justify-center transition-all hover:-translate-y-0.5`} title="Balas via WA">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                          </a>
                       )}
                    </div>
                  </td>
                </tr>

                {expandedRowId === lead.id && (
                  <tr className="bg-slate-50 border-b-2 border-slate-200">
                    <td colSpan={4} className="p-0">
                      <div className="flex flex-col lg:flex-row gap-6 p-6 md:p-8 animate-[fadeIn_0.2s_ease-in-out]">
                        
                        <div className="w-full lg:w-1/3 flex flex-col gap-4">
                           <div className="bg-yellow-50 p-5 rounded-2xl border border-yellow-200 shadow-sm relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-8 h-8 bg-yellow-200/50 rounded-bl-3xl"></div>
                              <h5 className="text-[10px] font-black text-yellow-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                                📌 Internal Memo (Staff Only)
                              </h5>
                              <textarea 
                                placeholder="Ketik catatan sales di sini... (misal: Follow up besok jam 10 pagi)"
                                value={memoValues[lead.id] ?? lead.internal_note ?? ""}
                                onChange={(e) => setMemoValues(prev => ({ ...prev, [lead.id]: e.target.value }))}
                                className="w-full bg-white/60 border border-yellow-300/50 rounded-xl p-3 text-xs text-slate-700 font-medium outline-none focus:bg-white focus:border-yellow-400 transition-all resize-none h-20 placeholder:text-yellow-700/40"
                              />
                              <div className="flex justify-end mt-2">
                                <button 
                                  onClick={() => handleSaveNote(lead.id)} 
                                  disabled={saveStatus[lead.id] === 'saving'}
                                  className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-sm ${
                                    saveStatus[lead.id] === 'saving' ? 'bg-yellow-300 text-yellow-700 cursor-not-allowed' :
                                    saveStatus[lead.id] === 'saved' ? 'bg-emerald-400 text-white' :
                                    saveStatus[lead.id] === 'error' ? 'bg-red-500 text-white' :
                                    'bg-yellow-400 hover:bg-yellow-500 text-yellow-900 active:scale-95'
                                  }`}
                                >
                                  {saveStatus[lead.id] === 'saving' ? '⏳ Menyimpan...' :
                                   saveStatus[lead.id] === 'saved' ? '✅ Tersimpan' :
                                   saveStatus[lead.id] === 'error' ? '❌ Gagal' : 'Save Note'}
                                </button>
                              </div>
                           </div>

                           <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                              <h5 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> AI Analysis
                              </h5>
                              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                {lead.ai_summary ? (
                                  lead.ai_summary 
                                ) : (
                                  <span className="italic">
                                    <span className="not-italic mr-1">🤖</span> 
                                    Prospek masuk via <strong>{lead.platform || 'sistem'}</strong> atas nama <strong>{lead.customer_name || 'klien'}</strong>. 
                                    Klien memiliki intensi terkait <strong>"{lead.customer_needs || 'pertanyaan umum'}"</strong>. 
                                    Data berhasil diekstrak dengan status negosiasi saat ini: <span className="uppercase font-bold text-indigo-500">{(lead.agent_status || 'prospecting').replace('_', ' ')}</span>.
                                  </span>
                                )}
                              </p>
                           </div>
                        </div>

                        <div className="w-full lg:w-2/3 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col h-[320px]">
                           <div className="p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl flex items-center overflow-x-auto custom-scrollbar">
                             <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap mr-4 flex-shrink-0">Chat History</h5>
                             <div className="flex gap-2 flex-nowrap">
                               {lead.computedBadges.filter((b:any)=>b.value && b.value!=="null" && b.value!=="-").map((badge: any, idx: number) => (
                                  <button 
                                    key={idx}
                                    onClick={() => handleAnchorClick(lead.id, badge.value)} 
                                    className="text-[9px] bg-yellow-100 text-yellow-700 hover:bg-yellow-200 px-3 py-1.5 rounded-lg font-bold transition-all shadow-sm flex items-center gap-1.5 whitespace-nowrap active:scale-95 border border-yellow-200"
                                    title="Loncat ke pesan ini"
                                  >
                                     🎯 <span className="uppercase opacity-70">{badge.key}:</span> {badge.value}
                                  </button>
                               ))}
                             </div>
                           </div>
                           <div id={`mini-chat-${lead.id}`} className="p-5 overflow-y-auto flex-1 custom-scrollbar scroll-smooth">
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
  );
}