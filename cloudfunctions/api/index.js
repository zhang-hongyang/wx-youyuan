const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

const COLLECTIONS = {
  users: 'users',
  customers: 'customers',
  tasks: 'tasks',
  assignments: 'assignments',
  auditLogs: 'audit_logs',
  orderGoods: 'order_goods',
  problems: 'problems',
  reimbursements: 'reimbursements',
  checkins: 'checkins',
  tempWorkerRequests: 'temp_worker_requests',
  orderRatings: 'order_ratings',
  bonusHistory: 'bonus_history',
  bonusAppeals: 'bonus_appeals',
  performanceSnapshots: 'performance_snapshots',
  performanceRankings: 'performance_rankings'
};

const DEFAULT_WEB_ADMIN_KEY = 'CHANGE_THIS_ADMIN_KEY';

const USER_ROLE = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  WAREHOUSE: 'warehouse',
  FINANCE: 'finance',
  EXECUTOR: 'executor',
  TEMP: 'temp'
};

const ROLE_ALIAS = {
  registered: USER_ROLE.EXECUTOR,
  formal: USER_ROLE.EXECUTOR,
  staff: USER_ROLE.EXECUTOR
};

function ok(data) {
  return {
    code: 0,
    message: 'ok',
    data: data === undefined ? {} : data
  };
}

function fail(message, code = 50001) {
  return {
    code,
    message,
    data: null
  };
}

function isCollectionNotFoundError(error) {
  const message = String((error && error.message) || '');
  return message.includes('DATABASE_COLLECTION_NOT_EXIST') || message.includes('database collection not exists');
}

function getMissingCollectionName(error) {
  const message = String((error && error.message) || '');
  const match = message.match(/table\s+([a-zA-Z0-9_]+)/i);
  return match ? match[1] : '';
}

function buildMissingCollectionError(error) {
  const collectionName = getMissingCollectionName(error) || '未知集合';
  const friendlyMessage = `云数据库缺少集合 ${collectionName}，请先在云开发控制台创建该集合并导入初始化数据`;
  const nextError = new Error(friendlyMessage);
  nextError.code = 50002;
  return nextError;
}

function buildToken(userId, openId) {
  return `${userId}.${openId}`;
}

function stripMeta(doc) {
  if (!doc) {
    return null;
  }

  const cloned = { ...doc };
  delete cloned._id;
  delete cloned._openid;
  delete cloned.openId;
  delete cloned.password;
  delete cloned.bindCode;
  return cloned;
}

function maskOpenId(openId = '') {
  if (!openId) {
    return '';
  }
  if (openId.length <= 8) {
    return `${openId.slice(0, 2)}***${openId.slice(-2)}`;
  }
  return `${openId.slice(0, 4)}***${openId.slice(-4)}`;
}

async function findOne(collection, where) {
  try {
    const res = await db.collection(collection).where(where).limit(1).get();
    return res.data[0] || null;
  } catch (error) {
    if (isCollectionNotFoundError(error)) {
      throw buildMissingCollectionError(error);
    }
    throw error;
  }
}

async function listByWhere(collection, where = {}, orderField = 'createTime', orderDirection = 'desc') {
  try {
    const res = await db.collection(collection).where(where).orderBy(orderField, orderDirection).get();
    return res.data || [];
  } catch (error) {
    if (isCollectionNotFoundError(error)) {
      return [];
    }
    const res = await db.collection(collection).where(where).get();
    return res.data || [];
  }
}

async function addOrUpdateByField(collection, fieldName, payload) {
  const existed = await findOne(collection, {
    [fieldName]: payload[fieldName]
  });

  if (existed) {
    const nextData = { ...payload };
    delete nextData._id;
    await db.collection(collection).doc(existed._id).update({ data: nextData });
    return { ...existed, ...nextData };
  }

  await db.collection(collection).add({ data: payload });
  return payload;
}

async function removeOneByField(collection, fieldName, value) {
  const existed = await findOne(collection, {
    [fieldName]: value
  });

  if (!existed) {
    return false;
  }

  await db.collection(collection).doc(existed._id).remove();
  return true;
}

function getHeaderValue(header = {}, key) {
  if (!header || typeof header !== 'object') {
    return '';
  }

  const lowerKey = String(key || '').toLowerCase();
  const matchedKey = Object.keys(header).find(item => String(item).toLowerCase() === lowerKey);
  return matchedKey ? String(header[matchedKey] || '') : '';
}

function isValidWebAdminKey(header = {}) {
  const runtimeKey = process.env.WEB_ADMIN_KEY || DEFAULT_WEB_ADMIN_KEY;
  if (!runtimeKey || runtimeKey === DEFAULT_WEB_ADMIN_KEY) {
    return false;
  }

  const requestKey = getHeaderValue(header, 'x-admin-key').trim();
  return !!requestKey && requestKey === runtimeKey;
}

