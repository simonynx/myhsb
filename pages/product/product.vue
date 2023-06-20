<template>
	<view class="container">
		<view class="carousel">
			<swiper indicator-dots circular=true duration="400" interval="3000" autoplay>
				<swiper-item class="swiper-item" v-for="(item,index) in imgList" :key="index">
					<view class="image-wrapper">
						<image
							:src="item.src" 
							class="loaded" 
							mode="aspectFill"
						></image>
					</view>
				</swiper-item>
			</swiper>
		</view>
		<!--  分享 -->
		<view class="share-section" @click="share">
			<view class="share-icon">
				<text class="yticon icon-xingxing"></text>
			</view>
			<text class="tit">赶紧去抓小伙伴来摸鱼吧～</text>
			<text class="yticon icon-bangzhu1"></text>
			<view class="share-btn">
				立即分享
				<text class="yticon icon-you"></text>
			</view>
			
		</view>
		<view class="introduce-section">
			<text class="title">{{currentSelectItem.name}}</text>
			<view class="price-box">
				<text class="price-tip">¥</text>
				<text class="price">{{currentSelectItem.price_per_hour / 100}}/小时</text>
			</view>
		</view>

		<view class="detail-desc">
			<rich-text :nodes="desc"></rich-text>
		</view>
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
				<times @change="getTime" @selected-date-change="handleTimesSelectDateChange" :isMultiple="true" :isQuantum="true" :timeInterval="1" :disableTimeSlot="disableTimeSlot" :beginTime="currentBeginTime" :endTime="currentEndTime" :selectedDate="currentSelectDate">
				</times>
			</view>
		</view>

		<!-- 底部 -->
		<view class="footer">
			<navigator url="/pages/index/index" open-type="switchTab" class="main-page">
				<text class="yticon icon-xiatubiao--copy"></text>
				<text>首页</text>
			</navigator>
			<button class="chat-button" open-type="contact" bindcontact="handleContact">咨询</button>
			<text class="submit" @click="goToAppoint">立即预约</text>
		</view>
		
		<!-- 分享 -->
		<share 
			ref="share" 
			:contentHeight="580"
			:shareList="shareList"
		></share>
	</view>
</template>

