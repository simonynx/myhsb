<template>
	<view class="page-wrapper">
		<!-- 顶部用户卡片 -->
		<view class="user-header">
			<view class="header-bg"></view>
			<view class="user-card">
				<view class="user-top">
					<view class="avatar-box" @tap="openAuthorizationModal">
						<image class="avatar" :src="userInfo.avatar || '/static/missing-face.png'"></image>
						<view class="avatar-edit">
							<text class="edit-icon">✏️</text>
						</view>
					</view>
					<view class="user-info">
						<text class="nickname">{{ userInfo.nickname || '游客' }}</text>
						<view class="member-badge" :style="{ background: memberColor }">
							<text class="badge-icon">{{ memberIcon }}</text>
							<text class="badge-name">{{ memberLevelName }}</text>
						</view>
					</view>
					<view class="edit-btn" @tap="openAuthorizationModal">
						<text>编辑资料</text>
					</view>
				</view>

				<!-- 会员数据 -->
				<view class="member-stats">
					<view class="stat-item" @tap="navTo('/pages/my/reviews')">
						<text class="stat-num">{{ userInfo.points || 0 }}</text>
						<text class="stat-label">积分</text>
					</view>
					<view class="stat-divider"></view>
					<view class="stat-item">
						<text class="stat-num">¥{{ (userInfo.account_balance / 100).toFixed(2) }}</text>
						<text class="stat-label">余额</text>
					</view>
					<view class="stat-divider"></view>
					<view class="stat-item">
						<text class="stat-num">{{ userInfo.total_consume / 100 }}</text>
						<text class="stat-label">累计消费</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 会员成长进度 -->
		<view class="level-progress-card">
			<view class="level-info">
				<text class="level-icon">{{ memberIcon }}</text>
				<text class="level-text">{{ memberLevelName }}</text>
				<text class="level-next" v-if="nextLevelName">再 {{ needToNext }} 元到 {{ nextLevelName }}</text>
			</view>
			<view class="progress-bar">
				<view class="progress-fill" :style="{ width: progressPercent + '%', background: memberColor }"></view>
			</view>
			<view class="level-list">
				<view class="level-dot" v-for="l in levelDots" :key="l.level" :class="{ active: userInfo.member_level >= l.level }">
					<text class="dot-icon">{{ l.icon }}</text>
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
	padding-top: 80rpx;
	min-height: 100vh;
	padding-bottom: 40rpx;
}

/* ===== 用户卡片 ===== */
.user-header {
	position: relative;
	margin-bottom: 24rpx;
	.header-bg {
		height: 280rpx;
		background: linear-gradient(135deg, #FF9ECD 0%, #FF6B9D 100%);
		border-radius: 0 0 60rpx 60rpx;
	}
	.user-card {
		position: absolute;
		top: 40rpx;
		left: 24rpx;
		right: 24rpx;
		background: #FFF;
		border-radius: 32rpx;
		padding: 32rpx;
		box-shadow: 0 8rpx 32rpx rgba(255, 107, 157, 0.25);
	}
	.user-top {
		display: flex;
		align-items: center;
		margin-bottom: 24rpx;
	}
	.avatar-box {
		position: relative;
		margin-right: 20rpx;
		.avatar {
			width: 100rpx;
			height: 100rpx;
			border-radius: 50%;
			border: 4rpx solid #FFE5EE;
		}
		.avatar-edit {
			position: absolute;
			bottom: -4rpx;
			right: -4rpx;
			width: 36rpx;
			height: 36rpx;
			background: #FF6B9D;
			border-radius: 50%;
			display: flex;
			align-items: center;
			justify-content: center;
			.edit-icon { font-size: 18rpx; }
		}
	}
	.user-info {
		flex: 1;
		.nickname {
			display: block;
			font-size: 36rpx;
			font-weight: bold;
			color: #333;
			margin-bottom: 8rpx;
		}
		.member-badge {
			display: inline-flex;
			align-items: center;
			gap: 6rpx;
			padding: 6rpx 16rpx;
			border-radius: 20rpx;
			.badge-icon { font-size: 20rpx; }
			.badge-name { font-size: 20rpx; color: #FFF; font-weight: bold; }
		}
	}
	.edit-btn {
		background: linear-gradient(135deg, #FF9ECD, #FF6B9D);
		color: #FFF;
		font-size: 22rpx;
		padding: 12rpx 24rpx;
		border-radius: 30rpx;
		font-weight: bold;
	}
	.member-stats {
		display: flex;
		align-items: center;
		justify-content: space-around;
		padding-top: 20rpx;
		border-top: 1rpx solid #F5F5F5;
		.stat-item {
			text-align: center;
			.stat-num {
				display: block;
				font-size: 36rpx;
				font-weight: bold;
				color: #FF6B9D;
			}
			.stat-label {
				display: block;
				font-size: 22rpx;
				color: #999;
				margin-top: 4rpx;
			}
		}
		.stat-divider {
			width: 2rpx;
			height: 50rpx;
			background: #F0F0F0;
		}
	}
}

/* ===== 成长进度 ===== */
.level-progress-card {
	margin: 0 24rpx 24rpx;
	background: #FFF;
	border-radius: 24rpx;
	padding: 24rpx;
	box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
	.level-info {
		display: flex;
		align-items: center;
		gap: 8rpx;
		margin-bottom: 16rpx;
		.level-icon { font-size: 28rpx; }
		.level-text {
			font-size: 26rpx;
			font-weight: bold;
			color: #333;
		}
		.level-next {
			margin-left: auto;
			font-size: 20rpx;
			color: #999;
		}
	}
	.progress-bar {
		height: 12rpx;
		background: #F0F0F0;
		border-radius: 6rpx;
		margin-bottom: 16rpx;
		overflow: hidden;
		.progress-fill {
			height: 100%;
			border-radius: 6rpx;
			transition: width 0.5s ease;
		}
	}
	.level-list {
		display: flex;
		justify-content: space-between;
		.level-dot {
			display: flex;
			flex-direction: column;
			align-items: center;
			.dot-icon { font-size: 28rpx; opacity: 0.3; }
		}
		.level-dot.active .dot-icon { opacity: 1; }
	}
}

/* ===== 通用区块 ===== */
.section {
	margin: 0 24rpx 24rpx;
}
.section-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 16rpx;
	.section-title {
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
	}
	.section-more {
		font-size: 24rpx;
		color: #FF6B9D;
	}
}

/* ===== 订单 ===== */
.order-section {
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
