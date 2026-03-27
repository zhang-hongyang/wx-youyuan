const STORAGE_KEY = 'delivery_worker_admin_console_v1';
const CLOUD_CONFIG_KEY = 'delivery_worker_admin_cloud_config_v1';

const seedState = {
  employees: [
    {
      id: 'emp_001',
      employeeId: 'ADM001',
      name: '系统管理员',
      role: 'admin',
      department: '运营中心',
      phone: '13800000000',
      bindCode: 'ADM-202603',
      status: 'active',
      note: '首个管理员账号'
    },
    {
      id: 'emp_002',
      employeeId: 'EMP001',
      name: '张三',
      role: 'staff',
      department: '配送部',
      phone: '13800000002',
      bindCode: 'EMP-202603-001',
      status: 'active',
      note: '负责配送与安装'
    }
  ],
  projects: [
    {
      id: 'prj_001',
      projectCode: 'TASK20260307001',
      projectName: '浦东会展布场',
      customerName: '上海示例会展有限公司',
      ownerEmployeeId: 'EMP001',
      schedule: '2026-03-08 09:00-11:00',
      status: 'planning',
      priority: 'high',
      address: '上海市浦东新区世纪大道100号',
      note: '需提前确认车辆和物料'
    }
  ],
  logs: [
    {
      id: 'log_001',
      time: formatTime(new Date()),
      module: 'system',
      action: 'init',
      detail: '后台首次初始化完成'
    }
  ]
};

const sections = [
  { id: 'dashboard', label: '总览' },
  { id: 'employees', label: '员工管理' },
  { id: 'projects', label: '项目管理' },
  { id: 'logs', label: '日志查看' },
  { id: 'sync', label: '数据同步' }
];

const nav = document.getElementById('nav');
const panel = document.getElementById('panel');
const dashboardStrip = document.getElementById('dashboardStrip');

let activeSection = 'dashboard';
let state = loadState();
let cloudConfig = loadCloudConfig();
let cloudRuntime = {
  app: null,
  ready: false,
  lastError: '',
  authBypassed: false
};
let uiState = {
  employeeKeyword: '',
  employeeStatus: 'all',
  projectKeyword: '',
  projectStatus: 'all',
  logKeyword: '',
  logModule: 'all',
  importTarget: 'employees'
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seedState));
      return clone(seedState);
    }
    return { ...clone(seedState), ...JSON.parse(raw) };
  } catch (error) {
    return clone(seedState);
  }
}

function loadCloudConfig() {
  const fallback = {
    mode: 'local',
    envId: '',
    adminKey: '',
    autoSync: false
  };

  try {
    const raw = localStorage.getItem(CLOUD_CONFIG_KEY);
    if (!raw) {
      return fallback;
    }
    return { ...fallback, ...JSON.parse(raw) };
  } catch (error) {
    return fallback;
  }
}

function persistCloudConfig() {
  localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify(cloudConfig));
  renderDashboardStrip();
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  renderDashboardStrip();
}

