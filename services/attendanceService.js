const util = require('../utils/util.js');
const { STORAGE_KEYS } = require('../utils/constants.js');

function getWeekDayName(date) {
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return days[date.getDay()];
}

function getAttendanceByDate(date) {
  const allRecords = wx.getStorageSync(STORAGE_KEYS.CHECKIN_RECORDS) || [];
  const currentRecords = allRecords.filter(record => record.date === date);

  const workRecord = currentRecords.find(record => record.type === 'work');
  const orderCheckIns = {};

  currentRecords.forEach(record => {
    if (!record.orderId) return;
    if (!orderCheckIns[record.orderId]) {
      orderCheckIns[record.orderId] = {
        orderId: record.orderId,
        orderNo: record.orderNo,
        customerName: '客户名称',
        arriveTime: null,
        completeTime: null
      };
    }

    if (record.type === 'arrive') {
      orderCheckIns[record.orderId].arriveTime = record.time;
    }
    if (record.type === 'complete') {
      orderCheckIns[record.orderId].completeTime = record.time;
    }
  });

  let workRecordData = null;
  if (workRecord) {
    const hour = parseInt(workRecord.time.split(':')[0], 10);
    const minute = parseInt(workRecord.time.split(':')[1], 10);
    const isLate = hour > 8 || (hour === 8 && minute > 30);
    workRecordData = {
      ...workRecord,
      status: isLate ? 'late' : 'normal',
      statusText: isLate ? '迟到' : '正常'
    };
  }

  const orderRecords = Object.values(orderCheckIns);
  const completedCount = orderRecords.filter(item => item.completeTime).length;
  const workHours = workRecordData && completedCount > 0 ? 8 : 0;

  return {
    records: {
      work: workRecordData
    },
    orderRecords,
    workHours,
    completedCount
  };
}

function getWeekDays(baseDate = new Date()) {
  const today = new Date();
  const weekStart = new Date(baseDate);
  weekStart.setDate(baseDate.getDate() - baseDate.getDay());

  const weekDays = [];
  const dayNames = ['日', '一', '二', '三', '四', '五', '六'];

  for (let i = 0; i < 7; i += 1) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    weekDays.push({
      dayName: dayNames[i],
      dayNum: date.getDate(),
      date: util.formatDate(date),
      isToday: util.formatDate(date) === util.formatDate(today),
      hasCheckIn: false,
      status: ''
    });
  }

  return weekDays;
}

function applyWeekStatus(weekDays) {
  const allRecords = wx.getStorageSync(STORAGE_KEYS.CHECKIN_RECORDS) || [];
  return weekDays.map(day => {
    const dayRecords = allRecords.filter(record => record.date === day.date);
    const hasWorkCheckIn = dayRecords.some(record => record.type === 'work');
    return {
      ...day,
      hasCheckIn: hasWorkCheckIn,
      status: hasWorkCheckIn ? 'checked' : ''
    };
  });
}

module.exports = {
  getWeekDayName,
  getAttendanceByDate,
  getWeekDays,
  applyWeekStatus
};
