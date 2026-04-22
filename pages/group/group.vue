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
                    <view class="progress-info">
                        <view class="progress-bar">
                            <view class="progress-fill" :style="{ width: progressWidth(group) }"></view>
                        </view>
                        <text class="progress-text">{{ group.current_members || 1 }}/{{ group.max_members }} 人</text>
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
        };
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

        goAppoint() {
            uni.switchTab({ url: '/pages/tabBar/appoint/appoint' });
        },
    },
};
</script>

<style lang="scss">
$primary: #FF6432;
$pink: #FF9ECD;
$gray: #999;
$dark: #333;
$light: #F5F6F7;
$border: #EEEEEE;

.container {
    min-height: 100vh;
    background: #F8F8F8;
    padding-bottom: 40rpx;
}

// 顶部导航
.header {
    background: linear-gradient(135deg, $pink, $primary);
    padding: 60rpx 30rpx 80rpx;
    text-align: center;

    .header-title {
        font-size: 40rpx;
        font-weight: bold;
        color: #fff;
        display: block;
    }

    .header-sub {
        font-size: 26rpx;
        color: rgba(255,255,255,0.85);
        margin-top: 10rpx;
        display: block;
    }
}

// 日期筛选
.date-bar {
    background: #fff;
    padding: 20rpx 0;
    margin: -40rpx 30rpx 20rpx;
    border-radius: 20rpx;
    box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.06);
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
    height: 120rpx;
    border-radius: 20rpx;
    margin: 0 8rpx;
    background: $light;
    transition: all 0.2s;

    &.active {
        background: $primary;
        .pill-week, .pill-date { color: #fff; }
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
    padding: 0 30rpx;
}

.group-card {
    background: #fff;
    border-radius: 20rpx;
    padding: 24rpx;
    margin-bottom: 20rpx;
    box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);
}

.card-header {
    display: flex;
    align-items: center;
    margin-bottom: 20rpx;

    .room-img {
        width: 100rpx;
        height: 100rpx;
        border-radius: 16rpx;
        margin-right: 20rpx;
        background: $light;
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
                color: $primary;
                background: #FFF0EB;
                padding: 4rpx 12rpx;
                border-radius: 8rpx;
            }
        }
    }

    .status-tag {
        font-size: 22rpx;
        padding: 6rpx 16rpx;
        border-radius: 20rpx;
        margin-left: 16rpx;

        &.open {
            background: #E6F7FF;
            color: #1890FF;
        }

        &.full {
            background: #F6FFED;
            color: #52C41A;
        }

        &.success {
            background: #FFF7E6;
            color: #FA8C16;
        }

        &.cancelled {
            background: #F5F5F5;
            color: $gray;
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

    .progress-info {
        display: flex;
        align-items: center;
        gap: 12rpx;

        .progress-bar {
            width: 120rpx;
            height: 12rpx;
            background: #EEEEEE;
            border-radius: 6rpx;
            overflow: hidden;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, $pink, $primary);
            border-radius: 6rpx;
            transition: width 0.3s;
        }

        .progress-text {
            font-size: 24rpx;
            color: $gray;
        }
    }
}

// 空状态
.empty-section {
    text-align: center;
    padding: 80rpx 40rpx;

    .empty-icon {
        font-size: 80rpx;
        display: block;
        margin-bottom: 20rpx;
    }

    .empty-title {
        font-size: 32rpx;
        font-weight: bold;
        color: $dark;
        display: block;
        margin-bottom: 10rpx;
    }

    .empty-sub {
        font-size: 26rpx;
        color: $gray;
        display: block;
        margin-bottom: 30rpx;
    }

    .empty-btn {
        display: inline-block;
        background: $primary;
        color: #fff;
        font-size: 28rpx;
        font-weight: bold;
        padding: 20rpx 48rpx;
        border-radius: 40rpx;
    }
}

.load-more {
    text-align: center;
    padding: 30rpx;

    .load-text {
        font-size: 24rpx;
        color: $gray;
    }
}
</style>
