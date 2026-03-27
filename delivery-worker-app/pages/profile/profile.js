// pages/profile/profile.js
const app = getApp();
const util = require('../../utils/util.js');
const { normalizeUserRole, hasAnyRole } = require('../../utils/rbac.js');
const { USER_ROLE } = require('../../utils/constants.js');

Page({
  data: {
    userInfo: {},
    userRole: '',
    monthlyScore: 85,
    monthlyBonus: 876,
    taskCount: 23,
    pendingProblems: 2
  },

  onLoad() {
    this.loadUserInfo();
  },

  onShow() {
    this.loadUserInfo();
  },

  // 加载用户信息
  loadUserInfo() {
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
    if (!userInfo) {
      wx.redirectTo({
        url: '/pages/login/login'
      });
      return;
    }
    this.setData({
      userInfo,
      userRole: normalizeUserRole(userInfo)
    });
  },

  isManagerRole() {
    return hasAnyRole(this.data.userInfo, [USER_ROLE.ADMIN, USER_ROLE.MANAGER]);
  },

  isWarehouseRole() {
    return hasAnyRole(this.data.userInfo, [USER_ROLE.ADMIN, USER_ROLE.WAREHOUSE]);
  },

  isFinanceRole() {
    return hasAnyRole(this.data.userInfo, [USER_ROLE.FINANCE, USER_ROLE.ADMIN]);
  },

  goToAdminPortal() {
    if (!this.isManagerRole()) {
      wx.showToast({ title: '无权限访问', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/admin/admin' });
  },

  goToWarehousePortal() {
    if (!this.isWarehouseRole()) {
      wx.showToast({ title: '无权限访问', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/warehouse/warehouse' });
  },

  goToFinancePortal() {
    if (!this.isFinanceRole()) {
      wx.showToast({ title: '无权限访问', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/reimbursement/reimbursement' });
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

  // 跳转到考勤页面
  goToAttendance() {
    wx.switchTab({
      url: '/pages/attendance/attendance'
    });
  },

  // 跳转到我的问题
  goToMyProblems() {
    wx.navigateTo({
      url: '/pages/problem/problem'
    });
  },

  // 跳转到我的申诉
  goToAppeals() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  // 跳转到设置
  goToSettings() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  // 联系客服
  contactSupport() {
    wx.makePhoneCall({
      phoneNumber: '400-888-8888',
      fail: () => {
        wx.showToast({
          title: '拨打失败',
          icon: 'none'
        });
      }
    });
  },

  // 关于
  showAbout() {
    wx.showModal({
      title: '关于',
      content: '送货人员工作台 v1.0.0\n\n为企业配送人员提供智能考勤、任务管理、绩效统计等一站式服务。',
      showCancel: false
    });
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          app.logout();
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });
          setTimeout(() => {
            wx.redirectTo({
              url: '/pages/login/login'
            });
          }, 1500);
        }
      }
    });
  }
});
