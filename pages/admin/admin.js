// pages/admin/admin.js
const app = getApp();
const util = require('../../utils/util.js');
const { canAccessPage } = require('../../utils/rbac.js');

Page({
  data: {
    currentDate: '',
    overview: {
      onlineStaff: 12,
      todayTasks: 28,
      completedTasks: 18,
      abnormalTasks: 2
    },
    staffStatus: [],
    alerts: [],
    periods: ['本周', '本月', '本季度'],
    periodIndex: 1,
    teamRanking: [],
    metrics: {
      attendanceRate: 96,
      attendanceTrend: 2,
      onTimeRate: 92,
      onTimeTrend: 3,
      avgRating: 4.6,
      ratingTrend: 0.2,
      complaintRate: 1.2,
      complaintTrend: -0.5
    }
  },

  onLoad() {
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo') || {};
    if (!canAccessPage('/pages/admin/admin', userInfo)) {
      wx.showToast({ title: '无权限访问', icon: 'none' });
      setTimeout(() => {
        wx.switchTab({ url: '/pages/index/index' });
      }, 300);
      return;
    }

    this.setData({
      currentDate: util.formatDate(new Date())
    });
    this.loadStaffStatus();
    this.loadAlerts();
    this.loadTeamRanking();
  },

  // 加载人员状态
  loadStaffStatus() {
    this.setData({
      staffStatus: [
        { id: 1, name: '张三', status: 'working', statusText: '进行中', currentTask: 'ZL-20241028-002', location: '徐汇区漕河泾', phone: '13800138001' },
        { id: 2, name: '李四', status: 'working', statusText: '进行中', currentTask: 'ZL-20241028-005', location: '静安区南京西路', phone: '13800138002' },
        { id: 3, name: '王五', status: 'resting', statusText: '休息中', phone: '13800138003' },
        { id: 4, name: '赵六', status: 'warning', statusText: '超时提醒', currentTask: 'ZL-20241028-001', location: '浦东新区张江', phone: '13800138004' }
      ]
    });
  },

  // 加载异常提醒
  loadAlerts() {
    this.setData({
      alerts: [
        { id: 1, level: 'error', icon: '⏰', type: '任务超时', description: '赵六的任务已超时30%，请关注', staffName: '赵六', time: '10:30' },
        { id: 2, level: 'warning', icon: '⚠️', type: '问题上报', description: '孙七上报货品损坏，需处理', staffName: '孙七', time: '09:45' }
      ]
    });
  },

  // 加载团队排行
  loadTeamRanking() {
    this.setData({
      teamRanking: [
        { id: 1, name: '王五', score: 95, bonus: 1050, isTop3: true },
        { id: 2, name: '赵六', score: 92, bonus: 980, isTop3: true },
        { id: 3, name: '孙七', score: 90, bonus: 920, isTop3: true },
        { id: 4, name: '张三', score: 85, bonus: 876, isTop3: false },
        { id: 5, name: '李四', score: 82, bonus: 820, isTop3: false }
      ]
    });
  },

  // 刷新数据
  refreshData() {
    wx.showLoading({ title: '刷新中...' });
    setTimeout(() => {
      this.loadStaffStatus();
      wx.hideLoading();
      wx.showToast({ title: '刷新成功', icon: 'success' });
    }, 1000);
  },

  // 拨打电话
  callStaff(e) {
    const phone = e.currentTarget.dataset.phone;
    wx.makePhoneCall({ phoneNumber: phone });
  },

  // 处理异常
  handleAlert(e) {
    const id = e.currentTarget.dataset.id;
    wx.showActionSheet({
      itemList: ['查看详情', '指派处理', '标记已处理'],
      success: (res) => {
        console.log('选择：', res.tapIndex);
      }
    });
  },

  // 切换周期
  onPeriodChange(e) {
    this.setData({ periodIndex: e.detail.value });
    this.loadTeamRanking();
  },

  // 导出报表
  exportReport() {
    wx.showActionSheet({
      itemList: ['导出考勤报表', '导出绩效报表', '导出奖金报表'],
      success: (res) => {
        wx.showToast({ title: '导出成功', icon: 'success' });
      }
    });
  },

  // 人员管理
  manageStaff() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

  // 申诉审核
  reviewAppeals() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

  // 系统设置
  systemSettings() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
  }
});
