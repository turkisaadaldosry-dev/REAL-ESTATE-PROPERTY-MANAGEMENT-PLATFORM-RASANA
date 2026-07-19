import React, { useState } from 'react';
import { 
  Building2, 
  LayoutDashboard, 
  ShieldCheck, 
  ShieldAlert, 
  Map, 
  Filter, 
  RotateCcw, 
  Search, 
  ExternalLink, 
  Scale, 
  Home, 
  X, 
  Maximize2, 
  Calendar, 
  Hash, 
  CreditCard, 
  MapPin, 
  FileDigit, 
  Grid, 
  Navigation, 
  Landmark, 
  StickyNote,
  ChevronLeft,
  ChevronRight,
  Info,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  FileText,
  Gavel,
  DollarSign,
  Briefcase
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { RentalContract, RentalFilterState } from '../types';

// Helper to parse dates safely to timestamp for ordering chronologically
const parseDateToTimestamp = (dateStr: string): number => {
  if (!dateStr) return 0;
  const cleanStr = dateStr.trim();
  
  // Try YYYY-MM-DD or YYYY/MM/DD
  let match = cleanStr.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (match) {
    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3])).getTime();
  }
  
  // Try DD/MM/YYYY or DD-MM-YYYY
  match = cleanStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (match) {
    return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1])).getTime();
  }

  const parsed = Date.parse(cleanStr);
  return isNaN(parsed) ? 0 : parsed;
};

interface RentalsSectionProps {
  rentalsRaw: RentalContract[];
  rentalFilters: RentalFilterState;
  setRentalFilters: React.Dispatch<React.SetStateAction<RentalFilterState>>;
  sortedRentals: RentalContract[];
  paginatedRentals: RentalContract[];
  currentRentalPage: number;
  setCurrentRentalPage: React.Dispatch<React.SetStateAction<number>>;
  totalRentalPages: number;
  rentalKpis: {
    totalContractsUnique: number;
    casesRaised: number;
    casesToBeRaised: number;
    totalCount: number;
  };
  rentalAnalyticsData: {
    cities: [string, { count: number; totalRent: number }][];
    urgency: {
      critical: number;
      warning: number;
      active_case: number;
      normal: number;
    };
  };
  rentalFilterOptions: {
    caseStatuses: string[];
    cities: string[];
    districts: string[];
  };
  handleResetRentalFilters: () => void;
  handleToggleRentalPillFilter: (key: keyof RentalFilterState, value: string) => void;
  formatArea: (area: string) => string;
  formatCurrency: (currency: string) => string;
  parseRemainingDays: (days: string) => number;
}

