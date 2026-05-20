<template>
	<view class="page-wrapper">
		<!-- 顶部装饰 -->
		<view class="header-deco">
			<text class="deco-leaf">🍃</text>
			<text class="deco-cloud">☁️</text>
			<text class="deco-star">✨</text>
		</view>

		<!-- 账户余额预览 -->
		<view class="balance-card">
			<view class="balance-left">
				<text class="balance-label">账户余额</text>
				<view class="balance-amount">
					<text class="yuan">¥</text>
					<text class="num">{{ balanceText }}</text>
				</view>
			</view>
			<view class="balance-right" @tap="navToMyCards">
				<text class="my-cards-btn">我的卡包 ➔</text>
			</view>
		</view>

		<!-- 购卡列表 -->
		<view class="section">
			<view class="section-header">
				<text class="section-emoji">🎫</text>
				<text class="section-title">限时特惠多次卡包</text>
			</view>
			
			<view v-if="loading" class="loading-state">
				<text class="loading-text">加载中...</text>
			</view>
			
			<view v-else-if="cards.length === 0" class="empty-state">
				<text class="empty-text">暂无可购买的卡包</text>
			</view>
			
			<view v-else class="card-list">
				<view 
					class="card-item" 
					v-for="(card) in cards" 
					:key="card.object_id"
					:class="selectedCardId === card.object_id ? 'active' : ''"
					@tap="selectCard(card)"
				>
					<view class="card-tag" :class="card.card_type === 2 ? 'monthly' : 'times'">
						{{ card.card_type === 2 ? '月卡' : '次卡' }}
					</view>
					
					<view class="card-body">
						<view class="card-title-row">
							<text class="card-name">{{ card.name }}</text>
							<view class="card-prices">
								<text class="price-symbol">¥</text>
								<text class="price-val">{{ (card.price / 100).toFixed(0) }}</text>
								<text class="orig-price" v-if="card.original_price">¥{{ (card.original_price / 100).toFixed(0) }}</text>
							</view>
						</view>
						
						<view class="card-details">
							<view class="detail-item">
								<text class="detail-dot">•</text>
								<text class="detail-text">
									包含额度：<text class="highlight">{{ card.total_limit }}{{ card.target_type === 2 ? '小时' : '次' }}</text>
								</text>
							</view>
							<view class="detail-item">
								<text class="detail-dot">•</text>
								<text class="detail-text">
									适用类型：<text class="highlight">{{ card.target_type === 2 ? '包厢预约折抵' : '大厅门票折抵' }}</text>
								</text>
							</view>
							<view class="detail-item" v-if="card.target_type === 2">
								<text class="detail-dot">•</text>
								<text class="detail-text">
									人头费：<text class="highlight">{{ card.cover_person_fee ? '免费免除1人门票' : '不含人头费' }}</text>
								</text>
							</view>
							<view class="detail-item" v-if="card.usable_rooms && card.usable_rooms.length > 0">
								<text class="detail-dot">•</text>
								<text class="detail-text">
									适用包间：<text class="room-tag" v-for="r in card.usable_rooms" :key="r.object_id">{{ r.name }}</text>
								</text>
							</view>
							<view class="detail-item" v-else-if="card.target_type === 2">
								<text class="detail-dot">•</text>
								<text class="detail-text">适用包间：<text class="highlight">所有包间通用</text></text>
							</view>
							<view class="detail-item">
								<text class="detail-dot">•</text>
								<text class="detail-text">有效期：<text class="highlight">{{ card.validity_days }} 天</text> (自购买起算)</text>
							</view>
						</view>
					</view>
				</view>
			</view>
		</view>

		<!-- 支付方式 -->
		<view class="section" v-if="selectedCard">
			<view class="section-header">
				<text class="section-emoji">💳</text>
				<text class="section-title">选择支付方式</text>
			</view>
			<view class="pay-list">
				<!-- 微信支付 -->
				<view class="pay-item" :class="paytype === 'wxpay' ? 'active' : ''" @tap="paytype = 'wxpay'">
					<image class="pay-icon" src="/static/wxpay.png" mode="aspectFit"></image>
					<text class="pay-name">微信支付</text>
					<view class="pay-check">
						<text v-if="paytype === 'wxpay'" class="check-icon">✓</text>
					</view>
				</view>
				<!-- 余额支付 -->
				<view 
					class="pay-item" 
					:class="[paytype === 'balance' ? 'active' : '', hasEnoughBalance ? '' : 'disabled']" 
					@tap="selectBalancePay"
				>
					<text class="pay-icon">🪙</text>
					<text class="pay-name">余额支付 (可用 ¥{{ balanceText }})</text>
					<text class="pay-insufficient" v-if="!hasEnoughBalance">余额不足</text>
					<view class="pay-check" v-else>
						<text v-if="paytype === 'balance'" class="check-icon">✓</text>
					</view>
				</view>
			</view>
		</view>

		<view style="height: 280rpx;"></view>

		<!-- 购买浮动栏 -->
		<view class="bottom-area" v-if="selectedCard">
			<view class="price-summary">
				<text class="sum-label">应付金额：</text>
				<text class="sum-symbol">¥</text>
				<text class="sum-price">{{ (selectedCard.price / 100).toFixed(2) }}</text>
			</view>
			<view class="submit-btn" :class="buying ? 'disabled' : ''" @tap="doPurchase">
				<text class="btn-text">{{ buying ? '正在下单...' : '立即购买' }}</text>
			</view>
		</view>
	</view>