function formatTime(date) {
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, '0');
  const dd = `${date.getDate()}`.padStart(2, '0');
  const hh = `${date.getHours()}`.padStart(2, '0');
  const ii = `${date.getMinutes()}`.padStart(2, '0');
  const ss = `${date.getSeconds()}`.padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${ii}:${ss}`;
}

function nextId(prefix) {
  return `${prefix}_${Date.now()}`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function logAction(module, action, detail) {
  state.logs.unshift({
    id: nextId('log'),
    time: formatTime(new Date()),
    module,
    action,
    detail
  });
  state.logs = state.logs.slice(0, 200);
  persistState();
}

function cloudModeLabel() {
  if (cloudConfig.mode !== 'cloud') {
    return '本地模式';
  }
  return cloudRuntime.ready ? '云函数模式' : '云函数未连接';
}

function cloudStatusHint() {
  if (cloudConfig.mode !== 'cloud') {
    return '当前未启用云端直连';
  }
  if (cloudRuntime.ready) {
    const modeHint = cloudRuntime.authBypassed ? '（跳过匿名登录）' : '';
    return `已连接 ${cloudConfig.envId || '(未配置环境ID)'}${modeHint}`;
  }
  if (cloudRuntime.lastError) {
    return cloudRuntime.lastError;
  }
  return '等待连接';
}

function getCloudbaseSdk() {
  return window.cloudbase || window.tcb || null;
}

function normalizeCloudErrorMessage(error) {
  const raw = String((error && (error.message || error.msg)) || error || '未知错误');

  if (raw.includes('REFRESH_TOKEN_DISABLED')) {
    return '匿名登录令牌刷新失败（REFRESH_TOKEN_DISABLED）。请到云开发控制台的“身份认证 -> Token”中确认未禁用 Refresh Token，再清理本页缓存后重试。';
  }
  if (raw.includes('INVALID_PARAM') || raw.includes('env')) {
    return 'envId 可能不正确，请确认与当前云函数部署环境一致。';
  }
  if (raw.includes('function not exists') || raw.includes('FUNCTION_NOT_FOUND')) {
    return '未找到云函数 api，请先上传并部署 cloudfunctions/api。';
  }

  return raw;
}

function clearCloudAuthCache() {
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key) {
      continue;
    }
    const lower = key.toLowerCase();
    if (
      lower.includes('tcb') ||
      lower.includes('cloudbase') ||
      lower.includes('refresh_token') ||
      lower.includes('access_token')
    ) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));

  try {
    sessionStorage.clear();
  } catch (error) {
    // ignore sessionStorage cleanup error
  }
}

function resetCloudRuntime() {
  cloudRuntime.app = null;
  cloudRuntime.ready = false;
  cloudRuntime.lastError = '';
  cloudRuntime.authBypassed = false;
}

function getCloudPrecheckError() {
  const envId = (cloudConfig.envId || '').trim();
  const adminKey = (cloudConfig.adminKey || '').trim();

  if (!envId) {
    return '请先填写 envId';
  }
  if (!adminKey) {
    return '请先填写 adminKey';
  }
  if (adminKey === 'WEB_ADMIN_KEY') {
    return 'adminKey 填错了：这里要填 WEB_ADMIN_KEY 的“值”，不是变量名 WEB_ADMIN_KEY';
  }
  if (adminKey.length < 8) {
    return 'adminKey 长度过短，请检查是否填成了占位符';
  }
  if (window.location.protocol === 'file:') {
    return '当前是 file:// 方式打开页面，云连接可能失败。请用本地静态服务打开，例如 http://127.0.0.1:5173';
  }
  return '';
}

async function ensureCloudConnection(options = {}) {
  const forceReauth = !!options.forceReauth;

  if (cloudConfig.mode !== 'cloud') {
    throw new Error('当前是本地模式，请先在“数据同步”里启用云函数模式');
  }
  if (!cloudConfig.envId.trim()) {
    throw new Error('请先填写 envId');
  }
  if (!cloudConfig.adminKey.trim()) {
    throw new Error('请先填写管理密钥 adminKey');
  }

  if (cloudConfig.adminKey.trim() === 'WEB_ADMIN_KEY') {
    throw new Error('adminKey 填错了：请填写 WEB_ADMIN_KEY 的实际值，而不是字符串 WEB_ADMIN_KEY');
  }

  if (window.location.protocol === 'file:') {
    throw new Error('当前通过 file:// 打开页面，云连接易失败。请用本地静态服务打开 admin-web');
  }

  if (!forceReauth && cloudRuntime.ready && cloudRuntime.app) {
    return cloudRuntime.app;
  }

  const sdk = getCloudbaseSdk();
  if (!sdk || typeof sdk.init !== 'function') {
    throw new Error('云开发 Web SDK 未加载，请检查网络后刷新页面');
  }

  if (forceReauth) {
    resetCloudRuntime();
    clearCloudAuthCache();
  }

  const app = sdk.init({ env: cloudConfig.envId.trim() });
  const auth = app.auth({ persistence: 'local' });
  if (auth && typeof auth.signInAnonymously === 'function') {
    try {
      await auth.signInAnonymously();
    } catch (error) {
      const raw = String((error && (error.message || error.msg)) || '');
      if (raw.includes('REFRESH_TOKEN_DISABLED')) {
        // Retry once after clearing stale cloud auth cache.
        try {
          if (typeof auth.signOut === 'function') {
            await auth.signOut();
          }
        } catch (signOutError) {
          // ignore signOut errors; we still clear local cache below
        }

        clearCloudAuthCache();
        try {
          await auth.signInAnonymously();
        } catch (retryError) {
          const retryRaw = String((retryError && (retryError.message || retryError.msg)) || '');
          if (retryRaw.includes('REFRESH_TOKEN_DISABLED')) {
            throw new Error(normalizeCloudErrorMessage(retryError));
          } else {
            throw new Error(normalizeCloudErrorMessage(retryError));
          }
        }
      } else {
        throw new Error(normalizeCloudErrorMessage(error));
      }
    }
  }

  cloudRuntime.app = app;
  cloudRuntime.ready = true;
  cloudRuntime.lastError = '';
  return app;
}

async function runCloudDiagnostics() {
  const report = {
    protocol: window.location.protocol,
    envId: cloudConfig.envId || '',
    adminKeyFilled: !!(cloudConfig.adminKey || '').trim(),
    sdkLoaded: !!getCloudbaseSdk(),
    authResult: 'unknown',
    functionCallResult: 'unknown',
    details: []
  };

  try {
    const app = await ensureCloudConnection({ forceReauth: true });
    report.authResult = cloudRuntime.authBypassed ? 'bypassed' : 'ok';
    try {
      const res = await app.callFunction({
        name: 'api',
        data: {
          path: '/admin/employees',
          method: 'GET',
          data: {},
          header: {
            'x-admin-key': cloudConfig.adminKey.trim(),
            'x-admin-source': 'admin-web-diagnostics'
          }
        }
      });
      const payload = res && (res.result || res);
      if (payload && payload.code === 0) {
        report.functionCallResult = 'ok';
      } else {
        report.functionCallResult = `failed: ${(payload && payload.message) || 'unknown'}`;
      }
    } catch (callError) {
      report.functionCallResult = `failed: ${normalizeCloudErrorMessage(callError)}`;
    }
  } catch (error) {
    report.authResult = `failed: ${normalizeCloudErrorMessage(error)}`;
  }

  report.details.push(`protocol=${report.protocol}`);
  report.details.push(`sdkLoaded=${report.sdkLoaded}`);
  report.details.push(`authResult=${report.authResult}`);
  report.details.push(`functionCallResult=${report.functionCallResult}`);
  return report;
}

async function callCloudAdminApi(path, method = 'GET', data = {}) {
  try {
    const app = await ensureCloudConnection();
    const res = await app.callFunction({
      name: 'api',
      data: {
        path,
        method,
        data,
        header: {
          'x-admin-key': cloudConfig.adminKey.trim(),
          'x-admin-source': 'admin-web'
        }
      }
    });

    const payload = res && (res.result || res);
    if (!payload || typeof payload.code === 'undefined') {
      throw new Error('云函数返回格式异常');
    }
    if (payload.code !== 0) {
      throw new Error(payload.message || '云函数调用失败');
    }

    return payload.data;
  } catch (error) {
    cloudRuntime.ready = false;
    cloudRuntime.lastError = normalizeCloudErrorMessage(error);
    throw new Error(cloudRuntime.lastError);
  }
}

function mapProjectToCloudTask(project) {
  const normalizedId = project.projectCode || project.id;
  const statusTextMap = {
    planning: '待派单',
    running: '进行中',
    done: '已完成',
    paused: '已暂停'
  };

  return {
    id: normalizedId,
    orderNo: normalizedId,
    customerName: project.customerName || '未命名客户',
    customerPhone: '',
    address: project.address || '',
    scheduledTime: project.schedule || '',
    goodsCount: 0,
    status: project.status || 'planning',
    statusText: statusTextMap[project.status] || '待派单',
    assignedStaffIds: project.ownerEmployeeId ? [project.ownerEmployeeId] : []
  };
}

function mapCloudTaskToProject(task) {
  const assigned = Array.isArray(task.assignedStaffIds) ? task.assignedStaffIds : [];
  return {
    id: task.id || nextId('prj'),
    projectCode: task.id || task.orderNo || '',
    projectName: task.orderNo ? `任务 ${task.orderNo}` : `任务 ${task.id || ''}`,
    customerName: task.customerName || '',
    ownerEmployeeId: assigned[0] || '',
    schedule: task.scheduledTime || '',
    status: task.status || 'planning',
    priority: 'medium',
    address: task.address || '',
    note: ''
  };
}

async function connectCloudFromForm() {
  cloudConfig.mode = 'cloud';
  cloudConfig.envId = (document.getElementById('cloudEnvId').value || '').trim();
  cloudConfig.adminKey = (document.getElementById('cloudAdminKey').value || '').trim();
  cloudConfig.autoSync = !!document.getElementById('cloudAutoSync').checked;
  persistCloudConfig();

  const precheckError = getCloudPrecheckError();
  if (precheckError) {
    cloudRuntime.ready = false;
    cloudRuntime.lastError = precheckError;
    window.alert(`云函数连接失败：${precheckError}`);
    renderSection('sync');
    bindSyncEvents();
    return;
  }

  try {
    await ensureCloudConnection({ forceReauth: true });
    await callCloudAdminApi('/admin/employees', 'GET');
    window.alert('云函数连接成功');
  } catch (error) {
    window.alert(`云函数连接失败：${error.message || '未知错误'}`);
  }

  renderSection('sync');
  bindSyncEvents();
}

function switchToLocalMode() {
  cloudConfig.mode = 'local';
  cloudRuntime.ready = false;
  cloudRuntime.lastError = '';
  cloudRuntime.authBypassed = false;
  persistCloudConfig();
  window.alert('已切换到本地模式');
  renderSection('sync');
  bindSyncEvents();
}

function clearCloudAuthNow() {
  clearCloudAuthCache();
  cloudRuntime.ready = false;
  cloudRuntime.lastError = '已清理本地云认证缓存，请重新连接';
  cloudRuntime.authBypassed = false;
  window.alert('已清理本地云认证缓存，请刷新页面后重试连接');
  renderSection('sync');
  bindSyncEvents();
}

async function uploadEmployeesToCloud() {
  if (!state.employees.length) {
    window.alert('当前没有员工数据可上传');
    return;
  }

  let success = 0;
  for (const employee of state.employees) {
    const payload = {
      employeeId: employee.employeeId,
      name: employee.name,
      role: employee.role,
      department: employee.department || '',
      phone: employee.phone || '',
      bindCode: employee.bindCode || '',
      status: employee.status || 'active',
      userType: 'formal',
      skills: employee.note ? [employee.note] : []
    };
    await callCloudAdminApi('/admin/employees/save', 'POST', payload);
    success += 1;
  }

  logAction('sync', 'push-employees', `已上传员工 ${success} 条到云端`);
  window.alert(`上传完成：${success} 条员工记录`);
}

async function uploadProjectsToCloud() {
  if (!state.projects.length) {
    window.alert('当前没有项目数据可上传');
    return;
  }

  let success = 0;
  for (const project of state.projects) {
    await callCloudAdminApi('/admin/tasks/save', 'POST', mapProjectToCloudTask(project));
    success += 1;
  }

  logAction('sync', 'push-projects', `已上传项目 ${success} 条到云端`);
  window.alert(`上传完成：${success} 条项目记录`);
}

async function pullEmployeesFromCloud() {
  const docs = await callCloudAdminApi('/admin/employees', 'GET');
  state.employees = (docs || []).map(item => ({
    id: item.id || item.employeeId || nextId('emp'),
    employeeId: item.employeeId || '',
    name: item.name || '',
    role: item.role || 'staff',
    department: item.department || '',
    phone: item.phone || '',
    bindCode: item.bindCode || '',
    status: item.status || 'active',
    note: Array.isArray(item.skills) ? item.skills.join('、') : ''
  }));
  persistState();
  logAction('sync', 'pull-employees', `从云端拉取员工 ${state.employees.length} 条`);
}

async function pullProjectsFromCloud() {
  const docs = await callCloudAdminApi('/admin/tasks', 'GET');
  state.projects = (docs || []).map(mapCloudTaskToProject);
  persistState();
  logAction('sync', 'pull-projects', `从云端拉取项目 ${state.projects.length} 条`);
}

function getStatusClass(status) {
  if (['inactive', 'blocked', 'cancelled'].includes(status)) {
    return 'danger';
  }
  if (['planning', 'pending', 'paused'].includes(status)) {
    return 'warning';
  }
  return '';
}

function renderNav() {
  nav.innerHTML = '';
  sections.forEach(section => {
    const button = document.createElement('button');
    button.textContent = section.label;
    button.className = section.id === activeSection ? 'active' : '';
    button.addEventListener('click', () => renderSection(section.id));
    nav.appendChild(button);
  });
}

function renderDashboardStrip() {
  const activeEmployees = state.employees.filter(item => item.status === 'active').length;
  const runningProjects = state.projects.filter(item => ['planning', 'running'].includes(item.status)).length;
  const logCount = state.logs.length;
  const syncMode = cloudModeLabel();
  dashboardStrip.innerHTML = `
    <div class="stat-card">
      <p>在岗员工</p>
      <strong>${activeEmployees}</strong>
    </div>
    <div class="stat-card">
      <p>进行中项目</p>
      <strong>${runningProjects}</strong>
    </div>
    <div class="stat-card">
      <p>累计操作日志</p>
      <strong>${logCount}</strong>
    </div>
    <div class="stat-card">
      <p>数据模式</p>
      <strong>${syncMode}</strong>
    </div>
  `;
}

function renderSection(sectionId) {
  activeSection = sectionId;
  renderNav();

  if (sectionId === 'dashboard') {
    renderDashboard();
    return;
  }
  if (sectionId === 'employees') {
    renderEmployees();
    bindEmployeeEvents();
    return;
  }
  if (sectionId === 'projects') {
    renderProjects();
    bindProjectEvents();
    return;
  }
  if (sectionId === 'logs') {
    renderLogs();
    bindLogEvents();
    return;
  }
  renderSync();
  bindSyncEvents();
}

function renderDashboard() {
  const latestLogs = state.logs.slice(0, 5).map(item => `
    <div class="log-item">
      <p class="log-title">${escapeHtml(item.detail)}</p>
      <p class="log-meta">${escapeHtml(item.time)} · ${escapeHtml(item.module)} · ${escapeHtml(item.action)}</p>
    </div>
  `).join('') || '<p class="empty-note">暂无操作日志</p>';

  const latestProjects = state.projects.slice(0, 3).map(item => `
    <div class="list-item">
      <h4>${escapeHtml(item.projectName)}</h4>
      <div class="item-meta">
        <span class="pill">${escapeHtml(item.projectCode)}</span>
        <span class="status-chip ${getStatusClass(item.status)}">${escapeHtml(item.status)}</span>
        <span class="pill">负责人 ${escapeHtml(item.ownerEmployeeId || '未分配')}</span>
      </div>
      <p class="helper">${escapeHtml(item.schedule)} · ${escapeHtml(item.customerName || '未填写客户')}</p>
    </div>
  `).join('') || '<p class="empty-note">暂无项目</p>';

  panel.innerHTML = `
    <p class="section-kicker">dashboard</p>
    <h3 class="section-title">后台总览</h3>
    <p class="muted-block">如果你现在最想要的是更简单的云数据库更新方式，最稳妥的路径就是先用这个 Web 后台做可视化录入，再逐步把保存动作接到云函数管理接口。这样不会被云开发权限、鉴权和 collection 初始化一开始就卡死。</p>
    <div class="grid two">
      <div class="card">
        <div class="card-head">
          <div>
            <p class="section-kicker">Quick Start</p>
            <h3>先做的 3 件事</h3>
          </div>
        </div>
        <div class="split-list">
          <div class="list-item"><h4>1. 录入员工</h4><p class="helper">先建立管理员、仓库、配送人员三类账号。</p></div>
          <div class="list-item"><h4>2. 建项目</h4><p class="helper">把订单或现场任务按项目方式录入，便于派人和跟踪进度。</p></div>
          <div class="list-item"><h4>3. 看日志</h4><p class="helper">所有增删改动作都会落到操作日志里，便于回溯。</p></div>
        </div>
      </div>
      <div class="card">
        <p class="section-kicker">Latest Projects</p>
        <h3>最近项目</h3>
        <div class="split-list">${latestProjects}</div>
      </div>
    </div>
    <div class="card" style="margin-top: 18px;">
      <p class="section-kicker">Activity</p>
      <h3>最近日志</h3>
      <div class="log-list">${latestLogs}</div>
    </div>
  `;
}

function filteredEmployees() {
  return state.employees.filter(item => {
    const keyword = uiState.employeeKeyword.trim().toLowerCase();
    const hitKeyword = !keyword || [item.employeeId, item.name, item.department, item.role].some(field => String(field || '').toLowerCase().includes(keyword));
    const hitStatus = uiState.employeeStatus === 'all' || item.status === uiState.employeeStatus;
    return hitKeyword && hitStatus;
  });
}

function renderEmployees() {
  const rows = filteredEmployees().map(item => `
    <tr>
      <td>${escapeHtml(item.employeeId)}</td>
      <td>${escapeHtml(item.name)}</td>
      <td>${escapeHtml(item.role)}</td>
      <td>${escapeHtml(item.department)}</td>
      <td>${escapeHtml(item.phone)}</td>
      <td><span class="status-chip ${getStatusClass(item.status)}">${escapeHtml(item.status)}</span></td>
      <td>
        <button class="link-button" data-action="edit-employee" data-id="${escapeHtml(item.id)}">编辑</button>
        <button class="link-button" data-action="delete-employee" data-id="${escapeHtml(item.id)}">删除</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="7" class="empty-note">没有匹配的员工记录</td></tr>';

  panel.innerHTML = `
    <p class="section-kicker">employees</p>
    <h3 class="section-title">员工管理</h3>
    <p class="muted-block">这里已经可以直接做人员增删改查。当前存储在浏览器 localStorage，适合先跑流程、校验字段、整理真实数据；之后只需要把保存动作改成调云函数即可。</p>
    <div class="grid three">
      <div class="card">
        <div class="card-head">
          <div>
            <p class="section-kicker">Directory</p>
            <h3>员工列表</h3>
          </div>
          <span class="pill">共 ${filteredEmployees().length} 人</span>
        </div>
        <div class="toolbar">
          <input id="employeeKeyword" placeholder="搜索员工编号、姓名、部门" value="${escapeHtml(uiState.employeeKeyword)}" />
          <select id="employeeStatus">
            <option value="all" ${uiState.employeeStatus === 'all' ? 'selected' : ''}>全部状态</option>
            <option value="active" ${uiState.employeeStatus === 'active' ? 'selected' : ''}>active</option>
            <option value="inactive" ${uiState.employeeStatus === 'inactive' ? 'selected' : ''}>inactive</option>
          </select>
          <button class="secondary" type="button" id="employeeReset">重置筛选</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>员工编号</th><th>姓名</th><th>角色</th><th>部门</th><th>手机号</th><th>状态</th><th>操作</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
      <div class="card">
        <p class="section-kicker">Editor</p>
        <h3>新增或编辑员工</h3>
        <div class="field-grid">
          <input type="hidden" id="employeeIdHidden" />
          <label><span>员工编号</span><input id="employeeId" placeholder="如 EMP003" /></label>
          <label><span>姓名</span><input id="employeeName" placeholder="员工姓名" /></label>
          <label><span>角色</span><select id="employeeRole"><option value="staff">staff</option><option value="warehouse">warehouse</option><option value="admin">admin</option></select></label>
          <label><span>部门</span><input id="employeeDepartment" placeholder="配送部 / 运营中心" /></label>
          <label><span>手机号</span><input id="employeePhone" placeholder="13800000000" /></label>
          <label><span>绑定码</span><input id="employeeBindCode" placeholder="首次绑定使用" /></label>
          <label><span>状态</span><select id="employeeState"><option value="active">active</option><option value="inactive">inactive</option></select></label>
          <label><span>备注</span><input id="employeeNote" placeholder="技能、岗位说明" /></label>
        </div>
        <div class="actions">
          <button class="primary" type="button" id="employeeSave">保存员工</button>
          <button class="secondary" type="button" id="employeeClear">清空表单</button>
        </div>
      </div>
      <div class="card">
        <p class="section-kicker">Next Sync</p>
        <h3>后续接云接口</h3>
        <div class="notice info">如果你要自动更新云数据库，这个页面的保存动作以后只需改为调用 GET /admin/employees 和 POST /admin/employees/save。</div>
        <div class="pill-row">
          <span class="pill">本地持久化</span>
          <span class="pill">字段已稳定</span>
          <span class="pill">可导出 JSON</span>
        </div>
      </div>
    </div>
  `;
}

