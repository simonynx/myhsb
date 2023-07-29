<template>
	<view>
		<view class="tips-box">
			<view class="tip-text">支付密码在使用余额支付时使用</view>
		</view>
		<view class='container'>
		    <form @submit="formSubmit" @reset="formReset" id='fenxiao-register'>
<!-- 		      <view class="section mobile">
		        <input name="input" type='number' v-model='userInfo.phone' placeholder='正在获取手机号码...'/>
		        <text class='send-code' @click='sendCode' v-if="show_send_code">发送验证码</text>
		        <text class='send-code resend' v-if="!show_send_code">重发({{countDownNum}})s</text>
		      </view>
		      <view class="section">
		        <input name="input" type='number' @input="codeChange" placeholder="请输入短信验证码" />
		      </view> -->
		      <view class="section">
		        <input name="input" type='password' @input="passwordChange" placeholder="请输入支付密码" />
		      </view>
		      <view class="section">
		        <input name="input" type='password' @input="repasswordChange" placeholder="确认支付密码" />
		      </view>
		      <view class="btn-area">
		        <button form-type="submit" class='btn' :class="btnType">{{btnText}}</button>
		      </view>
		    </form>
		  </view>
	</view>
</template>

<script>
	import {  
		mapState,
		mapActions,
		mapMutations
	} from 'vuex';
	import AUTH from '../../utils/auth.js'
	export default {
		computed: {
			...mapState(['hasLogin','userInfo', 'token', 'openid'])
		},
		data() {
			return {
				id:0,
				type:0,
				show_send_code: true,
				countDownNum: 60,
				args: {
				  mobile:'',
				  pay_pwd:'',
				  verifyPassword:'',
				  verifyCode:''
				},
				user:{},
				timer:null,
				btnType: 'disable',
				btnText: "设置",
				onLoadding: false,
				orderJson:null,
			}
		},
		onLoad(options) {
			//如果从订单入口进来，获取订单参数，以便设置完成后跳转回去
			this.type = options.type ? options.type : '';
			this.id = options.id ? options.id : '';	
			this.orderJson = options.data;
			if(!this.hasLogin){
				this.loginAndRegister();
			}else if(!this.userInfo){
				this.getUserInfo();
			}
		},
		methods: {
			...mapActions(['loginAndRegister', 'getUserInfo', 'requestUpdateUserInfo']),
			...mapMutations(['updateUserInfo']),
			  //提交表单
			  formSubmit: function (e) {
			    // if (!this.args.verifyCode) {
			    //   uni.showToast({
			    //     title: '请输入验证码',
			    //     icon: 'none',
			    //     duration: 2000
			    //   })
			    //   return false;
			    // }
			    if (!this.args.pay_pwd) {
			      uni.showToast({
			        title: '请输入支付密码',
			        icon: 'none',
			        duration: 2000
			      })
			      return false;
			    }
			    if (!this.args.verifyPassword) {
			      uni.showToast({
			        title: '请输入确认密码',
			        icon: 'none',
			        duration: 2000
			      })
			      return false;
			    }
			    if (this.args.pay_pwd != this.args.verifyPassword) {
			      uni.showToast({
			        title: '密码和确认密码不一致',
			        icon: 'none',
			        duration: 2000
			      })
			      return false;
			    }
			    this.sub();
			  },
			  //设置密码
			  sub: function () {
			    var that = this;
			    // var params = that.args;
			    if (this.onLoadding) {
			      return false;
			    }
			    this.btnText = '正在设置...';
			    this.onLoadding = true;
			    AUTH.setPayPassword(this.args.pay_pwd, this.token).then(res=>{
			      that.onLoadding = false;
			      this.btnText = '设置';
				  if(!res) return;
					uni.showToast({
					  title: "支付密码设置成功",
					  icon: 'success',
					  duration: 2000,
					  success:function() {
						var url='';
						console.log(that.type)
						if (that.type == 1) {
						   url = "/pages/order/payment?order_id="+that.id+'&data='+that.orderJson;
						} else if (that.type == 2) {
						   url = "/pages/order/payment?parent_sn=" + that.id+'&data='+that.orderJson;
						} else {
						   url = '/pages/user/index';
						}
						setTimeout(function () {
							uni.redirectTo({
							  	url:url
							});
						}, 2000)
					  }
					})
			    });
			  },
			  //发送短信验证码
			  sendCode: function (e) {
			    if (!this.args.mobile) {
			      uni.showToast({
			        title: '请先填写手机号码',
			        icon: 'none',
			        duration: 2000
			      })
			      return false;
			    }
			    this.show_send_code = false;
			    this.countDownNum = 60;
			    this.countDown();
			    var params = {
			      mobile: this.args.mobile,
			      scene: 7
			    }
			    publicModel.sms(params, (data) => {
			      if (data.status == 1) {
			        uni.showToast({
			          title: "验证码已发送到您手机上",
			          icon: 'none',
			          duration: 2000
			        })
			      } else {
			        uni.showToast({
			          title: data.msg,
			          icon: 'none',
			          duration: 2000
			        })
			      }
			    });
			  },
			  countDown: function () {
			    let that = this;
			    let countDownNum = that.countDownNum;//获取倒计时初始值
			    //如果将定时器设置在外面，那么用户就看不到countDownNum的数值动态变化，所以要把定时器存进data里面
				that.timer = setInterval(() => { //这里把setInterval赋值给变量名为timer的变量
			   	//每隔一秒countDownNum就减一，实现同步
			   	countDownNum--;
			   	that.countDownNum = countDownNum;
			   	//在倒计时还未到0时，这中间可以做其他的事情，按项目需求来
			   	if (countDownNum == 0) {
			   		clearInterval(that.timer);
			   		that.show_send_code = true;
			   	}
			   }, 1000)
			  },
			  //获取用户输入的密码
			  passwordChange: function (e) {
			    var val = e.detail.value;
			    this.args.pay_pwd = val
			    this.btnChange();
			  },
			  //获取用户输入的确认密码
			  repasswordChange: function (e) {
			    var val = e.detail.value;
			    this.args.verifyPassword = val
			    this.btnChange();
			  },
			  //获取用户输入的验证码内容
			  codeChange: function (e) {
			    var val = e.detail.value;
			    this.args.verifyCode = val
			    this.btnChange();
			  },
			  //判断激活按钮的样式
			  btnChange: function () {
			    let type = 'disable'
			    // if (this.args.mobile && this.args.verifyCode && this.args.pay_pwd && this.args.verifyPassword) {
			    //   type = 'sub';
			    // }
				if (this.args.pay_pwd && this.args.verifyPassword) {
				  type = 'sub';
				}
				this.btnType = type;
			  }
		}
	}
