<template>
    <view class="page">
        <!-- 顶部状态栏占位 -->
        <view class="status-bar-placeholder"></view>

        <!-- 导航栏 -->
        <view class="nav-bar">
            <text class="nav-back yticon icon-fanhui" @click="goBack"></text>
            <text class="nav-title">包厢详情</text>
            <view class="nav-share" @click="share">
                <text class="yticon icon-fenxiang2"></text>
            </view>
        </view>

        <!-- 图片轮播 -->
        <view class="carousel">
            <swiper
                indicator-dots
                circular
                duration="400"
                interval="3000"
                autoplay
                indicator-color="rgba(255,255,255,0.4)"
                indicator-active-color="#fff"
                class="main-swiper"
            >
                <swiper-item v-for="(img, idx) in imgList" :key="idx">
                    <image
                        :src="img.src"
                        class="carousel-img"
                        mode="aspectFill"
                    />
                </swiper-item>
            </swiper>

            <!-- 图片计数器 -->
            <view class="img-counter">
                <text>{{ currentImgIndex + 1 }}/{{ imgList.length }}</text>
            </view>

            <!-- 状态标签 -->
            <view class="status-badge" :class="statusClass">
                <text>{{ statusText }}</text>
            </view>
        </view>

        <!-- 基本信息卡片 -->
        <view class="info-card">
            <view class="info-top">
                <view class="info-left">
                    <text class="room-name">{{ room.name }}</text>
                    <view class="room-tags" v-if="room.tagsArr && room.tagsArr.length">
                        <text class="tag" v-for="t in room.tagsArr" :key="t">{{ t }}</text>
                    </view>
                </view>
            </view>

            <view class="price-row">
                <view class="price-main">
                    <text class="price-yuan">¥</text>
                    <text class="price-num">{{ room.price_per_hour / 100 }}</text>
                    <text class="price-unit">/小时</text>
                </view>
                <view class="capacity-info">
                    <text>👥 最多{{ room.max_people || 4 }}人</text>
                </view>
            </view>

            <!-- 时段概览 -->
            <view class="slots-overview">
                <text class="slots-label">时段状态</text>
                <view class="slots-row">
                    <view
                        v-for="(slot, si) in displaySlots"
                        :key="si"
                        class="slot-item"
                        :class="getSlotClass(slot.status)"
                    >
                        <text class="slot-time">{{ slot.start }}:{{ slot.end === slot.start + 1 ? '00' : slot.end }}</text>
                        <view class="slot-bar"></view>
                    </view>
                </view>
                <view class="slots-legend">
                    <view class="legend-item">
                        <view class="legend-dot available"></view>
                        <text>可约</text>
                    </view>
                    <view class="legend-item">
                        <view class="legend-dot booked"></view>
                        <text>已约</text>
                    </view>
                    <view class="legend-item">
                        <view class="legend-dot past"></view>
                        <text>已过</text>
                    </view>
                </view>
            </view>
        </view>

        <!-- 门店信息 -->
        <view class="store-card">
            <view class="store-info">
                <text class="store-icon">🏠</text>
                <view class="store-detail">
                    <text class="store-name">摸鱼划水吧</text>
                    <text class="store-addr">{{ storeAddress }}</text>
                </view>
            </view>
            <view class="store-actions">
                <view class="action-btn call-btn" @click="callPhone">
                    <text class="yticon icon-dianhua"></text>
                    <text>拨打电话</text>
                </view>
                <view class="action-btn nav-btn" @click="openMap">
                    <text class="yticon icon-ditu"></text>
                    <text>导航</text>
                </view>
            </view>
        </view>

        <!-- 包厢介绍 -->
        <view class="desc-card">
            <view class="card-title">
                <text>包厢介绍</text>
                <view class="title-line"></view>
            </view>
            <view class="desc-content">
                <rich-text :nodes="desc"></rich-text>
            </view>
        </view>

        <!-- 设施服务 -->
        <view class="facility-card" v-if="facilities.length">
            <view class="card-title">
                <text>设施服务</text>
                <view class="title-line"></view>
            </view>
            <view class="facility-grid">
                <view class="facility-item" v-for="f in facilities" :key="f.icon">
                    <text class="facility-icon">{{ f.icon }}</text>
                    <text class="facility-name">{{ f.name }}</text>
                </view>
            </view>
        </view>

        <!-- 占位底部 -->
        <view class="bottom-placeholder"></view>

        <!-- 底部操作栏 -->
        <view class="bottom-bar">
            <navigator url="/pages/index/index" open-type="switchTab" class="home-btn">
                <text class="yticon icon-shouye1"></text>
                <text>首页</text>
            </navigator>
            <view class="action-group">
                <button class="contact-btn" open-type="contact" bindcontact="handleContact">
                    <text class="yticon icon-liaotian"></text>
                    <text>咨询</text>
                </button>
                <view
                    class="book-btn"
                    :class="isFullyBooked ? 'disabled' : ''"
                    @click="goToAppoint"
                >
                    <text>立即预约</text>
                </view>
            </view>
        </view>

        <!-- 时间选择弹窗 -->
        <view class="time-popup" :class="specClass" @touchmove.stop.prevent="stopPrevent" @click="closePopup">
            <view class="mask"></view>
            <view class="panel" @click.stop="stopPrevent">
                <view class="panel-header">
                    <view class="panel-room-info">
                        <image class="panel-thumb" :src="room.image1" mode="aspectFill" />
                        <view class="panel-meta">
                            <text class="panel-name">{{ room.name }}</text>
                            <text class="panel-price">¥{{ room.price_per_hour / 100 }}/小时</text>
                        </view>
                    </view>
                    <text class="panel-close yticon icon-guanbi" @click="closePopup"></text>
                </view>
                <view class="panel-times">
                    <times
                        ref="timesComponent"
                        @change="getTime"
                        @selected-date-change="handleTimesSelectDateChange"
                        :isMultiple="true"
                        :isQuantum="true"
                        :timeInterval="1"
                        :disableTimeSlot="disableTimeSlot"
                        :beginTime="currentBeginTime"
                        :endTime="currentEndTime"
                        :selectedDate="currentSelectDate"
                    ></times>
                </view>
            </view>
        </view>

        <!-- 分享 -->
        <share ref="share" :contentHeight="580" :shareList="shareList"></share>
    </view>
