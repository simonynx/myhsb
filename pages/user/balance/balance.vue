<template>
	<view class="page-wrapper">

		<!-- 当前余额卡片 -->
		<view class="balance-card">
			<view class="balance-bg-deco"></view>
			<text class="balance-label">账户余额</text>
			<view class="balance-row">
				<text class="balance-yuan">¥</text>
				<text class="balance-num">{{ userInfo && userInfo.account_balance ? (userInfo.account_balance / 100).toFixed(2) : '0.00' }}</text>
			</view>
			<text class="balance-tip">余额可用于预约消费、购买商品</text>
		</view>

		<!-- 记录列表 -->
		<view class="section-header">
			<text class="section-title">收支明细</text>
			<text class="section-count" v-if="records.length > 0">共 {{ records.length }} 笔</text>
		</view>

		<view class="records-list" v-if="records.length > 0">
			<view class="record-card" v-for="(record, idx) in records" :key="idx">
				<view class="record-main">
					<!-- 左侧图标 -->
					<view class="type-icon" :style="{ background: _typeStyle(record.reason).bg }">
						<text class="type-emoji">{{ _typeStyle(record.reason).icon }}</text>
					</view>

					<!-- 中间信息 -->
					<view class="record-body">
						<view class="record-top">
							<text class="type-tag" :style="{ color: _typeStyle(record.reason).color }">
								{{ _typeStyle(record.reason).label }}
							</text>
							<text class="record-reason" v-if="record.reason">{{ _beautifyReason(record.reason) }}</text>
						</view>
						<view class="record-bottom">
							<text class="record-time">{{ formatTime(record.created_at) }}</text>
							<text class="balance-after">余额 ¥{{ (record.balance_after / 100).toFixed(2) }}</text>
						</view>
					</view>

					<!-- 右侧金额 -->
					<view class="record-right">
						<text class="record-amount" :class="record.amount > 0 ? 'plus' : 'minus'">
							{{ record.amount > 0 ? '+' : '' }}{{ (record.amount / 100).toFixed(2) }}
						</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 空状态 -->
		<view class="empty-state" v-else>
			<image class="empty-img" src="/static/missing-face.png" mode="aspectFit"></image>
			<text class="empty-text">{{ errorMsg || '暂无收支记录' }}</text>
			<text class="empty-sub" v-if="!errorMsg">充值或消费后会在这里显示</text>
		</view>
	</view>
</template>

<script>
	import { mapState, mapActions } from 'vuex';

	// 交易类型配置
	var TYPE_MAP = [
		{ keywords: ['充值'], label: '充值', icon: '💰', color: '#E65100', bg: '#FFF3E0' },
		{ keywords: ['余额支付', '购买商品', '扣款', '抵扣余额'], label: '消费', icon: '💸', color: '#C62828', bg: '#FFEBEE' },
		{ keywords: ['退款', '退还', '退出拼团', '解散', '冲突'], label: '退款', icon: '↩️', color: '#1565C0', bg: '#E3F2FD' },
		{ keywords: ['积分兑换'], label: '兑换', icon: '🔄', color: '#F57C00', bg: '#FFF8E1' },
		{ keywords: ['优惠券', '赠送余额'], label: '赠送', icon: '🎁', color: '#6A1B9A', bg: '#F3E5F5' },
	];
	var DEFAULT_TYPE = { label: '其他', icon: '📝', color: '#757575', bg: '#F5F5F5' };

	export default {
		computed: {
			...mapState(['hasLogin', 'userInfo', 'token']),
		},
		data() {
			return {
				records: [],
				errorMsg: '',
			};
		},
		onLoad() {
			this.loadRecords();
		},
		onShow() {
			this.loadRecords();
		},
		methods: {
			...mapActions(['getBalanceRecords']),
			async loadRecords() {
				this.errorMsg = '';
				if (!this.hasLogin) {
					this.errorMsg = '未登录';
					return;
				}
				if (!this.token) {
					this.errorMsg = 'token 为空';
					return;
				}
				try {
					var res = await this.getBalanceRecords();
					console.log('余额接口返回:', JSON.stringify(res).substring(0, 300));
					if (!res) {
						this.errorMsg = '接口返回为空';
						this.records = [];
						return;
					}
					// 兼容旧版 store：直接返回数组
					if (Array.isArray(res)) {
						this.records = res;
						return;
					}
					// 兼容 HTML 字符串返回
					if (typeof res === 'string') {
						this.errorMsg = '接口返回格式错误(HTML)';
						this.records = [];
						return;
					}
					// 新版 store：返回 {_status, data}
					if (res._status === undefined) {
						this.errorMsg = '接口返回异常: ' + JSON.stringify(res).substring(0, 100);
						this.records = [];
						return;
					}
					if (res._status !== 0) {
						this.errorMsg = res._reason || '接口返回错误(_status=' + res._status + ')';
						this.records = [];
						return;
					}
					this.records = res.data || [];
				} catch (e) {
					console.error('加载余额记录失败:', e);
					this.errorMsg = typeof e === 'string' ? e : (e && e.message) || '网络请求失败(status=' + (e && e.statusCode) + ')';
					this.records = [];
				}
			},
			formatTime(ts) {
				if (!ts) return '';
				var s = String(ts).replace('T', ' ').replace(/\+\d{2}:\d{2}$/, '');
				if (s.length > 16) s = s.substring(0, 16);
				return s;
			},
			_typeStyle(reason) {
				if (!reason) return DEFAULT_TYPE;
				for (var i = 0; i < TYPE_MAP.length; i++) {
					var t = TYPE_MAP[i];
					for (var j = 0; j < t.keywords.length; j++) {
						if (reason.indexOf(t.keywords[j]) !== -1) {
							return t;
						}
					}
				}
				return DEFAULT_TYPE;
			},
			_beautifyReason(reason) {
				if (!reason) return '';
				if (reason.indexOf('余额支付订单 #') === 0) return '预约消费';
				if (reason.indexOf('余额购买商品 #') === 0) return '购买商品';
				if (reason.indexOf('更新订单重新抵扣余额 #') === 0) return '修改订单补扣余额';
				if (reason === '拼团发起扣款') return '发起拼团';
				if (reason === '拼团加入扣款') return '加入拼团';
				if (reason.indexOf('退款（成员）') !== -1) return reason.replace('（成员）', '');
				if (reason.indexOf('退款（发起人）') !== -1) return reason.replace('（发起人）', '');
				return reason;
			},
		},
	};
