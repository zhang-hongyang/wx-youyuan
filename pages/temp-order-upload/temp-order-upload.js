// pages/temp-order-upload/temp-order-upload.js
const app = getApp();
const util = require('../../utils/util.js');

Page({
  data: {
    customerName: '',
    customerPhone: '',
    address: '',
    orderDate: '',
    orderTime: '',
    urgency: 'normal',
    goodsList: [{ name: '', qty: '' }]
  },

  onLoad() {
    const now = new Date();
    this.setData({
      orderDate: util.formatDate(now),
      orderTime: `${now.getHours() + 1}:00`
    });
  },

  onCustomerNameInput(e) { this.setData({ customerName: e.detail.value }); },
  onCustomerPhoneInput(e) { this.setData({ customerPhone: e.detail.value }); },
  onAddressInput(e) { this.setData({ address: e.detail.value }); },
  onDateChange(e) { this.setData({ orderDate: e.detail.value }); },
  onTimeChange(e) { this.setData({ orderTime: e.detail.value }); },
  selectUrgency(e) { this.setData({ urgency: e.currentTarget.dataset.value }); },

  addGoods() {
    this.setData({ goodsList: [...this.data.goodsList, { name: '', qty: '' }] });
  },
  deleteGoods(e) {
    const index = e.currentTarget.dataset.index;
    const list = this.data.goodsList.filter((_, i) => i !== index);
    this.setData({ goodsList: list });
  },
  onGoodsNameInput(e) {
    const index = e.currentTarget.dataset.index;
    const list = this.data.goodsList;
    list[index].name = e.detail.value;
    this.setData({ goodsList: list });
  },
  onGoodsQtyInput(e) {
    const index = e.currentTarget.dataset.index;
    const list = this.data.goodsList;
    list[index].qty = e.detail.value;
    this.setData({ goodsList: list });
  },

  canSubmit() {
    const { customerName, customerPhone, address, goodsList } = this.data;
    if (!customerName || !customerPhone || !address) return false;
    if (goodsList.length === 0 || !goodsList[0].name) return false;
    return true;
  },

  submitOrder() {
    if (!this.canSubmit()) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }

    // 模拟发送通知给所有员工
    wx.showModal({
      title: '发布成功',
      content: '临时订单已发布，已通知所有员工',
      showCancel: false,
      success: () => {
        wx.navigateBack();
      }
    });
  }
});
