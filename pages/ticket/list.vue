<template>
  <view class="page">
    <!-- 导航栏 -->
    <view class="nav-bar">
      <text class="nav-back yticon icon-fanhui" @click="goBack"></text>
      <text class="nav-title">我的门票</text>
    </view>

    <!-- 空状态 -->
    <view class="empty-state" v-if="!loading && tickets.length === 0">
      <text class="empty-icon">🎫</text>
      <text class="empty-text">暂无门票</text>
      <text class="empty-sub">去首页购买大厅入场券吧</text>
      <view class="empty-btn" @click="goToBuy">
        <text>去购买</text>
      </view>
    </view>

    <!-- 门票列表 -->
    <view class="ticket-list" v-else>
      <view
        class="ticket-item"
        v-for="(item, idx) in tickets"
        :key="item.object_id"
        :class="item._statusClass"
      >
        <!-- 头部：状态和有效期 -->
        <view class="item-header">
          <view class="status-tag" :class="item._statusClass">
            <text>{{ item._statusText }}</text>
          </view>
          <text class="expire-text">有效期至 {{ item._expireDate }}</text>
        </view>

        <!-- 主体信息 -->
        <view class="item-body">
          <view class="info-row">
            <text class="info-label">🎫 大厅入场券</text>
            <text class="info-value">× {{ item.ticket_count || 1 }}人</text>
          </view>
          <view class="info-row">
            <text class="info-label">实付金额</text>
            <text class="info-price">¥{{ (item.pay_amount / 100).toFixed(2) }}</text>
          </view>
        </view>

        <!-- 核销码区域（可展开） -->
        <view class="code-section" v-if="item._statusClass === 'unused'">
          <view class="code-toggle" @click="toggleExpand(idx)">
            <text>{{ item._expanded ? '收起核销码' : '查看核销码' }}</text>
            <text class="toggle-arrow" :class="item._expanded ? 'up' : ''">▼</text>
          </view>
          <view class="code-panel" v-if="item._expanded">
            <view class="code-qr">
              <!-- 这里用文本占位，真实环境可用 qr-code 组件 -->
              <view class="qr-placeholder">
                <text class="qr-code-text">{{ item.verify_code }}</text>
              </view>
            </view>
            <view class="code-number">
              <text class="code-label">数字核销码</text>
              <view class="code-digits">
                <text class="digit" v-for="(d, di) in item._codeArr" :key="di">{{ d }}</text>
              </view>
            </view>
            <text class="code-tip">到店后出示给前台核销</text>
          </view>
        </view>

        <!-- 操作按钮 -->
        <view class="item-actions">
          <view class="action-btn secondary" @click="goToOrderDetail(item)">
            <text>订单详情</text>
          </view>
          <view
            class="action-btn primary"
            v-if="item._statusClass === 'unused'"
            @click="refundTicket(item)"
          >
            <text>申请退款</text>
          </view>
        </view>
      </view>
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

