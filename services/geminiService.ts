import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, ChartDataPoint, GroundingSource, StockData, NewsItem, StockQuote } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Robustly extracts JSON from a string that might contain markdown or conversational text.
 */
const extractJson = (text: string) => {
  if (!text) return null;
  
  // 1. Strip markdown code blocks if present
  let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
  
  // 2. Try direct parse
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // 3. Fallback: find the actual JSON boundaries
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    
    let start = -1;
    let endChar = '';
    
    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
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
        } catch (innerError) {
          console.warn("JSON boundary extraction failed:", innerError);
        }
      }
    }
    console.error("Failed to extract JSON from text:", text);
    return null;
  }
};

/**
 * Fetches the current price and provides quick buy/sell suggestions.
 */
export const getStockQuote = async (symbol: string): Promise<StockQuote> => {
  try {
    const prompt = `
      Find the current real-time market price for stock "${symbol}" in Indian Rupee (INR) using Google Search.
      Suggest entry and target prices based on today's volatility.
      
      Return ONLY a raw JSON object with:
      {
        "currentPrice": number,
        "suggestedBuy": number,
        "suggestedSell": number
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are a precise financial data extractor. Your output must be strictly valid JSON and nothing else.",
      },
    });

    const rawData = extractJson(response.text || "{}") || {};

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
  const { symbol, buyPrice, quantity, strategy } = input;
  
  try {
    const strategyInstructions = strategy === 'intraday' 
      ? "Focus on hourly volatility and immediate risk."
      : "Focus on fundamental trends and 7-day outlook.";

    const analysisPrompt = `
      Analyze "${symbol}" (${quantity} shares @ ₹${buyPrice}). 
      Strategy: ${strategy}. ${strategyInstructions}
      
      Output components:
      1. NEWS_ITEM: <Headline> | <Summary> | <Sentiment> (Extract at least 3)
      2. Analysis of the current position.
      3. CURRENT_PRICE: ₹<Value>
      4. FINAL_RECOMMENDATION: <SIGNAL> | <PRICE> | <REASON>
    `;

    const analysisResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: analysisPrompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are a professional stock market analyst providing data-driven insights.",
      },
    });

    const chartPrompt = `
      Generate 7 projected price points for "${symbol}" for the next ${strategy === 'intraday' ? 'session' : 'week'}.
      Start price should be around ${buyPrice}. Output JSON array of {label: string, price: number}.
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
    console.error("Gemini API Error:", error);
    throw new Error("Failed to analyze stock data.");
  }
};