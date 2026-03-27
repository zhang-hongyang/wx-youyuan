// pages/temp-worker-request/temp-worker-request.js
const app = getApp();
const util = require('../../utils/util.js');

Page({
  data: {
    orderId: '',
    orderInfo: {
      orderNo: 'ZL-20241028-001',
      scale: 'large',
      scaleName: '大型订单',
      goodsCount: 15,
      estimatedHours: 4
    },
    
    // 申请数量
    tempCount: 2,
    suggestedCount: 2,
    
    // 工作时长
    estimatedHours: 4,
    showCustomHours: false,
    customHours: '',
    
    // 申请原因
    reasonOptions: ['货物较多', '大件搬运', '紧急订单', '人手不足', '其他'],
    selectedReason: '',
    customReason: '',
    showCustomReason: false,
    
    // 工作说明
    workDescription: '',
    
    // 费用
    hourlyRate: 30,
    
    // 历史记录
    requestHistory: [],
    isSubmitting: false
  },

  onLoad(options) {
    const orderId = options.orderId;
    this.setData({ orderId });
    this.loadOrderInfo(orderId);
    this.calculateSuggestedCount();
    this.loadHistory();
  },

  // 加载订单信息
  loadOrderInfo(orderId) {
    // 根据订单规模建议人数
    const orderScales = {
      '1': { scale: 'large', scaleName: '大型订单', goodsCount: 15, estimatedHours: 4 },
      '2': { scale: 'medium', scaleName: '中型订单', goodsCount: 8, estimatedHours: 2.5 },
      '3': { scale: 'small', scaleName: '小型订单', goodsCount: 5, estimatedHours: 1.5 }
    };
    
    this.setData({
      orderInfo: orderScales[orderId] || orderScales['1']
    });
  },

  // 计算建议人数
  calculateSuggestedCount() {
    const { goodsCount } = this.data.orderInfo;
    let suggested = 1;
    if (goodsCount > 12) suggested = 3;
    else if (goodsCount > 8) suggested = 2;
    
    this.setData({
      suggestedCount: suggested,
      tempCount: suggested
    });
  },

  // 减少人数
  decreaseCount() {
    if (this.data.tempCount > 1) {
      this.setData({
        tempCount: this.data.tempCount - 1
      });
    }
  },

  // 增加人数
  increaseCount() {
    if (this.data.tempCount < 5) {
      this.setData({
        tempCount: this.data.tempCount + 1
      });
    }
  },

  // 选择时长
  selectHours(e) {
    this.setData({
      estimatedHours: e.currentTarget.dataset.hours,
      showCustomHours: false
    });
  },

  // 切换自定义时长
  toggleCustomHours() {
    this.setData({
      showCustomHours: !this.data.showCustomHours,
      estimatedHours: this.data.showCustomHours ? 4 : 0
    });
  },

  // 输入自定义时长
  onCustomHoursInput(e) {
    const hours = parseInt(e.detail.value) || 0;
    this.setData({
      customHours: e.detail.value,
      estimatedHours: hours
    });
  },

  // 选择原因
  selectReason(e) {
    const reason = e.currentTarget.dataset.reason;
    this.setData({
      selectedReason: reason,
      showCustomReason: reason === '其他'
    });
  },

  // 输入自定义原因
  onCustomReasonInput(e) {
    this.setData({ customReason: e.detail.value });
  },

  // 输入工作说明
  onWorkDescriptionInput(e) {
    this.setData({ workDescription: e.detail.value });
  },

  // 计算预估费用
  getEstimatedCost() {
    const { tempCount, estimatedHours, hourlyRate } = this.data;
    return tempCount * estimatedHours * hourlyRate;
  },

  // 加载历史记录
  loadHistory() {
    this.setData({
      requestHistory: [
        {
          id: 'REQ_001',
          orderNo: 'ZL-20241020-002',
          count: 2,
          hours: 3,
          cost: 180,
          status: 'approved',
          statusText: '已通过'
        },
        {
          id: 'REQ_002',
          orderNo: 'ZL-20241015-005',
          count: 1,
          hours: 4,
          cost: 120,
          status: 'rejected',
          statusText: '已拒绝'
        }
      ]
    });
  },

  // 检查是否可以提交
  canSubmit() {
    const { tempCount, estimatedHours, selectedReason } = this.data;
    
    if (tempCount < 1) return false;
    if (estimatedHours < 1) return false;
    if (!selectedReason) return false;
    if (selectedReason === '其他' && !this.data.customReason.trim()) return false;
    
    return true;
  },

  // 提交申请
  submitRequest() {
    if (!this.canSubmit()) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }

    this.setData({ isSubmitting: true });

    const requestData = {
      id: 'TEMP_REQ_' + Date.now(),
      orderId: this.data.orderId,
      orderNo: this.data.orderInfo.orderNo,
      count: this.data.tempCount,
      hours: this.data.estimatedHours,
      reason: this.data.selectedReason === '其他' ? this.data.customReason : this.data.selectedReason,
      workDescription: this.data.workDescription,
      cost: this.getEstimatedCost(),
      status: 'pending',
      statusText: '待审核',
      createTime: util.formatTime(new Date()),
      applyBy: app.globalData.userInfo.id
    };

    // 保存到本地存储
    const requests = wx.getStorageSync('tempWorkerRequests') || [];
    requests.unshift(requestData);
    wx.setStorageSync('tempWorkerRequests', requests);

    setTimeout(() => {
      this.setData({ isSubmitting: false });
      
      wx.showToast({
        title: '申请已提交',
        icon: 'success'
      });

      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }, 1500);
  }
});
