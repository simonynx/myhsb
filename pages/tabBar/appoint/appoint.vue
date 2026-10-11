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
                    <text class="day-promo" v-if="day.isPromo">{{ day.promoText }}</text>
                    <view class="day-dot" v-if="day.isToday"></view>
                </view>
            </view>
        </view>

        <!-- 优惠日提示条：所选日期命中闲时规则时展示 -->
        <view class="promo-strip" v-if="selectedDayPromo.visible">
            <text class="promo-strip-text">{{ selectedDayPromo.text }}</text>
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
            <view class="legend-item" v-if="hasOffpeakToday">
                <view class="legend-dot offpeak"></view>
                <text>闲时优惠</text>
            </view>
        </view>

        <view class="group-intent-card" v-if="groupIntentVisible && !loading">
            <view class="group-intent-copy">
                <text class="group-intent-title">准备发起组局</text>
                <text class="group-intent-sub">本次选择将用于创建组局，其他玩家可以加入并分摊费用。</text>
            </view>
            <view class="group-intent-close" @click="closeGroupIntent">知道了</view>
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
                        lazy-load
                    />
                    <!-- 渐变遮罩 -->
                    <view class="card-img-overlay"></view>
                    <!-- 状态标签 -->
                    <view class="status-badge" :class="room.statusClass">
                        <text v-if="room.statusClass === 'full'">已约满</text>
                        <text v-else-if="room.statusClass === 'partial'">部分可约</text>
                        <text v-else>可预约</text>
                    </view>
                </view>

                <!-- 右侧信息 -->
                <view class="card-info">
                    <view class="card-header">
                        <text class="card-name">{{ room.name }}</text>
                        <text class="seats-badge" v-if="room.seats_count">{{ room.seats_count }}人</text>
                    </view>

                    <!-- 时段可用情况 - 升级版色块 -->
                    <view class="time-slots" v-if="room.appoints && room.appoints.length">
                        <view
                            v-for="(slot, si) in room.appoints.slice(0, 10)"
                            :key="si"
                            class="slot-block"
                            :class="[slot.statusClass, slot.isOffpeak ? 'offpeak' : '']"
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
                            <view class="price-now" v-if="room.offpeakDayText">
                                <text class="price-yuan offpeak">¥</text>
                                <text class="price-num offpeak">{{ room.offpeakDayPriceText }}</text>
                                <text class="price-unit">/小时起</text>
                                <text class="price-strike">¥{{ room.price_per_hour / 100 }}/时</text>
                                <text class="discount-badge" v-if="room.offpeakDiscountText">{{ room.offpeakDiscountText }}</text>
                            </view>
                            <view class="price-now" v-else>
                                <text class="price-yuan">¥</text>
                                <text class="price-num">{{ room.price_per_hour / 100 }}</text>
                                <text class="price-unit">/小时</text>
                            </view>

                        </view>
                        <view
                            class="book-btn"
                            :class="room.isFullyBooked ? 'disabled' : 'ready'"
                            @click.stop="handleAppointButtonClick(idx)"
                        >
                            <text>{{ room.isFullyBooked ? '已满' : (groupIntentVisible ? '选时段组局' : '选时段') }}</text>
                        </view>
                    </view>
                            <view class="offpeak-tag" v-if="room.offpeakDayText">
                                <text class="offpeak-tag-deal" v-if="room.offpeakDayCoupleText">双人2小时 ¥{{ room.offpeakDayCoupleText }}起 · 含两人入场费</text>
                                <text class="offpeak-tag-window" v-if="room.offpeakDayWindow">{{ room.offpeakDayWindow }}</text>
                            </view>
                </view>
            </view>

            <!-- 空状态 -->
            <view class="empty-section" v-if="roomList.length === 0">
                <text class="empty-icon">空</text>
                <text class="empty-title">当天暂无可预约的包厢</text>
                <text class="empty-sub">换个日期看看其他空档</text>
            </view>
        </view>

        <!-- 时间选择弹窗 -->
        <view class="time-popup" :class="specClass" @click="closePopup">
            <view class="mask" @touchmove.stop.prevent="stopPrevent"></view>
            <view class="panel" @click.stop="stopPrevent">
                <!-- 头部 -->
                <view class="panel-header">
                    <view class="panel-room-info">
                        <image class="panel-thumb" :src="currentSelectItem ? currentSelectItem.image1 : ''" mode="aspectFill" />
                        <view class="panel-meta">
                            <text class="panel-name">{{ currentSelectItem ? currentSelectItem.name : '' }}</text>
                            <text class="panel-price">{{ currentSelectDate }} · 先选时段，再确认人数</text>
                        </view>
                    </view>
                    <text class="panel-close yticon icon-guanbi" @click="closePopup"></text>
                </view>

                <!-- 时间选择器组件 -->
                <scroll-view class="panel-times" :scroll-y="true" :show-scrollbar="false">
                    <view class="panel-scroll-content">
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
                        <booking-price :room="currentSelectItem" :date="currentSelectDate" :selects="specSelected" />
                    </view>
                </scroll-view>

                <!-- 底部操作栏 -->
                <view class="panel-footer">
                    <view class="pf-info">
                        <text class="pf-label">{{ panelPricing.valid ? panelPricing.label : '请选择连续时段' }}</text>
                        <text class="pf-count" v-if="panelPricing.valid">包厢费 ¥{{ panelPricing.roomText }}</text>
                        <text class="pf-entry" v-if="panelPricing.valid">另加 ¥{{ panelPricing.personText }}/人入场费</text>
                    </view>
                    <view class="pf-btns">
                        <view :class="groupButtonClass" @click="panelPricing.valid && handleCreateGroup()">
                            <text>找搭子</text>
                        </view>
                        <view :class="bookButtonClass" @click="panelPricing.valid && handleDirectBook()">
                            <text>下一步</text>
                        </view>
                    </view>
                </view>
            </view>
        </view>

    </view>
