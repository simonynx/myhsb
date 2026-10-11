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
const SUBSCRIPTION = moduleValue('utils/subscription.js', {formatDate: () => ''});
const PRESENTATION = moduleValue('utils/subscriptionPresentation.js', {SUBSCRIPTION});
const pending = [];
const navigation = [];
const toasts = [];
const events = [];
const mallIntents = [];
let throwOnFetch = false;
let navInfo = {statusBarHeight: 24, windowWidth: 375};
let capsule = {top: 32, height: 32, left: 278};
const Page = moduleValue('pages/user/subscription/my.vue', {
  SUBSCRIPTION, PRESENTATION, mapState: () => ({}),
  MALL_NAV: {
    openCardMall: options => {
      mallIntents.push(options);
      navigation.push(['switchTab', '/pages/voucher/voucher']);
    },
  },
  AUTH: {
    getUserSubscriptions: (token, tab) => {
      if (throwOnFetch) throw new Error('同步网络失败');
      return new Promise((resolve, reject) => pending.push({token, tab, resolve, reject}));
    },
    trackEvent: (event, token) => {events.push({event, token}); return Promise.resolve();},
  },
  uni: {
    navigateTo: options => navigation.push(['navigateTo', options.url]),
    switchTab: options => navigation.push(['switchTab', options.url]),
    showToast: options => toasts.push(options),
    getSystemInfoSync: () => navInfo,
    getMenuButtonBoundingClientRect: () => capsule,
  },
});
function instance() {
  return Object.assign(Page.data(), Page.methods, {token: 'existing-token'});
}
const now = Date.now();
const future = now + 10 * 86400000;
const hall = {name: '大厅卡', target_type: '1', total_limit: 12, validity_days: 30};
const room = {name: '包厢卡', target_type: '2', total_limit: 10, validity_days: 30,
  usable_rooms: [{object_id: 'r1', name: '小包厢'}]};
