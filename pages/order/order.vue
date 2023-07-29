<template>
	<view class="content">
		<view class="navbar">
			<view 
				v-for="(item, index) in navList" :key="index" 
				class="nav-item" 
				:class="{current: tabCurrentIndex === index}"
				@click="tabClick(index)"
			>
				{{item.text}}
			</view>
		</view>

		<swiper :current="tabCurrentIndex" class="swiper-box" duration="300" @change="changeTab">
			<swiper-item class="tab-content" v-for="(tabItem,tabIndex) in navList" :key="tabIndex">
				<scroll-view 
					class="list-scroll-content" 
					scroll-y
					@scrolltolower=""
				>
					<!-- 空白页 -->
					<empty v-if="tabItem.loaded === true && tabItem.orderList.length === 0"></empty>
					
					<!-- 订单列表 -->
					<view 
						v-for="(item,index) in tabItem.orderList" :key="index"
						class="order-item"
					>
						<view class="i-top b-b">
							<text class="time">预约时间:{{item.goodsInfo.date}}</text>
							<text class="state" :style="{color: item.stateTipColor}">{{item.stateTip}}</text>
							<text 
								v-if="item.order_status==9" 
								class="del-btn yticon icon-iconfontshanchu1"
								@click="deleteOrder(item, index)"
							></text>
							<text
								v-if="item.order_status==8" 
								class="del-btn yticon icon-iconfontshanchu1"
								@click="deleteOrder(item, index)"
							></text>
							<text
								v-if="item.order_status==6" 
								class="del-btn yticon icon-iconfontshanchu1"
								@click="deleteOrder(item, index)"
							></text>
						</view>
						
						<view 
							class="goods-box-single"
						>
							<image class="goods-img" :src="item.room.image1" mode="aspectFill"></image>
							<view class="right">
								<text class="title clamp">{{item.room.name}}</text>
								<text class="attr-box">{{item.room.price_per_hour/100}}  x {{item.goodsInfo.time_list.length}} + {{item.room.price_per_person/100}} x {{item.goodsInfo.user_count}}</text>
								<text class="price">{{computeTotalPrice(item)/100}}</text>
							</view>
						</view>
						
						<text v-if="item.order_type==1&&item.order_status==0">(已为您锁定预约时间段，请尽快完成支付)</text>
						<text>选择时段: </text>
						<view class="item-list">
							<text 
								v-for="(childItem, childIndex) in item.goodsInfo.time_list" 
								:key="childIndex" class="tit"
							>
								{{childItem[0]}}:00 - {{childItem[1]}}:00
							</text>
						</view>
						
						<view class="price-box">
							共
							<text class="num">1</text>
							件商品 实付款
							<text class="price" v-if="item.order_status == 0">{{computePrice(item)/100}}</text>
							<text class="price" v-else-if="item.request_data">{{item.request_data.total_fee /100}}</text>
							<text class="price" v-else>{{computeTotalPrice(item)/100}}</text>
						</view>
						<view class="action-box b-t" v-if="item.order_status == 0">
							<button class="action-btn recom" @click="requestPay(item)">立即支付</button>
							<button class="action-btn recom" @click="cancelOrder(item)">取消订单</button>
						</view>
					</view>
					 
					<uni-load-more :status="tabItem.loadingType"></uni-load-more>
					
				</scroll-view>
			</swiper-item>
		</swiper>
	</view>
</template> 

