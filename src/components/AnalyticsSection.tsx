import React, { useState, useMemo, useEffect } from 'react';
import Papa from 'papaparse';
import { fetchCsvText, parseCsvSheet } from '../utils/fetchCsv';
import {
  BarChart3,
  Users,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Scale,
  Clock,
  Filter,
  Search,
  RotateCcw,
  Building2,
  UserX,
  ShieldAlert,
  FileText,
  Layers,
  PieChart,
  HelpCircle,
  ExternalLink,
  X,
  FolderOpen,
  FileCheck
} from 'lucide-react';
import { DetailedCase, HearingRecord } from '../types';

const CASES_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT8qWdU0eFMs5IMYbDwamiGZCpDejrHdczl1d9D8Ivdo91ulEzeXC6uyrJmPw3-z9j4CtUnE5tUPdMn/pub?gid=1227781018&single=true&output=csv';
const HEARINGS_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT8qWdU0eFMs5IMYbDwamiGZCpDejrHdczl1d9D8Ivdo91ulEzeXC6uyrJmPw3-z9j4CtUnE5tUPdMn/pub?gid=488217084&single=true&output=csv';

function parseDateString(dStr: string): Date | null {
  if (!dStr) return null;
  const clean = dStr.trim();
  if (!clean || clean === '-' || clean === 'لا يوجد') return null;

  const isoMatch = clean.match(/^(\d{4})[-/. ](\d{1,2})[-/. ](\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return new Date(y, m - 1, d);
    }
  }

  const dmyMatch = clean.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4})/);
  if (dmyMatch) {
    const p1 = parseInt(dmyMatch[1], 10);
    const p2 = parseInt(dmyMatch[2], 10);
    const y = parseInt(dmyMatch[3], 10);
    if (p1 > 12) {
      return new Date(y, p2 - 1, p1);
    } else if (p2 > 12) {
      return new Date(y, p1 - 1, p2);
    } else {
      return new Date(y, p2 - 1, p1);
    }
  }

  const t = Date.parse(clean);
  if (!isNaN(t)) {
    return new Date(t);
  }

  return null;
}

function calculateDaysDiff(targetDate: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function isValidLink(url: string | undefined): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('www.')
  );
}

interface AnalyticsSectionProps {
  casesRaw?: DetailedCase[];
}

