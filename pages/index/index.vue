<template>
	<view class="page-wrapper">
		<!-- 营销弹窗 -->
		<view class="banner-popup" v-if="activeBanner" @tap="closeBanner">
			<view :class="bannerPanelClass" @tap.stop>
				<image
					class="banner-img"
					v-if="activeBanner.image_url"
					:src="activeBanner.image_url"
					mode="aspectFill"
					@tap="goBannerLink"
				/>
				<view class="banner-text-hero" v-else @tap="goBannerLink">
					<view class="banner-text-icon">{{ activeBanner.icon || '活' }}</view>
					<text class="banner-text-tag">{{ activeBanner.tag || '店内活动' }}</text>
				</view>
				<view class="banner-info">
					<text class="banner-title">{{ activeBanner.title }}</text>
					<text class="banner-sub" v-if="activeBanner.subtitle">{{ activeBanner.subtitle }}</text>
				</view>
				<view class="banner-actions">
					<view class="banner-secondary" @tap.stop="closeBanner">稍后</view>
					<view class="banner-primary" @tap.stop="goBannerLink">{{ activeBanner.cta_text || '去看看' }}</view>
				</view>
				<view class="banner-close" @tap.stop="closeBanner">
					<text>✕</text>
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

		<!-- ===== 天空背景 ===== -->
		<view class="sky-header">
			<view class="cloud cloud-1">
				<view class="puff p1"></view>
				<view class="puff p2"></view>
				<view class="puff p3"></view>
			</view>
			<view class="cloud cloud-2">
				<view class="puff p1"></view>
				<view class="puff p2"></view>
			</view>
			<view class="sun"></view>

			<view class="header-content">
				<text class="header-title">{{ constance.store_name || '摸鱼划水吧' }}</text>
				<text class="header-sub">大厅畅玩打底，包厢和套餐按需升级</text>
			</view>

			<view class="grass-hill">
				<view class="blade blade-1">🌿</view>
				<view class="blade blade-2">🌱</view>
				<view class="blade blade-3">🌿</view>
				<view class="blade blade-4">🌱</view>
			</view>
		</view>

		<!-- 收藏引导 -->
		<view class="collection-hint" v-if="!collectionHintClosed" @click="closeCollectionHint">
			<text class="hint-text">⭐️ 收藏小程序，下次预约更方便</text>
			<text class="hint-close">✕</text>
		</view>

		<!-- 可领券提醒 -->
		<view class="coupon-hint" v-if="showCouponHint" @tap="goToVoucher">
			<view class="coupon-hint-main">
				<text class="coupon-hint-icon">券</text>
				<view class="coupon-hint-copy">
					<text class="coupon-hint-title">{{ claimableCouponTitle }}</text>
					<text class="coupon-hint-sub">现在领取，下单时可直接抵扣</text>
				</view>
			</view>
			<view class="coupon-hint-right">
				<text class="coupon-hint-action">去领取</text>
				<text class="coupon-hint-close" @tap.stop="closeCouponHint">✕</text>
			</view>
		</view>

		<!-- 活动情报卡 -->
		<view class="activity-card" v-if="activityCard" @tap="goActivityCard">
			<view class="activity-icon">{{ activityCard.icon || '活' }}</view>
			<view class="activity-copy">
				<view class="activity-line">
					<text class="activity-tag">{{ activityCard.tag || '店内活动' }}</text>
					<text class="activity-title">{{ activityCard.title }}</text>
				</view>
				<text class="activity-sub" v-if="activityCard.subtitle">{{ activityCard.subtitle }}</text>
			</view>
			<view class="activity-side">
				<text class="activity-action">{{ activityCard.cta_text || '去看看' }}</text>
				<text class="activity-close" @tap.stop="closeActivityCard">✕</text>
			</view>
		</view>

		<!-- 好友邀请落地 -->
		<view class="invite-landing-card" v-if="showInviteLanding" @tap="handleInviteLandingTap">
			<view class="invite-landing-icon">礼</view>
			<view class="invite-landing-copy">
				<text class="invite-landing-kicker">好友邀请</text>
				<text class="invite-landing-title">{{ inviteLandingTitle }}</text>
				<text class="invite-landing-sub">{{ inviteLandingSub }}</text>
			</view>
			<view class="invite-landing-side">
				<text class="invite-landing-action">{{ inviteLandingAction }}</text>
				<text class="invite-landing-close" @tap.stop="closeInviteLanding">✕</text>
			</view>
		</view>

		<!-- 今日福利 -->
		<view :class="homeBenefitCardClass" @tap="handleHomeBenefitTap">
			<view class="benefit-copy">
				<text class="benefit-kicker">{{ homeBenefitKicker }}</text>
				<text class="benefit-title">{{ homeBenefitTitle }}</text>
				<text class="benefit-sub">{{ homeBenefitSub }}</text>
			</view>
			<view class="benefit-side">
				<view :class="homeBenefitDiceClass">
					<view class="dice-face">
						<view
							v-for="dot in homeDiceDots"
							:key="dot.key"
							:class="dot.className"
						></view>
					</view>
					<text class="dice-label">{{ homeDiceLabel }}</text>
				</view>
				<text class="benefit-action">{{ homeBenefitAction }}</text>
			</view>
		</view>

		<!-- ===== 场景套餐 ===== -->
		<view class="scene-section">
			<view class="scene-section-head">
				<view>
					<text class="scene-title">今天想怎么玩？</text>
					<text class="scene-sub">先选场景，再决定买票、加购或约包厢</text>
				</view>
				<text class="scene-note">推荐</text>
			</view>
			<view class="scene-hero-card" v-if="primaryScenePackage" @tap="handleSceneTap(primaryScenePackage)">
				<view class="scene-hero-main">
					<text class="scene-hero-icon">{{ primaryScenePackage.icon }}</text>
					<view class="scene-hero-text">
						<text class="scene-hero-badge">{{ primaryScenePackage.badge }}</text>
						<text class="scene-hero-name">{{ primaryScenePackage.name }}</text>
						<text class="scene-hero-desc">{{ primaryScenePackage.desc }}</text>
					</view>
				</view>
				<view class="scene-hero-price">
					<text class="scene-price">{{ primaryScenePackage.price }}</text>
					<text class="scene-action">{{ primaryScenePackage.actionText }}</text>
				</view>
			</view>
			<view class="scene-grid">
				<view class="scene-card" v-for="scene in secondaryScenePackages" :key="scene.key" @tap="handleSceneTap(scene)">
					<view class="scene-card-top">
						<text class="scene-card-icon">{{ scene.icon }}</text>
						<text class="scene-card-badge">{{ scene.badge }}</text>
					</view>
					<text class="scene-card-name">{{ scene.name }}</text>
					<text class="scene-card-desc">{{ scene.desc }}</text>
					<view class="scene-card-foot">
						<text class="scene-card-price">{{ scene.price }}</text>
						<text class="scene-card-action">{{ scene.actionText }}</text>
					</view>
				</view>
			</view>
		</view>

		<!-- ===== 社交空间入口 ===== -->
		<view class="social-space-card" @tap="goToGroupSquare">
			<view class="social-copy">
				<text class="social-kicker">第三空间</text>
				<text class="social-title">今天有没有人差位？</text>
				<text class="social-desc">先看包厢/主机组局；只玩大厅的话，买票后也能在票包送好友。</text>
			</view>
			<view class="social-side">
				<text class="social-badge">找队友</text>
				<text class="social-action">去看看 →</text>
			</view>
		</view>

		<!-- ===== 轮播 ===== -->
		<view class="carousel-wrapper" v-if="carouselList.length > 0">
			<swiper class="carousel" circular autoplay interval="4000" @change="swiperChange">
				<swiper-item v-for="(img, idx) in carouselList" :key="idx">
					<image :src="img" class="carousel-image" mode="aspectFill" />
				</swiper-item>
			</swiper>
			<view class="carousel-indicator">
				<view v-for="i in swiperLength" :key="i" :class="swiperCurrent === i - 1 ? 'indicator-dot active' : 'indicator-dot'"></view>
			</view>
		</view>

		<!-- ===== 店里玩什么 ===== -->
		<view class="section">
			<view class="section-header">
				<text class="section-title">🎮 店里玩什么</text>
				<text class="section-sub">大厅免费玩，包间另计费</text>
			</view>
			<view class="world-grid">
				<view class="world-card" v-for="(item, idx) in entertainmentItems" :key="idx" :style="item.cardStyle">
					<view class="world-top">
						<text class="world-emoji">{{ item.emoji }}</text>
						<text class="world-tag" :style="item.tagStyle">{{ item.tag }}</text>
					</view>
					<text class="world-name">{{ item.name }}</text>
					<text class="world-desc">{{ item.desc }}</text>
				</view>
			</view>
		</view>

		<!-- ===== 增值服务 ===== -->
		<view class="section upsell-section">
			<view class="section-header">
				<text class="section-title">💎 到店还能升级</text>
				<text class="section-sub">布置、补给、包厢按需加</text>
			</view>
			<view class="upsell-list">
				<view class="upsell-item" v-for="item in upsellItems" :key="item.key" @tap="handleUpsellTap(item)">
					<view class="upsell-icon" :style="item.style">{{ item.icon }}</view>
					<view class="upsell-body">
						<text class="upsell-name">{{ item.name }}</text>
						<text class="upsell-desc">{{ item.desc }}</text>
					</view>
					<text class="upsell-price">{{ item.price }}</text>
				</view>
			</view>
		</view>

		<!-- ===== 店铺信息 ===== -->
		<view class="section">
			<view class="section-header">
				<text class="section-title">🏠 店铺信息</text>
			</view>
			<view class="shop-card">
				<view class="shop-header-row">
					<text class="shop-name">{{ constance.store_name || '摸鱼划水吧' }}</text>
					<view class="shop-status">
						<text class="status-dot"></text>
						<text class="status-text">营业中</text>
					</view>
				</view>
				<view class="info-row" @tap="openLocation">
					<text class="info-icon">📍</text>
					<view class="info-text">
						<text class="info-label">地址</text>
						<text class="info-value">{{(constance.store_address || addressData.address) + (constance.store_area || addressData.area)}}</text>
					</view>
					<text class="info-action">导航</text>
				</view>
				<view class="info-row">
					<text class="info-icon">🕐</text>
					<view class="info-text">
						<text class="info-label">营业时间</text>
						<text class="info-value">{{ constance.business_hours || '10:00 - 22:00' }}</text>
					</view>
				</view>
				<view class="info-row">
					<text class="info-icon">📞</text>
					<view class="info-text">
						<text class="info-label">电话</text>
						<text class="info-value highlight">{{constance.phone_number || '83596103'}}</text>
					</view>
				</view>
				<view class="info-row">
					<text class="info-icon">📶</text>
					<view class="info-text">
						<text class="info-label">WiFi</text>
						<text class="info-value">{{constance.wifi_account || 'moyu888'}} / {{constance.wifi_password || 'moyu888'}}</text>
					</view>
				</view>
				<view class="info-row" @tap="openStoreNotice">
					<text class="info-icon">📋</text>
					<view class="info-text">
						<text class="info-label">入店须知</text>
						<text class="info-value">大厅票、包厢升级、退款规则</text>
					</view>
					<text class="info-action">查看</text>
				</view>
			</view>
		</view>

		<!-- ===== 玩家评价 ===== -->
		<view class="section" v-if="reviews.length > 0">
			<view class="section-header">
				<view class="section-title-wrap">
					<text class="section-title">💬 玩家怎么说</text>
					<text class="section-sub">{{ reviewSummaryText }}</text>
				</view>
				<text class="section-more" @tap="goToMyReviews">{{ hasLogin ? '写评价 →' : '登录评价 →' }}</text>
			</view>
			<swiper class="reviews-swiper" vertical autoplay circular interval="4000">
				<swiper-item v-for="(rev, idx) in reviews" :key="idx">
					<view class="review-card">
						<view class="review-header">
							<text class="review-avatar">{{ rev.avatarText }}</text>
							<view class="review-meta">
								<text class="review-name">{{ rev.displayName }}</text>
								<view class="review-stars">
									<text v-for="s in 5" :key="s" :class="s <= rev.ratingNumber ? 'star filled' : 'star'">⭐</text>
								</view>
							</view>
							<text class="review-badge">{{ rev.recommendText }}</text>
						</view>
						<text class="review-text">{{ rev.contentText }}</text>
						<text class="review-time">{{ rev.shortTime }}</text>
					</view>
				</swiper-item>
			</swiper>
		</view>

		<custom-tab-bar></custom-tab-bar>
	</view>
