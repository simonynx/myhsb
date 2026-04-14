<template>
    <view class="page">
        <!-- 导航栏 -->
        <view class="nav-bar" :class="scrolled ? 'solid' : 'transparent'">
            <text class="nav-back yticon icon-fanhui" @click="goBack"></text>
            <text class="nav-title">{{ scrolled ? room.name : '包厢详情' }}</text>
            <view class="nav-share" @click="share">
                <text class="yticon icon-fenxiang2"></text>
            </view>
        </view>

        <!-- 轮播图 -->
        <view class="hero-section" @click="previewImages">
            <swiper
                class="hero-swiper"
                indicator-dots
                circular
                duration="400"
                interval="3000"
                autoplay
                indicator-color="rgba(255,255,255,0.4)"
                indicator-active-color="#fff"
            >
                <swiper-item v-for="(img, idx) in imgList" :key="idx">
                    <image :src="img.src" class="hero-img" mode="aspectFill" />
                </swiper-item>
            </swiper>

            <!-- 状态标签 -->
            <view class="hero-badge" :class="statusClass">
                <text>{{ statusText }}</text>
            </view>

            <!-- 图片计数 -->
            <view class="img-counter">
                <text>{{ currentImgIndex + 1 }}/{{ imgList.length }}</text>
            </view>

            <!-- 底部渐变 -->
            <view class="hero-gradient"></view>
        </view>

        <!-- 价格+名称卡片 -->
        <view class="price-card">
            <view class="price-row">
                <view class="price-main">
                    <text class="price-yuan">¥</text>
                    <text class="price-num">{{ room.price_per_hour / 100 }}</text>
                    <text class="price-unit">/小时</text>
                </view>
                <view class="original-price" v-if="room.original_price_per_hour && room.original_price_per_hour > room.price_per_hour">
                    <text>¥{{ room.original_price_per_hour / 100 }}</text>
                </view>
            </view>

            <view class="room-name-row">
                <text class="room-name">{{ room.name }}</text>
                <view class="tags-row" v-if="room.tagsArr && room.tagsArr.length">
                    <text class="tag" v-for="t in room.tagsArr" :key="t">{{ t }}</text>
                </view>
            </view>
        </view>

        <!-- 时段状态 -->
        <view class="slots-card">
            <view class="card-title">
                <text>可选时段</text>
                <view class="title-line"></view>
                <text class="slots-date">{{ currentSelectDate }}</text>
            </view>

            <view class="slots-grid">
                <view
                    v-for="(slot, si) in displaySlots"
                    :key="si"
                    class="slot-item"
                    :class="slot.statusClass"
                >
                    <text class="slot-time">{{ slot.start }}:00</text>
                    <view class="slot-bar"></view>
                </view>
            </view>

            <view class="slots-legend">
                <view class="legend-item">
                    <view class="legend-dot available"></view>
                    <text>可预约</text>
                </view>
                <view class="legend-item">
                    <view class="legend-dot booked"></view>
                    <text>已约满</text>
                </view>
                <view class="legend-item">
                    <view class="legend-dot past"></view>
                    <text>已过期</text>
                </view>
            </view>
        </view>

        <!-- 设施服务 -->
        <view class="facility-card" v-if="facilities.length">
            <view class="card-title">
                <text>设施服务</text>
                <view class="title-line"></view>
            </view>
            <view class="facility-grid">
                <view class="facility-item" v-for="f in facilities" :key="f.name">
                    <text class="facility-icon">{{ f.icon }}</text>
                    <text class="facility-name">{{ f.name }}</text>
                </view>
            </view>
        </view>

        <!-- 门店信息 -->
        <view class="store-card">
            <view class="store-header">
                <text class="store-icon">🏠</text>
                <text class="store-title">门店信息</text>
            </view>
            <view class="store-row">
                <text class="store-label">店铺</text>
                <text class="store-value">摸鱼划水吧</text>
            </view>
            <view class="store-row" v-if="storeAddress">
                <text class="store-label">地址</text>
                <text class="store-value addr">{{ storeAddress }}</text>
            </view>
            <view class="store-row" v-if="wifiInfo">
                <text class="store-label">WiFi</text>
                <text class="store-value">{{ wifiInfo }}</text>
            </view>
            <view class="store-actions">
                <view class="action-btn nav-btn" @click="openMap">
                    <text class="yticon icon-ditu"></text>
                    <text>导航</text>
                </view>
                <view class="action-btn call-btn" @click="callPhone">
                    <text class="yticon icon-dianhua"></text>
                    <text>拨打电话</text>
                </view>
            </view>
        </view>

        <!-- 房间介绍 -->
        <view class="desc-card" v-if="room.description">
            <view class="card-title">
                <text>房间介绍</text>
                <view class="title-line"></view>
            </view>
            <view class="desc-text">
                <rich-text :nodes="desc"></rich-text>
            </view>
        </view>

        <!-- 预约说明 -->
        <view class="notice-card">
            <view class="notice-item">
                <text class="notice-icon">⏰</text>
                <view class="notice-content">
                    <text class="notice-title">预约说明</text>
                    <text class="notice-body">请在预约时段开始前到达门店，现场凭预约手机号核销使用</text>
                </view>
            </view>
            <view class="notice-item">
                <text class="notice-icon">❄️</text>
                <view class="notice-content">
                    <text class="notice-title">取消政策</text>
                    <text class="notice-body">预约开始前30分钟可免费取消，超时不可取消</text>
                </view>
            </view>
            <view class="notice-item">
                <text class="notice-icon">🎮</text>
                <view class="notice-content">
                    <text class="notice-title">使用须知</text>
                    <text class="notice-body">房间内设施损坏需照价赔偿，请爱护公共物品</text>
                </view>
            </view>
        </view>

        <!-- 底部占位 -->
        <view class="bottom-placeholder"></view>

        <!-- 底部操作栏 -->
        <view class="bottom-bar">
            <view class="price-info">
                <text class="pi-label">实付金额</text>
                <text class="pi-price">¥{{ estimatePrice }}</text>
            </view>
            <view
                class="book-btn"
                :class="isFullyBooked ? 'disabled' : ''"
                @click="goToAppoint"
            >
                <text>{{ isFullyBooked ? '当天已约满' : '立即预约' }}</text>
            </view>
        </view>

        <!-- 时间选择弹窗 -->
        <view class="time-popup" :class="specClass" @touchmove.stop.prevent @click="closePopup">
            <view class="mask"></view>
            <view class="panel" @click.stop>
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

        <share ref="share" :contentHeight="580" :shareList="shareList"></share>
    </view>
