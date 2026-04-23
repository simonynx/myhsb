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
                    <text class="tag" v-for="(slot, idx) in timeSlots" :key="idx">⏰ {{ slot }}</text>
                    <text class="tag">🕐 共 {{ duration }} 小时</text>
                </view>
            </view>
        </view>

        <!-- 房间定价（只读参考） -->
        <view class="price-ref-card">
            <view class="price-ref-title">🏷️ 房间定价</view>
            <view class="price-ref-row">
                <text class="ref-label">房间每小时</text>
                <text class="ref-value">¥{{ (pricePerHour / 100).toFixed(2) }}</text>
            </view>
            <view class="price-ref-row">
                <text class="ref-label">每人附加费</text>
                <text class="ref-value">¥{{ (pricePerPersonRef / 100).toFixed(2) }}</text>
            </view>
        </view>

        <!-- 人数设置 -->
        <view class="setting-card">
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

            <!-- 过期时间选择 -->
            <view class="setting-item">
                <view class="setting-left">
                    <text class="setting-icon">⏳</text>
                    <text class="setting-label">有效期</text>
                </view>
                <view class="expire-pills">
                    <view
                        class="expire-pill"
                        :class="{ active: expireHours === 12 }"
                        @click="expireHours = 12"
                    >
                        <text>12小时</text>
                    </view>
                    <view
                        class="expire-pill"
                        :class="{ active: expireHours === 24 }"
                        @click="expireHours = 24"
                    >
                        <text>24小时</text>
                    </view>
                    <view
                        class="expire-pill"
                        :class="{ active: expireHours === 48 }"
                        @click="expireHours = 48"
                    >
                        <text>48小时</text>
                    </view>
                </view>
            </view>
        </view>

        <!-- 费用计算（全员共享部分） -->
        <view class="cost-card">
            <view class="cost-title">🧮 费用计算（全员共享）</view>

            <view class="cost-formula">
                <view class="formula-line">
                    <text class="formula-text">时长费用 = ¥{{ (pricePerHour / 100).toFixed(2) }} × {{ duration }}小时</text>
                    <text class="formula-result">¥{{ timeCost }}</text>
                </view>
                <view class="formula-line">
                    <text class="formula-text">人头附加费 = ¥{{ (pricePerPersonRef / 100).toFixed(2) }} × {{ maxMembers }}人</text>
                    <text class="formula-result">¥{{ personCost }}</text>
                </view>
            </view>

            <view class="cost-divider"></view>

            <!-- 拼团折扣（全员共享） -->
            <view class="cost-row" v-if="groupDiscountAmount > 0">
                <text class="cost-label">拼团折扣（{{ groupDiscountPercent }}折）</text>
                <text class="cost-value discount">-¥{{ (groupDiscountAmount / 100).toFixed(2) }}</text>
            </view>

            <view class="cost-row total">
                <text class="cost-label">基础总价（拼团折扣后）</text>
                <text class="cost-value">¥{{ baseCostYuan }}</text>
            </view>

            <view class="cost-row suggest">
                <text class="cost-label">基础人均</text>
                <text class="cost-value suggest-price">¥{{ basePerPersonYuan }}</text>
            </view>

            <view class="cost-action" @click="resetToDefault">
                <text class="cost-action-text">💡 恢复默认均摊</text>
            </view>
        </view>

        <!-- 发起人专属设置 -->
        <view class="setting-card">
            <!-- 发起人承担份额（可调） -->
            <view class="setting-item">
                <view class="setting-left">
                    <text class="setting-icon">👑</text>
                    <text class="setting-label">发起人承担份额</text>
                </view>
                <view class="price-input-wrap">
                    <text class="price-prefix">¥</text>
                    <input
                        class="price-input"
                        type="digit"
                        v-model="initiatorInputYuan"
                        @focus="onInitiatorFocus"
                        @blur="formatInitiatorPrice"
                    />
                </view>
            </view>

            <!-- 成员人均（自动计算） -->
            <view class="setting-item">
                <view class="setting-left">
                    <text class="setting-icon">💎</text>
                    <text class="setting-label">成员人均</text>
                </view>
                <view class="member-price-readonly">
                    <text class="member-price-amount">¥{{ memberPriceYuan }}</text>
                    <text v-if="initiatorBaseFen > basePerPersonFen" class="member-price-subsidy">
                        (发起人补贴 ¥{{ ((initiatorBaseFen - basePerPersonFen) / 100).toFixed(2) }})
                    </text>
                </view>
            </view>

            <!-- 发起人折扣明细（只影响发起人自己的份额） -->
            <view class="cost-divider" style="margin: 12rpx 0;"></view>
            <view class="cost-row" v-if="memberDiscountAmount > 0">
                <text class="cost-label">会员折扣（{{ memberDiscountPercent }}折，仅发起人）</text>
                <text class="cost-value discount">-¥{{ (memberDiscountAmount / 100).toFixed(2) }}</text>
            </view>

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
                    <text class="rule-text">拼团有效期 <text class="rule-bold">{{ expireHours }} 小时</text>，超时自动解散并退款</text>
                </view>
                <view class="rule-item">
                    <text class="rule-dot">2</text>
                    <text class="rule-text">满员后自动成团，系统将为您锁定房间时段并创建预约</text>
                </view>
                <view class="rule-item">
                    <text class="rule-dot">3</text>
                    <text class="rule-text">发起人可随时<text class="rule-bold">解散拼团</text>，全员费用原路退回余额</text>
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
                <text class="bottom-label">发起人最终支付</text>
                <text class="bottom-price">¥{{ actualInitiatorPaidYuan }}</text>
                <text class="bottom-hint" v-if="initiatorBaseFen > actualInitiatorPaidFen">
                    （承担¥{{ initiatorBaseYuan }}，优惠减免¥{{ ((initiatorBaseFen - actualInitiatorPaidFen) / 100).toFixed(2) }}）
                </text>
            </view>
            <view class="submit-btn" :class="{ disabled: !isBalanceEnough }" @click="handleSubmit">
                <text>{{ isBalanceEnough ? '🚀 发起拼团' : '💰 余额不足' }}</text>
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
            pricePerPersonRef: 0,
            maxMembers: 4,
            initiatorInputYuan: '0.00',
            note: '',
            initiatorManuallyChanged: false,
            timeSlots: [],
            expireHours: 24,
            groupDiscountPercent: 100,
            memberDiscountPercent: 100,
        };
    },

    computed: {
        ...mapState(['token', 'userInfo']),
        accountBalanceYuan() {
            const balance = this.userInfo && this.userInfo.account_balance;
            return ((balance || 0) / 100).toFixed(2);
        },
        roomTotalCostFen() {
            return (this.pricePerHour * this.duration) + (this.pricePerPersonRef * this.maxMembers);
        },
        timeCost() {
            return ((this.pricePerHour * this.duration) / 100).toFixed(2);
        },
        personCost() {
            return ((this.pricePerPersonRef * this.maxMembers) / 100).toFixed(2);
        },
        roomTotalCost() {
            return (this.roomTotalCostFen / 100).toFixed(2);
        },

        // ===== 全员共享部分 =====
        // 拼团折扣后的基础总价（所有人共享）
        baseCostFen() {
            if (this.groupDiscountPercent >= 100) return this.roomTotalCostFen;
            return Math.ceil(this.roomTotalCostFen * this.groupDiscountPercent / 100);
        },
        baseCostYuan() {
            return (this.baseCostFen / 100).toFixed(2);
        },
        // 拼团折扣减免金额
        groupDiscountAmount() {
            return this.roomTotalCostFen - this.baseCostFen;
        },
        // 基础人均（拼团折扣后）
        basePerPersonFen() {
            if (this.maxMembers <= 0) return 0;
            return Math.ceil(this.baseCostFen / this.maxMembers);
        },
        basePerPersonYuan() {
            return (this.basePerPersonFen / 100).toFixed(2);
        },

        // ===== 发起人专属部分 =====
        // 发起人输入的基础份额（不含会员折扣）
        initiatorBaseFen() {
            const val = parseFloat(this.initiatorInputYuan);
            return Math.round((val || 0) * 100);
        },
        initiatorBaseYuan() {
            return (this.initiatorBaseFen / 100).toFixed(2);
        },
        // 成员人均 = (基础总价 - 发起人基础份额) / (maxMembers - 1)
        memberPriceFen() {
            if (this.maxMembers <= 1) return 0;
            const mp = Math.round((this.baseCostFen - this.initiatorBaseFen) / (this.maxMembers - 1));
            return Math.max(0, mp);
        },
        memberPriceYuan() {
            return (this.memberPriceFen / 100).toFixed(2);
        },

        // 会员折扣（只减发起人基础份额）
        memberDiscountAmount() {
            if (this.memberDiscountPercent >= 100) return 0;
            return Math.floor(this.initiatorBaseFen * (1 - this.memberDiscountPercent / 100));
        },

        // 发起人最终支付（拼团中不使用优惠券）
        actualInitiatorPaidFen() {
            return this.initiatorBaseFen - this.memberDiscountAmount;
        },
        actualInitiatorPaidYuan() {
            return (this.actualInitiatorPaidFen / 100).toFixed(2);
        },

        isBalanceEnough() {
            const balance = this.userInfo && this.userInfo.account_balance;
            return (balance || 0) >= this.actualInitiatorPaidFen;
        },
    },

    watch: {
        maxMembers(newVal) {
            if (!this.initiatorManuallyChanged) {
                this.initiatorInputYuan = this.basePerPersonYuan;
            }
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
        this.pricePerPersonRef = parseInt(options.price_per_person) || 0;

        // 时段列表
        try {
            this.timeSlots = JSON.parse(decodeURIComponent(options.time_list || '[]'));
        } catch (e) {
            this.timeSlots = [];
        }
        if (this.timeSlots.length === 0 && this.beginTime && this.endTime) {
            this.timeSlots = [this.beginTime + '~' + this.endTime];
        }

        // 获取会员折扣率
        if (this.userInfo && this.userInfo.discount) {
            this.memberDiscountPercent = parseInt(this.userInfo.discount) || 100;
        }

        // 获取拼团折扣率
        this.loadConfigAndCoupons();

        // 默认发起人承担份额 = 基础人均（均摊）
        const total = (this.pricePerHour * this.duration) + (this.pricePerPersonRef * this.maxMembers);
        this.initiatorInputYuan = (Math.ceil(total / this.maxMembers) / 100).toFixed(2);
    },

    onShow() {
        // 刷新余额
        this.loadConfigAndCoupons();
    },

    methods: {
        goBack() {
            uni.navigateBack();
        },

        loadConfigAndCoupons() {
            // 获取配置（拼团折扣率）
            AUTH.getConstance(this.token).then(res => {
                if (res && res._status === 0 && res.data) {
                    const gd = parseInt(res.data.group_discount_percent);
                    if (gd && gd > 0) {
                        this.groupDiscountPercent = gd;
                        // 如果还没手动修改过，自动更新为新的基础人均
                        if (!this.initiatorManuallyChanged) {
                            this.$nextTick(() => {
                                this.initiatorInputYuan = this.basePerPersonYuan;
                            });
                        }
                    }
                }
            }).catch(() => {});
        },

        changeMembers(delta) {
            const next = this.maxMembers + delta;
            if (next < 2 || next > 20) return;
            this.maxMembers = next;
        },

        onInitiatorFocus() {
            this.initiatorManuallyChanged = true;
        },

        formatInitiatorPrice() {
            let val = parseFloat(this.initiatorInputYuan);
            if (!val || val < 0) val = 0;
            // 不能超过基础总价
            const max = this.baseCostFen / 100;
            if (val > max) val = max;
            this.initiatorInputYuan = val.toFixed(2);
        },

        resetToDefault() {
            this.initiatorInputYuan = this.basePerPersonYuan;
            this.initiatorManuallyChanged = false;
            uni.showToast({ title: '已恢复默认均摊', icon: 'none' });
        },

        handleSubmit() {
            if (!this.isBalanceEnough) {
                uni.showModal({
                    title: '余额不足',
                    content: `发起人最终需支付 ¥${this.actualInitiatorPaidYuan}，当前余额 ¥${this.accountBalanceYuan}，是否去充值？`,
                    success: (r) => {
                        if (r.confirm) uni.navigateTo({ url: '/pages/user/deposit/deposit' });
                    }
                });
                return;
            }
            if (this.maxMembers < 2 || this.maxMembers > 20) {
                uni.showToast({ title: '人数需在 2~20 之间', icon: 'none' });
                return;
            }
            // 发起人基础份额不能低于基础人均（否则成员要倒贴）
            if (this.initiatorBaseFen < this.basePerPersonFen) {
                uni.showToast({ title: `发起人承担不能低于基础人均 ¥${this.basePerPersonYuan}`, icon: 'none' });
                return;
            }
            if (this.initiatorBaseFen > this.baseCostFen) {
                uni.showToast({ title: `发起人承担不能超过基础总价 ¥${this.baseCostYuan}`, icon: 'none' });
                return;
            }
            if (this.memberPriceFen < 0) {
                uni.showToast({ title: '计算出错，成员人均不能为负数', icon: 'none' });
                return;
            }

            const data = {
                room_id: this.roomId,
                date: this.date,
                begin_time: this.beginTime,
                end_time: this.endTime,
                max_members: this.maxMembers,
                price_per_person: this.memberPriceFen,
                note: this.note.trim(),
                expire_hours: this.expireHours,
            };

            // 支付确认弹窗
            const lines = [
                `房间基础总价：¥${this.baseCostYuan}`,
                `成员人均：¥${this.memberPriceYuan}`,
                `发起人承担：¥${this.initiatorBaseYuan}`,
            ];
            if (this.memberDiscountAmount > 0) {
                lines.push(`会员折扣：-¥${(this.memberDiscountAmount / 100).toFixed(2)}`);
            }
            lines.push(`发起人最终支付：¥${this.actualInitiatorPaidYuan}`);
            lines.push(`目标人数：${this.maxMembers} 人`);
            lines.push(`有效期：${this.expireHours} 小时`);

            uni.showModal({
                title: '确认支付',
                content: lines.join('\n'),
                confirmText: '确认支付',
                cancelText: '再想想',
                success: (modalRes) => {
                    if (!modalRes.confirm) return;

                    uni.showLoading({ title: '创建中...' });
                    AUTH.createGroup(this.token, data).then(res => {
                        uni.hideLoading();
                        if (res && res._status === 0 && res.data) {
                            const subsidyHint = res.data && res.data._subsidy_hint;
                            if (subsidyHint) {
                                uni.showModal({
                                    title: '补贴提示',
                                    content: subsidyHint + '，是否继续创建？',
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
                                    content: '发起拼团最终需支付 ¥' + this.actualInitiatorPaidYuan + '，是否去充值？',
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
                }
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

// 房间定价参考
.price-ref-card {
    margin: 0 24rpx 24rpx;
    background: #fff;
    border-radius: 32rpx;
    padding: 28rpx;
    box-shadow: 0 8rpx 32rpx rgba(77,150,255,0.06);
    border: 4rpx solid #E8F4FF;

    .price-ref-title {
        font-size: 30rpx;
        font-weight: bold;
        color: $dark;
        margin-bottom: 16rpx;
        display: block;
    }

    .price-ref-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10rpx 0;

        .ref-label {
            font-size: 26rpx;
            color: $gray;
        }

        .ref-value {
            font-size: 28rpx;
            color: $dark;
            font-weight: bold;
        }
    }
}

// 设置卡片
.setting-card {
    margin: 0 24rpx 24rpx;
    background: #fff;
    border-radius: 32rpx;
    padding: 10rpx 28rpx;
    box-shadow: 0 8rpx 32rpx rgba(77,150,255,0.06);

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

// 有效期选择 pills
.expire-pills {
    display: flex;
    align-items: center;
    gap: 16rpx;

    .expire-pill {
        padding: 10rpx 24rpx;
        border-radius: 24rpx;
        background: $light;
        border: 2rpx solid $border;
        transition: all 0.2s;

        text {
            font-size: 26rpx;
            color: $gray;
        }

        &.active {
            background: linear-gradient(135deg, $pink, $primary);
            border-color: $primary;
            box-shadow: 0 4rpx 12rpx rgba(255,100,50,0.2);

            text {
                color: #fff;
                font-weight: bold;
            }
        }
    }
}

// 成员人均只读展示
.member-price-readonly {
    display: flex;
    flex-direction: column;
    align-items: flex-end;

    .member-price-amount {
        font-size: 36rpx;
        font-weight: bold;
        color: $primary;
    }

    .member-price-subsidy {
        font-size: 22rpx;
        color: $gray;
        margin-top: 4rpx;
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

// 费用计算卡片
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

    .cost-formula {
        .formula-line {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10rpx 0;

            .formula-text {
                font-size: 26rpx;
                color: $gray;
            }

            .formula-result {
                font-size: 28rpx;
                color: $dark;
                font-weight: 500;
            }
        }
    }

    .cost-divider {
        height: 2rpx;
        background: $border;
        margin: 16rpx 0;
    }

    .cost-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12rpx 0;

        &.total {
            .cost-value {
                color: $primary;
                font-size: 34rpx;
            }
        }

        &.suggest {
            background: #F6FFED;
            margin: 12rpx -12rpx 0;
            padding: 16rpx 12rpx;
            border-radius: 16rpx;

            .suggest-price {
                color: $green;
                font-size: 36rpx;
            }
        }

        .cost-label {
            font-size: 28rpx;
            color: $dark;
            font-weight: 500;
        }

        .cost-value {
            font-size: 30rpx;
            color: $dark;
            font-weight: bold;

            &.discount {
                color: $green;
            }

            &.final-price {
                color: $primary;
                font-size: 34rpx;
            }
        }
    }

    .cost-action {
        margin-top: 16rpx;
        padding: 16rpx;
        background: #FFF8E1;
        border-radius: 16rpx;
        text-align: center;

        .cost-action-text {
            font-size: 26rpx;
            color: #B88800;
        }
    }
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

        &.disabled {
            background: #CCCCCC;
            box-shadow: none;
            border-color: #BBBBBB;
        }
    }
}
</style>
