/**
 * Validation Schemas for Forms
 */

export type ValidationError = string | undefined;

export const validateEmail = (value: string | undefined): ValidationError => {
  if (!value) return 'Email is required';
  const emailRegex = /^[^\s@]+@[a-zA-Z][a-zA-Z0-9-]*\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(value)) return 'Please enter a valid email address';
  return undefined;
};

export const getPasswordRequirements = (password: string) => {
  return {
    length: password.length >= 8 && password.length <= 16,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };
};

export const validatePassword = (value: string | undefined): ValidationError => {
  if (!value) return 'Password is required';
  const reqs = getPasswordRequirements(value);
  if (!reqs.length) return 'Password must be 8-16 characters';
  if (!reqs.uppercase) return 'Must include uppercase letter';
  if (!reqs.lowercase) return 'Must include lowercase letter';
  if (!reqs.number) return 'Must include a number';
  if (!reqs.special) return 'Must include special character';
  return undefined;
};

export const validateRequired = (value: any, fieldName: string): ValidationError => {
  if (value === undefined || value === null || value === '') return `${fieldName} is required`;
  return undefined;
};

export const validateMobileNumber = (value: string | undefined): ValidationError => {
  if (!value) return 'Mobile number is required';
  const cleaned = value.replace(/[\s\-()+]/g, '');
  if (!/^\d{10,15}$/.test(cleaned)) return 'Please enter a valid mobile number (10-15 digits)';
  return undefined;
};

export const validateRegisterForm = (values: any) => {
  const errors: Record<string, string> = {};

  if (!values.first_name) errors.first_name = 'First name is required';
  if (!values.last_name) errors.last_name = 'Last name is required';

  const emailError = validateEmail(values.email);
  if (emailError) errors.email = emailError;

  const passwordError = validatePassword(values.password);
  if (passwordError) errors.password = passwordError;

  const mobileError = validateMobileNumber(values.phone);
  if (mobileError) errors.phone = mobileError;

  if (!values.role_id) errors.role_id = 'Role is required';
  if (!values.department) errors.department = 'Department is required';
  if (!values.position) errors.position = 'Position is required';

  return errors;
};

export const validateLoginForm = (values: { email: string; password: string }) => {
  const errors: any = {};
  const emailError = validateEmail(values.email);
  if (emailError) errors.email = emailError;
  if (!values.password) errors.password = 'Password is required';
  return errors;
};

export const validateOTP = (value: string | undefined): ValidationError => {
  if (!value) return 'OTP is required';
  if (!/^\d{4}$/.test(value)) return 'OTP must be 4 digits';
  return undefined;
};

export const validateForgetPasswordForm = (values: { email: string }) => {
  const errors: any = {};
  const emailError = validateEmail(values.email);
  if (emailError) errors.email = emailError;
  return errors;
};

export const validateVerifyOTPForm = (values: { otp: string }) => {
  const errors: any = {};
  const otpError = validateOTP(values.otp);
  if (otpError) errors.otp = otpError;
  return errors;
};

export const validateResetPasswordForm = (values: { password: string; confirmPassword: string }) => {
  const errors: any = {};
  const passwordError = validatePassword(values.password);
  if (passwordError) errors.password = passwordError;
  if (values.password !== values.confirmPassword) errors.confirmPassword = 'Passwords do not match';
  return errors;
};