</template>

<script>
import { mapState, mapActions } from 'vuex';
import AUTH from '../../../utils/auth.js';

export default {
	data() {
		return {
			cards: [],
			loading: true,
			selectedCardId: '',
			selectedCard: null,
			paytype: 'wxpay',
			buying: false,
			preferredAmount: 0,
			preferredCardId: ''
		};
	},
	computed: {
		...mapState(['hasLogin', 'userInfo', 'token']),
		balanceText() {
			var balance = this.userInfo && this.userInfo.account_balance;
			balance = Number(balance);
			if (!isFinite(balance)) balance = 0;
			return (balance / 100).toFixed(2);
		},
		currentBalanceFen() {
			var balance = this.userInfo && this.userInfo.account_balance;
			balance = Number(balance);
			return isFinite(balance) ? balance : 0;
		},
		hasEnoughBalance() {
			if (!this.selectedCard) return false;
			return this.currentBalanceFen >= this.selectedCard.price;
		}
	},
	onLoad(options) {
		var amount = Number(options && options.amount || 0);
		if (amount > 0) this.preferredAmount = amount;
		if (options && options.card_id) this.preferredCardId = options.card_id;
		this.fetchCards();
	},
	onShow() {
		if (this.token) {
			this.getUserInfo(true).catch(function() {});
		}
	},
	methods: {
		...mapActions(['getUserInfo']),
		fetchCards() {
			this.loading = true;
			AUTH.getSubscriptionCards(this.token).then(res => {
				this.loading = false;
				if (res._status === 0 && res.data) {
					this.cards = res.data;
					if (this.cards.length > 0) {
						var preferredCardId = this.preferredCardId;
						var found = preferredCardId ? this.cards.find(c => c.object_id === preferredCardId) : null;
						if (found) {
							this.selectCard(found);
						} else {
							this.selectCard(this.cards[0]);
						}
					}
				} else {
					uni.showToast({ title: res._reason || '加载失败', icon: 'none' });
				}
			}).catch(err => {
				this.loading = false;
				uni.showToast({ title: '加载失败，请检查网络', icon: 'none' });
			});
		},
		selectCard(card) {
			this.selectedCardId = card.object_id;
			this.selectedCard = card;
			// 自动调整支付方式
			if (this.currentBalanceFen >= card.price) {
				this.paytype = 'balance';
			} else {
				this.paytype = 'wxpay';
			}
		},
		selectBalancePay() {
			if (!this.hasEnoughBalance) {
				uni.showToast({ title: '余额不足以购买此卡包', icon: 'none' });
				return;
			}
			this.paytype = 'balance';
		},
		navToMyCards() {
			uni.navigateTo({ url: '/pages/user/subscription/my' });
		},
		doPurchase() {
			if (this.buying) return;
			if (!this.hasLogin || !this.token) {
				uni.showModal({
					title: '请先登录',
					content: '登录后才能购买特惠卡包',
					confirmText: '去登录',
					success: (res) => {
						if (res.confirm) {
							uni.switchTab({ url: '/pages/user/user' });
						}
					}
				});
				return;
			}
			if (!this.selectedCard) {
				uni.showToast({ title: '请选择要购买的卡包', icon: 'none' });
				return;
			}

			this.buying = true;
			uni.showLoading({ title: '创建订单中...' });

			// Call checkout
			AUTH.checkout(this.token, {
				order_type: 7, // OrderType.SUBSCRIPTION
				subscription_card_id: this.selectedCard.object_id
			}).then(res => {
				uni.hideLoading();
				if (res._status !== 0) {
					this.buying = false;
					uni.showModal({ title: '下单失败', content: res._reason || '创建订单失败', showCancel: false });
					return;
				}

				var order = res.data || res;
				var orderNumber = order.order_number;

				if (this.paytype === 'balance') {
					// Pay with balance
					this.payWithBalance(orderNumber);
				} else {
					// Pay with WeChat Pay
					this.payWithWechat(orderNumber);
				}
			}).catch(err => {
				uni.hideLoading();
				this.buying = false;
				uni.showToast({ title: '下单失败，请重试', icon: 'none' });
			});
		},
		payWithBalance(orderNumber) {
			uni.showLoading({ title: '正在扣款...' });
			AUTH.accountPay(this.token, { order_number: orderNumber }).then(res => {
				uni.hideLoading();
				this.buying = false;
				if (res._status === 0) {
					uni.showToast({ title: '购买成功', icon: 'success' });
					this.getUserInfo(true).catch(function() {});
					setTimeout(() => {
						uni.redirectTo({ url: '/pages/user/subscription/my' });
					}, 1200);
				} else {
					uni.showModal({ title: '支付失败', content: res._reason || '余额支付失败', showCancel: false });
				}
			}).catch(err => {
				uni.hideLoading();
				this.buying = false;
				uni.showToast({ title: '支付失败，请稍后查看订单', icon: 'none' });
			});
		},
		payWithWechat(orderNumber) {
			uni.showLoading({ title: '调起支付...' });
			AUTH.platformPay(this.token, { order_number: orderNumber }).then(res => {
				uni.hideLoading();
				this.buying = false;
				if (!res) return;
				
				var payment = res.payment || res.wxpay || res;
				var PLATFORM = require('../../../common/platform.js');
				
				PLATFORM.requestPayment(payment).then(() => {
					uni.showToast({ title: '购买成功', icon: 'success' });
					this.getUserInfo(true).catch(function() {});
					setTimeout(() => {
						uni.redirectTo({ url: '/pages/user/subscription/my' });
					}, 1200);
				}).catch(err => {
					console.error('微信支付失败:', err);
					uni.showModal({ title: '支付未完成', content: '支付取消或失败，您可在我的订单中继续支付', showCancel: false });
				});
			}).catch(err => {
				uni.hideLoading();
				this.buying = false;
				uni.showModal({ title: '获取支付参数失败', content: err._reason || '请重试', showCancel: false });
			});
		}
	}
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
	height: 40rpx;
	overflow: hidden;
}
.deco-leaf {
	position: absolute;
	top: 8rpx;
	left: 50rpx;
	font-size: 36rpx;
	opacity: 0.35;
}
.deco-cloud {
	position: absolute;
	top: 6rpx;
	right: 70rpx;
	font-size: 32rpx;
	opacity: 0.3;
}
.deco-star {
	position: absolute;
	top: 12rpx;
	left: 50%;
	font-size: 28rpx;
	opacity: 0.25;
}

