<template>
    <view class="page">
        <!-- 顶部状态栏占位 -->
        <view class="status-bar-placeholder"></view>

        <!-- 店铺信息头部 -->
        <view class="shop-header">
            <view class="shop-logo">
                <image src="/static/logo_small.jpg" mode="aspectFill" />
            </view>
            <view class="shop-info">
                <text class="shop-name">摸鱼划水吧</text>
                <text class="shop-tag">桌游 · 棋牌 · 休闲</text>
            </view>
        </view>

        <!-- 房间信息卡片 -->
        <view class="room-card">
            <view class="room-top">
                <view class="room-name">{{ currentProduct.name || '房间' }}</view>
                <view class="room-badge">{{ memberLevelName }}</view>
            </view>
            <view class="room-details">
                <text class="detail-item">📅 {{ selectDate }}</text>
                <view class="time-slots">
                    <view class="time-slot-chip" v-for="(t, idx) in selectTimes" :key="idx">{{ t }}</view>
                </view>
            </view>
            <view class="people-modifier">
                <text class="modifier-label">👥 人数</text>
                <view class="stepper">
                    <view class="stepper-btn" @click="decPeople">-</view>
                    <text class="stepper-num">{{ numOfPeople }}</text>
                    <view class="stepper-btn" @click="incPeople">+</view>
                </view>
            </view>
            <view class="room-prices">
                <view class="price-row">
                    <text class="price-label">包厢 {{ (currentProduct.price_per_hour / 100).toFixed(0) }}/小时 × {{ selectTimes.length }}时段</text>
                    <text class="price-value">¥{{ roomPrice }}</text>
                </view>
                <view class="price-row" v-if="numOfPeople > 0">
                    <text class="price-label">入场券 × {{ numOfPeople }}人</text>
                    <text class="price-value">¥{{ peoplePrice }}</text>
                </view>
            </view>
        </view>

        <!-- 价格明细 -->
        <view class="price-section">
            <view class="section-title">费用明细</view>
            <view class="price-list">
                <!-- 商品金额 -->
                <view class="price-row">
                    <text class="row-label">商品金额</text>
                    <text class="row-value">¥{{ originalPrice }}</text>
                </view>

                <!-- 会员折扣 -->
                <view class="price-row discount-row">
                    <text class="row-label">
                        <text class="tag">会员</text>
                        {{ memberLevelName }}{{ memberDiscount > 0 ? '专享' + memberDiscount + '折' : '暂无折扣' }}
                    </text>
                    <text class="row-value discount">-¥{{ memberDiscountAmount }}</text>
                </view>

                <!-- 积分兑换 -->
                <view class="price-row" v-if="userInfo.points > 0">
                    <view class="points-section">
                        <view class="points-header">
                            <text class="row-label">
                                <text class="tag">积分</text>
                                当前{{ userInfo.points }}积分，抵¥{{ (userInfo.points / 100).toFixed(2) }}
                            </text>
                            <switch 
                                color="#FFCC33" 
                                :checked="usePoints" 
                                @change="togglePoints"
                                :disabled="!canUsePoints"
                            />
                        </view>
                        <view class="points-slider" v-if="usePoints && canUsePoints">
                            <slider 
                                :value="pointsToUse" 
                                :min="0" 
                                :max="maxUsablePoints" 
                                :step="100"
                                activeColor="#FFCC33"
                                backgroundColor="#E0E0E0"
                                block-size="18"
                                @change="onPointsChange"
                            />
                            <view class="points-input-row">
                                <input 
                                    type="number" 
                                    v-model="pointsInput" 
                                    class="points-input"
                                    :min="0"
                                    :max="maxUsablePoints"
                                    @blur="onPointsInputBlur"
                                />
                                <text class="points-unit">积分</text>
                                <text class="points-convert">可抵 ¥{{ pointsConvertMoney }}</text>
                            </view>
                        </view>
                    </view>
                    <text class="row-value" v-if="usePoints && pointsToUse > 0">-¥{{ pointsConvertMoney }}</text>
                </view>

                <!-- 无积分时提示 -->
                <view class="price-row points-zero-row" v-else>
                    <text class="row-label">
                        <text class="tag">积分</text>
                        当前0积分，消费预约可获取积分
                    </text>
                </view>

                <!-- 优惠券 -->
                <view class="price-row coupon-row" @click="openCouponPicker">
                    <text class="row-label">
                        <text class="tag" :class="selectedCoupon ? 'tag-active' : 'tag-gray'">券</text>
                        {{ selectedCoupon ? selectedCoupon.name : '优惠券' }}
                    </text>
                    <view class="coupon-right">
                        <text class="coupon-value" v-if="selectedCoupon">
                            -¥{{ couponDiscount }}
                        </text>
                        <text class="cell-more yticon" :class="selectedCoupon ? 'icon-you' : 'icon-you'">
                            {{ selectedCoupon ? '已选' : '未使用' }}
                        </text>
                    </view>
                </view>

                <!-- 余额支付 -->
                <view class="price-row balance-row">
                    <text class="row-label">
                        <text class="tag" :class="useBalance && canUseBalance ? 'tag-active' : 'tag-gray'">余额</text>
                        账户余额 ¥{{ (userInfo.account_balance / 100).toFixed(2) }}
                    </text>
                    <view class="balance-right">
                        <text class="balance-insufficient" v-if="!canUseBalance && balanceAfterAll > 0">
                            余额不足，还需¥{{ (balanceAfterAll / 100).toFixed(2) }}
                        </text>
                        <switch 
                            color="#FFCC33" 
                            :checked="useBalance && canUseBalance" 
                            @change="toggleBalance"
                            :disabled="!canUseBalance"
                        />
                    </view>
                </view>
                <view class="balance-hint" v-if="!canUseBalance && balanceAfterAll > 0" @click="goRecharge">
                    <text class="hint-text">余额不足？去</text>
                    <text class="hint-link">充值</text>
                    <text class="hint-text"> →</text>
                </view>

                <!-- 分隔线 -->
                <view class="divider"></view>

                <!-- 实付金额 -->
                <view class="price-row final-row">
                    <text class="row-label">实付款</text>
                    <text class="final-price">¥{{ actualPrice }}</text>
                </view>
            </view>
        </view>

        <!-- 备注 -->
        <view class="remark-section">
            <text class="remark-label">备注</text>
            <input 
                class="remark-input" 
                v-model="desc" 
                placeholder="有特殊需求请备注（选填）" 
                placeholder-class="placeholder"
            />
        </view>

        <!-- 底部提交栏 -->
        <view class="bottom-bar">
            <view class="bottom-info">
                <text class="bottom-label">实付款</text>
                <text class="bottom-price">¥{{ actualPrice }}</text>
                <text class="bottom-points" v-if="usePoints && pointsToUse > 0">（含{{ pointsToUse }}积分）</text>
            </view>
            <view class="submit-btn" :class="submitting ? 'btn-disabled' : ''" @click="submitOrder">
                <text v-if="!submitting">提交订单</text>
                <text v-else>提交中...</text>
            </view>
        </view>

        <!-- 优惠券选择面板 -->
        <view class="mask" :class="couponPickerOpen ? 'show' : 'hide'" @click="closeCouponPicker">
            <view class="coupon-picker" :class="couponPickerOpen ? 'show' : ''" @click.stop>
                <view class="picker-header">
                    <text class="picker-title">选择优惠券</text>
                    <text class="picker-close yticon icon-guanbi" @click="closeCouponPicker"></text>
                </view>
                <scroll-view scroll-y class="picker-body">
                    <!-- 不可用提示 -->
                    <view class="unavailable-hint" v-if="availableCoupons.length === 0 && unavailableCoupons.length === 0">
                        <text>暂无可用优惠券</text>
                    </view>
                    <!-- 可用券 -->
                    <view class="coupon-group-title" v-if="availableCoupons.length > 0">可用优惠券</view>
                    <view 
                        class="coupon-card" 
                        v-for="c in availableCoupons" 
                        :key="c.object_id"
                        :class="selectedCoupon && selectedCoupon.object_id === c.object_id ? 'selected' : ''"
                        @click="selectCoupon(c)"
                    >
                        <view class="coupon-left">
                            <text class="coupon-price">¥{{ c.discount }}</text>
                            <text class="coupon-limit">{{ c.min_consume > 0 ? `满${c.min_consume / 100}元可用` : '无门槛' }}</text>
                        </view>
                        <view class="coupon-right">
                            <view class="coupon-name">{{ c.name }}</view>
                            <view class="coupon-expire">有效期至 {{ c.expire_time }}</view>
                            <view class="coupon-check" v-if="selectedCoupon && selectedCoupon.object_id === c.object_id">✓</view>
                        </view>
                    </view>
                    <!-- 不可用券 -->
                    <view class="coupon-group-title" v-if="unavailableCoupons.length > 0">不可用优惠券</view>
                    <view 
                        class="coupon-card disabled" 
                        v-for="c in unavailableCoupons" 
                        :key="c.object_id"
                    >
                        <view class="coupon-left">
                            <text class="coupon-price">¥{{ c.discount }}</text>
                            <text class="coupon-limit">{{ c.disable_reason }}</text>
                        </view>
                        <view class="coupon-right">
                            <view class="coupon-name">{{ c.name }}</view>
                            <view class="coupon-expire">有效期至 {{ c.expire_time }}</view>
                        </view>
                    </view>
                    <!-- 不使用优惠券选项 -->
                    <view class="no-coupon" @click="selectCoupon(null)">
                        <text>不使用优惠券</text>
                        <view class="coupon-check" v-if="!selectedCoupon">✓</view>
                    </view>
                </scroll-view>
            </view>
        </view>
    </view>
