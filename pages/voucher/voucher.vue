<template>
	<view class="page">
		<view class="header"><text class="header-title">商城</text><text class="header-sub">常来玩，轻松一点</text></view>
		<view class="asset-shortcuts">
			<view class="asset-shortcut" @tap="goMyCards">我的卡包 ›</view>
			<view class="asset-shortcut" @tap="goCoupons">我的优惠券 ›</view>
			<view class="asset-shortcut" @tap="goClaim">领券中心 ›</view>
		</view>
		<view class="checkout-context" v-if="checkoutContextVisible"><text>正在为原订单选卡</text><view @tap="returnToCheckout">返回结算 ›</view></view>
		<scroll-view class="scroll-area" scroll-y>
			<view class="loyalty-summary" @tap="goPoints">
				<view class="loyalty-mark" aria-hidden="true">积</view>
				<view class="loyalty-copy"><text class="loyalty-title">积分福利 <text class="loyalty-balance" v-if="hasLogin">{{ pointsSummary.points }}积分</text></text><text class="loyalty-note">兑换到店礼，也可按规则抵消费</text></view>
				<text class="loyalty-link">去看看 ›</text>
			</view>
			<view class="card-section-title"><text>常客卡包</text><text class="card-section-count">{{ displaySubscriptionCards.length }}款</text></view>
			<view class="subscription-tabs" v-if="subscriptionTargetTabs.length > 1">
				<view v-for="tab in subscriptionTargetTabs" :key="tab.value" :class="subscriptionTargetType === tab.value ? 'subscription-tab active' : 'subscription-tab'" @tap="switchSubscriptionTarget(tab.value)">{{ tab.name }}</view>
			</view>
			<view class="mall-state" v-if="subscriptionsLoading">正在加载卡包…</view>
			<view class="mall-state" v-else-if="subscriptionsError"><text>{{ subscriptionsError }}</text><view class="mall-retry" @tap="loadSubscriptionCards">重新加载</view></view>
			<view class="subscription-list" v-else-if="displaySubscriptionCards.length">
				<view v-for="card in displaySubscriptionCards" :key="card.object_id" :class="card.itemClass" @tap="buyCard(card)">
					<view class="sub-card-name-row"><text class="sub-card-name">{{ card.name }}</text><text :class="card.badgeClass">{{ card.shortBadge }}</text></view>
					<view class="sub-card-overview">
						<view><text class="sub-card-limit">{{ card.limitText }}</text><text class="sub-card-validity">{{ card.validityText }}</text></view>
						<view class="sub-card-price"><text class="symbol">¥</text><text class="price">{{ card.priceText }}</text></view>
					</view>
					<text class="sub-card-unit-price">{{ card.unitPriceText }}</text>
					<view class="sub-card-footnote"><text class="sub-card-policy">{{ card.shortPolicy }}</text><text class="sub-card-policy" v-if="card.roomPolicy">{{ card.roomPolicy }}</text><text class="sub-card-purchase" v-if="card.purchaseRuleText">{{ card.purchaseRuleText }}</text></view>
					<view class="sub-card-footer"><text class="sub-card-validity">支付成功起算</text><view :class="card.buyClass" @tap.stop="buyCard(card)">{{ card.buyText }} ›</view></view>
				</view>
			</view>
			<view class="empty-box" v-else>暂无可购买的卡包</view>
			<view class="supply-link" @tap="goSupply"><text>到店补给</text><text class="supply-note">额外付费 · 店内领取 ›</text></view>
			<view class="scroll-end"></view>
		</scroll-view>
	</view>
</template>

<script>
import { mapState, mapActions } from 'vuex';
import AUTH from '../../utils/auth.js';
import SUBSCRIPTION from '../../utils/subscription.js';
import PRESENTATION from '../../utils/subscriptionPresentation.js';
import MALL_NAV from '../../utils/mallNavigation.js';
import LOYALTY from '../../utils/loyaltyPresentation.js';

