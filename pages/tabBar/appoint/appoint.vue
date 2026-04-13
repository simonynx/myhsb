<template>
    <view class="page">
        <!-- 顶部状态栏占位 -->
        <view class="status-bar-placeholder"></view>

        <!-- 导航栏 -->
        <view class="nav-bar">
            <text class="nav-back yticon icon-fanhui" @click="goBack"></text>
            <text class="nav-title">预约房间</text>
            <view class="nav-right"></view>
        </view>

        <!-- 周日历 -->
        <view class="week-strip">
            <view class="week-inner">
                <view
                    v-for="(day, idx) in weekDays"
                    :key="idx"
                    class="day-item"
                    :class="selectedDayIndex === idx ? 'active' : ''"
                    @click="selectDay(idx)"
                >
                    <text class="day-week">{{ day.week }}</text>
                    <text class="day-date">{{ day.date }}</text>
                    <view class="day-dot" v-if="day.isToday"></view>
                </view>
            </view>
        </view>

        <!-- 加载中 -->
        <view class="loading-section" v-if="loading">
            <view class="loading-cards">
                <view class="skeleton-card" v-for="i in 3" :key="i">
                    <view class="skeleton-img"></view>
                    <view class="skeleton-info">
                        <view class="skeleton-title"></view>
                        <view class="skeleton-tags"></view>
                        <view class="skeleton-price"></view>
                    </view>
                </view>
            </view>
        </view>

        <!-- 房间列表 -->
        <view class="room-list" v-else>
            <view class="list-header">
                <text class="list-count">共 {{ roomList.length }} 个包厢</text>
                <view class="list-tip" v-if="selectedDayInfo.isToday">
                    <text class="tip-icon">⏰</text>
                    <text>今天 {{ currentHour }}:00 之前的时段不可选</text>
                </view>
            </view>

            <!-- 房间卡片 -->
            <view
                class="room-card"
                v-for="room in (roomList || [])"
                :key="room.object_id"
                @click="goDetail(room)"
            >
                <!-- 左侧图片 -->
                <view class="card-img-wrap">
                    <image
                        class="card-img"
                        :src="room.image1"
                        mode="aspectFill"
                    />
                    <!-- 状态标签 -->
                    <view class="status-badge" :class="room.statusClass">
                        <text>{{ room.statusText }}</text>
                    </view>
                    <!-- 人数标签 -->
                </view>

                <!-- 右侧信息 -->
                <view class="card-info">
                    <view class="card-header">
                        <text class="card-name">{{ room.name }}</text>
                    </view>

                    <!-- 时段可用情况 -->
                    <view class="time-slots">
                        <view
                            v-for="(slot, si) in room.appoints.slice(0, 8)"
                            :key="si"
                            class="slot-dot"
                            :class="slot.statusClass"
                        ></view>
                        <text class="slot-more" v-if="room.appoints.length > 8">+{{ room.appoints.length - 8 }}</text>
                    </view>

                    <!-- 标签 -->
                    <view class="card-tags" v-if="room.tagsArr && room.tagsArr.length">
                        <text class="tag" v-for="tag in room.tagsArr.slice(0, 3)" :key="tag">{{ tag }}</text>
                    </view>

                    <!-- 价格和按钮 -->
                    <view class="card-footer">
                        <view class="card-price">
                            <text class="price-yuan">¥</text>
                            <text class="price-num">{{ room.price_per_hour / 100 }}</text>
                            <text class="price-unit">/小时</text>
                        </view>
                        <view
                            class="book-btn"
                            :class="room.isFullyBooked ? 'disabled' : ''"
                            @click.stop="handleAppointButtonClick(room)"
                        >
                            <text>立即预约</text>
                        </view>
                    </view>
                </view>
            </view>

            <!-- 空状态 -->
            <view class="empty-section" v-if="roomList.length === 0">
                <text class="empty-icon">🎮</text>
                <text class="empty-title">当天暂无可预约的包厢</text>
                <text class="empty-sub">换个日期试试吧～</text>
            </view>
        </view>

        <!-- 底部说明 -->
        <view class="bottom-tip">
            <text>· 滑动日期可查看更多</text>
            <text>· 点击包厢查看详情和设施</text>
        </view>

        <!-- 时间选择弹窗 -->
        <view class="time-popup" :class="specClass" @touchmove.stop.prevent="stopPrevent" @click="closePopup">
            <view class="mask"></view>
            <view class="panel" @click.stop="stopPrevent">
                <!-- 头部 -->
                <view class="panel-header">
                    <view class="panel-room-info">
                        <image class="panel-thumb" :src="currentSelectItem ? currentSelectItem.image1 : ''" mode="aspectFill" />
                        <view class="panel-meta">
                            <text class="panel-name">{{ currentSelectItem ? currentSelectItem.name : '' }}</text>
                            <text class="panel-price">¥{{ currentSelectItem ? currentSelectItem.price_per_hour / 100 : 0 }}/小时</text>
                        </view>
                    </view>
                    <text class="panel-close yticon icon-guanbi" @click="closePopup"></text>
                </view>

                <!-- 时间选择器组件 -->
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
    </view>
