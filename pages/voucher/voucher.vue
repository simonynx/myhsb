<template>
	<view class="page">
		<!-- 顶部手绘风标题 -->
		<view class="header">
			<view class="cloud cloud-1">☁️</view>
			<view class="cloud cloud-2">☁️</view>
			<view class="leaf leaf-1">🍃</view>
			<view class="leaf leaf-2">🌿</view>
			<text class="header-title">卡券商城</text>
			<text class="header-sub">积分能花、消费能抵，常来更划算</text>
		</view>

		<!-- 主 Tab -->
		<view class="main-tabs">
			<view
				class="main-tab"
				v-for="tab in mainTabs"
				:key="tab.value"
				:class="mainTab === tab.value ? 'active' : ''"
				@click="switchMainTab(tab.value)"
			>
				<text class="tab-emoji">{{ tab.emoji }}</text>
				<text class="tab-name">{{ tab.name }}</text>
				<view class="tab-dot" v-if="tab.badge > 0">{{ tab.badge }}</view>
				<view class="tab-underline" v-if="mainTab === tab.value"></view>
			</view>
		</view>

		<!-- ========== Tab 0: 领券 ========== -->
		<scroll-view class="scroll-area" scroll-y v-if="mainTab === 0">
			<!-- 我的优惠券入口 -->
			<view class="forest-banner" @tap="goCoupons">
				<view class="banner-moss">
					<text class="banner-emoji">🎟️</text>
					<view class="banner-info">
						<text class="banner-title">我的优惠券</text>
						<text class="banner-sub">查看已领取、待使用和过期记录</text>
					</view>
				</view>
				<text class="banner-arrow">›</text>
			</view>

			<!-- 可领优惠券列表 -->
			<view class="section-header">
				<text class="section-title">可领优惠券</text>
				<text class="section-more" @tap="goCoupons">全部 ></text>
			</view>

			<view class="coupon-list" v-if="claimableCoupons.length > 0">
				<view
					class="coupon-card"
					v-for="(item, idx) in claimableCoupons"
					:key="idx"
				>
					<view class="c-left">
						<view class="c-value">
							<text class="c-sym">{{ getCouponUnit(item) === '积分' ? '' : '¥' }}</text>
							<text class="c-num">{{ getCouponValue(item) }}</text>
						</view>
						<text class="c-desc">{{ getCouponDesc(item) }}</text>
						<view class="c-leaf">🍃</view>
					</view>
					<view class="c-right">
						<text class="c-name">{{ item.name }}</text>
						<text class="c-expire" v-if="item.validity_days">领取后 {{ item.validity_days }} 天有效</text>
						<text class="c-expire" v-else>有效期至 {{ item.end_time ? item.end_time.substring(0, 10) : '永久' }}</text>
						<button
							class="c-btn"
							:disabled="!isCouponClaimable(item) || receivingCouponId === item.campaign_id"
							@tap.stop="receiveCoupon(item)"
						>
							{{ getCouponButtonText(item) }}
						</button>
					</view>
				</view>
			</view>

			<view class="empty-box" v-if="claimableCoupons.length === 0 && couponList.length > 0">
				<text class="empty-icon">🎟️</text>
				<text class="empty-text">暂无新的可领券，已领取的券可在我的优惠券查看</text>
				<view class="empty-actions">
					<view class="empty-action" @tap="goCoupons">我的优惠券</view>
					<view class="empty-action primary" @tap="switchMainTab(1)">逛小店</view>
				</view>
			</view>
			<view class="empty-box" v-else-if="couponList.length === 0">
				<text class="empty-icon">🎟️</text>
				<text class="empty-text">暂无可领取优惠券，可以先看看店内好物</text>
				<view class="empty-actions">
					<view class="empty-action primary" @tap="switchMainTab(1)">逛小店</view>
				</view>
			</view>

			<view style="height: 180rpx;"></view>
		</scroll-view>

		<!-- ========== Tab 1: 小店 ========== -->
		<scroll-view class="scroll-area" scroll-y v-if="mainTab === 1">
			<view class="shop-intro">
				<view>
					<text class="shop-intro-title">好物直购</text>
					<text class="shop-intro-sub">现金商品集中在这里，积分加购请到积分好礼</text>
				</view>
				<text class="shop-intro-count">{{ filteredGoods.length }} 件</text>
			</view>
			<!-- 手绘风子分类 -->
			<view class="category-pills">
				<view
					class="pill"
					v-for="(t, idx) in subTabs"
					:key="idx"
					:class="subTab === idx ? 'active' : ''"
					@click="subTab = idx"
				>
					<text class="pill-emoji">{{ t.emoji }}</text>
					<text class="pill-name">{{ t.name }}</text>
				</view>
			</view>

			<!-- 商品网格 -->
			<view class="goods-grid" v-if="filteredGoods.length > 0">
				<view
					class="goods-card"
					v-for="g in filteredGoods"
					:key="g.object_id"
					:class="g.lockedClass"
					@click="handleGoodsClick(g)"
				>
					<view class="goods-img-wrap">
						<text class="goods-emoji">{{ getGoodsEmoji(g) }}</text>
						<view class="corner-leaf leaf-tl">🌿</view>
						<view class="corner-leaf leaf-br">🍃</view>
					</view>
					<view class="goods-body">
						<text class="goods-name">{{ g.name }}</text>
						<text class="goods-desc" v-if="g.description">{{ g.description }}</text>
						<text class="points-status sold-out" v-if="g.purchaseStatusText">{{ g.purchaseStatusText }}</text>
						<view class="limit-badge" v-if="g.max_buy_per_user > 0">
							<text v-if="g.max_buy_period === 'month' && (g.user_bought_count || 0) > 0">🔔 本月已购{{ g.user_bought_count || 0 }}/{{ g.max_buy_per_user }}张</text>
							<text v-else-if="g.max_buy_period === 'month'">🔔 每月限购{{ g.max_buy_per_user }}张</text>
							<text v-else-if="g.max_buy_period === 'week' && (g.user_bought_count || 0) > 0">🔔 本周已购{{ g.user_bought_count || 0 }}/{{ g.max_buy_per_user }}张</text>
							<text v-else-if="g.max_buy_period === 'week'">🔔 每周限购{{ g.max_buy_per_user }}张</text>
							<text v-else-if="g.max_buy_period === 'day' && (g.user_bought_count || 0) > 0">🔔 今日已购{{ g.user_bought_count || 0 }}/{{ g.max_buy_per_user }}张</text>
							<text v-else-if="g.max_buy_period === 'day'">🔔 每日限购{{ g.max_buy_per_user }}张</text>
							<text v-else-if="(g.user_bought_count || 0) > 0">🔔 已购{{ g.user_bought_count || 0 }}/{{ g.max_buy_per_user }}张</text>
							<text v-else>🔔 限购{{ g.max_buy_per_user }}张</text>
						</view>
						<view class="goods-footer">
							<view class="goods-price">
								<text class="price-sym">¥</text>
								<text class="price-num">{{ formatPrice(g.price) }}</text>
							</view>
							<view class="goods-buy-btn" :class="g.buyBtnClass" @tap.stop="handleGoodsClick(g)">
								<text>{{ g.actionText }}</text>
							</view>
						</view>
					</view>
				</view>
			</view>

			<view class="empty-box" v-else>
				<text class="empty-icon">🏠</text>
				<text class="empty-text">暂无这类商品</text>
			</view>

			<view style="height: 180rpx;"></view>
		</scroll-view>

		<!-- ========== Tab 2: 次卡/月卡 ========== -->
		<scroll-view class="scroll-area" scroll-y v-if="mainTab === 2">
			<!-- 我的卡包入口 banner -->
			<view class="forest-banner" @tap="goMyCards">
				<view class="banner-moss">
					<text class="banner-emoji">💳</text>
					<view class="banner-info">
						<text class="banner-title">我的卡包</text>
						<text class="banner-sub">查看我的次卡与月卡剩余额度</text>
					</view>
				</view>
				<text class="banner-arrow">›</text>
			</view>
			<view class="subscription-value-note">
				<text class="value-note-title">{{ subscriptionValueTitle }}</text>
				<text class="value-note-sub">{{ subscriptionValueText }}</text>
			</view>

			<!-- 列表 -->
			<view class="section-header">
				<text class="section-title">常来更省的卡包</text>
			</view>

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

			<view class="subscription-list" v-if="displaySubscriptionCards.length > 0">
				<view 
					class="sub-card-item" 
					v-for="card in displaySubscriptionCards"
					:key="card.object_id"
					@tap="buyCard(card)"
				>
					<view class="sub-card-left" :class="card.subscriptionVisualClass">
						<text class="sub-card-type">{{ card.badgeText }}</text>
						<view class="sub-card-val-row">
							<text class="sub-card-limit">{{ card.total_limit }}</text>
							<text class="sub-card-unit">{{ card.unitText }}</text>
						</view>
					</view>
					<view class="sub-card-right">
						<view class="sub-card-name-row">
							<text class="sub-card-name">{{ card.name }}</text>
							<text class="sub-card-recommend" v-if="card.recommendLabel">{{ card.recommendLabel }}</text>
						</view>
						<text class="sub-card-selling">{{ card.sellingPoint }}</text>
						<view class="sub-card-benefits">
							<text class="sub-card-benefit">{{ card.unitPriceText }}</text>
							<text class="sub-card-save" v-if="card.saveText">{{ card.saveText }}</text>
						</view>
						<view class="sub-card-info">
							<text class="info-line">· 可抵扣: {{ card.usageText }}</text>
							<text class="info-line" v-if="card.roomScopeText">· 适用空间: {{ card.roomScopeText }}</text>
							<text class="info-line">· 有效期: {{ card.validity_days }}天</text>
						</view>
						<view class="sub-card-footer">
							<view class="sub-card-price">
								<text class="symbol">¥</text>
								<text class="price">{{ card.priceText }}</text>
								<text class="orig" v-if="card.originalPriceText">¥{{ card.originalPriceText }}</text>
							</view>
							<view class="buy-btn">立即购卡</view>
						</view>
					</view>
				</view>
			</view>

			<view class="empty-box" v-else>
				<text class="empty-icon">🎁</text>
				<text class="empty-text">暂无可购买的卡包</text>
			</view>

			<view style="height: 180rpx;"></view>
		</scroll-view>

		<!-- ========== Tab 3: 积分兑换 ========== -->
		<scroll-view class="scroll-area" scroll-y v-if="mainTab === 3">
			<!-- 积分余额卡片 -->
			<view class="points-card">
				<view class="points-bg">
					<text class="bg-star star-1">✨</text>
					<text class="bg-star star-2">⭐</text>
					<text class="bg-star star-3">🌟</text>
				</view>
				<view class="points-content">
					<view class="points-left">
						<text class="points-label">我的积分</text>
						<view class="points-num-wrap">
							<text class="points-icon">🌟</text>
							<text class="points-num">{{ safeUserInfo.points || 0 }}</text>
						</view>
					</view>
					<view class="points-right">
						<text class="points-tip">{{ pointsMallSummary }}</text>
						<text class="points-value" v-if="pointsValueText">{{ pointsValueText }}</text>
						<view class="points-earn-btn" @tap="goEarnPoints">去签到</view>
					</view>
				</view>
				<view class="points-progress" v-if="nearestPointsGoods && pointsRedeemableCount === 0">
					<view class="points-progress-bar">
						<view class="points-progress-fill" :style="pointsProgressStyle"></view>
					</view>
					<text class="points-progress-text">{{ pointsProgressText }}</text>
				</view>
			</view>

			<view class="points-filter-bar" v-if="pointsGoods.length > 0">
				<view
					class="points-filter"
					v-for="filter in pointsFilters"
					:key="filter.value"
					:class="pointsFilter === filter.value ? 'active' : ''"
					@tap="setPointsFilter(filter.value)"
				>
					<text>{{ filter.name }}</text>
					<text class="points-filter-count" v-if="filter.count > 0">{{ filter.count }}</text>
				</view>
			</view>

			<view class="points-section-heading" v-if="pointsGoods.length > 0">
				<text class="points-section-title">{{ pointsSectionTitle }}</text>
				<text class="points-section-count">{{ filteredPointsGoods.length }} 件</text>
			</view>

			<!-- 积分商品列表 -->
			<view class="points-goods-list" v-if="filteredPointsGoods.length > 0">
				<view
					class="goods-card points-goods-card"
					v-for="g in filteredPointsGoods"
					:key="g.object_id"
					:class="g.lockedClass"
					@click="handlePointsGoodsClick(g)"
				>
					<view class="goods-img-wrap">
						<text class="goods-emoji">{{ getGoodsEmoji(g) }}</text>
						<view class="goods-tag points" v-if="g.exchange_type === 2">
							<text>🌟 纯积分</text>
						</view>
						<view class="goods-tag mixed" v-else-if="g.exchange_type === 3">
							<text>🌟 积分加购</text>
						</view>
						<view class="lock-mask" v-if="g.locked">
							<text class="lock-icon">🔮</text>
							<text class="lock-text">等级不足</text>
						</view>
						<view class="corner-leaf leaf-tl">🌿</view>
						<view class="corner-leaf leaf-br">🍃</view>
					</view>
					<view class="goods-body">
						<text class="goods-name">{{ g.name }}</text>
						<text class="goods-desc" v-if="g.description">{{ g.description }}</text>
						<text class="points-status" :class="g.pointsStatusClass" v-if="g.pointsStatusText">{{ g.pointsStatusText }}</text>
						<view class="limit-badge" v-if="g.max_buy_per_user > 0">
							<text v-if="g.max_buy_period === 'month' && (g.user_bought_count || 0) > 0">🔔 本月已购{{ g.user_bought_count || 0 }}/{{ g.max_buy_per_user }}张</text>
							<text v-else-if="g.max_buy_period === 'month'">🔔 每月限购{{ g.max_buy_per_user }}张</text>
							<text v-else-if="g.max_buy_period === 'week' && (g.user_bought_count || 0) > 0">🔔 本周已购{{ g.user_bought_count || 0 }}/{{ g.max_buy_per_user }}张</text>
							<text v-else-if="g.max_buy_period === 'week'">🔔 每周限购{{ g.max_buy_per_user }}张</text>
							<text v-else-if="g.max_buy_period === 'day' && (g.user_bought_count || 0) > 0">🔔 今日已购{{ g.user_bought_count || 0 }}/{{ g.max_buy_per_user }}张</text>
							<text v-else-if="g.max_buy_period === 'day'">🔔 每日限购{{ g.max_buy_per_user }}张</text>
							<text v-else-if="(g.user_bought_count || 0) > 0">🔔 已购{{ g.user_bought_count || 0 }}/{{ g.max_buy_per_user }}张</text>
							<text v-else>🔔 限购{{ g.max_buy_per_user }}张</text>
						</view>
						<view class="goods-footer">
							<view class="goods-price points-price">
								<text class="p-icon">🌟</text>
								<text class="p-num">{{ g.points_price || 0 }}</text>
								<text class="p-unit">积分</text>
								<text class="cash-plus" v-if="g.exchange_type === 3">+¥{{ formatPrice(g.price) }}</text>
							</view>
							<view class="goods-buy-btn" :class="g.buyBtnClass" @tap.stop="handlePointsGoodsAction(g)">
								<text>{{ g.actionText }}</text>
							</view>
						</view>
					</view>
				</view>
			</view>

			<view class="empty-box compact" v-else-if="pointsGoods.length > 0">
				<text class="empty-icon">✨</text>
				<text class="empty-text">{{ pointsFilterEmptyText }}</text>
				<view class="empty-actions">
					<view class="empty-action" @tap="setPointsFilter('all')">查看全部</view>
					<view class="empty-action primary" @tap="goEarnPoints">去攒积分</view>
				</view>
			</view>

			<view class="empty-box" v-else>
				<text class="empty-icon">🌙</text>
				<text class="empty-text">暂无可兑换商品</text>
			</view>

			<view style="height: 180rpx;"></view>
		</scroll-view>

		<!-- 自定义底部导航 -->
		<custom-tab-bar></custom-tab-bar>
	</view>
