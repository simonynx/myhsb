<template>
	<view class="supply-page">
		<view class="heading">
			<view class="heading-top"><text class="page-title">到店补给</text><button class="text-button" @tap="goOrders">我的订单 ›</button></view>
			<text class="pickup-note">额外付费 · 店内领取</text>
			<text class="muted">门票已含零食茶水，无需另购。</text>
		</view>
		<view class="account-note" v-if="signedIn && accountLoading"><text>账户更新中，购买资格待确认…</text></view>
		<view class="account-note" v-else-if="signedIn && accountError">
			<text>{{ accountError }}</text><button class="text-button" @tap="refreshPage">刷新账户</button>
		</view>
		<view class="guest-note" v-else-if="!signedIn"><text>先浏览，登录后确认购买资格</text><button class="text-button" @tap="goSignIn">去登录</button></view>

		<view class="state-card" v-if="goodsLoading"><text>正在加载到店补给…</text></view>
		<view class="state-card" v-else-if="goodsError">
			<text>{{ goodsError }}</text><button class="secondary-button" @tap="refreshPage">重新加载</button>
		</view>
		<view v-else-if="cashGoods.length">
			<view class="category-pills" v-if="categories.length > 1">
				<button :class="category.itemClass" v-for="category in categories" :key="category.value" @tap="selectCategory(category.value)">{{ category.name }} {{ category.count }}</button>
			</view>
			<view :class="item.itemClass" v-for="item in filteredGoods" :key="item.object_id" @tap="openGoods(item, 'card')">
				<view :class="item.markClass" :aria-label="item.categoryText"><text>{{ item.markText }}</text></view>
				<view class="item-content">
					<text class="item-title">{{ item.name }}</text>
					<text class="price">{{ item.priceText }}</text>
					<text class="stock-text" v-if="!item.soldOut">{{ item.stockText }}</text>
					<text class="state-text" v-if="item.blockedText">{{ item.blockedText }}</text>
					<text class="condition-text" v-if="item.conditionText">{{ item.conditionText }}</text>
				</view>
				<button :class="item.buttonClass" @tap.stop="openGoods(item, 'button')">{{ item.purchaseActionText }}</button>
			</view>
			<view class="state-card" v-if="!filteredGoods.length"><text>当前分类暂无商品</text><button class="secondary-button" @tap="selectCategory('all')">查看全部</button></view>
		</view>
		<view class="state-card" v-else><text>暂无额外付费商品</text></view>
	</view>
</template>

<script>
import { mapState, mapActions } from 'vuex';
import AUTH from '../../utils/auth.js';
import LOYALTY from '../../utils/loyaltyPresentation.js';

