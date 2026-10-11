<template>
	<view class="page-wrapper">
		<button class="back-btn" @tap="goBack">← 返回</button>
		<view class="refresh-state" v-if="goodsLoading || goodsError || goodsUnavailable">
			<text v-if="goodsLoading">正在核对商品、价格与库存…</text>
			<text v-else-if="goodsUnavailable">商品已下架或暂不可购买</text>
			<text v-else>{{ goodsError }}</text>
			<button class="text-button" v-if="!goodsLoading && goodsId" @tap="refreshGoods">重新加载</button>
		</view>
		<block v-if="currentGoods">
			<view class="product-card">
				<view class="product-heading">
					<view class="product-mark"><text>{{ goodsMark }}</text></view>
					<view class="product-copy">
						<text class="exchange-label">{{ exchangeLabel }}</text>
						<text class="product-name">{{ currentGoods.name }}</text>
						<view class="product-price">
							<text class="main-price">{{ productPriceText }}</text>
							<text class="points-price" v-if="currentGoods.exchange_type === 3">+ {{ currentGoods.points_price || 0 }} 积分</text>
						</view>
					</view>
				</view>
				<text class="product-description" v-if="currentGoods.description">{{ currentGoods.description }}</text>
				<text class="delivery-note">{{ usageScopeText }}</text>
				<button class="text-button coupon-link" v-if="isCouponGoods" @tap="goMyCoupons">我的优惠券 ›</button>
				<view class="purchase-facts" v-if="memberRequirementText || purchaseLimitText || purchaseDatesText">
					<view class="info-row" v-if="memberRequirementText">
						<text class="info-label">会员要求</text>
						<text class="info-value">{{ memberRequirementText }}</text>
					</view>
					<view class="info-row" v-if="purchaseLimitText">
						<text class="info-label">限购</text>
						<text class="info-value">{{ purchaseLimitText }}</text>
					</view>
					<view class="info-row" v-if="purchaseDatesText">
						<text class="info-label">购买时间</text>
						<text class="info-value">{{ purchaseDatesText }}</text>
					</view>
				</view>
			</view>

			<view class="purchase-state" v-if="purchaseStateTitle">
				<text class="purchase-state-title">{{ purchaseStateTitle }}</text>
				<button class="text-button" v-if="showEarnPointsAction" @tap="goEarnPoints">去签到 ›</button>
			</view>

			<view class="payment-card" v-if="currentGoods.exchange_type !== 2">
				<button class="balance-row" v-if="canUseBalance" @tap="toggleBalance" :aria-label="balanceToggleLabel" :aria-pressed="useBalance">
					<view class="balance-info">
						<text class="balance-label">使用余额抵扣</text>
						<text class="balance-hint">可用 ¥{{ balanceText }} · {{ useBalance ? '已开启' : '未开启' }}</text>
					</view>
					<view class="toggle" :class="useBalance ? 'on' : ''"><view class="toggle-dot"></view></view>
				</button>
				<text class="checkout-note" v-if="canUseBalance && useBalance && !balanceEnough">余额不足，剩余金额需微信支付。</text>
				<text class="checkout-note" v-if="currentGoods.exchange_type === 3">积分另付，不抵现金；实际现金金额按结算核定（含适用会员优惠）。</text>
				<text class="checkout-note" v-else>实际现金金额按结算核定（含适用会员优惠）。</text>
			</view>

			<view class="details-card">
				<button class="details-toggle" @tap="toggleDetails" :aria-expanded="detailsExpanded">
					<text>商品说明</text><text class="toggle-label">{{ detailsExpanded ? '收起 −' : '展开 +' }}</text>
				</button>
				<view class="details-body" v-if="detailsExpanded">
					<text class="section-caption">费用明细</text>
					<view class="info-row" v-if="currentGoods.exchange_type !== 2">
						<text class="info-label">商品现金</text><text class="info-value">¥{{ cashPriceText }}</text>
					</view>
					<block v-if="currentGoods.exchange_type === 2 || currentGoods.exchange_type === 3">
						<view class="info-row"><text class="info-label">所需积分</text><text class="info-value">{{ currentGoods.points_price || 0 }} 积分</text></view>
						<view class="info-row"><text class="info-label">我的积分</text><text class="info-value">{{ safeUserInfo.points || 0 }} 积分</text></view>
					</block>
					<view class="info-row" v-if="canUseBalance && useBalance">
						<text class="info-label">已选余额抵扣</text><text class="info-value">¥{{ balanceDeductionText }}</text>
					</view>
					<view class="info-row" v-if="currentGoods.stock >= 0">
						<text class="info-label">库存</text><text class="info-value">{{ currentGoods.stock }} 件</text>
					</view>
				</view>
			</view>

			<view class="footer">
				<view class="price-content">
					<text class="price-label">{{ footerAmountLabel }}</text>
					<view class="price-line">
						<block v-if="currentGoods.exchange_type === 2">
							<text class="price">{{ currentGoods.points_price || 0 }}</text><text class="price-unit">积分</text>
						</block>
						<block v-else>
							<text class="price">¥{{ actualPrice }}</text>
							<text class="price-unit" v-if="currentGoods.exchange_type === 3">+ {{ currentGoods.points_price || 0 }} 积分</text>
						</block>
					</view>
				</view>
				<view class="submit-btn" :class="submitDisabled ? 'disabled' : ''" @click="handleSubmit">
					<text>{{ submitButtonText }}</text>
				</view>
			</view>
		</block>
	</view>
