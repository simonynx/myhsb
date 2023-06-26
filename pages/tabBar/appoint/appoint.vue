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
		<uni-section title="包厢列表" type="line"></uni-section>
		<template>
		<uni-list>
				<!-- to 属性携带参数跳转详情页面，当前只为参考 -->
				<uni-list-item :border="false" class="uni-list-item--waterfall" title="自定义商品列表" v-for="(item, index) in roomList" :key="index" clickable  @click="handleListItemClick(item)">
					<!-- 通过header插槽定义列表左侧图片 -->
					<template v-slot:header>
						<view class="uni-thumb shop-picture">
							<image :src="item.image1" mode="aspectFill"></image>
						</view>
					</template>
					<template v-slot:body>
						<view class="shop">
							<view>
								<view class="uni-title">
									<text class="uni-ellipsis-2">{{ item.name }}</text>
								</view>
								<view>
									<text class="uni-tag hot-tag">wifi</text>
									<text v-for="tag in item.tagsArr" :key="tag" class="uni-tag">{{ tag }}</text>
								</view>
							</view>
							<view>
								<view class="shop-price">
									<text>¥</text>
									<text class="shop-price-text">{{item.price_per_hour/100}}</text>
									<text>/小时</text>
								</view>	
								<view class="appoint-button">
									<!-- click.stop能够正确处理event.stopPrepagation，阻止冒泡，而在回调里使用event是不行的。 -->
									<button class="nintendo-btn" @click.stop="handleAppointButtonClick(item)">
									  <view class="text">预约</view>
									  <view class="circle"></view>
									</button>
								</view>
							</view>
						</view>
					</template>
					<!-- 通过body插槽定义商品布局 -->
						
				</uni-list-item>
			<!-- #ifdef APP-PLUS -->
<!-- 			<view class="ad-view" v-if="(index > 0 && (index+1) % 10 == 0)">
				<ad :adpid="adpid" @error="aderror"></ad>
			</view> -->
			<!-- #endif -->
		</uni-list>
		<uni-load-more :status="status" :icon-size="16" :content-text="contentText" />
		</template>
		<!-- 规格-模态层弹窗 -->
		<view 
			class="popup spec" 
			:class="specClass"
			@touchmove.stop.prevent="stopPrevent"
			@click="closePopup"
		>
			<!-- 遮罩层 -->
			<view class="mask"></view>
			<view class="layer" @click.stop="stopPrevent">
				<times ref="timesComponent" @change="getTime" @selected-date-change="handleTimesSelectDateChange" :isMultiple="true" :isQuantum="true" :timeInterval="1" :disableTimeSlot="disableTimeSlot" :beginTime="currentBeginTime" :endTime="currentEndTime" :selectedDate="currentSelectDate">
				</times>
			</view>
		</view>
	</view>
</template>

