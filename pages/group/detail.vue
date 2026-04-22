<template>
    <view class="container">
        <!-- 加载中 -->
        <view class="loading-wrap" v-if="loading">
            <text class="loading-text">加载中...</text>
        </view>

        <block v-else-if="group.object_id">
            <!-- 房间信息 -->
            <view class="room-card">
                <image class="room-img" :src="group.room && group.room.image1" mode="aspectFill" />
                <view class="room-info">
                    <text class="room-name">{{ group.room && group.room.name }}</text>
                    <view class="room-tags" v-if="group.room && group.room.tags">
                        <text class="tag" v-for="t in roomTags" :key="t">{{ t }}</text>
                    </view>
                </view>
            </view>

            <!-- 拼团信息 -->
            <view class="info-card">
                <view class="info-row">
                    <text class="info-label">预约日期</text>
                    <text class="info-value">{{ group.date }}</text>
                </view>
                <view class="info-row">
                    <text class="info-label">预约时段</text>
                    <text class="info-value">{{ group.begin_time }} ~ {{ group.end_time }}</text>
                </view>
                <view class="info-row">
                    <text class="info-label">人均费用</text>
                    <text class="info-value price">¥{{ group.price_per_person / 100 }}</text>
                </view>
                <view class="info-row">
                    <text class="info-label">目标人数</text>
                    <text class="info-value">{{ group.max_members }} 人</text>
                </view>
                <view class="info-row" v-if="group.note">
                    <text class="info-label">备注</text>
                    <text class="info-value">{{ group.note }}</text>
                </view>
                <view class="info-row">
                    <text class="info-label">状态</text>
                    <view class="status-badge" :class="group.status">{{ statusText(group.status) }}</view>
                </view>
            </view>

            <!-- 成员列表 -->
            <view class="members-card">
                <view class="card-title">
                    <text>参与成员</text>
                    <text class="member-count">{{ group.current_members || 1 }}/{{ group.max_members }}</text>
                </view>

                <view class="member-list">
                    <!-- 发起人 -->
                    <view class="member-item">
                        <image class="member-avatar" :src="group.initiator && group.initiator.avatar" mode="aspectFill" />
                        <view class="member-meta">
                            <text class="member-name">{{ group.initiator && group.initiator.nickname }}</text>
                            <text class="member-role">发起人</text>
                        </view>
                    </view>

                    <!-- 成员 -->
                    <view class="member-item" v-for="(m, i) in group.members" :key="i">
                        <image class="member-avatar" :src="m.avatar" mode="aspectFill" />
                        <view class="member-meta">
                            <text class="member-name">{{ m.nickname }}</text>
                            <text class="member-role">已支付</text>
                        </view>
                    </view>

                    <!-- 占位 -->
                    <view class="member-item placeholder" v-for="i in placeholderCount" :key="'p' + i">
                        <view class="member-avatar empty">?</view>
                        <view class="member-meta">
                            <text class="member-name">待加入</text>
                            <text class="member-role">虚位以待</text>
                        </view>
                    </view>
                </view>

                <!-- 进度条 -->
                <view class="progress-wrap">
                    <view class="progress-bar">
                        <view class="progress-fill" :style="{ width: progressWidth }"></view>
                    </view>
                    <text class="progress-text">还差 {{ remainingCount }} 人成团</text>
                </view>
            </view>

            <!-- 倒计时 -->
            <view class="countdown-card" v-if="group.status === 'open' && expireTime">
                <text class="countdown-label">⏰ 拼团截止</text>
                <text class="countdown-value">{{ countdownText }}</text>
            </view>
        </block>

        <!-- 底部操作栏 -->
        <view class="bottom-bar" v-if="group.object_id">
            <view class="share-btn" @click="shareGroup">
                <text class="yticon icon-fenxiang2"></text>
                <text>邀请好友</text>
            </view>

            <view class="action-btn primary" v-if="isInitiator && group.status === 'open'" @click="handleCancel">
                <text>取消拼团</text>
            </view>
            <view class="action-btn warn" v-else-if="isMember && group.status === 'open'" @click="handleLeave">
                <text>退出拼团</text>
            </view>
            <view class="action-btn primary" v-else-if="canJoin" @click="handleJoin">
                <text>加入拼团</text>
            </view>
            <view class="action-btn disabled" v-else>
                <text>{{ group.status === 'full' ? '已满员' : '已结束' }}</text>
            </view>
        </view>
    </view>
