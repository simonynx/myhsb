<template>
  <view class="receive-container">
    <!-- 背景渐变与装饰 -->
    <view class="bg-gradient"></view>
    
    <!-- 导航栏 -->
    <view class="custom-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-back-btn" @click="goHome">
        <text class="back-arrow">🏠</text>
      </view>
      <text class="nav-title">收礼品卡</text>
    </view>

    <!-- 加载中 -->
    <view class="loading-state" v-if="claimStatus === 'loading'">
      <view class="spinner"></view>
      <text class="loading-text">正在为您拆开礼卡...</text>
    </view>

    <!-- 需要登录 -->
    <view class="status-card login-card" v-else-if="claimStatus === 'need_login'">
      <view class="gift-icon-large">🎁</view>
      <text class="card-title">收到一份好友赠礼</text>
      
      <view class="gift-detail" style="margin-bottom: 40rpx;" v-if="transferInfo && transferInfo.from_user_nickname">
        <image class="sender-avatar" :src="parseAvatar(transferInfo.from_user_avatar) || '/static/tab-my-current.png'" mode="aspectFill"></image>
        <text class="sender-name">{{ transferInfo.from_user_nickname }} 送了你一张</text>
        <text class="ticket-name">大厅入场券 ({{ transferInfo.ticket_count || 1 }}人)</text>
        <text class="gift-message" v-if="giftMessage">“{{ giftMessage }}”</text>
      </view>
      
      <text class="card-desc" style="margin-top: 10rpx;">一键登录后，门票将直接存入您的票包</text>
      <button class="action-btn primary-btn" @click="handleLogin">一键登录领取</button>
      <button class="action-btn secondary-btn" @click="goHome">返回首页</button>
    </view>

    <!-- 领取成功 -->
    <view class="status-card success-card" v-else-if="claimStatus === 'success'">
      <view class="success-icon">🎉</view>
      <text class="card-title">领取成功！</text>
      
      <view class="gift-detail">
        <image class="sender-avatar" :src="parseAvatar(transferInfo.from_user_avatar) || '/static/tab-my-current.png'" mode="aspectFill"></image>
        <text class="sender-name">{{ transferInfo.from_user_nickname }} 送了你一张</text>
        <text class="ticket-name">大厅入场券 ({{ transferInfo.ticket_count || 1 }}人)</text>
        <text class="gift-message" v-if="giftMessage">“{{ giftMessage }}”</text>
        <view class="ticket-line"></view>
        <text class="ticket-expire" v-if="transferInfo.expire_at">有效期至: {{ formatTime(transferInfo.expire_at) }}</text>
      </view>

      <button class="action-btn primary-btn" @click="goToMyTickets">放入票包，去查看</button>
    </view>

    <!-- 领取失败 -->
    <view class="status-card fail-card" v-else-if="claimStatus === 'fail'">
      <view class="fail-icon">❌</view>
      <text class="card-title">无法领取</text>
      <text class="card-reason">{{ errorMsg }}</text>
      <button class="action-btn primary-btn" @click="goHome">去首页看看</button>
    </view>
  </view>
</template>

<script>
import AUTH from '../../utils/auth.js';
import PLATFORM from '../../common/platform.js';
import { mapState } from 'vuex';

