<template>
	<view class="container">
		<!-- 顶部返回 + 装饰 -->
		<view class="header-bar">
			<view class="back-btn" @click="goBack">
				<text class="back-arrow">←</text>
				<text class="back-text">返回森林</text>
			</view>
			<text class="header-leaf">🍃</text>
		</view>

		<!-- 商品信息卡片 -->
		<view class="goods-card">
			<view class="goods-header">
				<view class="emoji-ring">
					<text class="goods-emoji">{{ goodsEmoji }}</text>
				</view>
				<view class="goods-info">
					<text class="goods-name">{{ currentGoods.name }}</text>
					<view class="goods-tags">
						<text class="tag" v-if="currentGoods.exchange_type === 2">🌟 纯积分兑换</text>
						<text class="tag mixed" v-else-if="currentGoods.exchange_type === 3">🌟 积分+现金</text>
						<text class="tag cash" v-else>💰 现金购买</text>
						<text class="tag hot" v-if="currentGoods.is_hot">🔥 热门</text>
						<text class="tag new" v-if="currentGoods.is_new">🌱 新品</text>
					</view>
				</view>
			</view>
			<view class="goods-detail">
				<view class="detail-row">
					<text class="detail-label">可用范围</text>
					<text class="detail-value">到店出示订单即可使用</text>
				</view>
				<view class="detail-row">
					<text class="detail-label">有效期</text>
					<text class="detail-value">{{ formatDate(currentGoods.validity_period_start) }} ~ {{ formatDate(currentGoods.validity_period_end) }}</text>
				</view>
				<view class="detail-row" v-if="currentGoods.description">
					<text class="detail-label">详情</text>
					<text class="detail-value">{{ currentGoods.description }}</text>
				</view>
				<view class="detail-row" v-if="currentGoods.stock >= 0">
					<text class="detail-label">剩余库存</text>
					<text class="detail-value" :class="{ short: currentGoods.stock < 5 }">{{ currentGoods.stock }} 件</text>
				</view>
				<view class="detail-row" v-if="(currentGoods.member_level_required || 0) > 0">
					<text class="detail-label">兑换门槛</text>
					<text class="detail-value">{{ getMemberLevelName(currentGoods.member_level_required) }} 及以上</text>
				</view>
			</view>
		</view>

		<!-- 金额明细 -->
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
				<view class="price-row final">
					<text class="row-label">实付金额</text>
					<text class="row-value final-price">¥{{ actualPrice }}</text>
				</view>
			</block>
		</view>

		<!-- 底部 -->
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
				<text v-if="currentGoods.exchange_type === 2">✨ 立即兑换</text>
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
		goodsEmoji() {
			const typeEmojis = {
				1: '💎',   // 储值（历史兼容）
				2: '🍿',   // 美味小食
				3: '🎈',   // 主题布置
				4: '🎲',   // 游戏周边
				5: '🎁',   // 惊喜盲盒
			};
			return typeEmojis[this.currentGoods.goods_type] || '🎁';
		},
		submitDisabled() {
			if (!this.currentGoods) return true;
			if (this.currentGoods.exchange_type === 2) {
				return !this.pointsEnough;
			}
			return false;
		},
	},
	data() {
		return {
			currentGoods: null,
		};
	},
	onLoad(option) {
		this.currentGoods = JSON.parse(option.data);
	},
	methods: {
		...mapActions(['loginAndRegister', 'getUserInfo']),

		goBack() {
			uni.navigateBack();
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
			AUTH.checkout(this.token, param).then(res => {
				uni.hideLoading();
				if (!res) return;
				var url = '/pages/order/payment?parent_sn=' + res.data.order_number + '&entry=3' + '&data=' + JSON.stringify(res.data);
				uni.redirectTo({ url: url });
			});
		},
	},
};
</script>

<style lang="scss">
$wood: #E8784A;
$wood-light: #FFB88C;
$forest: #7CB342;
$forest-light: #AED581;
$sky: #64B5F6;
$cream: #FDF8F0;
$cream-dark: #F5EDE0;
$bark: #4A3728;
$bark-light: #6D5A48;

page, .container {
	height: 100%;
	background: $cream;
}

/* 顶部栏 */
.header-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 20rpx 24rpx;
	.back-btn {
		display: flex;
		align-items: center;
		gap: 8rpx;
		.back-arrow { font-size: 32rpx; color: $bark; }
		.back-text { font-size: 26rpx; color: $bark-light; }
	}
	.header-leaf { font-size: 32rpx; opacity: 0.4; }
}

