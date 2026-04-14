<template>
	<view class="page-wrapper">
		<!-- 自定义导航栏 -->
		<view class="nav-bar">
			<text class="nav-title">我的</text>
		</view>

		<!-- 用户信息卡 -->
		<view class="profile-card">
			<view class="profile-top">
				<view class="avatar-wrap" @tap="openAuthorizationModal">
					<image class="avatar" :src="userInfo.avatar || '/static/missing-face.png'"></image>
					<view class="avatar-badge" :style="{ background: memberColor }">
						<text class="badge-icon">{{ memberIcon }}</text>
					</view>
				</view>
				<view class="profile-info">
					<text class="nickname">{{ userInfo.nickname || '游客' }}</text>
					<view class="member-tag" :style="{ background: memberColor }">
						<text class="tag-icon">{{ memberIcon }}</text>
						<text class="tag-name">{{ memberLevelName }}</text>
					</view>
				</view>
				<view class="edit-btn" @tap="openAuthorizationModal">
					<text>编辑</text>
				</view>
			</view>

			<!-- 快捷数据 -->
			<view class="quick-stats">
				<view class="qstat-item" @tap="navTo('/pages/my/reviews')">
					<text class="qstat-num">{{ userInfo.points || 0 }}</text>
					<text class="qstat-label">积分</text>
				</view>
				<view class="qstat-divider"></view>
				<view class="qstat-item">
					<text class="qstat-num">¥{{ (userInfo.account_balance / 100).toFixed(0) }}</text>
					<text class="qstat-label">余额</text>
				</view>
				<view class="qstat-divider"></view>
				<view class="qstat-item">
					<text class="qstat-num">{{ userInfo.total_consume / 100 }}</text>
					<text class="qstat-label">累计消费</text>
				</view>
			</view>
		</view>

		<!-- 会员成长 -->
		<view class="growth-card">
			<view class="growth-header">
				<view class="growth-left">
					<text class="growth-icon">{{ memberIcon }}</text>
					<view class="growth-info">
						<text class="growth-level">{{ memberLevelName }}</text>
						<text class="growth-tip" v-if="nextLevelName">还差 ¥{{ needToNext }} 升级</text>
						<text class="growth-tip" v-else>已是最高等级 ✨</text>
					</view>
				</view>
				<text class="growth-rate">{{ progressPercent }}%</text>
			</view>
			<view class="progress-bar">
				<view class="progress-fill" :style="{ width: progressPercent + '%', background: 'linear-gradient(90deg, ' + memberColor + ', #FF9ECD)' }"></view>
			</view>
			<view class="level-dots">
				<view class="level-dot" v-for="l in levelDots" :key="l.level" :class="{ active: userInfo.member_level >= l.level }">
					<text class="dot-icon">{{ l.icon }}</text>
					<text class="dot-name">{{ ['', '🌱', '🥈', '🥇', '💎'][l.level] }}</text>
				</view>
			</view>
		</view>

		<!-- 订单入口 -->
		<view class="section order-section">
			<view class="section-header">
				<text class="section-title">我的订单</text>
				<text class="section-more" @tap="navTo('/pages/order/order')">全部订单 →</text>
			</view>
			<view class="order-grid">
				<view class="order-item" @tap="navTo('/pages/order/order?state=1')">
					<text class="order-icon">💰</text>
					<text class="order-name">待付款</text>
				</view>
				<view class="order-item" @tap="navTo('/pages/order/order?state=2')">
					<text class="order-icon">✅</text>
					<text class="order-name">已完成</text>
				</view>
				<view class="order-item" @tap="navTo('/pages/order/order?state=3')">
					<text class="order-icon">❌</text>
					<text class="order-name">付款失败</text>
				</view>
			</view>
		</view>

		<!-- 评价入口 -->
		<view class="section menu-section">
			<view class="menu-item" @tap="navTo('/pages/my/reviews')">
				<text class="menu-icon">💬</text>
				<text class="menu-text">我的评价</text>
				<text class="menu-arrow">→</text>
			</view>
			<view class="menu-item" @tap="navTo('/pages/my/coupons/coupons')">
				<text class="menu-icon">🎫</text>
				<text class="menu-text">优惠券</text>
				<text class="menu-arrow">→</text>
			</view>
		</view>

		<!-- 充值入口 -->
		<view class="section menu-section">
			<view class="menu-item" @tap="navTo('/pages/user/deposit/deposit')">
				<text class="menu-icon">💎</text>
				<text class="menu-text">充值余额</text>
				<view class="menu-tip">
					<text class="tip-text">余额 {{ (userInfo.account_balance / 100).toFixed(2) }} 元</text>
				</view>
				<text class="menu-arrow">→</text>
			</view>
			<view class="menu-item" @tap="navTo('/pages/user/set-payment')">
				<text class="menu-icon">🔐</text>
				<text class="menu-text">支付密码</text>
				<text class="menu-arrow">→</text>
			</view>
			<view class="menu-item" @tap="navTo('/pages/user/setting/setting')">
				<text class="menu-icon">⚙️</text>
				<text class="menu-text">设置</text>
				<text class="menu-arrow">→</text>
			</view>
		</view>

		<!-- 底部占位 -->
		<view style="height: 40rpx;"></view>

		<!-- 自定义底部导航 -->
		<custom-tab-bar></custom-tab-bar>
	</view>
