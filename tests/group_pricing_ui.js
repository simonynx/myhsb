/* Run: node tests/group_pricing_ui.js
 * Execute the actual Vue computed/method functions and current offpeak module in memory.
 * No generated helper copies, network, backend writes, or third-party dependencies.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const offpeakFile = path.join(ROOT, 'utils/offpeak.js');
const offpeakContext = { module: { exports: {} } };
vm.runInNewContext(fs.readFileSync(offpeakFile, 'utf8').replace('export default', 'module.exports ='), offpeakContext, { filename: offpeakFile });
const OFFPEAK = offpeakContext.module.exports;
const tests = [];
const test = (name, fn) => tests.push({ name, fn });
const plain = value => JSON.parse(JSON.stringify(value));

function loadPage(name, authOverrides = {}) {
    const file = path.join(ROOT, 'pages/group', name + '.vue');
    const source = fs.readFileSync(file, 'utf8');
    const script = source.match(/<script>([\s\S]*?)<\/script>/)[1]
        .replace(/^import .*;\s*$/gm, '').replace('export default', 'module.exports =');
    const calls = [];
    const AUTH = Object.assign({ trackEvent: () => Promise.resolve() }, authOverrides);
    const context = {
        module: { exports: {} }, OFFPEAK, AUTH,
        mapState: () => ({}), toTimestamp: value => new Date(value).getTime(), PLATFORM: {},
        uni: {
            showToast: value => calls.push(['toast', value]),
            showLoading: value => calls.push(['loading', value]),
            hideLoading: () => calls.push(['hideLoading']),
        },
        setInterval: () => 1, clearInterval: () => {}, setTimeout: () => 1,
    };
    vm.runInNewContext(script, context, { filename: file });
    return { component: context.module.exports, source, AUTH, calls };
}

function instance(page, state = {}) {
    const component = page.component;
    const result = Object.assign(component.data(), { token: 'test-token', userInfo: null }, state);
    result.$nextTick = callback => Promise.resolve().then(callback);
    Object.entries(component.computed).forEach(([name, getter]) => {
        Object.defineProperty(result, name, { get: () => getter.call(result) });
    });
    Object.entries(component.methods).forEach(([name, fn]) => { result[name] = fn.bind(result); });
    return result;
}

const createPage = loadPage('create');
const detailPage = loadPage('detail');
const room = {
    object_id: 'room-current', name: 'Current room', image1: 'current.jpg',
    price_per_hour: 3000, price_per_person: 1000,
    offpeak_rules: [{ label: '午后闲时', weekdays: [1, 2, 3, 4, 5], hour_start: 10, hour_end: 17, price_per_hour: 2100 }],
};
const createState = overrides => Object.assign({
    roomId: room.object_id, currentRoom: room, pricingReady: true,
    date: '2026-10-12', beginTime: '14:00', endTime: '20:00', maxMembers: 4,
    groupDiscountPercent: 90, nowTimestamp: new Date('2026-10-01T00:00:00').getTime(),
}, overrides);

function assertBill(bill, expectedTotal, expectedRows, expectedPerson, expectedDeduction) {
    const amounts = plain(bill.roomRows.map(row => row.amountFen));
    assert.deepEqual(amounts, expectedRows);
    assert.equal(bill.personFen, expectedPerson);
    assert.equal(bill.deductionFen, expectedDeduction);
    assert.equal(amounts.reduce((sum, fee) => sum + fee, 0) + bill.personFen - bill.deductionFen, expectedTotal);
    bill.roomRows.forEach(row => {
        assert.equal(Math.round(Number(row.amountYuan) * 100), row.amountFen);
        assert.doesNotMatch(row.formula, /均价|全包|低至|NaN|undefined/);
    });
    assert.doesNotMatch(bill.savingsLabel, /80折|85折|90折/);
    assert.equal(Math.round(Number(bill.personYuan) * 100), expectedPerson);
}

const createCases = [
    {
        name: 'mixed room segments: offpeak wins, savings already included',
        overrides: {}, total: 19300, original: 22000, rows: [6300, 9000], person: 4000,
        deduction: 0, savings: 2700, offpeak: true,
    },
    {
        name: 'whole selected range offpeak, not a whole-order badge',
        overrides: { beginTime: '10:00', endTime: '12:00', maxMembers: 2 },
        total: 6200, original: 8000, rows: [4200], person: 2000,
        deduction: 0, savings: 1800, offpeak: true,
    },
    {
        name: 'group offer wins: market room fee minus one group deduction',
        overrides: { groupDiscountPercent: 70 }, total: 15400, original: 22000,
        rows: [18000], person: 4000, deduction: 6600, savings: 6600, offpeak: false,
    },
    {
        name: 'equal offers use group offer, matching backend strict comparison',
        overrides: {
            currentRoom: { price_per_hour: 5000, price_per_person: 1000,
                offpeak_rules: [{ label: '闲时', weekdays: [1], hour_start: 10, hour_end: 17, price_per_hour: 3800 }] },
            beginTime: '10:00', endTime: '12:00', maxMembers: 2, groupDiscountPercent: 80,
        },
        total: 9600, original: 12000, rows: [10000], person: 2000,
        deduction: 2400, savings: 2400, offpeak: false,
    },
    {
        name: 'Sunday does not inherit weekday offpeak price',
        overrides: { date: '2026-10-11', beginTime: '10:00', endTime: '12:00', maxMembers: 2, groupDiscountPercent: 100 },
        total: 8000, original: 8000, rows: [6000], person: 2000,
        deduction: 0, savings: 0, offpeak: false,
    },
    {
        name: 'group price rounds up to fen without rounding the displayed discount',
        overrides: {
            currentRoom: { price_per_hour: 3333, price_per_person: 555 }, beginTime: '10:00', endTime: '11:00',
            maxMembers: 3, groupDiscountPercent: 85,
        },
        total: 4249, original: 4998, rows: [3333], person: 1665,
        deduction: 749, savings: 749, offpeak: false,
    },
    {
        name: 'zero person fee remains explicit',
        overrides: { currentRoom: Object.assign({}, room, { price_per_person: 0 }) },
        total: 15300, original: 18000, rows: [6300, 9000], person: 0,
        deduction: 0, savings: 2700, offpeak: true,
    },
    {
        name: 'more members can make the group offer cheaper',
        overrides: { maxMembers: 20 }, total: 34200, original: 38000,
        rows: [18000], person: 20000, deduction: 3800, savings: 3800, offpeak: false,
    },
];
createCases.forEach(c => test(c.name, () => {
    const state = instance(createPage, createState(c.overrides));
    assert.equal(state.baseCostFen, c.total);
    assert.equal(state.groupPricing.originalCost, c.original);
    assert.equal(state.groupPricing.offpeakApplied, c.offpeak);
    assert.equal(state.pricingBill.savingsFen, c.savings);
    assert.equal(state.pricingBill.originalYuan, (c.original / 100).toFixed(2));
    assertBill(state.pricingBill, c.total, c.rows, c.person, c.deduction);
    assert.ok(state.pricingBill.contextText.includes(state.date));
    assert.ok(state.pricingBill.contextText.includes(state.beginTime + '–' + state.endTime));
    if (c.offpeak) {
        assert.equal(state.pricingBill.savingsLabel, '闲时优惠（已计入房费）');
        assert.match(state.pricingBill.savingsText, /^已省 ¥/);
    } else if (c.savings) {
        assert.match(state.pricingBill.savingsText, /^-¥/);
        assert.ok(state.pricingBill.savingsLabel.includes(state.groupDiscountPercent / 10 + '折'));
    }
}));

test('non-divisible segments never use a rounded average; server initiator remainder reconciles', () => {
    const state = instance(createPage, createState({
        currentRoom: {
            price_per_hour: 3333, price_per_person: 444,
            offpeak_rules: [{ label: '午后闲时', weekdays: [1], hour_start: 14, hour_end: 15, price_per_hour: 1001 }],
        },
        endTime: '17:00', maxMembers: 3, memberDiscountPercent: 80,
    }));
    // Independent: 1001 + 3333*2 + 444*3 = 8999, not floor(7667/3)*3 + 1332.
    assert.equal(state.baseCostFen, 8999);
    assertBill(state.pricingBill, 8999, [1001, 6666], 1332, 0);
    state.initiatorInputYuan = state.basePerPersonYuan;
    assert.equal(state.initiatorInputYuan, '30.00');
    assert.equal(state.memberPriceFen, 3000);
    assert.equal(state.initiatorShareFen, 2999);
    assert.equal(state.memberDiscountAmount, 599);
    assert.equal(state.actualInitiatorPaidFen, 2400);
    assert.equal(state.initiatorShareFen + state.memberPriceFen * 2, 8999);
    assert.equal(state.actualInitiatorPaidFen + state.memberDiscountAmount + state.memberPriceFen * 2, 8999);
    assert.equal(state.memberDiscountText, '8折');
    state.handleSubmit();
    assert.deepEqual(plain(state._pendingSubmitData), {
        room_id: 'room-current', date: '2026-10-12', begin_time: '14:00', end_time: '17:00',
        max_members: 3, price_per_person: 3000, note: '',
    });
});

test('manual subsidy preserves member-price rounding and submitted fields', () => {
    const state = instance(createPage, createState({ initiatorInputYuan: '100.00', initiatorManuallyChanged: true, note: ' hello ' }));
    assert.equal(state.memberPriceFen, 3100);
    assert.equal(state.initiatorShareFen, 10000);
    assert.equal(state.initiatorShareFen + state.memberPriceFen * 3, 19300);
    state.handleSubmit();
    assert.equal(state._pendingSubmitData.price_per_person, 3100);
    assert.equal(state._pendingSubmitData.note, 'hello');
});

const groupFixture = overrides => Object.assign({
    object_id: 'group-id', room, date: '2026-10-12', begin_time: '14:00', end_time: '20:00',
    duration: 6, max_members: 4, room_hour_price: 3000, room_person_price: 1000,
    room_hour_cost: 18000, room_person_cost: 4000, original_cost: 22000, base_cost: 19300,
    group_discount: 90, group_discount_amount: 2700, price_per_person: 4800,
    initiator_base: 4900, member_discount: 80, member_discount_amount: 979, initiator_paid: 3921,
    offpeak_applied: true, offpeak_room_fee: 15300, offpeak_hour_price: 2550, offpeak_label: '午后闲时',
    offpeak_segments: [
        { start: 14, end: 17, price: 2100, label: '午后闲时' },
        { start: 17, end: 20, price: 3000, label: '' },
    ], status: 'open', members: [],
}, overrides);

test('detail consumes backend segments and labels, not the room current rules', () => {
    const group = groupFixture({ room: Object.assign({}, room, { offpeak_rules: [] }) });
    const state = instance(detailPage, { group });
    assertBill(state.pricingBill, 19300, [6300, 9000], 4000, 0);
    assert.equal(state.pricingBill.totalFen, 19300);
    assert.equal(state.pricingBill.savingsLabel, '闲时优惠（已计入房费）');
    assert.equal(state.pricingBill.savingsText, '已省 ¥27.00');
    assert.equal(state.pricingBill.roomRows[0].originalYuan, '90.00');
    assert.equal(state.pricingBill.roomRows[1].originalYuan, '');
    assert.match(state.pricingBill.note, /午后闲时/);
    assert.equal(state.initiatorDiscountLabel, '会员优惠（8折） · 仅发起人');
    assert.equal(state.initiatorAmountLabel, '发起人应付');
    state.group.initiator_payment_status = 'paid';
    assert.equal(state.initiatorAmountLabel, '发起人已付');
});

test('legacy detail without offpeak fields retains group amount and correct 8折 label', () => {
    const state = instance(detailPage, { group: {
        date: '2026-10-12', begin_time: '14:00', end_time: '20:00', duration: 6, max_members: 4,
        room_hour_price: 3000, room_person_price: 1000, base_cost: 17600,
        group_discount: 80, group_discount_amount: 4400,
    } });
    assertBill(state.pricingBill, 17600, [18000], 4000, 4400);
    assert.equal(state.pricingBill.totalYuan, '176.00');
    assert.equal(state.pricingBill.savingsLabel, '组局优惠（8折）');
    assert.equal(state.pricingBill.savingsText, '-¥44.00');
});

test('legacy detail without base_cost falls back to room_cost, including zero', () => {
    const state = instance(detailPage, { group: {
        room, duration: 2, max_members: 2, room_cost: 6400, group_discount: 80, group_discount_amount: 1600,
    } });
    assertBill(state.pricingBill, 6400, [6000], 2000, 1600);
    state.group = { room_hour_price: 0, room_person_price: 0, duration: 2, max_members: 2, room_cost: 0 };
    assertBill(state.pricingBill, 0, [0], 0, 0);
    assert.equal(state.pricingBill.totalYuan, '0.00');
});

test('legacy offpeak with no segments uses exact room total, never truncated hourly mean', () => {
    const state = instance(detailPage, { group: groupFixture({
        duration: 3, begin_time: '14:00', end_time: '17:00', max_members: 3,
        room_hour_price: 3333, room_hour_cost: 9999, room_person_price: 444, room_person_cost: 1332,
        original_cost: 11331, base_cost: 8999, group_discount_amount: 2332,
        offpeak_room_fee: undefined, offpeak_hour_price: 2555, offpeak_segments: undefined,
    }) });
    assertBill(state.pricingBill, 8999, [7667], 1332, 0);
    assert.match(state.pricingBill.segmentNote, /未提供完整分段单价/);
    assert.doesNotMatch(state.pricingBill.roomRows[0].formula, /25.55|\/小时/);
});

test('incomplete or inconsistent segment metadata falls back instead of showing false arithmetic', () => {
    const state = instance(detailPage, { group: groupFixture({ offpeak_segments: [{ start: 14, end: 17, price: 2100 }] }) });
    assertBill(state.pricingBill, 19300, [15300], 4000, 0);
    state.group.offpeak_segments = [null];
    assertBill(state.pricingBill, 19300, [15300], 4000, 0);
    state.group.offpeak_segments = [{ start: 10, end: 13, price: 2100 }, { start: 13, end: 16, price: 3000 }];
    assertBill(state.pricingBill, 19300, [15300], 4000, 0);
});

test('detail ignores unused offpeak metadata when group offer wins', () => {
    const state = instance(detailPage, { group: groupFixture({ offpeak_applied: false, base_cost: 17600, group_discount: 80, group_discount_amount: 4400 }) });
    assertBill(state.pricingBill, 17600, [18000], 4000, 4400);
    assert.equal(state.pricingBill.savingsLabel, '组局优惠（8折）');
    assert.doesNotMatch(state.pricingBill.note, /午后闲时/);
});

test('detail uses authoritative totals even if old discount amount is stale', () => {
    const state = instance(detailPage, { group: groupFixture({ group_discount_amount: 99999 }) });
    assert.equal(state.pricingBill.savingsFen, 2700);
    assertBill(state.pricingBill, 19300, [6300, 9000], 4000, 0);
});

test('direct entry refreshes room/config via AUTH and ignores all route-only price estimates', async () => {
    const requests = [];
    const page = loadPage('create', {
        getRoomDetail: (token, id) => { requests.push(['room', token, id]); return Promise.resolve({ _status: 0, data: room }); },
        getConstance: token => { requests.push(['config', token]); return Promise.resolve({ _status: 0, data: { group_discount_percent: 80 } }); },
    });
    const state = instance(page, { userInfo: { discount: 85 } });
    page.component.onLoad.call(state, {
        room_id: room.object_id, room_name: 'old', date: '2026-10-12', begin_time: '14:00', end_time: '20:00',
        duration: '99', price_per_hour: '1', price_per_person: '1', offpeak_room_fee: '1', offpeak_label: 'stale',
        offpeak_segments: 'stale', time_list: encodeURIComponent('["01:00~02:00"]'),
    });
    page.component.onShow.call(state);
    assert.equal(state.pricingReady, false);
    state.handleSubmit();
    assert.equal(state.showConfirmModal, false);
    await state._pricingRequest;
    assert.deepEqual(requests, [['room', 'test-token', 'room-current'], ['config', 'test-token']]);
    assert.equal(state.roomName, 'Current room');
    assert.equal(state.pricePerHour, 3000);
    assert.equal(state.duration, 6);
    assert.equal(state.baseCostFen, 16000); // (18000 + 2000) * 80% (default two members).
    assert.equal(state.memberDiscountText, '8.5折');
    assert.equal(state.pricingReady, true);
    assert.equal(state.initiatorInputYuan, state.basePerPersonYuan);
    assert.doesNotMatch(JSON.stringify(state.pricingBill), /stale|01:00/);
});

test('failed price refresh cannot submit stale estimates, and retry updates default shares', async () => {
    let failure = true;
    const page = loadPage('create', {
        getRoomDetail: () => failure ? Promise.reject(new Error('offline')) : Promise.resolve({ _status: 0, data: room }),
        getConstance: () => Promise.resolve({ _status: 0, data: { group_discount_percent: 90 } }),
    });
    const state = instance(page, createState({ pricingLoadedAt: 0 }));
    await state.loadCurrentPricing();
    assert.equal(state.pricingReady, false);
    assert.equal(state.pricingLoading, false);
    assert.match(state.pricingError, /重新|重试/);
    state.handleSubmit();
    assert.equal(state.showConfirmModal, false);
    failure = false;
    await state.loadCurrentPricing();
    assert.equal(state.pricingReady, true);
    assert.equal(state.initiatorInputYuan, '48.25');
});

test('missing price or failed config is not treated as a zero-price quote', async () => {
    const page = loadPage('create', {
        getRoomDetail: () => Promise.resolve({ _status: 0, data: { name: 'Incomplete' } }),
        getConstance: () => Promise.resolve({ _status: 0, data: {} }),
    });
    const state = instance(page, createState({ pricingReady: false }));
    await state.loadCurrentPricing();
    assert.equal(state.pricingReady, false);
    page.AUTH.getRoomDetail = () => Promise.resolve({ _status: 0, data: room });
    page.AUTH.getConstance = () => Promise.resolve({ _status: 1 });
    await state.loadCurrentPricing();
    assert.equal(state.pricingReady, false);
});

test('manual subsidy survives current-price refresh; automatic shares follow quote changes', async () => {
    const page = loadPage('create', {
        getRoomDetail: () => Promise.resolve({ _status: 0, data: room }),
        getConstance: () => Promise.resolve({ _status: 0, data: { group_discount_percent: 90 } }),
    });
    const state = instance(page, createState({ initiatorManuallyChanged: true, initiatorInputYuan: '100.00' }));
    await state.loadCurrentPricing();
    assert.equal(state.initiatorInputYuan, '100.00');
    state.maxMembers = 5;
    page.component.watch.basePerPersonYuan.call(state);
    assert.equal(state.initiatorInputYuan, '100.00');
    state.initiatorManuallyChanged = false;
    page.component.watch.basePerPersonYuan.call(state);
    assert.equal(state.initiatorInputYuan, state.basePerPersonYuan);
});

test('create still sends only existing payload via subscribe then AUTH.createGroup', async () => {
    const events = [];
    const page = loadPage('create', {
        requestSubscribeMessage: topic => { events.push(['subscribe', topic]); return Promise.resolve(); },
        createGroup: (token, data) => { events.push(['create', token, plain(data)]); return Promise.resolve({ _status: 0, data: { object_id: 'created' } }); },
    });
    const state = instance(page, createState({ initiatorInputYuan: '100.00' }));
    state.handleSubmit();
    const submitted = plain(state._pendingSubmitData);
    state.handleCreateSuccess = value => events.push(['success', value.object_id]);
    state.confirmSubmit();
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(events, [['subscribe', 'group'], ['create', 'test-token', submitted], ['success', 'created']]);
});

test('share price retains cents and selected date/range', () => {
    const state = instance(detailPage, { group: groupFixture({ price_per_person: 3123, current_members: 2 }), groupId: 'group-id' });
    const share = detailPage.component.onShareAppMessage.call(state);
    assert.ok(share.title.includes('成员¥31.23/人'));
    assert.ok(share.title.includes('2026-10-12 14:00~20:00'));
});

test('templates bind prepared pricing rows and remain WXML-safe', () => {
    [createPage, detailPage].forEach(page => {
        const template = page.source.match(/<template>([\s\S]*?)<\/template>/)[1];
        assert.doesNotMatch(template, /全包|低至|每小时（均价）|groupDiscountPercent\s*\+\s*'折'/);
        assert.doesNotMatch(template, /\{\s*\}/);
        for (const binding of template.matchAll(/:(?:class|style)="([^"]*)"/g)) {
            assert.doesNotMatch(binding[1], /[\w.]\s*\(/, 'class/style cannot call functions');
        }
        assert.match(template, /v-for="row in pricingBill\.roomRows"/);
        assert.match(template, /\{\{ pricingBill\.savingsText \}\}/);
        assert.equal((template.match(/\{\{ pricingBill\.savingsText \}\}/g) || []).length, 1);
        const stack = [];
        for (const tag of template.matchAll(/<\/?([a-zA-Z][\w-]*)(?:[^"'<>]|"[^"]*"|'[^']*')*\/?>/g)) {
            if (tag[0].startsWith('</')) assert.equal(stack.pop(), tag[1], 'template tags must be balanced');
            else if (!tag[0].endsWith('/>')) stack.push(tag[1]);
        }
        assert.deepEqual(stack, []);
    });
});

(async () => {
    let passed = 0;
    for (const { name, fn } of tests) {
        try {
            await fn();
            console.log('PASS | ' + name);
            passed += 1;
        } catch (error) {
            console.error('FAIL | ' + name);
            throw error;
        }
    }
    console.log('ALL ' + passed + ' GROUP PRICING UI TESTS PASS');
})().catch(error => { console.error(error); process.exitCode = 1; });
