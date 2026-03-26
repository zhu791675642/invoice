// 发票审核工具函数

/**
 * 统一车牌格式：ATA713 → A.TA713（总共6位：1位+点+5位）
 */
function normalizeCarPlate(plate) {
  if (!plate) return '';
  
  // 去掉多余的空格
  plate = plate.trim();
  
  // 如果已经是 A.TA713 格式（6位：1个大写字母 + 点 + 5位大写字母/数字），直接返回
  if (/^[A-Z]\.[A-Z0-9]{5}$/.test(plate)) {
    return plate;
  }
  
  // 如果是 ATA713 格式（6位：1个大写字母 + 5位大写字母/数字），转换为 A.TA713
  if (/^[A-Z][A-Z0-9]{5}$/.test(plate)) {
    return plate.charAt(0) + '.' + plate.substring(1);
  }
  
  // 如果是 A.AU7761 格式（7位，多了一位），需要截断
  if (/^[A-Z]\.[A-Z0-9]{6}$/.test(plate)) {
    // 取前 6 位：A + . + 前 5 位
    return plate.substring(0, 7); // A.AU776 → 去掉最后一位
  }
  
  // 如果是 ATA7761 格式（7位，多了一位），需要截断
  if (/^[A-Z][A-Z0-9]{6}$/.test(plate)) {
    // 取前 6 位：A + TA713
    return plate.charAt(0) + '.' + plate.substring(1, 6);
  }
  
  // 如果是 A.CQ3466 格式但多了点，去掉多余的点
  if (/^[A-Z]\.\./.test(plate)) {
    return plate.replace(/\.\./, '.');
  }
  
  return plate;
}

/**
 * 发票审核主流程（基于您提供的代码逻辑）
 * @param {Array} invoiceList - 发票对象数组
 * @returns {Object} 审核结果 { status, exceptions, summary }
 */
