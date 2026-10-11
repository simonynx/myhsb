const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
function moduleValue(file, bindings = {}) {
  let code = fs.readFileSync(path.join(root, file), 'utf8');
  if (file.endsWith('.vue')) code = code.match(/<script>([\s\S]*?)<\/script>/)[1];
  code = code.replace(/^\s*import .*$/mg, '').replace('export default', 'return');
  return new Function(...Object.keys(bindings), code)(...Object.values(bindings));
}
const LOYALTY = moduleValue('utils/loyaltyPresentation.js');
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function harness(file) {
  const requests = [], accountRequests = [], recordRequests = [], recordCalls = [], events = [], navigation = [], titles = [];
  const settings = { throwFetch: false, throwAnalytics: false, rejectAnalytics: false, deferRecords: false, throwRecords: false };
  const Page = moduleValue(file, {
    LOYALTY, mapState: () => ({}), mapActions: () => ({}),
    AUTH: {
      getGoodsList: (token, exchangeType) => {
        if (settings.throwFetch) throw new Error('network');
        const task = deferred(); requests.push(Object.assign(task, { token, exchangeType })); return task.promise;
      },
      getPointRecords: token => {
        recordCalls.push(token);
        if (settings.throwRecords) throw new Error('records network');
        if (!settings.deferRecords) return Promise.resolve({ _status: 0, data: [] });
        const task = deferred(); recordRequests.push(Object.assign(task, { token })); return task.promise;
      },
      trackEvent: (event, token) => {
        if (settings.throwAnalytics) throw new Error('analytics');
        events.push({ event, token });
        return settings.rejectAnalytics ? Promise.reject(new Error('analytics')) : Promise.resolve();
      },
    },
    uni: {
      navigateTo: options => navigation.push(['navigateTo', options.url]),
      switchTab: options => navigation.push(['switchTab', options.url]),
      setNavigationBarTitle: options => titles.push(options.title),
    },
  });
  function instance(extra = {}) {
    const vm = Object.assign(Page.data(), Page.methods, {
      hasLogin: false, token: '', userInfo: null,
      getUserInfo: silent => { const task = deferred(); accountRequests.push(Object.assign(task, { silent })); return task.promise; },
    }, extra);
    Object.entries(Page.computed).forEach(([key, getter]) => Object.defineProperty(vm, key, { get: () => getter.call(vm) }));
    return vm;
  }
  return { Page, instance, requests, accountRequests, recordRequests, recordCalls, events, navigation, titles, settings };
}
const config = { points_to_fen: 2, points_min_use: 100, points_step: 100, points_max_use: 850 };
const account = { points: 1234, member_level: 2, points_config: config };
function goods(id, extra = {}) {
  return Object.assign({ object_id: id, name: id + '商品', goods_type: 2, exchange_type: 2, points_price: 100,
    price: 0, stock: -1, member_level_required: 0, max_buy_per_user: 0, user_bought_count: 0, enabled: true }, extra);
}
const fixtures = [
  goods('mixed', { exchange_type: '3', points_price: 10, price: 899 }),
  goods('pure-c', { points_price: 300 }), goods('pure-a'), goods('pure-b', { points_price: 200 }),
  goods('short', { points_price: 5000 }), goods('locked', { member_level_required: 3 }),
  goods('empty', { stock: '0' }), goods('capped', { max_buy_per_user: 1, user_bought_count: 1, max_buy_period: 'month' }),
  goods('coupon', { goods_type: 4, coupon_template_id: 'real-coupon-id', points_price: 500 }),
  goods('physical-blind', { goods_type: 5, points_price: 600 }),
  goods('cash', { exchange_type: 1, price: 150 }), goods('recharge', { goods_type: 1 }),
];
const response = list => ({ _status: 0, data: { goods: list } });
function ready(vm, list, signedIn = true) {
  vm.hasLogin = signedIn;
  vm.token = signedIn ? 'account-token' : '';
  vm.userInfo = Object.assign({}, account);
  vm.accountInfo = vm.userInfo;
  vm.accountToken = signedIn ? vm.token : '';
  vm.goodsList = list;
  vm.goodsLoading = false;
}
function detailData(h) {
  const [method, url] = h.navigation.pop();
  assert.strictEqual(method, 'navigateTo');
  assert(url.startsWith('/pages/voucher/detail?data='));
  return JSON.parse(decodeURIComponent(url.split('?data=')[1]));
}
function testPointsPresentation() {
  const h = harness('pages/voucher/points.vue'), vm = h.instance();
  ready(vm, fixtures);
  assert.strictEqual(vm.benefitList.length, 10, 'cash/recharge excluded');
  assert.deepStrictEqual(vm.highlightBenefits.map(item => item.object_id), ['pure-a', 'pure-b']);
  assert.strictEqual(vm.pureBenefits.length, 9, 'not only the two highlights are accessible');
  assert.deepStrictEqual(vm.pureBenefits.map(item => item.object_id), LOYALTY.benefits(fixtures, vm.userInfo, true).filter(item => Number(item.exchange_type) === 2).map(item => item.object_id));
  assert.strictEqual(vm.mixedBenefits.length, 1);
  assert.strictEqual(vm.mixedBenefits[0].priceText, '10积分 + ¥8.99');
  assert(vm.mixedBenefits[0].stateText.includes('仍需支付现金'));
  assert(vm.benefitList.find(item => item.object_id === 'coupon').deliveryText.includes('我的优惠券'));
  assert(vm.benefitList.find(item => item.object_id === 'physical-blind').deliveryText.includes('门店领取'));
  ['empty', 'capped', 'locked', 'short'].forEach(id => assert(!vm.benefitList.find(item => item.object_id === id).canExchange));
  assert(vm.benefitList.find(item => item.object_id === 'capped').limitText.includes('每月限兑1件'));
  assert.strictEqual(vm.balanceView.valueText, '按当前规则，最多可抵¥16', 'cap rounded down to 800, not nominal balance cash value');
  vm.userInfo.points = 199;
  assert.strictEqual(vm.balanceView.valueText, '按当前规则，最多可抵¥2', 'step rounds down');
  vm.userInfo.points = 99;
  assert.strictEqual(vm.balanceView.valueText, '', 'minimum enforced');
  vm.userInfo.points_config = {};
  assert.strictEqual(vm.balanceView.valueText, '', 'unknown config is not a nominal cash promise');
  vm.userInfo.points_config = Object.assign({}, config, { points_step: undefined });
  assert.strictEqual(vm.balanceView.valueText, '', 'partial config is unknown');
  vm.userInfo = account;
  vm.accountInfo = account;
  vm.track('points_benefits_view');
  const metrics = h.events.pop();
  assert.strictEqual(metrics.token, vm.token);
  assert.strictEqual(metrics.event.available_count, 9);
  assert.strictEqual(metrics.event.eligible_count, 6);
  assert.strictEqual(metrics.event.current_points, 1234);
  assert.strictEqual(metrics.event.eligibility_known, true);

  vm.openGoods(vm.mixedBenefits[0], 'button');
  assert.deepStrictEqual(detailData(h), fixtures[0], 'raw authoritative identity, not decorated price/eligibility');
  assert.strictEqual(h.events.at(-1).event.event, 'points_benefit_click');
  vm.openGoods(vm.benefitList.find(item => item.object_id === 'empty'), 'list');
  assert.strictEqual(detailData(h).object_id, 'empty', 'detail still accessible for unavailable conditions');
  vm.openGoods({ object_id: 'invented' }, 'button');
  assert.strictEqual(h.navigation.length, 0);
  vm.openGoods(fixtures.find(item => item.object_id === 'cash'), 'button');
  assert.strictEqual(h.navigation.length, 0);

  ready(vm, fixtures, false);
  assert.strictEqual(vm.balanceView.valueText, '');
  assert.strictEqual(vm.balanceView.points, 0, 'cached previous account never shown to guest');
  assert.strictEqual(vm.highlightBenefits.length, 0);
  assert(vm.benefitList.every(item => !item.canExchange));
  assert(!vm.benefitList.some(item => item.stateText.includes('当前积分可兑换')));
  vm.openGoods(vm.pureBenefits[0], 'button');
  assert(detailData(h).object_id, 'guest browsing does not invoke automatic login');
  vm.track('points_benefits_view');
  assert.strictEqual(h.events.at(-1).event.current_points, null);
  assert.strictEqual(h.events.at(-1).event.eligible_count, 0);
  assert.strictEqual(h.events.at(-1).token, undefined);
  ready(vm, fixtures);
  vm.accountError = 'refresh failed';
  assert.strictEqual(vm.eligibilityKnown, false);
  assert.strictEqual(vm.highlightBenefits.length, 0);
  assert(vm.pureBenefits.find(item => item.object_id === 'pure-a').stateText.includes('账户待更新'));
  assert(vm.benefitList.every(item => !item.canExchange));
}
function testSupplyPresentation() {
  const h = harness('pages/voucher/supply.vue'), vm = h.instance();
  const list = [
    goods('snack', { exchange_type: '1', goods_type: '2', price: 199 }),
    goods('blind', { exchange_type: 1, goods_type: 5, price: 2500 }),
    goods('game', { exchange_type: 1, goods_type: 4, member_level_required: 3 }),
    goods('limited', { exchange_type: 1, max_buy_per_user: 2, max_buy_period: 'week', user_bought_count: 2 }),
    goods('sold', { exchange_type: 1, stock: 0 }),
    goods('coupon', { exchange_type: 1, goods_type: 5, coupon_template_id: 'actual-coupon' }),
    goods('other-coupon', { exchange_type: 1, goods_type: 2, coupon_template_id: 'actual-coupon' }),
    goods('recharge', { exchange_type: 1, goods_type: 1 }),
    goods('disabled', { exchange_type: 1, enabled: false }), goods('numeric-disabled', { exchange_type: 1, enabled: 0 }),
    goods('points'), goods('mixed', { exchange_type: 3, price: 100 }), goods('unknown', { exchange_type: 1, goods_type: 99 }),
  ];
  ready(vm, list);
  assert.deepStrictEqual(vm.cashGoods.map(item => item.object_id), ['snack', 'blind', 'game', 'limited', 'sold']);
  assert.strictEqual(vm.cashGoods[0].priceText, '¥1.99');
  assert(vm.cashGoods.find(item => item.object_id === 'blind').deliveryText.includes('门店领取'), 'type 5 is a physical blind box, not a coupon');
  assert.deepStrictEqual(vm.categories.map(item => item.value), ['all', '2', '5', '4']);
  assert(vm.categories.every(category => category.count > 0), 'no invented empty birthday/blind categories');
  assert(!vm.categories.some(category => category.value === '3'));
  vm.selectCategory('5');
  assert.deepStrictEqual(vm.filteredGoods.map(item => item.object_id), ['blind']);
  assert(vm.categories.find(category => category.value === '5').itemClass.includes('active'));
  vm.selectCategory('3');
  assert.strictEqual(vm.selectedCategory, '5', 'non-existent category cannot be selected');
  assert(vm.cashGoods.find(item => item.object_id === 'game').levelText.includes('等级3'));
  assert(vm.cashGoods.find(item => item.object_id === 'game').purchaseStateText.includes('未满足'));
  assert(vm.cashGoods.find(item => item.object_id === 'limited').limitText.includes('每周限购2件，本期已购2件'));
  assert(vm.cashGoods.find(item => item.object_id === 'limited').purchaseStateText.includes('限购上限'));
  assert.strictEqual(vm.cashGoods.find(item => item.object_id === 'sold').stockText, '库存：已售罄');
  vm.goodsList.push(goods('stock', { exchange_type: 1, stock: 4 }));
  assert(vm.cashGoods.find(item => item.object_id === 'stock').stockText.includes('库存4件'));
  vm.openGoods(vm.cashGoods[0], 'button');
  assert.deepStrictEqual(detailData(h), list[0]);
  vm.openGoods(list.find(item => item.object_id === 'coupon'), 'button');
  assert.strictEqual(h.navigation.length, 0);
  ready(vm, list, false);
  assert.strictEqual(vm.cashGoods[0].purchaseStateText, '登录后确认购买资格');
  vm.openGoods(vm.cashGoods[0], 'button');
  assert.deepStrictEqual(detailData(h), list[0], 'guest goes to existing detail login gate');
  vm.goodsList = [];
  assert.deepStrictEqual(vm.categories, []);
  assert.deepStrictEqual(vm.filteredGoods, []);
  vm.selectCategory('all');
  assert.strictEqual(vm.selectedCategory, '5');
}
async function testLoading(file) {
  const h = harness(file), vm = h.instance();
  h.Page.onLoad.call(vm);
  assert.strictEqual(h.titles.pop(), file.includes('points') ? '积分福利' : '到店补给');
  const initial = h.Page.onShow.call(vm);
  assert.strictEqual(h.accountRequests.length, 0, 'public browse never automatically refreshes/logs in a guest');
  const guestRequest = h.requests.shift();
  assert.strictEqual(guestRequest.token, undefined);
  assert.strictEqual(guestRequest.exchangeType, file.includes('supply') ? 1 : undefined);
  guestRequest.resolve(response([])); await initial;
  assert.strictEqual(vm.goodsLoading, false);
  assert.strictEqual(vm.goodsError, '');
  assert.strictEqual(h.events.at(-1).event.eligible_count, 0);

  ready(vm, [], true);
  const fresh = h.Page.onShow.call(vm);
  const acct = h.accountRequests.shift(), req = h.requests.shift();
  assert.strictEqual(acct.silent, true);
  assert.strictEqual(req.token, 'account-token');
  assert.strictEqual(vm.eligibilityKnown, false, 'suppress stale eligibility during refresh');
  req.resolve(response(fixtures));
  await Promise.resolve();
  assert.strictEqual(vm.accountLoading, true);
  const count = h.events.length;
  vm.userInfo = Object.assign({}, account);
  acct.resolve({ _status: 0 }); await fresh;
  assert.strictEqual(vm.eligibilityKnown, true);
  assert.strictEqual(h.events.length, count + 1, 'view analytics waits for both account and inventory');

  const authFailure = vm.refreshPage();
  h.accountRequests.shift().reject(new Error('expired token'));
  h.requests.shift().resolve(response(fixtures)); await authFailure;
  assert(vm.accountError);
  assert(!vm.eligibilityKnown);
  assert(!vm.goodsError, 'auth refresh failure must not gate public browsing');
  assert(vm.goodsList.length > 0);
  assert.strictEqual(h.events.at(-1).event.eligibility_known, false);
  const accountRetry = vm.refreshPage();
  h.accountRequests.shift().resolve({ _status: 0 });
  h.requests.shift().resolve(response(fixtures)); await accountRetry;
  assert.strictEqual(vm.accountError, '');
  assert(vm.eligibilityKnown);

  const old = vm.loadGoods(), newLoad = vm.loadGoods();
  const oldReq = h.requests.shift(), newReq = h.requests.shift();
  newReq.resolve(response([goods('new', { exchange_type: 1 })])); await newLoad;
  oldReq.resolve(response([goods('stale')])); await old;
  assert.strictEqual(vm.goodsList[0].object_id, 'new');
  const oldError = vm.loadGoods(), newSuccess = vm.loadGoods();
  h.requests.shift().reject(new Error('stale error')); await oldError;
  assert(vm.goodsLoading);
  assert.strictEqual(vm.goodsError, '');
  h.requests.shift().resolve(response([])); await newSuccess;
  assert.strictEqual(vm.goodsError, '');

  for (const invalid of [{ _status: 1 }, { _status: 0, data: { goods: {} } }, null]) {
    const load = vm.loadGoods(); h.requests.shift().resolve(invalid); await load;
    assert(vm.goodsError, 'invalid/failed response is error, not empty goods');
    assert.deepStrictEqual(vm.goodsList, []);
    assert.strictEqual(vm.goodsLoading, false);
  }
  const network = vm.loadGoods(); h.requests.shift().reject(new Error('network')); await network;
  assert(vm.goodsError);
  const retry = vm.loadGoods();
  assert.strictEqual(vm.goodsError, '');
  h.requests.shift().resolve(response([])); await retry;
  assert.strictEqual(vm.goodsError, '');
  h.settings.throwFetch = true; await vm.loadGoods(); h.settings.throwFetch = false;
  assert(vm.goodsError);
  assert.strictEqual(vm.goodsLoading, false);

  if (file.includes('supply')) {
    vm.selectedCategory = '5';
    const categoryRefresh = vm.loadGoods();
    h.requests.shift().resolve(response([goods('only-snack', { exchange_type: 1 })])); await categoryRefresh;
    assert.strictEqual(vm.selectedCategory, 'all', 'category removed by fresh stock cannot strand page in empty view');
    assert.strictEqual(vm.filteredGoods.length, 1);
    vm.selectedCategory = '2';
    const empty = vm.loadGoods(); h.requests.shift().resolve(response([])); await empty;
    assert.deepStrictEqual(vm.categories, []);
    assert.strictEqual(vm.selectedCategory, 'all');
  }

  // Identity change supersedes both old inventory and old account refresh.
  const firstAccount = vm.refreshPage();
  const priorAcct = h.accountRequests.shift(), priorGoods = h.requests.shift();
  vm.token = 'second-account'; vm.userInfo = { points: 0, member_level: 0 };
  const secondAccount = h.Page.watch.identity.call(vm);
  const nextAcct = h.accountRequests.shift(), nextGoods = h.requests.shift();
  assert.strictEqual(nextGoods.token, 'second-account');
  nextAcct.resolve({ _status: 0, data: { points: 321, member_level: 1, points_config: config } });
  nextGoods.resolve(response([goods('second', { exchange_type: 1 })]));
  await secondAccount; await Promise.resolve(); await Promise.resolve();
  // Vuex can commit the older profile before its promise returns; page eligibility must retain its own identity's response.
  vm.userInfo = { points: 99999, member_level: 9 };
  priorAcct.resolve({ _status: 0, data: vm.userInfo }); priorGoods.reject(new Error('old goods failure'));
  await firstAccount;
  assert.strictEqual(vm.accountInfo.points, 321, 'late previous-account store data cannot replace this identity snapshot');
  if (file.includes('points')) assert.strictEqual(vm.balanceView.points, 321);
  assert.strictEqual(vm.goodsList[0].object_id, 'second');
  assert.strictEqual(vm.accountError, '');
  assert.strictEqual(vm.accountToken, 'second-account');
  assert.strictEqual(vm.goodsError, '');

  // Reject identity-mismatched responses even before a watcher starts a new load.
  const mismatched = vm.loadGoods(); const mismatchReq = h.requests.shift();
  vm.token = 'third-account'; mismatchReq.resolve(response([goods('wrong-account')])); await mismatched;
  assert.deepStrictEqual(vm.goodsList, []);

  const away = vm.refreshPage();
  const awayAcct = h.accountRequests.shift(), awayGoods = h.requests.shift();
  const eventCount = h.events.length;
  h.Page.onUnload.call(vm);
  awayAcct.resolve({ _status: 0 }); awayGoods.resolve(response([goods('after-unload')])); await away;
  assert.deepStrictEqual(vm.goodsList, []);
  assert.strictEqual(h.events.length, eventCount);
  await vm.refreshPage(); await vm.loadGoods();
  assert.strictEqual(h.requests.length, 0, 'unloaded page never starts additional requests');
}
async function testPointRecords() {
  const h = harness('pages/voucher/points.vue'), vm = h.instance();
  h.settings.deferRecords = true;
  await vm.loadPointRecords();
  assert.strictEqual(h.recordCalls.length, 0, 'guests never call authenticated history API');
  assert.deepStrictEqual(vm.visibleRecords, []);
  ready(vm, fixtures);
  const records = Array.from({ length: 7 }, (_, index) => ({ id: 'record-' + index, point_type: index,
    point_type_name: index === 0 ? '消费抵扣' : '积分变动', points: index === 0 ? -200 : index === 1 ? 10 : 0,
    balance: 800 + index, remark: '真实账户记录', created_at: '2026-10-11T10:00:00+08:00' }));
  const load = vm.loadPointRecords();
  assert.strictEqual(h.recordRequests[0].token, vm.token);
  assert(vm.recordsLoading);
  h.recordRequests.shift().resolve({ _status: 0, data: records }); await load;
  assert.strictEqual(vm.visibleRecords.length, 5);
  assert.strictEqual(vm.visibleRecords[0].deltaText, '-200积分');
  assert(vm.visibleRecords[0].deltaClass.includes('spent'));
  assert.strictEqual(vm.visibleRecords[1].deltaText, '+10积分');
  assert(vm.visibleRecords[1].deltaClass.includes('gain'));
  assert.strictEqual(vm.visibleRecords[2].deltaText, '0积分');
  assert.strictEqual(vm.visibleRecords[0].balanceText, '变动后余额：800积分');
  assert.strictEqual(vm.visibleRecords[0].point_type_name, '消费抵扣', 'server type labels retained, no fabricated earned rewards');
  vm.toggleRecords(); assert.strictEqual(vm.visibleRecords.length, 7);
  vm.toggleRecords(); assert.strictEqual(vm.visibleRecords.length, 5);
  vm.pointRecords.push({ id: 'unknown', points: null, balance: null });
  vm.toggleRecords();
  assert.strictEqual(vm.visibleRecords.at(-1).deltaText, '变动待确认');
  assert.strictEqual(vm.visibleRecords.at(-1).balanceText, '');

  const failure = vm.loadPointRecords();
  h.recordRequests.shift().reject(new Error('history unavailable')); await failure;
  assert(vm.recordsError);
  assert.strictEqual(vm.goodsError, '');
  assert.strictEqual(vm.goodsList.length, fixtures.length, 'record error cannot block inventory');
  const retry = vm.loadPointRecords();
  assert.strictEqual(vm.recordsError, '');
  h.recordRequests.shift().resolve({ _status: 0, data: [] }); await retry;
  assert.strictEqual(vm.recordsLoading, false);
  assert.strictEqual(vm.recordsError, '');
  for (const payload of [{ _status: 1 }, { _status: 0, data: {} }, { _status: 0, data: [null] }]) {
    const bad = vm.loadPointRecords(); h.recordRequests.shift().resolve(payload); await bad;
    assert(vm.recordsError);
  }
  h.settings.throwRecords = true; await vm.loadPointRecords(); h.settings.throwRecords = false;
  assert(vm.recordsError);
  assert(!vm.recordsLoading);

  const old = vm.loadPointRecords(), current = vm.loadPointRecords();
  const oldReq = h.recordRequests.shift(), currentReq = h.recordRequests.shift();
  currentReq.resolve({ _status: 0, data: records }); await current;
  oldReq.reject(new Error('old error')); await old;
  assert.strictEqual(vm.recordsError, '');
  assert.strictEqual(vm.visibleRecords[0].id, 'record-0');
  const previousAccount = vm.loadPointRecords(), previousRequest = h.recordRequests.shift();
  vm.token = 'new-account';
  const newAccount = vm.loadPointRecords(), newRequest = h.recordRequests.shift();
  newRequest.resolve({ _status: 0, data: [Object.assign({}, records[1], { id: 'new-account-record' })] }); await newAccount;
  previousRequest.resolve({ _status: 0, data: records }); await previousAccount;
  assert.strictEqual(vm.visibleRecords[0].id, 'new-account-record');
  vm.hasLogin = false;
  assert.deepStrictEqual(vm.visibleRecords, [], 'old-account records immediately hidden after logout');
  await vm.loadPointRecords(); assert.deepStrictEqual(vm.pointRecords, []);

  ready(vm, fixtures);
  const show = h.Page.onShow.call(vm);
  const showAccount = h.accountRequests.shift(), showGoods = h.requests.shift(), showRecords = h.recordRequests.shift();
  assert(showRecords, 'onShow/login return refreshes records');
  showGoods.resolve(response(fixtures)); showAccount.resolve({ _status: 0 });
  for (let i = 0; i < 5; i++) await Promise.resolve();
  assert.strictEqual(vm.goodsLoading, false, 'history pending cannot block goods');
  assert(vm.recordsLoading);
  assert.strictEqual(h.events.at(-1).event.event, 'points_benefits_view', 'history pending cannot block funnel view event');
  showRecords.resolve({ _status: 0, data: records }); await show;
  assert.strictEqual(vm.visibleRecords.length, 5);
  const away = vm.loadPointRecords(), awayRequest = h.recordRequests.shift();
  h.Page.onUnload.call(vm);
  awayRequest.resolve({ _status: 0, data: records }); await away;
  assert.deepStrictEqual(vm.pointRecords, [], 'unload discards pending history');
  await vm.loadPointRecords(); assert.strictEqual(h.recordRequests.length, 0);
}
function testNavigationAndSafety() {
  const points = harness('pages/voucher/points.vue'), p = points.instance();
  ready(p, fixtures);
  p.goTicket(); assert.deepStrictEqual(points.navigation.pop(), ['navigateTo', '/pages/ticket/buy?count=1']);
  p.goAppointment(); assert.deepStrictEqual(points.navigation.pop(), ['switchTab', '/pages/tabBar/appoint/appoint']);
  p.goSignIn(); assert.deepStrictEqual(points.navigation.pop(), ['switchTab', '/pages/user/user']);
  p.goCoupons(); assert.deepStrictEqual(points.navigation.pop(), ['navigateTo', '/pages/my/coupons/coupons']);
  p.hasLogin = false;
  p.goCoupons(); assert.deepStrictEqual(points.navigation.pop(), ['switchTab', '/pages/user/user']);
  const supply = harness('pages/voucher/supply.vue'), s = supply.instance();
  s.goOrders(); assert.deepStrictEqual(supply.navigation.pop(), ['navigateTo', '/pages/order/order']);
  s.goSignIn(); assert.deepStrictEqual(supply.navigation.pop(), ['switchTab', '/pages/user/user']);
  ready(p, fixtures);
  points.settings.throwAnalytics = true;
  p.openGoods(p.pureBenefits[0], 'button'); assert(detailData(points).object_id);
  points.settings.throwAnalytics = false; points.settings.rejectAnalytics = true;
  p.goTicket(); assert(points.navigation.pop());
  p.goodsError = 'unavailable'; p.openGoods(fixtures[0], 'button'); assert.strictEqual(points.navigation.length, 0);
  p.goodsError = ''; p.goodsLoading = true; p.openGoods(fixtures[0], 'button'); assert.strictEqual(points.navigation.length, 0);
  const routes = fs.readFileSync(path.join(root, 'pages.json'), 'utf8');
  ['pages/voucher/points', 'pages/voucher/supply', 'pages/voucher/detail', 'pages/ticket/buy', 'pages/tabBar/appoint/appoint', 'pages/user/user', 'pages/order/order', 'pages/my/coupons/coupons'].forEach(route => {
    assert(routes.includes('"path": "' + route + '"'), 'route registered: ' + route);
  });
  ['points', 'supply'].forEach(page => {
    const source = fs.readFileSync(path.join(root, 'pages/voucher/' + page + '.vue'), 'utf8');
    const template = source.match(/<template>([\s\S]*?)<\/template>/)[1];
    assert(source.includes("import LOYALTY from '../../utils/loyaltyPresentation.js'"));
    assert(!/:\s*(?:class|style)="[^"\n]*\w+\([^"\n]*"/.test(template), 'WXML: no class/style function calls');
    assert(!/\{\{[^\n]*\{\}/.test(template), 'WXML: no object literal interpolation');
    assert(!source.includes('exchangeGoods') && !source.includes('purchaseGoods') && !source.includes('setUserInfo'), 'page must not debit points or buy directly');
    assert(!source.includes('getRoomAddons'), 'not an appointment addon catalog');
    ['已核销', '待领取', '已领取', '倒计时', '积分约值', '自动抵扣', '下次来就能', 'progress'].forEach(claim => assert(!source.includes(claim), 'no unsupported claim: ' + claim));
    assert(!source.includes('\r'), 'new pages preserve LF');
    assert(source.endsWith('\n'));
  });
  const supplySource = fs.readFileSync(path.join(root, 'pages/voucher/supply.vue'), 'utf8');
  assert(supplySource.includes('门票已含零食茶水，以下为额外付费商品'));
  assert(supplySource.includes('门店领取，不配送'));
  const pointsSource = fs.readFileSync(path.join(root, 'pages/voucher/points.vue'), 'utf8');
  assert(pointsSource.includes('兑换到店福利') && pointsSource.includes('下次消费时抵扣'));
  assert(pointsSource.includes('是否可与优惠券同用以订单规则为准'));
  assert(pointsSource.includes('这些商品还需支付现金，不是纯积分兑换'));
}
(async () => {
  testPointsPresentation();
  testSupplyPresentation();
  await testLoading('pages/voucher/points.vue');
  await testLoading('pages/voucher/supply.vue');
  await testPointRecords();
  testNavigationAndSafety();
  console.log('Loyalty pages: real page state, guest/eligible/mixed paths, exact caps, physical/coupon association, dynamic categories, routes, silent refresh, load/retry/account races, signed point history and analytics passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
