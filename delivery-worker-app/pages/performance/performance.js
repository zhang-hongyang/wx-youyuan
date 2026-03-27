// pages/performance/performance.js
const util = require('../../utils/util.js');
const performanceService = require('../../services/performanceService.js');
const uiFeedback = require('../../utils/uiFeedback.js');

Page({
  data: {
    timeRange: 'month',
    monthlyScore: 85,
    performanceInfo: { level: 'B', coefficient: 1.2, color: '#1890ff' },
    rank: 5,
    totalStaff: 28,
    
    // 考勤类
    attendanceScore: 90,
    onTimeRate: 96,
    lateCount: 1,
    absentCount: 0,
    
    // 效率类
    efficiencyScore: 80,
    taskOnTimeRate: 92,
    avgSetupTime: 2.3,
    overtimeTasks: 2,
    
    // 质量类
    qualityScore: 85,
    complaintCount: 0,
    damageCount: 1,
    reworkCount: 0,
    
    // 客户评价类
    ratingScore: 88,
    avgRating: 4.7,
    positiveRate: 94,
    
    // 趋势数据
    trendData: [],
    
    // 团队排名
    teamRankings: []
  },

  onLoad() {
    this.initPerformancePage();
  },

  async initPerformancePage() {
    await uiFeedback.withLoading(async () => {
      await Promise.all([
        this.loadPerformanceData(),
        this.loadTrendData(),
        this.loadTeamRankings()
      ]);
    });
  },

  // 切换时间范围
  async switchTimeRange(e) {
    const range = e.currentTarget.dataset.range;
    this.setData({ timeRange: range });
    await uiFeedback.withLoading(async () => {
      await Promise.all([
        this.loadPerformanceData(),
        this.loadTrendData(),
        this.loadTeamRankings()
      ]);
    }, { title: '切换中...' });
  },

  // 加载绩效数据
  async loadPerformanceData() {
    const summary = await performanceService.getPerformanceSummary(this.data.timeRange);
    const performanceInfo = summary.performanceInfo || util.calcPerformanceLevel(summary.monthlyScore || 0);

    this.setData({
      ...summary,
      performanceInfo
    });
  },

  // 加载趋势数据
  async loadTrendData() {
    const data = await performanceService.getPerformanceTrend(this.data.timeRange);
    this.setData({ trendData: data });
  },

  // 加载团队排名
  async loadTeamRankings() {
    const rankings = await performanceService.getTeamRankings(this.data.timeRange);
    this.setData({ teamRankings: rankings });
  }
});
