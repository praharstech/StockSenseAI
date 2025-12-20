import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, ChartDataPoint, GroundingSource, StockData, NewsItem, StockQuote } from "../types";

/**
 * Strips non-numeric characters (except decimal points) from a value.
 * Vital for handling AI responses that might include currency symbols or commas.
 */
const cleanNumber = (val: any): number => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^\d.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
};

/**
 * Robust JSON extraction utility.
 * Searches for the first '{' and the last '}' to extract a JSON object from a potentially messy string.
 */
const extractJson = (text: string) => {
  if (!text) return null;
  
  // Clean markdown blocks
  let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
  
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    
    if (start !== -1 && end !== -1 && end > start) {
      try {
        const potentialJson = cleaned.substring(start, end + 1);
        return JSON.parse(potentialJson);
      } catch (innerError) {
        console.debug("Manual JSON extraction failed", innerError);
      }
    }
    return null;
  }
};

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === '') {
    throw new Error("Configuration Required: Google Gemini API Key is missing. Please add 'API_KEY' to your Vercel Environment Variables.");
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
    
    // Normalize symbol for Indian markets
    const searchSymbol = symbol.toUpperCase().includes(':') ? symbol.toUpperCase() : `NSE:${symbol.toUpperCase()}`;

    const prompt = `
      Perform a search for the LATEST real-time share price of "${searchSymbol}" on the NSE or BSE India.
      Find the current price, a support level for suggested buy, and a short-term target price.
      
      Return ONLY a JSON object:
      {"currentPrice": number, "suggestedBuy": number, "suggestedSell": number}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are a professional financial data extractor for Indian stocks. Return raw numeric data in JSON. If exact prices are unavailable, provide the most recent quoted price from the search results. If you hit a limit or cannot find it, do not return 0, instead explain why in the text part.",
      },
    });

    const responseText = response.text || "";
    let rawData = extractJson(responseText);

    // Heuristic Fallback: If JSON extraction failed, look for numbers in the text that look like prices
    if (!rawData || !cleanNumber(rawData.currentPrice)) {
      const numbers = responseText.match(/\d{1,5}(?:,\d{3})*(?:\.\d+)?/g);
      if (numbers && numbers.length >= 1) {
        const price = cleanNumber(numbers[0]);
        if (price > 1) { // Avoid picking up small numbers that aren't stock prices
          rawData = {
            currentPrice: price,
            suggestedBuy: price * 0.96,
            suggestedSell: price * 1.08
          };
        }
      }
    }

    const sources: GroundingSource[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web?.uri && chunk.web?.title) {
          sources.push({ title: chunk.web.title, uri: chunk.web.uri });
        }
      });
    }

    const currentPrice = cleanNumber(rawData?.currentPrice);

    if (currentPrice <= 0) {
      throw new Error(`Price for ${symbol} not found. Please ensure the ticker is correct (e.g., ADANIPOWER or RELIANCE).`);
    }

    return {
      currentPrice: currentPrice,
      suggestedBuy: cleanNumber(rawData?.suggestedBuy) || currentPrice * 0.95,
      suggestedSell: cleanNumber(rawData?.suggestedSell) || currentPrice * 1.10,
      sources,
    };
  } catch (error: any) {
    console.error("Stock Quote Fetch Error:", error);
    
    // Handle Quota Limit Specifically
    if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
      throw new Error("API Quota Exhausted: You have reached the Gemini API limit. Please wait a minute or use a different API key.");
    }

    if (error.message.includes("Configuration Required")) throw error;
    throw error;
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
      ? "Prioritize today's technical levels, volume spikes, and immediate resistance."
      : "Focus on fundamental growth, sector trends, and long-term valuation.";

    const analysisPrompt = `
      Deep analysis for Indian stock "${symbol}" (${quantity} units @ ₹${buyPrice}). Strategy: ${strategy}. 
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
        systemInstruction: "You are a senior equity analyst specializing in Indian markets. Use search grounding to provide factual, up-to-date data.",
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

    let analysisText = analysisResponse.text || "Analysis link failed.";
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
        price: cleanNumber(recMatch[2]),
        reason: recMatch[3].trim()
      };
    }

    const priceMatch = analysisText.match(/CURRENT_PRICE:\s*[^\d]*([\d,]+\.?\d*)/i);
    let currentPriceEstimate = undefined;
    if (priceMatch && priceMatch[1]) {
      currentPriceEstimate = cleanNumber(priceMatch[1]);
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
        price: cleanNumber(item.price),
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
    if (error.message?.includes('429')) {
      throw new Error("Quota Full: Gemini Pro has reached its hourly limit. Try again in a few minutes.");
    }
    if (error.message.includes("Configuration Required")) throw error;
    throw new Error("Intelligence link interrupted. Please verify your connection or API configuration.");
  }
};