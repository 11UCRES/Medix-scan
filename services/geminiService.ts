import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ExtractionResult, MedicineDetails } from "../types";
import { TRANSLATIONS } from "../constants";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Helper for Quota Error Checking ---
const isQuotaError = (error: any): boolean => {
  const msg = error?.message?.toLowerCase() || error?.toString().toLowerCase() || '';
  const code = error?.status || error?.code;
  return msg.includes('429') || msg.includes('quota') || code === 429 || code === 'RESOURCE_EXHAUSTED';
};

// --- Schemas ---

const healthDocumentSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    type: { type: Type.STRING, enum: ["PRESCRIPTION", "REPORT", "OTHER"], description: "Type of the document." },
    medicines: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { 
            type: Type.STRING, 
            description: "The standardized English name of the medicine. MUST always be in English. Correct spelling errors using context (dosage/form)." 
          },
          dosage: { type: Type.STRING },
          frequency: { type: Type.STRING },
          instructions: { type: Type.STRING },
          purpose: { type: Type.STRING },
          warnings: { type: Type.STRING },
          confidence: { 
            type: Type.STRING, 
            enum: ["HIGH", "LOW"], 
            description: "HIGH if clearly legible or confidently inferred. LOW if completely illegible." 
          },
          note: { type: Type.STRING }
        },
        required: ["name", "confidence"],
      },
      description: "List of medicines if it is a prescription."
    },
    reportFindings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          parameter: { type: Type.STRING },
          value: { type: Type.STRING },
          status: { type: Type.STRING, enum: ["Normal", "Abnormal", "Critical", "Unknown"] }
        }
      }
    },
    patientAdvice: {
      type: Type.OBJECT,
      properties: {
        dietaryAllowed: { type: Type.ARRAY, items: { type: Type.STRING } },
        dietaryAvoid: { type: Type.ARRAY, items: { type: Type.STRING } },
        lifestyleTips: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    },
    summary: { type: Type.STRING }
  },
  required: ["type", "summary"],
};

const medicineSearchSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    found: { type: Type.BOOLEAN, description: "True if the medicine exists." },
    name: { type: Type.STRING, description: "Correct standard name of the medicine (English). If it is a local brand, keep the brand name." },
    genericName: { type: Type.STRING, description: "Generic name (e.g., Esomeprazole, Paracetamol)." },
    suggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of similar medicine names if the exact query was not found." },
    uses: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Why is it eaten/taken?" },
    dosageByAge: {
      type: Type.OBJECT,
      properties: {
        child: { type: Type.STRING, description: "Dosage/Safety for children." },
        adult: { type: Type.STRING, description: "Dosage for adults." },
        elderly: { type: Type.STRING, description: "Dosage/Precautions for elderly." }
      }
    },
    sideEffects: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Common side effects." },
    advantages: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Benefits or advantages of this medicine." },
    warnings: { type: Type.STRING, description: "Critical warnings." }
  },
  required: ["found"]
};

const suggestionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    suggestions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of valid medicine names."
    }
  }
};

const diseaseMedicineListSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    medicines: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Medicine Brand Name or Generic Name" },
          indication: { type: Type.STRING, description: "Short, clear reason why this medicine is used for the specific disease (1 sentence)." }
        },
        required: ["name", "indication"]
      },
      description: "List of relevant medicines with their specific usage reason."
    }
  }
};

// --- Helpers ---

const parseMedia = (dataUrl: string) => {
  if (dataUrl.startsWith('data:')) {
    const [header, base64] = dataUrl.split(',');
    const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
    return { mimeType, data: base64 };
  }
  return { mimeType: 'image/jpeg', data: dataUrl };
};

// --- Services ---

