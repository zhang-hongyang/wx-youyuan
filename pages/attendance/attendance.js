// pages/attendance/attendance.js - 新考勤逻辑
const app = getApp();
const util = require('../../utils/util.js');
const attendanceService = require('../../services/attendanceService.js');

Page({
  data: {
    currentDate: '',
    weekDay: '',
    isToday: true,
    records: {},
    orderRecords: [],
    attendanceStatus: 'normal',
    attendanceStatusText: '正常',
    todayTaskCount: 3,
    completedCount: 1,
    lateCount: 0,
    workHours: 0,
    weekDays: []
  },

  onLoad() {
    this.initDate();
    this.loadWeekDays();
    this.loadAttendanceData();
  },

  onShow() {
    this.loadAttendanceData();
  },

  // 初始化日期
  initDate() {
    const today = new Date();
    this.setData({
      currentDate: util.formatDate(today),
      weekDay: this.getWeekDayName(today),
      isToday: true
    });
  },

  // 获取星期名称
  getWeekDayName(date) {
    return attendanceService.getWeekDayName(date);
  },

  // 切换日期
  changeDate(e) {
    const direction = e.currentTarget.dataset.direction;
    const current = new Date(this.data.currentDate.replace(/-/g, '/'));
    
    if (direction === 'prev') {
      current.setDate(current.getDate() - 1);
    } else if (direction === 'next' && !this.data.isToday) {
      current.setDate(current.getDate() + 1);
    }
    
    const today = util.formatDate(new Date());
    const newDate = util.formatDate(current);
    
    this.setData({
      currentDate: newDate,
      weekDay: this.getWeekDayName(current),
      isToday: newDate === today
    });
    
    this.loadAttendanceData();
  },

  // 加载周历数据
  loadWeekDays() {
    const weekDays = attendanceService.getWeekDays(new Date());
    this.setData({ weekDays });
  },

  // 加载考勤数据
  loadAttendanceData() {
    const attendanceData = attendanceService.getAttendanceByDate(this.data.currentDate);
    
    this.setData({
      records: attendanceData.records,
      orderRecords: attendanceData.orderRecords,
      workHours: attendanceData.workHours,
      completedCount: attendanceData.completedCount
    });
    
    this.updateWeekDaysStatus();
  },

  // 更新周历状态
  updateWeekDaysStatus() {
    const updatedWeekDays = attendanceService.applyWeekStatus(this.data.weekDays);
    this.setData({ weekDays: updatedWeekDays });
  },

  // 选择日期
  selectDate(e) {
    const date = e.currentTarget.dataset.date;
    const today = util.formatDate(new Date());
    
    this.setData({
      currentDate: date,
      weekDay: this.getWeekDayName(new Date(date.replace(/-/g, '/'))),
      isToday: date === today
    });
    
    this.loadAttendanceData();
  },

  // 跳转到上班打卡页面
  goToWorkCheckIn() {
    if (!this.data.isToday) {
      wx.showToast({ title: '只能打卡当天', icon: 'none' });
      return;
    }
    
    wx.navigateTo({
      url: '/pages/checkin/checkin?type=work'
    });
  }
});
