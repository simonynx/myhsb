<template>
    <view class="container">
        <!-- 顶部装饰区域 -->
        <view class="header-deco">
            <text class="deco-leaf">🍃</text>
            <text class="deco-cloud">☁️</text>
            <text class="deco-flower">🌸</text>
        </view>

        <!-- 标签切换 -->
        <view class="tab-bar">
            <view
                class="tab-pill"
                :class="{ active: activeTab === 'initiated' }"
                @click="activeTab = 'initiated'"
            >
                <text class="tab-icon">🌱</text>
                <text class="tab-text">我发起的</text>
            </view>
            <view
                class="tab-pill"
                :class="{ active: activeTab === 'joined' }"
                @click="activeTab = 'joined'"
            >
                <text class="tab-icon">🌻</text>
                <text class="tab-text">我加入的</text>
            </view>
        </view>

        <!-- 拼团列表 -->
        <view class="group-list">
            <view
                class="group-card"
                v-for="group in currentList"
                :key="group.object_id"
                @click="goDetail(group.object_id)"
            >
                <!-- 左侧装饰色带 -->
                <view class="card-ribbon" :class="group.status"></view>

                <view class="card-inner">
                    <view class="card-header">
                        <image class="room-img" :src="group.room && group.room.image1" mode="aspectFill" />
                        <view class="room-info">
                            <text class="room-name">{{ group.room && group.room.name }}</text>
                            <view class="room-time">
                                <text class="time-tag">📅 {{ group.date }}</text>
                                <text class="time-tag">⏰ {{ group.begin_time }} ~ {{ group.end_time }}</text>
                            </view>
                        </view>
                        <view class="status-bubble" :class="group.status">
                            <text>{{ statusText(group.status) }}</text>
                        </view>
                    </view>

                    <view class="card-body">
                        <view class="initiator">
                            <image class="initiator-avatar" :src="group.initiator && group.initiator.avatar" mode="aspectFill" />
                            <view class="initiator-info">
                                <text class="initiator-name">{{ group.initiator && group.initiator.nickname }}</text>
                                <text class="initiator-label">发起人</text>
                            </view>
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
                            <text class="price-num">¥{{ (group.price_per_person / 100).toFixed(2) }}</text>
                        </view>
                        <view class="progress-block">
                            <view class="progress-bar">
                                <view class="progress-fill" :style="{ width: progressWidth(group) }"></view>
                            </view>
                            <text class="progress-text">{{ group.current_members || 1 }}/{{ group.max_members }} 人</text>
                        </view>
                    </view>
                </view>
            </view>

            <!-- 空状态 -->
            <view class="empty-state" v-if="currentList.length === 0">
                <view class="empty-illustration">
                    <text class="empty-icon">{{ activeTab === 'initiated' ? '🌱' : '🌻' }}</text>
                    <view class="empty-ring"></view>
                </view>
                <text class="empty-title">{{ activeTab === 'initiated' ? '还没有发起过拼团' : '还没有加入过拼团' }}</text>
                <text class="empty-sub">去拼团广场逛逛，和小伙伴一起约起来吧～</text>
                <view class="empty-btn" @click="goGroup">
                    <text>🎮 去拼团广场</text>
                </view>
            </view>
        </view>
    </view>
</template>

<script>
import { mapState } from 'vuex';
import AUTH from '@/utils/auth';

export default {
    data() {
        return {
            activeTab: 'initiated',
            initiatedList: [],
            joinedList: []
        };
    },
    computed: {
        ...mapState(['token']),
        currentList() {
            return this.activeTab === 'initiated' ? this.initiatedList : this.joinedList;
        }
    },
    onShow() {
        this.loadData();
    },
    methods: {
        async loadData() {
            if (!this.token) {
                uni.showToast({ title: '请先登录', icon: 'none' });
                return;
            }
            try {
                const res = await AUTH.myGroups(this.token);
                if (res._status === 0) {
                    this.initiatedList = res.data.initiated || [];
                    this.joinedList = res.data.joined || [];
                }
            } catch (e) {
                console.error('加载我的拼团失败', e);
            }
        },
        goDetail(id) {
            uni.navigateTo({ url: `/pages/group/detail?id=${id}` });
        },
        goGroup() {
            uni.switchTab({ url: '/pages/group/group' });
        },
        statusText(status) {
            const map = { open: '拼团中', full: '已满员', success: '已完成', cancelled: '已取消' };
            return map[status] || status;
        },
        progressWidth(group) {
            const current = group.current_members || 1;
            const max = group.max_members || 1;
            return `${(current / max) * 100}%`;
        }
    }
};
</script>

