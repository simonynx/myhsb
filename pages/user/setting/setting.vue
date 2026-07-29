<template>
	<view class="page-wrapper">
		<!-- 资料身份区 -->
		<view class="profile-editor">
			<view class="avatar-wrapper">
				<button class="avatar-btn" open-type="chooseAvatar" @chooseavatar="chooseAvatarEvent">
					<image class="avatar-img" :src="avatarUrl || '/static/missing-face.png'" mode="aspectFill"></image>
					<view class="avatar-edit-badge">
						<text class="edit-icon">换</text>
					</view>
				</button>
			</view>
			<view class="profile-editor-copy">
				<text class="user-nickname">{{ form.nickname || '完善个人资料' }}</text>
				<text class="avatar-tip">头像和昵称会显示在组局及会员资料中</text>
				<text class="avatar-action">点击头像更换</text>
			</view>
		</view>

		<!-- 个人资料 -->
		<view class="section">
			<view class="section-title">基本资料</view>
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
						v-for="tag in tagViewList"
						:key="tag.name"
						:class="tag.className"
						@click="toggleTag(tag.name)"
					>
						{{ tag.name }}
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

		<!-- 偏好设置 -->
		<view class="section">
			<view class="section-title">偏好与邀请</view>
			<view class="card">
				<view class="form-item subscribe-item">
					<view class="item-left">
						<text class="item-mark green">讯</text>
						<view class="item-info">
							<text class="item-label">消息通知</text>
							<text class="item-desc">预约提醒、活动通知</text>
						</view>
					</view>
					<view class="toggle-wrap" @click="toggleSubscribe">
						<view :class="subscribeToggleClass">
							<view class="toggle-dot"></view>
						</view>
					</view>
				</view>

				<view class="form-item" v-if="!form.invite_code" @click="showInviteCode">
					<view class="item-left">
						<text class="item-mark orange">礼</text>
						<view class="item-info">
							<text class="item-label">填写邀请码</text>
							<text class="item-desc">双方均可获得积分奖励</text>
						</view>
					</view>
					<text class="picker-arrow">›</text>
				</view>
			</view>
		</view>

		<!-- 帮助入口 -->
		<view class="section">
			<view class="section-title">帮助与其他</view>
			<view class="card">
				<view class="form-item" @click="showAbout">
					<view class="item-left">
						<text class="item-mark blue">关</text>
						<view class="item-info">
							<text class="item-label">关于我们</text>
							<text class="item-desc">版本信息、联系方式</text>
						</view>
					</view>
					<text class="picker-arrow">›</text>
				</view>

				<view class="form-item">
					<view class="item-left">
						<text class="item-mark green">客</text>
						<view class="item-info">
							<text class="item-label">联系客服</text>
							<text class="item-desc">有问题找我们</text>
						</view>
					</view>
					<button class="contact-btn" open-type="contact">进入</button>
				</view>
			</view>
		</view>

		<!-- 退出登录 -->
		<view class="logout-section">
			<view class="logout-btn" @tap="logout">
				<text class="logout-text">退出登录</text>
			</view>
		</view>

		<!-- 固定保存栏 -->
		<view class="save-bar">
			<view :class="saveButtonClass" @tap="saveProfile">
				<text class="btn-text">{{ saveButtonText }}</text>
			</view>
		</view>
	</view>
</template>

