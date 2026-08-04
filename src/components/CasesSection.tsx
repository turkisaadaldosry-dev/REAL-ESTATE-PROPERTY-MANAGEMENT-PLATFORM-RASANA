import React, { useState, useMemo, useEffect } from 'react';
import Papa from 'papaparse';
import {
  Scale,
  Search,
  Filter,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Gavel,
  User,
  Calendar as CalendarIcon,
  FolderOpen,
  FileText,
  X,
  Layers,
  Info,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Building,
  ArrowUpRight,
  Shield,
  MessageSquare,
  Maximize2,
  Minimize2,
  Grid,
  LayoutGrid
} from 'lucide-react';
import {
  DetailedCase,
  HearingRecord,
  MemoRecord,
  JudgmentRecord,
  CaseFilterState
} from '../types';

const CASES_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT8qWdU0eFMs5IMYbDwamiGZCpDejrHdczl1d9D8Ivdo91ulEzeXC6uyrJmPw3-z9j4CtUnE5tUPdMn/pub?gid=1227781018&single=true&output=csv';
const HEARINGS_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT8qWdU0eFMs5IMYbDwamiGZCpDejrHdczl1d9D8Ivdo91ulEzeXC6uyrJmPw3-z9j4CtUnE5tUPdMn/pub?gid=488217084&single=true&output=csv';
const MEMOS_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT8qWdU0eFMs5IMYbDwamiGZCpDejrHdczl1d9D8Ivdo91ulEzeXC6uyrJmPw3-z9j4CtUnE5tUPdMn/pub?gid=1641195402&single=true&output=csv';
const JUDGMENTS_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT8qWdU0eFMs5IMYbDwamiGZCpDejrHdczl1d9D8Ivdo91ulEzeXC6uyrJmPw3-z9j4CtUnE5tUPdMn/pub?gid=2104745904&single=true&output=csv';

// Helper to check if a link is valid (starts with http/https/www and non-empty)
function isValidLink(urlStr: string | undefined | null): boolean {
  if (!urlStr) return false;
  const clean = urlStr.trim();
  if (clean === '#' || clean === '-' || clean.length < 6) return false;
  return clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('www.');
}

// Helper to format time (8..11 => ص, 12..16 or 12..4 => م)
function formatTimeHour(timeStr: string): string {
  if (!timeStr) return '-';
  const clean = timeStr.trim();
  const match = clean.match(/(\d{1,2}):?(\d{2})?/);
  if (match) {
    let hour = parseInt(match[1], 10);
    const minute = match[2] || '00';
    if (hour >= 8 && hour <= 11) {
      return `${hour}:${minute} ص`;
    } else if (hour >= 12 || hour <= 4) {
      if (hour > 12) hour = hour - 12;
      return `${hour}:${minute} م`;
    }
  }
  return clean;
}

// Helper to convert Gregorian date string to Hijri approximation or Arabic date format
function getHijriDateString(dateObj: Date): string {
  try {
    const formatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long'
    });
    return formatter.format(dateObj);
  } catch {
    return '';
  }
}

// Helper to parse date strings from Google Sheets (handles YYYY-MM-DD, DD/MM/YYYY, D/M/YYYY)
function parseDateString(dStr: string): Date | null {
  if (!dStr) return null;
  const clean = dStr.trim();
  if (!clean || clean === '-' || clean === 'لا يوجد') return null;

  // Pattern 1: YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const isoMatch = clean.match(/^(\d{4})[-/. ](\d{1,2})[-/. ](\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return new Date(y, m - 1, d);
    }
  }

  // Pattern 2: DD/MM/YYYY or D/M/YYYY or DD-MM-YYYY
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
      // In Arabic Google Sheets, DD/MM/YYYY is standard
      return new Date(y, p2 - 1, p1);
    }
  }

  // Fallback: Date.parse
  const t = Date.parse(clean);
  if (!isNaN(t)) {
    return new Date(t);
  }

  return null;
}

