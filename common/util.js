function formatTime(time) {
	if (typeof time !== 'number' || time < 0) {
		return time
	}

	var hour = parseInt(time / 3600)
	time = time % 3600
	var minute = parseInt(time / 60)
	time = time % 60
	var second = time

	return ([hour, minute, second]).map(function(n) {
		n = n.toString()
		return n[1] ? n : '0' + n
	}).join(':')
}

function formatLocation(longitude, latitude) {
	if (typeof longitude === 'string' && typeof latitude === 'string') {
		longitude = parseFloat(longitude)
		latitude = parseFloat(latitude)
	}

	longitude = longitude.toFixed(2)
	latitude = latitude.toFixed(2)

	return {
		longitude: longitude.toString().split('.'),
		latitude: latitude.toString().split('.')
	}
}

var dateUtils = {
	UNITS: {
		'年': 31557600000,
		'月': 2629800000,
		'天': 86400000,
		'小时': 3600000,
		'分钟': 60000,
		'秒': 1000
	},
	humanize: function(milliseconds) {
		var humanize = '';
		for (var key in this.UNITS) {
			if (milliseconds >= this.UNITS[key]) {
				humanize = Math.floor(milliseconds / this.UNITS[key]) + key + '前';
				break;
			}
		}
		return humanize || '刚刚';
	},
	format: function(dateStr) {
		var date = this.parse(dateStr)
		var diff = Date.now() - date.getTime();
		if (diff < this.UNITS['天']) {
			return this.humanize(diff);
		}
		var _format = function(number) {
			return (number < 10 ? ('0' + number) : number);
		};
		return date.getFullYear() + '/' + _format(date.getMonth() + 1) + '/' + _format(date.getDate()) + '-' +
			_format(date.getHours()) + ':' + _format(date.getMinutes());
	},
	parse: function(str) { //将"yyyy-mm-dd HH:MM:ss"格式的字符串，转化为一个Date对象
		var a = str.split(/[^0-9]/);
		return new Date(a[0], a[1] - 1, a[2], a[3], a[4], a[5]);
	}
};

function _pad(n) {
	return n < 10 ? '0' + n : '' + n;
}

// 兼容解析后端时间：支持 ISO、YYYY-MM-DD HH:mm:ss、秒/毫秒时间戳
function parseDateTime(value) {
	if (!value) return null;
	if (value instanceof Date) {
		return isNaN(value.getTime()) ? null : value;
	}
	if (typeof value === 'number') {
		var dateFromNumber = new Date(value < 1e12 ? value * 1000 : value);
		return isNaN(dateFromNumber.getTime()) ? null : dateFromNumber;
	}
	var text = String(value);
	var timestamp = Date.parse(text);
	if (!isNaN(timestamp)) return new Date(timestamp);
	timestamp = Date.parse(text.replace(/-/g, '/').replace('T', ' ').split('.')[0]);
	if (!isNaN(timestamp)) return new Date(timestamp);
	return null;
}

function toTimestamp(value) {
	var date = parseDateTime(value);
	return date ? date.getTime() : 0;
}

// 格式化后端时间戳（支持秒/毫秒）为 YYYY-MM-DD
function formatDate(ts) {
	if (!ts) return '-';
	var d = parseDateTime(ts);
	if (!d) return '-';
	return d.getFullYear() + '-' + _pad(d.getMonth() + 1) + '-' + _pad(d.getDate());
}

// 格式化后端时间戳（支持秒/毫秒）为 YYYY-MM-DD HH:MM
function formatDateTime(ts) {
	if (!ts) return '-';
	var d = parseDateTime(ts);
	if (!d) return '-';
	return d.getFullYear() + '-' + _pad(d.getMonth() + 1) + '-' + _pad(d.getDate()) + ' ' +
		_pad(d.getHours()) + ':' + _pad(d.getMinutes());
}

export {
	formatTime,
	formatLocation,
	dateUtils,
	parseDateTime,
	toTimestamp,
	formatDate,
	formatDateTime
}
