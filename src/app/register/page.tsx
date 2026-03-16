"use client";
import { useState } from "react";
import Link from "next/link";

export default function SuperAdminRegister() {
  const [formData, setFormData] = useState({
    businessName: "",
    slug: "",
    email: "",
    password: "",
    monthlyLimit: 1000,
    prompt: "Kamu adalah asisten virtual yang ramah..."
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  
  // State untuk menyimpan kode iframe setelah sukses daftar
  const [showIframe, setShowIframe] = useState("");
  
  // STATE BARU: Untuk melacak centang ToS
  const [tosAccepted, setTosAccepted] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validasi Ekstra
    if (!tosAccepted) {
      setMessage({ type: "error", text: "Anda wajib menyetujui Syarat & Ketentuan." });
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });
    setShowIframe(""); 

    try {
      // --- MENGGUNAKAN API JALUR BELAKANG (SERVICE ROLE) ---
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
          tos_accepted_at: new Date().toISOString(), // Kirim data ToS
          whatsapp_number: "", // Kosongkan jika tidak ada di form
          plan_type: "Starter Core"
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal mendaftarkan klien.");
      }

      // 3. GENERATE IFRAME CODE UNTUK COPY-PASTE
      const iframeCode = `<iframe src="https://tumbuh.ai/preview/${formData.slug}" width="400" height="600" frameborder="0"></iframe>`;
      setShowIframe(iframeCode);

      setMessage({ type: "success", text: `Sukses! Bisnis ${formData.businessName} telah aktif.` });
      
      // Reset form kecuali slug untuk referensi iframe
      setFormData({ ...formData, businessName: "", email: "", password: "" });
      setTosAccepted(false); // Reset centang
      
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
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

        {/* NOTIFIKASI SUKSES/ERROR */}
        {message.text && (
          <div className={`mb-8 p-4 rounded-2xl text-center font-bold text-sm uppercase tracking-widest ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
            {message.text}
          </div>
        )}

        {/* --- FITUR IFRAME: MUNCUL SETELAH SUKSES DAFTAR --- */}
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

        <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Business Name</label>
            <input required className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500" placeholder="Username" value={formData.businessName} onChange={e => setFormData({...formData, businessName: e.target.value})} />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">URL Slug</label>
            <input required className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 uppercase" placeholder="xxxx-xxxx" value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})} />
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

          {/* CHECKBOX TERMS OF SERVICE */}
          <div className="md:col-span-2 mt-2 mb-4">
            <label className="flex items-start gap-4 cursor-pointer group bg-slate-50 p-5 rounded-[2rem] border border-transparent hover:border-slate-200 transition-all">
              <input 
                type="checkbox" 
                required 
                checked={tosAccepted}
                onChange={(e) => setTosAccepted(e.target.checked)}
                className="mt-1 w-5 h-5 rounded-[0.4rem] border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer shadow-sm"
              />
              <span className="text-xs text-slate-500 font-medium leading-relaxed">
                Saya menyetujui <a href="/terms" target="_blank" className="text-blue-600 font-bold hover:text-blue-800 transition-colors">Syarat & Ketentuan</a> dan <a href="/privacy" target="_blank" className="text-blue-600 font-bold hover:text-blue-800 transition-colors">Kebijakan Privasi</a> Tumbuh AI. Saya mengerti bahwa bot dilarang digunakan untuk kegiatan ilegal, spam, atau penipuan.
              </span>
            </label>
          </div>

          <button disabled={loading} className="md:col-span-2 bg-slate-900 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] hover:bg-blue-600 transition-all shadow-xl disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none">
            {loading ? "Onboarding Client..." : "Deploy New Client Node"}
          </button>
        </form>

        {/* --- LINK KEMBALI KE LOGIN --- */}
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