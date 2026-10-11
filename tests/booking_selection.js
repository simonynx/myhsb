const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
function moduleValue(file, bindings) {
  let code = fs.readFileSync(path.join(root, file), 'utf8');
  if (file.endsWith('.vue')) code = code.match(/<script>([\s\S]*?)<\/script>/)[1];
  code = code.replace(/^\s*import .*$/mg, '').replace(/^export \{[^}]*\};?\s*$/mg, '').replace('export default', 'return');
  return new Function(...Object.keys(bindings), code)(...Object.values(bindings));
}
const OFFPEAK = moduleValue('utils/offpeak.js', {});
const day = '2099-01-12';
const nextDay = '2099-01-13';
const room = { object_id: 'r', name: '测试房', price_per_hour: 3000, price_per_person: 2000,
  seats_count: 2, opening_hours_start: 10, opening_hours_end: 13,
  offpeak_rules: [{ weekdays: [1, 2, 3, 4, 5, 6, 7], hour_start: 10, hour_end: 12, price_per_hour: 1000 }] };
let response;
let navigations = 0;
const Page = moduleValue('pages/product/product.vue', {OFFPEAK, ROOM_DESC: {}, times: {}, BookingPrice: {}, mapState: () => ({}), mapActions: () => ({}),
  AUTH: {getRoomAppointments: () => Promise.resolve(response)}, uni: {navigateTo: () => navigations++}});
const instance = Object.assign(Page.data(), Page.methods, {
  room, currentSelectDate: day, roomDate: day, hasLogin: true, $set: (obj, key, value) => {obj[key] = value;}, $refs: {},
});
Object.entries(Page.computed).forEach(([key, getter]) => Object.defineProperty(instance, key, {get: () => getter.call(instance)}));
(async () => {
  assert.strictEqual(instance.dayCoupleDeal, null, 'unknown availability must not advertise a price');
  response = {data: {time_list: {'[10,11]': true, '[11,12]': true, '[12,13]': true}}};
  await instance._fetchDisableTimeSlot(day);
  assert.strictEqual(instance.dayCoupleDeal.total, 6000);
  instance.currentSelectDate = nextDay;
  assert.strictEqual(instance.dayCoupleDeal, null);
  response = {data: {time_list: {'[10,11]': false, '[11,12]': false, '[12,13]': false}}};
  await instance._fetchDisableTimeSlot(nextDay);
  assert.strictEqual(instance.dayCoupleDeal, null, 'fully booked discounted range must not be shared');
  assert.strictEqual(instance.isFullyBooked, true);
  assert.strictEqual(instance.bottomButtonText, '换个日期看看');
  instance.goToAppoint();
  assert.strictEqual(instance.specClass, 'show', 'a full date must not trap customers outside the date picker');
  instance.currentSelectDate = day;
  instance.disableTimeSlot = [['keep-current-date']];
  await instance._fetchDisableTimeSlot(nextDay);
  assert.deepStrictEqual(instance.disableTimeSlot, [['keep-current-date']], 'late response must not overwrite the active date');
  assert.strictEqual(instance.dayCoupleDeal.total, 6000);

  const Time = moduleValue('components/pretty-times/pretty-times.vue', {
    initData: () => [{date: day}, {date: nextDay}],
    initTime: () => [{begin: '10:00', end: '11:00', disable: false}, {begin: '11:00', end: '12:00', disable: false}],
    currentTime: () => ({date: '2000-01-01', time: '00:00:00'}),
  });
  const emitted = [];
  const picker = Object.assign(Time.data(), Time.methods, {
    selectDate: day, isQuantum: true, isMultiple: true, isSection: false, beginTime: '10:00:00', endTime: '12:00:00', timeInterval: 1,
    disableTimeSlot: [[day + ' 10:00:00', day + ' 11:00:00']],
    orderTimeArr: {[day]: [[day + ' 10:00:00', day + ' 11:00:00'], [day + ' 11:00:00', day + ' 12:00:00']]},
    $set: (obj, key, value) => {obj[key] = value;}, $emit: (...args) => emitted.push(args),
  });
  picker.initOnload();
  assert.strictEqual(picker.timeArr[0].isActive, false, 'newly unavailable slot must be removed from selection');
  assert.strictEqual(picker.orderTimeArr[day].length, 1);
  assert.strictEqual(emitted[0][0], 'change');
  assert.strictEqual(emitted[0][1].length, 1, 'parent quote must refresh after removing unavailable slot');
  picker.selectDateEvent(1, {date: nextDay});
  assert.deepStrictEqual(picker.orderTimeArr, {});
  assert.strictEqual(picker.timeArr.some(slot => slot.isActive), false);
  assert.strictEqual(emitted[emitted.length - 1][1].length, 0);
  const pickerSource = fs.readFileSync(path.join(root, 'components/pretty-times/pretty-times.vue'), 'utf8');
  const pickerStyle = pickerSource.match(/<style[^>]*>([\s\S]*?)<\/style>/)[1];
  const rootStyle = pickerStyle.match(/\.content\s*\{([^}]*)\}/)[1];
  assert(/height:\s*auto\s*;/.test(rootStyle), 'picker must occupy its content height so the following price card cannot overlap the time grid');
  for (const file of ['pages/product/product.vue', 'pages/tabBar/appoint/appoint.vue']) {
    const template = fs.readFileSync(path.join(root, file), 'utf8').match(/<template>([\s\S]*?)<\/template>/)[1];
    assert(/class="panel-times"[\s\S]*?<times[\s\S]*?<\/times>\s*<booking-price\b/.test(template), file + ' must keep the picker and price card in the same scroll area');
  }
  console.log('Booking selection: availability, date-switch and popup content-height regressions passed');
})().catch(error => {console.error(error);process.exitCode = 1;});
