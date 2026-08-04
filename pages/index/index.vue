<template>
	<view class="page-wrapper">
		<!-- 只有大图活动才使用强曝光弹窗 -->
		<view class="marketing-popup" v-if="activeBanner" @tap="closeBanner">
			<view class="marketing-panel" @tap.stop>
				<view class="marketing-media" @tap="goBannerLink">
					<image class="marketing-image" :src="activeBanner.image_url" mode="aspectFill" />
					<view class="marketing-close" @tap.stop="closeBanner">✕</view>
				</view>
				<view class="marketing-copy">
					<text class="marketing-kicker">{{ activeBanner.tag || '店内活动' }}</text>
					<text class="marketing-title">{{ activeBanner.title }}</text>
					<text class="marketing-sub" v-if="activeBanner.subtitle">{{ activeBanner.subtitle }}</text>
				</view>
				<view :class="bannerActionsClass">
					<view class="marketing-secondary" v-if="bannerHasTarget" @tap.stop="closeBanner">稍后</view>
					<view class="marketing-primary" @tap.stop="goBannerLink">{{ bannerPrimaryText }}</view>
				</view>
			</view>
		</view>

		<!-- 入店须知 -->
		<view class="notice-popup" v-if="storeNoticeVisible" @tap="closeStoreNotice">
			<view class="notice-panel" @tap.stop>
				<view class="notice-head">
					<view>
						<text class="notice-kicker">到店前看一眼</text>
						<text class="notice-title">入店须知</text>
					</view>
					<view class="notice-close" @tap="closeStoreNotice">✕</view>
				</view>
				<view class="notice-list">
					<view class="notice-line">
						<text class="notice-dot">🎫</text>
						<text class="notice-copy">大厅票按人数购买，含大厅桌游、漫画小说、零食茶水自助。</text>
					</view>
					<view class="notice-line">
						<text class="notice-dot">🎮</text>
						<text class="notice-copy">包厢、主机等升级项目按小时另计，周末或多人局建议提前预约。</text>
					</view>
					<view class="notice-line" v-if="perlerEnabled">
						<text class="notice-dot">🧩</text>
						<text class="notice-copy">拼豆一日票{{ perlerDayPriceText }}，含大厅入场和1份标准材料。会员或当天有效的小程序订单按{{ perlerUpgradePriceText }}升级，外部团购由店员核验后按{{ perlerChannelUpgradePriceText }}办理。</text>
					</view>
					<view class="notice-line">
						<text class="notice-dot">↩️</text>
						<text class="notice-copy">门票未核销且未过期可退；预约订单按预约开始时间判断退款规则。</text>
					</view>
					<view class="notice-line">
						<text class="notice-dot">🍵</text>
						<text class="notice-copy">零食茶水按需取用，桌游和漫画用完请归位，方便下一位玩家。</text>
					</view>
					<view class="notice-line">
						<text class="notice-dot">📍</text>
						<text class="notice-copy">到店出示核销码或订单信息，店员会帮你安排入场。</text>
					</view>
				</view>
				<view class="notice-confirm" @tap="closeStoreNotice">知道了</view>
			</view>
		</view>

		<!-- 真实门店首屏 -->
		<view class="home-hero">
			<swiper class="hero-media" v-if="carouselList.length > 0" circular autoplay interval="5000" @change="swiperChange">
				<swiper-item v-for="(img, idx) in carouselList" :key="idx">
					<image class="hero-image" :src="img" mode="aspectFill" />
				</swiper-item>
			</swiper>
			<view class="hero-fallback" v-else>
				<image class="hero-logo" src="/static/logo_small.jpg" mode="aspectFit" />
				<text class="hero-fallback-text">桌游 · 漫画 · 拼豆 · 包厢</text>
			</view>
			<view class="hero-scrim"></view>
			<view class="hero-topbar">
				<view :class="storeStatusClass">
					<text class="store-status-dot"></text>
					<text>{{ storeStatusText }}</text>
				</view>
				<text class="hero-hours">{{ businessHoursText }}</text>
			</view>
			<view class="hero-content">
				<text class="hero-kicker">福州 · 桌游 × 漫画 × 拼豆体验店</text>
				<text class="hero-title">{{ storeNameText }}</text>
				<text class="hero-subtitle">大厅不限时自由玩，也可以预约独立包厢</text>
				<view class="hero-value-line">
					<text class="hero-value-main">大厅 {{ ticketPriceText }}</text>
					<text class="hero-value-separator">·</text>
					<text class="hero-value-sub">营业时间内不限时</text>
				</view>
			</view>
			<view class="hero-dots" v-if="heroDots.length > 1">
				<view v-for="dot in heroDots" :key="dot.key" :class="dot.className"></view>
			</view>
		</view>

		<!-- 大厅票核心权益：保留首页主线，同时让非桌游服务可被快速看见 -->
		<view class="hall-benefits">
			<view class="hall-benefits-head">
				<text class="hall-benefits-title">大厅票已包含</text>
				<text class="hall-benefits-note">进店后不用重复加购</text>
			</view>
			<view class="hall-benefits-list">
				<view class="hall-benefit-item">
					<text class="hall-benefit-dot"></text>
					<text>桌游畅玩</text>
				</view>
				<view class="hall-benefit-item">
					<text class="hall-benefit-dot"></text>
					<text>漫画小说</text>
				</view>
				<view class="hall-benefit-item">
					<text class="hall-benefit-dot"></text>
					<text>零食茶水自助</text>
				</view>
				<view class="hall-benefit-item">
					<text class="hall-benefit-dot"></text>
					<text>营业时段不限时</text>
				</view>
			</view>
		</view>

		<!-- 三个核心消费场景 -->
		<view class="play-section">
			<view class="section-heading">
				<view>
					<text class="section-kicker">先选一种玩法</text>
					<text class="section-title">今天想怎么玩？</text>
				</view>
				<text class="section-heading-note">到店也能调整</text>
			</view>
			<view class="play-grid">
				<view v-for="option in playOptions" :key="option.key" :class="option.className" @tap="handleSceneTap(option)">
					<view class="play-option-head">
						<text class="play-option-mark">{{ option.mark }}</text>
						<text class="play-option-badge">{{ option.badge }}</text>
					</view>
					<text class="play-option-name">{{ option.name }}</text>
					<text class="play-option-desc">{{ option.desc }}</text>
					<view class="play-option-foot">
						<text class="play-option-price">{{ option.price }}</text>
						<text class="play-option-action">{{ option.actionText }} ›</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 首页只保留一个动态提醒 -->
		<view :class="homePromptClass" v-if="homePromptType" @tap="handleHomePromptTap">
			<text class="home-prompt-icon">{{ homePromptIcon }}</text>
			<view class="home-prompt-copy">
				<text class="home-prompt-kicker">{{ homePromptKicker }}</text>
				<text class="home-prompt-title">{{ homePromptTitle }}</text>
				<text class="home-prompt-sub" v-if="homePromptSub">{{ homePromptSub }}</text>
			</view>
			<view class="home-prompt-side">
				<text class="home-prompt-action">{{ homePromptAction }}</text>
				<text class="home-prompt-close" v-if="homePromptClosable" @tap.stop="closeHomePrompt">✕</text>
			</view>
		</view>

		<!-- 到店后的次级服务 -->
		<view class="service-section">
			<view class="section-heading compact">
				<view>
					<text class="section-kicker">临时改变计划也没关系</text>
					<text class="section-title">到店后继续加</text>
				</view>
			</view>
			<view class="service-list">
				<view class="service-row perler" v-if="perlerEnabled" @tap="openPerlerUpgradeEntry">
					<text class="service-mark">豆</text>
					<view class="service-copy">
						<text class="service-title">临时想玩拼豆</text>
						<text class="service-sub">会员或小程序订单{{ perlerUpgradePriceText }}，外部团购核验{{ perlerChannelUpgradePriceText }}</text>
					</view>
					<text class="service-action">查资格 ›</text>
				</view>
				<view class="service-row saver" @tap="goToSubscriptionMall">
					<text class="service-mark">省</text>
					<view class="service-copy">
						<text class="service-title">常来就别每次原价</text>
						<text class="service-sub">大厅次卡按人数抵，包厢小时卡按时长省</text>
					</view>
					<text class="service-action">看卡包 ›</text>
				</view>
			</view>
		</view>

		<view class="social-section" @tap="goToGroupSquare">
			<view class="social-mark">局</view>
			<view class="social-copy">
				<text class="social-kicker">不想一个人开场</text>
				<text class="social-title">看看今天谁还差位</text>
				<text class="social-desc">找桌游搭子、主机队友，或发起自己的包厢局</text>
			</view>
			<text class="social-action">去组局 ›</text>
		</view>

		<view class="store-section">
			<view class="section-heading compact">
				<view>
					<text class="section-kicker">第一次来先认准位置</text>
					<text class="section-title">到店信息</text>
				</view>
			</view>
			<view class="store-panel">
				<view class="store-primary-row" @tap="openLocation">
					<text class="store-row-mark">位</text>
					<view class="store-row-copy">
						<text class="store-row-label">门店地址</text>
						<text class="store-row-value">{{ storeAddressText }}</text>
					</view>
					<text class="store-row-action">导航 ›</text>
				</view>
				<view class="store-detail-grid">
					<view class="store-detail" @tap="callStore">
						<text class="store-detail-label">联系电话</text>
						<text class="store-detail-value accent">{{ storePhoneText }}</text>
						<text class="store-detail-action">点击拨打</text>
					</view>
					<view class="store-detail" @tap="openStoreNotice">
						<text class="store-detail-label">到店前须知</text>
						<text class="store-detail-value">票券、升级、退款</text>
						<text class="store-detail-action">查看规则</text>
					</view>
				</view>
			</view>
		</view>

		<view class="review-section" v-if="reviews.length > 0">
			<view class="section-heading compact">
				<view>
					<text class="section-kicker">来自真实消费</text>
					<text class="section-title">到店玩家评价</text>
					<text class="section-summary">{{ reviewSummaryText }}</text>
				</view>
				<text class="section-link" @tap="goToMyReviews">查看全部 ›</text>
			</view>
			<view class="home-review-list">
				<view class="review-card" v-for="rev in reviews" :key="rev.key">
					<view class="review-header">
						<view class="review-avatar">{{ rev.avatarText }}</view>
						<view class="review-meta">
							<text class="review-name">{{ rev.displayName }}</text>
							<view class="review-stars">
								<text v-for="s in 5" :key="s" :class="s <= rev.ratingNumber ? 'star filled' : 'star'">★</text>
							</view>
						</view>
						<text class="review-badge">{{ rev.badgeText }}</text>
					</view>
					<text class="review-tag-line" v-if="rev.tagText">{{ rev.tagText }}</text>
					<text class="review-text">{{ rev.contentText }}</text>
					<text class="review-time">{{ rev.shortTime }}</text>
				</view>
			</view>
		</view>

	</view>
