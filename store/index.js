import Vue from 'vue'
import Vuex from 'vuex'
import AUTH from '../utils/auth.js'
Vue.use(Vuex)
const store = new Vuex.Store({
	state: {
		hasLogin: false,
		userInfo: null,
		constance:null,
		isUniverifyLogin: false,
		loginProvider: "",
		token:null,
		openid: null,
		testvuex: false,
		colorIndex: 0,
		colorList: ['#FF0000', '#00FF00', '#0000FF'],
		noMatchLeftWindow: true,
		active: 'componentPage',
		leftWinActive: '/pages/component/view/view',
		activeOpen: '',
		menu: [],
		univerifyErrorMsg: ''
	},
	mutations: {
		login(state, provider) {
			state.hasLogin = true;
			state.loginProvider = provider;
		},
		logout(state) {
			state.hasLogin = false
			state.openid = null
		},
		setUserInfo(state, payload){
			state.userInfo = payload;
		},
		setConstanceInfo(state, payload){
			state.constance = payload;
		},
		updateUserInfo(state, userInfo){
			if(userInfo.gender){
				state.userInfo.gender = userInfo.gender;
			}
			if(userInfo.birthday){
				state.userInfo.birthday = userInfo.birthday;
			}
			if(userInfo.avatar){
				state.userInfo.avatar = userInfo.avatar;
			}
			if(userInfo.nickname){
				state.userInfo.nickname = userInfo.nickname;
			}
			if(userInfo.phone){
				state.userInfo.phone = userInfo.phone;
			}
		},
		setOpenid(state, openid) {
			state.openid = openid
		},
		setToken(state, token) {
			state.token = token
		},
		setTestTrue(state) {
			state.testvuex = true
		},
		setTestFalse(state) {
			state.testvuex = false
		},
		setColorIndex(state, index) {
			state.colorIndex = index
		},
		setMatchLeftWindow(state, matchLeftWindow) {
			state.noMatchLeftWindow = !matchLeftWindow
		},
		setActive(state, tabPage) {
			state.active = tabPage
		},
		setLeftWinActive(state, leftWinActive) {
			state.leftWinActive = leftWinActive
		},
		setActiveOpen(state, activeOpen) {
			state.activeOpen = activeOpen
		},
		setMenu(state, menu) {
			state.menu = menu
		},
		setUniverifyLogin(state, payload) {
			typeof payload !== 'boolean' ? payload = !!payload : '';
			state.isUniverifyLogin = payload;
		},
		setUniverifyErrorMsg(state,payload = ''){
			state.univerifyErrorMsg = payload
		}
	},
	getters: {
		currentColor(state) {
			return state.colorList[state.colorIndex]
		}
	},
	actions: {
		// lazy loading openid
		loginAndRegister: async function({
			commit,
			state,
			dispatch
		}) {
			return await new Promise((resolve, reject) => {
				if (state.openid) {
					resolve(state.openid)
				} else {
					uni.login({
						provider: 'weixin',
					}).then(resArray=>{
						  var [err, loginRes] = resArray;
						  if(err){
							uni.showModal({
								title: '无法登录',
								content: err,
								showCancel: false
							});
							reject(err)
							return;
						  }
						  commit("login", 'weixin');
						return AUTH.univerifyLogin(loginRes.code);
					}).then(res=>{
						if (res._status == 10000) {
							// 去注册
							reject(res._reason)
							return;
						}
						if (res._status != 0) {
							// 登录错误
							uni.showModal({
							  title: '无法登录',
							  content: res._reason,
							  showCancel: false
							});
							reject(res._reason)
							return;
						}
						commit("setUniverifyLogin", true);
						commit("setToken", res.data.token);
						commit("setOpenid", res.data.user.weixin_openid);
						dispatch('getUserInfo');
						dispatch('getConstanceInfo');
						resolve(state.openid)
					}).catch((error)=>{
						// 登录错误
						uni.showModal({
						  title: '无法登录',
						  content: error,
						  showCancel: false
						});
					});
				}
			})
		},
		getUserInfo: function({
			commit,
			state,
		}) {
			return AUTH.getUserProfile(state.token).then((res)=>{
				if(!res) return;
				commit('setUserInfo', res.data);
			})
		},
		requestUpdateUserInfo:function({
			state,
			commit,
		}){
			return AUTH.setUserProflie(state.token, state.userInfo.phone, state.userInfo.nickname, state.userInfo.avatar, state.userInfo.gender, state.userInfo.birthday).then((res)=>{
				if (res._status != 0) {
					uni.showModal({
					  title: '更新远程用户信息失败',
					  content: res._reason,
					  showCancel: false
					});
					return;
				}
				commit('setUserInfo', res.data);
				return res;
			}).catch((err)=>{
				uni.showModal({
				  title: '更新远程用户信息失败',
				  content: err,
				  showCancel: false
				});
			});
		},
		getConstanceInfo:function({
			state,
			commit,
		}){
			return AUTH.getConstance(state.token).then((res)=>{
				if(!res) return;
				var baseUrl = 'http://moyuhuashui.oss-cn-shenzhen.aliyuncs.com/';
				if(res.data.home_page_image0){
					res.data.home_page_image0 =  baseUrl + res.data.home_page_image0;
				}
				if(res.data.home_page_image1){
					res.data.home_page_image1 =  baseUrl + res.data.home_page_image1;
				}
				if(res.data.home_page_image2){
					res.data.home_page_image2 =  baseUrl + res.data.home_page_image2;
				}
				if(res.data.home_page_image3){
					res.data.home_page_image3 =  baseUrl + res.data.home_page_image3;
				}
				commit('setConstanceInfo', res.data);
				return res;
			});
		}
	}
})

export default store
