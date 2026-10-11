<template>
	<view class="page-wrapper">
		<!-- 卡包购买提示 -->
		<view class="balance-card">
			<view class="balance-left">
				<text class="balance-label">卡包专属价</text>
				<text class="guest-balance">按额度使用 · 微信支付</text>
			</view>
			<view class="balance-right" @tap="navToMyCards" v-if="hasLogin">
				<text class="my-cards-btn">我的卡包 ➔</text>
			</view>
		</view>

		<!-- 已选卡包详情与购买确认 -->
		<view class="section">
			<view class="section-header">
				<view>
					<text class="section-title">确认购买卡包</text>
					<text class="section-subtitle">{{ sectionSummary }}</text>
				</view>
			</view>

			<view v-if="loading" class="loading-state">
				<text class="state-title">正在加载卡包...</text>
				<text class="state-desc">同步当前卡包与账号购买资格</text>
			</view>
			<view v-else-if="loadError" class="error-state">
				<text class="state-title">卡包加载失败</text>
				<text class="state-desc">{{ loadError }}</text>
				<view class="retry-btn" @tap="fetchCards">重新加载</view>
			</view>

			<view v-else-if="!selectedCard" class="empty-state">
				<text class="state-title">{{ preferredCardId ? '该卡包已下架或不存在' : '尚未选择卡包' }}</text>
				<text class="state-desc">请前往商城选择当前可购买的卡包</text>
				<view class="retry-btn" @tap="goMall">去商城选卡</view>
			</view>

			<view v-else>
				<view :class="selectedCardView.itemClass">
					<view :class="selectedCardView.tagClass">
						{{ selectedCardView.badgeText }}
					</view>

					<view class="card-body">
						<view class="card-title-row">
							<view class="card-name-wrap">
								<text class="card-name">{{ selectedCardView.name }}</text>
								<text class="recommend-label" v-if="selectedCardView.recommendLabel">{{ selectedCardView.recommendLabel }}</text>
							</view>
							<view class="card-prices">
								<text class="price-symbol">¥</text>
								<text class="price-val">{{ selectedCardView.priceFullText }}</text>
								<text class="orig-price" v-if="selectedCardView.originalPriceText">¥{{ selectedCardView.originalPriceText }}</text>
							</view>
						</view>
						<view class="card-quota">
							<text class="quota-text">{{ selectedCardView.limitText }}</text>
							<text class="validity-text">{{ selectedCardView.validityText }}</text>
						</view>
						<text class="activation-text">{{ selectedCardView.activationText }}</text>
						<text class="card-selling-point">{{ selectedCardView.sellingPoint }}</text>
						<text class="usage-example" v-if="selectedCardView.usageExample">{{ selectedCardView.usageExample }}</text>
						<view class="card-benefits">
							<text class="benefit-pill" v-if="selectedCardView.unitPriceText">{{ selectedCardView.unitPriceText }}</text>
							<text class="benefit-save" v-if="selectedCardView.saveText">{{ selectedCardView.saveText }}</text>
						</view>

						<view class="important-rules">
							<text class="restriction-text" v-if="selectedCardView.showRestrictionText">{{ selectedCardView.restrictionText }}</text>
							<text class="rule-text" v-for="rule in selectedCardView.importantRuleLines" :key="rule.key">{{ rule.text }}</text>
							<text class="rule-text" v-if="selectedCardView.roomScopeText">适用房间：{{ selectedCardView.roomScopeText }}</text>
							<text class="rule-text" v-if="selectedCardView.orderLimitText">{{ selectedCardView.orderLimitText }}</text>
							<text class="purchase-rule" v-if="selectedCardView.purchaseRuleText">{{ selectedCardView.purchaseRuleText }}</text>
							<text class="purchase-rule" v-if="selectedCardView.unavailable && !selectedCardView.purchaseRuleText">{{ selectedCardView.unavailableReason }}</text>
						</view>
						<view class="details-toggle" @tap.stop="toggleCardDetails(selectedCardId)">
							<text>{{ selectedCardView.detailsExpanded ? '收起使用细则 −' : '查看使用细则 +' }}</text>
						</view>
						<view class="card-details" v-if="selectedCardView.detailsExpanded">
							<text class="rule-text">可抵扣：{{ selectedCardView.usageText }}</text>
							<text class="rule-text" v-for="rule in selectedCardView.secondaryRuleLines" :key="rule.key">{{ rule.text }}</text>
						</view>
					</view>
				</view>
			</view>
			<view class="selection-tip" v-if="selectedCard">
				<text>按额度使用，不是无限次或自动续费。</text>
			</view>
		</view>

		<!-- 支付方式 -->
		<view class="section" v-if="selectedCard">
			<view class="section-header">
				<view>
					<text class="section-title">支付方式</text>
					<text class="section-subtitle">{{ selectedCardView.activationText }}；购卡不支持余额、优惠券及积分抵扣</text>
				</view>
			</view>
			<view class="pay-list">
				<!-- 微信支付 -->
				<view class="pay-item active">
					<image class="pay-icon" src="/static/wxpay.png" mode="aspectFit"></image>
					<view class="pay-name-wrap">
						<text class="pay-name">微信支付</text>
						<text class="pay-desc">支付 ¥{{ selectedCardView.priceFullText }}</text>
					</view>
					<view class="pay-check">
						<text class="check-icon">✓</text>
					</view>
				</view>
			</view>
		</view>

		<view style="height: 280rpx;"></view>

		<!-- 购买浮动栏 -->
		<view class="bottom-area" v-if="selectedCard">
			<view class="price-summary">
				<view class="sum-main">
					<text class="sum-label">订单合计：</text>
					<text class="sum-symbol">¥</text>
					<text class="sum-price">{{ selectedCardView.priceFullText }}</text>
				</view>
				<text class="sum-extra">卡包专属价，仅支持微信支付</text>
			</view>
			<view class="submit-btn" :class="purchaseDisabled ? 'disabled' : ''" @tap="doPurchase">
				<text class="btn-text">{{ purchaseButtonText }}</text>
			</view>
		</view>
	</view>
