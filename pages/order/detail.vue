<template>
	<view>
		<view class="container">
			<view class="weui-cell dengdai" v-if="status == 1||status == 9">
				<view class="weui-cell__hd">
					<text class="iconfont icon-dingdan"></text>
				</view>
				<view class="weui-cell__bd theme-color fs28" v-if="status == 9">交易已关闭</view>
				<view class="weui-cell__bd" v-else>
					<view class="fs28">等待付款</view>
					<view class="time">剩余：
						<text>{{countDownHour}}</text>时
						<text>{{countDownMinute}}</text>分
						<text>{{countDownSecond}}</text>秒
					</view>
				</view>
			</view>
			<view class="weui-cell dengdai" v-if="status == 8">
				<view class="weui-cell__hd">
					<text class="iconfont icon-dingdan"></text>
				</view>
				<view class="weui-cell__bd">
					<view class="fs28">已取消</view>
				</view>
			</view>
			<!-- 地址 -->
			<view class="weui-cells mgtno addr-inf" v-if="orderData.delivery_id == 0">
				<view class="weui-cell weui-cell_access">
					<view class="iconfont icon-dizhi"></view>
					<view class="weui-cell__bd">
						<view class="fs28 cr333">
							<text class="use-name">{{orderData.full_name}}</text>
							<text class="use-mobile">
								<text>{{orderData.tel}}</text>
							</text>
						</view>
						<view class="fs24 cr9"><text v-if="showCity">{{orderData.prov}}{{orderData.city}}{{orderData.area}}</text>{{orderData.address}}</view>
					</view>
				</view>
			</view>
			<view class="weui-cells mgtno addr-inf" v-if="orderData.delivery_id == 1 ">
				<view class="weui-cell weui-cell_access">
					<view style="font-size: 28rpx;color: #999;">联系方式：</view>
					<view class="weui-cell__bd">
						<view class="fs28 cr333">
							<text class="use-name">{{orderData.full_name}}</text>
							<text class="use-mobile">
								<text>{{orderData.tel}}</text>
							</text>
						</view>
					</view>
				</view>
			</view>
			<view class="weui-cells mgtno addr-inf" v-if="orderData.delivery_id == 2 && !orderData.table_id">
				<view class="weui-cell weui-cell_access">
					<view class="iconfont icon-dizhi"></view>
					<view class="weui-cell__bd">
						<view class="fs28 cr333">
							<text class="use-name">{{orderData.orderPick.name}}</text>
							<text class="use-mobile">{{orderData.orderPick.mobile}}</text>
						</view>
						<view class="fs24 cr9">{{orderData.orderPick.info}}</view>
					</view>
					<view class="daohang" @click="intoMap" v-if="showDaohang">导航</view>
				</view>

			</view>
		</view>
		<!-- 地址end -->
		<view>
			<view class="weui-cells">
				<block v-for="(item,index) in orderData.orderSku">
					<view class="weui-cell goods-list">
						<view class="weui-cell__hd goods-img-box" :data-id='item.goods_id' @click='toProduct'>
							<image :src="item.sku_thumbImg" />
						</view>
						<view class="weui-cell__bd goods-info">
							<view class="goods-tit" :data-id='item.goods_id' @click='toProduct'>{{item.goods_name}}</view>
							<view class="pos-rel">
								<view class="goods-attr">{{item.sku_value}}</view>
							</view>
							<view class="goods-price">
								<view class="weui-flex__item">
									<view>￥{{item.sku_sell_price_real}}</view>
								</view>
								<view class="numbox-r">
									<text>x{{item.num}}</text>
								</view>
							</view>
						</view>
					</view>
				</block>
			</view>
			<view class="weui-cells" v-if="orderData.type==1">
				<view class="pingtuanList">
					<view>
						<view class="fs28 cr333 pingtuantop">拼团信息</view>
					</view>
					<view v-if="status !=1 && orderData.groupLog.remaining_number!=0&& orderData.group_status==1">
						<view class="fs28 cr333 pingtuantop">
						    <view class="grouptime">剩余：
						    	<text>{{countDownHour}}</text>时
						    	<text>{{countDownMinute}}</text>分
						    	<text>{{countDownSecond}}</text>秒
						    </view> 
					    </view>
					</view>
					<view class="fs28 cr333 yiman" v-if="orderData.groupLog.remaining_number==0 && (status==2|| status==3||status==4||status==5)">
						<text class="iconfont icon-xuanze" style="color: #ff6600;padding-right: 10rpx;"></text><text>恭喜您，拼团成功</text>
					</view>
					<view class="fs28 cr333 yiman" v-if="orderData.group_status==3">
						<text class="iconfont icon-guanbi1" style="color: #ff6600;padding-right: 10rpx;"></text><text>抱歉，拼团失败</text>
					</view>
					<view class="fs28 cr333 yiman" v-if="orderData.group_status==4">
						<text class="iconfont icon-guanbi1" style="color: #ff6600;padding-right: 10rpx;"></text><text>拼团已取消</text>
					</view>
					<view>
						<view class="fs28 cr333 yiman"  v-if="orderData.groupLog.remaining_number!=0 && status==1">支付订单即可邀请好友参团</view>
					</view>
					<view class="pintuanItem">
						<view v-for="(item,index) in orderData.member">
							<!-- <view style="height: 40rpx;">
								<view class="is_master" v-if="item.m_id==orderData.m_id">团长</view>
							</view> -->
							<view class="pintuanImg" v-if="item.auth.avatarUrl">
								<image :src="item.auth.avatarUrl" mode="widthFix"></image>
							</view>
							<view class="pintuanImg" v-else><image src="../../static/img_bg.jpg" mode="widthFix"></image></view>
							<!-- <view class="master">{{item.auth.nickName}}</view> -->
							<view>
								<view class="is_master" v-if="item.is_master==1">团长</view>
							</view>
						</view>
						<view class="fs28 cr333 pintuanTip" v-if="orderData.groupLog.remaining_number>0&& orderData.group_status==1">
						      还差<text style="color: #FF0000;">{{orderData.groupLog.remaining_number}}</text>人拼团成功
						</view>
					</view>
					<!-- <view class="fs28 cr333 yiman"  v-if="orderData.groupLog.remaining_number==0 && status==2"><text class="iconfont icon-xuanze" style="color: #FF6600;"></text>拼团成功</view> -->
				</view>
				<view class="bottom-pintuan" v-if="orderData.groupLog.remaining_number!=0 && (status==2)"><button class="theme-btn shareBtn" open-type="share">邀请好友参团</button></view>
				<!-- <view style="padding-bottom: 20rpx;">
					<view class="fs28 cr333 yiman"  v-if="orderData.groupLog.remaining_number!=0 && status==1">订单未支付，支付成功即可邀请好友参团</view>
				</view> -->
			</view>

			<view class="weui-cells">
				<view class="weui-cell weui-cell_access">
					<view class="weui-cell__bd">
						<view class="fs28 cr333">配送方式</view>
					</view>
					<view class="weui-cell__ft">
						<view class="fs24 cr9">￥{{orderData.delivery_price_real}}</view>
						<view class="fs24 cr9" v-if="orderData.delivery_id == 0">普通快递</view>
						<view class="fs24 cr9" v-else-if="orderData.delivery_id == 1">电子票</view>
						<view class="fs24 cr9" v-else-if="orderData.delivery_id == 2">门店自提</view>
					</view>
				</view>
				<view class="weui-cell weui-cell_input">
					<view class="weui-cell__hd">
						<view class="weui-label fs28 cr333 w80">留言</view>
					</view>
					<view class="weui-cell__bd">
						<input class="weui-input fs28 cr6 disabled" v-model="orderData.m_desc" />
					</view>
				</view>
				<view class="weui-cell">
					<view class="weui-cell__bd">
						<view class="fs28">商品金额</view>
						<view class="fs28" v-if="orderData.integral_money && orderData.integral_money > 0">积分抵扣</view>
						<view class="fs28">运费</view>
						<view class="fs28" v-if="orderData.coupons_price && orderData.coupons_price > 0">优惠券</view>
						<view class="fs28" v-if="orderData.discount_price && orderData.discount_price!=0">改价金额</view>
					</view>
					<view class="weui-cell__ft">
						<view class="fs28 theme-color">+ ￥{{orderData.sku_price_real}}</view>
						<view class="fs28 theme-color" v-if="orderData.integral_money && orderData.integral_money > 0">-
							{{orderData.integral_money}}</view>
						<view class="fs28 theme-color">+ {{orderData.delivery_price_real}}</view>
						<view class="fs28 theme-color" v-if="orderData.coupons_price && orderData.coupons_price > 0">-
							{{orderData.coupons_price}}</view>
						<view class="fs28 theme-color" v-if="orderData.discount_price>0">- {{discount_price}}</view>
						<view class="fs28 theme-color" v-if="orderData.discount_price<0">+ {{discount_price}}</view>
					</view>
				</view>
				<view class="weui-cell count">共{{orderData.buy_total | toInt}}件商品，合计：
					<text class="theme-color">￥{{orderData.pay_amount}}</text>
				</view>
			</view>
			<view class="weui-cells">
				<view class="weui-cell fs28">订单编号：<text selectable="true">{{orderData.order_no}}</text><text class="copy" @click='copy(orderData.order_no)'>复制</text></view>
				<view class="weui-cell fs28">下单时间：{{orderData.create_time | time}}</view>
			</view>
			<view class='shop weui-cells' v-if="orderData.shop">
				<view class="bar-title">
					<view class="title-text">
						<view>商家信息</view>
					</view>
				</view>
				<view class='shop-info'>
					<view class='shop-left' :data-id="orderData.shop.id">
						<view>
							<view class='name weui-cell fs28'>店铺名称：{{orderData.shop.name}}</view>
							<view class='shop-address shop-tel weui-cell fs28' @click="call(orderData.shop.tel)">商家电话：{{orderData.shop.tel}}<span
								 class="copy">拨打</span></view>
							<view class='shop-address weui-cell fs28' @click="daohang">商家地址：{{orderData.shop.address}}<span class="copy daohang-text">导航</span></view>
						</view>
					</view>
				</view>
			</view>
			<!-- <view class="weui-cells">
	    <view class="weui-cell amount">
	      <view>共
	        <text class="theme-color">{{orderData.buy_total}}</text>件，合计：
	        <text>￥{{orderData.pay_amount}}</text>
	      </view>
	    </view>
	  </view> -->
			<view style='height:150rpx'></view>
			<!-- <view class="bottom-fixed" v-if="is_pintuan">
				<view class="bottom-pintuan">
					<button class="theme-btn shareBtn" open-type="share">邀请好友参团</button>
				</view>
			</view> -->
			<view class="bottom-fixed">
				<view class="bottom-b">
					<text class="white" v-if="status==1" @click='_cancelOrder' :data-id="orderData.id">取消订单</text>
					<!-- <text class="white" wx:if="{{status==3}}">查看物流</text> -->
					<!-- <text class="white" wx:if="{{status==3||status==4||status==8||status==9}}" @click='_buyAgain' data-id="{{orderData.id}}">再次购买</text> -->
					<text class="theme-btn" v-if="status==1" @click='rePay' :data-id="orderData.id">去支付</text>
					<text class="theme-btn" v-if="orderData.type!=1 && orderData.payment_status==1 && (orderData.status==2) && !orderData.table_id" @click='toRefundOrder'
					 :data-id="orderData.id ">申请退款</text>
					<text class="theme-btn" v-if="(orderData.status==3 && orderData.delivery_id == 0)  || (orderData.status == 11 && orderData.delivery_status == 1 && orderData.delivery_id == 0)"
					 @click='_confirmOrder' :data-id="orderData.id">确认收货</text>
					<view class="check" v-if="orderData.payment_status==1 && (orderData.status==3 && orderData.delivery_id == 1)"
					 @click='showOrderCode' :data-no="orderData.check_code">核销码</view>
					<text class="theme-btn" v-if="status==4" @click='toEvaluate' :data-id="orderData.id">评价晒单</text>
					<text class="theme-btn" v-if="status==10">退款中</text>
					<text class="theme-btn" v-if="status==6">已退款</text>
					<!-- <text class="theme-btn">邀请好友参团</text> -->
					<!-- <text class="theme-btn" wx:if="{{status==5}}" @click='_buyAgain' data-id="{{orderData.id}}">再次购买</text> -->
				</view>
			</view>
		</view>
		<view class='share-box' :class="!showCode ? 'hide' : ''">
			<view class='choose'>
				<view class="main-content">
					<view>
						<image mode="widthFix" :src="qrcode"></image>
					</view>
					<view class="tips">核验票据时请出示该二维码给工作人员</view>
					<view class="tips check-code">核销码：<text>{{check_code}}</text></view>
				</view>
				<view @click='hiddenCode' class="close"><text class="iconfont icon icon-guanbi "></text></view>
			</view>
			<view class='maskLayer' @click='hiddenCode'></view>
		</view>
	</view>
