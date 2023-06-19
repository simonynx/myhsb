<template>
	<view class="container">
		<!-- 头部轮播 -->
		<uni-notice-bar show-icon scrollable text="开业大酬宾啦,快点到店来体验!小程序自己写的啊,有问题多多包涵～"/>
		<view class="carousel-section">
			<!-- 标题栏和状态栏占位符 -->
			<!-- <view class="titleNview-placing"></view> -->
			<!-- 背景色区域 -->
			<view class="titleNview-background" :style="{backgroundColor:titleNViewBackground}"></view>
			<swiper class="carousel" circular @change="swiperChange">
				<swiper-item v-for="(item, index) in carouselList" :key="index" class="carousel-item">
					<image :src="item.src" />
				</swiper-item>
			</swiper>
			<!-- 自定义swiper指示器 -->
			<view class="swiper-dots">
				<text class="num">{{swiperCurrent+1}}</text>
				<text class="sign">/</text>
				<text class="num">{{swiperLength}}</text>
			</view>

		</view>
		<view>
					
			<view class="shop-container">
			  <view class="shop-info-container" @tap="openLocation">
			    <view class="shop-info">
			      <text class="shop-name">摸鱼划水吧</text>
			      <view class="shop-address">
			       <uni-icons type='location-filled' color="" size="18" class="address-icon"></uni-icons>
			        <text class="address-text">{{addressData.address+ addressData.area}}</text>
			      </view>
			      <view class="shop-intro">
			        <text class="intro-text">
			           欢迎来到摸鱼划水吧，我们是一家ACG文化的综合体验馆，提供主机游戏游玩、漫画小说阅读及咖啡甜品等服务。在这里我们可以一起玩游戏，聊漫画，品味美食，享受属于你自己的空间。什么？你还在996？赶紧快来摸鱼加入我们吧！
			        </text>
			      </view>
			      <view class="shop-service">
					<view class="show-items">
						<view class="item" v-for="(item, index) in showItems" :key="index">
						  <FontAwesomeIcon :type="item.icon" size="60" :color="item.color" />
						  <text class="label">{{ item.label }}</text>
						</view>
					</view>
			      </view>
			    </view>
			  </view>
			</view>
			
			<!-- 这里放置 WiFi 显示区域 -->			
			 <view class="wifi-info-container">
			    <view class="wifi-info-box">
			      <view class="wifi-info-item">
					<FontAwesomeIcon type="fas fa-wifi" class="wifi-info-icon"/>
			        <span class="wifi-info-text">摸鱼划水吧</span>
			      </view>
			      <view class="wifi-info-item">
					<FontAwesomeIcon type="fas fa-lock" class="wifi-info-icon"/>
			        <span class="wifi-info-text">myhsb1688</span>
			      </view>
			    </view>
			    <view class="phone-info-box">
			      <view class="phone-info-item">
					<FontAwesomeIcon type="fas fa-phone-alt" class="phone-info-icon"/>
			        <span class="phone-info-text">83596103</span>
			      </view>
			    </view>
			  </view>
			</view>
			
		<view>
			<template>
			  <view class="tips-container">
			    <view class="tips-title">温馨提示</view>
			    <view class="tips-box" v-for="(item,index) in tips" wx:key="index">
			      <view class="tip-text">{{item}}</view>
			    </view>
			  </view>
			</template>
		</view>
		
	</view>
</template>

