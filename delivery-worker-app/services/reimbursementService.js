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

const mockHistory = [
  {
    id: 1,
    type: 'parking',
    typeName: '停车费',
    typeIcon: '🅿️',
    amount: '25.00',
    orderNo: 'ZL-20241025-003',
    date: '2024-10-25',
    status: 'approved',
    statusText: '已通过'
  },
  {
    id: 2,
    type: 'meal',
    typeName: '在外就餐',
    typeIcon: '🍽️',
    amount: '58.00',
    orderNo: 'ZL-20241024-001',
    date: '2024-10-24',
    status: 'pending',
    statusText: '审核中'
  },
  {
    id: 3,
    type: 'fuel',
    typeName: '加油费',
    typeIcon: '⛽',
    amount: '200.00',
    orderNo: 'ZL-20241020-002',
    date: '2024-10-20',
    status: 'rejected',
    statusText: '已拒绝'
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

async function getHistory() {
  try {
    const res = await get('/reimbursements/history', {}, { showErrorToast: false });
    const list = extractList(res);
    return list.length ? list : mockHistory;
  } catch (e) {
    if (!isMockFallbackEnabled()) {
      throw e;
    }
    const local = wx.getStorageSync(STORAGE_KEYS.REIMBURSEMENTS) || [];
    return local.length ? local : mockHistory;
  }
}

async function submitReimbursement(payload) {
  const normalizedPayload = {
    ...payload,
    invoices: await uploadImages(payload.invoices || [], 'invoice'),
    billImages: await uploadImages(payload.billImages || [], 'bill'),
    otherImages: await uploadImages(payload.otherImages || [], 'evidence')
  };

  try {
    await post('/reimbursements/submit', normalizedPayload, {
      showErrorToast: false,
      idempotencyKey: `reimbursement-${normalizedPayload.id}`
    });
  } catch (e) {
    if (!isMockFallbackEnabled()) {
      throw e;
    }
  }

  const localList = wx.getStorageSync(STORAGE_KEYS.REIMBURSEMENTS) || [];
  localList.unshift(normalizedPayload);
  wx.setStorageSync(STORAGE_KEYS.REIMBURSEMENTS, localList);
  return { success: true };
}

function buildReimbursementPayload({ orders, selectedOrderIndex, expenseType, selectedExpenseType, amount, expenseDate, description, invoices, billImages, otherImages, userId }) {
  return {
    id: util.generateId(),
    orderId: orders[selectedOrderIndex].id,
    orderNo: orders[selectedOrderIndex].orderNo,
    type: expenseType,
    typeName: selectedExpenseType.name,
    typeIcon: selectedExpenseType.icon,
    amount: parseFloat(amount).toFixed(2),
    date: expenseDate,
    description,
    invoices,
    billImages,
    otherImages,
    requireInvoice: selectedExpenseType.requireInvoice,
    status: 'pending',
    statusText: '审核中',
    createTime: util.formatTime(new Date()),
    submitBy: userId || ''
  };
}

module.exports = {
  getOrders,
  getHistory,
  submitReimbursement,
  buildReimbursementPayload
};
