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
node tests/home_layout.js
node tests/booking_selection.js
node tests/group_pricing_ui.js
node tests/room_description_test.js
```

- `pricing_display.js`：指定日期的连续两小时起价、营业时段、已占用时段、星期文案、金额精度。
- `home_layout.js`：首页金额精度、闲时起价、拼豆开关、购票/预约入口、自定义导航栏安全区及胶囊避让。
- `booking_selection.js`：详情页换日期后价格与余位同步；已约满仍可换日期；已选小时变为不可用后同步清除。
- `group_pricing_ui.js`：拼团房费分段明细、闲时与组局优惠不重复扣减、旧响应回退及刷新失败保护。
- `room_description_test.js`：后台/小程序解析一致、旧 HTML 安全保留、未编辑不改写，以及无虚构内容的模板。

## 商城、领券与个人权益回归

```bash
node tests/subscription_presentation.js
node tests/voucher_mall.js
node tests/subscription_buy.js
node tests/subscription_owned.js
node tests/coupon_claim.js
node tests/mall_navigation.js
node tests/mall_entries.js
node tests/subscription_payment_return.js
```

- `subscription_presentation.js`：统一额度、金额精度、有效期、账号共享和闲时限制说明，覆盖非默认额度与限购配置。
- `voucher_mall.js`：卡包主线、紧凑积分摘要、独立福利/补给/领券入口、指定套餐跳转、加载失败重试及迟到响应保护。
- `subscription_buy.js`：单套餐确认、无效/下架卡不自动替换、限购提示、登录刷新、继续支付上下文及支付请求协议保持。
- `subscription_owned.js`：剩余额度、到期与未生效校验、使用入口、异步切换分类、重试和导航栏安全区。

- `coupon_claim.js`：游客可浏览、主动登录后领取、券类型/活动资格、领取结果、重试与并发保护。
- `mall_navigation.js`：指定卡详情路由、安全结算返回、一次性草稿标识及超时清理。
- `mall_entries.js`：首页/个人权益入口、原订单人数与备注恢复、加购重新映射以及放弃购卡后不污染新订单。
- `subscription_payment_return.js`：已保留的购卡订单继续支付成功后恢复原结算；普通订单与失败/取消不误跳转。

## 积分回访、到店补给与领取履约

```bash
node tests/loyalty_presentation.js
node tests/loyalty_pages.js
node tests/loyalty_entries.js
node tests/goods_fulfillment_ui.js
```

- `loyalty_presentation.js`：积分步长/上限与整数配置、游客资格、积分＋现金和真实发券关联，不按商品类别猜测优惠券。
- `loyalty_pages.js`：积分福利与真实变动记录、静默账户刷新、动态补给分类、加载失败重试与身份切换保护。
- `loyalty_entries.js`：签到/积分直达福利、有效到店订单补给入口、真实领取状态与财务状态分离。
- `goods_fulfillment_ui.js`：商品详情权威刷新、到账必须有服务端证据、历史记录未知、退款不可领和盲盒/券区分。

页面信息精简后的展开交互也由上述测试覆盖：积分说明、积分记录和次要卡包规则默认收起；价格、额度、有效期、积分＋现金、入场费与闲时限制仍须在购买前显示。商品描述可能包含实际使用门槛，不应为了减少文字而直接隐藏。

后端对应的独立检查在 `moyu/tests/`：

```bash
python tests/test_segment_billing.py
python tests/test_room_description_widgets.py
python tests/test_goods_fulfillment.py
```

`test_goods_fulfillment.py` 使用真实履约服务和隔离的 Django Admin/序列化代码检查快照、幂等交付、权限、CSRF和退款保护；实际数据库回归准备在 `user/test_goods_fulfillment.py`，需在项目对应版本的 Django 与测试数据库中另行执行。

这些测试不能替代生产版本 Django 的完整测试或微信开发者工具编译；页面上线前仍需检查实际小程序运行环境。
