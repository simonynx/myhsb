<template>
	<view class="container">
		<view class="ui-all">
		  <!-- 头像选择 -->
			<view class="avatar">
				<view class="button-shadow">
				  <button
					class="button"
					open-type="chooseAvatar"
					@chooseavatar="chooseAvatarEvent">
					<view v-if="userInfo.avatar" class="avatar__image">
					  <image class="image" :src="userInfo.avatar" mode="aspectFill"></image>
					</view>
					<view v-else class="avatar__empty">
					  <image class="image" src="https://cdn.nlark.com/yuque/0/2022/jpeg/280373/1668928062708-assets/web-upload/764843cf-055a-4cb6-b5d3-dca528b33fd4.jpeg" mode="aspectFill"></image>
					</view>
					<view class="avatar--icon">
					  <view class="tn-icon-camera-fill"></view>
					</view>
				  </button>
				</view>
			</view>
			<uni-section title="至少填个名字吧,要不然后台不好查数据" type="line"/>
			<view class="ui-list right">
				<text>昵称</text>
				<input class="input" type="nickname" v-model="userInfo.nickname" @blur="bindnickName" @input="bindnickName" placeholder="求你改个名字吧!" placeholder-style="color: #AAAAAA;">
			</view>
			<uni-section title="填了手机号可以收到预约通知短信,也方便联系" type="line"/>
			<view class="ui-list right">
				<text>手机号</text>
				<input v-if="userInfo.phone" type="tel" :placeholder="value" :value="userInfo.phone" @input="bindmobile" placeholder-class="place" />
				<input v-else type="tel" :placeholder="value" :value="mobile" @input="bindmobile" placeholder-class="place" />
			</view>
			<view class="ui-list right">
				<text>性别</text>
				<picker @change="bindPickerChange" mode='selector' range-key="name" :value="userInfo.gender" :range="sex">
					<view class="picker">
						{{sex[index].name}}
					</view>
				</picker>
			</view>
<!-- 			<view class="ui-list right">
				<text>常住地</text>
				<picker @change="bindRegionChange" mode='region'>
					<view class="picker">
						{{region[0]}} {{region[1]}} {{region[2]}}
					</view>
				</picker>
			</view> -->
			<uni-section title="万一以后有活动可以用呢" type="line"/>
			<view class="ui-list right">
				<text>生日</text>
				<picker mode="date" :value="date" @change="bindDateChange">
					<view class="picker">
						{{date}}
					</view>
				</picker>
			</view>
<!-- 			<view class="ui-list">
				<text>签名</text>
				<textarea :placeholder="value" placeholder-class="place" :value="description" @input="binddescription"></textarea>
			</view> -->
			<button class="save" formType="submit" @tap="savaInfo">保 存 修 改</button>
		</view>

	</view>
</template>

<script>
	import {
		mapState,
		mapActions,
		mapMutations
	} from 'vuex'; 
	export default {
		computed: {
			...mapState(['hasLogin','userInfo', 'token', 'openid'])
		},
		data() {
			return {
				value: '请填写',
				sex: [{
					id: 1,
					name: '女'
				}, {
					id: 2,
					name: '男'
				}],
				index: 0,
				region: ['请填写'],
				date: '请填写',
				avater: '',
				description: '',
				url: '',
				nickName: '',
				mobile: '',
				headimg: ''

			}

		},
		methods: {
			...mapActions(['loginAndRegister', 'getUserInfo', 'requestUpdateUserInfo']),
			...mapMutations(['updateUserInfo']),
			// 头像选择
			chooseAvatarEvent(e) {
				this.headimg = e.detail.avatarUrl
			},
			bindPickerChange(e) {
				this.index = e.detail.value;
				
			},
			bindRegionChange(e) {
				this.region = e.detail.value;
				
			},
			bindDateChange(e) {
				this.date = e.detail.value;
			},
			bindnickName(e) {
				this.nickName = e.detail.value;
				
			},
			bindmobile(e) {
				this.mobile = e.detail.value;
				
			},
			binddescription(e) {
				this.description = e.detail.value;
				
			},
			savaInfo() {
				let that = this;
				let nickname = that.nickName;
				let headimg = that.headimg;
				let gender = that.index;
				let mobile = that.mobile;
				let region = that.region;
				let birthday = that.date;
				let description = that.description;
				let updata = {};
				if (!nickname) {
					uni.showToast({
						title: '请填写昵称',
						icon: 'none',
						duration: 2000
					});
					return;
				}
				updata.nickname = nickname;
				if (!headimg) {
					headimg = that.avater;
				}
				updata.headimg = headimg;
				updata.gender = gender;
				if(mobile){
					if (that.isPoneAvailable(mobile)) {
						updata.phone = mobile;
					} else {
						uni.showToast({
							title: '手机号码有误，请重填',
							icon: 'none',
							duration: 2000
						});
						return;
					}
				}

				// if (region.length == 1) {
				// 	uni.showToast({
				// 		title: '请选择常住地',
				// 		icon: 'none',
				// 		duration: 2000
				// 	});
				// 	return;
				// } else {
				// 	updata.province = region[0];
				// 	updata.city = region[1];
				// 	updata.area = region[2];
				// }
				// if (birthday == "0000-00-00") {
				// 	uni.showToast({
				// 		title: '请选择生日',
				// 		icon: 'none',
				// 		duration: 2000
				// 	});
				// 	return;
				// }
				updata.birthday = birthday;
				// updata.description = description;
				that.updata(updata);
			},
			isPoneAvailable(poneInput) {
				var myreg = /^[1][3,4,5,7,8][0-9]{9}$/;
				if (!myreg.test(poneInput)) {
					return false;
				} else {
					return true;
				}
			},
			async updata(datas) {
				//传后台
				const _this = this;
				if(datas.headimg){
					AUTH.uploadFile(this.token, datas.headimg, 'avatar_'+ this.openid).then(res=>{
						if(!res) return;
						datas.avatar = res.url;
						_this.updateUserInfo(datas);
						_this.requestUpdateUserInfo().then(res=>{
							if(!res) return;
							uni.showToast({
								title: '修改个人信息成功啦～',
								icon: 'none',
								duration: 2000
							});
						});
					});
				}else{
					datas.avatar = this.avatar;
					_this.updateUserInfo(datas);
					_this.requestUpdateUserInfo().then(res=>{
						if(!res) return;
						uni.showToast({
							title: '修改个人信息成功啦～',
							icon: 'none',
							duration: 2000
						});
					});
				}
			},
		},
		onLoad() {
			if(!this.hasLogin){
				this.loginAndRegister()
			}else if(!this.userInfo){
				this.getUserInfo()
			}
			if(this.userInfo){
				if(this.userInfo.birthday){
					this.date = this.userInfo.birthday;
				}
				this.nickName = this.userInfo.nickname;
				this.avatar = this.userInfo.avatar;
				this.index = this.userInfo.gender;
			}
		}

	}
