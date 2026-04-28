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
            <text class="header-title">🎮 拼团广场</text>
            <text class="header-sub">拉上小伙伴一起约，人多更便宜！</text>
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
                        :class="[{ active: selectedDayIndex === index }, item.week === '全部' ? 'pill-all' : '']"
                        @click="selectDay(index)"
                    >
                        <text class="pill-week">{{ item.week }}</text>
                        <text class="pill-date" v-if="item.date">{{ item.date.split('-')[2] }}</text>
                        <text class="pill-all-text" v-else>全部</text>
                    </view>
                </view>
            </scroll-view>
        </view>

        <!-- 拼团列表 -->
        <view class="group-list">
            <view
                class="group-card"
                :class="group.cardClass"
                v-for="group in groupList"
                :key="group.object_id"
                @click="goDetail(group.object_id)"
            >
                <view class="card-header">
                    <image class="room-img" :src="group.room && group.room.image1" mode="aspectFill" />
                    <view class="room-info">
                        <view class="room-name-row">
                            <text class="room-name">{{ group.room && group.room.name }}</text>
                            <view class="new-tag" v-if="group.isNew">NEW</view>
                        </view>
                        <text class="time-label">{{ group.timeLabel }}</text>
                        <view class="room-time">
                            <text class="time-tag date-tag">{{ formatShortDate(group.date) }}</text>
                            <text class="time-tag">{{ group.begin_time }} ~ {{ group.end_time }}</text>
                        </view>
                    </view>
                    <view class="status-tag" :class="group.status">{{ statusText(group.status) }}</view>
                </view>

                <view class="card-body">
                    <view class="initiator">
                        <image class="initiator-avatar" :src="group.initiator && group.initiator.avatar" mode="aspectFill" />
                        <text class="initiator-name">{{ group.initiator && group.initiator.nickname }}</text>
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
                            <text class="price-original" v-if="group.saveAmount > 0">¥{{ group.originalPrice / 100 }}</text>
                            <text class="price-num">¥{{ group.groupPrice / 100 }}</text>
                            <view class="save-tag" v-if="group.saveAmount > 0">省¥{{ group.saveAmount / 100 }}</view>
                        </view>
                    </view>
                    <view class="card-actions">
                        <button class="share-mini-btn" open-type="share" @click.stop="setShareGroup(group)">
                            <text class="yticon icon-fenxiang2"></text>
                            <text>喊朋友</text>
                        </button>
                        <view class="progress-info">
                            <view class="progress-bar">
                                <view class="progress-fill" :style="{ width: progressWidth(group) }"></view>
                            </view>
                            <text class="progress-text" v-if="group.remain > 2">{{ group.current_members || 1 }}/{{ group.max_members }} 人</text>
                            <text class="progress-text urgent" v-else-if="group.remain > 0">再邀 {{ group.remain }} 人成团</text>
                            <text class="progress-text full" v-else>已满员</text>
                        </view>
                    </view>
                </view>
            </view>

            <!-- 空状态 -->
            <view class="empty-section" v-if="groupList.length === 0 && !loading">
                <text class="empty-icon">🎮</text>
                <text class="empty-title">{{ currentDate ? (weekDays[selectedDayIndex] && weekDays[selectedDayIndex].week) + '暂无拼团' : '暂无拼团' }}</text>
                <text class="empty-sub">{{ currentDate ? '这一天还没有人发起拼团，你来当第一个！' : '拼团广场空空如也，发起一个邀请小伙伴吧～' }}</text>
                <view class="empty-btn" @click="goAppoint">
                    <text>发起拼团，立享优惠 →</text>
                </view>
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
import customTabBar from '@/custom-tab-bar/index.vue';

