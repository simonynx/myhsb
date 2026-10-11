/**
 * 房间闲时价（分时定价）规则解析 —— 与后端 user/services/room_pricing.py 保持同一套逻辑
 *
 * 规则来自 Room.offpeak_rules：
 *   [{ label, weekdays: [1..7], hour_start, hour_end, price_per_hour }]
 * - weekdays 用 ISO 编号：1=周一 … 7=周日
 * - hour_start/hour_end 为 24 小时制整点、左闭右开
 * - 逐小时计价：每个整点按所在窗口的价格，窗口外按门市价；跨窗口时各段各按各价
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
      // card_allowed: true 才允许命中本条规则的订单抵扣包厢小时卡（默认不可用）
      card_allowed: item.card_allowed === true,
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
  if (isNaN(date.getTime()) || date.getFullYear() !== Number(parts[0])
      || date.getMonth() !== Number(parts[1]) - 1 || date.getDate() !== Number(parts[2])) return 0;
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

/** 单个整点 [hour, hour+1) 命中的最低价规则 */
function hourRule(rules, weekday, hour) {
  var matched = null;
  for (var i = 0; i < rules.length; i++) {
    var rule = rules[i];
    if (rule.weekdays.indexOf(weekday) === -1) continue;
    if (hour >= rule.hour_start && hour < rule.hour_end) {
      if (!matched || rule.price_per_hour < matched.price_per_hour) matched = rule;
    }
  }
  return matched;
}

function uniqueLabels(rules) {
  const labels = [];
  (rules || []).forEach(function(rule) {
    const label = rule && rule.label;
    if (label && labels.indexOf(label) === -1) labels.push(label);
  });
  return labels;
}

/**
 * 预约逐小时分段计价：与后端 room_pricing.price_appointment 同源。
 * 每个整点按所在窗口的价格算，窗口外按门市价；跨白天/夜场/高峰时各段各按各价。
 * segments: [{ start, end, hours, price, rule, isOffpeak, label }]
 */
function priceAppointment(room, dateStr, timeList) {
  const base = toInt(room && room.price_per_hour) || 0;
  const hours = hoursFromTimeList(timeList);
  const weekday = isoWeekday(dateStr);
  const rules = weekday && hours.length ? normalizeRules(room) : [];
  const hourPrices = hours.map(function(hour) {
    const rule = rules.length ? hourRule(rules, weekday, hour) : null;
    return { hour: hour, price: rule ? rule.price_per_hour : base, rule: rule };
  });

  const segments = [];
  hourPrices.forEach(function(item) {
    const last = segments[segments.length - 1];
    if (last && last.end === item.hour && last.price === item.price && last.rule === item.rule) {
      last.end = item.hour + 1;
      last.hours += 1;
    } else {
      segments.push({
        start: item.hour,
        end: item.hour + 1,
        hours: 1,
        price: item.price,
        rule: item.rule,
        isOffpeak: !!item.rule,
        label: item.rule ? (item.rule.label || '闲时特惠') : '门市价',
      });
    }
  });

  const matched = [];
  let offpeakHours = 0;
  let roomFee = 0;
  hourPrices.forEach(function(item) {
    roomFee += item.price;
    if (item.rule) {
      offpeakHours += 1;
      if (matched.indexOf(item.rule) === -1) matched.push(item.rule);
    }
  });
  const baseFee = base * hourPrices.length;
  return {
    hours: hourPrices.length,
    roomFee: roomFee,
    baseFee: baseFee,
    saveFee: Math.max(0, baseFee - roomFee),
    segments: segments,
    hourPrices: hourPrices,
    rules: matched,
    rule: matched[0] || null,
    offpeakHours: offpeakHours,
    isOffpeak: offpeakHours > 0,
    allOffpeak: hourPrices.length > 0 && offpeakHours === hourPrices.length,
    // 单价不唯一（闲时+门市价，或多个不同价窗口），界面要按段展示
    mixed: segments.length > 1,
    label: uniqueLabels(matched).join('、') || (matched.length ? '闲时特惠' : ''),
  };
}

