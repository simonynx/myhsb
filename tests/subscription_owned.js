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
    'hall account-sharing restriction remains available unchanged');
  assert.strictEqual(active.restrictionSummary, '持卡账号下单，其他账号不可独立用卡');
  assert(active.visibleRules.some(rule => /大厅按人次.*同行每张票扣1次/.test(rule.text)));
  assert(active.visibleRules.some(rule => /扣1次抵本人入场费.*同行另付/.test(rule.text)));
  assert(active.mixedRightsText.includes('大厅票 / 包厢入场费二选一，共用额度'));
  assert(active.mixedRightsText.includes('本卡每单仅选一种权益'));
  assert.strictEqual(active.detailsExpanded, false);
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
  assert.strictEqual(ownedRoom.restrictionText, '', 'full room rules remain available without redundant summary');
  assert.strictEqual(ownedRoom.restrictionSummary, '');
  assert.strictEqual(ownedRoom.mixedRightsText, '', 'room-only card must not promise entry rights');
  assert(ownedRoom.visibleRules.some(rule => /只抵房费.*本人及同行入场费另付/.test(rule.text)));
  assert(ownedRoom.visibleRules.some(rule => /适用房间：小包厢/.test(rule.text)));
  assert.strictEqual(ownedRoom.visibleRules.filter(rule => /闲时/.test(rule.text)).length, 1);
  assert(ownedRoom.visibleRules.some(rule => /闲时特惠默认不可抵.*规则允许除外.*混合预约仅抵允许用卡的小时/.test(rule.text)));
  const roomWithEntry = Object.assign({}, room, {usage_rules: [{slot: 'room_hours'}, {slot: 'self_entry_fee', max_per_order: 1}]});
  const roomWithEntryView = vm.decorateCard(card(roomWithEntry));
  assert.strictEqual(roomWithEntryView.restrictionText, '');
  assert(roomWithEntryView.importantRules.some(rule => rule.text.includes('不抵同行入场费')));
  assert.strictEqual(roomWithEntryView.ctaText, '去预约');
  assert.strictEqual(roomWithEntryView.mixedRightsText, '房费 / 包厢入场费二选一，共用额度；本卡每单仅选一种权益');
  assert(roomWithEntryView.visibleRules.some(rule => /抵本人入场费.*同行另付/.test(rule.text)));
  assert(!roomWithEntryView.visibleRules.some(rule => /本人及同行入场费另付/.test(rule.text)), 'entry right is not falsely removed');
  const originalRules = PRESENTATION.buildRuleLines;
  try {
    PRESENTATION.buildRuleLines = template => originalRules(template).filter(rule => !rule.text.includes('闲时'));
    const incomplete = vm.decorateCard(card(room));
    assert.strictEqual(incomplete.restrictionText, PRESENTATION.buildCardView(room).restrictionText,
      'retain summary if full room restrictions are unavailable');
    assert.strictEqual(incomplete.restrictionSummary, incomplete.restrictionText, 'fallback restrictions stay on the collapsed face');
  } finally {PRESENTATION.buildRuleLines = originalRules;}
  assert.deepStrictEqual(ownedRoom.ruleLines, PRESENTATION.buildRuleLines(room));
  assert.strictEqual(ownedRoom.importantRules.length + ownedRoom.secondaryRules.length, ownedRoom.ruleLines.length);
  assert.strictEqual(ownedRoom.detailsExpanded, false);
  vm.toggleDetails(ownedRoom);
  assert.strictEqual(ownedRoom.detailsExpanded, true);
  vm.toggleDetails(ownedRoom);
  assert.strictEqual(ownedRoom.detailsExpanded, false);
  assert.strictEqual(vm.decorateCard(ownedRoom).detailsExpanded, false, 'refreshed cards start collapsed');
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
  const templates = [hall, room, roomWithEntry, entryOnly, disabled, mixed,
    {...hall, purchase_limit_per_user: 2, usage_rules: [{slot: 'ticket', max_per_order: 3}]},
    {...hall, usage_rules: [{slot: 'ticket', max_per_order: 1}]},
    {...hall, usage_rules: [{slot: 'self_entry_fee', max_per_order: 0}]},
    {...hall, usage_rules: [{slot: 'self_entry_fee', max_per_order: 3}]},
    {...room, usable_rooms: []}, {...room, usable_rooms: ['r1']},
    {...room, usage_rules: [{slot: 'room_hours', max_per_order: 6}, {slot: 'ticket'}, {slot: 'self_entry_fee', max_per_order: 3}], stackable: false},
  ];
  for (const template of templates) {
    const view = vm.decorateCard(card(template));
    const helper = PRESENTATION.buildCardView(template);
    for (const field of ['badgeText', 'unitText', 'usageText', 'validityText']) {
      assert.strictEqual(view[field], helper[field], 'unchanged authoritative helper field: ' + field);
    }
    assert.deepStrictEqual(view.ruleLines, PRESENTATION.buildRuleLines(template));
    assert.deepStrictEqual(view.importantRules.concat(view.secondaryRules).map(rule => rule.key).sort(),
      helper.ruleLines.map(rule => rule.key).sort(), 'all full rules retained without duplication');
    assert.strictEqual(view.detailsExpanded, false, 'all rights configurations default closed');
    for (const rule of helper.ruleLines.filter(rule => /大厅购票|房费|入场费|闲时|适用房间|同一订单不可/.test(rule.text))) {
      assert(view.importantRules.some(item => item.key === rule.key), 'must-know policy stays important: ' + rule.text);
      if (/^(大厅购票与包厢入场抵扣共用额度|房费与入场费为二选一用途)/.test(rule.text)) assert(view.mixedRightsText.includes('共用额度'));
      else assert(view.visibleRules.some(item => item.key === rule.key), 'short visible filter retains the right: ' + rule.text);
    }
    const rights = [SUBSCRIPTION.SLOT_ROOM_HOURS, SUBSCRIPTION.SLOT_TICKET, SUBSCRIPTION.SLOT_SELF_ENTRY_FEE]
      .filter(slot => PRESENTATION.presentationRule(template, slot));
    assert.strictEqual(!!view.mixedRightsText, rights.length > 1);
    if (rights.length > 1) {
      assert(view.mixedRightsText.includes('本卡每单仅选一种权益'));
      assert(!view.visibleRules.some(rule => /共用额度|同一卡包每单/.test(rule.text)), 'mixed rights warning appears only once');
      assert(!view.combinationText.includes('同一卡包每单'));
    }
    for (const rule of view.visibleRules) assert(!view.detailRules.some(item => item.key === rule.key), 'no repeated expanded rule');
    assert.strictEqual(new Set(view.visibleRules.map(rule => rule.key)).size, view.visibleRules.length);
    if (template.stackable === false) assert(view.visibleRules.some(rule => /不可与其他卡包/.test(rule.text)));
  }
  const entryMany = vm.decorateCard(card({...hall, usage_rules: [{slot: 'self_entry_fee', max_per_order: 3}]}));
  assert.strictEqual(entryMany.mixedRightsText, '');
  assert(entryMany.visibleRules.some(rule => /最多抵3人，以结算页为准/.test(rule.text)));
  assert(!entryMany.visibleRules.some(rule => /同行另付/.test(rule.text)), 'multi-person entry rights are not reduced to self-only');
  const mixedView = vm.decorateCard(card(mixed));
  assert(mixedView.restrictionSummary.includes('其他账号不可独立用卡'), 'room/hall mixture still carries hall account restriction');
  assert(mixedView.visibleRules.some(rule => /大厅按人次/.test(rule.text)));
  assert(mixedView.visibleRules.some(rule => /本人及同行入场费另付/.test(rule.text)), 'hall tickets do not imply room entry benefits');
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
  const actualExpiry = vm.decorateCard(card({...hall, validity_days: 1}, {expire_at: future}));
  assert.strictEqual(actualExpiry.formatted_expire, vm.formatTimestamp(future), 'owned expiry comes from the actual subscription, not template days');
  assert.strictEqual(actualExpiry.validityText, '1天有效', 'template validity is retained separately for expanded rules');
  const unknownExpiry = vm.decorateCard(card(hall, {expire_at: null}));
  assert.strictEqual(unknownExpiry.formatted_expire, '待确认');
  assert.strictEqual(unknownExpiry.statusText, '有效状态待确认');
  assert.strictEqual(unknownExpiry.canUse, false);
  assert.strictEqual(unknownExpiry.canRepurchase, false, 'unknown expiry is not relabelled as expired');
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
  assert(!/linear-gradient/i.test(source));
  for (const color of ['#fbf6ee', '#fff1e3', '#eee5d8', '#a65037']) assert(source.includes(color));
  const details = template.match(/<view class="card-details" v-if="sub.detailsExpanded">([\s\S]*?)<\/view>/)[1];
  const collapsed = template.replace(details, '');
  const positions = ['class="quota-section"', 'class="expiry-section"', 'class="card-actions"', 'class="card-rules"']
    .map(marker => template.indexOf(marker));
  assert(positions.every(position => position >= 0));
  assert(positions.every((position, index) => !index || position > positions[index - 1]), 'quota, expiry and use action precede policies');
  for (const field of ['formatted_expire', 'expire_warning', 'effectiveText', 'statusText', 'remaining_limit', 'ctaText', 'restrictionSummary', 'visibleRules', 'mixedRightsText']) {
    assert(collapsed.includes('sub.' + field), 'must-know owned field always visible: ' + field);
  }
  for (const field of ['usageText', 'detailRules', 'combinationText', 'validityText']) {
    assert(details.includes('sub.' + field), 'secondary field still available: ' + field);
    assert(!collapsed.includes('sub.' + field), 'secondary field defaults closed: ' + field);
  }
  for (const field of ['restrictionText', 'importantRules', 'secondaryRules', 'ruleLines']) {
    assert(!template.includes('sub.' + field), 'no repeated long helper section: ' + field);
  }
  assert(template.includes('<text>使用规则</text>'));
  assert(template.includes('@tap="goUse(sub)"') && template.includes('v-if="sub.canUse"'));
  assert(collapsed.includes('抵扣以本单规则为准'), 'use CTA does not promise automatic benefits');
  assert(!/font-size:\s*(?:1\d|2[0-3])rpx/.test(source), 'text stays at least 24rpx');
  for (const selector of ['back-btn', 'tab-item', 'retry-btn', 'details-toggle', 'use-btn', 'repurchase-btn', 'buy-more-btn']) {
    assert(new RegExp('\\.' + selector + '\\s*\\{[^}]*min-height:\\s*76rpx').test(source), 'tap target is at least 76rpx: ' + selector);
  }
}
(async () => {
  testPresentation();
  testDatesAndCta();
  await testRequests();
  testNavigationAndTemplate();
  console.log('Owned subscriptions: presentation, validity/CTA guards, checkout routes, async races, retry and navigation layout passed');
})().catch(error => {console.error(error); process.exitCode = 1;});