</template>

<script>
import { mapState, mapActions } from 'vuex';
import AUTH from '../../utils/auth.js';
import GOODS_FULFILLMENT from '../../utils/goodsFulfillment.js';

export default {
	computed: {
		...mapState(['hasLogin', 'userInfo', 'token', 'constance']),
		safeUserInfo() {
			return this.userInfo || { points: 0, account_balance: 0, member_level: 0, points_config: {} };
		},
		actualPrice() {
			if (!this.currentGoods) return '0.00';
			if (this.currentGoods.exchange_type === 2) {
				return '0.00';
			}
			// 混合商品：现金部分就是 price，积分是额外支付，不参与抵扣
			if (this.currentGoods.exchange_type === 3) {
				return ((this.currentGoods.price || 0) / 100).toFixed(2);
			}
			// 现金商品可使用余额抵扣，不足部分继续走渠道支付
			if (this.useBalance) {
				var balanceUsed = Math.min(
					Number(this.safeUserInfo.account_balance || 0),
					Number(this.currentGoods.price || 0)
				);
				return (Math.max(0, Number(this.currentGoods.price || 0) - balanceUsed) / 100).toFixed(2);
			}
			return ((this.currentGoods.price || 0) / 100).toFixed(2);
		},
		pointsEnough() {
			if (!this.currentGoods) return true;
			// 纯积分或混合商品都需要判断积分
			if (this.currentGoods.exchange_type === 2 || this.currentGoods.exchange_type === 3) {
				return (this.safeUserInfo.points || 0) >= (this.currentGoods.points_price || 0);
			}
			return true;
		},
		pointsShortfall() {
			if (!this.currentGoods) return 0;
			return Math.max(0, Number(this.currentGoods.points_price || 0) - Number(this.safeUserInfo.points || 0));
		},
		memberLevelEnough() {
			if (!this.currentGoods) return true;
			return Number(this.safeUserInfo.member_level || 0) >= Number(this.currentGoods.member_level_required || 0);
		},
		soldOut() {
			return !!this.currentGoods && Number(this.currentGoods.stock) === 0;
		},
		limitReached() {
			if (!this.currentGoods) return false;
			return Number(this.currentGoods.max_buy_per_user || 0) > 0 && this.userBoughtCount >= Number(this.currentGoods.max_buy_per_user);
		},
		purchaseStateTitle() {
			if (this.goodsLoading) return '正在核对商品';
			if (this.goodsError || this.goodsUnavailable) return '商品暂不可购买';
			if (this.soldOut) return '本期已售罄';
			if (this.limitReached) return '本期限购已达上限';
			if (!this.memberLevelEnough) return '会员等级暂未达到';
			if (!this.pointsEnough) return '还差 ' + this.pointsShortfall + ' 积分';
			return '';
		},
		showEarnPointsAction() {
			return !this.pointsEnough && !this.soldOut && !this.limitReached && this.memberLevelEnough;
		},
		submitButtonText() {
			if (this.goodsLoading) return '核对中';
			if (this.submitting) return '提交中';
			if (this.goodsError || this.goodsUnavailable) return '暂不可购买';
			if (this.soldOut) return '已售罄';
			if (this.limitReached) return '已达上限';
			if (!this.memberLevelEnough) return '等级不足';
			if (!this.pointsEnough) return '还差 ' + this.pointsShortfall + ' 积分';
			if (this.currentGoods && this.currentGoods.exchange_type === 2) return '立即兑换';
			if (this.useBalance && this.balanceEnough) return '余额支付';
			if (this.useBalance && Number(this.safeUserInfo.account_balance || 0) > 0) return '余额抵扣并支付';
			return '确认订单';
		},
		balanceEnough() {
			if (!this.currentGoods || this.currentGoods.exchange_type !== 1) return false;
			return (this.safeUserInfo.account_balance || 0) >= (this.currentGoods.price || 0);
		},
		canUseBalance() {
			if (!this.currentGoods) return false;
			return this.currentGoods.exchange_type === 1 && this.currentGoods.can_use_balance;
		},
		isCouponGoods() {
			return GOODS_FULFILLMENT.isCouponGoods(this.currentGoods);
		},
		usageScopeText() {
			if (this.isCouponGoods) return '有效期、适用范围与门槛以实际到账券为准。';
			return '门店领取，不配送；额外付费，非门票内免费茶水。';
		},
		purchaseDatesText() {
			var start = this.currentGoods && this.currentGoods.validity_period_start;
			var end = this.currentGoods && this.currentGoods.validity_period_end;
			if (start && end) return this.formatDate(start) + ' ~ ' + this.formatDate(end);
			if (start) return this.formatDate(start) + ' 起可购';
			if (end) return '可购至 ' + this.formatDate(end);
			return '';
		},
		memberRequirementText() {
			if (!this.currentGoods || !(Number(this.currentGoods.member_level_required) > 0)) return '';
			return this.getMemberLevelName(this.currentGoods.member_level_required) + '及以上';
		},
		purchaseLimitText() {
			if (!this.currentGoods || !(Number(this.currentGoods.max_buy_per_user) > 0)) return '';
			var period = { month: '每月', week: '每周', day: '每日' }[this.currentGoods.max_buy_period] || '每人';
			var unit = this.isCouponGoods ? '张' : '件';
			return period + '限购 ' + this.currentGoods.max_buy_per_user + unit + ' · 已购 ' + this.userBoughtCount + unit;
		},
		goodsMark() {
			if (this.isCouponGoods) return '券';
			var marks = { 2: '食', 3: '物', 4: '玩', 5: '盒' };
			return this.currentGoods && marks[this.currentGoods.goods_type] || '品';
		},
		exchangeLabel() {
			if (!this.currentGoods) return '';
			const map = { 1: '现金购买', 2: '积分兑换', 3: '积分 + 现金' };
			return map[this.currentGoods.exchange_type] || '购买';
		},
		cashPriceText() {
			return (Number(this.currentGoods && this.currentGoods.price || 0) / 100).toFixed(2);
		},
		productPriceText() {
			if (this.currentGoods && this.currentGoods.exchange_type === 2) return (this.currentGoods.points_price || 0) + ' 积分';
			return '¥' + this.cashPriceText;
		},
		footerAmountLabel() {
			if (this.currentGoods && this.currentGoods.exchange_type === 2) return '所需积分';
			if (this.currentGoods && this.currentGoods.exchange_type === 3) return '组合价';
			return this.useBalance ? '预估现金金额' : '商品价';
		},
		balanceText() {
			return (Number(this.safeUserInfo.account_balance || 0) / 100).toFixed(2);
		},
		balanceToggleLabel() {
			return '使用余额抵扣，可用 ' + this.balanceText + ' 元，' + (this.useBalance ? '已开启' : '未开启');
		},
		balanceDeductionText() {
			var deduction = Math.min(Number(this.safeUserInfo.account_balance || 0), Number(this.currentGoods && this.currentGoods.price || 0));
			return (deduction / 100).toFixed(2);
		},
		submitDisabled() {
			if (this.goodsLoading || this.goodsError || this.goodsUnavailable || this.submitting || !this.goodsVerified) return true;
			if (!this.currentGoods) return true;
			if (this.soldOut || !this.memberLevelEnough) return true;
			// 限购预拦截
			if (this.limitReached) {
				return true;
			}
			// 纯积分或混合商品：积分不足则禁用
			if ((this.currentGoods.exchange_type === 2 || this.currentGoods.exchange_type === 3) && !this.pointsEnough) {
				return true;
			}
			return false;
		},
	},
	data() {
		return {
			currentGoods: null,
			goodsId: '',
			goodsLoading: false,
			goodsVerified: false,
			goodsError: '',
			goodsUnavailable: false,
			submitting: false,
			useBalance: false,
			balancePreferenceTouched: false,
			userBoughtCount: 0,
			detailsExpanded: false,
		};
	},
	onLoad(option) {
		// Route data identifies the item only: never use its price, stock or rights.
		option = option || {};
		this.goodsId = option.id || option.goods_id || '';
		try {
			if (!this.goodsId && option.data) {
				var routedGoods;
				try { routedGoods = JSON.parse(option.data); }
				catch (e) { routedGoods = JSON.parse(decodeURIComponent(option.data)); }
				this.goodsId = routedGoods.object_id || '';
			}
		} catch (e) {
			this.goodsError = '商品信息异常，请返回重新选择';
		}
		this.refreshGoods();
	},
		watch: {
			token() {
				if (!this._unloaded && this.goodsId && !this.submitting) this.refreshGoods();
			},
		},
		onUnload() {
			this._unloaded = true;
			this._goodsRequest = (this._goodsRequest || 0) + 1;
			this.goodsVerified = false;
		},
		onShow() {
			if (this.goodsId && !this.submitting) this.refreshGoods();
			if (this.token) {
			this.getUserInfo(true).then(() => {
				if (!this.balancePreferenceTouched) {
					this.useBalance = this.canUseBalance && Number(this.safeUserInfo.account_balance || 0) > 0;
				}
			}).catch(() => {});
		}
	},
	methods: {
		...mapActions(['loginAndRegister', 'getUserInfo']),

		async refreshGoods() {
			if (this._unloaded) return;
			var token = this.token;
			var goodsId = this.goodsId;
			var request = (this._goodsRequest || 0) + 1;
			this._goodsRequest = request;
			this.goodsVerified = false;
			this.currentGoods = null;
			this.goodsUnavailable = false;
			if (!this.goodsId) {
				this.goodsError = '商品信息异常，请返回重新选择';
				return;
			}
			this.goodsLoading = true;
			this.goodsError = '';
			try {
				var res = await AUTH.getGoodsList(token);
				if (this._unloaded || request !== this._goodsRequest || token !== this.token || goodsId !== this.goodsId) return;
				if (!res || res._status !== 0 || !res.data || !Array.isArray(res.data.goods)) throw new Error('invalid goods response');
				var goods = res.data.goods.find(item => String(item.object_id) === String(this.goodsId));
				if (!goods || goods.is_active === false || goods.enabled === false) {
					this.goodsUnavailable = true;
					return;
				}
				this.currentGoods = goods;
				this.goodsVerified = true;
				this.userBoughtCount = Number(goods.user_bought_count || 0);
				if (!this.balancePreferenceTouched) this.useBalance = this.canUseBalance && Number(this.safeUserInfo.account_balance || 0) > 0;
				AUTH.trackEvent({ event: 'goods_view', page_path: 'pages/voucher/detail', goods_id: goods.object_id,
					fulfillment_kind: this.isCouponGoods ? 'coupon' : 'pickup', source: 'goods_detail' }, this.token).catch(function() {});
			} catch (e) {
				if (!this._unloaded && request === this._goodsRequest && token === this.token) this.goodsError = '商品加载失败，请重试';
			} finally {
				if (!this._unloaded && request === this._goodsRequest) this.goodsLoading = false;
			}
		},

		goMyCoupons() {
			uni.navigateTo({ url: '/pages/my/coupons/coupons?tab=unused' });
		},

		goBack() {
			uni.navigateBack();
		},

		goEarnPoints() {
			uni.setStorageSync('voucherInitialTab', 'points');
			uni.switchTab({ url: '/pages/user/user' });
		},

		toggleBalance() {
			if (!this.canUseBalance) return;
			this.balancePreferenceTouched = true;
			this.useBalance = !this.useBalance;
		},

		toggleDetails() {
			this.detailsExpanded = !this.detailsExpanded;
		},

		formatDate(d) {
			if (!d) return '无期限';
			if (typeof d === 'string' && d.length >= 10) return d.substring(0, 10);
			return d;
		},

		getMemberLevelName(level) {
			const names = ['魔法学徒', '霜银法师', '烈金大魔导士', '超位大魔导师'];
			return names[level] || ('Lv.' + level);
		},

		handleSubmit() {
			if (this.goodsLoading || this.goodsError || this.goodsUnavailable || !this.goodsVerified || this.submitting) return;
			if (!this.hasLogin) {
				uni.showModal({
					title: '提示',
					content: '请先登录再下单',
					success: (res) => {
						if (res.confirm) {
							this.goodsVerified = false;
							this.loginAndRegister().then(() => this.getUserInfo(true))
								.then(() => this.refreshGoods()).catch(() => {
									if (!this._unloaded) {
										this.goodsError = '登录或账户更新未完成，请点击重试后继续';
										this.goodsLoading = false;
									}
								});
						}
					}
				});
				return;
			}
			let goods = this.currentGoods;
			if (!goods) return;
			if (this.soldOut) {
				uni.showToast({ title: '商品已售罄', icon: 'none' });
				return;
			}
			if (this.limitReached) {
				uni.showToast({ title: '本期限购数量已用完', icon: 'none' });
				return;
			}
			if (!this.memberLevelEnough) {
				uni.showToast({ title: '会员等级不足', icon: 'none' });
				return;
			}
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
				this.submitting = true;
				AUTH.trackEvent({ event: 'exchange_click', page_path: 'pages/voucher/detail', goods_id: goods.object_id, fulfillment_kind: this.isCouponGoods ? 'coupon' : 'pickup' }, this.token).catch(function() {});
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
					var delivery = GOODS_FULFILLMENT.goodsFulfillmentView(res.data);
					var successContent = '兑换记录已生成，' + delivery.title + '。请查看订单或实际到账券。';
					uni.showModal({
						title: '✨ 兑换成功',
						content: successContent,
						showCancel: false,
						success: () => {
							this.getUserInfo();
							var exchangeKind = this.isCouponGoods ? 'coupon' : 'goods';
							uni.redirectTo({
								url: '/pages/pay/success/success?amount=0&id=' + encodeURIComponent(res.data.object_id || '')
									+ '&type=exchange&kind=' + exchangeKind
							});
						},
					});
				}).catch(() => {
					uni.hideLoading();
					uni.showToast({ title: '兑换失败', icon: 'none' });
				}).finally(() => { this.submitting = false; });
				return;
			}

			// 现金购买 或 积分+现金混合
			this.submitting = true;
			uni.showLoading({ title: '创建订单中...' });
			var param = { order_type: 3, goods_id: goods.object_id };
			if (goods.exchange_type === 3 && goods.points_price) {
				param.use_points = goods.points_price;
			}
			// 余额支付
			if (goods.exchange_type === 1 && this.useBalance && this.canUseBalance) {
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
							uni.redirectTo({
								url: '/pages/pay/success/success?amount=' + (goods.price || 0) + '&id=' + encodeURIComponent(res.data.object_id || '') + '&type=voucher'
							});
						},
					});
					return;
				}
				// 需要微信支付
				var url = '/pages/order/payment?parent_sn=' + encodeURIComponent(res.data.order_number) + '&entry=3' + '&data=' + encodeURIComponent(JSON.stringify(res.data));
				uni.redirectTo({ url: url });
			}).catch(err => {
				uni.hideLoading();
				uni.showToast({ title: err || '创建订单失败', icon: 'none' });
			}).finally(() => { this.submitting = false; });
		},
	},
};
</script>

