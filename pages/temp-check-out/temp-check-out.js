// pages/temp-check-out/temp-check-out.js
const app = getApp();
const util = require('../../utils/util.js');

Page({
  data: {
    workerInfo: {
      id: 'TEMP_001',
      name: '临时工A',
      phone: '138****0001'
    },
    orderInfo: {
      orderNo: 'ZL-20241028-001',
      customerName: 'XX会展公司',
      supervisor: '张三'
    },
    checkInTime: '08:30',
    currentTime: '',
    currentDate: '',
    location: {
      address: '',
      verified: false
    },
    workCompleted: false,
    toolsReturned: false,
    siteCleaned: false,
    photos: [],
    feedback: '',
    hasSignature: false,
    signaturePath: '',
    canvasContext: null,
    canvas: null,
    
    // 费用计算
    hourlyRate: 30,
    workDuration: 0,
    estimatedIncome: 0,
    
    isSubmitting: false
  },

  onLoad(options) {
    this.updateTime();
    this.getLocation();
    this.calculateWorkDuration();
    
    // 定时更新时间
    this.timeTimer = setInterval(() => {
      this.updateTime();
    }, 1000);
  },

  onReady() {
    this.initCanvas();
  },

  onUnload() {
    if (this.timeTimer) {
      clearInterval(this.timeTimer);
    }
  },

  // 更新时间
  updateTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    
    this.setData({
      currentTime: `${hours}:${minutes}`,
      currentDate: util.formatDate(now)
    });
    
    // 重新计算工作时长
    this.calculateWorkDuration();
  },

  // 计算工作时长
  calculateWorkDuration() {
    const checkIn = new Date(`2024-10-28 ${this.data.checkInTime}`);
    const now = new Date();
    const diffHours = (now - checkIn) / (1000 * 60 * 60);
    const hours = Math.round(diffHours * 10) / 10;
    
    this.setData({
      workDuration: hours,
      estimatedIncome: Math.round(hours * this.data.hourlyRate)
    });
  },

  // 获取位置
  getLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        // 模拟地址
        this.setData({
          location: {
            address: '上海市浦东新区张江高科技园区XX路123号',
            verified: true,
            latitude: res.latitude,
            longitude: res.longitude
          }
        });
      },
      fail: () => {
        this.setData({
          location: {
            address: '定位失败，请手动刷新',
            verified: false
          }
        });
      }
    });
  },

  // 刷新位置
  refreshLocation() {
    wx.showLoading({ title: '定位中...' });
    this.getLocation();
    setTimeout(() => {
      wx.hideLoading();
    }, 1000);
  },

  // 工作确认变化
  onWorkConfirmChange(e) {
    const values = e.detail.value;
    this.setData({
      workCompleted: values.includes('completed'),
      toolsReturned: values.includes('tools'),
      siteCleaned: values.includes('site')
    });
  },

  // 拍照
  takePhoto() {
    wx.chooseMedia({
      count: 4 - this.data.photos.length,
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

  // 输入反馈
  onFeedbackInput(e) {
    this.setData({ feedback: e.detail.value });
  },

  // 初始化画布
  initCanvas() {
    const query = wx.createSelectorQuery();
    query.select('#supervisorSign')
      .fields({ node: true, size: true })
      .exec((res) => {
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        
        canvas.width = res[0].width;
        canvas.height = res[0].height;
        
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        this.canvasContext = ctx;
        this.canvas = canvas;
      });
  },

  // 开始签名
  startSign(e) {
    const { x, y } = e.touches[0];
    this.canvasContext.beginPath();
    this.canvasContext.moveTo(x, y);
    this.setData({ hasSignature: true });
  },

  // 签名移动
  moveSign(e) {
    const { x, y } = e.touches[0];
    this.canvasContext.lineTo(x, y);
    this.canvasContext.stroke();
  },

  // 结束签名
  endSign() {
    this.canvasContext.closePath();
  },

  // 清除签名
  clearSignature() {
    const { width, height } = this.canvas;
    this.canvasContext.clearRect(0, 0, width, height);
    this.setData({ hasSignature: false, signaturePath: '' });
  },

  // 保存签名
  saveSignature() {
    if (!this.data.hasSignature) {
      wx.showToast({ title: '请先签字', icon: 'none' });
      return;
    }
    
    wx.canvasToTempFilePath({
      canvas: this.canvas,
      success: (res) => {
        this.setData({ signaturePath: res.tempFilePath });
        wx.showToast({ title: '签名已保存', icon: 'success' });
      }
    });
  },

  // 检查是否可以提交
  canSubmit() {
    const { location, workCompleted, toolsReturned, siteCleaned, photos } = this.data;
    
    if (!location.verified) return false;
    if (!workCompleted || !toolsReturned || !siteCleaned) return false;
    if (photos.length === 0) return false;
    
    return true;
  },

  // 提交下班打卡
  submitCheckOut() {
    if (!this.canSubmit()) {
      const { location, workCompleted, toolsReturned, siteCleaned, photos } = this.data;
      
      let msg = '';
      if (!location.verified) msg = '请等待位置确认';
      else if (!workCompleted || !toolsReturned || !siteCleaned) msg = '请完成所有工作确认项';
      else if (photos.length === 0) msg = '请至少拍摄一张照片';
      
      wx.showToast({ title: msg, icon: 'none' });
      return;
    }

    this.setData({ isSubmitting: true });

    const checkOutData = {
      id: util.generateId(),
      workerId: this.data.workerInfo.id,
      workerName: this.data.workerInfo.name,
      orderId: this.data.orderInfo.orderNo,
      checkInTime: this.data.checkInTime,
      checkOutTime: this.data.currentTime,
      workDuration: this.data.workDuration,
      hourlyRate: this.data.hourlyRate,
      totalIncome: this.data.estimatedIncome,
      location: this.data.location,
      photos: this.data.photos,
      feedback: this.data.feedback,
      signature: this.data.signaturePath,
      status: 'pending',
      statusText: '待审核',
      submitTime: util.formatTime(new Date())
    };

    // 保存到本地存储
    const checkOuts = wx.getStorageSync('tempCheckOuts') || [];
    checkOuts.unshift(checkOutData);
    wx.setStorageSync('tempCheckOuts', checkOuts);

    setTimeout(() => {
      this.setData({ isSubmitting: false });
      
      wx.showModal({
        title: '下班打卡成功',
        content: `工作时长：${this.data.workDuration}小时\n预计收入：¥${this.data.estimatedIncome}\n\n请等待负责人审核确认`,
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
    }, 1500);
  }
});
