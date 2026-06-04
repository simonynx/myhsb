<template>
	<view class="page">
		<view class="success-card">
			<view class="success-icon">✓</view>
			<text class="success-title">{{ title }}</text>
			<text class="success-sub">{{ subtitle }}</text>
			<view class="amount-row" v-if="amountText">
				<text class="amount-label">{{ amountLabel }}</text>
				<text class="amount-value">¥{{ amountText }}</text>
			</view>
			<view class="reward-row" v-if="rewardText">
				<text class="reward-text">{{ rewardText }}</text>
			</view>
		</view>

		<view class="next-card">
			<view class="next-title">接下来可以</view>
			<view class="next-sub">{{ nextSubtitle }}</view>
			<view class="action-grid">
				<view class="action-item primary" @click="goOrder">
					<text class="action-icon">{{ primaryIcon }}</text>
					<text class="action-text">{{ primaryText }}</text>
				</view>
				<view class="action-item primary-soft" @click="goBookAgain">
					<text class="action-icon">📅</text>
					<text class="action-text">再约一场</text>
				</view>
				<view class="action-item" @click="goVoucher">
					<text class="action-icon">🎟️</text>
					<text class="action-text">领券攒积分</text>
				</view>
				<view class="action-item" @click="goCheckIn">
					<text class="action-icon">⭐</text>
					<text class="action-text">签到拿积分</text>
				</view>
				<button class="action-item share-btn" open-type="share">
					<text class="action-icon">↗</text>
					<text class="action-text">约朋友来玩</text>
				</button>
				<view class="action-item" @click="goHome">
					<text class="action-icon">🏠</text>
					<text class="action-text">回到首页</text>
				</view>
			</view>
		</view>

		<view class="tip-card">
			<text class="tip-title">{{ tipTitle }}</text>
			<text class="tip-text">{{ tipText }}</text>
		</view>
	</view>
</template>

<script>
import AUTH from '../../../utils/auth.js';

export default {
	data() {
		return {
			amount: 0,
			present: 0,
			bonus: 0,
			orderId: '',
			type: 'order',
		};
	},
	computed: {
		amountText() {
			if (this.type === 'exchange' && Number(this.amount || 0) <= 0) return '';
			if (!this.amount && this.amount !== 0) return '';
			return (Number(this.amount || 0) / 100).toFixed(2);
		},
		title() {
			if (this.type === 'exchange') return '兑换成功';
			if (this.type === 'recharge') return '充值成功';
			return '支付成功';
		},
		subtitle() {
			if (this.type === 'exchange') return '兑换记录已生成，到店出示订单即可使用';
			if (this.type === 'recharge') return '余额已经到账，下一次预约可以直接抵扣';
			return '订单已确认，期待你到店玩得开心';
		},
		amountLabel() {
			if (this.type === 'recharge') return '充值金额';
			return '实付金额';
		},
		rewardText() {
			if (this.type !== 'recharge') return '';
			var parts = [];
			var present = Number(this.present || 0);
			var bonus = Number(this.bonus || 0);
			if (present > 0) parts.push('额外到账 ¥' + (present / 100).toFixed(2));
			if (bonus > 0) parts.push('赠送 ' + bonus + ' 积分');
			return parts.join(' · ');
		},
		nextSubtitle() {
			if (this.type === 'recharge') return '查看余额、预约房间，把这次充值用得更值';
			return '查看订单、领券签到，下次再来更省心';
		},
		primaryIcon() {
			if (this.type === 'recharge') return '💎';
			return '📋';
		},
		primaryText() {
			if (this.type === 'recharge') return '查看余额';
			return '查看订单';
		},
		tipTitle() {
			if (this.type === 'recharge') return '余额小提示';
			return '到店小提示';
		},
		tipText() {
			if (this.type === 'recharge') return '充值本金和赠送余额会一起进入账户；预约时可优先使用余额支付。';
			return '到店后出示订单即可核验；如需布置或补给，建议提前联系店员确认。';
		},
	},
	onLoad(options) {
		this.amount = Number(options.amount || 0);
		this.present = Number(options.present || 0);
		this.bonus = Number(options.bonus || 0);
		this.orderId = options.id || '';
		this.type = options.type || 'order';
		AUTH.trackEvent({
			event: 'payment_success',
			page_path: 'pages/pay/success/success',
			source: this.type,
			amount: this.amount
		}).catch(function() {});
	},
	onShareAppMessage() {
		AUTH.trackEvent({
			event: 'share_home',
			page_path: 'pages/pay/success/success',
			share_type: 'wechat_session',
			source: 'payment_success'
		}).catch(function() {});
		return {
			title: '我在摸鱼划水吧订好了，来一起玩',
			path: '/pages/index/index',
		};
	},
	methods: {
		goOrder() {
			if (this.type === 'recharge') {
				uni.redirectTo({ url: '/pages/user/balance/balance' });
				return;
			}
			const url = this.orderId ? '/pages/order/order?state=0&id=' + this.orderId : '/pages/order/order?state=0';
			uni.redirectTo({ url });
		},
		goVoucher() {
			uni.switchTab({ url: '/pages/voucher/voucher' });
		},
		goBookAgain() {
			uni.switchTab({ url: '/pages/tabBar/appoint/appoint' });
		},
		goCheckIn() {
			uni.switchTab({ url: '/pages/user/user' });
		},
		goHome() {
			uni.switchTab({ url: '/pages/index/index' });
		},
	},
};
</script>

