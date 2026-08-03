<template>
	<view class="page-wrapper">

		<!-- 分类标签 -->
		<view class="tab-bar">
			<view
				class="tab-item"
				v-for="(item, index) in navList"
				:key="index"
				:class="tabCurrentIndex === index ? 'active' : ''"
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
				v-for="item in currentOrders"
				:key="item.order_number"
			>
				<!-- 卡片头部 -->
				<view class="card-header">
					<view class="header-left">
						<text class="order-icon">{{ item.typeMark }}</text>
						<view class="order-info">
							<text class="order-type-name">{{ item.typeName }}</text>
							<text class="order-number">No.{{ item.order_number }}</text>
						</view>
					</view>
					<view :class="item.statusClass">
						<text>{{ item.stateTip }}</text>
					</view>
				</view>

				<!-- 默认只展示用于快速确认的关键信息 -->
				<view class="order-summary">
					<text class="summary-title">{{ item.summaryTitle }}</text>
					<view class="summary-row" v-for="row in item.summaryRows" :key="row.key">
						<text class="summary-label">{{ row.label }}</text>
						<text :class="row.valueClass">{{ row.value }}</text>
					</view>
				</view>

				<view class="order-detail-body" v-if="item.expanded">

				<!-- 房间信息（预约类） -->
				<view class="room-section" v-if="item.room && item.goodsInfo">
					<view class="room-top">
						<view class="room-img-box" v-if="item.room.image1">
							<image class="room-img" :src="item.room.image1" mode="aspectFill"></image>
						</view>
						<view class="room-detail">
							<text class="room-name">{{ item.room.name }}</text>
							<view class="room-meta">
								<text class="meta-tag">包厢预约</text>
							</view>
						</view>
					</view>
				</view>

				<!-- 门票详情 -->
				<view class="detail-section" v-if="item.order_type === 6">
					<view class="detail-row">
						<text class="detail-label">门票</text>
						<text class="detail-value">{{ item.ticketName }} × {{ item.goodsInfo.ticket_count || 1 }}人</text>
					</view>
					<view class="detail-row" v-if="item.goodsInfo.material_spec">
						<text class="detail-label">体验包含</text>
						<text class="detail-value">{{ item.goodsInfo.material_spec }}</text>
					</view>
					<view class="detail-row" v-if="item.goodsInfo.source_order_number">
						<text class="detail-label">关联订单</text>
						<text class="detail-value">{{ item.goodsInfo.source_order_number }}</text>
					</view>
					<view class="detail-row" v-if="item.verify_code">
						<text class="detail-label">核销码</text>
						<text class="detail-value code-text">{{ item.verify_code }}</text>
					</view>
					<view class="detail-row" v-if="item.expire_at">
						<text class="detail-label">有效期至</text>
						<text class="detail-value">{{ formatDate(item.expire_at) }}</text>
					</view>
				</view>

				<!-- 卡包购买详情 -->
				<view class="detail-section" v-if="item.order_type === 7">
					<view class="detail-row">
						<text class="detail-label">卡包</text>
						<text class="detail-value">{{ item.subscriptionName }}</text>
					</view>
					<view class="detail-row" v-if="item.subscriptionLimitText">
						<text class="detail-label">额度</text>
						<text class="detail-value">{{ item.subscriptionLimitText }}</text>
					</view>
					<view class="detail-row" v-if="item.subscriptionUseTypeText">
						<text class="detail-label">适用</text>
						<text class="detail-value">{{ item.subscriptionUseTypeText }}</text>
					</view>
					<view class="detail-row" v-if="item.subscriptionValidityText">
						<text class="detail-label">有效期</text>
						<text class="detail-value">{{ item.subscriptionValidityText }}</text>
					</view>
				</view>

				<!-- 预约详情 -->
				<view class="detail-section" v-if="item.order_type === 1">
					<view class="detail-row">
						<text class="detail-label">预约日期</text>
						<text class="detail-value">{{ item.goodsInfo.date }}</text>
					</view>
					<view class="detail-row">
						<text class="detail-label">预约时段</text>
						<text class="detail-value">{{ formatTimeSlots(item.goodsInfo.time_list) }}</text>
					</view>
					<view class="detail-row">
						<text class="detail-label">预约人数</text>
						<text class="detail-value">{{ item.goodsInfo.user_count }}人</text>
					</view>
					<view class="detail-row" v-if="item.goodsInfo.contact_name">
						<text class="detail-label">联系人</text>
						<text class="detail-value">{{ item.goodsInfo.contact_name }}</text>
					</view>
					<view class="detail-row" v-if="item.goodsInfo.remark">
						<text class="detail-label">备注</text>
						<text class="detail-value">{{ item.goodsInfo.remark }}</text>
					</view>
					<!-- 增值服务 -->
					<view class="detail-row" v-if="item.goodsInfo.addons && item.goodsInfo.addons.length > 0">
						<text class="detail-label">增值服务</text>
						<view class="detail-value addon-tags">
							<text class="addon-tag" v-for="(a, ai) in item.goodsInfo.addons" :key="ai">{{ formatAddonName(a.name) }}{{ a.price ? ' +¥' + formatAddonPrice(a.price) : '' }}</text>
						</view>
					</view>
				</view>

				<!-- 待使用提醒 -->
				<view class="visit-reminder" v-if="item.order_status === 1 && (item.order_type === 1 || item.order_type === 6)">
					<view class="visit-reminder-title">
						<text>到店提醒</text>
					</view>
					<view class="visit-reminder-row" v-if="item.order_type === 6">
						<text class="visit-reminder-dot"></text>
						<text class="visit-reminder-text">{{ item.ticketVariant === 'hall' ? '到店出示核销码或报数字码，店员核销后即可入场。' : '到店出示拼豆体验核销码，核销后领取标准材料并开始制作。' }}</text>
					</view>
					<view class="visit-reminder-row" v-if="item.order_type === 1">
						<text class="visit-reminder-dot"></text>
						<text class="visit-reminder-text">请按预约时段到店，临时改期或迟到可先联系店员确认。</text>
					</view>
					<view class="visit-reminder-row">
						<text class="visit-reminder-dot"></text>
						<text class="visit-reminder-text">大厅自助内容按需取用，桌游和漫画使用后请放回原处。</text>
					</view>
				</view>

				<!-- 充值详情 -->
				<view class="detail-section recharge-detail" v-if="item.showRechargeDetail">
					<view class="recharge-amount">
						<text class="recharge-num">¥{{ item.rechargeAmountText }}</text>
						<text class="recharge-label">充值金额</text>
					</view>
					<view class="recharge-bonus" v-if="item.rechargeBonusText">
						<text class="bonus-num">+{{ item.rechargeBonusText }}</text>
						<text class="bonus-label">赠送积分</text>
					</view>
					<view class="recharge-present" v-if="item.rechargePresentText">
						<text class="present-num">+¥{{ item.rechargePresentText }}</text>
						<text class="present-label">赠送余额</text>
					</view>
				</view>

				<!-- 商品订单详情 -->
				<view class="detail-section" v-if="(item.order_type === 3 || item.order_type === 5) && item.goodsInfo">
					<view class="detail-row">
						<text class="detail-label">商品</text>
						<text class="detail-value">{{ item.goods_name || '商品订单' }}</text>
					</view>
					<view class="detail-row" v-if="item.goodsInfo.points_price">
						<text class="detail-label">积分</text>
						<text class="detail-value">{{ item.goodsInfo.points_price }} 积分</text>
					</view>
					<view class="detail-row" v-if="item.goodsInfo.use_points">
						<text class="detail-label">积分抵扣</text>
						<text class="detail-value">{{ item.goodsInfo.use_points }} 积分</text>
					</view>
					<view class="detail-row" v-if="item.goodsInfo.use_balance">
						<text class="detail-label">余额抵扣</text>
						<text class="detail-value">¥{{ (item.goodsInfo.use_balance / 100).toFixed(2) }}</text>
					</view>
				</view>

				<!-- 线下消费详情 -->
				<view class="detail-section" v-if="item.order_type === 4">
					<view class="detail-row">
						<text class="detail-label">房间</text>
						<text class="detail-value">{{ (item.goodsInfo && item.goodsInfo.room_name) || '未知房间' }}</text>
					</view>
					<view class="detail-row" v-if="item.goodsInfo && item.goodsInfo.duration">
						<text class="detail-label">消费时长</text>
						<text class="detail-value">{{ item.goodsInfo.duration }}小时</text>
					</view>
					<view class="detail-row" v-if="item.goodsInfo && item.goodsInfo.user_count">
						<text class="detail-label">消费人数</text>
						<text class="detail-value">{{ item.goodsInfo.user_count }}人</text>
					</view>
					<view class="detail-row" v-if="item.goodsInfo && item.goodsInfo.contact_name">
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
					<view class="price-row" v-if="item.addonsPrice > 0 && item.order_type !== 4">
						<text class="price-label">增值服务</text>
						<text class="price-value">+¥{{ item.addonsPrice }}</text>
					</view>
					<view class="price-row" v-if="item.order_type === 4 && item.originalPrice > 0">
						<text class="price-label">基础消费</text>
						<text class="price-value">¥{{ item.originalPrice }}</text>
					</view>
					<view class="price-row" v-if="item.order_type === 4 && item.addonsPrice > 0">
						<text class="price-label">增值服务</text>
						<text class="price-value">+¥{{ item.addonsPrice }}</text>
					</view>
					<view class="price-row" v-if="(item.order_type === 3 || item.order_type === 5) && item.originalPrice > 0">
						<text class="price-label">商品金额</text>
						<text class="price-value">¥{{ item.originalPrice }}</text>
					</view>
					<view class="price-row" v-if="item.order_type === 7 && item.originalPrice > 0">
						<text class="price-label">卡包金额</text>
						<text class="price-value">¥{{ item.originalPrice }}</text>
					</view>
					<view class="price-row" v-for="deduct in item.subscriptionDeductions" :key="deduct.key">
						<text class="price-label">{{ deduct.label }}</text>
						<text class="price-value discount">-¥{{ deduct.amountText }}</text>
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
				</view>

				<view class="order-scan-footer">
					<view class="scan-meta">
						<text class="create-time">{{ formatTime(item.created_at) }}</text>
						<text class="pay-method">{{ item.payMethodText }}</text>
					</view>
					<view class="scan-total">
						<text>实付</text>
						<text class="scan-price">¥{{ item.actualPrice }}</text>
					</view>
				</view>
				<view class="detail-toggle" @tap="toggleOrderDetails(item)">
					<text>{{ item.detailToggleText }}</text>
					<text class="detail-toggle-arrow">{{ item.detailToggleArrow }}</text>
				</view>

				<!-- 操作按钮 -->
				<view class="action-section" v-if="item.order_status === 0">
					<view class="countdown-tip" v-if="item.end_time && item.countdownText">{{ item.countdownText }}</view>
					<button class="btn-cancel" @click.stop="cancelOrder(item)">取消订单</button>
					<button class="btn-pay" @click.stop="goPay(item)">立即支付</button>
				</view>
				<view class="action-section" v-else-if="item.order_status === 1 && (item.canPerlerUpgrade || item.refundable)">
					<button class="btn-perler" v-if="item.canPerlerUpgrade" @click.stop="goPerlerUpgrade(item)">+¥{{ perlerUpgradePriceText }} 升级拼豆</button>
					<button v-if="item.refundable" class="btn-refund" @click.stop="refundOrder(item)">申请退款</button>
				</view>
				<view class="action-section" v-else-if="item.deletable">
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
			<text class="empty-icon">单</text>
			<text class="empty-text">暂无相关订单</text>
			<button class="empty-btn" @tap="goAppoint">去预约</button>
		</view>
	</view>