</template>

<script>
import { mapState, mapActions } from 'vuex';
import AUTH from '../../utils/auth.js';

export default {
    data() {
        return {
            currentProduct: null,
            currentSelectDate: null,
            selectTimes: [],
            numOfPeople: 2,
            singlePersonPrice: 0,
            desc: '',

            // 优惠券
            couponPickerOpen: false,
            myCoupons: [],       // {object_id, name, discount, min_consume, expire_time, status, status_text}
            selectedCoupon: null,

            // 积分
            usePoints: false,
            pointsInput: '0',
            pointsToUse: 0,

            // 余额
            useBalance: true,

            // 提交状态
            submitting: false,
        };
    },

    computed: {
        ...mapState(['hasLogin', 'token', 'userInfo']),

        selectDate() {
            return this.currentSelectDate || '';
        },

        selectTimesStr() {
            if (this.selectTimes.length === 0) return '';
            return this.selectTimes.join(', ');
        },

        // 原始价格（分）
        roomPriceFen() {
            if (!this.currentProduct) return 0;
            return this.currentProduct.price_per_hour * this.selectTimes.length;
        },

        peoplePriceFen() {
            return this.singlePersonPrice * this.numOfPeople;
        },

        originalPriceFen() {
            return this.roomPriceFen + this.peoplePriceFen;
        },

        originalPrice() {
            return (this.originalPriceFen / 100).toFixed(2);
        },

        roomPrice() {
            return (this.roomPriceFen / 100).toFixed(2);
        },

        peoplePrice() {
            return (this.peoplePriceFen / 100).toFixed(2);
        },

        // 会员等级
        memberLevel() {
            return this.userInfo.member_level || 0;
        },

        memberLevelName() {
            const names = ['普通会员', '🌱 青铜', '🥈 白银', '🥇 黄金', '💎 钻石'];
            return names[this.memberLevel] || '';
        },

        // 会员折扣（厘，1000=10折, 810=8.1折）
        memberDiscountRate() {
            const rates = [0, 900, 850, 800, 750]; // 青铜9折, 白银8.5折, 黄金8折, 钻石7.5折
            return rates[this.memberLevel] || 0;
        },

        memberDiscount() {
            return (this.memberDiscountRate / 100).toFixed(1);
        },

        // 会员折扣金额（分）
        memberDiscountAmountFen() {
            if (!this.memberDiscountRate) return 0;
            return Math.round(this.originalPriceFen * (1 - this.memberDiscountRate / 1000));
        },

        memberDiscountAmount() {
            return (this.memberDiscountAmountFen / 100).toFixed(2);
        },

        // 折后价格（分）
        afterMemberPriceFen() {
            return this.originalPriceFen - this.memberDiscountAmountFen;
        },

        // 积分相关
        maxUsablePoints() {
            // 最多用积分抵扣剩余金额
            const maxByMoney = this.afterMemberPriceFen; // 1积分 = 0.01元 = 1分
            return Math.min(this.userInfo.points || 0, maxByMoney, 10000); // 上限10000积分
        },

        canUsePoints() {
            return this.userInfo.points > 0 && this.afterMemberPriceFen > 0;
        },

        pointsConvertMoney() {
            return (this.pointsToUse / 100).toFixed(2);
        },

        // 积分抵扣后剩余（分）
        afterPointsPriceFen() {
            if (!this.usePoints) return this.afterMemberPriceFen;
            return Math.max(0, this.afterMemberPriceFen - this.pointsToUse);
        },

        // 优惠券相关
        couponDiscount() {
            if (!this.selectedCoupon) return '0.00';
            return (this.selectedCoupon.discount / 100).toFixed(2);
        },

        // 优惠券减免后（分）
        afterCouponPriceFen() {
            if (!this.selectedCoupon) return this.afterPointsPriceFen;
            return Math.max(0, this.afterPointsPriceFen - this.selectedCoupon.discount);
        },

        // 可用/不可用优惠券
        availableCoupons() {
            const priceAfterPoints = this.afterPointsPriceFen;
            return this.myCoupons.filter(c => {
                if (c.status !== 'unused') return false;
                if (c.min_consume > 0 && priceAfterPoints < c.min_consume) return false;
                return true;
            }).map(c => ({ ...c, discount: c.discount || 0 }));
        },

        unavailableCoupons() {
            const priceAfterPoints = this.afterPointsPriceFen;
            return this.myCoupons.filter(c => {
                if (c.status !== 'unused') return true;
                if (c.min_consume > 0 && priceAfterPoints < c.min_consume) {
                    c.disable_reason = `需满${(c.min_consume / 100).toFixed(0)}元`;
                    return true;
                }
                return false;
            });
        },

        // 余额相关
        balanceFen() {
            return this.userInfo.account_balance || 0;
        },

        canUseBalance() {
            return this.balanceFen > 0;
        },

        // 余额抵扣后剩余（分）
        afterBalancePriceFen() {
            if (!this.useBalance || !this.canUseBalance) return this.afterCouponPriceFen;
            return Math.max(0, this.afterCouponPriceFen - this.balanceFen);
        },

        // 余额不足以支付时，余额不足金额
        balanceAfterAll() {
            if (this.afterCouponPriceFen <= 0) return 0;
            return Math.max(0, this.afterCouponPriceFen - this.balanceFen);
        },

        // 最终实付金额（分）
        finalPriceFen() {
            if (this.useBalance && this.canUseBalance) {
                return Math.min(this.balanceFen, this.afterCouponPriceFen);
            }
            return this.afterCouponPriceFen;
        },

        actualPrice() {
            return (this.finalPriceFen / 100).toFixed(2);
        },

        submitDisabled() {
            return this.submitting || this.finalPriceFen <= 0;
        },
    },

    onLoad(option) {
        const roomData = this.$store.state.currentRoom || {};
        const selectItem = this.$store.state.currentSelectItem || {};
        this.currentProduct = Object.keys(selectItem).length ? selectItem : roomData;

        // 日期兜底
        if (!this.currentSelectDate) {
            const d = new Date();
            this.currentSelectDate = d.getFullYear() + '-' + (d.getMonth() + 1).toString().padStart(2, '0') + '-' + d.getDate().toString().padStart(2, '0');
        }

        const selects = selectItem.selects || roomData.selects || [];

        this.selectTimes = [];
        for (let i = 0; i < selects.length; i++) {
            const [begin_time = '', end_time = ''] = selects[i];
            if (!begin_time || !end_time) continue;
            const bParts = begin_time.split(' ');
            const eParts = end_time.split(' ');
            if (bParts.length < 2 || eParts.length < 2) continue;
            const [begin_date, pre_time] = bParts;
            const [end_date, next_time] = eParts;
            this.currentSelectDate = begin_date;
            const pre = pre_time.slice(0, -3);  // 去掉末尾 :00
            const next = next_time.slice(0, -3);
            this.selectTimes.push(`${pre}~${next}`);
        }

        this.singlePersonPrice = this.currentProduct.price_per_person || 0;
        this.loadMyCoupons();
    },

    methods: {
        ...mapActions(['getUserInfo']),

        // 加载我的优惠券
        async loadMyCoupons() {
            if (!this.token) return;
            try {
                const res = await AUTH.getMyCoupons(this.token);
                if (res && res.length > 0) {
                    this.myCoupons = res;
                }
            } catch (e) {
                console.log('load coupons error:', e);
            }
        },

        // 打开优惠券选择面板
        openCouponPicker() {
            this.couponPickerOpen = true;
        },

        closeCouponPicker() {
            this.couponPickerOpen = false;
        },

        // 选择优惠券
        selectCoupon(coupon) {
            this.selectedCoupon = coupon;
            this.couponPickerOpen = false;
        },

        // 人数增减
        incPeople() {
            if (this.numOfPeople < 10) this.numOfPeople++;
        },
        decPeople() {
            if (this.numOfPeople > 1) this.numOfPeople--;
        },

        // 切换积分使用
        togglePoints(e) {
            this.usePoints = e.detail.value;
            if (!this.usePoints) {
                this.pointsToUse = 0;
                this.pointsInput = '0';
            } else {
                // 默认使用最大可用积分
                this.pointsToUse = this.maxUsablePoints;
                this.pointsInput = String(this.pointsToUse);
            }
        },

        onPointsChange(e) {
            this.pointsToUse = e.detail.value;
            this.pointsInput = String(this.pointsToUse);
        },

        onPointsInputBlur(e) {
            let val = parseInt(e.detail.value) || 0;
            val = Math.max(0, Math.min(val, this.maxUsablePoints));
            this.pointsToUse = val;
            this.pointsInput = String(val);
        },

        // 切换余额支付
        toggleBalance(e) {
            if (!this.canUseBalance) return;
            this.useBalance = e.detail.value;
        },

        // 余额不足去充值
        goRecharge() {
            uni.navigateTo({ url: '/pages/user/deposit/deposit' });
        },

        // 提交订单
        async submitOrder() {
            if (this.submitDisabled) return;
            this.submitting = true;

            try {
                // 构建时间列表
                const timeList = [];
                this.currentProduct.selects.forEach(item => {
                    const interval = [];
                    const [, pre_time] = item[0].split(' ');
                    const [, next_time] = item[1].split(' ');
                    const pre = pre_time.slice(0, -3);
                    const next = next_time.slice(0, -3);
                    interval.push(parseInt(pre));
                    interval.push(parseInt(next));
                    timeList.push(interval);
                });

                const param = {
                    order_type: 1,
                    room_id: this.currentProduct.object_id,
                    contact_name: this.userInfo.nickname || this.userInfo.username,
                    user_count: this.numOfPeople,
                    date: this.currentSelectDate,
                    time_list: timeList,
                    remark: this.desc,
                    use_points: this.usePoints ? this.pointsToUse : 0,
                    use_balance: this.useBalance && this.canUseBalance ? 1 : 0,
                    coupon_id: this.selectedCoupon ? this.selectedCoupon.object_id : null,
                };

                const res = await AUTH.checkout(this.token, param);
                if (!res) {
                    uni.hideLoading();
                    this.submitting = false;
                    return;
                }

                const orderNumber = res.data.order_number;
                const payAmount = res.data.pay_amount || 0;

                // 如果实付为0（余额/积分全覆盖），直接跳转成功
                if (payAmount === 0) {
                    uni.redirectTo({ url: `/pages/order/detail?status=4&id=${res.data.object_id}` });
                    return;
                }

                // 有金额需支付，跳转支付页面
                uni.redirectTo({
                    url: `/pages/order/payment?parent_sn=${orderNumber}&entry=1&useBalance=${this.useBalance ? 1 : 0}&data=${encodeURIComponent(JSON.stringify(res.data))}`
                });
            } catch (e) {
                console.error('submit order error:', e);
                uni.showToast({ title: '创建订单失败', icon: 'none' });
            } finally {
                this.submitting = false;
            }
        },
    }
};
</script>

