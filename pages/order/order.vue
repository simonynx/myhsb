<template>
	<view class="page-wrapper">

		<!-- 分类标签 -->
		<view class="tab-bar">
			<view
				class="tab-item"
				v-for="(item, index) in navList"
				:key="index"
				:class="{ active: tabCurrentIndex === index }"
				@click="tabClick(index)"
			>
				<text class="tab-text">{{ item.text }}</text>
				<view class="tab-dot" v-if="item.count > 0">{{ item.count }}</view>
			</view>
		</view>

		<!-- 订单列表 -->
		<scroll-view class="order-list" scroll-y v-if="currentOrders.length > 0" @scrolltolower="loadMore">
			<view
				class="order-card"
				v-for="(item, index) in currentOrders"
				:key="index"
			>
				<!-- 卡片头部 -->
				<view class="card-header">
					<view class="header-left">
						<text class="order-icon">{{ getOrderTypeIcon(item) }}</text>
						<view class="order-info">
							<text class="order-type-name">{{ getOrderTypeName(item) }}</text>
							<text class="order-number">No.{{ item.order_number }}</text>
						</view>
					</view>
					<view class="status-badge" :class="'status-' + item.order_status">
						<text>{{ item.stateTip }}</text>
					</view>
				</view>

				<!-- 房间信息（预约类） -->
				<view class="room-section" v-if="item.room && item.goodsInfo">
					<view class="room-top">
						<view class="room-img-box" v-if="item.room.image1">
							<image class="room-img" :src="item.room.image1" mode="aspectFill"></image>
						</view>
						<view class="room-detail">
							<text class="room-name">{{ item.room.name }}</text>
							<view class="room-meta">
								<text class="meta-tag">🏠 {{ item.room.name }}</text>
							</view>
						</view>
					</view>
				</view>

				<!-- 预约详情 -->
				<view class="detail-section" v-if="item.order_type === 1">
					<view class="detail-row">
						<text class="detail-icon">📅</text>
						<text class="detail-label">预约日期</text>
						<text class="detail-value">{{ item.goodsInfo.date }}</text>
					</view>
					<view class="detail-row">
						<text class="detail-icon">⏰</text>
						<text class="detail-label">预约时段</text>
						<text class="detail-value">{{ formatTimeSlots(item.goodsInfo.time_list) }}</text>
					</view>
					<view class="detail-row">
						<text class="detail-icon">👥</text>
						<text class="detail-label">预约人数</text>
						<text class="detail-value">{{ item.goodsInfo.user_count }}人</text>
					</view>
					<view class="detail-row" v-if="item.goodsInfo.contact_name">
						<text class="detail-icon">👤</text>
						<text class="detail-label">联系人</text>
						<text class="detail-value">{{ item.goodsInfo.contact_name }}</text>
					</view>
					<view class="detail-row" v-if="item.goodsInfo.remark">
						<text class="detail-icon">📝</text>
						<text class="detail-label">备注</text>
						<text class="detail-value">{{ item.goodsInfo.remark }}</text>
					</view>
					<!-- 增值服务 -->
					<view class="detail-row" v-if="item.goodsInfo.addons && item.goodsInfo.addons.length > 0">
						<text class="detail-icon">🎁</text>
						<text class="detail-label">增值服务</text>
						<view class="detail-value addon-tags">
							<text class="addon-tag" v-for="(a, ai) in item.goodsInfo.addons" :key="ai">{{ a.name }}</text>
						</view>
					</view>
				</view>

				<!-- 充值详情 -->
				<view class="detail-section recharge-detail" v-if="item.goodsInfo && (item.goodsInfo.amount !== undefined || item.goodsInfo.bonus_points !== undefined || item.goodsInfo.present_money !== undefined)">
					<view class="recharge-amount">
						<text class="recharge-num">¥{{ (item.goodsInfo.amount / 100).toFixed(2) }}</text>
						<text class="recharge-label">充值金额</text>
					</view>
					<view class="recharge-bonus" v-if="item.goodsInfo.bonus_points">
						<text class="bonus-num">+{{ item.goodsInfo.bonus_points }}</text>
						<text class="bonus-label">赠送积分</text>
					</view>
					<view class="recharge-present" v-if="item.goodsInfo.present_money">
						<text class="present-num">+¥{{ (item.goodsInfo.present_money / 100).toFixed(2) }}</text>
						<text class="present-label">赠送余额</text>
					</view>
				</view>

				<!-- 线下消费详情 -->
				<view class="detail-section" v-if="item.order_type === 4">
					<view class="detail-row">
						<text class="detail-icon">🏠</text>
						<text class="detail-label">房间</text>
						<text class="detail-value">{{ (item.goodsInfo && item.goodsInfo.room_name) || '未知房间' }}</text>
					</view>
					<view class="detail-row" v-if="item.goodsInfo && item.goodsInfo.duration">
						<text class="detail-icon">⏱</text>
						<text class="detail-label">消费时长</text>
						<text class="detail-value">{{ item.goodsInfo.duration }}分钟</text>
					</view>
					<view class="detail-row" v-if="item.goodsInfo && item.goodsInfo.user_count">
						<text class="detail-icon">👥</text>
						<text class="detail-label">消费人数</text>
						<text class="detail-value">{{ item.goodsInfo.user_count }}人</text>
					</view>
					<view class="detail-row" v-if="item.goodsInfo && item.goodsInfo.contact_name">
						<text class="detail-icon">👤</text>
						<text class="detail-label">联系人</text>
						<text class="detail-value">{{ item.goodsInfo.contact_name }}</text>
					</view>
				</view>

				<!-- 价格明细 -->
				<view class="price-section">
					<view class="price-row" v-if="item.room && item.goodsInfo">
						<text class="price-label">房间费用</text>
						<text class="price-value">¥{{ item.roomPrice }}</text>
					</view>
					<view class="price-row" v-if="item.addonsPrice > 0">
						<text class="price-label">增值服务</text>
						<text class="price-value">+¥{{ item.addonsPrice }}</text>
					</view>
					<view class="price-row" v-if="item.order_type === 4 && item.originalPrice > 0">
						<text class="price-label">消费金额</text>
						<text class="price-value">¥{{ item.originalPrice }}</text>
					</view>
					<view class="price-row" v-if="item.memberDiscount > 0">
						<text class="price-label">会员折扣</text>
						<text class="price-value discount">-¥{{ item.memberDiscount }}</text>
					</view>
					<view class="price-row" v-if="item.pointsDeduction > 0">
						<text class="price-label">积分抵扣</text>
						<text class="price-value discount">-¥{{ item.pointsDeduction }}</text>
					</view>
					<view class="price-row" v-if="item.couponDiscount > 0">
						<text class="price-label">优惠券</text>
						<text class="price-value discount">-¥{{ item.couponDiscount }}</text>
					</view>
					<view class="price-row">
						<text class="price-label">支付方式</text>
						<text class="price-value">{{ item.payMethodText }}</text>
					</view>
					<view class="price-row total-row">
						<text class="price-label">实付款</text>
						<text class="price-num">¥{{ item.actualPrice }}</text>
					</view>
				</view>

				<!-- 时间信息 -->
				<view class="time-section">
					<text class="create-time">下单时间：{{ formatTime(item.created_at) }}</text>
				</view>

				<!-- 操作按钮 -->
				<view class="action-section" v-if="item.order_status === 0">
					<view class="countdown-tip" v-if="item.end_time && item.countdownText">{{ item.countdownText }}</view>
					<button class="btn-cancel" @click.stop="cancelOrder(item)">取消预约</button>
					<button class="btn-pay" @click.stop="goPay(item)">立即支付</button>
				</view>
				<view class="action-section" v-if="item.order_status === 1">
					<button v-if="item.refundable" class="btn-refund" @click.stop="refundOrder(item)">申请退款</button>
					<button class="btn-delete" @click.stop="deleteOrder(item)">删除记录</button>
				</view>
				<view class="action-section" v-else>
					<button class="btn-delete" @click.stop="deleteOrder(item)">删除记录</button>
				</view>
			</view>

			<!-- 加载更多 -->
			<view class="load-more" v-if="hasMore">
				<text>加载更多...</text>
			</view>
		</scroll-view>

		<!-- 空状态 -->
		<view class="empty-state" v-else>
			<text class="empty-icon">📋</text>
			<text class="empty-text">暂无相关订单</text>
			<button class="empty-btn" @tap="goAppoint">去预约</button>
		</view>
	</view>
