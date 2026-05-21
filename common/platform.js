// common/platform.js — 跨平台抽象层（微信/抖音）

var systemInfo = null;
try {
	systemInfo = uni.getSystemInfoSync();
} catch (e) {
	console.log('获取系统信息失败', e);
}

// 平台判断（编译后唯一生效的分支）
var PLATFORM = (systemInfo && systemInfo.uniPlatform) || '';
var IS_WEIXIN = PLATFORM === 'mp-weixin';
var IS_TOUTIAO = PLATFORM === 'mp-toutiao';

function getPlatform() {
	if (IS_WEIXIN) return 'weixin';
	if (IS_TOUTIAO) return 'toutiao';
	return PLATFORM;
}

// ==================== 登录 ====================
function platformLogin() {
	return new Promise(function(resolve, reject) {
		var loginOptions = {
			success: function(loginRes) {
				var code = loginRes.code;
				var anonymous_code = loginRes.anonymous_code;
				var is_login = loginRes.is_login;
				resolve({
					code: code,
					anonymous_code: anonymous_code,
					is_login: is_login,
					platform: getPlatform()
				});
			},
			fail: function(err) {
				reject(err && err.errMsg || '登录请求失败');
			}
		};
		if (IS_WEIXIN) {
			loginOptions.provider = 'weixin';
		}
		uni.login(loginOptions);
	});
}

// ==================== 支付 ====================
function normalizeToutiaoOrderInfo(params) {
	var source = params && (params.payment || params.wxpay || params) || {};
	var raw = source.toutiaoOrderInfo || source.orderInfo || source;
	return {
		order_id: String(raw.order_id || ''),
		order_token: String(raw.order_token || '')
	};
}

function normalizeWeixinPaymentParams(params) {
	var source = params || {};
	for (var i = 0; i < 3; i++) {
		var next = source && (source.payment || source.wxpay || source.data);
		if (!next || next === source) break;
		source = next;
	}
	return {
		timeStamp: String(source.timeStamp || source.timestamp || ''),
		nonceStr: String(source.nonceStr || source.nonce_str || ''),
		package: String(source.package || source.packageValue || ''),
		signType: source.signType || source.sign_type || 'MD5',
		paySign: String(source.paySign || source.sign || source.pay_sign || '')
	};
}

function resolveToutiaoPayResult(res, resolve, reject) {
	var code = Number(res && res.code);
	if (code === 0) {
		resolve(res);
		return;
	}
	var messages = {
		1: '支付超时',
		2: '支付失败',
		3: '支付关闭',
		4: '支付已取消',
		9: '支付状态待确认'
	};
	reject({
		errMsg: messages[code] || ((res && res.errMsg) || '支付未完成'),
		code: code,
		raw: res
	});
}

function requestPayment(params) {
	return new Promise(function(resolve, reject) {
		if (IS_WEIXIN) {
			var payment = normalizeWeixinPaymentParams(params);
			var missing = [];
			if (!payment.timeStamp) missing.push('timeStamp');
			if (!payment.nonceStr) missing.push('nonceStr');
			if (!payment.package) missing.push('package');
			if (!payment.paySign) missing.push('paySign');
			if (missing.length) {
				reject({
					errMsg: '微信支付参数缺失: ' + missing.join(', '),
					missing: missing
				});
				return;
			}
			wx.requestPayment({
				timeStamp: payment.timeStamp,
				nonceStr: payment.nonceStr,
				package: payment.package,
				signType: payment.signType,
				paySign: payment.paySign,
				success: function(res) {
					resolve(res);
				},
				fail: function(err) {
					reject(err);
				}
			});
		} else if (IS_TOUTIAO) {
			var orderInfo = normalizeToutiaoOrderInfo(params);
			if (!orderInfo.order_id || !orderInfo.order_token) {
				reject({
					errMsg: '抖音支付参数缺失',
					missing: !orderInfo.order_id ? 'order_id' : 'order_token'
				});
				return;
			}
			var settled = false;
			function safeResolve(res) {
				if (settled) return;
				settled = true;
				resolve(res);
			}
			function safeReject(err) {
				if (settled) return;
				settled = true;
				reject(err);
			}
			if (typeof tt === 'undefined' || typeof tt.pay !== 'function') {
				safeReject({
					errMsg: '当前抖音基础库不支持 tt.pay，请升级抖音或开发者工具'
				});
				return;
			}
			var payOptions = {
				orderInfo: orderInfo,
				service: 5,
				success: function(res) {
					resolveToutiaoPayResult(res, safeResolve, safeReject);
				},
				fail: function(err) {
					safeReject(err);
				}
			};
			try {
				var result = tt.pay(payOptions);
				if (result && typeof result.then === 'function') {
					result.then(function(res) {
						resolveToutiaoPayResult(res, safeResolve, safeReject);
					}).catch(function(err) {
						safeReject(err);
					});
				}
			} catch (err) {
				safeReject(err);
			}
		} else {
			reject('当前平台不支持支付');
		}
	});
}

