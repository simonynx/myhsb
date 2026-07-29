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
					<uni-icons :type="tabVisuals.index.iconType" :color="tabVisuals.index.iconColor" size="24"></uni-icons>
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
					<uni-icons :type="tabVisuals.voucher.iconType" :color="tabVisuals.voucher.iconColor" size="24"></uni-icons>
				</view>
				<text class="tab-label" :class="tabVisuals.voucher.labelClass">卡券</text>
			</view>

			<!-- 预约入口与其余入口保持一致，仅当前页高亮 -->
			<view class="center-slot" @click="switchTab(tabs[2])">
				<view class="center-btn" :class="tabVisuals.appoint.iconClass">
					<uni-icons :type="tabVisuals.appoint.iconType" :color="tabVisuals.appoint.iconColor" size="24"></uni-icons>
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
					<uni-icons :type="tabVisuals.group.iconType" :color="tabVisuals.group.iconColor" size="24"></uni-icons>
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
					<uni-icons :type="tabVisuals.user.iconType" :color="tabVisuals.user.iconColor" size="24"></uni-icons>
				</view>
				<text class="tab-label" :class="tabVisuals.user.labelClass">我的</text>
			</view>
		</view>
	</view>
</template>

<script>
import PLATFORM from '../common/platform.js';
import UniIcons from '../uni_modules/uni-icons/components/uni-icons/uni-icons.vue';

const TAB_KEYS = {
	'/pages/index/index': 'index',
	'/pages/voucher/voucher': 'voucher',
	'/pages/tabBar/appoint/appoint': 'appoint',
	'/pages/group/group': 'group',
	'/pages/user/user': 'user',
};

const TAB_ICONS = {
	index: { normal: 'home', active: 'home-filled' },
	voucher: { normal: 'wallet', active: 'wallet-filled' },
	appoint: { normal: 'calendar', active: 'calendar-filled' },
	group: { normal: 'staff', active: 'staff-filled' },
	user: { normal: 'person', active: 'person-filled' }
};

export default {
	components: {
		UniIcons: UniIcons,
	},
	computed: {
		wrapperStyleText() {
			return 'padding-bottom:' + this.safeAreaBottom + 'px;';
		},
		tabVisuals() {
			var result = {};
			for (var i = 0; i < this.tabs.length; i++) {
				var tab = this.tabs[i];
				var active = this.current === tab.key;
				var bump = this.bumpKey === tab.key;
				result[tab.key] = {
					itemClass: active ? 'active' : '',
					iconClass: (active ? 'active' : '') + (bump ? ' bump' : ''),
					labelClass: active ? 'active' : '',
					iconType: active ? TAB_ICONS[tab.key].active : TAB_ICONS[tab.key].normal,
					iconColor: active ? '#B85F37' : '#8A8179'
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
$text: #8B8178;
$text-active: #A95330;

.tabbar-wrapper {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	background: $tab-bg;
	z-index: 9999;
	box-shadow: 0 -6rpx 22rpx rgba(62, 45, 32, 0.07);
	border-top: 1rpx solid #ECE7E1;
}

.tabbar-inner {
	display: flex;
	align-items: center;
	padding: 8rpx 18rpx 10rpx;
	height: 100rpx;
}

.tab-item,
.center-slot {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	min-width: 0;
	gap: 2rpx;
	transition: transform 0.15s ease;

	&:active {
		transform: scale(0.94);
	}
}

.tab-icon-wrap,
.center-btn {
	width: 58rpx;
	height: 54rpx;
	border-radius: 16rpx;
	background: transparent;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: background-color 0.18s ease, transform 0.18s ease;
	position: relative;

	&.active {
		background: #F8ECE5;
	}

	&.bump {
		animation: iconBounce 0.32s ease-out;
	}
}

.tab-label,
.center-label {
	font-size: 20rpx;
	line-height: 1.25;
	color: $text;
	font-weight: 500;
	transition: color 0.18s ease;

	&.active {
		color: $text-active;
		font-weight: 600;
	}
}

.center-slot {
	cursor: pointer;
}

@keyframes iconBounce {
	0% { transform: scale(1); }
	45% { transform: scale(0.88); }
	100% { transform: scale(1); }
}
</style>
