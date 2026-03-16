"use client";
import Link from "next/link";

export default function TermsOfService() {
  const lastUpdated = "16 Maret 2026";

  return (
    <div className="min-h-screen bg-[#f8fafc] py-16 px-6 md:px-12 font-sans selection:bg-blue-200">
      <div className="max-w-5xl mx-auto bg-white p-10 md:p-16 rounded-[3rem] shadow-2xl border border-slate-100">
        
        <Link href="/register" className="inline-flex items-center text-sm font-bold text-blue-600 hover:text-blue-800 mb-8 transition-colors uppercase tracking-widest">
          &larr; Kembali ke Pendaftaran
        </Link>

        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter mb-4">Syarat & <span className="text-blue-600 italic">Ketentuan Layanan</span></h1>
        <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mb-12 border-b border-slate-100 pb-8">Pembaruan Terakhir: {lastUpdated} | Berlaku Efektif: Segera</p>

        <div className="prose prose-slate prose-headings:font-black prose-headings:tracking-tight prose-a:text-blue-600 max-w-none text-slate-700 leading-relaxed text-[15px] text-justify">
          
          <p className="font-medium text-slate-500 italic">
            Dokumen ini merupakan perjanjian hukum yang mengikat antara Anda ("Klien", "Pengguna") dan Tumbuh AI ("Kami", "Layanan"). Dengan mencentang kotak persetujuan pada halaman pendaftaran, Anda secara sadar dan tanpa paksaan menyetujui seluruh ketentuan di bawah ini.
          </p>

          <h3 className="text-xl text-slate-900 mt-10 mb-4 border-l-4 border-blue-600 pl-4">1. Sifat Layanan dan Ketersediaan ("As-Is" Basis)</h3>
          <p>
            Tumbuh AI menyediakan perangkat lunak otomatisasi berbasis <i>Large Language Model</i> (LLM). Layanan ini disediakan secara "sebagaimana adanya" (<i>as-is</i>) dan "sebagaimana tersedia" (<i>as-available</i>). Kami tidak memberikan jaminan eksplisit maupun implisit bahwa Layanan akan 100% bebas dari gangguan, bebas dari <i>bug</i>, atau selalu beroperasi tanpa jeda waktu (<i>downtime</i>).
          </p>

          <h3 className="text-xl text-slate-900 mt-10 mb-4 border-l-4 border-blue-600 pl-4">2. Sifat Kecerdasan Buatan (AI) & Pelepasan Tanggung Jawab</h3>
          <p>
            Klien menyadari sepenuhnya bahwa teknologi AI yang digunakan dapat menghasilkan respons yang tidak terduga, tidak akurat, atau fiktif (halusinasi). Tumbuh AI <strong>TIDAK BERTANGGUNG JAWAB</strong> secara hukum maupun finansial atas:
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>Kesalahan penawaran harga, jadwal, atau informasi layanan yang diberikan oleh bot AI kepada pelanggan akhir (<i>End-User</i>) Anda.</li>
            <li>Kehilangan pendapatan, kehilangan pelanggan, atau kerusakan reputasi bisnis akibat interaksi bot AI.</li>
            <li>Kewajiban mengawasi, memoderasi, dan mengoreksi respons bot adalah tanggung jawab mutlak Klien melalui dashboard yang telah disediakan.</li>
          </ul>

          <h3 className="text-xl text-slate-900 mt-10 mb-4 border-l-4 border-blue-600 pl-4">3. Kepatuhan Hukum dan Tanggung Jawab Klien</h3>
          <p>
            Klien bertindak sebagai <strong>Pengendali Data</strong> untuk pelanggan mereka sendiri. Klien wajib memastikan bahwa mereka memiliki izin yang sah dari pelanggan mereka untuk memproses pesan melalui sistem Tumbuh AI. Penggunaan Layanan untuk tujuan berikut dilarang keras dan akan berakibat pada pemblokiran akun permanen, serta pelaporan kepada pihak berwenang:
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>Praktik penipuan (<i>scam/phishing</i>), perjudian, pornografi, pinjaman <i>online</i> ilegal, atau aktivitas yang melanggar hukum di yurisdiksi Republik Indonesia (termasuk UU ITE).</li>
            <li>Pengumpulan data finansial sensitif (CVV, kata sandi, kode OTP) melalui antarmuka <i>chat</i> AI.</li>
          </ul>

          <h3 className="text-xl text-slate-900 mt-10 mb-4 border-l-4 border-blue-600 pl-4">4. Batasan Maksimal Ganti Rugi (Cap on Liability)</h3>
          <p>
            Sejauh diizinkan oleh hukum yang berlaku, total tanggung jawab kumulatif Tumbuh AI terhadap Klien untuk klaim apa pun yang timbul sehubungan dengan Layanan ini <strong>dibatasi secara ketat maksimum sebesar jumlah biaya langganan yang dibayarkan oleh Klien kepada Tumbuh AI dalam kurun waktu satu (1) bulan terakhir</strong> sebelum kejadian yang menimbulkan klaim tersebut.
          </p>

          <h3 className="text-xl text-slate-900 mt-10 mb-4 border-l-4 border-blue-600 pl-4">5. Ganti Rugi (Indemnifikasi)</h3>
          <p>
            Klien setuju untuk membela, memberikan ganti rugi, dan membebaskan Tumbuh AI beserta afiliasi dan karyawannya dari segala tuntutan hukum, klaim, atau denda dari pihak ketiga (termasuk tuntutan dari pelanggan Anda sendiri) yang timbul akibat kelalaian Anda, pelanggaran Syarat & Ketentuan ini, atau penyalahgunaan Layanan.
          </p>

          <h3 className="text-xl text-slate-900 mt-10 mb-4 border-l-4 border-blue-600 pl-4">6. Hak Kekayaan Intelektual</h3>
          <p>
            Infrastruktur, kode sumber, basis *prompt* (<i>Master Prompt</i>), dan desain UI/UX Tumbuh AI adalah hak milik eksklusif Tumbuh AI. Klien tidak diperkenankan menyalin, merekayasa balik (<i>reverse-engineer</i>), atau menjual ulang Layanan (<i>white-labeling</i>) tanpa perjanjian lisensi terpisah. Data bisnis dan log <i>chat</i> yang dihasilkan tetap menjadi milik Klien.
          </p>

          <h3 className="text-xl text-slate-900 mt-10 mb-4 border-l-4 border-blue-600 pl-4">7. Kebijakan Pembayaran & Pengembalian Dana (Refund Policy)</h3>
          <p>
            Semua transaksi dan biaya berlangganan di Tumbuh AI diproses menggunakan mata uang <strong>Rupiah (IDR)</strong> melalui pihak ketiga penyedia gerbang pembayaran (Payment Gateway) yang resmi dan berlisensi. Mengingat sifat produk kami adalah perangkat lunak dan layanan digital (SaaS), <strong>semua pembayaran bersifat final dan tidak dapat dikembalikan (Non-Refundable)</strong>, kecuali terjadi kesalahan penagihan ganda dari sistem kami.
          </p>

          <h3 className="text-xl text-slate-900 mt-10 mb-4 border-l-4 border-blue-600 pl-4">8. Kebijakan Privasi (Privacy Policy) & Keamanan Data</h3>
          <p>
            Tumbuh AI sangat menghargai privasi Anda. Informasi pribadi yang Anda berikan saat mendaftar atau melakukan pembayaran (seperti nama, email, dan nomor telepon) <strong>hanya akan digunakan untuk keperluan operasional layanan, penagihan, dan komunikasi resmi</strong>. Kami tidak akan pernah menjual, menyewakan, atau membagikan data pribadi Anda kepada pihak ketiga untuk tujuan pemasaran tanpa izin eksplisit dari Anda.
          </p>

          <h3 className="text-xl text-slate-900 mt-10 mb-4 border-l-4 border-blue-600 pl-4">9. Hukum yang Berlaku (Applicable Law)</h3>
          <p>
            Syarat dan Ketentuan ini tunduk pada, dan ditafsirkan sesuai dengan, hukum yang berlaku di wilayah <strong>Negara Kesatuan Republik Indonesia</strong>. Segala bentuk perselisihan yang tidak dapat diselesaikan secara musyawarah akan diselesaikan melalui yurisdiksi pengadilan yang berwenang di Indonesia.
          </p>

          <h3 className="text-xl text-slate-900 mt-10 mb-4 border-l-4 border-blue-600 pl-4">10. Informasi Kontak (Contact Us)</h3>
          <p>
            Jika Anda memiliki pertanyaan, kendala teknis, atau keluhan terkait layanan dan tagihan, Anda dapat menghubungi tim kami melalui:
          </p>
          <ul className="list-none space-y-1 mt-2 font-medium">
            <li>📧 Email: <a href="mailto:jacquellinobryan@gmail.com">jacquellinobryan@gmail.com</a></li>
            <li>📍 Alamat: JL. Diponegoro No.21, Pontianak Kota, Kalimantan Barat</li>
          </ul>

        </div>
      </div>
    </div>
  );
}