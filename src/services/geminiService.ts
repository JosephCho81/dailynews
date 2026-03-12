import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
  history: { day: string; value: number }[];
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

export async function fetchStructuredCommodityReport(): Promise<CommodityReportData> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    당신은 원자재 시장 전문 분석가이자 뉴스 요약가입니다. 
    최근 24시간 내의 'LME 알루미늄 시세'와 '조달청 알루미늄 방출 가격' 및 관련 뉴스를 분석하여 JSON 형식으로 제공하세요.

    [데이터 수집 및 분석 요청]
    1. LME 알루미늄 시세: 현재 가격($/ton), 전일 대비 변동액, 변동률, 그리고 지난 5일간의 대략적인 가격 추이(history)를 파악하세요.
    2. 조달청 알루미늄 가격: 현재 가격(원/ton), 변동 정보.
    3. 뉴스: [글로벌, 비철금속, 알루미늄, 스크랩] 카테고리별로 최신 주요 국내 및 해외 뉴스를 **각각 10개씩** 수집하여 요약하세요.
    
    [주요 참고 소스]
    Fastmarkets, Investing.com, AlCircle, Mining.com, Argus Media, 조달청, KOMIS, 철강금속신문, 페로타임즈 등 전문 매체.

    [지시사항]
    - 뉴스 제목, 요약, 출처 등 모든 텍스트는 **반드시 한국어로만** 작성하세요.
    - 뉴스 요약은 전문가의 시각으로 2-3문장으로 작성하세요.
    - **각 뉴스마다 반드시 정확한 출처(언론사명)와 원본 링크(URL)를 포함하세요.**
    - 시간 정보(timeAgo)는 '2h ago', '4h ago'와 같은 형식으로 추정하여 기입하세요.
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

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    throw new Error("데이터 형식이 올바르지 않습니다.");
  }
}