</script>

<style lang="less">
	.container {
		display: block;
	}

	.ui-all {
		padding: 20rpx 40rpx;
		
		.image {
		  width: 100%;
		  height: 100%;
		  border-radius: inherit;
		}
		
		/* 头像选择 */
		.avatar {
		  width: 100%;
		  margin-top: 30rpx;
		  display: flex;
		  align-items: center;
		  justify-content: center;
		  
		  .button-shadow {
		    border: 8rpx solid rgba(255,255,255,0.05);
		    box-shadow: 0rpx 0rpx 80rpx 0rpx rgba(0, 0, 0, 0.15);
		    border-radius: 50%;
		  }
		  
		  .button {
		    position: relative;
		    width: 160rpx;
		    height: 160rpx;
		    border-radius: 50%;
		    overflow: visible;
		    background-image: repeating-linear-gradient(45deg, #E4E9EC, #F8F7F8);
		    color: #FFFFFF;
		    background-color: transparent;
		    padding: 0;
		    margin: 0;
		    font-size: inherit;
		    line-height: inherit;
		    border: none;
		    &::after {
		      border: none;
		    }
		  }
		  
		  .avatar {
		    &__empty, &__image {
		      width: 100%;
		      height: 100%;
		      border-radius: inherit;
		    }
		    
		    &--icon {
		      position: absolute;
		      right: -10rpx;
		      bottom: -6rpx;
		      width: 60rpx;
		      height: 60rpx;
		      // transform: translate(50%, 50%);
		      background-color: #1D2541;
		      color: #FFFFFF;
		      border-radius: 50%;
		      border: 6rpx solid #FFFFFF;
		      line-height: 1;
		      font-size: 36rpx;
		      display: flex;
		      align-items: center;
		      justify-content: center;
		    }
		  }
		  
		  // &:after {
		  // 	content: ' ';
		  // 	width: 20rpx;
		  // 	height: 20rpx;
		  // 	border-top: solid 1px #030303;
		  // 	border-right: solid 1px #030303;
		  // 	transform: rotate(45deg);
		  // 	-ms-transform: rotate(45deg);
		  // 	/* IE 9 */
		  // 	-moz-transform: rotate(45deg);
		  // 	/* Firefox */
		  // 	-webkit-transform: rotate(45deg);
		  // 	/* Safari 和 Chrome */
		  // 	-o-transform: rotate(45deg);
		  // 	position: absolute;
		  // 	top: 85rpx;
		  // 	right: 0;
		  // }
		}

		.ui-list {
			width: 100%;
			text-align: left;
			padding: 20rpx 0;
			border-bottom: solid 1px #f2f2f2;
			position: relative;

			text {
				color: #4a4a4a;
				font-size: 28rpx;
				display: inline-block;
				vertical-align: middle;
				min-width: 150rpx;
			}

			input {
				color: #030303;
				font-size: 30rpx;
				display: inline-block;
				vertical-align: middle;
			}
			button{
				color: #030303;
				font-size: 30rpx;
				display: inline-block;
				vertical-align: middle;
				background: none;
				margin: 0;
				padding: 0;
				&::after{
					display: none;
				}
			}
			picker {
				width: 90%;
				color: #030303;
				font-size: 30rpx;
				display: inline-block;
				vertical-align: middle;
				position: absolute;
				top: 30rpx;
				left: 150rpx;
			}

			textarea {
				color: #030303;
				font-size: 30rpx;
				vertical-align: middle;
				height: 150rpx;
				width: 100%;
				margin-top: 50rpx;
			}

			.place {
				color: #999999;
				font-size: 28rpx;
			}
		}

		.right:after {
			content: ' ';
			width: 20rpx;
			height: 20rpx;
			border-top: solid 1px #030303;
			border-right: solid 1px #030303;
			transform: rotate(45deg);
			-ms-transform: rotate(45deg);
			/* IE 9 */
			-moz-transform: rotate(45deg);
			/* Firefox */
			-webkit-transform: rotate(45deg);
			/* Safari 和 Chrome */
			-o-transform: rotate(45deg);
			position: absolute;
			top: 40rpx;
			right: 0;
		}

		.save {
			background: #030303;
			border: none;
			color: #ffffff;
			margin-top: 40rpx;
			font-size: 28rpx;
		}
	}
</style>
