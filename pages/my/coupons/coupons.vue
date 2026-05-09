<template>
	<view class="page-wrapper">
		<!-- 顶部天空 -->
		<view class="sky-header">
			<!-- 手绘云朵 -->
			<view class="cloud cloud-1">
				<view class="puff p1"></view>
				<view class="puff p2"></view>
				<view class="puff p3"></view>
			</view>
			<view class="cloud cloud-2">
				<view class="puff p1"></view>
				<view class="puff p2"></view>
			</view>
			<view class="cloud cloud-3">
				<view class="puff p1"></view>
				<view class="puff p2"></view>
				<view class="puff p3"></view>
			</view>
			<!-- 装饰小鸟 -->
			<view class="bird bird-1">
				<view class="wing"></view>
			</view>
			<view class="bird bird-2">
				<view class="wing"></view>
			</view>

			<view class="header-content">
				<text class="header-title">我的优惠券</text>
				<text class="header-sub">像捡金币一样发现好券 🍃</text>
			</view>

			<!-- 底部草地弧线 -->
			<view class="grass-hill">
				<view class="hill hill-1"></view>
				<view class="hill hill-2"></view>
				<view class="hill hill-3"></view>
			</view>
		</view>

		<view class="login-panel" v-if="!hasLogin">
			<text class="login-title">登录后查看你的优惠券</text>
			<text class="login-sub">可领取、未使用和历史优惠券都会放在这里</text>
			<view class="login-btn" @tap="handleLogin">立即登录</view>
		</view>

		<block v-else>
			<!-- 标签 -->
			<view class="tab-bar">
				<view
					class="tab-item"
					v-for="(tab, idx) in tabs"
					:key="idx"
					:class="tabIndex === idx ? 'active' : ''"
					@tap="switchTab(idx)"
				>
					<text>{{ tab.name }}</text>
					<view class="tab-dot" v-if="tab.count > 0">{{ tab.count }}</view>
				</view>
			</view>

			<!-- 可领优惠券 -->
			<scroll-view class="scroll-area" scroll-y v-if="tabIndex === 0">
				<view class="loading-box" v-if="availableLoading">
					<text>加载中...</text>
				</view>
				<view class="coupon-list" v-else-if="availableList.length > 0">
					<view
						class="coupon-card"
						v-for="(item, idx) in availableList"
						:key="idx"
					>
						<!-- 角落小花 -->
						<view class="corner-flower">
							<view class="petal"></view>
							<view class="petal"></view>
							<view class="petal"></view>
							<view class="flower-center"></view>
						</view>

						<view class="card-left">
							<view class="left-value">
								<text class="left-unit">{{ item.displayPrefix }}</text>
								<text class="left-num">{{ item.displayValue }}</text>
							</view>
							<text class="left-rule">{{ item.limitText }}</text>
						</view>
						<view class="card-gap">
							<view class="gap-dot top"></view>
							<view class="gap-line"></view>
							<view class="gap-dot bottom"></view>
						</view>
						<view class="card-right">
							<view class="right-header">
								<text class="right-name">{{ item.name }}</text>
								<view class="right-tag" v-if="item.description">{{ item.description }}</view>
							</view>
							<text class="right-desc">{{ item.descText }}</text>
							<view class="right-footer">
								<text class="right-expire">{{ item.validText }}</text>
								<button
									class="right-btn"
									:disabled="receivingCouponId === item.campaign_id"
									@tap.stop="receiveCoupon(item)"
								>
									{{ receivingCouponId === item.campaign_id ? '领取中' : '领券' }}
								</button>
							</view>
						</view>
					</view>
				</view>
				<view class="empty-box" v-else>
					<view class="empty-cloud">
						<view class="puff p1"></view>
						<view class="puff p2"></view>
						<view class="puff p3"></view>
					</view>
					<text class="empty-title">暂无可领取优惠券</text>
					<text class="empty-sub">已领取的券可以在未使用里查看</text>
				</view>
				<view style="height: 40rpx;"></view>
			</scroll-view>

			<!-- 我的优惠券列表 -->
			<scroll-view class="scroll-area" scroll-y v-if="tabIndex !== 0">
				<view class="loading-box" v-if="myCouponsLoading">
					<text>加载中...</text>
				</view>
				<view class="coupon-list" v-else-if="myCoupons.length > 0">
					<view
						:class="item.cardClass"
						v-for="(item, idx) in myCoupons"
						:key="idx"
					>
						<view class="corner-flower">
							<view class="petal"></view>
							<view class="petal"></view>
							<view class="petal"></view>
							<view class="flower-center"></view>
						</view>

						<view class="card-left">
							<view class="left-value">
								<text class="left-unit">{{ item.displayPrefix }}</text>
								<text class="left-num">{{ item.displayValue }}</text>
							</view>
							<text class="left-rule">{{ item.limitText }}</text>
						</view>
						<view class="card-gap">
							<view class="gap-dot top"></view>
							<view class="gap-line"></view>
							<view class="gap-dot bottom"></view>
						</view>
						<view class="card-right">
							<view class="right-header">
								<text class="right-name">{{ item.name }}</text>
								<view class="right-tag" v-if="item.description">{{ item.description }}</view>
							</view>
							<text class="right-desc">{{ item.descText }}</text>
							<view class="right-footer">
								<text :class="item.expireClass">{{ item.expireText }}</text>
								<view class="use-btn" v-if="item.status === 0" @tap="goUseCoupon">去使用</view>
							</view>
						</view>
						<!-- 状态水印 -->
						<view class="watermark" v-if="item.status === 1">
							<text>已使用</text>
						</view>
						<view class="watermark expired" v-if="item.status === 2">
							<text>已过期</text>
						</view>
					</view>
				</view>
				<view class="empty-box" v-else>
					<view class="empty-cloud">
						<view class="puff p1"></view>
						<view class="puff p2"></view>
						<view class="puff p3"></view>
					</view>
					<text class="empty-title">{{ currentEmptyTitle }}</text>
					<text class="empty-sub">{{ currentEmptySub }}</text>
				</view>
				<view style="height: 40rpx;"></view>
			</scroll-view>
		</block>
	</view>
