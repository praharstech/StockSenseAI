import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, ChartDataPoint, GroundingSource, StockData, NewsItem, StockQuote } from "../types";

/**
 * Robustly extracts JSON from a string that might contain markdown or conversational text.
 * Improved to handle edge cases in Vercel/Production environments.
 */
const extractJson = (text: string) => {
  if (!text) return null;
  
  // 1. Strip common markdown artifacts
  let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
  
  // 2. Attempt direct parse
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // 3. Regex Fallback: Search for the main JSON structure
    const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (innerError) {
        console.warn("JSON extraction regex failed to parse:", innerError);
      }
    }
    
    // 4. Manual Boundary Check for messy strings
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
          console.error("All JSON extraction methods failed for input:", text.substring(0, 100) + "...");
        }
      }
    }
    return null;
  }
};

/**
 * Fetches the current price and provides quick buy/sell suggestions.
 * Uses Google Search to find real-time market data.
 */
export const getStockQuote = async (symbol: string): Promise<StockQuote> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const prompt = `
      Perform a real-time web search for the current share price of "${symbol}" on the NSE or BSE (India).
      Respond ONLY with a JSON object. Ensure the values are numbers. 
      Example format:
      {"currentPrice": 1234.50, "suggestedBuy": 1220.00, "suggestedSell": 1300.00}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are a precise financial data fetcher. Your only job is to search the web for current stock prices and return them in raw JSON format. Do not add any conversational text.",
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
      currentPrice: Number(rawData.currentPrice) || 0,
      suggestedBuy: Number(rawData.suggestedBuy) || 0,
      suggestedSell: Number(rawData.suggestedSell) || 0,
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
      ? "Focus on immediate volatility, key support/resistance for today, and news from the last 24 hours."
      : "Focus on fundamental growth drivers, earnings trends, and a 1-week outlook.";

    const analysisPrompt = `
      Analyze the current market position of "${symbol}" (${quantity} shares bought at ₹${buyPrice}). 
      Strategy: ${strategy}. 
      ${strategyInstructions}
      
      You must provide:
      1. At least 3 NEWS_ITEM entries: Headline | Summary | Sentiment (Positive/Negative/Neutral)
      2. A CURRENT_PRICE estimate based on your search.
      3. A FINAL_RECOMMENDATION: SIGNAL (STRONG_BUY/STRONG_SELL/NEUTRAL/WAIT) | PRICE | REASON
      4. A detailed reasoning text.
    `;

    const analysisResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: analysisPrompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are a professional financial analyst. Use real-time search grounding to analyze stock positions and news. Be objective and data-driven.",
      },
    });

    const chartPrompt = `
      Project the next 7 price points for "${symbol}" based on current trends. 
      Return a JSON array of objects with "label" and "price".
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