/** 分段文案：14-17点 ¥21/时、17-20点 ¥30/时 */
function describeSegments(segments) {
  return (segments || []).map(function(seg) {
    return seg.start + '-' + seg.end + '点 ¥' + formatYuan(seg.price) + '/时';
  }).join('、');
}

/** 任一命中规则禁券则整单禁券，与后端 rules_block_coupon 一致 */
function rulesBlockCoupon(rules, constance) {
  return (rules || []).some(function(rule) {
    if (!rule) return false;
    if (rule.coupon_allowed === false) return true;
    if (rule.source === 'weekday_discount') {
      return !weekdayDiscountFromConstance(constance).coupon_allowed;
    }
    return false;
  });
}

/**
 * 兼容旧调用：平均小时单价（向下取整）+ 主规则。
 * 时段跨多种价格时 price 只是均价，算总价请用 priceAppointment().roomFee。
 */
function resolveHourPrice(room, dateStr, timeList) {
  const base = toInt(room && room.price_per_hour) || 0;
  const quote = priceAppointment(room, dateStr, timeList);
  if (!quote.hours) return { price: base, rule: null, isOffpeak: false, label: '' };
  return {
    price: Math.floor(quote.roomFee / quote.hours),
    rule: quote.rule,
    isOffpeak: quote.isOffpeak,
    label: quote.label,
  };
}

/** 命中的闲时规则是否允许抵扣包厢小时卡；无规则视为允许 */
function cardAllowed(rule) {
  if (!rule) return true;
  return rule.card_allowed === true;
}

/**
 * 拼团总价（分）：与后端 room_pricing.compute_group_cost 同源。
 * 小时费逐段计价后整单与拼团折扣比较，取更低者，不叠加；折扣向上取整。
 */
function resolveGroupCost(room, dateStr, beginHour, endHour, maxMembers, groupDiscountPercent) {
  const base = toInt(room && room.price_per_hour) || 0;
  const personCost = (toInt(room && room.price_per_person) || 0) * (toInt(maxMembers) || 0);
  const begin = toInt(beginHour);
  const end = toInt(endHour);
  const duration = Math.max(1, (end === null || begin === null ? 1 : end - begin));
  const originalCost = base * duration + personCost;

  const discount = toInt(groupDiscountPercent) || 100;
  const discountedCost = discount > 0 && discount < 100
    ? Math.ceil(originalCost * discount / 100)
    : originalCost;

  let baseCost = discountedCost;
  let offpeakApplied = false;
  let label = '';
  let hourPrice = base;
  let roomFee = base * duration;
  let segments = [];
  if (begin !== null && end !== null && end > begin) {
    const quote = priceAppointment(room, dateStr, [[begin, end]]);
    if (quote.isOffpeak && quote.roomFee + personCost < discountedCost) {
      baseCost = quote.roomFee + personCost;
      offpeakApplied = true;
      label = quote.label;
      hourPrice = Math.floor(quote.roomFee / duration);
      roomFee = quote.roomFee;
      segments = quote.segments;
    }
  }
  return {
    originalCost: originalCost,
    baseCost: baseCost,
    hourPrice: hourPrice,
    roomFee: roomFee,
    segments: segments,
    offpeakApplied: offpeakApplied,
    label: label,
  };
}

/** 平均生效单价（数字）；算总价请用 priceAppointment */
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
    return '周' + WEEKDAY_TEXT[list[0] - 1] + '至周' + WEEKDAY_TEXT[list[list.length - 1] - 1];
  }
  if (list.length === 1) return '周' + WEEKDAY_TEXT[list[0] - 1];
  return list.map(function(day) { return '周' + WEEKDAY_TEXT[day - 1]; }).join('、');
}

