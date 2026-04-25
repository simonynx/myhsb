<template>
    <view class="container">
        <!-- 加载中 -->
        <view class="loading-wrap" v-if="loading">
            <text class="loading-icon">🌿</text>
            <text class="loading-text">加载中...</text>
        </view>

        <block v-else-if="group.object_id">
            <!-- 顶部装饰 -->
            <view class="header-deco">
                <text class="deco-cloud">☁️</text>
                <text class="deco-bird">🐦</text>
                <text class="deco-leaf">🍃</text>
            </view>

            <!-- 房间信息卡片（大图+信息） -->
            <view class="room-card" @click="goRoomDetail">
                <image class="room-img" :src="group.room && group.room.image1" mode="aspectFill" />
                <view class="room-img-mask"></view>
                <view class="room-info-overlay">
                    <text class="room-name">{{ group.room && group.room.name }}</text>
                    <view class="room-tags" v-if="group.room && group.room.tags">
                        <text class="tag" v-for="t in roomTags" :key="t">{{ t }}</text>
                    </view>
                    <view class="room-arrow">
                        <text>查看房间详情 →</text>
                    </view>
                </view>
            </view>

            <!-- 时间信息 -->
            <view class="time-card">
                <view class="time-row">
                    <text class="time-icon">📅</text>
                    <view class="time-content">
                        <text class="time-label">预约日期</text>
                        <text class="time-value">{{ group.date }}</text>
                    </view>
                </view>
                <view class="time-divider"></view>
                <view class="time-row">
                    <text class="time-icon">⏰</text>
                    <view class="time-content">
                        <text class="time-label">预约时段</text>
                        <text class="time-value">{{ group.begin_time }} ~ {{ group.end_time }}</text>
                    </view>
                </view>
                <view class="time-divider"></view>
                <view class="time-row">
                    <text class="time-icon">👥</text>
                    <view class="time-content">
                        <text class="time-label">目标人数</text>
                        <text class="time-value">{{ group.max_members }} 人</text>
                    </view>
                </view>
            </view>

            <!-- 发起人留言 / 备注（突出显示） -->
            <view class="note-card" v-if="group.note">
                <view class="note-header">
                    <image class="note-avatar" :src="group.initiator && group.initiator.avatar" mode="aspectFill" />
                    <view class="note-author">
                        <text class="note-name">{{ group.initiator && group.initiator.nickname }}</text>
                        <text class="note-label">发起人的话</text>
                    </view>
                    <text class="note-quote">❝</text>
                </view>
                <view class="note-body">
                    <text class="note-text">{{ group.note }}</text>
                </view>
                <view class="note-footer">
                    <text class="note-signature">— {{ group.initiator && group.initiator.nickname }}</text>
                </view>
            </view>

            <!-- 费用明细 -->
            <view class="cost-card">
                <view class="section-title">
                    <text class="section-icon">💰</text>
                    <text>费用明细</text>
                </view>
                <view class="cost-row">
                    <text class="cost-label">房间小时费</text>
                    <text class="cost-value">¥{{ (group.room_hour_price / 100).toFixed(2) }} × {{ group.duration }}小时</text>
                </view>
                <view class="cost-row">
                    <text class="cost-label">人头费</text>
                    <text class="cost-value">¥{{ (group.room_person_price / 100).toFixed(2) }} × {{ group.max_members }}人</text>
                </view>
                <view class="cost-row discount" v-if="group.group_discount_amount">
                    <text class="cost-label">拼团折扣</text>
                    <text class="cost-value discount-val">-¥{{ (group.group_discount_amount / 100).toFixed(2) }}</text>
                </view>
                <view class="cost-divider"></view>
                <view class="cost-row total">
                    <text class="cost-label">基础总价</text>
                    <text class="cost-value total-val">¥{{ (group.base_cost / 100).toFixed(2) }}</text>
                </view>
                <view class="cost-row total">
                    <text class="cost-label">成员人均</text>
                    <text class="cost-value total-val">¥{{ (group.price_per_person / 100).toFixed(2) }}</text>
                </view>
            </view>

            <!-- 发起人费用 -->
            <view class="cost-card initiator-cost" v-if="group.initiator_base">
                <view class="section-title">
                    <text class="section-icon">👤</text>
                    <text>发起人费用</text>
                </view>
                <view class="cost-row">
                    <text class="cost-label">发起人份额</text>
                    <text class="cost-value">¥{{ (group.initiator_base / 100).toFixed(2) }}</text>
                </view>
                <view class="cost-row discount" v-if="group.member_discount_amount">
                    <text class="cost-label">会员折扣</text>
                    <text class="cost-value discount-val">-¥{{ (group.member_discount_amount / 100).toFixed(2) }}</text>
                </view>
                <view class="cost-divider"></view>
                <view class="cost-row total">
                    <text class="cost-label">发起人实付</text>
                    <text class="cost-value total-val">¥{{ (group.initiator_paid / 100).toFixed(2) }}</text>
                </view>
            </view>

            <!-- 成员列表 -->
            <view class="members-card">
                <view class="section-title">
                    <text class="section-icon">👥</text>
                    <text>参与成员</text>
                    <text class="member-count">{{ group.current_members || 1 }}/{{ group.max_members }}</text>
                </view>

                <view class="member-grid">
                    <!-- 发起人 -->
                    <view class="member-item crown">
                        <view class="member-avatar-wrap">
                            <image class="member-avatar" :src="group.initiator && group.initiator.avatar" mode="aspectFill" />
                            <text class="crown-badge">👑</text>
                        </view>
                        <text class="member-name">{{ group.initiator && group.initiator.nickname }}</text>
                        <text class="member-role">发起人</text>
                    </view>

                    <!-- 成员 -->
                    <view class="member-item" v-for="(m, i) in group.members" :key="i">
                        <image class="member-avatar" :src="m.avatar" mode="aspectFill" />
                        <text class="member-name">{{ m.nickname }}</text>
                        <text class="member-role">已支付</text>
                    </view>

                    <!-- 占位 -->
                    <view class="member-item placeholder" v-for="i in placeholderCount" :key="'p' + i">
                        <view class="member-avatar empty">
                            <text>?</text>
                        </view>
                        <text class="member-name">待加入</text>
                        <text class="member-role">虚位以待</text>
                    </view>
                </view>

                <!-- 进度条 -->
                <view class="progress-wrap">
                    <view class="progress-bar">
                        <view class="progress-fill" :style="{ width: progressWidth }"></view>
                    </view>
                    <text class="progress-text" v-if="remainingCount > 0">🌱 还差 {{ remainingCount }} 人成团</text>
                    <text class="progress-text" v-else>🎉 成团成功！</text>
                </view>
            </view>

            <!-- 倒计时 -->
            <view class="countdown-card" v-if="group.status === 'open' && expireTime">
                <text class="countdown-icon">⏰</text>
                <text class="countdown-label">拼团截止倒计时</text>
                <text class="countdown-value">{{ countdownText }}</text>
            </view>

            <!-- 状态信息 -->
            <view class="status-info" :class="group.status" v-if="group.status !== 'open'">
                <text class="status-icon">{{ statusIcon }}</text>
                <text class="status-text">{{ statusText(group.status) }}</text>
                <text class="status-sub" v-if="group.status === 'success' && group.appointment">预约单号：{{ group.appointment.order_number }}</text>
            </view>
        </block>

        <!-- 底部操作栏 -->
        <view class="bottom-bar" v-if="group.object_id">
            <button class="share-btn" open-type="share">
                <text class="share-icon">📢</text>
                <text class="share-text">邀请好友</text>
            </button>
            <view class="action-btn warn" v-if="isInitiator && group.status === 'open'" @click="handleCancel">
                <text>🚫 解散拼团</text>
            </view>
            <view class="action-btn warn" v-else-if="isMember && group.status === 'open'" @click="handleLeave">
                <text>退出拼团</text>
            </view>
            <view class="action-btn primary" v-else-if="canJoin" @click="handleJoin">
                <text>🎮 加入拼团</text>
            </view>
            <view class="action-btn disabled" v-else>
                <text>{{ group.status === 'success' ? '✨ 已成团' : '已结束' }}</text>
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
            try {
                const parsed = JSON.parse(tags);
                if (Array.isArray(parsed)) return parsed.filter(Boolean);
            } catch (e) {}
            return tags.split('$').map(t => t.trim()).filter(Boolean);
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
        statusIcon() {
            const map = { open: '🌱', full: '🌻', success: '🎉', cancelled: '🍂' };
            return map[this.group.status] || '🔖';
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
        const room = this.group.room || {};
        const remain = (this.group.max_members || 4) - (this.group.current_members || 1);
        const price = this.group.price_per_person || 0;
        const priceStr = (price / 100).toFixed(0);
        const hour = parseInt((this.group.begin_time || '00:00').split(':')[0], 10);

        let timeEmoji = '🌅';
        if (hour >= 11 && hour < 14) timeEmoji = '☀️';
        else if (hour >= 14 && hour < 18) timeEmoji = '🌤️';
        else if (hour >= 18 && hour < 22) timeEmoji = '🌙';
        else if (hour >= 22) timeEmoji = '⭐';

        let title = '';
        if (remain <= 0) {
            title = `${timeEmoji}「${room.name || '拼团'}」已满员！来看看还有啥好玩的~`;
        } else if (remain === 1) {
            title = `🔥 最后1个名额！「${room.name || '拼团'}」${this.group.date} ${this.group.begin_time}~${this.group.end_time} · 人均¥${priceStr}`;
        } else if (remain === 2) {
            title = `🎮 就差2人了！「${room.name || '拼团'}」${this.group.date} ${this.group.begin_time}~${this.group.end_time} · 人均¥${priceStr}`;
        } else {
            title = `🎮 一起开黑！「${room.name || '拼团'}」${this.group.date} ${this.group.begin_time}~${this.group.end_time} · 人均¥${priceStr} · 还差${remain}人`;
        }

        return {
            title,
            path: '/pages/group/detail?id=' + this.groupId,
            imageUrl: room.image1 || '/static/logo_small.jpg',
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

        goRoomDetail() {
            const roomId = this.group.room && this.group.room.object_id;
            if (roomId) {
                uni.navigateTo({ url: `/pages/product/product?id=${roomId}` });
            }
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
            if (!this.token) {
                uni.showModal({
                    title: '需要登录',
                    content: '加入拼团需要先登录，是否前往登录？',
                    success: (res) => {
                        if (res.confirm) {
                            uni.switchTab({ url: '/pages/user/user' });
                        }
                    }
                });
                return;
            }
            uni.showModal({
                title: '加入拼团',
                content: '加入拼团将支付 ¥' + (this.group.price_per_person / 100) + '（成员人均），是否确认？',
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
                                        content: '加入拼团需支付 ¥' + (this.group.price_per_person / 100) + '，是否去充值？',
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
                title: '解散拼团',
                content: '解散后所有成员（包括你）已支付的费用将原路退回余额，是否确认解散？',
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
    padding-bottom: calc(160rpx + env(safe-area-inset-bottom));
}

/* 加载中 */
.loading-wrap {
    text-align: center;
    padding: 200rpx 40rpx;

    .loading-icon {
        font-size: 80rpx;
        display: block;
        margin-bottom: 20rpx;
        animation: sway 3s ease-in-out infinite;
    }

    .loading-text {
        font-size: 28rpx;
        color: $gray;
    }
}

@keyframes sway {
    0%, 100% { transform: rotate(-6deg); }
    50% { transform: rotate(6deg); }
}

/* 顶部装饰 */
.header-deco {
    position: relative;
    height: 0;
}

.deco-cloud {
    position: absolute;
    top: 20rpx;
    right: 50rpx;
    font-size: 36rpx;
    opacity: 0.3;
    animation: drift 6s ease-in-out infinite;
    z-index: 2;
}

.deco-bird {
    position: absolute;
    top: 30rpx;
    right: 120rpx;
    font-size: 24rpx;
    opacity: 0.25;
    animation: drift 5s ease-in-out infinite reverse;
    z-index: 2;
}

.deco-leaf {
    position: absolute;
    top: 16rpx;
    left: 40rpx;
    font-size: 32rpx;
    opacity: 0.3;
    animation: sway 4s ease-in-out infinite;
    z-index: 2;
}

@keyframes drift {
    0%, 100% { transform: translateX(0); }
    50% { transform: translateX(16rpx); }
}

/* 房间卡片 */
.room-card {
    margin: 20rpx 30rpx 24rpx;
    border-radius: 28rpx;
    overflow: hidden;
    position: relative;
    box-shadow: 0 12rpx 40rpx rgba(140, 100, 60, 0.12);

    .room-img {
        width: 100%;
        height: 380rpx;
        display: block;
    }

    .room-img-mask {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 200rpx;
        background: linear-gradient(to top, rgba(92,75,58,0.75), transparent);
    }

    .room-info-overlay {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        padding: 24rpx 28rpx;

        .room-name {
            font-size: 36rpx;
            font-weight: bold;
            color: #fff;
            display: block;
            margin-bottom: 12rpx;
            text-shadow: 0 2rpx 8rpx rgba(0,0,0,0.3);
        }

        .room-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 10rpx;
            margin-bottom: 10rpx;

            .tag {
                font-size: 22rpx;
                color: #fff;
                background: rgba(255,255,255,0.25);
                padding: 6rpx 16rpx;
                border-radius: 20rpx;
                font-weight: 500;
                backdrop-filter: blur(4rpx);
            }
        }

        .room-arrow {
            font-size: 24rpx;
            color: rgba(255,255,255,0.85);
        }
    }
}

/* 时间卡片 */
.time-card {
    margin: 0 30rpx 24rpx;
    background: #fff;
    border-radius: 24rpx;
    padding: 20rpx 28rpx;
    box-shadow: 0 8rpx 32rpx rgba(140, 100, 60, 0.06);
    border: 1rpx solid rgba(240, 230, 216, 0.5);

    .time-row {
        display: flex;
        align-items: center;
        padding: 16rpx 0;
    }

    .time-icon {
        font-size: 36rpx;
        margin-right: 20rpx;
        width: 48rpx;
        text-align: center;
    }

    .time-content {
        flex: 1;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .time-label {
        font-size: 26rpx;
        color: $gray;
    }

    .time-value {
        font-size: 28rpx;
        color: $dark;
        font-weight: bold;
    }

    .time-divider {
        height: 1rpx;
        background: linear-gradient(to right, transparent, $border, transparent);
        margin: 0 68rpx;
    }
}

/* 发起人留言 / 备注卡片 */
.note-card {
    margin: 0 30rpx 24rpx;
    background: linear-gradient(135deg, #FFF8E1, #FFF3E8);
    border-radius: 24rpx;
    padding: 28rpx;
    box-shadow: 0 8rpx 32rpx rgba(140, 100, 60, 0.06);
    border: 2rpx solid rgba(255, 204, 128, 0.3);
    position: relative;
    overflow: hidden;

    &::before {
        content: '📝';
        position: absolute;
        top: 16rpx;
        right: 24rpx;
        font-size: 48rpx;
        opacity: 0.12;
    }

    .note-header {
        display: flex;
        align-items: center;
        margin-bottom: 20rpx;
    }

    .note-avatar {
        width: 64rpx;
        height: 64rpx;
        border-radius: 50%;
        margin-right: 16rpx;
        border: 3rpx solid #fff;
        box-shadow: 0 4rpx 12rpx rgba(140, 100, 60, 0.1);
    }

    .note-author {
        flex: 1;
    }

    .note-name {
        font-size: 28rpx;
        font-weight: bold;
        color: $dark;
        display: block;
    }

    .note-label {
        font-size: 22rpx;
        color: $primary;
        margin-top: 4rpx;
        display: block;
    }

    .note-quote {
        font-size: 60rpx;
        color: rgba(255, 140, 66, 0.2);
        line-height: 1;
        font-family: Georgia, serif;
    }

    .note-body {
        background: rgba(255,255,255,0.6);
        border-radius: 16rpx;
        padding: 20rpx 24rpx;
        margin-bottom: 16rpx;
    }

    .note-text {
        font-size: 28rpx;
        color: $dark;
        line-height: 1.7;
        display: block;
    }

    .note-footer {
        text-align: right;
    }

    .note-signature {
        font-size: 24rpx;
        color: $gray;
        font-style: italic;
    }
}

/* 费用卡片 */
.cost-card {
    margin: 0 30rpx 24rpx;
    background: #fff;
    border-radius: 24rpx;
    padding: 24rpx 28rpx;
    box-shadow: 0 8rpx 32rpx rgba(140, 100, 60, 0.06);
    border: 1rpx solid rgba(240, 230, 216, 0.5);

    &.initiator-cost {
        background: linear-gradient(135deg, #E8F5E9, #fff);
        border-color: rgba(165, 214, 167, 0.3);
    }

    .section-title {
        display: flex;
        align-items: center;
        gap: 10rpx;
        font-size: 30rpx;
        font-weight: bold;
        color: $dark;
        margin-bottom: 16rpx;
        padding-bottom: 12rpx;
        border-bottom: 1rpx dashed $border;

        .section-icon {
            font-size: 32rpx;
        }
    }

    .cost-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 14rpx 0;

        &.discount {
            .cost-label { color: #2E7D32; }
        }

        &.total {
            padding: 18rpx 0;

            .cost-label {
                font-weight: bold;
                color: $dark;
                font-size: 28rpx;
            }
        }
    }

    .cost-label {
        font-size: 26rpx;
        color: $gray;
    }

    .cost-value {
        font-size: 26rpx;
        color: $dark;
        font-weight: 500;

        &.discount-val {
            color: #2E7D32;
            font-weight: bold;
        }

        &.total-val {
            color: $primary;
            font-size: 32rpx;
            font-weight: bold;
        }
    }

    .cost-divider {
        height: 2rpx;
        background: linear-gradient(to right, transparent, $border, transparent);
        margin: 8rpx 0;
    }
}

/* 成员卡片 */
.members-card {
    margin: 0 30rpx 24rpx;
    background: #fff;
    border-radius: 24rpx;
    padding: 24rpx 28rpx;
    box-shadow: 0 8rpx 32rpx rgba(140, 100, 60, 0.06);
    border: 1rpx solid rgba(240, 230, 216, 0.5);

    .section-title {
        display: flex;
        align-items: center;
        gap: 10rpx;
        font-size: 30rpx;
        font-weight: bold;
        color: $dark;
        margin-bottom: 20rpx;

        .section-icon {
            font-size: 32rpx;
        }

        .member-count {
            margin-left: auto;
            font-size: 26rpx;
            color: $primary;
            background: linear-gradient(135deg, #FFF3E8, #FFE8D6);
            padding: 6rpx 18rpx;
            border-radius: 20rpx;
            font-weight: bold;
        }
    }

    .member-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 20rpx;
        margin-bottom: 24rpx;
    }

    .member-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        background: $light;
        border-radius: 20rpx;
        padding: 20rpx 16rpx;
        min-width: 140rpx;
        flex: 1;
        border: 1rpx solid rgba(240, 230, 216, 0.5);
        transition: transform 0.2s;

        &:active {
            transform: scale(0.95);
        }

        &.crown {
            background: linear-gradient(135deg, #FFF8E1, #FFF3E8);
            border-color: rgba(255, 204, 128, 0.3);
        }

        &.placeholder {
            opacity: 0.6;
            background: #FAFAFA;
        }

        .member-avatar-wrap {
            position: relative;
            margin-bottom: 10rpx;
        }

        .member-avatar {
            width: 72rpx;
            height: 72rpx;
            border-radius: 50%;
            background: #ddd;
            border: 3rpx solid #fff;
            box-shadow: 0 4rpx 12rpx rgba(140, 100, 60, 0.1);

            &.empty {
                background: linear-gradient(135deg, #F0E6D8, #E0D6C8);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 28rpx;
                color: #fff;
            }
        }

        .crown-badge {
            position: absolute;
            top: -8rpx;
            right: -8rpx;
            font-size: 28rpx;
            background: #fff;
            border-radius: 50%;
            width: 32rpx;
            height: 32rpx;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.1);
        }

        .member-name {
            font-size: 24rpx;
            color: $dark;
            font-weight: 500;
            margin-bottom: 4rpx;
            max-width: 120rpx;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .member-role {
            font-size: 20rpx;
            color: $gray;
        }
    }

    .progress-wrap {
        .progress-bar {
            width: 100%;
            height: 16rpx;
            background: #F0E6D8;
            border-radius: 8rpx;
            overflow: hidden;
            margin-bottom: 12rpx;
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
            text-align: center;
            display: block;
            font-weight: 500;
        }
    }
}

/* 倒计时卡片 */
.countdown-card {
    margin: 0 30rpx 24rpx;
    background: linear-gradient(135deg, #FFF3E8, #FFE8D6);
    border-radius: 24rpx;
    padding: 32rpx;
    text-align: center;
    box-shadow: 0 8rpx 32rpx rgba(140, 100, 60, 0.06);
    border: 1rpx solid rgba(255, 204, 128, 0.2);

    .countdown-icon {
        font-size: 48rpx;
        display: block;
        margin-bottom: 12rpx;
    }

    .countdown-label {
        font-size: 26rpx;
        color: $dark;
        display: block;
        margin-bottom: 12rpx;
        opacity: 0.8;
    }

    .countdown-value {
        font-size: 44rpx;
        font-weight: bold;
        color: $primary;
        font-variant-numeric: tabular-nums;
    }
}

/* 状态信息 */
.status-info {
    margin: 0 30rpx 40rpx;
    border-radius: 24rpx;
    padding: 40rpx 32rpx;
    text-align: center;
    box-shadow: 0 8rpx 32rpx rgba(140, 100, 60, 0.06);

    &.success {
        background: linear-gradient(135deg, #E8F5E9, #C8E6C9);
    }

    &.full {
        background: linear-gradient(135deg, #FFF3E0, #FFE0B2);
    }

    &.cancelled {
        background: linear-gradient(135deg, #F5F5F5, #E0E0E0);
    }

    .status-icon {
        font-size: 64rpx;
        display: block;
        margin-bottom: 12rpx;
    }

    .status-text {
        font-size: 32rpx;
        font-weight: bold;
        color: $dark;
        display: block;
        margin-bottom: 8rpx;
    }

    .status-sub {
        font-size: 24rpx;
        color: $gray;
    }
}

/* 底部操作栏 */
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
    box-shadow: 0 -4rpx 20rpx rgba(140, 100, 60, 0.06);
    gap: 20rpx;

    .share-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 0 20rpx;
        background: transparent;
        margin: 0;
        line-height: 1;
        border: none;
        outline: none;

        &::after {
            display: none;
        }

        &:active {
            transform: scale(0.92);
        }

        .share-icon {
            font-size: 40rpx;
            display: block;
        }

        .share-text {
            font-size: 20rpx;
            color: $gray;
            margin-top: 6rpx;
            display: block;
        }
    }

    .action-btn {
        flex: 1;
        height: 88rpx;
        border-radius: 44rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 30rpx;
        font-weight: bold;
        color: #fff;
        transition: transform 0.15s, box-shadow 0.2s;

        &:active {
            transform: scale(0.97);
        }

        &.primary {
            background: linear-gradient(135deg, #FFCC80, #FF8C42);
            box-shadow: 0 6rpx 20rpx rgba(255, 140, 66, 0.3);
        }

        &.warn {
            background: linear-gradient(135deg, #FFAB91, #FF7043);
            box-shadow: 0 6rpx 20rpx rgba(255, 112, 67, 0.25);
        }

        &.disabled {
            background: #E0E0E0;
            color: #9E9E9E;
        }
    }
}
</style>