</template>

<script>
	import { mapState, mapActions } from 'vuex';
	import AUTH from '../../utils/auth.js';

	const ORDER_TYPE_MAP = {
		1: { icon: '📅', name: '房间预约' },
		2: { icon: '💰', name: '余额充值' },
		3: { icon: '🎟️', name: '购买卡券' },
		4: { icon: '🛒', name: '线下消费' },
		5: { icon: '💎', name: '积分兑换' },
	};

	const PAY_METHOD_MAP = {
		'wxpay': '微信支付',
		'balance': '余额支付',
		'mixed': '混合支付',
		'points': '积分兑换',
	};

	export default {
		computed: {
			...mapState(['hasLogin', 'userInfo', 'token']),
			currentOrders() {
				return this.navList[this.tabCurrentIndex] && this.navList[this.tabCurrentIndex].orderList || [];
			},
			hasMore() {
				return false; // 目前没有分页
			},
		},
		data() {
			return {
				tabCurrentIndex: 0,
				navList: [
					{ state: -1, text: '全部', count: 0, orderList: [], loaded: false },
					{ state: 0, text: '待付款', count: 0, orderList: [], loaded: false },
					{ state: 1, text: '已预约', count: 0, orderList: [], loaded: false },
					{ state: 9, text: '已关闭', count: 0, orderList: [], loaded: false },
				],
			};
		},
		onLoad(options) {
			if (options.state !== undefined) {
				this.tabCurrentIndex = parseInt(options.state);
			}
			this.countdownTimer = null;
			this.$once('hook:onUnload', () => {
				if (this.countdownTimer) clearInterval(this.countdownTimer);
			});
		},
		onShow() {
			this.refreshData();
		},
		methods: {
			...mapActions(['getUserInfo']),
			async refreshData() {
				if (!this.hasLogin) return;
				// 重置所有tab数据
				for (var i = 0; i < this.navList.length; i++) {
					this.navList[i].orderList = [];
					this.navList[i].loaded = false;
					this.navList[i].count = 0;
				}
				await this.loadData();
			},
			async loadData() {
				uni.showLoading({ title: '加载中...' });
				try {
					var today = new Date();
					var date = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
					var roomsRes = await AUTH.getRoomDataList(this.token, date);
					var rooms = roomsRes && roomsRes.data && roomsRes.data.rooms || [];

					// 获取所有订单（state=-1 获取全部）
					var orderRes = await AUTH.getOrderList(-1, this.token);
					if (!orderRes) { uni.hideLoading(); return; }

					var orders = orderRes.data && orderRes.data.orders || [];

					// 按状态分类
					var allList = this.navList[0];
					var unpaidList = this.navList[1];
					var bookedList = this.navList[2];
					var closedList = this.navList[3];

					for (var j = 0; j < orders.length; j++) {
						var item = orders[j];
						var goodsInfoStr = item.goods_info;
						var goodsInfo = (typeof goodsInfoStr === 'string') ? JSON.parse(goodsInfoStr || '{}') : (goodsInfoStr || {});
						item.goodsInfo = goodsInfo;

						if (item.order_type === 1 && goodsInfo.room_id) {
							item.room = this.getRoomById(rooms, goodsInfo.room_id);
						}

						// 状态文字
						var { stateTip, stateTipColor } = this.orderStateExp(item.order_status);
						item.stateTip = stateTip;
						item.stateTipColor = stateTipColor;

						// 计算价格明细
						this.computePriceDetails(item);

						// 支付方式
						item.payMethodText = this.getPayMethodText(item);
						item.refundable = this.canRefund(item);

						allList.orderList.push(item);

						if (item.order_status === 0) {
							unpaidList.orderList.push(item);
						} else if (item.order_status === 1) {
							bookedList.orderList.push(item);
						} else {
							closedList.orderList.push(item);
						}
					}

					// 更新count
					this.navList[0].count = allList.orderList.length;
					this.navList[1].count = unpaidList.orderList.length;
					this.navList[2].count = bookedList.orderList.length;
					this.navList[3].count = closedList.orderList.length;

					for (var k = 0; k < this.navList.length; k++) {
						this.navList[k].loaded = true;
					}

				} catch (e) {
					console.error('加载订单失败:', e);
				}
				uni.hideLoading();
				this.startCountdown();
			},
			computePriceDetails(item) {
				var goodsInfo = item.goodsInfo;
				var payAmount = item.pay_amount || 0;
				item.actualPrice = (payAmount / 100).toFixed(2);

				if (item.room && goodsInfo.time_list && goodsInfo.user_count) {
					// 房间费用
					var hours = goodsInfo.time_list.length;
					var roomPrice = item.room.price_per_hour * hours + item.room.price_per_person * goodsInfo.user_count;
					item.roomPrice = (roomPrice / 100).toFixed(2);
					item.originalPrice = item.roomPrice;

					// 会员折扣（如果有）
					var memberLevel = this.userInfo && this.userInfo.member_level || 0;
					var discounts = { 0: 0, 1: 0, 2: 0.05, 3: 0.1, 4: 0.15 };
					var discountRate = discounts[memberLevel] || 0;
					item.memberDiscount = discountRate > 0 ? (roomPrice * discountRate / 100).toFixed(2) : 0;

					// 积分抵扣（如果有）
					if (goodsInfo.points_used) {
						item.pointsDeduction = (goodsInfo.points_used / 100).toFixed(2);
					} else {
						item.pointsDeduction = 0;
					}

					// 优惠券抵扣（如果有）
					if (goodsInfo.coupon_discount) {
						item.couponDiscount = (goodsInfo.coupon_discount / 100).toFixed(2);
					} else {
						item.couponDiscount = 0;
					}
				} else if (item.order_type === 4) {
					// 线下消费订单
					var totalOrig = (goodsInfo._total_original || item.pay_amount) / 100;
					item.originalPrice = totalOrig.toFixed(2);
					item.roomPrice = totalOrig.toFixed(2);
					item.memberDiscount = 0;
					item.pointsDeduction = goodsInfo._points_deducted ? (goodsInfo._points_deducted / 100).toFixed(2) : 0;
					item.couponDiscount = goodsInfo._coupon_discount ? (goodsInfo._coupon_discount / 100).toFixed(2) : 0;
				} else {
					item.roomPrice = '0.00';
					item.memberDiscount = 0;
					item.pointsDeduction = 0;
					item.couponDiscount = 0;
				}
			},
			getPayMethodText(item) {
				if (item.order_type === 2) return '微信支付';
				if (item.order_type === 1 && item.request_data) {
					var totalFee = item.request_data.total_fee || 0;
					if (item.goodsInfo && item.goodsInfo.use_balance && totalFee < parseInt(item.roomPrice * 100)) {
						return '余额+微信';
					}
					return '微信支付';
				}
				return PAY_METHOD_MAP[item.pay_method] || '微信支付';
			},
			getOrderTypeIcon(item) {
				var map = ORDER_TYPE_MAP[item.order_type];
				return map && map.icon || '📋';
			},
			getOrderTypeName(item) {
				var map = ORDER_TYPE_MAP[item.order_type];
				return map && map.name || '订单';
			},
			getRoomById(rooms, id) {
				for (var i = 0; i < rooms.length; i++) {
					if (rooms[i].object_id == id) return rooms[i];
				}
				return null;
			},
			formatTimeSlots(timeList) {
				if (!timeList || timeList.length === 0) return '-';
				return timeList.map(function(t) {
					return t[0] + ':00 - ' + t[1] + ':00';
				}).join('、');
			},
			formatTime(timeStr) {
				if (!timeStr) return '-';
				var d = new Date(timeStr < 1e12 ? timeStr * 1000 : timeStr);
				var y = d.getFullYear();
				var m = String(d.getMonth() + 1).padStart(2, '0');
				var day = String(d.getDate()).padStart(2, '0');
				var h = String(d.getHours()).padStart(2, '0');
				var min = String(d.getMinutes()).padStart(2, '0');
				return y + '-' + m + '-' + day + ' ' + h + ':' + min;
			},
			startCountdown() {
				var self = this;
				if (this.countdownTimer) clearInterval(this.countdownTimer);
				this.countdownTimer = setInterval(function() {
					var now = Date.now();
					var lists = self.navList;
					var updated = false;
					for (var i = 0; i < lists.length; i++) {
						var orders = lists[i].orderList;
						for (var j = 0; j < orders.length; j++) {
							var item = orders[j];
							if (item.order_status !== 0 || !item.end_time) continue;
							var left = item.end_time * 1000 - now;
							var text;
							if (left <= 0) {
								text = '已超时';
							} else {
								var mm = Math.floor(left / 60000);
								var ss = Math.floor((left % 60000) / 1000);
								text = '剩余 ' + mm + ' 分 ' + (ss < 10 ? '0' : '') + ss + ' 秒';
							}
							if (item.countdownText !== text) {
								item.countdownText = text;
								updated = true;
							}
						}
					}
					if (updated) self.$forceUpdate();
				}, 1000);
			},
			tabClick(index) {
				if (this.tabCurrentIndex === index) return;
				this.tabCurrentIndex = index;
				if (!this.navList[index].loaded) {
					this.loadData();
				}
			},
			loadMore() {
				// TODO: 分页加载
			},
			goPay(item) {
				var url = '/pages/order/payment?parent_sn=' + item.order_number + '&entry=2&data=' + JSON.stringify(item);
				uni.redirectTo({ url: url });
			},
			goAppoint() {
				uni.switchTab({ url: '/pages/tabBar/appoint/appoint' });
			},
			cancelOrder(item) {
				var self = this;
				uni.showModal({
					title: '确认取消',
					content: '确定要取消这个预约吗？',
					success: function(res) {
						if (!res.confirm) return;
						uni.showLoading({ title: '请稍后' });
						AUTH.cancelOrder(self.token, { order_number: item.order_number }).then(function(res) {
							uni.hideLoading();
							if (!res) return;
							item.order_status = 8;
							var { stateTip } = self.orderStateExp(8);
							item.stateTip = stateTip;
							// 移动到已关闭
							var currentList = self.navList[self.tabCurrentIndex].orderList;
							var idx = currentList.findIndex(function(o) { return o.order_number === item.order_number; });
							if (idx !== -1) currentList.splice(idx, 1);
							self.navList[3].orderList.push(item);
							self.navList[3].count = self.navList[3].orderList.length;
						}).catch(function() {
							uni.hideLoading();
						});
					}
				});
			},
			deleteOrder(item) {
				var self = this;
				uni.showModal({
					title: '确认删除',
					content: '删除后无法恢复，确定要删除吗？',
					success: function(res) {
						if (!res.confirm) return;
						uni.showLoading({ title: '请稍后' });
						AUTH.deleteOrder(self.token, { order_number: item.order_number }).then(function(res) {
							uni.hideLoading();
							if (!res) return;
							var currentList = self.navList[self.tabCurrentIndex].orderList;
							var idx = currentList.findIndex(function(o) { return o.order_number === item.order_number; });
							if (idx !== -1) currentList.splice(idx, 1);
							self.navList[0].count = self.navList[0].orderList.length;
						}).catch(function() {
							uni.hideLoading();
						});
					}
				});
			},
			canRefund(item) {
				// 只有预约订单(order_type===1)可退款，且距预约开始需超过1小时
				if (item.order_type !== 1) return false;
				var dateStr = item.date;
				var timeList = item.time_list || [];
				if (!dateStr || !timeList.length) return false;
				var firstSlot = timeList[0];
				if (!firstSlot || !firstSlot[0]) return false;
				var apptStr = dateStr + ' ' + firstSlot[0] + ':00';
				var apptTime = new Date(apptStr.replace(/-/g, '/'));
				var now = new Date();
				return apptTime.getTime() - now.getTime() > 3600000;
			},
			refundOrder(item) {
				var self = this;
				var goodsInfo = item.goodsInfo || {};
				var refundInfo = [];
				if (goodsInfo.use_balance) refundInfo.push('余额');
				if (goodsInfo.use_points) refundInfo.push(goodsInfo.use_points + '积分');
				if (goodsInfo._coupon_id) refundInfo.push('优惠券');
				var msg = '确定申请退款？' + (refundInfo.length ? '\n退款将返还：' + refundInfo.join('、') : '');
				uni.showModal({
					title: '申请退款',
					content: msg,
					success: function(res) {
						if (!res.confirm) return;
						uni.showLoading({ title: '请稍后' });
						AUTH.refundOrder(self.token, { order_number: item.order_number }).then(function(res) {
							uni.hideLoading();
							if (!res) return;
							item.order_status = 10;
							var { stateTip, stateTipColor } = self.orderStateExp(10);
							item.stateTip = stateTip;
							item.stateTipColor = stateTipColor;
							uni.showToast({ title: '退款申请已提交', icon: 'success' });
						}).catch(function(err) {
							uni.hideLoading();
							uni.showToast({ title: (err && err._reason) || '退款失败', icon: 'none' });
						});
					}
				});
			},
			orderStateExp(state) {
				var stateTip = '';
				var stateTipColor = '#E8784A';
				switch (state) {
					case 0: stateTip = '待付款'; stateTipColor = '#FF6B6B'; break;
					case 1: stateTip = '已预约'; stateTipColor = '#52C41A'; break;
					case 2: stateTip = '支付失败'; stateTipColor = '#FF6B6B'; break;
					case 6: stateTip = '已退款'; stateTipColor = '#999'; break;
					case 8: stateTip = '已取消'; stateTipColor = '#999'; break;
					case 9: stateTip = '已关闭'; stateTipColor = '#999'; break;
					case 10: stateTip = '退款中'; stateTipColor = '#F5A623'; break;
					case 11: stateTip = '拒绝退款'; stateTipColor = '#FF6B6B'; break;
					default: stateTip = '未知'; stateTipColor = '#999';
				}
				return { stateTip: stateTip, stateTipColor: stateTipColor };
			},
		},
	};
