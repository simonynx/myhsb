<template>
    <view class="page">
        <!-- 轮播图 -->
        <view class="hero-section" @tap="previewImages">
            <swiper
                class="hero-swiper"
                indicator-dots
                circular
                duration="400"
                interval="3000"
                autoplay
                @change="onSwiperChange"
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

            <button class="hero-share" open-type="share" hover-class="none" @tap.stop>
                <text class="yticon icon-fenxiang2"></text>
            </button>

            <view class="hero-info">
                <text class="hero-name">{{ room.name || '包厢详情' }}</text>
                <text class="hero-sub">{{ heroSummary }}</text>
            </view>

            <!-- 图片计数 -->
            <view class="img-counter">
                <text>{{ currentImgIndex + 1 }}/{{ imgList.length }}</text>
            </view>

            <!-- 底部渐变 -->
            <view class="hero-gradient"></view>
        </view>

        <!-- 核心价格与预约信息 -->
        <view class="price-card">
            <view class="price-head">
                <view class="price-main">
                    <text class="price-yuan">¥</text>
                    <text class="price-num">{{ pricePerHourText }}</text>
                    <text class="price-unit">/小时</text>
                </view>
                <view class="original-price" v-if="room.original_price_per_hour && room.original_price_per_hour > room.price_per_hour">
                    <text>¥{{ room.originalPriceText }}</text>
                </view>
            </view>

            <view class="pricing-explain">
                <text class="pricing-title">费用组成</text>
                <text class="pricing-copy">{{ pricingExplanation }}</text>
            </view>

            <view class="tags-row" v-if="room.tagsArr && room.tagsArr.length">
                <text class="tag" v-for="t in room.tagsArr" :key="t">{{ t }}</text>
            </view>

            <view class="quick-info-row">
                <view class="quick-info-item">
                    <text class="qi-value">{{ seatCountText }}</text>
                    <text class="qi-label">建议人数</text>
                </view>
                <view class="quick-info-item">
                    <text class="qi-value accent">{{ availableSlotCount }}</text>
                    <text class="qi-label">可约时段</text>
                </view>
                <view class="quick-info-item">
                    <text class="qi-value">{{ openHoursText }}</text>
                    <text class="qi-label">营业时间</text>
                </view>
            </view>
        </view>

        <!-- 时段状态 -->
        <view class="slots-card">
            <view class="card-title">
                <text>可选时段</text>
                <text class="slots-date">{{ currentSelectDate }}</text>
                <text class="slots-action" v-if="!isFullyBooked" @tap="goToAppoint">选择时段 ›</text>
            </view>
            <view class="slots-summary">
                <text>{{ slotsSummary }}</text>
            </view>

            <view class="slots-grid" v-if="displaySlots.length > 0">
                <view
                    v-for="(slot, si) in displaySlots"
                    :key="si"
                    class="slot-item"
                    :class="slot.statusClass"
                >
                    <text class="slot-time">{{ slot.displayTime }}</text>
                    <view class="slot-bar"></view>
                </view>
            </view>
            <view class="slots-empty" v-else>
                <text>该日期暂未开放预约时段</text>
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
            </view>
            <view class="facility-grid">
                <view class="facility-item" v-for="f in facilities" :key="f.name">
                    <text class="facility-icon">{{ f.icon }}</text>
                    <text class="facility-name">{{ f.name }}</text>
                </view>
            </view>
        </view>

        <!-- 房间介绍 -->
        <view class="desc-card" v-if="room.description">
            <view class="card-title">
                <text>房间介绍</text>
            </view>
            <view class="desc-text">
                <rich-text :nodes="desc"></rich-text>
            </view>
        </view>

        <!-- 增值服务仅作预告，具体选择放在确认预约页 -->
        <view class="addon-card" v-if="roomAddonPreview.length > 0">
            <view class="addon-head">
                <view>
                    <text class="addon-title">可选升级</text>
                    <text class="addon-sub">共 {{ roomAddons.length }} 项，下单时按需选择</text>
                </view>
                <text class="addon-stage">确认页加选</text>
            </view>
            <view class="addon-preview">
                <view class="addon-pill" v-for="a in roomAddonPreview" :key="a.object_id">
                    <text class="addon-name">{{ a.displayName }}</text>
                    <text class="addon-price">+¥{{ a.displayPrice }}</text>
                </view>
            </view>
        </view>

        <!-- 门店信息 -->
        <view class="store-card">
            <view class="store-header">
                <text class="store-title">门店信息</text>
            </view>
            <view class="store-row">
                <text class="store-label">店铺</text>
                <text class="store-value">{{ storeName }}</text>
            </view>
            <view class="store-row" v-if="storeAddress">
                <text class="store-label">地址</text>
                <text class="store-value addr">{{ storeAddress }}</text>
            </view>
            <view class="store-row" v-if="wifiInfo">
                <text class="store-label">WiFi</text>
                <text class="store-value">{{ wifiInfo }}</text>
            </view>
            <view class="store-actions" v-if="canOpenMap || canCallStore">
                <view class="action-btn nav-btn" v-if="canOpenMap" @tap="openMap">
                    <text class="yticon icon-ditu"></text>
                    <text>导航</text>
                </view>
                <view class="action-btn call-btn" v-if="canCallStore" @tap="callPhone">
                    <text class="yticon icon-dianhua"></text>
                    <text>拨打电话</text>
                </view>
            </view>
        </view>

        <!-- 预约说明 -->
        <view class="notice-card">
            <view class="notice-item">
                <text class="notice-mark">到店</text>
                <view class="notice-content">
                    <text class="notice-title">预约说明</text>
                    <text class="notice-body">请在预约时段开始前到达门店，现场凭预约手机号核销使用</text>
                </view>
            </view>
            <view class="notice-item">
                <text class="notice-mark">退款</text>
                <view class="notice-content">
                    <text class="notice-title">取消政策</text>
                    <text class="notice-body">距预约开始超过1小时可申请退款；不足1小时请联系店员协助处理</text>
                </view>
            </view>
            <view class="notice-item">
                <text class="notice-mark">使用</text>
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
                <text class="pi-label">包厢费</text>
                <view class="pi-price-line">
                    <text class="pi-price">¥{{ pricePerHourText }}</text>
                    <text class="pi-unit">/小时</text>
                </view>
                <text class="pi-sub">{{ personFeeHint }}</text>
            </view>
            <view
                class="book-btn"
                :class="isFullyBooked ? 'disabled' : ''"
                @tap="goToAppoint"
            >
                <text>{{ bottomButtonText }}</text>
            </view>
        </view>

        <!-- 时间选择弹窗 -->
        <view class="time-popup" :class="specClass" @touchmove.stop.prevent @tap="closePopup">
            <view class="mask"></view>
            <view class="panel" @tap.stop>
                <view class="panel-header">
                    <view class="panel-room-info">
                        <image class="panel-thumb" :src="room.image1" mode="aspectFill" />
                        <view class="panel-meta">
                            <text class="panel-name">{{ room.name }}</text>
                            <text class="panel-price">¥{{ pricePerHourText }}/小时 · {{ currentSelectDate }}</text>
                        </view>
                    </view>
                    <text class="panel-close yticon icon-guanbi" @tap="closePopup"></text>
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
                        :showSubmitButton="false"
                    ></times>
                </view>

                <!-- 底部操作栏 -->
                <view class="panel-footer">
                    <view class="pf-info">
                        <text class="pf-label">已选时段</text>
                        <text class="pf-count" v-if="specSelected.length">{{ selectedSummaryText }}</text>
                        <text class="pf-count zero" v-else>请选择预约时段</text>
                    </view>
                    <view class="pf-btns">
                        <view class="pf-btn group" :class="specSelected.length ? '' : 'disabled'" @tap="specSelected.length && handleCreateGroup()">
                            <text>发起组局</text>
                        </view>
                        <view class="pf-btn book" :class="specSelected.length ? '' : 'disabled'" @tap="specSelected.length && handleDirectBook()">
                            <text>直接预约</text>
                        </view>
                    </view>
                </view>
            </view>
        </view>
    </view>
