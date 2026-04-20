<template>
	<view class="welcome-page">
		<!-- 顶部欢迎区 -->
		<view class="welcome-hero">
			<view class="hero-particles">
				<view class="particle p1"></view>
				<view class="particle p2"></view>
				<view class="particle p3"></view>
				<view class="particle p4"></view>
			</view>
			<view class="hero-content">
				<text class="hero-emoji">✨</text>
				<text class="hero-title">欢迎来到摸鱼划水吧</text>
				<text class="hero-sub">一键授权即可开始美好的休闲时光</text>
			</view>
		</view>

		<!-- 表单卡片 -->
		<view class="form-card">
			<!-- 头像 -->
			<view class="form-item avatar-item">
				<view class="avatar-picker" @click="pickAvatar">
					<image class="avatar-img" :src="avatar || '/static/missing-face.png'" mode="aspectFill"></image>
					<view class="avatar-overlay">
						<text class="avatar-overlay-text">更换头像</text>
					</view>
				</view>
				<view class="avatar-hint">
					<text class="hint-title">设置头像</text>
					<text class="hint-sub">让自己更有辨识度</text>
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
						{{ phone || '预约通知、优惠活动第一时间推送给你' }}
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

		<!-- 底部说明 -->
		<view class="bottom-tip">
			<text>以上均可跳过，之后随时补充</text>
		</view>

		<!-- 进入按钮 -->
		<view class="bottom-btn">
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
page {
	background: #FFF9F5;
}
.welcome-page {
	min-height: 100vh;
	padding-bottom: 180rpx;
	position: relative;
}

/* ===== 顶部英雄区 ===== */
.welcome-hero {
	position: relative;
	background: linear-gradient(160deg, #FFECD9 0%, #FFF0E8 40%, #FFE5EE 100%);
	padding: 80rpx 48rpx 64rpx;
	overflow: hidden;
	.hero-particles {
		position: absolute;
		inset: 0;
		.particle {
			position: absolute;
			border-radius: 50%;
			background: linear-gradient(135deg, #FF9ECD, #FF6B9D);
			opacity: 0.15;
		}
		.p1 { width: 240rpx; height: 240rpx; top: -80rpx; right: -60rpx; }
		.p2 { width: 160rpx; height: 160rpx; top: 40rpx; right: 80rpx; opacity: 0.08; }
		.p3 { width: 100rpx; height: 100rpx; bottom: -30rpx; left: -20rpx; }
		.p4 { width: 200rpx; height: 200rpx; bottom: -60rpx; right: -40rpx; opacity: 0.1; }
	}
	.hero-content {
		position: relative;
		text-align: center;
	}
	.hero-emoji { display: block; font-size: 72rpx; margin-bottom: 16rpx; }
	.hero-title {
		display: block;
		font-size: 44rpx;
		font-weight: 800;
		color: #FF6B9D;
		margin-bottom: 16rpx;
		letter-spacing: 2rpx;
	}
	.hero-sub {
		display: block;
		font-size: 26rpx;
		color: #BB9988;
		line-height: 1.6;
	}
}

/* ===== 表单卡片 ===== */
.form-card {
	margin: -32rpx 28rpx 0;
	background: #FFF;
	border-radius: 32rpx;
	box-shadow: 0 8rpx 40rpx rgba(255, 107, 157, 0.12);
	overflow: hidden;
	position: relative;
	z-index: 2;
}

.divider {
	height: 1rpx;
	background: #FDF0FA;
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
	padding: 36rpx 32rpx 28rpx;
	.avatar-picker {
		position: relative;
		width: 140rpx;
		height: 140rpx;
		border-radius: 50%;
		border: 6rpx solid #FFE5EE;
		box-shadow: 0 8rpx 24rpx rgba(255, 107, 157, 0.18);
		overflow: hidden;
		.avatar-img {
			width: 100%;
			height: 100%;
			border-radius: 50%;
		}
		.avatar-overlay {
			position: absolute;
			inset: 0;
			background: rgba(0,0,0,0.45);
			display: flex;
			align-items: center;
			justify-content: center;
			border-radius: 50%;
			.avatar-overlay-text {
				font-size: 22rpx;
				color: #FFF;
			}
		}
	}
	.avatar-hint {
		margin-top: 16rpx;
		text-align: center;
		.hint-title { display: block; font-size: 26rpx; color: #333; font-weight: bold; }
		.hint-sub { display: block; font-size: 22rpx; color: #BBB; margin-top: 4rpx; }
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
	.item-label { font-size: 28rpx; color: #666; font-weight: 500; }
}
.item-input {
	flex: 1;
	font-size: 28rpx;
	color: #333;
	text-align: right;
}
.placeholder { color: #CCC; }

/* 手机号 */
.phone-wrap {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 16rpx;
	.phone-text {
		font-size: 26rpx;
		color: #999;
		flex: 1;
		text-align: right;
		&.empty { color: #CCC; font-size: 24rpx; }
	}
	.phone-btn {
		font-size: 24rpx;
		background: linear-gradient(135deg, #FF9ECD, #FF6B9D);
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
	background: #E8E8E8;
	position: relative;
	transition: background 0.3s;
	&.on { background: linear-gradient(135deg, #FF9ECD, #FF6B9D); }
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
	color: #FF6B9D;
}

/* ===== 底部 ===== */
.bottom-tip {
	text-align: center;
	padding: 28rpx 0 16rpx;
	font-size: 22rpx;
	color: #CCC;
}
.bottom-btn {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	padding: 16rpx 40rpx 60rpx;
	background: linear-gradient(to top, #FFF9F5 70%, transparent);
}
.enter-btn {
	width: 100%;
	background: linear-gradient(135deg, #FF9ECD 0%, #FF6B9D 100%);
	color: #FFF;
	font-size: 34rpx;
	font-weight: bold;
	border-radius: 50rpx;
	line-height: 2.8;
	text-align: center;
	box-shadow: 0 8rpx 32rpx rgba(255, 107, 157, 0.35);
	&::after { border: none; }
}
</style>
