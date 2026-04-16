<template>
	<view class="page-wrapper">
		<view class="page-header">
			<text class="header-title">我的评价</text>
		</view>

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
	background: #FFF9F5;
}
.page-wrapper {
	padding: 24rpx;
}
.page-header {
	text-align: center;
	padding: 24rpx 0 32rpx;
	.header-title { font-size: 36rpx; font-weight: bold; color: #333; }
}

/* 我的评价 */
.my-review-card {
	background: linear-gradient(135deg, #FFF5F8, #FFF);
	border: 2rpx solid #FFE5EE;
	border-radius: 28rpx;
	padding: 28rpx;
	margin-bottom: 32rpx;
	.my-review-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 12rpx;
	}
	.my-review-label { font-size: 26rpx; color: #FF6B9D; font-weight: bold; }
	.review-stars .star { font-size: 28rpx; }
	.my-review-content {
		display: block;
		font-size: 28rpx;
		color: #333;
		line-height: 1.6;
		margin-bottom: 8rpx;
	}
	.my-review-time { font-size: 20rpx; color: #AAA; }
}

/* 提交表单 */
.submit-form {
	background: #FFF;
	border-radius: 28rpx;
	padding: 28rpx;
	margin-bottom: 32rpx;
	box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
	.form-title { font-size: 30rpx; font-weight: bold; color: #333; margin-bottom: 20rpx; }
}
.rating-row {
	display: flex;
	align-items: center;
	margin-bottom: 20rpx;
	.rating-label { font-size: 26rpx; color: #666; margin-right: 16rpx; }
	.stars-row {
		display: flex;
		gap: 8rpx;
		.star-btn { font-size: 44rpx; opacity: 0.3; transition: all 0.2s; }
		.star-btn.active { opacity: 1; transform: scale(1.2); }
	}
	.rating-text { font-size: 24rpx; color: #FF6B9D; margin-left: 16rpx; }
}
.review-textarea {
	width: 100%;
	height: 200rpx;
	background: #FFF9F5;
	border-radius: 16rpx;
	padding: 20rpx;
	font-size: 28rpx;
	color: #333;
	box-sizing: border-box;
	border: 2rpx solid #FFE5EE;
}
.char-count {
	display: block;
	text-align: right;
	font-size: 20rpx;
	color: #AAA;
	margin-top: 8rpx;
}
.submit-btn {
	margin-top: 24rpx;
	background: linear-gradient(135deg, #FF9ECD, #FF6B9D);
	border-radius: 50rpx;
	padding: 24rpx;
	text-align: center;
	box-shadow: 0 6rpx 20rpx rgba(255,107,157,0.3);
	.btn-text { color: #FFF; font-size: 30rpx; font-weight: bold; }
}

/* 其他评价 */
.other-reviews {
	.section-title {
		font-size: 30rpx;
		font-weight: bold;
		color: #333;
		margin-bottom: 20rpx;
	}
}
.review-card {
	background: #FFF;
	border-radius: 24rpx;
	padding: 24rpx;
	margin-bottom: 16rpx;
	box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
	.review-header {
		display: flex;
		align-items: center;
		gap: 16rpx;
		margin-bottom: 12rpx;
	}
	.review-avatar { font-size: 48rpx; }
	.review-meta { flex: 1; }
	.review-name { display: block; font-size: 26rpx; font-weight: bold; color: #333; margin-bottom: 4rpx; }
	.review-stars .star { font-size: 20rpx; }
	.review-text { display: block; font-size: 26rpx; color: #666; line-height: 1.6; }
	.review-time { display: block; font-size: 20rpx; color: #AAA; margin-top: 8rpx; }
}
</style>
