import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Pake kunci VIP (Service Role) biar bisa langsung hapus data tanpa dihalangi aturan database
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function DELETE(req: Request) {
  try {
    const { clientId, documentName } = await req.json();

    if (!clientId || !documentName) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    // SAPU BERSIH SEMUA POTONGAN MEMORI BERDASARKAN NAMA FILE
    const { error } = await supabase
      .from("client_knowledge")
      .delete()
      .eq("client_id", clientId)
      .eq("document_name", documentName);

    if (error) throw error;

    return NextResponse.json({ success: true, message: `Dokumen ${documentName} sukses dihapus!` });

  } catch (error: any) {
    console.error("Gagal hapus dokumen:", error.message);
    return NextResponse.json({ error: "Gagal menghapus dokumen dari server" }, { status: 500 });
  }
}