</script>

<style lang="scss">
page {
	background: #F7F8FA;
}
.page-wrapper {
	min-height: 100vh;
	padding-top: env(safe-area-inset-top);
	padding-bottom: 40rpx;
}

/* ===== 余额卡片 ===== */
.balance-card {
	margin: 24rpx;
	background: linear-gradient(135deg, #667EEA, #764BA2);
	border-radius: 32rpx;
	padding: 48rpx 36rpx 36rpx;
	text-align: center;
	box-shadow: 0 12rpx 40rpx rgba(102, 126, 234, 0.35);
	position: relative;
	overflow: hidden;
}
.balance-bg-deco {
	position: absolute;
	top: -60rpx;
	right: -60rpx;
	width: 200rpx;
	height: 200rpx;
	background: radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%);
	border-radius: 50%;
}
.balance-label {
	display: block;
	font-size: 24rpx;
	color: rgba(255,255,255,0.75);
	margin-bottom: 12rpx;
	position: relative;
	z-index: 1;
}
.balance-row {
	display: flex;
	align-items: baseline;
	justify-content: center;
	gap: 6rpx;
	position: relative;
	z-index: 1;
}
.balance-yuan {
	font-size: 36rpx;
	color: #FFF;
	font-weight: bold;
}
.balance-num {
	font-size: 72rpx;
	font-weight: bold;
	color: #FFF;
}
.balance-tip {
	display: block;
	font-size: 22rpx;
	color: rgba(255,255,255,0.6);
	margin-top: 16rpx;
	position: relative;
	z-index: 1;
}

/* ===== 区块标题 ===== */
.section-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 24rpx;
	margin-bottom: 16rpx;
	margin-top: 8rpx;
}
.section-title {
	font-size: 30rpx;
	font-weight: bold;
	color: #333;
}
.section-count {
	font-size: 24rpx;
	color: #999;
}

/* ===== 记录列表 ===== */
.records-list {
	margin: 0 24rpx;
}

.record-card {
	background: #FFF;
	border-radius: 24rpx;
	padding: 28rpx 24rpx;
	margin-bottom: 16rpx;
	box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04);
}

.record-main {
	display: flex;
	align-items: flex-start;
	gap: 20rpx;
}

/* 图标 */
.type-icon {
	width: 72rpx;
	height: 72rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	margin-top: 4rpx;
}
.type-emoji {
	font-size: 36rpx;
}

/* 中间主体 */
.record-body {
	flex: 1;
	min-width: 0;
}
.record-top {
	display: flex;
	align-items: center;
	gap: 12rpx;
	margin-bottom: 10rpx;
	flex-wrap: wrap;
}
.type-tag {
	font-size: 22rpx;
	font-weight: bold;
	padding: 4rpx 14rpx;
	border-radius: 12rpx;
	background: rgba(0,0,0,0.04);
	flex-shrink: 0;
}
.record-reason {
	font-size: 26rpx;
	color: #444;
	line-height: 1.4;
	word-break: break-all;
}
.record-bottom {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-top: 8rpx;
}
.record-time {
	font-size: 22rpx;
	color: #AAA;
}
.balance-after {
	font-size: 22rpx;
	color: #999;
}

/* 右侧金额 */
.record-right {
	text-align: right;
	flex-shrink: 0;
	margin-left: 16rpx;
}
.record-amount {
	font-size: 34rpx;
	font-weight: bold;
}
.record-amount.plus { color: #E65100; }
.record-amount.minus { color: #C62828; }

/* ===== 空状态 ===== */
.empty-state {
	text-align: center;
	padding: 100rpx 0;
}
.empty-img {
	width: 200rpx;
	height: 200rpx;
	opacity: 0.5;
	margin-bottom: 24rpx;
}
.empty-text {
	display: block;
	font-size: 30rpx;
	color: #999;
	margin-bottom: 12rpx;
}
.empty-sub {
	display: block;
	font-size: 24rpx;
	color: #BBB;
}
</style>