</script>

<style lang="scss">
	/* pages/center/fenxiao.wxss */
	Page {
		background-color: #fff;
		font-size: 32rpx;
	}
	.container{
		width: 94%;
		margin-left:3%;
		margin-top:10rpx;
	}
	.tips-box {
	  display: flex;
	  justify-content: flex-start;
	  align-items: center;
	  padding: 10px 20px;
	  border-left: 3px solid #ad2e24;
	  background-color: #ad2e24;
	  font-size: 14px;
	  color: #fff;
	  margin-top: 10px;
	  width: 100%;
	  
	  .tip-text {
	    text-align: left;
	    line-height: 1.5;
	  }
	}
	.section{
		border-bottom: 1px solid #ececec;
		border-bottom: 1px solid #ECECEC;
		padding: 10px 0;
	}
	#fenxiao-register .section{
		border-bottom: 1px solid #ececec;
		height: 110rpx;
		line-height: 110rpx;
		border-bottom: 1px solid #ECECEC;
	}
	#fenxiao-register .section input{
		height: 110rpx;
		line-height: 110rpx;
		width: 75%;
	}
	.mobile{
		display: flex;
		justify-content: space-between;
		box-sizing: border-box;
	}
	.send-code {
		// color: #ff4444;
		font-size: 28rpx;
		padding: 5rpx 0;
		width: 25%;
		text-align: center;
		border-radius: 10rpx;
	}
	.resend{
		color:#999;
	}

	.btn{
		opacity: 0.6;
		margin-top: 60rpx;
		// border-radius: 30px;
		color: #ffffff;  /* 设置文本颜色为白色 */
		border: none;  /* 去掉边框 */
		// padding: 10px 20px;  /* 设置内边距 */
		font-family: 'Comic Sans MS', cursive;  /* 使用卡通风格的字体 */
		text-transform: uppercase;  /* 将文本转换为大写 */
		box-shadow: 2px 2px 6px rgba(0, 0, 0, 0.3);  /* 添加卡通风格的阴影效果 */
	}
	.sub{
		background-color:#ffcc00; 
	}

</style>
