// pages/tracking/tracking.js
const app = getApp();
const util = require('../../utils/util.js');

Page({
  data: {
    isDriver: false,
    isSharing: false,
    currentLocation: {
      latitude: 31.2304,
      longitude: 121.4737
    },
    mapScale: 14,
    markers: [],
    polyline: [],
    etaTime: '10:30',
    remainingDistance: 2.5,
    driverInfo: {
      name: '张三',
      phone: '138****1234',
      userType: 'formal',
      rating: 4.8,
      deliveryCount: 156
    },
    orderInfo: {
      orderNo: 'ZL-20241028-001',
      address: '上海市浦东新区张江高科技园区XX路123号',
      scheduledTime: '10:00-12:00'
    },
    deliveryProgress: [
      { status: 'picked', label: '已取货', completed: true, time: '08:30' },
      { status: 'departed', label: '已出发', completed: true, time: '09:15' },
      { status: 'delivering', label: '配送中', completed: true, time: '09:45', active: true },
      { status: 'arrived', label: '已到达', completed: false, time: '' },
      { status: 'completed', label: '已完成', completed: false, time: '' }
    ],
    lastUpdateTime: '刚刚',
    locationTimer: null
  },

  onLoad(options) {
    // 判断是司机端还是客户端
    const isDriver = options.role === 'driver';
    this.setData({ isDriver });
    
    this.loadOrderInfo();
    this.initLocation();
  },

  onShow() {
    if (this.data.isDriver && this.data.isSharing) {
      this.startLocationUpdate();
    }
  },

  onHide() {
    this.stopLocationUpdate();
  },

  onUnload() {
    this.stopLocationUpdate();
  },

  // 初始化位置
  initLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        const location = {
          latitude: res.latitude,
          longitude: res.longitude
        };
        
        this.setData({
          currentLocation: location,
          markers: [{
            id: 1,
            latitude: res.latitude,
            longitude: res.longitude,
            iconPath: '/images/driver_marker.png',
            width: 40,
            height: 40,
            title: '配送员位置'
          }, {
            id: 2,
            latitude: res.latitude + 0.01,
            longitude: res.longitude + 0.01,
            iconPath: '/images/destination_marker.png',
            width: 40,
            height: 40,
            title: '目的地'
          }],
          polyline: [{
            points: [
              { latitude: res.latitude, longitude: res.longitude },
              { latitude: res.latitude + 0.01, longitude: res.longitude + 0.01 }
            ],
            color: '#1890ff',
            width: 6,
            arrowLine: true
          }]
        });
        
        this.calculateETA();
      }
    });
  },

  // 加载订单信息
  loadOrderInfo() {
    // 从本地存储或服务器获取订单信息
    const orderInfo = wx.getStorageSync('currentOrder');
    if (orderInfo) {
      this.setData({ orderInfo });
    }
  },

  // 计算预计到达时间
  calculateETA() {
    // 根据距离和速度计算ETA
    const speed = 30; // km/h
    const time = (this.data.remainingDistance / speed) * 60; // 分钟
    const now = new Date();
    const eta = new Date(now.getTime() + time * 60000);
    
    this.setData({
      etaTime: `${eta.getHours().toString().padStart(2, '0')}:${eta.getMinutes().toString().padStart(2, '0')}`
    });
  },

  // 开始位置更新（司机端）
  startLocationUpdate() {
    // 开始位置上报
    this.data.locationTimer = setInterval(() => {
      this.updateLocation();
    }, 30000); // 30秒更新一次
    
    // 开启后台定位
    wx.startLocationUpdateBackground({
      success: () => {
        console.log('开始后台定位');
      },
      fail: (err) => {
        console.error('后台定位失败:', err);
      }
    });
  },

  // 停止位置更新
  stopLocationUpdate() {
    if (this.data.locationTimer) {
      clearInterval(this.data.locationTimer);
      this.setData({ locationTimer: null });
    }
    wx.stopLocationUpdate();
  },

  // 更新位置
  updateLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        const location = {
          latitude: res.latitude,
          longitude: res.longitude
        };
        
        this.setData({
          currentLocation: location,
          'markers[0].latitude': res.latitude,
          'markers[0].longitude': res.longitude,
          lastUpdateTime: util.formatTime(new Date(), 'hh:mm')
        });
        
        // 上传到服务器，供客户查看
        this.uploadLocation(location);
      }
    });
  },

  // 上传位置到服务器
  uploadLocation(location) {
    // 实际项目中这里调用API上传位置
    console.log('上传位置:', location);
  },

  // 定位到当前位置
  locateCurrent() {
    const mapCtx = wx.createMapContext('deliveryMap');
    mapCtx.moveToLocation();
  },

  // 切换地图类型
  changeMapType() {
    wx.showActionSheet({
      itemList: ['标准地图', '卫星地图', '路况地图'],
      success: (res) => {
        const types = ['standard', 'satellite', 'traffic'];
        // 设置地图类型
        console.log('切换地图类型:', types[res.tapIndex]);
      }
    });
  },

  // 联系司机
  contactDriver() {
    wx.makePhoneCall({
      phoneNumber: this.data.driverInfo.phone.replace(/\*/g, '')
    });
  },

  // 呼叫司机
  callDriver() {
    wx.makePhoneCall({
      phoneNumber: this.data.driverInfo.phone.replace(/\*/g, '')
    });
  },

  // 分享位置（司机端）
  shareLocation() {
    this.setData({ isSharing: true });
    this.startLocationUpdate();
    
    // 生成分享链接
    const sharePath = `/pages/tracking/tracking?orderId=${this.data.orderInfo.orderNo}&role=customer`;
    
    wx.showModal({
      title: '位置共享已开启',
      content: '客户可以通过订单详情查看您的实时位置',
      showCancel: false
    });
  },

  // 停止共享
  stopSharing() {
    this.setData({ isSharing: false });
    this.stopLocationUpdate();
    
    wx.showToast({
      title: '已停止共享位置',
      icon: 'success'
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.updateLocation();
    wx.stopPullDownRefresh();
  }
});