<style lang="scss">
$primary: #FF6432;
$gold: #FFB933;
$dark: #333;
$gray: #888;
$bg: #FDF8F0;

page {
	background: $bg;
	min-height: 100vh;
}

.page {
	min-height: 100vh;
	padding: 56rpx 24rpx 40rpx;
	box-sizing: border-box;
}

.success-card,
.next-card,
.tip-card {
	background: #FFF;
	border-radius: 24rpx;
	box-shadow: 0 8rpx 28rpx rgba(160, 120, 80, 0.08);
}

.success-card {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 52rpx 36rpx 40rpx;
}

.success-icon {
	width: 108rpx;
	height: 108rpx;
	border-radius: 54rpx;
	background: linear-gradient(135deg, #52C41A, #7ED957);
	color: #FFF;
	font-size: 64rpx;
	font-weight: bold;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 24rpx;
}

.success-title {
	font-size: 40rpx;
	color: $dark;
	font-weight: bold;
}

.success-sub {
	margin-top: 12rpx;
	font-size: 26rpx;
	line-height: 1.45;
	color: $gray;
	text-align: center;
}

.amount-row {
	display: flex;
	align-items: baseline;
	gap: 12rpx;
	margin-top: 28rpx;
}

.amount-label {
	font-size: 24rpx;
	color: $gray;
}

.amount-value {
	font-size: 40rpx;
	color: $primary;
	font-weight: bold;
}

.reward-row {
	margin-top: 14rpx;
	padding: 10rpx 18rpx;
	border-radius: 999rpx;
	background: #FFF3EA;
}

.reward-text {
	font-size: 24rpx;
	color: $primary;
	font-weight: 600;
}

.next-card {
	margin-top: 24rpx;
	padding: 28rpx;
}

.next-title {
	font-size: 30rpx;
	color: $dark;
	font-weight: bold;
	margin-bottom: 6rpx;
}

.next-sub {
	display: block;
	font-size: 24rpx;
	color: $gray;
	margin-bottom: 22rpx;
}

.action-grid {
	display: grid;
	grid-template-columns: 1fr 1fr 1fr;
	gap: 18rpx;
}

.action-item {
	height: 132rpx;
	padding: 0;
	border: 2rpx solid #F1E4D8;
	border-radius: 18rpx;
	background: #FFFDF8;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 8rpx;
	box-sizing: border-box;

	&.primary {
		background: #FFF3EA;
		border-color: rgba(255, 100, 50, 0.28);
	}

	&.primary-soft {
		background: #FFF8E8;
		border-color: rgba(255, 185, 51, 0.32);
	}
}

.share-btn {
	margin: 0;
	line-height: normal;
	color: inherit;

	&::after {
		border: none;
	}
}

.action-icon {
	font-size: 34rpx;
}

.action-text {
	font-size: 25rpx;
	color: $dark;
	font-weight: 500;
}

.tip-card {
	margin-top: 24rpx;
	padding: 26rpx 28rpx;
}

.tip-title {
	display: block;
	font-size: 28rpx;
	color: $dark;
	font-weight: bold;
	margin-bottom: 10rpx;
}

.tip-text {
	display: block;
	font-size: 24rpx;
	line-height: 1.55;
	color: $gray;
}
</style>
