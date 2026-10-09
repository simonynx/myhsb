/**
 * 房间闲时价（分时定价）规则解析 —— 与后端 user/services/room_pricing.py 保持同一套逻辑
 *
 * 规则来自 Room.offpeak_rules：
 *   [{ label, weekdays: [1..7], hour_start, hour_end, price_per_hour }]
 * - weekdays 用 ISO 编号：1=周一 … 7=周日
 * - hour_start/hour_end 为 24 小时制整点、左闭右开
 * - 整段使用时间全部落在同一窗口内才生效，跨窗口按门市价
 * - 只折小时费，不含每人入场费
 */

const WEEKDAY_TEXT = ['一', '二', '三', '四', '五', '六', '日'];

function toInt(value) {
  const num = parseInt(value, 10);
  return isNaN(num) ? null : num;
}

function normalizeRules(room) {
  const raw = room && room.offpeak_rules;
  if (!Array.isArray(raw)) return [];
  const rules = [];
  raw.forEach(function(item) {
    if (!item || typeof item !== 'object') return;
    const weekdays = [];
    (Array.isArray(item.weekdays) ? item.weekdays : []).forEach(function(value) {
      const day = toInt(value);
      if (day !== null && day >= 1 && day <= 7 && weekdays.indexOf(day) === -1) {
        weekdays.push(day);
      }
    });
    if (!weekdays.length) return;
    const hourStart = toInt(item.hour_start);
    const hourEnd = toInt(item.hour_end);
    const price = toInt(item.price_per_hour);
    if (hourStart === null || hourEnd === null || price === null) return;
    if (!(hourStart >= 0 && hourStart < hourEnd && hourEnd <= 24)) return;
    if (price <= 0) return;
    rules.push({
      label: String(item.label || '').trim(),
      weekdays: weekdays.sort(function(a, b) { return a - b; }),
      hour_start: hourStart,
      hour_end: hourEnd,
      price_per_hour: price,
      source: item.source || '',
      // coupon_allowed: false 表示命中本条规则的订单禁用优惠券
      coupon_allowed: item.coupon_allowed !== false,
    });
  });
  return rules;
}

