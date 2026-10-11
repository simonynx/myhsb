<template>
	<view class="page">
		<view class="success-card">
			<view class="status-icon" :class="statusClass">{{ statusIcon }}</view>
			<text class="success-title">{{ title }}</text>
			<text class="success-sub">{{ subtitle }}</text>
			<view class="order-meta" v-if="confirmedOrderNumber || orderId">
				<text class="meta-label">{{ confirmedOrderNumber ? '订单号' : '查询编号' }}</text>
				<text class="order-number" selectable>{{ confirmedOrderNumber || orderId }}</text>
			</view>
			<text class="received-time" v-if="isGoodsSuccess && !orderLoading && !orderError && fulfillment.receivedAtText">实际领取时间：{{ fulfillment.receivedAtText }}</text>
			<view class="amount-row" v-if="amountText">
				<text class="meta-label">{{ amountLabel }}</text><text class="amount-value">¥{{ amountText }}</text>
			</view>
			<button class="primary-action" @tap="goOrder">{{ primaryText }}</button>
		</view>

		<view class="secondary-card">
			<view class="action-grid">
				<button class="action-item" v-if="isGoodsSuccess && !orderLoading" @tap="loadOrderBenefit">刷新订单状态</button>
				<button class="action-item" @tap="goSecondaryAction">{{ secondaryText }}</button>
				<button class="action-item" @tap="goHome">回到首页</button>
				<button class="action-item review-action" v-if="reviewOrderId" @tap="goReview">评价本次</button>
					<button class="action-item" v-if="actionsExpanded" @tap="goVoucher">查看积分福利</button>
					<button class="action-item" v-if="actionsExpanded" @tap="goCheckIn">签到拿积分</button>
					<button class="action-item share-btn" v-if="actionsExpanded" open-type="share">约朋友来玩</button>
			</view>
				<button class="notes-toggle" @tap="toggleActions" :aria-expanded="actionsExpanded"><text>更多操作</text><text>{{ actionsExpanded ? '收起 −' : '展开 +' }}</text></button>
				<text class="reward-text" v-if="rewardText">{{ rewardText }}</text>
		</view>

		<view class="notes-card" v-if="!isGoodsSuccess">
			<button class="notes-toggle" @tap="toggleNotes" :aria-expanded="notesExpanded">
				<text>{{ tipTitle }}</text><text>{{ notesExpanded ? '收起 −' : '展开 +' }}</text>
			</button>
			<text class="tip-text" v-if="notesExpanded">{{ tipText }}</text>
		</view>
	</view>
</template>

<script>
import AUTH from '../../../utils/auth.js';
import GOODS_FULFILLMENT from '../../../utils/goodsFulfillment.js';
import { mapState } from 'vuex';

