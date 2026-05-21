// utils/auth.js - 跨平台登录和订阅消息工具

var PLATFORM = require('../common/platform.js');
var API_BASE_URL = 'https://api.moyuhuashui.top/api/v1';

// ==================== HTTP 请求 ====================

function request(url, method, data, token) {
  if (typeof uni === 'undefined' || !uni.request) {
    console.log('uni.request 不可用');
    return Promise.reject('uni.request 不可用');
  }

  var _url = API_BASE_URL + url;
  if (url.toString().indexOf('http') === 0) {
    _url = url;
  }

  var header = { 'Content-Type': 'application/json' };
  if (token) {
    header['Authorization'] = 'Token ' + token;
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: _url,
      method: method,
      data: data,
      header: header,
      timeout: 10000,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject({ statusCode: res.statusCode, data: res.data });
        }
      },
      fail: (error) => reject(error)
    });
  });
}

// ==================== 平台登录 ====================

function weixinLogin() {
  // 兼容旧调用，实际使用 platformLogin
  return platformLogin();
}

function platformLogin() {
  return PLATFORM.platformLogin();
}

function getPhoneNumber(e, token) {
  return new Promise((resolve, reject) => {
    var phoneEvent = PLATFORM.parsePhoneEvent(e);
    if (!phoneEvent.ok) {
      reject(phoneEvent.errMsg || '获取手机号失败');
      return;
    }
    var data = { encryptedData: phoneEvent.encryptedData, iv: phoneEvent.iv };
    request('/auth/decrypt_phone/', 'POST', data, token).then(resolve).catch(function(err) {
      // 如果是 session_key 过期，先刷新再重试
      if (err && err._reason && err._reason.indexOf('SESSION_KEY_EXPIRED') >= 0) {
        PLATFORM.platformLogin().then(function(loginRes) {
          // 刷新 session_key（需携带 token 认证）
          request('/auth/refresh_session_key/', 'POST', { code: loginRes.code, platform: PLATFORM.getPlatform() }, token).then(function() {
            // 重试解密
            request('/auth/decrypt_phone/', 'POST', data, token).then(resolve).catch(reject);
          }).catch(reject);
        }).catch(function(err) {
          reject(err || '登录失败');
        });
      } else {
        reject(err);
      }
    });
  });
}

// ==================== 订阅消息 ====================

var SUBSCRIBE_TEMPLATE_ID = '';
var GROUP_SUCCESS_SUBSCRIBE_TEMPLATE_ID = '';

function setSubscribeTemplateId(templateId) {
  SUBSCRIBE_TEMPLATE_ID = templateId;
}

function setGroupSuccessSubscribeTemplateId(templateId) {
  GROUP_SUCCESS_SUBSCRIBE_TEMPLATE_ID = templateId;
}

function setSubscribeTemplateConfig(config) {
  config = config || {};
  setSubscribeTemplateId(config.wechat_subscribe_template_id || '');
  setGroupSuccessSubscribeTemplateId(config.group_success_subscribe_template_id || '');
}

function uniqueTemplateIds(ids) {
  var result = [];
  (ids || []).forEach(function(id) {
    if (!id || id === 'YOUR_TEMPLATE_ID') return;
    if (result.indexOf(id) < 0) result.push(id);
  });
  return result;
}

function requestSubscribeMessage(typeOrIds) {
  var ids = [];
  if (Array.isArray(typeOrIds)) {
    ids = typeOrIds;
  } else if (typeOrIds === 'group') {
    ids = [SUBSCRIBE_TEMPLATE_ID, GROUP_SUCCESS_SUBSCRIBE_TEMPLATE_ID];
  } else if (typeOrIds === 'group_success') {
    ids = [GROUP_SUCCESS_SUBSCRIBE_TEMPLATE_ID];
  } else {
    ids = [SUBSCRIBE_TEMPLATE_ID];
  }
  ids = uniqueTemplateIds(ids);
  if (!ids.length) {
    return Promise.resolve(false);
  }
  return PLATFORM.requestSubscribeMessage(ids);
}

// ==================== 业务 API ====================

function univerifyLogin(loginCode, inviteCode) {
  return univerifyLoginPlatform(loginCode, inviteCode, PLATFORM.getPlatform());
}

