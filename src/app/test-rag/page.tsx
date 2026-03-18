"use client";

import { useState } from "react";

export default function TestRAGPage() {
  const [file, setFile] = useState<File | null>(null);
  const [clientId, setClientId] = useState(""); // Slug dari database klien
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !clientId) {
      setMessage("⚠️ File PDF dan Client ID wajib diisi!");
      return;
    }

    setLoading(true);
    setMessage("⏳ Sedang menggiling dokumen, AI sedang membaca...");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("clientId", clientId);

    try {
      const res = await fetch("/api/upload-knowledge", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal upload");
      }

      setMessage(`✅ BERHASIL! ${data.message} (Terpotong jadi ${data.total_chunks} vektor)`);
    } catch (err: any) {
      setMessage(`❌ ERROR: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">🧠 RAG Injector</h1>
        <p className="text-gray-500 mb-6 text-sm">Upload SOP / Knowledge Base Klien</p>

        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug Client ID</label>
            <input
              type="text"
              className="w-full border border-gray-300 p-2 rounded-md"
              placeholder="Contoh: klinik-sehat"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">File PDF (.pdf)</label>
            <input
              type="file"
              accept=".pdf"
              className="w-full border border-gray-300 p-2 rounded-md bg-gray-50"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full text-white font-bold py-3 rounded-md transition-all ${
              loading ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Menyuntikkan ke Otak AI..." : "Upload Dokumen 🚀"}
          </button>
        </form>

        {message && (
          <div className={`mt-6 p-4 rounded-md text-sm font-medium ${message.includes("BERHASIL") ? "bg-green-100 text-green-800" : message.includes("ERROR") || message.includes("⚠️") ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}