<template>
	<view class="claim-page">
		<view class="intro-row">
			<text class="intro-text">领一份实惠，下次来玩用得上</text>
			<view class="wallet-link" @tap="goCoupons">我的优惠券 ›</view>
		</view>
		<view class="section-heading">
			<text class="section-title">可领优惠券</text>
			<text class="section-count" v-if="!couponsLoading && !couponsError">{{ claimableCoupons.length }} 份可领</text>
		</view>

		<view class="state-box" v-if="couponsLoading">
			<text class="state-title">正在加载可领优惠券…</text>
		</view>
		<view class="state-box" v-else-if="couponsError">
			<text class="state-title">{{ couponsError }}</text>
			<button class="secondary-button" @tap="loadCoupons">重新加载</button>
		</view>
		<view class="coupon-list" v-else-if="claimableCoupons.length > 0">
			<view class="coupon-card" v-for="item in claimableCoupons" :key="item.campaign_id">
				<view class="value-panel">
					<view class="coupon-value">
						<text class="value-prefix" v-if="item.displayPrefix">{{ item.displayPrefix }}</text>
						<text class="value-number">{{ item.displayValue }}</text>
					</view>
					<text class="value-caption">{{ item.displayDescription }}</text>
				</view>
				<view class="coupon-body">
					<text class="coupon-name">{{ item.name }}</text>
					<text class="coupon-detail" v-if="item.description">{{ item.description }}</text>
					<text class="coupon-meta">{{ item.validityText }}</text>
					<view class="coupon-footer">
						<text class="coupon-limit">{{ item.receiveLimitText }}</text>
						<button class="claim-button" :disabled="item.buttonDisabled" @tap.stop="receiveCoupon(item)">{{ item.buttonText }}</button>
					</view>
				</view>
			</view>
		</view>
		<view class="state-box" v-else>
			<text class="state-title">暂无新的可领优惠券</text>
			<text class="state-detail" v-if="couponList.length > 0">已领取的券可以在「我的优惠券」查看</text>
			<text class="state-detail" v-else>优惠不定期上新，也可以先看看店内好物</text>
			<button class="secondary-button" @tap="loadCoupons">刷新看看</button>
		</view>

		<button class="mall-link" @tap="goMall">去商城逛逛 ›</button>
	</view>
</template>

<script>
import { mapState, mapActions } from 'vuex';
import AUTH from '../../utils/auth.js';
import COUPON from '../../utils/coupon.js';