export default {
	computed: {
		...mapState(['hasLogin', 'token', 'userInfo']),
		safeUserInfo() {
			return this.userInfo || { points: 0, member_level: 0 };
		},
		checkoutContextVisible() {
			return !!(this.mallIntent && this.mallIntent.returnToCheckout);
		},
		pointsSummary() {
			return LOYALTY.pointsView(this.safeUserInfo, this.hasLogin);
		},
		subscriptionTargetTabs() {
			const tabs = [
				{ name: '大厅人次卡', value: 1 },
				{ name: '包厢小时卡', value: 2 },
			];
			return tabs.filter(tab => this.subscriptionCards.some(card => this.getSubscriptionTargetType(card) === tab.value));
		},
		displaySubscriptionCards() {
			const cards = this.subscriptionTargetType
				? this.subscriptionCards.filter(card => this.getSubscriptionTargetType(card) === this.subscriptionTargetType)
				: this.subscriptionCards;
			return cards.map(card => this.buildSubscriptionCardView(card, cards));
		},
	},
	data() {
		return {
			mainTab: 2,
			subscriptionTargetType: 0,
			subscriptionCards: [],
			subscriptionsLoading: true,
			subscriptionsError: '',
			hasAutoSelectedTab: false,
			mallIntent: null,
			subscriptionViewLastTrackedAt: 0,
		};
	},
	onShow() {
		this.applyInitialTab();
		this.refreshMall();
	},
	onUnload() {
		this._subscriptionRequest = (this._subscriptionRequest || 0) + 1;
	},
	methods: {
		...mapActions(['loginAndRegister', 'getUserInfo']),
		async refreshMall() {
			if (this.token) {
				await this.getUserInfo(true).catch(() => {});
			}
			await this.loadAll();
		},
		applyInitialTab() {
			const intent = MALL_NAV.takeCardIntent();
			var initialTab = uni.getStorageSync('voucherInitialTab');
			if (initialTab) uni.removeStorageSync('voucherInitialTab');
			if (intent) {
				this.mallIntent = intent;
				this.mainTab = 2;
				this.subscriptionTargetType = intent.targetType;
				this.hasAutoSelectedTab = true;
			} else if (initialTab) {
				this.mallIntent = null;
				this.hasAutoSelectedTab = true;
				if (initialTab === 'points') this.goPoints();
				else if (initialTab === 'shop') this.goSupply();
				else {
					this.mainTab = 2;
					if (initialTab === 'coupon') this.goClaim();
				}
			} else if (this.mallIntent && Date.now() - this.mallIntent.createdAt > 30 * 60 * 1000) this.mallIntent = null;
		},
		async loadAll() {
			await this.loadSubscriptionCards();
			this.selectInitialTab();
		},
		async loadSubscriptionCards() {
			const request = (this._subscriptionRequest || 0) + 1;
			this._subscriptionRequest = request;
			this.subscriptionsLoading = true;
			this.subscriptionsError = '';
			try {
				const res = await AUTH.getSubscriptionCards(this.token);
				if (request !== this._subscriptionRequest) return;
				if (!res || res._status !== 0 || !Array.isArray(res.data)) throw new Error('invalid response');
				this.subscriptionCards = res.data;
				if (!(this.mallIntent && this.mallIntent.targetType) && !this.subscriptionCards.some(card => this.getSubscriptionTargetType(card) === this.subscriptionTargetType)) {
					this.subscriptionTargetType = this.subscriptionCards.length ? this.getSubscriptionTargetType(this.subscriptionCards[0]) : 0;
				}
				this.trackSubscriptionMallView();
			} catch (e) {
				if (request === this._subscriptionRequest) this.subscriptionsError = '卡包加载失败，请重试';
			} finally {
				if (request === this._subscriptionRequest) this.subscriptionsLoading = false;
			}
		},
		goPoints() {
			AUTH.trackEvent({ event: 'loyalty_summary_click', page_path: 'pages/voucher/voucher', source: 'mall', has_login: !!this.hasLogin }, this.token).catch(function() {});
			uni.navigateTo({ url: '/pages/voucher/points' });
		},
		goSupply() {
			uni.navigateTo({ url: '/pages/voucher/supply?source=mall_secondary' });
		},
		goCoupons() {
			if (!this.hasLogin) {
				this.promptLogin('请先登录查看我的优惠券', () => {
					uni.navigateTo({ url: '/pages/my/coupons/coupons' });
				});
				return;
			}
			uni.navigateTo({ url: '/pages/my/coupons/coupons' });
		},
		goMyCards() {
			if (!this.hasLogin) {
				this.promptLogin('请先登录查看卡包', () => {
					uni.navigateTo({ url: '/pages/user/subscription/my' });
				});
				return;
			}
			uni.navigateTo({ url: '/pages/user/subscription/my' });
		},
		goClaim() {
			uni.navigateTo({ url: '/pages/voucher/claim' });
		},
		returnToCheckout() {
			if (this.mallIntent) MALL_NAV.resumeCheckout(this.mallIntent);
		},
		buyCard(card) {
			if (this.subscriptionsLoading || this.subscriptionsError || !card) return;
			const current = this.subscriptionCards.find(item => item.object_id === card.object_id);
			if (!current) return;
			AUTH.trackEvent({
				event: 'subscription_card_click', page_path: 'pages/voucher/voucher',
				source: this.mallIntent && this.mallIntent.source || 'voucher_mall',
				card_id: current.object_id, item_key: this.getSubscriptionAnalyticsKey(current),
				target_type: this.getSubscriptionTargetType(current)
			}, this.token).catch(function() {});
			const intent = this.mallIntent && Date.now() - this.mallIntent.createdAt <= 30 * 60 * 1000
				? this.mallIntent : { source: 'voucher_mall', targetType: this.subscriptionTargetType };
			uni.navigateTo({ url: MALL_NAV.confirmationUrl(current.object_id, intent) });
		},
		switchSubscriptionTarget(targetType) {
			this.subscriptionTargetType = targetType;
			AUTH.trackEvent({
				event: 'subscription_target_switch',
				page_path: 'pages/voucher/voucher',
				source: 'voucher_mall',
				target_type: targetType
			}, this.token).catch(function() {});
		},
		trackSubscriptionMallView() {
			if (this.mainTab !== 2 || this.subscriptionCards.length === 0) return;
			const now = Date.now();
			if (now - this.subscriptionViewLastTrackedAt < 30000) return;
			this.subscriptionViewLastTrackedAt = now;
			AUTH.trackEvent({
				event: 'subscription_mall_view',
				page_path: 'pages/voucher/voucher',
				source: 'voucher_mall',
				card_count: this.subscriptionCards.length,
				target_type: this.subscriptionTargetType || 0
			}, this.token).catch(function() {});
		},
		getSubscriptionTargetType(card) {
			return SUBSCRIPTION.getCardTargetType(card);
		},
		getSubscriptionAnalyticsKey(card) {
			const prefix = this.getSubscriptionTargetType(card) === 2 ? 'room' : 'hall';
			return prefix + '_' + (Number(card && card.total_limit) || 0);
		},
		buildSubscriptionCardView(card) {
			const canPurchase = card.can_purchase !== false;
			const view = PRESENTATION.buildCardView(card);
			const ticket = PRESENTATION.presentationRule(card, SUBSCRIPTION.SLOT_TICKET);
			const hours = PRESENTATION.presentationRule(card, SUBSCRIPTION.SLOT_ROOM_HOURS);
			const entry = PRESENTATION.presentationRule(card, SUBSCRIPTION.SLOT_SELF_ENTRY_FEE);
			return Object.assign({}, card, view, {
				shortBadge: hours ? '小时' : '人次',
				shortPolicy: hours ? (entry || ticket ? '本卡多项权益，每单选一项' : '仅抵房费，入场费另计') : ticket ? '每抵1张票扣1次，持卡人统一下单' : '抵适用入场费',
				roomPolicy: hours ? '闲时默认不可抵，允许用卡时段见详情' : '',
				itemClass: 'sub-card-item ' + view.visualClass + (canPurchase ? '' : ' unavailable'),
				badgeClass: 'sub-card-type ' + view.visualClass,
				buyClass: canPurchase ? 'buy-btn' : 'buy-btn unavailable',
				buyText: canPurchase ? '查看详情' : '查看限购',
				analyticsKey: this.getSubscriptionAnalyticsKey(card),
			});
		},
		selectInitialTab() {
			this.hasAutoSelectedTab = true;
		},

		promptLogin(content, onSuccess) {
			uni.showModal({
				title: '提示',
				content: content,
				confirmText: '去登录',
				success: (res) => {
					if (!res.confirm) return;
					this.loginAndRegister().then(() => {
						if (onSuccess) onSuccess();
					});
				}
			});
		},


	},
};
</script>

