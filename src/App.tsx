import { useState, useEffect, useMemo } from 'react';
import { fetchStructuredCommodityReport, CommodityReportData, NewsItem, formatPrice } from './services/geminiService';
import { 
  Loader2, 
  RefreshCw, 
  TrendingUp, 
  Home, 
  Newspaper, 
  BarChart2, 
  Settings, 
  Menu, 
  Compass,
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

  const loadData = async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchStructuredCommodityReport(force);
      setData(result);
    } catch (err: any) {
      console.error(err);
      let msg = err.message || '데이터를 불러오는 중 오류가 발생했습니다.';
      
      if (msg.includes("API key not valid") || msg.includes("INVALID_ARGUMENT")) {
        msg = "Gemini API 키가 유효하지 않습니다. AI Studio 설정(Settings) 메뉴에서 API 키가 올바르게 설정되어 있는지 확인해 주세요.";
      } else if (msg.includes("QUOTA_EXHAUSTED") || msg.includes("429")) {
        msg = "API 사용량이 초과되었습니다. 잠시 후 다시 시도해 주세요.";
      }
      
      setError(msg);
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
    return data.news[activeCategory] || [];
  }, [data, activeCategory]);

  return (
    <div className="flex flex-col h-screen bg-[#f4f7fa] font-sans overflow-hidden">
      {/* Header */}
      <header className="px-6 py-8 flex flex-col items-center bg-white/50 backdrop-blur-sm relative">
        <button 
          onClick={() => loadData(true)}
          disabled={loading}
          className="absolute right-6 top-8 p-2 text-slate-400 hover:text-blue-600 transition-colors disabled:opacity-50"
          title="새로고침"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>

        {/* Company CI Placeholder - Replace src with actual logo path */}
        <div className="mb-4">
          <img 
            src="https://picsum.photos/seed/a1-logo/120/60" 
            alt="Company CI" 
            className="h-12 object-contain"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="text-center space-y-1">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">오늘의 원자재 뉴스</h1>
          <p className="text-[12px] font-bold text-slate-400 tracking-wider">
            {new Date().toISOString().split('T')[0]}
          </p>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto custom-scrollbar pb-8">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-32 space-y-6"
            >
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border-4 border-t-blue-600 rounded-full"
                ></motion.div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-lg font-bold text-slate-900">시장 데이터 분석 중</p>
                <p className="text-sm text-slate-400 max-w-[200px] mx-auto leading-tight">
                  LME 시세와 최신 뉴스를 수집하고 있습니다. (약 10-20초 소요)
                </p>
              </div>
            </motion.div>
          ) : error ? (
            <div className="p-6 text-center">
              <p className="text-red-500 font-medium mb-4">{error}</p>
              <button 
                onClick={() => loadData()}
                className="px-6 py-2 bg-blue-600 text-white rounded-full font-bold"
              >
                다시 시도
              </button>
            </div>
          ) : data && (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-6 pt-2 space-y-6"
            >
              {/* Featured Price Cards Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* LME Aluminum Card */}
                <div className="bg-gradient-to-br from-[#1e293b] to-[#334155] rounded-[24px] p-5 text-white shadow-xl shadow-slate-900/10 relative overflow-hidden">
                  <div className="absolute -top-2 -right-2 opacity-10">
                    <Globe className="w-16 h-16" />
                  </div>
                  <div className="space-y-1 relative z-10">
                    <h2 className="text-[10px] font-bold tracking-widest opacity-70 uppercase">LME ALUMINUM</h2>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black tracking-tight">${formatPrice(data.lmeAluminum?.current || '0')}</span>
                      <span className="text-[10px] font-bold opacity-50">USD</span>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-400 text-[10px] font-bold">
                      <TrendingUp className="w-3 h-3" />
                      <span>{data.lmeAluminum?.changePercent || '0.00%'}</span>
                    </div>
                  </div>
                </div>

                {/* PPS Aluminum Card */}
                <div className="bg-gradient-to-br from-[#f8fafc] to-[#f1f5f9] rounded-[24px] p-5 text-slate-900 shadow-xl shadow-slate-200/50 border border-slate-200 relative overflow-hidden">
                  <div className="absolute -top-2 -right-2 opacity-5">
                    <Coins className="w-16 h-16" />
                  </div>
                  <div className="space-y-1 relative z-10">
                    <h2 className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">조달청 알루미늄</h2>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black tracking-tight text-slate-900">{formatPrice(data.ppsAluminum?.current || '0')}</span>
                      <span className="text-[10px] font-bold text-slate-400">원</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-blue-600 text-[10px] font-bold">
                        <TrendingUp className="w-3 h-3" />
                        <span>{data.ppsAluminum?.changePercent || '0.00%'}</span>
                      </div>
                      <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                        {data.ppsAluminum?.vatInfo || '부가세 별도'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Category Tabs */}
              <div className="flex bg-white rounded-xl p-1 shadow-sm border border-slate-200">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex-1 py-2.5 text-[12px] font-bold rounded-lg transition-all ${
                      activeCategory === cat.id 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* News List */}
              <div className="space-y-4">
                {activeNews.length > 0 ? (
                  activeNews.map((item, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex gap-4"
                    >
                      <div className="mt-1">
                        <MapPin className="w-5 h-5 text-red-500 fill-red-500/20" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <h4 className="font-bold text-slate-900 leading-snug">
                          {item.title}
                        </h4>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {item.summary}
                        </p>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                            {item.source}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-slate-400 font-medium">{item.timeAgo}</span>
                            {item.url && (
                              <a 
                                href={item.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-[10px] font-bold text-slate-400 hover:text-blue-600 underline underline-offset-2"
                              >
                                원본 링크
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                    <Newspaper className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 font-medium">해당 카테고리의 최신 뉴스가 없습니다.</p>
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
