<template>
    <view class="page">
        <view class="status-bar-placeholder"></view>

        <view class="nav-bar">
            <text class="nav-back yticon icon-fanhui" @click="goBack"></text>
            <text class="nav-title">订单支付</text>
        </view>

        <!-- 超时 -->
        <view class="overtime-section" v-if="overtime">
            <view class="overtime-icon">⏰</view>
            <view class="overtime-title">订单已超时</view>
            <view class="overtime-sub">支付时间已过，订单已自动取消</view>
            <view class="overtime-order" v-if="order">订单号：{{ order.order_number }}</view>
            <view class="overtime-btn" @click="goOrderList">返回订单列表</view>
        </view>

        <block v-else-if="order">
            <!-- 金额卡片 -->
            <view class="amount-card" v-if="order">
                <view class="amount-label">需支付</view>
                <view class="amount-price">
                    <text class="yuan">¥</text>
                    <text class="price">{{ formatMoney(order.pay_amount) }}</text>
                </view>
                <view class="order-no">订单号 {{ order.order_number }}</view>
                <view class="order-info" v-if="order.order_type === 4">
                    <text class="info-tag">线下消费</text>
                    <text class="info-text">{{ (order.goodsInfo && order.goodsInfo.room_name) }} · {{ (order.goodsInfo && order.goodsInfo.duration) }}小时 · {{ order.goodsInfo && order.goodsInfo.user_count }}人</text>
                </view>
                <view class="order-info" v-if="order.order_type === 7">
                    <text class="info-tag">卡包</text>
                    <text class="info-text">{{ subscriptionOrderName }}</text>
                </view>
            </view>

            <!-- 订单明细 -->
            <view class="order-detail-section" v-if="hasOrderDetails">
                <view class="section-title">订单明细</view>
                <view class="detail-row" v-if="orderBaseAmount > 0">
                    <text class="detail-label">基础消费</text>
                    <text class="detail-value">¥{{ formatMoney(orderBaseAmount) }}</text>
                </view>
                <view class="detail-row discount" v-for="deduct in orderSubscriptionDeductions" :key="deduct.key">
                    <text class="detail-label">{{ deduct.label }}</text>
                    <text class="detail-value">-¥{{ formatMoney(deduct.amount) }}</text>
                </view>
                <view class="detail-row" v-if="order && order.order_type === 7 && subscriptionOrderAmount > 0">
                    <text class="detail-label">卡包金额</text>
                    <text class="detail-value">¥{{ formatMoney(subscriptionOrderAmount) }}</text>
                </view>
                <view class="detail-row" v-if="order && order.order_type === 7 && subscriptionOrderLimitText">
                    <text class="detail-label">额度</text>
                    <text class="detail-value">{{ subscriptionOrderLimitText }}</text>
                </view>
                <view class="detail-row" v-if="order && order.order_type === 7 && subscriptionOrderUseTypeText">
                    <text class="detail-label">适用</text>
                    <text class="detail-value">{{ subscriptionOrderUseTypeText }}</text>
                </view>
                <view class="detail-row" v-for="(a, index) in orderAddons" :key="index">
                    <text class="detail-label">{{ formatAddonName(a.name) }}</text>
                    <text class="detail-value plus">+¥{{ formatMoney(a.price) }}</text>
                </view>
                <view class="detail-row discount" v-if="orderMemberDiscount > 0">
                    <text class="detail-label">会员折扣</text>
                    <text class="detail-value">-¥{{ formatMoney(orderMemberDiscount) }}</text>
                </view>
                <view class="detail-row discount" v-if="orderPointsDeducted > 0">
                    <text class="detail-label">积分抵扣</text>
                    <text class="detail-value">-¥{{ formatMoney(orderPointsDeducted) }}</text>
                </view>
                <view class="detail-row discount" v-if="orderCouponDiscount > 0">
                    <text class="detail-label">优惠券</text>
                    <text class="detail-value">-¥{{ formatMoney(orderCouponDiscount) }}</text>
                </view>
            </view>

            <!-- 优惠券（仅线下待付款订单） -->
            <view class="coupon-section" v-if="isOfflinePending && availableCoupons.length > 0">
                <view class="section-title">使用优惠券</view>
                <view class="coupon-list">
                    <view
                        class="coupon-item"
                        :class="selectedCoupon && selectedCoupon.object_id === c.object_id ? 'selected' : ''"
                        v-for="c in availableCoupons"
                        :key="c.object_id"
                        @click="selectCoupon(c)"
                    >
                        <view class="coupon-left">
                            <text class="coupon-price">{{ c.displayPrefix }}{{ c.displayValue }}</text>
                            <text class="coupon-limit">{{ c.limitText }}</text>
                        </view>
                        <view class="coupon-right">
                            <text class="coupon-name">{{ c.name }}</text>
                            <text class="coupon-expire">有效期至 {{ c.expire_time }}</text>
                        </view>
                        <view class="coupon-check" v-if="selectedCoupon && selectedCoupon.object_id === c.object_id">✓</view>
                    </view>
                    <view class="coupon-item no-coupon" :class="!selectedCoupon ? 'selected' : ''" @click="selectCoupon(null)">
                        <text class="no-coupon-text">不使用优惠券</text>
                        <view class="coupon-check" v-if="!selectedCoupon">✓</view>
                    </view>
                </view>
                <view class="coupon-tip" v-if="selectedCoupon">已选：{{ selectedCoupon.name }}，优惠 {{ couponDiscountText }}</view>
            </view>
            <view class="coupon-section" v-else-if="isOfflinePending">
                <view class="section-title">使用优惠券</view>
                <view class="coupon-loading" v-if="!couponsLoaded">加载中...</view>
                <view class="coupon-receive-link" v-else-if="showCouponReceiveLink" @click="goReceiveCoupons">
                    <view>
                        <text class="receive-title">有可领取优惠券</text>
                        <text class="receive-sub">领取后返回支付页使用</text>
                    </view>
                    <text class="receive-action">去领取</text>
                </view>
                <view class="coupon-empty" v-else>暂无可用优惠券</view>
            </view>

            <!-- 支付方式 -->
            <view class="pay-section">
                <view class="section-title">选择支付方式</view>

                <view class="pay-method" :class="payMethod === 'wechat' ? 'active' : ''" @click="selectPay('wechat')">
                    <view class="method-left">
                        <view class="method-icon" style="background:#07C160;">
                            <image src="/static/wechat.png" mode="aspectFit" />
                        </view>
                        <view class="method-info">
                            <view class="method-name">微信支付</view>
                            <view class="method-desc">推荐安装微信用户使用</view>
                        </view>
                    </view>
                    <view class="method-check">
                        <view class="check-circle" :class="payMethod === 'wechat' ? 'active' : ''">
                            <text v-if="payMethod === 'wechat'">✓</text>
                        </view>
                    </view>
                </view>

                <view class="pay-method" :class="[payMethod === 'balance' ? 'active' : '', !canUseBalance ? 'disabled' : '']" @click="selectPay('balance')">
                    <view class="method-left">
                        <view class="method-icon" style="background:#FFB933;">
                            <text class="icon-text">余额</text>
                        </view>
                        <view class="method-info">
                            <view class="method-name">余额支付</view>
                            <view class="method-desc" v-if="canUseBalance">
                                {{ balanceDeductText }}
                            </view>
                            <view class="method-desc" v-else>
                                可用余额 ¥{{ (safeUserInfo.account_balance / 100).toFixed(2) }}
                                <text class="insufficient-tip">（还差 ¥{{ formatMoney(balanceShortfall) }}）</text>
                            </view>
                        </view>
                    </view>
                    <view class="method-check" v-if="canUseBalance">
                        <view class="check-circle" :class="payMethod === 'balance' ? 'active' : ''">
                            <text v-if="payMethod === 'balance'">✓</text>
                        </view>
                    </view>
                </view>
            </view>

            <!-- 提示 -->
            <view class="tips-section">
                <view class="tip-item" v-if="order.order_type == 1">
                    <text class="tip-dot">·</text> 支付成功后预约时段将自动锁定
                </view>
                <view class="tip-item">
                    <text class="tip-dot">·</text> 请在 <text class="tip-highlight">{{ countdownText }}</text> 内完成支付
                </view>
            </view>

            <!-- 底部栏 -->
            <view class="bottom-bar">
                <view class="bottom-info">
                    <text class="bottom-label">实付款</text>
                    <text class="bottom-price">¥{{ formatMoney(order.pay_amount) }}</text>
                </view>
                <view class="pay-btn" :class="paying ? 'disabled' : ''" @click="doPay">
                    <text v-if="!paying">确认支付</text>
                    <text v-else>支付中...</text>
                </view>
            </view>
        </block>


    </view>