</template>

<script>
import { mapState, mapActions } from 'vuex';
import AUTH from '../../../utils/auth.js';
import times from '@/components/pretty-times/pretty-times.vue';

export default {
    components: { times },

    data() {
        return {
            specClass: 'none',
            roomList: [],
            selectedDayIndex: 0,
            weekDays: [],
            currentSelectDate: '',
            currentSelectItem: null,
            currentBeginTime: '',
            currentEndTime: '',
            disableTimeSlot: [],
            loading: false,
        };
    },

    computed: {
        ...mapState(['hasLogin', 'token', 'userInfo']),
        currentHour() { return new Date().getHours(); },
        selectedDayInfo() {
            return this.weekDays[this.selectedDayIndex] || {};
        },
    },

    onLoad() {
        this.buildWeekDays();
        // weekDays ready, fetch room list
        if (this.hasLogin) {
            if (!this.userInfo) this.getUserInfo();
            this.fetchRoomList();
        }
    },

    onShow() {
        if (!this.hasLogin) {
            this.loginAndRegister().then(() => this.fetchRoomList());
        } else {
            if (!this.userInfo) this.getUserInfo();
            // Only refetch if weekDays is already built (page coming from background)
            if (this.weekDays && this.weekDays.length > 0) {
                this.fetchRoomList();
            }
        }
    },

    methods: {
        ...mapActions(['loginAndRegister', 'getUserInfo']),

        buildWeekDays() {
            const days = [];
            const weekLabels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
            const today = new Date();
            for (let i = 0; i < 7; i++) {
                const d = new Date(today);
                d.setDate(today.getDate() + i);
                const isToday = i === 0;
                days.push({
                    date: d.getDate(),
                    month: d.getMonth() + 1,
                    week: weekLabels[d.getDay()],
                    isToday,
                    fullDate: d,
                });
            }
            this.weekDays = days;
            this.selectedDayIndex = 0;
        },

        selectDay(idx) {
            if (this.selectedDayIndex === idx) return;
            this.selectedDayIndex = idx;
            this.fetchRoomList();
        },

        fetchRoomList() {
            const dayInfo = this.selectedDayInfo;
            if (!dayInfo || !dayInfo.fullDate) return;
            const day = dayInfo.fullDate;
            this.loading = true;
            AUTH.getRoomDataList(this.token, this.formatDate(day)).then(res => {
                this.loading = false;
                if (!res || !res.data) return;
                const data = res.data;
                if (!data.rooms) {
                    this.roomList = [];
                    return;
                }
                const today = new Date();
                const isToday = this.selectedDayInfo.isToday;
                const currentHour = isToday ? today.getHours() : -1;

                res.data.rooms.forEach(item => {
                    item.appoints = [];
                    if (item.tags) {
                        item.tagsArr = item.tags.split('$').filter(t => t.trim());
                    } else {
                        item.tagsArr = [];
                    }
                    for (let i = item.opening_hours_start; i < item.opening_hours_end; i++) {
                        const status = i <= currentHour ? 2 : (this.findAppoint(res.data.appointments, item.object_id, i) ? 3 : 1);
                        const statusClass = status === 1 ? 'available' : status === 2 ? 'past' : 'booked';
                        item.appoints.push({ start: i, end: i + 1, status, statusClass });
                    }

                    // Room-level status properties
                    const hasAppointments = item.appoints.some(s => s.status === 3);
                    const allBooked = item.appoints.length > 0 && item.appoints.every(s => s.status !== 1);
                    if (allBooked) {
                        item.statusClass = 'full';
                        item.statusText = '已约满';
                    } else if (hasAppointments) {
                        item.statusClass = 'partial';
                        item.statusText = '部分可约';
                    } else {
                        item.statusClass = 'available';
                        item.statusText = '可预约';
                    }
                    item.isFullyBooked = allBooked;
                });
                this.roomList = data.rooms || [];
            }).catch(() => { this.loading = false; });
        },

        findAppoint(appointments, roomId, hour) {
            for (const appt of appointments) {
                if (appt.room == roomId) {
                    for (const interval of appt.time_list) {
                        if (interval[0] == hour) return true;
                    }
                }
            }
            return false;
        },

        isRoomFullyBooked(room) {
            return room.appoints.length > 0 && room.appoints.every(s => s.status !== 1);
        },

        goDetail(room) {
            uni.navigateTo({
                url: `/pages/product/product?data=${encodeURIComponent(JSON.stringify(room))}&date=${this.currentSelectDate}`
            });
        },

        handleAppointButtonClick(item) {
            if (this.isRoomFullyBooked(item)) return;
            this.currentSelectItem = item;
            this.currentBeginTime = item.opening_hours_start + ':00:00';
            this.currentEndTime = item.opening_hours_end + ':00:00';
            this.disableTimeSlot = [];

            // Disable already booked slots
            for (let i = 0; i < item.appoints.length; i++) {
                if (item.appoints[i].status === 3) {
                    this.disableTimeSlot.push([
                        this.currentSelectDate + ' ' + item.appoints[i].start + ':00:00',
                        this.currentSelectDate + ' ' + item.appoints[i].end + ':00:00'
                    ]);
                }
            }
            this.goToAppoint();
        },

        handleTimesSelectDateChange(date) {
            if (this.checkDateHasAdded(date)) return;
            AUTH.getRoomAppointments(this.token, this.currentSelectItem.object_id, date).then(res => {
                if (!res) return;
                for (const propStr in res.data.time_list) {
                    if (!res.data.time_list[propStr]) {
                        const prop = JSON.parse(propStr);
                        this.disableTimeSlot.push([
                            date + ' ' + prop[0] + ':00:00',
                            date + ' ' + prop[1] + ':00:00'
                        ]);
                    }
                }
            });
        },

        checkDateHasAdded(date) {
            if (!this.disableTimeSlot || !this.disableTimeSlot.length) return false;
            for (const time of this.disableTimeSlot) {
                const [begin] = time;
                const [dateItem] = begin.split(' ');
                if (dateItem === date) return true;
            }
            return false;
        },

        goToAppoint() {
            if (this.specClass === 'show') {
                this.specClass = 'hide';
                setTimeout(() => { this.specClass = 'none'; }, 250);
            } else if (this.specClass === 'none') {
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
            this.currentSelectItem.selects = this.specSelected;
            if (this.specSelected.length <= 0) return;
            uni.navigateTo({
                url: `/pages/order/createOrder?data=${encodeURIComponent(JSON.stringify(this.currentSelectItem))}`
            });
        },

        formatDate(d) {
            return d.getFullYear() + '-' + (d.getMonth() + 1).toString().padStart(2, '0') + '-' + d.getDate().toString().padStart(2, '0');
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
$card-bg: #FFFFFF;

page {
    background: $bg;
    min-height: 100vh;
}

.status-bar-placeholder {
    height: 88rpx;
    background: #fff;
}

.nav-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    height: 88rpx;
    background: #fff;

    .nav-back {
        position: absolute;
        left: 30rpx;
        font-size: 36rpx;
        color: $dark;
    }

    .nav-title {
        font-size: 32rpx;
        font-weight: bold;
        color: $dark;
    }

    .nav-right {
        position: absolute;
        right: 30rpx;
    }
}

// 周日历
.week-strip {
    background: #fff;
    padding: 0 0 20rpx;
    border-bottom: 1rpx solid $light-gray;

    .week-inner {
        display: flex;
        justify-content: space-around;
        padding: 0 20rpx;
    }

    .day-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 12rpx 16rpx;
        border-radius: 20rpx;
        transition: all 0.2s;
        position: relative;
        min-width: 80rpx;

        &.active {
            background: $primary;

            .day-week, .day-date {
                color: #fff;
            }

            .day-dot {
                background: #fff;
            }
        }

        .day-week {
            font-size: 22rpx;
            color: $gray;
            margin-bottom: 4rpx;
        }

        .day-date {
            font-size: 34rpx;
            font-weight: bold;
            color: $dark;
        }

        .day-dot {
            width: 8rpx;
            height: 8rpx;
            border-radius: 50%;
            background: $primary;
            position: absolute;
            bottom: 6rpx;
        }
    }
}

// 加载骨架
.loading-section {
    padding: 20rpx;

    .skeleton-card {
        background: #fff;
        border-radius: 20rpx;
        overflow: hidden;
        margin-bottom: 20rpx;
        padding: 20rpx;
        display: flex;

        .skeleton-img {
            width: 200rpx;
            height: 160rpx;
            border-radius: 16rpx;
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            background-size: 200% 100%;
            animation: shimmer 1.2s infinite;
        }

        .skeleton-info {
            flex: 1;
            padding-left: 20rpx;
        }

        .skeleton-title {
            height: 36rpx;
            background: #f0f0f0;
            border-radius: 8rpx;
            width: 60%;
            margin-bottom: 16rpx;
        }

        .skeleton-tags {
            height: 28rpx;
            background: #f0f0f0;
            border-radius: 8rpx;
            width: 40%;
            margin-bottom: 16rpx;
        }

        .skeleton-price {
            height: 32rpx;
            background: #f0f0f0;
            border-radius: 8rpx;
            width: 30%;
        }
    }
}

@keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
}

// 列表头部
.list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24rpx 30rpx 16rpx;

    .list-count {
        font-size: 26rpx;
        color: $gray;
    }

    .list-tip {
        display: flex;
        align-items: center;
        font-size: 22rpx;
        color: $gray;
        background: #FFF5F0;
        padding: 8rpx 16rpx;
        border-radius: 20rpx;

        .tip-icon {
            margin-right: 6rpx;
            font-size: 22rpx;
        }
    }
}

