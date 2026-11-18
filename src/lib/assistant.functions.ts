import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const askEnvironmentalAssistant = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ question: z.string().min(1).max(1000), context: z.string().max(60000) }).parse(d))
  .handler(async ({ data }) => {
    const { askAssistant } = await import("./assistant.server");
    try {
      return { answer: await askAssistant(data.question, data.context), error: null as string | null };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Assistant failed";
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 402) return { answer: "", error: "AI credits are used up for this workspace." };
      if (status === 429) return { answer: "", error: "Too many requests — try again in a moment." };
      return { answer: "", error: msg };
    }
  });
