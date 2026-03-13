import { useState, useEffect, useMemo } from 'react';
import { fetchStructuredCommodityReport, CommodityReportData } from './services/geminiService';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { TrendingUp, Newspaper, MapPin, Globe, Coins } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// 1. Firebase 설정값 (본인의 설정값으로 교체하세요)
const firebaseConfig = {
  apiKey: "AIzaSyBvok1zx0yaC2K9JJYVxxheydEBVx5y1gU",
  authDomain: "dailynews-8fc04.firebaseapp.com",
  projectId: "dailynews-8fc04",
  storageBucket: "dailynews-8fc04.firebasestorage.app",
  messagingSenderId: "751891317320",
  appId: "1:751891317320:web:a47c95c403072cc5cd8e7d",
  measurementId: "G-WLYWNE561T"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

type Category = 'global' | 'nonFerrous' | 'aluminum' | 'scrap';

export default function App() {
  const [data, setData] = useState<CommodityReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category>('aluminum');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    // 오늘 날짜 구하기 (ID로 사용)
    const today = new Date().toISOString().split('T')[0];
    const docRef = doc(db, "commodityReports", today);

    try {
      // 2. 먼저 Firebase에서 오늘 데이터가 있는지 확인
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        console.log("Firebase에서 데이터 로드 완료");
        setData(docSnap.data() as CommodityReportData);
      } else {
        // 3. 데이터가 없으면 Gemini API 호출
        console.log("데이터가 없어 Gemini 호출 중...");
        const result = await fetchStructuredCommodityReport();
        
        // 4. 가져온 데이터를 Firebase에 저장 (다음 사람을 위해)
        await setDoc(docRef, result);
        setData(result);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || '데이터 로드 중 오류 발생');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatWithComma = (val: any) => {
    if (!val) return '0';
    const num = typeof val === 'string' ? parseFloat(val.replace(/[^0-9.-]/g, '')) : val;
    return isNaN(num) ? val : num.toLocaleString('ko-KR');
  };

  const activeNews = useMemo(() => {
    if (!data || !data.news) return [];
    return data.news[activeCategory] || [];
  }, [data, activeCategory]);

  const categories: { id: Category; label: string }[] = [
    { id: 'global', label: '글로벌' },
    { id: 'nonFerrous', label: '비철금속' },
    { id: 'aluminum', label: '알루미늄' },
    { id: 'scrap', label: '스크랩' },
  ];

  return (
    <div className="flex flex-col h-screen bg-[#f4f7fa] font-sans overflow-hidden">
      <header className="px-6 py-4 flex items-center justify-between bg-white/50 backdrop-blur-sm">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">오늘의 원자재 뉴스</h1>
      </header>

      <main className="flex-1 overflow-y-auto custom-scrollbar pb-8">
        <AnimatePresence mode="wait">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-lg font-bold text-slate-900">데이터를 불러오는 중...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center py-20">
              <p className="text-red-500 font-bold mb-4 whitespace-pre-wrap">{error}</p>
              <button onClick={loadData} className="px-6 py-2 bg-blue-600 text-white rounded-full font-bold">다시 시도</button>
            </div>
          ) : data && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="px-6 pt-2 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-[#1a365d] to-[#2d3748] rounded-[24px] p-5 text-white shadow-xl relative overflow-hidden">
                  <div className="absolute -top-2 -right-2 opacity-10"><Globe className="w-16 h-16" /></div>
                  <div className="space-y-1 relative z-10">
                    <h2 className="text-[10px] font-bold tracking-widest opacity-70 uppercase">LME ALUMINUM</h2>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black">${formatWithComma(data.lmeAluminum?.current)}</span>
                      <span className="text-[10px] font-bold opacity-50">USD</span>
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
                    <h2 className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">조달청 알루미늄</h2>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-slate-900">{formatWithComma(data.ppsAluminum?.current)}</span>
                      <span className="text-[10px] font-bold text-slate-400">원</span>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-600 text-[10px] font-bold">
                      <TrendingUp className="w-3 h-3" />
                      <span>{data.ppsAluminum?.changePercent || '0.00%'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex bg-white rounded-xl p-1 shadow-sm border border-slate-200">
                {categories.map((cat) => (
                  <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`flex-1 py-2.5 text-[12px] font-bold rounded-lg transition-all ${activeCategory === cat.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}>{cat.label}</button>
                ))}
              </div>

              <div className="space-y-4">
                {activeNews.length > 0 ? (
                  activeNews.map((item, idx) => (
                    <div key={idx} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex gap-4">
                      <div className="mt-1"><MapPin className="w-5 h-5 text-red-500 fill-red-500/20" /></div>
                      <div className="flex-1 space-y-2">
                        <h4 className="font-bold text-slate-900 leading-snug">{item.title}</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">{item.summary}</p>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{item.source}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{item.timeAgo}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                    <p className="text-slate-400 font-medium">뉴스가 없습니다.</p>
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