export default {
  data() {
    return {
      statusBarHeight: 0,
      transferToken: '',
      claimStatus: 'loading', // 'loading' | 'need_login' | 'success' | 'fail'
      errorMsg: '',
      transferInfo: {},
      giftMessage: '',
    };
  },

  computed: {
    ...mapState(['token']),
  },

  onLoad(options) {
    const query = PLATFORM.getLaunchQuery(options || {});
    this.transferToken = query.transfer_token || query.ticket_transfer_token || '';
    this.giftMessage = query.message || '';
  },

  onShow() {
    this.statusBarHeight = PLATFORM.getStatusBarHeight();
    this.fetchTransferPreview();
  },

  methods: {
    async fetchTransferPreview() {
      this.claimStatus = 'loading';
      if (!this.transferToken) {
        this.claimStatus = 'fail';
        this.errorMsg = '无效的转赠链接';
        return;
      }

      try {
        // 先获取转赠详情 (允许匿名获取)
        const infoRes = await AUTH.getTransferInfo(this.token || '', this.transferToken);
        if (!infoRes || infoRes._status !== 0) {
          this.claimStatus = 'fail';
          this.errorMsg = (infoRes && infoRes._reason) || '获取礼卡信息失败';
          return;
        }

        this.transferInfo = infoRes.data;

        // 如果状态不是 0 (待接收)，直接判定为不能接收
        if (this.transferInfo.status !== 0) {
          this.claimStatus = 'fail';
          this.errorMsg = this.transferInfo.status_name || '该转赠链接已失效';
          return;
        }

        if (!this.token) {
          this.claimStatus = 'need_login';
        } else {
          // 已登录，执行静默自动接收
          this.claimStatus = 'loading';
          const acceptRes = await AUTH.acceptTicketTransfer(this.token, { transfer_token: this.transferToken });
          if (acceptRes && acceptRes._status === 0) {
            this.claimStatus = 'success';
            uni.showToast({ title: '已存入票包', icon: 'success' });
          } else {
            this.claimStatus = 'fail';
            this.errorMsg = (acceptRes && acceptRes._reason) || '接收门票失败';
          }
        }
      } catch (e) {
        console.error('fetchTransferPreview error:', e);
        this.claimStatus = 'fail';
        this.errorMsg = '获取信息接口调用异常';
      }
    },

    handleLogin() {
      uni.showLoading({ title: '登录中...' });
      this.$store.dispatch('loginAndRegister').then(() => {
        uni.hideLoading();
        this.fetchTransferPreview();
      }).catch((err) => {
        uni.hideLoading();
        console.error('login error:', err);
        uni.showToast({ title: '登录失败，请重试', icon: 'none' });
      });
    },

    goToMyTickets() {
      uni.redirectTo({ url: '/pages/ticket/list' });
    },

    goHome() {
      uni.switchTab({ url: '/pages/index/index' });
    },

    parseAvatar(avatar) {
      return AUTH.parseAvatarUrl(avatar);
    },

    formatTime(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp * 1000);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
};
</script>

<style lang="scss">
$primary: #FF8C42;
$secondary: #FFEBE0;
$dark: #2C3E50;
$gray: #7F8C8D;

.receive-container {
  min-height: 100vh;
  position: relative;
  background-color: #FDF9F5;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.bg-gradient {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 480rpx;
  background: linear-gradient(180deg, #FF8C42 0%, #FFB27A 60%, rgba(253,249,245,0) 100%);
  z-index: 1;
}

.custom-nav {
  position: relative;
  z-index: 10;
  height: 88rpx;
  display: flex;
  align-items: center;
  padding: 0 30rpx;
  .nav-back-btn {
    width: 64rpx;
    height: 64rpx;
    background: rgba(255,255,255,0.2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    .back-arrow { font-size: 32rpx; color: #fff; }
  }
  .nav-title {
    flex: 1;
    text-align: center;
    font-size: 34rpx;
    font-weight: bold;
    color: #fff;
    margin-right: 64rpx; // Offset back btn
  }
}

.loading-state {
  position: relative;
  z-index: 10;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-bottom: 200rpx;
  .spinner {
    width: 80rpx;
    height: 80rpx;
    border: 6rpx solid rgba($primary, 0.2);
    border-top-color: $primary;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 30rpx;
  }
  .loading-text { font-size: 28rpx; color: $dark; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.status-card {
  position: relative;
  z-index: 10;
  width: 650rpx;
  margin: 60rpx auto auto;
  background: #ffffff;
  border-radius: 40rpx;
  box-shadow: 0 20rpx 50rpx rgba(0,0,0,0.06);
  padding: 60rpx 40rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: slideUp 0.4s ease-out;

  .card-title {
    font-size: 40rpx;
    font-weight: bold;
    color: $dark;
    margin-bottom: 20rpx;
    text-align: center;
  }
  .card-desc {
    font-size: 28rpx;
    color: $gray;
    margin-bottom: 60rpx;
    text-align: center;
  }
}

@keyframes slideUp {
  from { transform: translateY(40rpx); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.gift-icon-large {
  font-size: 140rpx;
  margin-bottom: 30rpx;
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-15rpx); }
}

.success-icon {
  font-size: 120rpx;
  margin-bottom: 20rpx;
  animation: scalePop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes scalePop {
  from { transform: scale(0); }
  to { transform: scale(1); }
}

.fail-icon {
  font-size: 120rpx;
  margin-bottom: 20rpx;
  color: #FF5A5A;
}

.card-reason {
  font-size: 30rpx;
  color: #FF5A5A;
  margin-bottom: 60rpx;
  text-align: center;
  background: #FFF5F5;
  padding: 20rpx 40rpx;
  border-radius: 20rpx;
  border: 1px solid #FFE0E0;
}

.gift-detail {
  width: 100%;
  background: #FFFBF7;
  border: 2rpx dashed #FFD5C0;
  border-radius: 24rpx;
  padding: 40rpx 30rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 60rpx;
  position: relative;

  .sender-avatar {
    width: 100rpx;
    height: 100rpx;
    border-radius: 50%;
    border: 4rpx solid #fff;
    box-shadow: 0 6rpx 16rpx rgba(0,0,0,0.08);
    margin-bottom: 20rpx;
  }
  .sender-name {
    font-size: 26rpx;
    color: $gray;
    margin-bottom: 12rpx;
  }
  .ticket-name {
    font-size: 34rpx;
    font-weight: bold;
    color: #E8784A;
    margin-bottom: 30rpx;
  }
  .gift-message {
    width: 100%;
    box-sizing: border-box;
    padding: 20rpx 24rpx;
    margin-bottom: 26rpx;
    border-radius: 18rpx;
    background: #FFF3EA;
    color: #6B5142;
    font-size: 25rpx;
    line-height: 1.5;
    text-align: center;
  }
  .ticket-line {
    width: 100%;
    height: 2rpx;
    background: #FFE2D5;
    margin-bottom: 30rpx;
  }
  .ticket-expire {
    font-size: 24rpx;
    color: $gray;
  }
}

.action-btn {
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  border-radius: 48rpx;
  font-size: 32rpx;
  font-weight: bold;
  text-align: center;
  border: none;
  margin-bottom: 20rpx;
  box-sizing: border-box;
  background: none;
  padding: 0;
  &::after { border: none; }
  
  &.primary-btn {
    background: linear-gradient(135deg, #FF8C42, #E8784A);
    color: #fff;
    box-shadow: 0 10rpx 20rpx rgba(#FF8C42, 0.2);
  }
  &.secondary-btn {
    background: #FFF2EB;
    color: #E8784A;
  }
}
</style>
