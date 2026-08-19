import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { narrative } = await request.json();

    if (!narrative) {
      return NextResponse.json({ error: "Narrative is required" }, { status: 400 });
    }

    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      process.env.GOOGLE_GEMINI_API_KEY ||
      process.env.GEMINI_KEY ||
      process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API Key is not configured in environment variables." }, { status: 500 });
    }

    const cleanKey = apiKey.trim().replace(/^["']|["']$/g, "");

    const prompt = `
You are a senior Motor Vehicle Inspector and crash investigator. 
Given the following crash reconstruction narrative, extract and analyze the details to provide:
1. Probable Cause: A concise statement of the main cause of the crash (e.g. "Speeding", "Improper Overtaking", "Mechanical Failure").
2. Contributing Factors: Any secondary factors that contributed (e.g. weather, road conditions, driver fatigue).
3. Observations & Recommendations: What actions should be taken or were observed to prevent future occurrences.
4. Give at least three points on each. 

Crash Narrative:
"${narrative}"
    `;

    // 1. If key is standard API Key (starts with AIza...)
    if (cleanKey.startsWith("AIza")) {
      const genAI = new GoogleGenerativeAI(cleanKey);
      const generationConfig = {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            probableCause: {
              type: SchemaType.STRING,
              description: "A concise statement of the main cause of the crash",
            },
            contributingFactors: {
              type: SchemaType.STRING,
              description: "Any secondary factors that contributed",
            },
            recommendations: {
              type: SchemaType.STRING,
              description: "What actions should be taken or were observed to prevent future occurrences",
            },
          },
          required: ["probableCause", "contributingFactors", "recommendations"],
        },
      };

      const modelsToTry = ["gemini-2.0-flash", "gemini-1.5-flash"];
      let result;
      let lastError: any = null;

      for (const modelName of modelsToTry) {
        try {
          const model = genAI.getGenerativeModel({ 
            model: modelName,
            generationConfig: generationConfig as any
          });
          result = await model.generateContent(prompt);
          if (result) break;
        } catch (err: any) {
          lastError = err;
        }
      }

      if (!result) throw lastError || new Error("Failed to generate content with API Key");

      const responseText = result.response.text();
      return NextResponse.json(JSON.parse(responseText));
    }

    // 2. If key is an OAuth / Access Token (starts with AQ... or ya29... etc.)
    const modelsToTry = ["gemini-2.0-flash", "gemini-1.5-flash"];
    let parsedData = null;
    let lastRestError: any = null;

    for (const modelName of modelsToTry) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${cleanKey}`,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: {
                type: "OBJECT",
                properties: {
                  probableCause: { type: "STRING" },
                  contributingFactors: { type: "STRING" },
                  recommendations: { type: "STRING" },
                },
                required: ["probableCause", "contributingFactors", "recommendations"],
              },
            },
          }),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error?.message || `HTTP ${res.status}: ${res.statusText}`);
        }

        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          parsedData = JSON.parse(text);
          break;
        }
      } catch (err: any) {
        lastRestError = err;
      }
    }

    if (parsedData) {
      return NextResponse.json(parsedData);
    }

    throw lastRestError || new Error("Failed to authenticate token with Gemini REST API.");

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to analyze narrative" }, { status: 500 });
  }
}
