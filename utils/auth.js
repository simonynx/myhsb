// const WXAPI = require('apifm-wxapi')
// import Dialog from '@vant/weapp/dialog/dialog'

var API_BASE_URL = 'https://api.moyuhuashui.top/api/v1';
var merchantId = '0';

function request(url, method, data, token) {
  if (typeof uni !== 'undefined' && uni.request && uni.getSystemInfoSync) {
    // uni.request 可用，执行相关操作
  } else {
    console.log('uni.request 不可用');
	return;
  }
  var _url = API_BASE_URL + url;
  const index = url.toString().indexOf('http');
  if( index == 0) {
    _url = url;
  }
  var header = {
    'Content-Type': 'application/json'
  };
  if (token != undefined){
	header['Authorization'] = "Token "+ token;   
  }
  return new Promise((resolve,reject)=>{
	uni.request({
      url: _url,
      method: method,
      data:data,
      header: header,
	  timeout: 5000,
      success:(res)=> {
        resolve(res.data);
      },
      fail:(error)=> {
        reject(error);
      }
    });
  });
}

function univerifyLogin(loginCode){
	var data = { js_code: loginCode };
	return request('/auth/signin_by_weixin/', 'POST', data);
}

function checkSession(){
  return new Promise((resolve, reject) => {
    uni.checkSession({
      success:()=>{
        resolve(true)
      },
      fail:()=>{
        reject(false)
      }
    });
  });
}

function authorize() {
}

function loginOut(){
  uni.removeStorageSync('token')
  uni.removeStorageSync('uid')
  uni.removeStorageSync('storage_info')
}

function checkAndAuthorize (scope) {
  
}

function getRoomDataList(token, date) {
	var data = { date: date };
	return request('/rooms/?date='+date, 'GET', data, token).then(function (res){
		// console.log("===============>room data:", res)
		if (res._status != 0) {
			uni.showModal({
			  title: '无法获取房间列表信息',
			  content: res._reason,
			  showCancel: false
			})
			return;
		}
		return res;
	}).catch(error=>{
		uni.showModal({
		  title: '无法获取房间列表信息',
		  content: error,
		  showCancel: false
		})
	});
}

function getRoomAppointments(token, roomId, date) {
	var data = { room_id: roomId, date: date };
	return request('/rooms/appointments/?room_id='+roomId+"&date="+date, 'GET', data, token).then(function (res){
		if (res._status != 0) {
			uni.showModal({
			  title: '无法获取房间预约信息',
			  content: res._reason,
			  showCancel: false
			})
			return;
		}
		return res;
	}).catch(error=>{
		uni.showModal({
		  title: '无法获取房间预约信息',
		  content: error,
		  showCancel: false
		})
	});
}

function bookingRoom(token, roomId, date, contactName, userCount, timeList, remark) {
  var data = { room_id: roomId, contact_name:contactName, user_count:userCount,date:date, time_list:timeList, remark:remark };
  return request('/rooms/booking/', 'POST', data, token).then(res=>{
	if (res._status != 0) {
		uni.showModal({
		  title: '无法创建订单',
		  content: res._reason,
		  showCancel: false
		})
		return;	
	}
	return res;
  }).catch(error=>{
	uni.showModal({
	  title: '无法创建订单',
	  content: error,
	  showCancel: false
	})  
  });
}

function bookingRoomWithBalance(token, roomId, date, contactName, userCount, timeList, remark) {
  var data = { room_id: roomId, contact_name:contactName, user_count:userCount,date:date, time_list:timeList, remark:remark };
  return request('/rooms/booking_balance/', 'POST', data, token).then(res=>{
	if (res._status != 0) {
		uni.showModal({
		  title: '无法创建订单',
		  content: res._reason,
		  showCancel: false
		})
		return;	
	}
	return res;
  }).catch(error=>{
	uni.showModal({
	  title: '无法创建订单',
	  content: error,
	  showCancel: false
	})  
  });
}