</template>

<script>
	import AUTH from '../../utils/auth.js'
	import { mapState, mapActions, mapMutations } from 'vuex';
	export default {
		computed: {
			...mapState(['hasLogin', 'constance', 'token', 'pending_invite_code']),
			ticketPriceFen() {
				const price = this.constance && this.constance.ticket_price_per_person;
				return price ? parseInt(price) : 3800;
			},
			ticketPriceText() {
				return '¥' + (this.ticketPriceFen / 100).toFixed(0) + '/人';
			},
			perlerDayPriceFen() {
				const price = this.constance && this.constance.perler_day_price;
				return price ? parseInt(price) : 6900;
			},
			perlerDayPriceText() {
				return '¥' + (this.perlerDayPriceFen / 100).toFixed(0) + '/人';
			},
			perlerUpgradePriceText() {
				const price = this.constance && this.constance.perler_upgrade_price;
				return '¥' + ((parseInt(price) || 3100) / 100).toFixed(0) + '/人';
			},
			perlerChannelUpgradePriceText() {
				const price = this.constance && this.constance.perler_channel_upgrade_price;
				return '¥' + ((parseInt(price) || 3900) / 100).toFixed(0) + '/人';
			},
			perlerEnabled() {
				const value = this.constance && this.constance.perler_enabled;
				return value !== false && value !== 0 && value !== '0' && value !== 'false';
			},
			playOptions() {
				const items = [
					{
						key: 'hall',
						mark: '票',
						badge: '一票待一天',
						name: '大厅自由畅玩',
						desc: '桌游、漫画小说、茶水零食都包含，一个人或朋友同行都合适',
						price: this.ticketPriceText,
						actionText: '买票入场',
						action: 'ticket',
						count: 1,
						className: 'play-option hall',
					},
					{
						key: 'room',
						mark: '房',
						badge: '安静私密',
						name: '预约包厢',
						desc: '主机、聚会、团建，按小时选择合适空间',
						price: '按小时',
						actionText: '选房间',
						action: 'reserve',
						className: this.perlerEnabled ? 'play-option room' : 'play-option room full',
					},
				];
				if (this.perlerEnabled) {
					items.splice(1, 0, {
						key: 'perler',
						mark: '豆',
						badge: '含大厅入场',
						name: '拼豆一日',
						desc: '标准材料1份，不限制作时间，成品可以带走',
						price: this.perlerDayPriceText,
						actionText: '买拼豆票',
						action: 'perler',
						className: 'play-option perler',
					});
				}
				return items;
			},
			heroDots() {
				return this.carouselList.map(function(img, index) {
					return {
						key: 'hero-dot-' + index,
						className: index === this.swiperCurrent ? 'hero-dot active' : 'hero-dot'
					};
				}.bind(this));
			},
			businessHoursText() {
				return String(this.constance && this.constance.business_hours || '10:00 - 22:00').trim();
			},
			storeNameText() {
				return this.constance && this.constance.store_name || '摸鱼划水吧';
			},
			storeBusinessState() {
				var text = this.businessHoursText.replace(/[~～—–至]/g, '-');
				var match = text.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
				if (!match) return { text: '营业时间见详情', className: 'store-status neutral' };
				var start = parseInt(match[1]) * 60 + parseInt(match[2]);
				var end = parseInt(match[3]) * 60 + parseInt(match[4]);
				var now = new Date(this.nowTimestamp || Date.now());
				var minutes = now.getHours() * 60 + now.getMinutes();
				var overnight = end <= start;
				var isOpen = overnight ? (minutes >= start || minutes < end) : (minutes >= start && minutes < end);
				if (!isOpen) return { text: '当前未营业', className: 'store-status closed' };
				var remaining = overnight
					? (minutes >= start ? 24 * 60 - minutes + end : end - minutes)
					: end - minutes;
				if (remaining <= 60) return { text: '即将打烊', className: 'store-status closing' };
				return { text: '营业中', className: 'store-status open' };
			},
			storeStatusText() {
				return this.storeBusinessState.text;
			},
			storeStatusClass() {
				return this.storeBusinessState.className;
			},
			storeAddressText() {
				return (this.constance && this.constance.store_address || this.addressData.address) + (this.constance && this.constance.store_area || this.addressData.area);
			},
			storePhoneText() {
				return String(this.constance && this.constance.phone_number || '83596103');
			},
			showCouponHint() {
				return this.hasLogin && !this.showInviteLanding && !this.couponHintClosed && this.claimableCouponCount > 0;
			},
			claimableCouponTitle() {
				if (this.claimableCouponName) {
					return this.claimableCouponName;
				}
				return this.claimableCouponCount + '张优惠券待领取';
			},
			showInviteLanding() {
				return !!this.pending_invite_code && !this.inviteLandingClosed;
			},
			inviteLandingTitle() {
				return this.hasLogin ? '好友邀请奖励待领取' : '好友送你一份新人礼';
			},
			inviteLandingSub() {
				return this.hasLogin ? '点一下绑定邀请码，双方都能拿到奖励' : '登录后领取新人积分，后续下单也更方便';
			},
			inviteLandingAction() {
				return this.hasLogin ? '领取' : '登录领';
			},
			homePromptType() {
				if (this.showInviteLanding) return 'invite';
				if (this.showCouponHint) return 'coupon';
				if (this.hasLogin && this.checkInInfo.can_check_in) return 'checkin';
				if (this.activityCard) return 'activity';
				return '';
			},
			bannerPrimaryText() {
				if (!this.bannerHasTarget) return '知道了';
				return this.activeBanner.cta_text || '去看看';
			},
			bannerHasTarget() {
				return !!(this.activeBanner && this.activeBanner.link_type !== 'none' && this.activeBanner.link_value);
			},
			bannerActionsClass() {
				return this.bannerHasTarget ? 'marketing-actions' : 'marketing-actions single';
			},
			homePromptClass() {
				return this.homePromptType ? 'home-prompt ' + this.homePromptType : 'home-prompt';
			},
			homePromptIcon() {
				if (this.homePromptType === 'invite') return '礼';
				if (this.homePromptType === 'activity') return this.activityCard && this.activityCard.icon || '活';
				if (this.homePromptType === 'coupon') return '券';
				return '骰';
			},
			homePromptKicker() {
				if (this.homePromptType === 'invite') return '好友邀请';
				if (this.homePromptType === 'activity') return this.activityCard && this.activityCard.tag || '店内活动';
				if (this.homePromptType === 'coupon') return '下单前先领';
				return '今日签到';
			},
			homePromptTitle() {
				if (this.homePromptType === 'invite') return this.inviteLandingTitle;
				if (this.homePromptType === 'activity') return this.activityCard && this.activityCard.title || '';
				if (this.homePromptType === 'coupon') return this.claimableCouponTitle;
				return '投骰领' + this.homeCheckInPointsText;
			},
			homePromptSub() {
				if (this.homePromptType === 'invite') return this.inviteLandingSub;
				if (this.homePromptType === 'activity') return this.activityCard && this.activityCard.subtitle || '';
				if (this.homePromptType === 'coupon') return '领取后会在结算时展示可用抵扣';
				var streak = Number(this.checkInInfo.current_streak || 0);
				return streak > 0 ? '已连续' + streak + '天，今天继续累积' : '签到积分可以在卡券商城兑换';
			},
			homePromptAction() {
				if (this.homePromptType === 'invite') return this.inviteLandingAction;
				if (this.homePromptType === 'activity') return this.activityCard && this.activityCard.cta_text || '去看看';
				if (this.homePromptType === 'coupon') return '去领取';
				return this.checkInRolling ? '领取中' : '去签到';
			},
			homePromptClosable() {
				return this.homePromptType === 'invite' || this.homePromptType === 'activity' || this.homePromptType === 'coupon';
			},
			homeCheckInPointsText() {
				var points = this.checkInInfo.next_points || (this.checkInInfo.config && this.checkInInfo.config.daily_points) || 10;
				return '+' + points + '积分';
			},
			reviewSummaryText() {
				if (this.reviewAverageText) {
					return this.reviewAverageText + ' · ' + this.reviewTotalCount + '条已到店评价';
				}
				return this.reviewTotalCount + '条已到店评价';
			},
		},
		watch: {
			constance(value) {
				if (value) this.loadData();
			},
			hasLogin(value) {
				if (value) {
					this.loadCheckInInfo({ force: true });
					this.scheduleDeferredRefresh(true);
					this.trackHomeBenefitView();
				} else {
					this.claimableCouponCount = 0;
					this.claimableCouponName = '';
					this.claimableCouponKey = '';
					this.checkInInfo = { checked_in_today: false, current_streak: 0, can_check_in: true, points_earned_today: 0 };
				}
			},
			pending_invite_code(value) {
				if (value) {
					this.inviteLandingClosed = false;
					this.trackInviteLandingView();
				}
			},
			homePromptType(value) {
				if (value === 'activity') this.trackActivityCardView();
			},
			activityCard(value) {
				if (value && this.homePromptType === 'activity') this.trackActivityCardView();
			},
		},
		data() {
			return {
				swiperCurrent: 0,
				nowTimestamp: Date.now(),
				activeBanner: null,
				activityCard: null,
				carouselList: [],
				addressData: {
					name: '摸鱼划水吧',
					address: '福州市鼓楼区吉庇路',
					area: '61号综合办公楼三层A区',
				},
				reviews: [],
				reviewTotalCount: 0,
				reviewAverageText: '',
				reviewsLoaded: false,
				couponHintClosed: false,
				couponHintClosedKey: '',
				claimableCouponCount: 0,
				claimableCouponName: '',
				claimableCouponKey: '',
				storeNoticeVisible: false,
				homeDataLoaded: false,
				homeDataKey: '',
				reviewsLoading: false,
				reviewsLastLoadedAt: 0,
				couponsLoading: false,
				couponsLastLoadedAt: 0,
				checkInInfo: { checked_in_today: false, current_streak: 0, can_check_in: true, points_earned_today: 0 },
				checkInLoading: false,
				checkInRolling: false,
				checkInLastLoadedAt: 0,
				bannerLoading: false,
				bannerLastCheckedAt: 0,
				bannerActionTrackedAt: {},
				lastActivityShownId: '',
				pageViewLastTrackedAt: 0,
				homeBenefitLastTrackedAt: 0,
				inviteLandingClosed: false,
				inviteLandingTrackedCode: '',
			};
		},
		onShow() {
			this.startStoreClock();
			this.schedulePageViewTrack();
			this.trackHomeBenefitView();
			this.trackInviteLandingView();
			if (this.constance) this.loadData();
			if (this.hasLogin) {
				this.loadCheckInInfo({ force: true });
			}
			this.scheduleDeferredRefresh(false);
		},
		onLoad(options) {
			this.captureInviteCode(options);
			if (!this.constance) {
				this.getConstanceInfo().catch(() => {});
			} else {
				this.loadData();
			}
			this.scheduleDeferredRefresh(true);
			this.trackHomeBenefitView();
			this.trackInviteLandingView();
		},
		onHide() {
			this.stopStoreClock();
			this.stopBannerPopupTimer();
			this.activeBanner = null;
		},
		beforeDestroy() {
			this.stopStoreClock();
			this.stopBannerPopupTimer();
			if (this._deferredRefreshTimer) clearTimeout(this._deferredRefreshTimer);
		},
		onShareAppMessage() {
			const ticketPrice = '¥' + (this.ticketPriceFen / 100).toFixed(0);
			const titles = [
				'别卷了！花' + ticketPrice + '可以躺一整天的神仙店 🎮',
				'福州这家宝藏店，' + ticketPrice + '能玩一整天，我私藏很久了',
				'周末不知道去哪？来这里躺平，零食还免费',
				'带娃+打游戏两不误，这家店的老板太懂了',
				'我的精神避难所，今天忍痛分享给你 🤫',
			];
			AUTH.trackEvent({
				event: 'share_home',
				page_path: 'pages/index/index',
				share_type: 'wechat_session',
				source: 'home'
			}).catch(function() {});
			return {
				title: titles[Math.floor(Math.random() * titles.length)],
				imageUrl: '/static/share_home.jpg',
				path: '/pages/index/index',
			};
		},
		onShareTimeline() {
			AUTH.trackEvent({
				event: 'share_timeline',
				page_path: 'pages/index/index',
				share_type: 'timeline',
				source: 'home'
			}).catch(function() {});
			return {
				title: '福州周末不知道去哪？来摸鱼划水吧玩一天',
				imageUrl: '/static/share_home.jpg',
			};
		},
		onAddToFavorites() {
			AUTH.trackEvent({
				event: 'share_favorite',
				page_path: 'pages/index/index',
				source: 'home'
			}).catch(function() {});
			return {
				title: '先收藏，下次想玩桌游漫画主机找得到',
				imageUrl: '/static/share_home.jpg',
			};
		},
		methods: {
			...mapActions(['loginAndRegister', 'getConstanceInfo', 'getReviewList']),
			...mapMutations(['setPendingInviteCode']),
			startStoreClock() {
				this.stopStoreClock();
				this.nowTimestamp = Date.now();
				this._storeClockTimer = setInterval(function() {
					this.nowTimestamp = Date.now();
				}.bind(this), 60 * 1000);
			},
			stopStoreClock() {
				if (!this._storeClockTimer) return;
				clearInterval(this._storeClockTimer);
				this._storeClockTimer = null;
			},
			stopBannerPopupTimer() {
				if (!this._bannerPopupTimer) return;
				clearTimeout(this._bannerPopupTimer);
				this._bannerPopupTimer = null;
			},
			schedulePageViewTrack() {
				var now = Date.now();
				if (now - this.pageViewLastTrackedAt < 30000) return;
				this.pageViewLastTrackedAt = now;
				setTimeout(function() {
					AUTH.trackEvent({
						event: 'page_view',
						page_path: 'pages/index/index',
						source: 'home'
					}).catch(function() {});
				}, 1200);
			},
			scheduleDeferredRefresh(initial) {
				if (this._deferredRefreshTimer) return;
				var delay = initial ? 800 : 500;
				this._deferredRefreshTimer = setTimeout(function() {
					this._deferredRefreshTimer = null;
					this.loadReviews();
					this.checkBanner();
					if (this.hasLogin) {
						this.loadCheckInInfo();
						this.loadClaimableCoupons();
					}
				}.bind(this), delay);
			},
			captureInviteCode(options) {
				var code = options && options.invite_code ? options.invite_code : '';
				if (!code && options && options.scene) {
					var scene = options.scene;
					try {
						scene = decodeURIComponent(scene);
					} catch (e) {}
					var parts = scene.split('&');
					for (var i = 0; i < parts.length; i++) {
						var item = parts[i];
						var eqIndex = item.indexOf('=');
						if (eqIndex <= 0) continue;
						var key = item.slice(0, eqIndex);
						var value = item.slice(eqIndex + 1);
						if (key === 'invite_code') {
							code = value;
							break;
						}
					}
				}
				if (!code) return;
				this.setPendingInviteCode(code);
				try { uni.setStorageSync('pending_invite_code', code); } catch (e) {}
				this.inviteLandingClosed = false;
				AUTH.trackEvent({
					event: 'invite_code_captured',
					page_path: 'pages/index/index',
					source: 'invite_link',
					has_invite: true
				}).catch(function() {});
				this.trackInviteLandingView();
			},
			openLocation() {
				var config = this.constance || {};
				uni.openLocation({
					latitude: parseFloat(config.store_latitude || 26.080446),
					longitude: parseFloat(config.store_longitude || 119.299214),
					scale: 5,
					name: config.store_name || this.addressData.name,
					address: this.storeAddressText
				});
			},
			callStore() {
				var number = this.storePhoneText.replace(/[^\d+]/g, '');
				if (!number) {
					uni.showToast({ title: '暂未配置联系电话', icon: 'none' });
					return;
				}
				uni.makePhoneCall({ phoneNumber: number });
			},
			openStoreNotice() {
				this.storeNoticeVisible = true;
			},
			closeStoreNotice() {
				this.storeNoticeVisible = false;
			},
			goToReserve() {
				uni.switchTab({ url: '/pages/tabBar/appoint/appoint' });
			},
			goToGroupSquare() {
				uni.switchTab({ url: '/pages/group/group' });
			},
			goToBuyTicketCount(count) {
				var num = parseInt(count || 1);
				if (num < 1) num = 1;
				if (num > 10) num = 10;
				uni.navigateTo({ url: '/pages/ticket/buy?count=' + num });
			},
			goToPerlerTicket() {
				AUTH.trackEvent({
					event: 'perler_ticket_entry_click',
					page_path: 'pages/index/index',
					source: 'home_scene'
				}, this.token).catch(function() {});
				uni.navigateTo({ url: '/pages/ticket/buy?mode=perler_day' });
			},
			openPerlerUpgradeEntry() {
				AUTH.trackEvent({
					event: 'perler_upgrade_entry_click',
					page_path: 'pages/index/index',
					source: 'home_scene'
				}, this.token).catch(function() {});
				uni.navigateTo({ url: '/pages/ticket/upgrade' });
			},
			goToSubscriptionMall() {
				AUTH.trackEvent({
					event: 'subscription_entry_click',
					page_path: 'pages/index/index',
					source: 'home_saver'
				}, this.token).catch(function() {});
				uni.navigateTo({ url: '/pages/user/subscription/buy?source=home_saver' });
			},
			goToVoucher(source) {
				if (typeof source !== 'string') source = 'home_coupon_hint';
				var initialTab = 'coupon';
				if (source === 'home_points') initialTab = 'points';
				if (source === 'home_upsell' || source === 'home_shop') initialTab = 'shop';
				uni.setStorageSync('voucherInitialTab', initialTab);
				AUTH.trackEvent({
					event: 'coupon_hint_click',
					page_path: 'pages/index/index',
					source: source || 'home_coupon_hint',
					claimable_count: this.claimableCouponCount
				}, this.token).catch(function() {});
				uni.switchTab({ url: '/pages/voucher/voucher' });
			},
			closeCouponHint() {
				this.couponHintClosed = true;
				this.couponHintClosedKey = this.claimableCouponKey;
			},
			handleHomePromptTap() {
				if (this.homePromptType === 'invite') {
					this.handleInviteLandingTap();
				} else if (this.homePromptType === 'activity') {
					this.goActivityCard();
				} else if (this.homePromptType === 'coupon') {
					this.goToVoucher('home_coupon_hint');
				} else if (this.homePromptType === 'checkin') {
					this.handleHomeBenefitTap();
				}
			},
			closeHomePrompt() {
				if (this.homePromptType === 'invite') {
					this.closeInviteLanding();
				} else if (this.homePromptType === 'activity') {
					this.closeActivityCard();
				} else if (this.homePromptType === 'coupon') {
					this.closeCouponHint();
				}
			},
			trackHomeBenefitView() {
				var now = Date.now();
				if (now - this.homeBenefitLastTrackedAt < 30000) return;
				this.homeBenefitLastTrackedAt = now;
				AUTH.trackEvent({
					event: 'checkin_entry_view',
					page_path: 'pages/index/index',
					source: 'home_benefit',
					has_login: !!this.hasLogin
				}, this.token).catch(function() {});
			},
			trackInviteLandingView() {
				if (!this.pending_invite_code || this.inviteLandingClosed) return;
				if (this.inviteLandingTrackedCode === this.pending_invite_code) return;
				this.inviteLandingTrackedCode = this.pending_invite_code;
				AUTH.trackEvent({
					event: 'invite_landing_view',
					page_path: 'pages/index/index',
					source: 'invite_link',
					has_invite: true
				}, this.token).catch(function() {});
			},
			getCheckInDiceNumber(streak, points) {
				var seed = Number(streak || 0) + Number(points || 0);
				if (!seed || seed < 1) seed = 1;
				return ((seed - 1) % 6) + 1;
			},
			async loadCheckInInfo(options) {
				options = options || {};
				if (!this.hasLogin || this.checkInLoading) return;
				var now = Date.now();
				if (!options.force && this.checkInLastLoadedAt && now - this.checkInLastLoadedAt < 5 * 60 * 1000) return;
				var token = this.token || uni.getStorageSync('token');
				if (!token) return;
				this.checkInLoading = true;
				try {
					const res = await AUTH.checkInInfo(token);
					if (res._status === 0 && res.data) {
						this.checkInInfo = res.data;
						this.checkInLastLoadedAt = Date.now();
					}
				} catch (e) {
				} finally {
					this.checkInLoading = false;
				}
			},
			handleHomeBenefitTap() {
				if (this.checkInLoading || this.checkInRolling) return;
				AUTH.trackEvent({
					event: 'checkin_click',
					page_path: 'pages/index/index',
					source: this.hasLogin ? 'home_benefit' : 'home_benefit_guest',
					has_login: !!this.hasLogin
				}, this.token).catch(function() {});
				if (!this.hasLogin) {
					this.loginAndRegister().then(function() {
						this.loadCheckInInfo({ force: true });
					}.bind(this)).catch(function() {});
					return;
				}
				if (this.checkInInfo.can_check_in) {
					this.doHomeCheckIn();
				} else {
					this.goToVoucher('home_points');
				}
			},
			async doHomeCheckIn() {
				if (this.checkInLoading || this.checkInRolling) return;
				var token = this.token || uni.getStorageSync('token');
				if (!token) {
					this.loginAndRegister().catch(function() {});
					return;
				}
				this.checkInLoading = true;
				this.checkInRolling = true;
				try {
					const res = await AUTH.checkIn(token);
					const d = res && res.data;
					if (d && d.points_earned !== undefined) {
						this.checkInInfo.checked_in_today = true;
						this.checkInInfo.can_check_in = false;
						this.checkInInfo.points_earned_today = d.points_earned;
						AUTH.trackEvent({
							event: 'checkin_success',
							page_path: 'pages/index/index',
							source: 'home_benefit'
						}, token).catch(function() {});
						this.checkInLoading = false;
						await this.loadCheckInInfo({ force: true });
						this.showCheckInSuccess(d);
						return;
					} else {
						uni.showToast({ title: (d && d.message) || '签到失败', icon: 'none' });
					}
				} catch (e) {
					uni.showToast({ title: '签到失败', icon: 'none' });
				} finally {
					this.checkInLoading = false;
					this.checkInRolling = false;
				}
			},
			showCheckInSuccess(data) {
				data = data || {};
				var points = Number(data.points_earned || 0);
				var streak = Number(this.checkInInfo.current_streak || 0);
				var dice = this.getCheckInDiceNumber(streak, points);
				var content = '你投出了 ' + dice + ' 点，本次获得 +' + points + ' 积分';
				if (streak > 0) {
					content += '\n棋盘进度：第' + streak + '格';
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
							uni.setStorageSync('voucherInitialTab', 'points');
							uni.switchTab({ url: '/pages/voucher/voucher' });
						}
					}
				});
			},
			closeInviteLanding() {
				this.inviteLandingClosed = true;
			},
			handleInviteLandingTap() {
				AUTH.trackEvent({
					event: 'invite_landing_click',
					page_path: 'pages/index/index',
					source: 'invite_link',
					has_invite: true,
					has_login: !!this.hasLogin
				}, this.token).catch(function() {});
				if (!this.hasLogin) {
					this.loginAndRegister().then(function() {
						setTimeout(function() {
							var pages = getCurrentPages();
							var current = pages.length ? pages[pages.length - 1].route : '';
							if (current === 'pages/index/index') {
								this.claimPendingInviteCode();
							}
						}.bind(this), 600);
					}.bind(this)).catch(function() {});
					return;
				}
				this.claimPendingInviteCode();
			},
			async claimPendingInviteCode() {
				var code = this.pending_invite_code;
				if (!code) return;
				var token = this.token || uni.getStorageSync('token');
				if (!token) return;
				uni.showLoading({ title: '领取中...' });
				try {
					const res = await AUTH.applyInviteCode(token, code);
					uni.hideLoading();
					const data = (res && res.data) || {};
					if (res && res._status === 0 && data._status !== 1) {
						this.setPendingInviteCode(null);
						this.inviteLandingClosed = true;
						AUTH.trackEvent({
							event: 'invite_reward_claimed',
							page_path: 'pages/index/index',
							source: 'invite_link',
							has_invite: true
						}, token).catch(function() {});
						var msg = data.message || '邀请奖励已到账';
						if (data.invitee_points) msg += '\n你获得 ' + data.invitee_points + ' 积分';
						uni.showModal({ title: '领取成功', content: msg, showCancel: false });
						return;
					}
					var reason = (data && data.message) || (res && res._reason) || '邀请码暂时无法领取';
					if (reason.indexOf('已经使用过') >= 0) {
						this.setPendingInviteCode(null);
						this.inviteLandingClosed = true;
						uni.showModal({ title: '邀请已处理', content: '你的邀请关系已经绑定过啦', showCancel: false });
						return;
					}
					if (reason.indexOf('无效') >= 0 || reason.indexOf('自己') >= 0) {
						this.setPendingInviteCode(null);
						this.inviteLandingClosed = true;
					}
					AUTH.trackEvent({
						event: 'invite_reward_failed',
						page_path: 'pages/index/index',
						source: 'invite_link',
						has_invite: true
					}, token).catch(function() {});
					uni.showToast({ title: reason, icon: 'none' });
				} catch (e) {
					uni.hideLoading();
					uni.showToast({ title: '领取失败', icon: 'none' });
				}
			},
			async loadClaimableCoupons(options) {
				options = options || {};
				if (!this.hasLogin) {
					this.claimableCouponCount = 0;
					this.claimableCouponName = '';
					return;
				}
				if (this.couponsLoading) return;
				var now = Date.now();
				if (!options.force && this.couponsLastLoadedAt && now - this.couponsLastLoadedAt < 5 * 60 * 1000) {
					return;
				}
				var token = uni.getStorageSync('token');
				if (!token) {
					this.claimableCouponCount = 0;
					this.claimableCouponName = '';
					return;
				}
				this.couponsLoading = true;
				try {
					const res = await AUTH.getCouponList(token);
					if (res._status === 0 && res.data) {
						const list = res.data.filter(item => item.can_receive !== false && !item.user_received && item.remaining_count !== 0);
						const key = list.map(item => item.campaign_id).join(',');
						this.claimableCouponCount = list.length;
						this.claimableCouponName = list.length > 0 ? list[0].name : '';
						this.claimableCouponKey = key;
						if (list.length > 0 && this.couponHintClosedKey !== key) this.couponHintClosed = false;
						this.couponsLastLoadedAt = Date.now();
					} else {
						this.claimableCouponCount = 0;
						this.claimableCouponName = '';
						this.claimableCouponKey = '';
					}
				} catch (e) {
					this.claimableCouponCount = 0;
					this.claimableCouponName = '';
					this.claimableCouponKey = '';
				} finally {
					this.couponsLoading = false;
				}
			},
			handleSceneTap(scene) {
				if (!scene) return;
				if (scene.action === 'ticket') {
					this.goToBuyTicketCount(scene.count || 1);
				} else if (scene.action === 'perler') {
					this.goToPerlerTicket();
				} else if (scene.action === 'reserve') {
					this.goToReserve();
				} else if (scene.action === 'voucher') {
					this.goToVoucher('home_scene');
				} else if (scene.action === 'location') {
					this.openLocation();
				}
			},
			goToMyReviews() {
				AUTH.trackEvent({
					event: 'review_list_click',
					page_path: 'pages/index/index',
					source: 'home_reviews',
				}).catch(function() {});
				uni.navigateTo({ url: '/pages/my/reviews' });
			},
			async loadData() {
				if (!this.constance) {
					return;
				}
				var sources = [
					this.constance.home_page_image0,
					this.constance.home_page_image1,
					this.constance.home_page_image2,
					this.constance.home_page_image3
				].filter(function(src) { return !!src; });
				var dataKey = sources.join('|');
				if (this.homeDataLoaded && this.homeDataKey === dataKey) return;
				this.carouselList = [];
				var baseUrl = 'https://moyuhuashui.oss-cn-shenzhen.aliyuncs.com/';
				var addPrefix = function(src) {
					if (!src) return '';
					if (src.indexOf('http://moyuhuashui.oss-cn-shenzhen.aliyuncs.com/') === 0) {
						return src.replace('http://moyuhuashui.oss-cn-shenzhen.aliyuncs.com/', baseUrl);
					}
					if (src.indexOf('http') === 0) return src;
					return baseUrl + src;
				};
				for (var i = 0; i < sources.length; i++) {
					this.carouselList.push(addPrefix(sources[i]));
				}
				this.homeDataLoaded = true;
				this.homeDataKey = dataKey;
			},
			async loadReviews(options) {
				options = options || {};
				if (this.reviewsLoading) return;
				var now = Date.now();
				if (!options.force && this.reviewsLoaded && this.reviewsLastLoadedAt && now - this.reviewsLastLoadedAt < 5 * 60 * 1000) {
					return;
				}
				this.reviewsLoading = true;
				try {
					var payload = await this.getReviewList();
					this.reviewsLoaded = true;
					this.reviewsLastLoadedAt = Date.now();
					payload = payload || {};
					var list = Array.isArray(payload.homepage_reviews) ? payload.homepage_reviews : [];
					var summary = payload.summary || {};
					if (list.length === 0) {
						this.reviews = [];
						this.reviewTotalCount = Number(summary.total_count || 0);
						this.reviewAverageText = Number(summary.average_rating || 0) > 0 ? Number(summary.average_rating).toFixed(1) + '分' : '';
						return;
					}
					var prepared = [];
					for (var i = 0; i < list.length; i++) {
						var item = this.prepareReviewItem(list[i], i);
						if (!item) continue;
						prepared.push(item);
					}
					this.reviewTotalCount = Number(summary.total_count || prepared.length);
					this.reviewAverageText = Number(summary.average_rating || 0) > 0 ? Number(summary.average_rating).toFixed(1) + '分' : '';
					this.reviews = prepared.slice(0, 2);
					if (this.reviews.length > 0) {
						AUTH.trackEvent({
							event: 'review_section_view',
							page_path: 'pages/index/index',
							source: 'home_reviews',
							_dedupe_key: 'review_section_view',
							_dedupe_ttl_ms: 6 * 60 * 60 * 1000,
						}).catch(function() {});
					}
				} catch (e) {
					console.error('加载评价失败:', e);
					this.reviewsLoaded = true;
					this.reviews = [];
					this.reviewTotalCount = 0;
					this.reviewAverageText = '';
				} finally {
					this.reviewsLoading = false;
				}
			},
			prepareReviewItem(raw, index) {
				if (!raw) return null;
				var content = (raw.content || '').replace(/\s+/g, ' ').trim();
				if (!content) return null;
				var rating = parseInt(raw.rating || 0);
				if (!isFinite(rating)) rating = 0;
				if (rating < 0) rating = 0;
				if (rating > 5) rating = 5;
				var name = raw.user_nickname || '匿名玩家';
				var text = content.length > 72 ? content.slice(0, 72) + '...' : content;
				var time = raw.created_at || '';
				var shortTime = time;
				if (time.length >= 10) {
					shortTime = time.slice(5, 10);
				}
				var sceneText = raw.scene_text || '到店体验';
				var avatarText = sceneText.indexOf('包厢') >= 0 ? '包' : (sceneText.indexOf('大厅') >= 0 ? '厅' : '到');
				var tags = Array.isArray(raw.tags) ? raw.tags.slice(0, 2) : [];
				return {
					key: raw.object_id || 'review-' + index,
					object_id: raw.object_id,
					user_id: raw.user_id,
					displayName: name,
					avatarText: avatarText,
					ratingNumber: rating,
					contentText: text,
					shortTime: shortTime,
					badgeText: '已到店 · ' + sceneText,
					tagText: tags.length > 0 ? tags.map(function(tag) { return '#' + tag; }).join('  ') : '',
				};
			},
			swiperChange(e) {
				this.swiperCurrent = e.detail.current;
			},
			recordBannerAction(banner, action) {
				if (!banner || !banner.id) return;
				var actionKey = banner.id + ':' + action;
				var now = Date.now();
				if (action !== 'show' && this.bannerActionTrackedAt[actionKey] && now - this.bannerActionTrackedAt[actionKey] < 1500) {
					return;
				}
				this.bannerActionTrackedAt[actionKey] = now;
				AUTH.recordBanner(banner.id, action).catch(function() {});
			},
			trackActivityCardView() {
				if (!this.activityCard || this.homePromptType !== 'activity') return;
				if (this.lastActivityShownId === this.activityCard.id) return;
				this.lastActivityShownId = this.activityCard.id;
				this.recordBannerAction(this.activityCard, 'show');
			},
			getBannerStorageKey(banner, type) {
				if (!banner || !banner.id) return '';
				return 'activity_' + type + '_' + banner.id;
			},
			getBannerDisplayType(banner) {
				if (!banner) return '';
				return banner.display_type || (banner.image_url ? 'image_popup' : 'text_card');
			},
			findActivityBanner(list, displayType) {
				list = list || [];
				for (var i = 0; i < list.length; i++) {
					var item = list[i];
					if (!item) continue;
					if (this.getBannerDisplayType(item) === displayType) return item;
				}
				return null;
			},
			queueBannerPopup(banner, now) {
				if (!banner || this.activeBanner) return;
				var popupKey = this.getBannerStorageKey(banner, 'popup_shown');
				var popupShownAt = uni.getStorageSync(popupKey);
				if (popupShownAt && now - popupShownAt < 24 * 60 * 60 * 1000) return;
				this.stopBannerPopupTimer();
				this._bannerPopupTimer = setTimeout(function() {
					this._bannerPopupTimer = null;
					if (this.showInviteLanding || this.storeNoticeVisible || this.activeBanner) return;
					this.activeBanner = banner;
					uni.setStorageSync(popupKey, Date.now());
					this.recordBannerAction(banner, 'show');
				}.bind(this), 1200);
			},
			isTabBarPath(url) {
				var path = String(url || '').split('?')[0].replace(/^\//, '');
				return [
					'pages/index/index',
					'pages/voucher/voucher',
					'pages/tabBar/appoint/appoint',
					'pages/group/group',
					'pages/user/user'
				].indexOf(path) >= 0;
			},
			openActivityTarget(banner) {
				if (!banner) return;
				var value = banner.link_value || '';
				if (banner.link_type === 'page' && value) {
					var url = value.charAt(0) === '/' ? value : '/' + value;
					var baseUrl = url.split('?')[0];
					if (this.isTabBarPath(baseUrl)) {
						uni.switchTab({ url: baseUrl });
					} else {
						uni.navigateTo({ url: url });
					}
				} else if (banner.link_type === 'webview' && value) {
					uni.showToast({ title: '外链活动请联系客服查看', icon: 'none' });
				}
			},
			closeBanner(options) {
				var skipRecord = options && options.skipRecord === true;
				if (!skipRecord) this.recordBannerAction(this.activeBanner, 'close');
				this.activeBanner = null;
			},
			goBannerLink() {
				if (!this.activeBanner) return;
				var banner = this.activeBanner;
				var hasTarget = banner.link_type !== 'none' && !!banner.link_value;
				if (hasTarget) {
					this.recordBannerAction(banner, 'click');
					this.openActivityTarget(banner);
				}
				this.closeBanner({ skipRecord: true });
			},
			checkBanner() {
				if (this.bannerLoading) return;
				var checkedAt = Date.now();
				if (this.bannerLastCheckedAt && checkedAt - this.bannerLastCheckedAt < 5 * 60 * 1000) return;
				this.bannerLoading = true;
				AUTH.activeBanners().then(res => {
					this.bannerLastCheckedAt = Date.now();
					if (res._status !== 0 || !res.data) return;
					var list = res.data || [];
					var now = Date.now();
					var card = this.findActivityBanner(list, 'text_card');
					if (card) {
						var cardKey = this.getBannerStorageKey(card, 'card_closed');
						var cardClosedAt = uni.getStorageSync(cardKey);
						if (!cardClosedAt || now - cardClosedAt >= 12 * 60 * 60 * 1000) {
							if (!this.activityCard || this.activityCard.id !== card.id) {
								this.activityCard = card;
							}
						} else {
							this.activityCard = null;
						}
					} else {
						this.activityCard = null;
					}
					var popup = this.findActivityBanner(list, 'image_popup');
					this.queueBannerPopup(popup, now);
				}).catch(function() {
				}).then(function() {
					this.bannerLoading = false;
				}.bind(this));
			},
			closeActivityCard() {
				if (!this.activityCard) return;
				this.recordBannerAction(this.activityCard, 'close');
				var key = this.getBannerStorageKey(this.activityCard, 'card_closed');
				if (key) uni.setStorageSync(key, Date.now());
				this.activityCard = null;
			},
			goActivityCard() {
				if (!this.activityCard) return;
				var card = this.activityCard;
				this.recordBannerAction(card, 'click');
				this.openActivityTarget(card);
			},
		}
	}
