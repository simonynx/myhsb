<template>
	<view class="content">
		<!-- 可领取优惠券 Banner -->
		<view class="coupon-banner" v-if="availableCoupons.length > 0" @tap="showCouponList">
			<view class="banner-left">
				<text class="banner-icon">🎟️</text>
				<view class="banner-info">
					<text class="banner-title">可领取优惠券</text>
					<text class="banner-sub">{{ availableCoupons.length }} 张待领取</text>
				</view>
			</view>
			<view class="banner-action">
				<text class="banner-btn">立即领取</text>
			</view>
		</view>

		<!-- 我的卡券 Tab -->
		<view class="voucher-tabs">
			<view
				v-for="(tab, idx) in tabs"
				:key="idx"
				class="tab-btn"
				:class="{ active: currentTab === idx }"
				@click="switchTab(idx)"
			>
				<text class="tab-text">{{ tab }}</text>
				<view class="tab-line" v-if="currentTab === idx"></view>
			</view>
		</view>

		<!-- 卡券列表 -->
		<scroll-view class="voucher-scroll" scroll-y>
			<!-- 空状态 -->
			<view class="empty-state" v-if="displayList.length === 0">
				<text class="empty-icon">🎫</text>
				<text class="empty-title">暂无卡券</text>
				<text class="empty-sub">快去领取优惠券吧～</text>
			</view>

			<!-- 卡券卡片 -->
			<view
				class="voucher-card"
				v-for="(item, idx) in displayList"
				:key="idx"
				@click="handleVoucherClick(item)"
			>
				<!-- 左侧价格区 -->
				<view class="card-left">
					<text class="card-price">¥{{ item.price / 100 }}</text>
					<text class="card-type-name">{{ item.name }}</text>
				</view>
				<!-- 右侧信息区 -->
				<view class="card-right">
					<view class="card-header-row">
						<text class="card-title">{{ item.description || item.name }}</text>
						<view class="card-status" :class="item.statusClass">
							<text>{{ item.statusText }}</text>
						</view>
					</view>
					<view class="card-desc" v-if="item.criteria || item.validity_period_start">
						<text class="desc-item" v-if="item.criteria">适用范围：{{ item.criteria }}</text>
						<text class="desc-item" v-if="item.validity_period_start">
							有效期：{{ item.validity_period_start }} 至 {{ item.validity_period_end }}
						</text>
					</view>
					<view class="card-footer-row">
						<text class="balance-hint" v-if="item.can_use_balance < 1">不可用余额支付</text>
						<text class="card-arrow">→</text>
					</view>
				</view>
			</view>

			<!-- 底部留白 -->
			<view style="height: 40rpx;"></view>
		</scroll-view>

		<!-- 自定义底部导航 -->
		<custom-tab-bar></custom-tab-bar>
	</view>
</template>

<script>
import { mapState, mapActions } from 'vuex';
import empty from "@/components/empty";
import AUTH from '../../utils/auth.js';
import customTabBar from '@/custom-tab-bar/index.vue';
import eventBus from '@/utils/eventBus.js';

export default {
	components: { empty, customTabBar },
	computed: {
		...mapState(['hasLogin', 'userInfo', 'token']),
		displayList() {
			if (this.currentTab === 0) return this.allGoodsList;
			const typeMap = { 1: 'stored', 2: 'beauty', 3: 'other' };
			const key = typeMap[this.currentTab];
			return this.allGoodsList.filter(item => item.goods_type_name === key);
		}
	},
	data() {
		return {
			currentTab: 0,
			tabs: ['全部', '储值', '美容', '其它'],
			allGoodsList: [],
			availableCoupons: [],
		};
	},
	onLoad() {},
	onTabItemTap() {
		eventBus.emit('tabChange', 'voucher');
	},
	onShow() {
		eventBus.emit('tabChange', 'voucher');
		if (!this.hasLogin) {
			this.loginAndRegister();
		} else {
			this.loadData();
			this.loadAvailableCoupons();
		}
	},
	methods: {
		...mapActions(['loginAndRegister']),

		switchTab(idx) {
			this.currentTab = idx;
		},

		async loadAvailableCoupons() {
			if (!this.hasLogin) return;
			try {
				const res = await AUTH.getCouponList(this.token);
				if (res._status === 0) {
					this.availableCoupons = (res.data || []).filter(item => !item.user_received);
				}
			} catch (e) {}
		},

		async loadData() {
			try {
				const res = await AUTH.getGoodsList(this.token);
				if (!res) return;
				const typeNames = { 0: '全部', 1: 'stored', 2: 'beauty', 3: 'other' };
				this.allGoodsList = (res.data?.goods || []).map(item => {
					const statusClass = this._calcStatusClass(item);
					const statusText = this._calcStatusText(item);
					return {
						...item,
						goods_type_name: typeNames[item.goods_type] || 'other',
						statusClass,
						statusText
					};
				});
			} catch (e) {}
		},
		_calcStatusClass(item) {
			if (!item.validity_period_end) return 'status-default';
			const now = new Date();
			const end = new Date(item.validity_period_end);
			if (end < now) return 'status-expired';
			return 'status-normal';
		},
		_calcStatusText(item) {
			if (!item.validity_period_end) return '长期有效';
			const now = new Date();
			const end = new Date(item.validity_period_end);
			if (end < now) return '已过期';
			return '未使用';
		},

		showCouponList() {
			uni.navigateTo({ url: '/pages/my/coupons/coupons' });
		},

		handleVoucherClick(item) {
			uni.navigateTo({ url: `/pages/voucher/detail?data=${JSON.stringify(item)}` });
		},

	}
};
</script>

