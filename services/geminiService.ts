import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, ChartDataPoint, GroundingSource, StockData, NewsItem, StockQuote } from "../types";

// Always use process.env.API_KEY directly for initialization as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Fetches the current price and provides quick buy/sell suggestions.
 */
export const getStockQuote = async (symbol: string): Promise<StockQuote> => {
  try {
    // Note: We cannot use responseMimeType: "application/json" combined with tools: [{ googleSearch: {} }]
    // So we ask for a raw string and parse it manually.
    const prompt = `
      Find the current real-time market price for stock "${symbol}" in Indian Rupee (INR) using Google Search.
      Based on the very latest price action (intraday), suggest a:
      1. "suggestedBuy": A good entry price (immediate support level).
      2. "suggestedSell": A good target price (immediate resistance level).
      
      Return ONLY a raw JSON object with the following structure. Do not include markdown formatting or code blocks.
      {
        "currentPrice": number,
        "suggestedBuy": number,
        "suggestedSell": number
      }
    `;

    // Using gemini-3-flash-preview as recommended for basic/utility text tasks
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    let jsonStr = response.text || "{}";
    // Clean up potential markdown code blocks provided by the model
    jsonStr = jsonStr.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "").trim();

    const rawData = JSON.parse(jsonStr);

    // MUST ALWAYS extract the URLs from groundingChunks and list them on the web app when Google Search is used.
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

    // Sanitize data to ensure we return numbers, even if model returns null/strings
    return {
      currentPrice: typeof rawData.currentPrice === 'number' ? rawData.currentPrice : 0,
      suggestedBuy: typeof rawData.suggestedBuy === 'number' ? rawData.suggestedBuy : 0,
      suggestedSell: typeof rawData.suggestedSell === 'number' ? rawData.suggestedSell : 0,
      sources,
    };
  } catch (error) {
    console.error("Quote Fetch Error:", error);
    // Return zeros on failure so UI doesn't crash
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
        - Focus on liquidity, high volatility, clear chart patterns, and volume.
        - Analyze technical indicators: RSI, Moving Averages for quick price movements.
        - Manage risk: Provide STRICT stop-loss and profit targets.
        - Watch for immediate news that impacts the stock today.
        - Use Indian Rupee (₹) for all currency values.
      `;
      chartContext = `
        Generate a JSON array of 7 hypothetical HOURLY price points for the next trading session.
        Labels should be like "9:15", "10:15", "11:15", etc.
      `;
    } else {
      strategyInstructions = `
        **Trading Strategy: Long-Term Investment**
        - Analyze fundamentals: P/E ratio, Debt-to-Equity, consistent earnings, and growth potential.
        - Evaluate management quality and sector trends.
        - Aim for strong business value rather than intraday swings.
        - Use Indian Rupee (₹) for all currency values.
      `;
      chartContext = `
        Generate a JSON array of 7 hypothetical DAILY closing prices starting from today.
        Labels should be like "Day 1", "Day 2", etc.
      `;
    }

    // 1. Get Real-time Analysis & News
    const analysisPrompt = `
      Analyze the stock "${symbol}" for a user who bought ${quantity} shares at ₹${buyPrice}.
      
      ${strategyInstructions}
      
      Please provide the following sections:
      
      1. **Market News**: A list of 4-5 recent news headlines affecting the stock. 
         IMPORTANT: Format each news item exactly as follows (one per line):
         NEWS_ITEM: <Headline Text> | <Brief Summary (max 15 words)> | <Sentiment (Positive/Negative/Neutral)>
         
      2. **Analysis**: A summary of market sentiment relevant to the strategy (${strategy}).
      3. **Price Check**: An estimate of the CURRENT market price in INR (₹).
         IMPORTANT: Include a line exactly like "CURRENT_PRICE: ₹123.45" (using the rupee symbol or just numbers) so I can parse it.
      
      4. **Break-Even & Outlook**: Calculate the exact price needed to break even. clearly state if they are currently in profit or loss. Provide specific actionable advice (Stop-Loss/Target).
      
      5. **Final Recommendation**: Based on all factors, give a clear signal.
         IMPORTANT: Include a line exactly like "FINAL_RECOMMENDATION: <SIGNAL> | <PRICE> | <REASON>"
         - SIGNAL: Choose one from [STRONG_BUY, STRONG_SELL, NEUTRAL, WAIT]
         - PRICE: The specific target or entry price in INR.
         - REASON: A short justification (max 10 words).

      Format the rest of the output with clear Markdown headings (e.g., ## Analysis, ## Outlook).
    `;

    // Using gemini-3-flash-preview as recommended for text generation tasks
    const analysisResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: analysisPrompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    // 2. Get JSON Chart Data (Simulated Projection)
    const chartPrompt = `
      Generate a JSON array of 7 hypothetical price points for stock "${symbol}" starting from a price around ${buyPrice}.
      ${chartContext}
      Generate a realistic simulation based on the volatility expected for ${strategy}.
      
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
              label: { type: Type.STRING, description: "Time label (e.g., '10:00' or 'Day 1')" },
              price: { type: Type.NUMBER, description: "Price" },
            },
            required: ["label", "price"],
          },
        },
      },
    });

    // Process Text Analysis
    let analysisText = analysisResponse.text || "No analysis available.";
    
    // Extract Sources (Required for search grounding)
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

    // Extract News
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

    // Extract Recommendation
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

    // Attempt to extract Current Price via Regex
    const priceMatch = analysisText.match(/CURRENT_PRICE:\s*[^\d]*([\d,]+\.?\d*)/i);
    let currentPriceEstimate = undefined;
    if (priceMatch && priceMatch[1]) {
      currentPriceEstimate = parseFloat(priceMatch[1].replace(/,/g, ''));
    }

    // Clean up the analysis text
    analysisText = analysisText
      .replace(newsRegex, '') 
      .replace(recRegex, '')
      .replace(/CURRENT_PRICE:.*(\r\n|\r|\n)?/gi, '') 
      .replace(/IMPORTANT:.*(\r\n|\r|\n)?/gi, '') 
      .replace(/FINAL_RECOMMENDATION:.*(\r\n|\r|\n)?/gi, '')
      .trim();

    // Process Chart Data
    let chartData: ChartDataPoint[] = [];
    try {
      const chartJson = chartResponse.text;
      if (chartJson) {
        const rawChartData = JSON.parse(chartJson);
        if (Array.isArray(rawChartData)) {
          chartData = rawChartData.map((item: any) => ({
            label: item.label,
            price: item.price,
            type: 'forecast',
          }));
        }
      }
    } catch (e) {
      console.warn("Failed to parse chart data", e);
    }

    // Determine basic sentiment
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