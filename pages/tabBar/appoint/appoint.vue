<template>
    <view class="page">
        <!-- 顶部状态栏占位 -->
        <view class="status-bar-placeholder"></view>

        <!-- 导航栏 -->
        <view class="nav-bar">
            <text class="nav-title">预约</text>
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
        <!-- 时段图例 -->
        <view class="slot-legend" v-if="!loading">
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

        <view class="room-list" v-if="!loading">
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
                v-for="(room, idx) in (roomList || [])"
                :key="room.object_id"
                @click="goDetail(idx)"
            >
                <!-- 左侧图片 -->
                <view class="card-img-wrap">
                    <image
                        class="card-img"
                        :src="room.image1"
                        mode="aspectFill"
                    />
                    <!-- 渐变遮罩 -->
                    <view class="card-img-overlay"></view>
                    <!-- 状态标签 -->
                    <view class="status-badge" :class="room.statusClass">
                        <text v-if="room.statusClass === 'full'">已约满</text>
                        <text v-else-if="room.statusClass === 'partial'">部分可约</text>
                        <text v-else>可预约</text>
                    </view>
                    <!-- 房间编号角标 -->
                    <view class="room-index-badge" v-if="idx < 3">
                        <text class="index-text">TOP {{ idx + 1 }}</text>
                    </view>
                </view>

                <!-- 右侧信息 -->
                <view class="card-info">
                    <view class="card-header">
                        <text class="card-name">{{ room.name }}</text>
                    </view>

                    <!-- 时段可用情况 - 升级版色块 -->
                    <view class="time-slots" v-if="room.appoints && room.appoints.length">
                        <view
                            v-for="(slot, si) in room.appoints.slice(0, 10)"
                            :key="si"
                            class="slot-block"
                            :class="slot.statusClass"
                        >
                            <text class="slot-hour">{{ String(slot.start).padStart(2, '0') }}</text>
                        </view>
                        <text class="slot-more" v-if="room.appoints.length > 10">+{{ room.appoints.length - 10 }}</text>
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
                            :class="room.isFullyBooked ? 'disabled' : 'ready'"
                            @click.stop="handleAppointButtonClick(idx)"
                        >
                            <text>{{ room.isFullyBooked ? '已满' : '立即预约' }}</text>
                        </view>
                    </view>
                </view>
            </view>

            <!-- 空状态 -->
            <view class="empty-section" v-if="roomList.length === 0">
                <text class="empty-icon">🍄</text>
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
                        :showSubmitButton="false"
                    ></times>
                </view>

                <!-- 底部操作栏 -->
                <view class="panel-footer">
                    <view class="pf-info">
                        <text class="pf-label">已选时段</text>
                        <text class="pf-count" v-if="specSelected.length">{{ specSelected.length }} 个时段</text>
                        <text class="pf-count zero" v-else>请选择预约时段</text>
                    </view>
                    <view class="pf-btns">
                        <view class="pf-btn group" :class="{ disabled: !specSelected.length }" @click="specSelected.length && handleCreateGroup()">
                            <text>发起拼团</text>
                        </view>
                        <view class="pf-btn book" :class="{ disabled: !specSelected.length }" @click="specSelected.length && handleDirectBook()">
                            <text>直接预约</text>
                        </view>
                    </view>
                </view>
            </view>
        </view>

		<!-- 自定义底部导航 -->
		<custom-tab-bar></custom-tab-bar>
    </view>
</template>

<script>
import { mapState, mapActions } from 'vuex';
import AUTH from '../../../utils/auth.js';
import times from '@/components/pretty-times/pretty-times.vue';

import customTabBar from '@/custom-tab-bar/index.vue';

