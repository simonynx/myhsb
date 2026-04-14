<template>
	<view class="tabbar-wrapper" :style="{ paddingBottom: safeAreaBottom + 'px' }">
		<view class="tabbar-border"></view>
		<view class="tabbar-inner">
			<view
				class="tab-item"
				v-for="tab in tabs"
				:key="tab.key"
				:class="{ active: current === tab.key }"
				@click="switchTab(tab)"
			>
				<view class="tab-icon">
					<text class="icon-emoji">{{ current === tab.key ? tab.iconActive : tab.icon }}</text>
					<view class="active-dot" v-if="current === tab.key && tab.key !== 'appoint'"></view>
				</view>
				<text class="tab-text">{{ tab.name }}</text>
			</view>
		</view>
	</view>
</template>

<script>
import eventBus from '@/utils/eventBus.js';

const TAB_KEYS = {
	'/pages/index/index': 'index',
	'/pages/voucher/voucher': 'voucher',
	'/pages/tabBar/appoint/appoint': 'appoint',
	'/pages/user/user': 'user',
};

export default {
	data() {
		return {
			current: 'index',
			safeAreaBottom: 0,
			tabs: [
				{ key: 'index', name: '首页', path: '/pages/index/index', icon: '🏠', iconActive: '🏠' },
				{ key: 'voucher', name: '卡券', path: '/pages/voucher/voucher', icon: '🎟️', iconActive: '🎫' },
				{ key: 'appoint', name: '预约', path: '/pages/tabBar/appoint/appoint', icon: '📆', iconActive: '📅' },
				{ key: 'user', name: '我的', path: '/pages/user/user', icon: '🙂', iconActive: '😄' },
			],
		};
	},
	mounted() {
		const info = uni.getSystemInfoSync();
		this.safeAreaBottom = info.safeAreaInsets?.bottom || 0;
		this.syncCurrentTab();
		eventBus.on('tabChange', this.handleTabChange);
	},
	onShow() {
		// 每次 tab bar 显示时同步当前 tab（用户可能从其他入口进来）
		this.syncCurrentTab();
	},
	beforeDestroy() {
		eventBus.off('tabChange', this.handleTabChange);
	},
	methods: {
		// 根据当前页面路径同步 tab 高亮
		syncCurrentTab() {
			const pages = getCurrentPages();
			if (!pages.length) return;
			const currentPage = pages[pages.length - 1];
			const path = '/' + currentPage.route;
			const key = TAB_KEYS[path];
			if (key && this.current !== key) {
				this.current = key;
			}
		},

		handleTabChange(key) {
			if (this.current !== key) {
				this.current = key;
			}
		},

		switchTab(tab) {
			if (this.current === tab.key) return;
			uni.switchTab({ url: tab.path });
		},
	},
};
</script>

<style lang="scss" scoped>
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

	&.active .tab-text {
		color: #FF6432;
		font-weight: bold;
	}

	.icon-emoji {
		font-size: 40rpx;
		transition: all 0.2s;
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

.active-dot {
	position: absolute;
	top: -4rpx;
	right: -4rpx;
	width: 10rpx;
	height: 10rpx;
	background: #FF6432;
	border-radius: 50%;
	border: 2rpx solid #fff;
}

.tab-text {
	font-size: 22rpx;
	color: #BBBBBB;
	margin-top: 2rpx;
	transition: color 0.2s;
}
</style>
