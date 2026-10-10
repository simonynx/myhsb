/**
 * 闲时定价前后端一致性验证 —— 前端侧（对拍）。
 *
 * 读取 parity_backend.py 生成的 parity_cases.json（后端会收的价 +
 * Room.to_dict() 会下发的合并规则），用真实的前端 utils/offpeak.js
 * 逐条重算，比对生效单价与规则来源（source 用于半价禁券判定）。
 *
 * 运行（先跑后端侧生成用例）：
 *   python tests/parity_backend.py && node tests/parity_frontend.js
 */
const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const OFFPEAK_SRC = path.join(HERE, '..', 'utils', 'offpeak.js');
const CASES_FILE = path.join(HERE, 'parity_cases.json');
const CJS_COPY = path.join(HERE, 'offpeak_cjs.js');

if (!fs.existsSync(CASES_FILE)) {
  console.error('缺少 %s，请先运行: python tests/parity_backend.py', CASES_FILE);
  process.exit(1);
}

// Node 无法直接 require ES module，转成 CommonJS 临时副本再加载
const src = fs.readFileSync(OFFPEAK_SRC, 'utf8').replace('export default', 'module.exports =');
fs.writeFileSync(CJS_COPY, src);
delete require.cache[require.resolve(CJS_COPY)];
const OFFPEAK = require(CJS_COPY);

const cases = JSON.parse(fs.readFileSync(CASES_FILE, 'utf8'));
let fail = 0;
cases.forEach(function(c) {
  const room = { price_per_hour: c.base, offpeak_rules: c.offpeak_rules };
  const resolved = OFFPEAK.resolveHourPrice(room, c.date, c.time_list);
  const source = resolved.rule ? (resolved.rule.source || '') : '';
  const quote = OFFPEAK.priceAppointment(room, c.date, c.time_list);
  const segs = JSON.stringify(quote.segments.map(function(seg) { return [seg.start, seg.end, seg.price]; }));
  const priceOk = resolved.price === c.expect_price
    && quote.roomFee === c.expect_room_fee
    && segs === JSON.stringify(c.expect_segments);
  const sourceOk = source === c.expect_source;
  if (!priceOk || !sourceOk) fail += 1;
  console.log(
    (priceOk && sourceOk ? 'PASS' : 'FAIL') +
    ' | ' + c.name +
    ' | fee ' + quote.roomFee + '/' + c.expect_room_fee +
    ' | source ' + (source || '-') + '/' + (c.expect_source || '-')
  );
});
if (fail) {
  console.error('FAILED: ' + fail);
  process.exit(1);
}
console.log('ALL ' + cases.length + ' CASES PASS');