export default {
	data() {
		return {
			amount: 0,
			present: 0,
			bonus: 0,
			orderId: '',
			type: 'order',
			exchangeKind: '',
			confirmedOrder: null,
			orderLoading: false,
			orderError: '',
			inviteCode: '',
			benefitText: '',
			benefitRetryCount: 0,
			reviewOrderId: '',
				notesExpanded: false,
				actionsExpanded: false,
		};
	},
	computed: {
		...mapState(['token', 'userInfo']),
		isGoodsSuccess() {
			if (this.confirmedOrder) return [3, 5].indexOf(Number(this.confirmedOrder.order_type)) >= 0;
			return this.type === 'exchange' || this.type === 'voucher';
		},
		fulfillment() {
			return GOODS_FULFILLMENT.goodsFulfillmentView(this.confirmedOrder);
		},
		fulfillmentTitle() {
			if (this.orderLoading) return '核对订单中';
			if (this.orderError || !this.confirmedOrder) return '订单状态待确认';
			return this.fulfillment.title;
		},
		fulfillmentDescription() {
			if (this.orderLoading) return '正在核对实际订单，请稍候。';
			if (this.orderError) return this.orderError;
			// Short next steps follow the trusted helper's status, never route hints.
			if (this.fulfillment.status === 'closed') return '当前订单不可领取，请查看订单及退款状态。';
			if (this.fulfillment.status === 'notpaid') return '请在我的订单核对支付，确认后再领取。';
			if (this.fulfillment.status === 'issued') return '到我的优惠券查看，有效期与范围以实际到账券为准。';
			if (this.fulfillment.status === 'processing') {
				return this.fulfillment.kind === 'coupon' ? '尚未确认到账，请稍后刷新或联系店员。' : '尚未确认可领取，请刷新或联系店员。';
			}
			if (this.fulfillment.status === 'pending') return '到店出示订单号领取，不配送。';
			if (this.fulfillment.status === 'received') return '可在我的订单查看领取记录。';
			return '请在我的订单出示订单号，由店员确认。';
		},
		statusClass() {
			if (!this.isGoodsSuccess) return 'confirmed';
			if (this.orderLoading) return 'checking';
			if (this.orderError || !this.confirmedOrder) return 'unknown';
			return this.fulfillment.status;
		},
		statusIcon() {
			if (['confirmed', 'issued', 'received'].indexOf(this.statusClass) >= 0) return '✓';
			if (this.statusClass === 'closed') return '−';
			if (this.statusClass === 'pending') return '↓';
			if (this.statusClass === 'notpaid') return '!';
			if (this.statusClass === 'checking' || this.statusClass === 'processing') return '…';
			return '?';
		},
		confirmedOrderNumber() {
			return this.confirmedOrder && this.confirmedOrder.order_number ? this.confirmedOrder.order_number : '';
		},
		amountText() {
			if (this.type === 'exchange' && Number(this.amount || 0) <= 0) return '';
			if (!this.amount && this.amount !== 0) return '';
			return (Number(this.amount || 0) / 100).toFixed(2);
		},
		title() {
			if (this.isGoodsSuccess) return this.fulfillmentTitle;
			if (this.type === 'recharge') return '充值成功';
			if (this.type === 'subscription') return '购买成功';
			return '支付成功';
		},
		subtitle() {
			if (this.isGoodsSuccess) return this.fulfillmentDescription;
			if (this.type === 'recharge') return '余额已到账，可用于下一次预约。';
			if (this.type === 'subscription') return '到我的卡包查看权益与有效期。';
			if (this.type === 'ticket') return '到我的票包使用或转赠好友。';
			return '到店出示订单核验。';
		},
		amountLabel() {
			if (this.type === 'recharge') return '充值金额';
			return '实付金额';
		},
		rewardText() {
			if (this.type !== 'recharge') return this.benefitText;
			var parts = [];
			var present = Number(this.present || 0);
			var bonus = Number(this.bonus || 0);
			if (present > 0) parts.push('额外到账 ¥' + (present / 100).toFixed(2));
			if (bonus > 0) parts.push('赠送 ' + bonus + ' 积分');
			return parts.join(' · ');
		},
		primaryText() {
			if (this.isGoodsSuccess) return !this.orderLoading && !this.orderError ? this.fulfillment.actionText : '去我的订单';
			if (this.type === 'recharge') return '查看余额';
			if (this.type === 'subscription') return '查看卡包';
			if (this.type === 'ticket') return '查看票包';
			return '查看订单';
		},
		secondaryText() {
			if (this.type === 'ticket') return '找人组局';
			return '再约一场';
		},
		tipTitle() {
			if (this.type === 'recharge') return '余额小提示';
			if (this.type === 'subscription') return '卡包小提示';
			if (this.type === 'ticket') return '门票小提示';
			if (this.type === 'exchange') return '兑换提示';
			return '到店小提示';
		},
		tipText() {
			if (this.type === 'recharge') return '充值本金和赠送余额会一起进入账户；预约消费可使用，次卡/月卡除外。';
			if (this.type === 'subscription') return '卡包已含套餐优惠，购买时不叠加余额、优惠券、积分或会员折扣。';
			if (this.type === 'ticket') return '门票未核销且未过期可退；想约朋友时，可在票包里把未使用门票转赠出去。';
			if (this.isGoodsSuccess) return this.fulfillmentDescription;
			return '到店后出示订单即可核验；如需布置或补给，建议提前联系店员确认。';
		},
		sharePath() {
			return this.inviteCode ? '/pages/index/index?invite_code=' + this.inviteCode : '/pages/index/index';
		},
	},
	onLoad(options) {
		this.amount = Number(options.amount || 0);
		this.present = Number(options.present || 0);
		this.bonus = Number(options.bonus || 0);
		this.orderId = options.id || '';
		this.type = options.type || 'order';
		this.exchangeKind = options.kind || '';
		this.inviteCode = this.userInfo && this.userInfo.invite_code ? this.userInfo.invite_code : '';
		this.loadInviteCode();
		this.loadOrderBenefit();
		this.loadReviewOpportunity();
		var paymentTrackData = {
			event: 'payment_success',
			page_path: 'pages/pay/success/success',
			source: this.type,
			amount: this.amount
		};
		if (this.orderId) {
			paymentTrackData.order_id = this.orderId;
			paymentTrackData._dedupe_key = 'payment_success:' + this.type + ':' + this.orderId;
			paymentTrackData._dedupe_ttl_ms = 24 * 60 * 60 * 1000;
		}
		AUTH.trackEvent(paymentTrackData).catch(function() {});
	},
	onShareAppMessage() {
		if (this.type === 'ticket') {
			AUTH.trackEvent({
				event: 'ticket_success_share',
				page_path: 'pages/pay/success/success',
				share_type: 'wechat_session',
				source: 'ticket_payment_success',
				has_invite: !!this.inviteCode
			}, this.token).catch(function() {});
			return {
				title: this.inviteCode ? '我买好摸鱼门票了，送你一份新人礼一起去玩' : '我买好摸鱼门票了，一起去玩桌游',
				imageUrl: '/static/share_home.jpg',
				path: this.sharePath,
			};
		}
		AUTH.trackEvent({
			event: this.inviteCode ? 'share_invite' : 'share_home',
			page_path: 'pages/pay/success/success',
			share_type: 'wechat_session',
			source: 'payment_success',
			has_invite: !!this.inviteCode
		}, this.token).catch(function() {});
		return {
			title: this.inviteCode ? '送你一份摸鱼新人礼，周末一起来玩' : '我在摸鱼划水吧订好了，来一起玩',
			imageUrl: this.inviteCode ? '/static/share_invite.jpg' : '/static/share_home.jpg',
			path: this.sharePath,
		};
	},
	methods: {
		toggleActions() {
			this.actionsExpanded = !this.actionsExpanded;
		},
		toggleNotes() {
			this.notesExpanded = !this.notesExpanded;
		},
		loadReviewOpportunity() {
			if (!this.orderId) return;
			var token = this.token || uni.getStorageSync('token');
			if (!token) return;
			AUTH.getReviewList(token).then(function(res) {
				var data = res && res._status === 0 ? res.data : null;
				var orders = data && Array.isArray(data.reviewable_orders) ? data.reviewable_orders : [];
				var match = orders.find(function(order) {
					return String(order.object_id || '') === String(this.orderId)
						|| String(order.order_number || '') === String(this.orderId);
				}.bind(this));
				this.reviewOrderId = match ? String(match.object_id) : '';
			}.bind(this)).catch(function() {});
		},
		loadOrderBenefit() {
			if (this.type === 'recharge') return;
			this.benefitText = '';
			if (!this.orderId) {
				this.orderError = '缺少订单编号，请去我的订单查看，领取记录待店员确认。';
				return;
			}
			var token = this.token || uni.getStorageSync('token');
			if (!token) {
				this.orderError = '请登录后在我的订单核对领取或到账状态。';
				return;
			}
			var request = (this._orderRequest || 0) + 1;
			this._orderRequest = request;
			this.orderLoading = true;
			this.orderError = '';
			this.confirmedOrder = null;
			return AUTH.getOrderList(-1, token).then(function(res) {
				if (request !== this._orderRequest) return;
				if (!res || res._status !== 0 || !res.data || !Array.isArray(res.data.orders)) throw new Error('invalid order response');
				var data = res.data;
				var orders = data && data.orders ? data.orders : [];
				var order = orders.find(function(item) {
					return String(item.object_id || '') === String(this.orderId)
						|| String(item.order_number || '') === String(this.orderId);
				}.bind(this));
				if (!order) {
					this.orderError = '暂未找到这笔订单，请去我的订单核对或联系店员。';
					return;
				}
				this.confirmedOrder = order;
				if (this.isGoodsSuccess) {
					var summary = this.fulfillment;
					AUTH.trackEvent({ event: 'goods_delivery_summary', page_path: 'pages/pay/success/success',
						order_id: order.object_id, fulfillment_kind: summary.kind, fulfillment_status: summary.status,
						_dedupe_key: 'goods_delivery:' + order.object_id + ':' + summary.status,
						_dedupe_ttl_ms: 24 * 60 * 60 * 1000 }, token).catch(function() {});
				}
				if (Number(order.order_status) === 1) {
					var goodsInfo = order.goodsInfo || order.goods_info || {};
					var context = goodsInfo.context || goodsInfo;
					var growth = context.consume_growth || {};
					var upgradeCoupons = Array.isArray(growth.upgrade_coupons) ? growth.upgrade_coupons : [];
					var benefitParts = [];
					var upgradePoints = Number(growth.upgrade_reward_points || 0);
					if (upgradePoints > 0 || upgradeCoupons.length > 0) {
						var upgradeText = '升级礼';
						if (upgradePoints > 0) upgradeText += upgradePoints + '积分';
						if (upgradeCoupons.length > 0) {
							upgradeText += (upgradePoints > 0 ? '+' : '') + upgradeCoupons.length + '张券';
						}
						benefitParts.push(upgradeText);
					}
					var firstCoupon = context.first_consume_coupon;
					if (firstCoupon && firstCoupon.name) {
						benefitParts.push(firstCoupon.name);
					}
					if (context.granted_coupon_id && (!this.isGoodsSuccess || this.fulfillment.status === 'issued')) {
						benefitParts.push('商城兑换券已放入卡券包');
					}
					if (benefitParts.length > 0) {
						this.benefitText = '权益已到账：' + benefitParts.join(' · ');
						return;
					}
				}
				if (!this.isGoodsSuccess) this.retryOrderBenefit();
			}.bind(this)).catch(function() {
				if (request === this._orderRequest) this.orderError = '订单加载失败，请刷新或去我的订单核对，暂不确认领取或到账。';
				if (!this.isGoodsSuccess) this.retryOrderBenefit();
			}.bind(this)).finally(function() {
				if (request === this._orderRequest) this.orderLoading = false;
			}.bind(this));
		},
		retryOrderBenefit() {
			if (this.benefitRetryCount >= 2) return;
			this.benefitRetryCount += 1;
			setTimeout(function() {
				this.loadOrderBenefit();
			}.bind(this), 1000);
		},
		loadInviteCode() {
			if (this.inviteCode) return;
			var token = this.token || uni.getStorageSync('token');
			if (!token) return;
			AUTH.inviteInfo(token).then(function(res) {
				if (res._status === 0 && res.data && res.data.invite_code) {
					this.inviteCode = res.data.invite_code;
				}
			}.bind(this)).catch(function() {});
		},
		goOrder() {
			if (this.isGoodsSuccess) {
				if (this.confirmedOrder && !this.orderLoading && !this.orderError && this.fulfillment.action === 'coupons') {
					uni.redirectTo({ url: '/pages/my/coupons/coupons?tab=unused' });
				} else {
					uni.redirectTo({ url: this.orderId ? '/pages/order/order?state=0&id=' + encodeURIComponent(this.orderId) : '/pages/order/order?state=0' });
				}
				return;
			}
			if (this.type === 'recharge') {
				uni.redirectTo({ url: '/pages/user/balance/balance' });
				return;
			}
			if (this.type === 'subscription') {
				uni.redirectTo({ url: '/pages/user/subscription/my' });
				return;
			}
			if (this.type === 'ticket') {
				AUTH.trackEvent({
					event: 'ticket_success_ticket_click',
					page_path: 'pages/pay/success/success',
					source: 'ticket_payment_success'
				}, this.token).catch(function() {});
				uni.redirectTo({ url: '/pages/ticket/list' });
				return;
			}
			const url = this.orderId ? '/pages/order/order?state=0&id=' + encodeURIComponent(this.orderId) : '/pages/order/order?state=0';
			uni.redirectTo({ url });
		},
		goVoucher() {
			AUTH.trackEvent({
				event: 'points_mall_entry_click',
				page_path: 'pages/pay/success/success',
				source: 'payment_success',
				order_type: this.type,
			}, this.token).catch(function() {});
			uni.setStorageSync('voucherInitialTab', 'points');
			uni.switchTab({ url: '/pages/voucher/voucher' });
		},
		goSecondaryAction() {
			if (this.type === 'ticket') {
				AUTH.trackEvent({
					event: 'ticket_success_group_click',
					page_path: 'pages/pay/success/success',
					source: 'ticket_payment_success'
				}, this.token).catch(function() {});
				uni.switchTab({ url: '/pages/group/group' });
				return;
			}
			uni.switchTab({ url: '/pages/tabBar/appoint/appoint' });
		},
		goCheckIn() {
			uni.switchTab({ url: '/pages/user/user' });
		},
		goReview() {
			if (!this.reviewOrderId) return;
			AUTH.trackEvent({
				event: 'review_list_click',
				page_path: 'pages/pay/success/success',
				source: 'payment_success',
			}, this.token).catch(function() {});
			uni.redirectTo({
				url: '/pages/my/reviews?order_id=' + this.reviewOrderId,
			});
		},
		goHome() {
			uni.switchTab({ url: '/pages/index/index' });
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

page { background: $bg; min-height: 100vh; }
.page { min-height: 100vh; padding: 32rpx 26rpx calc(40rpx + env(safe-area-inset-bottom)); box-sizing: border-box; color: $text; }
button { margin: 0; box-sizing: border-box; font-size: 26rpx; line-height: 1.5; border-radius: 16rpx; &::after { border: none; } }
.success-card { display: flex; flex-direction: column; align-items: center; padding: 36rpx 28rpx 28rpx; background: #FFFCF7; border: 1rpx solid $line; border-radius: 24rpx; }
.status-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 88rpx;
	height: 88rpx;
	margin-bottom: 20rpx;
	border-radius: 28rpx;
	background: #F0E7DC;
	color: $muted;
	font-size: 48rpx;
	font-weight: 600;
	&.confirmed, &.issued, &.received { background: #EBF0E5; color: #52744F; }
	&.pending { background: #F4E5D6; color: #9B4D30; }
	&.closed, &.notpaid { background: #F1E7DF; color: #92573D; }
}
.success-title { font-size: 38rpx; font-weight: 700; text-align: center; line-height: 1.4; }
.success-sub { display: block; margin-top: 12rpx; font-size: 26rpx; line-height: 1.6; color: $muted; text-align: center; }
.order-meta { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: center; gap: 8rpx 14rpx; max-width: 100%; margin-top: 22rpx; font-size: 24rpx; line-height: 1.5; }
.meta-label { color: $muted; font-size: 24rpx; }
.order-number { min-width: 0; word-break: break-all; }
.received-time { display: block; max-width: 100%; margin-top: 10rpx; font-size: 24rpx; line-height: 1.5; color: $muted; text-align: center; overflow-wrap: anywhere; }
.amount-row { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: center; gap: 12rpx; margin-top: 16rpx; }
.amount-value { font-size: 30rpx; font-weight: 600; color: #A54E2D; overflow-wrap: anywhere; }
.primary-action { display: flex; align-items: center; justify-content: center; width: 100%; min-height: 88rpx; margin-top: 26rpx; padding: 16rpx 22rpx; background: $primary; color: #FFF; font-size: 28rpx; font-weight: 600; }
.secondary-card { margin-top: 22rpx; }
.action-grid { display: flex; flex-wrap: wrap; gap: 12rpx; }
.action-item { display: flex; align-items: center; justify-content: center; flex: 0 0 calc(50% - 6rpx); min-width: 0; min-height: 76rpx; padding: 14rpx 16rpx; background: #F3EDE4; color: $muted; text-align: center; white-space: normal; }
.reward-text { display: block; padding: 18rpx 8rpx 0; font-size: 24rpx; line-height: 1.6; color: $muted; overflow-wrap: anywhere; }
.notes-card { margin-top: 22rpx; border-top: 1rpx solid $line; }
.notes-toggle { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; width: 100%; min-height: 76rpx; padding: 14rpx 8rpx; background: transparent; color: $muted; text-align: left; font-size: 24rpx; }
.tip-text { display: block; padding: 0 8rpx 20rpx; font-size: 24rpx; line-height: 1.6; color: $muted; }
</style>
