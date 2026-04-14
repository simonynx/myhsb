<template>
	<view class="tabbar-wrapper" :style="{ paddingBottom: safeAreaBottom + 'px' }">
		<view class="tabbar-glow"></view>
		<view class="tabbar-inner">
			<view
				class="tab-item"
				v-for="tab in tabs"
				:key="tab.key"
				:class="{ active: current === tab.key, bump: bumpKey === tab.key }"
				@click="switchTab(tab)"
			>
				<view class="tab-icon">
					<text class="icon-emoji" :class="{ bounce: bumpKey === tab.key }">{{ current === tab.key ? tab.iconActive : tab.icon }}</text>
				</view>
				<text class="tab-text">{{ tab.name }}</text>
			</view>

			<!-- 中心预约按钮 -->
			<view class="center-wrap" @tap="switchTab(tabs[2])">
				<view class="center-btn" :class="{ active: current === 'appoint', bump: bumpKey === 'appoint' }">
					<text class="center-icon">📅</text>
				</view>
				<text class="center-label" :class="{ active: current === 'appoint' }">预约</text>
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
			bumpKey: '',
			tabs: [
				{ key: 'index', name: '首页', path: '/pages/index/index', icon: '🏠', iconActive: '🏠' },
				{ key: 'voucher', name: '卡券', path: '/pages/voucher/voucher', icon: '🎟️', iconActive: '🎫' },
				{ key: 'appoint', name: '预约', path: '/pages/tabBar/appoint/appoint', icon: '📅', iconActive: '📅' },
				{ key: 'user', name: '我的', path: '/pages/user/user', icon: '🙂', iconActive: '😄' },
			],
		};
	},
	mounted() {
		const info = uni.getSystemInfoSync();
		this.safeAreaBottom = info.safeAreaInsets?.bottom || 0;
		this.syncCurrentTab();
		eventBus.on('tabChange', this.handleTabChange);
		uni.$on('tabItemTap', this.handleTabItemTap);
	},
	beforeDestroy() {
		eventBus.off('tabChange', this.handleTabChange);
		uni.$off('tabItemTap', this.handleTabItemTap);
	},
	methods: {
		syncCurrentTab() {
			const pages = getCurrentPages();
			if (!pages.length) return;
			const path = '/' + pages[pages.length - 1].route;
			const key = TAB_KEYS[path];
			if (key && this.current !== key) {
				this.current = key;
			}
		},

		handleTabChange(key) {
			if (this.current !== key) {
				this.triggerBump(key);
				this.current = key;
			}
		},

		handleTabItemTap({ index }) {
			const keys = ['index', 'voucher', 'appoint', 'user'];
			const key = keys[index];
			if (key && this.current !== key) {
				this.triggerBump(key);
				this.current = key;
			}
		},

		triggerBump(key) {
			this.bumpKey = key;
			clearTimeout(this._bumpTimer);
			this._bumpTimer = setTimeout(() => {
				this.bumpKey = '';
			}, 400);
		},

		switchTab(tab) {
			uni.switchTab({ url: tab.path });
		},
	},
};
</script>

<style lang="scss" scoped>
$primary: #FF6432;
$accent: #FF6B9D;
$text: #BBBBBB;
$active: #FF6432;

.tabbar-wrapper {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(255, 255, 255, 0.97);
	backdrop-filter: blur(12px);
	-webkit-backdrop-filter: blur(12px);
	z-index: 9999;
	box-shadow: 0 -2rpx 20rpx rgba(0, 0, 0, 0.06);
}

.tabbar-glow {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	height: 1rpx;
	background: linear-gradient(90deg,
		transparent 0%,
		rgba($accent, 0.4) 30%,
		rgba($primary, 0.6) 50%,
		rgba($accent, 0.4) 70%,
		transparent 100%
	);
}

.tabbar-inner {
	display: flex;
	align-items: flex-end;
	justify-content: space-around;
	padding: 8rpx 0 calc(8rpx + env(safe-area-inset-bottom));
	height: 100rpx;
}

// 普通 tab 项
.tab-item {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 6rpx 0 8rpx;
	transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
	position: relative;

	&.active {
		.tab-text {
			color: $active;
			font-weight: 600;
		}
	}

	&.bump {
		transform: translateY(-4rpx) scale(1.08);
	}

	.icon-emoji {
		font-size: 38rpx;
		transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);

		&.bounce {
			animation: emojiBounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
		}
	}

	&.active .icon-emoji {
		transform: scale(1.15);
		filter: drop-shadow(0 2rpx 6rpx rgba($primary, 0.4));
	}

	// 顶部小圆点
	&::before {
		content: '';
		position: absolute;
		top: 6rpx;
		left: 50%;
		transform: translateX(-50%) scale(0);
		width: 8rpx;
		height: 8rpx;
		background: $primary;
		border-radius: 50%;
		transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	&.active::before {
		transform: translateX(-50%) scale(1);
	}
}

.tab-text {
	font-size: 21rpx;
	color: $text;
	margin-top: 2rpx;
	transition: color 0.2s, font-weight 0.2s;
}

// 中心预约按钮
.center-wrap {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: flex-end;
	padding-bottom: 8rpx;
	width: 120rpx;
	position: relative;

	.center-btn {
		width: 96rpx;
		height: 96rpx;
		background: linear-gradient(135deg, $primary, #FF8A65);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		position: absolute;
		top: -20rpx;
		left: 50%;
		transform: translateX(-50%);
		box-shadow:
			0 6rpx 20rpx rgba($primary, 0.35),
			0 0 0 6rpx rgba($primary, 0.08);
		transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);

		.center-icon {
			font-size: 44rpx;
			transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
		}

		&.active {
			background: linear-gradient(135deg, $accent, #FF6B9D);
			box-shadow:
				0 8rpx 28rpx rgba($accent, 0.45),
				0 0 0 8rpx rgba($accent, 0.1);
			transform: translateX(-50%) scale(1.1);
		}

		&.bump {
			transform: translateX(-50%) scale(1.2) !important;
		}

		&.active .center-icon {
			transform: scale(1.1);
		}
	}

	.center-label {
		font-size: 21rpx;
		color: $text;
		transition: color 0.2s;
		&.active { color: $accent; font-weight: 600; }
	}
}

@keyframes emojiBounce {
	0%   { transform: scale(1.15); }
	40%  { transform: scale(0.9); }
	70%  { transform: scale(1.2); }
	100% { transform: scale(1.15); }
}
</style>
