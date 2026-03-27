const STORAGE_KEYS = {
  USER_INFO: 'userInfo',
  TOKEN: 'token',
  RUNTIME_SETTINGS: 'runtimeSettings',
  CHECKIN_RECORDS: 'checkInRecords',
  TASKS: 'tasks',
  PERFORMANCE: 'performance',
  BONUS_HISTORY: 'bonusHistory',
  PROBLEMS: 'problems',
  REIMBURSEMENTS: 'reimbursements',
  TEMP_WORKER_REQUESTS: 'tempWorkerRequests'
};

const USER_ROLE = {
  FORMAL: 'formal',
  EXECUTOR: 'executor',
  ADMIN: 'admin',
  MANAGER: 'manager',
  FINANCE: 'finance',
  WAREHOUSE: 'warehouse',
  TEMP: 'temp'
};

const CLOUD_FUNCTIONS = {
  API: 'api'
};

const CLOUD_STORAGE_PREFIX = 'delivery-worker';

const RUNTIME_DEFAULTS = {
  backendMode: 'cloud',
  allowLocalFallback: false
};

module.exports = {
  STORAGE_KEYS,
  USER_ROLE,
  CLOUD_FUNCTIONS,
  CLOUD_STORAGE_PREFIX,
  RUNTIME_DEFAULTS
};
