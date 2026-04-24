<template>
	<view class="tabbar-wrapper" :style="{ paddingBottom: safeAreaBottom + 'px' }">
		<view class="tabbar-float">
			<view class="tabbar-inner">
				<!-- 首页 -->
				<view
					class="tab-item"
					:class="{ active: current === 'index' }"
					@click="switchTab(tabs[0])"
				>
					<view class="tab-icon-wrap" :class="{ active: current === 'index', bump: bumpKey === 'index' }">
						<text class="tab-svg">
							<text class="svg-path" :class="{ filled: current === 'index' }">🏠</text>
						</text>
						<view class="tab-dot"></view>
					</view>
					<text class="tab-label" :class="{ active: current === 'index' }">首页</text>
				</view>

				<!-- 卡券 -->
				<view
					class="tab-item"
					:class="{ active: current === 'voucher' }"
					@click="switchTab(tabs[1])"
				>
					<view class="tab-icon-wrap" :class="{ active: current === 'voucher', bump: bumpKey === 'voucher' }">
						<text class="tab-svg">
							<text class="svg-path" :class="{ filled: current === 'voucher' }">{{ current === 'voucher' ? '🎫' : '🎟️' }}</text>
						</text>
						<view class="tab-dot"></view>
					</view>
					<text class="tab-label" :class="{ active: current === 'voucher' }">卡券</text>
				</view>

				<!-- 中心按钮 -->
				<view class="center-slot" @click="switchTab(tabs[2])">
					<view class="center-base" :class="{ active: current === 'appoint' }"></view>
					<view class="center-btn" :class="{ active: current === 'appoint', bump: bumpKey === 'appoint' }">
						<text class="center-icon">{{ current === 'appoint' ? '📅' : '📆' }}</text>
					</view>
				</view>

				<!-- 拼团 -->
				<view
					class="tab-item"
					:class="{ active: current === 'group' }"
					@click="switchTab(tabs[3])"
				>
					<view class="tab-icon-wrap" :class="{ active: current === 'group', bump: bumpKey === 'group' }">
						<text class="tab-svg">
							<text class="svg-path" :class="{ filled: current === 'group' }">{{ current === 'group' ? '👥' : '👤' }}</text>
						</text>
						<view class="tab-dot"></view>
					</view>
					<text class="tab-label" :class="{ active: current === 'group' }">拼团</text>
				</view>

				<!-- 我的 -->
				<view
					class="tab-item"
					:class="{ active: current === 'user' }"
					@click="switchTab(tabs[4])"
				>
					<view class="tab-icon-wrap" :class="{ active: current === 'user', bump: bumpKey === 'user' }">
						<text class="tab-svg">
							<text class="svg-path" :class="{ filled: current === 'user' }">{{ current === 'user' ? '😄' : '🙂' }}</text>
						</text>
						<view class="tab-dot"></view>
					</view>
					<text class="tab-label" :class="{ active: current === 'user' }">我的</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
const TAB_KEYS = {
	'/pages/index/index': 'index',
	'/pages/voucher/voucher': 'voucher',
	'/pages/tabBar/appoint/appoint': 'appoint',
	'/pages/group/group': 'group',
	'/pages/user/user': 'user',
};

export default {
	data() {
		return {
			current: 'index',
			safeAreaBottom: 0,
			bumpKey: '',
			_tid: null,
			tabs: [
				{ key: 'index', name: '首页', path: '/pages/index/index' },
				{ key: 'voucher', name: '卡券', path: '/pages/voucher/voucher' },
				{ key: 'appoint', name: '预约', path: '/pages/tabBar/appoint/appoint' },
				{ key: 'group', name: '拼团', path: '/pages/group/group' },
				{ key: 'user', name: '我的', path: '/pages/user/user' },
			],
		};
	},
	mounted() {
		const info = uni.getSystemInfoSync();
		this.safeAreaBottom = info.safeAreaInsets && info.safeAreaInsets.bottom || 0;
		this.syncCurrentTab();
		uni.$on('tabBarChange', this.onTabBarChange);
	},
	beforeDestroy() {
		uni.$off('tabBarChange', this.onTabBarChange);
	},
	methods: {
		syncCurrentTab() {
			const pages = getCurrentPages();
			if (pages.length) {
				const path = '/' + pages[pages.length - 1].route;
				const key = TAB_KEYS[path];
				if (key && this.current !== key) {
					this.current = key;
				}
			}
		},
		onTabBarChange({ key }) {
			if (!key) return;
			if (this.current !== key) {
				this.current = key;
			}
			this.doBump(key);
		},
		switchTab(tab) {
			if (this.current === tab.key) {
				this.doBump(tab.key);
				return;
			}
			this.doBump(tab.key);
			uni.switchTab({ url: tab.path });
		},
		doBump(key) {
			clearTimeout(this._tid);
			this.bumpKey = key;
			this._tid = setTimeout(() => { this.bumpKey = ''; }, 400);
		},
	},
};
</script>

<style lang="scss" scoped>
$tab-bg: #FFFFFF;
$primary: #FF8C42;
$primary-light: #FFCC80;
$green: #A5D6A7;
$text: #A09080;
$text-active: #FF8C42;

.tabbar-wrapper {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	background: transparent;
	z-index: 9999;
	padding: 0 24rpx 16rpx;
}

