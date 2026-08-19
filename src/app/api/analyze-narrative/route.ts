import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { NextResponse } from "next/server";

function formatAsNumberedList(input: any): string {
  if (!input) return "";
  let items: string[] = [];
  if (Array.isArray(input)) {
    items = input.map(i => String(i).trim());
  } else if (typeof input === "string") {
    items = input
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => line.replace(/^[-*•\d\.]+\s*/, "").trim())
      .filter(line => line.length > 0);
  }
  
  if (items.length === 0) return typeof input === "string" ? input.trim() : "";
  return items.map((item, idx) => `${idx + 1}. ${item}`).join("\n");
}

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
1. Probable Cause: Provide at least 3 distinct points detailing the primary cause(s) of the crash. Format each point on a NEW line starting with numbers (e.g. "1. First cause\\n2. Second cause\\n3. Third cause").
2. Contributing Factors: Provide at least 3 distinct points detailing secondary factors. Format each point on a NEW line starting with numbers.
3. Observations & Recommendations: Provide at least 3 distinct points detailing recommendations. Format each point on a NEW line starting with numbers.

Crash Narrative:
"${narrative}"
    `;

    const modelsToTry = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-2.5-flash"];
    let parsedData: any = null;
    let errors: string[] = [];

    // Approach 1: Direct REST API with ?key=
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

    // Approach 2: GoogleGenerativeAI SDK
    if (!parsedData) {
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
    }

    // Approach 3: REST API with Bearer token
    if (!parsedData) {
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
    }

    if (!parsedData) {
      throw new Error(errors.join(" | ") || "Failed to analyze narrative with Gemini API.");
    }

    // Format all output fields into clean numbered newline-separated lists
    const formattedData = {
      probableCause: formatAsNumberedList(parsedData.probableCause),
      contributingFactors: formatAsNumberedList(parsedData.contributingFactors),
      recommendations: formatAsNumberedList(parsedData.recommendations),
    };

    return NextResponse.json(formattedData);

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to analyze narrative" }, { status: 500 });
  }
}