function univerifyLoginPlatform(loginCode, inviteCode, platform) {
  var data = { js_code: loginCode, platform: platform || 'weixin' };
  if (inviteCode) {
    data.invite_code = inviteCode;
  }
  // 根据平台选择登录接口
  if (platform === 'toutiao') {
    return request('/auth/signin_by_toutiao/', 'POST', data);
  }
  return request('/auth/signin_by_weixin/', 'POST', data);
}

function checkSession() {
  return new Promise((resolve, reject) => {
    uni.checkSession({
      success: () => resolve(true),
      fail: () => reject(false)
    });
  });
}

function loginOut() {
  uni.removeStorageSync('token');
  uni.removeStorageSync('uid');
  uni.removeStorageSync('storage_info');
}

function getRoomDataList(token, date) {
  return request('/rooms/?date=' + encodeURIComponent(date), 'GET', null, token);
}

function getRoomAppointments(token, roomId, date) {
  return request('/rooms/appointments/?room_id=' + roomId + '&date=' + date, 'GET', null, token);
}

function getRoomDetail(token, roomId) {
  return request('/rooms/' + roomId, 'GET', null, token);
}

function setUserProflie(token, phone, nickName, avatarUrl, gender, birthday, tags, subscribeAuthorized) {
  var data = {
    phone: phone,
    nickname: nickName,
    avatar: avatarUrl,
    gender: gender,
    birthday: birthday,
    tags: tags
  };
  if (subscribeAuthorized !== undefined) {
    data.subscribe_authorized = !!subscribeAuthorized;
  }
  return request('/users/me/', 'POST', data, token);
}

function getUserProfile(token) {
  return request('/users/me/', 'GET', null, token);
}

function getOrderList(status, token) {
  var data = status >= 0 ? { order_status: status } : null;
  var url = '/users/orders/' + (data ? '?order_status=' + status : '');
  return request(url, 'GET', data, token);
}

function getGoodsList(token, exchangeType) {
  var url = '/goods/';
  if (exchangeType !== undefined && exchangeType !== null) {
    url += '?exchange_type=' + exchangeType;
  }
  return request(url, 'GET', null, token);
}

function getRoomAddons(token, roomId) {
  return request('/rooms/addons/?room_id=' + roomId, 'GET', null, token);
}

function exchangeGoods(token, goodsId, usePoints, quantity) {
  var data = {
    goods_id: goodsId,
    use_points: usePoints || 0,
    quantity: quantity || 1,
    order_type: 5
  };
  return request('/users/checkout/', 'POST', data, token);
}

// ==================== 每日签到 ====================
function checkInInfo(token) {
  return request('/users/check_in_info/', 'GET', null, token);
}

function memberConfig(token) {
  return request('/users/member_config/', 'GET', null, token);
}

function checkIn(token) {
  return request('/users/check_in/', 'POST', null, token);
}

// ==================== 拼团 ====================
function getGroupList(token, params) {
  var query = '';
  if (params) {
    var parts = [];
    if (params.date) parts.push('date=' + encodeURIComponent(params.date));
    if (params.room_id) parts.push('room_id=' + encodeURIComponent(params.room_id));
    if (parts.length) query = '?' + parts.join('&');
  }
  return request('/groups/' + query, 'GET', null, token);
}

function getGroupDetail(token, groupId) {
  return request('/groups/' + groupId + '/', 'GET', null, token);
}

function createGroup(token, data) {
  return request('/groups/', 'POST', data, token);
}

function joinGroup(token, groupId) {
  return request('/groups/' + groupId + '/join/', 'POST', {}, token);
}

function payGroup(token, groupId) {
  return request('/groups/' + groupId + '/pay/', 'POST', {}, token);
}

function leaveGroup(token, groupId) {
  return request('/groups/' + groupId + '/leave/', 'POST', {}, token);
}

function cancelGroup(token, groupId) {
  return request('/groups/' + groupId + '/cancel/', 'POST', {}, token);
}

function myGroups(token) {
  return request('/groups/my_groups/', 'GET', null, token);
}

// ==================== 邀请有礼 ====================
function inviteInfo(token) {
  return request('/users/invite_info/', 'GET', null, token);
}

function applyInviteCode(token, inviteCode) {
  var data = { invite_code: inviteCode };
  return request('/users/apply_invite_code/', 'POST', data, token);
}

function activeBanners() {
  return request('/banner/active_banners/', 'GET');
}

function purchaseGoods(goodsId, token) {
  var data = { goods_id: goodsId };
  return request('/goods/purchase/', 'POST', data, token);
}