<style lang="scss">
$page-color: #F5F6F7;
$primary: #FF6432;
$gold: #FFB933;
$dark: #333;
$gray: #999;
$light-gray: #E8E8E8;

page {
    background: $page-color;
    padding-bottom: 120rpx;
}

.page {
    min-height: 100vh;
    background: $page-color;
}

.status-bar-placeholder {
    height: 88rpx;
    background: #fff;
}

// 店铺头部
.shop-header {
    display: flex;
    align-items: center;
    padding: 20rpx 30rpx;
    background: #fff;

    .shop-logo {
        width: 80rpx;
        height: 80rpx;
        border-radius: 50%;
        overflow: hidden;
        margin-right: 20rpx;
        image { width: 100%; height: 100%; }
    }

    .shop-info {
        display: flex;
        flex-direction: column;
        .shop-name { font-size: 32rpx; font-weight: bold; color: $dark; }
        .shop-tag { font-size: 24rpx; color: $gray; margin-top: 4rpx; }
    }
}

// 房间卡片
.room-card {
    margin: 20rpx;
    padding: 30rpx;
    background: #fff;
    border-radius: 20rpx;

    .room-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16rpx;
        .room-name { font-size: 32rpx; font-weight: bold; color: $dark; }
        .room-badge {
            font-size: 22rpx;
            color: #FF6432;
            background: #FFF0EB;
            padding: 4rpx 12rpx;
            border-radius: 20rpx;
        }
    }

    .room-details {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 16rpx;
        margin-bottom: 16rpx;
        .detail-item { font-size: 24rpx; color: $gray; }
    }

    .time-slots {
        display: flex;
        flex-wrap: wrap;
        gap: 8rpx;
        .time-slot-chip {
            background: #FFF0EB;
            color: #FF6432;
            font-size: 22rpx;
            padding: 4rpx 12rpx;
            border-radius: 8rpx;
        }
    }

    .people-modifier {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16rpx 0 4rpx;
        border-top: 1rpx solid $light-gray;
        .modifier-label { font-size: 28rpx; color: $dark; }
        .stepper {
            display: flex;
            align-items: center;
            gap: 0;
            border: 1rpx solid #E0E0E0;
            border-radius: 8rpx;
            overflow: hidden;
            .stepper-btn {
                width: 64rpx;
                height: 56rpx;
                line-height: 56rpx;
                text-align: center;
                font-size: 32rpx;
                color: $primary;
                background: #FFF;
            }
            .stepper-num {
                min-width: 64rpx;
                height: 56rpx;
                line-height: 56rpx;
                text-align: center;
                font-size: 28rpx;
                color: $dark;
                font-weight: bold;
                border-left: 1rpx solid #E0E0E0;
                border-right: 1rpx solid #E0E0E0;
                padding: 0 8rpx;
                box-sizing: border-box;
            }
        }
    }

    .room-prices {
        border-top: 1rpx solid $light-gray;
        padding-top: 20rpx;
        .price-row {
            display: flex;
            justify-content: space-between;
            font-size: 28rpx;
            color: $dark;
            margin-bottom: 10rpx;
            .price-label { color: $gray; }
            .price-value { font-weight: bold; }
        }
    }
}

