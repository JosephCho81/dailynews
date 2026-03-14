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
  // 정확도를 위해 더 강력한 모델인 gemini-3.1-pro-preview로 업그레이드합니다.
  const model = "gemini-3.1-pro-preview";
  const ai = getAi();
  
  const prompt = `
    당신은 전 세계 원자재 시장을 실시간 모니터링하는 수석 분석가입니다. 
    **현재 시점(2026년 3월 14일)** 기준, 지난 24시간 이내의 가장 긴급하고 정확한 뉴스만 수집하여 JSON으로 제공하세요.

    [데이터 요청 - 실시간 정확도]
    1. LME 알루미늄: lme.com 공식 홈페이지의 'Official Prices'를 확인하여 3월 13일(금) 종가(Cash $3,519.50)를 정확히 반영하세요.
    2. 조달청 알루미늄: 조달청 공식 발표 기준 최신가.

    [뉴스 수집 - 24시간 이내 실시간 뉴스]
    - **수집 기간**: 반드시 **최근 24시간 이내 (2026년 3월 13일 ~ 14일)** 뉴스만 포함하세요.
    - **핵심 키워드**: 호르무즈 해협 긴장(Strait of Hormuz), 미국-이란 갈등, 러시아 전쟁, 에너지 위기, 알루미늄 공급망 붕괴.
    - **수량 보장**: **각 카테고리(global, nonFerrous, aluminum, scrap)별로 반드시 5개 이상의 기사를 포함하세요.**
    - **중요: 링크 무결성 (404 에러 절대 금지)**: 
      * **검색 도구(googleSearch)의 결과에서 제공하는 'link' 필드의 URL을 단 한 글자도 수정하지 말고 그대로 복사해서 사용하세요.**
      * 절대로 URL 구조를 추측하거나 생성하지 마세요. (예: bloomberg.com/news/... 처럼 그럴듯하게 만들지 마세요)
      * 검색 결과에 실제 기사 원본 링크가 없는 경우 해당 기사는 제외하세요.
      * 클릭 시 바로 기사 본문이 나오는 유효한 링크만 연결하세요.
    
    [지시사항]
    - 모든 텍스트는 한국어로 작성.
    - 뉴스 요약은 현재의 지정학적 위기와 원자재 가격의 상관관계를 중심으로 1-2문장 작성.
    - JSON 구조를 엄격히 준수하며, 어떤 카테고리도 빈 배열로 두지 마세요.
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
