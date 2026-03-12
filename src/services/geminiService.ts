import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

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
  };
}

async function fetchFromGemini(): Promise<CommodityReportData> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    당신은 원자재 시장 전문 분석가이자 뉴스 요약가입니다. 
    최근 24시간 내의 'LME 알루미늄 시세'와 '조달청 알루미늄 방출 가격' 및 관련 뉴스를 분석하여 JSON 형식으로 제공하세요.

    [데이터 수집 및 분석 요청]
    1. LME 알루미늄 시세: 현재 가격($/ton), 전일 대비 변동액, 변동률, 그리고 지난 5일간의 대략적인 가격 추이(history)를 파악하세요.
    2. 조달청 알루미늄 가격: 현재 가격(원/ton), 변동 정보.
    3. 뉴스: [글로벌, 비철금속, 알루미늄, 스크랩] 카테고리별로 최신 주요 국내 및 해외 뉴스를 **각각 10개씩** 수집하여 요약하세요.
    
    [주요 참고 소스]
    Fastmarkets, Investing.com, AlCircle, Mining.com, 조달청, KOMIS, 철강금속신문 등.

    [지시사항]
    - 모든 텍스트는 **한국어**로 작성하세요.
    - 뉴스 요약은 핵심만 1-2문장으로 간결하게 작성하세요.
    - **정확한 출처와 원본 링크(URL)를 포함하세요.**
    - 검색 결과가 부족하면 가장 최신의 관련 뉴스만 포함하세요.
  `;

  const response = await ai.models.generateContent({
    model: model,
    contents: prompt,
    config: {
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
              changePercent: { type: Type.STRING }
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
    },
  });

  return JSON.parse(response.text);
}

export async function fetchStructuredCommodityReport(): Promise<CommodityReportData> {
  try {
    // 1. Check Session Storage (Instant)
    const sessionCache = sessionStorage.getItem('commodity_report');
    if (sessionCache) {
      const { data, timestamp } = JSON.parse(sessionCache);
      const isToday = new Date(timestamp).toDateString() === new Date().toDateString();
      if (isToday) {
        console.log("Using session cache");
        return data;
      }
    }

    // 2. Check server cache
    const cacheResponse = await fetch('/api/report');
    if (cacheResponse.ok) {
      const cachedData = await cacheResponse.json();
      if (cachedData) {
        console.log("Using server cache");
        sessionStorage.setItem('commodity_report', JSON.stringify({ data: cachedData, timestamp: Date.now() }));
        return cachedData;
      }
    }

    // 3. Fetch from Gemini
    console.log("Fetching fresh data from Gemini...");
    const newData = await fetchFromGemini();

    // 4. Save to caches
    sessionStorage.setItem('commodity_report', JSON.stringify({ data: newData, timestamp: Date.now() }));
    fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newData)
    }).catch(console.error);

    return newData;
  } catch (e: any) {
    console.error("Failed to fetch report", e);
    
    if (e.message?.includes("429") || e.toString().includes("quota")) {
      throw new Error("API 사용량이 초과되었습니다. 잠시 후 다시 시도하거나 내일 다시 확인해주세요.");
    }
    
    throw new Error("데이터를 불러오는 중 오류가 발생했습니다.");
  }
}