export default {
	data() {
		return { goodsList: [], goodsLoading: true, goodsError: '', selectedCategory: 'all', accountLoading: false, accountError: '', accountToken: '', accountInfo: null };
	},
	computed: {
		...mapState(['hasLogin', 'token', 'userInfo']),
		signedIn() { return !!this.hasLogin && !!this.token; },
		identity() { return this.signedIn ? this.token : ''; },
		eligibilityKnown() { return this.signedIn && this.accountToken === this.token && !this.accountLoading && !this.accountError; },
		cashGoods() {
			return this.goodsList.filter(item => item && Number(item.exchange_type) === 1 && [2, 3, 4, 5].includes(Number(item.goods_type)) && !item.coupon_template_id && item.enabled !== false && item.enabled !== 0)
				.map(item => this.decorateCashGoods(item));
		},
		categories() {
			if (!this.cashGoods.length) return [];
			const types = Array.from(new Set(this.cashGoods.map(item => Number(item.goods_type))));
			return [{ value: 'all', name: '全部', count: this.cashGoods.length }].concat(types.map(type => ({
				value: String(type), name: this.categoryName(type), count: this.cashGoods.filter(item => Number(item.goods_type) === type).length,
			}))).map(category => Object.assign({}, category, { itemClass: 'category-pill' + (category.value === this.selectedCategory ? ' active' : '') }));
		},
		filteredGoods() {
			return this.selectedCategory === 'all' ? this.cashGoods : this.cashGoods.filter(item => String(item.goods_type) === this.selectedCategory);
		},
	},
	watch: {
		identity() { if (!this._unloaded) this.refreshPage(); },
	},
	onLoad() { uni.setNavigationBarTitle({ title: '到店补给' }); },
	onShow() { return this.refreshPage(); },
	onUnload() {
		this._unloaded = true;
		this._refreshRequest = (this._refreshRequest || 0) + 1;
		this._goodsRequest = (this._goodsRequest || 0) + 1;
		this._accountRequest = (this._accountRequest || 0) + 1;
	},
	methods: {
		...mapActions(['getUserInfo']),
		categoryName(type) { return { 2: '额外小食', 3: '主题用品', 4: '游戏周边', 5: '盲盒' }[Number(type)] || '其他商品'; },
		decorateCashGoods(goods) {
			const item = LOYALTY.decorateGoods(goods, this.eligibilityKnown ? this.accountInfo : null, this.eligibilityKnown);
			const period = { day: '每日', week: '每周', month: '每月' }[goods.max_buy_period] || '每人';
			let limitText = Number(goods.max_buy_per_user) > 0 ? period + '限购' + goods.max_buy_per_user + '件' : '';
			if (limitText && this.eligibilityKnown) limitText += '，本期已购' + (Number(goods.user_bought_count) || 0) + '件';
			let stateText = this.eligibilityKnown ? '现金购买，条件以商品详情为准' : this.signedIn ? '账户待更新，购买资格以详情为准' : '登录后确认购买资格';
			if (item.soldOut) stateText = '暂时售罄';
			else if (this.eligibilityKnown && item.limitReached) stateText = '已达到本期限购上限';
			else if (this.eligibilityKnown && item.locked) stateText = '当前会员等级未满足购买条件';
			const stock = goods.stock == null ? null : Number(goods.stock);
			const levelText = Number(goods.member_level_required) > 0 ? '需会员等级' + goods.member_level_required + '及以上' : '';
			const blocked = item.soldOut || this.eligibilityKnown && (item.limitReached || item.locked);
			const blockedText = item.soldOut ? '暂时售罄' : this.eligibilityKnown && item.limitReached ? '已达本期限购上限' : this.eligibilityKnown && item.locked ? '会员等级未满足' : '';
			return Object.assign({}, item, {
				categoryText: this.categoryName(goods.goods_type), limitText, levelText,
				conditionText: [levelText, limitText].filter(Boolean).join(' · '), blockedText,
				markText: { 2: '食', 3: '用', 4: '玩', 5: '盒' }[Number(goods.goods_type)], markClass: 'product-mark mark-' + Number(goods.goods_type),
				stockText: stock === 0 ? '已售罄' : stock > 0 ? '库存' + stock + '件' : '库存以详情为准',
				purchaseStateText: stateText, purchaseActionText: item.soldOut ? '查看商品' : blocked ? '查看条件' : '查看详情',
				buttonClass: blocked || !this.eligibilityKnown ? 'secondary-button' : 'primary-button',
				itemClass: 'supply-item' + (blocked ? ' unavailable' : ''),
			});
		},
		async refreshPage() {
			if (this._unloaded) return;
			const request = this._refreshRequest = (this._refreshRequest || 0) + 1;
			const identity = this.identity;
			const result = await Promise.all([this.refreshAccount(), this.loadGoods()]);
			if (!this._unloaded && request === this._refreshRequest && identity === this.identity && result[1]) this.track('supply_view');
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
					this.accountInfo = res && res.data || this.userInfo;
					this.accountToken = identity;
				}
			} catch (e) {
				if (!this._unloaded && request === this._accountRequest && identity === this.identity) this.accountError = '账户更新失败，购买资格待确认。';
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
				const res = await AUTH.getGoodsList(identity || undefined, 1);
				if (this._unloaded || request !== this._goodsRequest || identity !== this.identity) return false;
				if (!res || res._status !== 0 || !res.data || !Array.isArray(res.data.goods)) throw new Error('invalid goods');
				this.goodsList = res.data.goods;
				if (!this.categories.some(category => category.value === this.selectedCategory)) this.selectedCategory = 'all';
				return true;
			} catch (e) {
				if (!this._unloaded && request === this._goodsRequest && identity === this.identity) this.goodsError = '补给加载失败，请重试';
				return false;
			} finally {
				if (!this._unloaded && request === this._goodsRequest) this.goodsLoading = false;
			}
		},
		track(event, extra) {
			const data = Object.assign({ event, page_path: 'pages/voucher/supply', source: 'store_supply', available_count: this.cashGoods.filter(item => !item.soldOut).length,
				eligible_count: this.eligibilityKnown ? this.cashGoods.filter(item => !item.soldOut && !item.locked && !item.limitReached).length : 0,
				current_points: this.signedIn ? LOYALTY.pointsView(this.accountToken === this.identity && this.accountInfo ? this.accountInfo : this.userInfo, true).points : null, eligibility_known: this.eligibilityKnown }, extra || {});
			try { Promise.resolve(AUTH.trackEvent(data, this.identity || undefined)).catch(() => {}); } catch (e) { /* Analytics must not block navigation. */ }
		},
		selectCategory(value) {
			if (!this.categories.some(category => category.value === value)) return;
			this.selectedCategory = value;
			this.track('supply_category_click', { category: value });
		},
		openGoods(item, placement) {
			if (this._unloaded || this.goodsLoading || this.goodsError) return;
			const goods = this.goodsList.find(value => value && value.object_id === (item && item.object_id));
			if (!goods || !this.cashGoods.some(value => value.object_id === goods.object_id)) return;
			this.track('supply_goods_click', { goods_id: goods.object_id, placement });
			uni.navigateTo({ url: '/pages/voucher/detail?data=' + encodeURIComponent(JSON.stringify(goods)) });
		},
		goOrders() { this.track('supply_orders_click'); uni.navigateTo({ url: '/pages/order/order' }); },
		goSignIn() { this.track('supply_signin_click'); uni.switchTab({ url: '/pages/user/user' }); },
	},
};
</script>

