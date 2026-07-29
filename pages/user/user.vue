<template>
	<view class="page-wrapper">
		<!-- 自定义导航栏 -->
		<view class="custom-nav">
			<view class="nav-content">
				<text class="nav-title">个人中心</text>
			</view>
		</view>

		<!-- 用户身份与资产 -->
		<view class="profile-panel">
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

			<view class="asset-grid">
				<view class="asset-item" @tap="goBalance">
					<text class="asset-value">{{ balanceText }}</text>
					<text class="asset-label">余额</text>
				</view>
				<view class="asset-item" @tap="goPointsCenter">
					<text class="asset-value">{{ hasLogin ? (userInfo && userInfo.points || 0) : '-' }}</text>
					<text class="asset-label">积分</text>
				</view>
				<view class="asset-item" @tap="goCouponCenter">
					<text class="asset-value">{{ couponAssetText }}</text>
					<text class="asset-label">优惠券</text>
				</view>
				<view class="asset-item" @tap="goCardPack">
					<text class="asset-value small">{{ hasLogin ? '查看' : '-' }}</text>
					<text class="asset-label">卡包</text>
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

		<!-- 订单优先展示 -->
		<view class="surface-section order-section">
			<view class="section-head">
				<view>
					<text class="section-title">我的订单</text>
					<text class="section-sub">{{ hasLogin ? orderSectionHint : '登录后查看预约和门票' }}</text>
				</view>
				<text class="section-link" @tap="goOrderList(0)">全部订单</text>
			</view>
			<view class="order-grid">
				<view class="order-entry pay" @tap="goOrderList(1)">
					<view class="order-entry-mark">付</view>
					<text class="order-entry-label">待付款</text>
					<text class="order-entry-count" v-if="orderCounts.waitPay > 0">{{ orderCounts.waitPay > 99 ? '99+' : orderCounts.waitPay }}</text>
				</view>
				<view class="order-entry use" @tap="goOrderList(2)">
					<view class="order-entry-mark">用</view>
					<text class="order-entry-label">待使用</text>
					<text class="order-entry-count" v-if="orderCounts.waitUse > 0">{{ orderCounts.waitUse > 99 ? '99+' : orderCounts.waitUse }}</text>
				</view>
				<view class="order-entry" @tap="goOrderList(0)">
					<view class="order-entry-mark">单</view>
					<text class="order-entry-label">全部</text>
				</view>
				<view class="order-entry" @tap="goOrderList(3)">
					<view class="order-entry-mark">成</view>
					<text class="order-entry-label">已完成</text>
				</view>
			</view>
		</view>

		<!-- 每日签到保留轻游戏化反馈 -->
		<view class="surface-section checkin-section" v-if="hasLogin">
			<view class="section-head compact">
				<view>
					<text class="section-title">每日投骰</text>
					<text class="section-sub">{{ checkInActionSub }}</text>
				</view>
				<text class="checkin-reward">{{ checkInPointsText }}</text>
			</view>
			<view :class="checkInMainClass">
				<view class="mini-dice-face">
					<view
						v-for="dot in checkInDiceDots"
						:key="dot.key"
						:class="dot.className"
					></view>
				</view>
				<view class="checkin-copy">
					<text class="checkin-title">{{ checkInActionTitle }}</text>
					<text class="checkin-sub">坚持回访，连续签到还有额外奖励</text>
				</view>
				<view class="checkin-button" @tap="doCheckIn">{{ checkInButtonText }}</view>
			</view>
			<view class="checkin-toggle" @tap="toggleCheckInBoard">
				<text>{{ checkInBoardToggleText }}</text>
				<text class="checkin-toggle-arrow">{{ checkInBoardToggleArrow }}</text>
			</view>
			<view class="checkin-board" v-if="checkInBoardExpanded">
				<view class="checkin-board-head">
					<text class="checkin-board-title">7日棋盘</text>
					<text class="checkin-board-sub">{{ checkInBoardSummary }}</text>
				</view>
				<view class="checkin-board-track">
					<view
						v-for="step in checkInBoardSteps"
						:key="step.day"
						:class="step.className"
					>
						<text class="board-step-icon">{{ step.icon }}</text>
						<text class="board-step-day">{{ step.dayText }}</text>
						<text class="board-step-reward" v-if="step.rewardText">{{ step.rewardText }}</text>
					</view>
				</view>
			</view>
			<view class="retention-rewards" v-if="checkInBoardExpanded && checkInInfo.config && checkInInfo.config.milestones">
				<text class="retention-rewards-label">连续签到奖励</text>
				<text class="retention-reward-item" v-for="(m, idx) in checkInInfo.config.milestones" :key="idx">
					{{ m.days }}天+{{ m.bonus_points }}
				</text>
			</view>
			<view class="checkin-broken" v-if="checkInInfo.is_broken_streak">
				<text>连续签到已中断，今日从第1天重新开始</text>
			</view>
		</view>

		<!-- 会员成长与权益合并 -->
		<view class="surface-section member-section" v-if="hasLogin && memberConfig.length > 0">
			<view class="section-head compact">
				<view class="member-current">
					<view class="member-current-mark" :style="memberBgStyle">{{ memberIcon }}</view>
					<view>
						<text class="section-title">{{ memberLevelName }}</text>
						<text class="section-sub">累计消费 ¥{{ totalConsumeText }}</text>
					</view>
				</view>
				<view class="member-discount" :style="memberBgStyle">{{ currentDiscountText }}</view>
			</view>
			<view class="member-progress-head">
				<text v-if="nextLevelName">距离{{ nextLevelName }}还差 ¥{{ needToNext }}</text>
				<text v-else>已解锁当前全部会员折扣</text>
				<text>{{ progressPercent }}%</text>
			</view>
			<view class="member-progress">
				<view class="member-progress-fill" :style="progressFillStyle"></view>
			</view>
			<view class="member-level-track">
				<view v-for="lv in memberBenefitLevels" :key="lv.level" :class="lv.className">
					<text class="member-level-icon">{{ lv.icon }}</text>
					<text class="member-level-name">{{ lv.name }}</text>
					<text class="member-level-discount">{{ lv.discountText }}</text>
				</view>
			</view>
		</view>

		<!-- 常用服务 -->
		<view class="surface-section service-section">
			<view class="section-head compact">
				<view>
					<text class="section-title">常用服务</text>
					<text class="section-sub">门票、组局和会员服务</text>
				</view>
			</view>
			<view class="service-grid">
				<view class="service-item" @tap="goTicketList">
					<text class="service-mark green">票</text>
					<text class="service-name">我的门票</text>
				</view>
				<view class="service-item" @tap="goGroup">
					<text class="service-mark orange">组</text>
					<text class="service-name">我的组局</text>
				</view>
				<view class="service-item" @tap="goDeposit">
					<text class="service-mark blue">充</text>
					<text class="service-name">充值余额</text>
				</view>
				<view class="service-item" @tap="goSubscriptionMall">
					<text class="service-mark orange">省</text>
					<text class="service-name">常客省钱卡</text>
				</view>
				<view class="service-item" @tap="goReviews">
					<text class="service-mark green">评</text>
					<text class="service-name">我的评价</text>
				</view>
				<view class="service-item" @tap="goDeviceHelp">
					<text class="service-mark blue">帮</text>
					<text class="service-name">包厢帮助</text>
				</view>
			</view>
		</view>

		<!-- 邀请奖励降为次要入口 -->
		<view class="surface-section invite-section" v-if="hasLogin">
			<view class="invite-main">
				<text class="invite-mark">礼</text>
				<view class="invite-copy">
					<text class="invite-title">邀请有礼</text>
					<text class="invite-desc">好友注册成功，双方都有奖励</text>
				</view>
				<button class="invite-share-btn" open-type="share">邀请</button>
			</view>
			<view class="invite-meta" v-if="inviteCode">
				<text>邀请码 {{ inviteCode }}</text>
				<text class="invite-copy-link" @tap="copyInviteCode">复制</text>
				<text class="invite-count">已邀请{{ inviteInfo.total_invites || 0 }}人</text>
			</view>
		</view>

		<view class="utility-row" @tap="goSettings">
			<text class="utility-mark">设</text>
			<text class="utility-text">账号与设置</text>
			<text class="utility-arrow">›</text>
		</view>

		<!-- 隐藏 canvas 用于生成专属邀请海报 -->
		<canvas id="invitePoster" type="2d" class="invite-poster-canvas"></canvas>
	</view>
