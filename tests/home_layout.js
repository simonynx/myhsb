const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const homepage = fs.readFileSync(path.join(__dirname, '../pages/index/index.vue'), 'utf8');
const helper = fs.readFileSync(path.join(__dirname, '../utils/offpeak.js'), 'utf8');
const helperContext = { module: { exports: {} }, Date, Number };
vm.runInNewContext(helper.replace('export default', 'module.exports ='), helperContext);
const actions = [];
const storage = {};
const uni = {
  getSystemInfoSync: () => ({ statusBarHeight: 24, windowWidth: 375 }),
  getMenuButtonBoundingClientRect: () => ({ top: 32, bottom: 64, height: 32, left: 279 }),
  switchTab: value => actions.push(value.url),
  navigateTo: value => actions.push(value.url),
  setStorageSync: (key, value) => { storage[key] = value; },
};
const context = {
  module: { exports: {} }, OFFPEAK: helperContext.module.exports, Date, Number, uni,
  AUTH: { trackEvent: () => Promise.resolve({}) },
  mapState: () => ({}), mapActions: () => ({}), mapMutations: () => ({}),
};
const script = homepage.match(/<script>([\s\S]*?)<\/script>/)[1]
  .replace(/^\s*import .*$/mg, '').replace('export default', 'module.exports =');
vm.runInNewContext(script, context);
const page = context.module.exports;
function instance(config) {
  const data = page.data();
  data.constance = Object.assign({}, config);
  data.nowTimestamp = new Date(2026, 9, 12, 12).getTime();
  Object.entries(page.methods).forEach(([name, method]) => { data[name] = method.bind(data); });
  Object.entries(page.computed).forEach(([name, getter]) => {
    Object.defineProperty(data, name, { get: () => getter.call(data) });
  });
  return data;
}

const app = instance({ ticket_price_per_person: 3850, perler_day_price: 6950,
  perler_upgrade_price: 3150, perler_channel_upgrade_price: 3950 });
assert.strictEqual(app.ticketPriceText, '¥38.5/人');
assert.strictEqual(app.perlerDayPriceText, '¥69.5/人');
assert.strictEqual(app.perlerUpgradePriceText, '¥31.5/人');
assert.strictEqual(app.perlerChannelUpgradePriceText, '¥39.5/人');
assert.strictEqual(Array.from(app.playOptions, option => option.key).join(','), 'hall,room,perler');
assert(app.playOptions.every(option => option.iconClass && option.action));
assert.strictEqual(app.heroClass, 'home-hero no-photo');
app.carouselList = ['configured-store-image'];
assert.strictEqual(app.heroClass, 'home-hero');
assert.strictEqual(app.promoPriceText, '');
assert.strictEqual(app.weekdayDiscount.enabled, false);
app.promoRooms = [{ object_id: 'room', name: '测试房间', seats_count: 4,
  price_per_hour: 3500, price_per_person: 3800, opening_hours_start: 10,
  opening_hours_end: 22, offpeak_rules: [{ weekdays: [1], hour_start: 10,
    hour_end: 17, price_per_hour: 2100 }] }];
assert.strictEqual(app.promoPriceText, '118');
assert.strictEqual(app.promoPriceText, app.weekdayDiscount.cheapest.totalText);
app.goPromoReserve();
assert.strictEqual(storage.offpeak_reserve_intent.date, '2026-10-12');
assert.strictEqual(storage.offpeak_reserve_intent.roomId, 'room');
assert.strictEqual(actions.pop(), '/pages/tabBar/appoint/appoint');
app.playOptions.forEach(option => app.handleSceneTap(option));
assert.deepStrictEqual(actions.splice(0), ['/pages/ticket/buy?count=1',
  '/pages/tabBar/appoint/appoint', '/pages/ticket/buy?mode=perler_day']);

[false, 0, '0', 'false'].forEach(perler_enabled => {
  const disabled = instance({ perler_enabled });
  assert.strictEqual(Array.from(disabled.playOptions, option => option.key).join(','), 'hall,room');
  assert.strictEqual(disabled.heroPlayText.includes('拼豆'), false);
  assert.strictEqual(disabled.playOptions[1].className, 'play-option room full');
});

app.initHomeNavbar();
assert.strictEqual(app.homeNavbarStyle, 'padding-top:24px;height:72px;padding-right:108px;');
uni.getMenuButtonBoundingClientRect = () => ({ top: 0, bottom: 0, height: 0, left: 0 });
app.initHomeNavbar();
assert.strictEqual(app.homeNavbarStyle, 'padding-top:24px;height:68px;padding-right:16px;');
delete uni.getMenuButtonBoundingClientRect;
app.initHomeNavbar();
assert.strictEqual(app.homeNavbarStyle, 'padding-top:24px;height:68px;padding-right:16px;');
uni.getSystemInfoSync = () => { throw new Error('unsupported'); };
app.initHomeNavbar();
assert.strictEqual(app.homeNavbarStyle, '');

const template = homepage.match(/<template>([\s\S]*?)<\/template>/)[1];
assert(!template.includes('hall-benefits'));
assert(template.indexOf('social-section') < template.indexOf('service-section'));
assert(template.indexOf('review-section') < template.indexOf('store-section'));
assert(template.includes('@tap="goToReserve"'));
assert(template.includes('@tap="openLocation"'));
assert(!/:class="[^"]*\{/.test(template));
assert(!/:(?:class|style)="[^"]*\w+\(/.test(template));
const pagesSource = fs.readFileSync(path.join(__dirname, '../pages.json'), 'utf8');
const homeConfig = pagesSource.match(/"path":\s*"pages\/index\/index",([\s\S]*?)"navigationStyle":\s*"custom"/)[1];
assert(homeConfig.includes('"navigationBarTextStyle": "black"'));
assert(homeConfig.includes('"navigationBarBackgroundColor": "#F7F5F1"'));
console.log('Home layout: prices, feature flags, entry routes, promotion and navigation insets passed');
