<template>
	<!--
	本页面模板教程：https://ext.dcloud.net.cn/plugin?id=2651
	uni-list 文档：https://ext.dcloud.net.cn/plugin?id=24
	uniCloud 文档：https://uniapp.dcloud.io/uniCloud/README
	unicloud-db 组件文档：https://uniapp.dcloud.io/uniCloud/unicloud-db
	DB Schema 规范：https://uniapp.dcloud.net.cn/uniCloud/schema
	 -->
	<view>
		<week-calendar @selected-change="selectedChange"></week-calendar>
		<!-- 刷新页面后的顶部提示框 -->
		<!-- 当前弹出内容没有实际逻辑 ，可根据当前业务修改弹出提示 -->
		<!-- <view class="tips" :class="{ 'tips-ani': tipShow }">为您更新了10条最新新闻动态</view> -->
		<!-- 页面分类标题 -->
		<!-- <uni-section title="最热商品" type="line"><button class="button-box" @click="select">切换视图</button></uni-section> -->

		<view class="uni-list">
			<view class="uni-list-cell" hover-class="uni-list-cell-hover" v-for="(value, index) in roomList" :key="index">
				<view class="uni-media-list">
					<image class="uni-media-list-logo" :src="value.image1" @click="goDetail(value)"></image>
					<view class="uni-media-list-body">
						<view class="uni-media-list-text-top">{{ value.name }}</view>
						<view class="uni-media-list-text-bottom">
							<text>{{ value.author_name }}</text>
							<!-- <text>{{ value.published_at }}</text> -->
						</view>
						<view class="uni-media-list-text-right">
							<button type="primary" size="mini" @click="goToAppoint(value)">预约</button>
						</view>
						<view class="price-box">
							<text class="price">{{value.price_per_hour / 100}}</text>
							<text class="other">已售 99</text>
						</view>
					</view>
				</view>
			</view>
			<!-- #ifdef APP-PLUS -->
			<view class="ad-view" v-if="(index > 0 && (index+1) % 10 == 0)">
				<ad :adpid="adpid" @error="aderror"></ad>
			</view>
			<!-- #endif -->
		</view>
		<uni-load-more :status="status" :icon-size="16" :content-text="contentText" />

		<!-- 规格-模态层弹窗 -->
		<view 
			class="popup spec" 
			:class="specClass"
			@touchmove.stop.prevent="stopPrevent"
			@click="closePopup"
		>
			<!-- 遮罩层 -->
			<view class="mask"></view>
			<view class="layer attr-content" @click.stop="stopPrevent">
				<view class="a-t">
					<image :src="currentSelectItem.image1"></image>
					<view class="right">
						<text class="price">¥{{currentSelectItem.price_per_hour / 100}}</text>
						<text class="stock">库存：999件</text>
						<view class="selected">
							已选：
							<text class="selected-text" v-for="(sItem, sIndex) in specSelected" :key="sIndex">
								{{sItem.interval}}
							</text>
						</view>
					</view>
				</view>
				<view v-for="(item,index) in specList" :key="index" class="attr-list">
					<text>{{item.name}}</text>
					<view class="item-list">
						<text 
							v-for="(childItem, childIndex) in specChildList" 
							:key="childIndex" class="tit"
							:class="{selected: childItem.selected, disabled: childItem.status > 1}"
							@click="selectSpec(childIndex, childItem.pid)"
						>
							{{childItem.interval}}
						</text>
					</view>
				</view>
				<button class="btn" @click="goToAppoint">完成</button>
			</view>
		</view>


	</view>
</template>

