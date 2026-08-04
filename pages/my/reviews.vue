<template>
	<view class="page-wrapper">
		<view class="summary-band" v-if="summary.totalCount > 0">
			<view class="summary-score-block">
				<text class="summary-score">{{ summary.averageText }}</text>
				<view class="summary-stars">
					<text v-for="star in 5" :key="star" :class="star <= summary.filledStars ? 'summary-star filled' : 'summary-star'">★</text>
				</view>
			</view>
			<view class="summary-copy">
				<text class="summary-title">到店玩家评价</text>
				<text class="summary-desc">{{ summary.totalCount }} 条已验证消费评价</text>
				<view class="summary-tags" v-if="summary.topTags.length > 0">
					<text class="summary-tag" v-for="tag in summary.topTags" :key="tag.key">{{ tag.label }} {{ tag.count }}</text>
				</view>
			</view>
		</view>

		<view class="summary-empty" v-else-if="reviewsLoaded">
			<text class="empty-title">真实到店评价正在积累</text>
			<text class="empty-desc">完成到店消费后，可以在这里留下第一手体验。</text>
		</view>

		<view class="compose-section" v-if="hasLogin">
			<view class="section-heading">
				<view>
					<text class="section-kicker">消费后再评价</text>
					<text class="section-title">{{ editingReviewId ? '修改我的评价' : '写下到店体验' }}</text>
				</view>
				<text class="section-note">每笔订单一条</text>
			</view>

			<view class="review-form" v-if="selectedOrder">
				<picker :range="orderOptionLabels" :value="selectedOrderIndex" :disabled="!canSwitchOrder" @change="handleOrderChange">
					<view class="order-picker">
						<view class="order-picker-copy">
							<text class="field-label">评价哪次到店</text>
							<text class="order-picker-value">{{ selectedOrder.label }}</text>
						</view>
						<text class="picker-action" v-if="canSwitchOrder">更换记录 ›</text>
						<text class="picker-single" v-else>当前仅这一笔</text>
					</view>
				</picker>

				<view class="rating-row">
					<text class="field-label">体验评分</text>
					<view class="rating-stars">
						<text
							v-for="star in 5"
							:key="star"
							:class="star <= submitRating ? 'rating-star active' : 'rating-star'"
							@tap="submitRating = star"
						>★</text>
					</view>
					<text class="rating-value">{{ submitRating }}分</text>
				</view>

				<view class="tag-field" v-if="tagOptions.length > 0">
					<view class="field-heading">
						<text class="field-label">体验标签</text>
						<text class="field-hint">最多选3个</text>
					</view>
					<view class="tag-options">
						<text
							v-for="tag in tagOptions"
							:key="tag.key"
							:class="tag.className"
							@tap="toggleTag(tag.key)"
						>{{ tag.label }}</text>
					</view>
				</view>

				<textarea
					class="review-textarea"
					v-model="submitContent"
					placeholder="哪些体验值得推荐，或有哪些地方可以做得更好？"
					maxlength="500"
				></textarea>
				<text class="char-count">{{ submitContent.length }}/500</text>

				<view :class="submitting ? 'submit-button disabled' : 'submit-button'" @tap="doSubmitReview">
					<text>{{ submitting ? '提交中...' : (editingReviewId ? '保存修改' : '提交评价') }}</text>
				</view>
			</view>

			<view class="no-order" v-else>
				<text class="empty-title">暂时没有可评价订单</text>
				<text class="empty-desc">大厅票核销、包厢到店或线下消费结账后，评价入口会自动出现。</text>
			</view>
		</view>

		<view class="login-strip" v-else @tap="loginForReview">
			<view>
				<text class="login-title">登录后评价真实到店体验</text>
				<text class="login-desc">系统会自动找到你已经完成的消费订单</text>
			</view>
			<text class="login-action">登录 ›</text>
		</view>

		<view class="my-section" v-if="myReviews.length > 0">
			<view class="section-heading compact">
				<text class="section-title">我的评价</text>
				<text class="section-note">{{ myReviews.length }}条</text>
			</view>
			<view class="review-card mine" v-for="review in myReviews" :key="review.key">
				<view class="review-header">
					<view>
						<text class="review-name">{{ review.orderLabel }}</text>
						<view class="review-stars">
							<text v-for="star in 5" :key="star" :class="star <= review.ratingNumber ? 'star filled' : 'star'">★</text>
						</view>
					</view>
					<text class="edit-action" @tap="startEdit(review)">修改</text>
				</view>
				<view class="review-tags" v-if="review.tags.length > 0">
					<text class="review-tag" v-for="tag in review.tags" :key="tag">{{ tag }}</text>
				</view>
				<text class="review-text">{{ review.contentText }}</text>
				<text class="review-time">{{ review.shortTime }}</text>
			</view>
		</view>

		<view class="public-section">
			<view class="section-heading compact">
				<view>
					<text class="section-kicker">来自真实消费</text>
					<text class="section-title">大家怎么说</text>
				</view>
				<text class="section-note">最近{{ publicReviews.length }}条</text>
			</view>

			<view class="review-list" v-if="publicReviews.length > 0">
				<view class="review-card" v-for="review in publicReviews" :key="review.key">
					<view class="review-header">
						<view class="review-avatar">{{ review.avatarText }}</view>
						<view class="review-meta">
							<text class="review-name">{{ review.displayName }}</text>
							<view class="review-stars">
								<text v-for="star in 5" :key="star" :class="star <= review.ratingNumber ? 'star filled' : 'star'">★</text>
							</view>
						</view>
						<text class="verified-badge">已到店 · {{ review.sceneText }}</text>
					</view>
					<view class="review-tags" v-if="review.tags.length > 0">
						<text class="review-tag" v-for="tag in review.tags" :key="tag">{{ tag }}</text>
					</view>
					<text class="review-text">{{ review.contentText }}</text>
					<view class="merchant-reply" v-if="review.merchantReply">
						<text class="reply-label">店家回复</text>
						<text class="reply-text">{{ review.merchantReply }}</text>
					</view>
					<text class="review-time">{{ review.shortTime }}</text>
				</view>
			</view>

			<view class="list-empty" v-else-if="reviewsLoaded">
				<text class="empty-desc">还没有已验证的到店评价。</text>
			</view>
		</view>
	</view>
