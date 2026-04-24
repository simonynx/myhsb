<template>
    <view class="container">
        <!-- 标签切换 -->
        <view class="tab-bar">
            <view
                class="tab-item"
                :class="{ active: activeTab === 'initiated' }"
                @click="activeTab = 'initiated'"
            >
                <text>我发起的</text>
            </view>
            <view
                class="tab-item"
                :class="{ active: activeTab === 'joined' }"
                @click="activeTab = 'joined'"
            >
                <text>我加入的</text>
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
                        <text class="price-num">¥{{ (group.price_per_person / 100).toFixed(2) }}</text>
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
            <view class="empty-state" v-if="currentList.length === 0">
                <text class="empty-text">暂无{{ activeTab === 'initiated' ? '发起' : '加入' }}的拼团</text>
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
    background: #f5f6fa;
}
.tab-bar {
    display: flex;
    background: #fff;
    border-bottom: 1rpx solid #eee;
}
.tab-item {
    flex: 1;
    text-align: center;
    padding: 24rpx 0;
    font-size: 28rpx;
    color: #666;
    position: relative;
}
.tab-item.active {
    color: #667eea;
    font-weight: bold;
}
.tab-item.active::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 30%;
    right: 30%;
    height: 4rpx;
    background: #667eea;
    border-radius: 2rpx;
}
.group-list {
    padding: 20rpx;
}
.group-card {
    background: #fff;
    border-radius: 16rpx;
    margin-bottom: 20rpx;
    padding: 24rpx;
    box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06);
}
.card-header {
    display: flex;
    align-items: center;
    margin-bottom: 20rpx;
}
.room-img {
    width: 120rpx;
    height: 120rpx;
    border-radius: 12rpx;
    margin-right: 20rpx;
}
.room-info {
    flex: 1;
}
.room-name {
    font-size: 30rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 8rpx;
}
.room-time {
    display: flex;
    flex-wrap: wrap;
    gap: 8rpx;
}
.time-tag {
    font-size: 22rpx;
    color: #666;
    background: #f0f0f0;
    padding: 4rpx 12rpx;
    border-radius: 8rpx;
}
.status-tag {
    font-size: 22rpx;
    padding: 6rpx 16rpx;
    border-radius: 20rpx;
    font-weight: bold;
}
.status-tag.open { background: #e3f2fd; color: #1976d2; }
.status-tag.full { background: #fff3e0; color: #f57c00; }
.status-tag.success { background: #e8f5e9; color: #388e3c; }
.status-tag.cancelled { background: #fce4ec; color: #c2185b; }
.card-body {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16rpx 0;
    border-top: 1rpx solid #f0f0f0;
    border-bottom: 1rpx solid #f0f0f0;
    margin-bottom: 16rpx;
}
.initiator {
    display: flex;
    align-items: center;
}
.initiator-avatar {
    width: 48rpx;
    height: 48rpx;
    border-radius: 50%;
    margin-right: 12rpx;
}
.initiator-name {
    font-size: 26rpx;
    color: #333;
    margin-right: 8rpx;
}
.initiator-label {
    font-size: 20rpx;
    color: #667eea;
    background: #eef1ff;
    padding: 2rpx 8rpx;
    border-radius: 8rpx;
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
}
.member-more {
    width: 48rpx;
    height: 48rpx;
    border-radius: 50%;
    background: #f0f0f0;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: -12rpx;
    border: 2rpx solid #fff;
    font-size: 20rpx;
    color: #666;
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
    color: #999;
    margin-right: 8rpx;
}
.price-num {
    font-size: 32rpx;
    font-weight: bold;
    color: #ff4757;
}
.progress-info {
    display: flex;
    align-items: center;
    gap: 12rpx;
}
.progress-bar {
    width: 120rpx;
    height: 8rpx;
    background: #f0f0f0;
    border-radius: 4rpx;
    overflow: hidden;
}
.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #667eea, #764ba2);
    border-radius: 4rpx;
    transition: width 0.3s;
}
.progress-text {
    font-size: 22rpx;
    color: #666;
}
.empty-state {
    text-align: center;
    padding: 120rpx 40rpx;
}
.empty-text {
    font-size: 28rpx;
    color: #999;
}
</style>