.tabbar-float {
	background: $tab-bg;
	border-radius: 40rpx;
	box-shadow:
		0 8rpx 32rpx rgba(140, 100, 60, 0.1),
		0 2rpx 8rpx rgba(140, 100, 60, 0.04);
	border: 1rpx solid rgba(240, 230, 216, 0.6);
	overflow: hidden;
}

.tabbar-inner {
	display: flex;
	align-items: flex-end;
	justify-content: space-around;
	padding: 8rpx 8rpx calc(8rpx + env(safe-area-inset-bottom));
	height: 100rpx;
	position: relative;
}

// ---- 普通 tab 项 ----
.tab-item {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: flex-end;
	padding-bottom: 6rpx;
	gap: 6rpx;
	transition: transform 0.15s ease;
	position: relative;

	&:active {
		transform: scale(0.92);
	}
}

.tab-icon-wrap {
	width: 56rpx;
	height: 56rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;
	transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);

	&.active {
		transform: translateY(-6rpx);
	}

	&.bump {
		animation: iconBounce 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
}

.tab-svg {
	display: flex;
	align-items: center;
	justify-content: center;
}

.svg-path {
	font-size: 40rpx;
	opacity: 0.5;
	filter: grayscale(0.35);
	transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
	transform-origin: center;
}

.tab-icon-wrap.active .svg-path {
	opacity: 1;
	filter: grayscale(0);
	transform: scale(1.1);
}

// 小圆点指示器
.tab-dot {
	position: absolute;
	bottom: -10rpx;
	left: 50%;
	transform: translateX(-50%) scale(0);
	width: 6rpx;
	height: 6rpx;
	border-radius: 50%;
	background: linear-gradient(135deg, $primary-light, $primary);
	opacity: 0;
	transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
	box-shadow: 0 2rpx 6rpx rgba($primary, 0.3);
}

.tab-icon-wrap.active .tab-dot {
	opacity: 1;
	transform: translateX(-50%) scale(1);
}

.tab-label {
	font-size: 20rpx;
	color: $text;
	font-weight: 500;
	transition: all 0.3s;
	transform-origin: center top;

	&.active {
		color: $text-active;
		font-weight: 700;
		transform: scale(1.05);
	}
}

// ---- 中心按钮 ----
.center-slot {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: flex-end;
	padding-bottom: 4rpx;
	position: relative;
	width: 100rpx;
}

.center-base {
	position: absolute;
	bottom: 8rpx;
	left: 50%;
	transform: translateX(-50%);
	width: 96rpx;
	height: 96rpx;
	border-radius: 50%;
	background: linear-gradient(180deg, #FFF 0%, #F8F8F8 100%);
	box-shadow:
		inset 0 2rpx 6rpx rgba(140, 100, 60, 0.06),
		0 -2rpx 8rpx rgba(140, 100, 60, 0.04);
	z-index: 0;
	transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);

	&.active {
		background: linear-gradient(180deg, rgba($green, 0.12) 0%, rgba($primary-light, 0.08) 100%);
		box-shadow:
			inset 0 2rpx 8rpx rgba($primary, 0.08),
			0 0 20rpx rgba($primary, 0.1);
	}
}

.center-btn {
	width: 84rpx;
	height: 84rpx;
	border-radius: 50%;
	background: linear-gradient(135deg, $primary-light 0%, $primary 60%, #FF7043 100%);
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;
	z-index: 1;
	margin-bottom: 6rpx;
	box-shadow:
		0 8rpx 24rpx rgba($primary, 0.35),
		0 4rpx 12rpx rgba($primary, 0.2),
		inset 0 2rpx 6rpx rgba(255,255,255,0.35),
		inset 0 -2rpx 4rpx rgba(0,0,0,0.05);
	transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);

	&.active {
		background: linear-gradient(135deg, $green 0%, $primary-light 40%, $primary 100%);
		box-shadow:
			0 10rpx 30rpx rgba($primary, 0.4),
			0 4rpx 14rpx rgba($green, 0.25),
			inset 0 2rpx 6rpx rgba(255,255,255,0.4),
			inset 0 -2rpx 4rpx rgba(0,0,0,0.04);
		transform: scale(1.1) translateY(-4rpx);
	}

	&.bump {
		animation: centerBounce 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
}

.center-icon {
	font-size: 44rpx;
	transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
	text-shadow: 0 1rpx 2rpx rgba(0,0,0,0.1);
}

.center-btn.active .center-icon {
	transform: scale(1.15);
}

.center-btn.bump .center-icon {
	animation: emojiPop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
}

// ---- 动画 ----
@keyframes iconBounce {
	0%   { transform: translateY(0) scale(1); }
	25%  { transform: translateY(2rpx) scale(0.82); }
	55%  { transform: translateY(-10rpx) scale(1.2); }
	80%  { transform: translateY(2rpx) scale(0.95); }
	100% { transform: translateY(-6rpx) scale(1); }
}

@keyframes centerBounce {
	0%   { transform: scale(1) translateY(0); }
	25%  { transform: scale(0.88) translateY(4rpx); }
	55%  { transform: scale(1.18) translateY(-12rpx); }
	80%  { transform: scale(0.96) translateY(2rpx); }
	100% { transform: scale(1.1) translateY(-4rpx); }
}

@keyframes emojiPop {
	0%   { transform: scale(1) rotate(0deg); }
	30%  { transform: scale(0.7) rotate(-12deg); }
	60%  { transform: scale(1.3) rotate(10deg); }
	80%  { transform: scale(0.92) rotate(-4deg); }
	100% { transform: scale(1.15) rotate(0deg); }
}
</style>
