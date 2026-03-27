// pages/warehouse-stats/warehouse-stats.js
Page({
  data: {
    selectedMonth: '2024-10',
    activeTab: 'damage',
    totalScrap: 15,
    totalRepair: 28,
    totalLoss: 5600,
    scrapPercent: 35,
    repairPercent: 65,
    damageTrend: [
      { date: '10/01', value: 2 },
      { date: '10/05', value: 3 },
      { date: '10/10', value: 1 },
      { date: '10/15', value: 4 },
      { date: '10/20', value: 2 },
      { date: '10/25', value: 3 },
      { date: '10/30', value: 1 }
    ],
    damageRank: [
      { name: '运输笼', count: 12, percent: 80 },
      { name: '会议椅', count: 8, percent: 60 },
      { name: '板车', count: 5, percent: 40 },
      { name: '指示牌', count: 3, percent: 25 }
    ],
    inventoryStats: [
      { name: '板车', icon: '🛒', stock: 10, unit: '辆', trend: -5 },
      { name: '运输笼', icon: '📦', stock: 20, unit: '个', trend: 10 },
      { name: '折叠椅', icon: '🪑', stock: 50, unit: '把', trend: 0 }
    ]
  },

  onMonthChange(e) {
    this.setData({ selectedMonth: e.detail.value });
  },
  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
  }
});
