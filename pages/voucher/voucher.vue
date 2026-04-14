<template>
	<view class="page">
		<!-- 顶部标题 -->
		<view class="top-bar">
			<text class="top-title">卡券中心</text>
		</view>

		<!-- 主 Tab -->
		<view class="main-tabs">
			<view
				class="main-tab"
				v-for="(tab, idx) in mainTabs"
				:key="idx"
				:class="{ active: mainTab === idx }"
				@click="mainTab = idx"
			>
				<text>{{ tab.name }}</text>
				<view class="tab-line" v-if="mainTab === idx"></view>
				<view class="tab-dot" v-if="tab.badge > 0">
					<text>{{ tab.badge }}</text>
				</view>
			</view>
		</view>

		<!-- ========== Tab 0: 领券 ========== -->
		<scroll-view class="scroll-area" scroll-y v-if="mainTab === 0">
			<!-- 领券 Banner -->
			<view class="claim-banner" @tap="goCoupons">
				<view class="banner-left">
					<text class="banner-icon">🎟️</text>
					<view class="banner-info">
						<text class="banner-title">优惠券</text>
						<text class="banner-sub">查看全部优惠券</text>
					</view>
				</view>
				<text class="banner-arrow">→</text>
			</view>

			<!-- 可领优惠券列表 -->
			<view class="section-header">
				<text class="section-title">🎁 热门优惠券</text>
				<text class="section-more" @tap="goCoupons">全部 ></text>
			</view>

			<view class="coupon-list" v-if="couponList.length > 0">
				<view
					class="coupon-card"
					v-for="(item, idx) in couponList"
					:key="idx"
					v-if="!item.user_received"
				>
					<view class="c-left">
						<view class="c-value">
							<text class="c-sym">¥</text>
							<text class="c-num">{{ getCouponValue(item) }}</text>
						</view>
						<text class="c-desc">{{ getCouponDesc(item) }}</text>
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

			<view class="empty-box" v-else>
				<text class="empty-icon">🎟️</text>
				<text class="empty-text">暂无可领取优惠券</text>
			</view>

			<view style="height: 40rpx;"></view>
		</scroll-view>

		<!-- ========== Tab 1: 商品 ========== -->
		<scroll-view class="scroll-area" scroll-y v-if="mainTab === 1">
			<!-- 子分类 Tab -->
			<view class="sub-tabs">
				<view
					class="sub-tab"
					v-for="(t, idx) in subTabs"
					:key="idx"
					:class="{ active: subTab === idx }"
					@click="subTab = idx"
				>
					<text>{{ t.name }}</text>
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
					<view class="g-img">
						<text class="g-emoji">{{ goodsEmojis[idx % goodsEmojis.length] }}</text>
						<view class="g-tag" v-if="g.goods_type === 2">
							<text>美容</text>
						</view>
					</view>
					<view class="g-body">
						<text class="g-name">{{ g.name }}</text>
						<text class="g-desc" v-if="g.description">{{ g.description }}</text>
						<view class="g-footer">
							<view class="g-price">
								<text class="g-price-sym">¥</text>
								<text class="g-price-num">{{ (g.price / 100).toFixed(0) }}</text>
							</view>
							<view class="g-buy-btn" @tap.stop="handleGoodsClick(g)">
								<text>查看</text>
							</view>
						</view>
					</view>
				</view>
			</view>

			<view class="empty-box" v-else>
				<text class="empty-icon">🛍️</text>
				<text class="empty-text">暂无相关商品</text>
			</view>

			<view style="height: 40rpx;"></view>
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
		...mapState(['hasLogin', 'token']),
		filteredGoods() {
			if (this.subTab === 0) {
				// 排除储值类型，只留美容和其它
				return this.goodsList.filter(g => g.goods_type !== 1);
			}
			const typeMap = { 1: 2, 2: 3 };
			return this.goodsList.filter(g => g.goods_type === typeMap[this.subTab]);
		},
	},
	data() {
		return {
			mainTab: 0,
			subTab: 0,
			mainTabs: [
				{ name: '领券', badge: 0 },
				{ name: '商品', badge: 0 },
			],
			subTabs: [
				{ name: '推荐' },
				{ name: '美容' },
				{ name: '其它' },
			],
			couponList: [],
			goodsList: [],
			goodsEmojis: ['💆', '🧖', '💅', '🎀', '✨', '💎', '🌸', '🛁', '🎁', '🧴'],
		};
	},
	onShow() {
		if (!this.hasLogin) {
			this.loginAndRegister().then(() => this.loadAll());
		} else {
			this.loadAll();
		}
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
					this.goodsList = res.data?.goods || [];
				}
			} catch (e) {}
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
			uni.navigateTo({ url: '/pages/voucher/detail?data=' + JSON.stringify(g) });
		},

		getCouponValue(item) {
			const rules = item.rules || {};
			if (item.coupon_type === 'rebate') return rules.gift_value || 0;
			if (item.coupon_type === 'discount') return Math.round((1 - (rules.discount_rate || 1)) * 100) + '折';
			return rules.gift_value || '-';
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
$primary: #FF6432;
$accent: #FF9ECD;
$dark: #333;
$gray: #999;
$bg: #FFF9F5;

page, .page {
	height: 100vh;
	background: $bg;
	display: flex;
	flex-direction: column;
}

/* ===== 顶部栏 ===== */
.top-bar {
	background: #FFFAFB;
	padding: 16rpx 0 0;
	text-align: center;
	flex-shrink: 0;
	border-bottom: 1rpx solid rgba(255, 107, 157, 0.12);
	.top-title {
		font-size: 32rpx;
		font-weight: bold;
		color: $dark;
		letter-spacing: 1rpx;
	}
}

/* ===== 主 Tab ===== */
.main-tabs {
	display: flex;
	background: #FFF;
	flex-shrink: 0;
	border-bottom: 1rpx solid #F0F0F0;
}
.main-tab {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-direction: column;
	gap: 4rpx;
	padding: 20rpx 0;
	position: relative;
	text { font-size: 28rpx; color: $gray; transition: color 0.2s; }
	&.active text { color: #FF6B9D; font-weight: bold; }
	.tab-line {
		position: absolute;
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 40rpx;
		height: 4rpx;
		background: #FF6B9D;
		border-radius: 4rpx;
	}
	.tab-dot {
		position: absolute;
		top: 10rpx;
		right: calc(50% - 40rpx);
		background: #FF4757;
		border-radius: 20rpx;
		min-width: 28rpx;
		height: 28rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 5rpx;
		text { font-size: 16rpx; color: #FFF; font-weight: bold; }
	}
}

/* ===== 滚动区 ===== */
.scroll-area {
	flex: 1;
	overflow: hidden;
}

/* ===== Banner ===== */
.claim-banner {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin: 20rpx 24rpx;
	padding: 24rpx;
	background: linear-gradient(135deg, #FFF5F8, #FFF);
	border-radius: 20rpx;
	border: 1rpx solid #FFE0EE;
	box-shadow: 0 4rpx 16rpx rgba(255, 107, 157, 0.1);
	&:active { opacity: 0.85; }
	.banner-left { display: flex; align-items: center; gap: 16rpx; }
	.banner-icon { font-size: 56rpx; }
	.banner-info { display: flex; flex-direction: column; gap: 4rpx; }
	.banner-title { font-size: 30rpx; font-weight: bold; color: $dark; }
	.banner-sub { font-size: 22rpx; color: $gray; }
	.banner-arrow { font-size: 36rpx; color: #CCC; }
}

/* ===== 区块标题 ===== */
.section-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 20rpx 24rpx 12rpx;
	.section-title { font-size: 30rpx; font-weight: bold; color: $dark; }
	.section-more { font-size: 24rpx; color: $gray; }
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
	border-radius: 20rpx;
	overflow: hidden;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.07);

	.c-left {
		width: 200rpx;
		background: linear-gradient(135deg, $accent, #FF6B9D);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 24rpx 12rpx;
		flex-shrink: 0;
		.c-value { display: flex; align-items: baseline; gap: 2rpx; }
		.c-sym { font-size: 22rpx; color: #FFF; }
		.c-num { font-size: 48rpx; font-weight: bold; color: #FFF; }
		.c-desc { font-size: 20rpx; color: rgba(255,255,255,0.8); margin-top: 6rpx; text-align: center; }
	}

	.c-right {
		flex: 1;
		padding: 20rpx;
		display: flex;
		flex-direction: column;
		gap: 6rpx;
		.c-name { font-size: 28rpx; font-weight: bold; color: $dark; }
		.c-expire { font-size: 22rpx; color: $gray; margin-top: auto; }
		.c-btn {
			margin-top: 10rpx;
			padding: 0;
			width: 140rpx;
			line-height: 2.4;
			background: linear-gradient(135deg, $accent, #FF6B9D);
			color: #FFF;
			font-size: 24rpx;
			font-weight: bold;
			border-radius: 30rpx;
			text-align: center;
			align-self: flex-start;
			&[disabled] { background: #CCC; }
			&::after { border: none; }
		}
	}
}

/* ===== 子分类 Tab ===== */
.sub-tabs {
	display: flex;
	background: #FFF;
	padding: 0 24rpx;
	gap: 40rpx;
	border-bottom: 1rpx solid #F0F0F0;
}
.sub-tab {
	padding: 20rpx 0;
	font-size: 28rpx;
	color: $gray;
	&.active { color: #FF6B9D; font-weight: bold; position: relative; }
	&.active::after {
		content: '';
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 4rpx;
		background: #FF6B9D;
		border-radius: 4rpx;
	}
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
	border-radius: 20rpx;
	overflow: hidden;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.07);
	transition: transform 0.2s, box-shadow 0.2s;
	&:active { transform: scale(0.97); box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1); }

	.g-img {
		height: 180rpx;
		background: linear-gradient(135deg, #FFF8FA, #FFF0F5);
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		.g-emoji { font-size: 80rpx; }
		.g-tag {
			position: absolute;
			top: 12rpx;
			left: 12rpx;
			background: linear-gradient(135deg, $primary, #FF8A65);
			border-radius: 8rpx;
			padding: 4rpx 12rpx;
			text { font-size: 18rpx; color: #FFF; font-weight: bold; }
		}
	}

	.g-body {
		padding: 16rpx;
		.g-name { font-size: 28rpx; font-weight: bold; color: $dark; display: block; }
		.g-desc {
			font-size: 22rpx;
			color: $gray;
			display: block;
			margin-top: 6rpx;
			overflow: hidden;
			white-space: nowrap;
			text-overflow: ellipsis;
		}
		.g-footer {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-top: 12rpx;
			.g-price { display: flex; align-items: baseline; gap: 2rpx; }
			.g-price-sym { font-size: 22rpx; color: $primary; font-weight: bold; }
			.g-price-num { font-size: 34rpx; color: $primary; font-weight: bold; }
			.g-buy-btn {
				background: linear-gradient(135deg, $primary, #FF8A65);
				border-radius: 20rpx;
				padding: 8rpx 20rpx;
				text { font-size: 22rpx; color: #FFF; font-weight: bold; }
			}
		}
	}
}

/* ===== 空状态 ===== */
.empty-box {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 100rpx 0;
	gap: 12rpx;
	.empty-icon { font-size: 80rpx; }
	.empty-text { font-size: 28rpx; color: $gray; }
}
</style>
