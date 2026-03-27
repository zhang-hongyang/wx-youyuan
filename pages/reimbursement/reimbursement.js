// pages/reimbursement/reimbursement.js
const app = getApp();
const util = require('../../utils/util.js');
const reimbursementService = require('../../services/reimbursementService.js');
const { normalizeUserRole } = require('../../utils/rbac.js');

Page({
  data: {
    userRole: '',
    isFinanceReviewMode: false,
    reviewFilter: 'pending',
    reviewList: [],
    reviewStats: {
      pending: 0,
      approved: 0,
      rejected: 0
    },
    rejectReasonTemplates: [
      '发票缺失或不清晰',
      '账单截图与金额不一致',
      '费用类型选择错误',
      '超出报销标准，请补充说明'
    ],

    orders: [],
    selectedOrderIndex: -1,
    
    // 报销类型
    expenseTypes: [
      { type: 'meal', name: '在外就餐', icon: '🍽️', requireInvoice: false },
      { type: 'parking', name: '停车费', icon: '🅿️', requireInvoice: true },
      { type: 'toll', name: '过路费', icon: '🛣️', requireInvoice: true },
      { type: 'fuel', name: '加油费', icon: '⛽', requireInvoice: true },
      { type: 'repair', name: '维修费', icon: '🔧', requireInvoice: true },
      { type: 'other', name: '其他费用', icon: '📋', requireInvoice: true }
    ],
    expenseType: '',
    selectedExpenseType: { type: 'meal', name: '在外就餐', icon: '🍽️', requireInvoice: false },
    
    // 费用信息
    amount: '',
    expenseDate: '',
    description: '',
    
    // 图片
    invoices: [],
    billImages: [],
    otherImages: [],
    
    // 历史记录
    reimbursementHistory: [],
    isSubmitting: false,
    canSubmit: false
  },

  onLoad() {
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo') || {};
    const userRole = normalizeUserRole(userInfo);
    const isFinanceReviewMode = userRole === 'finance' || userRole === 'admin';

    this.setData({
      userRole,
      isFinanceReviewMode
    });

    if (isFinanceReviewMode) {
      this.loadReviewList();
      return;
    }

    this.loadOrders();
    this.loadHistory();
    this.updateSubmitState();
    
    // 默认设置今天日期
    this.setData({
      expenseDate: util.formatDate(new Date())
    });
  },

  onShow() {
    if (this.data.isFinanceReviewMode) {
      this.loadReviewList();
      return;
    }
    this.loadHistory();
    this.updateSubmitState();
  },

  async loadReviewList() {
    try {
      const list = await reimbursementService.getReviewQueue({ status: this.data.reviewFilter });
      const stats = {
        pending: list.filter(item => item.status === 'pending').length,
        approved: list.filter(item => item.status === 'approved').length,
        rejected: list.filter(item => item.status === 'rejected').length
      };
      this.setData({
        reviewList: list,
        reviewStats: stats
      });
    } catch (e) {
      wx.showToast({
        title: e.message || '加载审核列表失败',
        icon: 'none'
      });
    }
  },

  onReviewFilterTap(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({ reviewFilter: value });
    this.loadReviewList();
  },

  async approveReimbursement(e) {
    const id = e.currentTarget.dataset.id;
    await this.submitReviewDecision(id, 'approved', '财务审核通过');
  },

  async rejectReimbursement(e) {
    const id = e.currentTarget.dataset.id;
    const reasonTemplates = this.data.rejectReasonTemplates || [];
    wx.showActionSheet({
      itemList: reasonTemplates,
      success: async (res) => {
        const reviewComment = reasonTemplates[res.tapIndex] || '审核未通过';
        await this.submitReviewDecision(id, 'rejected', reviewComment);
      }
    });
  },

  async submitReviewDecision(id, decision, reviewComment = '') {
    if (!id) {
      return;
    }

    const actionText = decision === 'approved' ? '通过' : '拒绝';
    wx.showLoading({ title: '处理中...' });
    try {
      await reimbursementService.reviewReimbursement({
        id,
        decision,
        reviewComment
      });
      wx.hideLoading();
      wx.showToast({ title: `已${actionText}`, icon: 'success' });
      this.loadReviewList();
    } catch (e) {
      wx.hideLoading();
      wx.showToast({
        title: e.message || `${actionText}失败`,
        icon: 'none'
      });
    }
  },

  // 加载订单列表
  async loadOrders() {
    const orders = await reimbursementService.getOrders();
    this.setData({ orders });
  },

  // 选择订单
  onOrderChange(e) {
    this.setData({
      selectedOrderIndex: parseInt(e.detail.value)
    });
    this.updateSubmitState();
  },

  // 选择费用类型
  selectExpenseType(e) {
    const type = e.currentTarget.dataset.type;
    const selectedType = this.data.expenseTypes.find(t => t.type === type);
    
    this.setData({
      expenseType: type,
      selectedExpenseType: selectedType
    });
    this.updateSubmitState();
  },

  // 输入金额
  onAmountInput(e) {
    this.setData({ amount: e.detail.value });
    this.updateSubmitState();
  },

  // 选择日期
  onDateChange(e) {
    this.setData({ expenseDate: e.detail.value });
  },

  // 输入说明
  onDescriptionInput(e) {
    this.setData({ description: e.detail.value });
  },

  // 选择发票图片
  chooseInvoice() {
    wx.chooseMedia({
      count: 4 - this.data.invoices.length,
      mediaType: ['image'],
      sourceType: ['camera', 'album'],
      success: (res) => {
        const newImages = res.tempFiles.map(f => f.tempFilePath);
        this.setData({
          invoices: [...this.data.invoices, ...newImages]
        });
        this.updateSubmitState();
      }
    });
  },

  // 选择账单截图
  chooseBillImage() {
    wx.chooseMedia({
      count: 4 - this.data.billImages.length,
      mediaType: ['image'],
      sourceType: ['camera', 'album'],
      success: (res) => {
        const newImages = res.tempFiles.map(f => f.tempFilePath);
        this.setData({
          billImages: [...this.data.billImages, ...newImages]
        });
        this.updateSubmitState();
      }
    });
  },

  // 选择其他凭证
  chooseOtherImage() {
    wx.chooseMedia({
      count: 4 - this.data.otherImages.length,
      mediaType: ['image'],
      sourceType: ['camera', 'album'],
      success: (res) => {
        const newImages = res.tempFiles.map(f => f.tempFilePath);
        this.setData({
          otherImages: [...this.data.otherImages, ...newImages]
        });
      }
    });
  },

  // 预览图片
  previewImage(e) {
    const { list, index } = e.currentTarget.dataset;
    const urls = this.data[list];
    wx.previewImage({
      current: urls[index],
      urls: urls
    });
  },

  // 删除图片
  deleteImage(e) {
    const { list, index } = e.currentTarget.dataset;
    const images = this.data[list].filter((_, i) => i !== index);
    this.setData({ [list]: images });
    this.updateSubmitState();
  },

  // 加载历史记录
  async loadHistory() {
    const reimbursementHistory = await reimbursementService.getHistory();
    this.setData({ reimbursementHistory });
  },

  // 查看全部历史
  viewAllHistory() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

  // 检查是否可以提交
  checkCanSubmit() {
    const { selectedOrderIndex, expenseType, amount, billImages, selectedExpenseType, invoices } = this.data;
    
    if (selectedOrderIndex < 0) return false;
    if (!expenseType) return false;
    if (!amount || parseFloat(amount) <= 0) return false;
    if (billImages.length === 0) return false;
    
    // 需要发票的类型必须上传发票
    if (selectedExpenseType.requireInvoice && invoices.length === 0) {
      return false;
    }
    
    return true;
  },

  updateSubmitState() {
    this.setData({
      canSubmit: this.checkCanSubmit()
    });
  },

  // 提交报销
  submitReimbursement() {
    if (!this.checkCanSubmit()) {
      const { selectedExpenseType, invoices } = this.data;
      
      if (selectedExpenseType.requireInvoice && invoices.length === 0) {
        wx.showModal({
          title: '缺少发票',
          content: `${selectedExpenseType.name}必须上传发票照片才能报销。如无法提供发票，请选择其他费用类型或放弃报销。`,
          showCancel: false,
          confirmText: '我知道了'
        });
        return;
      }
      
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }

    // 检查发票要求
    const { selectedExpenseType, invoices } = this.data;
    if (selectedExpenseType.requireInvoice && invoices.length === 0) {
      wx.showModal({
        title: '确认提交',
        content: `${selectedExpenseType.name}需要发票才能报销，您尚未上传发票，确定要提交吗？（可能会被拒绝）`,
        success: (res) => {
          if (res.confirm) {
            this.doSubmit();
          }
        }
      });
    } else {
      this.doSubmit();
    }
  },

  // 执行提交
  async doSubmit() {
    this.setData({ isSubmitting: true });

    const reimbursementData = reimbursementService.buildReimbursementPayload({
      orders: this.data.orders,
      selectedOrderIndex: this.data.selectedOrderIndex,
      expenseType: this.data.expenseType,
      selectedExpenseType: this.data.selectedExpenseType,
      amount: this.data.amount,
      expenseDate: this.data.expenseDate,
      description: this.data.description,
      invoices: this.data.invoices,
      billImages: this.data.billImages,
      otherImages: this.data.otherImages,
      userId: app.globalData.userInfo ? app.globalData.userInfo.id : ''
    });

    try {
      await reimbursementService.submitReimbursement(reimbursementData);
      this.setData({ isSubmitting: false });

      wx.showToast({
        title: '提交成功',
        icon: 'success'
      });

      // 重置表单
      this.setData({
        selectedOrderIndex: -1,
        expenseType: '',
        amount: '',
        description: '',
        invoices: [],
        billImages: [],
        otherImages: [],
        canSubmit: false
      });

      this.loadHistory();
    } catch (e) {
      this.setData({ isSubmitting: false });
      wx.showToast({
        title: '提交失败，请重试',
        icon: 'none'
      });
    }
  }
});
