<template>
  <view class="page">
    <view class="status-bar-placeholder"></view>

    <!-- 店铺头部 -->
    <view class="shop-header">
      <view class="shop-logo">
        <image src="/static/logo_small.jpg" mode="aspectFill" />
      </view>
      <view class="shop-info">
        <text class="shop-name">摸鱼划水吧</text>
        <text class="shop-tag">桌游 · 棋牌 · 休闲</text>
      </view>
    </view>

    <!-- 门票卡片 -->
    <view class="ticket-card">
      <view class="ticket-top">
        <view class="ticket-name">🎫 大厅入场券</view>
        <view class="ticket-badge">{{ memberLevelName }}</view>
      </view>
      <view class="ticket-desc">全天不限时畅玩 · 零食茶水自助 · 漫画小说桌游</view>
      <view class="ticket-price-row">
        <text class="ticket-price-label">单价</text>
        <text class="ticket-price-value">¥38/人</text>
      </view>
      <view class="people-modifier">
        <text class="modifier-label">👥 人数</text>
        <view class="stepper">
          <view class="stepper-btn" @click="decPeople">-</view>
          <text class="stepper-num">{{ ticketCount }}</text>
          <view class="stepper-btn" @click="incPeople">+</view>
        </view>
      </view>
      <view class="ticket-total">
        <text class="total-label">小计</text>
        <text class="total-value">¥{{ basePrice }}</text>
      </view>
    </view>

    <!-- 费用明细 -->
    <view class="price-section">
      <view class="section-title">费用明细</view>
      <view class="price-list">
        <view class="price-row">
          <text class="row-label">门票 × {{ ticketCount }}人</text>
          <text class="row-value">¥{{ basePrice }}</text>
        </view>

        <!-- 会员折扣 -->
        <view class="price-row discount-row" v-if="memberDiscountAmount > 0">
          <text class="row-label">
            <text class="tag">会员</text>
            {{ memberLevelName }}{{ memberDiscount > 0 ? '专享' + memberDiscount + '折' : '暂无折扣' }}
          </text>
          <text class="row-value discount">-¥{{ memberDiscountAmount }}</text>
        </view>

        <!-- 优惠券 -->
        <view class="price-row coupon-row" @click="openCouponPicker">
          <text class="row-label">
            <text class="tag" :class="selectedCoupon ? 'tag-active' : 'tag-gray'">券</text>
            <block v-if="selectedCoupon">{{ selectedCoupon.name }}</block>
            <block v-else-if="availableCoupons.length > 0">{{ availableCoupons.length }}张可用</block>
            <block v-else>优惠券</block>
          </text>
          <view class="coupon-right">
            <text class="coupon-value" v-if="selectedCoupon">-¥{{ couponDiscount }}</text>
            <text class="cell-more yticon icon-you" :class="selectedCoupon ? 'cell-active' : 'cell-inactive'">
              {{ selectedCoupon ? '已选' : (availableCoupons.length > 0 ? '去选择' : '暂无可用') }}
            </text>
          </view>
        </view>

        <!-- 余额 -->
        <view class="price-row balance-row">
          <text class="row-label">
            <text class="tag" :class="balanceEnough ? 'tag-active' : 'tag-gray'">余额</text>
            账户余额 ¥{{ (userInfo.account_balance / 100).toFixed(2) }}
          </text>
          <text v-if="balanceEnough" class="balance-status enough">可抵扣 ¥{{ (afterCouponPriceFen / 100).toFixed(2) }}</text>
          <text v-else class="balance-status short">还差 ¥{{ (balanceShortfall / 100).toFixed(2) }}</text>
        </view>
        <view class="balance-hint" v-if="!balanceEnough" @click="goRecharge">
          <text class="hint-text">余额不足？去</text>
          <text class="hint-link">充值</text>
          <text class="hint-text"> →</text>
        </view>

        <view class="divider"></view>

        <view class="price-row final-row">
          <text class="row-label">实付款</text>
          <text class="final-price">¥{{ actualPrice }}</text>
        </view>
      </view>
    </view>

    <!-- 说明 -->
    <view class="notice-section">
      <view class="notice-item">
        <text class="notice-icon">⏰</text>
        <text class="notice-text">购买后7天内有效，过期不可退</text>
      </view>
      <view class="notice-item">
        <text class="notice-icon">📍</text>
        <text class="notice-text">到店后出示核销码或报数字码即可入场</text>
      </view>
      <view class="notice-item">
        <text class="notice-icon">↩️</text>
        <text class="notice-text">未核销且未过期可随时申请退款</text>
      </view>
    </view>

    <!-- 底部占位 -->
    <view style="height: 40rpx;"></view>

    <!-- 底部提交栏 -->
    <view class="bottom-bar">
      <view class="bottom-info">
        <text class="bottom-label">实付款</text>
        <text class="bottom-price">¥{{ actualPrice }}</text>
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
          <view class="unavailable-hint" v-if="availableCoupons.length === 0 && unavailableCoupons.length === 0">
            <text>暂无可用优惠券</text>
          </view>
          <view class="coupon-group-title" v-if="availableCoupons.length > 0">可用优惠券</view>
          <view
            class="coupon-card"
            v-for="c in availableCoupons"
            :key="c.object_id"
            :class="selectedCoupon && selectedCoupon.object_id === c.object_id ? 'selected' : ''"
            @click="selectCoupon(c)"
          >
            <view class="coupon-left">
              <view class="coupon-price-wrap">
                <text class="coupon-unit" v-if="c.coupon_type === 'rebate'">¥</text>
                <text class="coupon-price">{{ c.displayValue }}</text>
              </view>
              <text class="coupon-limit">{{ c.min_consume > 0 ? '满' + (c.min_consume / 100).toFixed(0) + '元可用' : '无门槛' }}</text>
            </view>
            <view class="coupon-right">
              <view class="coupon-name">{{ c.name }}</view>
              <view class="coupon-expire">有效期至 {{ c.expire_time }}</view>
              <view class="coupon-check" v-if="selectedCoupon && selectedCoupon.object_id === c.object_id">✓</view>
            </view>
          </view>
          <view class="coupon-group-title" v-if="unavailableCoupons.length > 0">不可用优惠券</view>
          <view class="coupon-card disabled" v-for="c in unavailableCoupons" :key="c.object_id">
            <view class="coupon-left">
              <view class="coupon-price-wrap">
                <text class="coupon-unit" v-if="c.coupon_type === 'rebate'">¥</text>
                <text class="coupon-price">{{ c.displayValue }}</text>
              </view>
              <text class="coupon-limit">{{ c.disable_reason }}</text>
            </view>
            <view class="coupon-right">
              <view class="coupon-name">{{ c.name }}</view>
              <view class="coupon-expire">有效期至 {{ c.expire_time }}</view>
            </view>
          </view>
          <view class="no-coupon" :class="!selectedCoupon ? 'no-coupon-active' : ''" @click="selectCoupon(null)">
            <text class="no-coupon-text">不使用优惠券</text>
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

