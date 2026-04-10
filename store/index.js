import Vue from 'vue';
import Vuex from 'vuex';
import AUTH from '../utils/auth.js';

Vue.use(Vuex);

const store = new Vuex.Store({
  state: {
    hasLogin: false,
    userInfo: null,
    constance: null,
    isUniverifyLogin: false,
    loginProvider: '',
    token: null,
    openid: null,
    // 订阅消息授权状态
    subscribeAuthorized: false,
    // 测试相关
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
      state.hasLogin = false;
      state.openid = null;
      state.token = null;
    },
    setUserInfo(state, payload) {
      state.userInfo = payload;
    },
    setConstanceInfo(state, payload) {
      state.constance = payload;
    },
    updateUserInfo(state, userInfo) {
      if (userInfo.gender) state.userInfo.gender = userInfo.gender;
      if (userInfo.birthday) state.userInfo.birthday = userInfo.birthday;
      if (userInfo.avatar) state.userInfo.avatar = userInfo.avatar;
      if (userInfo.nickname) state.userInfo.nickname = userInfo.nickname;
      if (userInfo.phone) state.userInfo.phone = userInfo.phone;
    },
    setOpenid(state, openid) {
      state.openid = openid;
    },
    setToken(state, token) {
      state.token = token;
    },
    setSubscribeAuthorized(state, authorized) {
      state.subscribeAuthorized = authorized;
    },
    setTestTrue(state) {
      state.testvuex = true;
    },
    setTestFalse(state) {
      state.testvuex = false;
    },
    setColorIndex(state, index) {
      state.colorIndex = index;
    },
    setMatchLeftWindow(state, matchLeftWindow) {
      state.noMatchLeftWindow = !matchLeftWindow;
    },
    setActive(state, tabPage) {
      state.active = tabPage;
    },
    setLeftWinActive(state, leftWinActive) {
      state.leftWinActive = leftWinActive;
    },
    setActiveOpen(state, activeOpen) {
      state.activeOpen = activeOpen;
    },
    setMenu(state, menu) {
      state.menu = menu;
    },
    setUniverifyLogin(state, payload) {
      typeof payload !== 'boolean' ? payload = !!payload : '';
      state.isUniverifyLogin = payload;
    },
    setUniverifyErrorMsg(state, payload = '') {
      state.univerifyErrorMsg = payload;
    }
  },

  getters: {
    currentColor(state) {
      return state.colorList[state.colorIndex];
    }
  },

  actions: {
    /**
     * 微信小程序登录（修复版）
     * 使用微信原生登录 + 后端验证
     */
    loginAndRegister: async function({ commit, state, dispatch }) {
      try {
        // Step 1: 微信登录获取 code
        const { code } = await AUTH.weixinLogin();
        console.log('微信登录 code:', code);

        // Step 2: 发送给后端验证，获取 token 和 openid
        const res = await AUTH.univerifyLogin(code);
        console.log('后端登录响应:', res);

        if (res._status === 10000) {
          // 需要注册（通常是新用户）
          uni.showModal({
            title: '提示',
            content: res._reason || '需要注册',
            showCancel: false
          });
          return Promise.reject(res._reason);
        }

        if (res._status !== 0) {
          uni.showModal({
            title: '无法登录',
            content: res._reason || '登录失败',
            showCancel: false
          });
          return Promise.reject(res._reason);
        }

        // Step 3: 登录成功，保存状态
        commit('login', 'weixin');
        commit('setUniverifyLogin', true);
        commit('setToken', res.data.token);
        commit('setOpenid', res.data.user.weixin_openid);

        // Step 4: 获取用户信息和配置
        await Promise.all([
          dispatch('getUserInfo'),
          dispatch('getConstanceInfo')
        ]);

        // Step 5: 静默请求订阅消息权限（不强制）
        dispatch('requestSubscribeMessage');

        return state.openid;

      } catch (error) {
        console.error('登录失败:', error);
        uni.showModal({
          title: '登录失败',
          content: error || '请检查网络后重试',
          showCancel: false
        });
        return Promise.reject(error);
      }
    },

    /**
     * 请求订阅消息权限（预约成功通知）
     * 不强制，静默申请
     */
    requestSubscribeMessage: async function({ commit }) {
      try {
        const authorized = await AUTH.requestSubscribeMessage();
        commit('setSubscribeAuthorized', authorized);
        console.log('订阅消息授权状态:', authorized);
      } catch (error) {
        // 用户拒绝或发生错误，静默处理
        console.log('订阅消息未授权:', error);
        commit('setSubscribeAuthorized', false);
      }
    },

    /**
     * 在预约前调用，强制请求订阅权限
     * 如果用户已授权则跳过
     */
    ensureSubscribeMessage: async function({ state, dispatch }) {
      if (state.subscribeAuthorized) {
        console.log('订阅消息已授权');
        return true;
      }
      try {
        await dispatch('requestSubscribeMessage');
        return state.subscribeAuthorized;
      } catch (error) {
        return false;
      }
    },

    getUserInfo: function({ commit, state }) {
      return AUTH.getUserProfile(state.token).then((res) => {
        if (!res) return;
        commit('setUserInfo', res.data);
      }).catch((err) => {
        console.error('获取用户信息失败:', err);
      });
    },

    requestUpdateUserInfo: function({ state, commit }) {
      return AUTH.setUserProflie(
        state.token,
        state.userInfo.phone,
        state.userInfo.nickname,
        state.userInfo.avatar,
        state.userInfo.gender,
        state.userInfo.birthday
      ).then((res) => {
        if (res._status !== 0) {
          uni.showModal({
            title: '更新远程用户信息失败',
            content: res._reason,
            showCancel: false
          });
          return;
        }
        commit('setUserInfo', res.data);
        return res;
      }).catch((err) => {
        uni.showModal({
          title: '更新远程用户信息失败',
          content: err,
          showCancel: false
        });
      });
    },

    /**
     * 获取配置信息
     * 注意：图片路径在这里不拼接前缀，由页面 loadData 统一处理
     */
    getConstanceInfo: function({ state, commit }) {
      // 检查 token 是否存在
      if (!state.token) {
        console.warn('token 不存在，无法获取 constance');
        return Promise.reject('token is null');
      }
      return AUTH.getConstance(state.token).then((res) => {
        console.log('getConstance 返回:', res);
        if (!res) {
          console.error('getConstance 返回空数据');
          return;
        }
        if (res._status !== 0) {
          console.error('getConstance 失败:', res._reason);
          return;
        }
        // 不在这里处理图片前缀，统一由页面 loadData 处理
        // 避免重复拼接导致图片无法加载
        commit('setConstanceInfo', res.data);
        console.log('constance 设置成功, 原始数据:', res.data);
        // 设置订阅消息模板 ID
        if (res.data.wechat_subscribe_template_id) {
          AUTH.setSubscribeTemplateId(res.data.wechat_subscribe_template_id);
        }
        return res;
      }).catch((err) => {
        console.error('获取配置信息失败:', err);
      });
    }
  }
});

export default store;
