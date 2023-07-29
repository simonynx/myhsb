<template>
	<view class='content'>
		<!-- #ifdef H5 -->
		<view class="head-title"><text @click="closePage" class="iconfont icon-fanhui back-icon"></text>支付订单</view>
		<!-- #endif -->
		
		<!-- <view class='success'><icon class='iconfont icon-xuanze'></icon><text class='fs32'>订单提交成功！</text></view> -->
		<view class='lh48' v-if="!overtiem">
			<view class="bgfff">
				<view class="time pay-last-time">
					<span>交易剩余时间</span>
					<span v-if="pay_time.hou > 0">{{pay_time.hou}}:</span>
					<span v-if="pay_time.min > 0">{{pay_time.min}}:</span>
					<span v-if="pay_time.sec > 0">{{pay_time.sec}}</span>
				</view>
				<view class='lh48 paytime' v-if="order.order_type==1">已为您锁定预约时间段，请尽快完成支付</view>
				<view class='lh48 mt5 text-center'><span style="color: #1aad19;">￥</span><span class="price">{{order.pay_amount/100}}</span></view>
			</view>
			<view class="method-box">
				<view class='method'><text class='payment-method'>支付方式</text></view>
				<view class="weui-cells weui-cells_after-title">
					<radio-group @change="radioChange">
						<label class="weui-cell weui-check__label" v-for="(item,index) in radioItems" :key="index">
							<radio class="weui-check"  :value="item.value" :checked="item.checked" />
							<view class="weui-cell__bd fs28">
								<image :src='item.img' class="img-icon mgl10" mode='widthFix'></image>
								<text>{{item.name}}<text class='money' v-if="item.value == 1">(可用余额{{userInfo.account_balance/100}}元)</text></text>
							</view>
							<view class="weui-cell__ft weui-cell__ft_in-radio" v-if="item.checked">
								<icon class="weui-icon-radio" type="success_no_circle" size="16"></icon>
							</view>
						</label>
					</radio-group>
				</view>
			</view>
			<view  v-if="createOrderPrinter == 1" >
				<view class="" style="text-align: center;margin-top: 30rpx;font-size: 36rpx;color: #1aad19;" v-if="(fromTable || table_id) && payment != 1">下单完成，请坐等开吃!</view>
			</view>
			<view style="display: flex; align-items: center;padding: 0 4%;margin-top: 40rpx;justify-content: space-between;">
				
				<view class="back" v-if="fromTable > 0 && createOrderPrinter == 1" @click="goto(`/diancan/index/index?table_id=${fromTable}`)">继续点餐</view>
				<view class='payment' @click='pay'>立即支付</view>
			</view>
			<view  v-if="createOrderPrinter == 0" >
				<view class="tips">温馨提示：必须支付完成才算下单成功哦！</view>
			</view>
		</view>
		<view v-else class="over">
			<view class="overtime">
				订单超时，系统已自动取消
			</view>
			<view class='lh48 mt5'>订单号：{{order.order_number}}</view>
			<view class='lh48 mt5'>支付金额：￥<span class="price">{{order.pay_amount/100}}</span>元</view>
		</view>
		
		<view :class="!showInput ? 'hide' : ''">
		  <view class='m-content'>
		    <view class='input-box'>
		      <input @input="code" placeholder-class ="p-input" class='pass-input' type='password' placeholder='请输入支付密码'></input>
		      <view class='forgot' @click='toSetPass'>忘记密码？找回密码</view>
		    </view>
		    <view class='op-bar'>
		    <view class='cancel btn-item' @click='hideModal'>取消</view>
			<view class='yes btn-item' @click='payConfirm'>
				<view v-if="paying" class="loading-icon"><text class="iconfont icon-tupianzhengzaijiazai"></text></view>
					<view>确认支付</view>
				</view>
		    </view>
		  </view>
		  <view class='maskLayer' @click='hideModal'></view>
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
		components: {},
		data() {
			return {
				id:null,
				order:null,
				radioItems: [{
						name: '微信支付',
						img: '/static/wechat.png',
						value: 0,
						'checked': true
					},
					{
						name: '余额支付',
						img: '/static/wallet.png',
						value: 1,
						checked: false,
						money: 0.00
					},
					// {
					// 	name: '银联支付',
					// 	img: '/static/wallet.png',
					// 	value: '2',
					// 	checked: false,
					// 	//money: 0.00
					// }
				],
				payMethod: 0,
				showInput: false, //支付密码输入框显示
				pay_pwd:'',
				interval : {},
				second:0,
				overtiem:false, //订单是否超时
				pay_time:{},
				item:{},
				is_group:'',
				parent_sn:'',
				table_id:'',
				fromTable:0,
				paying : false,
				createOrderPrinter:1,
				payment:0
			}
		},
		computed: {
			...mapState(['hasLogin','userInfo', 'token', 'openid'])
		},
		onLoad(options) {
			this.order = JSON.parse(options.data);
			//入口方式 1订单列表，2提交订单,
			this.entry = options.entry ? options.entry : 1
			//订单信息
			this.id = options.order_id ? options.order_id : '';
			this.parent_sn = options.parent_sn ? options.parent_sn : ''
			this.is_group = options.is_group ? options.is_group : '';
			this.table_id = options.table_id ? options.table_id : '';
			this.payment = options.payment ? options.payment : 0;
			this.fromTable = options.fromTable ? options.fromTable : 0;
			this.orderConfig();
		},
		onPullDownRefresh() {

		},
		filters: {
			// 时间格式化
			time(val) {
				return moment(val * 1000).format('YYYY-MM-DD')
			},
		},
		methods: {
			...mapActions(['loginAndRegister', 'getUserInfo', 'requestUpdateUserInfo']),
			...mapMutations(['updateUserInfo']),
			//获取订单支付信息
			orderConfig: function() {
				var end = this.order.end_time;
				var end_time = (new Date(end)).getTime() / 1000;
				this.second = parseInt(end_time - (new Date().getTime()) / 1000);
				if (this.second <= 0) {
					this.overtiem = true;
				} else {
					this.interval = setInterval(this.countDown, 1000);
				}
			},
			//支付方式
			radioChange: function(e) {
				var that = this;
				this.payMethod = e.detail.value;
				var radioItems = this.radioItems;
				for (var i = 0, len = radioItems.length; i < len; ++i) {
					radioItems[i].checked = radioItems[i].value == e.detail.value;
				}
				that.radioItems = radioItems;
			},
			
			//点击立即支付
			pay: function() {
				var that = this;
				var params = {
					order_number: this.order.order_number
				}
				if (this.payMethod == 0) {
					//微信支付
					this.weixinPay(params);
				} else if (this.payMethod == 2){
					this.unionPay(params);
				}
				else if (this.payMethod == 1) {
					//余额支付
					//传参给设置支付密码/充值后做跳转回来
					if (this.id) {
						var type = 1;
						var id = this.id;
					}
					if (this.parent_sn) {
						var type = 2;
						var id = this.parent_sn;
					}
					if (parseFloat(this.userInfo.account_balance) < parseFloat(this.order.pay_amount)) {
						uni.showModal({
							title: '提示',
							content: '您的余额不足',
							confirmText: "去充值",
							success(res) {
								if (res.confirm) {
									var url = '/pages/user/deposit/deposit?type=' + type + '&id=' + id+'&data='+JSON.stringify(that.order);
									that.goto(url);
								} else if (res.cancel) {
									console.log(1)
								}
							}
						})
						return false;
					}

					//没绑定手机号码，也没有设置支付密码
					// if (this.$data.item.set_mobile == 0 && this.$data.item.set_pay_pwd == 0) {
					// 	uni.showModal({
					// 		title: '提示',
					// 		content: '请先绑定您的手机并设置支付密码',
					// 		success(res) {
					// 			if (res.confirm) {
					// 				var url ='/pages/user/bind-mobile?setPassword=1&type=' + type + '&id=' + id
					// 				that.goto(url);
					// 			} else if (res.cancel) {
									
					// 			}
					// 		}
					// 	})
					// 	return false;
					// }
					//绑定了手机，但没有设置支付密码
					// if (this.$data.item.set_mobile == 1 && this.$data.item.set_pay_pwd == 0) {
					if(!this.userInfo.pay_password) {
						uni.showModal({
							title: '提示',
							content: '请先设置支付密码',
							success(res) {
								if (res.confirm) {
									var url = '/pages/user/set-payment?type=' + type + '&id=' + id+'&data='+JSON.stringify(that.order);
									that.goto(url);
								} else if (res.cancel) {
									console.log(2)
								}
							}
						})
						return false;
					}
					//支付密码输入框
					this.showInput = true
				}
			},
			unionPay(params){
				var that = this;
				// #ifdef H5
				params.payment_code = "unionPay";
				params.client = "weixin";
				// #endif
				// #ifdef MP-WEIXIN
				params.payment_code = "unionPay";
				params.client = "wxMini";
				// #endif
				// #ifdef APP-PLUS
				params.payment_code = "unionPay";
				params.client = "app";
				// #endif
				PublicModel.payment(params, (data) => {
					if(data.status == 1){
						payment.weixinPay(data.items); //获取支付信息
					}else if(!data.open_id){
						uni.showModal({
							confirmText:"确定",
							title: '提示',
							content: data.msg ? data.msg : '请求失败',
							success(res) {
								if (res.confirm) {
									
								} else if (res.cancel) {
									
								}
							}
						})
					}
				});
			},
			//微信支付
			weixinPay: function(params) {
				var that = this;
				uni.showLoading({
					title:'调起支付...'
				})
				AUTH.wxPay(this.token, params).then(res => {
					if(!res) return;
					that.requestPayment(res);
				});
			},
			
			requestPayment(res){
				const _this = this;
				wx.requestPayment({
					// provider: 'wxpay',
					timeStamp: res.data.timeStamp,
					nonceStr: res.data.nonceStr,
					package: res.data.package,
					signType: res.data.signType,
					paySign: res.data.sign,
					success: function (res) {
						console.log('success:' + JSON.stringify(res));
						uni.redirectTo({
						  	url:'../pay/success/success?amount='+_this.order.pay_amount
						});
					},
					fail: function (err) {
						console.log('fail:' + JSON.stringify(err));
						uni.showToast({
							title:'支付失败'
						});
					},
					complete:function(res){
						uni.hideLoading();
						_this.getUserInfo();
					}
				})
			},
			
			//余额支付
			payConfirm: function() {
				var that = this;
				if (!this.pay_pwd) {
					uni.showToast({
						title: '请输入支付密码',
						icon: 'none',
						duration: 2000,
					})
					return false;
				}
				//支付参数
				var params = {
					order_number: this.order.order_number
				}
				if(that.paying){
					return false;
				}
				params.pay_password = this.pay_pwd;
				that.paying = true;
				AUTH.accountPay(this.token, params).then(res => {
					that.paying = false;
					if(!res) return;
					uni.showToast({
						title: '支付成功',
						icon: 'success',
						duration: 2000,
						success: function() {
							
						}
					})
					var url='/pages/order/order?state=0';
					setTimeout(function() {
						that.goto(url)
					}, 2000)
					that.getUserInfo();
				});
			},
			//关闭弹窗
			hideModal: function(e) {
				this.showInput = false
			},
			//获取输入的支付密码
			code: function(e) {
				this.pay_pwd = e.detail.value
			},
			//卸载页面
			onUnload: function() {
				clearInterval(this.interval);
				// if (this.$data.entry == 2) {
				// 	uni.navigateTo({
				// 		url: '/pages/order/list?index=0&entry=2'
				// 	});
				// }
			},
			toSetPass: function() {
				//传参给设置支付密码/充值后做跳转回来
				if (this.id) {
					var type = 1;
					var id = this.id;
				}
				if (this.parent_sn) {
					var type = 2;
					var id = this.parent_sn;
				}
				uni.navigateTo({
					url: '/pages/user/set-payment?type=' + type + '&id=' + id
				});
			},
			//支付倒计时
			countDown: function() {
				var second = this.second;
				this.second--;
				let countDownArr = {};
				if (this.second <= 0) {
					clearInterval(this.interval);
					return false;
				}
				var obj = null;
				// 天数位
				var day = Math.floor(second / 3600 / 24);
				var dayStr = day.toString();
				if (dayStr.length == 1) dayStr = '0' + dayStr;

				// 小时位
				var hr = Math.floor((second - day * 3600 * 24) / 3600);
				var hrStr = hr.toString();
				if (hrStr.length == 1) hrStr = '0' + hrStr;

				// 分钟位
				var min = Math.floor((second - day * 3600 * 24 - hr * 3600) / 60);
				var minStr = min.toString();
				if (minStr.length == 1) minStr = '0' + minStr;

				// 秒位
				var sec = second - day * 3600 * 24 - hr * 3600 - min * 60;
				var secStr = sec.toString();
				if (secStr.length == 1) secStr = '0' + secStr;
				countDownArr = {
					day: dayStr,
					hou: hrStr,
					min: minStr,
					sec: secStr
				}
				this.pay_time = countDownArr
			},
			closePage:function(){
				this.goto("/pages/order/order")
			},
			goto:function(url){
				uni.redirectTo({
				  	url:url
				});
			}
		}
	}
