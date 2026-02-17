import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { words, action } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = "";
    let userPrompt = "";

    if (action === "extract-and-translate") {
      // Extract words from raw text and translate
      systemPrompt = `You are a vocabulary extraction and translation assistant. 
Extract all English vocabulary words from the given text. For each word, provide the Hebrew translation.
Return ONLY a JSON array of objects with "english" and "hebrew" fields.
Example: [{"english": "adventure", "hebrew": "הרפתקה"}]
Do not include duplicates. Normalize words to their base form.`;
      userPrompt = `Extract and translate all English vocabulary words from this text:\n\n${words}`;
    } else if (action === "translate") {
      // Translate a list of English words
      systemPrompt = `You are a translation assistant. Translate the given English words to Hebrew.
Return ONLY a JSON array of objects with "english" and "hebrew" fields.
Example: [{"english": "book", "hebrew": "ספר"}]`;
      userPrompt = `Translate these English words to Hebrew: ${JSON.stringify(words)}`;
    } else if (action === "translate-text") {
      // Translate a passage of text
      systemPrompt = `You are a translation assistant. Translate the given English text to Hebrew accurately. Return only the Hebrew translation.`;
      userPrompt = words;
    } else if (action === "generate-questions") {
      // Generate comprehension questions about a text passage
      systemPrompt = `You are an English teacher creating comprehension questions for Hebrew-speaking students.
Given a passage of English text, generate 3-5 multiple choice questions in Hebrew about the content.
Return ONLY a JSON array of objects with fields:
- "question" (string, in Hebrew)
- "options" (array of 4 strings, in Hebrew)
- "correctIndex" (number, 0-3)
Example: [{"question": "מה קרה בסיפור?", "options": ["א", "ב", "ג", "ד"], "correctIndex": 0}]`;
      userPrompt = `Generate comprehension questions for this text:\n\n${words}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", status, errorText);
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ result: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
