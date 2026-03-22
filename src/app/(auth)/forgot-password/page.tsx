"use client";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1); // Step 1: Minta Email, Step 2: Input OTP
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Fungsi Step 1: Kirim Email
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) throw error;

      setMessage({ type: "success", text: "Kode OTP telah dikirim ke email Anda!" });
      setStep(2); // Lanjut ke tampilan input OTP
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Gagal mengirim OTP." });
    } finally {
      setLoading(false);
    }
  };

  // Fungsi Step 2: Verifikasi OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      // type: 'recovery' khusus untuk reset password
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'recovery' 
      });

      if (error) throw error;

      setMessage({ type: "success", text: "Kode valid! Mengalihkan..." });
      
      // Jika berhasil, langsung lempar ke halaman ganti password
      router.push("/update-password");
    } catch (err: any) {
      setMessage({ type: "error", text: "Kode OTP salah atau kedaluwarsa." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="w-full max-w-[420px] relative z-10">
        
        <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-white p-8 md:p-10">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic mb-2">Reset <span className="text-blue-600">Password</span></h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              {step === 1 ? "Masukkan email node Anda" : "Masukkan 6 Angka Rahasia"}
            </p>
          </div>

          {message.text && (
            <div className={`mb-6 p-4 rounded-2xl text-center font-bold text-xs uppercase tracking-widest ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
              {message.text}
            </div>
          )}

          {step === 1 ? (
            /* TAMPILAN 1: INPUT EMAIL */
            <form onSubmit={handleRequestOTP} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Klien</label>
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500/50 outline-none transition-all text-sm font-bold text-slate-700 placeholder:text-slate-300"
                  placeholder="email@gmail.com"
                />
              </div>
              <button disabled={loading} type="submit" className="w-full bg-blue-600 text-white py-4.5 pt-5 pb-4 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-lg hover:bg-slate-900 transition-all disabled:opacity-50">
                {loading ? "Mengirim..." : "Kirim Kode OTP"}
              </button>
            </form>
          ) : (
            /* TAMPILAN 2: INPUT KODE OTP */
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-center">Kode OTP</label>
                <input
                  type="text" required value={otp} onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500/50 outline-none transition-all text-2xl font-black text-center tracking-[0.5em] text-slate-700 placeholder:text-slate-300"
                  placeholder="••••••"
                />
              </div>
              <button disabled={loading} type="submit" className="w-full bg-slate-900 text-white py-4.5 pt-5 pb-4 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-lg hover:bg-blue-600 transition-all disabled:opacity-50">
                {loading ? "Memeriksa..." : "Verifikasi OTP"}
              </button>
              <button type="button" onClick={() => setStep(1)} className="w-full mt-2 text-[10px] font-bold text-slate-400 hover:text-slate-700 uppercase tracking-widest transition-colors">
                Ganti Email
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link href="/login" className="text-[10px] font-black text-slate-400 hover:text-slate-700 uppercase tracking-widest transition-colors">
              &larr; Kembali ke Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}