<style lang="scss" scoped>
$primary: #FF6432;
$gray: #BBBBBB;
$dark: #333333;
$light-gray: #F0F0F0;

page, .content {
	height: 100%;
	padding-top: 44px;
	box-sizing: border-box;
	background-color: #F5F5F5;
}

/* ===== 优惠券 Banner ===== */
.coupon-banner {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin: 20rpx 24rpx;
	padding: 28rpx;
	background: linear-gradient(135deg, #FFF5F0, #FFF);
	border-radius: 24rpx;
	border: 1rpx solid #FFE0D6;
	box-shadow: 0 4rpx 16rpx rgba(255, 100, 50, 0.1);

	.banner-left {
		display: flex;
		align-items: center;
		gap: 16rpx;
	}

	.banner-icon { font-size: 52rpx; }

	.banner-info {
		display: flex;
		flex-direction: column;
		gap: 4rpx;
	}

	.banner-title {
		font-size: 30rpx;
		font-weight: bold;
		color: $primary;
	}

	.banner-sub {
		font-size: 22rpx;
		color: #FF9A7A;
	}

	.banner-action {
		.banner-btn {
			background: linear-gradient(135deg, $primary, #FF8A65);
			color: #fff;
			font-size: 24rpx;
			font-weight: bold;
			padding: 12rpx 28rpx;
			border-radius: 30rpx;
			display: block;
		}
	}
}

/* ===== Tab 切换 ===== */
.voucher-tabs {
	display: flex;
	background: #fff;
	padding: 0 40rpx;
	border-bottom: 1rpx solid #F0F0F0;

	.tab-btn {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 20rpx 0;
		position: relative;

		.tab-text {
			font-size: 28rpx;
			color: $gray;
			transition: color 0.2s;
		}

		.tab-line {
			position: absolute;
			bottom: 0;
			left: 50%;
			transform: translateX(-50%);
			width: 48rpx;
			height: 6rpx;
			background: $primary;
			border-radius: 3rpx;
		}

		&.active .tab-text {
			color: $primary;
			font-weight: bold;
		}
	}
}

/* ===== 卡券列表 ===== */
.voucher-scroll {
	height: calc(100vh - 88rpx - 88rpx - 100rpx - 40rpx);
	padding: 20rpx 24rpx 0;
}

/* 空状态 */
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 120rpx 0;

	.empty-icon { font-size: 100rpx; margin-bottom: 24rpx; }
	.empty-title {
		font-size: 32rpx;
		font-weight: bold;
		color: $dark;
		margin-bottom: 12rpx;
	}
	.empty-sub { font-size: 26rpx; color: $gray; }
}

/* 卡券卡片 */
.voucher-card {
	display: flex;
	background: #fff;
	border-radius: 20rpx;
	overflow: hidden;
	margin-bottom: 20rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.07);
	transition: transform 0.2s, box-shadow 0.2s;

	&:active {
		transform: scale(0.98);
		box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
	}

	.card-left {
		width: 180rpx;
		background: linear-gradient(135deg, $primary, #FF8A65);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 24rpx 16rpx;
		flex-shrink: 0;

		.card-price {
			font-size: 48rpx;
			font-weight: bold;
			color: #fff;
			line-height: 1;
		}

		.card-type-name {
			font-size: 22rpx;
			color: rgba(255, 255, 255, 0.85);
			margin-top: 6rpx;
		}
	}

	.card-right {
		flex: 1;
		padding: 20rpx 24rpx;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		min-height: 160rpx;
	}

	.card-header-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12rpx;
	}

	.card-title {
		font-size: 28rpx;
		font-weight: bold;
		color: $dark;
		line-height: 1.3;
		flex: 1;
	}

	.card-status {
		padding: 4rpx 12rpx;
		border-radius: 10rpx;
		font-size: 20rpx;
		flex-shrink: 0;

		&.status-normal {
			background: #E8F5E9;
			color: #52C41A;
		}
		&.status-expired {
			background: #F5F5F5;
			color: #AAA;
		}
		&.status-default {
			background: #FFF3E0;
			color: #F5A623;
		}
	}

	.card-desc {
		display: flex;
		flex-direction: column;
		gap: 4rpx;
		margin-top: 8rpx;

		.desc-item {
			font-size: 22rpx;
			color: $gray;
			line-height: 1.4;
		}
	}

	.card-footer-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 8rpx;
	}

	.balance-hint {
		font-size: 20rpx;
		color: #FF9A7A;
		background: #FFF5F0;
		padding: 3rpx 10rpx;
		border-radius: 8rpx;
	}

	.card-arrow {
		font-size: 32rpx;
		color: $gray;
	}
}
</style>
