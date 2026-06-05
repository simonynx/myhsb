<template>
    <view class="container">
        <!-- 顶部导航 -->
        <view class="header">
            <text class="deco-sun">☀️</text>
            <text class="deco-cloud c1">☁️</text>
            <text class="deco-cloud c2">☁️</text>
            <text class="deco-cloud c3">☁️</text>
            <text class="deco-bird b1">🐦</text>
            <text class="deco-bird b2">🐦</text>
            <text class="header-title">🎮 找人一起玩</text>
            <text class="header-sub">缺人开局、约朋友拼一桌</text>
            <view class="grass-hill">
                <text class="blade">🌿</text>
                <text class="blade">🌱</text>
                <text class="blade">🌿</text>
                <text class="blade">🌱</text>
                <text class="blade">🍀</text>
            </view>
        </view>

        <!-- 日期筛选 -->
        <view class="date-bar">
            <scroll-view class="date-scroll" scroll-x>
                <view class="date-inner">
                    <view
                        v-for="(item, index) in weekDays"
                        :key="index"
                        class="date-pill"
                        :class="item.className"
                        @click="selectDay(index)"
                    >
                        <text class="pill-week">{{ item.week }}</text>
                        <text class="pill-date" v-if="item.date">{{ item.dayText }}</text>
                        <text class="pill-all-text" v-else>{{ item.dayText }}</text>
                    </view>
                </view>
            </scroll-view>
        </view>

        <!-- 社交空间总览 -->
        <view class="social-summary" v-if="!loading">
            <view class="summary-main">
                <text class="summary-kicker">店里正在组局</text>
                <text class="summary-title">{{ groupSummaryText }}</text>
                <text class="summary-sub">{{ groupSummarySub }}</text>
            </view>
            <view class="summary-pill">
                <text class="summary-pill-num">{{ summaryPillValue }}</text>
                <text class="summary-pill-text">{{ summaryPillLabel }}</text>
            </view>
        </view>

        <view class="payment-alert" v-if="myPendingGroups.length > 0" @click="goPendingPayment">
            <view class="payment-alert-main">
                <text class="payment-alert-title">有组局待你付款</text>
                <text class="payment-alert-sub">{{ pendingPaymentText }}</text>
            </view>
            <text class="payment-alert-action">去付款 →</text>
        </view>

        <!-- 快捷筛选 -->
        <view class="quick-filter" v-if="!loading && rawGroupList.length > 0">
            <view
                v-for="filter in quickFilters"
                :key="filter.key"
                :class="filter.className"
                @click="selectQuickFilter(filter.key)"
            >
                <text>{{ filter.label }}</text>
            </view>
        </view>

        <!-- 组局列表 -->
        <view class="group-list">
            <view
                class="group-card"
                :class="group.cardClass"
                v-for="group in visibleGroupList"
                :key="group.object_id"
                @click="goDetail(group.object_id)"
            >
                <view class="card-header">
                    <image class="room-img" :src="group.roomImage" mode="aspectFill" />
                    <view class="room-info">
                        <view class="room-name-row">
                            <text class="room-name">{{ group.roomName }}</text>
                            <view class="new-tag" v-if="group.isNew">NEW</view>
                        </view>
                        <text class="time-label">{{ group.timeLabel }}</text>
                        <view class="room-time">
                            <text class="time-tag date-tag">{{ group.dateShort }}</text>
                            <text class="time-tag">{{ group.begin_time }} ~ {{ group.end_time }}</text>
                        </view>
                    </view>
                    <view class="status-tag" :class="group.statusClass">{{ group.actionLabel }}</view>
                </view>

                <view class="card-body">
                    <view class="initiator">
                        <image class="initiator-avatar" :src="group.initiatorAvatar" mode="aspectFill" />
                        <text class="initiator-name">{{ group.initiatorName }}</text>
                        <text class="initiator-label">发起</text>
                    </view>
                    <view class="members-preview">
                        <image
                            v-for="(m, i) in (group.members || []).slice(0, 3)"
                            :key="i"
                            class="member-avatar"
                            :src="m.avatar"
                            mode="aspectFill"
                        />
                        <view class="member-more" v-if="(group.members || []).length > 3">
                            <text>+{{ group.members.length - 3 }}</text>
                        </view>
                    </view>
                </view>

                <view class="card-note" v-if="group.note">
                    <text class="note-icon">💬</text>
                    <text class="note-text">{{ group.note }}</text>
                </view>

                <view class="card-footer">
                    <view class="price-info">
                        <view class="price-row">
                            <text class="price-original" v-if="group.savePerPerson > 0">¥{{ group.originalPerPersonText }}</text>
                            <text class="price-num">¥{{ group.priceText }}</text>
                            <view class="save-tag" v-if="group.savePerPerson > 0">人均省¥{{ group.savePerPersonText }}</view>
                        </view>
                        <text class="price-caption">成员人均</text>
                    </view>
                    <view class="card-actions">
                        <button class="share-mini-btn" open-type="share" @click.stop="setShareGroup(group)">
                            <text class="yticon icon-fenxiang2"></text>
                            <text>{{ group.shareActionText }}</text>
                        </button>
                        <view class="progress-info">
                            <view class="progress-bar">
                                <view class="progress-fill" :style="group.progressStyle"></view>
                            </view>
                            <text class="progress-text" :class="group.progressTextClass">{{ group.progressText }}</text>
                        </view>
                    </view>
                </view>
            </view>

            <!-- 空状态 -->
            <view class="empty-section" v-if="visibleGroupList.length === 0 && !loading">
                <text class="empty-icon">🎮</text>
                <text class="empty-title">{{ emptyTitle }}</text>
                <text class="empty-sub">{{ emptySub }}</text>
                <view class="empty-btn" @click="goAppoint('empty')">
                    <text>发起2人局 →</text>
                </view>
            </view>

            <view class="starter-card" v-if="visibleGroupList.length > 0 && !loading" @click="goAppoint('starter')">
                <view class="starter-copy">
                    <text class="starter-title">没看到合适的局？</text>
                    <text class="starter-sub">默认2人成局，朋友或新玩家都能加入。</text>
                </view>
                <text class="starter-action">发起组局 →</text>
            </view>
        </view>

        <!-- 加载状态 -->
        <view class="load-more" v-if="loading">
            <text class="load-text">加载中...</text>
        </view>

        <!-- 自定义底部导航 -->
        <custom-tab-bar></custom-tab-bar>
    </view>
