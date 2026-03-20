"use client";
import { useEffect, useState, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Link from "next/link";

const AVAILABLE_TOOLS = [
  { id: "check_stock", name: "Cek Stok Barang", category: "Gudang & Transaksi" },
  { id: "buat_pesanan", name: "Kasir & Checkout", category: "Gudang & Transaksi" },
  { id: "calculate_shipping", name: "Kalkulator Ongkir", category: "Gudang & Transaksi" },
  { id: "check_schedule", name: "Radar Jadwal", category: "Reservasi & Jasa" },
  { id: "make_booking", name: "Auto-Booking", category: "Reservasi & Jasa" },
  { id: "cancel_booking", name: "Batal / Reschedule", category: "Reservasi & Jasa" },
  { id: "calculate_custom_price", name: "Estimasi Harga Kustom", category: "Reservasi & Jasa" },
  { id: "check_order_status", name: "Pelacak Pesanan", category: "Pelanggan & CS" },
  { id: "register_member", name: "Daftar Member VIP", category: "Pelanggan & CS" },
  { id: "check_points", name: "Cek Poin & Promo", category: "Pelanggan & CS" },
  { id: "panggil_admin", name: "Panggil Admin (WA)", category: "Eskalasi Darurat" },
];

// [SECURITY PATCH 2]: Hapus NEXT_PUBLIC_ dari variabel env. 
// Jika ini dieksekusi di Client-Side, lebih aman di-hardcode langsung 
// atau ditaruh di dalam function saat cetak PDF saja agar tidak bocor di global window.
const INVOICE_CONFIG = {
  IDR_RATE: 0.015,
  BANK_NAME: "Bank BCA", 
  BANK_ACCOUNT: "123-456-7890 a/n Bryan Jacquellino"
};

export default function SuperAdminDashboard() {
  
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const [allStats, setAllStats] = useState<any[]>([]);
  const [adminLogs, setAdminLogs] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [adminEmail, setAdminEmail] = useState<string>("Unknown Admin");

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<{id: string, name: string} | null>(null);
  const [challengeInput, setChallengeInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const [isToolModalOpen, setIsToolModalOpen] = useState(false);
  const [selectedClientForTools, setSelectedClientForTools] = useState<{id: string, name: string, activeTools: string[]} | null>(null);

  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void} | null>(null);
  const [inputModal, setInputModal] = useState<{isOpen: boolean, title: string, message: string, defaultValue: string, onSubmit: (val: string) => void} | null>(null);
  const [modalInputValue, setModalInputValue] = useState("");

  const getFormattedMonthName = (yearMonthStr: string) => {
    const [year, month] = yearMonthStr.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' });
  };

  const currentMonthName = getFormattedMonthName(selectedMonth);

  const planPrices: Record<string, number> = {
    "Basic": 499000,
    "Pro": 849000,
    "Enterprise": 2999000,
  };
  
  const logAdminAction = async (actionType: string, targetClient: string, details: string) => {
    try {
      const newLog = {
        admin_email: adminEmail,
        action_type: actionType,
        target_client: targetClient,
        details: details,
        created_at: new Date().toISOString()
      };
      await supabase.from("admin_logs").insert(newLog);
      setAdminLogs(prev => [newLog, ...prev].slice(0, 15)); 
    } catch (e) {
      console.error("Gagal mencatat log", e);
    }
  };

  const handleLogout = async () => {
    await logAdminAction("LOGOUT", "System", "Admin keluar dari dashboard");
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const changeClientPlan = (clientId: string, currentPlan: string, clientName: string, newPlan: string) => {
    if (currentPlan === newPlan) return;
    
    setConfirmModal({
      isOpen: true,
      title: "Ubah Paket Langganan",
      message: `Yakin ingin mengubah paket ${clientName} dari ${currentPlan} menjadi ${newPlan}?`,
      onConfirm: async () => {
        const { error } = await supabase.from("clients").update({ plan_type: newPlan }).eq("id", clientId);
        if (!error) {
          setAllStats(prev => prev.map(stat => stat.id === clientId ? { ...stat, plan: newPlan } : stat));
          logAdminAction("UPDATE_PLAN", clientName, `Ubah paket langganan: ${currentPlan} -> ${newPlan}`);
        } else {
          alert("Gagal merubah paket: " + error.message);
        }
        setConfirmModal(null);
      }
    });
  };

  const toggleSuspend = (clientId: string, isCurrentlyActive: boolean, clientName: string) => {
    const newStatus = !isCurrentlyActive;
    const msg = newStatus ? "Aktifkan ulang layanan untuk klien ini?" : "SUSPEND klien ini? (Bot mati total!)";
    
    setConfirmModal({
      isOpen: true,
      title: newStatus ? "Aktivasi Layanan" : "Suspend Layanan",
      message: msg,
      onConfirm: async () => {
        const { error } = await supabase.from("clients").update({ is_active: newStatus }).eq("id", clientId);
        if (!error) {
          setAllStats(prev => prev.map(stat => stat.id === clientId ? { ...stat, isActive: newStatus } : stat));
          logAdminAction("TOGGLE_SUSPEND", clientName, `Status klien diubah jadi: ${newStatus ? 'ACTIVE' : 'SUSPENDED'}`);
        }
        setConfirmModal(null);
      }
    });
  };

  const adjustChatLimit = (clientId: string, currentLimit: number, clientName: string) => {
    setModalInputValue(currentLimit.toString());
    setInputModal({
      isOpen: true,
      title: "Ubah Limit Chat",
      message: `Masukkan batas chat bulanan baru untuk klien ${clientName}:`,
      defaultValue: currentLimit.toString(),
      onSubmit: async (inputValue) => {
        const newLimit = parseInt(inputValue);
        if (isNaN(newLimit) || newLimit < 0) {
          alert("Masukkan angka yang valid!");
          return;
        }
        const { error } = await supabase.from("clients").update({ monthly_limit: newLimit }).eq("id", clientId);
        if (!error) {
          setAllStats(prev => prev.map(stat => stat.id === clientId ? { ...stat, limit: newLimit } : stat));
          logAdminAction("ADJUST_LIMIT", clientName, `Ubah limit bulanan: ${currentLimit} -> ${newLimit}`);
        }
        setInputModal(null);
      }
    });
  };

  const openToolModal = (client: any) => {
    setSelectedClientForTools({ 
      id: client.id, 
      name: client.name, 
      activeTools: client.activeTools || [] 
    });
    setIsToolModalOpen(true);
  };

  const toggleAgenticTool = async (toolId: string) => {
    if (!selectedClientForTools) return;
    
    const clientId = selectedClientForTools.id;
    const isCurrentlyActive = selectedClientForTools.activeTools.includes(toolId);
    const newStatus = !isCurrentlyActive;
    
    const previousTools = [...selectedClientForTools.activeTools];

    const updatedTools = newStatus 
      ? [...selectedClientForTools.activeTools, toolId] 
      : selectedClientForTools.activeTools.filter(t => t !== toolId);
    
    setSelectedClientForTools({ ...selectedClientForTools, activeTools: updatedTools });
    setAllStats(prev => prev.map(s => s.id === clientId ? { ...s, activeTools: updatedTools } : s));

    const { data: existing } = await supabase
      .from("client_agentic_tools")
      .select("id")
      .eq("client_id", clientId)
      .eq("tool_name", toolId)
      .maybeSingle();

    let dbError = null;
    if (existing) {
      const { error } = await supabase.from("client_agentic_tools").update({ is_active: newStatus }).eq("id", existing.id);
      dbError = error;
    } else {
      const { error } = await supabase.from("client_agentic_tools").insert({ client_id: clientId, tool_name: toolId, is_active: newStatus });
      dbError = error;
    }

    if (dbError) {
       setSelectedClientForTools({ ...selectedClientForTools, activeTools: previousTools });
       setAllStats(prev => prev.map(s => s.id === clientId ? { ...s, activeTools: previousTools } : s));
       alert("Gagal mengubah status tool: " + dbError.message);
    } else {
       logAdminAction("TOGGLE_AI_TOOL", selectedClientForTools.name, `${newStatus ? 'MENGAKTIFKAN' : 'MEMATIKAN'} Alat AI: ${toolId}`);
    }
  };

  const toggleAddon = async (clientId: string, currentFeatures: any, status: boolean, clientName: string) => {
    const safeFeatures = currentFeatures && typeof currentFeatures === 'object' ? currentFeatures : {};
    const updatedFeatures = { ...safeFeatures, has_addon: status };
    const { error } = await supabase.from("clients").update({ features: updatedFeatures }).eq("id", clientId);
    if (!error) {
      setAllStats(prev => prev.map(stat => stat.id === clientId ? { ...stat, features: updatedFeatures } : stat));
      logAdminAction("TOGGLE_ADDON", clientName, `Mengubah Addon UI: ${status ? 'ON' : 'OFF'}`);
    }
  };

  const adjustPremiumQuota = async (clientId: string, currentQuota: number, amount: number, clientName: string) => {
    const newQuota = Math.max(0, (currentQuota || 0) + amount); 
    if (newQuota === currentQuota) return;
    setAllStats(prev => prev.map(stat => stat.id === clientId ? { ...stat, premiumQuota: newQuota } : stat));
    const { error } = await supabase.from("clients").update({ premium_quota_left: newQuota }).eq("id", clientId);
    if (error) {
      setAllStats(prev => prev.map(stat => stat.id === clientId ? { ...stat, premiumQuota: currentQuota } : stat));
    } else {
      logAdminAction("ADJUST_QUOTA", clientName, `Ubah kuota premium: ${currentQuota} -> ${newQuota}`);
    }
  };

  const openDeleteModal = (id: string, name: string) => {
    setClientToDelete({ id, name });
    setChallengeInput("");
    setIsModalOpen(true);
  };

  const executeDelete = async () => {
    if (!clientToDelete || challengeInput !== `MUSNAHKAN ${clientToDelete.name}`) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("clients").delete().eq("id", clientToDelete.id);
      if (error) throw error;
      setAllStats(prev => prev.filter(stat => stat.id !== clientToDelete.id));
      logAdminAction("DELETE_CLIENT", clientToDelete.name, "MENGHAPUS PERMANEN KLIEN DARI DATABASE ☢️");
      setIsModalOpen(false);
      setClientToDelete(null);
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    async function fetchMasterData() {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
         window.location.href = "/login";
         return;
      }
      
      // ====================================================================
      // [SECURITY PATCH 1]: VERIFIKASI ROLE SUPER ADMIN (OPSI 2 - SCALABLE)
      // ====================================================================
      const { data: adminCheck } = await supabase
        .from("clients")
        .select("role")
        .eq("id", user.id) // <--- Cek berdasarkan UUID Auth Bos
        .maybeSingle();

      // Jika role bukan 'super_admin' (atau datanya tidak ada), DITENDANG KELUAR!
      if (!adminCheck || adminCheck.role !== "super_admin") {
        console.warn("🛡️ SECURITY ALERT: Akses Ilegal Ditolak!");
        window.location.href = "/dashboard/leads"; 
        return;
      }
      // ====================================================================

      setAdminEmail(user.email || "Unknown Admin");

      const [year, month] = selectedMonth.split('-');
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1).toISOString();
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59).toISOString();
      
      const { data: clientsData } = await supabase.from("clients").select("*");
      const { data: logsData } = await supabase.from("usage_logs").select("total_tokens, client_id").gte("created_at", startDate).lte("created_at", endDate);
      const { data: adminLogsData } = await supabase.from("admin_logs").select("*").order("created_at", { ascending: false }).limit(15);
      const { data: toolsData } = await supabase.from("client_agentic_tools").select("*").eq("is_active", true);

      if (adminLogsData) setAdminLogs(adminLogsData);

      if (clientsData) {
        const stats = clientsData.map(client => {
          const clientLogs = logsData?.filter(log => log.client_id === client.id) || [];
          const totalTokens = clientLogs.reduce((sum, log) => sum + (log.total_tokens || 0), 0);
          const totalChat = clientLogs.length;

          const clientActiveTools = toolsData?.filter(t => t.client_id === client.id).map(t => t.tool_name) || [];

          const avgTokensPerChat = totalChat > 0 ? totalTokens / totalChat : 0;
          const actualCostPerChat = avgTokensPerChat * INVOICE_CONFIG.IDR_RATE;
          const calculatedOverlimitPrice = Math.ceil((actualCostPerChat * 5) / 100) * 100;
          const finalOverlimitPrice = Math.max(500, calculatedOverlimitPrice);

          const overCount = Math.max(0, totalChat - (client.monthly_limit || 1000));
          const totalOverlimitCharge = overCount * finalOverlimitPrice;

          return {
            id: client.id,
            name: client.name || "Unknown Business",
            totalTokens,
            totalChat,
            limit: client.monthly_limit || 1000,
            plan: client.plan_type || "Basic",
            features: client.features || {},
            premiumQuota: client.premium_quota_left || 0,
            isActive: client.is_active !== false,
            activeTools: clientActiveTools,
            overlimitPricePerChat: finalOverlimitPrice,
            totalOverlimitCharge: totalOverlimitCharge
          };
        });
        setAllStats(stats);
      }
      setLoading(false);
    }
    fetchMasterData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]); 

  const grandTotalTokens = allStats.reduce((acc, curr) => acc + curr.totalTokens, 0);
  const grandTotalChats = allStats.reduce((acc, curr) => acc + curr.totalChat, 0);
  const totalCostIDR = grandTotalTokens * INVOICE_CONFIG.IDR_RATE;

  const activeClients = allStats.filter(c => c.isActive);
  const baseSubscriptionRevenue = activeClients.reduce((acc, curr) => acc + (planPrices[curr.plan] || planPrices["Basic"]), 0);
  const totalOverlimitRevenue = activeClients.reduce((acc, curr) => acc + curr.totalOverlimitCharge, 0);

  const totalRevenue = baseSubscriptionRevenue + totalOverlimitRevenue;
  const netProfit = totalRevenue - totalCostIDR;

  const filteredAndSortedStats = useMemo(() => {
    return allStats
      .filter(stat => stat.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === "chat") return b.totalChat - a.totalChat;
        if (sortBy === "tokens") return b.totalTokens - a.totalTokens;
        if (sortBy === "quota") return a.premiumQuota - b.premiumQuota;
        return a.name.localeCompare(b.name);
      });
  }, [allStats, searchTerm, sortBy]);

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Tumbuh AI - Master Usage Report", 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Periode Bulan: ${currentMonthName}`, 14, 30);
    doc.text(`Total Pemasukan (MRR + Denda): Rp${totalRevenue.toLocaleString('id-ID')}`, 14, 35);
    doc.text(`Estimasi Biaya Cloud Server: Rp${totalCostIDR.toLocaleString('id-ID', { minimumFractionDigits: 0 })}`, 14, 40);

    const tableRows = filteredAndSortedStats.map((stat, index) => [
      index + 1,
      stat.name,
      stat.plan,
      `${stat.totalChat} / ${stat.limit}`,
      `Rp${stat.totalOverlimitCharge.toLocaleString('id-ID')}`, 
      stat.totalTokens.toLocaleString(),
      stat.isActive ? "ACTIVE" : "SUSPENDED"
    ]);

    autoTable(doc, {
      startY: 50,
      head: [['No', 'Bisnis', 'Paket', 'Chat/Limit', 'Denda Overlimit', 'Tokens', 'Status']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
    });

    logAdminAction("DOWNLOAD_REPORT", "Global", `Mencetak PDF Laporan Global untuk bulan ${currentMonthName}`);
    doc.save(`Laporan_TumbuhAI_${currentMonthName}.pdf`);
  };

  const downloadClientBilling = (client: any) => {
    const doc = new jsPDF();
    const overCount = Math.max(0, client.totalChat - client.limit);
    const clientPlanPrice = planPrices[client.plan] || planPrices["Basic"];

    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235);
    doc.text("TUMBUH AI", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Layanan AI Chatbot Otomatis • Babarsari, Yogyakarta", 14, 26);
    doc.line(14, 30, 196, 30);

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`INVOICE TAGIHAN - ${client.name.toUpperCase()}`, 14, 40);
    doc.setFontSize(10);
    doc.text(`Periode Tagihan : ${currentMonthName}`, 14, 47);
    doc.text(`Paket Langganan : ${client.plan}`, 14, 52);

    autoTable(doc, {
      startY: 60,
      head: [['Deskripsi Layanan', 'Volume', 'Subtotal']],
      body: [
        [`Langganan Paket ${client.plan}`, '-', `Rp${clientPlanPrice.toLocaleString('id-ID')}`],
        ['Batas Kuota Bulanan', `${client.limit} Chat`, '-'],
        [`Kelebihan Pemakaian (Rp${client.overlimitPricePerChat}/chat)`, `${overCount} Chat`, `Rp${client.totalOverlimitCharge.toLocaleString('id-ID')}`],
        ['Sisa Kuota Premium Addons', `${client.premiumQuota} Actions`, '-'],
      ],
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL TAGIHAN: Rp${(clientPlanPrice + client.totalOverlimitCharge).toLocaleString('id-ID')}`, 14, finalY);

    doc.setFontSize(10);
    doc.setTextColor(50);
    doc.text("Silakan transfer ke rekening berikut sebelum tanggal 5:", 14, finalY + 15);
    doc.setFont("helvetica", "normal");
    
    // [SECURITY PATCH 2: PANGGIL VARIABEL STATIS]
    doc.text(`${INVOICE_CONFIG.BANK_NAME}: ${INVOICE_CONFIG.BANK_ACCOUNT}`, 14, finalY + 20);
    
    logAdminAction("DOWNLOAD_INVOICE", client.name, `Mencetak Invoice Tagihan untuk bulan ${currentMonthName}`);
    doc.save(`Invoice_${client.name}_${currentMonthName}.pdf`);
  };

  const getActionColor = (type: string) => {
    if (type === 'DELETE_CLIENT') return 'bg-red-100 text-red-600 border-red-200';
    if (type === 'TOGGLE_SUSPEND') return 'bg-orange-100 text-orange-600 border-orange-200';
    if (type.includes('ADJUST')) return 'bg-blue-100 text-blue-600 border-blue-200';
    if (type === 'TOGGLE_ADDON') return 'bg-emerald-100 text-emerald-600 border-emerald-200';
    if (type === 'TOGGLE_AI_TOOL') return 'bg-indigo-100 text-indigo-600 border-indigo-200';
    if (type === 'UPDATE_PLAN') return 'bg-purple-100 text-purple-600 border-purple-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#0a0f1c] to-slate-900 p-4 md:p-8 font-sans pb-20 relative overflow-hidden text-slate-200">
      
      {/* 1. CONFIRM MODAL */}
      {confirmModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-slate-800 mb-2">{confirmModal.title}</h3>
            <p className="text-sm font-medium text-slate-500 mb-8">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal(null)} className="flex-1 py-3 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all">Batal</button>
              <button onClick={confirmModal.onConfirm} className="flex-1 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all">Ya, Lanjutkan</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. INPUT PROMPT MODAL */}
      {inputModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-slate-800 mb-2">{inputModal.title}</h3>
            <p className="text-sm font-medium text-slate-500 mb-4">{inputModal.message}</p>
            <input 
              type="number" 
              value={modalInputValue} 
              onChange={(e) => setModalInputValue(e.target.value)} 
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-3 px-4 font-bold text-slate-800 focus:border-blue-500 outline-none mb-8"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setInputModal(null)} className="flex-1 py-3 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all">Batal</button>
              <button onClick={() => inputModal.onSubmit(modalInputValue)} className="flex-1 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all">Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KELOLA AI TOOLS */}
      {isToolModalOpen && selectedClientForTools && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            
            <div className="bg-slate-900 p-6 md:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 relative">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-3">
                  🤖 Agentic Tools Manager
                </h2>
                <p className="text-slate-400 mt-1 font-medium text-sm md:text-base">Klien: <span className="text-blue-400 font-bold">{selectedClientForTools.name}</span></p>
              </div>
              <button onClick={() => setIsToolModalOpen(false)} className="absolute top-6 right-6 sm:relative sm:top-auto sm:right-auto w-10 h-10 bg-slate-800 text-slate-400 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-all">
                ✕
              </button>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-slate-50">
              <p className="text-xs md:text-sm font-bold mb-6 bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl">
                💡 <span className="font-black">Dynamic Loading:</span> AI klien ini hanya akan disuntikkan tool yang berstatus ON. Perubahan otomatis tersimpan ke Database.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {AVAILABLE_TOOLS.map((tool) => {
                  const isActive = selectedClientForTools.activeTools.includes(tool.id);
                  return (
                    <div key={tool.id} className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${isActive ? 'bg-white border-blue-500 shadow-md' : 'bg-white border-slate-200 opacity-60 hover:opacity-100'}`}>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{tool.category}</span>
                        <h4 className="font-black text-slate-800 text-base md:text-lg mt-1">{tool.name}</h4>
                        <code className="text-[10px] md:text-xs text-slate-400 mt-1 block">{tool.id}</code>
                      </div>
                      
                      <button onClick={() => toggleAgenticTool(tool.id)} className={`relative w-14 h-8 rounded-full transition-colors duration-300 focus:outline-none shrink-0 ${isActive ? 'bg-blue-500' : 'bg-slate-300'}`}>
                        <span className={`absolute left-1 top-1 w-6 h-6 bg-white rounded-full transition-transform duration-300 shadow-sm ${isActive ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="bg-white border-t border-slate-200 p-4 md:p-6 flex justify-end shrink-0">
              <button onClick={() => setIsToolModalOpen(false)} className="w-full sm:w-auto bg-slate-900 text-white font-bold px-8 py-3 rounded-xl hover:bg-slate-800 transition-all">
                Selesai & Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NUCLEAR DELETE MODAL */}
      {isModalOpen && clientToDelete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2rem] md:rounded-[3rem] shadow-[0_0_100px_rgba(220,38,38,0.5)] border-[4px] md:border-[6px] border-red-600 overflow-hidden animate-in zoom-in slide-in-from-bottom-10 duration-500">
            <div className="bg-red-600 p-8 md:p-10 text-white text-center">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <svg className="w-10 h-10 md:w-12 md:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter leading-none">Konfirmasi Pemusnahan</h2>
              <p className="text-red-100 text-[10px] md:text-xs mt-3 font-bold uppercase tracking-widest opacity-80">Data tidak akan bisa dipulihkan kembali!</p>
            </div>
            <div className="p-6 md:p-10">
              <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 text-center">Tulis mantra ini untuk menghapus <span className="text-slate-900 underline">{clientToDelete.name}</span>:</p>
              <div className="bg-red-50 p-4 rounded-xl md:rounded-2xl border-2 border-dashed border-red-200 mb-6 text-center select-none">
                <span className="text-red-600 font-black text-base md:text-lg italic tracking-tight">MUSNAHKAN {clientToDelete.name}</span>
              </div>
              <input 
                type="text" placeholder="Ketik di sini..." value={challengeInput} onChange={(e) => setChallengeInput(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-4 px-4 font-black text-center text-slate-800 outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 transition-all mb-6 placeholder:text-slate-300"
              />
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                <button onClick={() => setIsModalOpen(false)} className="w-full sm:flex-1 bg-slate-100 text-slate-500 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all active:scale-95">Batal</button>
                <button onClick={executeDelete} disabled={challengeInput !== `MUSNAHKAN ${clientToDelete.name}` || isDeleting} className="w-full sm:flex-[1.5] bg-red-600 text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-red-300 hover:bg-red-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none transition-all flex items-center justify-center gap-2 active:scale-95">
                  {isDeleting ? "Mengahancurkan..." : "🔥 Eksekusi"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[95rem] mx-auto">
        <header className="mb-8 md:mb-10 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-blue-500 tracking-tighter italic drop-shadow-lg">
              Tumbuh <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]">Master</span>
            </h1>
            <p className="text-slate-500 text-xs md:text-base font-medium tracking-tight mt-1">Tumbuh Intelligence Core Engine</p>
          </div>
          
          <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto">
             <div className="flex flex-1 sm:flex-none items-center gap-2 bg-white px-3 py-2.5 md:px-4 md:py-3 rounded-xl shadow-sm border border-slate-200">
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:inline">Periode:</span>
               <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="text-xs md:text-sm font-black text-blue-600 outline-none cursor-pointer bg-transparent w-full sm:w-auto" />
             </div>
             <button onClick={handleLogout} className="bg-white border border-slate-200 text-red-500 px-4 md:px-6 py-2.5 md:py-3.5 rounded-xl font-black hover:bg-red-50 transition-all text-[10px] uppercase tracking-wider shrink-0">Logout</button>
             <button onClick={generatePDF} className="flex-1 sm:flex-none bg-blue-600 text-white px-4 md:px-6 py-2.5 md:py-3.5 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all text-xs md:text-sm text-center">Unduh PDF</button>
             <Link href="/register" className="w-full sm:w-auto justify-center bg-slate-900 text-white px-4 md:px-6 py-2.5 md:py-3.5 rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all text-xs md:text-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg> Deploy Node
             </Link>
          </div>
        </header>

        {/* FINANCIAL DASHBOARD */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
            <div className="bg-white p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-xl border border-white">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                  <span className="flex items-center gap-2"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg> Global Chats</span>
                  <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[8px]">{currentMonthName}</span>
                </p>
                <h2 className="text-3xl md:text-4xl font-black mt-2 text-slate-900 tracking-tighter">{grandTotalChats.toLocaleString()}</h2>
            </div>
            
            <div className="bg-white p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-xl border border-white">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center justify-between">
                  <span className="flex items-center gap-2"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> API Cost</span>
                  <span className="bg-blue-50 text-blue-500 px-2 py-0.5 rounded text-[8px]">{currentMonthName}</span>
                </p>
                <h2 className="text-2xl md:text-3xl font-black mt-2 text-slate-700 tracking-tighter">Rp{totalCostIDR.toLocaleString('id-ID', { minimumFractionDigits: 0 })}</h2>
            </div>
            
            <div className="bg-white p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex justify-between items-center">
                  <span>Gross Revenue (MRR)</span>
                  <span className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded text-[8px] hidden lg:block">{currentMonthName}</span>
                </p>
                <h2 className="text-2xl md:text-3xl font-black mt-2 text-emerald-600 tracking-tighter">Rp{totalRevenue.toLocaleString('id-ID')}</h2>
                {totalOverlimitRevenue > 0 && <p className="text-[9px] text-emerald-500/70 font-bold mt-1">+Rp{totalOverlimitRevenue.toLocaleString('id-ID')} dari denda overlimit</p>}
            </div>
            
            <div className="bg-slate-900 p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl text-white relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl"></div>
                <p className="text-[10px] font-black opacity-50 uppercase tracking-widest flex justify-between items-center">
                  <span>Est. Net Profit</span>
                  <span className="bg-white/10 px-2 py-0.5 rounded text-[8px] hidden lg:block">{currentMonthName}</span>
                </p>
                <h2 className="text-3xl md:text-4xl font-black mt-2 tracking-tighter text-emerald-400">Rp{netProfit.toLocaleString('id-ID', { minimumFractionDigits: 0 })}</h2>
            </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-6">
          <div className="w-full sm:flex-1 relative">
            <input type="text" placeholder="Cari nama bisnis klien..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white border-none shadow-md rounded-xl md:rounded-2xl py-3.5 md:py-4 px-4 md:px-6 text-sm md:text-base font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full sm:w-auto bg-white border-none shadow-md rounded-xl md:rounded-2xl py-3.5 md:py-4 px-4 md:px-6 text-sm md:text-base font-bold text-slate-600 outline-none cursor-pointer appearance-none">
            <option value="name">Urutkan: Nama (A-Z)</option>
            <option value="chat">Paling Banyak Chat</option>
            <option value="tokens">Resource Terbesar</option>
            <option value="quota">Sisa Quota Terdikit</option>
          </select>
        </div>

        {/* TABEL UTAMA KLIEN */}
        <div className="bg-white rounded-[1.5rem] md:rounded-[3rem] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] border border-slate-100 relative overflow-hidden mb-8 md:mb-12">
          
          {/* PEMBUNGKUS SCROLL (Max Height + Auto Y/X) */}
          <div className="overflow-x-auto overflow-y-auto max-h-[500px] md:max-h-[600px] custom-scrollbar scroll-smooth relative z-10">
            <table className="w-full text-left text-sm min-w-[1000px] border-collapse">
              
              {/* STICKY HEADER - Akan terus menempel di atas saat di-scroll */}
              <thead className="sticky top-0 z-30">
                <tr className="bg-slate-50/95 backdrop-blur-md text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] shadow-sm">
                  <th className="px-4 py-5 md:px-6 md:py-6 border-b border-slate-200 whitespace-nowrap">Klien & Status</th>
                  <th className="px-4 py-5 md:px-6 md:py-6 border-b border-slate-200 text-center whitespace-nowrap">Chat / Limit</th>
                  <th className="px-4 py-5 md:px-6 md:py-6 border-b border-slate-200 text-center whitespace-nowrap">Premium Quota</th>
                  <th className="px-4 py-5 md:px-6 md:py-6 border-b border-slate-200 text-center whitespace-nowrap">AI Capabilities</th> 
                  <th className="px-4 py-5 md:px-6 md:py-6 border-b border-slate-200 text-right whitespace-nowrap">Tokens Used</th>
                  <th className="px-4 py-5 md:px-6 md:py-6 border-b border-slate-200 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={6} className="p-16 md:p-24 text-center font-black text-slate-300 animate-pulse uppercase tracking-widest">Memuat Radar Klien...</td></tr>
                ) : filteredAndSortedStats.length === 0 ? (
                  <tr><td colSpan={6} className="p-16 md:p-24 text-center font-bold text-slate-400">Tidak ada klien yang cocok dengan pencarian.</td></tr>
                ) : filteredAndSortedStats.map((stat) => {
                  const overCount = Math.max(0, stat.totalChat - stat.limit);
                  return (
                    <tr key={stat.id} className={`transition-all duration-300 ${!stat.isActive ? 'bg-red-50/30 opacity-75' : 'hover:bg-blue-50/30'}`}>
                      <td className="px-4 py-5 md:px-6 md:py-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-[180px]">
                            <p className="font-black text-slate-800 text-base md:text-lg tracking-tight flex flex-wrap items-center gap-2">
                              {stat.name}
                              {!stat.isActive && <span className="text-[8px] bg-red-600 text-white px-2 py-0.5 rounded uppercase tracking-widest shrink-0 shadow-sm">Suspended</span>}
                            </p>
                            
                            <div className="mt-1.5">
                              <select 
                                value={stat.plan}
                                onChange={(e) => changeClientPlan(stat.id, stat.plan, stat.name, e.target.value)}
                                className="text-[10px] font-black text-blue-700 uppercase bg-blue-50/80 px-2 py-1.5 rounded cursor-pointer outline-none border border-blue-200 hover:border-blue-400 hover:bg-blue-100 transition-all shadow-sm"
                              >
                                <option value="Basic">Basic</option>
                                <option value="Pro">Pro</option>
                                <option value="Enterprise">Enterprise</option>
                              </select>
                            </div>
                          </div>
                          <button onClick={() => toggleSuspend(stat.id, stat.isActive, stat.name)} className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shadow-md transition-all shrink-0 ${stat.isActive ? 'bg-red-50 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-green-500 text-white hover:bg-green-600'}`} title={stat.isActive ? "Suspend Klien" : "Aktifkan Klien"}>
                            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          </button>
                        </div>
                      </td>
                      
                      <td className="px-4 py-5 md:px-6 md:py-6 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          <span className={`font-mono font-black text-base md:text-xl ${overCount > 0 ? 'text-red-600' : 'text-slate-700'}`}>
                            {stat.totalChat} <span className="text-xs md:text-sm font-medium text-slate-400">/ {stat.limit}</span>
                          </span>
                          <button onClick={() => adjustChatLimit(stat.id, stat.limit, stat.name)} className="text-[9px] font-black text-blue-500 bg-blue-50 px-2.5 py-1 rounded-md hover:bg-blue-600 hover:text-white transition-colors">Ubah Limit</button>
                        </div>
                        {overCount > 0 && <p className="text-[9px] font-black text-red-500 mt-2 bg-red-50 py-1 px-2.5 rounded-md inline-block shadow-sm">Denda: Rp {stat.overlimitPricePerChat}/chat</p>}
                      </td>
                      
                      <td className="px-4 py-5 md:px-6 md:py-6">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Left</p>
                          <div className="flex items-center justify-center gap-1.5 md:gap-2 bg-slate-50/80 border border-slate-200 rounded-xl p-1 shadow-inner">
                            <button onClick={() => adjustPremiumQuota(stat.id, stat.premiumQuota, -1, stat.name)} disabled={stat.premiumQuota <= 0} className="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center bg-white text-slate-500 rounded-lg hover:bg-red-50 hover:text-red-500 disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-slate-500 shadow-sm transition-all font-bold text-base md:text-xl leading-none shrink-0">−</button>
                            <span className={`font-black font-mono text-[14px] md:text-[16px] w-6 md:w-8 text-center ${stat.premiumQuota <= 2 ? 'text-red-600 animate-pulse' : 'text-slate-700'}`}>{stat.premiumQuota}</span>
                            <button onClick={() => adjustPremiumQuota(stat.id, stat.premiumQuota, 1, stat.name)} className="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center bg-white text-slate-500 rounded-lg hover:bg-green-50 hover:text-green-500 shadow-sm transition-all font-bold text-base md:text-xl leading-none shrink-0">+</button>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-5 md:px-6 md:py-6 text-center">
                        <div className="flex flex-col items-center gap-2 min-w-[130px]">
                          <button onClick={() => toggleAddon(stat.id, stat.features, !stat.features?.has_addon, stat.name)} className={`w-full text-[9px] md:text-[10px] font-black px-3 md:px-4 py-2.5 rounded-xl uppercase transition-all shadow-sm ${stat.features?.has_addon ? 'bg-green-500 text-white' : 'bg-white text-slate-400 border border-slate-200 hover:border-blue-400 hover:text-blue-500'}`}>
                            {stat.features?.has_addon ? "● Addon UI: ON" : "○ Addon UI: OFF"}
                          </button>
                          
                          <button onClick={() => openToolModal(stat)} className="w-full bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-600 hover:text-white text-[9px] md:text-[10px] font-black px-3 md:px-4 py-2.5 rounded-xl uppercase transition-all shadow-sm flex items-center justify-center gap-1.5 md:gap-2">
                            🤖 Tools ({stat.activeTools?.length || 0})
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-5 md:px-6 md:py-6 text-right font-mono font-black text-blue-600 text-lg md:text-xl">{stat.totalTokens.toLocaleString()}</td>
                      
                      <td className="px-4 py-5 md:px-6 md:py-6 text-right">
                         <div className="flex flex-col items-end gap-2.5 min-w-[120px]">
                            <button onClick={() => downloadClientBilling(stat)} className="bg-slate-900 text-white text-[9px] md:text-[10px] font-bold px-3 md:px-4 py-2.5 rounded-lg hover:bg-blue-600 transition-colors shadow-md w-full">Cetak Invoice</button>
                            <button onClick={() => openDeleteModal(stat.id, stat.name)} className="bg-white border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 text-[9px] md:text-[10px] font-bold px-3 md:px-4 py-2.5 rounded-lg transition-colors shadow-sm w-full flex justify-center items-center gap-1.5">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> Hapus
                            </button>
                         </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* EFEK FADE BOTTOM (Gradasi Putih Transparan) Biar Scroll-nya Elegan */}
          <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white to-transparent pointer-events-none z-20"></div>
          
        </div>

        {/* ========================================================
            TABEL SYSTEM AUDIT TRAIL (LOG AKTIVITAS ADMIN)
        ======================================================== */}
        <div className="bg-gradient-to-b from-slate-900 to-[#0a0a0e] rounded-[1.5rem] md:rounded-[3rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-slate-800 overflow-hidden relative group">
           
           {/* EFEK BACKGROUND PREMIUM (Glow & Texture) */}
           <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/15 rounded-full blur-[100px] pointer-events-none transition-all duration-1000 group-hover:bg-blue-500/20"></div>
           <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none"></div>
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none"></div>
           
           {/* HEADER BAGIAN LOGS */}
           <div className="p-6 md:p-8 border-b border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10 bg-slate-900/50 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl md:rounded-2xl flex items-center justify-center border border-slate-700/50 shadow-inner">
                    <svg className="w-5 h-5 md:w-6 md:h-6 text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.5)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                 </div>
                 <div>
                    <h3 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight italic">System Audit Trail</h3>
                    <p className="text-slate-500 text-[10px] md:text-xs font-bold mt-0.5 tracking-wide">LIVE MONITORING KENDALI ADMIN</p>
                 </div>
              </div>
              <div className="flex items-center gap-2.5 bg-slate-950/50 px-3 py-1.5 rounded-full border border-slate-800 shadow-inner">
                 <span className="relative flex h-2.5 w-2.5">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                 </span>
                 <span className="text-[10px] font-black text-green-400 uppercase tracking-widest shadow-green-500">Active</span>
              </div>
           </div>

           {/* AREA TABEL DENGAN VERTICAL & HORIZONTAL SCROLL + STICKY HEADER */}
           <div className="overflow-x-auto overflow-y-auto max-h-[450px] relative z-10 custom-scrollbar scroll-smooth">
              <table className="w-full text-left text-sm min-w-[850px] border-collapse">
                 <thead className="sticky top-0 z-20">
                    <tr className="bg-slate-900/95 backdrop-blur-md text-[10px] text-slate-400 uppercase font-black tracking-[0.2em] shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                       <th className="px-6 py-5 md:px-8 border-b border-slate-700/50 whitespace-nowrap">Waktu Eksekusi</th>
                       <th className="px-6 py-5 md:px-8 border-b border-slate-700/50 whitespace-nowrap">Pelaku (Admin)</th>
                       <th className="px-6 py-5 md:px-8 border-b border-slate-700/50 whitespace-nowrap">Tindakan</th>
                       <th className="px-6 py-5 md:px-8 border-b border-slate-700/50 whitespace-nowrap">Target Klien</th>
                       <th className="px-6 py-5 md:px-8 border-b border-slate-700/50">Detail Perubahan</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-white/5">
                    {adminLogs.length === 0 ? (
                       <tr>
                          <td colSpan={5} className="p-16 text-center">
                             <div className="flex flex-col items-center justify-center opacity-50">
                                <svg className="w-12 h-12 text-slate-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                                <span className="text-slate-400 font-bold tracking-widest text-xs uppercase">Sistem Bersih. Belum ada aktivitas.</span>
                             </div>
                          </td>
                       </tr>
                    ) : adminLogs.map((log) => (
                       <tr key={log.created_at} className="hover:bg-gradient-to-r hover:from-blue-900/20 hover:to-transparent transition-all duration-200 group/row">
                          <td className="px-6 md:px-8 py-5 text-slate-400 text-[11px] font-mono whitespace-nowrap group-hover/row:text-slate-300">
                             {new Date(log.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-6 md:px-8 py-5 text-slate-300 font-bold text-xs whitespace-nowrap group-hover/row:text-white">
                             {log.admin_email}
                          </td>
                          <td className="px-6 md:px-8 py-5 whitespace-nowrap">
                             <span className={`text-[9px] font-black px-2.5 py-1.5 rounded-md border uppercase tracking-wider shadow-sm ${getActionColor(log.action_type)}`}>
                                {log.action_type.replace('_', ' ')}
                             </span>
                          </td>
                          <td className="px-6 md:px-8 py-5 text-slate-200 font-black text-xs whitespace-nowrap group-hover/row:text-blue-400 transition-colors">
                             {log.target_client}
                          </td>
                          <td className="px-6 md:px-8 py-5 text-slate-400 text-xs italic min-w-[250px] leading-relaxed group-hover/row:text-slate-300">
                             {log.details}
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
           
           {/* FADE BOTTOM EFFECT BIAR SCROLL TERLIHAT HALUS */}
           <div className="absolute bottom-0 left-0 w-full h-10 bg-gradient-to-t from-[#0a0a0e] to-transparent pointer-events-none z-30"></div>
        </div>

      </div>
    </div>
  );
}