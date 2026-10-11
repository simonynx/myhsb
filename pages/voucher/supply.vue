<template>
	<view class="supply-page">
		<view class="heading">
			<text class="eyebrow">需要时，再添一点</text>
			<text class="page-title">到店补给</text>
			<text class="muted">门票已含零食茶水，以下为额外付费商品。</text>
			<text class="pickup-note">门店领取，不配送；领取方式请查看商品详情。</text>
		</view>
		<view class="intro-links">
			<button class="text-button" @tap="goOrders">我的订单 ›</button>
			<button class="text-button" v-if="!signedIn" @tap="goSignIn">去登录</button>
		</view>
		<view class="account-note" v-if="signedIn && accountLoading"><text>正在更新账户，购买资格待确认…</text></view>
		<view class="account-note" v-else-if="signedIn && accountError">
			<text>{{ accountError }}</text><button class="text-button" @tap="refreshPage">刷新账户</button>
		</view>
		<view class="guest-note" v-else-if="!signedIn"><text>可以先浏览；购买时在商品详情登录并确认条件。</text></view>

		<view class="state-card" v-if="goodsLoading"><text>正在加载到店补给…</text></view>
		<view class="state-card" v-else-if="goodsError">
			<text>{{ goodsError }}</text><button class="secondary-button" @tap="refreshPage">重新加载</button>
		</view>
		<view v-else-if="cashGoods.length">
			<view class="category-pills" v-if="categories.length > 1">
				<button :class="category.itemClass" v-for="category in categories" :key="category.value" @tap="selectCategory(category.value)">{{ category.name }} {{ category.count }}</button>
			</view>
			<view :class="item.itemClass" v-for="item in filteredGoods" :key="item.object_id" @tap="openGoods(item, 'card')">
				<view class="item-top"><text class="item-title">{{ item.name }}</text><text class="tag">{{ item.categoryText }}</text></view>
				<text class="muted" v-if="item.description">{{ item.description }}</text>
				<text class="state-text">{{ item.purchaseStateText }}</text>
				<text class="muted">{{ item.stockText }}</text>
				<text class="muted" v-if="item.levelText">{{ item.levelText }}</text>
				<text class="muted" v-if="item.limitText">{{ item.limitText }}</text>
				<text class="muted">{{ item.deliveryText }}</text>
				<view class="item-footer"><text class="price">{{ item.priceText }}</text><button class="primary-button" @tap.stop="openGoods(item, 'button')">{{ item.purchaseActionText }}</button></view>
			</view>
			<view class="state-card" v-if="!filteredGoods.length"><text>当前分类暂无商品</text><button class="secondary-button" @tap="selectCategory('all')">查看全部</button></view>
		</view>
		<view class="state-card" v-else><text>暂无额外付费商品</text><text class="muted">门票已含的零食茶水不在这里重复售卖。</text></view>
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
			return Object.assign({}, item, {
				categoryText: this.categoryName(goods.goods_type), limitText,
				levelText: Number(goods.member_level_required) > 0 ? '需会员等级' + goods.member_level_required + '及以上' : '',
				stockText: stock === 0 ? '库存：已售罄' : stock > 0 ? '当前库存' + stock + '件，以详情为准' : '库存以商品详情为准',
				purchaseStateText: stateText, purchaseActionText: item.soldOut ? '查看商品' : this.eligibilityKnown && (item.locked || item.limitReached) ? '查看条件' : '查看详情',
				itemClass: 'supply-item' + (item.soldOut || this.eligibilityKnown && (item.limitReached || item.locked) ? ' unavailable' : ''),
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
				if (!this._unloaded && request === this._accountRequest && identity === this.identity) this.accountError = '账户更新失败，购买资格待确认；可继续浏览。';
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
.supply-page { min-height: 100vh; box-sizing: border-box; padding: 30rpx 26rpx 64rpx; background: #FAF7F0; color: #42362D; }
.heading { padding: 6rpx 4rpx 16rpx; }
.eyebrow { display: block; color: #A56343; font-size: 22rpx; letter-spacing: 2rpx; }
.page-title { display: block; font-size: 42rpx; font-weight: 700; margin: 10rpx 0 14rpx; }
.muted { display: block; font-size: 24rpx; color: #7A6C5F; line-height: 1.65; }
.pickup-note { display: block; margin-top: 12rpx; font-size: 24rpx; color: #9B4D30; line-height: 1.6; }
.intro-links { display: flex; flex-wrap: wrap; gap: 28rpx; margin: 0 4rpx 20rpx; }
button { margin: 0; line-height: 1.5; font-size: 24rpx; border-radius: 14rpx; }
button::after { border: none; }
.text-button { padding: 8rpx 0; background: transparent; color: #9B4D30; text-align: left; }
.account-note, .guest-note { padding: 18rpx 22rpx; background: #F2E8DC; border-radius: 16rpx; margin-bottom: 20rpx; font-size: 24rpx; color: #7A6C5F; line-height: 1.6; }
.category-pills { display: flex; flex-wrap: wrap; gap: 12rpx; margin-bottom: 24rpx; }
.category-pill { padding: 12rpx 20rpx; background: #FFFCF7; color: #7A6C5F; border: 1rpx solid #E7DCCD; }
.category-pill.active { color: #9B4D30; background: #F3E1D0; border-color: #C89371; }
.supply-item, .state-card { padding: 26rpx; margin-bottom: 20rpx; background: #FFFCF7; border: 1rpx solid #E7DCCD; border-radius: 24rpx; }
.item-top { display: flex; flex-wrap: wrap; align-items: baseline; gap: 12rpx; margin-bottom: 10rpx; }
.item-title { flex: 1; min-width: 180rpx; font-size: 29rpx; font-weight: 700; }
.tag { font-size: 21rpx; background: #F3E8DC; color: #876049; padding: 6rpx 12rpx; border-radius: 8rpx; }
.state-text { display: block; margin-top: 8rpx; color: #9B4D30; font-size: 24rpx; line-height: 1.6; }
.item-footer { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 18rpx; margin-top: 20rpx; }
.price { font-size: 34rpx; color: #A54E2D; font-weight: 700; }
.primary-button, .secondary-button { padding: 16rpx 24rpx; }
.primary-button { background: #B65E3D; color: #FFF; }
.secondary-button { background: #F3E8DC; color: #9B4D30; }
.unavailable { background: #F3F0EA; }
.state-card { text-align: center; font-size: 26rpx; color: #7A6C5F; padding: 40rpx 26rpx; }
.state-card button { display: inline-block; margin-top: 20rpx; }
</style>