<style lang="scss" scoped>
.page { height: 100vh; background: #F7F5F1; display: flex; flex-direction: column; color: #3C332B; }
.header { padding: 26rpx 28rpx 8rpx; display: flex; align-items: baseline; gap: 20rpx; flex-shrink: 0; }
.header-title { font-size: 38rpx; font-weight: 800; }
.header-sub { font-size: 24rpx; color: #807264; }
.scroll-area { flex: 1; min-height: 0; }
.asset-shortcuts { display: flex; padding: 0 24rpx 12rpx; flex-shrink: 0; }
.asset-shortcut { flex: 1; min-width: 0; min-height: 76rpx; display: flex; align-items: center; justify-content: center; font-size: 24rpx; color: #7B5F49; }
.checkout-context { margin: 0 24rpx 16rpx; padding: 16rpx 20rpx; border-radius: 14rpx; background: #F0E5D7; display: flex; justify-content: space-between; gap: 12rpx; flex-wrap: wrap; font-size: 24rpx; color: #80573B; flex-shrink: 0; }
.loyalty-summary { display: flex; align-items: center; gap: 16rpx; margin: 0 24rpx 30rpx; padding: 24rpx; border-radius: 22rpx; background: #EDF2E9; min-height: 120rpx; box-sizing: border-box; }
.loyalty-mark { display: flex; align-items: center; justify-content: center; width: 64rpx; height: 64rpx; border-radius: 18rpx; border: 2rpx solid #BACDAF; color: #526E49; font-size: 28rpx; flex-shrink: 0; }
.loyalty-copy { flex: 1; min-width: 0; }
.loyalty-title { display: block; font-size: 27rpx; font-weight: 700; color: #405A3B; line-height: 1.5; }
.loyalty-balance { font-size: 24rpx; margin-left: 8rpx; font-weight: 400; }
.loyalty-note { display: block; margin-top: 4rpx; font-size: 23rpx; color: #68725F; line-height: 1.6; }
.loyalty-link { color: #476B44; font-size: 24rpx; flex-shrink: 0; }
.card-section-title { display: flex; align-items: baseline; justify-content: space-between; margin: 0 28rpx 18rpx; font-size: 32rpx; font-weight: 700; }
.card-section-count { font-size: 24rpx; font-weight: 400; color: #8A7B6D; }
.subscription-tabs { display: flex; gap: 8rpx; margin: 0 24rpx 20rpx; padding: 6rpx; border-radius: 18rpx; background: #EDE8E0; }
.subscription-tab { flex: 1; min-width: 0; min-height: 76rpx; display: flex; align-items: center; justify-content: center; font-size: 26rpx; color: #76695B; border-radius: 14rpx; }
.subscription-tab.active { background: #FFFCF7; color: #9A4A26; font-weight: 700; }
.subscription-list { padding: 0 24rpx; display: flex; flex-direction: column; gap: 20rpx; }
.sub-card-item { padding: 26rpx; background: #FFFCF7; border: 1rpx solid #E7DDD0; border-radius: 24rpx; box-sizing: border-box; }
.sub-card-item.room { background: #F5EFE7; }
.sub-card-item.unavailable { background: #F1EEEA; }
.sub-card-name-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 12rpx; }
.sub-card-name { flex: 1; min-width: 0; font-size: 29rpx; font-weight: 700; line-height: 1.5; }
.sub-card-type { font-size: 22rpx; color: #8D6D52; padding: 6rpx 10rpx; border-radius: 8rpx; background: #F1E6D7; flex-shrink: 0; }
.sub-card-overview { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12rpx; margin-top: 22rpx; }
.sub-card-limit { display: block; font-size: 36rpx; font-weight: 800; color: #46392D; }
.sub-card-validity { display: block; margin-top: 4rpx; font-size: 23rpx; color: #887767; line-height: 1.5; }
.sub-card-price { display: flex; align-items: baseline; gap: 4rpx; color: #B95730; }
.sub-card-price .symbol { font-size: 26rpx; }
.sub-card-price .price { font-size: 46rpx; font-weight: 800; }
.sub-card-unit-price { display: block; margin-top: 14rpx; font-size: 24rpx; color: #9A633F; line-height: 1.5; }
.sub-card-footnote { margin-top: 18rpx; }
.sub-card-policy, .sub-card-purchase { display: block; font-size: 24rpx; line-height: 1.65; color: #786859; }
.sub-card-purchase { color: #9A4A26; }
.sub-card-footer { display: flex; align-items: center; justify-content: space-between; gap: 14rpx; margin-top: 16rpx; border-top: 1rpx solid #EEE3D6; padding-top: 14rpx; }
.buy-btn { min-height: 76rpx; padding: 0 20rpx; display: flex; align-items: center; border-radius: 14rpx; background: #F4E7D9; color: #9A4A26; font-size: 25rpx; font-weight: 700; }
.buy-btn.unavailable { background: #E5DED6; color: #72665B; }
.mall-state, .empty-box { padding: 60rpx 32rpx; text-align: center; font-size: 25rpx; line-height: 1.6; color: #746A62; }
.mall-retry { display: inline-block; margin-top: 20rpx; padding: 20rpx 28rpx; border-radius: 14rpx; background: #B95730; color: #FFF; }
.supply-link { margin: 26rpx 28rpx 0; padding: 24rpx 0; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10rpx; border-top: 1rpx solid #E5DDD2; font-size: 25rpx; color: #806047; min-height: 76rpx; }
.supply-note { font-size: 23rpx; color: #8A7B6D; }
.scroll-end { height: 32rpx; }
@media screen and (max-width: 360px) { .loyalty-summary { padding: 20rpx; gap: 12rpx; } .loyalty-mark { width: 50rpx; height: 50rpx; } .loyalty-balance { display: block; margin-left: 0; } .sub-card-item { padding: 22rpx; } }
</style>