const TICKET_PRICE_PER_PERSON = 3800; // 38元/人（分）

export default {
  data() {
    return {
      ticketCount: 1,
      couponPickerOpen: false,
      myCoupons: [],
      selectedCoupon: null,
      submitting: false,
    };
  },

  computed: {
    ...mapState(['hasLogin', 'token', 'userInfo']),

    basePriceFen() {
      return TICKET_PRICE_PER_PERSON * this.ticketCount;
    },

    basePrice() {
      return (this.basePriceFen / 100).toFixed(2);
    },

    memberLevel() {
      return this.userInfo.member_level || 0;
    },

    memberLevelName() {
      const names = ['普通会员', '🌱 青铜', '🥈 白银', '🥇 黄金', '💎 钻石'];
      return names[this.memberLevel] || '';
    },

    memberDiscountRate() {
      const rates = [0, 900, 850, 800, 750];
      return rates[this.memberLevel] || 0;
    },

    memberDiscount() {
      return (this.memberDiscountRate / 100).toFixed(1);
    },

    memberDiscountAmountFen() {
      if (!this.memberDiscountRate) return 0;
      const discountRatio = this.memberDiscountRate / 1000;
      return Math.floor(this.basePriceFen * (1 - discountRatio));
    },

    memberDiscountAmount() {
      return (this.memberDiscountAmountFen / 100).toFixed(2);
    },

    afterMemberPriceFen() {
      return this.basePriceFen - this.memberDiscountAmountFen;
    },

    couponDiscountFen() {
      if (!this.selectedCoupon) return 0;
      if (this.selectedCoupon.coupon_type === 'rebate') {
        return this.selectedCoupon.discount || 0;
      } else if (this.selectedCoupon.coupon_type === 'discount') {
        const rate = (this.selectedCoupon.rules && this.selectedCoupon.rules.discount_rate) || 1;
        const maxDiscount = (this.selectedCoupon.rules && this.selectedCoupon.rules.max_discount) || 0;
        let discount = Math.round(this.afterMemberPriceFen * (1 - rate));
        if (maxDiscount > 0 && discount > maxDiscount) {
          discount = maxDiscount;
        }
        return discount;
      }
      return 0;
    },

    couponDiscount() {
      if (!this.selectedCoupon) return '0.00';
      return (this.couponDiscountFen / 100).toFixed(2);
    },

    afterCouponPriceFen() {
      return Math.max(0, this.afterMemberPriceFen - this.couponDiscountFen);
    },

    availableCoupons() {
      return this.myCoupons.filter(c => {
        if (c.status !== 'unused') return false;
        if (c.min_consume > 0 && this.afterMemberPriceFen < c.min_consume) return false;
        return true;
      }).map(c => ({ ...c, discount: c.discount || 0 }));
    },

    unavailableCoupons() {
      return this.myCoupons.filter(c => {
        if (c.status !== 'unused') return true;
        if (c.min_consume > 0 && this.afterMemberPriceFen < c.min_consume) {
          return true;
        }
        return false;
      }).map(c => ({
        ...c,
        disable_reason: c.min_consume > 0 ? '需满' + (c.min_consume / 100).toFixed(0) + '元' : '不可用'
      }));
    },

    finalPriceFen() {
      return this.afterCouponPriceFen;
    },

    actualPrice() {
      return (this.finalPriceFen / 100).toFixed(2);
    },

    balanceEnough() {
      return (this.userInfo.account_balance || 0) >= this.afterCouponPriceFen;
    },

    balanceShortfall() {
      return Math.max(0, this.afterCouponPriceFen - (this.userInfo.account_balance || 0));
    },
  },

  onLoad() {
    if (!this.hasLogin) {
      uni.showModal({
        title: '提示',
        content: '请先登录再购买门票',
        showCancel: false,
        success: () => {
          this.loginAndRegister().then(() => {
            this.loadMyCoupons();
          });
        }
      });
      return;
    }
    this.loadMyCoupons();
  },

  methods: {
    ...mapActions(['loginAndRegister', 'getUserInfo']),

    async loadMyCoupons() {
      if (!this.token) return;
      try {
        const res = await AUTH.getMyCoupons(this.token, 0);
        if (res && res._status === 0) {
          const coupons = res.data || [];
          this.myCoupons = coupons.map(c => {
            const rules = c.rules || {};
            let discount = 0;
            let displayValue = '-';
            if (c.coupon_type === 'rebate') {
              discount = rules.discount || 0;
              displayValue = String((discount / 100).toFixed(0));
            } else if (c.coupon_type === 'discount') {
              const rate = rules.discount_rate || 1;
              displayValue = (Math.round(rate * 100) / 10) + '折';
            } else if (c.coupon_type === 'gift') {
              displayValue = (rules.gift_value || '-') + '积分';
            }
            return {
              object_id: c.object_id,
              name: c.name,
              description: c.description,
              discount: discount,
              coupon_type: c.coupon_type,
              rules: c.rules,
              min_consume: c.min_consume,
              expire_time: c.expire_time,
              status: c.status === 0 ? 'unused' : (c.status === 1 ? 'used' : 'expired'),
              is_valid: c.is_valid,
              displayValue,
            };
          });
        }
      } catch (e) {
        console.log('load coupons error:', e);
      }
    },

    incPeople() {
      if (this.ticketCount < 10) this.ticketCount++;
    },

    decPeople() {
      if (this.ticketCount > 1) this.ticketCount--;
    },

    openCouponPicker() {
      this.couponPickerOpen = true;
    },

    closeCouponPicker() {
      this.couponPickerOpen = false;
    },

    selectCoupon(coupon) {
      this.selectedCoupon = coupon;
      this.couponPickerOpen = false;
    },

    goRecharge() {
      uni.navigateTo({ url: '/pages/user/deposit/deposit' });
    },

    async submitOrder() {
      if (!this.hasLogin) {
        uni.showModal({ title: '提示', content: '请先登录再提交订单', success: (res) => {
          if (res.confirm) this.loginAndRegister();
        }});
        return;
      }
      if (this.submitting) return;
      this.submitting = true;

      try {
        const param = {
          order_type: 6,
          ticket_count: this.ticketCount,
          contact_name: this.userInfo.nickname || this.userInfo.username,
          coupon_id: this.selectedCoupon ? this.selectedCoupon.object_id : null,
          expected_amount: this.finalPriceFen,
        };

        const res = await AUTH.checkout(this.token, param);
        if (!res) {
          this.submitting = false;
          return;
        }

        if (res.data._amount_mismatch) {
          console.warn('金额不一致:', '前端预估=', res.data._expected_amount, '后端实际=', res.data._actual_amount);
        }

        const orderNumber = res.data.order_number;
        const payAmount = res.data.pay_amount || 0;

        uni.redirectTo({
          url: `/pages/order/payment?parent_sn=${orderNumber}&entry=1&data=${encodeURIComponent(JSON.stringify(res.data))}`
        });
      } catch (e) {
        console.error('submit order error:', e);
        uni.showToast({ title: '创建订单失败', icon: 'none' });
      } finally {
        this.submitting = false;
      }
    },
  },
};
</script>

