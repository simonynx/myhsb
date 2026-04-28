<template>
  <view class="page">
    <!-- 渐变导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-back-wrap" @click="goBack">
        <text class="nav-back">&lt;</text>
      </view>
      <text class="nav-title">我的门票</text>
      <view class="nav-right"></view>
    </view>

    <!-- 顶部装饰区 -->
    <view class="header-bg">
      <view class="header-inner">
        <text class="header-emoji">🎫</text>
        <text class="header-title">大厅入场券</text>
        <text class="header-sub">购买后有效期内到店出示即可入场</text>
      </view>
      <!-- 波浪底边 -->
      <view class="wave-bottom">
        <view class="wave-dot" v-for="i in 20" :key="i"></view>
      </view>
    </view>

    <!-- 空状态 -->
    <view class="empty-state" v-if="!loading && tickets.length === 0">
      <view class="empty-card">
        <text class="empty-icon">🎫</text>
        <text class="empty-text">暂无门票</text>
        <text class="empty-sub">去首页买张大厅入场券吧～</text>
        <view class="empty-btn" @click="goToBuy">
          <text>去购买</text>
        </view>
      </view>
    </view>

    <!-- 门票列表 -->
    <view class="ticket-list" v-else>
      <view
        class="ticket-card"
        v-for="(item, idx) in tickets"
        :key="item.object_id"
        :class="item._statusClass"
      >
        <!-- 左侧状态条 -->
        <view class="card-left-bar"></view>

        <view class="card-body">
          <!-- 顶部：状态 + 有效期 -->
          <view class="card-top">
            <view class="status-tag" :class="item._statusClass">
              <text>{{ item._statusText }}</text>
            </view>
            <view class="expire-wrap">
              <text class="expire-icon">⏳</text>
              <text class="expire-text">有效期至 {{ item._expireDate }}</text>
            </view>
          </view>

          <!-- 中部：票券信息 -->
          <view class="card-info">
            <view class="ticket-name-row">
              <text class="ticket-icon">🎫</text>
              <text class="ticket-name">大厅入场券</text>
              <text class="ticket-count">× {{ item.ticket_count || 1 }}人</text>
            </view>
            <view class="ticket-price-row">
              <text class="price-label">实付金额</text>
              <text class="price-value">¥{{ (item.pay_amount / 100).toFixed(2) }}</text>
            </view>
          </view>

          <!-- 分割线（穿孔效果） -->
          <view class="ticket-divider">
            <view class="hole hole-left"></view>
            <view class="dashed-line"></view>
            <view class="hole hole-right"></view>
          </view>

          <!-- 底部：核销码 + 操作 -->
          <view class="card-bottom">
            <!-- 未使用：展示核销码 -->
            <template v-if="item._statusClass === 'unused'">
              <view class="code-preview" @click="toggleExpand(idx)">
                <view class="code-digits-mini">
                  <template v-for="(d, di) in item._codeArr">
                    <text class="digit-mini" v-if="d !== ' '" :key="'m'+di">{{ d }}</text>
                    <text class="digit-gap" v-else :key="'g'+di"></text>
                  </template>
                </view>
                <text class="code-toggle-text">{{ item._expanded ? '收起 ▲' : '查看核销码 ▼' }}</text>
              </view>

              <!-- 展开的大核销码 -->
              <view class="code-expand" v-if="item._expanded">
                <view class="code-digits-large">
                  <template v-for="(d, di) in item._codeArr">
                    <text class="digit-large" v-if="d !== ' '" :key="'l'+di">{{ d }}</text>
                    <text class="digit-gap-large" v-else :key="'gl'+di"></text>
                  </template>
                </view>
                <text class="code-tip">到店后出示给前台核销</text>
              </view>

              <view class="action-btns">
                <view class="action-btn secondary" @click="goToOrderDetail(item)">
                  <text>订单详情</text>
                </view>
                <view class="action-btn primary" @click="refundTicket(item)">
                  <text>申请退款</text>
                </view>
              </view>
            </template>

            <!-- 已核销 / 已过期 -->
            <template v-else>
              <view class="status-hint">
                <text class="hint-icon">{{ item._statusClass === 'used' ? '✅' : '⏰' }}</text>
                <text class="hint-text">{{ item._statusClass === 'used' ? '已核销，欢迎下次光临' : '已过期，请重新购买' }}</text>
              </view>
              <view class="action-btns single">
                <view class="action-btn secondary" @click="goToOrderDetail(item)">
                  <text>订单详情</text>
                </view>
              </view>
            </template>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部购买提示 -->
    <view class="bottom-hint" v-if="tickets.length > 0">
      <text>需要更多门票？</text>
      <text class="bottom-link" @click="goToBuy">去购买 →</text>
    </view>

    <!-- 加载中 -->
    <view class="loading-wrap" v-if="loading">
      <text class="loading-text">加载中...</text>
    </view>
  </view>
