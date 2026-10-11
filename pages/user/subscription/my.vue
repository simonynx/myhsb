<template>
	<view class="page-wrapper">
		<view class="custom-nav" :style="navStyle">
			<view class="nav-content" :style="navContentStyle">
				<view class="back-btn" @tap="goBack"><text>‹</text></view>
				<text class="nav-title">我的卡包</text>
			</view>
		</view>
		<view class="nav-placeholder" :style="navPlaceholderStyle"></view>

		<view class="tabs">
			<view class="tab-item" v-for="tab in tabList" :key="tab.value"
				:class="currentTab === tab.value ? 'active' : ''" @tap="switchTab(tab.value)">
				<text>{{ tab.name }}</text>
			</view>
		</view>

		<scroll-view class="scroll-area" scroll-y>
			<view v-if="loading" class="feedback-state">
				<text class="feedback-title">正在整理你的卡包…</text>
				<text class="feedback-desc">剩余额度与有效期加载中</text>
			</view>
			<view v-else-if="loadError" class="feedback-state">
				<text class="feedback-title">卡包暂时未能加载</text>
				<text class="feedback-desc">{{ loadError }}</text>
				<view class="retry-btn" @tap="fetchData">重新加载</view>
			</view>
			<view v-else-if="list.length === 0" class="feedback-state">
				<text class="feedback-title">{{ emptyText }}</text>
				<text class="feedback-desc">已购卡包的额度和使用规则会显示在这里</text>
				<view class="retry-btn" @tap="goBuy">看看次卡 / 小时卡</view>
			</view>
			<view v-else class="card-list">
				<view v-for="sub in list" :key="sub.object_id" :class="sub.cardClass">
					<view class="card-header">
						<text class="card-type-tag">{{ sub.badgeText }}</text>
						<text class="card-status-name">{{ sub.statusText }}</text>
					</view>
					<text class="card-name">{{ sub.cardName }}</text>
					<view class="quota-section">
						<text class="quota-label">剩余额度</text>
						<view><text class="limit-num">{{ sub.remaining_limit }}</text><text class="limit-unit">{{ sub.unitText }}</text></view>
						<view class="usage-bar" v-if="sub.total_limit > 0"><view class="usage-fill" :style="sub.usageBarStyle"></view></view>
						<text class="usage-text" v-if="sub.total_limit > 0">已用 {{ sub.used_limit }} / 共 {{ sub.total_limit }}{{ sub.unitText }}</text>
					</view>
					<view class="expiry-section">
						<text class="expire-time">有效期至 {{ sub.formatted_expire }}</text>
						<text class="expire-warning" v-if="sub.expire_warning">{{ sub.expire_warning }}</text>
						<text class="effective-time" v-if="sub.effectiveText">{{ sub.effectiveText }}</text>
					</view>
					<view class="card-actions" v-if="sub.canUse">
						<view class="use-btn" @tap="goUse(sub)">{{ sub.ctaText }}</view>
						<text class="checkout-hint">结算页确认可用卡，抵扣以本单规则为准</text>
					</view>
					<view class="card-actions" v-else-if="sub.canRepurchase">
						<view class="repurchase-btn" @tap="goBuy">再买一张</view>
					</view>
					<view class="card-rules">
						<text v-if="sub.restrictionSummary" class="restriction-text">{{ sub.restrictionSummary }}</text>
						<text class="rule-text" v-for="rule in sub.visibleRules" :key="rule.key">{{ rule.text }}</text>
						<text v-if="sub.mixedRightsText" class="restriction-text">{{ sub.mixedRightsText }}</text>
						<view class="details-toggle" @tap="toggleDetails(sub)">
							<text>使用规则</text><text>{{ sub.detailsExpanded ? '收起 −' : '展开 +' }}</text>
						</view>
						<view class="card-details" v-if="sub.detailsExpanded">
							<text class="rule-text">可抵扣：{{ sub.usageText }}</text>
							<text class="rule-text" v-for="rule in sub.detailRules" :key="rule.key">{{ rule.text }}</text>
							<text class="rule-text" v-if="sub.combinationText">{{ sub.combinationText }}</text>
							<text class="validity-detail">{{ sub.validityText }}</text>
						</view>
					</view>
				</view>
			</view>
		</scroll-view>
		<view class="footer-actions"><view class="buy-more-btn" @tap="goBuy">购买更多卡包</view></view>
	</view>
