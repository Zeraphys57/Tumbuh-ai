"use client";
import { useState, useMemo } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  
  // State untuk Modal Chat Log
  const [selectedLead, setSelectedLead] = useState<any>(null);

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

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      if (!lead.created_at) return false;
      const leadDate = new Date(lead.created_at);
      const leadMonthStr = `${leadDate.getFullYear()}-${String(leadDate.getMonth() + 1).padStart(2, '0')}`;
      return leadMonthStr === activeMonth;
    });
  }, [leads, activeMonth]);

  const formattedMonthText = useMemo(() => {
    if (!activeMonth) return "Bulan Ini";
    const [year, month] = activeMonth.split('-');
    const date = new Date(Number(year), Number(month) - 1);
    return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  }, [activeMonth]);

  const handleDownloadPDF = () => {
    if (filteredLeads.length === 0) {
      alert(`Tidak ada data leads di bulan ${formattedMonthText} untuk di-download.`);
      return;
    }

    const doc = new jsPDF();
    
    // Kop Laporan
    doc.setFontSize(18);
    doc.setTextColor(37, 99, 235);
    doc.text("LAPORAN DATABASE LEADS", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Periode: ${formattedMonthText}`, 14, 26);
    doc.text(`Total Leads: ${filteredLeads.length} Orang/Interaksi`, 14, 31);
    doc.line(14, 35, 196, 35);

    const tableData = filteredLeads.map((lead, index) => {
      const dateStr = new Date(lead.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      const cleanNeeds = (lead.customer_needs || 'General Inquiry').replace(/\n/g, ' '); 
      const contactInfo = lead.platform === 'instagram' ? `[IG] ${lead.customer_phone}` : `[WA] ${lead.customer_phone}`;
      
      return [
        index + 1,
        dateStr,
        lead.customer_name || 'Customer',
        contactInfo,
        cleanNeeds
      ];
    });

    autoTable(doc, {
      startY: 42,
      head: [['No', 'Tanggal', 'Nama Pelanggan', 'Kontak (WA/IG)', 'Kebutuhan / Request']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 20 },
        2: { cellWidth: 40 },
        3: { cellWidth: 35 }, 
        4: { cellWidth: 'auto' }
      }
    });

    doc.save(`Leads_Report_${formattedMonthText.replace(' ', '_')}.pdf`);
  };

  // ========================================================================
  // 🌟 FIX CLAUDE: PARSER CHAT LOG SUPER CERDAS 🌟
  // ========================================================================
  const renderChatLog = (chatText: string) => {
    if (!chatText) return (
      <div className="p-8 bg-slate-50 rounded-[2rem] border-2 border-slate-100 text-slate-400 italic text-center shadow-inner">
        Riwayat obrolan tidak ditemukan di tabel ini.
      </div>
    );
    
    type ChatMessage = { role: 'user' | 'bot' | 'system'; text: string };
    const messages: ChatMessage[] = [];
    let currentRole: 'user' | 'bot' | null = null;
    let currentLines: string[] = [];
    
    const flushCurrent = () => {
      if (currentRole && currentLines.length > 0) {
        messages.push({ role: currentRole, text: currentLines.join('\n').trim() });
        currentLines = [];
      }
    };
    
    for (const line of chatText.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      if (
        trimmed.includes('--- Sesi Obrolan Baru ---') ||
        trimmed.includes('[History Lama Dipangkas]') ||
        trimmed.startsWith('---')
      ) {
        flushCurrent();
        currentRole = null;
        messages.push({ role: 'system', text: trimmed.replace(/^-+|-+$/g, '').trim() });
        continue;
      }
      
      if (/^user:/i.test(trimmed)) {
        flushCurrent();
        currentRole = 'user';
        currentLines.push(trimmed.replace(/^user:/i, '').trim());
      } else if (/^bot:/i.test(trimmed)) {
        flushCurrent();
        currentRole = 'bot';
        currentLines.push(trimmed.replace(/^bot:/i, '').trim());
      } else {
        if (currentRole) currentLines.push(trimmed);
      }
    }
    
    flushCurrent();
    
    if (messages.length === 0) {
      return <div className="p-8 text-slate-400 italic text-center">Format chat tidak dikenali.</div>;
    }
    
    const formatHtml = (text: string) =>
      text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<i>$1</i>')
        .replace(/\n/g, '<br/>');
        
    return messages.map((msg, i) => {
      if (msg.role === 'system') {
        return (
          <div key={i} className="flex justify-center my-4 opacity-70">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] bg-white px-6 py-2 rounded-full border border-slate-200 shadow-sm">
              {msg.text || 'Sesi Baru'}
            </span>
          </div>
        );
      }
      
      if (msg.role === 'user') {
        return (
          <div key={i} className="flex justify-end w-full">
            <div
              className="bg-indigo-600 text-white py-3.5 px-6 rounded-3xl rounded-tr-sm max-w-[80%] shadow-md text-[13px] font-medium leading-relaxed"
              dangerouslySetInnerHTML={{ __html: formatHtml(msg.text) }}
            />
          </div>
        );
      }
      
      return (
        <div key={i} className="flex justify-start w-full">
          <div
            className="bg-white text-slate-700 py-3.5 px-6 rounded-3xl rounded-tl-sm max-w-[85%] border border-slate-200 shadow-sm text-[13px] font-medium leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formatHtml(msg.text) }}
          />
        </div>
      );
    });
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-2xl border border-white overflow-hidden relative">
      
      <div className="p-6 md:p-8 border-b border-slate-50 bg-slate-50/50 flex flex-col md:flex-row items-center justify-between gap-4">
        <h3 className="font-black text-slate-800 text-sm uppercase italic tracking-widest text-center">{title}</h3>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <input 
              type="month" 
              value={activeMonth}
              onChange={handleMonthChange}
              className="w-full md:w-auto appearance-none bg-white border border-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer shadow-sm"
            />
          </div>

          <button 
            onClick={handleDownloadPDF}
            className="flex-shrink-0 bg-slate-900 hover:bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            Export PDF
          </button>
        </div>
      </div>

      <div className="overflow-x-auto min-h-[300px]">
        <table className="w-full text-left">
          <tbody className="divide-y divide-slate-50 text-sm font-medium">
            {filteredLeads.length === 0 && (
               <tr>
                 <td className="p-16 text-center">
                   <div className="flex flex-col items-center justify-center text-slate-400">
                     <svg className="w-12 h-12 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                     <p className="font-bold uppercase text-xs italic tracking-widest">Belum ada leads di bulan {formattedMonthText}</p>
                   </div>
                 </td>
               </tr>
            )}
            {filteredLeads.map((lead) => (
              <tr key={lead.id} className="hover:bg-indigo-50/20 transition-all duration-300">
                <td className="px-10 py-7">
                  <div className="flex items-center gap-5">
                    <div className={`h-12 w-12 rounded-2xl flex-shrink-0 flex items-center justify-center text-white font-black text-lg shadow-lg uppercase ${lead.platform === 'instagram' ? 'bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600' : 'bg-slate-900'}`}>
                      {lead.customer_name?.[0] || '?'}
                    </div>
                    <div>
                      <p className="font-black text-slate-900 text-base leading-none mb-1.5 uppercase tracking-tighter flex items-center gap-2">
                        {lead.customer_name || "Customer"}
                        {lead.platform === 'instagram' && <span className="text-[8px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded-md">IG</span>}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase italic tracking-widest">{lead.customer_phone}</p>
                    </div>
                  </div>
                </td>
                <td className="px-10 py-7 min-w-[300px]">
                  <p className="text-[10px] font-black text-slate-300 uppercase mb-1">Needs:</p>
                  <p className="text-xs text-slate-600 font-bold italic leading-relaxed break-words whitespace-pre-wrap">
                    {lead.total_people && lead.total_people !== "null" ? `${lead.total_people} Orang | ` : ""}
                    {lead.booking_date && lead.booking_date !== "null" ? `${lead.booking_date} | ` : ""}
                    {lead.booking_time && lead.booking_time !== "null" ? `${lead.booking_time}` : (lead.customer_needs || 'General Inquiry')}
                  </p>
                  
                  <button 
                    onClick={() => setSelectedLead(lead)}
                    className="mt-3 text-[9px] font-black text-indigo-500 hover:text-indigo-700 uppercase italic tracking-widest transition-all underline decoration-2 underline-offset-4"
                  >
                    View Full Chat Log
                  </button>
                </td>
                <td className="px-10 py-7 text-right min-w-[180px]">
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-[9px] font-bold text-slate-300 italic">
                      {new Date(lead.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </span>
                    
                    {lead.platform === 'instagram' ? (
                      <span className="inline-block bg-purple-100 text-purple-600 text-[9px] font-black px-6 py-3.5 rounded-2xl transition-all uppercase italic whitespace-nowrap cursor-default border border-purple-200">
                        Via IG DM
                      </span>
                    ) : (
                      <a href={`https://wa.me/${lead.customer_phone}`} target="_blank" rel="noopener noreferrer" className={`inline-block ${buttonColor} ${buttonHover} text-white text-[9px] font-black px-6 py-3.5 rounded-2xl shadow-xl transition-all uppercase italic whitespace-nowrap`}>
                        Contact WA
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL POPUP CHAT LOGS */}
      {selectedLead && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[999] flex items-center justify-center p-4 shadow-2xl">
          <div className="bg-[#F8FAFC] w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border-4 border-white">
            
            <div className="p-8 border-b flex justify-between items-center bg-white shadow-sm z-10 relative">
              <div>
                <h4 className="font-black text-slate-900 uppercase italic tracking-tighter text-xl">
                  Chat Log: <span className={selectedLead.platform === 'instagram' ? "text-purple-600" : "text-indigo-600"}>{selectedLead.customer_name}</span>
                </h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex gap-2 mt-1">
                  <span>ID: {selectedLead.id?.slice(0,8)}...</span>
                  <span>•</span>
                  <span>{selectedLead.platform || 'whatsapp'}</span>
                </p>
              </div>
              <button 
                onClick={() => setSelectedLead(null)}
                className="h-12 w-12 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 shadow-sm rounded-2xl font-black transition-all flex items-center justify-center border border-slate-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            {/* AREA BUBBLE CHAT */}
            <div className="p-8 overflow-y-auto max-h-[500px]">
               <div className="flex flex-col gap-4">
                 {renderChatLog(selectedLead.full_chat)}
               </div>
            </div>

            <div className="p-6 border-t bg-white text-center shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Tumbuh AI • Intelligent Monitoring Node</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}