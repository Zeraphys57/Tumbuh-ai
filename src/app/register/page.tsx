"use client";
import { useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

export default function SuperAdminRegister() {
  const [formData, setFormData] = useState({
    businessName: "",
    slug: "",
    email: "",
    password: "",
    monthlyLimit: 1000,
    prompt: "Kamu adalah asisten virtual yang ramah..."
  });
  
  // STATE BARU UNTUK ALUR OTP
  const [step, setStep] = useState<"FORM" | "OTP">("FORM");
  const [otp, setOtp] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showIframe, setShowIframe] = useState("");
  const [tosAccepted, setTosAccepted] = useState(false);

  // Inisialisasi Supabase
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // --- TAHAP 1: DAFTAR AUTH & KIRIM OTP ---
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tosAccepted) {
      setMessage({ type: "error", text: "Anda wajib menyetujui Syarat & Ketentuan." });
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      // 1. Daftarkan email & password ke Auth Supabase (Otomatis ngirim email OTP)
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;
      // 🚨 PENGECEKAN EMAIL REDUNDAN (DUPLIKAT) 🚨
      if (data?.user?.identities?.length === 0) {
        throw new Error("Email ini sudah terdaftar! Silakan gunakan email lain atau langsung Login.");
      }
      // 2. Ganti tampilan ke mode OTP
      setStep("OTP");
      setMessage({ type: "success", text: "Kode 6 Digit telah dikirim ke email " + formData.email });
      
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // --- TAHAP 2: VERIFIKASI OTP & DEPLOY CLIENT ---
  const handleVerifyAndDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      // 1. Cek kecocokan OTP ke Supabase
      const { data: authData, error: authError } = await supabase.auth.verifyOtp({
        email: formData.email,
        token: otp,
        type: 'signup'
      });

      if (authError) throw authError;

      // 2. JIKA OTP BENAR -> Panggil API untuk setup database
      const res = await fetch("/api/create-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.businessName,
          email: formData.email,
          password: formData.password,
          system_prompt: formData.prompt,
          monthly_limit: formData.monthlyLimit,
          slug: formData.slug,
          tos_accepted_at: new Date().toISOString(),
          whatsapp_number: "", 
          plan_type: "Starter Core",
          user_id: authData.user?.id // Kirim ID user hasil verifikasi
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal mendaftarkan klien.");
      }

      // 3. GENERATE IFRAME CODE
      const iframeCode = `<iframe src="https://tumbuh.ai/preview/${formData.slug}" width="400" height="600" frameborder="0"></iframe>`;
      setShowIframe(iframeCode);

      setMessage({ type: "success", text: `Sukses! Bisnis ${formData.businessName} telah aktif.` });
      
      // Reset form kecuali slug
      setFormData({ ...formData, businessName: "", email: "", password: "" });
      setTosAccepted(false);
      
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Kode OTP salah atau kedaluwarsa." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-8 font-sans flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white rounded-[3rem] shadow-2xl border border-white p-12">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter italic">
            Add New <span className="text-blue-600">Client</span>
          </h1>
          <p className="text-slate-400 font-medium mt-2">Daftarkan bisnis & buat akun dashboard klien sekaligus.</p>
        </header>

        {/* NOTIFIKASI */}
        {message.text && (
          <div className={`mb-8 p-4 rounded-2xl text-center font-bold text-sm uppercase tracking-widest ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
            {message.text}
          </div>
        )}

        {/* --- FITUR IFRAME --- */}
        {showIframe && (
          <div className="mb-10 p-8 bg-slate-900 text-white rounded-[2.5rem] shadow-2xl animate-in zoom-in duration-500 border border-blue-500/30">
            <p className="text-[10px] font-black opacity-50 uppercase tracking-widest mb-4 italic">Iframe Integration Code</p>
            <code className="block bg-black/40 p-5 rounded-2xl text-xs font-mono break-all mb-6 border border-white/5 text-blue-300 leading-relaxed">
              {showIframe}
            </code>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(showIframe);
                alert("Kode Iframe berhasil disalin ke clipboard!");
              }}
              className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-lg active:scale-95"
            >
              Copy Integration Code
            </button>
          </div>
        )}

        {/* --- FORM PENDAFTARAN (LANGKAH 1) --- */}
        {step === "FORM" && !showIframe && (
          <form onSubmit={handleSendOtp} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Business Name</label>
              <input required className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500" placeholder="Username" value={formData.businessName} onChange={e => setFormData({...formData, businessName: e.target.value})} />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">URL Slug</label>
              <input required className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 uppercase" placeholder="xxxx-xxxx" value={formData.slug} onChange={e => { const sanitized = e.target.value .toLowerCase() .replace(/[^a-z0-9]+/g, '-'); setFormData({...formData, slug: sanitized}); }} />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Admin Email</label>
              <input required type="email" className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500" placeholder="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Set Password</label>
              <input required type="password" minLength={6} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Base AI Intelligence (Prompt)</label>
              <textarea className="w-full bg-slate-50 border-none rounded-3xl p-6 text-sm font-medium h-32 focus:ring-2 focus:ring-blue-500 resize-none" value={formData.prompt} onChange={e => setFormData({...formData, prompt: e.target.value})} />
            </div>

            <div className="md:col-span-2 mt-2 mb-4">
              <label className="flex items-start gap-4 cursor-pointer group bg-slate-50 p-5 rounded-[2rem] border border-transparent hover:border-slate-200 transition-all">
                <input type="checkbox" required checked={tosAccepted} onChange={(e) => setTosAccepted(e.target.checked)} className="mt-1 w-5 h-5 rounded-[0.4rem] border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer shadow-sm" />
                <span className="text-xs text-slate-500 font-medium leading-relaxed">
                  Saya menyetujui {" "}
                  <Link 
                    href="/terms" 
                    target="_blank" 
                    className="text-blue-600 font-black hover:underline underline-offset-4"
                  >
                    Syarat & Ketentuan
                  </Link>
                  . Email yang digunakan adalah aktif dan valid.
                </span>
              </label>
            </div>

            <button disabled={loading} className="md:col-span-2 bg-slate-900 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] hover:bg-blue-600 transition-all shadow-xl disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none">
              {loading ? "Mengirim Kode OTP..." : "Deploy New Client Node"}
            </button>
          </form>
        )}

        {/* --- FORM VERIFIKASI OTP (LANGKAH 2) --- */}
        {step === "OTP" && !showIframe && (
          <form onSubmit={handleVerifyAndDeploy} className="max-w-sm mx-auto space-y-6">
            <div className="space-y-2 text-center">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Masukkan Kode OTP</label>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                className="w-full bg-slate-50 border-none rounded-2xl py-4 text-slate-700 text-center tracking-[0.5em] text-xl font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold"
              />
            </div>
            
            <button disabled={loading || otp.length < 6} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-slate-900 transition-all shadow-xl disabled:opacity-50">
              {loading ? "Verifikasi..." : "Verifikasi & Buat Akun"}
            </button>
            
            <button type="button" onClick={() => setStep("FORM")} className="w-full text-[10px] text-slate-400 hover:text-slate-700 font-bold uppercase tracking-widest mt-2">
              ← Kembali Edit Form
            </button>
          </form>
        )}

        <div className="mt-8 pt-8 border-t border-slate-100/60 text-center">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Sudah memiliki node bisnis? <br/>
            <Link href="/dashboard/admin" className="text-blue-600 hover:text-slate-900 transition-colors mt-2 inline-block italic">
              &larr; Back
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}