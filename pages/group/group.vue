<template>
    <view class="container">
        <!-- 顶部导航 -->
        <view class="header">
            <text class="header-title">拼团广场</text>
            <text class="header-sub">和小伙伴一起约，更划算</text>
        </view>

        <!-- 日期筛选 -->
        <view class="date-bar">
            <scroll-view class="date-scroll" scroll-x>
                <view class="date-inner">
                    <view
                        v-for="(item, index) in weekDays"
                        :key="index"
                        class="date-pill"
                        :class="{ active: selectedDayIndex === index }"
                        @click="selectDay(index)"
                    >
                        <text class="pill-week">{{ item.week }}</text>
                        <text class="pill-date">{{ item.date.split('-')[2] }}</text>
                    </view>
                </view>
            </scroll-view>
        </view>

        <!-- 拼团列表 -->
        <view class="group-list">
            <view
                class="group-card"
                v-for="group in groupList"
                :key="group.object_id"
                @click="goDetail(group.object_id)"
            >
                <view class="card-header">
                    <image class="room-img" :src="group.room && group.room.image1" mode="aspectFill" />
                    <view class="room-info">
                        <text class="room-name">{{ group.room && group.room.name }}</text>
                        <view class="room-time">
                            <text class="time-tag">{{ group.date }}</text>
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

                <view class="card-footer">
                    <view class="price-info">
                        <text class="price-label">人均</text>
                        <text class="price-num">¥{{ group.price_per_person / 100 }}</text>
                    </view>
                    <view class="card-actions">
                        <button class="share-mini-btn" open-type="share" @click.stop="setShareGroup(group)">
                            <text class="yticon icon-fenxiang2"></text>
                            <text>分享</text>
                        </button>
                        <view class="progress-info">
                            <view class="progress-bar">
                                <view class="progress-fill" :style="{ width: progressWidth(group) }"></view>
                            </view>
                            <text class="progress-text">{{ group.current_members || 1 }}/{{ group.max_members }} 人</text>
                        </view>
                    </view>
                </view>
            </view>

            <!-- 空状态 -->
            <view class="empty-section" v-if="groupList.length === 0 && !loading">
                <text class="empty-icon">🎮</text>
                <text class="empty-title">今天暂无拼团</text>
                <text class="empty-sub">发起一个拼团，邀请小伙伴一起吧～</text>
                <view class="empty-btn" @click="goAppoint">
                    <text>去发起拼团</text>
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
        if (this.currentDate) {
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
            for (let i = 0; i < 14; i++) {
                const d = new Date(today.getTime() + i * 86400000);
                days.push({
                    date: d.getFullYear() + '-' + (d.getMonth() + 1).toString().padStart(2, '0') + '-' + d.getDate().toString().padStart(2, '0'),
                    week: i === 0 ? '今天' : weekMap[d.getDay()],
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
            if (!this.token) return Promise.resolve();
            this.loading = true;
            return AUTH.getGroupList(this.token, { date: this.currentDate }).then(res => {
                this.loading = false;
                if (res && res._status === 0) {
                    const data = res.data || {};
                    this.groupList = data.list || res.data || [];
                } else {
                    this.groupList = [];
                }
            }).catch(() => {
                this.loading = false;
                this.groupList = [];
            });
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
$green: #8BC34A;
$blue: #81D4FA;
$gray: #9E9E9E;
$dark: #5C4B3A;
$light: #FFF3E8;
$border: #F0E6D8;
$cream: #FFF8F0;

.container {
    min-height: 100vh;
    background: $cream;
    padding-bottom: 40rpx;
}

// 顶部导航
.header {
    background: linear-gradient(135deg, #A5D6A7 0%, #FFF59D 40%, #FFCC80 100%);
    padding: 60rpx 30rpx 90rpx;
    text-align: center;
    position: relative;
    overflow: hidden;

    &::before {
        content: '🌿';
        position: absolute;
        top: 20rpx;
        left: 30rpx;
        font-size: 40rpx;
        opacity: 0.4;
    }

    &::after {
        content: '☁️';
        position: absolute;
        top: 30rpx;
        right: 40rpx;
        font-size: 36rpx;
        opacity: 0.35;
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
    margin: -50rpx 30rpx 24rpx;
    border-radius: 24rpx;
    box-shadow: 0 8rpx 32rpx rgba(140, 100, 60, 0.08);
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
    width: 92rpx;
    height: 128rpx;
    border-radius: 24rpx;
    margin: 0 8rpx;
    background: $light;
    transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    border: 2rpx solid transparent;

    &.active {
        background: linear-gradient(135deg, #FFCC80, #FF8C42);
        transform: scale(1.08);
        box-shadow: 0 6rpx 16rpx rgba(255, 140, 66, 0.25);
        border-color: rgba(255,255,255,0.4);
        .pill-week, .pill-date { color: #fff; text-shadow: 0 1rpx 2rpx rgba(0,0,0,0.1); }
    }

    &:active {
        transform: scale(0.95);
    }

    .pill-week {
        font-size: 20rpx;
        color: $gray;
        margin-bottom: 6rpx;
    }

    .pill-date {
        font-size: 36rpx;
        font-weight: bold;
        color: $dark;
    }
}

// 拼团列表
.group-list {
    padding: 0 30rpx 30rpx;
}

.group-card {
    background: #fff;
    border-radius: 28rpx;
    padding: 28rpx;
    margin-bottom: 24rpx;
    box-shadow: 0 8rpx 32rpx rgba(140, 100, 60, 0.06);
    transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s;
    border: 1rpx solid rgba(240, 230, 216, 0.6);

    &:active {
        transform: scale(0.97);
    }
}

.card-header {
    display: flex;
    align-items: center;
    margin-bottom: 20rpx;

    .room-img {
        width: 108rpx;
        height: 108rpx;
        border-radius: 20rpx;
        margin-right: 20rpx;
        background: $light;
        box-shadow: 0 4rpx 12rpx rgba(140, 100, 60, 0.08);
    }

    .room-info {
        flex: 1;

        .room-name {
            font-size: 30rpx;
            font-weight: bold;
            color: $dark;
            display: block;
            margin-bottom: 8rpx;
        }

        .room-time {
            display: flex;
            flex-wrap: wrap;
            gap: 8rpx;

            .time-tag {
                font-size: 22rpx;
                color: #8D6E63;
                background: linear-gradient(135deg, #FFF8E1, #FFF3E8);
                padding: 6rpx 16rpx;
                border-radius: 12rpx;
                border: 1rpx solid rgba(240, 230, 216, 0.5);
            }
        }
    }

    .status-tag {
        font-size: 22rpx;
        padding: 6rpx 16rpx;
        border-radius: 20rpx;
        margin-left: 16rpx;

        &.open {
            background: linear-gradient(135deg, #E8F5E9, #C8E6C9);
            color: #2E7D32;
        }

        &.full {
            background: linear-gradient(135deg, #FFF3E0, #FFE0B2);
            color: #E65100;
        }

        &.success {
            background: linear-gradient(135deg, #E3F2FD, #BBDEFB);
            color: #1565C0;
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
    border-top: 1rpx solid $border;
    border-bottom: 1rpx solid $border;
    margin-bottom: 16rpx;

    .initiator {
        display: flex;
        align-items: center;

        .initiator-avatar {
            width: 48rpx;
            height: 48rpx;
            border-radius: 50%;
            margin-right: 10rpx;
            background: $light;
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
            background: $light;
        }

        .member-more {
            width: 48rpx;
            height: 48rpx;
            border-radius: 50%;
            background: $light;
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

.card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .price-info {
        display: flex;
        align-items: baseline;

        .price-label {
            font-size: 22rpx;
            color: $gray;
            margin-right: 6rpx;
        }

        .price-num {
            font-size: 36rpx;
            font-weight: bold;
            color: $primary;
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
        background: linear-gradient(135deg, #FFF3E8, #FFE8D6);
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
            color: $primary;
        }
    }

    .progress-info {
        display: flex;
        align-items: center;
        gap: 12rpx;

        .progress-bar {
            width: 120rpx;
            height: 14rpx;
            background: #F0E6D8;
            border-radius: 8rpx;
            overflow: hidden;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #A5D6A7, #FFCC80);
            border-radius: 8rpx;
            transition: width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .progress-text {
            font-size: 24rpx;
            color: $gray;
            font-weight: 500;
        }
    }
}

// 空状态
.empty-section {
    text-align: center;
    padding: 100rpx 40rpx;

    .empty-icon {
        font-size: 100rpx;
        display: block;
        margin-bottom: 24rpx;
        animation: float 3s ease-in-out infinite;
    }

    @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-12rpx); }
    }

    .empty-title {
        font-size: 34rpx;
        font-weight: bold;
        color: $dark;
        display: block;
        margin-bottom: 12rpx;
    }

    .empty-sub {
        font-size: 26rpx;
        color: $gray;
        display: block;
        margin-bottom: 36rpx;
    }

    .empty-btn {
        display: inline-block;
        background: linear-gradient(135deg, #FFCC80, #FF8C42);
        color: #fff;
        font-size: 28rpx;
        font-weight: bold;
        padding: 22rpx 52rpx;
        border-radius: 44rpx;
        box-shadow: 0 6rpx 20rpx rgba(255, 140, 66, 0.3);
        transition: transform 0.2s;

        &:active {
            transform: scale(0.95);
        }
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
