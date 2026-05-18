import React, { useMemo } from 'react';
import { Formik, Form } from 'formik';
import { Link, useNavigate } from 'react-router-dom';
import { useRegisterMutation } from '@/services/authService';
import { validateRegisterForm } from '@/utils/validationSchemas';
import { Button, FormInput } from '@/components';
import { useToastContext } from '@/components/toast/ToastProvider';
import Select from '@/components/ui/Select';
import PasswordValidator from '@/components/ui/PasswordValidator';

const Register: React.FC = () => {
  const registerMutation = useRegisterMutation();
  const navigate = useNavigate();
  const toast = useToastContext();

  const handleSubmit = async (values: any) => {
    try {
      // Send exactly the 8 fields requested
      const payload = {
        first_name: values.first_name,
        last_name: values.last_name,
        phone: values.phone,
        email: values.email,
        password: values.password,
        role_id: values.role_id,
        department: values.department,
        position: values.position,
      };

      await registerMutation.mutateAsync(payload);
      toast.success('Registration successful! Please login to continue.');
      navigate('/login');
    } catch (error: any) {
      const errorMessage =
        error?.data?.message ||
        error?.message ||
        'Registration failed. Please try again.';
      toast.error(errorMessage);
    }
  };

  // Dependent dropdown options
  const departmentOptions = [
    { value: 'IT / Development', label: 'IT / Development' },
    { value: 'Civil Engineering', label: 'Civil Engineering' }
  ];

  const getPositionOptions = (department: string) => {
    if (department === 'Civil Engineering') {
      return [{ value: 'Civil Engineer', label: 'Civil Engineer' }];
    }
    if (department === 'IT / Development') {
      return [
        { value: 'Backend Developer', label: 'Backend Developer' },
        { value: 'Frontend AI Developer', label: 'Frontend AI Developer' },
        { value: 'UI UX Developer', label: 'UI UX Developer' }
      ];
    }
    return [];
  };

  return (
    <div className="flex flex-col gap-8 py-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Create account</h1>
        <p className="text-sm text-gray-500 font-medium">Please fill in the details below to join TEKXAI.</p>
      </div>

      <Formik
        initialValues={{
          first_name: '',
          last_name: '',
          phone: '',
          email: '',
          password: '',
          role_id: '60e032cc-3305-4de9-a34e-f5a3d9725fbc',
          department: '',
          position: ''
        }}
        validate={validateRegisterForm}
        onSubmit={handleSubmit}
      >
        {({ values, handleChange, handleBlur, setFieldValue, errors, touched }) => (
          <Form className="flex flex-col gap-6">
            {/* Row 1: Names */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="FIRST NAME *"
                name="first_name"
                type="text"
                placeholder="John"
                value={values.first_name}
                onChange={handleChange}
                onBlur={handleBlur}
                labelClassName="text-[10px] font-black text-gray-400 tracking-widest uppercase"
                error={touched.first_name && errors.first_name ? errors.first_name : undefined}
              />
              <FormInput
                label="LAST NAME *"
                name="last_name"
                type="text"
                placeholder="Doe"
                value={values.last_name}
                onChange={handleChange}
                onBlur={handleBlur}
                labelClassName="text-[10px] font-black text-gray-400 tracking-widest uppercase"
                error={touched.last_name && errors.last_name ? errors.last_name : undefined}
              />
            </div>

            {/* Row 2: Contact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="EMAIL ADDRESS *"
                name="email"
                type="email"
                placeholder="name@example.com"
                value={values.email}
                onChange={handleChange}
                onBlur={handleBlur}
                labelClassName="text-[10px] font-black text-gray-400 tracking-widest uppercase"
                error={touched.email && errors.email ? errors.email : undefined}
              />
              <FormInput
                label="MOBILE NUMBER *"
                name="phone"
                type="text"
                placeholder="+1234567890"
                value={values.phone}
                onChange={handleChange}
                onBlur={handleBlur}
                labelClassName="text-[10px] font-black text-gray-400 tracking-widest uppercase"
                error={touched.phone && errors.phone ? errors.phone : undefined}
              />
            </div>

            {/* Row 3: Role & Department */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="REGISTER AS *"
                value={values.role_id}
                onChange={(val) => setFieldValue('role_id', val)}
                options={[
                  { value: 'EMPLLOYEE', label: 'Employee' },
                  { value: 'ADMIN', label: 'Admin' }
                ]}
                error={touched.role_id && errors.role_id ? (errors.role_id as string) : undefined}
              />
              <Select
                label="DEPARTMENT *"
                value={values.department}
                onChange={(val) => {
                  setFieldValue('department', val);
                  setFieldValue('position', ''); // Reset position on department change
                }}
                options={departmentOptions}
                error={touched.department && errors.department ? (errors.department as string) : undefined}
              />
            </div>

            {/* Row 4: Position (Dependent) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="POSITION *"
                value={values.position}
                onChange={(val) => setFieldValue('position', val)}
                options={getPositionOptions(values.department)}
                disabled={!values.department}
                placeholder={values.department ? "Select Position" : "Select Department First"}
                error={touched.position && errors.position ? (errors.position as string) : undefined}
              />
            </div>

            {/* Row 5: Password */}
            <div className="flex flex-col gap-4">
              <FormInput
                label="PASSWORD *"
                name="password"
                type="password"
                placeholder="••••••••"
                value={values.password}
                onChange={handleChange}
                onBlur={handleBlur}
                labelClassName="text-[10px] font-black text-gray-400 tracking-widest uppercase"
                error={touched.password && errors.password ? errors.password : undefined}
              />

              {/* Complex Password Validation UI */}
              <PasswordValidator password={values.password} />
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={registerMutation.isPending}
                disabled={registerMutation.isPending}
                className="h-14 rounded-xl shadow-[0_10px_30px_rgba(31,123,255,0.2)] text-lg font-bold"
              >
                {registerMutation.isPending ? 'Creating account...' : 'Sign Up'}
              </Button>
            </div>

            <div className="text-center text-sm font-medium text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-500 hover:text-primary-600 font-bold transition-colors underline decoration-2 underline-offset-4 decoration-primary-100 hover:decoration-primary-500">
                Login
              </Link>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default Register;
