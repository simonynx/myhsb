<template>
	<view class="page-wrapper">
		<!-- 自定义导航栏（避免和背景重合） -->
		<view class="custom-nav">
			<text class="nav-title">我的卡包</text>
			<text class="back-btn" @tap="goBack">✕</text>
		</view>
		<view class="nav-placeholder"></view>

		<!-- 选项卡 -->
		<view class="tabs">
			<view 
				class="tab-item" 
				v-for="tab in tabList" 
				:key="tab.value"
				:class="currentTab === tab.value ? 'active' : ''"
				@tap="switchTab(tab.value)"
			>
				<text class="tab-text">{{ tab.name }}</text>
			</view>
		</view>

		<!-- 卡包列表 -->
		<scroll-view class="scroll-area" scroll-y>
			<view v-if="loading" class="loading-state">
				<text class="loading-text">加载中...</text>
			</view>
			
			<view v-else-if="list.length === 0" class="empty-state">
				<view class="empty-icon">📂</view>
				<text class="empty-text">这里空空如也~</text>
				<view class="go-buy-btn" @tap="goBuy">去购买次卡/月卡</view>
			</view>
			
			<view v-else class="card-list">
				<view 
					class="card-item" 
					v-for="sub in list" 
					:key="sub.object_id"
					:class="[getCardClass(sub), getBgClass(sub)]"
				>
					<!-- 装饰水波纹 -->
					<view class="card-wave"></view>

					<view class="card-header">
						<view class="card-type-tag">
							{{ getCardBadge(sub.card_template) }}
						</view>
						<text class="card-status-name">{{ getStatusText(sub) }}</text>
					</view>
					
					<view class="card-body">
						<text class="card-name">{{ sub.card_template.name }}</text>
						
						<view class="limit-section">
							<text class="limit-num">{{ sub.remaining_limit }}</text>
							<text class="limit-unit">{{ sub.card_template.target_type === 2 ? '小时' : '次' }}</text>
							<text class="limit-label">剩余额度</text>
						</view>
					</view>
					
					<view class="card-footer">
						<view class="footer-desc">
							<text class="desc-line">适用：{{ sub.target_type_num === 2 ? '包厢预约折抵' : '大厅门票折抵' }}</text>
							<text class="desc-line" v-if="sub.target_type_num === 2">
								包厢限制：{{ sub.room_names_limit }}
							</text>
						</view>
						<text class="expire-time">有效期至: {{ sub.formatted_expire }}</text>
					</view>
				</view>
			</view>
		</scroll-view>

		<!-- 底部操作悬浮按钮 -->
		<view class="footer-actions">
			<view class="buy-more-btn" @tap="goBuy">
				<text class="btn-text">+ 购买更多卡包</text>
			</view>
		</view>
	</view>
</template>

<script>
import { mapState } from 'vuex';
import AUTH from '../../../utils/auth.js';
import { formatDate } from '../../../common/util.js';