</script>

<style lang="scss">
/* ===== 2026 首页重构 ===== */
page {
	background: #F7F5F1;
}

.page-wrapper {
	min-height: 100vh;
	padding-bottom: 32rpx;
	background: #F7F5F1;
}

.marketing-popup {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 10000;
	padding: 44rpx;
	box-sizing: border-box;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(25, 21, 18, 0.56);
}

.marketing-panel {
	width: 100%;
	max-width: 620rpx;
	max-height: calc(100vh - 88rpx);
	overflow-y: auto;
	border-radius: 16rpx;
	background: #FFF;
	box-shadow: 0 20rpx 60rpx rgba(45, 36, 30, 0.24);
}

.marketing-media {
	position: relative;
	width: 100%;
	height: 380rpx;
	background: #E9E4DE;
	overflow: hidden;
}

.marketing-image {
	width: 100%;
	height: 100%;
}

.marketing-close {
	position: absolute;
	top: 16rpx;
	right: 16rpx;
	width: 52rpx;
	height: 52rpx;
	border-radius: 8rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(25, 21, 18, 0.66);
	font-size: 22rpx;
	color: #FFF;
}

.marketing-copy {
	padding: 24rpx 24rpx 18rpx;
}

.marketing-kicker {
	display: block;
	font-size: 20rpx;
	font-weight: 700;
	color: #B05E37;
}