</template>

<script>
	import moment from '@/utils/moment';
	import helper from '@/utils/helper.js';
	import {
		Order
	} from '@/model/order.js';
	var order = new Order();
	import {
		Cart
	} from '@/model/cart.js';
	var cart = new Cart();
	export default {
		components: {},
		data() {
			return {
				id: '',
				radioItems: [{
						name: '质量问题',
						value: '质量问题'
					},
					{
						name: '卖家发错货',
						value: '卖家发错货',
						checked: 'true'
					},
					{
						name: '七天无理由',
						value: '七天无理由'
					},
					{
						name: '商品与页面图片不符',
						value: '商品与页面图片不符'
					},
					{
						name: '发票问题',
						value: '发票问题'
					},
					{
						name: '其它',
						value: '其它'
					},
				],
				hiddenSelBox: false,
				orderData: {
					m_desc: '',
				},
				status: '',
				countDownHour: 0,
				countDownMinute: 0,
				countDownSecond: 0,
				desNull: '',
				showDaohang: false,
				showCode: false,
				qrcode: '',
				order_status: '',
				check_code: '', // 核销码
				is_pintuan: true,
				parent_sn:'',
				showCity:false
			}
		},
		onLoad(options) {
			this.$data.status = options.status;
			this.$data.id = options.id;
			this.$data.parent_sn = options.parent_sn;
			if(this.$data.id){
				this._loadData(this.$data.id);
			}else{
				this._loadData(this.$data.parent_sn);
			}
			// #ifdef MP-WEIXIN
			this.showDaohang = true;
			// #endif
		},
		onPullDownRefresh() {

		},
		filters: {
			// 时间格式化
			time(val) {
				return moment(val * 1000).format('YYYY-MM-DD HH:mm');
			},
			//
			toInt(val) {
				return helper.toInt(val);
			}
		},
		//分享给好友拼单
		onShareAppMessage(res) {
			var imageUrl = this.orderData.orderSku[0] ? this.orderData.orderSku[0].sku_image : '';
			if (res.from === 'button') {
				console.log("来自页面内按钮分享")
			}
			return {			
				path: "/pages/group/index?id=" + this.orderData.member[0].group_order_id+'&sku_id='+this.orderData.orderSku[0].sku_id,
				title: '分享一个好物给你，快加入拼团吧！',
				imageUrl: imageUrl, 
			}
		},
		methods: {
			_loadData: function(id) {
				var that = this;
				var args = {
					// order_id: id,
					'expand': 'orderPick,shop'
				}
				if(that.$data.id){
					args.order_id=id
				}else if(this.$data.parent_sn){
					args.parent_sn=id
				}
				order.getOrderDetails(args, (data) => {
					if (this.$data.status == 1) {
						this.counTtime(data.create_time, data.id)
					}else{
						if(data.type==1&&data.groupLog&&data.groupLog.created_at){
							var groupEndTime=parseInt(data.groupLog.created_at)+(data.groupLog.hours*60*60);
							this.counTtime(groupEndTime,'' ,'group')
						}
					}
					var discount_price = Math.abs(data.discount_price);
					that.$data.orderData = data;
					that.$data.status = data.status;
					that.$data.discount_price = discount_price;
				})
			},
			changeData: function() {
				this._loadData(this.$data.id);
			},

			//倒计时
			counTtime: function(create_time, id,type) {
				var interval = setInterval(function() {
					var endtime=';'
					if(type=='group'){
						endtime = create_time;
					}else{
						endtime = (parseInt(create_time) + 2 * 3600);
					}
					var nowtime = Date.parse(new Date()) / 1000
					var totalSecond = endtime - nowtime;
					var second = totalSecond;

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
					this.$data.countDownDay = dayStr;
					this.$data.countDownHour = hrStr;
					this.$data.countDownMinute = minStr;
					this.$data.countDownSecond = secStr;
					totalSecond--;
					if(type!='group'){
						if (totalSecond < 0) {
							clearInterval(interval);
							var cancelParam = {
								order_id: id
							}
							order.scancelOrder(cancelParam, (res) => {})
							this.$data.status = 9
						}
					}
					//订单关闭


				}.bind(this), 1000);

			},

			// 取消订单
			_cancelOrder: function(event) {
				var that = this;
				uni.showModal({
					title: '提示',
					content: '订单还未付款，确定要取消么？',
					cancelText: '取消订单',
					confirmText: '考虑一下',
					success: function(res) {
						if (res.confirm) {
							console.log('再考虑一下')
						} else if (res.cancel) {
							var id = that.getDataSet(event, "id");
							var param = {
								order_id: id,
							};
							order.cancelOrder(param, (res) => {
								if (res.status == 1) {
									that.$data.status = 8
									uni.showToast({
										title: '取消订单成功~',
										icon: 'none',
										duration: 2000
									})
									//获取页面栈
									var pages = getCurrentPages();
									if (pages.length > 1) {
										//上一个页面实例对象
										var prePage = pages[pages.length - 2];
										//关键在这里,这里面是触发上个界面
										prePage.changeData()
									}
								} else {
									uni.showToast({
										title: res.msg,
										icon: 'none',
										duration: 2000
									})
								}
							})
						}
					}
				})
			},

			// 确认收货
			_confirmOrder: function(event) {
				var that = this;
				var id = this.getDataSet(event, "id")
				wx.showModal({
					title: '提示',
					content: '你是否收到该订单商品？',
					confirmText: '已收货',
					cancelText: '未收货',
					success: function(res) {
						if (res.confirm) {
							console.log('已收货')
							order.confirmOrder(id, (res) => {
								console.log(res.status)
								if (res.status == 1) {
									that.setData({
										status: 4
									})
									wx.showToast({
										title: '确认收货成功',
										icon: 'none',
										duration: 2000
									})
									//获取页面栈
									var pages = getCurrentPages();
									console.log(pages);
									if (pages.length > 1) {
										//上一个页面实例对象
										var prePage = pages[pages.length - 2];
										//关键在这里,这里面是触发上个界面
										prePage.changeData()
									}
								}
							})
						} else if (res.cancel) {
							console.log('未收货')
						}
					}
				})
			},
			copy: function(content) {
				// #ifdef H5
				helper.h5Copy(content);
				uni.showToast({
					title: "已复制"
				})
				// #endif
				// #ifdef MP-WEIXIN
				this.xcxCopy(content);
				// #endif
			},
			//小程序复制
			xcxCopy: function(content) {
				uni.setClipboardData({
					data: content,
					success: function(res) {
						uni.getClipboardData({
							success: function(res) {
								uni.showToast({
									title: '复制成功'
								})
							}
						})
					}
				})
			},
			// 申请退款
			toRefundOrder: function(event) {
				var id = this.$data.id;
				var url = '/pages/order/refund?id=' + id;
				this.goto(url);
			},
			daohang: function() {
				wx.openLocation({
					longitude: Number(this.orderData.shop.lng),
					latitude: Number(this.orderData.shop.lat),
					name: this.orderData.shop.name,
					address: this.orderData.shop.address
				})
			},
			//拨打电话
			call: function(e) {
				var that = this;
				var tel = e;
				uni.makePhoneCall({

					// 手机号
					// phoneNumber: that.getDataSet(e, "tel"),
					phoneNumber: tel,

					// 成功回调
					success: (res) => {
						console.log('调用成功!')
					},

					// 失败回调
					fail: (res) => {
						console.log('调用失败!')
					}

				});
			},
			//评价晒单
			toEvaluate: function(event) {
				var id = order.getDataSet(event, 'id');
				wx.navigateTo({
					url: '../evaluate/list?order_id=' + id
				});
			},

			/*未支付订单再次支付*/
			rePay: function(event) {
				var id = this.getDataSet(event, 'id');
				var url = '/pages/order/payment?order_id=' + id;
				this.goto(url)
			},
			//跳转到商品详情
			toProduct: function(e) {
				var id = this.getDataSet(e, "id");
				var url = '/pages/product/detail?id=' + id;
				this.goto(url)
			},
			intoMap: function() {
				var that = this;
				// wx.getLocation({
				// 	type: 'wgs84', //返回可以用于wx.openLocation的经纬度
				// 	success: function(res) { //因为这里得到的是你当前位置的经纬度
				// 		var latitude = res.latitude
				// 		var longitude = res.longitude
				wx.openLocation({ //所以这里会显示你当前的位置
					latitude: parseFloat(that.orderData.orderPick.latitude),
					longitude: parseFloat(that.orderData.orderPick.longitude),
					name: that.orderData.orderPick.name,
					address: that.orderData.orderPick.info,
					scale: 28
				})
				// 	}
				// })
			},
			showOrderCode: function(e) {
				var that = this;
				var order_num = e.currentTarget.dataset.no;
				var param = {
					// code: order_num
					check_code: order_num
				}
				that.showCode = true;
				uni.showLoading({
					title: '加载中...',
				})
				order.qrcode(param, (res) => {
					uni.hideLoading();
					if (res.status == 1) {
						that.qrcode = res.data;
						that.check_code = res.check_code;
					}
				});
			},
			//隐藏二维码弹窗
			hiddenCode: function() {
				this.showCode = false;
			},
			toJoin: function(e) {
				var that = this;
				var params = {
					sku_id: that.orderData.orderSku[0].sku_id,
					type: 1,
					num: 1
				}
				cart.add(params, (data) => {
					if (data.status == 1) {
						var msg = data.msg;
					}else{
						uni.showToast({
							title:data.msg ? data.msg : '',
							icon:'none',
							duration:2000
						})
					}
			
				});
			},
		}

	}