function bindEmployeeEvents() {
  document.getElementById('employeeKeyword').addEventListener('input', event => {
    uiState.employeeKeyword = event.target.value;
    renderEmployees();
    bindEmployeeEvents();
  });

  document.getElementById('employeeStatus').addEventListener('change', event => {
    uiState.employeeStatus = event.target.value;
    renderEmployees();
    bindEmployeeEvents();
  });

  document.getElementById('employeeReset').addEventListener('click', () => {
    uiState.employeeKeyword = '';
    uiState.employeeStatus = 'all';
    renderEmployees();
    bindEmployeeEvents();
  });

  document.getElementById('employeeSave').addEventListener('click', saveEmployee);
  document.getElementById('employeeClear').addEventListener('click', clearEmployeeForm);

  panel.querySelectorAll('[data-action="edit-employee"]').forEach(button => {
    button.addEventListener('click', () => fillEmployeeForm(button.dataset.id));
  });

  panel.querySelectorAll('[data-action="delete-employee"]').forEach(button => {
    button.addEventListener('click', () => deleteEmployee(button.dataset.id));
  });
}

function employeeFormData() {
  return {
    id: document.getElementById('employeeIdHidden').value || nextId('emp'),
    employeeId: document.getElementById('employeeId').value.trim(),
    name: document.getElementById('employeeName').value.trim(),
    role: document.getElementById('employeeRole').value,
    department: document.getElementById('employeeDepartment').value.trim(),
    phone: document.getElementById('employeePhone').value.trim(),
    bindCode: document.getElementById('employeeBindCode').value.trim(),
    status: document.getElementById('employeeState').value,
    note: document.getElementById('employeeNote').value.trim()
  };
}

