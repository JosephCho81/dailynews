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
    raw_materials: NewsItem[];
    base_metals: NewsItem[];
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
  const model = "gemini-3.1-pro-preview";
  const ai = getAi();
  
  const prompt = `
    [SYSTEM ROLE]
    당신은 글로벌 원자재 및 금속 산업 전문 뉴스 큐레이터이자 데이터 검증을 수행하는 조사 분석가입니다.

    [목표]
    전 세계 주요 언론사, 경제지, 산업 전문지, 정부 기관 발표에서 "오늘 기준 주요 원자재 뉴스"를 수집하고 검증 후 요약합니다.

    [검색 출처 (필수 포함)]
    - 글로벌 통신사: Reuters, Bloomberg, CNBC, Financial Times, Wall Street Journal
    - 산업 전문지: SNMNews(철강금속신문), FerroTimes, Light Metal Age, AgMetalMiner, Fastmarkets, S&P Global Commodity Insights, Metal Bulletin, Mining.com
    - 정부 및 공공기관: USGS, IEA, World Steel Association, 각국 산업부/에너지부

    [뉴스 시간 조건]
    - 반드시 **"오늘(2026년 3월 14일) 또는 지난 24시간 내 기사"**만 사용하세요.

    [데이터 요청 - 실시간 정확도]
    1. LME 알루미늄: lme.com 공식 홈페이지의 'Official Prices'를 확인하여 3월 13일(금) 종가(Cash $3,519.50)를 정확히 반영하세요.
    2. 조달청 알루미늄: 
       - 검색 키워드: "조달청 원자재 판매가격 알루미늄 서구산"
       - 데이터: 가장 최신 날짜의 공고에서 '알루미늄 (서구산)'의 '부가세 포함' 가격을 반영하세요. (단위: 원/ton)
       - vatInfo: "부가세 포함" 명시.

    [뉴스 카테고리 및 수집 규칙]
    1. raw_materials: 철광석, 석탄, 코크스, 리튬, 니켈 원광, 희토류, 배터리 원자재 등
    2. base_metals: 구리, 니켈, 아연, 납, 주석 등 비철금속
    3. aluminum: 알루미늄 가격, 생산, 프리미엄, smelter, bauxite, alumina
    4. scrap: 철스크랩, 알루미늄 스크랩, 비철 스크랩, 글로벌 스크랩 시장

    - 각 카테고리별 최소 5개 기사 확보 (최대 10개)
    - 어떤 카테고리도 빈 배열로 두지 말 것
    - 동일 기사 중복 금지

    [링크 무결성 및 품질 검증]
    - URL이 실제 기사 페이지인지 확인 (광고/리다이렉트/로그인 필요 페이지 제외)
    - 기사 제목과 본문 내용이 일치하는지 확인
    - 접근 불가 링크(404) 제외
    - **반드시 "검증된 원본 URL"만 사용하세요.**

    [지시사항]
    - 모든 텍스트는 한국어로 작성.
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
            vatInfo: { type: Type.STRING }
          }
        },
        news: {
          type: Type.OBJECT,
          properties: {
            raw_materials: {
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
            base_metals: {
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
