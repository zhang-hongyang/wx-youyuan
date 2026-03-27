// pages/checkin/checkin.js - 新打卡逻辑
const app = getApp();
const util = require('../../utils/util.js');
const taskService = require('../../services/taskService.js');
const checkinService = require('../../services/checkinService.js');
const { STORAGE_KEYS } = require('../../utils/constants.js');

Page({
  data: {
    checkInType: '', // work: 上班打卡, arrive: 到达现场, complete: 完工打卡
    currentTime: '',
    currentDate: '',
    weekDay: '',
    userInfo: {},
    currentOrder: null, // 当前订单信息
    
    // 定位信息
    location: {
      latitude: 0,
      longitude: 0,
      address: '',
      inRange: false
    },
    
    // 照片
    photos: [],
    maxPhotos: 4,
    
    // 备注
    remark: '',
    
    // 是否已上班打卡
    hasWorkCheckIn: false,
    
    // 类型配置
    typeConfig: {
      work: {
        icon: '🌅',
        title: '上班打卡',
        desc: '请在仓库打卡，开始今天的工作',
        buttonText: '确认上班打卡',
        needPhoto: true,
        photoTitle: '现场拍照',
        locationRange: 500
      },
      arrive: {
        icon: '📍',
        title: '到达现场',
        desc: '到达客户现场后打卡',
        buttonText: '确认到达现场',
        needPhoto: true,
        photoTitle: '现场照片',
        locationRange: 200
      },
      complete: {
        icon: '✅',
        title: '完工打卡',
        desc: '任务完成后打卡',
        buttonText: '确认完工',
        needPhoto: true,
        photoTitle: '完成照片',
        locationRange: 200
      }
    },
    
    isSubmitting: false
  },

  onLoad(options) {
    // 获取打卡类型和订单ID
    const type = options.type || 'work';
    const orderId = options.orderId;
    
    this.setData({
      checkInType: type,
      checkInTypeInfo: this.data.typeConfig[type],
      userInfo: app.globalData.userInfo || wx.getStorageSync(STORAGE_KEYS.USER_INFO),
      hasWorkCheckIn: this.checkTodayWorkCheckIn()
    });

    // 加载订单信息
    if (orderId) {
      this.loadOrderInfo(orderId);
    }

    this.updateTime();
    
    // 需要定位的类型
    if (type !== 'complete') {
      this.getLocation();
    }

    // 定时更新时间
    this.timeTimer = setInterval(() => {
      this.updateTime();
    }, 1000);
  },

  onUnload() {
    if (this.timeTimer) {
      clearInterval(this.timeTimer);
    }
  },

  // 检查今日是否已上班打卡
  checkTodayWorkCheckIn() {
    const today = util.formatDate(new Date());
    const records = wx.getStorageSync(STORAGE_KEYS.CHECKIN_RECORDS) || [];
    return records.some(r => r.date === today && r.type === 'work');
  },

  // 加载订单信息
  async loadOrderInfo(orderId) {
    const order = await taskService.getOrderById(orderId);
    this.setData({ currentOrder: order || null });
  },

  // 更新时间
  updateTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    
    this.setData({
      currentTime: `${hours}:${minutes}:${seconds}`,
      currentDate: util.formatDate(now),
      weekDay: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()]
    });
  },

  // 获取位置
  getLocation() {
    wx.showLoading({ title: '定位中...' });
    
    wx.getLocation({
      type: 'gcj02',
      isHighAccuracy: true,
      success: (res) => {
        // 模拟地址
        const mockAddress = this.getMockAddress();
        
        this.setData({
          location: {
            latitude: res.latitude,
            longitude: res.longitude,
            address: mockAddress,
            inRange: true // 实际应该检查是否在范围内
          }
        });
        
        wx.hideLoading();
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({
          title: '定位失败',
          icon: 'none'
        });
      }
    });
  },

  // 模拟地址
  getMockAddress() {
    const { checkInType, currentOrder } = this.data;
    if (checkInType === 'work') {
      return '上海市浦东新区张江高科技园区（公司仓库）';
    }
    if (currentOrder) {
      return currentOrder.address;
    }
    return '客户现场地址';
  },

  // 刷新位置
  refreshLocation() {
    this.getLocation();
  },

  // 拍照
  takePhoto() {
    wx.chooseMedia({
      count: this.data.maxPhotos - this.data.photos.length,
      mediaType: ['image'],
      sourceType: ['camera'],
      camera: 'back',
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

  // 检查是否可以提交
  canSubmit() {
    const { checkInType, photos, location } = this.data;
    
    // 所有类型都需要照片
    if (photos.length === 0) return false;
    
    // 上班打卡和到达现场需要定位
    if ((checkInType === 'work' || checkInType === 'arrive') && !location.inRange) {
      return false;
    }
    
    return true;
  },

  // 提交打卡
  async submitCheckIn() {
    if (!this.canSubmit()) {
      wx.showToast({
        title: '请拍摄照片',
        icon: 'none'
      });
      return;
    }

    this.setData({ isSubmitting: true });

    // 构建打卡记录
    const record = {
      id: util.generateId(),
      type: this.data.checkInType,
      date: this.data.currentDate,
      time: this.data.currentTime.substring(0, 5),
      timestamp: Date.now(),
      photos: this.data.photos,
      location: this.data.location,
      remark: this.data.remark,
      userId: this.data.userInfo.id,
      orderId: this.data.currentOrder ? this.data.currentOrder.id : null,
      orderNo: this.data.currentOrder ? this.data.currentOrder.orderNo : null
    };

    try {
      await checkinService.submitCheckIn(record);
      this.setData({ isSubmitting: false });

      let successMsg = '打卡成功';
      if (this.data.checkInType === 'work') {
        successMsg = '上班打卡成功，今天的工作开始了！';
      } else if (this.data.checkInType === 'arrive') {
        successMsg = '到达现场打卡成功';
      } else if (this.data.checkInType === 'complete') {
        successMsg = '完工打卡成功';
      }
      
      wx.showToast({
        title: successMsg,
        icon: 'success',
        duration: 2000
      });

      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (e) {
      this.setData({ isSubmitting: false });
      wx.showToast({
        title: '提交失败，请重试',
        icon: 'none'
      });
    }
  }
});