</script>

<style lang="scss">
	.content {
		font-size: 28rpx;
		color: #333;
	}

	.bgfff {
		background-color: #fff;
		padding: 25rpx 20rpx;
	}

	.method-box {
		background-color: #fff;
		margin-top: 20rpx;
		padding-top: 10rpx;
	}

	.text-center {
		text-align: center
	}

	.success {
		color: #1aad19;
		padding: 0 0 10px 0;
		border-bottom: 1px solid #ececec;
	}

	.success .iconfont {
		font-size: 44rpx;
		margin-right: 20rpx;
		margin-top: -10rpx;
	}

	.paytime {
		margin-top: 10px;
	}

	.mt5 {
		margin-top: 3px;
	}

	.method {
		margin-top: 0px;
	}

	.payment-method {
		font-weight: bold;
		padding-left: 30rpx;
	}

	.must {
		background-color: #ff4444;
		color: #fff;
		padding: 3rpx 20rpx;
		border-radius: 20px;
	}

	.lh48 {
		line-height: 48rpx;
	}

	.img-icon {
		width: 40rpx;
		margin-right: 15rpx;
	}

	.weui-cell__bd {
		display: flex;
		align-items: center;
	}

	.weui-cells {
		padding-right: 15px;
		margin-top: 5rpx;
	}

	.payment {
		flex:1;
		background-color: #1aad19;
		border-radius: 30px;
		color: #fff;
		padding: 22rpx 0;
		text-align: center;
		font-size: 32rpx;
	}

	.money {
		color: #1aad19;
	}

	.pass-input {
		border: 1px solid #ececec;
		text-align: left !important;
		width: 80%;
		margin: 0 auto;
		// padding: 15rpx 0 15rpx 15rpx;
		border-radius: 5px;
	}

	.m-content .input-box {
		margin: 40rpx 0 0 0;
	}

	.m-content {
		height: 160px;
	}

	.p-input {
		font-size: 28rpx;
	}

	.forgot {
		width: 80%;
		margin: 0 auto;
		margin-top: 35rpx;
		font-size: 24rpx;
		text-align: center;
		color: #7bbff0;
	}

	.overtime {
		text-align: center;
		font-size: 40rpx;
		margin-bottom: 40rpx;
	}

	.price {
		font-size: 55rpx;
		font-weight: bold;
		color: #1aad19;
	}

	.price-icon {
		font-size: 30rpx;
	}

	.paytime {
		text-align: center;
		margin-bottom: 20rpx;
	}

	.time {
		text-align: center;
		margin-bottom: 40rpx;
	}

	.weui-cell:before {
		border-top: 1rpx solid #ececec;
	}

	.weui-cell {
		padding: 15px 15px;
		line-height: 0.9;
	}

	.over {
		padding: 20px 4%;
	}
	.back{
		width: 40%;
		text-align: center;
		border: 1px solid #4fa71e;
		color:  #4fa71e;
		border-radius: 60rpx;
		padding: 20rpx 0;
		margin-right: 50rpx;
	}
	.op-bar view{
		padding: 0rpx 0;
	}
	.op-bar .btn-item{
		padding: 25rpx 0;
	}
	.yes{
		display: flex; 
		justify-content: center;
	}
	.loading-icon{
		width: 16px;
		-webkit-animation: circles  1s infinite;
	    animation: circles 1s  infinite;
	}
	@keyframes circles{
	    from {transform: rotate(0deg);}
	    to {transform: rotate(360deg);}
	}
	@-webkit-keyframes circles{
	    from {transform: rotate(0deg);}
	    to {transform: rotate(360deg);}
	}
	.head-title{background-color: #ff6600;text-align: center;padding: 30rpx;color: #fff;font-weight: bold;font-size: 32rpx;}
	.back-icon{font-size: 36rpx;color: #fff;float: left;}
	.tips{    
		text-align: center;
		margin-top: 30rpx;
		color: red;
		font-size: 34rpx;
	}
	.pay-last-time{
		color: #999;
		font-size: 28rpx;
	}
</style>