</template>

<script>
import { mapState, mapActions } from 'vuex';
import AUTH from '../../utils/auth.js';
import SUBSCRIPTION from '../../utils/subscription.js';
import customTabBar from '@/custom-tab-bar/index.vue';

export default {
	components: { customTabBar },
	computed: {
		...mapState(['hasLogin', 'token', 'userInfo']),
		safeUserInfo() {
			return this.userInfo || { points: 0, member_level: 0 };
		},
		claimableCoupons() {
			return this.couponList.filter(item => this.isCouponClaimable(item));
		},
		filteredGoods() {
			const nonRecharge = this.goodsList
				.filter(g => g.goods_type !== 1 && g.exchange_type === 1)
				.map(g => this.buildCashGoodsCard(g));
			if (this.subTab === 0) {
				return nonRecharge;
			}
			const typeMap = { 1: 2, 2: 3, 3: 4, 4: 5 };
			return nonRecharge.filter(g => g.goods_type === typeMap[this.subTab]);
		},
		pointsGoods() {
			const currentPoints = Number(this.safeUserInfo.points || 0);
			return this.goodsList
				.filter(g => g.goods_type !== 1 && (g.exchange_type === 2 || g.exchange_type === 3))
				.map(g => this.buildPointsGoodsCard(g, currentPoints))
				.sort((a, b) => {
					if (a.canExchange !== b.canExchange) return a.canExchange ? -1 : 1;
					if (a.soldOut !== b.soldOut) return a.soldOut ? 1 : -1;
					if (a.locked !== b.locked) return a.locked ? 1 : -1;
					if (a.pointsShortfall !== b.pointsShortfall) return a.pointsShortfall - b.pointsShortfall;
					if (a.exchange_type !== b.exchange_type) return a.exchange_type - b.exchange_type;
					return Number(a.points_price || 0) - Number(b.points_price || 0);
				});
		},
		pointsRedeemableCount() {
			return this.pointsGoods.filter(g => g.canExchange).length;
		},
		nearestPointsGoods() {
			return this.pointsGoods.find(g => !g.locked && !g.soldOut && !g.limitReached) || null;
		},
		pointsProgressStyle() {
			if (!this.nearestPointsGoods) return 'width: 0%;';
			const need = Math.max(1, Number(this.nearestPointsGoods.points_price || 0));
			const current = Math.max(0, Number(this.safeUserInfo.points || 0));
			const percent = Math.max(4, Math.min(100, Math.round(current * 100 / need)));
			return 'width: ' + percent + '%;';
		},
		pointsProgressText() {
			if (!this.nearestPointsGoods) return '';
			return '最近可兑「' + this.nearestPointsGoods.name + '」，还差 ' + this.nearestPointsGoods.pointsShortfall + ' 积分';
		},
		pointsFilters() {
			return [
				{ name: '全部', value: 'all', count: this.pointsGoods.length },
				{ name: '现在能换', value: 'ready', count: this.pointsRedeemableCount },
				{ name: '纯积分', value: 'points', count: this.pointsGoods.filter(g => g.exchange_type === 2).length },
				{ name: '积分加购', value: 'mixed', count: this.pointsGoods.filter(g => g.exchange_type === 3).length },
			];
		},
		filteredPointsGoods() {
			if (this.pointsFilter === 'ready') return this.pointsGoods.filter(g => g.canExchange);
			if (this.pointsFilter === 'points') return this.pointsGoods.filter(g => g.exchange_type === 2);
			if (this.pointsFilter === 'mixed') return this.pointsGoods.filter(g => g.exchange_type === 3);
			return this.pointsGoods;
		},
		pointsSectionTitle() {
			const names = {
				all: '为你推荐',
				ready: '现在就能兑换',
				points: '不花现金的好礼',
				mixed: '积分加购专区',
			};
			return names[this.pointsFilter] || names.all;
		},
		pointsFilterEmptyText() {
			if (this.pointsFilter === 'ready') return '当前还没有能直接兑换的商品';
			if (this.pointsFilter === 'points') return '暂无纯积分商品';
			if (this.pointsFilter === 'mixed') return '暂无积分加购商品';
			return '暂无符合条件的商品';
		},
		pointsMallSummary() {
			if (this.pointsRedeemableCount > 0) return '现在可兑换 ' + this.pointsRedeemableCount + ' 件好礼';
			const nearest = this.nearestPointsGoods;
			if (nearest && nearest.pointsShortfall > 0) return '距「' + nearest.name + '」还差 ' + nearest.pointsShortfall + ' 积分';
			return '签到和到店消费都能攒积分';
		},
		pointsValueText() {
			const points = Number(this.safeUserInfo.points || 0);
			const pointsToFen = Number((this.safeUserInfo.points_config && this.safeUserInfo.points_config.points_to_fen) || 1);
			if (points <= 0 || pointsToFen <= 0) return '';
			return '积分约值 ¥' + (points * pointsToFen / 100).toFixed(2);
		},
		subscriptionTargetTabs() {
			const tabs = [
				{ name: '大厅卡', desc: '同行也能用', value: 1 },
				{ name: '包厢卡', desc: '抵独立包厢房费', value: 2 },
			];
			return tabs.filter(tab => this.subscriptionCards.some(card => this.getSubscriptionTargetType(card) === tab.value));
		},
		subscriptionValueTitle() {
			return this.subscriptionTargetType === 2 ? '包厢卡只卖真实省下的钱' : '大厅卡可以和朋友一起用';
		},
		subscriptionValueText() {
			if (this.subscriptionTargetType === 2) return '仅抵包厢小时费，适用空间会逐一标明；低价卡座不混在原价里计算优惠。';
			return '同一订单可抵多张大厅票，3人同行也能一次使用3次额度。';
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
			subTab: 0,
			pointsFilter: 'all',
			subscriptionTargetType: 0,
			mainTabs: [
				{ name: '省钱卡', emoji: '💳', badge: 0, value: 2 },
				{ name: '积分好礼', emoji: '🌟', badge: 0, value: 3 },
				{ name: '领券', emoji: '🎟️', badge: 0, value: 0 },
				{ name: '好物', emoji: '🏠', badge: 0, value: 1 },
			],
			subTabs: [
				{ name: '全部', emoji: '🏠' },
				{ name: '美味小食', emoji: '🍿' },
				{ name: '主题布置', emoji: '🎈' },
				{ name: '游戏周边', emoji: '🎲' },
				{ name: '惊喜盲盒', emoji: '🎁' },
			],
			couponList: [],
			goodsList: [],
			subscriptionCards: [],
			hasAutoSelectedTab: false,
			receivingCouponId: '',
			subscriptionViewLastTrackedAt: 0,
			goodsEmojis: ['🍿', '🍰', '🧋', '🍟', '🍪', '🎈', '🌸', '🕯️', '🎂', '🎊', '🎲', '🎯', '🃏', '🧩', '🎁', '🧸', '📿', '🔮'],
		};
	},
	onShow() {
		uni.$emit('tabBarChange', { key: 'voucher' });
		this.applyInitialTab();
		this.refreshMall();
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
			var initialTab = uni.getStorageSync('voucherInitialTab');
			if (!initialTab) return;
			uni.removeStorageSync('voucherInitialTab');
			if (initialTab === 'points') {
				this.mainTab = 3;
				this.hasAutoSelectedTab = true;
			} else if (initialTab === 'shop') {
				this.mainTab = 1;
				this.hasAutoSelectedTab = true;
			} else if (initialTab === 'coupon') {
				this.mainTab = 0;
				this.hasAutoSelectedTab = true;
			} else if (initialTab === 'subscription') {
				this.mainTab = 2;
				this.hasAutoSelectedTab = true;
			}
		},
		async loadAll() {
			await Promise.all([this.loadCoupons(), this.loadGoods(), this.loadSubscriptionCards()]);
			this.selectInitialTab();
		},
		async loadCoupons() {
			try {
				const res = await AUTH.getCouponList(this.token);
				if (res._status === 0) {
					this.couponList = res.data || [];
					const unused = this.couponList.filter(i => this.isCouponClaimable(i));
					this.setMainTabBadge(0, unused.length);
				}
			} catch (e) {}
		},
		async loadGoods() {
			try {
				const res = await AUTH.getGoodsList(this.token);
				if (res._status === 0) {
					this.goodsList = res.data && res.data.goods || [];
					this.setMainTabBadge(3, this.pointsRedeemableCount);
				}
			} catch (e) {}
		},
		async loadSubscriptionCards() {
			try {
				const res = await AUTH.getSubscriptionCards(this.token);
				if (res._status === 0) {
					this.subscriptionCards = res.data || [];
					if (!this.subscriptionTargetType && this.subscriptionCards.length > 0) {
						this.subscriptionTargetType = this.getSubscriptionTargetType(this.subscriptionCards[0]) || 0;
					}
					this.trackSubscriptionMallView();
				}
			} catch (e) {}
		},
		switchMainTab(idx) {
			this.mainTab = idx;
			this.hasAutoSelectedTab = true;
			if (idx === 1 || idx === 3) {
				this.loadGoods();
			} else if (idx === 2) {
				this.loadSubscriptionCards();
			}
		},
		setMainTabBadge(value, badge) {
			const tab = this.mainTabs.find(item => item.value === value);
			if (tab) tab.badge = Number(badge) || 0;
		},
		setPointsFilter(value) {
			this.pointsFilter = value;
			AUTH.trackEvent({
				event: 'points_mall_filter_click',
				page_path: 'pages/voucher/voucher',
				source: 'points_mall',
				filter: value,
			}, this.token).catch(() => {});
		},
		goEarnPoints() {
			AUTH.trackEvent({
				event: 'points_mall_earn_click',
				page_path: 'pages/voucher/voucher',
				source: 'points_mall',
			}, this.token).catch(() => {});
			uni.switchTab({ url: '/pages/user/user' });
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
		buyCard(card) {
			AUTH.trackEvent({
				event: 'subscription_card_click',
				page_path: 'pages/voucher/voucher',
				source: 'voucher_mall',
				card_id: card.object_id,
				item_key: card.analyticsKey,
				target_type: this.getSubscriptionTargetType(card)
			}, this.token).catch(function() {});
			uni.navigateTo({ url: '/pages/user/subscription/buy?source=voucher_mall&card_id=' + card.object_id });
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
		isMonthlySubscription(card) {
			return card && this.getSubscriptionTargetType(card) === 1 && Number(card.validity_days) <= 31 && Number(card.total_limit) >= 16;
		},
		getSubscriptionVisualClass(card) {
			if (this.getSubscriptionTargetType(card) === 2) return 'room';
			return this.isMonthlySubscription(card) ? 'monthly' : 'times';
		},
		getSubscriptionBadge(card) {
			if (!card) return '卡包';
			if (this.getSubscriptionTargetType(card) === 2) return '小时卡';
			return this.isMonthlySubscription(card) ? '月卡' : '次卡';
		},
		getSubscriptionUnit(card) {
			return SUBSCRIPTION.getCardUnit(card);
		},
		getSubscriptionUsageText(card) {
			if (!card) return '';
			return SUBSCRIPTION.getCardUsageText(card);
		},
		getSubscriptionRecommendationLabel(card, cards) {
			if (!card) return '';
			const targetType = this.getSubscriptionTargetType(card);
			const totalLimit = Number(card.total_limit);
			if (targetType === 1) {
				if (totalLimit === 3) return '轻量入门';
				if (totalLimit === 10) return '常客推荐';
				if (totalLimit >= 16) return '多人更省';
			}
			if (targetType === 2) {
				const roomCards = (cards || []).filter(item => this.getSubscriptionTargetType(item) === 2);
				const minLimit = roomCards.reduce((min, item) => Math.min(min, Number(item.total_limit) || 9999), 9999);
				if (totalLimit === minLimit) return '低门槛体验';
				if (totalLimit === 20) return '固定小队推荐';
			}
			return '';
		},
		getSubscriptionUnitPriceText(card) {
			if (!card || !card.total_limit) return '';
			const price = Number(card.price) || 0;
			const totalLimit = Number(card.total_limit) || 0;
			if (price <= 0 || totalLimit <= 0) return '';
			const unit = this.getSubscriptionUnit(card);
			const amount = price / totalLimit / 100;
			const text = amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(1);
			return '折合 ¥' + text + '/' + unit;
		},
		getSubscriptionSaveText(card) {
			if (!card || !card.original_price) return '';
			const originalPrice = Number(card.original_price) || 0;
			const price = Number(card.price) || 0;
			if (originalPrice <= price) return '';
			const save = (originalPrice - price) / 100;
			const text = save % 1 === 0 ? save.toFixed(0) : save.toFixed(1);
			return '省 ¥' + text;
		},
		getSubscriptionSellingPoint(card) {
			const targetType = this.getSubscriptionTargetType(card);
			const totalLimit = Number(card && card.total_limit) || 0;
			if (targetType === 2) {
				if (totalLimit <= 4) return '先小额体验，确认常来再升级';
				if (totalLimit <= 10) return '常约独立包厢，单次房费更低';
				if (totalLimit <= 20) return '固定小队多次组局更合适';
				return '适合社群活动和长期固定组局';
			}
			if (totalLimit <= 3) return '3人同行也能在一单内抵完';
			if (totalLimit <= 10) return '一张卡可在同一订单抵多张门票';
			return '高频到店或固定小队，单次最省';
		},
		getSubscriptionRoomScopeText(card) {
			if (this.getSubscriptionTargetType(card) !== 2) return '';
			const rooms = Array.isArray(card.usable_rooms) ? card.usable_rooms : [];
			if (rooms.length === 0) return '全部预约空间';
			return rooms.map(room => room && room.name || '').filter(Boolean).join('、');
		},
		getSubscriptionAnalyticsKey(card) {
			const prefix = this.getSubscriptionTargetType(card) === 2 ? 'room' : 'hall';
			return prefix + '_' + (Number(card && card.total_limit) || 0);
		},
		formatSubscriptionPrice(fen) {
			const amount = (Number(fen) || 0) / 100;
			return amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(1);
		},
		buildSubscriptionCardView(card, cards) {
			return Object.assign({}, card, {
				subscriptionVisualClass: this.getSubscriptionVisualClass(card),
				badgeText: this.getSubscriptionBadge(card),
				unitText: this.getSubscriptionUnit(card),
				recommendLabel: this.getSubscriptionRecommendationLabel(card, cards),
				sellingPoint: this.getSubscriptionSellingPoint(card),
				unitPriceText: this.getSubscriptionUnitPriceText(card),
				saveText: this.getSubscriptionSaveText(card),
				usageText: this.getSubscriptionUsageText(card),
				roomScopeText: this.getSubscriptionRoomScopeText(card),
				analyticsKey: this.getSubscriptionAnalyticsKey(card),
				priceText: this.formatSubscriptionPrice(card.price),
				originalPriceText: Number(card.original_price) > Number(card.price) ? this.formatSubscriptionPrice(card.original_price) : ''
			});
		},
		selectInitialTab() {
			if (this.hasAutoSelectedTab) return;
			if (this.subscriptionCards.length > 0) {
				this.mainTab = 2;
			} else if (this.pointsGoods.length > 0) {
				this.mainTab = 3;
			} else if (this.claimableCoupons.length > 0) {
				this.mainTab = 0;
			} else if (this.filteredGoods.length > 0) {
				this.mainTab = 1;
			}
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

		async receiveCoupon(item) {
			if (!this.isCouponClaimable(item)) return;
			if (this.receivingCouponId) return;
			if (!this.hasLogin) {
				this.promptLogin('请先登录再领取优惠券', () => {
					this.receiveCoupon(item);
				});
				return;
			}
			this.receivingCouponId = item.campaign_id;
			this.trackCouponEvent('coupon_receive_click', item);
			uni.showLoading({ title: '领取中...' });
			try {
				const res = await AUTH.receiveCoupon(this.token, item.campaign_id);
				uni.hideLoading();
				if (res._status === 0) {
					this.trackCouponEvent('coupon_receive_success', item);
					await this.loadCoupons();
					this.showCouponSuccessActions(item, res.data || {});
				} else {
					this.trackCouponEvent('coupon_receive_failed', item, { reason: res._reason || '领取失败' });
					uni.showToast({ title: res._reason || '领取失败', icon: 'none' });
				}
			} catch (e) {
				uni.hideLoading();
				this.trackCouponEvent('coupon_receive_failed', item, { reason: 'request_failed' });
				uni.showToast({ title: '领取失败', icon: 'none' });
			} finally {
				this.receivingCouponId = '';
			}
		},

		isCouponClaimable(item) {
			if (!item) return false;
			if (item.can_receive === false) return false;
			if (item.user_received) return false;
			return item.remaining_count !== 0;
		},

		getCouponButtonText(item) {
			if (this.receivingCouponId === item.campaign_id) return '领取中';
			if (!this.isCouponClaimable(item)) return item.receive_status_text || (item.remaining_count === 0 ? '已领完' : '已领取');
			return '领券';
		},

		trackCouponEvent(event, item, extra) {
			const data = Object.assign({
				event: event,
				page_path: 'pages/voucher/voucher',
				source: 'voucher_coupon',
				campaign_id: item && item.campaign_id,
				coupon_id: item && item.object_id,
				coupon_type: item && item.coupon_type,
			}, extra || {});
			AUTH.trackEvent(data, this.token).catch(() => {});
		},

		showCouponSuccessActions(item, data) {
			const name = (data && data.coupon_name) || (item && item.name) || '优惠券';
			const couponType = (data && data.coupon_type) || (item && item.coupon_type);
			if (couponType === 'gift') {
				uni.showModal({
					title: '领取成功',
					content: name + ' 已领取，奖励已到账。',
					confirmText: '知道了',
					showCancel: false
				});
				return;
			}
			uni.showModal({
				title: '领取成功',
				content: name + ' 已放入你的券包，下单时会自动展示可用券。',
				confirmText: '去使用',
				cancelText: '继续领',
				success: (modalRes) => {
					if (modalRes.confirm) {
						this.openCouponUseSheet(item, 'receive_success');
					}
				}
			});
		},

		openCouponUseSheet(item, source) {
			this.trackCouponEvent('coupon_use_entry_click', item, { entry_source: source || 'coupon' });
			uni.showActionSheet({
				itemList: ['预约包厢', '买大厅票', '查看我的券'],
				success: (res) => {
					if (res.tapIndex === 0) {
						uni.switchTab({ url: '/pages/tabBar/appoint/appoint' });
					} else if (res.tapIndex === 1) {
						uni.navigateTo({ url: '/pages/ticket/buy' });
					} else if (res.tapIndex === 2) {
						uni.navigateTo({ url: '/pages/my/coupons/coupons?tab=unused' });
					}
				}
			});
		},

		handleGoodsClick(g) {
			if (g.soldOut) {
				uni.showToast({ title: '这件商品已售罄', icon: 'none' });
				return;
			}
			if (g.limitReached) {
				uni.showToast({ title: '本期限购数量已用完', icon: 'none' });
				return;
			}
			if (g.locked) {
				uni.showToast({ title: '会员等级不足，暂不能购买', icon: 'none' });
				return;
			}
			uni.navigateTo({ url: '/pages/voucher/detail?data=' + encodeURIComponent(JSON.stringify(g)) });
		},

		handlePointsGoodsClick(g) {
			if (g.soldOut) {
				uni.showToast({ title: '这件商品已经兑完了', icon: 'none' });
				return;
			}
			if (g.limitReached) {
				uni.showToast({ title: '本期限购数量已用完', icon: 'none' });
				return;
			}
			if (this.isLocked(g)) {
				uni.showToast({ title: '会员等级不足，无法兑换', icon: 'none' });
				return;
			}
			uni.navigateTo({ url: '/pages/voucher/detail?data=' + encodeURIComponent(JSON.stringify(g)) });
		},
		handlePointsGoodsAction(g) {
			if (g.pointsShortfall > 0 && !g.locked && !g.soldOut && !g.limitReached) {
				uni.switchTab({ url: '/pages/user/user' });
				return;
			}
			this.handlePointsGoodsClick(g);
		},

		getGoodsEmoji(g) {
			const typeEmojis = {
				1: '💎',   // 储值（历史兼容，不展示）
				2: '🍿',   // 美味小食
				3: '🎈',   // 主题布置
				4: '🎲',   // 游戏周边
				5: '🎁',   // 惊喜盲盒
			};
			return typeEmojis[g.goods_type] || this.goodsEmojis[Math.abs((g.object_id || '').charCodeAt(0) || 0) % this.goodsEmojis.length];
		},

		isLocked(g) {
			const memberLevel = this.safeUserInfo.member_level || 0;
			return (g.member_level_required || 0) > memberLevel;
		},

		buildPointsGoodsCard(g, currentPoints) {
			const locked = this.isLocked(g);
			const soldOut = Number(g.stock) === 0;
			const limitReached = Number(g.max_buy_per_user || 0) > 0 && Number(g.user_bought_count || 0) >= Number(g.max_buy_per_user);
			const pointsShortfall = Math.max(0, Number(g.points_price || 0) - currentPoints);
			const canExchange = !locked && !soldOut && !limitReached && pointsShortfall === 0;
			let pointsStatusText = '';
			let pointsStatusClass = '';
			let actionText = '立即兑换';
			let buyBtnClass = '';
			if (soldOut) {
				pointsStatusText = '本期已兑完';
				pointsStatusClass = 'sold-out';
				actionText = '已兑完';
				buyBtnClass = 'disabled';
			} else if (limitReached) {
				pointsStatusText = '本期限购已达上限';
				pointsStatusClass = 'sold-out';
				actionText = '已达上限';
				buyBtnClass = 'disabled';
			} else if (locked) {
				pointsStatusText = '需 ' + this.getMemberLevelName(g.member_level_required) + ' 及以上';
				pointsStatusClass = 'shortfall';
				actionText = '等级不足';
				buyBtnClass = 'disabled';
			} else if (pointsShortfall > 0) {
				pointsStatusText = '还差 ' + pointsShortfall + ' 积分';
				pointsStatusClass = 'shortfall';
				actionText = '去攒积分';
				buyBtnClass = 'subtle';
			} else {
				pointsStatusText = '现在就能兑换';
				pointsStatusClass = 'ready';
			}
			return Object.assign({}, g, {
				locked: locked,
				soldOut: soldOut,
				limitReached: limitReached,
				canExchange: canExchange,
				pointsShortfall: pointsShortfall,
				pointsStatusText: pointsStatusText,
				pointsStatusClass: pointsStatusClass,
				actionText: actionText,
				lockedClass: locked || soldOut || limitReached ? 'locked' : '',
				buyBtnClass: buyBtnClass,
			});
		},

		buildCashGoodsCard(g) {
			const locked = this.isLocked(g);
			const soldOut = Number(g.stock) === 0;
			const limitReached = Number(g.max_buy_per_user || 0) > 0 && Number(g.user_bought_count || 0) >= Number(g.max_buy_per_user);
			let purchaseStatusText = '';
			let buyBtnClass = '';
			let actionText = '购买';
			if (soldOut) {
				purchaseStatusText = '本期已售罄';
				actionText = '已售罄';
				buyBtnClass = 'disabled';
			} else if (limitReached) {
				purchaseStatusText = '本期限购已达上限';
				actionText = '已达上限';
				buyBtnClass = 'disabled';
			} else if (locked) {
				purchaseStatusText = '需 ' + this.getMemberLevelName(g.member_level_required) + ' 及以上';
				actionText = '等级不足';
				buyBtnClass = 'disabled';
			}
			return Object.assign({}, g, {
				locked: locked,
				soldOut: soldOut,
				limitReached: limitReached,
				purchaseStatusText: purchaseStatusText,
				actionText: actionText,
				lockedClass: locked || soldOut || limitReached ? 'locked' : '',
				buyBtnClass: buyBtnClass,
			});
		},

		getMemberLevelName(level) {
			const names = ['魔法学徒', '霜银法师', '烈金大魔导士', '超位大导师'];
			return names[Number(level) || 0] || ('Lv.' + level);
		},

		formatPrice(price) {
			const amount = (price || 0) / 100;
			return amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(1);
		},

		getCouponValue(item) {
			const rules = item.rules || {};
			if (item.coupon_type === 'rebate') return (rules.discount || 0) / 100;
			if (item.coupon_type === 'discount') return Math.round((rules.discount_rate || 1) * 100) / 10 + '折';
			return rules.gift_value || '-';
		},

		getCouponUnit(item) {
			if (item.coupon_type === 'rebate') return '元';
			if (item.coupon_type === 'discount') return '';
			return '积分';
		},

		getCouponDesc(item) {
			const rules = item.rules || {};
			if (item.coupon_type === 'rebate') {
				const min = rules.min_amount || 0;
				return min > 0 ? '满' + (min / 100) + '元可用' : '无门槛';
			}
			if (item.coupon_type === 'discount') return '折扣券';
			return item.description || '';
		},
	},
};
</script>

<style lang="scss" scoped>
$wood: #E8784A;
$wood-light: #FFB88C;
$forest: #7CB342;
$forest-light: #AED581;
$sky: #64B5F6;
$sky-light: #90CAF9;
$sakura: #F48FB1;
$sakura-light: #F8BBD0;
$cream: #FDF8F0;
$cream-dark: #F5EDE0;
$bark: #4A3728;
$bark-light: #6D5A48;

page, .page {
	height: 100vh;
	background-color: #FDF6E9;
	background-image: repeating-linear-gradient(
		0deg,
		transparent,
		transparent 3rpx,
		rgba(139, 90, 43, 0.025) 3rpx,
		rgba(139, 90, 43, 0.025) 6rpx
	);
	display: flex;
	flex-direction: column;
}

/* ===== 手绘风顶部 ===== */
.header {
	position: relative;
	background: linear-gradient(180deg, #FFF8E7 0%, $cream 100%);
	padding: 32rpx 0 24rpx;
	text-align: center;
	flex-shrink: 0;
	overflow: hidden;
	.header-title {
		font-size: 40rpx;
		font-weight: bold;
		color: $bark;
		letter-spacing: 4rpx;
		display: block;
		position: relative;
		z-index: 2;
	}
	.header-sub {
		font-size: 24rpx;
		color: $bark-light;
		margin-top: 8rpx;
		display: block;
		position: relative;
		z-index: 2;
	}
	.cloud {
		position: absolute;
		font-size: 48rpx;
		opacity: 0.35;
		z-index: 1;
		animation: drift 8s ease-in-out infinite;
	}
	.cloud-1 { top: 16rpx; right: 40rpx; }
	.cloud-2 { top: 40rpx; left: 30rpx; font-size: 36rpx; animation-delay: -3s; }
	.leaf {
		position: absolute;
		font-size: 32rpx;
		opacity: 0.3;
		z-index: 1;
		animation: sway 4s ease-in-out infinite;
	}
	.leaf-1 { top: 20rpx; left: 120rpx; animation-delay: -1s; }
	.leaf-2 { bottom: 10rpx; right: 100rpx; font-size: 28rpx; animation-delay: -2s; }
}

@keyframes drift {
	0%, 100% { transform: translateX(0); }
	50% { transform: translateX(12rpx); }
}
@keyframes sway {
	0%, 100% { transform: rotate(-5deg); }
	50% { transform: rotate(5deg); }
}

/* ===== 主 Tab ===== */
.main-tabs {
	display: flex;
	background: #FFF;
	flex-shrink: 0;
	padding: 0 16rpx;
	border-bottom: 2rpx solid $cream-dark;
	box-shadow: 0 2rpx 8rpx rgba(74,55,40,0.04);
}
.main-tab {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-direction: column;
	gap: 4rpx;
	padding: 20rpx 0 16rpx;
	position: relative;
	.tab-emoji { font-size: 32rpx; }
	.tab-name { font-size: 24rpx; color: $bark-light; transition: all 0.25s; }
	&.active .tab-name { color: $wood; font-weight: bold; }
	.tab-underline {
		position: absolute;
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 48rpx;
		height: 6rpx;
		background: linear-gradient(90deg, $wood-light, $wood);
		border-radius: 6rpx;
	}
	.tab-dot {
		position: absolute;
		top: 8rpx;
		right: calc(50% - 44rpx);
		background: $sakura;
		border-radius: 20rpx;
		min-width: 28rpx;
		height: 28rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 6rpx;
		font-size: 16rpx;
		color: #FFF;
		font-weight: bold;
	}
}

/* ===== 滚动区 ===== */
.scroll-area {
	flex: 1;
	overflow: hidden;
}

.shop-intro {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin: 20rpx 24rpx 0;
	padding: 20rpx 22rpx;
	background: #FFF;
	border: 2rpx solid rgba(160, 120, 80, 0.12);
	border-radius: 14rpx;
	.shop-intro-title { display: block; font-size: 28rpx; font-weight: bold; color: $bark; }
	.shop-intro-sub { display: block; margin-top: 5rpx; font-size: 21rpx; color: $bark-light; }
	.shop-intro-count { font-size: 22rpx; color: $wood; font-weight: bold; white-space: nowrap; }
}

/* ===== 森林 Banner ===== */
.forest-banner {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin: 20rpx 24rpx;
	padding: 28rpx 24rpx;
	background: linear-gradient(135deg, #E8F5E9, #FFF8E1);
	border-radius: 22rpx 26rpx 24rpx 20rpx / 24rpx 20rpx 26rpx 22rpx;
	border: 2rpx solid rgba(124,179,66,0.18);
	box-shadow: 0 10rpx 28rpx rgba(160, 120, 80, 0.08), 0 2rpx 6rpx rgba(160, 120, 80, 0.04);
	position: relative;
	overflow: hidden;
	&:active { opacity: 0.9; transform: scale(0.99); }
	&::before {
		content: '🌿';
		position: absolute;
		bottom: -8rpx;
		right: 20rpx;
		font-size: 60rpx;
		opacity: 0.12;
	}
	.banner-moss {
		display: flex;
		align-items: center;
		gap: 16rpx;
	}
	.banner-emoji { font-size: 56rpx; }
	.banner-info {
		display: flex;
		flex-direction: column;
		gap: 4rpx;
	}
	.banner-title { font-size: 30rpx; font-weight: bold; color: $bark; }
	.banner-sub { font-size: 22rpx; color: $bark-light; }
	.banner-arrow { font-size: 40rpx; opacity: 0.5; }
}

/* ===== 区块标题 ===== */
.section-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 20rpx 24rpx 12rpx;
	.section-title { font-size: 30rpx; font-weight: bold; color: $bark; }
	.section-more { font-size: 24rpx; color: $bark-light; }
}

/* ===== 优惠券列表 ===== */
.coupon-list {
	padding: 0 24rpx;
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}
.coupon-card {
	display: flex;
	background: #FFF;
	border-radius: 22rpx 26rpx 24rpx 20rpx / 24rpx 22rpx 26rpx 20rpx;
	overflow: hidden;
	box-shadow: 0 10rpx 28rpx rgba(160, 120, 80, 0.08), 0 2rpx 6rpx rgba(160, 120, 80, 0.04);
	border: 2rpx solid rgba(160, 120, 80, 0.12);
	position: relative;

	.c-left {
		width: 200rpx;
		background: linear-gradient(135deg, $forest-light, $forest);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 24rpx 12rpx;
		flex-shrink: 0;
		position: relative;
		.c-value { display: flex; align-items: baseline; gap: 2rpx; }
		.c-sym { font-size: 22rpx; color: #FFF; }
		.c-num { font-size: 48rpx; font-weight: bold; color: #FFF; }
		.c-desc { font-size: 20rpx; color: rgba(255,255,255,0.9); margin-top: 6rpx; text-align: center; }
		.c-leaf {
			position: absolute;
			bottom: 8rpx;
			right: 8rpx;
			font-size: 28rpx;
			opacity: 0.35;
		}
	}

	.c-right {
		flex: 1;
		padding: 20rpx;
		display: flex;
		flex-direction: column;
		gap: 6rpx;
		.c-name { font-size: 28rpx; font-weight: bold; color: $bark; }
		.c-expire { font-size: 22rpx; color: $bark-light; margin-top: auto; }
		.c-btn {
			margin: 10rpx 0 0 auto;
			padding: 0;
			width: 132rpx;
			height: 56rpx;
			line-height: 56rpx;
			background: linear-gradient(135deg, $wood-light, $wood);
			color: #FFF;
			font-size: 24rpx;
			font-weight: bold;
			border-radius: 30rpx;
			text-align: center;
			align-self: flex-start;
			box-shadow: 0 4rpx 12rpx rgba(232,120,74,0.25);
			&:active {
				animation: btnPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
			}
			&[disabled] { background: #D0C8C0; box-shadow: none; }
			&::after { border: none; }
		}
	}
}

/* ===== 手绘风分类胶囊 ===== */
.category-pills {
	display: flex;
	flex-wrap: wrap;
	padding: 20rpx 24rpx 12rpx;
	gap: 16rpx;
}
.pill {
	display: flex;
	align-items: center;
	gap: 8rpx;
	padding: 14rpx 24rpx;
	background: #FFF;
	border-radius: 40rpx;
	border: 2rpx solid $cream-dark;
	box-shadow: 0 2rpx 8rpx rgba(74,55,40,0.04);
	transition: all 0.25s;
	.pill-emoji { font-size: 28rpx; }
	.pill-name { font-size: 24rpx; color: $bark-light; }
	&.active {
		background: linear-gradient(135deg, $wood-light, $wood);
		border-color: transparent;
		box-shadow: 0 4rpx 16rpx rgba(232,120,74,0.25);
		.pill-name { color: #FFF; font-weight: bold; }
	}
	&:active { transform: scale(0.95); }
}

/* ===== 商品网格 ===== */
.goods-grid {
	padding: 20rpx 24rpx;
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 20rpx;
}
.points-goods-list {
	padding: 0 24rpx 20rpx;
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}
.goods-card {
	background: #FFF;
	border-radius: 22rpx 26rpx 20rpx 28rpx / 26rpx 22rpx 28rpx 24rpx;
	overflow: hidden;
	box-shadow: 0 10rpx 28rpx rgba(160, 120, 80, 0.08), 0 2rpx 6rpx rgba(160, 120, 80, 0.04);
	border: 2rpx solid rgba(160, 120, 80, 0.12);
	transition: transform 0.25s, box-shadow 0.25s;
	position: relative;
	&:active { transform: scale(0.97); }
	&.locked { opacity: 0.55; }
	&::before {
		content: '🌿';
		position: absolute;
		top: -10rpx;
		left: -6rpx;
		font-size: 28rpx;
		transform: rotate(-18deg);
		opacity: 0.45;
		z-index: 2;
	}

	.goods-img-wrap {
		height: 180rpx;
		background: linear-gradient(135deg, #FFF8F0, #F5EDE0);
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		.goods-emoji { font-size: 80rpx; filter: drop-shadow(0 2rpx 4rpx rgba(0,0,0,0.08)); }
		.goods-tag {
			position: absolute;
			top: 12rpx;
			left: 12rpx;
			background: linear-gradient(135deg, $wood, #D84315);
			border-radius: 12rpx;
			padding: 4rpx 12rpx;
			text { font-size: 18rpx; color: #FFF; font-weight: bold; }

			&.points { background: linear-gradient(135deg, $forest, #7CB342); }
			&.mixed { background: linear-gradient(135deg, $sky, #1E88E5); }
		}
		.corner-leaf {
			position: absolute;
			font-size: 24rpx;
			opacity: 0.2;
			&.leaf-tl { top: 4rpx; left: 4rpx; }
			&.leaf-br { bottom: 4rpx; right: 4rpx; }
		}
		.lock-mask {
			position: absolute;
			inset: 0;
			background: rgba(253,248,240,0.55);
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			gap: 8rpx;
			.lock-icon { font-size: 48rpx; }
			.lock-text { font-size: 22rpx; color: $bark-light; }
		}
	}

	.goods-body {
		padding: 16rpx;
		.goods-name { font-size: 28rpx; font-weight: bold; color: $bark; display: block; }
		.goods-desc {
			font-size: 22rpx;
			color: $bark-light;
			display: block;
			margin-top: 6rpx;
			overflow: hidden;
			white-space: nowrap;
			text-overflow: ellipsis;
		}
		.points-status {
			display: block;
			margin-top: 8rpx;
			font-size: 21rpx;
			font-weight: bold;
			&.ready { color: $forest; }
			&.shortfall { color: $wood; }
			&.sold-out { color: $bark-light; }
		}
		.goods-footer {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-top: 12rpx;
			.goods-price { display: flex; align-items: baseline; gap: 2rpx; }
			.price-sym { font-size: 22rpx; color: $wood; font-weight: bold; }
			.price-num { font-size: 34rpx; color: $wood; font-weight: bold; }
			.price-points { font-size: 20rpx; color: $forest; font-weight: bold; margin-left: 4rpx; }
			.goods-buy-btn {
				background: linear-gradient(135deg, $wood-light, $wood);
				border-radius: 20rpx;
				padding: 8rpx 20rpx;
				box-shadow: 0 2rpx 8rpx rgba(232,120,74,0.2);
				text { font-size: 22rpx; color: #FFF; font-weight: bold; }
				&:active {
					animation: btnPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
				}
				&.disabled {
					background: #D0C8C0;
					box-shadow: none;
				}
				&.subtle {
					background: #FFF3E8;
					border: 2rpx solid rgba(232, 120, 74, 0.32);
					box-shadow: none;
					text { color: $wood; }
				}
			}
		}
	}
	&.points-goods-card {
		display: grid;
		grid-template-columns: 210rpx minmax(0, 1fr);
		border-radius: 14rpx;
		.goods-img-wrap { height: 100%; min-height: 220rpx; }
		.goods-body { display: flex; flex-direction: column; justify-content: center; padding: 20rpx; min-width: 0; }
		.goods-body .goods-name { font-size: 30rpx; }
		.goods-body .goods-desc { white-space: normal; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-height: 1.45; }
		.goods-body .goods-footer { margin-top: 16rpx; }
		.goods-body .goods-footer .goods-buy-btn { min-width: 126rpx; text-align: center; box-sizing: border-box; }
	}
}

/* ===== 积分卡片 ===== */
.points-card {
	margin: 20rpx 24rpx;
	background: linear-gradient(135deg, #FFF8E1, #FFECB3);
	border-radius: 24rpx 20rpx 26rpx 22rpx / 20rpx 26rpx 22rpx 24rpx;
	padding: 28rpx 32rpx;
	position: relative;
	overflow: hidden;
	box-shadow: 0 10rpx 28rpx rgba(160, 120, 80, 0.1), 0 2rpx 6rpx rgba(160, 120, 80, 0.04);
	border: 2rpx solid rgba(255,183,77,0.25);
	.points-bg {
		position: absolute;
		inset: 0;
		.bg-star {
			position: absolute;
			font-size: 28rpx;
			opacity: 0.25;
			animation: twinkle 3s ease-in-out infinite;
		}
		.star-1 { top: 16rpx; right: 40rpx; }
		.star-2 { top: 48rpx; right: 80rpx; font-size: 20rpx; animation-delay: 1s; }
		.star-3 { bottom: 20rpx; left: 40rpx; font-size: 24rpx; animation-delay: 2s; }
	}
	.points-content {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: space-between;
		z-index: 2;
	}
	.points-left {
		display: flex;
		flex-direction: column;
		gap: 4rpx;
	}
	.points-label { font-size: 24rpx; color: $bark-light; }
	.points-num-wrap {
		display: flex;
		align-items: center;
		gap: 8rpx;
		.points-icon { font-size: 36rpx; }
		.points-num { font-size: 48rpx; font-weight: bold; color: $bark; }
	}
	.points-right {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 6rpx;
		.points-tip { font-size: 22rpx; color: $bark-light; text-align: right; line-height: 1.5; }
		.points-value { font-size: 20rpx; color: $wood; font-weight: bold; }
		.points-earn-btn {
			padding: 7rpx 18rpx;
			background: #FFF;
			border: 2rpx solid rgba(232,120,74,0.28);
			border-radius: 8rpx;
			font-size: 21rpx;
			color: $wood;
			font-weight: bold;
		}
	}
	.points-progress {
		position: relative;
		z-index: 2;
		margin-top: 20rpx;
		padding-top: 18rpx;
		border-top: 2rpx solid rgba(160, 120, 80, 0.1);
	}
	.points-progress-bar { height: 10rpx; background: rgba(255,255,255,0.7); border-radius: 5rpx; overflow: hidden; }
	.points-progress-fill { height: 100%; background: linear-gradient(90deg, #FFB84D, $wood); border-radius: 5rpx; }
	.points-progress-text { display: block; margin-top: 10rpx; font-size: 21rpx; color: $bark-light; }
}

.points-filter-bar {
	display: flex;
	gap: 10rpx;
	padding: 2rpx 24rpx 14rpx;
	overflow: hidden;
}
.points-filter {
	min-width: 0;
	flex: 1;
	height: 62rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 5rpx;
	background: #FFF;
	border: 2rpx solid $cream-dark;
	border-radius: 8rpx;
	font-size: 21rpx;
	color: $bark-light;
	white-space: nowrap;
	&.active { background: $bark; border-color: $bark; color: #FFF; font-weight: bold; }
	.points-filter-count { font-size: 18rpx; opacity: 0.75; }
}
.points-section-heading {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 10rpx 24rpx 16rpx;
	.points-section-title { font-size: 30rpx; color: $bark; font-weight: bold; }
	.points-section-count { font-size: 22rpx; color: $bark-light; }
}

@keyframes twinkle {
	0%, 100% { opacity: 0.15; }
	50% { opacity: 0.4; }
}

/* 积分价格 */
.points-price {
	display: flex;
	align-items: center;
	gap: 4rpx;
	.p-icon { font-size: 24rpx; }
	.p-num { font-size: 30rpx; color: $wood; font-weight: bold; }
	.p-unit { font-size: 20rpx; color: $bark-light; }
	.cash-plus { font-size: 20rpx; color: $wood; font-weight: bold; margin-left: 4rpx; }
}

/* ===== 空状态 ===== */
.empty-box {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 100rpx 0;
	gap: 12rpx;
	.empty-icon { font-size: 80rpx; filter: drop-shadow(0 2rpx 4rpx rgba(0,0,0,0.06)); }
	.empty-text {
		width: 560rpx;
		font-size: 28rpx;
		line-height: 1.45;
		color: $bark-light;
		text-align: center;
	}
	.empty-actions {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 18rpx;
		margin-top: 16rpx;
	}
	.empty-action {
		min-width: 160rpx;
		padding: 14rpx 26rpx;
		border-radius: 34rpx;
		background: #FFF;
		border: 2rpx solid $cream-dark;
		color: $bark-light;
		font-size: 24rpx;
		text-align: center;

		&.primary {
			background: linear-gradient(135deg, $wood-light, $wood);
			border-color: transparent;
			color: #FFF;
			font-weight: bold;
			box-shadow: 0 4rpx 16rpx rgba(232,120,74,0.22);
		}
	}
}
.empty-box.compact { padding-top: 70rpx; }
@keyframes btnPop {
	0%   { transform: scale(1); }
	30%  { transform: scale(0.9); }
	60%  { transform: scale(1.08); }
	100% { transform: scale(1); }
}

/* 限购标签 */
.limit-badge {
	margin-top: 8rpx;
	text {
		font-size: 20rpx;
		color: #E8784A;
		background: rgba(232,120,74,0.08);
		padding: 4rpx 12rpx;
		border-radius: 10rpx;
		border: 1rpx solid rgba(232,120,74,0.15);
	}
}

/* ===== 次卡月卡特惠卡包样式 ===== */
.subscription-value-note {
	margin: 0 24rpx 18rpx;
	padding: 20rpx 22rpx;
	background: #F0F7F5;
	border-left: 6rpx solid #397267;
	border-radius: 8rpx;
	.value-note-title {
		display: block;
		font-size: 27rpx;
		font-weight: bold;
		color: #315F56;
	}
	.value-note-sub {
		display: block;
		margin-top: 6rpx;
		font-size: 22rpx;
		line-height: 1.5;
		color: #5F756F;
	}
}
.subscription-tabs {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 14rpx;
	padding: 0 24rpx 16rpx;
}
.subscription-tab {
	border: 2rpx solid rgba(160, 120, 80, 0.14);
	border-radius: 14rpx;
	background: #FFF;
	padding: 16rpx 18rpx;
	display: flex;
	align-items: center;
	justify-content: space-between;
	box-sizing: border-box;
	.subscription-tab-name {
		font-size: 28rpx;
		font-weight: bold;
		color: $bark;
	}
	.subscription-tab-desc {
		font-size: 22rpx;
		color: $bark-light;
	}
	&.active {
		border-color: $wood;
		background: #FFF8F0;
		.subscription-tab-name,
		.subscription-tab-desc {
			color: $wood;
		}
	}
}
.subscription-list {
	padding: 10rpx 24rpx;
	display: flex;
	flex-direction: column;
	gap: 24rpx;
}
.sub-card-item {
	display: flex;
	background: #FFF;
	border-radius: 14rpx;
	overflow: hidden;
	box-shadow: 0 10rpx 28rpx rgba(160, 120, 80, 0.08), 0 2rpx 6rpx rgba(160, 120, 80, 0.04);
	border: 2rpx solid rgba(160, 120, 80, 0.12);
	position: relative;
	
	.sub-card-left {
		width: 180rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 24rpx 12rpx;
		flex-shrink: 0;
		position: relative;
		
		&.times {
			background: linear-gradient(135deg, $wood-light, $wood);
		}
		&.monthly {
			background: linear-gradient(135deg, #AB47BC, #7B1FA2);
		}
		&.room {
			background: linear-gradient(135deg, #5C6BC0, #3949AB);
		}
		
		.sub-card-type {
			font-size: 20rpx;
			color: rgba(255, 255, 255, 0.9);
			font-weight: bold;
			background: rgba(255, 255, 255, 0.2);
			padding: 2rpx 12rpx;
			border-radius: 6rpx;
			margin-bottom: 8rpx;
		}
		.sub-card-val-row {
			display: flex;
			align-items: baseline;
			color: #FFF;
		}
		.sub-card-limit {
			font-size: 54rpx;
			font-weight: bold;
		}
		.sub-card-unit {
			font-size: 24rpx;
			font-weight: bold;
			margin-left: 2rpx;
		}
	}
	
	.sub-card-right {
		flex: 1;
		padding: 20rpx 24rpx;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		gap: 8rpx;
		
		.sub-card-name {
			font-size: 28rpx;
			font-weight: bold;
			color: $bark;
		}
		.sub-card-name-row {
			display: flex;
			align-items: center;
			flex-wrap: wrap;
			gap: 10rpx;
		}
		.sub-card-recommend {
			font-size: 20rpx;
			color: #FFF;
			background: $wood;
			padding: 3rpx 10rpx;
			border-radius: 6rpx;
			font-weight: bold;
		}
		.sub-card-selling {
			display: block;
			font-size: 22rpx;
			line-height: 1.45;
			color: #65584C;
		}
		.sub-card-benefits {
			display: flex;
			align-items: center;
			flex-wrap: wrap;
			gap: 8rpx;
		}
		.sub-card-benefit,
		.sub-card-save {
			font-size: 20rpx;
			border-radius: 6rpx;
			padding: 4rpx 10rpx;
		}
		.sub-card-benefit {
			color: $bark;
			background: #FFF2E8;
		}
		.sub-card-save {
			color: $wood;
			background: #FFF8F0;
			font-weight: bold;
		}
		
		.sub-card-info {
			display: flex;
			flex-direction: column;
			gap: 4rpx;
			
			.info-line {
				font-size: 20rpx;
				color: $bark-light;
			}
		}
		
		.sub-card-footer {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-top: 10rpx;
			
			.sub-card-price {
				display: flex;
				align-items: baseline;
				gap: 4rpx;
				
				.symbol {
					font-size: 20rpx;
					color: $wood;
					font-weight: bold;
				}
				.price {
					font-size: 38rpx;
					color: $wood;
					font-weight: bold;
				}
				.orig {
					font-size: 20rpx;
					color: #BBB;
					text-decoration: line-through;
					margin-left: 6rpx;
				}
			}
			
			.buy-btn {
				background: linear-gradient(135deg, $wood-light, $wood);
				color: #FFF;
				font-size: 22rpx;
				font-weight: bold;
				padding: 10rpx 24rpx;
				border-radius: 30rpx;
				box-shadow: 0 4rpx 12rpx rgba(232,120,74,0.2);
				
				&:active {
					animation: btnPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
				}
			}
		}
	}
}
</style>
