import { formatDate } from '../common/util.js';

const SLOT_ROOM_HOURS = 'room_hours';
const SLOT_SELF_ENTRY_FEE = 'self_entry_fee';
const SLOT_TICKET = 'ticket';

const SLOT_DEFS = [
  {
    key: SLOT_ROOM_HOURS,
    title: '包厢小时费',
    unit: '时',
    meterLabel: '剩余小时',
    meterClass: '',
    noUseText: '不使用包厢小时卡',
  },
  {
    key: SLOT_SELF_ENTRY_FEE,
    title: '本人入场费',
    unit: '次',
    meterLabel: '剩余次数',
    meterClass: 'entry',
    noUseText: '不使用大厅次卡抵本人入场费',
  },
];

function createSelectedState() {
  return SLOT_DEFS.reduce(function(map, def) {
    map[def.key] = null;
    return map;
  }, {});
}

function createSkippedState() {
  return SLOT_DEFS.reduce(function(map, def) {
    map[def.key] = false;
    return map;
  }, {});
}

function getSlotDef(slot) {
  return SLOT_DEFS.find(function(def) {
    return def.key === slot;
  }) || null;
}

function getSelected(selectedBySlot, slot) {
  return selectedBySlot && selectedBySlot[slot] || null;
}

function isSelected(selectedBySlot, slot, sub) {
  var selected = getSelected(selectedBySlot, slot);
  return !!(selected && sub && selected.object_id === sub.object_id);
}

function getCardTemplate(cardOrSub) {
  return cardOrSub && cardOrSub.card_template || cardOrSub || {};
}

function getUsageRule(template, slot) {
  template = getCardTemplate(template);
  var rules = Array.isArray(template.usage_rules) ? template.usage_rules : [];
  for (var i = 0; i < rules.length; i++) {
    var rule = rules[i] || {};
    if (rule.slot === slot && rule.enabled !== false) {
      return rule;
    }
  }

  // 兼容旧接口：没有 usage_rules 时按 target_type 推断。
  var targetType = Number(template.target_type) || 0;
  if (slot === SLOT_ROOM_HOURS && targetType === 2) {
    return { slot: slot, max_per_order: 0 };
  }
  if (slot === SLOT_SELF_ENTRY_FEE && targetType === 1) {
    return { slot: slot, max_per_order: 1 };
  }
  if (slot === SLOT_TICKET && targetType === 1) {
    return { slot: slot, max_per_order: 0 };
  }
  return null;
}

function cardSupportsSlot(cardOrSub, slot) {
  return !!getUsageRule(getCardTemplate(cardOrSub), slot);
}

function getCardTargetType(cardOrSub) {
  var template = getCardTemplate(cardOrSub);
  if (cardSupportsSlot(template, SLOT_ROOM_HOURS)) return 2;
  if (cardSupportsSlot(template, SLOT_TICKET) || cardSupportsSlot(template, SLOT_SELF_ENTRY_FEE)) return 1;
  return Number(template.target_type) || 0;
}

function getPrimaryUsageRule(cardOrSub) {
  var template = getCardTemplate(cardOrSub);
  var rules = Array.isArray(template.usage_rules) ? template.usage_rules : [];
  for (var i = 0; i < rules.length; i++) {
    var rule = rules[i] || {};
    if (rule.enabled !== false) return rule;
  }
  if (Number(template.target_type) === 2) return { slot: SLOT_ROOM_HOURS, unit: '小时', label: '包厢小时费' };
  return { slot: SLOT_TICKET, unit: '次', label: '大厅门票' };
}

function getCardUnit(cardOrSub) {
  var template = getCardTemplate(cardOrSub);
  if (template.unit_label) return template.unit_label;
  var rule = getPrimaryUsageRule(template) || {};
  if (rule.unit) return rule.unit;
  return getCardTargetType(template) === 2 ? '小时' : '次';
}

function getCardUsageText(cardOrSub) {
  var template = getCardTemplate(cardOrSub);
  if (template.usage_summary) return template.usage_summary;
  var rules = Array.isArray(template.usage_rules) ? template.usage_rules : [];
  var labels = rules.filter(function(rule) {
    return rule && rule.enabled !== false;
  }).map(function(rule) {
    return rule.label || rule.slot;
  }).filter(Boolean);
  if (labels.length > 0) return labels.join('、');
  return getCardTargetType(template) === 2 ? '包厢小时费' : '大厅门票/包厢本人入场费';
}

function isStackable(sub) {
  var template = getCardTemplate(sub);
  return template.stackable !== false;
}