export default function CasesSection() {
  // Data State
  const [cases, setCases] = useState<DetailedCase[]>([]);
  const [hearings, setHearings] = useState<HearingRecord[]>([]);
  const [memos, setMemos] = useState<MemoRecord[]>([]);
  const [judgments, setJudgments] = useState<JudgmentRecord[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Layout View Mode ('all' | 'table' | 'agenda' | 'calendar')
  const [sectionViewMode, setSectionViewMode] = useState<'all' | 'table' | 'agenda' | 'calendar'>('all');

  // Filters State
  const [filters, setFilters] = useState<CaseFilterState>({
    caseNumber: '',
    caseStatus: 'all',
    court: 'all',
    circuit: 'all',
    plaintiff: 'all',
    defendant: 'all',
  });

  // Active KPI Card Filter
  const [activeKpiFilter, setActiveKpiFilter] = useState<'under_review' | 'finished' | 'active_hearings' | 'finished_hearings' | null>(null);

  // Pagination for Cases Table
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Calendar State (Current month view)
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(new Date());

  // Selected Case Modal
  const [selectedCaseModal, setSelectedCaseModal] = useState<DetailedCase | null>(null);

  // Load CSV Data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all 4 Google Sheets in parallel using PapaParse
      const [casesRes, hearingsRes, memosRes, judgmentsRes] = await Promise.all([
        fetch(CASES_SHEET_URL).then(r => r.text()),
        fetch(HEARINGS_SHEET_URL).then(r => r.text()),
        fetch(MEMOS_SHEET_URL).then(r => r.text()),
        fetch(JUDGMENTS_SHEET_URL).then(r => r.text()),
      ]);

      // 1. Parse Cases
      const parsedCasesData = Papa.parse<string[]>(casesRes, { skipEmptyLines: true }).data;
      const casesRows = parsedCasesData.length > 1 ? parsedCasesData.slice(1) : [];
      const parsedCases: DetailedCase[] = casesRows
        .filter(r => r.some(c => c.trim()))
        .map(r => {
          const s = r.map(c => (c ? c.trim() : ''));
          return {
            caseNumber: s[0] || '',       // A
            classification: s[1] || '',   // B
            caseType: s[2] || '',         // C
            caseDate: s[3] || '',         // D
            plaintiff: s[4] || '',        // E
            plaintiffId: s[5] || '',      // F
            defendant: s[6] || '',        // G
            defendantId: s[7] || '',      // H
            claims: s[8] || '',           // I
            court: s[9] || '',            // J
            circuit: s[10] || '',         // K
            driveLink: s[11] || '',       // L
            caseStatus: s[12] || '',      // M
            caseManager: s[13] || '',     // N
            currentSituation: s[15] || '',// P
            fileNameQ: s[16] || '',       // Q
            requestType: s[17] || '',     // R
            completedCases: s[18] || '',  // S
            reportDate: s[19] || '',      // T
            notes: s[20] || '',           // U
            instrumentDeed: s[21] || '',  // V
            rawRow: s,
          };
        });

      // 2. Parse Hearings
      const parsedHearingsData = Papa.parse<string[]>(hearingsRes, { skipEmptyLines: true }).data;
      const hearingsRows = parsedHearingsData.length > 1 ? parsedHearingsData.slice(1) : [];
      const parsedHearings: HearingRecord[] = hearingsRows
        .filter(r => r.some(c => c.trim()))
        .map((r, idx) => {
          const s = r.map(c => (c ? c.trim() : ''));
          const caseNo = s[0] || s[1] || '';
          return {
            id: `hearing-${idx}`,
            caseNumber: caseNo,
            recordNumber: s[18] || s[1] || s[0] || '', // Col S
            hearingDate: s[13] || s[12] || s[2] || '', // Col N (تاريخ الجلسة بالميلادي)
            hijriDate: s[12] || '',                    // Col M (تاريخ الجلسة بالهجري)
            hearingTime: s[14] || s[3] || '',          // Col O (الساعة)
            status: s[17] || s[4] || '',               // Col R
            link: s[16] || s[5] || '',                 // Col Q
            rawRow: s,
          };
        });

      // 3. Parse Memos
      const parsedMemosData = Papa.parse<string[]>(memosRes, { skipEmptyLines: true }).data;
      const memosRows = parsedMemosData.length > 1 ? parsedMemosData.slice(1) : [];
      const parsedMemos: MemoRecord[] = memosRows
        .filter(r => r.some(c => c.trim()))
        .map((r, idx) => {
          const s = r.map(c => (c ? c.trim() : ''));
          const caseNo = s[0] || s[1] || '';
          return {
            id: `memo-${idx}`,
            caseNumber: caseNo,
            memoNumber: s[18] || s[1] || s[0] || '',   // Col S
            task: s[12] || s[2] || '',                 // Col M
            dueDate: s[13] || s[3] || '',              // Col N
            status: s[15] || s[4] || '',               // Col P
            actualDeliveryDate: s[16] || s[5] || '',  // Col Q
            attachmentLink: s[17] || s[6] || '',       // Col R
            rawRow: s,
          };
        });

      // 4. Parse Judgments
      const parsedJudgmentsData = Papa.parse<string[]>(judgmentsRes, { skipEmptyLines: true }).data;
      const judgmentsRows = parsedJudgmentsData.length > 1 ? parsedJudgmentsData.slice(1) : [];
      const parsedJudgments: JudgmentRecord[] = judgmentsRows
        .filter(r => r.some(c => c.trim()))
        .map((r, idx) => {
          const s = r.map(c => (c ? c.trim() : ''));
          const caseNo = s[0] || s[1] || '';
          return {
            id: `judgment-${idx}`,
            caseNumber: caseNo,
            judgmentStatus: s[12] || s[2] || '',      // Col M
            instrumentNumber: s[13] || s[3] || '',    // Col N
            judgmentDate: s[15] || s[4] || '',        // Col P
            deedDocument: s[18] || s[5] || '',        // Col S
            appealStatus: s[21] || s[6] || '',        // Col V
            appealDocument: s[26] || s[7] || '',      // Col AA
            rawRow: s,
          };
        });

      setCases(parsedCases);
      setHearings(parsedHearings);
      setMemos(parsedMemos);
      setJudgments(parsedJudgments);
    } catch (err: any) {
      console.error('Error fetching cases data:', err);
      setError('تعذر جلب ملفات القضايا والجلسات والمذكرات من قوقل شيت.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Distinct values for filter dropdowns
  const distinctCourts = useMemo(() => {
    const set = new Set<string>();
    cases.forEach(c => { if (c.court) set.add(c.court.trim()); });
    return Array.from(set);
  }, [cases]);

  const distinctCircuits = useMemo(() => {
    const set = new Set<string>();
    cases.forEach(c => { if (c.circuit) set.add(c.circuit.trim()); });
    return Array.from(set);
  }, [cases]);

  const distinctPlaintiffs = useMemo(() => {
    const set = new Set<string>();
    cases.forEach(c => { if (c.plaintiff) set.add(c.plaintiff.trim()); });
    return Array.from(set);
  }, [cases]);

  const distinctDefendants = useMemo(() => {
    const set = new Set<string>();
    cases.forEach(c => { if (c.defendant) set.add(c.defendant.trim()); });
    return Array.from(set);
  }, [cases]);

  // Helper function to check if case status is finished
  const isCaseFinished = (caseItem: DetailedCase) => {
    const st = (caseItem.caseStatus || '').toLowerCase();
    return st.includes('منتهية') || st.includes('منتهيه') || st.includes('مغلقة') || st.includes('مكتملة');
  };

  // Helper function to check if hearing is finished
  const isHearingFinished = (h: HearingRecord) => {
    const st = (h.status || '').toLowerCase();
    return st.includes('منتهية') || st.includes('منتهيه') || st.includes('متمة') || st.includes('مغلقة');
  };

  // KPIs Calculations
  const activeCasesCount = useMemo(() => cases.filter(c => !isCaseFinished(c)).length, [cases]);
  const finishedCasesCount = useMemo(() => cases.filter(c => isCaseFinished(c)).length, [cases]);
  const activeHearingsCount = useMemo(() => hearings.filter(h => !isHearingFinished(h)).length, [hearings]);
  const finishedHearingsCount = useMemo(() => hearings.filter(h => isHearingFinished(h)).length, [hearings]);

  // Filtered Cases List
  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      // Case Number Search
      if (filters.caseNumber) {
        const q = filters.caseNumber.trim().toLowerCase();
        const numMatch = c.caseNumber.toLowerCase().includes(q);
        const nameMatch = c.fileNameQ.toLowerCase().includes(q);
        if (!numMatch && !nameMatch) return false;
      }

      // Case Status Filter
      if (filters.caseStatus === 'under_review') {
        if (isCaseFinished(c)) return false;
      } else if (filters.caseStatus === 'finished') {
        if (!isCaseFinished(c)) return false;
      }

      // Active KPI Filter overrides
      if (activeKpiFilter === 'under_review' && isCaseFinished(c)) return false;
      if (activeKpiFilter === 'finished' && !isCaseFinished(c)) return false;

      // Court
      if (filters.court !== 'all' && c.court !== filters.court) return false;

      // Circuit
      if (filters.circuit !== 'all' && c.circuit !== filters.circuit) return false;

      // Plaintiff
      if (filters.plaintiff !== 'all' && c.plaintiff !== filters.plaintiff) return false;

      // Defendant
      if (filters.defendant !== 'all' && c.defendant !== filters.defendant) return false;

      return true;
    });
  }, [cases, filters, activeKpiFilter]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, activeKpiFilter]);

  const totalPages = Math.ceil(filteredCases.length / itemsPerPage) || 1;
  const paginatedCases = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCases.slice(start, start + itemsPerPage);
  }, [filteredCases, currentPage, itemsPerPage]);

  // Reset all filters
  const handleResetFilters = () => {
    setFilters({
      caseNumber: '',
      caseStatus: 'all',
      court: 'all',
      circuit: 'all',
      plaintiff: 'all',
      defendant: 'all',
    });
    setActiveKpiFilter(null);
  };

  // 2. Current Sunday calculation for Agenda (Start of current week from Sunday)
  const currentSundayDate = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0, 0);
  }, []);

  const currentSundayFormatted = useMemo(() => {
    const day = String(currentSundayDate.getDate()).padStart(2, '0');
    const month = String(currentSundayDate.getMonth() + 1).padStart(2, '0');
    const year = currentSundayDate.getFullYear();
    return `${day}/${month}/${year}`;
  }, [currentSundayDate]);

  // Upcoming Agenda List starting from current week Sunday to ALL future upcoming events
  const upcomingEventsList = useMemo(() => {
    const events: {
      type: 'hearing' | 'memo';
      dateStr: string;
      timeStr: string;
      caseNumber: string;
      plaintiff: string;
      taskOrClaim: string;
      caseClaims?: string;
      dateObj: Date | null;
      caseRef?: DetailedCase;
    }[] = [];

    // Helper to find case ref
    const findCase = (cNo: string, raw: string[]) => {
      if (!cNo && (!raw || raw.length === 0)) return undefined;
      const cleanNo = cNo.trim().toLowerCase();
      const rawText = raw ? raw.join(' ').toLowerCase() : '';
      return cases.find(c => {
        if (cleanNo && c.caseNumber && (c.caseNumber.toLowerCase() === cleanNo || c.caseNumber.includes(cleanNo))) return true;
        if (c.caseNumber && rawText.includes(c.caseNumber.toLowerCase())) return true;
        return false;
      });
    };

    hearings.forEach(h => {
      const cRef = findCase(h.caseNumber, h.rawRow);
      const dateObj = parseDateString(h.hearingDate);
      events.push({
        type: 'hearing',
        dateStr: h.hearingDate,
        timeStr: formatTimeHour(h.hearingTime),
        caseNumber: h.caseNumber || (cRef ? cRef.caseNumber : 'جلسة قضائية'),
        plaintiff: cRef ? cRef.plaintiff : '-',
        taskOrClaim: h.status || 'جلسة بالمحكمة',
        caseClaims: cRef ? cRef.claims : '',
        dateObj,
        caseRef: cRef,
      });
    });

    memos.forEach(m => {
      const cRef = findCase(m.caseNumber, m.rawRow);
      const dateObj = parseDateString(m.dueDate);
      events.push({
        type: 'memo',
        dateStr: m.dueDate,
        timeStr: 'موعد تسليم',
        caseNumber: m.caseNumber || (cRef ? cRef.caseNumber : 'مذكرة قضائية'),
        plaintiff: cRef ? cRef.plaintiff : '-',
        taskOrClaim: m.task || 'مذكرة قانونية',
        caseClaims: cRef ? cRef.claims : '',
        dateObj,
        caseRef: cRef,
      });
    });

    // Filter events starting from current week's Sunday onwards
    const filteredEvents = events.filter(ev => {
      if (!ev.dateObj) return true; // keep if date string is unstructured
      return ev.dateObj >= currentSundayDate;
    });

    // Sort chronologically ascending
    filteredEvents.sort((a, b) => {
      if (a.dateObj && b.dateObj) {
        return a.dateObj.getTime() - b.dateObj.getTime();
      }
      return 0;
    });

    return filteredEvents;
  }, [hearings, memos, cases, currentSundayDate]);

  // 3. Calendar Grid Calculations
  const calendarDays = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday, ...
    const totalDays = lastDayOfMonth.getDate();

    const daysArray: {
      dateObj: Date;
      dayNumber: number;
      isCurrentMonth: boolean;
      hijriStr: string;
      hearings: HearingRecord[];
      memos: MemoRecord[];
    }[] = [];

    // Helper to find matching items on a given YYYY-MM-DD or DD/MM/YYYY date
    const dateMatches = (dStr: string, dateObj: Date) => {
      if (!dStr) return false;
      const parsed = parseDateString(dStr);
      if (parsed) {
        return (
          parsed.getFullYear() === dateObj.getFullYear() &&
          parsed.getMonth() === dateObj.getMonth() &&
          parsed.getDate() === dateObj.getDate()
        );
      }
      const clean = dStr.trim();
      const day = dateObj.getDate();
      const monthNum = dateObj.getMonth() + 1;
      const yearNum = dateObj.getFullYear();

      // Check format YYYY-MM-DD
      const isoStr = `${yearNum}-${monthNum < 10 ? '0' + monthNum : monthNum}-${day < 10 ? '0' + day : day}`;
      if (clean === isoStr || clean.includes(isoStr)) return true;

      // Check format DD/MM/YYYY or D/M/YYYY
      const dmy = `${day}/${monthNum}/${yearNum}`;
      const dmyPadded = `${day < 10 ? '0' + day : day}/${monthNum < 10 ? '0' + monthNum : monthNum}/${yearNum}`;
      if (clean === dmy || clean === dmyPadded || clean.includes(dmy) || clean.includes(dmyPadded)) return true;

      return false;
    };

    // Fill preceding days from previous month to start on Sunday
    for (let i = startDayOfWeek; i > 0; i--) {
      const prevDate = new Date(year, month, 1 - i);
      daysArray.push({
        dateObj: prevDate,
        dayNumber: prevDate.getDate(),
        isCurrentMonth: false,
        hijriStr: getHijriDateString(prevDate),
        hearings: [],
        memos: [],
      });
    }

    // Fill current month days
    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(year, month, d);
      const dayHearings = hearings.filter(h => dateMatches(h.hearingDate, dateObj));
      const dayMemos = memos.filter(m => dateMatches(m.dueDate, dateObj));

      daysArray.push({
        dateObj,
        dayNumber: d,
        isCurrentMonth: true,
        hijriStr: getHijriDateString(dateObj),
        hearings: dayHearings,
        memos: dayMemos,
      });
    }

    // Fill remaining trailing days to complete 7-column grid
    const remaining = (7 - (daysArray.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      daysArray.push({
        dateObj: nextDate,
        dayNumber: nextDate.getDate(),
        isCurrentMonth: false,
        hijriStr: getHijriDateString(nextDate),
        hearings: [],
        memos: [],
      });
    }

    return daysArray;
  }, [currentCalendarDate, hearings, memos]);

  // Helper to open case modal for a case number or case object
  const openCaseModalForNumber = (caseNum: string, fallbackCase?: DetailedCase) => {
    if (fallbackCase) {
      setSelectedCaseModal(fallbackCase);
      return;
    }
    const cleanNo = caseNum.trim().toLowerCase();
    const found = cases.find(c => c.caseNumber.toLowerCase().includes(cleanNo) || cleanNo.includes(c.caseNumber.toLowerCase()));
    if (found) {
      setSelectedCaseModal(found);
    } else if (cases.length > 0) {
      setSelectedCaseModal(cases[0]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[450px] flex flex-col items-center justify-center p-12 bg-[#0A0D16] rounded-3xl border border-slate-800/80 shadow-2xl">
        <div className="relative w-16 h-16 mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-brand-primary/20 animate-ping" />
          <div className="absolute inset-0 rounded-full border-4 border-t-brand-primary border-r-transparent border-b-brand-primary border-l-transparent animate-spin" />
          <div className="absolute inset-2 bg-gradient-to-tr from-brand-primary to-amber-500 rounded-full opacity-80 flex items-center justify-center shadow-lg">
            <Scale className="w-6 h-6 text-slate-950 animate-bounce" />
          </div>
        </div>
        <p className="text-lg font-bold text-slate-200">جاري تحميل وتزامن شيتات القضايا والجلسات والمذكرات والأحكام...</p>
        <p className="text-xs text-slate-400 mt-2">المزامنة الحية المباشرة مع Google Sheets CSV</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-rose-950/40 border border-rose-800/60 rounded-3xl text-center max-w-2xl mx-auto my-12 shadow-2xl backdrop-blur-md">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4 animate-pulse" />
        <h3 className="text-xl font-bold text-rose-200 mb-2">تعذر جلب بيانات القضايا</h3>
        <p className="text-sm text-rose-300 mb-6">{error}</p>
        <button
          onClick={fetchData}
          className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs transition-all shadow-lg hover:shadow-rose-600/30 flex items-center gap-2 mx-auto"
        >
          <RotateCcw className="w-4 h-4" /> إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-right dir-rtl animate-fadeIn">
      
      {/* 1. Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-[#101626] via-[#0D1220] to-[#101626] border border-slate-800/80 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-brand-primary/20 to-amber-500/10 border border-brand-primary/30">
              <Scale className="w-6 h-6 text-brand-primary" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                سجل القضايا الشامل والجلسات والمذكرات
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-primary/15 text-brand-primary font-outfit border border-brand-primary/30 font-semibold">
                  LIVE CSV
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                لوحة تحكم تفاعلية متكاملة للقضايا، الأجندة القريبة والتقويم الميلادي والهجري للجلسات والمذكرات
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300">
            إجمالي القضايا المسجلة: <span className="text-brand-primary font-outfit text-sm font-black">{cases.length}</span>
          </div>
        </div>
      </div>

      {/* 2. Top Interactive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* KPI 1: Active Cases */}
        <div
          onClick={() => {
            setActiveKpiFilter(prev => prev === 'under_review' ? null : 'under_review');
            setFilters(prev => ({ ...prev, caseStatus: prev.caseStatus === 'under_review' ? 'all' : 'under_review' }));
          }}
          className={`p-5 rounded-2xl bg-gradient-to-br from-[#101626] to-[#0A0D16] border transition-all duration-300 cursor-pointer group shadow-lg relative overflow-hidden ${
            activeKpiFilter === 'under_review' || filters.caseStatus === 'under_review'
              ? 'border-amber-500 ring-2 ring-amber-500/40 bg-amber-500/5'
              : 'border-slate-800/80 hover:border-amber-500/50 hover:shadow-amber-500/10'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-300">قضايا نشطة (قيد النظر)</span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
              <Gavel className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-outfit">{activeCasesCount}</span>
            <span className="text-xs font-bold text-amber-400">
              ({cases.length > 0 ? Math.round((activeCasesCount / cases.length) * 100) : 0}%)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
            <span>تصفية القضايا قيد النظر</span>
            <ChevronLeft className="w-3.5 h-3.5 text-amber-400" />
          </p>
        </div>

        {/* KPI 2: Finished Cases */}
        <div
          onClick={() => {
            setActiveKpiFilter(prev => prev === 'finished' ? null : 'finished');
            setFilters(prev => ({ ...prev, caseStatus: prev.caseStatus === 'finished' ? 'all' : 'finished' }));
          }}
          className={`p-5 rounded-2xl bg-gradient-to-br from-[#101626] to-[#0A0D16] border transition-all duration-300 cursor-pointer group shadow-lg relative overflow-hidden ${
            activeKpiFilter === 'finished' || filters.caseStatus === 'finished'
              ? 'border-emerald-500 ring-2 ring-emerald-500/40 bg-emerald-500/5'
              : 'border-slate-800/80 hover:border-emerald-500/50 hover:shadow-emerald-500/10'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-300">إجمالي القضايا المنتهية</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-outfit">{finishedCasesCount}</span>
            <span className="text-xs font-bold text-emerald-400">
              ({cases.length > 0 ? Math.round((finishedCasesCount / cases.length) * 100) : 0}%)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
            <span>تصفية القضايا المنتهية</span>
            <ChevronLeft className="w-3.5 h-3.5 text-emerald-400" />
          </p>
        </div>

        {/* KPI 3: Active Hearings */}
        <div
          onClick={() => {
            setActiveKpiFilter(prev => prev === 'active_hearings' ? null : 'active_hearings');
          }}
          className={`p-5 rounded-2xl bg-gradient-to-br from-[#101626] to-[#0A0D16] border transition-all duration-300 cursor-pointer group shadow-lg relative overflow-hidden ${
            activeKpiFilter === 'active_hearings'
              ? 'border-brand-primary ring-2 ring-brand-primary/40 bg-brand-primary/5'
              : 'border-slate-800/80 hover:border-brand-primary/50 hover:shadow-brand-primary/10'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-300">جلسات قيد النظر (نشطة)</span>
            <div className="p-2.5 rounded-xl bg-brand-primary/10 text-brand-primary group-hover:bg-brand-primary group-hover:text-slate-950 transition-colors">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-outfit">{activeHearingsCount}</span>
            <span className="text-xs font-bold text-brand-primary">جلسة</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
            <span>تصفية الجلسات الجارية</span>
            <ChevronLeft className="w-3.5 h-3.5 text-brand-primary" />
          </p>
        </div>

        {/* KPI 4: Finished Hearings */}
        <div
          onClick={() => {
            setActiveKpiFilter(prev => prev === 'finished_hearings' ? null : 'finished_hearings');
          }}
          className={`p-5 rounded-2xl bg-gradient-to-br from-[#101626] to-[#0A0D16] border transition-all duration-300 cursor-pointer group shadow-lg relative overflow-hidden ${
            activeKpiFilter === 'finished_hearings'
              ? 'border-sky-500 ring-2 ring-sky-500/40 bg-sky-500/5'
              : 'border-slate-800/80 hover:border-sky-500/50 hover:shadow-sky-500/10'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-300">إجمالي الجلسات المنتهية</span>
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 group-hover:bg-sky-500 group-hover:text-slate-950 transition-colors">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-outfit">{finishedHearingsCount}</span>
            <span className="text-xs font-bold text-sky-400">جلسة</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
            <span>تصفية الجلسات المنتهية</span>
            <ChevronLeft className="w-3.5 h-3.5 text-sky-400" />
          </p>
        </div>

      </div>

      {/* 3. View Switcher Bar (عرض كامل الصفحة) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-[#101626] border border-slate-800/80 rounded-2xl shadow-md">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300 px-2">
          <LayoutGrid className="w-4 h-4 text-brand-primary" />
          <span>طريقة العرض والتوسيع:</span>
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-2">
          <button
            onClick={() => setSectionViewMode('all')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
              sectionViewMode === 'all'
                ? 'bg-gradient-to-r from-brand-primary to-amber-500 text-slate-950 shadow-md shadow-brand-primary/20'
                : 'bg-[#0A0D16] text-slate-400 hover:text-white border border-slate-800/80'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            عرض شامل (الكل)
          </button>

          <button
            onClick={() => setSectionViewMode('table')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
              sectionViewMode === 'table'
                ? 'bg-gradient-to-r from-brand-primary to-amber-500 text-slate-950 shadow-md shadow-brand-primary/20'
                : 'bg-[#0A0D16] text-slate-400 hover:text-white border border-slate-800/80'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            جدول القضايا
          </button>

          <button
            onClick={() => setSectionViewMode('agenda')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
              sectionViewMode === 'agenda'
                ? 'bg-gradient-to-r from-brand-primary to-amber-500 text-slate-950 shadow-md shadow-brand-primary/20'
                : 'bg-[#0A0D16] text-slate-400 hover:text-white border border-slate-800/80'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            أجندة القضايا
          </button>

          <button
            onClick={() => setSectionViewMode('calendar')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
              sectionViewMode === 'calendar'
                ? 'bg-gradient-to-r from-brand-primary to-amber-500 text-slate-950 shadow-md shadow-brand-primary/20'
                : 'bg-[#0A0D16] text-slate-400 hover:text-white border border-slate-800/80'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            تقويم الجلسات والمذكرات
          </button>
        </div>
      </div>

      {/* 4. Advanced Filters */}
      <div className="p-5 bg-[#101626] border border-slate-800/80 rounded-2xl space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-brand-primary" />
            <h3 className="text-sm font-bold text-white">فلترة وتصفية سجل القضايا والجلسات</h3>
            {(filters.caseNumber || filters.caseStatus !== 'all' || filters.court !== 'all' || filters.circuit !== 'all' || filters.plaintiff !== 'all' || filters.defendant !== 'all' || activeKpiFilter) && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand-primary/20 text-brand-primary border border-brand-primary/30">
                فلتر نشط
              </span>
            )}
          </div>
          <button
            onClick={handleResetFilters}
            className="text-xs text-slate-400 hover:text-brand-primary flex items-center gap-1 transition-colors px-2.5 py-1 rounded-lg hover:bg-slate-900 border border-slate-800"
          >
            <RotateCcw className="w-3.5 h-3.5" /> إعادة ضبط الفلاتر
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          
          {/* Filter 1: Case Number Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            <input
              type="text"
              value={filters.caseNumber}
              onChange={(e) => setFilters(prev => ({ ...prev, caseNumber: e.target.value }))}
              placeholder="رقم القضية أو اسم الملف..."
              className="w-full pl-3 pr-9 py-2 bg-[#0A0D16] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary transition-colors"
            />
          </div>

          {/* Filter 2: Case Status (قيد النظر | منتهية) */}
          <select
            value={filters.caseStatus}
            onChange={(e) => setFilters(prev => ({ ...prev, caseStatus: e.target.value as any }))}
            className="w-full px-3 py-2 bg-[#0A0D16] border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-brand-primary"
          >
            <option value="all">حالة القضية (الكل)</option>
            <option value="under_review">قيد النظر</option>
            <option value="finished">منتهية</option>
          </select>

          {/* Filter 3: Court (خانة J) */}
          <select
            value={filters.court}
            onChange={(e) => setFilters(prev => ({ ...prev, court: e.target.value }))}
            className="w-full px-3 py-2 bg-[#0A0D16] border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-brand-primary"
          >
            <option value="all">المحكمة - خانة J ({distinctCourts.length})</option>
            {distinctCourts.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Filter 4: Circuit (خانة K) */}
          <select
            value={filters.circuit}
            onChange={(e) => setFilters(prev => ({ ...prev, circuit: e.target.value }))}
            className="w-full px-3 py-2 bg-[#0A0D16] border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-brand-primary"
          >
            <option value="all">الدائرة - خانة K ({distinctCircuits.length})</option>
            {distinctCircuits.map(cir => (
              <option key={cir} value={cir}>{cir}</option>
            ))}
          </select>

          {/* Filter 5: Plaintiff (خانة E) */}
          <select
            value={filters.plaintiff}
            onChange={(e) => setFilters(prev => ({ ...prev, plaintiff: e.target.value }))}
            className="w-full px-3 py-2 bg-[#0A0D16] border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-brand-primary"
          >
            <option value="all">المدعي - خانة E ({distinctPlaintiffs.length})</option>
            {distinctPlaintiffs.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          {/* Filter 6: Defendant (خانة G) */}
          <select
            value={filters.defendant}
            onChange={(e) => setFilters(prev => ({ ...prev, defendant: e.target.value }))}
            className="w-full px-3 py-2 bg-[#0A0D16] border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-brand-primary"
          >
            <option value="all">المدعى عليه - خانة G ({distinctDefendants.length})</option>
            {distinctDefendants.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

        </div>
      </div>

      {/* 5. Main Sections: Table & Agenda */}
      {(sectionViewMode === 'all' || sectionViewMode === 'table' || sectionViewMode === 'agenda') && (
        <div className={`grid grid-cols-1 ${sectionViewMode === 'all' ? 'lg:grid-cols-12' : 'lg:grid-cols-1'} gap-8`}>
          
          {/* Section 1: جدول القضايا الرئيسية */}
          {(sectionViewMode === 'all' || sectionViewMode === 'table') && (
            <div className={`${sectionViewMode === 'all' ? 'lg:col-span-7' : 'lg:col-span-12'} bg-[#101626] border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden flex flex-col justify-between`}>
              <div>
                <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-4 bg-[#0A0D16]/60">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-brand-primary" />
                    <h3 className="text-sm font-bold text-white">جدول معلومات القضايا الرئيسية</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300">
                      {filteredCases.length} قضية
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <p className="text-[11px] text-slate-400 hidden sm:block">
                      انقر على أي قضية لفتح بطاقتها ومستنداتها
                    </p>
                    <button
                      onClick={() => setSectionViewMode(sectionViewMode === 'table' ? 'all' : 'table')}
                      title={sectionViewMode === 'table' ? 'تصغير للكل' : 'توسيع بملء الصفحة'}
                      className="p-1.5 rounded-lg bg-slate-900 text-slate-300 hover:text-brand-primary hover:bg-slate-800 border border-slate-800 transition-colors"
                    >
                      {sectionViewMode === 'table' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="bg-[#0A0D16]/90 text-slate-400 text-xs font-bold border-b border-slate-800">
                        <th className="p-3 pr-4">رقم القضية (A)</th>
                        <th className="p-3">المدعي (E)</th>
                        <th className="p-3">المدعى عليه (G)</th>
                        <th className="p-3">المحكمة (J)</th>
                        <th className="p-3">الدائرة (K)</th>
                        <th className="p-3">الطلبات (I)</th>
                        <th className="p-3">الحالة (M)</th>
                        <th className="p-3 text-center">الملف (L)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-xs text-slate-200">
                      {paginatedCases.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-12 text-center text-slate-500">
                            <Info className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                            لا توجد قضايا مطابقة للفلاتر المحددة.
                          </td>
                        </tr>
                      ) : (
                        paginatedCases.map((c, idx) => {
                          const finished = isCaseFinished(c);
                          const hasValidDrive = isValidLink(c.driveLink);
                          return (
                            <tr
                              key={`case-${idx}-${c.caseNumber}`}
                              onClick={() => setSelectedCaseModal(c)}
                              className="hover:bg-slate-800/50 cursor-pointer transition-colors group"
                            >
                              {/* Col 1: Case Number (A) */}
                              <td className="p-3 pr-4 font-bold text-brand-primary whitespace-nowrap">
                                <span className="group-hover:underline flex items-center gap-1">
                                  <Gavel className="w-3.5 h-3.5 text-brand-primary" />
                                  {c.caseNumber || 'بدون رقم'}
                                </span>
                              </td>

                              {/* Col 2: Plaintiff (E) */}
                              <td className="p-3 max-w-[120px] truncate font-medium text-slate-200">
                                {c.plaintiff || '-'}
                              </td>

                              {/* Col 3: Defendant (G) */}
                              <td className="p-3 max-w-[120px] truncate font-medium text-slate-300">
                                {c.defendant || '-'}
                              </td>

                              {/* Col 4: Court (J) */}
                              <td className="p-3 whitespace-nowrap text-slate-300">
                                {c.court || '-'}
                              </td>

                              {/* Col 5: Circuit (K) */}
                              <td className="p-3 whitespace-nowrap text-slate-400">
                                {c.circuit || '-'}
                              </td>

                              {/* Col 6: Claims (I) */}
                              <td className="p-3 max-w-[140px] truncate text-slate-400" title={c.claims}>
                                {c.claims || '-'}
                              </td>

                              {/* Col 7: Case Status (M) */}
                              <td className="p-3 whitespace-nowrap">
                                {finished ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                    <CheckCircle2 className="w-3 h-3" />
                                    منتهية
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                    <Clock className="w-3 h-3" />
                                    قيد النظر
                                  </span>
                                )}
                              </td>

                              {/* Col 8: File Link (L) */}
                              <td className="p-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                {hasValidDrive ? (
                                  <a
                                    href={c.driveLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 font-bold text-[11px] border border-sky-500/30 transition-colors"
                                  >
                                    <FolderOpen className="w-3 h-3 text-sky-400" />
                                    استعراض
                                  </a>
                                ) : (
                                  <span className="text-slate-600 text-[10px]">-</span>
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

              {/* Pagination Footer */}
              {totalPages > 1 && (
                <div className="p-3 border-t border-slate-800 flex items-center justify-between gap-2 bg-[#0A0D16]">
                  <span className="text-[11px] text-slate-400">
                    صفحة {currentPage} من {totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40 text-xs"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-lg bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40 text-xs"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 2: أجندة القضايا القادمة */}
          {(sectionViewMode === 'all' || sectionViewMode === 'agenda') && (
            <div className={`${sectionViewMode === 'all' ? 'lg:col-span-5' : 'lg:col-span-12'} bg-[#101626] border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden flex flex-col`}>
              <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-2 bg-[#0A0D16]/60">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white">أجندة القضايا والجلسات القادمة</h3>
                    <p className="text-[11px] text-brand-primary font-bold mt-0.5">
                      من الأحد {currentSundayFormatted} إلى جميع الجلسات القادمة
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    {upcomingEventsList.length} موعد
                  </span>
                  <button
                    onClick={() => setSectionViewMode(sectionViewMode === 'agenda' ? 'all' : 'agenda')}
                    title={sectionViewMode === 'agenda' ? 'تصغير للكل' : 'توسيع بملء الصفحة'}
                    className="p-1.5 rounded-lg bg-slate-900 text-slate-300 hover:text-brand-primary hover:bg-slate-800 border border-slate-800 transition-colors"
                  >
                    {sectionViewMode === 'agenda' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-3 overflow-y-auto max-h-[520px] custom-scrollbar">
                {upcomingEventsList.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    لا توجد جلسات أو مذكرات قادمة مسجلة ابتداءً من الأحد {currentSundayFormatted}.
                  </div>
                ) : (
                  upcomingEventsList.map((ev, i) => (
                    <div
                      key={`ev-${i}`}
                      onClick={() => openCaseModalForNumber(ev.caseNumber, ev.caseRef)}
                      className="p-3.5 bg-[#0A0D16] hover:bg-slate-800/60 border border-slate-800 rounded-xl transition-all cursor-pointer group space-y-2 relative"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-bold">
                          <CalendarIcon className="w-3.5 h-3.5 text-brand-primary" />
                          {ev.dateStr || 'تاريخ قريب'}
                        </span>

                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${
                          ev.type === 'hearing'
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                        }`}>
                          {ev.type === 'hearing' ? '⚖️ جلسة قضائية' : '📝 مذكرة قانونية'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                        <div>
                          <span className="text-slate-400 text-[11px] block">رقم القضية / الوقت:</span>
                          <span className="font-bold text-white group-hover:text-brand-primary transition-colors">
                            قضية رقم: {ev.caseNumber} ({ev.timeStr})
                          </span>
                        </div>
                        <div className="text-left">
                          <span className="text-slate-400 text-[11px] block">المدعي:</span>
                          <span className="font-bold text-slate-300">{ev.plaintiff}</span>
                        </div>
                      </div>

                      {/* Column I Claims (الطلبات الخاصة بالقضية) */}
                      <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800/80 space-y-1 text-xs">
                        <div className="flex items-center gap-1.5 text-brand-primary font-bold text-[11px]">
                          <Scale className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                          <span>الطلبات الخاصة بالقضية (خانة I):</span>
                        </div>
                        <p className="text-slate-200 text-[11px] leading-relaxed font-medium">
                          {ev.caseClaims ? ev.caseClaims : (ev.caseRef?.claims ? ev.caseRef.claims : 'لا توجد طلبات مدونة في الشيت')}
                        </p>
                      </div>

                      {ev.taskOrClaim && (
                        <div className="text-[11px] text-slate-400 bg-slate-900/50 px-2.5 py-1.5 rounded-lg border border-slate-800/50 flex items-center gap-1">
                          <span className="font-bold text-slate-300">موضوع / حالة الموعد: </span>
                          <span>{ev.taskOrClaim}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>
      )}

      {/* 6. Section 3: التقويم التفاعلي للجلسات والمذكرات (Calendar View) */}
      {(sectionViewMode === 'all' || sectionViewMode === 'calendar') && (
        <div className="p-6 bg-[#101626] border border-slate-800/80 rounded-3xl shadow-xl space-y-6">
          
          {/* Calendar Header with Month Navigation */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">تقويم الجلسات والمذكرات (ميلادي وهجري)</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  توضيح مواعيد الجلسات والمذكرات مع تمييز المذكرات الهامة بالألوان (الأحمر للاطلاع، الأزرق للإرسال)
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const prev = new Date(currentCalendarDate);
                  prev.setMonth(prev.getMonth() - 1);
                  setCurrentCalendarDate(prev);
                }}
                className="p-2 rounded-xl bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800 text-xs transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <span className="text-sm font-bold text-white font-outfit px-3 py-1.5 bg-slate-900 rounded-xl border border-slate-800 min-w-[140px] text-center">
                {currentCalendarDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
              </span>

              <button
                onClick={() => {
                  const next = new Date(currentCalendarDate);
                  next.setMonth(next.getMonth() + 1);
                  setCurrentCalendarDate(next);
                }}
                className="p-2 rounded-xl bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800 text-xs transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => setCurrentCalendarDate(new Date())}
                className="px-3 py-1.5 rounded-xl bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary font-bold text-xs border border-brand-primary/30 transition-colors"
              >
                اليوم
              </button>

              <button
                onClick={() => setSectionViewMode(sectionViewMode === 'calendar' ? 'all' : 'calendar')}
                title={sectionViewMode === 'calendar' ? 'تصغير للكل' : 'توسيع بملء الصفحة'}
                className="p-2 rounded-xl bg-slate-900 text-slate-300 hover:text-brand-primary hover:bg-slate-800 border border-slate-800 transition-colors"
              >
                {sectionViewMode === 'calendar' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500" />
              <span className="text-slate-300 font-bold">مذكرة يجب الاطلاع عليها (أحمر)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-sky-500" />
              <span className="text-slate-300 font-bold">مذكرة يجب إرسالها (أزرق)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-slate-300 font-bold">جلسات ومذكرات أخرى</span>
            </div>
          </div>

          {/* Calendar Grid Table */}
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Days Header starting Sunday (الأحد) ending Saturday (السبت) */}
              <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-brand-primary bg-[#0A0D16] p-3 rounded-2xl border border-slate-800">
                <div>الأحد</div>
                <div>الإثنين</div>
                <div>الثلاثاء</div>
                <div>الأربعاء</div>
                <div>الخميس</div>
                <div>الجمعة</div>
                <div>السبت</div>
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day, idx) => {
                  const isToday =
                    day.dateObj.getDate() === new Date().getDate() &&
                    day.dateObj.getMonth() === new Date().getMonth() &&
                    day.dateObj.getFullYear() === new Date().getFullYear();

                  const hasEvents = day.hearings.length > 0 || day.memos.length > 0;

                  return (
                    <div
                      key={`day-${idx}`}
                      className={`min-h-[110px] p-2 rounded-2xl border transition-all flex flex-col justify-between ${
                        !day.isCurrentMonth
                          ? 'bg-[#0A0D16]/30 border-slate-900 text-slate-600 opacity-40'
                          : isToday
                          ? 'bg-brand-primary/10 border-brand-primary shadow-lg shadow-brand-primary/10'
                          : hasEvents
                          ? 'bg-[#0A0D16] border-slate-700/80 hover:border-brand-primary/50'
                          : 'bg-[#0A0D16]/80 border-slate-800/80'
                      }`}
                    >
                      {/* Day Header (Miladi & Hijri) */}
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className={`font-outfit font-black px-2 py-0.5 rounded-lg ${isToday ? 'bg-brand-primary text-slate-950' : 'text-slate-200'}`}>
                          {day.dayNumber}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium truncate max-w-[70px]">
                          {day.hijriStr}
                        </span>
                      </div>

                      {/* Items inside day */}
                      <div className="space-y-1 my-1 flex-1 overflow-y-auto max-h-[75px] custom-scrollbar">
                        {/* Hearings */}
                        {day.hearings.map((h, hI) => (
                          <div
                            key={`dh-${hI}`}
                            onClick={() => openCaseModalForNumber(h.caseNumber)}
                            className="p-1 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold truncate cursor-pointer hover:bg-amber-500/30 transition-colors"
                            title={`جلسة: قضية ${h.caseNumber} - ${h.hearingTime}`}
                          >
                            ⚖️ {h.caseNumber || 'جلسة'} ({formatTimeHour(h.hearingTime)})
                          </div>
                        ))}

                        {/* Memos with Color Coding */}
                        {day.memos.map((m, mI) => {
                          const taskLower = (m.task || '').toLowerCase();
                          const isReview = taskLower.includes('اطلاع') || taskLower.includes('مراجعة') || taskLower.includes('دراسة');
                          const isSend = taskLower.includes('ارسال') || taskLower.includes('إرسال') || taskLower.includes('تسليم') || taskLower.includes('رفع');

                          let badgeStyle = 'bg-slate-800 text-slate-300 border-slate-700';
                          if (isReview) {
                            badgeStyle = 'bg-rose-500/25 text-rose-300 border-rose-500/50';
                          } else if (isSend) {
                            badgeStyle = 'bg-sky-500/25 text-sky-300 border-sky-500/50';
                          }

                          return (
                            <div
                              key={`dm-${mI}`}
                              onClick={() => openCaseModalForNumber(m.caseNumber)}
                              className={`p-1 rounded-md border text-[10px] font-bold truncate cursor-pointer hover:opacity-80 transition-opacity ${badgeStyle}`}
                              title={`مذكرة: ${m.task} - قضية ${m.caseNumber}`}
                            >
                              📝 {m.task || 'مذكرة'}
                            </div>
                          );
                        })}
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 7. Detailed Case Modal (Pop-up) */}
      {selectedCaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#101626] border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl relative dir-rtl custom-scrollbar">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 sticky top-0 bg-[#101626] z-10 pt-1">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                  <Gavel className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    تفاصيل القضية رقم: <span className="text-brand-primary font-outfit">{selectedCaseModal.caseNumber}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedCaseModal.fileNameQ || 'ملف المحكمة والبيانات التفصيلية'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedCaseModal(null)}
                className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              
              {/* 1. المحكمة والدائرة (J & K) */}
              <div className="p-4 bg-[#0A0D16] border border-slate-800 rounded-2xl space-y-1">
                <span className="text-slate-400 block font-semibold">1. المحكمة والدائرة (خانة J & K)</span>
                <p className="font-bold text-white text-sm">{selectedCaseModal.court || '-'} / {selectedCaseModal.circuit || '-'}</p>
              </div>

              {/* 2. تصنيف القضية (B & C) */}
              <div className="p-4 bg-[#0A0D16] border border-slate-800 rounded-2xl space-y-1">
                <span className="text-slate-400 block font-semibold">2. التصنيف والنوع (خانة B & C)</span>
                <p className="font-bold text-white text-sm">{selectedCaseModal.classification || '-'} - {selectedCaseModal.caseType || '-'}</p>
              </div>

              {/* 3. تاريخ القضية (D) */}
              <div className="p-4 bg-[#0A0D16] border border-slate-800 rounded-2xl space-y-1">
                <span className="text-slate-400 block font-semibold">3. تاريخ القضية (خانة D)</span>
                <p className="font-bold text-white text-sm">{selectedCaseModal.caseDate || '-'}</p>
              </div>

              {/* 4. المدعي (E) */}
              <div className="p-4 bg-[#0A0D16] border border-slate-800 rounded-2xl space-y-1">
                <span className="text-slate-400 block font-semibold">4. المدعي (خانة E)</span>
                <p className="font-bold text-white text-sm">{selectedCaseModal.plaintiff || '-'}</p>
              </div>

              {/* 5. المدعى عليه (G) */}
              <div className="p-4 bg-[#0A0D16] border border-slate-800 rounded-2xl space-y-1">
                <span className="text-slate-400 block font-semibold">5. المدعى عليه (خانة G)</span>
                <p className="font-bold text-white text-sm">{selectedCaseModal.defendant || '-'}</p>
              </div>

              {/* 8. ملف القضية (L) - link check */}
              <div className="p-4 bg-[#0A0D16] border border-slate-800 rounded-2xl space-y-1">
                <span className="text-slate-400 block font-semibold">8. ملف القضية (خانة L)</span>
                {isValidLink(selectedCaseModal.driveLink) ? (
                  <a
                    href={selectedCaseModal.driveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-500/20 text-sky-300 font-bold hover:bg-sky-500/30 border border-sky-500/30 transition-colors mt-1"
                  >
                    <FolderOpen className="w-4 h-4 text-sky-400" />
                    استعراض المجلد على قوقل درايف
                  </a>
                ) : (
                  <p className="text-slate-500 font-medium">غير متاح</p>
                )}
              </div>

            </div>

            {/* 6. الطلبات (I) */}
            <div className="p-4 bg-[#0A0D16] border border-slate-800 rounded-2xl space-y-1 text-xs">
              <span className="text-slate-400 font-semibold block">6. الطلبات (خانة I)</span>
              <p className="text-slate-200 leading-relaxed font-medium">{selectedCaseModal.claims || 'لا توجد طلبات مسجلة'}</p>
            </div>

            {/* 7. تحليل الطلبات (R) */}
            <div className="p-4 bg-[#0A0D16] border border-slate-800 rounded-2xl space-y-1 text-xs">
              <span className="text-slate-400 font-semibold block">7. تحليل الطلبات (خانة R)</span>
              <p className="text-slate-200 leading-relaxed font-medium">{selectedCaseModal.requestType || selectedCaseModal.currentSituation || 'لا يوجد تحليل مسجل'}</p>
            </div>

            {/* 9. الجلسات المسجلة للقضية (جدول من رابط شيت الجلسات) */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <h4 className="text-sm font-bold text-white">الجلسات المسجلة للقضية (شيت الجلسات)</h4>
                </div>
              </div>

              {(() => {
                const caseHearings = hearings.filter(h => {
                  if (!h.caseNumber) return false;
                  const cNo = selectedCaseModal.caseNumber.trim().toLowerCase();
                  return h.caseNumber.toLowerCase().includes(cNo) || cNo.includes(h.caseNumber.toLowerCase());
                });

                if (caseHearings.length === 0) {
                  return (
                    <div className="p-4 bg-[#0A0D16] border border-slate-800 rounded-xl text-slate-500 text-xs">
                      لا توجد جلسات مسجلة لهذه القضية في شيت الجلسات.
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto bg-[#0A0D16] border border-slate-800 rounded-2xl">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
                          <th className="p-3">رقم الضبط (S)</th>
                          <th className="p-3">تاريخ الجلسة (N)</th>
                          <th className="p-3">الساعة (O)</th>
                          <th className="p-3">الحالة (R)</th>
                          <th className="p-3 text-center">رابط الجلسة (Q)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-200">
                        {caseHearings.map((h, hIdx) => {
                          const hasLink = isValidLink(h.link);
                          return (
                            <tr key={`ch-${hIdx}`} className="hover:bg-slate-800/40">
                              <td className="p-3 font-bold text-white">{h.recordNumber || '-'}</td>
                              <td className="p-3">{h.hearingDate || '-'}</td>
                              <td className="p-3 font-bold text-amber-400">{formatTimeHour(h.hearingTime)}</td>
                              <td className="p-3">{h.status || '-'}</td>
                              <td className="p-3 text-center">
                                {hasLink ? (
                                  <a
                                    href={h.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-sky-400 hover:underline font-bold"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" /> الدخول للجلسة
                                  </a>
                                ) : (
                                  <span className="text-slate-600">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* 10. المذكرات المسجلة للقضية (جدول من رابط شيت المذكرات) */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-400" />
                <h4 className="text-sm font-bold text-white">المذكرات المسجلة للقضية (شيت المذكرات)</h4>
              </div>

              {(() => {
                const caseMemos = memos.filter(m => {
                  if (!m.caseNumber) return false;
                  const cNo = selectedCaseModal.caseNumber.trim().toLowerCase();
                  return m.caseNumber.toLowerCase().includes(cNo) || cNo.includes(m.caseNumber.toLowerCase());
                });

                if (caseMemos.length === 0) {
                  return (
                    <div className="p-4 bg-[#0A0D16] border border-slate-800 rounded-xl text-slate-500 text-xs">
                      لا توجد مذكرات مسجلة لهذه القضية في شيت المذكرات.
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto bg-[#0A0D16] border border-slate-800 rounded-2xl">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
                          <th className="p-3">رقم المذكرة (S)</th>
                          <th className="p-3">المهمة (M)</th>
                          <th className="p-3">تاريخ التسليم (N)</th>
                          <th className="p-3">الحالة (P)</th>
                          <th className="p-3">تاريخ التسليم الفعلي (Q)</th>
                          <th className="p-3 text-center">مرفق المذكرة (R)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-200">
                        {caseMemos.map((m, mIdx) => {
                          const hasLink = isValidLink(m.attachmentLink);
                          return (
                            <tr key={`cm-${mIdx}`} className="hover:bg-slate-800/40">
                              <td className="p-3 font-bold text-white">{m.memoNumber || '-'}</td>
                              <td className="p-3 font-medium text-slate-200">{m.task || '-'}</td>
                              <td className="p-3 font-bold text-brand-primary">{m.dueDate || '-'}</td>
                              <td className="p-3">{m.status || '-'}</td>
                              <td className="p-3 text-emerald-400">{m.actualDeliveryDate || '-'}</td>
                              <td className="p-3 text-center">
                                {hasLink ? (
                                  <a
                                    href={m.attachmentLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-sky-400 hover:underline font-bold"
                                  >
                                    <FolderOpen className="w-3.5 h-3.5" /> المرفق
                                  </a>
                                ) : (
                                  <span className="text-slate-600">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* 11. الأحكام المسجلة للقضية (جدول من رابط شيت الأحكام) */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-bold text-white">الأحكام المسجلة للقضية (شيت الأحكام)</h4>
              </div>

              {(() => {
                const caseJudgments = judgments.filter(j => {
                  if (!j.caseNumber) return false;
                  const cNo = selectedCaseModal.caseNumber.trim().toLowerCase();
                  return j.caseNumber.toLowerCase().includes(cNo) || cNo.includes(j.caseNumber.toLowerCase());
                });

                if (caseJudgments.length === 0) {
                  return (
                    <div className="p-4 bg-[#0A0D16] border border-slate-800 rounded-xl text-slate-500 text-xs">
                      لا توجد أحكام مسجلة لهذه القضية في شيت الأحكام.
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto bg-[#0A0D16] border border-slate-800 rounded-2xl">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
                          <th className="p-3">حالة الحكم (M)</th>
                          <th className="p-3">رقم الصك (N)</th>
                          <th className="p-3">تاريخ الحكم بالميلادي (P)</th>
                          <th className="p-3 text-center">صك الحكم (S)</th>
                          <th className="p-3">حالة الإستئناف (V)</th>
                          <th className="p-3 text-center">صك الاستئناف (AA)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-200">
                        {caseJudgments.map((j, jIdx) => {
                          const hasDeed = isValidLink(j.deedDocument);
                          const hasAppeal = isValidLink(j.appealDocument);
                          return (
                            <tr key={`cj-${jIdx}`} className="hover:bg-slate-800/40">
                              <td className="p-3 font-bold text-emerald-400">{j.judgmentStatus || '-'}</td>
                              <td className="p-3 font-bold text-white">{j.instrumentNumber || '-'}</td>
                              <td className="p-3">{j.judgmentDate || '-'}</td>
                              <td className="p-3 text-center">
                                {hasDeed ? (
                                  <a
                                    href={j.deedDocument}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-sky-400 hover:underline font-bold"
                                  >
                                    <FileText className="w-3.5 h-3.5" /> الصك
                                  </a>
                                ) : (
                                  <span className="text-slate-600">-</span>
                                )}
                              </td>
                              <td className="p-3">{j.appealStatus || '-'}</td>
                              <td className="p-3 text-center">
                                {hasAppeal ? (
                                  <a
                                    href={j.appealDocument}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-sky-400 hover:underline font-bold"
                                  >
                                    <FileText className="w-3.5 h-3.5" /> الاستئناف
                                  </a>
                                ) : (
                                  <span className="text-slate-600">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                onClick={() => setSelectedCaseModal(null)}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors"
              >
                إغلاق
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
