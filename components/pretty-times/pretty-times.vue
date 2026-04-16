<template>
	<view class="content">
		<view class="container">
			<!-- 日期列表 -->
			<scroll-view class="date-scroll" scroll-x>
				<view class="date-inner">
					<view
						v-for="(item,index) in dateArr"
						:key="index"
						class="date-pill"
						:class="{ active: index == dateActive, today: isToday(item.date) }"
						@click="selectDateEvent(index,item)"
					>
						<text class="pill-week">{{item.week}}</text>
						<text class="pill-date">{{item.date.split('-')[2]}}</text>
						<view class="pill-dot" v-if="isToday(item.date)"></view>
					</view>
				</view>
			</scroll-view>

			<!-- 时段标签 -->
			<view class="time-header">
				<text class="time-hint">点击时段可多选，确认后进入下单</text>
			</view>

			<!-- 时间选项 -->
			<view class="time-grid" v-if="isQuantum || isMultiple">
				<view
					v-for="(item,_index) in timeArr"
					:key="_index"
					class="time-cell"
					:class="{
						disable: item.disable,
						active: item.isActive,
						selected: item.isActive
					}"
					@click="handleSelect(_index,item)"
				>
					<text class="cell-time">{{item.begin}}~{{item.end}}</text>
					<text class="cell-status">{{item.disable ? disableText : (item.isActive ? '已选' : '可约')}}</text>
					<view class="cell-check" v-if="item.isActive">
						<text>✓</text>
					</view>
				</view>
			</view>

			<!-- 单选时间段 -->
			<view class="time-grid" v-else>
				<view
					v-for="(item,_index) in timeArr"
					:key="_index"
					class="time-cell single"
					:class="{
						disable: item.disable,
						active: _index == timeActive
					}"
					@click="selectTimeEvent(_index,item)"
				>
					<text class="cell-time">{{item.time}}</text>
					<text class="cell-status">{{item.disable ? disableText : '可预约'}}</text>
				</view>
			</view>
		</view>

		<!-- 底部栏 -->
		<view class="bottom-bar">
			<view class="selected-info" v-if="isMultiple">
				<text class="info-label">已选时段</text>
				<text class="info-count" v-if="selectedCount > 0">{{ selectedCount }} 个时段</text>
				<text class="info-count zero" v-else>请选择预约时段</text>
			</view>
			<view class="selected-info" v-else>
				<text class="info-label">预约时间</text>
				<text class="info-time">{{ orderDateTime }}</text>
			</view>
			<view
				class="submit-btn"
				:class="canSubmit ? 'ready' : ''"
				@click="handleSubmit"
			>
				<text>确认预约</text>
			</view>
		</view>
	</view>
</template>

