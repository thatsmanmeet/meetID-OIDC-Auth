// Destructuring can help disregard the data not needed
export const sanitizeUser = (user: Record<string, any>) => {
  const {
    password: _,
    refreshTokenHash: __,
    passwordResetToken: ___,
    ...rest
  } = user;
  return rest;
};
