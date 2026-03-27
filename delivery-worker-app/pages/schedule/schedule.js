// pages/schedule/schedule.js
const app = getApp();
const util = require('../../utils/util.js');

Page({
  data: {
    isWarehouseManager: true,
    currentWeek: new Date(),
    weekRange: '',
    currentMonth: '',
    weekDays: [],
    timeSlots: [],
    pendingOrders: [],
    showOrderModal: false,
    selectedOrder: null
  },

  onLoad() {
    this.initWeekDays();
    this.generateTimeSlots();
    this.loadOrders();
    this.loadPendingOrders();
  },

  onPullDownRefresh() {
    this.loadOrders();
    this.loadPendingOrders();
    wx.stopPullDownRefresh();
  },

  // 初始化星期数据
  initWeekDays() {
    const weekStart = new Date(this.data.currentWeek);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    
    const weekDays = [];
    const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
    const today = util.formatDate(new Date());
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      
      weekDays.push({
        dayName: dayNames[i],
        dayNum: date.getDate(),
        date: util.formatDate(date),
        isToday: util.formatDate(date) === today,
        hasOrder: false
      });
    }

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    this.setData({
      weekDays,
      weekRange: `${weekStart.getMonth() + 1}.${weekStart.getDate()}-${weekEnd.getMonth() + 1}.${weekEnd.getDate()}`,
      currentMonth: `${weekStart.getFullYear()}年${weekStart.getMonth() + 1}月`
    });
  },

  // 生成时间段
  generateTimeSlots() {
    const slots = [];
    for (let hour = 6; hour <= 22; hour++) {
      const timeSlots = [];
      for (let i = 0; i < 7; i++) {
        timeSlots.push({
          orders: [],
          isPast: false
        });
      }
      
      slots.push({
        time: hour,
        label: `${hour.toString().padStart(2, '0')}:00`,
        slots: timeSlots
      });
    }
    
    this.setData({ timeSlots: slots });
  },

  // 加载订单数据
  loadOrders() {
    // 模拟订单数据
    const orders = [
      {
        id: '1',
        orderNo: 'ZL-20241028-001',
        customerName: 'XX会展公司',
        address: '上海市浦东新区张江高科技园区',
        scheduledTime: '09:00-11:00',
        goodsCount: 15,
        scale: '大',
        status: 'assigned',
        assigned: true,
        assignedStaff: '张三、李四',
        vehicle: '沪A12345（自有）',
        estimatedHours: 4,
        carts: 2,
        cages: 5,
        date: '2024-10-28',
        startHour: 9
      },
      {
        id: '2',
        orderNo: 'ZL-20241028-002',
        customerName: 'YY科技公司',
        address: '上海市徐汇区漕河泾开发区',
        scheduledTime: '14:00-16:00',
        goodsCount: 8,
        scale: '中',
        status: 'unassigned',
        assigned: false,
        assignedStaff: '',
        vehicle: '',
        estimatedHours: 2.5,
        carts: 1,
        cages: 3,
        date: '2024-10-28',
        startHour: 14
      },
      {
        id: '3',
        orderNo: 'ZL-20241028-T001',
        customerName: 'ZZ商贸中心',
        address: '上海市静安区南京西路',
        scheduledTime: '10:00-12:00',
        goodsCount: 5,
        scale: '小',
        status: 'temp',
        assigned: false,
        isTemp: true,
        isUrgent: true,
        estimatedHours: 1.5,
        carts: 1,
        cages: 2,
        date: '2024-10-28',
        startHour: 10
      }
    ];

    // 将订单分配到对应的时间段
    const timeSlots = this.data.timeSlots;
    const weekDays = this.data.weekDays;
    
    orders.forEach(order => {
      const dayIndex = weekDays.findIndex(d => d.date === order.date);
      const hourIndex = timeSlots.findIndex(t => t.time === order.startHour);
      
      if (dayIndex >= 0 && hourIndex >= 0) {
        timeSlots[hourIndex].slots[dayIndex].orders.push(order);
        weekDays[dayIndex].hasOrder = true;
      }
    });

    this.setData({ timeSlots, weekDays });
  },

  // 加载待处理订单
  loadPendingOrders() {
    this.setData({
      pendingOrders: [
        {
          id: '4',
          orderNo: 'ZL-20241028-004',
          customerName: 'AA酒店',
          scheduledTime: '16:00-18:00',
          goodsCount: 12,
          assigned: false,
          isTemp: false,
          isUrgent: false
        },
        {
          id: '5',
          orderNo: 'ZL-20241028-T002',
          customerName: 'BB会议中心',
          scheduledTime: '立即',
          goodsCount: 20,
          assigned: false,
          isTemp: true,
          isUrgent: true
        }
      ]
    });
  },

  // 切换周
  changeWeek(e) {
    const direction = e.currentTarget.dataset.direction;
    const current = new Date(this.data.currentWeek);
    
    if (direction === 'prev') {
      current.setDate(current.getDate() - 7);
    } else {
      current.setDate(current.getDate() + 7);
    }
    
    this.setData({ currentWeek: current });
    this.initWeekDays();
    this.loadOrders();
  },

  // 回到今天
  goToToday() {
    this.setData({ currentWeek: new Date() });
    this.initWeekDays();
    this.loadOrders();
  },

  // 点击时段
  onSlotTap(e) {
    const { time, day } = e.currentTarget.dataset;
    console.log('点击时段:', time, day);
    // 可以弹出快速添加订单的弹窗
  },

  // 点击订单
  onOrderTap(e) {
    const id = e.currentTarget.dataset.id;
    const order = this.findOrderById(id);
    
    this.setData({
      selectedOrder: order,
      showOrderModal: true
    });
  },

  // 查找订单
  findOrderById(id) {
    for (const slot of this.data.timeSlots) {
      for (const daySlot of slot.slots) {
        const order = daySlot.orders.find(o => o.id === id);
        if (order) return order;
      }
    }
    return this.data.pendingOrders.find(o => o.id === id);
  },

  // 关闭弹窗
  closeModal() {
    this.setData({ showOrderModal: false });
  },

  // 编辑订单
  editOrder() {
    const orderId = this.data.selectedOrder.id;
    this.closeModal();
    
    wx.navigateTo({
      url: `/pages/order-edit/order-edit?id=${orderId}`
    });
  },

  // 上传临时订单
  uploadTempOrder() {
    wx.navigateTo({
      url: '/pages/temp-order-upload/temp-order-upload'
    });
  },

  // 跳转到验收
  goToInspection() {
    wx.navigateTo({
      url: '/pages/inspection/inspection'
    });
  },

  // 跳转到统计
  goToStats() {
    wx.navigateTo({
      url: '/pages/warehouse-stats/warehouse-stats'
    });
  }
});
