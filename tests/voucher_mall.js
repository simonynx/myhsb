const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
function load(file, globals) {
  const context = Object.assign({ module: { exports: {} }, Date, Number }, globals);
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../' + file), 'utf8')
    .replace(/^import .*$/mg, '').replace('export default', 'module.exports ='), context);
  return context.module.exports;
}
const SUBSCRIPTION = load('utils/subscription.js', { formatDate: () => '' });
const PRESENTATION = load('utils/subscriptionPresentation.js', { SUBSCRIPTION });
const LOYALTY = load('utils/loyaltyPresentation.js');
const actions = [];
const storage = {};
const uni = { navigateTo: value => actions.push(value.url), redirectTo: value => actions.push(value.url),
  switchTab: value => actions.push(value.url), showModal: value => actions.push(value),
  getStorageSync: key => storage[key], setStorageSync: (key, value) => { storage[key] = value; },
  removeStorageSync: key => { delete storage[key]; } };
const MALL_NAV = load('utils/mallNavigation.js', { uni });
let subscriptions = () => Promise.resolve({ _status: 0, data: [] });
let goods = () => Promise.resolve({ _status: 0, data: { goods: [] } });
const AUTH = { getSubscriptionCards: () => subscriptions(), getGoodsList: () => goods(), trackEvent: () => Promise.resolve({}) };
const source = fs.readFileSync(path.join(__dirname, '../pages/voucher/voucher.vue'), 'utf8');
const context = { module: { exports: {} }, Date, Number, SUBSCRIPTION, PRESENTATION, LOYALTY, MALL_NAV, AUTH, uni,
  mapState: () => ({}), mapActions: () => ({}) };
vm.runInNewContext(source.match(/<script>([\s\S]*?)<\/script>/)[1]
  .replace(/^import .*$/mg, '').replace('export default', 'module.exports ='), context);
const page = context.module.exports;
function instance() {
  const data = Object.assign(page.data(), { hasLogin: true, token: 'test-only', userInfo: { points: 0 } });
  Object.entries(page.methods).forEach(([name, method]) => { data[name] = method.bind(data); });
  Object.entries(page.computed).forEach(([name, getter]) => Object.defineProperty(data, name, { get: () => getter.call(data) }));
  return data;
}
const room = { object_id: 'r', name: '体验小时卡', target_type: 2, total_limit: 4, price: 12800, validity_days: 30,
  usage_rules: [{ slot: 'room_hours', max_per_order: 4 }] };