export default {
	data() {
		return {
			list: [],
			loading: true,
			currentTab: 1, // 1:使用中, 2:额度已耗尽, 3:已过期
			tabList: [
				{ name: '使用中', value: 1 },
				{ name: '已用完', value: 2 },
				{ name: '已过期', value: 3 }
			]
		};
	},
	computed: {
		...mapState(['token'])
	},
	onLoad() {
		this.fetchData();
	},
	methods: {
		fetchData() {
			this.loading = true;
			AUTH.getUserSubscriptions(this.token, this.currentTab).then(res => {
				this.loading = false;
				if (res._status === 0 && res.data) {
					this.list = res.data.map(sub => {
						let roomNames = '所有包厢通用';
						const usableRooms = sub.card_template.usable_rooms || [];
						if (usableRooms.length > 0) {
							roomNames = usableRooms.map(r => r.name || '').filter(Boolean).join(', ');
						}
						return Object.assign({}, sub, {
							formatted_expire: formatDate(Number(sub.expire_at) || sub.expire_at),
							room_names_limit: roomNames,
							target_type_num: Number(sub.card_template.target_type) || 0
						});
					});
				} else {
					uni.showToast({ title: res._reason || '加载数据失败', icon: 'none' });
				}
			}).catch(err => {
				this.loading = false;
				uni.showToast({ title: '加载失败，请重试', icon: 'none' });
			});
		},
		switchTab(val) {
			this.currentTab = val;
			this.fetchData();
		},
		goBack() {
			const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
			if (pages && pages.length > 1) {
				uni.navigateBack();
			} else {
				uni.switchTab({ url: '/pages/user/user' });
			}
		},
		goBuy() {
			uni.navigateTo({ url: '/pages/user/subscription/buy' });
		},
		isMonthlyCard(template) {
			return template && Number(template.target_type) === 1 && Number(template.validity_days) <= 31 && Number(template.total_limit) >= 20;
		},
		getCardBadge(template) {
			if (!template) return '卡包';
			if (Number(template.target_type) === 2) return '小时卡';
			return this.isMonthlyCard(template) ? '月卡' : '次卡';
		},
		getCardClass(sub) {
			if (sub.status === 1) return 'active';
			if (sub.status === 2) return 'used';
			return 'expired';
		},
		getBgClass(sub) {
			// 根据卡种配置动态给不同的精美渐变色
			if (sub.status !== 1) return 'grey-bg';
			if (sub.target_type_num === 2) {
				return 'purple-bg'; // 包厢卡紫色渐变
			}
			return 'orange-bg'; // 大厅门票卡橙色渐变
		},
		getStatusText(sub) {
			if (sub.status === 1) return '正常使用中';
			if (sub.status === 2) return '额度已用完';
			return '已过期';
		}
	}
};
</script>

<style lang="scss">
page {
	background: #FDF8F0;
}
.page-wrapper {
	min-height: 100vh;
	display: flex;
	flex-direction: column;
}

/* ===== 自定义导航栏 ===== */
.custom-nav {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	height: 88rpx;
	padding-top: env(safe-area-inset-top);
	background: #FFF;
	display: flex;
	align-items: center;
	justify-content: center;
	border-bottom: 1rpx solid #F5EBE0;
	z-index: 999;
	
	.nav-title {
		font-size: 32rpx;
		font-weight: bold;
		color: #5C4B3A;
	}
	.back-btn {
		position: absolute;
		left: 30rpx;
		top: calc(50% - 20rpx + env(safe-area-inset-top) / 2);
		font-size: 40rpx;
		color: #8C7966;
		padding: 10rpx;
	}
}
.nav-placeholder {
	height: calc(88rpx + env(safe-area-inset-top));
}

/* ===== 选项卡 ===== */
.tabs {
	display: flex;
	background: #FFF;
	border-bottom: 1rpx solid #F5EBE0;
	
	.tab-item {
		flex: 1;
		text-align: center;
		padding: 24rpx 0;
		position: relative;
		
		.tab-text {
			font-size: 28rpx;
			color: #8C7966;
			transition: all 0.2s;
		}
		
		&.active {
			.tab-text {
				color: #FF8C42;
				font-weight: bold;
			}
			&::after {
				content: '';
				position: absolute;
				bottom: 0;
				left: 30%;
				right: 30%;
				height: 4rpx;
				background: #FF8C42;
				border-radius: 2rpx;
			}
		}
	}
}

/* ===== 滚动区域 ===== */
.scroll-area {
	flex: 1;
	height: 0;
}

.loading-state {
	padding: 120rpx 0;
	text-align: center;
	color: #A09080;
	font-size: 26rpx;
}