</template>

<script>
import { mapState, mapActions } from 'vuex';
import AUTH from '../../../utils/auth.js';
import SUBSCRIPTION from '../../../utils/subscription.js';
import PRESENTATION from '../../../utils/subscriptionPresentation.js';
import MALL_NAV from '../../../utils/mallNavigation.js';

export default {
	data() {
		return {
			cards: [],
			loading: true,
			loadError: '',
			cardLoadId: 0,
			expandedCardIds: [],
			selectedCardId: '',
			selectedCard: null,
			buying: false,
			preferredAmount: 0,
			preferredCardId: '',
			preferredTargetType: 0,
			source: 'subscription_mall',
			returnToCheckout: false,
			returnUrl: '',
			pageViewTracked: false
		};
	},
	computed: {
		...mapState(['hasLogin', 'token']),
		selectedCardView() {
			if (!this.selectedCard) return {};
			return this.buildCardView(this.selectedCard);
		},
		sectionSummary() {
			if (!this.selectedCard) return '请从商城选卡后确认购买';
			if (this.getCardTargetType(this.selectedCard) === 2) return '按小时抵房费，留意入场费与闲时限制';
			return '大厅按人次扣减，持卡账号替同行下单';
		},
		purchaseButtonText() {
			if (this.buying) return '正在下单...';
			if (this.loading) return '正在加载...';
			if (this.loadError) return '请重新加载卡包';
			if (this.selectedCard && !this.getCardCanPurchase(this.selectedCard)) return this.selectedCardView.unavailableReason;
			return this.hasLogin ? '立即购买' : '登录后购买';
		},
		purchaseDisabled() {
			return this.buying || this.loading || !!this.loadError || !this.selectedCard
				|| !this.preferredCardId || this.selectedCardId !== this.preferredCardId
				|| !this.cards.some(card => card.object_id === this.selectedCardId && this.getCardCanPurchase(card));
		},
	},
	onLoad(options) {
		var query = options || {};
		var amount = Number(query.amount || 0);
		if (isFinite(amount) && amount > 0) this.preferredAmount = amount;
		this.preferredCardId = String(query.card_id || '').trim();
		if (query.source) {
			try {
				this.source = decodeURIComponent(query.source);
			} catch (e) {
				this.source = query.source;
			}
		}
		if (query.return_url) {
			try {
				this.returnUrl = decodeURIComponent(query.return_url);
			} catch (e) {
				this.returnUrl = query.return_url;
			}
		}
		this.returnToCheckout = this.source === 'ticket_checkout' || this.source === 'room_checkout'
			|| query.return_to_checkout === '1';
		var targetType = Number(query.target_type || 0);
		if (targetType === 1 || targetType === 2) this.preferredTargetType = targetType;
		// 旧链接只负责带意图去商城，不请求卡包或创建订单。
		if (!Object.prototype.hasOwnProperty.call(query, 'card_id')) {
			this.loading = false;
			this.goMall();
			return;
		}
		this.fetchCards();
	},
	onShow() {
		if (this.preferredCardId && this.token) {
			this.getUserInfo(true).catch(function() {});
		}
	},
	methods: {
		...mapActions(['loginAndRegister', 'getUserInfo']),
		goMall() {
			return MALL_NAV.openCardMall({
				source: this.source,
				targetType: this.preferredTargetType,
				amount: this.preferredAmount,
				returnToCheckout: this.returnToCheckout,
				returnUrl: this.returnUrl
			});
		},
		fetchCards() {
			var loadId = ++this.cardLoadId;
			this.loading = true;
			this.loadError = '';
			// 账号资格重新确认前，不允许继续购买旧列表中的卡包。
			this.cards = [];
			this.selectedCardId = '';
			this.selectedCard = null;
			this.expandedCardIds = [];
			if (!this.preferredCardId) {
				this.loading = false;
				return Promise.resolve();
			}
			return AUTH.getSubscriptionCards(this.token).then(res => {
				if (loadId !== this.cardLoadId) return;
				this.loading = false;
				if (res && res._status === 0 && Array.isArray(res.data)) {
					this.cards = res.data;
					var chosenCard = this.cards.find(card => card.object_id === this.preferredCardId);
					// 不可购买也显示该卡的真实详情；不存在时绝不选另一张。
					if (chosenCard) {
						this.selectedCardId = chosenCard.object_id;
						this.selectedCard = chosenCard;
						this.trackSubscriptionEvent('subscription_card_select', {
							card_id: chosenCard.object_id,
							target_type: this.getCardTargetType(chosenCard),
							card_price: Number(chosenCard.price) || 0
						});
					}
					this.trackPageView();
				} else {
					this.handleCardLoadFailure(res && res._reason || '暂时无法获取卡包，请重试');
				}
			}).catch(err => {
				if (loadId !== this.cardLoadId) return;
				this.handleCardLoadFailure('请检查网络后重新加载');
			});
		},
		handleCardLoadFailure(message) {
			this.loading = false;
			this.loadError = message;
			this.cards = [];
			this.selectedCardId = '';
			this.selectedCard = null;
			this.trackSubscriptionEvent('subscription_card_load_fail');
			uni.showToast({ title: message, icon: 'none' });
		},
		toggleCardDetails(cardId) {
			if (this.expandedCardIds.indexOf(cardId) >= 0) {
				this.expandedCardIds = this.expandedCardIds.filter(id => id !== cardId);
			} else {
				this.expandedCardIds = this.expandedCardIds.concat(cardId);
			}
		},
		trackPageView() {
			if (this.pageViewTracked) return;
			this.pageViewTracked = true;
			this.trackSubscriptionEvent('subscription_mall_view', {
				card_count: this.cards.length,
				target_type: this.selectedCard ? this.getCardTargetType(this.selectedCard) : this.preferredTargetType,
				has_login: !!this.hasLogin,
				_dedupe_key: 'subscription_mall_view:' + this.source,
				_dedupe_ttl_ms: 30000
			});
		},
		trackSubscriptionEvent(event, extra) {
			var payload = Object.assign({
				event: event,
				page_path: 'pages/user/subscription/buy',
				source: this.source || 'subscription_mall'
			}, extra || {});
			if (!payload.item_key && this.selectedCard) {
				payload.item_key = this.getCardAnalyticsKey(this.selectedCard);
			}
			AUTH.trackEvent(payload, this.token).catch(function() {});
		},
		getCardTargetType(card) {
			return SUBSCRIPTION.getCardTargetType(card);
		},
		getCardCanPurchase(card) {
			return !!card && card.can_purchase !== false;
		},
		getCardAnalyticsKey(card) {
			var prefix = this.getCardTargetType(card) === 2 ? 'room' : 'hall';
			return prefix + '_' + (Number(card && card.total_limit) || 0);
		},
		buildCardView(card) {
			var presentation = PRESENTATION.buildCardView(card);
			var canPurchase = this.getCardCanPurchase(card);
			// 入场与闲时限制不折叠，其余细则预先整理供 WXML 直接绑定。
			var importantRuleLines = presentation.ruleLines.filter(rule => /入场费|闲时/.test(rule.text));
			var secondaryRuleLines = presentation.ruleLines.filter(rule => importantRuleLines.indexOf(rule) < 0);
			return Object.assign({}, card, presentation, {
				itemClass: 'card-item ' + presentation.visualClass + (this.selectedCardId === card.object_id ? ' active' : '') + (canPurchase ? '' : ' unavailable'),
				tagClass: 'card-tag ' + presentation.visualClass,
				unavailable: !canPurchase,
				unavailableReason: presentation.purchaseRuleText || '当前账号暂不可购买此卡',
				showRestrictionText: presentation.visualClass !== 'room',
				detailsExpanded: this.expandedCardIds.indexOf(card.object_id) >= 0,
				importantRuleLines: importantRuleLines,
				secondaryRuleLines: secondaryRuleLines,
				analyticsKey: this.getCardAnalyticsKey(card)
			});
		},
		navToMyCards() {
			uni.navigateTo({ url: '/pages/user/subscription/my' });
		},
		doPurchase() {
			if (this.buying) return;
			if (this.loading || this.loadError) {
				uni.showToast({ title: this.loading ? '请等待卡包加载完成' : '请重新加载卡包后购买', icon: 'none' });
				return;
			}
			var currentCard = this.cards.find(card => card.object_id === this.selectedCardId);
			if (!this.selectedCard || !currentCard || !this.preferredCardId || this.selectedCardId !== this.preferredCardId) {
				this.selectedCardId = '';
				this.selectedCard = null;
				uni.showToast({ title: '请去商城选择要购买的卡包', icon: 'none' });
				return;
			}
			this.selectedCard = currentCard;
			if (!this.getCardCanPurchase(currentCard)) {
				uni.showToast({ title: this.selectedCardView.unavailableReason, icon: 'none' });
				return;
			}
			this.trackSubscriptionEvent('subscription_buy_click', {
				card_id: this.selectedCard.object_id,
				card_price: Number(this.selectedCard.price) || 0,
				payment_method: 'wxpay',
				has_login: !!this.hasLogin
			});
			if (!this.hasLogin || !this.token) {
				uni.showModal({
					title: '登录后继续购买',
					content: '登录后即可购买当前卡包',
					confirmText: '立即登录',
					success: (res) => {
						if (res.confirm) {
							this.trackSubscriptionEvent('subscription_login_start', { card_id: this.selectedCardId });
							this.loginAndRegister().then(() => {
								this.trackSubscriptionEvent('subscription_login_success', { card_id: this.selectedCardId });
								this.getUserInfo(true).catch(function() {});
								this.fetchCards();
								uni.showToast({ title: '登录成功，请确认购买', icon: 'none' });
							}).catch(() => {
								this.trackSubscriptionEvent('subscription_login_fail', { card_id: this.selectedCardId });
							});
						}
					}
				});
				return;
			}

			this.buying = true;
			uni.showLoading({ title: '创建订单中...' });

			AUTH.checkout(this.token, {
				order_type: 7,
				subscription_card_id: this.selectedCard.object_id,
			}).then(res => {
				uni.hideLoading();
				if (res._status !== 0) {
					this.buying = false;
					this.trackSubscriptionEvent('subscription_checkout_fail', { card_id: this.selectedCardId });
					uni.showModal({ title: '下单失败', content: res._reason || '创建订单失败', showCancel: false });
					return;
				}

				var order = res.data || res;
				var orderNumber = order.order_number;
				this.trackSubscriptionEvent('subscription_checkout_created', {
					card_id: this.selectedCardId,
					order_number: orderNumber,
					payment_method: 'wxpay'
				});

				this.payWithWechat(orderNumber);
			}).catch(err => {
				uni.hideLoading();
				this.buying = false;
				this.trackSubscriptionEvent('subscription_checkout_fail', { card_id: this.selectedCardId });
				uni.showToast({ title: '下单失败，请重试', icon: 'none' });
			});
		},
		paymentContinuationUrl(orderNumber) {
			var url = '/pages/order/payment?parent_sn=' + encodeURIComponent(orderNumber) + '&entry=3';
			if (this.returnToCheckout && (this.source === 'ticket_checkout' || this.source === 'room_checkout')) {
				url += '&mall_source=' + encodeURIComponent(this.source)
					+ '&mall_return_url=' + encodeURIComponent(this.returnUrl);
			}
			return url;
		},
		payWithWechat(orderNumber) {
			uni.showLoading({ title: '调起支付...' });
			this.trackSubscriptionEvent('subscription_payment_launch', {
				card_id: this.selectedCardId,
				order_number: orderNumber,
				payment_method: 'wxpay'
			});
			AUTH.platformPay(this.token, {
				order_number: orderNumber,
				use_balance: false,
			}).then(res => {
				uni.hideLoading();
				this.buying = false;
				if (!res) return;
				if (res._status !== undefined && Number(res._status) !== 0) {
					this.trackSubscriptionEvent('subscription_payment_fail', {
						card_id: this.selectedCardId,
						order_number: orderNumber,
						payment_method: 'wxpay'
					});
					uni.showModal({
						title: '获取支付参数失败',
						content: res._reason || '订单已保留，可稍后继续支付',
						confirmText: '查看订单',
						cancelText: '稍后',
						success: (modalRes) => {
							if (modalRes.confirm) {
								uni.redirectTo({ url: this.paymentContinuationUrl(orderNumber) });
							}
						}
					});
					return;
				}

				var payload = res.data || res;
				if (payload.payment_completed) {
					uni.showToast({ title: '购买成功', icon: 'success' });
					this.getUserInfo(true).catch(function() {});
					setTimeout(() => this.finishPurchaseNavigation(orderNumber), 1200);
					return;
				}
				var payment = payload.payment || payload.wxpay || payload;
				var PLATFORM = require('../../../common/platform.js');

				PLATFORM.requestPayment(payment).then(() => {
					uni.showToast({ title: '购买成功', icon: 'success' });
					this.trackSubscriptionEvent('subscription_payment_success', {
						card_id: this.selectedCardId,
						order_number: orderNumber,
						payment_method: 'wxpay',
						_dedupe_key: 'subscription_payment_success:' + orderNumber,
						_dedupe_ttl_ms: 24 * 60 * 60 * 1000
					});
					this.trackSubscriptionEvent('payment_success', {
						card_id: this.selectedCardId,
						order_number: orderNumber,
						payment_method: 'wxpay',
						_dedupe_key: 'payment_success:subscription:' + orderNumber,
						_dedupe_ttl_ms: 24 * 60 * 60 * 1000
					});
					this.getUserInfo(true).catch(function() {});
					setTimeout(() => this.finishPurchaseNavigation(orderNumber), 1200);
				}).catch(err => {
					console.error('微信支付失败:', err);
					this.buying = false;
					this.trackSubscriptionEvent('subscription_payment_cancel', {
						card_id: this.selectedCardId,
						order_number: orderNumber,
						payment_method: 'wxpay'
					});
					uni.showModal({
						title: '支付未完成',
						content: '订单已保留，可继续完成支付',
						confirmText: '继续支付',
						cancelText: '稍后',
						success: (res) => {
							if (res.confirm) {
								uni.redirectTo({ url: this.paymentContinuationUrl(orderNumber) });
							}
						}
					});
				});
			}).catch(err => {
				uni.hideLoading();
				this.buying = false;
				this.trackSubscriptionEvent('subscription_payment_fail', {
					card_id: this.selectedCardId,
					order_number: orderNumber,
					payment_method: 'wxpay'
				});
				uni.showModal({
					title: '获取支付参数失败',
					content: (err && err._reason) || '订单已保留，可稍后继续支付',
					confirmText: '查看订单',
					cancelText: '稍后',
					success: (res) => {
						if (res.confirm) {
							uni.redirectTo({ url: this.paymentContinuationUrl(orderNumber) });
						}
					}
				});
			});
		},
		finishPurchaseNavigation(orderNumber) {
			if (this.returnToCheckout) {
				uni.$emit('subscriptionPurchased', {
					card_id: this.selectedCardId,
					target_type: this.getCardTargetType(this.selectedCard)
				});
				if (!MALL_NAV.resumeCheckout({ source: this.source, returnUrl: this.returnUrl })) {
					uni.redirectTo({ url: '/pages/user/subscription/my' });
				}
				return;
			}
			var amount = Number(this.selectedCard && this.selectedCard.price || 0);
			uni.redirectTo({
				url: '/pages/pay/success/success?amount=' + amount
					+ '&id=' + encodeURIComponent(orderNumber || '')
					+ '&type=subscription'
			});
		}
	}
};
</script>