</template>

<script>
import { mapState, mapActions } from 'vuex';
import AUTH from '../../utils/auth.js';
import COUPON from '../../utils/coupon.js';
import SUBSCRIPTION from '../../utils/subscription.js';
import PLATFORM from '../../common/platform.js';

export default {
    data() {
        return {
            order: null,
            entry: '1',
            overtime: false,
            countdownText: '',
            payMethod: null,
            paying: false,
            interval: null,
            // 优惠券相关
            myCoupons: [],
            claimableCoupons: [],
            selectedCoupon: null,
            couponsLoaded: false,
            updatingCoupon: false,
        };
    },

    computed: {
        ...mapState(['hasLogin', 'userInfo', 'token']),
        safeUserInfo() {
            return this.userInfo || { account_balance: 0 };
        },
        canUseBalance() {
            if (!this.order) return false;
            if (this.isRechargeOrder) return false;
            // 商品订单：检查商品是否支持余额支付
            if (this.order.order_type === 3) {
                var goodsInfo = this.order.goodsInfo || {};
                if (!goodsInfo.can_use_balance) return false;
            }
            return (this.safeUserInfo.account_balance || 0) >= (this.order.pay_amount || 0);
        },

        balanceShortfall() {
            if (!this.order) return 0;
            return Math.max(0, (this.order.pay_amount || 0) - (this.safeUserInfo.account_balance || 0));
        },

        balanceDeductText() {
            if (!this.canUseBalance || !this.order) return '';
            return `可抵扣 ¥${this.formatMoney(this.order.pay_amount)}`;
        },

        isRechargeOrder() {
            if (!this.order) return false;
            var goodsInfo = this.order.goodsInfo || this.order.goods_info || {};
            return this.order.order_type === 2 || goodsInfo.goods_type === 2;
        },

        // 是否为线下待付款订单
        isOfflinePending() {
            return this.order && this.order.order_type === 4 && this.order.order_status === 0;
        },

        orderGoodsInfo() {
            return (this.order && (this.order.goodsInfo || this.order.goods_info)) || {};
        },

        orderPricingInfo() {
            return this.orderGoodsInfo.pricing || {};
        },

        orderAddons() {
            if (Array.isArray(this.orderGoodsInfo.addons)) return this.orderGoodsInfo.addons;
            if (this.orderGoodsInfo.context && Array.isArray(this.orderGoodsInfo.context.addons)) {
                return this.orderGoodsInfo.context.addons;
            }
            return [];
        },

        orderSubscriptionDeductions() {
            return SUBSCRIPTION.buildDeductionRows(this.orderGoodsInfo);
        },

        orderSubscriptionDiscountTotal() {
            return this.orderSubscriptionDeductions.reduce(function(total, item) {
                return total + (Number(item.amount) || 0);
            }, 0);
        },

        orderAddonsTotal() {
            if (this.orderGoodsInfo._addons_total) return this.orderGoodsInfo._addons_total;
            if (this.orderPricingInfo.addons_total) return this.orderPricingInfo.addons_total;
            return this.orderAddons.reduce(function(total, item) {
                return total + (item.price || 0);
            }, 0);
        },

        orderBaseAmount() {
            var hasFlatOriginal = this.orderGoodsInfo._original_amount !== undefined && this.orderGoodsInfo._original_amount !== null;
            if (hasFlatOriginal) {
                var flatOriginal = Number(this.orderGoodsInfo._original_amount) || 0;
                if (this.order && (this.order.order_type === 1 || this.order.order_type === 6)) {
                    return flatOriginal + this.orderSubscriptionDiscountTotal;
                }
                return flatOriginal;
            }
            if (this.orderPricingInfo.base_amount !== undefined && this.orderPricingInfo.base_amount !== null) {
                var pricingBase = Number(this.orderPricingInfo.base_amount) || 0;
                if (this.order && (this.order.order_type === 1 || this.order.order_type === 6)) {
                    return pricingBase + this.orderSubscriptionDiscountTotal;
                }
                return pricingBase;
            }
            if (this.order && this.order.order_type === 4 && this.orderGoodsInfo._total_original) {
                return Math.max(0, this.orderGoodsInfo._total_original - this.orderAddonsTotal);
            }
            return 0;
        },

        orderMemberDiscount() {
            return this.orderGoodsInfo._member_discount || this.orderPricingInfo.member_discount || 0;
        },

        orderPointsDeducted() {
            return this.orderGoodsInfo._points_deducted || this.orderPricingInfo.points_deducted || 0;
        },

        orderCouponDiscount() {
            return this.orderGoodsInfo._coupon_discount || this.orderGoodsInfo._discount_amount || this.orderPricingInfo.coupon_discount || 0;
        },

        subscriptionOrderCard() {
            var goodsInfo = this.orderGoodsInfo || {};
            return goodsInfo.card_template || goodsInfo.subscription_card || goodsInfo.card || {};
        },

        subscriptionOrderName() {
            var goodsInfo = this.orderGoodsInfo || {};
            var card = this.subscriptionOrderCard;
            return card.name || goodsInfo.card_name || goodsInfo.name || (this.order && this.order.goods_name) || '次卡/月卡';
        },

        subscriptionOrderTargetType() {
            var goodsInfo = this.orderGoodsInfo || {};
            var card = this.subscriptionOrderCard;
            return SUBSCRIPTION.getCardTargetType(Object.assign({}, goodsInfo, card));
        },

        subscriptionOrderLimitText() {
            var goodsInfo = this.orderGoodsInfo || {};
            var card = this.subscriptionOrderCard;
            var totalLimit = Number(card.total_limit || goodsInfo.total_limit || 0);
            if (!totalLimit) return '';
            return totalLimit + SUBSCRIPTION.getCardUnit(Object.assign({}, goodsInfo, card));
        },

        subscriptionOrderUseTypeText() {
            var goodsInfo = this.orderGoodsInfo || {};
            var card = this.subscriptionOrderCard;
            return SUBSCRIPTION.getCardUsageText(Object.assign({}, goodsInfo, card));
        },

        subscriptionOrderAmount() {
            var goodsInfo = this.orderGoodsInfo || {};
            var card = this.subscriptionOrderCard;
            var amount = Number(card.price || goodsInfo.price || goodsInfo.amount || (this.order && this.order.pay_amount) || 0);
            return isFinite(amount) ? amount : 0;
        },

        hasOrderDetails() {
            return this.orderBaseAmount > 0 ||
                (this.order && this.order.order_type === 7) ||
                this.orderSubscriptionDeductions.length > 0 ||
                this.orderAddonsTotal > 0 ||
                this.orderMemberDiscount > 0 ||
                this.orderPointsDeducted > 0 ||
                this.orderCouponDiscount > 0;
        },

        // 可用优惠券（订单相关）
        couponBaseAmount() {
            if (!this.order) return 0;
            const amountAfterMember = this.orderBaseAmount + this.orderAddonsTotal - this.orderMemberDiscount;
            return amountAfterMember > 0 ? amountAfterMember : (this.order.pay_amount || 0);
        },

        availableCoupons() {
            if (!this.order) return [];
            return COUPON.getAvailableCoupons(this.myCoupons, this.couponBaseAmount).sort(function(a, b) {
                return (Number(b.discount) || 0) - (Number(a.discount) || 0);
            });
        },

        claimableAvailableCoupons() {
            if (!this.order) return [];
            return COUPON.getAvailableCoupons(this.claimableCoupons, this.couponBaseAmount);
        },

        showCouponReceiveLink() {
            return this.isOfflinePending &&
                this.couponsLoaded &&
                this.availableCoupons.length === 0 &&
                this.claimableAvailableCoupons.length > 0;
        },

        couponDiscountText() {
            if (!this.selectedCoupon) return '';
            const discount = COUPON.calcCouponDiscount(this.selectedCoupon, this.couponBaseAmount);
            return '-' + (discount / 100).toFixed(2) + '元';
        },
    },

    onLoad(options) {
        if (options.data && options.data !== 'null') {
            try {
                this.order = JSON.parse(decodeURIComponent(options.data));
            } catch(e) {
                this.order = null;
            }
            if (!this.order || this.order.pay_amount === undefined || this.order.pay_amount === null) {
                uni.showToast({ title: '订单创建失败', icon: 'none' });
                uni.redirectTo({ url: '/pages/order/order' });
                return;
            }
            this.initPayment(options);
        } else if (options.parent_sn) {
            this.loadOrderByNumber(options.parent_sn);
        } else {
            uni.showToast({ title: '订单创建失败', icon: 'none' });
            uni.redirectTo({ url: '/pages/order/order' });
        }
    },

    onUnload() {
        if (this.interval) clearInterval(this.interval);
    },

    onShow() {
        if (this.isOfflinePending && this.token && this.couponsLoaded) {
            this.loadMyCoupons();
        }
    },

    methods: {
        ...mapActions(['getUserInfo', 'loginAndRegister']),

        formatMoney(amount) {
            return (Number(amount || 0) / 100).toFixed(2);
        },

        formatAddonName(name) {
            return String(name || '').replace(/^[^\u4e00-\u9fa5A-Za-z0-9]+/g, '').trim();
        },

        normalizeOrderGoodsInfo(order) {
            if (!order) return;
            if (order.goodsInfo) return;
            if (typeof order.goods_info === 'string') {
                try {
                    order.goodsInfo = JSON.parse(order.goods_info || '{}');
                } catch (e) {
                    order.goodsInfo = {};
                }
            } else {
                order.goodsInfo = order.goods_info || {};
            }
        },

        initPayment(options) {
            this.normalizeOrderGoodsInfo(this.order);
            this.entry = (options && options.entry) || '1';
            if (this.token && !this.userInfo) {
                this.getUserInfo(true).catch(function() {});
            }
            this.payMethod = this.canUseBalance ? 'balance' : 'wechat';
            this.startCountdown();
            if (this.order && this.order.order_type === 4 && this.order.order_status === 0) {
                this.loadMyCoupons();
            }
        },

        loadOrderByNumber(orderNumber) {
            var _this = this;
            var token = uni.getStorageSync('token');
            if (!token) {
                uni.showLoading({ title: '登录中...' });
                this.loginAndRegister().then(function() {
                    uni.hideLoading();
                    _this.loadOrderByNumber(orderNumber);
                }).catch(function() {
                    uni.hideLoading();
                    uni.showToast({ title: '登录失败', icon: 'none' });
                    uni.redirectTo({ url: '/pages/order/order' });
                });
                return;
            }
            if (!this.token) {
                this.$store.commit('setToken', token);
            }
            uni.showLoading({ title: '加载中...' });
            AUTH.getOrderList(-1, token).then(function(res) {
                uni.hideLoading();
                if (!res || !res.data) {
                    uni.showToast({ title: '订单加载失败', icon: 'none' });
                    uni.redirectTo({ url: '/pages/order/order' });
                    return;
                }
                var orders = res.data.orders || [];
                var order = orders.find(function(o) { return o.order_number === orderNumber; });
                if (!order) {
                    uni.showToast({ title: '订单不存在', icon: 'none' });
                    uni.redirectTo({ url: '/pages/order/order' });
                    return;
                }
                _this.normalizeOrderGoodsInfo(order);
                _this.order = order;
                _this.initPayment({ entry: '3' });
            }).catch(function(err) {
                uni.hideLoading();
                uni.showToast({ title: '加载失败', icon: 'none' });
                uni.redirectTo({ url: '/pages/order/order' });
            });
        },

        async loadMyCoupons() {
            if (!this.token) return;
            this.couponsLoaded = false;
            try {
                const results = await Promise.all([
                    AUTH.getMyCoupons(this.token, 0),
                    AUTH.getCouponList(this.token).catch(function() { return null; })
                ]);
                const ownedRes = results[0];
                const claimableRes = results[1];
                const coupons = ownedRes && ownedRes._status === 0 ? (ownedRes.data || []) : (Array.isArray(ownedRes) ? ownedRes : []);
                this.myCoupons = COUPON.normalizeCoupons(coupons);
                const claimableList = claimableRes && claimableRes._status === 0 ? (claimableRes.data || []) : [];
                this.claimableCoupons = claimableList
                    .filter(this.isCouponClaimable)
                    .filter(function(item) { return item.coupon_type !== 'gift'; })
                    .map(this.normalizeClaimableCoupon);
                // 如果订单已有券，选中它
                const couponId = (this.order && this.order.goodsInfo && (this.order.goodsInfo._coupon_id || this.order.goodsInfo.coupon_id));
                if (couponId) {
                    this.selectedCoupon = this.myCoupons.find(c => c.object_id === couponId) || null;
                }
            } catch (e) {
                console.log('load coupons error:', e);
            } finally {
                this.couponsLoaded = true;
            }
        },

        isCouponClaimable(item) {
            if (!item) return false;
            if (item.can_receive === false) return false;
            if (item.user_received) return false;
            return item.remaining_count !== 0;
        },

        normalizeClaimableCoupon(item) {
            const normalized = COUPON.normalizeCoupon(Object.assign({}, item, {
                object_id: 'campaign-' + item.campaign_id,
                status: 0,
                is_valid: true,
            }));
            normalized.template_id = item.object_id;
            normalized.campaign_id = item.campaign_id;
            return normalized;
        },

        async selectCoupon(coupon) {
            if (this.updatingCoupon) return;
            this.updatingCoupon = true;
            try {
                uni.showLoading({ title: '更新中...' });
                const res = await AUTH.updateOrderCoupon(this.token, {
                    order_number: this.order.order_number,
                    coupon_id: coupon ? coupon.object_id : null,
                });
                uni.hideLoading();
                if (!res) return;
                if (res._status !== undefined && res._status !== 0) {
                    throw new Error(res._reason || '更新优惠券失败');
                }
                const payload = res.data || {};
                const nextPayAmount = Number(payload.pay_amount);
                if (!isFinite(nextPayAmount)) {
                    throw new Error('更新优惠券失败');
                }
                this.$set(this.order, 'pay_amount', nextPayAmount);
                const goodsInfo = this.order.goodsInfo || {};
                if (!this.order.goodsInfo) {
                    this.$set(this.order, 'goodsInfo', goodsInfo);
                }
                this.$set(goodsInfo, '_coupon_id', payload.coupon_id);
                this.$set(goodsInfo, 'coupon_id', payload.coupon_id);
                this.$set(goodsInfo, '_coupon_discount', payload.coupon_discount || 0);
                if (goodsInfo.pricing) {
                    this.$set(goodsInfo.pricing, 'coupon_discount', payload.coupon_discount || 0);
                    this.$set(goodsInfo.pricing, 'final_amount', nextPayAmount);
                }
                this.selectedCoupon = coupon;
                this.payMethod = this.canUseBalance ? 'balance' : 'wechat';
                if (this.order.pay_amount === 0) {
                    this.payMethod = 'balance';
                }
                this.$forceUpdate();
            } catch (e) {
                uni.hideLoading();
                uni.showToast({ title: (e && e.message) || '更新优惠券失败', icon: 'none' });
            } finally {
                this.updatingCoupon = false;
            }
        },

        goReceiveCoupons() {
            uni.navigateTo({ url: '/pages/my/coupons/coupons?tab=available' });
        },

        startCountdown() {
            if (!(this.order && this.order.end_time)) return;
            const endTimeMs = this.order.end_time * 1000;
            const tick = () => {
                const now = Date.now();
                const left = Math.max(0, Math.floor((endTimeMs - now) / 1000));
                if (left <= 0) {
                    this.overtime = true;
                    if (this.interval) clearInterval(this.interval);
                    return;
                }
                const min = Math.floor(left / 60);
                const sec = left % 60;
                this.countdownText = min + '分' + sec + '秒';
            };
            tick();
            this.interval = setInterval(tick, 1000);
        },

        selectPay(method) {
            if (method === 'balance' && this.isRechargeOrder) {
                uni.showToast({ title: '充值订单只能使用微信支付', icon: 'none' });
                this.payMethod = 'wechat';
                return;
            }
            if (method === 'balance' && !this.canUseBalance) {
                // 余额不足时引导充值
                uni.showModal({
                    title: '余额不足',
                    content: `当前余额还差 ¥${this.formatMoney(this.balanceShortfall)}，是否去充值？`,
                    confirmText: '去充值',
                    cancelText: '取消',
                    success: (res) => {
                        if (res.confirm) {
                            uni.navigateTo({ url: '/pages/user/deposit/deposit' });
                        }
                    }
                });
                return;
            }
            this.payMethod = method;
        },
        
        doPay() {
            if (this.paying) return;
            // pay_amount 为 0 时，强制走余额支付完成订单。
            const isZeroPay = this.order && Number(this.order.pay_amount || 0) === 0 && !this.isRechargeOrder;
            if (this.payMethod === 'balance' || isZeroPay) {
                // 余额足够时直接扣款
                this.paying = true;
                uni.showLoading({ title: '支付中...' });
                AUTH.accountPay(this.token, {
                    order_number: this.order.order_number,
                }).then(res => {
                    uni.hideLoading();
                    this.paying = false;
                    uni.showToast({ title: '支付成功', icon: 'success' });
                    this.getUserInfo();
                    // 后台验证发起重新获取用户信息
                    this.syncOrderStatus();
                    this.goSuccess();
                }).catch((err) => {
                    uni.hideLoading();
                    this.paying = false;
                    const msg = err && err.message ? err.message : (err || '支付失败');
                    uni.showToast({ title: msg, icon: 'none' });
                });
            } else {
                this.platformPay();
            }
        },

        platformPay() {
            uni.showLoading({ title: '调起支付...' });
            this.paying = true;
            AUTH.platformPay(this.token, { order_number: this.order.order_number })
                .then(res => {
                    uni.hideLoading();
                    this.paying = false;
                    if (!res) return;
                    this.requestPayment(res);
                })
                .catch(() => {
                    uni.hideLoading();
                    this.paying = false;
                });
        },

        requestPayment(res) {
            var _this = this;
            var paymentData = res.data && res.data.payment ? res.data.payment : res.data;
            PLATFORM.requestPayment(paymentData).then(function() {
                _this.goSuccess();
            }).catch(function(err) {
                if (err && err.errMsg && err.errMsg.indexOf('cancel') >= 0) return;
                uni.showToast({ title: '支付失败', icon: 'none' });
            }).finally(function() {
                _this.getUserInfo();
            });
        },

        goSuccess() {
            const amount = (this.order && this.order.pay_amount) || 0;
            const id = (this.order && this.order.object_id) || '';
            const orderType = Number(this.order && this.order.order_type);
            let type = 'order';
            if (orderType === 5) {
                type = 'exchange';
            } else if (orderType === 6) {
                type = 'ticket';
            }
            uni.redirectTo({
                url: '/pages/pay/success/success?amount=' + amount + '&id=' + encodeURIComponent(id) + '&type=' + type
            });
        },



        syncOrderStatus() {
            var _this = this;
            AUTH.getOrderList(-1, this.token).then(function(res) {
                if (!res || !res.data) return;
                var orders = res.data.orders || [];
                var myOrder = orders.find(function(o) { return o.order_number === _this.order.order_number; });
                if (myOrder && myOrder.order_status === 1) {
                    _this.order.order_status = 1;
                }
            }).catch(function() {});
        },

        goBack() {
            uni.redirectTo({ url: '/pages/order/order' });
        },

        goOrderList() {
            uni.redirectTo({ url: '/pages/order/order' });
        },
    }
};
</script>