<script>
	import {
		mapState,
		mapActions,
		mapMutations
	} from 'vuex'; 
	import empty from "@/components/empty";
	import AUTH from '../../utils/auth.js'
	export default {
		components: {
			empty
		},
		computed: {
			...mapState(['hasLogin','userInfo', 'token', 'openid'])
		},
		data() {
			return {
				tabCurrentIndex: 0,
				allOrderList:[],
				navList: [{
						state: 0,
						text: '全部',
						loadingType: 'more',
						orderList: []
					},
					{
						state: 1,
						text: '待付款',
						loadingType: 'more',
						orderList: []
					},
					{
						state: 2,
						text: '已完成',
						loadingType: 'more',
						orderList: []
					},
					{
						state: 3,
						text: '付款失败',
						loadingType: 'more',
						orderList: []
					}
				],
				useAccountBalance:true,
			};
		},
		
		onLoad(options){
			/**
			 * 修复app端点击除全部订单外的按钮进入时不加载数据的问题
			 * 替换onLoad下代码即可
			 */
			this.tabCurrentIndex = options.state;
			this.loadData()
		},
		 
		methods: {
			...mapActions(['loginAndRegister', 'getUserInfo']),
			//获取订单列表
			loadData(source){
				//这里是将订单挂载到tab列表下
				let index = this.tabCurrentIndex;
				let navItem = this.navList[index];
				let state = navItem.state;
				const _this = this;
				
				if(source === 'tabChange' && navItem.loaded === true){
					//tab切换只有第一次需要加载数据
					return;
				}
				if(navItem.loadingType === 'loading'){
					//防止重复加载
					return;
				}
				
				for (var i = 0; i < this.navList.length; i++) {
					this.navList[i].loadingType = 'loading';
				}
				var today = new Date();
				var date = today.getFullYear()+'-'+(today.getMonth()+1).toString().padStart(2, "0")+'-'+(today.getDate()).toString().padStart(2, "0");
				AUTH.getRoomDataList(this.token, date).then(res=>{
					if(!res) return;
					let rooms = res.data.rooms;
					AUTH.getOrderList(state-1, this.token).then(function(res){
						if(!res) return;
						var firstNavItem = _this.navList[0];
						res.data.orders.forEach(item=>{
							let goodsInfoStr = item.goods_info;
							let goodsInfo = JSON.parse(goodsInfoStr);
							item.goodsInfo = goodsInfo;
							if(item.order_type == 1){ //appointment
								item.room = _this.getRoomById(rooms, goodsInfo.room_id);
								let specificIndex = item.order_status + 1;
								if(item.order_status == 8) //canceled
									specificIndex = 3;
								item = Object.assign(item, _this.orderStateExp(item.order_status));
								let specificNavItem = _this.navList[specificIndex];
								if(specificNavItem)
									specificNavItem.orderList.push(item);
								firstNavItem.orderList.push(item);
							}
						});
						
						for (var i = 0; i < _this.navList.length; i++) {
							//loaded新字段用于表示数据加载完毕，如果为空可以显示空白页
							_this.$set(_this.navList[i], 'loaded', true);
							//判断是否还有数据， 有改为 more， 没有改为noMore 
							_this.navList[i].loadingType = 'noMore';
						}
					
					});
				});
			},
			 
			getRoomById(rooms,id){
				for (var i = 0; i < rooms.length; i++) {
					if(rooms[i].object_id == id) return rooms[i];
				}
			},

			//swiper 切换
			changeTab(e){
				this.tabCurrentIndex = e.target.current;
				this.loadData('tabChange');
			},
			//顶部tab点击
			tabClick(index){
				this.tabCurrentIndex = index;
			},
			//删除订单
			deleteOrder(item, index){
				uni.showLoading({
					title: '请稍后'
				});
				var _this = this;
				var params = {order_number:item.order_number};
				AUTH.deleteOrder(this.token, params).then(res=>{
					uni.hideLoading();
					if(!res) return;
					_this.navList[_this.tabCurrentIndex].orderList.splice(index, 1);
				});
			},
			//取消订单
			cancelOrder(item){
				uni.showLoading({
					title: '请稍后'
				});
				var _this = this;
				var params = {order_number:item.order_number};
				AUTH.cancelOrder(this.token, params).then(res=>{
					uni.hideLoading();
					if(!res) return;
					let {stateTip, stateTipColor} = _this.orderStateExp(8);
					item.order_status = 8;
					item = Object.assign(item, {
						state: 8,
						stateTip, 
						stateTipColor
					})
					//加到支付失败的列表
					_this.navList[3].orderList.push(item);
					//取消订单后删除待付款中该项
					let list = _this.navList[1].orderList;
					let index = list.findIndex(val=>val.order_number === item.order_number);
					index !== -1 && list.splice(index, 1);
				});
			},
			
			requestPay(item){
				var url = '/pages/order/payment?parent_sn='+item.order_number + '&entry=2'+'&data='+ JSON.stringify(item);
				uni.redirectTo({
				  	url:url
				});
			},
			
			computePrice(item){
				// var balance = this.userInfo.account_balance;
				var totalPrice = this.computeTotalPrice(item);
				var price = totalPrice;
				// return this.useAccountBalance?(balance >=price?0:(price-balance)): price;
				return price;
			},
			computeTotalPrice(item){
				var totalPrice = item.room.price_per_hour * item.goodsInfo.time_list.length + item.room.price_per_person * item.goodsInfo.user_count;
				return totalPrice;
			},
			//订单状态文字和颜色
			orderStateExp(state){
				let stateTip = '',
					stateTipColor = '#fa436a';
				switch(state){
					case 0:
						stateTip = '待付款'; break;
					case 1:
						stateTip = '已预约'; break;
					case 9:
						stateTip = '订单已关闭'; 
						stateTipColor = '#909399';
						break;
					case 8:
						stateTip = '已取消'; 
						stateTipColor = '#909399';
						break;
					case 6:
						stateTip = '已退款'; 
						stateTipColor = '#909399';
						break;
						
					//更多自定义
				}
				return {stateTip, stateTipColor};
			},
			handleBalanceCheckboxChange(e){
				this.useAccountBalance = e.detail.value;
			},
		},
	}
