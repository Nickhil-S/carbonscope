import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

export async function askAssistant(question: string, context: string) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI is not configured.");
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    system:
      "You are CarbonScope's environmental assistant. Interpret ONLY the assessment data supplied in JSON. Never invent measurements, numbers or locations not present. If data is missing, say so. Note when land-use data is demo or user-provided rather than measured. Be practical and concise; use short headings and bullet points; give kg CO2e figures from the data.",
    messages: [{ role: "user", content: `Assessment data:\n${context}\n\nQuestion: ${question}` }],
    providerOptions: {
      openai: { store: false, forceReasoning: true, reasoningEffort: "low", include: ["reasoning.encrypted_content"] },
    },
  });
  return await result.text;
}
