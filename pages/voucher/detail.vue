<template>
	<view class="page-wrapper" v-if="currentGoods">
		<!-- 顶部天空 -->
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

			<view class="header-content">
				<view class="back-btn" @click="goBack">
					<text class="back-arrow">←</text>
					<text class="back-text">返回</text>
				</view>
				<view class="emoji-ring">
					<text class="goods-emoji">{{ goodsEmoji }}</text>
				</view>
				<text class="header-title">{{ currentGoods.name }}</text>
			</view>
		</view>

		<!-- 商品信息卡片 -->
		<view class="info-card">
			<view class="tag-row">
				<view class="tag" :class="exchangeClass">{{ exchangeLabel }}</view>
			</view>
			<view class="info-row">
				<text class="info-label">可用范围</text>
				<text class="info-value">到店出示订单即可使用</text>
			</view>
			<view class="info-row">
				<text class="info-label">有效期</text>
				<text class="info-value">{{ formatDate(currentGoods.validity_period_start) }} ~ {{ formatDate(currentGoods.validity_period_end) }}</text>
			</view>
			<view class="info-row" v-if="currentGoods.description">
				<text class="info-label">详情</text>
				<text class="info-value">{{ currentGoods.description }}</text>
			</view>
			<view class="info-row" v-if="currentGoods.stock >= 0">
				<text class="info-label">库存</text>
				<text class="info-value" :class="{ short: currentGoods.stock < 5 }">{{ currentGoods.stock }} 件</text>
			</view>
			<view class="info-row" v-if="(currentGoods.member_level_required || 0) > 0">
				<text class="info-label">兑换门槛</text>
				<text class="info-value">{{ getMemberLevelName(currentGoods.member_level_required) }} 及以上</text>
			</view>
			<view class="info-row" v-if="(currentGoods.max_buy_per_user || 0) > 0">
				<text class="info-label">限购</text>
				<text class="info-value short">
					<text v-if="currentGoods.max_buy_period === 'month'">每人每月限购{{ currentGoods.max_buy_per_user }}张（本月已购{{ userBoughtCount }}张）</text>
					<text v-else-if="currentGoods.max_buy_period === 'week'">每人每周限购{{ currentGoods.max_buy_per_user }}张（本周已购{{ userBoughtCount }}张）</text>
					<text v-else-if="currentGoods.max_buy_period === 'day'">每人每日限购{{ currentGoods.max_buy_per_user }}张（今日已购{{ userBoughtCount }}张）</text>
					<text v-else>每人限购{{ currentGoods.max_buy_per_user }}张（已购{{ userBoughtCount }}张）</text>
				</text>
			</view>
		</view>

		<!-- 费用明细 -->
		<view class="price-card">
			<view class="price-title">🍄 费用明细</view>

			<!-- 纯积分兑换 -->
			<block v-if="currentGoods.exchange_type === 2">
				<view class="price-row">
					<text class="row-label">所需积分</text>
					<text class="row-value points">{{ currentGoods.points_price || 0 }} 积分</text>
				</view>
				<view class="price-row">
					<text class="row-label">我的积分</text>
					<text class="row-value" :class="{ short: !pointsEnough }">{{ userInfo.points || 0 }} 积分</text>
				</view>
				<view class="hint-row" v-if="!pointsEnough">
					<text class="hint-text">积分不够啦～多来店里玩，签到也能攒积分哦 🌱</text>
				</view>
			</block>

			<!-- 积分+现金混合 -->
			<block v-else-if="currentGoods.exchange_type === 3">
				<view class="price-row">
					<text class="row-label">商品原价</text>
					<text class="row-value">¥{{ (currentGoods.price / 100).toFixed(2) }}</text>
				</view>
				<view class="price-row">
					<text class="row-label">积分抵扣</text>
					<view class="row-value">
						<text class="points-deduct">{{ currentGoods.points_price || 0 }} 积分</text>
						<text class="deduct-amount">-¥{{ pointsDiscountMoney }}</text>
					</view>
				</view>
				<view class="price-row final">
					<text class="row-label">实付金额</text>
					<text class="row-value final-price">¥{{ actualPrice }}</text>
				</view>
			</block>

			<!-- 纯现金 -->
			<block v-else>
				<view class="price-row">
					<text class="row-label">商品金额</text>
					<text class="row-value">¥{{ (currentGoods.price / 100).toFixed(2) }}</text>
				</view>

				<!-- 余额支付开关（仅现金商品且支持余额支付时显示） -->
				<view class="balance-row" v-if="canUseBalance">
					<view class="balance-left">
						<text class="balance-icon">💰</text>
						<view class="balance-info">
							<text class="balance-label">使用余额支付</text>
							<text class="balance-hint">当前余额 ¥{{ (userInfo.account_balance / 100).toFixed(2) }}</text>
						</view>
					</view>
					<view class="toggle-wrap" @click="toggleBalance">
						<view class="toggle" :class="{ on: useBalance }">
							<view class="toggle-dot"></view>
						</view>
					</view>
				</view>
				<view class="hint-row" v-if="canUseBalance && !balanceEnough">
					<text class="hint-text">余额不足，仍需微信支付 ¥{{ actualPrice }}</text>
				</view>

				<view class="price-row final">
					<text class="row-label">实付金额</text>
					<text class="row-value final-price">¥{{ actualPrice }}</text>
				</view>
			</block>
		</view>

		<!-- 底部按钮 -->
		<view class="footer">
			<view class="price-content">
				<block v-if="currentGoods.exchange_type === 2">
					<text class="price-tip">需</text>
					<text class="price">{{ currentGoods.points_price || 0 }}</text>
					<text class="price-unit">积分</text>
				</block>
				<block v-else>
					<text>实付款</text>
					<text class="price-tip">¥</text>
					<text class="price">{{ actualPrice }}</text>
				</block>
			</view>
			<view
				class="submit-btn"
				:class="{ disabled: submitDisabled }"
				@click="handleSubmit"
			>
				<text v-if="(currentGoods.max_buy_per_user || 0) > 0 && userBoughtCount >= currentGoods.max_buy_per_user">🔒 已达上限</text>
				<text v-else-if="currentGoods.exchange_type === 2">✨ 立即兑换</text>
				<text v-else-if="useBalance && balanceEnough">💰 余额支付</text>
				<text v-else>🍄 确认订单</text>
			</view>
		</view>
	</view>