</script>

<style lang="scss">
page {
	background: #FDF8F0;
}
.page-wrapper {
	min-height: 100vh;
	padding-top: env(safe-area-inset-top);
	padding-bottom: 40rpx;
}

/* ===== 顶部 ===== */
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
	.tab-text {
		font-size: 28rpx;
		color: #999;
		transition: color 0.2s;
	}
	.tab-dot {
		background: #E8784A;
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
.tab-item.active .tab-text { color: #E8784A; font-weight: bold; }
.tab-item.active::after {
	content: '';
	position: absolute;
	bottom: 0;
	left: 50%;
	transform: translateX(-50%);
	width: 48rpx;
	height: 4rpx;
	background: #E8784A;
	border-radius: 4rpx;
}

/* ===== 订单列表 ===== */
.order-list {
	padding: 24rpx;
}
.order-card {
	background: #FFF;
	border-radius: 24rpx;
	margin-bottom: 24rpx;
	overflow: hidden;
	box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
}

/* ===== 卡片头部 ===== */
.card-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 24rpx;
	border-bottom: 1rpx solid #F5F5F5;
	.header-left {
		display: flex;
		align-items: center;
		gap: 16rpx;
		.order-icon { font-size: 40rpx; }
		.order-info {
			display: flex;
			flex-direction: column;
			gap: 4rpx;
			.order-type-name { font-size: 30rpx; font-weight: bold; color: #333; }
			.order-number { font-size: 20rpx; color: #AAA; }
		}
	}
	.status-badge {
		padding: 8rpx 24rpx;
		border-radius: 20rpx;
		font-size: 24rpx;
		font-weight: bold;
	}
	.status-0 { background: #FFF0F0; color: #FF6B6B; }
	.status-1 { background: #F0FFF0; color: #52C41A; }
	.status-2 { background: #FFF0F0; color: #FF6B6B; }
	.status-6, .status-8, .status-9 { background: #F5F5F5; color: #999; }
	.status-10 { background: #FFF9E6; color: #F5A623; }
	.status-11 { background: #FFF0F0; color: #FF6B6B; }
}

/* ===== 房间信息 ===== */
.room-section {
	padding: 20rpx 24rpx;
	border-bottom: 1rpx solid #F5F5F5;
}
.room-top {
	display: flex;
	gap: 20rpx;
	.room-img-box {
		width: 140rpx;
		height: 105rpx;
		border-radius: 16rpx;
		overflow: hidden;
		flex-shrink: 0;
		.room-img { width: 100%; height: 100%; }
	}
	.room-detail {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 8rpx;
		.room-name { font-size: 30rpx; font-weight: bold; color: #333; }
		.room-meta { display: flex; gap: 12rpx; flex-wrap: wrap; }
		.meta-tag {
			background: #FFF5EE;
			color: #E8784A;
			font-size: 20rpx;
			padding: 4rpx 16rpx;
			border-radius: 10rpx;
		}
	}
}

/* ===== 预约详情 ===== */
.detail-section {
	padding: 20rpx 24rpx;
	border-bottom: 1rpx solid #F5F5F5;
}
.detail-row {
	display: flex;
	align-items: flex-start;
	gap: 12rpx;
	margin-bottom: 16rpx;
	&:last-child { margin-bottom: 0; }
	.detail-icon { font-size: 28rpx; flex-shrink: 0; }
	.detail-label { font-size: 26rpx; color: #999; width: 140rpx; flex-shrink: 0; }
	.detail-value { font-size: 26rpx; color: #333; flex: 1; }
}

/* ===== 充值详情 ===== */
.recharge-detail {
	display: flex;
	gap: 32rpx;
	padding: 24rpx;
	.recharge-amount, .recharge-bonus, .recharge-present {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8rpx;
		.recharge-num, .bonus-num, .present-num {
			font-size: 40rpx;
			font-weight: bold;
			color: #E8784A;
		}
		.recharge-label, .bonus-label, .present-label {
			font-size: 22rpx;
			color: #999;
		}
	}
	.recharge-bonus .bonus-num { color: #52C41A; }
	.recharge-present .present-num { color: #F5A623; }
}

/* ===== 价格明细 ===== */
.price-section {
	padding: 20rpx 24rpx;
	border-bottom: 1rpx solid #F5F5F5;
}
.price-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 12rpx;
	&:last-child { margin-bottom: 0; }
	.price-label { font-size: 26rpx; color: #999; }
	.price-value { font-size: 26rpx; color: #666; }
	.price-value.discount { color: #52C41A; }
}
.total-row {
	margin-top: 12rpx;
	padding-top: 12rpx;
	border-top: 1rpx dashed #EEE;
	.price-label { font-size: 28rpx; color: #333; font-weight: bold; }
	.price-num { font-size: 40rpx; font-weight: bold; color: #E8784A; }
}

/* ===== 时间信息 ===== */
.time-section {
	padding: 16rpx 24rpx;
	border-bottom: 1rpx solid #F5F5F5;
	.create-time { font-size: 22rpx; color: #AAA; }
}

/* ===== 操作按钮 ===== */
.countdown-tip {
	font-size: 24rpx;
	color: #FF6B6B;
	margin-right: auto;
	padding: 8rpx 0;
}
.action-section {
	display: flex;
	justify-content: flex-end;
	align-items: center;
	gap: 16rpx;
	padding: 16rpx 24rpx;
	button {
		margin: 0;
		padding: 0;
		font-size: 26rpx;
		border-radius: 40rpx;
		background: #FFF;
		border: 2rpx solid #EEE;
		color: #666;
		line-height: 2.4;
		padding: 0 32rpx;
		&::after { border-radius: 80rpx; }
	}
	.btn-pay {
		background: linear-gradient(135deg, #FFB88C, #E8784A);
		color: #FFF;
		border: none;
	}
	.btn-delete {
		background: #F5F5F5;
		color: #999;
	}
	.btn-refund {
		background: #FFF0E6;
		color: #FF6B00;
		border: 2rpx solid #FF6B00;
	}
}

/* ===== 空状态 ===== */
.empty-state {
	padding: 160rpx 0;
	text-align: center;
	.empty-icon { font-size: 120rpx; display: block; margin-bottom: 24rpx; }
	.empty-text { font-size: 28rpx; color: #999; display: block; margin-bottom: 40rpx; }
	.empty-btn {
		background: linear-gradient(135deg, #FFB88C, #E8784A);
		color: #FFF;
		font-size: 28rpx;
		border-radius: 50rpx;
		padding: 20rpx 60rpx;
		border: none;
		&::after { border: none; }
	}
}

/* ===== 加载更多 ===== */
.load-more {
	text-align: center;
	padding: 32rpx;
	font-size: 26rpx;
	color: #999;
}
</style>
