import React, { useState, useMemo, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Filter,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Gavel,
  User,
  Calendar,
  FolderOpen,
  FileText,
  X,
  Layers,
  Info,
  Scale,
  XCircle,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { TaskItem, DetailedCase, TaskFilterState } from '../types';

const TASKS_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT8qWdU0eFMs5IMYbDwamiGZCpDejrHdczl1d9D8Ivdo91ulEzeXC6uyrJmPw3-z9j4CtUnE5tUPdMn/pub?gid=883025564&single=true&output=csv';

interface TasksSectionProps {
  tasksRaw: TaskItem[];
  casesRaw: DetailedCase[];
  loading: boolean;
  error: string | null;
  onRefresh?: () => void;
}

export default function TasksSection({
  tasksRaw,
  casesRaw,
  loading,
  error,
  onRefresh
}: TasksSectionProps) {
  // Filter State
  const [filters, setFilters] = useState<TaskFilterState>({
    searchQuery: '',
    mainPhase: 'all',
    importance: 'all',
    assignee: 'all',
    status: 'all',
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Modals state
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [selectedCase, setSelectedCase] = useState<DetailedCase | null>(null);
  const [selectedPhaseName, setSelectedPhaseName] = useState<string | null>(null);
  const [showCasesModal, setShowCasesModal] = useState<boolean>(false);
  const [showPhasesModal, setShowPhasesModal] = useState<boolean>(false);

  // Search inside Cases Modal
  const [caseSearchQuery, setCaseSearchQuery] = useState<string>('');
  const [caseCourtFilter, setCaseCourtFilter] = useState<string>('all');

  // Extract distinct values for filter dropdowns
  const distinctPhases = useMemo(() => {
    const set = new Set<string>();
    tasksRaw.forEach(t => { if (t.mainPhase) set.add(t.mainPhase); });
    return Array.from(set);
  }, [tasksRaw]);

  // Distinct Column D (Importance)
  const distinctImportances = useMemo(() => {
    const set = new Set<string>();
    tasksRaw.forEach(t => { 
      const imp = t.importance || (t.rawRow && t.rawRow[3]) || '';
      if (imp) set.add(imp.trim()); 
    });
    return Array.from(set);
  }, [tasksRaw]);

  // Distinct Column H (Assignee)
  const distinctAssignees = useMemo(() => {
    const set = new Set<string>();
    tasksRaw.forEach(t => { 
      const ass = t.assignee || (t.rawRow && t.rawRow[7]) || '';
      if (ass) set.add(ass.trim()); 
    });
    return Array.from(set);
  }, [tasksRaw]);

  // Distinct Courts for cases filter
  const distinctCourts = useMemo(() => {
    const set = new Set<string>();
    casesRaw.forEach(c => { if (c.court) set.add(c.court); });
    return Array.from(set);
  }, [casesRaw]);

  // Helper function to check if task is completed
  const isTaskCompleted = (t: TaskItem) => {
    if (t.progressPercentage === 100) return true;
    const colE = t.rawRow && t.rawRow[4] ? t.rawRow[4] : '';
    const colL = t.rawRow && t.rawRow[11] ? t.rawRow[11] : '';
    const str = `${t.status || ''} ${colE} ${colL} ${t.notes || ''} ${t.rawRow ? t.rawRow.join(' ') : ''}`.toLowerCase();
    return (
      str.includes('مكتمل') ||
      str.includes('منجز') ||
      str.includes('تم') ||
      str.includes('100') ||
      str.includes('جاهز') ||
      str.includes('مغلق') ||
      colE.trim() === '1' ||
      colE.trim() === 'نعم'
    );
  };

  // Phase aggregation
  const phaseStats = useMemo(() => {
    const map = new Map<string, { total: number; completed: number; avgProgress: number; linkedCase?: DetailedCase; tasks: TaskItem[] }>();
    tasksRaw.forEach(t => {
      const p = t.mainPhase || 'غير محددة';
      const existing = map.get(p) || { total: 0, completed: 0, avgProgress: 0, linkedCase: t.linkedCase, tasks: [] };
      existing.total += 1;
      existing.tasks.push(t);
      if (isTaskCompleted(t)) existing.completed += 1;
      existing.avgProgress += (isTaskCompleted(t) ? 100 : t.progressPercentage);
      if (!existing.linkedCase && t.linkedCase) existing.linkedCase = t.linkedCase;
      map.set(p, existing);
    });

    const result: { name: string; total: number; completed: number; percent: number; isCompleted: boolean; linkedCase?: DetailedCase; tasks: TaskItem[] }[] = [];
    map.forEach((val, key) => {
      const percent = val.total > 0 ? Math.round(val.avgProgress / val.total) : 0;
      result.push({
        name: key,
        total: val.total,
        completed: val.completed,
        percent,
        isCompleted: percent === 100 || val.completed === val.total,
        linkedCase: val.linkedCase,
        tasks: val.tasks
      });
    });

    return result;
  }, [tasksRaw]);

  // Set of Completed & Uncompleted Phase Names
  const completedPhaseNames = useMemo(() => {
    return new Set(phaseStats.filter(p => p.isCompleted).map(p => p.name));
  }, [phaseStats]);

  const uncompletedPhaseNames = useMemo(() => {
    return new Set(phaseStats.filter(p => !p.isCompleted).map(p => p.name));
  }, [phaseStats]);

  // Filter Tasks
  const filteredTasks = useMemo(() => {
    return tasksRaw.filter(task => {
      // Search query (Task name, assignee, main phase, notes)
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase().trim();
        const matchesName = task.taskName.toLowerCase().includes(q);
        const matchesAssignee = (task.assignee || '').toLowerCase().includes(q);
        const matchesPhase = task.mainPhase.toLowerCase().includes(q);
        const matchesNotes = (task.notes || '').toLowerCase().includes(q);
        const matchesCase = task.linkedCase
          ? (task.linkedCase.caseNumber.includes(q) || task.linkedCase.fileNameQ.toLowerCase().includes(q))
          : false;

        if (!matchesName && !matchesAssignee && !matchesPhase && !matchesNotes && !matchesCase) {
          return false;
        }
      }

      // Main phase filter
      if (filters.mainPhase !== 'all' && task.mainPhase !== filters.mainPhase) {
        return false;
      }

      // Importance filter (Column D)
      if (filters.importance !== 'all') {
        const taskImp = (task.importance || (task.rawRow && task.rawRow[3]) || '').trim();
        if (taskImp !== filters.importance) return false;
      }

      // Assignee filter (Column H)
      if (filters.assignee !== 'all') {
        const taskAss = (task.assignee || (task.rawRow && task.rawRow[7]) || '').trim();
        if (taskAss !== filters.assignee) return false;
      }

      // Status filter
      if (filters.status !== 'all') {
        const completed = isTaskCompleted(task);
        if (filters.status === 'completed' && !completed) return false;
        if (filters.status === 'not_completed' && completed) return false;
        if (filters.status === 'in_progress' && (completed || task.progressPercentage === 0)) return false;
        if (filters.status === 'not_started' && (completed || task.progressPercentage > 0)) return false;
        if (filters.status === 'phase_completed' && !completedPhaseNames.has(task.mainPhase)) return false;
        if (filters.status === 'phase_uncompleted' && !uncompletedPhaseNames.has(task.mainPhase)) return false;
      }

      return true;
    });
  }, [tasksRaw, filters, completedPhaseNames, uncompletedPhaseNames]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Paginated tasks
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage) || 1;
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTasks.slice(start, start + itemsPerPage);
  }, [filteredTasks, currentPage, itemsPerPage]);

  // KPI Metrics (Calculated dynamically on current dataset or filtered tasks)
  const totalTasksCount = tasksRaw.length;
  const completedTasksCount = useMemo(() => tasksRaw.filter(isTaskCompleted).length, [tasksRaw]);
  const uncompletedTasksCount = totalTasksCount - completedTasksCount;
  const completedPhasesCount = completedPhaseNames.size;
  const uncompletedPhasesCount = uncompletedPhaseNames.size;

  // Filter cases in cases modal
  const filteredCasesInModal = useMemo(() => {
    return casesRaw.filter(c => {
      if (caseSearchQuery) {
        const q = caseSearchQuery.toLowerCase().trim();
        const matchesNum = c.caseNumber.includes(q);
        const matchesName = c.fileNameQ.toLowerCase().includes(q);
        const matchesPlaintiff = c.plaintiff.toLowerCase().includes(q);
        const matchesDefendant = c.defendant.toLowerCase().includes(q);
        const matchesCourt = c.court.toLowerCase().includes(q);
        if (!matchesNum && !matchesName && !matchesPlaintiff && !matchesDefendant && !matchesCourt) {
          return false;
        }
      }
      if (caseCourtFilter !== 'all' && c.court !== caseCourtFilter) {
        return false;
      }
      return true;
    });
  }, [casesRaw, caseSearchQuery, caseCourtFilter]);

  // Helper function to reset filters
  const handleReset = () => {
    setFilters({
      searchQuery: '',
      mainPhase: 'all',
      importance: 'all',
      assignee: 'all',
      status: 'all',
    });
  };

  // Status Badge Styling Helper
  const getStatusBadge = (progress: number, statusText: string, isComp?: boolean) => {
    if (isComp || progress === 100) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          مكتملة
        </span>
      );
    }
    if (progress > 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          جاري العمل ({progress}%)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
        <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
        لم تبدأ
      </span>
    );
  };

  // Importance Badge Styling Helper (Column D)
  const getImportanceBadge = (importance: string) => {
    const val = importance ? importance.trim() : '';
    if (val.includes('عالية جداً') || val.includes('حرجة') || val.includes('قصوى')) {
      return (
        <span className="px-2.5 py-1 rounded-md text-[11px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40">
          🔥 {val}
        </span>
      );
    }
    if (val.includes('عالية') || val.includes('مهمة')) {
      return (
        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-brand-primary/20 text-brand-primary border border-brand-primary/30">
          ⚡ {val}
        </span>
      );
    }
    if (val.includes('متوسطة')) {
      return (
        <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-sky-500/20 text-sky-300 border border-sky-500/30">
          {val}
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-md text-[11px] font-normal bg-slate-800 text-slate-300 border border-slate-700">
        {val || 'عادية'}
      </span>
    );
  };

  // Selected Phase details object for the modal
  const selectedPhaseDetail = useMemo(() => {
    if (!selectedPhaseName) return null;
    return phaseStats.find(p => p.name === selectedPhaseName) || null;
  }, [selectedPhaseName, phaseStats]);

  if (loading) {
    return (
      <div className="min-h-[450px] flex flex-col items-center justify-center p-12 bg-[#0A0D16] rounded-3xl border border-slate-800/80 shadow-2xl">
        <div className="relative w-16 h-16 mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-brand-primary/20 animate-ping" />
          <div className="absolute inset-0 rounded-full border-4 border-t-brand-primary border-r-transparent border-b-brand-primary border-l-transparent animate-spin" />
          <div className="absolute inset-2 bg-gradient-to-tr from-brand-primary to-amber-500 rounded-full opacity-80 flex items-center justify-center shadow-lg">
            <Gavel className="w-6 h-6 text-slate-950 animate-bounce" />
          </div>
        </div>
        <p className="text-lg font-bold text-slate-200">جاري تحميل وتحديث سجل القضايا والمهام والمراحل...</p>
        <p className="text-xs text-slate-400 mt-2">المزامنة التلقائية مع Google Sheets CSV جارٍ تنفيذها</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-rose-950/40 border border-rose-800/60 rounded-3xl text-center max-w-2xl mx-auto my-12 shadow-2xl backdrop-blur-md">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4 animate-pulse" />
        <h3 className="text-xl font-bold text-rose-200 mb-2">تعذر جلب بيانات المهام والقضايا</h3>
        <p className="text-sm text-rose-300 mb-6">{error}</p>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs transition-all shadow-lg hover:shadow-rose-600/30 flex items-center gap-2 mx-auto"
          >
            <RotateCcw className="w-4 h-4" /> إعادة المحاولة
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 text-right dir-rtl animate-fadeIn">
      
      {/* 1. Header Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-[#101626] via-[#0D1220] to-[#101626] border border-slate-800/80 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-brand-primary/20 to-amber-500/10 border border-brand-primary/30">
              <Gavel className="w-6 h-6 text-brand-primary" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                متابعة المهام والمراحل
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-primary/15 text-brand-primary font-outfit border border-brand-primary/30 font-semibold">
                  LIVE CSV
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                مزامنة وتتبع حي ومباشر للمراحل والمهام التنفيذية المربوطة بالسجل
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-3 w-full md:w-auto relative z-10">
          <button
            onClick={() => setShowCasesModal(true)}
            className="flex-1 md:flex-initial px-4 py-2.5 bg-gradient-to-r from-brand-primary to-amber-600 hover:from-brand-primary/90 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-brand-primary/20 hover:shadow-brand-primary/30 transition-all flex items-center justify-center gap-2 border border-brand-primary/40"
          >
            <Scale className="w-4 h-4" />
            دليل القضايا المرتبطة
            <span className="px-2 py-0.5 rounded-md bg-slate-950/20 text-slate-950 font-outfit font-black text-[11px]">
              {casesRaw.length}
            </span>
          </button>
        </div>
      </div>

      {/* 2. Interactive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* KPI 1: Completed Phases */}
        <div
          onClick={() => {
            setFilters(prev => ({
              ...prev,
              status: prev.status === 'phase_completed' ? 'all' : 'phase_completed'
            }));
          }}
          className={`p-5 rounded-2xl bg-gradient-to-br from-[#101626] to-[#0A0D16] border transition-all duration-300 cursor-pointer group shadow-lg relative overflow-hidden ${
            filters.status === 'phase_completed'
              ? 'border-brand-primary ring-2 ring-brand-primary/40 bg-brand-primary/5'
              : 'border-slate-800/80 hover:border-brand-primary/50 hover:shadow-brand-primary/10'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-300">المراحل المنجزة</span>
            <div className={`p-2.5 rounded-xl transition-all duration-300 ${
              filters.status === 'phase_completed' ? 'bg-brand-primary text-slate-950' : 'bg-brand-primary/10 text-brand-primary group-hover:bg-brand-primary group-hover:text-slate-950'
            }`}>
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-outfit">
              {completedPhasesCount} / {phaseStats.length}
            </span>
            <span className="text-xs font-bold text-emerald-400">
              ({phaseStats.length > 0 ? Math.round((completedPhasesCount / phaseStats.length) * 100) : 0}%)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
            <span>انقر لتصفية المراحل المكتملة 100%</span>
            <ChevronLeft className="w-3.5 h-3.5 text-brand-primary" />
          </p>
        </div>

        {/* KPI 2: Uncompleted Phases */}
        <div
          onClick={() => {
            setFilters(prev => ({
              ...prev,
              status: prev.status === 'phase_uncompleted' ? 'all' : 'phase_uncompleted'
            }));
          }}
          className={`p-5 rounded-2xl bg-gradient-to-br from-[#101626] to-[#0A0D16] border transition-all duration-300 cursor-pointer group shadow-lg relative overflow-hidden ${
            filters.status === 'phase_uncompleted'
              ? 'border-amber-500 ring-2 ring-amber-500/40 bg-amber-500/5'
              : 'border-slate-800/80 hover:border-amber-500/50 hover:shadow-amber-500/10'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-300">المراحل غير المنجزة</span>
            <div className={`p-2.5 rounded-xl transition-all duration-300 ${
              filters.status === 'phase_uncompleted' ? 'bg-amber-500 text-slate-950' : 'bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950'
            }`}>
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-outfit">
              {uncompletedPhasesCount} / {phaseStats.length}
            </span>
            <span className="text-xs font-bold text-amber-400">
              ({phaseStats.length > 0 ? Math.round((uncompletedPhasesCount / phaseStats.length) * 100) : 0}%)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
            <span>انقر لتصفية المراحل جاري العمل عليها</span>
            <ChevronLeft className="w-3.5 h-3.5 text-amber-400" />
          </p>
        </div>

        {/* KPI 3: Completed Tasks */}
        <div
          onClick={() => {
            setFilters(prev => ({
              ...prev,
              status: prev.status === 'completed' ? 'all' : 'completed'
            }));
          }}
          className={`p-5 rounded-2xl bg-gradient-to-br from-[#101626] to-[#0A0D16] border transition-all duration-300 cursor-pointer group shadow-lg relative overflow-hidden ${
            filters.status === 'completed'
              ? 'border-emerald-500 ring-2 ring-emerald-500/40 bg-emerald-500/5'
              : 'border-slate-800/80 hover:border-emerald-500/50 hover:shadow-emerald-500/10'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-300">المهام المكتملة</span>
            <div className={`p-2.5 rounded-xl transition-all duration-300 ${
              filters.status === 'completed' ? 'bg-emerald-500 text-slate-950' : 'bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950'
            }`}>
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-outfit">
              {completedTasksCount} / {totalTasksCount}
            </span>
            <span className="text-xs font-bold text-emerald-400">
              ({totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0}%)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
            <span>انقر لتصفية كافة المهام المكتملة</span>
            <ChevronLeft className="w-3.5 h-3.5 text-emerald-400" />
          </p>
        </div>

        {/* KPI 4: Uncompleted Tasks */}
        <div
          onClick={() => {
            setFilters(prev => ({
              ...prev,
              status: prev.status === 'not_completed' ? 'all' : 'not_completed'
            }));
          }}
          className={`p-5 rounded-2xl bg-gradient-to-br from-[#101626] to-[#0A0D16] border transition-all duration-300 cursor-pointer group shadow-lg relative overflow-hidden ${
            filters.status === 'not_completed'
              ? 'border-rose-500 ring-2 ring-rose-500/40 bg-rose-500/5'
              : 'border-slate-800/80 hover:border-rose-500/50 hover:shadow-rose-500/10'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-300">المهام غير المكتملة</span>
            <div className={`p-2.5 rounded-xl transition-all duration-300 ${
              filters.status === 'not_completed' ? 'bg-rose-500 text-white' : 'bg-rose-500/10 text-rose-400 group-hover:bg-rose-500 group-hover:text-white'
            }`}>
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-outfit">
              {uncompletedTasksCount} / {totalTasksCount}
            </span>
            <span className="text-xs font-bold text-rose-400">
              ({totalTasksCount > 0 ? Math.round((uncompletedTasksCount / totalTasksCount) * 100) : 0}%)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
            <span>انقر لتصفية المهام المعلقة والمعالجة</span>
            <ChevronLeft className="w-3.5 h-3.5 text-rose-400" />
          </p>
        </div>

      </div>

      {/* 3. Advanced Search & Filters Toolbar */}
      <div className="p-5 bg-[#101626] border border-slate-800/80 rounded-2xl space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-brand-primary" />
            <h3 className="text-sm font-bold text-white">تصفية وبحث تقدم المهام والمراحل</h3>
            {(filters.searchQuery || filters.mainPhase !== 'all' || filters.importance !== 'all' || filters.assignee !== 'all' || filters.status !== 'all') && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand-primary/20 text-brand-primary border border-brand-primary/30">
                فلتر نشط
              </span>
            )}
          </div>
          <button
            onClick={handleReset}
            className="text-xs text-slate-400 hover:text-brand-primary flex items-center gap-1 transition-colors px-2.5 py-1 rounded-lg hover:bg-slate-900 border border-slate-800"
          >
            <RotateCcw className="w-3.5 h-3.5" /> إعادة ضبط الفلاتر
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Quick Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
              placeholder="البحث السريع عن مهمة أو مرحلة..."
              className="w-full pl-3 pr-9 py-2 bg-[#0A0D16] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary transition-colors"
            />
          </div>

          {/* Main Phase Filter (Column A - المرحلة) */}
          <select
            value={filters.mainPhase}
            onChange={(e) => setFilters(prev => ({ ...prev, mainPhase: e.target.value }))}
            className="w-full px-3 py-2 bg-[#0A0D16] border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-brand-primary"
          >
            <option value="all">المرحلة الرئيسية - خانة A ({distinctPhases.length})</option>
            {distinctPhases.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          {/* Importance Filter (Column D - درجة الأهمية) */}
          <select
            value={filters.importance}
            onChange={(e) => setFilters(prev => ({ ...prev, importance: e.target.value }))}
            className="w-full px-3 py-2 bg-[#0A0D16] border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-brand-primary"
          >
            <option value="all">درجة الأهمية - خانة D ({distinctImportances.length})</option>
            {distinctImportances.map(imp => (
              <option key={imp} value={imp}>{imp}</option>
            ))}
          </select>

          {/* Assignee Filter (Column H - المسؤول عن المهمة) */}
          <select
            value={filters.assignee}
            onChange={(e) => setFilters(prev => ({ ...prev, assignee: e.target.value }))}
            className="w-full px-3 py-2 bg-[#0A0D16] border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-brand-primary"
          >
            <option value="all">المسؤول عن المهمة - خانة H ({distinctAssignees.length})</option>
            {distinctAssignees.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="w-full px-3 py-2 bg-[#0A0D16] border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-brand-primary"
          >
            <option value="all">حالة المهمة (الكل)</option>
            <option value="completed">المهام المكتملة (100%)</option>
            <option value="not_completed">المهام غير المكتملة</option>
            <option value="in_progress">جاري العمل عليها</option>
            <option value="not_started">لم تبدأ بعد</option>
            <option value="phase_completed">المراحل المنجزة بالكامل</option>
            <option value="phase_uncompleted">المراحل غير المنجزة</option>
          </select>

        </div>
      </div>

      {/* 4. Interactive Task Table (Ordered matching requested layout) */}
      <div className="bg-[#101626] border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
        
        {/* Table Top Header Info */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-primary" />
            <h3 className="text-sm font-bold text-white">جدول المهام والتنفيذ المستورد</h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300">
              {filteredTasks.length} مهمة
            </span>
          </div>

          <p className="text-xs text-slate-400 hidden sm:block">
            اضغط على اسم المرحلة لاستعراض كافة مهامها، أو انقر التفاصيل لمشاهدة البيانات الكاملة
          </p>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-[#0A0D16]/80 text-slate-400 text-xs font-bold border-b border-slate-800">
                <th className="p-3.5 pr-4">المرحلة (A)</th>
                <th className="p-3.5">اسم المهمة (B)</th>
                <th className="p-3.5">تاريخ انجاز المهمة (F)</th>
                <th className="p-3.5">نسبة انجاز المهمة (E)</th>
                <th className="p-3.5">الحالة (L)</th>
                <th className="p-3.5 text-center">التفاصيل المهمة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs text-slate-200">
              {paginatedTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500">
                    <Info className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    لا توجد مهام مطابقة للشروط أو الفلاتر المختارة.
                  </td>
                </tr>
              ) : (
                paginatedTasks.map((task) => {
                  const isComp = isTaskCompleted(task);
                  return (
                    <tr
                      key={task.id}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                    >
                      {/* Col 1: Phase ( خانة A ) - Clickable for Phase Modal */}
                      <td className="p-3.5 pr-4 font-bold max-w-[210px]">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPhaseName(task.mainPhase);
                          }}
                          className="text-right group-hover:text-brand-primary transition-colors hover:underline block"
                        >
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-bold text-xs">
                            <Layers className="w-3.5 h-3.5 text-brand-primary" />
                            {task.mainPhase || 'عام'}
                          </span>
                        </button>

                        {task.linkedCase && (
                          <div className="mt-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCase(task.linkedCase!);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-bold text-[10px] border border-amber-500/30 transition-colors"
                            >
                              <Gavel className="w-3 h-3 text-amber-400" />
                              قضية: {task.linkedCase.caseNumber || task.linkedCase.fileNameQ}
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Col 2: Task Name ( خانة B ) & Assignee */}
                      <td className="p-3.5 max-w-[240px]" onClick={() => setSelectedTask(task)}>
                        <div className="font-bold text-white group-hover:text-brand-primary transition-colors leading-snug">
                          {task.taskName}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-500" />
                            {task.assignee || 'غير محدد'}
                          </span>
                          {task.importance && (
                            <span className="text-[10px]">{getImportanceBadge(task.importance)}</span>
                          )}
                        </div>
                      </td>

                      {/* Col 3: Completion Date ( خانة F ) */}
                      <td className="p-3.5 whitespace-nowrap text-xs text-slate-300" onClick={() => setSelectedTask(task)}>
                        <div className="flex items-center gap-1.5 font-bold text-slate-200">
                          <Calendar className="w-3.5 h-3.5 text-brand-primary" />
                          <span>{task.endDate || task.startDate || '-'}</span>
                        </div>
                      </td>

                      {/* Col 4: Progress Percentage ( خانة E ) */}
                      <td className="p-3.5 whitespace-nowrap w-[150px]" onClick={() => setSelectedTask(task)}>
                        <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                          <span className="text-white">{isComp ? 100 : task.progressPercentage}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isComp
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                : task.progressPercentage > 0
                                ? 'bg-gradient-to-r from-brand-primary to-amber-500'
                                : 'bg-slate-700'
                            }`}
                            style={{ width: `${isComp ? 100 : task.progressPercentage}%` }}
                          />
                        </div>
                      </td>

                      {/* Col 5: Status ( خانة L ) */}
                      <td className="p-3.5 whitespace-nowrap" onClick={() => setSelectedTask(task)}>
                        {getStatusBadge(task.progressPercentage, task.status, isComp)}
                      </td>

                      {/* Col 6: Actions / Full Details */}
                      <td className="p-3.5 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTask(task);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-brand-primary hover:text-slate-950 text-slate-200 font-bold text-xs transition-all border border-slate-700 hover:border-brand-primary"
                        >
                          التفاصيل
                        </button>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between gap-4 bg-[#0A0D16]">
            <p className="text-xs text-slate-400">
              عرض {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredTasks.length)} من إجمالي {filteredTasks.length} مهمة
            </p>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-xs transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold font-outfit transition-colors ${
                    currentPage === pageNum
                      ? 'bg-brand-primary text-slate-950 shadow-md shadow-brand-primary/20'
                      : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-xs transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* 5. MODALS */}

      {/* MODAL A: Task Details Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#101626] border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto dir-rtl text-right space-y-6">
            
            <button
              onClick={() => setSelectedTask(null)}
              className="absolute top-5 left-5 p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-brand-primary font-bold">تفاصيل المهمة بالكامل</span>
                <h3 className="text-lg font-bold text-white mt-0.5">{selectedTask.taskName}</h3>
              </div>
            </div>

            {/* Grid details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              
              <div className="p-3.5 bg-[#0A0D16] border border-slate-800 rounded-xl space-y-1">
                <span className="text-slate-400 block">المرحلة الرئيسية (A)</span>
                <p className="font-bold text-slate-100">{selectedTask.mainPhase || 'عام'}</p>
              </div>

              <div className="p-3.5 bg-[#0A0D16] border border-slate-800 rounded-xl space-y-1">
                <span className="text-slate-400 block">المسؤول عن المهمة (H)</span>
                <p className="font-bold text-slate-100">{selectedTask.assignee || 'غير محدد'}</p>
              </div>

              <div className="p-3.5 bg-[#0A0D16] border border-slate-800 rounded-xl space-y-1">
                <span className="text-slate-400 block">درجة الأهمية (D)</span>
                <div>{getImportanceBadge(selectedTask.importance)}</div>
              </div>

              <div className="p-3.5 bg-[#0A0D16] border border-slate-800 rounded-xl space-y-1">
                <span className="text-slate-400 block">حالة الإنجاز والتقدم (E & L)</span>
                <div>{getStatusBadge(selectedTask.progressPercentage, selectedTask.status, isTaskCompleted(selectedTask))}</div>
              </div>

              <div className="p-3.5 bg-[#0A0D16] border border-slate-800 rounded-xl space-y-1">
                <span className="text-slate-400 block">تاريخ انجاز المهمة (F)</span>
                <p className="font-bold text-slate-100">{selectedTask.endDate || selectedTask.startDate || '-'}</p>
              </div>

              <div className="p-3.5 bg-[#0A0D16] border border-slate-800 rounded-xl space-y-1">
                <span className="text-slate-400 block">نسبة الإنجاز المحسوبة</span>
                <p className="font-bold text-emerald-400">{isTaskCompleted(selectedTask) ? '100%' : `${selectedTask.progressPercentage}%`}</p>
              </div>

            </div>

            {/* Linked Case Card (If exists) */}
            {selectedTask.linkedCase ? (
              <div className="p-4 bg-gradient-to-br from-amber-500/10 to-brand-primary/5 border border-brand-primary/30 rounded-2xl mb-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gavel className="w-5 h-5 text-brand-primary" />
                    <h4 className="text-sm font-bold text-white">بطاقة القضية المربوطة والمطابقة</h4>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCase(selectedTask.linkedCase!);
                      setSelectedTask(null);
                    }}
                    className="px-3 py-1 rounded-lg bg-brand-primary hover:bg-brand-primary/90 text-slate-950 font-bold text-xs transition-colors"
                  >
                    استعراض القضية بالكامل
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
                  <div>
                    <span className="text-slate-400 block text-[11px]">رقم القضية:</span>
                    <span className="font-bold text-white">{selectedTask.linkedCase.caseNumber || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">اسم الملف (Q):</span>
                    <span className="font-bold text-white">{selectedTask.linkedCase.fileNameQ || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">المحكمة والدائرة:</span>
                    <span className="font-bold text-white">{selectedTask.linkedCase.court} - {selectedTask.linkedCase.circuit}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">المدعي / المدعى عليه:</span>
                    <span className="font-bold text-white">{selectedTask.linkedCase.plaintiff} / {selectedTask.linkedCase.defendant}</span>
                  </div>
                </div>

                {selectedTask.linkedCase.driveLink && (
                  <a
                    href={selectedTask.linkedCase.driveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-500/20 text-sky-300 font-bold text-xs hover:bg-sky-500/30 border border-sky-500/30 transition-colors mt-2"
                  >
                    <FolderOpen className="w-4 h-4 text-sky-400" />
                    مجلد ملف القضية على Google Drive
                  </a>
                )}
              </div>
            ) : (
              <div className="p-3 bg-[#0A0D16] border border-slate-800/80 rounded-xl mb-6 text-slate-400 text-xs">
                لا توجد قضية مطابقة مباشرة لهذه المرحلة أو المهمة في شيت دليل القضايا.
              </div>
            )}

            {/* Notes */}
            {selectedTask.notes && (
              <div className="p-4 bg-[#0A0D16] border border-slate-800 rounded-2xl mb-6 space-y-1 text-xs">
                <span className="text-slate-400 font-bold">ملاحظات إضافية:</span>
                <p className="text-slate-200 leading-relaxed">{selectedTask.notes}</p>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedTask(null)}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors"
              >
                إغلاق
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL B: Single Phase Detail Modal (On clicking Phase cell A) */}
      {selectedPhaseDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#101626] border border-slate-800 rounded-3xl max-w-4xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto dir-rtl text-right space-y-6">
            
            <button
              onClick={() => setSelectedPhaseName(null)}
              className="absolute top-5 left-5 p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Phase Header */}
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-brand-primary font-bold">نافذة تفاصيل المرحلة الرئيسية</span>
                <h3 className="text-xl font-bold text-white mt-0.5">{selectedPhaseDetail.name}</h3>
              </div>
            </div>

            {/* Progress Card */}
            <div className="p-4 bg-[#0A0D16] border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-bold">نسبة إنجاز المهام الكلية للمرحلة:</span>
                <span className="font-extrabold text-brand-primary text-sm font-outfit">{selectedPhaseDetail.percent}%</span>
              </div>

              <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    selectedPhaseDetail.percent === 100
                      ? 'bg-emerald-500'
                      : selectedPhaseDetail.percent > 0
                      ? 'bg-brand-primary'
                      : 'bg-slate-700'
                  }`}
                  style={{ width: `${selectedPhaseDetail.percent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <span>إجمالي المهام المندرجية: {selectedPhaseDetail.total} مهمة</span>
                <span>المكتملة: {selectedPhaseDetail.completed} مهمة</span>
              </div>
            </div>

            {/* Linked Case if any */}
            {selectedPhaseDetail.linkedCase && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-amber-400 font-bold block">القضية المربوطة بهذه المرحلة:</span>
                  <p className="text-sm font-bold text-white mt-0.5">
                    #{selectedPhaseDetail.linkedCase.caseNumber} - {selectedPhaseDetail.linkedCase.fileNameQ}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedCase(selectedPhaseDetail.linkedCase!);
                    setSelectedPhaseName(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
                >
                  استعراض القضية
                </button>
              </div>
            )}

            {/* Phase Tasks Table */}
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-primary" /> قائمة المهام التابعة لهذه المرحلة ({selectedPhaseDetail.tasks.length})
              </h4>

              <div className="overflow-x-auto border border-slate-800 rounded-2xl">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-[#0A0D16] text-slate-400 font-bold border-b border-slate-800">
                      <th className="p-3">اسم المهمة (B)</th>
                      <th className="p-3">المسؤول (H)</th>
                      <th className="p-3">تاريخ الإنجاز (F)</th>
                      <th className="p-3">النسبة (E)</th>
                      <th className="p-3">الحالة (L)</th>
                      <th className="p-3 text-center">التفاصيل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {selectedPhaseDetail.tasks.map((task) => {
                      const isComp = isTaskCompleted(task);
                      return (
                        <tr key={task.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 font-bold text-white max-w-[220px]">{task.taskName}</td>
                          <td className="p-3 text-slate-300">{task.assignee || 'غير محدد'}</td>
                          <td className="p-3 text-slate-300">{task.endDate || task.startDate || '-'}</td>
                          <td className="p-3 font-bold text-emerald-400">{isComp ? 100 : task.progressPercentage}%</td>
                          <td className="p-3">{getStatusBadge(task.progressPercentage, task.status, isComp)}</td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => {
                                setSelectedTask(task);
                                setSelectedPhaseName(null);
                              }}
                              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-brand-primary hover:text-slate-950 text-slate-200 font-bold text-[11px] transition-colors"
                            >
                              عرض
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedPhaseName(null)}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors"
              >
                إغلاق النافذة
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL C: Case Detail Modal */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#101626] border border-slate-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto dir-rtl text-right space-y-6">
            
            <button
              onClick={() => setSelectedCase(null)}
              className="absolute top-5 left-5 p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Gavel className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-amber-400 font-bold">ملف قضية تفصيلي شامل</span>
                <h3 className="text-xl font-bold text-white mt-0.5">
                  رقم القضية: {selectedCase.caseNumber || 'غير مدون'} - {selectedCase.fileNameQ}
                </h3>
              </div>
            </div>

            {/* Main Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              
              <div className="p-3.5 bg-[#0A0D16] border border-slate-800 rounded-xl space-y-1">
                <span className="text-slate-400 block">المحكمة والدائرة</span>
                <p className="font-bold text-slate-100">{selectedCase.court || '-'} ({selectedCase.circuit || '-'})</p>
              </div>

              <div className="p-3.5 bg-[#0A0D16] border border-slate-800 rounded-xl space-y-1">
                <span className="text-slate-400 block">تصنيف ونوع القضية</span>
                <p className="font-bold text-slate-100">{selectedCase.classification || '-'} / {selectedCase.caseType || '-'}</p>
              </div>

              <div className="p-3.5 bg-[#0A0D16] border border-slate-800 rounded-xl space-y-1">
                <span className="text-slate-400 block">حالة القضية والمسؤول</span>
                <p className="font-bold text-slate-100">{selectedCase.caseStatus || '-'} ({selectedCase.caseManager || 'غير محدد'})</p>
              </div>

            </div>

            {/* Parties Info */}
            <div className="p-4 bg-[#0A0D16] border border-slate-800 rounded-2xl space-y-3 text-xs">
              <h4 className="font-bold text-brand-primary flex items-center gap-2">
                <User className="w-4 h-4" /> أطراف الدعوى والمدعين
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400 block">المدعي:</span>
                  <p className="font-bold text-white">{selectedCase.plaintiff || '-'}</p>
                  <p className="text-[11px] text-slate-500">هوية: {selectedCase.plaintiffId || '-'}</p>
                </div>
                <div>
                  <span className="text-slate-400 block">المدعى عليه:</span>
                  <p className="font-bold text-white">{selectedCase.defendant || '-'}</p>
                  <p className="text-[11px] text-slate-500">هوية: {selectedCase.defendantId || '-'}</p>
                </div>
              </div>
            </div>

            {/* Claims & Instrument */}
            <div className="space-y-3 text-xs">
              {selectedCase.claims && (
                <div className="p-4 bg-[#0A0D16] border border-slate-800 rounded-2xl space-y-1">
                  <span className="font-bold text-slate-400 block">طلبات الدعوى:</span>
                  <p className="text-slate-200">{selectedCase.claims}</p>
                </div>
              )}

              {selectedCase.instrumentDeed && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-1">
                  <span className="font-bold text-emerald-400 block">الصك والنتيجة النهائية:</span>
                  <p className="text-emerald-200 font-bold">{selectedCase.instrumentDeed}</p>
                </div>
              )}

              {selectedCase.notes && (
                <div className="p-4 bg-[#0A0D16] border border-slate-800 rounded-2xl space-y-1">
                  <span className="font-bold text-slate-400 block">ملاحظات القضية:</span>
                  <p className="text-slate-300">{selectedCase.notes}</p>
                </div>
              )}
            </div>

            {/* External Links & Actions */}
            <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-800">
              {selectedCase.driveLink ? (
                <a
                  href={selectedCase.driveLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-lg shadow-sky-500/20 flex items-center gap-2"
                >
                  <FolderOpen className="w-4 h-4" /> فتح مجلد Google Drive
                </a>
              ) : (
                <span className="text-xs text-slate-500">لا يوجد رابط Drive مرفق</span>
              )}

              <button
                onClick={() => setSelectedCase(null)}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors"
              >
                إغلاق النافذة
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL D: Cases List Directory Modal */}
      {showCasesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#101626] border border-slate-800 rounded-3xl max-w-4xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto dir-rtl text-right space-y-6">
            
            <button
              onClick={() => setShowCasesModal(false)}
              className="absolute top-5 left-5 p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Title */}
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                <Scale className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">دليل وسجل القضايا المربوطة الكامل</h3>
                <p className="text-xs text-slate-400 mt-0.5">تصفح شامل لجميع القضايا المسجلة في Google Sheets</p>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                <input
                  type="text"
                  value={caseSearchQuery}
                  onChange={(e) => setCaseSearchQuery(e.target.value)}
                  placeholder="البحث برقم القضية، اسم الملف Q، أطراف الدعوى..."
                  className="w-full pl-3 pr-9 py-2 bg-[#0A0D16] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary"
                />
              </div>

              <select
                value={caseCourtFilter}
                onChange={(e) => setCaseCourtFilter(e.target.value)}
                className="w-full px-3 py-2 bg-[#0A0D16] border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-brand-primary"
              >
                <option value="all">تصفية حسب المحكمة (الكل)</option>
                {distinctCourts.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Cases Table */}
            <div className="overflow-x-auto border border-slate-800 rounded-2xl">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-[#0A0D16] text-slate-400 font-bold border-b border-slate-800">
                    <th className="p-3">رقم القضية / اسم الملف Q</th>
                    <th className="p-3">المحكمة والدائرة</th>
                    <th className="p-3">المدعي / المدعى عليه</th>
                    <th className="p-3">حالة القضية</th>
                    <th className="p-3 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {filteredCasesInModal.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        لا توجد قضايا مطابقة لعملية البحث.
                      </td>
                    </tr>
                  ) : (
                    filteredCasesInModal.map((c, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-bold">
                          <span className="text-white block">{c.caseNumber || 'غير مدون'}</span>
                          <span className="text-[11px] text-amber-400">{c.fileNameQ}</span>
                        </td>
                        <td className="p-3">
                          <span className="block text-slate-200">{c.court || '-'}</span>
                          <span className="text-[11px] text-slate-400">{c.circuit || '-'}</span>
                        </td>
                        <td className="p-3">
                          <span className="block text-slate-200">المدعي: {c.plaintiff || '-'}</span>
                          <span className="text-[11px] text-slate-400">ضد: {c.defendant || '-'}</span>
                        </td>
                        <td className="p-3">
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                            {c.caseStatus || 'تحت النظر'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => {
                              setSelectedCase(c);
                              setShowCasesModal(false);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-brand-primary hover:bg-brand-primary/90 text-slate-950 font-bold text-xs transition-colors"
                          >
                            التفاصيل
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowCasesModal(false)}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors"
              >
                إغلاق النافذة
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