<style lang="scss">
$page-color: #FFF8F0;
$primary: #FF8C42;
$gold: #FFB933;
$dark: #5C4B3A;
$gray: #A08B7A;
$light-gray: #F0E6D8;

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
  background: linear-gradient(180deg, #FFF0E0 0%, #FFF5EC 100%);
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

// 门票卡片
.ticket-card {
  margin: 0 24rpx 20rpx;
  padding: 30rpx;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(92,75,58,0.06);
  border: 2rpx solid rgba(255,181,167,0.15);
  .ticket-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16rpx;
    .ticket-name { font-size: 32rpx; font-weight: bold; color: $dark; }
    .ticket-badge {
      font-size: 22rpx;
      color: #FF8C42;
      background: #FFF0EB;
      padding: 4rpx 12rpx;
      border-radius: 20rpx;
    }
  }
  .ticket-desc {
    font-size: 24rpx;
    color: $gray;
    margin-bottom: 20rpx;
  }
  .ticket-price-row {
    display: flex;
    justify-content: space-between;
    font-size: 28rpx;
    color: $dark;
    margin-bottom: 16rpx;
    .ticket-price-label { color: $gray; }
    .ticket-price-value { font-weight: bold; color: $primary; }
  }
  .people-modifier {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16rpx 0;
    border-top: 1rpx solid $light-gray;
    .modifier-label { font-size: 28rpx; color: $dark; }
    .stepper {
      display: flex;
      align-items: center;
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
  .ticket-total {
    display: flex;
    justify-content: space-between;
    padding-top: 16rpx;
    border-top: 1rpx solid $light-gray;
    .total-label { font-size: 28rpx; color: $gray; }
    .total-value { font-size: 32rpx; font-weight: bold; color: $primary; }
  }
}

// 价格明细
.price-section {
  margin: 0 24rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(92,75,58,0.06);
  border: 2rpx solid rgba(255,181,167,0.15);
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
      padding: 12rpx 16rpx;
    }
    .coupon-row {
      background: #F8F8F8;
      border-radius: 10rpx;
      padding: 12rpx 16rpx;
    }
    .balance-row {
      background: #F8F8F8;
      border-radius: 10rpx;
      padding: 12rpx 16rpx;
    }
    .divider {
      height: 1rpx;
      background: $light-gray;
      margin: 16rpx 0;
    }
    .final-row {
      .row-label { font-size: 30rpx; font-weight: bold; color: $dark; }
      .final-price { font-size: 36rpx; font-weight: bold; color: $primary; }
    }
  }
}