</template>

<script>
import AUTH from '../../utils/auth.js';
import { mapState } from 'vuex';
import { formatDate } from '../../common/util.js';

export default {
  data() {
    return {
      tickets: [],
      loading: false,
      statusBarHeight: 0,
    };
  },

  computed: {
    ...mapState(['token']),
  },

  onShow() {
    this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 0;
    this.loadTickets();
  },

  methods: {
    async loadTickets() {
      if (!this.token) return;
      this.loading = true;
      try {
        const res = await AUTH.getTicketOrders(this.token);
        if (res && res._status === 0) {
          const list = res.data || [];
          const now = Date.now() / 1000;
          this.tickets = list.map(item => {
            const expireAt = item.expire_at || 0;
            const verifiedAt = item.verified_at;
            let statusClass = 'unused';
            let statusText = '未使用';
            if (verifiedAt) {
              statusClass = 'used';
              statusText = '已核销';
            } else if (expireAt && expireAt < now) {
              statusClass = 'expired';
              statusText = '已过期';
            }
            let expireDate = formatDate(expireAt);
            const code = item.verify_code || '';
            const codeArr = [];
            for (let i = 0; i < code.length; i++) {
              codeArr.push(code[i]);
              if (i === 2) codeArr.push(' ');
            }
            return {
              ...item,
              _statusClass: statusClass,
              _statusText: statusText,
              _expireDate: expireDate,
              _codeArr: codeArr,
              _expanded: false,
            };
          });
        }
      } catch (e) {
        console.error('load tickets error:', e);
        uni.showToast({ title: '加载失败', icon: 'none' });
      } finally {
        this.loading = false;
      }
    },

    toggleExpand(idx) {
      this.tickets[idx]._expanded = !this.tickets[idx]._expanded;
    },

    goBack() {
      uni.navigateBack();
    },

    goToBuy() {
      uni.switchTab({ url: '/pages/index/index' });
    },

    goToOrderDetail(item) {
      uni.navigateTo({ url: '/pages/order/order?order_number=' + item.order_number });
    },

    async refundTicket(item) {
      const res = await uni.showModal({
        title: '确认退款',
        content: '退款将原路退回，确认申请退款吗？',
        confirmText: '确认退款',
        confirmColor: '#FF8C42',
      });
      if (!res.confirm) return;

      uni.showLoading({ title: '处理中...' });
      try {
        const result = await AUTH.refundOrder(this.token, { order_number: item.order_number });
        uni.hideLoading();
        if (result && result._status === 0) {
          uni.showToast({ title: '退款成功', icon: 'success' });
          this.loadTickets();
        } else {
          uni.showToast({ title: (result && result._reason) || '退款失败', icon: 'none' });
        }
      } catch (e) {
        uni.hideLoading();
        uni.showToast({ title: '退款失败', icon: 'none' });
      }
    },
  },
};
</script>

