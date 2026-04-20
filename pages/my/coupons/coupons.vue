<template>
	<view class="page-wrapper">
		<!-- 顶部 -->
		<view class="top-bar">
			<text class="top-title">我的优惠券</text>
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
		<view class="section" v-if="tabIndex === 0">
			<view class="section-title">
				<text class="section-emoji">🎁</text>
				<text class="section-text">可领取优惠券</text>
			</view>
			<view
					:class="['coupon-card', { used: item.status === 1, expired: item.status === 2 }]"
					v-for="(item, idx) in availableList"
					:key="idx"
				>
					<view class="coupon-left">
						<view class="coupon-value">
							<text class="value-num">{{ getCouponValue(item) }}</text>
							<text class="value-unit">{{ getCouponUnit(item) }}</text>
						</view>
						<text class="coupon-desc">{{ getCouponDesc(item) }}</text>
					</view>
					<view class="coupon-right">
						<text class="coupon-name">{{ item.name }}</text>
						<text class="coupon-desc-mkt" v-if="item.description">{{ item.description }}</text>
						<text class="coupon-expire" v-if="item.validity_days">领取后{{ item.validity_days }}天有效</text>
						<text class="coupon-expire" v-else>有效期至 {{ item.end_time ? item.end_time.substring(0,10) : '无限' }}</text>
						<button
							class="coupon-btn"
							v-if="!item.user_received"
							:disabled="item.remaining_count === 0"
							@click="receiveCoupon(item)"
						>
							{{ item.remaining_count === 0 ? '已领完' : '立即领取' }}
						</button>
						<text class="coupon-received" v-else>已领取</text>
					</view>
				</view>
			</view>
			<view class="empty-tip" v-else>
				<text>暂无优惠券可领取</text>
			</view>
		</view>

		<!-- 我的优惠券列表 -->
		<scroll-view class="my-coupon-list" scroll-y v-if="myCoupons.length > 0">
			<view
				:class="['coupon-item', { used: item.status === 1, expired: item.status === 2 }]"
				v-for="(item, idx) in myCoupons"
				:key="idx"
			>
				<view class="item-left">
					<view class="item-value">
						<text class="item-rmb">¥</text>
						<text class="item-num">{{ getCouponValue(item) }}</text>
					</view>
					<text class="item-condition" v-if="item.coupon_type !== 'rebate' && item.min_consume > 0">满{{ item.min_consume / 100 }}元可用</text>
					<text class="item-condition" v-else>无门槛</text>
				</view>
				<view class="item-right">
					<text class="item-name">{{ item.name }}</text>
					<text class="item-desc-mkt" v-if="item.description">{{ item.description }}</text>
					<text class="item-desc">{{ getCouponDesc(item) }}</text>
					<text class="item-expire" v-if="item.status === 0">有效期至 {{ item.expire_time ? item.expire_time.substring(0,10) : '永久' }}</text>
					<text class="item-status-text" v-if="item.status === 1">已使用</text>
					<text class="item-status-text expired" v-if="item.status === 2">已过期</text>
				</view>
				<view class="item-stamp" v-if="item.status === 1">
					<text>已使用</text>
				</view>
				<view class="item-stamp expired" v-if="item.status === 2">
					<text>已过期</text>
				</view>
			</view>
		</scroll-view>

		<!-- 空状态 -->
		<view class="empty-state" v-if="myCoupons.length === 0 && tabIndex !== 0">
			<text class="empty-icon">{{ emptyIcon }}</text>
			<text class="empty-text">{{ emptyText }}</text>
		</view>
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
						// 更新可领取数量
						var unused = this.availableList.filter(function(item) { return !item.user_received; });
						this.tabs[0].count = unused.length;
					}
				} catch (e) {
					console.error('加载优惠券失败:', e);
				}
			},
			async loadMyCoupons() {
				if (this.tabIndex === 0) {
					// tab 0 不走这里，loadAvailable 已经处理了可领取列表
					this.myCoupons = [];
					return;
				}
				var statusMap = { 0: null, 1: 0, 2: 1, 3: 2 };
				var status = statusMap[this.tabIndex];
				try {
					var res = await AUTH.getMyCoupons(this.token, status);
					if (res._status === 0) {
						this.myCoupons = res.data || [];
						// 更新各tab数量
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
					return Math.round(rate * 10) / 10 + '折';
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
					var threshold = min > 0 ? ('满' + min / 100 + '元' + '可用') : '无门槛';
					var amount = discount > 0 ? ('立减' + discount / 100 + '元') : '';
					return amount ? (threshold + ' | ' + amount) : threshold;
				} else if (item.coupon_type === 'discount') {
					var parts = [];
					var min = rules.min_amount;
					if (min > 0) parts.push('满' + min / 100 + '元' + '可用');
					var max = rules.max_discount;
					if (max > 0) parts.push('最高减' + max / 100 + '元');
					if (parts.length === 0) parts.push('无门槛');
					return parts.join(' | ');
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
page {
	background: #FFF9F5;
}
.page-wrapper {
	min-height: 100vh;
	padding-bottom: 40rpx;
}

/* ===== 顶部 ===== */
.top-bar {
	background: linear-gradient(135deg, #FF9ECD 0%, #FF6B9D 100%);
	padding: 60rpx 32rpx 24rpx;
	text-align: center;
	.top-title { font-size: 36rpx; font-weight: bold; color: #FFF; letter-spacing: 2rpx; }
}

/* ===== 标签栏 ===== */
.tab-bar {
	display: flex;
	background: #FFF;
	padding: 0 16rpx;
	position: sticky;
	top: 0;
	z-index: 10;
	box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}
.tab-item {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8rpx;
	padding: 24rpx 0;
	position: relative;
	font-size: 28rpx;
	color: #999;
	&.active { color: #FF6B9D; font-weight: bold; }
	&.active::after {
		content: '';
		position: absolute;
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 48rpx;
		height: 4rpx;
		background: #FF6B9D;
		border-radius: 4rpx;
	}
	.tab-dot {
		background: #FF6B9D;
		color: #FFF;
		font-size: 18rpx;
		min-width: 36rpx;
		height: 36rpx;
		border-radius: 18rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 8rpx;
	}
}

/* ===== 区块标题 ===== */
.section {
	padding: 24rpx;
}
.section-title {
	display: flex;
	align-items: center;
	gap: 12rpx;
	margin-bottom: 20rpx;
	.section-emoji { font-size: 36rpx; }
	.section-text { font-size: 32rpx; font-weight: bold; color: #333; }
}

/* ===== 可领优惠券列表 ===== */
.coupon-list {
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}
.coupon-card {
	display: flex;
	background: #FFF;
	border-radius: 20rpx;
	overflow: hidden;
	box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
}
.coupon-left {
	width: 220rpx;
	background: linear-gradient(135deg, #FF9ECD, #FF6B9D);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 24rpx 16rpx;
	.coupon-value { display: flex; align-items: baseline; gap: 4rpx; }
	.value-num { font-size: 52rpx; font-weight: bold; color: #FFF; }
	.value-unit { font-size: 24rpx; color: rgba(255,255,255,0.8); }
	.coupon-desc { font-size: 20rpx; color: rgba(255,255,255,0.8); margin-top: 8rpx; }
	.coupon-desc-mkt {
		background: linear-gradient(135deg, #FF9ECD 0%, #FF6B9D 100%);
		color: #FFF;
		font-size: 22rpx;
		padding: 6rpx 16rpx;
		border-radius: 20rpx;
		margin-top: 6rpx;
		display: inline-block;
		max-width: 100%;
		word-break: break-all;
		line-height: 1.4;
	}
}
.coupon-right {
	flex: 1;
	padding: 20rpx 24rpx;
	display: flex;
	flex-direction: column;
	gap: 8rpx;
	.coupon-name { font-size: 28rpx; font-weight: bold; color: #333; }
	.coupon-expire { font-size: 22rpx; color: #999; margin-top: auto; }
	.coupon-btn {
		margin: 8rpx 0 0;
		padding: 0;
		font-size: 24rpx;
		background: linear-gradient(135deg, #FF9ECD, #FF6B9D);
		color: #FFF;
		border-radius: 40rpx;
		line-height: 2.2;
		text-align: center;
		&[disabled] { background: #CCC; color: #FFF; }
		&::after { border: none; }
	}
	.coupon-received {
		font-size: 24rpx;
		color: #999;
		margin-top: 8rpx;
	}
}

/* ===== 我的优惠券列表 ===== */
.my-coupon-list {
	padding: 24rpx;
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}
.coupon-item {
	display: flex;
	background: #FFF;
	border-radius: 20rpx;
	overflow: hidden;
	position: relative;
	box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
	margin-bottom: 20rpx;
	&.used { opacity: 0.6; }
	&.expired { opacity: 0.5; }
}
.item-left {
	width: 200rpx;
	background: linear-gradient(135deg, #FF9ECD, #FF6B9D);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 24rpx 16rpx;
	.item-value { display: flex; align-items: baseline; gap: 4rpx; }
	.item-rmb { font-size: 24rpx; color: #FFF; }
	.item-num { font-size: 44rpx; font-weight: bold; color: #FFF; }
	.item-condition { font-size: 20rpx; color: rgba(255,255,255,0.8); margin-top: 8rpx; }
}
.item-right {
	flex: 1;
	padding: 20rpx 24rpx;
	display: flex;
	flex-direction: column;
	gap: 6rpx;
	.item-name { font-size: 28rpx; font-weight: bold; color: #333; }
	.item-desc { font-size: 22rpx; color: #999; }
	.item-desc-mkt {
		background: linear-gradient(135deg, #FF9ECD 0%, #FF6B9D 100%);
		color: #FFF;
		font-size: 22rpx;
		padding: 6rpx 16rpx;
		border-radius: 20rpx;
		margin-top: 6rpx;
		display: inline-block;
		max-width: 100%;
		word-break: break-all;
		line-height: 1.4;
	}
	.item-expire { font-size: 22rpx; color: #999; margin-top: auto; }
	.item-status-text { font-size: 24rpx; color: #52C41A; font-weight: bold; margin-top: auto; }
	.item-status-text.expired { color: #FF6B6B; }
}
.item-stamp {
	position: absolute;
	top: 50%;
	right: 32rpx;
	transform: translateY(-50%) rotate(-15deg);
	border: 6rpx solid #52C41A;
	border-radius: 12rpx;
	padding: 8rpx 16rpx;
	text { font-size: 28rpx; font-weight: bold; color: #52C41A; }
	&.expired {
		border-color: #FF6B6B;
		text { color: #FF6B6B; }
	}
}

/* ===== 空状态 ===== */
.empty-state {
	padding: 120rpx 0;
	text-align: center;
	.empty-icon { font-size: 100rpx; display: block; margin-bottom: 16rpx; }
	.empty-text { font-size: 28rpx; color: #999; }
}
.empty-tip {
	text-align: center;
	padding: 60rpx 0;
	font-size: 26rpx;
	color: #999;
}
</style>