</template>

<script>
import { mapState } from 'vuex';
import AUTH from '../../utils/auth.js';
import share from '@/components/share';
import times from '@/components/pretty-times/pretty-times.vue';

const storePhone = '13712345678'; // TODO: 从 config 接口获取
const storeLat = 22.5431; // TODO: 从 config 接口获取
const storeLng = 114.0579; // TODO: 从 config 接口获取

export default {
    components: { share, times },

    data() {
        return {
            specClass: 'none',
            imgList: [],
            desc: '',
            room: {},
            roomDate: '',
            currentSelectDate: '',
            currentBeginTime: '',
            currentEndTime: '',
            disableTimeSlot: [],
            specSelected: [],
            shareList: [
                { type: 0, title: '赶紧来摸鱼吧！', icon: '/static/logo_small.jpg' },
                { type: 1, title: '微信', icon: '/static/wechat.png' },
            ],
            facilities: [],
        };
    },

    computed: {
        ...mapState(['token']),
        currentImgIndex() { return 0; },
        displaySlots() {
            if (!this.room.appoints) return [];
            return this.room.appoints.slice(0, 12);
        },
        isFullyBooked() {
            if (!this.room.appoints || !this.room.appoints.length) return false;
            return this.room.appoints.every(s => s.status !== 1);
        },
        statusClass() {
            if (this.isFullyBooked) return 'full';
            const hasBooked = this.room.appoints && this.room.appoints.some(s => s.status === 3);
            return hasBooked ? 'partial' : 'available';
        },
        statusText() {
            if (this.isFullyBooked) return '已约满';
            const hasBooked = this.room.appoints && this.room.appoints.some(s => s.status === 3);
            return hasBooked ? '部分可约' : '可预约';
        },
        storeAddress() {
            return '深圳市南山区xxx路xx号摸鱼划水吧';
        },
    },

    onLoad(option) {
        this.room = JSON.parse(option.data);
        this.roomDate = option.date;
        this.currentSelectDate = option.date;
        this.buildImages();
        this.buildDesc();
        this.buildFacilities();
        this.initTimeConfig();
    },

    methods: {
        buildImages() {
            const r = this.room;
            if (r.image1) this.imgList.push({ src: r.image1 });
            if (r.image2) this.imgList.push({ src: r.image2 });
            if (r.image3) this.imgList.push({ src: r.image3 });
            if (r.image4) this.imgList.push({ src: r.image4 });
            if (r.image5) this.imgList.push({ src: r.image5 });
            if (this.imgList.length === 0) {
                this.imgList.push({ src: '/static/logo_small.jpg' });
            }
        },

        buildDesc() {
            const d = this.room.description || '暂无详细介绍';
            this.desc = '<div class="detail-desc-content">' + d + '</div>';
        },

        buildFacilities() {
            const tagMap = {
                'wifi': { icon: '📶', name: 'WiFi' },
                '空调': { icon: '❄️', name: '空调' },
                '麻将': { icon: '🀄', name: '麻将' },
                '桌游': { icon: '🎲', name: '桌游' },
                '投影': { icon: '🎬', name: '投影' },
                '音响': { icon: '🔊', name: '音响' },
                '电视': { icon: '📺', name: '电视' },
                '茶室': { icon: '🍵', name: '茶室' },
                'KTV': { icon: '🎤', name: 'KTV' },
                '棋牌': { icon: '♠️', name: '棋牌' },
            };
            const tags = this.room.tagsArr || [];
            this.facilities = tags
                .filter(t => tagMap[t])
                .map(t => tagMap[t]);
            // Always show WiFi if not in tags
            if (!this.facilities.find(f => f.name === 'WiFi')) {
                this.facilities.unshift({ icon: '📶', name: 'WiFi' });
            }
        },

        initTimeConfig() {
            this.currentBeginTime = this.room.opening_hours_start + ':00:00';
            this.currentEndTime = this.room.opening_hours_end + ':00:00';
            this.disableTimeSlot = [];

            if (this.room.appoints) {
                for (const slot of this.room.appoints) {
                    if (slot.status === 3) {
                        this.disableTimeSlot.push([
                            this.currentSelectDate + ' ' + slot.start + ':00:00',
                            this.currentSelectDate + ' ' + slot.end + ':00:00',
                        ]);
                    }
                }
            }
        },

        getSlotClass(status) {
            if (status === 1) return 'available';
            if (status === 2) return 'past';
            return 'booked';
        },

        goToAppoint() {
            if (this.isFullyBooked) return;
            if (this.specClass === 'show') {
                this.specClass = 'hide';
                setTimeout(() => { this.specClass = 'none'; }, 250);
            } else {
                this.specClass = 'show';
            }
        },

        closePopup() {
            if (this.specClass === 'show') {
                this.specClass = 'hide';
                setTimeout(() => { this.specClass = 'none'; }, 250);
                this.specSelected = [];
            }
        },

        getTime(times) {
            this.specSelected = times;
            this.room.selects = this.specSelected;
            if (this.specSelected.length <= 0) return;
            uni.navigateTo({
                url: `/pages/order/createOrder?data=${encodeURIComponent(JSON.stringify(this.room))}`
            });
        },

        handleTimesSelectDateChange(date) {
            AUTH.getRoomAppointments(this.token, this.room.object_id, date).then(res => {
                if (!res) return;
                for (const propStr in res.data.time_list) {
                    if (!res.data.time_list[propStr]) {
                        const prop = JSON.parse(propStr);
                        this.disableTimeSlot.push([
                            date + ' ' + prop[0] + ':00:00',
                            date + ' ' + prop[1] + ':00:00',
                        ]);
                    }
                }
            });
        },

        share() {
            this.$refs.share.toggleMask();
        },

        handleContact() {
            uni.showToast({ title: '客服功能开发中', icon: 'none' });
        },

        callPhone() {
            uni.makePhoneCall({ phoneNumber: storePhone });
        },

        openMap() {
            uni.openLocation({
                latitude: storeLat,
                longitude: storeLng,
                name: '摸鱼划水吧',
                address: this.storeAddress,
            });
        },

        goBack() {
            uni.navigateBack();
        },

        stopPrevent() {},
    },
};
</script>

