<template>
	<view class="page-wrapper">

		<!-- 头像 -->
		<view class="avatar-section">
			<view class="avatar-wrapper">
				<button class="avatar-btn" open-type="chooseAvatar" @chooseavatar="chooseAvatarEvent">
					<image class="avatar-img" :src="userInfo.avatar || '/static/missing-face.png'" mode="aspectFill"></image>
					<view class="avatar-edit-badge">
						<text class="edit-icon">📷</text>
					</view>
				</button>
			</view>
			<text class="avatar-tip">点击更换头像</text>
		</view>

		<!-- 信息表单 -->
		<view class="form-section">
			<view class="form-item">
				<text class="form-label">昵称</text>
				<input
					class="form-input"
					type="nickname"
					v-model="userInfo.nickname"
					@blur="bindnickName"
					placeholder="给自己取个名字吧"
					placeholder-style="color: #CCC;"
				/>
			</view>

			<view class="form-item">
				<text class="form-label">手机号</text>
				<input
					class="form-input"
					type="tel"
					v-model="userInfo.phone"
					@blur="bindmobile"
					placeholder="用于接收预约通知"
					placeholder-style="color: #CCC;"
				/>
			</view>

			<view class="form-item">
				<text class="form-label">性别</text>
				<picker class="form-picker" mode='selector' range-key="name" :value="userInfo.gender" :range="sex" @change="bindPickerChange">
					<view class="picker-value">
						{{ sex[genderIndex].name }}
						<text class="picker-arrow">›</text>
					</view>
				</picker>
			</view>

			<view class="form-item">
				<text class="form-label">生日</text>
				<picker class="form-picker" mode="date" :value="date" @change="bindDateChange">
					<view class="picker-value">
						{{ date || '填写生日有惊喜哦' }}
						<text class="picker-arrow">›</text>
					</view>
				</picker>
			</view>
		</view>

		<!-- 保存按钮 -->
		<view class="save-btn" @tap="saveProfile">
			<text class="btn-text">保存修改</text>
		</view>

		<!-- 其他功能 -->
		<view class="menu-section">
			<view class="menu-item" @tap="showVipInfo">
				<text class="menu-icon">👑</text>
				<text class="menu-text">会员权益说明</text>
				<text class="menu-arrow">→</text>
			</view>
			<view class="menu-item" @tap="showBalance">
				<text class="menu-icon">💰</text>
				<text class="menu-text">余额明细</text>
				<text class="menu-arrow">→</text>
			</view>
			<view class="menu-item" @tap="logout">
				<text class="menu-icon logout-icon">🚪</text>
				<text class="menu-text logout-text">退出登录</text>
				<text class="menu-arrow">→</text>
			</view>
		</view>
	</view>
</template>