<style scoped>
.container {
    min-height: 100vh;
    background: #FFF8F0;
}

/* 顶部装饰 */
.header-deco {
    position: relative;
    height: 60rpx;
    overflow: hidden;
}

.deco-leaf {
    position: absolute;
    top: 10rpx;
    left: 40rpx;
    font-size: 36rpx;
    opacity: 0.35;
    animation: sway 4s ease-in-out infinite;
}

.deco-cloud {
    position: absolute;
    top: 8rpx;
    right: 60rpx;
    font-size: 32rpx;
    opacity: 0.3;
    animation: drift 6s ease-in-out infinite;
}

.deco-flower {
    position: absolute;
    top: 16rpx;
    left: 50%;
    font-size: 28rpx;
    opacity: 0.25;
    animation: sway 5s ease-in-out infinite reverse;
}

@keyframes sway {
    0%, 100% { transform: rotate(-6deg); }
    50% { transform: rotate(6deg); }
}

@keyframes drift {
    0%, 100% { transform: translateX(0); }
    50% { transform: translateX(16rpx); }
}

/* 标签切换 */
.tab-bar {
    display: flex;
    justify-content: center;
    gap: 20rpx;
    padding: 20rpx 30rpx 30rpx;
}

.tab-pill {
    display: flex;
    align-items: center;
    gap: 10rpx;
    padding: 16rpx 36rpx;
    border-radius: 40rpx;
    background: #fff;
    box-shadow: 0 4rpx 16rpx rgba(140, 100, 60, 0.06);
    border: 2rpx solid rgba(240, 230, 216, 0.5);
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.tab-pill.active {
    background: linear-gradient(135deg, #FFCC80, #FF8C42);
    border-color: transparent;
    box-shadow: 0 6rpx 20rpx rgba(255, 140, 66, 0.25);
    transform: scale(1.05);
}

.tab-pill.active .tab-text {
    color: #fff;
    font-weight: bold;
}

.tab-icon {
    font-size: 32rpx;
}

.tab-text {
    font-size: 28rpx;
    color: #5C4B3A;
    transition: color 0.2s;
}

/* 拼团列表 */
.group-list {
    padding: 0 30rpx 40rpx;
}

.group-card {
    display: flex;
    background: #fff;
    border-radius: 28rpx;
    margin-bottom: 24rpx;
    box-shadow: 0 8rpx 32rpx rgba(140, 100, 60, 0.06);
    border: 1rpx solid rgba(240, 230, 216, 0.5);
    overflow: hidden;
    transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s;
}

.group-card:active {
    transform: scale(0.97);
}

.card-ribbon {
    width: 10rpx;
    flex-shrink: 0;
}

.card-ribbon.open { background: linear-gradient(180deg, #A5D6A7, #81C784); }
.card-ribbon.full { background: linear-gradient(180deg, #FFCC80, #FFB74D); }
.card-ribbon.success { background: linear-gradient(180deg, #81D4FA, #4FC3F7); }
.card-ribbon.cancelled { background: linear-gradient(180deg, #E0E0E0, #BDBDBD); }

.card-inner {
    flex: 1;
    padding: 24rpx 24rpx 24rpx 20rpx;
}

.card-header {
    display: flex;
    align-items: flex-start;
    margin-bottom: 20rpx;
}

.room-img {
    width: 108rpx;
    height: 108rpx;
    border-radius: 20rpx;
    margin-right: 20rpx;
    background: #FFF3E8;
    box-shadow: 0 4rpx 12rpx rgba(140, 100, 60, 0.08);
    flex-shrink: 0;
}

.room-info {
    flex: 1;
    min-width: 0;
}

.room-name {
    font-size: 30rpx;
    font-weight: bold;
    color: #5C4B3A;
    margin-bottom: 10rpx;
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.room-time {
    display: flex;
    flex-wrap: wrap;
    gap: 8rpx;
}

.time-tag {
    font-size: 22rpx;
    color: #8D6E63;
    background: linear-gradient(135deg, #FFF8E1, #FFF3E8);
    padding: 6rpx 14rpx;
    border-radius: 12rpx;
    border: 1rpx solid rgba(240, 230, 216, 0.5);
}

.status-bubble {
    font-size: 22rpx;
    padding: 8rpx 18rpx;
    border-radius: 20rpx;
    font-weight: bold;
    margin-left: 16rpx;
    flex-shrink: 0;
    white-space: nowrap;
}

.status-bubble.open {
    background: linear-gradient(135deg, #E8F5E9, #C8E6C9);
    color: #2E7D32;
}

.status-bubble.full {
    background: linear-gradient(135deg, #FFF3E0, #FFE0B2);
    color: #E65100;
}

.status-bubble.success {
    background: linear-gradient(135deg, #E3F2FD, #BBDEFB);
    color: #1565C0;
}

.status-bubble.cancelled {
    background: #F5F5F5;
    color: #9E9E9E;
}

.card-body {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 18rpx 0;
    border-top: 1rpx dashed rgba(240, 230, 216, 0.8);
    border-bottom: 1rpx dashed rgba(240, 230, 216, 0.8);
    margin-bottom: 18rpx;
}

.initiator {
    display: flex;
    align-items: center;
}

.initiator-avatar {
    width: 52rpx;
    height: 52rpx;
    border-radius: 50%;
    margin-right: 14rpx;
    border: 2rpx solid #FFF3E8;
    box-shadow: 0 2rpx 6rpx rgba(140, 100, 60, 0.1);
}

.initiator-info {
    display: flex;
    flex-direction: column;
}

.initiator-name {
    font-size: 26rpx;
    color: #5C4B3A;
    font-weight: 500;
}

.initiator-label {
    font-size: 20rpx;
    color: #FF8C42;
    background: linear-gradient(135deg, #FFF3E8, #FFE8D6);
    padding: 2rpx 10rpx;
    border-radius: 10rpx;
    margin-top: 4rpx;
    align-self: flex-start;
}

.members-preview {
    display: flex;
    align-items: center;
}

.member-avatar {
    width: 48rpx;
    height: 48rpx;
    border-radius: 50%;
    margin-left: -12rpx;
    border: 2rpx solid #fff;
    box-shadow: 0 2rpx 4rpx rgba(0,0,0,0.08);
}

.member-more {
    width: 48rpx;
    height: 48rpx;
    border-radius: 50%;
    background: linear-gradient(135deg, #FFF3E8, #FFE8D6);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: -12rpx;
    border: 2rpx solid #fff;
    font-size: 20rpx;
    color: #8D6E63;
    box-shadow: 0 2rpx 4rpx rgba(0,0,0,0.08);
}

.card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.price-info {
    display: flex;
    align-items: baseline;
}

.price-label {
    font-size: 24rpx;
    color: #9E9E9E;
    margin-right: 8rpx;
}

.price-num {
    font-size: 34rpx;
    font-weight: bold;
    color: #FF8C42;
}

.progress-block {
    display: flex;
    align-items: center;
    gap: 12rpx;
}

.progress-bar {
    width: 140rpx;
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
    font-size: 22rpx;
    color: #9E9E9E;
    font-weight: 500;
}

/* 空状态 */
.empty-state {
    text-align: center;
    padding: 120rpx 40rpx;
}

.empty-illustration {
    position: relative;
    width: 140rpx;
    height: 140rpx;
    margin: 0 auto 30rpx;
    display: flex;
    align-items: center;
    justify-content: center;
}

.empty-icon {
    font-size: 80rpx;
    z-index: 1;
    animation: float 3s ease-in-out infinite;
}

.empty-ring {
    position: absolute;
    width: 120rpx;
    height: 120rpx;
    border-radius: 50%;
    background: linear-gradient(135deg, #FFF3E8, #FFE8D6);
    opacity: 0.6;
    animation: pulse 3s ease-in-out infinite;
}

@keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-12rpx); }
}

@keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 0.6; }
    50% { transform: scale(1.15); opacity: 0.3; }
}

.empty-title {
    font-size: 32rpx;
    font-weight: bold;
    color: #5C4B3A;
    display: block;
    margin-bottom: 12rpx;
}

.empty-sub {
    font-size: 26rpx;
    color: #9E9E9E;
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
}

.empty-btn:active {
    transform: scale(0.95);
}
</style>
