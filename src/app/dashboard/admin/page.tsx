"use client";
import { useEffect, useState, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Link from "next/link";
import { 
  Building2, CreditCard, Receipt, FileText, 
  TerminalSquare, ShieldAlert, LogOut, Trash2, 
  Settings, Bot, Activity, PlusCircle
} from "lucide-react";

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

const INVOICE_CONFIG = {
  BANK_NAME: "Bank BCA", 
  BANK_ACCOUNT: "029-227-4945 a/n Bryan Jacquellino"
};

export default function BusinessAdminDashboard() {
  
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

  // MODAL STATES
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
    "Enterprise": 3500000,
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

  const impersonateClient = async (id: string, name: string) => {
    if (!confirm(`Masuk ke dashboard ${name}?`)) return;
    try {
      const res = await fetch("/dashboard/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: id }),
      });
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank"); 
      } else {
        alert("Error: " + data.error);
      }
    } catch (err) {
      alert("Koneksi Error!");
    }
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
      const res = await fetch("/dashboard/admin/delete-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: clientToDelete.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus klien.");

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
      if (!user) { window.location.href = "/login"; return; }
      
      const { data: adminCheck } = await supabase.from("clients").select("role").eq("id", user.id).maybeSingle();
      if (!adminCheck || adminCheck.role !== "super_admin") {
        window.location.href = "/dashboard/leads"; 
        return;
      }

      setAdminEmail(user.email || "Unknown Admin");

      const [year, month] = selectedMonth.split('-');
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1).toISOString();
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59).toISOString();
      
      const { data: clientsData } = await supabase.from("clients").select("*");
      // Hanya tarik client_id untuk menghitung total_chat buat tagihan (nggak perlu token lagi)
      const { data: logsData } = await supabase.from("usage_logs").select("client_id").gte("created_at", startDate).lte("created_at", endDate);
      const { data: adminLogsData } = await supabase.from("admin_logs").select("*").order("created_at", { ascending: false }).limit(15);
      const { data: toolsData } = await supabase.from("client_agentic_tools").select("*").eq("is_active", true);

      if (adminLogsData) setAdminLogs(adminLogsData);

      if (clientsData) {
        // ASUMSI HARGA TOKEN (Hanya dipakai untuk denda overlimit)
        const IDR_RATE = 0.015;

        const stats = clientsData.map(client => {
          const clientLogs = logsData?.filter(log => log.client_id === client.id) || [];
          const totalChat = clientLogs.length;
          const clientActiveTools = toolsData?.filter(t => t.client_id === client.id).map(t => t.tool_name) || [];

          // Hitungan denda overlimit (Disembunyikan detail tokennya, langsung ke harga chat)
          const avgTokensPerChat = 500; // Asumsi rata-rata untuk denda
          const actualCostPerChat = avgTokensPerChat * IDR_RATE;
          const calculatedOverlimitPrice = Math.ceil((actualCostPerChat * 5) / 100) * 100;
          const finalOverlimitPrice = Math.max(500, calculatedOverlimitPrice);

          const overCount = Math.max(0, totalChat - (client.monthly_limit || 1000));
          const totalOverlimitCharge = overCount * finalOverlimitPrice;

          return {
            id: client.id,
            name: client.name || "Unknown Business",
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
  }, [selectedMonth, supabase]); 

  // FINANCIAL AGGREGATIONS
  const activeClients = allStats.filter(c => c.isActive);
  const totalClientCount = allStats.length;
  const baseSubscriptionRevenue = activeClients.reduce((acc, curr) => acc + (planPrices[curr.plan] || planPrices["Basic"]), 0);
  const totalOverlimitRevenue = activeClients.reduce((acc, curr) => acc + curr.totalOverlimitCharge, 0);
  const totalRevenue = baseSubscriptionRevenue + totalOverlimitRevenue;

  const filteredAndSortedStats = useMemo(() => {
    return allStats
      .filter(stat => stat.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === "chat") return b.totalChat - a.totalChat;
        if (sortBy === "quota") return a.premiumQuota - b.premiumQuota;
        return a.name.localeCompare(b.name);
      });
  }, [allStats, searchTerm, sortBy]);

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Tumbuh AI - Business Report", 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Periode Bulan: ${currentMonthName}`, 14, 30);
    doc.text(`Total Pemasukan (MRR + Denda): Rp${totalRevenue.toLocaleString('id-ID')}`, 14, 35);

    const tableRows = filteredAndSortedStats.map((stat, index) => [
      index + 1,
      stat.name,
      stat.plan,
      `${stat.totalChat} / ${stat.limit}`,
      `Rp${stat.totalOverlimitCharge.toLocaleString('id-ID')}`, 
      stat.isActive ? "ACTIVE" : "SUSPENDED"
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['No', 'Bisnis', 'Paket', 'Chat/Limit', 'Denda Overlimit', 'Status']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
    });

    logAdminAction("DOWNLOAD_REPORT", "Global", `Mencetak PDF Laporan Global untuk bulan ${currentMonthName}`);
    doc.save(`Laporan_Bisnis_${currentMonthName}.pdf`);
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
    doc.text(`${INVOICE_CONFIG.BANK_NAME}: ${INVOICE_CONFIG.BANK_ACCOUNT}`, 14, finalY + 20);
    
    logAdminAction("DOWNLOAD_INVOICE", client.name, `Mencetak Invoice Tagihan untuk bulan ${currentMonthName}`);
    doc.save(`Invoice_${client.name}_${currentMonthName}.pdf`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans p-4 md:p-8 selection:bg-blue-500/30 relative overflow-hidden pb-20">
      
      {/* Background Effects (SuperAdmin Style) */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-blue-900/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[40vw] h-[40vw] bg-indigo-900/20 rounded-full blur-[120px] pointer-events-none"></div>

      {/* 1. CONFIRM MODAL (Dark Mode) */}
      {confirmModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-white mb-2">{confirmModal.title}</h3>
            <p className="text-sm font-medium text-slate-400 mb-8">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal(null)} className="flex-1 py-3 rounded-xl font-bold text-slate-400 bg-slate-800 hover:bg-slate-700 transition-all border border-slate-700">Batal</button>
              <button onClick={confirmModal.onConfirm} className="flex-1 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all">Ya, Lanjutkan</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. INPUT PROMPT MODAL (Dark Mode) */}
      {inputModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-white mb-2">{inputModal.title}</h3>
            <p className="text-sm font-medium text-slate-400 mb-4">{inputModal.message}</p>
            <input 
              type="number" 
              value={modalInputValue} 
              onChange={(e) => setModalInputValue(e.target.value)} 
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 px-4 font-bold text-white focus:border-blue-500 outline-none mb-8 placeholder:text-slate-600"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setInputModal(null)} className="flex-1 py-3 rounded-xl font-bold text-slate-400 bg-slate-800 hover:bg-slate-700 transition-all border border-slate-700">Batal</button>
              <button onClick={() => inputModal.onSubmit(modalInputValue)} className="flex-1 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all">Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* 3. TOOL MODAL (Dark Mode) */}
      {isToolModalOpen && selectedClientForTools && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            <div className="bg-slate-950 p-6 md:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 relative border-b border-slate-800">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-3">
                  <Bot className="w-6 h-6 text-indigo-400" /> Agentic Tools Manager
                </h2>
                <p className="text-slate-400 mt-1 font-medium text-sm md:text-base">Klien: <span className="text-indigo-400 font-bold">{selectedClientForTools.name}</span></p>
              </div>
              <button onClick={() => setIsToolModalOpen(false)} className="absolute top-6 right-6 sm:relative sm:top-auto sm:right-auto w-10 h-10 bg-slate-800 text-slate-400 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-all">
                ✕
              </button>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-slate-900/50">
              <p className="text-xs md:text-sm font-bold mb-6 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 p-4 rounded-xl flex gap-2">
                <span>💡</span> <span><span className="font-black text-indigo-400">Dynamic Loading:</span> AI klien ini hanya akan disuntikkan tool yang berstatus ON. Perubahan otomatis tersimpan ke Database.</span>
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {AVAILABLE_TOOLS.map((tool) => {
                  const isActive = selectedClientForTools.activeTools.includes(tool.id);
                  return (
                    <div key={tool.id} className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${isActive ? 'bg-slate-800 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-slate-900/50 border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-600'}`}>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">{tool.category}</span>
                        <h4 className="font-black text-slate-200 text-base md:text-lg mt-2">{tool.name}</h4>
                        <code className="text-[10px] md:text-xs text-slate-500 mt-1 block">{tool.id}</code>
                      </div>
                      
                      <button onClick={() => toggleAgenticTool(tool.id)} className={`relative w-14 h-8 rounded-full transition-colors duration-300 focus:outline-none shrink-0 ${isActive ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                        <span className={`absolute left-1 top-1 w-6 h-6 bg-white rounded-full transition-transform duration-300 shadow-sm ${isActive ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="bg-slate-950 border-t border-slate-800 p-4 md:p-6 flex justify-end shrink-0">
              <button onClick={() => setIsToolModalOpen(false)} className="w-full sm:w-auto bg-slate-800 text-white font-bold px-8 py-3 rounded-xl hover:bg-slate-700 transition-all border border-slate-700">
                Selesai & Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. NUCLEAR DELETE MODAL (Dark Mode) */}
      {isModalOpen && clientToDelete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-950 w-full max-w-md rounded-[2rem] shadow-[0_0_50px_rgba(220,38,38,0.3)] border border-red-900/50 overflow-hidden animate-in zoom-in slide-in-from-bottom-10 duration-500">
            <div className="bg-red-950/30 p-8 md:p-10 text-white text-center border-b border-red-900/30">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-red-900/50 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <Trash2 className="w-10 h-10 md:w-12 md:h-12 text-red-500" />
              </div>
              <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter text-red-500">Pemusnahan</h2>
              <p className="text-red-400 text-[10px] md:text-xs mt-3 font-bold uppercase tracking-widest opacity-80">Data tidak akan bisa dipulihkan kembali!</p>
            </div>
            <div className="p-6 md:p-10">
              <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 text-center">Tulis mantra ini untuk menghapus <span className="text-white underline">{clientToDelete.name}</span>:</p>
              <div className="bg-slate-900 p-4 rounded-xl md:rounded-2xl border border-dashed border-red-500/50 mb-6 text-center select-none">
                <span className="text-red-500 font-black text-base md:text-lg italic tracking-tight">MUSNAHKAN {clientToDelete.name}</span>
              </div>
              <input 
                type="text" placeholder="Ketik di sini..." value={challengeInput} onChange={(e) => setChallengeInput(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-4 px-4 font-black text-center text-white outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all mb-6 placeholder:text-slate-600"
              />
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                <button onClick={() => setIsModalOpen(false)} className="w-full sm:flex-1 bg-slate-800 text-slate-400 border border-slate-700 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-700 hover:text-white transition-all active:scale-95">Batal</button>
                <button onClick={executeDelete} disabled={challengeInput !== `MUSNAHKAN ${clientToDelete.name}` || isDeleting} className="w-full sm:flex-[1.5] bg-red-600 text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:bg-red-700 disabled:bg-slate-800 disabled:text-slate-600 disabled:shadow-none transition-all flex items-center justify-center gap-2 active:scale-95 border border-red-500 disabled:border-slate-800">
                  {isDeleting ? "Menghancurkan..." : "🔥 Eksekusi"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================================= */}
      {/* MAIN DASHBOARD UI */}
      {/* ================================================================================= */}

      <div className="max-w-[1600px] mx-auto relative z-10">
        
        {/* HEADER SECTION */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-10 pb-6 border-b border-slate-800 gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <TerminalSquare className="text-emerald-500 w-8 h-8" />
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase italic">
                Tumbuh <span className="text-emerald-500">AI</span> <span className="text-slate-600 font-light">| BUSINESS OPS</span>
              </h1>
            </div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.3em]">Client Management & Billing Center</p>
          </div>
          
          <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto">
            <div className="flex flex-1 sm:flex-none items-center gap-2 bg-slate-900 px-3 py-2.5 md:px-4 md:py-3 rounded-xl border border-slate-800">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden sm:inline">Periode:</span>
              <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="text-xs md:text-sm font-black text-emerald-400 outline-none cursor-pointer bg-transparent w-full sm:w-auto dark:[color-scheme:dark]" />
            </div>
            
            <button onClick={handleLogout} className="bg-slate-900 border border-slate-800 text-red-400 px-4 md:px-6 py-2.5 md:py-3.5 rounded-xl font-black hover:bg-slate-800 transition-all text-[10px] uppercase tracking-wider shrink-0">
              Logout
            </button>
            
            <button onClick={generatePDF} className="flex-1 sm:flex-none bg-slate-800 text-slate-300 border border-slate-700 px-4 md:px-6 py-2.5 md:py-3.5 rounded-xl font-bold hover:bg-slate-700 hover:text-white transition-all text-xs md:text-sm text-center flex items-center justify-center gap-2">
              <FileText className="w-4 h-4" /> PDF Global
            </button>

            {/* TELEMETRY LINK */}
            <Link href="/dashboard/admin/super-dashboard" className="w-full sm:w-auto justify-center bg-[#0a0f1c] text-blue-400 border border-blue-500/30 px-4 md:px-6 py-2.5 md:py-3.5 rounded-xl font-bold shadow-[0_0_15px_rgba(59,130,246,0.2)] hover:bg-blue-900 hover:text-white transition-all text-xs md:text-sm flex items-center gap-2">
              <Activity className="w-4 h-4" /> Telemetry
            </Link>

            {/* <Link href="/register" className="w-full sm:w-auto justify-center bg-emerald-600 text-white px-4 md:px-6 py-2.5 md:py-3.5 rounded-xl font-bold shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:bg-emerald-500 transition-all text-xs md:text-sm flex items-center gap-2">
              <PlusCircle className="w-4 h-4" /> Deploy Node
            </Link> */}
          </div>
        </header>

        {/* FINANCIAL KPIs (Business Focused) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard 
            icon={<Building2 />} title="Total Active Clients" value={activeClients.length.toString()} 
            subValue={`From ${totalClientCount} Total Nodes`} color="text-blue-400" bg="bg-blue-400/10" 
          />
          <KpiCard 
            icon={<CreditCard />} title="Base MRR (Subscriptions)" value={`Rp${(baseSubscriptionRevenue/1000000).toFixed(1)}M`} 
            subValue="Fixed Monthly Revenue" color="text-indigo-400" bg="bg-indigo-400/10" 
          />
          <KpiCard 
            icon={<ShieldAlert />} title="Overlimit Penalties" value={`Rp${(totalOverlimitRevenue/1000).toLocaleString('id-ID')}K`} 
            subValue="Variable Usage Revenue" color="text-amber-400" bg="bg-amber-400/10" 
          />
          <KpiCard 
            icon={<Receipt />} title="Gross Revenue" value={`Rp${(totalRevenue/1000000).toFixed(2)}M`} 
            subValue="MRR + Penalties" color="text-emerald-400" bg="bg-emerald-400/10" 
          />
        </div>

        {/* SEARCH & FILTER */}
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-6">
          <div className="w-full sm:flex-1 relative">
            <input type="text" placeholder="Cari nama bisnis klien..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-3.5 md:py-4 px-4 md:px-6 text-sm md:text-base font-bold text-slate-200 placeholder:text-slate-600 focus:border-emerald-500 focus:bg-slate-900 outline-none transition-all" />
          </div>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full sm:w-auto bg-slate-900/50 border border-slate-800 rounded-xl py-3.5 md:py-4 px-4 md:px-6 text-sm md:text-base font-bold text-slate-400 outline-none cursor-pointer appearance-none focus:border-emerald-500">
            <option value="name">Urutkan: Nama (A-Z)</option>
            <option value="chat">Paling Banyak Chat</option>
            <option value="quota">Sisa Quota Terdikit</option>
          </select>
        </div>

        {/* MAIN CLIENT TABLE */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl backdrop-blur-xl relative overflow-hidden mb-8 md:mb-12">
          <div className="overflow-x-auto overflow-y-auto max-h-[600px] custom-scrollbar scroll-smooth relative z-10">
            <table className="w-full text-left text-sm min-w-[1000px] border-collapse">
              <thead className="sticky top-0 z-30">
                <tr className="bg-slate-900/95 backdrop-blur-md text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] shadow-sm">
                  <th className="px-4 py-5 md:px-6 border-b border-slate-800 whitespace-nowrap">Klien & Status</th>
                  <th className="px-4 py-5 md:px-6 border-b border-slate-800 text-center whitespace-nowrap">Billing (Chat / Limit)</th>
                  <th className="px-4 py-5 md:px-6 border-b border-slate-800 text-center whitespace-nowrap">Premium Quota</th>
                  <th className="px-4 py-5 md:px-6 border-b border-slate-800 text-center whitespace-nowrap">AI Capabilities</th> 
                  <th className="px-4 py-5 md:px-6 border-b border-slate-800 text-right whitespace-nowrap">Operations</th>
                </tr>
              </thead>
              
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr><td colSpan={5} className="p-16 md:p-24 text-center font-black text-slate-600 animate-pulse uppercase tracking-widest">Memuat Database Klien...</td></tr>
                ) : filteredAndSortedStats.length === 0 ? (
                  <tr><td colSpan={5} className="p-16 md:p-24 text-center font-bold text-slate-500">Tidak ada klien yang cocok dengan pencarian.</td></tr>
                ) : filteredAndSortedStats.map((stat) => {
                  const overCount = Math.max(0, stat.totalChat - stat.limit);
                  return (
                    <tr key={stat.id} className={`transition-all duration-300 group ${!stat.isActive ? 'bg-red-950/20' : 'hover:bg-slate-800/30'}`}>
                      <td className="px-4 py-5 md:px-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-[180px]">
                            <p className="font-black text-slate-200 text-base md:text-lg tracking-tight flex flex-wrap items-center gap-2">
                              {stat.name}
                              {!stat.isActive && <span className="text-[8px] bg-red-900/50 text-red-400 border border-red-500/20 px-2 py-0.5 rounded uppercase tracking-widest shrink-0">Suspended</span>}
                            </p>
                            <div className="mt-2">
                              <select 
                                value={stat.plan}
                                onChange={(e) => changeClientPlan(stat.id, stat.plan, stat.name, e.target.value)}
                                className="text-[10px] font-black text-indigo-400 uppercase bg-indigo-950/30 px-2 py-1.5 rounded cursor-pointer outline-none border border-indigo-900/50 hover:border-indigo-500 hover:bg-indigo-900/50 transition-all"
                              >
                                <option value="Basic">Basic</option>
                                <option value="Pro">Pro</option>
                                <option value="Enterprise">Enterprise</option>
                              </select>
                            </div>
                          </div>
                          <button onClick={() => toggleSuspend(stat.id, stat.isActive, stat.name)} className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all shrink-0 border ${stat.isActive ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-red-500 hover:text-white hover:border-red-500' : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500 hover:text-white'}`} title={stat.isActive ? "Suspend Klien" : "Aktifkan Klien"}>
                            <ShieldAlert className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      
                      <td className="px-4 py-5 md:px-6 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          <span className={`font-mono font-black text-base md:text-xl ${overCount > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                            {stat.totalChat} <span className="text-xs md:text-sm font-medium text-slate-500">/ {stat.limit}</span>
                          </span>
                          <button onClick={() => adjustChatLimit(stat.id, stat.limit, stat.name)} className="text-[9px] font-black text-slate-400 bg-slate-800 px-2.5 py-1 rounded-md hover:bg-slate-700 hover:text-white transition-colors border border-slate-700">Ubah Limit</button>
                        </div>
                        {overCount > 0 && <p className="text-[9px] font-black text-amber-400 mt-2 bg-amber-950/30 border border-amber-900/50 py-1 px-2.5 rounded-md inline-block">Denda: Rp {stat.overlimitPricePerChat}/chat</p>}
                      </td>
                      
                      <td className="px-4 py-5 md:px-6">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Left</p>
                          <div className="flex items-center justify-center gap-1.5 md:gap-2 bg-slate-900/50 border border-slate-800 rounded-xl p-1">
                            <button onClick={() => adjustPremiumQuota(stat.id, stat.premiumQuota, -1, stat.name)} disabled={stat.premiumQuota <= 0} className="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center bg-slate-800 text-slate-400 rounded-lg hover:bg-red-500/20 hover:text-red-400 disabled:opacity-30 disabled:hover:bg-slate-800 transition-all font-bold text-base md:text-xl leading-none shrink-0 border border-slate-700">−</button>
                            <span className={`font-black font-mono text-[14px] md:text-[16px] w-6 md:w-8 text-center ${stat.premiumQuota <= 2 ? 'text-amber-400 animate-pulse' : 'text-slate-300'}`}>{stat.premiumQuota}</span>
                            <button onClick={() => adjustPremiumQuota(stat.id, stat.premiumQuota, 1, stat.name)} className="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center bg-slate-800 text-slate-400 rounded-lg hover:bg-emerald-500/20 hover:text-emerald-400 transition-all font-bold text-base md:text-xl leading-none shrink-0 border border-slate-700">+</button>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-5 md:px-6 text-center">
                        <div className="flex flex-col items-center gap-2 min-w-[130px]">
                          <button onClick={() => toggleAddon(stat.id, stat.features, !stat.features?.has_addon, stat.name)} className={`w-full text-[9px] md:text-[10px] font-black px-3 md:px-4 py-2.5 rounded-xl uppercase transition-all shadow-sm border ${stat.features?.has_addon ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 text-slate-500 border-slate-700 hover:border-slate-500 hover:text-slate-300'}`}>
                            {stat.features?.has_addon ? "● Addon UI: ON" : "○ Addon UI: OFF"}
                          </button>
                          
                          <button onClick={() => openToolModal(stat)} className="w-full bg-indigo-950/30 border border-indigo-900/50 text-indigo-400 hover:bg-indigo-600 hover:text-white hover:border-indigo-500 text-[9px] md:text-[10px] font-black px-3 md:px-4 py-2.5 rounded-xl uppercase transition-all flex items-center justify-center gap-1.5 md:gap-2">
                            <Bot className="w-3 h-3" /> Tools ({stat.activeTools?.length || 0})
                          </button>
                        </div>
                      </td>
                      
                      <td className="px-4 py-5 md:px-6 text-right">
                        <div className="flex flex-col items-end gap-2.5 min-w-[120px]">
                          {/* 👑 TOMBOL MAGIC DOOR (IMPERSONATE) */}
                          <button 
                            onClick={() => impersonateClient(stat.id, stat.name)} 
                            className="bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 text-[9px] md:text-[10px] font-black uppercase tracking-widest px-3 md:px-4 py-2.5 rounded-lg hover:bg-indigo-600 hover:text-white transition-all w-full flex justify-center items-center gap-1.5"
                          >
                            <LogOut className="w-3 h-3" /> Login Node
                          </button>

                          <button onClick={() => downloadClientBilling(stat)} className="bg-slate-800 text-slate-300 border border-slate-700 text-[9px] md:text-[10px] font-bold px-3 md:px-4 py-2.5 rounded-lg hover:bg-slate-700 transition-colors w-full">
                            Cetak Invoice
                          </button>
                          
                          <button onClick={() => openDeleteModal(stat.id, stat.name)} className="bg-red-950/30 border border-red-900/50 text-red-400 hover:bg-red-600 hover:text-white hover:border-red-600 text-[9px] md:text-[10px] font-bold px-3 md:px-4 py-2.5 rounded-lg transition-colors w-full flex justify-center items-center gap-1.5">
                            <Trash2 className="w-3 h-3" /> Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================================
            TABEL SYSTEM AUDIT TRAIL (LOG AKTIVITAS ADMIN)
        ======================================================== */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl backdrop-blur-xl overflow-hidden relative">
           <div className="p-6 md:p-8 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700">
                    <Activity className="w-5 h-5 text-emerald-400" />
                 </div>
                 <div>
                    <h3 className="text-xl md:text-2xl font-black text-white italic">System Audit Trail</h3>
                    <p className="text-slate-500 text-[10px] md:text-xs font-bold mt-0.5 tracking-wide uppercase">Operasional Bisnis & Kendali Admin</p>
                 </div>
              </div>
           </div>

           <div className="overflow-x-auto overflow-y-auto max-h-[450px] relative z-10 custom-scrollbar scroll-smooth">
              <table className="w-full text-left text-sm min-w-[850px] border-collapse">
                 <thead className="sticky top-0 z-20">
                    <tr className="bg-slate-900/95 backdrop-blur-md text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] shadow-sm border-b border-slate-800">
                       <th className="px-6 py-5 md:px-8 whitespace-nowrap">Waktu Eksekusi</th>
                       <th className="px-6 py-5 md:px-8 whitespace-nowrap">Pelaku (Admin)</th>
                       <th className="px-6 py-5 md:px-8 whitespace-nowrap">Tindakan</th>
                       <th className="px-6 py-5 md:px-8 whitespace-nowrap">Target Klien</th>
                       <th className="px-6 py-5 md:px-8">Detail Perubahan</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-800">
                    {adminLogs.length === 0 ? (
                       <tr>
                          <td colSpan={5} className="p-16 text-center">
                             <div className="flex flex-col items-center justify-center opacity-50">
                                <Activity className="w-10 h-10 text-slate-600 mb-3" />
                                <span className="text-slate-500 font-bold tracking-widest text-xs uppercase">Sistem Bersih. Belum ada aktivitas.</span>
                             </div>
                          </td>
                       </tr>
                    ) : adminLogs.map((log) => (
                       <tr key={log.created_at} className="hover:bg-slate-800/30 transition-all duration-200">
                          <td className="px-6 md:px-8 py-5 text-slate-500 text-[11px] font-mono whitespace-nowrap">
                             {new Date(log.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-6 md:px-8 py-5 text-slate-300 font-bold text-xs whitespace-nowrap">
                             {log.admin_email}
                          </td>
                          <td className="px-6 md:px-8 py-5 whitespace-nowrap">
                             <span className="text-[9px] font-black px-2.5 py-1.5 rounded-md border border-slate-700 bg-slate-800 text-slate-400 uppercase tracking-wider">
                                {log.action_type.replace('_', ' ')}
                             </span>
                          </td>
                          <td className="px-6 md:px-8 py-5 text-slate-300 font-black text-xs whitespace-nowrap">
                             {log.target_client}
                          </td>
                          <td className="px-6 md:px-8 py-5 text-slate-500 text-xs italic min-w-[250px] leading-relaxed">
                             {log.details}
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>

      </div>
    </div>
  );
}

function KpiCard({ icon, title, value, subValue, color, bg }: any) {
  return (
    <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl backdrop-blur-sm hover:bg-slate-800/50 transition-colors relative overflow-hidden group">
      <div className={`absolute -right-6 -top-6 w-24 h-24 ${bg} rounded-full blur-2xl group-hover:blur-3xl transition-all`}></div>
      <div className={`w-10 h-10 rounded-2xl ${bg} ${color} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</h3>
      <p className="text-3xl font-black text-white mb-2 tracking-tighter">{value}</p>
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-bold text-slate-500">{subValue}</span>
      </div>
    </div>
  );
}