import { executeAgenticCall } from "@/app/agentic/agentic-tools";

/**
 * Eksekusi semua agentic tool calls lalu kirim hasilnya ke Gemini.
 * Mengembalikan `response` objek penuh (bukan hanya teks) agar
 * route.ts bisa mengakses response.usageMetadata untuk usage logging.
 */
export async function executeAgenticTools(
  functionCalls: { name: string; args: any }[],
  chat: any,
  clientData: any
): Promise<{ response: any; reply: string }> {
  const functionResponses = [];

  for (const call of functionCalls) {
    console.log(`[AGENTIC] 🤖 Eksekusi tool: ${call.name}`);
    try {
      const toolResult = await executeAgenticCall(call.name, call.args, clientData);
      functionResponses.push({ functionResponse: { name: call.name, response: toolResult } });
    } catch (err) {
      console.error(`[AGENTIC] Tool ${call.name} gagal:`, err);
      // Kirim error sebagai response agar Gemini tetap bisa lanjut dengan tool lain
      functionResponses.push({
        functionResponse: {
          name: call.name,
          response: { error: "Tool tidak tersedia saat ini." },
        },
      });
    }
  }

  const step2Result = await chat.sendMessage(functionResponses);
  // Kembalikan response PENUH — route.ts membutuhkan response.usageMetadata
  const response = step2Result.response;
  return { response, reply: response.text() };
}
