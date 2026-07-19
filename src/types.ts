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