<script>
	import {
		mapState,
		mapActions
	} from 'vuex';
	import Json from './../../Json'
	import FontAwesomeIcon from '@/components/Am-FontAwesome/index.vue'
	export default {
		components: {
			FontAwesomeIcon
		},
		computed: {
			...mapState(['hasLogin'])
		},
		data() {
			return {
				titleNViewBackground: '',
				swiperCurrent: 0,
				swiperLength: 0,
				carouselList: [],
				addressData: {
					name: '摸水划水吧',
					mobile: '83596103',
					addressName: '上海街道',
					address: '福建省福州市台江区交通路',
					area: '6号儒商楼08店面',
					default: false,
				},
				showItems: [
					{ icon: 'fas fa-gamepad', label: '游戏', color:'#4285F4'},
					{ icon: 'fas fa-book-open', label: '漫画', color:'#DB4437'},
					{ icon: 'fas fa-palette', label: '美容', color:'#F4B400'},
					{ icon: 'fas fa-glass-martini', label: '休闲', color:'#0F9D58'}
				],
				tips: [
					'本店禁止从事黄赌毒行为。',
					'本店只收取房间大厅场地费用，不再收取额外费用。',
					'本店可提供包场服务，如还有其它商业合作需要请电话联系。',
					'本店入内都需要换拖鞋，或者穿戴鞋套。',
					'本店会不断更新游戏、漫画、小说、桌游、电影等。',
				  ],
			};
		},
		onShow() {
			if(!this.hasLogin){
				this.loginAndRegister();
			}
		},
		onLoad() {
			this.loadData();
		},
		methods: {
			...mapActions(['loginAndRegister']),
			
			openLocation(e){
				uni.openLocation({
					latitude:26.068525,
					longitude:119.303882,
					scale:5,
					name:this.addressData.name,
					address:this.addressData.address + this.addressData.area
				});
			},
			/**
			 * 请求静态数据只是为了代码不那么乱
			 * 分次请求未作整合
			 */
			async loadData() {
				let carouselList = Json.carouselList;
				this.titleNViewBackground = carouselList[0].background;
				this.swiperLength = carouselList.length;
				this.carouselList = carouselList;
			},
			//轮播图切换修改背景色
			swiperChange(e) {
				const index = e.detail.current;
				this.swiperCurrent = index;
				this.titleNViewBackground = this.carouselList[index].background;
			},
			//详情页
			navToDetailPage(item) {
				//测试数据没有写id，用title代替
				let id = item.title;
				uni.navigateTo({
					url: `/pages/product/product?id=${id}`
				})
			},
			onShareAppMessage() {return { title: '什么还在996？赶紧来摸鱼吧！', imageUrl:'../../static/logo_small.jpg', path:'/pages/index/index'}},
			onShareTimeline() {return { title: '什么还在996？赶紧来摸鱼吧！', imageUrl:'../../static/logo_small.jpg'}},
			onAddToFavorites() {return { title: '偷偷马住别被老板看到！', imageUrl:'../../static/logo_small.jpg'}},
		},
	}
</script>

