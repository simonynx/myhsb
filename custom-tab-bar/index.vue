<template>
	<view class="tabbar-wrapper" :style="{ paddingBottom: safeAreaBottom + 'px' }">
		<!-- 顶部细线 -->
		<view class="tabbar-border"></view>

		<view class="tabbar-inner">
			<!-- 首页 -->
			<view
				class="tab-item"
				:class="{ active: current === 'index' }"
				@click="switchTab('/pages/index/index', 'index')"
			>
				<view class="tab-icon">
					<text class="icon-emoji">{{ current === 'index' ? '🏠' : '🏡' }}</text>
					<view class="active-dot" v-if="current === 'index'"></view>
				</view>
				<text class="tab-text">首页</text>
			</view>

			<!-- 卡券 -->
			<view
				class="tab-item"
				:class="{ active: current === 'voucher' }"
				@click="switchTab('/pages/voucher/voucher', 'voucher')"
			>
				<view class="tab-icon">
					<text class="icon-emoji">{{ current === 'voucher' ? '🎫' : '🎟️' }}</text>
					<view class="active-dot" v-if="current === 'voucher'"></view>
				</view>
				<text class="tab-text">卡券</text>
			</view>

			<!-- 预约 - 中心突出按钮 -->
			<view
				class="tab-item center-btn"
				:class="{ active: current === 'appoint' }"
				@click="switchTab('/pages/tabBar/appoint/appoint', 'appoint')"
			>
				<view class="tab-icon center-icon">
					<text class="icon-emoji big">{{ current === 'appoint' ? '📅' : '📆' }}</text>
				</view>
				<text class="tab-text center-text">预约</text>
			</view>

			<!-- 我的 -->
			<view
				class="tab-item"
				:class="{ active: current === 'user' }"
				@click="switchTab('/pages/user/user', 'user')"
			>
				<view class="tab-icon">
					<text class="icon-emoji">{{ current === 'user' ? '😄' : '🙂' }}</text>
					<view class="active-dot" v-if="current === 'user'"></view>
				</view>
				<text class="tab-text">我的</text>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			current: 'appoint', // 默认高亮预约页（因为从这个tab进入）
			safeAreaBottom: 0
		};
	},
	created() {
		// 获取安全区域
		const systemInfo = uni.getSystemInfoSync();
		this.safeAreaBottom = systemInfo.safeAreaInsets?.bottom || 0;
		// 根据当前页面路径设置高亮
		this.updateCurrentTab();
	},
	methods: {
		updateCurrentTab() {
			const pages = getCurrentPages();
			if (pages.length === 0) return;
			const currentPage = pages[pages.length - 1];
			const route = '/' + currentPage.route;
			if (route.includes('index')) this.current = 'index';
			else if (route.includes('voucher')) this.current = 'voucher';
			else if (route.includes('appoint')) this.current = 'appoint';
			else if (route.includes('user')) this.current = 'user';
		},
		switchTab(url, key) {
			if (this.current === key) return;
			this.current = key;
			uni.switchTab({ url });
		}
	}
};
</script>

<style lang="scss" scoped>
$primary: #FF6432;
$gray: #BBBBBB;
$dark: #333333;

.tabbar-wrapper {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	background: #FFFFFF;
	z-index: 9999;
	box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.06);
}

.tabbar-border {
	height: 1rpx;
	background: #F0F0F0;
}

.tabbar-inner {
	display: flex;
	align-items: flex-end;
	justify-content: space-around;
	padding: 8rpx 0 0;
	height: 100rpx;
}

.tab-item {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 6rpx 0;
	transition: all 0.2s;

	&.active {
		.tab-text {
			color: $primary;
			font-weight: bold;
		}
	}

	&.center-btn {
		position: relative;
		top: -20rpx;

		.center-icon {
			width: 96rpx;
			height: 96rpx;
			background: linear-gradient(135deg, $primary, #FF8A65);
			border-radius: 50%;
			display: flex;
			align-items: center;
			justify-content: center;
			box-shadow: 0 6rpx 20rpx rgba($primary, 0.4);
			transition: all 0.2s;
		}

		.center-text {
			color: $primary !important;
			font-weight: bold !important;
			margin-top: 2rpx;
		}

		&.active {
			.center-icon {
				transform: scale(1.1);
				box-shadow: 0 8rpx 28rpx rgba($primary, 0.5);
			}
		}

		.icon-emoji.big {
			font-size: 44rpx;
		}
	}
}

.tab-icon {
	position: relative;
	width: 48rpx;
	height: 48rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.icon-emoji {
	font-size: 36rpx;
	transition: all 0.2s;
}

.active-dot {
	position: absolute;
	top: -4rpx;
	right: -4rpx;
	width: 10rpx;
	height: 10rpx;
	background: $primary;
	border-radius: 50%;
	border: 2rpx solid #fff;
}

.tab-text {
	font-size: 22rpx;
	color: $gray;
	margin-top: 2rpx;
	transition: all 0.2s;
}
</style>