export default {
    components: { times, customTabBar },

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
            specSelected: [],
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
        this.fetchRoomList();
    },

    onShow() {
        uni.$emit('tabBarChange', { key: 'appoint' });
        // 房间列表无需登录即可浏览
        if (this.weekDays && this.weekDays.length > 0) {
            this.fetchRoomList();
        }
        if (this.hasLogin && !this.userInfo) {
            this.getUserInfo();
        }
    },

    methods: {
        ...mapActions(['loginAndRegister', 'getUserInfo']),

        // 时间补零辅助：确保小时是两位数
        _padHour(h) {
            const hour = parseInt(h, 10);
            return hour < 10 ? '0' + hour : String(hour);
        },

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
            this.currentSelectDate = this.formatDate(days[0].fullDate);
        },

        selectDay(idx) {
            if (this.selectedDayIndex === idx) return;
            this.selectedDayIndex = idx;
            this.currentSelectDate = this.formatDate(this.weekDays[idx].fullDate);
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
            }).catch((err) => { this.loading = false; });
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
            if (!room.appoints || !room.appoints.length) return false;
            return room.appoints.every(s => s.status !== 1);
        },

        goDetail(idx) {
            const room = this.roomList[idx];
            if (!room) return;
            this.$store.commit('setCurrentRoom', room);
            uni.navigateTo({
                url: `/pages/product/product?date=${this.currentSelectDate}`
            });
        },

        handleAppointButtonClick(idx) {
            const room = this.roomList[idx];
            if (!room) {
                return;
            }
            if (!room.appoints || !room.appoints.length) {
                room.appoints = [];
            }
            if (this.isRoomFullyBooked(room)) return;
            this.currentSelectItem = room;
            this.$store.commit('setCurrentRoom', room);
            this.currentBeginTime = room.opening_hours_start + ':00:00';
            this.currentEndTime = room.opening_hours_end + ':00:00';
            this.disableTimeSlot = [];

            // Disable already booked slots
            for (let i = 0; i < room.appoints.length; i++) {
                if (room.appoints[i].status === 3) {
                    this.disableTimeSlot.push([
                        this.currentSelectDate + ' ' + this._padHour(room.appoints[i].start) + ':00:00',
                        this.currentSelectDate + ' ' + this._padHour(room.appoints[i].end) + ':00:00'
                    ]);
                }
            }
            this.goToAppoint();
        },

        handleTimesSelectDateChange(date) {
            this.currentSelectDate = date;
            if (this.checkDateHasAdded(date)) return;
            AUTH.getRoomAppointments(this.token, this.currentSelectItem.object_id, date).then(res => {
                if (!res) return;
                for (const propStr in res.data.time_list) {
                    if (!res.data.time_list[propStr]) {
                        const prop = JSON.parse(propStr);
                        this.disableTimeSlot.push([
                            date + ' ' + this._padHour(prop[0]) + ':00:00',
                            date + ' ' + this._padHour(prop[1]) + ':00:00'
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
                this.$refs.timesComponent && this.$refs.timesComponent.reset();
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
            // times: [{ date: '2026-04-15', item: ['2026-04-15 09:00:00', '2026-04-15 10:00:00'] }, ...]
            const selects = times.map(t => [t.item[0], t.item[1]]);
            this.specSelected = selects;
        },

        handleDirectBook() {
            if (!this.hasLogin) {
                uni.showModal({ title: '提示', content: '请先登录再预约', success: (res) => {
                    if (res.confirm) this.loginAndRegister();
                }});
                return;
            }
            const times = this.$refs.timesComponent && this.$refs.timesComponent.getSelection();
            if (!times || !times.length) {
                uni.showToast({ title: '请先选择预约时段', icon: 'none' });
                return;
            }
            const selects = times.map(t => [t.item[0], t.item[1]]);
            this.specSelected = selects;
            this.currentSelectItem.selects = this.specSelected;
            this.$store.commit('setCurrentSelectItem', this.currentSelectItem);
            uni.navigateTo({ url: '/pages/order/createOrder' });
        },

        handleCreateGroup() {
            if (!this.hasLogin) {
                uni.showModal({ title: '提示', content: '请先登录再发起拼团', success: (res) => {
                    if (res.confirm) this.loginAndRegister();
                }});
                return;
            }
            const times = this.$refs.timesComponent && this.$refs.timesComponent.getSelection();
            if (!times || !times.length) {
                uni.showToast({ title: '请先选择预约时段', icon: 'none' });
                return;
            }
            const first = times[0];
            const last = times[times.length - 1];
            const beginTime = first.item[0].split(' ')[1].substring(0, 5);
            const endTime = last.item[1].split(' ')[1].substring(0, 5);
            const room = this.currentSelectItem;
            const duration = Math.max(1, parseInt(endTime.split(':')[0]) - parseInt(beginTime.split(':')[0]));
            const timeList = times.map(t => t.item[0].split(' ')[1].substring(0, 5) + '~' + t.item[1].split(' ')[1].substring(0, 5));
            const query = 'room_id=' + room.object_id
                + '&room_name=' + encodeURIComponent(room.name || '')
                + '&room_image=' + encodeURIComponent(room.image1 || '')
                + '&date=' + this.currentSelectDate
                + '&begin_time=' + beginTime
                + '&end_time=' + endTime
                + '&duration=' + duration
                + '&price_per_person=' + (room.price_per_person || 0)
                + '&price_per_hour=' + (room.price_per_hour || 0)
                + '&time_list=' + encodeURIComponent(JSON.stringify(timeList));
            uni.navigateTo({ url: '/pages/group/create?' + query });
        },

        formatDate(d) {
            return d.getFullYear() + '-' + (d.getMonth() + 1).toString().padStart(2, '0') + '-' + d.getDate().toString().padStart(2, '0');
        },

        stopPrevent() {},
    },
};
</script>

<style lang="scss">
$primary: #E8784A;
$primary-light: #FFB88C;
$gold: #FFB933;
$green: #7CB342;
$red: #E53935;
$dark: #4A3728;
$gray: #A08B7A;
$light-gray: #F5EDE0;
$bg: #FDF6E9;
$card-bg: #FFFFFF;

page {
    background: $bg;
    min-height: 100vh;
    background-image: repeating-linear-gradient(
        0deg,
        transparent,
        transparent 3rpx,
        rgba(139, 90, 43, 0.025) 3rpx,
        rgba(139, 90, 43, 0.025) 6rpx
    );
}

.status-bar-placeholder {
    height: var(--status-bar-height, 44px);
    background: linear-gradient(135deg, #E8784A, #FFB88C);
}

.nav-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    height: 88rpx;
    background: linear-gradient(135deg, #E8784A, #FFB88C);

    .nav-title {
        font-size: 36rpx;
        font-weight: bold;
        color: #fff;
        letter-spacing: 2rpx;
        text-shadow: 0 2rpx 4rpx rgba(0,0,0,0.1);
    }
}

// 周日历
.week-strip {
    background: #fff;
    padding: 20rpx 0 24rpx;
    border-radius: 0 0 24rpx 24rpx;
    box-shadow: 0 4rpx 16rpx rgba(160, 120, 80, 0.08);
    position: relative;
    z-index: 1;

    .week-inner {
        display: flex;
        justify-content: space-around;
        padding: 0 20rpx;
    }

    .day-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 16rpx 20rpx;
        border-radius: 20rpx 24rpx 18rpx 22rpx / 22rpx 18rpx 24rpx 20rpx;
        transition: all 0.25s;
        position: relative;
        min-width: 88rpx;
        background: #FFF;
        border: 2rpx solid rgba(160, 120, 80, 0.08);
        box-shadow: 0 3rpx 10rpx rgba(160, 120, 80, 0.08);

        &.active {
            background: linear-gradient(135deg, $primary-light, $primary);
            border-color: transparent;
            box-shadow: 0 4rpx 16rpx rgba(232, 120, 74, 0.25);
            transform: scale(1.05);

            .day-week, .day-date {
                color: #fff;
            }

            .day-dot {
                background: #fff;
            }
        }

        &:active {
            transform: scale(0.95);
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
            bottom: 8rpx;
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
        display: block;

        .skeleton-img {
            width: 100%;
            height: 260rpx;
            border-radius: 20rpx 20rpx 0 0;
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            background-size: 200% 100%;
            animation: shimmer 1.2s infinite;
        }

        .skeleton-info {
            padding: 16rpx 24rpx 20rpx;
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
    margin: 0 20rpx;
    background: linear-gradient(to right, rgba(255,255,255,0.8), rgba(255,248,240,0.6));
    border-radius: 20rpx 20rpx 0 0;

    .list-count {
        font-size: 26rpx;
        color: $dark;
        font-weight: bold;
    }

    .list-tip {
        display: flex;
        align-items: center;
        font-size: 22rpx;
        color: $gray;
        background: #FFF8F0;
        padding: 8rpx 16rpx;
        border-radius: 20rpx;
        border: 1rpx solid rgba(232, 120, 74, 0.1);

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
    border-radius: 24rpx 28rpx 22rpx 26rpx / 26rpx 22rpx 28rpx 24rpx;
    overflow: hidden;
    margin-bottom: 24rpx;
    display: block;
    box-shadow: 0 12rpx 32rpx rgba(160, 100, 60, 0.12), 0 4rpx 8rpx rgba(160, 100, 60, 0.06);
    transition: transform 0.25s, box-shadow 0.25s;
    border: 2rpx solid rgba(160, 120, 80, 0.1);
    border-bottom: 4rpx dashed rgba(232,120,74,0.35);
    position: relative;

    &::after {
        content: '';
        position: absolute;
        left: 0;
        top: 320rpx;
        bottom: 20rpx;
        width: 6rpx;
        border-radius: 0 6rpx 6rpx 0;
        background: linear-gradient(to bottom, $primary-light, $primary);
        z-index: 3;
    }

    // 彩色条多样化
    &:nth-child(1)::after { background: linear-gradient(to bottom, #AED581, #7CB342); }
    &:nth-child(2)::after { background: linear-gradient(to bottom, #90CAF9, #64B5F6); }
    &:nth-child(3)::after { background: linear-gradient(to bottom, #F48FB1, #F06292); }
    &:nth-child(4)::after { background: linear-gradient(to bottom, #CE93D8, #BA68C8); }
    &:nth-child(5)::after { background: linear-gradient(to bottom, #FFE082, #FFB300); }
    &:nth-child(6)::after { background: linear-gradient(to bottom, #80CBC4, #4DB6AC); }
    &:nth-child(7)::after { background: linear-gradient(to bottom, #FFCC80, #FF9800); }

    &:active {
        transform: scale(0.98);
        box-shadow: 0 6rpx 20rpx rgba(160, 120, 80, 0.08);
    }

    &::before {
        position: absolute;
        top: 10rpx;
        right: 16rpx;
        left: auto;
        font-size: 40rpx;
        transform: rotate(15deg);
        opacity: 0.75;
        z-index: 2;
        filter: drop-shadow(0 2rpx 4rpx rgba(0,0,0,0.15));
    }
    &:nth-child(1)::before { content: '🌿'; }
    &:nth-child(2)::before { content: '🌸'; }
    &:nth-child(3)::before { content: '🍄'; }
    &:nth-child(4)::before { content: '⭐'; }
    &:nth-child(5)::before { content: '🍃'; }
    &:nth-child(6)::before { content: '🌼'; }
    &:nth-child(7)::before { content: '🦋'; }

    .card-img-wrap {
        width: 100%;
        height: 320rpx;
        position: relative;
        overflow: hidden;
    }

    .card-img {
        width: 100%;
        height: 100%;
        border-radius: 24rpx 24rpx 0 0;
    }

    // 图片底部渐变遮罩
    .card-img-overlay {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 80rpx;
        background: linear-gradient(to top, rgba(0,0,0,0.4), transparent);
        pointer-events: none;
    }

    // 房间编号角标
    .room-index-badge {
        position: absolute;
        bottom: 12rpx;
        right: 12rpx;
        background: linear-gradient(135deg, rgba(232,120,74,0.85), rgba(255,140,100,0.85));
        padding: 4rpx 14rpx;
        border-radius: 16rpx;
        box-shadow: 0 2rpx 8rpx rgba(232, 120, 74, 0.3);

        .index-text {
            font-size: 20rpx;
            color: #fff;
            font-weight: bold;
        }
    }

    .status-badge {
        position: absolute;
        top: 14rpx;
        left: 14rpx;
        padding: 6rpx 16rpx;
        border-radius: 20rpx;
        font-size: 22rpx;
        font-weight: bold;
        color: #fff;

        &.available {
            background: linear-gradient(135deg, rgba($green, 0.92), rgba(124,179,66,0.8));
        }

        &.partial {
            background: linear-gradient(135deg, rgba($gold, 0.92), rgba(255,183,77,0.8));
        }

        &.full {
            background: linear-gradient(135deg, rgba($red, 0.92), rgba(229,57,53,0.8));
        }
    }

    .card-info {
        width: 100%;
        padding: 16rpx 24rpx 20rpx;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        min-height: 180rpx;
    }

    .card-header {
        .card-name {
            font-size: 32rpx;
            font-weight: bold;
            color: $dark;
            line-height: 1.3;
        }
    }

    // 时段色块 - 升级版
    .time-slots {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 10rpx;
        margin: 10rpx 0;

        .slot-block {
            width: 48rpx;
            height: 48rpx;
            border-radius: 50%;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 22rpx;
            font-weight: bold;

            &.available {
                background: #C8E6C9;
                color: #2E7D32;
                border: 1rpx solid rgba(46,125,50,0.2);
            }
            &.past {
                background: #F5F5F5;
                color: #BBB;
            }
            &.booked {
                background: #FCE4EC;
                color: #C62828;
                border: 1rpx solid rgba(198,40,40,0.15);
            }

            .slot-hour {
                font-size: 22rpx;
                font-weight: bold;
            }
        }

        .slot-more {
            font-size: 22rpx;
            color: $gray;
            margin-left: 4rpx;
            line-height: 48rpx;
            font-weight: bold;
        }
    }

    .card-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 8rpx;

        .tag {
            font-size: 21rpx;
            color: #fff;
            background: linear-gradient(135deg, $primary, $primary-light);
            padding: 5rpx 14rpx;
            border-radius: 20rpx;
            border: none;
            box-shadow: 0 2rpx 6rpx rgba(232,120,74,0.2);
            font-weight: 500;
        }
    }

    .card-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 10rpx;
    }

    .card-price {
        display: flex;
        align-items: baseline;

        .price-yuan {
            font-size: 24rpx;
            color: $primary;
            font-weight: bold;
            margin-right: 2rpx;
        }

        .price-icon {
            font-size: 22rpx;
            margin-right: 4rpx;
        }

        .price-num {
            font-size: 40rpx;
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
        font-size: 26rpx;
        font-weight: bold;
        padding: 12rpx 32rpx;
        border-radius: 30rpx 34rpx 28rpx 32rpx / 32rpx 28rpx 34rpx 30rpx;
        transition: all 0.2s;

        &.ready {
            background: linear-gradient(135deg, $primary, $primary-light);
            color: #fff;
            box-shadow: 0 4rpx 16rpx rgba(232, 120, 74, 0.3);
        }

        &.disabled {
            background: #F0F0F0;
            color: #AAA;
        }

        &:active:not(.disabled) {
            transform: scale(0.95);
            box-shadow: 0 2rpx 8rpx rgba(232, 120, 74, 0.25);
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
        filter: drop-shadow(0 2rpx 4rpx rgba(0,0,0,0.06));
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



// 时段图例
.slot-legend {
    display: flex;
    justify-content: center;
    gap: 32rpx;
    padding: 8rpx 0 16rpx;
    .legend-item {
        display: flex;
        align-items: center;
        gap: 8rpx;
        font-size: 22rpx;
        color: $gray;
    }
    .legend-dot {
        width: 20rpx;
        height: 20rpx;
        border-radius: 6rpx;
        &.available { background: #E8F5E9; border: 1rpx solid rgba(124,179,66,0.15); }
        &.booked { background: #FFEBEE; border: 1rpx solid rgba(229,57,53,0.1); }
        &.past { background: #F5F5F5; }
    }
}
// 底部提示
.bottom-tip {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20rpx 40rpx 60rpx;
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
    z-index: 10001;

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
        padding: 20rpx 0 0;
    }

    .panel-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20rpx 30rpx;
        padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
        background: #fff;
        border-top: 1rpx solid #EEEEEE;
        box-shadow: 0 -2rpx 12rpx rgba(0,0,0,0.04);

        .pf-info {
            flex: 1;
            display: flex;
            flex-direction: column;

            .pf-label {
                font-size: 22rpx;
                color: #999;
                margin-bottom: 4rpx;
            }

            .pf-count {
                font-size: 28rpx;
                font-weight: bold;
                color: $primary;
                &.zero { color: #999; font-weight: normal; }
            }
        }

        .pf-btns {
            display: flex;
            align-items: center;
            gap: 16rpx;
        }

        .pf-btn {
            height: 76rpx;
            border-radius: 38rpx;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28rpx;
            font-weight: bold;
            color: #fff;
            padding: 0 32rpx;
            transition: background 0.2s;

            &.group {
                background: linear-gradient(135deg, #FF9ECD, #FF6432);
                &.disabled {
                    background: #CCC;
                }
            }

            &.book {
                background: $primary;
                &.disabled {
                    background: #CCC;
                }
            }
        }
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
