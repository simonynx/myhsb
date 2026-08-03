<template>
	<view class="page-wrapper">
		<view class="page-head">
			<view class="head-main">
				<view class="head-emblem">券</view>
				<view class="head-copy">
					<text class="head-title">我的优惠券</text>
					<text class="head-summary">{{ headerSummary }}</text>
				</view>
				<view class="head-action" @tap="goCouponMall">
					<text class="head-action-icon">＋</text>
					<text>领券</text>
				</view>
			</view>

			<view class="summary-strip" v-if="hasLogin">
				<view class="summary-item" @tap="switchTabByKey('unused')">
					<text class="summary-value">{{ unusedCouponCount }}</text>
					<text class="summary-label">可使用</text>
				</view>
				<view :class="expiringSoonCount > 0 ? 'summary-item warning' : 'summary-item'" @tap="switchTabByKey('unused')">
					<text class="summary-value">{{ expiringSoonCount }}</text>
					<text class="summary-label">7天内到期</text>
				</view>
				<view class="summary-item" @tap="switchTabByKey('available')">
					<text class="summary-value">{{ claimableCouponCount }}</text>
					<text class="summary-label">可以领取</text>
				</view>
			</view>
		</view>

		<view class="login-panel" v-if="!hasLogin">
			<view class="login-icon">券</view>
			<text class="login-title">登录后查看你的优惠券</text>
			<text class="login-sub">已领取、待使用和历史优惠都会收在这里</text>
			<view class="login-btn" @tap="handleLogin">立即登录</view>
		</view>

		<block v-else>
			<view class="tab-bar">
				<view
					class="tab-item"
					v-for="(tab, idx) in tabs"
					:key="tab.key"
					:class="tabIndex === idx ? 'active' : ''"
					@tap="switchTab(idx)"
				>
					<text class="tab-name">{{ tab.name }}</text>
					<text class="tab-count" v-if="tab.countText">{{ tab.countText }}</text>
				</view>
			</view>

			<scroll-view class="scroll-area" scroll-y v-if="activeTabKey === 'available'">
				<view class="list-heading">
					<text class="list-title">现在可领</text>
					<text class="list-note">领取后会放入未使用</text>
				</view>
				<view class="loading-box" v-if="availableLoading">
					<view class="loading-dot"></view>
					<text>正在整理可领优惠</text>
				</view>
				<view class="coupon-list" v-else-if="availableList.length > 0">
					<view
						:class="item.cardClass"
						v-for="item in availableList"
						:key="item.campaign_id"
					>
						<view :class="item.leftClassName">
							<view class="coupon-value">
								<text class="value-prefix" v-if="item.displayPrefix">{{ item.displayPrefix }}</text>
								<text class="value-number">{{ item.displayValue }}</text>
							</view>
							<text class="value-rule">{{ item.limitText }}</text>
						</view>
						<view class="ticket-separator">
							<view class="ticket-hole top"></view>
							<view class="ticket-line"></view>
							<view class="ticket-hole bottom"></view>
						</view>
						<view class="coupon-main">
							<text class="coupon-name">{{ item.name }}</text>
							<view class="coupon-meta">
								<text class="meta-tag">{{ item.scopeText }}</text>
								<text class="meta-tag neutral">{{ item.validText }}</text>
							</view>
							<text class="coupon-description" v-if="item.detailText">{{ item.detailText }}</text>
							<view class="coupon-footer">
								<text class="footer-note">{{ item.receiveLimitText }}</text>
								<button
									class="coupon-action primary"
									:disabled="!item.claimable || receivingCouponId === item.campaign_id"
									@tap.stop="receiveCoupon(item)"
								>
									{{ receivingCouponId === item.campaign_id ? '领取中' : item.receiveButtonText }}
								</button>
							</view>
						</view>
					</view>
				</view>
				<view class="empty-box" v-else>
					<view class="empty-icon">券</view>
					<text class="empty-title">暂时没有新券</text>
					<text class="empty-sub">已领取的优惠券都在未使用里</text>
					<view class="empty-action" @tap="switchTabByKey('unused')">查看未使用</view>
				</view>
				<view class="safe-space"></view>
			</scroll-view>

			<scroll-view class="scroll-area" scroll-y v-else>
				<view class="list-heading">
					<text class="list-title">{{ currentListTitle }}</text>
					<text class="list-note">{{ currentListNote }}</text>
				</view>
				<view class="loading-box" v-if="myCouponsLoading">
					<view class="loading-dot"></view>
					<text>正在整理你的券包</text>
				</view>
				<view class="coupon-list" v-else-if="myCoupons.length > 0">
					<view
						:class="item.cardClass"
						v-for="item in myCoupons"
						:key="item.object_id"
					>
						<view :class="item.leftClassName">
							<view class="coupon-value">
								<text class="value-prefix" v-if="item.displayPrefix">{{ item.displayPrefix }}</text>
								<text class="value-number">{{ item.displayValue }}</text>
							</view>
							<text class="value-rule">{{ item.limitText }}</text>
						</view>
						<view class="ticket-separator">
							<view class="ticket-hole top"></view>
							<view class="ticket-line"></view>
							<view class="ticket-hole bottom"></view>
						</view>
						<view class="coupon-main">
							<view class="coupon-title-row">
								<text class="coupon-name">{{ item.name }}</text>
								<text :class="item.statusTagClassName" v-if="item.statusTagText">{{ item.statusTagText }}</text>
							</view>
							<view class="coupon-meta">
								<text class="meta-tag">{{ item.scopeText }}</text>
								<text :class="item.urgencyClassName" v-if="item.urgencyText">{{ item.urgencyText }}</text>
							</view>
							<text class="coupon-description" v-if="item.detailText">{{ item.detailText }}</text>
							<view class="coupon-footer">
								<text :class="item.expireClassName">{{ item.expireText }}</text>
								<view class="coupon-action outline" v-if="item.status === 0" @tap="goUseCoupon(item)">去使用</view>
							</view>
						</view>
					</view>
				</view>
				<view class="empty-box" v-else>
					<view class="empty-icon">券</view>
					<text class="empty-title">{{ currentEmptyTitle }}</text>
					<text class="empty-sub">{{ currentEmptySub }}</text>
					<view class="empty-action" v-if="activeTabKey === 'unused'" @tap="switchTabByKey('available')">去领券</view>
				</view>
				<view class="safe-space"></view>
			</scroll-view>
		</block>
	</view>