<script>
	import {
		mapState,
		mapActions
	} from 'vuex';
	import AUTH from '../../../utils/auth.js'
	import times from '@/components/pretty-times/pretty-times.vue'
	export default {
		components: {
			times
		},
		data() {
			return {
				specClass: 'none',
				specSelected: [],
				status: 'refresh',
				adpid: '',
				listData: [],
				currentSelectItem: null,
				contentText: {
					contentdown: '上拉加载更多',
					contentrefresh: '加载中',
					contentnomore: '没有更多'
				},
				currentSelectDate:"",
				currentFullDate:null,
				currentBeginTime:"",
				currentEndTime:"",
				disableTimeSlot:[]
			};
		},
		computed:{
			...mapState(['hasLogin', 'token', 'userInfo']),
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
			if(!this.hasLogin){
				this.loginAndRegister();
			}else{
				if(!this.userInfo){
					this.getUserInfo();
				}
				this.getList(this.currentFullDate ? this.currentFullDate : new Date());
			}
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
			...mapActions(['loginAndRegister', 'getUserInfo']),
			getList(dayDate) {
				var _this = this;
				var today = new Date();
				var currentHour = today.getDay() == dayDate.getDay()? dayDate.getHours():-1;
				var date = dayDate.getFullYear()+'-'+(dayDate.getMonth()+1).toString().padStart(2, "0")+'-'+(dayDate.getDate()).toString().padStart(2, "0");
				this.currentSelectDate = date;
				this.currentFullDate = dayDate;
				AUTH.getRoomDataList(this.token, date).then(res=>{
					if(!res) return;
					var newList = [];
					res.data.rooms.forEach(item=>{
						var _item = item;
						_item.appoints = [];
						var start = item.opening_hours_start;
						var end = item.opening_hours_end;
						if(item.tags){
							var tagsArr = item.tags.split('$');
							item.tagsArr = tagsArr;
						}else{
							item.tagsArr = [];
						}
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
					_this.$forceUpdate();
				});
			},
			findAppoint(appointments, id, hour){
				for (var i = 0; i < appointments.length; i++) {
					if (appointments[i].room == id){
						for (var j = 0; j < appointments[i].time_list.length; j++) {
							let interval = appointments[i].time_list[j];
							if(interval[0] == hour){ //1 for success
								return true;
							}
						}
					}
				}
				return false;
			},
			goDetail: function(item) {
				uni.navigateTo({
					url: `/pages/product/product?data=${JSON.stringify(item)}&date=${this.currentSelectDate}`
				})
			},
			
			handleListItemClick:function(item){
				this.goDetail(item);
			},
			
			handleAppointButtonClick:function(item){
				var outsideDateDiff = false;
				this.currentSelectItem = item;
				if(this.currentSelectDate != this.$refs.timesComponent.selectDate){
					this.$refs.timesComponent.selectedDate = this.currentSelectDate;
					outsideDateDiff = true;
				}
				this.currentBeginTime = `${item.opening_hours_start}:00:00`;
				this.currentEndTime = `${item.opening_hours_end}:00:00`;
				this.disableTimeSlot =[];
				if(outsideDateDiff){
					const showDate = this.$refs.timesComponent.selectDate;
					this.handleTimesSelectDateChange(showDate);
				}else{
					for (var i = 0; i < item.appoints.length; i++) {
						if(item.appoints[i].status == 3){ //has appointment
							var dateArr = [];
							dateArr.push(`${this.currentSelectDate} ${item.appoints[i].start}:00:00`);
							dateArr.push(`${this.currentSelectDate} ${item.appoints[i].end}:00:00`);
							this.disableTimeSlot.push(dateArr);
						}
					}
				}
				this.goToAppoint(item);
			},
			handleTimesSelectDateChange:function(date){
				const _this = this;
				if(this.checkDateHasAdded(date)) return;
				AUTH.getRoomAppointments(this.token, this.currentSelectItem.object_id, date).then(res=>{
					if(!res) return;
					for (let propStr in res.data.time_list) {
						if(!res.data.time_list[propStr]){ //status is false,means n/a
							var dateArr = [];
							let prop = JSON.parse(propStr);
							dateArr.push(`${date} ${prop[0]}:00:00`);
							dateArr.push(`${date} ${prop[1]}:00:00`);
							_this.disableTimeSlot.push(dateArr);
						}
					}
				})
			},
			checkDateHasAdded:function(date){
				if(!this.disableTimeSlot || this.disableTimeSlot.length == 0) return false;
				for (let time of this.disableTimeSlot) {
					const [begin_time = "", end_time = ""] = time
					let [dateItem, timeItem] = begin_time.split(' ');
					if(dateItem == date) return true;
				}
				return false;
			},
			goToAppoint: function(e) {
				if (this.specClass === 'show') {
					this.specClass = 'hide';
					setTimeout(() => {
						this.specClass = 'none';
					}, 250);
				} else if (this.specClass === 'none') {
					this.currentSelectItem = e;
					this.specClass = 'show';
				}
			},
			closePopup: function(e) {
				if (this.specClass === 'show') {
					this.specClass = 'hide';
					setTimeout(() => {
						this.specClass = 'none';
					}, 250);
					this.specSelected = [];
				}
			},
			
			getTime:function(times){
				this.goToAppoint();
				this.specSelected = times;
				this.currentSelectItem.selects = this.specSelected;
				if(this.specSelected.length <= 0) return;
				uni.navigateTo({
					url: `/pages/order/createOrder?data=${JSON.stringify(this.currentSelectItem)}`
				})
			},
			aderror(e) {
				console.log("aderror: " + JSON.stringify(e.detail));
			},
			selectedChange(e) {
				let date = e.time;
				var today = new Date();
				date.setHours(today.getHours());
				this.getList(date);
			},
			stopPrevent() {},
			onShareAppMessage() {return { title: '什么还在996？赶紧来摸鱼吧！', imageUrl:'../../../static/logo_small.jpg', path:'/pages/index/index'}},
			onShareTimeline() {return { title: '什么还在996？赶紧来摸鱼吧！', imageUrl:'../../../static/logo_small.jpg'}},
			onAddToFavorites() {return { title: '偷偷马住别被老板看到！', imageUrl:'../../../static/logo_small.jpg'}},
		},
	};
</script>

<style lang="scss">
	@import '../../../common/uni-ui.scss';
	page {
		background-color: $page-color-base;
		// height: auto;
		flex-direction: column;
		box-sizing: border-box;
		background-color: #efeff4;
		min-height: 100%;
		height: auto;
	}
	
	.tips {
		color: #67c23a;
		font-size: 14px;
		line-height: 40px;
		text-align: center;
		background-color: #f0f9eb;
		height: 0;
		opacity: 0;
		transform: translateY(-100%);
		transition: all 0.3s;
	}
	
	.tips-ani {
		transform: translateY(0);
		height: 40px;
		opacity: 1;
	}
	
	.shop {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
	}
	
	.shop-picture {
		width: 120px;
		height: 150px;
	}
	
	.shop-picture-column {
		width: 100%;
		height: 170px;
		margin-bottom: 10px;
	}
	
	.shop-price {
		margin-top: 5px;
		font-size: 12px;
		color: #ff5a5f;
	}
	
	.shop-price-text {
		font-size: 16px;
	}
	
	.hot-tag {
		background: #ff5a5f;
		border: none;
		color: #fff;
	}
	
	.button-box {
		height: 30px;
		line-height: 30px;
		font-size: 12px;
		background: #007AFF;
		color: #fff;
	}
	
	.uni-link {
		flex-shrink: 0;
	}
	
	.ellipsis {
		display: flex;
		overflow: hidden;
	}
	
	.uni-ellipsis-1 {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	
	.uni-ellipsis-2 {
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
	}
	
	.uni-list--waterfall {
		 .uni-list {
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			padding: 5px;
			box-sizing: border-box;

			.uni-list-item--waterfall {
				width: 50%;
				box-sizing: border-box;
	
				.uni-list-item__container {
					padding: 5px;
					flex-direction: column;
				}
			}
		}
	}
	
	.appoint-button {
		// margin-left: 90px;
		
		.nintendo-btn {
		  position: relative;
		  display: inline-block;
		  padding: 12px 40px;
		  font-size: 20px;
		  font-weight: bold;
		  color: #fff;
		  background-color: #ff681b;
		  border: none;
		  border-radius: 4px;
		  width: 120px; /* 新增加的 width 属性 */
		  box-shadow: 0 0 8px rgba(0, 0, 0, 0.3);
		}
		
		.nintendo-btn .text {
		  position: absolute;
		  top: 50%;
		  transform: translate(-50%, -50%);
		  left: 50%;
		  z-index: 2;
		  color: #fff;
		}
		
		.nintendo-btn .circle {
		  content: '';
		  position: absolute;
		  top: 8px;
		  left: -20px;
		  width: 60px;
		  height: 60px;
		  border-radius: 50%;
		  background-color: #ff681b;
		  transform: rotate(45deg);
		  z-index: 1;
		  box-shadow: 0 0 8px rgba(0, 0, 0, 0.3);
		}
		
		.nintendo-btn:hover {
		  background-color: #ff4f00;
		}
		
		.nintendo-btn:hover .circle {
		  background-color: #ffd84e;
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
			height: 88%;
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