</template>

<script>
import { mapState } from 'vuex';
import AUTH from '../../utils/auth.js';
import share from '@/components/share';
import times from '@/components/pretty-times/pretty-times.vue';

const DEFAULT_STORE_PHONE = '13712345678';
const STORE_LAT = 22.5431;
const STORE_LNG = 114.0579;

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
            scrolled: false,
            currentImgIndex: 0,
            shareList: [
                { type: 0, title: '赶紧来摸鱼吧！', icon: '/static/logo_small.jpg' },
                { type: 1, title: '微信', icon: '/static/wechat.png' },
            ],
            storeAddress: '',
            wifiInfo: '',
            storePhone: DEFAULT_STORE_PHONE,
            facilities: [],
        };
    },

    computed: {
        ...mapState(['token']),
        displaySlots() {
            if (!this.room.appoints) return [];
            return this.room.appoints;
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
        estimatePrice() {
            if (!this.room.price_per_hour) return '0.00';
            return (this.room.price_per_hour / 100).toFixed(2);
        },
    },

    onLoad(option) {
        this.roomDate = option.date || '';
        this.currentSelectDate = option.date || '';
        // 直接从 Vuex 取 room 数据（appoint.vue 已经存了整个 room 对象）
        const roomData = this.$store.state.currentRoom;
        if (roomData && roomData.object_id) {
            this.rebuildRoom(roomData);
        }
    },

    onPageScroll(e) {
        this.scrolled = e.scrollTop > 200;
    },

    methods: {
        _findAppoint(appointments, roomId, hour) {
            for (const appt of appointments) {
                if (appt.room == roomId) {
                    for (const interval of appt.time_list) {
                        if (interval[0] == hour) return true;
                    }
                }
            }
            return false;
        },
        rebuildRoom(roomData) {
            // 用响应式方式赋值，确保 Vue 能追踪动态属性
            const r = {};
            for (const key in roomData) { r[key] = roomData[key]; }
            this.room = r;
            this.buildImages();
            this.buildDesc();
            this.buildFacilities();
            this.buildStoreInfo();
            this.initTimeConfig();
        },

        buildImages() {
            const r = this.room;
            if (r.image1) this.imgList.push({ src: r.image1 });
            if (r.image2) this.imgList.push({ src: r.image2 });
            if (r.image3) this.imgList.push({ src: r.image3 });
            if (r.image4) this.imgList.push({ src: r.image4 });
            if (r.image5) this.imgList.push({ src: r.image5 });
            if (!this.imgList.length) {
                this.imgList.push({ src: '/static/logo_small.jpg' });
            }
        },

        buildDesc() {
            const d = this.room.description || '';
            if (!d) { this.desc = ''; return; }
            // Split by newlines and wrap each in p tag
            const paragraphs = d.split('\n').filter(l => l.trim());
            this.desc = paragraphs.map(p => `<p>${p}</p>`).join('');
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
                'ktv': { icon: '🎤', name: 'KTV' },
                '棋牌': { icon: '♠️', name: '棋牌' },
                'ps5': { icon: '🎮', name: 'PS5' },
                'switch': { icon: '🎯', name: 'Switch' },
            };
            const tags = this.room.tagsArr || [];
            this.facilities = tags
                .filter(t => tagMap[t.toLowerCase()])
                .map(t => tagMap[t.toLowerCase()]);
            // Always show WiFi if not in tags
            if (!this.facilities.find(f => f.name === 'WiFi')) {
                this.facilities.unshift({ icon: '📶', name: 'WiFi' });
            }
        },

        buildStoreInfo() {
            AUTH.getConstance().then(res => {
                if (!res) return;
                const cfg = res.data;
                if (cfg.wifi_name) this.wifiInfo = cfg.wifi_name + (cfg.wifi_password ? ' / ' + cfg.wifi_password : '');
                if (cfg.phone_number) this.storePhone = cfg.phone_number;
            });
        },

        initTimeConfig() {
            this.currentBeginTime = this.room.opening_hours_start + ':00:00';
            this.currentEndTime = this.room.opening_hours_end + ':00:00';
            this.disableTimeSlot = [];
            if (this.room.appoints) {
                for (const slot of this.room.appoints) {
                    slot.statusClass = this._getSlotClass(slot.status);
                    if (slot.status === 3) {
                        this.disableTimeSlot.push([
                            this.currentSelectDate + ' ' + slot.start + ':00:00',
                            this.currentSelectDate + ' ' + slot.end + ':00:00',
                        ]);
                    }
                }
            }
        },

        _getSlotClass(status) {
            if (status === 1) return 'available';
            if (status === 2) return 'past';
            return 'booked';
        },

        previewImages() {
            if (!this.imgList.length) return;
            uni.previewImage({
                urls: this.imgList.map(i => i.src),
                current: this.currentImgIndex,
            });
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
            if (!this.specSelected.length) return;
            uni.navigateTo({
                url: `/pages/order/createOrder?data=${encodeURIComponent(JSON.parse(JSON.stringify(this.room)))}`
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

        share() { this.$refs.share.toggleMask(); },

        callPhone() { uni.makePhoneCall({ phoneNumber: this.storePhone }); },

        openMap() {
            uni.openLocation({
                latitude: STORE_LAT,
                longitude: STORE_LNG,
                name: '摸鱼划水吧',
                address: this.storeAddress || '深圳市',
            });
        },

        goBack() { uni.navigateBack(); },
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
$card-bg: #FFFFFF;

page { background: $bg; padding-bottom: 120rpx; }

// 导航栏
.nav-bar {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 88rpx;
    transition: background 0.3s;

    &.transparent {
        background: transparent;
        .nav-back, .nav-title, .nav-share { color: #fff; text-shadow: 0 2rpx 8rpx rgba(0,0,0,0.3); }
    }

    &.solid {
        background: #fff;
        box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.08);
        .nav-back, .nav-title, .nav-share { color: $dark; text-shadow: none; }
    }

    .nav-back { position: absolute; left: 30rpx; font-size: 36rpx; }
    .nav-title { font-size: 32rpx; font-weight: bold; }
    .nav-share { position: absolute; right: 30rpx; font-size: 40rpx; }
}

// 轮播图
.hero-section {
    position: relative;
    height: 560rpx;
    overflow: hidden;

    .hero-swiper { height: 100%; }
    .hero-img { width: 100%; height: 100%; }

    .hero-badge {
        position: absolute;
        bottom: 60rpx; left: 24rpx;
        padding: 8rpx 20rpx;
        border-radius: 24rpx;
        font-size: 24rpx;
        font-weight: bold;
        color: #fff;
        &.available { background: rgba($green, 0.9); }
        &.partial { background: rgba($gold, 0.9); }
        &.full { background: rgba($red, 0.9); }
    }

    .img-counter {
        position: absolute;
        bottom: 24rpx; right: 24rpx;
        background: rgba(0,0,0,0.4);
        color: #fff;
        font-size: 24rpx;
        padding: 6rpx 16rpx;
        border-radius: 20rpx;
    }

    .hero-gradient {
        position: absolute;
        bottom: 0; left: 0; right: 0;
        height: 120rpx;
        background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.2));
    }
}

// 价格卡片
.price-card {
    background: #fff;
    margin: -30rpx 20rpx 20rpx;
    border-radius: 24rpx;
    padding: 30rpx;
    box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.08);
    position: relative;
    z-index: 1;

    .price-row {
        display: flex;
        align-items: baseline;
        margin-bottom: 16rpx;
    }

    .price-main {
        display: flex;
        align-items: baseline;
        .price-yuan { font-size: 28rpx; color: $primary; font-weight: bold; }
        .price-num { font-size: 60rpx; font-weight: bold; color: $primary; line-height: 1; }
        .price-unit { font-size: 26rpx; color: $gray; margin-left: 4rpx; }
    }

    .original-price {
        margin-left: 16rpx;
        font-size: 28rpx;
        color: $gray;
        text-decoration: line-through;
    }

    .room-name-row {
        display: flex;
        align-items: flex-start;
        gap: 16rpx;
        flex-wrap: wrap;
    }

    .room-name {
        font-size: 36rpx;
        font-weight: bold;
        color: $dark;
        line-height: 1.3;
        flex-shrink: 0;
    }

    .tags-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8rpx;
        margin-top: 8rpx;
    }

    .tag {
        font-size: 22rpx;
        color: $primary;
        background: #FFF0EB;
        padding: 4rpx 14rpx;
        border-radius: 10rpx;
    }
}

