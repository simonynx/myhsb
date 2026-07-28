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
        <text class="shop-tag">桌游 · 棋牌 · 社交</text>
      </view>
    </view>

    <view class="ticket-mode-switch" :class="perlerEnabled ? '' : 'single-mode'" v-if="!isUpgradeMode">
      <view class="mode-option" :class="ticketMode === 'hall' ? 'active' : ''" @click="setTicketMode('hall')">
        <text class="mode-icon">🎫</text>
        <view class="mode-copy">
          <text class="mode-name">大厅畅玩</text>
          <text class="mode-price">¥{{ (hallPriceFen / 100).toFixed(0) }}/人</text>
        </view>
      </view>
      <view class="mode-option perler" v-if="perlerEnabled" :class="ticketMode === 'perler_day' ? 'active' : ''" @click="setTicketMode('perler_day')">
        <text class="mode-icon">🧩</text>
        <view class="mode-copy">
          <text class="mode-name">拼豆一日</text>
          <text class="mode-price">¥{{ (perlerDayPriceFen / 100).toFixed(0) }}/人</text>
        </view>
      </view>
    </view>

    <!-- 门票卡片 -->
    <view class="ticket-card" :class="isPerlerMode ? 'perler-card' : ''">
      <view class="ticket-top">
        <view class="ticket-name">{{ ticketIcon }} {{ ticketName }}</view>
        <view class="ticket-badge">{{ ticketBadge }}</view>
      </view>
      <view class="ticket-desc">{{ ticketDescription }}</view>
      <view class="ticket-price-row">
        <text class="ticket-price-label">单价</text>
        <text class="ticket-price-value">¥{{ (ticketPriceFen / 100).toFixed(0) }}/人</text>
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

    <!-- 社交提示 -->
    <view class="social-nudge-card" v-if="!isPerlerMode">
      <view class="social-nudge-copy">
        <text class="social-nudge-kicker">一个人也能来，多人更好玩</text>
        <text class="social-nudge-title">想先找搭子再买票？</text>
        <text class="social-nudge-desc">可以去组局广场看看有没有人差位；也可以买多张票，付款后在票包里送好友。</text>
      </view>
      <view class="social-nudge-actions">
        <view class="social-nudge-btn primary" @click="goGroupSquareFromTicket">
          <text>找人一起玩</text>
        </view>
        <view class="social-nudge-btn secondary" @click="prepareGiftTicket">
          <text>买2张送好友</text>
        </view>
      </view>
    </view>

    <view class="perler-value-card" v-else>
      <view class="perler-value-head">
        <text class="perler-value-kicker">不是无限材料，是一整天的创作时间</text>
        <text class="perler-value-title">{{ isUpgradeMode ? '已经到店，补差即可开做' : '拼豆、桌游、漫画可以随时换着玩' }}</text>
      </view>
      <view class="perler-value-grid">
        <view class="perler-value-item">
          <text class="value-icon">🧩</text>
          <text class="value-name">标准材料包</text>
        </view>
        <view class="perler-value-item">
          <text class="value-icon">🛠</text>
          <text class="value-name">工具与熨烫</text>
        </view>
        <view class="perler-value-item">
          <text class="value-icon">🎲</text>
          <text class="value-name">{{ isUpgradeMode ? '沿用原入场权益' : '包含大厅入场' }}</text>
        </view>
      </view>
      <text class="perler-material">材料范围：{{ perlerMaterialSpec }}</text>
    </view>

    <view class="upgrade-guide" v-if="ticketMode === 'perler_day'">
      <view class="upgrade-guide-copy">
        <text class="upgrade-guide-title">已有今天的入场权益？</text>
        <text class="upgrade-guide-desc">系统会按小程序订单或店员确认的外部团单，显示对应升级方式和价格。</text>
      </view>
      <view class="upgrade-guide-btn" @click="goPerlerUpgradeCenter">查看升级资格</view>
    </view>

    <!-- 费用明细 -->
    <view class="price-section">
      <view class="section-title">费用明细</view>
      <view class="price-list">
        <view class="price-row">
          <text class="row-label">{{ ticketName }} × {{ ticketCount }}人</text>
          <text class="row-value">¥{{ basePrice }}</text>
        </view>

        <view class="price-row fixed-price-row" v-if="isUpgradeMode">
          <text class="row-label"><text class="tag tag-active">增购价</text> {{ (perlerUpgradePriceFen / 100).toFixed(0) }}元已扣除原有入场权益，不再叠加会员、优惠券或积分</text>
          <text class="fixed-price-note">当天专享</text>
        </view>

        <view class="price-row benefit-policy-row" v-if="ticketMode === 'perler_day'">
          <text class="row-label"><text class="tag tag-active">优惠</text> 会员折扣、优惠券和积分均可使用</text>
          <text class="benefit-policy-note">卡包仅抵大厅票</text>
        </view>

        <block v-if="supportsStandardBenefits">
        <!-- 会员折扣 -->
        <view class="price-row discount-row" v-if="memberDiscountAmount > 0">
          <text class="row-label">
            <text class="tag">会员</text>
            {{ memberLevelName }}{{ memberDiscountText ? '专享' + memberDiscountText : '暂无折扣' }}
          </text>
          <text class="row-value discount">-¥{{ memberDiscountAmount }}</text>
        </view>

        <!-- 次卡/月卡折抵 -->
        <view class="price-row coupon-row" v-if="supportsSubscription" @click="openSubscriptionPicker">
          <text class="row-label">
            <text class="tag" :class="selectedSubscription ? 'tag-active' : 'tag-gray'">卡包</text>
            <block v-if="selectedSubscription">{{ selectedSubscription.card_template.name }}</block>
            <block v-else-if="usableSubscriptions.length > 0">{{ usableSubscriptions.length }}张可用</block>
            <block v-else>{{ subscriptionUpsellText }}</block>
          </text>
          <view class="coupon-right">
            <text class="coupon-value" v-if="selectedSubscription">-¥{{ (subscriptionDiscountAmountFen / 100).toFixed(2) }}</text>
            <text class="cell-more yticon icon-you" :class="selectedSubscription ? 'cell-active' : 'cell-inactive'">
              {{ selectedSubscription ? '已选' : (usableSubscriptions.length > 0 ? '去选择' : '去购卡') }}
            </text>
          </view>
        </view>
        <view class="subscription-breakdown" v-if="supportsSubscription && selectedSubscription">
          <view class="subscription-breakdown-copy">
            <text class="subscription-breakdown-title">{{ subscriptionUsageText }}</text>
            <text class="subscription-breakdown-note">{{ subscriptionLimitText }}</text>
          </view>
          <view class="subscription-counts">
            <view class="subscription-count-item">
              <text class="subscription-count-value">{{ subscriptionDeductedCount }}</text>
              <text class="subscription-count-label">卡包抵扣</text>
            </view>
            <view class="subscription-count-divider"></view>
            <view class="subscription-count-item">
              <text class="subscription-count-value payable">{{ subscriptionPayableTicketCount }}</text>
              <text class="subscription-count-label">另行结算</text>
            </view>
          </view>
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

        <!-- 积分抵扣 -->
        <view class="price-row points-row" v-if="canUsePoints">
          <view class="points-header">
            <view class="points-info">
              <text class="tag">积分</text>
              <text class="points-balance">当前 {{ safeUserInfo.points }} 积分，最多抵 ¥{{ maxPointsConvertMoney }}</text>
            </view>
            <switch
              color="#FFCC33"
              :checked="usePoints"
              @change="togglePoints"
              :disabled="!canUsePoints"
            />
          </view>
          <view class="points-slider" v-if="usePoints && canUsePoints">
            <view class="slider-wrap">
              <view class="slider-labels">
                <text class="slider-label">{{ pointsMinUse }}</text>
                <text class="slider-label">{{ maxUsablePoints }}</text>
              </view>
              <slider
                :value="pointsToUse"
                :min="pointsMinUse"
                :max="maxUsablePoints"
                :step="pointsStep"
                activeColor="#FFCC33"
                backgroundColor="#E0E0E0"
                block-size="18"
                @change="onPointsChange"
              />
            </view>
            <view class="points-result">
              <text class="result-points">{{ pointsUsageLabel }}</text>
              <text class="result-money">-¥{{ pointsConvertMoney }}</text>
            </view>
          </view>
        </view>

        <!-- 无积分时提示 -->
        <view class="price-row points-zero-row" v-else>
          <text class="row-label">
            <text class="tag">积分</text>
            {{ pointsUnavailableText }}
          </text>
        </view>
        </block>

        <!-- 余额 -->
        <view class="price-row balance-row">
          <text class="row-label">
            <text class="tag" :class="balanceEnough ? 'tag-active' : 'tag-gray'">余额</text>
            账户余额 ¥{{ (safeUserInfo.account_balance / 100).toFixed(2) }}
          </text>
          <text v-if="balanceEnough" class="balance-status enough">余额充足</text>
          <text v-else class="balance-status short">余额还差 ¥{{ (balanceShortfall / 100).toFixed(2) }}</text>
        </view>
        <view class="balance-hint" v-if="!balanceEnough" @click="goRecharge">
          <text class="hint-text">余额不足？建议</text>
          <text class="hint-link">{{ rechargeRecommendText }}</text>
          <text class="hint-text"> →</text>
        </view>

        <view class="divider"></view>

        <view class="price-row final-row">
          <text class="row-label">实付款</text>
          <text class="final-price">¥{{ actualPrice }}</text>
        </view>
      </view>
    </view>

    <!-- 使用须知 -->
    <view class="notice-section">
      <view class="notice-header">
        <text class="notice-title-icon">📋</text>
        <text class="notice-title">使用须知</text>
      </view>

      <!-- 有效期高亮 -->
      <view class="notice-highlight">
        <view class="highlight-left">
          <text class="hl-icon">⏳</text>
          <view class="hl-text">
            <text class="hl-label">有效期</text>
            <text class="hl-value">{{ validityText }}</text>
          </view>
        </view>
        <view class="hl-tag warning">过期不可退</view>
      </view>

      <view class="notice-divider"></view>

      <view class="notice-item">
        <text class="notice-icon">📍</text>
        <view class="notice-body">
          <text class="notice-label">{{ isUpgradeMode ? '升级方式' : '入场方式' }}</text>
          <text class="notice-desc">{{ redemptionDescription }}</text>
        </view>
      </view>
      <view class="notice-item" v-if="!isPerlerMode">
        <text class="notice-icon">🎲</text>
        <view class="notice-body">
          <text class="notice-label">大厅包含</text>
          <text class="notice-desc">大厅桌游、漫画小说、零食茶水自助均可使用，按需取用即可</text>
        </view>
      </view>
      <view class="notice-item" v-if="!isPerlerMode">
        <text class="notice-icon">🎮</text>
        <view class="notice-body">
          <text class="notice-label">升级说明</text>
          <text class="notice-desc">包厢、主机、生日氛围布置等增值项目按小时或套餐另计，建议提前预约</text>
        </view>
      </view>
      <view class="notice-item" v-if="isPerlerMode">
        <text class="notice-icon">🧩</text>
        <view class="notice-body">
          <text class="notice-label">材料边界</text>
          <text class="notice-desc">{{ perlerMaterialSpec }}；超出标准规格的材料按现场标价补差</text>
        </view>
      </view>
      <view class="notice-item" v-if="isPerlerMode">
        <text class="notice-icon">⏱</text>
        <view class="notice-body">
          <text class="notice-label">时间说明</text>
          <text class="notice-desc">拼豆可在营业时间内不限时体验；如另有包厢预约，包厢仍按预约时段计时，结束后可移至大厅继续</text>
        </view>
      </view>
      <view class="notice-item">
        <text class="notice-icon">↩️</text>
        <view class="notice-body">
          <text class="notice-label">退款规则</text>
          <text class="notice-desc">未核销且未过期前可随时退款；过期后不予退款</text>
        </view>
      </view>
      <view class="notice-item">
        <text class="notice-icon">👥</text>
        <view class="notice-body">
          <text class="notice-label">使用人数</text>
          <text class="notice-desc">{{ peopleRuleDescription }}</text>
        </view>
      </view>
    </view>

    <!-- 底部占位 -->
    <view style="height: 40rpx;"></view>

    <!-- 底部提交栏 -->
    <view class="bottom-bar">
      <view class="bottom-info">
        <text class="bottom-label">实付款</text>
        <text class="bottom-price">¥{{ actualPrice }}</text>
        <text class="bottom-points" v-if="usePoints && pointsToUse > 0">(含{{ pointsToUse }}积分)</text>
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
                <text class="coupon-unit" v-if="c.displayPrefix">{{ c.displayPrefix }}</text>
                <text class="coupon-price">{{ c.displayValue }}</text>
              </view>
              <text class="coupon-limit">{{ c.limitText }}</text>
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
                <text class="coupon-unit" v-if="c.displayPrefix">{{ c.displayPrefix }}</text>
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

    <!-- 次卡/月卡选择面板 -->
    <view class="mask" :class="subscriptionPickerOpen ? 'show' : 'hide'" @click="closeSubscriptionPicker">
      <view class="coupon-picker" :class="subscriptionPickerOpen ? 'show' : ''" @click.stop>
        <view class="picker-header">
          <text class="picker-title">选择可用卡包</text>
          <text class="picker-close yticon icon-guanbi" @click="closeSubscriptionPicker"></text>
        </view>
        <scroll-view scroll-y class="picker-body">
          <view class="unavailable-hint" v-if="usableSubscriptions.length === 0">
            <text>暂无可用次卡或月卡</text>
          </view>
          <view
            class="coupon-card"
            v-for="sub in usableSubscriptions"
            :key="sub.object_id"
            :class="selectedSubscription && selectedSubscription.object_id === sub.object_id ? 'selected' : ''"
            @click="selectSubscription(sub)"
          >
            <view class="coupon-left" style="background: linear-gradient(135deg, #FF8C42, #E8784A); border-right-color: rgba(255,255,255,0.25);">
              <view class="coupon-price-wrap">
                <text class="coupon-price" style="color: #ffffff !important;">{{ sub.remaining_limit }}</text>
                <text class="coupon-unit" style="color: #ffffff !important; margin-left: 2px;">次</text>
              </view>
              <text class="coupon-limit" style="color: rgba(255,255,255,0.85) !important;">剩{{ sub.remaining_limit }}次</text>
            </view>
            <view class="coupon-right">
              <view class="coupon-name">{{ sub.card_template.name }}</view>
              <view class="coupon-expire" style="font-size: 20rpx; color: #999; margin-top: 4rpx;">适用: 大厅入场券抵扣</view>
              <view class="coupon-expire" style="font-size: 20rpx; color: #666;">{{ sub.order_limit_text }}</view>
              <view class="coupon-expire" style="font-size: 20rpx; color: #E8784A;">{{ sub.usage_text }}</view>
              <view class="coupon-expire" style="font-size: 20rpx; color: #999;">有效期至 {{ sub.formatted_expire }}</view>
              <view class="coupon-check" v-if="selectedSubscription && selectedSubscription.object_id === sub.object_id">✓</view>
            </view>
          </view>
          <view class="no-coupon" :class="!selectedSubscription ? 'no-coupon-active' : ''" @click="selectSubscription(null)">
            <text class="no-coupon-text">不使用卡包</text>
            <view class="coupon-check" v-if="!selectedSubscription">✓</view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script>
