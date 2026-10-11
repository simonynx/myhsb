<template>
	<view class="points-page">
		<view class="heading"><text class="page-title">积分福利</text></view>

		<view class="balance-card">
			<view class="balance-top">
				<text class="muted">{{ signedIn ? '我的积分' : '登录后查看积分' }}</text>
				<button class="text-button" @tap="goSignIn">{{ signedIn ? '去签到' : '登录 / 签到' }}</button>
			</view>
			<text class="balance" v-if="signedIn">{{ balanceView.points }}<text class="unit">积分</text></text>
			<text class="account-status" v-if="signedIn && accountLoading">账户更新中，兑换资格待确认…</text>
			<view class="account-error" v-else-if="signedIn && accountError">
				<text class="muted">{{ accountError }}</text>
				<button class="text-button" @tap="refreshPage">刷新账户</button>
			</view>
			<view class="balance-actions">
				<button class="primary-button" @tap="goBenefits">兑换福利</button>
				<button class="secondary-button" @tap="goConsume">消费抵扣</button>
			</view>
			<text class="value-text" v-if="eligibilityKnown && balanceView.valueText">{{ balanceView.valueText }}</text>
			<text class="cap-note">本单抵扣额度以订单金额和结算规则为准。</text>
		</view>

		<view class="rules-card">
			<button class="disclosure-button" @tap="toggleUsageRules" :aria-expanded="rulesExpanded">
				<text class="card-title">积分使用说明</text><text class="disclosure-label">{{ rulesExpanded ? '收起' : '展开' }}</text>
			</button>
			<view class="rules-content" v-if="rulesExpanded">
				<view class="rule-line" v-if="pointRules.configured"><text>抵扣比例</text><text>{{ pointRules.rateText }}</text></view>
				<text class="muted" v-if="pointRules.configured">{{ balanceView.usageText }}</text>
				<text class="muted" v-if="pointRules.configured">{{ pointRules.maxText }}</text>
				<text class="muted" v-else>具体比例、门槛和上限以结算页为准。</text>
				<text class="muted">在结算页手动选择积分；是否可与优惠券同用以订单规则为准。</text>
			</view>
		</view>

		<view id="benefits" class="benefits-section">
			<view class="section-heading">
				<text class="card-title">兑换福利</text><button class="text-button" @tap="goCoupons">我的优惠券 ›</button>
			</view>
			<text class="section-note">实物店内领取 · 消费券存入券包</text>
			<view class="state-card" v-if="goodsLoading"><text>正在加载积分福利…</text></view>
			<view class="state-card" v-else-if="goodsError">
				<text>{{ goodsError }}</text><button class="secondary-button" @tap="refreshPage">重新加载</button>
			</view>
			<view v-else-if="benefitList.length">
				<view :class="item.itemClass" v-for="item in benefitList" :key="item.object_id" @tap="openGoods(item, 'list')">
					<view class="item-top">
						<text class="item-title">{{ item.name }}</text>
						<text class="tag" v-if="item.kindText">{{ item.kindText }}</text>
						<text class="ready-tag" v-if="item.readyBadge">可兑换</text>
					</view>
					<text class="state-text" v-if="!item.canExchange">{{ item.stateText }}</text>
					<text class="condition-text" v-if="item.conditionText">{{ item.conditionText }}</text>
					<view class="item-footer"><text class="price">{{ item.priceText }}</text><button :class="item.buttonClass" @tap.stop="openGoods(item, 'button')">{{ item.actionText }}</button></view>
				</view>
			</view>
			<view class="state-card" v-else><text>暂无积分兑换福利</text></view>
		</view>

		<view class="records-card" v-if="signedIn">
			<button class="disclosure-button" @tap="toggleRecordSection" :aria-expanded="recordsOpen">
				<view class="records-heading"><text class="card-title">最近积分记录</text><text class="record-count" v-if="recordsLoading || recordsToken === identity">{{ recordsLoading ? '加载中' : recordsCount + '条' }}</text></view>
				<text class="disclosure-label">{{ recordsOpen ? '收起' : '展开' }}</text>
			</button>
			<view class="records-error" v-if="recordsError">
				<text class="muted">{{ recordsError }}</text><button class="text-button" @tap="loadPointRecords">重新加载记录</button>
			</view>
			<view class="records-content" v-if="recordsOpen">
				<text class="muted" v-if="recordsLoading">正在加载积分记录…</text>
				<view v-else-if="!recordsError && visibleRecords.length">
					<view class="record-item" v-for="record in visibleRecords" :key="record.id">
						<view class="record-top"><text>{{ record.point_type_name || '积分变动' }}</text><text :class="record.deltaClass">{{ record.deltaText }}</text></view>
						<text class="muted" v-if="record.remark">{{ record.remark }}</text>
						<text class="record-meta" v-if="record.created_at">{{ record.created_at }}</text>
						<text class="record-meta" v-if="record.balanceText">{{ record.balanceText }}</text>
					</view>
					<button class="text-button" v-if="recordsCount > 5" @tap="toggleRecords">{{ recordsExpanded ? '只看5条' : '更多记录' }}</button>
				</view>
				<text class="muted" v-else-if="!recordsError">暂无积分变动记录</text>
			</view>
		</view>
	</view>