</template>

<script>
	import { mapState, mapActions } from 'vuex';
	import AUTH from '../../../utils/auth.js';

	export default {
		computed: {
			...mapState(['hasLogin', 'token']),
			currentEmptyTitle() {
				if (this.tabIndex === 1) return '暂无未使用优惠券';
				if (this.tabIndex === 2) return '暂无已使用优惠券';
				if (this.tabIndex === 3) return '暂无过期优惠券';
				return '暂无优惠券';
			},
			currentEmptySub() {
				if (this.tabIndex === 1) return '先去可领取里看看有没有新券';
				if (this.tabIndex === 2) return '用券下单后会显示在这里';
				if (this.tabIndex === 3) return '暂时没有过期记录';
				return '有新券时会第一时间展示';
			},
		},
		data() {
			return {
				tabIndex: 0,
				tabs: [
					{ name: '可领取', key: 'available', count: 0 },
					{ name: '未使用', key: 'unused', count: 0 },
					{ name: '已使用', key: 'used', count: 0 },
					{ name: '已过期', key: 'expired', count: 0 },
				],
				availableList: [],
				myCoupons: [],
				availableLoading: false,
				myCouponsLoading: false,
				receivingCouponId: '',
			};
		},
		onLoad(options) {
			this.applyInitialTab(options || {});
		},
		onShow() {
			if (this.hasLogin) {
				this.loadAvailable();
				this.updateTabCounts();
				if (this.tabIndex !== 0) this.loadMyCoupons();
			} else {
				this.availableList = [];
				this.myCoupons = [];
			}
		},
		methods: {
			...mapActions(['loginAndRegister', 'getUserInfo']),
			applyInitialTab(options) {
				var tab = options.tab || options.type || '';
				if (tab === 'unused') this.tabIndex = 1;
				else if (tab === 'used') this.tabIndex = 2;
				else if (tab === 'expired') this.tabIndex = 3;
				else this.tabIndex = 0;
			},
			switchTab(idx) {
				if (this.tabIndex === idx) return;
				this.tabIndex = idx;
				if (idx === 0) {
					this.loadAvailable();
				} else {
					this.loadMyCoupons();
				}
			},
			handleLogin() {
				this.loginAndRegister().then(() => {
					this.getUserInfo();
					this.loadAvailable();
					this.updateTabCounts();
					if (this.tabIndex !== 0) this.loadMyCoupons();
				});
			},
			async loadAvailable() {
				this.availableLoading = true;
				try {
					var res = await AUTH.getCouponList(this.token);
					if (res._status === 0) {
						var list = res.data || [];
						var claimable = list.filter(function(item) {
							return !item.user_received && item.remaining_count !== 0;
						});
						this.availableList = claimable.map(function(item) {
							return this.prepareCoupon(item);
						}.bind(this));
						this.tabs[0].count = this.availableList.length;
					} else {
						this.availableList = [];
						this.tabs[0].count = 0;
					}
				} catch (e) {
					console.error('加载优惠券失败:', e);
					this.availableList = [];
					this.tabs[0].count = 0;
				} finally {
					this.availableLoading = false;
				}
			},
			async loadMyCoupons() {
				if (this.tabIndex === 0) {
					this.myCoupons = [];
					return;
				}
				var statusMap = { 0: null, 1: 0, 2: 1, 3: 2 };
				var status = statusMap[this.tabIndex];
				this.myCouponsLoading = true;
				try {
					var res = await AUTH.getMyCoupons(this.token, status);
					if (res._status === 0) {
						this.myCoupons = (res.data || []).map(function(item) {
							return this.prepareCoupon(item);
						}.bind(this));
					} else {
						this.myCoupons = [];
					}
				} catch (e) {
					console.error('加载我的优惠券失败:', e);
					this.myCoupons = [];
				} finally {
					this.myCouponsLoading = false;
				}
			},
			async updateTabCounts() {
				try {
					var res = await AUTH.getMyCoupons(this.token);
					if (res._status === 0) {
						var all = res.data || [];
						var unused = all.filter(function(item) { return Number(item.status) === 0; });
						var used = all.filter(function(item) { return Number(item.status) === 1; });
						var expired = all.filter(function(item) { return Number(item.status) === 2; });
						this.tabs[1].count = unused.length;
						this.tabs[2].count = used.length;
						this.tabs[3].count = expired.length;
					}
				} catch (e) {}
			},
			async receiveCoupon(item) {
				if (item.remaining_count === 0) return;
				if (this.receivingCouponId) return;
				this.receivingCouponId = item.campaign_id;
				uni.showLoading({ title: '领取中...' });
				try {
					var res = await AUTH.receiveCoupon(this.token, item.campaign_id);
					uni.hideLoading();
					if (res._status === 0) {
						uni.showToast({ title: '领取成功', icon: 'success' });
						this.availableList = this.availableList.filter(function(c) {
							return c.campaign_id !== item.campaign_id;
						});
						this.tabs[0].count = Math.max(0, this.availableList.length);
						this.updateTabCounts();
					} else {
						uni.showToast({ title: res._reason || '领取失败', icon: 'none' });
					}
				} catch (e) {
					uni.hideLoading();
					uni.showToast({ title: '领取失败', icon: 'none' });
				} finally {
					this.receivingCouponId = '';
				}
			},
			goUseCoupon() {
				uni.switchTab({ url: '/pages/tabBar/appoint/appoint' });
			},
			prepareCoupon(item) {
				var coupon = Object.assign({}, item);
				var status = Number(coupon.status || 0);
				coupon.status = status;
				coupon.min_consume = this.getMinConsume(coupon);
				coupon.displayPrefix = this.getCouponPrefix(coupon);
				coupon.displayValue = this.getCouponValue(coupon);
				coupon.limitText = coupon.min_consume > 0 ? ('满' + this.formatFen(coupon.min_consume) + '元可用') : '无门槛';
				coupon.descText = this.getCouponDesc(coupon);
				coupon.validText = this.getCouponValidText(coupon);
				coupon.expireText = this.getCouponExpireText(coupon);
				coupon.cardClass = status === 1 ? 'coupon-card used' : (status === 2 ? 'coupon-card expired' : 'coupon-card');
				coupon.expireClass = status === 1 ? 'right-expire used' : (status === 2 ? 'right-expire expired' : 'right-expire');
				return coupon;
			},
			getMinConsume(item) {
				var rules = item.rules || {};
				if (item.min_consume !== undefined && item.min_consume !== null) return item.min_consume || 0;
				return rules.min_amount || 0;
			},
			getCouponPrefix(item) {
				if (item.coupon_type === 'rebate') return '¥';
				return '';
			},
			getCouponValue(item) {
				var rules = item.rules || {};
				if (item.coupon_type === 'rebate') {
					return this.formatFen(rules.discount || item.discount || 0);
				} else if (item.coupon_type === 'discount') {
					var rate = this.normalizeDiscountRate(rules.discount_rate || item.discount_rate || 1);
					return (Math.round(rate * 100) / 10) + '折';
				}
				return rules.gift_value || '-';
			},
			formatFen(fen) {
				fen = parseFloat(fen);
				if (!isFinite(fen)) fen = 0;
				var yuan = fen / 100;
				return yuan % 1 === 0 ? String(yuan.toFixed(0)) : yuan.toFixed(2);
			},
			normalizeDiscountRate(rate) {
				rate = parseFloat(rate);
				if (!isFinite(rate) || rate <= 0) return 1;
				if (rate > 10) return rate / 100;
				if (rate > 1) return rate / 10;
				return rate;
			},
			getCouponDesc(item) {
				var rules = item.rules || {};
				if (item.coupon_type === 'rebate') {
					var min = item.min_consume || rules.min_amount || 0;
					var discount = rules.discount || 0;
					var threshold = min > 0 ? ('满' + this.formatFen(min) + '元可用') : '无门槛';
					var amount = discount > 0 ? ('立减' + this.formatFen(discount) + '元') : '';
					return amount ? (threshold + ' · ' + amount) : threshold;
				} else if (item.coupon_type === 'discount') {
					var parts = [];
					var min = item.min_consume || rules.min_amount;
					if (min > 0) parts.push('满' + this.formatFen(min) + '元可用');
					var max = rules.max_discount;
					if (max > 0) parts.push('最高减' + this.formatFen(max) + '元');
					if (parts.length === 0) parts.push('无门槛');
					return parts.join(' · ');
				} else if (item.coupon_type === 'gift') {
					var val = rules.gift_value;
					if (val) return '价值' + val + '积分';
					return '';
				}
				return '';
			},
			getCouponValidText(item) {
				if (item.validity_days) return '领取后' + item.validity_days + '天有效';
				if (item.end_time) return '有效期至 ' + this.shortDate(item.end_time);
				return '永久有效';
			},
			getCouponExpireText(item) {
				if (item.status === 0) return '有效期至 ' + (item.expire_time ? this.shortDate(item.expire_time) : '永久');
				if (item.status === 1) return '已于 ' + (item.used_time ? this.shortDate(item.used_time) : '近期') + ' 使用';
				if (item.status === 2) return '已过期';
				return '';
			},
			shortDate(value) {
				if (!value) return '';
				return String(value).substring(0, 10);
			},
		},
	};