.marketing-title {
	display: block;
	margin-top: 5rpx;
	font-size: 32rpx;
	line-height: 1.3;
	font-weight: 800;
	color: #332D28;
}

.marketing-sub {
	display: block;
	margin-top: 8rpx;
	font-size: 22rpx;
	line-height: 1.5;
	color: #746A62;
}

.marketing-actions {
	display: grid;
	grid-template-columns: 1fr 1.45fr;
	gap: 12rpx;
	padding: 0 24rpx 24rpx;
}

.marketing-actions.single {
	grid-template-columns: 1fr;
}

.marketing-secondary,
.marketing-primary {
	height: 74rpx;
	border-radius: 12rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 25rpx;
	font-weight: 800;
}

.marketing-secondary {
	background: #F1EDE8;
	color: #746A62;
}

.marketing-primary {
	background: #C96B3F;
	color: #FFF;
}

.notice-popup {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 10010;
	padding: 44rpx;
	box-sizing: border-box;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(25, 21, 18, 0.54);
}

.notice-panel {
	width: 100%;
	max-width: 620rpx;
	max-height: calc(100vh - 88rpx);
	padding: 28rpx;
	box-sizing: border-box;
	overflow-y: auto;
	border-radius: 16rpx;
	background: #FFF;
	box-shadow: 0 20rpx 56rpx rgba(45, 36, 30, 0.2);
}

