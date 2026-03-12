import { useState, useEffect, useMemo } from 'react';
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
let msg = err.message || '데이터를 불러오는 중 오류가 발생했습니다.';
if (msg.includes("API key not valid") || msg.includes("INVALID_ARGUMENT")) {
msg = "Gemini API 키가 유효하지 않습니다. AI Studio 설정에서 API 키를 확인해 주세요.";
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

const formatNumber = (val: string | number | undefined) => {
if (!val) return '0';
const num = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : val;
return isNaN(num) ? '0' : num.toLocaleString('ko-KR');
};

return (
<div className="flex flex-col h-screen bg-[#f4f7fa] font-sans overflow-hidden">
<header className="px-6 py-6 flex items-center justify-between bg-white/50 backdrop-blur-sm border-b border-slate-100">
<h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">오늘의 원자재 뉴스</h1>
</header>

);
}
