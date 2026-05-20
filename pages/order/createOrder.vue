<template>
    <view class="page">
        <!-- 顶部状态栏占位 -->
        <view class="status-bar-placeholder"></view>

        <!-- 店铺信息头部 -->
        <view class="shop-header">
            <view class="shop-logo">
                <image src="/static/logo_small.jpg" mode="aspectFill" />
            </view>
            <view class="shop-info">
                <text class="shop-name">摸鱼划水吧</text>
                <text class="shop-tag">桌游 · 棋牌 · 休闲</text>
            </view>
        </view>

        <!-- 房间信息卡片 -->
        <view class="room-card">
            <view class="room-top">
                <view class="room-name">{{ currentProduct.name || '房间' }}</view>
                <view class="room-badge">{{ memberLevelName }}</view>
            </view>
            <view class="room-details">
                <text class="detail-item">📅 {{ selectDate }}</text>
                <view class="time-slots">
                    <view class="time-slot-chip" v-for="(t, idx) in selectTimes" :key="idx">{{ t }}</view>
                </view>
            </view>
            <view class="people-modifier">
                <text class="modifier-label">👥 人数</text>
                <view class="stepper">
                    <view class="stepper-btn" @click="decPeople">-</view>
                    <text class="stepper-num">{{ numOfPeople }}</text>
                    <view class="stepper-btn" @click="incPeople">+</view>
                </view>
            </view>
            <view class="room-prices" v-if="currentProduct">
                <view class="price-row">
                    <text class="price-label">包厢 {{ (currentProduct.price_per_hour / 100).toFixed(0) }}/小时 × {{ selectTimes.length }}时段</text>
                    <text class="price-value">¥{{ roomPrice }}</text>
                </view>
                <view class="price-row" v-if="numOfPeople > 0">
                    <text class="price-label">入场券 × {{ numOfPeople }}人</text>
                    <text class="price-value">¥{{ peoplePrice }}</text>
                </view>
            </view>
        </view>

        <!-- 增值服务 -->
        <view class="addons-section" v-if="roomAddons.length > 0">
            <view class="section-title" @click="toggleAddons">
                <view class="addon-title-main">
                    <text class="addon-title-text">🎁 升级体验（可选）</text>
                    <text class="addon-title-sub">布置、补给等提前加选，到店更省心</text>
                </view>
                <view class="title-right">
                    <text class="addon-summary" v-if="selectedAddons.length > 0">已选{{ selectedAddons.length }}项 +¥{{ addonsPrice }}</text>
                    <text class="addon-arrow">{{ addonsOpen ? '▼' : '▶' }}</text>
                </view>
            </view>
            <scroll-view class="addon-packages" scroll-x v-if="addonsOpen && addonPackages.length > 0">
                <view class="package-label">推荐加选</view>
                <view
                    class="addon-package"
                    v-for="pkg in addonPackages"
                    :key="pkg.key"
                    :class="pkg.selectedClass"
                    @click="toggleAddonPackage(pkg)"
                >
                    <view class="package-top">
                        <text class="package-title">{{ pkg.title }}</text>
                        <text class="package-price">+¥{{ formatAddonPrice(pkg.total) }}</text>
                    </view>
                    <text class="package-desc">{{ pkg.desc }}</text>
                    <text class="package-items">{{ pkg.itemText }}</text>
                </view>
            </scroll-view>
            <view class="addon-list" v-if="addonsOpen">
                <view
                    class="addon-item"
                    v-for="a in displayRoomAddons"
                    :key="a.object_id"
                    @click="toggleAddon(a)"
                >
                    <text class="addon-icon">{{ a.icon || '🎁' }}</text>
                    <view class="addon-info">
                        <text class="addon-name">{{ formatAddonName(a.name) }}</text>
                        <text class="addon-desc" v-if="a.description">{{ a.description }}</text>
                    </view>
                    <text class="addon-price">¥{{ formatAddonPrice(a.price) }}</text>
                    <view class="addon-check" :class="a.selectedClass">
                        <text v-if="a.selected">✓</text>
                    </view>
                </view>
            </view>
            <view class="addon-tip" v-if="addonsOpen">布置类建议提前预约，补给类以到店库存为准。</view>
        </view>

        <!-- 价格明细 -->
        <view class="price-section">
            <view class="section-title">费用明细</view>
            <view class="price-list">
                <!-- 基础消费 -->
                <view class="price-row">
                    <text class="row-label">基础消费</text>
                    <text class="row-value">¥{{ roomSubtotal }}</text>
                </view>

                <!-- 升级体验 -->
                <view class="price-row" v-if="addonsPriceFen > 0">
                    <text class="row-label">升级体验</text>
                    <text class="row-value">+¥{{ addonsPrice }}</text>
                </view>

                <!-- 会员折扣 -->
                <view class="price-row discount-row" v-if="memberDiscountAmountFen > 0">
                    <text class="row-label">
                        <text class="tag">会员</text>
                        {{ memberLevelName }}专享{{ memberDiscountText }}
                    </text>
                    <text class="row-value discount">-¥{{ memberDiscountAmount }}</text>
                </view>

                <!-- 积分兑换 -->
                <view class="price-row points-row" v-if="safeUserInfo.points > 0">
                    <view class="points-header">
                        <view class="points-info">
                            <text class="tag">积分</text>
                            <text class="points-balance">当前 {{ safeUserInfo.points }} 积分</text>
                        </view>
                        <switch
                            color="#FFCC33"
                            :checked="usePoints"
                            @change="togglePoints"
                            :disabled="!canUsePoints"
                        />
                    </view>
                    <view class="points-slider" v-if="usePoints && canUsePoints">
                        <view class="slider-wrap">
                            <view class="slider-labels">
                                <text class="slider-label">{{ pointsMinUse }}</text>
                                <text class="slider-label">{{ maxUsablePoints }}</text>
                            </view>
                            <slider
                                :value="pointsToUse"
                                :min="pointsMinUse"
                                :max="maxUsablePoints"
                                :step="pointsStep"
                                activeColor="#FFCC33"
                                backgroundColor="#E0E0E0"
                                block-size="18"
                                @change="onPointsChange"
                            />
                        </view>
                        <view class="points-result">
                            <text class="result-points">已选 {{ pointsToUse }} 积分</text>
                            <text class="result-money">-¥{{ pointsConvertMoney }}</text>
                        </view>
                    </view>
                </view>

                <!-- 无积分时提示 -->
                <view class="price-row points-zero-row" v-else>
                    <text class="row-label">
                        <text class="tag">积分</text>
                        当前0积分,消费预约可获取积分
                    </text>
                </view>

                <!-- 次卡/月卡折抵 -->
                <view class="price-row coupon-row" @click="openSubscriptionPicker">
                    <text class="row-label">
                        <text class="tag" :class="selectedSubscription ? 'tag-active' : 'tag-gray'">卡包</text>
                        <block v-if="selectedSubscription">{{ selectedSubscription.card_template.name }}</block>
                        <block v-else-if="usableSubscriptions.length > 0">{{ usableSubscriptions.length }}张可用</block>
                        <block v-else>次卡/月卡折抵</block>
                    </text>
                    <view class="coupon-right">
                        <text class="coupon-value" v-if="selectedSubscription">
                            -¥{{ (subscriptionDiscountAmountFen / 100).toFixed(2) }}
                        </text>
                        <text class="cell-more yticon icon-you" :class="selectedSubscription ? 'cell-active' : 'cell-inactive'">
                            {{ selectedSubscription ? '已选' : (usableSubscriptions.length > 0 ? '去选择' : '暂无可用') }}
                        </text>
                    </view>
                </view>

                <!-- 优惠券 -->
                <view class="price-row coupon-row" @click="openCouponPicker">
                    <text class="row-label">
                        <text class="tag" :class="selectedCoupon ? 'tag-active' : 'tag-gray'">券</text>
                        <block v-if="selectedCoupon">{{ selectedCoupon.name }}</block>
                        <block v-else-if="availableCoupons.length > 0">{{ availableCoupons.length }}张可用</block>
                        <block v-else>优惠券</block>
                    </text>
                    <view class="coupon-right">
                        <text class="coupon-value" v-if="selectedCoupon">
                            -¥{{ couponDiscount }}
                        </text>
                        <text class="cell-more yticon icon-you" :class="selectedCoupon ? 'cell-active' : 'cell-inactive'">
                            {{ selectedCoupon ? '已选' : (availableCoupons.length > 0 ? '去选择' : '暂无可用') }}
                        </text>
                    </view>
                </view>

                <!-- 余额提示 -->
                <view class="price-row balance-row">
                    <text class="row-label">
                        <text class="tag" :class="balanceEnough ? 'tag-active' : 'tag-gray'">余额</text>
                        账户余额 ¥{{ (safeUserInfo.account_balance / 100).toFixed(2) }}
                    </text>
                    <text v-if="balanceEnough" class="balance-status enough">可抵扣 ¥{{ (afterCouponPriceFen / 100).toFixed(2) }}</text>
                    <text v-else class="balance-status short">还差 ¥{{ (balanceShortfall / 100).toFixed(2) }}</text>
                </view>
                <view class="balance-hint" v-if="!balanceEnough" @click="goRecharge">
                    <text class="hint-text">余额不足？建议</text>
                    <text class="hint-link">{{ rechargeRecommendText }}</text>
                    <text class="hint-text"> →</text>
                </view>

                <!-- 分隔线 -->
                <view class="divider"></view>

                <!-- 实付金额 -->
                <view class="price-row final-row">
                    <text class="row-label">实付款</text>
                    <text class="final-price">¥{{ actualPrice }}</text>
                </view>
            </view>
        </view>

        <!-- 备注 -->
        <view class="remark-section">
            <text class="remark-label">备注</text>
            <input
                class="remark-input"
                v-model="desc"
                placeholder="有特殊需求请备注(选填)"
                placeholder-class="placeholder"
            />
        </view>

        <!-- 预约须知 -->
        <view class="booking-notice">
            <view class="booking-notice-title">📋 预约须知</view>
            <view class="booking-notice-row">
                <text class="booking-notice-dot"></text>
                <text class="booking-notice-text">包厢和主机按预约时段保留使用，超时需要按店内规则补时。</text>
            </view>
            <view class="booking-notice-row">
                <text class="booking-notice-dot"></text>
                <text class="booking-notice-text">大厅入场按实际人数购买；儿童、会员等优惠以店内核验为准。</text>
            </view>
            <view class="booking-notice-row">
                <text class="booking-notice-dot"></text>
                <text class="booking-notice-text">距预约开始超过1小时可申请退款，临近时段建议先联系店员调整。</text>
            </view>
            <view class="booking-notice-row">
                <text class="booking-notice-dot"></text>
                <text class="booking-notice-text">桌游、漫画和设备请爱惜使用，如有损坏或缺件请及时告知店员。</text>
            </view>
        </view>

        <!-- 底部提交栏 -->
        <view class="bottom-bar">
            <view class="bottom-info">
                <text class="bottom-label">实付款</text>
                <text class="bottom-price">¥{{ actualPrice }}</text>
                <text class="bottom-points" v-if="usePoints && pointsToUse > 0">(含{{ pointsToUse }}积分)</text>
            </view>
            <view class="submit-btn" :class="submitting ? 'btn-disabled' : ''" @click="submitOrder">
                <text v-if="!submitting">提交订单</text>
                <text v-else>提交中...</text>
            </view>
        </view>

        <!-- 优惠券选择面板 -->
        <view class="mask" :class="couponPickerOpen ? 'show' : 'hide'" @click="closeCouponPicker">
            <view class="coupon-picker" :class="couponPickerOpen ? 'show' : ''" @click.stop>
                <view class="picker-header">
                    <text class="picker-title">选择优惠券</text>
                    <text class="picker-close yticon icon-guanbi" @click="closeCouponPicker"></text>
                </view>
                <scroll-view scroll-y class="picker-body">
                    <!-- 不可用提示 -->
                    <view class="unavailable-hint" v-if="availableCoupons.length === 0 && unavailableCoupons.length === 0">
                        <text>暂无可用优惠券</text>
                    </view>
                    <!-- 可用券 -->
                    <view class="coupon-group-title" v-if="availableCoupons.length > 0">可用优惠券</view>
                    <view
                        class="coupon-card"
                        v-for="c in availableCoupons"
                        :key="c.object_id"
                        :class="selectedCoupon && selectedCoupon.object_id === c.object_id ? 'selected' : ''"
                        @click="selectCoupon(c)"
                    >
                        <view class="coupon-left">
                            <view class="coupon-price-wrap">
                                <text class="coupon-unit" v-if="c.displayPrefix">{{ c.displayPrefix }}</text>
                                <text class="coupon-price">{{ c.displayValue }}</text>
                            </view>
                            <text class="coupon-limit">{{ c.limitText }}</text>
                        </view>
                        <view class="coupon-right">
                            <view class="coupon-name">{{ c.name }}</view>
                            <view class="coupon-expire">有效期至 {{ c.expire_time }}</view>
                            <view class="coupon-check" v-if="selectedCoupon && selectedCoupon.object_id === c.object_id">✓</view>
                        </view>
                    </view>
                    <!-- 不可用券 -->
                    <view class="coupon-group-title" v-if="unavailableCoupons.length > 0">不可用优惠券</view>
                    <view
                        class="coupon-card disabled"
                        v-for="c in unavailableCoupons"
                        :key="c.object_id"
                    >
                        <view class="coupon-left">
                            <view class="coupon-price-wrap">
                                <text class="coupon-unit" v-if="c.displayPrefix">{{ c.displayPrefix }}</text>
                                <text class="coupon-price">{{ c.displayValue }}</text>
                            </view>
                            <text class="coupon-limit">{{ c.disable_reason }}</text>
                        </view>
                        <view class="coupon-right">
                            <view class="coupon-name">{{ c.name }}</view>
                            <view class="coupon-expire">有效期至 {{ c.expire_time }}</view>
                        </view>
                    </view>
                    <!-- 不使用优惠券选项 -->
                    <view class="no-coupon" :class="!selectedCoupon ? 'no-coupon-active' : ''" @click="selectCoupon(null)">
                        <text class="no-coupon-text">不使用优惠券</text>
                        <view class="coupon-check" v-if="!selectedCoupon">✓</view>
                    </view>
                </scroll-view>
            </view>
        </view>

        <!-- 次卡/月卡选择面板 -->
        <view class="mask" :class="subscriptionPickerOpen ? 'show' : 'hide'" @click="closeSubscriptionPicker">
            <view class="coupon-picker" :class="subscriptionPickerOpen ? 'show' : ''" @click.stop>
                <view class="picker-header">
                    <text class="picker-title">选择可用卡包</text>
                    <text class="picker-close yticon icon-guanbi" @click="closeSubscriptionPicker"></text>
                </view>
                <scroll-view scroll-y class="picker-body">
                    <view class="unavailable-hint" v-if="usableSubscriptions.length === 0">
                        <text>暂无可用次卡或月卡</text>
                    </view>
                    <view class="coupon-card"
                        v-for="sub in usableSubscriptions"
                        :key="sub.object_id"
                        :class="selectedSubscription && selectedSubscription.object_id === sub.object_id ? 'selected' : ''"
                        @click="selectSubscription(sub)"
                    >
                        <view class="coupon-left" style="background: linear-gradient(135deg, #FF8C42, #E8784A); border-right-color: rgba(255,255,255,0.25);">
                            <view class="coupon-price-wrap">
                                <text class="coupon-price" style="color: #ffffff !important;">{{ sub.remaining_limit }}</text>
                                <text class="coupon-unit" style="color: #ffffff !important; margin-left: 2px;">{{ sub.card_template.target_type === 2 ? '时' : '次' }}</text>
                            </view>
                            <text class="coupon-limit" style="color: rgba(255,255,255,0.85) !important;">剩{{ sub.remaining_limit }}{{ sub.card_template.target_type === 2 ? '小时' : '次' }}</text>
                        </view>
                        <view class="coupon-right">
                            <view class="coupon-name">{{ sub.card_template.name }}</view>
                            <view class="coupon-expire" style="font-size: 20rpx; color: #999; margin-top: 4rpx;">适用: 包厢小时费</view>
                            <view class="coupon-expire" style="font-size: 20rpx; color: #999;" v-if="sub.card_template.cover_person_fee">· 包含：免1人大厅门票</view>
                            <view class="coupon-expire" style="font-size: 20rpx; color: #999;">有效期至 {{ sub.formatted_expire }}</view>
                            <view class="coupon-check" v-if="selectedSubscription && selectedSubscription.object_id === sub.object_id">✓</view>
                        </view>
                    </view>
                    <view class="no-coupon" :class="!selectedSubscription ? 'no-coupon-active' : ''" @click="selectSubscription(null)">
                        <text class="no-coupon-text">不使用卡包</text>
                        <view class="coupon-check" v-if="!selectedSubscription">✓</view>
                    </view>
                </scroll-view>
            </view>
        </view>
    </view>
