// app.js
const { STORAGE_KEYS, RUNTIME_DEFAULTS } = require('./utils/constants.js');
const { normalizeUserRole } = require('./utils/rbac.js');
const { setRuntimeSettings } = require('./utils/runtimeSettings.js');

App({
  globalData: {
    userInfo: null,
    isLogin: false,
    userType: '',
    userRole: '',
    currentLocation: null,
    checkInStatus: {
      work: false,
      load: false,
      arrive: false,
      complete: false
    },
    todayTasks: [],
    currentTask: null
  },

  onLaunch() {
    this.initCloud();

    // 初始化本地存储
    this.initStorage();
    
    // 获取系统信息
    const systemInfo = wx.getSystemInfoSync();
    this.globalData.systemInfo = systemInfo;
    
    // 检查登录状态
    this.checkLoginStatus();
    
    console.log('送货人员工作台小程序启动');
  },

  initCloud() {
    if (!wx.cloud) {
      console.warn('当前基础库不支持云开发');
      return;
    }

    wx.cloud.init({
      env: wx.cloud.DYNAMIC_CURRENT_ENV,
      traceUser: true
    });
  },

  // 初始化本地存储
  initStorage() {
    const keys = [
      STORAGE_KEYS.USER_INFO,
      STORAGE_KEYS.TOKEN,
      STORAGE_KEYS.RUNTIME_SETTINGS,
      STORAGE_KEYS.CHECKIN_RECORDS,
      STORAGE_KEYS.TASKS,
      STORAGE_KEYS.PERFORMANCE,
      STORAGE_KEYS.BONUS_HISTORY,
      STORAGE_KEYS.PROBLEMS,
      STORAGE_KEYS.REIMBURSEMENTS,
      STORAGE_KEYS.TEMP_WORKER_REQUESTS
    ];
    keys.forEach(key => {
      try {
        const value = wx.getStorageSync(key);
        if (!value) {
          if (key === STORAGE_KEYS.USER_INFO || key === STORAGE_KEYS.TOKEN) {
            wx.setStorageSync(key, null);
          } else if (key === STORAGE_KEYS.RUNTIME_SETTINGS) {
            wx.setStorageSync(key, { ...RUNTIME_DEFAULTS });
          } else {
            wx.setStorageSync(key, []);
          }
        }
      } catch (e) {
        console.error('初始化存储失败:', e);
      }
    });

    setRuntimeSettings({});
  },

  // 检查登录状态
  checkLoginStatus() {
    try {
      const userInfo = wx.getStorageSync(STORAGE_KEYS.USER_INFO);
      if (userInfo) {
        this.globalData.userInfo = userInfo;
        this.globalData.isLogin = true;
        this.globalData.userType = userInfo.userType;
        this.globalData.userRole = normalizeUserRole(userInfo);
      }
    } catch (e) {
      console.error('检查登录状态失败:', e);
    }
  },

  // 全局登录方法
  login(userInfo) {
    this.globalData.userInfo = userInfo;
    this.globalData.isLogin = true;
    this.globalData.userType = userInfo.userType;
    this.globalData.userRole = normalizeUserRole(userInfo);
    wx.setStorageSync(STORAGE_KEYS.USER_INFO, userInfo);
  },

  // 全局登出方法
  logout() {
    this.globalData.userInfo = null;
    this.globalData.isLogin = false;
    this.globalData.userType = '';
    this.globalData.userRole = '';
    wx.removeStorageSync(STORAGE_KEYS.USER_INFO);
    wx.removeStorageSync(STORAGE_KEYS.TOKEN);
    wx.removeStorageSync(STORAGE_KEYS.CHECKIN_RECORDS);
  },

  // 获取当前位置
  getCurrentLocation() {
    return new Promise((resolve, reject) => {
      wx.getLocation({
        type: 'gcj02',
        isHighAccuracy: true,
        highAccuracyExpireTime: 5000,
        success: (res) => {
          this.globalData.currentLocation = {
            latitude: res.latitude,
            longitude: res.longitude
          };
          resolve(res);
        },
        fail: reject
      });
    });
  },

  // 显示提示
  showToast(title, icon = 'none') {
    wx.showToast({
      title,
      icon,
      duration: 2000
    });
  },

  // 显示加载
  showLoading(title = '加载中...') {
    wx.showLoading({
      title,
      mask: true
    });
  },

  // 隐藏加载
  hideLoading() {
    wx.hideLoading();
  },

  // 格式化时间
  formatTime(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
  },

  // 格式化日期
  formatDate(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 计算时间差（分钟）
  diffMinutes(startTime, endTime) {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    return Math.round((end - start) / (1000 * 60));
  }
});