</template>

<script>
	import { mapState, mapActions } from 'vuex';
	import AUTH from '../../utils/auth.js';
	import SUBSCRIPTION from '../../utils/subscription.js';
	import { formatDate, formatDateTime } from '../../common/util.js';

	const ORDER_TYPE_MAP = {
		1: { icon: '房', name: '包厢预约' },
		2: { icon: '充', name: '余额充值' },
		3: { icon: '券', name: '购买卡券' },
		4: { icon: '店', name: '线下消费' },
		5: { icon: '分', name: '积分兑换' },
		6: { icon: '票', name: '大厅门票' },
		7: { icon: '卡', name: '次卡/月卡' },
	};

	const PAY_METHOD_MAP = {
		0: '未支付',
		1: '余额支付',
		2: '微信支付',
	};

		export default {
		computed: {
			...mapState(['hasLogin', 'userInfo', 'token', 'constance']),
			perlerUpgradePriceText() {
				var price = this.constance && this.constance.perler_upgrade_price;
				return ((parseInt(price) || 3100) / 100).toFixed(0);
			},
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
					{ state: 1, text: '待使用', count: 0, orderList: [], loaded: false },
					{ state: 2, text: '已完成', count: 0, orderList: [], loaded: false },
					{ state: 9, text: '已失效', count: 0, orderList: [], loaded: false },
				],
			};
		},
		onLoad(options) {
			if (options.state !== undefined) {
				var stateIndex = parseInt(options.state);
				if (!isNaN(stateIndex) && stateIndex >= 0 && stateIndex < this.navList.length) {
					this.tabCurrentIndex = stateIndex;
				}
			}
			this.countdownTimer = null;
		},
		onShow() {
			this.refreshData();
		},
		onHide() {
			this.clearCountdown();
		},
		onUnload() {
			this.clearCountdown();
		},
		methods: {
			...mapActions(['getUserInfo']),
			formatDate: formatDate,
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
					var pendingUseList = this.navList[2];
					var finishedList = this.navList[3];
					var invalidList = this.navList[4];

					for (var j = 0; j < orders.length; j++) {
						var item = orders[j];
						var goodsInfoStr = item.goods_info;
						var goodsInfo = {};
						if (typeof goodsInfoStr === 'string') {
							try {
								goodsInfo = JSON.parse(goodsInfoStr || '{}');
							} catch (e) {
								goodsInfo = {};
							}
						} else {
							goodsInfo = goodsInfoStr || {};
						}
						item.goodsInfo = goodsInfo;
						item.ticketVariant = item.ticket_variant || goodsInfo.ticket_variant || 'hall';
						item.ticketName = item.ticket_name || goodsInfo.ticket_name || (item.ticketVariant === 'hall' ? '大厅入场券' : '拼豆体验票');
						item.canPerlerUpgrade = false;
						item.deletable = [2, 8, 9, 99].indexOf(Number(item.order_status)) !== -1;

						if (item.order_type === 1 && goodsInfo.room_id) {
							item.room = this.getRoomById(rooms, goodsInfo.room_id);
						}

						// 状态文字
						var { stateTip, stateTipColor } = this.orderStateExp(item);
						item.stateTip = stateTip;
						item.stateTipColor = stateTipColor;

						// 计算价格明细
						this.computePriceDetails(item);

						// 支付方式
						item.payMethodText = this.getPayMethodText(item);
						item.refundable = this.canRefund(item);
						this.buildOrderPresentation(item);

						allList.orderList.push(item);

						if (item.order_status === 0) {
							unpaidList.orderList.push(item);
						} else if (this.isPendingUseOrder(item)) {
							pendingUseList.orderList.push(item);
						} else if (this.isFinishedOrder(item)) {
							finishedList.orderList.push(item);
						} else {
							invalidList.orderList.push(item);
						}
					}

					this.applyPerlerUpgradeEligibility(allList.orderList);

					// 更新count
					this.navList[0].count = allList.orderList.length;
					this.navList[1].count = unpaidList.orderList.length;
					this.navList[2].count = pendingUseList.orderList.length;
					this.navList[3].count = finishedList.orderList.length;
					this.navList[4].count = invalidList.orderList.length;

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
				var goodsInfo = item.goodsInfo || {};
				var payAmount = this.toFen(item.pay_amount);
				item.actualPrice = this.formatFen(payAmount);
				item.subscriptionDeductions = [];
				this.computeRechargeDetails(item);

				// 增值服务
				var addons = goodsInfo.addons || [];
				var addonsPrice = 0;
				for (var i = 0; i < addons.length; i++) {
					addonsPrice += addons[i].price || 0;
				}
				item.addonsPrice = (addonsPrice / 100).toFixed(2);

				if (item.room && goodsInfo.time_list && goodsInfo.user_count) {
					// 房间费用
					var hours = goodsInfo.time_list.length;
					var roomPrice = item.room.price_per_hour * hours + item.room.price_per_person * goodsInfo.user_count;
					item.roomPrice = (roomPrice / 100).toFixed(2);
					item.originalPrice = ((roomPrice + addonsPrice) / 100).toFixed(2);
					item.subscriptionDeductions = this.buildSubscriptionDeductions(goodsInfo, item.room);

					// 会员折扣（如果有）
					var discount = this.userInfo && this.userInfo.discount || 100;
					if (goodsInfo._member_discount !== undefined) {
						item.memberDiscount = (goodsInfo._member_discount / 100).toFixed(2);
					} else if (discount < 100) {
						item.memberDiscount = (roomPrice * (1 - discount / 100) / 100).toFixed(2);
					} else {
						item.memberDiscount = 0;
					}

					// 积分抵扣（如果有）
					if (goodsInfo._points_deducted) {
							item.pointsDeduction = (goodsInfo._points_deducted / 100).toFixed(2);
						} else if (goodsInfo.points_used) {
						item.pointsDeduction = (goodsInfo.points_used / 100).toFixed(2);
					} else {
						item.pointsDeduction = 0;
					}

					// 优惠券抵扣（如果有）
					if (goodsInfo._coupon_discount) {
							item.couponDiscount = (goodsInfo._coupon_discount / 100).toFixed(2);
						} else if (goodsInfo.coupon_discount) {
						item.couponDiscount = (goodsInfo.coupon_discount / 100).toFixed(2);
					} else {
						item.couponDiscount = 0;
					}
				} else if (item.order_type === 4) {
					// 线下消费订单：会员折扣只作用于基础消费，增值/附加费用原价计入
					var offlineAddons = goodsInfo.addons || [];
					var offlineAddonsPrice = goodsInfo._addons_total || 0;
					if (!offlineAddonsPrice) {
						for (var oi = 0; oi < offlineAddons.length; oi++) {
							offlineAddonsPrice += offlineAddons[oi].price || 0;
						}
					}
					var offlineTotalOrig = goodsInfo._total_original || item.pay_amount || 0;
					var offlineBase = goodsInfo._original_amount || Math.max(0, offlineTotalOrig - offlineAddonsPrice);
					item.originalPrice = (offlineBase / 100).toFixed(2);
					item.roomPrice = item.originalPrice;
					item.addonsPrice = (offlineAddonsPrice / 100).toFixed(2);
					item.memberDiscount = goodsInfo._member_discount ? (goodsInfo._member_discount / 100).toFixed(2) : 0;
					item.pointsDeduction = goodsInfo._points_deducted ? (goodsInfo._points_deducted / 100).toFixed(2) : 0;
					item.couponDiscount = goodsInfo._coupon_discount ? (goodsInfo._coupon_discount / 100).toFixed(2) : 0;
				} else if (item.order_type === 6) {
					// 门票订单
					var ticketCount = item.goodsInfo.ticket_count || 1;
					var ticketPrice = item.goodsInfo.ticket_price || item.pay_amount / ticketCount;
					item.roomPrice = ((ticketPrice * ticketCount) / 100).toFixed(2);
					item.originalPrice = item.roomPrice;
					item.subscriptionDeductions = this.buildSubscriptionDeductions(goodsInfo, null);
					item.memberDiscount = 0;
					item.pointsDeduction = goodsInfo._points_deducted ? (goodsInfo._points_deducted / 100).toFixed(2) : 0;
					item.couponDiscount = goodsInfo._coupon_discount ? (goodsInfo._coupon_discount / 100).toFixed(2) : 0;
				} else if (item.order_type === 7) {
					this.computeSubscriptionDetails(item);
				} else if (item.order_type === 3 || item.order_type === 5) {
					// 商品订单 / 积分兑换订单
					var skuPrice = item.sku_price_real || item.pay_amount || 0;
					item.roomPrice = (skuPrice / 100).toFixed(2);
					item.originalPrice = item.roomPrice;
					item.memberDiscount = 0;
					item.pointsDeduction = goodsInfo._points_deducted ? (goodsInfo._points_deducted / 100).toFixed(2) : 0;
					item.couponDiscount = 0;
				} else {
					item.roomPrice = '0.00';
					item.subscriptionDeductions = [];
					item.memberDiscount = 0;
					item.pointsDeduction = 0;
					item.couponDiscount = 0;
				}
			},
			buildSubscriptionDeductions(goodsInfo, room) {
				return SUBSCRIPTION.buildDeductionRows(goodsInfo, room).map(row => {
					return Object.assign({}, row, {
						amountText: this.formatFen(row.amount)
					});
				});
			},
			computeSubscriptionDetails(item) {
				var goodsInfo = item.goodsInfo || {};
				var card = goodsInfo.card_template || goodsInfo.subscription_card || goodsInfo.card || {};
				var template = Object.assign({}, goodsInfo, card);
				var name = card.name || goodsInfo.card_name || goodsInfo.name || item.goods_name || '次卡/月卡';
				var totalLimit = Number(card.total_limit || goodsInfo.total_limit || 0);
				var validityDays = Number(card.validity_days || goodsInfo.validity_days || 0);
				var unit = SUBSCRIPTION.getCardUnit(template);
				var useTypeText = SUBSCRIPTION.getCardUsageText(template);

				item.subscriptionName = name;
				item.subscriptionLimitText = totalLimit > 0 ? totalLimit + unit : '';
				item.subscriptionUseTypeText = useTypeText;
				item.subscriptionValidityText = validityDays > 0 ? '购买后' + validityDays + '天内有效' : '';

				var cardAmount = this.firstValidFen(card.price, goodsInfo.price, goodsInfo.amount, item.pay_amount);
				item.roomPrice = this.formatFen(cardAmount);
				item.originalPrice = item.roomPrice;
				item.addonsPrice = '0.00';
				item.memberDiscount = 0;
				item.pointsDeduction = goodsInfo._points_deducted ? this.formatFen(goodsInfo._points_deducted) : 0;
				item.couponDiscount = goodsInfo._coupon_discount ? this.formatFen(goodsInfo._coupon_discount) : 0;
			},
			computeRechargeDetails(item) {
				var goodsInfo = item.goodsInfo || {};
				var isRecharge = Number(item.order_type) === 2 || Number(goodsInfo.goods_type) === 2;
				item.showRechargeDetail = isRecharge;
				item.rechargeAmountText = '';
				item.rechargeBonusText = '';
				item.rechargePresentText = '';
				if (!isRecharge) return;

				var amount = this.firstValidFen(goodsInfo.amount, item.recharge_amount, item.pay_amount);
				var present = this.firstValidFen(goodsInfo.present_money, 0);
				var bonus = Number(goodsInfo.bonus_points || 0);
				item.rechargeAmountText = this.formatFen(amount);
				item.rechargePresentText = present > 0 ? this.formatFen(present) : '';
				item.rechargeBonusText = isFinite(bonus) && bonus > 0 ? String(Math.floor(bonus)) : '';
			},
			firstValidFen() {
				for (var i = 0; i < arguments.length; i++) {
					var value = arguments[i];
					if (value === undefined || value === null || value === '') continue;
					var amount = Number(value);
					if (isFinite(amount)) return amount;
				}
				return 0;
			},
			toFen(value) {
				if (value === undefined || value === null || value === '') return 0;
				var amount = Number(value);
				return isFinite(amount) ? amount : 0;
			},
			formatFen(value) {
				return (this.toFen(value) / 100).toFixed(2);
			},
			getPayMethodText(item) {
				if (item.order_type === 2) return '微信支付';
				var balanceUsed = item.goodsInfo && Number(item.goodsInfo.use_balance || 0);
				if (balanceUsed > 0) {
					if (Number(item.pay_method) === 1) return '余额支付';
					if (Number(item.pay_method) === 3) return '余额+抖音';
					if (Number(item.pay_method) === 2) return '余额+微信';
					if (Number(item.pay_method) === 9) return '余额+线下补差';
				}
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
				return map && map.icon || '单';
			},
			getOrderTypeName(item) {
				if (item && item.order_type === 6 && item.ticketName) return item.ticketName;
				var map = ORDER_TYPE_MAP[item.order_type];
				return map && map.name || '订单';
			},
			getOrderStatusClass(item) {
				var state = Number(item && item.order_status);
				if (state === 0) return 'status-badge status-pending';
				if (state === 1 && this.isPendingUseOrder(item)) return 'status-badge status-ready';
				if (state === 1) return 'status-badge status-done';
				if (state === 10) return 'status-badge status-pending';
				return 'status-badge status-muted';
			},
			buildOrderPresentation(item) {
				var goodsInfo = item.goodsInfo || {};
				var rows = [];
				var addRow = function(key, label, value, isCode) {
					if (value === undefined || value === null || value === '') return;
					rows.push({
						key: key,
						label: label,
						value: String(value),
						valueClass: isCode ? 'summary-value code' : 'summary-value'
					});
				};

				item.typeMark = this.getOrderTypeIcon(item);
				item.typeName = this.getOrderTypeName(item);
				item.statusClass = this.getOrderStatusClass(item);
				item.summaryTitle = item.typeName;

				if (item.order_type === 1) {
					item.summaryTitle = item.room && item.room.name || '包厢预约';
					addRow('date', '日期', goodsInfo.date);
					addRow('time', '时段', this.formatTimeSlots(goodsInfo.time_list));
					addRow('people', '人数', goodsInfo.user_count ? goodsInfo.user_count + '人' : '');
				} else if (item.order_type === 6) {
					item.summaryTitle = item.ticketName || '门票';
					addRow('count', '数量', (goodsInfo.ticket_count || 1) + '人');
					if (this.isPendingUseOrder(item)) addRow('code', '核销码', item.verify_code, true);
					addRow('expire', '有效期', item.expire_at ? this.formatDate(item.expire_at) : '');
				} else if (item.order_type === 7) {
					item.summaryTitle = item.subscriptionName || '次卡/月卡';
					addRow('limit', '额度', item.subscriptionLimitText);
					addRow('scope', '适用', item.subscriptionUseTypeText);
					addRow('validity', '有效期', item.subscriptionValidityText);
				} else if (item.order_type === 2) {
					item.summaryTitle = '余额充值';
					addRow('amount', '充值', item.rechargeAmountText ? '¥' + item.rechargeAmountText : '');
					addRow('points', '赠送积分', item.rechargeBonusText ? '+' + item.rechargeBonusText : '');
					addRow('balance', '赠送余额', item.rechargePresentText ? '+¥' + item.rechargePresentText : '');
				} else if (item.order_type === 4) {
					item.summaryTitle = goodsInfo.room_name || '线下消费';
					addRow('duration', '时长', goodsInfo.duration ? goodsInfo.duration + '小时' : '');
					addRow('people', '人数', goodsInfo.user_count ? goodsInfo.user_count + '人' : '');
					addRow('contact', '联系人', goodsInfo.contact_name);
				} else {
					item.summaryTitle = item.goods_name || item.typeName;
					addRow('points', '积分', goodsInfo.points_price ? goodsInfo.points_price + '积分' : '');
				}

				item.summaryRows = rows;
				item.expanded = false;
				item.detailToggleText = '查看明细';
				item.detailToggleArrow = '↓';
			},
			toggleOrderDetails(item) {
				item.expanded = !item.expanded;
				item.detailToggleText = item.expanded ? '收起明细' : '查看明细';
				item.detailToggleArrow = item.expanded ? '↑' : '↓';
			},
			applyPerlerUpgradeEligibility(orders) {
				var usedBySource = {};
				var now = Date.now();
				for (var i = 0; i < orders.length; i++) {
					var upgrade = orders[i];
					if (upgrade.ticketVariant !== 'perler_upgrade') continue;
					if (upgrade.order_status !== 0 && upgrade.order_status !== 1) continue;
					if (upgrade.order_status === 0 && upgrade.end_time && upgrade.end_time * 1000 <= now) continue;
					var sourceNumber = upgrade.goodsInfo && upgrade.goodsInfo.source_order_number;
					if (!sourceNumber) continue;
					usedBySource[sourceNumber] = (usedBySource[sourceNumber] || 0) + Number(upgrade.goodsInfo.ticket_count || 1);
				}

				var today = new Date();
				var todayText = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
				for (var j = 0; j < orders.length; j++) {
					var item = orders[j];
					if (item.order_status !== 1) continue;
					var sourceCount = 0;
					if (item.order_type === 1 && String(item.goodsInfo.date || '') === todayText) {
						sourceCount = Number(item.goodsInfo.user_count || item.user_count || 1);
					} else if (item.order_type === 6 && item.ticketVariant === 'hall' && item.verified_at) {
						var verifiedDate = new Date(item.verified_at < 1e12 ? item.verified_at * 1000 : item.verified_at);
						if (verifiedDate.getFullYear() === today.getFullYear()
							&& verifiedDate.getMonth() === today.getMonth()
							&& verifiedDate.getDate() === today.getDate()) {
							sourceCount = Number(item.goodsInfo.ticket_count || item.ticket_count || 1);
						}
					}
					if (sourceCount <= 0) continue;
					var remaining = Math.max(0, sourceCount - Number(usedBySource[item.order_number] || 0));
					item.perlerUpgradeRemaining = remaining;
					item.canPerlerUpgrade = remaining > 0;
				}
			},
			goPerlerUpgrade(item) {
				var source = encodeURIComponent(item.order_number || '');
				AUTH.trackEvent({
					event: 'perler_upgrade_entry_click',
					page_path: 'pages/order/order',
					source: item.order_type === 1 ? 'appointment_order' : 'verified_ticket',
					source_order_number: item.order_number
				}, this.token).catch(function() {});
				uni.navigateTo({ url: '/pages/ticket/upgrade?source_order=' + source });
			},
			isPendingUseOrder(item) {
				if (!item || item.order_status !== 1) return false;
				if (item.order_type === 1) return !this.isPastAppointment(item);
				if (item.order_type === 6) return !item.verified_at && !this.isExpiredTime(item.expire_at);
				return false;
			},
			isFinishedOrder(item) {
				if (!item || item.order_status !== 1) return false;
				if (item.order_type === 6) return !!item.verified_at;
				return !this.isPendingUseOrder(item);
			},
			isPastAppointment(item) {
				if (!item || item.order_type !== 1) return false;
				var goodsInfo = item.goodsInfo || {};
				var dateStr = goodsInfo.date || item.date;
				var timeList = goodsInfo.time_list || item.time_list || [];
				if (!dateStr || !timeList.length) return false;
				var lastSlot = timeList[timeList.length - 1];
				if (!lastSlot || !lastSlot[1]) return false;
				var apptEndStr = dateStr + ' ' + lastSlot[1] + ':00';
				var apptEndTime = new Date(apptEndStr.replace(/-/g, '/'));
				return apptEndTime.getTime() < Date.now();
			},
			isExpiredTime(value) {
				if (!value) return false;
				var expireTime = new Date(value < 1e12 ? value * 1000 : value);
				return expireTime.getTime() < Date.now();
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
				return formatDateTime(timeStr);
			},

			startCountdown() {
				var self = this;
				this.clearCountdown();
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
			clearCountdown() {
				if (this.countdownTimer) {
					clearInterval(this.countdownTimer);
					this.countdownTimer = null;
				}
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
				var url = '/pages/order/payment?parent_sn=' + encodeURIComponent(item.order_number) + '&entry=2&data=' + encodeURIComponent(JSON.stringify(item));
				uni.redirectTo({ url: url });
			},
			goAppoint() {
				uni.switchTab({ url: '/pages/tabBar/appoint/appoint' });
			},
			formatAddonName(name) {
				return String(name || '').replace(/^[^\u4e00-\u9fa5A-Za-z0-9]+/g, '').trim();
			},
			formatAddonPrice(price) {
				var amount = (price || 0) / 100;
				return amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(1);
			},
			cancelOrder(item) {
				var self = this;
				uni.showModal({
					title: '确认取消',
					content: '确定要取消这个订单吗？',
					success: function(res) {
						if (!res.confirm) return;
						uni.showLoading({ title: '请稍后' });
						AUTH.cancelOrder(self.token, { order_number: item.order_number }).then(function(res) {
							uni.hideLoading();
							if (!res) return;
							item.order_status = 8;
							var stateResult = self.orderStateExp(item);
							var stateTip = stateResult.stateTip;
							item.stateTip = stateTip;
							item.stateTipColor = stateResult.stateTipColor;
							item.statusClass = self.getOrderStatusClass(item);
							// 移动到已失效
							var currentList = self.navList[self.tabCurrentIndex].orderList;
							var idx = currentList.findIndex(function(o) { return o.order_number === item.order_number; });
							if (idx !== -1) currentList.splice(idx, 1);
							self.navList[4].orderList.push(item);
							self.navList[4].count = self.navList[4].orderList.length;
							self.navList[1].count = self.navList[1].orderList.length;
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
							if (self.navList[self.tabCurrentIndex]) {
								self.navList[self.tabCurrentIndex].count = currentList.length;
							}
						}).catch(function() {
							uni.hideLoading();
						});
					}
				});
			},
			canRefund(item) {
				// 预约订单(order_type===1)可退款，且距预约开始需超过1小时
				if (item.order_type === 1) {
					var goodsInfo = item.goodsInfo || {};
					var dateStr = goodsInfo.date || item.date;
					var timeList = goodsInfo.time_list || item.time_list || [];
					if (!dateStr || !timeList.length) return false;
					var firstSlot = timeList[0];
					if (!firstSlot || !firstSlot[0]) return false;
					var apptStr = dateStr + ' ' + firstSlot[0] + ':00';
					var apptTime = new Date(apptStr.replace(/-/g, '/'));
					var now = new Date();
					return apptTime.getTime() - now.getTime() > 3600000;
				}
				// 门票订单(order_type===6)可退款，需未核销且未过期
				if (item.order_type === 6) {
					if (item.received_transfer) return false;
					if (item.verified_at) return false;
					if (item.expire_at) {
						var expireTime = new Date(item.expire_at < 1e12 ? item.expire_at * 1000 : item.expire_at);
						var now = new Date();
						return expireTime.getTime() > now.getTime();
					}
					return true;
				}
				return false;
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
							if (!res || res._status !== 0) {
								uni.showToast({ title: (res && res._reason) || '退款失败', icon: 'none' });
								return;
							}
							var refundResult = res.data || {};
							item.order_status = refundResult.refund_status === 'SUCCESS' ? 6 : 10;
							var stateResult = self.orderStateExp(item);
							var stateTip = stateResult.stateTip;
							var stateTipColor = stateResult.stateTipColor;
							item.stateTip = stateTip;
							item.stateTipColor = stateTipColor;
							item.statusClass = self.getOrderStatusClass(item);
							uni.showToast({
								title: refundResult.message || '退款申请已提交',
								icon: 'none'
							});
						}).catch(function(err) {
							uni.hideLoading();
							uni.showToast({ title: (err && err._reason) || '退款失败', icon: 'none' });
						});
					}
				});
			},
			orderStateExp(itemOrState) {
				var state = typeof itemOrState === 'object' ? itemOrState.order_status : itemOrState;
				var item = typeof itemOrState === 'object' ? itemOrState : null;
				var stateTip = '';
				var stateTipColor = '#E8784A';
				// 门票订单特殊状态
				if (item && item.order_type === 6 && state === 1) {
					if (item.verified_at) {
						stateTip = '已核销';
						stateTipColor = '#999';
					} else if (item.expire_at) {
						var expireTime = new Date(item.expire_at < 1e12 ? item.expire_at * 1000 : item.expire_at);
						var now = new Date();
						if (expireTime.getTime() < now.getTime()) {
							stateTip = '已过期';
							stateTipColor = '#999';
						} else {
							stateTip = '待使用';
							stateTipColor = '#52C41A';
						}
					} else {
						stateTip = '待使用';
						stateTipColor = '#52C41A';
					}
					return { stateTip: stateTip, stateTipColor: stateTipColor };
				}
				switch (state) {
					case 0: stateTip = '待付款'; stateTipColor = '#FF6B6B'; break;
					case 1:
						if (item && this.isPendingUseOrder(item)) {
							stateTip = '待使用';
						} else {
							stateTip = '已完成';
						}
						stateTipColor = '#52C41A';
						break;
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
	.detail-label { font-size: 26rpx; color: #999; width: 140rpx; flex-shrink: 0; }
	.detail-value { font-size: 26rpx; color: #333; flex: 1; }
}

/* ===== 待使用提醒 ===== */
.visit-reminder {
	margin: 20rpx 24rpx;
	padding: 20rpx;
	background: #FFF8EF;
	border: 1rpx solid rgba(232, 120, 74, 0.18);
	border-radius: 18rpx;
}
.visit-reminder-title {
	display: flex;
	align-items: center;
	gap: 8rpx;
	margin-bottom: 12rpx;
	font-size: 26rpx;
	font-weight: bold;
	color: #5C4B3A;
}
.visit-reminder-row {
	display: flex;
	align-items: flex-start;
	gap: 12rpx;
	margin-bottom: 10rpx;
	&:last-child { margin-bottom: 0; }
}
.visit-reminder-dot {
	width: 8rpx;
	height: 8rpx;
	border-radius: 50%;
	background: #E8784A;
	margin-top: 15rpx;
	flex-shrink: 0;
}
.visit-reminder-text {
	flex: 1;
	font-size: 24rpx;
	line-height: 1.5;
	color: #7A6A58;
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
		background: #C96B3F;
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
	.btn-perler {
		background: #21867A;
		color: #FFF;
		border: none;
	}
}

/* ===== 空状态 ===== */
.empty-state {
	padding: 160rpx 0;
	text-align: center;
	.empty-icon { font-size: 120rpx; display: block; margin-bottom: 24rpx; }
	.empty-text { font-size: 28rpx; color: #999; display: block; margin-bottom: 40rpx; }
	.empty-btn {
		background: #C96B3F;
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

/* ===== 摘要优先的订单列表 ===== */
page {
	background: #F7F5F1;
}

.page-wrapper {
	padding-top: 0;
	padding-bottom: env(safe-area-inset-bottom);
}

.tab-bar {
	padding: 0 8rpx;
	border-bottom: 1rpx solid #EAE5DF;
	box-shadow: none;
}

.tab-item {
	gap: 5rpx;
	padding: 22rpx 0 20rpx;
}

.tab-item .tab-text {
	font-size: 24rpx;
	color: #8B8178;
}

.tab-item .tab-dot {
	min-width: 30rpx;
	height: 30rpx;
	padding: 0 6rpx;
	border-radius: 15rpx;
	background: #C96B3F;
	font-size: 17rpx;
	box-sizing: border-box;
}

.tab-item.active .tab-text {
	color: #C96B3F;
}

.tab-item.active::after {
	width: 40rpx;
	height: 4rpx;
	background: #C96B3F;
}

.order-list {
	height: calc(100vh - 88rpx);
	padding: 20rpx 20rpx calc(32rpx + env(safe-area-inset-bottom));
	box-sizing: border-box;
}

.order-card {
	margin-bottom: 18rpx;
	border-radius: 16rpx;
	border: 1rpx solid #E8E3DD;
	box-shadow: 0 5rpx 16rpx rgba(51, 45, 40, 0.05);
}

.card-header {
	padding: 22rpx 22rpx 18rpx;
	border-bottom: 0;
}

.card-header .header-left {
	gap: 13rpx;
	min-width: 0;
}

.card-header .header-left .order-icon {
	flex-shrink: 0;
	width: 50rpx;
	height: 50rpx;
	border-radius: 9rpx;
	background: #EEF5EF;
	color: #4E7754;
	font-size: 22rpx;
	font-weight: 700;
	line-height: 50rpx;
	text-align: center;
}

.card-header .header-left .order-info {
	min-width: 0;
}

.card-header .header-left .order-info .order-type-name {
	font-size: 27rpx;
	color: #332D28;
}

.card-header .header-left .order-info .order-number {
	max-width: 390rpx;
	font-size: 19rpx;
	color: #9B938C;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.card-header .status-badge {
	flex-shrink: 0;
	padding: 6rpx 11rpx;
	border-radius: 8rpx;
	font-size: 21rpx;
	font-weight: 700;
}

.status-pending {
	background: #FFF0E7;
	color: #B95D35;
}

.status-ready {
	background: #EAF4EC;
	color: #47724E;
}

.status-done,
.status-muted {
	background: #F0EEEB;
	color: #777069;
}

.order-summary {
	padding: 0 22rpx 18rpx;
}

.summary-title {
	display: block;
	margin-bottom: 12rpx;
	font-size: 30rpx;
	font-weight: 700;
	line-height: 1.35;
	color: #332D28;
}

.summary-row {
	display: flex;
	align-items: flex-start;
	gap: 18rpx;
	margin-top: 8rpx;
}

.summary-label {
	flex-shrink: 0;
	width: 82rpx;
	font-size: 22rpx;
	color: #8B8178;
}

.summary-value {
	flex: 1;
	min-width: 0;
	font-size: 23rpx;
	line-height: 1.4;
	color: #554E47;
	word-break: break-all;
}

.summary-value.code {
	font-size: 29rpx;
	font-weight: 700;
	color: #C96B3F;
}

.order-detail-body {
	border-top: 1rpx solid #EEE9E3;
	background: #FBFAF8;
}

.detail-row {
	gap: 18rpx;
	margin-bottom: 13rpx;
}

.detail-row .detail-label {
	width: 122rpx;
	font-size: 23rpx;
	color: #8B8178;
}

.detail-row .detail-value {
	font-size: 23rpx;
	line-height: 1.45;
	color: #554E47;
}

.room-section,
.detail-section,
.price-section {
	border-bottom-color: #EEE9E3;
}

.room-top .room-img-box {
	width: 120rpx;
	height: 90rpx;
	border-radius: 10rpx;
}

.room-top .room-detail .room-name {
	font-size: 27rpx;
	color: #332D28;
}

.room-top .room-detail .meta-tag {
	border-radius: 7rpx;
	background: #FFF0E7;
	color: #C96B3F;
}

.visit-reminder {
	border-radius: 8rpx;
	background: #FFF8F2;
	border-color: #F0D8C9;
}

.visit-reminder-title {
	color: #554E47;
}

.visit-reminder-dot {
	background: #C96B3F;
}

.price-row .price-value.discount {
	color: #4E7754;
}

.total-row .price-num {
	color: #C96B3F;
}

.order-scan-footer {
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	gap: 16rpx;
	padding: 16rpx 22rpx;
	border-top: 1rpx solid #EEE9E3;
}

.scan-meta {
	display: flex;
	flex-direction: column;
	gap: 4rpx;
	min-width: 0;
}

.create-time,
.pay-method {
	font-size: 19rpx;
	color: #9B938C;
}

.scan-total {
	display: flex;
	align-items: baseline;
	gap: 7rpx;
	flex-shrink: 0;
	font-size: 21rpx;
	color: #8B8178;
}

.scan-price {
	font-size: 31rpx;
	font-weight: 700;
	color: #C96B3F;
}

.detail-toggle {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8rpx;
	height: 58rpx;
	border-top: 1rpx solid #F0ECE7;
	font-size: 21rpx;
	color: #4E7754;
}

.detail-toggle-arrow {
	font-size: 22rpx;
}

.action-section {
	padding: 16rpx 22rpx 20rpx;
	border-top: 1rpx solid #EEE9E3;
}

.action-section button {
	min-width: 122rpx;
	height: 62rpx;
	padding: 0 22rpx;
	border-radius: 10rpx;
	font-size: 23rpx;
	line-height: 62rpx;
}

.action-section .btn-pay {
	background: #C96B3F;
}

.action-section .btn-perler {
	background: #4E7754;
}

.action-section .btn-refund {
	border: 1rpx solid #C96B3F;
	background: #FFFFFF;
	color: #C96B3F;
}

.empty-state {
	padding: 150rpx 24rpx;
}

.empty-state .empty-icon {
	display: block;
	width: 76rpx;
	height: 76rpx;
	margin: 0 auto 22rpx;
	border-radius: 12rpx;
	background: #EAF4EC;
	color: #4E7754;
	font-size: 30rpx;
	font-weight: 700;
	line-height: 76rpx;
}

.empty-state .empty-text {
	color: #8B8178;
}

.empty-state .empty-btn {
	width: 220rpx;
	height: 66rpx;
	margin: 0 auto;
	padding: 0;
	border-radius: 10rpx;
	background: #C96B3F;
	font-size: 25rpx;
	line-height: 66rpx;
}
</style>