<style lang="scss">
$primary: #FF6432;
$gold: #FFB933;
$wechat: #07C160;
$dark: #333;
$gray: #999;
$light-gray: #E8E8E8;
$bg: #F5F6F7;

page {
    background: $bg;
    min-height: 100vh;
    padding-bottom: 120rpx;
}

.page {
    min-height: 100vh;
    background: $bg;
}

.status-bar-placeholder {
    height: 88rpx;
    background: #fff;
}

.nav-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    height: 88rpx;
    background: #fff;
    border-bottom: 1rpx solid $light-gray;

    .nav-back {
        position: absolute;
        left: 30rpx;
        font-size: 36rpx;
        color: $dark;
    }

    .nav-title {
        font-size: 32rpx;
        font-weight: bold;
        color: $dark;
    }
}

.overtime-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 80rpx 40rpx;

    .overtime-icon { font-size: 100rpx; margin-bottom: 24rpx; }
    .overtime-title { font-size: 36rpx; font-weight: bold; color: $dark; margin-bottom: 12rpx; }
    .overtime-sub { font-size: 28rpx; color: $gray; margin-bottom: 20rpx; }
    .overtime-order { font-size: 26rpx; color: $gray; margin-bottom: 60rpx; }
    .overtime-btn {
        background: $primary;
        color: #fff;
        padding: 20rpx 60rpx;
        border-radius: 60rpx;
        font-size: 30rpx;
    }
}

