"use client";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Import Semua Dashboard Kustom
import DefaultDashboard from "./components/DefaultDashboard";
import RestoDashboard from "./components/RestoDashboard";
import ClinicDashboard from "./components/ClinicDashboard";
import TailorDashboard from "./components/TailorDashboard";
import DemoDashboard from "./components/DemoDashboard";

export default function LeadsPage() {
  const [clientSlug, setClientSlug] = useState("");
  const [loading, setLoading] = useState(true);
  
  // --- STATE BARU UNTUK WARNING & REPORT ---
  const [clientData, setClientData] = useState<any>(null);
  const [usageStats, setUsageStats] = useState({ total: 0, limit: 1000, percentage: 0 });

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function getClientContext() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const clientId = user.user_metadata?.client_id;
          
          if (clientId) {
            // 1. Ambil data client lengkap (termasuk limit)
            const { data: clientInfo } = await supabase
              .from("clients")
              .select("id, slug, name, monthly_limit")
              .eq("id", clientId)
              .maybeSingle();
            
            if (clientInfo) {
              setClientSlug(clientInfo.slug);
              setClientData(clientInfo);

              // 2. FIX PERFORMA: Hitung jumlah chat pakai Supabase Count (TIDAK DOWNLOAD ARRAY)
              const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
              
              const { count, error } = await supabase
                .from("usage_logs")
                .select("*", { count: "exact", head: true }) // head: true artinya HANYA ambil angka jumlahnya, datanya tidak di-download
                .eq("client_id", clientId)
                .gte("created_at", startOfMonth);

              if (error) console.error("Error counting logs:", error);

              const totalChats = count || 0;
              const limit = clientInfo.monthly_limit || 1000;
              const percentage = (totalChats / limit) * 100;

              setUsageStats({ total: totalChats, limit: limit, percentage: percentage });
            }
          }
        }
      } catch (err) {
        console.error("Routing Error:", err);
      } finally {
        setLoading(false);
      }
    }
    getClientContext();
  }, [supabase]);

  // --- FUNGSI DOWNLOAD REPORT KHUSUS KLIEN ---
  const downloadClientReport = () => {
    if (!clientData) return;
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' });

    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235);
    doc.text("TUMBUH AI", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Laporan Pemakaian Sistem Automasi", 14, 26);
    doc.line(14, 30, 196, 30);

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`RINGKASAN PEMAKAIAN - ${clientData.name.toUpperCase()}`, 14, 40);
    doc.setFontSize(10);
    doc.text(`Periode Cetak : ${dateStr}`, 14, 47);

    autoTable(doc, {
      startY: 55,
      head: [['Metrik Layanan', 'Volume / Status']],
      body: [
        ['Total Percakapan AI Bulan Ini', `${usageStats.total} Interaksi`],
        ['Batas Kuota Bulanan', `${usageStats.limit} Interaksi`],
        ['Sisa Kuota Aman', `${Math.max(0, usageStats.limit - usageStats.total)} Interaksi`],
        ['Persentase Pemakaian', `${usageStats.percentage.toFixed(1)}%`],
        ['Status Tagihan', usageStats.percentage > 100 ? 'OVERLIMIT (Akan Dikenakan Charge Tambahan)' : 'Aman (Dalam Kuota)'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text("Catatan: Chatbot akan tetap membalas pelanggan Anda meskipun kuota habis.", 14, finalY);
    doc.text("Kelebihan kuota (overlimit) akan diakumulasi ke dalam tagihan bulan berikutnya.", 14, finalY + 5);
    doc.text("Laporan ini di-generate otomatis oleh Tumbuh AI System.", 14, finalY + 15);

    doc.save(`TumbuhAI_Report_${clientData.name}_${dateStr}.pdf`);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
      <div className="font-black italic text-slate-300 uppercase animate-pulse tracking-widest">
        Identifying Client Environment...
      </div>
    </div>
  );

  // LOGIKA RENDER KOMPONEN DASHBOARD
  let DashboardComponent = <DefaultDashboard />;
  switch (clientSlug) {
    case "resto-sedap": DashboardComponent = <RestoDashboard />; break;
    case "dokter-gigi": DashboardComponent = <ClinicDashboard />; break;
    case "cherlie-tailor": DashboardComponent = <TailorDashboard />; break;
    case "akun-demo": DashboardComponent = <DemoDashboard />; break;
  }

  // LOGIKA WARNA GLOBAL BAR
  let barTheme = "bg-white border-slate-200 text-slate-600";
  let buttonTheme = "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200";
  let alertIcon = "📊";
  let message = `Pemakaian AI bulan ini: ${usageStats.total} / ${usageStats.limit} Interaksi`;

  if (usageStats.percentage >= 100) {
    barTheme = "bg-red-50 border-red-200 text-red-700";
    buttonTheme = "bg-red-600 hover:bg-red-700 text-white shadow-red-200";
    alertIcon = "🚨";
    message = `OVERLIMIT! Pemakaian telah melampaui batas (${usageStats.total}/${usageStats.limit}). Biaya tambahan berlaku.`;
  } else if (usageStats.percentage >= 80) {
    barTheme = "bg-orange-50 border-orange-200 text-orange-700";
    buttonTheme = "bg-orange-500 hover:bg-orange-600 text-white shadow-orange-200";
    alertIcon = "⚠️";
    message = `WARNING! Sisa kuota menipis. Pemakaian mencapai ${Math.round(usageStats.percentage)}% (${usageStats.total}/${usageStats.limit}).`;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans flex flex-col">
      
      {/* --- Tumbuh AI Global Top Bar (Menempel di semua Dashboard Klien) --- */}
      <div className={`px-6 py-3 md:py-4 border-b flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm z-50 transition-colors duration-500 ${barTheme}`}>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="text-xl md:text-2xl animate-pulse">{alertIcon}</span>
          <div className="flex-1">
            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] opacity-80 italic">
              Tumbuh AI Monitoring System
            </p>
            <p className="text-xs md:text-sm font-bold mt-0.5 tracking-tight">
              {message}
            </p>
          </div>
        </div>
        
        <button 
          onClick={downloadClientReport}
          className={`w-full md:w-auto px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 whitespace-nowrap ${buttonTheme}`}
        >
          Download Laporan AI
        </button>
      </div>

      {/* --- Konten Dashboard Kustom --- */}
      <div className="flex-1 overflow-auto">
        {DashboardComponent}
      </div>

    </div>
  );
}