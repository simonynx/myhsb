<template>
	<view class="welcome-page">
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
			<view class="sun"></view>

			<view class="hero-content">
				<text class="hero-emoji">✨</text>
				<text class="hero-title">欢迎来到摸鱼划水吧</text>
				<text class="hero-sub">填个信息，马上开玩～</text>
			</view>

			<view class="grass-hill">
				<text class="blade">🌿</text>
				<text class="blade">🌱</text>
				<text class="blade">🌿</text>
			</view>
		</view>

		<!-- 表单卡片 -->
		<view class="form-card">
			<!-- 头像 -->
			<view class="form-item avatar-item">
				<view class="avatar-picker" @click="pickAvatar">
					<image class="avatar-img" :src="avatar || '/static/missing-face.png'" mode="aspectFill"></image>
					<view class="avatar-badge" v-if="!avatar">📷</view>
				</view>
				<view class="avatar-hint">
					<text class="hint-title">选一个喜欢的头像</text>
					<text class="hint-sub">点一下就能换</text>
				</view>
			</view>

			<view class="divider"></view>

			<!-- 昵称 -->
			<view class="form-item">
				<view class="item-left">
					<text class="item-icon">✏️</text>
					<text class="item-label">昵称</text>
				</view>
				<input
					class="item-input"
					type="nickname"
					v-model="nickname"
					placeholder="叫我小透明~"
					placeholder-class="placeholder"
					maxlength="20"
				/>
			</view>

			<view class="divider"></view>

			<!-- 手机号 -->
			<view class="form-item">
				<view class="item-left">
					<text class="item-icon">📱</text>
					<text class="item-label">手机号</text>
				</view>
				<view class="phone-wrap">
					<text class="phone-text" :class="{ empty: !phone }">
						{{ phone || '预约成功会短信通知你' }}
					</text>
					<button class="phone-btn" open-type="getPhoneNumber" @getphonenumber="onGetPhoneNumber">
						{{ phone ? '更换' : '授权手机号' }}
					</button>
				</view>
			</view>

			<view class="divider"></view>

			<!-- 订阅消息 -->
			<view class="form-item subscribe-item">
				<view class="item-left">
					<text class="item-icon">🔔</text>
					<text class="item-label">消息通知</text>
				</view>
				<view class="toggle-wrap" @click="toggleSubscribe">
					<view class="toggle" :class="{ on: subscribeEnabled }">
						<view class="toggle-dot"></view>
					</view>
				</view>
			</view>

			<view class="divider"></view>

			<!-- 邀请码 -->
			<view class="form-item">
				<view class="item-left">
					<text class="item-icon">🎁</text>
					<text class="item-label">邀请码</text>
				</view>
				<input
					class="item-input invite-input"
					v-model="inviteCode"
					placeholder="有码填，无码跳过"
					placeholder-class="placeholder"
					maxlength="12"
				/>
			</view>
		</view>

		<!-- 底部固定按钮区 -->
		<view class="bottom-btn">
			<view class="bottom-tip">
				<text>以上均可跳过，之后随时补充</text>
			</view>
			<button class="enter-btn" @click="complete">
				<text>开启摸鱼之旅 🚀</text>
			</button>
		</view>
	</view>
</template>

<script>
import { mapState, mapActions } from 'vuex';
import AUTH from '../../../utils/auth.js';

export default {
	data() {
		return {
			nickname: '',
			avatar: '',
			phone: '',
			inviteCode: '',
			subscribeEnabled: false,
		};
	},
	computed: {
		...mapState(['pending_invite_code', 'token']),
	},
	onLoad() {
		if (this.pending_invite_code) {
			this.inviteCode = this.pending_invite_code;
		}
	},
	methods: {
		...mapActions(['completeOnboarding']),
		pickAvatar() {
			uni.chooseImage({
				count: 1,
				sizeType: ['compressed'],
				sourceType: ['album', 'camera'],
				success: (res) => {
					const tempPath = res.tempFilePaths[0];
					this.avatar = tempPath;
					AUTH.uploadFile(this.token, tempPath, 'avatar.jpg').then((url) => {
						this.avatar = url;
					}).catch((err) => {
						console.error('头像上传失败', err);
					});
				}
			});
		},
		onGetPhoneNumber(e) {
			if (e.detail.errMsg !== 'getPhoneNumber:ok') {
				return;
			}
			AUTH.getPhoneNumber(e, this.token).then((res) => {
				if (res.data && res.data.phoneNumber) {
					this.phone = res.data.phoneNumber;
				}
			}).catch((err) => {
				uni.showToast({ title: '获取手机号失败', icon: 'none' });
			});
		},
		async toggleSubscribe() {
			if (this.subscribeEnabled) {
				this.subscribeEnabled = false;
				return;
			}
			try {
				const granted = await AUTH.requestSubscribeMessage();
				this.subscribeEnabled = granted;
			} catch (e) {
				this.subscribeEnabled = false;
			}
		},
		complete() {
			uni.showLoading({ title: '请稍候...' });
			this.completeOnboarding({
				nickname: this.nickname,
				avatar: this.avatar,
				phone: this.phone,
				invite_code: this.inviteCode,
			}).then(() => {
				uni.hideLoading();
				uni.navigateBack();
			}).catch(() => {
				uni.hideLoading();
				uni.navigateBack();
			});
		},
	},
};
</script>

