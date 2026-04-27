<template>
	<view class="page-wrapper">
		<!-- 自定义导航栏 -->
		<view class="custom-nav">
			<view class="nav-content">
				<text class="nav-title">个人中心</text>
			</view>
		</view>

		<!-- 顶部装饰 -->
		<view class="header-deco">
			<text class="deco-leaf">🍃</text>
			<text class="deco-cloud">☁️</text>
			<text class="deco-flower">🌿</text>
		</view>

		<!-- 用户信息卡 -->
		<view class="profile-card">
			<view class="profile-top" v-if="hasLogin">
				<view class="avatar-wrap" @tap="openAuthorizationModal">
					<image class="avatar" :src="avatarUrl || '/static/missing-face.png'"></image>
					<view class="avatar-badge" :style="{ background: memberColor }">
						<text class="badge-icon">{{ memberIcon }}</text>
					</view>
				</view>
				<view class="profile-info">
					<text class="nickname">{{ (userInfo || {}).nickname || '游客' }}</text>
					<view class="member-tag" :style="{ background: memberColor }">
						<text class="tag-icon">{{ memberIcon }}</text>
						<text class="tag-name">{{ memberLevelName }}</text>
					</view>
				</view>
				<view class="edit-btn" @tap="openAuthorizationModal">
					<text>编辑</text>
				</view>
			</view>
			<view class="profile-top guest" v-else>
				<view class="avatar-wrap guest-avatar">
					<image class="avatar" src="/static/missing-face.png"></image>
				</view>
				<view class="profile-info">
					<text class="nickname">Hi，游客</text>
					<text class="guest-tip">登录解锁更多功能</text>
				</view>
				<view class="login-btn" @tap="handleLogin">
					<text>点击登录</text>
				</view>
			</view>

			<!-- 快捷数据 -->
			<view class="quick-stats">
				<view class="qstat-item" @tap="hasLogin ? navTo('/pages/my/reviews') : handleLogin()">
					<text class="qstat-num">{{ hasLogin ? ((userInfo || {}).points || 0) : '-' }}</text>
					<text class="qstat-label">积分</text>
				</view>
				<view class="qstat-divider"></view>
				<view class="qstat-item">
					<text class="qstat-num">{{ hasLogin ? '¥' + (userInfo ? (userInfo.account_balance / 100).toFixed(0) : '0') : '-' }}</text>
					<text class="qstat-label">余额</text>
				</view>
				<view class="qstat-divider"></view>
				<view class="qstat-item">
					<text class="qstat-num">{{ hasLogin ? (userInfo ? userInfo.total_consume / 100 : 0) : '-' }}</text>
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
				<view class="progress-fill" :style="{ width: progressPercent + '%', background: 'linear-gradient(90deg, ' + memberColor + ', #FFCC80)' }"></view>
			</view>
			<view class="level-dots">
				<view class="level-dot" v-for="l in levelDots" :key="l.level" :class="{ active: ((userInfo || {}).member_level || 0) >= l.level }">
					<text class="dot-icon">{{ l.icon }}</text>
					<text class="dot-name">{{ l.name }}</text>
				</view>
			</view>
		</view>

		<!-- 会员权益 -->
		<view class="vip-card">
			<view class="vip-header">
				<text class="vip-title">会员权益</text>
				<view class="vip-badge" :style="{ background: memberColor }">
					<text class="vip-badge-text">{{ (userInfo || {}).discount ? ((userInfo || {}).discount >= 100 ? '原价' : (userInfo || {}).discount + '折') : '原价' }}</text>
				</view>
			</view>
			<view class="vip-levels">
				<block v-for="(lv, idx) in memberConfig" :key="lv.level">
					<view class="vip-level" :class="{ active: ((userInfo || {}).member_level || 0) >= lv.level }">
						<text class="vl-icon">{{ lv.icon }}</text>
						<text class="vl-name">{{ lv.name }}</text>
						<text class="vl-discount">{{ lv.discount >= 100 ? '原价' : lv.discount + '折' }}</text>
					</view>
					<view class="vip-arrow" v-if="idx < memberConfig.length - 1">→</view>
				</block>
			</view>
			<view class="vip-tip" v-if="nextLevelName">
				再消费 <text class="tip-highlight">¥{{ needToNext }}</text> 升级{{ nextLevelName }}
			</view>
			<view class="vip-tip" v-else>
				🎉 已升至最高等级
			</view>
		</view>

		<!-- 每日签到 -->
		<view class="checkin-card">
			<view class="checkin-left">
				<view class="checkin-icon">📅</view>
				<view class="checkin-info">
					<text class="checkin-title">每日签到</text>
					<text class="checkin-streak" v-if="checkInInfo.current_streak > 0">连续 {{ checkInInfo.current_streak }} 天</text>
					<text class="checkin-streak" v-else>今日未签到</text>
				</view>
			</view>
			<view class="checkin-btn" :class="checkInInfo.can_check_in ? 'can' : 'done'" @click="doCheckIn">
				<text v-if="checkInInfo.checked_in_today">已签到 ✓</text>
				<text v-else-if="checkInInfo.can_check_in">签到得积分</text>
				<text v-else>明日再来</text>
			</view>
		</view>
		<!-- 签到奖励说明 -->
		<view class="checkin-rewards" v-if="checkInInfo.config && checkInInfo.config.milestones">
			<text class="rewards-label">连续签到：</text>
			<text class="reward-item" v-for="(m, idx) in checkInInfo.config.milestones" :key="idx">
				{{ m.days }}天+{{ m.bonus_points }}
			</text>
			<text class="reward-item" v-if="checkInInfo.config.daily_points">基础{{ checkInInfo.config.daily_points }}/天</text>
		</view>

		<!-- 邀请有礼 -->
		<view class="invite-card">
			<view class="invite-header">
				<view class="invite-title-row">
					<text class="invite-icon">🎁</text>
					<text class="invite-title">邀请有礼</text>
				</view>
				<text class="invite-desc">邀请好友注册，双方各得积分奖励</text>
			</view>
			<view class="invite-code-row">
				<text class="invite-code-label">我的邀请码：</text>
				<text class="invite-code-value">{{ inviteInfo.invite_code || '----' }}</text>
				<view class="invite-copy-btn" @click="copyInviteCode">
					<text>复制</text>
				</view>
			</view>
			<button class="invite-share-btn" open-type="share">
				<text class="share-btn-icon">🚀</text>
				<text class="share-btn-text">立即邀请好友</text>
			</button>
			<view class="invite-stats">
				<text class="invite-count">已邀请 {{ inviteInfo.total_invites || 0 }} 人</text>
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
					<text class="order-icon">⏰</text>
					<text class="order-name">待付款</text>
					<view class="order-badge" v-if="orderCounts.waitPay > 0">
						<text>{{ orderCounts.waitPay > 99 ? '99+' : orderCounts.waitPay }}</text>
					</view>
				</view>
				<view class="order-item" @tap="navTo('/pages/order/order?state=2')">
					<text class="order-icon">✅</text>
					<text class="order-name">待使用</text>
					<view class="order-badge" v-if="orderCounts.waitUse > 0">
						<text>{{ orderCounts.waitUse > 99 ? '99+' : orderCounts.waitUse }}</text>
					</view>
				</view>
				<view class="order-item" @tap="navTo('/pages/order/order?state=3')">
					<text class="order-icon">❌</text>
					<text class="order-name">已失效</text>
				</view>
			</view>
		</view>

		<!-- 评价入口 -->
		<view class="section menu-section">
			<view class="menu-item" @tap="hasLogin ? navTo('/pages/my/reviews') : handleLogin()">
				<text class="menu-icon">💬</text>
				<text class="menu-text">我的评价</text>
				<text class="menu-arrow">→</text>
			</view>
			<view class="menu-item" @tap="navTo('/pages/my/coupons/coupons')">
				<text class="menu-icon">🎫</text>
				<text class="menu-text">优惠券</text>
				<text class="menu-arrow">→</text>
			</view>
			<view class="menu-item" @tap="goGroup">
				<text class="menu-icon">👥</text>
				<text class="menu-text">我的拼团</text>
				<text class="menu-arrow">→</text>
			</view>
		</view>

		<!-- 充值入口 -->
		<view class="section menu-section">
			<view class="menu-item" @tap="navTo('/pages/user/deposit/deposit')">
				<text class="menu-icon">💎</text>
				<text class="menu-text">充值余额</text>
				<view class="menu-tip">
					<text class="tip-text">余额 {{ (userInfo ? (userInfo.account_balance / 100).toFixed(2) : '0.00') }} 元</text>
				</view>
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


	export default {
		components: { customTabBar },
		computed: {
			...mapState(['hasLogin', 'userInfo', 'token']),
			avatarUrl() {
				return AUTH.parseAvatarUrl(this.userInfo && this.userInfo.avatar);
			},
			memberLevelData() {
				var level = (this.userInfo && this.userInfo.member_level) || 0;
				return this.memberConfig.find(l => l.level === level) || null;
			},
			memberLevelName() {
				return (this.memberLevelData && this.memberLevelData.name) || '普通会员';
			},
			memberIcon() {
				return (this.memberLevelData && this.memberLevelData.icon) || '🌱';
			},
			memberColor() {
				return (this.memberLevelData && this.memberLevelData.color) || '#AAAAAA';
			},
			nextLevelData() {
				var level = (this.userInfo && this.userInfo.member_level) || 0;
				var maxLevel = this.memberConfig.length > 0 ? Math.max(...this.memberConfig.map(l => l.level)) : 0;
				if (level >= maxLevel) return null;
				return this.memberConfig.find(l => l.level === level + 1) || null;
			},
			nextLevelName() {
				return (this.nextLevelData && this.nextLevelData.name) || '';
			},
			nextLevelDiscount() {
				return (this.nextLevelData && this.nextLevelData.discount) || '';
			},
			needToNext() {
				if (!this.nextLevelData) return 0;
				var next = this.nextLevelData.threshold / 100;
				var total = this.userInfo && this.userInfo.total_consume / 100 || 0;
				return Math.max(0, next - total).toFixed(0);
			},
			progressPercent() {
				var level = (this.userInfo && this.userInfo.member_level) || 0;
				var maxLevel = this.memberConfig.length > 0 ? Math.max(...this.memberConfig.map(l => l.level)) : 0;
				if (level >= maxLevel) return 100;
				var currLevel = this.memberLevelData;
				var nextLevel = this.nextLevelData;
				if (!currLevel || !nextLevel || nextLevel.threshold === currLevel.threshold) return 0;
				var curr = currLevel.threshold / 100;
				var next = nextLevel.threshold / 100;
				var total = this.userInfo && this.userInfo.total_consume / 100 || 0;
				return Math.min(100, ((total - curr) / (next - curr)) * 100).toFixed(0);
			},
			levelDots() {
				return this.memberConfig.map(l => ({ level: l.level, icon: l.icon, name: l.name }));
			},
		},
		data() {
			return {
				orderCounts: { waitPay: 0, waitUse: 0 },
				checkInInfo: { checked_in_today: false, current_streak: 0, can_check_in: true, points_earned_today: 0 },
				inviteInfo: {},
				memberConfig: [],
			};
		},
		onShow() {
			uni.$emit('tabBarChange', { key: 'user' });
			if (this.hasLogin) {
				if (!this.userInfo) {
					this.getUserInfo();
				}
				// 每次进来刷新用户信息
				this.getUserInfo();
				// 加载签到信息和邀请信息
				this.loadCheckInInfo();
				this.loadInviteInfo();
				this.loadMemberConfig();
			}
		},
		methods: {
			...mapActions(['loginAndRegister', 'getUserInfo', 'requestUpdateUserInfo']),
			...mapMutations(['updateUserInfo']),
			handleLogin() {
				this.loginAndRegister().then(() => {
					this.getUserInfo();
					this.loadCheckInInfo();
					this.loadInviteInfo();
					this.loadMemberConfig();
				});
			},
			goGroup() {
				uni.navigateTo({ url: '/pages/group/my' });
			},
			async loadCheckInInfo() {
				if (!this.hasLogin) return;
				const res = await AUTH.checkInInfo(this.token);
				if (res._status === 0 && res.data) {
					this.checkInInfo = res.data;
				}
			},
			async doCheckIn() {
				if (!this.hasLogin) {
					uni.showToast({ title: '请先登录', icon: 'none' });
					return;
				}
				if (!this.checkInInfo.can_check_in) {
					uni.showToast({ title: '今日已签到', icon: 'none' });
					return;
				}
				const res = await AUTH.checkIn(this.token);
				const d = res.data;
				if (d && d.points_earned !== undefined) {
					this.checkInInfo.checked_in_today = true;
					this.checkInInfo.can_check_in = false;
					this.checkInInfo.points_earned_today = d.points_earned;
					uni.showToast({ title: d.message, icon: 'success' });
					this.getUserInfo();
				} else {
					uni.showToast({ title: (d && d.message) || '签到失败', icon: 'none' });
				}
			},

			async loadInviteInfo() {
				if (!this.hasLogin) return;
				const res = await AUTH.inviteInfo(this.token);
				if (res._status === 0 && res.data) {
					this.inviteInfo = res.data;
				}
			},
			async loadMemberConfig() {
				if (!this.hasLogin) return;
				const res = await AUTH.memberConfig(this.token);
				if (res._status === 0 && res.data && res.data.levels) {
					this.memberConfig = res.data.levels;
				}
			},
			copyInviteCode() {
				if (!this.inviteInfo || !this.inviteInfo.invite_code) return;
				uni.setClipboardData({
					data: this.inviteInfo.invite_code,
					success: () => uni.showToast({ title: '复制成功', icon: 'success' })
				});
			},
			navTo(url) {
				uni.navigateTo({ url });
			},
			openAuthorizationModal() {
				uni.navigateTo({ url: '/pages/user/setting/setting' });
			},
		},
		onShareAppMessage() {
			const path = this.userInfo && this.userInfo.invite_code
				? '/pages/index/index?invite_code=' + this.userInfo.invite_code
				: '/pages/index/index';
			return {
				title: '我在摸鱼划水吧等你，一起来玩双方都有积分！',
				imageUrl: '/static/logo_small.jpg',
				path: path,
			};
		},
	}