function canUseForSlot(slot, sub, ctx) {
  var def = getSlotDef(slot);
  if (!def || !sub) return false;
  var template = sub.card_template || {};
  var remaining = Number(sub.remaining_limit) || 0;
  if (!getUsageRule(template, slot)) return false;
  if (remaining <= 0) return false;

  if (slot === SLOT_SELF_ENTRY_FEE && (Number(ctx.numOfPeople) || 0) <= 0) {
    return false;
  }

  if (slot === SLOT_ROOM_HOURS) {
    var usableRooms = template.usable_rooms || [];
    if (usableRooms.length > 0) {
      var roomId = ctx.currentProduct && ctx.currentProduct.object_id;
      return usableRooms.some(function(room) {
        return room.object_id === roomId || room === roomId;
      });
    }
  }

  return true;
}

function decorateForSlot(slot, sub, ctx) {
  var template = sub.card_template || {};
  var rule = getUsageRule(template, slot) || {};
  var remaining = Number(sub.remaining_limit) || 0;
  var formattedExpire = formatDate(Number(sub.expire_at) || sub.expire_at);
  var viewKey = slot + '_' + sub.object_id;

  if (slot === SLOT_ROOM_HOURS) {
    var selectedHours = Number(ctx.selectedRoomHours) || 0;
    var ruleMaxHours = Number(rule.max_per_order) || 0;
    var hourLimit = ruleMaxHours > 0 ? Math.min(selectedHours, ruleMaxHours) : selectedHours;
    var deductedHours = Math.min(hourLimit, remaining);
    var hourlyPrice = ctx.currentProduct && ctx.currentProduct.price_per_hour || 0;
    var roomDiscountFen = deductedHours * hourlyPrice;
    return Object.assign({}, sub, {
      deducted_limit: deductedHours,
      deducted_hours: deductedHours,
      view_key: viewKey,
      remaining_after_use: Math.max(0, remaining - deductedHours),
      discount_amount_fen: roomDiscountFen,
      formatted_expire: formattedExpire,
      primary_tag: '抵' + deductedHours + '小时',
      secondary_tag: '',
      usage_text: '本次可抵' + deductedHours + '小时包厢费',
    });
  }

  if (slot === SLOT_SELF_ENTRY_FEE) {
    var numOfPeople = Number(ctx.numOfPeople) || 0;
    var ruleMaxCount = Number(rule.max_per_order) || 1;
    var countLimit = ruleMaxCount > 0 ? Math.min(numOfPeople, ruleMaxCount) : numOfPeople;
    var deductedCount = Math.min(countLimit, remaining);
    var discountFen = deductedCount * (Number(ctx.singlePersonPrice) || 0);
    return Object.assign({}, sub, {
      deducted_limit: deductedCount,
      deducted_count: deductedCount,
      view_key: viewKey,
      remaining_after_use: Math.max(0, remaining - deductedCount),
      discount_amount_fen: discountFen,
      formatted_expire: formattedExpire,
      primary_tag: '抵本人入场费',
      secondary_tag: '每单最多抵1人',
      usage_text: '本次可抵本人入场费',
    });
  }

  return Object.assign({}, sub, {
    deducted_limit: 0,
    view_key: viewKey,
    remaining_after_use: remaining,
    discount_amount_fen: 0,
    formatted_expire: formattedExpire,
    primary_tag: '可用',
    secondary_tag: '',
  });
}

function getUsableBySlot(slot, ctx) {
  var list = ctx.mySubscriptions || [];
  return list.filter(function(sub) {
    return canUseForSlot(slot, sub, ctx);
  }).map(function(sub) {
    return decorateForSlot(slot, sub, ctx);
  });
}

function buildSlotViews(ctx) {
  return SLOT_DEFS.map(function(def) {
    return Object.assign({}, def, {
      items: getUsableBySlot(def.key, ctx),
      selected: getSelected(ctx.selectedBySlot, def.key),
    });
  }).filter(function(view) {
    return view.items.length > 0;
  });
}

function getAvailableCount(ctx) {
  return buildSlotViews(ctx).reduce(function(total, view) {
    return total + view.items.length;
  }, 0);
}

function getSelectedCount(selectedBySlot) {
  return SLOT_DEFS.reduce(function(count, def) {
    return count + (getSelected(selectedBySlot, def.key) ? 1 : 0);
  }, 0);
}

