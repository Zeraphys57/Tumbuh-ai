import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { extractText } from "unpdf";

import { genAI } from "@/lib/gemini";
import { supabaseAdmin as supabase } from "@/lib/supabase";

export const maxDuration = 60;

function smartChunkText(text: string, chunkSize: number = 1000, overlap: number = 200) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + chunkSize));
    i += chunkSize - overlap;
  }
  return chunks;
}

export async function POST(req: Request) {
  try {
    // ========================================================
    // [FIX 🔴]: AUTH CHECK (MENCEGAH UPLOAD ILEGAL)
    // ========================================================
    const cookieStore = cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name) { return cookieStore.get(name)?.value } } }
    );

    const { data: { user } } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Sesi telah habis, harap login kembali." }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const clientSlug = formData.get("clientId") as string; 

    if (!file || !clientSlug) {
      return NextResponse.json({ error: "File dan Client ID wajib diisi" }, { status: 400 });
    }

    const clientId = clientSlug;

    // Pastikan user hanya bisa upload ke Client ID miliknya sendiri
    if (user.id !== clientId) {
      return NextResponse.json({ error: "Forbidden. Anda tidak memiliki akses ke data klien ini." }, { status: 403 });
    }

    const fileName = file.name;

    const { data: clientData, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("id", clientId)
      .maybeSingle();

    if (clientError || !clientData) {
      return NextResponse.json({ error: "Klien tidak ditemukan" }, { status: 404 });
    }

    // ========================================================
    // CEGAH DUPLIKAT DOKUMEN
    // ========================================================
    const { data: existingDoc } = await supabase
      .from("client_knowledge")
      .select("id")
      .eq("client_id", clientId)
      .eq("document_name", fileName)
      .limit(1);

    if (existingDoc && existingDoc.length > 0) {
      return NextResponse.json({ 
        error: `File "${fileName}" sudah ada di memori AI. Hapus file lama di tabel jika ingin update versi baru.` 
      }, { status: 409 });
    }

    console.log(`[RAG ENGINE] Memproses: ${fileName} untuk klien: ${clientSlug}`);

    // ========================================================
    // JALUR GANDA UNTUK PDF DAN MARKDOWN
    // ========================================================
    const fileNameLower = fileName.toLowerCase();
    let fullText = "";

    if (fileNameLower.endsWith(".pdf") || file.type === "application/pdf") {
      console.log(`[RAG ENGINE] Mengekstrak teks dari file PDF...`);
      const arrayBuffer = await file.arrayBuffer();
      const pdfBuffer = new Uint8Array(arrayBuffer); 
      const extracted: any = await extractText(pdfBuffer);
      fullText = Array.isArray(extracted.text) ? extracted.text.join(" ") : String(extracted.text || "");
      
    } else if (fileNameLower.endsWith(".md") || file.type.includes("markdown") || file.type.includes("text")) {
      console.log(`[RAG ENGINE] Mengekstrak teks dari file Markdown...`);
      fullText = await file.text();
      
    } else {
      return NextResponse.json({ error: "Format file tidak didukung. Harap gunakan PDF atau .md" }, { status: 400 });
    }
    
    let rawText = fullText.replace(/\n/g, " ").replace(/\s+/g, " ").trim();

    if (!rawText || rawText.length < 50) {
      return NextResponse.json({ error: "Dokumen kosong atau berisi gambar/scan yang tidak bisa dibaca teksnya." }, { status: 400 });
    }

    if (rawText.length < 1500) { 
      return NextResponse.json({ 
        error: "❌ DOKUMEN TERLALU PENDEK! Silakan Copy-Paste isi dokumen ini ke kotak 'AI Trainer' di atas agar AI merespon lebih cepat." 
      }, { status: 400 });
    }

    const textChunks = smartChunkText(rawText, 1000, 200);
    console.log(`[RAG ENGINE] Dokumen dipotong menjadi ${textChunks.length} chunks.`);

    // ========================================================
    // [FIX 🟡]: AUTO-RETRY HANYA UNTUK RATE LIMIT (429)
    // ========================================================
    const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    
    const embedWithRetry = async (chunk: string, retries = 3): Promise<any> => {
      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          return await embeddingModel.embedContent({
            content: { role: "user", parts: [{ text: chunk }] },
            taskType: "RETRIEVAL_DOCUMENT",
            outputDimensionality: 1536
          } as any);
        } catch (err: any) {
          const isRateLimit = err?.status === 429 || 
             String(err?.message).includes('429') || 
             String(err?.message).toLowerCase().includes('rate');

          if (attempt === retries - 1 || !isRateLimit) throw err; // Lempar error jika bukan 429 atau jatah habis
          
          console.warn(`[RAG ENGINE] Rate Limit Google terdeteksi! Sabar... Mencoba lagi dalam ${attempt + 1} detik (Percobaan ${attempt + 1}/${retries})`);
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    };

    // ========================================================
    // PARALLEL BATCH EMBEDDING (ANTI-TIMEOUT)
    // ========================================================
    const databaseRows: any[] = [];
    const BATCH_SIZE = 5;

    for (let i = 0; i < textChunks.length; i += BATCH_SIZE) {
      const batchChunks = textChunks.slice(i, i + BATCH_SIZE);
      const embedPromises = batchChunks.map(chunk => embedWithRetry(chunk));
      const batchResults = await Promise.all(embedPromises);

      batchResults.forEach((result, idx) => {
        databaseRows.push({
          client_id: clientId,
          document_name: fileName,
          content: batchChunks[idx],
          embedding: result.embedding.values
        });
      });

      if (i + BATCH_SIZE < textChunks.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // ========================================================
    // BATCH INSERT SUPABASE DENGAN ROLLBACK
    // ========================================================
    const INSERT_BATCH = 20; 
    
    for (let i = 0; i < databaseRows.length; i += INSERT_BATCH) {
      const batchRows = databaseRows.slice(i, i + INSERT_BATCH);
      
      const { error: insertError } = await supabase
        .from("client_knowledge")
        .insert(batchRows);

      if (insertError) {
        console.error(`Gagal insert batch ke-${i/INSERT_BATCH}:`, insertError.message);
        
        // [FIX TERAKHIR]: Pastikan rollback tidak gagal diam-diam
        const { error: rollbackErr } = await supabase
          .from("client_knowledge")
          .delete()
          .eq("client_id", clientId)
          .eq("document_name", fileName);

        if (rollbackErr) {
          console.error("⚠️ FATAL: Rollback gagal! Data mungkin kotor/setengah masuk:", rollbackErr.message);
        } else {
          console.warn("♻️ Rollback berhasil. Sisa data yang sempat masuk telah dibersihkan.");
        }

        throw new Error("Gagal menyimpan memori ke database. Perubahan otomatis dibatalkan.");
      }
    }

    console.log(`[RAG ENGINE] Sukses! ${databaseRows.length} vektor tersimpan di Supabase.`);

    return NextResponse.json({ 
      success: true, 
      message: `Dokumen ${fileName} berhasil diproses dengan sangat cepat!`,
      total_chunks: databaseRows.length
    });

  } catch (error: any) {
    // ========================================================
    // [FIX 🔴]: MENCEGAH ERROR LEAK KE CLIENT
    // ========================================================
    console.error("[RAG ENGINE] Fatal Error:", error.message);
    return NextResponse.json({ error: "Terjadi kesalahan internal. Silakan coba lagi." }, { status: 500 });
  }
}