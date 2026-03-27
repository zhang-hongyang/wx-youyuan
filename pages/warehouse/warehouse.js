// pages/warehouse/warehouse.js
const app = getApp();
const { canAccessPage } = require('../../utils/rbac.js');

Page({
  data: {
    todayOrders: 8,
    pendingInspections: 3,
    pendingRepairs: 5,
    lowStockItems: 2,
    todayOrderList: [
      { id: 1, time: '09:00', orderNo: 'ZL-001', customerName: 'XX会展', assigned: true, staff: '张三', status: 'completed', statusText: '已完成' },
      { id: 2, time: '14:00', orderNo: 'ZL-002', customerName: 'YY科技', assigned: true, staff: '李四', status: 'inprogress', statusText: '进行中' },
      { id: 3, time: '16:00', orderNo: 'ZL-003', customerName: 'ZZ商贸', assigned: false, status: 'pending', statusText: '待安排' }
    ],
    lowStockList: [
      { name: '板车', icon: '🛒', current: 3, min: 5, unit: '辆' },
      { name: '运输笼', icon: '📦', current: 8, min: 10, unit: '个' }
    ]
  },

  onLoad() {
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo') || {};
    if (!canAccessPage('/pages/warehouse/warehouse', userInfo)) {
      wx.showToast({ title: '无权限访问', icon: 'none' });
      setTimeout(() => {
        wx.switchTab({ url: '/pages/index/index' });
      }, 300);
      return;
    }

    this.loadData();
  },

  loadData() {
    // 加载库管工作台数据
  },

  // 跳转页面
  goToSchedule() {
    wx.navigateTo({ url: '/pages/schedule/schedule' });
  },
  goToTempUpload() {
    wx.navigateTo({ url: '/pages/temp-order-upload/temp-order-upload' });
  },
  goToInspection() {
    wx.navigateTo({ url: '/pages/inspection/inspection' });
  },
  goToRepair() {
    wx.navigateTo({ url: '/pages/repair-manage/repair-manage' });
  },
  goToStats() {
    wx.navigateTo({ url: '/pages/warehouse-stats/warehouse-stats' });
  },
  goToInventory() {
    wx.navigateTo({ url: '/pages/inventory-manage/inventory-manage' });
  },
  showQuickMenu() {
    wx.showActionSheet({
      itemList: ['新建订单', '临时订单', '快速验收'],
      success: (res) => {
        const pages = ['/pages/order-edit/order-edit', '/pages/temp-order-upload/temp-order-upload', '/pages/inspection/inspection'];
        wx.navigateTo({ url: pages[res.tapIndex] });
      }
    });
  }
});