<style lang="scss">
$primary: #FF6432;
$gold: #FFB933;
$green: #34C759;
$red: #FF3B30;
$dark: #333;
$gray: #999;
$light-gray: #F0F0F0;
$bg: #F5F6F7;

page {
    background: $bg;
    padding-bottom: 120rpx;
}

.status-bar-placeholder {
    height: 88rpx;
}

.nav-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 88rpx;
    background: transparent;

    .nav-back {
        position: absolute;
        left: 30rpx;
        font-size: 36rpx;
        color: #fff;
        text-shadow: 0 2rpx 8rpx rgba(0,0,0,0.3);
    }

    .nav-title {
        font-size: 32rpx;
        font-weight: bold;
        color: #fff;
        text-shadow: 0 2rpx 8rpx rgba(0,0,0,0.3);
    }

    .nav-share {
        position: absolute;
        right: 30rpx;
        font-size: 40rpx;
        color: #fff;
        text-shadow: 0 2rpx 8rpx rgba(0,0,0,0.3);
    }
}

// 轮播
.carousel {
    position: relative;
    height: 560rpx;

    .main-swiper {
        height: 100%;
    }

    .carousel-img {
        width: 100%;
        height: 100%;
    }

    .img-counter {
        position: absolute;
        bottom: 24rpx;
        right: 24rpx;
        background: rgba(0,0,0,0.4);
        color: #fff;
        font-size: 24rpx;
        padding: 6rpx 16rpx;
        border-radius: 20rpx;
    }

    .status-badge {
        position: absolute;
        bottom: 24rpx;
        left: 24rpx;
        padding: 8rpx 20rpx;
        border-radius: 24rpx;
        font-size: 24rpx;
        font-weight: bold;
        color: #fff;

        &.available { background: rgba($green, 0.9); }
        &.partial { background: rgba($gold, 0.9); }
        &.full { background: rgba($red, 0.9); }
    }
}