/** 'YYYY-MM-DD' -> ISO 星期（1=周一…7=周日）；解析失败返回 0 */
function isoWeekday(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return 0;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return 0;
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (isNaN(date.getTime())) return 0;
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

/** [[10,12],[12,13]] -> [10,11,12] */
function hoursFromTimeList(timeList) {
  const hours = [];
  (Array.isArray(timeList) ? timeList : []).forEach(function(slot) {
    if (!Array.isArray(slot) || slot.length !== 2) return;
    const start = toInt(slot[0]);
    const end = toInt(slot[1]);
    if (start === null || end === null || end <= start) return;
    for (let hour = start; hour < end; hour++) {
      if (hour >= 0 && hour <= 24 && hours.indexOf(hour) === -1) hours.push(hour);
    }
  });
  return hours.sort(function(a, b) { return a - b; });
}

function matchRule(rules, weekday, hourStartUsed, hourEndUsed) {
  if (!weekday || hourStartUsed === null || hourEndUsed === null) return null;
  if (hourEndUsed <= hourStartUsed) return null;
  // 与后端一致：多条规则同时命中时取小时单价最低的一条（对顾客更优）
  var matched = null;
  for (var i = 0; i < rules.length; i++) {
    var rule = rules[i];
    if (rule.weekdays.indexOf(weekday) === -1) continue;
    if (hourStartUsed >= rule.hour_start && hourEndUsed <= rule.hour_end) {
      if (!matched || rule.price_per_hour < matched.price_per_hour) matched = rule;
    }
  }
  return matched;
}

/**
 * 解析某次预约生效的小时单价
 * @returns {{ price:number, rule:object|null, isOffpeak:boolean, label:string }}
 */
function resolveHourPrice(room, dateStr, timeList) {
  const base = toInt(room && room.price_per_hour) || 0;
  const fallback = { price: base, rule: null, isOffpeak: false, label: '' };
  const hours = hoursFromTimeList(timeList);
  if (!hours.length) return fallback;
  const weekday = isoWeekday(dateStr);
  if (!weekday) return fallback;
  const rule = matchRule(normalizeRules(room), weekday, hours[0], hours[hours.length - 1] + 1);
  if (!rule) return fallback;
  return {
    price: rule.price_per_hour,
    rule: rule,
    isOffpeak: true,
    label: rule.label || '闲时特惠',
  };
}

/** 只取生效单价（数字），供算价使用 */
function effectiveHourPrice(room, dateStr, timeList) {
  return resolveHourPrice(room, dateStr, timeList).price;
}

/** 星期描述：[1,2,3,4,5] -> 工作日；[1,2,3] -> 周一至周三 */
function describeWeekdays(weekdays) {
  const list = (weekdays || []).slice().sort(function(a, b) { return a - b; });
  if (!list.length) return '';
  if (list.length === 7) return '每天';
  if (list.join(',') === '1,2,3,4,5') return '工作日';
  if (list.join(',') === '6,7') return '周末';
  let contiguous = true;
  for (let i = 1; i < list.length; i++) {
    if (list[i] !== list[i - 1] + 1) { contiguous = false; break; }
  }
  if (contiguous && list.length > 1) {
    return '周一至周' + WEEKDAY_TEXT[list[list.length - 1] - 1];
  }
  if (list.length === 1) return '周' + WEEKDAY_TEXT[list[0] - 1];
  return list.map(function(day) { return '周' + WEEKDAY_TEXT[day - 1]; }).join('、');
}

function formatYuan(fen) {
  const amount = (toInt(fen) || 0) / 100;
  return amount % 1 === 0 ? String(amount) : amount.toFixed(1).replace(/\.0$/, '');
}

function formatHour(hour) {
  const value = toInt(hour);
  if (value === null) return '';
  return (value < 10 ? '0' : '') + value + ':00';
}

/** 单条规则的文案：工作日 10:00-17:00 ¥18/时 */
function describeRule(rule) {
  if (!rule) return '';
  const week = describeWeekdays(rule.weekdays);
  return [week, formatHour(rule.hour_start) + '-' + formatHour(rule.hour_end),
    '¥' + formatYuan(rule.price_per_hour) + '/时'].filter(Boolean).join(' ');
}

/** 房间闲时规则整体摘要，供列表/详情页标签展示 */
function describeRules(room) {
  const rules = normalizeRules(room);
  if (!rules.length) return '';
  return rules.map(describeRule).join(' · ');
}

/** 指定日期（星期）命中的闲时规则 */
function rulesForWeekday(room, dateStr) {
  const weekday = isoWeekday(dateStr);
  if (!weekday) return [];
  return normalizeRules(room).filter(function(rule) {
    return rule.weekdays.indexOf(weekday) !== -1;
  });
}

/** 指定日期可享的最低闲时单价（分），无则 0 */
function lowestPriceForWeekday(room, dateStr) {
  const rules = rulesForWeekday(room, dateStr);
  if (!rules.length) return 0;
  return rules.reduce(function(min, rule) {
    return min === 0 || rule.price_per_hour < min ? rule.price_per_hour : min;
  }, 0);
}

/** 指定日期单价最低的闲时规则（用于展示时段窗），无则 null */
function lowestRuleForWeekday(room, dateStr) {
  const rules = rulesForWeekday(room, dateStr);
  if (!rules.length) return null;
  return rules.reduce(function(cheapest, rule) {
    return !cheapest || rule.price_per_hour < cheapest.price_per_hour ? rule : cheapest;
  }, null);
}

/** 某房间按某规则双人 2 小时的到手总价（分）：房费×2 + 人头×2 */
function coupleTotalFen(room, rule) {
  const person = toInt(room && room.price_per_person) || 0;
  return (rule ? toInt(rule.price_per_hour) || 0 : 0) * 2 + person * 2;
}

/**
 * 全店优惠信息汇总：数据源 = 房间闲时规则（主）+ 全局 Constance 折扣（辅）。
 * 首页横幅/弹窗/角标、预约页日期标记都用它，配哪间房就自动展示哪间房的优惠。
 */
function promoSummary(rooms, constance) {
  const meta = weekdayDiscountFromConstance(constance);
  const list = Array.isArray(rooms) ? rooms : [];
  const weekdayMap = {};
  let cheapest = null;           // { room, rule, total }
  let windowStart = null;
  let windowEnd = null;
  list.forEach(function(room) {
    normalizeRules(room).forEach(function(rule) {
      rule.weekdays.forEach(function(d) { weekdayMap[d] = 1; });
      if (windowStart === null || rule.hour_start < windowStart) windowStart = rule.hour_start;
      if (windowEnd === null || rule.hour_end > windowEnd) windowEnd = rule.hour_end;
      const total = coupleTotalFen(room, rule);
      if (!cheapest || total < cheapest.total) cheapest = { room: room, rule: rule, total: total };
    });
  });
  if (meta.enabled) meta.weekdays.forEach(function(d) { weekdayMap[d] = 1; });
  const weekdays = Object.keys(weekdayMap).map(Number).sort(function(a, b) { return a - b; });
  const enabled = weekdays.length > 0;
  const now = new Date();
  const todayIso = now.getDay() === 0 ? 7 : now.getDay();
  const dealText = cheapest ? '双人2小时 ¥' + formatYuan(cheapest.total) + '起' : '';
  const fallbackText = meta.enabled ? '包间费' + (formatDiscountText(meta.percent) || '特惠') : '';
  return {
    enabled: enabled,
    weekdays: weekdays,
    isToday: enabled && weekdays.indexOf(todayIso) !== -1,
    percent: meta.enabled ? meta.percent : 0,
    // 展示文案：有房间规则用到手价，否则退回全局折扣话术
    label: meta.enabled ? meta.label : (cheapest ? '工作日包间特惠' : ''),
    shortLabel: enabled ? describeWeekdays(weekdays) : '',
    dealText: dealText || fallbackText,
    hour_start: windowStart === null ? meta.hour_start : windowStart,
    hour_end: windowEnd === null ? meta.hour_end : windowEnd,
    cheapest: cheapest,
  };
}

/** 指定日期的闲时文案，如 工作日 10:00-17:00 ¥18/时；无则空 */
function describeForWeekday(room, dateStr) {
  const rules = rulesForWeekday(room, dateStr);
  if (!rules.length) return '';
  return rules.map(describeRule).join(' · ');
}

/** 房间是否有闲时价配置 */
function hasOffpeak(room) {
  return normalizeRules(room).length > 0;
}

/** 最低闲时单价（用于“低至 ¥X/时”卖点文案），无配置返回 0 */
function lowestOffpeakPrice(room) {
  const rules = normalizeRules(room);
  if (!rules.length) return 0;
  return rules.reduce(function(min, rule) {
    return min === 0 || rule.price_per_hour < min ? rule.price_per_hour : min;
  }, 0);
}

/** 是否命中夜场（19:00 之后开始的闲时窗口），用于夜场加购引导 */
function isNightRule(rule) {
  return !!rule && toInt(rule.hour_start) >= 18;
}


/**
 * 从 Constance 解析「工作日包间费折扣」
 * 返回 { enabled, weekdays, percent, hourStart, hourEnd, label, isToday, todayText }
 */
function parseWeekdayList(value) {
  if (Array.isArray(value)) {
    return value.map(toInt).filter(function(d) { return d !== null && d >= 1 && d <= 7; })
      .sort(function(a, b) { return a - b; });
  }
  return String(value == null ? '' : value).split(/[,，\s]+/)
    .map(toInt).filter(function(d) { return d !== null && d >= 1 && d <= 7; })
    .sort(function(a, b) { return a - b; });
}

function weekdayDiscountFromConstance(constance) {
  const cfg = constance || {};
  const rawEnabled = cfg.weekday_room_discount_enabled;
  const enabled = !(rawEnabled === false || rawEnabled === 0 || rawEnabled === '0' || rawEnabled === 'false');
  const weekdays = parseWeekdayList(cfg.weekday_room_discount_weekdays);
  const percent = toInt(cfg.weekday_room_discount_percent) || 0;
  let hourStart = toInt(cfg.weekday_room_discount_hour_start);
  let hourEnd = toInt(cfg.weekday_room_discount_hour_end);
  if (hourStart === null) hourStart = 10;
  if (hourEnd === null) hourEnd = 23;
  // 与后端一致：时段非法时回退 10-23，避免后台配错导致文案异常
  if (!(hourStart >= 0 && hourStart < hourEnd && hourEnd <= 24)) {
    hourStart = 10;
    hourEnd = 23;
  }
  const valid = enabled && weekdays.length > 0 && percent > 0 && percent < 100;
  let label = '';
  if (valid) {
    const week = describeWeekdays(weekdays);
    const off = formatDiscountText(percent);
    label = week ? week + '包间费' + off : '';
  }
  const now = new Date();
  const todayIso = now.getDay() === 0 ? 7 : now.getDay();
  const isToday = valid && weekdays.indexOf(todayIso) !== -1;
  const rawCouponAllowed = cfg.weekday_room_discount_coupon_allowed;
  const couponAllowed = rawCouponAllowed === true || rawCouponAllowed === 1 || rawCouponAllowed === '1' || rawCouponAllowed === 'true';
  return {
    enabled: valid,
    weekdays: weekdays,
    percent: percent,
    hour_start: hourStart,
    hour_end: hourEnd,
    label: label,
    isToday: isToday,
    todayLabel: isToday ? label : '',
    coupon_allowed: couponAllowed,
  };
}

/** 折扣百分比转文案：50 -> 半价，70 -> 7折，85 -> 8.5折 */
function formatDiscountText(percent) {
  const value = toInt(percent) || 0;
  if (value <= 0 || value >= 100) return '';
  if (value === 50) return '半价';
  return (value / 10) + '折';
}

/** 现价/原价折算文案：7/25 -> 2.8折，18/30 -> 6折；价格非法返回空 */
function discountText(priceFen, baseFen) {
  const p = toInt(priceFen) || 0;
  const b = toInt(baseFen) || 0;
  if (!b || !p || p >= b) return '';
  const zhe = Math.round((p / b) * 100) / 10;
  return (zhe % 1 === 0 ? String(zhe) : zhe.toFixed(1)) + '折';
}

/**
 * 优惠日当天给「预约」tab 挂角标（如"特惠"），其余日子清除。
 * 数据源：房间闲时规则 + 全局 Constance 折扣，二者任一命中当天即挂。
 * 仅当天展示，避免常驻角标被无视；fail 静默（部分平台不支持）。
 */
function syncPromoTabBadge(constance, tabIndex, rooms) {
  const meta = promoSummary(rooms, constance);
  if (!meta.enabled || !meta.isToday) {
    uni.removeTabBarBadge({ index: tabIndex, fail: function() {} });
    return;
  }
  // 角标最多放 3 个字符，超长（如"8.5折"）降级为"特惠"
  const text = formatDiscountText(meta.percent || 0) || '特惠';
  uni.setTabBarBadge({
    index: tabIndex,
    text: text.length > 3 ? '特惠' : text,
    fail: function() {},
  });
}

export default {
  normalizeRules: normalizeRules,
  isoWeekday: isoWeekday,
  hoursFromTimeList: hoursFromTimeList,
  matchRule: matchRule,
  resolveHourPrice: resolveHourPrice,
  effectiveHourPrice: effectiveHourPrice,
  describeWeekdays: describeWeekdays,
  describeRule: describeRule,
  describeRules: describeRules,
  describeForWeekday: describeForWeekday,
  rulesForWeekday: rulesForWeekday,
  lowestPriceForWeekday: lowestPriceForWeekday,
  lowestRuleForWeekday: lowestRuleForWeekday,
  coupleTotalFen: coupleTotalFen,
  promoSummary: promoSummary,
  hasOffpeak: hasOffpeak,
  lowestOffpeakPrice: lowestOffpeakPrice,
  isNightRule: isNightRule,
  weekdayDiscountFromConstance: weekdayDiscountFromConstance,
  formatDiscountText: formatDiscountText,
  discountText: discountText,
  syncPromoTabBadge: syncPromoTabBadge,
  formatYuan: formatYuan,
};