</template>

<script>
import { mapState } from 'vuex';
import AUTH from '../../utils/auth.js';
import { parseDateTime, toTimestamp } from '../../common/util.js';
import customTabBar from '@/custom-tab-bar/index.vue';

export default {
    components: { customTabBar },
    data() {
        return {
            weekDays: [],
            selectedDayIndex: 0,
            groupList: [],
            rawGroupList: [],
            activeQuickFilter: 'all',
            loading: false,
            pendingShareGroup: null,
            groupRequestSeq: 0,
            myPendingRequestSeq: 0,
            myPendingGroups: [],
            squareViewLastTrackedAt: 0,
            emptyTrackedKey: '',
        };
    },

    onShareAppMessage() {
        const group = this.pendingShareGroup;
        this.pendingShareGroup = null;
        this.trackGroupEvent('group_share', {
            source: group ? 'group_square_card' : 'group_square',
            group_id: group && group.object_id,
            share_type: group ? 'group_card' : 'group_square',
        });
        if (!group) {
            return {
                title: '🎮 摸鱼划水吧 · 找搭子一起开局',
                path: '/pages/group/group',
                imageUrl: '/static/logo_small.jpg',
            };
        }
        return this.buildShareData(group);
    },

    computed: {
        ...mapState(['token', 'userInfo']),
        currentDate() {
            return this.weekDays[this.selectedDayIndex] ? this.weekDays[this.selectedDayIndex].date : '';
        },
        emptyTitle() {
            if (this.visibleGroupList.length === 0 && this.rawGroupList.length > 0) return '这个筛选下暂无组局';
            if (!this.currentDate) return '暂无组局';
            const day = this.weekDays[this.selectedDayIndex] || {};
            return (day.week || '') + '暂无组局';
        },
        emptySub() {
            if (this.visibleGroupList.length === 0 && this.rawGroupList.length > 0) return '换个筛选看看，或者自己发起一个新局。';
            return this.currentDate ? '默认2人成局，临时想玩也可以先喊一个搭子。' : '暂时没人缺队友，发起一个2人局更容易成。';
        },
        visibleGroupList() {
            if (this.activeQuickFilter === 'almost') {
                return this.groupList.filter(g => g.status === 'open' && g.remain === 1);
            }
            if (this.activeQuickFilter === 'new') {
                return this.groupList.filter(g => g.isNew);
            }
            if (this.activeQuickFilter === 'low') {
                return this.groupList.filter(g => g.priceLevel === 'low');
            }
            return this.groupList;
        },
        openGroupCount() {
            return this.rawGroupList.filter(g => g.status === 'open').length;
        },
        almostFullCount() {
            return this.rawGroupList.filter(g => g.status === 'open' && g.remain === 1).length;
        },
        summaryPillValue() {
            if (this.almostFullCount > 0) return this.almostFullCount;
            if (this.openGroupCount > 0) return this.openGroupCount;
            return '新';
        },
        summaryPillLabel() {
            if (this.almostFullCount > 0) return '差1人成团';
            if (this.openGroupCount > 0) return '可加入';
            return '可发起';
        },
        lowestPriceText() {
            if (!this.rawGroupList.length) return '';
            let minPrice = 0;
            for (let i = 0; i < this.rawGroupList.length; i++) {
                const p = this.rawGroupList[i].price_per_person || 0;
                if (!p) continue;
                if (!minPrice || p < minPrice) minPrice = p;
            }
            return minPrice ? '¥' + (minPrice / 100).toFixed(0) + '起' : '';
        },
        groupSummaryText() {
            if (this.openGroupCount > 0) return this.openGroupCount + '个局正在等人';
            return '今天从2人局开始';
        },
        groupSummarySub() {
            if (this.lowestPriceText) return '人均' + this.lowestPriceText + '，先报名满员后再付款';
            return '默认2人成局，先报名满员后再付款';
        },
        quickFilters() {
            const items = [
                { key: 'all', label: '全部' },
                { key: 'almost', label: '差1人' },
                { key: 'low', label: '低价' },
                { key: 'new', label: '新发布' },
            ];
            return items.map(item => {
                return {
                    key: item.key,
                    label: item.label,
                    className: this.activeQuickFilter === item.key ? 'filter-pill active' : 'filter-pill',
                };
            });
        },
        pendingPaymentText() {
            const first = this.myPendingGroups[0] || {};
            const room = first.room || {};
            const deadline = first.payment_deadline || first.expire_at || '';
            const deadlineText = deadline ? this.formatDeadline(deadline) : '请尽快完成付款';
            if (this.myPendingGroups.length > 1) {
                return `${this.myPendingGroups.length} 个组局待付款，最近截止 ${deadlineText}`;
            }
            return `${room.name || '组局'} ${first.date || ''} ${first.begin_time || ''}，${deadlineText}`;
        },
    },

    created() {
        this.ensureWeekDays();
    },

    onLoad() {
        this.ensureWeekDays();
    },

    onShow() {
        uni.$emit('tabBarChange', { key: 'group' });
        this.trackSquareView();
        this.ensureWeekDays();
        if (this.weekDays.length > 0) {
            this.fetchGroupList();
        }
        this.fetchMyPendingGroups();
    },

    onPullDownRefresh() {
        Promise.all([
            this.fetchGroupList(),
            this.fetchMyPendingGroups(),
        ]).finally(() => uni.stopPullDownRefresh());
    },

    methods: {
        ensureWeekDays() {
            if (this.weekDays.length === 0) {
                this.buildWeekDays();
            }
        },

        pad2(num) {
            return num < 10 ? '0' + num : String(num);
        },

        buildWeekDays() {
            const days = [];
            const today = new Date();
            const weekMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
            days.push({ date: '', week: '全部', label: '全部', dayText: '不限', className: '' });
            for (let i = 0; i < 7; i++) {
                const d = new Date(today.getTime() + i * 86400000);
                const monthText = this.pad2(d.getMonth() + 1);
                const dayText = this.pad2(d.getDate());
                const dateStr = d.getFullYear() + '-' + monthText + '-' + dayText;
                days.push({
                    date: dateStr,
                    week: i === 0 ? '今天' : weekMap[d.getDay()],
                    label: monthText + '/' + dayText,
                    dayText: dayText,
                    className: '',
                });
            }
            this.weekDays = days;
            this.selectedDayIndex = 0;
            this.updateDatePillClasses();
        },

        selectDay(index) {
            this.selectedDayIndex = index;
            this.activeQuickFilter = 'all';
            this.updateDatePillClasses();
            this.fetchGroupList();
        },

        selectQuickFilter(key) {
            this.activeQuickFilter = key || 'all';
            this.$nextTick(() => {
                this.trackEmptyViewIfNeeded();
            });
        },

        fetchGroupList() {
            // 拼团大厅公开，无需登录即可浏览
            const requestSeq = ++this.groupRequestSeq;
            this.loading = true;
            const params = {};
            if (this.currentDate) {
                params.date = this.currentDate;
            }
            return AUTH.getGroupList(this.token || null, params).then(res => {
                if (requestSeq !== this.groupRequestSeq) return;
                this.loading = false;
                if (res && res._status === 0) {
                    const data = res.data || {};
                    let list = data.list || res.data || [];
                    // 预处理日期标签，避免模板中使用方法调用
                    list = list.map(g => {
                        const room = g.room || {};
                        const initiator = g.initiator || {};
                        const label = this.formatDateLabel(g.date);
                        g.dateLabel = label;
                        g.dateShort = this.formatShortDate(g.date);
                        g.roomName = room.name || '组局房间';
                        g.roomImage = room.image1 || '/static/logo_small.jpg';
                        g.initiatorName = initiator.nickname || '玩家';
                        g.initiatorAvatar = initiator.avatar || '/static/logo_small.jpg';
                        g.cardClass = label === '今天' ? 'card-today' : (label === '明天' ? 'card-tomorrow' : (label === '后天' ? 'card-after' : ''));

                        // 时间紧迫感标签
                        const beginHour = parseInt((g.begin_time || '00:00').split(':')[0], 10);
                        if (label === '今天') {
                            g.timeLabel = '今天 ' + g.begin_time + ' 开玩';
                        } else if (label === '明天') {
                            g.timeLabel = '明天 ' + g.begin_time + ' 开玩';
                        } else {
                            g.timeLabel = g.date + ' ' + g.begin_time + ' 开玩';
                        }

                        // 新鲜度：1小时内发布的算新
                        const created = parseDateTime(g.created_at);
                        g.isNew = created && (new Date() - created < 3600000);

                        // 剩余名额
                        g.remain = Math.max(0, (g.max_members || 4) - (g.current_members || 1));
                        g.actionLabel = this.getActionLabel(g);
                        g.statusClass = g.status === 'open' && g.remain === 1 ? 'almost' : g.status;
                        // 计算总价差额（用于展示原价vs拼团价）
                        const originalTotal = g.original_cost || (g.price_per_person * (g.max_members || 4));
                        const groupTotal = g.base_cost || (g.price_per_person * (g.max_members || 4));
                        g.saveAmount = Math.max(0, originalTotal - groupTotal);
                        g.originalPrice = originalTotal;
                        g.groupPrice = groupTotal;
                        g.priceText = ((g.price_per_person || 0) / 100).toFixed(0);
                        g.originalPerPerson = Math.ceil(originalTotal / (g.max_members || 4));
                        g.savePerPerson = Math.max(0, g.originalPerPerson - (g.price_per_person || 0));
                        g.originalPerPersonText = (g.originalPerPerson / 100).toFixed(0);
                        g.savePerPersonText = (g.savePerPerson / 100).toFixed(0);
                        g.priceLevel = (g.price_per_person || 0) <= 5000 ? 'low' : '';
                        g.sortTime = this.getGroupSortTime(g);
                        g.progressStyle = 'width:' + this.progressWidth(g);
                        if (g.remain > 2) {
                            g.progressText = (g.current_members || 1) + '/' + (g.max_members || 4) + ' 人';
                            g.progressTextClass = '';
                        } else if (g.remain > 0) {
                            g.progressText = '再邀 ' + g.remain + ' 人成团';
                            g.progressTextClass = 'urgent';
                        } else {
                            g.progressText = '已满员';
                            g.progressTextClass = 'full';
                        }
                        if (g.status === 'open' && g.remain === 1) {
                            g.shareActionText = '差1人';
                        } else if (g.status === 'open') {
                            g.shareActionText = '喊朋友';
                        } else {
                            g.shareActionText = '分享';
                        }
                        return g;
                    });
                    list.sort(this.compareGroups);
                    this.rawGroupList = list;
                    this.groupList = list;
                    this.trackEmptyViewIfNeeded();
                } else {
                    this.rawGroupList = [];
                    this.groupList = [];
                    this.trackEmptyViewIfNeeded();
                }
            }).catch(() => {
                if (requestSeq !== this.groupRequestSeq) return;
                this.loading = false;
                this.rawGroupList = [];
                this.groupList = [];
                this.trackEmptyViewIfNeeded();
            });
        },

        fetchMyPendingGroups() {
            if (!this.token || !this.userInfo || !this.userInfo.object_id) {
                this.myPendingGroups = [];
                return Promise.resolve();
            }
            const requestSeq = ++this.myPendingRequestSeq;
            return AUTH.myGroups(this.token).then(res => {
                if (requestSeq !== this.myPendingRequestSeq) return;
                if (!res || res._status !== 0 || !res.data) {
                    this.myPendingGroups = [];
                    return;
                }
                const allGroups = [].concat(res.data.initiated || [], res.data.joined || []);
                const seen = {};
                const pending = [];
                allGroups.forEach(group => {
                    if (!group || !group.object_id || seen[group.object_id]) return;
                    seen[group.object_id] = true;
                    if (this.isMyPaymentPending(group)) {
                        pending.push(group);
                    }
                });
                pending.sort((a, b) => {
                    return (toTimestamp(a.payment_deadline || a.expire_at) || 9999999999999) -
                        (toTimestamp(b.payment_deadline || b.expire_at) || 9999999999999);
                });
                this.myPendingGroups = pending;
            }).catch(() => {
                this.myPendingGroups = [];
            });
        },

        isMyPaymentPending(group) {
            if (!this.userInfo || group.status !== 'payment_pending') return false;
            const uid = String(this.userInfo.object_id || '');
            const initiator = group.initiator || {};
            if (uid && String(initiator.object_id || '') === uid) {
                return group.initiator_payment_status !== 'paid';
            }
            const members = group.members || [];
            const member = members.find(item => String(item.user_id || '') === uid);
            if (!member) return false;
            return !(member.status === 'paid' || member.paid_at);
        },

        formatDeadline(value) {
            const ts = toTimestamp(value);
            if (!ts) return '请尽快完成付款';
            const diff = ts - Date.now();
            if (diff <= 0) return '即将截止';
            const min = Math.ceil(diff / 60000);
            if (min <= 1) return '1 分钟内截止';
            if (min < 60) return `${min} 分钟内截止`;
            const h = Math.floor(min / 60);
            const m = min % 60;
            return m ? `${h}小时${m}分钟内截止` : `${h}小时内截止`;
        },

        formatDateLabel(dateStr) {
            if (!dateStr) return '';
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const d = new Date(dateStr.replace(/-/g, '/'));
            d.setHours(0, 0, 0, 0);
            const diff = Math.round((d - today) / 86400000);
            if (diff === 0) return '今天';
            if (diff === 1) return '明天';
            if (diff === 2) return '后天';
            const weekMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
            return weekMap[d.getDay()];
        },

        formatShortDate(dateStr) {
            if (!dateStr) return '';
            const parts = dateStr.split('-');
            return parseInt(parts[1], 10) + '月' + parseInt(parts[2], 10) + '日';
        },

        dateBadgeClass(dateStr) {
            const label = this.formatDateLabel(dateStr);
            return {
                'badge-today': label === '今天',
                'badge-tomorrow': label === '明天',
                'badge-after': label === '后天',
            };
        },

        statusText(status) {
            const map = { open: '组局中', payment_pending: '待付款', full: '已满员', success: '已完成', cancelled: '已取消' };
            return map[status] || status;
        },

        updateDatePillClasses() {
            for (let i = 0; i < this.weekDays.length; i++) {
                const item = this.weekDays[i];
                item.className = (this.selectedDayIndex === i ? 'active ' : '') + (item.week === '全部' ? 'pill-all' : '');
            }
        },

        getActionLabel(group) {
            if (group.status !== 'open') return this.statusText(group.status);
            const remain = Math.max(0, (group.max_members || 4) - (group.current_members || 1));
            if (remain <= 0) return '已满员';
            if (remain === 1) return '差1人';
            return '缺' + remain + '人';
        },

        getGroupSortTime(group) {
            if (!group.date || !group.begin_time) return 9999999999999;
            return toTimestamp(group.date + ' ' + group.begin_time) || 9999999999999;
        },

        compareGroups(a, b) {
            const aOpen = a.status === 'open' ? 0 : 1;
            const bOpen = b.status === 'open' ? 0 : 1;
            if (aOpen !== bOpen) return aOpen - bOpen;
            const aRemain = a.remain || 99;
            const bRemain = b.remain || 99;
            if (aRemain !== bRemain) return aRemain - bRemain;
            return (a.sortTime || 0) - (b.sortTime || 0);
        },

        progressWidth(group) {
            const curr = group.current_members || 1;
            const max = group.max_members || 4;
            return Math.min(100, (curr / max) * 100) + '%';
        },

        goDetail(id) {
            this.trackGroupEvent('group_detail_click', {
                source: 'group_square_click',
                group_id: id,
            });
            uni.navigateTo({ url: '/pages/group/detail?id=' + id + '&source=group_square' });
        },

        goPendingPayment() {
            const group = this.myPendingGroups[0];
            if (!group || !group.object_id) return;
            this.trackGroupEvent('group_pay_click', {
                source: 'group_square_pending_alert',
                group_id: group.object_id,
                status: group.status,
            });
            uni.navigateTo({ url: '/pages/group/detail?id=' + group.object_id + '&source=group_square_pending_alert' });
        },

        setShareGroup(group) {
            this.pendingShareGroup = group;
        },

        buildShareData(group) {
            const room = group.room || {};
            const remain = (group.max_members || 4) - (group.current_members || 1);
            const price = group.price_per_person || 0;
            const priceStr = (price / 100).toFixed(0);
            const hour = parseInt((group.begin_time || '00:00').split(':')[0], 10);

            // 根据时间段选择 emoji，增加亲和力
            let timeEmoji = '🌅';
            if (hour >= 11 && hour < 14) timeEmoji = '☀️';
            else if (hour >= 14 && hour < 18) timeEmoji = '🌤️';
            else if (hour >= 18 && hour < 22) timeEmoji = '🌙';
            else if (hour >= 22) timeEmoji = '⭐';

            // 根据剩余人数选择不同的社交裂变文案
            let title = '';
            if (remain <= 0) {
                title = `${timeEmoji}「${room.name || '组局'}」已满员，来看看还有没有新局`;
            } else if (remain === 1) {
                title = `🔥 缺1人开局！${group.date} ${group.begin_time}「${room.name || '组局'}」人均¥${priceStr}`;
            } else if (remain === 2) {
                title = `🎮 还差2人，${group.date} ${group.begin_time} 一起开局吗？人均¥${priceStr}`;
            } else {
                title = `🎮 「${room.name || '组局'}」缺${remain}人，${group.date} ${group.begin_time} 一起玩`;
            }

            return {
                title,
                path: '/pages/group/detail?id=' + group.object_id + '&source=group_square_share',
                imageUrl: room.image1 || '/static/logo_small.jpg',
            };
        },

        trackGroupEvent(event, extra) {
            const data = Object.assign({
                event: event,
                page_path: 'pages/group/group',
                source: 'group_square',
            }, extra || {});
            AUTH.trackEvent(data, this.token).catch(() => {});
        },

        trackSquareView() {
            const now = Date.now();
            if (now - this.squareViewLastTrackedAt < 30000) return;
            this.squareViewLastTrackedAt = now;
            this.trackGroupEvent('group_square_view', {
                date: this.currentDate || 'all',
            });
        },

        trackEmptyViewIfNeeded() {
            if (this.loading || this.visibleGroupList.length > 0) return;
            const key = (this.currentDate || 'all') + ':' + this.activeQuickFilter;
            if (this.emptyTrackedKey === key) return;
            this.emptyTrackedKey = key;
            this.trackGroupEvent('group_square_empty_view', {
                date: this.currentDate || 'all',
                filter: this.activeQuickFilter,
            });
        },

        goAppoint(source) {
            this.trackGroupEvent('group_create_entry_click', {
                source: source === 'starter' ? 'group_square_starter' : 'group_square_empty',
            });
            uni.switchTab({ url: '/pages/tabBar/appoint/appoint' });
        },
    },
};
</script>

