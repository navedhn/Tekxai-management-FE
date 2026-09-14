import React, { Suspense } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import tekxaiLogo from '@/assets/icons/tekxai-logo.svg';
import muhammadUsman from '@/assets/images/muhammad-usman.png';
import TekxaiLogoWatermark from './TekxaiLogoWatermark';

const AuthLayout: React.FC = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-white overflow-hidden">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-b from-[#005CDA] to-[#001F4A] flex-col justify-between p-8 xl:p-12 text-white">
        <div className="absolute top-0 left-0 w-full h-full z-0" aria-hidden>
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
            <img
              src={tekxaiLogo}
              alt="TekXAI"
              className="h-8 xl:h-9 w-auto brightness-0 invert object-contain"
              loading="eager"
              decoding="async"
            />
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
              &ldquo;TekXAI has completely transformed how we manage our projects.
              The AI insights are game-changing and allow us to focus on
              what really matters for our business growth.&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <img
                src={muhammadUsman}
                alt="Muhammad Usman"
                className="w-11 h-11 xl:w-12 xl:h-12 rounded-full border-2 border-primary-300 object-cover object-top shrink-0"
                loading="eager"
                decoding="async"
              />
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

      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-4 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-16 bg-white relative min-h-screen overflow-hidden">
        <TekxaiLogoWatermark />

        <div className="lg:hidden w-full flex justify-center mb-6 sm:mb-8 pt-4 relative z-10">
          <img
            src={tekxaiLogo}
            alt="TekXAI"
            className="h-10 w-auto object-contain"
            loading="eager"
            decoding="async"
          />
        </div>

        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md sm:max-w-lg relative z-10"
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
