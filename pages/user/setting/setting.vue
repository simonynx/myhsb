<template>
	<view class="page-wrapper">
		<!-- 头像区 -->
		<view class="avatar-section">
			<view class="avatar-wrapper">
				<button class="avatar-btn" open-type="chooseAvatar" @chooseavatar="chooseAvatarEvent">
					<image class="avatar-img" :src="avatarUrl || '/static/missing-face.png'" mode="aspectFill"></image>
					<view class="avatar-edit-badge">
						<text class="edit-icon">📷</text>
					</view>
				</button>
			</view>
			<text class="user-nickname">{{ form.nickname || '游客' }}</text>
			<text class="avatar-tip">点击更换头像</text>
		</view>

		<!-- 每日签到 -->
		<view class="checkin-card" v-if="hasLogin">
			<view class="checkin-left">
				<text class="checkin-icon">📅</text>
				<view class="checkin-info">
					<text class="checkin-title">每日签到</text>
					<text class="checkin-streak" v-if="checkInInfo.current_streak > 0">已连续 {{ checkInInfo.current_streak }} 天</text>
					<text class="checkin-streak" v-else>今日未签到</text>
				</view>
			</view>
			<view class="checkin-btn" :class="checkInInfo.can_check_in ? 'can' : 'done'" @click="doCheckIn">
				<text v-if="checkInInfo.checked_in_today">已签到 ✓</text>
				<text v-else-if="checkInInfo.can_check_in">签到 +{{ checkInInfo.config && checkInInfo.config.daily_points || '?' }}积分</text>
				<text v-else>明日再来</text>
			</view>
		</view>

		<!-- 个人资料 -->
		<view class="section">
			<view class="section-title">个人资料</view>
			<view class="card">
				<view class="form-item">
					<text class="form-label">昵称</text>
					<input
						class="form-input"
						type="nickname"
						:value="form.nickname"
						@input="onNicknameInput"
						@blur="onNicknameBlur"
						placeholder="给自己取个名字吧"
						placeholder-style="color: #CCC;"
					/>
				</view>

				<view class="form-item">
					<text class="form-label">性别</text>
					<picker class="form-picker" mode='selector' range-key="name" :value="genderIndex" :range="sex" @change="bindPickerChange">
						<view class="picker-value">
							{{ sex[genderIndex].name }}
							<text class="picker-arrow">›</text>
						</view>
					</picker>
				</view>

				<view class="form-item">
					<text class="form-label">生日</text>
					<picker class="form-picker" mode="date" :value="form.birthday" @change="bindDateChange">
						<view class="picker-value">
							{{ form.birthday || '填写生日有惊喜哦' }}
							<text class="picker-arrow">›</text>
						</view>
					</picker>
				</view>

				<view class="form-item tag-item">
					<text class="form-label">兴趣标签</text>
				</view>
				<view class="tag-wrap">
					<view
						class="tag"
						v-for="tag in tagList"
						:key="tag"
						:class="{ active: selectedTags.includes(tag) }"
						@click="toggleTag(tag)"
					>
						{{ tag }}
					</view>
				</view>
			</view>
		</view>

		<!-- 账号安全 -->
		<view class="section">
			<view class="section-title">账号安全</view>
			<view class="card">
				<view class="form-item">
					<text class="form-label">手机号</text>
					<view class="phone-row">
						<text class="phone-value">{{ form.phone || '未绑定' }}</text>
						<button class="phone-btn" open-type="getPhoneNumber" @getphonenumber="onGetPhoneNumber">
							{{ form.phone ? '更换' : '授权' }}
						</button>
					</view>
				</view>
			</view>
		</view>

		<!-- 设置 -->
		<view class="section">
			<view class="section-title">设置</view>
			<view class="card">
				<view class="form-item subscribe-item">
					<view class="item-left">
						<text class="item-icon">🔔</text>
						<view class="item-info">
							<text class="item-label">消息通知</text>
							<text class="item-desc">预约提醒、活动通知</text>
						</view>
					</view>
					<view class="toggle-wrap" @click="toggleSubscribe">
						<view class="toggle" :class="{ on: subscribeEnabled }">
							<view class="toggle-dot"></view>
						</view>
					</view>
				</view>

				<view class="form-item" v-if="!form.invite_code" @click="showInviteCode">
					<view class="item-left">
						<text class="item-icon">🎁</text>
						<view class="item-info">
							<text class="item-label">填写邀请码</text>
							<text class="item-desc">双方均可获得积分奖励</text>
						</view>
					</view>
					<text class="picker-arrow">›</text>
				</view>

				<view class="form-item" @click="clearCache">
					<view class="item-left">
						<text class="item-icon">🗑️</text>
						<view class="item-info">
							<text class="item-label">清除缓存</text>
							<text class="item-desc">清理本地临时数据</text>
						</view>
					</view>
					<text class="picker-arrow">›</text>
				</view>

				<view class="form-item" @click="showAbout">
					<view class="item-left">
						<text class="item-icon">ℹ️</text>
						<view class="item-info">
							<text class="item-label">关于我们</text>
							<text class="item-desc">版本信息、联系方式</text>
						</view>
					</view>
					<text class="picker-arrow">›</text>
				</view>

				<view class="form-item">
					<view class="item-left">
						<text class="item-icon">💬</text>
						<view class="item-info">
							<text class="item-label">联系客服</text>
							<text class="item-desc">有问题找我们</text>
						</view>
					</view>
					<button class="contact-btn" open-type="contact">进入</button>
				</view>
			</view>
		</view>

		<!-- 保存按钮 -->
		<view class="save-btn" @tap="saveProfile">
			<text class="btn-text">保存修改</text>
		</view>

		<!-- 退出登录 -->
		<view class="logout-section">
			<view class="logout-btn" @tap="logout">
				<text class="logout-text">退出登录</text>
			</view>
		</view>
	</view>
