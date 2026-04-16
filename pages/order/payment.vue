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
            <view class="overtime-order">订单号：{{ order.order_number }}</view>
            <view class="overtime-btn" @click="goOrderList">返回订单列表</view>
        </view>

        <block v-else>
            <!-- 金额卡片 -->
            <view class="amount-card">
                <view class="amount-label">需支付</view>
                <view class="amount-price">
                    <text class="yuan">¥</text>
                    <text class="price">{{ (order.pay_amount / 100).toFixed(2) }}</text>
                </view>
                <view class="order-no">订单号 {{ order.order_number }}</view>
                <view class="order-info" v-if="order.order_type === 4">
                    <text class="info-tag">线下消费</text>
                    <text class="info-text">{{ order.goodsInfo?.room_name }} · {{ order.goodsInfo?.duration }}分钟 · {{ order.goodsInfo?.user_count }}人</text>
                </view>
            </view>

            <!-- 优惠券（仅线下待付款订单） -->
            <view class="coupon-section" v-if="isOfflinePending && myCoupons.length > 0">
                <view class="section-title">使用优惠券</view>
                <view class="coupon-list">
                    <view
                        class="coupon-item"
                        :class="{ selected: selectedCoupon && selectedCoupon.object_id === c.object_id }"
                        v-for="c in availableCoupons"
                        :key="c.object_id"
                        @click="selectCoupon(c)"
                    >
                        <view class="coupon-left">
                            <text class="coupon-price">¥{{ (c.discount / 100).toFixed(0) }}</text>
                            <text class="coupon-limit">{{ c.min_consume > 0 ? '满' + (c.min_consume / 100).toFixed(0) + '元' : '无门槛' }}</text>
                        </view>
                        <view class="coupon-right">
                            <text class="coupon-name">{{ c.name }}</text>
                            <text class="coupon-expire">有效期至 {{ c.expire_time }}</text>
                        </view>
                        <view class="coupon-check" v-if="selectedCoupon && selectedCoupon.object_id === c.object_id">✓</view>
                    </view>
                    <view class="coupon-item no-coupon" :class="{ selected: !selectedCoupon }" @click="selectCoupon(null)">
                        <text class="no-coupon-text">不使用优惠券</text>
                        <view class="coupon-check" v-if="!selectedCoupon">✓</view>
                    </view>
                </view>
                <view class="coupon-tip" v-if="selectedCoupon">已选：{{ selectedCoupon.name }}，优惠 {{ couponDiscountText }}</view>
            </view>
            <view class="coupon-section" v-else-if="isOfflinePending">
                <view class="section-title">使用优惠券</view>
                <view class="coupon-loading" v-if="!couponsLoaded">加载中...</view>
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

                <view class="pay-method" :class="payMethod === 'balance' ? 'active' : ''" @click="selectPay('balance')">
                    <view class="method-left">
                        <view class="method-icon" style="background:#FFB933;">
                            <text class="icon-text">余额</text>
                        </view>
                        <view class="method-info">
                            <view class="method-name">余额支付</view>
                            <view class="method-desc">可用余额 ¥{{ (userInfo.account_balance / 100).toFixed(2) }}</view>
                        </view>
                    </view>
                    <view class="method-check">
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
                    <text class="bottom-price">¥{{ (order.pay_amount / 100).toFixed(2) }}</text>
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