function formatYuan(fen) {
  const amount = (toInt(fen) || 0) / 100;
  return amount.toFixed(2).replace(/\.?0+$/, '');
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

function dateKey(date) {
  return date.getFullYear() + '-' + ('0' + (date.getMonth() + 1)).slice(-2) + '-' + ('0' + date.getDate()).slice(-2);
}

function openingRange(room) {
  const start = toInt(room && room.opening_hours_start);
  const end = toInt(room && room.opening_hours_end);
  return start !== null && end !== null && start >= 0 && end <= 24 && start < end ? [start, end] : null;
}

function segmentViews(segments) {
  return (segments || []).map(function(seg, i) {
    return {
      key: String(seg.start) + '-' + i,
      timeText: formatHour(seg.start) + '–' + formatHour(seg.end),
      priceText: formatYuan(seg.price),
      amountText: formatYuan(seg.price * seg.hours),
      hours: seg.hours,
      label: seg.isOffpeak ? '闲时价' : '常规价',
      className: seg.isOffpeak ? 'rate-row rate-row-promo' : 'rate-row',
    };
  });
}

function dayPriceView(room, dateStr) {
  const range = openingRange(room);
  const base = Number(room && room.price_per_hour) || 0;
  const quote = range ? priceAppointment(room, dateStr, [range]) : null;
  const rows = quote ? segmentViews(quote.segments) : [];
  const min = quote && quote.hourPrices.length
    ? Math.min.apply(null, quote.hourPrices.map(function(item) { return item.price; })) : base;
  return {
    rows: rows,
    hasOffpeak: min < base,
    price: min,
    priceText: formatYuan(min),
    baseText: formatYuan(base),
    discountText: min < base ? '房费' + discountText(min, base) : '',
    unitText: min < base ? '/小时起' : '/小时',
  };
}

// 仅宣传该日营业时间内、真实连续两小时的合计价；已知不可约小时不参与。
function bestCoupleDeal(room, dateStr, options) {
  options = options || {};
  const range = openingRange(room);
  const seats = Number(room && room.seats_count);
  const person = Number(room && room.price_per_person);
  if (!range || (seats > 0 && seats < 2) || !room || room.enabled === false
      || room.price_per_person == null || !Number.isFinite(person) || person < 0) return null;
  const now = options.now || new Date();
  const today = dateKey(now);
  let best = null;
  for (let start = range[0]; start + 2 <= range[1]; start++) {
    if (dateStr === today && start <= now.getHours()) continue;
    if (Array.isArray(options.unavailableHours)
        && (options.unavailableHours.indexOf(start) !== -1 || options.unavailableHours.indexOf(start + 1) !== -1)) continue;
    const quote = priceAppointment(room, dateStr, [[start, start + 2]]);
    if (!quote.isOffpeak || quote.saveFee <= 0) continue;
    const total = quote.roomFee + person * 2;
    if (!best || total < best.total) {
      best = { room: room, date: dateStr, start: start, end: start + 2, total: total,
        totalText: formatYuan(total), windowText: formatHour(start) + '–' + formatHour(start + 2),
        quote: quote, rule: quote.rule };
    }
  }
  return best;
}

// 优先展示今日可组成的优惠；否则预告未来七日内最近的一天，不合并不同规则的时段。
function promoSummary(rooms, constance, options) {
  options = options || {};
  const now = options.now || new Date();
  const list = Array.isArray(rooms) ? rooms : [];
  let cheapest = null;
  let daysAway = 0;
  for (let offset = 0; offset < 7 && !cheapest; offset++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const key = dateKey(day);
    list.forEach(function(room) {
      const unavailable = room.availabilityDate === key && Array.isArray(room.appoints)
        ? room.appoints.filter(function(slot) { return slot.status !== 1; }).map(function(slot) { return slot.start; }) : [];
      const deal = bestCoupleDeal(room, key, { now: now, unavailableHours: unavailable });
      if (deal && (!cheapest || deal.total < cheapest.total)) cheapest = deal;
    });
    if (cheapest) daysAway = offset;
  }
  const enabled = !!cheapest;
  const dateText = !cheapest ? '' : (daysAway === 0 ? '今日' : daysAway === 1 ? '明日' : cheapest.date.slice(5).replace('-', '/') + ' 周' + WEEKDAY_TEXT[isoWeekday(cheapest.date) - 1]);
  const weekdays = [];
  list.forEach(function(room) {
    normalizeRules(room).forEach(function(rule) {
      rule.weekdays.forEach(function(day) { if (weekdays.indexOf(day) === -1) weekdays.push(day); });
    });
  });
  return {
    enabled: enabled, isToday: enabled && daysAway === 0, daysAway: daysAway,
    weekdays: weekdays.sort(function(a, b) { return a - b; }),
    shortLabel: dateText, label: '闲时轻松玩', percent: 0,
    dealText: cheapest ? '双人2小时 ¥' + cheapest.totalText + '起' : '',
    conditionText: cheapest ? dateText + ' · ' + cheapest.room.name + ' · ' + cheapest.windowText : '',
    inclusionText: '含两人入场费 · 不含可选加购',
    hour_start: cheapest ? cheapest.start : 0, hour_end: cheapest ? cheapest.end : 0,
    cheapest: cheapest,
  };
}

function selectionView(room, dateStr, selects) {
  const pairs = Array.isArray(selects) ? selects.slice().sort(function(a, b) { return String(a[0]).localeCompare(String(b[0])); }) : [];
  const list = [];
  let valid = true;
  pairs.forEach(function(pair, i) {
    const begin = String(pair && pair[0] || '').split(' ');
    const end = String(pair && pair[1] || '').split(' ');
    const b = toInt(begin[1]);
    let e = toInt(end[1]);
    const next = new Date(dateStr + 'T12:00:00');
    next.setDate(next.getDate() + 1);
    if (end[0] === dateKey(next) && e === 0 && b > 0) e = 24;
    else if (end[0] !== dateStr) valid = false;
    if (begin[0] !== dateStr || b === null || e === null || e <= b || e > 24
        || (i > 0 && pairs[i - 1][1] !== pair[0])) valid = false;
    else list.push([b, e]);
  });
  const quote = priceAppointment(room, dateStr, valid ? list : []);
  const day = dayPriceView(room, dateStr);
  return {
    hasSelection: pairs.length > 0,
    valid: valid && list.length > 0,
    quote: quote, day: day, rows: segmentViews(quote.segments),
    roomText: formatYuan(quote.roomFee), baseText: formatYuan(quote.baseFee),
    saveText: formatYuan(quote.saveFee), hours: quote.hours,
    label: quote.hours ? formatHour(list[0][0]) + '–' + formatHour(list[list.length - 1][1]) + ' · ' + quote.hours + '小时' : '',
    personText: formatYuan(room && room.price_per_person),
    range: list.length ? [list[0][0], list[list.length - 1][1]] : null,
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
  priceAppointment: priceAppointment,
  describeSegments: describeSegments,
  rulesBlockCoupon: rulesBlockCoupon,
  resolveHourPrice: resolveHourPrice,
  effectiveHourPrice: effectiveHourPrice,
  cardAllowed: cardAllowed,
  resolveGroupCost: resolveGroupCost,
  describeWeekdays: describeWeekdays,
  describeRule: describeRule,
  describeRules: describeRules,
  describeForWeekday: describeForWeekday,
  rulesForWeekday: rulesForWeekday,
  lowestPriceForWeekday: lowestPriceForWeekday,
  lowestRuleForWeekday: lowestRuleForWeekday,
  coupleTotalFen: coupleTotalFen,
  promoSummary: promoSummary,
  bestCoupleDeal: bestCoupleDeal,
  dayPriceView: dayPriceView,
  selectionView: selectionView,
  segmentViews: segmentViews,
  dateKey: dateKey,
  hasOffpeak: hasOffpeak,
  lowestOffpeakPrice: lowestOffpeakPrice,
  isNightRule: isNightRule,
  weekdayDiscountFromConstance: weekdayDiscountFromConstance,
  formatDiscountText: formatDiscountText,
  discountText: discountText,
  syncPromoTabBadge: syncPromoTabBadge,
  formatYuan: formatYuan,
};
