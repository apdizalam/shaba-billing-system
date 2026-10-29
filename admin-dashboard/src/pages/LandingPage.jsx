import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  const [showDemo, setShowDemo] = useState(false);
  const [showDev, setShowDev] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-r from-emerald-600 to-blue-600 text-white font-sans">
      {/* Navigation */}
      <nav className="w-full flex items-center justify-between px-8 py-6">
        <div className="font-black text-2xl tracking-tighter">SHaaba<span className="text-emerald-200">.</span></div>
        <div className="flex gap-8 text-sm font-medium">
          <button onClick={() => setShowDemo(true)} className="hover:text-emerald-100">Demo</button>
          <button onClick={() => setShowDev(true)} className="hover:text-emerald-100">Developer</button>
          <Link
            to="/login"
            className="bg-white/10 backdrop-blur-sm border border-white/20 px-6 py-2 rounded-full hover:bg-white/20 transition"
          >
            Login
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-8 py-16 flex flex-col md:flex-row items-center gap-12">
        <div className="flex-1">
          <h1 className="text-5xl font-extrabold leading-tight">
            Xalka casriga ah ee <br/> <span className="text-emerald-200">maareynta biyaha iyo biilka</span>
          </h1>
          <p className="mt-6 text-emerald-50 max-w-lg text-lg opacity-90">
            Meesha ugu sareysa ee xisaabinta biilka, soo saarista warbixinnada, iyo bixinta mobile-ka. Kordhi xawaaraha maareyntaaga biyaha.
          </p>
          
          <div className="flex gap-4 mt-8">
            <button className="bg-white text-emerald-700 font-bold px-8 py-3 rounded-full shadow-lg hover:bg-emerald-50 transition">Bilow Hadda →</button>
            <button onClick={() => setShowDemo(true)} className="border border-white/30 px-8 py-3 rounded-full hover:bg-white/10 transition">Demo</button>
          </div>
        </div>

        {/* Glass Card Section */}
        <div className="flex-1 w-full bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-3xl shadow-2xl">
           <div className="space-y-6">
             <div className="bg-white/10 p-4 rounded-xl">
               <h3 className="font-bold">Xawaare & Hufnaan</h3>
               <p className="text-sm opacity-80 mt-1">Soo saar biilal, macluumaad iyo warbixino degdeg ah.</p>
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                 <p className="text-2xl font-bold">+20%</p>
                 <p className="text-xs opacity-70">Hagaajinta nidaamka waxlarka.</p>
               </div>
               <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                 <p className="text-2xl font-bold">+25K</p>
                 <p className="text-xs opacity-70">Wixii macluumaad ah ee la falanqeeyey bishan.</p>
               </div>
             </div>
           </div>
        </div>
      </main>

      {showDemo && <DemoModal close={() => setShowDemo(false)} />}
      {showDev && <DevModal close={() => setShowDev(false)} />}
    </div>
  );
}

function DemoModal({ close }) {
  const [step, setStep] = useState(1);
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl text-slate-900">
        <h2 className="text-xl font-bold mb-4">Pay Bill Now</h2>
        {step === 1 ? (
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm">
              <p><strong>Customer:</strong> Abdisalam Mohamed</p>
              <div className="flex justify-between mt-2">
                <p><strong>Prev:</strong> 120</p>
                <p><strong>Current:</strong> 145</p>
              </div>
              <p className="mt-2 text-green-700 font-bold">Consumed Units: 25</p>
            </div>
            <input type="text" placeholder="Number (e.g. 063...)" className="w-full p-3 border rounded-xl" />
            <button onClick={() => setStep(2)} className="w-full bg-emerald-600 text-white p-3 rounded-xl font-bold hover:bg-emerald-700">Pay Now</button>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="text-emerald-600 text-5xl mb-4">✓</div>
            <h3 className="font-bold text-xl">Lacagta waa la helay!</h3>
          </div>
        )}
        <button onClick={close} className="mt-6 text-slate-400 w-full hover:text-slate-600">Xir</button>
      </div>
    </div>
  );
}

function DevModal({ close }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white p-8 rounded-3xl w-full max-w-sm text-center text-slate-900">
        <div className="w-20 h-20 bg-emerald-100 rounded-full mx-auto mb-4" />
        <h2 className="font-bold text-xl">Abdisalam M. Muhumed</h2>
        <p className="text-slate-500 text-sm mt-1">Software Architect</p>
        <button onClick={close} className="mt-6 text-slate-400">Xir</button>
      </div>
    </div>
  );
}