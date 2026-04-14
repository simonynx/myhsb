<template>
	<view class="tabbar-wrapper" :style="{ paddingBottom: safeAreaBottom + 'px' }">
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
				</view>
				<text class="tab-label" :class="{ active: current === 'voucher' }">卡券</text>
			</view>

			<!-- 中心按钮 -->
			<view class="center-slot" @tap="switchTab(tabs[2])">
						<view class="center-ring" :class="{ active: current === 'appoint' }"></view>
				<view class="center-btn" :class="{ active: current === 'appoint', bump: bumpKey === 'appoint' }">
					<text class="center-icon">{{ current === 'appoint' ? '📅' : '📆' }}</text>
				</view>
			</view>

			<!-- 我的 -->
			<view
				class="tab-item"
				:class="{ active: current === 'user' }"
				@click="switchTab(tabs[3])"
			>
				<view class="tab-icon-wrap" :class="{ active: current === 'user', bump: bumpKey === 'user' }">
					<text class="tab-svg">
						<text class="svg-path" :class="{ filled: current === 'user' }">{{ current === 'user' ? '😄' : '🙂' }}</text>
					</text>
				</view>
				<text class="tab-label" :class="{ active: current === 'user' }">我的</text>
			</view>
		</view>
	</view>
</template>

<script>
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
			_tid: null,
			tabs: [
				{ key: 'index', name: '首页', path: '/pages/index/index' },
				{ key: 'voucher', name: '卡券', path: '/pages/voucher/voucher' },
				{ key: 'appoint', name: '预约', path: '/pages/tabBar/appoint/appoint' },
				{ key: 'user', name: '我的', path: '/pages/user/user' },
			],
		};
	},
	mounted() {
		const info = uni.getSystemInfoSync();
		this.safeAreaBottom = info.safeAreaInsets?.bottom || 0;
		uni.$on('tabItemTap', this.handleTabItemTap);
	},
	beforeDestroy() {
		uni.$off('tabItemTap', this.handleTabItemTap);
	},
	methods: {
		handleTabItemTap({ index }) {
			const keys = ['index', 'voucher', 'appoint', 'user'];
			const key = keys[index];
			if (!key) return;
			if (this.current !== key) {
				this.current = key;
				this.doBump(key);
			} else {
				// same tab - still bump for feedback
				this.doBump(key);
			}
		},

		switchTab(tab) {
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
$primary: #FF6432;
$accent: #FF6B9D;
$green: #34C759;
$blue: #5856D6;
$yellow: #FF9F0A;
$text: #8E8E93;
$active: #FF3A30;
$surface: rgba(255, 255, 255, 0.88);

.tabbar-wrapper {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	background: $surface;
	backdrop-filter: blur(20px);
	-webkit-backdrop-filter: blur(20px);
	z-index: 9999;
	box-shadow: 0 -0.5px 0 rgba(0,0,0,0.08), 0 -12px 40px rgba(0,0,0,0.06);
}

.tabbar-inner {
	display: flex;
	align-items: flex-start;
	justify-content: space-around;
	padding: 10rpx 12rpx calc(10rpx + env(safe-area-inset-bottom));
	height: 110rpx;
}

// ---- 普通 tab 项 ----
.tab-item {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: flex-start;
	padding-top: 6rpx;
	gap: 4rpx;
}

.tab-icon-wrap {
	width: 68rpx;
	height: 68rpx;
	border-radius: 22rpx;
	background: transparent;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
	position: relative;

	&.active {
		background: $active;
		box-shadow: 0 6rpx 18rpx rgba($active, 0.38);
	}

	&.bump {
		animation: iconBounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
}

.tab-svg {
	display: flex;
	align-items: center;
	justify-content: center;
}

.svg-path {
	font-size: 36rpx;
	transition: all 0.22s;
	filter: drop-shadow(0 1rpx 2rpx rgba(0,0,0,0.15));
}

.tab-label {
	font-size: 20rpx;
	color: $text;
	font-weight: 500;
	transition: all 0.2s;

	&.active {
		color: $active;
		font-weight: 700;
	}
}

// ---- 中心按钮 ----
.center-slot {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: flex-start;
	padding-top: 0;
	position: relative;
	width: 80rpx;
}

.center-ring {
	position: absolute;
	top: -6rpx;
	width: 108rpx;
	height: 108rpx;
	border-radius: 50%;
	background: #FFF;
	box-shadow: 0 4px 16px rgba(0,0,0,0.1);
	z-index: 0;
	transition: all 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);

	&.active {
		background: linear-gradient(145deg, rgba($accent, 0.15), rgba($primary, 0.08));
		box-shadow:
			0 6rpx 24rpx rgba($accent, 0.25),
			0 0 0 6rpx rgba($accent, 0.12);
	}
}

.center-btn {
	width: 88rpx;
	height: 88rpx;
	border-radius: 50%;
	background: linear-gradient(145deg, #FF7058 0%, $primary 50%, #FF8A65 100%);
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;
	z-index: 1;
	margin-top: -4rpx;
	box-shadow:
		0 8rpx 24rpx rgba($primary, 0.45),
		0 2rpx 8rpx rgba($primary, 0.3),
		inset 0 2rpx 4rpx rgba(255,255,255,0.3);
	transition: all 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);

	&.active {
		background: linear-gradient(145deg, #FF6B8A 0%, $accent 50%, #FF8AB5 100%);
		box-shadow:
			0 10rpx 30rpx rgba($accent, 0.5),
			0 2rpx 8rpx rgba($accent, 0.3),
			inset 0 2rpx 4rpx rgba(255,255,255,0.35);
		transform: scale(1.08);
	}

	&.bump {
		animation: centerBounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
}

.center-icon {
	font-size: 42rpx;
	transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.center-btn.bump .center-icon {
	animation: emojiPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

// ---- 动画 ----
@keyframes iconBounce {
	0%   { transform: scale(1); }
	25%  { transform: scale(0.82) translateY(2rpx); }
	55%  { transform: scale(1.18) translateY(-4rpx); }
	80%  { transform: scale(0.96) translateY(1rpx); }
	100% { transform: scale(1) translateY(0); }
}

@keyframes centerBounce {
	0%   { transform: scale(1); }
	25%  { transform: scale(0.88); }
	55%  { transform: scale(1.22); }
	80%  { transform: scale(0.96); }
	100% { transform: scale(1.08); }
}

@keyframes emojiPop {
	0%   { transform: scale(1) rotate(0deg); }
	30%  { transform: scale(0.75) rotate(-8deg); }
	60%  { transform: scale(1.25) rotate(8deg); }
	80%  { transform: scale(0.95) rotate(-3deg); }
	100% { transform: scale(1) rotate(0deg); }
}
</style>
