const { get, post } = require('../utils/request.js');
const util = require('../utils/util.js');
const { STORAGE_KEYS } = require('../utils/constants.js');
const { isMockFallbackEnabled } = require('../utils/runtimeSettings.js');
const { extractList } = require('../utils/responseParser.js');

function buildMockBonusData(currentYear, currentMonth) {
  const monthlyScore = 85;
  const performanceInfo = util.calcPerformanceLevel(monthlyScore);

  const baseBonus = { fullAttendance: 300 };
  const efficiencyBonus = { onTime: 200, overtime: -100 };
  const qualityBonus = { noComplaint: 300, goodRating: 150, damage: -100 };

  const baseTotal = baseBonus.fullAttendance;
  const efficiencyTotal = efficiencyBonus.onTime + efficiencyBonus.overtime;
  const qualityTotal = qualityBonus.noComplaint + qualityBonus.goodRating + qualityBonus.damage;
  const subtotal = baseTotal + efficiencyTotal + qualityTotal;
  const monthlyBonus = Math.round(subtotal * performanceInfo.coefficient);

  return {
    monthlyBonus,
    bonusStatus: currentMonth === 10 ? 'pending' : 'paid',
    performanceInfo,
    baseBonus,
    efficiencyBonus,
    qualityBonus,
    baseTotal,
    efficiencyTotal,
    qualityTotal,
    subtotal,
    onTimeRate: 96,
    overtimeCount: 2,
    avgRating: 4.7,
    damageAmount: 200,
    highlights: [
      { icon: '🎉', text: '连续3周零投诉' },
      { icon: '📈', text: '工作效率提升15%' },
      { icon: '👏', text: '获得客户书面表扬1次' }
    ],
    suggestions: [
      '加强装车前检查，减少物品遗漏',
      '复杂场地提前15分钟出发'
    ]
  };
}

function getMockHistory() {
  return [
    { month: '2024年9月', amount: 920, level: 'A', levelColor: '#52c41a', status: 'paid', statusText: '已发放' },
    { month: '2024年8月', amount: 750, level: 'B', levelColor: '#1890ff', status: 'paid', statusText: '已发放' },
    { month: '2024年7月', amount: 680, level: 'C', levelColor: '#faad14', status: 'paid', statusText: '已发放' },
    { month: '2024年6月', amount: 820, level: 'B', levelColor: '#1890ff', status: 'paid', statusText: '已发放' }
  ];
}

async function getBonusData(currentYear, currentMonth) {
  try {
    return await get('/bonus/detail', { year: currentYear, month: currentMonth }, { showErrorToast: false });
  } catch (e) {
    if (!isMockFallbackEnabled()) {
      throw e;
    }
    return buildMockBonusData(currentYear, currentMonth);
  }
}

async function getBonusHistory() {
  try {
    const res = await get('/bonus/history', {}, { showErrorToast: false });
    return extractList(res);
  } catch (e) {
    if (!isMockFallbackEnabled()) {
      throw e;
    }
    const local = wx.getStorageSync(STORAGE_KEYS.BONUS_HISTORY) || [];
    return local.length ? local : getMockHistory();
  }
}

async function submitBonusAppeal(params) {
  try {
    await post('/bonus/appeal', params, { showErrorToast: false });
    return { success: true };
  } catch (e) {
    if (!isMockFallbackEnabled()) {
      throw e;
    }
    return { success: true };
  }
}

module.exports = {
  getBonusData,
  getBonusHistory,
  submitBonusAppeal
};