function saveEmployee() {
  const payload = employeeFormData();
  if (!payload.employeeId || !payload.name) {
    window.alert('员工编号和姓名不能为空');
    return;
  }

  const index = state.employees.findIndex(item => item.id === payload.id);
  if (index >= 0) {
    state.employees[index] = payload;
    logAction('employee', 'update', `更新员工 ${payload.employeeId} ${payload.name}`);
  } else {
    state.employees.unshift(payload);
    logAction('employee', 'create', `新增员工 ${payload.employeeId} ${payload.name}`);
  }
  persistState();
  clearEmployeeForm();
  renderEmployees();
  bindEmployeeEvents();
}

function fillEmployeeForm(id) {
  const employee = state.employees.find(item => item.id === id);
  if (!employee) {
    return;
  }
  document.getElementById('employeeIdHidden').value = employee.id;
  document.getElementById('employeeId').value = employee.employeeId || '';
  document.getElementById('employeeName').value = employee.name || '';
  document.getElementById('employeeRole').value = employee.role || 'staff';
  document.getElementById('employeeDepartment').value = employee.department || '';
  document.getElementById('employeePhone').value = employee.phone || '';
  document.getElementById('employeeBindCode').value = employee.bindCode || '';
  document.getElementById('employeeState').value = employee.status || 'active';
  document.getElementById('employeeNote').value = employee.note || '';
}

