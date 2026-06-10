import React, { Suspense } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { texailogo } from '@/assets/icons';
import { Star } from 'lucide-react';

const AuthLayout: React.FC = () => {
    const location = useLocation();

    return (
        <div className="min-h-screen w-full flex flex-col md:flex-row bg-white overflow-hidden">
            {/* ... lines 10-87 ... */}
            {/* Left Side: Branding & Marketing omitted for brevity in replace_file_content target */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-b from-[#005CDA] to-[#001F4A] flex-col justify-between p-8 xl:p-12 text-white">
                <div className="absolute top-0 left-0 w-full h-full z-0">
                    <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] bg-gradient-to-b from-[#005CDA] to-[#001F4A] rounded-full blur-[120px] opacity-40 animate-pulse" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-gradient-to-b from-[#005CDA] to-[#001F4A] rounded-full blur-[120px] opacity-40 animate-pulse" />
                    <div className="absolute top-[20%] right-[-5%] w-[40%] h-[40%] bg-gradient-to-b from-[#005CDA] to-[#001F4A] rounded-full blur-[100px] opacity-20" />
                    <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path d="M0 20 Q 25 10 50 20 T 100 20" fill="none" stroke="currentColor" strokeWidth="0.5" />
                        <path d="M0 50 Q 25 40 50 50 T 100 50" fill="none" stroke="currentColor" strokeWidth="0.5" />
                        <path d="M0 80 Q 25 70 50 80 T 100 80" fill="none" stroke="currentColor" strokeWidth="0.5" />
                    </svg>
                </div>
                <div className="relative z-10">
                    <Link to="/" className="inline-block p-1">
                        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20">
                            <img 
                                src={texailogo} 
                                alt="TekXAI Logo" 
                                className="h-8 w-auto brightness-0 invert" 
                                loading="eager"
                                decoding="async"
                            />
                        </div>
                    </Link>
                </div>
                <div className="relative z-10 flex flex-col gap-6 xl:gap-8 max-w-lg">
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        <h1 className="text-2xl sm:text-3xl xl:text-4xl font-bold leading-snug tracking-tight">
                            Welcome to our{' '}
                            <span className="text-primary-200">community</span>
                        </h1>
                        <div className="w-16 h-1 bg-primary-300 mt-4 rounded-full" />
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="flex flex-col gap-4 xl:gap-6"
                    >
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                                <Star key={s} size={16} fill="#FFD700" color="#FFD700" className="xl:w-5 xl:h-5" />
                            ))}
                        </div>
                        <p className="text-sm xl:text-base font-medium text-primary-50 leading-relaxed">
                            "TekXAI has completely transformed how we manage our projects.
                            The AI insights are game-changing and allow us to focus on
                            what really matters for our business growth."
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 xl:w-12 xl:h-12 rounded-full border-2 border-primary-300 bg-primary-500 overflow-hidden flex items-center justify-center text-base xl:text-xl font-bold italic shrink-0">
                                MU
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="font-bold text-sm xl:text-base">Muhammad Usman</span>
                                <span className="text-primary-200 text-xs xl:text-sm">CEO at TEKXAI</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
                <div className="relative z-10 text-primary-200 text-xs font-medium">
                    © {new Date().getFullYear()} TekXAI. All rights reserved.
                </div>
            </div>

            {/* Right Side: Form Content */}
            <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-4 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-16 bg-white relative min-h-screen">
                <div className="lg:hidden w-full flex justify-center mb-6 sm:mb-8 pt-4">
                    <img
                        src={texailogo}
                        alt="TekXAI Logo"
                        className="h-16 w-auto"
                        loading="eager"
                        decoding="async"
                    />
                </div>

                <motion.div
                    key={location.pathname}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md sm:max-w-lg"
                >
                    <Suspense fallback={<div className="flex items-center justify-center h-48">Loading...</div>}>
                        <Outlet />
                    </Suspense>
                </motion.div>
            </div>
        </div>
    );
};

export default AuthLayout;