</template>

<script>
import { mapState, mapActions } from 'vuex';
import AUTH from '../../../utils/auth.js';
import OFFPEAK from '../../../utils/offpeak.js';
import times from '@/components/pretty-times/pretty-times.vue';
import BookingPrice from '../../../components/booking-price/booking-price.vue';

export default {
    components: { times, BookingPrice },

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
            roomLoading: false,
            roomLoadingKey: '',
            roomDataKey: '',
            roomLastLoadedAt: 0,
            roomRequestSeq: 0,
            groupIntentVisible: false,
            groupIntentSource: '',
        };
    },

    computed: {
        ...mapState(['hasLogin', 'token', 'userInfo', 'constance']),
        currentHour() { return new Date().getHours(); },
        selectedDayInfo() {
            return this.weekDays[this.selectedDayIndex] || {};
        },
        selectedDayPromo() {
            if (this.roomDataKey !== this.currentSelectDate) return { visible: false };
            let deal = null;
            this.roomList.forEach(room => {
                const candidate = OFFPEAK.bestCoupleDeal(room, this.currentSelectDate, {
                    unavailableHours: (room.appoints || []).filter(slot => slot.status !== 1).map(slot => slot.start),
                });
                if (candidate && (!deal || candidate.total < deal.total)) deal = candidate;
            });
            return deal ? { visible: true, text: deal.room.name + ' · 双人2小时 ¥' + deal.totalText
                + '起（含两人入场费） · ' + deal.windowText } : { visible: false };
        },
        panelPricing() {
            return OFFPEAK.selectionView(this.currentSelectItem, this.currentSelectDate, this.specSelected);
        },
        // 当天任一房间有闲时规则时，时段图例展示"闲时优惠"
        hasOffpeakToday() {
            return (this.roomList || []).some(function(r) { return !!r.offpeakDayText; });
        },
        groupButtonClass() {
            return this.panelPricing.valid ? 'pf-btn group' : 'pf-btn group disabled';
        },
        bookButtonClass() {
            return this.panelPricing.valid ? 'pf-btn book' : 'pf-btn book disabled';
        },
        appointmentEntrySource() {
            return this.groupIntentSource || 'appointment_panel';
        },
    },
    onLoad() {
        this.buildWeekDays();
        this.fetchRoomList({ force: true, initial: true });
    },

    onShow() {
        this.loadGroupCreateIntent();
        uni.removeTabBarBadge({ index: 2, fail: function() {} });
        const intent = uni.getStorageSync('offpeak_reserve_intent');
        if (intent) {
            uni.removeStorageSync('offpeak_reserve_intent');
            if (Date.now() - intent.createdAt < 5 * 60 * 1000) {
                const idx = this.weekDays.findIndex(day => this.formatDate(day.fullDate) === intent.date);
                if (idx >= 0) { this.selectedDayIndex = idx; this.currentSelectDate = intent.date; }
            }
        }
        // 优惠日当天给本 tab 挂角标（pages.json 里预约是第 3 个 tab）

        // 房间列表无需登录即可浏览
        if (this.weekDays && this.weekDays.length > 0) {
            this.fetchRoomList();
        }
        if (this.hasLogin && !this.userInfo) {
            this.getUserInfo();
        }
    },

    watch: {
        // constance 异步加载完成后补打日期标记和角标
        constance(value) {
            this.markPromoDays();

        },
    },

    methods: {
        ...mapActions(['loginAndRegister', 'getUserInfo']),

        loadGroupCreateIntent() {
            let intent = null;
            try {
                intent = uni.getStorageSync('group_create_intent');
            } catch (e) {}
            if (!intent || !intent.created_at || Date.now() - intent.created_at > 5 * 60 * 1000) {
                this.groupIntentVisible = false;
                this.groupIntentSource = '';
                try { uni.removeStorageSync('group_create_intent'); } catch (e) {}
                return;
            }
            this.groupIntentVisible = true;
            this.groupIntentSource = intent.source || 'group_square';
        },

        closeGroupIntent() {
            this.clearGroupCreateIntent();
        },

        clearGroupCreateIntent() {
            this.groupIntentVisible = false;
            this.groupIntentSource = '';
            try { uni.removeStorageSync('group_create_intent'); } catch (e) {}
        },

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
                    // 优惠日标记（constance 加载后由 markPromoDays 回填）
                    isPromo: false,
                    promoText: '',
                    fullDate: d,
                });
            }
            this.weekDays = days;
            this.selectedDayIndex = 0;
            this.currentSelectDate = this.formatDate(days[0].fullDate);
            this.markPromoDays();
        },

        // 按房间闲时规则 + 全局配置给日期栏打「特惠」标记
        markPromoDays() {
            this.weekDays.forEach(d => {
                const key = this.formatDate(d.fullDate);
                d.isPromo = this.roomList.some(room => OFFPEAK.dayPriceView(room, key).hasOffpeak);
                d.promoText = '特惠';
            });
        },

        selectDay(idx) {
            if (this.selectedDayIndex === idx) return;
            this.selectedDayIndex = idx;
            this.currentSelectDate = this.formatDate(this.weekDays[idx].fullDate);
            this.fetchRoomList({ force: true, initial: !this.roomList.length });
        },

        fetchRoomList(options) {
            options = options || {};
            const dayInfo = this.selectedDayInfo;
            if (!dayInfo || !dayInfo.fullDate) return;
            const day = dayInfo.fullDate;
            const dateKey = this.formatDate(day);
            const now = Date.now();
            if (this.roomLoading && this.roomLoadingKey === dateKey) return;
            if (!options.force && this.roomDataKey === dateKey && now - this.roomLastLoadedAt < 8 * 1000) {
                return;
            }
            this.roomLoading = true;
            this.roomLoadingKey = dateKey;
            const requestSeq = ++this.roomRequestSeq;
            const shouldShowSkeleton = options.initial || !this.roomList.length;
            if (shouldShowSkeleton) this.loading = true;
            AUTH.getRoomDataList(this.token, dateKey).then(res => {
                if (requestSeq !== this.roomRequestSeq) return;
                if (!res || !res.data) return;
                const data = res.data;
                if (!data.rooms) {
                    this.roomList = [];
                    return;
                }
                const today = new Date();
                const isToday = this.selectedDayInfo.isToday;
                const currentHour = isToday ? today.getHours() : -1;
                const bookedSlots = this.buildBookedSlotMap(data.appointments || []);

                data.rooms.forEach(item => {
                    item.appoints = [];
                    if (item.tags) {
                        item.tagsArr = item.tags.split('$').filter(t => t.trim());
                    } else {
                        item.tagsArr = [];
                    }
                    // 闲时段小时集合：卡片时段块高亮用
                    const offpeakHours = {};
                    (OFFPEAK.rulesForWeekday(item, dateKey) || []).forEach(function(r) {
                        for (let h = r.hour_start; h < r.hour_end; h++) offpeakHours[h] = 1;
                    });
                    for (let i = item.opening_hours_start; i < item.opening_hours_end; i++) {
                        const status = i <= currentHour ? 2 : (this.isBookedSlot(bookedSlots, item.object_id, i) ? 3 : 1);
                        const statusClass = status === 1 ? 'available' : status === 2 ? 'past' : 'booked';
                        item.appoints.push({ start: i, end: i + 1, status, statusClass, isOffpeak: !!offpeakHours[i] });
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
                    const view = OFFPEAK.dayPriceView(item, dateKey);
                    const deal = OFFPEAK.bestCoupleDeal(item, dateKey, {
                        unavailableHours: item.appoints.filter(slot => slot.status !== 1).map(slot => slot.start),
                    });
                    item.availabilityDate = dateKey;
                    item.offpeakDayText = view.hasOffpeak;
                    item.offpeakDayPriceText = view.priceText;
                    item.basePriceText = view.baseText;
                    item.offpeakDayCoupleText = deal ? deal.totalText : '';
                    item.offpeakDiscountText = view.discountText;
                    item.offpeakDayWindow = deal ? deal.windowText : '按所选时段计价';
                });
                this.roomList = data.rooms || [];
                this.roomDataKey = dateKey;
                this.roomLastLoadedAt = Date.now();
                // 房间规则到位：补打日期标记和角标
                this.markPromoDays();

            }).catch((err) => {
            }).then(() => {
                if (requestSeq === this.roomRequestSeq) {
                    this.roomLoading = false;
                    this.roomLoadingKey = '';
                    this.loading = false;
                }
            });
        },

        buildBookedSlotMap(appointments) {
            const map = {};
            (appointments || []).forEach(function(appt) {
                if (!appt || !appt.room || !appt.time_list) return;
                const roomId = String(appt.room);
                if (!map[roomId]) map[roomId] = {};
                (appt.time_list || []).forEach(function(interval) {
                    if (!interval || interval.length < 2) return;
                    const start = parseInt(interval[0], 10);
                    const end = parseInt(interval[1], 10);
                    if (!isFinite(start) || !isFinite(end) || start >= end) return;
                    for (let hour = start; hour < end; hour++) {
                        map[roomId][hour] = true;
                    }
                });
            });
            return map;
        },

        isBookedSlot(bookedSlots, roomId, hour) {
            const roomSlots = bookedSlots && bookedSlots[String(roomId)];
            return !!(roomSlots && roomSlots[hour]);
        },

        findAppoint(appointments, roomId, hour) {
            const bookedSlots = this.buildBookedSlotMap(appointments);
            return this.isBookedSlot(bookedSlots, roomId, hour);
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
            this.specSelected = [];
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

        getContinuousBookingTimes(times) {
            const sorted = (times || []).slice().sort((a, b) => {
                return String(a && a.item && a.item[0] || '').localeCompare(
                    String(b && b.item && b.item[0] || '')
                );
            });
            for (let i = 0; i < sorted.length; i += 1) {
                const item = sorted[i] && sorted[i].item;
                if (!item || item.length < 2 || !item[0] || !item[1]) {
                    uni.showToast({ title: '预约时段信息有误，请重新选择', icon: 'none' });
                    return null;
                }
                if (i > 0 && sorted[i - 1].item[1] !== item[0]) {
                    uni.showToast({ title: '预约时段需连续，分开到店请分别下单', icon: 'none' });
                    return null;
                }
            }
            return sorted;
        },

        handleDirectBook() {
            if (!this.hasLogin) {
                uni.showModal({ title: '提示', content: '请先登录再预约', success: (res) => {
                    if (res.confirm) this.loginAndRegister();
                }});
                return;
            }
            const selectedTimes = this.$refs.timesComponent && this.$refs.timesComponent.getSelection();
            const times = this.getContinuousBookingTimes(selectedTimes);
            if (!times || !times.length) {
                if (!selectedTimes || !selectedTimes.length) {
                    uni.showToast({ title: '请先选择预约时段', icon: 'none' });
                }
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
                uni.showModal({ title: '提示', content: '请先登录再发起组局', success: (res) => {
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
            AUTH.trackEvent({
                event: 'group_create_entry_click',
                page_path: 'pages/tabBar/appoint/appoint',
                source: this.appointmentEntrySource,
                room_id: room.object_id,
                date: this.currentSelectDate,
                begin_time: beginTime,
            }, this.token).catch(() => {});
            const groupQuote = OFFPEAK.priceAppointment(room, this.currentSelectDate,
                [[parseInt(beginTime.split(':')[0]), parseInt(endTime.split(':')[0])]]);
            const query = 'room_id=' + room.object_id
                + '&room_name=' + encodeURIComponent(room.name || '')
                + '&room_image=' + encodeURIComponent(room.image1 || '')
                + '&date=' + this.currentSelectDate
                + '&begin_time=' + beginTime
                + '&end_time=' + endTime
                + '&duration=' + duration
                + '&price_per_person=' + (room.price_per_person || 0)
                + '&price_per_hour=' + (room.price_per_hour || 0)
                + '&offpeak_room_fee=' + (groupQuote.isOffpeak ? groupQuote.roomFee : 0)
                + '&offpeak_label=' + encodeURIComponent(groupQuote.isOffpeak ? groupQuote.label : '')
                + '&offpeak_segments=' + encodeURIComponent(groupQuote.mixed ? OFFPEAK.describeSegments(groupQuote.segments) : '')
                + '&time_list=' + encodeURIComponent(JSON.stringify(timeList))
                + '&source=' + encodeURIComponent(this.appointmentEntrySource);
            this.clearGroupCreateIntent();
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
$primary: #C96B3F;
$gold: #D99028;
$green: #4E7754;
$red: #A65A4E;
$dark: #332D28;
$gray: #8B8178;
$light-gray: #E9E3DC;
$bg: #F7F5F1;
$card-bg: #FFFFFF;

page {
    background: $bg;
    min-height: 100vh;
}

.status-bar-placeholder {
    height: var(--status-bar-height, 44px);
    background: #FFFFFF;
}

.nav-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    height: 88rpx;
    background: #FFFFFF;
    border-bottom: 1rpx solid #ECE7E1;

    .nav-title {
        font-size: 34rpx;
        font-weight: bold;
        color: $dark;
        letter-spacing: 0;
    }
}

// 周日历
.week-strip {
    background: #fff;
    padding: 16rpx 0 20rpx;
    border-bottom: 1rpx solid #ECE7E1;
    box-shadow: 0 4rpx 14rpx rgba(62, 45, 32, 0.04);
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
        padding: 14rpx 18rpx;
        border-radius: 14rpx;
        transition: all 0.25s;
        position: relative;
        min-width: 88rpx;
        background: #FFF;
        border: 1rpx solid transparent;

        &.active {
            background: #F5E6DE;
            border-color: #DDA181;

            .day-week, .day-date {
                color: $primary;
            }

            .day-dot {
                background: $primary;
            }

            .day-promo {
                background: #FFDDC4;
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

        .day-promo {
            margin-top: 6rpx;
            font-size: 17rpx;
            font-weight: 700;
            line-height: 1.2;
            color: $offpeak-primary;
            background: $offpeak-bg-end;
            border-radius: 6rpx;
            padding: 1rpx 8rpx;
        }

        .day-dot {
            width: 8rpx;
            height: 8rpx;
            border-radius: 50%;
            background: $primary;
            position: absolute;
            top: 10rpx;
            right: 10rpx;
        }
    }
}

// 优惠日提示条
.promo-strip {
    display: flex;
    align-items: center;
    margin: 12rpx 24rpx 0;
    padding: 12rpx 18rpx;
    border-radius: 12rpx;
    background: linear-gradient(120deg, $offpeak-bg-start, $offpeak-bg-end);
}

.promo-strip-text {
    font-size: 22rpx;
    font-weight: 600;
    line-height: 1.4;
    color: $offpeak-title;
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
    background: #FBF8F4;
    border-radius: 16rpx 16rpx 0 0;

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
    border-radius: 16rpx;
    overflow: hidden;
    margin-bottom: 18rpx;
    display: block;
    box-shadow: 0 6rpx 18rpx rgba(62, 45, 32, 0.07);
    transition: transform 0.25s, box-shadow 0.25s;
    border: 1rpx solid #E9E3DC;
    position: relative;

    &::after {
        content: '';
        position: absolute;
        left: 0;
        top: 280rpx;
        bottom: 20rpx;
        width: 5rpx;
        border-radius: 0 6rpx 6rpx 0;
        background: $primary;
        z-index: 3;
    }

    &:active {
        transform: scale(0.98);
        box-shadow: 0 6rpx 20rpx rgba(160, 120, 80, 0.08);
    }

    .card-img-wrap {
        width: 100%;
        height: 280rpx;
        position: relative;
        overflow: hidden;
    }

    .card-img {
        width: 100%;
        height: 100%;
        border-radius: 16rpx 16rpx 0 0;
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

    .status-badge {
        position: absolute;
        top: 14rpx;
        left: 14rpx;
        padding: 6rpx 16rpx;
        border-radius: 10rpx;
        font-size: 22rpx;
        font-weight: bold;
        color: #fff;

        &.available {
            background: rgba($green, 0.94);
        }

        &.partial {
            background: rgba($gold, 0.94);
        }

        &.full {
            background: rgba($red, 0.94);
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
        display: flex;
        align-items: center;
        justify-content: space-between;

        .card-name {
            font-size: 32rpx;
            font-weight: bold;
            color: $dark;
            line-height: 1.3;
        }

        .seats-badge {
            font-size: 22rpx;
            color: #5C554E;
            background: #F2EFEA;
            padding: 4rpx 12rpx;
            border-radius: 8rpx;
            font-weight: 500;
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
            &.offpeak.available {
                background: $offpeak-bg-end;
                color: $offpeak-title;
                border: 1rpx solid $offpeak-border;
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
            color: #8D4A2F;
            background: #F7EAE3;
            padding: 5rpx 14rpx;
            border-radius: 8rpx;
            border: 1rpx solid #EBC9B7;
            font-weight: 500;
        }
    }

    .card-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 10rpx;
    }

    .offpeak-tag {
        display: flex;
        align-items: center;
        margin-top: 10rpx;
    }

    .offpeak-tag-deal {
        font-size: 20rpx;
        font-weight: 800;
        color: $offpeak-title;
        background: linear-gradient(120deg, $offpeak-bg-start, $offpeak-bg-end);
        border: 1rpx solid $offpeak-border;
        border-radius: 8rpx;
        padding: 5rpx 12rpx;
    }

    .offpeak-tag-window {
        margin-left: 12rpx;
        font-size: 19rpx;
        font-weight: 500;
        color: $offpeak-muted;
    }

    .card-price {
        display: flex;
        flex-direction: column;
        align-items: flex-start;

        .price-now {
            display: flex;
            align-items: baseline;
        }

        .price-yuan {
            font-size: 24rpx;
            color: $primary;
            font-weight: bold;
            margin-right: 2rpx;
        }

        .price-yuan.offpeak,
        .price-num.offpeak {
            color: $offpeak-primary;
        }

        .price-num.offpeak {
            font-size: 48rpx;
        }

        .price-strike {
            margin-left: 12rpx;
            font-size: 22rpx;
            color: $offpeak-strike;
            text-decoration: line-through;
        }

        .discount-badge {
            margin-left: 14rpx;
            font-size: 20rpx;
            font-weight: 800;
            color: #fff;
            background: $offpeak-badge-gradient;
            border-radius: 8rpx;
            padding: 4rpx 10rpx;
            align-self: center;
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
        border-radius: 12rpx;
        transition: all 0.2s;

        &.ready {
            background: $primary;
            color: #fff;
            box-shadow: 0 4rpx 12rpx rgba(201, 107, 63, 0.2);
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
        width: 76rpx;
        height: 76rpx;
        border-radius: 16rpx;
        background: #F2E6DE;
        color: $primary;
        font-size: 30rpx;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
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
        &.offpeak { background: $offpeak-bg-end; border: 1rpx solid $offpeak-border; }
    }
}

.group-intent-card {
    margin: 0 24rpx 20rpx;
    padding: 22rpx 24rpx;
    background: #FFFFFF;
    border: 1rpx solid #DDE7DE;
    border-left: 6rpx solid $green;
    border-radius: 14rpx;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18rpx;
    box-shadow: 0 4rpx 14rpx rgba(62,45,32,0.05);
}
.group-intent-copy {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
}
.group-intent-title {
    font-size: 28rpx;
    color: $dark;
    font-weight: bold;
}
.group-intent-sub {
    font-size: 23rpx;
    color: #7C6A58;
    line-height: 1.45;
}
.group-intent-close {
    flex-shrink: 0;
    color: $primary;
    font-size: 24rpx;
    font-weight: bold;
    background: #FFF3E8;
    border-radius: 10rpx;
    padding: 10rpx 18rpx;
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
        height: 82vh;
        max-height: calc(100vh - 80rpx);
        box-sizing: border-box;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }

    .panel-header {
        flex-shrink: 0;
        box-sizing: border-box;
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
                display: flex;
                align-items: baseline;
                flex-wrap: wrap;

                .panel-price-num {
                    font-size: 30rpx;
                    color: $offpeak-primary;
                    font-weight: 800;
                }
                .panel-price-unit {
                    font-size: 20rpx;
                    color: $gray;
                    font-weight: normal;
                    margin-left: 2rpx;
                }
                .panel-price-strike {
                    margin-left: 10rpx;
                    font-size: 20rpx;
                    color: $offpeak-strike;
                    font-weight: normal;
                    text-decoration: line-through;
                }
                .panel-price-badge {
                    margin-left: 10rpx;
                    font-size: 18rpx;
                    font-weight: 800;
                    color: #fff;
                    background: $offpeak-badge-gradient;
                    border-radius: 6rpx;
                    padding: 2rpx 8rpx;
                    align-self: center;
                }
                .panel-price-window {
                    margin-left: 12rpx;
                    font-size: 20rpx;
                    color: $offpeak-muted;
                    font-weight: normal;
                }
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
        height: 0;
        min-height: 0;
        width: 100%;
        box-sizing: border-box;
    }
    .panel-scroll-content { padding-top: 20rpx; padding-bottom: 20rpx; }

    .panel-footer {
        flex-shrink: 0;
        box-sizing: border-box;
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

            .pf-estimate {
                display: flex;
                align-items: baseline;
                font-size: 22rpx;
                color: $offpeak-text;
                margin-top: 4rpx;

                .pf-estimate-strike {
                    margin-left: 8rpx;
                    font-size: 20rpx;
                    color: $offpeak-strike;
                    text-decoration: line-through;
                }
                .pf-estimate-save {
                    margin-left: 10rpx;
                    font-size: 20rpx;
                    font-weight: 800;
                    color: $offpeak-primary;
                }
            }

            .pf-estimate-segments {
                display: block;
                font-size: 20rpx;
                color: $offpeak-muted;
                margin-top: 2rpx;
                line-height: 1.35;
            }

            .pf-social-tip {
                display: block;
                font-size: 21rpx;
                color: $green;
                margin-top: 4rpx;
                line-height: 1.35;
            }
        }

        .pf-btns {
            display: flex;
            align-items: center;
            gap: 16rpx;
        }

        .pf-btn {
            height: 76rpx;
            border-radius: 12rpx;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28rpx;
            font-weight: bold;
            color: #fff;
            padding: 0 32rpx;
            transition: background 0.2s;

            &.group {
                background: $green;
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

.card-footer { gap: 18rpx; }
.card-price { min-width: 0; flex: 1; }
.card-price .price-now { flex-wrap: wrap; row-gap: 10rpx; }
.card-price .price-strike { color: #88776B; }
.card-price .discount-badge { background: #F8E8DC; color: #9D4724; font-weight: 600; }
.card-info .offpeak-tag { flex-direction: column; align-items: flex-start; gap: 6rpx; margin-top: 14rpx; }
.card-info .offpeak-tag-deal { background: none; border: 0; padding: 0; font-size: 24rpx; font-weight: 600; color: #9D4724; }
.card-info .offpeak-tag-window { margin-left: 0; font-size: 22rpx; color: #7D7066; }
.book-btn { flex-shrink: 0; white-space: nowrap; }
.time-popup .panel-room-info, .time-popup .panel-meta { min-width: 0; }
.time-popup .panel-room-info { flex: 1; }
.time-popup .panel-meta .panel-name { font-size: 28rpx; }
.time-popup .panel-room-info .panel-meta .panel-price { font-size: 22rpx; color: #7D7066; font-weight: 400; }
.time-popup .panel-times { min-height: 0; }
.time-popup .panel-footer { flex-direction: column; align-items: stretch; gap: 20rpx; }
.time-popup .panel-footer .pf-info { position: relative; }
.time-popup .panel-footer .pf-info .pf-count { font-size: 32rpx; color: #BC4D25; }
.time-popup .panel-footer .pf-entry { font-size: 22rpx; color: #71645A; margin-top: 4rpx; }
.time-popup .panel-footer .pf-btns { display: flex; width: 100%; gap: 16rpx; }
.time-popup .panel-footer .pf-btn { flex: 1; min-width: 0; box-sizing: border-box; margin: 0; padding: 0 12rpx; text-align: center; }
.time-popup .panel-footer .pf-btn.group { background: #FFF7EF; color: #8D5E43; border: 1rpx solid #E7D4C4; }
.time-popup .panel-footer .pf-btn.book { background: #C9572D; color: #FFF; }
</style>