function recharge(amount, token) {
  var data = { amount: amount, platform: PLATFORM.getPlatform() };
  return request('/users/recharge/', 'POST', data, token);
}

function getReviewList(token) {
  return request('/reviews/', 'GET', null, token);
}

function submitReview(token, rating, content) {
  var data = { rating: rating, content: content };
  return request('/reviews/', 'POST', data, token);
}

function getBalanceRecords(token) {
  return request('/users/balance_records/', 'GET', null, token);
}

function getRechargeTiers() {
  return request('/recharge_tiers/', 'GET', null);
}


function getCouponList(token) {
  return request('/coupons/', 'GET', null, token);
}

function getMyCoupons(token, status) {
  var url = '/coupons/my_coupons/' + (status != null ? '?status=' + status : '');
  return request(url, 'GET', null, token);
}

function receiveCoupon(token, campaignId) {
  var data = { campaign_id: campaignId };
  return request('/coupons/receive/', 'POST', data, token);
}

function grantCoupon(token, campaignId, adminNotes, grantTarget, targetValue) {
  var data = {
    campaign_id: campaignId,
    admin_notes: adminNotes,
    grant_target: grantTarget || 0,
    target_value: targetValue || ''
  };
  return request('/coupons/grant/', 'POST', data, token);
}

function getCouponCampaigns(token) {
  return request('/coupons/campaigns/', 'GET', null, token);
}

function getConstance(token) {
  return request('/config/', 'GET', null, token);
}

function setPayPassword(password, token) {
  var data = { password: password };
  return request('/users/reset_paypwd/', 'POST', data, token);
}

function checkout(token, args) {
  return request('/users/checkout/', 'POST', args, token);
}

function accountPay(token, params) {
  return request('/orders/account_pay/', 'POST', params, token);
}

function wxPay(token, params) {
  return request('/orders/wxpay/', 'POST', params, token);
}

function toutiaoPay(token, params) {
  return request('/orders/toutiaopay/', 'POST', params, token);
}

function platformPay(token, params) {
  if (PLATFORM.getPlatform() === 'toutiao') {
    return toutiaoPay(token, params);
  }
  return wxPay(token, params);
}

function deleteOrder(token, params) {
  return request('/orders/delete/', 'POST', params, token);
}

function cancelOrder(token, params) {
  return request('/orders/cancel/', 'POST', params, token);
}

function updateOrderCoupon(token, params) {
  return request('/orders/update_order_coupon/', 'POST', params, token);
}

function refundOrder(token, params) {
  return request('/orders/refund/', 'POST', params, token);
}

function getTicketOrders(token) {
  return request('/orders/ticket_orders/', 'GET', null, token);
}

function verifyTicket(token, params) {
  return request('/orders/verify_ticket/', 'POST', params, token);
}

function createTicketTransfer(token, params) {
  return request('/orders/create_transfer/', 'POST', params, token);
}

function getTransferInfo(token, transferToken) {
  var url = '/orders/get_transfer_info/' + (transferToken != null ? '?transfer_token=' + transferToken : '');
  return request(url, 'GET', null, token);
}

function acceptTicketTransfer(token, params) {
  return request('/orders/accept_transfer/', 'POST', params, token);
}

function cancelTicketTransfer(token, params) {
  return request('/orders/cancel_transfer/', 'POST', params, token);
}


function getSubscriptionCards(token) {
  return request('/subscription_cards/', 'GET', null, token);
}

function getUserSubscriptions(token, status, targetType, roomId, usageSlot) {
  var params = [];
  if (status !== undefined && status !== null) params.push('status=' + status);
  if (targetType !== undefined && targetType !== null) params.push('target_type=' + targetType);
  if (roomId !== undefined && roomId !== null) params.push('room_id=' + roomId);
  if (usageSlot !== undefined && usageSlot !== null) params.push('usage_slot=' + usageSlot);
  var url = '/user_subscriptions/' + (params.length ? '?' + params.join('&') : '');
  return request(url, 'GET', null, token);
}