<style lang="scss">
page {
	background: #F7F5F1;
	color: #3C332B;
}
.page-wrapper {
	min-height: 100vh;
	padding: 20rpx 0 40rpx;
}
.balance-card {
	margin: 0 24rpx 20rpx;
	padding: 18rpx 24rpx;
	display: flex;
	align-items: center;
	gap: 16rpx;
	border-bottom: 1rpx solid #E5DDD2;
	.balance-left { flex: 1; min-width: 0; }
	.balance-label { display: block; font-size: 28rpx; font-weight: bold; }
	.guest-balance { display: block; margin-top: 6rpx; font-size: 23rpx; color: #796B5F; }
	.my-cards-btn { font-size: 24rpx; color: #B95730; white-space: nowrap; }
}
.section {
	margin: 0 24rpx 24rpx;
	background: #FFFCF7;
	border: 1rpx solid #E5DDD2;
	border-radius: 18rpx;
	padding: 24rpx;
	box-sizing: border-box;
}
.section-header {
	margin-bottom: 20rpx;
	.section-title { display: block; font-size: 30rpx; font-weight: bold; }
	.section-subtitle { display: block; margin-top: 8rpx; font-size: 23rpx; line-height: 1.5; color: #796B5F; }
}
.loading-state, .error-state, .empty-state {
	padding: 64rpx 12rpx;
	text-align: center;
	font-size: 26rpx;
	color: #796B5F;
}
.state-title { display: block; color: #3C332B; font-weight: bold; }
.state-desc { display: block; margin-top: 12rpx; font-size: 24rpx; line-height: 1.5; }
.retry-btn {
	display: inline-block;
	margin-top: 24rpx;
	padding: 16rpx 32rpx;
	border: 1rpx solid #B95730;
	border-radius: 12rpx;
	color: #B95730;
	background: #FFFCF7;
}
.card-item {
	position: relative;
	border: 2rpx solid #E5DDD2;
	border-radius: 16rpx;
	padding: 44rpx 22rpx 20rpx;
	box-sizing: border-box;
	&.hall { background: #FCF3E3; }
	&.room { background: #EEE8DE; }
	&.active {
		border-color: #B95730;
		box-shadow: 0 4rpx 16rpx rgba(185, 87, 48, 0.1);
	}
	&.unavailable {
		border-style: dashed;
		background: #F1EDE7;
	}
}
.card-tag {
	position: absolute;
	top: 0;
	left: 0;
	font-size: 20rpx;
	padding: 6rpx 16rpx;
	border-radius: 14rpx 0 12rpx 0;
	font-weight: bold;
	&.hall { background: #EFE0C8; color: #72543B; }
	&.room { background: #D9CBB9; color: #58483A; }
}
.card-title-row {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	gap: 12rpx;
	margin-bottom: 12rpx;
}
.card-name-wrap {
	flex: 1;
	min-width: 0;
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 8rpx;
}
.card-name { font-size: 30rpx; font-weight: bold; overflow-wrap: anywhere; }
.recommend-label {
	font-size: 20rpx;
	color: #B95730;
	background: #F5E4D7;
	border-radius: 6rpx;
	padding: 4rpx 8rpx;
}
.card-prices {
	text-align: right;
	display: flex;
	align-items: baseline;
	flex-wrap: wrap;
	justify-content: flex-end;
	gap: 4rpx;
	max-width: 48%;
	.price-symbol { font-size: 24rpx; color: #B95730; font-weight: bold; }
	.price-val { font-size: 42rpx; color: #B95730; font-weight: bold; }
	.orig-price { font-size: 22rpx; color: #796B5F; text-decoration: line-through; }
}
.card-quota { display: flex; flex-wrap: wrap; align-items: baseline; gap: 16rpx; }
.quota-text { font-size: 30rpx; font-weight: bold; }
.validity-text { font-size: 26rpx; font-weight: bold; }
.activation-text { display: block; margin: 6rpx 0 14rpx; font-size: 22rpx; line-height: 1.5; color: #796B5F; }
.card-selling-point, .usage-example {
	display: block;
	font-size: 24rpx;
	line-height: 1.5;
	margin-bottom: 8rpx;
}
.usage-example { color: #796B5F; }
.card-benefits { display: flex; flex-wrap: wrap; gap: 8rpx; margin: 12rpx 0; }
.benefit-pill, .benefit-save { font-size: 22rpx; border-radius: 6rpx; padding: 6rpx 10rpx; background: #FFFCF7; }
.benefit-save { color: #B95730; }
.important-rules { border-top: 1rpx solid #DED2C3; padding-top: 12rpx; }
.restriction-text { display: block; font-size: 24rpx; font-weight: bold; line-height: 1.55; }
.rule-text { display: block; margin-top: 6rpx; font-size: 23rpx; line-height: 1.55; }
.purchase-rule { display: block; margin-top: 8rpx; font-size: 23rpx; color: #B95730; font-weight: bold; line-height: 1.5; }
.details-toggle { padding: 18rpx 0 4rpx; font-size: 24rpx; color: #B95730; }
.card-details { margin-top: 12rpx; padding-top: 8rpx; border-top: 1rpx dashed #D9CBB9; color: #796B5F; }
.selection-tip { margin-top: 20rpx; font-size: 23rpx; line-height: 1.5; color: #796B5F; }
.pay-list { border-radius: 12rpx; overflow: hidden; }
.pay-item {
	display: flex;
	align-items: center;
	padding: 18rpx 0;
	.pay-icon { width: 44rpx; height: 44rpx; margin-right: 16rpx; }
	.pay-name-wrap { flex: 1; min-width: 0; display: flex; flex-direction: column; }
	.pay-name { font-size: 28rpx; }
	.pay-desc { margin-top: 4rpx; font-size: 23rpx; color: #796B5F; }
	.pay-check { width: 36rpx; height: 36rpx; border-radius: 50%; background: #B95730; display: flex; align-items: center; justify-content: center; }
	.check-icon { color: #FFFCF7; font-size: 22rpx; font-weight: bold; }
}
.bottom-area {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	background: #FFFCF7;
	border-top: 1rpx solid #E5DDD2;
	padding: 22rpx 28rpx;
	padding-bottom: calc(22rpx + env(safe-area-inset-bottom));
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
	box-sizing: border-box;
	z-index: 100;
}
.price-summary {
	flex: 1;
	min-width: 0;
	.sum-main { display: flex; flex-wrap: wrap; align-items: baseline; }
	.sum-label { font-size: 24rpx; }
	.sum-symbol { font-size: 26rpx; color: #B95730; font-weight: bold; }
	.sum-price { font-size: 42rpx; color: #B95730; font-weight: bold; }
	.sum-extra { display: block; font-size: 22rpx; color: #796B5F; margin-top: 4rpx; line-height: 1.4; }
}
.submit-btn {
	background: #C96B3F;
	color: #FFFCF7;
	padding: 22rpx 30rpx;
	border-radius: 12rpx;
	max-width: 46%;
	box-sizing: border-box;
	text-align: center;
	.btn-text { font-size: 27rpx; font-weight: bold; }
	&.disabled { opacity: 0.6; }
}
</style>