<style scoped>
.supply-page { min-height: 100vh; box-sizing: border-box; padding: 24rpx 24rpx 64rpx; background: #F7F5F1; color: #3C332B; }
.heading { padding: 0 0 24rpx; }
.heading-top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12rpx; }
.page-title { display: block; font-size: 38rpx; font-weight: 700; }
.muted, .stock-text, .condition-text { display: block; font-size: 24rpx; color: #786F65; line-height: 1.6; }
.pickup-note { display: block; margin: 4rpx 0 10rpx; font-size: 26rpx; color: #B95730; line-height: 1.5; }
button { display: flex; align-items: center; justify-content: center; box-sizing: border-box; min-height: 76rpx; min-width: 76rpx; margin: 0; line-height: 1.4; font-size: 26rpx; border-radius: 20rpx; }
button::after { border: none; }
.text-button { padding: 12rpx 8rpx; background: transparent; color: #B95730; font-size: 24rpx; }
.account-note, .guest-note { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12rpx; margin-bottom: 20rpx; padding: 12rpx 24rpx; background: #F2E9E0; border-radius: 20rpx; font-size: 24rpx; color: #786F65; line-height: 1.6; }
.category-pills { display: flex; flex-wrap: wrap; gap: 12rpx; margin-bottom: 24rpx; }
.category-pill { padding: 14rpx 20rpx; background: #FFFCF7; color: #786F65; border: 1rpx solid #E9E3D9; font-size: 24rpx; }
.category-pill.active { color: #B95730; background: #F2E9E0; border-color: #D5B7A5; }
.supply-item, .state-card { padding: 24rpx; margin-bottom: 20rpx; background: #FFFCF7; border: 1rpx solid #E9E3D9; border-radius: 24rpx; }
.supply-item { display: flex; align-items: flex-start; gap: 16rpx; }
.product-mark { display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 76rpx; height: 76rpx; border-radius: 20rpx; font-size: 30rpx; font-weight: 700; background: #F2E9E0; color: #8B684F; }
.mark-2 { background: #F3E8D8; }
.mark-3 { background: #ECE7E0; }
.mark-4 { background: #E9ECE5; color: #64705C; }
.mark-5 { background: #F1E4DE; color: #B95730; }
.item-content { flex: 1; min-width: 0; }
.item-title { display: block; font-size: 28rpx; font-weight: 700; line-height: 1.45; overflow-wrap: anywhere; }
.price { display: block; margin: 8rpx 0; font-size: 30rpx; color: #B95730; font-weight: 700; }
.state-text { display: block; margin-top: 8rpx; color: #B95730; font-size: 24rpx; line-height: 1.5; }
.condition-text { margin-top: 8rpx; }
.supply-item > button { flex-shrink: 0; margin-top: 4rpx; font-size: 24rpx; }
.primary-button, .secondary-button { padding: 14rpx 20rpx; }
.primary-button { background: #B95730; color: #FFFCF7; }
.secondary-button { background: #F2E9E0; color: #B95730; }
.unavailable { background: #F1EEE8; }
.state-card { text-align: center; font-size: 26rpx; color: #786F65; padding: 40rpx 24rpx; }
.state-card button { display: inline-flex; margin-top: 20rpx; }
</style>