function resolveSelection(ctx) {
  var next = {};
  var requested = {};
  var usedIds = {};
  var hasRequested = false;
  var hasRequestedNonStackable = false;

  SLOT_DEFS.forEach(function(def) {
    var usable = getUsableBySlot(def.key, ctx);
    var selected = getSelected(ctx.selectedBySlot, def.key);
    var matched = selected ? usable.find(function(sub) {
      return sub.object_id === selected.object_id && !usedIds[sub.object_id];
    }) : null;
    if (!matched) return;
    requested[def.key] = matched;
    usedIds[matched.object_id] = true;
    hasRequested = true;
    if (!isStackable(matched)) hasRequestedNonStackable = true;
  });

  if (hasRequestedNonStackable) {
    var hasLockedSelection = false;
    SLOT_DEFS.forEach(function(def) {
      var item = requested[def.key] || null;
      if (!hasLockedSelection && item && !isStackable(item)) {
        next[def.key] = item;
        hasLockedSelection = true;
      } else {
        next[def.key] = null;
      }
    });
    return next;
  }

  usedIds = {};
  SLOT_DEFS.forEach(function(def) {
    var item = requested[def.key] || null;
    next[def.key] = item;
    if (item) usedIds[item.object_id] = true;
  });

  var lockedByNonStackable = false;
  SLOT_DEFS.forEach(function(def) {
    if (next[def.key]) return;
    if (lockedByNonStackable) {
      next[def.key] = null;
      return;
    }
    var usable = getUsableBySlot(def.key, ctx);
    var skipped = !!(ctx.skippedBySlot && ctx.skippedBySlot[def.key]);
    var picked = null;
    if (!skipped) {
      picked = usable.find(function(sub) {
        if (usedIds[sub.object_id]) return false;
        return !hasRequested || isStackable(sub);
      }) || null;
    }
    next[def.key] = picked;
    if (picked) {
      usedIds[picked.object_id] = true;
      if (!isStackable(picked)) lockedByNonStackable = true;
    }
  });
  return next;
}

function getMetrics(ctx) {
  var selectedBySlot = ctx.selectedBySlot || {};
  var roomSub = getSelected(selectedBySlot, SLOT_ROOM_HOURS);
  var entrySub = getSelected(selectedBySlot, SLOT_SELF_ENTRY_FEE);
  var selectedRoomHours = Number(ctx.selectedRoomHours) || 0;
  var singlePersonPrice = Number(ctx.singlePersonPrice) || 0;
  var roomHourlyPrice = ctx.currentProduct && ctx.currentProduct.price_per_hour || 0;
  var numOfPeople = Number(ctx.numOfPeople) || 0;
  var roomRule = roomSub ? getUsageRule(roomSub.card_template || {}, SLOT_ROOM_HOURS) : null;
  var entryRule = entrySub ? getUsageRule(entrySub.card_template || {}, SLOT_SELF_ENTRY_FEE) : null;

  var roomRuleMax = Number(roomRule && roomRule.max_per_order) || 0;
  var roomLimit = roomRuleMax > 0 ? Math.min(selectedRoomHours, roomRuleMax) : selectedRoomHours;
  var deductedHours = roomSub ? Math.min(roomLimit, Number(roomSub.remaining_limit) || 0) : 0;
  var entryRuleMax = Number(entryRule && entryRule.max_per_order) || 1;
  var entryLimit = entryRuleMax > 0 ? Math.min(numOfPeople, entryRuleMax) : numOfPeople;
  var entryDeductedCount = entrySub && numOfPeople > 0 ? Math.min(entryLimit, Number(entrySub.remaining_limit) || 0) : 0;
  var roomDiscountFen = deductedHours * roomHourlyPrice;
  var entryDiscountFen = entryDeductedCount * singlePersonPrice;

  return {
    roomSub: roomSub,
    entrySub: entrySub,
    deductedHours: deductedHours,
    entryDeductedCount: entryDeductedCount,
    roomDiscountFen: roomDiscountFen,
    entryDiscountFen: entryDiscountFen,
    totalDiscountFen: roomDiscountFen + entryDiscountFen,
  };
}

function buildUsagesPayload(ctx) {
  var metrics = getMetrics(ctx);
  var usages = [];
  if (metrics.roomSub && metrics.deductedHours > 0) {
    usages.push({
      slot: SLOT_ROOM_HOURS,
      user_subscription_id: metrics.roomSub.object_id,
    });
  }
  if (metrics.entrySub && metrics.entryDeductedCount > 0) {
    usages.push({
      slot: SLOT_SELF_ENTRY_FEE,
      user_subscription_id: metrics.entrySub.object_id,
    });
  }
  return usages;
}

function getDeductionLabel(slot) {
  if (slot === SLOT_ROOM_HOURS) return '包厢小时卡';
  if (slot === SLOT_SELF_ENTRY_FEE) return '大厅次卡抵本人入场费';
  if (slot === SLOT_TICKET) return '大厅次卡抵门票';
  return '卡包抵扣';
}