<script>
	import { mapState, mapActions, mapMutations } from 'vuex';
	import AUTH from '../../../utils/auth.js';

	export default {
		computed: {
			...mapState(['userInfo', 'token', 'subscribeAuthorized']),
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
			subscribeToggleClass() {
				return this.subscribeEnabled ? 'toggle on' : 'toggle';
			},
			tagViewList() {
				return this.tagList.map(tag => {
					return {
						name: tag,
						className: this.selectedTags.indexOf(tag) > -1 ? 'tag active' : 'tag',
					};
				});
			},
			saveButtonClass() {
				return this.saving ? 'save-btn loading' : 'save-btn';
			},
			saveButtonText() {
				return this.saving ? '保存中...' : '保存修改';
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
				saving: false,
				tagList: ['桌游', '拼豆', 'PS5', 'Switch', '漫画', '小说', '剧本杀', '亲子阅读'],
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
		onShow() {
			if (this.userInfo) {
				this.syncFromUserInfo(this.userInfo);
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
				// 同步后端保存的订阅消息授权状态
				if (val.subscribe_authorized !== undefined) {
					this.setSubscribeAuthorized(!!val.subscribe_authorized);
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
							var reason = data._reason || '上传失败';
							if (reason.indexOf('违规信息') >= 0) reason = '你发布的内容含违规信息，请修改后再提交';
							uni.showToast({ title: reason, icon: 'none' });
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
					this.updateUserInfo({ subscribe_authorized: false });
					this.saveProfile();
					return;
				}
				try {
					const granted = await AUTH.requestSubscribeMessage();
					this.setSubscribeAuthorized(granted);
					this.updateUserInfo({ subscribe_authorized: granted });
					if (granted) {
						uni.showToast({ title: '订阅成功', icon: 'success' });
					}
					this.saveProfile();
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
					const data = res && res.data || {};
					if (res._status === 0 && data._status !== 1) {
						uni.showToast({ title: '绑定成功，双方各获得积分', icon: 'success' });
						this.getUserInfo();
					} else {
						uni.showToast({ title: data.message || res._reason || '邀请码无效', icon: 'none' });
					}
				}).catch(() => {
					uni.hideLoading();
					uni.showToast({ title: '邀请码无效', icon: 'none' });
				});
			},

			toggleTag(tag) {
				const idx = this.selectedTags.indexOf(tag);
				if (idx > -1) {
					this.selectedTags.splice(idx, 1);
				} else {
					this.selectedTags.push(tag);
				}
			},
			showAbout() {
				uni.showModal({
					title: '关于我们',
					content: '摸鱼划水吧 v1.0.0\n\n桌游 · 主机游戏 · 漫画小说 · 拼豆 · 独立包厢\n\n如有问题请联系客服',
					showCancel: false,
				});
			},

			saveProfile() {
				if (this.saving) return;
				this.saving = true;
				uni.showLoading({ title: '保存中...' });
				// 先同步到 Vuex，再调接口
				this.updateUserInfo({
					nickname: this.form.nickname,
					avatar: this.form.avatar,
					gender: this.form.gender,
					birthday: this.form.birthday,
					phone: this.form.phone,
					tags: this.selectedTags.join(','),
					subscribe_authorized: this.subscribeEnabled,
				});
				this.requestUpdateUserInfo().then((res) => {
					uni.hideLoading();
					this.saving = false;
					uni.showToast({ title: '保存成功', icon: 'success' });
					// 重新拉取用户信息确保同步
					this.getUserInfo();
				}).catch((err) => {
					uni.hideLoading();
					this.saving = false;
					var reason = (err && err._reason) || err || '保存失败';
					if (typeof reason !== 'string') reason = '保存失败';
					if (reason.indexOf('违规信息') >= 0) reason = '你发布的内容含违规信息，请修改后再提交';
					uni.showToast({ title: reason, icon: 'none' });
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
			background: #C96B3F;
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
				background: #C96B3F;
				color: #FFF;
				box-shadow: 0 4rpx 12rpx rgba(255,140,66,0.3);
			}
			&:active {
				transform: scale(0.95);
			}
		}
	}

	/* ===== 列表项左侧 ===== */
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
		&.on { background: #4E7754; }
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
		background: #4E7754;
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
		background: #C96B3F;
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

	/* ===== 编辑资料轻量化布局 ===== */
	page {
		background: #F7F5F1;
	}

	.page-wrapper {
		padding-top: 0;
		padding-bottom: calc(154rpx + env(safe-area-inset-bottom));
	}

	.profile-editor {
		display: flex;
		align-items: center;
		gap: 24rpx;
		padding: 30rpx 24rpx;
		margin-bottom: 18rpx;
		background: #4E7754;
	}

	.avatar-wrapper {
		position: relative;
		flex-shrink: 0;
	}

	.avatar-btn {
		position: relative;
		width: 122rpx;
		height: 122rpx;
		padding: 0;
		margin: 0;
		background: transparent;
		line-height: 1;
	}

	.avatar-btn::after {
		border: 0;
	}

	.avatar-img {
		width: 122rpx;
		height: 122rpx;
		border-radius: 61rpx;
		border: 4rpx solid rgba(255, 255, 255, 0.88);
		box-sizing: border-box;
	}

	.avatar-edit-badge {
		position: absolute;
		right: -2rpx;
		bottom: 0;
		width: 40rpx;
		height: 40rpx;
		border-radius: 8rpx;
		background: #C96B3F;
		border: 2rpx solid #4E7754;
		box-sizing: border-box;
		text-align: center;
		line-height: 36rpx;
	}

	.edit-icon {
		font-size: 18rpx;
		font-weight: 700;
		color: #FFFFFF;
	}

	.profile-editor-copy {
		flex: 1;
		min-width: 0;
	}

	.user-nickname {
		display: block;
		max-width: 100%;
		font-size: 32rpx;
		font-weight: 700;
		color: #FFFFFF;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.avatar-tip,
	.avatar-action {
		display: block;
		font-size: 21rpx;
		line-height: 1.4;
	}

	.avatar-tip {
		margin-top: 8rpx;
		color: rgba(255, 255, 255, 0.72);
	}

	.avatar-action {
		margin-top: 5rpx;
		color: #FFD7C1;
	}

	.section {
		margin: 0 0 18rpx;
	}

	.section .section-title {
		margin-bottom: 10rpx;
		padding: 0 24rpx;
		font-size: 23rpx;
		font-weight: 700;
		color: #766E66;
	}

	.card {
		border-radius: 0;
		border-top: 1rpx solid #EAE5DF;
		border-bottom: 1rpx solid #EAE5DF;
		box-shadow: none;
	}

	.form-item {
		min-height: 92rpx;
		padding: 24rpx;
		box-sizing: border-box;
		border-bottom-color: #EEEAE5;
	}

	.form-item .form-label {
		width: 128rpx;
		font-size: 26rpx;
		color: #554E47;
	}

	.form-item .form-input,
	.form-item .phone-value,
	.form-item .form-picker .picker-value {
		font-size: 26rpx;
		color: #332D28;
	}

	.form-item .form-input {
		min-width: 0;
	}

	.form-item .phone-value {
		max-width: 310rpx;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.form-item .phone-btn,
	.contact-btn {
		height: 54rpx;
		padding: 0 18rpx;
		border-radius: 8rpx;
		font-size: 22rpx;
		line-height: 54rpx;
	}

	.tag-item {
		min-height: auto;
		padding-bottom: 10rpx;
	}

	.tag-wrap {
		gap: 12rpx;
		padding: 0 24rpx 24rpx;
	}

	.tag-wrap .tag {
		margin: 0;
		padding: 9rpx 18rpx;
		border-radius: 8rpx;
		border: 1rpx solid #E4DFD9;
		background: #F7F5F1;
		color: #6F675F;
		font-size: 23rpx;
	}

	.tag-wrap .tag.active {
		border-color: #C96B3F;
		background: #FFF0E7;
		color: #B95D35;
		box-shadow: none;
	}

	.form-item .item-left {
		min-width: 0;
	}

	.item-mark {
		flex-shrink: 0;
		width: 44rpx;
		height: 44rpx;
		margin-right: 14rpx;
		border-radius: 8rpx;
		font-size: 20rpx;
		font-weight: 700;
		line-height: 44rpx;
		text-align: center;
	}

	.item-mark.orange {
		background: #FFF0E7;
		color: #C96B3F;
	}

	.item-mark.green {
		background: #EAF4EC;
		color: #4E7754;
	}

	.item-mark.blue {
		background: #EAF1F5;
		color: #557A95;
	}

	.form-item .item-left .item-info .item-label {
		font-size: 26rpx;
		color: #332D28;
	}

	.form-item .item-left .item-info .item-desc {
		font-size: 21rpx;
		color: #8B8178;
	}

	.toggle {
		width: 84rpx;
		height: 46rpx;
		border-radius: 23rpx;
	}

	.toggle .toggle-dot {
		width: 38rpx;
		height: 38rpx;
		border-radius: 19rpx;
	}

	.toggle.on .toggle-dot {
		left: 42rpx;
	}

	.logout-section {
		padding: 10rpx 0 32rpx;
	}

	.logout-section .logout-btn {
		padding: 14rpx 40rpx;
	}

	.logout-section .logout-btn .logout-text {
		font-size: 25rpx;
		color: #B85B5B;
	}

	.save-bar {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 30;
		padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
		background: rgba(255, 255, 255, 0.97);
		border-top: 1rpx solid #E4DFD9;
	}

	.save-bar .save-btn {
		height: 72rpx;
		margin: 0;
		padding: 0;
		border-radius: 10rpx;
		background: #C96B3F;
		box-shadow: none;
		line-height: 72rpx;
	}

	.save-bar .save-btn.loading {
		opacity: 0.65;
	}

	.save-bar .save-btn .btn-text {
		font-size: 27rpx;
	}
</style>
