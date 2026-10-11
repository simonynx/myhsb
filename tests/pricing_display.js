const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const source = fs.readFileSync(path.join(__dirname, '../utils/offpeak.js'), 'utf8');
const context = { module: { exports: {} }, Date, Number };
vm.runInNewContext(source.replace('export default', 'module.exports ='), context);
const O = context.module.exports;
const room = {
  name: '测试包间', object_id: 'room-test', seats_count: 4,
  price_per_hour: 3000, price_per_person: 2000,
  opening_hours_start: 10, opening_hours_end: 22,
  offpeak_rules: [
    { weekdays: [1], hour_start: 10, hour_end: 17, price_per_hour: 2000 },
    { weekdays: [2], hour_start: 10, hour_end: 17, price_per_hour: 1000 },
  ],
};
const monday = new Date(2026, 9, 12, 0, 0);
assert.strictEqual(O.describeWeekdays([3, 4]), '周三至周四');
assert.strictEqual(O.formatYuan(1234), '12.34');
assert.strictEqual(O.formatYuan(0), '0');
assert.strictEqual(O.promoSummary([room], {}, { now: monday }).cheapest.total, 8000);
assert.strictEqual(O.promoSummary([room], {}, { now: monday }).isToday, true);
assert.strictEqual(O.bestCoupleDeal(room, '2026-10-13', { now: monday }).total, 6000);
const short = Object.assign({}, room, { offpeak_rules: [{ weekdays: [1], hour_start: 10, hour_end: 11, price_per_hour: 1000 }] });
assert.strictEqual(O.bestCoupleDeal(short, '2026-10-12', { now: monday }).total, 8000);
assert.strictEqual(O.bestCoupleDeal(short, '2026-10-12', { now: monday, unavailableHours: [11] }), null);
assert.strictEqual(O.bestCoupleDeal(Object.assign({}, room, { seats_count: 1 }), '2026-10-12', { now: monday }), null);
assert.strictEqual(O.bestCoupleDeal(Object.assign({}, room, { opening_hours_end: 11 }), '2026-10-12', { now: monday }), null);
const tue = Object.assign({}, room, { offpeak_rules: [room.offpeak_rules[1]] });
const next = O.promoSummary([tue], {}, { now: monday });
assert.strictEqual(next.daysAway, 1);
assert.strictEqual(next.shortLabel, '明日');
assert.strictEqual(next.cheapest.date, '2026-10-13');
const sunday = new Date(2026, 9, 11, 0, 0);
assert.strictEqual(O.promoSummary([room], {}, { now: sunday }).daysAway, 1);
assert.strictEqual(O.promoSummary([], { weekday_room_discount_enabled: true }, { now: sunday }).enabled, false);
const selected = [['2026-10-12 16:00:00', '2026-10-12 17:00:00'], ['2026-10-12 17:00:00', '2026-10-12 18:00:00']];
const view = O.selectionView(room, '2026-10-12', selected);
assert.strictEqual(view.valid, true);
assert.strictEqual(view.roomText, '50');
assert.strictEqual(view.rows.length, 2);
assert.strictEqual(view.rows[0].amountText, '20');
assert.strictEqual(view.rows[1].amountText, '30');
assert.strictEqual(O.selectionView(room, '2026-10-13', selected).valid, false);
assert.strictEqual(O.selectionView(room, '2026-10-12', [selected[0], ['2026-10-12 18:00:00', '2026-10-12 19:00:00']]).valid, false);
assert.strictEqual(O.dayPriceView(room, '2026-10-11').hasOffpeak, false);
assert.strictEqual(O.dayPriceView(room, '2026-10-12').discountText, '房费6.7折');
console.log('Pricing display: 22 regression assertions passed');
