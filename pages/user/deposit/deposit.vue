<template>
	<view class="page-wrapper">

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
				<text class="member-tip">充值享更多福利</text>
			</view>
		</view>

		<!-- 充值活动 -->
		<view class="section">
			<view class="section-header">
				<text class="section-emoji">🎁</text>
				<text class="section-title">充值优惠</text>
			</view>
			<view class="promo-card">
				<view class="promo-header">
					<text class="promo-title">会员专属福利</text>
					<text class="promo-tag">限时</text>
				</view>
				<view class="promo-list">
					<view class="promo-item" v-for="(item, idx) in promoList" :key="idx">
						<text class="promo-icon">{{ item.icon }}</text>
						<text class="promo-text">{{ item.text }}</text>
					</view>
				</view>
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
					<text class="amount-present" v-if="item.present">送¥{{ item.present }}</text>
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

		<!-- 充值按钮 -->
		<view class="bottom-area">
			<view class="selected-info" v-if="selectedAmount">
				<text class="selected-text">支付金额：</text>
				<text class="selected-amount">¥{{ selectedAmount }}</text>
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
		3: { color: '#FF69B4', icon: '💎', name: '钻石会员' },
	};

	const TIER_ICONS = ['🎯', '🔥', '⭐', '💎', '👑'];

	export default {
		computed: {
			...mapState(['hasLogin', 'userInfo', 'token', 'rechargeTiers']),
			memberLevelName() {
				var level = this.userInfo?.member_level || 0;
				return MEMBER_COLORS[level]?.name || '普通会员';
			},
			memberIcon() {
				var level = this.userInfo?.member_level || 0;
				return MEMBER_COLORS[level]?.icon || '🌱';
			},
			memberColor() {
				var level = this.userInfo?.member_level || 0;
				return MEMBER_COLORS[level]?.color || '#AAAAAA';
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
				promoList: [
					{ icon: '🎯', text: '充值多少送多少积分，积分可抵用预约费用' },
					{ icon: '🔥', text: '充值满500元额外赠送¥20余额' },
					{ icon: '⭐', text: '会员充值额外赠送5%积分' },
					{ icon: '🎁', text: '新用户首充双倍积分' },
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
							uni.showModal({
								title: '充值成功',
								content: `已成功充值¥${this.selectedAmount}，请注意查收入账短信`,
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
	background: #FFF9F5;
}
.page-wrapper {
	min-height: 100vh;
	padding-top: env(safe-area-inset-top);
	padding-bottom: 40rpx;
}

/* ===== 顶部 ===== */
/* ===== 余额卡片 ===== */
.balance-card {
	margin: -10rpx 24rpx 24rpx;
	background: linear-gradient(135deg, #667EEA, #764BA2);
	border-radius: 28rpx;
	padding: 32rpx;
	display: flex;
	align-items: center;
	box-shadow: 0 8rpx 24rpx rgba(102,126,234,0.3);
	.balance-left {
		flex: 1;
		.balance-label {
			display: block;
			font-size: 24rpx;
			color: rgba(255,255,255,0.8);
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
		.member-tip {
			display: block;
			font-size: 20rpx;
			color: rgba(255,255,255,0.7);
			margin-top: 8rpx;
		}
	}
}

/* ===== 通用区块 ===== */
.section { margin: 0 24rpx 32rpx; }
.section-header {
	display: flex;
	align-items: center;
	gap: 12rpx;
	margin-bottom: 16rpx;
	.section-emoji { font-size: 36rpx; }
	.section-title { font-size: 32rpx; font-weight: bold; color: #333; }
}

/* ===== 优惠卡片 ===== */
.promo-card {
	background: linear-gradient(135deg, #FFF9E6, #FFF5E5);
	border-radius: 24rpx;
	padding: 24rpx;
	border: 2rpx solid #FFE0B2;
	.promo-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 16rpx;
	}
	.promo-title { font-size: 28rpx; font-weight: bold; color: #F5A623; }
	.promo-tag {
		background: #FF6B6B;
		color: #FFF;
		font-size: 18rpx;
		padding: 4rpx 12rpx;
		border-radius: 10rpx;
		font-weight: bold;
	}
	.promo-list { display: flex; flex-direction: column; gap: 12rpx; }
	.promo-item {
		display: flex;
		align-items: center;
		gap: 10rpx;
		.promo-icon { font-size: 28rpx; }
		.promo-text { font-size: 24rpx; color: #666; }
	}
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
	border: 2rpx solid #F0F0F0;
	box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
	transition: all 0.2s ease;
	.amount-icon { display: block; font-size: 32rpx; margin-bottom: 8rpx; }
	.amount-num { display: block; font-size: 36rpx; font-weight: bold; color: #333; margin-bottom: 6rpx; }
	.amount-bonus { display: block; font-size: 20rpx; color: #FF6B9D; font-weight: bold; }
	.amount-present { display: block; font-size: 18rpx; color: #52C41A; margin-top: 4rpx; }
	.popular-tag {
		position: absolute;
		top: -1rpx;
		right: -1rpx;
		background: linear-gradient(135deg, #FF9ECD, #FF6B9D);
		color: #FFF;
		font-size: 16rpx;
		padding: 4rpx 12rpx;
		border-radius: 0 20rpx 0 16rpx;
		font-weight: bold;
	}
}
.amount-item.active {
	border-color: #FF6B9D;
	background: #FFF5F8;
	box-shadow: 0 4rpx 16rpx rgba(255,107,157,0.2);
}

/* ===== 支付方式 ===== */
.pay-list {
	background: #FFF;
	border-radius: 24rpx;
	overflow: hidden;
	box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
}
.pay-item {
	display: flex;
	align-items: center;
	padding: 28rpx 24rpx;
	border-bottom: 1rpx solid #F5F5F5;
	&:last-child { border-bottom: none; }
	.pay-icon { width: 48rpx; height: 48rpx; margin-right: 16rpx; }
	.pay-name { flex: 1; font-size: 28rpx; color: #333; }
	.pay-check {
		width: 40rpx;
		height: 40rpx;
		border-radius: 50%;
		border: 2rpx solid #DDD;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.pay-item.active .pay-check {
		background: #FF6B9D;
		border-color: #FF6B9D;
	}
	.check-icon { color: #FFF; font-size: 24rpx; font-weight: bold; }
	.pay-soon {
		background: #F5F5F5;
		color: #999;
		font-size: 20rpx;
		padding: 6rpx 16rpx;
		border-radius: 10rpx;
	}
}
.pay-item.disabled { opacity: 0.5; }
.pay-item.active .pay-check { background: #FF6B9D; border-color: #FF6B9D; }

/* ===== 底部 ===== */
.bottom-area {
	padding: 24rpx;
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	background: linear-gradient(to top, #FFF9F5 80%, transparent);
	padding-top: 40rpx;
}
.selected-info {
	text-align: center;
	margin-bottom: 16rpx;
	.selected-text { font-size: 26rpx; color: #666; }
	.selected-amount { font-size: 40rpx; font-weight: bold; color: #FF6B9D; }
}
.submit-btn {
	background: linear-gradient(135deg, #FF9ECD, #FF6B9D);
	border-radius: 50rpx;
	padding: 28rpx;
	text-align: center;
	box-shadow: 0 8rpx 32rpx rgba(255,107,157,0.4);
	.btn-text { color: #FFF; font-size: 32rpx; font-weight: bold; }
}
.terms {
	text-align: center;
	font-size: 22rpx;
	color: #999;
	margin-top: 16rpx;
	.terms-link { color: #FF6B9D; }
}
</style>
