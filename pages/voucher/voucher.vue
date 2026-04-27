<template>
	<view class="page">
		<!-- 顶部手绘风标题 -->
		<view class="header">
			<view class="cloud cloud-1">☁️</view>
			<view class="cloud cloud-2">☁️</view>
			<view class="leaf leaf-1">🍃</view>
			<view class="leaf leaf-2">🌿</view>
			<text class="header-title">森林小铺</text>
			<text class="header-sub">宫崎骏式的温暖好物 ✨</text>
		</view>

		<!-- 主 Tab -->
		<view class="main-tabs">
			<view
				class="main-tab"
				v-for="(tab, idx) in mainTabs"
				:key="idx"
				:class="{ active: mainTab === idx }"
				@click="switchMainTab(idx)"
			>
				<text class="tab-emoji">{{ tab.emoji }}</text>
				<text class="tab-name">{{ tab.name }}</text>
				<view class="tab-dot" v-if="tab.badge > 0">{{ tab.badge }}</view>
				<view class="tab-underline" v-if="mainTab === idx"></view>
			</view>
		</view>

		<!-- ========== Tab 0: 领券 ========== -->
		<scroll-view class="scroll-area" scroll-y v-if="mainTab === 0">
			<!-- 森林小径 banner -->
			<view class="forest-banner" @tap="goCoupons">
				<view class="banner-moss">
					<text class="banner-emoji">🍄</text>
					<view class="banner-info">
						<text class="banner-title">优惠券森林</text>
						<text class="banner-sub">领取你的魔法优惠券 🌟</text>
					</view>
				</view>
				<text class="banner-arrow">🌲</text>
			</view>

			<!-- 可领优惠券列表 -->
			<view class="section-header">
				<text class="section-title">🌸 热门优惠券</text>
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
							:disabled="item.remaining_count === 0"
							@tap.stop="receiveCoupon(item)"
						>
							{{ item.remaining_count === 0 ? '已领完' : '立即领取' }}
						</button>
					</view>
				</view>
			</view>

			<view class="empty-box" v-if="claimableCoupons.length === 0 && couponList.length > 0">
				<text class="empty-icon">🍄</text>
				<text class="empty-text">森林里的优惠券都被领光啦～</text>
			</view>
			<view class="empty-box" v-else-if="couponList.length === 0">
				<text class="empty-icon">🌲</text>
				<text class="empty-text">森林里暂时没有优惠券</text>
			</view>

			<view style="height: 180rpx;"></view>
		</scroll-view>

		<!-- ========== Tab 1: 商城 ========== -->
		<scroll-view class="scroll-area" scroll-y v-if="mainTab === 1">
			<!-- 手绘风子分类 -->
			<view class="category-pills">
				<view
					class="pill"
					v-for="(t, idx) in subTabs"
					:key="idx"
					:class="{ active: subTab === idx }"
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
					v-for="(g, idx) in filteredGoods"
					:key="idx"
					@click="handleGoodsClick(g)"
				>
					<view class="goods-img-wrap">
						<text class="goods-emoji">{{ getGoodsEmoji(g) }}</text>
						<view class="goods-tag" v-if="g.exchange_type === 3">
							<text>🌟 积分+现金</text>
						</view>
						<view class="corner-leaf leaf-tl">🌿</view>
						<view class="corner-leaf leaf-br">🍃</view>
					</view>
					<view class="goods-body">
						<text class="goods-name">{{ g.name }}</text>
						<text class="goods-desc" v-if="g.description">{{ g.description }}</text>
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
								<text class="price-num">{{ (g.price / 100).toFixed(0) }}</text>
								<text class="price-points" v-if="g.points_price">+{{ g.points_price }}积分</text>
							</view>
							<view class="goods-buy-btn" @tap.stop="handleGoodsClick(g)">
								<text>看看</text>
							</view>
						</view>
					</view>
				</view>
			</view>

			<view class="empty-box" v-else>
				<text class="empty-icon">🏠</text>
				<text class="empty-text">小铺里还没有这类商品呢</text>
			</view>

			<view style="height: 180rpx;"></view>
		</scroll-view>

		<!-- ========== Tab 2: 积分兑换 ========== -->
		<scroll-view class="scroll-area" scroll-y v-if="mainTab === 2">
			<!-- 积分余额卡片 -->
			<view class="points-card">
				<view class="points-bg">
					<text class="bg-star star-1">✨</text>
					<text class="bg-star star-2">⭐</text>
					<text class="bg-star star-3">🌟</text>
				</view>
				<view class="points-content">
					<view class="points-left">
						<text class="points-label">我的魔法积分</text>
						<view class="points-num-wrap">
							<text class="points-icon">🌟</text>
							<text class="points-num">{{ userInfo.points || 0 }}</text>
						</view>
					</view>
					<view class="points-right">
						<text class="points-tip">积分可以在森林里换到\n意想不到的好东西哦～</text>
					</view>
				</view>
			</view>

			<!-- 积分商品网格 -->
			<view class="goods-grid" v-if="pointsGoods.length > 0">
				<view
					class="goods-card"
					v-for="(g, idx) in pointsGoods"
					:key="idx"
					:class="{ locked: isLocked(g) }"
					@click="handlePointsGoodsClick(g)"
				>
					<view class="goods-img-wrap">
						<text class="goods-emoji">{{ getGoodsEmoji(g) }}</text>
						<view class="goods-tag points" v-if="g.exchange_type === 2">
							<text>🌟 纯积分</text>
						</view>
						<view class="goods-tag mixed" v-else-if="g.exchange_type === 3">
							<text>🌟 混合</text>
						</view>
						<view class="lock-mask" v-if="isLocked(g)">
							<text class="lock-icon">🔮</text>
							<text class="lock-text">等级不足</text>
						</view>
						<view class="corner-leaf leaf-tl">🌿</view>
						<view class="corner-leaf leaf-br">🍃</view>
					</view>
					<view class="goods-body">
						<text class="goods-name">{{ g.name }}</text>
						<text class="goods-desc" v-if="g.description">{{ g.description }}</text>
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
								<text class="cash-plus" v-if="g.exchange_type === 3">+¥{{ (g.price / 100).toFixed(0) }}</text>
							</view>
							<view class="goods-buy-btn" :class="{ disabled: isLocked(g) }" @tap.stop="handlePointsGoodsClick(g)">
								<text>{{ isLocked(g) ? '🔒' : '兑换' }}</text>
							</view>
						</view>
					</view>
				</view>
			</view>

			<view class="empty-box" v-else>
				<text class="empty-icon">🌙</text>
				<text class="empty-text">月光下还没有可兑换的商品</text>
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
import customTabBar from '@/custom-tab-bar/index.vue';

