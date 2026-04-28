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
				<text class="header-sub">买张票进来，想干嘛就干嘛一整天</text>
			</view>

			<view class="grass-hill">
				<view class="blade blade-1">🌿</view>
				<view class="blade blade-2">🌱</view>
				<view class="blade blade-3">🌿</view>
				<view class="blade blade-4">🌱</view>
			</view>
		</view>

		<!-- ===== 公告 ===== -->
		<view class="notice-bubble">
			<text class="notice-icon">📢</text>
			<swiper class="notice-swiper" vertical autoplay circular interval="3000">
				<swiper-item><text class="notice-text">🎉 开业酬宾中！儿童半价，带娃来薅羊毛</text></swiper-item>
				<swiper-item><text class="notice-text">🎲 新到一堆热门桌游，聚会再也不怕冷场</text></swiper-item>
				<swiper-item><text class="notice-text">☕ 零食茶水免费自助，别客气当自家客厅</text></swiper-item>
			</swiper>
		</view>

		<!-- ===== 快速入口 ===== -->
		<view class="menu-grid">
			<view class="menu-card" @tap="goToReserve">
				<view class="menu-icon" style="background: #FFF0E8;">🏠</view>
				<view class="menu-text">
					<text class="menu-title">预约包厢</text>
					<text class="menu-desc">提前锁位</text>
				</view>
			</view>
			<view class="menu-card" @tap="goToGroup">
				<view class="menu-icon" style="background: #FFF0F0;">👥</view>
				<view class="menu-text">
					<text class="menu-title">一起拼团</text>
					<text class="menu-desc">喊上搭子</text>
				</view>
			</view>
			<view class="menu-card" @tap="goToBuyTicket">
				<view class="menu-icon" style="background: #FFF8E0;">🎫</view>
				<view class="menu-text">
					<text class="menu-title">大厅入场券</text>
					<text class="menu-desc">¥38/人·全天</text>
				</view>
			</view>
			<view class="menu-card" @tap="openLocation">
				<view class="menu-icon" style="background: #E8F8E8;">📍</view>
				<view class="menu-text">
					<text class="menu-title">店铺位置</text>
					<text class="menu-desc">查看地图</text>
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
		<view class="carousel-placeholder" v-else>
			<text class="placeholder-emoji">🏠</text>
			<text class="placeholder-text">门店环境</text>
		</view>

		<!-- ===== 店里玩什么 ===== -->
		<view class="section">
			<view class="section-header">
				<text class="section-title">🎮 店里玩什么</text>
				<text class="section-sub">大厅免费玩，包间另计费</text>
			</view>
			<view class="world-grid">
				<view class="world-card" v-for="(item, idx) in entertainmentItems" :key="idx" :style="{ borderTopColor: item.borderColor }">
					<view class="world-top">
						<text class="world-emoji">{{ item.emoji }}</text>
						<text class="world-tag" :style="{ background: item.tagBg, color: item.tagColor }">{{ item.tag }}</text>
					</view>
					<text class="world-name">{{ item.name }}</text>
				</view>
			</view>
		</view>

		<!-- ===== 价格说明 ===== -->
		<view class="price-banner">
			<view class="banner-line">
				<text class="banner-icon">🎫</text>
				<view class="banner-body">
					<text class="banner-strong">大厅入场券 ¥38/人 · 全天不限时</text>
					<text class="banner-small">儿童半价 ¥19 · 零食茶水全包</text>
				</view>
			</view>
			<view class="banner-divider"></view>
			<view class="banner-line">
				<text class="banner-icon">🏠</text>
				<view class="banner-body">
					<text class="banner-strong">想玩主机？约个包间，按小时另计费</text>
					<text class="banner-small">包间结束后还能回大厅继续玩，不赶人</text>
				</view>
			</view>
		</view>

		<!-- ===== 三步开玩 ===== -->
		<view class="section">
			<view class="section-header">
				<text class="section-title">🗺️ 三步开玩</text>
			</view>
			<view class="flow-row">
				<view class="flow-item">
					<view class="flow-circle" style="background: #FFD93D;">
						<text class="flow-emoji">🎫</text>
					</view>
					<text class="flow-title">买票进门</text>
				</view>
				<view class="flow-arrow">→</view>
				<view class="flow-item">
					<view class="flow-circle" style="background: #A5D6A7;">
						<text class="flow-emoji">🎮</text>
					</view>
					<text class="flow-title">挑喜欢的</text>
				</view>
				<view class="flow-arrow">→</view>
				<view class="flow-item">
					<view class="flow-circle" style="background: #FFB5A7;">
						<text class="flow-emoji">😄</text>
					</view>
					<text class="flow-title">躺平开玩</text>
				</view>
			</view>
		</view>

		<!-- ===== 热门游戏 ===== -->
		<view class="section">
			<view class="section-header">
				<text class="section-title">⭐ 热门游戏</text>
				<text class="section-more" @tap="goToReserve">去预约 →</text>
			</view>
			<scroll-view class="games-scroll" scroll-x>
				<view class="game-card" v-for="(game, idx) in hotGames" :key="idx">
					<view class="game-cover" :style="{ background: game.coverBg }">
						<text class="game-cover-emoji">{{ game.emoji }}</text>
						<view class="game-badge" v-if="idx < 2">HOT</view>
						<view class="corner-flower">
							<view class="petal"></view>
							<view class="petal"></view>
							<view class="petal"></view>
							<view class="flower-center"></view>
						</view>
					</view>
					<view class="game-info">
						<text class="game-name">{{ game.name }}</text>
						<text class="game-tag">{{ game.tag }}</text>
					</view>
				</view>
			</scroll-view>
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
		<view class="section">
			<view class="section-header">
				<text class="section-title">💬 玩家评价</text>
				<text class="section-more" @tap="goToMyReviews">我的评价 →</text>
			</view>
			<swiper class="reviews-swiper" v-if="reviews.length > 0" vertical autoplay circular interval="4000">
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
			<view class="reviews-empty" v-else>
				<text class="empty-icon">💭</text>
				<text class="empty-text">暂无评价，快来发表第一条吧～</text>
				<view class="empty-btn" @tap="goToMyReviews">写评价</view>
			</view>
		</view>

		<!-- ===== 温馨提示 ===== -->
		<view class="section">
			<view class="section-header">
				<text class="section-title">📋 来之前看一眼</text>
			</view>
			<view class="tips-list">
				<view class="tip-item" v-for="(tip, idx) in tips" :key="idx" :style="{ borderLeftColor: tipColors[idx % tipColors.length] }">
					<text class="tip-text">{{ tip }}</text>
				</view>
			</view>
		</view>

		<custom-tab-bar></custom-tab-bar>
	</view>