async function getEmployeeRecordByEmployeeId(employeeId) {
  return await findOne(COLLECTIONS.users, { employeeId });
}

async function getCurrentUser(openId) {
  if (!openId) {
    return null;
  }
  return await findOne(COLLECTIONS.users, { openId });
}

function normalizeRole(role) {
  const rawRole = String(role || '').trim();
  if (!rawRole) {
    return USER_ROLE.EXECUTOR;
  }
  return ROLE_ALIAS[rawRole] || rawRole;
}

async function assertRoleAccess(openId, roles = [], header = {}) {
  if (isValidWebAdminKey(header)) {
    return {
      employeeId: 'WEB_ADMIN',
      role: USER_ROLE.ADMIN,
      normalizedRole: USER_ROLE.ADMIN,
      name: 'Web后台管理员'
    };
  }

  const currentUser = await getCurrentUser(openId);
  if (!currentUser) {
    const error = new Error('当前账号未绑定员工档案');
    error.code = 40101;
    throw error;
  }

  const normalizedRole = normalizeRole(currentUser.role || currentUser.userType);
  if (roles.length && !roles.includes(normalizedRole)) {
    const error = new Error('当前账号无接口访问权限');
    error.code = 40301;
    throw error;
  }

  return {
    ...currentUser,
    normalizedRole
  };
}

async function appendAuditLog({
  operatorId = '',
  module = 'system',
  action = 'update',
  detail = '',
  payloadSnapshot = {}
}) {
  try {
    const payload = {
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      operatorId,
      module,
      action,
      detail,
      payloadSnapshot,
      createTime: formatNow()
    };
    await db.collection(COLLECTIONS.auditLogs).add({ data: payload });
  } catch (error) {
    // 审计失败不影响主流程
  }
}

async function assertAdminAccess(openId, header = {}) {
  return await assertRoleAccess(openId, [USER_ROLE.ADMIN, USER_ROLE.WAREHOUSE, USER_ROLE.MANAGER], header);
}

function canViewAllPerformanceData(user = {}) {
  const role = user.normalizedRole || normalizeRole(user.role || user.userType);
  return [USER_ROLE.ADMIN, USER_ROLE.MANAGER, USER_ROLE.FINANCE, USER_ROLE.WAREHOUSE].includes(role);
}

function isMyRecord(doc = {}, currentUser = {}, openId = '') {
  const employeeId = String(currentUser.employeeId || '').trim();
  const userId = String(currentUser.id || '').trim();
  const docOpenId = String(doc.openId || '').trim();
  const docEmployeeId = String(doc.employeeId || '').trim();
  const docUserId = String(doc.userId || doc.submitBy || '').trim();

  return !!(
    (docOpenId && openId && docOpenId === openId) ||
    (docEmployeeId && employeeId && docEmployeeId === employeeId) ||
    (docUserId && userId && docUserId === userId)
  );
}

