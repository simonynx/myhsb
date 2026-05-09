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
function requestPayment(params) {
	return new Promise(function(resolve, reject) {
		if (IS_WEIXIN) {
			wx.requestPayment({
				timeStamp: params.timeStamp,
				nonceStr: params.nonceStr,
				package: params.package,
				signType: params.signType || 'MD5',
				paySign: params.paySign,
				success: function(res) {
					resolve(res);
				},
				fail: function(err) {
					reject(err);
				}
			});
		} else if (IS_TOUTIAO) {
			tt.pay({
				orderInfo: params.toutiaoOrderInfo || {},
				service: 5,
				success: function(res) {
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
						errMsg: messages[code] || '支付未完成',
						code: code,
						raw: res
					});
				},
				fail: function(err) {
					reject(err);
				}
			});
		} else {
			reject('当前平台不支持支付');
		}
	});
}

// ==================== 订阅消息 ====================
function requestSubscribeMessage(templateIds) {
	return new Promise(function(resolve, reject) {
		if (IS_WEIXIN) {
			uni.requestSubscribeMessage({
				tmplIds: templateIds || [],
				success: function(res) {
					var tid = templateIds && templateIds[0] || '';
					var result = tid ? res[tid] : '';
					resolve(result === 'accept');
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

// ==================== 扫码场景解析 ====================
function parseScene(options) {
	var scene = '';
	if (IS_WEIXIN) {
		scene = options && options.scene || '';
	} else if (IS_TOUTIAO) {
		// 抖音扫码参数可能通过 query.scene 传入
		if (options && options.query && options.query.scene) {
			scene = options.query.scene;
		}
	}
	return scene;
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
	parseScene: parseScene,
	parsePhoneEvent: parsePhoneEvent
};
