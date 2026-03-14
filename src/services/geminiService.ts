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
  
  const prompt = `
    당신은 원자재 시장 전문 분석가이자 뉴스 요약가입니다. 
    **오늘(${new Date().toLocaleDateString('ko-KR')}) 당일**의 'LME 알루미늄 시세'와 '조달청 알루미늄 방출 가격' 및 관련 뉴스를 분석하여 JSON 형식으로 제공하세요.

    [데이터 수집 및 분석 요청]
    1. LME 알루미늄 시세: 현재 가격($/ton), 전일 대비 변동액, 변동률을 파악하세요.
    2. 조달청 알루미늄 가격: 현재 가격(원/ton), 변동 정보, 그리고 **부가세 포함/별도 여부**를 반드시 파악하여 명시하세요.
    3. 뉴스 수집 및 검증 (JSON 키 매핑 필수):
       - **당일(Today) 뉴스 우선**: 반드시 오늘 날짜의 뉴스를 우선적으로 수집하세요.
       - **산업군 타겟**: 국내외 주요 **제강사(Steelmakers), 제철소(Steel Mills)**, 알루미늄 제련소 관련 최신 동향을 반드시 포함하세요.
       - **카테고리 구성**:
         - '글로벌' 관련 뉴스 -> "global" 키에 할당
         - '비철금속' 관련 뉴스 -> "nonFerrous" 키에 할당
         - '알루미늄' 관련 뉴스 -> "aluminum" 키에 할당
         - '스크랩' 관련 뉴스 -> "scrap" 키에 할당
       - **수량**: 각 카테고리별로 신뢰할 수 있는 뉴스를 **10개씩** 리스팅하세요.
       - **검증**: 가짜 뉴스나 중복 뉴스를 배제하고, 공신력 있는 매체의 정보인지 기본 검증을 거친 후 요약하세요.
    
    [주요 참고 소스]
    Fastmarkets, Investing.com, AlCircle, Mining.com, 조달청, KOMIS, 철강금속신문, 연합인포맥스, 한국경제 등.

    [지시사항]
    - 모든 텍스트는 **한국어**로 작성하세요.
    - 뉴스 요약은 핵심만 1-2문장으로 간결하게 작성하세요.
    - **정확한 출처와 원본 링크(URL)를 반드시 포함하세요.**
    - 당일 뉴스가 부족할 경우에만 가장 가까운 시점의 뉴스를 포함하되, '오늘'의 관점에서 가공하세요.
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

export async function fetchStructuredCommodityReport(): Promise<CommodityReportData> {
  try {
    // Use local date (YYYY-MM-DD) for the cache key
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayKey = `${year}-${month}-${day}`;
    
    const docRef = doc(db, "reports", todayKey);

    // 1. Check Firestore first (Shared Cache)
    console.log("Checking Firestore for today's report...");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      console.log("Using Firestore cached report");
      return docSnap.data() as CommodityReportData;
    }

    // 2. Check Session Storage (Local Cache fallback)
    const sessionCache = sessionStorage.getItem('commodity_report');
    if (sessionCache) {
      const { data, timestamp } = JSON.parse(sessionCache);
      const isToday = new Date(timestamp).toDateString() === new Date().toDateString();
      if (isToday) {
        console.log("Using session cache");
        return data;
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
