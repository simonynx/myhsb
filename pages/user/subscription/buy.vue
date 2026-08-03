<template>
	<view class="page-wrapper">
		<!-- 账户余额预览 -->
		<view class="balance-card">
			<view class="balance-left">
				<text class="balance-label">{{ hasLogin ? '账户余额' : '先看卡，确认购买时再登录' }}</text>
				<view class="balance-amount" v-if="hasLogin">
					<text class="yuan">¥</text>
					<text class="num">{{ balanceText }}</text>
				</view>
				<text class="guest-balance" v-else>常来几次，就别每次都按原价</text>
			</view>
			<view class="balance-right" @tap="navToMyCards" v-if="hasLogin">
				<text class="my-cards-btn">我的卡包 ➔</text>
			</view>
		</view>

		<!-- 购卡列表 -->
		<view class="section">
			<view class="section-header">
				<view>
					<text class="section-title">选择适合你的省钱卡</text>
					<text class="section-subtitle">{{ sectionSummary }}</text>
				</view>
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
					:class="card.itemClass"
					v-for="(card) in displayCards"
					:key="card.object_id"
					@tap="selectCard(card)"
				>
					<view :class="card.tagClass">
						{{ card.badgeText }}
					</view>
					
					<view class="card-body">
						<view class="card-title-row">
							<view class="card-name-wrap">
								<text class="card-name">{{ card.name }}</text>
								<text class="recommend-label" v-if="card.recommendLabel">{{ card.recommendLabel }}</text>
							</view>
							<view class="card-prices">
								<text class="price-symbol">¥</text>
								<text class="price-val">{{ card.priceText }}</text>
								<text class="orig-price" v-if="card.originalPriceText">¥{{ card.originalPriceText }}</text>
							</view>
						</view>
						<text class="card-selling-point">{{ card.sellingPoint }}</text>
						<view class="card-benefits">
							<text class="benefit-pill" v-if="card.unitPriceText">{{ card.unitPriceText }}</text>
							<text class="benefit-save" v-if="card.saveText">{{ card.saveText }}</text>
						</view>
						
						<view class="card-details">
							<view class="detail-item">
								<text class="detail-dot">•</text>
								<text class="detail-text">
									包含额度：<text class="highlight">{{ card.limitText }}</text>
								</text>
							</view>
							<view class="detail-item">
								<text class="detail-dot">•</text>
								<text class="detail-text">
									可抵扣：<text class="highlight">{{ card.usageText }}</text>
								</text>
							</view>
							<view class="detail-item" v-if="card.roomScopeText">
								<text class="detail-dot">•</text>
								<text class="detail-text">适用空间：<text class="highlight">{{ card.roomScopeText }}</text></text>
							</view>
							<view class="detail-item">
								<text class="detail-dot">•</text>
								<text class="detail-text">有效期：<text class="highlight">{{ card.validityText }}</text></text>
							</view>
							<view class="detail-item" v-if="card.orderLimitText">
								<text class="detail-dot">•</text>
								<text class="detail-text">每单上限：<text class="highlight">{{ card.orderLimitText }}</text></text>
							</view>
							<view class="detail-item" v-if="card.purchaseRuleText">
								<text class="detail-dot">•</text>
								<text class="detail-text">购买资格：<text class="highlight">{{ card.purchaseRuleText }}</text></text>
							</view>
						</view>
					</view>
				</view>
			</view>
			<view class="selection-tip" v-if="!selectedCard">
				<text>新客卡负责第一次同行体验，常客卡负责后续持续省</text>
			</view>
		</view>

		<!-- 支付方式 -->
		<view class="section" v-if="selectedCard">
			<view class="section-header">
				<view>
					<text class="section-title">支付方式</text>
					<text class="section-subtitle">购买后立即生效，有效期从购买当天开始</text>
				</view>
			</view>
			<view class="pay-list">
				<!-- 微信支付 -->
				<view class="pay-item active">
					<image class="pay-icon" src="/static/wxpay.png" mode="aspectFit"></image>
					<view class="pay-name-wrap">
						<text class="pay-name">微信支付</text>
						<text class="pay-desc">{{ channelPayAmount > 0 ? '支付 ¥' + formatMoney(channelPayAmount) : '余额全额支付' }}</text>
					</view>
					<view class="pay-check">
						<text class="check-icon">✓</text>
					</view>
				</view>
				<view class="pay-item balance-pay-item" :class="useBalance && currentBalanceFen > 0 ? 'active' : ''">
					<text class="pay-icon">🪙</text>
					<view class="pay-name-wrap">
						<text class="pay-name">使用余额抵扣</text>
						<text class="pay-desc">{{ balanceDeductText }}</text>
					</view>
					<switch color="#FF6432" :checked="useBalance && currentBalanceFen > 0" :disabled="currentBalanceFen <= 0" @change="onBalanceChange" />
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
				<text class="sum-extra">余额抵扣 ¥{{ formatMoney(balanceDeductAmount) }}，{{ channelPayAmount > 0 ? '渠道支付 ¥' + formatMoney(channelPayAmount) : '余额全额支付' }}</text>
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

