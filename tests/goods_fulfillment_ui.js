const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

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
  assert.strictEqual(vm.validityText, '以实际到账券为准');
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
  assert(vm.purchaseStateDescription.includes('300 积分 + ¥25.00'));
  assert(vm.usageScopeText.includes('不配送') && vm.usageScopeText.includes('免费茶水'));
  checkoutResponse = response(order({ order_status: 0 }));
  vm.handleSubmit();
  await flush();
  assert.deepStrictEqual(calls.checkout[0], { token: 'token', param: { order_type: 3, goods_id: 'goods/1', use_points: 300 } });

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
  assert(!vm.subtitle.includes('已放入'));
  vm.goOrder();
  assert(calls.routes.pop().startsWith('/pages/order/order?'));
  resolveOrder(response({ orders: [order({ goods_fulfillment: { kind: 'pickup', status: 'pending' } })] }));
  await flush();
  assert.strictEqual(vm.fulfillment.status, 'pending');
  assert.strictEqual(vm.primaryText, '去我的订单');
  assert(vm.subtitle.includes('出示订单号'));
  assert.strictEqual(vm.confirmedOrderNumber, 'SN1');
  assert(calls.events.some(event => event.event === 'goods_delivery_summary' && event.fulfillment_status === 'pending'));

  orderRequest = () => Promise.resolve(response({ orders: [order({ goods_fulfillment: { kind: 'coupon', status: 'issued' }, goodsInfo: { context: { granted_coupon_id: 'real-coupon' } } })] }));
  await vm.loadOrderBenefit();
  assert.strictEqual(vm.primaryText, '我的优惠券');
  orderRequest = () => Promise.resolve(response({orders:[order({goods_fulfillment:{kind:'coupon',status:'closed'},goodsInfo:{context:{granted_coupon_id:'old-coupon'}}})]}));
  await vm.loadOrderBenefit();
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

  const detailText = fs.readFileSync(path.join(root, 'pages/voucher/detail.vue'), 'utf8');
  const successText = fs.readFileSync(path.join(root, 'pages/pay/success/success.vue'), 'utf8');
  assert(detailText.includes('实际现金金额按结算核定'));
  assert(detailText.includes('商品组合价'));
  assert(detailText.includes('<text>组合价</text>'));
  assert(!detailText.includes('现金需全额支付'));
  assert(!detailText.includes('兑换后30天内有效'));
  assert(successText.includes('查看积分福利'));
  for (const text of [detailText, successText]) {
    const template = text.split('</template>')[0];
    assert(!/:class="[^"]*\w+\([^\"]*"/.test(template));
    assert(!/:style="[^"]*\w+\([^\"]*"/.test(template));
    assert(!/\{\{[^\n]*\{\}/.test(template));
  }
  console.log('goods_fulfillment_ui: PASS (real methods, authoritative refresh, coupon/blind-box, mixed price, fulfillment safety)');
})().catch(error => { console.error(error); process.exitCode = 1; });
