import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { narrative } = await request.json();

    if (!narrative) {
      return NextResponse.json({ error: "Narrative is required" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Gemini API Key is not configured" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const prompt = `
You are a senior Motor Vehicle Inspector and crash investigator. 
Given the following crash reconstruction narrative, extract and analyze the details to provide:
1. Probable Cause: A concise statement of the main cause of the crash (e.g. "Speeding", "Improper Overtaking", "Mechanical Failure").
2. Contributing Factors: Any secondary factors that contributed (e.g. weather, road conditions, driver fatigue).
3. Observations & Recommendations: What actions should be taken or were observed to prevent future occurrences.
Give at least three points on each. 

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
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
      result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig,
      });
    } catch (error: any) {
      if (error.message && error.message.includes("503")) {
        console.warn("Gemini API 503 High Demand, falling back to gemini-3.5-flash-lite...");
        const liteModel = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });
        result = await liteModel.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig,
        });
      } else {
        throw error;
      }
    }

    const responseText = result.response.text();
    const parsedData = JSON.parse(responseText);

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to analyze narrative" }, { status: 500 });
  }
}
