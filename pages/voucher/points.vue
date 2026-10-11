<template>
	<view class="points-page">
		<view class="heading">
			<text class="eyebrow">消费之外，多一份小福利</text>
			<text class="page-title">积分福利</text>
			<text class="muted">积分可兑换到店福利，也可在符合规则的订单中抵扣。</text>
		</view>

		<view class="balance-card">
			<view v-if="signedIn">
				<text class="muted">我的积分</text>
				<text class="balance">{{ balanceView.points }}<text class="unit">积分</text></text>
				<text class="muted" v-if="accountLoading">正在更新账户，兑换资格待确认…</text>
				<view v-else-if="accountError">
					<text class="muted">{{ accountError }}</text>
					<button class="text-button" @tap="refreshPage">刷新账户</button>
				</view>
				<text class="muted" v-else>兑换资格和抵扣额度以详情、结算页确认为准。</text>
			</view>
			<view v-else>
				<text class="card-title">登录后查看你的积分</text>
				<text class="muted">先看看福利与使用方式；登录后再确认余额和兑换资格。</text>
				<button class="primary-button" @tap="goSignIn">去登录 / 签到</button>
			</view>
			<view class="balance-links">
				<button class="text-button" v-if="signedIn" @tap="goSignIn">去签到</button>
				<button class="text-button" @tap="goCoupons">我的优惠券 ›</button>
			</view>
		</view>

		<view class="consume-card">
			<text class="card-title">下次消费时抵扣</text>
			<text class="value-text" v-if="eligibilityKnown && balanceView.valueText">{{ balanceView.valueText }}</text>
			<text class="muted">{{ balanceView.usageText }}</text>
			<text class="muted">请在结算页选择积分；不自动应用，是否可与优惠券同用以订单规则为准。</text>
			<view class="consume-actions">
				<button class="secondary-button" @tap="goTicket">买大厅票</button>
				<button class="secondary-button" @tap="goAppointment">去预约</button>
			</view>
		</view>

		<view class="section-heading">
			<text class="card-title">兑换到店福利</text>
			<text class="muted">实物门店领取、不配送；消费券到账后到「我的优惠券」查看。</text>
		</view>
		<view class="state-card" v-if="goodsLoading"><text>正在加载积分福利…</text></view>
		<view class="state-card" v-else-if="goodsError">
			<text>{{ goodsError }}</text>
			<button class="secondary-button" @tap="refreshPage">重新加载</button>
		</view>
		<view v-else-if="benefitList.length">
			<view class="ready-card" v-if="highlightBenefits.length">
				<text class="card-title">当前积分可兑换</text>
				<view class="ready-item" v-for="item in highlightBenefits" :key="item.object_id" @tap="openGoods(item, 'highlight')">
					<text>{{ item.name }}</text><text class="value-text">{{ item.priceText }} ›</text>
				</view>
				<text class="muted">以下仍可查看全部福利与兑换条件。</text>
			</view>
			<text class="list-label" v-if="pureBenefits.length">纯积分福利</text>
			<view :class="item.itemClass" v-for="item in pureBenefits" :key="item.object_id" @tap="openGoods(item, 'list')">
				<view class="item-top"><text class="item-title">{{ item.name }}</text><text class="tag">{{ item.categoryText }}</text></view>
				<text class="muted" v-if="item.description">{{ item.description }}</text>
				<text class="state-text">{{ item.stateText }}</text>
				<text class="muted">{{ item.deliveryText }}</text>
				<text class="muted" v-if="item.limitText">{{ item.limitText }}</text>
				<view class="item-footer"><text class="price">{{ item.priceText }}</text><button class="primary-button" @tap.stop="openGoods(item, 'button')">{{ item.actionText }}</button></view>
			</view>
			<view class="mixed-heading" v-if="mixedBenefits.length">
				<text class="card-title">积分＋现金</text>
				<text class="muted">这些商品还需支付现金，不是纯积分兑换。</text>
			</view>
			<view :class="item.itemClass" v-for="item in mixedBenefits" :key="item.object_id" @tap="openGoods(item, 'list')">
				<view class="item-top"><text class="item-title">{{ item.name }}</text><text class="tag">积分＋现金</text></view>
				<text class="muted" v-if="item.description">{{ item.description }}</text>
				<text class="state-text">{{ item.stateText }}</text>
				<text class="muted">{{ item.deliveryText }}</text>
				<text class="muted" v-if="item.limitText">{{ item.limitText }}</text>
				<view class="item-footer"><text class="price">{{ item.priceText }}</text><button class="secondary-button" @tap.stop="openGoods(item, 'button')">{{ item.actionText }}</button></view>
			</view>
		</view>
		<view class="state-card" v-else><text>暂无积分兑换福利</text><text class="muted">仍可在消费结算时查看积分抵扣规则。</text></view>

		<view class="records-card" v-if="signedIn">
			<text class="card-title">最近积分记录</text>
			<text class="muted">以下为账户实际积分变动，非预估奖励。</text>
			<text class="muted" v-if="recordsLoading">正在加载积分记录…</text>
			<view v-else-if="recordsError"><text class="muted">{{ recordsError }}</text><button class="text-button" @tap="loadPointRecords">重新加载记录</button></view>
			<view v-else-if="visibleRecords.length">
				<view class="record-item" v-for="record in visibleRecords" :key="record.id">
					<view class="record-top"><text>{{ record.point_type_name || '积分变动' }}</text><text :class="record.deltaClass">{{ record.deltaText }}</text></view>
					<text class="muted" v-if="record.remark">{{ record.remark }}</text>
					<text class="record-meta" v-if="record.created_at">{{ record.created_at }}</text>
					<text class="record-meta" v-if="record.balanceText">{{ record.balanceText }}</text>
				</view>
				<button class="text-button" v-if="pointRecords.length > 5" @tap="toggleRecords">{{ recordsExpanded ? '收起记录' : '更多记录' }}</button>
			</view>
			<text class="muted" v-else>暂无积分变动记录</text>
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
			pointRecords: [], recordsLoading: false, recordsError: '', recordsExpanded: false, recordsToken: '' };
	},
	computed: {
		...mapState(['hasLogin', 'token', 'userInfo']),
		signedIn() { return !!this.hasLogin && !!this.token; },
		identity() { return this.signedIn ? this.token : ''; },
		eligibilityKnown() { return this.signedIn && this.accountToken === this.token && !this.accountLoading && !this.accountError; },
		balanceView() { return LOYALTY.pointsView(this.accountToken === this.identity && this.accountInfo ? this.accountInfo : this.userInfo, this.signedIn); },
		benefitList() {
			return LOYALTY.benefits(this.goodsList, this.eligibilityKnown ? this.accountInfo : null, this.eligibilityKnown).map(item => {
				const period = { day: '每日', week: '每周', month: '每月' }[item.max_buy_period] || '每人';
				const limitText = Number(item.max_buy_per_user) > 0 ? period + '限兑' + item.max_buy_per_user + '件' : '';
				if (this.signedIn && !this.eligibilityKnown && !item.soldOut) {
					return Object.assign({}, item, { limitText, stateText: '账户待更新，兑换资格以详情为准', actionText: '查看兑换条件' });
				}
				return Object.assign({}, item, { limitText });
			});
		},
		pureBenefits() { return this.benefitList.filter(item => Number(item.exchange_type) === 2); },
		mixedBenefits() { return this.benefitList.filter(item => Number(item.exchange_type) === 3); },
		highlightBenefits() { return this.pureBenefits.filter(item => item.canExchange).slice(0, 2); },
		visibleRecords() {
			if (!this.signedIn || this.recordsToken !== this.identity) return [];
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
				if (!this._unloaded && request === this._accountRequest && identity === this.identity) this.accountError = '账户更新失败，显示上次余额；请刷新后确认资格。';
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
		toggleRecords() { this.recordsExpanded = !this.recordsExpanded; },
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
.points-page { min-height: 100vh; box-sizing: border-box; padding: 30rpx 26rpx 64rpx; background: #FAF7F0; color: #42362D; }
.heading { padding: 6rpx 4rpx 26rpx; }
.eyebrow { display: block; color: #A56343; font-size: 22rpx; letter-spacing: 2rpx; }
.page-title { display: block; font-size: 42rpx; font-weight: 700; margin: 10rpx 0 14rpx; }
.muted { display: block; font-size: 24rpx; color: #7A6C5F; line-height: 1.65; }
.balance-card, .consume-card, .ready-card, .benefit-item, .state-card { padding: 26rpx; margin-bottom: 20rpx; background: #FFFCF7; border: 1rpx solid #E7DCCD; border-radius: 24rpx; }
.balance-card { background: #F4E5D6; border-color: #DEC1A8; }
.card-title { display: block; font-size: 30rpx; font-weight: 700; margin-bottom: 10rpx; }
.balance { display: block; font-size: 60rpx; font-weight: 700; margin: 8rpx 0; color: #A54E2D; }
.unit { font-size: 24rpx; font-weight: 400; margin-left: 12rpx; }
.balance-links, .consume-actions { display: flex; flex-wrap: wrap; gap: 16rpx; margin-top: 16rpx; }
button { margin: 0; line-height: 1.5; font-size: 24rpx; border-radius: 14rpx; }
button::after { border: none; }
.primary-button, .secondary-button { padding: 16rpx 24rpx; }
.primary-button { background: #B65E3D; color: #FFF; }
.secondary-button { background: #F3E8DC; color: #9B4D30; }
.text-button { padding: 8rpx 0; background: transparent; color: #9B4D30; text-align: left; }
.balance-card > view > .primary-button { margin-top: 16rpx; display: inline-block; }
.section-heading { padding: 12rpx 4rpx 20rpx; }
.value-text, .state-text { color: #9B4D30; font-size: 24rpx; line-height: 1.6; }
.value-text { display: block; }
.state-text { display: block; margin-top: 8rpx; }
.ready-card { border-color: #D5B49A; background: #F9EEDF; }
.ready-item { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12rpx; padding: 16rpx 0; font-size: 26rpx; border-bottom: 1rpx solid #E7DCCD; margin-bottom: 10rpx; }
.list-label { display: block; margin: 10rpx 4rpx 18rpx; font-size: 26rpx; font-weight: 700; }
.item-top { display: flex; flex-wrap: wrap; align-items: baseline; gap: 12rpx; margin-bottom: 10rpx; }
.item-title { flex: 1; min-width: 180rpx; font-size: 29rpx; font-weight: 700; }
.tag { font-size: 21rpx; background: #F3E8DC; color: #876049; padding: 6rpx 12rpx; border-radius: 8rpx; }
.item-footer { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 18rpx; margin-top: 20rpx; }
.price { font-size: 28rpx; color: #A54E2D; font-weight: 700; }
.unavailable { background: #F3F0EA; }
.mixed-heading { margin: 32rpx 4rpx 20rpx; }
.state-card { text-align: center; font-size: 26rpx; color: #7A6C5F; padding: 40rpx 26rpx; }
.state-card button { display: inline-block; margin-top: 20rpx; }
.records-card { padding: 26rpx; margin-top: 28rpx; background: #FFFCF7; border: 1rpx solid #E7DCCD; border-radius: 24rpx; }
.record-item { padding: 18rpx 0; border-bottom: 1rpx solid #EEE5D9; }
.record-top { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12rpx; font-size: 25rpx; }
.record-delta { font-weight: 700; color: #7A6C5F; }
.record-delta.gain { color: #52744F; }
.record-delta.spent { color: #A54E2D; }
.record-meta { display: block; font-size: 22rpx; color: #887B6D; line-height: 1.6; margin-top: 4rpx; }
</style>