// 时段卡片
.slots-card {
    background: #fff;
    margin: 0 20rpx 20rpx;
    border-radius: 20rpx;
    padding: 24rpx;

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

        .slots-date {
            font-size: 24rpx;
            color: $gray;
            font-weight: normal;
        }
    }

    .slots-grid {
        display: flex;
        flex-wrap: wrap;
        margin-bottom: 16rpx;
    }

    .slot-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 108rpx;
        padding: 2rpx;
        box-sizing: border-box;

        .slot-time { font-size: 20rpx; color: $gray; margin-bottom: 6rpx; text-align: center; line-height: 1.2; }
        .slot-bar { width: 36rpx; height: 7rpx; border-radius: 3rpx; }

        &.available .slot-bar { background: $green; }
        &.booked .slot-bar { background: $red; }
        &.past .slot-bar { background: #DDD; }
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
                width: 12rpx; height: 12rpx;
                border-radius: 50%;
                &.available { background: $green; }
                &.booked { background: $red; }
                &.past { background: #DDD; }
            }
        }
    }
}

// 设施卡片
.facility-card {
    background: #fff;
    margin: 0 20rpx 20rpx;
    border-radius: 20rpx;
    padding: 24rpx;

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

            .facility-icon { font-size: 44rpx; }
            .facility-name { font-size: 22rpx; color: $dark; }
        }
    }
}

