import { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
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
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  FileText,
  Gavel,
  BarChart3,
  Sun,
  Moon
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { RealEstateAsset, FilterState, RentalContract, RentalFilterState, AgencyPoa, AgencyFilterState, TaskItem, DetailedCase } from './types';
import { parseCsvSheet, fetchCsvText } from './utils/fetchCsv';
import RentalsSection from './components/RentalsSection';
import AgenciesSection from './components/AgenciesSection';
import TasksSection from './components/TasksSection';
import CasesSection from './components/CasesSection';
import { AnalyticsSection } from './components/AnalyticsSection';

// Google Sheet CSV URLs
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSQij-f5Lsj-x3qEMZRX3VPsAEOCBd09O8BqA8zugUJPB_8TRzfvYYB04hRgb6Tpg6uNDeRmXGpqgGZ/pub?gid=304190621&single=true&output=csv';
const RENTAL_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSzYnO77sbix0Tm0GD_om-hT3yiPrmrcCoKQFqXfIqB24oUn7c4hhhXU4KbuSS1265iXF473UWQqQOH/pub?gid=304190621&single=true&output=csv';
const POA_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT8qWdU0eFMs5IMYbDwamiGZCpDejrHdczl1d9D8Ivdo91ulEzeXC6uyrJmPw3-z9j4CtUnE5tUPdMn/pub?gid=837529963&single=true&output=csv';
const TASKS_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT8qWdU0eFMs5IMYbDwamiGZCpDejrHdczl1d9D8Ivdo91ulEzeXC6uyrJmPw3-z9j4CtUnE5tUPdMn/pub?gid=883025564&single=true&output=csv';
const CASES_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT8qWdU0eFMs5IMYbDwamiGZCpDejrHdczl1d9D8Ivdo91ulEzeXC6uyrJmPw3-z9j4CtUnE5tUPdMn/pub?gid=1227781018&single=true&output=csv';

// Column Mapping for Assets
const COL = {
  OWNERSHIP: 0,       // A: ملكيتها
  ID_NUM: 1,          // B: الهوية او رقم الموحد
  GEN_NUM: 2,         // C: رقم
  PROP_NUM: 3,        // D: رقم العقار
  DOC_NUM: 4,         // E: رقم الوثيقه
  DEED_DATE: 5,       // F: تاريخ الصك
  AREA: 6,            // G: المساحة
  PLAN_NUM: 7,        // H: رقم المخطط
  PIECE_NUM: 8,       // I: رقم القطعة
  DISTRICT: 9,        // J: الحي
  CITY: 10,           // K: المدينة
  NOTES: 13,          // N: ملاحظة
  OWNERSHIP_TYPE: 14, // O: الملكية
  REGISTERED: 15,     // P: مسجل عينيا
  LINK_REG: 16,       // Q: رابط السجل العقاري
  LINK_MOJ: 17        // R: رابط وثيقة وزارة العدل
};

// Column Mapping for Rentals
const RENT_COL = {
  CONTRACT_ID: 1,      // B: رقم سجل العقد
  START_DATE: 2,       // C: تاريخ بداية مدة الإيجار
  END_DATE: 3,         // D: تاريخ نهاية مدة الإيجار
  REMAINING_DAYS: 4,   // E: المتبقي على انتهاء العقد
  TENANT_NAME: 5,      // F: اسم المستأجر
  UNIFIED_ID: 6,       // G: الرقم الموحد
  ANNUAL_RENT: 7,      // H: القيمة السنوية للإيجار
  TOTAL_PAYMENTS: 9,   // J: اجمالي الدفعات
  PAYMENT_TERM: 10,    // K: الدفعة
  DUE_DATE: 11,        // L: تاريخ الاستحقاق
  DUE_REMAINING_DAYS: 12, // M: المتبقي على الاستحقاق
  PROP_NUM: 13,        // N: رقم العقار
  DOC_NUM: 14,         // O: رقم الوثيقه
  AREA: 16,            // Q: المساحة
  DISTRICT: 19,        // T: الحي
  CITY: 20,            // U: المدينة
  NOTES: 23,           // X: ملاحظة
  OWNERSHIP: 24,       // Y: الملكية
  REGISTERED: 25,      // Z: مسجل عينيا
  LINK_REG: 26,        // AA: رابط السجل العقاري
  LINK_MOJ: 27,        // AB: رابط وثيقة وزارة العدل
  RENTAL_LINK: 30,     // AE: عقد الإيجار
  CASE_ID: 31,         // AF: رقم القضية
  CASE_STATUS: 32,     // AG: حالتها
};

// Column Mapping for Agencies (POAs)
const POA_COL = {
  POA_NUMBER: 0,      // A: رقم الوكالة
  HIJRI_DATE: 1,      // B: تاريخها بالهجري
  GREGORIAN_DATE: 2,  // C: تاريخها بالميلادي
  EXPIRY_DATE: 3,     // D: تاريخ الانتهاء
  REMAINING_DAYS: 4,  // E: المتبقي على الانتهاء
  PRINCIPAL_NAME: 5,  // F: الموكل
  PRINCIPAL_ID: 6,    // G: هوية الموكل
  AGENT_NAME: 7,      // H: الوكيل
  AGENT_ID: 8,        // I: هوية الوكيل
  AGENCY_TITLE: 9,    // J: اسم الوكالة
  NOTES: 10,          // K: ملاحظة
  DOC_LINK: 11,       // L: رابط الوكالة
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'assets' | 'rentals' | 'agencies' | 'tasks' | 'cases' | 'analytics'>('cases');

  // Theme State (#f0f0f3 light vs dark)
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('themeMode') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('themeMode', themeMode);
    if (themeMode === 'light') {
      document.documentElement.classList.add('theme-light');
    } else {
      document.documentElement.classList.remove('theme-light');
    }
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Assets State
  const [rawData, setRawData] = useState<RealEstateAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<RealEstateAsset | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 15;

  const [filters, setFilters] = useState<FilterState>({
    ownership: 'all',
    city: 'all',
    district: 'all',
    registered: 'all',
    propNum: '',
    docNum: '',
    area: '',
  });

  // Rentals State
  const [rentalsRaw, setRentalsRaw] = useState<RentalContract[]>([]);
  const [selectedRental, setSelectedRental] = useState<RentalContract | null>(null);
  const [currentRentalPage, setCurrentRentalPage] = useState<number>(1);

  const [rentalFilters, setRentalFilters] = useState<RentalFilterState>({
    contractId: '',
    tenantName: '',
    unifiedId: '',
    propNum: '',
    area: '',
    lawsuitRaised: 'all',
    caseId: '',
    caseStatus: 'all',
    city: 'all',
    district: 'all',
    urgency: 'all',
  });

  // Agencies State
  const [agenciesRaw, setAgenciesRaw] = useState<AgencyPoa[]>([]);
  const [agencyFilters, setAgencyFilters] = useState<AgencyFilterState>({
    poaNumber: '',
    name: '',
    status: 'all',
  });

  // Tasks & Cases State
  const [tasksRaw, setTasksRaw] = useState<TaskItem[]>([]);
  const [casesRaw, setCasesRaw] = useState<DetailedCase[]>([]);

  // Universal loading and error states
  const [assetsLoading, setAssetsLoading] = useState<boolean>(true);
  const [rentalsLoading, setRentalsLoading] = useState<boolean>(true);
  const [agenciesLoading, setAgenciesLoading] = useState<boolean>(true);
  const [tasksLoading, setTasksLoading] = useState<boolean>(true);
  
  const [assetsError, setAssetsError] = useState<string | null>(null);
  const [rentalsError, setRentalsError] = useState<string | null>(null);
  const [agenciesError, setAgenciesError] = useState<string | null>(null);
  const [tasksError, setTasksError] = useState<string | null>(null);


  // Load Data
  useEffect(() => {
    // 1. Fetch Assets
    const fetchAssets = async () => {
      try {
        setAssetsLoading(true);
        const rowsData = await parseCsvSheet(SHEET_URL);
        if (rowsData && rowsData.length > 1) {
          const rows = rowsData.slice(1);
          const parsed: RealEstateAsset[] = rows
            .filter(row => row.length > 5 && row[COL.OWNERSHIP])
            .map(row => {
              const sanitized = row.map(cell => (cell ? cell.trim() : ''));
              const regVal = sanitized[COL.REGISTERED] ? sanitized[COL.REGISTERED].toUpperCase() : '';
              const registeredStatus: 'مسجل عينيا' | 'غير مسجل' = regVal === 'TRUE' ? 'مسجل عينيا' : 'غير مسجل';

              return {
                ownership: sanitized[COL.OWNERSHIP] || '',
                idNum: sanitized[COL.ID_NUM] || '',
                genNum: sanitized[COL.GEN_NUM] || '',
                propNum: sanitized[COL.PROP_NUM] || '',
                docNum: sanitized[COL.DOC_NUM] || '',
                deedDate: sanitized[COL.DEED_DATE] || '',
                area: sanitized[COL.AREA] || '',
                planNum: sanitized[COL.PLAN_NUM] || '',
                pieceNum: sanitized[COL.PIECE_NUM] || '',
                district: sanitized[COL.DISTRICT] || '',
                city: sanitized[COL.CITY] || '',
                notes: sanitized[COL.NOTES] || '',
                ownershipType: sanitized[COL.OWNERSHIP_TYPE] || '',
                registered: registeredStatus,
                linkReg: sanitized[COL.LINK_REG] || '',
                linkMoj: sanitized[COL.LINK_MOJ] || '',
              };
            });
          setRawData(parsed);
          setAssetsLoading(false);
        } else {
          setAssetsError('الملف المستورد فارغ أو غير صالح للأصول.');
          setAssetsLoading(false);
        }
      } catch (err) {
        console.error('Fetch assets error:', err);
        setAssetsError('حدث خطأ غير متوقع أثناء معالجة الأصول.');
        setAssetsLoading(false);
      }
    };

    // 2. Fetch Rentals
    const fetchRentals = async () => {
      try {
        setRentalsLoading(true);
        const rowsData = await parseCsvSheet(RENTAL_SHEET_URL);
        if (rowsData && rowsData.length > 1) {
          const rows = rowsData.slice(1);
          const parsed: RentalContract[] = rows
            .filter(row => row.length > 1 && row[RENT_COL.CONTRACT_ID])
            .map(row => {
              const sanitized = row.map(cell => (cell ? cell.trim() : ''));
              return {
                contractId: sanitized[RENT_COL.CONTRACT_ID] || '',
                startDate: sanitized[RENT_COL.START_DATE] || '',
                endDate: sanitized[RENT_COL.END_DATE] || '',
                remainingDays: sanitized[RENT_COL.REMAINING_DAYS] || '',
                tenantName: sanitized[RENT_COL.TENANT_NAME] || '',
                unifiedId: sanitized[RENT_COL.UNIFIED_ID] || '',
                annualRent: sanitized[RENT_COL.ANNUAL_RENT] || '',
                totalPayments: sanitized[RENT_COL.TOTAL_PAYMENTS] || '',
                paymentTerm: sanitized[RENT_COL.PAYMENT_TERM] || '',
                dueDate: sanitized[RENT_COL.DUE_DATE] || '',
                dueRemainingDays: sanitized[RENT_COL.DUE_REMAINING_DAYS] || '',
                propNum: sanitized[RENT_COL.PROP_NUM] || '',
                docNum: sanitized[RENT_COL.DOC_NUM] || '',
                area: sanitized[RENT_COL.AREA] || '',
                district: sanitized[RENT_COL.DISTRICT] || '',
                city: sanitized[RENT_COL.CITY] || '',
                notes: sanitized[RENT_COL.NOTES] || '',
                ownership: sanitized[RENT_COL.OWNERSHIP] || '',
                registered: sanitized[RENT_COL.REGISTERED] || '',
                linkReg: sanitized[RENT_COL.LINK_REG] || '',
                linkMoj: sanitized[RENT_COL.LINK_MOJ] || '',
                rentalLink: sanitized[RENT_COL.RENTAL_LINK] || '',
                caseId: sanitized[RENT_COL.CASE_ID] || '',
                caseStatus: sanitized[RENT_COL.CASE_STATUS] || '',
              };
            });
          setRentalsRaw(parsed);
          setRentalsLoading(false);
        } else {
          setRentalsError('الملف المستورد لعقود الإيجار فارغ أو غير صالح.');
          setRentalsLoading(false);
        }
      } catch (err) {
        console.error('Fetch rentals error:', err);
        setRentalsError('حدث خطأ غير متوقع أثناء معالجة عقود الإيجار.');
        setRentalsLoading(false);
      }
    };

    // 3. Fetch Agencies (POAs)
    const fetchAgencies = async () => {
      try {
        setAgenciesLoading(true);
        const rowsData = await parseCsvSheet(POA_SHEET_URL);
        if (rowsData && rowsData.length > 1) {
          const rows = rowsData.slice(1);
          const parsed: AgencyPoa[] = rows
            .filter(row => row.length > 1 && row[POA_COL.POA_NUMBER])
            .map(row => {
              const sanitized = row.map(cell => (cell ? cell.trim() : ''));
              return {
                poaNumber: sanitized[POA_COL.POA_NUMBER] || '',
                hijriDate: sanitized[POA_COL.HIJRI_DATE] || '',
                gregorianDate: sanitized[POA_COL.GREGORIAN_DATE] || '',
                expiryDate: sanitized[POA_COL.EXPIRY_DATE] || '',
                remainingDays: sanitized[POA_COL.REMAINING_DAYS] || '',
                principalName: sanitized[POA_COL.PRINCIPAL_NAME] || '',
                principalId: sanitized[POA_COL.PRINCIPAL_ID] || '',
                agentName: sanitized[POA_COL.AGENT_NAME] || '',
                agentId: sanitized[POA_COL.AGENT_ID] || '',
                agencyTitle: sanitized[POA_COL.AGENCY_TITLE] || '',
                notes: sanitized[POA_COL.NOTES] || '',
                docLink: sanitized[POA_COL.DOC_LINK] || '',
              };
            });
          setAgenciesRaw(parsed);
          setAgenciesLoading(false);
        } else {
          setAgenciesError('الملف المستورد للوكالات فارغ أو غير صالح.');
          setAgenciesLoading(false);
        }
      } catch (err) {
        console.error('Fetch agencies error:', err);
        setAgenciesError('حدث خطأ غير متوقع أثناء معالجة الوكالات.');
        setAgenciesLoading(false);
      }
    };

    // 4. Fetch Tasks & Cases
    const fetchTasksAndCases = async () => {
      try {
        setTasksLoading(true);
        setTasksError(null);

        // Fetch Cases Sheet
        const casesRowsData = await parseCsvSheet(CASES_SHEET_URL);
        let parsedCases: DetailedCase[] = [];
        if (casesRowsData && casesRowsData.length > 1) {
          const rows = casesRowsData.slice(1);
          parsedCases = rows
            .filter(row => row.length > 0 && row.some(cell => cell.trim()))
            .map(row => {
              const s = row.map(cell => (cell ? cell.trim() : ''));
              return {
                caseNumber: s[0] || '',
                classification: s[1] || '',
                caseType: s[2] || '',
                caseDate: s[3] || '',
                plaintiff: s[4] || '',
                plaintiffId: s[5] || '',
                defendant: s[6] || '',
                defendantId: s[7] || '',
                claims: s[8] || '',
                court: s[9] || '',
                circuit: s[10] || '',
                driveLink: s[11] || '',
                caseStatus: s[12] || '',
                caseManager: s[13] || '',
                currentSituation: s[15] || '',
                fileNameQ: s[16] || '',
                requestType: s[17] || '',
                completedCases: s[18] || '',
                reportDate: s[19] || '',
                notes: s[20] || '',
                instrumentDeed: s[21] || '',
                rawRow: s,
              };
            });
          setCasesRaw(parsedCases);
        }

        // Fetch Tasks Sheet
        const tasksRowsData = await parseCsvSheet(TASKS_SHEET_URL);
        if (tasksRowsData && tasksRowsData.length > 1) {
          const rows = tasksRowsData.slice(1);
          const parsedTasks: TaskItem[] = rows
            .filter(row => row.length > 0 && row.some(cell => cell.trim()))
            .map((row, idx) => {
              const s = row.map(cell => (cell ? cell.trim() : ''));
              const mainPhase = s[0] || '';
              const taskName = s[1] || '';
              const colC = s[2] || '';
              const importance = s[3] || s[2] || 'عادية';
              const colE = s[4] || '';
              const completionDate = s[5] || s[4] || s[3] || '';
              const colG = s[6] || '';
              const assignee = s[7] || s[5] || 'غير محدد';
              const statusColL = s[11] || s[10] || s[6] || colE || '';
              const notes = s[12] || s[8] || s[7] || colG || '';

              let progressPercentage = 0;
              const combinedText = `${colE} ${statusColL} ${s.join(' ')}`.toLowerCase();

              if (
                colE.includes('100') ||
                colE.includes('مكتمل') ||
                colE.includes('منجز') ||
                colE.includes('تم') ||
                colE.includes('جاهز') ||
                colE.includes('مغلق') ||
                colE.includes('انتهت') ||
                colE.trim() === '1' ||
                colE.trim() === 'نعم' ||
                combinedText.includes('100%') ||
                combinedText.includes('مكتملة') ||
                combinedText.includes('مكتمل') ||
                combinedText.includes('منجزة') ||
                combinedText.includes('تم الإنجاز')
              ) {
                progressPercentage = 100;
              } else if (colE.includes('جاري') || colE.includes('قيد') || combinedText.includes('جاري العمل')) {
                progressPercentage = 50;
              } else {
                const numMatch = colE.match(/(\d+)/) || combinedText.match(/(\d+)/);
                if (numMatch) {
                  const parsedVal = parseInt(numMatch[1], 10);
                  if (parsedVal >= 100) progressPercentage = 100;
                  else if (parsedVal > 0) progressPercentage = parsedVal;
                }
              }

              const statusRaw = statusColL || colE || (progressPercentage === 100 ? 'مكتملة' : progressPercentage > 0 ? 'جاري العمل' : 'لم تبدأ');

              // Cross-linking matching
              let matchedCase: DetailedCase | undefined;
              if (mainPhase) {
                const phaseLower = mainPhase.toLowerCase();
                matchedCase = parsedCases.find(c => {
                  if (c.fileNameQ && (phaseLower.includes(c.fileNameQ.toLowerCase()) || c.fileNameQ.toLowerCase().includes(phaseLower))) {
                    return true;
                  }
                  if (c.caseNumber && (phaseLower.includes(c.caseNumber) || c.caseNumber.includes(phaseLower))) {
                    return true;
                  }
                  return false;
                });
              }

              return {
                id: `task-${idx}-${Date.now()}`,
                mainPhase,
                taskName,
                importance,
                startDate: colC,
                endDate: completionDate,
                assignee,
                status: statusRaw,
                progressPercentage,
                notes,
                rawRow: s,
                linkedCase: matchedCase,
              };
            });

          setTasksRaw(parsedTasks);
          setTasksLoading(false);
        } else {
          setTasksError('الملف المستورد للمهام فارغ أو غير صالح.');
          setTasksLoading(false);
        }
      } catch (err) {
        console.error('Fetch tasks & cases error:', err);
        setTasksError('حدث خطأ غير متوقع أثناء معالجة المهام والقضايا.');
        setTasksLoading(false);
      }
    };

    fetchAssets();
    fetchRentals();
    fetchAgencies();
    fetchTasksAndCases();
  }, []);

  const loading = activeTab === 'assets' ? assetsLoading : activeTab === 'rentals' ? rentalsLoading : activeTab === 'agencies' ? agenciesLoading : tasksLoading;
  const error = activeTab === 'assets' ? assetsError : activeTab === 'rentals' ? rentalsError : activeTab === 'agencies' ? agenciesError : tasksError;


  // Helper to parse Remaining Days safely as a number
  const parseRemainingDays = (str: string): number => {
    if (!str) return 999999;
    const num = parseInt(str.replace(/[^\d-]/g, ''), 10);
    return isNaN(num) ? 999999 : num;
  };

  // --- ASSETS TAB DERIVED STATE ---
  const filterOptions = useMemo(() => {
    const ownerships = new Set<string>();
    const cities = new Set<string>();
    const districts = new Set<string>();

    rawData.forEach(item => {
      if (item.ownership) ownerships.add(item.ownership);
      if (item.city) cities.add(item.city);
      if (item.district) districts.add(item.district);
    });

    return {
      ownerships: Array.from(ownerships).sort(),
      cities: Array.from(cities).sort(),
      districts: Array.from(districts).sort(),
    };
  }, [rawData]);

  const filteredData = useMemo(() => {
    return rawData.filter(item => {
      const matchOwnership = filters.ownership === 'all' || item.ownership === filters.ownership;
      const matchCity = filters.city === 'all' || item.city === filters.city;
      const matchDistrict = filters.district === 'all' || item.district === filters.district;
      const matchRegistered = filters.registered === 'all' || item.registered === filters.registered;
      
      const matchPropNum = !filters.propNum || item.propNum.toLowerCase().includes(filters.propNum.toLowerCase());
      const matchDocNum = !filters.docNum || item.docNum.toLowerCase().includes(filters.docNum.toLowerCase());
      const matchArea = !filters.area || item.area.toLowerCase().includes(filters.area.toLowerCase());

      return matchOwnership && matchCity && matchDistrict && matchRegistered && matchPropNum && matchDocNum && matchArea;
    });
  }, [rawData, filters]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;

  const kpis = useMemo(() => {
    let registeredCount = 0;
    let unregisteredCount = 0;
    const citiesSet = new Set<string>();

    filteredData.forEach(item => {
      if (item.registered === 'مسجل عينيا') {
        registeredCount++;
      } else {
        unregisteredCount++;
      }
      if (item.city) {
        citiesSet.add(item.city);
      }
    });

    return {
      total: filteredData.length,
      registered: registeredCount,
      unregistered: unregisteredCount,
      cities: citiesSet.size,
    };
  }, [filteredData]);

  const distributionData = useMemo(() => {
    const counts = {
      ownership: {} as Record<string, number>,
      city: {} as Record<string, number>,
      district: {} as Record<string, number>,
      registered: {} as Record<string, number>,
    };

    filteredData.forEach(item => {
      const own = item.ownership || 'غير محدد';
      const city = item.city || 'غير محدد';
      const dist = item.district || 'غير محدد';
      const reg = item.registered || 'غير محدد';

      counts.ownership[own] = (counts.ownership[own] || 0) + 1;
      counts.city[city] = (counts.city[city] || 0) + 1;
      counts.district[dist] = (counts.district[dist] || 0) + 1;
      counts.registered[reg] = (counts.registered[reg] || 0) + 1;
    });

    const sortMap = (map: Record<string, number>) => {
      return Object.entries(map).sort((a, b) => b[1] - a[1]);
    };

    return {
      ownership: sortMap(counts.ownership),
      city: sortMap(counts.city),
      district: sortMap(counts.district),
      registered: sortMap(counts.registered),
    };
  }, [filteredData]);


  // --- RENTALS TAB DERIVED STATE ---
  const rentalFilterOptions = useMemo(() => {
    const caseStatuses = new Set<string>();
    const cities = new Set<string>();
    const districts = new Set<string>();

    rentalsRaw.forEach(item => {
      if (item.caseStatus && item.caseStatus.trim() !== '') {
        caseStatuses.add(item.caseStatus.trim());
      }
      if (item.city) cities.add(item.city);
      if (item.district) districts.add(item.district);
    });

    return {
      caseStatuses: Array.from(caseStatuses).sort(),
      cities: Array.from(cities).sort(),
      districts: Array.from(districts).sort(),
    };
  }, [rentalsRaw]);

  const filteredRentals = useMemo(() => {
    return rentalsRaw.filter(item => {
      const matchContractId = !rentalFilters.contractId || item.contractId.toLowerCase().includes(rentalFilters.contractId.toLowerCase());
      const matchTenantName = !rentalFilters.tenantName || item.tenantName.toLowerCase().includes(rentalFilters.tenantName.toLowerCase());
      const matchUnifiedId = !rentalFilters.unifiedId || item.unifiedId.toLowerCase().includes(rentalFilters.unifiedId.toLowerCase());
      const matchPropNum = !rentalFilters.propNum || item.propNum.toLowerCase().includes(rentalFilters.propNum.toLowerCase());
      const matchArea = !rentalFilters.area || item.area.toLowerCase().includes(rentalFilters.area.toLowerCase());
      const matchCaseId = !rentalFilters.caseId || item.caseId.toLowerCase().includes(rentalFilters.caseId.toLowerCase());
      
      const hasCase = !!item.caseId && item.caseId.trim() !== '';
      const matchLawsuit = rentalFilters.lawsuitRaised === 'all' || 
        (rentalFilters.lawsuitRaised === 'yes' && hasCase) || 
        (rentalFilters.lawsuitRaised === 'no' && !hasCase);

      const matchCaseStatus = rentalFilters.caseStatus === 'all' || item.caseStatus === rentalFilters.caseStatus;
      const matchCity = rentalFilters.city === 'all' || item.city === rentalFilters.city;
      const matchDistrict = rentalFilters.district === 'all' || item.district === rentalFilters.district;

      // Urgency Filter
      const days = parseRemainingDays(item.dueRemainingDays);
      let matchUrgency = true;
      if (rentalFilters.urgency !== 'all') {
        if (rentalFilters.urgency === 'critical') {
          matchUrgency = days <= 0 && !hasCase;
        } else if (rentalFilters.urgency === 'warning') {
          matchUrgency = days > 0 && days <= 15 && !hasCase;
        } else if (rentalFilters.urgency === 'active_case') {
          matchUrgency = hasCase;
        } else if (rentalFilters.urgency === 'normal') {
          matchUrgency = days > 15 && !hasCase;
        }
      }

      return matchContractId && matchTenantName && matchUnifiedId && matchPropNum && matchArea && matchLawsuit && matchCaseId && matchCaseStatus && matchCity && matchDistrict && matchUrgency;
    });
  }, [rentalsRaw, rentalFilters]);

  // Sorting priorities for Rentals (M <= 0 & no case at topmost priority, then M <= 15 & no case, then asc days)
  const sortedRentals = useMemo(() => {
    return [...filteredRentals].sort((a, b) => {
      const daysA = parseRemainingDays(a.dueRemainingDays);
      const daysB = parseRemainingDays(b.dueRemainingDays);
      const hasCaseA = !!a.caseId && a.caseId.trim() !== '';
      const hasCaseB = !!b.caseId && b.caseId.trim() !== '';

      const isCriticalA = daysA <= 0 && !hasCaseA;
      const isCriticalB = daysB <= 0 && !hasCaseB;
      if (isCriticalA && !isCriticalB) return -1;
      if (!isCriticalA && isCriticalB) return 1;

      const isWarningA = daysA <= 15 && !hasCaseA;
      const isWarningB = daysB <= 15 && !hasCaseB;
      if (isWarningA && !isWarningB) return -1;
      if (!isWarningA && isWarningB) return 1;

      return daysA - daysB;
    });
  }, [filteredRentals]);

  useEffect(() => {
    setCurrentRentalPage(1);
  }, [rentalFilters]);

  const paginatedRentals = useMemo(() => {
    const startIndex = (currentRentalPage - 1) * itemsPerPage;
    return sortedRentals.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedRentals, currentRentalPage]);

  const totalRentalPages = Math.ceil(sortedRentals.length / itemsPerPage) || 1;

  // Rental KPI Calculations
  const rentalKpis = useMemo(() => {
    const uniqueB = new Set<string>();
    let casesRaised = 0;
    let casesToBeRaised = 0;

    filteredRentals.forEach(item => {
      if (item.contractId) {
        uniqueB.add(item.contractId);
      }
      const hasCase = !!item.caseId && item.caseId.trim() !== '';
      if (hasCase) {
        casesRaised++;
      } else {
        const days = parseRemainingDays(item.dueRemainingDays);
        if (days <= 0) {
          casesToBeRaised++;
        }
      }
    });

    return {
      totalContractsUnique: uniqueB.size,
      casesRaised,
      casesToBeRaised,
      totalCount: filteredRentals.length,
    };
  }, [filteredRentals]);

  // Interactive Analytics distributions for Rentals
  const rentalAnalyticsData = useMemo(() => {
    const counts = {
      city: {} as Record<string, { count: number; totalRent: number }>,
      urgency: {
        critical: 0,
        warning: 0,
        active_case: 0,
        normal: 0,
      },
    };

    filteredRentals.forEach(item => {
      const city = item.city || 'غير محدد';
      const rentValue = parseFloat(item.annualRent.replace(/[^\d.]/g, '')) || 0;

      if (!counts.city[city]) {
        counts.city[city] = { count: 0, totalRent: 0 };
      }
      counts.city[city].count += 1;
      counts.city[city].totalRent += rentValue;

      const hasCase = !!item.caseId && item.caseId.trim() !== '';
      const days = parseRemainingDays(item.dueRemainingDays);

      if (hasCase) {
        counts.urgency.active_case += 1;
      } else if (days <= 0) {
        counts.urgency.critical += 1;
      } else if (days <= 15) {
        counts.urgency.warning += 1;
      } else {
        counts.urgency.normal += 1;
      }
    });

    const sortedCities = Object.entries(counts.city).sort((a, b) => b[1].count - a[1].count);

    return {
      cities: sortedCities,
      urgency: counts.urgency,
    };
  }, [filteredRentals]);

  // Reset / Helpers
  const handleResetFilters = () => {
    setFilters({
      ownership: 'all',
      city: 'all',
      district: 'all',
      registered: 'all',
      propNum: '',
      docNum: '',
      area: '',
    });
  };

  const handleResetRentalFilters = () => {
    setRentalFilters({
      contractId: '',
      tenantName: '',
      unifiedId: '',
      propNum: '',
      area: '',
      lawsuitRaised: 'all',
      caseId: '',
      caseStatus: 'all',
      city: 'all',
      district: 'all',
      urgency: 'all',
    });
  };

  const handleResetAgencyFilters = () => {
    setAgencyFilters({
      poaNumber: '',
      name: '',
      status: 'all',
    });
  };

  const handleTogglePillFilter = (key: keyof FilterState, value: string) => {
    setFilters(prev => {
      const currentVal = prev[key];
      return {
        ...prev,
        [key]: currentVal === value ? 'all' : value
      };
    });
  };

  const handleToggleRentalPillFilter = (key: keyof RentalFilterState, value: string) => {
    setRentalFilters(prev => {
      const currentVal = prev[key];
      return {
        ...prev,
        [key]: currentVal === value ? 'all' : value
      };
    });
  };

  const formatArea = (areaStr: string) => {
    if (!areaStr) return '-';
    const num = parseFloat(areaStr.replace(/[^\d.]/g, ''));
    if (isNaN(num)) return areaStr;
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatCurrency = (currencyStr: string) => {
    if (!currencyStr) return '-';
    const num = parseFloat(currencyStr.replace(/[^\d.]/g, ''));
    if (isNaN(num)) return currencyStr;
    return new Intl.NumberFormat('en-US').format(num) + ' ريال';
  };

  return (

    <div dir="rtl" className="min-h-screen bg-brand-bg text-brand-text font-sans selection:bg-brand-primary selection:text-black pb-16 transition-colors duration-200">
      
      {/* Header / Navbar */}
      <nav className="w-full pt-6 px-4 sm:px-6 lg:px-8 mb-8">
        <div className="max-w-7xl mx-auto">
          <div className="neu-flat flex flex-col md:flex-row justify-between items-center py-5 px-6 gap-6 border border-slate-800/60">
            
            {/* Clickable Rasana Logo Integration */}
            <a 
              href="https://indigo-armadillo-445421.hostingersite.com/#hero" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-4 group cursor-pointer hover:opacity-95 transition-all"
              title="انقر لزيارة موقع رصانة"
            >
              <div className="w-12 h-12 rounded-2xl bg-navy-dark/60 border border-brand-primary/20 flex items-center justify-center shadow-md relative group-hover:border-brand-primary/40 group-hover:scale-105 transition-all duration-300">
                <svg 
                  className="w-7 h-7 text-brand-primary stroke-[2]" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  {/* Shield */}
                  <path d="M12 3 L19 5 v6 c0 4.5 -3.5 8.5 -7 10 c-3.5 -1.5 -7 -5.5 -7 -10 V5 Z" />
                  {/* Upward Arrow */}
                  <path d="M12 16 V8" />
                  <path d="M9 11 l3-3 3 3" />
                </svg>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-tajawal font-extrabold text-2xl md:text-3xl text-white tracking-wide group-hover:text-brand-primary transition-colors">رَصَانَة</span>
                  <span className="bg-brand-primary/10 text-brand-primary border border-brand-primary/20 text-[10px] px-2 py-0.5 rounded font-bold flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> منصة معتمدة
                  </span>
                </div>
                <span className="font-outfit font-bold text-[10px] tracking-[0.25em] text-brand-primary uppercase">RASANA</span>
                <span className="font-bold text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                  {activeTab === 'assets' && 'لوحة متابعة وإدارة الأصول العقارية وسجل الصكوك'}
                  {activeTab === 'rentals' && 'لوحة متابعة وتحليل عقود الإيجار والاستحقاقات المالية'}
                  {activeTab === 'agencies' && 'لوحة تحكم الوكالات والتوكيلات الشرعية'}
                  {activeTab === 'tasks' && 'لوحة متابعة القضايا والمهام والمراحل الرئيسية'}
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-brand-primary" />
                </span>
              </div>
            </a>
            
            {/* Quick Live Indicators & Theme Toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className="neu-btn px-3.5 py-2.5 rounded-xl text-slate-200 font-bold text-xs flex items-center gap-2 hover:text-white transition-all border border-slate-800"
                title="تغيير مظهر الموقع كامل (فاتح / داكن)"
              >
                {themeMode === 'light' ? (
                  <>
                    <Moon className="w-4 h-4 text-amber-500" />
                    <span>المظهر الداكن</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span>المظهر الفاتح (#f0f0f3)</span>
                  </>
                )}
              </button>

              <button 
                onClick={activeTab === 'assets' ? handleResetFilters : activeTab === 'rentals' ? handleResetRentalFilters : activeTab === 'agencies' ? handleResetAgencyFilters : undefined} 
                className="neu-btn px-4 py-2.5 rounded-xl text-slate-300 font-bold text-xs flex items-center gap-2 hover:text-white transition-all border border-slate-800"
              >
                <RotateCcw className="w-3.5 h-3.5 text-brand-primary" /> تحديث الفلاتر
              </button>
              <div className="p-2.5 neu-pressed text-xs font-bold text-brand-primary rounded-xl px-4 flex items-center gap-2 border border-brand-primary/10">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                مزامنة حية
              </div>
            </div>

          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Modern Prestigious Tab Switcher */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="flex p-1.5 bg-[#0F1422] border border-slate-800/80 rounded-2xl max-w-3xl overflow-x-auto">
            <button
              onClick={() => setActiveTab('cases')}
              className={`flex-1 min-w-[110px] flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-bold text-xs transition-all duration-300 ${
                activeTab === 'cases'
                  ? 'bg-gradient-to-l from-brand-primary/10 to-amber-500/10 text-brand-primary border border-brand-primary/20 shadow-[0_0_15px_rgba(212,157,47,0.1)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <Scale className="w-4 h-4" />
              القضايا
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-bold text-xs transition-all duration-300 ${
                activeTab === 'analytics'
                  ? 'bg-gradient-to-l from-brand-primary/10 to-amber-500/10 text-brand-primary border border-brand-primary/20 shadow-[0_0_15px_rgba(212,157,47,0.1)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              التحاليل
            </button>
            <button
              onClick={() => setActiveTab('agencies')}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-bold text-xs transition-all duration-300 ${
                activeTab === 'agencies'
                  ? 'bg-gradient-to-l from-brand-primary/10 to-amber-500/10 text-brand-primary border border-brand-primary/20 shadow-[0_0_15px_rgba(212,157,47,0.1)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <Gavel className="w-4 h-4" />
              سجل الوكالات
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-bold text-xs transition-all duration-300 ${
                activeTab === 'tasks'
                  ? 'bg-gradient-to-l from-brand-primary/10 to-amber-500/10 text-brand-primary border border-brand-primary/20 shadow-[0_0_15px_rgba(212,157,47,0.1)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              المهام
            </button>
            <button
              onClick={() => setActiveTab('assets')}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-bold text-xs transition-all duration-300 ${
                activeTab === 'assets'
                  ? 'bg-gradient-to-l from-brand-primary/10 to-amber-500/10 text-brand-primary border border-brand-primary/20 shadow-[0_0_15px_rgba(212,157,47,0.1)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <Building2 className="w-4 h-4" />
              سجل الأصول
            </button>
            <button
              onClick={() => setActiveTab('rentals')}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-bold text-xs transition-all duration-300 ${
                activeTab === 'rentals'
                  ? 'bg-gradient-to-l from-brand-primary/10 to-amber-500/10 text-brand-primary border border-brand-primary/20 shadow-[0_0_15px_rgba(212,157,47,0.1)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <FileText className="w-4 h-4" />
              عقود الإيجار
            </button>
          </div>
        </div>


        {/* Loading State */}
        {loading && (
          <div className="neu-flat p-16 flex flex-col items-center justify-center text-center my-8 max-w-2xl mx-auto border border-slate-800">
            <div className="relative w-16 h-16 mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
              <div className="absolute inset-0 rounded-full border-4 border-t-brand-primary animate-spin"></div>
            </div>
            <h3 className="text-xl font-bold text-brand-primary mb-2">جاري مزامنة وجلب سجلات العقارات...</h3>
            <p className="text-sm text-slate-400">يقوم النظام الآن بمطابقة قواعد البيانات وتحليل الصكوك والملكيات العقارية المسجلة.</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="neu-flat p-8 border-r-4 border-brand-accent bg-red-950 bg-opacity-20 rounded-2xl flex items-start gap-4 my-8 max-w-3xl mx-auto">
            <div className="p-3 bg-slate-900 rounded-xl text-brand-accent shadow-sm">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-brand-accent mb-1">فشل في جلب ملف البيانات</h3>
              <p className="text-slate-300 font-medium mb-4">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="neu-btn px-5 py-2.5 rounded-xl text-xs font-bold text-brand-primary flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> إعادة المحاولة الفورية
              </button>
            </div>
          </div>
        )}

        {/* Dashboard Content */}
        {!loading && !error && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.4 }}
          >
            {activeTab === 'assets' ? (
              <>
                {/* KPI Widgets */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              
              {/* Total Card */}
              <div className="neu-flat p-6 rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden group border border-slate-800/80">
                <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary opacity-5 rounded-full translate-x-8 -translate-y-8 group-hover:scale-125 transition-transform duration-300"></div>
                <div className="p-3 bg-amber-500/10 text-brand-primary rounded-2xl mb-3 shadow-inner">
                  <LayoutDashboard className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-400 mb-1">إجمالي الأصول</span>
                <span className="text-4xl font-black text-white font-sans leading-none" dir="ltr">
                  {rawData.length}
                </span>
                <span className="text-[10px] text-slate-500 mt-2">
                  مطابقة للبحث: <strong className="text-brand-primary font-sans">{filteredData.length}</strong>
                </span>
              </div>

              {/* Registered Card */}
              <div className="neu-flat p-6 rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden group border border-slate-800/80">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500 opacity-5 rounded-full translate-x-8 -translate-y-8 group-hover:scale-125 transition-transform duration-300"></div>
                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl mb-3 shadow-inner">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-400 mb-1">مسجلة عينياً</span>
                <span className="text-4xl font-black text-emerald-400 font-sans leading-none" dir="ltr">
                  {rawData.filter(x => x.registered === 'مسجل عينيا').length}
                </span>
                <span className="text-[10px] text-slate-500 mt-2">
                  نسبة الاكتمال: <strong className="text-emerald-400 font-sans">
                    {Math.round((rawData.filter(x => x.registered === 'مسجل عينيا').length / (rawData.length || 1)) * 100)}%
                  </strong>
                </span>
              </div>

              {/* Unregistered Card */}
              <div className="neu-flat p-6 rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden group border border-slate-800/80">
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-500 opacity-5 rounded-full translate-x-8 -translate-y-8 group-hover:scale-125 transition-transform duration-300"></div>
                <div className="p-3 bg-red-500/10 text-brand-accent rounded-2xl mb-3 shadow-inner">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-400 mb-1">غير مسجلة عينياً</span>
                <span className="text-4xl font-black text-brand-accent font-sans leading-none" dir="ltr">
                  {rawData.filter(x => x.registered !== 'مسجل عينيا').length}
                </span>
                <span className="text-[10px] text-slate-500 mt-2 text-red-400">
                  بحاجة للتسجيل العيني
                </span>
              </div>

              {/* Cities Card */}
              <div className="neu-flat p-6 rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden group border border-slate-800/80">
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500 opacity-5 rounded-full translate-x-8 -translate-y-8 group-hover:scale-125 transition-transform duration-300"></div>
                <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl mb-3 shadow-inner">
                  <Map className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-400 mb-1">المدن المغطاة</span>
                <span className="text-4xl font-black text-purple-400 font-sans leading-none" dir="ltr">
                  {kpis.cities}
                </span>
                <span className="text-[10px] text-slate-500 mt-2">
                  تغطية جغرافية شاملة
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
                    <h3 className="font-extrabold text-lg text-white">تصفية وبحث معلومات الأصول</h3>
                    <p className="text-xs text-slate-400">ابحث بالاسم، المدينة، رقم العقار أو المساحة بشكل فوري</p>
                  </div>
                </div>
                
                <button 
                  onClick={handleResetFilters} 
                  className="neu-btn px-4 py-2 rounded-xl text-brand-accent font-extrabold text-xs flex items-center gap-2 border border-slate-800 hover:border-red-900/40 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" /> مسح جميع الفلاتر
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                
                {/* Ownership Dropdown (A) */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 mr-1">الجهة المالكة (ملكيتها)</label>
                  <div className="relative">
                    <select 
                      value={filters.ownership}
                      onChange={(e) => setFilters(prev => ({ ...prev, ownership: e.target.value }))}
                      className="w-full neu-pressed p-3 rounded-xl outline-none focus:ring-1 focus:ring-brand-primary appearance-none text-slate-200 font-bold text-sm bg-[#0E131F]"
                    >
                      <option value="all" className="bg-[#0E131F]">جميع الجهات</option>
                      {filterOptions.ownerships.map(own => (
                        <option key={own} value={own} className="bg-[#0E131F]">{own}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-3 text-slate-400">
                      <ChevronLeft className="w-4 h-4 transform -rotate-90" />
                    </div>
                  </div>
                </div>

                {/* City Dropdown (K) */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 mr-1">المدينة (K)</label>
                  <div className="relative">
                    <select 
                      value={filters.city}
                      onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value, district: 'all' }))}
                      className="w-full neu-pressed p-3 rounded-xl outline-none focus:ring-1 focus:ring-brand-primary appearance-none text-slate-200 font-bold text-sm bg-[#0E131F]"
                    >
                      <option value="all" className="bg-[#0E131F]">جميع المدن</option>
                      {filterOptions.cities.map(city => (
                        <option key={city} value={city} className="bg-[#0E131F]">{city}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-3 text-slate-400">
                      <ChevronLeft className="w-4 h-4 transform -rotate-90" />
                    </div>
                  </div>
                </div>

                {/* District Dropdown (J) */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 mr-1">الحي (J)</label>
                  <div className="relative">
                    <select 
                      value={filters.district}
                      onChange={(e) => setFilters(prev => ({ ...prev, district: e.target.value }))}
                      className="w-full neu-pressed p-3 rounded-xl outline-none focus:ring-1 focus:ring-brand-primary appearance-none text-slate-200 font-bold text-sm bg-[#0E131F]"
                    >
                      <option value="all" className="bg-[#0E131F]">جميع الأحياء</option>
                      {filterOptions.districts.map(dist => (
                        <option key={dist} value={dist} className="bg-[#0E131F]">{dist}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-3 text-slate-400">
                      <ChevronLeft className="w-4 h-4 transform -rotate-90" />
                    </div>
                  </div>
                </div>

                {/* Registered (P) */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 mr-1">حالة التسجيل العيني (P)</label>
                  <div className="relative">
                    <select 
                      value={filters.registered}
                      onChange={(e) => setFilters(prev => ({ ...prev, registered: e.target.value }))}
                      className="w-full neu-pressed p-3 rounded-xl outline-none focus:ring-1 focus:ring-brand-primary appearance-none text-slate-200 font-bold text-sm bg-[#0E131F]"
                    >
                      <option value="all" className="bg-[#0E131F]">جميع الحالات</option>
                      <option value="مسجل عينيا" className="bg-[#0E131F] text-emerald-400">مسجل عينيا</option>
                      <option value="غير مسجل" className="bg-[#0E131F] text-red-400">غير مسجل</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-3 text-slate-400">
                      <ChevronLeft className="w-4 h-4 transform -rotate-90" />
                    </div>
                  </div>
                </div>

              </div>

              {/* Text Search Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
                
                {/* Prop Number Search */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 mr-1">رقم العقار (D)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500">
                      <Search className="w-4 h-4" />
                    </span>
                    <input 
                      type="text"
                      value={filters.propNum}
                      onChange={(e) => setFilters(prev => ({ ...prev, propNum: e.target.value }))}
                      className="w-full neu-pressed p-3 pr-10 rounded-xl outline-none focus:ring-1 focus:ring-brand-primary text-white font-bold text-sm placeholder-slate-600 font-sans bg-[#0E131F]"
                      placeholder="ابحث برقم العقار..."
                      dir="rtl"
                    />
                  </div>
                </div>

                {/* Document Number Search */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 mr-1">رقم الوثيقة / الصك (E)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500">
                      <Search className="w-4 h-4" />
                    </span>
                    <input 
                      type="text"
                      value={filters.docNum}
                      onChange={(e) => setFilters(prev => ({ ...prev, docNum: e.target.value }))}
                      className="w-full neu-pressed p-3 pr-10 rounded-xl outline-none focus:ring-1 focus:ring-brand-primary text-white font-bold text-sm placeholder-slate-600 font-sans bg-[#0E131F]"
                      placeholder="ابحث برقم الوثيقة أو الصك..."
                      dir="rtl"
                    />
                  </div>
                </div>

                {/* Area Search */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 mr-1">المساحة (م²)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500">
                      <Maximize2 className="w-4 h-4" />
                    </span>
                    <input 
                      type="text"
                      value={filters.area}
                      onChange={(e) => setFilters(prev => ({ ...prev, area: e.target.value }))}
                      className="w-full neu-pressed p-3 pr-10 rounded-xl outline-none focus:ring-1 focus:ring-brand-primary text-white font-bold text-sm placeholder-slate-600 font-sans bg-[#0E131F]"
                      placeholder="بحث بالمساحة بالمتر المربع..."
                      dir="rtl"
                    />
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
                  <h3 className="font-extrabold text-lg text-white">تحليلات تفاعلية (اضغط للفلترة)</h3>
                  <p className="text-xs text-slate-400">انقر على أي تصنيف لتطبيقه كفلتر سريع وتلقائي على قائمة العقارات</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                
                {/* A: Ownership distribution */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 mb-3.5 border-b border-slate-800 pb-2 flex justify-between items-center">
                    <span>توزيع الملكية</span>
                    <span className="text-[9px] bg-amber-500/10 text-brand-primary px-1.5 py-0.5 rounded font-sans">
                      {distributionData.ownership.length} جهة
                    </span>
                  </h4>
                  <div className="flex flex-wrap gap-2 max-h-[160px] overflow-y-auto pr-1">
                    {distributionData.ownership.map(([own, count]) => {
                      const isActive = filters.ownership === own;
                      return (
                        <button
                          key={own}
                          onClick={() => handleTogglePillFilter('ownership', own)}
                          className={`analytics-pill text-xs flex items-center gap-1.5 ${isActive ? 'active text-brand-primary ring-1 ring-brand-primary/30' : 'text-slate-300'}`}
                        >
                          <span className="font-bold truncate max-w-[120px]">{own}</span>
                          <span className="count font-sans bg-[#0E131F] text-slate-400 rounded-full px-1.5 py-0.5 text-[10px]">{count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* K: City Distribution */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 mb-3.5 border-b border-slate-800 pb-2 flex justify-between items-center">
                    <span>توزيع المدن</span>
                    <span className="text-[9px] bg-purple-500/15 text-purple-400 px-1.5 py-0.5 rounded font-sans">
                      {distributionData.city.length} مدينة
                    </span>
                  </h4>
                  <div className="flex flex-wrap gap-2 max-h-[160px] overflow-y-auto pr-1">
                    {distributionData.city.map(([city, count]) => {
                      const isActive = filters.city === city;
                      return (
                        <button
                          key={city}
                          onClick={() => handleTogglePillFilter('city', city)}
                          className={`analytics-pill text-xs flex items-center gap-1.5 ${isActive ? 'active text-brand-primary ring-1 ring-brand-primary/30' : 'text-slate-300'}`}
                        >
                          <span className="font-bold">{city}</span>
                          <span className="count font-sans bg-[#0E131F] text-purple-400 rounded-full px-1.5 py-0.5 text-[10px]">{count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* J: District Distribution */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 mb-3.5 border-b border-slate-800 pb-2 flex justify-between items-center">
                    <span>توزيع الأحياء</span>
                    <span className="text-[9px] bg-blue-500/15 text-blue-400 px-1.5 py-0.5 rounded font-sans">
                      {distributionData.district.length} حي
                    </span>
                  </h4>
                  <div className="flex flex-wrap gap-2 max-h-[160px] overflow-y-auto pr-1">
                    {distributionData.district.slice(0, 15).map(([dist, count]) => {
                      const isActive = filters.district === dist;
                      return (
                        <button
                          key={dist}
                          onClick={() => handleTogglePillFilter('district', dist)}
                          className={`analytics-pill text-xs flex items-center gap-1.5 ${isActive ? 'active text-brand-primary ring-1 ring-brand-primary/30' : 'text-slate-300'}`}
                        >
                          <span className="font-bold truncate max-w-[100px]">{dist}</span>
                          <span className="count font-sans bg-[#0E131F] text-blue-400 rounded-full px-1.5 py-0.5 text-[10px]">{count}</span>
                        </button>
                      );
                    })}
                    {distributionData.district.length > 15 && (
                      <span className="text-[10px] text-slate-500 self-center">+{distributionData.district.length - 15} أحياء</span>
                    )}
                  </div>
                </div>

                {/* P: Registration Status Distribution */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 mb-3.5 border-b border-slate-800 pb-2 flex justify-between items-center">
                    <span>التسجيل العيني</span>
                    <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded font-sans">حالة العقار</span>
                  </h4>
                  <div className="flex flex-wrap gap-2 max-h-[160px] overflow-y-auto pr-1">
                    {distributionData.registered.map(([reg, count]) => {
                      const isActive = filters.registered === reg;
                      const isReg = reg === 'مسجل عينيا';
                      return (
                        <button
                          key={reg}
                          onClick={() => handleTogglePillFilter('registered', reg)}
                          className={`analytics-pill text-xs flex items-center gap-1.5 ${isActive ? 'active ring-1 ring-brand-primary/30' : 'text-slate-300'}`}
                        >
                          <span className={`font-bold ${isReg ? 'text-emerald-400' : 'text-brand-accent'}`}>{reg}</span>
                          <span className={`count font-sans rounded-full px-1.5 py-0.5 text-[10px] ${isReg ? 'bg-emerald-950/40 text-emerald-400' : 'bg-red-950/40 text-brand-accent'}`}>{count}</span>
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
                  <h3 className="text-lg font-extrabold text-white">بيانات صكوك الأصول العقارية والشركاء</h3>
                  <span className="bg-brand-primary/10 text-brand-primary border border-brand-primary/20 text-xs font-black px-3 py-1 rounded-full font-sans">
                    {filteredData.length} منشأة/عقار
                  </span>
                </div>
                
                <p className="text-xs text-slate-400 font-bold">
                  انقر على أي صف لاستعراض التفاصيل الكاملة ووثيقة الصك
                </p>
              </div>

              {/* Main Responsive Table wrapper */}
              <div className="overflow-x-auto neu-pressed p-2 rounded-2xl mb-6 border border-slate-900">
                <table className="w-full text-right border-collapse whitespace-nowrap text-sm">
                  <thead className="sticky top-0 bg-[#121926] z-10">
                    <tr className="text-brand-primary border-b border-slate-800">
                      <th className="py-4 px-5 font-extrabold text-brand-primary">رقم العقار (D)</th>
                      <th className="py-4 px-5 font-extrabold text-slate-300">رقم الوثيقة (E)</th>
                      <th className="py-4 px-5 font-extrabold text-center text-slate-300">المساحة (م²)</th>
                      <th className="py-4 px-5 font-extrabold text-slate-300">المدينة - الحي</th>
                      <th className="py-4 px-5 font-extrabold text-center text-slate-300">حالة التسجيل</th>
                      <th className="py-4 px-5 font-extrabold text-slate-300 max-w-xs">ملاحظة</th>
                      <th className="py-4 px-5 font-extrabold text-center text-slate-300">الروابط الرسمية</th>
                    </tr>
                  </thead>
                  
                  <tbody className="divide-y divide-slate-800/40">
                    {paginatedData.map((item, idx) => {
                      const displayLoc = [item.city, item.district].filter(Boolean).join(' - ') || '-';
                      const isRegistered = item.registered === 'مسجل عينيا';

                      return (
                        <tr 
                          key={idx}
                          onClick={() => setSelectedAsset(item)}
                          className="hover:bg-[#1C2538] transition-all duration-150 cursor-pointer group"
                        >
                          {/* Prop Number */}
                          <td className="py-4 px-5 font-black text-brand-primary font-sans text-right transition-transform group-hover:translate-x-1" dir="ltr">
                            {item.propNum || '-'}
                          </td>

                          {/* Doc Number */}
                          <td className="py-4 px-5 font-bold text-slate-200 font-sans text-right" dir="ltr">
                            {item.docNum || '-'}
                          </td>

                          {/* Area */}
                          <td className="py-4 px-5 font-bold text-slate-300 font-sans text-center" dir="ltr">
                            {formatArea(item.area)}
                          </td>

                          {/* City & District */}
                          <td className="py-4 px-5 font-bold text-slate-300">
                            {displayLoc}
                          </td>

                          {/* Registration Status */}
                          <td className="py-4 px-5 text-center">
                            {isRegistered ? (
                              <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/20 inline-flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5" /> مسجل عينياً
                              </span>
                            ) : (
                              <span className="bg-red-500/10 text-brand-accent px-3 py-1 rounded-full text-xs font-bold border border-red-500/20 inline-flex items-center gap-1">
                                <XCircle className="w-3.5 h-3.5" /> غير مسجل
                              </span>
                            )}
                          </td>

                          {/* Notes */}
                          <td className="py-4 px-5 text-xs text-slate-400 max-w-[200px] truncate" title={item.notes}>
                            {item.notes || '-'}
                          </td>

                          {/* Actions / Links */}
                          <td className="py-4 px-5" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-2">
                              {item.linkReg ? (
                                <a 
                                  href={item.linkReg} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  title="رابط السجل العقاري"
                                  className="p-2.5 neu-btn text-brand-primary rounded-xl hover:text-emerald-400 transition-colors border border-slate-800"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              ) : (
                                <span className="p-2.5 text-slate-600" title="لا يوجد رابط للسجل العقاري">
                                  <ExternalLink className="w-4 h-4 opacity-30" />
                                </span>
                              )}

                              {item.linkMoj ? (
                                <a 
                                  href={item.linkMoj} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  title="رابط وزارة العدل"
                                  className="p-2.5 neu-btn text-brand-primary rounded-xl hover:text-purple-400 transition-colors border border-slate-800"
                                >
                                  <Scale className="w-4 h-4" />
                                </a>
                              ) : (
                                <span className="p-2.5 text-slate-600" title="لا يوجد رابط لوزارة العدل">
                                  <Scale className="w-4 h-4 opacity-30" />
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Empty Search results */}
                {filteredData.length === 0 && (
                  <div className="text-center py-16 text-slate-500 font-extrabold flex flex-col items-center justify-center">
                    <div className="p-4 bg-slate-900 rounded-full mb-3 shadow-inner">
                      <ShieldAlert className="w-12 h-12 text-brand-accent opacity-60" />
                    </div>
                    <p className="text-base text-slate-300 mb-1">لا توجد أصول عقارية تطابق فلاتر البحث الحالية.</p>
                    <p className="text-xs text-slate-500">جرب تقليل الفلاتر للحصول على نتائج أدق.</p>
                  </div>
                )}
              </div>

              {/* Pagination Controls */}
              {filteredData.length > 0 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-3 border-t border-slate-800/60">
                  <div className="text-xs text-slate-400 font-bold">
                    عرض السجلات من <span className="font-sans text-brand-primary">{(currentPage - 1) * itemsPerPage + 1}</span> إلى <span className="font-sans text-brand-primary">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> من أصل <span className="font-sans text-brand-primary">{filteredData.length}</span> عقار
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Previous Button */}
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      className={`neu-btn p-2 rounded-xl text-brand-primary ${currentPage === 1 ? 'opacity-35 cursor-not-allowed' : ''}`}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>

                    {/* Page Numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum = currentPage;
                        if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        if (pageNum <= 0 || pageNum > totalPages) return null;

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${currentPage === pageNum ? 'neu-pressed text-brand-primary border border-brand-primary/20' : 'neu-btn text-slate-400 border border-transparent'}`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    {/* Next Button */}
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      className={`neu-btn p-2 rounded-xl text-brand-primary ${currentPage === totalPages ? 'opacity-35 cursor-not-allowed' : ''}`}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

            </div>
            </>
            ) : activeTab === 'rentals' ? (
              <RentalsSection
                rentalsRaw={rentalsRaw}
                rentalFilters={rentalFilters}
                setRentalFilters={setRentalFilters}
                sortedRentals={sortedRentals}
                paginatedRentals={paginatedRentals}
                currentRentalPage={currentRentalPage}
                setCurrentRentalPage={setCurrentRentalPage}
                totalRentalPages={totalRentalPages}
                rentalKpis={rentalKpis}
                rentalAnalyticsData={rentalAnalyticsData}
                rentalFilterOptions={rentalFilterOptions}
                handleResetRentalFilters={handleResetRentalFilters}
                handleToggleRentalPillFilter={handleToggleRentalPillFilter}
                formatArea={formatArea}
                formatCurrency={formatCurrency}
                parseRemainingDays={parseRemainingDays}
              />
            ) : activeTab === 'agencies' ? (
              <AgenciesSection
                agenciesRaw={agenciesRaw}
                agencyFilters={agencyFilters}
                setAgencyFilters={setAgencyFilters}
                handleResetAgencyFilters={handleResetAgencyFilters}
                parseRemainingDays={parseRemainingDays}
              />
            ) : activeTab === 'tasks' ? (
              <TasksSection
                tasksRaw={tasksRaw}
                casesRaw={casesRaw}
                loading={tasksLoading}
                error={tasksError}
                onRefresh={() => {
                  setTasksLoading(true);
                  // Trigger reload
                  window.location.reload();
                }}
              />
            ) : activeTab === 'analytics' ? (
              <AnalyticsSection casesRaw={casesRaw} />
            ) : (
              <CasesSection />
            )}




            {/* Elegant Brand Footer (As requested based on attached image) */}
            <div className="flex flex-col items-center justify-center text-center mt-16 pt-16 border-t border-slate-800/40 pb-12">
              <a 
                href="https://indigo-armadillo-445421.hostingersite.com/#hero" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group flex flex-col items-center cursor-pointer mb-6"
                title="انقر لزيارة موقع رصانة"
              >
                {/* Premium Golden Shield Logo resembling the image */}
                <div className="w-20 h-20 rounded-3xl bg-[#0F1422] border-2 border-brand-primary/20 flex items-center justify-center relative mb-5 shadow-2xl group-hover:scale-105 group-hover:border-brand-primary/50 transition-all duration-300">
                  {/* Outer subtle glow ring */}
                  <div className="absolute -inset-[3px] rounded-[28px] border border-brand-primary/10 group-hover:border-brand-primary/30 transition-colors"></div>
                  
                  {/* Double ring inside */}
                  <div className="absolute inset-1.5 rounded-[20px] border border-brand-primary/5"></div>
                  
                  {/* Shield SVG with Gold Stroke and Centered Arrow */}
                  <svg className="w-9 h-9 text-brand-primary relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <polyline points="12 15 12 9" />
                    <polyline points="9 12 12 9 15 12" />
                  </svg>
                </div>

                {/* Typography pairing */}
                <h3 className="text-3xl font-black text-white tracking-wide mb-1.5 group-hover:text-brand-primary transition-colors duration-200">
                  رَصَانَة
                </h3>
                <span className="font-mono text-xs tracking-[0.45em] text-brand-primary font-bold mr-[0.45em] transition-opacity duration-200">
                  RASANA
                </span>
              </a>

              {/* Bio / Description */}
              <p className="max-w-3xl text-sm md:text-base text-slate-400 leading-relaxed px-6 mb-10 font-medium">
                نبني كيانات مستقرة. نصنع حلولاً رصينة. استشارات إدارية وقانونية وذكاء اصطناعي للارتقاء بأداء المنشآت الوطنية نحو رؤية المملكة ٢٠٣٠.
              </p>

              {/* Thin horizontal line */}
              <div className="w-28 h-[1px] bg-slate-800/80 mb-6"></div>

              {/* Copyright Statement */}
              <p className="text-xs text-slate-500 font-semibold tracking-wide">
                جميع الحقوق محفوظة © ٢٠٢٦ شركة رصانة للاستشارات.
              </p>
            </div>

          </motion.div>
        )}

      </main>

      {/* Details Modal */}
      <AnimatePresence>
        {selectedAsset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Modal Backdrop overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAsset(null)}
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
                    <Home className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">التفاصيل الشاملة والبيانات الفنية للعقار</h3>
                    <p className="text-xs text-brand-primary mt-0.5 font-sans">
                      منصة رصانة لإدارة الأصول وصكوك الملكية
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedAsset(null)}
                  className="neu-btn p-2 rounded-full text-brand-accent hover:bg-red-950/40 hover:text-red-500 transition-colors border border-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrolling Content */}
              <div className="overflow-y-auto pr-1 flex-1 custom-scrollbar">
                
                {/* 4x3 Grid of parameters */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  
                  {/* A: Ownership الجهة المالكة */}
                  <div className="neu-pressed p-4 rounded-xl flex items-center gap-3 border border-slate-800/40">
                    <div className="p-2.5 bg-slate-900 rounded-lg text-brand-primary shadow-inner">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500">الجهة المالكة (ملكيتها)</span>
                      <span className="font-extrabold text-slate-200 text-sm">{selectedAsset.ownership || '-'}</span>
                    </div>
                  </div>

                  {/* B: ID / National Number */}
                  <div className="neu-pressed p-4 rounded-xl flex items-center gap-3 border border-slate-800/40">
                    <div className="p-2.5 bg-slate-900 rounded-lg text-brand-primary shadow-inner">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500">الهوية / الرقم الموحد</span>
                      <span className="font-extrabold text-slate-200 text-sm font-sans" dir="ltr">{selectedAsset.idNum || '-'}</span>
                    </div>
                  </div>

                  {/* C: General Number */}
                  <div className="neu-pressed p-4 rounded-xl flex items-center gap-3 border border-slate-800/40">
                    <div className="p-2.5 bg-slate-900 rounded-lg text-brand-primary shadow-inner">
                      <Hash className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500">الرقم العام للنظام</span>
                      <span className="font-extrabold text-slate-200 text-sm font-sans" dir="ltr">{selectedAsset.genNum || '-'}</span>
                    </div>
                  </div>

                  {/* D: Property Number */}
                  <div className="neu-pressed p-4 rounded-xl flex items-center gap-3 border border-slate-800/40">
                    <div className="p-2.5 bg-slate-900 rounded-lg text-brand-primary shadow-inner">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500">رقم العقار الرسمي</span>
                      <span className="font-extrabold text-brand-primary text-sm font-sans" dir="ltr">{selectedAsset.propNum || '-'}</span>
                    </div>
                  </div>

                  {/* E: Document/Deed Number */}
                  <div className="neu-pressed p-4 rounded-xl flex items-center gap-3 border border-slate-800/40">
                    <div className="p-2.5 bg-slate-900 rounded-lg text-brand-primary shadow-inner">
                      <FileDigit className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500">رقم وثيقة التملك / الصك</span>
                      <span className="font-extrabold text-slate-200 text-sm font-sans" dir="ltr">{selectedAsset.docNum || '-'}</span>
                    </div>
                  </div>

                  {/* F: Deed Date */}
                  <div className="neu-pressed p-4 rounded-xl flex items-center gap-3 border border-slate-800/40">
                    <div className="p-2.5 bg-slate-900 rounded-lg text-brand-primary shadow-inner">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500">تاريخ إصدار الصك</span>
                      <span className="font-extrabold text-slate-200 text-sm font-sans" dir="ltr">{selectedAsset.deedDate || '-'}</span>
                    </div>
                  </div>

                  {/* G: Area */}
                  <div className="neu-pressed p-4 rounded-xl flex items-center gap-3 border border-slate-800/40">
                    <div className="p-2.5 bg-slate-900 rounded-lg text-brand-primary shadow-inner">
                      <Maximize2 className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500">إجمالي المساحة بالمتر المربع</span>
                      <span className="font-extrabold text-slate-200 text-sm font-sans" dir="ltr">
                        {formatArea(selectedAsset.area)} <span className="text-xs text-slate-500 font-normal">م²</span>
                      </span>
                    </div>
                  </div>

                  {/* H: Plan Number */}
                  <div className="neu-pressed p-4 rounded-xl flex items-center gap-3 border border-slate-800/40">
                    <div className="p-2.5 bg-slate-900 rounded-lg text-brand-primary shadow-inner">
                      <Map className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500">رقم المخطط المعتمد</span>
                      <span className="font-extrabold text-slate-200 text-sm font-sans" dir="ltr">{selectedAsset.planNum || '-'}</span>
                    </div>
                  </div>

                  {/* I: Piece Number */}
                  <div className="neu-pressed p-4 rounded-xl flex items-center gap-3 border border-slate-800/40">
                    <div className="p-2.5 bg-slate-900 rounded-lg text-brand-primary shadow-inner">
                      <Grid className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500">رقم قطعة الأرض</span>
                      <span className="font-extrabold text-slate-200 text-sm font-sans" dir="ltr">{selectedAsset.pieceNum || '-'}</span>
                    </div>
                  </div>

                  {/* J, K: Full Location */}
                  <div className="neu-pressed p-4 rounded-xl flex items-center gap-3 md:col-span-2 lg:col-span-1 border border-slate-800/40">
                    <div className="p-2.5 bg-slate-900 rounded-lg text-brand-primary shadow-inner">
                      <Navigation className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500">العنوان الجغرافي (المدينة - الحي)</span>
                      <span className="font-extrabold text-slate-200 text-sm">
                        {[selectedAsset.city, selectedAsset.district].filter(Boolean).join(' - ') || '-'}
                      </span>
                    </div>
                  </div>

                  {/* O: Ownership Type */}
                  <div className="neu-pressed p-4 rounded-xl flex items-center gap-3 border border-slate-800/40">
                    <div className="p-2.5 bg-slate-900 rounded-lg text-brand-primary shadow-inner">
                      <Landmark className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500">نوع الصك / صفة الملكية</span>
                      <span className="font-extrabold text-slate-200 text-sm">{selectedAsset.ownershipType || '-'}</span>
                    </div>
                  </div>

                  {/* P: Registered Eye-Level */}
                  <div className="neu-pressed p-4 rounded-xl flex items-center gap-3 border border-slate-800/40">
                    <div className="p-2.5 bg-slate-900 rounded-lg text-brand-primary shadow-inner">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500">التسجيل العيني للعقار</span>
                      {selectedAsset.registered === 'مسجل عينيا' ? (
                        <span className="font-extrabold text-emerald-400 text-sm flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" /> مسجل عينياً
                        </span>
                      ) : (
                        <span className="font-extrabold text-brand-accent text-sm flex items-center gap-1">
                          <XCircle className="w-4 h-4" /> غير مسجل
                        </span>
                      )}
                    </div>
                  </div>

                </div>

                {/* N: Notes Section with nice quote style */}
                <div className="neu-pressed p-4 rounded-2xl mb-6 border-r-4 border-amber-500 bg-amber-500/5">
                  <h4 className="text-xs font-extrabold text-slate-400 mb-2.5 flex items-center gap-2">
                    <StickyNote className="w-4 h-4 text-brand-primary" /> الملاحظات والبيانات الاستدلالية المرفقة
                  </h4>
                  <p className="text-sm font-semibold text-slate-300 leading-relaxed min-h-[3rem]">
                    {selectedAsset.notes && selectedAsset.notes.trim() !== '' 
                      ? selectedAsset.notes 
                      : 'لا توجد ملاحظات أو قيود نظامية إضافية مسجلة على هذا الصك في الوقت الراهن.'}
                  </p>
                </div>

                {/* Q, R Links Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 mt-6 pt-6 border-t border-slate-800">
                  {selectedAsset.linkReg ? (
                    <a 
                      href={selectedAsset.linkReg} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="neu-btn flex-1 py-4 px-4 rounded-xl font-extrabold text-brand-primary flex items-center justify-center gap-2 text-sm hover:text-emerald-400 transition-colors border border-slate-800"
                    >
                      <ExternalLink className="w-4 h-4" /> استعراض الصك بالسجل العقاري
                    </a>
                  ) : (
                    <button 
                      disabled
                      className="neu-btn flex-1 py-4 px-4 rounded-xl font-extrabold text-slate-500 opacity-40 flex items-center justify-center gap-2 text-sm cursor-not-allowed border border-slate-800/40"
                    >
                      <ExternalLink className="w-4 h-4" /> رابط السجل العقاري غير متاح
                    </button>
                  )}

                  {selectedAsset.linkMoj ? (
                    <a 
                      href={selectedAsset.linkMoj} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="neu-btn flex-1 py-4 px-4 rounded-xl font-extrabold text-brand-primary flex items-center justify-center gap-2 text-sm hover:text-purple-400 transition-colors border border-slate-800"
                    >
                      <Scale className="w-4 h-4" /> التحقق من وثيقة وزارة العدل
                    </a>
                  ) : (
                    <button 
                      disabled
                      className="neu-btn flex-1 py-4 px-4 rounded-xl font-extrabold text-slate-500 opacity-40 flex items-center justify-center gap-2 text-sm cursor-not-allowed border border-slate-800/40"
                    >
                      <Scale className="w-4 h-4" /> وثيقة وزارة العدل غير متاحة
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