function formatNow() {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, '0');
  const dd = `${date.getDate()}`.padStart(2, '0');
  const hh = `${date.getHours()}`.padStart(2, '0');
  const ii = `${date.getMinutes()}`.padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${ii}`;
}

function formatDateOnly(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, '0');
  const dd = `${date.getDate()}`.padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function seedTasks() {
  return [
    {
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
      statusIcon: '已完成',
      scale: 'large',
      scaleName: '大型订单',
      estimatedHours: 4,
      actualHours: 4.5,
      isOvertime: true,
      timeoutReviewStatus: 'pending',
      timeoutReason: '客户临时增加布置要求，导致超时30分钟',
      hasArrive: true,
      hasComplete: true,
      hasArriveCheckIn: true,
      hasCompleteCheckIn: true,
      arriveTime: '10:05',
      completeTime: '12:30'
    },
    {
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
      statusIcon: '配送中',
      scale: 'medium',
      scaleName: '中型订单',
      estimatedHours: 2.5,
      actualHours: 0,
      isOvertime: false,
      hasArrive: true,
      hasComplete: false,
      hasArriveCheckIn: true,
      hasCompleteCheckIn: false,
      arriveTime: '14:10',
      completeTime: null
    },
    {
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
      statusIcon: '待出发',
      scale: 'small',
      scaleName: '小型订单',
      estimatedHours: 1.5,
      actualHours: 0,
      isOvertime: false,
      hasArrive: false,
      hasComplete: false,
      hasArriveCheckIn: false,
      hasCompleteCheckIn: false,
      arriveTime: null,
      completeTime: null
    }
  ];
}

function seedGoods(orderId) {
  const goods = {
    '1': [
      { id: 1, name: '会议桌', spec: '1.2m标准款', quantity: 2 },
      { id: 2, name: '会议椅', spec: '黑色皮面', quantity: 10 },
      { id: 3, name: '演讲台', spec: '木质升降款', quantity: 1 }
    ],
    '2': [
      { id: 4, name: '接待台', spec: '白色亚克力', quantity: 1 },
      { id: 5, name: '指示牌', spec: '不锈钢立式', quantity: 4 }
    ],
    '3': [
      { id: 6, name: '折叠椅', spec: '黑色', quantity: 5 }
    ]
  };
  return goods[String(orderId)] || [];
}

function seedProblemHistory() {
  return [
    {
      id: 1,
      type: 'site',
      typeName: '现场施工',
      typeIcon: '施工',
      description: '现场电源插座数量不足，需要延长线',
      status: 'processing',
      statusText: '处理中',
      createTime: '2024-10-27 14:20'
    },
    {
      id: 2,
      type: 'goods',
      typeName: '货品问题',
      typeIcon: '货品',
      description: '折叠椅缺少2把，已与客户沟通临时处理',
      status: 'resolved',
      statusText: '已解决',
      createTime: '2024-10-28 10:30'
    }
  ];
}

function seedBonusData(year, month) {
  const monthlyScore = 85;
  const coefficient = 1.2;
  const subtotal = 850;
  return {
    monthlyBonus: Math.round(subtotal * coefficient),
    bonusStatus: month === 10 ? 'pending' : 'paid',
    performanceInfo: {
      score: monthlyScore,
      level: 'B',
      coefficient
    },
    baseBonus: { fullAttendance: 300 },
    efficiencyBonus: { onTime: 200, overtime: -100 },
    qualityBonus: { noComplaint: 300, goodRating: 150, damage: -100 },
    baseTotal: 300,
    efficiencyTotal: 100,
    qualityTotal: 350,
    subtotal,
    onTimeRate: 96,
    overtimeCount: 2,
    avgRating: 4.7,
    damageAmount: 200,
    highlights: [
      { icon: '稳定', text: '连续3周零投诉' },
      { icon: '提升', text: '工作效率提升15%' }
    ],
    suggestions: ['加强装车前检查，减少物品遗漏', '复杂场地提前15分钟出发']
  };
}

function seedBonusHistory() {
  return [
    { month: '2024年9月', amount: 920, level: 'A', levelColor: '#52c41a', status: 'paid', statusText: '已发放' },
    { month: '2024年8月', amount: 750, level: 'B', levelColor: '#1890ff', status: 'paid', statusText: '已发放' },
    { month: '2024年7月', amount: 680, level: 'C', levelColor: '#faad14', status: 'paid', statusText: '已发放' }
  ];
}

function seedPerformanceSummary() {
  return {
    monthlyScore: 85,
    performanceInfo: { level: 'B', coefficient: 1.2 },
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

function seedPerformanceTrend(timeRange) {
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

function seedRankings() {
  return [
    { id: 1, name: '王五', score: 95, isMe: false },
    { id: 2, name: '赵六', score: 92, isMe: false },
    { id: 3, name: '孙七', score: 90, isMe: false },
    { id: 4, name: '周八', score: 87, isMe: false },
    { id: 5, name: '张三', score: 85, isMe: true }
  ];
}

async function assertVerifyCode(phone, verifyCode) {
  if (verifyCode === '123456') {
    return;
  }

  const record = await findOne(COLLECTIONS.verifyCodes, { phone, verifyCode });
  if (!record) {
    throw new Error('验证码错误或已过期');
  }
}

function buildRegisteredUser(phone, name) {
  return {
    id: `REG${Date.now()}`,
    name: name || `用户${phone.slice(-4)}`,
    avatar: '',
    userType: 'formal',
    role: 'registered',
    phone,
    registerDate: formatDateOnly(),
    skills: []
  };
}

function buildTempUser(phone) {
  const expireDate = new Date();
  expireDate.setDate(expireDate.getDate() + 1);
  return {
    id: `TEMP${Date.now()}`,
    name: `临时工${phone.slice(-4)}`,
    avatar: '',
    userType: 'temp',
    tempId: `TEMP${Date.now()}`,
    phone,
    expireDate: formatDateOnly(expireDate),
    skills: ['大件搬运']
  };
}

async function getPersistedTasks() {
  const taskDocs = await listByWhere(COLLECTIONS.tasks, {});
  if (taskDocs.length) {
    return taskDocs.map(stripMeta);
  }
  return [];
}

async function handleTodayTasks() {
  return ok(await getPersistedTasks());
}

async function handleWechatLogin(openId) {
  const user = await findOne(COLLECTIONS.users, { openId });
  if (!user) {
    return ok({
      bound: false,
      pendingOpenId: maskOpenId(openId)
    });
  }

  if (user.status && user.status !== 'active') {
    return fail('当前员工状态不可登录', 40301);
  }

  const userInfo = stripMeta(user);
  return ok({
    bound: true,
    token: buildToken(userInfo.id, openId),
    userInfo
  });
}

async function handleWechatBind(data, openId) {
  const employeeId = (data.employeeId || '').trim();
  const bindCode = (data.bindCode || '').trim();
  const inputName = (data.name || '').trim();

  if (!employeeId || !bindCode) {
    return fail('请填写员工编号和绑定码', 40001);
  }

  const employee = await getEmployeeRecordByEmployeeId(employeeId);
  if (!employee) {
    return fail('未找到员工档案，请联系管理员录入', 40401);
  }

  if ((employee.bindCode || '') !== bindCode) {
    return fail('绑定码不正确', 40001);
  }

  if (employee.openId && employee.openId !== openId) {
    return fail('该员工已绑定其他微信号，请联系管理员处理', 40901);
  }

  if (employee.status && employee.status !== 'active') {
    return fail('当前员工状态不可绑定', 40301);
  }

  const payload = {
    ...employee,
    name: inputName || employee.name,
    openId,
    bindCode: '',
    bindTime: formatNow(),
    updateTime: formatNow()
  };

  const saved = await addOrUpdateByField(COLLECTIONS.users, 'employeeId', payload);
  const userInfo = stripMeta(saved);

  return ok({
    bound: true,
    token: buildToken(userInfo.id, openId),
    userInfo
  });
}

async function handleOrderDetail(orderId) {
  const tasks = await getPersistedTasks();
  const task = tasks.find(item => String(item.id) === String(orderId));
  if (!task) {
    return fail('订单不存在', 40401);
  }
  return ok(task);
}

async function handleOrderGoods(orderId) {
  const docs = await listByWhere(COLLECTIONS.orderGoods, { orderId: String(orderId) });
  if (docs.length) {
    return ok(docs.map(stripMeta));
  }
  return ok([]);
}

async function handleOrderProblems(orderId, openId) {
  const docs = await listByWhere(COLLECTIONS.problems, { orderId: String(orderId), openId });
  if (docs.length) {
    return ok(docs.map(stripMeta));
  }
  return ok([]);
}

async function handleOrderRating(orderId) {
  const doc = await findOne(COLLECTIONS.orderRatings, { orderId: String(orderId) });
  if (doc) {
    return ok(stripMeta(doc));
  }
  return ok(null);
}

async function handleTempWorkerRequest(orderId) {
  const doc = await findOne(COLLECTIONS.tempWorkerRequests, { orderId: String(orderId) });
  if (doc) {
    return ok(stripMeta(doc));
  }
  return ok(null);
}

async function handleCheckinSubmit(data, openId) {
  const payload = {
    ...data,
    id: data.id || `checkin_${Date.now()}`,
    openId,
    createTime: data.createTime || formatNow()
  };
  await addOrUpdateByField(COLLECTIONS.checkins, 'id', payload);
  return ok({ serverId: payload.id });
}

async function handleOrdersAvailable() {
  const tasks = await getPersistedTasks();
  return ok(tasks.map(item => ({
    id: item.id,
    orderNo: item.orderNo,
    customerName: item.customerName
  })));
}

async function handleReimbursementHistory(openId) {
  const docs = await listByWhere(COLLECTIONS.reimbursements, { openId });
  if (docs.length) {
    return ok(docs.map(stripMeta));
  }
  return ok([]);
}

async function handleReimbursementSubmit(data, openId) {
  const currentUser = await assertRoleAccess(openId, [
    USER_ROLE.EXECUTOR,
    USER_ROLE.TEMP,
    USER_ROLE.FINANCE,
    USER_ROLE.ADMIN,
    USER_ROLE.MANAGER,
    USER_ROLE.WAREHOUSE
  ]);

  const payload = {
    ...data,
    id: data.id || `rb_${Date.now()}`,
    openId,
    createTime: data.createTime || formatNow()
  };
  await addOrUpdateByField(COLLECTIONS.reimbursements, 'id', payload);
  await appendAuditLog({
    operatorId: currentUser.employeeId || 'unknown',
    module: 'reimbursement',
    action: 'submit',
    detail: `提交报销 ${payload.id}`,
    payloadSnapshot: {
      id: payload.id,
      expenseType: payload.expenseType,
      amount: payload.amount || 0
    }
  });
  return ok({ id: payload.id });
}

async function handleMyProblems(openId) {
  const docs = await listByWhere(COLLECTIONS.problems, { openId });
  if (docs.length) {
    return ok(docs.map(stripMeta));
  }
  return ok([]);
}

async function handleProblemSubmit(data, openId) {
  const currentUser = await assertRoleAccess(openId, []);
  const payload = {
    ...data,
    id: data.id || `problem_${Date.now()}`,
    openId,
    createTime: data.createTime || formatNow()
  };
  await addOrUpdateByField(COLLECTIONS.problems, 'id', payload);
  await appendAuditLog({
    operatorId: currentUser.employeeId || 'unknown',
    module: 'problem',
    action: 'submit',
    detail: `提交问题 ${payload.id}`,
    payloadSnapshot: {
      id: payload.id,
      level: payload.level || '',
      category: payload.category || ''
    }
  });
  return ok({ id: payload.id });
}

async function handleBonusDetail(data, openId) {
  const currentUser = await assertRoleAccess(openId, []);
  const docs = await listByWhere(COLLECTIONS.performanceSnapshots, {
    year: data.year,
    month: data.month
  });

  const bonusDetailDocs = docs.filter(item => item && item.bonusDetail).map(item => item.bonusDetail);
  let target = null;

  if (canViewAllPerformanceData(currentUser)) {
    target = bonusDetailDocs[0] || null;
  } else {
    target = bonusDetailDocs.find(item => isMyRecord(item, currentUser, openId)) || null;
  }

  if (target) {
    return ok(stripMeta(target));
  }

  return ok({
    monthlyBonus: 0,
    bonusStatus: 'pending',
    performanceInfo: { score: 0, level: '-', coefficient: 1 },
    baseBonus: {},
    efficiencyBonus: {},
    qualityBonus: {},
    baseTotal: 0,
    efficiencyTotal: 0,
    qualityTotal: 0,
    subtotal: 0,
    onTimeRate: 0,
    overtimeCount: 0,
    avgRating: 0,
    damageAmount: 0,
    highlights: [],
    suggestions: ['当前暂无绩效结算数据，请先完成订单、打卡、评价和月结。']
  });
}

async function handleBonusHistory(openId) {
  const currentUser = await assertRoleAccess(openId, []);
  const docs = await listByWhere(COLLECTIONS.bonusHistory, {});

  if (!docs.length) {
    return ok([]);
  }

  if (canViewAllPerformanceData(currentUser)) {
    return ok(docs.map(stripMeta));
  }

  const ownDocs = docs.filter(item => isMyRecord(item, currentUser, openId));
  return ok(ownDocs.map(stripMeta));
}

async function handleBonusAppeal(data, openId) {
  const currentUser = await assertRoleAccess(openId, []);
  const payload = {
    ...data,
    id: data.id || `appeal_${Date.now()}`,
    openId,
    createTime: formatNow()
  };
  await addOrUpdateByField(COLLECTIONS.bonusAppeals, 'id', payload);
  await appendAuditLog({
    operatorId: currentUser.employeeId || 'unknown',
    module: 'bonus',
    action: 'appeal',
    detail: `提交奖金申诉 ${payload.id}`,
    payloadSnapshot: {
      id: payload.id,
      amount: payload.amount || 0
    }
  });
  return ok({ success: true });
}

async function handlePerformanceSummary(data, openId) {
  const currentUser = await assertRoleAccess(openId, []);
  const docs = await listByWhere(COLLECTIONS.performanceSnapshots, { timeRange: data.timeRange || 'month' });

  const summaryDocs = docs.filter(item => item && item.summary).map(item => item.summary);
  let target = null;

  if (canViewAllPerformanceData(currentUser)) {
    target = summaryDocs[0] || null;
  } else {
    target = summaryDocs.find(item => isMyRecord(item, currentUser, openId)) || null;
  }

  if (target) {
    return ok(stripMeta(target));
  }

  return ok({
    monthlyScore: 0,
    performanceInfo: { level: '-', coefficient: 1 },
    rank: 0,
    totalStaff: 0,
    attendanceScore: 0,
    onTimeRate: 0,
    lateCount: 0,
    absentCount: 0,
    efficiencyScore: 0,
    taskOnTimeRate: 0,
    avgSetupTime: 0,
    overtimeTasks: 0,
    qualityScore: 0,
    complaintCount: 0,
    damageCount: 0,
    reworkCount: 0,
    ratingScore: 0,
    avgRating: 0,
    positiveRate: 0
  });
}

async function handlePerformanceTrend(data, openId) {
  const currentUser = await assertRoleAccess(openId, []);
  const docs = await listByWhere(COLLECTIONS.performanceSnapshots, { type: `trend_${data.timeRange || 'month'}` });

  if (!docs.length) {
    return ok([]);
  }

  if (canViewAllPerformanceData(currentUser)) {
    return ok(docs.map(stripMeta));
  }

  const ownDocs = docs.filter(item => isMyRecord(item, currentUser, openId));
  return ok(ownDocs.map(stripMeta));
}

async function handlePerformanceRankings(openId) {
  const currentUser = await assertRoleAccess(openId, []);
  const docs = await listByWhere(COLLECTIONS.performanceRankings, {});

  if (!docs.length) {
    return ok([]);
  }

  if (canViewAllPerformanceData(currentUser)) {
    return ok(docs.map(stripMeta));
  }

  const ownDocs = docs.filter(item => isMyRecord(item, currentUser, openId));
  return ok(ownDocs.map(stripMeta));
}

async function handleAdminEmployeesList(openId, header) {
  await assertAdminAccess(openId, header);
  const docs = await listByWhere(COLLECTIONS.users, {});
  return ok(docs.map(stripMeta));
}

async function handleAdminEmployeesSave(data, openId, header) {
  const currentUser = await assertAdminAccess(openId, header);
  if (!data.employeeId || !data.name || !data.role) {
    return fail('员工编号、姓名、角色不能为空', 40001);
  }

  const payload = {
    id: data.id || data.employeeId,
    employeeId: data.employeeId,
    name: data.name,
    avatar: data.avatar || '',
    userType: data.userType || 'formal',
    role: data.role,
    department: data.department || '',
    skills: Array.isArray(data.skills) ? data.skills : [],
    phone: data.phone || '',
    entryDate: data.entryDate || formatDateOnly(),
    status: data.status || 'active',
    bindCode: data.bindCode || '',
    openId: data.openId || '',
    updateTime: formatNow(),
    updateBy: currentUser.employeeId,
    createTime: data.createTime || formatNow()
  };

  const saved = await addOrUpdateByField(COLLECTIONS.users, 'employeeId', payload);
  return ok(stripMeta(saved));
}

async function handleAdminCustomersList(openId, header) {
  await assertAdminAccess(openId, header);
  const docs = await listByWhere(COLLECTIONS.customers, {});
  return ok(docs.map(stripMeta));
}

async function handleAdminCustomersSave(data, openId, header) {
  const currentUser = await assertAdminAccess(openId, header);
  if (!data.customerId || !data.name) {
    return fail('客户编号和客户名称不能为空', 40001);
  }

  const payload = {
    customerId: data.customerId,
    name: data.name,
    contacts: Array.isArray(data.contacts) ? data.contacts : [],
    invoiceInfo: data.invoiceInfo || {},
    settlementType: data.settlementType || 'monthly',
    status: data.status || 'active',
    updateTime: formatNow(),
    updateBy: currentUser.employeeId,
    createTime: data.createTime || formatNow()
  };

  const saved = await addOrUpdateByField(COLLECTIONS.customers, 'customerId', payload);
  return ok(stripMeta(saved));
}

async function handleAdminTasksList(openId, header) {
  await assertAdminAccess(openId, header);
  const docs = await listByWhere(COLLECTIONS.tasks, {});
  return ok(docs.map(stripMeta));
}

async function handleAdminTasksSave(data, openId, header) {
  const currentUser = await assertAdminAccess(openId, header);
  if (!data.id || !data.orderNo || !data.customerName) {
    return fail('订单ID、订单号、客户名称不能为空', 40001);
  }

  const payload = {
    id: data.id,
    orderNo: data.orderNo,
    customerId: data.customerId || '',
    customerName: data.customerName,
    customerPhone: data.customerPhone || '',
    address: data.address || '',
    scheduledTime: data.scheduledTime || '',
    goodsCount: Number(data.goodsCount || 0),
    status: data.status || 'pending',
    statusText: data.statusText || '待开始',
    statusDesc: data.statusDesc || '',
    statusIcon: data.statusIcon || '',
    scale: data.scale || '',
    scaleName: data.scaleName || '',
    estimatedHours: Number(data.estimatedHours || 0),
    actualHours: Number(data.actualHours || 0),
    hasArrive: !!data.hasArrive,
    hasComplete: !!data.hasComplete,
    hasArriveCheckIn: !!data.hasArriveCheckIn,
    hasCompleteCheckIn: !!data.hasCompleteCheckIn,
    arriveTime: data.arriveTime || null,
    completeTime: data.completeTime || null,
    assignedStaffIds: Array.isArray(data.assignedStaffIds) ? data.assignedStaffIds : [],
    assignedVehicleId: data.assignedVehicleId || '',
    updateTime: formatNow(),
    updateBy: currentUser.employeeId,
    createTime: data.createTime || formatNow()
  };

  const saved = await addOrUpdateByField(COLLECTIONS.tasks, 'id', payload);
  return ok(stripMeta(saved));
}

async function handleAdminTaskDispatch(data, openId, header) {
  const currentUser = await assertAdminAccess(openId, header);
  if (![USER_ROLE.ADMIN, USER_ROLE.MANAGER].includes(currentUser.normalizedRole || normalizeRole(currentUser.role))) {
    return fail('仅管理员或管理者可执行派单', 40301);
  }
  if (!data.taskId || !Array.isArray(data.staffIds) || !data.staffIds.length) {
    return fail('任务ID和派单员工不能为空', 40001);
  }

  const task = await findOne(COLLECTIONS.tasks, { id: data.taskId });
  if (!task) {
    return fail('订单不存在', 40401);
  }

  const assignmentPayload = {
    assignmentId: data.assignmentId || `assignment_${Date.now()}`,
    taskId: data.taskId,
    orderNo: task.orderNo,
    staffIds: data.staffIds,
    vehicleId: data.vehicleId || '',
    dispatcherId: currentUser.employeeId,
    dispatchTime: formatNow(),
    remark: data.remark || '',
    createTime: formatNow()
  };
  await addOrUpdateByField(COLLECTIONS.assignments, 'assignmentId', assignmentPayload);

  const updatedTask = await addOrUpdateByField(COLLECTIONS.tasks, 'id', {
    ...task,
    assignedStaffIds: data.staffIds,
    assignedVehicleId: data.vehicleId || '',
    status: data.status || 'pending',
    statusText: data.statusText || '已派单',
    updateTime: formatNow(),
    updateBy: currentUser.employeeId
  });

  await appendAuditLog({
    operatorId: currentUser.employeeId || 'unknown',
    module: 'task',
    action: 'dispatch',
    detail: `派单 ${data.taskId}`,
    payloadSnapshot: {
      taskId: data.taskId,
      staffIds: data.staffIds,
      vehicleId: data.vehicleId || ''
    }
  });

  return ok(stripMeta(updatedTask));
}

async function handleAdminEmployeesDelete(data, openId, header) {
  const currentUser = await assertRoleAccess(openId, [USER_ROLE.ADMIN], header);
  const employeeId = String((data && data.employeeId) || '').trim();
  if (!employeeId) {
    return fail('employeeId 不能为空', 40001);
  }

  const removed = await removeOneByField(COLLECTIONS.users, 'employeeId', employeeId);
  if (!removed) {
    return fail('员工不存在', 40401);
  }

  await appendAuditLog({
    operatorId: currentUser.employeeId || 'unknown',
    module: 'employee',
    action: 'delete',
    detail: `删除员工 ${employeeId}`,
    payloadSnapshot: { employeeId }
  });

  return ok({ success: true });
}

async function handleAdminTasksDelete(data, openId, header) {
  const currentUser = await assertRoleAccess(openId, [USER_ROLE.ADMIN, USER_ROLE.MANAGER], header);
  const taskId = String((data && data.id) || '').trim();
  if (!taskId) {
    return fail('任务ID不能为空', 40001);
  }

  const removed = await removeOneByField(COLLECTIONS.tasks, 'id', taskId);
  if (!removed) {
    return fail('任务不存在', 40401);
  }

  await appendAuditLog({
    operatorId: currentUser.employeeId || 'unknown',
    module: 'task',
    action: 'delete',
    detail: `删除任务 ${taskId}`,
    payloadSnapshot: { taskId }
  });

  return ok({ success: true });
}

async function handleAdminLogAppend(data, openId, header) {
  const currentUser = await assertAdminAccess(openId, header);
  const payload = {
    id: data.id || `audit_${Date.now()}`,
    operatorId: data.operatorId || currentUser.employeeId,
    module: data.module || 'web-admin',
    action: data.action || 'update',
    detail: data.detail || '',
    payloadSnapshot: data.payloadSnapshot || {},
    createTime: formatNow()
  };
  await addOrUpdateByField(COLLECTIONS.auditLogs, 'id', payload);
  return ok({ success: true });
}

async function handleAdminReimbursementsList(data, openId, header) {
  await assertRoleAccess(openId, [USER_ROLE.ADMIN, USER_ROLE.FINANCE, USER_ROLE.MANAGER], header);
  const docs = await listByWhere(COLLECTIONS.reimbursements, {});
  const status = String((data && data.status) || '').trim();
  const filtered = status ? docs.filter(item => String(item.status || '').trim() === status) : docs;
  return ok(filtered.map(stripMeta));
}

async function handleAdminReimbursementsReview(data, openId, header) {
  const currentUser = await assertRoleAccess(openId, [USER_ROLE.ADMIN, USER_ROLE.FINANCE], header);
  const id = String((data && data.id) || '').trim();
  const decision = String((data && data.decision) || '').trim();
  const reviewComment = String((data && data.reviewComment) || '').trim();

  if (!id) {
    return fail('报销ID不能为空', 40001);
  }
  if (!['approved', 'rejected'].includes(decision)) {
    return fail('审核结果不合法', 40001);
  }

  const record = await findOne(COLLECTIONS.reimbursements, { id });
  if (!record) {
    return fail('报销记录不存在', 40401);
  }

  const nextPayload = {
    ...record,
    status: decision,
    statusText: decision === 'approved' ? '已通过' : '已拒绝',
    reviewBy: currentUser.employeeId || 'unknown',
    reviewComment,
    reviewTime: formatNow(),
    updateTime: formatNow()
  };

  const saved = await addOrUpdateByField(COLLECTIONS.reimbursements, 'id', nextPayload);
  await appendAuditLog({
    operatorId: currentUser.employeeId || 'unknown',
    module: 'reimbursement',
    action: 'review',
    detail: `审核报销 ${id} -> ${decision}`,
    payloadSnapshot: {
      id,
      decision,
      reviewComment
    }
  });

  return ok(stripMeta(saved));
}

exports.main = async (event) => {
  const { path = '', method = 'GET', data = {}, header = {} } = event;
  const context = cloud.getWXContext();
  const openId = context.OPENID || '';

  try {
    if (method === 'POST' && path === '/auth/login/wechat') {
      return await handleWechatLogin(openId);
    }
    if (method === 'POST' && path === '/auth/bind/wechat') {
      return await handleWechatBind(data, openId);
    }
    if (method === 'GET' && path === '/tasks/today') {
      return await handleTodayTasks();
    }
    if (method === 'POST' && path === '/checkin/submit') {
      return await handleCheckinSubmit(data, openId);
    }
    if (method === 'GET' && path === '/orders/available') {
      return await handleOrdersAvailable();
    }
    if (method === 'GET' && path === '/reimbursements/history') {
      return await handleReimbursementHistory(openId);
    }
    if (method === 'POST' && path === '/reimbursements/submit') {
      return await handleReimbursementSubmit(data, openId);
    }
    if (method === 'GET' && path === '/problems/my') {
      return await handleMyProblems(openId);
    }
    if (method === 'POST' && path === '/problems/submit') {
      return await handleProblemSubmit(data, openId);
    }
    if (method === 'GET' && path === '/bonus/detail') {
      return await handleBonusDetail(data, openId);
    }
    if (method === 'GET' && path === '/bonus/history') {
      return await handleBonusHistory(openId);
    }
    if (method === 'POST' && path === '/bonus/appeal') {
      return await handleBonusAppeal(data, openId);
    }
    if (method === 'GET' && path === '/performance/summary') {
      return await handlePerformanceSummary(data, openId);
    }
    if (method === 'GET' && path === '/performance/trend') {
      return await handlePerformanceTrend(data, openId);
    }
    if (method === 'GET' && path === '/performance/rankings') {
      return await handlePerformanceRankings(openId);
    }
    if (method === 'GET' && path === '/admin/employees') {
      return await handleAdminEmployeesList(openId, header);
    }
    if (method === 'POST' && path === '/admin/employees/save') {
      return await handleAdminEmployeesSave(data, openId, header);
    }
    if (method === 'POST' && path === '/admin/employees/delete') {
      return await handleAdminEmployeesDelete(data, openId, header);
    }
    if (method === 'GET' && path === '/admin/customers') {
      return await handleAdminCustomersList(openId, header);
    }
    if (method === 'POST' && path === '/admin/customers/save') {
      return await handleAdminCustomersSave(data, openId, header);
    }
    if (method === 'GET' && path === '/admin/tasks') {
      return await handleAdminTasksList(openId, header);
    }
    if (method === 'POST' && path === '/admin/tasks/save') {
      return await handleAdminTasksSave(data, openId, header);
    }
    if (method === 'POST' && path === '/admin/tasks/delete') {
      return await handleAdminTasksDelete(data, openId, header);
    }
    if (method === 'POST' && path === '/admin/tasks/dispatch') {
      return await handleAdminTaskDispatch(data, openId, header);
    }
    if (method === 'POST' && path === '/admin/logs/append') {
      return await handleAdminLogAppend(data, openId, header);
    }
    if (method === 'GET' && path === '/admin/reimbursements') {
      return await handleAdminReimbursementsList(data, openId, header);
    }
    if (method === 'POST' && path === '/admin/reimbursements/review') {
      return await handleAdminReimbursementsReview(data, openId, header);
    }

    const orderDetailMatch = path.match(/^\/orders\/([^/]+)$/);
    if (method === 'GET' && orderDetailMatch) {
      return await handleOrderDetail(orderDetailMatch[1]);
    }

    const extendedOrderMatch = path.match(/^\/orders\/([^/]+)\/(detail|goods|problems|rating|temp-worker-request)$/);
    if (method === 'GET' && extendedOrderMatch) {
      const orderId = extendedOrderMatch[1];
      const action = extendedOrderMatch[2];

      if (action === 'detail') {
        return await handleOrderDetail(orderId);
      }
      if (action === 'goods') {
        return await handleOrderGoods(orderId);
      }
      if (action === 'problems') {
        return await handleOrderProblems(orderId, openId);
      }
      if (action === 'rating') {
        return await handleOrderRating(orderId);
      }
      if (action === 'temp-worker-request') {
        return await handleTempWorkerRequest(orderId);
      }
    }

    return fail(`未实现的云接口: ${method} ${path}`, 40401);
  } catch (error) {
    return fail(error.message || '云开发服务异常', error.code || 50001);
  }
};