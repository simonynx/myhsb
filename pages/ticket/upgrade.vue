<template>
  <view class="page">
    <view class="intro-band">
      <view class="intro-icon">🧩</view>
      <view class="intro-copy">
        <text class="intro-title">拼豆到店升级</text>
        <text class="intro-desc">系统会根据今天的入场权益显示对应价格</text>
      </view>
    </view>

    <view class="login-band" v-if="!hasLogin">
      <view>
        <text class="login-title">登录后查询升级资格</text>
        <text class="login-desc">扫描店员升级码也需要登录后领取</text>
      </view>
      <view class="login-btn" @click="loginAndLoad">登录</view>
    </view>

    <view class="loading-band" v-else-if="loading">
      <text>正在查询今天的入场权益...</text>
    </view>

    <block v-else-if="hasLogin">
      <view class="error-band" v-if="loadError">
        <view>
          <text class="error-title">升级资格暂时无法加载</text>
          <text class="error-desc">{{ loadError }}</text>
        </view>
        <view class="retry-btn" @click="loadOptions">重试</view>
      </view>

      <view class="section" v-if="!loadError && channelAuthorization">
        <view class="section-head">
          <view>
            <text class="section-title">店员已确认{{ channelAuthorization.source_channel_text }}团单</text>
            <text class="section-sub">一次性授权 · {{ channelExpireText }}</text>
          </view>
          <text class="source-tag external">外部平台</text>
        </view>
        <view class="entitlement-card channel-card">
          <view class="entitlement-main">
            <text class="entitlement-title">{{ channelAuthorization.room_name }}</text>
            <text class="entitlement-meta">开台单 {{ channelAuthorization.session_number }}</text>
            <text class="entitlement-meta">{{ channelAuthorization.ticket_count }}人 · 每人1份标准材料</text>
          </view>
          <view class="entitlement-side">
            <text class="price">¥{{ formatFen(channelAuthorization.unit_price) }}</text>
            <text class="price-unit">/人</text>
          </view>
          <view class="primary-btn" :class="claiming ? 'disabled' : ''" @click="claimChannelUpgrade">
            {{ channelActionText }}
          </view>
        </view>
      </view>

      <view class="section" v-if="!loadError && internalOptions.length > 0">
        <view class="section-head">
          <view>
            <text class="section-title">可用的小程序权益</text>
            <text class="section-sub">当天已付款订单专享</text>
          </view>
          <text class="source-tag internal">¥{{ formatFen(internalUnitPrice) }}/人</text>
        </view>
        <view
          class="entitlement-card"
          v-for="item in internalOptions"
          :key="item.source_order_number"
        >
          <view class="entitlement-main">
            <text class="entitlement-title">{{ item.title }}</text>
            <text class="entitlement-meta">{{ item.source_type_text }} · {{ item.subtitle }}</text>
            <text class="entitlement-meta">还可升级 {{ item.remaining_count }} 人</text>
          </view>
          <view class="entitlement-side">
            <text class="price">¥{{ formatFen(item.unit_price) }}</text>
            <text class="price-unit">/人</text>
          </view>
          <view class="primary-btn" @click="selectInternalOption(item)">选择此订单</view>
        </view>
      </view>

      <view class="section" v-if="!loadError && !channelAuthorization">
        <view class="section-head">
          <view>
            <text class="section-title">美团 / 抖音等平台团单</text>
            <text class="section-sub">仅适用于未包含拼豆的入场或包厢团单</text>
          </view>
          <text class="source-tag external">¥{{ formatFen(channelUnitPrice) }}/人</text>
        </view>
        <view class="external-flow">
          <view class="flow-item">
            <text class="flow-index">1</text>
            <text class="flow-text">店员核销原平台团单</text>
          </view>
          <view class="flow-line"></view>
          <view class="flow-item">
            <text class="flow-index">2</text>
            <text class="flow-text">扫描店员生成的升级码</text>
          </view>
          <view class="flow-line"></view>
          <view class="flow-item">
            <text class="flow-index">3</text>
            <text class="flow-text">确认人数和金额后付款</text>
          </view>
        </view>
        <view class="channel-note">美团拼豆一日团单已经包含拼豆，无需再次升级</view>
      </view>

      <view class="empty-band" v-if="!loadError && internalOptions.length === 0 && !channelAuthorization">
        <text class="empty-title">今天还没有可升级的小程序订单</text>
        <text class="empty-desc">可以直接购买完整拼豆一日票，购买后30天内任选一天到店</text>
      </view>
    </block>

    <view class="day-ticket-band">
      <view>
        <text class="day-ticket-title">没有已有入场权益？</text>
        <text class="day-ticket-desc">拼豆一日票含大厅入场和1份标准材料</text>
      </view>
      <view class="day-ticket-action" @click="goDayTicket">
        <text class="day-ticket-price">¥{{ formatFen(dayTicketPrice) }}</text>
        <text class="day-ticket-link">直接购买 ›</text>
      </view>
    </view>
  </view>
</template>

