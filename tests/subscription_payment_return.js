const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

// Execute the real SFC methods/computed values and the real navigation helper.
function moduleValue(file, bindings) {
  let code = fs.readFileSync(path.join(root, file), 'utf8');
  if (file.endsWith('.vue')) code = code.match(/<script>([\s\S]*?)<\/script>/)[1];
  code = code.replace(/^\s*import .*$/mg, '').replace('export default', 'return');
  return new Function(...Object.keys(bindings), code)(...Object.values(bindings));
}
const calls = { redirects: [], resumes: [], emits: [], sequence: [], loads: [], pays: [], payments: [], accounts: [], toasts: [], commits: [] };
const storage = new Map();
let orderResult, fetchError, payResult, payError, paymentError, accountError;
let platform = 'weixin';
const uni = {
  getStorageSync: key => storage.get(key),
  setStorageSync: (key, value) => storage.set(key, value),
  removeStorageSync: key => storage.delete(key),
  redirectTo: options => { calls.redirects.push(options); calls.sequence.push('redirect'); },
  switchTab: () => calls.sequence.push('switchTab'),
  showToast: options => calls.toasts.push(options),
  showLoading: () => {}, hideLoading: () => {},
  $emit: (...args) => { calls.emits.push(args); calls.sequence.push('emit'); },
};
const AUTH = {
  getMyCoupons: () => Promise.resolve({ _status: 0, data: [] }),
  getCouponList: () => Promise.resolve({ _status: 0, data: [] }),
  getOrderList: (status, token) => {
    calls.loads.push({ status, token });
    return fetchError ? Promise.reject(fetchError) : Promise.resolve(orderResult);
  },
  platformPay: (token, payload) => {
    calls.pays.push({ token, payload });
    return payError ? Promise.reject(payError) : Promise.resolve(payResult);
  },
  accountPay: (token, payload) => {
    calls.accounts.push({ token, payload });
    return accountError ? Promise.reject(accountError) : Promise.resolve({ _status: 0 });
  },
};
const PLATFORM = {
  getPlatform: () => platform,
  requestPayment: payload => {
    calls.payments.push({ platform, payload });
    return paymentError ? Promise.reject(paymentError) : Promise.resolve();
  },
};
const COUPON = moduleValue('utils/coupon.js', {});
const SUBSCRIPTION = moduleValue('utils/subscription.js', { formatDate: () => '' });
const navigation = moduleValue('utils/mallNavigation.js', { uni });
const MALL_NAV = {
  resumeCheckout: context => {
    calls.resumes.push(context);
    calls.sequence.push('resume');
    return navigation.resumeCheckout(context);
  },
};
const Page = moduleValue('pages/order/payment.vue', {
  AUTH, PLATFORM, SUBSCRIPTION, MALL_NAV, uni, COUPON,
  mapState: () => ({}), mapActions: () => ({}),
});
const flush = () => new Promise(resolve => setImmediate(resolve));
const last = list => list[list.length - 1];
function fixture(type = 7, amount = 39900) {
  return {
    object_id: 'order/id', order_number: 'retained/order', order_type: type,
    order_status: 0, pay_amount: amount,
    goods_info: JSON.stringify({ subscription_card_id: 'hall-card', card_template: { object_id: 'hall-card', target_type: 1 } }),
  };
}
function reset(order = fixture()) {
  Object.values(calls).forEach(list => { list.length = 0; });
  storage.clear();
  storage.set('token', 'test-token');
  orderResult = { _status: 0, data: { orders: [order] } };
  payResult = { _status: 0, data: { payment: { package: 'prepay_id=retained' } } };
  fetchError = payError = paymentError = accountError = null;
  platform = 'weixin';
}
function instance() {
  const vm = Object.assign(Page.data(), Page.methods, {
    token: 'test-token', userInfo: { account_balance: 0 },
    getUserInfo: () => Promise.resolve(), loginAndRegister: () => Promise.resolve(),
    $nextTick: callback => callback(),
    $store: { commit: (...args) => calls.commits.push(args) },
  });
  Object.entries(Page.computed).forEach(([key, getter]) => {
    Object.defineProperty(vm, key, { get: () => getter.call(vm) });
  });
  return vm;
}
function options(source = 'ticket_checkout', returnUrl = '/pages/ticket/buy?variant=hall&mall_return_id=draft-123') {
  return {
    parent_sn: 'retained/order', entry: '3',
    mall_source: encodeURIComponent(source), mall_return_url: encodeURIComponent(returnUrl),
  };
}
async function load(query = options(), vm = instance()) {
  Page.onLoad.call(vm, query);
  await flush();
  return vm;
}
function noResume() {
  assert.strictEqual(calls.resumes.length, 0);
  assert.strictEqual(calls.emits.length, 0);
}
function generic(type = 'subscription', amount = 39900) {
  noResume();
  assert.strictEqual(last(calls.redirects).url,
    '/pages/pay/success/success?amount=' + amount + '&id=order%2Fid&type=' + type);
}
function resumed(returnUrl) {
  assert.strictEqual(calls.resumes.length, 1);
  assert.strictEqual(last(calls.redirects).url, returnUrl);
  assert.deepStrictEqual(last(calls.emits), ['subscriptionPurchased', { card_id: 'hall-card', target_type: 1 }]);
  assert.deepStrictEqual(calls.sequence, ['emit', 'resume', 'redirect']);
}

