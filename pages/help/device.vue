<template>
	<view class="device-help-page">
		<view class="hero-band">
			<view class="hero-main">
				<text class="hero-kicker">店内通用</text>
				<text class="hero-title">设备帮助</text>
				<text class="hero-desc">没有画面、没声音、手柄连不上，先按顺序排查。</text>
			</view>
		</view>

		<scroll-view scroll-x class="device-tabs" :show-scrollbar="false">
			<view class="tab-row">
				<view
					v-for="tab in deviceTabs"
					:key="tab.key"
					class="device-tab"
					:class="{ active: activeDevice === tab.key }"
					@tap="selectDevice(tab.key)"
				>
					<text class="tab-icon">{{ tab.icon }}</text>
					<text class="tab-label">{{ tab.label }}</text>
				</view>
			</view>
		</scroll-view>

		<view class="quick-panel">
			<view class="section-heading">
				<text class="section-title">先试这三步</text>
				<text class="section-note">通常 30 秒内能定位问题</text>
			</view>
			<view class="quick-grid">
				<view class="quick-step" v-for="step in quickSteps" :key="step.mark">
					<text class="quick-mark">{{ step.mark }}</text>
					<view class="quick-copy">
						<text class="quick-title">{{ step.title }}</text>
						<text class="quick-desc">{{ step.desc }}</text>
					</view>
				</view>
			</view>
		</view>

		<view class="guide-panel">
			<view class="guide-header">
				<view>
					<text class="guide-title">{{ activeGuide.title }}</text>
					<text class="guide-subtitle">{{ activeGuide.subtitle }}</text>
				</view>
				<text class="guide-pill">{{ activeGuide.time }}</text>
			</view>

			<view class="guide-steps">
				<view class="guide-step" v-for="item in activeGuide.steps" :key="item.title">
					<text class="step-dot">{{ item.no }}</text>
					<view class="step-copy">
						<text class="step-title">{{ item.title }}</text>
						<text class="step-desc">{{ item.desc }}</text>
					</view>
				</view>
			</view>
		</view>

		<view class="ps5-panel" v-if="activeDevice === 'ps5'">
			<view class="section-heading">
				<text class="section-title">光盘怎么放</text>
				<text class="section-note">竖放时最容易放反</text>
			</view>

			<view class="ps5-disc-demo">
				<view class="ps5-console">
					<view class="ps5-black-core"></view>
					<view class="ps5-disc-slot"></view>
					<text class="ps5-slot-label">光驱口</text>
				</view>
				<view class="disc-face">
					<text class="disc-label">标签面</text>
				</view>
				<text class="disc-arrow">朝左插入</text>
			</view>

			<view class="tip-list">
				<view class="tip-row" v-for="tip in ps5DiscTips" :key="tip.title">
					<text class="tip-dot">{{ tip.no }}</text>
					<view class="tip-copy">
						<text class="tip-title">{{ tip.title }}</text>
						<text class="tip-desc">{{ tip.desc }}</text>
					</view>
				</view>
			</view>
		</view>

		<view class="switch-panel" v-if="activeDevice === 'switch'">
			<view class="section-heading">
				<text class="section-title">手柄怎么拿</text>
				<text class="section-note">重点分清 L/R 和 SL/SR</text>
			</view>

			<view class="grip-card">
				<view class="controller-demo dual-demo">
					<view class="joycon joycon-left">
						<text class="top-key">L</text>
						<view class="stick"></view>
						<view class="button-grid small-grid"></view>
					</view>
					<view class="grip-core">
						<text class="grip-core-text">合体</text>
					</view>
					<view class="joycon joycon-right">
						<text class="top-key">R</text>
						<view class="button-grid"></view>
						<view class="stick bottom-stick"></view>
					</view>
				</view>
				<text class="grip-title">竖握 / 合体：两个 Joy-Con 当一个手柄</text>
				<text class="grip-desc">进入“更改握法/顺序”后，按左手柄顶部 L + 右手柄顶部 R。适合单人完整操作。</text>
			</view>

			<view class="grip-card">
				<view class="controller-demo horizontal-demo">
					<view class="joycon joycon-horizontal">
						<text class="rail-key rail-key-left">SL</text>
						<text class="rail-key rail-key-right">SR</text>
						<view class="stick horizontal-stick"></view>
						<view class="button-grid horizontal-buttons"></view>
					</view>
				</view>
				<text class="grip-title">横握：一个 Joy-Con 当一个手柄</text>
				<text class="grip-desc">横着拿时不要找 L/R，配对按侧边轨道上的 SL + SR。适合双人小游戏、马里奥赛车这类玩法。</text>
			</view>

			<view class="tip-list">
				<view class="tip-row" v-for="tip in switchGripTips" :key="tip.title">
					<text class="tip-dot">{{ tip.no }}</text>
					<view class="tip-copy">
						<text class="tip-title">{{ tip.title }}</text>
						<text class="tip-desc">{{ tip.desc }}</text>
					</view>
				</view>
			</view>
		</view>

		<view class="switch-panel" v-if="activeDevice === 'switch'">
			<view class="section-heading">
				<text class="section-title">换游戏卡</text>
				<text class="section-note">先退到主页再换</text>
			</view>

			<view class="card-slot-demo">
				<view class="switch-console">
					<text class="slot-label">顶部右侧卡槽</text>
					<view class="game-slot"></view>
					<view class="screen-outline">
						<text class="screen-text">HOME</text>
					</view>
				</view>
				<view class="game-card">
					<text class="game-card-label">标签朝屏幕方向</text>
				</view>
			</view>

			<view class="tip-list card-steps">
				<view class="tip-row" v-for="step in switchCardSteps" :key="step.title">
					<text class="tip-dot">{{ step.no }}</text>
					<view class="tip-copy">
						<text class="tip-title">{{ step.title }}</text>
						<text class="tip-desc">{{ step.desc }}</text>
					</view>
				</view>
			</view>
		</view>

		<view class="issue-panel">
			<view class="section-heading">
				<text class="section-title">常见问题</text>
				<text class="section-note">按现象查</text>
			</view>
			<view class="issue-list">
				<view class="issue-item" v-for="issue in commonIssues" :key="issue.title">
					<text class="issue-icon">{{ issue.icon }}</text>
					<view class="issue-copy">
						<text class="issue-title">{{ issue.title }}</text>
						<text class="issue-desc">{{ issue.desc }}</text>
					</view>
				</view>
			</view>
		</view>

		<view class="support-panel">
			<view class="support-copy">
				<text class="support-title">还是不行？</text>
				<text class="support-desc">不要硬拔线，直接联系店员处理。</text>
			</view>
			<button class="support-button" open-type="contact" @tap="showDeskTip">联系店员</button>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				activeDevice: 'quick',
				deviceTabs: [
					{ key: 'quick', label: '快速', icon: '⚡' },
					{ key: 'ps5', label: 'PS5', icon: '🎮' },
					{ key: 'switch', label: 'Switch', icon: '🕹️' },
					{ key: 'xiaomi', label: '小米电视', icon: '📺' }
				],
				quickSteps: [
					{ mark: '1', title: '看电源', desc: '小米电视、PS5 或 Switch 先确认已经亮灯。' },
					{ mark: '2', title: '换信号源', desc: '小米电视遥控器按输入源，切到 HDMI1 或 HDMI2。' },
					{ mark: '3', title: '连手柄', desc: 'PS5 按 PS 键，Switch 按 HOME 键，没反应用线连接。' }
				],
				guides: {
					quick: {
						title: '快速排查',
						subtitle: '适合不知道哪里出问题时先看',
						time: '30秒',
						steps: [
							{ no: '01', title: '屏幕显示“无信号”', desc: '先用小米电视遥控器切输入源，依次试 HDMI1、HDMI2。' },
							{ no: '02', title: '主机没画面', desc: 'PS5 看电源灯，Switch 确认主机已经放到底座里。' },
							{ no: '03', title: '有画面没声音', desc: '先调小米电视音量，再看游戏内声音是否被关闭。' },
							{ no: '04', title: '手柄没有反应', desc: 'PS5 用 USB 线连主机再按 PS 键，Switch 按 HOME 键唤醒。' }
						]
					},
					ps5: {
						title: 'PS5 启动',
						subtitle: '开机、切 HDMI、连接手柄',
						time: '1分钟',
						steps: [
							{ no: '01', title: '打开小米电视', desc: '先确认电视已经开机，能看到主页或无信号提示。' },
							{ no: '02', title: '切到 PS5 输入源', desc: '遥控器按输入源，选择连接 PS5 的 HDMI。' },
							{ no: '03', title: '启动 PS5', desc: '按主机电源键，听到提示音后等待白灯常亮。' },
							{ no: '04', title: '连接手柄', desc: '按手柄 PS 键；没反应用 USB 线连接主机后再按。' },
							{ no: '05', title: '放入光盘', desc: 'PS5 竖放时，光盘标签面朝左，亮面朝右。' }
						]
					},
					switch: {
						title: 'Switch 启动',
						subtitle: '底座、输入源、手柄和卡带',
						time: '1分钟',
						steps: [
							{ no: '01', title: '确认主机在底座', desc: 'Switch 插回底座，底座和电源线不要移动。' },
							{ no: '02', title: '切到 Switch 输入源', desc: '小米电视遥控器按输入源，选择连接 Switch 的 HDMI。' },
							{ no: '03', title: '唤醒主机', desc: '按手柄 HOME 键，屏幕出现主页后选择游戏。' },
							{ no: '04', title: '连接手柄', desc: '两个手柄合体按 L+R；单个手柄横握按侧边 SL+SR。' }
						]
					},
					xiaomi: {
						title: '小米电视',
						subtitle: '输入源、音量和遥控器',
						time: '45秒',
						steps: [
							{ no: '01', title: '打开电视', desc: '按遥控器电源键，等待主页、输入源或无信号提示出现。' },
							{ no: '02', title: '找到输入源', desc: '按输入源键；如果没看到，按主页键回桌面后找输入源。' },
							{ no: '03', title: '选择 HDMI', desc: 'PS5 和 Switch 通常在 HDMI1、HDMI2，不确定就依次试。' },
							{ no: '04', title: '调整音量', desc: '先用电视遥控器把音量调到 20-30，再进入游戏。' }
						]
					}
				},
				commonIssues: [
					{ icon: '📺', title: '无信号', desc: '切小米电视输入源，依次试 HDMI1、HDMI2。' },
					{ icon: '💿', title: 'PS5 不读盘', desc: '竖放时先检查光盘有没有放反，标签面应朝左。' },
					{ icon: '🎮', title: 'PS5 手柄连不上', desc: '用 USB 线连接主机，再按手柄 PS 键。' },
					{ icon: '🕹️', title: 'Switch 手柄连不上', desc: '按 HOME 键唤醒，多人模式里按 L+R 重新排序。' },
					{ icon: '🔇', title: '没声音', desc: '先调小米电视音量，再检查游戏内声音设置。' }
				],
				ps5DiscTips: [
					{ no: '1', title: '标签面朝左', desc: '主机竖放时，能看到游戏封面的那一面朝左，亮面朝右。' },
					{ no: '2', title: '不要硬塞', desc: '方向不对或卡住时先拿出来，换方向再轻轻推入。' },
					{ no: '3', title: '读不出来先退盘', desc: '退出光盘后检查正反面和盘面污渍，再重新放入。' }
				],
				switchGripTips: [
					{ no: '1', title: '装回主机或手柄架', desc: '左手柄是 - 号，右手柄是 + 号，从上往下滑到听见咔哒声。' },
					{ no: '2', title: '拆下来不要硬掰', desc: '按住 Joy-Con 背面的圆形释放键，再沿轨道往上滑出。' },
					{ no: '3', title: '横握时看侧边', desc: '横握露出来的是 SL/SR 两个小键，游戏要求双人时通常按这两个。' }
				],
				switchCardSteps: [
					{ no: '1', title: '先回 HOME 菜单', desc: '正在游戏时先关闭软件，再换卡；不要在游戏运行中拔卡。' },
					{ no: '2', title: '打开顶部右侧卡槽盖', desc: '轻轻掀开小盖子，不要用尖物撬。' },
					{ no: '3', title: '取出旧卡', desc: '轻按卡带，听到咔哒后松手，卡会弹出一截。' },
					{ no: '4', title: '插入新卡', desc: '卡带标签朝屏幕同一方向，轻推到咔哒固定；卡住就拿出来换方向。' },
					{ no: '5', title: '收好卡带', desc: '换下来的卡马上放回游戏盒，别放桌面，避免丢失或进水。' }
				]
			};
		},
		computed: {
			activeGuide() {
				return this.guides[this.activeDevice] || this.guides.quick;
			}
		},
		methods: {
			selectDevice(key) {
				if (this.guides[key]) {
					this.activeDevice = key;
				}
			},
			showDeskTip() {
				uni.showToast({
					title: '也可以直接到前台处理',
					icon: 'none'
				});
			}
		}
	};
