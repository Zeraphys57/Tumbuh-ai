import Link from "next/link";

export default function PaymentUnfinishPage({
  searchParams,
}: {
  searchParams: { order_id?: string };
}) {
  const orderId = searchParams.order_id || "Tidak ada ID";

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed opacity-[0.03] pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-orange-600/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-8 md:p-12 rounded-[2.5rem] shadow-2xl max-w-md w-full text-center relative z-10">
        {/* Ikon Warning */}
        <div className="w-20 h-20 bg-orange-500/10 border border-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(249,115,22,0.2)] animate-pulse">
          <svg className="w-10 h-10 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-3">Pembayaran Tertunda</h1>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          Sepertinya Anda menutup jendela pembayaran sebelum proses selesai. Jangan khawatir, Anda bisa mengulanginya kapan saja.
        </p>

        <div className="bg-black/40 border border-slate-800 rounded-xl p-4 mb-8 text-left">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Order ID</p>
          <p className="text-slate-300 font-mono text-xs">{orderId}</p>
        </div>

        <div className="flex flex-col gap-3">
          <Link href="/" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(249,115,22,0.3)] active:scale-95">
            Coba Bayar Lagi
          </Link>
          <Link href="/dashboard" className="w-full bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-black text-xs uppercase tracking-widest py-3.5 rounded-xl transition-all active:scale-95">
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}