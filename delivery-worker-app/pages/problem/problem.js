// pages/problem/problem.js
const app = getApp();
const problemService = require('../../services/problemService.js');
const uiFeedback = require('../../utils/uiFeedback.js');

Page({
  data: {
    selectedType: '',
    problemTypes: [
      { key: 'goods', name: '货品问题', icon: '📦' },
      { key: 'site', name: '现场施工', icon: '🔧' },
      { key: 'customer', name: '客户问题', icon: '👤' },
      { key: 'accident', name: '安全事故', icon: '⚠️' }
    ],
    
    // 货品问题子类型
    goodsSubTypes: [
      { key: 'missing', name: '少带/漏带' },
      { key: 'damaged', name: '现场破损' },
      { key: 'mismatch', name: '规格不符' }
    ],
    goodsProblem: {
      subType: '',
      missingItem: '',
      missingCount: '',
      damageReason: '',
      severity: 'medium',
      actualSpec: '',
      orderSpec: ''
    },
    damageReasons: ['运输中损坏', '出厂问题', '装车不当', '其他'],
    damageReasonIndex: -1,
    severityLevels: [
      { value: 'low', label: '轻微' },
      { value: 'medium', label: '一般' },
      { value: 'high', label: '严重' }
    ],

    // 现场施工问题
    siteIssues: [
      { key: 'size', name: '尺寸不符', checked: false },
      { key: 'power', name: '电源不足', checked: false },
      { key: 'access', name: '通道狭窄', checked: false },
      { key: 'drawing', name: '图纸不清', checked: false },
      { key: 'parts', name: '配件缺失', checked: false },
      { key: 'tools', name: '工具不足', checked: false }
    ],
    siteProblem: {
      description: ''
    },

    // 客户问题子类型
    customerSubTypes: [
      { key: 'change', name: '要求变更' },
      { key: 'attitude', name: '态度恶劣' },
      { key: 'delay', name: '延迟验收' }
    ],
    customerProblem: {
      subType: '',
      description: ''
    },

    // 安全事故子类型
    accidentSubTypes: [
      { key: 'injury', name: '人员受伤' },
      { key: 'damage', name: '物品损坏' },
      { key: 'vehicle', name: '车辆事故' }
    ],
    accidentProblem: {
      subType: ''
    },

    // 订单选择
    orders: [],
    selectedOrderIndex: -1,

    // 照片
    photos: [],

    // 补充说明
    remark: '',

    // 处理期望
    expectation: 'urgent',
    expectOptions: [
      { value: 'urgent', label: '紧急处理', icon: '🚨' },
      { value: 'normal', label: '常规处理', icon: '📋' },
      { value: 'record', label: '仅记录', icon: '📝' }
    ],

    // 历史记录
    myProblems: [],

    isSubmitting: false
  },

  onLoad() {
    this.loadOrders();
    this.loadMyProblems();
  },

  // 选择问题类型
  selectType(e) {
    this.setData({
      selectedType: e.currentTarget.dataset.type
    });
  },

  // 选择货品子类型
  selectGoodsSubType(e) {
    this.setData({
      'goodsProblem.subType': e.currentTarget.dataset.type
    });
  },

  // 输入缺少物品
  onMissingItemInput(e) {
    this.setData({ 'goodsProblem.missingItem': e.detail.value });
  },

  // 输入缺少数量
  onMissingCountInput(e) {
    this.setData({ 'goodsProblem.missingCount': e.detail.value });
  },

  // 选择破损原因
  onDamageReasonChange(e) {
    this.setData({
      damageReasonIndex: e.detail.value,
      'goodsProblem.damageReason': this.data.damageReasons[e.detail.value]
    });
  },

  // 选择严重程度
  selectSeverity(e) {
    this.setData({ 'goodsProblem.severity': e.currentTarget.dataset.value });
  },

  // 输入实际规格
  onActualSpecInput(e) {
    this.setData({ 'goodsProblem.actualSpec': e.detail.value });
  },

  // 输入订单规格
  onOrderSpecInput(e) {
    this.setData({ 'goodsProblem.orderSpec': e.detail.value });
  },

  // 切换现场问题
  toggleSiteIssue(e) {
    const index = e.currentTarget.dataset.index;
    const siteIssues = this.data.siteIssues;
    siteIssues[index].checked = !siteIssues[index].checked;
    this.setData({ siteIssues });
  },

  // 输入现场问题描述
  onSiteDescInput(e) {
    this.setData({ 'siteProblem.description': e.detail.value });
  },

  // 选择客户子类型
  selectCustomerSubType(e) {
    this.setData({ 'customerProblem.subType': e.currentTarget.dataset.type });
  },

  // 输入客户问题描述
  onCustomerDescInput(e) {
    this.setData({ 'customerProblem.description': e.detail.value });
  },

  // 选择事故子类型
  selectAccidentSubType(e) {
    this.setData({ 'accidentProblem.subType': e.currentTarget.dataset.type });
  },

  // 加载订单列表
  async loadOrders() {
    const orders = await problemService.getOrders();
    this.setData({ orders });
  },

  // 选择订单
  onOrderChange(e) {
    this.setData({ selectedOrderIndex: e.detail.value });
  },

  // 拍照
  takePhoto() {
    wx.chooseMedia({
      count: 6 - this.data.photos.length,
      mediaType: ['image'],
      sourceType: ['camera', 'album'],
      success: (res) => {
        const newPhotos = res.tempFiles.map(f => f.tempFilePath);
        this.setData({
          photos: [...this.data.photos, ...newPhotos]
        });
      }
    });
  },

  // 预览照片
  previewPhoto(e) {
    const index = e.currentTarget.dataset.index;
    wx.previewImage({
      current: this.data.photos[index],
      urls: this.data.photos
    });
  },

  // 删除照片
  deletePhoto(e) {
    const index = e.currentTarget.dataset.index;
    const photos = this.data.photos.filter((_, i) => i !== index);
    this.setData({ photos });
  },

  // 输入备注
  onRemarkInput(e) {
    this.setData({ remark: e.detail.value });
  },

  // 选择处理期望
  selectExpectation(e) {
    this.setData({ expectation: e.currentTarget.dataset.value });
  },

  // 加载我的问题记录
  async loadMyProblems() {
    const myProblems = await problemService.getMyProblems();
    this.setData({ myProblems });
  },

  // 查看全部问题
  viewAllProblems() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  // 检查是否可以提交
  canSubmit() {
    const { selectedType, photos, remark, selectedOrderIndex } = this.data;
    
    if (!selectedType) return false;
    if (selectedOrderIndex < 0) return false;
    if (photos.length === 0) return false;
    
    // 根据不同类型检查必填项
    if (selectedType === 'goods' && !this.data.goodsProblem.subType) return false;
    if (selectedType === 'customer' && !this.data.customerProblem.subType) return false;
    if (selectedType === 'accident' && !this.data.accidentProblem.subType) return false;
    
    return true;
  },

  // 提交问题
  async submitProblem() {
    if (!this.canSubmit()) {
      uiFeedback.showError('请填写完整信息');
      return;
    }

    this.setData({ isSubmitting: true });

    const problemData = problemService.buildProblemPayload({
      selectedType: this.data.selectedType,
      problemTypes: this.data.problemTypes,
      orders: this.data.orders,
      selectedOrderIndex: this.data.selectedOrderIndex,
      photos: this.data.photos,
      remark: this.data.remark,
      expectation: this.data.expectation,
      createBy: app.globalData.userInfo ? app.globalData.userInfo.id : '',
      goodsProblem: this.data.goodsProblem,
      siteIssues: this.data.siteIssues,
      siteProblem: this.data.siteProblem,
      customerProblem: this.data.customerProblem,
      accidentProblem: this.data.accidentProblem
    });

    try {
      await uiFeedback.withLoading(() => problemService.submitProblem(problemData), { title: '提交中...' });
      this.setData({ isSubmitting: false });

      // 如果是安全事故，立即通知
      if (this.data.selectedType === 'accident') {
        wx.showModal({
          title: '⚠️ 安全事故已上报',
          content: '您的安全事故报告已提交，管理人员将立即处理，请保持电话畅通！',
          showCancel: false,
          success: () => {
            wx.navigateBack();
          }
        });
      } else {
        uiFeedback.showSuccess('提交成功');
        setTimeout(() => wx.navigateBack(), 1500);
      }
    } catch (e) {
      this.setData({ isSubmitting: false });
      uiFeedback.handleError(e, '提交失败，请重试');
    }
  }
});
