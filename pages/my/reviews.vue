<template>
	<view class="page-wrapper">
		<!-- 我的评价状态 -->
		<view class="my-review-card" v-if="myReview">
			<view class="my-review-header">
				<text class="my-review-label">{{ myReview.user_nickname || '我' }}</text>
				<view class="review-stars">
					<text v-for="s in 5" :key="s" :class="s <= myReview.rating ? 'star filled' : 'star'">⭐</text>
				</view>
			</view>
			<text class="my-review-content">{{ myReview.content }}</text>
			<text class="my-review-time">{{ myReview.created_at }}</text>
		</view>

		<!-- 提交评价表单 -->
		<view class="submit-form">
			<view class="form-title">发表评价</view>

			<view class="rating-row">
				<text class="rating-label">评分</text>
				<view class="stars-row">
					<text
						v-for="s in 5"
						:key="s"
						class="star-btn"
						:class="s <= submitRating ? 'active' : ''"
						@tap="submitRating = s"
					>⭐</text>
				</view>
				<text class="rating-text">{{ submitRating }}星</text>
			</view>

			<textarea
				class="review-textarea"
				v-model="submitContent"
				placeholder="说说你对店铺的感受吧～"
				maxlength="500"
			></textarea>
			<text class="char-count">{{ submitContent.length }}/500</text>

			<view class="submit-btn" @tap="doSubmitReview">
				<text class="btn-text">{{ myReview ? '更新评价' : '提交评价' }}</text>
			</view>
		</view>

		<!-- 其他用户评价 -->
		<view class="other-reviews" v-if="otherReviews.length > 0">
			<view class="section-title">其他玩家的评价</view>
			<view
				class="review-card"
				v-for="(rev, idx) in otherReviews"
				:key="idx"
			>
				<view class="review-header">
					<text class="review-avatar">{{ rev.user_avatar || '😄' }}</text>
					<view class="review-meta">
						<text class="review-name">{{ rev.user_nickname }}</text>
						<view class="review-stars">
							<text v-for="s in 5" :key="s" :class="s <= rev.rating ? 'star filled' : 'star'">⭐</text>
						</view>
					</view>
				</view>
				<text class="review-text">{{ rev.content }}</text>
				<text class="review-time">{{ rev.created_at }}</text>
			</view>
		</view>
	</view>
</template>

<script>
	import { mapState, mapActions } from 'vuex';
	export default {
		computed: {
			...mapState(['hasLogin', 'userInfo', 'token'])
		},
		data() {
			return {
				myReview: null,
				otherReviews: [],
				submitRating: 5,
				submitContent: '',
			};
		},
		onLoad() {
			this.loadReviews();
		},
		methods: {
			...mapActions(['getReviewList', 'submitReview']),
			async loadReviews() {
				if (!this.hasLogin) {
					uni.showModal({ title: '提示', content: '请先登录', showCancel: false });
					return;
				}
				try {
					var list = await this.getReviewList();
					console.log('全部评价:', list);
					if (!list || list.length === 0) {
						this.myReview = null;
						this.otherReviews = [];
						return;
					}
					// 找出我的评价
					var myReviewItem = null;
					var otherList = [];
					for (var i = 0; i < list.length; i++) {
						var r = list[i];
						if (r.user_id === this.userInfo && this.userInfo.id) {
							myReviewItem = r;
						} else {
							otherList.push(r);
						}
					}
					this.myReview = myReviewItem;
					this.otherReviews = otherList;

					// 如果有我的评价，填充表单
					if (myReviewItem) {
						this.submitRating = myReviewItem.rating;
						this.submitContent = myReviewItem.content;
					}
				} catch (e) {
					console.error('加载评价失败:', e);
				}
			},
			async doSubmitReview() {
				if (!this.submitRating || this.submitRating < 1) {
					uni.showModal({ title: '提示', content: '请选择评分', showCancel: false });
					return;
				}
				if (!this.submitContent || this.submitContent.trim().length === 0) {
					uni.showModal({ title: '提示', content: '请输入评价内容', showCancel: false });
					return;
				}
				uni.showLoading({ title: '提交中...' });
				try {
					var res = await this.submitReview(this.submitRating, this.submitContent.trim());
					uni.hideLoading();
					uni.showModal({ title: '成功', content: '评价已提交！', showCancel: false });
					// 重新加载
					this.loadReviews();
				} catch (e) {
					uni.hideLoading();
					uni.showModal({ title: '失败', content: e || '提交失败', showCancel: false });
				}
			},
		},
	}
</script>