.empty-state {
	padding: 180rpx 40rpx;
	text-align: center;
	
	.empty-icon {
		font-size: 100rpx;
		margin-bottom: 24rpx;
	}
	.empty-text {
		font-size: 26rpx;
		color: #A09080;
		display: block;
		margin-bottom: 40rpx;
	}
	.go-buy-btn {
		display: inline-block;
		background: linear-gradient(135deg, #FFB74D, #FF8C42);
		color: #FFF;
		padding: 20rpx 48rpx;
		border-radius: 999rpx;
		font-size: 28rpx;
		font-weight: bold;
		box-shadow: 0 6rpx 20rpx rgba(255, 140, 66, 0.2);
	}
}

/* ===== 卡片列表 ===== */
.card-list {
	padding: 30rpx 24rpx;
	display: flex;
	flex-direction: column;
	gap: 30rpx;
}

.card-item {
	position: relative;
	border-radius: 32rpx;
	padding: 36rpx 32rpx;
	color: #FFF;
	box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.05);
	overflow: hidden;
	box-sizing: border-box;
	
	/* 背景渐变色 */
	&.orange-bg {
		background: linear-gradient(135deg, #FFA726, #F57C00);
		box-shadow: 0 10rpx 30rpx rgba(245, 124, 0, 0.22);
	}
	&.purple-bg {
		background: linear-gradient(135deg, #AB47BC, #7B1FA2);
		box-shadow: 0 10rpx 30rpx rgba(123, 31, 162, 0.22);
	}
	&.grey-bg {
		background: linear-gradient(135deg, #B0BEC5, #78909C);
		box-shadow: 0 10rpx 30rpx rgba(120, 144, 156, 0.15);
	}
	
	/* 装饰波纹 */
	.card-wave {
		position: absolute;
		right: -40rpx;
		bottom: -40rpx;
		width: 220rpx;
		height: 220rpx;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.08);
		
		&::after {
			content: '';
			position: absolute;
			left: 20rpx;
			top: 20rpx;
			width: 180rpx;
			height: 180rpx;
			border-radius: 50%;
			background: rgba(255, 255, 255, 0.05);
		}
	}
}

.card-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 24rpx;
	
	.card-type-tag {
		background: rgba(255, 255, 255, 0.25);
		font-size: 20rpx;
		padding: 4rpx 16rpx;
		border-radius: 6rpx;
		font-weight: bold;
	}
	.card-status-name {
		font-size: 22rpx;
		color: rgba(255, 255, 255, 0.85);
	}
}

.card-body {
	display: flex;
	justify-content: space-between;
	align-items: flex-end;
	margin-bottom: 30rpx;
	
	.card-name {
		font-size: 38rpx;
		font-weight: bold;
		max-width: 60%;
		line-height: 1.35;
	}
	
	.limit-section {
		text-align: right;
		
		.limit-num {
			font-size: 64rpx;
			font-weight: bold;
			line-height: 1;
		}
		.limit-unit {
			font-size: 26rpx;
			font-weight: bold;
			margin-left: 4rpx;
		}
		.limit-label {
			display: block;
			font-size: 20rpx;
			color: rgba(255, 255, 255, 0.8);
			margin-top: 6rpx;
		}
	}
}

.card-footer {
	border-top: 1rpx solid rgba(255, 255, 255, 0.15);
	padding-top: 20rpx;
	display: flex;
	justify-content: space-between;
	align-items: flex-end;
	
	.footer-desc {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 6rpx;
		margin-right: 16rpx;
	}
	.desc-line {
		font-size: 22rpx;
		color: rgba(255, 255, 255, 0.9);
	}
	.expire-time {
		font-size: 20rpx;
		color: rgba(255, 255, 255, 0.8);
		white-space: nowrap;
	}
}

/* ===== 底部悬浮按钮 ===== */
.footer-actions {
	padding: 24rpx 32rpx;
	padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
	background: #FFF;
	border-top: 1rpx solid #F5EBE0;
	z-index: 100;
}
.buy-more-btn {
	background: linear-gradient(135deg, #FFB74D, #FF8C42);
	color: #FFF;
	padding: 24rpx 0;
	border-radius: 999rpx;
	text-align: center;
	box-shadow: 0 6rpx 20rpx rgba(255, 140, 66, 0.25);
	
	.btn-text {
		font-size: 30rpx;
		font-weight: bold;
	}
}
</style>
