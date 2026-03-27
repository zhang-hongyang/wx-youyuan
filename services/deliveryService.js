const { get } = require('../utils/request.js');
const util = require('../utils/util.js');
const { STORAGE_KEYS } = require('../utils/constants.js');
const { isMockFallbackEnabled } = require('../utils/runtimeSettings.js');
const { extractList } = require('../utils/responseParser.js');

const mockTasks = {
  '1': {
    id: '1',
    orderNo: 'ZL-20241028-001',
    customerName: 'XX会展公司',
    customerPhone: '13800138000',
    address: '上海市浦东新区张江高科技园区XX路123号',
    scheduledTime: '09:00-11:00',
    goodsCount: 15,
    status: 'completed',
    statusText: '已完成',
    statusDesc: '任务已完成',
    statusIcon: '✅',
    scale: 'large',
    scaleName: '大型订单',
    estimatedHours: 4,
    actualHours: 4.5,
    isOvertime: true,
    timeoutReviewStatus: 'pending',
    timeoutReason: '客户临时增加布置要求，导致超时30分钟',
    hasArriveCheckIn: true,
    hasCompleteCheckIn: true,
    arriveTime: '10:05',
    completeTime: '12:30'
  },
  '2': {
    id: '2',
    orderNo: 'ZL-20241028-002',
    customerName: 'YY科技公司',
    customerPhone: '13900139000',
    address: '上海市徐汇区漕河泾开发区XX路456号',
    scheduledTime: '14:00-16:00',
    goodsCount: 8,
    status: 'doing',
    statusText: '进行中',
    statusDesc: '正在布置现场',
    statusIcon: '🚚',
    scale: 'medium',
    scaleName: '中型订单',
    estimatedHours: 2.5,
    hasArriveCheckIn: true,
    hasCompleteCheckIn: false,
    arriveTime: '14:10',
    completeTime: null
  },
  '3': {
    id: '3',
    orderNo: 'ZL-20241028-003',
    customerName: 'ZZ商贸中心',
    customerPhone: '13700137000',
    address: '上海市静安区南京西路XX号',
    scheduledTime: '17:00-19:00',
    goodsCount: 5,
    status: 'pending',
    statusText: '待开始',
    statusDesc: '等待开始',
    statusIcon: '⏳',
    scale: 'small',
    scaleName: '小型订单',
    estimatedHours: 1.5,
    hasArriveCheckIn: false,
    hasCompleteCheckIn: false,
    arriveTime: null,
    completeTime: null
  }
};

const mockGoodsList = [
  { id: 1, name: '会议桌', spec: '1.2m标准款', quantity: 2 },
  { id: 2, name: '会议椅', spec: '黑色皮面', quantity: 10 },
  { id: 3, name: '演讲台', spec: '木质升降款', quantity: 1 },
  { id: 4, name: '背景板', spec: '3x4m喷绘', quantity: 1 },
  { id: 5, name: '指示牌', spec: '不锈钢立式', quantity: 1 }
];

async function getTaskDetail(taskId) {
  try {
    return await get(`/orders/${taskId}/detail`, {}, { showErrorToast: false });
  } catch (e) {
    if (!isMockFallbackEnabled()) {
      throw e;
    }
    return mockTasks[String(taskId)] || mockTasks['1'];
  }
}

async function getGoodsList(taskId) {
  try {
    const res = await get(`/orders/${taskId}/goods`, {}, { showErrorToast: false });
    return extractList(res);
  } catch (e) {
    if (!isMockFallbackEnabled()) {
      throw e;
    }
    return mockGoodsList;
  }
}

async function getProblems(taskId) {
  try {
    const res = await get(`/orders/${taskId}/problems`, {}, { showErrorToast: false });
    return extractList(res);
  } catch (e) {
    if (!isMockFallbackEnabled()) {
      throw e;
    }
    if (String(taskId) === '1') {
      return [{
        id: 1,
        type: '货品问题',
        icon: '📦',
        description: '折叠椅缺少2把，已与客户沟通临时处理',
        status: 'resolved',
        statusText: '已解决',
        time: '10:25'
      }];
    }
    return [];
  }
}

async function getRating(taskId) {
  try {
    return await get(`/orders/${taskId}/rating`, {}, { showErrorToast: false });
  } catch (e) {
    if (!isMockFallbackEnabled()) {
      throw e;
    }
    if (String(taskId) === '1') {
      return {
        score: 5,
        comment: '服务非常专业，布置速度很快，非常满意！'
      };
    }
    return null;
  }
}

async function getTempWorkerRequest(taskId) {
  try {
    return await get(`/orders/${taskId}/temp-worker-request`, {}, { showErrorToast: false });
  } catch (e) {
    if (!isMockFallbackEnabled()) {
      throw e;
    }
    if (String(taskId) === '1') {
      return {
        id: 'TEMP_REQ_001',
        count: 2,
        hours: 4,
        reason: '订单规模较大，需要额外人手搬运重物',
        status: 'approved',
        statusText: '已通过',
        workers: [
          { id: 1, name: '临时工A', phone: '138****0001', checkedOut: true },
          { id: 2, name: '临时工B', phone: '138****0002', checkedOut: false }
        ]
      };
    }
    return null;
  }
}

function getTimeline(task) {
  const timeline = [];
  const today = util.formatDate(new Date());
  const records = wx.getStorageSync(STORAGE_KEYS.CHECKIN_RECORDS) || [];
  const workRecord = records.find(record => record.date === today && record.type === 'work');

  if (workRecord) {
    timeline.push({
      type: 'work',
      title: '上班打卡',
      desc: '已从仓库出发',
      time: workRecord.time,
      completed: true,
      status: 'completed',
      photos: workRecord.photos || []
    });
  }

  timeline.push({
    type: 'arrive',
    title: '到达现场',
    desc: task.arriveTime ? '已到达客户现场' : '等待到达打卡',
    time: task.arriveTime || '',
    completed: task.hasArriveCheckIn,
    status: task.hasArriveCheckIn ? 'completed' : (task.status === 'doing' ? 'active' : ''),
    photos: []
  });

  timeline.push({
    type: 'complete',
    title: '完工',
    desc: task.completeTime ? '任务已完成' : '等待完工打卡',
    time: task.completeTime || '',
    completed: task.hasCompleteCheckIn,
    status: task.hasCompleteCheckIn ? 'completed' : (task.hasArriveCheckIn ? 'active' : ''),
    photos: []
  });

  return timeline;
}

module.exports = {
  getTaskDetail,
  getGoodsList,
  getProblems,
  getRating,
  getTempWorkerRequest,
  getTimeline
};
