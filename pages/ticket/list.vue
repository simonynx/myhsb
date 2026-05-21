<template>
  <view class="page">
    <!-- 渐变导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-back-wrap" @click="goBack">
        <text class="nav-back">←</text>
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
              <text class="price-label">{{ item.received_transfer ? '获得方式' : '实付金额' }}</text>
              <text class="price-value" :class="item.received_transfer ? 'gifted' : ''">
                {{ item.received_transfer ? '好友赠送' : '¥' + (item.pay_amount / 100).toFixed(2) }}
              </text>
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
                <view class="code-digits-mini" v-if="item.verify_code">
                  <text class="digit-mini">{{ item.verify_code[0] }}</text>
                  <text class="digit-mini">{{ item.verify_code[1] }}</text>
                  <text class="digit-mini">{{ item.verify_code[2] }}</text>
                  <text class="digit-gap"></text>
                  <text class="digit-mini">{{ item.verify_code[3] }}</text>
                  <text class="digit-mini">{{ item.verify_code[4] }}</text>
                  <text class="digit-mini">{{ item.verify_code[5] }}</text>
                </view>
                <text class="code-toggle-text">{{ item._expanded ? '收起 ▲' : '查看核销码 ▼' }}</text>
              </view>

              <!-- 展开的大核销码 -->
              <view class="code-expand" v-if="item._expanded">
                <view class="code-digits-large" v-if="item.verify_code">
                  <text class="digit-large">{{ item.verify_code[0] }}</text>
                  <text class="digit-large">{{ item.verify_code[1] }}</text>
                  <text class="digit-large">{{ item.verify_code[2] }}</text>
                  <text class="digit-gap-large"></text>
                  <text class="digit-large">{{ item.verify_code[3] }}</text>
                  <text class="digit-large">{{ item.verify_code[4] }}</text>
                  <text class="digit-large">{{ item.verify_code[5] }}</text>
                </view>
                <text class="code-tip">到店后出示给前台核销</text>
              </view>

              <view class="action-btns">
                <view class="action-btn secondary" @click="goToOrderDetail(item)">
                  <text>详情</text>
                </view>
                <view class="action-btn secondary" v-if="!item.received_transfer" @click="refundTicket(item)">
                  <text>退款</text>
                </view>
                <view class="action-btn primary" @click="openShareModal(item)">
                  <text>送好友</text>
                </view>
              </view>
            </template>

            <!-- 转赠中：避免赠送人与好友同时使用同一张票 -->
            <template v-else-if="item._statusClass === 'transferring'">
              <view class="status-hint transfer-hint">
                <text class="hint-icon">🎁</text>
                <text class="hint-text">赠送链接已生成，好友领取前可取消转赠。</text>
              </view>
              <view class="action-btns">
                <view class="action-btn secondary" @click="goToOrderDetail(item)">
                  <text>详情</text>
                </view>
                <view class="action-btn secondary danger" @click="cancelTransfer(item)">
                  <text>取消转赠</text>
                </view>
                <view class="action-btn primary" @click="continueShareTransfer(item)">
                  <text>继续发送</text>
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
    <!-- 礼品卡包装弹窗 -->
    <view class="share-modal-mask" v-if="shareModalVisible" @click.self="closeShareModal">
      <view class="share-modal-content">
        <view class="gift-card-shell">
          <view class="gift-card-top">
            <view class="brand-row">
              <text class="brand-name">摸鱼划水吧</text>
              <text class="brand-pill">门票礼卡</text>
            </view>
            <text class="gift-title">送你一张大厅入场券</text>
            <text class="gift-subtitle">好友领取后，将直接存入对方票包</text>
          </view>

          <view class="ticket-face">
            <view class="ticket-hole left"></view>
            <view class="ticket-hole right"></view>
            <view class="ticket-main-row">
              <view class="ticket-main-copy">
                <text class="ticket-eyebrow">GIFT TICKET</text>
                <text class="ticket-name-large">大厅入场券</text>
              </view>
              <view class="ticket-count-badge">
                <text class="ticket-count-num">×{{ shareTicket.ticket_count || 1 }}</text>
                <text class="ticket-count-label">人</text>
              </view>
            </view>
            <view class="ticket-dashed"></view>
            <view class="message-panel">
              <text class="message-label">留言</text>
              <textarea
                class="message-input"
                v-model="customMessage"
                maxlength="50"
                placeholder="给好友写一句话"
              />
            </view>
          </view>

          <view class="share-rule-row">
            <text class="rule-dot"></text>
            <text class="rule-text">领取后整张门票转入好友票包；好友未领取前可取消转赠。</text>
          </view>
        </view>

        <!-- 操作按钮 -->
        <view class="modal-btns">
          <view class="modal-btn cancel" @click="closeShareModal">
            <text>取消</text>
          </view>
          <!-- 微信原生分享按钮 -->
          <button 
            open-type="share" 
            class="modal-btn confirm-btn"
            @click="onShareClick"
          >
            包装好了，发送给好友
          </button>
        </view>
      </view>
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
      shareModalVisible: false,
      shareToken: '',
      shareTicket: {},
      customMessage: '送你一张【摸鱼划水吧】大厅入场券，祝你今天摸鱼愉快！🐟',
    };
  },

  computed: {
    ...mapState(['token', 'userInfo']),
  },

  onShow() {
    uni.getSystemInfo({
      success: (res) => {
        this.statusBarHeight = res.statusBarHeight || 0;
      }
    });
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
            } else if (item.active_transfer && item.active_transfer.transfer_token) {
              statusClass = 'transferring';
              statusText = '转赠中';
            }
            let expireDate = formatDate(expireAt);
            return {
              ...item,
              _statusClass: statusClass,
              _statusText: statusText,
              _expireDate: expireDate,
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

    showConfirmModal(options) {
      return new Promise((resolve) => {
        uni.showModal(Object.assign({}, options, {
          success: function(res) {
            resolve(res || { confirm: false });
          },
          fail: function() {
            resolve({ confirm: false });
          }
        }));
      });
    },

    async refundTicket(item) {
      const res = await this.showConfirmModal({
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

    async openShareModal(item) {
      if (item.active_transfer && item.active_transfer.transfer_token) {
        this.continueShareTransfer(item);
        return;
      }
      uni.showLoading({ title: '生成中...' });
      try {
        const res = await AUTH.createTicketTransfer(this.token, { order_number: item.order_number });
        uni.hideLoading();
        if (res && res._status === 0) {
          this.shareToken = res.data.transfer_token;
          this.shareTicket = item;
          this.markTicketTransferring(item, res.data);
          this.customMessage = '送你一张【摸鱼划水吧】大厅入场券，祝你今天摸鱼愉快！🐟';
          this.shareModalVisible = true;
        } else {
          uni.showToast({ title: (res && res._reason) || '操作失败', icon: 'none' });
        }
      } catch (e) {
        uni.hideLoading();
        console.error('create transfer error:', e);
        uni.showToast({ title: '生成转赠链接失败', icon: 'none' });
      }
    },

    markTicketTransferring(item, transfer) {
      if (!item || !transfer || !transfer.transfer_token) return;
      const activeTransfer = {
        transfer_token: transfer.transfer_token,
        expire_at: transfer.expire_at,
        status: 0,
        status_name: '待接收',
      };
      if (this.$set) {
        this.$set(item, 'active_transfer', activeTransfer);
      } else {
        item.active_transfer = activeTransfer;
      }
      item._statusClass = 'transferring';
      item._statusText = '转赠中';
    },

    continueShareTransfer(item) {
      if (!item.active_transfer || !item.active_transfer.transfer_token) {
        this.openShareModal(item);
        return;
      }
      this.shareToken = item.active_transfer.transfer_token;
      this.shareTicket = item;
      this.customMessage = '送你一张【摸鱼划水吧】大厅入场券，祝你今天摸鱼愉快！🐟';
      this.shareModalVisible = true;
    },

    async cancelTransfer(item) {
      if (!item.active_transfer || !item.active_transfer.transfer_token) {
        this.loadTickets();
        return;
      }
      const modal = await this.showConfirmModal({
        title: '取消转赠',
        content: '取消后，好友将无法通过当前链接领取这张门票。',
        confirmText: '确认取消',
        confirmColor: '#FF6B6B',
      });
      if (!modal.confirm) return;

      uni.showLoading({ title: '处理中...' });
      try {
        const res = await AUTH.cancelTicketTransfer(this.token, {
          transfer_token: item.active_transfer.transfer_token
        });
        uni.hideLoading();
        if (res && res._status === 0) {
          uni.showToast({ title: '已取消转赠', icon: 'success' });
          this.loadTickets();
        } else {
          uni.showToast({ title: (res && res._reason) || '取消失败', icon: 'none' });
        }
      } catch (e) {
        uni.hideLoading();
        console.error('cancel transfer error:', e);
        uni.showToast({ title: '取消失败，请重试', icon: 'none' });
      }
    },

    closeShareModal() {
      this.shareModalVisible = false;
      this.shareToken = '';
      this.shareTicket = {};
    },

    onShareClick() {
      setTimeout(() => {
        this.closeShareModal();
        this.loadTickets();
      }, 800);
    },
  },

  onShareAppMessage(res) {
    if (res.from === 'button' && this.shareToken) {
      const title = this.customMessage || '送你一张【摸鱼划水吧】大厅入场券，快来一起摸鱼！';
      return {
        title: title,
        path: '/pages/ticket/receive?transfer_token=' + this.shareToken,
        imageUrl: '/static/ticket_gift_share.png',
      };
    }
    return {
      title: '摸鱼划水吧',
      path: '/pages/index/index'
    };
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
  .nav-back { font-size: 48rpx; color: #fff; font-weight: bold; line-height: 1; }
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
  &.transferring .card-left-bar { background: linear-gradient(to bottom, #FF8C42, #FFD166); }
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
    &.transferring { background: #FFF3E0; color: #EF6C00; }
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
    .price-value {
      font-size: 40rpx;
      font-weight: bold;
      color: $primary;
      &.gifted {
        font-size: 32rpx;
        color: #EF6C00;
      }
    }
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
  .transfer-hint {
    background: #FFF8F0;
    border: 2rpx solid #FFE0C2;
    border-radius: 18rpx;
    margin-bottom: 20rpx;
    padding: 18rpx 20rpx;
    justify-content: flex-start;
    .hint-text {
      flex: 1;
      line-height: 1.45;
      color: $dark;
    }
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
      &.danger {
        color: #FF6B6B;
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

// ========== 礼品卡弹窗 ==========
.share-modal-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(44,35,28,0.62);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 36rpx;
  box-sizing: border-box;
}

.share-modal-content {
  width: 654rpx;
  max-width: 100%;
  background: #FFF8F0;
  border-radius: 30rpx;
  overflow: hidden;
  box-shadow: 0 24rpx 60rpx rgba(92,75,58,0.22);
  display: flex;
  flex-direction: column;
  border: 2rpx solid rgba(255,224,194,0.9);
  animation: modalShow 0.3s ease-out;
}

@keyframes modalShow {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.gift-card-shell {
  padding: 28rpx;
}

.gift-card-top {
  background: linear-gradient(135deg, #FF8C42 0%, #FFB5A7 100%);
  border-radius: 24rpx 24rpx 8rpx 8rpx;
  padding: 30rpx 30rpx 34rpx;
  color: #fff;

  .brand-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 26rpx;
  }
  .brand-name {
    font-size: 28rpx;
    font-weight: bold;
  }
  .brand-pill {
    font-size: 22rpx;
    padding: 8rpx 18rpx;
    border-radius: 999rpx;
    background: rgba(255,255,255,0.22);
  }
  .gift-title {
    display: block;
    font-size: 40rpx;
    font-weight: bold;
    line-height: 1.25;
    margin-bottom: 10rpx;
  }
  .gift-subtitle {
    display: block;
    font-size: 24rpx;
    color: rgba(255,255,255,0.88);
  }
}

.ticket-face {
  position: relative;
  margin-top: -10rpx;
  background: #fff;
  border-radius: 8rpx 8rpx 24rpx 24rpx;
  padding: 34rpx 30rpx 30rpx;
  box-shadow: 0 10rpx 26rpx rgba(92,75,58,0.08);
  border: 2rpx solid rgba(255,224,194,0.75);

  .ticket-hole {
    position: absolute;
    top: 122rpx;
    width: 32rpx;
    height: 32rpx;
    border-radius: 50%;
    background: #FFF8F0;
    &.left { left: -17rpx; }
    &.right { right: -17rpx; }
  }
  .ticket-main-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24rpx;
  }
  .ticket-main-copy {
    flex: 1;
    min-width: 0;
  }
  .ticket-eyebrow {
    display: block;
    font-size: 22rpx;
    color: $gray;
    margin-bottom: 10rpx;
  }
  .ticket-name-large {
    display: block;
    font-size: 48rpx;
    font-weight: bold;
    color: #FF7830;
    line-height: 1.15;
  }
  .ticket-count-badge {
    width: 112rpx;
    height: 112rpx;
    border-radius: 24rpx;
    background: #FFF3E6;
    border: 2rpx solid #FFE0C2;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .ticket-count-num {
    font-size: 34rpx;
    font-weight: bold;
    color: #FF7830;
  }
  .ticket-count-label {
    font-size: 22rpx;
    color: $gray;
  }
  .ticket-dashed {
    border-top: 2rpx dashed #EADBCD;
    margin: 30rpx 8rpx 26rpx;
  }
}

.message-panel {
  background: #FFF8F0;
  border: 2rpx solid #FFE6D3;
  border-radius: 18rpx;
  padding: 18rpx 20rpx;

  .message-label {
    display: block;
    font-size: 22rpx;
    color: #A08B7A;
    margin-bottom: 8rpx;
  }
  .message-input {
    width: 100%;
    height: 104rpx;
    font-size: 26rpx;
    color: $dark;
    line-height: 1.45;
  }
}

.share-rule-row {
  display: flex;
  gap: 10rpx;
  align-items: flex-start;
  margin-top: 20rpx;
  padding: 0 4rpx;

  .rule-dot {
    width: 10rpx;
    height: 10rpx;
    border-radius: 50%;
    background: #FF8C42;
    margin-top: 12rpx;
    flex-shrink: 0;
  }
  .rule-text {
    flex: 1;
    font-size: 22rpx;
    line-height: 1.5;
    color: #8C7966;
  }
}

.modal-btns {
  display: flex;
  border-top: 2rpx solid #F0E6DF;
  min-height: 104rpx;
  align-items: center;
  .modal-btn {
    flex: 1;
    min-height: 104rpx;
    line-height: 104rpx;
    text-align: center;
    font-size: 28rpx;
    font-weight: bold;
    background: transparent;
    border: none;
    border-radius: 0;
    padding: 0;
    margin: 0;
    &::after { border: none; }
    &.cancel {
      color: $gray;
      border-right: 2rpx solid #F0E6DF;
    }
    &.confirm-btn {
      color: #fff;
      background: linear-gradient(135deg, #FF8C42, #FFB5A7);
    }
  }
}
</style>