export default {
	components: { customTabBar },
	computed: {
		...mapState(['hasLogin', 'token', 'userInfo']),
		claimableCoupons() {
			return this.couponList.filter(item => !item.user_received);
		},
		filteredGoods() {
			// 排除储值类商品(goods_type=1)，充值请走独立入口
			const nonRecharge = this.goodsList.filter(g => g.goods_type !== 1);
			if (this.subTab === 0) {
				return nonRecharge;
			}
			const typeMap = { 1: 2, 2: 3, 3: 4, 4: 5 };
			return nonRecharge.filter(g => g.goods_type === typeMap[this.subTab]);
		},
		pointsGoods() {
			// 积分兑换Tab：纯积分 + 积分+现金混合，排除储值类
			return this.goodsList.filter(g => g.goods_type !== 1 && (g.exchange_type === 2 || g.exchange_type === 3));
		},
	},
	data() {
		return {
			mainTab: 0,
			subTab: 0,
			mainTabs: [
				{ name: '领券', emoji: '🎟️', badge: 0 },
				{ name: '商城', emoji: '🏠', badge: 0 },
				{ name: '积分兑换', emoji: '🌟', badge: 0 },
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
			goodsEmojis: ['🍿', '🍰', '🧋', '🍟', '🍪', '🎈', '🌸', '🕯️', '🎂', '🎊', '🎲', '🎯', '🃏', '🧩', '🎁', '🧸', '📿', '🔮'],
		};
	},
	onShow() {
		uni.$emit('tabBarChange', { key: 'voucher' });
		// 商品和优惠券列表公开，无需登录即可浏览
		this.loadAll();
	},
	methods: {
		...mapActions(['loginAndRegister']),

		async loadAll() {
			this.loadCoupons();
			this.loadGoods();
		},

		async loadCoupons() {
			try {
				const res = await AUTH.getCouponList(this.token);
				if (res._status === 0) {
					this.couponList = res.data || [];
					const unused = this.couponList.filter(i => !i.user_received);
					this.mainTabs[0].badge = unused.length;
				}
			} catch (e) {}
		},

		async loadGoods() {
			try {
				const res = await AUTH.getGoodsList(this.token);
				if (res._status === 0) {
					this.goodsList = res.data && res.data.goods || [];
				}
			} catch (e) {}
		},

		switchMainTab(idx) {
			this.mainTab = idx;
			if (idx === 1 || idx === 2) {
				this.loadGoods();
			}
		},

		goCoupons() {
			uni.navigateTo({ url: '/pages/my/coupons/coupons' });
		},

		async receiveCoupon(item) {
			if (item.remaining_count === 0) return;
			uni.showLoading({ title: '领取中...' });
			try {
				const res = await AUTH.receiveCoupon(this.token, item.campaign_id);
				uni.hideLoading();
				if (res._status === 0) {
					uni.showToast({ title: '领取成功', icon: 'success' });
					item.user_received = true;
					this.mainTabs[0].badge = Math.max(0, this.mainTabs[0].badge - 1);
				} else {
					uni.showToast({ title: res._reason || '领取失败', icon: 'none' });
				}
			} catch (e) {
				uni.hideLoading();
				uni.showToast({ title: '领取失败', icon: 'none' });
			}
		},

		handleGoodsClick(g) {
			uni.navigateTo({ url: '/pages/voucher/detail?data=' + encodeURIComponent(JSON.stringify(g)) });
		},

		handlePointsGoodsClick(g) {
			if (this.isLocked(g)) {
				uni.showToast({ title: '会员等级不足，无法兑换', icon: 'none' });
				return;
			}
			uni.navigateTo({ url: '/pages/voucher/detail?data=' + encodeURIComponent(JSON.stringify(g)) });
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
			const memberLevel = this.userInfo && this.userInfo.member_level || 0;
			return (g.member_level_required || 0) > memberLevel;
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
			margin-top: 10rpx;
			padding: 0;
			width: 140rpx;
			line-height: 2.4;
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
			}
		}
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
		.points-tip { font-size: 22rpx; color: $bark-light; text-align: right; line-height: 1.5; }
	}
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
	.empty-text { font-size: 28rpx; color: $bark-light; }
}
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
</style>