<style lang="scss">
$primary: #B65E3D;
$bg: #FAF7F0;
$text: #42362D;
$muted: #7A6C5F;
$line: #E7DCCD;

page { background: $bg; }
.page-wrapper {
	min-height: 100vh;
	box-sizing: border-box;
	padding: 12rpx 26rpx calc(210rpx + env(safe-area-inset-bottom));
	background: $bg;
	color: $text;
}
button {
	margin: 0;
	box-sizing: border-box;
	font-size: 26rpx;
	line-height: 1.5;
	border-radius: 14rpx;
	&::after { border: none; }
}
.back-btn, .text-button {
	display: flex;
	align-items: center;
	min-height: 76rpx;
	padding: 12rpx 16rpx;
	background: transparent;
	color: #9B4D30;
	text-align: left;
}
.back-btn { display: inline-flex; margin-bottom: 12rpx; }
.product-card, .payment-card, .details-card, .refresh-state {
	margin-bottom: 20rpx;
	background: #FFFCF7;
	border: 1rpx solid $line;
	border-radius: 24rpx;
}
.product-card { padding: 28rpx; }
.product-heading { display: flex; align-items: center; gap: 24rpx; }
.product-mark {
	width: 108rpx;
	height: 108rpx;
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 2rpx solid #D9B99D;
	border-radius: 24rpx 30rpx 22rpx 28rpx;
	background: #F4E5D6;
	color: $primary;
	font-size: 44rpx;
}
.product-copy { flex: 1; min-width: 0; }
.exchange-label { display: block; color: $muted; font-size: 24rpx; }
.product-name { display: block; margin: 6rpx 0 12rpx; font-size: 34rpx; font-weight: 700; line-height: 1.4; word-break: break-all; }
.product-price { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8rpx 12rpx; color: #A54E2D; }
.main-price { font-size: 42rpx; font-weight: 700; overflow-wrap: anywhere; }
.points-price { font-size: 26rpx; }
.delivery-note { display: block; margin-top: 24rpx; font-size: 26rpx; line-height: 1.6; color: $muted; }
.coupon-link { margin-top: 4rpx; padding-left: 0; }
.purchase-facts { margin-top: 18rpx; padding-top: 10rpx; border-top: 1rpx solid $line; }
.info-row { display: flex; align-items: flex-start; gap: 18rpx; padding: 10rpx 0; font-size: 26rpx; line-height: 1.5; }
.info-label { width: 156rpx; flex-shrink: 0; color: $muted; }
.info-value { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.purchase-state {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 8rpx 20rpx;
	margin-bottom: 20rpx;
	padding: 12rpx 22rpx;
	background: #F4E5D6;
	border-radius: 18rpx;
	color: #9B4D30;
}
.purchase-state-title { font-size: 26rpx; font-weight: 600; line-height: 1.5; }
.payment-card { padding: 12rpx 24rpx 20rpx; }
.balance-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 20rpx;
	width: 100%;
	min-height: 100rpx;
	padding: 14rpx 0;
	background: transparent;
	text-align: left;
	color: $text;
}
.balance-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }
.balance-label { font-size: 28rpx; font-weight: 500; }
.balance-hint { font-size: 24rpx; color: $muted; }
.toggle {
	width: 88rpx;
	height: 48rpx;
	flex-shrink: 0;
	border-radius: 24rpx;
	background: #D8CEC3;
	position: relative;
	&.on { background: $primary; }
}
.toggle-dot { position: absolute; top: 4rpx; left: 4rpx; width: 40rpx; height: 40rpx; border-radius: 50%; background: #FFF; }
.toggle.on .toggle-dot { left: 44rpx; }
.checkout-note { display: block; margin-top: 8rpx; font-size: 24rpx; line-height: 1.6; color: $muted; }
.details-toggle { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; width: 100%; min-height: 88rpx; padding: 18rpx 24rpx; background: transparent; color: $text; text-align: left; }
.toggle-label { flex-shrink: 0; font-size: 24rpx; color: $muted; }
.details-body { padding: 0 24rpx 24rpx; border-top: 1rpx solid $line; }
.product-description { display: block; margin-top: 22rpx; font-size: 26rpx; color: $muted; line-height: 1.7; white-space: pre-wrap; overflow-wrap: anywhere; }
.section-caption { display: block; padding-top: 20rpx; margin-bottom: 8rpx; font-size: 24rpx; color: $muted; }
.refresh-state { padding: 28rpx; font-size: 26rpx; line-height: 1.6; }
.refresh-state .text-button { margin-top: 16rpx; }
.footer {
	position: fixed;
	left: 0;
	bottom: 0;
	z-index: 95;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 20rpx;
	width: 100%;
	box-sizing: border-box;
	padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom));
	background: #FFFCF7;
	border-top: 1rpx solid $line;
}
.price-content { flex: 1; min-width: 0; }
.price-label { display: block; font-size: 24rpx; color: $muted; margin-bottom: 6rpx; }
.price-line { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6rpx 10rpx; color: #A54E2D; }
.price { font-size: 36rpx; font-weight: 700; overflow-wrap: anywhere; }
.price-unit { font-size: 24rpx; }
.submit-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	flex: 0 1 280rpx;
	min-width: 224rpx;
	min-height: 88rpx;
	box-sizing: border-box;
	padding: 16rpx 20rpx;
	border-radius: 18rpx;
	background: $primary;
	color: #FFF;
	font-size: 28rpx;
	font-weight: 600;
	text-align: center;
	line-height: 1.4;
	&.disabled { background: #DBD0C4; color: #645548; }
}
</style>
