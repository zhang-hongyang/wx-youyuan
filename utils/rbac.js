const { USER_ROLE } = require('./constants.js');

const ROLE_ALIAS = {
  registered: USER_ROLE.EXECUTOR,
  formal: USER_ROLE.EXECUTOR,
  staff: USER_ROLE.EXECUTOR
};

const PAGE_ROLE_GUARDS = {
  '/pages/admin/admin': [USER_ROLE.ADMIN, USER_ROLE.MANAGER],
  '/pages/warehouse/warehouse': [USER_ROLE.ADMIN, USER_ROLE.WAREHOUSE]
};

function normalizeUserRole(userInfo = {}) {
  const rawRole = String(userInfo.role || '').trim();
  if (ROLE_ALIAS[rawRole]) {
    return ROLE_ALIAS[rawRole];
  }
  if (rawRole) {
    return rawRole;
  }

  if (userInfo.userType === 'temp') {
    return USER_ROLE.TEMP;
  }
  return USER_ROLE.EXECUTOR;
}

function getRoleHomeRoute(userInfo = {}) {
  const role = normalizeUserRole(userInfo);

  if (role === USER_ROLE.ADMIN || role === USER_ROLE.MANAGER) {
    return { url: '/pages/admin/admin', isTab: false };
  }
  if (role === USER_ROLE.WAREHOUSE) {
    return { url: '/pages/warehouse/warehouse', isTab: false };
  }
  if (role === USER_ROLE.FINANCE) {
    return { url: '/pages/reimbursement/reimbursement', isTab: false };
  }

  return { url: '/pages/index/index', isTab: true };
}

function hasAnyRole(userInfo = {}, roles = []) {
  const role = normalizeUserRole(userInfo);
  return roles.includes(role);
}

function canAccessPage(route, userInfo = {}) {
  const rules = PAGE_ROLE_GUARDS[route];
  if (!rules || !rules.length) {
    return true;
  }
  return hasAnyRole(userInfo, rules);
}

module.exports = {
  normalizeUserRole,
  getRoleHomeRoute,
  hasAnyRole,
  canAccessPage,
  PAGE_ROLE_GUARDS
};
