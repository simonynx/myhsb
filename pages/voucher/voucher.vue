<template>
	<view class="content">
		<view class="tabr">
			<view 
				v-for="(item, index) in navList" :key="index" 
				class="tab-item" :class="{on: tabCurrentIndex === index}"
				@click="tabClick(index)"
			>
				{{item.text}}
			</view>
			<view class="border" :class="{invalid: tabCurrentIndex== index}"></view>
		</view>
		
		<swiper :current="tabCurrentIndex" class="swiper-box" duration="300" @change="changeTab">
			<swiper-item class="tab-content" v-for="(tabItem,tabIndex) in navList" :key="tabIndex">
				<scroll-view 
					class="sub-list" 
					scroll-y
					@scrolltolower=""
				>
					<!-- 空白页 -->
					<empty v-if="tabItem.loaded === true && tabItem.goodsList.length === 0">
						<view class="tis">没有数据~</view>
					</empty>
					
					<!-- 订单列表 -->
					<view 
						v-for="(item,index) in tabItem.goodsList" :key="index"
						class="movie-ticket" @tap.stop="handleTicketClick(item)"
					>
							<view class="left">
								<text class="description">{{item.description}}</text>
								<text class="criteria">有效范围：预约</text>
								<text class="other" v-if="item.can_use_balance < 1">(不可使用余额支付)</text>
								<text class="validity" v-if="item.validity_period_start">有效期：{{item.validity_period_start}}~{{item.validity_period_end}}</text>
								<text class="validity" v-else>有效期：无</text>
							</view>
							<view class="seam"></view>
							<view class="right">
							  <text class="price">¥{{item.price/100}}</text>
							  <text class="title">{{item.name}}</text>
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
				allGoodsList:[],
				navList: [{
						type: 0,
						text: '全部',
						loadingType: 'more',
						goodsList: []
					},{
						type: 1,
						text: '储值',
						loadingType: 'more',
						goodsList: []
					},
					{
						type: 2,
						text: '美容',
						loadingType: 'more',
						goodsList: []
					},
					{
						type: 3,
						text: '其它',
						loadingType: 'more',
						goodsList: []
					},
				],
				headerTop:0,
				//控制滑动效果
			}
		},
		onPageScroll(e){
			
		},
		//下拉刷新，需要自己在page.json文件中配置开启页面下拉刷新 "enablePullDownRefresh": true
		onPullDownRefresh() {
		},
		onLoad() {
		},
		onShow() {
			if(!this.hasLogin){
				this.loginAndRegister();
			}else{
				for (var i = 0; i < this.navList.length; i++) {
					//loaded新字段用于表示数据加载完毕，如果为空可以显示空白页
					this.$set(this.navList[i], 'loaded', false);
					//判断是否还有数据， 有改为 more， 没有改为noMore 
					this.navList[i].loadingType = 'more';
					this.navList[i].goodsList = [];
				}
				this.loadData();
			}
		},
		methods: {
			...mapActions(['loginAndRegister', 'getUserInfo']),
			loadData(source){
				//这里是将订单挂载到tab列表下
				let index = this.tabCurrentIndex;
				let navItem = this.navList[index];
				let goodsType = navItem.type;
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

				AUTH.getGoodsList(this.token).then(function(res){
					if(!res) return;
					var firstNavItem = _this.navList[0];
					res.data.goods.forEach(item=>{
						let specificIndex = item.goods_type;
						// item = Object.assign(item, _this.orderStateExp(specificIndex));
						let specificNavItem = _this.navList[specificIndex];
						specificNavItem.goodsList.push(item);
						firstNavItem.goodsList.push(item);
					});
					
					for (var i = 0; i < _this.navList.length; i++) {
						//loaded新字段用于表示数据加载完毕，如果为空可以显示空白页
						_this.$set(_this.navList[i], 'loaded', true);
						//判断是否还有数据， 有改为 more， 没有改为noMore 
						_this.navList[i].loadingType = 'noMore';
					}
					// console.log("======================>fucking goods:", _this.navList)
				
				});
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
			handleTicketClick(goods){
				uni.navigateTo({
					url:`/pages/voucher/detail?data=${JSON.stringify(goods)}`
				});
			},
			discard() {
				//丢弃
			},
		}
	}
</script>
<style lang="scss">
	page,.content{
		height: 100%;
		background-color: #f5f5f5;
	}
	.hidden{
		display: none !important;
	}

	.tabr{
		display: flex;
		background-color: #fff;
		height: 40px;
		padding: 0 3%;
		border-bottom: solid 1upx #dedede;
		position: relative;
		top: 0;
		z-index: 10;
		.tab-item{
			flex: 1;
			display: flex;
			width: 50%;
			height: 100%;
			justify-content: center;
			align-items: center;
			font-size: 32upx;
			color: #999;
			position: relative;
			&.on{
				color: #f06c7a;
			}
		}
		.border{
			height: 4upx;
			background-color: #f06c7a;
			transition: all .3s ease-out;
			&.invalid{
				transform: translate3d(100%,0,0);
			}
		}
		
	}
	.swiper-box{
		height: calc(100% - 40px);
	}
	.sub-list{
		width: 100%;
		height: 100%;
		padding: 20upx 0 120upx 0;
		
		.tis{
			width: 100%;
			height: 60upx;
			justify-content: center;
			align-items: center;
			font-size: 32upx;
		}
		
		.movie-ticket {
		  display: flex;
		  flex-direction: row;
		  justify-content: space-between;
		  align-items: center;
		  // width: 100%;
		  height: 150px;
		  // border: 4rpx solid #ee6701;
		  border-radius: 10rpx;
		  font-family: Arial, sans-serif;
		  font-size: 28rpx;
		  box-shadow: 0 5px 10px rgba(0, 0, 0, 0.1);
		  overflow: hidden;
		  background-color: #f1f1f1;
		  margin: 20px;

		  .left {
			display: flex;
			flex-direction: column;
			justify-content: space-between;
		    top: 0;
		    left: 0;
		    width: 70%;
		    height: 150px;
		    background-color: #f2f2f2;
			padding: 10px;
			
			.description {
			  font-family: "Helvetica Neue", Arial, sans-serif;
			  font-size: 18px;
			  font-weight: normal;
			  color: #555555;
			}
			
			.validity {
			  font-family: "Arial", sans-serif;
			  font-size: 16px;
			  font-weight: normal;
			  color: #555555;
			}
			
			.criteria {
			  font-family: Arial, sans-serif;
			  font-size: 16px;
			  font-weight: normal;
			  color: #2d4c6d;
			}
			
			.other {
			  font-family: Arial, sans-serif;
			  font-size: 16px;
			  font-weight: normal;
			  color: #333;
			}
		  }
		  
		  .right {
			display: flex;
			flex-direction: column;
		    top: 0;
		    left: 70%;
		    width: 30%;
		    height: 150px;
		    background-color: #4caf50;
			padding: 10px;
			
			.title {
			  font-family: "Arial", sans-serif;
			  font-size: 20px;
			  font-weight: bold;
			  color: #f1f1f1;
			  text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.1);
			}
			.price {
			  top: 10px;
			  font-family: "Arial", sans-serif;
			  font-size: 22px;
			  font-weight: bold;
			  color: #ad2e24;
			  text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.1);
			}
		  }
		  
		  .seam {
		    top: 0;
		    left: 0;
		    width: 2px;
		    height: 150px;
		    background-color: transparent;
		    border-right: 1px dashed #000;
		  }
		}
	}	
	
</style>