</template>

<script>
import { mapState } from 'vuex';
import AUTH from '../../utils/auth.js';

export default {
    data() {
        return {
            groupId: '',
            group: {},
            loading: true,
            countdownTimer: null,
            countdownText: '',
        };
    },

    computed: {
        ...mapState(['token', 'userInfo']),
        roomTags() {
            const tags = this.group.room && this.group.room.tags;
            if (!tags) return [];
            return tags.split(',').map(t => t.trim()).filter(Boolean);
        },
        isInitiator() {
            if (!this.userInfo || !this.group.initiator) return false;
            return String(this.userInfo.object_id) === String(this.group.initiator.object_id);
        },
        isMember() {
            if (!this.userInfo || !this.group.members) return false;
            return this.group.members.some(m => String(m.user_id) === String(this.userInfo.object_id));
        },
        canJoin() {
            if (this.group.status !== 'open') return false;
            if (this.isInitiator || this.isMember) return false;
            return (this.group.current_members || 1) < (this.group.max_members || 4);
        },
        progressWidth() {
            const curr = this.group.current_members || 1;
            const max = this.group.max_members || 4;
            return Math.min(100, (curr / max) * 100) + '%';
        },
        remainingCount() {
            const max = this.group.max_members || 4;
            const curr = this.group.current_members || 1;
            return Math.max(0, max - curr);
        },
        placeholderCount() {
            const max = this.group.max_members || 4;
            const curr = this.group.current_members || 1;
            return Math.max(0, max - curr);
        },
        expireTime() {
            if (!this.group.expire_at) return null;
            return new Date(this.group.expire_at).getTime();
        },
    },

    onLoad(options) {
        this.groupId = options.id || '';
        if (this.groupId) {
            this.loadDetail();
        }
    },

    onShow() {
        if (this.groupId) {
            this.loadDetail();
        }
    },

    onUnload() {
        this.clearCountdown();
    },

    onShareAppMessage() {
        const roomName = this.group.room && this.group.room.name;
        return {
            title: roomName ? '快来加入我的「' + roomName + '」拼团！' : '快来加入我的拼团！',
            path: '/pages/group/detail?id=' + this.groupId,
            imageUrl: '/static/logo_small.jpg',
        };
    },

    methods: {
        loadDetail() {
            this.loading = true;
            AUTH.getGroupDetail(this.token, this.groupId).then(res => {
                this.loading = false;
                if (res && res._status === 0 && res.data) {
                    this.group = res.data;
                    this.startCountdown();
                } else {
                    uni.showToast({ title: (res && res._reason) || '加载失败', icon: 'none' });
                }
            }).catch(() => {
                this.loading = false;
                uni.showToast({ title: '加载失败', icon: 'none' });
            });
        },

        statusText(status) {
            const map = { open: '拼团中', full: '已满员', success: '已完成', cancelled: '已取消' };
            return map[status] || status;
        },

        startCountdown() {
            this.clearCountdown();
            if (!this.expireTime || this.group.status !== 'open') return;
            const update = () => {
                const now = Date.now();
                const diff = this.expireTime - now;
                if (diff <= 0) {
                    this.countdownText = '已截止';
                    this.clearCountdown();
                    return;
                }
                const h = Math.floor(diff / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                const s = Math.floor((diff % 60000) / 1000);
                this.countdownText = `${h}时${m}分${s}秒`;
            };
            update();
            this.countdownTimer = setInterval(update, 1000);
        },

        clearCountdown() {
            if (this.countdownTimer) {
                clearInterval(this.countdownTimer);
                this.countdownTimer = null;
            }
        },

        handleJoin() {
            if (!this.canJoin) return;
            uni.showModal({
                title: '加入拼团',
                content: '加入拼团将支付 ¥' + (this.group.price_per_person / 100) + '，是否确认？',
                success: (res) => {
                    if (res.confirm) {
                        uni.showLoading({ title: '处理中...' });
                        AUTH.joinGroup(this.token, this.groupId).then(res => {
                            uni.hideLoading();
                            if (res && res._status === 0) {
                                uni.showToast({ title: '加入成功', icon: 'success' });
                                this.loadDetail();
                            } else {
                                var msg = (res && res._reason) || '加入失败';
                                if (msg.indexOf('余额不足') !== -1) {
                                    uni.showModal({
                                        title: '余额不足',
                                        content: '是否去充值？',
                                        success: (r) => {
                                            if (r.confirm) uni.navigateTo({ url: '/pages/user/deposit/deposit' });
                                        }
                                    });
                                } else {
                                    uni.showToast({ title: msg, icon: 'none' });
                                }
                            }
                        }).catch(() => {
                            uni.hideLoading();
                            uni.showToast({ title: '加入失败', icon: 'none' });
                        });
                    }
                }
            });
        },

        handleLeave() {
            uni.showModal({
                title: '退出拼团',
                content: '退出后将退还已支付的费用，是否确认？',
                success: (res) => {
                    if (res.confirm) {
                        uni.showLoading({ title: '处理中...' });
                        AUTH.leaveGroup(this.token, this.groupId).then(res => {
                            uni.hideLoading();
                            if (res && res._status === 0) {
                                uni.showToast({ title: '已退出', icon: 'success' });
                                this.loadDetail();
                            } else {
                                uni.showToast({ title: (res && res._reason) || '退出失败', icon: 'none' });
                            }
                        }).catch(() => {
                            uni.hideLoading();
                            uni.showToast({ title: '退出失败', icon: 'none' });
                        });
                    }
                }
            });
        },

        handleCancel() {
            uni.showModal({
                title: '取消拼团',
                content: '取消后所有成员（包括你）都将退款，是否确认？',
                success: (res) => {
                    if (res.confirm) {
                        uni.showLoading({ title: '处理中...' });
                        AUTH.cancelGroup(this.token, this.groupId).then(res => {
                            uni.hideLoading();
                            if (res && res._status === 0) {
                                uni.showToast({ title: '已取消', icon: 'success' });
                                setTimeout(() => uni.navigateBack(), 1500);
                            } else {
                                uni.showToast({ title: (res && res._reason) || '取消失败', icon: 'none' });
                            }
                        }).catch(() => {
                            uni.hideLoading();
                            uni.showToast({ title: '取消失败', icon: 'none' });
                        });
                    }
                }
            });
        },

        shareGroup() {
            // 触发系统分享
            // #ifdef MP-WEIXIN
            // onShareAppMessage 已定义，用户点击右上角分享或按钮即可
            uni.showShareMenu({ withShareTicket: true });
            // #endif
            uni.showToast({ title: '点击右上角分享邀请好友', icon: 'none' });
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
    padding-bottom: calc(140rpx + env(safe-area-inset-bottom));
}

.loading-wrap {
    text-align: center;
    padding: 200rpx 40rpx;
    .loading-text { font-size: 28rpx; color: $gray; }
}

// 房间卡片
.room-card {
    margin: 20rpx;
    background: #fff;
    border-radius: 20rpx;
    overflow: hidden;
    box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);

    .room-img {
        width: 100%;
        height: 320rpx;
        background: $light;
    }

    .room-info {
        padding: 20rpx 24rpx;

        .room-name {
            font-size: 32rpx;
            font-weight: bold;
            color: $dark;
            display: block;
            margin-bottom: 10rpx;
        }

        .room-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 8rpx;

            .tag {
                font-size: 22rpx;
                color: $primary;
                background: #FFF0EB;
                padding: 4rpx 12rpx;
                border-radius: 8rpx;
            }
        }
    }
}

// 信息卡片
.info-card {
    margin: 0 20rpx 20rpx;
    background: #fff;
    border-radius: 20rpx;
    padding: 20rpx 24rpx;
    box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);

    .info-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16rpx 0;
        border-bottom: 1rpx solid $border;

        &:last-child { border-bottom: none; }

        .info-label {
            font-size: 28rpx;
            color: $gray;
        }

        .info-value {
            font-size: 28rpx;
            color: $dark;
            font-weight: bold;

            &.price {
                color: $primary;
                font-size: 32rpx;
            }
        }
    }

    .status-badge {
        font-size: 22rpx;
        padding: 6rpx 16rpx;
        border-radius: 20rpx;

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

// 成员卡片
.members-card {
    margin: 0 20rpx 20rpx;
    background: #fff;
    border-radius: 20rpx;
    padding: 24rpx;
    box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);

    .card-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20rpx;
        font-size: 30rpx;
        font-weight: bold;
        color: $dark;

        .member-count {
            font-size: 26rpx;
            color: $primary;
        }
    }

    .member-list {
        display: flex;
        flex-wrap: wrap;
        gap: 20rpx;
        margin-bottom: 24rpx;
    }

    .member-item {
        display: flex;
        align-items: center;
        background: $light;
        border-radius: 16rpx;
        padding: 12rpx 20rpx;
        min-width: 180rpx;

        &.placeholder {
            opacity: 0.6;
            background: #FAFAFA;
        }

        .member-avatar {
            width: 56rpx;
            height: 56rpx;
            border-radius: 50%;
            margin-right: 12rpx;
            background: #ddd;

            &.empty {
                background: #ddd;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24rpx;
                color: #fff;
            }
        }

        .member-meta {
            .member-name {
                font-size: 26rpx;
                color: $dark;
                display: block;
            }

            .member-role {
                font-size: 20rpx;
                color: $gray;
            }
        }
    }

    .progress-wrap {
        .progress-bar {
            width: 100%;
            height: 16rpx;
            background: #EEEEEE;
            border-radius: 8rpx;
            overflow: hidden;
            margin-bottom: 10rpx;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, $pink, $primary);
            border-radius: 8rpx;
            transition: width 0.3s;
        }

        .progress-text {
            font-size: 24rpx;
            color: $gray;
            text-align: center;
            display: block;
        }
    }
}

// 倒计时
.countdown-card {
    margin: 0 20rpx 20rpx;
    background: linear-gradient(135deg, #FFF0EB, #FFE6F0);
    border-radius: 20rpx;
    padding: 24rpx;
    text-align: center;

    .countdown-label {
        font-size: 26rpx;
        color: $dark;
        display: block;
        margin-bottom: 10rpx;
    }

    .countdown-value {
        font-size: 40rpx;
        font-weight: bold;
        color: $primary;
    }
}

// 底部操作栏
.bottom-bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    padding: 20rpx 30rpx;
    padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
    background: #fff;
    border-top: 1rpx solid $border;
    box-shadow: 0 -2rpx 12rpx rgba(0,0,0,0.04);

    .share-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        margin-right: 24rpx;
        padding: 0 16rpx;

        text {
            font-size: 20rpx;
            color: $gray;
            margin-top: 4rpx;
        }
    }

    .action-btn {
        flex: 1;
        height: 84rpx;
        border-radius: 42rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 30rpx;
        font-weight: bold;
        color: #fff;
        transition: background 0.2s;

        &.primary {
            background: $primary;
        }

        &.warn {
            background: #FF3B30;
        }

        &.disabled {
            background: #CCC;
        }
    }
}
</style>