export default {
    data() {
        return {
            order: null,
            entry: '1',
            overtime: false,
            countdownText: '',
            payMethod: 'wechat',
            paying: false,
            interval: null,
            // 优惠券相关
            myCoupons: [],
            selectedCoupon: null,
            couponsLoaded: false,
            updatingCoupon: false,
        };
    },

    computed: {
        ...mapState(['hasLogin', 'userInfo', 'token']),
        canUseBalance() {
            return this.userInfo && this.userInfo.account_balance > 0;
        },

        // 是否为线下待付款订单
        isOfflinePending() {
            return this.order && this.order.order_type === 4 && this.order.order_status === 0;
        },

        // 可用优惠券（订单相关）
        availableCoupons() {
            if (!this.order) return [];
            const originalAmount = this.order.goodsInfo?._total_original || this.order.pay_amount;
            return this.myCoupons.filter(c => {
                if (c.status !== 'unused') return false;
                if (c.min_consume > 0 && originalAmount < c.min_consume) return false;
                return true;
            });
        },

        couponDiscountText() {
            if (!this.selectedCoupon) return '';
            return '-' + (this.selectedCoupon.discount / 100).toFixed(2) + '元';
        },
    },

    onLoad(options) {
        if (!options.data || options.data === 'null') {
            uni.showToast({ title: '订单创建失败', icon: 'none' });
            uni.redirectTo({ url: '/pages/order/order' });
            return;
        }
        try {
            this.order = JSON.parse(decodeURIComponent(options.data));
        } catch(e) {
            this.order = null;
        }
        if (!this.order || !this.order.pay_amount) {
            uni.showToast({ title: '订单创建失败', icon: 'none' });
            uni.redirectTo({ url: '/pages/order/order' });
            return;
        }
        this.entry = options.entry || '1';
        // 如果下单时选择了余额支付且余额够用，默认用余额
        if (options.useBalance === '1' && this.canUseBalance) {
            this.payMethod = 'balance';
        }
        this.startCountdown();

        // 线下待付款订单：加载优惠券
        if (this.order && this.order.order_type === 4 && this.order.order_status === 0) {
            this.loadMyCoupons();
        }
    },

    onUnload() {
        if (this.interval) clearInterval(this.interval);
    },

    methods: {
        ...mapActions(['getUserInfo']),

        async loadMyCoupons() {
            if (!this.token) return;
            try {
                const res = await AUTH.getMyCoupons(this.token);
                if (res && res.length > 0) {
                    // 适配后端 coupon_type+rules 格式
                    this.myCoupons = res.map(c => {
                        let discount = 0;
                        if (c.coupon_type === 'rebate') {
                            discount = c.rules?.discount || 0;
                        } else if (c.coupon_type === 'discount') {
                            discount = 0; // 折扣券不展示固定金额
                        }
                        return {
                            object_id: c.object_id,
                            name: c.name,
                            discount,
                            coupon_type: c.coupon_type,
                            rules: c.rules,
                            min_consume: c.min_consume,
                            expire_time: c.expire_time,
                            status: c.status === 0 ? 'unused' : (c.status === 1 ? 'used' : 'expired'),
                        };
                    });
                }
                // 如果订单已有券，选中它
                const couponId = this.order?.goodsInfo?._coupon_id;
                if (couponId) {
                    this.selectedCoupon = this.myCoupons.find(c => c.object_id === couponId) || null;
                }
            } catch (e) {
                console.log('load coupons error:', e);
            } finally {
                this.couponsLoaded = true;
            }
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
                // 更新订单应付金额
                this.order.pay_amount = res.data.pay_amount;
                // 更新goodsInfo中的优惠券信息
                if (this.order.goodsInfo) {
                    this.order.goodsInfo._coupon_id = res.data.coupon_id;
                    this.order.goodsInfo._coupon_discount = res.data.coupon_discount;
                    this.order.goodsInfo.use_balance = res.data.balance_used;
                    this.order.goodsInfo.use_points = res.data.points_used;
                }
                this.selectedCoupon = coupon;
                // 重新计算支付方式
                if (this.order.pay_amount === 0) {
                    this.payMethod = 'balance';
                }
            } catch (e) {
                uni.hideLoading();
                uni.showToast({ title: (e && e.message) || '更新优惠券失败', icon: 'none' });
            } finally {
                this.updatingCoupon = false;
            }
        },

        startCountdown() {
            if (!this.order?.end_time) return;
            const endTime = new Date(this.order.end_time).getTime() / 1000;
            const tick = () => {
                const now = Date.now() / 1000;
                const left = Math.max(0, Math.floor(endTime - now));
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
            this.payMethod = method;
        },
        
        doPay() {
            if (this.paying) return;
            if (this.payMethod === 'balance') {
                // 余额足够时直接扣款
                this.paying = true;
                uni.showLoading({ title: '支付中...' });
                AUTH.accountPay(this.token, {
                    order_number: this.order.order_number,
                }).then(res => {
                    uni.hideLoading();
                    this.paying = false;
                    if (!res) return;
                    uni.showToast({ title: '支付成功', icon: 'success' });
                    setTimeout(() => {
                        uni.redirectTo({ url: '/pages/order/detail?status=4&id=' + this.order.object_id });
                    }, 1500);
                    this.getUserInfo();
                }).catch((err) => {
                    uni.hideLoading();
                    this.paying = false;
                    const msg = err && err.message ? err.message : (err || '支付失败');
                    uni.showToast({ title: msg, icon: 'none' });
                });
            } else {
                this.weixinPay();
            }
        },

        weixinPay() {
            uni.showLoading({ title: '调起支付...' });
            this.paying = true;
            AUTH.wxPay(this.token, { order_number: this.order.order_number })
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
            const _this = this;
            wx.requestPayment({
                timeStamp: res.data.timeStamp,
                nonceStr: res.data.nonceStr,
                package: res.data.package,
                signType: res.data.signType,
                paySign: res.data.sign,
                success: function(res) {
                    uni.redirectTo({ url: '/pages/order/detail?status=4&id=' + _this.order.object_id });
                },
                fail: function(err) {
                    if (err.errMsg && err.errMsg.indexOf('cancel') >= 0) return;
                    uni.showToast({ title: '支付失败', icon: 'none' });
                },
                complete: () => { this.getUserInfo(); }
            });
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