function clearEmployeeForm() {
  if (!document.getElementById('employeeIdHidden')) {
    return;
  }
  document.getElementById('employeeIdHidden').value = '';
  document.getElementById('employeeId').value = '';
  document.getElementById('employeeName').value = '';
  document.getElementById('employeeRole').value = 'staff';
  document.getElementById('employeeDepartment').value = '';
  document.getElementById('employeePhone').value = '';
  document.getElementById('employeeBindCode').value = '';
  document.getElementById('employeeState').value = 'active';
  document.getElementById('employeeNote').value = '';
}

function deleteEmployee(id) {
  const employee = state.employees.find(item => item.id === id);
  if (!employee) {
    return;
  }
  const confirmed = window.confirm(`确认删除员工 ${employee.employeeId} ${employee.name} 吗？`);
  if (!confirmed) {
    return;
  }
  state.employees = state.employees.filter(item => item.id !== id);
  logAction('employee', 'delete', `删除员工 ${employee.employeeId} ${employee.name}`);
  persistState();
  renderEmployees();
  bindEmployeeEvents();
}

function filteredProjects() {
  return state.projects.filter(item => {
    const keyword = uiState.projectKeyword.trim().toLowerCase();
    const hitKeyword = !keyword || [item.projectCode, item.projectName, item.customerName, item.ownerEmployeeId].some(field => String(field || '').toLowerCase().includes(keyword));
    const hitStatus = uiState.projectStatus === 'all' || item.status === uiState.projectStatus;
    return hitKeyword && hitStatus;
  });
}