</template>

<script>
	import { mapState, mapActions } from 'vuex';
	import AUTH from '../../utils/auth.js';

	export default {
		computed: {
			...mapState(['hasLogin']),
			selectedOrder() {
				return this.orderOptions[this.selectedOrderIndex] || null;
			},
			orderOptionLabels() {
				return this.orderOptions.map(function(order) { return order.label; });
			},
			canSwitchOrder() {
				return this.orderOptions.length > 1;
			},
		},
		data() {
			return {
				summary: {
					totalCount: 0,
					averageText: '0.0',
					filledStars: 0,
					topTags: [],
				},
				publicReviews: [],
				myReviews: [],
				orderOptions: [],
				selectedOrderIndex: 0,
				tagOptions: [],
				submitRating: 5,
				submitContent: '',
				editingReviewId: '',
				routeOrderId: '',
				submitting: false,
				reviewsLoaded: false,
				loading: false,
			};
		},
		onLoad(options) {
			this.routeOrderId = options && options.order_id ? String(options.order_id) : '';
			this.loadReviews();
		},
		onShow() {
			if (this.reviewsLoaded && this.hasLogin) this.loadReviews();
		},
		methods: {
			...mapActions(['loginAndRegister', 'getReviewList', 'submitReview']),
			prepareOrder(raw) {
				if (!raw || !raw.object_id) return null;
				var sceneText = raw.scene_text || '到店体验';
				var title = raw.title || sceneText;
				var amountText = raw.amount_text || '';
				var completedAt = String(raw.completed_at || '');
				var dateText = completedAt ? completedAt.slice(0, 10).replace(/-/g, '.') : '';
				var labelParts = [];
				if (dateText) labelParts.push(dateText);
				labelParts.push(sceneText);
				if (title !== sceneText) labelParts.push(title);
				if (amountText) labelParts.push(amountText);
				return {
					key: String(raw.object_id),
					object_id: String(raw.object_id),
					sceneText: sceneText,
					title: title,
					label: labelParts.join(' · '),
				};
			},
			prepareReview(raw, index) {
				if (!raw) return null;
				var content = String(raw.content || '').replace(/\s+/g, ' ').trim();
				if (!content) return null;
				var rating = parseInt(raw.rating || 0);
				if (!isFinite(rating)) rating = 0;
				if (rating < 0) rating = 0;
				if (rating > 5) rating = 5;
				var sceneText = raw.scene_text || '到店体验';
				var sceneAvatar = sceneText.indexOf('包厢') >= 0 ? '包' : (sceneText.indexOf('大厅') >= 0 ? '厅' : '到');
				return {
					key: raw.object_id || 'review-' + index,
					object_id: raw.object_id || '',
					orderId: raw.order_id || '',
					orderLabel: raw.order_label || sceneText,
					displayName: raw.user_nickname || '匿名玩家',
					avatarText: sceneAvatar,
					ratingNumber: rating,
					contentText: content,
					tags: Array.isArray(raw.tags) ? raw.tags : [],
					sceneText: sceneText,
					merchantReply: raw.merchant_reply || '',
					shortTime: String(raw.updated_at || raw.created_at || '').slice(0, 16),
				};
			},
			buildTagOptions(labels, selectedTags) {
				var selected = Array.isArray(selectedTags) ? selectedTags : [];
				return (labels || []).map(function(label, index) {
					var active = selected.indexOf(label) >= 0;
					return {
						key: 'review-tag-' + index,
						label: label,
						selected: active,
						className: active ? 'tag-option active' : 'tag-option',
					};
				});
			},
			async loadReviews() {
				if (this.loading) return;
				this.loading = true;
				try {
					var payload = await this.getReviewList();
					payload = payload || {};
					var summary = payload.summary || {};
					var average = Number(summary.average_rating || 0);
					this.summary = {
						totalCount: Number(summary.total_count || 0),
						averageText: average > 0 ? average.toFixed(1) : '0.0',
						filledStars: Math.round(average),
						topTags: Array.isArray(summary.top_tags) ? summary.top_tags : [],
					};
					var publicList = Array.isArray(payload.reviews) ? payload.reviews : [];
					this.publicReviews = publicList.map(function(item, index) {
						return this.prepareReviewItem(item, index);
					}.bind(this)).filter(function(item) { return !!item; });
					var mineList = Array.isArray(payload.my_reviews) ? payload.my_reviews : [];
					this.myReviews = mineList.map(function(item, index) {
						return this.prepareReviewItem(item, index);
					}.bind(this)).filter(function(item) { return !!item; });
					var rawOrders = Array.isArray(payload.reviewable_orders) ? payload.reviewable_orders : [];
					this.orderOptions = rawOrders.map(this.prepareOrder).filter(function(item) { return !!item; });
					var availableTags = Array.isArray(payload.available_tags) ? payload.available_tags : [];
					this.tagOptions = this.buildTagOptions(availableTags, []);
					this.reviewsLoaded = true;
					AUTH.trackEvent({
						event: 'review_list_view',
						page_path: 'pages/my/reviews',
						source: this.routeOrderId ? 'order_detail' : 'review_entry',
						_dedupe_key: 'review_list_view',
						_dedupe_ttl_ms: 30 * 60 * 1000,
					}).catch(function() {});

					if (this.routeOrderId) {
						var routeReview = this.myReviews.find(function(review) {
							return String(review.orderId) === String(this.routeOrderId);
						}.bind(this));
						if (routeReview) {
							this.startEdit(routeReview);
						} else {
							var routeIndex = this.orderOptions.findIndex(function(order) {
								return String(order.object_id) === String(this.routeOrderId);
							}.bind(this));
							if (routeIndex >= 0) this.selectedOrderIndex = routeIndex;
						}
						this.routeOrderId = '';
					}
				} catch (error) {
					console.error('加载评价失败:', error);
					this.reviewsLoaded = true;
				} finally {
					this.loading = false;
				}
			},
			prepareReviewItem(raw, index) {
				return this.prepareReview(raw, index);
			},
			async loginForReview() {
				try {
					await this.loginAndRegister();
					if (this.hasLogin) await this.loadReviews();
				} catch (error) {}
			},
			handleOrderChange(event) {
				var index = Number(event.detail.value || 0);
				this.selectedOrderIndex = index;
				var selected = this.selectedOrder;
				var existing = selected ? this.myReviews.find(function(review) {
					return String(review.orderId) === String(selected.object_id);
				}) : null;
				if (existing) {
					this.startEdit(existing);
				} else {
					this.editingReviewId = '';
					this.submitRating = 5;
					this.submitContent = '';
					this.tagOptions = this.buildTagOptions(this.tagOptions.map(function(tag) { return tag.label; }), []);
				}
			},
			startEdit(review) {
				if (!review || !review.orderId) return;
				var orderIndex = this.orderOptions.findIndex(function(order) {
					return String(order.object_id) === String(review.orderId);
				});
				if (orderIndex < 0) {
					this.orderOptions.push({
						key: String(review.orderId),
						object_id: String(review.orderId),
						sceneText: review.sceneText,
						title: review.orderLabel,
						label: review.orderLabel,
					});
					orderIndex = this.orderOptions.length - 1;
				}
				this.selectedOrderIndex = orderIndex;
				this.editingReviewId = review.object_id;
				this.submitRating = review.ratingNumber;
				this.submitContent = review.contentText;
				this.tagOptions = this.buildTagOptions(this.tagOptions.map(function(tag) { return tag.label; }), review.tags);
				uni.pageScrollTo({ scrollTop: 180, duration: 220 });
			},
			toggleTag(key) {
				var selectedCount = this.tagOptions.filter(function(tag) { return tag.selected; }).length;
				this.tagOptions = this.tagOptions.map(function(tag) {
					if (tag.key !== key) return tag;
					if (!tag.selected && selectedCount >= 3) {
						uni.showToast({ title: '最多选择3个标签', icon: 'none' });
						return tag;
					}
					var nextSelected = !tag.selected;
					return {
						key: tag.key,
						label: tag.label,
						selected: nextSelected,
						className: nextSelected ? 'tag-option active' : 'tag-option',
					};
				});
			},
			async doSubmitReview() {
				if (this.submitting || !this.selectedOrder) return;
				var content = this.submitContent.trim();
				if (content.length < 4) {
					uni.showToast({ title: '请至少填写4个字', icon: 'none' });
					return;
				}
				var tags = this.tagOptions.filter(function(tag) { return tag.selected; }).map(function(tag) { return tag.label; });
				this.submitting = true;
				uni.showLoading({ title: '提交中...' });
				try {
					await this.submitReview({
						order_id: this.selectedOrder.object_id,
						rating: this.submitRating,
						content: content,
						tags: tags,
					});
					AUTH.trackEvent({
						event: 'review_submit_success',
						page_path: 'pages/my/reviews',
						source: this.editingReviewId ? 'review_edit' : 'review_new',
						order_id: this.selectedOrder.object_id,
					}).catch(function() {});
					uni.showToast({ title: this.editingReviewId ? '评价已更新' : '评价已提交', icon: 'success' });
					this.editingReviewId = '';
					this.submitContent = '';
					this.submitRating = 5;
					await this.loadReviews();
				} catch (error) {
					var message = typeof error === 'string' ? error : '提交失败，请稍后重试';
					uni.showModal({ title: '提交失败', content: message, showCancel: false });
				} finally {
					uni.hideLoading();
					this.submitting = false;
				}
			},
		},
	};
