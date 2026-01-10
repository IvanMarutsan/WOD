export const ADMIN_ROLES = ['admin', 'super_admin'];
export const ADMIN_SESSION_KEY = 'wodAdminSession';

export const getUserRoles = (user) => {
  const roles = user?.app_metadata?.roles;
  return Array.isArray(roles) ? roles : [];
};

export const hasAdminRole = (user) => {
  const roles = getUserRoles(user);
  return roles.some((role) => ADMIN_ROLES.includes(role));
};

export const isSuperAdmin = (user) => getUserRoles(user).includes('super_admin');
