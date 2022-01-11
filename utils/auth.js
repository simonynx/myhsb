// const WXAPI = require('apifm-wxapi')
// import Dialog from '@vant/weapp/dialog/dialog'

var API_BASE_URL = 'https://api.moyuhuashui.top/api/v1';
var merchantId = '0';

var request = function request(url, method, data, token) {
  var _url = API_BASE_URL + url;
  if (url.indexOf("http") == 0 ) {
    _url = url
  }
  var header = {
    'Content-Type': 'application/json'
  };
  if (token){
	header["Authorization"] = "Token "+ token;   
  }
  if(data){
	data =  JSON.stringify(data);
  }
  return new Promise(function (resolve, reject) {
    uni.request({
      url: _url,
      method: method,
      data:data,
	  dataType:"json",
      header: header,
      success: function success(request) {
        resolve(request.data);
      },
      fail: function fail(error) {
        reject(error);
      },
      complete: function complete(aaa) {
        // 加载完成
      }
    });
  });
};


async function checkSession(){
  return new Promise((resolve, reject) => {
    uni.checkSession({
      success() {
        return resolve(true)
      },
      fail() {
        return resolve(false)
      }
    })
  })
}

async function bindSeller() {
  const token = uni.getStorageSync('token')
  const referrer = uni.getStorageSync('referrer')
  if (!token) {
    return
  }
  if (!referrer) {
    return
  }
  // const res = await WXAPI.bindSeller({
  //   token,
  //   uid: referrer
  // })
}

// 检测登录状态，返回 true / false
async function checkHasLogined() {
  const token = uni.getStorageSync('token')
  if (!token) {
    return false
  }
  const loggined = await checkSession()
  if (!loggined) {
    uni.removeStorageSync('token')
    return false
  }
  // const checkTokenRes = await WXAPI.checkToken(token)
  // if (checkTokenRes.code != 0) {
  //   uni.removeStorageSync('token')
  //   return false
  // }
  return true
}

async function wxaCode(){
  return new Promise((resolve, reject) => {
    uni.login({
      success(res) {
        return resolve(res.code)
      },
      fail() {
        uni.showToast({
          title: '获取code失败',
          icon: 'none'
        })
        return resolve('获取code失败')
      }
    })
  })
}

async function login(page){
  const _this = this
  uni.login({
	provider: 'weixin',
    success: function (res) {
		const extConfigSync = wx.getExtConfigSync()
		var data = { js_code: res.code };
		request('/auth/signin_by_weixin/', 'post', data).then(function (res){
			if (res._status == 10000) {
				// 去注册
				return;
			}
			if (res._status != 0) {
				// 登录错误
				uni.showModal({
				  title: '无法登录',
				  content: res._reason,
				  showCancel: false
				})
				return;
			}
			uni.setStorageSync('token', res.data.token)
			uni.setStorageSync('uid', res.data.user.weixin_openid)
			
			uni.showModal({
				title: '获取微信个人信息授权',
				content: "作为预约信息标标",
				showCancel: false,
				success : function(result){
					getUserProfile();
				},
			});
			_this.bindSeller()
		});
    }
  });
}

async function authorize() {
  // const code = await wxaCode()
  // const resLogin = await WXAPI.login_wx(code)
  // if (resLogin.code == 0) {
  //   wx.setStorageSync('token', resLogin.data.token)
  //   wx.setStorageSync('uid', resLogin.data.uid)
  //   return resLogin
  // }
  return new Promise((resolve, reject) => {
    uni.login({
      success: function (res) {
        const code = res.code
        let referrer = '' // 推荐人
        let referrer_storge = uni.getStorageSync('referrer');
        if (referrer_storge) {
          referrer = referrer_storge;
        }
        // 下面开始调用注册接口
        const extConfigSync = uni.getExtConfigSync()
        if (extConfigSync.subDomain) {
          WXAPI.wxappServiceAuthorize({
            code: code,
            referrer: referrer
          }).then(function (res) {
            if (res.code == 0) {
              wx.setStorageSync('token', res.data.token)
              wx.setStorageSync('uid', res.data.uid)
              resolve(res)
            } else {
              wx.showToast({
                title: res.msg,
                icon: 'none'
              })
              reject(res.msg)
            }
          })
        } else {
          WXAPI.authorize({
            code: code,
            referrer: referrer
          }).then(function (res) {
            if (res.code == 0) {
              wx.setStorageSync('token', res.data.token)
              wx.setStorageSync('uid', res.data.uid)
              resolve(res)
            } else {
              wx.showToast({
                title: res.msg,
                icon: 'none'
              })
              reject(res.msg)
            }
          })
        }
      },
      fail: err => {
        reject(err)
      }
    })
  })
}

function loginOut(){
  uni.removeStorageSync('token')
  uni.removeStorageSync('uid')
  uni.removeStorageSync('storage_info')
}

