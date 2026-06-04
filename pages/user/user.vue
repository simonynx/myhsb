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
					<view class="avatar-badge" :style="memberBgStyle">
						<text class="badge-icon">{{ memberIcon }}</text>
					</view>
				</view>
				<view class="profile-info">
					<text class="nickname">{{ userInfo && userInfo.nickname || '游客' }}</text>
					<view class="member-tag" :style="memberBgStyle">
						<text class="tag-icon">{{ memberIcon }}</text>
						<text class="tag-name">{{ memberLevelName }}</text>
					</view>
					<text class="member-no" v-if="hasLogin && memberNo">会员编号：{{ memberNo }}</text>
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
				<view class="qstat-item" @tap="hasLogin ? goPointsCenter() : handleLogin()">
					<text class="qstat-num">{{ hasLogin ? (userInfo && userInfo.points || 0) : '-' }}</text>
					<text class="qstat-label">积分</text>
				</view>
				<view class="qstat-divider"></view>
				<view class="qstat-item" @tap="hasLogin ? navTo('/pages/user/balance/balance') : handleLogin()">
					<text class="qstat-num">{{ balanceText }}</text>
					<text class="qstat-label">余额</text>
				</view>
				<view class="qstat-divider"></view>
				<view class="qstat-item">
					<text class="qstat-num">{{ totalConsumeText }}</text>
					<text class="qstat-label">累计消费</text>
				</view>
			</view>
		</view>

		<!-- 游客权益引导 -->
		<view class="guest-benefit-card" v-if="!hasLogin">
			<view class="guest-benefit-main">
				<text class="guest-benefit-title">登录后可以解锁会员福利</text>
				<text class="guest-benefit-sub">签到领积分、查看优惠券、邀请好友拿奖励</text>
			</view>
			<view class="guest-benefit-btn" @tap="handleLogin">立即登录</view>
		</view>

		<!-- 今日行动 -->
		<view class="retention-panel" v-if="hasLogin">
			<view class="retention-head">
				<view>
					<text class="retention-title">今天可以做</text>
					<text class="retention-sub">{{ retentionSummary }}</text>
				</view>
				<text class="retention-note">回访奖励</text>
			</view>
			<view class="retention-grid">
				<view class="retention-card check" @tap="doCheckIn">
					<text class="retention-icon">签</text>
					<view class="retention-copy">
						<text class="retention-card-title">{{ checkInActionTitle }}</text>
						<text class="retention-card-sub">{{ checkInActionSub }}</text>
					</view>
				</view>
				<view class="retention-card coupon" @tap="goCouponCenter">
					<text class="retention-icon">券</text>
					<view class="retention-copy">
						<text class="retention-card-title">{{ couponActionTitle }}</text>
						<text class="retention-card-sub">{{ couponActionSub }}</text>
					</view>
				</view>
				<view class="retention-card order" @tap="goRetentionOrder">
					<text class="retention-icon">单</text>
					<view class="retention-copy">
						<text class="retention-card-title">{{ orderActionTitle }}</text>
						<text class="retention-card-sub">{{ orderActionSub }}</text>
					</view>
				</view>
			</view>
			<view class="retention-rewards" v-if="checkInInfo.config && checkInInfo.config.milestones">
				<text class="retention-rewards-label">连续签到奖励</text>
				<text class="retention-reward-item" v-for="(m, idx) in checkInInfo.config.milestones" :key="idx">
					{{ m.days }}天+{{ m.bonus_points }}
				</text>
			</view>
		</view>

		<!-- 断签提示 -->
		<view class="checkin-broken" v-if="hasLogin && checkInInfo.is_broken_streak">
			<text>⚠️ 连续签到已中断，今日签到重新从第1天开始</text>
		</view>

		<!-- 会员成长 -->
		<view class="growth-card" v-if="hasLogin && memberConfig.length > 0">
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
				<view class="progress-fill" :style="progressFillStyle"></view>
			</view>
			<view class="level-dots">
				<view v-for="l in levelDots" :key="l.level" :class="l.className">
					<text class="dot-icon">{{ l.icon }}</text>
					<text class="dot-name">{{ l.name }}</text>
				</view>
			</view>
		</view>

		<!-- 会员权益 -->
		<view class="vip-card" v-if="hasLogin && memberConfig.length > 0">
			<view class="vip-header">
				<text class="vip-title">会员权益</text>
				<view class="vip-badge" :style="memberBgStyle">
					<text class="vip-badge-text">{{ currentDiscountText }}</text>
				</view>
			</view>
			<view class="vip-levels">
				<block v-for="(lv, idx) in memberBenefitLevels" :key="lv.level">
					<view :class="lv.className">
						<text class="vl-icon">{{ lv.icon }}</text>
						<text class="vl-name">{{ lv.name }}</text>
						<text class="vl-discount">{{ lv.discountText }}</text>
					</view>
					<view class="vip-arrow" v-if="idx < memberBenefitLevels.length - 1">→</view>
				</block>
			</view>
			<view class="vip-tip" v-if="nextLevelName">
				再消费 <text class="tip-highlight">¥{{ needToNext }}</text> 升级{{ nextLevelName }}
			</view>
			<view class="vip-tip" v-else>
				🎉 已升至最高等级
			</view>
		</view>

		<!-- 邀请有礼 -->
		<view class="invite-card" v-if="hasLogin">
			<view class="invite-header">
				<view class="invite-title-row">
					<text class="invite-icon">🎁</text>
					<text class="invite-title">邀请有礼</text>
				</view>
				<text class="invite-desc">好友注册成功后，你可获得积分和邀请券奖励</text>
			</view>
			<view class="invite-code-row">
				<text class="invite-code-label">我的邀请码：</text>
				<text class="invite-code-value">{{ inviteCode || '----' }}</text>
				<view class="invite-copy-btn" @tap="copyInviteCode">
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
			<view class="section-header order-header">
				<view class="order-title-wrap">
					<text class="section-title">我的订单</text>
					<text class="order-section-sub">{{ orderSectionHint }}</text>
				</view>
			</view>
			<view class="order-primary-grid">
				<view class="order-primary-item pay" @tap="navTo('/pages/order/order?state=1')">
					<view class="order-primary-icon">
						<text>付</text>
					</view>
					<view class="order-primary-copy">
						<text class="order-primary-title">待付款</text>
						<text class="order-primary-sub">及时支付保留订单</text>
					</view>
					<view class="order-badge" v-if="orderCounts.waitPay > 0">
						<text>{{ orderCounts.waitPay > 99 ? '99+' : orderCounts.waitPay }}</text>
					</view>
				</view>
				<view class="order-primary-item use" @tap="navTo('/pages/order/order?state=2')">
					<view class="order-primary-icon">
						<text>用</text>
					</view>
					<view class="order-primary-copy">
						<text class="order-primary-title">待使用</text>
						<text class="order-primary-sub">到店出示即可使用</text>
					</view>
					<view class="order-badge" v-if="orderCounts.waitUse > 0">
						<text>{{ orderCounts.waitUse > 99 ? '99+' : orderCounts.waitUse }}</text>
					</view>
				</view>
			</view>
			<view class="order-secondary-row">
				<view class="order-secondary-item" @tap="navTo('/pages/order/order?state=0')">
					<text class="secondary-icon">全</text>
					<text class="secondary-text">全部订单</text>
				</view>
				<view class="order-secondary-item" @tap="navTo('/pages/order/order?state=3')">
					<text class="secondary-icon">完</text>
					<text class="secondary-text">已完成</text>
				</view>
				<view class="order-secondary-item" @tap="navTo('/pages/order/order?state=4')">
					<text class="secondary-icon">失</text>
					<text class="secondary-text">已失效</text>
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
			<view class="menu-item" @tap="hasLogin ? goCouponCenter() : handleLogin()">
				<text class="menu-icon">🎫</text>
				<text class="menu-text">优惠券</text>
				<view class="menu-tip" v-if="hasLogin && couponTipText">
					<text class="tip-text">{{ couponTipText }}</text>
				</view>
				<text class="menu-arrow">→</text>
			</view>
			<view class="menu-item" @tap="hasLogin ? goGroup() : handleLogin()">
				<text class="menu-icon">👥</text>
				<text class="menu-text">我的拼团</text>
				<text class="menu-arrow">→</text>
			</view>
			<view class="menu-item" @tap="hasLogin ? navTo('/pages/ticket/list') : handleLogin()">
				<text class="menu-icon">🎟️</text>
				<text class="menu-text">我的门票</text>
				<text class="menu-arrow">→</text>
			</view>
			<view class="menu-item" @tap="hasLogin ? navTo('/pages/user/subscription/my') : handleLogin()">
				<text class="menu-icon">💳</text>
				<text class="menu-text">我的卡包</text>
				<text class="menu-arrow">→</text>
			</view>
		</view>

		<!-- 充值入口 -->
		<view class="section menu-section">
			<view class="menu-item" @tap="hasLogin ? navTo('/pages/user/deposit/deposit') : handleLogin()">
				<text class="menu-icon">💎</text>
				<text class="menu-text">充值余额</text>
				<view class="menu-tip">
					<text class="tip-text">{{ balanceMenuText }}</text>
				</view>
				<text class="menu-arrow">→</text>
			</view>
			<view class="menu-item" @tap="hasLogin ? navTo('/pages/user/subscription/buy') : handleLogin()">
				<text class="menu-icon">🎁</text>
				<text class="menu-text">次卡/月卡超市</text>
				<view class="menu-tip">
					<text class="tip-text">特惠卡包</text>
				</view>
				<text class="menu-arrow">→</text>
			</view>
			<view class="menu-item" @tap="hasLogin ? navTo('/pages/user/setting/setting') : handleLogin()">
				<text class="menu-icon">⚙️</text>
				<text class="menu-text">设置</text>
				<text class="menu-arrow">→</text>
			</view>
		</view>

		<!-- 底部占位 -->
		<view style="height: 40rpx;"></view>

		<!-- 自定义底部导航 -->
		<custom-tab-bar></custom-tab-bar>

		<!-- 隐藏 canvas 用于生成专属邀请海报 -->
		<canvas id="invitePoster" type="2d" class="invite-poster-canvas"></canvas>
	</view>
