import Link from "next/link";
import { ArrowLeft, Scale } from "lucide-react";

export const metadata = {
  title: "Terms of Service | Tumbuh AI",
  description: "Syarat dan Ketentuan Layanan Tumbuh AI.",
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans selection:bg-indigo-500/30 pb-20 pt-32 px-6 relative">
      <div className="max-w-3xl mx-auto relative z-10">
        <Link href="/" className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm font-bold mb-8 transition-colors">
          <ArrowLeft size={16} /> Kembali ke Beranda
        </Link>
        
        <div className="flex items-center gap-4 mb-4">
          <Scale className="text-cyan-400 w-12 h-12" />
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">Syarat & <span className="text-cyan-400 italic">Ketentuan</span></h1>
        </div>
        
        <p className="text-slate-400 mb-12 border-b border-white/10 pb-8">Pembaruan Terakhir: Maret 2026 | Berlaku Efektif: Segera</p>

        <div className="space-y-8 text-sm md:text-base leading-relaxed text-justify">
          
          <p className="font-medium text-slate-400 italic text-lg mb-8">
            Dokumen ini merupakan perjanjian hukum yang mengikat antara Anda ("Klien", "Pengguna") dan Tumbuh AI ("Kami", "Layanan"). Dengan mencentang kotak persetujuan pada halaman pendaftaran atau melakukan pembayaran, Anda secara sadar dan tanpa paksaan menyetujui seluruh ketentuan di bawah ini.
          </p>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4 border-l-4 border-cyan-500 pl-4">1. Sifat Layanan dan Ketersediaan ("As-Is" Basis)</h2>
            <p>
              Tumbuh AI menyediakan perangkat lunak otomatisasi berbasis <em>Large Language Model</em> (LLM). Layanan ini disediakan secara "sebagaimana adanya" (<em>as-is</em>) dan "sebagaimana tersedia" (<em>as-available</em>). Kami tidak memberikan jaminan eksplisit maupun implisit bahwa Layanan akan 100% bebas dari gangguan, bebas dari <em>bug</em>, atau selalu beroperasi tanpa jeda waktu (<em>downtime</em>).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4 border-l-4 border-cyan-500 pl-4">2. Sifat Kecerdasan Buatan (AI) & Pelepasan Tanggung Jawab</h2>
            <p>
              Klien menyadari sepenuhnya bahwa teknologi AI yang digunakan dapat menghasilkan respons yang tidak terduga, tidak akurat, atau fiktif (halusinasi). Tumbuh AI <strong>TIDAK BERTANGGUNG JAWAB</strong> secara hukum maupun finansial atas:
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-3 text-slate-400">
              <li>Kesalahan penawaran harga, jadwal, atau informasi layanan yang diberikan oleh bot AI kepada pelanggan akhir (<em>End-User</em>) Anda.</li>
              <li>Kehilangan pendapatan, kehilangan pelanggan, atau kerusakan reputasi bisnis akibat interaksi bot AI.</li>
              <li>Kewajiban mengawasi, memoderasi, dan mengoreksi respons bot adalah tanggung jawab mutlak Klien melalui dashboard yang telah disediakan.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4 border-l-4 border-cyan-500 pl-4">3. Kepatuhan Hukum dan Tanggung Jawab Klien</h2>
            <p>
              Klien bertindak sebagai <strong>Pengendali Data</strong> untuk pelanggan mereka sendiri. Klien wajib memastikan bahwa mereka memiliki izin yang sah dari pelanggan mereka untuk memproses pesan melalui sistem Tumbuh AI. Penggunaan Layanan untuk tujuan berikut dilarang keras dan akan berakibat pada pemblokiran akun permanen, serta pelaporan kepada pihak berwenang:
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-3 text-slate-400">
              <li>Praktik penipuan (<em>scam/phishing</em>), perjudian, pornografi, pinjaman <em>online</em> ilegal, atau aktivitas yang melanggar hukum di yurisdiksi Republik Indonesia (termasuk UU ITE).</li>
              <li>Pengumpulan data finansial sensitif (CVV, kata sandi, kode OTP) melalui antarmuka <em>chat</em> AI.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4 border-l-4 border-cyan-500 pl-4">4. Batasan Maksimal Ganti Rugi (Cap on Liability)</h2>
            <p>
              Sejauh diizinkan oleh hukum yang berlaku, total tanggung jawab kumulatif Tumbuh AI terhadap Klien untuk klaim apa pun yang timbul sehubungan dengan Layanan ini <strong>dibatasi secara ketat maksimum sebesar jumlah biaya langganan yang dibayarkan oleh Klien kepada Tumbuh AI dalam kurun waktu satu (1) bulan terakhir</strong> sebelum kejadian yang menimbulkan klaim tersebut.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4 border-l-4 border-cyan-500 pl-4">5. Ganti Rugi (Indemnifikasi)</h2>
            <p>
              Klien setuju untuk membela, memberikan ganti rugi, dan membebaskan Tumbuh AI beserta afiliasi dan karyawannya dari segala tuntutan hukum, klaim, atau denda dari pihak ketiga (termasuk tuntutan dari pelanggan Anda sendiri) yang timbul akibat kelalaian Anda, pelanggaran Syarat & Ketentuan ini, atau penyalahgunaan Layanan.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4 border-l-4 border-cyan-500 pl-4">6. Hak Kekayaan Intelektual</h2>
            <p>
              Infrastruktur, kode sumber, basis prompt (<em>Master Prompt</em>), dan desain UI/UX Tumbuh AI adalah hak milik eksklusif Tumbuh AI. Klien tidak diperkenankan menyalin, merekayasa balik (<em>reverse-engineer</em>), atau menjual ulang Layanan (<em>white-labeling</em>) tanpa perjanjian lisensi terpisah. Data bisnis dan log <em>chat</em> yang dihasilkan tetap menjadi milik Klien.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4 border-l-4 border-cyan-500 pl-4">7. Kebijakan Pembayaran & Pengembalian Dana (Refund Policy)</h2>
            <p>
              Semua transaksi dan biaya berlangganan di Tumbuh AI diproses menggunakan mata uang <strong>Rupiah (IDR)</strong> melalui pihak ketiga penyedia gerbang pembayaran (Payment Gateway) yang resmi dan berlisensi.
            </p>
            {/* REVISI SINKRONISASI REFUND POLICY */}
            <p className="mt-3">
              Mengingat sifat produk kami adalah perangkat lunak dan layanan digital (SaaS), <strong>semua pembayaran bersifat final dan tidak dapat dikembalikan (Non-Refundable)</strong>, kecuali terjadi kesalahan penagihan ganda (<em>double charge</em>) atau kegagalan sistem internal fatal selama lebih dari <strong>7 hari berturut-turut</strong>. Detail selengkapnya diatur secara terpisah dalam halaman <strong>Refund Policy</strong> kami.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4 border-l-4 border-cyan-500 pl-4">8. Kebijakan Privasi (Privacy Policy) & Keamanan Data</h2>
            <p>
              Tumbuh AI sangat menghargai privasi Anda. Informasi pribadi yang Anda berikan saat mendaftar atau melakukan pembayaran <strong>hanya akan digunakan untuk keperluan operasional layanan, penagihan, dan komunikasi resmi</strong>. Kami tidak akan pernah menjual atau membagikan data pribadi Anda kepada pihak ketiga untuk tujuan pemasaran tanpa izin eksplisit dari Anda, sebagaimana diatur dalam kebijakan privasi kami yang patuh pada UU PDP.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4 border-l-4 border-cyan-500 pl-4">9. Hukum yang Berlaku (Applicable Law)</h2>
            <p>
              {/* REVISI YURISDIKSI SPESIFIK */}
              Syarat dan Ketentuan ini tunduk pada, dan ditafsirkan sesuai dengan, hukum yang berlaku di wilayah <strong>Negara Kesatuan Republik Indonesia</strong>. Segala bentuk perselisihan yang tidak dapat diselesaikan secara musyawarah akan diselesaikan secara eksklusif melalui yurisdiksi <strong>Pengadilan Negeri Pontianak, Kalimantan Barat</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4 border-l-4 border-cyan-500 pl-4">10. Informasi Kontak (Contact Us)</h2>
            <p>
              Jika Anda memiliki pertanyaan, kendala teknis, atau keluhan terkait layanan dan tagihan hukum, Anda dapat menghubungi tim kami melalui:
            </p>
            {/* REVISI PENGHAPUSAN EMAIL DAN ALAMAT PRIBADI */}
            <ul className="list-none space-y-3 mt-4 text-slate-400 bg-white/5 p-6 rounded-2xl border border-white/10">
              <li className="flex items-center gap-3">
                <span className="font-bold text-cyan-400 w-24">Operasional:</span> 
                <a href="mailto:jacquellinobryan@gmail.com" className="hover:text-white transition-colors">jacquellinobryan@gmail.com</a>
              </li>
              <li className="flex items-center gap-3">
                <span className="font-bold text-cyan-400 w-24">Legal & Hukum:</span> 
                <a href="mailto:jacquellinobryan@gmail.com" className="hover:text-white transition-colors">jacquellinobryan@gmail.com</a>
              </li>
              <li className="flex items-start gap-3 pt-2 border-t border-white/10">
                <span className="font-bold text-cyan-400 w-24">Alamat Surat:</span> 
                <span>Tumbuh AI (Virtual Office)<br/>Pontianak Kota, Kalimantan Barat<br/>Indonesia</span>
              </li>
            </ul>
          </section>

        </div>
      </div>
    </div>
  );
}