</template>

<script>
	import { mapState, mapActions, mapMutations } from 'vuex';
	import AUTH from '../../../utils/auth.js';

	export default {
		computed: {
			...mapState(['hasLogin', 'userInfo', 'token', 'subscribeAuthorized']),
			genderIndex() {
				if (!this.form) return 0;
				return this.form.gender === 0 ? 1 : 0;
			},
			avatarUrl() {
				return AUTH.parseAvatarUrl(this.form.avatar);
			},
			subscribeEnabled() {
				return this.subscribeAuthorized || false;
			},
		},
		data() {
			return {
				sex: [
					{ name: '男', value: 1 },
					{ name: '女', value: 0 },
				],
				form: {
					nickname: '',
					avatar: '',
					gender: 1,
					birthday: '',
					phone: '',
					invite_code: '',
				},
				checkInInfo: { checked_in_today: false, current_streak: 0, can_check_in: true, config: {} },
				tagList: ['PS5', 'Switch', '桌游', '剧本杀', '漫画', '亲子阅读'],
				selectedTags: [],
			};
		},
		watch: {
			userInfo: {
				immediate: true,
				handler(val) {
					if (val) {
						this.syncFromUserInfo(val);
					}
				},
			},
		},
		onLoad() {
			if (this.hasLogin) {
				this.loadCheckInInfo();
			}
		},
		onShow() {
			if (this.userInfo) {
				this.syncFromUserInfo(this.userInfo);
			}
			if (this.hasLogin) {
				this.loadCheckInInfo();
			}
		},
		methods: {
			...mapActions(['getUserInfo', 'requestUpdateUserInfo']),
			...mapMutations(['updateUserInfo', 'setSubscribeAuthorized']),

			syncFromUserInfo(val) {
				this.form.nickname = val.nickname || '';
				this.form.avatar = AUTH.parseAvatarUrl(val.avatar) || '';
				this.form.gender = val.gender !== undefined ? val.gender : 1;
				this.form.birthday = val.birthday || '';
				this.form.phone = val.phone || '';
				this.form.invite_code = val.invite_code || '';
				if (val.tags) {
					this.selectedTags = val.tags.split(',').map(t => t.trim()).filter(Boolean);
				} else {
					this.selectedTags = [];
				}
			},

			chooseAvatarEvent(e) {
				var avatarUrl = e.detail.avatarUrl;
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
							var url = (data.data && data.data.url) ? data.data.url : data.data;
							this.form.avatar = url;
							this.updateUserInfo({ avatar: url });
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

			onNicknameInput(e) {
				this.form.nickname = e.detail.value;
			},

			onNicknameBlur(e) {
				this.form.nickname = e.detail.value;
			},

			onGetPhoneNumber(e) {
				if (e.detail.errMsg !== 'getPhoneNumber:ok') return;
				AUTH.getPhoneNumber(e, this.token).then((res) => {
					if (res.data && res.data.phoneNumber) {
						this.form.phone = res.data.phoneNumber;
						this.updateUserInfo({ phone: res.data.phoneNumber });
						this.saveProfile();
					}
				}).catch((err) => {
					uni.showToast({ title: '获取手机号失败', icon: 'none' });
				});
			},

			bindPickerChange(e) {
				const idx = parseInt(e.detail.value);
				this.form.gender = idx === 0 ? 1 : 0;
			},

			bindDateChange(e) {
				this.form.birthday = e.detail.value;
			},

			async toggleSubscribe() {
				if (this.subscribeEnabled) {
					this.setSubscribeAuthorized(false);
					return;
				}
				try {
					const granted = await AUTH.requestSubscribeMessage();
					this.setSubscribeAuthorized(granted);
					if (granted) {
						uni.showToast({ title: '订阅成功', icon: 'success' });
					}
				} catch (e) {
					this.setSubscribeAuthorized(false);
				}
			},

			showInviteCode() {
				uni.showModal({
					title: '填写邀请码',
					editable: true,
					placeholderText: '请输入邀请码',
					success: (res) => {
						if (res.confirm && res.content && res.content.trim()) {
							this.applyInviteCode(res.content.trim());
						}
					}
				});
			},

			applyInviteCode(code) {
				uni.showLoading({ title: '请稍候...' });
				AUTH.applyInviteCode(this.token, code).then((res) => {
					uni.hideLoading();
					if (res._status === 0) {
						uni.showToast({ title: '绑定成功，双方各获得积分', icon: 'success' });
						this.getUserInfo();
					} else {
						uni.showToast({ title: res._reason || '邀请码无效', icon: 'none' });
					}
				}).catch(() => {
					uni.hideLoading();
					uni.showToast({ title: '邀请码无效', icon: 'none' });
				});
			},

			async loadCheckInInfo() {
				const res = await AUTH.checkInInfo(this.token);
				if (res && res._status === 0 && res.data) {
					this.checkInInfo = res.data;
				}
			},

			toggleTag(tag) {
				const idx = this.selectedTags.indexOf(tag);
				if (idx > -1) {
					this.selectedTags.splice(idx, 1);
				} else {
					this.selectedTags.push(tag);
				}
			},

			async doCheckIn() {
				if (!this.checkInInfo.can_check_in) {
					uni.showToast({ title: '今日已签到', icon: 'none' });
					return;
				}
				const res = await AUTH.checkIn(this.token);
				const d = res.data;
				if (d && d.points_earned !== undefined) {
					this.checkInInfo.checked_in_today = true;
					this.checkInInfo.can_check_in = false;
					this.checkInInfo.current_streak = (this.checkInInfo.current_streak || 0) + 1;
					uni.showToast({ title: d.message || '签到成功', icon: 'success' });
					this.getUserInfo();
				} else {
					uni.showToast({ title: (d && d.message) || '签到失败', icon: 'none' });
				}
			},

			clearCache() {
				uni.showModal({
					title: '清除缓存',
					content: '确定清除本地缓存吗？不会删除您的账号数据。',
					success: (res) => {
						if (res.confirm) {
							uni.clearStorageSync();
							uni.showToast({ title: '已清除', icon: 'success' });
						}
					}
				});
			},

			showAbout() {
				uni.showModal({
					title: '关于我们',
					content: '摸鱼划水吧 v1.0.0\n\n主机游戏 · 桌游 · 漫画小说 · 亲子阅读\n\n如有问题请联系客服',
					showCancel: false,
				});
			},

			saveProfile() {
				uni.showLoading({ title: '保存中...' });
				// 先同步到 Vuex，再调接口
				this.updateUserInfo({
					nickname: this.form.nickname,
					avatar: this.form.avatar,
					gender: this.form.gender,
					birthday: this.form.birthday,
					phone: this.form.phone,
					tags: this.selectedTags.join(','),
				});
				this.requestUpdateUserInfo().then((res) => {
					uni.hideLoading();
					uni.showToast({ title: '保存成功', icon: 'success' });
					// 重新拉取用户信息确保同步
					this.getUserInfo();
				}).catch((err) => {
					uni.hideLoading();
					uni.showToast({ title: '保存失败', icon: 'none' });
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
					}
				});
			},
		},
	};