export default {
	data() {
		return {
			cards: [],
			loading: true,
			selectedCardId: '',
			selectedCard: null,
			paytype: 'wxpay',
			useBalance: true,
			buying: false,
			preferredAmount: 0,
			preferredCardId: '',
			preferredTargetType: 0,
			activeTargetType: 0,
			source: 'subscription_mall',
			returnToCheckout: false,
			pageViewTracked: false
		};
	},
	computed: {
		...mapState(['hasLogin', 'userInfo', 'token']),
		targetTabs() {
			var tabs = [
				{ name: '大厅卡', desc: '同行也能用', value: 1 },
				{ name: '包厢卡', desc: '抵独立包厢房费', value: 2 },
			];
			return tabs.filter(tab => this.cards.some(card => this.getCardTargetType(card) === tab.value));
		},
		displayCards() {
			var cards = this.activeTargetType
				? this.cards.filter(card => this.getCardTargetType(card) === this.activeTargetType)
				: this.cards;
			return cards.map(card => this.buildCardView(card, cards));
		},
		selectedCardView() {
			if (!this.selectedCard) return {};
			return this.buildCardView(this.selectedCard, this.cards);
		},
		sectionSummary() {
			if (this.activeTargetType === 2) return '只抵包厢小时费，每单最多抵4小时';
			return '同行可共用，新客卡限购，常客卡持续省';
		},
		purchaseButtonText() {
			if (this.buying) return '正在下单...';
			if (this.selectedCard && !this.getCardCanPurchase(this.selectedCard)) return '新客卡每人限购1次';
			return this.hasLogin ? '立即购买' : '登录后购买';
		},
		purchaseDisabled() {
			return this.buying || !this.selectedCard || !this.getCardCanPurchase(this.selectedCard);
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
		},
		balanceDeductAmount() {
			if (!this.selectedCard || !this.useBalance) return 0;
			return Math.min(this.currentBalanceFen, Number(this.selectedCard.price) || 0);
		},
		channelPayAmount() {
			if (!this.selectedCard) return 0;
			return Math.max(0, (Number(this.selectedCard.price) || 0) - this.balanceDeductAmount);
		},
		balanceDeductText() {
			if (!this.selectedCard || this.currentBalanceFen <= 0) return '当前余额不足，仍可支付补差';
			return '本次抵扣 ¥' + this.formatMoney(this.balanceDeductAmount) + '，可用 ¥' + this.balanceText;
		}
	},
	onLoad(options) {
		var amount = Number(options && options.amount || 0);
		if (amount > 0) this.preferredAmount = amount;
		if (options && options.card_id) this.preferredCardId = options.card_id;
		if (options && options.source) {
			try {
				this.source = decodeURIComponent(options.source);
			} catch (e) {
				this.source = options.source;
			}
		}
		this.returnToCheckout = this.source === 'ticket_checkout' || this.source === 'room_checkout';
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
		...mapActions(['loginAndRegister', 'getUserInfo']),
		formatMoney(amount) {
			return (Number(amount || 0) / 100).toFixed(2);
		},
		fetchCards() {
			this.loading = true;
			AUTH.getSubscriptionCards(this.token).then(res => {
				this.loading = false;
				if (res._status === 0 && res.data) {
					var previousSelectedId = this.selectedCardId;
					this.cards = res.data;
					this.selectedCardId = '';
					this.selectedCard = null;
					if (this.cards.length > 0) {
						if (!this.activeTargetType) {
							this.activeTargetType = this.preferredTargetType || this.getCardTargetType(this.cards[0]) || 0;
						}
						var previousCard = previousSelectedId
							? this.cards.find(card => card.object_id === previousSelectedId && this.getCardCanPurchase(card))
							: null;
						var initialCard = previousCard || this.getInitialCard();
						if (initialCard) this.selectCard(initialCard, true);
					}
					this.trackPageView();
				} else {
					this.trackSubscriptionEvent('subscription_card_load_fail');
					uni.showToast({ title: res._reason || '加载失败', icon: 'none' });
				}
			}).catch(err => {
				this.loading = false;
				this.trackSubscriptionEvent('subscription_card_load_fail');
				uni.showToast({ title: '加载失败，请检查网络', icon: 'none' });
			});
		},
		trackPageView() {
			if (this.pageViewTracked) return;
			this.pageViewTracked = true;
			this.trackSubscriptionEvent('subscription_mall_view', {
				card_count: this.cards.length,
				target_type: this.activeTargetType || 0,
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
		selectCard(card, shouldTrack) {
			if (!card) return;
			if (!this.getCardCanPurchase(card)) {
				uni.showToast({ title: '新客卡每人限购1次，请选择常客卡', icon: 'none' });
				return;
			}
			this.selectedCardId = card.object_id;
			this.selectedCard = this.cards.find(item => item.object_id === card.object_id) || card;
			if (this.currentBalanceFen >= card.price) {
				this.paytype = 'balance';
			} else {
				this.paytype = 'wxpay';
			}
			if (shouldTrack !== false) {
				this.trackSubscriptionEvent('subscription_card_select', {
					card_id: card.object_id,
					target_type: this.getCardTargetType(card),
					card_price: Number(card.price) || 0
				});
			}
		},
		switchTargetTab(targetType) {
			if (this.activeTargetType === targetType) return;
			this.activeTargetType = targetType;
			if (!this.selectedCard || this.getCardTargetType(this.selectedCard) !== targetType) {
				this.selectedCardId = '';
				this.selectedCard = null;
				if (this.preferredAmount > 0 && this.preferredTargetType === targetType) {
					var next = this.getInitialCard();
					if (next) this.selectCard(next, false);
				}
			}
			this.trackSubscriptionEvent('subscription_target_switch', { target_type: targetType });
		},
		getCardTargetType(card) {
			return SUBSCRIPTION.getCardTargetType(card);
		},
		isMonthlyCard(card) {
			return card && this.getCardTargetType(card) === 1 && Number(card.validity_days) <= 31 && Number(card.total_limit) >= 8;
		},
		getCardCanPurchase(card) {
			return !card || card.can_purchase !== false;
		},
		getCardBadge(card) {
			if (!card) return '卡包';
			if (this.getCardTargetType(card) === 2) return '小时卡';
			return this.isMonthlyCard(card) ? '月卡' : '次卡';
		},
		getCardUnit(card) {
			return SUBSCRIPTION.getCardUnit(card);
		},
		getCardUsageText(card) {
			if (!card) return '';
			return SUBSCRIPTION.getCardUsageText(card);
		},
		getRecommendationLabel(card, cards) {
			if (!card) return '';
			var targetType = this.getCardTargetType(card);
			var totalLimit = Number(card.total_limit);
			if (targetType === 1) {
				if (totalLimit === 3) return '每人限购1次';
				if (totalLimit === 8) return '双人月享';
				if (totalLimit === 10) return '常客推荐';
			}
			if (targetType === 2) {
				if (totalLimit === 10) return '常客入门';
				if (totalLimit === 20) return '固定小队推荐';
			}
			return '';
		},
		getInitialCard() {
			var preferredCardId = this.preferredCardId;
			var found = preferredCardId ? this.cards.find(c => c.object_id === preferredCardId && this.getCardCanPurchase(c)) : null;
			if (found) return found;

			var candidates = this.cards.filter(c => this.getCardCanPurchase(c));
			var targetType = this.activeTargetType || this.preferredTargetType;
			if (targetType) {
				var typedCards = candidates.filter(c => this.getCardTargetType(c) === targetType);
				if (typedCards.length > 0) candidates = typedCards;
			}

			if (this.preferredAmount > 0) {
				var targetFen = this.preferredAmount > 10000 ? this.preferredAmount : this.preferredAmount * 100;
				return candidates.reduce((best, card) => {
					if (!best) return card;
					return Math.abs(card.price - targetFen) < Math.abs(best.price - targetFen) ? card : best;
				}, null) || candidates[0];
			}
			return null;
		},
		getCardUnitPriceText(card) {
			if (!card || !card.total_limit) return '';
			var totalLimit = Number(card.total_limit) || 0;
			var price = Number(card.price) || 0;
			if (totalLimit <= 0 || price <= 0) return '';
			var unit = this.getCardUnit(card);
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
		formatPrice(fen, digits) {
			var amount = (Number(fen) || 0) / 100;
			if (digits === 2) return amount.toFixed(2);
			return amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(1);
		},
		getCardSellingPoint(card) {
			var targetType = this.getCardTargetType(card);
			var totalLimit = Number(card && card.total_limit) || 0;
			if (targetType === 2) {
				if (totalLimit <= 10) return '至少覆盖3次常规组局，先锁定下次见面';
				if (totalLimit <= 20) return '固定小队多次组局更合适';
				return '适合社群活动和长期固定组局';
			}
			if (totalLimit <= 3) return '首次3人同行可一单抵完，之后升级常客卡';
			if (totalLimit <= 8) return '双人每周来一次，30天刚好用完';
			if (totalLimit <= 10) return '每单最多抵3人，保留后续到店额度';
			return '高频到店或固定小队，单次最省';
		},
		getOrderLimitText(card) {
			var rule = SUBSCRIPTION.getPrimaryUsageRule(card);
			var maxPerOrder = Number(rule && rule.max_per_order) || 0;
			if (maxPerOrder <= 0) return '';
			if (this.getCardTargetType(card) === 2) return '最多抵' + maxPerOrder + '小时包厢费';
			return '最多抵' + maxPerOrder + '张大厅票';
		},
		getPurchaseRuleText(card) {
			var limit = Number(card && card.purchase_limit_per_user) || 0;
			if (limit <= 0) return '';
			return this.getCardCanPurchase(card) ? '新客专享，每人限购' + limit + '次' : '已购买过，不能重复购买';
		},
		getRoomScopeText(card) {
			if (this.getCardTargetType(card) !== 2) return '';
			var rooms = Array.isArray(card.usable_rooms) ? card.usable_rooms : [];
			if (rooms.length === 0) return '全部预约空间';
			return rooms.map(room => room && room.name || '').filter(Boolean).join('、');
		},
		getCardAnalyticsKey(card) {
			var prefix = this.getCardTargetType(card) === 2 ? 'room' : 'hall';
			return prefix + '_' + (Number(card && card.total_limit) || 0);
		},
		buildCardView(card, cards) {
			var targetType = this.getCardTargetType(card);
			var visualClass = targetType === 2 ? 'room' : (this.isMonthlyCard(card) ? 'monthly' : 'times');
			var unit = this.getCardUnit(card);
			var canPurchase = this.getCardCanPurchase(card);
			return Object.assign({}, card, {
				itemClass: 'card-item' + (this.selectedCardId === card.object_id ? ' active' : '') + (canPurchase ? '' : ' unavailable'),
				tagClass: 'card-tag ' + visualClass,
				badgeText: canPurchase ? this.getCardBadge(card) : '已购过',
				recommendLabel: this.getRecommendationLabel(card, cards),
				priceText: this.formatPrice(card.price, 0),
				priceFullText: this.formatPrice(card.price, 2),
				originalPriceText: Number(card.original_price) > Number(card.price) ? this.formatPrice(card.original_price, 0) : '',
				unitPriceText: this.getCardUnitPriceText(card),
				saveText: this.getCardSaveText(card),
				sellingPoint: this.getCardSellingPoint(card),
				limitText: (Number(card.total_limit) || 0) + unit,
				usageText: this.getCardUsageText(card),
				roomScopeText: this.getRoomScopeText(card),
				orderLimitText: this.getOrderLimitText(card),
				purchaseRuleText: this.getPurchaseRuleText(card),
				analyticsKey: this.getCardAnalyticsKey(card),
				validityText: (Number(card.validity_days) || 0) + '天，自购买日起算'
			});
		},
		onBalanceChange(event) {
			this.useBalance = !!(event && event.detail && event.detail.value);
		},
		navToMyCards() {
			uni.navigateTo({ url: '/pages/user/subscription/my' });
		},
		doPurchase() {
			if (this.buying) return;
			if (!this.selectedCard) {
				uni.showToast({ title: '请先选择要购买的卡包', icon: 'none' });
				return;
			}
			if (!this.getCardCanPurchase(this.selectedCard)) {
				uni.showToast({ title: '新客卡每人限购1次，请选择常客卡', icon: 'none' });
				return;
			}
			this.trackSubscriptionEvent('subscription_buy_click', {
				card_id: this.selectedCard.object_id,
				card_price: Number(this.selectedCard.price) || 0,
				payment_method: this.paytype,
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
					payment_method: this.paytype
				});

				if (this.useBalance && this.channelPayAmount === 0) {
					this.payWithBalance(orderNumber);
				} else {
					this.payWithWechat(orderNumber);
				}
			}).catch(err => {
				uni.hideLoading();
				this.buying = false;
				this.trackSubscriptionEvent('subscription_checkout_fail', { card_id: this.selectedCardId });
				uni.showToast({ title: '下单失败，请重试', icon: 'none' });
			});
		},
		payWithBalance(orderNumber) {
			uni.showLoading({ title: '正在扣款...' });
			this.trackSubscriptionEvent('subscription_payment_launch', {
				card_id: this.selectedCardId,
				order_number: orderNumber,
				payment_method: 'balance'
			});
			AUTH.accountPay(this.token, { order_number: orderNumber }).then(res => {
				uni.hideLoading();
				this.buying = false;
				if (res._status === 0) {
					uni.showToast({ title: '购买成功', icon: 'success' });
					this.trackSubscriptionEvent('subscription_payment_success', {
						card_id: this.selectedCardId,
						order_number: orderNumber,
						payment_method: 'balance',
						_dedupe_key: 'subscription_payment_success:' + orderNumber,
						_dedupe_ttl_ms: 24 * 60 * 60 * 1000
					});
					this.trackSubscriptionEvent('payment_success', {
						card_id: this.selectedCardId,
						order_number: orderNumber,
						payment_method: 'balance',
						_dedupe_key: 'payment_success:subscription:' + orderNumber,
						_dedupe_ttl_ms: 24 * 60 * 60 * 1000
					});
					this.getUserInfo(true).catch(function() {});
					setTimeout(() => this.finishPurchaseNavigation(), 1200);
				} else {
					this.trackSubscriptionEvent('subscription_payment_fail', {
						card_id: this.selectedCardId,
						order_number: orderNumber,
						payment_method: 'balance'
					});
					uni.showModal({ title: '支付失败', content: res._reason || '余额支付失败', showCancel: false });
				}
			}).catch(err => {
				uni.hideLoading();
				this.buying = false;
				this.trackSubscriptionEvent('subscription_payment_fail', {
					card_id: this.selectedCardId,
					order_number: orderNumber,
					payment_method: 'balance'
				});
				uni.showToast({ title: '支付失败，请稍后查看订单', icon: 'none' });
			});
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
				use_balance: this.useBalance,
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
								uni.redirectTo({ url: '/pages/order/payment?parent_sn=' + encodeURIComponent(orderNumber) + '&entry=3' });
							}
						}
					});
					return;
				}
				
				var payload = res.data || res;
				if (payload.payment_completed) {
					uni.showToast({ title: '购买成功', icon: 'success' });
					this.getUserInfo(true).catch(function() {});
					setTimeout(() => this.finishPurchaseNavigation(), 1200);
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
					setTimeout(() => this.finishPurchaseNavigation(), 1200);
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
								uni.redirectTo({ url: '/pages/order/payment?parent_sn=' + encodeURIComponent(orderNumber) + '&entry=3' });
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
							uni.redirectTo({ url: '/pages/order/payment?parent_sn=' + encodeURIComponent(orderNumber) + '&entry=3' });
						}
					}
				});
			});
		},
		finishPurchaseNavigation() {
			if (this.returnToCheckout) {
				uni.$emit('subscriptionPurchased', {
					card_id: this.selectedCardId,
					target_type: this.getCardTargetType(this.selectedCard)
				});
				uni.navigateBack({
					delta: 1,
					fail: function() {
						uni.redirectTo({ url: '/pages/user/subscription/my' });
					}
				});
				return;
			}
			uni.redirectTo({ url: '/pages/user/subscription/my' });
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
	padding-top: 20rpx;
	padding-bottom: 40rpx;
}

