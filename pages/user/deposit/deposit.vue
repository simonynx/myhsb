<template>
	<view class="page-wrapper">
		<!-- 顶部装饰 -->
		<view class="header-deco">
			<text class="deco-leaf">🍃</text>
			<text class="deco-cloud">☁️</text>
			<text class="deco-star">✨</text>
		</view>

		<!-- 余额卡片 -->
		<view class="balance-card">
			<view class="balance-left">
				<text class="balance-label">当前余额</text>
				<view class="balance-amount">
					<text class="yuan">¥</text>
					<text class="num">{{ (userInfo.account_balance / 100).toFixed(2) }}</text>
				</view>
			</view>
			<view class="balance-right">
				<view class="member-badge" :style="{ background: memberColor }">
					<text class="badge-icon">{{ memberIcon }}</text>
					<text class="badge-name">{{ memberLevelName }}</text>
				</view>
				<text class="detail-link" @tap="navToBalance">明细 →</text>
			</view>
		</view>

		<!-- 充值金额 -->
		<view class="section">
			<view class="section-header">
				<text class="section-emoji">💰</text>
				<text class="section-title">选择充值金额</text>
			</view>
			<view class="amount-grid">
				<view
					class="amount-item"
					v-for="(item, idx) in dynamicAmountList"
					:key="idx"
					:class="{ active: selectedAmount == item.amount, popular: item.popular }"
					@tap="selectAmount(item)"
				>
					<view class="popular-tag" v-if="item.popular">推荐</view>
					<text class="amount-icon">{{ item.icon }}</text>
					<text class="amount-num">¥{{ item.amount }}</text>
					<text class="amount-bonus" v-if="item.bonus">+{{ item.bonus }}积分</text>
					<text class="amount-present" v-if="item.present">送¥{{ item.present }}余额</text>
				</view>
			</view>
		</view>

		<!-- 支付方式 -->
		<view class="section">
			<view class="section-header">
				<text class="section-emoji">💳</text>
				<text class="section-title">支付方式</text>
			</view>
			<view class="pay-list">
				<view class="pay-item" :class="{ active: paytype === 'wxpay' }" @tap="paytype = 'wxpay'">
					<image class="pay-icon" src="/static/wxpay.png" mode="aspectFit"></image>
					<text class="pay-name">微信支付</text>
					<view class="pay-check">
						<text v-if="paytype === 'wxpay'" class="check-icon">✓</text>
					</view>
				</view>
				<view class="pay-item disabled">
					<image class="pay-icon" src="/static/alipay.png" mode="aspectFit"></image>
					<text class="pay-name">支付宝支付</text>
					<text class="pay-soon">即将上线</text>
				</view>
			</view>
		</view>

		<!-- 使用规则 -->
		<view class="rules-section">
			<text class="rules-title">📝 使用规则</text>
			<view class="rules-list">
				<text class="rule-item">· 余额仅限本小程序预约消费使用</text>
				<text class="rule-item">· 充值赠送积分即时到账，可抵用预约费用</text>
				<text class="rule-item">· 余额不支持提现或转账</text>
			</view>
		</view>

		<!-- 底部安全区占位 -->
		<view style="height: 280rpx;"></view>

		<!-- 充值按钮 -->
		<view class="bottom-area">
			<view class="selected-detail" v-if="selectedAmount">
				<view class="detail-row">
					<text class="detail-label">实付金额</text>
					<text class="detail-value">¥{{ selectedAmount }}</text>
				</view>
				<view class="detail-row" v-if="selectedTierPresent > 0">
					<text class="detail-label">到账余额</text>
					<text class="detail-value highlight">¥{{ selectedAmount + selectedTierPresent }}</text>
				</view>
				<view class="detail-row" v-if="selectedTierBonus > 0">
					<text class="detail-label">赠送积分</text>
					<text class="detail-value highlight">+{{ selectedTierBonus }}</text>
				</view>
			</view>
			<view class="submit-btn" @tap="doDeposit">
				<text class="btn-text">立即充值</text>
			</view>
			<view class="terms">
				点击立即充值，即表示同意
				<text class="terms-link" @tap="showTerms">《充值服务协议》</text>
			</view>
		</view>
	</view>
</template>