</template>

<script>
import { mapState } from 'vuex';
import AUTH from '../../../utils/auth.js';
import SUBSCRIPTION from '../../../utils/subscription.js';
import PRESENTATION from '../../../utils/subscriptionPresentation.js';
import MALL_NAV from '../../../utils/mallNavigation.js';

export default {
	data() {
		return {
			list: [],
			loading: true,
			loadError: '',
			requestSeq: 0,
			currentTab: 1,
			navStyle: 'padding-top: env(safe-area-inset-top);',
			navContentStyle: 'height: 44px;',
			navPlaceholderStyle: 'height: calc(44px + env(safe-area-inset-top));',
			tabList: [
				{ name: '使用中', value: 1 },
				{ name: '已用完', value: 2 },
				{ name: '已过期', value: 3 }
			]
		};
	},
	computed: {
		...mapState(['token']),
		emptyText() {
			return this.currentTab === 1 ? '暂时没有使用中的卡包' : this.currentTab === 2 ? '还没有用完的卡包' : '还没有过期的卡包';
		}
	},
	onLoad() {
		this.initNavigation();
	},
	onShow() {
		return this.fetchData();
	},
	onUnload() {
		this.requestSeq++;
	},
	methods: {
		initNavigation() {
			try {
				const info = uni.getSystemInfoSync();
				const top = Math.max(0, Number(info.statusBarHeight) || 0);
				let height = 44;
				let side = 56;
				// #ifdef MP-WEIXIN
				const capsule = uni.getMenuButtonBoundingClientRect && uni.getMenuButtonBoundingClientRect();
				if (capsule && capsule.height > 0 && capsule.top >= top) {
					height = (capsule.top - top) * 2 + capsule.height;
					if (Number(info.windowWidth) > 0 && Number(capsule.left) > 0) {
						side = Math.max(side, Number(info.windowWidth) - Number(capsule.left) + 8);
					}
				}
				// #endif
				this.navStyle = 'padding-top: ' + top + 'px;';
				this.navContentStyle = 'height: ' + height + 'px; padding-left: ' + side + 'px; padding-right: ' + side + 'px;';
				this.navPlaceholderStyle = 'height: ' + (top + height) + 'px;';
			} catch (error) {
				// Unsupported platforms retain the safe-area CSS fallback.
			}
		},
		fetchData() {
			const request = ++this.requestSeq;
			const tab = this.currentTab;
			this.loading = true;
			this.loadError = '';
			this.list = [];
			return Promise.resolve().then(() => AUTH.getUserSubscriptions(this.token, tab)).then(res => {
				if (request !== this.requestSeq || tab !== this.currentTab) return;
				if (!res || res._status !== 0 || !Array.isArray(res.data)) {
					throw new Error(res && res._reason || '请检查网络后重试');
				}
				this.list = res.data.map(sub => this.decorateCard(sub));
				this.loading = false;
			}).catch(error => {
				if (request !== this.requestSeq || tab !== this.currentTab) return;
				this.loading = false;
				this.loadError = error && error.message || '请检查网络后重试';
			});
		},
		switchTab(val) {
			if (this.currentTab === val) return;
			this.currentTab = val;
			return this.fetchData();
		},
		parseTimestamp(value) {
			if (value === null || value === undefined || value === '') return null;
			if (typeof value === 'number' || /^\d+(\.\d+)?$/.test(String(value).trim())) {
				const numeric = Number(value);
				const ms = numeric < 100000000000 ? numeric * 1000 : numeric;
				return isFinite(ms) && ms > 0 && !isNaN(new Date(ms).getTime()) ? ms : null;
			}
			const text = String(value).trim();
			// Parse server-local strings by components, not platform-specific Date parsing.
			const local = text.match(/^(\d{4})[-/](\d{2})[-/](\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,6}))?)?)?$/);
			if (local) {
				const year = Number(local[1]), month = Number(local[2]) - 1, day = Number(local[3]);
				const hour = Number(local[4] || 0), minute = Number(local[5] || 0), second = Number(local[6] || 0);
				const millis = Number((local[7] || '').slice(0, 3).padEnd(3, '0'));
				const date = new Date(year, month, day, hour, minute, second, millis);
				return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day &&
					date.getHours() === hour && date.getMinutes() === minute && date.getSeconds() === second ? date.getTime() : null;
			}
			if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/i.test(text)) {
				const ms = Date.parse(text);
				return isFinite(ms) ? ms : null;
			}
			return null;
		},
		formatTimestamp(ms) {
			if (ms === null) return '待确认';
			const date = new Date(ms);
			const pad = value => String(value).padStart(2, '0');
			return date.getFullYear() + '.' + pad(date.getMonth() + 1) + '.' + pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
		},
		getStartValue(sub) {
			// The API uses start_at. A supplied invalid value must not fall back to the alias.
			return sub.start_at !== null && sub.start_at !== undefined ? sub.start_at : sub.effective_at;
		},
		getAvailability(sub, now) {
			const expire = this.parseTimestamp(sub.expire_at);
			const start = this.getStartValue(sub);
			const hasEffective = start !== null && start !== undefined;
			const effective = this.parseTimestamp(start);
			if (Number(sub.status) === 3 || (expire !== null && expire <= now)) return 'expired';
			if (Number(sub.status) === 2 || Number(sub.remaining_limit) <= 0) return 'used';
			if (expire === null || (hasEffective && effective === null)) return 'unknown';
			if (effective !== null && effective > now) return 'future';
			return Number(sub.status) === 1 && Number(sub.remaining_limit) > 0 ? 'active' : 'unknown';
		},
		compactRuleLine(rule) {
			const concise = {
				'大厅购票按人次扣减，持卡账号统一下单；同行每抵1张票扣1次': '大厅按人次扣减，同行每张票扣1次',
				'大厅购票按本单票数和卡内剩余额度抵扣': '大厅按本单票数与剩余额度抵扣',
				'包厢预约可扣1次抵本人入场费，不抵同行入场费': '包厢扣1次抵本人入场费，同行另付',
				'包厢预约入场费按本单人数和卡内剩余额度抵扣': '包厢入场费按本单人数与剩余额度抵扣',
				'包厢房费按所选时长和卡内剩余额度抵扣': '房费按本单时长与剩余额度抵扣',
				'只抵房费，不含本人及同行人的入场费': '预约只抵房费，本人及同行入场费另付',
				'闲时特惠小时默认不可抵小时卡，规则明确允许时除外；混合预约仅抵允许用卡的小时': '闲时特惠默认不可抵（规则允许除外）；混合预约仅抵允许用卡的小时'
			};
			const text = concise[rule.text] || rule.text
				.replace(/^大厅购票每单最多抵(.+)张票，超出部分另付$/, '大厅每单最多抵$1张票，超出另付')
				.replace(/^包厢预约入场费每单/, '包厢入场费每单').replace(/^包厢房费每单/, '房费每单');
			return Object.assign({}, rule, { text });
		},
		decorateCard(sub) {
			const template = sub.card_template || {};
			const view = PRESENTATION.buildCardView(template);
			const ruleLines = PRESENTATION.buildRuleLines(template);
			const now = Date.now();
			const state = this.getAvailability(sub, now);
			const expire = this.parseTimestamp(sub.expire_at);
			const remaining = Math.max(0, Number(sub.remaining_limit) || 0);
			const total = Math.max(0, Number(template.total_limit) || 0);
			const used = Math.max(0, total - remaining);
			const percent = total > 0 ? Math.min(100, Math.floor(used * 100 / total)) : 0;
			const ticket = PRESENTATION.presentationRule(template, SUBSCRIPTION.SLOT_TICKET);
			const room = PRESENTATION.presentationRule(template, SUBSCRIPTION.SLOT_ROOM_HOURS);
			const entry = PRESENTATION.presentationRule(template, SUBSCRIPTION.SLOT_SELF_ENTRY_FEE);
			const rights = [room ? '房费' : '', ticket ? '大厅票' : '', entry ? '包厢入场费' : ''].filter(Boolean);
			const important = rule => /大厅购票|房费|入场费|共用额度|闲时|适用房间|同一订单不可/.test(rule.text)
				|| (rights.length > 1 && /^同一卡包每单/.test(rule.text));
			const importantRules = ruleLines.filter(important);
			const secondaryRules = ruleLines.filter(rule => !important(rule));
			const combinationRule = ruleLines.find(rule => /^同一卡包每单/.test(rule.text));
			// Preserve the helper rules and fallback; only the card-face copy is shortened.
			const completeRoomRestrictions = room &&
				importantRules.some(rule => /入场费/.test(rule.text)) &&
				importantRules.some(rule => /闲时.*默认不可抵.*允许.*除外.*混合预约/.test(rule.text)) &&
				importantRules.some(rule => /适用房间/.test(rule.text));
			const restrictionText = completeRoomRestrictions || importantRules.some(rule => rule.text === view.restrictionText)
				? '' : view.restrictionText;
			let warning = '';
			if (state === 'expired') warning = '已过期，不可使用';
			else if (state === 'active' && expire - now <= 7 * 86400000) {
				warning = expire - now <= 86400000 ? '不足24小时到期' : '剩' + Math.ceil((expire - now) / 86400000) + '天到期';
			}
			return Object.assign({}, sub, {
				cardName: template.name || '我的卡包',
				remaining_limit: remaining,
				total_limit: total,
				used_limit: used,
				usageBarStyle: 'width: ' + percent + '%;',
				badgeText: view.badgeText,
				unitText: view.unitText,
				usageText: view.usageText,
				validityText: view.validityText,
				restrictionText,
				restrictionSummary: ticket ? '持卡账号下单，其他账号不可独立用卡' : room && restrictionText || '',
				mixedRightsText: rights.length > 1 ? rights.join(' / ') + (rights.length === 2 ? '二选一，' : '，') + '共用额度；本卡每单仅选一种权益' : '',
				ruleLines,
				importantRules,
				secondaryRules,
				visibleRules: importantRules.filter(rule => !/^(大厅购票与包厢入场抵扣共用额度|房费与入场费为二选一用途|同一卡包每单)/.test(rule.text)).map(this.compactRuleLine),
				detailRules: secondaryRules.filter(rule => rule !== combinationRule),
				combinationText: combinationRule ? (rights.length > 1 ? combinationRule.text.replace('同一卡包每单只能选择一种权益；', '') : combinationRule.text) : '',
				detailsExpanded: false,
				formatted_expire: this.formatTimestamp(expire),
				expire_warning: warning,
				effectiveText: state === 'future' ? this.formatTimestamp(this.parseTimestamp(this.getStartValue(sub))) + ' 起可用' : '',
				statusText: { active: '使用中', expired: '已过期', used: '额度已用完', future: '尚未生效', unknown: '有效状态待确认' }[state],
				cardClass: 'card-item ' + state + ' ' + this.getBgClass(sub, state),
				canUse: state === 'active' && !!(ticket || room || entry),
				canRepurchase: state === 'expired' || state === 'used',
				ctaText: ticket ? '去购大厅票' : '去预约'
			});
		},
		getBgClass(sub, state) {
			if ((state || this.getAvailability(sub, Date.now())) !== 'active') return 'muted-bg';
			return PRESENTATION.buildCardView(sub.card_template || {}).visualClass === 'room' ? 'room-bg' : 'hall-bg';
		},
		toggleDetails(sub) {
			sub.detailsExpanded = !sub.detailsExpanded;
		},
		goUse(sub) {
			// Recheck at tap time; navigation never selects a card or bypasses checkout validation.
			const current = this.decorateCard(sub);
			if (!current.canUse) {
				this.list = this.list.map(item => item.object_id === sub.object_id ? current : item);
				uni.showToast({ title: '此卡暂不可用，请确认有效期和剩余额度', icon: 'none' });
				return;
			}
			if (PRESENTATION.presentationRule(sub.card_template, SUBSCRIPTION.SLOT_TICKET)) {
				uni.navigateTo({ url: '/pages/ticket/buy?count=1' });
			} else {
				uni.switchTab({ url: '/pages/tabBar/appoint/appoint' });
			}
		},
		goBack() {
			const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
			if (pages && pages.length > 1) uni.navigateBack();
			else uni.switchTab({ url: '/pages/user/user' });
		},
		goBuy() {
			AUTH.trackEvent({ event: 'subscription_entry_click', page_path: 'pages/user/subscription/my', source: 'my_cards' }, this.token).catch(function() {});
			MALL_NAV.openCardMall({ source: 'my_cards' });
		}
	}
};
</script>

