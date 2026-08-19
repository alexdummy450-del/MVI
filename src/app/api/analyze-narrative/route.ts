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

    const modelsToTry = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-2.5-flash"];
    let parsedData = null;
    let errors: string[] = [];

    // Approach 1: Google REST API with ?key= and x-goog-api-key header (Works for all AI Studio keys including AQ... and AIza...)
    for (const modelName of modelsToTry) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${cleanKey}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": cleanKey,
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
        if (res.ok && json.candidates?.[0]?.content?.parts?.[0]?.text) {
          parsedData = JSON.parse(json.candidates[0].content.parts[0].text);
          break;
        } else if (json.error?.message) {
          errors.push(`REST API key: ${json.error.message}`);
        }
      } catch (err: any) {
        errors.push(`REST API key fetch error: ${err.message}`);
      }
    }

    if (parsedData) return NextResponse.json(parsedData);

    // Approach 2: Official GoogleGenerativeAI SDK
    for (const modelName of modelsToTry) {
      try {
        const genAI = new GoogleGenerativeAI(cleanKey);
        const generationConfig = {
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              probableCause: { type: SchemaType.STRING },
              contributingFactors: { type: SchemaType.STRING },
              recommendations: { type: SchemaType.STRING },
            },
            required: ["probableCause", "contributingFactors", "recommendations"],
          },
        };
        const model = genAI.getGenerativeModel({ model: modelName, generationConfig: generationConfig as any });
        const result = await model.generateContent(prompt);
        if (result?.response?.text()) {
          parsedData = JSON.parse(result.response.text());
          break;
        }
      } catch (err: any) {
        errors.push(`SDK: ${err.message}`);
      }
    }

    if (parsedData) return NextResponse.json(parsedData);

    // Approach 3: REST API with Bearer token header
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
        if (res.ok && json.candidates?.[0]?.content?.parts?.[0]?.text) {
          parsedData = JSON.parse(json.candidates[0].content.parts[0].text);
          break;
        } else if (json.error?.message) {
          errors.push(`REST Bearer: ${json.error.message}`);
        }
      } catch (err: any) {
        errors.push(`REST Bearer error: ${err.message}`);
      }
    }

    if (parsedData) return NextResponse.json(parsedData);

    throw new Error(errors.join(" | ") || "Failed to analyze narrative with Gemini API.");

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to analyze narrative" }, { status: 500 });
  }
}