// 价格明细
.price-section {
    margin: 0 20rpx;
    background: #fff;
    border-radius: 20rpx;
    padding: 30rpx;
    margin-bottom: 20rpx;

    .section-title {
        font-size: 28rpx;
        font-weight: bold;
        color: $dark;
        margin-bottom: 24rpx;
    }

    .price-list {
        .price-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            min-height: 56rpx;
            margin-bottom: 16rpx;
            flex-wrap: wrap;

            .row-label {
                font-size: 28rpx;
                color: $gray;
                flex: 1;
                display: flex;
                align-items: center;
            }

            .row-value {
                font-size: 28rpx;
                color: $dark;
            }

            .discount { color: $primary; }
        }

        .tag {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 40rpx;
            height: 36rpx;
            font-size: 20rpx;
            border-radius: 6rpx;
            margin-right: 8rpx;
            padding: 0 6rpx;
            box-sizing: border-box;
            &.tag-active { background: $primary; color: #fff; }
            &.tag-gray { background: #E0E0E0; color: $gray; }
        }

        .discount-row {
            background: #FFF8F6;
            border-radius: 10rpx;
            padding: 10rpx 16rpx;
            margin: 0 -16rpx;
        }

        // 积分区域
        .points-section {
            width: 100%;
            .points-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                width: 100%;
            }
            .points-slider {
                width: 100%;
                padding-top: 16rpx;
                slider { width: 100%; }
                .points-input-row {
                    display: flex;
                    align-items: center;
                    margin-top: 8rpx;
                    .points-input {
                        width: 140rpx;
                        height: 52rpx;
                        background: #F5F5F5;
                        border-radius: 10rpx;
                        text-align: center;
                        font-size: 26rpx;
                        margin-right: 12rpx;
                    }
                    .points-unit { font-size: 26rpx; color: $gray; margin-right: 16rpx; }
                    .points-convert { font-size: 26rpx; color: $primary; font-weight: bold; }
                }
            }
        }

        // 优惠券行
        .coupon-row {
            cursor: pointer;
            .coupon-right {
                display: flex;
                align-items: center;
                .coupon-value { color: $primary; margin-right: 8rpx; font-weight: bold; }
            }
        }

        // 余额行
        .balance-row {
            .balance-right {
                display: flex;
                align-items: center;
                .balance-insufficient {
                    font-size: 22rpx;
                    color: $primary;
                    margin-right: 12rpx;
                }
            }
        }

        .balance-hint {
            display: flex;
            align-items: center;
            padding: 12rpx 0;
            .hint-text { font-size: 24rpx; color: $gray; }
            .hint-link { font-size: 24rpx; color: $primary; font-weight: bold; }
        }

        .divider {
            height: 1rpx;
            background: $light-gray;
            margin: 20rpx 0;
        }

        .final-row {
            .row-label { font-weight: bold; color: $dark; font-size: 30rpx; }
            .final-price {
                font-size: 40rpx;
                font-weight: bold;
                color: $primary;
            }
        }
    }
}