<script>
	import { initData, initTime, currentTime } from '../utils/date.js';
	export default {
		name: 'times',
		model: { prop: "showPop", event: "change" },
		props: {
			isQuantum: { type: Boolean, default: false },
			isMultiple: { type: Boolean, default: false },
			isSection: { type: Boolean, default: false },
			disableText: { type: String, default: "已约满" },
			undisableText: { type: String, default: "可预约" },
			timeInterval: { type: Number, default: 1 },
			selectedTabColor: { type: String, default: "#FF6432" },
			selectedItemColor: { type: String, default: "#FF6432" },
			selectedDate: { type: String, default: "" },
			beginTime: { type: String, default: "09:00:00" },
			endTime: { type: String, default: "22:00:00" },
			appointTime: { type: Array, default: () => [] },
			disableTimeSlot: { type: Array, default: () => [] }
		},
		watch: {
			appointTime: { handler() { this.initOnload(); } },
			selectedDate: { handler(val) { if (val) { this.selectDate = val; this.dateActive = this.getCurrentSelectDateIndex(); this.orderTimeArr = {}; this.initOnload(); } } },
			beginTime: { handler() { this.initOnload(); } },
			endTime: { handler() { this.initOnload(); } },
			disableTimeSlot: { handler() { this.initOnload(); } }
		},
		data() {
			return {
				orderDateTime: '请选择时段',
				orderTimeArr: {},
				dateArr: [],
				timeArr: [],
				nowDate: "",
				dateActive: 0,
				timeActive: 0,
				timeQuanBeginIndex: 0,
				selectDate: "",
				timeQuanBegin: "",
				timeQuanEnd: "",
			};
		},
		created() {
			// 优先使用传入的 selectedDate prop，没有则用今天
			const today = currentTime().date;
			this.selectDate = this.selectedDate || today;
			this.nowDate = today;
			this.initOnload();
		},
		computed: {
			selectedCount() {
				let count = 0;
				for (const date in this.orderTimeArr) {
					count += this.orderTimeArr[date].length;
				}
				return count;
			},
			canSubmit() {
				if (this.isMultiple) return this.selectedCount > 0;
				if (this.isSection) return this.timeQuanBegin && this.timeQuanEnd;
				return this.timeActive >= 0 && this.timeArr[this.timeActive] && !this.timeArr[this.timeActive].disable;
			}
		},
		methods: {
			isToday(dateStr) {
				return dateStr === this.nowDate;
			},
			initOnload() {
				// 保存当前日期的已选时段（initOnload 可能被 watcher 多次触发，不能丢失用户选择）
				const prevSelected = this.orderTimeArr[this.selectDate] || [];

				this.dateArr = initData();
				this.timeArr = initTime(this.beginTime, this.endTime, this.timeInterval, this.isQuantum);
				this.timeQuanBegin = this.timeQuanEnd = "";

				let isFullTime = true;
				const nowTime = currentTime().time;
				const nowDate = currentTime().date;

				this.timeArr.forEach((item, index) => {
					if (this.isQuantum) {
						const cur_be_time = this.selectDate + ' ' + item.begin;
						const cur_end_time = this.selectDate + ' ' + item.end;
						for (const time of this.disableTimeSlot) {
							const [begin_time = "", end_time = ""] = time;
							if (begin_time && end_time && begin_time <= cur_be_time && cur_end_time <= end_time) {
								item.disable = true;
							}
						}
						// past hour
						if (this.selectDate == nowDate && nowTime >= item.begin + ':00') {
							item.disable = true;
						}
						if (!item.disable) isFullTime = false;
						// 恢复之前已选的时段：比对 begin~end 是否在 prevSelected 中
						const slotKey = this.selectDate + ' ' + item.begin + ':00';
						item.isActive = prevSelected.some(s => s[0] === slotKey);
					} else {
						if (this.selectDate == nowDate && nowTime >= item.time) {
							item.disable = true;
						}
						this.appointTime.forEach(t => {
							const [date, time] = t.split(' ');
							if (date == this.selectDate && item.time == time) {
								item.disable = true;
							}
						});
						const cur_time = this.selectDate + ' ' + item.time;
						for (const time of this.disableTimeSlot) {
							const [begin_time = "", end_time = ""] = time;
							if (begin_time && end_time && begin_time <= cur_time && cur_time <= end_time) {
								item.disable = true;
							}
						}
						if (!item.disable) isFullTime = false;
						item.isActive = !!(this.isMultiple && (this.orderTimeArr[this.selectDate] || []).includes(item.time));
					}
				});

				this.orderDateTime = isFullTime ? '请选择时段' : this.selectDate;
				this.timeActive = -1;
				for (let i = 0; i < this.timeArr.length; i++) {
					if (!this.timeArr[i].disable) {
						this.orderDateTime = this.selectDate + ' ' + this.timeArr[i].time;
						this.timeActive = i;
						break;
					}
				}
			},

			selectDateEvent(index, item) {
				this.dateActive = index;
				this.selectDate = item.date;
				this.initOnload();
				this.orderTimeArr = {};
				this.$emit('selected-date-change', item.date);
			},

			getCurrentSelectDateIndex() {
				for (let i = 0; i < this.dateArr.length; i++) {
					if (this.dateArr[i].date == this.selectDate) return i;
				}
				return 0;
			},

			selectTimeEvent(index, item) {
				if (this.isQuantum) { this.handleSelect(index, item); return; }
				if (item.disable) return;
				if (this.isMultiple) {
					item.isActive = !item.isActive;
					this.timeArr = this.timeArr.slice();
					this.orderTimeArr[this.selectDate] = this.timeArr.reduce((prev, cur) => {
						cur.isActive && prev.push(cur.time);
						return prev;
					}, []);
				} else {
					this.timeActive = index;
					this.orderDateTime = this.selectDate + ' ' + item.time;
				}
			},

			handleSelect(index, item) {
				if (item.disable) return;
				if (this.isMultiple) {
					item.isActive = !item.isActive;
					this.$set(this.timeArr[index], 'isActive', item.isActive);
					this.timeArr = [...this.timeArr];
					const selected = this.timeArr.filter(cur => cur.isActive).map(cur => {
						return [this.selectDate + ' ' + cur.begin + ':00', this.selectDate + ' ' + cur.end + ':00'];
					});
					this.$set(this.orderTimeArr, this.selectDate, selected);
					this.$nextTick(() => {
						this.$forceUpdate();
					});
				} else {
					this.timeActive = index;
					this.orderDateTime = { begin: this.selectDate + ' ' + item.begin + ':00', end: this.selectDate + ' ' + item.end + ':00' };
				}
			},

			handleSection(index, item) {
				if (item.disable) return;
				if (!this.timeQuanBegin) {
					this.timeQuanBeginIndex = index;
					this.timeQuanBegin = item.time;
					this.timeQuanEnd = "";
					return;
				}
				if (!this.timeQuanEnd && this.timeQuanBegin) {
					let isDisable = false;
					let start = this.timeQuanBeginIndex;
					let end = index;
					if (start > end) [start, end] = [end, start];
					for (let i = start + 1; i < end; i++) {
						if (this.timeArr[i].disable) { isDisable = true; break; }
					}
					if (isDisable) {
						this.timeQuanBeginIndex = index;
						this.timeQuanBegin = item.time;
						this.timeQuanEnd = "";
						return;
					}
					for (let i = start + 1; i < end; i++) { this.timeArr[i].isInclude = true; }
					this.timeQuanEnd = item.time;
					return;
				}
				if (this.timeQuanBegin && this.timeQuanEnd) {
					this.timeArr.forEach(t => { t.isInclude = false; });
					this.timeQuanBeginIndex = index;
					this.timeQuanBegin = item.time;
					this.timeQuanEnd = "";
				}
			},

			handleChange() {
				if (this.timeQuanBegin > this.timeQuanEnd) {
					[this.timeQuanBegin, this.timeQuanEnd] = [this.timeQuanEnd, this.timeQuanBegin];
				}
			},

			handleSubmit() {
				if (!this.canSubmit) return;
				if (this.isSection) {
					this.handleChange();
					this.$emit('change', { beginTime: this.selectDate + ' ' + this.timeQuanBegin, endTime: this.selectDate + ' ' + this.timeQuanEnd });
					return;
				}
				if (this.isMultiple) {
					let time = [];
					for (const date in this.orderTimeArr) {
						this.orderTimeArr[date].forEach(item => {
							this.isQuantum ? time.push({ date, item }) : time.push({ date, item: date + ' ' + item });
						});
					}
					this.$emit('change', time);
				} else {
					this.$emit('change', this.orderDateTime);
				}
			}
		}
	};
