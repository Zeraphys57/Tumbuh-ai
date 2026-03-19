import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Refund Policy | Tumbuh AI",
  description: "Kebijakan Pengembalian Dana Tumbuh AI.",
};

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans selection:bg-indigo-500/30 pb-20 pt-32 px-6 relative">
      <div className="max-w-3xl mx-auto relative z-10">
        <Link href="/" className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm font-bold mb-8 transition-colors">
          <ArrowLeft size={16} /> Kembali ke Beranda
        </Link>
        
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">Refund Policy</h1>
        
        {/* Tanggal di-hardcode sesuai saran CTO agar tidak membeku saat build Vercel */}
        <p className="text-slate-400 mb-12 border-b border-white/10 pb-8">Pembaruan Terakhir: Maret 2026</p>

        <div className="space-y-8 text-sm md:text-base leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Ketentuan Umum</h2>
            <p>
              Tumbuh AI ("Layanan", "kami") yang saat ini dioperasikan secara legal oleh Bryan Jacquellino, menyediakan layanan perangkat lunak berbasis langganan (Software as a Service / SaaS). Dengan melakukan pembayaran langganan, Anda ("Pengguna", "Klien") menyetujui kebijakan pengembalian dana ini.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Sifat Layanan Digital (Tidak Ada Pengembalian Dana)</h2>
            <p>
              Karena sifat layanan kami yang merupakan produk digital dan akses infrastruktur komputasi AI yang diberikan secara instan, <strong>semua pembayaran langganan yang telah berhasil diproses bersifat final dan tidak dapat dikembalikan (non-refundable)</strong>, kecuali ditentukan lain dalam kebijakan ini. Kami tidak memberikan pengembalian dana atau kredit pro-rata untuk sisa waktu langganan jika Anda memutuskan untuk berhenti di tengah periode penagihan.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Pengecualian Pengembalian Dana</h2>
            <p>Pengembalian dana (Refund) hanya dapat dipertimbangkan dan diproses dalam kasus-kasus khusus berikut:</p>
            <ul className="list-disc pl-5 mt-3 space-y-2 text-slate-400">
              <li><strong>Tagihan Ganda (Double Charge):</strong> Terjadi kesalahan sistem pembayaran terverifikasi yang menyebabkan metode pembayaran Anda terpotong lebih dari satu kali untuk invoice yang sama.</li>
              {/* Threshold SLA dinaikkan ke 7 hari sesuai saran CTO */}
              <li><strong>Kegagalan Sistem Internal Fatal:</strong> Anda tidak dapat mengakses fitur utama Tumbuh AI selama lebih dari <strong>7 hari (168 jam) berturut-turut</strong> setelah pembayaran sukses, yang dibuktikan disebabkan sepenuhnya oleh kerusakan server internal kami.</li>
            </ul>
          </section>

          {/* KLAUSUL BARU: FORCE MAJEURE (Perlindungan Startup) */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Keadaan Kahar (Force Majeure) & Pihak Ketiga</h2>
            <p>
              Tumbuh AI dibebaskan dari kewajiban pengembalian dana atau kompensasi apa pun apabila layanan tidak dapat diakses, terhenti, atau mengalami degradasi kualitas yang disebabkan oleh hal-hal di luar kendali wajar kami (Force Majeure). Hal ini termasuk, namun tidak terbatas pada:
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-2 text-slate-400">
              <li>Gangguan massal pada penyedia infrastruktur cloud kami (misal: AWS, Vercel, Supabase).</li>
              <li>Tumbangnya layanan API penyedia AI pihak ketiga (misal: OpenAI, Google Gemini, Anthropic).</li>
              <li>Perubahan kebijakan, pemblokiran, atau gangguan pada platform pihak ketiga (misal: Meta, WhatsApp).</li>
              <li>Bencana alam, huru-hara, serangan siber tingkat nasional, atau kebijakan pemerintah/regulator.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Prosedur Klaim</h2>
            <p>
              Jika Anda memenuhi kriteria pengecualian pada Pasal 3, Anda dapat mengajukan permohonan dengan menghubungi tim dukungan kami di <strong>jacquellinobryan@gmail.com</strong>. Harap sertakan:
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-2 text-slate-400">
              <li>Bukti pembayaran resmi (Invoice/Receipt).</li>
              <li>Detail akun Tumbuh AI Anda.</li>
              <li>Kronologi lengkap kendala yang dialami.</li>
            </ul>
            <p className="mt-3">
              Proses investigasi dan pengembalian dana (jika disetujui) memakan waktu 7 hingga 14 hari kerja. Dana akan dikembalikan secara eksklusif ke metode pembayaran awal.
            </p>
          </section>

          {/* KLAUSUL BARU: GOVERNING LAW (Perlindungan Hukum) */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Hukum yang Berlaku dan Penyelesaian Sengketa</h2>
            <p>
              Kebijakan ini diatur dan ditafsirkan berdasarkan hukum Republik Indonesia. Setiap sengketa, perselisihan, atau klaim yang timbul dari atau sehubungan dengan kebijakan ini akan diselesaikan terlebih dahulu melalui musyawarah untuk mufakat. Jika kesepakatan tidak tercapai dalam waktu 30 (tiga puluh) hari, maka sengketa tersebut akan diselesaikan secara eksklusif melalui yurisdiksi <strong>Pengadilan Negeri yang berwenang di wilayah hukum domisili operasional Tumbuh AI</strong>.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}