<style lang="scss">
page { background: #fbf6ee; }
.page-wrapper { height: 100vh; display: flex; flex-direction: column; color: #493b32; overflow: hidden; }
.custom-nav { position: fixed; top: 0; left: 0; right: 0; background: #fbf6ee; z-index: 999; }
.nav-content { position: relative; display: flex; align-items: center; justify-content: center; box-sizing: border-box; }
.nav-title { font-size: 32rpx; font-weight: bold; white-space: nowrap; }
.back-btn { position: absolute; left: 12px; top: 0; bottom: 0; width: 44px; min-width: 76rpx; min-height: 76rpx; display: flex; align-items: center; justify-content: center; font-size: 56rpx; color: #795347; }
.nav-placeholder { flex-shrink: 0; }
.tabs { display: flex; margin: 20rpx 24rpx 8rpx; padding: 8rpx; background: #efe6da; border-radius: 18rpx; flex-shrink: 0; }
.tab-item { flex: 1; display: flex; align-items: center; justify-content: center; min-height: 76rpx; box-sizing: border-box; padding: 16rpx 0; border-radius: 12rpx; font-size: 27rpx; color: #746154; }
.tab-item.active { background: #fffaf3; color: #98472f; font-weight: bold; box-shadow: 0 3rpx 10rpx rgba(96, 63, 42, .08); }
.scroll-area { flex: 1; height: 0; min-height: 0; }
.feedback-state { padding: 110rpx 40rpx; text-align: center; }
.feedback-title { display: block; font-size: 30rpx; font-weight: bold; line-height: 1.6; }
.feedback-desc { display: block; margin-top: 16rpx; color: #79675c; font-size: 26rpx; line-height: 1.7; }
.retry-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 76rpx; box-sizing: border-box; margin-top: 32rpx; padding: 20rpx 40rpx; border-radius: 14rpx; background: #a65037; color: #fffaf5; font-size: 28rpx; }
.card-list { padding: 24rpx; }
.card-item { margin-bottom: 28rpx; padding: 30rpx; border: 2rpx solid #dfc4ad; border-radius: 24rpx; box-sizing: border-box; box-shadow: 0 8rpx 24rpx rgba(88, 59, 39, .06); }
.hall-bg { background: #fff1e3; border-color: #dfb299; }
.room-bg { background: #eee5d8; border-color: #cdbda8; }
.muted-bg { background: #f0ebe3; border-color: #d7cec2; }
.card-header { display: flex; justify-content: space-between; align-items: center; gap: 16rpx; margin-bottom: 18rpx; }
.card-type-tag { padding: 8rpx 16rpx; background: #f3d7c1; color: #84442e; font-size: 24rpx; font-weight: bold; border-radius: 10rpx; }
.room-bg .card-type-tag { background: #ded0bd; color: #64503e; }
.muted-bg .card-type-tag { background: #e2d9cd; color: #66574b; }
.card-status-name { font-size: 24rpx; color: #705b4f; flex-shrink: 0; }
.card-name { display: block; font-size: 34rpx; font-weight: bold; line-height: 1.5; overflow-wrap: break-word; }
.quota-section { margin-top: 16rpx; }
.quota-label { display: block; font-size: 24rpx; color: #705b4f; margin-bottom: 6rpx; }
.limit-num { font-size: 64rpx; line-height: 1.15; font-weight: bold; color: #a04a31; }
.room-bg .limit-num { color: #695140; }
.muted-bg .limit-num { color: #776759; }
.limit-unit { margin-left: 10rpx; font-size: 28rpx; font-weight: bold; }
.usage-bar { height: 8rpx; margin-top: 12rpx; background: #e7d5c2; border-radius: 8rpx; overflow: hidden; }
.usage-fill { height: 100%; background: #b56a4c; border-radius: 8rpx; }
.room-bg .usage-fill { background: #90745c; }
.usage-text { display: block; margin-top: 8rpx; font-size: 24rpx; line-height: 1.5; color: #705b4f; }
.expiry-section { margin-top: 18rpx; padding: 14rpx 18rpx; border-radius: 12rpx; background: rgba(255, 252, 245, .65); }
.expire-time { display: block; font-size: 27rpx; line-height: 1.6; font-weight: bold; }
.expire-warning { display: block; margin-top: 4rpx; font-size: 25rpx; line-height: 1.6; color: #a3412b; font-weight: bold; }
.effective-time { display: block; font-size: 24rpx; line-height: 1.6; color: #705b4f; }
.card-rules { margin-top: 20rpx; padding-top: 8rpx; border-top: 1rpx solid #dac8b6; }
.restriction-text { display: block; margin-top: 10rpx; font-size: 24rpx; font-weight: bold; line-height: 1.55; color: #80503c; }
.rule-text { display: block; margin-top: 8rpx; font-size: 24rpx; line-height: 1.55; color: #655347; overflow-wrap: break-word; }
.details-toggle { display: flex; align-items: center; justify-content: space-between; min-height: 76rpx; box-sizing: border-box; margin-top: 16rpx; border-top: 1rpx solid #dac8b6; color: #904a33; font-size: 24rpx; font-weight: bold; }
.card-details { padding-top: 4rpx; border-top: 1rpx dashed #dac8b6; }
.validity-detail { display: block; margin-top: 12rpx; font-size: 24rpx; line-height: 1.55; color: #655347; }
.card-actions { margin-top: 18rpx; }
.use-btn { display: flex; align-items: center; justify-content: center; min-height: 76rpx; box-sizing: border-box; padding: 20rpx; text-align: center; background: #a65037; color: #fffaf5; border-radius: 14rpx; font-size: 29rpx; font-weight: bold; }
.room-bg .use-btn { background: #765b45; }
.checkout-hint { display: block; margin-top: 10rpx; font-size: 24rpx; line-height: 1.55; color: #705b4f; }
.repurchase-btn { display: flex; align-items: center; justify-content: center; min-height: 76rpx; box-sizing: border-box; padding: 20rpx; border: 1rpx solid #bda895; border-radius: 14rpx; color: #79513d; text-align: center; font-size: 27rpx; font-weight: bold; }
.footer-actions { padding: 18rpx 24rpx; padding-bottom: calc(18rpx + env(safe-area-inset-bottom)); background: #fbf6ee; border-top: 1rpx solid #e7dacb; flex-shrink: 0; }
.buy-more-btn { display: flex; align-items: center; justify-content: center; min-height: 76rpx; box-sizing: border-box; padding: 20rpx; border: 2rpx solid #b56a4c; border-radius: 16rpx; text-align: center; color: #904a33; font-size: 29rpx; font-weight: bold; }
</style>