function card(template = hall, extra = {}) {
  return Object.assign({object_id: 's1', card_template: template, status: 1,
    remaining_limit: 6, expire_at: Math.floor(future / 1000)}, extra);
}
function testPresentation() {
  const vm = instance();
  const active = vm.decorateCard(card());
  assert(active.canUse);
  assert.strictEqual(active.ctaText, '去购大厅票');
  assert.strictEqual(active.unitText, PRESENTATION.buildCardView(hall).unitText);
  assert.strictEqual(active.validityText, PRESENTATION.buildCardView(hall).validityText);
  assert.deepStrictEqual(active.ruleLines, PRESENTATION.buildRuleLines(hall));
  assert.strictEqual(active.used_limit, 6);
  assert.strictEqual(active.usageBarStyle, 'width: 50%;');
  assert(active.cardClass.includes('hall-bg'));
  assert.strictEqual(active.restrictionText, PRESENTATION.buildCardView(hall).restrictionText,
    'hall account-sharing restriction remains visible');
  vm.goUse(active);
  assert.deepStrictEqual(navigation.pop(), ['navigateTo', '/pages/ticket/buy?count=1']);

  const ownedRoom = vm.decorateCard(card(room));
  assert.strictEqual(vm.getBgClass(card(room)), 'room-bg', 'raw card need not have target_type_num');
  assert(ownedRoom.cardClass.includes('room-bg'));
  assert.strictEqual(ownedRoom.ctaText, '去预约');
  assert(ownedRoom.importantRules.some(rule => rule.text.includes('本人及同行人的入场费')));
  assert(ownedRoom.importantRules.some(rule => rule.text.includes('闲时特惠小时默认不可抵')));
  assert(ownedRoom.importantRules.some(rule => rule.text.includes('适用房间：小包厢')));
  assert(ownedRoom.importantRules.some(rule => rule.text.includes('规则明确允许时除外；混合预约仅抵允许用卡的小时')));
  assert.strictEqual(ownedRoom.restrictionText, '', 'full visible room rules replace redundant summary');
  const roomWithEntry = Object.assign({}, room, {usage_rules: [{slot: 'room_hours'}, {slot: 'self_entry_fee', max_per_order: 1}]});
  const roomWithEntryView = vm.decorateCard(card(roomWithEntry));
  assert.strictEqual(roomWithEntryView.restrictionText, '');
  assert(roomWithEntryView.importantRules.some(rule => rule.text.includes('不抵同行入场费')));
  assert.strictEqual(roomWithEntryView.ctaText, '去预约');
  const originalRules = PRESENTATION.buildRuleLines;
  try {
    PRESENTATION.buildRuleLines = template => originalRules(template).filter(rule => !rule.text.includes('闲时'));
    assert.strictEqual(vm.decorateCard(card(room)).restrictionText, PRESENTATION.buildCardView(room).restrictionText,
      'retain summary if full room restrictions are unavailable');
  } finally {PRESENTATION.buildRuleLines = originalRules;}
  assert.deepStrictEqual(ownedRoom.ruleLines, PRESENTATION.buildRuleLines(room));
  assert.strictEqual(ownedRoom.importantRules.length + ownedRoom.secondaryRules.length, ownedRoom.ruleLines.length);
  assert.strictEqual(ownedRoom.detailsExpanded, false);
  vm.toggleDetails(ownedRoom);
  assert.strictEqual(ownedRoom.detailsExpanded, true);
  vm.goUse(ownedRoom);
  assert.deepStrictEqual(navigation.pop(), ['switchTab', '/pages/tabBar/appoint/appoint']);

  const entryOnly = Object.assign({}, hall, {usage_rules: [{slot: 'self_entry_fee', max_per_order: 1}]});
  const entryCard = vm.decorateCard(card(entryOnly, {status: '1'}));
  assert(entryCard.canUse);
  assert.strictEqual(entryCard.ctaText, '去预约', 'explicit entry-only rules must not infer a ticket CTA');
  assert(entryCard.importantRules.some(rule => rule.text.includes('不抵同行入场费')));
  vm.goUse(entryCard);
  assert.deepStrictEqual(navigation.pop(), ['switchTab', '/pages/tabBar/appoint/appoint']);
  const disabled = Object.assign({}, hall, {usage_rules: [{slot: 'ticket', enabled: false}]});
  assert.strictEqual(vm.decorateCard(card(disabled)).canUse, false);

  const mixed = Object.assign({}, room, {usage_rules: [{slot: 'room_hours'}, {slot: 'ticket'}]});
  assert.strictEqual(vm.decorateCard(card(mixed)).ctaText, '去购大厅票');
  assert(vm.decorateCard(card()).importantRules.some(rule => rule.text.includes('共用额度')));
  vm.goBuy();
  assert.deepStrictEqual(navigation.pop(), ['switchTab', '/pages/voucher/voucher']);
  assert.deepStrictEqual(mallIntents.pop(), {source: 'my_cards'});
  assert.strictEqual(events[0].token, vm.token);
}
function testDatesAndCta() {
  const vm = instance();
  assert.strictEqual(vm.parseTimestamp(Math.floor(future / 1000)), Math.floor(future / 1000) * 1000);
  assert.strictEqual(vm.parseTimestamp(String(future)), future);
  assert.strictEqual(vm.parseTimestamp(future), future);
  const local = new Date(2035, 0, 2, 3, 4, 5, 123).getTime();
  assert.strictEqual(vm.parseTimestamp('2035-01-02 03:04:05.123456'), local);
  assert.strictEqual(vm.parseTimestamp('2035/01/02 03:04:05.123'), local);
  assert.strictEqual(vm.parseTimestamp('2035-01-02T03:04:05.123'), local);
  assert.strictEqual(vm.parseTimestamp('2035-01-02T03:04:05+08:00'), Date.parse('2035-01-02T03:04:05+08:00'));
  assert.strictEqual(vm.parseTimestamp('2035-01-02T03:04:05Z'), Date.parse('2035-01-02T03:04:05Z'));
  ['2035-02-31 10:00:00', '2035-13-02', '2035-01-02 25:00', 'garbage', '', null, Infinity, 0].forEach(value => {
    assert.strictEqual(vm.parseTimestamp(value), null, String(value));
  });
  assert.strictEqual(vm.formatTimestamp(local), '2035.01.02 03:04');
  assert.strictEqual(vm.getAvailability(card(hall, {expire_at: now}), now), 'expired');
  const blocked = [
    {expire_at: now - 1000}, {expire_at: Math.floor((now - 1000) / 1000)},
    {status: '3'}, {status: '2'}, {remaining_limit: 0},
    {effective_at: future - 1000}, {effective_at: Math.floor((future - 1000) / 1000)},
    {effective_at: '2099-01-01 00:00:00'}, {expire_at: '2020-01-01 00:00:00'},
    {expire_at: 'invalid'}, {expire_at: null}, {effective_at: 'invalid'},
    {start_at: Math.floor((future - 1000) / 1000)}, {start_at: future - 1000},
    {start_at: '2099-01-01 00:00:00'}, {start_at: 'invalid'},
    {start_at: 'invalid', effective_at: now - 1000},
    {start_at: '', effective_at: now - 1000},
    {start_at: future - 1000, effective_at: now - 1000},
  ];
  blocked.forEach(extra => {
    const raw = card(hall, extra);
    const view = vm.decorateCard(raw);
    assert.strictEqual(view.canUse, false, JSON.stringify(extra));
    assert(!view.cardClass.includes('hall-bg'));
    const count = navigation.length;
    vm.goUse(raw);
    assert.strictEqual(navigation.length, count, 'blocked tap must not navigate');
  });
  assert(vm.decorateCard(card(hall, {status: 2})).canRepurchase);
  assert(vm.decorateCard(card(hall, {expire_at: now - 1000})).canRepurchase);
  assert.strictEqual(vm.decorateCard(card(hall, {effective_at: future - 1000})).canRepurchase, false);
  assert(vm.decorateCard(card(hall, {effective_at: now - 1000})).canUse);
  const apiFuture = vm.decorateCard(card(hall, {start_at: Math.floor((future - 1000) / 1000)}));
  assert.strictEqual(apiFuture.statusText, '尚未生效');
  assert.strictEqual(apiFuture.effectiveText, vm.formatTimestamp(vm.parseTimestamp(Math.floor((future - 1000) / 1000))) + ' 起可用');
  const apiMalformed = vm.decorateCard(card(hall, {start_at: 'invalid', effective_at: now - 1000}));
  assert.strictEqual(apiMalformed.statusText, '有效状态待确认');
  assert.strictEqual(apiMalformed.effectiveText, '');
  const aliasFuture = vm.decorateCard(card(hall, {effective_at: future - 1000}));
  assert.strictEqual(aliasFuture.effectiveText, vm.formatTimestamp(future - 1000) + ' 起可用');
  assert.strictEqual(vm.decorateCard(card(hall, {start_at: null, effective_at: future - 1000})).effectiveText,
    aliasFuture.effectiveText, 'null/missing primary permits compatibility alias');
  const primaryFuture = vm.decorateCard(card(hall, {start_at: future - 2000, effective_at: future - 1000}));
  assert.strictEqual(primaryFuture.effectiveText, vm.formatTimestamp(future - 2000) + ' 起可用', 'future text uses primary field');
  const primaryPast = vm.decorateCard(card(hall, {start_at: now - 1000, effective_at: future - 1000}));
  assert(primaryPast.canUse, 'past primary wins over future alias');
  assert.strictEqual(primaryPast.effectiveText, '');
  assert(vm.decorateCard(card(hall, {start_at: now - 1000, effective_at: 'invalid'})).canUse,
    'valid primary ignores malformed alias');
  assert.strictEqual(vm.decorateCard(card(hall, {expire_at: now + 60000})).expire_warning, '不足24小时到期');
  assert(vm.decorateCard(card(hall, {expire_at: now + 3 * 86400000})).expire_warning.includes('天到期'));
  assert.strictEqual(vm.decorateCard(card(hall, {remaining_limit: -2})).remaining_limit, 0);
  const aboutToExpire = vm.decorateCard(card(hall, {expire_at: now + 60000}));
  const originalNow = Date.now;
  try {
    Date.now = () => now + 60001;
    vm.list = [aboutToExpire];
    vm.goUse(aboutToExpire);
    assert.strictEqual(vm.list[0].canUse, false, 'recheck stale UI at tap time');
    assert(vm.list[0].canRepurchase);
  } finally {Date.now = originalNow;}
}
async function testRequests() {
  const vm = instance();
  const first = vm.fetchData();
  await Promise.resolve();
  const second = vm.switchTab(2);
  await Promise.resolve();
  const firstPending = pending.shift(), secondPending = pending.shift();
  assert.strictEqual(firstPending.token, 'existing-token');
  assert.strictEqual(secondPending.tab, 2);
  secondPending.resolve({_status: 0, data: [card(room, {object_id: 'new', status: 2})]});
  await second;
  firstPending.resolve({_status: 0, data: [card(hall, {object_id: 'stale'})]});
  await first;
  assert.strictEqual(vm.list[0].object_id, 'new');
  assert.strictEqual(vm.loading, false);

  const failure = vm.fetchData(); await Promise.resolve();
  pending.shift().reject(new Error('网络不可用')); await failure;
  assert.strictEqual(vm.loadError, '网络不可用');
  assert.strictEqual(vm.loading, false);
  assert.deepStrictEqual(vm.list, []);
  const retry = vm.fetchData(); await Promise.resolve();
  assert.strictEqual(vm.loadError, '');
  pending.shift().resolve({_status: 0, data: []}); await retry;
  assert.deepStrictEqual(vm.list, []);
  assert.strictEqual(vm.loadError, '');

  const old = vm.fetchData(); await Promise.resolve();
  const fresh = vm.switchTab(3); await Promise.resolve();
  pending.shift().reject(new Error('stale failure')); await old;
  assert.strictEqual(vm.loading, true);
  assert.strictEqual(vm.loadError, '');
  pending.shift().resolve({_status: 1, _reason: '服务暂不可用'}); await fresh;
  assert.strictEqual(vm.loadError, '服务暂不可用');
  const malformed = vm.fetchData(); await Promise.resolve();
  pending.shift().resolve({_status: 0, data: {results: []}}); await malformed;
  assert(vm.loadError, 'malformed payload must be error, not empty wallet');
  throwOnFetch = true;
  await vm.fetchData();
  assert.strictEqual(vm.loading, false);
  assert.strictEqual(vm.loadError, '同步网络失败');
  throwOnFetch = false;

  // Returning to the original tab must not let its previous request win.
  vm.currentTab = 1;
  const originalTab = vm.fetchData(); await Promise.resolve();
  const middleTab = vm.switchTab(2); await Promise.resolve();
  const returnedTab = vm.switchTab(1); await Promise.resolve();
  const originalRequest = pending.shift(), middleRequest = pending.shift(), returnedRequest = pending.shift();
  returnedRequest.resolve({_status: 0, data: [card(hall, {object_id: 'returned'})]}); await returnedTab;
  originalRequest.resolve({_status: 0, data: [card(hall, {object_id: 'old-original'})]}); await originalTab;
  middleRequest.reject(new Error('old middle error')); await middleTab;
  assert.strictEqual(vm.list[0].object_id, 'returned');
  assert.strictEqual(vm.loadError, '');

  const away = vm.fetchData(); await Promise.resolve();
  Page.onUnload.call(vm);
  pending.shift().resolve({_status: 0, data: [card()]}); await away;
  assert.deepStrictEqual(vm.list, [], 'unloaded page cannot accept responses');
  const back = Page.onShow.call(vm); await Promise.resolve();
  const refresh = pending.shift();
  assert(refresh, 'returning from checkout refreshes quota');
  refresh.resolve({_status: 0, data: []});
  await back; await Promise.resolve();
}
function testNavigationAndTemplate() {
  const vm = instance();
  vm.initNavigation();
  assert.strictEqual(vm.navStyle, 'padding-top: 24px;');
  assert(vm.navContentStyle.includes('height: 48px;'));
  assert(vm.navContentStyle.includes('padding-right: 105px;'));
  assert.strictEqual(vm.navPlaceholderStyle, 'height: 72px;');
  capsule = null;
  vm.initNavigation();
  assert(vm.navContentStyle.includes('height: 44px;'));
  navInfo = {statusBarHeight: 0, windowWidth: 375};
  vm.initNavigation();
  assert.strictEqual(vm.navPlaceholderStyle, 'height: 44px;');
  const source = fs.readFileSync(path.join(root, 'pages/user/subscription/my.vue'), 'utf8');
  const template = source.match(/<template>([\s\S]*?)<\/template>/)[1];
  assert(!/:\s*(?:class|style)="[^"\n]*\w+\([^"\n]*"/.test(template), 'no function calls in class/style bindings');
  assert(!/\{\{[^\n]*\{\}/.test(template), 'no object literal in interpolation');
  assert(source.includes("import PRESENTATION from '../../../utils/subscriptionPresentation.js'"));
  assert(!source.includes('已自动应用') && !source.includes('自动抵扣'));
  assert(!source.includes('\r'), 'preserve original LF newlines');
  assert(source.endsWith('\n'));
}
(async () => {
  testPresentation();
  testDatesAndCta();
  await testRequests();
  testNavigationAndTemplate();
  console.log('Owned subscriptions: presentation, validity/CTA guards, checkout routes, async races, retry and navigation layout passed');
})().catch(error => {console.error(error); process.exitCode = 1;});
