const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const files = {
  user: 'pages/user/user.vue', home: 'pages/index/index.vue',
  cards: 'pages/user/subscription/my.vue', coupons: 'pages/my/coupons/coupons.vue',
  room: 'pages/order/createOrder.vue', ticket: 'pages/ticket/buy.vue',
};
function load(file, bindings) {
  let code = fs.readFileSync(path.join(root, file), 'utf8');
  if (file.endsWith('.vue')) code = code.match(/<script>([\s\S]*?)<\/script>/)[1];
  code = code.replace(/^\s*import[\s\S]*?from\s+['"][^'"]+['"];?[ \t]*(?:\r?\n|$)/gm, '')
    .replace('export default', 'return');
  return new Function(...Object.keys(bindings), code)(...Object.values(bindings));
}
const navigation = [], events = [], modals = [], calls = [], opens = [];
const storage = new Map();
const uni = {
  navigateTo: options => navigation.push(['navigateTo', options.url]),
  switchTab: options => navigation.push(['switchTab', options.url]),
  redirectTo: options => navigation.push(['redirectTo', options.url]),
  navigateBack: () => { throw new Error('Mall return must not depend on the old checkout stack'); },
  setStorageSync: (key, value) => storage.set(key, value),
  getStorageSync: key => storage.get(key),
  removeStorageSync: key => storage.delete(key),
  showModal: options => modals.push(options), showToast: () => {},
  $on: () => {}, $off: () => {},
};
const SUBSCRIPTION = load('utils/subscription.js', { formatDate: () => '' });
const MALL_NAV = load('utils/mallNavigation.js', { uni });
const openCardMall = MALL_NAV.openCardMall;
MALL_NAV.openCardMall = options => { opens.push(options); return openCardMall(options); };
const latestAddon = { object_id: 'addon-1', name: '最新小食', price: 900 };
const AUTH = {
  trackEvent: (event, token) => { events.push({ event, token }); return Promise.resolve(); },
  getMyCoupons: async () => { calls.push('coupons'); return { _status: 0, data: [] }; },
  getUserSubscriptions: async () => { calls.push('subscriptions'); return { _status: 0, data: [] }; },
  getRoomAddons: async () => { calls.push('addons'); return { _status: 0, data: [latestAddon] }; },
  getConstance: async () => { calls.push('ticketPrice'); return { _status: 0, data: { ticket_price_per_person: 4200 } }; },
};
const bindings = {
  AUTH, SUBSCRIPTION, MALL_NAV, uni, COUPON: { normalizeCoupons: list => list },
  PRESENTATION: {}, OFFPEAK: {}, PLATFORM: {}, formatDate: () => '',
  mapState: () => ({}), mapActions: () => ({}), mapMutations: () => ({}),
};
const pages = Object.fromEntries(Object.entries(files).map(([name, file]) => [name, load(file, bindings)]));
function instance(name, overrides = {}) {
  return Object.assign(pages[name].data ? pages[name].data() : {}, pages[name].methods, {
    token: 'existing-token', hasLogin: true, $nextTick: () => {},
  }, overrides);
}
function reset() { navigation.length = events.length = modals.length = calls.length = opens.length = 0; storage.clear(); }
function assertMall(source, targetType = 0, amount = 0, returnToCheckout = false) {
  assert.deepStrictEqual(navigation.pop(), ['switchTab', '/pages/voucher/voucher']);
  const intent = storage.get('mall_card_intent');
  assert(intent, 'actual shared helper must publish an intent');
  assert.strictEqual(intent.source, source);
  assert.strictEqual(intent.targetType, targetType);
  assert.strictEqual(intent.amount, amount);
  assert.strictEqual(intent.returnToCheckout, returnToCheckout);
  const event = events.pop();
  assert.strictEqual(event.event.event, 'subscription_entry_click');
  assert.strictEqual(event.event.source, source);
  assert.strictEqual(event.token, 'existing-token');
  return intent;
}
function returnOptions(intent, route, expectedQuery = {}) {
  const url = new URL(intent.returnUrl, 'https://checkout.test');
  assert.strictEqual(url.pathname, route);
  const options = Object.fromEntries(url.searchParams);
  assert(options.mall_return_id, 'shared helper must mark the explicit checkout return');
  for (const [key, value] of Object.entries(expectedQuery)) assert.strictEqual(options[key], value);
  return options;
}
async function flush() { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); }
async function run() {
  // Execute the actual page methods AND actual navigation helper with uni mocks.
  for (const [page, method, source] of [
    ['home', 'goToSubscriptionMall', 'home_saver'],
    ['user', 'goSubscriptionMall', 'user_center'], ['cards', 'goBuy', 'my_cards'],
  ]) {
    reset();
    instance(page, { hasLogin: false })[method]();
    assertMall(source);
    assert.strictEqual(modals.length, 0, 'browsing the public mall does not force login');
  }

  // Owned assets and points keep explicit login gates; tapping does not navigate first.
  for (const method of ['goCardPack', 'goCouponCenter', 'goPointsCenter']) {
    reset();
    let loginCalls = 0;
    const user = instance('user', {
      hasLogin: false,
      loginAndRegister: () => { loginCalls++; return Promise.resolve(); },
      getUserInfo: () => {}, loadCheckInInfo: () => {}, loadInviteInfo: () => {},
      loadMemberConfig: () => {}, loadOrderCounts: () => {}, loadCouponCounts: () => {},
    });
    user[method]();
    assert.strictEqual(loginCalls, 1);
    assert.strictEqual(navigation.length, 0);
    assert.strictEqual(storage.size, 0);
    await flush();
  }
  reset();
  instance('user').goCardPack();
  assert.deepStrictEqual(navigation.pop(), ['navigateTo', '/pages/user/subscription/my']);
  for (const counts of [{ claimableCouponCount: 8, unusedCouponCount: 2 }, { claimableCouponCount: 0, unusedCouponCount: 0 }]) {
    instance('user', counts).goCouponCenter();
    assert.deepStrictEqual(navigation.pop(), ['navigateTo', '/pages/my/coupons/coupons?tab=unused'],
      'owned coupons must open the owned list, not silently select claimable campaigns');
  }
  instance('user').goPointsCenter();
  assert.strictEqual(storage.get('voucherInitialTab'), undefined);
  assert.deepStrictEqual(navigation.pop(), ['navigateTo', '/pages/voucher/points']);

  for (const [source, initialTab] of [['home_points', 'points'], ['home_shop', 'shop'], ['home_upsell', 'shop'], ['home_coupon_hint', 'coupon']]) {
    instance('home', { claimableCouponCount: 3 }).goToVoucher(source);
    if (source === 'home_points') {
      assert.deepStrictEqual(navigation.pop(), ['navigateTo', '/pages/voucher/points']);
    } else {
      assert.strictEqual(storage.get('voucherInitialTab'), initialTab);
      assert.deepStrictEqual(navigation.pop(), ['switchTab', '/pages/voucher/voucher']);
    }
    if (source !== 'home_points') assert.strictEqual(events.pop().event.source, source);
  }
  for (const page of ['user', 'home']) {
    instance(page, { checkInInfo: {}, checkInBoardCurrentDay: 1 }).showCheckInSuccess({ points_earned: 12 });
    const modal = modals.pop();
    assert.strictEqual(modal.confirmText, '积分福利');
    modal.success({ confirm: false });
    assert.strictEqual(navigation.length, 0);
    modal.success({ confirm: true });
    assert.deepStrictEqual(navigation.pop(), ['navigateTo', '/pages/voucher/points']);
  }
  reset();
  instance('coupons').goCouponMall();
  assert.deepStrictEqual(navigation.pop(), ['navigateTo', '/pages/voucher/claim']);
  assert.strictEqual(storage.size, 0, 'standalone claim no longer selects a mall tab');

  reset();
  const ticket = instance('ticket', { ticketCount: 3, ticketMode: 'hall', basePriceFen: 11401, isUpgradeMode: false });
  ticket.goBuySubscription();
  const ticketIntent = assertMall('ticket_checkout', 1, 115, true);
  const ticketReturnOptions = returnOptions(ticketIntent, '/pages/ticket/buy', { count: '3', mode: 'hall' });
  assert.deepStrictEqual(opens.pop().returnDraft, { ticketCount: 3, ticketMode: 'hall' });
  assert.strictEqual(MALL_NAV.takeCheckoutDraft('ticket_checkout'), null, 'missing return ID does not consume the draft');
  assert.strictEqual(MALL_NAV.takeCheckoutDraft('ticket_checkout', 'wrong-id'), null, 'wrong return ID does not consume the draft');
  assert.strictEqual(MALL_NAV.takeCheckoutDraft('room_checkout', ticketReturnOptions.mall_return_id), null, 'wrong source does not consume the draft');
  assert.strictEqual(MALL_NAV.resumeCheckout(ticketIntent), true);
  assert.deepStrictEqual(navigation.pop(), ['redirectTo', ticketIntent.returnUrl]);
  const restoredTicket = instance('ticket', { supportsStandardBenefits: true, supportsSubscription: true });
  await pages.ticket.onLoad.call(restoredTicket, { ...ticketReturnOptions, count: '1' });
  await flush();
  assert.strictEqual(restoredTicket.ticketCount, 3, 'draft restoration happens after default route values');
  assert.strictEqual(restoredTicket.hallPriceFen, 4200, 'ticket price is fetched again');
  assert(calls.includes('ticketPrice') && calls.includes('coupons') && calls.includes('subscriptions'));
  assert.strictEqual(MALL_NAV.takeCheckoutDraft('ticket_checkout', ticketReturnOptions.mall_return_id), null, 'draft is consumed once');
  assert.strictEqual(restoredTicket.selectedCoupon, null);
  assert.strictEqual(restoredTicket.selectedSubscription, null);
  assert.strictEqual(restoredTicket.usePoints, false);
  assert.strictEqual(restoredTicket.submitting, false);
  restoredTicket.restoreCheckoutDraft({ ticketCount: -1, ticketMode: 'invalid', submitting: true });
  assert.strictEqual(restoredTicket.ticketCount, 3);
  assert.strictEqual(restoredTicket.ticketMode, 'hall');
  assert.strictEqual(restoredTicket.submitting, false);

  reset();
  const roomProduct = { object_id: 'room-1', seats_count: 6, price_per_person: 3800, selects: [['2026-10-12 10:00:00', '2026-10-12 12:00:00']] };
  const room = instance('room', {
    currentProduct: roomProduct, roomPriceFen: 9010, numOfPeople: 4, desc: '需要儿童椅',
    selectedAddons: [{ object_id: 'addon-1', price: 1 }, { object_id: 'removed-addon', price: 2 }],
  });
  room.goBuySubscription();
  const roomIntent = assertMall('room_checkout', 2, 91, true);
  const roomReturnOptions = returnOptions(roomIntent, '/pages/order/createOrder');
  assert.deepStrictEqual(opens.pop().returnDraft, {
    roomId: 'room-1', bookingSignature: JSON.stringify(roomProduct.selects),
    numOfPeople: 4, desc: '需要儿童椅', selectedAddonIds: ['addon-1', 'removed-addon'],
  });
  assert.strictEqual(MALL_NAV.takeCheckoutDraft('room_checkout'), null, 'ordinary room entry does not consume an old draft');
  assert.strictEqual(MALL_NAV.takeCheckoutDraft('room_checkout', 'wrong-id'), null, 'wrong room return ID does not consume an old draft');
  MALL_NAV.resumeCheckout(roomIntent);
  assert.deepStrictEqual(navigation.pop(), ['redirectTo', roomIntent.returnUrl]);
  const restoredRoom = instance('room', {
    isNightOffpeak: false,
    $store: { state: { currentRoom: roomProduct }, dispatch: () => Promise.resolve() },
  });
  pages.room.onLoad.call(restoredRoom, roomReturnOptions);
  await flush();
  assert.strictEqual(restoredRoom.numOfPeople, 4);
  assert.strictEqual(restoredRoom.desc, '需要儿童椅');
  assert.strictEqual(restoredRoom.currentSelectDate, '2026-10-12');
  assert.deepStrictEqual(restoredRoom.selectTimes, ['10:00~12:00']);
  assert.deepStrictEqual(restoredRoom.selectedAddons, [latestAddon], 'restore addon IDs from fresh catalog, not old prices or removed services');
  assert(calls.includes('coupons') && calls.includes('subscriptions') && calls.includes('addons'));
  assert.strictEqual(restoredRoom.selectedCoupon, null);
  assert.strictEqual(restoredRoom.usePoints, false);
  assert.strictEqual(restoredRoom.submitting, false);
  assert.strictEqual(MALL_NAV.takeCheckoutDraft('room_checkout', roomReturnOptions.mall_return_id), null);
  assert.deepStrictEqual(restoredRoom.restoreCheckoutDraft({ roomId: 'another-room', bookingSignature: JSON.stringify(roomProduct.selects), numOfPeople: 1, desc: 'wrong room' }), []);
  assert.strictEqual(restoredRoom.numOfPeople, 4);
  assert.strictEqual(restoredRoom.desc, '需要儿童椅');
  restoredRoom.restoreCheckoutDraft({ roomId: 'room-1', bookingSignature: JSON.stringify(roomProduct.selects), numOfPeople: 99, usePoints: true, submitting: true });
  assert.strictEqual(restoredRoom.numOfPeople, 4);
  assert.strictEqual(restoredRoom.usePoints, false);
  assert.strictEqual(restoredRoom.submitting, false);

  // Abandon hall checkout, then enter a new perler purchase without a return marker.
  reset();
  instance('ticket', { ticketCount: 4, ticketMode: 'hall', basePriceFen: 15200, isUpgradeMode: false }).goBuySubscription();
  const abandonedTicketIntent = assertMall('ticket_checkout', 1, 152, true);
  const abandonedTicketReturn = returnOptions(abandonedTicketIntent, '/pages/ticket/buy', { count: '4', mode: 'hall' });
  const newPerler = instance('ticket', { supportsStandardBenefits: true, supportsSubscription: false, isPerlerMode: true });
  await pages.ticket.onLoad.call(newPerler, { count: '1', mode: 'perler_day' });
  await flush();
  assert.strictEqual(newPerler.ticketMode, 'perler_day', 'unmarked fresh perler entry must not inherit abandoned hall mode');
  assert.strictEqual(newPerler.ticketCount, 1, 'unmarked fresh perler entry must not inherit abandoned hall count');
  const wrongIdPerler = instance('ticket', { supportsStandardBenefits: true, supportsSubscription: false });
  await pages.ticket.onLoad.call(wrongIdPerler, { count: '1', mode: 'perler_day', mall_return_id: 'wrong-id' });
  await flush();
  assert.strictEqual(wrongIdPerler.ticketMode, 'perler_day');
  assert.strictEqual(wrongIdPerler.ticketCount, 1);
  const genuineTicketReturn = instance('ticket', { supportsStandardBenefits: true, supportsSubscription: true });
  await pages.ticket.onLoad.call(genuineTicketReturn, abandonedTicketReturn);
  await flush();
  assert.strictEqual(genuineTicketReturn.ticketMode, 'hall', 'only the matching explicit marker restores the old draft');
  assert.strictEqual(genuineTicketReturn.ticketCount, 4, 'no/wrong marker did not consume the pending draft');

  // Same room is not enough: a new booking time must never inherit old remarks/addons.
  reset();
  room.goBuySubscription();
  const abandonedRoomIntent = assertMall('room_checkout', 2, 91, true);
  const abandonedRoomReturn = returnOptions(abandonedRoomIntent, '/pages/order/createOrder');
  const newRoomProduct = { ...roomProduct, selects: [['2026-10-13 14:00:00', '2026-10-13 16:00:00']] };
  const newRoomState = { currentRoom: roomProduct, currentSelectItem: newRoomProduct };
  const newRoomEntry = () => instance('room', {
    isNightOffpeak: false, $store: { state: newRoomState, dispatch: () => Promise.resolve() },
  });
  const ordinaryNewRoom = newRoomEntry();
  pages.room.onLoad.call(ordinaryNewRoom, {});
  await flush();
  assert.strictEqual(ordinaryNewRoom.numOfPeople, 2);
  assert.strictEqual(ordinaryNewRoom.desc, '');
  assert.deepStrictEqual(ordinaryNewRoom.selectedAddons, []);
  const mismatchedTimeReturn = newRoomEntry();
  pages.room.onLoad.call(mismatchedTimeReturn, abandonedRoomReturn);
  await flush();
  assert.strictEqual(mismatchedTimeReturn.currentSelectDate, '2026-10-13');
  assert.deepStrictEqual(mismatchedTimeReturn.selectTimes, ['14:00~16:00']);
  assert.strictEqual(mismatchedTimeReturn.numOfPeople, 2, 'same room with different times rejects old people count');
  assert.strictEqual(mismatchedTimeReturn.desc, '', 'same room with different times rejects old remarks');
  assert.deepStrictEqual(mismatchedTimeReturn.selectedAddons, [], 'same room with different times rejects old addons');
  const fallbackSignatureRoom = instance('room', {
    currentProduct: { object_id: 'room-1' }, $store: { state: newRoomState },
  });
  assert.strictEqual(fallbackSignatureRoom.getBookingSignature(), JSON.stringify(newRoomProduct.selects),
    'time signature follows the actual selected booking field, never quote data');

  // No synthetic counts or duplicate asset entry; retain WXML-safe bindings.
  const userText = fs.readFileSync(path.join(root, files.user), 'utf8');
  const userTemplate = userText.split('<script>')[0];
  assert(userTemplate.includes('我的权益'));
  assert.strictEqual((userTemplate.match(/@tap="goCardPack"/g) || []).length, 1);
  assert.strictEqual((userTemplate.match(/@tap="goCouponCenter"/g) || []).length, 1);
  const rightsSection = userTemplate.match(/<view class="surface-section rights-section">([\s\S]*?)<!-- 订单/)[1];
  assert(!/Count|couponAssetText/.test(rightsSection));
  for (const file of Object.values(files)) {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    assert(!text.includes('/pages/user/subscription/buy?'), file + ' has a legacy no-card-id buy entry');
    assert(!/卡券商城|看卡券/.test(text), file + ' has stale visible mall copy');
    const template = text.split('<script>')[0];
    assert(!/{{[^\n]*\{\s*\}/.test(template), file + ' has an object literal in interpolation');
    assert(!/:\s*(?:class|style)="[^"]*\w+\([^\"]*\)/.test(template), file + ' has a WXML-unsafe class/style function');
  }
  const roomBytes = fs.readFileSync(path.join(root, files.room));
  const roomText = roomBytes.toString('utf8');
  assert(roomText.includes('\r\n'));
  assert(!roomText.replace(/\r\n/g, '').includes('\n'), 'room checkout retains original CRLF');
  assert(!fs.readFileSync(path.join(root, files.ticket), 'utf8').includes('\r'), 'ticket retains original LF');
  console.log('mall_entries: actual-method entry gates, source/intents, points/claim routes, safe checkout return/drafts, WXML and original line endings passed');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
