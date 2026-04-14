// 事件总线，用于跨页面组件通信
const eventBus = {
	handlers: {},

	on(event, handler) {
		if (!this.handlers[event]) {
			this.handlers[event] = [];
		}
		this.handlers[event].push(handler);
	},

	off(event, handler) {
		if (!handler) {
			delete this.handlers[event];
		} else {
			const idx = (this.handlers[event] || []).indexOf(handler);
			if (idx > -1) this.handlers[event].splice(idx, 1);
		}
	},

	emit(event, data) {
		(this.handlers[event] || []).forEach(h => h(data));
	}
};

export default eventBus;
