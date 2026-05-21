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
				<text class="section-title">常来更省的次卡/月卡</text>
			</view>

			<view class="target-tabs" v-if="targetTabs.length > 1">
				<view
					class="target-tab"
					v-for="tab in targetTabs"
					:key="tab.value"
					:class="activeTargetType === tab.value ? 'active' : ''"
					@tap="switchTargetTab(tab.value)"
				>
					<text class="target-name">{{ tab.name }}</text>
					<text class="target-desc">{{ tab.desc }}</text>
				</view>
			</view>
			
			<view v-if="loading" class="loading-state">
				<text class="loading-text">加载中...</text>
			</view>
			
			<view v-else-if="displayCards.length === 0" class="empty-state">
				<text class="empty-text">暂无可购买的卡包</text>
			</view>
			
			<view v-else class="card-list">
				<view 
					class="card-item" 
					v-for="(card) in displayCards"
					:key="card.object_id"
					:class="selectedCardId === card.object_id ? 'active' : ''"
					@tap="selectCard(card)"
				>
					<view class="card-tag" :class="card.target_type === 2 ? 'room' : (isMonthlyCard(card) ? 'monthly' : 'times')">
						{{ getCardBadge(card) }}
					</view>
					
					<view class="card-body">
						<view class="card-title-row">
							<view class="card-name-wrap">
								<text class="card-name">{{ card.name }}</text>
								<text class="recommend-label" v-if="isRecommendedCard(card)">推荐</text>
							</view>
							<view class="card-prices">
								<text class="price-symbol">¥</text>
								<text class="price-val">{{ (card.price / 100).toFixed(0) }}</text>
								<text class="orig-price" v-if="card.original_price">¥{{ (card.original_price / 100).toFixed(0) }}</text>
							</view>
						</view>
						<view class="card-benefits">
							<text class="benefit-pill" v-if="getCardUnitPriceText(card)">{{ getCardUnitPriceText(card) }}</text>
							<text class="benefit-save" v-if="getCardSaveText(card)">{{ getCardSaveText(card) }}</text>
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
									人头费：<text class="highlight">{{ card.cover_person_fee ? '满2小时免持卡人门票' : '另按到店人数收取' }}</text>
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
				<view class="sum-main">
					<text class="sum-label">应付金额：</text>
					<text class="sum-symbol">¥</text>
					<text class="sum-price">{{ (selectedCard.price / 100).toFixed(2) }}</text>
				</view>
				<text class="sum-extra" v-if="getCardUnitPriceText(selectedCard)">{{ getCardUnitPriceText(selectedCard) }}</text>
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
			preferredCardId: '',
			preferredTargetType: 0,
			activeTargetType: 0
		};
	},
	computed: {
		...mapState(['hasLogin', 'userInfo', 'token']),
		targetTabs() {
			var tabs = [
				{ name: '大厅卡', desc: '抵门票', value: 1 },
				{ name: '包厢卡', desc: '抵小时', value: 2 },
			];
			return tabs.filter(tab => this.cards.some(card => Number(card.target_type) === tab.value));
		},
		displayCards() {
			if (!this.activeTargetType) return this.cards;
			return this.cards.filter(card => Number(card.target_type) === this.activeTargetType);
		},
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
		var targetType = Number(options && options.target_type || 0);
		if (targetType > 0) this.preferredTargetType = targetType;
		if (targetType > 0) this.activeTargetType = targetType;
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
						if (!this.activeTargetType) {
							this.activeTargetType = this.preferredTargetType || Number(this.cards[0].target_type) || 0;
						}
						this.selectCard(this.getInitialCard());
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
		switchTargetTab(targetType) {
			if (this.activeTargetType === targetType) return;
			this.activeTargetType = targetType;
			if (!this.selectedCard || Number(this.selectedCard.target_type) !== targetType) {
				var next = this.getInitialCard();
				if (next) this.selectCard(next);
			}
		},
		isMonthlyCard(card) {
			return card && Number(card.target_type) === 1 && Number(card.validity_days) <= 31 && Number(card.total_limit) >= 20;
		},
		getCardBadge(card) {
			if (!card) return '卡包';
			if (Number(card.target_type) === 2) return '小时卡';
			return this.isMonthlyCard(card) ? '月卡' : '次卡';
		},
		isRecommendedCard(card) {
			if (!card) return false;
			var targetType = Number(card.target_type);
			var totalLimit = Number(card.total_limit);
			if (targetType === 1) return totalLimit === 10;
			if (targetType === 2) return totalLimit === 10;
			return false;
		},
		getInitialCard() {
			var preferredCardId = this.preferredCardId;
			var found = preferredCardId ? this.cards.find(c => c.object_id === preferredCardId) : null;
			if (found) return found;

			var candidates = this.cards;
			var targetType = this.activeTargetType || this.preferredTargetType;
			if (targetType) {
				var typedCards = this.cards.filter(c => Number(c.target_type) === targetType);
				if (typedCards.length > 0) candidates = typedCards;
			}

			if (this.preferredAmount > 0) {
				var targetFen = this.preferredAmount > 10000 ? this.preferredAmount : this.preferredAmount * 100;
				return candidates.reduce((best, card) => {
					if (!best) return card;
					return Math.abs(card.price - targetFen) < Math.abs(best.price - targetFen) ? card : best;
				}, null) || candidates[0];
			}
			return candidates.find(card => this.isRecommendedCard(card)) || candidates[0];
		},
		getCardUnitPriceText(card) {
			if (!card || !card.total_limit) return '';
			var totalLimit = Number(card.total_limit) || 0;
			var price = Number(card.price) || 0;
			if (totalLimit <= 0 || price <= 0) return '';
			var unit = Number(card.target_type) === 2 ? '小时' : '次';
			var amount = price / totalLimit / 100;
			var text = amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(1);
			return '折合 ¥' + text + '/' + unit;
		},
		getCardSaveText(card) {
			if (!card || !card.original_price) return '';
			var originalPrice = Number(card.original_price) || 0;
			var price = Number(card.price) || 0;
			if (originalPrice <= price) return '';
			var save = (originalPrice - price) / 100;
			var text = save % 1 === 0 ? save.toFixed(0) : save.toFixed(1);
			return '比单买省 ¥' + text;
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
				if (res._status !== undefined && Number(res._status) !== 0) {
					uni.showModal({
						title: '获取支付参数失败',
						content: res._reason || '订单已保留，可稍后继续支付',
						confirmText: '查看订单',
						cancelText: '稍后',
						success: (modalRes) => {
							if (modalRes.confirm) {
								uni.redirectTo({ url: '/pages/order/payment?parent_sn=' + encodeURIComponent(orderNumber) + '&entry=3' });
							}
						}
					});
					return;
				}
				
				var payload = res.data || res;
				var payment = payload.payment || payload.wxpay || payload;
				var PLATFORM = require('../../../common/platform.js');
				
				PLATFORM.requestPayment(payment).then(() => {
					uni.showToast({ title: '购买成功', icon: 'success' });
					this.getUserInfo(true).catch(function() {});
					setTimeout(() => {
						uni.redirectTo({ url: '/pages/user/subscription/my' });
					}, 1200);
				}).catch(err => {
					console.error('微信支付失败:', err);
					this.buying = false;
					uni.showModal({
						title: '支付未完成',
						content: '订单已保留，可继续完成支付',
						confirmText: '继续支付',
						cancelText: '稍后',
						success: (res) => {
							if (res.confirm) {
								uni.redirectTo({ url: '/pages/order/payment?parent_sn=' + encodeURIComponent(orderNumber) + '&entry=3' });
							}
						}
					});
				});
			}).catch(err => {
				uni.hideLoading();
				this.buying = false;
				uni.showModal({
					title: '获取支付参数失败',
					content: (err && err._reason) || '订单已保留，可稍后继续支付',
					confirmText: '查看订单',
					cancelText: '稍后',
					success: (res) => {
						if (res.confirm) {
							uni.redirectTo({ url: '/pages/order/payment?parent_sn=' + encodeURIComponent(orderNumber) + '&entry=3' });
						}
					}
				});
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
.target-tabs {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 14rpx;
	margin-bottom: 22rpx;
}
.target-tab {
	border: 2rpx solid #F0E6D8;
	border-radius: 12rpx;
	padding: 16rpx 18rpx;
	background: #FCF9F5;
	display: flex;
	align-items: center;
	justify-content: space-between;
	box-sizing: border-box;
	.target-name {
		font-size: 28rpx;
		font-weight: bold;
		color: #5C4B3A;
	}
	.target-desc {
		font-size: 22rpx;
		color: #A09080;
	}
	&.active {
		border-color: #FF8C42;
		background: #FFF8F0;
		.target-name,
		.target-desc {
			color: #E8784A;
		}
	}
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
	&.room {
		background: linear-gradient(135deg, #5C6BC0, #3949AB);
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
.card-name-wrap {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 10rpx;
	max-width: 68%;
}
.card-name {
	font-size: 32rpx;
	font-weight: bold;
	color: #5C4B3A;
	max-width: 100%;
}
.recommend-label {
	font-size: 20rpx;
	color: #FFF;
	background: #E8784A;
	border-radius: 6rpx;
	padding: 4rpx 10rpx;
	font-weight: bold;
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
.card-benefits {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 10rpx;
	margin-bottom: 16rpx;
}
.benefit-pill,
.benefit-save {
	font-size: 22rpx;
	border-radius: 6rpx;
	padding: 5rpx 10rpx;
}
.benefit-pill {
	color: #5C4B3A;
	background: #FFF2E8;
}
.benefit-save {
	color: #E8784A;
	background: #FFF8F0;
	font-weight: bold;
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
	flex-direction: column;
	justify-content: center;
	min-width: 0;

	.sum-main {
		display: flex;
		align-items: baseline;
	}

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
	.sum-extra {
		font-size: 22rpx;
		color: #8C7966;
		margin-top: 2rpx;
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
