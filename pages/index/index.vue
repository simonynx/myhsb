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

		<!-- 顶部装饰（渐变背景兼导航栏） -->
		<view class="top-bar">
			<view class="top-bar-content">
				<text class="top-emoji">🎲</text>
				<text class="top-title">{{ constance.store_name || '摸鱼划水吧' }}</text>
				<text class="top-emoji">🎯</text>
			</view>
			<text class="top-subtitle">主机游戏 · 桌游 · 漫画小说 · 亲子阅读</text>
		</view>

		<!-- 公告 -->
		<view class="notice-strip">
			<text class="notice-icon">📢</text>
			<swiper class="notice-swiper" vertical autoplay circular interval="3000">
				<swiper-item><text class="notice-text">开业大酬宾啦～快点到店来体验！</text></swiper-item>
				<swiper-item><text class="notice-text">新到一批热门桌游，等你来解锁！</text></swiper-item>
				<swiper-item><text class="notice-text">儿童半价！4月优惠进行中～</text></swiper-item>
			</swiper>
		</view>

		<!-- 店铺环境轮播 -->
		<view class="carousel-wrapper" v-if="carouselList.length > 0">
			<swiper class="carousel" circular autoplay interval="4000" @change="swiperChange">
				<swiper-item v-for="(img, idx) in carouselList" :key="idx">
					<image :src="img" class="carousel-image" mode="aspectFill" />
				</swiper-item>
			</swiper>
			<view class="carousel-indicator">
				<view
					v-for="i in swiperLength"
					:key="i"
					class="indicator-dot"
					:class="{ active: swiperCurrent === i - 1 }"
				></view>
			</view>
		</view>

		<!-- 店铺环境占位图（无轮播图时显示） -->
		<view class="carousel-placeholder" v-else>
			<text class="placeholder-emoji">🏠</text>
			<text class="placeholder-text">门店环境</text>
		</view>

		<!-- 入场券卡片 -->
		<view class="ticket-card">
			<view class="ticket-left">
				<text class="ticket-emoji">🎫</text>
			</view>
			<view class="ticket-center">
				<text class="ticket-name">大厅入场券</text>
				<text class="ticket-desc">全天不限时 · 免费漫画小说 · 免费零食茶水</text>
				<view class="ticket-price-row">
					<text class="price-main">¥38</text>
					<text class="price-unit">/人</text>
					<view class="price-badge">儿童半价 ¥19</view>
				</view>
			</view>
			<view class="ticket-right" @tap="goToReserve">
				<text class="book-btn-text">预约</text>
			</view>
		</view>

		<!-- 核心数据 -->
		<view class="stats-row">
			<view class="stat-item">
				<text class="stat-num">500+</text>
				<text class="stat-label">本漫画小说</text>
			</view>
			<view class="stat-divider"></view>
			<view class="stat-item">
				<text class="stat-num">60+</text>
				<text class="stat-label">款桌游</text>
			</view>
			<view class="stat-divider"></view>
			<view class="stat-item">
				<text class="stat-num">3</text>
				<text class="stat-label">大主机平台</text>
			</view>
		</view>

		<!-- 亲子阅读区 -->
		<view class="section family-section">
			<view class="section-header">
				<text class="section-emoji">📚</text>
				<text class="section-title">亲子阅读区</text>
				<text class="section-tag">👨‍👩‍👧‍👦 适合带娃</text>
			</view>
			<view class="family-card">
				<view class="family-left">
					<text class="family-emoji">📖</text>
				</view>
				<view class="family-right">
					<text class="family-headline">陪娃一起，享受阅读时光</text>
					<text class="family-desc">海量漫画、推理小说、儿童读物</text>
					<text class="family-desc">家长孩子一起沉浸在书海中</text>
					<text class="family-desc light">14岁以下儿童半价入场哦～</text>
				</view>
			</view>
		</view>

		<!-- 娱乐设施 -->
		<view class="section entertainment-section">
			<view class="section-header">
				<text class="section-emoji">🎮</text>
				<text class="section-title">店内娱乐</text>
			</view>
			<view class="entertainment-grid">
				<view
					class="enter-item"
					v-for="(item, idx) in entertainmentItems"
					:key="idx"
					:style="{ background: item.bg }"
				>
					<text class="enter-emoji">{{ item.emoji }}</text>
					<text class="enter-name">{{ item.name }}</text>
					<text class="enter-count">{{ item.count }}</text>
				</view>
			</view>
		</view>

		<!-- 如何玩 -->
		<view class="section how-to-section">
			<view class="section-header">
				<text class="section-emoji">📖</text>
				<text class="section-title">如何玩</text>
			</view>
			<view class="steps-row">
				<view class="step-item">
					<view class="step-num">1</view>
					<text class="step-icon">🎫</text>
					<text class="step-title">购票入座</text>
					<text class="step-desc">大厅38元/人全天，儿童半价</text>
				</view>
				<view class="step-arrow">→</view>
				<view class="step-item">
					<view class="step-num">2</view>
					<text class="step-icon">🎮</text>
					<text class="step-title">选娱乐</text>
					<text class="step-desc">Switch·桌游·漫画·阅读</text>
				</view>
				<view class="step-arrow">→</view>
				<view class="step-item">
					<view class="step-num">3</view>
					<text class="step-icon">😄</text>
					<text class="step-title">开心畅玩</text>
					<text class="step-desc">零食茶水免费，欢乐一整天</text>
				</view>
			</view>
		</view>

		<!-- 热门游戏 -->
		<view class="section hot-games-section">
			<view class="section-header">
				<text class="section-emoji">🔥</text>
				<text class="section-title">热门游戏</text>
				<text class="section-more" @tap="goToReserve">预约座位 →</text>
			</view>
			<scroll-view class="games-scroll" scroll-x>
				<view
					class="game-card"
					v-for="(game, idx) in hotGames"
					:key="idx"
				>
					<view class="game-cover" :style="{ background: game.coverBg }">
						<text class="game-cover-emoji">{{ game.emoji }}</text>
					</view>
					<text class="game-name">{{ game.name }}</text>
					<text class="game-tag">{{ game.tag }}</text>
				</view>
			</scroll-view>
		</view>

		<!-- 套餐推荐（简化版） -->
		<view class="section packages-section">
			<view class="section-header">
				<text class="section-emoji">💡</text>
				<text class="section-title">套餐说明</text>
			</view>
			<view class="package-list">
				<view class="package-simple">
					<view class="pkg-icon-box" style="background: linear-gradient(135deg, #FF9ECD, #FF6B9D);">
						<text class="pkg-icon">🏠</text>
					</view>
					<view class="pkg-info">
						<text class="pkg-title">大厅入场券</text>
						<text class="pkg-detail">全天畅玩 + 免费漫画小说 + 免费零食茶水</text>
						<view class="pkg-price-row">
							<text class="pkg-price">¥38</text>
							<text class="pkg-price-sub">/人</text>
							<text class="pkg-kid">儿童半价 ¥19</text>
						</view>
					</view>
				</view>
				<view class="package-simple">
					<view class="pkg-icon-box" style="background: linear-gradient(135deg, #667EEA, #764BA2);">
						<text class="pkg-icon">🎮</text>
					</view>
					<view class="pkg-info">
						<text class="pkg-title">主机游戏（可选加购）</text>
						<text class="pkg-detail">Switch · PS5 · Xbox 畅玩</text>
						<text class="pkg-price-sub">详询店主</text>
					</view>
				</view>
				<view class="package-simple">
					<view class="pkg-icon-box" style="background: linear-gradient(135deg, #F5A623, #FF6B6B);">
						<text class="pkg-icon">🚪</text>
					</view>
					<view class="pkg-info">
						<text class="pkg-title">包间（可选加购）</text>
						<text class="pkg-detail">私密空间 · 按小时计费</text>
						<text class="pkg-price-sub">详询店主</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 店铺信息 -->
		<view class="section shop-info-section">
			<view class="section-header">
				<text class="section-emoji">🏠</text>
				<text class="section-title">店铺信息</text>
			</view>
			<view class="shop-info-card">
				<view class="shop-name-row">
					<text class="shop-name">{{ constance.store_name || '摸鱼划水吧' }}</text>
					<view class="shop-status">
						<text class="status-dot"></text>
						<text class="status-text">营业中</text>
					</view>
				</view>

				<view class="info-item" @tap="openLocation">
					<text class="info-icon">📍</text>
					<view class="info-content">
						<text class="info-label">地址</text>
						<text class="info-value">{{(constance.store_address || addressData.address) + (constance.store_area || addressData.area)}}</text>
					</view>
					<text class="info-arrow">→</text>
				</view>

				<view class="info-item">
					<text class="info-icon">🕐</text>
					<view class="info-content">
						<text class="info-label">营业时间</text>
						<text class="info-value">{{ constance.business_hours || '10:00 - 22:00' }}</text>
					</view>
				</view>

				<view class="info-item">
					<text class="info-icon">📞</text>
					<view class="info-content">
						<text class="info-label">电话</text>
						<text class="info-value highlight">{{constance.phone_number || '83596103'}}</text>
					</view>
				</view>

				<view class="info-item">
					<text class="info-icon">📶</text>
					<view class="info-content">
						<text class="info-label">WiFi</text>
						<text class="info-value">{{constance.wifi_account || 'moyu888'}} / {{constance.wifi_password || 'moyu888'}}</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 用户评价（滚动播放） -->
		<view class="section reviews-section">
			<view class="section-header">
				<text class="section-emoji">💬</text>
				<text class="section-title">玩家评价</text>
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

		<!-- 温馨提示 -->
		<view class="section tips-section">
			<view class="section-header">
				<text class="section-emoji">📋</text>
				<text class="section-title">温馨提示</text>
			</view>
			<view class="tips-list">
				<view
					class="tip-item"
					v-for="(tip, idx) in tips"
					:key="idx"
					:style="{ borderLeftColor: tipColors[idx % tipColors.length] }"
				>
					<text class="tip-text">{{ tip }}</text>
				</view>
			</view>
		</view>

		<!-- 自定义底部导航 -->
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
					{ emoji: '🎮', name: '主机游戏', count: 'Switch/PS5/Xbox', bg: 'linear-gradient(135deg, #667EEA, #764BA2)' },
					{ emoji: '🎲', name: '桌游', count: '60+款聚会游戏', bg: 'linear-gradient(135deg, #FF9ECD, #FF6B9D)' },
					{ emoji: '📚', name: '漫画小说', count: '500+本免费看', bg: 'linear-gradient(135deg, #F5A623, #FF6B6B)' },
					{ emoji: '📖', name: '亲子阅读', count: '儿童读物专区', bg: 'linear-gradient(135deg, #52C41A, #73D13D)' },
				],
				hotGames: [
					{ emoji: '🏠', name: '塞尔达传说', tag: 'Switch独占', coverBg: 'linear-gradient(135deg, #667EEA, #764BA2)' },
					{ emoji: '⚔️', name: '黑神话悟空', tag: 'PS5/PC', coverBg: 'linear-gradient(135deg, #FA709A, #FEE140)' },
					{ emoji: '🐺', name: '狼人杀', tag: '社交推理', coverBg: 'linear-gradient(135deg, #FF9ECD, #FF6B9D)' },
					{ emoji: '💰', name: '大富翁', tag: '经典休闲', coverBg: 'linear-gradient(135deg, #F093FB, #F5576C)' },
					{ emoji: '🧩', name: '波可汪迷宫', tag: '亲子益智', coverBg: 'linear-gradient(135deg, #4FACFE, #00F2FE)' },
					{ emoji: '🃏', name: 'UNO', tag: '聚会王牌', coverBg: 'linear-gradient(135deg, #30CFD0, #330867)' },
				],
				reviews: [],
				tips: [
					'本店禁止从事黄赌毒行为',
					'入内需换拖鞋或穿戴鞋套，保持环境整洁',
					'零食茶水自助取用，请勿浪费',
					'可提供包场服务，如需团体活动请联系店主',
					'店内漫画小说可免费阅读，请勿带走',
				],
				tipColors: ['#FF6B9D', '#4FACFE', '#F5A623', '#7ED56F', '#667EEA'],
			};
		},
		onShow() {
			if (!this.hasLogin) this.loginAndRegister();
			this.checkBanner();
		},
		onLoad() {
			this.loadData();
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

				// 加载真实评价
				this.loadReviews();
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
				return { title: '什么还在996？赶紧来摸鱼吧！', imageUrl: '../../static/logo_small.jpg', path: '/pages/index/index' };
			},
			onShareTimeline() {
				return { title: '什么还在996？赶紧来摸鱼吧！', imageUrl: '../../static/logo_small.jpg' };
			},
			onAddToFavorites() {
				return { title: '偷偷马住别被老板看到！', imageUrl: '../../static/logo_small.jpg' };
			},
			checkBanner() {
				if (!this.hasLogin) return;
				AUTH.activeBanners().then(res => {
					if (res._status !== 0 || !res.data || res.data.length === 0) return;
					const banner = res.data[0];
					// 检验是否在24小时内展示过
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
				// 上报点击
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
page {
	background: #FFF9F5;
}
.page-wrapper {
	min-height: 100vh;
	padding-bottom: 120rpx;
}
/* ===== 顶部 ===== */
.top-bar {
	background: linear-gradient(135deg, #FF9ECD 0%, #FF6B9D 100%);
	padding: 60rpx 32rpx 30rpx;
	text-align: center;
	.top-bar-content {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 16rpx;
	}
	.top-emoji { font-size: 40rpx; animation: bounce 2s ease-in-out infinite; }
	.top-title {
		font-size: 44rpx;
		font-weight: bold;
		color: #FFF;
		letter-spacing: 4rpx;
	}
	.top-subtitle {
		display: block;
		margin-top: 8rpx;
		font-size: 24rpx;
		color: rgba(255,255,255,0.85);
		letter-spacing: 2rpx;
	}
}
@keyframes bounce {
	0%, 100% { transform: translateY(0); }
	50% { transform: translateY(-6rpx); }
}

/* ===== 公告条 ===== */
.notice-strip {
	display: flex;
	align-items: center;
	background: #FFF;
	margin: 0 24rpx;
	padding: 16rpx 24rpx;
	border-radius: 50rpx;
	box-shadow: 0 4rpx 16rpx rgba(255,107,157,0.12);
	margin-top: -16rpx;
	position: relative;
	z-index: 10;
	.notice-icon { font-size: 28rpx; margin-right: 12rpx; }
	.notice-swiper {
		flex: 1;
		height: 40rpx;
		.notice-text {
			font-size: 24rpx;
			color: #666;
			line-height: 40rpx;
			display: block;
		}
	}
}

/* ===== 轮播 ===== */
.carousel-wrapper {
	margin: 24rpx 24rpx 0;
	position: relative;
}
.carousel {
	width: 100%;
	height: 380rpx;
	border-radius: 32rpx;
	overflow: hidden;
	box-shadow: 0 12rpx 40rpx rgba(0, 0, 0, 0.1);
	.carousel-image {
		width: 100%;
		height: 100%;
	}
}
.carousel-indicator {
	display: flex;
	justify-content: center;
	gap: 12rpx;
	padding-top: 20rpx;
	.indicator-dot {
		width: 16rpx;
		height: 16rpx;
		border-radius: 50%;
		background: #DDD;
		transition: all 0.3s ease;
	}
	.indicator-dot.active {
		width: 48rpx;
		border-radius: 25rpx;
		background: linear-gradient(90deg, #FF9ECD, #FF6B9D);
	}
}
.carousel-placeholder {
	margin: 24rpx 24rpx 0;
	height: 300rpx;
	border-radius: 32rpx;
	background: linear-gradient(135deg, #FFF0F5, #F0F8FF);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	border: 2rpx dashed #FFD0E0;
	.placeholder-emoji { font-size: 80rpx; margin-bottom: 16rpx; }
	.placeholder-text { font-size: 28rpx; color: #FF9ECD; }
}

/* ===== 入场券卡片 ===== */
.ticket-card {
	margin: 24rpx;
	padding: 28rpx;
	background: linear-gradient(135deg, #FFF5F8, #FFF);
	border-radius: 28rpx;
	border: 2rpx solid #FFE5EE;
	display: flex;
	align-items: center;
	box-shadow: 0 8rpx 24rpx rgba(255,107,157,0.1);
	.ticket-left {
		margin-right: 20rpx;
		.ticket-emoji { font-size: 56rpx; }
	}
	.ticket-center {
		flex: 1;
		.ticket-name {
			display: block;
			font-size: 32rpx;
			font-weight: bold;
			color: #333;
			margin-bottom: 6rpx;
		}
		.ticket-desc {
			display: block;
			font-size: 22rpx;
			color: #888;
			margin-bottom: 8rpx;
		}
		.ticket-price-row {
			display: flex;
			align-items: baseline;
			gap: 6rpx;
		}
		.price-main {
			font-size: 44rpx;
			font-weight: bold;
			color: #FF6B9D;
		}
		.price-unit {
			font-size: 22rpx;
			color: #999;
		}
		.price-badge {
			margin-left: 12rpx;
			background: #FFF3E0;
			color: #F5A623;
			font-size: 20rpx;
			padding: 4rpx 12rpx;
			border-radius: 20rpx;
			font-weight: bold;
		}
	}
	.ticket-right {
		background: linear-gradient(135deg, #FF9ECD, #FF6B9D);
		border-radius: 50rpx;
		padding: 20rpx 32rpx;
		box-shadow: 0 6rpx 20rpx rgba(255,107,157,0.3);
		.book-btn-text {
			color: #FFF;
			font-size: 28rpx;
			font-weight: bold;
		}
	}
}

/* ===== 数据统计 ===== */
.stats-row {
	display: flex;
	align-items: center;
	justify-content: center;
	margin: 0 24rpx 24rpx;
	padding: 28rpx;
	background: linear-gradient(135deg, #667EEA, #764BA2);
	border-radius: 32rpx;
	box-shadow: 0 8rpx 24rpx rgba(102,126,234,0.3);
	.stat-item {
		flex: 1;
		text-align: center;
		.stat-num {
			display: block;
			font-size: 48rpx;
			font-weight: bold;
			color: #FFF;
		}
		.stat-label {
			display: block;
			font-size: 22rpx;
			color: rgba(255,255,255,0.8);
			margin-top: 4rpx;
		}
	}
	.stat-divider {
		width: 2rpx;
		height: 60rpx;
		background: rgba(255,255,255,0.3);
	}
}

/* ===== 通用区块 ===== */
.section { margin: 0 24rpx 32rpx; }
.section-header {
	display: flex;
	align-items: center;
	gap: 12rpx;
	margin-bottom: 20rpx;
	.section-emoji { font-size: 36rpx; }
	.section-title { font-size: 34rpx; font-weight: bold; color: #333; }
	.section-tag {
		margin-left: auto;
		background: #FFF3E0;
		color: #F5A623;
		font-size: 20rpx;
		padding: 6rpx 16rpx;
		border-radius: 20rpx;
		font-weight: bold;
	}
	.section-more {
		margin-left: auto;
		font-size: 24rpx;
		color: #FF6B9D;
	}
}

/* ===== 亲子阅读区 ===== */
.family-section {}
.family-card {
	background: linear-gradient(135deg, #FFF9E6, #FFF5E5);
	border-radius: 28rpx;
	padding: 28rpx;
	border: 2rpx solid #FFE0B2;
	display: flex;
	align-items: center;
	.family-left {
		margin-right: 24rpx;
		.family-emoji { font-size: 72rpx; }
	}
	.family-right {
		flex: 1;
		.family-headline {
			display: block;
			font-size: 30rpx;
			font-weight: bold;
			color: #333;
			margin-bottom: 10rpx;
		}
		.family-desc {
			display: block;
			font-size: 24rpx;
			color: #666;
			line-height: 1.6;
		}
		.family-desc.light { color: #FF9ECD; font-weight: 500; }
	}
}

/* ===== 娱乐设施 ===== */
.entertainment-grid {
	display: flex;
	flex-wrap: wrap;
	gap: 16rpx;
}
.enter-item {
	width: calc(50% - 8rpx);
	padding: 24rpx;
	border-radius: 24rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	.enter-emoji { font-size: 48rpx; margin-bottom: 10rpx; }
	.enter-name {
		display: block;
		font-size: 26rpx;
		font-weight: bold;
		color: #FFF;
		margin-bottom: 4rpx;
	}
	.enter-count {
		display: block;
		font-size: 20rpx;
		color: rgba(255,255,255,0.85);
	}
}

/* ===== 如何玩 ===== */
.how-to-section {
	background: #FFF;
	border-radius: 32rpx;
	padding: 32rpx;
	box-shadow: 0 6rpx 20rpx rgba(0,0,0,0.06);
	.steps-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
	}
	.step-item {
		flex: 1;
		text-align: center;
		position: relative;
	}
	.step-num {
		position: absolute;
		top: -8rpx;
		left: 50%;
		transform: translateX(-50%);
		width: 36rpx;
		height: 36rpx;
		background: #FF6B9D;
		color: #FFF;
		border-radius: 50%;
		font-size: 20rpx;
		font-weight: bold;
		line-height: 36rpx;
		text-align: center;
	}
	.step-icon { font-size: 56rpx; display: block; margin-bottom: 12rpx; margin-top: 12rpx; }
	.step-title { display: block; font-size: 26rpx; font-weight: bold; color: #333; margin-bottom: 6rpx; }
	.step-desc { display: block; font-size: 20rpx; color: #999; line-height: 1.4; }
	.step-arrow {
		font-size: 28rpx;
		color: #FF6B9D;
		padding-top: 50rpx;
		flex-shrink: 0;
	}
}

/* ===== 热门游戏 ===== */
.games-scroll {
	display: flex;
	white-space: nowrap;
	gap: 20rpx;
	padding-bottom: 16rpx;
}
.game-card {
	display: inline-block;
	width: 180rpx;
	flex-shrink: 0;
	.game-cover {
		width: 180rpx;
		height: 180rpx;
		border-radius: 24rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 6rpx 20rpx rgba(0,0,0,0.1);
		margin-bottom: 12rpx;
		.game-cover-emoji { font-size: 72rpx; }
	}
	.game-name { display: block; font-size: 26rpx; font-weight: bold; color: #333; text-align: center; }
	.game-tag { display: block; font-size: 20rpx; color: #888; text-align: center; margin-top: 4rpx; }
}

/* ===== 套餐列表 ===== */
.package-list {
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}
.package-simple {
	display: flex;
	align-items: center;
	background: #FFF;
	border-radius: 24rpx;
	padding: 24rpx;
	box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
	.pkg-icon-box {
		width: 80rpx;
		height: 80rpx;
		border-radius: 20rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-right: 20rpx;
		flex-shrink: 0;
		.pkg-icon { font-size: 40rpx; }
	}
	.pkg-info {
		flex: 1;
		.pkg-title { display: block; font-size: 28rpx; font-weight: bold; color: #333; margin-bottom: 6rpx; }
		.pkg-detail { display: block; font-size: 22rpx; color: #888; margin-bottom: 6rpx; }
		.pkg-price-row {
			display: flex;
			align-items: baseline;
			gap: 6rpx;
		}
		.pkg-price { font-size: 36rpx; font-weight: bold; color: #FF6B9D; }
		.pkg-price-sub { font-size: 22rpx; color: #999; }
		.pkg-kid {
			margin-left: 12rpx;
			background: #FFF3E0;
			color: #F5A623;
			font-size: 20rpx;
			padding: 4rpx 12rpx;
			border-radius: 20rpx;
			font-weight: bold;
		}
	}
}

/* ===== 店铺信息 ===== */
.shop-info-card {
	background: #FFF;
	border-radius: 32rpx;
	padding: 28rpx;
	box-shadow: 0 6rpx 20rpx rgba(0,0,0,0.06);
	.shop-name-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 24rpx;
		.shop-name { font-size: 34rpx; font-weight: bold; color: #333; }
		.shop-status {
			display: flex;
			align-items: center;
			gap: 8rpx;
			.status-dot {
				width: 12rpx;
				height: 12rpx;
				border-radius: 50%;
				background: #52C41A;
			}
			.status-text { font-size: 24rpx; color: #52C41A; }
		}
	}
	.info-item {
		display: flex;
		align-items: center;
		padding: 16rpx 0;
		border-top: 1rpx solid #F5F5F5;
		.info-icon { font-size: 32rpx; margin-right: 16rpx; }
		.info-content { flex: 1; }
		.info-label { display: block; font-size: 22rpx; color: #999; margin-bottom: 4rpx; }
		.info-value { display: block; font-size: 26rpx; color: #333; }
		.info-value.highlight { color: #FF6B9D; font-weight: bold; }
		.info-arrow { font-size: 28rpx; color: #CCC; }
	}
}

/* ===== 评价 ===== */
.reviews-swiper {
	height: 220rpx;
	margin: 0;
}
.review-card {
	background: #FFF;
	border-radius: 24rpx;
	padding: 24rpx;
	box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
	.review-header {
		display: flex;
		align-items: center;
		gap: 16rpx;
		margin-bottom: 12rpx;
	}
	.review-avatar { font-size: 48rpx; }
	.review-meta { flex: 1; }
	.review-name { display: block; font-size: 26rpx; font-weight: bold; color: #333; margin-bottom: 4rpx; }
	.review-stars .star { font-size: 20rpx; }
	.review-text { display: block; font-size: 26rpx; color: #666; line-height: 1.6; }
	.review-time { display: block; font-size: 20rpx; color: #AAA; margin-top: 8rpx; }
}
.reviews-empty {
	text-align: center;
	padding: 48rpx 0;
	.empty-icon { font-size: 72rpx; display: block; margin-bottom: 16rpx; }
	.empty-text { font-size: 26rpx; color: #999; display: block; margin-bottom: 24rpx; }
	.empty-btn {
		display: inline-block;
		background: linear-gradient(135deg, #FF9ECD, #FF6B9D);
		color: #FFF;
		font-size: 26rpx;
		padding: 16rpx 40rpx;
		border-radius: 50rpx;
		font-weight: bold;
	}
}

/* ===== 提示 ===== */
.tips-list {
	display: flex;
	flex-direction: column;
	gap: 12rpx;
}
.tip-item {
	display: flex;
	align-items: center;
	padding: 16rpx 20rpx;
	background: #FFF;
	border-radius: 16rpx;
	border-left: 6rpx solid;
	box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
	.tip-text { font-size: 26rpx; color: #666; line-height: 1.4; }
}

/* ===== 悬浮预约 ===== */



/* 营销弹窗 */
.banner-popup {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	background: rgba(0,0,0,0.6);
	z-index: 9999;
	display: flex;
	align-items: center;
	justify-content: center;
}
.banner-panel {
	position: relative;
	width: 600rpx;
	max-height: 800rpx;
	border-radius: 24rpx;
	overflow: hidden;
	box-shadow: 0 8rpx 32rpx rgba(0,0,0,0.3);
}
.banner-img {
	width: 100%;
	height: 600rpx;
	display: block;
}
.banner-info {
	padding: 24rpx;
	text-align: center;
}
.banner-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
	display: block;
}
.banner-sub {
	font-size: 24rpx;
	color: #666;
	display: block;
	margin-top: 8rpx;
}
.banner-close {
	position: absolute;
	top: 16rpx;
	right: 16rpx;
	width: 56rpx;
	height: 56rpx;
	background: rgba(0,0,0,0.4);
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	color: #fff;
	font-size: 32rpx;
}

</style>