</template>

<script>
	import AUTH from '../../utils/auth.js'
	import customTabBar from '@/custom-tab-bar/index.vue';
	import eventBus from '@/utils/eventBus.js';
	import {
		mapState,
		mapActions,
		mapMutations
	} from 'vuex';

	const MEMBER_COLORS = {
		0: { color: '#AAAAAA', icon: '🌱', name: '普通会员' },
		1: { color: '#C0C0C0', icon: '🥈', name: '银卡会员' },
		2: { color: '#FFD700', icon: '🥇', name: '金卡会员' },
		3: { color: '#FF69B4', icon: '💎', name: '钻石会员' },
	};

	const LEVEL_DOTS = [
		{ level: 0, icon: '🌱' },
		{ level: 1, icon: '🥈' },
		{ level: 2, icon: '🥇' },
		{ level: 3, icon: '💎' },
	];

	export default {
		components: { customTabBar },
		computed: {
			...mapState(['hasLogin', 'userInfo', 'token']),
			memberLevelName() {
				var level = this.userInfo?.member_level || 0;
				return MEMBER_COLORS[level]?.name || '普通会员';
			},
			memberIcon() {
				var level = this.userInfo?.member_level || 0;
				return MEMBER_COLORS[level]?.icon || '🌱';
			},
			memberColor() {
				var level = this.userInfo?.member_level || 0;
				return MEMBER_COLORS[level]?.color || '#AAAAAA';
			},
			nextLevelName() {
				// 简单：钻石没有下一级
				var level = this.userInfo?.member_level || 0;
				if (level >= 3) return '';
				return MEMBER_COLORS[level + 1]?.name || '';
			},
			needToNext() {
				// 简化计算：银卡500，金卡2000，钻石5000
				var levels = [0, 500, 2000, 5000];
				var level = this.userInfo?.member_level || 0;
				if (level >= 3) return 0;
				var total = this.userInfo?.total_consume / 100 || 0;
				var next = levels[level + 1];
				return Math.max(0, next - total).toFixed(0);
			},
			progressPercent() {
				var level = this.userInfo?.member_level || 0;
				if (level >= 3) return 100;
				var levels = [0, 500, 2000, 5000];
				var total = this.userInfo?.total_consume / 100 || 0;
				var curr = levels[level];
				var next = levels[level + 1];
				return Math.min(100, ((total - curr) / (next - curr)) * 100).toFixed(0);
			},
			levelDots() {
				return LEVEL_DOTS;
			},
		},
		data() {
			return {};
		},
		onTabItemTap() {
			eventBus.emit('tabChange', 'user');
		},
		onShow() {
			if (!this.hasLogin) {
				this.loginAndRegister();
			} else if (!this.userInfo) {
				this.getUserInfo();
			}
			// 每次进来刷新用户信息
			this.getUserInfo();
		},
		methods: {
			...mapActions(['loginAndRegister', 'getUserInfo', 'requestUpdateUserInfo']),
			...mapMutations(['updateUserInfo']),
			navTo(url) {
				uni.navigateTo({ url });
			},
			openAuthorizationModal() {
				uni.navigateTo({ url: '/pages/user/setting/setting' });
			},
		},
	}
</script>

<style lang="scss">
page {
	background: #FFF9F5;
}
.page-wrapper {
	padding-top: 0;
	min-height: 100vh;
	padding-bottom: 40rpx;
}