export default {
    components: { customTabBar },
    data() {
        return {
            weekDays: [],
            selectedDayIndex: 0,
            groupList: [],
            loading: false,
            pendingShareGroup: null,
        };
    },

    onShareAppMessage() {
        const group = this.pendingShareGroup;
        this.pendingShareGroup = null;
        if (!group) {
            return {
                title: '🎮 拼团广场 · 和小伙伴一起约，更划算！',
                path: '/pages/group/group',
                imageUrl: '/static/logo_small.jpg',
            };
        }
        return this.buildShareData(group);
    },

    computed: {
        ...mapState(['token']),
        currentDate() {
            return this.weekDays[this.selectedDayIndex] ? this.weekDays[this.selectedDayIndex].date : '';
        },
    },

    onLoad() {
        this.buildWeekDays();
    },

    onShow() {
        uni.$emit('tabBarChange', { key: 'group' });
        if (this.weekDays.length > 0) {
            this.fetchGroupList();
        }
    },

    onPullDownRefresh() {
        this.fetchGroupList().finally(() => uni.stopPullDownRefresh());
    },

    methods: {
        buildWeekDays() {
            const days = [];
            const today = new Date();
            const weekMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
            days.push({ date: '', week: '全部', label: '全部' });
            for (let i = 0; i < 7; i++) {
                const d = new Date(today.getTime() + i * 86400000);
                const dateStr = d.getFullYear() + '-' + (d.getMonth() + 1).toString().padStart(2, '0') + '-' + d.getDate().toString().padStart(2, '0');
                days.push({
                    date: dateStr,
                    week: i === 0 ? '今天' : weekMap[d.getDay()],
                    label: dateStr.split('-')[1] + '/' + dateStr.split('-')[2],
                });
            }
            this.weekDays = days;
            this.selectedDayIndex = 0;
        },

        selectDay(index) {
            this.selectedDayIndex = index;
            this.fetchGroupList();
        },

        fetchGroupList() {
            // 拼团大厅公开，无需登录即可浏览
            this.loading = true;
            const params = {};
            if (this.currentDate) {
                params.date = this.currentDate;
            }
            return AUTH.getGroupList(this.token || null, params).then(res => {
                this.loading = false;
                if (res && res._status === 0) {
                    const data = res.data || {};
                    let list = data.list || res.data || [];
                    // 预处理日期标签，避免模板中使用方法调用
                    list = list.map(g => {
                        const label = this.formatDateLabel(g.date);
                        g.dateLabel = label;
                        g.dateBadgeClass = {
                            'badge-today': label === '今天',
                            'badge-tomorrow': label === '明天',
                            'badge-after': label === '后天',
                        };
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
                        const created = g.created_at ? new Date(g.created_at.replace(/-/g, '/')) : null;
                        g.isNew = created && (new Date() - created < 3600000);

                        // 剩余名额
                        g.remain = Math.max(0, (g.max_members || 4) - (g.current_members || 1));
                        // 计算总价差额（用于展示原价vs拼团价）
                        const originalTotal = g.original_cost || (g.price_per_person * (g.max_members || 4));
                        const groupTotal = g.base_cost || (g.price_per_person * (g.max_members || 4));
                        g.saveAmount = Math.max(0, originalTotal - groupTotal);
                        g.originalPrice = originalTotal;
                        g.groupPrice = groupTotal;
                        return g;
                    });
                    this.groupList = list;
                } else {
                    this.groupList = [];
                }
            }).catch(() => {
                this.loading = false;
                this.groupList = [];
            });
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
            const map = { open: '拼团中', full: '已满员', success: '已完成', cancelled: '已取消' };
            return map[status] || status;
        },

        progressWidth(group) {
            const curr = group.current_members || 1;
            const max = group.max_members || 4;
            return Math.min(100, (curr / max) * 100) + '%';
        },

        goDetail(id) {
            uni.navigateTo({ url: '/pages/group/detail?id=' + id });
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
                title = `${timeEmoji}「${room.name || '拼团'}」已满员！来看看还有啥好玩的~`;
            } else if (remain === 1) {
                title = `🔥 最后1个名额！「${room.name || '拼团'}」${group.date} ${group.begin_time}~${group.end_time} · 人均¥${priceStr}`;
            } else if (remain === 2) {
                title = `🎮 就差2人了！「${room.name || '拼团'}」${group.date} ${group.begin_time}~${group.end_time} · 人均¥${priceStr}`;
            } else {
                title = `🎮 一起开黑！「${room.name || '拼团'}」${group.date} ${group.begin_time}~${group.end_time} · 人均¥${priceStr} · 还差${remain}人`;
            }

            return {
                title,
                path: '/pages/group/detail?id=' + group.object_id,
                imageUrl: room.image1 || '/static/logo_small.jpg',
            };
        },

        goAppoint() {
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
    overflow: hidden;
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
    margin: -50rpx 24rpx 24rpx;
    border-radius: 24rpx;
    box-shadow: 0 4rpx 20rpx rgba(92, 75, 58, 0.06);
    border: 2rpx solid rgba(255, 181, 167, 0.15);
}

.date-scroll {
    width: 100%;
    white-space: nowrap;
}

.date-inner {
    display: inline-flex;
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
