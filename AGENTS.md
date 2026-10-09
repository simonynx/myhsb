# 项目关键上下文

**项目路径**
- 前端：`d:\Work\myhsb`（uni-app / HBuilderX / 微信小程序）
- 后端：`d:\Work\moyu`（Django）
- API：`https://api.moyuhuashui.top/api/v1`
- Git 不要 auto-push；后端 `.py` 用 LF，不要直接 `StrReplaceFile`

**最近完成的重大改动**

1. **微信审核登录整改（核心）**
   - `App.vue`：`onLaunch` 不再强制弹登录，改为读取本地 `token` 静默恢复老用户登录态（会验证 token 是否过期，过期则清除）
   - `user.vue`：未登录时显示游客状态（"Hi，游客"+"点击登录"），`onShow` **不自动登录**
   - `store/index.js`：`loginAndRegister` 只在用户主动触发时调用；token 持久化到 `uni.setStorageSync`
   - `getUserInfo` 支持 `silent` 参数（静默模式不弹错误框）

2. **首页/拼团广场/欢迎页风格统一为暖橙手绘风**

3. **拼团广场逻辑优化**
   - 默认展示"全部"拼团（不传 `date`）
   - 日期栏增加"全部" pill
   - 卡片增加时间紧迫感标签

4. **商品购买自动发券（后端）**
   - `Goods` 增加 `coupon_template` ForeignKey
   - `Order._handle_payment_voucher()` 支付成功后自动创建 `UserCoupon`
   - `create_default_goods.py` 修复折扣率 `81→90`
   - **待执行迁移**：
     ```bash
     python manage.py makemigrations
     python manage.py migrate
     python manage.py create_default_goods
     ```

5. **后端接口匿名访问修复**
   - `coupon.py`：`list` action 的 `request.user` 加了 `is_authenticated` 检查，避免 `AnonymousUser` 报 UUID 错误
   - `my_coupons` 从匿名白名单移除
   - `getConstanceInfo` 不再强制要求 token

6. **首页公开接口**
   - `index.vue`：`onLoad` 主动获取 `constance`，`loadReviews` 不受 `constance` 阻塞

7. **Admin 线下消费结账台（双模式：余额直扣 + 新客扫码支付）**
   - `OrderAdmin` 增加 `checkout/` URL + `checkout_query` AJAX API + `checkout_view`
   - 列表页顶部按钮改为"📝 线下消费结账台"
   - **余额直扣模式（老顾客）**：输入手机号/会员编号 → 检测用户 → 选择房间/时长/人数 → 实时计算金额（含会员折扣）→ 检查余额 → 确认扣款 → 创建 `SUCCESS` 订单 + 扣余额 + 积分 + 更新会员等级
   - **新客扫码支付模式**：输入手机号/会员编号 → 检测用户 → 未注册展示小程序注册码 → 已注册选择房间/时长/人数 → 创建 `CREATED` 订单 → 生成小程序支付二维码（`wxacode.getUnlimited`，`scene=order_sn=xxx`）→ 顾客扫码直达支付页
   - 新客订单过期时间：`end_time=now+24h`（原 30min）
   - `common/utils.py` 新增 `get_weixin_access_token()` 和 `generate_wxacode()`
   - `pages/order/order.vue`：线下订单列表显示会员折扣（从 `goodsInfo._member_discount` 读取）
   - `App.vue`：`onLaunch(options)` 解析扫码 `scene` 参数，自动跳转到支付页
   - `pages/order/payment.vue`：支持通过 `parent_sn` 订单号加载订单（`loadOrderByNumber`），未登录先跳登录页再返回
   - `user/models/user.py`：`User` 模型增加 `member_no` property（`object_id` 前 8 位大写），不依赖手机号即可识别用户
   - `pages/user/user.vue`："我的"页面显示会员编号

8. **P0 留存功能（分享 + 收藏引导 + 签到升级）**
   - `pages/index/index.vue`：`onShareTimeline` / `onAddToFavorites`；收藏引导 banner（可关闭，状态持久化到 storage）
   - `pages/user/user.vue`：`onShareTimeline` / `onAddToFavorites`；签到按钮显示动态积分 `+XX积分`；断签提示 banner
   - `user/models/activity.py`：签到基础积分递增（`daily_points + min(streak_days, 10)`）+ 里程碑奖励；`get_check_in_info` 返回 `is_broken_streak`
   - `pages/index/index.vue`：canvas 分享图预生成（TODO：替换 `logo_small.jpg`）

9. **分时定价落地：房间级闲时价为主，全局半价为辅（含禁券/豁免）**
   - 后端 `user/services/room_pricing.py`：生效规则 = `Room.offpeak_rules`（主）+ 全局工作日折扣（Constance `weekday_room_discount_*`，**默认关闭**），多条命中取最低价；`to_dict()` 下发合并规则（含 `source` 与 `coupon_allowed`）
   - `Room.weekday_discount_exempt`（migration 0045）：不参与全局半价；规则级 `"coupon_allowed": false` 可禁券（如双人引流价），`blocks_coupon()` 统一判定，`Order.checkout` / `update_order_coupon` 用 `context['room_offpeak_blocks_coupon']` 拒券；POS 快照/响应带 `room_offpeak_label`
   - 前端 `utils/offpeak.js`：与后端逐条对齐（取最低价、source、coupon_allowed、hour 兜底）；`promoSummary(rooms, constance)` 汇总全店优惠（房间规则优先、全局兜底）供首页/预约页展示；文案统一**到手价话术**（"双人2小时 ¥90起"）
   - 首页：横幅/弹窗/角标数据源改为 `promoRooms`（`loadPromoRooms()` 拉一次房间列表，10 分钟缓存）；预约页：日期栏"特惠"标记 + 提示条 + 角标均房间驱动；下单页禁券交互随 `coupon_allowed`
   - 对拍：`python tests/parity_backend.py && node tests/parity_frontend.js`（12 向量，tests/ 目录不进小程序包）
   - **运营配置**：`python manage.py setup_offpeak_pricing`（预览）/ `--apply`（写入，配置表在命令文件 `ROOM_PLAN` 里改，闲时价 ≥ 门市价的规则自动跳过防配错涨价）；待执行 migrate（0044+0045）

**重要约束**
- **前端模板中不能用 `{}` 对象字面量**（如 `(userInfo || {}).nickname`），WXML 编译器会把 `}` 当作插值结束符。统一用 `userInfo && userInfo.xxx`
- **前端模板的 `:class` / `:style` 不要写函数调用**（如 `:class="levelDotClass(l)"`、`:class="getTagClass(tag)"`），uni/WXML 编译器不支持。需要先在 `computed` 或数据组装阶段生成 `className` / `styleText` 字段，模板里只绑定字段。
- 后端文件编辑用 Python 脚本，避免 `StrReplaceFile` 引入 CRLF
- `.zcode/`（ZCode 会话工作目录）不入库，已在 `.gitignore` 忽略