<script>
import { mapState, mapActions } from 'vuex';
import AUTH from '../../utils/auth.js';
import PLATFORM from '../../common/platform.js';

export default {
  data() {
    return {
      loading: false,
      loaded: false,
      loadError: '',
      claiming: false,
      channelToken: '',
      preferredSourceOrder: '',
      internalOptions: [],
      channelAuthorization: null,
      internalUnitPrice: 3100,
      channelUnitPrice: 3900,
      dayTicketPrice: 6900,
    };
  },

  computed: {
    ...mapState(['hasLogin', 'token']),
    channelExpireText() {
      if (!this.channelAuthorization || !this.channelAuthorization.expires_at) return '';
      const date = new Date(this.channelAuthorization.expires_at * 1000);
      const hour = String(date.getHours()).padStart(2, '0');
      const minute = String(date.getMinutes()).padStart(2, '0');
      return hour + ':' + minute + '前有效';
    },
    channelActionText() {
      if (this.claiming) return '处理中...';
      const order = this.channelAuthorization && this.channelAuthorization.claimed_order;
      if (order && order.order_status === 0) return '继续支付';
      if (order && order.order_status === 1) return '已完成升级';
      return '确认并去付款';
    },
  },

  onLoad(options) {
    const query = PLATFORM.getLaunchQuery(options || {});
    this.channelToken = String(query.pu || query.channel_token || '');
    this.preferredSourceOrder = String(query.source_order || '');
  },

  onShow() {
    if (this.hasLogin && !this.loading) this.loadOptions();
  },

  methods: {
    ...mapActions(['loginAndRegister']),

    formatFen(value) {
      const amount = Number(value || 0) / 100;
      return amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2);
    },

    async loginAndLoad() {
      try {
        await this.loginAndRegister();
        await this.loadOptions();
      } catch (e) {
        uni.showToast({ title: '登录失败，请重试', icon: 'none' });
      }
    },

    async loadOptions() {
      if (!this.token || this.loading) return;
      this.loading = true;
      this.loadError = '';
      try {
        const res = await AUTH.getPerlerUpgradeOptions(this.token, this.channelToken);
        if (res && res._status === 0) {
          const data = res.data || {};
          let options = data.internal_options || [];
          if (this.preferredSourceOrder) {
            const preferred = this.preferredSourceOrder;
            options = options.slice().sort(function(a, b) {
              if (a.source_order_number === preferred) return -1;
              if (b.source_order_number === preferred) return 1;
              return 0;
            });
          }
          this.internalOptions = options;
          this.channelAuthorization = data.channel_authorization || null;
          this.internalUnitPrice = Number(data.internal_unit_price || 3100);
          this.channelUnitPrice = Number(data.channel_unit_price || 3900);
          this.dayTicketPrice = Number(data.day_ticket_price || 6900);
          this.loaded = true;
        } else {
          this.loadError = '请稍后重试，或让店员重新生成升级码';
        }
      } catch (e) {
        this.loadError = (e && e.message) || '升级码可能已过期，请让店员重新生成';
      } finally {
        this.loading = false;
      }
    },

    selectInternalOption(item) {
      const source = encodeURIComponent(item.source_order_number || '');
      const count = Math.max(1, Math.min(10, Number(item.remaining_count) || 1));
      uni.navigateTo({
        url: '/pages/ticket/buy?mode=perler_upgrade&source_order=' + source + '&max_count=' + count
      });
    },

    async claimChannelUpgrade() {
      if (this.claiming || !this.channelAuthorization) return;
      const existing = this.channelAuthorization.claimed_order;
      if (existing && existing.order_status === 1) {
        uni.navigateTo({ url: '/pages/ticket/list' });
        return;
      }
      this.claiming = true;
      try {
        const res = await AUTH.claimPerlerChannelUpgrade(this.token, this.channelToken);
        if (!res || res._status !== 0 || !res.data) return;
        const order = res.data;
        if (order.order_status === 1) {
          uni.navigateTo({ url: '/pages/ticket/list' });
          return;
        }
        uni.navigateTo({
          url: '/pages/order/payment?data=' + encodeURIComponent(JSON.stringify(order)) + '&entry=perler_channel'
        });
      } catch (e) {
        uni.showToast({ title: (e && e.message) || '升级订单创建失败', icon: 'none' });
      } finally {
        this.claiming = false;
      }
    },

    goDayTicket() {
      uni.navigateTo({ url: '/pages/ticket/buy?mode=perler_day' });
    },
  },
};
</script>

<style lang="scss">
$orange: #FF8C42;
$green: #2A9D8F;
$ink: #433A32;
$muted: #7B7169;

