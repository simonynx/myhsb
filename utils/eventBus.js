// 使用 UniApp 原生事件机制，更可靠
export default {
	on(event, callback) {
		uni.$on(event, callback);
	},
	off(event, callback) {
		uni.$off(event, callback);
	},
	emit(event, data) {
		uni.$emit(event, data);
	}
};