</template>

<script>
	import AUTH from '../../utils/auth.js'
	import PLATFORM from '../../common/platform.js'
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
				return (this.memberLevelData && this.memberLevelData.name) || '魔法学徒';
			},
			memberIcon() {
				return (this.memberLevelData && this.memberLevelData.icon) || '🌱';
			},
			memberColor() {
				return (this.memberLevelData && this.memberLevelData.color) || '#AAAAAA';
			},
			memberBgStyle() {
				return 'background: ' + this.memberColor + ';';
			},
			progressFillStyle() {
				return 'width: ' + this.progressPercent + '%; background: linear-gradient(90deg, ' + this.memberColor + ', #FFCC80);';
			},
			memberNo() {
				var oid = this.userInfo && this.userInfo.object_id ? this.userInfo.object_id : '';
				return oid.replace(/-/g, '').toUpperCase().slice(0, 8);
			},
			balanceAmountText() {
				var amount = this.userInfo && this.userInfo.account_balance;
				amount = parseFloat(amount);
				if (!isFinite(amount)) amount = 0;
				return (amount / 100).toFixed(2);
			},
			balanceText() {
				if (!this.hasLogin) return '-';
				return '¥' + this.balanceAmountText;
			},
			balanceMenuText() {
				return '余额 ' + this.balanceAmountText + ' 元';
			},
			totalConsumeText() {
				if (!this.hasLogin) return '-';
				var amount = this.userInfo && this.userInfo.total_consume;
				amount = parseFloat(amount);
				if (!isFinite(amount)) amount = 0;
				return (amount / 100).toFixed(0);
			},
			inviteCode() {
				if (this.inviteInfo && this.inviteInfo.invite_code) return this.inviteInfo.invite_code;
				if (this.userInfo && this.userInfo.invite_code) return this.userInfo.invite_code;
				return '';
			},
			couponTipText() {
				if (this.claimableCouponCount > 0) return '可领' + this.claimableCouponCount + '张';
				if (this.unusedCouponCount > 0) return '可用' + this.unusedCouponCount + '张';
				return '';
			},
			checkInPointsText() {
				var points = this.checkInInfo.next_points || (this.checkInInfo.config && this.checkInInfo.config.daily_points) || 10;
				return '+' + points + '积分';
			},
			checkInActionTitle() {
				if (this.checkInInfo.checked_in_today) return '今日已签到';
				if (this.checkInInfo.can_check_in) return this.checkInPointsText;
				return '明天继续';
			},
			checkInActionSub() {
				if (this.checkInInfo.current_streak > 0) return '已连续' + this.checkInInfo.current_streak + '天';
				return this.checkInInfo.can_check_in ? '签到攒积分' : '保持回访';
			},
			couponActionTitle() {
				if (this.claimableCouponCount > 0) return '可领' + this.claimableCouponCount + '张券';
				if (this.unusedCouponCount > 0) return '可用' + this.unusedCouponCount + '张券';
				return '暂无新券';
			},
			couponActionSub() {
				if (this.claimableCouponCount > 0) return '领完下单可抵扣';
				if (this.unusedCouponCount > 0) return '下单前记得使用';
				return '有新券会提醒你';
			},
			orderActionTitle() {
				if (this.orderCounts.waitPay > 0) return '待付款' + this.orderCounts.waitPay + '单';
				if (this.orderCounts.waitUse > 0) return '待使用' + this.orderCounts.waitUse + '单';
				return '去安排一局';
			},
			orderActionSub() {
				if (this.orderCounts.waitPay > 0) return '尽快支付保留订单';
				if (this.orderCounts.waitUse > 0) return '到店出示订单';
				return '买票或预约包厢';
			},
			orderSectionHint() {
				if (this.orderCounts.waitPay > 0) return '待付款 ' + this.orderCounts.waitPay + ' 单';
				if (this.orderCounts.waitUse > 0) return '待使用 ' + this.orderCounts.waitUse + ' 单';
				return '暂无待处理订单';
			},
			retentionSummary() {
				if (this.checkInInfo.can_check_in) return '先签到，把今天的积分拿了';
				if (this.claimableCouponCount > 0) return '有新券可以领取';
				if (this.orderCounts.waitPay > 0) return '有订单还没支付';
				if (this.orderCounts.waitUse > 0) return '有订单等你到店使用';
				return '看看余额、券和邀请奖励';
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
				return this.formatMemberDiscount(this.nextLevelData && this.nextLevelData.discount);
			},
			currentDiscountText() {
				if (this.userInfo && this.userInfo.discount_text) return this.userInfo.discount_text;
				if (this.memberLevelData && this.memberLevelData.discount_text) return this.memberLevelData.discount_text;
				return this.formatMemberDiscount(this.userInfo && this.userInfo.discount);
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
				var currentLevel = (this.userInfo && this.userInfo.member_level) || 0;
				return this.memberConfig.map(function(l) {
					return {
						level: l.level,
						icon: l.icon,
						name: l.name,
						className: currentLevel >= l.level ? 'level-dot active' : 'level-dot',
					};
				});
			},
			memberBenefitLevels() {
				var currentLevel = (this.userInfo && this.userInfo.member_level) || 0;
				return this.memberConfig.map(function(l) {
					return {
						level: l.level,
						icon: l.icon,
						name: l.name,
						discount: l.discount,
						discountText: l.discount_text || this.formatMemberDiscount(l.discount),
						className: currentLevel >= l.level ? 'vip-level active' : 'vip-level',
					};
				});
			},
		},
		data() {
			return {
				orderCounts: { waitPay: 0, waitUse: 0 },
				checkInInfo: { checked_in_today: false, current_streak: 0, can_check_in: true, points_earned_today: 0 },
				inviteInfo: {},
				memberConfig: [],
				claimableCouponCount: 0,
				unusedCouponCount: 0,
				shareImagePath: '',
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
				// 延迟生成专属邀请海报（等 userInfo 更新）
				setTimeout(function() { this.generateInvitePoster(); }.bind(this), 500);
				// 加载签到信息和邀请信息
				this.loadCheckInInfo();
				this.loadInviteInfo();
				this.loadMemberConfig();
				this.loadOrderCounts();
				this.loadCouponCounts();
			} else {
				this.resetUserPageState();
			}
		},
		methods: {
			...mapActions(['loginAndRegister', 'getUserInfo', 'requestUpdateUserInfo']),
			...mapMutations(['updateUserInfo']),
			formatMemberDiscount(discount) {
				discount = Number(discount || 100);
				if (!isFinite(discount) || discount >= 100 || discount <= 0) return '原价';
				if (discount % 10 === 0) return (discount / 10).toFixed(0) + '折';
				return (discount / 10).toFixed(1) + '折';
			},
			handleLogin() {
				this.loginAndRegister().then(() => {
					this.getUserInfo();
					this.loadCheckInInfo();
					this.loadInviteInfo();
					this.loadMemberConfig();
					this.loadOrderCounts();
					this.loadCouponCounts();
				});
			},
			goGroup() {
				uni.navigateTo({ url: '/pages/group/my' });
			},
			goCouponCenter() {
				if (this.claimableCouponCount > 0) {
					uni.navigateTo({ url: '/pages/my/coupons/coupons?tab=available' });
				} else if (this.unusedCouponCount > 0) {
					uni.navigateTo({ url: '/pages/my/coupons/coupons?tab=unused' });
				} else {
					uni.navigateTo({ url: '/pages/my/coupons/coupons' });
				}
			},
			goPointsCenter() {
				uni.setStorageSync('voucherInitialTab', 'points');
				uni.switchTab({ url: '/pages/voucher/voucher' });
			},
			goRetentionOrder() {
				if (this.orderCounts.waitPay > 0) {
					this.navTo('/pages/order/order?state=1');
				} else if (this.orderCounts.waitUse > 0) {
					this.navTo('/pages/order/order?state=2');
				} else {
					uni.switchTab({ url: '/pages/tabBar/appoint/appoint' });
				}
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
				AUTH.trackEvent({
					event: 'checkin_click',
					page_path: 'pages/user/user',
					source: 'user_center'
				}, this.token).catch(function() {});
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
					AUTH.trackEvent({
						event: 'checkin_success',
						page_path: 'pages/user/user',
						source: 'user_center'
					}, this.token).catch(function() {});
					this.getUserInfo();
					await this.loadCheckInInfo();
					this.showCheckInSuccess(d);
				} else {
					uni.showToast({ title: (d && d.message) || '签到失败', icon: 'none' });
				}
			},
			showCheckInSuccess(data) {
				data = data || {};
				var content = '本次获得 ' + Number(data.points_earned || 0) + ' 积分';
				if (this.checkInInfo.tomorrow_points) {
					content += '\n明天继续签到可领 +' + this.checkInInfo.tomorrow_points + ' 积分';
				} else {
					content += '\n连续签到还有额外奖励';
				}
				uni.showModal({
					title: '签到成功',
					content: content,
					confirmText: '看卡券',
					cancelText: '知道了',
					success: function(res) {
						if (res.confirm) {
							uni.switchTab({ url: '/pages/voucher/voucher' });
						}
					}
				});
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
			async loadOrderCounts() {
				if (!this.hasLogin) return;
				try {
					const res = await AUTH.getOrderList(-1, this.token);
					const orders = res && res.data && res.data.orders ? res.data.orders : [];
					this.orderCounts.waitPay = orders.filter(function(item) { return item.order_status === 0; }).length;
					this.orderCounts.waitUse = orders.filter(function(item) {
						return item.order_status === 1 && (this.isPendingAppointment(item) || this.isPendingTicket(item));
					}.bind(this)).length;
				} catch (e) {
					this.orderCounts.waitPay = 0;
					this.orderCounts.waitUse = 0;
				}
			},
			isPendingAppointment(item) {
				if (!item || item.order_type !== 1) return false;
				var goodsInfo = item.goods_info;
				if (typeof goodsInfo === 'string') {
					try {
						goodsInfo = JSON.parse(goodsInfo || '{}');
					} catch (e) {
						goodsInfo = {};
					}
				}
				goodsInfo = goodsInfo || {};
				var dateStr = goodsInfo.date || item.date;
				var timeList = goodsInfo.time_list || item.time_list || [];
				if (!dateStr || !timeList.length) return true;
				var lastSlot = timeList[timeList.length - 1];
				if (!lastSlot || !lastSlot[1]) return true;
				var apptEndStr = dateStr + ' ' + lastSlot[1] + ':00';
				var apptEndTime = new Date(apptEndStr.replace(/-/g, '/'));
				return apptEndTime.getTime() >= Date.now();
			},
			isPendingTicket(item) {
				if (!item || item.order_type !== 6) return false;
				if (item.verified_at) return false;
				if (!item.expire_at) return true;
				var expireTime = new Date(item.expire_at < 1e12 ? item.expire_at * 1000 : item.expire_at);
				return expireTime.getTime() >= Date.now();
			},
			async loadCouponCounts() {
				if (!this.hasLogin) return;
				try {
					const availableRes = await AUTH.getCouponList(this.token);
					if (availableRes._status === 0 && availableRes.data) {
						this.claimableCouponCount = availableRes.data.filter(function(item) {
							return !item.user_received && item.remaining_count !== 0;
						}).length;
					}
				} catch (e) {
					this.claimableCouponCount = 0;
				}
				try {
					const myRes = await AUTH.getMyCoupons(this.token, 0);
					if (myRes._status === 0 && myRes.data) {
						this.unusedCouponCount = myRes.data.length;
					}
				} catch (e) {
					this.unusedCouponCount = 0;
				}
			},
			copyInviteCode() {
				if (!this.inviteCode) return;
				uni.setClipboardData({
					data: this.inviteCode,
					success: () => uni.showToast({ title: '复制成功', icon: 'success' })
				});
			},
			navTo(url) {
				uni.navigateTo({ url });
			},
			openAuthorizationModal() {
				uni.navigateTo({ url: '/pages/user/setting/setting' });
			},
			resetUserPageState() {
				this.orderCounts = { waitPay: 0, waitUse: 0 };
				this.checkInInfo = { checked_in_today: false, current_streak: 0, can_check_in: true, points_earned_today: 0 };
				this.inviteInfo = {};
				this.claimableCouponCount = 0;
				this.unusedCouponCount = 0;
			},
			loadCanvasImage(canvas, src) {
				return new Promise(function(resolve, reject) {
					if (!canvas || typeof canvas.createImage !== 'function') {
						reject(new Error('canvas 2d image api unavailable'));
						return;
					}
					var image = canvas.createImage();
					image.onload = function() {
						resolve(image);
					};
					image.onerror = reject;
					image.src = src;
				});
			},
			drawInvitePoster(ctx, bgImage, code) {
				ctx.clearRect(0, 0, 500, 400);
				if (bgImage) {
					ctx.drawImage(bgImage, 0, 0, 500, 400);
				} else {
					ctx.fillStyle = '#FFF8F0';
					ctx.fillRect(0, 0, 500, 400);
				}
				ctx.fillStyle = 'rgba(255, 140, 66, 0.92)';
				ctx.fillRect(42, 255, 416, 76);
				ctx.fillStyle = '#FFFFFF';
				ctx.font = '14px sans-serif';
				ctx.fillText('我的专属邀请码', 60, 282);
				ctx.fillStyle = '#FFFFFF';
				ctx.font = '30px sans-serif';
				ctx.fillText(code, 60, 318);
				ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
				ctx.font = '13px sans-serif';
				ctx.fillText('好友首次加入', 315, 284);
				ctx.fillText('双方都有奖励', 315, 313);
			},
			generateInvitePoster() {
				var code = this.inviteCode;
				if (!code) return;
				var query = uni.createSelectorQuery().in(this);
				query.select('#invitePoster').fields({ node: true, size: true }).exec(function(res) {
					var nodeInfo = res && res[0];
					var canvas = nodeInfo && nodeInfo.node;
					if (!canvas || typeof canvas.getContext !== 'function') return;

					var posterWidth = 500;
					var posterHeight = 400;
					var systemInfo = PLATFORM.getSystemInfo();
					var dpr = Number(systemInfo.pixelRatio || 1);
					canvas.width = posterWidth * dpr;
					canvas.height = posterHeight * dpr;

					var ctx = canvas.getContext('2d');
					ctx.save();
					ctx.scale(dpr, dpr);
					this.loadCanvasImage(canvas, '/static/share_invite.jpg').then(function(bgImage) {
						this.drawInvitePoster(ctx, bgImage, code);
					}.bind(this)).catch(function() {
						this.drawInvitePoster(ctx, null, code);
					}.bind(this)).then(function() {
						ctx.restore();
						uni.canvasToTempFilePath({
							canvas: canvas,
							x: 0,
							y: 0,
							width: posterWidth,
							height: posterHeight,
							destWidth: posterWidth * dpr,
							destHeight: posterHeight * dpr,
							success: function(fileRes) {
								this.shareImagePath = fileRes.tempFilePath;
							}.bind(this)
						}, this);
					}.bind(this));
				}.bind(this));
			},
		},
		onShareAppMessage() {
			const path = this.inviteCode
				? '/pages/index/index?invite_code=' + this.inviteCode
				: '/pages/index/index';
			AUTH.trackEvent({
				event: 'share_invite',
				page_path: 'pages/user/user',
				share_type: 'wechat_session',
				source: 'invite_card',
				has_invite: !!this.inviteCode
			}, this.token).catch(function() {});
			return {
				title: '我在摸鱼划水吧等你，一起来玩还有奖励！',
				imageUrl: this.shareImagePath || '/static/share_invite.jpg',
				path: path,
			};
		},
		onShareTimeline() {
			AUTH.trackEvent({
				event: 'share_invite',
				page_path: 'pages/user/user',
				share_type: 'timeline',
				source: 'invite_card',
				has_invite: !!this.inviteCode
			}, this.token).catch(function() {});
			return {
				title: '还在996？快来摸鱼划水吧充电回血',
				imageUrl: this.shareImagePath || '/static/share_invite.jpg',
				query: this.inviteCode
					? 'invite_code=' + this.inviteCode
					: '',
			};
		},
		onAddToFavorites() {
			AUTH.trackEvent({
				event: 'share_favorite',
				page_path: 'pages/user/user',
				source: 'user_center'
			}, this.token).catch(function() {});
			return {
				title: '摸鱼划水吧 — 福州最舒服的线下娱乐空间',
				imageUrl: '/static/share_home.jpg',
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

.invite-poster-canvas {
	width: 500px;
	height: 400px;
	position: fixed;
	left: -9999px;
	top: 0;
	pointer-events: none;
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
.profile-info .member-no {
	display: inline-block;
	font-size: 20rpx;
	color: #999;
	background: #f5f5f5;
	padding: 2rpx 10rpx;
	border-radius: 10rpx;
	margin-top: 6rpx;
	margin-left: 8rpx;
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
	flex: 1;
	min-width: 0;
}
.qstat-item .qstat-num {
	font-size: 34rpx;
	font-weight: 800;
	color: #5C4B3A;
	background: linear-gradient(135deg, #FF8C42, #FFCC80);
	-webkit-background-clip: text;
	-webkit-text-fill-color: transparent;
	background-clip: text;
	max-width: 190rpx;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.qstat-item .qstat-label { font-size: 22rpx; color: #A09080; margin-top: 4rpx; }
.qstat-divider {
	width: 2rpx;
	height: 50rpx;
	background: linear-gradient(to bottom, transparent, #F0E6D8, transparent);
}

/* ===== 成长卡片 ===== */
.growth-card {
	margin: 24rpx 24rpx 24rpx;
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

.checkin-broken {
	margin: 0 32rpx 16rpx;
	padding: 12rpx 20rpx;
	background: #FFEBEE;
	border-radius: 12rpx;
	font-size: 24rpx;
	color: #C62828;
	text-align: center;
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

	.order-header {
		padding: 0;
		margin-bottom: 20rpx;
	}
	.order-title-wrap {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
	}
	.order-section-sub {
		font-size: 22rpx;
		color: #B9A998;
	}
	.order-primary-grid {
		display: flex;
		gap: 16rpx;
	}
	.order-primary-item {
		flex: 1;
		min-height: 132rpx;
		border-radius: 20rpx;
		padding: 22rpx 18rpx;
		display: flex;
		align-items: center;
		gap: 16rpx;
		position: relative;
		border: 1rpx solid rgba(255, 220, 180, 0.75);
		transition: transform 0.15s, opacity 0.15s;
	}
	.order-primary-item.pay {
		background: #FFF7EF;
	}
	.order-primary-item.use {
		background: #F0FAF3;
		border-color: rgba(180, 226, 195, 0.75);
	}
	.order-primary-item:active {
		transform: scale(0.97);
		opacity: 0.9;
	}
	.order-primary-icon {
		width: 56rpx;
		height: 56rpx;
		border-radius: 18rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #FFF;
		box-shadow: 0 4rpx 12rpx rgba(140, 100, 60, 0.08);
		flex-shrink: 0;
		text {
			font-size: 26rpx;
			font-weight: bold;
			color: #FF8C42;
		}
	}
	.order-primary-copy {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.order-primary-title {
		font-size: 28rpx;
		font-weight: bold;
		color: #5C4B3A;
	}
	.order-primary-sub {
		font-size: 21rpx;
		color: #A09080;
		margin-top: 8rpx;
		line-height: 1.25;
	}
	.order-badge {
		position: absolute;
		top: 12rpx;
		right: 14rpx;
		background: #FF8C42;
		border-radius: 20rpx;
		min-width: 32rpx;
		height: 32rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 8rpx;
		text { font-size: 18rpx; color: #fff; font-weight: bold; }
	}
	.order-secondary-row {
		margin-top: 18rpx;
		padding-top: 18rpx;
		border-top: 1rpx solid #F4ECE2;
		display: flex;
		gap: 14rpx;
	}
	.order-secondary-item {
		flex: 1;
		height: 64rpx;
		border-radius: 32rpx;
		background: #FAF7F2;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8rpx;
		transition: background 0.15s, transform 0.15s;
	}
	.order-secondary-item:active {
		background: #FFF0E0;
		transform: scale(0.97);
	}
	.secondary-icon {
		width: 30rpx;
		height: 30rpx;
		border-radius: 50%;
		background: #FFF;
		color: #FF8C42;
		font-size: 18rpx;
		font-weight: bold;
		text-align: center;
		line-height: 30rpx;
	}
	.secondary-text {
		font-size: 23rpx;
		color: #8C7B6B;
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

/* ===== 今日行动 ===== */
.retention-panel {
	margin: 0 24rpx 24rpx;
	background: #FFF;
	border-radius: 24rpx;
	padding: 24rpx;
	box-shadow: 0 8rpx 32rpx rgba(140, 100, 60, 0.06);
	border: 1rpx solid rgba(240, 230, 216, 0.6);
}
.retention-head {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	margin-bottom: 18rpx;
	gap: 18rpx;
}
.retention-title {
	display: block;
	font-size: 30rpx;
	font-weight: bold;
	color: #5C4B3A;
}
.retention-sub {
	display: block;
	font-size: 22rpx;
	color: #A09080;
	margin-top: 4rpx;
}
.retention-note {
	flex-shrink: 0;
	font-size: 20rpx;
	color: #FF8C42;
	background: #FFF5EE;
	padding: 6rpx 14rpx;
	border-radius: 18rpx;
	font-weight: bold;
}
.retention-grid {
	display: grid;
	grid-template-columns: 1fr 1fr 1fr;
	gap: 12rpx;
}
.retention-card {
	min-height: 150rpx;
	border-radius: 18rpx;
	padding: 16rpx 12rpx;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	border: 1rpx solid rgba(240, 230, 216, 0.7);
}
.retention-card.check { background: #FFF5EE; }
.retention-card.coupon { background: #FFF8E7; }
.retention-card.order { background: #EEF8F1; }
.retention-icon {
	width: 42rpx;
	height: 42rpx;
	border-radius: 14rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background: #FFF;
	color: #FF8C42;
	font-size: 22rpx;
	font-weight: bold;
}
.retention-copy {
	min-width: 0;
}
.retention-card-title {
	display: block;
	font-size: 25rpx;
	font-weight: bold;
	color: #5C4B3A;
	line-height: 1.25;
}
.retention-card-sub {
	display: block;
	font-size: 20rpx;
	color: #8C7B6B;
	line-height: 1.35;
	margin-top: 6rpx;
}
.retention-rewards {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 10rpx;
	margin-top: 16rpx;
	padding-top: 16rpx;
	border-top: 1rpx solid #F0E6D8;
}
.retention-rewards-label {
	font-size: 21rpx;
	color: #A09080;
}
.retention-reward-item {
	font-size: 21rpx;
	color: #FF8C42;
	background: #FFF5EE;
	padding: 4rpx 10rpx;
	border-radius: 18rpx;
}

/* ===== 游客权益引导 ===== */
.guest-benefit-card {
	margin: 0 24rpx 24rpx;
	background: #FFF;
	border-radius: 24rpx;
	padding: 28rpx 24rpx;
	box-shadow: 0 8rpx 32rpx rgba(140, 100, 60, 0.06);
	border: 1rpx solid rgba(240, 230, 216, 0.6);
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 18rpx;
}
.guest-benefit-main {
	flex: 1;
	min-width: 0;
}
.guest-benefit-title {
	display: block;
	font-size: 30rpx;
	font-weight: bold;
	color: #5C4B3A;
}
.guest-benefit-sub {
	display: block;
	margin-top: 8rpx;
	font-size: 23rpx;
	line-height: 1.45;
	color: #A09080;
}
.guest-benefit-btn {
	flex-shrink: 0;
	background: #FF8C42;
	color: #FFF;
	font-size: 24rpx;
	font-weight: bold;
	padding: 12rpx 24rpx;
	border-radius: 28rpx;
	box-shadow: 0 4rpx 14rpx rgba(255, 140, 66, 0.22);
}
</style>