// 信息卡片
.info-card {
    background: #fff;
    margin: -40rpx 20rpx 20rpx;
    border-radius: 24rpx;
    padding: 30rpx;
    box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.08);
    position: relative;

    .info-top {
        margin-bottom: 20rpx;
    }

    .room-name {
        font-size: 36rpx;
        font-weight: bold;
        color: $dark;
        line-height: 1.3;
        display: block;
        margin-bottom: 12rpx;
    }

    .room-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 10rpx;

        .tag {
            font-size: 22rpx;
            color: $primary;
            background: #FFF0EB;
            padding: 4rpx 14rpx;
            border-radius: 10rpx;
        }
    }

    .price-row {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        padding: 16rpx 0;
        border-top: 1rpx solid $light-gray;
        border-bottom: 1rpx solid $light-gray;
        margin-bottom: 20rpx;

        .price-main {
            display: flex;
            align-items: baseline;

            .price-yuan {
                font-size: 28rpx;
                color: $primary;
                font-weight: bold;
            }

            .price-num {
                font-size: 56rpx;
                font-weight: bold;
                color: $primary;
                line-height: 1;
            }

            .price-unit {
                font-size: 26rpx;
                color: $gray;
                margin-left: 4rpx;
            }
        }

        .capacity-info {
            font-size: 26rpx;
            color: $gray;
        }
    }

    // 时段状态
    .slots-overview {
        .slots-label {
            font-size: 26rpx;
            color: $gray;
            display: block;
            margin-bottom: 14rpx;
        }

        .slots-row {
            display: flex;
            flex-wrap: wrap;
            gap: 10rpx;
            margin-bottom: 14rpx;
        }

        .slot-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            min-width: 56rpx;

            .slot-time {
                font-size: 18rpx;
                color: $gray;
                margin-bottom: 4rpx;
            }

            .slot-bar {
                width: 40rpx;
                height: 8rpx;
                border-radius: 4rpx;
            }

            &.available .slot-bar { background: $green; }
            &.past .slot-bar { background: #DDD; }
            &.booked .slot-bar { background: $red; }
        }

        .slots-legend {
            display: flex;
            gap: 20rpx;

            .legend-item {
                display: flex;
                align-items: center;
                gap: 6rpx;
                font-size: 22rpx;
                color: $gray;

                .legend-dot {
                    width: 12rpx;
                    height: 12rpx;
                    border-radius: 50%;
                    &.available { background: $green; }
                    &.booked { background: $red; }
                    &.past { background: #DDD; }
                }
            }
        }
    }
}