// 说明
.notice-section {
  margin: 0 24rpx 20rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(92,75,58,0.06);
  border: 2rpx solid rgba(255,181,167,0.15);
  .notice-item {
    display: flex;
    align-items: flex-start;
    gap: 12rpx;
    margin-bottom: 12rpx;
    &:last-child { margin-bottom: 0; }
    .notice-icon { font-size: 28rpx; flex-shrink: 0; }
    .notice-text { font-size: 24rpx; color: $gray; line-height: 1.5; }
  }
}

// 余额提示
.balance-hint {
  text-align: right;
  margin-bottom: 16rpx;
  .hint-text { font-size: 24rpx; color: $gray; }
  .hint-link { font-size: 24rpx; color: $primary; font-weight: bold; }
}

// 底部栏
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 30rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -4rpx 20rpx rgba(0,0,0,0.05);
  .bottom-info {
    display: flex;
    align-items: baseline;
    gap: 10rpx;
    .bottom-label { font-size: 24rpx; color: $gray; }
    .bottom-price { font-size: 40rpx; font-weight: bold; color: $primary; }
  }
  .submit-btn {
    background: linear-gradient(135deg, #FF8C42, #FFB5A7);
    color: #fff;
    font-size: 30rpx;
    font-weight: bold;
    padding: 20rpx 60rpx;
    border-radius: 50rpx;
    box-shadow: 0 8rpx 24rpx rgba(255,100,66,0.3);
    &.btn-disabled { opacity: 0.6; }
    &:active { transform: scale(0.98); }
  }
}

