import SUBSCRIPTION from './subscription.js';

function getTemplate(card) {
  return card && card.card_template || card || {};
}

function formatMoney(fen) {
  const value = Number(fen);
  if (!isFinite(value)) return '';
  return (Math.max(0, value) / 100).toFixed(2).replace(/\.?0+$/, '');
}

function presentationRule(card, slot) {
  const template = getTemplate(card);
  const rules = template.usage_rules;
  if (Array.isArray(rules) && rules.length) {
    return rules.find(rule => rule && rule.slot === slot && rule.enabled !== false) || null;
  }
  return SUBSCRIPTION.getUsageRule(template, slot);
}

function getRoomScopeText(card) {
  const template = getTemplate(card);
  if (!presentationRule(template, SUBSCRIPTION.SLOT_ROOM_HOURS)) return '';
  const rooms = Array.isArray(template.usable_rooms) ? template.usable_rooms : [];
  if (!rooms.length) return '全部预约房间（仍受时段规则限制）';
  const names = rooms.map(room => room && typeof room === 'object' ? room.name : '').filter(Boolean);
  return names.length === rooms.length ? names.join('、') : '指定房间，适用名单以卡包配置为准';
}

function buildRuleLines(card) {
  const template = getTemplate(card);
  const ticket = presentationRule(template, SUBSCRIPTION.SLOT_TICKET);
  const entry = presentationRule(template, SUBSCRIPTION.SLOT_SELF_ENTRY_FEE);
  const hours = presentationRule(template, SUBSCRIPTION.SLOT_ROOM_HOURS);
  const texts = [];
  if (ticket) {
    texts.push('大厅购票按人次扣减，持卡账号统一下单；同行每抵1张票扣1次');
    const max = Number(ticket.max_per_order) || 0;
    texts.push(max > 0 ? '大厅购票每单最多抵' + max + '张票，超出部分另付' : '大厅购票按本单票数和卡内剩余额度抵扣');
  }
  if (entry) {
    const max = Number(entry.max_per_order) || 0;
    texts.push(max === 1 ? '包厢预约可扣1次抵本人入场费，不抵同行入场费' : max > 0
      ? '包厢预约入场费每单最多抵' + max + '人，以结算页为准'
      : '包厢预约入场费按本单人数和卡内剩余额度抵扣');
    if (ticket) texts.push('大厅购票与包厢入场抵扣共用额度，不是两份权益');
  }
  if (hours) {
    const max = Number(hours.max_per_order) || 0;
    texts.push(max > 0 ? '包厢房费每单最多抵' + max + '小时' : '包厢房费按所选时长和卡内剩余额度抵扣');
    if (!entry) texts.push('只抵房费，不含本人及同行人的入场费');
    texts.push('闲时特惠小时默认不可抵小时卡，规则明确允许时除外；混合预约仅抵允许用卡的小时');
    texts.push('适用房间：' + getRoomScopeText(template));
  }
  if (hours && entry) texts.push('房费与入场费为二选一用途，共用本卡额度；同一卡包每单只能选择一种抵扣权益' + (template.stackable === false ? '' : '，同时抵两项需使用不同的适用卡包'));
  const purchaseLimit = Number(template.purchase_limit_per_user) || 0;
  if (purchaseLimit > 0) texts.push('每个账号限购' + purchaseLimit + '次，不按同行人数分别计算');
  texts.push(template.stackable === false ? '同一订单不可与其他卡包同时使用' : '同一卡包每单只能选择一种权益；可与其他适用卡包组合使用');
  texts.push('抵卡后的会员优惠、优惠券及积分以本单规则为准，并非无条件叠加');
  return texts.map((text, index) => ({ key: 'card-rule-' + index, text }));
}

function buildCardView(card) {
  const template = getTemplate(card);
  const targetType = SUBSCRIPTION.getCardTargetType(template);
  const ticket = presentationRule(template, SUBSCRIPTION.SLOT_TICKET);
  const entry = presentationRule(template, SUBSCRIPTION.SLOT_SELF_ENTRY_FEE);
  const hours = presentationRule(template, SUBSCRIPTION.SLOT_ROOM_HOURS);
  const total = Math.max(0, Number(template.total_limit) || 0);
  const days = Math.max(0, Number(template.validity_days) || 0);
  const unit = hours ? '小时' : '人次';
  const price = Math.max(0, Number(template.price) || 0);
  const original = Math.max(0, Number(template.original_price) || 0);
  const max = Number((hours || ticket || entry || {}).max_per_order) || 0;
  const purchaseLimit = Math.max(0, Number(template.purchase_limit_per_user) || 0);
  let sellingPoint = '按本卡适用权益扣减额度';
  if (hours) sellingPoint = '按允许用卡的预约小时扣减，剩余额度下次使用';
  else if (ticket) sellingPoint = '持卡账号统一下单，同行按人次扣减';
  else if (entry) sellingPoint = '预约时抵适用入场费，按人次扣减';
  let usageExample = '';
  if (ticket && total >= 2 && (max === 0 || max >= 2)) {
    usageExample = '2人同行扣2次';
    if (total % 2 === 0) usageExample += '，共可抵' + (total / 2) + '次双人入场';
  } else if (ticket) usageExample = '每抵1张大厅票扣1次';
  else if (entry && !hours) usageExample = '每抵1人入场费扣1次';
  const restrictionText = hours
    ? (entry ? '房费或入场费二选一，共用额度；每单只能选本卡一种权益' : '仅抵房费，入场费另计；闲时特惠小时默认不可抵')
    : (ticket ? '共享指持卡账号替同行下单，不支持其他账号独立用卡' : '仅抵本卡适用的入场权益');
  const perUnit = total > 0 ? price / total : 0;
  const approximate = Math.abs(perUnit - Math.round(perUnit)) > 0.000001;
  return {
    targetType,
    unitText: unit,
    badgeText: hours ? '包厢小时卡' : '大厅人次卡',
    visualClass: hours ? 'room' : 'hall',
    limitText: '共' + total + unit,
    validityText: days > 0 ? days + '天有效' : '有效期以卡包说明为准',
    activationText: '支付成功即起算，不是首次使用激活',
    recommendLabel: purchaseLimit > 0 ? '每账号限购' + purchaseLimit + '次' : '',
    sellingPoint,
    usageExample,
    restrictionText,
    usageText: SUBSCRIPTION.getCardUsageText(template),
    roomScopeText: getRoomScopeText(template),
    orderLimitText: max > 0 ? '每单最多抵' + max + (hours ? '小时房费' : ticket ? '张入场票' : '人入场费') : '按本单需求和剩余额度抵扣',
    purchaseRuleText: purchaseLimit > 0 ? (template.can_purchase === false ? '已达到账号限购条件' : '每个账号限购' + purchaseLimit + '次') : '',
    unitPriceText: total > 0 ? (approximate ? '用完额度约 ¥' : '用完额度折合 ¥') + formatMoney(perUnit) + '/' + unit : '',
    saveText: original > price ? '比标示原价省 ¥' + formatMoney(original - price) : '',
    priceText: formatMoney(price),
    priceFullText: (price / 100).toFixed(2),
    originalPriceText: original > price ? formatMoney(original) : '',
    ruleLines: buildRuleLines(template),
  };
}

export default { formatMoney, presentationRule, getRoomScopeText, buildRuleLines, buildCardView };