import { mapState, mapActions } from 'vuex';
import AUTH from '../../utils/auth.js';
import COUPON from '../../utils/coupon.js';
import SUBSCRIPTION from '../../utils/subscription.js';
import { formatDate } from '../../common/util.js';

export default {
  data() {
    return {
      ticketCount: 1,
      ticketMode: 'hall',
      hallPriceFen: 3800,
      perlerDayPriceFen: 6900,
      perlerUpgradePriceFen: 3100,
      perlerExpireDays: 30,
      perlerMaterialSpec: '1份标准材料包（建议作品不超过20×20cm）、工具使用和1次成品熨烫',
      perlerEnabled: true,
      sourceOrderNumber: '',
      maxUpgradeCount: 1,
      couponPickerOpen: false,
      myCoupons: [],
      selectedCoupon: null,
      couponManuallySelected: false,
      submitting: false,
      // 积分
      usePoints: false,
      pointsToUse: 0,
      // 次卡/月卡
      mySubscriptions: [],
      selectedSubscription: null,
      subscriptionPickerOpen: false,
    };
  },

  computed: {
    ...mapState(['hasLogin', 'token', 'userInfo', 'constance']),

    isPerlerMode() {
      return this.ticketMode === 'perler_day' || this.ticketMode === 'perler_upgrade';
    },

    isUpgradeMode() {
      return this.ticketMode === 'perler_upgrade';
    },

    supportsStandardBenefits() {
      return !this.isUpgradeMode;
    },

    supportsSubscription() {
      return this.ticketMode === 'hall';
    },

    ticketPriceFen() {
      if (this.ticketMode === 'perler_day') return this.perlerDayPriceFen;
      if (this.ticketMode === 'perler_upgrade') return this.perlerUpgradePriceFen;
      return this.hallPriceFen;
    },

    ticketName() {
      if (this.ticketMode === 'perler_day') return '拼豆一日体验票';
      if (this.ticketMode === 'perler_upgrade') return '拼豆当日升级';
      return '大厅入场券';
    },

    ticketIcon() {
      return this.isPerlerMode ? '🧩' : '🎫';
    },

    ticketBadge() {
      if (this.isUpgradeMode) return '到店专享';
      if (this.isPerlerMode) return '优惠可用';
      return this.memberLevelName;
    },

    ticketDescription() {
      if (this.isUpgradeMode) return '当天已入场/已预约顾客专享 · 不重复收大厅入场费';
      if (this.isPerlerMode) return '营业时间内不限时 · 标准材料1份 · 含大厅入场权益';
      return '全天不限时畅玩 · 零食茶水自助 · 漫画小说桌游';
    },

    validityText() {
      if (this.isUpgradeMode) return '仅限原订单到店当天使用';
      if (this.isPerlerMode) return '购买后 ' + this.perlerExpireDays + ' 天内任选1天使用';
      return '购买后 ' + this.expireDays + ' 天内有效';
    },

    redemptionDescription() {
      if (this.isUpgradeMode) return '补差订单会绑定原订单，到店向店员出示新生成的6位核销码';
      if (this.isPerlerMode) return '到店出示6位核销码，核销后可领取材料并使用当日大厅权益';
      return '到店后出示核销码或报数字码即可入场';
    },

    peopleRuleDescription() {
      if (this.isPerlerMode) return '体验按人数购买，' + this.ticketCount + ' 人需购买 ' + this.ticketCount + ' 份；每份对应1份标准材料';
      return '门票按人数购买，' + this.ticketCount + ' 人需购买 ' + this.ticketCount + ' 张';
    },

    basePriceFen() {
      return this.ticketPriceFen * this.ticketCount;
    },

    safeUserInfo() {
      return this.userInfo || { points: 0, account_balance: 0, points_config: {} };
    },

    basePrice() {
      return (this.basePriceFen / 100).toFixed(2);
    },

    memberLevelName() {
      return (this.userInfo && this.userInfo.member_level_name) || '';
    },

    userDiscount() {
      if (this.isUpgradeMode) return 100;
      return (this.userInfo && this.userInfo.discount) || 100;
    },

    memberDiscountText() {
      const d = this.userDiscount;
      if (!d || d >= 100) return '';
      const val = d / 10;
      return (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)) + '折';
    },

    usableSubscriptions() {
      if (this.isPerlerMode) return [];
      if (!this.mySubscriptions) return [];
      return this.mySubscriptions.filter(sub => {
        const template = sub.card_template || {};
        return !!SUBSCRIPTION.getUsageRule(template, SUBSCRIPTION.SLOT_TICKET) && (Number(sub.remaining_limit) || 0) > 0;
      }).map(sub => {
        const rule = SUBSCRIPTION.getUsageRule(sub.card_template || {}, SUBSCRIPTION.SLOT_TICKET) || {};
        const ruleMax = Number(rule.max_per_order) || 0;
        const orderLimit = ruleMax > 0 ? Math.min(this.ticketCount, ruleMax) : this.ticketCount;
        const deductedCount = Math.min(orderLimit, Number(sub.remaining_limit) || 0);
        const cashTicketCount = Math.max(0, this.ticketCount - deductedCount);
        return Object.assign({}, sub, {
          deducted_count: deductedCount,
          formatted_expire: formatDate(Number(sub.expire_at) || sub.expire_at),
          order_limit_text: ruleMax > 0 ? '该卡每单最多抵' + ruleMax + '张' : '按卡内剩余额度抵扣',
          usage_text: cashTicketCount > 0
            ? '本次抵' + deductedCount + '张，另' + cashTicketCount + '张按当前优惠结算'
            : '本次可抵' + deductedCount + '张大厅入场券'
        });
      });
    },

    subscriptionUpsellText() {
      return this.ticketCount >= 3 ? '多人同单可用，购卡更省' : '常来可买次卡';
    },

    subscriptionDeductedCount() {
      if (!this.selectedSubscription) return 0;
      const rule = SUBSCRIPTION.getUsageRule(this.selectedSubscription.card_template || {}, SUBSCRIPTION.SLOT_TICKET) || {};
      const ruleMax = Number(rule.max_per_order) || 0;
      const orderLimit = ruleMax > 0 ? Math.min(this.ticketCount, ruleMax) : this.ticketCount;
      return Math.min(orderLimit, Number(this.selectedSubscription.remaining_limit) || 0);
    },

    subscriptionDiscountAmountFen() {
      return this.subscriptionDeductedCount * this.ticketPriceFen;
    },

    selectedSubscriptionOrderMax() {
      if (!this.selectedSubscription) return 0;
      const rule = SUBSCRIPTION.getUsageRule(this.selectedSubscription.card_template || {}, SUBSCRIPTION.SLOT_TICKET) || {};
      return Number(rule.max_per_order) || 0;
    },

    subscriptionPayableTicketCount() {
      return Math.max(0, this.ticketCount - this.subscriptionDeductedCount);
    },

    subscriptionUsageText() {
      if (!this.selectedSubscription) return '';
      if (this.subscriptionPayableTicketCount > 0) {
        return '本单卡包抵' + this.subscriptionDeductedCount + '张，另' + this.subscriptionPayableTicketCount + '张按当前优惠结算';
      }
      return '本单' + this.subscriptionDeductedCount + '张均由卡包抵扣';
    },

    subscriptionLimitText() {
      if (!this.selectedSubscription) return '';
      if (this.selectedSubscriptionOrderMax > 0) {
        return '该卡每单最多抵' + this.selectedSubscriptionOrderMax + '张，同行人数不受限制';
      }
      return '按卡内剩余额度抵扣，同行人数不受限制';
    },

    memberDiscountAmountFen() {
      const d = this.userDiscount;
      if (!d || d >= 100) return 0;
      const remainingBaseFen = Math.max(0, this.basePriceFen - this.subscriptionDiscountAmountFen);
      return Math.floor(remainingBaseFen * (1 - d / 100));
    },

    memberDiscountAmount() {
      return (this.memberDiscountAmountFen / 100).toFixed(2);
    },

    expireDays() {
      const days = this.constance && this.constance.ticket_expire_days;
      return days ? parseInt(days) : 7;
    },

    afterMemberPriceFen() {
      return this.basePriceFen - this.subscriptionDiscountAmountFen - this.memberDiscountAmountFen;
    },

    // 积分相关
    pointsStep() {
      return this.safeUserInfo.points_config && this.safeUserInfo.points_config.points_step || 100;
    },
    pointsMaxUse() {
      return this.safeUserInfo.points_config && this.safeUserInfo.points_config.points_max_use || 10000;
    },
    pointsMinUse() {
      return this.safeUserInfo.points_config && this.safeUserInfo.points_config.points_min_use || 100;
    },
    pointsToFen() {
      return this.safeUserInfo.points_config && this.safeUserInfo.points_config.points_to_fen || 1;
    },
    pointsAmountLimit() {
      const rate = Number(this.pointsToFen) || 0;
      if (rate <= 0) return 0;
      return Math.floor(Math.max(0, this.afterMemberPriceFen - this.couponDiscountFen) / rate);
    },
    maxUsablePoints() {
      const step = Math.max(1, Number(this.pointsStep) || 1);
      const raw = Math.min(this.safeUserInfo.points || 0, this.pointsMaxUse, this.pointsAmountLimit);
      return Math.floor(raw / step) * step;
    },
    canUsePoints() {
      if (this.isUpgradeMode) return false;
      return this.safeUserInfo.points >= this.pointsMinUse
        && this.maxUsablePoints >= this.pointsMinUse
        && this.afterMemberPriceFen > 0;
    },
    pointsConvertMoney() {
      return (this.pointsToUse * this.pointsToFen / 100).toFixed(2);
    },
    maxPointsConvertMoney() {
      return (this.maxUsablePoints * this.pointsToFen / 100).toFixed(2);
    },
    pointsUsageLabel() {
      return '已选 ' + this.pointsToUse + ' 积分';
    },
    pointsUnavailableText() {
      const points = Number(this.safeUserInfo.points || 0);
      if (points <= 0) return '当前0积分，消费预约可获取积分';
      if (points < this.pointsMinUse) return '再攒 ' + (this.pointsMinUse - points) + ' 积分即可抵扣';
      const minAmount = (this.pointsMinUse * this.pointsToFen / 100).toFixed(2);
      if (this.maxUsablePoints < this.pointsMinUse) return '本单满 ¥' + minAmount + ' 可使用积分抵扣';
      return '当前积分暂不可用';
    },
    afterPointsPriceFen() {
      if (!this.usePoints) return this.afterMemberPriceFen;
      return Math.max(0, this.afterMemberPriceFen - this.pointsToUse * this.pointsToFen);
    },

    couponDiscountFen() {
      return COUPON.calcCouponDiscount(this.selectedCoupon, this.afterMemberPriceFen);
    },

    couponDiscount() {
      if (!this.selectedCoupon) return '0.00';
      return (this.couponDiscountFen / 100).toFixed(2);
    },

    afterCouponPriceFen() {
      return Math.max(0, this.afterPointsPriceFen - this.couponDiscountFen);
    },

    availableCoupons() {
      if (this.isUpgradeMode) return [];
      return COUPON.getAvailableCoupons(this.myCoupons, this.afterMemberPriceFen);
    },

    unavailableCoupons() {
      if (this.isUpgradeMode) return [];
      return COUPON.getUnavailableCoupons(this.myCoupons, this.afterMemberPriceFen);
    },

    finalPriceFen() {
      return this.afterCouponPriceFen;
    },

    actualPrice() {
      return (this.finalPriceFen / 100).toFixed(2);
    },

    balanceEnough() {
      return (this.safeUserInfo.account_balance || 0) >= this.afterCouponPriceFen;
    },

    balanceShortfall() {
      return Math.max(0, this.afterCouponPriceFen - (this.safeUserInfo.account_balance || 0));
    },

    rechargeRecommendAmount() {
      const shortfallYuan = Math.ceil(this.balanceShortfall / 100);
      if (shortfallYuan <= 0) return 0;
      if (shortfallYuan <= 200) return 200;
      if (shortfallYuan <= 300) return 300;
      if (shortfallYuan <= 500) return 500;
      return 1000;
    },

    rechargeRecommendText() {
      if (!this.rechargeRecommendAmount) return '充值';
      return '充' + this.rechargeRecommendAmount + '元更省心';
    },
  },

  watch: {
    afterMemberPriceFen() {
      this.syncPointUsage();
      this.syncCouponSelection();
    },

    maxUsablePoints() {
      this.syncPointUsage();
    },

    selectedCoupon() {
      this.syncPointUsage();
    },

    myCoupons() {
      this.syncCouponSelection();
    },
  },

  async onLoad(options) {
    this._subscriptionPurchasedHandler = () => {
      this.loadMySubscriptions();
      setTimeout(() => this.loadMySubscriptions(), 1200);
    };
    uni.$on('subscriptionPurchased', this._subscriptionPurchasedHandler);
    if (options && (options.mode === 'perler' || options.mode === 'perler_day')) {
      this.ticketMode = 'perler_day';
    } else if (options && options.mode === 'perler_upgrade') {
      this.ticketMode = 'perler_upgrade';
      this.sourceOrderNumber = decodeURIComponent(options.source_order || '');
      const maxCount = parseInt(options.max_count || 1);
      this.maxUpgradeCount = maxCount >= 1 && maxCount <= 10 ? maxCount : 1;
    }
    if (options && options.count) {
      const count = parseInt(options.count);
      if (count >= 1 && count <= 10) {
        this.ticketCount = count;
      }
    }
    this.loadTicketPrice();
    if (!this.hasLogin) {
      uni.showModal({
        title: '提示',
        content: '请先登录再购买门票',
        showCancel: false,
        success: () => {
          this.loginAndRegister().then(() => {
            if (this.supportsStandardBenefits) this.loadMyCoupons();
            if (this.supportsSubscription) this.loadMySubscriptions();
          });
        }
      });
      return;
    }
    if (this.supportsStandardBenefits) this.loadMyCoupons();
    if (this.supportsSubscription) this.loadMySubscriptions();
  },

  onUnload() {
    if (this._subscriptionPurchasedHandler) {
      uni.$off('subscriptionPurchased', this._subscriptionPurchasedHandler);
    }
  },

  methods: {
    ...mapActions(['loginAndRegister', 'getUserInfo']),

    setTicketMode(mode) {
      if (mode !== 'hall' && mode !== 'perler_day') return;
      if (mode === 'perler_day' && !this.perlerEnabled) return;
      this.ticketMode = mode;
      this.selectedCoupon = null;
      this.selectedSubscription = null;
      this.usePoints = false;
      this.pointsToUse = 0;
      this.loadMyCoupons();
      if (mode === 'hall') this.loadMySubscriptions();
    },

    async loadMyCoupons() {
      if (!this.token) return;
      try {
        const res = await AUTH.getMyCoupons(this.token, 0);
        if (res && res._status === 0) {
          const coupons = res.data || [];
          this.myCoupons = COUPON.normalizeCoupons(coupons);
        }
      } catch (e) {
        console.log('load coupons error:', e);
      }
    },

    async loadMySubscriptions() {
      if (!this.token) return;
      try {
        const res = await AUTH.getUserSubscriptions(this.token, 1, null, null, 'ticket');
        if (res && res._status === 0) {
          this.mySubscriptions = res.data || [];
          this.$nextTick(() => {
            const usable = this.usableSubscriptions;
            const matched = this.selectedSubscription ? usable.find(sub => sub.object_id === this.selectedSubscription.object_id) : null;
            this.selectedSubscription = matched || (usable.length > 0 ? usable[0] : null);
          });
        }
      } catch (e) {
        console.log('load subscriptions error:', e);
      }
    },

    openSubscriptionPicker() {
      if (this.usableSubscriptions.length === 0) {
        this.goBuySubscription();
        return;
      }
      this.subscriptionPickerOpen = true;
    },

    closeSubscriptionPicker() {
      this.subscriptionPickerOpen = false;
    },

    selectSubscription(sub) {
      this.selectedSubscription = sub;
      this.subscriptionPickerOpen = false;
    },

    goBuySubscription() {
      const amount = Math.ceil(this.basePriceFen / 100);
      AUTH.trackEvent({
        event: 'subscription_entry_click',
        page_path: 'pages/ticket/buy',
        source: 'ticket_checkout'
      }, this.token).catch(function() {});
      uni.navigateTo({ url: '/pages/user/subscription/buy?source=ticket_checkout&target_type=1&amount=' + amount });
    },

    goGroupSquareFromTicket() {
      AUTH.trackEvent({
        event: 'ticket_buy_group_click',
        page_path: 'pages/ticket/buy',
        source: 'ticket_buy',
        ticket_count: this.ticketCount
      }, this.token).catch(function() {});
      uni.switchTab({ url: '/pages/group/group' });
    },

    goPerlerUpgradeCenter() {
      uni.navigateTo({ url: '/pages/ticket/upgrade' });
    },

    prepareGiftTicket() {
      const bumped = this.ticketCount < 2;
      if (this.ticketCount < 2) {
        this.ticketCount = 2;
      }
      AUTH.trackEvent({
        event: 'ticket_buy_gift_prepare',
        page_path: 'pages/ticket/buy',
        source: 'ticket_buy',
        ticket_count: this.ticketCount
      }, this.token).catch(function() {});
      uni.showToast({ title: bumped ? '已选2张，支付后可在票包送好友' : '支付后可在票包送好友', icon: 'none' });
    },

    incPeople() {
      const maxCount = this.isUpgradeMode ? this.maxUpgradeCount : 10;
      if (this.ticketCount < maxCount) this.ticketCount++;
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
      this.couponManuallySelected = true;
      this.selectedCoupon = coupon;
      this.couponPickerOpen = false;
    },

    syncCouponSelection() {
      const result = COUPON.resolveCouponSelection(
        this.myCoupons,
        this.selectedCoupon,
        this.afterMemberPriceFen,
        this.couponManuallySelected
      );
      this.selectedCoupon = result.selectedCoupon;
      this.couponManuallySelected = result.manuallySelected;
      return result.selectedAvailable;
    },

    syncPointUsage() {
      if (!this.canUsePoints) {
        this.usePoints = false;
        this.pointsToUse = 0;
        return;
      }
      if (!this.usePoints) {
        this.pointsToUse = 0;
        return;
      }
      const step = Math.max(1, Number(this.pointsStep) || 1);
      let val = Math.min(this.pointsToUse || this.maxUsablePoints, this.maxUsablePoints);
      val = Math.floor(val / step) * step;
      if (val < this.pointsMinUse) val = this.pointsMinUse;
      this.pointsToUse = Math.min(val, this.maxUsablePoints);
    },

    goRecharge() {
      const amount = this.rechargeRecommendAmount || 300;
      uni.navigateTo({ url: '/pages/user/deposit/deposit?amount=' + amount });
    },

    togglePoints(e) {
      const enabled = !!e.detail.value && this.canUsePoints;
      this.usePoints = enabled;
      if (!enabled) {
        this.pointsToUse = 0;
      } else {
        this.pointsToUse = this.maxUsablePoints;
      }
    },

    onPointsChange(e) {
      if (!this.canUsePoints) {
        this.pointsToUse = 0;
        return;
      }
      const step = Math.max(1, Number(this.pointsStep) || 1);
      let val = Math.floor(e.detail.value / step) * step;
      val = Math.max(this.pointsMinUse, Math.min(val, this.maxUsablePoints));
      this.pointsToUse = val;
    },

    async loadTicketPrice() {
      try {
        const res = await AUTH.getConstance(this.token || null);
        if (res && res._status === 0 && res.data) {
          const enabled = res.data.perler_enabled;
          this.perlerEnabled = enabled !== false && enabled !== 0 && enabled !== '0' && enabled !== 'false';
          if (res.data.ticket_price_per_person) this.hallPriceFen = parseInt(res.data.ticket_price_per_person);
          if (res.data.perler_day_price) this.perlerDayPriceFen = parseInt(res.data.perler_day_price);
          if (res.data.perler_upgrade_price) this.perlerUpgradePriceFen = parseInt(res.data.perler_upgrade_price);
          if (res.data.perler_ticket_expire_days) this.perlerExpireDays = parseInt(res.data.perler_ticket_expire_days);
          if (res.data.perler_material_spec) this.perlerMaterialSpec = String(res.data.perler_material_spec);
          if (this.isPerlerMode && !this.perlerEnabled) {
            this.ticketMode = 'hall';
            this.sourceOrderNumber = '';
            uni.showToast({ title: '拼豆体验暂未开放', icon: 'none' });
          }
        }
      } catch (e) {
        console.log('load ticket price error:', e);
      }
    },

    async submitOrder() {
      if (!this.hasLogin) {
        uni.showModal({ title: '提示', content: '请先登录再提交订单', success: (res) => {
          if (res.confirm) this.loginAndRegister();
        }});
        return;
      }
      if (this.supportsStandardBenefits) this.syncPointUsage();
      if (this.supportsStandardBenefits && !this.syncCouponSelection()) {
        uni.showToast({ title: '已移除不可用优惠券，请确认金额', icon: 'none' });
        return;
      }
      if (this.submitting) return;
      this.submitting = true;

      try {
        const param = {
          order_type: 6,
          ticket_count: this.ticketCount,
          ticket_price: this.ticketPriceFen,
          ticket_variant: this.ticketMode,
          source_order_number: this.isUpgradeMode ? this.sourceOrderNumber : '',
          contact_name: (this.safeUserInfo.nickname || this.safeUserInfo.username || ''),
          coupon_id: this.supportsStandardBenefits && this.selectedCoupon ? this.selectedCoupon.object_id : null,
          use_points: this.supportsStandardBenefits && this.usePoints ? this.pointsToUse : 0,
          expected_amount: this.finalPriceFen,
          user_subscription_id: this.supportsSubscription && this.selectedSubscription ? this.selectedSubscription.object_id : null,
        };

        const res = await AUTH.checkout(this.token, param);
        if (!res) {
          this.submitting = false;
          return;
        }

        if (res.data && res.data._amount_mismatch) {
          console.warn('金额不一致:', '前端预估=', res.data._expected_amount, '后端实际=', res.data._actual_amount);
          uni.showModal({
            title: '金额已更新',
            content: '门票金额发生变化，请重新确认后再提交订单',
            showCancel: false
          });
          this.loadTicketPrice();
          return;
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

.ticket-mode-switch {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12rpx;
  margin: 20rpx 24rpx 16rpx;
  padding: 8rpx;
  background: #F2E9DF;
  border-radius: 16rpx;
  &.single-mode { grid-template-columns: minmax(0, 1fr); }
}
.mode-option {
  min-height: 92rpx;
  padding: 14rpx 18rpx;
  display: flex;
  align-items: center;
  gap: 14rpx;
  border: 2rpx solid transparent;
  border-radius: 12rpx;
  .mode-icon { font-size: 34rpx; }
  .mode-copy { display: flex; flex-direction: column; min-width: 0; }
  .mode-name { font-size: 27rpx; font-weight: bold; color: #68584A; }
  .mode-price { margin-top: 2rpx; font-size: 22rpx; color: #9B8877; }
  &.active {
    background: #FFF;
    border-color: rgba(232, 120, 74, 0.25);
    box-shadow: 0 4rpx 12rpx rgba(92, 75, 58, 0.08);
    .mode-name { color: #D96537; }
  }
  &.perler.active {
    border-color: rgba(42, 157, 143, 0.3);
    .mode-name { color: #21867A; }
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
.ticket-card.perler-card {
  border-color: rgba(42, 157, 143, 0.28);
  box-shadow: 0 6rpx 20rpx rgba(42, 157, 143, 0.08);
  .ticket-badge { color: #21867A; background: #E7F5F1; }
  .ticket-price-value, .total-value { color: #21867A; }
}

.perler-value-card {
  margin: 0 24rpx 20rpx;
  padding: 28rpx;
  background: #FFF;
  border: 2rpx solid rgba(42, 157, 143, 0.18);
  border-radius: 16rpx;
}
.perler-value-head { display: flex; flex-direction: column; gap: 8rpx; }
.perler-value-kicker { font-size: 22rpx; color: #21867A; font-weight: bold; }
.perler-value-title { font-size: 30rpx; color: $dark; font-weight: bold; line-height: 1.4; }
.perler-value-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10rpx;
  margin-top: 22rpx;
}
.perler-value-item {
  min-height: 112rpx;
  padding: 14rpx 8rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  background: #F1F9F7;
  border-radius: 10rpx;
  .value-icon { font-size: 34rpx; }
  .value-name { font-size: 21rpx; color: #52645F; text-align: center; line-height: 1.35; }
}
.perler-material {
  display: block;
  margin-top: 18rpx;
  padding-top: 16rpx;
  border-top: 1rpx dashed #CEE4DE;
  font-size: 23rpx;
  color: #6F7E79;
  line-height: 1.55;
}

.upgrade-guide {
  margin: 0 24rpx 20rpx;
  padding: 24rpx 26rpx;
  background: #FFF8EF;
  border-left: 6rpx solid #FF9B59;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
}
.upgrade-guide-copy {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.upgrade-guide-title { font-size: 27rpx; color: $dark; font-weight: bold; }
.upgrade-guide-desc { font-size: 22rpx; color: #72665D; line-height: 1.55; }
.upgrade-guide-btn {
  width: 174rpx;
  height: 62rpx;
  line-height: 62rpx;
  text-align: center;
  flex-shrink: 0;
  border-radius: 8rpx;
  background: #FF8C42;
  color: #FFF;
  font-size: 22rpx;
  font-weight: bold;
}

// 社交提示
.social-nudge-card {
  margin: 0 24rpx 20rpx;
  padding: 26rpx;
  background: linear-gradient(135deg, #EAF7EC 0%, #FFF8F0 60%, #FFE8D0 100%);
  border-radius: 24rpx;
  border: 2rpx solid rgba(129,199,132,0.24);
  box-shadow: 0 2rpx 12rpx rgba(92,75,58,0.06);
}
.social-nudge-copy {
  display: flex;
  flex-direction: column;
}
.social-nudge-kicker {
  font-size: 22rpx;
  color: #4A9A4A;
  font-weight: bold;
  margin-bottom: 6rpx;
}
.social-nudge-title {
  font-size: 31rpx;
  color: $dark;
  font-weight: bold;
  line-height: 1.25;
}
.social-nudge-desc {
  margin-top: 8rpx;
  font-size: 23rpx;
  line-height: 1.45;
  color: #7C6A58;
}
.social-nudge-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 20rpx;
}
.social-nudge-btn {
  flex: 1;
  height: 68rpx;
  border-radius: 34rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 25rpx;
  font-weight: bold;
  box-sizing: border-box;

  &.primary {
    color: #fff;
    background: #81C784;
  }

  &.secondary {
    color: $primary;
    background: #FFF3E8;
    border: 2rpx solid rgba(255,140,66,0.2);
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
      .coupon-right {
        display: flex;
        align-items: center;
        gap: 8rpx;
        .coupon-value {
          font-size: 28rpx;
          color: $primary;
          font-weight: bold;
        }
        .cell-more {
          font-size: 26rpx;
          color: $gray;
          display: flex;
          align-items: center;
          gap: 4rpx;
          &.cell-active { color: $primary; }
        }
      }
    }
    .subscription-breakdown {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20rpx;
      background: #FFF8F6;
      border-radius: 8rpx;
      border-left: 6rpx solid $primary;
      padding: 16rpx 18rpx;
      margin: -4rpx 0 16rpx;
      .subscription-breakdown-copy {
        min-width: 0;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 6rpx;
      }
      .subscription-breakdown-title {
        font-size: 24rpx;
        line-height: 1.45;
        color: $primary;
        font-weight: bold;
      }
      .subscription-breakdown-note {
        font-size: 20rpx;
        line-height: 1.4;
        color: #777;
      }
      .subscription-counts {
        flex-shrink: 0;
        display: flex;
        align-items: center;
      }
      .subscription-count-item {
        min-width: 76rpx;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .subscription-count-value {
        font-size: 30rpx;
        line-height: 1.1;
        color: $primary;
        font-weight: bold;
        &.payable { color: $dark; }
      }
      .subscription-count-label {
        margin-top: 6rpx;
        font-size: 18rpx;
        color: #888;
        white-space: nowrap;
      }
      .subscription-count-divider {
        width: 1px;
        height: 42rpx;
        margin: 0 10rpx;
        background: #F1D8CF;
      }
    }
    .balance-row {
      background: #F8F8F8;
      border-radius: 10rpx;
      padding: 12rpx 16rpx;
      .balance-status {
        font-size: 28rpx;
        &.enough { color: #52C41A; }
        &.short { color: $primary; }
      }
    }
    // 积分抵扣
    .points-row {
      background: #FFFBF0;
      border-radius: 10rpx;
      padding: 16rpx;
      flex-direction: column;
      align-items: stretch;
    }
    .points-zero-row {
      background: #F8F8F8;
      border-radius: 10rpx;
      padding: 12rpx 16rpx;
    }
    .points-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      box-sizing: border-box;
      .points-info {
        display: flex;
        align-items: center;
        .points-balance {
          font-size: 26rpx;
          color: $gray;
          margin-left: 8rpx;
        }
      }
      switch {
        transform: scale(0.8);
        transform-origin: right center;
      }
    }
    .points-slider {
      padding: 12rpx 0 0;
      border-top: 1rpx dashed #E8E0C0;
      margin-top: 12rpx;
      .slider-wrap {
        .slider-labels {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8rpx;
          .slider-label {
            font-size: 22rpx;
            color: $gray;
          }
        }
        slider { width: 100%; }
      }
      .points-result {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 10rpx;
        .result-points {
          font-size: 26rpx;
          color: $gray;
        }
        .result-money {
          font-size: 28rpx;
          color: $primary;
          font-weight: bold;
        }
      }
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
.fixed-price-row {
  align-items: flex-start !important;
  padding: 18rpx 0 !important;
  .row-label { flex: 1; padding-right: 18rpx; line-height: 1.5; }
  .fixed-price-note { flex-shrink: 0; font-size: 22rpx; color: #21867A; }
}
.benefit-policy-row {
  align-items: flex-start !important;
  padding: 18rpx 0 !important;
  .row-label { flex: 1; padding-right: 18rpx; line-height: 1.5; }
  .benefit-policy-note { flex-shrink: 0; font-size: 22rpx; color: #888; }
}

// 使用须知
.notice-section {
  margin: 0 24rpx 20rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  box-shadow: 0 2rpx 12rpx rgba(92,75,58,0.06);
  border: 2rpx solid rgba(255,181,167,0.15);

  .notice-header {
    display: flex;
    align-items: center;
    gap: 10rpx;
    margin-bottom: 20rpx;
    .notice-title-icon { font-size: 32rpx; }
    .notice-title { font-size: 30rpx; font-weight: bold; color: $dark; }
  }

  // 有效期高亮卡片
  .notice-highlight {
    background: linear-gradient(135deg, #FFF5EB, #FFF0E0);
    border-radius: 16rpx;
    padding: 24rpx;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20rpx;
    border: 2rpx solid rgba(255,140,66,0.15);
    .highlight-left {
      display: flex;
      align-items: center;
      gap: 16rpx;
      .hl-icon { font-size: 40rpx; }
      .hl-text {
        display: flex;
        flex-direction: column;
        .hl-label { font-size: 24rpx; color: $gray; margin-bottom: 6rpx; }
        .hl-value { font-size: 30rpx; font-weight: bold; color: $primary; }
      }
    }
    .hl-tag {
      font-size: 22rpx;
      font-weight: bold;
      padding: 6rpx 16rpx;
      border-radius: 20rpx;
      &.warning { background: #FFEBEE; color: #FF3B30; }
    }
  }

  .notice-divider {
    height: 2rpx;
    background: $light-gray;
    margin-bottom: 20rpx;
  }

  .notice-item {
    display: flex;
    align-items: flex-start;
    gap: 16rpx;
    margin-bottom: 20rpx;
    &:last-child { margin-bottom: 0; }
    .notice-icon { font-size: 32rpx; flex-shrink: 0; margin-top: 2rpx; }
    .notice-body {
      display: flex;
      flex-direction: column;
      .notice-label { font-size: 26rpx; font-weight: bold; color: $dark; margin-bottom: 6rpx; }
      .notice-desc { font-size: 24rpx; color: $gray; line-height: 1.5; }
    }
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
    .bottom-points {
      font-size: 22rpx;
      color: $gray;
      margin-left: 8rpx;
    }
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