// 优惠券面板
.mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 1000;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s;
  &.show { opacity: 1; pointer-events: auto; }
}
.coupon-picker {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 30rpx;
  padding-bottom: calc(30rpx + env(safe-area-inset-bottom));
  transform: translateY(100%);
  transition: transform 0.3s;
  z-index: 1001;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  &.show { transform: translateY(0); }
  .picker-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20rpx;
    .picker-title { font-size: 32rpx; font-weight: bold; color: $dark; }
    .picker-close { font-size: 36rpx; color: $gray; padding: 10rpx; }
  }
  .picker-body {
    flex: 1;
    overflow-y: auto;
    .unavailable-hint { text-align: center; padding: 40rpx; color: $gray; font-size: 28rpx; }
    .coupon-group-title { font-size: 24rpx; color: $gray; margin: 16rpx 0 12rpx; }
    .coupon-card {
      display: flex;
      background: #FFF8F0;
      border-radius: 16rpx;
      padding: 24rpx;
      margin-bottom: 16rpx;
      border: 2rpx solid transparent;
      &.selected { border-color: $primary; }
      &.disabled { opacity: 0.5; background: #F5F5F5; }
      .coupon-left {
        width: 140rpx;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border-right: 2rpx dashed #FFD0C0;
        padding-right: 20rpx;
        .coupon-price-wrap {
          display: flex;
          align-items: baseline;
          .coupon-unit { font-size: 24rpx; color: $primary; }
          .coupon-price { font-size: 40rpx; font-weight: bold; color: $primary; }
        }
        .coupon-limit { font-size: 20rpx; color: $gray; margin-top: 6rpx; }
      }
      .coupon-right {
        flex: 1;
        padding-left: 20rpx;
        position: relative;
        .coupon-name { font-size: 28rpx; font-weight: bold; color: $dark; }
        .coupon-expire { font-size: 22rpx; color: $gray; margin-top: 8rpx; }
        .coupon-check {
          position: absolute;
          top: 0;
          right: 0;
          width: 40rpx;
          height: 40rpx;
          background: $primary;
          color: #fff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22rpx;
        }
      }
    }
    .no-coupon {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24rpx;
      border-radius: 16rpx;
      background: #F8F8F8;
      &.no-coupon-active { background: #FFF8F6; border: 2rpx solid $primary; }
      .no-coupon-text { font-size: 28rpx; color: $dark; }
      .coupon-check {
        width: 40rpx;
        height: 40rpx;
        background: $primary;
        color: #fff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22rpx;
      }
    }
  }
}
</style>
