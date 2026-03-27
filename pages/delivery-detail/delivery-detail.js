// pages/delivery-detail/delivery-detail.js - 新送货单详情
const app = getApp();
const util = require('../../utils/util.js');
const deliveryService = require('../../services/deliveryService.js');
const { STORAGE_KEYS } = require('../../utils/constants.js');

Page({
  data: {
    taskId: '',
    task: {},
    goodsList: [],
    timeline: [],
    problems: [],
    rating: null,
    tempWorkerRequest: null,
    hasWorkCheckIn: false
  },

  onLoad(options) {
    const taskId = options.id;
    this.setData({ taskId });
    this.initPageData(taskId);
  },

  async initPageData(taskId) {
    await this.loadTaskDetail(taskId);
    await Promise.all([
      this.loadGoodsList(taskId),
      this.loadProblems(taskId),
      this.loadRating(taskId),
      this.loadTempWorkerRequest(taskId)
    ]);
    this.loadTimeline();
    this.checkWorkCheckIn();
  },

  // 检查是否已上班打卡
  checkWorkCheckIn() {
    const today = util.formatDate(new Date());
    const records = wx.getStorageSync(STORAGE_KEYS.CHECKIN_RECORDS) || [];
    const hasWorkCheckIn = records.some(r => r.date === today && r.type === 'work');
    this.setData({ hasWorkCheckIn });
  },

  // 加载任务详情
  async loadTaskDetail(taskId) {
    const task = await deliveryService.getTaskDetail(taskId);
    this.setData({ task });
  },

  // 加载货品清单
  async loadGoodsList(taskId) {
    const goodsList = await deliveryService.getGoodsList(taskId);
    this.setData({ goodsList });
  },

  // 加载时间线（新的三阶段打卡）
  loadTimeline() {
    const timeline = deliveryService.getTimeline(this.data.task);
    this.setData({ timeline });
  },

  // 加载问题记录
  async loadProblems(taskId) {
    const problems = await deliveryService.getProblems(taskId);
    this.setData({ problems });
  },

  // 加载客户评价
  async loadRating(taskId) {
    const rating = await deliveryService.getRating(taskId);
    this.setData({ rating });
  },

  // 加载临时工申请
  async loadTempWorkerRequest(taskId) {
    const tempWorkerRequest = await deliveryService.getTempWorkerRequest(taskId);
    this.setData({ tempWorkerRequest });
  },

  // 申请临时工
  applyTempWorker() {
    wx.navigateTo({
      url: `/pages/temp-worker-request/temp-worker-request?orderId=${this.data.taskId}`
    });
  },

  // 预览照片
  previewPhoto(e) {
    const { photos, current } = e.currentTarget.dataset;
    wx.previewImage({ current, urls: photos });
  },

  // 拨打客户电话
  callCustomer() {
    wx.makePhoneCall({ phoneNumber: this.data.task.customerPhone });
  },

  // 导航到地址
  navigateToAddress() {
    wx.showToast({ title: '导航功能', icon: 'none' });
  },

  // 上报问题
  reportProblem() {
    wx.navigateTo({ url: '/pages/problem/problem' });
  },

  // 到达现场打卡
  goToArriveCheckIn() {
    const { hasWorkCheckIn, task } = this.data;
    
    if (!hasWorkCheckIn) {
      wx.showToast({ title: '请先上班打卡', icon: 'none' });
      return;
    }
    
    if (task.hasArriveCheckIn) {
      wx.showToast({ title: '已到达打卡', icon: 'none' });
      return;
    }
    
    wx.navigateTo({
      url: `/pages/checkin/checkin?type=arrive&orderId=${task.id}`
    });
  },

  // 完工打卡
  goToCompleteCheckIn() {
    const { hasWorkCheckIn, task } = this.data;
    
    if (!hasWorkCheckIn) {
      wx.showToast({ title: '请先上班打卡', icon: 'none' });
      return;
    }
    
    if (!task.hasArriveCheckIn) {
      wx.showToast({ title: '请先到达打卡', icon: 'none' });
      return;
    }
    
    if (task.hasCompleteCheckIn) {
      wx.showToast({ title: '已完工打卡', icon: 'none' });
      return;
    }
    
    wx.navigateTo({
      url: `/pages/checkin/checkin?type=complete&orderId=${task.id}`
    });
  },

  // 继续任务
  continueTask() {
    const { task, hasWorkCheckIn } = this.data;
    
    if (!hasWorkCheckIn) {
      wx.showModal({
        title: '提示',
        content: '您尚未上班打卡，是否先进行上班打卡？',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/checkin/checkin?type=work' });
          }
        }
      });
      return;
    }
    
    if (!task.hasArriveCheckIn) {
      this.goToArriveCheckIn();
    } else if (!task.hasCompleteCheckIn) {
      this.goToCompleteCheckIn();
    }
  }
});
