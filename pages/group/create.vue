<template>
    <view class="container">
        <!-- 房间信息 -->
        <view class="room-card">
            <image class="room-img" :src="roomImage" mode="aspectFill" />
            <view class="room-info">
                <text class="room-name">{{ roomName }}</text>
                <text class="room-desc">{{ date }} &nbsp;{{ beginTime }} ~ {{ endTime }}</text>
            </view>
        </view>

        <!-- 表单 -->
        <view class="form-card">
            <view class="form-item">
                <text class="form-label">目标人数</text>
                <view class="form-input-wrap">
                    <input
                        class="form-input"
                        type="number"
                        v-model="maxMembers"
                        placeholder="请输入目标人数"
                    />
                    <text class="form-unit">人</text>
                </view>
            </view>

            <view class="form-item">
                <text class="form-label">人均费用</text>
                <view class="form-input-wrap">
                    <text class="form-prefix">¥</text>
                    <input
                        class="form-input"
                        type="digit"
                        v-model="pricePerPersonYuan"
                        placeholder="请输入人均费用"
                    />
                </view>
            </view>

            <view class="form-item textarea-item">
                <text class="form-label">备注（可选）</text>
                <textarea
                    class="form-textarea"
                    v-model="note"
                    placeholder="写点什么，吸引小伙伴加入吧~"
                    maxlength="100"
                />
                <text class="textarea-count">{{ note.length }}/100</text>
            </view>
        </view>

        <!-- 提示 -->
        <view class="tip-card">
            <text class="tip-text">💡 发起拼团后，系统将自动从您的余额扣除人均费用。若拼团失败（超时或取消），费用将原路退回。</text>
        </view>

        <!-- 底部占位 -->
        <view class="bottom-placeholder"></view>

        <!-- 底部操作栏 -->
        <view class="bottom-bar">
            <view class="price-info">
                <text class="pi-label">应付金额</text>
                <text class="pi-price">¥{{ payAmount }}</text>
            </view>
            <view class="submit-btn" @click="handleSubmit">
                <text>发起拼团</text>
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
            maxMembers: '4',
            pricePerPersonYuan: '',
            note: '',
        };
    },

    computed: {
        ...mapState(['token']),
        payAmount() {
            const members = parseInt(this.maxMembers) || 1;
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
        handleSubmit() {
            const members = parseInt(this.maxMembers);
            if (!members || members < 2) {
                uni.showToast({ title: '目标人数至少2人', icon: 'none' });
                return;
            }
            if (members > 20) {
                uni.showToast({ title: '目标人数最多20人', icon: 'none' });
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
                max_members: members,
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
                            content: '发起拼团需要支付人均费用，是否去充值？',
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
$gray: #999;
$dark: #333;
$light: #F5F6F7;
$border: #EEEEEE;

.container {
    min-height: 100vh;
    background: #F8F8F8;
    padding-bottom: calc(140rpx + env(safe-area-inset-bottom));
}

// 房间卡片
.room-card {
    margin: 20rpx;
    background: #fff;
    border-radius: 20rpx;
    overflow: hidden;
    box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);
    display: flex;
    align-items: center;
    padding: 20rpx;

    .room-img {
        width: 120rpx;
        height: 120rpx;
        border-radius: 16rpx;
        margin-right: 20rpx;
        background: $light;
        flex-shrink: 0;
    }

    .room-info {
        flex: 1;
        min-width: 0;

        .room-name {
            font-size: 32rpx;
            font-weight: bold;
            color: $dark;
            display: block;
            margin-bottom: 10rpx;
        }

        .room-desc {
            font-size: 26rpx;
            color: $gray;
        }
    }
}

// 表单卡片
.form-card {
    margin: 0 20rpx 20rpx;
    background: #fff;
    border-radius: 20rpx;
    padding: 10rpx 24rpx;
    box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);
}

.form-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24rpx 0;
    border-bottom: 1rpx solid $border;

    &:last-child { border-bottom: none; }

    .form-label {
        font-size: 28rpx;
        color: $dark;
        font-weight: 500;
    }

    .form-input-wrap {
        display: flex;
        align-items: center;
        background: $light;
        border-radius: 12rpx;
        padding: 12rpx 20rpx;
        min-width: 200rpx;
        justify-content: flex-end;

        .form-prefix {
            font-size: 28rpx;
            color: $primary;
            font-weight: bold;
            margin-right: 8rpx;
        }

        .form-input {
            font-size: 28rpx;
            color: $dark;
            text-align: right;
            width: 120rpx;
        }

        .form-unit {
            font-size: 26rpx;
            color: $gray;
            margin-left: 8rpx;
        }
    }

    &.textarea-item {
        flex-direction: column;
        align-items: flex-start;

        .form-label {
            margin-bottom: 16rpx;
        }

        .form-textarea {
            width: 100%;
            height: 160rpx;
            background: $light;
            border-radius: 12rpx;
            padding: 16rpx 20rpx;
            font-size: 28rpx;
            color: $dark;
            box-sizing: border-box;
        }

        .textarea-count {
            align-self: flex-end;
            font-size: 22rpx;
            color: $gray;
            margin-top: 8rpx;
        }
    }
}

// 提示
.tip-card {
    margin: 0 20rpx;
    padding: 20rpx 24rpx;
    background: #FFF7E6;
    border-radius: 16rpx;

    .tip-text {
        font-size: 24rpx;
        color: #B37600;
        line-height: 1.5;
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
    padding: 20rpx 30rpx;
    padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
    background: #fff;
    border-top: 1rpx solid $border;
    box-shadow: 0 -2rpx 12rpx rgba(0,0,0,0.04);

    .price-info {
        display: flex;
        flex-direction: column;

        .pi-label {
            font-size: 22rpx;
            color: $gray;
            margin-bottom: 4rpx;
        }

        .pi-price {
            font-size: 40rpx;
            font-weight: bold;
            color: $primary;
        }
    }

    .submit-btn {
        height: 84rpx;
        border-radius: 42rpx;
        background: linear-gradient(135deg, $pink, $primary);
        padding: 0 56rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 30rpx;
        font-weight: bold;
        color: #fff;
        box-shadow: 0 8rpx 24rpx rgba(255,100,50,0.3);
    }
}
</style>
