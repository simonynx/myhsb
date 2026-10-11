<template>
    <view class="container">
        <!-- 自定义顶部栏 -->
        <view class="custom-header">
            <view class="header-safe">
                <text class="header-back" @click="goBack">←</text>
                <text class="header-title">🎮 发起组局</text>
                <view class="header-spacer"></view>
            </view>
        </view>

        <!-- 房间信息卡片 -->
        <view class="room-card">
            <image class="room-img" :src="roomImage" mode="aspectFill" />
            <view class="room-meta">
                <text class="room-name">{{ roomName }}</text>
                <view class="room-tags">
                    <text class="tag">{{ date }}</text>
                    <text class="tag">{{ beginTime }} ~ {{ endTime }}</text>
                    <text class="tag">共 {{ duration }} 小时</text>
                </view>
            </view>
        </view>

        <view class="pricing-status" v-if="!pricingReady">
            <text>{{ pricingLoading ? '正在核对当前房价与优惠…' : pricingError }}</text>
            <text class="pricing-retry" v-if="!pricingLoading" @click="loadCurrentPricing">重新获取</text>
        </view>

        <!-- 人数设置 -->
        <view class="setting-card">
            <view class="setting-item">
                <view class="setting-left">
                    <text class="setting-icon">👥</text>
                    <text class="setting-label">目标人数</text>
                </view>
                <view class="stepper">
                    <view class="step-btn" :class="maxMembers <= 2 ? 'disabled' : ''" @click="changeMembers(-1)">
                        <text>−</text>
                    </view>
                    <text class="step-value">{{ maxMembers }}</text>
                    <view class="step-btn" :class="maxMembers >= 20 ? 'disabled' : ''" @click="changeMembers(1)">
                        <text>+</text>
                    </view>
                </view>
            </view>

            <view class="setting-item vertical expire-setting">
                <view class="setting-left">
                    <text class="setting-icon">⏳</text>
                    <text class="setting-label">报名截止</text>
                </view>
                <text class="expire-fixed" :class="isTimeTooClose ? 'error' : ''">{{ expireDisplayText }}</text>
                <text class="expire-warning" v-if="!isTimeTooClose">到点未满员会自动结束，建议发起后尽快分享给朋友。</text>
                <text class="expire-warning error" v-else>距离开始不足2小时，请直接预约或选择更晚时段。</text>
            </view>
        </view>

        <!-- 闲时房费已按段优惠；仅组局优惠作为独立扣减项 -->
        <view class="cost-card" v-if="pricingReady">
            <view class="cost-title">组局费用估算</view>
            <text class="bill-context">{{ pricingBill.contextText }}</text>
            <view class="bill-section">
                <view class="bill-row" v-for="row in pricingBill.roomRows" :key="row.key">
                    <view class="bill-copy">
                        <text class="bill-label">{{ row.label }}</text>
                        <text class="bill-formula">{{ row.formula }}</text>
                    </view>
                    <view class="bill-amount">
                        <text class="bill-original" v-if="row.originalYuan">门市 ¥{{ row.originalYuan }}</text>
                        <text>¥{{ row.amountYuan }}</text>
                    </view>
                </view>
                <view class="bill-row">
                    <view class="bill-copy">
                        <text class="bill-label">人头费</text>
                        <text class="bill-formula">{{ pricingBill.personFormula }}</text>
                    </view>
                    <text class="bill-amount">¥{{ pricingBill.personYuan }}</text>
                </view>
            </view>
            <view class="cost-row" v-if="pricingBill.savingsFen > 0">
                <text class="cost-label">{{ pricingBill.savingsLabel }}</text>
                <text class="cost-value discount">{{ pricingBill.savingsText }}</text>
            </view>
            <text class="bill-note">{{ pricingBill.note }}</text>
            <view class="cost-divider"></view>
            <view class="cost-row total">
                <view class="bill-copy">
                    <text class="cost-label">组局合计</text>
                    <text class="bill-formula">发起人会员优惠另计</text>
                </view>
                <view class="bill-amount">
                    <text class="bill-original" v-if="pricingBill.savingsFen > 0">门市合计 ¥{{ pricingBill.originalYuan }}</text>
                    <text class="cost-value">¥{{ baseCostYuan }}</text>
                </view>
            </view>
            <view class="cost-row suggest">
                <text class="cost-label">满 {{ maxMembers }} 人均摊参考</text>
                <text class="cost-value suggest-price">¥{{ basePerPersonYuan }}/人</text>
            </view>
            <text class="bill-note">按分均摊，尾差计入发起人份额；最终金额以创建结果为准。</text>
            <view class="cost-action" @click="resetToDefault">
                <text class="cost-action-text">恢复默认均摊</text>
            </view>
        </view>

        <!-- 发起人专属设置 -->
        <view class="setting-card">
            <view class="advanced-toggle" @click="showAdvanced = !showAdvanced">
                <view class="advanced-left">
                    <text class="advanced-icon">👑</text>
                    <view class="advanced-copy">
                        <text class="advanced-title">发起人补贴</text>
                        <text class="advanced-sub">默认均摊；想请朋友少付一点时再调整</text>
                    </view>
                </view>
                <text class="advanced-state">{{ showAdvanced ? '收起' : '可选' }}</text>
            </view>

            <block v-if="showAdvanced && pricingReady">
            <!-- 发起人承担份额（可调） -->
            <view class="setting-item">
                <view class="setting-left">
                    <text class="setting-icon">👑</text>
                    <text class="setting-label">发起人承担目标</text>
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
                    <text v-if="initiatorShareFen > basePerPersonFen" class="member-price-subsidy">
                        (发起人补贴 ¥{{ ((initiatorShareFen - basePerPersonFen) / 100).toFixed(2) }})
                    </text>
                </view>
            </view>

            <!-- 发起人折扣明细 -->
            <view class="cost-divider" style="margin: 12rpx 0;"></view>
            <view class="cost-row">
                <text class="cost-label">发起人份额（含尾差）</text>
                <text class="cost-value">¥{{ initiatorBaseYuan }}</text>
            </view>
            <view class="cost-row">
                <text class="cost-label">会员优惠（{{ memberDiscountText }}，仅发起人）</text>
                <text class="cost-value" :class="memberDiscountAmount > 0 ? 'discount' : ''">{{ memberDiscountAmount > 0 ? '-¥' + (memberDiscountAmount / 100).toFixed(2) : '-' }}</text>
            </view>
            </block>

            <!-- 付款提示 -->
            <view class="balance-hint">
                <text class="balance-icon">🔒</text>
                <text class="balance-text">先报名不付款；满员后临时锁房 15 分钟，请所有成员在详情页完成付款</text>
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
            <view class="rule-title">📋 组局规则</view>
            <view class="rule-list">
                <view class="rule-item">
                    <text class="rule-dot">1</text>
                    <text class="rule-text">报名截止：<text class="rule-bold">{{ expireDisplayText }}</text>，超时自动结束</text>
                </view>
                <view class="rule-item">
                    <text class="rule-dot">2</text>
                    <text class="rule-text">满员后进入 <text class="rule-bold">15 分钟付款期</text>，系统会临时锁住房间时段</text>
                </view>
                <view class="rule-item">
                    <text class="rule-dot">3</text>
                    <text class="rule-text">所有成员付款完成后，才会正式创建预约单</text>
                </view>
                <view class="rule-item">
                    <text class="rule-dot">4</text>
                    <text class="rule-text">付款期内有人未付，超时后已付费用按原支付方式退回</text>
                </view>
                <view class="rule-item">
                    <text class="rule-dot">5</text>
                    <text class="rule-text">报名期可直接退出；满员付款期不可退出</text>
                </view>
                <view class="rule-item">
                    <text class="rule-dot">6</text>
                    <text class="rule-text">满员后会提醒团友付款，也建议把详情页分享出去</text>
                </view>
            </view>
        </view>

        <!-- 底部占位 -->
        <view class="bottom-placeholder"></view>

        <!-- 底部操作栏 -->
        <view class="bottom-bar">
            <view class="bottom-left">
                <text class="bottom-label">满员后发起人支付</text>
                <text class="bottom-price">{{ pricingReady ? '¥' + actualInitiatorPaidYuan : '待核价' }}</text>
            </view>
            <view class="submit-btn" :class="!pricingReady || isTimeTooClose || submitting ? 'disabled' : ''" @click="handleSubmit">
                <text v-if="!pricingReady">{{ pricingLoading ? '核对价格中' : '请先获取价格' }}</text>
                <text v-else-if="isTimeTooClose">⏰ 时间太近了</text>
                <text v-else-if="submitting">创建中...</text>
                <text v-else>🚀 发起组局</text>
            </view>
        </view>

        <!-- 自定义支付确认弹窗 -->
        <view class="modal-mask" v-if="showConfirmModal" @click="cancelConfirm">
            <view class="modal-content" @click.stop>
                <view class="modal-header">
                    <text class="modal-title">确认发起</text>
                    <text class="modal-close" @click="cancelConfirm">✕</text>
                </view>
                <view class="modal-body">
                    <view class="modal-row">
                        <text class="modal-label">组局合计（会员优惠前）</text>
                        <text class="modal-value">¥{{ baseCostYuan }}</text>
                    </view>
                    <view class="modal-row">
                        <text class="modal-label">成员人均</text>
                        <text class="modal-value">¥{{ memberPriceYuan }}</text>
                    </view>
                    <view class="modal-row">
                        <text class="modal-label">发起人承担</text>
                        <text class="modal-value">¥{{ initiatorBaseYuan }}</text>
                    </view>
                    <view class="modal-row" v-if="memberDiscountAmount > 0">
                        <text class="modal-label">会员折扣</text>
                        <text class="modal-value discount">-¥{{ (memberDiscountAmount / 100).toFixed(2) }}</text>
                    </view>
                    <view class="modal-divider"></view>
                    <view class="modal-row total">
                        <text class="modal-label">满员后支付</text>
                        <text class="modal-value final">¥{{ actualInitiatorPaidYuan }}</text>
                    </view>
                    <view class="modal-divider"></view>
                    <view class="modal-row">
                        <text class="modal-label">目标人数</text>
                        <text class="modal-value">{{ maxMembers }} 人</text>
                    </view>
                    <view class="modal-row">
                        <text class="modal-label">报名截止</text>
                        <text class="modal-value">{{ expireDisplayText }}</text>
                    </view>
                </view>
                <view class="modal-footer">
                    <view class="modal-btn cancel" @click="cancelConfirm">
                        <text>再想想</text>
                    </view>
                    <view class="modal-btn confirm" :class="submitting ? 'disabled' : ''" @click="confirmSubmit">
                        <text>{{ submitting ? '处理中...' : '确认发起' }}</text>
                    </view>
                </view>
            </view>
        </view>
    </view>
