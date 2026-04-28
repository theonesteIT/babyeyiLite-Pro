import React, { useState } from 'react';
import { UserCircle, UserIcon, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export function Layout({ children, userName = "[current user name]", navItems = [], isHome = true, title = "" }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className={`w-full flex flex-col h-screen overflow-hidden ${isHome ? 'bg-striped-blue' : 'bg-white'}`}>

      {/* Header */}
      <header className={`flex items-center justify-between  ${isHome ?'px-10 py-4':'px-6 py-1'}  transition-all duration-300 ${isHome ? 'bg-transparent text-primary' : 'bg-primary text-white shadow-lg'}`}>

        {/* Left Section */}
        <div className="flex items-center gap-6">
          
          {/* Logo & Title */}
          {!isHome ? (
            <Link 
              to="/" 
              className="flex items-center gap-3 no-underline group cursor-pointer"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <div className="w-7 h-7 flex items-center justify-center relative">
                <AnimatePresence mode="wait">
                  {isHovered ? (
                    <motion.div
                      key="chevron"
                      initial={{ opacity: 0, x: 5, scale: 0.8 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 5, scale: 0.8 }}
                      transition={{ duration: 0.15 }}
                    >
                      <ChevronLeft className="w-6 h-6 text-white" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="logo"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.15 }}
                    >
                      <img src="/logo_white.png" className="w-7 h-auto" alt="Logo" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              {title && (
                <div className="border-l border-white/30 pl-3 ml-1 overflow-hidden h-7 flex items-center">
                  <AnimatePresence mode="wait">
                    {isHovered ? (
                      <motion.span
                        key="back"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.15 }}
                        className="font-bold text-lg uppercase tracking-tight text-white/90"
                      >
                        Back
                      </motion.span>
                    ) : (
                      <motion.span
                        key="title"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.15 }}
                        className="font-bold text-lg uppercase tracking-tight"
                      >
                        {title}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <img src="/logo.png" className="w-10 h-auto" alt="Logo" />
            </div>
          )}

          {/* Nav */}
          <nav>
            {navItems.length > 0 ? (
              <div className="flex items-center gap-4">
                {navItems.map((item, index) => (
                  <Link
                    key={index}
                    to={item.path}
                    className={`text-sm transition-all duration-200 no-underline ${isHome ? 'text-primary/60 hover:text-primary' : 'text-white/80 hover:text-white'}`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ) : (
              <span className={`text-sm ${isHome ? 'text-primary/40' : 'text-white/40'}`}>
                 Edupoto School Management System
              </span>
            )}
          </nav>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          <span className={`font-semibold  ${isHome ? 'text-primary/80' : 'text-white'}`}>
            {userName}
          </span>

          <div className={`w-8 h-8  rounded-full flex items-center justify-center transition-all ${isHome ? 'bg-primary' : 'bg-white/10 hover:bg-white/20'}`}>
            <UserIcon className={`w-4 h-4 ${isHome ? 'text-white' : 'text-white'}`} strokeWidth={1.5} />
          </div>
        </div>

      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>

    </div>
  );
}