</script>

<style lang="scss">
$primary: #FF8C42;
$primary-light: #FFB5A7;
$sky: #81D4FA;
$sky-light: #B3E5FC;
$grass: #A5D6A7;
$grass-dark: #81C784;
$bg: #FFF8F0;
$text: #5C4B3A;
$text-light: #A08B7A;
$text-muted: #C4B5A5;
$card-bg: #FFF;

page {
	background: $bg;
}
.page-wrapper {
	min-height: 100vh;
	display: flex;
	flex-direction: column;
}

/* ===== 顶部 ===== */
.sky-header {
	position: relative;
	background: linear-gradient(180deg, #FFF0E0 0%, #FFF5EC 50%, $bg 100%);
	padding: 48rpx 32rpx 60rpx;
	text-align: center;
	overflow: hidden;
}

/* 淡淡的云朵 */
.cloud {
	position: absolute;
	background: #FFF;
	border-radius: 60rpx;
	opacity: 0.5;
	.puff {
		position: absolute;
		background: #FFF;
		border-radius: 50%;
	}
}
.cloud-1 {
	width: 120rpx;
	height: 40rpx;
	top: 24rpx;
	right: 48rpx;
	animation: float 12s ease-in-out infinite;
	.p1 { width: 48rpx; height: 48rpx; top: -22rpx; left: 14rpx; }
	.p2 { width: 40rpx; height: 40rpx; top: -16rpx; right: 18rpx; }
	.p3 { width: 32rpx; height: 32rpx; top: -8rpx; left: 46rpx; }
}
.cloud-2 {
	width: 80rpx;
	height: 28rpx;
	top: 50rpx;
	left: 40rpx;
	opacity: 0.35;
	animation: float 14s ease-in-out infinite;
	animation-delay: -5s;
	.p1 { width: 36rpx; height: 36rpx; top: -16rpx; left: 10rpx; }
	.p2 { width: 28rpx; height: 28rpx; top: -10rpx; right: 12rpx; }
}

@keyframes float {
	0%, 100% { transform: translateX(0); }
	50% { transform: translateX(16rpx); }
}

/* 标题 */
.header-content {
	position: relative;
	z-index: 2;
}
.header-title {
	font-size: 42rpx;
	font-weight: bold;
	color: $text;
	letter-spacing: 4rpx;
	display: block;
}
.header-sub {
	font-size: 24rpx;
	color: $text-light;
	margin-top: 10rpx;
	display: block;
}

.login-panel {
	margin: -24rpx 28rpx 0;
	background: $card-bg;
	border-radius: 28rpx;
	padding: 44rpx 32rpx;
	position: relative;
	z-index: 2;
	box-shadow: 0 8rpx 28rpx rgba(92,75,58,0.06);
	border: 1rpx solid rgba(255,181,167,0.24);
	display: flex;
	flex-direction: column;
	align-items: center;
}
.login-title {
	font-size: 32rpx;
	font-weight: bold;
	color: $text;
}
.login-sub {
	font-size: 24rpx;
	color: $text-light;
	margin-top: 10rpx;
	text-align: center;
	line-height: 1.5;
}
.login-btn {
	margin-top: 28rpx;
	height: 72rpx;
	line-height: 72rpx;
	padding: 0 52rpx;
	border-radius: 36rpx;
	background: linear-gradient(135deg, $primary-light, $primary);
	color: #FFF;
	font-size: 28rpx;
	font-weight: bold;
	box-shadow: 0 6rpx 18rpx rgba(255,140,66,0.22);
}

/* ===== 标签栏 ===== */
.tab-bar {
	display: flex;
	background: $card-bg;
	margin: -24rpx 28rpx 20rpx;
	padding: 8rpx;
	border-radius: 48rpx;
	box-shadow: 0 4rpx 20rpx rgba(92,75,58,0.06);
	position: relative;
	z-index: 2;
	border: 2rpx solid rgba(255,181,167,0.2);
}
.tab-item {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8rpx;
	padding: 18rpx 0;
	font-size: 26rpx;
	color: $text-light;
	border-radius: 40rpx;
	transition: all 0.25s;
	position: relative;
	&.active {
		background: linear-gradient(135deg, $primary-light, $primary);
		color: #FFF;
		font-weight: bold;
		box-shadow: 0 4rpx 16rpx rgba(255,140,66,0.25);
	}
	.tab-dot {
		background: #FFF;
		color: $primary;
		font-size: 18rpx;
		min-width: 32rpx;
		height: 32rpx;
		border-radius: 16rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 6rpx;
		font-weight: bold;
		box-shadow: 0 2rpx 4rpx rgba(0,0,0,0.1);
	}
}

/* ===== 滚动区 ===== */
.scroll-area {
	flex: 1;
	overflow: hidden;
}
.loading-box {
	padding: 120rpx 0 80rpx;
	text-align: center;
	text {
		font-size: 26rpx;
		color: $text-light;
	}
}

/* ===== 优惠券列表 ===== */
.coupon-list {
	padding: 8rpx 28rpx;
	display: flex;
	flex-direction: column;
	gap: 24rpx;
}

/* ===== 优惠券卡片 ===== */
.coupon-card {
	display: flex;
	background: $card-bg;
	border-radius: 28rpx;
	overflow: hidden;
	box-shadow: 0 8rpx 28rpx rgba(92,75,58,0.06);
	position: relative;
	transition: transform 0.2s;
	&:active { transform: scale(0.99); }
}

/* 角落小花 */
.corner-flower {
	position: absolute;
	top: 12rpx;
	right: 16rpx;
	width: 28rpx;
	height: 28rpx;
	z-index: 3;
	.petal {
		position: absolute;
		width: 10rpx;
		height: 10rpx;
		background: $primary-light;
		border-radius: 50%;
		&:nth-child(1) { top: 0; left: 9rpx; }
		&:nth-child(2) { bottom: 4rpx; left: 2rpx; }
		&:nth-child(3) { bottom: 4rpx; right: 2rpx; }
	}
	.flower-center {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 8rpx;
		height: 8rpx;
		background: #FFD54F;
		border-radius: 50%;
	}
}

/* 左侧金额区 */
.card-left {
	width: 200rpx;
	background: linear-gradient(160deg, #FFF0E0 0%, $primary 100%);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 32rpx 16rpx;
	flex-shrink: 0;
	position: relative;
	.left-value {
		display: flex;
		align-items: baseline;
		gap: 4rpx;
	}
	.left-unit {
		font-size: 24rpx;
		color: rgba(255,255,255,0.9);
		font-weight: 500;
	}
	.left-num {
		font-size: 52rpx;
		font-weight: bold;
		color: #FFF;
		line-height: 1.1;
		text-shadow: 0 2rpx 4rpx rgba(0,0,0,0.08);
	}
	.left-rule {
		font-size: 20rpx;
		color: rgba(255,255,255,0.9);
		margin-top: 10rpx;
		padding: 4rpx 12rpx;
		background: rgba(255,255,255,0.2);
		border-radius: 12rpx;
	}
}

/* 中间撕票线 */
.card-gap {
	width: 24rpx;
	position: relative;
	background: $bg;
	flex-shrink: 0;
	.gap-dot {
		position: absolute;
		left: 50%;
		transform: translateX(-50%);
		width: 24rpx;
		height: 24rpx;
		background: $bg;
		border-radius: 50%;
		&.top { top: -12rpx; }
		&.bottom { bottom: -12rpx; }
	}
	.gap-line {
		position: absolute;
		top: 16rpx;
		bottom: 16rpx;
		left: 50%;
		transform: translateX(-50%);
		width: 0;
		border-left: 2rpx dashed #E0D5CC;
	}
}

/* 右侧信息区 */
.card-right {
	flex: 1;
	padding: 24rpx 24rpx 24rpx 16rpx;
	display: flex;
	flex-direction: column;
	gap: 8rpx;
	.right-header {
		display: flex;
		align-items: center;
		gap: 12rpx;
		flex-wrap: wrap;
	}
	.right-name {
		font-size: 30rpx;
		font-weight: bold;
		color: $text;
	}
	.right-tag {
		font-size: 20rpx;
		color: $primary;
		background: rgba(255,140,66,0.08);
		padding: 4rpx 12rpx;
		border-radius: 12rpx;
		border: 1rpx solid rgba(255,140,66,0.15);
	}
	.right-desc {
		font-size: 22rpx;
		color: $text-light;
		line-height: 1.5;
	}
	.right-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: auto;
		padding-top: 12rpx;
	}
	.right-expire {
		font-size: 20rpx;
		color: $text-muted;
		&.used { color: $grass-dark; }
		&.expired { color: $primary; }
	}
	.right-btn {
		margin: 0;
		padding: 0;
		width: 124rpx;
		height: 54rpx;
		line-height: 54rpx;
		background: linear-gradient(135deg, $primary-light, $primary);
		color: #FFF;
		font-size: 24rpx;
		font-weight: bold;
		border-radius: 28rpx;
		text-align: center;
		box-shadow: 0 4rpx 12rpx rgba(255,140,66,0.25);
		&[disabled] {
			background: #DDD;
			box-shadow: none;
		}
		&::after { border: none; }
	}
	.use-btn {
		min-width: 104rpx;
		height: 52rpx;
		line-height: 52rpx;
		border-radius: 26rpx;
		text-align: center;
		background: #FFF3E8;
		color: $primary;
		font-size: 23rpx;
		font-weight: bold;
		border: 1rpx solid rgba(255,140,66,0.22);
	}
}

/* 已使用 / 已过期 状态 */
.coupon-card.used {
	.card-left {
		background: linear-gradient(160deg, #E8E0D8 0%, #C8BFB5 100%);
	}
	.card-right .right-name,
	.card-right .right-desc,
	.card-right .right-expire {
		color: $text-muted;
	}
	.corner-flower .petal { background: #DDD; }
	.corner-flower .flower-center { background: #CCC; }
}
.coupon-card.expired {
	.card-left {
		background: linear-gradient(160deg, #E8E0D8 0%, #C8BFB5 100%);
	}
	.card-right .right-name,
	.card-right .right-desc,
	.card-right .right-expire {
		color: $text-muted;
	}
	.corner-flower .petal { background: #DDD; }
	.corner-flower .flower-center { background: #CCC; }
}

/* 水印 */
.watermark {
	position: absolute;
	top: 50%;
	right: 50rpx;
	transform: translateY(-50%) rotate(-18deg);
	border: 4rpx solid $text-muted;
	border-radius: 16rpx;
	padding: 8rpx 20rpx;
	opacity: 0.3;
	text {
		font-size: 30rpx;
		font-weight: bold;
		color: $text-muted;
		letter-spacing: 4rpx;
	}
	&.expired {
		border-color: $primary;
		opacity: 0.2;
		text { color: $primary; }
	}
}

/* ===== 空状态 ===== */
.empty-box {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 100rpx 0 60rpx;
}
.empty-cloud {
	position: relative;
	width: 120rpx;
	height: 48rpx;
	background: #FFF;
	border-radius: 60rpx;
	margin-bottom: 32rpx;
	opacity: 0.7;
	box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.05);
	.puff {
		position: absolute;
		background: #FFF;
		border-radius: 50%;
	}
	.p1 { width: 50rpx; height: 50rpx; top: -22rpx; left: 12rpx; }
	.p2 { width: 40rpx; height: 40rpx; top: -16rpx; right: 15rpx; }
	.p3 { width: 32rpx; height: 32rpx; top: -8rpx; left: 45rpx; }
}
.empty-title {
	font-size: 32rpx;
	font-weight: bold;
	color: $text-light;
	margin-bottom: 8rpx;
}
.empty-sub {
	font-size: 24rpx;
	color: $text-muted;
}
</style>