<script>
	import { mapState, mapActions, mapMutations } from 'vuex';
	import AUTH from '../../../utils/auth.js';

	export default {
		computed: {
			...mapState(['hasLogin', 'userInfo', 'token']),
			genderIndex() {
				return this.userInfo?.gender || 1;
			},
		},
		data() {
			return {
				sex: [
					{ name: '男', value: 1 },
					{ name: '女', value: 0 },
				],
				date: '',
			};
		},
		onLoad() {
			if (this.userInfo?.birthday) {
				this.date = this.userInfo.birthday;
			}
		},
		methods: {
			...mapActions(['getUserInfo', 'requestUpdateUserInfo']),
			...mapMutations(['updateUserInfo']),
			chooseAvatarEvent(e) {
				var avatarUrl = e.detail.avatarUrl;
				// 上传头像
				uni.showLoading({ title: '上传中...' });
				uni.uploadFile({
					url: 'https://api.moyuhuashui.top/api/v1/upload/avatar',
					filePath: avatarUrl,
					name: 'file',
					header: { 'Authorization': 'Token ' + this.token },
					success: (res) => {
						uni.hideLoading();
						var data = JSON.parse(res.data);
						if (data._status === 0) {
							this.userInfo.avatar = data.data;
							this.updateUserInfo({ avatar: data.data });
							this.saveProfile();
						} else {
							uni.showToast({ title: '上传失败', icon: 'none' });
						}
					},
					fail: () => {
						uni.hideLoading();
						uni.showToast({ title: '上传失败', icon: 'none' });
					},
				});
			},
			bindnickName(e) {
				this.userInfo.nickname = e.detail.value;
				this.updateUserInfo({ nickname: e.detail.value });
			},
			bindmobile(e) {
				this.userInfo.phone = e.detail.value;
				this.updateUserInfo({ phone: e.detail.value });
			},
			bindPickerChange(e) {
				this.userInfo.gender = parseInt(e.detail.value) === 0 ? 1 : 0;
				this.updateUserInfo({ gender: this.userInfo.gender });
			},
			bindDateChange(e) {
				this.date = e.detail.value;
				this.userInfo.birthday = e.detail.value;
				this.updateUserInfo({ birthday: e.detail.value });
			},
			saveProfile() {
				uni.showLoading({ title: '保存中...' });
				this.requestUpdateUserInfo().then((res) => {
					uni.hideLoading();
					uni.showToast({ title: '保存成功', icon: 'success' });
				}).catch((err) => {
					uni.hideLoading();
					uni.showToast({ title: '保存失败', icon: 'none' });
				});
			},
			showVipInfo() {
				uni.showModal({
					title: '会员权益',
					content: '🌱 普通会员：充值享积分\n🥈 银卡会员：充值享积分 + 9.5折\n🥇 金卡会员：充值享积分 + 9折优惠\n💎 钻石会员：充值享积分 + 8折优惠 + 优先预约',
					showCancel: false,
				});
			},
			showBalance() {
				uni.showModal({
					title: '余额说明',
					content: '余额可用于：\n• 预约房间\n• 购买商品\n• 更多功能陆续上线...\n\n如需充值，请到充值中心',
					showCancel: false,
				});
			},
			logout() {
				uni.showModal({
					title: '退出登录',
					content: '确定要退出登录吗？',
					success: (res) => {
						if (res.confirm) {
							uni.clearStorageSync();
							uni.reLaunch({ url: '/pages/index/index' });
						}
					},
				});
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
	padding-top: env(safe-area-inset-top);
	padding-bottom: 40rpx;
}

/* ===== 顶部 ===== */
/* ===== 头像 ===== */
.avatar-section {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 40rpx 0 24rpx;
	.avatar-wrapper {
		position: relative;
		.avatar-btn {
			width: 160rpx;
			height: 160rpx;
			padding: 0;
			margin: 0;
			background: none;
			border: none;
			line-height: 1;
			.avatar-img {
				width: 160rpx;
				height: 160rpx;
				border-radius: 50%;
				border: 6rpx solid #FFE5EE;
				box-shadow: 0 8rpx 24rpx rgba(255,107,157,0.2);
			}
			.avatar-edit-badge {
				position: absolute;
				bottom: 0;
				right: 0;
				width: 50rpx;
				height: 50rpx;
				background: linear-gradient(135deg, #FF9ECD, #FF6B9D);
				border-radius: 50%;
				display: flex;
				align-items: center;
				justify-content: center;
				.edit-icon { font-size: 24rpx; }
			}
		}
	}
	.avatar-tip {
		font-size: 24rpx;
		color: #999;
		margin-top: 12rpx;
	}
}

/* ===== 表单 ===== */
.form-section {
	margin: 0 24rpx 32rpx;
	background: #FFF;
	border-radius: 28rpx;
	box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
	overflow: hidden;
}
.form-item {
	display: flex;
	align-items: center;
	padding: 32rpx 24rpx;
	border-bottom: 1rpx solid #F5F5F5;
	&:last-child { border-bottom: none; }
	.form-label {
		width: 120rpx;
		font-size: 28rpx;
		color: #666;
		flex-shrink: 0;
	}
	.form-input {
		flex: 1;
		font-size: 28rpx;
		color: #333;
		text-align: right;
	}
	.form-picker {
		flex: 1;
		.picker-value {
			display: flex;
			align-items: center;
			justify-content: flex-end;
			font-size: 28rpx;
			color: #333;
			.picker-arrow {
				font-size: 32rpx;
				color: #CCC;
				margin-left: 8rpx;
			}
		}
	}
}

/* ===== 保存按钮 ===== */
.save-btn {
	margin: 0 24rpx 32rpx;
	background: linear-gradient(135deg, #FF9ECD, #FF6B9D);
	border-radius: 50rpx;
	padding: 28rpx;
	text-align: center;
	box-shadow: 0 8rpx 32rpx rgba(255,107,157,0.4);
	.btn-text {
		color: #FFF;
		font-size: 32rpx;
		font-weight: bold;
	}
}

/* ===== 菜单 ===== */
.menu-section {
	margin: 0 24rpx;
	background: #FFF;
	border-radius: 24rpx;
	overflow: hidden;
	box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
	.menu-item {
		display: flex;
		align-items: center;
		padding: 32rpx 24rpx;
		border-bottom: 1rpx solid #F5F5F5;
		&:last-child { border-bottom: none; }
		.menu-icon { font-size: 36rpx; margin-right: 16rpx; }
		.menu-text {
			flex: 1;
			font-size: 28rpx;
			color: #333;
		}
		.menu-arrow { font-size: 28rpx; color: #CCC; }
		.logout-icon { }
		.logout-text { color: #FF6B6B; }
	}
}
</style>
