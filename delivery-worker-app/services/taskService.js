const { get } = require('../utils/request.js');
const { API_PATHS } = require('../utils/apiPaths.js');
const { isMockFallbackEnabled } = require('../utils/runtimeSettings.js');

const mockTasks = [
  {
    id: '1',
    orderNo: 'ZL-20241028-001',
    customerName: 'XX会展公司',
    address: '上海市浦东新区张江高科技园区',
    scheduledTime: '09:00-11:00',
    goodsCount: 15,
    status: 'completed',
    statusText: '已完成',
    hasArrive: true,
    hasComplete: true
  },
  {
    id: '2',
    orderNo: 'ZL-20241028-002',
    customerName: 'YY科技公司',
    address: '上海市徐汇区漕河泾开发区',
    scheduledTime: '14:00-16:00',
    goodsCount: 8,
    status: 'doing',
    statusText: '进行中',
    hasArrive: true,
    hasComplete: false
  },
  {
    id: '3',
    orderNo: 'ZL-20241028-003',
    customerName: 'ZZ商贸中心',
    address: '上海市静安区南京西路',
    scheduledTime: '17:00-19:00',
    goodsCount: 12,
    status: 'pending',
    statusText: '待开始',
    hasArrive: false,
    hasComplete: false
  }
];

async function getTodayTasks() {
  try {
    const res = await get(API_PATHS.task.today, {}, { showErrorToast: false });
    if (Array.isArray(res)) {
      return res;
    }
    if (res && Array.isArray(res.tasks)) {
      return res.tasks;
    }
    return [];
  } catch (e) {
    if (!isMockFallbackEnabled()) {
      throw e;
    }
    return mockTasks;
  }
}

async function getOrderById(orderId) {
  try {
    return await get(API_PATHS.task.orderDetail(orderId), {}, { showErrorToast: false });
  } catch (e) {
    if (!isMockFallbackEnabled()) {
      throw e;
    }
    return mockTasks.find(item => item.id === String(orderId)) || null;
  }
}

module.exports = {
  getTodayTasks,
  getOrderById
};