/* ===== 自定义导航栏 ===== */
.nav-bar {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 88rpx;
	background: linear-gradient(135deg, #FF9ECD, #FF6B9D);
	box-shadow: 0 4rpx 16rpx rgba(255, 107, 157, 0.2);

	.nav-title {
		font-size: 34rpx;
		font-weight: bold;
		color: #fff;
		letter-spacing: 2rpx;
	}
}

/* ===== 用户卡片 ===== */
.profile-card {
	margin: 20rpx 24rpx;
	background: #FFF;
	border-radius: 28rpx;
	padding: 28rpx;
	box-shadow: 0 6rpx 24rpx rgba(255, 107, 157, 0.12);
	border: 1rpx solid rgba(255, 107, 157, 0.08);
}
.profile-top {
	display: flex;
	align-items: center;
	margin-bottom: 24rpx;
}
.avatar-wrap {
	position: relative;
	margin-right: 20rpx;
}
.avatar-wrap .avatar {
	width: 100rpx;
	height: 100rpx;
	border-radius: 50%;
	border: 4rpx solid #FFE0EE;
}
.avatar-wrap .avatar-badge {
	position: absolute;
	bottom: -4rpx;
	right: -4rpx;
	width: 40rpx;
	height: 40rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 3rpx solid #fff;
}
.avatar-wrap .avatar-badge .badge-icon { font-size: 22rpx; }
.profile-info {
	flex: 1;
}
.profile-info .nickname {
	display: block;
	font-size: 36rpx;
	font-weight: bold;
	color: #333;
	margin-bottom: 8rpx;
}
.profile-info .member-tag {
	display: inline-flex;
	align-items: center;
	padding: 4rpx 14rpx;
	border-radius: 20rpx;
}
.profile-info .member-tag .tag-icon { font-size: 20rpx; margin-right: 6rpx; }
.profile-info .member-tag .tag-name {
	font-size: 20rpx;
	color: #fff;
	font-weight: bold;
}
.edit-btn {
	padding: 10rpx 24rpx;
	background: #FFF0F5;
	border-radius: 20rpx;
}
.edit-btn text { font-size: 24rpx; color: #FF6B9D; font-weight: bold; }
.quick-stats {
	display: flex;
	align-items: center;
	justify-content: space-around;
	padding-top: 20rpx;
	border-top: 1rpx solid #F0F0F0;
}
.qstat-item {
	display: flex;
	flex-direction: column;
	align-items: center;
}
.qstat-item .qstat-num { font-size: 36rpx; font-weight: bold; color: #333; }
.qstat-item .qstat-label { font-size: 22rpx; color: #999; margin-top: 4rpx; }
.qstat-divider {
	width: 2rpx;
	height: 50rpx;
	background: #F0F0F0;
}
.growth-card {
	margin: 0 24rpx 24rpx;
	background: linear-gradient(135deg, #FFF5F8, #FFF);
	border-radius: 24rpx;
	padding: 28rpx;
	border: 1rpx solid #FFE0EE;
	box-shadow: 0 4rpx 16rpx rgba(255, 107, 157, 0.1);
}
.growth-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 20rpx;
}
.growth-left {
	display: flex;
	align-items: center;
	gap: 12rpx;
}
.growth-icon { font-size: 40rpx; }
.growth-info {
	display: flex;
	flex-direction: column;
	gap: 2rpx;
}
.growth-level {
	font-size: 28rpx;
	font-weight: bold;
	color: #333;
}
.growth-tip {
	font-size: 20rpx;
	color: #999;
}
.growth-rate {
	font-size: 28rpx;
	font-weight: bold;
	color: #FF6B9D;
}
.growth-card .progress-bar {
	height: 14rpx;
	background: #F0F0F0;
	border-radius: 7rpx;
	margin-bottom: 20rpx;
	overflow: hidden;
}
.growth-card .progress-bar .progress-fill {
	height: 100%;
	border-radius: 7rpx;
	transition: width 0.5s ease;
}
.level-dots {
	display: flex;
	justify-content: space-between;
}
.level-dot {
	display: flex;
	flex-direction: column;
	align-items: center;
}
.level-dot .dot-icon { font-size: 32rpx; opacity: 0.25; }
.level-dot .dot-name { font-size: 20rpx; margin-top: 4rpx; }
.level-dot.active .dot-icon { opacity: 1; }.order-section {
	background: #FFF;
	border-radius: 24rpx;
	padding: 24rpx;
	box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
	.order-grid {
		display: flex;
		justify-content: space-around;
	}
	.order-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8rpx;
		.order-icon { font-size: 48rpx; }
		.order-name { font-size: 24rpx; color: #666; }
	}
}

/* ===== 菜单 ===== */
.menu-section {
	background: #FFF;
	border-radius: 24rpx;
	overflow: hidden;
	box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
	.menu-item {
		display: flex;
		align-items: center;
		padding: 32rpx 24rpx;
		border-bottom: 1rpx solid #F5F5F5;
		&:last-child { border-bottom: none; }
		.menu-icon { font-size: 36rpx; margin-right: 16rpx; }
		.menu-text {
			flex: 1;
			font-size: 28rpx;
			color: #333;
		}
		.menu-tip {
			margin-right: 12rpx;
			.tip-text {
				font-size: 22rpx;
				color: #FF6B9D;
				font-weight: bold;
			}
		}
		.menu-arrow { font-size: 28rpx; color: #CCC; }
	}
}
</style>