export default {
  data() {
    return {
      tickets: [],
      loading: false,
    };
  },

  computed: {
    ...mapState(['token']),
  },

  onShow() {
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
            // 格式化有效期
            let expireDate = '-';
            if (expireAt) {
              const d = new Date(expireAt * 1000);
              expireDate = d.getFullYear() + '-' + (d.getMonth() + 1).toString().padStart(2, '0') + '-' + d.getDate().toString().padStart(2, '0');
            }
            // 格式化核销码
            const code = item.verify_code || '';
            const codeArr = [];
            for (let i = 0; i < code.length; i++) {
              codeArr.push(code[i]);
              if (i === 2) codeArr.push(' '); // 123 456 格式
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
$dark: #5C4B3A;
$gray: #A08B7A;

page { background: #FFF8F0; }

.page { min-height: 100vh; background: #FFF8F0; }

// 导航栏
.nav-bar {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  background: #fff;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
  .nav-back { position: absolute; left: 30rpx; font-size: 36rpx; color: $dark; }
  .nav-title { font-size: 32rpx; font-weight: bold; color: $dark; }
}

// 空状态
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 200rpx;
  .empty-icon { font-size: 100rpx; margin-bottom: 20rpx; }
  .empty-text { font-size: 32rpx; font-weight: bold; color: $dark; margin-bottom: 12rpx; }
  .empty-sub { font-size: 26rpx; color: $gray; margin-bottom: 40rpx; }
  .empty-btn {
    background: linear-gradient(135deg, #FF8C42, #FFB5A7);
    color: #fff;
    font-size: 28rpx;
    font-weight: bold;
    padding: 20rpx 80rpx;
    border-radius: 50rpx;
    box-shadow: 0 8rpx 24rpx rgba(255,100,66,0.3);
  }
}

// 列表
.ticket-list {
  padding: 108rpx 24rpx 40rpx;
}

.ticket-item {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(92,75,58,0.06);
  border: 2rpx solid rgba(255,181,167,0.15);
  border-left: 8rpx solid #ccc;
  &.unused { border-left-color: #4CAF50; }
  &.used { border-left-color: $gray; opacity: 0.85; }
  &.expired { border-left-color: #FF3B30; opacity: 0.7; }
}

.item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
  .status-tag {
    font-size: 22rpx;
    font-weight: bold;
    padding: 4rpx 14rpx;
    border-radius: 20rpx;
    &.unused { background: #E8F5E9; color: #4CAF50; }
    &.used { background: #F5F5F5; color: $gray; }
    &.expired { background: #FFEBEE; color: #FF3B30; }
  }
  .expire-text { font-size: 24rpx; color: $gray; }
}

.item-body {
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #F0F0F0;
  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10rpx;
    &:last-child { margin-bottom: 0; }
    .info-label { font-size: 28rpx; color: $dark; }
    .info-value { font-size: 28rpx; color: $dark; font-weight: bold; }
    .info-price { font-size: 30rpx; color: $primary; font-weight: bold; }
  }
}

.code-section {
  margin-top: 20rpx;
  .code-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8rpx;
    font-size: 26rpx;
    color: $primary;
    font-weight: bold;
    padding: 12rpx 0;
    .toggle-arrow {
      font-size: 20rpx;
      transition: transform 0.2s;
      &.up { transform: rotate(180deg); }
    }
  }
  .code-panel {
    background: #FFF8F0;
    border-radius: 16rpx;
    padding: 28rpx;
    margin-top: 12rpx;
    text-align: center;
    .code-qr {
      margin-bottom: 20rpx;
      .qr-placeholder {
        width: 280rpx;
        height: 280rpx;
        background: #fff;
        border-radius: 16rpx;
        margin: 0 auto;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2rpx solid #FFD0C0;
        .qr-code-text {
          font-size: 48rpx;
          font-weight: bold;
          color: $primary;
          letter-spacing: 8rpx;
        }
      }
    }
    .code-number {
      margin-bottom: 12rpx;
      .code-label { font-size: 24rpx; color: $gray; display: block; margin-bottom: 10rpx; }
      .code-digits {
        display: flex;
        justify-content: center;
        gap: 12rpx;
        .digit {
          width: 64rpx;
          height: 80rpx;
          line-height: 80rpx;
          background: #fff;
          border-radius: 12rpx;
          font-size: 36rpx;
          font-weight: bold;
          color: $primary;
          box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.06);
        }
      }
    }
    .code-tip { font-size: 22rpx; color: $gray; }
  }
}

.item-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
  margin-top: 20rpx;
  .action-btn {
    font-size: 26rpx;
    padding: 12rpx 32rpx;
    border-radius: 30rpx;
    &.secondary {
      background: #F5F5F5;
      color: $dark;
    }
    &.primary {
      background: linear-gradient(135deg, #FF8C42, #FFB5A7);
      color: #fff;
      box-shadow: 0 4rpx 12rpx rgba(255,100,66,0.25);
    }
  }
}

.loading-wrap {
  text-align: center;
  padding-top: 200rpx;
  .loading-text { font-size: 28rpx; color: $gray; }
}
</style>