</template>

<script>
	import { mapState, mapActions } from 'vuex';
	import AUTH from '../../../utils/auth.js';

	export default {
		computed: {
			...mapState(['hasLogin', 'token']),
			activeTabKey() {
				var tab = this.tabs[this.tabIndex];
				return tab ? tab.key : 'unused';
			},
			unusedCouponCount() {
				return this.countCouponsByStatus(0);
			},
			claimableCouponCount() {
				return this.availableList.length;
			},
			expiringSoonCount() {
				return this.allCoupons.filter(function(item) {
					return item.status === 0 && item.daysLeft !== null && item.daysLeft >= 0 && item.daysLeft <= 7;
				}).length;
			},
			headerSummary() {
				if (!this.hasLogin) return '把每次优惠都收好';
				if (this.expiringSoonCount > 0) return this.expiringSoonCount + '张券将在7天内到期，记得先用';
				if (this.unusedCouponCount > 0) return this.unusedCouponCount + '张券可用，下单时选择更省';
				if (this.claimableCouponCount > 0) return '有' + this.claimableCouponCount + '张新券可以领取';
				return '新优惠会及时出现在这里';
			},
			currentListTitle() {
				if (this.activeTabKey === 'used') return '使用记录';
				if (this.activeTabKey === 'expired') return '过期记录';
				return '可以使用';
			},
			currentListNote() {
				if (this.activeTabKey === 'used') return '核对过去使用的优惠';
				if (this.activeTabKey === 'expired') return '仅保留历史记录';
				return this.expiringSoonCount > 0 ? '即将到期的券已排在前面' : '结算时会展示当前可用券';
			},
			currentEmptyTitle() {
				if (this.activeTabKey === 'used') return '还没有使用记录';
				if (this.activeTabKey === 'expired') return '暂时没有过期券';
				return '暂无未使用优惠券';
			},
			currentEmptySub() {
				if (this.activeTabKey === 'used') return '用券完成订单后会记录在这里';
				if (this.activeTabKey === 'expired') return '保持得很好，没有错过优惠';
				return '看看现在有没有可以领取的新券';
			},
		},
		data() {
			return {
				tabIndex: 0,
				tabs: [
					{ name: '未使用', key: 'unused', count: 0, countText: '' },
					{ name: '可领取', key: 'available', count: 0, countText: '' },
					{ name: '已使用', key: 'used', count: 0, countText: '' },
					{ name: '已过期', key: 'expired', count: 0, countText: '' },
				],
				availableList: [],
				allCoupons: [],
				myCoupons: [],
				availableLoading: false,
				myCouponsLoading: false,
				receivingCouponId: '',
			};
		},
		onLoad(options) {
			this.applyInitialTab(options || {});
		},
		onShow() {
			if (this.hasLogin) {
				this.refreshCouponData();
			} else {
				this.availableList = [];
				this.allCoupons = [];
				this.myCoupons = [];
			}
		},
		methods: {
			...mapActions(['loginAndRegister', 'getUserInfo']),
			applyInitialTab(options) {
				var key = options.tab || options.type || 'unused';
				this.switchTabByKey(key, false);
			},
			switchTabByKey(key, shouldLoad) {
				var index = this.tabs.findIndex(function(item) { return item.key === key; });
				this.tabIndex = index >= 0 ? index : 0;
				if (shouldLoad === false || !this.hasLogin) return;
				if (this.activeTabKey === 'available') this.loadAvailable();
				else this.syncMyCoupons();
			},
			switchTab(index) {
				if (this.tabIndex === index) return;
				this.tabIndex = index;
				if (this.activeTabKey === 'available') this.loadAvailable();
				else this.syncMyCoupons();
			},
			handleLogin() {
				this.loginAndRegister().then(function() {
					this.getUserInfo();
					this.refreshCouponData();
				}.bind(this));
			},
			async refreshCouponData() {
				await Promise.all([
					this.loadAvailable(),
					this.loadAllMyCoupons(),
				]);
			},
			async loadAvailable() {
				if (!this.token) return;
				this.availableLoading = true;
				try {
					var res = await AUTH.getCouponList(this.token);
					if (res._status === 0) {
						var list = res.data || [];
						this.availableList = list.filter(function(item) {
							return this.isCouponClaimable(item);
						}.bind(this)).map(function(item) {
							return this.prepareCoupon(item, true);
						}.bind(this));
					} else {
						this.availableList = [];
					}
				} catch (e) {
					console.error('加载优惠券失败:', e);
					this.availableList = [];
				} finally {
					this.setTabCount('available', this.availableList.length);
					this.availableLoading = false;
				}
			},
			async loadAllMyCoupons() {
				if (!this.token) return;
				this.myCouponsLoading = true;
				try {
					var res = await AUTH.getMyCoupons(this.token);
					if (res._status === 0) {
						this.allCoupons = (res.data || []).map(function(item) {
							return this.prepareCoupon(item, false);
						}.bind(this));
					} else {
						this.allCoupons = [];
					}
				} catch (e) {
					console.error('加载我的优惠券失败:', e);
					this.allCoupons = [];
				} finally {
					this.updateMyCouponCounts();
					this.syncMyCoupons();
					this.myCouponsLoading = false;
				}
			},
			setTabCount(key, count) {
				var tab = this.tabs.find(function(item) { return item.key === key; });
				if (!tab) return;
				tab.count = Number(count) || 0;
				tab.countText = tab.count > 99 ? '99+' : (tab.count > 0 ? String(tab.count) : '');
			},
			countCouponsByStatus(status) {
				return this.allCoupons.filter(function(item) {
					return item.status === status;
				}).length;
			},
			updateMyCouponCounts() {
				this.setTabCount('unused', this.countCouponsByStatus(0));
				this.setTabCount('used', this.countCouponsByStatus(1));
				this.setTabCount('expired', this.countCouponsByStatus(2));
			},
			syncMyCoupons() {
				var statusMap = { unused: 0, used: 1, expired: 2 };
				var status = statusMap[this.activeTabKey];
				if (status === undefined) {
					this.myCoupons = [];
					return;
				}
				var list = this.allCoupons.filter(function(item) {
					return item.status === status;
				}).map(function(item) {
					return Object.assign({}, item);
				});
				if (status === 0) {
					list.sort(function(a, b) {
						var aExpire = a.expireTimestamp || 9007199254740991;
						var bExpire = b.expireTimestamp || 9007199254740991;
						if (aExpire !== bExpire) return aExpire - bExpire;
						return b.valueScore - a.valueScore;
					});
					if (list.length > 0) {
						list[0].statusTagText = list[0].daysLeft !== null && list[0].daysLeft <= 7 ? '即将到期' : '优先使用';
						list[0].statusTagClassName = list[0].daysLeft !== null && list[0].daysLeft <= 7 ? 'status-tag urgent' : 'status-tag recommended';
					}
				}
				this.myCoupons = list;
			},
			async receiveCoupon(item) {
				if (!item || !item.claimable || this.receivingCouponId) return;
				this.receivingCouponId = item.campaign_id;
				this.trackCouponEvent('coupon_receive_click', item);
				uni.showLoading({ title: '领取中...' });
				try {
					var res = await AUTH.receiveCoupon(this.token, item.campaign_id);
					uni.hideLoading();
					if (res._status === 0) {
						this.trackCouponEvent('coupon_receive_success', item);
						await this.refreshCouponData();
						this.showCouponSuccessActions(item, res.data || {});
					} else {
						this.trackCouponEvent('coupon_receive_failed', item, { reason: res._reason || '领取失败' });
						uni.showToast({ title: res._reason || '领取失败', icon: 'none' });
					}
				} catch (e) {
					uni.hideLoading();
					this.trackCouponEvent('coupon_receive_failed', item, { reason: 'request_failed' });
					uni.showToast({ title: '领取失败', icon: 'none' });
				} finally {
					this.receivingCouponId = '';
				}
			},
			isCouponClaimable(item) {
				if (!item || item.can_receive === false || item.user_received) return false;
				return item.remaining_count !== 0;
			},
			trackCouponEvent(event, item, extra) {
				var data = Object.assign({
					event: event,
					page_path: 'pages/my/coupons/coupons',
					source: 'my_coupons',
					campaign_id: item && item.campaign_id,
					coupon_id: item && item.object_id,
					coupon_type: item && item.coupon_type,
				}, extra || {});
				AUTH.trackEvent(data, this.token).catch(function() {});
			},
			showCouponSuccessActions(item, data) {
				var name = data.coupon_name || item.name || '优惠券';
				var couponType = data.coupon_type || item.coupon_type;
				if (couponType === 'gift') {
					uni.showModal({
						title: '领取成功',
						content: name + ' 已领取，奖励已到账。',
						confirmText: '知道了',
						showCancel: false,
					});
					return;
				}
				uni.showModal({
					title: '领取成功',
					content: name + ' 已放入未使用优惠券。',
					confirmText: '去使用',
					cancelText: '继续领',
					success: function(modalRes) {
						if (modalRes.confirm) this.openCouponUseSheet(item, 'receive_success');
					}.bind(this),
				});
			},
			goUseCoupon(item) {
				this.openCouponUseSheet(item, 'my_coupon_use');
			},
			openCouponUseSheet(item, source) {
				this.trackCouponEvent('coupon_use_entry_click', item, { entry_source: source || 'my_coupons' });
				uni.showActionSheet({
					itemList: ['预约包厢', '买大厅票'],
					success: function(res) {
						if (res.tapIndex === 0) {
							uni.switchTab({ url: '/pages/tabBar/appoint/appoint' });
						} else if (res.tapIndex === 1) {
							uni.navigateTo({ url: '/pages/ticket/buy' });
						}
					}.bind(this),
				});
			},
			goCouponMall() {
				uni.setStorageSync('voucherInitialTab', 'coupon');
				uni.switchTab({ url: '/pages/voucher/voucher' });
			},
			prepareCoupon(item, isAvailable) {
				var coupon = Object.assign({}, item);
				var status = Number(coupon.status);
				coupon.status = isFinite(status) ? status : 0;
				coupon.min_consume = this.getMinConsume(coupon);
				coupon.displayPrefix = this.getCouponPrefix(coupon);
				coupon.displayValue = this.getCouponValue(coupon);
				coupon.limitText = coupon.min_consume > 0 ? '满' + this.formatFen(coupon.min_consume) + '元可用' : '无门槛';
				coupon.descText = this.getCouponDesc(coupon);
				coupon.detailText = coupon.description || coupon.descText;
				coupon.scopeText = this.getCouponScopeText(coupon);
				coupon.validText = this.getCouponValidText(coupon);
				coupon.expireTimestamp = this.parseExpireTimestamp(coupon.expire_time);
				coupon.daysLeft = this.getDaysLeft(coupon.expireTimestamp);
				coupon.expireText = this.getCouponExpireText(coupon);
				coupon.expireClassName = this.getExpireClassName(coupon);
				coupon.urgencyText = this.getUrgencyText(coupon);
				coupon.urgencyClassName = coupon.daysLeft !== null && coupon.daysLeft <= 3 ? 'meta-tag urgent' : 'meta-tag soon';
				coupon.statusTagText = coupon.status === 1 ? '已使用' : (coupon.status === 2 ? '已过期' : '');
				coupon.statusTagClassName = coupon.status === 1 ? 'status-tag used' : (coupon.status === 2 ? 'status-tag expired' : 'status-tag');
				coupon.cardClass = coupon.status === 1 ? 'coupon-card used' : (coupon.status === 2 ? 'coupon-card expired' : 'coupon-card');
				coupon.leftClassName = this.getCouponLeftClass(coupon);
				coupon.valueScore = this.getCouponValueScore(coupon);
				coupon.claimable = isAvailable ? this.isCouponClaimable(coupon) : false;
				coupon.receiveButtonText = coupon.claimable ? '领取' : (coupon.receive_status_text || '已领取');
				coupon.receiveLimitText = this.getReceiveLimitText(coupon);
				return coupon;
			},
			getMinConsume(item) {
				var rules = item.rules || {};
				if (item.min_consume !== undefined && item.min_consume !== null) return Number(item.min_consume) || 0;
				return Number(rules.min_amount) || 0;
			},
			getCouponPrefix(item) {
				return item.coupon_type === 'rebate' ? '¥' : '';
			},
			getCouponValue(item) {
				var rules = item.rules || {};
				if (item.coupon_type === 'rebate') return this.formatFen(rules.discount || item.discount || 0);
				if (item.coupon_type === 'discount') {
					var rate = this.normalizeDiscountRate(rules.discount_rate || item.discount_rate || 1);
					return Math.round(rate * 100) / 10 + '折';
				}
				return rules.gift_value ? rules.gift_value + '积分' : '福利';
			},
			getCouponValueScore(item) {
				var rules = item.rules || {};
				if (item.coupon_type === 'rebate') return Number(rules.discount || item.discount || 0);
				if (item.coupon_type === 'discount') return Number(rules.max_discount || 0);
				return Number(rules.gift_value || 0);
			},
			getCouponLeftClass(item) {
				var typeClass = item.coupon_type === 'discount' ? ' discount' : (item.coupon_type === 'gift' ? ' gift' : ' rebate');
				if (item.status === 1 || item.status === 2) typeClass = ' inactive';
				return 'coupon-value-panel' + typeClass;
			},
			getCouponScopeText(item) {
				if (item.coupon_type === 'gift') return '到账福利';
				var text = String(item.description || '') + String(item.name || '');
				if (text.indexOf('大厅票') >= 0 || text.indexOf('包厢') >= 0) return '包厢/大厅票';
				return '下单可用';
			},
			getCouponDesc(item) {
				var rules = item.rules || {};
				if (item.coupon_type === 'rebate') {
					var threshold = item.min_consume > 0 ? '满' + this.formatFen(item.min_consume) + '元' : '无门槛';
					var discount = Number(rules.discount || 0);
					return discount > 0 ? threshold + ' · 立减' + this.formatFen(discount) + '元' : threshold;
				}
				if (item.coupon_type === 'discount') {
					var parts = [];
					if (item.min_consume > 0) parts.push('满' + this.formatFen(item.min_consume) + '元可用');
					if (Number(rules.max_discount || 0) > 0) parts.push('最高减' + this.formatFen(rules.max_discount) + '元');
					return parts.length > 0 ? parts.join(' · ') : '无门槛';
				}
				if (item.coupon_type === 'gift') return rules.gift_value ? '价值' + rules.gift_value + '积分' : '';
				return '';
			},
			getCouponValidText(item) {
				if (Number(item.validity_days || 0) > 0) return '领后' + item.validity_days + '天';
				if (item.end_time) return '至' + this.shortDate(item.end_time);
				return '长期有效';
			},
			getReceiveLimitText(item) {
				var remaining = Number(item.remaining_user_count);
				if (remaining > 0) return '还可领' + remaining + '张';
				if (Number(item.per_user_limit || 0) > 0) return '每人限领' + item.per_user_limit + '张';
				return '数量有限';
			},
			parseExpireTimestamp(value) {
				if (!value || String(value).indexOf('无期限') >= 0) return 0;
				var match = String(value).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
				if (!match) return 0;
				return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 23, 59, 59).getTime();
			},
			getDaysLeft(expireTimestamp) {
				if (!expireTimestamp) return null;
				var today = new Date();
				today.setHours(0, 0, 0, 0);
				var expireDate = new Date(expireTimestamp);
				expireDate.setHours(0, 0, 0, 0);
				return Math.round((expireDate.getTime() - today.getTime()) / 86400000);
			},
			getUrgencyText(item) {
				if (item.status !== 0 || item.daysLeft === null || item.daysLeft > 7) return '';
				if (item.daysLeft <= 0) return '今天到期';
				if (item.daysLeft === 1) return '明天到期';
				return '剩' + item.daysLeft + '天';
			},
			getCouponExpireText(item) {
				if (item.status === 1) return '使用于 ' + (item.used_time ? this.shortDate(item.used_time) : '近期');
				if (item.status === 2) return item.expire_time && item.expire_time !== '无期限' ? '过期于 ' + this.shortDate(item.expire_time) : '已过期';
				if (item.daysLeft === 0) return '今天到期';
				if (item.daysLeft === 1) return '明天到期';
				return item.expire_time && item.expire_time !== '无期限' ? '有效期至 ' + this.shortDate(item.expire_time) : '无期限';
			},
			getExpireClassName(item) {
				if (item.status === 1 || item.status === 2) return 'expire-text muted';
				if (item.daysLeft !== null && item.daysLeft <= 3) return 'expire-text urgent';
				if (item.daysLeft !== null && item.daysLeft <= 7) return 'expire-text soon';
				return 'expire-text';
			},
			formatFen(fen) {
				var amount = Number(fen);
				if (!isFinite(amount)) amount = 0;
				var yuan = amount / 100;
				return yuan % 1 === 0 ? String(yuan.toFixed(0)) : yuan.toFixed(2);
			},
			normalizeDiscountRate(rate) {
				var number = Number(rate);
				if (!isFinite(number) || number <= 0) return 1;
				if (number > 10) return number / 100;
				if (number > 1) return number / 10;
				return number;
			},
			shortDate(value) {
				if (!value) return '';
				return String(value).substring(0, 10);
			},
		},
	};