</template>

<script>
import { mapState, mapActions } from 'vuex';
import AUTH from '../../utils/auth.js';
import LOYALTY from '../../utils/loyaltyPresentation.js';

export default {
	data() {
		return { goodsList: [], goodsLoading: true, goodsError: '', accountLoading: false, accountError: '', accountToken: '', accountInfo: null,
			rulesExpanded: false, pointRecords: [], recordsLoading: false, recordsError: '', recordsOpen: false, recordsExpanded: false, recordsToken: '' };
	},
	computed: {
		...mapState(['hasLogin', 'token', 'userInfo']),
		signedIn() { return !!this.hasLogin && !!this.token; },
		identity() { return this.signedIn ? this.token : ''; },
		eligibilityKnown() { return this.signedIn && this.accountToken === this.token && !this.accountLoading && !this.accountError; },
		balanceView() { return LOYALTY.pointsView(this.accountToken === this.identity && this.accountInfo ? this.accountInfo : this.userInfo, this.signedIn); },
		pointRules() {
			const config = this.eligibilityKnown && this.accountInfo && this.accountInfo.points_config || {};
			const rate = Number(config.points_to_fen), min = Number(config.points_min_use), step = Number(config.points_step), max = Number(config.points_max_use);
			const configured = [rate, min, step, max].every(value => isFinite(value) && value > 0 && Math.floor(value) === value) && max >= min;
			return { configured, rateText: configured ? '1积分抵¥' + LOYALTY.money(rate) : '', maxText: configured ? '每单规则上限' + max + '积分，按档取整' : '' };
		},
		benefitList() {
			const benefits = LOYALTY.benefits(this.goodsList, this.eligibilityKnown ? this.accountInfo : null, this.eligibilityKnown);
			const readyIds = benefits.filter(item => Number(item.exchange_type) === 2 && item.canExchange).slice(0, 2).map(item => item.object_id);
			return benefits.map(item => {
				const period = { day: '每日', week: '每周', month: '每月' }[item.max_buy_period] || '每人';
				const limitText = Number(item.max_buy_per_user) > 0 ? period + '限兑' + item.max_buy_per_user + '件' : '';
				const levelText = Number(item.member_level_required) > 0 ? '需会员等级' + item.member_level_required + '及以上' : '';
				const stateText = this.signedIn && !this.eligibilityKnown && !item.soldOut ? '账户待更新，兑换资格待确认' : item.stateText;
				return Object.assign({}, item, {
					limitText, levelText, stateText,
					conditionText: [levelText !== stateText ? levelText : '', limitText].filter(Boolean).join(' · '),
					kindText: Number(item.exchange_type) === 3 ? '积分＋现金' : item.coupon_template_id ? '消费券' : '',
					readyBadge: readyIds.includes(item.object_id),
					actionText: item.soldOut ? '查看商品' : item.canExchange ? '查看兑换' : this.signedIn ? '查看条件' : '查看详情',
					buttonClass: item.canExchange && Number(item.exchange_type) === 2 ? 'primary-button' : 'secondary-button',
				});
			});
		},
		pureBenefits() { return this.benefitList.filter(item => Number(item.exchange_type) === 2); },
		mixedBenefits() { return this.benefitList.filter(item => Number(item.exchange_type) === 3); },
		highlightBenefits() { return this.pureBenefits.filter(item => item.readyBadge); },
		recordsCount() { return this.signedIn && this.recordsToken === this.identity ? this.pointRecords.length : 0; },
		visibleRecords() {
			if (!this.recordsOpen || !this.signedIn || this.recordsToken !== this.identity) return [];
			return this.pointRecords.slice(0, this.recordsExpanded ? 20 : 5).map(record => {
				const points = record.points == null || record.points === '' ? NaN : Number(record.points);
				const balance = record.balance == null || record.balance === '' ? NaN : Number(record.balance);
				return Object.assign({}, record, {
					deltaText: isFinite(points) ? (points > 0 ? '+' : '') + points + '积分' : '变动待确认',
					deltaClass: 'record-delta' + (points > 0 ? ' gain' : points < 0 ? ' spent' : ''),
					balanceText: isFinite(balance) ? '变动后余额：' + balance + '积分' : '',
				});
			});
		},
	},
	watch: {
		identity() { if (!this._unloaded) this.refreshPage(); },
	},
	onLoad() { uni.setNavigationBarTitle({ title: '积分福利' }); },
	onShow() { return this.refreshPage(); },
	onUnload() {
		this._unloaded = true;
		this._refreshRequest = (this._refreshRequest || 0) + 1;
		this._goodsRequest = (this._goodsRequest || 0) + 1;
		this._accountRequest = (this._accountRequest || 0) + 1;
		this._recordsRequest = (this._recordsRequest || 0) + 1;
	},
	methods: {
		...mapActions(['getUserInfo']),
		async refreshPage() {
			if (this._unloaded) return;
			const request = this._refreshRequest = (this._refreshRequest || 0) + 1;
			const identity = this.identity;
			const records = this.loadPointRecords();
			const result = await Promise.all([this.refreshAccount(), this.loadGoods()]);
			if (!this._unloaded && request === this._refreshRequest && identity === this.identity && result[1]) this.track('points_benefits_view');
			await records;
		},
		async refreshAccount() {
			const request = this._accountRequest = (this._accountRequest || 0) + 1;
			const identity = this.identity;
			this.accountToken = '';
			this.accountError = '';
			this.accountLoading = !!identity;
			if (!identity) return;
			try {
				const res = await this.getUserInfo(true);
				if (!this._unloaded && request === this._accountRequest && identity === this.identity) {
					// Keep this identity's response even if an older store refresh finishes later.
					this.accountInfo = res && res.data || this.userInfo;
					this.accountToken = identity;
				}
			} catch (e) {
				if (!this._unloaded && request === this._accountRequest && identity === this.identity) this.accountError = '账户更新失败，余额可能未更新。';
			} finally {
				if (!this._unloaded && request === this._accountRequest) this.accountLoading = false;
			}
		},
		async loadGoods() {
			if (this._unloaded) return false;
			const request = this._goodsRequest = (this._goodsRequest || 0) + 1;
			const identity = this.identity;
			this.goodsLoading = true;
			this.goodsError = '';
			this.goodsList = [];
			try {
				const res = await AUTH.getGoodsList(identity || undefined);
				if (this._unloaded || request !== this._goodsRequest || identity !== this.identity) return false;
				if (!res || res._status !== 0 || !res.data || !Array.isArray(res.data.goods)) throw new Error('invalid goods');
				this.goodsList = res.data.goods;
				return true;
			} catch (e) {
				if (!this._unloaded && request === this._goodsRequest && identity === this.identity) this.goodsError = '福利加载失败，请重试';
				return false;
			} finally {
				if (!this._unloaded && request === this._goodsRequest) this.goodsLoading = false;
			}
		},
		async loadPointRecords() {
			if (this._unloaded) return;
			const request = this._recordsRequest = (this._recordsRequest || 0) + 1;
			const identity = this.identity;
			this.pointRecords = [];
			this.recordsToken = '';
			this.recordsError = '';
			this.recordsOpen = false;
			this.recordsExpanded = false;
			this.recordsLoading = !!identity;
			if (!identity) return;
			try {
				const res = await AUTH.getPointRecords(identity);
				if (this._unloaded || request !== this._recordsRequest || identity !== this.identity) return;
				if (!res || res._status !== 0 || !Array.isArray(res.data) || res.data.some(record => !record || !record.id)) throw new Error('invalid records');
				this.pointRecords = res.data.slice(0, 20);
				this.recordsToken = identity;
			} catch (e) {
				if (!this._unloaded && request === this._recordsRequest && identity === this.identity) this.recordsError = '积分记录加载失败，请重试';
			} finally {
				if (!this._unloaded && request === this._recordsRequest) this.recordsLoading = false;
			}
		},
		toggleUsageRules() { this.rulesExpanded = !this.rulesExpanded; },
		toggleRecordSection() { this.recordsOpen = !this.recordsOpen; this.recordsExpanded = false; },
		toggleRecords() { this.recordsExpanded = !this.recordsExpanded; },
		goBenefits() { uni.pageScrollTo({ selector: '#benefits', duration: 250 }); },
		goConsume() {
			uni.showActionSheet({ itemList: ['买大厅票', '预约房间'], success: res => {
				if (res.tapIndex === 0) this.goTicket();
				else if (res.tapIndex === 1) this.goAppointment();
			} });
		},
		track(event, extra) {
			const available = this.benefitList.filter(item => !item.soldOut).length;
			const eligible = this.benefitList.filter(item => item.canExchange).length;
			const data = Object.assign({ event, page_path: 'pages/voucher/points', source: 'points_benefits', available_count: available, eligible_count: eligible,
				current_points: this.signedIn ? this.balanceView.points : null, eligibility_known: this.eligibilityKnown }, extra || {});
			try { Promise.resolve(AUTH.trackEvent(data, this.identity || undefined)).catch(() => {}); } catch (e) { /* Analytics must not block navigation. */ }
		},
		openGoods(item, placement) {
			if (this._unloaded || this.goodsLoading || this.goodsError) return;
			const goods = this.goodsList.find(value => value && value.object_id === (item && item.object_id));
			if (!goods || !this.benefitList.some(value => value.object_id === goods.object_id)) return;
			this.track('points_benefit_click', { goods_id: goods.object_id, exchange_type: Number(goods.exchange_type), placement });
			uni.navigateTo({ url: '/pages/voucher/detail?data=' + encodeURIComponent(JSON.stringify(goods)) });
		},
		goTicket() { this.track('points_consumption_click', { destination: 'ticket' }); uni.navigateTo({ url: '/pages/ticket/buy?count=1' }); },
		goAppointment() { this.track('points_consumption_click', { destination: 'appointment' }); uni.switchTab({ url: '/pages/tabBar/appoint/appoint' }); },
		goSignIn() { this.track('points_signin_click'); uni.switchTab({ url: '/pages/user/user' }); },
		goCoupons() {
			this.track('points_wallet_click');
			if (!this.signedIn) { uni.switchTab({ url: '/pages/user/user' }); return; }
			uni.navigateTo({ url: '/pages/my/coupons/coupons' });
		},
	},
};
</script>