<style lang="scss">
	page {
		background: #FDF6E9;
	}
	.page-wrapper {
		padding: 24rpx;
		background: #FDF6E9;
		background-image: repeating-linear-gradient(
			0deg,
			transparent,
			transparent 3rpx,
			rgba(139, 90, 43, 0.025) 3rpx,
			rgba(139, 90, 43, 0.025) 6rpx
		);
		min-height: 100vh;
	}

	/* 我的评价 */
	.my-review-card {
		background: linear-gradient(135deg, #FFF8F0, #FFF);
		border: 2rpx solid rgba(232,120,74,0.15);
		border-radius: 28rpx;
		padding: 28rpx;
		margin-bottom: 32rpx;
		position: relative;
		box-shadow: 0 10rpx 28rpx rgba(160,120,80,0.08), 0 2rpx 6rpx rgba(160,120,80,0.04);
		&::before {
			content: '🌿';
			position: absolute;
			top: -10rpx;
			left: -6rpx;
			font-size: 28rpx;
			transform: rotate(-18deg);
			opacity: 0.45;
		}
		.my-review-header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-bottom: 12rpx;
		}
		.my-review-label { font-size: 26rpx; color: #E8784A; font-weight: bold; }
		.review-stars .star { font-size: 28rpx; }
		.review-stars .star.filled { filter: drop-shadow(0 1rpx 2rpx rgba(255,193,7,0.4)); }
		.my-review-content {
			display: block;
			font-size: 28rpx;
			color: #4A3728;
			line-height: 1.6;
			margin-bottom: 8rpx;
		}
		.my-review-time { font-size: 20rpx; color: #A08B7A; }
	}

	/* 提交表单 */
	.submit-form {
		background: #FFF;
		border-radius: 28rpx;
		padding: 28rpx;
		margin-bottom: 32rpx;
		box-shadow: 0 10rpx 28rpx rgba(160,120,80,0.08), 0 2rpx 6rpx rgba(160,120,80,0.04);
		border: 2rpx solid rgba(160,120,80,0.12);
		position: relative;
		&::after {
			content: '🍄';
			position: absolute;
			bottom: -12rpx;
			right: -8rpx;
			font-size: 32rpx;
			transform: rotate(15deg);
			opacity: 0.45;
		}
		.form-title { font-size: 30rpx; font-weight: bold; color: #4A3728; margin-bottom: 20rpx; }
	}
	.rating-row {
		display: flex;
		align-items: center;
		margin-bottom: 20rpx;
		.rating-label { font-size: 26rpx; color: #6D5A48; margin-right: 16rpx; }
		.stars-row {
			display: flex;
			gap: 8rpx;
			.star-btn { font-size: 44rpx; opacity: 0.3; transition: all 0.2s; filter: grayscale(1); }
			.star-btn.active { opacity: 1; transform: scale(1.2); filter: grayscale(0); }
		}
		.rating-text { font-size: 24rpx; color: #E8784A; margin-left: 16rpx; font-weight: bold; }
	}
	.review-textarea {
		width: 100%;
		height: 200rpx;
		background: #FDF8F0;
		border-radius: 16rpx;
		padding: 20rpx;
		font-size: 28rpx;
		color: #4A3728;
		box-sizing: border-box;
		border: 2rpx solid rgba(232,120,74,0.15);
	}
	.char-count {
		display: block;
		text-align: right;
		font-size: 20rpx;
		color: #A08B7A;
		margin-top: 8rpx;
	}
	.submit-btn {
		margin-top: 24rpx;
		background: linear-gradient(135deg, #FFB88C, #E8784A);
		border-radius: 50rpx;
		padding: 24rpx;
		text-align: center;
		box-shadow: 0 6rpx 20rpx rgba(232,120,74,0.3);
		.btn-text { color: #FFF; font-size: 30rpx; font-weight: bold; }
	}

	/* 其他评价 */
	.other-reviews {
		.section-title {
			font-size: 30rpx;
			font-weight: bold;
			color: #4A3728;
			margin-bottom: 20rpx;
		}
	}
	.review-card {
		background: #FFF;
		border-radius: 24rpx;
		padding: 24rpx;
		margin-bottom: 16rpx;
		box-shadow: 0 10rpx 28rpx rgba(160,120,80,0.08), 0 2rpx 6rpx rgba(160,120,80,0.04);
		border: 2rpx solid rgba(160,120,80,0.08);
		position: relative;
		&::before {
			content: '🌿';
			position: absolute;
			top: -8rpx;
			left: -4rpx;
			font-size: 24rpx;
			transform: rotate(-15deg);
			opacity: 0.35;
		}
		.review-header {
			display: flex;
			align-items: center;
			gap: 16rpx;
			margin-bottom: 12rpx;
		}
		.review-avatar { font-size: 48rpx; }
		.review-meta { flex: 1; }
		.review-name { display: block; font-size: 26rpx; font-weight: bold; color: #4A3728; margin-bottom: 4rpx; }
		.review-stars .star { font-size: 20rpx; }
		.review-stars .star.filled { filter: drop-shadow(0 1rpx 2rpx rgba(255,193,7,0.4)); }
		.review-text { display: block; font-size: 26rpx; color: #6D5A48; line-height: 1.6; }
		.review-time { display: block; font-size: 20rpx; color: #A08B7A; margin-top: 8rpx; }
	}
</style>
