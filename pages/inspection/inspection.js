// pages/inspection/inspection.js
const app = getApp();
const util = require('../../utils/util.js');

Page({
  data: {
    pendingInspections: [],
    inspectionHistory: [],
    damageTypes: ['报废', '维修'],
    showDamageModal: false,
    currentOrderId: '',
    currentGoodsList: [],
    damageGoodsIndex: 0,
    damageCount: 1,
    damageType: 'scrap',
    damageDesc: ''
  },

  onLoad() {
    this.loadPendingInspections();
    this.loadInspectionHistory();
  },

  onPullDownRefresh() {
    this.loadPendingInspections();
    wx.stopPullDownRefresh();
  },

  // 加载待验收订单
  loadPendingInspections() {
    this.setData({
      pendingInspections: [
        {
          id: '1',
          orderNo: 'ZL-20241028-001',
          customerName: 'XX会展公司',
          date: '2024-10-28',
          isExpanded: true,
          goodsList: [
            { id: 1, name: '会议桌', spec: '1.2m', expectedQty: 2, actualQty: 2 },
            { id: 2, name: '会议椅', spec: '黑色', expectedQty: 10, actualQty: 10 },
            { id: 3, name: '演讲台', spec: '木质', expectedQty: 1, actualQty: 0, missing: 1 }
          ],
          assignedCarts: 2,
          assignedCages: 5,
          returnedCarts: 2,
          returnedCages: 4,
          hasDamage: true,
          damages: [
            { id: 1, goodsName: '运输笼', count: 1, typeIndex: 1, type: 'repair' }
          ],
          totalMissing: 1,
          totalScrap: 0,
          totalRepair: 1,
          totalNormal: 12,
          remark: ''
        }
      ]
    });
  },

  // 加载历史记录
  loadInspectionHistory() {
    this.setData({
      inspectionHistory: [
        {
          id: 'H1',
          orderNo: 'ZL-20241025-002',
          inspectTime: '2024-10-25 18:30',
          staff: '张三、李四',
          totalMissing: 0,
          totalScrap: 1,
          totalRepair: 2,
          totalNormal: 15
        },
        {
          id: 'H2',
          orderNo: 'ZL-20241024-001',
          inspectTime: '2024-10-24 17:00',
          staff: '王五',
          totalMissing: 2,
          totalScrap: 0,
          totalRepair: 0,
          totalNormal: 8
        }
      ]
    });
  },

  // 展开/收起
  toggleExpand(e) {
    const id = e.currentTarget.dataset.id;
    const inspections = this.data.pendingInspections.map(item => {
      if (item.id === id) {
        return { ...item, isExpanded: !item.isExpanded };
      }
      return item;
    });
    this.setData({ pendingInspections: inspections });
  },

  // 更新实收数量
  onActualQtyInput(e) {
    const { order, goods } = e.currentTarget.dataset;
    const value = parseInt(e.detail.value) || 0;
    
    const inspections = this.data.pendingInspections.map(item => {
      if (item.id === order) {
        const goodsList = item.goodsList.map(g => {
          if (g.id == goods) {
            const missing = g.expectedQty - value;
            return { ...g, actualQty: value, missing: missing > 0 ? missing : 0 };
          }
          return g;
        });
        return { ...item, goodsList };
      }
      return item;
    });
    
    this.setData({ pendingInspections: inspections });
    this.updateSummary(order);
  },

  // 更新汇总
  updateSummary(orderId) {
    const order = this.data.pendingInspections.find(o => o.id === orderId);
    if (!order) return;
    
    let totalMissing = 0;
    order.goodsList.forEach(g => {
      totalMissing += g.missing || 0;
    });
    
    const inspections = this.data.pendingInspections.map(item => {
      if (item.id === orderId) {
        return { ...item, totalMissing };
      }
      return item;
    });
    
    this.setData({ pendingInspections: inspections });
  },

  // 显示添加损坏弹窗
  addDamage(e) {
    const id = e.currentTarget.dataset.id;
    const order = this.data.pendingInspections.find(o => o.id === id);
    
    this.setData({
      currentOrderId: id,
      currentGoodsList: order.goodsList,
      showDamageModal: true,
      damageGoodsIndex: 0,
      damageCount: 1,
      damageType: 'scrap',
      damageDesc: ''
    });
  },

  // 关闭损坏弹窗
  closeDamageModal() {
    this.setData({ showDamageModal: false });
  },

  // 确认添加损坏
  confirmAddDamage() {
    const goods = this.data.currentGoodsList[this.data.damageGoodsIndex];
    
    const inspections = this.data.pendingInspections.map(item => {
      if (item.id === this.data.currentOrderId) {
        const damages = [...item.damages, {
          id: Date.now(),
          goodsName: goods.name,
          count: this.data.damageCount,
          typeIndex: this.data.damageType === 'scrap' ? 0 : 1,
          type: this.data.damageType
        }];
        
        const totalScrap = damages.filter(d => d.type === 'scrap').reduce((sum, d) => sum + d.count, 0);
        const totalRepair = damages.filter(d => d.type === 'repair').reduce((sum, d) => sum + d.count, 0);
        
        return { ...item, damages, totalScrap, totalRepair, hasDamage: true };
      }
      return item;
    });
    
    this.setData({ pendingInspections: inspections });
    this.closeDamageModal();
  },

  // 提交验收
  submitInspection(e) {
    const id = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认提交',
      content: '提交后将同步到员工绩效记录，是否确认？',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '验收成功', icon: 'success' });
          // 实际项目中这里会提交到服务器并发送通知
        }
      }
    });
  },

  // 跳转到统计
  goToStats() {
    wx.navigateTo({ url: '/pages/warehouse-stats/warehouse-stats' });
  },

  // 跳转到维修
  goToRepair() {
    wx.navigateTo({ url: '/pages/repair-manage/repair-manage' });
  }
});