<style lang="scss">
page { background: #FFF8F0; }

.welcome-page {
	min-height: 100vh;
	padding-bottom: calc(260rpx + env(safe-area-inset-bottom));
	position: relative;
}

/* ===== 天空背景 ===== */
.sky-header {
	position: relative;
	background: linear-gradient(180deg, #FFF0E0 0%, #FFF5EC 50%, #FFF8F0 100%);
	padding: 80rpx 48rpx 60rpx;
	overflow: hidden;
	text-align: center;
}
.cloud {
	position: absolute;
	background: #FFF;
	border-radius: 60rpx;
	opacity: 0.85;
	box-shadow: 0 4rpx 16rpx rgba(92,75,58,0.08);
}
.cloud .puff {
	position: absolute;
	background: #FFF;
	border-radius: 50%;
	box-shadow: 0 2rpx 8rpx rgba(92,75,58,0.05);
}
.cloud-1 {
	width: 140rpx; height: 44rpx;
	top: 30rpx; right: 40rpx;
	animation: float 12s ease-in-out infinite;
}
.cloud-1 .p1 { width: 56rpx; height: 56rpx; top: -26rpx; left: 16rpx; }
.cloud-1 .p2 { width: 44rpx; height: 44rpx; top: -18rpx; right: 20rpx; }
.cloud-1 .p3 { width: 36rpx; height: 36rpx; top: -10rpx; left: 52rpx; }
.cloud-2 {
	width: 100rpx; height: 32rpx;
	top: 60rpx; left: 32rpx;
	opacity: 0.7;
	animation: float 14s ease-in-out infinite;
	animation-delay: -5s;
}
.cloud-2 .p1 { width: 40rpx; height: 40rpx; top: -18rpx; left: 12rpx; }
.cloud-2 .p2 { width: 32rpx; height: 32rpx; top: -12rpx; right: 14rpx; }
.sun {
	position: absolute;
	top: 24rpx; right: 180rpx;
	width: 60rpx; height: 60rpx;
	background: #FFD54F;
	border-radius: 50%;
	box-shadow: 0 0 32rpx rgba(255, 213, 79, 0.5), 0 0 60rpx rgba(255, 213, 79, 0.2);
}
@keyframes float {
	0%, 100% { transform: translateX(0); }
	50% { transform: translateX(20rpx); }
}
.hero-content {
	position: relative;
	z-index: 2;
}
.hero-emoji { display: block; font-size: 72rpx; margin-bottom: 16rpx; }
.hero-title {
	display: block;
	font-size: 44rpx;
	font-weight: 800;
	color: #5C4B3A;
	margin-bottom: 12rpx;
	letter-spacing: 2rpx;
}
.hero-sub {
	display: block;
	font-size: 26rpx;
	color: #A08B7A;
}
.grass-hill {
	position: absolute;
	bottom: -10rpx; left: -10%; right: -10%;
	height: 50rpx;
	background: linear-gradient(180deg, transparent 0%, #A5D6A7 100%);
	border-radius: 50% 50% 0 0 / 100% 100% 0 0;
	display: flex;
	justify-content: space-around;
	align-items: flex-end;
	padding: 0 15%;
}
.grass-hill .blade {
	font-size: 28rpx;
	margin-bottom: 6rpx;
	animation: grass-sway 3s ease-in-out infinite;
}
.grass-hill .blade:nth-child(1) { animation-delay: 0s; }
.grass-hill .blade:nth-child(2) { animation-delay: 0.5s; }
.grass-hill .blade:nth-child(3) { animation-delay: 1s; }
@keyframes grass-sway {
	0%, 100% { transform: rotate(-8deg); }
	50% { transform: rotate(8deg); }
}

/* ===== 表单卡片 ===== */
.form-card {
	margin: -32rpx 28rpx 0;
	background: #FFF;
	border-radius: 32rpx;
	box-shadow: 0 8rpx 40rpx rgba(92, 75, 58, 0.08);
	overflow: hidden;
	position: relative;
	z-index: 2;
	border: 2rpx solid rgba(255, 181, 167, 0.15);
}

.divider {
	height: 1rpx;
	background: #F5E6D8;
	margin: 0 32rpx;
}

.form-item {
	display: flex;
	align-items: center;
	padding: 28rpx 32rpx;
}

/* 头像 */
.avatar-item {
	flex-direction: column;
	align-items: center;
	padding: 40rpx 32rpx 28rpx;
	.avatar-picker {
		position: relative;
		width: 150rpx;
		height: 150rpx;
		border-radius: 50%;
		border: 6rpx solid #FFE8D6;
		box-shadow: 0 8rpx 24rpx rgba(255, 140, 66, 0.18);
		overflow: hidden;
		.avatar-img {
			width: 100%;
			height: 100%;
			border-radius: 50%;
		}
		.avatar-badge {
			position: absolute;
			bottom: 4rpx;
			right: 4rpx;
			width: 44rpx;
			height: 44rpx;
			background: linear-gradient(135deg, #FFB5A7, #FF8C42);
			border-radius: 50%;
			display: flex;
			align-items: center;
			justify-content: center;
			font-size: 22rpx;
			border: 2rpx solid #FFF;
		}
	}
	.avatar-hint {
		margin-top: 16rpx;
		text-align: center;
		.hint-title { display: block; font-size: 28rpx; color: #5C4B3A; font-weight: bold; }
		.hint-sub { display: block; font-size: 22rpx; color: #A08B7A; margin-top: 4rpx; }
	}
}

/* 左右布局 */
.item-left {
	display: flex;
	align-items: center;
	gap: 12rpx;
	width: 160rpx;
	flex-shrink: 0;
	.item-icon { font-size: 32rpx; }
	.item-label { font-size: 28rpx; color: #5C4B3A; font-weight: 500; }
}
.item-input {
	flex: 1;
	font-size: 28rpx;
	color: #5C4B3A;
	text-align: right;
}
.placeholder { color: #C4B5A5; }

/* 手机号 */
.phone-wrap {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 16rpx;
	.phone-text {
		font-size: 26rpx;
		color: #8D6E63;
		flex: 1;
		text-align: right;
		&.empty { color: #C4B5A5; font-size: 24rpx; }
	}
	.phone-btn {
		font-size: 24rpx;
		background: linear-gradient(135deg, #FFB5A7, #FF8C42);
		color: #FFF;
		border-radius: 30rpx;
		padding: 0 20rpx;
		line-height: 2.2;
		flex-shrink: 0;
		&::after { border: none; }
	}
}

/* 订阅开关 */
.subscribe-item {
	.item-left { width: auto; }
}
.toggle-wrap { flex: 1; display: flex; justify-content: flex-end; }
.toggle {
	width: 96rpx;
	height: 52rpx;
	border-radius: 26rpx;
	background: #E0D5CC;
	position: relative;
	transition: background 0.3s;
	&.on { background: linear-gradient(135deg, #FFB5A7, #FF8C42); }
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

/* 邀请码 */
.invite-input {
	letter-spacing: 2rpx;
	font-weight: bold;
	color: #FF8C42;
}

/* ===== 底部 ===== */
.bottom-btn {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	padding: 16rpx 40rpx calc(40rpx + env(safe-area-inset-bottom));
	background: linear-gradient(to top, #FFF8F0 80%, transparent);
}
.bottom-tip {
	text-align: center;
	padding-bottom: 16rpx;
	font-size: 22rpx;
	color: #C4B5A5;
}
.enter-btn {
	width: 100%;
	background: linear-gradient(135deg, #FFB5A7 0%, #FF8C42 100%);
	color: #FFF;
	font-size: 34rpx;
	font-weight: bold;
	border-radius: 50rpx;
	line-height: 2.8;
	text-align: center;
	box-shadow: 0 8rpx 32rpx rgba(255, 140, 66, 0.30);
	&::after { border: none; }
}
</style>