function uploadFile(token, filePath, fileName) {
  var _url = API_BASE_URL + '/upload/' + fileName;
  var header = { 'content-type': 'multipart/form-data' };
  if (token !== undefined) {
    header['Authorization'] = 'Token ' + token;
  }
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: _url,
      header: header,
      filePath: filePath,
      name: 'file',
      timeout: 10000,
      success: (res) => {
        var resData = JSON.parse(res.data);
        if (resData._status !== 0) {
          var reason = resData._reason || '上传失败';
          if (reason.indexOf('违规信息') >= 0) reason = '你发布的内容含违规信息，请修改后再提交';
          uni.showModal({ title: '上传失败', content: reason, showCancel: false });
          reject(resData._reason);
          return;
        }
        var url = (resData.data && resData.data.url) ? resData.data.url : resData.data;
        resolve(url);
      },
      fail: (error) => {
        uni.showModal({ title: '上传文件失败', content: error, showCancel: false });
        reject(error);
      }
    });
  });
}

// ==================== 导出 ====================

// 解析头像URL（兼容对象/JSON字符串/URL字符串等多种格式）
function parseAvatarUrl(avatar) {
  if (!avatar) return '';
  if (typeof avatar === 'string') {
    if (avatar.startsWith('http')) return avatar;
    try {
      var obj = JSON.parse(avatar.replace(/'/g, '"'));
      if (obj && obj.url) return obj.url;
    } catch (e) {}
    var match = avatar.match(/["']url["']\s*:\s*["']([^"']+)["']/);
    if (match) return match[1];
    return avatar;
  }
  if (typeof avatar === 'object' && avatar !== null) {
    return avatar.url || '';
  }
  return '';
}

var httpRequest = {
  weixinLogin: weixinLogin,
  platformLogin: platformLogin,
  univerifyLogin: univerifyLogin,
  univerifyLoginPlatform: univerifyLoginPlatform,
  getPhoneNumber: getPhoneNumber,
  checkSession: checkSession,
  loginOut: loginOut,
  requestSubscribeMessage: requestSubscribeMessage,
  setSubscribeTemplateId: setSubscribeTemplateId,
  setGroupSuccessSubscribeTemplateId: setGroupSuccessSubscribeTemplateId,
  setSubscribeTemplateConfig: setSubscribeTemplateConfig,
  setUserProflie: setUserProflie,
  getUserProfile: getUserProfile,
  getOrderList: getOrderList,
  recharge: recharge,
  setPayPassword: setPayPassword,
  checkout: checkout,
  accountPay: accountPay,
  wxPay: wxPay,
  toutiaoPay: toutiaoPay,
  platformPay: platformPay,
  deleteOrder: deleteOrder,
  cancelOrder: cancelOrder,
  updateOrderCoupon: updateOrderCoupon,
  refundOrder: refundOrder,
  getTicketOrders: getTicketOrders,
  verifyTicket: verifyTicket,
  createTicketTransfer: createTicketTransfer,
  getTransferInfo: getTransferInfo,
  acceptTicketTransfer: acceptTicketTransfer,
  cancelTicketTransfer: cancelTicketTransfer,
  getRoomDataList: getRoomDataList,
  getRoomAppointments: getRoomAppointments,
  getRoomDetail: getRoomDetail,
  getGoodsList: getGoodsList,
  getRoomAddons: getRoomAddons,
  exchangeGoods: exchangeGoods,
  purchaseGoods: purchaseGoods,
  getConstance: getConstance,
  getReviewList: getReviewList,
  submitReview: submitReview,
  getBalanceRecords: getBalanceRecords,
  getRechargeTiers: getRechargeTiers,
  getCouponList: getCouponList,
  getMyCoupons: getMyCoupons,
  receiveCoupon: receiveCoupon,
  grantCoupon: grantCoupon,
  getCouponCampaigns: getCouponCampaigns,
  uploadFile: uploadFile,
  parseAvatarUrl: parseAvatarUrl,
  // 每日签到
  checkInInfo: checkInInfo,
  checkIn: checkIn,
  memberConfig: memberConfig,
  // 拼团
  getGroupList: getGroupList,
  getGroupDetail: getGroupDetail,
  createGroup: createGroup,
  joinGroup: joinGroup,
  payGroup: payGroup,
  leaveGroup: leaveGroup,
  cancelGroup: cancelGroup,
  myGroups: myGroups,
  // 邀请有礼
  inviteInfo: inviteInfo,
  applyInviteCode: applyInviteCode,
  activeBanners: activeBanners,
  // 次卡/月卡
  getSubscriptionCards: getSubscriptionCards,
  getUserSubscriptions: getUserSubscriptions,
};

export default httpRequest;