</script>

<style>
	@import '@/pages/order/order.css';
		.goods-price{justify-content: space-between;display:flex;}
	.time {
		color: #999;
		font-size: 24rpx;
		margin-top: 10rpx;
	}

	.time text {
		padding: 0 20rpx;
		font-size: 30rpx;
	}
	.grouptime{
		color: #999;
		font-size: 24rpx;
		/* margin-top: 10rpx; */
	}
	.grouptime text {
		padding: 0 10rpx;
		/* font-size: 30rpx; */
		background-color: #FF6600;
		color: #FFFFFF;
		margin: 0 10rpx;
		border-radius: 5rpx;
	}

	.count {
		font-size: 28rpx;
		justify-content: flex-end;
	}

	.amount {
		font-size: 28rpx;
		justify-content: flex-end
	}

	.title-text {
		background-color: #fff;
		color: #666;
		text-align: center;
		padding: 10rpx 0;
		margin: 0 auto;
		font-size: 28rpx;
	}

	.title-text view {}

	.daohang {
		background-color: #FF6600;
		color: #fff;
		border-radius: 10rpx;
		padding: 10rpx 20rpx;
		font-size: 28rpx;
	}

	.copy {
		border: 1px solid #1890FF;
		color: #1890FF;
		padding: 4rpx 8rpx;
		border-radius: 10rpx;
		font-size: 24rpx;
		margin-left: 20rpx;
	}

	.daohang-text {
		width: 80rpx;
		text-align: center;
	}

	/*二维码*/
	.choose {
		width: 80%;
		-webkit-animation: spin .2s linear;
		animation: spin .2s linear;
		position: fixed;
		top: 10%;
		left: 10%;
		z-index: 99999;
	}

	.main-content {
		background-color: #fff;
		padding: 40rpx 20rpx;
	}

	.choose image {
		width: 100%;
		margin: 0 auto
	}

	.close {
		text-align: center;
	}

	.close .icon-guanbi {
		color: #f9f9f9;
		font-size: 80rpx;
		margin: 0 auto;
		margin-top: 40rpx;
	}

	.img-box {
		width: 20%;
	}

	.reload {
		margin-top: 100rpx;
	}

	.reload .goto {
		border: 1px solid #ff6600;
		color: #ff6600;
		padding: 8rpx 20rpx;
		border-radius: 3px;
		width: 200rpx;
	}

	.check {
		background-color: #1AAD16;
		padding: 15rpx 30rpx;
		display: inline-block;
		font-size: 28rpx;
		margin-right: 15rpx;
		border-radius: 10rpx;
		color: #fff;
	}

	.check-code {
		margin-top: 15rpx;
	}

	.check-code text {
		font-weight: bold;
		font-size: 38rpx;
	}

	.to-call {
		border: 1px solid #007AFF;
		color: #007AFF;
		padding: 10rpx 15rpx;
	}

	.fs28 {
		padding-bottom: 10rpx;
	}

	.bottom-pintuan {
		width: 30%;
		font-size: 28rpx;
		padding: 20rpx 0;
		margin: 0 auto;
	}

	.shareBtn {
		background-color: #ff6600 !important;
		color: #fff !important;
		padding: 15rpx;
		font-size: 28rpx;
	}

	.pingtuantop {
		padding-bottom: 30rpx;
		text-align: center;
	}

	.pingtuanList {
		padding: 20rpx 30rpx
	}

	.pintuanItem {
		display: flex;
		justify-content: center;
	}
	.pintuanImg{
		padding-right: 30rpx;
	}

	.pintuanImg image {
		height: 100rpx;
		width: 100rpx;
		border-radius: 50%;
		overflow: hidden;
	}

	.pintuanTip {
		align-items: center;
		display: flex;
		color: #999999;
	}
	.yiman{
		text-align: center;
		color: #FF6600;
		padding-bottom: 30rpx;
	}

	button::after {
		border: none; 
	}

	.master {
		text-align: center;
		width: 100rpx;
		font-size: 24rpx;
		border-radius: 20rpx;
	}
	.is_master{
		text-align: center;
		width: 80rpx;
		font-size: 24rpx;
		background-color: #ff6600;
		color: #fff;
		border-radius: 20rpx;
		position: absolute;
		margin-top: -25rpx;
		margin-left: 10rpx;
	}

	/* #ifdef APP-PLUS */
	.cr9 {
		padding-bottom: 10rpx;
	}

	/* #endif */
</style>
