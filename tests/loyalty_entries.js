const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Execute the actual SFC methods/computed properties, without a Vue runtime.
const root = path.join(__dirname, '..');
const files = {
  user: 'pages/user/user.vue', home: 'pages/index/index.vue', order: 'pages/order/order.vue',
};
const navigation = [], modals = [], storageWrites = [], events = [];
let loginCalls = 0;
const uni = {
  navigateTo: options => navigation.push(['navigateTo', options.url]),
  switchTab: options => navigation.push(['switchTab', options.url]),
  setStorageSync: (key, value) => storageWrites.push([key, value]),
  getStorageSync: () => '',
  showModal: options => modals.push(options),
  showToast: () => {},
};
const fulfillmentCode = fs.readFileSync(path.join(root, 'utils/goodsFulfillment.js'), 'utf8')
  .replace(/^export function /gm, 'function ')
  .replace('export default', 'return');
const GOODS_FULFILLMENT = new Function(fulfillmentCode)();
const bindings = {
  uni, GOODS_FULFILLMENT,
  AUTH: { trackEvent: event => { events.push(event); return Promise.resolve(); } },
  MALL_NAV: { openCardMall: () => navigation.push(['cardMall']) },
  SUBSCRIPTION: {}, PLATFORM: {}, OFFPEAK: {},
  formatDate: () => '', formatDateTime: () => '',
  mapState: () => ({}), mapActions: () => ({}), mapMutations: () => ({}),
};
const sources = {};
const pages = Object.fromEntries(Object.entries(files).map(([name, file]) => {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  sources[name] = text;
  const code = text.match(/<script>([\s\S]*?)<\/script>/)[1]
    .replace(/^\s*import[\s\S]*?from\s+['"][^'"]+['"];?[ \t]*(?:\r?\n|$)/gm, '')
    .replace('export default', 'return');
  return [name, new Function(...Object.keys(bindings), code)(...Object.values(bindings))];
}));
function instance(name, overrides = {}) {
  const vm = Object.assign(pages[name].data(), pages[name].methods, {
    hasLogin: true, token: 'existing-token', userInfo: { points: 37, account_balance: 1250 },
    loginAndRegister: () => { loginCalls++; return Promise.resolve(); },
  }, overrides);
  for (const [key, computed] of Object.entries(pages[name].computed)) {
    Object.defineProperty(vm, key, { configurable: true, get: () => computed.call(vm) });
  }
  return vm;
}
function reset() {
  navigation.length = modals.length = storageWrites.length = events.length = 0;
  loginCalls = 0;
}
function assertPointsNavigation() {
  assert.deepStrictEqual(navigation, [['navigateTo', '/pages/voucher/points']]);
  assert.deepStrictEqual(storageWrites, [], 'points navigation must not select an old mall tab');
}
const noop = () => {};
const quietUser = {
  getUserInfo: noop, loadCheckInInfo: noop, loadInviteInfo: noop,
  loadMemberConfig: noop, loadOrderCounts: noop, loadCouponCounts: noop,
};
function ticket(overrides = {}) {
  return Object.assign({
    object_id: 'ticket-id', order_number: 'not-the-order-id', order_status: 1, order_type: 6,
    ticketVariant: 'hall', expire_at: Math.floor(Date.now() / 1000) + 86400,
    goodsInfo: { addons: [{ object_id: 'existing-addon', name: '原增值服务', price: 600 }] },
  }, overrides);
}
function appointment(overrides = {}) {
  const tomorrow = new Date(Date.now() + 86400000);
  const date = [tomorrow.getFullYear(), String(tomorrow.getMonth() + 1).padStart(2, '0'),
    String(tomorrow.getDate()).padStart(2, '0')].join('-');
  return ticket(Object.assign({
    object_id: 'appointment-id', order_type: 1,
    goodsInfo: { date, time_list: [['10:00', '12:00']], addons: [{ name: '原套餐', price: 800 }] },
  }, overrides));
}
async function run() {
  reset();
  const guest = instance('user', { ...quietUser, hasLogin: false });
  pages.user.onShow.call(guest);
  assert.strictEqual(loginCalls, 0, 'guest lifecycle must not initiate login');
  assert.strictEqual(guest.availablePointsText, '-');
  assert.strictEqual(guest.balanceText, '-');
  assert.deepStrictEqual(navigation, []);
  guest.goPointsCenter();
  assert.strictEqual(loginCalls, 1, 'explicit user points tap retains its login gate');
  assert.deepStrictEqual(navigation, [], 'guest points tap must not navigate before login');
  assert.deepStrictEqual(storageWrites, []);
  await Promise.resolve();

  reset();
  const user = instance('user');
  assert.strictEqual(user.availablePointsText, '37');
  assert.strictEqual(user.balanceText, '¥12.50', 'wallet continues using actual cents balance');
  for (const [points, expected] of [[0, '0'], ['82', '82'], [undefined, '-'], [null, '-'], ['', '-'], ['invalid', '-'], [-1, '-']]) {
    user.userInfo.points = points;
    assert.strictEqual(user.availablePointsText, expected, 'unknown points are not invented');
  }
  user.userInfo = null;
  assert.strictEqual(user.availablePointsText, '-');
  user.goPointsCenter();
  assertPointsNavigation();
  assert.strictEqual(loginCalls, 0);

  reset();
  const homeGuest = instance('home', {
    hasLogin: false, startStoreClock: noop, loadPromoRooms: noop,
    schedulePageViewTrack: noop, trackHomeBenefitView: noop, trackInviteLandingView: noop,
    scheduleDeferredRefresh: noop, constance: null,
    loadCheckInInfo: () => { throw new Error('guest lifecycle must not fetch private check-in info'); },
  });
  pages.home.onShow.call(homeGuest);
  assert.strictEqual(loginCalls, 0, 'home guest appearance must not initiate login');
  homeGuest.goToVoucher('home_points');
  assertPointsNavigation();
  assert.strictEqual(loginCalls, 0, 'public points browsing does not initiate login');

  reset();
  const home = instance('home', { checkInInfo: { can_check_in: false } });
  home.handleHomeBenefitTap();
  assertPointsNavigation();
  reset();
  instance('home', { hasLogin: false, loadCheckInInfo: noop }).handleHomeBenefitTap();
  assert.strictEqual(loginCalls, 1, 'explicit guest check-in tap keeps its existing login flow');
  assert.deepStrictEqual(navigation, []);
  await Promise.resolve();

  for (const name of ['home', 'user']) {
    reset();
    const vm = instance(name, { checkInInfo: { current_streak: 2, tomorrow_points: 13 } });
    vm.showCheckInSuccess({ points_earned: 12 });
    const modal = modals.pop();
    assert.strictEqual(modal.confirmText, '积分福利');
    assert(modal.content.includes('+12 积分') && modal.content.includes('+13 积分'));
    modal.success({ confirm: false });
    assert.deepStrictEqual(navigation, [], 'cancelled success CTA does not navigate');
    modal.success({ confirm: true });
    assertPointsNavigation();
  }

  // Keep card mall intent/navigation untouched; points is now a separate route.
  reset();
  instance('user', { hasLogin: false }).goSubscriptionMall();
  instance('home', { hasLogin: false }).goToSubscriptionMall();
  assert.deepStrictEqual(navigation, [['cardMall'], ['cardMall']]);
  assert.strictEqual(loginCalls, 0);

  reset();
  const order = instance('order');
  const eligible = [appointment(), ticket(), ticket({ ticketVariant: 'perler_day' }),
    ticket({ verified_at: Math.floor(Date.now() / 1000), expire_at: 1 })];
  for (const item of eligible) {
    assert.strictEqual(order.canShowSupplyEntry(item), true);
    const snapshot = JSON.stringify(item);
    reset();
    order.goToSupply(item);
    assert.deepStrictEqual(navigation, [['navigateTo', '/pages/voucher/supply?source=order&order_id=' + encodeURIComponent(item.object_id)]]);
    assert.strictEqual(JSON.stringify(item), snapshot, 'entry must not mutate addons or select a purchase');
    assert.deepStrictEqual(storageWrites, []);
    assert.deepStrictEqual(modals, []);
  }
  for (const state of [0, 2, 3, 4, 5, 6, 8, 9, 10, 99, undefined, null, 'SUCCESS']) {
    for (const item of [ticket({ order_status: state }), appointment({ order_status: state })]) {
      reset();
      assert.strictEqual(order.canShowSupplyEntry(item), false, 'only SUCCESS=1 is paid, including no refund/refunding entry');
      order.goToSupply(item);
      assert.deepStrictEqual(navigation, []);
    }
  }
  for (const type of [2, 3, 4, 5, 7, 99, undefined]) {
    assert.strictEqual(order.canShowSupplyEntry(ticket({ order_type: type })), false, 'subscription/other orders must not get a supply entry');
  }
  const invalid = [null, ticket({ object_id: '' }), ticket({ ticketVariant: 'perler_upgrade' }),
    ticket({ includes_entry: false }), ticket({ goodsInfo: { includes_entry: false } }),
    ticket({ expire_at: 1 }), ticket({ expire_at: 'malformed-date' }),
    ticket({ verified_at: Math.floor(Date.now() / 1000) - 172800 }),
    appointment({ goodsInfo: {} }), appointment({ goodsInfo: { date: 'bad', time_list: [['10:00', '12:00']] } }),
    appointment({ goodsInfo: { date: '2000-01-01', time_list: [['10:00', '12:00']] } })];
  for (const item of invalid) {
    reset();
    assert.strictEqual(order.canShowSupplyEntry(item), false, 'invalid/expired/historical visit should not get an entry');
    order.goToSupply(item);
    assert.deepStrictEqual(navigation, []);
  }
  reset();
  order.goToSupply(ticket({ object_id: 'id /?&=中文', order_number: 'must-not-use-this' }));
  const url = new URL(navigation[0][1], 'https://test.invalid');
  assert.strictEqual(url.pathname, '/pages/voucher/supply');
  assert.strictEqual(url.searchParams.get('source'), 'order');
  assert.strictEqual(url.searchParams.get('order_id'), 'id /?&=中文');
  assert.deepStrictEqual([...url.searchParams.keys()], ['source', 'order_id'], 'no automatic SKU, selection, or checkout parameters');

  const liveItem = ticket();
  order.navList[0].orderList = [liveItem, ticket({ object_id: 'subscription-id', order_type: 7 })];
  assert.deepStrictEqual(order.supplyEntryIds, { 'ticket-id': true });
  liveItem.order_status = 10;
  assert.deepStrictEqual(order.supplyEntryIds, {}, 'computed guard hides entry immediately when refund begins');
  reset();
  order.goToSupply(liveItem);
  assert.deepStrictEqual(navigation, [], 'tap also rechecks stale paid/refunded state');
  order.hasLogin = false;
  liveItem.order_status = 1;
  assert.deepStrictEqual(order.supplyEntryIds, {});
  order.goToSupply(liveItem);
  assert.deepStrictEqual(navigation, []);
  pages.order.onShow.call(order);
  assert.strictEqual(loginCalls, 0, 'guest order lifecycle/entry never starts login automatically');

  // Fulfillment is supplementary, not a financial-status or tab mutation.
  reset();
  order.hasLogin = true;
  const goodsOrder = (id, fulfillment, overrides = {}) => ({
    object_id: id, order_type: 5, order_status: 1, goods_fulfillment: fulfillment,
    goodsInfo: {}, ...overrides,
  });
  const pendingGoods = goodsOrder('pending-goods', { kind: 'pickup', status: 'pending', received_at: null });
  const receivedGoods = goodsOrder('received-goods', {
    kind: 'pickup', status: 'received', received_at: '2026-10-11T10:30:00+08:00',
  });
  const couponGoods = goodsOrder('coupon-goods', { kind: 'coupon', status: 'issued', received_at: null }, {
    order_type: 3, goodsInfo: { context: { granted_coupon_id: 'actual-coupon-id' } },
  });
  const unknownGoods = goodsOrder('unknown-goods', undefined);
  const processingCoupon = goodsOrder('processing-coupon', { kind: 'coupon', status: 'issued' });
  const missingReceipt = goodsOrder('missing-receipt', { kind: 'pickup', status: 'received' });
  const refundedGoods = goodsOrder('refunded-goods', { kind: 'pickup', status: 'pending' }, { order_status: 6 });
  const unpaidGoods = goodsOrder('unpaid-goods', { kind: 'pickup', status: 'pending' }, { order_status: 0 });
  order.navList[0].orderList = [pendingGoods, receivedGoods, couponGoods, unknownGoods, processingCoupon,
    missingReceipt, refundedGoods, unpaidGoods, ticket(), ticket({ order_type: 7 })];
  const beforeFulfillment = JSON.stringify(order.navList);
  const fulfillmentViews = order.goodsFulfillmentEntries;
  assert.strictEqual(fulfillmentViews['pending-goods'].status, 'pending');
  assert.strictEqual(fulfillmentViews['pending-goods'].title, '待到店领取');
  assert.strictEqual(fulfillmentViews['received-goods'].title, '已领取');
  assert(fulfillmentViews['received-goods'].receivedAtText.includes('2026-10-11'));
  assert.strictEqual(fulfillmentViews['coupon-goods'].status, 'issued');
  assert.strictEqual(fulfillmentViews['coupon-goods'].title, '优惠券已到账');
  assert.strictEqual(fulfillmentViews['unknown-goods'].title, '领取记录待店员确认');
  assert.strictEqual(fulfillmentViews['processing-coupon'].status, 'processing', 'issued flag alone cannot prove coupon arrival');
  assert.strictEqual(fulfillmentViews['missing-receipt'].status, 'unknown', 'no receipt timestamp means no confirmed pickup');
  assert.strictEqual(fulfillmentViews['refunded-goods'].status, 'closed');
  assert.strictEqual(fulfillmentViews['unpaid-goods'].status, 'notpaid');
  assert(!fulfillmentViews['ticket-id'], 'leisure/subscription orders do not display goods fulfillment');
  assert.strictEqual(JSON.stringify(order.navList), beforeFulfillment, 'computed delivery state must not mutate financial state/tabs');
  assert.strictEqual(order.isFinishedOrder(pendingGoods), true, 'existing financial completed filter stays unchanged');
  assert.strictEqual(order.isPendingUseOrder(pendingGoods), false, 'pickup pending is not silently moved to leisure wait-use tab');
  assert.deepStrictEqual(navigation, [], 'computing fulfillment has no receipt/navigation side effects');
  order.goFulfillmentCoupons(couponGoods);
  assert.deepStrictEqual(navigation, [['navigateTo', '/pages/my/coupons/coupons?tab=unused']]);
  reset();
  for (const item of [pendingGoods, receivedGoods, unknownGoods, processingCoupon, missingReceipt, refundedGoods, unpaidGoods, ticket()]) {
    order.goFulfillmentCoupons(item);
  }
  assert.deepStrictEqual(navigation, [], 'only genuinely issued coupons expose the owned-coupon destination');
  pendingGoods.order_status = 10;
  assert.strictEqual(order.goodsFulfillmentEntries['pending-goods'].status, 'closed', 'refund updates supplementary state immediately');
  order.hasLogin = false;
  assert.deepStrictEqual(order.goodsFulfillmentEntries, {});
  order.goFulfillmentCoupons(couponGoods);
  assert.deepStrictEqual(navigation, []);
  assert.strictEqual(loginCalls, 0);

  const userTemplate = sources.user.split('<script>')[0];
  assert(userTemplate.includes('{{ availablePointsText }}'));
  assert(/points-retention" v-if="hasLogin" @tap="goPointsCenter"/.test(userTemplate));
  assert(userTemplate.includes('积分福利') && userTemplate.includes('可兑换到店礼或按规则抵扣消费'));
  assert.strictEqual((userTemplate.match(/@tap="goCardPack"/g) || []).length, 1);
  assert.strictEqual((userTemplate.match(/@tap="goCouponCenter"/g) || []).length, 1);
  const orderTemplate = sources.order.split('<script>')[0];
  assert(orderTemplate.includes('v-if="supplyEntryIds[item.object_id]"'));
  assert(orderTemplate.includes('goodsFulfillmentEntries[item.object_id].title'));
  assert(orderTemplate.includes('goodsFulfillmentEntries[item.object_id].description'));
  assert(!/markReceived|confirmReceived|确认领取/.test(orderTemplate), 'only staff may confirm actual receipt');
  assert(orderTemplate.includes('额外付费饮品/餐食 · 门票已含零食茶水'));
  assert(orderTemplate.includes('到店自取，不提供配送'));
  assert.strictEqual((orderTemplate.match(/class="supply-entry"/g) || []).length, 1);
  assert(orderTemplate.includes('v-for="(a, ai) in item.goodsInfo.addons"'), 'existing addon packages remain');
  for (const [name, text] of Object.entries(sources)) {
    const template = text.split('<script>')[0];
    assert(!/{{[^\n]*\{\s*\}/.test(template), name + ': no template object literals');
    assert(!/:(?:class|style)="[^"\n]*\w+\([^"\n]*\)/.test(template), name + ': no WXML class/style function calls');
    assert(!/voucherInitialTab', 'points'/.test(text), name + ': no legacy points tab selection');
    assert(!text.includes('\r'), name + ': preserve existing LF endings');
  }
  console.log('loyalty_entries: passed actual methods/computed, login gates, points routes, active paid/refund guards, source identity, trusted fulfillment without financial reclassification and WXML safety');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
