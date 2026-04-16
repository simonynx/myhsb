// utils/auth.js - 微信小程序登录和订阅消息工具

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
  if (token !== undefined) {
    header['Authorization'] = 'Token ' + token;
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: _url,
      method: method,
      data: data,
      header: header,
      timeout: 10000,
      success: (res) => resolve(res.data),
      fail: (error) => reject(error)
    });
  });
}

// ==================== 微信登录 ====================

function weixinLogin() {
  return new Promise((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: (loginRes) => {
        if (!loginRes || loginRes.errMsg !== 'login:ok') {
          reject(loginRes.errMsg || '登录失败');
          return;
        }
        resolve({ code: loginRes.code });
      },
      fail: (err) => {
        reject(err.errMsg || '登录请求失败');
      }
    });
  });
}

function getPhoneNumber(e) {
  return new Promise((resolve, reject) => {
    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      reject(e.detail.errMsg || '获取手机号失败');
      return;
    }
    var data = { encryptedData: e.detail.encryptedData, iv: e.detail.iv };
    request('/auth/decrypt_phone/', 'POST', data).then(resolve).catch(reject);
  });
}

// ==================== 订阅消息 ====================

var SUBSCRIBE_TEMPLATE_ID = '';

function setSubscribeTemplateId(templateId) {
  SUBSCRIBE_TEMPLATE_ID = templateId;
}

function requestSubscribeMessage() {
  return new Promise((resolve, reject) => {
    uni.requestSubscribeMessage({
      tmplIds: [SUBSCRIBE_TEMPLATE_ID || 'YOUR_TEMPLATE_ID'],
      success: (res) => {
        var result = res[SUBSCRIBE_TEMPLATE_ID] || res['YOUR_TEMPLATE_ID'] || 'reject';
        console.log('订阅消息授权结果:', result);
        resolve(result === 'accept');
      },
      fail: (err) => {
        console.log('订阅消息请求失败:', err);
        reject(err);
      }
    });
  });
}

// ==================== 业务 API ====================

function univerifyLogin(loginCode) {
  var data = { js_code: loginCode };
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
  return request('/rooms/?date=' + date, 'GET', { date: date }, token);
}

function getRoomAppointments(token, roomId, date) {
  return request('/rooms/appointments/?room_id=' + roomId + '&date=' + date, 'GET', null, token);
}

function bookingRoom(token, roomId, date, contactName, userCount, timeList, remark) {
  var data = {
    room_id: roomId,
    contact_name: contactName,
    user_count: userCount,
    date: date,
    time_list: timeList,
    remark: remark
  };
  return request('/rooms/booking/', 'POST', data, token);
}

function bookingRoomWithBalance(token, roomId, date, contactName, userCount, timeList, remark) {
  var data = {
    room_id: roomId,
    contact_name: contactName,
    user_count: userCount,
    date: date,
    time_list: timeList,
    remark: remark
  };
  return request('/rooms/booking_balance/', 'POST', data, token);
}

function setUserProflie(token, phone, nickName, avatarUrl, gender, birthday) {
  var data = {
    phone: phone,
    nickname: nickName,
    avatar: avatarUrl,
    gender: gender,
    birthday: birthday
  };
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

function getGoodsList(token) {
  return request('/goods/', 'GET', null, token);
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
  var data = { amount: amount };
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

function deleteOrder(token, params) {
  return request('/orders/delete/', 'POST', params, token);
}

function cancelOrder(token, params) {
  return request('/orders/cancel/', 'POST', params, token);
}

function updateOrderCoupon(token, params) {
  return request('/orders/update_order_coupon/', 'POST', params, token);
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
          uni.showModal({ title: '上传文件失败', content: resData._reason, showCancel: false });
          reject(resData._reason);
          return;
        }
        resolve(resData.data);
      },
      fail: (error) => {
        uni.showModal({ title: '上传文件失败', content: error, showCancel: false });
        reject(error);
      }
    });
  });
}

// ==================== 导出 ====================

var httpRequest = {
  weixinLogin: weixinLogin,
  univerifyLogin: univerifyLogin,
  getPhoneNumber: getPhoneNumber,
  checkSession: checkSession,
  loginOut: loginOut,
  requestSubscribeMessage: requestSubscribeMessage,
  setSubscribeTemplateId: setSubscribeTemplateId,
  setUserProflie: setUserProflie,
  getUserProfile: getUserProfile,
  getOrderList: getOrderList,
  recharge: recharge,
  setPayPassword: setPayPassword,
  checkout: checkout,
  accountPay: accountPay,
  wxPay: wxPay,
  deleteOrder: deleteOrder,
  cancelOrder: cancelOrder,
  updateOrderCoupon: updateOrderCoupon,
  getRoomDataList: getRoomDataList,
  getRoomAppointments: getRoomAppointments,
  bookingRoom: bookingRoom,
  bookingRoomWithBalance: bookingRoomWithBalance,
  getGoodsList: getGoodsList,
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
  // 每日签到
  checkInInfo: checkInInfo,
  checkIn: checkIn,
  memberConfig: memberConfig,
  // 邀请有礼
  inviteInfo: inviteInfo,
  applyInviteCode: applyInviteCode,
  activeBanners: activeBanners,
};

export default httpRequest;