</template>

<script>
import { mapState, mapActions } from 'vuex';
import AUTH from '../../utils/auth.js';
import COUPON from '../../utils/coupon.js';
import { formatDate } from '../../common/util.js';

export default {
    data() {
        return {
            currentProduct: null,
            currentSelectDate: null,
            selectTimes: [],
            numOfPeople: 2,
            singlePersonPrice: 0,
            desc: '',

            // 优惠券
            couponPickerOpen: false,
            myCoupons: [],       // {object_id, name, discount, min_consume, expire_time, status, status_text}
            selectedCoupon: null,
            couponManuallySelected: false,

            // 积分
            usePoints: false,
            pointsToUse: 0,

            // 增值服务
            roomAddons: [],
            selectedAddons: [],
            addonsOpen: true,

            // 提交状态
            submitting: false,

            // 次卡/月卡
            mySubscriptions: [],
            selectedSubscription: null,
            subscriptionPickerOpen: false,
        };
    },

    computed: {
        ...mapState(['hasLogin', 'token', 'userInfo']),

        safeUserInfo() {
            return this.userInfo || { points: 0, account_balance: 0, points_config: {} };
        },

        selectDate() {
            return this.currentSelectDate || '';
        },

        selectTimesStr() {
            if (this.selectTimes.length === 0) return '';
            return this.selectTimes.join(', ');
        },

        // 原始价格(分)
        roomPriceFen() {
            if (!this.currentProduct || !this.currentProduct.price_per_hour) return 0;
            return this.currentProduct.price_per_hour * this.selectTimes.length;
        },

        peoplePriceFen() {
            return this.singlePersonPrice * this.numOfPeople;
        },

        addonsPriceFen() {
            return this.selectedAddons.reduce((sum, a) => sum + (a.price || 0), 0);
        },

        addonsPrice() {
            return (this.addonsPriceFen / 100).toFixed(2);
        },

        addonPackages() {
            const packages = [];

            const birthdayDecor = this.findAddonByAllKeywords(['生日', '布置']);
            const partyFood = this.findAddonByAnyKeywords(['多人小食', '小食盘'], ['生日']);
            const drinkSupply = this.findAddonByAnyKeywords(['饮品零食', '饮品', '零食补给'], ['生日']);

            if (birthdayDecor && partyFood) {
                packages.push(this.buildAddonPackage(
                    'birthday_combo',
                    '生日小聚',
                    '布置加小食，适合给朋友一个轻松庆生局',
                    [birthdayDecor, partyFood]
                ));
            }

            if (partyFood && drinkSupply) {
                packages.push(this.buildAddonPackage(
                    'party_supply_combo',
                    '多人补给',
                    '饮品零食和小食盘一起备好，适合4人以上朋友局',
                    [drinkSupply, partyFood]
                ));
            }
            for (let i = 0; i < packages.length; i++) {
                packages[i].selectedClass = this.isAddonPackageSelected(packages[i]) ? 'selected' : '';
            }
            return packages;
        },

        displayRoomAddons() {
            return this.roomAddons.map(a => {
                const selected = this.isAddonSelected(a);
                return Object.assign({}, a, {
                    selected: selected,
                    selectedClass: selected ? 'checked' : '',
                });
            });
        },

        originalPriceFen() {
            return this.roomPriceFen + this.peoplePriceFen + this.addonsPriceFen;
        },

        // 房间+人数小计（会员折扣基数，不含增值服务）
        roomSubtotalFen() {
            return this.roomPriceFen + this.peoplePriceFen;
        },

        roomSubtotal() {
            return (this.roomSubtotalFen / 100).toFixed(2);
        },

        originalPrice() {
            return (this.originalPriceFen / 100).toFixed(2);
        },

        roomPrice() {
            return (this.roomPriceFen / 100).toFixed(2);
        },

        peoplePrice() {
            return (this.peoplePriceFen / 100).toFixed(2);
        },

        memberLevelName() {
            return (this.userInfo && this.userInfo.member_level_name) || '';
        },

        userDiscount() {
            return (this.userInfo && this.userInfo.discount) || 100;
        },

        memberDiscountText() {
            const d = this.userDiscount;
            if (!d || d >= 100) return '';
            const val = d / 10;
            return (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)) + '折';
        },

        usableSubscriptions() {
            if (!this.mySubscriptions) return [];
            return this.mySubscriptions.filter(sub => {
                if (sub.card_template.target_type !== 2) return false;
                if (sub.remaining_limit < this.selectTimes.length) return false;
                
                const usableRooms = sub.card_template.usable_rooms || [];
                if (usableRooms.length > 0) {
                    const roomId = this.currentProduct && this.currentProduct.object_id;
                    const match = usableRooms.some(r => r.object_id === roomId || r === roomId);
                    if (!match) return false;
                }
                return true;
            }).map(sub => {
                return Object.assign({}, sub, {
                    formatted_expire: formatDate(sub.expire_at)
                });
            });
        },

        subscriptionDeductedHours() {
            return this.selectedSubscription ? Math.min(this.selectTimes.length, this.selectedSubscription.remaining_limit) : 0;
        },

        subscriptionWaivedPerson() {
            return (this.selectedSubscription && this.selectedSubscription.card_template.cover_person_fee && this.numOfPeople > 0) ? 1 : 0;
        },

        subscriptionDiscountAmountFen() {
            if (!this.selectedSubscription || !this.currentProduct || !this.currentProduct.price_per_hour) return 0;
            const roomOffset = this.subscriptionDeductedHours * this.currentProduct.price_per_hour;
            const personOffset = this.subscriptionWaivedPerson * this.singlePersonPrice;
            return roomOffset + personOffset;
        },

        // 会员折扣金额(分)
        // 和后端一致: int(price * (1 - rate)) 截断取整
        // 注意：会员折扣只应用于卡包抵扣后的房间+人数的剩余现金部分，不含增值服务
        memberDiscountAmountFen() {
            const d = this.userDiscount;
            if (!d || d >= 100 || !this.currentProduct || !this.currentProduct.price_per_hour) return 0;
            const remainingRoomFee = Math.max(0, (this.selectTimes.length - this.subscriptionDeductedHours) * this.currentProduct.price_per_hour);
            const remainingPeopleFee = Math.max(0, (this.numOfPeople - this.subscriptionWaivedPerson) * this.singlePersonPrice);
            const memberDiscountBase = remainingRoomFee + remainingPeopleFee;
            return Math.floor(memberDiscountBase * (1 - d / 100));
        },

        memberDiscountAmount() {
            return (this.memberDiscountAmountFen / 100).toFixed(2);
        },

        // 折后价格(分)
        afterMemberPriceFen() {
            return this.originalPriceFen - this.subscriptionDiscountAmountFen - this.memberDiscountAmountFen;
        },

        // 积分相关
        // 积分最大可用(整数,根据配置的步长和上限生成档位)
        pointsStep() {
            return this.safeUserInfo.points_config && this.safeUserInfo.points_config.points_step || 100;
        },
        pointsMaxUse() {
            return this.safeUserInfo.points_config && this.safeUserInfo.points_config.points_max_use || 10000;
        },
        pointsMinUse() {
            return this.safeUserInfo.points_config && this.safeUserInfo.points_config.points_min_use || 100;
        },

        pointsToFen() {
            return this.safeUserInfo.points_config && this.safeUserInfo.points_config.points_to_fen || 1;
        },
        maxUsablePoints() {
            // 档位上限 = min(用户积分余额, 配置的最大抵扣量),并向下取整到步长的整数倍
            const raw = Math.min(this.safeUserInfo.points || 0, this.pointsMaxUse);
            return Math.floor(raw / this.pointsStep) * this.pointsStep;
        },

        canUsePoints() {
            // 必须满配置的最低门槛，且向下取整后有可用积分才能用
            return this.safeUserInfo.points >= this.pointsMinUse
                && this.maxUsablePoints > 0
                && this.afterMemberPriceFen > 0;
        },

        pointsConvertMoney() {
            return (this.pointsToUse * this.pointsToFen / 100).toFixed(2);
        },

        // 积分抵扣后剩余(分)
        afterPointsPriceFen() {
            if (!this.usePoints) return this.afterMemberPriceFen;
            return Math.max(0, this.afterMemberPriceFen - this.pointsToUse * this.pointsToFen);
        },

        // 优惠券预估优惠金额(分)
        // 折扣基数用 afterMemberPriceFen（会员折扣后、积分抵扣前的金额）
        couponDiscountFen() {
            return COUPON.calcCouponDiscount(this.selectedCoupon, this.afterMemberPriceFen);
        },

        // 优惠券相关
        couponDiscount() {
            if (!this.selectedCoupon) return '0.00';
            return (this.couponDiscountFen / 100).toFixed(2);
        },

        // 优惠券减免后(分)
        afterCouponPriceFen() {
            if (!this.selectedCoupon) return this.afterPointsPriceFen;
            return Math.max(0, this.afterPointsPriceFen - this.couponDiscountFen);
        },

        // 可用/不可用优惠券
        // 门槛判断基于 afterMemberPriceFen(会员折扣后),和后端一致
        availableCoupons() {
            return COUPON.getAvailableCoupons(this.myCoupons, this.afterMemberPriceFen);
        },

        unavailableCoupons() {
            return COUPON.getUnavailableCoupons(this.myCoupons, this.afterMemberPriceFen);
        },

        // 最终实付金额(分) — 仅含优惠(会员+优惠券+积分)，余额在支付页面处理
        finalPriceFen() {
            return this.afterCouponPriceFen;
        },

        actualPrice() {
            return (this.finalPriceFen / 100).toFixed(2);
        },

        // 余额是否足够支付优惠后金额（仅提示用，不在下单时抵扣）
        balanceEnough() {
            return (this.safeUserInfo.account_balance || 0) >= this.afterCouponPriceFen;
        },

        balanceShortfall() {
            return Math.max(0, this.afterCouponPriceFen - (this.safeUserInfo.account_balance || 0));
        },

        rechargeRecommendAmount() {
            const shortfallYuan = Math.ceil(this.balanceShortfall / 100);
            if (shortfallYuan <= 0) return 0;
            if (shortfallYuan <= 200) return 200;
            if (shortfallYuan <= 300) return 300;
            if (shortfallYuan <= 500) return 500;
            return 1000;
        },

        rechargeRecommendText() {
            if (!this.rechargeRecommendAmount) return '充值';
            return '充' + this.rechargeRecommendAmount + '元更省心';
        },

        submitDisabled() {
            return this.submitting;
        },
    },

    watch: {
        afterMemberPriceFen() {
            this.syncCouponSelection();
        },

        myCoupons() {
            this.syncCouponSelection();
        },
    },

    onLoad(option) {
        const roomData = this.$store.state.currentRoom || {};
        const selectItem = this.$store.state.currentSelectItem || {};
        this.currentProduct = Object.keys(selectItem).length ? selectItem : roomData;

        // 日期兜底
        if (!this.currentSelectDate) {
            const d = new Date();
            this.currentSelectDate = d.getFullYear() + '-' + (d.getMonth() + 1).toString().padStart(2, '0') + '-' + d.getDate().toString().padStart(2, '0');
        }

        const selects = selectItem.selects || roomData.selects || [];

        this.selectTimes = [];
        for (let i = 0; i < selects.length; i++) {
            const [begin_time = '', end_time = ''] = selects[i];
            if (!begin_time || !end_time) continue;
            const bParts = begin_time.split(' ');
            const eParts = end_time.split(' ');
            if (bParts.length < 2 || eParts.length < 2) continue;
            const [begin_date, pre_time] = bParts;
            const [end_date, next_time] = eParts;
            this.currentSelectDate = begin_date;
            const pre = pre_time.slice(0, -3);  // 去掉末尾 :00
            const next = next_time.slice(0, -3);
            this.selectTimes.push(`${pre}~${next}`);
        }

        this.singlePersonPrice = this.currentProduct.price_per_person || 0;
        this.loadMyCoupons();
        this.loadMySubscriptions();
        this.loadRoomAddons();
    },

    methods: {
        ...mapActions(['loginAndRegister', 'getUserInfo']),

        // 加载我的优惠券
        async loadMyCoupons() {
            if (!this.token) return;
            try {
                const res = await AUTH.getMyCoupons(this.token, 0);
                if (res && res._status === 0) {
                    const coupons = res.data || [];
                    this.myCoupons = COUPON.normalizeCoupons(coupons);
                }
            } catch (e) {
                console.log('load coupons error:', e);
            }
        },

        // 加载我的次卡/月卡
        async loadMySubscriptions() {
            if (!this.token) return;
            try {
                const res = await AUTH.getUserSubscriptions(this.token, 1);
                if (res && res._status === 0) {
                    this.mySubscriptions = res.data || [];
                    // 默认自动选择第一个可用的卡包
                    this.$nextTick(() => {
                        if (this.usableSubscriptions.length > 0) {
                            this.selectedSubscription = this.usableSubscriptions[0];
                        }
                    });
                }
            } catch (e) {
                console.log('load subscriptions error:', e);
            }
        },

        openSubscriptionPicker() {
            this.subscriptionPickerOpen = true;
        },

        closeSubscriptionPicker() {
            this.subscriptionPickerOpen = false;
        },

        selectSubscription(sub) {
            this.selectedSubscription = sub;
            this.subscriptionPickerOpen = false;
        },

        // 打开优惠券选择面板
        openCouponPicker() {
            this.couponPickerOpen = true;
        },

        closeCouponPicker() {
            this.couponPickerOpen = false;
        },

        // 选择优惠券
        selectCoupon(coupon) {
            this.couponManuallySelected = true;
            this.selectedCoupon = coupon;
            this.couponPickerOpen = false;
        },

        syncCouponSelection() {
            const result = COUPON.resolveCouponSelection(
                this.myCoupons,
                this.selectedCoupon,
                this.afterMemberPriceFen,
                this.couponManuallySelected
            );
            this.selectedCoupon = result.selectedCoupon;
            this.couponManuallySelected = result.manuallySelected;
            return result.selectedAvailable;
        },

        // 人数增减
        incPeople() {
            const max = this.currentProduct && this.currentProduct.seats_count || 10;
            if (this.numOfPeople < max) this.numOfPeople++;
        },
        decPeople() {
            if (this.numOfPeople > 1) this.numOfPeople--;
        },

        // 切换积分使用
        togglePoints(e) {
            this.usePoints = e.detail.value;
            if (!this.usePoints) {
                this.pointsToUse = 0;
            } else {
                // 默认使用最大可用积分
                this.pointsToUse = this.maxUsablePoints;
            }
        },

        onPointsChange(e) {
            let val = Math.floor(e.detail.value / this.pointsStep) * this.pointsStep;
            val = Math.max(this.pointsMinUse, Math.min(val, this.maxUsablePoints));
            this.pointsToUse = val;
        },



        // 提交订单
        async submitOrder() {
            if (!this.hasLogin) {
                uni.showModal({ title: '提示', content: '请先登录再提交订单', success: (res) => {
                    if (res.confirm) this.loginAndRegister();
                }});
                return;
            }
            if (this.submitDisabled) return;
            if (!this.syncCouponSelection()) {
                uni.showToast({ title: '已移除不可用优惠券，请确认金额', icon: 'none' });
                return;
            }
            const maxPeople = this.currentProduct && this.currentProduct.seats_count || 0;
            if (maxPeople > 0 && this.numOfPeople > maxPeople) {
                uni.showToast({ title: '预约人数不能超过房间容纳人数(' + maxPeople + '人)', icon: 'none' });
                this.submitting = false;
                return;
            }
            this.submitting = true;

            // 非强制请求订阅消息（失败不影响下单）
            this.$store.dispatch('requestSubscribeMessage').catch(() => {});

            try {
                // 构建时间列表
                const timeList = [];
                this.currentProduct.selects.forEach(item => {
                    const interval = [];
                    const [, pre_time] = item[0].split(' ');
                    const [, next_time] = item[1].split(' ');
                    const pre = pre_time.slice(0, -3);
                    const next = next_time.slice(0, -3);
                    interval.push(parseInt(pre));
                    interval.push(parseInt(next));
                    timeList.push(interval);
                });

                const param = {
                    order_type: 1,
                    room_id: this.currentProduct.object_id,
                    contact_name: this.safeUserInfo.nickname || this.safeUserInfo.username || '',
                    user_count: this.numOfPeople,
                    date: this.currentSelectDate,
                    time_list: timeList,
                    remark: this.desc,
                    use_points: this.usePoints ? this.pointsToUse : 0,
                    coupon_id: this.selectedCoupon ? this.selectedCoupon.object_id : null,
                    addons: this.selectedAddons.map(a => a.object_id),
                    expected_amount: this.finalPriceFen,
                    user_subscription_id: this.selectedSubscription ? this.selectedSubscription.object_id : null,
                };

                const res = await AUTH.checkout(this.token, param);
                if (!res) {
                    uni.hideLoading();
                    this.submitting = false;
                    return;
                }

                // 交叉验证:前后端金额是否一致
                if (res.data._amount_mismatch) {
                    console.warn('金额不一致:', '前端预估=', res.data._expected_amount, '后端实际=', res.data._actual_amount);
                }

                const orderNumber = res.data.order_number;
                const payAmount = res.data.pay_amount || 0;

                // 有金额需支付,跳转支付页面(以后端返回的 pay_amount 为准)
                uni.redirectTo({
                    url: `/pages/order/payment?parent_sn=${orderNumber}&entry=1&data=${encodeURIComponent(JSON.stringify(res.data))}`
                });
            } catch (e) {
                console.error('submit order error:', e);
                uni.showToast({ title: '创建订单失败', icon: 'none' });
            } finally {
                this.submitting = false;
            }
        },

        // 去充值
        goRecharge() {
            const amount = this.rechargeRecommendAmount || 300;
            uni.navigateTo({ url: '/pages/user/deposit/deposit?amount=' + amount });
        },

        // 加载房间增值服务
        async loadRoomAddons() {
            if (!this.currentProduct || !this.currentProduct.object_id) return;
            try {
                const res = await AUTH.getRoomAddons(this.token, this.currentProduct.object_id);
                if (res && res._status === 0) {
                    this.roomAddons = res.data || [];
                }
            } catch (e) {
                console.log('load room addons error:', e);
            }
        },

        toggleAddons() {
            this.addonsOpen = !this.addonsOpen;
        },

        toggleAddon(addon) {
            const idx = this.selectedAddons.findIndex(a => a.object_id === addon.object_id);
            if (idx >= 0) {
                this.selectedAddons.splice(idx, 1);
            } else {
                this.selectedAddons.push(addon);
            }
        },

        isAddonSelected(addon) {
            return this.selectedAddons.some(a => a.object_id === addon.object_id);
        },

        isAddonPackageSelected(pkg) {
            return pkg.items.every(a => this.isAddonSelected(a));
        },

        toggleAddonPackage(pkg) {
            const selected = this.isAddonPackageSelected(pkg);
            for (let i = 0; i < pkg.items.length; i++) {
                const addon = pkg.items[i];
                const idx = this.selectedAddons.findIndex(a => a.object_id === addon.object_id);
                if (selected && idx >= 0) {
                    this.selectedAddons.splice(idx, 1);
                } else if (!selected && idx < 0) {
                    this.selectedAddons.push(addon);
                }
            }
        },

        buildAddonPackage(key, title, desc, items) {
            return {
                key: key,
                title: title,
                desc: desc,
                items: items,
                total: items.reduce((sum, a) => sum + (a.price || 0), 0),
                itemText: items.map(a => this.formatAddonName(a.name)).join(' + ')
            };
        },

        findAddonByAllKeywords(include, exclude) {
            return this.findAddonByKeywords(include, exclude || [], true);
        },

        findAddonByAnyKeywords(include, exclude) {
            return this.findAddonByKeywords(include, exclude || [], false);
        },

        findAddonByKeywords(include, exclude, requireAll) {
            for (let i = 0; i < this.roomAddons.length; i++) {
                const addon = this.roomAddons[i];
                const text = String(addon.name || '') + String(addon.description || '');
                let includeCount = 0;
                for (let j = 0; j < include.length; j++) {
                    if (text.indexOf(include[j]) >= 0) {
                        includeCount++;
                    }
                }
                const hasInclude = requireAll ? includeCount === include.length : includeCount > 0;
                if (!hasInclude) continue;
                let hasExclude = false;
                for (let k = 0; k < exclude.length; k++) {
                    if (text.indexOf(exclude[k]) >= 0) {
                        hasExclude = true;
                        break;
                    }
                }
                if (!hasExclude) return addon;
            }
            return null;
        },

        formatAddonName(name) {
            return String(name || '').replace(/^[^\u4e00-\u9fa5A-Za-z0-9]+/g, '').trim();
        },

        formatAddonPrice(price) {
            const amount = (price || 0) / 100;
            return amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(1);
        },
    }
};
</script>