// 门店卡片
.store-card {
    background: #fff;
    margin: 0 20rpx 20rpx;
    border-radius: 20rpx;
    padding: 24rpx;

    .store-header {
        display: flex;
        align-items: center;
        gap: 10rpx;
        margin-bottom: 20rpx;

        .store-icon { font-size: 36rpx; }
        .store-title { font-size: 30rpx; font-weight: bold; color: $dark; }
    }

    .store-row {
        display: flex;
        align-items: flex-start;
        padding: 12rpx 0;
        border-bottom: 1rpx solid $light-gray;

        .store-label {
            width: 80rpx;
            font-size: 26rpx;
            color: $gray;
            flex-shrink: 0;
        }

        .store-value {
            flex: 1;
            font-size: 26rpx;
            color: $dark;
            &.addr { font-size: 24rpx; }
        }
    }

    .store-actions {
        display: flex;
        gap: 16rpx;
        margin-top: 20rpx;

        .action-btn {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8rpx;
            padding: 20rpx;
            border-radius: 16rpx;
            font-size: 28rpx;
            font-weight: bold;

            .yticon { font-size: 36rpx; }
        }

        .nav-btn {
            background: #F0F9F0;
            color: $green;
        }

        .call-btn {
            background: #FFF0EB;
            color: $primary;
        }
    }
}