</script>

<style lang="scss">
	$orange: #D9653B;
	$orange-dark: #A9472B;
	$green: #4F765D;
	$gold: #B77B22;
	$red: #C7473D;
	$text: #302D2A;
	$text-soft: #716B64;
	$text-muted: #9B958E;
	$line: #E9E3DC;
	$surface: #FFFFFF;
	$background: #F6F4F1;

	page {
		background: $background;
	}

	.page-wrapper {
		height: 100vh;
		display: flex;
		flex-direction: column;
		background: $background;
		color: $text;
	}

	.page-head {
		background: $surface;
		padding: 26rpx 28rpx 0;
		border-bottom: 1rpx solid $line;
	}

	.head-main {
		display: flex;
		align-items: center;
		min-height: 78rpx;
	}

	.head-emblem,
	.login-icon,
	.empty-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		background: $orange;
		color: #FFF;
		font-weight: 700;
	}

	.head-emblem {
		width: 64rpx;
		height: 64rpx;
		border-radius: 14rpx;
		font-size: 30rpx;
		flex-shrink: 0;
	}

	.head-copy {
		min-width: 0;
		flex: 1;
		margin-left: 18rpx;
	}

	.head-title {
		display: block;
		font-size: 36rpx;
		font-weight: 700;
		line-height: 1.2;
		letter-spacing: 0;
	}

	.head-summary {
		display: block;
		margin-top: 7rpx;
		font-size: 23rpx;
		line-height: 1.35;
		color: $text-soft;
	}

	.head-action {
		height: 58rpx;
		padding: 0 20rpx;
		border: 1rpx solid rgba(217, 101, 59, 0.35);
		border-radius: 14rpx;
		display: flex;
		align-items: center;
		gap: 5rpx;
		color: $orange-dark;
		font-size: 24rpx;
		font-weight: 600;
		flex-shrink: 0;
	}

	.head-action-icon {
		font-size: 29rpx;
		line-height: 1;
	}

	.summary-strip {
		display: flex;
		margin-top: 22rpx;
		border-top: 1rpx solid $line;
	}

	.summary-item {
		flex: 1;
		min-width: 0;
		padding: 19rpx 8rpx 21rpx;
		display: flex;
		align-items: baseline;
		justify-content: center;
		gap: 8rpx;
		position: relative;
	}

	.summary-item + .summary-item::before {
		content: '';
		position: absolute;
		left: 0;
		top: 20rpx;
		bottom: 20rpx;
		width: 1rpx;
		background: $line;
	}

	.summary-value {
		font-size: 34rpx;
		font-weight: 700;
		color: $text;
		line-height: 1;
	}

	.summary-label {
		font-size: 21rpx;
		color: $text-muted;
		white-space: nowrap;
	}

	.summary-item.warning .summary-value {
		color: $red;
	}

	.login-panel {
		margin: 88rpx 28rpx 0;
		padding: 54rpx 36rpx;
		background: $surface;
		border: 1rpx solid $line;
		border-radius: 16rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.login-icon,
	.empty-icon {
		width: 72rpx;
		height: 72rpx;
		border-radius: 16rpx;
		font-size: 30rpx;
	}

	.login-title {
		margin-top: 24rpx;
		font-size: 31rpx;
		font-weight: 700;
	}

	.login-sub {
		margin-top: 10rpx;
		font-size: 24rpx;
		line-height: 1.5;
		color: $text-soft;
		text-align: center;
	}

	.login-btn,
	.empty-action {
		margin-top: 28rpx;
		height: 68rpx;
		padding: 0 34rpx;
		border-radius: 14rpx;
		background: $orange;
		color: #FFF;
		font-size: 26rpx;
		font-weight: 600;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.tab-bar {
		margin: 16rpx 24rpx 10rpx;
		padding: 6rpx;
		display: flex;
		background: #EDE9E4;
		border-radius: 16rpx;
		flex-shrink: 0;
	}

	.tab-item {
		flex: 1;
		min-width: 0;
		height: 62rpx;
		padding: 0 4rpx;
		border-radius: 12rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 5rpx;
		color: $text-soft;
		font-size: 23rpx;
	}

	.tab-item.active {
		background: $surface;
		color: $text;
		font-weight: 700;
		box-shadow: 0 2rpx 8rpx rgba(48, 45, 42, 0.08);
	}

	.tab-name {
		white-space: nowrap;
	}

	.tab-count {
		min-width: 28rpx;
		height: 28rpx;
		padding: 0 5rpx;
		border-radius: 14rpx;
		background: #DED8D1;
		color: $text-soft;
		font-size: 17rpx;
		line-height: 28rpx;
		text-align: center;
	}

	.tab-item.active .tab-count {
		background: #F7E5DD;
		color: $orange-dark;
	}

	.scroll-area {
		flex: 1;
		min-height: 0;
	}

	.list-heading {
		padding: 14rpx 28rpx 12rpx;
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 20rpx;
	}

	.list-title {
		font-size: 29rpx;
		font-weight: 700;
	}

	.list-note {
		font-size: 21rpx;
		color: $text-muted;
		text-align: right;
	}

	.loading-box {
		padding: 120rpx 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 18rpx;
		font-size: 24rpx;
		color: $text-muted;
	}

	.loading-dot {
		width: 26rpx;
		height: 26rpx;
		border: 4rpx solid #E4DED7;
		border-top-color: $orange;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.coupon-list {
		padding: 0 24rpx;
		display: flex;
		flex-direction: column;
		gap: 18rpx;
	}

	.coupon-card {
		min-height: 218rpx;
		display: flex;
		background: $surface;
		border: 1rpx solid $line;
		border-radius: 16rpx;
		overflow: hidden;
		position: relative;
		box-shadow: 0 4rpx 14rpx rgba(48, 45, 42, 0.04);
	}

	.coupon-card.used,
	.coupon-card.expired {
		background: #F2F0ED;
		box-shadow: none;
	}

	.coupon-value-panel {
		width: 174rpx;
		padding: 28rpx 12rpx;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: #FFF;
		flex-shrink: 0;
	}

	.coupon-value-panel.rebate { background: $orange; }
	.coupon-value-panel.discount { background: $green; }
	.coupon-value-panel.gift { background: $gold; }
	.coupon-value-panel.inactive { background: #AAA49D; }

	.coupon-value {
		display: flex;
		align-items: baseline;
		justify-content: center;
		max-width: 100%;
	}

	.value-prefix {
		font-size: 24rpx;
		font-weight: 600;
	}

	.value-number {
		font-size: 46rpx;
		font-weight: 700;
		line-height: 1.05;
		word-break: break-all;
		text-align: center;
	}

	.value-rule {
		margin-top: 10rpx;
		font-size: 19rpx;
		line-height: 1.3;
		color: rgba(255, 255, 255, 0.9);
		text-align: center;
	}

	.ticket-separator {
		width: 20rpx;
		position: relative;
		flex-shrink: 0;
	}

	.ticket-line {
		position: absolute;
		left: 50%;
		top: 17rpx;
		bottom: 17rpx;
		border-left: 1rpx dashed #D7D0C9;
	}

	.ticket-hole {
		position: absolute;
		left: 50%;
		width: 20rpx;
		height: 20rpx;
		border-radius: 50%;
		background: $background;
		transform: translateX(-50%);
		z-index: 2;
	}

	.ticket-hole.top { top: -10rpx; }
	.ticket-hole.bottom { bottom: -10rpx; }

	.coupon-main {
		min-width: 0;
		flex: 1;
		padding: 20rpx 20rpx 18rpx 10rpx;
		display: flex;
		flex-direction: column;
	}

	.coupon-title-row {
		display: flex;
		align-items: flex-start;
		gap: 10rpx;
	}

	.coupon-name {
		font-size: 28rpx;
		font-weight: 700;
		line-height: 1.35;
		color: $text;
		word-break: break-all;
		letter-spacing: 0;
	}

	.coupon-title-row .coupon-name {
		min-width: 0;
		flex: 1;
	}

	.status-tag {
		flex-shrink: 0;
		padding: 4rpx 9rpx;
		border-radius: 8rpx;
		font-size: 18rpx;
		line-height: 1.3;
		background: #ECE8E3;
		color: $text-soft;
	}

	.status-tag.recommended {
		background: #EEF4EF;
		color: $green;
	}

	.status-tag.urgent,
	.status-tag.expired {
		background: #FBE8E5;
		color: $red;
	}

	.status-tag.used {
		background: #E6E3DF;
		color: $text-muted;
	}

	.coupon-meta {
		margin-top: 10rpx;
		display: flex;
		align-items: center;
		gap: 8rpx;
		flex-wrap: wrap;
	}

	.meta-tag {
		padding: 4rpx 9rpx;
		border-radius: 8rpx;
		background: #F7E9E2;
		color: $orange-dark;
		font-size: 18rpx;
		line-height: 1.35;
	}

	.meta-tag.neutral {
		background: #EFEEE9;
		color: $text-soft;
	}

	.meta-tag.soon {
		background: #FFF1D9;
		color: #966319;
	}

	.meta-tag.urgent {
		background: #FBE8E5;
		color: $red;
	}

	.coupon-description {
		margin-top: 9rpx;
		font-size: 21rpx;
		line-height: 1.45;
		color: $text-soft;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		overflow: hidden;
		word-break: break-all;
	}

	.coupon-card.used .coupon-name,
	.coupon-card.expired .coupon-name,
	.coupon-card.used .coupon-description,
	.coupon-card.expired .coupon-description {
		color: $text-muted;
	}

	.coupon-footer {
		margin-top: auto;
		padding-top: 12rpx;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12rpx;
	}

	.footer-note,
	.expire-text {
		min-width: 0;
		font-size: 19rpx;
		line-height: 1.35;
		color: $text-muted;
	}

	.expire-text.soon { color: #966319; }
	.expire-text.urgent { color: $red; font-weight: 600; }
	.expire-text.muted { color: $text-muted; }

	.coupon-action {
		width: 112rpx;
		height: 52rpx;
		border-radius: 12rpx;
		font-size: 23rpx;
		font-weight: 600;
		line-height: 52rpx;
		text-align: center;
		box-sizing: border-box;
		flex-shrink: 0;
	}

	button.coupon-action {
		margin: 0;
		padding: 0;
	}

	button.coupon-action::after {
		border: none;
	}

	.coupon-action.primary {
		background: $orange;
		color: #FFF;
	}

	.coupon-action.primary[disabled] {
		background: #C9C4BE;
		color: #FFF;
	}

	.coupon-action.outline {
		border: 1rpx solid rgba(217, 101, 59, 0.45);
		color: $orange-dark;
		background: #FFF;
	}

	.empty-box {
		padding: 112rpx 32rpx 70rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}

	.empty-icon {
		background: #C4BDB5;
	}

	.empty-title {
		margin-top: 24rpx;
		font-size: 30rpx;
		font-weight: 700;
	}

	.empty-sub {
		margin-top: 9rpx;
		font-size: 23rpx;
		line-height: 1.5;
		color: $text-muted;
	}

	.safe-space {
		height: calc(34rpx + env(safe-area-inset-bottom));
	}
</style>