</template>

<script>
	import AUTH from '../../utils/auth.js'
	import PLATFORM from '../../common/platform.js'
	import {
		mapState,
		mapActions,
		mapMutations
	} from 'vuex';


	export default {
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
				return 'width: ' + this.progressPercent + '%; background: ' + this.memberColor + ';';
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
			couponAssetText() {
				if (!this.hasLogin) return '-';
				if (this.claimableCouponCount > 0) return '可领' + this.claimableCouponCount;
				return String(this.unusedCouponCount || 0);
			},
			checkInPointsText() {
				var points = this.checkInInfo.next_points || (this.checkInInfo.config && this.checkInInfo.config.daily_points) || 10;
				return '+' + points + '积分';
			},
			checkInActionTitle() {
				if (this.checkInInfo.checked_in_today) return '今日已投骰';
				if (this.checkInInfo.can_check_in) return '投骰' + this.checkInPointsText;
				return '明天继续';
			},
			checkInActionSub() {
				if (this.checkInInfo.current_streak > 0) return '棋盘第' + this.checkInBoardCurrentDay + '格 · 连续' + this.checkInInfo.current_streak + '天';
				return this.checkInInfo.can_check_in ? '投骰点亮棋盘' : '保持回访';
			},
			checkInDiceNumber() {
				var streak = Number(this.checkInInfo.current_streak || 0);
				var points = Number(this.checkInInfo.points_earned_today || this.checkInInfo.next_points || 0);
				if (this.checkInInfo.can_check_in) streak += 1;
				return this.getCheckInDiceNumber(streak, points);
			},
			checkInDiceDots() {
				return this.buildDiceDots(this.checkInDiceNumber, 'mini-dice-dot ');
			},
			checkInMainClass() {
				var names = ['checkin-main'];
				if (this.checkInInfo.checked_in_today) names.push('done');
				if (this.checkInLoading) names.push('loading');
				return names.join(' ');
			},
			checkInButtonText() {
				if (this.checkInLoading) return '投骰中';
				if (this.checkInInfo.checked_in_today) return '已签到';
				if (this.checkInInfo.can_check_in) return '投骰签到';
				return '明天再来';
			},
			checkInBoardToggleText() {
				return this.checkInBoardExpanded ? '收起7日棋盘' : '查看7日棋盘与连续奖励';
			},
			checkInBoardToggleArrow() {
				return this.checkInBoardExpanded ? '↑' : '↓';
			},
			checkInBoardCompletedDay() {
				var raw = Number(this.checkInInfo.current_streak || 0);
				if (raw <= 0) return 0;
				if (!this.checkInInfo.checked_in_today && raw % 7 === 0) return 0;
				return this.getBoardDay(raw);
			},
			checkInBoardCurrentDay() {
				var raw = Number(this.checkInInfo.current_streak || 0);
				if (this.checkInInfo.checked_in_today) return this.getBoardDay(raw);
				return this.getBoardDay(raw + 1);
			},
			checkInMilestoneMap() {
				var map = {};
				var milestones = (this.checkInInfo.config && this.checkInInfo.config.milestones) || [];
				milestones.forEach(function(item) {
					var day = Number(item.days || 0);
					if (day >= 1 && day <= 7) {
						map[day] = Number(item.bonus_points || 0);
					}
				});
				return map;
			},
			checkInBoardSteps() {
				var steps = [];
				var completedDay = this.checkInBoardCompletedDay;
				var currentDay = this.checkInBoardCurrentDay;
				var milestoneMap = this.checkInMilestoneMap;
				for (var day = 1; day <= 7; day += 1) {
					var isDone = completedDay > 0 && day <= completedDay;
					var isCurrent = day === currentDay;
					var reward = milestoneMap[day] || 0;
					var classes = ['board-step'];
					if (isDone) classes.push('done');
					if (isCurrent) classes.push('current');
					if (reward > 0) classes.push('reward');
					steps.push({
						day: day,
						dayText: day + '天',
						rewardText: reward > 0 ? '+' + reward : '',
						icon: isDone ? '✓' : (isCurrent ? '今' : (reward > 0 ? '箱' : '点')),
						className: classes.join(' ')
					});
				}
				return steps;
			},
			checkInBoardSummary() {
				var streak = Number(this.checkInInfo.current_streak || 0);
				if (this.checkInInfo.checked_in_today) return '已点亮本轮第' + this.checkInBoardCurrentDay + '格，连续' + streak + '天';
				return '今日投骰后点亮第' + this.checkInBoardCurrentDay + '格';
			},
			orderSectionHint() {
				if (this.orderCounts.waitPay > 0) return '待付款 ' + this.orderCounts.waitPay + ' 单';
				if (this.orderCounts.waitUse > 0) return '待使用 ' + this.orderCounts.waitUse + ' 单';
				return '暂无待处理订单';
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
				return Math.max(0, Math.min(100, ((total - curr) / (next - curr)) * 100)).toFixed(0);
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
				}.bind(this));
			},
		},
		data() {
			return {
				orderCounts: { waitPay: 0, waitUse: 0 },
				checkInInfo: { checked_in_today: false, current_streak: 0, can_check_in: true, points_earned_today: 0 },
				checkInLoading: false,
				checkInBoardExpanded: false,
				inviteInfo: {},
				memberConfig: [],
				claimableCouponCount: 0,
				unusedCouponCount: 0,
				shareImagePath: '',
			};
		},
		onShow() {
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
			ensureLoggedIn() {
				if (this.hasLogin) return true;
				this.handleLogin();
				return false;
			},
			goBalance() {
				if (!this.ensureLoggedIn()) return;
				this.navTo('/pages/user/balance/balance');
			},
			goCardPack() {
				if (!this.ensureLoggedIn()) return;
				this.navTo('/pages/user/subscription/my');
			},
			goTicketList() {
				if (!this.ensureLoggedIn()) return;
				this.navTo('/pages/ticket/list');
			},
			goDeposit() {
				if (!this.ensureLoggedIn()) return;
				this.navTo('/pages/user/deposit/deposit');
			},
			goReviews() {
				if (!this.ensureLoggedIn()) return;
				this.navTo('/pages/my/reviews');
			},
			goDeviceHelp() {
				this.navTo('/pages/help/device');
			},
			goSettings() {
				if (!this.ensureLoggedIn()) return;
				this.navTo('/pages/user/setting/setting');
			},
			goGroup() {
				if (!this.ensureLoggedIn()) return;
				uni.navigateTo({ url: '/pages/group/my' });
			},
			goCouponCenter() {
				if (!this.ensureLoggedIn()) return;
				if (this.claimableCouponCount > 0) {
					uni.navigateTo({ url: '/pages/my/coupons/coupons?tab=available' });
				} else if (this.unusedCouponCount > 0) {
					uni.navigateTo({ url: '/pages/my/coupons/coupons?tab=unused' });
				} else {
					uni.navigateTo({ url: '/pages/my/coupons/coupons' });
				}
			},
			goPointsCenter() {
				if (!this.ensureLoggedIn()) return;
				uni.setStorageSync('voucherInitialTab', 'points');
				uni.switchTab({ url: '/pages/voucher/voucher' });
			},
			goSubscriptionMall() {
				AUTH.trackEvent({
					event: 'subscription_entry_click',
					page_path: 'pages/user/user',
					source: 'user_center'
				}, this.token).catch(function() {});
				uni.navigateTo({ url: '/pages/user/subscription/buy?source=user_center' });
			},
			goOrderList(state) {
				if (!this.ensureLoggedIn()) return;
				this.navTo('/pages/order/order?state=' + state);
			},
			toggleCheckInBoard() {
				this.checkInBoardExpanded = !this.checkInBoardExpanded;
			},
			getBoardDay(rawDay) {
				rawDay = Number(rawDay || 0);
				if (rawDay <= 0) return 1;
				var day = rawDay % 7;
				return day === 0 ? 7 : day;
			},
			getCheckInDiceNumber(streak, points) {
				var seed = Number(streak || 0) + Number(points || 0);
				if (!seed || seed < 1) seed = 1;
				return ((seed - 1) % 6) + 1;
			},
			buildDiceDots(number, prefix) {
				var map = {
					1: ['center'],
					2: ['top-left', 'bottom-right'],
					3: ['top-left', 'center', 'bottom-right'],
					4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
					5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
					6: ['top-left', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-right']
				};
				var positions = map[number] || map[1];
				prefix = prefix || 'dice-dot ';
				return positions.map(function(pos, idx) {
					return {
						key: 'dot' + idx,
						className: prefix + pos
					};
				});
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
				if (this.checkInLoading) return;
				AUTH.trackEvent({
					event: 'checkin_click',
					page_path: 'pages/user/user',
					source: 'user_center'
				}, this.token).catch(function() {});
				if (!this.checkInInfo.can_check_in) {
					uni.showToast({ title: '今日已签到', icon: 'none' });
					return;
				}
				this.checkInLoading = true;
				try {
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
						this.checkInBoardExpanded = true;
						this.showCheckInSuccess(d);
					} else {
						uni.showToast({ title: (d && d.message) || '签到失败', icon: 'none' });
					}
				} catch (e) {
					uni.showToast({ title: '签到失败', icon: 'none' });
				} finally {
					this.checkInLoading = false;
				}
			},
			showCheckInSuccess(data) {
				data = data || {};
				var points = Number(data.points_earned || 0);
				var streak = Number(this.checkInInfo.current_streak || 0);
				var dice = this.getCheckInDiceNumber(streak, points);
				var content = '你投出了 ' + dice + ' 点，本次获得 +' + points + ' 积分';
				if (streak > 0) {
					content += '\n棋盘进度：第' + this.checkInBoardCurrentDay + '格，连续' + streak + '天';
				}
				if (this.checkInInfo.tomorrow_points) {
					content += '\n明天继续签到可领 +' + this.checkInInfo.tomorrow_points + ' 积分';
				} else {
					content += '\n连续签到还有额外奖励';
				}
				uni.showModal({
					title: '投骰成功',
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
							return item.can_receive !== false && !item.user_received && item.remaining_count !== 0;
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
				this.checkInBoardExpanded = false;
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
	padding-bottom: 32rpx;
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
	background: #FFFFFF;
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

/* ===== 用户卡片 ===== */
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
	background: #C96B3F;
	color: #fff;
	padding: 14rpx 36rpx;
	border-radius: 32rpx;
	font-size: 26rpx;
	font-weight: bold;
	box-shadow: 0 4rpx 16rpx rgba(255, 140, 66, 0.25);
}

.mini-dice-face {
	position: relative;
	width: 44rpx;
	height: 44rpx;
	border-radius: 12rpx;
	background: #FFF;
	border: 2rpx solid #5C4B3A;
	box-shadow: 0 5rpx 0 rgba(92,75,58,0.12), inset 0 -4rpx 0 rgba(92,75,58,0.06);
	box-sizing: border-box;
	flex-shrink: 0;
}
.mini-dice-dot {
	position: absolute;
	width: 7rpx;
	height: 7rpx;
	border-radius: 999rpx;
	background: #5C4B3A;
}
.mini-dice-dot.top-left { left: 9rpx; top: 9rpx; }
.mini-dice-dot.top-right { right: 9rpx; top: 9rpx; }
.mini-dice-dot.middle-left { left: 9rpx; top: 19rpx; }
.mini-dice-dot.middle-right { right: 9rpx; top: 19rpx; }
.mini-dice-dot.center { left: 19rpx; top: 19rpx; }
.mini-dice-dot.bottom-left { left: 9rpx; bottom: 9rpx; }
.mini-dice-dot.bottom-right { right: 9rpx; bottom: 9rpx; }
.checkin-board {
	margin-top: 18rpx;
	padding: 18rpx 14rpx 16rpx;
	border-radius: 18rpx;
	background: #FFFDF8;
	border: 1rpx solid rgba(240, 230, 216, 0.8);
}
.checkin-board-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 14rpx;
	margin-bottom: 14rpx;
}
.checkin-board-title {
	font-size: 24rpx;
	font-weight: bold;
	color: #5C4B3A;
	flex-shrink: 0;
}
.checkin-board-sub {
	font-size: 20rpx;
	color: #9B8A78;
	text-align: right;
	line-height: 1.3;
}
.checkin-board-track {
	display: grid;
	grid-template-columns: repeat(7, minmax(0, 1fr));
	gap: 8rpx;
}
.board-step {
	min-width: 0;
	min-height: 86rpx;
	border-radius: 16rpx;
	background: #F7F1E8;
	border: 1rpx solid rgba(92,75,58,0.08);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 6rpx 2rpx;
	box-sizing: border-box;
}
.board-step.done {
	background: #EAF7EC;
	border-color: rgba(74,154,74,0.18);
}
.board-step.current {
	border-color: #FF8C42;
	box-shadow: 0 6rpx 16rpx rgba(255,140,66,0.14);
}
.board-step.reward {
	background: #FFF5E5;
}
.board-step.reward.done {
	background: #F4FBF0;
}
.board-step-icon {
	font-size: 20rpx;
	font-weight: bold;
	color: #FF8C42;
	line-height: 1.1;
}
.board-step.done .board-step-icon {
	color: #4A9A4A;
}
.board-step-day {
	font-size: 18rpx;
	color: #6B5B4B;
	line-height: 1.2;
	margin-top: 5rpx;
}
.board-step-reward {
	font-size: 17rpx;
	color: #FF8C42;
	line-height: 1.15;
	margin-top: 3rpx;
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

@keyframes mini-dice-roll {
	0% { transform: rotate(0deg) scale(1); }
	50% { transform: rotate(10deg) scale(1.06); }
	100% { transform: rotate(0deg) scale(1); }
}

/* ===== 个人中心轻游戏化重构 ===== */
page {
	background: #F7F5F1;
}

.page-wrapper {
	padding-bottom: calc(40rpx + env(safe-area-inset-bottom));
}

.custom-nav {
	background: #FFFFFF;
	border-bottom: 1rpx solid #EAE5DF;
	box-shadow: none;
}

.nav-title {
	color: #332D28;
	font-size: 32rpx;
}

.profile-panel {
	background: #4E7754;
	padding: 30rpx 24rpx 24rpx;
	margin-bottom: 16rpx;
}

.profile-panel .profile-top {
	margin-bottom: 0;
}

.profile-panel .profile-info {
	min-width: 0;
}

.profile-panel .avatar-wrap .avatar {
	width: 96rpx;
	height: 96rpx;
	border-color: rgba(255, 255, 255, 0.88);
}

.profile-panel .avatar-wrap .avatar-badge {
	border-color: #4E7754;
}

.profile-panel .profile-info .nickname {
	color: #FFFFFF;
	font-size: 34rpx;
	max-width: 300rpx;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.profile-panel .profile-info .member-no {
	color: rgba(255, 255, 255, 0.76);
	background: rgba(255, 255, 255, 0.12);
	margin-left: 0;
}

.profile-panel .edit-btn {
	background: rgba(255, 255, 255, 0.14);
	border-radius: 10rpx;
}

.profile-panel .edit-btn text {
	color: #FFFFFF;
}

.profile-panel .guest-tip {
	color: rgba(255, 255, 255, 0.72);
}

.profile-panel .login-btn {
	background: #C96B3F;
	border-radius: 10rpx;
	box-shadow: none;
}

.asset-grid {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	margin-top: 26rpx;
	padding-top: 22rpx;
	border-top: 1rpx solid rgba(255, 255, 255, 0.16);
}

.asset-item {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	min-width: 0;
	min-height: 76rpx;
}

.asset-item:not(:last-child)::after {
	content: '';
	position: absolute;
	right: 0;
	top: 12rpx;
	width: 1rpx;
	height: 48rpx;
	background: rgba(255, 255, 255, 0.14);
}

.asset-value {
	max-width: 150rpx;
	font-size: 30rpx;
	font-weight: 700;
	color: #FFFFFF;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.asset-value.small {
	font-size: 25rpx;
}

.asset-label {
	margin-top: 6rpx;
	font-size: 21rpx;
	color: rgba(255, 255, 255, 0.7);
}

.surface-section {
	margin: 0 0 16rpx;
	padding: 26rpx 24rpx;
	background: #FFFFFF;
	border-top: 1rpx solid #ECE7E1;
	border-bottom: 1rpx solid #ECE7E1;
	border-radius: 0;
	box-shadow: none;
}

.section-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 20rpx;
	margin-bottom: 22rpx;
}

.section-head > view {
	min-width: 0;
}

.section-head.compact {
	margin-bottom: 18rpx;
}

.section-title {
	display: block;
	font-size: 29rpx;
	font-weight: 700;
	color: #332D28;
}

.section-sub {
	display: block;
	margin-top: 5rpx;
	font-size: 21rpx;
	line-height: 1.35;
	color: #8B8178;
}

.section-link {
	flex-shrink: 0;
	font-size: 23rpx;
	color: #4E7754;
}

.order-section {
	padding: 26rpx 24rpx;
}

.order-grid {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: 12rpx;
}

.order-entry {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	min-width: 0;
	min-height: 112rpx;
	transition: opacity 0.15s, transform 0.15s;
}

.order-entry:active {
	opacity: 0.75;
	transform: scale(0.97);
}

.order-entry-mark {
	width: 54rpx;
	height: 54rpx;
	line-height: 54rpx;
	text-align: center;
	border-radius: 10rpx;
	background: #F2F0ED;
	color: #6F675F;
	font-size: 23rpx;
	font-weight: 700;
}

.order-entry.pay .order-entry-mark {
	background: #FFF0E7;
	color: #C96B3F;
}

.order-entry.use .order-entry-mark {
	background: #EAF4EC;
	color: #4E7754;
}

.order-entry-label {
	margin-top: 10rpx;
	font-size: 22rpx;
	color: #554E47;
	white-space: nowrap;
}

.order-entry-count {
	position: absolute;
	top: 0;
	right: 10rpx;
	min-width: 30rpx;
	height: 30rpx;
	padding: 0 7rpx;
	border-radius: 15rpx;
	box-sizing: border-box;
	background: #C96B3F;
	color: #FFFFFF;
	font-size: 18rpx;
	line-height: 30rpx;
	text-align: center;
}

.checkin-reward {
	flex-shrink: 0;
	padding: 6rpx 12rpx;
	border-radius: 8rpx;
	background: #FFF0E7;
	color: #C96B3F;
	font-size: 21rpx;
	font-weight: 700;
}

.checkin-main {
	display: flex;
	align-items: center;
	gap: 16rpx;
	min-height: 90rpx;
}

.checkin-main.loading .mini-dice-face {
	animation: mini-dice-roll 0.52s ease-in-out infinite;
}

.checkin-main.done .mini-dice-face {
	border-color: #4E7754;
	box-shadow: 0 4rpx 0 rgba(78, 119, 84, 0.16);
}

.checkin-main.done .mini-dice-dot {
	background: #4E7754;
}

.mini-dice-face {
	flex-shrink: 0;
	width: 48rpx;
	height: 48rpx;
	border-radius: 10rpx;
	border-color: #332D28;
	box-shadow: 0 4rpx 0 rgba(51, 45, 40, 0.12);
}

.checkin-copy {
	flex: 1;
	min-width: 0;
}

.checkin-title {
	display: block;
	font-size: 26rpx;
	font-weight: 700;
	color: #332D28;
}

.checkin-sub {
	display: block;
	margin-top: 5rpx;
	font-size: 20rpx;
	line-height: 1.35;
	color: #8B8178;
}

.checkin-button {
	flex-shrink: 0;
	min-width: 118rpx;
	height: 58rpx;
	padding: 0 16rpx;
	border-radius: 10rpx;
	box-sizing: border-box;
	background: #C96B3F;
	color: #FFFFFF;
	font-size: 22rpx;
	font-weight: 700;
	line-height: 58rpx;
	text-align: center;
}

.checkin-main.done .checkin-button {
	background: #E8E4DF;
	color: #777069;
}

.checkin-toggle {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-top: 18rpx;
	padding-top: 18rpx;
	border-top: 1rpx solid #EEEAE5;
	font-size: 22rpx;
	color: #4E7754;
}

.checkin-toggle-arrow {
	font-size: 24rpx;
}

.checkin-board {
	margin-top: 18rpx;
	padding: 18rpx 12rpx;
	border-radius: 8rpx;
	background: #FAF8F5;
	border-color: #ECE7E1;
}

.checkin-broken {
	margin: 16rpx 0 0;
	padding: 12rpx 16rpx;
	border-radius: 8rpx;
	background: #FFF0E7;
	color: #9C4E2D;
	font-size: 21rpx;
	text-align: left;
}

.member-current {
	display: flex;
	align-items: center;
	gap: 14rpx;
	min-width: 0;
}

.member-current-mark {
	flex-shrink: 0;
	width: 52rpx;
	height: 52rpx;
	border-radius: 10rpx;
	color: #FFFFFF;
	font-size: 25rpx;
	line-height: 52rpx;
	text-align: center;
}

.member-discount {
	flex-shrink: 0;
	padding: 6rpx 14rpx;
	border-radius: 8rpx;
	color: #FFFFFF;
	font-size: 22rpx;
	font-weight: 700;
}

.member-progress-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
	margin-bottom: 10rpx;
	font-size: 21rpx;
	color: #766E66;
}

.member-progress {
	height: 10rpx;
	border-radius: 5rpx;
	background: #ECE8E3;
	overflow: hidden;
}

.member-progress-fill {
	height: 100%;
	border-radius: 5rpx;
	transition: width 0.45s ease;
}

.member-level-track {
	display: flex;
	gap: 8rpx;
	margin-top: 20rpx;
}

.member-level-track .vip-level {
	flex: 1;
	min-width: 0;
	min-height: 92rpx;
	padding: 10rpx 4rpx;
	border-radius: 8rpx;
	background: #F5F3F0;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	opacity: 0.55;
	box-sizing: border-box;
}

.member-level-track .vip-level.active {
	background: #EEF5EF;
	opacity: 1;
}

.member-level-icon {
	font-size: 24rpx;
}

.member-level-name,
.member-level-discount {
	max-width: 100%;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.member-level-name {
	margin-top: 4rpx;
	font-size: 19rpx;
	color: #554E47;
}

.member-level-discount {
	margin-top: 2rpx;
	font-size: 18rpx;
	font-weight: 700;
	color: #4E7754;
}

.service-grid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	border-top: 1rpx solid #EEEAE5;
	border-left: 1rpx solid #EEEAE5;
}

.service-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	min-width: 0;
	min-height: 126rpx;
	border-right: 1rpx solid #EEEAE5;
	border-bottom: 1rpx solid #EEEAE5;
	transition: background 0.15s;
}

.service-item:active {
	background: #F8F6F3;
}

.service-mark,
.invite-mark,
.utility-mark {
	display: inline-block;
	width: 44rpx;
	height: 44rpx;
	border-radius: 8rpx;
	font-size: 21rpx;
	font-weight: 700;
	line-height: 44rpx;
	text-align: center;
}

.service-mark.orange,
.invite-mark {
	background: #FFF0E7;
	color: #C96B3F;
}

.service-mark.green {
	background: #EAF4EC;
	color: #4E7754;
}

.service-mark.blue,
.utility-mark {
	background: #EAF1F5;
	color: #557A95;
}

.service-name {
	margin-top: 10rpx;
	font-size: 22rpx;
	color: #554E47;
	white-space: nowrap;
}

.invite-main {
	display: flex;
	align-items: center;
	gap: 14rpx;
}

.invite-copy {
	flex: 1;
	min-width: 0;
}

.invite-title {
	display: block;
	font-size: 27rpx;
	font-weight: 700;
	color: #332D28;
}

.invite-desc {
	display: block;
	margin-top: 4rpx;
	font-size: 21rpx;
	color: #8B8178;
}

.invite-share-btn {
	flex-shrink: 0;
	width: 112rpx;
	height: 58rpx;
	margin: 0;
	padding: 0;
	border-radius: 10rpx;
	background: #C96B3F;
	color: #FFFFFF;
	font-size: 22rpx;
	font-weight: 700;
	line-height: 58rpx;
}

.invite-share-btn::after {
	border: 0;
}

.invite-meta {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 14rpx;
	margin-top: 18rpx;
	padding-top: 16rpx;
	border-top: 1rpx solid #EEEAE5;
	font-size: 21rpx;
	color: #8B8178;
}

.invite-copy-link {
	color: #C96B3F;
	font-weight: 700;
}

.invite-count {
	margin-left: auto;
	color: #8B8178;
}

.utility-row {
	display: flex;
	align-items: center;
	gap: 14rpx;
	min-height: 88rpx;
	padding: 0 24rpx;
	background: #FFFFFF;
	border-top: 1rpx solid #ECE7E1;
	border-bottom: 1rpx solid #ECE7E1;
}

.utility-text {
	flex: 1;
	font-size: 25rpx;
	color: #554E47;
}

.utility-arrow {
	font-size: 32rpx;
	color: #AAA39C;
}

.guest-benefit-card {
	margin: 0 0 16rpx;
	padding: 24rpx;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 18rpx;
	border-radius: 0;
	box-shadow: none;
	border: 0;
	border-bottom: 1rpx solid #ECE7E1;
	background: #FFFFFF;
}

.guest-benefit-main {
	flex: 1;
	min-width: 0;
}

.guest-benefit-title {
	display: block;
	font-size: 27rpx;
	font-weight: 700;
	color: #332D28;
}

.guest-benefit-sub {
	display: block;
	margin-top: 8rpx;
	font-size: 21rpx;
	line-height: 1.45;
	color: #8B8178;
}

.guest-benefit-btn {
	flex-shrink: 0;
	padding: 12rpx 24rpx;
	border-radius: 10rpx;
	background: #C96B3F;
	color: #FFFFFF;
	font-size: 24rpx;
	font-weight: 700;
	box-shadow: none;
}
</style>