function buildDeductionRows(goodsInfo, room) {
  goodsInfo = goodsInfo || {};
  room = room || {};
  var rows = [];
  var roomHourlyPrice = Number(goodsInfo.room_price_per_hour || room.price_per_hour || 0);
  var personPrice = Number(goodsInfo.room_price_per_person || room.price_per_person || 0);
  var ticketPrice = Number(goodsInfo.ticket_price || 0);
  var usages = Array.isArray(goodsInfo.subscription_usages) ? goodsInfo.subscription_usages : [];

  for (var i = 0; i < usages.length; i++) {
    var usage = usages[i] || {};
    var slot = usage.slot || '';
    var amount = Number(usage.discount_amount) || 0;
    if (slot === SLOT_ROOM_HOURS && !amount) {
      amount = (Number(usage.deduct_room_hours || usage.deduct_limit) || 0) * roomHourlyPrice;
    } else if (slot === SLOT_SELF_ENTRY_FEE && !amount) {
      amount = (Number(usage.deduct_person_ticket_count || usage.deduct_limit) || 0) * personPrice;
    } else if (slot === SLOT_TICKET && !amount) {
      amount = (Number(usage.deduct_ticket_count || usage.deduct_limit) || 0) * ticketPrice;
    }

    if (amount > 0) {
      rows.push({
        key: 'subscription-' + i,
        label: getDeductionLabel(slot),
        amount: amount,
      });
    }
  }

  if (rows.length === 0) {
    var legacyHours = Number(goodsInfo.deduct_room_hours) || 0;
    if (legacyHours > 0) {
      rows.push({
        key: 'subscription-room-legacy',
        label: getDeductionLabel(SLOT_ROOM_HOURS),
        amount: legacyHours * roomHourlyPrice,
      });
    }

    var legacyEntryCount = Number(goodsInfo.deduct_person_ticket_count) || 0;
    if (legacyEntryCount > 0) {
      rows.push({
        key: 'subscription-entry-legacy',
        label: getDeductionLabel(SLOT_SELF_ENTRY_FEE),
        amount: legacyEntryCount * personPrice,
      });
    } else if (goodsInfo.waive_person_fee) {
      rows.push({
        key: 'subscription-entry-waive',
        label: '包厢卡免持卡人门票',
        amount: personPrice,
      });
    }

    var legacyTicketCount = Number(goodsInfo.deduct_ticket_count) || 0;
    if (legacyTicketCount > 0) {
      rows.push({
        key: 'subscription-ticket-legacy',
        label: getDeductionLabel(SLOT_TICKET),
        amount: legacyTicketCount * ticketPrice,
      });
    }
  }

  return rows.filter(function(item) {
    return Number(item.amount) > 0;
  });
}

function getSummaryText(ctx) {
  var selectedCount = getSelectedCount(ctx.selectedBySlot);
  if (selectedCount > 0) return '已用' + selectedCount + '张卡';
  var availableCount = getAvailableCount(ctx);
  if (availableCount > 0) return availableCount + '张可用';
  return '购卡更省';
}

function getActionText(ctx) {
  if (getSelectedCount(ctx.selectedBySlot) > 0) return '已选';
  return getAvailableCount(ctx) > 0 ? '去选择' : '去购卡';
}

export default {
  SLOT_ROOM_HOURS: SLOT_ROOM_HOURS,
  SLOT_SELF_ENTRY_FEE: SLOT_SELF_ENTRY_FEE,
  SLOT_TICKET: SLOT_TICKET,
  SLOT_DEFS: SLOT_DEFS,
  buildDeductionRows: buildDeductionRows,
  buildSlotViews: buildSlotViews,
  buildUsagesPayload: buildUsagesPayload,
  cardSupportsSlot: cardSupportsSlot,
  createSelectedState: createSelectedState,
  createSkippedState: createSkippedState,
  getActionText: getActionText,
  getAvailableCount: getAvailableCount,
  getCardTargetType: getCardTargetType,
  getCardUnit: getCardUnit,
  getCardUsageText: getCardUsageText,
  getMetrics: getMetrics,
  getPrimaryUsageRule: getPrimaryUsageRule,
  getSelected: getSelected,
  getSelectedCount: getSelectedCount,
  getSlotDef: getSlotDef,
  getSummaryText: getSummaryText,
  getUsableBySlot: getUsableBySlot,
  getUsageRule: getUsageRule,
  isStackable: isStackable,
  isSelected: isSelected,
  resolveSelection: resolveSelection,
};
