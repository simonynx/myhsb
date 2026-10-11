const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'components/pretty-times/pretty-times.vue'), 'utf8');
const script = source.match(/<script>([\s\S]*?)<\/script>/)[1]
  .replace(/^\s*import .*$/mg, '').replace('export default', 'return');
const Time = new Function(script)();
function picker(count, multiple = true) {
  const events = [];
  const data = Object.assign(Time.data(), Time.methods, {
    selectDate: '2099-01-12', isQuantum: multiple, isMultiple: multiple, isSection: false,
    timeArr: Array.from({ length: count }, (_, index) => ({
      begin: String(9 + index).padStart(2, '0') + ':00',
      end: String(10 + index).padStart(2, '0') + ':00',
      time: String(9 + index).padStart(2, '0') + ':00',
      isActive: false, disable: index === 4,
    })),
    $set: (target, key, value) => { target[key] = value; },
    $nextTick: callback => callback(), $forceUpdate: () => {},
    $emit: (...args) => events.push(args),
  });
  Object.entries(Time.computed).forEach(([key, getter]) => Object.defineProperty(data, key, { get: () => getter.call(data) }));
  return { data, events };
}
for (const count of [0, 1, 2, 3, 4, 5, 7, 12, 13, 24]) {
  const { data } = picker(count);
  assert.strictEqual(data.timeRows.length, Math.ceil(count / 3));
  assert(data.timeRows.every(row => row.slots.length === 3), 'each row must retain exactly three equal-width slots');
  const slots = data.timeRows.flatMap(row => row.slots);
  const actual = slots.filter(item => !item.isPlaceholder);
  assert.strictEqual(actual.length, count);
  actual.forEach((item, index) => {
    assert.strictEqual(item.index, index, 'row-local index must never replace original selection index');
    assert.strictEqual(item.source, data.timeArr[index]);
    assert.strictEqual(item.begin, data.timeArr[index].begin);
  });
  slots.filter(item => item.isPlaceholder).forEach(item => assert.strictEqual(item.source, undefined));
  assert.strictEqual(new Set(slots.map(item => item.key)).size, slots.length);
}
const { data, events } = picker(7);
const fourth = data.timeRows[1].slots[0];
data.handleSelect(fourth.index, fourth.source);
assert.strictEqual(data.timeArr[3].isActive, true);
assert.strictEqual(data.timeArr[0].isActive, false);
assert(data.timeRows[1].slots[0].className.includes('selected'));
assert.deepStrictEqual(events.pop()[1][0].item, ['2099-01-12 12:00:00', '2099-01-12 13:00:00']);
const disabled = data.timeRows[1].slots[1];
data.handleSelect(disabled.index, disabled.source);
assert.strictEqual(data.timeArr[4].isActive, false);
assert.strictEqual(events.length, 0, 'disabled slots must not emit a changed quote');
const last = data.timeRows[2].slots[0];
data.handleSelect(last.index, last.source);
assert.strictEqual(data.timeArr[6].isActive, true);
data.handleSelect(fourth.index, fourth.source);
assert.strictEqual(data.timeArr[3].isActive, false);
assert.strictEqual(data.orderTimeArr[data.selectDate].length, 1);
const single = picker(7, false).data;
const singleLast = single.timeRows[2].slots[0];
single.selectTimeEvent(singleLast.index, singleLast.source);
assert.strictEqual(single.timeActive, 6);
assert.strictEqual(single.orderDateTime, '2099-01-12 15:00');
const template = source.match(/<template>([\s\S]*?)<\/template>/)[1];
assert.strictEqual((template.match(/v-for="row in timeRows"/g) || []).length, 2);
assert.strictEqual((template.match(/v-for="item in row.slots"/g) || []).length, 2);
assert.strictEqual((template.match(/v-if="!item.isPlaceholder"/g) || []).length, 2);
assert(template.includes('handleSelect(item.index,item.source)'));
assert(template.includes('selectTimeEvent(item.index,item.source)'));
assert(!/:(?:class|style)="[^"]*\w+\(/.test(template));
assert(!/:class="[^"]*\{/.test(template));
const styles = source.match(/<style[^>]*>([\s\S]*?)<\/style>/)[1];
const rowStyle = styles.match(/\.time-row\s*\{([^}]*)\}/)[1];
const slotStyle = styles.match(/\.time-slot\s*\{([^}]*)\}/)[1];
const cellStyle = styles.match(/\.time-cell\s*\{([^}]*)\}/)[1];
assert(/flex-wrap:\s*nowrap/.test(rowStyle));
assert(/flex:\s*1\s*;/.test(slotStyle) && /min-width:\s*0\s*;/.test(slotStyle));
assert(/padding:\s*8rpx\s*;/.test(slotStyle));
assert(/width:\s*100%\s*;/.test(cellStyle) && /margin:\s*0\s*;/.test(cellStyle));
assert(!/calc\(|\bgap\s*:|flex-wrap:\s*wrap/.test(rowStyle + slotStyle + cellStyle));
console.log('Booking grid: fixed three-slot rows, partial-row placeholders, original indices and selection states passed');