function renderProjects() {
  const cards = filteredProjects().map(item => `
    <div class="list-item">
      <h4>${escapeHtml(item.projectName)}</h4>
      <div class="item-meta">
        <span class="pill">${escapeHtml(item.projectCode)}</span>
        <span class="status-chip ${getStatusClass(item.status)}">${escapeHtml(item.status)}</span>
        <span class="pill">优先级 ${escapeHtml(item.priority)}</span>
      </div>
      <p class="helper">客户：${escapeHtml(item.customerName || '-')}</p>
      <p class="helper">负责人：${escapeHtml(item.ownerEmployeeId || '未分配')}</p>
      <p class="helper">时间：${escapeHtml(item.schedule || '-')}</p>
      <p class="helper">地址：${escapeHtml(item.address || '-')}</p>
      <div class="item-actions">
        <button class="secondary" data-action="edit-project" data-id="${escapeHtml(item.id)}">编辑</button>
        <button class="danger" data-action="delete-project" data-id="${escapeHtml(item.id)}">删除</button>
      </div>
    </div>
  `).join('') || '<p class="empty-note">没有匹配的项目</p>';

  panel.innerHTML = `
    <p class="section-kicker">projects</p>
    <h3 class="section-title">项目管理</h3>
    <p class="muted-block">这里的“项目”可以直接对应你的订单、布场任务、仓配执行单。先把真实业务统一成项目维度，后续接派单、绩效、奖金会更顺。</p>
    <div class="grid three">
      <div class="card">
        <div class="card-head">
          <div>
            <p class="section-kicker">Pipeline</p>
            <h3>项目列表</h3>
          </div>
        </div>
        <div class="toolbar">
          <input id="projectKeyword" placeholder="搜索项目编号、名称、客户" value="${escapeHtml(uiState.projectKeyword)}" />
          <select id="projectStatus">
            <option value="all" ${uiState.projectStatus === 'all' ? 'selected' : ''}>全部状态</option>
            <option value="planning" ${uiState.projectStatus === 'planning' ? 'selected' : ''}>planning</option>
            <option value="running" ${uiState.projectStatus === 'running' ? 'selected' : ''}>running</option>
            <option value="done" ${uiState.projectStatus === 'done' ? 'selected' : ''}>done</option>
            <option value="paused" ${uiState.projectStatus === 'paused' ? 'selected' : ''}>paused</option>
          </select>
          <button class="secondary" type="button" id="projectReset">重置筛选</button>
        </div>
        <div class="split-list">${cards}</div>
      </div>
      <div class="card">
        <p class="section-kicker">Editor</p>
        <h3>新增或编辑项目</h3>
        <div class="field-grid">
          <input type="hidden" id="projectIdHidden" />
          <label><span>项目编号</span><input id="projectCode" placeholder="如 TASK20260308001" /></label>
          <label><span>项目名称</span><input id="projectName" placeholder="如 浦东会展布场" /></label>
          <label><span>客户名称</span><input id="projectCustomer" placeholder="客户公司" /></label>
          <label><span>负责人员工编号</span><input id="projectOwner" placeholder="如 EMP001" /></label>
          <label><span>项目状态</span><select id="projectState"><option value="planning">planning</option><option value="running">running</option><option value="done">done</option><option value="paused">paused</option></select></label>
          <label><span>优先级</span><select id="projectPriority"><option value="low">low</option><option value="medium">medium</option><option value="high">high</option></select></label>
          <label><span>计划时间</span><input id="projectSchedule" placeholder="2026-03-08 09:00-11:00" /></label>
          <label><span>地址</span><input id="projectAddress" placeholder="执行地址" /></label>
        </div>
        <div class="field-grid one" style="margin-top: 14px;">
          <label><span>备注</span><textarea id="projectNote" placeholder="施工说明、派车要求、客户注意事项"></textarea></label>
        </div>
        <div class="actions">
          <button class="primary" type="button" id="projectSave">保存项目</button>
          <button class="secondary" type="button" id="projectClear">清空表单</button>
        </div>
      </div>
      <div class="card">
        <p class="section-kicker">Roadmap</p>
        <h3>后续自动化方向</h3>
        <div class="split-list">
          <div class="list-item"><h4>同步到 tasks</h4><p class="helper">把这里的项目保存动作映射到 POST /admin/tasks/save。</p></div>
          <div class="list-item"><h4>负责人自动校验</h4><p class="helper">保存前校验员工编号是否存在。</p></div>
          <div class="list-item"><h4>日志自动落地</h4><p class="helper">把日志同步写入 audit_logs 或独立 logs 集合。</p></div>
        </div>
      </div>
    </div>
  `;
}

function bindProjectEvents() {
  document.getElementById('projectKeyword').addEventListener('input', event => {
    uiState.projectKeyword = event.target.value;
    renderProjects();
    bindProjectEvents();
  });

  document.getElementById('projectStatus').addEventListener('change', event => {
    uiState.projectStatus = event.target.value;
    renderProjects();
    bindProjectEvents();
  });

  document.getElementById('projectReset').addEventListener('click', () => {
    uiState.projectKeyword = '';
    uiState.projectStatus = 'all';
    renderProjects();
    bindProjectEvents();
  });

  document.getElementById('projectSave').addEventListener('click', saveProject);
  document.getElementById('projectClear').addEventListener('click', clearProjectForm);

  panel.querySelectorAll('[data-action="edit-project"]').forEach(button => {
    button.addEventListener('click', () => fillProjectForm(button.dataset.id));
  });

  panel.querySelectorAll('[data-action="delete-project"]').forEach(button => {
    button.addEventListener('click', () => deleteProject(button.dataset.id));
  });
}

function projectFormData() {
  return {
    id: document.getElementById('projectIdHidden').value || nextId('prj'),
    projectCode: document.getElementById('projectCode').value.trim(),
    projectName: document.getElementById('projectName').value.trim(),
    customerName: document.getElementById('projectCustomer').value.trim(),
    ownerEmployeeId: document.getElementById('projectOwner').value.trim(),
    status: document.getElementById('projectState').value,
    priority: document.getElementById('projectPriority').value,
    schedule: document.getElementById('projectSchedule').value.trim(),
    address: document.getElementById('projectAddress').value.trim(),
    note: document.getElementById('projectNote').value.trim()
  };
}

function saveProject() {
  const payload = projectFormData();
  if (!payload.projectCode || !payload.projectName) {
    window.alert('项目编号和项目名称不能为空');
    return;
  }
  const index = state.projects.findIndex(item => item.id === payload.id);
  if (index >= 0) {
    state.projects[index] = payload;
    logAction('project', 'update', `更新项目 ${payload.projectCode} ${payload.projectName}`);
  } else {
    state.projects.unshift(payload);
    logAction('project', 'create', `新增项目 ${payload.projectCode} ${payload.projectName}`);
  }
  persistState();
  clearProjectForm();
  renderProjects();
  bindProjectEvents();
}

function fillProjectForm(id) {
  const project = state.projects.find(item => item.id === id);
  if (!project) {
    return;
  }
  document.getElementById('projectIdHidden').value = project.id;
  document.getElementById('projectCode').value = project.projectCode || '';
  document.getElementById('projectName').value = project.projectName || '';
  document.getElementById('projectCustomer').value = project.customerName || '';
  document.getElementById('projectOwner').value = project.ownerEmployeeId || '';
  document.getElementById('projectState').value = project.status || 'planning';
  document.getElementById('projectPriority').value = project.priority || 'medium';
  document.getElementById('projectSchedule').value = project.schedule || '';
  document.getElementById('projectAddress').value = project.address || '';
  document.getElementById('projectNote').value = project.note || '';
}

function clearProjectForm() {
  if (!document.getElementById('projectIdHidden')) {
    return;
  }
  document.getElementById('projectIdHidden').value = '';
  document.getElementById('projectCode').value = '';
  document.getElementById('projectName').value = '';
  document.getElementById('projectCustomer').value = '';
  document.getElementById('projectOwner').value = '';
  document.getElementById('projectState').value = 'planning';
  document.getElementById('projectPriority').value = 'medium';
  document.getElementById('projectSchedule').value = '';
  document.getElementById('projectAddress').value = '';
  document.getElementById('projectNote').value = '';
}

