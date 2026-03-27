// pages/bonus/bonus.js
const bonusService = require('../../services/bonusService.js');
const uiFeedback = require('../../utils/uiFeedback.js');

Page({
  data: {
    currentYear: 2024,
    currentMonth: 10,
    isCurrentMonth: true,
    monthlyBonus: 876,
    bonusStatus: 'pending', // paid | pending
    performanceInfo: { level: 'B', coefficient: 1.2, color: '#1890ff' },
    
    // 基础奖金
    baseBonus: {
      fullAttendance: 300
    },
    
    // 效率奖金
    efficiencyBonus: {
      onTime: 200,
      overtime: -100
    },
    onTimeRate: 96,
    overtimeCount: 2,
    
    // 质量奖金
    qualityBonus: {
      noComplaint: 300,
      goodRating: 150,
      damage: -100
    },
    avgRating: 4.7,
    damageAmount: 200,
    
    // 计算合计
    baseTotal: 300,
    efficiencyTotal: 100,
    qualityTotal: 350,
    subtotal: 750,
    
    // 亮点和建议
    highlights: [
      { icon: '🎉', text: '连续3周零投诉' },
      { icon: '📈', text: '工作效率提升15%' },
      { icon: '👏', text: '获得客户书面表扬1次' }
    ],
    suggestions: [
      '加强装车前检查，减少物品遗漏',
      '复杂场地提前15分钟出发'
    ],
    
    // 历史记录
    bonusHistory: []
  },

  onLoad() {
    const now = new Date();
    this.setData({
      currentYear: now.getFullYear(),
      currentMonth: now.getMonth() + 1,
      isCurrentMonth: true
    });
    this.loadBonusData();
    this.loadBonusHistory();
  },

  // 切换月份
  async changeMonth(e) {
    const direction = e.currentTarget.dataset.direction;
    let { currentYear, currentMonth } = this.data;
    
    if (direction === 'prev') {
      currentMonth--;
      if (currentMonth < 1) {
        currentMonth = 12;
        currentYear--;
      }
    } else {
      const now = new Date();
      if (currentYear < now.getFullYear() || 
          (currentYear === now.getFullYear() && currentMonth < now.getMonth() + 1)) {
        currentMonth++;
        if (currentMonth > 12) {
          currentMonth = 1;
          currentYear++;
        }
      }
    }
    
    const now = new Date();
    const isCurrentMonth = currentYear === now.getFullYear() && currentMonth === now.getMonth() + 1;
    
    this.setData({
      currentYear,
      currentMonth,
      isCurrentMonth
    });

    await this.loadBonusData();
  },

  // 加载奖金数据
  async loadBonusData() {
    const data = await uiFeedback.withLoading(() => bonusService.getBonusData(this.data.currentYear, this.data.currentMonth), {
      title: '加载中...'
    });
    this.setData(data);
  },

  // 加载历史记录
  async loadBonusHistory() {
    const history = await bonusService.getBonusHistory();
    this.setData({ bonusHistory: history });
  },

  // 提交申诉
  submitAppeal() {
    wx.showModal({
      title: '申请复核',
      content: '您确定要对本月奖金计算申请复核吗？',
      confirmText: '确定',
      cancelText: '取消',
      success: async (res) => {
        if (res.confirm) {
          await bonusService.submitBonusAppeal({
            year: this.data.currentYear,
            month: this.data.currentMonth,
            amount: this.data.monthlyBonus,
            reason: '用户发起复核'
          });
          uiFeedback.showSuccess('申请已提交');
        }
      }
    });
  }
});
