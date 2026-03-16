import { getGeminiModel } from "@/lib/gemini";
import { supabase } from "@/lib/supabase";

export const processChat = async (clientId: string, userMessage: string) => {
  const { data: client, error } = await supabase
    .from('clients')
    .select('system_prompt')
    .eq('slug', clientId)
    .single();

  if (error || !client) throw new Error("Klien tidak ditemukan di database");

const model = getGeminiModel();
const finalPrompt = `Instructions: ${client.system_prompt}\n\nUser: ${userMessage}`;
const result = await model.generateContent(finalPrompt);
return result.response.text();
};