function deleteProject(id) {
  const project = state.projects.find(item => item.id === id);
  if (!project) {
    return;
  }
  const confirmed = window.confirm(`确认删除项目 ${project.projectCode} ${project.projectName} 吗？`);
  if (!confirmed) {
    return;
  }
  state.projects = state.projects.filter(item => item.id !== id);
  logAction('project', 'delete', `删除项目 ${project.projectCode} ${project.projectName}`);
  persistState();
  renderProjects();
  bindProjectEvents();
}

function filteredLogs() {
  return state.logs.filter(item => {
    const keyword = uiState.logKeyword.trim().toLowerCase();
    const hitKeyword = !keyword || [item.detail, item.module, item.action].some(field => String(field || '').toLowerCase().includes(keyword));
    const hitModule = uiState.logModule === 'all' || item.module === uiState.logModule;
    return hitKeyword && hitModule;
  });
}

function renderLogs() {
  const modules = Array.from(new Set(state.logs.map(item => item.module)));
  const items = filteredLogs().map(item => `
    <div class="log-item">
      <p class="log-title">${escapeHtml(item.detail)}</p>
      <p class="log-meta">${escapeHtml(item.time)} · 模块 ${escapeHtml(item.module)} · 动作 ${escapeHtml(item.action)}</p>
    </div>
  `).join('') || '<p class="empty-note">当前没有日志</p>';

  panel.innerHTML = `
    <p class="section-kicker">logs</p>
    <h3 class="section-title">日志查看</h3>
    <p class="muted-block">这里先记录后台里的所有手工操作。后续只要把 logAction 改为同时调用云函数，就能把日志写入云数据库，实现真正的操作审计。</p>
    <div class="grid two">
      <div class="card">
        <div class="toolbar">
          <input id="logKeyword" placeholder="搜索日志内容" value="${escapeHtml(uiState.logKeyword)}" />
          <select id="logModule">
            <option value="all" ${uiState.logModule === 'all' ? 'selected' : ''}>全部模块</option>
            ${modules.map(item => `<option value="${escapeHtml(item)}" ${uiState.logModule === item ? 'selected' : ''}>${escapeHtml(item)}</option>`).join('')}
          </select>
          <button class="secondary" type="button" id="logReset">重置筛选</button>
          <button class="ghost" type="button" id="logExport">导出日志 JSON</button>
          <button class="danger" type="button" id="logClear">清空日志</button>
        </div>
        <div class="log-list">${items}</div>
      </div>
      <div class="card">
        <p class="section-kicker">Audit Design</p>
        <h3>建议的日志字段</h3>
        <div class="pill-row">
          <span class="pill">time</span>
          <span class="pill">module</span>
          <span class="pill">action</span>
          <span class="pill">operator</span>
          <span class="pill">detail</span>
          <span class="pill">payloadSnapshot</span>
        </div>
        <div class="notice" style="margin-top: 14px;">如果后面接入云数据库，推荐单独建 logs 或 audit_logs 集合，不要把日志混在 users、tasks 这些业务集合里。</div>
      </div>
    </div>
  `;
}

function bindLogEvents() {
  document.getElementById('logKeyword').addEventListener('input', event => {
    uiState.logKeyword = event.target.value;
    renderLogs();
    bindLogEvents();
  });

  document.getElementById('logModule').addEventListener('change', event => {
    uiState.logModule = event.target.value;
    renderLogs();
    bindLogEvents();
  });

  document.getElementById('logReset').addEventListener('click', () => {
    uiState.logKeyword = '';
    uiState.logModule = 'all';
    renderLogs();
    bindLogEvents();
  });

  document.getElementById('logExport').addEventListener('click', () => downloadJson('logs.export.json', state.logs));
  document.getElementById('logClear').addEventListener('click', clearLogs);
}

function clearLogs() {
  const confirmed = window.confirm('确认清空所有日志吗？');
  if (!confirmed) {
    return;
  }
  state.logs = [];
  persistState();
  renderLogs();
  bindLogEvents();
}

function renderSync() {
  panel.innerHTML = `
    <p class="section-kicker">sync</p>
    <h3 class="section-title">数据同步与导入导出</h3>
    <p class="muted-block">如果你现在想用更简单的方式更新云数据库，短期最实用的方法不是直接在小程序里硬做后台，而是先在这个 Web 后台整理数据，然后一键导出 JSON，再导入云数据库。等字段稳定后，再把这里接成真实云同步。</p>
    <div class="card" style="margin-bottom: 18px;">
      <p class="section-kicker">Cloud Connect</p>
      <h3>连接云函数（Web 后台直连）</h3>
      <div class="field-grid">
        <label><span>envId</span><input id="cloudEnvId" placeholder="如 env-xxx" value="${escapeHtml(cloudConfig.envId)}" /></label>
        <label><span>adminKey</span><input id="cloudAdminKey" placeholder="填写 WEB_ADMIN_KEY 的值，不是变量名" value="${escapeHtml(cloudConfig.adminKey)}" /></label>
      </div>
      <div class="actions">
        <button class="primary" type="button" id="connectCloud">连接云函数</button>
        <button class="secondary" type="button" id="switchLocal">切换本地模式</button>
        <button class="ghost" type="button" id="diagCloud">连接诊断</button>
        <button class="danger" type="button" id="clearCloudAuth">清理认证缓存</button>
        <label style="display:flex;align-items:center;gap:8px;color:#68707a;">
          <input id="cloudAutoSync" type="checkbox" ${cloudConfig.autoSync ? 'checked' : ''} />
          <span>自动同步（预留开关）</span>
        </label>
      </div>
      <div class="notice info" style="margin-top: 14px;">状态：${escapeHtml(cloudStatusHint())}</div>
      <div class="actions">
        <button class="ghost" type="button" id="pullEmployees">从云端拉取员工</button>
        <button class="ghost" type="button" id="pullProjects">从云端拉取项目</button>
        <button class="ghost" type="button" id="pushEmployees">上传员工到云端</button>
        <button class="ghost" type="button" id="pushProjects">上传项目到云端</button>
      </div>
    </div>
    <div class="grid two">
      <div class="card">
        <p class="section-kicker">Export</p>
        <h3>导出当前数据</h3>
        <div class="actions">
          <button class="primary" type="button" id="exportEmployees">导出员工</button>
          <button class="primary" type="button" id="exportEmployeesJsonl">导出员工云导入 JSON</button>
          <button class="secondary" type="button" id="exportProjects">导出项目</button>
          <button class="secondary" type="button" id="exportProjectsJsonl">导出项目云导入 JSON</button>
          <button class="ghost" type="button" id="exportAll">导出全部</button>
        </div>
        <div class="notice info" style="margin-top: 14px;">如果要导入微信云数据库，优先使用“云导入 JSON”按钮。它导出的内容是一行一条记录，但文件后缀是 .json，兼容导入器要求。</div>
      </div>
      <div class="card">
        <p class="section-kicker">Import</p>
        <h3>导入 JSON 数据</h3>
        <label><span>导入目标</span><select id="importTarget"><option value="employees">employees</option><option value="projects">projects</option><option value="logs">logs</option></select></label>
        <label style="margin-top: 14px;"><span>JSON 内容</span><textarea class="json-box" id="importPayload" placeholder='请粘贴 JSON 数组，例如 [{"employeeId":"EMP003"}]'></textarea></label>
        <div class="actions">
          <button class="primary" type="button" id="importApply">导入并覆盖</button>
          <button class="secondary" type="button" id="resetAllData">恢复默认示例</button>
        </div>
      </div>
    </div>
    <div class="card" style="margin-top: 18px;">
      <p class="section-kicker">Future Cloud Sync</p>
      <h3>接入云数据库的最短路径</h3>
      <div class="split-list">
        <div class="list-item"><h4>阶段 1</h4><p class="helper">继续用当前本地后台维护数据，确认字段和流程。</p></div>
        <div class="list-item"><h4>阶段 2</h4><p class="helper">把保存员工改为调用 POST /admin/employees/save，把保存项目改为调用 POST /admin/tasks/save。</p></div>
        <div class="list-item"><h4>阶段 3</h4><p class="helper">增加 Web 端云开发登录和权限校验，正式替代手工导入。</p></div>
      </div>
    </div>
  `;
}