// 房间卡片
.room-list {
    padding: 0 20rpx 20rpx;
}

.room-card {
    background: $card-bg;
    border-radius: 24rpx;
    overflow: hidden;
    margin-bottom: 20rpx;
    display: flex;
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
    transition: transform 0.2s, box-shadow 0.2s;

    &:active {
        transform: scale(0.98);
        box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
    }

    .card-img-wrap {
        width: 240rpx;
        height: 200rpx;
        position: relative;
        flex-shrink: 0;
    }

    .card-img {
        width: 100%;
        height: 100%;
    }

    .status-badge {
        position: absolute;
        top: 12rpx;
        left: 12rpx;
        padding: 4rpx 12rpx;
        border-radius: 20rpx;
        font-size: 20rpx;
        font-weight: bold;

        &.available {
            background: rgba($green, 0.9);
            color: #fff;
        }

        &.partial {
            background: rgba($gold, 0.9);
            color: #fff;
        }

        &.full {
            background: rgba($red, 0.9);
            color: #fff;
        }
    }

    .card-info {
        flex: 1;
        padding: 16rpx 20rpx;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        min-height: 200rpx;
    }

    .card-header {
        .card-name {
            font-size: 30rpx;
            font-weight: bold;
            color: $dark;
            line-height: 1.3;
        }
    }

    // 时段小圆点
    .time-slots {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 6rpx;
        margin: 8rpx 0;

        .slot-dot {
            width: 16rpx;
            height: 16rpx;
            border-radius: 50%;
            &.available { background: $green; }
            &.past { background: #DDD; }
            &.booked { background: $red; }
        }

        .slot-more {
            font-size: 20rpx;
            color: $gray;
            margin-left: 4rpx;
        }
    }

    .card-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 8rpx;

        .tag {
            font-size: 20rpx;
            color: $primary;
            background: #FFF0EB;
            padding: 3rpx 10rpx;
            border-radius: 8rpx;
        }
    }

    .card-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 8rpx;
    }

    .card-price {
        display: flex;
        align-items: baseline;

        .price-yuan {
            font-size: 22rpx;
            color: $primary;
            font-weight: bold;
        }

        .price-num {
            font-size: 36rpx;
            font-weight: bold;
            color: $primary;
            line-height: 1;
        }

        .price-unit {
            font-size: 22rpx;
            color: $gray;
            margin-left: 2rpx;
        }
    }

    .book-btn {
        background: $primary;
        color: #fff;
        font-size: 24rpx;
        font-weight: bold;
        padding: 10rpx 28rpx;
        border-radius: 30rpx;
        transition: background 0.2s;

        &.disabled {
            background: #CCC;
            color: #999;
        }

        &:active:not(.disabled) {
            background: darken($primary, 10%);
        }
    }
}

// 空状态
.empty-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 100rpx 40rpx;

    .empty-icon {
        font-size: 100rpx;
        margin-bottom: 24rpx;
    }

    .empty-title {
        font-size: 32rpx;
        font-weight: bold;
        color: $dark;
        margin-bottom: 12rpx;
    }

    .empty-sub {
        font-size: 26rpx;
        color: $gray;
    }
}

// 底部提示
.bottom-tip {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20rpx 40rpx 40rpx;
    font-size: 22rpx;
    color: $gray;
    gap: 6rpx;
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
