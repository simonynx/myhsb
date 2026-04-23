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
                </view>
            </view>
        </view>

        <!-- 费用明细 -->
        <view class="bill-card">
            <view class="bill-title">💰 费用明细</view>
            <view class="bill-row">
                <text class="bill-label">目标人数</text>
                <text class="bill-value">{{ maxMembers }} 人</text>
            </view>
            <view class="bill-row">
                <text class="bill-label">人均费用</text>
                <text class="bill-value price">¥{{ pricePerPersonYuan }}</text>
            </view>
            <view class="bill-divider"></view>
            <view class="bill-row">
                <text class="bill-label">房间总预算</text>
                <text class="bill-value light">¥{{ totalBudget }}</text>
            </view>
            <view class="bill-row highlight">
                <text class="bill-label">发起人实际支付</text>
                <text class="bill-value pay">¥{{ pricePerPersonYuan }}</text>
            </view>
            <view class="bill-tip">💡 只需支付您自己的份额，其他成员加入时各付各的</view>
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

        <!-- 底部占位 -->
        <view class="bottom-placeholder"></view>

        <!-- 底部操作栏 -->
        <view class="bottom-bar">
            <view class="bottom-left">
                <text class="bottom-label">需支付</text>
                <text class="bottom-price">¥{{ pricePerPersonYuan }}</text>
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
            maxMembers: 4,
            pricePerPersonYuan: '0.00',
            note: '',
        };
    },

    computed: {
        ...mapState(['token']),
        totalBudget() {
            const members = this.maxMembers || 1;
            const price = parseFloat(this.pricePerPersonYuan) || 0;
            return (members * price).toFixed(2);
        },
    },

    onLoad(options) {
        this.roomId = options.room_id || '';
        this.roomName = decodeURIComponent(options.room_name || '');
        this.roomImage = decodeURIComponent(options.room_image || '');
        this.date = options.date || '';
        this.beginTime = options.begin_time || '';
        this.endTime = options.end_time || '';
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
                    uni.showToast({ title: '拼团创建成功', icon: 'success' });
                    setTimeout(() => {
                        uni.redirectTo({ url: '/pages/group/detail?id=' + res.data.object_id });
                    }, 800);
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
    padding-bottom: calc(160rpx + env(safe-area-inset-bottom));
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

// 费用明细
.bill-card {
    margin: 0 24rpx 24rpx;
    background: #fff;
    border-radius: 32rpx;
    padding: 28rpx;
    box-shadow: 0 8rpx 32rpx rgba(255,100,50,0.06);
    border: 4rpx solid #FFF8E1;

    .bill-title {
        font-size: 32rpx;
        font-weight: bold;
        color: $dark;
        margin-bottom: 20rpx;
        display: block;
    }

    .bill-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14rpx 0;

        &.highlight {
            background: linear-gradient(90deg, #FFF0EB, #FFE8F0);
            margin: 16rpx -12rpx;
            padding: 18rpx 12rpx;
            border-radius: 20rpx;
        }

        .bill-label {
            font-size: 28rpx;
            color: $gray;
        }

        .bill-value {
            font-size: 30rpx;
            color: $dark;
            font-weight: bold;

            &.price { color: $primary; }
            &.light { color: $gray; font-weight: normal; }
            &.pay {
                color: $primary;
                font-size: 36rpx;
            }
        }
    }

    .bill-divider {
        height: 2rpx;
        background: $border;
        margin: 10rpx 0;
    }

    .bill-tip {
        font-size: 22rpx;
        color: #B8883A;
        background: #FFF8E1;
        padding: 14rpx 18rpx;
        border-radius: 16rpx;
        margin-top: 16rpx;
        line-height: 1.5;
    }
}

// 设置卡片
.setting-card {
    margin: 0 24rpx;
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
