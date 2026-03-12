import { useState, useEffect } from 'react';
import { fetchStructuredCommodityReport, CommodityReportData, NewsItem } from './services/geminiService';
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
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, ResponsiveContainer, YAxis, XAxis, Tooltip } from 'recharts';

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
    } catch (err) {
      console.error(err);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
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

  const getActiveNews = (): NewsItem[] => {
    if (!data || !data.news) return [];
    return data.news[activeCategory] || [];
  };

  return (
    <div className="flex flex-col h-screen bg-[#f4f7fa] font-sans overflow-hidden">
      {/* Status Bar Placeholder */}
      <div className="h-10 flex items-center justify-between px-6 text-[12px] font-bold text-slate-900">
        <span>9:41</span>
        <div className="flex items-center gap-1">
          <div className="w-4 h-2 bg-slate-900 rounded-sm"></div>
          <span>100%</span>
        </div>
      </div>

      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between bg-white/50 backdrop-blur-sm">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">오늘의 원자재 뉴스</h1>
        <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
          <Menu className="w-6 h-6" />
        </button>
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
              className="flex flex-col items-center justify-center py-32 text-slate-400"
            >
              <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
              <p className="font-medium">분석 중...</p>
            </motion.div>
          ) : error ? (
            <div className="p-6 text-center">
              <p className="text-red-500 font-medium mb-4">{error}</p>
              <button 
                onClick={loadData}
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
              {/* Featured Price Card */}
              <div className="relative bg-gradient-to-br from-[#1a365d] to-[#2d3748] rounded-[32px] p-8 text-white shadow-2xl shadow-blue-900/20 overflow-hidden">
                <div className="absolute top-8 right-8 opacity-40">
                  <Compass className="w-12 h-12 text-[#e2e8f0]" />
                </div>
                
                <div className="space-y-1">
                  <h2 className="text-xl font-bold tracking-wider opacity-90 uppercase">LME ALUMINUM</h2>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black tracking-tight">${data.lmeAluminum?.current || '0.00'}</span>
                    <span className="text-lg font-bold opacity-70">USD</span>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-400 font-bold">
                    <TrendingUp className="w-4 h-4" />
                    <span>{data.lmeAluminum?.change || '0.00'} ({data.lmeAluminum?.changePercent || '0.00%'})</span>
                  </div>
                </div>

                {/* Chart Area */}
                <div className="h-32 mt-8 -mx-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.lmeAluminum?.history || []}>
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#4ade80" 
                        strokeWidth={3} 
                        dot={false} 
                      />
                      <XAxis 
                        dataKey="day" 
                        hide 
                      />
                      <YAxis hide domain={['auto', 'auto']} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="flex justify-between px-2 mt-2 text-[10px] font-bold uppercase tracking-widest opacity-50">
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
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
                {getActiveNews().map((item, idx) => (
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
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
