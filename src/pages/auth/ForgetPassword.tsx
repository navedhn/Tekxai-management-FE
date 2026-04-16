import React, { useState } from 'react';
import { Formik, Form } from 'formik';
import { Link, useNavigate } from 'react-router-dom';
import { useForgetPasswordMutation } from '@/services/authService';
import { validateForgetPasswordForm } from '@/utils/validationSchemas';
import { Button, FormInput } from '@/components';
import { useToastContext } from '@/components/toast/ToastProvider';
import { CheckCircle } from 'lucide-react';

const ForgetPassword: React.FC = () => {
    const forgetPasswordMutation = useForgetPasswordMutation();
    const [emailSent, setEmailSent] = useState(false);
    const [userEmail, setUserEmail] = useState('');
    const [userId, setUserId] = useState<string | number | null>(null);
    const navigate = useNavigate();
    const toast = useToastContext();

    const handleSubmit = async (values: { email: string }) => {
        try {
            const res: any = await forgetPasswordMutation.mutateAsync({ email: values.email });
            const userId = res?.payload?.id ?? res?.id;
            setUserEmail(values.email);
            setEmailSent(true);
            toast.success('OTP has been sent to your email address.');
            // We'll store the ID in a way that navigate can pass it
            setUserId(userId);
        } catch (error: any) {
            const errorMessage =
                error?.data?.message ||
                error?.message ||
                'Failed to send OTP. Please try again.';
            toast.error(errorMessage);
        }
    };

    if (emailSent) {
        return (
            <div className="flex flex-col gap-10 items-center text-center">
                <div className="w-24 h-24 bg-green-50 rounded-3xl flex items-center justify-center text-green-500 shadow-inner">
                    <CheckCircle size={48} strokeWidth={2.5} />
                </div>

                <div className="flex flex-col gap-3">
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">Check Your Email</h1>
                    <p className="text-gray-500 font-medium">
                        We've sent a 4-digit OTP to <strong className="text-primary-500">{userEmail}</strong>.
                        Please check your inbox.
                    </p>
                </div>

                <div className="w-full pt-4">
                    <Button
                        onClick={() => navigate('/verify-otp', { state: { email: userEmail, id: userId } })}
                        fullWidth
                        size="lg"
                        className="h-14 rounded-xl shadow-[0_10px_30px_rgba(31,123,255,0.2)] text-lg font-bold"
                    >
                        Click the Button to Verify OTP
                    </Button>
                </div>

                <div className="text-sm font-bold text-gray-400">
                    <Link to="/login" className="text-primary-500 hover:text-primary-600 font-black transition-colors underline decoration-2 underline-offset-4 decoration-primary-100 hover:decoration-primary-500">
                        Back to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-10">
            <div className="flex flex-col gap-3">
                <h1 className="text-4xl font-black text-gray-900 tracking-tight">Forget Password</h1>
                <p className="text-gray-500 font-medium">
                    Enter your email address and we'll send you an OTP to reset your password.
                </p>
            </div>

            <Formik
                initialValues={{ email: '' }}
                validate={validateForgetPasswordForm}
                onSubmit={handleSubmit}
            >
                {({ values, handleChange, handleBlur, errors, touched }) => (
                    <Form className="flex flex-col gap-6">
                        <FormInput
                            label="WORK EMAIL *"
                            name="email"
                            type="email"
                            placeholder="Enter email"
                            value={values.email}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            labelClassName="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-1"
                            error={touched.email && errors.email ? errors.email : undefined}
                        />

                        <div className="pt-2">
                            <Button
                                type="submit"
                                disabled={forgetPasswordMutation.isPending}
                                fullWidth
                                size="lg"
                                className="h-12 rounded-xl shadow-[0_10px_30px_rgba(31,123,255,0.2)] text-lg font-bold"
                            >
                                {forgetPasswordMutation.isPending ? 'Sending OTP...' : 'Send OTP'}
                            </Button>
                        </div>

                        <div className="h-px bg-gray-100 w-full my-4" />

                        <div className="text-center text-sm font-medium text-gray-500">
                            Remember your password?{' '}
                            <Link to="/login" className="text-primary-500 hover:text-primary-600 font-black transition-colors  decoration-2 underline-offset-4 decoration-primary-100 hover:decoration-primary-500">
                                Login
                            </Link>
                        </div>
                    </Form>
                )}
            </Formik>
        </div>
    );
};

export default ForgetPassword;