</template>

<script>
import { mapState, mapActions } from 'vuex';
import AUTH from '../../utils/auth.js';

export default {
	computed: {
		...mapState(['hasLogin', 'userInfo', 'token', 'constance']),
		actualPrice() {
			if (!this.currentGoods) return '0.00';
			if (this.currentGoods.exchange_type === 2) {
				return '0.00';
			}
			if (this.currentGoods.exchange_type === 3) {
				var price = this.currentGoods.price || 0;
				var pointsPrice = this.currentGoods.points_price || 0;
				var pointsToFen = (this.userInfo.points_config && this.userInfo.points_config.points_to_fen) || 1;
				var discount = Math.min(price, pointsPrice * pointsToFen);
				return ((price - discount) / 100).toFixed(2);
			}
			// 现金商品 + 余额全额支付
			if (this.useBalance && this.balanceEnough) {
				return '0.00';
			}
			return ((this.currentGoods.price || 0) / 100).toFixed(2);
		},
		pointsDiscountMoney() {
			if (!this.currentGoods || this.currentGoods.exchange_type !== 3) return '0.00';
			var pointsPrice = this.currentGoods.points_price || 0;
			var pointsToFen = (this.userInfo.points_config && this.userInfo.points_config.points_to_fen) || 1;
			var discount = Math.min(this.currentGoods.price || 0, pointsPrice * pointsToFen);
			return (discount / 100).toFixed(2);
		},
		pointsEnough() {
			if (!this.currentGoods || this.currentGoods.exchange_type !== 2) return true;
			return (this.userInfo.points || 0) >= (this.currentGoods.points_price || 0);
		},
		balanceEnough() {
			if (!this.currentGoods || this.currentGoods.exchange_type !== 1) return false;
			return (this.userInfo.account_balance || 0) >= (this.currentGoods.price || 0);
		},
		canUseBalance() {
			if (!this.currentGoods) return false;
			return this.currentGoods.exchange_type === 1 && this.currentGoods.can_use_balance;
		},
		goodsEmoji() {
			if (!this.currentGoods) return '🎁';
			const typeEmojis = {
				1: '💎',
				2: '🍿',
				3: '🎈',
				4: '🎲',
				5: '🎁',
			};
			return typeEmojis[this.currentGoods.goods_type] || '🎁';
		},
		exchangeLabel() {
			if (!this.currentGoods) return '';
			const map = { 1: '💰 现金购买', 2: '🌟 纯积分兑换', 3: '🌟 积分+现金' };
			return map[this.currentGoods.exchange_type] || '购买';
		},
		exchangeClass() {
			if (!this.currentGoods) return '';
			const map = { 1: 'cash', 2: 'points', 3: 'mixed' };
			return map[this.currentGoods.exchange_type] || 'cash';
		},
		submitDisabled() {
			if (!this.currentGoods) return true;
			// 限购预拦截
			if ((this.currentGoods.max_buy_per_user || 0) > 0 && this.userBoughtCount >= this.currentGoods.max_buy_per_user) {
				return true;
			}
			if (this.currentGoods.exchange_type === 2) {
				return !this.pointsEnough;
			}
			// 现金商品：如果选择余额支付但余额不足，则禁用
			if (this.currentGoods.exchange_type === 1 && this.useBalance && !this.balanceEnough) {
				return true;
			}
			return false;
		},
	},
	data() {
		return {
			currentGoods: null,
			useBalance: false,
			userBoughtCount: 0,
		};
	},
	onLoad(option) {
		try {
			if (option.data) {
				this.currentGoods = JSON.parse(decodeURIComponent(option.data));
				this.userBoughtCount = this.currentGoods.user_bought_count || 0;
			}
		} catch (e) {
			console.error('商品数据解析失败', e);
			uni.showToast({ title: '商品数据异常', icon: 'none' });
		}
	},
	methods: {
		...mapActions(['loginAndRegister', 'getUserInfo']),

		goBack() {
			uni.navigateBack();
		},

		toggleBalance() {
			if (!this.canUseBalance) return;
			this.useBalance = !this.useBalance;
		},

		formatDate(d) {
			if (!d) return '无期限';
			if (typeof d === 'string' && d.length >= 10) return d.substring(0, 10);
			return d;
		},

		getMemberLevelName(level) {
			const names = ['普通会员', '青铜', '白银', '黄金', '钻石'];
			return names[level] || ('Lv.' + level);
		},

		handleSubmit() {
			let goods = this.currentGoods;
			if (goods.validity_period_start && goods.validity_period_end) {
				var startDate = new Date(goods.validity_period_start);
				var endDate = new Date(goods.validity_period_end);
				var today = new Date();
				if (today.getTime() < startDate.getTime()) {
					uni.showToast({ title: '该商品还未到有效期间', duration: 2000, icon: 'none' });
					return;
				}
				if (today.getTime() > endDate.getTime()) {
					uni.showToast({ title: '该商品已经过了有效期间', duration: 2000, icon: 'none' });
					return;
				}
			}

			// 纯积分兑换
			if (goods.exchange_type === 2) {
				if (!this.pointsEnough) {
					uni.showToast({ title: '积分不足', icon: 'none' });
					return;
				}
				uni.showLoading({ title: '兑换中...' });
				var param = {
					order_type: 5,
					goods_id: goods.object_id,
					use_points: goods.points_price || 0,
				};
				AUTH.checkout(this.token, param).then(res => {
					uni.hideLoading();
					if (!res || res._status !== 0) {
						uni.showToast({ title: (res && res._reason) || '兑换失败', icon: 'none' });
						return;
					}
					uni.showModal({
						title: '✨ 兑换成功',
						content: `已成功兑换「${goods.name}」，可在订单列表查看`,
						showCancel: false,
						success: () => {
							this.getUserInfo();
							uni.switchTab({ url: '/pages/order/order' });
						},
					});
				}).catch(() => {
					uni.hideLoading();
					uni.showToast({ title: '兑换失败', icon: 'none' });
				});
				return;
			}

			// 现金购买 或 积分+现金混合
			uni.showLoading({ title: '创建订单中...' });
			var param = { order_type: 3, goods_id: goods.object_id };
			if (goods.exchange_type === 3 && goods.points_price) {
				param.use_points = goods.points_price;
			}
			// 余额支付
			if (goods.exchange_type === 1 && this.useBalance) {
				param.use_balance = true;
			}
			AUTH.checkout(this.token, param).then(res => {
				uni.hideLoading();
				if (!res) return;
				// 余额全额支付直接返回成功
				if (res._status === 0 && res.data && res.data.order_status === 1) {
					uni.showModal({
						title: '✨ 支付成功',
						content: `已成功购买「${goods.name}」，可在订单列表查看`,
						showCancel: false,
						success: () => {
							this.getUserInfo();
							uni.switchTab({ url: '/pages/order/order' });
						},
					});
					return;
				}
				// 需要微信支付
				var url = '/pages/order/payment?parent_sn=' + res.data.order_number + '&entry=3' + '&data=' + JSON.stringify(res.data);
				uni.redirectTo({ url: url });
			}).catch(err => {
				uni.hideLoading();
				uni.showToast({ title: err || '创建订单失败', icon: 'none' });
			});
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
	padding-bottom: calc(170rpx + env(safe-area-inset-bottom));
	background-color: #FDF6E9;
	background-image: repeating-linear-gradient(
		0deg,
		transparent,
		transparent 3rpx,
		rgba(139, 90, 43, 0.025) 3rpx,
		rgba(139, 90, 43, 0.025) 6rpx
	);
}

/* ===== 天空顶部 ===== */
.sky-header {
	position: relative;
	background: linear-gradient(180deg, $sky-light 0%, $sky 40%, $bg 100%);
	padding: 24rpx 24rpx 64rpx;
	text-align: center;
	overflow: hidden;
}

.cloud {
	position: absolute;
	background: #FFF;
	border-radius: 60rpx;
	opacity: 0.6;
	.puff {
		position: absolute;
		background: #FFF;
		border-radius: 50%;
	}
}
@keyframes cloudFloat {
	0%, 100% { transform: translateX(0) translateY(0); }
	33% { transform: translateX(12rpx) translateY(-4rpx); }
	66% { transform: translateX(-6rpx) translateY(2rpx); }
}
.cloud-1 {
	width: 120rpx;
	height: 40rpx;
	top: 20rpx;
	right: 48rpx;
	animation: cloudFloat 7s ease-in-out infinite;
	.p1 { width: 48rpx; height: 48rpx; top: -22rpx; left: 14rpx; }
	.p2 { width: 40rpx; height: 40rpx; top: -16rpx; right: 18rpx; }
	.p3 { width: 32rpx; height: 32rpx; top: -8rpx; left: 45rpx; }
}
.cloud-2 {
	width: 80rpx;
	height: 28rpx;
	top: 48rpx;
	left: 40rpx;
	opacity: 0.4;
	animation: cloudFloat 9s ease-in-out infinite reverse;
	.p1 { width: 36rpx; height: 36rpx; top: -16rpx; left: 10rpx; }
	.p2 { width: 28rpx; height: 28rpx; top: -10rpx; right: 12rpx; }
}

.back-btn {
	display: flex;
	align-items: center;
	gap: 8rpx;
	position: absolute;
	top: 24rpx;
	left: 24rpx;
	z-index: 2;
	.back-arrow { font-size: 32rpx; color: $text; }
	.back-text { font-size: 26rpx; color: $text-light; }
}

.header-content {
	position: relative;
	z-index: 1;
	padding-top: 40rpx;
}
@keyframes gentleFloat {
	0%, 100% { transform: translateY(0); }
	50% { transform: translateY(-6rpx); }
}
.emoji-ring {
	width: 140rpx;
	height: 140rpx;
	border-radius: 50%;
	background: linear-gradient(135deg, #FFF0E0, #FFE8D6);
	display: flex;
	align-items: center;
	justify-content: center;
	margin: 0 auto 16rpx;
	box-shadow: 0 8rpx 24rpx rgba(255,140,66,0.15);
	border: 4rpx solid rgba(255,255,255,0.5);
	animation: gentleFloat 3s ease-in-out infinite;
}
@keyframes gentleWiggle {
	0%, 100% { transform: rotate(0deg) scale(1); }
	25% { transform: rotate(-4deg) scale(1.05); }
	75% { transform: rotate(4deg) scale(1.05); }
}
.goods-emoji {
	font-size: 72rpx;
	display: inline-block;
	transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
	&:active {
		animation: gentleWiggle 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
}
.header-title {
	font-size: 38rpx;
	font-weight: 700;
	color: $text;
	letter-spacing: 3rpx;
	text-shadow: 0 2rpx 4rpx rgba(160, 120, 80, 0.1);
}

/* ===== 信息卡片 ===== */
.info-card {
	margin: -32rpx 24rpx 20rpx;
	background: $card-bg;
	border-radius: 24rpx 30rpx 20rpx 32rpx / 28rpx 24rpx 34rpx 22rpx;
	border: 2rpx solid rgba(160, 120, 80, 0.12);
	padding: 28rpx;
	box-shadow: 0 12rpx 32rpx rgba(160, 120, 80, 0.08), 0 2rpx 8rpx rgba(160, 120, 80, 0.04);
	position: relative;
	z-index: 2;
	&::before {
		content: '🌿';
		position: absolute;
		top: -14rpx;
		left: -10rpx;
		font-size: 36rpx;
		transform: rotate(-20deg);
		opacity: 0.5;
		z-index: 3;
	}
}
.tag-row {
	display: flex;
	gap: 12rpx;
	margin-bottom: 20rpx;
	flex-wrap: wrap;
}
.tag {
	font-size: 22rpx;
	color: $primary;
	background: rgba(255,140,66,0.08);
	padding: 6rpx 16rpx;
	border-radius: 12rpx;
	border: 1rpx solid rgba(255,140,66,0.15);
	&.mixed { color: $grass-dark; background: rgba(165,214,167,0.15); border-color: rgba(165,214,167,0.3); }
	&.cash { color: $sky; background: rgba(129,212,250,0.15); border-color: rgba(129,212,250,0.3); }

}
.info-row {
	display: flex;
	align-items: flex-start;
	padding: 14rpx 0;
	border-bottom: 1rpx solid #F5E6D8;
	&:last-child { border-bottom: none; }
}
.info-label {
	font-size: 26rpx;
	color: $text-light;
	width: 160rpx;
	flex-shrink: 0;
}
.info-value {
	font-size: 26rpx;
	color: $text;
	flex: 1;
	&.short { color: #E53935; font-weight: bold; }
}

/* ===== 价格卡片 ===== */
.price-card {
	margin: 0 24rpx 20rpx;
	background: $card-bg;
	border-radius: 22rpx 28rpx 26rpx 24rpx / 26rpx 22rpx 28rpx 24rpx;
	border: 2rpx solid rgba(160, 120, 80, 0.12);
	padding: 28rpx;
	box-shadow: 0 12rpx 32rpx rgba(160, 120, 80, 0.08), 0 2rpx 8rpx rgba(160, 120, 80, 0.04);
	position: relative;
	&::after {
		content: '🍄';
		position: absolute;
		bottom: -12rpx;
		right: -8rpx;
		font-size: 32rpx;
		transform: rotate(15deg);
		opacity: 0.45;
		z-index: 3;
	}
}
.price-title {
	font-size: 30rpx;
	font-weight: bold;
	color: $text;
	margin-bottom: 20rpx;
}
.price-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 14rpx 0;
	border-bottom: 1rpx solid #F5E6D8;
	&:last-child { border-bottom: none; }
	&.final { margin-top: 8rpx; padding-top: 20rpx; border-top: 3rpx solid #F5E6D8; border-bottom: none; }
}
.row-label { font-size: 26rpx; color: $text-light; }
.row-value {
	font-size: 26rpx;
	color: $text;
	font-weight: 500;
	&.points { color: $primary; font-weight: bold; font-size: 30rpx; }
	&.short { color: #E53935; }
	.points-deduct { color: $grass-dark; font-weight: bold; margin-right: 8rpx; }
	.deduct-amount { color: $text-light; font-size: 22rpx; }
	&.final-price { color: $primary; font-size: 36rpx; font-weight: bold; }
}

/* 余额支付开关 */
.balance-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 20rpx 0;
	border-bottom: 1rpx solid #F5E6D8;
}
.balance-left {
	display: flex;
	align-items: center;
	gap: 16rpx;
}
.balance-icon { font-size: 40rpx; }
.balance-info {
	display: flex;
	flex-direction: column;
}
.balance-label { font-size: 28rpx; color: $text; font-weight: 500; }
.balance-hint { font-size: 22rpx; color: $text-muted; margin-top: 4rpx; }

.toggle-wrap { display: flex; justify-content: flex-end; }
.toggle {
	width: 96rpx;
	height: 52rpx;
	border-radius: 26rpx;
	background: #E8E8E8;
	position: relative;
	transition: background 0.3s;
	&.on { background: linear-gradient(135deg, $primary-light, $primary); }
	.toggle-dot {
		position: absolute;
		top: 4rpx;
		left: 4rpx;
		width: 44rpx;
		height: 44rpx;
		border-radius: 22rpx;
		background: #FFF;
		transition: left 0.3s;
		box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.15);
	}
	&.on .toggle-dot { left: 48rpx; }
}

.hint-row {
	padding: 12rpx 0;
	.hint-text { font-size: 22rpx; color: $primary; }
}

/* ===== 底部 ===== */
.footer {
	position: fixed;
	left: 0;
	bottom: 0;
	z-index: 95;
	display: flex;
	align-items: center;
	width: 100%;
	height: 120rpx;
	justify-content: space-between;
	font-size: 32rpx;
	background: #FFF9F0;
	box-shadow: 0 -4rpx 16rpx rgba(160,120,80,0.08);
	border-top: 2rpx solid rgba(160,120,80,0.1);
	padding-bottom: env(safe-area-inset-bottom);
	.price-content {
		padding-left: 30rpx;
		font-size: 26rpx;
		color: $text-light;
		display: flex;
		align-items: baseline;
		white-space: nowrap;
		.price-tip { color: $primary; margin-left: 8rpx; font-size: 24rpx; }
		.price { font-size: 40rpx; color: $primary; font-weight: bold; }
		.price-unit { font-size: 24rpx; color: $primary; margin-left: 4rpx; }
	}
	.submit-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: auto;
		min-width: 300rpx;
		padding: 0 56rpx;
		height: 88rpx;
		margin-right: 20rpx;
		color: #FFF;
		font-size: 34rpx;
		font-weight: bold;
		letter-spacing: 2rpx;
		white-space: nowrap;
		flex-shrink: 0;
		background: linear-gradient(135deg, #FF8C42 0%, #FF6B35 100%);
		border-radius: 44rpx 48rpx 42rpx 46rpx / 46rpx 42rpx 48rpx 44rpx;
		box-shadow: 0 8rpx 20rpx rgba(255,107,53,0.3), inset 0 -4rpx 0 rgba(0,0,0,0.08);
		border: 3rpx solid rgba(255,255,255,0.3);
		position: relative;
		overflow: hidden;
		transition: opacity 0.2s;
		&:active {
			animation: btnPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
		}
		&::before {
			content: '';
			position: absolute;
			top: 8rpx;
			left: 16rpx;
			right: 16rpx;
			height: 28rpx;
			background: linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 100%);
			border-radius: 50%;
		}
		&.disabled {
			background: #D4C4B0;
			box-shadow: none;
			border-color: transparent;
			color: #FFF;
		}
	}
}
</style>
