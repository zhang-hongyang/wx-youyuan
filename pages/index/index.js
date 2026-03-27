// pages/index/index.js - 新工作台逻辑
const app = getApp();
const util = require('../../utils/util.js');
const taskService = require('../../services/taskService.js');
const { STORAGE_KEYS } = require('../../utils/constants.js');

Page({
  data: {
    userInfo: {},
    hasWorkCheckIn: false,
    currentOrder: null,
    nextOrder: null,
    todayTasks: [],
    todayStats: {
      completed: 0,
      pending: 0,
      doing: 0
    },
    monthlyScore: 85,
    performanceLevel: 'B',
    attendanceScore: 90,
    efficiencyScore: 80,
    qualityScore: 85
  },

  onLoad() {
    this.loadUserInfo();
    this.loadTodayTasks();
    this.loadWorkCheckInStatus();
    this.loadPerformanceData();
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.loadWorkCheckInStatus();
    this.loadTodayTasks();
  },

  // 加载用户信息
  loadUserInfo() {
    const userInfo = app.globalData.userInfo || wx.getStorageSync(STORAGE_KEYS.USER_INFO);
    if (!userInfo) {
      wx.redirectTo({
        url: '/pages/login/login'
      });
      return;
    }
    this.setData({ userInfo });
  },

  // 加载上班打卡状态
  loadWorkCheckInStatus() {
    const today = util.formatDate(new Date());
    const records = wx.getStorageSync(STORAGE_KEYS.CHECKIN_RECORDS) || [];
    const hasWorkCheckIn = records.some(r => r.date === today && r.type === 'work');
    this.setData({ hasWorkCheckIn });
  },

  // 加载今日任务
  async loadTodayTasks() {
    const tasks = await taskService.getTodayTasks();

    const completed = tasks.filter(t => t.status === 'completed').length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const doing = tasks.filter(t => t.status === 'doing').length;
    const currentOrder = tasks.find(t => t.status === 'doing') || null;

    this.setData({
      todayTasks: tasks,
      todayStats: { completed, pending, doing },
      nextOrder: tasks.find(t => t.status === 'pending') || null,
      currentOrder
    });
  },

  // 加载当前进行中的订单
  loadCurrentOrder() {
    const doingTask = this.data.todayTasks.find(t => t.status === 'doing');
    this.setData({
      currentOrder: doingTask || null
    });
  },

  // 加载绩效数据
  loadPerformanceData() {
    const monthlyScore = 85;
    const levelInfo = util.calcPerformanceLevel(monthlyScore);
    
    this.setData({
      monthlyScore,
      performanceLevel: levelInfo.level,
      attendanceScore: 90,
      efficiencyScore: 80,
      qualityScore: 85
    });
  },

  // 跳转到考勤页面
  goToAttendance() {
    wx.switchTab({
      url: '/pages/attendance/attendance'
    });
  },

  // 上班打卡
  goToWorkCheckIn() {
    if (this.data.hasWorkCheckIn) return;
    
    wx.navigateTo({
      url: '/pages/checkin/checkin?type=work'
    });
  },

  // 到达现场打卡
  goToArriveCheckIn() {
    const { currentOrder, hasWorkCheckIn } = this.data;
    if (!currentOrder || !hasWorkCheckIn) return;
    
    if (!hasWorkCheckIn) {
      wx.showToast({
        title: '请先上班打卡',
        icon: 'none'
      });
      return;
    }
    
    wx.navigateTo({
      url: `/pages/checkin/checkin?type=arrive&orderId=${currentOrder.id}`
    });
  },

  // 完工打卡
  goToCompleteCheckIn() {
    const { currentOrder, hasWorkCheckIn } = this.data;
    if (!currentOrder || !hasWorkCheckIn) return;
    
    if (!currentOrder.hasArrive) {
      wx.showToast({
        title: '请先到达打卡',
        icon: 'none'
      });
      return;
    }
    
    wx.navigateTo({
      url: `/pages/checkin/checkin?type=complete&orderId=${currentOrder.id}`
    });
  },

  // 开始任务
  startTask(e) {
    const taskId = e.currentTarget.dataset.id;
    
    if (!this.data.hasWorkCheckIn) {
      wx.showModal({
        title: '提示',
        content: '您尚未上班打卡，是否先进行上班打卡？',
        success: (res) => {
          if (res.confirm) {
            this.goToWorkCheckIn();
          }
        }
      });
      return;
    }
    
    // 更新任务状态为进行中
    const tasks = this.data.todayTasks.map(t => {
      if (t.id === taskId) {
        return { ...t, status: 'doing', statusText: '进行中' };
      }
      return t;
    });
    
    this.setData({ todayTasks: tasks });
    this.loadCurrentOrder();
  },

  // 开始下一个订单
  startNextOrder(e) {
    const orderId = e.currentTarget.dataset.id;
    this.startTask({ currentTarget: { dataset: { id: orderId } } });
  },

  // 查看任务
  viewTask(e) {
    const taskId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/delivery-detail/delivery-detail?id=${taskId}`
    });
  },

  // 跳转到问题上报
  goToProblem() {
    wx.navigateTo({
      url: '/pages/problem/problem'
    });
  },

  // 跳转到绩效页面
  goToPerformance() {
    wx.switchTab({
      url: '/pages/performance/performance'
    });
  },

  // 跳转到奖金页面
  goToBonus() {
    wx.navigateTo({
      url: '/pages/bonus/bonus'
    });
  },

  // 跳转到费用报销
  goToReimbursement() {
    wx.navigateTo({
      url: '/pages/reimbursement/reimbursement'
    });
  },

  // 跳转到行程共享
  goToTracking() {
    wx.navigateTo({
      url: '/pages/tracking/tracking?role=driver'
    });
  },

  // 跳转到临时工申请
  goToTempRequest() {
    wx.navigateTo({
      url: '/pages/temp-worker-request/temp-worker-request'
    });
  }
});
