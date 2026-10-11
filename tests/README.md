# tests/ —— 前端本地测试脚本

存放不参与小程序打包的测试/校验脚本。**本目录已通过
`project.config.json` 的 `packOptions.ignore` 显式排除，且 uni-app
编译只收录被引用的页面/组件/静态资源，这里的文件不会进入小程序包。**

## 闲时定价前后端对拍

闲时价（分时定价 + 周二半价）在前后端各有一份实现，本组脚本用
**双方的真实代码**跑同一批场景，防止"页面显示一个价、实际收另一个价"：

- 后端 `moyu/user/services/room_pricing.py`（真正扣钱）
- 前端 `utils/offpeak.js`（页面展示）

```bash
python tests/parity_backend.py && node tests/parity_frontend.js
```

- `parity_backend.py` —— import 真实后端文件算出期望价，生成 `parity_cases.json`
  （后端仓库默认取同级 `../moyu`，不在该位置时 `MOYU_DIR=... python tests/parity_backend.py`）
- `parity_frontend.js` —— 用真实前端 `offpeak.js` 重算并逐条比对价格与规则来源
- `parity_cases.json` / `offpeak_cjs.js` —— 运行时生成的中间产物，已 gitignore

**什么时候要跑**：改动 `room_pricing.py`、`offpeak.js`，或调整优惠规则逻辑之后。
新增场景：在 `parity_backend.py` 的 `CASES` 里加一行即可，两边自动对上。

## 价格展示、选时段与介绍兼容回归

```bash
node tests/pricing_display.js
node tests/booking_selection.js
node tests/group_pricing_ui.js
node tests/room_description_test.js
```

- `pricing_display.js`：指定日期的连续两小时起价、营业时段、已占用时段、星期文案、金额精度。
- `booking_selection.js`：详情页换日期后价格与余位同步；已约满仍可换日期；已选小时变为不可用后同步清除。
- `group_pricing_ui.js`：拼团房费分段明细、闲时与组局优惠不重复扣减、旧响应回退及刷新失败保护。
- `room_description_test.js`：后台/小程序解析一致、旧 HTML 安全保留、未编辑不改写，以及无虚构内容的模板。

后端对应的独立检查在 `moyu/tests/`：

```bash
python tests/test_segment_billing.py
python tests/test_room_description_widgets.py
```

这些测试不能替代生产版本 Django 的完整测试或微信开发者工具编译；页面上线前仍需检查实际小程序运行环境。