<style lang="scss">
$primary: #FF8C42;
$primary-light: #FFB5A7;
$dark: #5C4B3A;
$gray: #A08B7A;
$bg: #FFF8F0;

page { background: $bg; }

.page { min-height: 100vh; background: $bg; }

// ========== 导航栏 ==========
.nav-bar {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 100;
  height: 88rpx;
  background: linear-gradient(135deg, #FF8C42, #FFB5A7);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20rpx;
  .nav-back-wrap {
    width: 60rpx;
    height: 60rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .nav-back { font-size: 40rpx; color: #fff; font-weight: bold; line-height: 1; }
  .nav-title { font-size: 34rpx; font-weight: bold; color: #fff; flex: 1; text-align: center; }
  .nav-right { width: 60rpx; }
}

// ========== 顶部装饰区 ==========
.header-bg {
  background: linear-gradient(135deg, #FF8C42, #FFB5A7);
  padding-top: 108rpx;
  padding-bottom: 60rpx;
  position: relative;
  .header-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    .header-emoji { font-size: 72rpx; margin-bottom: 12rpx; }
    .header-title { font-size: 40rpx; font-weight: bold; color: #fff; margin-bottom: 10rpx; }
    .header-sub { font-size: 26rpx; color: rgba(255,255,255,0.9); }
  }
  // 波浪底边
  .wave-bottom {
    position: absolute;
    bottom: -16rpx;
    left: 0; right: 0;
    display: flex;
    justify-content: space-between;
    padding: 0 10rpx;
    .wave-dot {
      width: 32rpx;
      height: 32rpx;
      border-radius: 50%;
      background: $bg;
    }
  }
}

// ========== 空状态 ==========
.empty-state {
  display: flex;
  justify-content: center;
  padding-top: 80rpx;
  .empty-card {
    background: #fff;
    border-radius: 32rpx;
    padding: 60rpx 80rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    box-shadow: 0 8rpx 32rpx rgba(92,75,58,0.08);
    border: 2rpx solid rgba(255,181,167,0.2);
    .empty-icon { font-size: 100rpx; margin-bottom: 20rpx; }
    .empty-text { font-size: 34rpx; font-weight: bold; color: $dark; margin-bottom: 12rpx; }
    .empty-sub { font-size: 26rpx; color: $gray; margin-bottom: 40rpx; }
    .empty-btn {
      background: linear-gradient(135deg, #FF8C42, #FFB5A7);
      color: #fff;
      font-size: 28rpx;
      font-weight: bold;
      padding: 22rpx 80rpx;
      border-radius: 50rpx;
      box-shadow: 0 8rpx 24rpx rgba(255,100,66,0.3);
    }
  }
}

// ========== 门票列表 ==========
.ticket-list {
  padding: 30rpx 24rpx 40rpx;
}

// 票券卡片
.ticket-card {
  background: #fff;
  border-radius: 24rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 8rpx 24rpx rgba(92,75,58,0.08);
  display: flex;
  overflow: hidden;
  position: relative;

  // 左侧状态彩条
  .card-left-bar {
    width: 10rpx;
    flex-shrink: 0;
  }
  &.unused .card-left-bar { background: linear-gradient(to bottom, #4CAF50, #81C784); }
  &.used .card-left-bar { background: linear-gradient(to bottom, $gray, #C8B8A8); }
  &.expired .card-left-bar { background: linear-gradient(to bottom, #FF3B30, #FF8A80); }

  .card-body {
    flex: 1;
    padding: 28rpx;
  }
}

// 顶部：状态 + 有效期
.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
  .status-tag {
    font-size: 22rpx;
    font-weight: bold;
    padding: 6rpx 18rpx;
    border-radius: 24rpx;
    &.unused { background: #E8F5E9; color: #4CAF50; }
    &.used { background: #F5F5F5; color: $gray; }
    &.expired { background: #FFEBEE; color: #FF3B30; }
  }
  .expire-wrap {
    display: flex;
    align-items: center;
    gap: 6rpx;
    .expire-icon { font-size: 22rpx; }
    .expire-text { font-size: 24rpx; color: $gray; }
  }
}

// 中部：票券信息
.card-info {
  padding-bottom: 20rpx;
  .ticket-name-row {
    display: flex;
    align-items: center;
    gap: 12rpx;
    margin-bottom: 16rpx;
    .ticket-icon { font-size: 36rpx; }
    .ticket-name { font-size: 32rpx; font-weight: bold; color: $dark; }
    .ticket-count { font-size: 28rpx; color: $gray; margin-left: auto; }
  }
  .ticket-price-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    .price-label { font-size: 26rpx; color: $gray; }
    .price-value { font-size: 40rpx; font-weight: bold; color: $primary; }
  }
}

// 分割线（穿孔效果）
.ticket-divider {
  position: relative;
  height: 2rpx;
  margin: 4rpx 0;
  .dashed-line {
    position: absolute;
    top: 0; left: 16rpx; right: 16rpx;
    height: 100%;
    border-top: 2rpx dashed #E8E0D8;
  }
  .hole {
    position: absolute;
    top: -14rpx;
    width: 28rpx;
    height: 28rpx;
    border-radius: 50%;
    background: $bg;
    &.hole-left { left: -14rpx; }
    &.hole-right { right: -14rpx; }
  }
}

// 底部：核销码 + 操作
.card-bottom {
  padding-top: 20rpx;

  .code-preview {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16rpx;
    .code-digits-mini {
      display: flex;
      gap: 8rpx;
      .digit-mini {
        font-size: 32rpx;
        font-weight: bold;
        color: $dark;
        letter-spacing: 4rpx;
      }
      .digit-gap { width: 12rpx; }
    }
    .code-toggle-text {
      font-size: 24rpx;
      color: $primary;
      font-weight: 500;
    }
  }

  .code-expand {
    background: #FFF8F0;
    border-radius: 20rpx;
    padding: 32rpx;
    margin-bottom: 20rpx;
    text-align: center;
    border: 2rpx solid rgba(255,140,66,0.15);
    .code-digits-large {
      display: flex;
      justify-content: center;
      gap: 16rpx;
      margin-bottom: 16rpx;
      .digit-large {
        width: 80rpx;
        height: 100rpx;
        line-height: 100rpx;
        background: #fff;
        border-radius: 16rpx;
        font-size: 44rpx;
        font-weight: bold;
        color: $primary;
        box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.06);
        border: 2rpx solid #FFD0C0;
      }
      .digit-gap-large { width: 20rpx; }
    }
    .code-tip { font-size: 24rpx; color: $gray; }
  }

  .status-hint {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10rpx;
    padding: 20rpx 0;
    .hint-icon { font-size: 32rpx; }
    .hint-text { font-size: 28rpx; color: $gray; }
  }

  .action-btns {
    display: flex;
    justify-content: flex-end;
    gap: 16rpx;
    &.single { justify-content: center; }
    .action-btn {
      font-size: 26rpx;
      padding: 14rpx 40rpx;
      border-radius: 32rpx;
      text-align: center;
      &.secondary {
        background: #F5F0E8;
        color: $dark;
      }
      &.primary {
        background: linear-gradient(135deg, #FF8C42, #FFB5A7);
        color: #fff;
        box-shadow: 0 4rpx 16rpx rgba(255,100,66,0.3);
      }
    }
  }
}

// ========== 底部提示 ==========
.bottom-hint {
  text-align: center;
  padding-bottom: 60rpx;
  font-size: 26rpx;
  color: $gray;
  .bottom-link {
    color: $primary;
    font-weight: bold;
    margin-left: 10rpx;
  }
}

// ========== 加载中 ==========
.loading-wrap {
  text-align: center;
  padding-top: 200rpx;
  .loading-text { font-size: 28rpx; color: $gray; }
}
</style>