.amount-card {
    background: #fff;
    padding: 60rpx 40rpx 50rpx;
    text-align: center;
    border-radius: 0 0 40rpx 40rpx;
    box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.05);

    .amount-label {
        font-size: 28rpx;
        color: $gray;
        margin-bottom: 16rpx;
    }

    .amount-price {
        display: flex;
        align-items: baseline;
        justify-content: center;
        margin-bottom: 16rpx;

        .yuan {
            font-size: 36rpx;
            font-weight: bold;
            color: $primary;
            margin-right: 4rpx;
        }

        .price {
            font-size: 80rpx;
            font-weight: bold;
            color: $primary;
            line-height: 1;
        }
    }

    .order-no {
        font-size: 24rpx;
        color: $gray;
    }

    .order-info {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12rpx;
        margin-top: 20rpx;

        .info-tag {
            background: #FFF0E6;
            color: $primary;
            font-size: 22rpx;
            padding: 4rpx 16rpx;
            border-radius: 20rpx;
        }

        .info-text {
            font-size: 24rpx;
            color: $gray;
        }
    }
}

.order-detail-section {
    margin: 20rpx;
    background: #fff;
    border-radius: 20rpx;
    padding: 30rpx;

    .section-title {
        font-size: 28rpx;
        font-weight: bold;
        color: $dark;
        margin-bottom: 20rpx;
    }

    .detail-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12rpx 0;

        .detail-label {
            flex: 1;
            font-size: 26rpx;
            color: $gray;
        }

        .detail-value {
            font-size: 26rpx;
            color: $dark;
            font-weight: 500;

            &.plus {
                color: $primary;
            }
        }

        &.discount .detail-value {
            color: #52C41A;
        }
    }
}

