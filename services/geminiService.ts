import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, ChartDataPoint, GroundingSource, StockData, NewsItem, StockQuote } from "../types";

/**
 * Robust JSON extraction utility.
 * Searches for the first '{' and the last '}' to extract a JSON object from a potentially messy string.
 */
const extractJson = (text: string) => {
  if (!text) return null;
  
  // Try cleaning common markdown markers first
  let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
  
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Fallback: Find the boundaries of the first JSON object in the string
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    
    if (start !== -1 && end !== -1 && end > start) {
      try {
        const potentialJson = cleaned.substring(start, end + 1);
        return JSON.parse(potentialJson);
      } catch (innerError) {
        console.error("Manual JSON extraction failed", innerError);
      }
    }
    return null;
  }
};

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === '') {
    throw new Error("Configuration Required: Google Gemini API Key is missing. Add 'API_KEY' to your Vercel environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Fetches the current price and provides quick buy/sell suggestions.
 * Uses Google Search grounding to find real-time data for NSE/BSE.
 */
export const getStockQuote = async (symbol: string): Promise<StockQuote> => {
  try {
    const ai = getAIClient();
    
    // We use a high-instruction system prompt to force structured output
    const prompt = `
      Perform a real-time web search for the latest share price of "${symbol}" on the NSE (National Stock Exchange of India) or BSE.
      Locate the current trading price, a 52-week low for suggested buy, and a consensus target for suggested sell.
      
      Respond ONLY with a JSON object in this format:
      {"currentPrice": number, "suggestedBuy": number, "suggestedSell": number}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are a precise financial data extractor. Return only raw JSON data based on real-time search results. Do not include any conversational text.",
      },
    });

    const responseText = response.text || "";
    const rawData = extractJson(responseText);

    const sources: GroundingSource[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web?.uri && chunk.web?.title) {
          sources.push({ title: chunk.web.title, uri: chunk.web.uri });
        }
      });
    }

    if (!rawData || typeof rawData.currentPrice !== 'number') {
      console.error("Gemini returned invalid data structure:", responseText);
      throw new Error("Invalid data format received from AI.");
    }

    return {
      currentPrice: rawData.currentPrice,
      suggestedBuy: rawData.suggestedBuy || rawData.currentPrice * 0.95,
      suggestedSell: rawData.suggestedSell || rawData.currentPrice * 1.10,
      sources,
    };
  } catch (error: any) {
    console.error("Stock Quote Fetch Error:", error);
    // Return zeros only if there is a genuine failure, 
    // but propagate config errors so the UI can show the Setup prompt.
    if (error.message.includes("Configuration Required")) throw error;
    
    return {
      currentPrice: 0,
      suggestedBuy: 0,
      suggestedSell: 0,
      sources: []
    };
  }
};

/**
 * Analyzes the stock using Google Search for real-time context and generates a future projection.
 */
export const analyzeStockPosition = async (
  input: StockData
): Promise<AnalysisResult> => {
  const { symbol, buyPrice, quantity, strategy } = input;
  
  try {
    const ai = getAIClient();
    const strategyInstructions = strategy === 'intraday' 
      ? "Prioritize today's technical levels and immediate resistance."
      : "Focus on fundamental strength and sector outlook.";

    const analysisPrompt = `
      Deep analysis for "${symbol}" (${quantity} units @ ₹${buyPrice}). Strategy: ${strategy}. 
      ${strategyInstructions}
      
      Requirements:
      1. NEWS_ITEM: Headline | Summary | Sentiment (Positive/Negative/Neutral)
      2. CURRENT_PRICE: Estimated live value.
      3. FINAL_RECOMMENDATION: SIGNAL (STRONG_BUY/STRONG_SELL/NEUTRAL/WAIT) | PRICE | REASON
      4. Detailed reasoning in Markdown.
    `;

    const analysisResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: analysisPrompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are a professional equity researcher. Use Google Search grounding to verify all news and prices.",
      },
    });

    const chartPrompt = `Project the next 7 specific price points for "${symbol}". Return only a JSON array: [{"label": "Day 1", "price": 123.4}, ...]`;

    const chartResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: chartPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING },
              price: { type: Type.NUMBER },
            },
            required: ["label", "price"],
          },
        },
      },
    });

    let analysisText = analysisResponse.text || "Analysis failed.";
    const sources: GroundingSource[] = [];
    const chunks = analysisResponse.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web?.uri && chunk.web?.title) {
          sources.push({ title: chunk.web.title, uri: chunk.web.uri });
        }
      });
    }

    const news: NewsItem[] = [];
    const newsRegex = /NEWS_ITEM:\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(Positive|Negative|Neutral)/gi;
    let match;
    while ((match = newsRegex.exec(analysisText)) !== null) {
      news.push({
        headline: match[1].trim(),
        summary: match[2].trim(),
        sentiment: match[3].trim().toLowerCase() as any,
      });
    }

    let recommendation: AnalysisResult['recommendation'] = undefined;
    const recRegex = /FINAL_RECOMMENDATION:\s*(STRONG_BUY|STRONG_SELL|NEUTRAL|WAIT)\s*\|\s*([\d,]+\.?\d*)\s*\|\s*(.+)/i;
    const recMatch = analysisText.match(recRegex);
    if (recMatch) {
      recommendation = {
        signal: recMatch[1].trim() as any,
        price: parseFloat(recMatch[2].replace(/,/g, '')),
        reason: recMatch[3].trim()
      };
    }

    const priceMatch = analysisText.match(/CURRENT_PRICE:\s*[^\d]*([\d,]+\.?\d*)/i);
    let currentPriceEstimate = undefined;
    if (priceMatch && priceMatch[1]) {
      currentPriceEstimate = parseFloat(priceMatch[1].replace(/,/g, ''));
    }

    analysisText = analysisText
      .replace(newsRegex, '') 
      .replace(recRegex, '')
      .replace(/CURRENT_PRICE:.*(\r\n|\r|\n)?/gi, '') 
      .trim();

    let chartData: ChartDataPoint[] = [];
    const rawChartData = extractJson(chartResponse.text || "[]");
    if (Array.isArray(rawChartData)) {
      chartData = rawChartData.map((item: any) => ({
        label: item.label,
        price: item.price,
        type: 'forecast',
      }));
    }

    return {
      analysisText,
      sources,
      chartData,
      currentPriceEstimate,
      sentiment: (currentPriceEstimate || 0) >= buyPrice ? 'bullish' : 'bearish',
      news,
      recommendation
    };
  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    if (error.message.includes("Configuration Required")) throw error;
    throw new Error("Market Intelligence Link Interrupted. Please check your API Key and network.");
  }
};