.notice-head {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 20rpx;
	margin-bottom: 20rpx;
}

.notice-kicker {
	display: block;
	font-size: 20rpx;
	font-weight: 700;
	color: #B05E37;
}

.notice-title {
	display: block;
	margin-top: 4rpx;
	font-size: 34rpx;
	font-weight: 800;
	color: #332D28;
}

.notice-close {
	width: 52rpx;
	height: 52rpx;
	border-radius: 8rpx;
	background: #F3ECE5;
	color: #7F746B;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 22rpx;
	flex-shrink: 0;
}

.notice-list {
	display: flex;
	flex-direction: column;
	gap: 12rpx;
}

.notice-line {
	display: flex;
	align-items: flex-start;
	gap: 12rpx;
	padding: 16rpx;
	border-radius: 12rpx;
	background: #F7F5F1;
}

.notice-dot {
	width: 36rpx;
	font-size: 25rpx;
	line-height: 1.45;
	flex-shrink: 0;
}

.notice-copy {
	flex: 1;
	font-size: 23rpx;
	line-height: 1.55;
	color: #615850;
}

.notice-confirm {
	margin-top: 22rpx;
	height: 76rpx;
	border-radius: 12rpx;
	background: #C96B3F;
	color: #FFF;
	font-size: 26rpx;
	font-weight: 800;
	display: flex;
	align-items: center;
	justify-content: center;
}