function setUserProflie(token, phone, nickName, avatarUrl, gender, birthday) {
	let data = {phone:phone, nickname:nickName, avatar:avatarUrl, gender:gender, birthday:birthday};
	return request('/users/me/', 'POST', data, token);
}

function getUserProfile(token) {
	// const _this = this;
	return request('/users/me/', 'GET', null, token).then((res)=>{
		if(res._status != 0){
			uni.showModal({
			  title: '获取用户信息失败',
			  content: res._reason,
			  showCancel: false
			});
			return res;
		}
		return res;
	}).catch((error)=>{
		uni.showModal({
		  title: '获取用户信息失败',
		  content: error,
		  showCancel: false
		});
	});
}

//未支付=0,支付成功=1,支付失败=2
function getOrderList(status ,token) {
	var data = null;
	if (status >= 0){
		data = {order_status:status};
	}
	return request('/users/orders/'+(data? ("?order_status="+status) : ""), 'GET', data, token).then(function (res){
		if (res._status != 0) {
			uni.showModal({
			  title: '无法获取订单',
			  content: res._reason,
			  showCancel: false
			})
			return;
		}
		return res;
	}).catch(error=>{
		uni.showModal({
		  title: '无法获取订单',
		  content: error,
		  showCancel: false
		});
	});
}

function getGoodsList(token){
	return request('/goods/', 'GET', null, token).then(function (res){
		if (res._status != 0) {
			uni.showModal({
			  title: '无法获取商品列表',
			  content: res._reason,
			  showCancel: false
			})
			return;
		}
		return res;
	}).catch(error=>{
		uni.showModal({
		  title: '无法获取商品列表',
		  content: error,
		  showCancel: false
		});
	});
}

function getConstance(token){
	return request('/config/', 'GET', null, token).then(function (res){
		if (res._status != 0) {
			uni.showModal({
			  title: '无法获取常量信息',
			  content: res._reason,
			  showCancel: false
			})
			return;
		}
		return res;
	}).catch(error=>{
		uni.showModal({
		  title: '无法获取常量信息',
		  content: error,
		  showCancel: false
		});
	});
}

function purchaseGoods(goodsId,token){
	var data = {goods_id:goodsId}
	return request('/goods/purchase/', 'POST', data, token).then(function (res){
		if (res._status != 0) {
			uni.showModal({
			  title: '无法购买商品',
			  content: res._reason,
			  showCancel: false
			})
			return;
		}
		return res;
	}).catch(error=>{
		uni.showModal({
		  title: '无法购买商品',
		  content: error,
		  showCancel: false
		});
	});
}

function setPayPassword(password,token){
	var data = {password:password}
	return request('/users/reset_paypwd/', 'POST', data, token).then(function (res){
		if (res._status != 0) {
			uni.showModal({
			  title: '设置支付密码失败',
			  content: res._reason,
			  showCancel: false
			})
			return;
		}
		return res;
	}).catch(error=>{
		uni.showModal({
		  title: '设置支付密码失败',
		  content: error,
		  showCancel: false
		});
	});
}

function recharge(amount, token){
	var data = {amount:amount};
	return request('/users/recharge/', 'POST', data, token).then(function (res){
		if (res._status != 0) {
			uni.showModal({
			  title: '充值失败',
			  content: res._reason,
			  showCancel: false
			})
			return;
		}
		return res;
	}).catch(error=>{
		uni.showModal({
		  title: '充值失败',
		  content: error,
		  showCancel: false
		});
	});
}

