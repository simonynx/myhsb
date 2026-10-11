<template>
	<view class="page">
		<!-- 商城标题 -->
		<view class="header">
			<view class="header-title-row">
				<text class="header-emblem">店</text>
				<text class="header-title">商城</text>
			</view>
			<text class="header-sub">选卡包、兑好礼，把下次见面安排好</text>
		</view>

		<view class="asset-shortcuts">
			<view class="asset-shortcut" @tap="goMyCards"><text>我的卡包 ›</text></view>
			<view class="asset-shortcut" @tap="goCoupons"><text>我的优惠券 ›</text></view>
			<view class="asset-shortcut" @tap="goClaim"><text>领券中心 ›</text></view>
		</view>
		<view class="checkout-context" v-if="checkoutContextVisible">
			<text>购卡后可返回原订单，抵扣仍以结算页为准</text>
			<view class="checkout-context-return" @tap="returnToCheckout">返回原订单 ›</view>
		</view>

		<!-- 常客卡包与积分福利 -->
		<scroll-view class="scroll-area" scroll-y>
			<view class="loyalty-summary">
				<view class="loyalty-head"><text class="loyalty-title">积分福利</text><view class="loyalty-link" @tap="goPoints">查看全部 ›</view></view>
				<text class="loyalty-balance">{{ hasLogin ? pointsSummary.points + '积分可用' : '把到店积分，用在下次好时光' }}</text>
				<text class="loyalty-note">{{ pointsSummary.usageText }}</text>
				<text class="loyalty-value" v-if="pointsSummary.valueText">{{ pointsSummary.valueText }}</text>
				<text class="loyalty-note" v-if="goodsLoading">福利正在加载…</text>
				<view class="loyalty-note" v-else-if="goodsError" @tap="loadGoods">福利加载失败，点击重试</view>
				<view v-else-if="featuredBenefits.length" class="loyalty-previews">
					<view class="loyalty-preview" v-for="benefit in featuredBenefits" :key="benefit.object_id" @tap="goPoints">
						<text class="loyalty-preview-name">{{ benefit.name }}</text><text>{{ benefit.priceText }}</text><text class="loyalty-preview-state">{{ benefit.stateText }}</text>
					</view>
				</view>
				<text class="loyalty-note" v-else>福利不定期上新，积分抵扣仍以结算页规则为准</text>
			</view>
			<view class="card-section-title"><text>常来玩的卡包</text><text class="card-section-note">看清额度、有效期，再决定</text></view>

			<view class="subscription-tabs" v-if="subscriptionTargetTabs.length > 1">
				<view
					class="subscription-tab"
					v-for="tab in subscriptionTargetTabs"
					:key="tab.value"
					:class="subscriptionTargetType === tab.value ? 'active' : ''"
					@tap="switchSubscriptionTarget(tab.value)"
				>
					<text class="subscription-tab-name">{{ tab.name }}</text>
					<text class="subscription-tab-desc">{{ tab.desc }}</text>
				</view>
			</view>

			<view class="subscription-intro"><text>{{ subscriptionValueText }}</text></view>
			<view class="mall-state" v-if="subscriptionsLoading"><text>正在加载卡包…</text></view>
			<view class="mall-state" v-else-if="subscriptionsError">
				<text>{{ subscriptionsError }}</text><view class="mall-retry" @tap="loadSubscriptionCards">重新加载</view>
			</view>
			<view class="subscription-list" v-else-if="displaySubscriptionCards.length > 0">
				<view :class="card.itemClass" v-for="card in displaySubscriptionCards" :key="card.object_id" @tap="buyCard(card)">
					<view class="sub-card-name-row">
						<text class="sub-card-name">{{ card.name }}</text><text :class="card.badgeClass">{{ card.badgeText }}</text>
					</view>
					<view class="sub-card-quota-row"><text class="sub-card-limit">{{ card.limitText }}</text><text class="sub-card-validity">{{ card.validityText }}</text></view>
					<text class="sub-card-unit-price">{{ card.unitPriceText }}</text>
					<text class="sub-card-example" v-if="card.usageExample">{{ card.usageExample }}</text>
					<view class="sub-card-policy"><text>{{ card.restrictionText }}</text><text v-if="card.purchaseRuleText">{{ card.purchaseRuleText }}</text></view>
					<view class="sub-card-footer">
						<view class="sub-card-price"><text class="symbol">¥</text><text class="price">{{ card.priceText }}</text><text class="orig" v-if="card.originalPriceText">¥{{ card.originalPriceText }}</text></view>
						<view :class="card.buyClass" @tap.stop="buyCard(card)">{{ card.buyText }}</view>
					</view>

				</view>
			</view>
			<view class="empty-box" v-else><text class="empty-text">暂无可购买的卡包</text></view>

			<view class="supply-link" @tap="goSupply"><text>已到店，看看额外付费补给</text><text>饮品 / 餐食 ›</text></view>
			<view style="height: 32rpx;"></view>
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
		featuredBenefits() {
			return LOYALTY.benefits(this.goodsList, this.safeUserInfo, this.hasLogin)
				.filter(item => !item.soldOut && !item.limitReached && !item.locked && Number(item.exchange_type) === 2).slice(0, 2);
		},
		subscriptionTargetTabs() {
			const tabs = [
				{ name: '大厅卡', desc: '按人次抵入场', value: 1 },
				{ name: '包厢卡', desc: '按小时抵房费', value: 2 },
			];
			return tabs.filter(tab => this.subscriptionCards.some(card => this.getSubscriptionTargetType(card) === tab.value));
		},
		subscriptionValueText() {
			return this.subscriptionTargetType === 2 ? '房费和入场费分开算，选卡前看清适用时段。' : '次数按人计算，不是无限月卡；支付成功后开始计时。';
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
			goodsList: [],
			subscriptionCards: [],
			subscriptionsLoading: true,
			subscriptionsError: '',
			hasAutoSelectedTab: false,
			mallIntent: null,
			goodsLoading: true,
			goodsError: '',
			subscriptionViewLastTrackedAt: 0,
		};
	},
	onShow() {
		this.applyInitialTab();
		this.refreshMall();
	},
	onUnload() {
		this._subscriptionRequest = (this._subscriptionRequest || 0) + 1;
		this._goodsRequest = (this._goodsRequest || 0) + 1;
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
			await Promise.all([this.loadGoods(), this.loadSubscriptionCards()]);
			this.selectInitialTab();
		},
		async loadGoods() {
			const request = (this._goodsRequest || 0) + 1;
			this._goodsRequest = request;
			this.goodsLoading = true;
			this.goodsError = '';
			try {
				const res = await AUTH.getGoodsList(this.token);
				if (request !== this._goodsRequest) return;
				if (!res || res._status !== 0 || !res.data || !Array.isArray(res.data.goods)) throw new Error('invalid response');
				this.goodsList = res.data.goods;
			} catch (e) {
				if (request === this._goodsRequest) this.goodsError = '商品加载失败，请重试';
			} finally {
				if (request === this._goodsRequest) this.goodsLoading = false;
			}
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
			return Object.assign({}, card, view, {
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
.header { padding: 24rpx 28rpx 16rpx; flex-shrink: 0; }
.header-title-row { display: flex; align-items: center; gap: 14rpx; }
.header-emblem { width: 48rpx; height: 48rpx; border-radius: 12rpx; background: #F0E1D1; color: #B95730; display: flex; justify-content: center; align-items: center; font-size: 24rpx; }
.header-title { font-size: 36rpx; font-weight: 800; }
.header-sub { display: block; margin-top: 10rpx; font-size: 23rpx; line-height: 1.5; color: #746A62; }
.scroll-area { flex: 1; min-height: 0; }
.asset-shortcuts { margin: 0 24rpx 16rpx; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8rpx; flex-shrink: 0; }
.asset-shortcut { padding: 16rpx 6rpx; text-align: center; border-radius: 12rpx; background: #FFFCF7; font-size: 23rpx; color: #806047; }
.checkout-context { margin: 0 24rpx 16rpx; padding: 16rpx 20rpx; background: #F0E5D7; border-radius: 12rpx; font-size: 23rpx; line-height: 1.5; color: #71543C; flex-shrink: 0; }
.checkout-context-return { margin-top: 10rpx; color: #9A4A26; font-weight: 700; }
.loyalty-summary { margin: 4rpx 24rpx 26rpx; padding: 24rpx; border: 1rpx solid #DDE3D4; border-radius: 22rpx; background: #EDF2E9; }
.loyalty-head { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; }
.loyalty-title { font-size: 27rpx; font-weight: 700; color: #405A3B; }
.loyalty-link { font-size: 23rpx; color: #476B44; padding: 8rpx 0; }
.loyalty-balance { display: block; font-size: 29rpx; font-weight: 700; margin-top: 10rpx; }
.loyalty-note { display: block; margin-top: 8rpx; font-size: 22rpx; color: #68725F; line-height: 1.6; }
.loyalty-value { display: block; margin-top: 8rpx; font-size: 23rpx; color: #476B44; }
.loyalty-previews { display: flex; gap: 12rpx; margin-top: 16rpx; }
.loyalty-preview { flex: 1; min-width: 0; padding: 14rpx; border-radius: 12rpx; background: #F9FBF6; font-size: 23rpx; color: #476B44; }
.loyalty-preview text { display: block; line-height: 1.5; }
.loyalty-preview-name { color: #3C4935; font-weight: 700; }
.loyalty-preview-state { margin-top: 5rpx; font-size: 21rpx; color: #68725F; }
.card-section-title { margin: 0 28rpx 18rpx; font-size: 30rpx; font-weight: 700; }
.card-section-note { display: block; margin-top: 6rpx; font-size: 22rpx; color: #746A62; font-weight: 400; }
.subscription-tabs { display: flex; gap: 14rpx; padding: 0 24rpx; }
.subscription-tab { flex: 1; min-width: 0; padding: 18rpx; border: 1rpx solid #E5DDD2; border-radius: 18rpx; background: #FFF; box-sizing: border-box; }
.subscription-tab-name { display: block; font-size: 27rpx; font-weight: 700; }
.subscription-tab-desc { display: block; margin-top: 5rpx; font-size: 22rpx; color: #746A62; }
.subscription-tab.active { background: #F8EBDD; border-color: #C98659; }
.subscription-tab.active .subscription-tab-name { color: #9A4A26; }
.subscription-intro { margin: 16rpx 28rpx 6rpx; font-size: 23rpx; line-height: 1.55; color: #786B5D; }
.subscription-list { padding: 16rpx 24rpx; display: flex; flex-direction: column; gap: 20rpx; }
.sub-card-item { padding: 26rpx; background: #FFFCF7; border: 1rpx solid #E5DDD2; border-radius: 24rpx; box-sizing: border-box; }
.sub-card-item.room { background: #F5EFE7; border-color: #DFD3C4; }
.sub-card-item.unavailable { background: #F3F1EE; }
.sub-card-name-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16rpx; }
.sub-card-name { flex: 1; min-width: 0; font-size: 29rpx; line-height: 1.4; font-weight: 700; }
.sub-card-type { flex-shrink: 0; padding: 6rpx 10rpx; border-radius: 8rpx; background: #F0E1D1; color: #93613E; font-size: 21rpx; }
.sub-card-type.room { background: #E7D9C8; color: #75604E; }
.sub-card-quota-row { display: flex; align-items: baseline; flex-wrap: wrap; gap: 16rpx; margin-top: 18rpx; }
.sub-card-limit { font-size: 34rpx; font-weight: 800; color: #473629; }
.sub-card-validity { font-size: 23rpx; color: #746A62; }
.sub-card-unit-price { display: block; margin-top: 10rpx; font-size: 24rpx; color: #9A4A26; }
.sub-card-example { display: block; margin-top: 8rpx; font-size: 23rpx; line-height: 1.5; color: #6B6055; }
.sub-card-policy { margin-top: 16rpx; padding: 14rpx 16rpx; border-radius: 12rpx; background: rgba(226, 210, 192, 0.3); }
.sub-card-policy text { display: block; font-size: 23rpx; line-height: 1.6; color: #6C5947; }
.sub-card-footer { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16rpx; margin-top: 20rpx; }
.sub-card-price { display: flex; align-items: baseline; flex-wrap: wrap; gap: 5rpx; color: #B95730; }
.sub-card-price .symbol { font-size: 25rpx; }
.sub-card-price .price { font-size: 42rpx; font-weight: 800; }
.sub-card-price .orig { margin-left: 8rpx; font-size: 22rpx; color: #8D8174; text-decoration: line-through; }
.buy-btn { padding: 16rpx 26rpx; border-radius: 14rpx; background: #B95730; color: #FFF; font-size: 25rpx; font-weight: 700; }
.buy-btn.unavailable { background: #E1DBD3; color: #6D6258; }
.mall-state, .empty-box { padding: 60rpx 32rpx; text-align: center; font-size: 25rpx; line-height: 1.6; color: #746A62; }
.mall-retry { display: inline-block; margin-top: 20rpx; padding: 16rpx 28rpx; border-radius: 14rpx; background: #B95730; color: #FFF; }
.supply-link { margin: 16rpx 28rpx 0; padding: 20rpx 0; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10rpx; border-top: 1rpx solid #E5DDD2; font-size: 23rpx; color: #806047; }
@media screen and (max-width: 360px) { .sub-card-name-row { flex-wrap: wrap; } .sub-card-type { font-size: 22rpx; } .sub-card-item { padding: 22rpx; } }
</style>
