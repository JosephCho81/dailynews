import { GoogleGenAI, Type } from "@google/genai";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export interface NewsItem {
  title: string;
  summary: string;
  timeAgo: string;
  source: string;
  url: string;
}

export interface PriceData {
  current: string;
  change: string;
  changePercent: string;
  vatInfo?: string;
  history?: { day: string; value: number }[];
}

export interface CommodityReportData {
  date: string;
  lmeAluminum: PriceData;
  ppsAluminum: PriceData;
  news: {
    global: NewsItem[];
    nonFerrous: NewsItem[];
    aluminum: NewsItem[];
    scrap: NewsItem[];
    [key: string]: NewsItem[];
  };
}

const getAi = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key is missing. Please check your AI Studio settings.");
  }
  return new GoogleGenAI({ apiKey });
};

async function fetchFromGemini(retryCount = 0): Promise<CommodityReportData> {
  const model = "gemini-flash-latest";
  const ai = getAi();
  
  const targetUrls = [
    "https://www.fastmarkets.com/products/news-market-analysis/metals-and-mining/",
    "https://www.investing.com/commodities/aluminum",
    "https://www.alcircle.com/news/primary-aluminium",
    "https://www.mining.com/category/critical-minerals/",
    "https://tradingeconomics.com/stream",
    "https://www.komis.or.kr/Komis/Board/DAYNEWS",
    "http://www.snmnews.com/",
    "https://www.ferrotimes.com/"
  ];

  const prompt = `
    당신은 원자재 시장 전문 분석가입니다. 
    **2026년 3월 14일** 기준, 최신 'LME 알루미늄 시세', '조달청 알루미늄 가격' 및 관련 산업 뉴스를 분석하여 JSON으로 제공하세요.

    [데이터 요청]
    1. LME 알루미늄: 현재가($/ton), 변동액, 변동률
    2. 조달청 알루미늄: 현재가(원/ton), 변동 정보, 부가세 여부
    3. 뉴스 (카테고리별 10개 목표):
       - **참고 소스**: ${targetUrls.join(", ")} 및 기타 철강/비철 전문지
       - **필수 포함**: 제강사(Steelmakers), 제철소(Steel Mills), 알루미늄 제련소 동향
       - **날짜 기준**: 오늘 뉴스를 우선하되, 부족하면 최근 3~5일 내의 뉴스를 포함하여 **절대로 빈 배열이 되지 않도록** 하세요.
       - **카테고리**: global, nonFerrous, aluminum, scrap
    
    [지시사항]
    - 한국어로 작성, 뉴스 요약은 1-2문장, 출처와 URL 필수.
    - JSON 구조를 엄격히 준수하세요.
  `;

  const config: any = {
    tools: [{ googleSearch: {} }],
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        date: { type: Type.STRING },
        lmeAluminum: {
          type: Type.OBJECT,
          properties: {
            current: { type: Type.STRING },
            change: { type: Type.STRING },
            changePercent: { type: Type.STRING },
            history: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.STRING },
                  value: { type: Type.NUMBER }
                }
              }
            }
          }
        },
        ppsAluminum: {
          type: Type.OBJECT,
          properties: {
            current: { type: Type.STRING },
            change: { type: Type.STRING },
            changePercent: { type: Type.STRING },
            vatInfo: { type: Type.STRING, description: "부가세 포함/별도 여부 (예: 부가세 별도, 부가세 포함)" }
          }
        },
        news: {
          type: Type.OBJECT,
          properties: {
            global: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  timeAgo: { type: Type.STRING },
                  source: { type: Type.STRING },
                  url: { type: Type.STRING }
                }
              }
            },
            nonFerrous: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  timeAgo: { type: Type.STRING },
                  source: { type: Type.STRING },
                  url: { type: Type.STRING }
                }
              }
            },
            aluminum: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  timeAgo: { type: Type.STRING },
                  source: { type: Type.STRING },
                  url: { type: Type.STRING }
                }
              }
            },
            scrap: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  timeAgo: { type: Type.STRING },
                  source: { type: Type.STRING },
                  url: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    }
  };

  try {
    let response;
    try {
      response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: config,
      });
    } catch (searchError: any) {
      console.warn("Search grounding failed, retrying without tools...", searchError.message);
      response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: { ...config, tools: [] },
      });
    }

    return JSON.parse(response.text);
  } catch (error: any) {
    const errorMsg = error?.message || "";
    if (error?.status === 429 || errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
      if (retryCount < 2) {
        const delay = Math.pow(2, retryCount) * 5000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchFromGemini(retryCount + 1);
      }
      throw new Error("QUOTA_EXHAUSTED");
    }
    throw error;
  }
}

export async function fetchStructuredCommodityReport(forceRefresh = false): Promise<CommodityReportData> {
  try {
    // Use local date (YYYY-MM-DD) for the cache key
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayKey = `${year}-${month}-${day}`;
    
    const docRef = doc(db, "reports", todayKey);

    // 1. Check Firestore first (Shared Cache) - Skip if forceRefresh
    if (!forceRefresh) {
      console.log("Checking Firestore for today's report...");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        console.log("Using Firestore cached report");
        return docSnap.data() as CommodityReportData;
      }
    }

    // 2. Check Session Storage (Local Cache fallback) - Skip if forceRefresh
    if (!forceRefresh) {
      const sessionCache = sessionStorage.getItem('commodity_report');
      if (sessionCache) {
        const { data, timestamp } = JSON.parse(sessionCache);
        const isToday = new Date(timestamp).toDateString() === new Date().toDateString();
        if (isToday) {
          console.log("Using session cache");
          return data;
        }
      }
    }

    // 3. Fetch from Gemini
    console.log("Fetching new report from Gemini...");
    const data = await fetchFromGemini();
    
    // 4. Save to Firestore (for other users)
    try {
      await setDoc(docRef, data);
      console.log("Report saved to Firestore");
    } catch (fsError) {
      console.error("Failed to save to Firestore", fsError);
    }

    // 5. Save to session cache
    sessionStorage.setItem('commodity_report', JSON.stringify({ data, timestamp: Date.now() }));

    return data;
  } catch (e: any) {
    console.error("Failed to fetch report", e);
    throw e;
  }
}

export const formatPrice = (price: string | number) => {
  if (!price) return "0";
  const num = typeof price === 'string' ? parseFloat(price.replace(/[^0-9.-]/g, '')) : price;
  if (isNaN(num)) return price.toString();
  return num.toLocaleString('ko-KR');
};