// 备注
.remark-section {
    margin: 0 20rpx;
    background: #fff;
    border-radius: 20rpx;
    padding: 30rpx;
    display: flex;
    align-items: center;
    .remark-label {
        font-size: 28rpx;
        color: $gray;
        margin-right: 20rpx;
        flex-shrink: 0;
    }
    .remark-input {
        flex: 1;
        font-size: 28rpx;
        color: $dark;
    }
}

// 底部栏
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
        .bottom-points {
            font-size: 22rpx;
            color: $gray;
            margin-left: 8rpx;
        }
    }

    .submit-btn {
        width: 220rpx;
        height: 80rpx;
        background: $primary;
        color: #fff;
        border-radius: 40rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 30rpx;
        font-weight: bold;
        &.btn-disabled { background: #CCC; }
    }
}

// 优惠券面板
.mask {
    position: fixed;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    background: rgba(0,0,0,0);
    z-index: 9990;
    transition: background 0.3s;
    &.show { background: rgba(0,0,0,0.5); }
    &.hide { display: none; }
}

.coupon-picker {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    max-height: 75vh;
    background: #fff;
    border-radius: 30rpx 30rpx 0 0;
    transform: translateY(100%);
    transition: transform 0.3s;
    z-index: 9991;
    display: flex;
    flex-direction: column;
    &.show { transform: translateY(0); }

    .picker-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 30rpx 40rpx;
        border-bottom: 1rpx solid $light-gray;
        .picker-title { font-size: 32rpx; font-weight: bold; color: $dark; }
        .picker-close { font-size: 40rpx; color: $gray; }
    }

    .picker-body {
        flex: 1;
        overflow-y: auto;
        padding: 20rpx 30rpx;
        max-height: 60vh;

        .unavailable-hint {
            text-align: center;
            padding: 40rpx;
            color: $gray;
            font-size: 28rpx;
        }

        .coupon-group-title {
            font-size: 24rpx;
            color: $gray;
            margin: 20rpx 0 12rpx;
            padding-left: 8rpx;
        }

        .coupon-card {
            display: flex;
            background: #FFF5F0;
            border-radius: 16rpx;
            margin-bottom: 16rpx;
            overflow: hidden;
            border: 2rpx solid transparent;
            &.selected { border-color: $primary; background: #FFF0EB; }
            &.disabled { opacity: 0.5; background: #F5F5F5; }

            .coupon-left {
                width: 200rpx;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 20rpx;
                background: $primary;
                color: #fff;
                .coupon-price { font-size: 44rpx; font-weight: bold; }
                .coupon-limit { font-size: 20rpx; opacity: 0.8; margin-top: 4rpx; }
            }

            .coupon-right {
                flex: 1;
                padding: 20rpx 24rpx;
                display: flex;
                flex-direction: column;
                justify-content: center;
                position: relative;
                .coupon-name { font-size: 28rpx; color: $dark; font-weight: bold; margin-bottom: 8rpx; }
                .coupon-expire { font-size: 22rpx; color: $gray; }
                .coupon-check {
                    position: absolute;
                    right: 20rpx;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 40rpx;
                    height: 40rpx;
                    background: $primary;
                    color: #fff;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 24rpx;
                }
            }
        }

        .no-coupon {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 24rpx 30rpx;
            background: #F5F5F5;
            border-radius: 16rpx;
            margin-top: 12rpx;
            font-size: 28rpx;
            color: $gray;
            .coupon-check {
                width: 40rpx;
                height: 40rpx;
                background: $gray;
                color: #fff;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24rpx;
            }
        }
    }
}
</style>