(async () => {
  // Every actual success branch uses the same navigation helper, for both checkout sources.
  for (const [source, route] of [['ticket_checkout', '/pages/ticket/buy'], ['room_checkout', '/pages/order/createOrder']]) {
    for (const success of ['completed', 'weixin', 'toutiao', 'zero']) {
      reset(fixture(7, success === 'zero' ? 0 : 39900));
      const url = route + '?variant=hall&room_id=room%2Fid&mall_return_id=draft-123';
      const vm = await load(options(source, url));
      assert.strictEqual(vm.subscriptionOrderConfirmed, true);
      assert.strictEqual(vm.entry, '3');
      assert.deepStrictEqual(calls.loads, [{ status: -1, token: 'test-token' }]);
      noResume();
      assert.strictEqual(calls.redirects.length, 0, 'an unpaid fetched order must not navigate');
      if (success === 'completed') payResult = { _status: 0, data: { payment_completed: true } };
      if (success === 'toutiao') platform = 'toutiao';
      vm.doPay();
      await flush();
      resumed(url);
      if (success === 'zero') {
        assert.deepStrictEqual(calls.accounts, [{ token: 'test-token', payload: { order_number: 'retained/order' } }]);
        assert.strictEqual(calls.pays.length, 0);
      } else {
        assert.deepStrictEqual(calls.pays, [{ token: 'test-token', payload: { order_number: 'retained/order', use_balance: false } }]);
        assert.strictEqual(calls.payments.length, success === 'completed' ? 0 : 1);
        if (success !== 'completed') assert.strictEqual(calls.payments[0].platform, success);
      }
    }
  }

  // Preserve escaped inner query values when uni has already decoded the outer URL.
  reset();
  const rawUrl = '/pages/ticket/buy?name=A%26B%20C&mall_return_id=draft-123';
  let vm = await load({ ...options(), mall_source: '%74icket_checkout', mall_return_url: rawUrl });
  assert.deepStrictEqual(vm.mallReturnContext, { source: 'ticket_checkout', returnUrl: rawUrl });
  payResult = { data: { payment_completed: true } };
  vm.platformPay();
  await flush();
  resumed(rawUrl);

  // Exercise real volatile draft restoration across mall switchTab and retained payment.
  reset();
  const draft = { count: 3, ticketVariant: 'hall', addonIds: ['tea'] };
  const intent = navigation.openCardMall({ source: 'ticket_checkout', returnToCheckout: true, returnUrl: '/pages/ticket/buy?variant=hall', returnDraft: draft });
  calls.sequence.length = 0;
  vm = await load(options(intent.source, intent.returnUrl));
  payResult = { data: { payment_completed: true } };
  vm.platformPay();
  await flush();
  resumed(intent.returnUrl);
  assert.deepStrictEqual(navigation.takeCheckoutDraft(intent.source, intent.returnId), draft);

  // Normal type-7 routes retain the exact generic success URL.
  reset();
  vm = await load({ parent_sn: 'retained/order', entry: '3' });
  payResult = { data: { payment_completed: true } };
  vm.platformPay();
  await flush();
  generic();

  // A route-data snapshot cannot authorize checkout resume, even if it claims type 7.
  reset();
  vm = await load({ ...options(), data: encodeURIComponent(JSON.stringify(fixture())) });
  assert.strictEqual(calls.loads.length, 0);
  assert.strictEqual(vm.subscriptionOrderConfirmed, false);
  payResult = { data: { payment_completed: true } };
  vm.platformPay();
  await flush();
  generic();

  for (const [type, successType] of [[1, 'order'], [2, 'order'], [3, 'order'], [4, 'order'], [5, 'exchange'], [6, 'ticket'], ['7', 'subscription']]) {
    reset(fixture(type));
    vm = await load();
    payResult = { data: { payment_completed: true } };
    vm.platformPay();
    await flush();
    generic(successType);
  }

  // A subsequent authoritative payment response must not allow a different order type to resume.
  reset();
  vm = await load();
  payResult = { data: { payment_completed: true, order: fixture(6) } };
  vm.platformPay();
  await flush();
  generic('ticket');

  const invalidQueries = [
    {}, { mall_source: 'ticket_checkout' }, { mall_return_url: '/pages/ticket/buy' },
    { mall_source: 'mall', mall_return_url: '/pages/ticket/buy' },
    { mall_source: 'room_checkout', mall_return_url: '/pages/ticket/buy' },
    { mall_source: '%ZZ', mall_return_url: '/pages/ticket/buy' },
    { mall_source: ['ticket_checkout'], mall_return_url: '/pages/ticket/buy' },
    { mall_source: 'ticket_checkout', mall_return_url: {} },
    ...[
      '', 'https://example.com/pages/ticket/buy', '//example.com/pages/ticket/buy',
      '/pages/ticket/buy-evil', '/pages/ticket/buy/other', '/pages/order/order',
      '/pages/ticket/buy#fragment', '/pages/ticket/buy?x=1#fragment',
      '/pages/ticket/buy?x=\n', '/pages/ticket/buy?x=\\evil',
      '%E0%A4%A', '/pages/ticket/buy?x=%ZZ',
      encodeURIComponent(encodeURIComponent('/pages/ticket/buy')),
    ].map(url => ({ mall_source: 'ticket_checkout', mall_return_url: url })),
  ];
  for (const invalid of invalidQueries) {
    reset();
    vm = await load({ parent_sn: 'retained/order', entry: '3', ...invalid });
    assert.strictEqual(vm.mallReturnContext, null, JSON.stringify(invalid));
    payResult = { data: { payment_completed: true } };
    vm.platformPay();
    await flush();
    generic();
  }

  // Cancellation, provider errors, parameter failures, null responses and account failure never resume.
  for (const failure of ['cancel', 'provider', 'parameters', 'null', 'account']) {
    reset(fixture(7, failure === 'account' ? 0 : 39900));
    vm = await load();
    if (failure === 'cancel') paymentError = { errMsg: 'requestPayment:fail cancel' };
    if (failure === 'provider') paymentError = { errMsg: 'requestPayment:fail' };
    if (failure === 'parameters') payError = { _reason: '支付参数获取失败' };
    if (failure === 'null') payResult = null;
    if (failure === 'account') accountError = new Error('支付失败');
    vm.doPay();
    await flush();
    noResume();
    assert.strictEqual(calls.redirects.length, 0, failure);
  }

  // Login retries the same page's authoritative fetch; context survives, with no saved-path change.
  reset();
  storage.delete('token');
  let resolveLogin;
  vm = instance();
  vm.token = '';
  vm.loginAndRegister = () => new Promise(resolve => { resolveLogin = resolve; });
  Page.onLoad.call(vm, options());
  noResume();
  assert.strictEqual(calls.loads.length, 0);
  assert.strictEqual(vm.subscriptionOrderConfirmed, false);
  storage.set('token', 'test-token');
  resolveLogin();
  await flush();
  assert.deepStrictEqual(calls.commits, [['setToken', 'test-token']]);
  assert.strictEqual(vm.subscriptionOrderConfirmed, true);
  payResult = { data: { payment_completed: true } };
  vm.platformPay();
  await flush();
  resumed('/pages/ticket/buy?variant=hall&mall_return_id=draft-123');

  for (const failure of ['login', 'fetch', 'missing']) {
    reset();
    vm = instance();
    if (failure === 'login') {
      storage.delete('token');
      vm.loginAndRegister = () => Promise.reject(new Error('登录失败'));
    }
    if (failure === 'fetch') fetchError = new Error('加载失败');
    if (failure === 'missing') orderResult = { data: { orders: [] } };
    await load(options(), vm);
    noResume();
    assert.strictEqual(vm.subscriptionOrderConfirmed, false);
    assert.strictEqual(last(calls.redirects).url, '/pages/order/order');
  }

  reset();
  vm = await load();
  vm.goBack();
  vm.goOrderList();
  noResume();
  assert(calls.redirects.every(item => item.url === '/pages/order/order'));
  Page.onUnload.call(vm);
  console.log('subscription_payment_return: all actual-method regression checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