export default function RentalsSection({
  rentalsRaw,
  rentalFilters,
  setRentalFilters,
  sortedRentals,
  paginatedRentals,
  currentRentalPage,
  setCurrentRentalPage,
  totalRentalPages,
  rentalKpis,
  rentalAnalyticsData,
  rentalFilterOptions,
  handleResetRentalFilters,
  handleToggleRentalPillFilter,
  formatArea,
  formatCurrency,
  parseRemainingDays
}: RentalsSectionProps) {
  const [selectedRental, setSelectedRental] = useState<RentalContract | null>(null);

  return (
    <div>
      {/* KPI Widgets for Rentals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* Unique Rental Contracts KPI */}
        <div className="neu-flat p-6 rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden group border border-slate-800/80">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary opacity-5 rounded-full translate-x-8 -translate-y-8 group-hover:scale-125 transition-transform duration-300"></div>
          <div className="p-3 bg-amber-500/10 text-brand-primary rounded-2xl mb-3 shadow-inner">
            <FileSpreadsheetIcon className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold text-slate-400 mb-1">إجمالي عقود الإيجار (B)</span>
          <span className="text-4xl font-black text-white font-sans leading-none" dir="ltr">
            {rentalKpis.totalContractsUnique}
          </span>
          <span className="text-[10px] text-slate-500 mt-2">
            عقود فريدة غير متكررة
          </span>
        </div>

        {/* Cases Raised AF KPI */}
        <div className="neu-flat p-6 rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden group border border-slate-800/80">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500 opacity-5 rounded-full translate-x-8 -translate-y-8 group-hover:scale-125 transition-transform duration-300"></div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl mb-3 shadow-inner">
            <Gavel className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold text-slate-400 mb-1">قضايا مرفوعة (AF)</span>
          <span className="text-4xl font-black text-emerald-400 font-sans leading-none" dir="ltr">
            {rentalKpis.casesRaised}
          </span>
          <span className="text-[10px] text-slate-500 mt-2">
            قضايا نشطة ومسجلة نظامياً
          </span>
        </div>

        {/* Cases To Be Raised KPI */}
        <div className="neu-flat p-6 rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden group border border-slate-800/80 ring-1 ring-red-500/15">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500 opacity-5 rounded-full translate-x-8 -translate-y-8 group-hover:scale-125 transition-transform duration-300"></div>
          <div className="p-3 bg-red-500/10 text-brand-accent rounded-2xl mb-3 shadow-inner">
            <AlertTriangle className="w-6 h-6 animate-pulse text-brand-accent" />
          </div>
          <span className="text-xs font-bold text-slate-400 mb-1">قضايا يجب رفعها فوراً</span>
          <span className="text-4xl font-black text-brand-accent font-sans leading-none" dir="ltr">
            {rentalKpis.casesToBeRaised}
          </span>
          <span className="text-[10px] text-red-400 mt-2 font-bold flex items-center gap-1">
            مستحقة (M ≤ 0 وبدون قضية)
          </span>
        </div>

        {/* Active Under Monitoring Contracts */}
        <div className="neu-flat p-6 rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden group border border-slate-800/80">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500 opacity-5 rounded-full translate-x-8 -translate-y-8 group-hover:scale-125 transition-transform duration-300"></div>
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl mb-3 shadow-inner">
            <Calendar className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold text-slate-400 mb-1">عقود منتظمة ونشطة</span>
          <span className="text-4xl font-black text-purple-400 font-sans leading-none" dir="ltr">
            {rentalKpis.totalCount - rentalKpis.casesToBeRaised - rentalKpis.casesRaised}
          </span>
          <span className="text-[10px] text-slate-500 mt-2">
            مستندات تحت المتابعة المستمرة
          </span>
        </div>

      </div>

      {/* Filters Section */}
      <div className="neu-flat p-6 sm:p-8 rounded-2xl mb-8 border border-slate-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5 text-brand-primary">
            <div className="p-2.5 neu-pressed rounded-full border border-brand-primary/10">
              <Filter className="w-5 h-5 text-brand-primary" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white">تصفية وبحث معلومات عقود الإيجار</h3>
              <p className="text-xs text-slate-400">ابحث برقم السجل، اسم المستأجر، المدينة، أو حالة القضية بشكل فوري</p>
            </div>
          </div>
          
          <button 
            onClick={handleResetRentalFilters} 
            className="neu-btn px-4 py-2 rounded-xl text-brand-accent font-extrabold text-xs flex items-center gap-2 border border-slate-800 hover:border-red-900/40 transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> مسح جميع الفلاتر
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* Contract ID Search */}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2 mr-1">رقم سجل العقد (B)</label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500">
                <Search className="w-4 h-4" />
              </span>
              <input 
                type="text"
                value={rentalFilters.contractId}
                onChange={(e) => setRentalFilters(prev => ({ ...prev, contractId: e.target.value }))}
                className="w-full neu-pressed p-3 pr-10 rounded-xl outline-none focus:ring-1 focus:ring-brand-primary text-white font-bold text-sm placeholder-slate-600 font-sans bg-[#0E131F]"
                placeholder="ابحث برقم السجل..."
                dir="rtl"
              />
            </div>
          </div>

          {/* Tenant Name Search */}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2 mr-1">اسم المستأجر (F)</label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500">
                <Search className="w-4 h-4" />
              </span>
              <input 
                type="text"
                value={rentalFilters.tenantName}
                onChange={(e) => setRentalFilters(prev => ({ ...prev, tenantName: e.target.value }))}
                className="w-full neu-pressed p-3 pr-10 rounded-xl outline-none focus:ring-1 focus:ring-brand-primary text-white font-bold text-sm placeholder-slate-600 bg-[#0E131F]"
                placeholder="ابحث باسم المستأجر..."
                dir="rtl"
              />
            </div>
          </div>

          {/* Unified ID Search */}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2 mr-1">الرقم الموحد (G)</label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500">
                <Search className="w-4 h-4" />
              </span>
              <input 
                type="text"
                value={rentalFilters.unifiedId}
                onChange={(e) => setRentalFilters(prev => ({ ...prev, unifiedId: e.target.value }))}
                className="w-full neu-pressed p-3 pr-10 rounded-xl outline-none focus:ring-1 focus:ring-brand-primary text-white font-bold text-sm placeholder-slate-600 font-sans bg-[#0E131F]"
                placeholder="ابحث بالرقم الموحد..."
                dir="rtl"
              />
            </div>
          </div>

          {/* Property Number Search */}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2 mr-1">رقم العقار (N)</label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500">
                <Search className="w-4 h-4" />
              </span>
              <input 
                type="text"
                value={rentalFilters.propNum}
                onChange={(e) => setRentalFilters(prev => ({ ...prev, propNum: e.target.value }))}
                className="w-full neu-pressed p-3 pr-10 rounded-xl outline-none focus:ring-1 focus:ring-brand-primary text-white font-bold text-sm placeholder-slate-600 font-sans bg-[#0E131F]"
                placeholder="ابحث برقم العقار..."
                dir="rtl"
              />
            </div>
          </div>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mt-5">
          
          {/* City Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2 mr-1">المدينة (U)</label>
            <div className="relative">
              <select 
                value={rentalFilters.city}
                onChange={(e) => setRentalFilters(prev => ({ ...prev, city: e.target.value, district: 'all' }))}
                className="w-full neu-pressed p-3 rounded-xl outline-none focus:ring-1 focus:ring-brand-primary appearance-none text-slate-200 font-bold text-sm bg-[#0E131F]"
              >
                <option value="all" className="bg-[#0E131F]">جميع المدن</option>
                {rentalFilterOptions.cities.map(city => (
                  <option key={city} value={city} className="bg-[#0E131F]">{city}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-3 text-slate-400">
                <ChevronLeft className="w-4 h-4 transform -rotate-90" />
              </div>
            </div>
          </div>

          {/* District Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2 mr-1">الحي (T)</label>
            <div className="relative">
              <select 
                value={rentalFilters.district}
                onChange={(e) => setRentalFilters(prev => ({ ...prev, district: e.target.value }))}
                className="w-full neu-pressed p-3 rounded-xl outline-none focus:ring-1 focus:ring-brand-primary appearance-none text-slate-200 font-bold text-sm bg-[#0E131F]"
              >
                <option value="all" className="bg-[#0E131F]">جميع الأحياء</option>
                {rentalFilterOptions.districts.map(dist => (
                  <option key={dist} value={dist} className="bg-[#0E131F]">{dist}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-3 text-slate-400">
                <ChevronLeft className="w-4 h-4 transform -rotate-90" />
              </div>
            </div>
          </div>

          {/* Case Status Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2 mr-1">حالة القضية (AG)</label>
            <div className="relative">
              <select 
                value={rentalFilters.caseStatus}
                onChange={(e) => setRentalFilters(prev => ({ ...prev, caseStatus: e.target.value }))}
                className="w-full neu-pressed p-3 rounded-xl outline-none focus:ring-1 focus:ring-brand-primary appearance-none text-slate-200 font-bold text-sm bg-[#0E131F]"
              >
                <option value="all" className="bg-[#0E131F]">جميع الحالات</option>
                {rentalFilterOptions.caseStatuses.map(status => (
                  <option key={status} value={status} className="bg-[#0E131F]">{status}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-3 text-slate-400">
                <ChevronLeft className="w-4 h-4 transform -rotate-90" />
              </div>
            </div>
          </div>

          {/* Lawsuit Raised Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2 mr-1">هل تم رفع دعوى قضائية؟</label>
            <div className="relative">
              <select 
                value={rentalFilters.lawsuitRaised}
                onChange={(e) => setRentalFilters(prev => ({ ...prev, lawsuitRaised: e.target.value }))}
                className="w-full neu-pressed p-3 rounded-xl outline-none focus:ring-1 focus:ring-brand-primary appearance-none text-slate-200 font-bold text-sm bg-[#0E131F]"
              >
                <option value="all" className="bg-[#0E131F]">الكل</option>
                <option value="yes" className="bg-[#0E131F] text-emerald-400">نعم (تم الرفع)</option>
                <option value="no" className="bg-[#0E131F] text-red-400">لا (لم يتم الرفع بعد)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-3 text-slate-400">
                <ChevronLeft className="w-4 h-4 transform -rotate-90" />
              </div>
            </div>
          </div>

        </div>

        {/* Third Row of Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
          
          {/* Case ID Search */}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2 mr-1">رقم القضية (AF)</label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500">
                <Gavel className="w-4 h-4" />
              </span>
              <input 
                type="text"
                value={rentalFilters.caseId}
                onChange={(e) => setRentalFilters(prev => ({ ...prev, caseId: e.target.value }))}
                className="w-full neu-pressed p-3 pr-10 rounded-xl outline-none focus:ring-1 focus:ring-brand-primary text-white font-bold text-sm placeholder-slate-600 font-sans bg-[#0E131F]"
                placeholder="ابحث برقم القضية في المحكمة..."
                dir="rtl"
              />
            </div>
          </div>

          {/* Area Search */}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2 mr-1">المساحة م² (Q)</label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500">
                <Maximize2 className="w-4 h-4" />
              </span>
              <input 
                type="text"
                value={rentalFilters.area}
                onChange={(e) => setRentalFilters(prev => ({ ...prev, area: e.target.value }))}
                className="w-full neu-pressed p-3 pr-10 rounded-xl outline-none focus:ring-1 focus:ring-brand-primary text-white font-bold text-sm placeholder-slate-600 font-sans bg-[#0E131F]"
                placeholder="ابحث بالمساحة..."
                dir="rtl"
              />
            </div>
          </div>

          {/* Urgency Quick Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2 mr-1">تصفية حسب الاستحقاق والخطورة</label>
            <div className="relative">
              <select 
                value={rentalFilters.urgency}
                onChange={(e) => setRentalFilters(prev => ({ ...prev, urgency: e.target.value }))}
                className="w-full neu-pressed p-3 rounded-xl outline-none focus:ring-1 focus:ring-brand-primary appearance-none text-slate-200 font-bold text-sm bg-[#0E131F]"
              >
                <option value="all" className="bg-[#0E131F]">جميع مستويات الخطورة</option>
                <option value="critical" className="bg-[#0E131F] text-brand-accent">حرجة جداً (استحقاق متأخر M ≤ 0 وبدون قضية)</option>
                <option value="warning" className="bg-[#0E131F] text-amber-400">مستعجلة (استحقاق قريب M ≤ 15 وبدون قضية)</option>
                <option value="active_case" className="bg-[#0E131F] text-emerald-400">دعاوي مرفوعة قيد النظر</option>
                <option value="normal" className="bg-[#0E131F] text-purple-400">عقود منتظمة وآمنة (&gt; 15 يوم)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-3 text-slate-400">
                <ChevronLeft className="w-4 h-4 transform -rotate-90" />
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Interactive Analytics Section (Click to Filter) */}
      <div className="neu-flat p-6 sm:p-8 rounded-2xl mb-8 border border-slate-800">
        <div className="flex items-center gap-2.5 mb-6 text-brand-primary">
          <div className="p-2 neu-pressed rounded-full border border-brand-primary/10">
            <Map className="w-5 h-5 text-brand-primary" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-white">تحليلات تفاعلية لعقود الإيجار (اضغط للفلترة السريعة)</h3>
            <p className="text-xs text-slate-400">انقر على أي مؤشر أو مدينة للتصفية الفورية وبشكل تلقائي</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Urgency Status Distribution */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 mb-3.5 border-b border-slate-800 pb-2 flex justify-between items-center">
              <span>حالة استحقاق عقود الإيجار والخطورة القانونية</span>
              <span className="text-[9px] bg-amber-500/10 text-brand-primary px-1.5 py-0.5 rounded">
                المجموع المستحق
              </span>
            </h4>
            <div className="flex flex-col gap-2.5">
              
              {/* Critical Button */}
              <button
                onClick={() => handleToggleRentalPillFilter('urgency', 'critical')}
                className={`w-full flex justify-between items-center p-3 rounded-xl transition-all ${
                  rentalFilters.urgency === 'critical' 
                    ? 'bg-red-500/15 border border-red-500/40 text-brand-accent' 
                    : 'bg-[#0E131F] hover:bg-red-950/20 text-slate-300 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                  <span className="text-xs font-bold">عقود متأخرة لم ترفع بها قضية (حرجة جداً)</span>
                </div>
                <span className="font-sans font-black bg-red-950/50 text-brand-accent px-2.5 py-0.5 rounded-lg text-xs">
                  {rentalAnalyticsData.urgency.critical}
                </span>
              </button>

              {/* Warning Button */}
              <button
                onClick={() => handleToggleRentalPillFilter('urgency', 'warning')}
                className={`w-full flex justify-between items-center p-3 rounded-xl transition-all ${
                  rentalFilters.urgency === 'warning' 
                    ? 'bg-amber-500/15 border border-amber-500/40 text-amber-400' 
                    : 'bg-[#0E131F] hover:bg-amber-950/20 text-slate-300 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                  <span className="text-xs font-bold">عقود قاربت على الاستحقاق (أقل من ١٥ يوم)</span>
                </div>
                <span className="font-sans font-black bg-amber-950/50 text-amber-400 px-2.5 py-0.5 rounded-lg text-xs">
                  {rentalAnalyticsData.urgency.warning}
                </span>
              </button>

              {/* Active Cases Button */}
              <button
                onClick={() => handleToggleRentalPillFilter('urgency', 'active_case')}
                className={`w-full flex justify-between items-center p-3 rounded-xl transition-all ${
                  rentalFilters.urgency === 'active_case' 
                    ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400' 
                    : 'bg-[#0E131F] hover:bg-slate-900 text-slate-300 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  <span className="text-xs font-bold">دعاوي مرفوعة حالياً في المحاكم</span>
                </div>
                <span className="font-sans font-black bg-emerald-950/50 text-emerald-400 px-2.5 py-0.5 rounded-lg text-xs">
                  {rentalAnalyticsData.urgency.active_case}
                </span>
              </button>

              {/* Normal Button */}
              <button
                onClick={() => handleToggleRentalPillFilter('urgency', 'normal')}
                className={`w-full flex justify-between items-center p-3 rounded-xl transition-all ${
                  rentalFilters.urgency === 'normal' 
                    ? 'bg-purple-500/15 border border-purple-500/40 text-purple-400' 
                    : 'bg-[#0E131F] hover:bg-slate-900 text-slate-300 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-purple-500"></span>
                  <span className="text-xs font-bold">عقود منتظمة آمنة ومستقرة</span>
                </div>
                <span className="font-sans font-black bg-purple-950/50 text-purple-400 px-2.5 py-0.5 rounded-lg text-xs">
                  {rentalAnalyticsData.urgency.normal}
                </span>
              </button>

            </div>
          </div>

          {/* City & Finance Analytics */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 mb-3.5 border-b border-slate-800 pb-2 flex justify-between items-center">
              <span>توزيع العقود ومبالغ الإيجار حسب المدن</span>
              <span className="text-[9px] bg-purple-500/15 text-purple-400 px-1.5 py-0.5 rounded font-sans">
                {rentalAnalyticsData.cities.length} مدينة نشطة
              </span>
            </h4>
            <div className="flex flex-wrap gap-2 max-h-[220px] overflow-y-auto pr-1">
              {rentalAnalyticsData.cities.map(([city, data]) => {
                const isActive = rentalFilters.city === city;
                return (
                  <button
                    key={city}
                    onClick={() => handleToggleRentalPillFilter('city', city)}
                    className={`analytics-pill text-xs flex flex-col items-start gap-1 p-3 rounded-xl min-w-[130px] border text-right transition-all ${
                      isActive 
                        ? 'bg-brand-primary/10 border-brand-primary text-brand-primary' 
                        : 'bg-[#0E131F] border-slate-800/60 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <span className="font-black text-sm text-white">{city}</span>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-sans mt-0.5">
                      <span>{data.count} عقود</span>
                      <span className="text-slate-600">|</span>
                      <span className="text-brand-primary font-bold">{formatCurrency(data.totalRent.toString())}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* Results Table & Pagination */}
      <div className="neu-flat p-6 rounded-2xl mb-8 border border-slate-800">
        
        {/* Header Title with Counts */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-6 bg-brand-primary rounded-full shadow-lg shadow-brand-primary/20"></div>
            <h3 className="text-lg font-extrabold text-white">جدول تفصيلي لعقود الإيجار والمستأجرين</h3>
            <span className="bg-brand-primary/10 text-brand-primary border border-brand-primary/20 text-xs font-black px-3 py-1 rounded-full font-sans">
              {sortedRentals.length} مستند مطابق
            </span>
          </div>
          
          <p className="text-xs text-slate-400 font-bold">
            ترتيب تلقائي: الأولوية للأكثر خطورة واستحقاقاً لرفع الدعوى القانونية
          </p>
        </div>

        {/* Main Responsive Table wrapper */}
        <div className="overflow-x-auto neu-pressed p-2 rounded-2xl mb-6 border border-slate-900">
          <table className="w-full text-right border-collapse whitespace-nowrap text-sm">
            <thead className="sticky top-0 bg-[#121926] z-10">
              <tr className="text-brand-primary border-b border-slate-800">
                <th className="py-4 px-5 font-extrabold text-brand-primary">رقم سجل العقد (B)</th>
                <th className="py-4 px-5 font-extrabold text-slate-300">المستأجر (F)</th>
                <th className="py-4 px-5 font-extrabold text-slate-300">القيمة السنوية (H)</th>
                <th className="py-4 px-5 font-extrabold text-center text-slate-300">إجمالي الدفعات (J)</th>
                <th className="py-4 px-5 font-extrabold text-center text-slate-300">الدفعة (K)</th>
                <th className="py-4 px-5 font-extrabold text-center text-slate-300">تاريخ الاستحقاق (L)</th>
                <th className="py-4 px-5 font-extrabold text-center text-slate-300">المتبقي على الاستحقاق (M)</th>
                <th className="py-4 px-5 font-extrabold text-center text-slate-300">دعاوى وقضايا (AF)</th>
                <th className="py-4 px-5 font-extrabold text-center text-slate-300">مستند العقد</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-800/40">
              {paginatedRentals.map((item, idx) => {
                const days = parseRemainingDays(item.dueRemainingDays);
                const hasCase = !!item.caseId && item.caseId.trim() !== '';
                const isCritical = days <= 0 && !hasCase;
                const isWarning = days > 0 && days <= 15 && !hasCase;

                // Urgency-based background highlight
                let rowBgClass = "hover:bg-[#1C2538]";
                let daysTextClass = "text-slate-300 font-bold";
                let daysBadge = null;

                if (isCritical) {
                  rowBgClass = "bg-red-950/15 hover:bg-red-950/25 border-r-2 border-red-500";
                  daysTextClass = "text-red-400 font-black animate-pulse";
                  daysBadge = (
                    <span className="bg-red-500/10 text-brand-accent border border-red-500/20 text-[10px] px-1.5 py-0.5 rounded font-black mr-2 animate-bounce">
                      مستحق الرفع فوراُ ⚖️
                    </span>
                  );
                } else if (isWarning) {
                  rowBgClass = "bg-amber-950/10 hover:bg-amber-950/20 border-r-2 border-amber-500";
                  daysTextClass = "text-amber-400 font-bold";
                  daysBadge = (
                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] px-1.5 py-0.5 rounded font-bold mr-2">
                      عاجل
                    </span>
                  );
                }

                return (
                  <tr 
                    key={idx}
                    onClick={() => setSelectedRental(item)}
                    className={`${rowBgClass} transition-all duration-150 cursor-pointer group`}
                  >
                    {/* Contract ID */}
                    <td className="py-4 px-5 font-black text-brand-primary font-sans text-right transition-transform group-hover:translate-x-1" dir="ltr">
                      {item.contractId || '-'}
                    </td>

                    {/* Tenant Name */}
                    <td className="py-4 px-5 font-bold text-slate-200">
                      <div className="max-w-[200px] truncate" title={item.tenantName}>
                        {item.tenantName || '-'}
                      </div>
                    </td>

                    {/* Annual Rent */}
                    <td className="py-4 px-5 font-bold text-slate-300 font-sans" dir="rtl">
                      {formatCurrency(item.annualRent)}
                    </td>

                    {/* Total Payments */}
                    <td className="py-4 px-5 font-bold text-slate-400 font-sans text-center">
                      {item.totalPayments || '-'}
                    </td>

                    {/* Payment Term (K) */}
                    <td className="py-4 px-5 font-bold text-slate-300 text-center font-sans">
                      {item.paymentTerm || '-'}
                    </td>

                    {/* Due Date */}
                    <td className="py-4 px-5 font-bold text-slate-300 font-sans text-center" dir="ltr">
                      {item.dueDate || '-'}
                    </td>

                    {/* Remaining Days */}
                    <td className="py-4 px-5 text-center">
                      <div className="flex items-center justify-center">
                        <span className={`${daysTextClass} font-sans`} dir="ltr">
                          {item.dueRemainingDays || '0'}
                        </span>
                        {daysBadge}
                      </div>
                    </td>

                    {/* Lawsuit Action Indicator */}
                    <td className="py-4 px-5 text-center">
                      {hasCase ? (
                        <div className="flex flex-col items-center justify-center">
                          <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> قضية {item.caseId}
                          </span>
                          {item.caseStatus && (
                            <span className="text-[10px] text-slate-400 mt-1 font-bold">({item.caseStatus})</span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          {isCritical ? (
                            <span className="bg-red-500/10 text-brand-accent border border-red-500/20 text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 animate-pulse" /> يجب رفع دعوى
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500 font-bold">لا يوجد قضية</span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Rental link check */}
                    <td className="py-4 px-5 text-center">
                      {item.rentalLink ? (
                        <a 
                          href={item.rentalLink} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 bg-amber-500/10 text-brand-primary rounded-lg inline-flex items-center justify-center border border-brand-primary/20 hover:bg-brand-primary hover:text-black transition-all"
                          title="تحميل وثيقة عقد الإيجار"
                        >
                          <FileText className="w-4 h-4" />
                        </a>
                      ) : (
                        <span className="text-xs text-slate-600 font-semibold">-</span>
                      )}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Section */}
        {totalRentalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-800">
            <span className="text-xs font-bold text-slate-400">
              استعراض الصفحة <strong className="text-white font-sans">{currentRentalPage}</strong> من أصل <strong className="text-white font-sans">{totalRentalPages}</strong> صفحة
            </span>
            
            <div className="flex items-center gap-3">
              {/* Previous Button */}
              <button
                disabled={currentRentalPage === 1}
                onClick={() => setCurrentRentalPage(prev => Math.max(prev - 1, 1))}
                className={`neu-btn p-2 rounded-xl text-brand-primary ${currentRentalPage === 1 ? 'opacity-35 cursor-not-allowed' : ''}`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Dynamic Page pills */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalRentalPages) }, (_, i) => {
                  let pageNum = currentRentalPage - 2 + i;
                  if (pageNum < 1) pageNum = i + 1;
                  if (pageNum > totalRentalPages) return null;

                  const isCurrent = pageNum === currentRentalPage;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentRentalPage(pageNum)}
                      className={`w-9 h-9 flex items-center justify-center font-sans font-black text-xs rounded-xl border transition-all ${
                        isCurrent 
                          ? 'bg-brand-primary text-black border-brand-primary shadow-[0_0_12px_rgba(212,157,47,0.25)]' 
                          : 'neu-btn text-slate-300 border-slate-800/60'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              {/* Next Button */}
              <button
                disabled={currentRentalPage === totalRentalPages}
                onClick={() => setCurrentRentalPage(prev => Math.min(prev + 1, totalRentalPages))}
                className={`neu-btn p-2 rounded-xl text-brand-primary ${currentRentalPage === totalRentalPages ? 'opacity-35 cursor-not-allowed' : ''}`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Details Modal for selected Rental Contract */}
      <AnimatePresence>
        {selectedRental && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Modal Backdrop overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRental(null)}
              className="absolute inset-0 bg-[#0B0E17]/85 backdrop-blur-md"
            ></motion.div>

            {/* Modal Body */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="neu-flat w-full max-w-4xl max-h-[90vh] flex flex-col p-6 sm:p-8 overflow-hidden relative z-10 border border-slate-800"
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/10 text-brand-primary rounded-xl shadow-sm">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">التفاصيل الشاملة والبيانات الفنية لعقد الإيجار</h3>
                    <p className="text-xs text-brand-primary mt-0.5 font-sans">
                      منصة رصانة لإدارة الأصول ومتابعة الذمم وعقود الاستئجار
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedRental(null)}
                  className="neu-btn p-2 rounded-full text-brand-accent hover:bg-red-950/40 hover:text-red-500 transition-colors border border-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrolling Content */}
              <div className="overflow-y-auto pr-1 flex-1 custom-scrollbar">
                
                {/* 21 fields rendered beautifully in grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  
                  {/* B: contractId */}
                  <div className="neu-pressed p-4 rounded-xl flex items-center gap-3 border border-slate-800/40">
                    <div className="p-2.5 bg-slate-900 rounded-lg text-brand-primary shadow-inner">
                      <Hash className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500">رقم سجل العقد</span>
                      <span className="font-extrabold text-slate-200 text-sm font-sans" dir="ltr">{selectedRental.contractId || '-'}</span>
                    </div>
                  </div>

                  {/* F: tenantName */}
                  <div className="neu-pressed p-4 rounded-xl flex items-center gap-3 border border-slate-800/40">
                    <div className="p-2.5 bg-slate-900 rounded-lg text-brand-primary shadow-inner">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500">اسم المستأجر</span>
                      <span className="font-extrabold text-slate-200 text-sm">{selectedRental.tenantName || '-'}</span>
                    </div>
                  </div>

                  {/* G: unifiedId */}
                  <div className="neu-pressed p-4 rounded-xl flex items-center gap-3 border border-slate-800/40">
                    <div className="p-2.5 bg-slate-900 rounded-lg text-brand-primary shadow-inner">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500">الرقم الموحد للجهة</span>
                      <span className="font-extrabold text-slate-200 text-sm font-sans" dir="ltr">{selectedRental.unifiedId || '-'}</span>
                    </div>
                  </div>

                  {/* H: annualRent */}
                  <div className="neu-pressed p-4 rounded-xl flex items-center gap-3 border border-slate-800/40">
                    <div className="p-2.5 bg-slate-900 rounded-lg text-brand-primary shadow-inner">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500">القيمة السنوية للإيجار</span>
                      <span className="font-extrabold text-brand-primary text-sm font-sans" dir="rtl">{formatCurrency(selectedRental.annualRent)}</span>
                    </div>
                  </div>

                  {/* J: totalPayments */}
                  <div className="neu-pressed p-4 rounded-xl flex items-center gap-3 border border-slate-800/40">
                    <div className="p-2.5 bg-slate-900 rounded-lg text-brand-primary shadow-inner">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500">إجمالي الدفعات</span>
                      <span className="font-extrabold text-slate-200 text-sm font-sans">{selectedRental.totalPayments || '-'}</span>
                    </div>
                  </div>

                  {/* L: dueDate */}
                  <div className="neu-pressed p-4 rounded-xl flex items-center gap-3 border border-slate-800/40">
                    <div className="p-2.5 bg-slate-900 rounded-lg text-brand-primary shadow-inner">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500">تاريخ الاستحقاق</span>
                      <span className="font-extrabold text-slate-200 text-sm font-sans" dir="ltr">{selectedRental.dueDate || '-'}</span>
                    </div>
                  </div>

                  {/* M: dueRemainingDays */}
                  <div className="neu-pressed p-4 rounded-xl flex items-center gap-3 border border-slate-800/40">
                    <div className="p-2.5 bg-slate-900 rounded-lg text-brand-primary shadow-inner">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500">المتبقي على الاستحقاق</span>
                      <span className={`font-black text-sm font-sans ${parseRemainingDays(selectedRental.dueRemainingDays) <= 0 ? 'text-brand-accent animate-pulse' : 'text-slate-200'}`} dir="ltr">
                        {selectedRental.dueRemainingDays || '0'} يوم
                      </span>
                    </div>
                  </div>

                  {/* C: startDate */}
                  <div className="neu-pressed p-4 rounded-xl flex items-center gap-3 border border-slate-800/40">
                    <div className="p-2.5 bg-slate-900 rounded-lg text-brand-primary shadow-inner">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500">تاريخ بداية مدة الإيجار</span>
                      <span className="font-extrabold text-slate-200 text-sm font-sans" dir="ltr">{selectedRental.startDate || '-'}</span>
                    </div>
                  </div>

                  {/* D: endDate */}
                  <div className="neu-pressed p-4 rounded-xl flex items-center gap-3 border border-slate-800/40">
                    <div className="p-2.5 bg-slate-900 rounded-lg text-brand-primary shadow-inner">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500">تاريخ نهاية مدة الإيجار</span>
                      <span className="font-extrabold text-slate-200 text-sm font-sans" dir="ltr">{selectedRental.endDate || '-'}</span>
                    </div>
                  </div>

                  {/* E: remainingDays */}
                  <div className="neu-pressed p-4 rounded-xl flex items-center gap-3 border border-slate-800/40">
                    <div className="p-2.5 bg-slate-900 rounded-lg text-brand-primary shadow-inner">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500">المتبقي على انتهاء العقد</span>
                      <span className="font-extrabold text-slate-200 text-sm font-sans" dir="ltr">{selectedRental.remainingDays || '-'}</span>
                    </div>
                  </div>

                  {/* N: propNum */}
                  <div className="neu-pressed p-4 rounded-xl flex items-center gap-3 border border-slate-800/40">
                    <div className="p-2.5 bg-slate-900 rounded-lg text-brand-primary shadow-inner">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500">رقم العقار الرسمي</span>
                      <span className="font-extrabold text-brand-primary text-sm font-sans" dir="ltr">{selectedRental.propNum || '-'}</span>
                    </div>
                  </div>

                  {/* O: docNum */}
                  <div className="neu-pressed p-4 rounded-xl flex items-center gap-3 border border-slate-800/40">
                    <div className="p-2.5 bg-slate-900 rounded-lg text-brand-primary shadow-inner">
                      <FileDigit className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500">رقم الصك / الوثيقة</span>
                      <span className="font-extrabold text-slate-200 text-sm font-sans" dir="ltr">{selectedRental.docNum || '-'}</span>
                    </div>
                  </div>

                  {/* Q: area */}
                  <div className="neu-pressed p-4 rounded-xl flex items-center gap-3 border border-slate-800/40">
                    <div className="p-2.5 bg-slate-900 rounded-lg text-brand-primary shadow-inner">
                      <Maximize2 className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500">المساحة الإجمالية</span>
                      <span className="font-extrabold text-slate-200 text-sm font-sans">{formatArea(selectedRental.area)} م²</span>
                    </div>
                  </div>

                  {/* U: city - T: district */}
                  <div className="neu-pressed p-4 rounded-xl flex items-center gap-3 border border-slate-800/40">
                    <div className="p-2.5 bg-slate-900 rounded-lg text-brand-primary shadow-inner">
                      <Navigation className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500">العنوان الجغرافي</span>
                      <span className="font-extrabold text-slate-200 text-sm">
                        {[selectedRental.city, selectedRental.district].filter(Boolean).join(' - ') || '-'}
                      </span>
                    </div>
                  </div>

                  {/* Y: ownership */}
                  <div className="neu-pressed p-4 rounded-xl flex items-center gap-3 border border-slate-800/40">
                    <div className="p-2.5 bg-slate-900 rounded-lg text-brand-primary shadow-inner">
                      <Landmark className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500">الملكية / الجهة المالكة</span>
                      <span className="font-extrabold text-slate-200 text-sm">{selectedRental.ownership || '-'}</span>
                    </div>
                  </div>

                  {/* Z: registered */}
                  <div className="neu-pressed p-4 rounded-xl flex items-center gap-3 border border-slate-800/40">
                    <div className="p-2.5 bg-slate-900 rounded-lg text-brand-primary shadow-inner">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500">حالة التسجيل العيني</span>
                      <span className="font-extrabold text-slate-200 text-sm">{selectedRental.registered || 'غير محدد'}</span>
                    </div>
                  </div>

                  {/* AF: caseId */}
                  <div className="neu-pressed p-4 rounded-xl flex items-center gap-3 border border-slate-800/40">
                    <div className="p-2.5 bg-slate-900 rounded-lg text-brand-primary shadow-inner">
                      <Gavel className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500">رقم القضية (AF)</span>
                      <span className="font-extrabold text-slate-200 text-sm font-sans">{selectedRental.caseId || 'لا توجد دعوى قضائية مرفوعة'}</span>
                    </div>
                  </div>

                  {/* AG: caseStatus */}
                  <div className="neu-pressed p-4 rounded-xl flex items-center gap-3 border border-slate-800/40">
                    <div className="p-2.5 bg-slate-900 rounded-lg text-brand-primary shadow-inner">
                      <Info className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500">حالة القضية القانونية (AG)</span>
                      <span className="font-extrabold text-slate-200 text-sm">{selectedRental.caseStatus || '-'}</span>
                    </div>
                  </div>

                </div>

                {/* X: Notes Section with nice quote style */}
                <div className="neu-pressed p-4 rounded-2xl mb-6 border-r-4 border-amber-500 bg-amber-500/5">
                  <h4 className="text-xs font-extrabold text-slate-400 mb-2.5 flex items-center gap-2">
                    <StickyNote className="w-4 h-4 text-brand-primary" /> الملاحظات والبيانات الاستدلالية المرفقة (X)
                  </h4>
                  <p className="text-sm font-semibold text-slate-300 leading-relaxed min-h-[3rem]">
                    {selectedRental.notes && selectedRental.notes.trim() !== '' 
                      ? selectedRental.notes 
                      : 'لا توجد ملاحظات أو بنود ملحقة مسجلة على هذا المستند العقاري.'}
                  </p>
                </div>

                {/* Contract Payments Log Section */}
                {(() => {
                  const contractPayments = rentalsRaw
                    .filter(item => item.contractId === selectedRental.contractId)
                    .sort((a, b) => {
                      const timeA = parseDateToTimestamp(a.dueDate);
                      const timeB = parseDateToTimestamp(b.dueDate);
                      if (timeA !== timeB) {
                        return timeA - timeB;
                      }
                      return (a.paymentTerm || '').localeCompare(b.paymentTerm || '', undefined, { numeric: true });
                    });

                  if (contractPayments.length === 0) return null;

                  return (
                    <div className="mt-8 mb-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1.5 h-4 bg-brand-primary rounded-full"></div>
                        <h4 className="text-sm font-black text-slate-100">
                          جدول الدفعات المالي والزمني لهذا العقد ({contractPayments.length} دفعات بالترتيب)
                        </h4>
                      </div>
                      <div className="overflow-x-auto neu-pressed p-2 rounded-2xl border border-slate-900/60 bg-[#0A0D15]">
                        <table className="w-full text-right border-collapse text-xs whitespace-nowrap">
                          <thead>
                            <tr className="border-b border-slate-800 text-brand-primary font-bold">
                              <th className="py-2.5 px-4 text-right">الدفعة (K)</th>
                              <th className="py-2.5 px-4 text-center">تاريخ الاستحقاق (L)</th>
                              <th className="py-2.5 px-4 text-center">المتبقي على الاستحقاق (M)</th>
                              <th className="py-2.5 px-4 text-center">قيمة الدفعة / السنوية (H)</th>
                              <th className="py-2.5 px-4 text-center">حالة الاستحقاق / الدعوى القضائية</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/40">
                            {contractPayments.map((p, pIdx) => {
                              const isCurrentInModal = p.dueDate === selectedRental.dueDate && p.paymentTerm === selectedRental.paymentTerm;
                              const pDays = parseRemainingDays(p.dueRemainingDays);
                              const pHasCase = !!p.caseId && p.caseId.trim() !== '';
                              const pIsCritical = pDays <= 0 && !pHasCase;
                              const pIsWarning = pDays > 0 && pDays <= 15 && !pHasCase;

                              let badgeColorClass = "text-slate-400 bg-slate-900 border border-slate-800/40";
                              let badgeText = "منتظمة";
                              if (pHasCase) {
                                badgeColorClass = "text-emerald-400 bg-emerald-950/20 border border-emerald-500/20";
                                badgeText = `دعوى مرفوعة (${p.caseId})`;
                              } else if (pIsCritical) {
                                badgeColorClass = "text-brand-accent bg-red-950/20 border border-red-500/20";
                                badgeText = "مستحقة - يجب الرفع فوراُ ⚖️";
                              } else if (pIsWarning) {
                                badgeColorClass = "text-amber-400 bg-amber-950/20 border border-amber-500/20";
                                badgeText = "استحقاق قريب";
                              }

                              return (
                                <tr 
                                  key={pIdx} 
                                  className={`${isCurrentInModal ? 'bg-brand-primary/10 border-r-2 border-brand-primary font-bold' : 'hover:bg-slate-900/40'} transition-all`}
                                >
                                  <td className="py-3 px-4 text-right text-slate-200">
                                    {p.paymentTerm || `دفعة ${pIdx + 1}`}
                                    {isCurrentInModal && (
                                      <span className="bg-brand-primary/20 text-brand-primary text-[9px] px-1.5 py-0.5 rounded-full mr-1.5 font-bold">
                                        المعروضة حالياً
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-center text-slate-300 font-mono" dir="ltr">{p.dueDate || '-'}</td>
                                  <td className="py-3 px-4 text-center font-mono">
                                    <span className={pIsCritical ? 'text-brand-accent font-bold' : pIsWarning ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                                      {p.dueRemainingDays || '0'} يوم
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-center text-slate-300 font-mono" dir="rtl">{formatCurrency(p.annualRent)}</td>
                                  <td className="py-3 px-4 text-center">
                                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-bold ${badgeColorClass}`}>
                                      {badgeText}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}

                {/* AA, AB, AE Links Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 mt-6 pt-6 border-t border-slate-800">
                  {selectedRental.rentalLink ? (
                    <a 
                      href={selectedRental.rentalLink} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="neu-btn flex-1 py-4 px-4 rounded-xl font-extrabold text-brand-primary flex items-center justify-center gap-2 text-sm hover:text-amber-400 transition-colors border border-slate-800"
                    >
                      <ExternalLink className="w-4 h-4" /> استعراض وثيقة عقد الإيجار (AE)
                    </a>
                  ) : (
                    <button 
                      disabled
                      className="neu-btn flex-1 py-4 px-4 rounded-xl font-extrabold text-slate-500 opacity-40 flex items-center justify-center gap-2 text-sm cursor-not-allowed border border-slate-800/40"
                    >
                      <ExternalLink className="w-4 h-4" /> عقد الإيجار غير متاح للتحميل
                    </button>
                  )}

                  {selectedRental.linkReg ? (
                    <a 
                      href={selectedRental.linkReg} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="neu-btn flex-1 py-4 px-4 rounded-xl font-extrabold text-brand-primary flex items-center justify-center gap-2 text-sm hover:text-emerald-400 transition-colors border border-slate-800"
                    >
                      <ShieldCheck className="w-4 h-4" /> السجل العقاري (AA)
                    </a>
                  ) : (
                    <button 
                      disabled
                      className="neu-btn flex-1 py-4 px-4 rounded-xl font-extrabold text-slate-500 opacity-40 flex items-center justify-center gap-2 text-sm cursor-not-allowed border border-slate-800/40"
                    >
                      <ShieldCheck className="w-4 h-4" /> رابط السجل العقاري (AA) غير متوفر
                    </button>
                  )}

                  {selectedRental.linkMoj ? (
                    <a 
                      href={selectedRental.linkMoj} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="neu-btn flex-1 py-4 px-4 rounded-xl font-extrabold text-brand-primary flex items-center justify-center gap-2 text-sm hover:text-purple-400 transition-colors border border-slate-800"
                    >
                      <Scale className="w-4 h-4" /> بوابة وزارة العدل (AB)
                    </a>
                  ) : (
                    <button 
                      disabled
                      className="neu-btn flex-1 py-4 px-4 rounded-xl font-extrabold text-slate-500 opacity-40 flex items-center justify-center gap-2 text-sm cursor-not-allowed border border-slate-800/40"
                    >
                      <Scale className="w-4 h-4" /> رابط وزارة العدل (AB) غير متوفر
                    </button>
                  )}
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Simple fallback icon in case FileSpreadsheet isn't imported from lucide
function FileSpreadsheetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M8 13h2" />
      <path d="M8 17h2" />
      <path d="M14 13h2" />
      <path d="M14 17h2" />
    </svg>
  );
}
