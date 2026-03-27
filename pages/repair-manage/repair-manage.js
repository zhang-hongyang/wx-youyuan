// pages/repair-manage/repair-manage.js
Page({
  data: {
    pendingRepairs: [
      { id: 1, goodsName: '运输笼', count: 2, orderNo: 'ZL-20241025-001', reportDate: '2024-10-25' },
      { id: 2, goodsName: '会议椅', count: 1, orderNo: 'ZL-20241026-002', reportDate: '2024-10-26' },
      { id: 3, goodsName: '板车', count: 1, orderNo: 'ZL-20241027-003', reportDate: '2024-10-27' }
    ],
    inProgressRepairs: [
      { id: 4, goodsName: '演讲台', count: 1, orderNo: 'ZL-20241020-001', estimatedCompleteDate: '2024-10-30', progress: 60 }
    ],
    completedRepairs: [
      { id: 5, goodsName: '指示牌', count: 2, orderNo: 'ZL-20241015-001', completeDate: '2024-10-18' }
    ],
    todayReminders: [
      { id: 4, goodsName: '演讲台' }
    ]
  },

  arrangeRepair(e) {
    wx.showModal({
      title: '安排维修',
      content: '确定要安排维修此物品吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '已安排维修', icon: 'success' });
        }
      }
    });
  }
});