// 门店信息
.store-card {
    background: #fff;
    margin: 0 20rpx 20rpx;
    border-radius: 20rpx;
    padding: 24rpx 24rpx 20rpx;
    display: flex;
    align-items: center;
    justify-content: space-between;

    .store-info {
        display: flex;
        align-items: center;
        flex: 1;

        .store-icon {
            font-size: 48rpx;
            margin-right: 16rpx;
        }

        .store-detail {
            .store-name {
                font-size: 28rpx;
                font-weight: bold;
                color: $dark;
                display: block;
                margin-bottom: 4rpx;
            }

            .store-addr {
                font-size: 24rpx;
                color: $gray;
            }
        }
    }

    .store-actions {
        display: flex;
        gap: 12rpx;

        .action-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 12rpx 20rpx;
            border-radius: 16rpx;
            font-size: 20rpx;
            gap: 4rpx;

            .yticon {
                font-size: 36rpx;
            }
        }

        .call-btn {
            background: #FFF0EB;
            color: $primary;
        }

        .nav-btn {
            background: #F0F9F0;
            color: $green;
        }
    }
}

// 介绍/设施卡片
.desc-card, .facility-card {
    background: #fff;
    margin: 0 20rpx 20rpx;
    border-radius: 20rpx;
    padding: 24rpx 24rpx 20rpx;
}

.card-title {
    font-size: 30rpx;
    font-weight: bold;
    color: $dark;
    margin-bottom: 20rpx;
    display: flex;
    align-items: center;
    gap: 12rpx;

    .title-line {
        flex: 1;
        height: 4rpx;
        background: linear-gradient(to right, $primary, transparent);
        border-radius: 2rpx;
    }
}

.desc-content {
    font-size: 28rpx;
    color: $dark;
    line-height: 1.8;

    :deep(.detail-desc-content) {
        p { margin-bottom: 12rpx; }
    }
}

// 设施网格
.facility-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 20rpx;

    .facility-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8rpx;
        min-width: 100rpx;
        padding: 16rpx;
        background: #FAFAFA;
        border-radius: 16rpx;

        .facility-icon {
            font-size: 44rpx;
        }

        .facility-name {
            font-size: 22rpx;
            color: $dark;
        }
    }
}

// 底部占位
.bottom-placeholder {
    height: 120rpx;
}

// 底部操作栏
.bottom-bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    height: 100rpx;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20rpx;
    box-shadow: 0 -2rpx 12rpx rgba(0,0,0,0.06);
    z-index: 95;

    .home-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2rpx;
        padding: 0 20rpx;
        color: $gray;
        font-size: 20rpx;

        .yticon {
            font-size: 40rpx;
        }
    }

    .action-group {
        display: flex;
        align-items: center;
        gap: 16rpx;
    }

    .contact-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2rpx;
        padding: 0 24rpx;
        background: #FFF0EB;
        color: $primary;
        border-radius: 40rpx;
        font-size: 20rpx;
        height: 80rpx;
        justify-content: center;

        .yticon {
            font-size: 36rpx;
        }

        &::after { border: none; }
    }

    .book-btn {
        width: 320rpx;
        height: 80rpx;
        background: $primary;
        color: #fff;
        border-radius: 40rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 30rpx;
        font-weight: bold;

        &.disabled {
            background: #CCC;
        }
    }
}

// 时间选择弹窗
.time-popup {
    position: fixed;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    z-index: 999;

    &.show {
        .mask { animation: fadeIn 0.25s linear both; }
        .panel { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) both; }
    }

    &.hide {
        .mask { animation: fadeOut 0.25s linear both; }
        .panel { animation: slideDown 0.25s linear both; }
    }

    &.none { display: none; }

    .mask {
        position: fixed;
        top: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
    }

    .panel {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        background: #fff;
        border-radius: 30rpx 30rpx 0 0;
        max-height: 88vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }

    .panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 30rpx 30rpx 24rpx;
        border-bottom: 1rpx solid $light-gray;
    }

    .panel-room-info {
        display: flex;
        align-items: center;

        .panel-thumb {
            width: 80rpx;
            height: 80rpx;
            border-radius: 12rpx;
            margin-right: 16rpx;
        }

        .panel-meta {
            .panel-name {
                font-size: 30rpx;
                font-weight: bold;
                color: $dark;
                display: block;
                margin-bottom: 4rpx;
            }

            .panel-price {
                font-size: 26rpx;
                color: $primary;
                font-weight: bold;
            }
        }
    }

    .panel-close {
        font-size: 44rpx;
        color: $gray;
        padding: 10rpx;
    }

    .panel-times {
        flex: 1;
        overflow-y: auto;
        padding: 20rpx 0 40rpx;
    }
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
}

@keyframes slideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
}

@keyframes slideDown {
    from { transform: translateY(0); }
    to { transform: translateY(100%); }
}
</style>
