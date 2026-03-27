const { get } = require('../utils/request.js');
const util = require('../utils/util.js');
const { isMockFallbackEnabled } = require('../utils/runtimeSettings.js');
const { extractList } = require('../utils/responseParser.js');

function getMockSummary() {
  const monthlyScore = 85;
  return {
    monthlyScore,
    performanceInfo: util.calcPerformanceLevel(monthlyScore),
    rank: 5,
    totalStaff: 28,
    attendanceScore: 90,
    onTimeRate: 96,
    lateCount: 1,
    absentCount: 0,
    efficiencyScore: 80,
    taskOnTimeRate: 92,
    avgSetupTime: 2.3,
    overtimeTasks: 2,
    qualityScore: 85,
    complaintCount: 0,
    damageCount: 1,
    reworkCount: 0,
    ratingScore: 88,
    avgRating: 4.7,
    positiveRate: 94
  };
}

function getMockTrend(timeRange) {
  if (timeRange === 'day') {
    return [
      { label: '8点', value: 85 },
      { label: '10点', value: 92 },
      { label: '12点', value: 78 },
      { label: '14点', value: 88 },
      { label: '16点', value: 95 },
      { label: '18点', value: 82 }
    ];
  }
  if (timeRange === 'week') {
    return [
      { label: '周一', value: 88 },
      { label: '周二', value: 92 },
      { label: '周三', value: 85 },
      { label: '周四', value: 78 },
      { label: '周五', value: 90 },
      { label: '周六', value: 95 },
      { label: '周日', value: 82 }
    ];
  }
  return [
    { label: '第1周', value: 82 },
    { label: '第2周', value: 88 },
    { label: '第3周', value: 92 },
    { label: '第4周', value: 85 }
  ];
}

function getMockTeamRankings() {
  return [
    { id: 1, name: '王五', score: 95, isMe: false },
    { id: 2, name: '赵六', score: 92, isMe: false },
    { id: 3, name: '孙七', score: 90, isMe: false },
    { id: 4, name: '周八', score: 87, isMe: false },
    { id: 5, name: '张三', score: 85, isMe: true },
    { id: 6, name: '李四', score: 82, isMe: false },
    { id: 7, name: '吴九', score: 78, isMe: false },
    { id: 8, name: '郑十', score: 75, isMe: false }
  ];
}

async function getPerformanceSummary(timeRange = 'month') {
  try {
    return await get('/performance/summary', { timeRange }, { showErrorToast: false });
  } catch (e) {
    if (!isMockFallbackEnabled()) {
      throw e;
    }
    return getMockSummary();
  }
}

async function getPerformanceTrend(timeRange = 'month') {
  try {
    const res = await get('/performance/trend', { timeRange }, { showErrorToast: false });
    return extractList(res);
  } catch (e) {
    if (!isMockFallbackEnabled()) {
      throw e;
    }
    return getMockTrend(timeRange);
  }
}

async function getTeamRankings(timeRange = 'month') {
  try {
    const res = await get('/performance/rankings', { timeRange }, { showErrorToast: false });
    return extractList(res);
  } catch (e) {
    if (!isMockFallbackEnabled()) {
      throw e;
    }
    return getMockTeamRankings();
  }
}

module.exports = {
  getPerformanceSummary,
  getPerformanceTrend,
  getTeamRankings
};
