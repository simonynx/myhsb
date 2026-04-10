<template>
	<view class="page-wrapper">
		<!-- 顶部装饰 -->
		<view class="top-bar">
			<view class="top-bar-content">
				<text class="top-emoji">🎲</text>
				<text class="top-title">摸鱼划水吧</text>
				<text class="top-emoji">🎯</text>
			</view>
			<text class="top-subtitle">桌游 · 棋牌 · 休闲 · 社交</text>
		</view>

		<!-- 公告 -->
		<view class="notice-strip">
			<text class="notice-icon">📢</text>
			<swiper class="notice-swiper" vertical autoplay circular interval="3000">
				<swiper-item><text class="notice-text">开业大酬宾啦～快点到店来体验！</text></swiper-item>
				<swiper-item><text class="notice-text">新到一批热门桌游，等你来解锁！</text></swiper-item>
				<swiper-item><text class="notice-text">团体包场请联系店主～</text></swiper-item>
			</swiper>
		</view>

		<!-- Hero 主图区域 -->
		<view class="hero-section">
			<view class="hero-bg"></view>
			<view class="hero-content">
				<text class="hero-emoji">🕹️</text>
				<text class="hero-slogan">什么还在996？</text>
				<text class="hero-slogan accent">赶紧来摸鱼吧！</text>
				<text class="hero-desc">100+款热门桌游 · 舒适环境 · 无限畅玩</text>
				<view class="hero-btns">
					<view class="btn-primary" @tap="goToReserve">
						<text class="btn-icon">📅</text>
						<text>立即预约</text>
					</view>
					<view class="btn-secondary" @tap="scrollToGames">
						<text class="btn-icon">🎮</text>
						<text>看看游戏</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 核心数据 -->
		<view class="stats-row">
			<view class="stat-item">
				<text class="stat-num">100+</text>
				<text class="stat-label">热门桌游</text>
			</view>
			<view class="stat-divider"></view>
			<view class="stat-item">
				<text class="stat-num">8h</text>
				<text class="stat-label">营业时长</text>
			</view>
			<view class="stat-divider"></view>
			<view class="stat-item">
				<text class="stat-num">∞</text>
				<text class="stat-label">欢乐时光</text>
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
					<text class="step-icon">🪑</text>
					<text class="step-title">到店入座</text>
					<text class="step-desc">选个舒适的位置换上拖鞋</text>
				</view>
				<view class="step-arrow">→</view>
				<view class="step-item">
					<view class="step-num">2</view>
					<text class="step-icon">🎲</text>
					<text class="step-title">选游戏</text>
					<text class="step-desc">100+款游戏任你挑选</text>
				</view>
				<view class="step-arrow">→</view>
				<view class="step-item">
					<view class="step-num">3</view>
					<text class="step-icon">😄</text>
					<text class="step-title">开玩！</text>
					<text class="step-desc">和小伙伴们欢乐畅玩</text>
				</view>
			</view>
		</view>

		<!-- 游戏分类 -->
		<view class="section games-section" id="games-section">
			<view class="section-header">
				<text class="section-emoji">🎮</text>
				<text class="section-title">游戏种类</text>
				<text class="section-more">全部游戏 →</text>
			</view>
			<view class="game-categories">
				<view 
					class="game-cat-item" 
					v-for="(cat, idx) in gameCategories" 
					:key="idx"
					:style="{ background: cat.bg }"
					@tap="showCatGames(cat)"
				>
					<text class="cat-emoji">{{ cat.emoji }}</text>
					<text class="cat-name">{{ cat.name }}</text>
					<text class="cat-count">{{ cat.count }}款</text>
				</view>
			</view>
		</view>

		<!-- 热门游戏 -->
		<view class="section hot-games-section">
			<view class="section-header">
				<text class="section-emoji">🔥</text>
				<text class="section-title">热门游戏推荐</text>
			</view>
			<scroll-view class="games-scroll" scroll-x>
				<view 
					class="game-card" 
					v-for="(game, idx) in hotGames" 
					:key="idx"
					@tap="showGameDetail(game)"
				>
					<view class="game-cover" :style="{ background: game.coverBg }">
						<text class="game-cover-emoji">{{ game.emoji }}</text>
					</view>
					<text class="game-name">{{ game.name }}</text>
					<text class="game-tag">{{ game.tag }}</text>
				</view>
			</scroll-view>
		</view>

		<!-- 套餐介绍 -->
		<view class="section packages-section">
			<view class="section-header">
				<text class="section-emoji">💰</text>
				<text class="section-title">收费套餐</text>
			</view>
			<view class="packages-row">
				<view class="package-card" v-for="(pkg, idx) in packages" :key="idx">
					<view class="pkg-header" :style="{ background: pkg.color }">
						<text class="pkg-emoji">{{ pkg.emoji }}</text>
					</view>
					<view class="pkg-body">
						<text class="pkg-name">{{ pkg.name }}</text>
						<text class="pkg-price">{{ pkg.price }}</text>
						<text class="pkg-unit">/人</text>
						<view class="pkg-features">
							<text class="pkg-feature" v-for="(f, i) in pkg.features" :key="i">✓ {{ f }}</text>
						</view>
					</view>
					<view class="pkg-btn" :style="{ background: pkg.color }">立即预约</view>
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
					<text class="shop-name">摸鱼划水吧</text>
					<view class="shop-status">
						<text class="status-dot"></text>
						<text class="status-text">营业中</text>
					</view>
				</view>
				
				<view class="info-item" @tap="openLocation">
					<text class="info-icon">📍</text>
					<view class="info-content">
						<text class="info-label">地址</text>
						<text class="info-value">{{addressData.address + addressData.area}}</text>
					</view>
					<text class="info-arrow">→</text>
				</view>
				
				<view class="info-item">
					<text class="info-icon">🕐</text>
					<view class="info-content">
						<text class="info-label">营业时间</text>
						<text class="info-value">10:00 - 22:00</text>
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

		<!-- 用户评价 -->
		<view class="section reviews-section">
			<view class="section-header">
				<text class="section-emoji">💬</text>
				<text class="section-title">玩家评价</text>
				<text class="section-more">更多 →</text>
			</view>
			<view class="reviews-list">
				<view class="review-card" v-for="(rev, idx) in reviews" :key="idx">
					<view class="review-header">
						<text class="review-avatar">{{ rev.avatar }}</text>
						<view class="review-meta">
							<text class="review-name">{{ rev.name }}</text>
							<view class="review-stars">
								<text v-for="s in 5" :key="s" :class="s <= rev.rating ? 'star filled' : 'star'">⭐</text>
							</view>
						</view>
					</view>
					<text class="review-text">{{ rev.text }}</text>
				</view>
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

		<!-- 底部悬浮预约按钮 -->
		<view class="float-booking" @tap="goToReserve">
			<text class="float-icon">📅</text>
			<text class="float-text">立即预约</text>
		</view>
	</view>