<script>
	import {
		dateUtils
	} from '../../../common/util.js';
	import {
		mapState
	} from 'vuex';
	const AUTH = require('../../../utils/auth.js')
	
	export default {
		components: {},
		data() {
			return {
				specClass: 'none',
				specSelected: [],
				specList: [
					{
						id: 1,
						name: '时间段',
					},
				],
				specChildList: [],
				status: 'refresh',
				adpid: '',
				listData: [],
				currentSelectItem: null,
				contentText: {
					contentdown: '上拉加载更多',
					contentrefresh: '加载中',
					contentnomore: '没有更多'
				},
				currentSelectDate:null,
				currentFullDate:null,
			};
		},
		computed:{
			roomList: {
				get() {
					return this.listData;
				},
				set(v) {
					this.listData = v;
				}
			}
		},
		onLoad() {
			this.adpid = this.$adpid;
		},
		onShow() {
			AUTH.checkHasLogined().then(isLogined => {
				this.getList(this.currentFullDate ? this.currentFullDate : new Date());
			});
		},
		onPullDownRefresh() {
			// this.reload = true;
			// this.last_id = '';
			this.status = 'refresh';
			// this.getList(new Date());
		},
		onReachBottom() {
			this.status = 'nomore';
			// this.getList();
		},
		methods: {
			getList(dayDate) {
				var _this = this;
				var today = new Date();
				var currentHour = today.getDay() == dayDate.getDay()? dayDate.getHours():-1;
				var date = dayDate.getFullYear()+'-'+(dayDate.getMonth()+1)+'-'+dayDate.getDate();
				this.currentSelectDate = date;
				this.currentFullDate = dayDate;
				AUTH.getRoomDataList(uni.getStorageSync("token"), date).then(function(res){
					var newList = [];
					res.data.rooms.forEach(item=>{
						var _item = item;
						_item.appoints = [];
						var start = item.opening_hours_start;
						var end = item.opening_hours_end;
						for (var i = start; i < end; i++) {
							var appoint = {};
							appoint.start = i;
							appoint.end = i+1;
							appoint.interval = i +":00 - " + (i+1) + ":00";
							appoint.status = 1;
							if (i <= currentHour){
								appoint.status = 2;
							}
							if (_this.findAppoint(res.data.appointments, item.object_id, i)){
								appoint.status = 3;
							}
							_item.appoints.push(appoint);
						}
						newList.push(_item);
					});
					_this.listData = newList;
				});
			},
			findAppoint(appointments, id, hour){
				for (var i = 0; i < appointments.length; i++) {
					if (appointments[i].room == id){
						for (var j = 0; j < appointments[i].time_list.length; j++) {
							let interval = appointments[i].time_list[j];
							if(interval[0] == hour && appointments[i].order_status == 1){ //1 for success
								return true;
							}
						}
					}
				}
				return false;
			},
			goDetail: function(item) {
				//测试数据没有写id，用title代替
				let id = item.id;
				uni.navigateTo({
					url: `/pages/product/product?data=${JSON.stringify(item)}&date=${this.currentSelectDate}`
				})
			},
			goToAppoint: function(e) {
				if (this.specClass === 'show') {
					this.specClass = 'hide';
					setTimeout(() => {
						this.specClass = 'none';
					}, 250);
					this.currentSelectItem.selects = this.specSelected;
					if(this.specSelected.length <= 0) return;
					uni.navigateTo({
						url: `/pages/order/createOrder?data=${JSON.stringify(this.currentSelectItem)}&date=${this.currentSelectDate}`
					})
				} else if (this.specClass === 'none') {
					this.currentSelectItem = e;
					// AUTH.getRoomAppointments(uni.getStorageSync("token"), this.currentSelectItem.object_id, this.currentSelectDate).then(res=>{
						this.specClass = 'show';
						// console.log("======================>fucking appoint:", res);
						this.specChildList = this.currentSelectItem.appoints;
					// });
				}
			},
			closePopup: function(e) {
				if (this.specClass === 'show') {
					this.specClass = 'hide';
					setTimeout(() => {
						this.specClass = 'none';
					}, 250);
					this.specSelected = [];
					this.specChildList.forEach(item=>{
						this.$set(item, 'selected', false);
					});
				}
			},
			//选择规格
			selectSpec(index, pid) {
				let list = this.specChildList;
				if (list[index].status > 1) return;
				if (list[index].selected) {
					this.$set(list[index], 'selected', false);
				} else {
					this.$set(list[index], 'selected', true);
				}
				//存储已选择
				/**
				 * 修复选择规格存储错误
				 * 将这几行代码替换即可
				 * 选择的规格存放在specSelected中
				 */
				this.specSelected = [];
				list.forEach(item => {
					if (item.selected === true) {
						this.specSelected.push(item);
					}
				})

			},
			aderror(e) {
				console.log("aderror: " + JSON.stringify(e.detail));
			},
			selectedChange(e) {
				let date = new Date(e.fullDate);
				var today = new Date();
				date.setHours(today.getHours());
				this.getList(date);
			},
			stopPrevent() {},
			onShareAppMessage() {return { title: '什么还在996？赶紧来摸鱼吧！', imageUrl:'../../../static/logo_small.jpg', path:'/pages/index/index'}},
			onShareTimeline() {return { title: '什么还在996？赶紧来摸鱼吧！', imageUrl:'../../../static/logo_small.jpg'}},
		},
	};