.home-hero {
	position: relative;
	height: 690rpx;
	background: #D9D4CC;
	overflow: hidden;
}

.hero-media,
.hero-image,
.hero-fallback {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
}

.hero-fallback {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	background: #EFE4D5;
}

.hero-logo {
	width: 180rpx;
	height: 180rpx;
	border-radius: 16rpx;
}

.hero-fallback-text {
	margin-top: 22rpx;
	font-size: 24rpx;
	color: #67594E;
}

.hero-scrim {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: linear-gradient(180deg, rgba(24, 20, 17, 0.42) 0%, rgba(24, 20, 17, 0.04) 38%, rgba(24, 20, 17, 0.78) 100%);
	pointer-events: none;
}

.hero-topbar {
	position: absolute;
	top: calc(env(safe-area-inset-top) + 24rpx);
	left: 24rpx;
	right: 24rpx;
	display: flex;
	align-items: center;
	justify-content: space-between;
	z-index: 2;
}

.store-status {
	height: 52rpx;
	padding: 0 16rpx;
	display: flex;
	align-items: center;
	gap: 10rpx;
	border-radius: 8rpx;
	background: rgba(255, 255, 255, 0.94);
	font-size: 22rpx;
	font-weight: 700;
	color: #3E352E;
}

.store-status-dot {
	width: 10rpx;
	height: 10rpx;
	border-radius: 50%;
	background: #8B8178;
}

