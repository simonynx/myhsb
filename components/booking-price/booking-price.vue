<template>
    <view class="booking-price">
        <view class="rate-heading">
            <text class="rate-title">{{ view.hasSelection ? '本次计费' : '当天价目表' }}</text>
            <text class="rate-date">{{ date }}</text>
        </view>
        <view v-if="!view.hasSelection">
            <view v-for="row in view.day.rows" :key="row.key" :class="row.className">
                <text>{{ row.timeText }}</text>
                <text>{{ row.label }} <text class="rate-amount">¥{{ row.priceText }}/小时</text></text>
            </view>
            <text class="rate-note">跨时段按各段单价相加，不会整单恢复原价。</text>
        </view>
        <view v-else-if="view.valid">
            <view class="rate-total-row">
                <view>
                    <text class="rate-selection">{{ view.label }}</text>
                    <view class="rate-total"><text class="rate-total-label">包厢费</text><text>¥{{ view.roomText }}</text></view>
                </view>
                <text class="rate-saving" v-if="view.quote.saveFee > 0">房费已省 ¥{{ view.saveText }}</text>
            </view>
            <view class="rate-summary">
                <text class="rate-note">另加 ¥{{ view.personText }}/人入场费</text>
                <view class="rate-toggle" role="button" @tap="expanded = !expanded">{{ expanded ? '收起明细' : '计费明细' }} {{ expanded ? '−' : '+' }}</view>
            </view>
            <view class="rate-details" v-if="expanded">
                <view v-for="row in view.rows" :key="row.key" :class="row.className">
                    <view><text class="rate-time">{{ row.timeText }}</text><text class="rate-formula">{{ row.hours }}小时 × ¥{{ row.priceText }}</text></view>
                    <text class="rate-amount">¥{{ row.amountText }}</text>
                </view>
            </view>
        </view>
        <text class="rate-warning" v-else>请在同一天选择连续时段，再查看本次费用。</text>
    </view>
</template>

<script>
import OFFPEAK from '../../utils/offpeak.js';
export default {
    props: {
        room: { type: Object, default: null },
        date: { type: String, default: '' },
        selects: { type: Array, default: function() { return []; } },
    },
    data() { return { expanded: false }; },
    computed: {
        view() { return OFFPEAK.selectionView(this.room, this.date, this.selects); },
    },
    watch: {
        date() { this.expanded = false; },
    },
};
</script>

<style lang="scss" scoped>
.booking-price { margin: 0 24rpx 20rpx; padding: 24rpx; border: 1rpx solid #EFDED0; border-radius: 20rpx; background: #FFF9F2; color: #463C34; }
.rate-heading, .rate-total-row, .rate-summary, .rate-row { display: flex; justify-content: space-between; align-items: center; gap: 14rpx; }
.rate-heading { margin-bottom: 14rpx; }
.rate-title { font-size: 26rpx; font-weight: 700; }
.rate-date { font-size: 22rpx; color: #77695D; }
.rate-row { padding: 12rpx 0; border-top: 1rpx solid #EFDED0; font-size: 24rpx; flex-wrap: wrap; }
.rate-row-promo .rate-amount { color: #BA4B23; }
.rate-amount { margin-left: 8rpx; font-weight: 700; white-space: nowrap; }
.rate-note { display: block; margin-top: 10rpx; font-size: 22rpx; line-height: 1.6; color: #71645A; }
.rate-selection { font-size: 24rpx; }
.rate-total { display: flex; align-items: baseline; gap: 12rpx; font-size: 40rpx; font-weight: 800; color: #BD4F28; margin-top: 8rpx; }
.rate-total-label { font-size: 24rpx; font-weight: 500; color: #57483C; }
.rate-saving { font-size: 22rpx; color: #AC4924; padding: 8rpx 14rpx; background: #FCE9D9; border-radius: 999rpx; }
.rate-total-row, .rate-summary { flex-wrap: wrap; }
.rate-toggle { padding: 18rpx 0 12rpx 16rpx; color: #9C512F; font-size: 24rpx; flex-shrink: 0; }
.rate-details { margin-top: 6rpx; }
.rate-time, .rate-formula { display: block; }
.rate-formula { margin-top: 4rpx; font-size: 22rpx; color: #71645A; }
.rate-warning { display: block; font-size: 24rpx; color: #AB4B30; line-height: 1.6; }
</style>