</script>

<style lang="scss" scoped>
$primary: #FF6432;
$green: #34C759;
$gold: #FFB933;
$red: #FF3B30;
$gray: #999;
$dark: #333;
$light: #F5F6F7;
$border: #EEEEEE;

page { height: 100%; }

.content {
	height: 100%;
	display: flex;
	flex-direction: column;
	background: #fff;
}

// 日期横向滚动
.date-scroll {
	width: 100%;
	white-space: nowrap;
	background: #fff;
	padding: 20rpx 0 0;

	.date-inner {
		display: inline-flex;
		padding: 0 16rpx;
	}
}

.date-pill {
	display: inline-flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	width: 88rpx;
	height: 120rpx;
	border-radius: 20rpx;
	margin: 0 8rpx;
	background: #F5F6F7;
	position: relative;
	transition: all 0.2s;

	&.active {
		background: $primary;
		.pill-week, .pill-date { color: #fff; }
		.pill-dot { background: #fff; }
	}

	&.today:not(.active) {
		.pill-date { color: $primary; font-weight: bold; }
	}

	.pill-week {
		font-size: 20rpx;
		color: $gray;
		margin-bottom: 6rpx;
	}

	.pill-date {
		font-size: 36rpx;
		font-weight: bold;
		color: $dark;
	}

	.pill-dot {
		width: 8rpx;
		height: 8rpx;
		border-radius: 50%;
		background: $primary;
		position: absolute;
		bottom: 14rpx;
	}
}

// 时段提示
.time-header {
	padding: 16rpx 30rpx 8rpx;
	.time-hint {
		font-size: 22rpx;
		color: $gray;
	}
}

// 时间网格
.time-grid {
	padding: 12rpx 20rpx 20rpx;
	display: flex;
	flex-wrap: wrap;
	gap: 16rpx;
}

.time-cell {
	width: calc(25% - 12rpx);
	border-radius: 16rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 20rpx 8rpx;
	background: #FAFAFA;
	border: 2rpx solid transparent;
	position: relative;
	transition: all 0.2s;
	min-height: 130rpx;

	.cell-time {
		font-size: 26rpx;
		font-weight: bold;
		color: $dark;
		margin-bottom: 6rpx;
	}

	.cell-status {
		font-size: 20rpx;
		color: $gray;
	}

	// 已约满
	&.disable {
		background: #F2F2F2;
		border-color: #E0E0E0;
		opacity: 0.65;
		.cell-time {
			color: #AAA;
		}
		.cell-status { color: #BBB; }
	}

	// 选中态（多选/量子）
	&.active, &.selected {
		background: #FFF0EB;
		border-color: $primary;
		.cell-time { color: $primary; }
		.cell-status { color: $primary; }
	}

	// 单选激活
	&.single.active {
		background: $primary;
		border-color: $primary;
		.cell-time, .cell-status { color: #fff; }
	}

	// 多选打勾
	.cell-check {
		position: absolute;
		top: 8rpx;
		right: 8rpx;
		width: 32rpx;
		height: 32rpx;
		border-radius: 50%;
		background: $primary;
		color: #fff;
		font-size: 20rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}
}

// 底部栏
.bottom-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 20rpx 30rpx;
	padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
	background: #fff;
	border-top: 1rpx solid $border;
	box-shadow: 0 -2rpx 12rpx rgba(0,0,0,0.04);

	.selected-info {
		flex: 1;
		display: flex;
		flex-direction: column;

		.info-label {
			font-size: 22rpx;
			color: $gray;
			margin-bottom: 4rpx;
		}

		.info-count {
			font-size: 28rpx;
			font-weight: bold;
			color: $primary;
			&.zero { color: $gray; font-weight: normal; }
		}

		.info-time {
			font-size: 28rpx;
			font-weight: bold;
			color: $dark;
		}
	}

	.submit-btn {
		width: 220rpx;
		height: 80rpx;
		background: #CCC;
		border-radius: 40rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 30rpx;
		font-weight: bold;
		color: #fff;
		transition: background 0.2s;

		&.ready {
			background: $primary;
		}
	}
}
</style>
