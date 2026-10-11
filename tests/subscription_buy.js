const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

function moduleValue(file, bindings) {
  let code = fs.readFileSync(path.join(root, file), 'utf8');
  if (file.endsWith('.vue')) code = code.match(/<script>([\s\S]*?)<\/script>/)[1];
  code = code.replace(/^\s*import .*$/mg, '').replace('export default', 'return');
  return new Function(...Object.keys(bindings), code)(...Object.values(bindings));
}
const SUBSCRIPTION = moduleValue('utils/subscription.js', { formatDate: () => '' });
const PRESENTATION = moduleValue('utils/subscriptionPresentation.js', { SUBSCRIPTION });
const source = fs.readFileSync(path.join(root, 'pages/user/subscription/buy.vue'), 'utf8');
const template = source.match(/<template>([\s\S]*?)<\/template>/)[1];
const calls = {
  events: [], toasts: [], checkouts: [], pays: [], navigations: [], emits: [],
  payments: [], timers: [], loads: [], modals: [], mallIntents: [], resumes: [],
};
const storage = new Map();
let loadCards = () => Promise.resolve({ _status: 0, data: [] });
let checkoutResult = { _status: 1, _reason: '测试失败' };
let payResult = { _status: 1, _reason: '测试失败' };
let payFailure = null;
let paymentReject = false;
const AUTH = {
  getSubscriptionCards: token => { calls.loads.push(token); return loadCards(token); },
  trackEvent: (payload, token) => { calls.events.push({ payload, token }); return Promise.resolve(); },
  checkout: (token, payload) => { calls.checkouts.push({ token, payload }); return Promise.resolve(checkoutResult); },
  platformPay: (token, payload) => {
    calls.pays.push({ token, payload });
    return payFailure ? Promise.reject(payFailure) : Promise.resolve(payResult);
  },
};
const uni = {
  showToast: options => calls.toasts.push(options),
  showModal: options => calls.modals.push(options), showLoading: () => {}, hideLoading: () => {},
  navigateTo: options => calls.navigations.push({ kind: 'navigateTo', ...options }),
  redirectTo: options => calls.navigations.push({ kind: 'redirectTo', ...options }),
  navigateBack: options => calls.navigations.push({ kind: 'navigateBack', ...options }),
  switchTab: options => calls.navigations.push({ kind: 'switchTab', ...options }),
  setStorageSync: (key, value) => storage.set(key, value),
  getStorageSync: key => storage.get(key),
  removeStorageSync: key => storage.delete(key),
  $emit: (...args) => calls.emits.push(args),
};
const mallNavigation = moduleValue('utils/mallNavigation.js', { uni });
const MALL_NAV = {
  openCardMall: intent => { calls.mallIntents.push(intent); return mallNavigation.openCardMall(intent); },
  resumeCheckout: intent => { calls.resumes.push(intent); return mallNavigation.resumeCheckout(intent); },
};
const Page = moduleValue('pages/user/subscription/buy.vue', {
  SUBSCRIPTION, PRESENTATION, AUTH, MALL_NAV, uni,
  mapState: () => ({}), mapActions: () => ({}),
  setTimeout: callback => calls.timers.push(callback),
  require: file => {
    assert.strictEqual(file, '../../../common/platform.js');
    return { requestPayment: payload => {
      calls.payments.push(payload);
      return paymentReject ? Promise.reject({ errMsg: 'requestPayment:fail cancel' }) : Promise.resolve();
    } };
  },
});
function instance() {
  const vm = Object.assign(Page.data(), Page.methods, {
    hasLogin: true, token: 'test-token',
    getUserInfo: () => Promise.resolve(), loginAndRegister: () => Promise.resolve(),
  });
  Object.entries(Page.computed).forEach(([key, getter]) => {
    Object.defineProperty(vm, key, { get: () => getter.call(vm) });
  });
  return vm;
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const hall = {
  object_id: 'hall', name: '大厅月享卡', target_type: 1, price: 39900,
  original_price: 52000, total_limit: 8, validity_days: 30, purchase_limit_per_user: 2,
  usage_rules: [{ slot: 'ticket', max_per_order: 3 }, { slot: 'self_entry_fee', max_per_order: 1 }],
};
const room = {
  object_id: 'room', name: '包厢小时卡', target_type: 2, price: 68000,
  total_limit: 10, validity_days: 60, purchase_limit_per_user: 0,
  usable_rooms: [{ object_id: 'r1', name: '暖厅' }],
  usage_rules: [{ slot: 'room_hours', max_per_order: 6 }],
};
const blocked = Object.assign({}, hall, { object_id: 'blocked', can_purchase: false, purchase_limit_per_user: 4 });
const cards = [hall, room, blocked];
const flush = () => new Promise(resolve => setImmediate(resolve));
const last = array => array[array.length - 1];

(async () => {
  assert(source.includes("import PRESENTATION from '../../../utils/subscriptionPresentation.js'"));
  assert(source.includes("import MALL_NAV from '../../../utils/mallNavigation.js'"));
  assert(!/\r/.test(source), 'keep the original LF newlines');
  assert(!/新客|每人限购|自购买日起算|isMonthlyCard|getCardSellingPoint|getRecommendationLabel/.test(source));
  assert(!/linear-gradient|#AB47BC|#7B1FA2|#5C6BC0|#3949AB/i.test(source));
  for (const color of ['#F7F5F1', '#FFFCF7', '#3C332B', '#B95730', '#C96B3F']) assert(source.includes(color));
  assert(!/\{\{[^\n]*\{/.test(template), 'no object literals in interpolations');
  for (const binding of template.matchAll(/:(?:class|style)="([^"]*)"/g)) {
    assert(!/[\w.]\s*\(/.test(binding[1]), 'class/style may not call functions');
    assert(!/[{}]/.test(binding[1]), 'class/style must not contain object literals');
  }
  assert(!/displayCards|target-tabs|targetTabs|switchTargetTab|selectCard\(/.test(source), 'no duplicate chooser');
  assert(!/v-for="[^"\n]*(?:cards|Cards)/.test(template), 'card details are not a list');
  assert(template.includes(':class="selectedCardView.itemClass"'));
  assert(template.includes('@tap.stop="toggleCardDetails(selectedCardId)"'));
  const important = template.match(/<view class="important-rules">([\s\S]*?)<\/view>/)[1];
  const details = template.match(/<view class="card-details" v-if="selectedCardView.detailsExpanded">([\s\S]*?)<\/view>/)[1];
  const collapsed = template.replace(details, '');
  assert(!important.includes('detailsExpanded'), 'important restrictions cannot be hidden');
  assert(important.includes('class="restriction-text" v-if="selectedCardView.showRestrictionText"'));
  assert(important.includes('class="rule-text" v-for="rule in selectedCardView.visibleRuleLines"'));
  for (const field of ['restrictionSummary', 'visibleRuleLines', 'mixedRightsText', 'accountLimitText', 'unavailableReason']) {
    assert(important.includes('selectedCardView.' + field));
  }
  for (const field of ['priceFullText', 'limitText', 'validityText', 'activationSummary']) {
    assert(collapsed.includes('selectedCardView.' + field), 'key information always visible: ' + field);
  }
  for (const field of ['usageText', 'sellingPoint', 'usageExample', 'unitPriceText', 'saveText', 'detailRuleLines', 'combinationText']) {
    assert(details.includes('selectedCardView.' + field), 'secondary explanation remains available: ' + field);
    assert(!collapsed.includes('selectedCardView.' + field), 'secondary explanation defaults closed: ' + field);
  }
  for (const field of ['restrictionText', 'importantRuleLines', 'secondaryRuleLines', 'ruleLines', 'roomScopeText', 'orderLimitText', 'recommendLabel', 'purchaseRuleText']) {
    assert(!template.includes('selectedCardView.' + field), 'no second rendering of the full helper section: ' + field);
  }
  assert(template.includes('<text>使用规则</text>'));
  assert.strictEqual((template.match(/selectedCardView\.priceFullText/g) || []).length, 2, 'card price and checkout total only');
  assert.strictEqual((template.match(/selectedCardView\.activationSummary/g) || []).length, 1, 'activation caveat is not repeated in payment section');
  assert(collapsed.includes('购卡不支持余额、优惠券及积分抵扣'));
  assert(!/font-size:\s*(?:1\d|2[0-3])rpx/.test(source), 'text stays at least 24rpx');
  for (const selector of ['balance-right', 'retry-btn', 'details-toggle', 'submit-btn']) {
    assert(new RegExp('\\.' + selector + '\\s*\\{[^}]*min-height:\\s*76rpx').test(source), 'tap target is at least 76rpx: ' + selector);
  }
  assert(template.includes('v-else-if="loadError"') && template.includes('@tap="fetchCards"'));
  assert(template.includes('v-else-if="!selectedCard"') && template.includes('@tap="goMall">去商城选卡'));
  assert(template.includes('该卡包已下架或不存在') && template.includes('尚未选择卡包'));

  loadCards = () => Promise.resolve({ _status: 0, data: cards });
  const vm = instance();
  const loadsBeforeMissing = calls.loads.length;
  await vm.fetchCards();
  assert.strictEqual(vm.selectedCard, null, 'no missing-id fallback');
  assert.strictEqual(vm.loading, false);
  assert.strictEqual(vm.loadError, '');
  assert.strictEqual(calls.loads.length, loadsBeforeMissing, 'missing selection needs no request');
  assert.strictEqual(vm.purchaseDisabled, true);
  for (const card of cards) {
    const view = vm.buildCardView(card);
    for (const [key, value] of Object.entries(PRESENTATION.buildCardView(card))) {
      assert.deepStrictEqual(view[key], value, 'authoritative helper field: ' + key);
    }
  }
  const hallView = vm.buildCardView(hall);
  assert.strictEqual(hallView.priceFullText, '399.00');
  assert.strictEqual(hallView.limitText, '共8人次');
  assert.strictEqual(hallView.recommendLabel, '每账号限购2次');
  assert(hallView.restrictionText.includes('不支持其他账号独立用卡'));
  assert.strictEqual(hallView.showRestrictionText, true);
  assert(!hallView.importantRuleLines.some(rule => rule.text === hallView.restrictionText));
  assert(hallView.activationText.includes('支付成功'));
  assert.strictEqual(hallView.activationSummary, '支付成功起算，非首次使用激活');
  assert.strictEqual(hallView.restrictionSummary, '持卡账号下单，其他账号不可独立用卡');
  assert.strictEqual(hallView.accountLimitText, '每账号限购2次，不按同行人数');
  assert.strictEqual(hallView.detailsExpanded, false);
  assert(hallView.visibleRuleLines.some(rule => /大厅按人次.*同行每张票扣1次/.test(rule.text)));
  assert(hallView.visibleRuleLines.some(rule => /大厅每单最多抵3张票.*超出另付/.test(rule.text)));
  assert(hallView.visibleRuleLines.some(rule => /扣1次抵本人入场费.*同行另付/.test(rule.text)));
  assert(hallView.mixedRightsText.includes('大厅票 / 包厢入场费二选一'));
  assert(hallView.mixedRightsText.includes('共用额度；本卡每单仅选一种权益'));
  const roomView = vm.buildCardView(room);
  assert.strictEqual(roomView.orderLimitText, '每单最多抵6小时房费');
  assert.strictEqual(roomView.roomScopeText, '暖厅');
  assert.strictEqual(roomView.showRestrictionText, false);
  assert.strictEqual(roomView.detailsExpanded, false);
  assert.strictEqual(roomView.importantRuleLines.filter(rule => /入场费/.test(rule.text)).length, 1);
  assert(roomView.importantRuleLines.some(rule => /不含本人及同行人的入场费/.test(rule.text)));
  assert.strictEqual(roomView.importantRuleLines.filter(rule => /闲时/.test(rule.text)).length, 1);
  assert(roomView.importantRuleLines.some(rule => /闲时.*规则明确允许时除外.*混合预约仅抵允许用卡的小时/.test(rule.text)));
  assert.strictEqual(roomView.mixedRightsText, '', 'room-only card must not imply entry benefits');
  assert(roomView.visibleRuleLines.some(rule => /只抵房费.*本人及同行入场费另付/.test(rule.text)));
  assert(roomView.visibleRuleLines.some(rule => /房费每单最多抵6小时/.test(rule.text)));
  assert(roomView.visibleRuleLines.some(rule => /适用房间：暖厅/.test(rule.text)));
  assert.strictEqual(roomView.visibleRuleLines.filter(rule => /闲时/.test(rule.text)).length, 1);
  assert(roomView.visibleRuleLines.some(rule => /闲时特惠默认不可抵.*规则允许除外.*混合预约仅抵允许用卡的小时/.test(rule.text)));
  const roomWithEntry = vm.buildCardView(Object.assign({}, room, {
    usage_rules: room.usage_rules.concat({ slot: 'self_entry_fee', max_per_order: 1 }),
  }));
  assert.strictEqual(roomWithEntry.showRestrictionText, false);
  assert(roomWithEntry.importantRuleLines.some(rule => /抵本人入场费，不抵同行入场费/.test(rule.text)));
  assert(roomWithEntry.importantRuleLines.some(rule => /规则明确允许时除外.*混合预约/.test(rule.text)));
  assert.strictEqual(roomView.recommendLabel, '', 'no invented quota');
  assert.strictEqual(roomWithEntry.mixedRightsText, '房费 / 包厢入场费二选一，共用额度；本卡每单仅选一种权益');
  assert(!roomWithEntry.visibleRuleLines.some(rule => /本人及同行入场费另付/.test(rule.text)), 'entry right is not falsely removed');
  assert(roomWithEntry.visibleRuleLines.some(rule => /抵本人入场费.*同行另付/.test(rule.text)));

  // Exercise the real helper's rights and limits, not shortened fixture-only strings.
  const presentationCards = cards.concat([
    { ...hall, usage_rules: [{ slot: 'ticket', max_per_order: 1 }] },
    { ...hall, usage_rules: [{ slot: 'ticket', max_per_order: 0 }] },
    { ...hall, usage_rules: [{ slot: 'self_entry_fee', max_per_order: 0 }] },
    { ...hall, usage_rules: [{ slot: 'self_entry_fee', max_per_order: 3 }] },
    { ...hall, usage_rules: [{ slot: 'ticket', enabled: false }] },
    { ...room, usable_rooms: [] },
    { ...room, usable_rooms: ['r1'] },
    { ...room, usage_rules: [{ slot: 'room_hours' }, { slot: 'self_entry_fee', max_per_order: 1 }] },
    { ...room, usage_rules: [{ slot: 'room_hours' }, { slot: 'ticket', max_per_order: 2 }] },
    { ...room, usage_rules: [{ slot: 'room_hours' }, { slot: 'ticket' }, { slot: 'self_entry_fee', max_per_order: 3 }], stackable: false },
  ]);
  for (const card of presentationCards) {
    const view = vm.buildCardView(card);
    const helper = PRESENTATION.buildCardView(card);
    for (const [key, value] of Object.entries(helper)) assert.deepStrictEqual(view[key], value, 'unchanged helper field: ' + key);
    assert.strictEqual(view.detailsExpanded, false, 'every card starts collapsed');
    assert.deepStrictEqual(view.importantRuleLines.concat(view.secondaryRuleLines).map(rule => rule.key).sort(),
      helper.ruleLines.map(rule => rule.key).sort(), 'all full rules retained without duplication');
    for (const rule of helper.ruleLines.filter(rule => /大厅购票|房费|入场费|闲时|适用房间|每个账号限购|同一订单不可/.test(rule.text))) {
      assert(view.importantRuleLines.some(item => item.key === rule.key), 'must-know rule stays important: ' + rule.text);
      if (/每个账号限购/.test(rule.text)) assert(view.accountLimitText.includes('不按同行人数'));
      else if (/^(大厅购票与包厢入场抵扣共用额度|房费与入场费为二选一用途)/.test(rule.text)) assert(view.mixedRightsText.includes('共用额度'));
      else assert(view.visibleRuleLines.some(item => item.key === rule.key), 'short visible filter retains the right: ' + rule.text);
    }
    const rights = [SUBSCRIPTION.SLOT_ROOM_HOURS, SUBSCRIPTION.SLOT_TICKET, SUBSCRIPTION.SLOT_SELF_ENTRY_FEE]
      .filter(slot => PRESENTATION.presentationRule(card, slot));
    assert.strictEqual(!!view.mixedRightsText, rights.length > 1);
    if (rights.length > 1) {
      assert(view.mixedRightsText.includes('本卡每单仅选一种权益'));
      assert(!view.visibleRuleLines.some(rule => /共用额度|同一卡包每单/.test(rule.text)), 'mixed-rights summary appears only once');
      assert(!view.combinationText.includes('同一卡包每单'), 'expanded section does not repeat the mixed-rights warning');
    }
    for (const rule of view.visibleRuleLines) {
      assert(!view.detailRuleLines.some(item => item.key === rule.key), 'expanded section does not repeat visible rules');
    }
    assert.strictEqual(new Set(view.visibleRuleLines.map(rule => rule.key)).size, view.visibleRuleLines.length);
    if (card.stackable === false) assert(view.visibleRuleLines.some(rule => /不可与其他卡包/.test(rule.text)));
  }
  const entryMany = vm.buildCardView({ ...hall, usage_rules: [{ slot: 'self_entry_fee', max_per_order: 3 }] });
  assert(!entryMany.showRestrictionText, 'entry-only card does not invent a hall-sharing rule');
  assert.strictEqual(entryMany.mixedRightsText, '');
  assert(entryMany.visibleRuleLines.some(rule => /最多抵3人，以结算页为准/.test(rule.text)));
  assert(!entryMany.visibleRuleLines.some(rule => /同行另付/.test(rule.text)), 'multi-person entry rights are not reduced to self-only');
  const mixedHallRoom = vm.buildCardView({ ...room, usage_rules: [{ slot: 'room_hours' }, { slot: 'ticket' }] });
  assert(mixedHallRoom.showRestrictionText && mixedHallRoom.mixedRightsText.includes('大厅票'));
  assert(mixedHallRoom.visibleRuleLines.some(rule => /大厅按人次/.test(rule.text)));
  assert(mixedHallRoom.visibleRuleLines.some(rule => /本人及同行入场费另付/.test(rule.text)), 'hall tickets do not imply room entry benefits');

  const routed = instance();
  const returnUrl = '/pages/order/createOrder?room_id=r1&date=2026-10-11&mall_return_id=draft-token';
  Page.onLoad.call(routed, {
    card_id: 'room', target_type: '1', amount: '390', source: 'room_checkout',
    return_url: encodeURIComponent(returnUrl),
  });
  await flush();
  assert.strictEqual(routed.selectedCard, room, 'explicit id wins over target and amount');
  assert.strictEqual(routed.returnToCheckout, true, 'legacy checkout source infers return');
  assert.strictEqual(routed.returnUrl, returnUrl);
  assert.strictEqual(routed.purchaseDisabled, false);
  assert(routed.sectionSummary.includes('按小时'));
  assert(routed.selectedCardView.itemClass.includes(' active'));
  assert(calls.events.some(call => call.payload.event === 'subscription_card_select' && call.payload.card_id === 'room'));
  routed.toggleCardDetails('room');
  assert.strictEqual(routed.selectedCardView.detailsExpanded, true);
  routed.toggleCardDetails('room');
  assert.strictEqual(routed.selectedCardView.detailsExpanded, false);
  assert.strictEqual(routed.selectedCard, room, 'expansion does not change selection');
  routed.finishPurchaseNavigation('order-test');
  assert.deepStrictEqual(last(calls.emits), ['subscriptionPurchased', { card_id: 'room', target_type: 2 }]);
  assert.deepStrictEqual(last(calls.resumes), { source: 'room_checkout', returnUrl });
  assert.deepStrictEqual(last(calls.navigations), { kind: 'redirectTo', url: returnUrl });
  assert(!calls.navigations.some(item => item.kind === 'navigateBack'), 'tabBar navigation no longer relies on old stack');

  const requestCount = calls.loads.length, checkoutCount = calls.checkouts.length, payCount = calls.pays.length;
  // An existing checkout draft must survive a legacy redirect and an invalid-card retry.
  const draft = { room_id: 'r1', hours: 2 };
  const draftIntent = mallNavigation.openCardMall({ source: 'room_checkout', returnToCheckout: true, returnUrl, returnDraft: draft });
  const draftReturnUrl = draftIntent.returnUrl;
  const legacy = instance();
  let userRefreshes = 0;
  legacy.getUserInfo = () => { userRefreshes++; return Promise.resolve(); };
  Page.onLoad.call(legacy, { amount: '390', target_type: '2', source: 'room_checkout', return_url: encodeURIComponent(draftReturnUrl) });
  Page.onShow.call(legacy);
  await flush();
  assert.strictEqual(legacy.selectedCard, null);
  assert.strictEqual(legacy.loading, false);
  assert.strictEqual(calls.loads.length, requestCount, 'legacy redirect does not fetch cards');
  assert.strictEqual(userRefreshes, 0, 'redirect does not trigger account request onShow');
  assert.strictEqual(calls.checkouts.length, checkoutCount);
  assert.strictEqual(calls.pays.length, payCount);
  assert.deepStrictEqual(last(calls.mallIntents), {
    source: 'room_checkout', targetType: 2, amount: 390, returnToCheckout: true, returnUrl: draftReturnUrl,
  });
  assert.deepStrictEqual(last(calls.navigations), { kind: 'switchTab', url: '/pages/voucher/voucher' });
  const intent = mallNavigation.takeCardIntent();
  assert.strictEqual(intent.amount, 390);
  assert.strictEqual(intent.returnUrl, draftReturnUrl);
  assert.strictEqual(intent.returnId, draftIntent.returnId, 'mall intent retains the helper-generated draft token');
  const unknown = instance();
  Page.onLoad.call(unknown, { card_id: 'unknown', source: 'room_checkout', target_type: '2', return_url: encodeURIComponent(draftReturnUrl) });
  await flush();
  assert.strictEqual(unknown.selectedCard, null, 'unknown id never chooses another card');
  assert.strictEqual(unknown.selectedCardId, '');
  assert.strictEqual(unknown.purchaseDisabled, true);
  unknown.doPurchase();
  assert.strictEqual(calls.checkouts.length, checkoutCount);
  unknown.goMall();
  assert.strictEqual(last(calls.mallIntents).returnUrl, draftReturnUrl);
  assert(!Object.prototype.hasOwnProperty.call(last(calls.mallIntents), 'returnDraft'));
  assert.deepStrictEqual(mallNavigation.takeCheckoutDraft('room_checkout', draftIntent.returnId), draft);
  const blank = instance();
  const beforeBlank = calls.loads.length;
  Page.onLoad.call(blank, { card_id: '  ', amount: '399', target_type: '1' });
  await flush();
  assert.strictEqual(blank.selectedCard, null, 'explicit empty id shows missing-selection state');
  assert.strictEqual(blank.loading, false);
  assert.strictEqual(calls.loads.length, beforeBlank);
  const direct = instance();
  Page.onLoad.call(direct);
  assert.strictEqual(direct.selectedCard, null);
  assert.strictEqual(calls.loads.length, beforeBlank);
  assert.strictEqual(last(calls.navigations).kind, 'switchTab');

  const unavailable = instance();
  Page.onLoad.call(unavailable, { card_id: 'blocked' });
  await flush();
  assert.strictEqual(unavailable.selectedCard, blocked, 'unavailable card still displays its own details');
  assert.strictEqual(unavailable.selectedCardView.priceFullText, '399.00');
  assert.strictEqual(unavailable.selectedCardView.limitText, '共8人次');
  assert(unavailable.selectedCardView.itemClass.includes(' unavailable'));
  assert.strictEqual(unavailable.purchaseDisabled, true);
  assert.strictEqual(unavailable.purchaseButtonText, PRESENTATION.buildCardView(blocked).purchaseRuleText);
  unavailable.doPurchase();
  assert.strictEqual(calls.checkouts.length, checkoutCount);
  assert.strictEqual(last(calls.toasts).title, unavailable.purchaseButtonText);
  loadCards = () => Promise.resolve({ _status: 0, data: [{ ...blocked, purchase_limit_per_user: 0 }] });
  await unavailable.fetchCards();
  assert.strictEqual(unavailable.purchaseButtonText, '当前账号暂不可购买此卡', 'no-limit unavailable card has a clear fallback reason');

  const pending = deferred();
  loadCards = () => pending.promise;
  const refresh = routed.fetchCards();
  assert.strictEqual(routed.loading, true);
  assert.strictEqual(routed.selectedCard, null, 'refresh clears stale selection immediately');
  assert.strictEqual(routed.cards.length, 0);
  assert.strictEqual(routed.purchaseDisabled, true);
  routed.doPurchase();
  assert.strictEqual(calls.checkouts.length, checkoutCount);
  pending.reject(new Error('offline'));
  await refresh;
  assert(routed.loadError && !routed.loading);
  routed.doPurchase();
  assert.strictEqual(calls.checkouts.length, checkoutCount);
  for (const result of [{ _status: 1, _reason: '资格加载失败' }, { _status: 0, data: {} }, null]) {
    loadCards = () => Promise.resolve(result);
    await routed.fetchCards();
    assert(routed.loadError && !routed.loading);
    assert.strictEqual(routed.selectedCard, null);
    assert.strictEqual(routed.cards.length, 0);
  }
  for (const catalog of [[], [hall, blocked]]) {
    loadCards = () => Promise.resolve({ _status: 0, data: catalog });
    await routed.fetchCards();
    assert.strictEqual(routed.loadError, '');
    assert.strictEqual(routed.selectedCard, null, 'removed id never falls back to remaining cards');
    assert.strictEqual(routed.selectedCardId, '');
    routed.doPurchase();
    assert.strictEqual(calls.checkouts.length, checkoutCount);
  }
  loadCards = () => Promise.resolve({ _status: 0, data: cards });
  await routed.fetchCards();
  assert.strictEqual(routed.selectedCard, room, 'retry restores only the explicit route selection');
  routed.toggleCardDetails('room');
  assert.strictEqual(routed.selectedCardView.detailsExpanded, true);
  await routed.fetchCards();
  assert.strictEqual(routed.selectedCardView.detailsExpanded, false, 'reload resets the optional section to closed');
  const older = deferred(), newer = deferred();
  loadCards = () => older.promise;
  const oldRequest = routed.fetchCards();
  loadCards = () => newer.promise;
  const newRequest = routed.fetchCards();
  newer.resolve({ _status: 0, data: cards });
  await newRequest;
  older.reject(new Error('late failure'));
  await oldRequest;
  assert.strictEqual(routed.loadError, '');
  assert.strictEqual(routed.selectedCard, room);
  const olderSuccess = deferred();
  loadCards = () => olderSuccess.promise;
  const lateSuccess = routed.fetchCards();
  loadCards = () => Promise.resolve({ _status: 0, data: [hall] });
  await routed.fetchCards();
  olderSuccess.resolve({ _status: 0, data: cards });
  await lateSuccess;
  assert.strictEqual(routed.selectedCard, null, 'late success cannot restore a removed card');
  loadCards = () => Promise.resolve({ _status: 0, data: cards });
  await routed.fetchCards();
  routed.cards = [{ ...room, can_purchase: false }];
  assert.strictEqual(routed.purchaseDisabled, true);
  routed.doPurchase();
  assert.strictEqual(routed.selectedCard.can_purchase, false, 'latest eligibility replaces stale details');
  assert.strictEqual(calls.checkouts.length, checkoutCount);
  routed.selectedCard = hall;
  routed.selectedCardId = 'hall';
  routed.cards = cards;
  routed.doPurchase();
  assert.strictEqual(routed.selectedCard, null, 'purchase cannot silently substitute another id');
  assert.strictEqual(calls.checkouts.length, checkoutCount);

  // Login must refresh eligibility for the same selected id, not choose a different card.
  loadCards = () => Promise.resolve({ _status: 0, data: cards });
  const guest = instance();
  guest.hasLogin = false;
  guest.token = '';
  Page.onLoad.call(guest, { card_id: 'room' });
  await flush();
  guest.loginAndRegister = () => { guest.hasLogin = true; guest.token = 'after-login'; return Promise.resolve(); };
  loadCards = () => Promise.resolve({ _status: 0, data: [hall, { ...room, can_purchase: false }] });
  guest.doPurchase();
  assert.strictEqual(last(calls.modals).title, '登录后继续购买');
  last(calls.modals).success({ confirm: true });
  await flush();
  assert.strictEqual(last(calls.loads), 'after-login');
  assert.strictEqual(guest.selectedCard.object_id, 'room');
  assert.strictEqual(guest.purchaseDisabled, true);
  assert.strictEqual(calls.checkouts.length, checkoutCount);
  let shownRefreshes = 0;
  guest.getUserInfo = () => { shownRefreshes++; return Promise.resolve(); };
  Page.onShow.call(guest);
  assert.strictEqual(shownRefreshes, 1, 'selected-card login account refresh stays intact');

  loadCards = () => Promise.resolve({ _status: 0, data: cards });
  await routed.fetchCards();
  checkoutResult = { _status: 0, data: { order_number: 'order-test' } };
  const payment = { timeStamp: '1', nonceStr: 'nonce', package: 'prepay_id=test', signType: 'RSA', paySign: 'sign' };
  for (const payload of [{ _status: 0, data: { payment } }, { _status: 0, data: { wxpay: payment } }, payment]) {
    payResult = payload;
    routed.doPurchase();
    await flush();
    assert.deepStrictEqual(last(calls.checkouts), {
      token: 'test-token', payload: { order_type: 7, subscription_card_id: 'room' },
    });
    assert.deepStrictEqual(last(calls.pays), {
      token: 'test-token', payload: { order_number: 'order-test', use_balance: false },
    });
    assert.deepStrictEqual(last(calls.payments), payment);
    assert.strictEqual(routed.buying, false);
  }
  for (const event of ['subscription_buy_click', 'subscription_checkout_created', 'subscription_payment_launch', 'subscription_payment_success', 'payment_success']) {
    assert(calls.events.some(call => call.payload.event === event), 'preserved event: ' + event);
  }
  const beforeCompleted = calls.payments.length;
  payResult = { _status: 0, data: { payment_completed: true } };
  routed.doPurchase();
  await flush();
  assert.strictEqual(calls.payments.length, beforeCompleted, 'completed payment does not launch wxpay again');
  last(calls.timers)();
  assert.strictEqual(last(calls.navigations).url, returnUrl);
  checkoutResult = { _status: 1, _reason: '下单受限' };
  const beforeFailedCheckout = calls.pays.length;
  routed.doPurchase();
  await flush();
  assert.strictEqual(calls.pays.length, beforeFailedCheckout);
  assert.strictEqual(routed.buying, false);
  assert.strictEqual(last(calls.modals).content, '下单受限');
  const returnQuery = '&mall_source=room_checkout&mall_return_url=' + encodeURIComponent(returnUrl);
  const retainedUrl = '/pages/order/payment?parent_sn=retained%2Forder&entry=3' + returnQuery;
  assert.strictEqual(routed.paymentContinuationUrl('retained/order'), retainedUrl);
  const retainedParams = new URL('https://test.invalid' + retainedUrl).searchParams;
  assert.strictEqual(retainedParams.get('parent_sn'), 'retained/order');
  assert.strictEqual(retainedParams.get('entry'), '3');
  assert.strictEqual(retainedParams.get('mall_source'), 'room_checkout');
  assert.strictEqual(retainedParams.get('mall_return_url'), returnUrl, 'encoded return URL retains its complete query and draft token');
  assert.strictEqual(retainedParams.has('mall_return_id'), false, 'nested draft token is not leaked into payment query');
  assert.strictEqual((source.match(/url: this\.paymentContinuationUrl\(orderNumber\)/g) || []).length, 3,
    'all three retained-order links use the same helper');
  payResult = { _status: 1, _reason: '获取支付参数失败' };
  routed.payWithWechat('retained/order');
  await flush();
  assert.strictEqual(last(calls.modals).title, '获取支付参数失败');
  assert.strictEqual(last(calls.modals).confirmText, '查看订单');
  last(calls.modals).success({ confirm: true });
  assert.strictEqual(last(calls.navigations).url, retainedUrl);
  payFailure = { _reason: '支付参数网络错误' };
  routed.payWithWechat('network/order');
  await flush();
  assert.strictEqual(last(calls.modals).content, '支付参数网络错误');
  assert.strictEqual(last(calls.modals).confirmText, '查看订单');
  last(calls.modals).success({ confirm: true });
  assert.strictEqual(last(calls.navigations).url, '/pages/order/payment?parent_sn=network%2Forder&entry=3' + returnQuery);
  payFailure = null;
  paymentReject = true;
  payResult = { _status: 0, data: { payment } };
  routed.payWithWechat('cancel/order');
  await flush();
  assert.strictEqual(last(calls.modals).title, '支付未完成');
  assert.strictEqual(last(calls.modals).confirmText, '继续支付');
  last(calls.modals).success({ confirm: true });
  assert.strictEqual(last(calls.navigations).url, '/pages/order/payment?parent_sn=cancel%2Forder&entry=3' + returnQuery);
  assert.deepStrictEqual(last(calls.pays), {
    token: 'test-token', payload: { order_number: 'cancel/order', use_balance: false },
  }, 'continuation context never changes the payment request payload');
  paymentReject = false;
  const noReturn = instance();
  noReturn.source = 'room_checkout';
  noReturn.returnUrl = returnUrl;
  assert.strictEqual(noReturn.paymentContinuationUrl('ordinary/order'), '/pages/order/payment?parent_sn=ordinary%2Forder&entry=3',
    'allowed source without checkout-return flag keeps the original payment URL');
  noReturn.returnToCheckout = true;
  noReturn.source = 'mall';
  assert.strictEqual(noReturn.paymentContinuationUrl('ordinary/order'), '/pages/order/payment?parent_sn=ordinary%2Forder&entry=3',
    'unapproved source cannot attach return context');
  noReturn.source = 'ticket_checkout';
  noReturn.returnUrl = '/pages/ticket/buy?count=2&mall_return_id=ticket-token';
  assert.strictEqual(noReturn.paymentContinuationUrl('ticket/order'), '/pages/order/payment?parent_sn=ticket%2Forder&entry=3'
    + '&mall_source=ticket_checkout&mall_return_url=' + encodeURIComponent(noReturn.returnUrl));

  Page.onLoad.call(vm, { card_id: 'hall' });
  await flush();
  vm.finishPurchaseNavigation('order/test');
  assert.strictEqual(last(calls.navigations).url,
    '/pages/pay/success/success?amount=39900&id=order%2Ftest&type=subscription');
  const explicitReturn = instance();
  Page.onLoad.call(explicitReturn, { card_id: 'hall', source: 'mall', return_to_checkout: '1', return_url: '%invalid' });
  await flush();
  assert.strictEqual(explicitReturn.returnToCheckout, true);
  assert.strictEqual(explicitReturn.returnUrl, '%invalid', 'malformed URI does not crash onLoad');
  explicitReturn.finishPurchaseNavigation('order-test');
  assert.strictEqual(last(calls.navigations).url, '/pages/user/subscription/my', 'invalid checkout source uses safe fallback');
  const ticketReturn = instance();
  Page.onLoad.call(ticketReturn, { card_id: 'hall', source: 'ticket_checkout' });
  await flush();
  ticketReturn.finishPurchaseNavigation('ticket-order');
  assert.strictEqual(last(calls.navigations).url, '/pages/ticket/buy');
  console.log('Subscription buy: single-card confirmation, exact details, missing/unknown/removed ids, eligibility, mall intent and checkout return, login refresh, retry/races, analytics and payment contracts passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