<script>
	import {
		mapState,
	} from 'vuex';
	import Json from './../../Json'
	import AUTH from '../../utils/auth.js';
	import share from '@/components/share';
	import times from '@/components/pretty-times/pretty-times.vue'
	export default{
		components: {
			share,
			times
		},
		computed:{
			...mapState(['token']),
		},
		data() {
			return {
				specClass: 'none',
				favorite: true,
				shareList: [],
				imgList: [],
				desc: `
					<div style="width:100%;margin-left:20px;">
						<p>desc</p>
					</div>
				`,
				currentSelectItem: null,
				currentSelectDate: "",
				currentBeginTime:"",
				currentEndTime:"",
				disableTimeSlot:[]
			};
		},
		onLoad(option){
			this.currentSelectItem = JSON.parse(option.data);
			this.currentSelectDate = option.date;
			this.imgList.push({ src:this.currentSelectItem.image1 });
			if(this.currentSelectItem.image2){
				this.imgList.push({ src:this.currentSelectItem.image2 });
			}
			if(this.currentSelectItem.image3){
				this.imgList.push({ src:this.currentSelectItem.image3 });
			}
			if(this.currentSelectItem.image4){
				this.imgList.push({ src:this.currentSelectItem.image4 });
			}
			if(this.currentSelectItem.image5){
				this.imgList.push({ src:this.currentSelectItem.image5 });
			}
			this.shareList = Json.shareList;
			this.desc = this.desc.replace("desc", this.currentSelectItem.description);
			this.currentBeginTime = `${this.currentSelectItem.opening_hours_start}:00:00`;
			this.currentEndTime = `${this.currentSelectItem.opening_hours_end}:00:00`;
			this.disableTimeSlot =[];
			for (var i = 0; i < this.currentSelectItem.appoints.length; i++) {
				if(this.currentSelectItem.appoints[i].status == 3){ //has appointment
					var dateArr = [];
					dateArr.push(`${this.currentSelectDate} ${this.currentSelectItem.start}:00:00`);
					dateArr.push(`${this.currentSelectDate} ${this.currentSelectItem.end}:00:00`);
					this.disableTimeSlot.push(dateArr);
				}
			}
		},
		methods:{
			//分享
			share(){
				this.$refs.share.toggleMask();	
			},
			//收藏
			toFavorite(){
				this.favorite = !this.favorite;
			},
			goToAppoint(){
				if (this.specClass === 'show') {
					this.specClass = 'hide';
					setTimeout(() => {
						this.specClass = 'none';
					}, 250);

				} else if (this.specClass === 'none') {
					this.specClass = 'show';
				}
			},
			getTime(times){
				this.specSelected = times;
				this.currentSelectItem.selects = this.specSelected;
				if(this.specSelected.length <= 0) return;
				uni.navigateTo({
					url: `/pages/order/createOrder?data=${JSON.stringify(this.currentSelectItem)}`
				})
			},
			handleTimesSelectDateChange(date){
				const _this = this;
				AUTH.getRoomAppointments(this.token, this.currentSelectItem.object_id, date).then(res=>{
					if(!res) return;
					if(_this.checkDateHasAdded(date)) return;
					for (let prop in res.data.time_list) {
						if(!res.data.time_list[prop]){ //status is false,means n/a
							var dateArr = [];
							dateArr.push(`${date} ${prop[0]}:00:00`);
							dateArr.push(`${date} ${prop[1]}:00:00`);
							_this.disableTimeSlot.push(dateArr);
						}
					}
				})
			},
			handleContact(e){
				console.log(e.detail.path)
				console.log(e.detail.query)
				uni.showToast({
					title:'还没做好啊，骚瑞～',
				});
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
			closePopup: function(e) {
				if (this.specClass === 'show') {
					this.specClass = 'hide';
					setTimeout(() => {
						this.specClass = 'none';
					}, 250);
					this.specSelected = [];
				}
			},
			stopPrevent(){}
		},

	}
</script>

<style lang='scss'>
	@import '../../common/uni-ui.scss';
	page{
		background: $page-color-base;
		padding-bottom: 160upx;
	}
	.icon-you{
		font-size: $font-base + 2upx;
		color: #888;
	}
	.carousel {
		height: 722upx;
		position:relative;
		swiper{
			height: 100%;
		}
		.image-wrapper{
			width: 100%;
			height: 100%;
		}
		.swiper-item {
			display: flex;
			justify-content: center;
			align-content: center;
			height: 750upx;
			overflow: hidden;
			image {
				width: 100%;
				height: 100%;
			}
		}
		
	}
	
	/* 标题简介 */
	.introduce-section{
		background: #fff;
		padding: 20upx 30upx;
		
		.title{
			font-size: 32upx;
			color: $font-color-dark;
			height: 50upx;
			line-height: 50upx;
		}
		.price-box{
			display:flex;
			align-items:baseline;
			height: 64upx;
			padding: 10upx 0;
			font-size: 26upx;
			color:$uni-color-primary;
		}
		.price{
			font-size: $font-lg + 2upx;
		}
		.m-price{
			margin:0 12upx;
			color: $font-color-light;
			text-decoration: line-through;
		}
		.coupon-tip{
			align-items: center;
			padding: 4upx 10upx;
			background: $uni-color-primary;
			font-size: $font-sm;
			color: #fff;
			border-radius: 6upx;
			line-height: 1;
			transform: translateY(-4upx); 
		}
		.bot-row{
			display:flex;
			align-items:center;
			height: 50upx;
			font-size: $font-sm;
			color: $font-color-light;
			text{
				flex: 1;
			}
		}
	}
	/* 分享 */
	.share-section{
		display:flex;
		align-items:center;
		color: $font-color-base;
		background: linear-gradient(left, #fdf5f6, #fbebf6);
		padding: 12upx 30upx;
		.share-icon{
			display:flex;
			align-items:center;
			width: 70upx;
			height: 30upx;
			line-height: 1;
			border: 1px solid $uni-color-primary;
			border-radius: 4upx;
			position:relative;
			overflow: hidden;
			font-size: 22upx;
			color: $uni-color-primary;
			&:after{
				content: '';
				width: 50upx;
				height: 50upx;
				border-radius: 50%;
				left: -20upx;
				top: -12upx;
				position:absolute;
				background: $uni-color-primary;
			}
		}
		.icon-xingxing{
			position:relative;
			z-index: 1;
			font-size: 24upx;
			margin-left: 2upx;
			margin-right: 10upx;
			color: #fff;
			line-height: 1;
		}
		.tit{
			font-size: $font-base;
			margin-left:10upx;
		}
		.icon-bangzhu1{
			padding: 10upx;
			font-size: 30upx;
			line-height: 1;
		}
		.share-btn{
			flex: 1;
			text-align:right;
			font-size: $font-sm;
			color: $uni-color-primary;
		}
		.icon-you{
			font-size: $font-sm;
			margin-left: 4upx;
			color: $uni-color-primary;
		}
	}
	
	.c-list{
		font-size: $font-sm + 2upx;
		color: $font-color-base;
		background: #fff;
		.c-row{
			display:flex;
			align-items:center;
			padding: 20upx 30upx;
			position:relative;
		}
		.tit{
			width: 140upx;
		}
		.con{
			flex: 1;
			color: $font-color-dark;
			.selected-text{
				margin-right: 10upx;
			}
		}
		.bz-list{
			height: 40upx;
			font-size: $font-sm+2upx;
			color: $font-color-dark;
			text{
				display: inline-block;
				margin-right: 30upx;
			}
		}
		.con-list{
			flex: 1;
			display:flex;
			flex-direction: column;
			color: $font-color-dark;
			line-height: 40upx;
		}
		.red{
			color: $uni-color-primary;
		}
	}
	
	/*  详情 */
	.detail-desc{
		background: #fff;
		margin-top: 16upx;
		padding-bottom: 100upx;
		
		.image-wrapper{
			width: 100%;
			height: 100%;
		}
	}
	
	.time-picker-content {
		/* z-index: 99; */
		/* bottom: -10; */
		width: 100%;
		/* height: 100%; */
		/* min-height: 40vh; */
		border-radius: 10upx 10upx 50upx 50upx;
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
			height: 80%;
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
	
	.loaded {
		height: 320upx;
		width: 100%;
	}
	
	.footer{
		position: fixed;
		left: 0;
		bottom: 0;
		z-index: 95;
		display: flex;
		align-items: center;
		width: 100%;
		height: 90upx;
		justify-content: space-between;
		font-size: 30upx;
		background-color: #fff;
		color: $font-color-base;
		box-shadow: 0 -1px 5px rgba(0,0,0,.1);
		.main-page{
			padding-left: 50upx;
		}
		.chat-button {
		  display:flex;
		  align-items:center;
		  justify-content: center;
		  font-size: 14px;
		  color: #fff;
		  background-color: #f8591f;
		  border-radius: 20px;
		  cursor: pointer;
		  outline: none;
		  border: none;
		}
		
		.chat-button:hover {
		  background-color: #dc4404;
		}
		.submit{
			display:flex;
			align-items:center;
			justify-content: center;
			width: 280upx;
			height: 100%;
			color: #fff;
			font-size: 32upx;
			background-color: $base-color;
		}
	}
	
	/* 底部操作菜单 */
	.page-bottom{
		position:fixed;
		left: 160upx;
		bottom:30upx;
		z-index: 95;
		display: flex;
		justify-content: center;
		align-items: center;
		width: 400upx;
		height: 100upx;
		background: rgba(255,255,255,.9);
		box-shadow: 0 0 20upx 0 rgba(0,0,0,.5);
		border-radius: 16upx;
		
		.p-b-btn{
			display:flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			font-size: $font-sm;
			color: $font-color-base;
			width: 96upx;
			height: 80upx;
			.yticon{
				font-size: 40upx;
				line-height: 48upx;
				color: $font-color-light;
			}
			&.active, &.active .yticon{
				color: $uni-color-primary;
			}
			.icon-fenxiang2{
				font-size: 42upx;
				transform: translateY(-2upx);
			}
			.icon-shoucang{
				font-size: 46upx;
			}
		}
		.action-btn-group{
			display: flex;
			height: 76upx;
			border-radius: 100px;
			overflow: hidden;
			box-shadow: 0 20upx 40upx -16upx #fa436a;
			box-shadow: 1px 2px 5px rgba(219, 63, 96, 0.4);
			background: linear-gradient(to right, #ffac30,#fa436a,#F56C6C);
			margin-left: 20upx;
			position:relative;
			&:after{
				content: '';
				position:absolute;
				top: 50%;
				right: 50%;
				transform: translateY(-50%);
				height: 28upx;
				width: 0;
				border-right: 1px solid rgba(255,255,255,.5);
			}
			.action-btn{
				display:flex;
				align-items: center;
				justify-content: center;
				width: 180upx;
				height: 100%;
				font-size: $font-base ;
				padding: 0;
				border-radius: 0;
				background: transparent;
			}
		}
	}
	
</style>
