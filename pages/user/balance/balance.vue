<template>
	<view class="page-wrapper">
		<!-- 顶部 -->
		<view class="top-bar">
			<text class="top-title">余额明细</text>
		</view>

		<!-- 当前余额 -->
		<view class="balance-summary">
			<text class="summary-label">账户余额</text>
			<view class="summary-amount">
				<text class="yuan">¥</text>
				<text class="num">{{ (userInfo.account_balance / 100).toFixed(2) }}</text>
			</view>
		</view>

		<!-- 记录列表 -->
		<view class="section-title">收支记录</view>
		<view class="records-list" v-if="records.length > 0">
			<view class="record-item" v-for="(record, idx) in records" :key="idx">
				<view class="record-left">
					<text class="record-icon">{{ record.amount > 0 ? '📥' : '📤' }}</text>
					<view class="record-info">
						<text class="record-reason">{{ record.reason }}</text>
						<text class="record-time">{{ record.created_at }}</text>
					</view>
				</view>
				<text class="record-amount" :class="record.amount > 0 ? 'plus' : 'minus'">
					{{ record.amount > 0 ? '+' : '' }}{{ (record.amount / 100).toFixed(2) }}
				</text>
			</view>
		</view>

		<!-- 空状态 -->
		<view class="empty-state" v-else>
			<text class="empty-icon">📭</text>
			<text class="empty-text">暂无余额记录</text>
		</view>
	</view>
</template>

<script>
	import { mapState, mapActions } from 'vuex';

	export default {
		computed: {
			...mapState(['hasLogin', 'userInfo', 'token']),
		},
		data() {
			return {
				records: [],
			};
		},
		onLoad() {
			this.loadRecords();
		},
		methods: {
			...mapActions(['getBalanceRecords']),
			async loadRecords() {
				if (!this.hasLogin) return;
				try {
					var list = await this.getBalanceRecords();
					console.log('余额记录:', list);
					this.records = list || [];
				} catch (e) {
					console.error('加载余额记录失败:', e);
					this.records = [];
				}
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

.top-bar {
	background: linear-gradient(135deg, #FF9ECD 0%, #FF6B9D 100%);
	padding: 60rpx 32rpx 30rpx;
	text-align: center;
	.top-title {
		font-size: 36rpx;
		font-weight: bold;
		color: #FFF;
		letter-spacing: 2rpx;
	}
}

.balance-summary {
	margin: 24rpx;
	background: linear-gradient(135deg, #667EEA, #764BA2);
	border-radius: 28rpx;
	padding: 32rpx;
	text-align: center;
	box-shadow: 0 8rpx 24rpx rgba(102,126,234,0.3);
	.summary-label {
		display: block;
		font-size: 24rpx;
		color: rgba(255,255,255,0.8);
		margin-bottom: 8rpx;
	}
	.summary-amount {
		display: flex;
		align-items: baseline;
		justify-content: center;
		gap: 4rpx;
		.yuan {
			font-size: 32rpx;
			color: #FFF;
			font-weight: bold;
		}
		.num {
			font-size: 56rpx;
			font-weight: bold;
			color: #FFF;
		}
	}
}

.section-title {
	font-size: 28rpx;
	font-weight: bold;
	color: #333;
	padding: 0 24rpx;
	margin-bottom: 16rpx;
}

.records-list {
	margin: 0 24rpx;
	background: #FFF;
	border-radius: 24rpx;
	overflow: hidden;
	box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
}

.record-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 28rpx 24rpx;
	border-bottom: 1rpx solid #F5F5F5;
	&:last-child { border-bottom: none; }
	.record-left {
		display: flex;
		align-items: center;
		gap: 16rpx;
		.record-icon { font-size: 40rpx; }
		.record-info {
			.record-reason {
				display: block;
				font-size: 26rpx;
				color: #333;
				margin-bottom: 4rpx;
			}
			.record-time {
				display: block;
				font-size: 20rpx;
				color: #AAA;
			}
		}
	}
	.record-amount {
		font-size: 32rpx;
		font-weight: bold;
	}
	.record-amount.plus { color: #52C41A; }
	.record-amount.minus { color: #FF6B6B; }
}

.empty-state {
	text-align: center;
	padding: 80rpx 0;
	.empty-icon { font-size: 80rpx; display: block; margin-bottom: 16rpx; }
	.empty-text { font-size: 28rpx; color: #999; }
}
</style>