<style scoped>
.points-page { min-height: 100vh; box-sizing: border-box; padding: 24rpx 24rpx 64rpx; background: #F7F5F1; color: #3C332B; }
.heading { padding: 8rpx 0 24rpx; }
.page-title { display: block; font-size: 38rpx; font-weight: 700; }
.muted, .account-status, .cap-note, .section-note, .condition-text { display: block; font-size: 24rpx; color: #786F65; line-height: 1.6; }
.balance-card, .rules-card, .benefit-item, .state-card, .records-card { padding: 24rpx; margin-bottom: 20rpx; background: #FFFCF7; border: 1rpx solid #E9E3D9; border-radius: 24rpx; }
.balance-top, .section-heading { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12rpx; }
.balance-top { margin-top: -12rpx; }
.card-title { font-size: 28rpx; font-weight: 700; }
.balance { display: block; font-size: 72rpx; line-height: 1.2; font-weight: 700; margin: 0 0 20rpx; color: #526E59; }
.unit { font-size: 24rpx; font-weight: 400; margin-left: 12rpx; }
.account-error { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12rpx; }
.account-status { margin-bottom: 16rpx; }
.balance-actions { display: flex; gap: 16rpx; }
.balance-actions button { flex: 1; }
button { display: flex; align-items: center; justify-content: center; box-sizing: border-box; min-height: 76rpx; min-width: 76rpx; margin: 0; line-height: 1.4; font-size: 26rpx; border-radius: 20rpx; }
button::after { border: none; }
.primary-button, .secondary-button { padding: 14rpx 24rpx; }
.primary-button { background: #B95730; color: #FFFCF7; }
.secondary-button { background: #F2E9E0; color: #B95730; }
.text-button { padding: 12rpx 8rpx; background: transparent; color: #B95730; font-size: 24rpx; }
.value-text { display: block; margin-top: 18rpx; font-size: 26rpx; color: #526E59; line-height: 1.5; }
.cap-note { margin-top: 12rpx; }
.rules-card, .records-card { padding-top: 8rpx; padding-bottom: 8rpx; }
.disclosure-button { width: 100%; padding: 12rpx 0; background: transparent; color: #3C332B; justify-content: space-between; gap: 16rpx; text-align: left; }
.disclosure-label, .record-count { font-size: 24rpx; color: #786F65; font-weight: 400; flex-shrink: 0; }
.rules-content, .records-content, .records-error { padding: 12rpx 0 16rpx; border-top: 1rpx solid #E9E3D9; }
.rule-line { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12rpx; font-size: 26rpx; margin-bottom: 12rpx; }
.rules-content > .muted { margin-bottom: 10rpx; }
.benefits-section { padding-top: 4rpx; }
.section-note { margin: 0 0 20rpx; }
.item-top { display: flex; flex-wrap: wrap; align-items: center; gap: 12rpx; }
.item-title { flex: 1; min-width: 220rpx; font-size: 28rpx; font-weight: 700; line-height: 1.45; }
.tag, .ready-tag { font-size: 24rpx; padding: 6rpx 12rpx; border-radius: 20rpx; }
.tag { background: #F2E9E0; color: #B95730; }
.ready-tag { background: #EBF0E8; color: #526E59; }
.state-text { display: block; margin-top: 12rpx; color: #B95730; font-size: 24rpx; line-height: 1.5; }
.condition-text { margin-top: 10rpx; }
.item-footer { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16rpx; margin-top: 20rpx; }
.price { font-size: 28rpx; color: #B95730; font-weight: 700; }
.unavailable { background: #F1EEE8; }
.state-card { text-align: center; font-size: 26rpx; color: #786F65; padding: 40rpx 24rpx; }
.state-card button { display: inline-flex; margin-top: 20rpx; }
.records-card { margin-top: 24rpx; }
.records-heading { display: flex; flex-wrap: wrap; align-items: center; gap: 12rpx; }
.record-item { padding: 18rpx 0; border-bottom: 1rpx solid #E9E3D9; }
.record-top { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12rpx; font-size: 26rpx; }
.record-delta { font-weight: 700; color: #786F65; }
.record-delta.gain { color: #526E59; }
.record-delta.spent { color: #B95730; }
.record-meta { display: block; font-size: 24rpx; color: #786F65; line-height: 1.6; margin-top: 4rpx; }
</style>