export const analyzePrescription = async (base64Image: string, language: 'en' | 'bn'): Promise<ExtractionResult> => {
  try {
    const pharmacistPrompt = language === 'bn' 
      ? `ভূমিকা: আপনি একজন ২০ বছরের অভিজ্ঞতাসম্পন্ন বিশেষজ্ঞ ফার্মাসিস্ট। আপনার কাজ হলো এই প্রেসক্রিপশনের অস্পষ্ট হাতের লেখা পাঠোদ্ধার করা।
      
      নির্দেশনা:
      ১. **নাম সনাক্তকরণ**: ওষুধের নামের প্রথম অক্ষর, ডোজ (mg/ml) এবং সেবনের নিয়ম দেখে সঠিক নামটি বের করুন।
      ২. **ব্র্যান্ড অগ্রাধিকার**: বাংলাদেশের প্রচলিত ব্র্যান্ড (যেমন: Square, Beximco, Incepta, Opsonin, Renata -র ওষুধ) অগ্রাধিকার দিন।
      ৩. **যৌক্তিক বিশ্লেষণ**: যদি লেখা থাকে 'Tab. Secl... 20mg', তাহলে এটি 'Seclo 20mg'।
      
      ভাষা ও ফরম্যাট (খুব গুরুত্বপূর্ণ):
      - **ওষুধের নাম**: অবশ্যই **ইংরেজিতে** (English) হতে হবে।
      - **ডোজ, সেবনের নিয়ম, এবং উদ্দেশ্য**: বাংলায় হতে হবে।
      - **Summary (সারাংশ)**: অবশ্যই **সম্পূর্ণ বাংলায়** হতে হবে। যেমন: "এটি একটি প্রেসক্রিপশন যেখানে গ্যাস্ট্রিকের ওষুধ দেওয়া হয়েছে..."।
      - **Report Findings**: যদি রিপোর্ট হয়, তবে প্যারামিটার নাম ইংরেজিতে হতে পারে, কিন্তু মন্তব্য বাংলায় হবে।`
      
      : `Role: You are a Senior Pharmacist and OCR Expert specializing in medical handwriting forensics.
      
      Task: Transcribe this prescription image with high accuracy.
      
      Strategies:
      1. **Deductive Reasoning**: Illegible handwriting MUST be reconstructed using context clues:
         - **Dosage Match**: '500mg' usually implies Paracetamol, Ciprofloxacin, or Azithromycin.
         - **Prefix Match**: 'Tab. Pan...' -> likely 'Pantonix' or 'Pantoprazole'.
         - **Form Match**: 'Syr.' implies liquid medications (Tofen, Basok, etc.).
      
      2. **Knowledge Base**: Prioritize pharmaceutical brands common in **Bangladesh & South Asia** (e.g., manufacturers like Square, Beximco, Incepta, Renata).
         - Examples: Napa, Seclo, Maxpro, Sergel, Bizoran, Losectil, Fexo, Monas.
      
      3. **Correction**: Correct spelling errors in the handwriting (e.g., 'Azithromicin' -> 'Azithromycin').
      
      4. **Uncertainty**: If a name is completely unreadable even with context, set 'confidence' to 'LOW' and provide a note explaining why.
      
      5. **Reports**: If this is a lab report, extract key findings and values.`;

    const { mimeType, data } = parseMedia(base64Image);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: data } },
          { text: pharmacistPrompt }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: healthDocumentSchema,
        thinkingConfig: {
          thinkingBudget: 12000 // Significantly increased budget for complex handwriting reasoning
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as ExtractionResult;
  } catch (error) {
    console.error("Error analyzing document:", error);
    if (isQuotaError(error)) throw new Error("QUOTA_EXCEEDED");
    throw error;
  }
};

