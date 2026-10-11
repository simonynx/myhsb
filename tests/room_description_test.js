/* Standalone, dependency-free regression tests. No browser or app services.
 * node tests/room_description_test.js [path/to/moyu]
 * The tiny DOM below tests enhancement lifecycle only, not visual rendering.
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const frontendPath = path.resolve(__dirname, '../utils/roomDesc.js');
const backendPath = process.argv[2] || path.resolve(__dirname, '../../moyu');
const frontendSource = fs.readFileSync(frontendPath, 'utf8');
const adminSource = fs.readFileSync(path.join(backendPath, 'user/static/js/room-description-editor.js'), 'utf8');
const frontContext = {};
vm.runInNewContext(frontendSource.replace('export { parseContent, parse };', '')
    .replace('export default ', 'globalThis.ROOM_DESC = '), frontContext);
const frontend = frontContext.ROOM_DESC;
const normal = value => JSON.parse(JSON.stringify(value));
const parse = html => normal(frontend.parseContent(html));
let passed = 0;
function test(name, fn) {
    try { fn(); passed++; console.log('PASS ' + name); }
    catch (error) { console.error('FAIL ' + name); throw error; }
}
function core(source) {
    return source.slice(source.indexOf('// BEGIN ROOM DESCRIPTION CODEC'),
        source.indexOf('// END ROOM DESCRIPTION CODEC') + '// END ROOM DESCRIPTION CODEC'.length);
}

class Element {
    constructor(tag) {
        this.tagName = tag.toUpperCase(); this.children = []; this.attrs = {};
        this.style = {}; this.listeners = {}; this.className = ''; this.id = '';
        this._text = ''; this._html = ''; this._value = ''; this.writes = 0;
    }
    set value(value) { this._value = value; this.writes++; }
    get value() { return this._value; }
    set textContent(value) { this._text = String(value); this.children = []; }
    get textContent() { return this._text + this.children.map(c => c.textContent).join(''); }
    set innerHTML(value) { this._html = value; this.children = []; this._text = ''; }
    get innerHTML() { return this._html; }
    appendChild(node) {
        if (node.parentNode) node.parentNode.children = node.parentNode.children.filter(n => n !== node);
        this.children.push(node); node.parentNode = this; return node;
    }
    setAttribute(name, value) { this.attrs[name] = String(value); }
    getAttribute(name) { return this.attrs[name] === undefined ? null : this.attrs[name]; }
    addEventListener(name, fn) { (this.listeners[name] || (this.listeners[name] = [])).push(fn); }
    dispatch(name, event = {}) { (this.listeners[name] || []).forEach(fn => fn(event)); }
    focus() { this.focused = true; }
    closest(selector) {
        const classes = selector.split(',').map(s => s.trim().slice(1));
        for (let node = this; node; node = node.parentNode) {
            if (classes.some(cls => node.className.split(' ').includes(cls))) return node;
        }
        return null;
    }
    querySelectorAll(selector) {
        const descendants = this.children.flatMap(n => [n, ...n.querySelectorAll('*')]);
        return descendants.filter(n => selector === '*' || (selector.startsWith('.')
            ? n.className.split(' ').includes(selector.slice(1)) : n.tagName.toLowerCase() === selector));
    }
}
function environment(value, opts = {}) {
    const root = new Element('root');
    const textarea = new Element('textarea');
    textarea.id = 'id_room_description'; textarea.value = value; textarea.writes = 0;
    if (opts.invalid) { textarea.setAttribute('aria-invalid', 'true'); textarea.setAttribute('aria-describedby', 'server-error'); }
    textarea.disabled = !!opts.disabled;
    const host = new Element('div');
    host.className = opts.tags ? 'room-tags-editor' : 'room-desc-editor';
    host.setAttribute('data-target', opts.missingTarget ? 'missing' : textarea.id);
    host.setAttribute('data-suggestions', 'PS5$Switch');
    root.appendChild(textarea); root.appendChild(host);
    if (opts.legacyError) {
        root.className = 'form-row';
        const errors = new Element('ul'); errors.className = 'errorlist'; errors.textContent = '字段错误'; root.appendChild(errors);
        const help = new Element('div'); help.className = 'help'; help.textContent = '填写帮助'; root.appendChild(help);
    }
    const document = {
        readyState: opts.loading ? 'loading' : 'complete',
        createElement(tag) { if (opts.failCreate) throw new Error('Simulated unavailable enhancement'); return new Element(tag); },
        createTextNode(text) { const n = new Element('text'); n.textContent = text; return n; },
        getElementById(id) { return root.querySelectorAll('*').find(n => n.id === id); },
        querySelectorAll(selector) { return root.querySelectorAll(selector); },
        addEventListener: root.addEventListener.bind(root)
    };
    const calls = [];
    const window = { confirm(message) { calls.push(message); return !!opts.confirm; } };
    vm.runInNewContext(adminSource, { document, window });
    return { document, root, host, textarea, api: window.RoomDescriptionEditor, calls,
        buttons() { return host.querySelectorAll('button'); },
        mode() { return this.buttons().find(b => b.className === 'rde-link'); },
        preview() { return host.querySelectorAll('.rde-preview')[0]; }
    };
}
const admin = environment('').api;
const screenshotList = '<h4>温馨提示：</h4><ul><li>需要按人数购买入场券</li><li>入场券可在大厅使用</li></ul>' +
    '<h4>项目详情</h4><ol><li>设备信息请以实际房间为准</li><li>预约前确认人数</li></ol>';
const legacyCases = [
    ['pure text', '第一行\n第二行'],
    ['nested div and paragraphs', '<div><p>第一段</p><p>第二段</p></div>'],
    ['inline strong', '<p>可使用<strong>设备</strong>，请爱护。</p>'],
    ['standalone strong is not a heading', '<strong>强调，不是标题</strong>'],
    ['two paragraphs', '<p>第一段</p><p>第二段</p>'],
    ['image', '<img src="https://example.test/room.jpg" alt="房间">'],
    ['table', '<table><tbody><tr><th>设备</th><td colspan="2">说明</td></tr></tbody></table>'],
    ['link', '<a href="https://example.test/detail?a=1&amp;b=2">详情</a>'],
    ['ordered start', '<ol start="3"><li>第三项</li></ol>'],
    ['ordered reversed', '<ol reversed><li>倒序</li></ol>'],
    ['ordered type', '<ol type="A"><li>字母编号</li></ol>'],
    ['list item value', '<ol><li value="7">第七项</li></ol>'],
    ['nested list', '<ul><li>父项<ul><li>子项</li></ul></li></ul>'],
    ['paragraph in list', '<ul><li><p>段落</p></li></ul>'],
    ['formatting in list', '<ul><li>前<strong>中</strong>后</li></ul>'],
    ['br within one item', '<ul><li>第一行<br>仍在同一条目</li></ul>'],
    ['styling', '<h4 style="color:red">标题</h4><ul><li>条目</li></ul>'],
    ['empty list', '<ul></ul>'],
    ['unclosed list', '<ul><li>未闭合'],
    ['comment', '<!--原注释--><h4>标题</h4>'],
    ['invalid mixed list', '<ul><p>不是条目</p><li>条目</li></ul>']
];

test('admin/frontend codec bodies stay identical', () => assert.equal(core(frontendSource), core(adminSource)));
test('screenshot-shaped heading + unordered/ordered lists', () => {
    const result = parse(screenshotList);
    assert.equal(result.mode, 'sections'); assert.equal(result.legacyHtml, '');
    assert.deepEqual(result.sections.map(s => [s.title, s.ordered, s.items.length]), [['温馨提示：', false, 2], ['项目详情', true, 2]]);
});
test('empty/null input has no placeholder/fictitious content', () => {
    for (const input of ['', null, undefined, '  \n']) assert.deepEqual(parse(input), { mode: 'sections', sections: [], legacyHtml: '' });
});
test('optional missing closing li is represented without merging items', () => {
    assert.deepEqual(parse('<h4>标题</h4><ol><li>一<li>二</ol>').sections[0].items, ['一', '二']);
});
test('separate lists never merge or change numbering', () => {
    const sections = parse('<h2>标题：</h2><ul><li>甲</li></ul><ol><li>乙</li></ol><ol><li>丙</li></ol>').sections;
    assert.equal(sections.length, 3); assert.deepEqual(sections.map(s => s.ordered), [false, true, true]);
    assert.match(admin.toHtml(sections), /^<h2>标题：<\/h2>/);
});
test('normal HTML whitespace in a li remains one item', () => {
    assert.deepEqual(parse('<ul>\n<li>第一行\n  同一条目</li>\n</ul>').sections[0].items, ['第一行 同一条目']);
    assert.deepEqual(parse('<ul><li>甲&#13;乙&#10;丙&#9;丁</li></ul>').sections[0].items, ['甲 乙 丙 丁']);
});
test('decimal, hex, full named, NBSP, astral, and single-decode entities', () => {
    const html = '<h4>&copy; &reg; &trade;</h4><ul><li>&#x4E2D;/&#20013;/&copy;</li>' +
        '<li>&nbsp;保留&nbsp;</li><li>&CounterClockwiseContourIntegral; &NotEqualTilde; &fjlig;</li>' +
        '<li>&#128512; &#x1F600; &#x80; &#0; &#xD800; &#x110000;</li>' +
        '<li>&amp;#x3c; &notit; &copy</li></ul>';
    const sections = parse(html).sections;
    assert.equal(sections[0].title, '© ® ™');
    assert.deepEqual(sections[0].items, ['中/中/©', '\u00a0保留\u00a0', '∳ ≂̸ fj', '😀 😀 € � � �', '&#x3c; ¬it; ©']);
    assert.deepEqual(normal(admin.parseHtml(html)).sections, sections);
});
for (const [name, html] of legacyCases) {
    test(name + ' uses safe rich-text fallback, never partial sections', () => {
        const result = parse(html);
        assert.equal(result.mode, 'legacy'); assert.deepEqual(result.sections, []); assert.ok(result.legacyHtml);
        assert.equal(admin.parseHtml(html).unsupported, true);
        assert.deepEqual(normal(admin.parseContent(html)), result);
    });
}
test('pure-text line breaks and literal less-than are preserved safely', () => {
    assert.equal(parse('一\n二').legacyHtml, '一<br>二');
    assert.equal(parse('1 < 2 &copy;\n3 > 2').legacyHtml, '1 &lt; 2 ©<br>3 &gt; 2');
});
test('fallback preserves image/link/table/ol semantics', () => {
    const html = '<div><img src="/media/room.jpg?x=1&amp;y=2" alt="&copy;房间" width="640" onerror="alert(1)">' +
        '<a href="https://example.test?a=1&amp;b=2" onclick="evil()">详情</a>' +
        '<table><tr><th>说明</th><td colspan="2">内容</td></tr></table><ol start="3" type="A" reversed><li value="7">编号</li></ol></div>';
    const safe = parse(html).legacyHtml;
    assert.match(safe, /<img[^>]+src="\/media\/room.jpg\?x=1&amp;y=2"/);
    assert.match(safe, /alt="©房间"/); assert.match(safe, /href="https:\/\/example.test\?a=1&amp;b=2"/);
    assert.match(safe, /<td colspan="2">内容<\/td>/); assert.match(safe, /<ol start="3" reversed="reversed" type="A">/);
    assert.match(safe, /<li value="7">/); assert.doesNotMatch(safe, /onerror|onclick/);
});
test('attributes decode with HTML attribute entity rules', () => {
    const safe = parse('<img src="https://example.test/&copy=1&amp;q=&copy;" title="&copy=1 &copy;">').legacyHtml;
    assert.match(safe, /title="&amp;copy=1 ©"/);
    assert.match(safe, /src="https:\/\/example.test\/&amp;copy=1&amp;q=©"/);
});
test('strip active elements, event handlers, dangerous schemes, and CSS', () => {
    const html = '<script><img src=x onerror=evil()></script><STYLE>body{display:none}</STYLE>' +
        '<iframe src="https://example.test">hidden</iframe><svg><a>hidden svg</a></svg><math>hidden math</math>' +
        '<object>hidden object</object><form>hidden form</form><p onclick="evil()" style="color:red;background-image:url(javascript:evil());position:fixed;font-weight:bold">保留</p>' +
        '<a href="java&#x73;cript&colon;alert(1)">链接</a><a href="java&NewLine;script:evil()">控制符</a>' +
        '<img src="data:image/svg+xml,evil" alt="图片"><img src="javascript:evil()"><img src="file:///secret">';
    const safe = parse(html).legacyHtml;
    assert.equal(safe, '<p style="color:red;font-weight:bold">保留</p><a>链接</a><a>控制符</a>图片');
});
test('encoded HTML stays text and cannot become active HTML', () => {
    const safe = parse('<p>&lt;img src=x onerror=alert(1)&gt;&amp;lt;script&amp;gt;</p>').legacyHtml;
    assert.equal(safe, '<p>&lt;img src=x onerror=alert(1)&gt;&amp;lt;script&amp;gt;</p>');
});
test('sanitizer remains safe on malformed/foreign/raw-text markup', () => {
    for (const html of ['<img src="x"onerror="evil()">', '<svg><foreignObject><img src=x onerror=evil()></foreignObject></svg>',
        '<script/>evil()<IMG SRC=x onerror=evil()>', '<plaintext><img src=x onerror=evil()>',
        '<!--><script>evil()</script>', '<table><tr><td><a href="javascript:evil()">x</table>',
        '<div>'.repeat(150) + '<img src=x onerror=evil()>']) {
        const safe = admin.sanitizeHtml(html);
        assert.doesNotMatch(safe, /<(script|svg|math|iframe|object|embed|plaintext)\b/i);
        assert.doesNotMatch(safe, /<[^>]+\s(onerror|onclick|srcdoc)\s*=/i);
        assert.doesNotMatch(safe, /<[^>]+(?:href|src)="(?:javascript|data|file):/i);
    }
});
test('serialization escapes editable title/items and keeps heading levels', () => {
    const safe = admin.toHtml([{title: '<script>', headingTag: 'h2', ordered: true, items: ['<img src=x>', '&copy;']}]);
    assert.equal(safe, '<h2>&lt;script&gt;</h2>\n<ol><li>&lt;img src=x&gt;</li><li>&amp;copy;</li></ol>');
});
test('compatibility parse returns sections only', () => {
    assert.deepEqual(normal(frontend.parse(screenshotList)), parse(screenshotList).sections);
    assert.deepEqual(normal(frontend.parse('<p>legacy</p>')), []);
});

for (const [name, value] of [['supported list', '\n <H4>标题：</H4>\n<UL><LI>&#x4E2D;<LI>&copy;</UL> \n'], ...legacyCases]) {
    test('no edit means zero textarea writes: ' + name, () => {
        const env = environment(value);
        assert.equal(env.textarea.value, value); assert.equal(env.textarea.writes, 0);
        assert.equal(env.host.getAttribute('data-ready'), '1');
        assert.equal(env.textarea.style.display, name === 'supported list' ? 'none' : '');
    });
}
test('supported source/visual round-trip never rewrites bytes', () => {
    const value = '\n<H4>标题：</H4> <UL><LI>&#x4E2D;</UL>\n'; const env = environment(value);
    env.mode().onclick(); env.mode().onclick(); env.mode().onclick();
    assert.equal(env.textarea.value, value); assert.equal(env.textarea.writes, 0); assert.equal(env.calls.length, 0);
});
test('source edit preview stays safe without corrupting source input', () => {
    const env = environment('<p>原文</p>');
    const value = '<p>新文<img src="javascript:evil()" onerror="evil()"></p><script>evil()</script>';
    env.textarea.value = value; env.textarea.writes = 0; env.textarea.dispatch('input');
    assert.equal(env.textarea.value, value); assert.equal(env.textarea.writes, 0);
    assert.equal(env.preview().innerHTML, '<p>新文</p>');
});
test('cancelled source conversion or preset leaves original bytes intact', () => {
    const value = '<p>原文</p><img src="/room.jpg">'; const env = environment(value);
    env.mode().onclick(); env.buttons().find(b => b.textContent === '项目详情').onclick();
    assert.equal(env.calls.length, 2); assert.equal(env.textarea.value, value); assert.equal(env.textarea.writes, 0);
});
test('destructive conversion writes only after explicit confirmation', () => {
    const env = environment('<p>原文</p><script>不可成为条目</script><img src="/room.jpg">', {confirm: true});
    env.mode().onclick(); assert.equal(env.calls.length, 1);
    assert.equal(env.textarea.value, '<ul><li>原文</li></ul>'); assert.equal(env.textarea.writes, 1);
});
test('title templates never insert invented quantities or amenities', () => {
    const env = environment('');
    env.buttons().find(b => b.textContent === '项目详情').onclick();
    assert.equal(env.textarea.value, '<h4>项目详情</h4>');
    assert.equal(env.host.querySelectorAll('.rde-items')[0].value, '');
    assert.doesNotMatch(env.textarea.value, /PS5|Switch|两台|一台|茶水|零食/);
});
test('initial tags remain byte-identical until an actual change', () => {
    const value = ' PS5 $PS5$Switch\n'; const env = environment(value, {tags: true});
    assert.equal(env.textarea.value, value); assert.equal(env.textarea.writes, 0);
    env.buttons().find(b => b.getAttribute('aria-label') === '移除标签「PS5」').onclick();
    assert.equal(env.textarea.value, 'Switch');
});
test('real input labels, button names, and server-error associations exist', () => {
    const env = environment(screenshotList, {invalid: true});
    const labels = env.host.querySelectorAll('label');
    for (const control of ['input', 'select', 'textarea'].flatMap(tag => env.host.querySelectorAll(tag))) {
        assert.ok(control.id); assert.ok(labels.some(label => label.htmlFor === control.id));
        assert.match(control.getAttribute('aria-describedby'), /server-error/);
        assert.equal(control.getAttribute('aria-invalid'), 'true');
    }
    for (const b of env.buttons()) assert.ok(b.textContent || b.getAttribute('aria-label'));
    assert.ok(env.buttons().filter(b => /^[↑↓]$/.test(b.textContent)).every(b => b.getAttribute('aria-label')));
    assert.match(env.host.textContent, /内容预览/); assert.doesNotMatch(env.host.textContent, /小程序预览/);
});
test('Django 3 server errors/help are linked to the new controls', () => {
    const env = environment(screenshotList, {legacyError: true});
    const field = env.host.querySelectorAll('input')[0];
    assert.equal(field.getAttribute('aria-invalid'), 'true');
    assert.match(field.getAttribute('aria-describedby'), /id_room_description-editor-errors/);
    assert.match(field.getAttribute('aria-describedby'), /id_room_description-editor-help/);
    assert.equal(env.root.querySelectorAll('.errorlist')[0].getAttribute('role'), 'alert');
});
test('invalid source becomes visible and accessible, not a hidden invalid field', () => {
    const env = environment(''); env.textarea.validationMessage = '请填写房间介绍'; env.textarea.dispatch('invalid');
    assert.equal(env.textarea.style.display, ''); assert.equal(env.textarea.focused, true);
    assert.equal(env.host.querySelectorAll('.rde-error')[0].textContent, '请填写房间介绍');
});
test('late loading and DOMContentLoaded both initialize once', () => {
    const env = environment(screenshotList, {loading: true});
    assert.equal(env.host.getAttribute('data-ready'), null); assert.equal(env.textarea.writes, 0);
    env.root.dispatch('DOMContentLoaded'); const count = env.buttons().length;
    env.root.dispatch('formset:added'); assert.equal(env.buttons().length, count); assert.equal(env.textarea.writes, 0);
});
test('missing target, disabled widget, and JS enhancement failure degrade safely', () => {
    for (const opts of [{missingTarget: true}, {disabled: true}, {failCreate: false}]) {
        const env = environment('<p>原文</p>', opts);
        assert.notEqual(env.textarea.style.display, 'none'); assert.equal(env.textarea.value, '<p>原文</p>');
    }
    // Fail one UI operation, while leaving the fallback error renderer available.
    const root = new Element('root'); const field = new Element('textarea'); field.id = 'raw'; field.value = '原文';
    const host = new Element('div'); host.className = 'room-desc-editor'; host.setAttribute('data-target', 'raw');
    root.appendChild(field); root.appendChild(host); let failed = false;
    const doc = {readyState: 'complete', querySelectorAll: root.querySelectorAll.bind(root),
        getElementById: () => field, addEventListener() {}, createElement(tag) {
            if (!failed) { failed = true; throw new Error('failure'); } return new Element(tag);
        }};
    vm.runInNewContext(adminSource, {document: doc, window: {confirm: () => false}});
    assert.equal(field.value, '原文'); assert.equal(field.style.display, '');
    assert.equal(host.getAttribute('data-ready'), null); assert.match(host.textContent, /原内容已保留/);
});
console.log('\n' + passed + ' room-description regression tests passed.');