/* 商品卡片 */
.goods-card {
	margin: 0 24rpx 20rpx;
	background: #FFF;
	border-radius: 28rpx;
	padding: 28rpx;
	box-shadow: 0 8rpx 32rpx rgba(74,55,40,0.06);
	border: 2rpx solid rgba(245,237,224,0.8);
}
.goods-header {
	display: flex;
	align-items: center;
	gap: 20rpx;
	margin-bottom: 24rpx;
	.emoji-ring {
		width: 120rpx;
		height: 120rpx;
		border-radius: 50%;
		background: linear-gradient(135deg, $cream-dark, $cream);
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 4rpx 12rpx rgba(74,55,40,0.08);
		border: 2rpx solid $cream-dark;
	}
	.goods-emoji { font-size: 64rpx; }
	.goods-info {
		flex: 1;
		.goods-name { font-size: 34rpx; font-weight: bold; color: $bark; }
		.goods-tags {
			display: flex;
			gap: 8rpx;
			margin-top: 10rpx;
			flex-wrap: wrap;
			.tag {
				font-size: 20rpx;
				color: $wood;
				background: #FFF5EE;
				padding: 4rpx 12rpx;
				border-radius: 12rpx;
				&.mixed { color: $forest; background: rgba(124,179,66,0.1); }
				&.cash { color: $sky; background: rgba(100,181,246,0.1); }
				&.hot { color: #E53935; background: rgba(229,57,53,0.08); }
				&.new { color: $forest; background: rgba(124,179,66,0.1); }
			}
		}
	}
}
.goods-detail {
	border-top: 2rpx solid $cream-dark;
	padding-top: 20rpx;
	.detail-row {
		display: flex;
		align-items: flex-start;
		padding: 12rpx 0;
		.detail-label {
			font-size: 26rpx;
			color: $bark-light;
			width: 160rpx;
			flex-shrink: 0;
		}
		.detail-value {
			font-size: 26rpx;
			color: $bark;
			flex: 1;
			&.short { color: #E53935; }
		}
	}
}

/* 价格卡片 */
.price-card {
	margin: 0 24rpx 20rpx;
	background: #FFF;
	border-radius: 28rpx;
	padding: 28rpx;
	box-shadow: 0 8rpx 32rpx rgba(74,55,40,0.06);
	border: 2rpx solid rgba(245,237,224,0.8);
	.price-title {
		font-size: 30rpx;
		font-weight: bold;
		color: $bark;
		margin-bottom: 20rpx;
	}
	.price-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14rpx 0;
		border-bottom: 2rpx solid $cream-dark;
		&:last-child { border-bottom: none; }
		&.final { margin-top: 8rpx; padding-top: 20rpx; border-top: 3rpx solid $cream-dark; border-bottom: none; }
		.row-label { font-size: 26rpx; color: $bark-light; }
		.row-value {
			font-size: 26rpx;
			color: $bark;
			font-weight: 500;
			&.points { color: $wood; font-weight: bold; font-size: 30rpx; }
			&.short { color: #E53935; }
			.points-deduct { color: $forest; font-weight: bold; margin-right: 8rpx; }
			.deduct-amount { color: $bark-light; font-size: 22rpx; }
			&.final-price { color: $wood; font-size: 36rpx; font-weight: bold; }
		}
	}
	.hint-row {
		padding: 12rpx 0;
		.hint-text { font-size: 22rpx; color: $wood; }
	}
}

/* 底部 */
.footer {
	position: fixed;
	left: 0;
	bottom: 0;
	z-index: 95;
	display: flex;
	align-items: center;
	width: 100%;
	height: 100rpx;
	justify-content: space-between;
	font-size: 30rpx;
	background: #FFF;
	box-shadow: 0 -4rpx 16rpx rgba(74,55,40,0.06);
	border-top: 2rpx solid $cream-dark;
	.price-content {
		padding-left: 30rpx;
		font-size: 26rpx;
		color: $bark-light;
		.price-tip { color: $wood; margin-left: 8rpx; font-size: 24rpx; }
		.price { font-size: 40rpx; color: $wood; font-weight: bold; }
		.price-unit { font-size: 24rpx; color: $wood; margin-left: 4rpx; }
	}
	.submit-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 280rpx;
		height: 100%;
		color: #FFF;
		font-size: 32rpx;
		background: linear-gradient(135deg, $wood-light, $wood);
		transition: opacity 0.2s;
		&:active { opacity: 0.85; }
		&.disabled {
			background: #D0C8C0;
		}
	}
}
</style>
