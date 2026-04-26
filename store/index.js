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
    rechargeTiers: [],
    currentRoom: null,
    currentSelectItem: null,
    currentRoomAddons: [],

    univerifyErrorMsg: '',
    pending_invite_code: null,
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
      if (!state.userInfo) state.userInfo = {};
      if (userInfo.gender !== undefined) state.userInfo.gender = userInfo.gender;
      if (userInfo.birthday) state.userInfo.birthday = userInfo.birthday;
      if (userInfo.avatar) state.userInfo.avatar = userInfo.avatar;
      if (userInfo.nickname) state.userInfo.nickname = userInfo.nickname;
      if (userInfo.phone) state.userInfo.phone = userInfo.phone;
      if (userInfo.points !== undefined) state.userInfo.points = userInfo.points;
      if (userInfo.member_level !== undefined) state.userInfo.member_level = userInfo.member_level;
      if (userInfo.member_level_name) state.userInfo.member_level_name = userInfo.member_level_name;
      if (userInfo.account_balance !== undefined) state.userInfo.account_balance = userInfo.account_balance;
      if (userInfo.total_consume !== undefined) state.userInfo.total_consume = userInfo.total_consume;
      if (userInfo.tags !== undefined) state.userInfo.tags = userInfo.tags;
      if (userInfo.subscribe_authorized !== undefined) state.userInfo.subscribe_authorized = userInfo.subscribe_authorized;
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
    setCurrentRoom(state, room) { state.currentRoom = room || null; },
    setCurrentSelectItem(state, item) { state.currentSelectItem = item || null; },
    setCurrentRoomAddons(state, list) { state.currentRoomAddons = list || []; },
    clearCurrentRoomAddons(state) { state.currentRoomAddons = []; },

    setRechargeTiers(state, list) { state.rechargeTiers = list; },
    setUniverifyLogin(state, payload) {
      typeof payload !== 'boolean' ? payload = !!payload : '';
      state.isUniverifyLogin = payload;
    },
    setUniverifyErrorMsg(state, payload = '') {
      state.univerifyErrorMsg = payload;
    },
    setPendingInviteCode(state, code) {
      state.pending_invite_code = code;
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
    getRechargeTiers({ commit }) { return AUTH.getRechargeTiers().then(res => { if (res._status === 0) { commit('setRechargeTiers', res.data || []); return Promise.resolve(res.data || []); } return Promise.reject(res._reason); }); },
    loginAndRegister: async function({ commit, state, dispatch }) {
      try {
        // Step 1: 微信登录获取 code
        const { code } = await AUTH.weixinLogin();
        console.log('微信登录 code:', code);

        // Step 2: 发送给后端验证，获取 token 和 openid
        const res = await AUTH.univerifyLogin(code);
        console.log('后端登录响应:', res);

        if (res._status === 10000) {
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

        // Step 3: 检测是否新用户，保存 token 和邀请码
        commit('login', 'weixin');
        commit('setUniverifyLogin', true);
        commit('setToken', res.data.token);
        commit('setOpenid', res.data.user.weixin_openid);

        // Step 4: 获取用户信息和配置
        await Promise.all([
          dispatch('getUserInfo'),
          dispatch('getConstanceInfo')
        ]);

        // Step 5: 如果是新用户，跳转到欢迎页
        if (res.data.is_new_user) {
          commit('setPendingInviteCode', res.data.invite_code || null);
          uni.navigateTo({ url: '/pages/user/welcome/welcome' });
          return state.openid;
        }

        // Step 6: 静默请求订阅消息权限（不强制）
        dispatch('requestSubscribeMessage');

        return state.openid;

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
     */
    requestSubscribeMessage: async function({ commit }) {
      try {
        const authorized = await AUTH.requestSubscribeMessage();
        commit('setSubscribeAuthorized', authorized);
        console.log('订阅消息授权状态:', authorized);
      } catch (error) {
        commit('setSubscribeAuthorized', false);
      }
    },

    /**
     * 在预约前调用，强制请求订阅权限
     */
    ensureSubscribeMessage: async function({ state, dispatch }) {
      if (state.subscribeAuthorized) {
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
        state.userInfo.birthday,
        state.userInfo.tags,
        state.userInfo.subscribe_authorized
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
     */
    getConstanceInfo: function({ state, commit }) {
      if (!state.token) {
        console.warn('token 不存在，无法获取 constance');
        return Promise.reject('token is null');
      }
      return AUTH.getConstance(state.token).then((res) => {
        if (!res || res._status !== 0) return;
        commit('setConstanceInfo', res.data);
        if (res.data.wechat_subscribe_template_id) {
          AUTH.setSubscribeTemplateId(res.data.wechat_subscribe_template_id);
        }
        return res;
      }).catch((err) => {
        console.error('获取配置信息失败:', err);
      });
    },

    /**
     * 获取评价列表
     */
    getReviewList: function({ state, commit }) {
      // 评价列表公开，无需登录
      return AUTH.getReviewList(state.token || null).then((res) => {
        if (!res || res._status !== 0) return [];
        return res.data || [];
      }).catch(() => []);
    },

    /**
     * 提交评价
     */
    submitReview: function({ state }, rating, content) {
      if (!state.token) return Promise.reject('未登录');
      return AUTH.submitReview(state.token, rating, content).then((res) => {
        if (!res || res._status !== 0) return Promise.reject(res._reason || '提交失败');
        return res;
      }).catch((err) => Promise.reject(err));
    },

    /**
     * 完成欢迎页初始化（新用户填写资料）
     */
    completeOnboarding: async function({ state, commit, dispatch }, { nickname, avatar, phone, gender, birthday, invite_code }) {
      try {
        // 更新用户资料
        if (nickname || avatar || phone || gender !== undefined || birthday !== undefined) {
          await AUTH.setUserProflie(
            state.token,
            phone || state.userInfo.phone || '',
            nickname || state.userInfo.nickname || '',
            avatar || state.userInfo.avatar || '',
            gender !== undefined ? gender : state.userInfo.gender,
            birthday || state.userInfo.birthday || '',
            (state.userInfo.tags || ''),
            state.userInfo.subscribe_authorized
          );
          // 同步更新本地 userInfo
          commit('updateUserInfo', { nickname, avatar, phone, gender, birthday });
        }
        // 如果有邀请码且注册时未填写（后端已处理则跳过），在此补填
        if (invite_code) {
          await AUTH.applyInviteCode(state.token, invite_code);
        }
        // 请求订阅消息
        dispatch('requestSubscribeMessage');
        return true;
      } catch (error) {
        console.error('完成初始化失败:', error);
        return false;
      }
    },

    /**
     * 获取余额变动记录
     */
    getBalanceRecords: function({ state }) {
      if (!state.token) return Promise.reject('未登录');
      return AUTH.getBalanceRecords(state.token).then((res) => {
        if (!res || res._status !== 0) return [];
        return res.data || [];
      }).catch(() => []);
    }
  }
});

export default store;