function checkout(token, args) {
  // var data = { room_id: roomId, contact_name:contactName, user_count:userCount,date:date, time_list:timeList, remark:remark };
  var data = args;
  if(args.order_type == 1){ //appointment
	//need {room_id, contact_name, user_count, date, time_list, remark}
  }else if(args.order_type == 2){ //recharge
	//need {amount}
  }else if(args.order_type == 3){ //voucher
	//need {goods_id}
  }
  return request('/users/checkout/', 'POST', data, token).then(res=>{
	if (res._status != 0) {
		uni.showModal({
		  title: '无法创建订单',
		  content: res._reason,
		  showCancel: false
		})
		return;	
	}
	return res;
  }).catch(error=>{
	uni.showModal({
	  title: '无法创建订单',
	  content: error,
	  showCancel: false
	})  
  });
}

function accountPay(token, params) {
  return request('/orders/account_pay/', 'POST', params, token).then(res=>{
	if (res._status != 0) {
		uni.showModal({
		  title: '余额支付失败',
		  content: res._reason,
		  showCancel: false
		})
		return;	
	}
	return res;
  }).catch(error=>{
	uni.showModal({
	  title: '余额支付失败',
	  content: error,
	  showCancel: false
	})  
  });
}

function wxPay(token, params) {
  return request('/orders/wxpay/', 'POST', params, token).then(res=>{
	if (res._status != 0) {
		uni.showModal({
		  title: '微信支付失败',
		  content: res._reason,
		  showCancel: false
		})
		return;	
	}
	return res;
  }).catch(error=>{
	uni.showModal({
	  title: '微信支付失败',
	  content: error,
	  showCancel: false
	})  
  });
}

function deleteOrder(token, params) {
  return request('/orders/delete/', 'POST', params, token).then(res=>{
	if (res._status != 0) {
		uni.showModal({
		  title: '删除订单失败',
		  content: res._reason,
		  showCancel: false
		})
		return;	
	}
	return res;
  }).catch(error=>{
	uni.showModal({
	  title: '删除订单失败',
	  content: error,
	  showCancel: false
	})  
  });
}

function cancelOrder(token, params) {
  return request('/orders/cancel/', 'POST', params, token).then(res=>{
	if (res._status != 0) {
		uni.showModal({
		  title: '取消订单失败',
		  content: res._reason,
		  showCancel: false
		})
		return;	
	}
	return res;
  }).catch(error=>{
	uni.showModal({
	  title: '取消订单失败',
	  content: error,
	  showCancel: false
	})  
  });
}

function uploadFile(token, filePath, fileName){
	var _url = API_BASE_URL + '/upload/' + fileName;
	var header = {
	  'content-type': 'multipart/form-data',
	};
	if (token != undefined){
		header['Authorization'] = "Token "+ token;   
	}
	return new Promise((resolve,reject)=>{
		uni.uploadFile({
			url: _url,
			header:header,
			filePath:filePath,
			name:'file',
			timeout: 5000,
			success:(res)=> {
				const resData = JSON.parse(res.data);
				if(resData._status != 0){
					uni.showModal({
						title: '上传文件失败',
						content: resData._reason,
						showCancel: false
					})
					reject(resData._reason);
					return;
				}
				resolve(resData.data);
			},
			fail:(error)=> {
				uni.showModal({
					title: '上传文件失败',
					content: error,
					showCancel: false
				})
				reject(error);
			}
	    });
	});
}

const httpRequest = {
	univerifyLogin:univerifyLogin,
	setUserProflie:setUserProflie,
	loginOut:loginOut,
	checkAndAuthorize:checkAndAuthorize,
	authorize:authorize,
	getRoomDataList:getRoomDataList,
	getRoomAppointments:getRoomAppointments,
	bookingRoom:bookingRoom,
	bookingRoomWithBalance:bookingRoomWithBalance,
	getUserProfile:getUserProfile,
	getOrderList:getOrderList,
	getGoodsList:getGoodsList,
	purchaseGoods:purchaseGoods,
	uploadFile:uploadFile,
	recharge:recharge,
	getConstance:getConstance,
	setPayPassword:setPayPassword,
	checkout:checkout,
	accountPay:accountPay,
	wxPay:wxPay,
	deleteOrder:deleteOrder,
	cancelOrder:cancelOrder,
}

export default httpRequest