</script>

<style lang="scss">
	page, .content{
		background: $page-color-base;
		height: 100%;
	}
	
	.swiper-box{
		height: calc(100% - 40px);
	}
	.list-scroll-content{
		height: 100%;
	}
	
	.navbar{
		display: flex;
		height: 40px;
		padding: 0 5px;
		background: #fff;
		box-shadow: 0 1px 5px rgba(0,0,0,.06);
		position: relative;
		z-index: 10;
		.nav-item{
			flex: 1;
			display: flex;
			justify-content: center;
			align-items: center;
			height: 100%;
			font-size: 15px;
			color: $font-color-dark;
			position: relative;
			&.current{
				color: $base-color;
				&:after{
					content: '';
					position: absolute;
					left: 50%;
					bottom: 0;
					transform: translateX(-50%);
					width: 44px;
					height: 0;
					border-bottom: 2px solid $base-color;
				}
			}
		}
	}

	.uni-swiper-item{
		height: auto;
	}
	.order-item{
		display: flex;
		flex-direction: column;
		padding-left: 30upx;
		background: #fff;
		margin-top: 16upx;
		.i-top{
			display: flex;
			align-items: center;
			height: 80upx;
			padding-right:30upx;
			font-size: $font-base;
			color: $font-color-dark;
			position: relative;
			.time{
				flex: 1;
			}
			.state{
				color: $base-color;
			}
			.del-btn{
				padding: 10upx 0 10upx 36upx;
				font-size: $font-lg;
				color: $font-color-light;
				position: relative;
				&:after{
					content: '';
					width: 0;
					height: 30upx;
					border-left: 1px solid $border-color-dark;
					position: absolute;
					left: 20upx;
					top: 50%;
					transform: translateY(-50%);
				}
			}
		}
		/* 多条商品 */
		.goods-box{
			height: 160upx;
			padding: 20upx 0;
			white-space: nowrap;
			.goods-item{
				width: 120upx;
				height: 120upx;
				display: inline-block;
				margin-right: 24upx;
			}
			.goods-img{
				display: block;
				width: 100%;
				height: 100%;
			}
		}
		/* 单条商品 */
		.goods-box-single{
			display: flex;
			padding: 20upx 0;
			.goods-img{
				display: block;
				width: 120upx;
				height: 120upx;
			}
			.right{
				flex: 1;
				display: flex;
				flex-direction: column;
				padding: 0 30upx 0 24upx;
				overflow: hidden;
				.title{
					font-size: $font-base + 2upx;
					color: $font-color-dark;
					line-height: 1;
				}
				.attr-box{
					font-size: $font-sm + 2upx;
					color: $font-color-light;
					padding: 10upx 12upx;
				}
				.price{
					font-size: $font-base + 2upx;
					color: $font-color-dark;
					&:before{
						content: '￥';
						font-size: $font-sm;
						margin: 0 2upx 0 8upx;
					}
				}
			}
		}
		
		.item-list{
			padding: 20upx 0 0;
			display: flex;
			flex-wrap: wrap;
			text{
				display: flex;
				align-items: center;
				justify-content: center;
				background: #eee;
				margin-right: 20upx;
				margin-bottom: 20upx;
				border-radius: 100upx;
				min-width: 60upx;
				height: 60upx;
				padding: 0 20upx;
				font-size: $font-base;
				color: $font-color-dark;
			}
		}
		
		.price-box{
			display: flex;
			justify-content: flex-end;
			align-items: baseline;
			padding: 20upx 30upx;
			font-size: $font-sm + 2upx;
			color: $font-color-light;
			.num{
				margin: 0 8upx;
				color: $font-color-dark;
			}
			.price{
				font-size: $font-lg;
				color: $font-color-dark;
				&:before{
					content: '￥';
					font-size: $font-sm;
					margin: 0 2upx 0 8upx;
				}
			}
		}
		.action-box{
			display: flex;
			justify-content: flex-end;
			align-items: center;
			height: 100upx;
			position: relative;
			padding-right: 30upx;
		}
		.action-btn{
			width: 160upx;
			height: 60upx;
			margin: 0;
			margin-left: 24upx;
			padding: 0;
			text-align: center;
			line-height: 60upx;
			font-size: $font-sm + 2upx;
			color: $font-color-dark;
			background: #fff;
			border-radius: 100px;
			&:after{
				border-radius: 100px;
			}
			&.recom{
				background: #fff9f9;
				color: $base-color;
				&:after{
					border-color: #f7bcc8;
				}
			}
		}
	}
	
	
	/* load-more */
	.uni-load-more {
		display: flex;
		flex-direction: row;
		height: 80upx;
		align-items: center;
		justify-content: center
	}
	
	.uni-load-more__text {
		font-size: 28upx;
		color: #999
	}
	
	.uni-load-more__img {
		height: 24px;
		width: 24px;
		margin-right: 10px
	}
	
	.uni-load-more__img>view {
		position: absolute
	}
	
	.uni-load-more__img>view view {
		width: 6px;
		height: 2px;
		border-top-left-radius: 1px;
		border-bottom-left-radius: 1px;
		background: #999;
		position: absolute;
		opacity: .2;
		transform-origin: 50%;
		animation: load 1.56s ease infinite
	}
	
	.uni-load-more__img>view view:nth-child(1) {
		transform: rotate(90deg);
		top: 2px;
		left: 9px
	}
	
	.uni-load-more__img>view view:nth-child(2) {
		transform: rotate(180deg);
		top: 11px;
		right: 0
	}
	
	.uni-load-more__img>view view:nth-child(3) {
		transform: rotate(270deg);
		bottom: 2px;
		left: 9px
	}
	
	.uni-load-more__img>view view:nth-child(4) {
		top: 11px;
		left: 0
	}
	
	.load1,
	.load2,
	.load3 {
		height: 24px;
		width: 24px
	}
	
	.load2 {
		transform: rotate(30deg)
	}
	
	.load3 {
		transform: rotate(60deg)
	}
	
	.load1 view:nth-child(1) {
		animation-delay: 0s
	}
	
	.load2 view:nth-child(1) {
		animation-delay: .13s
	}
	
	.load3 view:nth-child(1) {
		animation-delay: .26s
	}
	
	.load1 view:nth-child(2) {
		animation-delay: .39s
	}
	
	.load2 view:nth-child(2) {
		animation-delay: .52s
	}
	
	.load3 view:nth-child(2) {
		animation-delay: .65s
	}
	
	.load1 view:nth-child(3) {
		animation-delay: .78s
	}
	
	.load2 view:nth-child(3) {
		animation-delay: .91s
	}
	
	.load3 view:nth-child(3) {
		animation-delay: 1.04s
	}
	
	.load1 view:nth-child(4) {
		animation-delay: 1.17s
	}
	
	.load2 view:nth-child(4) {
		animation-delay: 1.3s
	}
	
	.load3 view:nth-child(4) {
		animation-delay: 1.43s
	}
	
	@-webkit-keyframes load {
		0% {
			opacity: 1
		}
	
		100% {
			opacity: .2
		}
	}
</style>
