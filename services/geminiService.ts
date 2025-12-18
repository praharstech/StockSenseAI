
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, ChartDataPoint, GroundingSource, StockData, NewsItem, StockQuote } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Helper to extract JSON from a string that might contain other text or markdown blocks.
 * Handles both object {} and array [] formats.
 */
const extractJson = (text: string) => {
  try {
    // Look for the first occurrence of either [ or {
    const objectStart = text.indexOf('{');
    const arrayStart = text.indexOf('[');
    
    let start = -1;
    let end = -1;
    let endChar = '';

    if (objectStart !== -1 && (arrayStart === -1 || (objectStart < arrayStart && objectStart !== -1))) {
      start = objectStart;
      endChar = '}';
    } else if (arrayStart !== -1) {
      start = arrayStart;
      endChar = ']';
    }

    if (start !== -1) {
      end = text.lastIndexOf(endChar);
      if (end > start) {
        const jsonStr = text.substring(start, end + 1);
        return JSON.parse(jsonStr);
      }
    }
    
    return JSON.parse(text);
  } catch (e) {
    console.warn("JSON Extraction Parsing Error:", e, "Raw Text:", text);
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
      Based on the very latest price action (intraday), suggest a:
      1. "currentPrice": The current market price.
      2. "suggestedBuy": A good entry price (immediate support level).
      3. "suggestedSell": A good target price (immediate resistance level).
      
      Return ONLY a raw JSON object with the following structure:
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
    let strategyInstructions = "";
    let chartContext = "";

    if (strategy === 'intraday') {
      strategyInstructions = `
        **Trading Strategy: Intraday Trading**
        - Focus on liquidity, high volatility, and volume.
        - Manage risk: Provide STRICT stop-loss and profit targets.
        - Use Indian Rupee (₹) for all currency values.
      `;
      chartContext = `
        Generate a JSON array of 7 hypothetical HOURLY price points for the next trading session.
      `;
    } else {
      strategyInstructions = `
        **Trading Strategy: Long-Term Investment**
        - Analyze fundamentals: Earnings growth, sector trends.
        - Use Indian Rupee (₹) for all currency values.
      `;
      chartContext = `
        Generate a JSON array of 7 hypothetical DAILY closing prices starting from today.
      `;
    }

    const analysisPrompt = `
      Analyze the stock "${symbol}" for a user who bought ${quantity} shares at ₹${buyPrice}.
      
      ${strategyInstructions}
      
      Please provide the following:
      1. **Market News**: Headlines affecting the stock. 
         Format: NEWS_ITEM: <Headline> | <Summary> | <Sentiment>
      2. **Analysis**: Summary of market sentiment.
      3. **Price Check**: line exactly like "CURRENT_PRICE: ₹123.45"
      4. **Break-Even & Outlook**: State if profit or loss. Actionable advice.
      5. **Final Recommendation**: Clear signal line like "FINAL_RECOMMENDATION: <SIGNAL> | <PRICE> | <REASON>"
    `;

    const analysisResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: analysisPrompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const chartPrompt = `
      Generate a JSON array of 7 hypothetical price points for stock "${symbol}" starting from around ${buyPrice}.
      ${chartContext}
      Return ONLY JSON.
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
    try {
      const rawChartData = extractJson(chartResponse.text || "[]");
      if (Array.isArray(rawChartData)) {
        chartData = rawChartData.map((item: any) => ({
          label: item.label,
          price: item.price,
          type: 'forecast',
        }));
      }
    } catch (e) {
      console.warn("Failed to parse chart data", e);
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