export default {
	data() {
		return {
			couponList: [],
			couponsLoading: true,
			couponsError: '',
			receivingCouponId: '',
			loginPending: false,
		};
	},
	computed: {
		...mapState(['hasLogin', 'token']),
		claimableCoupons() {
			return this.couponList.filter(item => this.isCouponClaimable(item)).map(item => {
				const display = COUPON.normalizeCoupon(item);
				return Object.assign({}, item, {
					displayPrefix: display.displayPrefix,
					displayValue: display.displayValue,
					displayDescription: item.coupon_type === 'gift' ? '领取后积分到账' : display.limitText,
					validityText: item.coupon_type === 'gift' ? '领取后奖励直接到账' : (Number(item.validity_days) > 0
						? '领取后 ' + item.validity_days + ' 天有效'
						: (item.end_time ? '有效期至 ' + String(item.end_time).substring(0, 10) : '长期有效')),
					receiveLimitText: this.getReceiveLimitText(item),
					buttonDisabled: !!this.receivingCouponId || this.loginPending,
					buttonText: this.receivingCouponId === item.campaign_id ? '领取中' : '领取',
				});
			});
		},
	},
	onLoad() {
		uni.setNavigationBarTitle({ title: '领券中心' });
	},
	onShow() {
		return this.loadCoupons();
	},
	onUnload() {
		this._unloaded = true;
		this._couponRequest = (this._couponRequest || 0) + 1;
		this._couponLoad = null;
		this.couponsLoading = false;
		this.receivingCouponId = '';
	},
	methods: {
		...mapActions(['loginAndRegister', 'getUserInfo']),
		loadCoupons() {
			if (this._unloaded) return Promise.resolve(false);
			const token = this.token;
			// Coalesce onShow/retry taps, but supersede an anonymous or previous-account load.
			if (this._couponLoad && this._couponLoad.token === token) return this._couponLoad.promise;
			const request = (this._couponRequest || 0) + 1;
			this._couponRequest = request;
			this.couponsLoading = true;
			this.couponsError = '';
			const current = () => !this._unloaded && request === this._couponRequest && token === this.token;
			const promise = (async () => {
				try {
					const res = await Promise.resolve().then(() => AUTH.getCouponList(token));
					if (!current()) return false;
					if (!res || res._status !== 0 || !Array.isArray(res.data)) throw new Error('invalid response');
					this.couponList = res.data;
					return true;
				} catch (e) {
					if (current()) this.couponsError = '优惠券加载失败，请重试';
					return false;
				} finally {
					if (!this._unloaded && request === this._couponRequest) {
						this.couponsLoading = false;
						this._couponLoad = null;
					}
				}
			})();
			this._couponLoad = { token, promise };
			return promise;
		},
		isCouponClaimable(item) {
			if (!item || !item.campaign_id || item.can_receive === false || item.user_received) return false;
			if (item.remaining_user_count != null && Number(item.remaining_user_count) <= 0) return false;
			return item.remaining_count == null || Number(item.remaining_count) !== 0;
		},
		getReceiveLimitText(item) {
			const parts = [];
			if (Number(item.per_user_limit) > 0) parts.push('每人限领 ' + item.per_user_limit + ' 份');
			if (Number(item.remaining_user_count) > 0) parts.push('还可领 ' + item.remaining_user_count + ' 份');
			return parts.join(' · ') || '领取资格以活动规则为准';
		},
		promptLogin(content) {
			if (this._unloaded) return Promise.resolve(false);
			if (this.hasLogin && this.token) return Promise.resolve(true);
			if (this._loginPromise) return this._loginPromise;
			this.loginPending = true;
			this._loginPromise = new Promise(resolve => {
				uni.showModal({
					title: '提示', content, confirmText: '去登录',
					success: async res => {
						if (!res.confirm || this._unloaded) return resolve(false);
						try {
							await this.loginAndRegister();
							resolve(!this._unloaded && !!this.hasLogin && !!this.token);
						} catch (e) {
							// The store already displays login errors. Do not create an unhandled rejection.
							resolve(false);
						}
					},
					fail: () => resolve(false),
				});
			}).finally(() => {
				this._loginPromise = null;
				if (!this._unloaded) this.loginPending = false;
			});
			return this._loginPromise;
		},
		async goCoupons() {
			if (this._unloaded || this.loginPending) return;
			if (!this.hasLogin || !this.token) {
				if (!await this.promptLogin('请先登录查看我的优惠券')) return;
			}
			if (!this._unloaded) uni.navigateTo({ url: '/pages/my/coupons/coupons' });
		},
		goMall() {
			if (!this._unloaded) uni.switchTab({ url: '/pages/voucher/voucher' });
		},
		async receiveCoupon(item) {
			if (this._unloaded || this.receivingCouponId || this.loginPending) return;
			let campaign = this.couponList.find(coupon => coupon.campaign_id === (item && item.campaign_id));
			if (!this.isCouponClaimable(campaign)) return;
			// Lock before the login modal as well as during POST and refresh.
			this.receivingCouponId = campaign.campaign_id;
			let requestToken;
			try {
				if (!this.hasLogin || !this.token) {
					if (!await this.promptLogin('请先登录再领取优惠券')) return;
					// Anonymous availability is not sufficient to claim for the newly logged-in account.
					if (!await this.loadCoupons()) return;
				}
				if (this._unloaded) return;
				campaign = this.couponList.find(coupon => coupon.campaign_id === item.campaign_id);
				if (!this.isCouponClaimable(campaign)) return;
				requestToken = this.token;
				this.trackCouponEvent('coupon_receive_click', campaign);
				const res = await AUTH.receiveCoupon(requestToken, campaign.campaign_id);
				if (this._unloaded || requestToken !== this.token) return;
				if (!res || res._status !== 0) {
					const reason = res && res._reason || '领取失败，请重试';
					this.trackCouponEvent('coupon_receive_failed', campaign, { reason });
					uni.showToast({ title: reason, icon: 'none' });
					return;
				}
				this.trackCouponEvent('coupon_receive_success', campaign);
				// Invalidate pre-receipt loads and update limits locally even if the refresh fails.
				this._couponRequest = (this._couponRequest || 0) + 1;
				this._couponLoad = null;
				this.applyReceipt(campaign);
				const reward = res.data || {};
				const refreshes = [this.loadCoupons()];
				if ((reward.coupon_type || campaign.coupon_type) === 'gift') {
					refreshes.push(this.getUserInfo(true).catch(() => {}));
				}
				await Promise.all(refreshes);
				if (!this._unloaded && requestToken === this.token) this.showCouponSuccessActions(campaign, reward);
			} catch (e) {
				if (!this._unloaded && (!requestToken || requestToken === this.token)) {
					this.trackCouponEvent('coupon_receive_failed', campaign, { reason: 'request_failed' });
					uni.showToast({ title: '领取失败，请重试', icon: 'none' });
				}
			} finally {
				if (!this._unloaded) this.receivingCouponId = '';
			}
		},
		applyReceipt(item) {
			this.couponList = this.couponList.map(coupon => {
				if (coupon.campaign_id !== item.campaign_id) return coupon;
				const remainingUser = coupon.remaining_user_count == null ? 0 : Math.max(0, Number(coupon.remaining_user_count) - 1);
				const remaining = coupon.remaining_count == null ? null : (Number(coupon.remaining_count) < 0
					? Number(coupon.remaining_count) : Math.max(0, Number(coupon.remaining_count) - 1));
				return Object.assign({}, coupon, {
					remaining_user_count: remainingUser,
					remaining_count: remaining,
					user_received: remainingUser === 0,
					can_receive: remainingUser > 0 && remaining !== 0,
				});
			});
		},
		trackCouponEvent(event, item, extra) {
			AUTH.trackEvent(Object.assign({
				event, page_path: 'pages/voucher/claim', source: 'coupon_claim',
				campaign_id: item && item.campaign_id,
				coupon_id: item && item.object_id,
				coupon_type: item && item.coupon_type,
			}, extra || {}), this.token).catch(() => {});
		},
		showCouponSuccessActions(item, data) {
			if (this._unloaded) return;
			const name = data.coupon_name || item.name || '优惠券';
			if ((data.coupon_type || item.coupon_type) === 'gift') {
				uni.showModal({ title: '领取成功', content: name + ' 已领取，积分奖励已到账。', confirmText: '知道了', showCancel: false });
				return;
			}
			const token = this.token;
			uni.showModal({
				title: '领取成功', content: name + ' 已放入你的券包，下单时会自动展示可用券。',
				confirmText: '去使用', cancelText: '继续领',
				success: res => {
					if (res.confirm && !this._unloaded && token === this.token) this.openCouponUseSheet(item, 'receive_success');
				},
			});
		},
		openCouponUseSheet(item, source) {
			if (this._unloaded) return;
			const token = this.token;
			this.trackCouponEvent('coupon_use_entry_click', item, { entry_source: source || 'coupon' });
			uni.showActionSheet({
				itemList: ['预约包厢', '买大厅票', '查看我的券'],
				success: res => {
					if (this._unloaded || token !== this.token) return;
					if (res.tapIndex === 0) uni.switchTab({ url: '/pages/tabBar/appoint/appoint' });
					else if (res.tapIndex === 1) uni.navigateTo({ url: '/pages/ticket/buy' });
					else if (res.tapIndex === 2) uni.navigateTo({ url: '/pages/my/coupons/coupons?tab=unused' });
				},
			});
		},
	},
};
</script>

