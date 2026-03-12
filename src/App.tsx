import { useState, useEffect, useMemo } from 'react';
import { fetchStructuredCommodityReport, CommodityReportData, NewsItem } from './services/geminiService';
import { 
  TrendingUp, 
  Newspaper, 
  MapPin,
  Globe,
  Coins
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Category = 'global' | 'nonFerrous' | 'aluminum' | 'scrap';

export default function App() {
  const [data, setData] = useState<CommodityReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category>('aluminum');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchStructuredCommodityReport();
      setData(result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const categories: { id: Category; label: string }[] = [
    { id: 'global', label: '글로벌' },
    { id: 'nonFerrous', label: '비철금속' },
    { id: 'aluminum', label: '알루미늄' },
    { id: 'scrap', label: '스크랩' },
  ];

  const activeNews = useMemo(() => {
    if (!data || !data.news) return [];
    return (data.news[activeCategory] as NewsItem[]) || [];
  }, [data, activeCategory]);

  // 천 단위 쉼표 포맷 함수
  const formatNumber = (val: string | number | undefined) => {
    if (!val) return '0';
    const num = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : val;
    return isNaN(num) ? '0' : num.toLocaleString('ko-KR');
  };

  return (
    <div className="flex flex-col h-screen bg-[#f4f7fa] font-sans overflow-hidden">
      {/* 1. 상단 상태 바(9:41 등) 영역 제거 */}
      <header className="px-6 py-6 flex items-center justify-between bg-white/50 backdrop-blur-sm border-b border-slate-100">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">오늘의 원자재 뉴스</h1>
        {/* 2. 상단 메뉴 버튼 제거 */}
      </header>

      <main className="flex-1 overflow-y-auto custom-scrollbar pb-8">
        <AnimatePresence mode="wait">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32">
              <p className="text-lg font-bold text-slate-900">시장 데이터 분석 중...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <button onClick={loadData} className="px-6 py-2 bg-blue-600 text-white rounded-full font-bold">다시 시도</button>
            </div>
          ) : data && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="px-6 pt-4 space-y-6">
              {/* 가격 카드 영역 - 쉼표 적용 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-[#1a365d] to-[#2d3748] rounded-[24px] p-5 text-white shadow-xl relative overflow-hidden">
                  <div className="absolute -top-2 -right-2 opacity-10"><Globe className="w-16 h-16" /></div>
                  <div className="space-y-1 relative z-10">
                    <h2 className="text-[10px] font-bold opacity-70 uppercase">LME ALUMINUM</h2>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black">${formatNumber(data.lmeAluminum?.current)}</span>
                      <span className="text-[10px] opacity-50">USD</span>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-400 text-[10px] font-bold">
                      <TrendingUp className="w-3 h-3" />
                      <span>{data.lmeAluminum?.changePercent || '0.00%'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-[24px] p-5 text-slate-900 shadow-xl border border-slate-100 relative overflow-hidden">
                  <div className="absolute -top-2 -right-2 opacity-5"><Coins className="w-16 h-16" /></div>
                  <div className="space-y-1 relative z-10">
                    <h2 className="text-[10px] font-bold text-slate-400 uppercase">조달청 알루미늄</h2>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black">{formatNumber(data.ppsAluminum?.current)}</span>
                      <span className="text-[10px] text-slate-400">원</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-emerald-600 text-[10px] font-bold">
                        <TrendingUp className="w-3 h-3" />
                        <span>{data.ppsAluminum?.changePercent || '0.00%'}</span>
                      </div>
                      <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">부가세 별도</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 카테고리 탭 */}
              <div className="flex bg-white rounded-xl p-1 shadow-sm border border-slate-200">
                {categories.map((cat) => (
                  <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`flex-1 py-2.5 text-[12px] font-bold rounded-lg transition-all ${activeCategory === cat.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}>{cat.label}</button>
                ))}
              </div>

              {/* 3. 뉴스 기사 리스트 (완벽 복구) */}
              <div className="space-y-4">
                {activeNews.length > 0 ? (
                  activeNews.map((item, idx) => (
                    <div key={idx} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex gap-4">
                      <div className="mt-1"><MapPin className="w-5 h-5 text-red-500" /></div>
                      <div className="flex-1 space-y-2">
                        <h4 className="font-bold text-slate-900 leading-snug">{item.title}</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">{item.summary}</p>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{item.source}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-slate-400 font-medium">{item.timeAgo}</span>
                            {item.url && (
                              <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-slate-400 hover:text-blue-600 underline">원본 링크</a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                    <Newspaper className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 font-medium">최신 뉴스 데이터를 가져오는 중이거나 데이터가 없습니다.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
