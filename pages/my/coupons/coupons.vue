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

		<!-- 标签 -->
		<view class="tab-bar">
			<view
				class="tab-item"
				v-for="(tab, idx) in tabs"
				:key="idx"
				:class="{ active: tabIndex === idx }"
				@click="tabIndex = idx; loadMyCoupons()"
			>
				<text>{{ tab.name }}</text>
				<view class="tab-dot" v-if="tab.count > 0">{{ tab.count }}</view>
			</view>
		</view>

		<!-- 可领优惠券 -->
		<scroll-view class="scroll-area" scroll-y v-if="tabIndex === 0">
			<view class="coupon-list" v-if="availableList.length > 0">
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
							<text class="left-unit">{{ getCouponUnit(item) === '积分' ? '' : '¥' }}</text>
							<text class="left-num">{{ getCouponValue(item) }}</text>
						</view>
						<text class="left-rule" v-if="item.min_consume > 0">满{{ item.min_consume / 100 }}元可用</text>
						<text class="left-rule" v-else>无门槛</text>
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
						<text class="right-desc">{{ getCouponDesc(item) }}</text>
						<view class="right-footer">
							<text class="right-expire" v-if="item.validity_days">领取后{{ item.validity_days }}天有效</text>
							<text class="right-expire" v-else>有效期至 {{ item.end_time ? item.end_time.substring(0,10) : '永久' }}</text>
							<button
								class="right-btn"
								v-if="!item.user_received"
								:disabled="item.remaining_count === 0"
								@click="receiveCoupon(item)"
							>
								{{ item.remaining_count === 0 ? '已领完' : '领取' }}
							</button>
							<text class="right-status received" v-else>已领取</text>
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
				<text class="empty-title">森林里还没有优惠券</text>
				<text class="empty-sub">过段时间再来看看吧～</text>
			</view>
			<view style="height: 40rpx;"></view>
		</scroll-view>

		<!-- 我的优惠券列表 -->
		<scroll-view class="scroll-area" scroll-y v-if="tabIndex !== 0">
			<view class="coupon-list" v-if="myCoupons.length > 0">
				<view
					:class="['coupon-card', { used: item.status === 1, expired: item.status === 2 }]"
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
							<text class="left-unit">{{ getCouponUnit(item) === '积分' ? '' : '¥' }}</text>
							<text class="left-num">{{ getCouponValue(item) }}</text>
						</view>
						<text class="left-rule" v-if="item.min_consume > 0">满{{ item.min_consume / 100 }}元可用</text>
						<text class="left-rule" v-else>无门槛</text>
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
						<text class="right-desc">{{ getCouponDesc(item) }}</text>
						<view class="right-footer">
							<text class="right-expire" v-if="item.status === 0">有效期至 {{ item.expire_time ? item.expire_time.substring(0,10) : '永久' }}</text>
							<text class="right-expire used" v-if="item.status === 1">已于 {{ item.used_time ? item.used_time.substring(0,10) : '近期' }} 使用</text>
							<text class="right-expire expired" v-if="item.status === 2">已过期</text>
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
				<text class="empty-title">{{ emptyText }}</text>
				<text class="empty-sub">去森林里逛逛，没准能发现新券哦</text>
			</view>
			<view style="height: 40rpx;"></view>
		</scroll-view>
	</view>
</template>

<script>
	import { mapState, mapActions } from 'vuex';
	import AUTH from '../../../utils/auth.js';

	export default {
		computed: {
			...mapState(['hasLogin', 'token']),
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
				emptyIcon: '🎫',
				emptyText: '暂无优惠券',
			};
		},
		onShow() {
			if (this.hasLogin) {
				this.loadAvailable();
				this.loadMyCoupons();
			}
		},
		methods: {
			...mapActions(['getUserInfo']),
			async loadAvailable() {
				try {
					var res = await AUTH.getCouponList(this.token);
					if (res._status === 0) {
						this.availableList = res.data || [];
						var unused = this.availableList.filter(function(item) { return !item.user_received; });
						this.tabs[0].count = unused.length;
					}
				} catch (e) {
					console.error('加载优惠券失败:', e);
				}
			},
			async loadMyCoupons() {
				if (this.tabIndex === 0) {
					this.myCoupons = [];
					return;
				}
				var statusMap = { 0: null, 1: 0, 2: 1, 3: 2 };
				var status = statusMap[this.tabIndex];
				try {
					var res = await AUTH.getMyCoupons(this.token, status);
					if (res._status === 0) {
						this.myCoupons = res.data || [];
						this.updateTabCounts();
					}
				} catch (e) {
					console.error('加载我的优惠券失败:', e);
				}
			},
			async updateTabCounts() {
				try {
					var res = await AUTH.getMyCoupons(this.token);
					if (res._status === 0) {
						var all = res.data || [];
						var unused = all.filter(function(item) { return item.status === 0; });
						var used = all.filter(function(item) { return item.status === 1; });
						var expired = all.filter(function(item) { return item.status === 2; });
						this.tabs[1].count = unused.length;
						this.tabs[2].count = used.length;
						this.tabs[3].count = expired.length;
					}
				} catch (e) {}
			},
			async receiveCoupon(item) {
				if (item.remaining_count === 0) return;
				uni.showLoading({ title: '领取中...' });
				try {
					var res = await AUTH.receiveCoupon(this.token, item.campaign_id);
					uni.hideLoading();
					if (res._status === 0) {
						uni.showToast({ title: '领取成功', icon: 'success' });
						item.user_received = true;
						this.tabs[0].count--;
						this.tabs[1].count++;
						this.loadMyCoupons();
					} else {
						uni.showToast({ title: res._reason || '领取失败', icon: 'none' });
					}
				} catch (e) {
					uni.hideLoading();
					uni.showToast({ title: '领取失败', icon: 'none' });
				}
			},
			getCouponValue(item) {
				var rules = item.rules || {};
				if (item.coupon_type === 'rebate') {
					return (rules.discount || 0) / 100;
				} else if (item.coupon_type === 'discount') {
					var rate = rules.discount_rate || 1;
					return Math.round(rate * 100) / 10 + '折';
				}
				return rules.gift_value || '-';
			},
			getCouponUnit(item) {
				if (item.coupon_type === 'rebate') return '元';
				if (item.coupon_type === 'discount') return '';
				return '积分';
			},
			getCouponDesc(item) {
				var rules = item.rules || {};
				if (item.coupon_type === 'rebate') {
					var min = rules.min_amount || 0;
					var discount = rules.discount || 0;
					var threshold = min > 0 ? ('满' + min / 100 + '元可用') : '无门槛';
					var amount = discount > 0 ? ('立减' + discount / 100 + '元') : '';
					return amount ? (threshold + ' · ' + amount) : threshold;
				} else if (item.coupon_type === 'discount') {
					var parts = [];
					var min = rules.min_amount;
					if (min > 0) parts.push('满' + min / 100 + '元可用');
					var max = rules.max_discount;
					if (max > 0) parts.push('最高减' + max / 100 + '元');
					if (parts.length === 0) parts.push('无门槛');
					return parts.join(' · ');
				} else if (item.coupon_type === 'gift') {
					var val = rules.gift_value;
					if (val) return '价值' + val + '积分';
					return '';
				}
				return '';
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
		padding: 0;
		width: 120rpx;
		line-height: 2.2;
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
	.right-status {
		font-size: 24rpx;
		font-weight: bold;
		&.received { color: $grass-dark; }
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