async function checkAndAuthorize (scope) {
  return new Promise((resolve, reject) => {
    uni.getSetting({
      success(res) {
        if (!res.authSetting[scope]) {
          uni.authorize({
            scope: scope,
            success() {
              resolve() // 无返回参数
            },
            fail(e){
              console.error(e)
              // if (e.errMsg.indexof('auth deny') != -1) {
              //   wx.showToast({
              //     title: e.errMsg,
              //     icon: 'none'
              //   })
              // }
              uni.showModal({
                title: '无权操作',
                content: '需要获得您的授权',
                showCancel: false,
                confirmText: '立即授权',
                confirmColor: '#e64340',
                success(res) {
                  uni.openSetting();
                },
                fail(e){
                  console.error(e)
                  reject(e)
                },
              })
            }
          })
        } else {
          resolve() // 无返回参数
        }
      },
      fail(e){
        console.error(e)
        reject(e)
      }
    })
  })  
}

async function getRoomDataList(token, date) {
	return new Promise((resolve, reject) => {
		var data = { date: date };
		request('/rooms/?date='+date, 'GET', data, token).then(function (res){
			// console.log("===============>room data:", res)
			if (res._status != 0) {
				// 登录错误
				uni.showModal({
				  title: '无法获取房间信息',
				  content: res.errMsg,
				  showCancel: false
				})
				reject(res.errMsg);
				return;
			}
			resolve(res);
		});
	});
}

async function getRoomAppointments(token, roomId, date) {
	return new Promise((resolve, reject) => {
		var data = { room_id: roomId, date: date };
		request('/rooms/appointments/?room_id='+roomId+"&date="+date, 'GET', data, token).then(function (res){
			if (res._status != 0) {
				// 登录错误
				uni.showModal({
				  title: '无法获取房间信息',
				  content: res.errMsg,
				  showCancel: false
				})
				reject(res.errMsg);
				return;
			}
			resolve(res);
		});
	});
}

async function bookingRoom(token, roomId, date, contactName, userCount, timeList, remark) {
	return new Promise((resolve, reject) => {
		var data = { room_id: roomId, contact_name:contactName, user_count:userCount,date:date, time_list:timeList, remark:remark };
		request('/rooms/booking/', 'POST', data, token).then(function (res){
			if (res._status != 0) {
				// 登录错误
				uni.showModal({
				  title: '无法创建订单',
				  content: res._reason,
				  showCancel: false
				})
				reject(res);
				return;	
			}
			resolve(res);
		});
	});
}

async function getUserProfile() {
	return new Promise((resolve, reject) => {
		uni.getUserProfile({
		  desc: '用于完善个人资料',
		  success: function(res) {
		    var userInfo = res.userInfo
		    uni.setStorageSync('storage_info', 1);//本地标记
		    //下面将userInfo存入服务器中的用户个人资料
		    //...
			uni.setStorageSync("avartarUrl", res.userInfo.avatarUrl);
			uni.setStorageSync("nickName", res.userInfo.nickName);
			uni.setStorageSync("gender", res.userInfo.gender);
			setUserProflie(uni.getStorageSync("token"), "1", res.userInfo.nickName, res.userInfo.avatarUrl,  res.userInfo.gender);
			resolve(res);
		  },
		  fail(e) {
			uni.showModal({
			  title: '用户拒绝授权',
			  content: e.errMsg,
			  showCancel: false
			})
			reject(e);
		  }
		})
	});
}

//未支付=0,支付成功=1,支付失败=2
async function getOrderList(status ,token) {
	return new Promise((resolve, reject) => {
		var data = null;
		if (status >= 0){
			data = {order_status:status};
		}
		request('/users/appointments/'+(data? ("?order_status="+status) : ""), 'GET', data, token).then(function (res){
			if (res._status != 0) {
				// 登录错误
				uni.showModal({
				  title: '无法获取订单',
				  content: res.errMsg,
				  showCancel: false
				})
				reject(res.errMsg);
				return;
			}
			resolve(res);
		});
	});
}


async function setUserProflie(token, phone, nickName, avatarUrl, gender) {
	return new Promise((resolve, reject) => {
		let data = {phone:phone, nickname:nickName, avatar:avatarUrl, gender:gender};
		request('/users/me/', 'POST', data, token).then(function (res){
			if (res._status != 0) {
				reject(res.errMsg);
				return;
			}
			resolve(res);
		});
	});
}


module.exports = {
  setUserProflie: setUserProflie,
  checkHasLogined: checkHasLogined,
  wxaCode: wxaCode,
  login: login,
  loginOut: loginOut,
  checkAndAuthorize: checkAndAuthorize,
  authorize: authorize,
  bindSeller: bindSeller,
  getRoomDataList: getRoomDataList,
  getRoomAppointments: getRoomAppointments,
  bookingRoom : bookingRoom,
  getUserProfile : getUserProfile,
  getOrderList : getOrderList,
}