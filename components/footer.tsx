'use client';

import Link from 'next/link';
import Image from 'next/image';

export function Footer() {
  return (
    <footer className="bg-slate-900 text-white">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand Column */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <Image
                src="/LOGO.png"
                alt="PocketPost"
                width={32}
                height={32}
                className="w-8 h-8 object-contain brightness-0 invert"
              />
              <span className="font-heading font-bold text-lg tracking-tight">
                PocketPost
              </span>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed">
              By the pocket for what&apos;s needed. Connecting people who need to send items with verified travelers already heading that way.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h4 className="font-heading font-semibold text-sm uppercase tracking-wider text-slate-300 mb-4">
              Platform
            </h4>
            <ul className="space-y-3">
              {[
                { name: 'How it Works', href: '/#how-it-works' },
                { name: 'Post a Request', href: '/post' },
                { name: 'Browse Deliveries', href: '/feed' },
                { name: 'Become a Carrier', href: '/feed' },
              ].map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-slate-400 hover:text-white text-sm transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Safety */}
          <div>
            <h4 className="font-heading font-semibold text-sm uppercase tracking-wider text-slate-300 mb-4">
              Safety
            </h4>
            <ul className="space-y-3">
              {[
                { name: 'Trust & Safety', href: '/#trust' },
                { name: 'Verified Carriers', href: '/#trust' },
                { name: 'Admin Controls', href: '/#trust' },
                { name: 'Delivery Tracking', href: '/#how-it-works' },
              ].map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-slate-400 hover:text-white text-sm transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-heading font-semibold text-sm uppercase tracking-wider text-slate-300 mb-4">
              Company
            </h4>
            <ul className="space-y-3">
              {[
                { name: 'About', href: '/#what-is' },
                { name: 'Privacy Policy', href: '#' },
                { name: 'Terms of Service', href: '#' },
                { name: 'Contact', href: '#' },
              ].map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-slate-400 hover:text-white text-sm transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} PocketPost. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="#" className="text-slate-500 hover:text-white text-sm transition-colors">
              Privacy
            </Link>
            <Link href="#" className="text-slate-500 hover:text-white text-sm transition-colors">
              Terms
            </Link>
            <Link href="#" className="text-slate-500 hover:text-white text-sm transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