</script>

<style lang="scss">
	page {
		background: #F5F6F7;
	}
	.page-wrapper {
		min-height: 100vh;
		padding-top: env(safe-area-inset-top);
		padding-bottom: calc(60rpx + env(safe-area-inset-bottom));
	}

	/* ===== 头像区 ===== */
	.avatar-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 48rpx 0 32rpx;
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
					border: 6rpx solid #FFF3E8;
					box-shadow: 0 8rpx 24rpx rgba(255,140,66,0.2);
				}
				.avatar-edit-badge {
					position: absolute;
					bottom: 0;
					right: 0;
					width: 50rpx;
					height: 50rpx;
					background: linear-gradient(135deg, #FFCC80, #FF8C42);
					border-radius: 50%;
					display: flex;
					align-items: center;
					justify-content: center;
					.edit-icon { font-size: 24rpx; }
				}
			}
		}
		.user-nickname {
			font-size: 36rpx;
			font-weight: bold;
			color: #333;
			margin-top: 20rpx;
		}
		.avatar-tip {
			font-size: 24rpx;
			color: #999;
			margin-top: 8rpx;
		}
	}

	/* ===== 签到卡片 ===== */
	.checkin-card {
		margin: 0 24rpx 24rpx;
		background: linear-gradient(135deg, #FFF8F0, #FFF3E8);
		border-radius: 20rpx;
		padding: 28rpx 24rpx;
		display: flex;
		align-items: center;
		justify-content: space-between;
		box-shadow: 0 4rpx 16rpx rgba(255,140,66,0.12);
		border: 1rpx solid #FFE8D6;
		.checkin-left {
			display: flex;
			align-items: center;
			.checkin-icon { font-size: 48rpx; margin-right: 16rpx; }
			.checkin-info {
				display: flex;
				flex-direction: column;
				.checkin-title { font-size: 30rpx; font-weight: bold; color: #333; }
				.checkin-streak { font-size: 24rpx; color: #FF8C42; margin-top: 4rpx; }
			}
		}
		.checkin-btn {
			font-size: 26rpx;
			padding: 14rpx 28rpx;
			border-radius: 30rpx;
			font-weight: bold;
			transition: transform 0.1s;
			&:active { transform: scale(0.95); }
			&.can {
				background: linear-gradient(135deg, #FFCC80, #FF8C42);
				color: #FFF;
				box-shadow: 0 4rpx 16rpx rgba(255,140,66,0.35);
			}
			&.done {
				background: #F0F0F0;
				color: #999;
			}
		}
	}

	/* ===== 分区标题 ===== */
	.section {
		margin: 0 24rpx 24rpx;
		.section-title {
			font-size: 24rpx;
			color: #999;
			margin-bottom: 12rpx;
			padding-left: 8rpx;
		}
	}

	/* ===== 卡片 ===== */
	.card {
		background: #FFF;
		border-radius: 20rpx;
		overflow: hidden;
		box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);
	}

	/* ===== 表单项 ===== */
	.form-item {
		display: flex;
		align-items: center;
		padding: 28rpx 24rpx;
		border-bottom: 1rpx solid #F5F5F5;
		transition: background 0.15s;
		&:active { background: #FAFAFA; }
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
		.phone-row {
			flex: 1;
			display: flex;
			align-items: center;
			justify-content: flex-end;
			gap: 16rpx;
		}
		.phone-value {
			font-size: 28rpx;
			color: #333;
		}
		.phone-btn {
			font-size: 24rpx;
			background: linear-gradient(135deg, #FFCC80, #FF8C42);
			color: #FFF;
			border-radius: 30rpx;
			padding: 0 20rpx;
			height: 52rpx;
			line-height: 52rpx;
			margin: 0;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			&::after { border: none; }
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

	/* ===== 兴趣标签 ===== */
	.tag-item {
		border-bottom: none;
		padding-bottom: 12rpx;
	}
	.tag-wrap {
		display: flex;
		flex-wrap: wrap;
		padding: 0 24rpx 28rpx;
		.tag {
			margin-right: 16rpx;
			margin-bottom: 16rpx;
			font-size: 26rpx;
			color: #666;
			background: #F5F5F5;
			border-radius: 30rpx;
			padding: 10rpx 24rpx;
			transition: all 0.2s;
			&.active {
				background: linear-gradient(135deg, #FFCC80, #FF8C42);
				color: #FFF;
				box-shadow: 0 4rpx 12rpx rgba(255,140,66,0.3);
			}
			&:active {
				transform: scale(0.95);
			}
		}
	}

	/* ===== 列表项左侧（消息通知/邀请码/清除缓存/关于我们/联系客服共用） ===== */
	.form-item {
		.item-left {
			display: flex;
			align-items: center;
			flex: 1;
			.item-icon {
				font-size: 36rpx;
				margin-right: 16rpx;
			}
			.item-info {
				display: flex;
				flex-direction: column;
				.item-label {
					font-size: 28rpx;
					color: #333;
				}
				.item-desc {
					font-size: 22rpx;
					color: #999;
					margin-top: 4rpx;
				}
			}
		}
		.picker-arrow {
			font-size: 32rpx;
			color: #CCC;
			margin-left: 8rpx;
		}
	}
	.toggle-wrap {
		display: flex;
		justify-content: flex-end;
	}
	.toggle {
		width: 96rpx;
		height: 52rpx;
		border-radius: 26rpx;
		background: #E8E8E8;
		position: relative;
		transition: background 0.3s;
		&.on { background: linear-gradient(135deg, #FFCC80, #FF8C42); }
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

	/* ===== 联系客服按钮 ===== */
	.contact-btn {
		font-size: 26rpx;
		background: linear-gradient(135deg, #FFCC80, #FF8C42);
		color: #FFF;
		border-radius: 30rpx;
		padding: 0 24rpx;
		height: 56rpx;
		line-height: 56rpx;
		margin: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		&::after { border: none; }
	}

	/* ===== 保存按钮 ===== */
	.save-btn {
		margin: 40rpx 24rpx 24rpx;
		background: linear-gradient(135deg, #FFCC80, #FF8C42);
		border-radius: 50rpx;
		padding: 28rpx;
		text-align: center;
		box-shadow: 0 8rpx 32rpx rgba(255,140,66,0.4);
		transition: transform 0.1s, opacity 0.1s;
		&:active {
			transform: scale(0.98);
			opacity: 0.9;
		}
		.btn-text {
			color: #FFF;
			font-size: 32rpx;
			font-weight: bold;
		}
	}

	/* ===== 退出登录 ===== */
	.logout-section {
		display: flex;
		justify-content: center;
		padding: 20rpx 0 40rpx;
		.logout-btn {
			padding: 16rpx 48rpx;
			.logout-text {
				font-size: 28rpx;
				color: #FF6B6B;
			}
		}
	}
</style>