</script>

<style lang="scss">
	page { background: #F7F6F2; }

	.page-wrapper {
		min-height: 100vh;
		padding: 24rpx 24rpx 56rpx;
		box-sizing: border-box;
		color: #302E2B;
	}

	.summary-band {
		display: flex;
		align-items: center;
		gap: 30rpx;
		padding: 30rpx 4rpx 34rpx;
		border-bottom: 1rpx solid #DDD9D2;
	}

	.summary-score-block { width: 150rpx; flex-shrink: 0; }
	.summary-score { display: block; font-size: 54rpx; line-height: 1; font-weight: 800; color: #D85F32; }
	.summary-stars { display: flex; margin-top: 10rpx; }
	.summary-star { font-size: 20rpx; color: #CFC9C1; }
	.summary-star.filled { color: #D99028; }
	.summary-copy { flex: 1; min-width: 0; }
	.summary-title { display: block; font-size: 31rpx; font-weight: 800; }
	.summary-desc { display: block; margin-top: 7rpx; font-size: 23rpx; color: #716C65; }
	.summary-tags { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 14rpx; }
	.summary-tag { padding: 6rpx 12rpx; border-radius: 8rpx; background: #E8F0E7; font-size: 20rpx; color: #426246; }

	.summary-empty,
	.no-order,
	.list-empty {
		padding: 34rpx 22rpx;
		border: 1rpx dashed #CFC9C1;
		border-radius: 14rpx;
		background: #FFF;
		text-align: center;
	}
	.summary-empty { margin-bottom: 26rpx; }
	.empty-title { display: block; font-size: 27rpx; font-weight: 750; color: #3B3936; }
	.empty-desc { display: block; margin-top: 8rpx; font-size: 23rpx; line-height: 1.55; color: #817B73; }

	.compose-section,
	.my-section,
	.public-section { padding-top: 34rpx; }

	.section-heading {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 20rpx;
		margin-bottom: 18rpx;
	}
	.section-heading.compact { margin-bottom: 14rpx; }
	.section-kicker { display: block; font-size: 20rpx; font-weight: 700; color: #A64F2F; }
	.section-title { display: block; margin-top: 3rpx; font-size: 31rpx; font-weight: 800; }
	.section-note { font-size: 21rpx; color: #817B73; }

	.review-form {
		padding: 24rpx;
		border: 1rpx solid #DDD9D2;
		border-radius: 14rpx;
		background: #FFF;
	}
	.order-picker {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 18rpx;
		padding-bottom: 20rpx;
		border-bottom: 1rpx solid #ECE9E4;
	}
	.order-picker-copy { flex: 1; min-width: 0; }
	.field-label { font-size: 23rpx; font-weight: 700; color: #56514B; }
	.order-picker-value { display: block; margin-top: 7rpx; font-size: 25rpx; line-height: 1.45; color: #282623; }
	.picker-action { flex-shrink: 0; font-size: 22rpx; color: #B35431; }
	.picker-single { flex-shrink: 0; font-size: 20rpx; color: #918A82; }

	.rating-row { display: flex; align-items: center; margin-top: 22rpx; }
	.rating-stars { display: flex; gap: 8rpx; margin-left: 20rpx; }
	.rating-star { font-size: 39rpx; line-height: 1; color: #D5CFC7; }
	.rating-star.active { color: #D99028; }
	.rating-value { margin-left: auto; font-size: 23rpx; font-weight: 700; color: #A64F2F; }

	.tag-field { margin-top: 24rpx; }
	.field-heading { display: flex; align-items: center; justify-content: space-between; }
	.field-hint { font-size: 20rpx; color: #918A82; }
	.tag-options { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 13rpx; }
	.tag-option { padding: 10rpx 15rpx; border: 1rpx solid #D8D3CC; border-radius: 8rpx; font-size: 22rpx; color: #6D6760; background: #FAF9F7; }
	.tag-option.active { border-color: #69906C; color: #315A36; background: #E8F0E7; }

	.review-textarea {
		width: 100%;
		height: 190rpx;
		margin-top: 22rpx;
		padding: 18rpx;
		box-sizing: border-box;
		border: 1rpx solid #D8D3CC;
		border-radius: 10rpx;
		background: #FAF9F7;
		font-size: 26rpx;
		line-height: 1.55;
		color: #302E2B;
	}
	.char-count { display: block; margin-top: 7rpx; text-align: right; font-size: 19rpx; color: #99928A; }
	.submit-button { margin-top: 20rpx; padding: 20rpx; border-radius: 12rpx; background: #D96337; text-align: center; font-size: 27rpx; font-weight: 750; color: #FFF; }
	.submit-button.disabled { opacity: .55; }

	.login-strip {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 18rpx;
		margin-top: 28rpx;
		padding: 24rpx 4rpx;
		border-top: 1rpx solid #DDD9D2;
		border-bottom: 1rpx solid #DDD9D2;
	}
	.login-title { display: block; font-size: 27rpx; font-weight: 750; }
	.login-desc { display: block; margin-top: 5rpx; font-size: 21rpx; color: #817B73; }
	.login-action { flex-shrink: 0; font-size: 24rpx; color: #B35431; }

	.review-list { display: flex; flex-direction: column; gap: 14rpx; }
	.review-card { padding: 22rpx; border: 1rpx solid #DDD9D2; border-radius: 14rpx; background: #FFF; }
	.review-card.mine { margin-bottom: 12rpx; border-left: 5rpx solid #D96337; }
	.review-header { display: flex; align-items: center; gap: 13rpx; }
	.review-avatar { display: flex; align-items: center; justify-content: center; width: 50rpx; height: 50rpx; flex-shrink: 0; border-radius: 50%; background: #E8F0E7; font-size: 21rpx; font-weight: 800; color: #426246; }
	.review-meta { flex: 1; min-width: 0; }
	.review-name { display: block; font-size: 24rpx; font-weight: 750; color: #34312E; }
	.review-stars { display: flex; margin-top: 5rpx; }
	.star { font-size: 18rpx; color: #D5CFC7; }
	.star.filled { color: #D99028; }
	.verified-badge { flex-shrink: 0; padding: 6rpx 9rpx; border-radius: 7rpx; background: #EEF3EC; font-size: 18rpx; color: #47704C; white-space: nowrap; }
	.edit-action { flex-shrink: 0; font-size: 22rpx; color: #B35431; }
	.review-tags { display: flex; flex-wrap: wrap; gap: 8rpx; margin-top: 15rpx; }
	.review-tag { font-size: 19rpx; color: #5D785F; }
	.review-tag::before { content: '#'; }
	.review-text { display: block; margin-top: 13rpx; font-size: 25rpx; line-height: 1.6; color: #504B45; }
	.review-time { display: block; margin-top: 10rpx; font-size: 19rpx; color: #9A938B; }
	.merchant-reply { margin-top: 15rpx; padding-left: 14rpx; border-left: 4rpx solid #D7A264; }
	.reply-label { display: block; font-size: 20rpx; font-weight: 700; color: #936137; }
	.reply-text { display: block; margin-top: 5rpx; font-size: 23rpx; line-height: 1.5; color: #68615A; }
</style>