</script>

<style lang="scss">
	page {
		background-color: $page-color-base;
		// height: auto;
	}

	.uni-media-list-logo {
		width: 180rpx;
		height: 140rpx;
	}

	.uni-media-list-body {
		height: auto;
		justify-content: space-around;

		.price-box {
			display: flex;
			align-items: left;
			justify-content: space-between;
			font-size: 24upx;
			color: $font-color-light;

			.price {
				font-size: $font-lg;
				color: $uni-color-primary;
				line-height: 1;

				&:before {
					content: '￥';
					font-size: 26upx;
				}
			}
			
			.other {
				position: relative;
				left: 20upx;
			}
		}
	}

	.uni-media-list-text-top {
		height: 74rpx;
		font-size: 28rpx;
		overflow: hidden;
	}

	.uni-media-list-text-bottom {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
	}

	.uni-media-list-text-right {
		display: flex;
		flex-direction: column;
		flex: 1;
		overflow: hidden;
		position: absolute;
		right: 16upx;
		bottom: 10upx;
	}

	/* 规格选择弹窗 */
	.attr-content{
		padding: 10upx 30upx;
		.a-t{
			display: flex;
			image{
				width: 170upx;
				height: 170upx;
				flex-shrink: 0;
				margin-top: -40upx;
				border-radius: 8upx;;
			}
			.right{
				display: flex;
				flex-direction: column;
				padding-left: 24upx;
				font-size: $font-sm + 2upx;
				color: $font-color-base;
				line-height: 42upx;
				.price{
					font-size: $font-lg;
					color: $uni-color-primary;
					margin-bottom: 10upx;
				}
				.selected-text{
					margin-right: 10upx;
				}
			}
		}
		.attr-list{
			display: flex;
			flex-direction: column;
			font-size: $font-base + 2upx;
			color: $font-color-base;
			padding-top: 30upx;
			padding-left: 10upx;
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
			.selected{
				background: #fbebee;
				color: $uni-color-primary;
			}
			.disabled {
				color: $font-color-light;
			}
		}
	}

/*  弹出层 */
	.popup {
		position: fixed;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		z-index: 99;
		
		&.show {
			display: block;
			.mask{
				animation: showPopup 0.2s linear both;
			}
			.layer {
				animation: showLayer 0.2s linear both;
			}
		}
		&.hide {
			.mask{
				animation: hidePopup 0.2s linear both;
			}
			.layer {
				animation: hideLayer 0.2s linear both;
			}
		}
		&.none {
			display: none;
		}
		.mask{
			position: fixed;
			top: 0;
			width: 100%;
			height: 100%;
			z-index: 1;
			background-color: rgba(0, 0, 0, 0.4);
		}
		.layer {
			position: fixed;
			z-index: 99;
			bottom: 0;
			width: 100%;
			min-height: 40vh;
			border-radius: 10upx 10upx 0 0;
			background-color: #fff;
			.btn{
				height: 66upx;
				line-height: 66upx;
				border-radius: 100upx;
				background: $uni-color-primary;
				font-size: $font-base + 2upx;
				color: #fff;
				margin: 30upx auto 20upx;
			}
		}
		@keyframes showPopup {
			0% {
				opacity: 0;
			}
			100% {
				opacity: 1;
			}
		}
		@keyframes hidePopup {
			0% {
				opacity: 1;
			}
			100% {
				opacity: 0;
			}
		}
		@keyframes showLayer {
			0% {
				transform: translateY(120%);
			}
			100% {
				transform: translateY(0%);
			}
		}
		@keyframes hideLayer {
			0% {
				transform: translateY(0);
			}
			100% {
				transform: translateY(120%);
			}
		}
	}
</style>