</script>

<style lang="scss">
page {
	background: #FFF8F0;
}

.page-wrapper {
	padding-top: 0;
	min-height: 100vh;
	padding-bottom: calc(140rpx + env(safe-area-inset-bottom));
}

/* ===== 自定义导航栏 ===== */
.custom-nav {
	background: linear-gradient(135deg, #FFB74D, #FF8C42);
	padding-top: var(--status-bar-height);
	position: sticky;
	top: 0;
	z-index: 100;
}
.nav-content {
	height: 88rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;
}
.nav-title {
	font-size: 34rpx;
	font-weight: bold;
	color: #fff;
}

/* ===== 顶部装饰 ===== */
.header-deco {
	position: relative;
	height: 50rpx;
	overflow: hidden;
}
.deco-leaf {
	position: absolute;
	top: 8rpx;
	left: 50rpx;
	font-size: 36rpx;
	opacity: 0.35;
	animation: sway 4s ease-in-out infinite;
}
.deco-cloud {
	position: absolute;
	top: 6rpx;
	right: 70rpx;
	font-size: 32rpx;
	opacity: 0.3;
	animation: drift 6s ease-in-out infinite;
}
.deco-flower {
	position: absolute;
	top: 12rpx;
	left: 50%;
	font-size: 28rpx;
	opacity: 0.25;
	animation: sway 5s ease-in-out infinite reverse;
}

@keyframes sway {
	0%, 100% { transform: rotate(-6deg); }
	50% { transform: rotate(6deg); }
}
@keyframes drift {
	0%, 100% { transform: translateX(0); }
	50% { transform: translateX(16rpx); }
}

/* ===== 用户卡片 ===== */
.profile-card {
	margin: 0 24rpx 24rpx;
	background: #FFF;
	border-radius: 28rpx;
	padding: 28rpx;
	box-shadow: 0 8rpx 32rpx rgba(140, 100, 60, 0.06);
	border: 1rpx solid rgba(240, 230, 216, 0.6);
	position: relative;
	overflow: hidden;
	&::before {
		content: '';
		position: absolute;
		top: 0; left: 0; right: 0;
		height: 6rpx;
		background: linear-gradient(90deg, #FF8C42, #FFB5A7, #A5D6A7);
	}
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
	border: 4rpx solid #FFD8B8;
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
	color: #5C4B3A;
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
	background: #FFF5EE;
	border-radius: 20rpx;
}
.edit-btn text { font-size: 24rpx; color: #FF8C42; font-weight: bold; }
.quick-stats {
	display: flex;
	align-items: center;
	justify-content: space-around;
	padding-top: 20rpx;
	border-top: 1rpx solid #F0E6D8;
}
.qstat-item {
	display: flex;
	flex-direction: column;
	align-items: center;
}
.qstat-item .qstat-num {
	font-size: 38rpx;
	font-weight: 800;
	color: #5C4B3A;
	background: linear-gradient(135deg, #FF8C42, #FFCC80);
	-webkit-background-clip: text;
	-webkit-text-fill-color: transparent;
	background-clip: text;
}
.qstat-item .qstat-label { font-size: 22rpx; color: #A09080; margin-top: 4rpx; }
.qstat-divider {
	width: 2rpx;
	height: 50rpx;
	background: linear-gradient(to bottom, transparent, #F0E6D8, transparent);
}

/* ===== 成长卡片 ===== */
.growth-card {
	margin: 0 24rpx 24rpx;
	background: linear-gradient(135deg, #FFF8F0 0%, #FFF 60%, #FFF8F0 100%);
	border-radius: 24rpx;
	padding: 28rpx;
	border: 1rpx solid #F0E6D8;
	box-shadow: 0 8rpx 32rpx rgba(140, 100, 60, 0.06);
	position: relative;
	overflow: hidden;
	&::after {
		content: '';
		position: absolute;
		right: -40rpx; top: -40rpx;
		width: 160rpx; height: 160rpx;
		background: radial-gradient(circle, rgba(255,140,66,0.08) 0%, transparent 70%);
		border-radius: 50%;
	}
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
	color: #5C4B3A;
}
.growth-tip {
	font-size: 20rpx;
	color: #A09080;
}
.growth-rate {
	font-size: 28rpx;
	font-weight: bold;
	color: #FF8C42;
}
.growth-card .progress-bar {
	height: 14rpx;
	background: #F0E6D8;
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
.level-dot .dot-name { font-size: 20rpx; color: #CCC; margin-top: 4rpx; }
.level-dot.active .dot-icon { opacity: 1; }
.level-dot.active .dot-name { color: #FF8C42; font-weight: bold; }

/* ===== 通用区块容器 ===== */
.section {
	margin: 20rpx 24rpx;
	border-radius: 24rpx;
	overflow: hidden;
	background: #FFF;
	box-shadow: 0 8rpx 32rpx rgba(140, 100, 60, 0.06);
	border: 1rpx solid rgba(240, 230, 216, 0.6);
}
.section-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 24rpx 24rpx 0;
}
.section-title {
	font-size: 30rpx;
	font-weight: bold;
	color: #5C4B3A;
}
.section-more {
	font-size: 24rpx;
	color: #A09080;
}

/* ===== 会员权益 ===== */
.vip-card {
	margin: 0 24rpx 24rpx;
	background: #FFF;
	border-radius: 24rpx;
	padding: 32rpx 24rpx;
	box-shadow: 0 8rpx 32rpx rgba(140, 100, 60, 0.06);
	border: 1rpx solid rgba(240, 230, 216, 0.6);

	.vip-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 28rpx;
	}

	.vip-title {
		font-size: 30rpx;
		font-weight: bold;
		color: #5C4B3A;
	}

	.vip-badge {
		display: inline-flex;
		align-items: center;
		padding: 6rpx 20rpx;
		border-radius: 24rpx;
	}
	.vip-badge-text {
		font-size: 26rpx;
		font-weight: bold;
		color: #FFF;
	}

	.vip-levels {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 8rpx;
		gap: 16rpx;
	}

	.vip-level {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 16rpx 12rpx;
		border-radius: 16rpx;
		min-width: 120rpx;
		opacity: 0.4;
		transition: all 0.3s;
		background: #F8F8F8;

		&.active {
			opacity: 1;
			background: #FFF8F0;
			box-shadow: 0 4rpx 12rpx rgba(255,140,66,0.15);
			transform: translateY(-4rpx);
		}
	}

	.vl-icon { font-size: 40rpx; }
	.vl-name { font-size: 22rpx; color: #8C7B6B; margin-top: 6rpx; }
	.vl-discount { font-size: 24rpx; color: #5C4B3A; font-weight: bold; margin-top: 4rpx; }

	.vip-arrow {
		font-size: 24rpx;
		color: #D0C8C0;
		flex-shrink: 0;
	}

	.vip-tip {
		margin-top: 24rpx;
		text-align: center;
		font-size: 24rpx;
		color: #A09080;
	}
	.tip-highlight {
		color: #FF8C42;
		font-weight: bold;
	}
}

/* ===== 每日签到卡片 ===== */
.checkin-card {
	margin: 0 24rpx;
	background: linear-gradient(135deg, #FFCC80, #FF8C42);
	border-radius: 24rpx;
	padding: 32rpx;
	display: flex;
	align-items: center;
	justify-content: space-between;
	color: #fff;
	box-shadow: 0 8rpx 24rpx rgba(255, 140, 66, 0.25);

	.checkin-left {
		display: flex;
		align-items: center;
		gap: 20rpx;
	}
	.checkin-icon { font-size: 56rpx; }
	.checkin-info {
		display: flex;
		flex-direction: column;
	}
	.checkin-title {
		font-size: 30rpx;
		font-weight: bold;
	}
	.checkin-streak {
		font-size: 24rpx;
		opacity: 0.9;
		margin-top: 4rpx;
	}
	.checkin-btn {
		padding: 14rpx 28rpx;
		border-radius: 40rpx;
		font-size: 26rpx;
		font-weight: bold;
		background: rgba(255,255,255,0.25);
		&.can {
			background: #fff;
			color: #FF8C42;
			box-shadow: 0 4rpx 12rpx rgba(140,100,60,0.15);
		}
		&.done {
			background: rgba(255,255,255,0.15);
			color: rgba(255,255,255,0.6);
		}
	}
}

/* ===== 签到奖励说明 ===== */
.checkin-rewards {
	margin-top: 16rpx;
	padding: 0 32rpx 24rpx;
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 12rpx;
	.rewards-label {
		font-size: 22rpx;
		color: #A09080;
	}
	.reward-item {
		font-size: 22rpx;
		color: #FF8C42;
		background: #FFF5EE;
		padding: 4rpx 12rpx;
		border-radius: 20rpx;
	}
}

/* ===== 邀请有礼卡片 ===== */
.invite-card {
	margin: 24rpx;
	background: #FFF;
	border-radius: 24rpx;
	padding: 32rpx 24rpx;
	box-shadow: 0 8rpx 32rpx rgba(140, 100, 60, 0.06);
	border: 1rpx solid rgba(240, 230, 216, 0.6);

	.invite-header {
		margin-bottom: 24rpx;
	}
	.invite-title-row {
		display: flex;
		align-items: center;
		gap: 10rpx;
		margin-bottom: 6rpx;
	}
	.invite-icon { font-size: 32rpx; }
	.invite-title {
		font-size: 30rpx;
		font-weight: bold;
		color: #5C4B3A;
	}
	.invite-desc {
		font-size: 24rpx;
		color: #A09080;
	}
	.invite-code-row {
		display: flex;
		align-items: center;
		gap: 12rpx;
		background: #FFF8F0;
		border-radius: 16rpx;
		padding: 20rpx 24rpx;
		margin-bottom: 16rpx;
	}
	.invite-code-label {
		font-size: 26rpx;
		color: #A09080;
	}
	.invite-code-value {
		font-size: 36rpx;
		font-weight: bold;
		color: #FF8C42;
		letter-spacing: 4rpx;
		flex: 1;
	}
	.invite-copy-btn {
		background: #FF8C42;
		color: #fff;
		font-size: 24rpx;
		padding: 8rpx 20rpx;
		border-radius: 30rpx;
		box-shadow: 0 4rpx 12rpx rgba(255,140,66,0.25);
	}
	.invite-share-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		background: linear-gradient(135deg, #FFCC80, #FF8C42);
		color: #FFF;
		font-size: 30rpx;
		font-weight: bold;
		padding: 24rpx 0;
		border-radius: 50rpx;
		margin: 0 0 16rpx 0;
		box-shadow: 0 8rpx 24rpx rgba(255,140,66,0.35);
		transition: transform 0.1s;
		&:active {
			transform: scale(0.98);
		}
		&::after { border: none; }
		.share-btn-icon { font-size: 32rpx; margin-right: 12rpx; }
		.share-btn-text { font-size: 30rpx; }
	}
	.invite-stats {
		text-align: center;
	}
	.invite-count {
		font-size: 24rpx;
		color: #A09080;
	}
}

/* ===== 订单入口 ===== */
.order-section {
	background: #FFF;
	border-radius: 24rpx;
	padding: 24rpx;
	box-shadow: 0 8rpx 32rpx rgba(140, 100, 60, 0.06);
	border: 1rpx solid rgba(240, 230, 216, 0.6);
	.order-grid {
		display: flex;
		justify-content: space-around;
	}
	.order-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8rpx;
		position: relative;
		.order-icon { font-size: 48rpx; transition: transform 0.2s; }
		&:active .order-icon { transform: scale(0.9); }
		.order-name { font-size: 24rpx; color: #8C7B6B; margin-top: 4rpx; }
		.order-badge {
			position: absolute;
			top: -8rpx;
			right: 8rpx;
			background: #FF8C42;
			border-radius: 20rpx;
			min-width: 32rpx;
			height: 32rpx;
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 0 6rpx;
			text { font-size: 18rpx; color: #fff; font-weight: bold; }
		}
	}
}

/* ===== 菜单 ===== */
.menu-section {
	margin: 20rpx 24rpx;
	border-radius: 24rpx;
	overflow: hidden;
	background: #FFF;
	box-shadow: 0 8rpx 32rpx rgba(140, 100, 60, 0.06);
	border: 1rpx solid rgba(240, 230, 216, 0.6);
	.menu-item {
		display: flex;
		align-items: center;
		padding: 32rpx 24rpx;
		border-bottom: 1rpx solid #F0E6D8;
		transition: background 0.15s;
		&:last-child { border-bottom: none; }
		&:active { background: #FFF8F0; }
		.menu-icon { font-size: 36rpx; margin-right: 16rpx; }
		.menu-text {
			flex: 1;
			font-size: 28rpx;
			color: #5C4B3A;
		}
		.menu-tip {
			margin-right: 12rpx;
			.tip-text {
				font-size: 22rpx;
				color: #FF8C42;
				font-weight: bold;
			}
		}
		.menu-arrow { font-size: 28rpx; color: #D0C8C0; transition: transform 0.2s; }
		&:active .menu-arrow { transform: translateX(4rpx); }
	}
}

.guest {
	justify-content: center;
	gap: 20rpx;
}
.guest-avatar {
	margin-right: 0 !important;
}
.guest-tip {
	font-size: 24rpx;
	color: #A08B7A;
	margin-top: 6rpx;
	display: block;
}
.login-btn {
	background: linear-gradient(135deg, #FFB5A7, #FF8C42);
	color: #fff;
	padding: 14rpx 36rpx;
	border-radius: 32rpx;
	font-size: 26rpx;
	font-weight: bold;
	box-shadow: 0 4rpx 16rpx rgba(255, 140, 66, 0.25);
}
</style>