<style lang="scss">
$page-color: #F5F6F7;
$primary: #FF6432;
$gold: #FFB933;
$dark: #333;
$gray: #999;
$light-gray: #E8E8E8;

page {
    background: $page-color;
    padding-bottom: 120rpx;
}

.page {
    min-height: 100vh;
    background: $page-color;
}

.status-bar-placeholder {
    height: 88rpx;
    background: #fff;
}

// 店铺头部
.shop-header {
    display: flex;
    align-items: center;
    padding: 20rpx 30rpx;
    background: #fff;

    .shop-logo {
        width: 80rpx;
        height: 80rpx;
        border-radius: 50%;
        overflow: hidden;
        margin-right: 20rpx;
        image { width: 100%; height: 100%; }
    }

    .shop-info {
        display: flex;
        flex-direction: column;
        .shop-name { font-size: 32rpx; font-weight: bold; color: $dark; }
        .shop-tag { font-size: 24rpx; color: $gray; margin-top: 4rpx; }
    }
}

// 房间卡片
.room-card {
    margin: 20rpx;
    padding: 30rpx;
    background: #fff;
    border-radius: 20rpx;

    .room-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16rpx;
        .room-name { font-size: 32rpx; font-weight: bold; color: $dark; }
        .room-badge {
            font-size: 22rpx;
            color: #FF6432;
            background: #FFF0EB;
            padding: 4rpx 12rpx;
            border-radius: 20rpx;
        }
    }

    .room-details {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 16rpx;
        margin-bottom: 16rpx;
        .detail-item { font-size: 24rpx; color: $gray; }
    }

    .time-slots {
        display: flex;
        flex-wrap: wrap;
        gap: 8rpx;
        .time-slot-chip {
            background: #FFF0EB;
            color: #FF6432;
            font-size: 22rpx;
            padding: 4rpx 12rpx;
            border-radius: 8rpx;
        }
    }

    .people-modifier {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16rpx 0 4rpx;
        border-top: 1rpx solid $light-gray;
        .modifier-label { font-size: 28rpx; color: $dark; }
        .stepper {
            display: flex;
            align-items: center;
            gap: 0;
            border: 1rpx solid #E0E0E0;
            border-radius: 8rpx;
            overflow: hidden;
            .stepper-btn {
                width: 64rpx;
                height: 56rpx;
                line-height: 56rpx;
                text-align: center;
                font-size: 32rpx;
                color: $primary;
                background: #FFF;
            }
            .stepper-num {
                min-width: 64rpx;
                height: 56rpx;
                line-height: 56rpx;
                text-align: center;
                font-size: 28rpx;
                color: $dark;
                font-weight: bold;
                border-left: 1rpx solid #E0E0E0;
                border-right: 1rpx solid #E0E0E0;
                padding: 0 8rpx;
                box-sizing: border-box;
            }
        }
    }

    .room-prices {
        border-top: 1rpx solid $light-gray;
        padding-top: 20rpx;
        .price-row {
            display: flex;
            justify-content: space-between;
            font-size: 28rpx;
            color: $dark;
            margin-bottom: 10rpx;
            .price-label { color: $gray; }
            .price-value { font-weight: bold; }
        }
    }
}