/* ===== 余额卡片 ===== */
.balance-card {
	margin: 0 24rpx 20rpx;
	background: linear-gradient(135deg, #FFB74D, #FF8C42);
	border-radius: 28rpx;
	padding: 36rpx 32rpx;
	display: flex;
	align-items: center;
	box-shadow: 0 8rpx 32rpx rgba(255, 140, 66, 0.25);
	box-sizing: border-box;

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
		.my-cards-btn {
			font-size: 26rpx;
			color: #FFF;
			background: rgba(255, 255, 255, 0.2);
			padding: 10rpx 24rpx;
			border-radius: 999rpx;
			font-weight: bold;
		}
	}
}

/* ===== 通用区块 ===== */
.section {
	margin: 0 24rpx 30rpx;
	background: #FFF;
	border-radius: 24rpx;
	padding: 28rpx;
	box-shadow: 0 8rpx 32rpx rgba(140, 100, 60, 0.06);
	border: 1rpx solid rgba(240, 230, 216, 0.6);
	box-sizing: border-box;
}
.section-header {
	display: flex;
	align-items: center;
	gap: 12rpx;
	margin-bottom: 24rpx;
	.section-emoji { font-size: 36rpx; }
	.section-title { font-size: 32rpx; font-weight: bold; color: #5C4B3A; }
}

.loading-state, .empty-state {
	padding: 80rpx 0;
	text-align: center;
	color: #A09080;
	font-size: 26rpx;
}

/* ===== 购卡列表 ===== */
.card-list {
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}
.card-item {
	position: relative;
	border: 2rpx solid #F0E6D8;
	border-radius: 24rpx;
	padding: 30rpx 24rpx;
	background: #FCF9F5;
	transition: all 0.25s ease;
	
	&.active {
		border-color: #FF8C42;
		background: #FFFBF7;
		box-shadow: 0 4rpx 20rpx rgba(255,140,66,0.12);
	}
}
.card-tag {
	position: absolute;
	top: 0;
	left: 0;
	font-size: 20rpx;
	color: #FFF;
	padding: 6rpx 16rpx;
	border-radius: 24rpx 0 24rpx 0;
	font-weight: bold;
	
	&.times {
		background: linear-gradient(135deg, #FFB74D, #FF8C42);
	}
	&.monthly {
		background: linear-gradient(135deg, #AB47BC, #7B1FA2);
	}
}
.card-body {
	margin-top: 10rpx;
}
.card-title-row {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	margin-bottom: 16rpx;
}
.card-name {
	font-size: 32rpx;
	font-weight: bold;
	color: #5C4B3A;
	max-width: 70%;
}
.card-prices {
	text-align: right;
	display: flex;
	align-items: baseline;
	gap: 6rpx;
	
	.price-symbol {
		font-size: 24rpx;
		color: #E8784A;
		font-weight: bold;
	}
	.price-val {
		font-size: 44rpx;
		font-weight: bold;
		color: #E8784A;
	}
	.orig-price {
		font-size: 22rpx;
		color: #BBB;
		text-decoration: line-through;
	}
}
.card-details {
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}
.detail-item {
	display: flex;
	align-items: flex-start;
	gap: 8rpx;
	
	.detail-dot {
		color: #FF8C42;
		font-size: 26rpx;
		line-height: 1;
	}
	.detail-text {
		font-size: 24rpx;
		color: #8C7966;
		line-height: 1.4;
	}
	.highlight {
		color: #5C4B3A;
		font-weight: bold;
	}
	.room-tag {
		background: #FFF2E8;
		color: #FF8C42;
		font-size: 20rpx;
		padding: 4rpx 12rpx;
		border-radius: 6rpx;
		margin-right: 8rpx;
		font-weight: bold;
	}
}

/* ===== 支付选择 ===== */
.pay-list {
	background: #FFF;
	border-radius: 20rpx;
	overflow: hidden;
}
.pay-item {
	display: flex;
	align-items: center;
	padding: 26rpx 20rpx;
	border-bottom: 1rpx solid #F5EBE0;
	transition: background 0.2s;
	
	&:last-child { border-bottom: none; }
	
	.pay-icon { width: 44rpx; height: 44rpx; margin-right: 16rpx; display: flex; align-items: center; justify-content: center; font-size: 38rpx; }
	.pay-name { flex: 1; font-size: 28rpx; color: #5C4B3A; }
	.pay-insufficient { font-size: 22rpx; color: #BBB; }
	
	.pay-check {
		width: 36rpx;
		height: 36rpx;
		border-radius: 50%;
		border: 2rpx solid #DDD;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.check-icon { color: #FFF; font-size: 22rpx; font-weight: bold; }
	
	&.disabled {
		opacity: 0.55;
	}
	&.active .pay-check {
		background: #FF8C42;
		border-color: #FF8C42;
	}
}

/* ===== 底部悬浮栏 ===== */
.bottom-area {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	background: #FFF;
	border-top: 1rpx solid #F5EBE0;
	padding: 24rpx 32rpx;
	padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
	display: flex;
	align-items: center;
	justify-content: space-between;
	box-shadow: 0 -4rpx 16rpx rgba(140, 100, 60, 0.05);
	z-index: 100;
}
.price-summary {
	display: flex;
	align-items: baseline;
	
	.sum-label {
		font-size: 26rpx;
		color: #5C4B3A;
	}
	.sum-symbol {
		font-size: 28rpx;
		color: #E8784A;
		font-weight: bold;
	}
	.sum-price {
		font-size: 48rpx;
		font-weight: bold;
		color: #E8784A;
	}
}
.submit-btn {
	background: linear-gradient(135deg, #FFB74D, #FF8C42);
	color: #FFF;
	padding: 22rpx 60rpx;
	border-radius: 999rpx;
	box-shadow: 0 6rpx 20rpx rgba(255, 140, 66, 0.25);
	
	.btn-text {
		font-size: 28rpx;
		font-weight: bold;
	}
	
	&.disabled {
		opacity: 0.6;
		box-shadow: none;
	}
}
</style>
