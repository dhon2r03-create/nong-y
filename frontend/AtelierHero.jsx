import React, { useState } from 'react';
import { ArrowRight, Play } from 'lucide-react';

export default function AtelierHero() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  const navLinks = [
    { name: 'Projects', href: '#projects' },
    { name: 'Expertise', href: '#expertise' },
    { name: 'Studio', href: '#studio' },
    { name: 'Insights', href: '#insights' },
    { name: 'Reach Out', href: '#contact' },
  ];

  return (
    <section className="relative w-full h-screen overflow-hidden bg-black text-white select-none">
      {/* Background: Fullscreen looping autoplay muted video covering viewport with object-cover */}
      <video
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_204103_f607742e-09da-4cf5-bb06-4e67b0a531de.mp4"
      />

      {/* Overlay backdrop for high-contrast readability */}
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />

      {/* Content layer: relative z-10 flex flex-col h-full */}
      <div className="relative z-10 flex flex-col h-full w-full">
        {/* Navbar */}
        <nav className="w-full flex items-center justify-between px-6 md:px-12 lg:px-16 py-5 md:py-6">
          {/* Left side: Logo + desktop nav links */}
          <div className="flex items-center gap-8 lg:gap-12">
            <a href="/" className="text-white font-semibold text-lg tracking-tight font-sans">
              Atelier
            </a>
            <div className="hidden md:flex items-center gap-6 lg:gap-8">
              {navLinks.slice(0, 4).map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-white/80 hover:text-white text-sm font-light transition-colors duration-200"
                >
                  {link.name}
                </a>
              ))}
            </div>
          </div>

          {/* Right side: Reach Out + Let's Talk button + hamburger */}
          <div className="flex items-center gap-6">
            <a
              href="#contact"
              className="hidden md:inline-block text-white/80 hover:text-white text-sm font-light transition-colors duration-200"
            >
              Reach Out
            </a>
            <a
              href="#contact"
              className="hidden md:inline-flex items-center bg-white text-black rounded-full px-5 py-2 text-sm font-medium hover:bg-white/90 transition-colors"
            >
              Let's Talk
            </a>

            {/* Hamburger button: shown only on mobile (md:hidden) */}
            <button
              type="button"
              onClick={toggleMobileMenu}
              className="md:hidden flex flex-col items-end justify-center w-8 h-8 gap-1.5 focus:outline-none cursor-pointer z-50"
              aria-label="Toggle mobile menu"
              aria-expanded={isMobileMenuOpen}
            >
              <span
                className={`h-[2px] w-6 bg-white rounded-full transition-all duration-500 origin-center ${
                  isMobileMenuOpen ? 'translate-y-[8px] rotate-45' : ''
                }`}
                style={{ transitionTimingFunction: 'cubic-bezier(0.76, 0, 0.24, 1)' }}
              />
              <span
                className={`h-[2px] w-4 bg-white rounded-full transition-all duration-500 ${
                  isMobileMenuOpen ? 'opacity-0 -translate-x-2' : ''
                }`}
                style={{ transitionTimingFunction: 'cubic-bezier(0.76, 0, 0.24, 1)' }}
              />
              <span
                className={`h-[2px] w-6 bg-white rounded-full transition-all duration-500 origin-center ${
                  isMobileMenuOpen ? '-translate-y-[8px] -rotate-45' : ''
                }`}
                style={{ transitionTimingFunction: 'cubic-bezier(0.76, 0, 0.24, 1)' }}
              />
            </button>
          </div>
        </nav>

        {/* Hero Content (centered below navbar) */}
        <div className="flex-1 flex flex-col items-center justify-start pt-4 sm:pt-6 md:pt-8 lg:pt-10 px-6 text-center">
          <h1 className="font-instrument-serif text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl leading-[1.1] max-w-5xl">
            UX <span className="italic font-instrument-serif">and</span> APP
            <br />
            DESIGN <span className="italic font-instrument-serif">for</span> BOLD
            <br />
            VENTURES
          </h1>

          <p className="mt-4 md:mt-5 text-white/70 text-sm md:text-base font-light max-w-md leading-relaxed font-sans">
            We shape digital products that define brands
            <br className="hidden sm:block" /> and unlock exponential growth.
          </p>

          {/* Buttons row */}
          <div className="mt-5 md:mt-6 flex flex-col sm:flex-row items-center gap-4">
            <a
              href="#cases"
              className="group flex items-center gap-2 bg-white text-black rounded-full px-7 py-3 text-sm font-medium hover:bg-white/90 transition-all shadow-md"
            >
              <span>See Cases</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
            </a>

            <button
              type="button"
              className="flex items-center gap-2 bg-transparent border border-white/40 text-white rounded-full px-7 py-3 text-sm font-medium hover:bg-white/10 hover:border-white/60 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Watch Reel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay (fixed inset-0 z-50, md:hidden) */}
      <div
        className={`fixed inset-0 z-50 md:hidden bg-black/90 backdrop-blur-xl flex flex-col transition-opacity duration-700 ${
          isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.76, 0, 0.24, 1)' }}
      >
        {/* Overlay Header */}
        <div className="w-full flex items-center justify-between px-6 py-5">
          <a href="/" className="text-white font-semibold text-lg tracking-tight font-sans">
            Atelier
          </a>
          <button
            type="button"
            onClick={toggleMobileMenu}
            className="flex flex-col items-center justify-center w-8 h-8 focus:outline-none cursor-pointer"
            aria-label="Close menu"
          >
            <span className="h-[2px] w-6 bg-white rounded-full rotate-45 translate-y-[1px]" />
            <span className="h-[2px] w-6 bg-white rounded-full -rotate-45 -translate-y-[1px]" />
          </button>
        </div>

        {/* Staggered Nav Links */}
        <div className="flex-1 flex flex-col justify-center px-8 sm:px-12">
          {navLinks.map((link, idx) => (
            <a
              key={link.name}
              href={link.href}
              onClick={toggleMobileMenu}
              className={`text-4xl sm:text-5xl font-instrument-serif text-white border-b border-white/10 py-4 block transition-all duration-700 hover:pl-4 ${
                isMobileMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
              }`}
              style={{
                transitionDelay: `${150 + idx * 80}ms`,
                transitionTimingFunction: 'cubic-bezier(0.76, 0, 0.24, 1)',
              }}
            >
              {link.name}
            </a>
          ))}
        </div>

        {/* Overlay Footer Button */}
        <div className="p-8 sm:p-12">
          <a
            href="#contact"
            onClick={toggleMobileMenu}
            className={`block w-full bg-white text-black rounded-full py-4 text-center font-medium font-sans text-base hover:bg-white/90 transition-all duration-700 ${
              isMobileMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
            }`}
            style={{
              transitionDelay: '550ms',
              transitionTimingFunction: 'cubic-bezier(0.76, 0, 0.24, 1)',
            }}
          >
            Let's Talk
          </a>
        </div>
      </div>
    </section>
  );
}
