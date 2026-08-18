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

    const genAI = new GoogleGenerativeAI(cleanKey);

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

    let result;
    const modelsToTry = ["gemini-2.0-flash", "gemini-1.5-flash"];
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
        console.warn(`Model ${modelName} failed:`, err.message);
      }
    }

    if (!result) {
      throw lastError || new Error("Failed to generate content with Gemini API");
    }

    const responseText = result.response.text();
    const parsedData = JSON.parse(responseText);

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to analyze narrative" }, { status: 500 });
  }
}