// ==================== 订阅消息 ====================
function requestSubscribeMessage(templateIds) {
	return new Promise(function(resolve, reject) {
		if (IS_WEIXIN) {
			var ids = (templateIds || []).filter(function(id) {
				return !!id;
			});
			if (!ids.length) {
				resolve(false);
				return;
			}
			uni.requestSubscribeMessage({
				tmplIds: ids,
				success: function(res) {
					var accepted = ids.some(function(tid) {
						return res[tid] === 'accept';
					});
					resolve(accepted);
				},
				fail: function(err) {
					reject(err);
				}
			});
		} else {
			// 抖音不支持订阅消息，直接 resolve false
			resolve(false);
		}
	});
}

// ==================== 分享 ====================
function getShareConfig(title, path, imageUrl) {
	var config = {
		title: title,
		path: path,
		imageUrl: imageUrl
	};
	if (IS_TOUTIAO) {
		// 抖音分享可额外支持 query 参数
		if (path && path.indexOf('?') >= 0) {
			config.query = path.split('?')[1];
		}
	}
	return config;
}

function safeDecode(value) {
	if (value === undefined || value === null) return '';
	value = String(value);
	try {
		return decodeURIComponent(value);
	} catch (e) {
		return value;
	}
}

function parseQueryString(queryString) {
	var result = {};
	if (!queryString) return result;
	var parts = String(queryString).split('&');
	for (var i = 0; i < parts.length; i++) {
		var item = parts[i];
		if (!item) continue;
		var eqIndex = item.indexOf('=');
		var rawKey = eqIndex >= 0 ? item.slice(0, eqIndex) : item;
		var rawValue = eqIndex >= 0 ? item.slice(eqIndex + 1) : '';
		var key = safeDecode(rawKey);
		if (!key) continue;
		result[key] = safeDecode(rawValue);
	}
	return result;
}

function buildPagePath(path, params) {
	var pairs = [];
	params = params || {};
	Object.keys(params).forEach(function(key) {
		var value = params[key];
		if (value === undefined || value === null || value === '') return;
		pairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(value)));
	});
	if (!pairs.length) return path;
	return path + (path.indexOf('?') >= 0 ? '&' : '?') + pairs.join('&');
}

// ==================== 扫码场景解析 ====================
function parseScene(options) {
	var scene = '';
	if (options && options.query && options.query.scene) {
		scene = options.query.scene;
	} else if (options && options.scene) {
		// 微信 App 生命周期里的 scene 是数字启动场景值，不是业务参数；页面 onLoad 的 scene 才可能是二维码参数。
		var rawScene = String(options.scene);
		if (!IS_WEIXIN || !/^\d+$/.test(rawScene)) {
			scene = rawScene;
		}
	}
	return scene;
}

function getLaunchQuery(options) {
	var result = {};
	options = options || {};
	var reserved = {
		path: true,
		scene: true,
		query: true,
		shareTicket: true,
		referrerInfo: true
	};
	function assign(source) {
		if (!source || typeof source !== 'object') return;
		Object.keys(source).forEach(function(key) {
			if (reserved[key]) return;
			var value = source[key];
			if (value === undefined || value === null || value === '') return;
			result[key] = safeDecode(value);
		});
	}
	assign(options.query);
	assign(options);
	var scene = parseScene(options);
	if (scene) {
		var sceneQuery = parseQueryString(safeDecode(scene));
		Object.keys(sceneQuery).forEach(function(key) {
			result[key] = sceneQuery[key];
		});
	}
	return result;
}

// ==================== 获取手机号回调 ====================
function parsePhoneEvent(e) {
	var detail = e && e.detail || {};
	var errMsg = detail.errMsg || '';
	var ok = errMsg.indexOf('getPhoneNumber:ok') >= 0 || errMsg.indexOf('getPhoneNumber:success') >= 0;
	return {
		ok: ok,
		errMsg: errMsg,
		encryptedData: detail.encryptedData,
		iv: detail.iv,
		code: detail.code
	};
}

// ==================== 导出 ====================
module.exports = {
	IS_WEIXIN: IS_WEIXIN,
	IS_TOUTIAO: IS_TOUTIAO,
	getPlatform: getPlatform,
	platformLogin: platformLogin,
	requestPayment: requestPayment,
	requestSubscribeMessage: requestSubscribeMessage,
	getShareConfig: getShareConfig,
	buildPagePath: buildPagePath,
	parseScene: parseScene,
	parseQueryString: parseQueryString,
	getLaunchQuery: getLaunchQuery,
	parsePhoneEvent: parsePhoneEvent
};