<style lang="scss">
$primary: #FF8C42;
$pink: #FFB5A7;
$green: #81C784;
$blue: #FFD54F;
$gray: #A08B7A;
$dark: #5C4B3A;
$light: #FFF0E8;
$border: #F5E0D0;
$cream: #FFF8F0;

.container {
    min-height: 100vh;
    background: linear-gradient(180deg, #FFF0E0 0%, #FFF8F0 30%, #FFF8F0 70%, #E8F5E9 100%);
    padding-bottom: calc(140rpx + env(safe-area-inset-bottom));
    position: relative;
}
.container::before {
    content: '';
    position: fixed;
    top: 300rpx;
    right: -80rpx;
    width: 240rpx;
    height: 240rpx;
    background: rgba(255, 181, 167, 0.25);
    border-radius: 50%;
    z-index: 0;
    pointer-events: none;
}
.container::after {
    content: '';
    position: fixed;
    bottom: 200rpx;
    left: -60rpx;
    width: 200rpx;
    height: 200rpx;
    background: rgba(165, 214, 167, 0.3);
    border-radius: 50%;
    z-index: 0;
    pointer-events: none;
}

// 顶部导航
.header {
    background: linear-gradient(180deg, #FFF0E0 0%, #FFF5EC 50%, #FFF8F0 100%);
    padding: 60rpx 30rpx 90rpx;
    text-align: center;
    position: relative;
    overflow: hidden;

    /* emoji 装饰 */
    .deco-sun {
        position: absolute;
        top: 16rpx;
        right: 160rpx;
        font-size: 56rpx;
        z-index: 1;
        animation: sun-pulse 4s ease-in-out infinite;
    }
    .deco-cloud {
        position: absolute;
        z-index: 1;
        opacity: 0.9;
        text-shadow: 0 2rpx 8rpx rgba(0,0,0,0.06);
    }
    .deco-cloud.c1 { top: 24rpx; right: 36rpx; font-size: 64rpx; animation: float 12s ease-in-out infinite; }
    .deco-cloud.c2 { top: 55rpx; left: 28rpx; font-size: 44rpx; opacity: 0.7; animation: float 14s ease-in-out infinite; animation-delay: -5s; }
    .deco-cloud.c3 { top: 30rpx; right: 280rpx; font-size: 36rpx; opacity: 0.5; animation: float 16s ease-in-out infinite; animation-delay: -8s; }
    .deco-bird {
        position: absolute;
        z-index: 2;
        font-size: 28rpx;
    }
    .deco-bird.b1 { top: 42rpx; left: 110rpx; animation: fly 7s ease-in-out infinite; }
    .deco-bird.b2 { top: 32rpx; right: 260rpx; font-size: 22rpx; opacity: 0.8; animation: fly 9s ease-in-out infinite; animation-delay: -2s; }

    /* 草地 */
    .grass-hill {
        position: absolute;
        bottom: -16rpx;
        left: -20%; right: -20%;
        height: 70rpx;
        background: #A5D6A7;
        border-radius: 50% 50% 0 0 / 100% 100% 0 0;
        display: flex;
        justify-content: space-around;
        align-items: flex-end;
        padding: 0 15%;
        box-shadow: 0 -4rpx 16rpx rgba(165, 214, 167, 0.4);
    }
    .grass-hill .blade {
        font-size: 32rpx;
        margin-bottom: 8rpx;
        animation: grass-sway 3s ease-in-out infinite;
    }
    .grass-hill .blade:nth-child(1) { animation-delay: 0s; }
    .grass-hill .blade:nth-child(2) { animation-delay: 0.4s; }
    .grass-hill .blade:nth-child(3) { animation-delay: 0.8s; }
    .grass-hill .blade:nth-child(4) { animation-delay: 1.2s; }
    .grass-hill .blade:nth-child(5) { animation-delay: 1.6s; }

    @keyframes sun-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
    }
    @keyframes float {
        0%, 100% { transform: translateX(0); }
        50% { transform: translateX(20rpx); }
    }
    @keyframes fly {
        0%, 100% { transform: translate(0, 0) rotate(0deg); }
        25% { transform: translate(12rpx, -8rpx) rotate(5deg); }
        50% { transform: translate(24rpx, 0) rotate(0deg); }
        75% { transform: translate(12rpx, 8rpx) rotate(-5deg); }
    }
    @keyframes grass-sway {
        0%, 100% { transform: rotate(-8deg); }
        50% { transform: rotate(8deg); }
    }

    .header-title {
        font-size: 42rpx;
        font-weight: bold;
        color: $dark;
        display: block;
        text-shadow: 0 2rpx 4rpx rgba(255,255,255,0.6);
    }

    .header-sub {
        font-size: 26rpx;
        color: rgba(92,75,58,0.75);
        margin-top: 12rpx;
        display: block;
    }
}

// 日期筛选
.date-bar {
    background: #fff;
    padding: 20rpx 0;
    margin: -50rpx 24rpx 18rpx;
    border-radius: 24rpx;
    box-shadow: 0 4rpx 20rpx rgba(92, 75, 58, 0.06);
    border: 2rpx solid rgba(255, 181, 167, 0.15);
    position: sticky;
    top: 0;
    z-index: 100;
}

.date-scroll {
    width: 100%;
    height: 112rpx;
    white-space: nowrap;
}

.date-inner {
    display: inline-block;
    white-space: nowrap;
    padding: 0 16rpx;
}

.date-pill {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 88rpx;
    height: 112rpx;
    border-radius: 20rpx;
    margin: 0 6rpx;
    background: #FFF8F0;
    transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    border: 2rpx solid transparent;

    &.active {
        background: linear-gradient(135deg, #FFB5A7, #FF8C42);
        transform: scale(1.08);
        box-shadow: 0 6rpx 16rpx rgba(255, 140, 66, 0.25);
        border-color: rgba(255,255,255,0.4);
        .pill-week, .pill-date, .pill-all-text { color: #fff; text-shadow: 0 1rpx 2rpx rgba(0,0,0,0.1); }
    }

    &:active {
        transform: scale(0.95);
    }

    .pill-week {
        font-size: 20rpx;
        color: #A08B7A;
        margin-bottom: 4rpx;
    }

    .pill-date {
        font-size: 30rpx;
        font-weight: bold;
        color: #5C4B3A;
    }
    .pill-all-text {
        font-size: 24rpx;
        font-weight: bold;
        color: #5C4B3A;
    }
}

// 社交空间总览
.social-summary {
    margin: 0 30rpx 18rpx;
    padding: 24rpx;
    border-radius: 26rpx;
    background: linear-gradient(135deg, #EAF7EC 0%, #FFF8F0 66%, #FFE8D0 100%);
    border: 2rpx solid rgba(129,199,132,0.22);
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 6rpx 20rpx rgba(92, 75, 58, 0.06);
}
.summary-main { flex: 1; min-width: 0; padding-right: 18rpx; }
.summary-kicker {
    display: block;
    font-size: 21rpx;
    color: #4A9A4A;
    font-weight: bold;
    margin-bottom: 6rpx;
}
.summary-title {
    display: block;
    font-size: 32rpx;
    line-height: 1.25;
    font-weight: bold;
    color: $dark;
}
.summary-sub {
    display: block;
    font-size: 22rpx;
    color: #7C6A58;
    line-height: 1.45;
    margin-top: 8rpx;
}
.summary-pill {
    width: 118rpx;
    height: 118rpx;
    border-radius: 30rpx;
    background: #fff;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4rpx 14rpx rgba(129,199,132,0.16);
    flex-shrink: 0;
}
.summary-pill-num {
    font-size: 38rpx;
    line-height: 1;
    color: $primary;
    font-weight: bold;
}
.summary-pill-text {
    font-size: 18rpx;
    color: $gray;
    margin-top: 8rpx;
}

.payment-alert {
    margin: 0 30rpx 18rpx;
    padding: 22rpx 24rpx;
    border-radius: 24rpx;
    background: linear-gradient(135deg, #FFE8D6, #E8F7FF);
    border: 2rpx solid rgba(255, 140, 66, 0.2);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18rpx;
    box-shadow: 0 6rpx 20rpx rgba(255, 140, 66, 0.08);
}
.payment-alert-main {
    flex: 1;
    min-width: 0;
}
.payment-alert-title {
    display: block;
    font-size: 29rpx;
    line-height: 1.25;
    color: $dark;
    font-weight: bold;
    margin-bottom: 8rpx;
}
.payment-alert-sub {
    display: block;
    font-size: 23rpx;
    line-height: 1.4;
    color: #7C6A58;
}
.payment-alert-action {
    flex-shrink: 0;
    font-size: 24rpx;
    color: #fff;
    background: #FF8C42;
    border-radius: 24rpx;
    padding: 12rpx 18rpx;
    font-weight: bold;
}

// 快捷筛选
.quick-filter {
    margin: 0 30rpx 20rpx;
    display: flex;
    gap: 12rpx;
    overflow-x: auto;
    white-space: nowrap;
}
.filter-pill {
    flex-shrink: 0;
    padding: 12rpx 22rpx;
    border-radius: 24rpx;
    background: #fff;
    color: $gray;
    font-size: 23rpx;
    border: 1rpx solid rgba(245,224,208,0.9);
}
.filter-pill.active {
    background: #FF8C42;
    color: #fff;
    border-color: #FF8C42;
    font-weight: bold;
    box-shadow: 0 5rpx 14rpx rgba(255,140,66,0.18);
}

// 拼团列表
.group-list {
    padding: 0 30rpx 30rpx;
}

.group-card {
    background: #fff;
    border-radius: 28rpx;
    padding: 24rpx 24rpx 24rpx 28rpx;
    margin-bottom: 20rpx;
    box-shadow: 0 6rpx 20rpx rgba(92, 75, 58, 0.06);
    transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s;
    border: 1rpx solid rgba(245, 224, 208, 0.6);
    position: relative;
    overflow: hidden;

    &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 20rpx;
        bottom: 20rpx;
        width: 6rpx;
        border-radius: 0 6rpx 6rpx 0;
        background: #E0D5CC;
    }
    &.card-today::before { background: #FF8C42; }
    &.card-tomorrow::before { background: #FFB5A7; }
    &.card-after::before { background: #FFD54F; }

    &:active {
        transform: scale(0.97);
    }
}

.starter-card {
    margin: 4rpx 0 24rpx;
    padding: 24rpx;
    border-radius: 24rpx;
    background: rgba(255,255,255,0.78);
    border: 2rpx dashed rgba(255,140,66,0.24);
    display: flex;
    align-items: center;
    justify-content: space-between;
}
.starter-copy {
    flex: 1;
    min-width: 0;
    padding-right: 18rpx;
}
.starter-title {
    display: block;
    font-size: 28rpx;
    font-weight: bold;
    color: $dark;
    margin-bottom: 6rpx;
}
.starter-sub {
    display: block;
    font-size: 22rpx;
    color: #8D6E63;
    line-height: 1.45;
}
.starter-action {
    flex-shrink: 0;
    font-size: 23rpx;
    color: #FF8C42;
    font-weight: bold;
    background: #FFF0E8;
    border-radius: 20rpx;
    padding: 10rpx 16rpx;
}

.card-header {
    display: flex;
    align-items: center;
    margin-bottom: 20rpx;

    .room-img {
        width: 120rpx;
        height: 120rpx;
        border-radius: 20rpx;
        margin-right: 20rpx;
        background: #FFF8F0;
        box-shadow: 0 4rpx 12rpx rgba(92, 75, 58, 0.08);
    }

    .room-info {
        flex: 1;

        .room-name-row {
            display: flex;
            align-items: center;
            gap: 10rpx;
            margin-bottom: 8rpx;
        }
        .room-name {
            font-size: 30rpx;
            font-weight: bold;
            color: $dark;
        }
        .date-badge {
            font-size: 18rpx;
            padding: 2rpx 10rpx;
            border-radius: 10rpx;
            font-weight: 500;
            background: #FFF0E0;
            color: #FF8C42;
            &.badge-today { background: #E8F5E9; color: #4CAF50; }
            &.badge-tomorrow { background: #FFF3E0; color: #FF9800; }
            &.badge-after { background: #E3F2FD; color: #2196F3; }
        }

        .room-time {
            display: flex;
            flex-wrap: wrap;
            gap: 6rpx;
            margin-top: 4rpx;

            .time-tag {
                font-size: 22rpx;
                color: #8D6E63;
                background: #FFF8F0;
                padding: 6rpx 16rpx;
                border-radius: 12rpx;
                border: 1rpx solid rgba(255, 181, 167, 0.3);
            }
            .time-tag.date-tag {
                background: linear-gradient(135deg, #FFF0E0, #FFE8D0);
                color: #FF8C42;
                font-weight: 500;
            }
        }
    }

    .status-tag {
        font-size: 22rpx;
        padding: 6rpx 16rpx;
        border-radius: 20rpx;
        margin-left: 16rpx;

        &.open {
            background: linear-gradient(135deg, #FFF0E0, #FFE8D0);
            color: #E65100;
        }

        &.almost {
            background: linear-gradient(135deg, #FF8C42, #FFB5A7);
            color: #fff;
            font-weight: bold;
        }

        &.full {
            background: linear-gradient(135deg, #F5F5F5, #E8E8E8);
            color: #888;
        }

        &.success {
            background: linear-gradient(135deg, #E0EEF8, #B8D4F0);
            color: #3D5A8A;
        }

        &.cancelled {
            background: #F5F5F5;
            color: #9E9E9E;
        }
    }
}

.card-body {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16rpx 0;
    border-top: 1rpx solid #F5F0E8;
    border-bottom: 1rpx solid #F5F0E8;
    margin-bottom: 16rpx;

    .initiator {
        display: flex;
        align-items: center;

        .initiator-avatar {
            width: 48rpx;
            height: 48rpx;
            border-radius: 50%;
            margin-right: 10rpx;
            background: #FFF8F0;
        }

        .initiator-name {
            font-size: 26rpx;
            color: $dark;
            max-width: 160rpx;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .initiator-label {
            font-size: 20rpx;
            color: $gray;
            margin-left: 6rpx;
        }
    }

    .members-preview {
        display: flex;
        align-items: center;

        .member-avatar {
            width: 48rpx;
            height: 48rpx;
            border-radius: 50%;
            border: 2rpx solid #fff;
            margin-left: -12rpx;
            background: #FFF8F0;
        }

        .member-more {
            width: 48rpx;
            height: 48rpx;
            border-radius: 50%;
            background: #FFF8F0;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-left: -12rpx;
            border: 2rpx solid #fff;

            text {
                font-size: 20rpx;
                color: $gray;
            }
        }
    }
}

.time-label {
    display: block;
    font-size: 24rpx;
    color: #FF8C42;
    font-weight: 500;
    margin-bottom: 8rpx;
}
.new-tag {
    font-size: 18rpx;
    color: #fff;
    background: linear-gradient(135deg, #FF8C42, #FFB5A7);
    padding: 2rpx 10rpx;
    border-radius: 10rpx;
    font-weight: bold;
}
.card-note {
    display: flex;
    align-items: flex-start;
    gap: 8rpx;
    padding: 12rpx 16rpx;
    margin: 12rpx 0;
    background: #FFF8F0;
    border-radius: 16rpx;
}
.note-icon {
    font-size: 24rpx;
    flex-shrink: 0;
}
.note-text {
    font-size: 24rpx;
    color: #8D6E63;
    line-height: 1.5;
}

.card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .price-info {
        .price-row {
            display: flex;
            align-items: center;
            gap: 10rpx;
        }
        .price-original {
            font-size: 24rpx;
            color: #C4B5A5;
            text-decoration: line-through;
        }
        .price-num {
            font-size: 36rpx;
            font-weight: bold;
            color: $primary;
        }
        .price-caption {
            display: block;
            font-size: 20rpx;
            color: $gray;
            margin-top: 2rpx;
        }
        .save-tag {
            font-size: 18rpx;
            color: #fff;
            background: linear-gradient(135deg, #FF8C42, #FFB5A7);
            padding: 2rpx 10rpx;
            border-radius: 10rpx;
            font-weight: bold;
        }
    }

    .card-actions {
        display: flex;
        align-items: center;
        gap: 16rpx;
    }

    .share-mini-btn {
        display: flex;
        align-items: center;
        gap: 6rpx;
        background: linear-gradient(135deg, #FFF0E8, #FFE8D8);
        padding: 8rpx 20rpx;
        border-radius: 24rpx;
        margin: 0;
        line-height: 1;
        border: none;
        outline: none;
        box-shadow: 0 2rpx 8rpx rgba(255, 140, 66, 0.12);
        transition: transform 0.15s;

        &::after {
            display: none;
        }

        &:active {
            transform: scale(0.92);
        }

        text {
            font-size: 24rpx;
            color: #FF8C42;
        }
    }

    .progress-info {
        display: flex;
        align-items: center;
        gap: 12rpx;

        .progress-bar {
            width: 100rpx;
            height: 10rpx;
            background: #F5F0E8;
            border-radius: 6rpx;
            overflow: hidden;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #FFB5A7, #FF8C42);
            border-radius: 8rpx;
            transition: width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .progress-text {
            font-size: 24rpx;
            color: $gray;
            font-weight: 500;
            &.urgent { color: #FF8C42; font-weight: bold; }
            &.full { color: #A08B7A; }
        }
    }
}

// 空状态
.empty-section {
    text-align: center;
    padding: 80rpx 40rpx;
    position: relative;
    z-index: 1;

    .empty-illustration {
        position: relative;
        width: 240rpx;
        height: 240rpx;
        margin: 0 auto 32rpx;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .empty-main {
        font-size: 140rpx;
        display: block;
        animation: bounce-gentle 2.5s ease-in-out infinite;
    }
    .empty-deco {
        position: absolute;
        font-size: 36rpx;
    }
    .empty-deco.d1 { top: 10rpx; right: 30rpx; animation: sparkle 2s ease-in-out infinite; }
    .empty-deco.d2 { top: 50rpx; left: 20rpx; animation: sparkle 2.5s ease-in-out infinite 0.5s; }
    .empty-deco.d3 { bottom: 40rpx; right: 10rpx; animation: sparkle 1.8s ease-in-out infinite 1s; }
    .empty-deco.d4 { bottom: 60rpx; left: 40rpx; animation: sparkle 2.2s ease-in-out infinite 0.3s; }

    @keyframes bounce-gentle {
        0%, 100% { transform: translateY(0) rotate(-5deg); }
        50% { transform: translateY(-16rpx) rotate(5deg); }
    }
    @keyframes sparkle {
        0%, 100% { opacity: 0.3; transform: scale(0.8); }
        50% { opacity: 1; transform: scale(1.2); }
    }

    .empty-title {
        font-size: 36rpx;
        font-weight: bold;
        color: $dark;
        display: block;
        margin-bottom: 16rpx;
    }

    .empty-sub {
        font-size: 26rpx;
        color: $gray;
        display: block;
        margin-bottom: 40rpx;
        line-height: 1.5;
    }

    .empty-btn {
        display: inline-block;
        background: linear-gradient(135deg, #FFB5A7, #FF8C42);
        color: #fff;
        font-size: 30rpx;
        font-weight: bold;
        padding: 24rpx 56rpx;
        border-radius: 48rpx;
        box-shadow: 0 8rpx 24rpx rgba(255, 140, 66, 0.35);
        transition: transform 0.2s;
        animation: btn-pulse 3s ease-in-out infinite;

        &:active {
            transform: scale(0.95);
        }
    }
    @keyframes btn-pulse {
        0%, 100% { box-shadow: 0 8rpx 24rpx rgba(255, 140, 66, 0.35); }
        50% { box-shadow: 0 8rpx 32rpx rgba(255, 140, 66, 0.5); }
    }
}

.load-more {
    text-align: center;
    padding: 40rpx;

    .load-text {
        font-size: 24rpx;
        color: $gray;
        letter-spacing: 2rpx;
    }
}
</style>