</template>

<script>
import { mapActions, mapState } from 'vuex';
import AUTH from '../../utils/auth.js';
import times from '@/components/pretty-times/pretty-times.vue';

export default {
    components: { times },

    data() {
        return {
            roomAddons: [],
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
            currentImgIndex: 0,
            storeName: '摸鱼划水吧',
            storeAddress: '',
            wifiInfo: '',
            storePhone: '',
            storeLatitude: null,
            storeLongitude: null,
            facilities: [],
        };
    },

    computed: {
        ...mapState(['hasLogin', 'token', 'constance']),
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
        pricePerHourText() {
            return this.formatMoney(this.room.price_per_hour || 0);
        },
        personPriceText() {
            return this.formatMoney(this.room.price_per_person || 0);
        },
        personFeeHint() {
            if (!this.room.price_per_person) return '人数费用确认页显示';
            return '另加 ¥' + this.personPriceText + '/人入场费';
        },
        pricingExplanation() {
            if (!this.room.price_per_person) {
                return '包厢费按所选时长计算，人数费用及优惠以确认页为准';
            }
            return '包厢费按时长计算 + 入场费 ¥' + this.personPriceText + '/人，优惠在确认页计算';
        },
        seatCountText() {
            return this.room.seats_count ? this.room.seats_count + '人' : '--';
        },
        openHoursText() {
            if (this.room.opening_hours_start === undefined || this.room.opening_hours_end === undefined) return '--';
            return this.formatDisplayHour(this.room.opening_hours_start) + '-' + this.formatDisplayHour(this.room.opening_hours_end);
        },
        availableSlotCount() {
            return this.displaySlots.filter(function(slot) { return slot.status === 1; }).length;
        },
        bookedSlotCount() {
            return this.displaySlots.filter(function(slot) { return slot.status === 3; }).length;
        },
        roomAddonPreview() {
            return this.roomAddons.slice(0, 3);
        },
        canCallStore() {
            return !!String(this.storePhone || '').replace(/[^\d+]/g, '');
        },
        canOpenMap() {
            return isFinite(this.storeLatitude) && isFinite(this.storeLongitude)
                && this.storeLatitude !== null && this.storeLongitude !== null;
        },
        heroSummary() {
            const parts = [];
            if (this.room.seats_count) parts.push('适合' + this.room.seats_count + '人');
            if (this.openHoursText !== '--') parts.push(this.openHoursText + '营业');
            if (this.availableSlotCount > 0) parts.push('余' + this.availableSlotCount + '段可约');
            return parts.length ? parts.join(' · ') : '桌游、聚会、休闲包厢';
        },
        slotsSummary() {
            if (this.displaySlots.length === 0) return '暂未开放预约时段';
            if (this.availableSlotCount > 0) return '还有 ' + this.availableSlotCount + ' 个时段可预约';
            if (this.bookedSlotCount > 0) return '所选日期的可用时段已被约满';
            return '所选日期暂无可预约时段';
        },
        bottomButtonText() {
            if (this.isFullyBooked) return '当天已约满';
            if (this.availableSlotCount > 0) return '选择时段预约';
            return '查看可选时段';
        },
        selectedSummaryText() {
            if (!this.specSelected.length) return '请选择预约时段';
            const first = this.specSelected[0];
            const last = this.specSelected[this.specSelected.length - 1];
            const begin = first[0].split(' ')[1].substring(0, 5);
            const end = last[1].split(' ')[1].substring(0, 5);
            return begin + '-' + end + ' · ' + this.specSelected.length + '小时';
        },
    },

    onLoad(option) {
        const today = new Date();
        const todayStr = today.getFullYear() + '-' + (today.getMonth() + 1).toString().padStart(2, '0') + '-' + today.getDate().toString().padStart(2, '0');
        this.roomDate = option.date || todayStr;
        this.currentSelectDate = option.date || todayStr;
        // 优先从 Vuex 取 room 数据（appoint.vue 已经存了整个 room 对象）
        const roomData = this.$store.state.currentRoom;
        if (roomData && roomData.object_id) {
            this.rebuildRoom(roomData);
            this.loadRoomAddons(roomData.object_id);
        } else if (option.id) {
            // 若从拼团详情等页面直接跳转，通过 ID 拉取房间数据
            this._loadRoomById(option.id);
        }
    },

    onShareAppMessage() {
        return this.buildSharePayload();
    },

    onShareTimeline() {
        const payload = this.buildSharePayload();
        return {
            title: payload.title,
            query: payload.path.split('?')[1] || '',
            imageUrl: payload.imageUrl,
        };
    },

    methods: {
        ...mapActions(['loginAndRegister', 'getConstanceInfo']),

        buildSharePayload() {
            const roomId = this.room && this.room.object_id ? this.room.object_id : '';
            const date = this.currentSelectDate || this.roomDate || '';
            let path = '/pages/product/product';
            const query = [];
            if (roomId) query.push('id=' + encodeURIComponent(roomId));
            if (date) query.push('date=' + encodeURIComponent(date));
            if (query.length) path += '?' + query.join('&');
            return {
                title: this.storeName + ' · ' + ((this.room && this.room.name) || '包厢详情'),
                path: path,
                imageUrl: (this.room && this.room.image1) || '/static/logo_small.jpg',
            };
        },
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
            // 若 tags 是字符串但未转 tagsArr，则自动转换（兼容直接从接口加载的数据）
            if (r.tags && typeof r.tags === 'string' && !r.tagsArr) {
                r.tagsArr = r.tags.split('$').map(t => t.trim()).filter(Boolean);
            }
            r.originalPriceText = this.formatMoney(r.original_price_per_hour || 0);
            this.room = r;
            this.currentImgIndex = 0;
            this.buildImages();
            this.buildDesc();
            this.buildFacilities();
            this.buildStoreInfo();
            this.initTimeConfig();
            
            // 从 room.appoints 重建 disableTimeSlot（status 3 = 已预约）
            if (this.room.appoints && this.room.appoints.length) {
                this.disableTimeSlot = [];
                for (let i = 0; i < this.room.appoints.length; i++) {
                    if (this.room.appoints[i].status === 3) {
                        this.disableTimeSlot.push([
                            this.currentSelectDate + ' ' + this._padHour(this.room.appoints[i].start) + ':00:00',
                            this.currentSelectDate + ' ' + this._padHour(this.room.appoints[i].end) + ':00:00'
                        ]);
                    }
                }
            }
        },

        buildImages() {
            const r = this.room;
            this.imgList = [];
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
            this.facilities = [];
            this.facilities = tags
                .filter(t => tagMap[t.toLowerCase()])
                .map(t => tagMap[t.toLowerCase()]);
        },

        buildStoreInfo() {
            if (this.constance) this.applyStoreConfig(this.constance);
            this.getConstanceInfo().then(res => {
                if (res && res._status === 0 && res.data) this.applyStoreConfig(res.data);
            }).catch(() => {});
        },

        applyStoreConfig(cfg) {
            if (!cfg) return;
            const address = String(cfg.store_address || '') + String(cfg.store_area || '');
            const latitude = parseFloat(cfg.store_latitude);
            const longitude = parseFloat(cfg.store_longitude);
            if (cfg.store_name) this.storeName = String(cfg.store_name);
            if (address) this.storeAddress = address;
            if (cfg.wifi_name) {
                this.wifiInfo = String(cfg.wifi_name) + (cfg.wifi_password ? ' / ' + cfg.wifi_password : '');
                if (!this.facilities.find(item => item.name === 'WiFi')) {
                    this.facilities = [{ icon: '📶', name: 'WiFi' }].concat(this.facilities);
                }
            }
            if (cfg.phone_number) this.storePhone = String(cfg.phone_number);
            this.storeLatitude = isFinite(latitude) ? latitude : null;
            this.storeLongitude = isFinite(longitude) ? longitude : null;
        },

        initTimeConfig() {
            this.currentBeginTime = this.formatTimeValue(this.room.opening_hours_start || 0);
            this.currentEndTime = this.formatTimeValue(this.room.opening_hours_end || 24);
            this.disableTimeSlot = [];
            if (this.room.appoints) {
                for (const slot of this.room.appoints) {
                    slot.statusClass = this._getSlotClass(slot.status);
                    slot.displayTime = this.formatDisplayHour(slot.start);
                    if (slot.status === 3) {
                        this.disableTimeSlot.push([
                            this.currentSelectDate + ' ' + this._padHour(slot.start) + ':00:00',
                            this.currentSelectDate + ' ' + this._padHour(slot.end) + ':00:00',
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

        onSwiperChange(e) {
            const current = e && e.detail ? e.detail.current : 0;
            this.currentImgIndex = current || 0;
        },

        previewImages() {
            if (!this.imgList.length) return;
            uni.previewImage({
                urls: this.imgList.map(i => i.src),
                current: this.currentImgIndex,
            });
        },

        // 通过 ID 加载房间数据（用于拼团详情等直接跳转场景）
        _loadRoomById(roomId) {
            uni.showLoading({ title: '加载中...' });
            AUTH.getRoomDetail(this.token, roomId).then(res => {
                uni.hideLoading();
                if (res && res._status === 0 && res.data) {
                    // 后端返回的 tags 是 $ 分隔字符串，转为 tagsArr 供模板使用
                    const room = res.data;
                    if (room.tags && typeof room.tags === 'string') {
                        room.tagsArr = room.tags.split('$').map(t => t.trim()).filter(Boolean);
                    }
                    if (!room.appoints || !room.appoints.length) {
                        room.appoints = this.buildSlotsFromAppointments(room, res.data.appointments || []);
                    }
                    this.rebuildRoom(room);
                    this.loadRoomAddons(room.object_id);
                } else {
                    const reason = (res && res._reason) || '加载失败';
                    // 404 或接口不存在时引导用户返回
                    if (String(res && res._status) === '404' || reason.indexOf('Not Found') !== -1) {
                        uni.showModal({
                            title: '房间信息暂不可用',
                            content: '该房间详情无法直接加载，建议从房间列表重新进入。',
                            showCancel: false,
                            confirmText: '知道了',
                        });
                    } else {
                        uni.showToast({ title: reason, icon: 'none' });
                    }
                }
            }).catch((err) => {
                uni.hideLoading();
                const status = err && err.statusCode;
                if (status === 404) {
                    uni.showModal({
                        title: '房间信息暂不可用',
                        content: '该房间详情无法直接加载，建议从房间列表重新进入。',
                        showCancel: false,
                        confirmText: '知道了',
                    });
                } else {
                    uni.showToast({ title: '加载失败', icon: 'none' });
                }
            });
        },

        // 时间补零辅助：确保小时是两位数，如 9 -> "09"
        _padHour(h) {
            const hour = parseInt(h, 10);
            return hour < 10 ? '0' + hour : String(hour);
        },

        buildSlotsFromAppointments(room, appointments) {
            const slots = [];
            const start = parseInt(room.opening_hours_start || 0, 10);
            const end = parseInt(room.opening_hours_end || 24, 10);
            const today = new Date();
            const isToday = this.currentSelectDate === this.formatDate(today);
            const currentHour = isToday ? today.getHours() : -1;
            for (let h = start; h < end; h++) {
                const booked = this._findAppoint(appointments || [], room.object_id, h);
                const status = h <= currentHour ? 2 : (booked ? 3 : 1);
                slots.push({
                    start: h,
                    end: h + 1,
                    status: status,
                    statusClass: this._getSlotClass(status),
                    displayTime: this.formatDisplayHour(h),
                });
            }
            return slots;
        },

        formatDate(date) {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return y + '-' + m + '-' + d;
        },

        formatDisplayHour(h) {
            return this._padHour(h || 0) + ':00';
        },

        formatTimeValue(h) {
            return this._padHour(h || 0) + ':00:00';
        },

        formatMoney(fen) {
            const amount = (fen || 0) / 100;
            return amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2);
        },

        // 获取指定日期的 appointments 并更新 disableTimeSlot
        _fetchDisableTimeSlot(date) {
            if (!date || !this.room.object_id) return;
            AUTH.getRoomAppointments(this.token, this.room.object_id, date).then(res => {
                if (!res || !res.data || !res.data.time_list) return;
                for (const propStr in res.data.time_list) {
                    if (!res.data.time_list[propStr]) {
                        const prop = JSON.parse(propStr);
                        this.disableTimeSlot.push([
                            date + ' ' + this._padHour(prop[0]) + ':00:00',
                            date + ' ' + this._padHour(prop[1]) + ':00:00',
                        ]);
                    }
                }
            });
        },

        async loadRoomAddons(roomId) {
            if (!roomId) return;
            try {
                const res = await AUTH.getRoomAddons(this.token, roomId);
                if (res && res._status === 0) {
                    this.roomAddons = (res.data || []).map(item => Object.assign({}, item, {
                        displayName: this.formatAddonName(item.name),
                        displayPrice: this.formatAddonPrice(item.price),
                    }));
                }
            } catch (e) {
                this.roomAddons = [];
            }
        },

        formatAddonName(name) {
            return String(name || '').replace(/^[^\u4e00-\u9fa5A-Za-z0-9]+/g, '').trim();
        },

        formatAddonPrice(price) {
            return this.formatMoney(price || 0);
        },

        goToAppoint() {
            if (this.isFullyBooked) return;
            if (!this.hasLogin) {
                uni.showModal({ title: '提示', content: '请先登录再预约', success: (res) => {
                    if (res.confirm) this.loginAndRegister();
                }});
                return;
            }
            if (this.specClass === 'show') {
                this.specClass = 'hide';
                setTimeout(() => { this.specClass = 'none'; }, 250);
            } else {
                // 打开弹窗时，先清空之前选中的时段，再拉取当天的 appointments
                this.$refs.timesComponent && this.$refs.timesComponent.reset();
                this.disableTimeSlot = [];
                this._fetchDisableTimeSlot(this.currentSelectDate);
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
            // times: [{ date: '2026-04-16', item: ['2026-04-16 11:00:00', '2026-04-16 12:00:00'] }, ...]
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
            this.room.selects = this.specSelected;
            this.$store.commit('setCurrentSelectItem', this.room);
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
            const room = this.room;
            const duration = Math.max(1, parseInt(endTime.split(':')[0]) - parseInt(beginTime.split(':')[0]));
            const timeList = times.map(t => t.item[0].split(' ')[1].substring(0, 5) + '~' + t.item[1].split(' ')[1].substring(0, 5));
            AUTH.trackEvent({
                event: 'group_create_entry_click',
                page_path: 'pages/product/product',
                source: 'product_panel',
                room_id: room.object_id,
                date: this.currentSelectDate,
                begin_time: beginTime,
            }, this.token).catch(() => {});
            const query = 'room_id=' + room.object_id
                + '&room_name=' + encodeURIComponent(room.name || '')
                + '&room_image=' + encodeURIComponent(room.image1 || '')
                + '&date=' + this.currentSelectDate
                + '&begin_time=' + beginTime
                + '&end_time=' + endTime
                + '&duration=' + duration
                + '&price_per_person=' + (room.price_per_person || 0)
                + '&price_per_hour=' + (room.price_per_hour || 0)
                + '&time_list=' + encodeURIComponent(JSON.stringify(timeList))
                + '&source=product_panel';
            uni.navigateTo({ url: '/pages/group/create?' + query });
        },

        handleTimesSelectDateChange(date) {
            // 切换日期时，先同步 currentSelectDate，再清空旧数据，拉取新日期的 appointments
            this.currentSelectDate = date;
            this.disableTimeSlot = [];
            this._fetchDisableTimeSlot(date);
        },

        callPhone() {
            const phone = String(this.storePhone || '').replace(/[^\d+]/g, '');
            if (!phone) {
                uni.showToast({ title: '门店电话暂未配置', icon: 'none' });
                return;
            }
            uni.makePhoneCall({ phoneNumber: phone });
        },

        openMap() {
            if (!this.canOpenMap) {
                uni.showToast({ title: '门店位置暂未配置', icon: 'none' });
                return;
            }
            uni.openLocation({
                latitude: this.storeLatitude,
                longitude: this.storeLongitude,
                name: this.storeName,
                address: this.storeAddress,
            });
        },
    },
};
</script>

<style lang="scss">
$primary: #D96337;
$gold: #D99028;
$green: #4F7652;
$red: #B5534F;
$dark: #302E2B;
$gray: #817B73;
$light-gray: #ECE9E4;
$bg: #F7F6F2;
$card-bg: #FFFFFF;

page { background: $bg; padding-bottom: 120rpx; }

// 轮播图
.hero-section {
    position: relative;
    height: 500rpx;
    overflow: hidden;

    .hero-swiper { height: 100%; }
    .hero-img { width: 100%; height: 100%; }

    .hero-badge {
        position: absolute;
        top: 24rpx; left: 24rpx;
        z-index: 3;
        padding: 8rpx 16rpx;
        border-radius: 10rpx;
        font-size: 24rpx;
        font-weight: bold;
        color: #fff;
        &.available { background: rgba($green, 0.9); }
        &.partial { background: rgba($gold, 0.9); }
        &.full { background: rgba($red, 0.9); }
    }

    .hero-share {
        position: absolute;
        top: 18rpx;
        right: 20rpx;
        z-index: 4;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 68rpx;
        height: 68rpx;
        padding: 0;
        margin: 0;
        border: none;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.92);
        color: $dark;
        font-size: 34rpx;
        line-height: 1;
        &::after { border: none; }
    }

    .hero-info {
        position: absolute;
        left: 28rpx;
        right: 120rpx;
        bottom: 34rpx;
        z-index: 2;
        display: flex;
        flex-direction: column;
    }

    .hero-name {
        font-size: 42rpx;
        color: #FFF;
        font-weight: bold;
        line-height: 1.25;
        text-shadow: 0 4rpx 14rpx rgba(0,0,0,0.32);
    }

    .hero-sub {
        margin-top: 10rpx;
        font-size: 24rpx;
        color: rgba(255,255,255,0.9);
        line-height: 1.4;
        text-shadow: 0 2rpx 10rpx rgba(0,0,0,0.28);
    }

    .img-counter {
        position: absolute;
        z-index: 3;
        bottom: 24rpx; right: 24rpx;
        background: rgba(0,0,0,0.38);
        color: #fff;
        font-size: 24rpx;
        padding: 6rpx 16rpx;
        border-radius: 20rpx;
    }

    .hero-gradient {
        position: absolute;
        z-index: 1;
        bottom: 0; left: 0; right: 0;
        height: 220rpx;
        background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.54));
    }
}

// 价格卡片
.price-card {
    background: #fff;
    margin: -18rpx 20rpx 18rpx;
    border: 1rpx solid #E5E0D9;
    border-radius: 14rpx;
    padding: 28rpx;
    box-shadow: 0 4rpx 16rpx rgba(63, 50, 38, 0.06);
    position: relative;
    z-index: 1;

    .price-head {
        display: flex;
        align-items: baseline;
        gap: 14rpx;
    }

    .price-main {
        display: flex;
        align-items: baseline;
        .price-yuan { font-size: 28rpx; color: $primary; font-weight: bold; }
        .price-num { font-size: 52rpx; font-weight: bold; color: $primary; line-height: 1; }
        .price-unit { font-size: 26rpx; color: $gray; margin-left: 4rpx; }
    }

    .original-price {
        margin-left: 16rpx;
        font-size: 28rpx;
        color: $gray;
        text-decoration: line-through;
    }

    .pricing-explain {
        display: flex;
        align-items: flex-start;
        gap: 16rpx;
        margin-top: 20rpx;
        padding: 16rpx 18rpx;
        border-left: 5rpx solid #D7A264;
        background: #FAF7F2;
    }

    .pricing-title {
        flex-shrink: 0;
        font-size: 22rpx;
        font-weight: 700;
        color: #6C5141;
    }

    .pricing-copy {
        font-size: 22rpx;
        line-height: 1.55;
        color: #6D6760;
    }

    .tags-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8rpx;
        margin-top: 18rpx;
    }

    .tag {
        font-size: 22rpx;
        color: $primary;
        background: #FFF0EB;
        padding: 4rpx 14rpx;
        border-radius: 8rpx;
    }

    .quick-info-row {
        display: flex;
        margin-top: 24rpx;
        padding-top: 22rpx;
        border-top: 1rpx solid #F2E8DF;
    }

    .quick-info-item {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        border-right: 1rpx solid #F2E8DF;
        &:last-child { border-right: none; }
    }

    .qi-value {
        max-width: 180rpx;
        font-size: 27rpx;
        color: $dark;
        font-weight: bold;
        line-height: 1.25;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .qi-value.accent { color: $green; }

    .qi-label {
        font-size: 21rpx;
        color: $gray;
        margin-top: 8rpx;
    }
}

// 时段卡片
.slots-card {
    background: #fff;
    margin: 0 0 16rpx;
    padding: 28rpx;

    .card-title {
        font-size: 30rpx;
        font-weight: bold;
        color: $dark;
        margin-bottom: 20rpx;
        display: flex;
        align-items: center;
        gap: 14rpx;

        .slots-date {
            font-size: 24rpx;
            color: $gray;
            font-weight: normal;
        }

        .slots-action {
            margin-left: auto;
            font-size: 24rpx;
            font-weight: 700;
            color: $primary;
        }
    }

    .slots-summary {
        margin-bottom: 18rpx;
        padding: 14rpx 18rpx;
        border-radius: 8rpx;
        background: #FFF7F2;
        color: $primary;
        font-size: 24rpx;
        line-height: 1.5;
    }

    .slots-grid {
        display: flex;
        flex-wrap: wrap;
        margin-bottom: 16rpx;
        row-gap: 12rpx;
    }

    .slot-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 108rpx;
        padding: 2rpx;
        box-sizing: border-box;

        .slot-time { font-size: 20rpx; color: $gray; margin-bottom: 6rpx; text-align: center; line-height: 1.2; }
        .slot-bar { width: 42rpx; height: 8rpx; border-radius: 4rpx; }

        &.available .slot-bar { background: $green; }
        &.booked .slot-bar { background: $red; }
        &.past .slot-bar { background: #DDD; }
    }

    .slots-empty {
        padding: 38rpx 20rpx;
        text-align: center;
        color: $gray;
        font-size: 24rpx;
        background: #FAFAFA;
        border-radius: 16rpx;
        margin-bottom: 18rpx;
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
    margin: 0 0 16rpx;
    padding: 28rpx;

    .card-title {
        font-size: 30rpx;
        font-weight: bold;
        color: $dark;
        margin-bottom: 20rpx;
        display: flex;
        align-items: center;
        gap: 12rpx;
    }

    .facility-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 12rpx;

        .facility-item {
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 8rpx;
            width: calc(33.333% - 8rpx);
            min-width: 0;
            padding: 14rpx;
            box-sizing: border-box;
            background: #F7F6F2;
            border-radius: 8rpx;

            .facility-icon { font-size: 32rpx; }
            .facility-name { font-size: 22rpx; color: $dark; }
        }
    }
}

// 门店卡片
.store-card {
    background: #fff;
    margin: 0 0 16rpx;
    padding: 28rpx;

    .store-header {
        display: flex;
        align-items: center;
        margin-bottom: 20rpx;

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
            border-radius: 10rpx;
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
    margin: 0 0 16rpx;
    padding: 28rpx;

    .card-title {
        font-size: 30rpx;
        font-weight: bold;
        color: $dark;
        margin-bottom: 20rpx;
        display: flex;
        align-items: center;
        gap: 12rpx;
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
    margin: 0 0 16rpx;
    padding: 16rpx 28rpx;

    .notice-item {
        display: flex;
        gap: 16rpx;
        padding: 16rpx 0;
        border-bottom: 1rpx solid $light-gray;

        &:last-child { border-bottom: none; }

        .notice-mark {
            flex-shrink: 0;
            min-width: 56rpx;
            padding: 6rpx 8rpx;
            margin-top: 2rpx;
            border-radius: 7rpx;
            background: #F3EEE8;
            color: #6C5141;
            font-size: 20rpx;
            font-weight: 700;
            text-align: center;
        }

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

// 增值服务卡片
.addon-card {
    margin: 0 0 16rpx;
    padding: 28rpx;
    background: #FFF;

    .addon-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .addon-title {
        display: block;
        font-size: 30rpx;
        font-weight: 700;
        color: $dark;
    }

    .addon-sub {
        display: block;
        margin-top: 5rpx;
        font-size: 22rpx;
        color: $gray;
    }

    .addon-stage {
        flex-shrink: 0;
        padding: 7rpx 10rpx;
        border-radius: 7rpx;
        background: #EEF3EC;
        color: $green;
        font-size: 20rpx;
    }

    .addon-preview {
        display: flex;
        flex-wrap: wrap;
        gap: 10rpx;
        margin-top: 18rpx;
    }

    .addon-pill {
        display: flex;
        align-items: center;
        gap: 8rpx;
        padding: 10rpx 13rpx;
        border: 1rpx solid #DDD9D2;
        border-radius: 8rpx;
        background: #FAF9F7;

        .addon-name { font-size: 22rpx; color: #56514B; }
        .addon-price { font-size: 21rpx; font-weight: 700; color: $primary; }
    }
}

// 底部占位
.bottom-placeholder { height: 168rpx; }


// 底部操作栏
.bottom-bar {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    min-height: 112rpx;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16rpx 30rpx calc(16rpx + env(safe-area-inset-bottom));
    box-shadow: 0 -2rpx 12rpx rgba(0,0,0,0.06);
    z-index: 95;

    .price-info {
        display: flex;
        flex-direction: column;
        min-width: 0;
        padding-right: 18rpx;

        .pi-label { font-size: 22rpx; color: $gray; }
        .pi-price-line { display: flex; align-items: baseline; }
        .pi-price { font-size: 40rpx; font-weight: bold; color: $primary; line-height: 1.1; }
        .pi-unit { margin-left: 3rpx; font-size: 21rpx; color: $gray; }
        .pi-sub {
            margin-top: 2rpx;
            font-size: 20rpx;
            color: #8E857D;
            white-space: nowrap;
        }
    }

    .book-btn {
        width: 320rpx;
        flex-shrink: 0;
        height: 80rpx;
        background: $primary;
        color: #fff;
        border-radius: 12rpx;
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
    z-index: 10001;

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
        border-radius: 16rpx 16rpx 0 0;
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

    .panel-times { flex: 1; overflow-y: auto; padding: 20rpx 0 0; min-height: 0; }

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
            border-radius: 10rpx;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28rpx;
            font-weight: bold;
            color: #fff;
            padding: 0 32rpx;
            transition: background 0.2s;

            &.group {
                border: 1rpx solid #D7A264;
                background: #FFF;
                color: #8A5A3C;
                &.disabled {
                    border-color: #DDD;
                    background: #F4F4F4;
                    color: #AAA;
                }
            }

            &.book {
                background: $primary;
                min-width: 190rpx;
                &.disabled {
                    background: #CCC;
                }
            }
        }
    }
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
@keyframes slideDown { from { transform: translateY(0); } to { transform: translateY(100%); } }
</style>