</template>

<script>
import { mapState } from 'vuex';
import AUTH from '../../utils/auth.js';
import OFFPEAK from '../../utils/offpeak.js';

export default {
    data() {
        return {
            roomId: '',
            roomName: '',
            roomImage: '',
            date: '',
            beginTime: '',
            endTime: '',
            currentRoom: null,
            pricingLoading: false,
            pricingReady: false,
            pricingError: '',
            pricingLoadedAt: 0,
            maxMembers: 2,
            initiatorInputYuan: '0.00',
            note: '',
            initiatorManuallyChanged: false,
            groupDiscountPercent: 100,
            memberDiscountPercent: 100,
            showConfirmModal: false,
            showAdvanced: false,
            submitting: false,
            nowTimestamp: Date.now(),
            expireTicker: null,
        };
    },

    computed: {
        ...mapState(['token', 'userInfo']),
        accountBalanceYuan() {
            const balance = this.userInfo && this.userInfo.account_balance;
            return ((balance || 0) / 100).toFixed(2);
        },
        selectedHours() {
            if (!/^\d{1,2}:00$/.test(this.beginTime) || !/^\d{1,2}:00$/.test(this.endTime)) return [];
            const begin = Number(this.beginTime.split(':')[0]);
            const end = Number(this.endTime.split(':')[0]);
            return begin >= 0 && end <= 24 && end > begin ? [begin, end] : [];
        },
        duration() {
            return this.selectedHours.length ? this.selectedHours[1] - this.selectedHours[0] : 0;
        },
        pricePerHour() {
            return Number(this.currentRoom && this.currentRoom.price_per_hour) || 0;
        },
        pricePerPersonRef() {
            return Number(this.currentRoom && this.currentRoom.price_per_person) || 0;
        },
        appointmentPricing() {
            return OFFPEAK.priceAppointment(this.currentRoom, this.date,
                this.selectedHours.length ? [this.selectedHours] : []);
        },
        groupPricing() {
            return OFFPEAK.resolveGroupCost(this.currentRoom, this.date,
                this.selectedHours[0], this.selectedHours[1], this.maxMembers, this.groupDiscountPercent);
        },
        // 使用当前房间接口的合并规则，不信任旧链接中的价格、均价或优惠文案。
        pricingBill() {
            const quote = this.groupPricing;
            const yuan = value => (value / 100).toFixed(2);
            const hour = value => String(value).padStart(2, '0') + ':00';
            const segments = quote.offpeakApplied ? this.appointmentPricing.segments : [{
                start: this.selectedHours[0], end: this.selectedHours[1],
                hours: this.duration, price: this.pricePerHour, label: '门市价',
            }];
            const roomRows = segments.map((seg, index) => {
                const original = this.pricePerHour * seg.hours;
                const amount = seg.price * seg.hours;
                return {
                    key: 'room_' + index,
                    label: '房费 · ' + hour(seg.start) + '–' + hour(seg.end),
                    formula: (seg.label || '闲时价') + ' · ¥' + yuan(seg.price) + '/小时 × ' + seg.hours + '小时',
                    amountFen: amount,
                    amountYuan: yuan(amount),
                    originalYuan: amount < original ? yuan(original) : '',
                };
            });
            const personFee = this.pricePerPersonRef * this.maxMembers;
            const savings = Math.max(0, quote.originalCost - quote.baseCost);
            return {
                contextText: this.date + ' · ' + this.beginTime + '–' + this.endTime + ' · 满' + this.maxMembers + '人',
                roomRows,
                personFen: personFee,
                personYuan: yuan(personFee),
                personFormula: '¥' + yuan(this.pricePerPersonRef) + '/人 × ' + this.maxMembers + '人',
                originalYuan: yuan(quote.originalCost),
                savingsFen: savings,
                deductionFen: quote.offpeakApplied ? 0 : savings,
                savingsLabel: quote.offpeakApplied ? '闲时优惠（已计入房费）' : '组局优惠（' + this.groupDiscountPercent / 10 + '折）',
                savingsText: (quote.offpeakApplied ? '已省 ¥' : '-¥') + yuan(savings),
                note: quote.offpeakApplied
                    ? '闲时优惠仅调整对应时段房费；与组局优惠择优、不叠加。'
                    : (savings > 0 ? '组局优惠按门市房费与人头费合计计算，不叠加闲时优惠。' : '按所选日期、时段和目标人数计费。'),
            };
        },

        // ===== 全员共享部分 =====
        baseCostFen() {
            return this.groupPricing.baseCost;
        },
        baseCostYuan() {
            return (this.baseCostFen / 100).toFixed(2);
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
        // 后端按提交的成员单价反推发起人份额，尾差不能作为新的优惠或收费。
        initiatorShareFen() {
            return this.baseCostFen - this.memberPriceFen * (this.maxMembers - 1);
        },
        initiatorBaseYuan() {
            return (this.initiatorShareFen / 100).toFixed(2);
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

        // 会员折扣仅影响发起人；展示口径与后端反推份额一致，不改成员单价。
        memberDiscountText() {
            return this.memberDiscountPercent < 100 ? this.memberDiscountPercent / 10 + '折' : '无优惠';
        },
        memberDiscountAmount() {
            if (this.memberDiscountPercent >= 100) return 0;
            return Math.floor(this.initiatorShareFen * (1 - this.memberDiscountPercent / 100));
        },

        // 发起人最终支付（拼团中不使用优惠券）
        actualInitiatorPaidFen() {
            return this.initiatorShareFen - this.memberDiscountAmount;
        },
        actualInitiatorPaidYuan() {
            return (this.actualInitiatorPaidFen / 100).toFixed(2);
        },

        isBalanceEnough() {
            const balance = this.userInfo && this.userInfo.account_balance;
            return (balance || 0) >= this.actualInitiatorPaidFen;
        },
        maxExpireMs() {
            if (!this.date || !this.beginTime) return 48 * 3600 * 1000;
            const dateText = String(this.date).replace(/-/g, '/');
            const apt = new Date(dateText + ' ' + this.beginTime).getTime();
            const buffer = 2 * 3600 * 1000; // 2小时缓冲
            if (!apt || isNaN(apt)) return 0;
            return apt - buffer - this.nowTimestamp;
        },
        isTimeTooClose() {
            return this.maxExpireMs <= 0;
        },
        expireDisplayText() {
            if (this.isTimeTooClose) return '已过报名截止';
            return '开始前2小时截止';
        },
    },

    watch: {
        basePerPersonYuan() {
            if (!this.initiatorManuallyChanged) {
                this.initiatorInputYuan = this.basePerPersonYuan;
            }
        }
    },

    onLoad(options) {
        this.roomId = options.room_id || '';
        this.roomName = decodeURIComponent(options.room_name || '');
        this.roomImage = decodeURIComponent(options.room_image || '');
        this.date = options.date || '';
        this.beginTime = options.begin_time || '';
        this.endTime = options.end_time || '';
        // 获取会员折扣率
        if (this.userInfo && this.userInfo.discount) {
            this.memberDiscountPercent = parseInt(this.userInfo.discount) || 100;
        }

        // 直达或分享链接也重新获取当前房价和组局配置。
        this.loadCurrentPricing();

        // 默认发起人承担份额 = 基础人均（均摊）
        this.initiatorInputYuan = this.basePerPersonYuan;
        this.trackCreateView(options || {});
        this.startExpireTicker();
    },

    onShow() {
        this.nowTimestamp = Date.now();
        this.loadCurrentPricing();
    },

    onUnload() {
        this.clearExpireTicker();
    },

    methods: {
        goBack() {
            uni.navigateBack();
        },

        startExpireTicker() {
            this.clearExpireTicker();
            this.expireTicker = setInterval(() => {
                this.nowTimestamp = Date.now();
            }, 30000);
        },

        clearExpireTicker() {
            if (this.expireTicker) {
                clearInterval(this.expireTicker);
                this.expireTicker = null;
            }
        },

        loadCurrentPricing() {
            if (this.pricingLoading) return this._pricingRequest;
            if (this.pricingReady && Date.now() - this.pricingLoadedAt < 1000) return Promise.resolve();
            if (!this.roomId || !this.date || !this.selectedHours.length) {
                this.pricingError = '缺少有效的房间或预约时段，请返回重新选择。';
                return Promise.resolve();
            }
            this.pricingLoading = true;
            this.pricingReady = false;
            this.pricingError = '';
            this.cancelConfirm();
            this._pricingRequest = Promise.all([
                AUTH.getRoomDetail(this.token, this.roomId),
                AUTH.getConstance(this.token),
            ]).then(([roomRes, configRes]) => {
                if (!roomRes || roomRes._status !== 0 || !roomRes.data
                    || !configRes || configRes._status !== 0 || !configRes.data) {
                    throw new Error('pricing_unavailable');
                }
                const room = roomRes.data;
                const validMoney = value => value !== null && value !== undefined && value !== ''
                    && Number.isFinite(Number(value)) && Number(value) >= 0;
                if (!validMoney(room.price_per_hour) || !validMoney(room.price_per_person)) {
                    throw new Error('invalid_room_price');
                }
                this.currentRoom = room;
                this.roomName = roomRes.data.name || this.roomName;
                this.roomImage = roomRes.data.image1 || this.roomImage;
                this.groupDiscountPercent = parseInt(configRes.data.group_discount_percent, 10) || 100;
                this.memberDiscountPercent = parseInt(this.userInfo && this.userInfo.discount, 10) || 100;
                this.pricingReady = true;
                this.pricingLoadedAt = Date.now();
                if (!this.initiatorManuallyChanged) {
                    this.initiatorInputYuan = this.basePerPersonYuan;
                }
            }).catch(() => {
                this.pricingError = '暂时无法获取当前价格，请重试后发起组局。';
            }).then(() => {
                this.pricingLoading = false;
            });
            return this._pricingRequest;
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

        trackGroupEvent(event, extra) {
            const data = Object.assign({
                event: event,
                page_path: 'pages/group/create',
                source: 'group_create',
                room_id: this.roomId,
                max_members: this.maxMembers,
                date: this.date,
                begin_time: this.beginTime,
            }, extra || {});
            AUTH.trackEvent(data, this.token).catch(() => {});
        },

        trackCreateView(options) {
            this.trackGroupEvent('group_create_view', {
                source: options.source || 'appointment',
            });
        },

        handleSubmit() {
            if (this.submitting) return;
            if (!this.pricingReady) {
                uni.showToast({ title: this.pricingLoading ? '正在核对价格，请稍候' : '请先重新获取当前价格', icon: 'none' });
                return;
            }
            if (this.isTimeTooClose) {
                uni.showToast({ title: '距离开始不足2小时，请直接预约或选择更晚时段', icon: 'none' });
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
            };

            this.trackGroupEvent('group_create_submit', {
                price_per_person: this.memberPriceFen,
                expire_rule: 'start_minus_2h',
            });

            // 显示自定义支付确认弹窗
            this.showConfirmModal = true;
            this._pendingSubmitData = data;
        },

        cancelConfirm() {
            this.showConfirmModal = false;
            this._pendingSubmitData = null;
        },

        confirmSubmit() {
            if (this.submitting) return;
            const data = this._pendingSubmitData;
            if (!data) return;
            this.showConfirmModal = false;
            this._pendingSubmitData = null;

            this.submitting = true;
            uni.showLoading({ title: '创建中...' });
            AUTH.requestSubscribeMessage('group').catch(() => false).then(() => {
                return AUTH.createGroup(this.token, data);
            }).then(res => {
                uni.hideLoading();
                if (res && res._status === 0 && res.data) {
                    this.trackGroupEvent('group_create_success', {
                        group_id: res.data.object_id,
                    });
                    this.handleCreateSuccess(res.data);
                } else {
                    var msg = (res && res._reason) || '创建失败';
                    this.trackGroupEvent('group_create_failed', { reason: msg });
                    this.submitting = false;
                    uni.showToast({ title: msg, icon: 'none' });
                }
            }).catch(() => {
                uni.hideLoading();
                this.submitting = false;
                this.trackGroupEvent('group_create_failed', { reason: 'request_failed' });
                uni.showToast({ title: '创建失败', icon: 'none' });
            });
        },

        handleCreateSuccess(groupData) {
            const subsidyHint = groupData && groupData._subsidy_hint;
            const goDetail = () => {
                uni.showToast({ title: '组局创建成功', icon: 'success' });
                setTimeout(() => {
                    uni.redirectTo({ url: '/pages/group/detail?id=' + groupData.object_id });
                }, 800);
            };
            if (subsidyHint) {
                uni.showModal({
                    title: '补贴提示',
                    content: subsidyHint,
                    showCancel: false,
                    success: () => {
                        goDetail();
                    }
                });
            } else {
                goDetail();
            }
        },

    },
};
</script>

<style lang="scss">
$primary: #E96B35;
$pink: #FFB26B;
$green: #58755D;
$gray: #867363;
$dark: #534337;
$light: #FFF8F0;
$border: #F0E6D8;

.container {
    min-height: 100vh;
    background: linear-gradient(180deg, #FFF4E8 0%, #F8F8F8 300rpx);
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
    border: 4rpx solid #F3DCC9;

    .room-img {
        width: 140rpx;
        height: 140rpx;
        border-radius: 24rpx;
        margin-right: 24rpx;
        background: $light;
        flex-shrink: 0;
        border: 4rpx solid #FFF4E8;
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

// 账单采用暖橙点缀，单价、金额和优惠各有独立层级。
.pricing-status {
    margin: 0 24rpx 24rpx;
    padding: 24rpx 28rpx;
    background: #FFF4E8;
    border-radius: 24rpx;
    font-size: 26rpx;
    color: $dark;
    line-height: 1.6;
}
.pricing-retry {
    display: block;
    margin-top: 12rpx;
    color: $primary;
    font-weight: bold;
}
.bill-context, .bill-note {
    display: block;
    font-size: 23rpx;
    color: #867363;
    line-height: 1.6;
}
.bill-section { margin-top: 16rpx; }
.bill-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20rpx;
    padding: 16rpx 0;
}
.bill-copy {
    display: flex;
    flex: 1;
    min-width: 0;
    flex-direction: column;
    gap: 6rpx;
}
.bill-label { font-size: 28rpx; color: $dark; }
.bill-formula { font-size: 23rpx; color: #867363; line-height: 1.5; }
.bill-amount {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    flex-shrink: 0;
    gap: 6rpx;
    font-size: 28rpx;
    color: $dark;
    font-variant-numeric: tabular-nums;
}
.bill-original {
    font-size: 22rpx;
    font-weight: normal;
    color: #867363;
    text-decoration: line-through;
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

.advanced-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24rpx 0;
    border-bottom: 2rpx solid $border;
}

.advanced-left {
    display: flex;
    align-items: center;
    flex: 1;
}

.advanced-icon {
    font-size: 36rpx;
    margin-right: 14rpx;
}

.advanced-copy {
    display: flex;
    flex-direction: column;
    gap: 6rpx;
}

.advanced-title {
    font-size: 30rpx;
    color: $dark;
    font-weight: 500;
}

.advanced-sub {
    font-size: 22rpx;
    color: $gray;
    line-height: 1.35;
}

.advanced-state {
    font-size: 24rpx;
    color: $primary;
    font-weight: bold;
    margin-left: 18rpx;
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

.expire-setting {
    .expire-fixed {
        font-size: 30rpx;
        color: $primary;
        font-weight: bold;
        background: #FFF0EB;
        border-radius: 18rpx;
        padding: 14rpx 20rpx;

        &.error {
            color: #ff4757;
            background: #FFF1F0;
        }
    }

    .expire-warning {
        font-size: 24rpx;
        margin-top: 12rpx;
        color: $gray;
        line-height: 1.45;

        &.error { color: #ff4757; }
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

    .cost-divider {
        height: 2rpx;
        background: $border;
        margin: 16rpx 0;
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

// 全局费用行样式（cost-card 和 setting-card 共用）
.cost-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20rpx;
    padding: 12rpx 0;

    &.total {
        .cost-value {
            color: $primary;
            font-size: 34rpx;
        }
    }

    &.suggest {
        background: #FFF4E8;
        margin: 12rpx -12rpx 0;
        padding: 16rpx 12rpx;
        border-radius: 16rpx;

        .suggest-price {
            color: $primary;
            font-size: 32rpx;
        }
    }

    .cost-label {
        font-size: 28rpx;
        color: $dark;
        font-weight: 500;
    }

    .cost-value {
        flex-shrink: 0;
        font-variant-numeric: tabular-nums;
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

// 余额提示（setting-card 内）
.balance-hint {
    display: flex;
    align-items: center;
    padding: 16rpx 20rpx;
    background: #F6FFED;
    border-radius: 16rpx;
    margin: 12rpx 0;

    .balance-icon {
        font-size: 28rpx;
        margin-right: 10rpx;
    }

    .balance-text {
        font-size: 26rpx;
        color: $dark;
        font-weight: 500;
    }

    &.balance-warn {
        background: #FFF8E8;

        .balance-text {
            color: #9A5A00;
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
    border-top: 4rpx solid #F3DCC9;
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

            &.text-danger {
                color: #FF3B30;
                font-weight: bold;
            }
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

// 自定义支付确认弹窗（必须与 .bottom-bar 同级，不能嵌套在 .bottom-bar 内部）
.modal-mask {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-content {
    width: 600rpx;
    background: #fff;
    border-radius: 32rpx;
    overflow: hidden;
    box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.2);
}

.modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 28rpx 32rpx 16rpx;

    .modal-title {
        font-size: 34rpx;
        font-weight: bold;
        color: $dark;
    }

    .modal-close {
        font-size: 32rpx;
        color: $gray;
        padding: 8rpx;
    }
}

.modal-body {
    padding: 8rpx 32rpx 24rpx;

    .modal-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14rpx 0;

        &.total {
            .modal-label {
                font-size: 30rpx;
                font-weight: bold;
            }
            .modal-value.final {
                color: $primary;
                font-size: 36rpx;
            }
        }
    }

    .modal-label {
        font-size: 28rpx;
        color: #666;
    }

    .modal-value {
        font-size: 30rpx;
        color: $dark;
        font-weight: bold;

        &.discount {
            color: $green;
        }
    }

    .modal-divider {
        height: 2rpx;
        background: #EEEEEE;
        margin: 8rpx 0;
    }
}

.modal-footer {
    display: flex;
    border-top: 2rpx solid #EEEEEE;

    .modal-btn {
        flex: 1;
        height: 96rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 30rpx;
        font-weight: 500;

        &.cancel {
            color: #666;
            border-right: 2rpx solid #EEEEEE;
        }

        &.confirm {
            color: $primary;
            font-weight: bold;
        }

        &.disabled {
            color: #999;
            background: #F5F5F5;
        }

        &:active {
            background: #F5F5F5;
        }
    }
}
</style>