page { background: #F7F6F3; }
.page { min-height: 100vh; padding: 22rpx 24rpx 60rpx; box-sizing: border-box; }
.intro-band {
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 24rpx 4rpx 30rpx;
}
.intro-icon {
  width: 76rpx;
  height: 76rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
  background: #E5F5F1;
  font-size: 42rpx;
}
.intro-copy { min-width: 0; flex: 1; }
.intro-title { display: block; font-size: 36rpx; line-height: 1.25; color: $ink; font-weight: bold; }
.intro-desc { display: block; margin-top: 7rpx; font-size: 23rpx; color: $muted; line-height: 1.45; }
.login-band, .day-ticket-band {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  padding: 24rpx;
  background: #FFF;
  border: 1rpx solid #E8E3DC;
  border-radius: 12rpx;
}
.login-title, .day-ticket-title { display: block; font-size: 27rpx; color: $ink; font-weight: bold; }
.login-desc, .day-ticket-desc { display: block; margin-top: 6rpx; font-size: 21rpx; color: $muted; line-height: 1.4; }
.login-btn {
  width: 120rpx;
  height: 62rpx;
  line-height: 62rpx;
  text-align: center;
  flex-shrink: 0;
  border-radius: 8rpx;
  color: #FFF;
  background: $green;
  font-size: 24rpx;
  font-weight: bold;
}
.loading-band { padding: 56rpx 0; text-align: center; color: $muted; font-size: 24rpx; }
.error-band {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  padding: 22rpx 24rpx;
  background: #FFF4F2;
  border-left: 6rpx solid #D9685A;
  border-radius: 8rpx;
}
.error-title { display: block; color: #8D3D34; font-size: 25rpx; font-weight: bold; }
.error-desc { display: block; margin-top: 6rpx; color: #8A6762; font-size: 21rpx; line-height: 1.45; }
.retry-btn { flex-shrink: 0; color: #B34F43; font-size: 23rpx; font-weight: bold; }
.section { margin-top: 28rpx; }
.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 14rpx;
  padding: 0 4rpx;
}
.section-title { display: block; font-size: 29rpx; color: $ink; font-weight: bold; }
.section-sub { display: block; margin-top: 5rpx; font-size: 21rpx; color: $muted; }
.source-tag {
  flex-shrink: 0;
  padding: 7rpx 12rpx;
  border-radius: 8rpx;
  font-size: 20rpx;
  font-weight: bold;
}
.source-tag.internal { color: #B75A24; background: #FFF0E5; }
.source-tag.external { color: #16776B; background: #E4F4F0; }
.entitlement-card {
  margin-bottom: 14rpx;
  padding: 24rpx;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  column-gap: 18rpx;
  row-gap: 20rpx;
  background: #FFF;
  border: 1rpx solid #E8E3DC;
  border-radius: 12rpx;
}
.channel-card { border-color: #BFDCD5; }
.entitlement-main { min-width: 0; }
.entitlement-title { display: block; font-size: 28rpx; color: $ink; font-weight: bold; line-height: 1.35; }
.entitlement-meta { display: block; margin-top: 7rpx; font-size: 21rpx; color: $muted; line-height: 1.4; }
.entitlement-side { display: flex; align-items: baseline; color: $orange; }
.price { font-size: 36rpx; line-height: 1; font-weight: bold; }
.price-unit { font-size: 20rpx; }
.primary-btn {
  grid-column: 1 / 3;
  height: 68rpx;
  line-height: 68rpx;
  text-align: center;
  border-radius: 8rpx;
  background: $orange;
  color: #FFF;
  font-size: 25rpx;
  font-weight: bold;
}
.primary-btn.disabled { opacity: 0.55; }
.external-flow {
  min-height: 126rpx;
  display: flex;
  align-items: flex-start;
  padding: 24rpx 16rpx;
  background: #FFF;
  border: 1rpx solid #E8E3DC;
  border-radius: 12rpx;
  box-sizing: border-box;
}
.flow-item { width: 29%; display: flex; flex-direction: column; align-items: center; text-align: center; }
.flow-index {
  width: 42rpx;
  height: 42rpx;
  line-height: 42rpx;
  border-radius: 50%;
  color: #FFF;
  background: $green;
  font-size: 21rpx;
  font-weight: bold;
}
.flow-text { margin-top: 10rpx; font-size: 20rpx; color: #5F5750; line-height: 1.4; }
.flow-line { flex: 1; height: 2rpx; margin-top: 20rpx; background: #CFE3DE; }
.channel-note { margin-top: 10rpx; padding: 14rpx 16rpx; color: #7C6554; background: #FFF4E8; font-size: 21rpx; line-height: 1.45; }
.empty-band { margin-top: 22rpx; padding: 24rpx 4rpx; border-top: 1rpx solid #E5E0D8; }
.empty-title { display: block; font-size: 25rpx; color: $ink; font-weight: bold; }
.empty-desc { display: block; margin-top: 7rpx; font-size: 21rpx; color: $muted; line-height: 1.5; }
.day-ticket-band { margin-top: 28rpx; }
.day-ticket-action { flex-shrink: 0; text-align: right; }
.day-ticket-price { display: block; color: $orange; font-size: 31rpx; font-weight: bold; }
.day-ticket-link { display: block; margin-top: 4rpx; color: #B75A24; font-size: 21rpx; font-weight: bold; }
</style>
