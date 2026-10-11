const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const detailText = fs.readFileSync(path.join(root, 'pages/voucher/detail.vue'), 'utf8');
const successText = fs.readFileSync(path.join(root, 'pages/pay/success/success.vue'), 'utf8');

// Evaluate the real templates' v-if chains and bindings without a browser dependency.
// This checks visible copy/controls, not a mocked list of expected screen strings.
function templateTree(source) {
  const tree = { tag: 'root', attrs: {}, children: [] };
  const stack = [tree];
  const template = source.match(/<template>([\s\S]*?)<\/template>/)[1];
  const tokens = template.match(/<!--[\s\S]*?-->|<\/?[a-z][\w-]*(?:[^>"']|"[^"]*"|'[^']*')*>|[^<]+/g) || [];
  for (const token of tokens) {
    if (token.startsWith('<!--')) continue;
    if (token.startsWith('</')) {
      assert.strictEqual(stack.pop().tag, token.slice(2, -1).trim(), 'balanced template tags');
    } else if (token.startsWith('<')) {
      const opening = token.match(/^<([\w-]+)([\s\S]*?)\/?\s*>$/);
      const node = { tag: opening[1], attrs: {}, children: [] };
      for (const attr of opening[2].matchAll(/([:@\w-]+)(?:="([^"]*)")?/g)) node.attrs[attr[1]] = attr[2] === undefined ? true : attr[2];
      stack[stack.length - 1].children.push(node);
      if (!token.endsWith('/>')) stack.push(node);
    } else if (token.trim()) {
      stack[stack.length - 1].children.push({ text: token });
    }
  }
  assert.strictEqual(stack.length, 1, 'all template tags closed');
  return tree;
}
const detailTemplate = templateTree(detailText);
const successTemplate = templateTree(successText);
function visibleTemplate(tree, vm) {
  const evaluate = expression => new Function('vm', 'with (vm) { return (' + expression + '); }')(vm);
  function children(nodes) {
    let branchTaken = false;
    return nodes.flatMap(node => {
      if (node.text !== undefined) return [{ text: node.text.replace(/\{\{([\s\S]*?)\}\}/g, (_, expression) => String(evaluate(expression))) }];
      const attrs = node.attrs;
      let visible = true;
      if ('v-if' in attrs) branchTaken = visible = !!evaluate(attrs['v-if']);
      else if ('v-else-if' in attrs) { visible = !branchTaken && !!evaluate(attrs['v-else-if']); branchTaken = branchTaken || visible; }
      else if ('v-else' in attrs) { visible = !branchTaken; branchTaken = true; }
      else branchTaken = false;
      if (!visible) return [];
      const renderedAttrs = Object.fromEntries(Object.entries(attrs).map(([key, value]) => key.startsWith(':') ? [key.slice(1), evaluate(value)] : [key, value]));
      if (attrs.class && attrs[':class']) renderedAttrs.class = attrs.class + ' ' + renderedAttrs.class;
      return [{ tag: node.tag, attrs: renderedAttrs, children: children(node.children) }];
    });
  }
  return { tag: 'root', attrs: {}, children: children(tree.children) };
}
function visibleText(node) {
  return node.text !== undefined ? node.text.trim() : (node.children || []).map(visibleText).join(' ').replace(/\s+/g, ' ').trim();
}
function findNodes(node, predicate) {
  return (predicate(node) ? [node] : []).concat((node.children || []).flatMap(child => findNodes(child, predicate)));
}
const byClass = (tree, name) => findNodes(tree, node => node.attrs && String(node.attrs.class || '').split(/\s+/).includes(name));
const countText = (text, phrase) => text.split(phrase).length - 1;
function tap(tree, vm, method) {
  const control = findNodes(tree, node => node.attrs && (node.attrs['@tap'] === method || node.attrs['@click'] === method))[0];
  assert(control, 'visible control for ' + method);
  vm[method]();
}

// Execute the real shared helper and SFC hooks, computed values and methods.
function load(file, bindings = {}) {
  let code = fs.readFileSync(path.join(root, file), 'utf8');
  if (file.endsWith('.vue')) code = code.match(/<script>([\s\S]*?)<\/script>/)[1];
  code = code.replace(/^\s*import .*$/mg, '').replace(/export function /g, 'function ').replace('export default', 'return');
  return new Function(...Object.keys(bindings), code)(...Object.values(bindings));
}
const helper = load('utils/goodsFulfillment.js');
const calls = { loads: [], checkout: [], events: [], routes: [], modals: [], toasts: [] };
let goodsRequest, orderRequest;
const uni = {
  getStorageSync: () => 'token', setStorageSync: () => {},
  navigateTo: value => calls.routes.push(value.url), redirectTo: value => calls.routes.push(value.url),
  switchTab: value => calls.routes.push(value.url), navigateBack: () => {},
  showToast: value => calls.toasts.push(value), showModal: value => calls.modals.push(value),
  showLoading: () => {}, hideLoading: () => {},
};
const AUTH = {
  getGoodsList: token => { calls.loads.push(token); return goodsRequest(); },
  getOrderList: (status, token) => { calls.loads.push({ status, token }); return orderRequest(); },
  checkout: (token, param) => { calls.checkout.push({ token, param }); return Promise.resolve(checkoutResponse); },
  trackEvent: event => { calls.events.push(event); return Promise.resolve(); },
  getReviewList: () => Promise.resolve({ _status: 0, data: { reviewable_orders: [] } }),
  inviteInfo: () => Promise.resolve({ _status: 0, data: {} }),
};
let checkoutResponse;
const bindings = { AUTH, uni, GOODS_FULFILLMENT: helper, mapState: () => ({}), mapActions: () => ({}) };
const Detail = load('pages/voucher/detail.vue', bindings);
const Success = load('pages/pay/success/success.vue', bindings);
function instance(page, extra = {}) {
  const vm = Object.assign(page.data(), page.methods, {
    token: 'token', hasLogin: true, userInfo: { points: 1000, member_level: 3, account_balance: 10000 },
    getUserInfo: () => Promise.resolve(), loginAndRegister: () => Promise.resolve(),
  }, extra);
  Object.entries(page.computed).forEach(([key, get]) => Object.defineProperty(vm, key, { get: () => get.call(vm) }));
  return vm;
}
const flush = () => new Promise(resolve => setImmediate(resolve));
const goods = extra => Object.assign({ object_id: 'goods/1', name: '小食', goods_type: 2, exchange_type: 2, price: 1500, points_price: 100, stock: 4 }, extra);
const order = extra => Object.assign({ object_id: 'real/order', order_number: 'SN1', order_type: 5, order_status: 1 }, extra);
const response = data => ({ _status: 0, data });
function reset() { Object.values(calls).forEach(list => { list.length = 0; }); }

(async () => {
  // A malicious/stale data route is only an id; purchases wait for actual refresh.
  reset();
  let resolveGoods;
  goodsRequest = () => new Promise(resolve => { resolveGoods = resolve; });
  let vm = instance(Detail);
  Detail.onLoad.call(vm, { data: encodeURIComponent(JSON.stringify(goods({ price: 1, stock: 999, coupon_template_id: 'fake' }))) });
  assert.strictEqual(vm.currentGoods, null);
  assert.strictEqual(vm.goodsLoading, true);
  assert.strictEqual(vm.submitDisabled, true);
  vm.handleSubmit();
  assert.strictEqual(calls.checkout.length, 0);
  resolveGoods(response({ goods: [goods({ price: 2000, stock: 0, goods_type: 5 })] }));
  await flush();
  assert.strictEqual(vm.currentGoods.price, 2000);
  assert.strictEqual(vm.soldOut, true);
  assert.strictEqual(vm.isCouponGoods, false, 'goods_type 5 is BLIND_BOX, not a coupon');
  assert.strictEqual(vm.submitDisabled, true);
  assert(calls.events.some(event => event.event === 'goods_view' && event.fulfillment_kind === 'pickup'));

  // The known list endpoint is also required for id routes and error/unavailable states.
  goodsRequest = () => Promise.reject(new Error('offline'));
  await vm.refreshGoods();
  assert(vm.goodsError);
  assert.strictEqual(vm.currentGoods, null);
  vm.handleSubmit();
  assert.strictEqual(calls.checkout.length, 0);
  goodsRequest = () => Promise.resolve(response({ goods: [] }));
  await vm.refreshGoods();
  assert.strictEqual(vm.goodsUnavailable, true);
  goodsRequest = () => Promise.resolve({ _status: 1, data: { goods: [goods()] } });
  await vm.refreshGoods();
  assert(vm.goodsError);
  goodsRequest = () => Promise.resolve(response({ goods: [goods({ coupon_template_id: 'actual-template', goods_type: 2 })] }));
  vm = instance(Detail);
  Detail.onLoad.call(vm, { id: 'goods/1' });
  await flush();
  assert.strictEqual(vm.isCouponGoods, true);
  assert(vm.usageScopeText.includes('有效期') && vm.usageScopeText.includes('以实际到账券为准'));
  assert(visibleText(visibleTemplate(detailTemplate, vm)).includes('以实际到账券为准'));
  vm.goMyCoupons();
  assert.strictEqual(calls.routes.pop(), '/pages/my/coupons/coupons?tab=unused');

  // Catalog refresh follows account changes and returns; earlier identities cannot authorize a purchase.
  const pending = [];
  goodsRequest = () => new Promise(resolve => pending.push(resolve));
  vm = instance(Detail, {token: '', hasLogin: false, goodsId: 'goods/1'});
  const anonymousLoad = vm.refreshGoods();
  vm.token = 'new-account'; vm.hasLogin = true;
  Detail.watch.token.call(vm);
  pending[1](response({goods:[goods({max_buy_per_user:1,user_bought_count:1,price:2100})]}));
  await flush();
  pending[0](response({goods:[goods({user_bought_count:0,price:100})]}));
  await anonymousLoad;
  assert.strictEqual(vm.currentGoods.price,2100);
  assert.strictEqual(vm.limitReached,true);
  goodsRequest = () => Promise.resolve(response({goods:[goods({price:2200})]}));
  Detail.onShow.call(vm); await flush();
  assert.strictEqual(vm.currentGoods.price,2200);
  Detail.onUnload.call(vm); assert.strictEqual(vm.goodsVerified,false);

  goodsRequest = () => Promise.resolve(response({goods:[goods({exchange_type:1})]}));
  vm = instance(Detail,{hasLogin:false,goodsId:'goods/1',loginAndRegister:()=>Promise.reject(new Error('login declined'))});
  await vm.refreshGoods();
  vm.handleSubmit();calls.modals.pop().success({confirm:true});await flush();
  assert(vm.goodsError.includes('重试'));
  assert.strictEqual(vm.goodsVerified,false);
  await vm.refreshGoods();assert.strictEqual(vm.goodsError,'');assert.strictEqual(vm.goodsVerified,true);

  // Mixed payment displays the cash component plus additional points; final cash is confirmed at checkout.
  reset();
  goodsRequest = () => Promise.resolve(response({ goods: [goods({ exchange_type: 3, price: 2500, points_price: 300 })] }));
  vm = instance(Detail);
  Detail.onLoad.call(vm, { data: JSON.stringify(goods()) });
  await flush();
  assert.strictEqual(vm.actualPrice, '25.00');
  assert.strictEqual(vm.canUseBalance, false);
  assert.strictEqual(vm.pointsDiscountMoney, undefined);
  assert.strictEqual(vm.purchaseStateTitle, '', 'no ready-state paragraph duplicates the purchase action');
  const mixedScreen = visibleTemplate(detailTemplate, vm);
  assert(visibleText(byClass(mixedScreen, 'product-price')[0]).includes('¥25.00 + 300 积分'));
  assert(visibleText(byClass(mixedScreen, 'price-line')[0]).includes('¥25.00 + 300 积分'));
  assert(visibleText(mixedScreen).includes('积分另付，不抵现金'));
  assert(visibleText(mixedScreen).includes('实际现金金额按结算核定（含适用会员优惠）'));
  assert.strictEqual(countText(visibleText(mixedScreen), '¥25.00'), 2, 'main price and bottom amount only');
  assert(vm.usageScopeText.includes('不配送') && vm.usageScopeText.includes('免费茶水'));
  checkoutResponse = response(order({ order_status: 0 }));
  vm.handleSubmit();
  await flush();
  assert.deepStrictEqual(calls.checkout[0], { token: 'token', param: { order_type: 3, goods_id: 'goods/1', use_points: 300 } });

  // Authoritative restrictions remain visible; secondary generated fees start closed.
  for (const exchangeType of [1, 2, 3]) {
    vm = instance(Detail, {
      currentGoods: goods({ exchange_type: exchangeType, description: '仅工作日使用；满100元可用；7天有效。',
        member_level_required: 2, max_buy_per_user: 2, max_buy_period: 'week',
        validity_period_start: '2026-01-01T00:00:00+08:00', validity_period_end: '2026-12-31T23:59:59+08:00' }),
      goodsVerified: true, userBoughtCount: 1,
    });
    assert.strictEqual(vm.detailsExpanded, false);
    let screen = visibleTemplate(detailTemplate, vm);
    let copy = visibleText(screen);
    assert(copy.includes(vm.exchangeLabel) && copy.includes(vm.productPriceText));
    assert.strictEqual(countText(copy, '门店领取，不配送'), 1);
    assert.strictEqual(countText(copy, '非门票内免费茶水'), 1);
    assert(copy.includes('烈金大魔导士及以上'));
    assert(copy.includes('每周限购 2件 · 已购 1件'));
    assert(copy.includes('2026-01-01 ~ 2026-12-31'));
    assert(copy.includes(vm.currentGoods.description), 'catalog descriptions may contain binding weekday, threshold and expiry restrictions');
    assert(!copy.includes('费用明细'));
    assert.strictEqual(countText(copy, vm.currentGoods.description), 1);
    assert.strictEqual(byClass(screen, 'details-body').length, 0);
    assert.strictEqual(byClass(screen, 'purchase-state').length, 0);
    assert.strictEqual(byClass(screen, 'details-toggle')[0].attrs['aria-expanded'], false);
    tap(screen, vm, 'toggleDetails');
    screen = visibleTemplate(detailTemplate, vm);
    copy = visibleText(screen);
    assert(copy.includes(vm.currentGoods.description) && copy.includes('费用明细'));
    assert(copy.includes('库存 4 件'));
    assert.strictEqual(countText(copy, vm.currentGoods.description), 1);
    assert.strictEqual(byClass(screen, 'details-toggle')[0].attrs['aria-expanded'], true);
    assert(!byClass(screen, 'details-body')[0].children.some(node => visibleText(node).includes('组合价')));
    assert.strictEqual(vm.submitDisabled, false, 'expansion never changes purchase eligibility');
    tap(screen, vm, 'toggleDetails');
    assert.strictEqual(vm.detailsExpanded, false);
    assert(visibleText(visibleTemplate(detailTemplate, vm)).includes(vm.currentGoods.description));
    assert(!visibleText(visibleTemplate(detailTemplate, vm)).includes('费用明细'));
  }
  vm = instance(Detail, { currentGoods: goods({ coupon_template_id: 'real-template', description: '仅工作日；满100元；领券后7天有效。',
    validity_period_start: '2026-10-01', validity_period_end: '2026-11-01' }), goodsVerified: true });
  let screen = visibleTemplate(detailTemplate, vm);
  assert(visibleText(screen).includes('有效期、适用范围与门槛以实际到账券为准'));
  assert(visibleText(screen).includes(vm.currentGoods.description), 'coupon restrictions cannot be hidden before purchase');
  assert(visibleText(screen).includes('购买时间 2026-10-01 ~ 2026-11-01'), 'coupon purchase dates do not override actual card expiry');
  assert(!visibleText(screen).includes('免费茶水') && !visibleText(screen).includes('不配送'));
  assert.strictEqual(vm.goodsMark, '券');
  for (const dates of [{ validity_period_start: '2026-10-01' }, { validity_period_end: '2026-11-01' }]) {
    vm = instance(Detail, { currentGoods: goods(dates), goodsVerified: true });
    assert(vm.purchaseDatesText);
    assert(visibleText(visibleTemplate(detailTemplate, vm)).includes(vm.purchaseDatesText));
  }
  vm = instance(Detail, { currentGoods: goods(), goodsVerified: true });
  assert.strictEqual(vm.purchaseDatesText, '');
  assert(!visibleText(visibleTemplate(detailTemplate, vm)).includes('购买时间'));

  for (const blocked of [
    { currentGoods: goods({ stock: 0 }), expected: '本期已售罄' },
    { currentGoods: goods({ max_buy_per_user: 1 }), userBoughtCount: 1, expected: '本期限购已达上限' },
    { currentGoods: goods({ member_level_required: 2 }), userInfo: { member_level: 1, points: 1000 }, expected: '会员等级暂未达到' },
    { currentGoods: goods({ exchange_type: 2, points_price: 300 }), userInfo: { member_level: 3, points: 120 }, expected: '还差 180 积分' },
    { currentGoods: goods({ exchange_type: 3, points_price: 300 }), userInfo: { member_level: 3, points: 120 }, expected: '还差 180 积分' },
  ]) {
    vm = instance(Detail, Object.assign({ goodsVerified: true }, blocked));
    const blockedScreen = visibleTemplate(detailTemplate, vm);
    assert.strictEqual(vm.detailsExpanded, false);
    assert.strictEqual(vm.submitDisabled, true);
    assert(visibleText(byClass(blockedScreen, 'purchase-state')[0]).includes(blocked.expected));
    if (blocked.expected.includes('还差')) {
      assert(findNodes(blockedScreen, node => node.attrs && node.attrs['@tap'] === 'goEarnPoints').length);
    }
  }

  // Balance selection stays outside the accordion and preserves partial/full/off payment payloads.
  reset();
  goodsRequest = () => Promise.resolve(response({ goods: [goods({ exchange_type: 1, can_use_balance: true, price: 2500 })] }));
  vm = instance(Detail, { goodsId: 'goods/1', userInfo: { member_level: 3, points: 1000, account_balance: 700 } });
  await vm.refreshGoods();
  screen = visibleTemplate(detailTemplate, vm);
  assert.strictEqual(vm.detailsExpanded, false);
  assert.strictEqual(byClass(screen, 'balance-row').length, 1, 'supported balance control is visible before expanding');
  assert.strictEqual(byClass(screen, 'balance-row')[0].tag, 'button');
  assert.strictEqual(byClass(screen, 'balance-row')[0].attrs['aria-pressed'], true);
  assert(byClass(screen, 'balance-row')[0].attrs['aria-label'].includes('7.00'));
  assert.strictEqual(vm.actualPrice, '18.00');
  assert.strictEqual(vm.footerAmountLabel, '预估现金金额', 'catalog-minus-balance is not an authoritative checkout amount');
  assert(visibleText(screen).includes('余额不足，剩余金额需微信支付'));
  tap(screen, vm, 'toggleBalance');
  assert.strictEqual(vm.useBalance, false);
  assert.strictEqual(vm.balancePreferenceTouched, true);
  assert.strictEqual(vm.actualPrice, '25.00');
  assert.strictEqual(vm.footerAmountLabel, '商品价');
  await vm.refreshGoods();
  assert.strictEqual(vm.useBalance, false, 'refresh preserves the explicit balance preference');
  checkoutResponse = response(order({ order_status: 0, order_type: 3 }));
  vm.handleSubmit(); await flush();
  assert.deepStrictEqual(calls.checkout[0].param, { order_type: 3, goods_id: 'goods/1' });
  assert(calls.routes.pop().startsWith('/pages/order/payment?parent_sn=SN1&entry=3&data='));
  tap(visibleTemplate(detailTemplate, vm), vm, 'toggleBalance');
  vm.handleSubmit(); await flush();
  assert.deepStrictEqual(calls.checkout[1].param, { order_type: 3, goods_id: 'goods/1', use_balance: true });
  vm.userInfo.account_balance = 10000;
  assert.strictEqual(vm.actualPrice, '0.00');
  assert.strictEqual(vm.submitButtonText, '余额支付');
  checkoutResponse = response(order({ order_type: 3 }));
  vm.handleSubmit(); await flush();
  calls.modals.pop().success();
  assert(calls.routes.pop().startsWith('/pages/pay/success/success?amount=2500&id=real%2Forder&type=voucher'));

  // Actual exchange checkout does not announce a blind box as a coupon or invent arrival.
  reset();
  goodsRequest = () => Promise.resolve(response({ goods: [goods({ goods_type: 5 })] }));
  vm = instance(Detail);
  Detail.onLoad.call(vm, { goods_id: 'goods/1' });
  await flush();
  checkoutResponse = response(order({ goods_fulfillment: { kind: 'pickup', status: 'pending', received_at: null } }));
  vm.handleSubmit();
  await flush();
  assert.deepStrictEqual(calls.checkout[0].param, { order_type: 5, goods_id: 'goods/1', use_points: 100 });
  assert(calls.events.some(event => event.event === 'exchange_click'));
  assert(!calls.modals[0].content.includes('优惠券已放入'));
  calls.modals[0].success();
  assert(calls.routes.pop().includes('type=exchange&kind=goods'));

  // Shared decoration is safe for order-list reuse and does not mutate original orders.
  let source = order();
  const decorated = helper.decorateGoodsFulfillment(source);
  assert.strictEqual(decorated.goodsFulfillmentView.title, '领取记录待店员确认');
  assert.strictEqual(source.goodsFulfillmentView, undefined);
  assert.strictEqual(helper.goodsFulfillmentView(order({ goodsInfo: { goods_type: 5 } })).status, 'unknown');
  assert.strictEqual(helper.goodsFulfillmentView(order({ goods_info: '{bad json' })).status, 'unknown');
  assert.strictEqual(helper.goodsFulfillmentView({ order_type: 1, order_status: 1 }).visible, false);
  assert.strictEqual(helper.goodsFulfillmentView({ order_type: 1, order_status: 1, goods_fulfillment: { kind: 'unknown', status: 'unknown' } }).visible, false);
  assert.strictEqual(helper.goodsFulfillmentView(order({ goods_fulfillment: { kind: 'unknown', status: 'unknown' }, goodsInfo: { context: { granted_coupon_id: 'historical-coupon' } } })).status, 'unknown');
  assert.strictEqual(helper.goodsFulfillmentView(order({ goods_fulfillment: { kind: 'pickup', status: 'processing' } })).canPickupPending, false);
  for (const status of [0, 2, 6, 8, 9, 10, 99]) {
    const view = helper.goodsFulfillmentView(order({ order_status: status, goods_fulfillment: { kind: 'pickup', status: 'pending' } }));
    assert.strictEqual(view.canPickupPending, false);
    assert.notStrictEqual(view.status, 'pending');
    assert.notStrictEqual(view.action, 'coupons');
  }
  for (const status of [0, 6, 10]) {
    const closedCoupon = helper.goodsFulfillmentView(order({ order_status: status, goods_fulfillment: { kind: 'coupon', status: 'issued' }, goodsInfo: { context: { granted_coupon_id: 'real-coupon' } } }));
    assert.notStrictEqual(closedCoupon.action, 'coupons');
  }
  let view = helper.goodsFulfillmentView(order({ goods_fulfillment: { kind: 'pickup', status: 'received' } }));
  assert.strictEqual(view.status, 'unknown', 'payment success or received flag alone cannot prove pickup');
  view = helper.goodsFulfillmentView(order({ goods_fulfillment: { kind: 'pickup', status: 'received', received_at: '2026-10-11T11:22:33+08:00' } }));
  assert.strictEqual(view.title, '已领取');
  assert(view.receivedAtText.includes('2026-10-11 11:22:33'));
  view = helper.goodsFulfillmentView(order({ goods_fulfillment: { kind: 'coupon', status: 'issued' } }));
  assert.strictEqual(view.status, 'processing', 'actual granted_coupon_id required');
  view = helper.goodsFulfillmentView(order({ goods_info: JSON.stringify({ context: { granted_coupon_id: 'real-coupon' } }), goods_fulfillment: { kind: 'coupon', status: 'issued' } }));
  assert.strictEqual(view.action, 'coupons');

  for (const state of ['processing','unknown','closed']) {
    const conflicted = helper.goodsFulfillmentView(order({goods_fulfillment:{kind:'coupon',status:state},goodsInfo:{context:{granted_coupon_id:'invalid-id'}}}));
    assert.notStrictEqual(conflicted.status,'issued');
    assert.notStrictEqual(conflicted.action,'coupons');
  }

  // Success URL kind is not authority; fetched real id and server kind/state determine CTA.
  reset();
  let resolveOrder;
  orderRequest = () => new Promise(resolve => { resolveOrder = resolve; });
  vm = instance(Success);
  Success.onLoad.call(vm, { type: 'exchange', kind: 'coupon', id: 'real/order' });
  assert.strictEqual(vm.title, '核对订单中');
  assert.strictEqual(vm.statusIcon, '…');
  assert(visibleText(visibleTemplate(successTemplate, vm)).includes('核对订单中'));
  assert(!vm.subtitle.includes('已放入'));
  vm.goOrder();
  assert(calls.routes.pop().startsWith('/pages/order/order?'));
  resolveOrder(response({ orders: [order({ goods_fulfillment: { kind: 'pickup', status: 'pending' } })] }));
  await flush();
  assert.strictEqual(vm.fulfillment.status, 'pending');
  assert.strictEqual(vm.title, '待到店领取');
  assert.strictEqual(vm.statusIcon, '↓');
  assert.strictEqual(vm.primaryText, '去我的订单');
  assert(vm.subtitle.includes('出示订单号'));
  assert.strictEqual(vm.confirmedOrderNumber, 'SN1');
  assert(calls.events.some(event => event.event === 'goods_delivery_summary' && event.fulfillment_status === 'pending'));

  orderRequest = () => Promise.resolve(response({ orders: [order({ goods_fulfillment: { kind: 'coupon', status: 'issued' }, goodsInfo: { context: { granted_coupon_id: 'real-coupon' } } })] }));
  await vm.loadOrderBenefit();
  assert.strictEqual(vm.primaryText, '我的优惠券');
  assert.strictEqual(vm.title, '优惠券已到账');
  assert.strictEqual(vm.statusIcon, '✓');
  orderRequest = () => Promise.resolve(response({orders:[order({goods_fulfillment:{kind:'coupon',status:'closed'},goodsInfo:{context:{granted_coupon_id:'old-coupon'}}})]}));
  await vm.loadOrderBenefit();
  assert.strictEqual(vm.title, '订单已退款或关闭');
  assert.strictEqual(vm.statusIcon, '−');
  assert(!vm.benefitText.includes('商城兑换券已放入'));
  orderRequest = () => Promise.resolve(response({orders:[order({goods_fulfillment:{kind:'coupon',status:'issued'},goodsInfo:{context:{granted_coupon_id:'real-coupon'}}})]}));
  await vm.loadOrderBenefit();
  vm.goOrder();
  assert.strictEqual(calls.routes.pop(), '/pages/my/coupons/coupons?tab=unused');
  vm.goVoucher();
  assert(calls.routes.pop().includes('voucher/voucher'));

  // Refunded/unknown/received and generic type=order goods results use the same real helper.
  for (const actual of [
    order({ order_status: 10, goods_fulfillment: { kind: 'pickup', status: 'pending' } }),
    order(),
    order({ goods_fulfillment: { kind: 'pickup', status: 'received', received_at: '2026-10-11T10:00:00Z' } }),
  ]) {
    orderRequest = () => Promise.resolve(response({ orders: [actual] }));
    await vm.loadOrderBenefit();
    assert.strictEqual(vm.fulfillment.canPickupPending, false);
    assert.strictEqual(vm.primaryText, '去我的订单');
  }
  assert(vm.fulfillment.receivedAtText);
  orderRequest = () => Promise.resolve(response({ orders: [order({ order_type: 3 })] }));
  vm = instance(Success);
  Success.onLoad.call(vm, { type: 'order', id: 'real/order', kind: 'coupon' });
  await flush();
  assert.strictEqual(vm.isGoodsSuccess, true);
  assert.strictEqual(vm.fulfillment.title, '领取记录待店员确认');
  orderRequest = () => Promise.resolve(response({ orders: [order({ object_id: 'other-order', order_number: 'OTHER' })] }));
  vm = instance(Success);
  Success.onLoad.call(vm, { type: 'voucher', id: 'real/order', kind: 'coupon' });
  await flush();
  assert(vm.orderError && !vm.confirmedOrder);
  assert.strictEqual(vm.primaryText, '去我的订单');
  orderRequest = () => Promise.reject(new Error('offline'));
  await vm.loadOrderBenefit();
  assert.strictEqual(vm.title, '订单状态待确认');
  vm.goOrder();
  assert(calls.routes.pop().startsWith('/pages/order/order?'));
  vm = instance(Success);
  Success.onLoad.call(vm, { type: 'exchange', kind: 'coupon' });
  assert(vm.orderError);
  assert.strictEqual(vm.primaryText, '去我的订单');

  // Every real status is visible once in the hero, never hidden in a duplicate card.
  const successCases = [
    { actual: order({ goods_fulfillment: { kind: 'pickup', status: 'pending' } }), status: 'pending', icon: '↓' },
    { actual: order({ goods_fulfillment: { kind: 'pickup', status: 'processing' } }), status: 'processing', icon: '…' },
    { actual: order({ goods_fulfillment: { kind: 'coupon', status: 'processing' } }), status: 'processing', icon: '…' },
    { actual: order({ goods_fulfillment: { kind: 'coupon', status: 'issued' } }), status: 'processing', icon: '…' },
    { actual: order(), status: 'unknown', icon: '?' },
    { actual: order({ goods_fulfillment: { kind: 'pickup', status: 'received' } }), status: 'unknown', icon: '?' },
    { actual: order({ goods_fulfillment: { kind: 'coupon', status: 'unknown' }, goodsInfo: { context: { granted_coupon_id: 'stale-id' } } }), status: 'unknown', icon: '?' },
    { actual: order({ goods_fulfillment: { kind: 'coupon', status: 'closed' }, goodsInfo: { context: { granted_coupon_id: 'stale-id' } } }), status: 'closed', icon: '−' },
    { actual: order({ order_status: 10, goods_fulfillment: { kind: 'coupon', status: 'issued' }, goodsInfo: { context: { granted_coupon_id: 'stale-id' } } }), status: 'closed', icon: '−' },
    { actual: order({ order_status: 6, goods_fulfillment: { kind: 'pickup', status: 'received', received_at: '2026-10-11T11:22:33+08:00' } }), status: 'closed', icon: '−' },
    { actual: order({ order_status: 0, goods_fulfillment: { kind: 'pickup', status: 'pending' } }), status: 'notpaid', icon: '!' },
    { actual: order({ order_status: 0, goods_fulfillment: { kind: 'coupon', status: 'issued' }, goodsInfo: { context: { granted_coupon_id: 'stale-id' } } }), status: 'notpaid', icon: '!' },
    { actual: order({ goods_fulfillment: { kind: 'coupon', status: 'issued' }, goodsInfo: { context: { granted_coupon_id: 'real-id' } } }), status: 'issued', icon: '✓' },
    { actual: order({ goods_fulfillment: { kind: 'pickup', status: 'received', received_at: '2026-10-11T11:22:33+08:00' } }), status: 'received', icon: '✓' },
  ];
  for (const routeType of ['exchange', 'voucher', 'order']) {
    for (const testCase of successCases) {
      orderRequest = () => Promise.resolve(response({ orders: [testCase.actual] }));
      vm = instance(Success);
      Success.onLoad.call(vm, { type: routeType, id: 'real/order', kind: 'coupon' });
      await flush();
      const statusScreen = visibleTemplate(successTemplate, vm);
      const hero = byClass(statusScreen, 'success-card')[0];
      const copy = visibleText(hero);
      assert.strictEqual(vm.fulfillment.status, testCase.status);
      assert.strictEqual(vm.title, vm.fulfillment.title);
      assert.strictEqual(visibleText(byClass(hero, 'success-title')[0]), vm.fulfillment.title);
      assert.strictEqual(vm.statusIcon, testCase.icon);
      assert.strictEqual(visibleText(byClass(hero, 'status-icon')[0]), testCase.icon);
      assert.strictEqual(countText(copy, vm.title), 1);
      assert.strictEqual(countText(visibleText(statusScreen), vm.subtitle), 1, 'one next step, no duplicated fulfillment description');
      assert.strictEqual(byClass(statusScreen, 'fulfillment-card').length, 0);
      assert.strictEqual(byClass(statusScreen, 'success-sub').length, 1);
      assert.strictEqual(byClass(statusScreen, 'primary-action').length, 1);
      assert(copy.includes('订单号 SN1'));
      assert.strictEqual(byClass(statusScreen, 'notes-card').length, 0, 'no repeated goods how-to at bottom');
      if (testCase.status === 'received') {
        assert.strictEqual(countText(copy, '2026-10-11 11:22:33'), 1, 'actual receipt timestamp is secondary, once');
        assert.strictEqual(byClass(hero, 'received-time').length, 1);
      } else {
        assert.strictEqual(byClass(hero, 'received-time').length, 0);
      }
      if (['issued', 'received'].includes(testCase.status)) {
        assert.strictEqual(vm.statusIcon, '✓');
      } else {
        assert(!copy.includes('优惠券已到账') && !copy.includes('已领取') && !copy.includes('兑换成功') && !copy.includes('支付成功'));
        assert(!vm.benefitText.includes('商城兑换券已放入'));
      }
      if (testCase.status === 'issued') assert(copy.includes('以实际到账券为准'));
      if (testCase.status === 'closed') assert(copy.includes('当前订单不可领取'));
      tap(statusScreen, vm, 'goOrder');
      const route = calls.routes.pop();
      assert(testCase.status === 'issued' ? route === '/pages/my/coupons/coupons?tab=unused' : route.startsWith('/pages/order/order?'));
    }
  }

  // Secondary actions and old non-goods branches remain, with long tips closed by default.
  for (const branch of [
    { type: 'recharge', label: '查看余额', route: '/pages/user/balance/balance' },
    { type: 'subscription', label: '查看卡包', route: '/pages/user/subscription/my' },
    { type: 'ticket', label: '查看票包', route: '/pages/ticket/list' },
    { type: 'order', label: '查看订单', route: '/pages/order/order?state=0&id=non-goods' },
  ]) {
    vm = instance(Success, { type: branch.type, orderId: 'non-goods', confirmedOrder: { order_type: 1, order_number: 'NG1' }, reviewOrderId: 'review/1' });
    assert.strictEqual(vm.notesExpanded, false);
    screen = visibleTemplate(successTemplate, vm);
    assert.strictEqual(visibleText(byClass(screen, 'primary-action')[0]), branch.label);
    assert(!visibleText(screen).includes(vm.tipText));
    tap(screen, vm, 'toggleNotes');
    assert(visibleText(visibleTemplate(successTemplate, vm)).includes(vm.tipText));
    tap(visibleTemplate(successTemplate, vm), vm, 'toggleNotes');
    assert.strictEqual(vm.notesExpanded, false);
    tap(screen, vm, 'goOrder'); assert.strictEqual(calls.routes.pop(), branch.route);
    tap(screen, vm, 'goSecondaryAction');
    assert.strictEqual(calls.routes.pop(), branch.type === 'ticket' ? '/pages/group/group' : '/pages/tabBar/appoint/appoint');
    assert.strictEqual(vm.actionsExpanded, false);
    assert(!visibleText(screen).includes('查看积分福利'));
    assert.strictEqual(findNodes(screen, node => node.attrs && node.attrs['open-type'] === 'share').length, 0);
    tap(screen, vm, 'toggleActions');
    screen = visibleTemplate(successTemplate, vm);
    assert.strictEqual(vm.actionsExpanded, true);
    tap(screen, vm, 'goVoucher'); assert.strictEqual(calls.routes.pop(), '/pages/voucher/voucher');
    tap(screen, vm, 'goCheckIn'); assert.strictEqual(calls.routes.pop(), '/pages/user/user');
    tap(screen, vm, 'goReview'); assert.strictEqual(calls.routes.pop(), '/pages/my/reviews?order_id=review/1');
    tap(screen, vm, 'goHome'); assert.strictEqual(calls.routes.pop(), '/pages/index/index');
    assert.strictEqual(findNodes(screen, node => node.attrs && node.attrs['open-type'] === 'share').length, 1);
    vm.inviteCode = 'INVITE';
    assert.strictEqual(Success.onShareAppMessage.call(vm).path, '/pages/index/index?invite_code=INVITE');
  }
  vm = instance(Success, { type: 'recharge', present: 500, bonus: 20 });
  assert(visibleText(byClass(visibleTemplate(successTemplate, vm), 'secondary-card')[0]).includes('额外到账 ¥5.00 · 赠送 20 积分'));
  vm = instance(Success, { type: 'voucher', orderId: 'real/order', orderError: '请登录后核对订单。' });
  assert.strictEqual(vm.title, '订单状态待确认');
  assert.strictEqual(vm.statusIcon, '?');
  screen = visibleTemplate(successTemplate, vm);
  assert(visibleText(byClass(screen, 'success-card')[0]).includes('查询编号 real/order'));
  assert(visibleText(screen).includes(vm.orderError));
  assert(findNodes(screen, node => node.attrs && node.attrs['@tap'] === 'loadOrderBenefit').length);

  assert(detailText.includes('实际现金金额按结算核定'));
  assert(detailText.includes('商品说明') && detailText.includes('detailsExpanded: false'));
  assert(!detailText.includes('现金需全额支付'));
  assert(!detailText.includes('兑换后30天内有效'));
  assert(!detailText.includes('sky-header') && !detailText.includes('goods-emoji'));
  assert(!/<image\b/.test(detailText.split('</template>')[0]), 'no invented product pictures');
  assert(successText.includes('查看积分福利'));
  for (const source of [detailText, successText]) {
    const css = source.split('<style')[1];
    for (const match of css.matchAll(/font-size:\s*(\d+)rpx/g)) assert(Number(match[1]) >= 24, 'readable mobile text');
    assert(css.includes('min-height: 76rpx') && css.includes('min-height: 88rpx'));
    assert(css.includes('flex-wrap: wrap') && css.includes('env(safe-area-inset-bottom)'));
  }
  for (const text of [detailText, successText]) {
    const template = text.split('</template>')[0];
    assert(!/:class="[^"]*\w+\([^\"]*"/.test(template));
    assert(!/:style="[^"]*\w+\([^\"]*"/.test(template));
    assert(!/\{\{[^\n]*\{\}/.test(template));
  }
  console.log('goods_fulfillment_ui: PASS (real templates/methods, closed secondary details, visible constraints, balance payloads, authoritative status/CTA safety)');
})().catch(error => { console.error(error); process.exitCode = 1; });
