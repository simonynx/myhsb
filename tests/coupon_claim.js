// Run with node tests/coupon_claim.js. Executes the real page, coupon helper and API helper.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'pages/voucher/claim.vue'), 'utf8');
const template = source.match(/<template>([\s\S]*?)<\/template>/)[1];
const apiBase = 'https://api.moyuhuashui.top/api/v1';
const requests = [], modals = [], sheets = [], toasts = [], routes = [], titles = [];
let listHandler, receiveHandler;
const uni = {
  request(options) {
    requests.push(options);
    const endpoint = options.url.slice(apiBase.length);
    const handler = endpoint === '/coupons/' ? listHandler
      : endpoint === '/coupons/receive/' ? receiveHandler : () => ({ _status: 0, data: {} });
    Promise.resolve().then(() => handler(options)).then(data => {
      options.success({ statusCode: 200, data });
    }, error => options.fail(error));
  },
  showModal: options => modals.push(options),
  showActionSheet: options => sheets.push(options),
  showToast: options => toasts.push(options),
  navigateTo: options => routes.push({ type: 'navigateTo', url: options.url }),
  switchTab: options => routes.push({ type: 'switchTab', url: options.url }),
  setNavigationBarTitle: options => titles.push(options.title),
};
function evaluate(text, globals = {}) {
  const context = Object.assign({ module: { exports: {} }, console, uni }, globals);
  vm.runInNewContext(text.replace(/^import .*$/mg, '').replace('export default', 'module.exports ='), context);
  return context.module.exports;
}
const COUPON = evaluate(fs.readFileSync(path.join(root, 'utils/coupon.js'), 'utf8'));
const AUTH = evaluate(fs.readFileSync(path.join(root, 'utils/auth.js'), 'utf8'), {
  require: name => {
    assert.strictEqual(name, '../common/platform.js');
    return { getPlatform: () => 'weixin' };
  },
});
const page = evaluate(source.match(/<script>([\s\S]*?)<\/script>/)[1], {
  AUTH, COUPON, mapState: () => ({}), mapActions: () => ({}),
});
function instance(loggedIn = true) {
  const app = Object.assign(page.data(), { hasLogin: loggedIn, token: loggedIn ? 'test-token' : '', loginCalls: 0, profileCalls: [] });
  Object.entries(page.methods).forEach(([key, method]) => { app[key] = method.bind(app); });
  Object.entries(page.computed).forEach(([key, getter]) => Object.defineProperty(app, key, { get: () => getter.call(app) }));
  app.loginAndRegister = async () => { app.loginCalls++; app.hasLogin = true; app.token = 'login-token'; };
  app.getUserInfo = async silent => { app.profileCalls.push(silent); };
  return app;
}
function reset() {
  [requests, modals, sheets, toasts, routes, titles].forEach(list => { list.length = 0; });
  listHandler = () => ({ _status: 0, data: [] });
  receiveHandler = () => ({ _status: 0, data: {} });
}
function coupon(overrides = {}) {
  return Object.assign({ campaign_id: 'campaign-a', object_id: 'template-a', name: '周末优惠', coupon_type: 'rebate',
    rules: { discount: 1234, min_amount: 5000 }, can_receive: true, remaining_count: 8, remaining_user_count: 1, per_user_limit: 1 }, overrides);
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function apiCalls(endpoint) { return requests.filter(request => request.url === apiBase + endpoint); }
async function flush() { for (let i = 0; i < 20; i++) await Promise.resolve(); }
function route(type, url) { assert.deepStrictEqual(routes.pop(), { type, url }); }

async function run() {
  reset();
  const display = instance();
  const fixtures = [
    coupon({ validity_days: 7, reward_type: 'coupon' }),
    coupon({ campaign_id: 'discount', coupon_type: 'discount', rules: JSON.stringify({ discount_rate: 90, min_amount: 10000 }), end_time: '2026-12-31T12:00:00' }),
    coupon({ campaign_id: 'gift', coupon_type: 'gift', rules: JSON.stringify({ gift_value: 20 }), reward_type: 'points' }),
    coupon({ campaign_id: 'limited', per_user_limit: 3, remaining_user_count: 2, remaining_count: -1 }),
  ];
  display.couponList = fixtures.concat([
    coupon({ campaign_id: 'received', user_received: true }),
    coupon({ campaign_id: 'blocked', can_receive: false }),
    coupon({ campaign_id: 'sold-out', remaining_count: 0 }),
    coupon({ campaign_id: 'string-zero', remaining_count: '0' }),
    coupon({ campaign_id: 'limit', remaining_user_count: 0 }),
    coupon({ campaign_id: '' }),
  ]);
  assert.strictEqual(display.claimableCoupons.length, 4);
  for (const [index, item] of fixtures.entries()) {
    const view = display.claimableCoupons[index];
    const normalized = COUPON.normalizeCoupon(item);
    assert.strictEqual(view.displayPrefix, normalized.displayPrefix);
    assert.strictEqual(view.displayValue, normalized.displayValue);
    ['campaign_id', 'object_id', 'coupon_type', 'reward_type', 'per_user_limit', 'remaining_count', 'remaining_user_count', 'rules', 'can_receive'].forEach(key => {
      assert.strictEqual(view[key], item[key], 'must preserve campaign field ' + key);
    });
  }
  assert.strictEqual(display.claimableCoupons[0].displayValue, '12.34');
  assert.strictEqual(display.claimableCoupons[0].displayDescription, '满50元可用');
  assert.strictEqual(display.claimableCoupons[0].validityText, '领取后 7 天有效');
  assert.strictEqual(display.claimableCoupons[1].displayValue, '9折');
  assert.strictEqual(display.claimableCoupons[1].displayDescription, '满100元可用');
  assert.strictEqual(display.claimableCoupons[1].validityText, '有效期至 2026-12-31');
  assert.strictEqual(display.claimableCoupons[2].displayValue, '20积分');
  assert(display.claimableCoupons[2].displayDescription.includes('到账'));
  assert(display.claimableCoupons[3].receiveLimitText.includes('每人限领 3 份'));
  assert(display.claimableCoupons[3].receiveLimitText.includes('还可领 2 份'));
  display.receivingCouponId = fixtures[0].campaign_id;
  assert(display.claimableCoupons.every(item => item.buttonDisabled));
  assert.strictEqual(display.claimableCoupons[0].buttonText, '领取中');
  assert.strictEqual(display.isCouponClaimable(null), false);

  reset();
  const guest = instance(false);
  listHandler = () => ({ _status: 0, data: [coupon()] });
  page.onLoad.call(guest);
  await page.onShow.call(guest);
  assert.deepStrictEqual(titles, ['领券中心']);
  assert.strictEqual(guest.loginCalls, 0);
  assert.strictEqual(modals.length, 0);
  assert.strictEqual(guest.claimableCoupons.length, 1);
  assert.strictEqual(apiCalls('/coupons/')[0].method, 'GET');
  assert.strictEqual(apiCalls('/coupons/')[0].header.Authorization, undefined);
  guest.goMall();
  route('switchTab', '/pages/voucher/voucher');

  // Claim login is explicit, cancellable, deduplicated and revalidates account-specific limits.
  let claiming = guest.receiveCoupon(guest.claimableCoupons[0]);
  await guest.receiveCoupon(guest.claimableCoupons[0]);
  await guest.goCoupons();
  assert.strictEqual(modals.length, 1);
  assert.strictEqual(guest.loginCalls, 0);
  assert.strictEqual(apiCalls('/coupons/receive/').length, 0);
  await modals.pop().success({ confirm: false });
  await claiming;
  assert.strictEqual(guest.receivingCouponId, '');
  assert.strictEqual(guest.loginPending, false);
  claiming = guest.receiveCoupon(guest.claimableCoupons[0]);
  await modals.pop().success({ confirm: true });
  await claiming;
  assert.strictEqual(guest.loginCalls, 1);
  assert.strictEqual(apiCalls('/coupons/receive/').length, 1);
  const post = apiCalls('/coupons/receive/')[0];
  assert.strictEqual(post.method, 'POST');
  assert.strictEqual(post.header.Authorization, 'Token login-token');
  assert.strictEqual(JSON.stringify(post.data), JSON.stringify({ campaign_id: 'campaign-a' }));
  assert(!Object.prototype.hasOwnProperty.call(post.data, 'coupon_id'));
  const clicks = apiCalls('/analytics/track/').map(request => request.data);
  assert(clicks.some(event => event.event === 'coupon_receive_click'));
  assert(clicks.some(event => event.event === 'coupon_receive_success'));
  clicks.forEach(event => {
    assert.strictEqual(event.page_path, 'pages/voucher/claim');
    assert.strictEqual(event.source, 'coupon_claim');
    assert.strictEqual(event.campaign_id, 'campaign-a');
    assert.strictEqual(event.coupon_id, 'template-a');
  });
  assert(modals.pop().content.includes('券包'));

  reset();
  const alreadyClaimed = instance(false);
  alreadyClaimed.couponList = [coupon()];
  listHandler = () => ({ _status: 0, data: [coupon({ user_received: true })] });
  claiming = alreadyClaimed.receiveCoupon(coupon());
  await modals.pop().success({ confirm: true });
  await claiming;
  assert.strictEqual(apiCalls('/coupons/receive/').length, 0);

  reset();
  const loginFailure = instance(false);
  loginFailure.couponList = [coupon()];
  loginFailure.loginAndRegister = async () => { throw new Error('login rejected'); };
  claiming = loginFailure.receiveCoupon(coupon());
  await modals.pop().success({ confirm: true });
  await claiming;
  assert.strictEqual(apiCalls('/coupons/receive/').length, 0);
  assert.strictEqual(loginFailure.receivingCouponId, '');
  assert.strictEqual(loginFailure.loginPending, false);

  reset();
  const owned = instance(false);
  let navigation = owned.goCoupons();
  assert.strictEqual(routes.length, 0);
  await modals.pop().success({ confirm: false });
  await navigation;
  assert.strictEqual(owned.loginCalls, 0);
  navigation = owned.goCoupons();
  await modals.pop().success({ confirm: true });
  await navigation;
  route('navigateTo', '/pages/my/coupons/coupons');
  await owned.goCoupons();
  route('navigateTo', '/pages/my/coupons/coupons');

  reset();
  const receiver = instance();
  receiver.couponList = [coupon(), coupon({ campaign_id: 'other' })];
  const pendingReceive = deferred();
  receiveHandler = () => pendingReceive.promise;
  claiming = receiver.receiveCoupon(receiver.claimableCoupons[0]);
  await receiver.receiveCoupon(receiver.claimableCoupons[0]);
  await receiver.receiveCoupon(receiver.claimableCoupons[1]);
  await flush();
  assert.strictEqual(apiCalls('/coupons/receive/').length, 1);
  pendingReceive.resolve({ _status: 0, data: { coupon_name: '到账现金券' } });
  await claiming;
  assert.strictEqual(receiver.receivingCouponId, '');
  const success = modals.pop();
  assert(success.content.includes('到账现金券'));
  assert(success.content.includes('券包'));
  success.success({ confirm: false });
  assert.strictEqual(sheets.length, 0);
  success.success({ confirm: true });
  assert.strictEqual(Array.from(sheets[0].itemList).join(','), '预约包厢,买大厅票,查看我的券');
  for (const [index, type, url] of [[0, 'switchTab', '/pages/tabBar/appoint/appoint'], [1, 'navigateTo', '/pages/ticket/buy'], [2, 'navigateTo', '/pages/my/coupons/coupons?tab=unused']]) {
    sheets[0].success({ tapIndex: index });
    route(type, url);
  }
  const event = apiCalls('/analytics/track/').find(request => request.data.event === 'coupon_use_entry_click');
  assert.strictEqual(event.data.entry_source, 'receive_success');
  assert.strictEqual(receiver.profileCalls.length, 0);

  // Gift success uses response reward type first, refreshes points silently and never opens wallet actions.
  for (const responseType of [true, false]) {
    reset();
    const gift = instance();
    gift.couponList = [coupon({ coupon_type: responseType ? 'rebate' : 'gift', rules: { gift_value: 30 }, reward_type: 'points' })];
    receiveHandler = () => ({ _status: 0, data: responseType ? { coupon_type: 'gift', coupon_name: '30积分' } : {} });
    gift.getUserInfo = async silent => { gift.profileCalls.push(silent); throw new Error('profile unavailable'); };
    await gift.receiveCoupon(gift.claimableCoupons[0]);
    assert.deepStrictEqual(gift.profileCalls, [true]);
    const modal = modals.pop();
    assert(modal.content.includes('积分奖励已到账'));
    assert(!modal.content.includes('券包'));
    assert.strictEqual(modal.showCancel, false);
    assert.strictEqual(sheets.length, 0);
    assert.strictEqual(toasts.length, 0);
  }

  // Backend and network errors release the lock and allow explicit retry.
  for (const result of [{ _status: 1, _reason: '已达到领取上限' }, null, new Error('offline')]) {
    reset();
    const failed = instance();
    failed.couponList = [coupon()];
    receiveHandler = () => { if (result instanceof Error) throw result; return result; };
    await failed.receiveCoupon(coupon());
    assert.strictEqual(failed.receivingCouponId, '');
    assert.strictEqual(modals.length, 0);
    assert.strictEqual(toasts.length, 1);
    assert.strictEqual(toasts[0].title, result && result._reason || '领取失败，请重试');
    await flush();
    assert(apiCalls('/analytics/track/').some(request => request.data.event === 'coupon_receive_failed'));
    receiveHandler = () => ({ _status: 0, data: {} });
    await failed.receiveCoupon(coupon());
    assert.strictEqual(apiCalls('/coupons/receive/').length, 2);
  }

  // A successful POST is not turned into a failed claim if list refresh fails; stale cards cannot claim again.
  reset();
  const refreshFailure = instance();
  refreshFailure.couponList = [coupon()];
  listHandler = () => { throw new Error('refresh offline'); };
  await refreshFailure.receiveCoupon(coupon());
  assert(refreshFailure.couponsError.includes('加载失败'));
  assert(modals.pop().content.includes('券包'));
  assert.strictEqual(toasts.length, 0);
  await refreshFailure.receiveCoupon(coupon());
  assert.strictEqual(apiCalls('/coupons/receive/').length, 1);
  const multi = instance();
  multi.couponList = [coupon({ per_user_limit: 3, remaining_user_count: 2, remaining_count: -1 })];
  multi.applyReceipt(multi.couponList[0]);
  assert.strictEqual(multi.couponList[0].remaining_user_count, 1);
  assert.strictEqual(multi.couponList[0].remaining_count, -1);
  assert.strictEqual(multi.claimableCoupons.length, 1);
  multi.applyReceipt(multi.couponList[0]);
  assert.strictEqual(multi.claimableCoupons.length, 0);

  for (const result of [{ _status: 1 }, { _status: 0, data: {} }, null, new Error('offline')]) {
    reset();
    const loading = instance(false);
    listHandler = () => { if (result instanceof Error) throw result; return result; };
    await loading.loadCoupons();
    assert.strictEqual(loading.couponsLoading, false);
    assert(loading.couponsError.includes('加载失败'));
    assert.strictEqual(modals.length, 0);
    listHandler = () => ({ _status: 0, data: [] });
    await loading.loadCoupons();
    assert.strictEqual(loading.couponsError, '');
    assert.strictEqual(loading.claimableCoupons.length, 0);
  }

  reset();
  const racing = instance(false);
  const anonymous = deferred(), authenticated = deferred();
  listHandler = request => request.header.Authorization ? authenticated.promise : anonymous.promise;
  const firstLoad = racing.loadCoupons();
  assert.strictEqual(racing.loadCoupons(), firstLoad, 'duplicate list taps share one request');
  await flush();
  assert.strictEqual(apiCalls('/coupons/').length, 1);
  racing.hasLogin = true;
  racing.token = 'new-account';
  const secondLoad = racing.loadCoupons();
  authenticated.resolve({ _status: 0, data: [coupon({ campaign_id: 'new' })] });
  await secondLoad;
  anonymous.resolve({ _status: 0, data: [coupon({ campaign_id: 'stale' })] });
  await firstLoad;
  assert.strictEqual(racing.couponList[0].campaign_id, 'new');
  assert.strictEqual(racing.couponsLoading, false);
  assert.strictEqual(racing.couponsError, '');

  // A list started before the receipt cannot restore stale claimability after success.
  reset();
  const beforeReceipt = instance();
  beforeReceipt.couponList = [coupon()];
  const staleList = deferred();
  let count = 0;
  listHandler = () => ++count === 1 ? staleList.promise : { _status: 0, data: [coupon({ user_received: true })] };
  const staleLoad = beforeReceipt.loadCoupons();
  await flush();
  await beforeReceipt.receiveCoupon(coupon());
  staleList.resolve({ _status: 0, data: [coupon()] });
  await staleLoad;
  assert.strictEqual(beforeReceipt.claimableCoupons.length, 0);

  for (const kind of ['load', 'claim', 'refresh', 'login']) {
    reset();
    const unloading = instance(kind !== 'login');
    unloading.couponList = [coupon()];
    const pending = deferred();
    let work;
    if (kind === 'load') { listHandler = () => pending.promise; work = unloading.loadCoupons(); }
    else if (kind === 'claim') { receiveHandler = () => pending.promise; work = unloading.receiveCoupon(coupon()); }
    else if (kind === 'refresh') { listHandler = () => pending.promise; work = unloading.receiveCoupon(coupon()); }
    else { work = unloading.receiveCoupon(coupon()); }
    await flush();
    page.onUnload.call(unloading);
    if (kind === 'login') await modals.pop().success({ confirm: true });
    else pending.resolve({ _status: 0, data: kind === 'claim' ? {} : [] });
    await work;
    assert.strictEqual(modals.length, 0, 'no late success after unload during ' + kind);
    assert.strictEqual(toasts.length, 0);
    assert.strictEqual(unloading.couponList.length, 1);
    assert.strictEqual(unloading.couponsLoading, false);
    assert.strictEqual(unloading.receivingCouponId, '');
    await unloading.loadCoupons();
    unloading.goMall();
    await unloading.goCoupons();
    assert.strictEqual(routes.length, 0);
    if (kind === 'login') assert.strictEqual(unloading.loginCalls, 0);
  }

  // A login that was already started may finish after unload, but must not trigger a claim.
  reset();
  const lateLogin = instance(false);
  lateLogin.couponList = [coupon()];
  const loginResult = deferred();
  lateLogin.loginAndRegister = async () => {
    lateLogin.loginCalls++;
    await loginResult.promise;
    lateLogin.hasLogin = true;
    lateLogin.token = 'late-token';
  };
  claiming = lateLogin.receiveCoupon(coupon());
  const loginCallback = modals.pop().success({ confirm: true });
  await flush();
  page.onUnload.call(lateLogin);
  loginResult.resolve();
  await loginCallback;
  await claiming;
  assert.strictEqual(apiCalls('/coupons/receive/').length, 0);
  assert.strictEqual(modals.length, 0);

  reset();
  const switched = instance();
  switched.couponList = [coupon()];
  const lateReceipt = deferred();
  receiveHandler = () => lateReceipt.promise;
  claiming = switched.receiveCoupon(coupon());
  await flush();
  switched.token = 'another-account';
  lateReceipt.resolve({ _status: 0, data: {} });
  await claiming;
  assert.strictEqual(modals.length, 0);
  assert.strictEqual(switched.couponList[0].user_received, undefined);
  assert.strictEqual(switched.receivingCouponId, '');
  switched.showCouponSuccessActions(coupon(), {});
  const lateModal = modals.pop();
  switched.openCouponUseSheet(coupon(), 'test');
  const lateSheet = sheets.pop();
  page.onUnload.call(switched);
  lateModal.success({ confirm: true });
  lateSheet.success({ tapIndex: 0 });
  assert.strictEqual(sheets.length, 0);
  assert.strictEqual(routes.length, 0);

  assert(!/:(?:class|style)="[^"]*\w+\(/.test(template), 'no template class/style function calls');
  assert(!/:[\w.-]+="[^"]*[{}]/.test(template), 'no template object literals');
  assert(!/\{\{[^\n]*\{[^\n]*\}\}/.test(template), 'no interpolation object literals');
  assert(template.includes('v-if="couponsLoading"'));
  assert(template.includes('v-else-if="couponsError"'));
  assert(template.includes('重新加载'));
  assert(template.includes('暂无新的可领优惠券'));
  assert(template.includes('去商城逛逛'));
  assert(template.includes('我的优惠券'));
  assert(!/custom-nav|uni-nav-bar|goods-grid|subscription-list|main-tabs/.test(template), 'standalone claim UI only, native nav');
  console.log('Coupon claim: real page/helper/API, anonymous browsing, login gates, coupon types/limits, success routes, errors/retry, dedupe and stale/unload guards passed');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
