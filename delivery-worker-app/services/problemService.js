const { get, post } = require('../utils/request.js');
const util = require('../utils/util.js');
const { STORAGE_KEYS } = require('../utils/constants.js');
const { isMockFallbackEnabled } = require('../utils/runtimeSettings.js');
const { extractList } = require('../utils/responseParser.js');
const { uploadImages } = require('../utils/fileUploader.js');

const mockOrders = [
  { id: 1, orderNo: 'ZL-20241028-001', customerName: 'XX会展公司' },
  { id: 2, orderNo: 'ZL-20241028-002', customerName: 'YY科技公司' },
  { id: 3, orderNo: 'ZL-20241028-003', customerName: 'ZZ商贸中心' }
];

const mockProblems = [
  {
    id: 1,
    type: 'goods',
    typeName: '货品问题',
    typeIcon: '📦',
    description: '折叠椅缺少2把，已与客户沟通临时处理',
    status: 'resolved',
    statusText: '已解决',
    createTime: '2024-10-28 10:30'
  },
  {
    id: 2,
    type: 'site',
    typeName: '现场施工',
    typeIcon: '🔧',
    description: '现场电源插座数量不足，需要延长线',
    status: 'processing',
    statusText: '处理中',
    createTime: '2024-10-27 14:20'
  }
];

async function getOrders() {
  try {
    const res = await get('/orders/available', {}, { showErrorToast: false });
    const list = extractList(res);
    return list.length ? list : mockOrders;
  } catch (e) {
    if (!isMockFallbackEnabled()) {
      throw e;
    }
    return mockOrders;
  }
}

async function getMyProblems() {
  try {
    const res = await get('/problems/my', {}, { showErrorToast: false });
    const list = extractList(res);
    return list.length ? list : mockProblems;
  } catch (e) {
    if (!isMockFallbackEnabled()) {
      throw e;
    }
    const local = wx.getStorageSync(STORAGE_KEYS.PROBLEMS) || [];
    return local.length ? local : mockProblems;
  }
}

function buildProblemPayload(params) {
  const {
    selectedType,
    problemTypes,
    orders,
    selectedOrderIndex,
    photos,
    remark,
    expectation,
    createBy,
    goodsProblem,
    siteIssues,
    siteProblem,
    customerProblem,
    accidentProblem
  } = params;

  const typeInfo = problemTypes.find(item => item.key === selectedType) || { name: '', icon: '' };
  const payload = {
    id: util.generateId(),
    type: selectedType,
    typeName: typeInfo.name,
    typeIcon: typeInfo.icon,
    orderId: orders[selectedOrderIndex].id,
    orderNo: orders[selectedOrderIndex].orderNo,
    photos,
    remark,
    expectation,
    status: 'pending',
    statusText: '待处理',
    createTime: util.formatTime(new Date()),
    createBy
  };

  if (selectedType === 'goods') {
    payload.detail = goodsProblem;
  } else if (selectedType === 'site') {
    payload.detail = {
      issues: siteIssues.filter(item => item.checked),
      description: siteProblem.description
    };
  } else if (selectedType === 'customer') {
    payload.detail = customerProblem;
  } else if (selectedType === 'accident') {
    payload.detail = accidentProblem;
  }

  return payload;
}

async function submitProblem(problemData) {
  const normalizedPayload = {
    ...problemData,
    photos: await uploadImages(problemData.photos || [], 'problem')
  };

  try {
    await post('/problems/submit', normalizedPayload, {
      showErrorToast: false,
      idempotencyKey: `problem-${normalizedPayload.id}`
    });
  } catch (e) {
    if (!isMockFallbackEnabled()) {
      throw e;
    }
  }

  const problems = wx.getStorageSync(STORAGE_KEYS.PROBLEMS) || [];
  problems.unshift(normalizedPayload);
  wx.setStorageSync(STORAGE_KEYS.PROBLEMS, problems);
  return { success: true };
}

module.exports = {
  getOrders,
  getMyProblems,
  buildProblemPayload,
  submitProblem
};