function bindSyncEvents() {
  const connectBtn = document.getElementById('connectCloud');
  const switchLocalBtn = document.getElementById('switchLocal');
  const diagCloudBtn = document.getElementById('diagCloud');
  const clearCloudAuthBtn = document.getElementById('clearCloudAuth');
  const pullEmployeesBtn = document.getElementById('pullEmployees');
  const pullProjectsBtn = document.getElementById('pullProjects');
  const pushEmployeesBtn = document.getElementById('pushEmployees');
  const pushProjectsBtn = document.getElementById('pushProjects');

  connectBtn.addEventListener('click', async () => {
    await connectCloudFromForm();
  });
  switchLocalBtn.addEventListener('click', switchToLocalMode);
  clearCloudAuthBtn.addEventListener('click', clearCloudAuthNow);

  diagCloudBtn.addEventListener('click', async () => {
    const report = await runCloudDiagnostics();
    window.alert(`诊断结果\n${report.details.join('\n')}`);
    renderSection('sync');
    bindSyncEvents();
  });

  pullEmployeesBtn.addEventListener('click', async () => {
    try {
      await pullEmployeesFromCloud();
      window.alert('已从云端拉取员工数据');
      renderSection('employees');
      bindEmployeeEvents();
    } catch (error) {
      window.alert(`拉取员工失败：${error.message || '未知错误'}`);
      renderSection('sync');
      bindSyncEvents();
    }
  });

  pullProjectsBtn.addEventListener('click', async () => {
    try {
      await pullProjectsFromCloud();
      window.alert('已从云端拉取项目数据');
      renderSection('projects');
      bindProjectEvents();
    } catch (error) {
      window.alert(`拉取项目失败：${error.message || '未知错误'}`);
      renderSection('sync');
      bindSyncEvents();
    }
  });

  pushEmployeesBtn.addEventListener('click', async () => {
    try {
      await uploadEmployeesToCloud();
      renderSection('sync');
      bindSyncEvents();
    } catch (error) {
      window.alert(`上传员工失败：${error.message || '未知错误'}`);
    }
  });

  pushProjectsBtn.addEventListener('click', async () => {
    try {
      await uploadProjectsToCloud();
      renderSection('sync');
      bindSyncEvents();
    } catch (error) {
      window.alert(`上传项目失败：${error.message || '未知错误'}`);
    }
  });

  document.getElementById('exportEmployees').addEventListener('click', () => downloadJson('employees.export.json', state.employees));
  document.getElementById('exportEmployeesJsonl').addEventListener('click', () => downloadJsonLines('employees.importable.json', state.employees));
  document.getElementById('exportProjects').addEventListener('click', () => downloadJson('projects.export.json', state.projects));
  document.getElementById('exportProjectsJsonl').addEventListener('click', () => downloadJsonLines('projects.importable.json', state.projects));
  document.getElementById('exportAll').addEventListener('click', () => downloadJson('admin-console.export.json', state));
  document.getElementById('importTarget').value = uiState.importTarget;
  document.getElementById('importTarget').addEventListener('change', event => {
    uiState.importTarget = event.target.value;
  });
  document.getElementById('importApply').addEventListener('click', importJsonPayload);
  document.getElementById('resetAllData').addEventListener('click', resetAllData);
}

function downloadJson(fileName, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadJsonLines(fileName, payload) {
  const rows = Array.isArray(payload) ? payload : [];
  const content = rows.map(item => JSON.stringify(item)).join('\n');
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function importJsonPayload() {
  const textarea = document.getElementById('importPayload');
  let parsed;
  try {
    parsed = JSON.parse(textarea.value || '[]');
  } catch (error) {
    window.alert('JSON 格式不正确');
    return;
  }
  if (!Array.isArray(parsed)) {
    window.alert('导入内容必须是 JSON 数组');
    return;
  }
  state[uiState.importTarget] = parsed;
  logAction('sync', 'import', `导入 ${uiState.importTarget} 数据 ${parsed.length} 条`);
  persistState();
  textarea.value = '';
  renderSection(activeSection);
}

function resetAllData() {
  const confirmed = window.confirm('确认恢复默认示例数据吗？当前本地数据会被覆盖。');
  if (!confirmed) {
    return;
  }
  state = clone(seedState);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  renderDashboardStrip();
  renderSection(activeSection);
}

renderNav();
renderDashboardStrip();
renderSection('dashboard');