.coupon-section {
    margin: 20rpx;
    background: #fff;
    border-radius: 20rpx;
    padding: 30rpx;

    .section-title {
        font-size: 28rpx;
        font-weight: bold;
        color: $dark;
        margin-bottom: 20rpx;
    }

    .coupon-list {
        display: flex;
        flex-direction: column;
        gap: 16rpx;
    }

    .coupon-item {
        display: flex;
        align-items: center;
        border: 2rpx solid #FFD4C4;
        border-radius: 16rpx;
        padding: 20rpx 24rpx;
        position: relative;

        &.selected {
            border-color: $primary;
            background: #FFF8F5;
        }

        &.no-coupon {
            border-style: dashed;
            justify-content: center;
        }

        .coupon-left {
            display: flex;
            flex-direction: column;
            align-items: center;
            min-width: 100rpx;

            .coupon-price {
                font-size: 32rpx;
                font-weight: bold;
                color: $primary;
            }

            .coupon-limit {
                font-size: 20rpx;
                color: $gray;
                margin-top: 4rpx;
            }
        }

        .coupon-right {
            flex: 1;
            margin-left: 24rpx;
            display: flex;
            flex-direction: column;

            .coupon-name {
                font-size: 26rpx;
                color: $dark;
            }

            .coupon-expire {
                font-size: 22rpx;
                color: $gray;
                margin-top: 4rpx;
            }
        }

        .coupon-check {
            width: 40rpx;
            height: 40rpx;
            border-radius: 50%;
            background: $primary;
            color: #fff;
            font-size: 24rpx;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .no-coupon-text {
            font-size: 26rpx;
            color: $gray;
        }
    }

    .coupon-tip {
        margin-top: 16rpx;
        font-size: 24rpx;
        color: $primary;
        text-align: center;
    }

    .coupon-loading,
    .coupon-empty {
        text-align: center;
        color: $gray;
        font-size: 26rpx;
        padding: 20rpx 0;
    }

    .coupon-receive-link {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 22rpx 24rpx;
        border: 2rpx dashed #FFD4C4;
        border-radius: 16rpx;
        background: #FFF8F5;

        .receive-title,
        .receive-sub {
            display: block;
        }

        .receive-title {
            font-size: 26rpx;
            color: $dark;
            font-weight: 600;
        }

        .receive-sub {
            margin-top: 6rpx;
            font-size: 22rpx;
            color: $gray;
        }

        .receive-action {
            color: $primary;
            font-size: 26rpx;
            font-weight: 600;
        }
    }
}

.pay-section {
    margin: 20rpx;
    background: #fff;
    border-radius: 20rpx;
    padding: 30rpx;

    .section-title {
        font-size: 28rpx;
        font-weight: bold;
        color: $dark;
        margin-bottom: 24rpx;
    }

    .pay-method {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 28rpx 20rpx;
        border-radius: 16rpx;
        border: 2rpx solid transparent;
        margin-bottom: 16rpx;
        transition: all 0.2s;
        background: #FAFAFA;

        &.active {
            border-color: $primary;
            background: #FFF8F5;
        }

        &.disabled {
            opacity: 0.6;
            background: #F5F5F5;
        }

        .method-left {
            display: flex;
            align-items: center;
            flex: 1;
        }

        .method-icon {
            width: 72rpx;
            height: 72rpx;
            border-radius: 16rpx;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 20rpx;

            image {
                width: 44rpx;
                height: 44rpx;
            }

            .icon-text {
                font-size: 24rpx;
                font-weight: bold;
                color: #fff;
            }
        }

        .method-info {
            .method-name {
                font-size: 30rpx;
                color: $dark;
                font-weight: 500;
                margin-bottom: 6rpx;
            }

            .method-desc {
                font-size: 24rpx;
                color: $gray;

                .insufficient-tip {
                    color: #FF4D4F;
                    font-size: 22rpx;
                }
            }
        }

        .method-check {
            .check-circle {
                width: 44rpx;
                height: 44rpx;
                border-radius: 50%;
                border: 3rpx solid $light-gray;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;

                &.active {
                    background: $primary;
                    border-color: $primary;
                    color: #fff;
                    font-size: 24rpx;
                }
            }
        }
    }
}

.tips-section {
    margin: 20rpx 32rpx;

    .tip-item {
        font-size: 24rpx;
        color: $gray;
        margin-bottom: 8rpx;
        display: flex;
        align-items: center;

        .tip-dot { margin-right: 8rpx; }
        .tip-highlight { color: $primary; font-weight: bold; }
    }
}

.bottom-bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    height: 100rpx;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 30rpx;
    box-shadow: 0 -2rpx 10rpx rgba(0,0,0,0.05);
    z-index: 900;

    .bottom-info {
        display: flex;
        align-items: baseline;

        .bottom-label { font-size: 26rpx; color: $gray; }
        .bottom-price {
            font-size: 44rpx;
            font-weight: bold;
            color: $primary;
            margin-left: 8rpx;
        }
    }

    .pay-btn {
        width: 240rpx;
        height: 80rpx;
        background: $primary;
        color: #fff;
        border-radius: 40rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 30rpx;
        font-weight: bold;

        &.disabled { background: #CCC; }
    }
}


</style>
