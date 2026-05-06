<template>
	<view class="page-wrapper">
		<!-- 营销弹窗 -->
		<view class="banner-popup" v-if="activeBanner" @click="closeBanner">
			<view class="banner-panel" @click.stop="goBannerLink">
				<image class="banner-img" :src="activeBanner.image_url" mode="aspectFill" />
				<view class="banner-info" v-if="activeBanner.title">
					<text class="banner-title">{{ activeBanner.title }}</text>
					<text class="banner-sub" v-if="activeBanner.subtitle">{{ activeBanner.subtitle }}</text>
				</view>
				<view class="banner-close" @click.stop="closeBanner">
					<text>✕</text>
				</view>
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

		<!-- ===== 轮播 ===== -->
		<view class="carousel-wrapper" v-if="carouselList.length > 0">
			<swiper class="carousel" circular autoplay interval="4000" @change="swiperChange">
				<swiper-item v-for="(img, idx) in carouselList" :key="idx">
					<image :src="img" class="carousel-image" mode="aspectFill" />
				</swiper-item>
			</swiper>
			<view class="carousel-indicator">
				<view v-for="i in swiperLength" :key="i" class="indicator-dot" :class="{ active: swiperCurrent === i - 1 }"></view>
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
				<text class="section-sub">提高体验，也提高客单</text>
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
			</view>
		</view>

		<!-- ===== 玩家评价 ===== -->
		<view class="section" v-if="reviews.length > 0">
			<view class="section-header">
				<text class="section-title">💬 玩家评价</text>
				<text class="section-more" @tap="goToMyReviews">我的评价 →</text>
			</view>
			<swiper class="reviews-swiper" vertical autoplay circular interval="4000">
				<swiper-item v-for="(rev, idx) in reviews" :key="idx">
					<view class="review-card">
						<view class="review-header">
							<text class="review-avatar">{{ rev.user_avatar || '😄' }}</text>
							<view class="review-meta">
								<text class="review-name">{{ rev.user_nickname }}</text>
								<view class="review-stars">
									<text v-for="s in 5" :key="s" :class="s <= rev.rating ? 'star filled' : 'star'">⭐</text>
								</view>
							</view>
						</view>
						<text class="review-text">{{ rev.content }}</text>
						<text class="review-time">{{ rev.created_at }}</text>
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
			...mapState(['hasLogin', 'constance']),
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
		},
		watch: {
			constance(value) { this.loadData(); },
		},
		data() {
			return {
				swiperCurrent: 0,
				activeBanner: null,
				swiperLength: 0,
				carouselList: [],
				addressData: {
					name: '摸鱼划水吧',
					address: '福建省福州市鼓楼区',
					area: '6号儒商楼08店面',
				},


				entertainmentItems: [
					{ emoji: '🎮', name: '主机游戏', desc: 'Switch / PS / 双人闯关', tag: '包间另计', cardStyle: 'border-top-color: #A8C8EC;', tagStyle: 'background: #E3F0FC; color: #4A90D9;' },
					{ emoji: '🎲', name: '桌游天地', desc: '2-8人聚会，新手可问店员', tag: '大厅免费', cardStyle: 'border-top-color: #F0B8B8;', tagStyle: 'background: #FCE8E8; color: #D86060;' },
					{ emoji: '📚', name: '漫画小说', desc: '一个人来也能安静待很久', tag: '大厅免费', cardStyle: 'border-top-color: #E8D4A0;', tagStyle: 'background: #FFF5D6; color: #B89630;' },
					{ emoji: '📖', name: '亲子阅读', desc: '儿童半价，周末更好安排', tag: '大厅免费', cardStyle: 'border-top-color: #A8D8A8;', tagStyle: 'background: #E0F5E0; color: #4A9A4A;' },
				],
				upsellItems: [
					{ key: 'room', icon: '🎮', name: '包厢主机升级', desc: '想玩 Switch / PS，先预约更稳', price: '按小时', action: 'reserve', style: 'background: #E3F0FC;' },
					{ key: 'snack', icon: '🍿', name: '饮品零食加购', desc: '适合从单人票升级成吃喝套餐', price: '到店选', action: 'voucher', style: 'background: #FFF5D6;' },
					{ key: 'host', icon: '🎲', name: '新手桌游带玩', desc: '不会玩也能开局，减少冷场', price: '可预约', action: 'reserve', style: 'background: #FCE8E8;' },
					{ key: 'party', icon: '🎂', name: '生日/团建小局', desc: '4人以上建议提前约位置', price: '可定制', action: 'reserve', style: 'background: #E0F5E0;' },
				],
				reviews: [],
				collectionHintClosed: false,
			};
		},
		onShow() {
			uni.$emit('tabBarChange', { key: 'index' });
			this.loadData();
			this.loadReviews();
			this.collectionHintClosed = uni.getStorageSync('collection_hint_closed');
			if (this.hasLogin) this.checkBanner();
		},
		onLoad(options) {
			this.captureInviteCode(options);
			if (!this.constance) {
				this.getConstanceInfo().then(() => {
					this.loadData();
				}).catch(() => {});
			} else {
				this.loadData();
			}
			this.loadReviews();
		},
		methods: {
			...mapActions(['loginAndRegister', 'getConstanceInfo', 'getReviewList']),
			...mapMutations(['setPendingInviteCode']),
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
			goToReserve() {
				uni.switchTab({ url: '/pages/tabBar/appoint/appoint' });
			},
			goToBuyTicketCount(count) {
				var num = parseInt(count || 1);
				if (num < 1) num = 1;
				if (num > 10) num = 10;
				uni.navigateTo({ url: '/pages/ticket/buy?count=' + num });
			},
			goToVoucher() {
				uni.switchTab({ url: '/pages/voucher/voucher' });
			},
			handleSceneTap(scene) {
				if (!scene) return;
				if (scene.action === 'ticket') {
					this.goToBuyTicketCount(scene.count || 1);
				} else if (scene.action === 'reserve') {
					this.goToReserve();
				} else if (scene.action === 'voucher') {
					this.goToVoucher();
				} else if (scene.action === 'location') {
					this.openLocation();
				}
			},
			handleUpsellTap(item) {
				if (!item) return;
				if (item.action === 'voucher') {
					this.goToVoucher();
				} else if (item.action === 'reserve') {
					this.goToReserve();
				}
			},
			goToMyReviews() {
				uni.navigateTo({ url: '/pages/my/reviews' });
			},
			async loadData() {
				if (!this.constance) {
					console.log('constance 还未加载，等待...');
					return;
				}
				this.carouselList = [];
				var baseUrl = 'http://moyuhuashui.oss-cn-shenzhen.aliyuncs.com/';
				var addPrefix = function(src) {
					if (!src) return '';
					if (src.indexOf('http') === 0) return src;
					return baseUrl + src;
				};
				if (this.constance.home_page_image0) this.carouselList.push(addPrefix(this.constance.home_page_image0));
				if (this.constance.home_page_image1) this.carouselList.push(addPrefix(this.constance.home_page_image1));
				if (this.constance.home_page_image2) this.carouselList.push(addPrefix(this.constance.home_page_image2));
				if (this.constance.home_page_image3) this.carouselList.push(addPrefix(this.constance.home_page_image3));
				this.swiperLength = this.carouselList.length;
				console.log('轮播图加载完成:', this.carouselList);
			},
			async loadReviews() {
				try {
					var list = await this.getReviewList();
					console.log('评价列表:', list);
					if (list && list.length > 0) {
						this.reviews = list;
					} else {
						this.reviews = [];
					}
				} catch (e) {
					console.error('加载评价失败:', e);
					this.reviews = [];
				}
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
				return {
					title: titles[Math.floor(Math.random() * titles.length)],
					imageUrl: '/static/share_home.jpg',
					path: '/pages/index/index',
				};
			},
			onShareTimeline() {
				return {
					title: '福州周末不知道去哪？来摸鱼划水吧玩一天',
					imageUrl: '/static/share_home.jpg',
				};
			},
			onAddToFavorites() {
				return {
					title: '先收藏，下次想玩桌游漫画主机找得到',
					imageUrl: '/static/share_home.jpg',
				};
			},
			closeCollectionHint() {
				this.collectionHintClosed = true;
				uni.setStorageSync('collection_hint_closed', true);
			},
			checkBanner() {
				if (!this.hasLogin) return;
				AUTH.activeBanners().then(res => {
					if (res._status !== 0 || !res.data || res.data.length === 0) return;
					const banner = res.data[0];
					const key = 'banner_shown_' + banner.id;
					const last = uni.getStorageSync(key);
					const now = Date.now();
					if (last && now - last < 24 * 60 * 60 * 1000) return;
					this.activeBanner = banner;
					uni.setStorageSync(key, now);
				});
			},
			closeBanner() {
				this.activeBanner = null;
			},
			goBannerLink() {
				if (!this.activeBanner) return;
				const b = this.activeBanner;
				if (b.link_type === 'page' && b.link_value) {
					uni.navigateTo({ url: b.link_value });
				} else if (b.link_type === 'webview' && b.link_value) {
					uni.navigateTo({ url: '/pages/webview/webview?url=' + encodeURIComponent(b.link_value) });
				}
				this.closeBanner();
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
.section-title { font-size: 32rpx; font-weight: bold; color: #5C4B3A; }
.section-sub { font-size: 22rpx; color: #C4B5A5; }
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
.reviews-swiper { height: 260rpx; }
.review-card { background: #FFF; border-radius: 24rpx; padding: 20rpx; box-shadow: 0 2rpx 12rpx rgba(92,75,58,0.06); height: calc(100% - 40rpx); margin: 10rpx 4rpx; }
.review-header { display: flex; align-items: center; gap: 12rpx; margin-bottom: 12rpx; }
.review-avatar { font-size: 44rpx; }
.review-meta { flex: 1; }
.review-name { display: block; font-size: 26rpx; font-weight: bold; color: #5C4B3A; margin-bottom: 2rpx; }
.review-stars { display: flex; gap: 4rpx; }
.star { font-size: 18rpx; opacity: 0.3; }
.star.filled { opacity: 1; }
.review-text { display: block; font-size: 22rpx; color: #8D6E63; line-height: 1.5; margin-bottom: 8rpx; }
.review-time { font-size: 18rpx; color: #C4B5A5; }
/* ===== 营销弹窗 ===== */
.banner-popup { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 40rpx; }
.banner-panel { background: #FFF; border-radius: 28rpx; overflow: hidden; width: 100%; max-width: 600rpx; position: relative; animation: popup-in 0.3s ease; box-shadow: 0 16rpx 48rpx rgba(0,0,0,0.15); }
.banner-img { width: 100%; height: 400rpx; }
.banner-info { padding: 24rpx; }
.banner-title { display: block; font-size: 30rpx; font-weight: bold; color: #5C4B3A; margin-bottom: 8rpx; }
.banner-sub { display: block; font-size: 22rpx; color: #A08B7A; }
.banner-close { position: absolute; top: 16rpx; right: 16rpx; width: 56rpx; height: 56rpx; background: rgba(0,0,0,0.3); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #FFF; font-size: 28rpx; }

/* ===== 收藏引导 ===== */
.collection-hint { margin: 16rpx 24rpx 0; background: linear-gradient(90deg, #FFF8E1, #FFECB3); border-radius: 16rpx; padding: 16rpx 24rpx; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2rpx 8rpx rgba(255, 152, 0, 0.1); }
.hint-text { font-size: 24rpx; color: #E65100; font-weight: bold; }
.hint-close { font-size: 24rpx; color: #E65100; opacity: 0.6; padding: 8rpx; }

/* ===== 动画 ===== */
@keyframes popup-in { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
</style>