<style lang="scss">

	page {
		background: #f5f5f5;
	}
	.m-t{
		margin-top: 16upx;
	}
	/* 头部 轮播图 */
	.carousel-section {
		position: relative;
		padding-top: 10px;

		.titleNview-placing {
			height: var(--status-bar-height);
			padding-top: 44px;
			box-sizing: content-box;
		}

		.titleNview-background {
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			height: 426upx;
			transition: .4s;
		}
	}
	.carousel {
		width: 100%;
		height: 500upx;

		.carousel-item {
			width: 100%;
			height: 100%;
			padding: 0 28upx;
			overflow: hidden;
		}

		image {
			width: 100%;
			height: 100%;
			border-radius: 10upx;
		}
	}
	.swiper-dots {
		display: flex;
		position: absolute;
		left: 60upx;
		bottom: 15upx;
		width: 72upx;
		height: 36upx;
		background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAABkCAYAAADDhn8LAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTMyIDc5LjE1OTI4NCwgMjAxNi8wNC8xOS0xMzoxMzo0MCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6OTk4MzlBNjE0NjU1MTFFOUExNjRFQ0I3RTQ0NEExQjMiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6OTk4MzlBNjA0NjU1MTFFOUExNjRFQ0I3RTQ0NEExQjMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTcgKFdpbmRvd3MpIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6Q0E3RUNERkE0NjExMTFFOTg5NzI4MTM2Rjg0OUQwOEUiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6Q0E3RUNERkI0NjExMTFFOTg5NzI4MTM2Rjg0OUQwOEUiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz4Gh5BPAAACTUlEQVR42uzcQW7jQAwFUdN306l1uWwNww5kqdsmm6/2MwtVCp8CosQtP9vg/2+/gY+DRAMBgqnjIp2PaCxCLLldpPARRIiFj1yBbMV+cHZh9PURRLQNhY8kgWyL/WDtwujjI8hoE8rKLqb5CDJaRMJHokC6yKgSCR9JAukmokIknCQJpLOIrJFwMsBJELFcKHwM9BFkLBMKFxNcBCHlQ+FhoocgpVwwnv0Xn30QBJGMC0QcaBVJiAMiec/dcwKuL4j1QMsVCXFAJE4s4NQA3K/8Y6DzO4g40P7UcmIBJxbEesCKWBDg8wWxHrAiFgT4fEGsB/CwIhYE+AeBAAdPLOcV8HRmWRDAiQVcO7GcV8CLM8uCAE4sQCDAlHcQ7x+ABQEEAggEEAggEEAggEAAgQACASAQQCCAQACBAAIBBAIIBBAIIBBAIABe4e9iAe/xd7EAJxYgEGDeO4j3EODp/cOCAE4sYMyJ5cwCHs4rCwI4sYBxJ5YzC84rCwKcXxArAuthQYDzC2JF0H49LAhwYUGsCFqvx5EF2T07dMaJBetx4cRyaqFtHJ8EIhK0i8OJBQxcECuCVutxJhCRoE0cZwMRyRcFefa/ffZBVPogePihhyCnbBhcfMFFEFM+DD4m+ghSlgmDkwlOgpAl4+BkkJMgZdk4+EgaSCcpVX7bmY9kgXQQU+1TgE0c+QJZUUz1b2T4SBbIKmJW+3iMj2SBVBWz+leVfCQLpIqYbp8b85EskIxyfIOfK5Sf+wiCRJEsllQ+oqEkQfBxmD8BBgA5hVjXyrBNUQAAAABJRU5ErkJggg==);
		background-size: 100% 100%;

		.num {
			width: 36upx;
			height: 36upx;
			border-radius: 50px;
			font-size: 24upx;
			color: #fff;
			text-align: center;
			line-height: 36upx;
		}

		.sign {
			position: absolute;
			top: 0;
			left: 50%;
			line-height: 36upx;
			font-size: 12upx;
			color: #fff;
			transform: translateX(-50%);
		}
	}
	
	.image-wrapper{
		width: 100%;
		height: 100%;
		padding: 10px;
	}
	.f-header{
		display:flex;
		align-items:center;
		height: 140upx;
		padding: 6upx 30upx 8upx;
		background: #fff;
		image{
			flex-shrink: 0;
			width: 80upx;
			height: 80upx;
			margin-right: 20upx;
		}
		.tit-box{
			flex: 1;
			display: flex;
			flex-direction: column;
		}
		.tit{
			font-size: $font-lg +2upx;
			color: #font-color-dark;
			line-height: 1.3;
		}
		.tit2{
			font-size: $font-sm;
			color: $font-color-light;
		}
		.icon-you{
			font-size: $font-lg +2upx;
			color: $font-color-light;
		}
	}
// 定义主题色
$primary-color: #8c00ff;

// 定义辅助色
$secondary-color: #ffd800;

// 定义文本颜色
$text-color: #333;

// 定义间距
$gap: 16rpx;

// 定义阴影
$box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.2);