export function invoiceAuditFlow(invoiceList) {
  // 动态获取当前日期
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  
  // ----- 内部辅助函数 -----
  
  // 解析日期（支持中文格式）
  function parseDate(dateStr) {
    // 处理中文格式：2026年03月20日
    const chineseMatch = dateStr.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/);
    if (chineseMatch) {
      const [, year, month, day] = chineseMatch;
      return new Date(year, parseInt(month) - 1, parseInt(day));
    }
    
    // 处理标准格式：2026-03-20
    const standardMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (standardMatch) {
      const [, year, month, day] = standardMatch;
      return new Date(year, parseInt(month) - 1, parseInt(day));
    }
    
    // 尝试直接解析
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  }
  
  // 检查日期是否有效
  function isValidDate(date) {
    return date && !isNaN(date.getTime());
  }
  
  // 检查日期是否在范围内（包含边界）
  function isDateBetween(date, start, end) {
    return date >= start && date <= end;
  }
  
  // 检查日期是否在之后
  function isDateAfter(date, target) {
    return date > target;
  }

  // 1. 字段完整性+格式校验
  function checkFieldValidity(invoice) {
    const requiredFields = ['invoiceNumber', 'invoiceDate', 'carPlate', 'hasSeal1', 'hasSeal2'];
    for (let field of requiredFields) {
      if (invoice[field] === undefined || invoice[field] === null || invoice[field] === '') {
        return { valid: false, reason: `字段缺失: ${field}` };
      }
    }
    
    // 发票号：8位数字
    if (!/^\d{8}$/.test(invoice.invoiceNumber)) {
      return { valid: false, reason: '发票号格式错误（非8位数字）' };
    }
    
    // 日期格式校验（使用 parseDate）
    const parsedDate = parseDate(invoice.invoiceDate);
    if (!isValidDate(parsedDate)) {
      return { valid: false, reason: '日期格式错误' };
    }
    
    // ✅ 车牌格式：先格式化，再校验
    const normalizedPlate = normalizeCarPlate(invoice.carPlate);
    if (!/^[A-Z]\.[A-Z0-9]{5}$/.test(normalizedPlate)) {
      return { valid: false, reason: '车牌格式错误' };
    }
    
    return { valid: true };
  }

  // 2. 印章校验
  function checkSeal(invoice) {
    if (!invoice.hasSeal1 || !invoice.hasSeal2) {
      return { type: '异常', reason: '缺章' };
    }
    return null;
  }

  // 3. 日期有效性校验
  function checkDateValidity(invoiceDate) {
    const invoice = parseDate(invoiceDate);
    if (!isValidDate(invoice)) {
      return { type: '异常', reason: '日期格式错误' };
    }
    
    // 日期超前检查
    if (isDateAfter(invoice, currentDate)) {
      return { type: '异常', reason: '日期超前' };
    }

    let isValid = false;
    if (currentMonth <= 4) {
      // 当前在1-4月：允许上一年7月1日 ~ 当前日期
      const startOfPrevJul = new Date(currentYear - 1, 6, 1); // 7月1日
      isValid = isDateBetween(invoice, startOfPrevJul, currentDate);
    } else {
      // 当前在5-12月：允许当年1月1日 ~ 12月31日
      const startOfYear = new Date(currentYear, 0, 1); // 1月1日
      const endOfYear = new Date(currentYear, 11, 31); // 12月31日
      isValid = isDateBetween(invoice, startOfYear, endOfYear);
    }
    
    if (!isValid) {
      return { type: '异常', reason: '过期/未生效' };
    }
    return null;
  }

  // 4. 发票号批量校验（重复 + 连号）
  function checkInvoiceNos(invoiceList) {
    const exceptions = [];
    const nos = invoiceList.map(i => i.invoiceNumber);

    // 重复检查
    if (new Set(nos).size !== nos.length) {
      exceptions.push({ type: '异常', reason: '发票号重复' });
    }

    // 连号检查：按前4位 + 后4位前两位分组，同组数量≥2即警告
    const groups = {};
    for (let no of nos) {
      const prefix = no.slice(0, 4);
      const suffixPrefix = no.slice(4, 6);
      const key = `${prefix}-${suffixPrefix}`;
      groups[key] = (groups[key] || 0) + 1;
    }
    const hasConsecutive = Object.values(groups).some(count => count >= 2);
    if (hasConsecutive) {
      exceptions.push({ type: '警告', reason: '发票连号' });
    }

    return exceptions;
  }

  // 5. 车牌批量校验（多车牌警告）
  function checkCarPlates(invoiceList) {
    // ✅ 先格式化所有车牌，再比较
    const plates = invoiceList.map(i => normalizeCarPlate(i.carPlate));
    if (new Set(plates).size > 1) {
      return { type: '警告', reason: '多车牌混用' };
    }
    return null;
  }

  // ----- 执行审核流程 -----
  let exceptions = [];

  // 步骤1：字段完整性+格式校验
  for (let invoice of invoiceList) {
    const fieldCheck = checkFieldValidity(invoice);
    if (!fieldCheck.valid) {
      exceptions.push({ type: '异常', reason: `读取/格式错误: ${fieldCheck.reason}` });
    }
  }
  
  // 如果有字段错误，直接返回
  if (exceptions.length > 0) {
    return summarizeExceptions(exceptions);
  }

  // 步骤2：核心校验
  for (let invoice of invoiceList) {
    const sealEx = checkSeal(invoice);
    if (sealEx) exceptions.push(sealEx);

    const dateEx = checkDateValidity(invoice.invoiceDate);
    if (dateEx) exceptions.push(dateEx);
  }

  exceptions.push(...checkInvoiceNos(invoiceList));

  const plateEx = checkCarPlates(invoiceList);
  if (plateEx) exceptions.push(plateEx);

  // 步骤3：汇总结果
  return summarizeExceptions(exceptions);

  // ----- 辅助汇总函数 -----
  function summarizeExceptions(exceptions) {
    const rejectExceptions = exceptions.filter(e => e.type === '异常');
    const warnExceptions = exceptions.filter(e => e.type === '警告');

    let status = '审核通过';
    let summary = '所有发票均符合审核标准';
    
    if (rejectExceptions.length > 0) {
      status = '审核不通过';
      summary = `发现 ${rejectExceptions.length} 个异常问题`;
    } else if (warnExceptions.length > 0) {
      status = '需人工复核';
      summary = `发现 ${warnExceptions.length} 个警告问题`;
    }

    return { 
      status, 
      exceptions,
      summary,
      rejectCount: rejectExceptions.length,
      warnCount: warnExceptions.length
    };
  }
}

// 格式化日期显示
export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

// 获取审核状态颜色
export function getAuditStatusColor(status) {
  switch (status) {
    case '审核通过': return 'bg-green-100 text-green-800';
    case '需人工复核': return 'bg-yellow-100 text-yellow-800';
    case '审核不通过': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}