// 介绍卡片
.desc-card {
    background: #fff;
    margin: 0 20rpx 20rpx;
    border-radius: 20rpx;
    padding: 24rpx;

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

    .desc-text {
        font-size: 28rpx;
        color: $dark;
        line-height: 1.9;

        :deep(p) { margin-bottom: 12rpx; }
    }
}

// 预约说明卡片
.notice-card {
    background: #fff;
    margin: 0 20rpx 20rpx;
    border-radius: 20rpx;
    padding: 24rpx;

    .notice-item {
        display: flex;
        gap: 16rpx;
        padding: 16rpx 0;
        border-bottom: 1rpx solid $light-gray;

        &:last-child { border-bottom: none; }

        .notice-icon { font-size: 36rpx; flex-shrink: 0; margin-top: 4rpx; }

        .notice-content {
            flex: 1;
            .notice-title {
                font-size: 28rpx;
                font-weight: bold;
                color: $dark;
                display: block;
                margin-bottom: 6rpx;
            }
            .notice-body {
                font-size: 24rpx;
                color: $gray;
                line-height: 1.6;
            }
        }
    }
}

// 底部占位
.bottom-placeholder { height: 120rpx; }

// 底部操作栏
.bottom-bar {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    height: 100rpx;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 30rpx;
    box-shadow: 0 -2rpx 12rpx rgba(0,0,0,0.06);
    z-index: 95;

    .price-info {
        display: flex;
        flex-direction: column;

        .pi-label { font-size: 22rpx; color: $gray; }
        .pi-price { font-size: 44rpx; font-weight: bold; color: $primary; line-height: 1.1; }
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

        &.disabled { background: #CCC; }
    }
}

// 时间选择弹窗
.time-popup {
    position: fixed;
    left: 0; right: 0; top: 0; bottom: 0;
    z-index: 999;

    &.show { display: flex; }
    &.hide { display: flex; }
    &.none { display: none; }

    .mask {
        position: absolute;
        top: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5);
        animation: fadeIn 0.25s linear both;
    }

    .panel {
        position: absolute;
        left: 0; right: 0; bottom: 0;
        background: #fff;
        border-radius: 30rpx 30rpx 0 0;
        height: 75vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }

    &.show .panel { animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1) both; }
    &.hide .panel { animation: slideDown 0.25s linear both; }

    .panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 30rpx 30rpx 24rpx;
        border-bottom: 1rpx solid $light-gray;

        .panel-room-info { display: flex; align-items: center; }
        .panel-thumb { width: 80rpx; height: 80rpx; border-radius: 12rpx; margin-right: 16rpx; }
        .panel-meta {
            .panel-name { font-size: 30rpx; font-weight: bold; color: $dark; display: block; margin-bottom: 4rpx; }
            .panel-price { font-size: 26rpx; color: $primary; font-weight: bold; }
        }
        .panel-close { font-size: 44rpx; color: $gray; padding: 10rpx; }
    }

    .panel-times { flex: 1; overflow-y: auto; padding: 20rpx 0 40rpx; min-height: 0; }
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
@keyframes slideDown { from { transform: translateY(0); } to { transform: translateY(100%); } }
</style>