</script>

<style lang="scss" scoped>
	.device-help-page {
		min-height: 100vh;
		background: #F6F7F8;
		padding-bottom: calc(40rpx + env(safe-area-inset-bottom));
		color: #263238;
	}

	.hero-band {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 24rpx;
		padding: 44rpx 28rpx 36rpx;
		background: linear-gradient(135deg, #263238 0%, #304047 58%, #3B4A4F 100%);
		color: #FFFFFF;
	}

	.hero-main {
		flex: 1;
		min-width: 0;
	}

	.hero-kicker,
	.hero-title,
	.hero-desc,
	.section-title,
	.section-note,
	.quick-title,
	.quick-desc,
	.guide-title,
	.guide-subtitle,
	.step-title,
	.step-desc,
	.issue-title,
	.issue-desc,
	.support-title,
	.support-desc {
		display: block;
	}

	.hero-kicker {
		font-size: 24rpx;
		color: rgba(255, 255, 255, 0.72);
		margin-bottom: 10rpx;
	}

	.hero-title {
		font-size: 44rpx;
		font-weight: 700;
		line-height: 1.18;
		letter-spacing: 0;
	}

	.hero-desc {
		margin-top: 14rpx;
		font-size: 26rpx;
		line-height: 1.45;
		color: rgba(255, 255, 255, 0.82);
	}

	.device-tabs {
		background: #FFFFFF;
		border-bottom: 1rpx solid #E8ECEF;
		white-space: nowrap;
	}

	.tab-row {
		display: inline-flex;
		padding: 18rpx 20rpx;
		gap: 12rpx;
	}

	.device-tab {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 68rpx;
		min-width: 132rpx;
		padding: 0 18rpx;
		border-radius: 14rpx;
		background: #F2F4F5;
		color: #53616A;
		font-size: 24rpx;
		box-sizing: border-box;
	}

	.device-tab.active {
		background: #FF8C42;
		color: #FFFFFF;
		font-weight: 700;
		box-shadow: 0 8rpx 18rpx rgba(255, 140, 66, 0.24);
	}

	.tab-icon {
		margin-right: 8rpx;
		font-size: 26rpx;
	}

	.quick-panel,
	.guide-panel,
	.switch-panel,
	.issue-panel,
	.support-panel {
		margin: 22rpx 24rpx 0;
		padding: 24rpx;
		border-radius: 16rpx;
		background: #FFFFFF;
		border: 1rpx solid #E7EBEE;
	}

	.section-heading,
	.guide-header,
	.support-panel {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20rpx;
	}

	.section-title,
	.guide-title {
		font-size: 30rpx;
		font-weight: 700;
		color: #263238;
		line-height: 1.25;
	}

	.section-note,
	.guide-subtitle {
		margin-top: 6rpx;
		font-size: 23rpx;
		color: #7A858C;
		line-height: 1.35;
	}

	.quick-grid {
		display: flex;
		flex-direction: column;
		gap: 14rpx;
		margin-top: 22rpx;
	}

	.quick-step {
		display: flex;
		align-items: center;
		min-height: 92rpx;
		padding: 16rpx;
		border-radius: 14rpx;
		background: #F8FAFB;
		box-sizing: border-box;
	}

	.quick-mark {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 52rpx;
		height: 52rpx;
		border-radius: 50%;
		background: #E8F4EF;
		color: #14885B;
		font-size: 25rpx;
		font-weight: 700;
		margin-right: 16rpx;
		flex-shrink: 0;
	}

	.quick-copy,
	.step-copy,
	.issue-copy,
	.support-copy {
		flex: 1;
		min-width: 0;
	}

	.quick-title,
	.step-title,
	.issue-title,
	.support-title {
		font-size: 27rpx;
		font-weight: 700;
		color: #263238;
		line-height: 1.3;
	}

	.quick-desc,
	.step-desc,
	.issue-desc,
	.support-desc {
		margin-top: 6rpx;
		font-size: 24rpx;
		color: #6F7B83;
		line-height: 1.45;
	}

	.guide-pill {
		flex-shrink: 0;
		padding: 8rpx 14rpx;
		border-radius: 999rpx;
		background: #EAF2FF;
		color: #2F6FCC;
		font-size: 22rpx;
		font-weight: 700;
	}

	.guide-steps,
	.issue-list {
		margin-top: 22rpx;
	}

	.guide-step {
		display: flex;
		padding: 20rpx 0;
		border-top: 1rpx solid #EEF1F3;
	}

	.guide-step:first-child {
		border-top: none;
		padding-top: 0;
	}

	.guide-step:last-child {
		padding-bottom: 0;
	}

	.step-dot {
		width: 54rpx;
		color: #FF8C42;
		font-size: 22rpx;
		font-weight: 800;
		line-height: 36rpx;
		flex-shrink: 0;
	}

	.issue-item {
		display: flex;
		align-items: flex-start;
		padding: 18rpx 0;
		border-top: 1rpx solid #EEF1F3;
	}

	.issue-item:first-child {
		border-top: none;
		padding-top: 0;
	}

	.issue-item:last-child {
		padding-bottom: 0;
	}

	.ps5-disc-demo {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 260rpx;
		margin-top: 20rpx;
		padding: 20rpx 12rpx;
		border-radius: 14rpx;
		background: #F8FAFB;
		border: 1rpx solid #E8EEF2;
		box-sizing: border-box;
	}

	.ps5-console {
		position: relative;
		width: 112rpx;
		height: 220rpx;
		border-radius: 54rpx 28rpx 28rpx 54rpx;
		background: #FFFFFF;
		border: 4rpx solid #263238;
		box-sizing: border-box;
	}

	.ps5-black-core {
		position: absolute;
		left: 42rpx;
		top: 20rpx;
		width: 32rpx;
		height: 176rpx;
		border-radius: 18rpx;
		background: #263238;
	}

	.ps5-disc-slot {
		position: absolute;
		left: -8rpx;
		top: 68rpx;
		width: 14rpx;
		height: 86rpx;
		border-radius: 8rpx;
		background: #FF8C42;
	}

	.ps5-slot-label {
		position: absolute;
		left: -78rpx;
		top: 96rpx;
		color: #6F7B83;
		font-size: 22rpx;
	}

	.disc-face {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 104rpx;
		height: 104rpx;
		margin-right: 34rpx;
		border-radius: 50%;
		background: #FFF0E6;
		border: 4rpx solid #FF8C42;
		box-sizing: border-box;
	}

	.disc-face::after {
		content: '';
		position: absolute;
		width: 26rpx;
		height: 26rpx;
		border-radius: 50%;
		background: #FFFFFF;
		border: 4rpx solid #FF8C42;
		box-sizing: border-box;
	}

	.disc-label {
		position: relative;
		z-index: 1;
		color: #B75512;
		font-size: 20rpx;
		font-weight: 800;
	}

	.disc-arrow {
		position: absolute;
		left: 144rpx;
		bottom: 28rpx;
		padding: 8rpx 14rpx;
		border-radius: 999rpx;
		background: #263238;
		color: #FFFFFF;
		font-size: 22rpx;
		font-weight: 700;
	}

	.grip-card {
		margin-top: 20rpx;
		padding: 20rpx;
		border-radius: 14rpx;
		background: #F8FAFB;
		border: 1rpx solid #E8EEF2;
	}

	.controller-demo {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 170rpx;
		margin-bottom: 16rpx;
	}

	.joycon {
		position: relative;
		width: 86rpx;
		height: 164rpx;
		border: 4rpx solid #263238;
		background: #FFFFFF;
		box-sizing: border-box;
	}

	.joycon-left {
		border-radius: 36rpx 10rpx 10rpx 36rpx;
		background: #E8F4FF;
	}

	.joycon-right {
		border-radius: 10rpx 36rpx 36rpx 10rpx;
		background: #FFF0E6;
	}

	.top-key {
		position: absolute;
		top: -28rpx;
		left: 22rpx;
		width: 40rpx;
		height: 26rpx;
		border-radius: 10rpx 10rpx 4rpx 4rpx;
		background: #263238;
		color: #FFFFFF;
		font-size: 18rpx;
		font-weight: 700;
		line-height: 26rpx;
		text-align: center;
	}

	.stick {
		position: absolute;
		top: 46rpx;
		left: 26rpx;
		width: 32rpx;
		height: 32rpx;
		border-radius: 50%;
		background: #263238;
	}

	.bottom-stick {
		top: 98rpx;
	}

	.button-grid {
		position: absolute;
		top: 44rpx;
		left: 24rpx;
		width: 38rpx;
		height: 38rpx;
		border-radius: 50%;
		background: radial-gradient(circle at 30% 30%, #263238 0 5rpx, transparent 6rpx),
			radial-gradient(circle at 70% 30%, #263238 0 5rpx, transparent 6rpx),
			radial-gradient(circle at 30% 70%, #263238 0 5rpx, transparent 6rpx),
			radial-gradient(circle at 70% 70%, #263238 0 5rpx, transparent 6rpx);
	}

	.small-grid {
		top: 98rpx;
	}

	.grip-core {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 78rpx;
		height: 138rpx;
		background: #263238;
		color: #FFFFFF;
		font-size: 22rpx;
		font-weight: 700;
	}

	.horizontal-demo {
		min-height: 132rpx;
	}

	.joycon-horizontal {
		width: 210rpx;
		height: 82rpx;
		border-radius: 38rpx;
		background: #E8F4EF;
	}

	.rail-key {
		position: absolute;
		top: -30rpx;
		width: 52rpx;
		height: 26rpx;
		border-radius: 8rpx;
		background: #263238;
		color: #FFFFFF;
		font-size: 18rpx;
		font-weight: 700;
		line-height: 26rpx;
		text-align: center;
	}

	.rail-key-left {
		left: 44rpx;
	}

	.rail-key-right {
		right: 44rpx;
	}

	.horizontal-stick {
		top: 24rpx;
		left: 44rpx;
	}

	.horizontal-buttons {
		top: 22rpx;
		left: 132rpx;
	}

	.grip-title {
		display: block;
		font-size: 27rpx;
		font-weight: 700;
		color: #263238;
		line-height: 1.35;
	}

	.grip-desc {
		display: block;
		margin-top: 8rpx;
		font-size: 24rpx;
		color: #6F7B83;
		line-height: 1.5;
	}

	.tip-list {
		margin-top: 18rpx;
		border-radius: 14rpx;
		background: #FFFFFF;
		border: 1rpx solid #E8EEF2;
		overflow: hidden;
	}

	.tip-row {
		display: flex;
		padding: 18rpx;
		border-top: 1rpx solid #EEF1F3;
	}

	.tip-row:first-child {
		border-top: none;
	}

	.tip-dot {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 42rpx;
		height: 42rpx;
		border-radius: 50%;
		background: #FFF0E6;
		color: #FF7A1A;
		font-size: 22rpx;
		font-weight: 800;
		margin-right: 14rpx;
		flex-shrink: 0;
	}

	.tip-copy {
		flex: 1;
		min-width: 0;
	}

	.tip-title {
		display: block;
		font-size: 26rpx;
		font-weight: 700;
		color: #263238;
		line-height: 1.35;
	}

	.tip-desc {
		display: block;
		margin-top: 6rpx;
		font-size: 24rpx;
		color: #6F7B83;
		line-height: 1.45;
	}

	.card-slot-demo {
		position: relative;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		min-height: 250rpx;
		margin-top: 20rpx;
		padding: 18rpx 12rpx 8rpx;
		border-radius: 14rpx;
		background: #F8FAFB;
		border: 1rpx solid #E8EEF2;
		box-sizing: border-box;
	}

	.switch-console {
		position: relative;
		width: 380rpx;
		height: 164rpx;
		border-radius: 20rpx;
		background: #263238;
	}

	.screen-outline {
		position: absolute;
		left: 48rpx;
		right: 48rpx;
		top: 34rpx;
		bottom: 26rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8rpx;
		background: #DCE8EF;
	}

	.screen-text {
		color: #53616A;
		font-size: 24rpx;
		font-weight: 700;
	}

	.game-slot {
		position: absolute;
		right: 52rpx;
		top: -8rpx;
		width: 62rpx;
		height: 14rpx;
		border-radius: 8rpx;
		background: #FF8C42;
	}

	.slot-label {
		position: absolute;
		right: 18rpx;
		top: -48rpx;
		color: #6F7B83;
		font-size: 22rpx;
	}

	.game-card {
		position: absolute;
		right: 110rpx;
		top: 22rpx;
		width: 78rpx;
		height: 96rpx;
		border-radius: 8rpx;
		background: #FFFFFF;
		border: 4rpx solid #263238;
		box-sizing: border-box;
		transform: rotate(-10deg);
	}

	.game-card-label {
		display: block;
		padding: 12rpx 8rpx;
		color: #263238;
		font-size: 18rpx;
		font-weight: 700;
		line-height: 1.2;
		text-align: center;
	}

	.card-steps {
		margin-top: 18rpx;
	}

	.issue-icon {
		width: 48rpx;
		font-size: 30rpx;
		line-height: 40rpx;
		flex-shrink: 0;
	}

	.support-panel {
		background: #FFF8F2;
		border-color: #FFE2CC;
	}

	.support-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 178rpx;
		height: 66rpx;
		margin: 0;
		padding: 0;
		border-radius: 14rpx;
		background: #263238;
		color: #FFFFFF;
		font-size: 25rpx;
		font-weight: 700;
		line-height: 66rpx;
		flex-shrink: 0;
	}

	.support-button::after {
		border: none;
	}
</style>