<script>
	import { mapState, mapActions } from 'vuex';
	import AUTH from '../../../utils/auth.js';

	const MEMBER_COLORS = {
		0: { color: '#AAAAAA', icon: '🌱', name: '普通会员' },
		1: { color: '#C0C0C0', icon: '🥈', name: '银卡会员' },
		2: { color: '#FFD700', icon: '🥇', name: '金卡会员' },
		3: { color: '#81D4FA', icon: '💎', name: '钻石会员' },
	};

	const TIER_ICONS = ['🎯', '🔥', '⭐', '💎', '👑'];

	export default {
		computed: {
			...mapState(['hasLogin', 'userInfo', 'token', 'rechargeTiers']),
			memberLevelName() {
				var level = (this.userInfo && this.userInfo.member_level) || 0;
				return MEMBER_COLORS[level] && MEMBER_COLORS[level].name || '普通会员';
			},
			memberIcon() {
				var level = (this.userInfo && this.userInfo.member_level) || 0;
				return MEMBER_COLORS[level] && MEMBER_COLORS[level].icon || '🌱';
			},
			memberColor() {
				var level = (this.userInfo && this.userInfo.member_level) || 0;
				return MEMBER_COLORS[level] && MEMBER_COLORS[level].color || '#AAAAAA';
			},
			dynamicAmountList() {
				if (this.rechargeTiers && this.rechargeTiers.length > 0) {
					return this.rechargeTiers.map((t, idx) => ({
						amount: t.amount,
						bonus: t.bonus || 0,
						present: t.present || 0,
						popular: idx === 1,
						icon: TIER_ICONS[idx % TIER_ICONS.length],
					}));
				}
				return this.defaultAmountList;
			},
		},
		data() {
			return {
				paytype: 'wxpay',
				selectedAmount: 0,
				selectedTierBonus: 0,
				selectedTierPresent: 0,
				defaultAmountList: [
					{ amount: 100, bonus: 50, present: 0, popular: false, icon: '🎯' },
					{ amount: 200, bonus: 120, present: 0, popular: true, icon: '🔥' },
					{ amount: 300, bonus: 200, present: 0, popular: false, icon: '⭐' },
					{ amount: 500, bonus: 350, present: 20, popular: false, icon: '💎' },
					{ amount: 1000, bonus: 800, present: 50, popular: false, icon: '👑' },
				],
			};
		},
		onShow() {
			if (!this.userInfo) this.getUserInfo();
			this.loadRechargeTiers();
		},
		methods: {
			...mapActions(['getRechargeTiers', 'loginAndRegister', 'getUserInfo']),
			loadRechargeTiers() {
				if (!this.rechargeTiers || this.rechargeTiers.length === 0) {
					this.getRechargeTiers();
				}
			},
			selectAmount(item) {
				this.selectedAmount = item.amount;
				this.selectedTierBonus = item.bonus || 0;
				this.selectedTierPresent = item.present || 0;
			},
			showTerms() {
				uni.showModal({
					title: '充值服务协议',
					content: '1. 充值金额仅限本小程序预约使用\n2. 余额不可提现\n3. 充值赠送的积分将在充值后自动到账\n4. 如有疑问请联系店主',
					showCancel: false,
				});
			},
			navToBalance() {
				uni.navigateTo({ url: '/pages/user/balance/balance' });
			},
			doDeposit() {
				if (!this.selectedAmount) {
					uni.showToast({ title: '请选择充值金额', icon: 'none' });
					return;
				}
				uni.showLoading({ title: '支付中...' });
				var amountFen = this.selectedAmount * 100;
				AUTH.recharge(amountFen, this.token).then((res) => {
					if (!res) {
						uni.hideLoading();
						return;
					}
					if (res._status !== 0) {
						uni.hideLoading();
						uni.showModal({ title: '充值失败', content: res._reason || '请重试', showCancel: false });
						return;
					}
					var wxpayData = res.data;
					uni.requestPayment({
						provider: 'wxpay',
						timeStamp: wxpayData.timeStamp,
						nonceStr: wxpayData.nonceStr,
						package: wxpayData.package,
						signType: wxpayData.signType,
						paySign: wxpayData.paySign,
						success: (resp) => {
							uni.hideLoading();
							var bonusText = this.selectedTierBonus > 0 ? `，赠送 ${this.selectedTierBonus} 积分` : '';
							var presentText = this.selectedTierPresent > 0 ? `，额外到账 ¥${this.selectedTierPresent}` : '';
							uni.showModal({
								title: '充值成功',
								content: `已成功充值 ¥${this.selectedAmount}${presentText}${bonusText}，请注意查收入账短信`,
								showCancel: false,
								success: () => {
									this.getUserInfo();
								},
							});
						},
						fail: (err) => {
							uni.hideLoading();
							uni.showToast({ title: '支付取消', icon: 'none' });
						},
					});
				}).catch((err) => {
					uni.hideLoading();
					uni.showToast({ title: '充值失败', icon: 'none' });
				});
			},
		},
	};
