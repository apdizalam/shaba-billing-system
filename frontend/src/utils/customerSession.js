/**
 * Safe customer profile resolution for navigation params and AuthContext.
 */
export function resolveCustomerUserInfo(route, authContext) {
  const fromRoute = route?.params?.userInfo;
  if (fromRoute) return fromRoute;

  const fromAuth = authContext?.userInfo;
  if (!fromAuth) return {};

  return fromAuth.user ?? fromAuth;
}

export function buildCustomerNavParams(route, authContext, extra = {}) {
  return {
    userInfo: resolveCustomerUserInfo(route, authContext),
    ...extra,
  };
}