/* ===== 余额卡片 ===== */
.balance-card {
	margin: 0 24rpx 20rpx;
	background: #397267;
	border-radius: 16rpx;
	padding: 28rpx 30rpx;
	display: flex;
	align-items: center;
	box-shadow: 0 8rpx 24rpx rgba(38, 91, 81, 0.18);
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
		.guest-balance {
			display: block;
			font-size: 30rpx;
			line-height: 1.45;
			color: #FFF;
			font-weight: bold;
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
	border-radius: 16rpx;
	padding: 28rpx;
	box-shadow: 0 8rpx 32rpx rgba(140, 100, 60, 0.06);
	border: 1rpx solid rgba(240, 230, 216, 0.6);
	box-sizing: border-box;
}
.section-header {
	display: flex;
	align-items: center;
	margin-bottom: 24rpx;
	.section-title { display: block; font-size: 32rpx; font-weight: bold; color: #3F352D; }
	.section-subtitle { display: block; margin-top: 8rpx; font-size: 23rpx; line-height: 1.45; color: #88796C; }
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
	border-radius: 14rpx;
	padding: 30rpx 24rpx;
	background: #FCF9F5;
	transition: all 0.25s ease;
	
	&.active {
		border-color: #FF8C42;
		background: #FFFBF7;
		box-shadow: 0 4rpx 20rpx rgba(255,140,66,0.12);
	}
	&.unavailable {
		opacity: 0.62;
		background: #F3F1EE;
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
.card-selling-point {
	display: block;
	margin: -4rpx 0 14rpx;
	font-size: 24rpx;
	line-height: 1.45;
	color: #67594D;
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

.selection-tip {
	margin-top: 20rpx;
	padding: 18rpx 20rpx;
	border-left: 6rpx solid #397267;
	background: #F0F7F5;
	border-radius: 8rpx;
	font-size: 23rpx;
	line-height: 1.45;
	color: #527067;
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
	.pay-name-wrap { flex: 1; min-width: 0; display: flex; flex-direction: column; }
	.pay-name { font-size: 28rpx; color: #5C4B3A; }
	.pay-desc { margin-top: 4rpx; font-size: 22rpx; color: #8C7966; }
	.pay-insufficient { font-size: 22rpx; color: #BBB; }
	switch { flex-shrink: 0; margin-left: 16rpx; }
	
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
		max-width: 430rpx;
		line-height: 1.35;
	}
}
.submit-btn {
	background: #E8784A;
	color: #FFF;
	padding: 22rpx 60rpx;
	border-radius: 12rpx;
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
