export interface RealEstateAsset {
  ownership: string;       // A: ملكيتها
  idNum: string;           // B: الهوية او رقم الموحد
  genNum: string;          // C: رقم
  propNum: string;         // D: رقم العقار
  docNum: string;          // E: رقم الوثيقه
  deedDate: string;        // F: تاريخ الصك
  area: string;            // G: المساحة
  planNum: string;         // H: رقم المخطط
  pieceNum: string;        // I: رقم القطعة
  district: string;        // J: الحي
  city: string;            // K: المدينة
  notes: string;           // N: ملاحظة
  ownershipType: string;   // O: الملكية
  registered: 'مسجل عينيا' | 'غير مسجل'; // P: مسجل عينيا (parsed from TRUE/FALSE)
  linkReg: string;         // Q: رابط السجل العقاري
  linkMoj: string;         // R: رابط وثيقة وزارة العدل
}

export interface FilterState {
  ownership: string;
  city: string;
  district: string;
  registered: string;
  propNum: string;
  docNum: string;
  area: string;
}

export interface RentalContract {
  contractId: string;      // B: رقم سجل العقد
  startDate: string;       // C: تاريخ بداية مدة الإيجار
  endDate: string;         // C: تاريخ نهاية مدة الإيجار
  remainingDays: string;   // E: المتبقي على انتهاء العقد
  tenantName: string;      // F: اسم المستأجر
  unifiedId: string;       // G: الرقم الموحد
  annualRent: string;      // H: القيمة السنوية للإيجار
  totalPayments: string;   // J: اجمالي الدفعات
  paymentTerm: string;     // K: الدفعة
  dueDate: string;         // L: تاريخ الاستحقاق
  dueRemainingDays: string;// M: المتبقي على الاستحقاق
  propNum: string;         // N: رقم العقار
  docNum: string;          // O: رقم الوثيقه
  area: string;            // Q: المساحة
  district: string;        // T: الحي
  city: string;            // U: المدينة
  notes: string;           // X: ملاحظة
  ownership: string;       // Y: الملكية
  registered: string;      // Z: مسجل عينيا
  linkReg: string;         // AA: رابط السجل العقاري
  linkMoj: string;         // AB: رابط وثيقة وزارة العدل
  rentalLink: string;      // AE: عقد الإيجار
  caseId: string;          // AF: رقم القضية
  caseStatus: string;      // AG: حالتها
}

export interface RentalFilterState {
  contractId: string;
  tenantName: string;
  unifiedId: string;
  propNum: string;
  area: string;
  lawsuitRaised: string; // 'all' | 'yes' | 'no'
  caseId: string;
  caseStatus: string;
  city: string;
  district: string;
  urgency: string; // 'all' | 'critical' | 'warning' | 'active_case' | 'normal'
}

export interface AgencyPoa {
  poaNumber: string;        // A: رقم الوكالة
  hijriDate: string;        // B: تاريخها بالهجري
  gregorianDate: string;    // C: تاريخها بالميلادي
  expiryDate: string;       // D: تاريخ الانتهاء
  remainingDays: string;    // E: المتبقي على الانتهاء
  principalName: string;    // F: الموكل
  principalId: string;      // G: هوية الموكل
  agentName: string;        // H: الوكيل
  agentId: string;          // I: هوية الوكيل
  agencyTitle: string;      // J: اسم الوكالة
  notes: string;            // K: ملاحظة
  docLink: string;          // L: رابط الوكالة
}

export interface AgencyFilterState {
  poaNumber: string;
  name: string; // principal or agent name search
  status: 'all' | 'active' | 'expired' | 'warning'; // 'warning' = 1..30 days
}

export interface DetailedCase {
  caseNumber: string;       // A: رقم القضية
  classification: string;   // B: تصنيف القضية
  caseType: string;         // C: نوع القضية
  caseDate: string;         // D: تاريخ القضية
  plaintiff: string;        // E: المدعي
  plaintiffId: string;      // F: هوية المدعي
  defendant: string;        // G: المدعى عليه
  defendantId: string;      // H: هوية المدعى عليه
  claims: string;           // I: طلبات
  court: string;            // J: المحكمة
  circuit: string;          // K: الدائرة
  driveLink: string;        // L: رابط ملف القضية في قوقل درايف
  caseStatus: string;       // M: حالة القضية
  caseManager: string;      // N: المسؤول عن القضية
  currentSituation: string; // P: القضية حالها
  fileNameQ: string;        // Q: اسم الملف
  requestType: string;      // R: نوع الطلب
  completedCases: string;   // S: القضايا المنجزة
  reportDate: string;       // T: تاريخ رفع التقرير
  notes: string;            // U: ملاحظات
  instrumentDeed: string;   // V: الصك
  rawRow: string[];
}

export interface TaskItem {
  id: string;
  mainPhase: string;          // A: المرحلة الرئيسية
  taskName: string;           // B: اسم المهمة
  importance: string;         // C: أهمية المهمة
  startDate: string;          // D: تاريخ البداية
  endDate: string;            // E: تاريخ النهاية
  assignee: string;           // F: المسؤول
  status: string;             // G: حالة الإنجاز
  progressPercentage: number; // 0..100
  notes: string;              // additional notes
  rawRow: string[];
  linkedCase?: DetailedCase;  // Matched case from cases sheet
}

export interface TaskFilterState {
  searchQuery: string;
  mainPhase: string;
  importance: string;
  assignee: string;
  status: string;
}

export interface HearingRecord {
  id: string;
  caseNumber: string;       // Linked case number
  recordNumber: string;     // S: رقم الضبط
  hearingDate: string;      // N: تاريخ الجلسة بالميلادي
  hijriDate?: string;       // M: تاريخ الجلسة بالهجري
  hearingTime: string;      // O: الساعة
  status: string;           // R: الحالة
  link: string;             // Q: رابط الجلسة
  rawRow: string[];
}

export interface MemoRecord {
  id: string;
  caseNumber: string;       // Linked case number
  memoNumber: string;       // S: رقم المذكرة
  task: string;             // M: المهمة
  dueDate: string;          // N: تاريخ التسليم
  status: string;           // P: الحالة
  actualDeliveryDate: string;// Q: تاريخ التسليم الفعلي
  attachmentLink: string;   // R: مرفق المذكرة
  rawRow: string[];
}

export interface JudgmentRecord {
  id: string;
  caseNumber: string;       // Linked case number
  judgmentStatus: string;   // M: حالة الحكم
  instrumentNumber: string; // N: رقم الصك
  judgmentDate: string;     // P: تاريخ الحكم بالميلادي
  deedDocument: string;     // S: صك الحكم
  appealStatus: string;     // V: حالة الإستئناف
  appealDocument: string;   // AA: صك الاستئناف
  rawRow: string[];
}

export interface CaseFilterState {
  caseNumber: string;
  caseStatus: 'all' | 'under_review' | 'finished';
  court: string;
  circuit: string;
  plaintiff: string;
  defendant: string;
}