async function run() {
  const app = instance();
  assert.strictEqual(app.mainTabs, undefined);
  app.userInfo = { points: 200, member_level: 0 };
  app.goodsList = [{object_id:'pure',goods_type:2,exchange_type:2,points_price:180,stock:3}, {object_id:'mixed',goods_type:2,exchange_type:3,points_price:100,price:400,stock:3}, {object_id:'empty',goods_type:2,exchange_type:2,points_price:50,stock:0}];
  assert.strictEqual(app.featuredBenefits.length, 1);
  assert.strictEqual(app.featuredBenefits[0].object_id, 'pure');
  assert.strictEqual(app.pointsSummary.valueText, '');
  app.goPoints(); assert.strictEqual(actions.pop(), '/pages/voucher/points');
  app.goSupply(); assert.strictEqual(actions.pop(), '/pages/voucher/supply?source=mall_secondary');
  assert.strictEqual(app.mainTab, 2);
  app.goClaim();
  assert.strictEqual(actions.pop(), '/pages/voucher/claim');
  const view = app.buildSubscriptionCardView(room);
  assert.strictEqual(view.limitText, '共4小时');
  assert(!view.sellingPoint.includes('3次'));
  assert.strictEqual(view.buyText, '查看详情');
  assert.strictEqual(view.detailsOpen, undefined);
  subscriptions = () => Promise.reject(new Error('network'));
  await app.loadSubscriptionCards();
  assert.strictEqual(app.subscriptionsLoading, false);
  assert(app.subscriptionsError.includes('加载失败'));
  app.buyCard(view);
  assert.strictEqual(actions.length, 0);
  app.selectInitialTab();
  assert.strictEqual(app.mainTab, 2);
  subscriptions = () => Promise.resolve({ _status: 0, data: [room] });
  await app.loadSubscriptionCards();
  assert.strictEqual(app.subscriptionsError, '');
  assert.strictEqual(app.subscriptionTargetType, 2);
  assert.strictEqual(app.displaySubscriptionCards.length, 1);
  app.buyCard(view);
  assert.strictEqual(actions.pop(), '/pages/user/subscription/buy?card_id=r&source=voucher_mall&target_type=2');
  app.subscriptionTargetType = 1;
  await app.loadSubscriptionCards();
  assert.strictEqual(app.subscriptionTargetType, 2);
  MALL_NAV.openCardMall({ source: 'room_checkout', targetType: 2, amount: 60, returnToCheckout: true,
    returnUrl: '/pages/order/createOrder', returnDraft: { numOfPeople: 3 } });
  actions.pop();
  app.applyInitialTab();
  assert.strictEqual(app.checkoutContextVisible, true);
  assert.strictEqual(app.subscriptionTargetType, 2);
  app.buyCard(view);
  const checkoutUrl = actions.pop();
  assert(checkoutUrl.includes('card_id=r&source=room_checkout'));
  assert(checkoutUrl.includes('return_to_checkout=1'));
  assert(checkoutUrl.includes('return_url=%2Fpages%2Forder%2FcreateOrder'));
  app.returnToCheckout();
  assert.strictEqual(actions.pop(), app.mallIntent.returnUrl);
  assert(app.mallIntent.returnUrl.includes('mall_return_id='));
  assert.strictEqual(MALL_NAV.takeCheckoutDraft('room_checkout', app.mallIntent.returnId).numOfPeople, 3);
  subscriptions = () => Promise.resolve({ _status: 0, data: [] });
  await app.loadSubscriptionCards();
  assert.strictEqual(app.subscriptionTargetType, 2);
  assert.strictEqual(app.displaySubscriptionCards.length, 0);
  assert.strictEqual(app.subscriptionsError, '');
  app.mallIntent = null;
  storage.voucherInitialTab = 'coupon';
  app.applyInitialTab();
  assert.strictEqual(app.mainTab, 2);
  assert.strictEqual(actions.pop(), '/pages/voucher/claim');
  assert.strictEqual(storage.voucherInitialTab, undefined);
  storage.voucherInitialTab = 'points';
  app.applyInitialTab();
  assert.strictEqual(actions.pop(), '/pages/voucher/points');
  storage.voucherInitialTab = 'shop';
  app.applyInitialTab();
  assert.strictEqual(actions.pop(), '/pages/voucher/supply?source=mall_secondary');
  app.selectInitialTab();
  assert.strictEqual(app.mainTab, 2);
  goods = () => Promise.reject(new Error('network'));
  await app.loadGoods();
  assert(app.goodsError.includes('失败'));
  goods = () => Promise.resolve({ _status: 0, data: { goods: [] } });
  await app.loadGoods();
  assert.strictEqual(app.goodsError, '');
  assert.strictEqual(app.goodsLoading, false);
  const resolvers = [];
  subscriptions = () => new Promise(resolve => resolvers.push(resolve));
  const first = app.loadSubscriptionCards();
  const second = app.loadSubscriptionCards();
  resolvers[1]({ _status: 0, data: [room] });
  await second;
  resolvers[0]({ _status: 0, data: [] });
  await first;
  assert.strictEqual(app.subscriptionCards.length, 1);
  const template = source.match(/<template>([\s\S]*?)<\/template>/)[1];
  assert(!/:(?:class|style)="[^"]*\w+\(/.test(template));
  assert(!/:class="[^"]*\{/.test(template));
  assert(!template.includes('mainTab === 0'));
  assert(!template.includes('sub-card-details'));
  assert(template.includes('v-if="subscriptionsLoading"'));
  assert(template.includes('v-else-if="subscriptionsError"'));
  assert(!template.includes('main-tabs'));
  assert(!template.includes('goods-grid'));
  assert(template.includes('loyalty-summary'));
  console.log('Mall: card-focused layout, compact loyalty summary, separated supply/points and checkout return passed');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