</template>

<script>
	import { mapState, mapActions } from 'vuex';
	export default {
		computed: {
			...mapState(['hasLogin', 'constance'])
		},
		watch: {
			constance(value) { this.loadData(); },
		},
		data() {
			return {
				carouselList: [],
				addressData: {
					name: '摸鱼划水吧',
					address: '福建省福州市台江区交通路',
					area: '6号儒商楼08店面',
				},
				gameCategories: [
					{ emoji: '🎲', name: '桌游', count: 50, bg: 'linear-gradient(135deg, #FFE5E5, #FFCACA)' },
					{ emoji: '🃏', name: '卡牌', count: 20, bg: 'linear-gradient(135deg, #E5F0FF, #CADDFF)' },
					{ emoji: '🧩', name: '拼图', count: 15, bg: 'linear-gradient(135deg, #FFF5E5, #FFE0C0)' },
					{ emoji: '🎯', name: '棋牌', count: 18, bg: 'linear-gradient(135deg, #E5FFE5, #C0FFC0)' },
					{ emoji: '📚', name: '剧本杀', count: 8, bg: 'linear-gradient(135deg, #F5E5FF, #E0C0FF)' },
					{ emoji: '🎤', name: '更多', count: 10, bg: 'linear-gradient(135deg, #FFFFF0, #FFFACD)' },
				],
				hotGames: [
					{ emoji: '🐺', name: '狼人杀', tag: '社交推理', coverBg: 'linear-gradient(135deg, #667EEA, #764BA2)' },
					{ emoji: '💰', name: '大富翁', tag: '经典休闲', coverBg: 'linear-gradient(135deg, #F093FB, #F5576C)' },
					{ emoji: '🦠', name: '瘟疫危机', tag: '合作策略', coverBg: 'linear-gradient(135deg, #4FACFE, #00F2FE)' },
					{ emoji: '⚔️', name: '三国杀', tag: '国风策略', coverBg: 'linear-gradient(135deg, #FA709A, #FEE140)' },
					{ emoji: '🃏', name: 'UNO', tag: '聚会王牌', coverBg: 'linear-gradient(135deg, #30CFD0, #330867)' },
					{ emoji: '🚢', name: '德州扑克', tag: '策略博弈', coverBg: 'linear-gradient(135deg, #2E8B57, #2E8B57)' },
				],
				packages: [
					{
						emoji: '☕',
						name: '闲时套餐',
						price: '¥28',
						color: '#7ED56F',
						features: ['工作日白天', '4小时畅玩', '免费茶水'],
					},
					{
						emoji: '🎉',
						name: '黄金档',
						price: '¥38',
						color: '#FF6B9D',
						features: ['周末/节假日', '4小时畅玩', '免费茶水饮料'],
					},
					{
						emoji: '👑',
						name: '包天卡',
						price: '¥58',
						color: '#F5A623',
						features: ['全天畅玩', '免费茶水饮料', '会员特权'],
					},
				],
				reviews: [
					{ avatar: '😄', name: '小林', rating: 5, text: '环境超棒！游戏种类特别多，周末和朋友来玩一天都不够～' },
					{ avatar: '🤗', name: '阿雪', rating: 5, text: '老板人很好，会推荐适合的游戏。店里有猫，撸猫打游戏太快乐了！' },
					{ avatar: '🙋', name: '老王', rating: 4, text: '性价比很高的桌游店，适合团体聚会，已经推荐给朋友了。' },
				],
				tips: [
					'本店禁止从事黄赌毒行为',
					'只收取场地费用，不收额外费用',
					'可提供包场服务，如还有其它商业合作需要请电话联系',
					'入内需换拖鞋或穿戴鞋套',
					'不断更新游戏、漫画、小说、桌游、电影等',
				],
				tipColors: ['#FF6B9D', '#4FACFE', '#F5A623', '#7ED56F', '#667EEA'],
			};
		},
		onShow() {
			if (!this.hasLogin) this.loginAndRegister();
		},
		onLoad() {
			this.loadData();
		},
		methods: {
			...mapActions(['loginAndRegister', 'getConstanceInfo']),
			
			openLocation() {
				uni.openLocation({
					latitude: 26.068525,
					longitude: 119.303882,
					scale: 5,
					name: this.addressData.name,
					address: this.addressData.address + this.addressData.area
				});
			},
			goToReserve() {
				uni.switchTab({ url: '/pages/tabBar/appoint/appoint' });
			},
			scrollToGames() {
				uni.pageScrollTo({ selector: '#games-section', duration: 300 });
			},
			showCatGames(cat) {
				uni.showToast({ title: cat.name + ' - ' + cat.count + '款游戏', icon: 'none' });
			},
			showGameDetail(game) {
				uni.showToast({ title: game.name, icon: 'none' });
			},
			async loadData() {
				this.carouselList = [];
				if (this.constance) {
					if (this.constance.home_page_image0) this.carouselList.push(this.constance.home_page_image0);
					if (this.constance.home_page_image1) this.carouselList.push(this.constance.home_page_image1);
					if (this.constance.home_page_image2) this.carouselList.push(this.constance.home_page_image2);
					if (this.constance.home_page_image3) this.carouselList.push(this.constance.home_page_image3);
				}
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
		},
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
	.top-emoji {
		font-size: 40rpx;
		animation: bounce 2s ease-in-out infinite;
	}
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
		font-size: 24rpx;
		color: #666;
		line-height: 40rpx;
	}
}