.shop-container {
  padding:20rpx;
  background-color:#f7f7f7;

  .shop-info {
    background-color: #FFF;
    border: 2rpx solid $secondary-color;
    border-radius: 10rpx;
    box-shadow: $box-shadow;
    color: $text-color;
    padding: $gap;

    .shop-name {
      color: $secondary-color;
      font-size: 36rpx;
      font-weight: bold;
      margin-bottom: $gap;
      text-align: center;
    }

    .shop-address {
      align-items: center;
      color: $secondary-color;
      display: flex;
      font-size: 28rpx;
      justify-content: center;
      margin-bottom: $gap;
      text-align: center;

      .address-icon {
        margin-right: 10rpx;
      }
    }

    .shop-intro {
      margin-bottom: $gap;

      .intro-text {
        color: $text-color;
        font-size: 32rpx;
        text-align: justify;
		line-height: 1.6;
		text-shadow: 2rpx 2rpx rgba(0, 0, 0, 0.1);
      }
    }

    .shop-service {
      margin-bottom: $gap;

      .show-items {
        display: flex;
        justify-content: center;
        align-items: center;
        flex-wrap: wrap;

        .item {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          margin-right: 48rpx;
          margin-bottom: 32rpx;
		  border-radius: 50%;
		  box-shadow: 0 3px 3px rgba(189, 189, 189, 0.3);
		  width: 50px;
		  height: 50px;

          .label {
            color: #333;
            font-size: 26rpx;
            margin-top: 10rpx;
            text-align: center;
          }

          .icon {
            color: $secondary-color;
            font-size: 60rpx;
            margin-bottom: 10px;
          }
        }
      }
    }
  }
}
	
	.wifi-info-container {
	  display: flex;
	  flex-direction: row;
	  justify-content: center;
	  align-items: center;
	  padding: 20px;
	  background-color: #f6c400;
	  border-radius: 6px;
	  box-shadow: 0px 5px 10px rgba(0, 0, 0, 0.1);
	}
	
	.wifi-info-box {
	  display: flex;
	  flex-direction: column;
	  justify-content: flex-start;
	  align-items: flex-start;
	  margin-right: 20px;
	}
	
	.wifi-info-item,
	.phone-info-item {
	  display: flex;
	  flex-direction: row;
	  justify-content: flex-start;
	  align-items: center;
	  margin-bottom: 10px;
	}
	
	.wifi-info-icon,
	.phone-info-icon {
	  width: 24px;
	  height: 24px;
	  margin-right: 10px;
	}
	
	.wifi-info-text,
	.phone-info-text {
	  font-size: 14px;
	  font-weight: bold;
	  color: #fff;
	  text-shadow: 1px 1px rgba(0, 0, 0, 0.2);
	}
	
	.phone-info-item:last-of-type {
	  margin-bottom: 0;
	}
	
	@media (max-width: 767px) {
	  .wifi-info-container {
	    padding: 10px;
	  }
	
	  .wifi-info-box {
	    margin-right: 10px;
	  }
	
	  .wifi-info-text,
	  .phone-info-text {
	    font-size: 12px;
	  }
	}

	.tips-container {
	  display: flex;
	  flex-direction: column;
	  justify-content: center;
	  align-items: center;
	  padding: 20px;
	  background-color: #f3f3f3;
	  border-radius: 6px;
	  box-shadow: 0px 10px 30px rgba(0, 0, 0, 0.1);
	}
	
	.tips-title {
	  font-size: 16px;
	  font-weight: bold;
	  color: #333;
	  margin-bottom: 20px;
	  text-align: center;
	}
	
	.tips-box {
	  display: flex;
	  justify-content: flex-start;
	  align-items: center;
	  padding: 10px 20px;
	  border-left: 3px solid #ff9330;
	  background-color: #fff;
	  font-size: 14px;
	  color: #444;
	  margin-bottom: 15px;
	  width: 100%;
	}
	
	.tips-box:hover {
	  color: #ff9330;
	  border-left-color: #ff9330;
	}
	
	.tips-box:nth-child(2n) {
	  border-left-color: #2f9fcc;
	  color: #555;
	}
	
	.tips-box:nth-child(3n) {
	  border-left-color: #e53935;
	  color: #555;
	}
	
	.tips-box:nth-child(4n) {
	  border-left-color: #ad2e24;
	  color: #fff;
	  background-color: #ad2e24;
	}
	
	.tips-box:nth-child(5n) {
	  border-left-color: #ffa500;
	  color: #fff;
	  background-color: #ffa500;
	}
	
	.tip-text {
	  text-align: left;
	  line-height: 1.5;
	}
	
	@media (max-width: 767px) {
	  .tips-container {
	    padding: 10px;
	  }
	  .tips-title {
	    font-size: 14px;
	    margin-bottom: 15px;
	  }
	  .tips-box {
	    font-size: 12px;
	    padding: 10px;
	    margin-bottom: 10px;
	  }
	}

</style>