</template>

<script>
	import AUTH from '../../utils/auth.js'
	import { mapState, mapActions } from 'vuex';
	import customTabBar from '@/custom-tab-bar/index.vue';
	export default {
		components: { customTabBar },
		computed: {
			...mapState(['hasLogin', 'constance'])
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
					address: '福建省福州市台江区交通路',
					area: '6号儒商楼08店面',
				},


				entertainmentItems: [
					{ emoji: '🎮', name: '主机游戏', tag: '包间另计', borderColor: '#A8C8EC', tagBg: '#E3F0FC', tagColor: '#4A90D9' },
					{ emoji: '🎲', name: '桌游天地', tag: '大厅免费', borderColor: '#F0B8B8', tagBg: '#FCE8E8', tagColor: '#D86060' },
					{ emoji: '📚', name: '漫画小说', tag: '大厅免费', borderColor: '#E8D4A0', tagBg: '#FFF5D6', tagColor: '#B89630' },
					{ emoji: '📖', name: '亲子阅读', tag: '大厅免费', borderColor: '#A8D8A8', tagBg: '#E0F5E0', tagColor: '#4A9A4A' },
				],
				hotGames: [
					{ emoji: '🏰', name: '塞尔达传说', tag: 'Switch独占', coverBg: 'linear-gradient(135deg, #4A90D9, #87CEEB)' },
					{ emoji: '⚔️', name: '黑神话悟空', tag: 'PS5/PC', coverBg: 'linear-gradient(135deg, #FF8C94, #F5C156)' },
					{ emoji: '🐺', name: '狼人杀', tag: '社交推理', coverBg: 'linear-gradient(135deg, #667EEA, #764BA2)' },
					{ emoji: '💰', name: '大富翁', tag: '经典休闲', coverBg: 'linear-gradient(135deg, #F093FB, #F5576C)' },
					{ emoji: '🧩', name: '波可汪迷宫', tag: '亲子益智', coverBg: 'linear-gradient(135deg, #4FACFE, #00F2FE)' },
					{ emoji: '🃏', name: 'UNO', tag: '聚会王牌', coverBg: 'linear-gradient(135deg, #30CFD0, #330867)' },
				],
				reviews: [],
				tips: [
					'店内禁止黄赌毒，我们要做文明玩家',
					'进门请换拖鞋/鞋套，像自己家一样爱护它',
					'零食茶水自助，吃多少拿多少，别浪费粮食哦',
					'人多想包场？喊上老板，给你安排得明明白白',
					'漫画小说随便看，看完请放回书架，下一位还在等',
				],
				tipColors: ['#FF8C94', '#4A90D9', '#F5C156', '#6BCB77', '#667EEA'],
			};
		},
		onShow() {
			uni.$emit('tabBarChange', { key: 'index' });
			this.loadData();
			this.loadReviews();
			if (this.hasLogin) this.checkBanner();
		},
		onLoad() {
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
			goToGroup() {
				uni.switchTab({ url: '/pages/group/group' });
			},
			goToBuyTicket() {
				uni.navigateTo({ url: '/pages/ticket/buy' });
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
				const titles = [
					'别卷了！花38块可以躺一整天的神仙店 🎮',
					'福州这家宝藏店，38块能玩一整天，我私藏很久了',
					'周末不知道去哪？来这里躺平，零食还免费',
					'带娃+打游戏两不误，这家店的老板太懂了',
					'我的精神避难所，今天忍痛分享给你 🤫',
				];
				return {
					title: titles[Math.floor(Math.random() * titles.length)],
					imageUrl: '/static/logo_small.jpg',
					path: '/pages/index/index',
				};
			},
			onShareTimeline() {
				return {
					title: '还在996？快来这里充电回血',
					imageUrl: '/static/logo_small.jpg',
				};
			},
			onAddToFavorites() {
				return {
					title: '先收藏，下次想躺平的时候找得到',
					imageUrl: '/static/logo_small.jpg',
				};
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

/* ===== 公告 ===== */
.notice-bubble {
	display: flex;
	align-items: center;
	background: #FFF;
	margin: 20rpx 24rpx 0;
	padding: 14rpx 24rpx;
	border-radius: 50rpx;
	box-shadow: 0 2rpx 12rpx rgba(92,75,58,0.06);
}
.notice-icon { font-size: 26rpx; margin-right: 12rpx; }
.notice-swiper { flex: 1; height: 40rpx; }
.notice-text { font-size: 24rpx; color: #8D6E63; line-height: 40rpx; display: block; }

/* ===== 快速入口 ===== */
.menu-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 16rpx;
	margin: 20rpx 24rpx;
}
.menu-card {
	background: #FFF;
	border-radius: 24rpx;
	padding: 24rpx;
	box-shadow: 0 2rpx 12rpx rgba(92,75,58,0.06);
	display: flex;
	align-items: center;
	gap: 16rpx;
	border: 2rpx solid rgba(255,181,167,0.15);
}
.menu-icon {
	width: 72rpx;
	height: 72rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 36rpx;
	flex-shrink: 0;
}
.menu-text { flex: 1; }
.menu-title { display: block; font-size: 28rpx; font-weight: bold; color: #5C4B3A; margin-bottom: 4rpx; }
.menu-desc { display: block; font-size: 22rpx; color: #A08B7A; }

/* ===== 轮播 ===== */
.carousel-wrapper { margin: 0 24rpx; }
.carousel { width: 100%; height: 360rpx; border-radius: 28rpx; overflow: hidden; box-shadow: 0 8rpx 32rpx rgba(92,75,58,0.1); }
.carousel-image { width: 100%; height: 100%; }
.carousel-indicator { display: flex; justify-content: center; gap: 10rpx; padding-top: 16rpx; }
.indicator-dot { width: 14rpx; height: 14rpx; border-radius: 50%; background: #E0D5CC; transition: all 0.3s; }
.indicator-dot.active { width: 40rpx; border-radius: 20rpx; background: #FF8C42; }
.carousel-placeholder { margin: 0 24rpx; height: 300rpx; border-radius: 28rpx; background: linear-gradient(135deg, #FFF0F0, #F0F8F5); display: flex; flex-direction: column; align-items: center; justify-content: center; border: 2rpx dashed #F0D0C0; }
.placeholder-emoji { font-size: 72rpx; margin-bottom: 12rpx; }
.placeholder-text { font-size: 28rpx; color: #FF8C42; }

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

/* ===== 价格横幅 ===== */
.price-banner {
	margin: 0 24rpx 28rpx;
	background: linear-gradient(135deg, #FF8C42, #FFB5A7);
	border-radius: 28rpx;
	padding: 28rpx;
	box-shadow: 0 8rpx 24rpx rgba(255,140,66,0.2);
	color: #FFF;
}
.banner-line { display: flex; align-items: flex-start; gap: 14rpx; }
.banner-icon { font-size: 36rpx; flex-shrink: 0; margin-top: 2rpx; }
.banner-body { flex: 1; }
.banner-strong { display: block; font-size: 28rpx; font-weight: bold; margin-bottom: 4rpx; }
.banner-small { display: block; font-size: 24rpx; opacity: 0.9; }
.banner-divider { height: 1rpx; background: rgba(255,255,255,0.3); margin: 16rpx 0; }

/* ===== 三步开玩 ===== */
.flow-row { display: flex; align-items: center; justify-content: space-between; background: #FFF; border-radius: 28rpx; padding: 28rpx; box-shadow: 0 2rpx 12rpx rgba(92,75,58,0.06); }
.flow-item { flex: 1; text-align: center; }
.flow-circle { width: 88rpx; height: 88rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12rpx; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.08); }
.flow-emoji { font-size: 40rpx; }
.flow-title { display: block; font-size: 26rpx; font-weight: bold; color: #5C4B3A; }
.flow-arrow { font-size: 28rpx; color: #E0D5CC; padding-top: 24rpx; flex-shrink: 0; }

/* ===== 热门游戏 ===== */
.games-scroll { display: flex; white-space: nowrap; gap: 20rpx; padding: 8rpx 4rpx 16rpx; }
.game-card {
	display: inline-block;
	width: 220rpx;
	flex-shrink: 0;
	background: #FFF;
	border-radius: 24rpx;
	box-shadow: 0 6rpx 20rpx rgba(92,75,58,0.08);
	overflow: hidden;
	transition: transform 0.2s;
}
.game-card:active { transform: scale(0.97); }
.game-cover {
	width: 220rpx;
	height: 190rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;
}
.game-cover-emoji {
	font-size: 80rpx;
	text-shadow: 0 4rpx 12rpx rgba(0,0,0,0.15);
}
.game-badge {
	position: absolute;
	top: 10rpx;
	right: 10rpx;
	font-size: 18rpx;
	color: #FF8C42;
	font-weight: bold;
	background: rgba(255,255,255,0.95);
	border-radius: 12rpx;
	padding: 4rpx 10rpx;
	box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.1);
}
.corner-flower {
	position: absolute;
	bottom: 10rpx;
	left: 10rpx;
	width: 24rpx;
	height: 24rpx;
	.petal {
		position: absolute;
		width: 8rpx;
		height: 8rpx;
		background: rgba(255,255,255,0.7);
		border-radius: 50%;
		&:nth-child(1) { top: 0; left: 8rpx; }
		&:nth-child(2) { bottom: 4rpx; left: 2rpx; }
		&:nth-child(3) { bottom: 4rpx; right: 2rpx; }
	}
	.flower-center {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 6rpx;
		height: 6rpx;
		background: #FFD54F;
		border-radius: 50%;
	}
}
.game-info { padding: 14rpx 16rpx; }
.game-name { display: block; font-size: 26rpx; font-weight: bold; color: #5C4B3A; margin-bottom: 6rpx; }
.game-tag { display: inline-block; font-size: 20rpx; color: #FF8C42; background: rgba(255,140,66,0.08); padding: 4rpx 10rpx; border-radius: 10rpx; }

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
.reviews-empty { background: #FFF; border-radius: 24rpx; padding: 48rpx; text-align: center; box-shadow: 0 2rpx 12rpx rgba(92,75,58,0.06); }
.empty-icon { font-size: 60rpx; display: block; margin-bottom: 12rpx; }
.empty-text { font-size: 24rpx; color: #A08B7A; display: block; margin-bottom: 20rpx; }
.empty-btn { display: inline-block; background: linear-gradient(135deg, #FF8C42, #FFB5A7); color: #FFF; font-size: 26rpx; font-weight: bold; padding: 14rpx 40rpx; border-radius: 36rpx; }

/* ===== 温馨提示 ===== */
.tips-list { display: flex; flex-direction: column; gap: 10rpx; }
.tip-item { background: #FFF; border-radius: 16rpx; padding: 16rpx 20rpx; border-left: 5rpx solid; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.03); }
.tip-text { font-size: 22rpx; color: #8D6E63; line-height: 1.5; }

/* ===== 营销弹窗 ===== */
.banner-popup { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 40rpx; }
.banner-panel { background: #FFF; border-radius: 28rpx; overflow: hidden; width: 100%; max-width: 600rpx; position: relative; animation: popup-in 0.3s ease; box-shadow: 0 16rpx 48rpx rgba(0,0,0,0.15); }
.banner-img { width: 100%; height: 400rpx; }
.banner-info { padding: 24rpx; }
.banner-title { display: block; font-size: 30rpx; font-weight: bold; color: #5C4B3A; margin-bottom: 8rpx; }
.banner-sub { display: block; font-size: 22rpx; color: #A08B7A; }
.banner-close { position: absolute; top: 16rpx; right: 16rpx; width: 56rpx; height: 56rpx; background: rgba(0,0,0,0.3); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #FFF; font-size: 28rpx; }

/* ===== 动画 ===== */
@keyframes popup-in { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
</style>