export const suggestMedicines = async (query: string): Promise<string[]> => {
  if (!query || query.length < 1) return [];
  try {
    const prompt = `
      Task: Return a JSON array of 5 Bangladeshi medicine brand names or generic names.
      Input: "${query}"
      
      RULES:
      1. All names MUST START with "${query}" (case-insensitive).
      2. Prioritize Top BD Brands: Square, Beximco, Incepta, Opsonin, SK+F, Renata.
      3. No explanations, just the list.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { text: prompt },
      config: {
        responseMimeType: 'application/json',
        responseSchema: suggestionSchema,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    const text = response.text;
    if (!text) return [];
    const result = JSON.parse(text) as { suggestions: string[] };
    return result.suggestions || [];
  } catch (error) {
    // Fail silently for suggestions to avoid UI clutter
    return [];
  }
};

export const getMedicinesForDisease = async (disease: string, language: 'en' | 'bn' = 'en'): Promise<{name: string, indication: string}[]> => {
  try {
    const prompt = `
      Task: List 10 popular and medically appropriate medicines (Brands available in Bangladesh) used to treat: "${disease}".
      
      Rules:
      1. STRICTLY RELEVANT: Only include medicines actually prescribed for "${disease}".
      2. Provide a short "indication" (1 sentence) explaining why it is used (e.g., "Reduces stomach acid", "Relieves pain", "Controls blood sugar").
      3. Mix of common brands (e.g. Seclo, Napa, Bizoran, Comet) and generics if brands aren't clear.
      4. **LANGUAGE**: Return the 'indication' text in ${language === 'bn' ? 'Bengali (Bangla)' : 'English'}. Keep medicine names in English.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { text: prompt },
      config: {
        responseMimeType: 'application/json',
        responseSchema: diseaseMedicineListSchema,
        thinkingConfig: { thinkingBudget: 0 } 
      }
    });

    const text = response.text;
    if (!text) return [];
    const result = JSON.parse(text) as { medicines: {name: string, indication: string}[] };
    return result.medicines || [];
  } catch (error) {
    console.error("Disease search error:", error);
    if (isQuotaError(error)) throw new Error("QUOTA_EXCEEDED");
    return [];
  }
};

export const searchMedicineDetails = async (query: string, language: 'en' | 'bn'): Promise<MedicineDetails> => {
  try {
    const prompt = `
      You are a pharmaceutical database for Bangladesh & International medicines.
      User Query: "${query}"
      
      Step 1: EXACT MATCH CHECK (Local & Global)
      - Check if "${query}" is a valid brand name in **Bangladesh** (e.g. manufactured by Square, Beximco, Incepta, etc.).
      - Example: "Exium" IS a valid Esomeprazole brand by Square Pharma. It is NOT a typo for Nexium.
      - Example: "Napa" IS a valid Paracetamol brand.
      
      Step 2: GENERIC CHECK
      - Is it a generic name?
      
      Step 3: TYPO CHECK (Only if Step 1 & 2 fail)
      - Only if it is NOT a local brand, assume it is a typo and suggest corrections (e.g. "Nexum" -> "Nexium").
      
      Output Logic:
      - If found (Brand or Generic): found=true. Provide Uses, Dosage (Child/Adult/Elderly), Side Effects, Advantages.
      - If NOT found: found=false, provide suggestions.
      
      Language: Output text in ${language === 'bn' ? 'Bengali (Bangla)' : 'English'}, but keep technical names in English.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { text: prompt },
      config: {
        responseMimeType: 'application/json',
        responseSchema: medicineSearchSchema,
        thinkingConfig: { thinkingBudget: 0 } // Speed optimization
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response");
    return JSON.parse(text) as MedicineDetails;
  } catch (error) {
    console.error("Search error:", error);
    if (isQuotaError(error)) throw new Error("QUOTA_EXCEEDED");
    throw error;
  }
};

export const chatWithAi = async (
  message: string, 
  image: string | undefined, 
  history: {role: 'user' | 'model', text: string, image?: string}[], 
  language: 'en' | 'bn'
): Promise<string> => {
  try {
    const systemInstruction = `You are MediScan AI.
    Language: ${language === 'bn' ? 'Bengali (Bangla)' : 'English'}.
    Role: Help users understand medical info. Do NOT diagnose.
    `;

    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: { systemInstruction },
      history: history.map(h => {
        const parts: any[] = [];
        if (h.image && h.role === 'user') {
           const { mimeType, data } = parseMedia(h.image);
           parts.push({ inlineData: { mimeType, data } });
        }
        parts.push({ text: h.text });
        return { role: h.role, parts };
      })
    });

    const parts: any[] = [];
    if (image) {
      const { mimeType, data } = parseMedia(image);
      parts.push({ inlineData: { mimeType, data } });
    }
    if (message) parts.push({ text: message });

    const result = await chat.sendMessage({ message: parts }); 
    return result.text || "";
  } catch (error) {
    console.error("Chat error:", error);
    if (isQuotaError(error)) {
      return TRANSLATIONS[language].errorQuota;
    }
    return language === 'bn' ? "সংযোগ সমস্যা হচ্ছে। আবার চেষ্টা করুন।" : "Connection error. Please try again.";
  }
};