.store-status.open .store-status-dot { background: #3F8C52; }
.store-status.open { color: #2F6F40; }
.store-status.closing .store-status-dot { background: #D99028; }
.store-status.closing { color: #9A641E; }
.store-status.closed .store-status-dot { background: #A65A4E; }
.store-status.closed { color: #86493F; }

.hero-hours {
	height: 52rpx;
	padding: 0 16rpx;
	display: flex;
	align-items: center;
	border-radius: 8rpx;
	background: rgba(31, 27, 24, 0.62);
	font-size: 21rpx;
	color: #FFF;
}

.hero-content {
	position: absolute;
	left: 30rpx;
	right: 30rpx;
	bottom: 54rpx;
	z-index: 2;
}

.hero-kicker {
	display: block;
	font-size: 22rpx;
	font-weight: 700;
	color: #F3CE9B;
}

.hero-title {
	display: block;
	margin-top: 8rpx;
	font-size: 50rpx;
	line-height: 1.18;
	font-weight: 800;
	color: #FFF;
	letter-spacing: 0;
}

.hero-subtitle {
	display: block;
	margin-top: 12rpx;
	font-size: 25rpx;
	line-height: 1.48;
	color: rgba(255, 255, 255, 0.9);
}

.hero-value-line {
	display: flex;
	align-items: baseline;
	flex-wrap: wrap;
	gap: 10rpx;
	margin-top: 20rpx;
}

.hero-value-main {
	font-size: 30rpx;
	font-weight: 800;
	color: #FFF;
}

.hero-value-separator,
.hero-value-sub {
	font-size: 22rpx;
	color: rgba(255, 255, 255, 0.82);
}

.hero-dots {
	position: absolute;
	right: 28rpx;
	bottom: 22rpx;
	display: flex;
	align-items: center;
	gap: 8rpx;
	z-index: 3;
}

.hero-dot {
	width: 10rpx;
	height: 10rpx;
	border-radius: 50%;
	background: rgba(255, 255, 255, 0.45);
}

.hero-dot.active {
	width: 30rpx;
	border-radius: 5rpx;
	background: #FFF;
}

.hall-benefits {
	padding: 20rpx 24rpx 22rpx;
	background: #FFF;
	border-bottom: 1rpx solid #E9E3DC;
}

.hall-benefits-head {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: 18rpx;
}

.hall-benefits-title {
	font-size: 25rpx;
	font-weight: 800;
	color: #332D28;
}

.hall-benefits-note {
	font-size: 20rpx;
	color: #91877F;
}

.hall-benefits-list {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 10rpx 22rpx;
	margin-top: 13rpx;
}

.hall-benefit-item {
	display: flex;
	align-items: center;
	min-width: 0;
	font-size: 22rpx;
	line-height: 1.45;
	color: #5E554E;
}

.hall-benefit-dot {
	width: 8rpx;
	height: 8rpx;
	margin-right: 12rpx;
	border-radius: 50%;
	background: #4E7754;
	flex-shrink: 0;
}

.play-section,
.service-section,
.store-section,
.review-section {
	margin: 0 24rpx;
	padding-top: 38rpx;
}

.section-heading {
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	gap: 20rpx;
	margin-bottom: 20rpx;
}

.section-heading.compact {
	margin-bottom: 16rpx;
}

.section-kicker {
	display: block;
	font-size: 20rpx;
	font-weight: 700;
	color: #B05E37;
}

.section-title {
	display: block;
	margin-top: 4rpx;
	font-size: 34rpx;
	line-height: 1.25;
	font-weight: 800;
	color: #332D28;
	letter-spacing: 0;
}

.section-heading-note,
.section-summary {
	font-size: 21rpx;
	color: #8B8178;
}

.section-summary {
	display: block;
	margin-top: 6rpx;
}

.section-link {
	flex-shrink: 0;
	font-size: 22rpx;
	font-weight: 700;
	color: #B05E37;
}

.play-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 14rpx;
}

.play-option {
	min-width: 0;
	min-height: 286rpx;
	padding: 22rpx;
	box-sizing: border-box;
	border: 1rpx solid #DDD7CF;
	border-radius: 16rpx;
	background: #FFF;
	display: flex;
	flex-direction: column;
}

.play-option.hall,
.play-option.full {
	grid-column: 1 / -1;
}

.play-option.hall {
	min-height: 260rpx;
	background: #C96B3F;
	border-color: #C96B3F;
	color: #FFF;
}

.play-option.perler {
	background: #EEF7F4;
	border-color: #BFDCD4;
}

.play-option.room {
	background: #FFF;
}

.play-option-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12rpx;
}

.play-option-mark {
	width: 54rpx;
	height: 54rpx;
	border-radius: 8rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background: #F1E8DE;
	font-size: 24rpx;
	font-weight: 800;
	color: #6F5A49;
}

.hall .play-option-mark {
	background: rgba(255, 255, 255, 0.18);
	color: #FFF;
}

.perler .play-option-mark {
	background: #2F8275;
	color: #FFF;
}

.play-option-badge {
	font-size: 19rpx;
	font-weight: 700;
	color: #85766A;
}

.hall .play-option-badge {
	color: rgba(255, 255, 255, 0.82);
}

.perler .play-option-badge {
	color: #31766B;
}

.play-option-name {
	display: block;
	margin-top: 18rpx;
	font-size: 30rpx;
	line-height: 1.25;
	font-weight: 800;
	color: #332D28;
}

.hall .play-option-name { color: #FFF; }

.play-option-desc {
	display: block;
	margin-top: 8rpx;
	font-size: 21rpx;
	line-height: 1.48;
	color: #786E66;
	flex: 1;
}

.hall .play-option-desc {
	max-width: 560rpx;
	color: rgba(255, 255, 255, 0.86);
}

.play-option-foot {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12rpx;
	margin-top: 18rpx;
}

.play-option-price {
	font-size: 27rpx;
	font-weight: 800;
	color: #B05E37;
}

.hall .play-option-price { color: #FFF; }
.perler .play-option-price { color: #246E63; }

.play-option-action {
	font-size: 21rpx;
	font-weight: 700;
	color: #B05E37;
	white-space: nowrap;
}

.hall .play-option-action { color: #FFF; }
.perler .play-option-action { color: #246E63; }

.home-prompt {
	margin: 28rpx 24rpx 0;
	padding: 20rpx;
	display: flex;
	align-items: center;
	gap: 16rpx;
	border: 1rpx solid #E1D7CB;
	border-radius: 14rpx;
	background: #FFF;
}

.home-prompt.invite { border-left: 6rpx solid #C96B3F; }
.home-prompt.activity { border-left: 6rpx solid #4E7754; }
.home-prompt.coupon { border-left: 6rpx solid #B34F43; }
.home-prompt.checkin { border-left: 6rpx solid #D39A36; }

.home-prompt-icon {
	width: 58rpx;
	height: 58rpx;
	border-radius: 8rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	background: #F3ECE5;
	font-size: 23rpx;
	font-weight: 800;
	color: #6A5B50;
}

.home-prompt-copy,
.service-copy,
.social-copy,
.store-row-copy {
	flex: 1;
	min-width: 0;
}

.home-prompt-kicker {
	display: block;
	font-size: 19rpx;
	font-weight: 700;
	color: #9B6A4E;
}

.home-prompt-title {
	display: block;
	margin-top: 3rpx;
	font-size: 27rpx;
	font-weight: 800;
	line-height: 1.3;
	color: #332D28;
}

.home-prompt-sub {
	display: block;
	margin-top: 5rpx;
	font-size: 20rpx;
	line-height: 1.4;
	color: #81766D;
}

.home-prompt-side {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	flex-shrink: 0;
}

.home-prompt-action {
	font-size: 21rpx;
	font-weight: 800;
	color: #B05E37;
	white-space: nowrap;
}

.home-prompt-close {
	margin-top: 12rpx;
	padding: 4rpx 8rpx;
	font-size: 20rpx;
	color: #A79C93;
}

.service-list {
	display: flex;
	flex-direction: column;
	gap: 12rpx;
}

.service-row {
	min-height: 118rpx;
	padding: 18rpx 20rpx;
	display: flex;
	align-items: center;
	gap: 16rpx;
	box-sizing: border-box;
	border: 1rpx solid #DDD7CF;
	border-radius: 14rpx;
	background: #FFF;
}

.service-mark,
.social-mark,
.store-row-mark {
	width: 56rpx;
	height: 56rpx;
	border-radius: 8rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	font-size: 23rpx;
	font-weight: 800;
}

.service-row.perler .service-mark {
	background: #2F8275;
	color: #FFF;
}

.service-row.saver .service-mark {
	background: #4E7754;
	color: #FFF;
}

.service-title {
	display: block;
	font-size: 26rpx;
	font-weight: 800;
	color: #332D28;
}

.service-sub {
	display: block;
	margin-top: 5rpx;
	font-size: 20rpx;
	line-height: 1.42;
	color: #81766D;
}

.service-action {
	flex-shrink: 0;
	font-size: 20rpx;
	font-weight: 800;
	color: #5F695F;
	white-space: nowrap;
}

.social-section {
	margin: 38rpx 24rpx 0;
	padding: 24rpx;
	display: flex;
	align-items: center;
	gap: 18rpx;
	border: 1rpx solid #CED7CE;
	border-radius: 16rpx;
	background: #EDF3ED;
}

.social-mark {
	background: #4E7754;
	color: #FFF;
}

.social-kicker {
	display: block;
	font-size: 19rpx;
	font-weight: 700;
	color: #55735A;
}

.social-title {
	display: block;
	margin-top: 3rpx;
	font-size: 28rpx;
	line-height: 1.3;
	font-weight: 800;
	color: #2F3D31;
}

.social-desc {
	display: block;
	margin-top: 6rpx;
	font-size: 20rpx;
	line-height: 1.42;
	color: #677269;
}

.social-action {
	flex-shrink: 0;
	font-size: 21rpx;
	font-weight: 800;
	color: #3F6745;
	white-space: nowrap;
}

.store-panel {
	border: 1rpx solid #DDD7CF;
	border-radius: 16rpx;
	background: #FFF;
	overflow: hidden;
}

.store-primary-row {
	min-height: 124rpx;
	padding: 20rpx;
	display: flex;
	align-items: center;
	gap: 16rpx;
	box-sizing: border-box;
	border-bottom: 1rpx solid #E8E2DB;
}

.store-row-mark {
	background: #C96B3F;
	color: #FFF;
}

.store-row-label,
.store-detail-label {
	display: block;
	font-size: 19rpx;
	color: #958A80;
}

.store-row-value {
	display: block;
	margin-top: 5rpx;
	font-size: 24rpx;
	font-weight: 700;
	line-height: 1.42;
	color: #332D28;
}

.store-row-action {
	flex-shrink: 0;
	font-size: 21rpx;
	font-weight: 800;
	color: #B05E37;
}

.store-detail-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
}

.store-detail {
	min-width: 0;
	padding: 22rpx;
	box-sizing: border-box;
}

.store-detail + .store-detail {
	border-left: 1rpx solid #E8E2DB;
}

.store-detail-value {
	display: block;
	margin-top: 7rpx;
	font-size: 24rpx;
	font-weight: 800;
	line-height: 1.35;
	color: #3E3731;
}

.store-detail-value.accent { color: #B05E37; }

.store-detail-action {
	display: block;
	margin-top: 8rpx;
	font-size: 19rpx;
	color: #8A8077;
}

.home-review-list {
	display: flex;
	flex-direction: column;
	gap: 12rpx;
}

.review-card {
	padding: 22rpx;
	box-sizing: border-box;
	border: 1rpx solid #DDD7CF;
	border-radius: 14rpx;
	background: #FFF;
	box-shadow: none;
}

.review-header {
	display: flex;
	align-items: center;
}

.review-avatar {
	width: 52rpx;
	height: 52rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	background: #F1E8DE;
	font-size: 24rpx;
}

.review-meta {
	flex: 1;
	min-width: 0;
	margin-left: 14rpx;
}

.review-name {
	display: block;
	font-size: 24rpx;
	font-weight: 800;
	color: #332D28;
}

.review-stars {
	display: flex;
	gap: 2rpx;
	margin-top: 3rpx;
}

.star {
	font-size: 18rpx;
	color: #D8D1C9;
}

.star.filled { color: #D99028; }

.review-badge {
	flex-shrink: 0;
	padding: 5rpx 10rpx;
	border-radius: 8rpx;
	background: #F3ECE5;
	font-size: 18rpx;
	color: #9A5C3D;
	white-space: nowrap;
}

.review-tag-line {
	display: block;
	margin-top: 13rpx;
	font-size: 19rpx;
	color: #4E7754;
}

.review-text {
	display: -webkit-box;
	margin-top: 11rpx;
	overflow: hidden;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	font-size: 23rpx;
	line-height: 1.5;
	color: #5F574F;
}

.review-time {
	display: block;
	margin-top: 8rpx;
	font-size: 18rpx;
	color: #A39A92;
}

</style>