export const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({ casesRaw }) => {
  const [cases, setCases] = useState<DetailedCase[]>(casesRaw || []);
  const [hearings, setHearings] = useState<HearingRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(!casesRaw || casesRaw.length === 0);
  const [error, setError] = useState<string | null>(null);

  // Modal State for Viewing Full Case Details
  const [selectedCaseModal, setSelectedCaseModal] = useState<DetailedCase | null>(null);

  // Filters State for Cases Table
  const [selectedManagerFilter, setSelectedManagerFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'finished'>('all');
  const [courtFilter, setCourtFilter] = useState<string>('all');
  const [circuitFilter, setCircuitFilter] = useState<string>('all');
  const [requestTypeFilter, setRequestTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Toggles for Indicators
  const [showUnassignedCases, setShowUnassignedCases] = useState<boolean>(false);
  const [showUnclearFinishedCases, setShowUnclearFinishedCases] = useState<boolean>(false);

  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('');

  // Sync initial casesRaw if available and state is empty
  useEffect(() => {
    if (casesRaw && casesRaw.length > 0 && cases.length === 0) {
      setCases(casesRaw);
      setLoading(false);
    }
  }, [casesRaw]);

  // Fetch Cases & Hearings directly from Google Sheet CSVs live with cache-busting
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [casesRowsData, hearingsRowsData] = await Promise.all([
        parseCsvSheet(CASES_SHEET_URL),
        parseCsvSheet(HEARINGS_SHEET_URL)
      ]);

      if (casesRowsData && casesRowsData.length > 1) {
        const rows = casesRowsData.slice(1);
        const parsedCases: DetailedCase[] = rows
          .filter(r => r.some(c => c && c.trim()))
          .map(r => {
            const s = r.map(c => (c ? c.trim() : ''));
            return {
              caseNumber: s[0] || '',       // A: رقم القضية
              classification: s[1] || '',   // B: تصنيف القضية
              caseType: s[2] || '',         // C: نوع القضية
              caseDate: s[3] || '',         // D: تاريخ القضية
              plaintiff: s[4] || '',        // E: المدعي
              plaintiffId: s[5] || '',      // F: هوية المدعي
              defendant: s[6] || '',        // G: المدعى عليه
              defendantId: s[7] || '',      // H: هوية المدعى عليه
              claims: s[8] || '',           // I: طلبات
              court: s[9] || '',            // J: المحكمة
              circuit: s[10] || '',         // K: الدائرة
              driveLink: s[11] || '',       // L: ملف القضية
              caseStatus: s[12] || '',      // M: حالة القضية
              caseManager: s[13] || '',     // N: المسؤول عن القضية
              currentSituation: s[15] || '',// P: القضية حالها
              fileNameQ: s[16] || '',       // Q: اسم الملف
              requestType: s[17] || '',     // R: نوع الطلب
              completedCases: s[18] || '',  // S: القضايا المنجزه
              reportDate: s[19] || '',      // T: تاريخ رفع التقرير
              notes: s[20] || '',           // U: ملاحظات
              instrumentDeed: s[21] || '',  // V: الصك
              rawRow: s,
            };
          });
        setCases(parsedCases);
      }

      if (hearingsRowsData && hearingsRowsData.length > 1) {
        const rows = hearingsRowsData.slice(1);
        const parsedHearings: HearingRecord[] = rows
          .filter(r => r.some(c => c && c.trim()))
          .map((r, idx) => {
            const s = r.map(c => (c ? c.trim() : ''));
            const caseNo = s[0] || s[1] || '';
            return {
              id: `hearing-${idx}`,
              caseNumber: caseNo,
              recordNumber: s[18] || s[1] || s[0] || '',
              hearingDate: s[13] || s[12] || s[2] || '',
              hijriDate: s[12] || '',
              hearingTime: s[14] || s[3] || '',
              status: s[17] || s[4] || '',
              link: s[16] || s[5] || '',
              rawRow: s,
            };
          });
        setHearings(parsedHearings);
      }

      const now = new Date();
      setLastUpdatedTime(now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError('حدث خطأ أثناء تحميل بيانات الشيت المباشرة.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter Helper functions
  const isCaseFinished = (c: DetailedCase) => {
    const st = (c.caseStatus + ' ' + c.currentSituation + ' ' + c.completedCases + ' ' + c.notes).toLowerCase();
    return st.includes('منتهي') || st.includes('منتهية') || st.includes('محكوم') || st.includes('إغلاق') || st.includes('مغلقة') || st.includes('تم الانتهاء') || c.completedCases.toUpperCase() === 'TRUE';
  };

  const getCaseOutcome = (c: DetailedCase): 'won' | 'lost' | 'settled' | 'unclear' | 'active' => {
    if (!isCaseFinished(c)) return 'active';
    const text = (c.currentSituation + ' ' + c.caseStatus + ' ' + c.notes + ' ' + c.completedCases).toLowerCase();
    if (text.includes('صلح') || text.includes('بالصلح') || text.includes('مصالحة') || text.includes('تنازل')) return 'settled';
    if (text.includes('لصالحنا') || text.includes('كسب') || text.includes('لصالح') || text.includes('إلزام المدعى عليه') || text.includes('قبول الدعوى') || text.includes('محكوم لصالحنا')) return 'won';
    if (text.includes('خسارة') || text.includes('ضدنا') || text.includes('رد الدعوى') || text.includes('صرف النظر') || text.includes('ترك الدعوى') || text.includes('خسارة القضية')) return 'lost';
    return 'unclear';
  };

  // Unique Dropdown Options
  const managersList = useMemo(() => {
    const setM = new Set<string>();
    cases.forEach(c => {
      const m = c.caseManager ? c.caseManager.trim() : '';
      if (m && m !== '-' && m !== 'غير محدد') setM.add(m);
    });
    return Array.from(setM).sort();
  }, [cases]);

  const courtsList = useMemo(() => {
    const setC = new Set<string>();
    cases.forEach(c => {
      const crt = c.court ? c.court.trim() : '';
      if (crt) setC.add(crt);
    });
    return Array.from(setC).sort();
  }, [cases]);

  const circuitsList = useMemo(() => {
    const setCr = new Set<string>();
    cases.forEach(c => {
      const cr = c.circuit ? c.circuit.trim() : '';
      if (cr) setCr.add(cr);
    });
    return Array.from(setCr).sort();
  }, [cases]);

  const requestTypesList = useMemo(() => {
    const setR = new Set<string>();
    cases.forEach(c => {
      const r = c.requestType ? c.requestType.trim() : (c.classification ? c.classification.trim() : '');
      if (r) setR.add(r);
    });
    return Array.from(setR).sort();
  }, [cases]);

  // Overall Metrics
  const metrics = useMemo(() => {
    const total = cases.length;
    let active = 0;
    let finished = 0;
    let won = 0;
    let settled = 0;
    let lost = 0;
    let unassigned = 0;

    cases.forEach(c => {
      const m = c.caseManager ? c.caseManager.trim() : '';
      if (!m || m === '-' || m === 'غير محدد') unassigned++;

      if (isCaseFinished(c)) {
        finished++;
        const outcome = getCaseOutcome(c);
        if (outcome === 'won') won++;
        else if (outcome === 'settled') settled++;
        else if (outcome === 'lost') lost++;
      } else {
        active++;
      }
    });

    return { total, active, finished, won, settled, lost, unassigned, managersCount: managersList.length };
  }, [cases, managersList]);

  // Manager Summaries
  const managerSummaries = useMemo(() => {
    const map = new Map<string, {
      name: string;
      total: number;
      active: number;
      finished: number;
      won: number;
      lost: number;
      settled: number;
      unclear: number;
    }>();

    managersList.forEach(m => {
      map.set(m, { name: m, total: 0, active: 0, finished: 0, won: 0, lost: 0, settled: 0, unclear: 0 });
    });

    cases.forEach(c => {
      const m = c.caseManager ? c.caseManager.trim() : '';
      if (!m || m === '-' || m === 'غير محدد') return;

      let entry = map.get(m);
      if (!entry) {
        entry = { name: m, total: 0, active: 0, finished: 0, won: 0, lost: 0, settled: 0, unclear: 0 };
        map.set(m, entry);
      }

      entry.total++;
      if (isCaseFinished(c)) {
        entry.finished++;
        const outcome = getCaseOutcome(c);
        if (outcome === 'won') entry.won++;
        else if (outcome === 'lost') entry.lost++;
        else if (outcome === 'settled') entry.settled++;
        else entry.unclear++;
      } else {
        entry.active++;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [cases, managersList]);

  // Unassigned Cases
  const unassignedCasesList = useMemo(() => {
    return cases.filter(c => {
      const m = c.caseManager ? c.caseManager.trim() : '';
      return !m || m === '-' || m === 'غير محدد';
    });
  }, [cases]);

  // Unclear Finished Cases
  const unclearFinishedCasesList = useMemo(() => {
    return cases.filter(c => isCaseFinished(c) && getCaseOutcome(c) === 'unclear');
  }, [cases]);

  // Request Type Matrix
  const requestTypeMatrix = useMemo(() => {
    const map = new Map<string, {
      requestType: string;
      total: number;
      active: number;
      won: number;
      lost: number;
      settled: number;
      unclear: number;
    }>();

    cases.forEach(c => {
      const req = c.requestType ? c.requestType.trim() : (c.classification ? c.classification.trim() : 'غير محدد');
      let entry = map.get(req);
      if (!entry) {
        entry = { requestType: req, total: 0, active: 0, won: 0, lost: 0, settled: 0, unclear: 0 };
        map.set(req, entry);
      }

      entry.total++;
      if (!isCaseFinished(c)) {
        entry.active++;
      } else {
        const outcome = getCaseOutcome(c);
        if (outcome === 'won') entry.won++;
        else if (outcome === 'lost') entry.lost++;
        else if (outcome === 'settled') entry.settled++;
        else entry.unclear++;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [cases]);

  // Distributions
  const requestTypeDistribution = useMemo(() => {
    const map = new Map<string, number>();
    cases.forEach(c => {
      const r = c.requestType ? c.requestType.trim() : (c.classification ? c.classification.trim() : 'غير محدد');
      map.set(r, (map.get(r) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [cases]);

  const courtDistribution = useMemo(() => {
    const map = new Map<string, number>();
    cases.forEach(c => {
      const crt = c.court ? c.court.trim() : 'غير محددة';
      map.set(crt, (map.get(crt) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [cases]);

  const circuitDistribution = useMemo(() => {
    const map = new Map<string, number>();
    cases.forEach(c => {
      const circ = c.circuit ? c.circuit.trim() : 'غير محددة';
      map.set(circ, (map.get(circ) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [cases]);

  // Filtered Main Cases Table
  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      // Manager Filter
      if (selectedManagerFilter !== 'all') {
        const m = c.caseManager ? c.caseManager.trim() : 'غير محدد';
        if (m !== selectedManagerFilter) return false;
      }

      // Status Filter
      if (statusFilter === 'active' && isCaseFinished(c)) return false;
      if (statusFilter === 'finished' && !isCaseFinished(c)) return false;

      // Court Filter
      if (courtFilter !== 'all' && c.court.trim() !== courtFilter) return false;

      // Circuit Filter
      if (circuitFilter !== 'all' && c.circuit.trim() !== circuitFilter) return false;

      // Request Type Filter
      if (requestTypeFilter !== 'all') {
        const r = c.requestType ? c.requestType.trim() : (c.classification ? c.classification.trim() : '');
        if (r !== requestTypeFilter) return false;
      }

      // Search Query (Case Number, Plaintiff, Defendant, Claims)
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchNo = c.caseNumber.toLowerCase().includes(q);
        const matchPl = c.plaintiff.toLowerCase().includes(q);
        const matchDef = c.defendant.toLowerCase().includes(q);
        const matchClaim = c.claims.toLowerCase().includes(q);
        const matchNotes = c.notes.toLowerCase().includes(q);
        const matchManager = c.caseManager.toLowerCase().includes(q);
        if (!matchNo && !matchPl && !matchDef && !matchClaim && !matchNotes && !matchManager) {
          return false;
        }
      }

      return true;
    });
  }, [cases, selectedManagerFilter, statusFilter, courtFilter, circuitFilter, requestTypeFilter, searchQuery]);

  // Upcoming Active Hearings List (Reactive to filters & excluding finished hearings)
  const upcomingHearings = useMemo(() => {
    const list: {
      hearing: HearingRecord;
      linkedCase: DetailedCase | null;
      dateObj: Date | null;
      daysRemaining: number | null;
      managerName: string;
    }[] = [];

    hearings.forEach(h => {
      if (!h.hearingDate) return;
      const dObj = parseDateString(h.hearingDate);
      if (!dObj) return;

      const days = calculateDaysDiff(dObj);
      const hStatus = (h.status || '').toLowerCase();
      // Exclude past or finished hearings
      if (days < 0 || hStatus.includes('منتهية') || hStatus.includes('تمت') || hStatus.includes('ملغاة') || hStatus.includes('مغلقة')) {
        return;
      }

      let linked: DetailedCase | null = null;
      if (h.caseNumber) {
        const hNo = h.caseNumber.trim().toLowerCase();
        linked = cases.find(c => {
          const cNo = c.caseNumber.trim().toLowerCase();
          return cNo === hNo || (cNo && hNo && (cNo.includes(hNo) || hNo.includes(cNo)));
        }) || null;
      }

      // Exclude if linked case is finished
      if (linked && isCaseFinished(linked)) {
        return;
      }

      const mName = linked ? (linked.caseManager?.trim() || 'غير محدد') : 'غير محدد';

      // 1. Manager filter
      if (selectedManagerFilter !== 'all') {
        if (mName !== selectedManagerFilter) return;
      }

      // 2. Status filter
      if (statusFilter === 'finished') {
        return;
      }

      // 3. Court filter
      if (courtFilter !== 'all') {
        if (!linked || linked.court.trim() !== courtFilter) return;
      }

      // 4. Circuit filter
      if (circuitFilter !== 'all') {
        if (!linked || linked.circuit.trim() !== circuitFilter) return;
      }

      // 5. Request type filter
      if (requestTypeFilter !== 'all') {
        if (!linked) return;
        const r = linked.requestType ? linked.requestType.trim() : (linked.classification ? linked.classification.trim() : '');
        if (r !== requestTypeFilter) return;
      }

      // 6. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchNo = h.caseNumber.toLowerCase().includes(q);
        const matchPl = linked ? linked.plaintiff.toLowerCase().includes(q) : false;
        const matchDef = linked ? linked.defendant.toLowerCase().includes(q) : false;
        const matchClaims = linked ? linked.claims.toLowerCase().includes(q) : false;
        const matchManager = mName.toLowerCase().includes(q);
        if (!matchNo && !matchPl && !matchDef && !matchClaims && !matchManager) return;
      }

      list.push({
        hearing: h,
        linkedCase: linked,
        dateObj: dObj,
        daysRemaining: days,
        managerName: mName,
      });
    });

    return list.sort((a, b) => a.dateObj!.getTime() - b.dateObj!.getTime());
  }, [hearings, cases, selectedManagerFilter, statusFilter, courtFilter, circuitFilter, requestTypeFilter, searchQuery]);

  const handleResetFilters = () => {
    setSelectedManagerFilter('all');
    setStatusFilter('all');
    setCourtFilter('all');
    setCircuitFilter('all');
    setRequestTypeFilter('all');
    setSearchQuery('');
  };

  return (
    <div className="space-y-8 py-2">
      
      {/* Top Header Card */}
      <div className="neu-flat p-6 sm:p-8 rounded-3xl border border-slate-800/80 relative overflow-hidden bg-gradient-to-r from-[#0F1422] via-[#12192C] to-[#0F1422]">
        <div className="absolute top-0 left-0 w-96 h-96 bg-brand-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-gradient-to-br from-brand-primary/20 to-amber-500/10 text-brand-primary rounded-2xl border border-brand-primary/30 shadow-inner">
              <BarChart3 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white flex items-center gap-3">
                تحليلات قضايا الشيت والمسؤولين
                <span className="text-xs bg-brand-primary/20 text-brand-primary px-3 py-1 rounded-full font-mono border border-brand-primary/30">
                  {cases.length} قضية مسجلة
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                رصد شامل ومباشر لجميع بيانات الشيت، أداء المسؤولين، الموقف القضائي، ونسب الإنجاز
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs border border-slate-800 flex items-center gap-2 transition-colors"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              تحديث البيانات من الشيت
            </button>
          </div>
        </div>
      </div>

      {/* Loading & Error Indicators */}
      {loading && (
        <div className="p-12 text-center bg-[#0F1422] rounded-3xl border border-slate-800">
          <div className="inline-block animate-spin w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full mb-3"></div>
          <p className="text-sm font-bold text-slate-300">جاري معالجة واستيراد البيانات من قوقل شيت...</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-6 bg-red-950/30 border border-red-500/30 rounded-2xl text-red-300 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Main KPI Stat Cards Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            <div className="p-4 bg-[#0F1422] border border-slate-800 rounded-2xl space-y-1">
              <span className="text-[11px] text-slate-400 font-bold block">إجمالي القضايا</span>
              <div className="text-2xl font-black text-white font-mono">{metrics.total}</div>
              <span className="text-[10px] text-slate-500">في الشيت الرئيسي</span>
            </div>

            <div className="p-4 bg-[#0F1422] border border-emerald-500/20 rounded-2xl space-y-1">
              <span className="text-[11px] text-emerald-400 font-bold block">قضايا نشطة (قيد النظر)</span>
              <div className="text-2xl font-black text-emerald-400 font-mono">{metrics.active}</div>
              <span className="text-[10px] text-slate-500">منظورة حالياً</span>
            </div>

            <div className="p-4 bg-[#0F1422] border border-slate-800 rounded-2xl space-y-1">
              <span className="text-[11px] text-slate-300 font-bold block">قضايا منتهية</span>
              <div className="text-2xl font-black text-slate-200 font-mono">{metrics.finished}</div>
              <span className="text-[10px] text-slate-500">مغلقة / منجزة</span>
            </div>

            <div className="p-4 bg-[#0F1422] border border-emerald-500/30 rounded-2xl space-y-1 bg-emerald-500/5">
              <span className="text-[11px] text-emerald-300 font-bold block">لصالحنا</span>
              <div className="text-2xl font-black text-emerald-300 font-mono">{metrics.won}</div>
              <span className="text-[10px] text-emerald-500">حكم لصالحنا</span>
            </div>

            <div className="p-4 bg-[#0F1422] border border-sky-500/30 rounded-2xl space-y-1 bg-sky-500/5">
              <span className="text-[11px] text-sky-300 font-bold block">صلح</span>
              <div className="text-2xl font-black text-sky-300 font-mono">{metrics.settled}</div>
              <span className="text-[10px] text-sky-500">انتهت بالصلح</span>
            </div>

            <div className="p-4 bg-[#0F1422] border border-rose-500/30 rounded-2xl space-y-1 bg-rose-500/5">
              <span className="text-[11px] text-rose-300 font-bold block">خسارة</span>
              <div className="text-2xl font-black text-rose-300 font-mono">{metrics.lost}</div>
              <span className="text-[10px] text-rose-500">ضدنا / رد الدعوى</span>
            </div>

            <div className="p-4 bg-[#0F1422] border border-amber-500/30 rounded-2xl space-y-1 bg-amber-500/5">
              <span className="text-[11px] text-amber-300 font-bold block">بدون مسؤول</span>
              <div className="text-2xl font-black text-amber-300 font-mono">{metrics.unassigned}</div>
              <span className="text-[10px] text-amber-500">بحاجة لتعيين</span>
            </div>
          </div>

          {/* Section 1: Interactive Manager Summary Cards */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-primary" />
                <h3 className="text-lg font-black text-white">إحصائيات المسؤولين عن القضايا (خانة N)</h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                اضغط على بطاقة المسؤول للفلترة التلقائية
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* All Managers Card */}
              <div
                onClick={() => setSelectedManagerFilter('all')}
                className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                  selectedManagerFilter === 'all'
                    ? 'bg-gradient-to-br from-amber-500/15 via-[#0F1422] to-slate-900 border-brand-primary shadow-[0_0_20px_rgba(212,157,47,0.15)]'
                    : 'bg-[#0F1422] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black text-white">جميع المسؤولين</span>
                  <span className="p-2 rounded-xl bg-slate-900 text-brand-primary border border-slate-800">
                    <Users className="w-4 h-4" />
                  </span>
                </div>
                <div className="text-3xl font-black text-white font-mono mb-3">
                  {cases.length} <span className="text-xs font-normal text-slate-400">قضية</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-800/80">
                  <div className="text-emerald-400 font-bold">
                    نشطة: <span className="font-mono text-sm">{metrics.active}</span>
                  </div>
                  <div className="text-slate-400 font-bold">
                    منتهية: <span className="font-mono text-sm">{metrics.finished}</span>
                  </div>
                </div>
              </div>

              {/* Individual Manager Cards */}
              {managerSummaries.map((m) => {
                const isSelected = selectedManagerFilter === m.name;
                return (
                  <div
                    key={m.name}
                    onClick={() => setSelectedManagerFilter(isSelected ? 'all' : m.name)}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'bg-gradient-to-br from-brand-primary/20 via-[#0F1422] to-slate-900 border-brand-primary shadow-[0_0_20px_rgba(212,157,47,0.15)] ring-1 ring-brand-primary'
                        : 'bg-[#0F1422] border-slate-800/90 hover:border-brand-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-black text-amber-300 truncate max-w-[150px]" title={m.name}>
                        {m.name}
                      </h4>
                      <span className="p-1.5 rounded-lg bg-slate-900 text-slate-300 text-[10px] font-mono border border-slate-800">
                        {m.total} قضية
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] my-2 bg-slate-900/60 p-2 rounded-xl border border-slate-800/60">
                      <div>
                        <span className="text-slate-400 block text-[10px]">نشطة</span>
                        <span className="font-bold text-emerald-400 font-mono text-sm">{m.active}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">منتهية</span>
                        <span className="font-bold text-slate-300 font-mono text-sm">{m.finished}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-1 text-[10px] pt-2 border-t border-slate-800/80">
                      <span className="bg-emerald-500/15 text-emerald-300 px-1.5 py-0.5 rounded font-bold" title="لصالحنا">
                        لصالحنا: {m.won}
                      </span>
                      <span className="bg-sky-500/15 text-sky-300 px-1.5 py-0.5 rounded font-bold" title="صلح">
                        صلح: {m.settled}
                      </span>
                      <span className="bg-rose-500/15 text-rose-300 px-1.5 py-0.5 rounded font-bold" title="خسارة">
                        خسارة: {m.lost}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Comprehensive Cases Table with Full Search & Filters */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-brand-primary" />
                <h3 className="text-lg font-black text-white">جدول جميع قضايا الشيت التفصيلي</h3>
                <span className="text-xs bg-slate-800 text-brand-primary px-2.5 py-0.5 rounded-full font-mono">
                  {filteredCases.length} من أصل {cases.length}
                </span>
              </div>

              {(selectedManagerFilter !== 'all' || statusFilter !== 'all' || courtFilter !== 'all' || circuitFilter !== 'all' || requestTypeFilter !== 'all' || searchQuery) && (
                <button
                  onClick={handleResetFilters}
                  className="text-xs text-amber-400 hover:underline font-bold flex items-center gap-1 self-start sm:self-auto"
                >
                  <RotateCcw className="w-3 h-3" /> إعادة ضبط الفلاتر
                </button>
              )}
            </div>

            {/* Filter Bar */}
            <div className="p-5 bg-[#0F1422] border border-slate-800 rounded-2xl space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                
                {/* Search Bar */}
                <div className="col-span-1 sm:col-span-2 md:col-span-2">
                  <label className="block text-slate-400 font-bold mb-1">بحث شامل (رقم القضية، المدعي، المدعى عليه، الطلبات)</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ابحث برقم القضية، اسم المدعي أو المدعى عليه..."
                      className="w-full bg-[#0A0D16] border border-slate-800 rounded-xl p-2.5 pr-9 text-white font-medium outline-none focus:border-brand-primary placeholder-slate-600"
                    />
                    <Search className="w-4 h-4 text-slate-500 absolute top-3 right-3" />
                  </div>
                </div>

                {/* Manager Filter */}
                <div>
                  <label className="block text-slate-400 font-bold mb-1">المسؤول عن القضية (N)</label>
                  <select
                    value={selectedManagerFilter}
                    onChange={(e) => setSelectedManagerFilter(e.target.value)}
                    className="w-full bg-[#0A0D16] border border-slate-800 rounded-xl p-2.5 text-white font-bold outline-none focus:border-brand-primary"
                  >
                    <option value="all">جميع المسؤولين</option>
                    {managersList.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-slate-400 font-bold mb-1">حالة القضية (M)</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="w-full bg-[#0A0D16] border border-slate-800 rounded-xl p-2.5 text-white font-bold outline-none focus:border-brand-primary"
                  >
                    <option value="all">جميع الحالات</option>
                    <option value="active">القضايا النشطة (قيد النظر)</option>
                    <option value="finished">القضايا المنتهية</option>
                  </select>
                </div>

                {/* Court Filter */}
                <div>
                  <label className="block text-slate-400 font-bold mb-1">المحكمة (J)</label>
                  <select
                    value={courtFilter}
                    onChange={(e) => setCourtFilter(e.target.value)}
                    className="w-full bg-[#0A0D16] border border-slate-800 rounded-xl p-2.5 text-white font-bold outline-none focus:border-brand-primary"
                  >
                    <option value="all">جميع المحاكم</option>
                    {courtsList.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Request Type Filter */}
                <div>
                  <label className="block text-slate-400 font-bold mb-1">نوع الطلب (R)</label>
                  <select
                    value={requestTypeFilter}
                    onChange={(e) => setRequestTypeFilter(e.target.value)}
                    className="w-full bg-[#0A0D16] border border-slate-800 rounded-xl p-2.5 text-white font-bold outline-none focus:border-brand-primary"
                  >
                    <option value="all">جميع أنواع الطلبات</option>
                    {requestTypesList.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

              </div>
            </div>

            {/* Main Table */}
            <div className="overflow-x-auto bg-[#0F1422] border border-slate-800 rounded-2xl">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
                    <th className="p-3">رقم القضية</th>
                    <th className="p-3 text-amber-300">المسؤول (N)</th>
                    <th className="p-3">المدعي (E)</th>
                    <th className="p-3">المدعى عليه (G)</th>
                    <th className="p-3">المحكمة (J)</th>
                    <th className="p-3">الدائرة (K)</th>
                    <th className="p-3 text-amber-300">طلبات (I)</th>
                    <th className="p-3">حالة القضية (M)</th>
                    <th className="p-3">الموقف الحالي (P)</th>
                    <th className="p-3 text-center">التفاصيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {filteredCases.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-500">
                        لا توجد قضايا مطابقة للشروط المحددة.
                      </td>
                    </tr>
                  ) : (
                    filteredCases.map((c, idx) => {
                      const finished = isCaseFinished(c);
                      return (
                        <tr key={`case-${idx}`} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 font-bold text-white font-mono">{c.caseNumber || '-'}</td>
                          <td className="p-3 font-black text-amber-300 bg-amber-500/10 rounded-lg">
                            {c.caseManager || 'غير محدد'}
                          </td>
                          <td className="p-3 text-slate-300">{c.plaintiff || '-'}</td>
                          <td className="p-3 text-slate-300">{c.defendant || '-'}</td>
                          <td className="p-3">{c.court || '-'}</td>
                          <td className="p-3">{c.circuit || '-'}</td>
                          <td className="p-3 text-slate-300 max-w-[200px] truncate" title={c.claims}>
                            {c.claims || '-'}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              finished ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}>
                              {c.caseStatus || (finished ? 'منتهية' : 'قيد النظر')}
                            </span>
                          </td>
                          <td className="p-3 font-medium text-slate-300 max-w-[150px] truncate" title={c.currentSituation}>
                            {c.currentSituation || '-'}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => setSelectedCaseModal(c)}
                              className="px-2.5 py-1 rounded-lg bg-brand-primary/20 hover:bg-brand-primary/30 text-brand-primary font-bold text-[11px] border border-brand-primary/30 transition-colors"
                            >
                              عرض
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Upcoming Hearings Table */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <h3 className="text-lg font-black text-white">جدول أقرب الجلسات للمسؤولين</h3>
              <span className="text-xs bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full font-mono">
                {upcomingHearings.length} جلسة
              </span>
            </div>

            <div className="overflow-x-auto bg-[#0F1422] border border-slate-800 rounded-2xl">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
                    <th className="p-3">رقم القضية</th>
                    <th className="p-3 text-amber-300">المسؤول (N)</th>
                    <th className="p-3">المدعي</th>
                    <th className="p-3">المدعى عليه</th>
                    <th className="p-3">الطلبات الخاصة بالقضية (I)</th>
                    <th className="p-3">تاريخ الجلسة والساعة</th>
                    <th className="p-3 text-center">المتبقي على الجلسة</th>
                    <th className="p-3 text-center">رابط الجلسة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {upcomingHearings.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        لا توجد جلسات قادمة مسجلة في الشيت.
                      </td>
                    </tr>
                  ) : (
                    upcomingHearings.slice(0, 15).map((item, idx) => {
                      const days = item.daysRemaining;
                      let badgeBg = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
                      let daysText = '';

                      if (days === null) {
                        badgeBg = 'bg-slate-800 text-slate-400 border-slate-700';
                        daysText = '-';
                      } else if (days < 0) {
                        badgeBg = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
                        daysText = `انتهت منذ ${Math.abs(days)} يوم`;
                      } else if (days === 0) {
                        badgeBg = 'bg-red-600 text-white font-black animate-pulse';
                        daysText = 'اليوم !';
                      } else if (days <= 3) {
                        badgeBg = 'bg-amber-500/30 text-amber-300 border-amber-500/40 font-bold';
                        daysText = `${days} أيام متبقية`;
                      } else {
                        badgeBg = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
                        daysText = `${days} يوم متبقي`;
                      }

                      return (
                        <tr key={`uh-${idx}`} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 font-bold text-white font-mono">
                            <button
                              onClick={() => item.linkedCase && setSelectedCaseModal(item.linkedCase)}
                              className="hover:underline text-brand-primary"
                            >
                              {item.hearing.caseNumber || '-'}
                            </button>
                          </td>
                          <td className="p-3 font-black text-amber-300 bg-amber-500/10 rounded-lg">
                            {item.managerName}
                          </td>
                          <td className="p-3 text-slate-300">{item.linkedCase?.plaintiff || '-'}</td>
                          <td className="p-3 text-slate-300">{item.linkedCase?.defendant || '-'}</td>
                          <td className="p-3 text-slate-300 max-w-[200px] truncate" title={item.linkedCase?.claims}>
                            {item.linkedCase?.claims || 'جلسة بالمحكمة'}
                          </td>
                          <td className="p-3 font-bold text-white">
                            {item.hearing.hearingDate} {item.hearing.hearingTime ? `(${item.hearing.hearingTime})` : ''}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] border inline-block ${badgeBg}`}>
                              {daysText}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {isValidLink(item.hearing.link) ? (
                              <a
                                href={item.hearing.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sky-400 hover:underline font-bold"
                              >
                                <ExternalLink className="w-3.5 h-3.5" /> الجلسة
                              </a>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Analytics Distributions & Matrix */}
          <div className="space-y-6 pt-6 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-brand-primary" />
              <h3 className="text-lg font-black text-white">التحليلات والتوزيعات القضائية</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Request Type Distribution (R) */}
              <div className="p-5 bg-[#0F1422] border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="font-extrabold text-sm text-amber-300 flex items-center gap-1.5">
                    <FileText className="w-4 h-4" /> نوع القضايا (خانة R)
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">{requestTypeDistribution.length} أنواع</span>
                </div>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                  {requestTypeDistribution.map(([req, count]) => {
                    const pct = Math.round((count / (cases.length || 1)) * 100);
                    return (
                      <div key={req} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="text-slate-200 truncate max-w-[170px]" title={req}>{req}</span>
                          <span className="text-amber-400 font-bold font-mono">{count} ({pct}%)</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-primary rounded-full" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Courts Distribution (J) */}
              <div className="p-5 bg-[#0F1422] border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="font-extrabold text-sm text-sky-300 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" /> توزيع المحاكم (خانة J)
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">{courtDistribution.length} محكمة</span>
                </div>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                  {courtDistribution.map(([crt, count]) => {
                    const pct = Math.round((count / (cases.length || 1)) * 100);
                    return (
                      <div key={crt} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="text-slate-200 truncate max-w-[170px]" title={crt}>{crt}</span>
                          <span className="text-sky-400 font-bold font-mono">{count} ({pct}%)</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                          <div className="h-full bg-sky-500 rounded-full" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Circuits Distribution (K) */}
              <div className="p-5 bg-[#0F1422] border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="font-extrabold text-sm text-emerald-300 flex items-center gap-1.5">
                    <Layers className="w-4 h-4" /> توزيع الدوائر (خانة K)
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">{circuitDistribution.length} دائرة</span>
                </div>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                  {circuitDistribution.map(([circ, count]) => {
                    const pct = Math.round((count / (cases.length || 1)) * 100);
                    return (
                      <div key={circ} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="text-slate-200 truncate max-w-[170px]" title={circ}>{circ}</span>
                          <span className="text-emerald-400 font-bold font-mono">{count} ({pct}%)</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>

          {/* Section 5: Matrix Analysis & Alerts */}
          <div className="space-y-6 pt-6 border-t border-slate-800">
            <div className="p-5 bg-[#0F1422] border border-slate-800 rounded-2xl space-y-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-amber-400" />
                <h4 className="text-base font-black text-white">
                  مؤشر نتائج القضايا بحسب نوع الطلب (صلح / لصالحنا / خسارة / نشطة)
                </h4>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
                      <th className="p-3">نوع الطلب (R)</th>
                      <th className="p-3 text-center">إجمالي القضايا</th>
                      <th className="p-3 text-center text-emerald-400">لصالحنا</th>
                      <th className="p-3 text-center text-sky-400">صلح</th>
                      <th className="p-3 text-center text-rose-400">خسارة</th>
                      <th className="p-3 text-center text-amber-400">نشطة (قيد النظر)</th>
                      <th className="p-3 text-center text-slate-400">منتهية غير مفسرة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200 font-medium">
                    {requestTypeMatrix.map((item, idx) => (
                      <tr key={`rtm-${idx}`} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-bold text-white">{item.requestType}</td>
                        <td className="p-3 text-center font-bold font-mono">{item.total}</td>
                        <td className="p-3 text-center text-emerald-400 font-bold font-mono bg-emerald-500/10 rounded-lg">
                          {item.won}
                        </td>
                        <td className="p-3 text-center text-sky-400 font-bold font-mono bg-sky-500/10 rounded-lg">
                          {item.settled}
                        </td>
                        <td className="p-3 text-center text-rose-400 font-bold font-mono bg-rose-500/10 rounded-lg">
                          {item.lost}
                        </td>
                        <td className="p-3 text-center text-amber-400 font-bold font-mono bg-amber-500/10 rounded-lg">
                          {item.active}
                        </td>
                        <td className="p-3 text-center text-slate-400 font-mono">
                          {item.unclear}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </>
      )}

      {/* Selected Case Pop-Up Modal */}
      {selectedCaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0F1422] border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 text-right">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-black text-white">تفاصيل قضية رقم: {selectedCaseModal.caseNumber}</h3>
                <p className="text-xs text-brand-primary mt-1 font-medium">
                  {selectedCaseModal.fileNameQ || 'بيانات الشيت تفصيلية'}
                </p>
              </div>
              <button
                onClick={() => setSelectedCaseModal(null)}
                className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-brand-primary/10 border border-brand-primary/30 rounded-2xl space-y-1">
                <span className="text-brand-primary font-bold block">المسؤول عن القضية (N)</span>
                <p className="font-black text-amber-300 text-sm">{selectedCaseModal.caseManager || 'غير محدد'}</p>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                <span className="text-slate-400 font-semibold block">المحكمة والدائرة (J & K)</span>
                <p className="font-bold text-white">{selectedCaseModal.court || '-'} / {selectedCaseModal.circuit || '-'}</p>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                <span className="text-slate-400 font-semibold block">المدعي والمدعى عليه</span>
                <p className="font-bold text-white">{selectedCaseModal.plaintiff} ضد {selectedCaseModal.defendant}</p>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                <span className="text-slate-400 font-semibold block">تاريخ القضية (D)</span>
                <p className="font-bold text-white font-mono">{selectedCaseModal.caseDate || '-'}</p>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                <span className="text-slate-400 font-semibold block">حالة القضية (M)</span>
                <p className="font-bold text-emerald-400">{selectedCaseModal.caseStatus || '-'}</p>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                <span className="text-slate-400 font-semibold block">الموقف القضائي / حالها (P)</span>
                <p className="font-bold text-sky-400">{selectedCaseModal.currentSituation || '-'}</p>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                <span className="text-slate-400 font-semibold block">نوع الطلب (R)</span>
                <p className="font-bold text-amber-300">{selectedCaseModal.requestType || selectedCaseModal.classification || '-'}</p>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                <span className="text-slate-400 font-semibold block">تصنيف ونوع القضية (B & C)</span>
                <p className="font-bold text-white">{selectedCaseModal.classification || '-'} - {selectedCaseModal.caseType || '-'}</p>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                <span className="text-slate-400 font-semibold block">تاريخ رفع التقرير (T)</span>
                <p className="font-bold text-white font-mono">{selectedCaseModal.reportDate || '-'}</p>
              </div>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1 text-xs">
              <span className="text-slate-400 font-semibold block">الطلبات الخاصة بالقضية (I)</span>
              <p className="text-slate-200 leading-relaxed font-medium">{selectedCaseModal.claims || 'لا توجد طلبات مسجلة'}</p>
            </div>

            {selectedCaseModal.notes && (
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1 text-xs">
                <span className="text-slate-400 font-semibold block">ملاحظات (U)</span>
                <p className="text-slate-300 leading-relaxed font-medium">{selectedCaseModal.notes}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              {isValidLink(selectedCaseModal.driveLink) && (
                <a
                  href={selectedCaseModal.driveLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500/20 text-sky-300 font-bold hover:bg-sky-500/30 border border-sky-500/30 transition-colors text-xs"
                >
                  <FolderOpen className="w-4 h-4 text-sky-400" /> استعراض مجلد القضية على قوقل درايف
                </a>
              )}
              {isValidLink(selectedCaseModal.instrumentDeed) && (
                <a
                  href={selectedCaseModal.instrumentDeed}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold hover:bg-emerald-500/30 border border-emerald-500/30 transition-colors text-xs"
                >
                  <FileCheck className="w-4 h-4 text-emerald-400" /> استعراض رابط الصك
                </a>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default AnalyticsSection;