<style lang="scss" scoped>
.claim-page { min-height: 100vh; box-sizing: border-box; padding: 24rpx 24rpx 48rpx; padding-bottom: calc(48rpx + env(safe-area-inset-bottom)); background: #F7F5F1; color: #332D28; }
.intro-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12rpx; }
.intro-text { font-size: 23rpx; line-height: 1.6; color: #746A62; }
.wallet-link { padding: 14rpx 0; color: #9A4A26; font-size: 25rpx; font-weight: 600; }
.section-heading { display: flex; align-items: baseline; justify-content: space-between; margin: 26rpx 0 18rpx; }
.section-title { font-size: 29rpx; font-weight: 700; }
.section-count { font-size: 22rpx; color: #85776B; }
.coupon-list { display: flex; flex-direction: column; gap: 16rpx; }
.coupon-card { display: flex; border: 1rpx solid #E7DFD5; border-radius: 18rpx; overflow: hidden; background: #FFFCF7; }
.value-panel { width: 188rpx; flex-shrink: 0; box-sizing: border-box; padding: 24rpx 12rpx; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #F3E7D9; border-right: 1rpx dashed #DBC8B4; }
.coupon-value { display: flex; align-items: baseline; justify-content: center; flex-wrap: wrap; color: #A6512D; }
.value-prefix { font-size: 24rpx; margin-right: 3rpx; }
.value-number { font-size: 38rpx; font-weight: 800; overflow-wrap: anywhere; text-align: center; }
.value-caption { margin-top: 8rpx; font-size: 21rpx; line-height: 1.5; color: #82634A; text-align: center; }
.coupon-body { flex: 1; min-width: 0; padding: 20rpx; }
.coupon-name { display: block; font-size: 28rpx; font-weight: 700; line-height: 1.4; overflow-wrap: anywhere; }
.coupon-detail { display: block; margin-top: 6rpx; font-size: 22rpx; line-height: 1.5; color: #746A62; }
.coupon-meta { display: block; margin-top: 10rpx; font-size: 22rpx; line-height: 1.5; color: #746A62; }
.coupon-footer { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12rpx; margin-top: 14rpx; }
.coupon-limit { flex: 1; min-width: 100rpx; font-size: 21rpx; line-height: 1.5; color: #85776B; }
.claim-button { flex-shrink: 0; margin: 0 0 0 auto; padding: 0 22rpx; min-width: 120rpx; height: 68rpx; line-height: 68rpx; border-radius: 12rpx; background: #B95730; color: #FFF; font-size: 24rpx; font-weight: 600; }
.claim-button[disabled] { background: #E4DDD5; color: #84796E; }
button::after { border: none; }
.state-box { padding: 64rpx 28rpx; border: 1rpx solid #E7DFD5; border-radius: 18rpx; background: #FFFCF7; text-align: center; }
.state-title { display: block; font-size: 27rpx; line-height: 1.6; color: #62554A; }
.state-detail { display: block; margin-top: 12rpx; font-size: 23rpx; line-height: 1.6; color: #85776B; }
.secondary-button { display: inline-block; margin: 24rpx 0 0; padding: 0 28rpx; height: 76rpx; line-height: 76rpx; border-radius: 12rpx; background: #F3E7D9; color: #9A4A26; font-size: 25rpx; }
.mall-link { margin: 30rpx auto 0; padding: 0 26rpx; width: auto; background: transparent; color: #9A4A26; font-size: 25rpx; line-height: 88rpx; }
@media screen and (max-width: 360px) { .value-panel { width: 160rpx; } .value-number { font-size: 34rpx; } .coupon-body { padding: 18rpx; } }
</style>