</script>

<style lang="scss">
page {
	background: #FFF8F0;
}
.page-wrapper {
	min-height: 100vh;
	padding-top: env(safe-area-inset-top);
	padding-bottom: 40rpx;
}

/* ===== 顶部装饰 ===== */
.header-deco {
	position: relative;
	height: 50rpx;
	overflow: hidden;
}
.deco-leaf {
	position: absolute;
	top: 8rpx;
	left: 50rpx;
	font-size: 36rpx;
	opacity: 0.35;
	animation: sway 4s ease-in-out infinite;
}
.deco-cloud {
	position: absolute;
	top: 6rpx;
	right: 70rpx;
	font-size: 32rpx;
	opacity: 0.3;
	animation: drift 6s ease-in-out infinite;
}
.deco-star {
	position: absolute;
	top: 12rpx;
	left: 50%;
	font-size: 28rpx;
	opacity: 0.25;
	animation: sway 5s ease-in-out infinite reverse;
}

@keyframes sway {
	0%, 100% { transform: rotate(-6deg); }
	50% { transform: rotate(6deg); }
}
@keyframes drift {
	0%, 100% { transform: translateX(0); }
	50% { transform: translateX(16rpx); }
}

/* ===== 余额卡片 ===== */
.balance-card {
	margin: 0 24rpx 32rpx;
	background: linear-gradient(135deg, #FFB74D, #FF8C42);
	border-radius: 28rpx;
	padding: 36rpx 32rpx;
	display: flex;
	align-items: center;
	box-shadow: 0 8rpx 32rpx rgba(255, 140, 66, 0.25);
	position: relative;
	overflow: hidden;

	&::after {
		content: '';
		position: absolute;
		right: -30rpx;
		top: -30rpx;
		width: 140rpx;
		height: 140rpx;
		background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%);
		border-radius: 50%;
	}

	.balance-left {
		flex: 1;
		.balance-label {
			display: block;
			font-size: 24rpx;
			color: rgba(255,255,255,0.85);
			margin-bottom: 8rpx;
		}
		.balance-amount {
			display: flex;
			align-items: baseline;
			gap: 4rpx;
			.yuan { font-size: 32rpx; color: #FFF; font-weight: bold; }
			.num { font-size: 56rpx; font-weight: bold; color: #FFF; }
		}
	}
	.balance-right {
		text-align: right;
		.member-badge {
			display: inline-flex;
			align-items: center;
			gap: 6rpx;
			padding: 8rpx 20rpx;
			border-radius: 20rpx;
			.badge-icon { font-size: 22rpx; }
			.badge-name { font-size: 22rpx; color: #FFF; font-weight: bold; }
		}
		.detail-link {
			display: block;
			font-size: 22rpx;
			color: rgba(255,255,255,0.85);
			margin-top: 12rpx;
			transition: opacity 0.2s;
			&:active { opacity: 0.6; }
		}
	}
}

/* ===== 通用区块 ===== */
.section {
	margin: 0 24rpx 32rpx;
	background: #FFF;
	border-radius: 24rpx;
	padding: 28rpx;
	box-shadow: 0 8rpx 32rpx rgba(140, 100, 60, 0.06);
	border: 1rpx solid rgba(240, 230, 216, 0.6);
}
.section-header {
	display: flex;
	align-items: center;
	gap: 12rpx;
	margin-bottom: 20rpx;
	.section-emoji { font-size: 36rpx; }
	.section-title { font-size: 32rpx; font-weight: bold; color: #5C4B3A; }
}

/* ===== 金额选择 ===== */
.amount-grid {
	display: flex;
	flex-wrap: wrap;
	gap: 16rpx;
}
.amount-item {
	position: relative;
	width: calc(33.33% - 12rpx);
	background: #FFF;
	border-radius: 20rpx;
	padding: 24rpx 16rpx;
	text-align: center;
	border: 2rpx solid #F0E6D8;
	box-shadow: 0 2rpx 8rpx rgba(140,100,60,0.04);
	transition: all 0.2s ease;
	.amount-icon { display: block; font-size: 32rpx; margin-bottom: 8rpx; }
	.amount-num { display: block; font-size: 36rpx; font-weight: bold; color: #5C4B3A; margin-bottom: 6rpx; }
	.amount-bonus { display: block; font-size: 20rpx; color: #FF8C42; font-weight: bold; }
	.amount-present { display: block; font-size: 18rpx; color: #A5D6A7; margin-top: 4rpx; font-weight: bold; }
	.popular-tag {
		position: absolute;
		top: -1rpx;
		right: -1rpx;
		background: linear-gradient(135deg, #FFCC80, #FF8C42);
		color: #FFF;
		font-size: 16rpx;
		padding: 4rpx 12rpx;
		border-radius: 0 20rpx 0 16rpx;
		font-weight: bold;
	}
}
.amount-item.active {
	border-color: #FF8C42;
	background: #FFF8F0;
	box-shadow: 0 4rpx 16rpx rgba(255,140,66,0.2);
	transform: scale(1.02);
}

/* ===== 支付方式 ===== */
.pay-list {
	background: #FFF;
	border-radius: 24rpx;
	overflow: hidden;
}
.pay-item {
	display: flex;
	align-items: center;
	padding: 28rpx 24rpx;
	border-bottom: 1rpx solid #F0E6D8;
	&:last-child { border-bottom: none; }
	.pay-icon { width: 48rpx; height: 48rpx; margin-right: 16rpx; }
	.pay-name { flex: 1; font-size: 28rpx; color: #5C4B3A; }
	.pay-check {
		width: 40rpx;
		height: 40rpx;
		border-radius: 50%;
		border: 2rpx solid #DDD;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}
	.check-icon { color: #FFF; font-size: 24rpx; font-weight: bold; }
	.pay-soon {
		background: #F5F5F5;
		color: #A09080;
		font-size: 20rpx;
		padding: 6rpx 16rpx;
		border-radius: 10rpx;
	}
}
.pay-item.disabled { opacity: 0.5; }
.pay-item.active .pay-check { background: #FF8C42; border-color: #FF8C42; }

/* ===== 使用规则 ===== */
.rules-section {
	margin: 0 24rpx 32rpx;
	padding: 24rpx 28rpx;
	background: linear-gradient(135deg, #FFF8F0, #FFF);
	border-radius: 20rpx;
	border: 1rpx solid rgba(240, 230, 216, 0.6);
	.rules-title {
		font-size: 26rpx;
		font-weight: bold;
		color: #5C4B3A;
		display: block;
		margin-bottom: 12rpx;
	}
	.rules-list {
		display: flex;
		flex-direction: column;
		gap: 8rpx;
	}
	.rule-item {
		font-size: 22rpx;
		color: #A09080;
		line-height: 1.5;
	}
}

/* ===== 底部 ===== */
.bottom-area {
	padding: 24rpx 32rpx;
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	background: linear-gradient(to top, #FFF8F0 80%, transparent);
	padding-top: 40rpx;
	padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
}
.selected-detail {
	background: #FFF;
	border-radius: 20rpx;
	padding: 20rpx 28rpx;
	margin-bottom: 20rpx;
	box-shadow: 0 4rpx 16rpx rgba(140,100,60,0.06);
	border: 1rpx solid rgba(240, 230, 216, 0.6);
	.detail-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 8rpx 0;
		.detail-label { font-size: 26rpx; color: #A09080; }
		.detail-value { font-size: 28rpx; color: #5C4B3A; font-weight: bold; }
		.detail-value.highlight { color: #FF8C42; }
	}
}
.submit-btn {
	background: linear-gradient(135deg, #FFCC80, #FF8C42);
	border-radius: 50rpx;
	padding: 28rpx;
	text-align: center;
	box-shadow: 0 8rpx 32rpx rgba(255,140,66,0.35);
	transition: transform 0.1s;
	&:active { transform: scale(0.98); }
	.btn-text { color: #FFF; font-size: 32rpx; font-weight: bold; }
}
.terms {
	text-align: center;
	font-size: 22rpx;
	color: #A09080;
	margin-top: 16rpx;
	.terms-link { color: #FF8C42; }
}
</style>