/* ===== Hero ===== */
.hero-section {
	position: relative;
	margin: 24rpx;
	padding: 40rpx 32rpx;
	border-radius: 40rpx;
	overflow: hidden;
	background: linear-gradient(135deg, #FFF0F5 0%, #FFF5FF 50%, #F0F8FF 100%);
	border: 2rpx solid #FFE5EE;
	text-align: center;
	.hero-bg {
		position: absolute;
		top: 0; left: 0; right: 0; bottom: 0;
		background: radial-gradient(circle at 30% 30%, rgba(255,107,157,0.1) 0%, transparent 60%);
	}
	.hero-content { position: relative; z-index: 1; }
	.hero-emoji { font-size: 80rpx; display: block; margin-bottom: 16rpx; }
	.hero-slogan {
		display: block;
		font-size: 44rpx;
		font-weight: bold;
		color: #333;
		line-height: 1.3;
	}
	.hero-slogan.accent { color: #FF6B9D; }
	.hero-desc {
		display: block;
		margin-top: 12rpx;
		font-size: 26rpx;
		color: #888;
	}
	.hero-btns {
		display: flex;
		justify-content: center;
		gap: 24rpx;
		margin-top: 32rpx;
	}
	.btn-primary, .btn-secondary {
		display: flex;
		align-items: center;
		gap: 8rpx;
		padding: 20rpx 40rpx;
		border-radius: 50rpx;
		font-size: 28rpx;
		font-weight: bold;
	}
	.btn-primary {
		background: linear-gradient(135deg, #FF9ECD, #FF6B9D);
		color: #FFF;
		box-shadow: 0 8rpx 24rpx rgba(255,107,157,0.4);
	}
	.btn-secondary {
		background: #FFF;
		color: #FF6B9D;
		border: 2rpx solid #FFE5EE;
	}
	.btn-icon { font-size: 28rpx; }
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
.section {
	margin: 0 24rpx 32rpx;
}
.section-header {
	display: flex;
	align-items: center;
	gap: 12rpx;
	margin-bottom: 20rpx;
	.section-emoji { font-size: 36rpx; }
	.section-title {
		font-size: 34rpx;
		font-weight: bold;
		color: #333;
	}
	.section-more {
		margin-left: auto;
		font-size: 24rpx;
		color: #FF6B9D;
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

/* ===== 游戏分类 ===== */
.game-categories {
	display: flex;
	flex-wrap: wrap;
	gap: 16rpx;
}
.game-cat-item {
	width: calc(33.333% - 12rpx);
	padding: 24rpx 16rpx;
	border-radius: 24rpx;
	text-align: center;
	.cat-emoji { font-size: 52rpx; display: block; margin-bottom: 10rpx; }
	.cat-name { display: block; font-size: 26rpx; font-weight: bold; color: #333; margin-bottom: 6rpx; }
	.cat-count { display: block; font-size: 20rpx; color: #888; }
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
	width: 200rpx;
	flex-shrink: 0;
	.game-cover {
		width: 200rpx;
		height: 200rpx;
		border-radius: 24rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 6rpx 20rpx rgba(0,0,0,0.1);
		margin-bottom: 12rpx;
		.game-cover-emoji { font-size: 80rpx; }
	}
	.game-name { display: block; font-size: 26rpx; font-weight: bold; color: #333; text-align: center; }
	.game-tag { display: block; font-size: 20rpx; color: #888; text-align: center; margin-top: 4rpx; }
}

/* ===== 套餐 ===== */
.packages-row {
	display: flex;
	gap: 16rpx;
}
.package-card {
	flex: 1;
	background: #FFF;
	border-radius: 28rpx;
	overflow: hidden;
	box-shadow: 0 6rpx 20rpx rgba(0,0,0,0.08);
	.pkg-header {
		padding: 20rpx;
		text-align: center;
		.pkg-emoji { font-size: 48rpx; }
	}
	.pkg-body {
		padding: 20rpx 16rpx;
		text-align: center;
		.pkg-name { display: block; font-size: 26rpx; font-weight: bold; color: #333; margin-bottom: 8rpx; }
		.pkg-price { font-size: 40rpx; font-weight: bold; color: #FF6B9D; }
		.pkg-unit { font-size: 22rpx; color: #999; }
		.pkg-features {
			margin-top: 12rpx;
			text-align: left;
			.pkg-feature { display: block; font-size: 20rpx; color: #666; line-height: 1.6; }
		}
	}
	.pkg-btn {
		display: block;
		text-align: center;
		padding: 16rpx;
		color: #FFF;
		font-size: 26rpx;
		font-weight: bold;
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
.reviews-list {
	display: flex;
	flex-direction: column;
	gap: 16rpx;
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
.float-booking {
	position: fixed;
	bottom: 40rpx;
	left: 50%;
	transform: translateX(-50%);
	display: flex;
	align-items: center;
	gap: 12rpx;
	padding: 24rpx 60rpx;
	background: linear-gradient(135deg, #FF9ECD, #FF6B9D);
	color: #FFF;
	border-radius: 50rpx;
	box-shadow: 0 8rpx 32rpx rgba(255,107,157,0.5);
	font-size: 30rpx;
	font-weight: bold;
	z-index: 999;
	animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse {
	0%, 100% { box-shadow: 0 8rpx 32rpx rgba(255,107,157,0.5); }
	50% { box-shadow: 0 8rpx 48rpx rgba(255,107,157,0.8); }
}
.float-icon { font-size: 32rpx; }
</style>
