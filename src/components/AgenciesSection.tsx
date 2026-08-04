import React, { useState, useMemo } from 'react';
import { 
  Gavel, 
  Search, 
  RotateCcw, 
  ExternalLink, 
  Printer, 
  Copy, 
  Check, 
  X, 
  Calendar, 
  User, 
  UserCheck, 
  FileText, 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  StickyNote, 
  Clock, 
  Hash, 
  Sparkles,
  Info
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { AgencyPoa, AgencyFilterState } from '../types';

interface AgenciesSectionProps {
  agenciesRaw: AgencyPoa[];
  agencyFilters: AgencyFilterState;
  setAgencyFilters: React.Dispatch<React.SetStateAction<AgencyFilterState>>;
  handleResetAgencyFilters: () => void;
  parseRemainingDays: (str: string) => number;
}

export default function AgenciesSection({
  agenciesRaw,
  agencyFilters,
  setAgencyFilters,
  handleResetAgencyFilters,
  parseRemainingDays
}: AgenciesSectionProps) {
  const [selectedPoa, setSelectedPoa] = useState<AgencyPoa | null>(null);
  const [copiedId, setCopiedId] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<'poaNumber' | 'remainingDays' | 'hijriDate'>('remainingDays');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const itemsPerPage = 15;

  // KPI Calculations
  const kpis = useMemo(() => {
    let active = 0;
    let expired = 0;
    let warning = 0;

    agenciesRaw.forEach(item => {
      const days = parseRemainingDays(item.remainingDays);
      if (days > 0) {
        active++;
        if (days <= 30) {
          warning++;
        }
      } else {
        expired++;
      }
    });

    return {
      total: agenciesRaw.length,
      active,
      expired,
      warning
    };
  }, [agenciesRaw, parseRemainingDays]);

  // Filtering Logic
  const filteredAgencies = useMemo(() => {
    return agenciesRaw.filter(item => {
      // 1. POA Number Filter
      if (agencyFilters.poaNumber.trim() !== '') {
        const query = agencyFilters.poaNumber.trim().toLowerCase();
        if (!item.poaNumber.toLowerCase().includes(query)) {
          return false;
        }
      }

      // 2. Name Search Filter (Principal F or Agent H)
      if (agencyFilters.name.trim() !== '') {
        const query = agencyFilters.name.trim().toLowerCase();
        const matchPrincipal = item.principalName.toLowerCase().includes(query);
        const matchAgent = item.agentName.toLowerCase().includes(query);
        const matchPrincipalId = item.principalId.toLowerCase().includes(query);
        const matchAgentId = item.agentId.toLowerCase().includes(query);
        if (!matchPrincipal && !matchAgent && !matchPrincipalId && !matchAgentId) {
          return false;
        }
      }

      // 3. Status Filter
      const days = parseRemainingDays(item.remainingDays);
      if (agencyFilters.status === 'active') {
        if (days <= 0) return false;
      } else if (agencyFilters.status === 'expired') {
        if (days > 0) return false;
      } else if (agencyFilters.status === 'warning') {
        if (days <= 0 || days > 30) return false;
      }

      return true;
    });
  }, [agenciesRaw, agencyFilters, parseRemainingDays]);

  // Sorted Agencies
  const sortedAgencies = useMemo(() => {
    return [...filteredAgencies].sort((a, b) => {
      if (sortField === 'remainingDays') {
        const daysA = parseRemainingDays(a.remainingDays);
        const daysB = parseRemainingDays(b.remainingDays);
        return sortOrder === 'asc' ? daysA - daysB : daysB - daysA;
      } else if (sortField === 'poaNumber') {
        return sortOrder === 'asc' 
          ? a.poaNumber.localeCompare(b.poaNumber, undefined, { numeric: true }) 
          : b.poaNumber.localeCompare(a.poaNumber, undefined, { numeric: true });
      } else {
        return sortOrder === 'asc'
          ? a.hijriDate.localeCompare(b.hijriDate)
          : b.hijriDate.localeCompare(a.hijriDate);
      }
    });
  }, [filteredAgencies, sortField, sortOrder, parseRemainingDays]);

  // Paginated Agencies
  const totalPages = Math.ceil(sortedAgencies.length / itemsPerPage) || 1;
  const paginatedAgencies = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedAgencies.slice(start, start + itemsPerPage);
  }, [sortedAgencies, currentPage]);

  const handleSort = (field: 'poaNumber' | 'remainingDays' | 'hijriDate') => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleCopyPoaNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleExportCSV = () => {
    if (filteredAgencies.length === 0) return;
    const headers = ['رقم الوكالة', 'تاريخها بالهجري', 'تاريخ بالميلادي', 'تاريخ الانتهاء', 'المتبقي (أيام)', 'الموكل', 'هوية الموكل', 'الوكيل', 'هوية الوكيل', 'اسم/نوع الوكالة', 'ملاحظة', 'حالة الوكالة'];
    
    const rows = filteredAgencies.map(item => {
      const days = parseRemainingDays(item.remainingDays);
      const statusText = days > 0 ? 'سارية' : 'منتهية';
      return [
        `"${item.poaNumber}"`,
        `"${item.hijriDate}"`,
        `"${item.gregorianDate}"`,
        `"${item.expiryDate}"`,
        `"${item.remainingDays}"`,
        `"${item.principalName}"`,
        `"${item.principalId}"`,
        `"${item.agentName}"`,
        `"${item.agentId}"`,
        `"${item.agencyTitle}"`,
        `"${item.notes}"`,
        `"${statusText}"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `تقرير_الوكالات_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      
      {/* 1. KPI Statistics Cards Header */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Active POAs */}
        <div 
          onClick={() => setAgencyFilters(prev => ({ ...prev, status: prev.status === 'active' ? 'all' : 'active' }))}
          className={`neu-flat p-6 rounded-2xl border cursor-pointer transition-all duration-300 relative overflow-hidden ${
            agencyFilters.status === 'active' 
              ? 'border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.15)] bg-emerald-950/10' 
              : 'border-slate-800/80 hover:border-emerald-500/30'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400">الوكالات السارية</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-outfit">{kpis.active}</span>
            <span className="text-xs font-bold text-emerald-400">وكالة سارية 🟢</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">متبقي على انتهائها أكبر من 0 يوم</p>
        </div>

        {/* Expired POAs */}
        <div 
          onClick={() => setAgencyFilters(prev => ({ ...prev, status: prev.status === 'expired' ? 'all' : 'expired' }))}
          className={`neu-flat p-6 rounded-2xl border cursor-pointer transition-all duration-300 relative overflow-hidden ${
            agencyFilters.status === 'expired' 
              ? 'border-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.15)] bg-rose-950/10' 
              : 'border-slate-800/80 hover:border-rose-500/30'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400">الوكالات المنتهية</span>
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-outfit">{kpis.expired}</span>
            <span className="text-xs font-bold text-rose-400">وكالة منتهية 🔴</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">المتبقي 0 يوم أو أقل</p>
        </div>

        {/* Expiring Soon (<30 Days) */}
        <div 
          onClick={() => setAgencyFilters(prev => ({ ...prev, status: prev.status === 'warning' ? 'all' : 'warning' }))}
          className={`neu-flat p-6 rounded-2xl border cursor-pointer transition-all duration-300 relative overflow-hidden ${
            agencyFilters.status === 'warning' 
              ? 'border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.15)] bg-amber-950/10' 
              : 'border-slate-800/80 hover:border-amber-500/30'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400">قريبة من الانتهاء (&lt; 30 يوماً)</span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-outfit">{kpis.warning}</span>
            <span className="text-xs font-bold text-amber-400">تتطلب تجديداً ⚠️</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">المتبقي من 1 إلى 30 يوماً</p>
        </div>

        {/* Total POAs */}
        <div 
          onClick={() => setAgencyFilters(prev => ({ ...prev, status: 'all' }))}
          className={`neu-flat p-6 rounded-2xl border cursor-pointer transition-all duration-300 relative overflow-hidden ${
            agencyFilters.status === 'all' 
              ? 'border-brand-primary/60 shadow-[0_0_20px_rgba(187,152,76,0.15)] bg-brand-primary/5' 
              : 'border-slate-800/80 hover:border-brand-primary/30'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400">إجمالي كافة الوكالات</span>
            <div className="p-2.5 rounded-xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
              <Gavel className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-outfit">{kpis.total}</span>
            <span className="text-xs font-bold text-brand-primary">سجل مسجل 📋</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">إجمالي المسجل في القائمة</p>
        </div>

      </div>

      {/* 2. Interactive Search and Filters Bar */}
      <div className="neu-flat p-6 rounded-2xl border border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary">
              <Gavel className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-white text-base">فلترة وبحث سجلات الوكالات</h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-slate-300 border border-slate-700/60 hover:text-white hover:border-brand-primary/40 flex items-center gap-2 transition-all cursor-pointer shadow-sm"
              title="تصدير النتائج كملف CSV"
            >
              <Download className="w-4 h-4 text-brand-primary" />
              <span>تصدير CSV</span>
            </button>

            <button
              onClick={handleResetAgencyFilters}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-rose-400 border border-rose-500/20 hover:bg-rose-950/20 flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <RotateCcw className="w-4 h-4" />
              <span>إعادة ضبط الفلاتر</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* POA Number Search */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-brand-primary" />
              <span>فلتر رقم الوكالة (A)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={agencyFilters.poaNumber}
                onChange={(e) => setAgencyFilters(prev => ({ ...prev, poaNumber: e.target.value }))}
                placeholder="ابحث برقم الوكالة..."
                className="w-full bg-[#0A0D15] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-primary/60 transition-colors font-outfit"
              />
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Name Search (Principal F or Agent H) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-brand-primary" />
              <span>فلتر الاسم (الموكل F / الوكيل H)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={agencyFilters.name}
                onChange={(e) => setAgencyFilters(prev => ({ ...prev, name: e.target.value }))}
                placeholder="ابحث باسم الموكل أو الوكيل أو الهوية..."
                className="w-full bg-[#0A0D15] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-primary/60 transition-colors"
              />
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Status Dropdown Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-primary" />
              <span>حالة الوكالة</span>
            </label>
            <select
              value={agencyFilters.status}
              onChange={(e) => setAgencyFilters(prev => ({ ...prev, status: e.target.value as any }))}
              className="w-full bg-[#0A0D15] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-brand-primary/60 transition-colors cursor-pointer"
            >
              <option value="all">كافة الوكالات (الكل)</option>
              <option value="active">سارية فقط 🟢</option>
              <option value="expired">منتهية فقط 🔴</option>
              <option value="warning">قريبة من الانتهاء (&lt; 30 يوماً) ⚠️</option>
            </select>
          </div>

        </div>
      </div>

      {/* 3. Main Data Table */}
      <div className="space-y-4">
        
        {/* Table Controls & Count Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-200">نتائج البحث:</span>
            <span className="px-2.5 py-1 rounded-lg bg-brand-primary/10 text-brand-primary font-bold font-outfit border border-brand-primary/20">
              {filteredAgencies.length} وكالة
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-400">ترتيب الفرز:</span>
            <button
              onClick={() => handleSort('remainingDays')}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                sortField === 'remainingDays'
                  ? 'bg-brand-primary/10 border-brand-primary/40 text-brand-primary'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              المتبقي على الانتهاء {sortField === 'remainingDays' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
            </button>
            <button
              onClick={() => handleSort('poaNumber')}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                sortField === 'poaNumber'
                  ? 'bg-brand-primary/10 border-brand-primary/40 text-brand-primary'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              رقم الوكالة {sortField === 'poaNumber' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
            </button>
          </div>
        </div>

        {/* Responsive Table Wrapper */}
        <div className="overflow-x-auto neu-pressed p-2 rounded-2xl border border-slate-900">
          <table className="w-full text-right border-collapse whitespace-nowrap text-xs">
            <thead className="sticky top-0 bg-[#121926] z-10">
              <tr className="text-brand-primary border-b border-slate-800 font-extrabold">
                <th className="py-4 px-4 text-right">رقم الوكالة (A)</th>
                <th className="py-4 px-4 text-center">تاريخها بالهجري (B)</th>
                <th className="py-4 px-4 text-center">المتبقي على الانتهاء (E)</th>
                <th className="py-4 px-4 text-right">الموكل (F)</th>
                <th className="py-4 px-4 text-right">الوكيل (H)</th>
                <th className="py-4 px-4 text-center">حالة الوكالة</th>
                <th className="py-4 px-4 text-right">ملاحظة (K)</th>
                <th className="py-4 px-4 text-center">رابط الوكالة (L)</th>
                <th className="py-4 px-4 text-center">المعاينة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {paginatedAgencies.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 font-bold">
                    لا توجد سجلات وكالات تطابق الفلاتر المحددة حالياً.
                  </td>
                </tr>
              ) : (
                paginatedAgencies.map((item, idx) => {
                  const days = parseRemainingDays(item.remainingDays);
                  const isExpired = days <= 0;
                  const isWarning = days > 0 && days <= 30;

                  return (
                    <tr 
                      key={idx}
                      onClick={() => setSelectedPoa(item)}
                      className="hover:bg-slate-900/60 transition-all duration-200 cursor-pointer group"
                    >
                      {/* POA Number (A) */}
                      <td className="py-3.5 px-4 font-bold text-slate-100 font-outfit text-sm group-hover:text-brand-primary transition-colors">
                        {item.poaNumber || '-'}
                      </td>

                      {/* Hijri Date (B) */}
                      <td className="py-3.5 px-4 text-center font-mono text-slate-300" dir="ltr">
                        {item.hijriDate || '-'}
                      </td>

                      {/* Remaining Days (E) */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold font-outfit text-xs ${
                          isExpired
                            ? 'bg-rose-950/40 text-rose-400 border border-rose-500/30'
                            : isWarning
                            ? 'bg-amber-950/40 text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          <Clock className="w-3 h-3" />
                          <span>{item.remainingDays || '0'} يوم</span>
                        </span>
                      </td>

                      {/* Principal Name (F) */}
                      <td className="py-3.5 px-4 font-semibold text-slate-200 max-w-[200px] truncate" title={item.principalName}>
                        {item.principalName || '-'}
                      </td>

                      {/* Agent Name (H) */}
                      <td className="py-3.5 px-4 font-semibold text-slate-300 max-w-[200px] truncate" title={item.agentName}>
                        {item.agentName || '-'}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        {isExpired ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-950/40 text-rose-400 border border-rose-500/30 shadow-sm">
                            منتهية 🔴
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 shadow-sm">
                            سارية 🟢
                          </span>
                        )}
                      </td>

                      {/* Notes (K) */}
                      <td className="py-3.5 px-4 text-slate-400 max-w-[180px] truncate" title={item.notes}>
                        {item.notes || '-'}
                      </td>

                      {/* POA Doc Link (L) */}
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        {item.docLink ? (
                          <a
                            href={item.docLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-brand-primary/10 text-brand-primary border border-brand-primary/30 hover:bg-brand-primary hover:text-slate-950 transition-all shadow-sm"
                            title="فتح مستند الوكالة المباشر في Google Drive"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>المستند</span>
                          </a>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      {/* Preview Button */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPoa(item);
                          }}
                          className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-brand-primary hover:bg-slate-700 transition-colors cursor-pointer"
                          title="معاينة التفاصيل الكاملة"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 neu-flat p-4 rounded-2xl border border-slate-800">
            <span className="text-xs text-slate-400">
              عرض الصفحة <span className="font-bold text-brand-primary font-outfit">{currentPage}</span> من إجمالي{' '}
              <span className="font-bold text-slate-200 font-outfit">{totalPages}</span> صفحات
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:border-brand-primary/40 transition-all flex items-center gap-1 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
                <span>السابقة</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 5 && currentPage > 3) {
                    pageNum = currentPage - 2 + i;
                    if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-xl text-xs font-bold font-outfit transition-all cursor-pointer ${
                        currentPage === pageNum
                          ? 'bg-brand-primary text-slate-950 shadow-md'
                          : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:border-brand-primary/40 transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>التالية</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* 4. Detailed Pop-up Modal */}
      <AnimatePresence>
        {selectedPoa && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
            onClick={() => setSelectedPoa(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="neu-flat w-full max-w-3xl p-6 md:p-8 rounded-3xl border border-brand-primary/30 shadow-2xl relative bg-[#0F1422] my-8 overflow-hidden"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedPoa(null)}
                className="absolute top-6 left-6 p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-brand-primary hover:bg-slate-800 transition-colors border border-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header Title */}
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800/80">
                <div className="p-3 rounded-2xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                  <Gavel className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-white text-xl font-outfit">
                      وكالة رقم: {selectedPoa.poaNumber || '-'}
                    </h3>
                    <button
                      onClick={() => handleCopyPoaNumber(selectedPoa.poaNumber)}
                      className="p-1.5 rounded-lg bg-slate-900 text-brand-primary border border-brand-primary/30 hover:bg-brand-primary/20 transition-all cursor-pointer text-xs flex items-center gap-1"
                      title="نسخ رقم الوكالة"
                    >
                      {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId ? 'تم النسخ!' : 'نسخ'}</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">سجل تفاصيل الوكالة النظامية المعتمدة</p>
                </div>
              </div>

              {/* Modal Details Grid */}
              <div className="space-y-6">
                
                {/* Dates & Expiry Box */}
                <div className="p-4 rounded-2xl bg-[#0A0D15] border border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 block mb-1">التاريخ الهجري (B)</span>
                    <span className="text-xs font-mono font-bold text-slate-200 dir-ltr block">{selectedPoa.hijriDate || '-'}</span>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-400 block mb-1">التاريخ بالميلادي (C)</span>
                    <span className="text-xs font-mono font-bold text-slate-200 dir-ltr block">{selectedPoa.gregorianDate || '-'}</span>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-400 block mb-1">تاريخ الانتهاء (D)</span>
                    <span className="text-xs font-mono font-bold text-slate-200 dir-ltr block">{selectedPoa.expiryDate || '-'}</span>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-400 block mb-1">المتبقي على الانتهاء (E)</span>
                    {(() => {
                      const days = parseRemainingDays(selectedPoa.remainingDays);
                      const isExp = days <= 0;
                      const isWarn = days > 0 && days <= 30;
                      return (
                        <span className={`inline-block px-2.5 py-0.5 rounded-full font-outfit text-xs font-bold ${
                          isExp
                            ? 'text-rose-400 bg-rose-950/40 border border-rose-500/30'
                            : isWarn
                            ? 'text-amber-400 bg-amber-950/40 border border-amber-500/30'
                            : 'text-emerald-400 bg-emerald-950/40 border border-emerald-500/30'
                        }`}>
                          {selectedPoa.remainingDays || '0'} يوم {isExp ? '(منتهية)' : '(سارية)'}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* Principal & Agent Box */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Principal Info (F & G) */}
                  <div className="p-4 rounded-2xl bg-[#0A0D15] border border-slate-800/80 space-y-2">
                    <div className="flex items-center gap-2 text-brand-primary border-b border-slate-800/80 pb-2">
                      <User className="w-4 h-4" />
                      <h4 className="font-extrabold text-xs">بيانات الموكل (F & G)</h4>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">اسم الموكل:</span>
                      <span className="text-xs font-bold text-slate-100">{selectedPoa.principalName || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">هوية / رقم الموكل:</span>
                      <span className="text-xs font-mono font-bold text-slate-300">{selectedPoa.principalId || '-'}</span>
                    </div>
                  </div>

                  {/* Agent Info (H & I) */}
                  <div className="p-4 rounded-2xl bg-[#0A0D15] border border-slate-800/80 space-y-2">
                    <div className="flex items-center gap-2 text-brand-primary border-b border-slate-800/80 pb-2">
                      <UserCheck className="w-4 h-4" />
                      <h4 className="font-extrabold text-xs">بيانات الوكيل (H & I)</h4>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">اسم الوكيل:</span>
                      <span className="text-xs font-bold text-slate-100">{selectedPoa.agentName || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">هوية / رقم الوكيل:</span>
                      <span className="text-xs font-mono font-bold text-slate-300">{selectedPoa.agentId || '-'}</span>
                    </div>
                  </div>

                </div>

                {/* Title & Notes Box (J & K) */}
                <div className="p-4 rounded-2xl bg-[#0A0D15] border border-slate-800/80 space-y-3">
                  <div>
                    <span className="text-[11px] font-bold text-brand-primary block mb-1">اسم / نوع الوكالة (J):</span>
                    <p className="text-xs text-slate-200 font-semibold leading-relaxed">
                      {selectedPoa.agencyTitle || '-'}
                    </p>
                  </div>

                  <div className="border-t border-slate-800/80 pt-2">
                    <span className="text-[11px] font-bold text-slate-400 block mb-1">ملاحظات إضافية (K):</span>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {selectedPoa.notes || 'لا توجد ملاحظات مسجلة.'}
                    </p>
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-800">
                  {selectedPoa.docLink ? (
                    <a
                      href={selectedPoa.docLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-3 px-4 rounded-xl bg-brand-primary text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 hover:bg-amber-400 transition-all shadow-md"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>فتح مستند الوكالة المباشر (Google Drive)</span>
                    </a>
                  ) : (
                    <div className="flex-1 py-3 px-4 rounded-xl bg-slate-900 text-slate-500 font-bold text-xs text-center border border-slate-800">
                      مستند الوكالة غير مرفق
                    </div>
                  )}

                  <button
                    onClick={() => window.print()}
                    className="py-3 px-5 rounded-xl bg-slate-900 text-slate-200 font-bold text-xs border border-slate-800 hover:border-brand-primary/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-brand-primary" />
                    <span>طباعة سجل الوكالة</span>
                  </button>
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
