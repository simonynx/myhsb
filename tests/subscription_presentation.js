const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
function load(file, globals) {
  const context = Object.assign({ module: { exports: {} }, Date, Number }, globals);
  const source = fs.readFileSync(path.join(__dirname, '../' + file), 'utf8')
    .replace(/^import .*$/mg, '').replace('export default', 'module.exports =');
  vm.runInNewContext(source, context);
  return context.module.exports;
}
const SUBSCRIPTION = load('utils/subscription.js', { formatDate: () => '' });
const P = load('utils/subscriptionPresentation.js', { SUBSCRIPTION });
const hall = { object_id: 'hall', name: '双人月享8次卡', target_type: 1,
  total_limit: 8, validity_days: 30, price: 21900, original_price: 30400,
  usage_rules: [{ slot: 'ticket', max_per_order: 2 }, { slot: 'self_entry_fee', max_per_order: 1 }] };
const room = { object_id: 'room', target_type: 2, total_limit: 4, validity_days: 30,
  price: 12800, original_price: 14000, purchase_limit_per_user: 1,
  usable_rooms: [{ object_id: 'a', name: '投影中包' }],
  usage_rules: [{ slot: 'room_hours', max_per_order: 4 }] };
const h = P.buildCardView(hall);
assert.strictEqual(h.limitText, '共8人次');
assert.strictEqual(h.badgeText, '大厅人次卡');
assert.strictEqual(h.validityText, '30天有效');
assert.strictEqual(h.priceText, '219');
assert.strictEqual(h.priceFullText, '219.00');
assert.strictEqual(h.unitPriceText, '用完额度约 ¥27.38/人次');
assert.strictEqual(h.usageExample, '2人同行扣2次，共可抵4次双人入场');
assert(h.activationText.includes('支付成功'));
assert(h.restrictionText.includes('不支持其他账号独立用卡'));
assert(h.ruleLines.some(rule => rule.text.includes('不抵同行')));
assert(h.ruleLines.some(rule => rule.text.includes('共用额度')));
const onePerOrder = P.buildCardView(Object.assign({}, hall, { usage_rules: [{ slot: 'ticket', max_per_order: 1 }] }));
assert.strictEqual(onePerOrder.usageExample, '每抵1张大厅票扣1次');
assert.strictEqual(onePerOrder.orderLimitText, '每单最多抵1张入场票');
const flexible = P.buildCardView(Object.assign({}, hall, { total_limit: 5, validity_days: 60, price: 15900 }));
assert.strictEqual(flexible.validityText, '60天有效');
assert.strictEqual(flexible.usageExample, '2人同行扣2次');
assert.strictEqual(flexible.recommendLabel, '');
assert(!flexible.sellingPoint.includes('30天'));
assert.strictEqual(P.buildCardView(Object.assign({}, room, { purchase_limit_per_user: 3 })).recommendLabel, '每账号限购3次');
const r = P.buildCardView(room);
assert.strictEqual(r.unitPriceText, '用完额度折合 ¥32/小时');
assert.strictEqual(r.limitText, '共4小时');
assert.strictEqual(r.roomScopeText, '投影中包');
assert(r.restrictionText.includes('入场费另计'));
assert(r.restrictionText.includes('闲时'));
assert(!r.sellingPoint.includes('3次'));
assert.strictEqual(r.orderLimitText, '每单最多抵4小时房费');
assert(r.ruleLines.some(rule => rule.text.includes('规则明确允许时除外')));
assert(r.ruleLines.some(rule => rule.text.includes('以本单规则为准')));
assert.strictEqual(P.buildCardView(Object.assign({}, room, { usable_rooms: ['a'] })).roomScopeText, '指定房间，适用名单以卡包配置为准');
assert(P.buildCardView(Object.assign({}, room, { usable_rooms: [] })).roomScopeText.includes('时段规则限制'));
assert.strictEqual(P.buildCardView(Object.assign({}, hall, { total_limit: 0 })).unitPriceText, '');
assert.strictEqual(P.formatMoney(1234), '12.34');
assert.strictEqual(P.formatMoney(0), '0');
assert.strictEqual(P.formatMoney(1000), '10');
assert.strictEqual(P.formatMoney(NaN), '');
assert.strictEqual(P.presentationRule({ target_type: 1 }, 'ticket').max_per_order, 0);
assert.strictEqual(P.presentationRule({ target_type: 1, usage_rules: [{ slot: 'ticket', enabled: false }] }, 'ticket'), null);
const combo = P.buildCardView(Object.assign({}, room, { usage_rules: [{ slot: 'room_hours' }, { slot: 'self_entry_fee', max_per_order: 1 }] }));
assert(!combo.restrictionText.includes('入场费另计'));
assert(combo.ruleLines.some(rule => rule.text.includes('抵本人入场费')));
assert(!combo.ruleLines.some(rule => rule.text.includes('不含本人')));
assert(combo.restrictionText.includes('二选一'));
assert(combo.ruleLines.some(rule => rule.text.includes('同一卡包每单只能选择一种抵扣权益')));
const entryUnlimited = P.buildCardView({ target_type: 1, total_limit: 8, usage_rules: [{ slot: 'self_entry_fee', max_per_order: 0 }] });
assert(entryUnlimited.ruleLines.some(rule => rule.text.includes('按本单人数和卡内剩余额度')));
assert(!entryUnlimited.ruleLines.some(rule => rule.text.includes('不抵同行')));
const entryMany = P.buildCardView({ target_type: 1, total_limit: 8, usage_rules: [{ slot: 'self_entry_fee', max_per_order: 3 }] });
assert.strictEqual(entryMany.orderLimitText, '每单最多抵3人入场费');
assert(entryMany.ruleLines.some(rule => rule.text.includes('最多抵3人')));
assert(!h.ruleLines.some(rule => /不限次|自动续费|无限/.test(rule.text)));
console.log('Subscription presentation: dynamic quota, cents, limits, sharing and offpeak restrictions passed');