// 价格明细
.price-section {
    margin: 0 20rpx;
    background: #fff;
    border-radius: 20rpx;
    padding: 30rpx;
    margin-bottom: 20rpx;

    .section-title {
        font-size: 28rpx;
        font-weight: bold;
        color: $dark;
        margin-bottom: 24rpx;
    }

    .price-list {
        .price-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            min-height: 56rpx;
            margin-bottom: 16rpx;
            flex-wrap: wrap;

            .row-label {
                font-size: 28rpx;
                color: $gray;
                flex: 1;
                display: flex;
                align-items: center;
            }

            .row-value {
                font-size: 28rpx;
                color: $dark;
            }

            .discount { color: $primary; }
        }

        .tag {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 40rpx;
            height: 36rpx;
            font-size: 20rpx;
            border-radius: 6rpx;
            margin-right: 8rpx;
            padding: 0 6rpx;
            box-sizing: border-box;
            &.tag-active { background: $primary; color: #fff; }
            &.tag-gray { background: #E0E0E0; color: $gray; }
        }

        .discount-row {
            background: #FFF8F6;
            border-radius: 10rpx;
            padding: 12rpx 16rpx;
        }

        // 积分区域
        .points-row {
            background: #FFFBF0;
            border-radius: 10rpx;
            padding: 16rpx;
            flex-direction: column;
            align-items: stretch;
            gap: 0;
            width: 100%;
            box-sizing: border-box;
        }
        .points-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            .points-info {
                display: flex;
                align-items: center;
                .points-balance {
                    font-size: 26rpx;
                    color: $gray;
                    margin-left: 8rpx;
                }
            }
            switch {
                transform: scale(0.92);
                transform-origin: right center;
            }
        }
        .points-slider {
            padding: 12rpx 0 0;
            border-top: 1rpx dashed #E8E0C0;
            margin-top: 12rpx;
            width: 100%;
            box-sizing: border-box;

            .slider-wrap {
                margin: 0;
                padding: 0 20rpx 0 18rpx;
            }

            .slider-labels {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0 0 0 18rpx;
                margin-bottom: -4rpx;
                .slider-label {
                    font-size: 22rpx;
                    color: #C0B080;
                }
            }

            slider { width: 100%; }

            .points-result {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-top: 10rpx;
                .result-points {
                    font-size: 26rpx;
                    color: $gray;
                }
                .result-money {
                    font-size: 28rpx;
                    color: $primary;
                    font-weight: bold;
                }
            }
        }

        // 优惠券行
        .coupon-row {
            cursor: pointer;
            .coupon-right {
                display: flex;
                align-items: center;
                .coupon-value { color: $primary; margin-right: 8rpx; font-weight: bold; }
            }
        }

        // 余额行
        .balance-row {
            .balance-status {
                font-size: 24rpx;
                font-weight: 500;
                &.enough { color: #07C160; }
                &.short { color: #FF4D4F; }
            }
        }

        .balance-hint {
            display: flex;
            align-items: center;
            padding: 8rpx 0 4rpx;
            .hint-text { font-size: 24rpx; color: $gray; }
            .hint-link { font-size: 24rpx; color: $primary; font-weight: bold; }
        }

        .divider {
            height: 1rpx;
            background: $light-gray;
            margin: 20rpx 0;
        }

        .final-row {
            .row-label { font-weight: bold; color: $dark; font-size: 30rpx; }
            .final-price {
                font-size: 40rpx;
                font-weight: bold;
                color: $primary;
            }
        }
    }
}

// 增值服务
.addons-section {
    margin: 0 20rpx;
    background: #fff;
    border-radius: 20rpx;
    padding: 30rpx;
    margin-bottom: 20rpx;

    .section-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 0;
        gap: 18rpx;

        .addon-title-main {
            flex: 1;
            display: flex;
            flex-direction: column;
        }
        .addon-title-text {
            font-size: 28rpx;
            font-weight: bold;
            color: $dark;
        }
        .addon-title-sub {
            font-size: 22rpx;
            color: $gray;
            margin-top: 6rpx;
            line-height: 1.35;
        }
        .title-right {
            display: flex;
            align-items: center;
            gap: 12rpx;
            flex-shrink: 0;
        }
        .addon-summary {
            font-size: 24rpx;
            color: $primary;
            font-weight: 500;
        }
        .addon-arrow {
            font-size: 24rpx;
            color: $gray;
        }
    }

    .addon-list {
        margin-top: 20rpx;
        .addon-item {
            display: flex;
            align-items: center;
            padding: 16rpx 0;
            border-bottom: 1rpx solid $light-gray;
            &:last-child { border-bottom: none; }
            &:active { background: #FAFAFA; }

            .addon-icon { font-size: 40rpx; margin-right: 16rpx; }
            .addon-info {
                flex: 1;
                .addon-name { font-size: 28rpx; color: $dark; font-weight: 500; }
                .addon-desc { font-size: 22rpx; color: $gray; margin-top: 4rpx; }
            }
            .addon-price { font-size: 28rpx; color: $primary; font-weight: bold; margin-right: 16rpx; }
            .addon-check {
                width: 40rpx;
                height: 40rpx;
                border-radius: 50%;
                border: 2rpx solid #DDD;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
                &.checked {
                    background: $primary;
                    border-color: $primary;
                    color: #fff;
                }
            }
        }
    }

    .addon-packages {
        white-space: nowrap;
        margin-top: 22rpx;
        padding-bottom: 4rpx;
    }

    .package-label {
        display: inline-flex;
        align-items: center;
        height: 42rpx;
        padding: 0 18rpx;
        margin-right: 12rpx;
        border-radius: 22rpx;
        background: #FFF1E8;
        color: $primary;
        font-size: 22rpx;
        font-weight: bold;
        vertical-align: top;
    }

    .addon-package {
        display: inline-block;
        width: 270rpx;
        padding: 18rpx;
        margin-right: 16rpx;
        border-radius: 18rpx;
        background: #FFF8F4;
        border: 2rpx solid #FFE0D2;
        white-space: normal;
        vertical-align: top;

        &.selected {
            background: #FFF1E8;
            border-color: $primary;
        }

        .package-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12rpx;
            margin-bottom: 8rpx;
        }

        .package-title {
            font-size: 26rpx;
            color: $dark;
            font-weight: bold;
        }

        .package-price {
            font-size: 24rpx;
            color: $primary;
            font-weight: bold;
            flex-shrink: 0;
        }

        .package-desc {
            display: block;
            font-size: 22rpx;
            line-height: 1.35;
            color: #7A6A58;
            margin-bottom: 8rpx;
        }

        .package-items {
            display: block;
            font-size: 20rpx;
            line-height: 1.35;
            color: $gray;
        }
    }

    .addon-tip {
        margin-top: 14rpx;
        font-size: 22rpx;
        line-height: 1.4;
        color: $gray;
    }
}

// 备注
.remark-section {
    margin: 0 20rpx;
    background: #fff;
    border-radius: 20rpx;
    padding: 30rpx;
    display: flex;
    align-items: center;
    .remark-label {
        font-size: 28rpx;
        color: $gray;
        margin-right: 20rpx;
        flex-shrink: 0;
    }
    .remark-input {
        flex: 1;
        font-size: 28rpx;
        color: $dark;
    }
}

// 预约须知
.booking-notice {
    margin: 20rpx;
    background: #FFFDF8;
    border-radius: 20rpx;
    padding: 26rpx 28rpx;
    border: 2rpx solid rgba(255, 204, 51, 0.22);

    .booking-notice-title {
        font-size: 28rpx;
        font-weight: bold;
        color: $dark;
        margin-bottom: 18rpx;
    }

    .booking-notice-row {
        display: flex;
        align-items: flex-start;
        gap: 14rpx;
        margin-bottom: 14rpx;

        &:last-child { margin-bottom: 0; }
    }

    .booking-notice-dot {
        width: 10rpx;
        height: 10rpx;
        border-radius: 50%;
        background: $primary;
        margin-top: 14rpx;
        flex-shrink: 0;
    }

    .booking-notice-text {
        flex: 1;
        font-size: 24rpx;
        line-height: 1.55;
        color: #7A6A58;
    }
}

// 底部栏
.bottom-bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    height: 100rpx;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 30rpx;
    box-shadow: 0 -2rpx 10rpx rgba(0,0,0,0.05);
    z-index: 900;

    .bottom-info {
        display: flex;
        align-items: baseline;
        .bottom-label { font-size: 26rpx; color: $gray; }
        .bottom-price {
            font-size: 44rpx;
            font-weight: bold;
            color: $primary;
            margin-left: 8rpx;
        }
        .bottom-points {
            font-size: 22rpx;
            color: $gray;
            margin-left: 8rpx;
        }
    }

    .submit-btn {
        width: 220rpx;
        height: 80rpx;
        background: $primary;
        color: #fff;
        border-radius: 40rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 30rpx;
        font-weight: bold;
        &.btn-disabled { background: #CCC; }
    }
}

// 优惠券面板
.mask {
    position: fixed;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    background: rgba(0,0,0,0);
    z-index: 9990;
    transition: background 0.3s;
    &.show { background: rgba(0,0,0,0.5); }
    &.hide { display: none; }
}

.coupon-picker {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    max-height: 75vh;
    background: #fff;
    border-radius: 30rpx 30rpx 0 0;
    transform: translateY(100%);
    transition: transform 0.3s;
    z-index: 9991;
    display: flex;
    flex-direction: column;
    &.show { transform: translateY(0); }

    .picker-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 30rpx 40rpx;
        border-bottom: 1rpx solid $light-gray;
        .picker-title { font-size: 32rpx; font-weight: bold; color: $dark; }
        .picker-close { font-size: 40rpx; color: $gray; }
    }

    .picker-body {
        flex: 1;
        overflow-y: auto;
        padding: 20rpx 30rpx;
        max-height: 60vh;

        .unavailable-hint {
            text-align: center;
            padding: 40rpx;
            color: $gray;
            font-size: 28rpx;
        }

        .coupon-group-title {
            font-size: 24rpx;
            color: $gray;
            margin: 20rpx 0 12rpx;
            padding-left: 8rpx;
        }

        .coupon-card {
            display: flex;
            background: #FFF5F0;
            border-radius: 16rpx;
            margin-bottom: 16rpx;
            overflow: hidden;
            border: 2rpx solid transparent;
            &.selected { border-color: $primary; background: #FFF0EB; }
            &.disabled { opacity: 0.5; background: #F5F5F5; }

            .coupon-left {
                width: 200rpx;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 20rpx;
                background: $primary;
                color: #fff;
                .coupon-price-wrap {
                    display: flex;
                    align-items: baseline;
                    gap: 4rpx;
                    .coupon-unit { font-size: 24rpx; font-weight: bold; }
                    .coupon-price { font-size: 44rpx; font-weight: bold; }
                }
                .coupon-limit { font-size: 20rpx; opacity: 0.8; margin-top: 4rpx; }
            }

            .coupon-right {
                flex: 1;
                padding: 20rpx 24rpx;
                display: flex;
                flex-direction: column;
                justify-content: center;
                position: relative;
                .coupon-name { font-size: 28rpx; color: $dark; font-weight: bold; margin-bottom: 8rpx; }
                .coupon-expire { font-size: 22rpx; color: $gray; }
                .coupon-check {
                    position: absolute;
                    right: 20rpx;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 40rpx;
                    height: 40rpx;
                    background: $primary;
                    color: #fff;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 24rpx;
                }
            }
        }

        .no-coupon {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 24rpx 30rpx;
            background: #F5F5F5;
            border-radius: 16rpx;
            margin-top: 16rpx;
            border: 2rpx dashed #D0D0D0;
            font-size: 28rpx;
            color: $gray;
            transition: all 0.2s;
            &.no-coupon-active {
                background: #FFF8F5;
                border-color: $primary;
                color: $primary;
                .no-coupon-text { font-weight: bold; }
            }
            .no-coupon-text { transition: all 0.2s; }
            .coupon-check {
                width: 40rpx;
                height: 40rpx;
                background: $gray;
                color: #fff;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24rpx;
            }
        }
    }
}
</style>