</template>

<script>
	import AUTH from '../../utils/auth.js'
	import { mapState, mapActions, mapMutations } from 'vuex';
	import customTabBar from '@/custom-tab-bar/index.vue';
	export default {
		components: { customTabBar },
		computed: {
			...mapState(['hasLogin', 'constance', 'token', 'pending_invite_code']),
			ticketPriceFen() {
				const price = this.constance && this.constance.ticket_price_per_person;
				return price ? parseInt(price) : 3800;
			},
			ticketPriceText() {
				return '¥' + (this.ticketPriceFen / 100).toFixed(0) + '/人';
			},
			ticketPriceHalfText() {
				return '¥' + (this.ticketPriceFen / 200).toFixed(0);
			},
			doubleTicketText() {
				return '¥' + (this.ticketPriceFen * 2 / 100).toFixed(0) + '起';
			},
			fourTicketText() {
				return '¥' + (this.ticketPriceFen * 4 / 100).toFixed(0) + '起';
			},
			scenePackages() {
				return [
					{
						key: 'single',
						icon: '🎫',
						badge: '引流款',
						name: '一个人放空',
						desc: '漫画小说、桌游、茶水零食，买票进来慢慢待',
						price: this.ticketPriceText,
						actionText: '买大厅票',
						action: 'ticket',
						count: 1,
					},
					{
						key: 'couple',
						icon: '🥤',
						badge: '双人',
						name: '两个人休闲',
						desc: '适合约会、朋友小聚，到店可加饮品零食',
						price: this.doubleTicketText,
						actionText: '买2张',
						action: 'ticket',
						count: 2,
					},
					{
						key: 'group',
						icon: '🎲',
						badge: '多人',
						name: '四人桌游局',
						desc: '先买入场票，想更安静再升级包厢',
						price: this.fourTicketText,
						actionText: '买4张',
						action: 'ticket',
						count: 4,
					},
					{
						key: 'room',
						icon: '🎮',
						badge: '升级',
						name: '包厢主机局',
						desc: 'Switch / PS / 私密空间，适合提前预约',
						price: '按小时',
						actionText: '去预约',
						action: 'reserve',
					},
				];
			},
			primaryScenePackage() {
				return this.scenePackages[0] || null;
			},
			secondaryScenePackages() {
				return this.scenePackages.slice(1);
			},
			showCouponHint() {
				return this.hasLogin && !this.showInviteLanding && !this.couponHintClosed && this.claimableCouponCount > 0;
			},
			bannerPanelClass() {
				var names = ['banner-panel'];
				if (!this.activeBanner || !this.activeBanner.image_url) names.push('text-only');
				return names.join(' ');
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
			homeBenefitKicker() {
				if (!this.hasLogin) return '新手投骰';
				if (this.checkInInfo.checked_in_today) return '骰子已落定';
				if (this.checkInInfo.can_check_in) return '今日投骰';
				return '回访奖励';
			},
			homeBenefitCardClass() {
				var names = ['home-benefit-card'];
				if (this.checkInInfo.checked_in_today) names.push('checked');
				if (this.checkInRolling) names.push('loading');
				return names.join(' ');
			},
			homeBenefitTitle() {
				if (!this.hasLogin) return '登录解锁今日投骰';
				if (this.checkInInfo.checked_in_today) return '今日已投骰';
				if (this.checkInInfo.can_check_in) return '投骰领' + this.homeCheckInPointsText;
				return '明天继续来领';
			},
			homeBenefitSub() {
				if (!this.hasLogin) return '登录后点亮每日棋盘，积分和优惠券一起攒';
				var streak = Number(this.checkInInfo.current_streak || 0);
				if (this.checkInInfo.checked_in_today) {
					return streak > 0 ? '已连续' + streak + '天，明天可领' + this.tomorrowCheckInPointsText : '明天继续投骰攒积分';
				}
				if (streak > 0) return '已连续' + streak + '天，今天别让棋子停下';
				return '每天投一次，兑换卡券更快';
			},
			homeBenefitAction() {
				if (!this.hasLogin) return '登录';
				if (this.checkInInfo.can_check_in) return '投骰';
				return '看卡券';
			},
			homeBenefitDiceClass() {
				var names = ['benefit-dice'];
				if (this.checkInRolling) names.push('rolling');
				if (this.checkInInfo.checked_in_today) names.push('done');
				return names.join(' ');
			},
			homeDiceLabel() {
				if (this.checkInRolling) return '投骰中';
				if (!this.hasLogin) return '新手骰';
				if (this.checkInInfo.checked_in_today) return '已投' + this.homeDiceNumber + '点';
				if (this.checkInInfo.can_check_in) return '今日可投';
				return '明日再投';
			},
			homeDiceNumber() {
				var streak = Number(this.checkInInfo.current_streak || 0);
				var points = Number(this.checkInInfo.points_earned_today || this.checkInInfo.next_points || 0);
				if (this.checkInInfo.can_check_in) streak += 1;
				return this.getCheckInDiceNumber(streak, points);
			},
			homeDiceDots() {
				return this.buildDiceDots(this.homeDiceNumber);
			},
			homeCheckInPointsText() {
				var points = this.checkInInfo.next_points || (this.checkInInfo.config && this.checkInInfo.config.daily_points) || 10;
				return '+' + points + '积分';
			},
			tomorrowCheckInPointsText() {
				var points = this.checkInInfo.tomorrow_points || this.checkInInfo.next_points || (this.checkInInfo.config && this.checkInInfo.config.daily_points) || 10;
				return '+' + points + '积分';
			},
			reviewSummaryText() {
				if (this.reviewAverageText) {
					return this.reviewAverageText + ' · ' + this.reviewTotalCount + '条真实体验';
				}
				return this.reviewTotalCount + '条真实体验';
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
		},
		data() {
			return {
				swiperCurrent: 0,
				activeBanner: null,
				activityCard: null,
				swiperLength: 0,
				carouselList: [],
				addressData: {
					name: '摸鱼划水吧',
					address: '福建省福州市鼓楼区',
					area: '6号儒商楼08店面',
				},


				entertainmentItems: [
					{ emoji: '🎮', name: '主机游戏', desc: 'Switch / PS / 双人闯关', tag: '包间另计', cardStyle: 'border-top-color: #A8C8EC;', tagStyle: 'background: #E3F0FC; color: #4A90D9;' },
					{ emoji: '🎲', name: '桌游天地', desc: '2-8人聚会，轻松开局', tag: '大厅免费', cardStyle: 'border-top-color: #F0B8B8;', tagStyle: 'background: #FCE8E8; color: #D86060;' },
					{ emoji: '📚', name: '漫画小说', desc: '一个人来也能安静待很久', tag: '大厅免费', cardStyle: 'border-top-color: #E8D4A0;', tagStyle: 'background: #FFF5D6; color: #B89630;' },
					{ emoji: '📖', name: '亲子阅读', desc: '儿童半价，周末更好安排', tag: '大厅免费', cardStyle: 'border-top-color: #A8D8A8;', tagStyle: 'background: #E0F5E0; color: #4A9A4A;' },
				],
				upsellItems: [
					{ key: 'room', icon: '🎮', name: '包厢主机升级', desc: '想玩 Switch / PS，先预约更稳', price: '按小时', action: 'reserve', style: 'background: #E3F0FC;' },
					{ key: 'snack', icon: '🍿', name: '饮品零食补给', desc: '多人局、下午场适合加一份小食饮品', price: '到店选', action: 'voucher', style: 'background: #FFF5D6;' },
					{ key: 'decor', icon: '🎈', name: '生日氛围布置', desc: '气球、花艺、小道具，适合庆生拍照', price: '58元起', action: 'reserve', style: 'background: #FCE8E8;' },
					{ key: 'party', icon: '🎂', name: '生日/团建小局', desc: '4人以上建议提前约位置，布置补给可加选', price: '可加选', action: 'reserve', style: 'background: #E0F5E0;' },
				],
				reviews: [],
				reviewTotalCount: 0,
				reviewAverageText: '',
				reviewsLoaded: false,
				collectionHintClosed: false,
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
				pageViewLastTrackedAt: 0,
				homeBenefitLastTrackedAt: 0,
				inviteLandingClosed: false,
				inviteLandingTrackedCode: '',
			};
		},
		onShow() {
			uni.$emit('tabBarChange', { key: 'index' });
			this.schedulePageViewTrack();
			this.trackHomeBenefitView();
			this.trackInviteLandingView();
			if (this.constance) this.loadData();
			this.collectionHintClosed = uni.getStorageSync('collection_hint_closed');
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
			this.collectionHintClosed = uni.getStorageSync('collection_hint_closed');
			this.scheduleDeferredRefresh(true);
			this.trackHomeBenefitView();
			this.trackInviteLandingView();
		},
		methods: {
			...mapActions(['loginAndRegister', 'getConstanceInfo', 'getReviewList']),
			...mapMutations(['setPendingInviteCode']),
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
				uni.openLocation({
					latitude: parseFloat(this.constance.store_latitude || 26.068525),
					longitude: parseFloat(this.constance.store_longitude || 119.303882),
					scale: 5,
					name: this.constance.store_name || this.addressData.name,
					address: (this.constance.store_address || this.addressData.address) + (this.constance.store_area || this.addressData.area)
				});
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
			goToVoucher(source) {
				if (typeof source !== 'string') source = 'home_coupon_hint';
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
			buildDiceDots(number) {
				var map = {
					1: ['center'],
					2: ['top-left', 'bottom-right'],
					3: ['top-left', 'center', 'bottom-right'],
					4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
					5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
					6: ['top-left', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-right']
				};
				var positions = map[number] || map[1];
				return positions.map(function(pos, idx) {
					return {
						key: 'dot' + idx,
						className: 'dice-dot ' + pos
					};
				});
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
					this.goToVoucher();
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
				} else if (scene.action === 'reserve') {
					this.goToReserve();
				} else if (scene.action === 'voucher') {
					this.goToVoucher('home_scene');
				} else if (scene.action === 'location') {
					this.openLocation();
				}
			},
			handleUpsellTap(item) {
				if (!item) return;
				if (item.action === 'voucher') {
					this.goToVoucher('home_upsell');
				} else if (item.action === 'reserve') {
					this.goToReserve();
				}
			},
			goToMyReviews() {
				if (!this.hasLogin) {
					uni.showModal({
						title: '提示',
						content: '登录后可以发表自己的体验',
						success: (res) => {
							if (res.confirm) {
								this.loginAndRegister().catch(() => {});
							}
						}
					});
					return;
				}
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
				this.swiperLength = this.carouselList.length;
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
					var list = await this.getReviewList();
					this.reviewsLoaded = true;
					this.reviewsLastLoadedAt = Date.now();
					if (!list || list.length === 0) {
						this.reviews = [];
						this.reviewTotalCount = 0;
						this.reviewAverageText = '';
						return;
					}
					var prepared = [];
					var ratingTotal = 0;
					var ratingCount = 0;
					for (var i = 0; i < list.length; i++) {
						var item = this.prepareReviewItem(list[i]);
						if (!item) continue;
						prepared.push(item);
						if (item.ratingNumber > 0) {
							ratingTotal += item.ratingNumber;
							ratingCount += 1;
						}
					}
					this.reviewTotalCount = prepared.length;
					this.reviewAverageText = ratingCount > 0 ? (ratingTotal / ratingCount).toFixed(1) + '分' : '';
					this.reviews = prepared.slice(0, 5);
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
			prepareReviewItem(raw) {
				if (!raw) return null;
				var content = (raw.content || '').replace(/\s+/g, ' ').trim();
				if (!content) return null;
				var rating = parseInt(raw.rating || 0);
				if (!isFinite(rating)) rating = 0;
				if (rating < 0) rating = 0;
				if (rating > 5) rating = 5;
				var name = raw.user_nickname || '匿名玩家';
				var text = content.length > 58 ? content.slice(0, 58) + '...' : content;
				var time = raw.created_at || '';
				var shortTime = time;
				if (time.length >= 10) {
					shortTime = time.slice(5, 10);
				}
				var avatar = raw.user_avatar || '';
				var avatarText = avatar && avatar.indexOf('http') !== 0 && avatar.length <= 4 ? avatar : '😄';
				return {
					object_id: raw.object_id,
					user_id: raw.user_id,
					displayName: name,
					avatarText: avatarText,
					ratingNumber: rating,
					contentText: text,
					shortTime: shortTime,
					recommendText: rating >= 5 ? '超推荐' : (rating >= 4 ? '推荐' : '体验反馈'),
				};
			},
			swiperChange(e) {
				this.swiperCurrent = e.detail.current;
			},
			onShareAppMessage() {
				const ticketPrice = this.ticketPriceText || '¥38/人';
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
			closeCollectionHint() {
				this.collectionHintClosed = true;
				uni.setStorageSync('collection_hint_closed', true);
			},
			recordBannerAction(banner, action) {
				if (!banner || !banner.id) return;
				AUTH.recordBanner(banner.id, action).catch(function() {});
			},
			getBannerStorageKey(banner, type) {
				if (!banner || !banner.id) return '';
				return 'activity_' + type + '_' + banner.id;
			},
			findActivityBanner(list, withImage) {
				list = list || [];
				for (var i = 0; i < list.length; i++) {
					var item = list[i];
					if (!item) continue;
					if (withImage && item.image_url) return item;
					if (!withImage && !item.image_url) return item;
				}
				return null;
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
			checkBanner() {
				if (this.bannerLoading) return;
				var checkedAt = Date.now();
				if (this.bannerLastCheckedAt && checkedAt - this.bannerLastCheckedAt < 5 * 60 * 1000) return;
				this.bannerLoading = true;
				AUTH.activeBanners().then(res => {
					this.bannerLastCheckedAt = Date.now();
					if (res._status !== 0 || !res.data || res.data.length === 0) return;
					var list = res.data || [];
					var now = Date.now();
					var card = this.findActivityBanner(list, false);
					if (card) {
						var cardKey = this.getBannerStorageKey(card, 'card_closed');
						var cardClosedAt = uni.getStorageSync(cardKey);
						if (!cardClosedAt || now - cardClosedAt >= 12 * 60 * 60 * 1000) {
							if (!this.activityCard || this.activityCard.id !== card.id) {
								this.activityCard = card;
								this.recordBannerAction(card, 'show');
							}
						}
					}

					var popup = this.findActivityBanner(list, true);
					if (!popup || this.activeBanner || this.showInviteLanding || this.storeNoticeVisible) return;
					var popupKey = this.getBannerStorageKey(popup, 'popup_shown');
					var popupShownAt = uni.getStorageSync(popupKey);
					if (popupShownAt && now - popupShownAt < 24 * 60 * 60 * 1000) return;
					this.activeBanner = popup;
					uni.setStorageSync(popupKey, now);
					this.recordBannerAction(popup, 'show');
				}).catch(function() {
				}).then(function() {
					this.bannerLoading = false;
				}.bind(this));
			},
			closeBanner(options) {
				var skipRecord = options && options.skipRecord === true;
				if (!skipRecord) this.recordBannerAction(this.activeBanner, 'close');
				this.activeBanner = null;
			},
			goBannerLink() {
				if (!this.activeBanner) return;
				var b = this.activeBanner;
				this.recordBannerAction(b, 'click');
				this.openActivityTarget(b);
				this.closeBanner({ skipRecord: true });
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
/* ===== 全局 ===== */
page { background: #FFF8F0; }
.page-wrapper { min-height: 100vh; padding-bottom: 140rpx; }

/* ===== 天空背景 ===== */
.sky-header {
	position: relative;
	background: linear-gradient(180deg, #FFF0E0 0%, #FFF5EC 50%, #FFF8F0 100%);
	padding: 80rpx 32rpx 60rpx;
	overflow: hidden;
	text-align: center;
}
.cloud {
	position: absolute;
	background: #FFF;
	border-radius: 60rpx;
	opacity: 0.5;
}
.cloud .puff {
	position: absolute;
	background: #FFF;
	border-radius: 50%;
}
.cloud-1 {
	width: 120rpx; height: 40rpx;
	top: 24rpx; right: 48rpx;
	animation: float 12s ease-in-out infinite;
}
.cloud-1 .p1 { width: 48rpx; height: 48rpx; top: -22rpx; left: 14rpx; }
.cloud-1 .p2 { width: 40rpx; height: 40rpx; top: -16rpx; right: 18rpx; }
.cloud-1 .p3 { width: 32rpx; height: 32rpx; top: -8rpx; left: 46rpx; }
.cloud-2 {
	width: 80rpx; height: 28rpx;
	top: 50rpx; left: 40rpx;
	opacity: 0.35;
	animation: float 14s ease-in-out infinite;
	animation-delay: -5s;
}
.cloud-2 .p1 { width: 36rpx; height: 36rpx; top: -16rpx; left: 10rpx; }
.cloud-2 .p2 { width: 28rpx; height: 28rpx; top: -10rpx; right: 12rpx; }
.sun {
	position: absolute;
	top: 30rpx;
	right: 160rpx;
	width: 48rpx;
	height: 48rpx;
	background: #FFE4A1;
	border-radius: 50%;
	box-shadow: 0 0 24rpx rgba(255, 228, 161, 0.5);
}
@keyframes float {
	0%, 100% { transform: translateX(0); }
	50% { transform: translateX(16rpx); }
}
.header-content { position: relative; z-index: 2; }
.header-title {
	font-size: 48rpx;
	font-weight: bold;
	color: #5C4B3A;
	letter-spacing: 4rpx;
	display: block;
}
.header-sub {
	font-size: 24rpx;
	color: #A08B7A;
	margin-top: 10rpx;
	display: block;
}
.grass-hill {
	position: absolute;
	bottom: -10rpx;
	left: -10%;
	right: -10%;
	height: 50rpx;
	background: linear-gradient(180deg, transparent 0%, #A5D6A7 100%);
	border-radius: 50% 50% 0 0 / 100% 100% 0 0;
}
.blade {
	position: absolute;
	font-size: 24rpx;
	bottom: 8rpx;
	animation: grass-sway 3s ease-in-out infinite;
}
.blade-1 { left: 15%; }
.blade-2 { left: 35%; animation-delay: 0.5s; }
.blade-3 { left: 65%; animation-delay: 1s; }
.blade-4 { left: 85%; animation-delay: 1.5s; }
@keyframes grass-sway {
	0%, 100% { transform: rotate(-5deg); }
	50% { transform: rotate(5deg); }
}

/* ===== 收藏引导 ===== */
.favorite-tip {
	display: flex;
	align-items: center;
	justify-content: center;
	background: linear-gradient(90deg, #FFF8E1, #FFF3E0);
	margin: 16rpx 24rpx 0;
	padding: 14rpx 24rpx;
	border-radius: 50rpx;
	border: 2rpx solid #FFD54F;
	gap: 12rpx;
}
.favorite-icon { font-size: 28rpx; }
.favorite-text { font-size: 24rpx; color: #F57C00; flex: 1; text-align: center; }
.favorite-close { font-size: 22rpx; color: #FFB74D; padding: 4rpx; }

/* ===== 场景套餐 ===== */
.scene-section {
	margin: 20rpx 24rpx 24rpx;
	background: #FFF;
	border-radius: 28rpx;
	padding: 24rpx;
	box-shadow: 0 8rpx 30rpx rgba(92,75,58,0.08);
	border: 2rpx solid rgba(255,181,167,0.18);
}
.scene-section-head {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	margin-bottom: 18rpx;
}
.scene-title {
	display: block;
	font-size: 34rpx;
	font-weight: bold;
	color: #5C4B3A;
}
.scene-sub {
	display: block;
	font-size: 22rpx;
	color: #A08B7A;
	margin-top: 4rpx;
}
.scene-note {
	font-size: 20rpx;
	color: #FF8C42;
	background: #FFF3E8;
	padding: 6rpx 14rpx;
	border-radius: 20rpx;
	font-weight: bold;
}
.scene-hero-card {
	background: linear-gradient(135deg, #FF8C42 0%, #FFB56D 100%);
	border-radius: 24rpx;
	padding: 24rpx;
	color: #FFF;
	box-shadow: 0 10rpx 28rpx rgba(255,140,66,0.22);
}
.scene-hero-main {
	display: flex;
	align-items: center;
	gap: 18rpx;
}
.scene-hero-icon {
	width: 92rpx;
	height: 92rpx;
	background: rgba(255,255,255,0.22);
	border-radius: 24rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 48rpx;
	flex-shrink: 0;
}
.scene-hero-text {
	flex: 1;
	min-width: 0;
}
.scene-hero-badge {
	display: inline-block;
	font-size: 20rpx;
	color: #FF8C42;
	background: rgba(255,255,255,0.92);
	padding: 4rpx 12rpx;
	border-radius: 14rpx;
	font-weight: bold;
	margin-bottom: 8rpx;
}
.scene-hero-name {
	display: block;
	font-size: 34rpx;
	font-weight: bold;
	line-height: 1.2;
}
.scene-hero-desc {
	display: block;
	font-size: 23rpx;
	line-height: 1.45;
	opacity: 0.92;
	margin-top: 6rpx;
}
.scene-hero-price {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-top: 20rpx;
	padding-top: 18rpx;
	border-top: 1rpx solid rgba(255,255,255,0.28);
}
.scene-price {
	font-size: 36rpx;
	font-weight: 800;
}
.scene-action {
	font-size: 24rpx;
	color: #FF8C42;
	background: #FFF;
	padding: 10rpx 22rpx;
	border-radius: 28rpx;
	font-weight: bold;
}
.scene-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 14rpx;
	margin-top: 16rpx;
}
.scene-card {
	background: #FFF8F0;
	border-radius: 22rpx;
	padding: 20rpx;
	border: 1rpx solid #F4E3D0;
}
.scene-card-top {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 12rpx;
}
.scene-card-icon { font-size: 36rpx; }
.scene-card-badge {
	font-size: 18rpx;
	color: #8D6E63;
	background: #FFF;
	border-radius: 14rpx;
	padding: 4rpx 10rpx;
	font-weight: bold;
}
.scene-card-name {
	display: block;
	font-size: 28rpx;
	font-weight: bold;
	color: #5C4B3A;
	line-height: 1.25;
}
.scene-card-desc {
	display: block;
	font-size: 21rpx;
	color: #8D6E63;
	line-height: 1.45;
	margin-top: 8rpx;
	min-height: 62rpx;
}
.scene-card-foot {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-top: 14rpx;
}
.scene-card-price {
	font-size: 26rpx;
	font-weight: bold;
	color: #FF8C42;
}
.scene-card-action {
	font-size: 20rpx;
	color: #FFF;
	background: #FF8C42;
	padding: 7rpx 14rpx;
	border-radius: 20rpx;
}

/* ===== 社交空间入口 ===== */
.social-space-card {
	margin: 0 24rpx 24rpx;
	background: linear-gradient(135deg, #EAF7EC 0%, #FFF8F0 62%, #FFE8D0 100%);
	border-radius: 28rpx;
	padding: 26rpx;
	display: flex;
	align-items: center;
	justify-content: space-between;
	border: 2rpx solid rgba(129,199,132,0.2);
	box-shadow: 0 8rpx 28rpx rgba(92,75,58,0.07);
}
.social-copy { flex: 1; min-width: 0; padding-right: 18rpx; }
.social-kicker { display: block; font-size: 22rpx; color: #4A9A4A; font-weight: bold; margin-bottom: 6rpx; }
.social-title { display: block; font-size: 34rpx; color: #5C4B3A; font-weight: bold; line-height: 1.25; }
.social-desc { display: block; font-size: 23rpx; color: #7C6A58; line-height: 1.45; margin-top: 8rpx; }
.social-side { display: flex; flex-direction: column; align-items: flex-end; gap: 14rpx; flex-shrink: 0; }
.social-badge { font-size: 22rpx; color: #FFF; background: #81C784; border-radius: 18rpx; padding: 8rpx 16rpx; font-weight: bold; }
.social-action { font-size: 24rpx; color: #FF8C42; font-weight: bold; }

/* ===== 轮播 ===== */
.carousel-wrapper { margin: 0 24rpx; }
.carousel { width: 100%; height: 360rpx; border-radius: 28rpx; overflow: hidden; box-shadow: 0 8rpx 32rpx rgba(92,75,58,0.1); }
.carousel-image { width: 100%; height: 100%; }
.carousel-indicator { display: flex; justify-content: center; gap: 10rpx; padding-top: 16rpx; }
.indicator-dot { width: 14rpx; height: 14rpx; border-radius: 50%; background: #E0D5CC; transition: all 0.3s; }
.indicator-dot.active { width: 40rpx; border-radius: 20rpx; background: #FF8C42; }
/* ===== 通用区块 ===== */
.section { margin: 0 24rpx 28rpx; }
.section-header { display: flex; align-items: baseline; gap: 10rpx; margin-bottom: 16rpx; }
.section-title-wrap { flex: 1; min-width: 0; }
.section-title { font-size: 32rpx; font-weight: bold; color: #5C4B3A; }
.section-sub { display: block; font-size: 22rpx; color: #C4B5A5; margin-top: 4rpx; }
.section-more { margin-left: auto; font-size: 22rpx; color: #FF8C42; font-weight: 500; }

/* ===== 店里玩什么 ===== */
.world-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; }
.world-card {
	position: relative;
	background: #FFF;
	border-radius: 24rpx;
	padding: 24rpx;
	border-top: 6rpx solid;
	box-shadow: 0 2rpx 12rpx rgba(92,75,58,0.06);
}
.world-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12rpx; }
.world-emoji { font-size: 40rpx; }
.world-tag { font-size: 20rpx; padding: 4rpx 10rpx; border-radius: 10rpx; font-weight: bold; }
.world-name { display: block; font-size: 28rpx; font-weight: bold; color: #5C4B3A; }
.world-desc { display: block; font-size: 21rpx; color: #A08B7A; line-height: 1.45; margin-top: 8rpx; }

/* ===== 增值服务 ===== */
.upsell-section { margin-top: 0; }
.upsell-list {
	display: flex;
	flex-direction: column;
	gap: 12rpx;
}
.upsell-item {
	display: flex;
	align-items: center;
	background: #FFF;
	border-radius: 20rpx;
	padding: 20rpx;
	box-shadow: 0 2rpx 12rpx rgba(92,75,58,0.06);
	border: 1rpx solid rgba(240,230,216,0.7);
}
.upsell-icon {
	width: 72rpx;
	height: 72rpx;
	border-radius: 20rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 36rpx;
	flex-shrink: 0;
	margin-right: 16rpx;
}
.upsell-body {
	flex: 1;
	min-width: 0;
}
.upsell-name {
	display: block;
	font-size: 27rpx;
	font-weight: bold;
	color: #5C4B3A;
	margin-bottom: 4rpx;
}
.upsell-desc {
	display: block;
	font-size: 21rpx;
	color: #A08B7A;
	line-height: 1.4;
}
.upsell-price {
	margin-left: 14rpx;
	font-size: 22rpx;
	color: #FF8C42;
	font-weight: bold;
	background: #FFF3E8;
	padding: 8rpx 14rpx;
	border-radius: 18rpx;
	flex-shrink: 0;
}

/* ===== 店铺信息 ===== */
.shop-card { background: #FFF; border-radius: 28rpx; padding: 24rpx; box-shadow: 0 2rpx 12rpx rgba(92,75,58,0.06); }
.shop-header-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20rpx; }
.shop-name { font-size: 32rpx; font-weight: bold; color: #5C4B3A; }
.shop-status { display: flex; align-items: center; gap: 8rpx; }
.status-dot { width: 10rpx; height: 10rpx; border-radius: 50%; background: #81C784; }
.status-text { font-size: 22rpx; color: #81C784; }
.info-row { display: flex; align-items: center; gap: 14rpx; padding: 12rpx 0; border-bottom: 1rpx solid #F5F0E8; }
.info-row:last-child { border-bottom: none; }
.info-icon { font-size: 32rpx; }
.info-text { flex: 1; }
.info-label { display: block; font-size: 20rpx; color: #C4B5A5; margin-bottom: 2rpx; }
.info-value { display: block; font-size: 24rpx; color: #5C4B3A; }
.info-value.highlight { color: #FF8C42; font-weight: bold; }
.info-action { font-size: 22rpx; color: #FF8C42; background: #FFF3E8; padding: 6rpx 16rpx; border-radius: 20rpx; font-weight: 500; }

/* ===== 评价 ===== */
.reviews-swiper { height: 278rpx; }
.review-card { background: #FFF; border-radius: 24rpx; padding: 22rpx; box-shadow: 0 2rpx 12rpx rgba(92,75,58,0.06); height: calc(100% - 44rpx); margin: 10rpx 4rpx; border: 1rpx solid rgba(255,181,167,0.18); box-sizing: border-box; }
.review-header { display: flex; align-items: center; gap: 12rpx; margin-bottom: 12rpx; }
.review-avatar { font-size: 44rpx; }
.review-meta { flex: 1; min-width: 0; }
.review-name { display: block; font-size: 26rpx; font-weight: bold; color: #5C4B3A; margin-bottom: 2rpx; }
.review-stars { display: flex; gap: 4rpx; }
.star { font-size: 18rpx; opacity: 0.3; }
.star.filled { opacity: 1; }
.review-badge { font-size: 20rpx; color: #FF8C42; background: #FFF3E8; padding: 6rpx 12rpx; border-radius: 16rpx; flex-shrink: 0; }
.review-text { display: -webkit-box; font-size: 24rpx; color: #6F5A48; line-height: 1.55; margin-bottom: 8rpx; overflow: hidden; text-overflow: ellipsis; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.review-time { font-size: 18rpx; color: #C4B5A5; }
/* ===== 营销弹窗 ===== */
.banner-popup { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 40rpx; }
.banner-panel { background: #FFF; border-radius: 28rpx; overflow: hidden; width: 100%; max-width: 600rpx; position: relative; animation: popup-in 0.3s ease; box-shadow: 0 16rpx 48rpx rgba(0,0,0,0.15); }
.banner-panel.text-only { padding-top: 32rpx; }
.banner-img { width: 100%; height: 400rpx; }
.banner-text-hero { display: flex; flex-direction: column; align-items: center; padding: 8rpx 30rpx 0; }
.banner-text-icon { width: 96rpx; height: 96rpx; border-radius: 28rpx; background: #FFF3E8; color: #FF8C42; font-size: 34rpx; font-weight: bold; display: flex; align-items: center; justify-content: center; }
.banner-text-tag { margin-top: 14rpx; font-size: 22rpx; color: #4A9A4A; background: #EAF7EC; padding: 6rpx 16rpx; border-radius: 18rpx; font-weight: bold; }
.banner-info { padding: 24rpx; }
.banner-title { display: block; font-size: 30rpx; font-weight: bold; color: #5C4B3A; margin-bottom: 8rpx; }
.banner-sub { display: block; font-size: 22rpx; color: #A08B7A; line-height: 1.45; }
.banner-actions { display: flex; gap: 16rpx; padding: 0 24rpx 26rpx; }
.banner-secondary,
.banner-primary { flex: 1; height: 72rpx; border-radius: 36rpx; display: flex; align-items: center; justify-content: center; font-size: 26rpx; font-weight: bold; }
.banner-secondary { color: #8C7B6B; background: #F7F1E8; }
.banner-primary { color: #FFF; background: #FF8C42; }
.banner-close { position: absolute; top: 16rpx; right: 16rpx; width: 56rpx; height: 56rpx; background: rgba(0,0,0,0.3); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #FFF; font-size: 28rpx; }
.banner-panel.text-only .banner-close { background: #F7F1E8; color: #8C7B6B; }

/* ===== 入店须知弹层 ===== */
.notice-popup { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.44); z-index: 10010; display: flex; align-items: center; justify-content: center; padding: 44rpx; }
.notice-panel { width: 100%; max-width: 620rpx; background: #FFFDF9; border-radius: 28rpx; padding: 30rpx; box-shadow: 0 20rpx 56rpx rgba(92,75,58,0.18); }
.notice-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24rpx; }
.notice-kicker { display: block; font-size: 22rpx; color: #FF8C42; margin-bottom: 6rpx; }
.notice-title { display: block; font-size: 34rpx; font-weight: bold; color: #5C4B3A; }
.notice-close { width: 54rpx; height: 54rpx; border-radius: 50%; background: #FFF3E8; color: #A08B7A; display: flex; align-items: center; justify-content: center; font-size: 24rpx; }
.notice-list { display: flex; flex-direction: column; gap: 18rpx; }
.notice-line { display: flex; align-items: flex-start; gap: 14rpx; padding: 18rpx; background: #FFF8EF; border-radius: 16rpx; }
.notice-dot { width: 38rpx; font-size: 28rpx; line-height: 1.35; flex-shrink: 0; }
.notice-copy { flex: 1; font-size: 25rpx; line-height: 1.55; color: #6F5A48; }
.notice-confirm { margin-top: 26rpx; height: 78rpx; border-radius: 39rpx; background: #FF8C42; color: #FFF; font-size: 28rpx; font-weight: bold; display: flex; align-items: center; justify-content: center; }

/* ===== 收藏引导 ===== */
.collection-hint { margin: 16rpx 24rpx 0; background: linear-gradient(90deg, #FFF8E1, #FFECB3); border-radius: 16rpx; padding: 16rpx 24rpx; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2rpx 8rpx rgba(255, 152, 0, 0.1); }
.hint-text { font-size: 24rpx; color: #E65100; font-weight: bold; }
.hint-close { font-size: 24rpx; color: #E65100; opacity: 0.6; padding: 8rpx; }

/* ===== 可领券提醒 ===== */
.coupon-hint {
	margin: 16rpx 24rpx 0;
	background: #FFF;
	border-radius: 20rpx;
	padding: 18rpx 20rpx;
	display: flex;
	align-items: center;
	justify-content: space-between;
	box-shadow: 0 8rpx 24rpx rgba(210, 72, 58, 0.12);
	border: 2rpx solid #FFD1C2;
}
.coupon-hint-main {
	display: flex;
	align-items: center;
	min-width: 0;
	flex: 1;
}
.coupon-hint-icon {
	width: 58rpx;
	height: 58rpx;
	border-radius: 16rpx;
	background: #FFE8DE;
	color: #D84A35;
	font-size: 26rpx;
	font-weight: bold;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	margin-right: 16rpx;
}
.coupon-hint-copy {
	min-width: 0;
	flex: 1;
}
.coupon-hint-title {
	display: block;
	font-size: 26rpx;
	font-weight: bold;
	color: #5C4B3A;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.coupon-hint-sub {
	display: block;
	margin-top: 4rpx;
	font-size: 21rpx;
	color: #A08B7A;
}
.coupon-hint-right {
	display: flex;
	align-items: center;
	flex-shrink: 0;
	margin-left: 16rpx;
}
.coupon-hint-action {
	font-size: 22rpx;
	color: #FFF;
	background: #D84A35;
	padding: 8rpx 16rpx;
	border-radius: 20rpx;
	font-weight: bold;
}
.coupon-hint-close {
	font-size: 22rpx;
	color: #C4B5A5;
	padding: 8rpx 0 8rpx 16rpx;
}

/* ===== 活动情报卡 ===== */
.activity-card {
	margin: 16rpx 24rpx 0;
	border-radius: 22rpx;
	padding: 20rpx 22rpx;
	display: flex;
	align-items: center;
	gap: 16rpx;
	background: #FFFDF8;
	border: 2rpx solid rgba(255,140,66,0.16);
	box-shadow: 0 10rpx 28rpx rgba(92,75,58,0.07);
	box-sizing: border-box;
}
.activity-icon {
	width: 68rpx;
	height: 68rpx;
	border-radius: 20rpx;
	background: #FFF3E8;
	color: #FF8C42;
	font-size: 26rpx;
	font-weight: bold;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}
.activity-copy {
	flex: 1;
	min-width: 0;
}
.activity-line {
	display: flex;
	align-items: center;
	gap: 10rpx;
	min-width: 0;
}
.activity-tag {
	flex-shrink: 0;
	font-size: 19rpx;
	color: #4A9A4A;
	background: #EAF7EC;
	border-radius: 16rpx;
	padding: 4rpx 10rpx;
	font-weight: bold;
}
.activity-title {
	font-size: 27rpx;
	font-weight: bold;
	color: #5C4B3A;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.activity-sub {
	display: block;
	font-size: 22rpx;
	color: #8C7B6B;
	line-height: 1.35;
	margin-top: 7rpx;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.activity-side {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	flex-shrink: 0;
}
.activity-action {
	font-size: 22rpx;
	color: #FFF;
	background: #FF8C42;
	border-radius: 20rpx;
	padding: 8rpx 16rpx;
	font-weight: bold;
	white-space: nowrap;
}
.activity-close {
	margin-top: 10rpx;
	font-size: 22rpx;
	color: #C4B5A5;
	padding: 4rpx 8rpx;
}

/* ===== 首页福利入口 ===== */
.invite-landing-card,
.home-benefit-card {
	margin: 16rpx 24rpx 0;
	border-radius: 24rpx;
	padding: 22rpx;
	display: flex;
	align-items: center;
	box-shadow: 0 10rpx 28rpx rgba(92,75,58,0.08);
	box-sizing: border-box;
}
.invite-landing-card {
	background: linear-gradient(135deg, #FFF1E7 0%, #EAF7EC 100%);
	border: 2rpx solid rgba(255,140,66,0.22);
}
.invite-landing-icon {
	width: 72rpx;
	height: 72rpx;
	border-radius: 20rpx;
	background: #FF8C42;
	color: #FFF;
	font-size: 28rpx;
	font-weight: bold;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	margin-right: 18rpx;
}
.invite-landing-copy {
	flex: 1;
	min-width: 0;
}
.invite-landing-kicker,
.benefit-kicker {
	display: block;
	font-size: 21rpx;
	font-weight: bold;
	color: #4A9A4A;
	margin-bottom: 4rpx;
}
.invite-landing-title,
.benefit-title {
	display: block;
	font-size: 30rpx;
	font-weight: bold;
	color: #5C4B3A;
	line-height: 1.25;
}
.invite-landing-sub,
.benefit-sub {
	display: block;
	font-size: 22rpx;
	color: #7C6A58;
	line-height: 1.42;
	margin-top: 6rpx;
}
.invite-landing-side,
.benefit-side {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	flex-shrink: 0;
	margin-left: 16rpx;
}
.invite-landing-action,
.benefit-action {
	font-size: 23rpx;
	color: #FFF;
	background: #FF8C42;
	border-radius: 22rpx;
	padding: 9rpx 18rpx;
	font-weight: bold;
	white-space: nowrap;
}
.invite-landing-close {
	margin-top: 12rpx;
	font-size: 22rpx;
	color: #BFA996;
	padding: 4rpx 8rpx;
}
.home-benefit-card {
	background: #FFF;
	border: 2rpx solid rgba(129,199,132,0.22);
	justify-content: space-between;
}
.home-benefit-card.checked {
	background: #FBFFF7;
	border-color: rgba(74,154,74,0.26);
}
.benefit-copy {
	flex: 1;
	min-width: 0;
	padding-right: 16rpx;
}
.benefit-dice {
	min-width: 118rpx;
	text-align: center;
	margin-bottom: 10rpx;
}
.dice-face {
	position: relative;
	width: 76rpx;
	height: 76rpx;
	margin: 0 auto;
	border-radius: 18rpx;
	background: #FFF;
	border: 3rpx solid #5C4B3A;
	box-shadow: 0 8rpx 0 rgba(92,75,58,0.12), inset 0 -6rpx 0 rgba(92,75,58,0.06);
	box-sizing: border-box;
}
.benefit-dice.done .dice-face {
	border-color: #4A9A4A;
	box-shadow: 0 8rpx 0 rgba(74,154,74,0.16), inset 0 -6rpx 0 rgba(74,154,74,0.08);
}
.benefit-dice.rolling .dice-face {
	animation: dice-roll 0.52s ease-in-out infinite;
}
.dice-dot {
	position: absolute;
	width: 12rpx;
	height: 12rpx;
	border-radius: 999rpx;
	background: #5C4B3A;
}
.benefit-dice.done .dice-dot {
	background: #4A9A4A;
}
.dice-dot.top-left { left: 17rpx; top: 17rpx; }
.dice-dot.top-right { right: 17rpx; top: 17rpx; }
.dice-dot.middle-left { left: 17rpx; top: 34rpx; }
.dice-dot.middle-right { right: 17rpx; top: 34rpx; }
.dice-dot.center { left: 35rpx; top: 35rpx; }
.dice-dot.bottom-left { left: 17rpx; bottom: 17rpx; }
.dice-dot.bottom-right { right: 17rpx; bottom: 17rpx; }
.dice-label {
	display: block;
	font-size: 19rpx;
	font-weight: bold;
	color: #4A9A4A;
	margin-top: 9rpx;
	line-height: 1.2;
}

/* ===== 动画 ===== */
@keyframes popup-in { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
@keyframes dice-roll {
	0% { transform: rotate(0deg) scale(1); }
	50% { transform: rotate(10deg) scale(1.06); }
	100% { transform: rotate(0deg) scale(1); }
}
</style>
