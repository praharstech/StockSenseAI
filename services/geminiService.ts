import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, ChartDataPoint, GroundingSource, StockData, NewsItem, StockQuote } from "../types";

/**
 * Ultra-robust JSON extraction. 
 * Locates the outermost JSON object or array in a string to ignore conversational prefix/suffix text.
 */
const extractJson = (text: string) => {
  if (!text) return null;
  
  // 1. Strip markdown code block markers
  let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
  
  // 2. Try direct parse
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // 3. Find boundaries manually (Robust fallback)
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
          const jsonString = cleaned.substring(start, end + 1);
          return JSON.parse(jsonString);
        } catch (innerError) {
          console.error("Failed to parse extracted JSON chunk:", innerError);
        }
      }
    }
    return null;
  }
};

/**
 * Validates and returns the AI client.
 */
const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Ensure API_KEY is set in Vercel Environment Variables.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Fetches the current price and provides quick buy/sell suggestions.
 * Optimized for NSE/BSE real-time data using Google Search grounding.
 */
export const getStockQuote = async (symbol: string): Promise<StockQuote> => {
  try {
    const ai = getAIClient();
    const prompt = `
      Search the web for the absolute latest real-time share price of "${symbol}" on the NSE or BSE India markets.
      Return ONLY a JSON object with the following fields (numbers only):
      {
        "currentPrice": (latest price in INR),
        "suggestedBuy": (calculated support price),
        "suggestedSell": (short term target price)
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are a specialized stock market data engine. Provide raw real-time price data in JSON. No conversational chatter.",
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
  const { symbol, buyPrice, quantity, strategy } = input;
  
  try {
    const ai = getAIClient();
    const strategyInstructions = strategy === 'intraday' 
      ? "Prioritize today's technical levels, immediate volume spikes, and hourly resistance points."
      : "Focus on sector trends, fundamental strength, and a 5-10 day trend analysis.";

    const analysisPrompt = `
      Deep dive analysis for "${symbol}" (${quantity} units @ ₹${buyPrice}). 
      Strategy Mode: ${strategy}. 
      ${strategyInstructions}
      
      You MUST provide:
      1. NEWS_ITEM: Headline | Summary | Sentiment (Positive/Negative/Neutral) [Min 3 items]
      2. CURRENT_PRICE: Estimated live value.
      3. FINAL_RECOMMENDATION: SIGNAL (STRONG_BUY/STRONG_SELL/NEUTRAL/WAIT) | PRICE | REASON
      4. Detailed reasoning in Markdown.
    `;

    const analysisResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: analysisPrompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are a professional equity researcher. Use Google Search grounding to verify all claims and news. Provide high-conviction signals.",
      },
    });

    const chartPrompt = `
      Project the next 7 specific price points for "${symbol}" based on current momentum. 
      Return only a JSON array: [{"label": "Day 1", "price": 123.4}, ...]
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

    let analysisText = analysisResponse.text || "Analysis pending...";
    
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
    throw new Error("Market Intelligence Link Interrupted. Check your API Key.");
  }
};