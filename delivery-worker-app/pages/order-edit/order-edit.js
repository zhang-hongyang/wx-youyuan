// pages/order-edit/order-edit.js
const app = getApp();
const util = require('../../utils/util.js');

Page({
  data: {
    orderId: '',
    orderInfo: {
      orderNo: 'ZL-20241028-001',
      customerName: 'XX会展公司',
      address: '上海市浦东新区张江高科技园区',
      scheduledTime: '09:00-11:00',
      goodsCount: 15,
      scale: '大型',
      status: 'unassigned',
      statusText: '待安排'
    },

    // 人员
    formalStaff: [],
    tempStaff: [],
    selectedStaff: [],

    // 车辆
    ownVehicles: [],
    selectedVehicle: '',
    selectedVehicleType: '',
    externalVehicleRemark: '',

    // 物资
    inventory: {
      carts: 10,
      cages: 20
    },
    assignedCarts: 0,
    assignedCages: 0,

    // 时间预算
    timeOptions: ['15分钟', '30分钟', '45分钟', '1小时', '1.5小时', '2小时'],
    setupTimeOptions: ['1小时', '1.5小时', '2小时', '2.5小时', '3小时', '4小时', '5小时'],
    loadTimeIndex: 1,
    travelTimeIndex: 2,
    setupTimeIndex: 2,
    totalEstimatedHours: 2.5,

    // 备注
    remark: ''
  },

  onLoad(options) {
    const orderId = options.id;
    this.setData({ orderId });
    this.loadOrderInfo(orderId);
    this.loadStaff();
    this.loadVehicles();
    this.calculateTotalTime();
  },

  // 加载订单信息
  loadOrderInfo(orderId) {
    // 模拟数据
    const orderData = {
      id: orderId,
      orderNo: 'ZL-20241028-001',
      customerName: 'XX会展公司',
      address: '上海市浦东新区张江高科技园区',
      scheduledTime: '09:00-11:00',
      goodsCount: 15,
      scale: '大型',
      status: 'unassigned',
      statusText: '待安排',
      assigned: false
    };
    
    this.setData({ orderInfo: orderData });
  },

  // 加载人员
  loadStaff() {
    this.setData({
      formalStaff: [
        { id: 1, name: '张三', skills: ['家具安装', '大件搬运'], todayTasks: 2, available: true, selected: false },
        { id: 2, name: '李四', skills: ['设备调试', '电工'], todayTasks: 1, available: true, selected: false },
        { id: 3, name: '王五', skills: ['家具安装', '设备调试'], todayTasks: 3, available: false, selected: false },
        { id: 4, name: '赵六', skills: ['大件搬运'], todayTasks: 0, available: true, selected: false }
      ],
      tempStaff: [
        { id: 'T1', name: '临时工A', phone: '138****0001', available: true, selected: false },
        { id: 'T2', name: '临时工B', phone: '138****0002', available: true, selected: false },
        { id: 'T3', name: '临时工C', phone: '138****0003', available: false, selected: false }
      ]
    });
  },

  // 加载车辆
  loadVehicles() {
    this.setData({
      ownVehicles: [
        { id: 'V1', plate: '沪A12345', type: '厢式货车', capacity: '3吨', available: true },
        { id: 'V2', plate: '沪B67890', type: '平板货车', capacity: '5吨', available: false },
        { id: 'V3', plate: '沪C11111', type: '面包车', capacity: '1吨', available: true }
      ]
    });
  },

  // 切换人员选择
  toggleStaff(e) {
    const { id, type } = e.currentTarget.dataset;
    const key = type === 'formal' ? 'formalStaff' : 'tempStaff';
    const staff = this.data[key].map(item => {
      if (item.id == id) {
        // 只有空闲的才能选择
        if (item.available || item.selected) {
          return { ...item, selected: !item.selected };
        }
      }
      return item;
    });
    
    this.setData({ [key]: staff });
    this.updateSelectedStaff();
  },

  // 更新已选人员
  updateSelectedStaff() {
    const formalSelected = this.data.formalStaff.filter(s => s.selected);
    const tempSelected = this.data.tempStaff.filter(s => s.selected);
    this.setData({
      selectedStaff: [...formalSelected, ...tempSelected]
    });
  },

  // 选择自有车辆
  selectVehicle(e) {
    const { id } = e.currentTarget.dataset;
    const vehicle = this.data.ownVehicles.find(v => v.id === id);
    
    if (!vehicle.available) return;
    
    this.setData({
      selectedVehicle: this.data.selectedVehicle === id ? '' : id,
      selectedVehicleType: ''
    });
  },

  // 选择外部车辆
  selectExternalVehicle(e) {
    const { type } = e.currentTarget.dataset;
    this.setData({
      selectedVehicleType: type,
      selectedVehicle: ''
    });
  },

  // 输入外部车辆备注
  onExternalRemarkInput(e) {
    this.setData({ externalVehicleRemark: e.detail.value });
  },

  // 板车数量
  decreaseCarts() {
    if (this.data.assignedCarts > 0) {
      this.setData({ assignedCarts: this.data.assignedCarts - 1 });
    }
  },
  increaseCarts() {
    if (this.data.assignedCarts < this.data.inventory.carts) {
      this.setData({ assignedCarts: this.data.assignedCarts + 1 });
    }
  },

  // 运输笼数量
  decreaseCages() {
    if (this.data.assignedCages > 0) {
      this.setData({ assignedCages: this.data.assignedCages - 1 });
    }
  },
  increaseCages() {
    if (this.data.assignedCages < this.data.inventory.cages) {
      this.setData({ assignedCages: this.data.assignedCages + 1 });
    }
  },

  // 时间选择
  onLoadTimeChange(e) {
    this.setData({ loadTimeIndex: e.detail.value });
    this.calculateTotalTime();
  },
  onTravelTimeChange(e) {
    this.setData({ travelTimeIndex: e.detail.value });
    this.calculateTotalTime();
  },
  onSetupTimeChange(e) {
    this.setData({ setupTimeIndex: e.detail.value });
    this.calculateTotalTime();
  },

  // 计算总时间
  calculateTotalTime() {
    const loadMinutes = [15, 30, 45, 60, 90, 120][this.data.loadTimeIndex];
    const travelMinutes = [15, 30, 45, 60, 90, 120][this.data.travelTimeIndex];
    const setupMinutes = [60, 90, 120, 150, 180, 240, 300][this.data.setupTimeIndex];
    
    const totalHours = ((loadMinutes + travelMinutes + setupMinutes) / 60).toFixed(1);
    this.setData({ totalEstimatedHours: totalHours });
  },

  // 输入备注
  onRemarkInput(e) {
    this.setData({ remark: e.detail.value });
  },

  // 申请更多临时工
  requestMoreTemp() {
    wx.navigateTo({
      url: '/pages/temp-worker-request/temp-worker-request'
    });
  },

  // 检查是否可以提交
  canSubmit() {
    const { selectedStaff, selectedVehicle, selectedVehicleType } = this.data;
    
    if (selectedStaff.length === 0) return false;
    if (!selectedVehicle && !selectedVehicleType) return false;
    
    return true;
  },

  // 提交安排
  submitArrangement() {
    if (!this.canSubmit()) {
      wx.showToast({
        title: '请选择人员和车辆',
        icon: 'none'
      });
      return;
    }

    const arrangementData = {
      orderId: this.data.orderId,
      staff: this.data.selectedStaff.map(s => ({ id: s.id, name: s.name })),
      vehicle: this.data.selectedVehicle 
        ? this.data.ownVehicles.find(v => v.id === this.data.selectedVehicle)
        : { type: this.data.selectedVehicleType, remark: this.data.externalVehicleRemark },
      inventory: {
        carts: this.data.assignedCarts,
        cages: this.data.assignedCages
      },
      estimatedTime: {
        load: this.data.timeOptions[this.data.loadTimeIndex],
        travel: this.data.timeOptions[this.data.travelTimeIndex],
        setup: this.data.setupTimeOptions[this.data.setupTimeIndex],
        total: this.data.totalEstimatedHours
      },
      remark: this.data.remark,
      status: 'assigned',
      arrangeTime: util.formatTime(new Date()),
      arrangeBy: app.globalData.userInfo.id
    };

    // 保存到本地存储
    const arrangements = wx.getStorageSync('arrangements') || [];
    const index = arrangements.findIndex(a => a.orderId === this.data.orderId);
    if (index >= 0) {
      arrangements[index] = arrangementData;
    } else {
      arrangements.push(arrangementData);
    }
    wx.setStorageSync('arrangements', arrangements);

    // 发送通知给选中的员工
    this.sendNotificationToStaff();

    wx.showToast({
      title: '安排成功',
      icon: 'success'
    });

    setTimeout(() => {
      wx.navigateBack();
    }, 1500);
  },

  // 发送通知给员工
  sendNotificationToStaff() {
    // 实际项目中这里应该调用推送API
    console.log('发送通知给:', this.data.selectedStaff);
    
    wx.showModal({
      title: '通知已发送',
      content: `已向 ${this.data.selectedStaff.length} 位员工发送任务通知`,
      showCancel: false
    });
  }
});
