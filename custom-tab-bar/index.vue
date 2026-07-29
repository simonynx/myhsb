<template>
	<view class="tabbar-wrapper" :style="wrapperStyleText">
		<view class="tabbar-inner">
			<!-- 首页 -->
			<view
				class="tab-item"
				:class="tabVisuals.index.itemClass"
				@click="switchTab(tabs[0])"
			>
				<view class="tab-icon-wrap" :class="tabVisuals.index.iconClass">
					<text class="tab-svg">
						<text class="svg-path" :class="tabVisuals.index.pathClass">{{ tabVisuals.index.icon }}</text>
					</text>
				</view>
				<text class="tab-label" :class="tabVisuals.index.labelClass">首页</text>
			</view>

			<!-- 卡券 -->
			<view
				class="tab-item"
				:class="tabVisuals.voucher.itemClass"
				@click="switchTab(tabs[1])"
			>
				<view class="tab-icon-wrap" :class="tabVisuals.voucher.iconClass">
					<text class="tab-svg">
						<text class="svg-path" :class="tabVisuals.voucher.pathClass">{{ tabVisuals.voucher.icon }}</text>
					</text>
				</view>
				<text class="tab-label" :class="tabVisuals.voucher.labelClass">卡券</text>
			</view>

			<!-- 中心按钮 -->
			<view class="center-slot" @click="switchTab(tabs[2])">
				<view class="center-btn" :class="tabVisuals.appoint.iconClass">
					<text class="center-icon">{{ tabVisuals.appoint.icon }}</text>
				</view>
				<text class="center-label" :class="tabVisuals.appoint.labelClass">预约</text>
			</view>

			<!-- 组局 -->
			<view
				class="tab-item"
				:class="tabVisuals.group.itemClass"
				@click="switchTab(tabs[3])"
			>
				<view class="tab-icon-wrap" :class="tabVisuals.group.iconClass">
					<text class="tab-svg">
						<text class="svg-path" :class="tabVisuals.group.pathClass">{{ tabVisuals.group.icon }}</text>
					</text>
				</view>
				<text class="tab-label" :class="tabVisuals.group.labelClass">组局</text>
			</view>

			<!-- 我的 -->
			<view
				class="tab-item"
				:class="tabVisuals.user.itemClass"
				@click="switchTab(tabs[4])"
			>
				<view class="tab-icon-wrap" :class="tabVisuals.user.iconClass">
					<text class="tab-svg">
						<text class="svg-path" :class="tabVisuals.user.pathClass">{{ tabVisuals.user.icon }}</text>
					</text>
				</view>
				<text class="tab-label" :class="tabVisuals.user.labelClass">我的</text>
			</view>
		</view>
	</view>
</template>

<script>
import PLATFORM from '../common/platform.js';

const TAB_KEYS = {
	'/pages/index/index': 'index',
	'/pages/voucher/voucher': 'voucher',
	'/pages/tabBar/appoint/appoint': 'appoint',
	'/pages/group/group': 'group',
	'/pages/user/user': 'user',
};

export default {
	computed: {
		wrapperStyleText() {
			return 'padding-bottom:' + this.safeAreaBottom + 'px;';
		},
		tabVisuals() {
			var icons = { index: '⌂', voucher: '券', appoint: '日', group: '局', user: '我' };
			var result = {};
			for (var i = 0; i < this.tabs.length; i++) {
				var tab = this.tabs[i];
				var active = this.current === tab.key;
				var bump = this.bumpKey === tab.key;
				result[tab.key] = {
					itemClass: active ? 'active' : '',
					iconClass: (active ? 'active' : '') + (bump ? ' bump' : ''),
					pathClass: active ? 'filled' : '',
					labelClass: active ? 'active' : '',
					icon: icons[tab.key]
				};
			}
			return result;
		}
	},
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
				{ key: 'group', name: '组局', path: '/pages/group/group' },
				{ key: 'user', name: '我的', path: '/pages/user/user' },
			],
		};
	},
	mounted() {
		this.safeAreaBottom = PLATFORM.getSafeAreaBottom();
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
$primary: #C96B3F;
$primary-light: #E6B08D;
$green: #4E7754;
$text: #8B8178;
$text-active: #B05E37;

.tabbar-wrapper {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	background: $tab-bg;
	z-index: 9999;
	box-shadow: 0 -4rpx 24rpx rgba(140, 100, 60, 0.06);
	border-top: 1rpx solid rgba(240, 230, 216, 0.5);
}

.tabbar-inner {
	display: flex;
	align-items: flex-start;
	justify-content: space-around;
	padding: 10rpx 12rpx;
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
	transition: transform 0.15s ease;

	&:active {
		transform: scale(0.92);
	}
}

.tab-icon-wrap {
	width: 68rpx;
	height: 68rpx;
	border-radius: 22rpx;
	background: transparent;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
	position: relative;

	&.active {
		background: $primary;
		box-shadow: 0 6rpx 18rpx rgba($primary, 0.3);
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
	font-size: 28rpx;
	font-weight: 800;
	color: #81766D;
	transition: all 0.22s;

	&.filled {
		color: #FFF;
	}
}

.tab-label {
	font-size: 20rpx;
	color: $text;
	font-weight: 500;
	transition: all 0.2s;

	&.active {
		color: $text-active;
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

.center-label {
	margin-top: 1rpx;
	font-size: 20rpx;
	font-weight: 600;
	color: $text;
	line-height: 1;

	&.active {
		color: $text-active;
		font-weight: 700;
	}
}

.center-btn {
	width: 68rpx;
	height: 68rpx;
	border-radius: 22rpx;
	background: $primary;
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;
	z-index: 1;
	margin-top: 0;
	box-shadow:
		0 8rpx 24rpx rgba($primary, 0.35),
		0 2rpx 8rpx rgba($primary, 0.2),
		inset 0 2rpx 4rpx rgba(255,255,255,0.3);
	transition: all 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);

	&.active {
		background: $green;
		box-shadow:
			0 10rpx 30rpx rgba($primary, 0.4),
			0 2rpx 8rpx rgba($primary, 0.25),
			inset 0 2rpx 4rpx rgba(255,255,255,0.35);
		transform: scale(1.04);
	}

	&.bump {
		animation: centerBounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
}

.center-icon {
	font-size: 28rpx;
	font-weight: 800;
	color: #FFF;
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
	100% { transform: scale(1); }
}

@keyframes emojiPop {
	0%   { transform: scale(1) rotate(0deg); }
	30%  { transform: scale(0.75) rotate(-8deg); }
	60%  { transform: scale(1.25) rotate(8deg); }
	80%  { transform: scale(0.95) rotate(-3deg); }
	100% { transform: scale(1) rotate(0deg); }
}
</style>
