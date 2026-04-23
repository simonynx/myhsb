<template>
    <view class="container">
        <!-- 自定义顶部栏 -->
        <view class="custom-header">
            <view class="header-safe">
                <text class="header-back" @click="goBack">←</text>
                <text class="header-title">🎮 发起拼团</text>
                <view class="header-spacer"></view>
            </view>
        </view>

        <!-- 房间信息卡片 -->
        <view class="room-card">
            <image class="room-img" :src="roomImage" mode="aspectFill" />
            <view class="room-meta">
                <text class="room-name">{{ roomName }}</text>
                <view class="room-tags">
                    <text class="tag">📅 {{ date }}</text>
                    <text class="tag">⏰ {{ beginTime }} ~ {{ endTime }}</text>
                    <text class="tag">🕐 共 {{ duration }} 小时</text>
                </view>
            </view>
        </view>

        <!-- 费用参考卡片 -->
        <view class="cost-card">
            <view class="cost-title">💰 费用参考</view>

            <view class="cost-row">
                <text class="cost-label">房间每小时</text>
                <text class="cost-value">¥{{ (pricePerHour / 100).toFixed(2) }}</text>
            </view>
            <view class="cost-row">
                <text class="cost-label">预约时长</text>
                <text class="cost-value">{{ duration }} 小时</text>
            </view>
            <view class="cost-row">
                <text class="cost-label">房间总费用</text>
                <text class="cost-value highlight">¥{{ roomTotalCost }}</text>
            </view>

            <view class="cost-divider"></view>

            <view class="cost-row">
                <text class="cost-label">目标人数</text>
                <text class="cost-value">{{ maxMembers }} 人</text>
            </view>
            <view class="cost-row">
                <text class="cost-label">人均费用</text>
                <text class="cost-value">¥{{ pricePerPersonYuan }}</text>
            </view>
            <view class="cost-row">
                <text class="cost-label">拼团总预算</text>
                <text class="cost-value">¥{{ groupBudget }}</text>
            </view>

            <view class="cost-result" :class="budgetClass">
                <text class="result-icon">{{ budgetIcon }}</text>
                <text class="result-text">{{ budgetHint }}</text>
            </view>
        </view>

        <!-- 设置卡片 -->
        <view class="setting-card">
            <view class="setting-title">⚙️ 拼团设置</view>

            <!-- 人数步进器 -->
            <view class="setting-item">
                <view class="setting-left">
                    <text class="setting-icon">👥</text>
                    <text class="setting-label">目标人数</text>
                </view>
                <view class="stepper">
                    <view class="step-btn" :class="{ disabled: maxMembers <= 2 }" @click="changeMembers(-1)">
                        <text>−</text>
                    </view>
                    <text class="step-value">{{ maxMembers }}</text>
                    <view class="step-btn" :class="{ disabled: maxMembers >= 20 }" @click="changeMembers(1)">
                        <text>+</text>
                    </view>
                </view>
            </view>

            <!-- 人均价格 -->
            <view class="setting-item">
                <view class="setting-left">
                    <text class="setting-icon">💎</text>
                    <text class="setting-label">人均费用</text>
                </view>
                <view class="price-input-wrap">
                    <text class="price-prefix">¥</text>
                    <input
                        class="price-input"
                        type="digit"
                        v-model="pricePerPersonYuan"
                        @blur="formatPrice"
                    />
                </view>
            </view>

            <!-- 备注 -->
            <view class="setting-item vertical">
                <view class="setting-left">
                    <text class="setting-icon">📝</text>
                    <text class="setting-label">备注</text>
                </view>
                <textarea
                    class="note-textarea"
                    v-model="note"
                    placeholder="写点什么吸引小伙伴加入吧~"
                    maxlength="100"
                />
                <text class="note-count">{{ note.length }}/100</text>
            </view>
        </view>

        <!-- 规则提示卡片 -->
        <view class="rule-card">
            <view class="rule-title">📋 拼团规则</view>
            <view class="rule-list">
                <view class="rule-item">
                    <text class="rule-dot">1</text>
                    <text class="rule-text">拼团有效期 <text class="rule-bold">24 小时</text>，超时自动解散并退款</text>
                </view>
                <view class="rule-item">
                    <text class="rule-dot">2</text>
                    <text class="rule-text">满员后自动成团，系统将为您锁定房间时段并创建预约</text>
                </view>
                <view class="rule-item">
                    <text class="rule-dot">3</text>
                    <text class="rule-text">发起人可随时<text class="rule-bold">解散拼团</text>，全员费用原路退回</text>
                </view>
                <view class="rule-item">
                    <text class="rule-dot">4</text>
                    <text class="rule-text">成员可随时退出，退出后费用退回余额</text>
                </view>
                <view class="rule-item">
                    <text class="rule-dot">5</text>
                    <text class="rule-text">成团后会给所有人发送微信预约提醒消息</text>
                </view>
            </view>
        </view>

        <!-- 底部占位 -->
        <view class="bottom-placeholder"></view>

        <!-- 底部操作栏 -->
        <view class="bottom-bar">
            <view class="bottom-left">
                <text class="bottom-label">需支付</text>
                <text class="bottom-price">¥{{ pricePerPersonYuan }}</text>
                <text class="bottom-hint">（仅自己的份额）</text>
            </view>
            <view class="submit-btn" @click="handleSubmit">
                <text>🚀 发起拼团</text>
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
            roomId: '',
            roomName: '',
            roomImage: '',
            date: '',
            beginTime: '',
            endTime: '',
            duration: 1,
            pricePerHour: 0,
            maxMembers: 4,
            pricePerPersonYuan: '0.00',
            note: '',
        };
    },

    computed: {
        ...mapState(['token']),
        roomTotalCost() {
            return ((this.pricePerHour * this.duration) / 100).toFixed(2);
        },
        groupBudget() {
            const price = parseFloat(this.pricePerPersonYuan) || 0;
            return (this.maxMembers * price).toFixed(2);
        },
        budgetClass() {
            const budget = parseFloat(this.groupBudget) || 0;
            const cost = parseFloat(this.roomTotalCost) || 0;
            if (budget >= cost) return 'ok';
            return 'warn';
        },
        budgetIcon() {
            return this.budgetClass === 'ok' ? '✅' : '⚠️';
        },
        budgetHint() {
            const budget = parseFloat(this.groupBudget) || 0;
            const cost = parseFloat(this.roomTotalCost) || 0;
            if (budget >= cost) {
                return `拼团收入 ¥${this.groupBudget} 可覆盖房间费用 ¥${this.roomTotalCost}`;
            }
            const diff = (cost - budget).toFixed(2);
            return `拼团收入不足，差额 ¥${diff} 需店主自行承担`;
        },
    },

    onLoad(options) {
        this.roomId = options.room_id || '';
        this.roomName = decodeURIComponent(options.room_name || '');
        this.roomImage = decodeURIComponent(options.room_image || '');
        this.date = options.date || '';
        this.beginTime = options.begin_time || '';
        this.endTime = options.end_time || '';
        this.duration = parseInt(options.duration) || 1;
        this.pricePerHour = parseInt(options.price_per_hour) || 0;
        const defaultPrice = parseFloat(options.price_per_person) || 0;
        this.pricePerPersonYuan = (defaultPrice / 100).toFixed(2);
    },

    methods: {
        goBack() {
            uni.navigateBack();
        },

        changeMembers(delta) {
            const next = this.maxMembers + delta;
            if (next < 2 || next > 20) return;
            this.maxMembers = next;
        },

        formatPrice() {
            const val = parseFloat(this.pricePerPersonYuan);
            if (!val || val <= 0) {
                this.pricePerPersonYuan = '0.00';
            } else {
                this.pricePerPersonYuan = val.toFixed(2);
            }
        },

        handleSubmit() {
            if (this.maxMembers < 2 || this.maxMembers > 20) {
                uni.showToast({ title: '人数需在 2~20 之间', icon: 'none' });
                return;
            }
            const price = parseFloat(this.pricePerPersonYuan);
            if (!price || price <= 0) {
                uni.showToast({ title: '请输入有效的人均费用', icon: 'none' });
                return;
            }

            const data = {
                room_id: this.roomId,
                date: this.date,
                begin_time: this.beginTime,
                end_time: this.endTime,
                max_members: this.maxMembers,
                price_per_person: Math.floor(price * 100),
                note: this.note.trim(),
            };

            uni.showLoading({ title: '创建中...' });
            AUTH.createGroup(this.token, data).then(res => {
                uni.hideLoading();
                if (res && res._status === 0 && res.data) {
                    const hint = res.data && res.data._cost_hint;
                    if (hint) {
                        uni.showModal({
                            title: '费用提示',
                            content: hint + '，是否继续创建？',
                            success: (r) => {
                                if (r.confirm) {
                                    uni.showToast({ title: '拼团创建成功', icon: 'success' });
                                    setTimeout(() => {
                                        uni.redirectTo({ url: '/pages/group/detail?id=' + res.data.object_id });
                                    }, 800);
                                }
                            }
                        });
                    } else {
                        uni.showToast({ title: '拼团创建成功', icon: 'success' });
                        setTimeout(() => {
                            uni.redirectTo({ url: '/pages/group/detail?id=' + res.data.object_id });
                        }, 800);
                    }
                } else {
                    var msg = (res && res._reason) || '创建失败';
                    if (msg.indexOf('余额不足') !== -1) {
                        uni.showModal({
                            title: '余额不足',
                            content: '发起拼团需支付 ¥' + this.pricePerPersonYuan + '，是否去充值？',
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
                uni.showToast({ title: '创建失败', icon: 'none' });
            });
        },
    },
};
</script>

<style lang="scss">
$primary: #FF6432;
$pink: #FF9ECD;
$yellow: #FFD93D;
$green: #6BCB77;
$blue: #4D96FF;
$gray: #999;
$dark: #333;
$light: #F5F6F7;
$border: #EEEEEE;

.container {
    min-height: 100vh;
    background: linear-gradient(180deg, #FFF0F5 0%, #F8F8F8 300rpx);
    padding-bottom: calc(180rpx + env(safe-area-inset-bottom));
}

// 自定义顶部栏
.custom-header {
    background: linear-gradient(135deg, $pink, $primary);
    padding-top: var(--status-bar-height);

    .header-safe {
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: 88rpx;
        padding: 0 20rpx;
    }

    .header-back {
        font-size: 40rpx;
        color: #fff;
        width: 60rpx;
        text-align: center;
    }

    .header-title {
        font-size: 34rpx;
        font-weight: bold;
        color: #fff;
    }

    .header-spacer {
        width: 60rpx;
    }
}

// 房间卡片
.room-card {
    margin: 24rpx;
    background: #fff;
    border-radius: 32rpx;
    padding: 24rpx;
    display: flex;
    align-items: center;
    box-shadow: 0 8rpx 32rpx rgba(255,100,50,0.08);
    border: 4rpx solid #FFE8F0;

    .room-img {
        width: 140rpx;
        height: 140rpx;
        border-radius: 24rpx;
        margin-right: 24rpx;
        background: $light;
        flex-shrink: 0;
        border: 4rpx solid #FFF0F5;
    }

    .room-meta {
        flex: 1;
        min-width: 0;

        .room-name {
            font-size: 34rpx;
            font-weight: bold;
            color: $dark;
            display: block;
            margin-bottom: 14rpx;
        }

        .room-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 10rpx;

            .tag {
                font-size: 24rpx;
                color: $primary;
                background: #FFF0EB;
                padding: 8rpx 18rpx;
                border-radius: 16rpx;
                font-weight: 500;
            }
        }
    }
}

// 费用参考卡片
.cost-card {
    margin: 0 24rpx 24rpx;
    background: #fff;
    border-radius: 32rpx;
    padding: 28rpx;
    box-shadow: 0 8rpx 32rpx rgba(255,100,50,0.06);
    border: 4rpx solid #FFF8E1;

    .cost-title {
        font-size: 32rpx;
        font-weight: bold;
        color: $dark;
        margin-bottom: 20rpx;
        display: block;
    }

    .cost-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12rpx 0;

        .cost-label {
            font-size: 28rpx;
            color: $gray;
        }

        .cost-value {
            font-size: 30rpx;
            color: $dark;
            font-weight: bold;

            &.highlight {
                color: $primary;
                font-size: 32rpx;
            }
        }
    }

    .cost-divider {
        height: 2rpx;
        background: $border;
        margin: 16rpx 0;
    }

    .cost-result {
        margin-top: 20rpx;
        padding: 18rpx 20rpx;
        border-radius: 20rpx;
        display: flex;
        align-items: center;
        gap: 12rpx;

        &.ok {
            background: #F6FFED;
        }

        &.warn {
            background: #FFF7E6;
        }

        .result-icon {
            font-size: 32rpx;
        }

        .result-text {
            font-size: 26rpx;
            color: $dark;
            line-height: 1.4;
            flex: 1;
        }
    }
}

// 设置卡片
.setting-card {
    margin: 0 24rpx 24rpx;
    background: #fff;
    border-radius: 32rpx;
    padding: 28rpx;
    box-shadow: 0 8rpx 32rpx rgba(77,150,255,0.06);
    border: 4rpx solid #E8F4FF;

    .setting-title {
        font-size: 32rpx;
        font-weight: bold;
        color: $dark;
        margin-bottom: 20rpx;
        display: block;
    }

    .setting-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 22rpx 0;
        border-bottom: 2rpx solid $border;

        &:last-child { border-bottom: none; }

        &.vertical {
            flex-direction: column;
            align-items: flex-start;

            .setting-left { margin-bottom: 16rpx; }
        }

        .setting-left {
            display: flex;
            align-items: center;

            .setting-icon {
                font-size: 36rpx;
                margin-right: 12rpx;
            }

            .setting-label {
                font-size: 30rpx;
                color: $dark;
                font-weight: 500;
            }
        }
    }
}

// 步进器
.stepper {
    display: flex;
    align-items: center;
    gap: 16rpx;

    .step-btn {
        width: 64rpx;
        height: 64rpx;
        border-radius: 20rpx;
        background: linear-gradient(135deg, $pink, $primary);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4rpx 12rpx rgba(255,100,50,0.25);

        text {
            font-size: 36rpx;
            color: #fff;
            font-weight: bold;
        }

        &.disabled {
            background: #E0E0E0;
            box-shadow: none;
        }
    }

    .step-value {
        font-size: 36rpx;
        font-weight: bold;
        color: $dark;
        min-width: 60rpx;
        text-align: center;
    }
}

// 价格输入
.price-input-wrap {
    display: flex;
    align-items: center;
    background: $light;
    border-radius: 20rpx;
    padding: 14rpx 24rpx;

    .price-prefix {
        font-size: 28rpx;
        color: $primary;
        font-weight: bold;
        margin-right: 8rpx;
    }

    .price-input {
        font-size: 32rpx;
        color: $dark;
        font-weight: bold;
        text-align: right;
        width: 140rpx;
    }
}

// 备注输入
.note-textarea {
    width: 100%;
    height: 160rpx;
    background: $light;
    border-radius: 20rpx;
    padding: 20rpx;
    font-size: 28rpx;
    color: $dark;
    box-sizing: border-box;
}

.note-count {
    align-self: flex-end;
    font-size: 22rpx;
    color: $gray;
    margin-top: 10rpx;
}

// 规则卡片
.rule-card {
    margin: 0 24rpx 24rpx;
    background: #fff;
    border-radius: 32rpx;
    padding: 28rpx;
    box-shadow: 0 8rpx 32rpx rgba(107,203,119,0.06);
    border: 4rpx solid #E8F8EC;

    .rule-title {
        font-size: 32rpx;
        font-weight: bold;
        color: $dark;
        margin-bottom: 20rpx;
        display: block;
    }

    .rule-list {
        display: flex;
        flex-direction: column;
        gap: 18rpx;
    }

    .rule-item {
        display: flex;
        align-items: flex-start;
        gap: 14rpx;

        .rule-dot {
            width: 40rpx;
            height: 40rpx;
            border-radius: 50%;
            background: linear-gradient(135deg, $green, #34C759);
            color: #fff;
            font-size: 22rpx;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            margin-top: 2rpx;
        }

        .rule-text {
            font-size: 26rpx;
            color: #666;
            line-height: 1.5;
            flex: 1;
        }

        .rule-bold {
            color: $dark;
            font-weight: bold;
        }
    }
}

.bottom-placeholder {
    height: 40rpx;
}

// 底部操作栏
.bottom-bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24rpx 30rpx;
    padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
    background: #fff;
    border-top: 4rpx solid #FFE8F0;
    box-shadow: 0 -8rpx 32rpx rgba(0,0,0,0.06);

    .bottom-left {
        display: flex;
        flex-direction: column;

        .bottom-label {
            font-size: 22rpx;
            color: $gray;
            margin-bottom: 4rpx;
        }

        .bottom-price {
            font-size: 44rpx;
            font-weight: bold;
            color: $primary;
        }

        .bottom-hint {
            font-size: 20rpx;
            color: $gray;
            margin-top: 4rpx;
        }
    }

    .submit-btn {
        height: 92rpx;
        border-radius: 46rpx;
        background: linear-gradient(135deg, $pink, $primary);
        padding: 0 56rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 32rpx;
        font-weight: bold;
        color: #fff;
        box-shadow: 0 10rpx 30rpx rgba(255,100,50,0.35);
        border: 4rpx solid rgba(255,255,255,0.3);
    }
}
</style>
