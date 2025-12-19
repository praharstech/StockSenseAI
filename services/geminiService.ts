
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, ChartDataPoint, GroundingSource, StockData, NewsItem, StockQuote } from "../types";

/**
 * Robustly extracts JSON from a string that might contain markdown or conversational text.
 * Uses regex to find the most likely JSON object or array boundaries.
 */
const extractJson = (text: string) => {
  if (!text) return null;
  
  // 1. Strip common markdown artifacts
  let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
  
  // 2. Attempt direct parse
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // 3. Regex Fallback: Search for first { to last } or first [ to last ]
    const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (innerError) {
        console.warn("JSON extraction regex failed to parse:", innerError);
      }
    }
    
    // 4. Manual Boundary Check (Last resort)
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    let start = -1;
    let endChar = '';

    if (firstBrace !== -1 && (firstBracket === -1 || (firstBrace < firstBracket && firstBrace !== -1))) {
      start = firstBrace;
      endChar = '}';
    } else if (firstBracket !== -1) {
      start = firstBracket;
      endChar = ']';
    }

    if (start !== -1) {
      const end = cleaned.lastIndexOf(endChar);
      if (end > start) {
        try {
          return JSON.parse(cleaned.substring(start, end + 1));
        } catch (finalError) {
          console.error("All JSON extraction methods failed.");
        }
      }
    }
    return null;
  }
};

/**
 * Fetches the current price and provides quick buy/sell suggestions.
 */
export const getStockQuote = async (symbol: string): Promise<StockQuote> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const prompt = `
      Search for the latest real-time stock price of "${symbol}" on Indian markets (NSE/BSE).
      Provide a specific JSON object. 
      Ensure values are numbers representing the price in INR.
      Format your response exactly like this example, but with real data:
      {"currentPrice": 2450.50, "suggestedBuy": 2420.00, "suggestedSell": 2550.00}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are a specialized financial data agent. Extract real-time data from search results and return it as clean, valid JSON. Do not add explanations.",
      },
    });

    const responseText = response.text || "{}";
    const rawData = extractJson(responseText) || {};

    const sources: GroundingSource[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web?.uri && chunk.web?.title) {
          sources.push({
            title: chunk.web.title,
            uri: chunk.web.uri,
          });
        }
      });
    }

    return {
      currentPrice: typeof rawData.currentPrice === 'number' ? rawData.currentPrice : 0,
      suggestedBuy: typeof rawData.suggestedBuy === 'number' ? rawData.suggestedBuy : 0,
      suggestedSell: typeof rawData.suggestedSell === 'number' ? rawData.suggestedSell : 0,
      sources,
    };
  } catch (error) {
    console.error("Quote Fetch Error:", error);
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const { symbol, buyPrice, quantity, strategy } = input;
  
  try {
    const strategyInstructions = strategy === 'intraday' 
      ? "Focus on high-frequency movements and immediate support/resistance for today's session."
      : "Focus on fundamentals, weekly trends, and a 7-day price forecast.";

    const analysisPrompt = `
      Perform a deep analysis for "${symbol}" (${quantity} shares bought at ₹${buyPrice}). 
      Current Strategy: ${strategy}. 
      ${strategyInstructions}
      
      Required Output Format:
      - Extract at least 3 NEWS_ITEMs: Headline | Summary | Sentiment (Positive/Negative/Neutral)
      - Provide a detailed analysis text.
      - Identify the CURRENT_PRICE: ₹Value
      - Provide a FINAL_RECOMMENDATION: SIGNAL (STRONG_BUY/STRONG_SELL/NEUTRAL/WAIT) | PRICE | REASON
    `;

    const analysisResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: analysisPrompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are an expert stock market analyst. Use provided search results to give accurate, grounded financial advice.",
      },
    });

    const chartPrompt = `
      Project 7 future price points for "${symbol}" based on current volatility and the ${strategy} strategy.
      Return ONLY a JSON array of objects with "label" (e.g., "10:00 AM" or "Day 1") and "price" (number).
    `;

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

    let analysisText = analysisResponse.text || "No analysis available.";
    
    const sources: GroundingSource[] = [];
    const chunks = analysisResponse.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web?.uri && chunk.web?.title) {
          sources.push({
            title: chunk.web.title,
            uri: chunk.web.uri,
          });
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
        sentiment: match[3].trim().toLowerCase() as 'positive' | 'negative' | 'neutral',
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

    let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (currentPriceEstimate) {
      if (currentPriceEstimate > buyPrice) sentiment = 'bullish';
      else if (currentPriceEstimate < buyPrice) sentiment = 'bearish';
    }

    return {
      analysisText,
      sources,
      chartData,
      currentPriceEstimate,
      sentiment,
      news,
      recommendation
    };

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to analyze stock data.");
  }
};
