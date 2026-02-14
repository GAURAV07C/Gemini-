
import React from 'react';

const Documentation: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-400 hover:text-white text-2xl"
        >
          <i className="fas fa-times"></i>
        </button>

        <h2 className="text-3xl font-bold mb-6 text-blue-400 border-b border-white/10 pb-4">
          OmniRTC: Admin Management Protocol
        </h2>

        <div className="space-y-8 text-gray-300 leading-relaxed">
          <section>
            <h3 className="text-xl font-bold text-white mb-2">1. Admin vs Participant Roles</h3>
            <p>
              Is system mein control hierarchy strict hai. Sirf wahi user control le sakta hai jisne room <strong>Host</strong> kiya ho.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="bg-blue-600/5 p-4 rounded-xl border border-blue-500/20">
                <h4 className="text-blue-400 font-bold text-sm mb-2"><i className="fas fa-crown mr-2"></i>Admin (Host)</h4>
                <ul className="text-xs space-y-2">
                  <li>• Can request <strong>Full Access</strong> (Mic+Cam+Screen).</li>
                  <li>• Sees "Remote Action" buttons on hover.</li>
                  <li>• Can manage multiple participants simultaneously.</li>
                </ul>
              </div>
              <div className="bg-slate-800 p-4 rounded-xl border border-white/5">
                <h4 className="text-white font-bold text-sm mb-2"><i className="fas fa-user mr-2"></i>Participant (Joiner)</h4>
                <ul className="text-xs space-y-2 text-gray-500">
                  <li>• NO remote control buttons visible.</li>
                  <li>• Must "Allow Control" once per session.</li>
                  <li>• Cannot manage the Host or other participants.</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xl font-bold text-white mb-2">2. Full Access Toggle (New)</h3>
            <p>
              Admin ke paas ab ek <strong>"Activate Full Access"</strong> button hai. Is par click karne se remote participant ka:
            </p>
            <div className="flex gap-4 mt-2">
              <div className="bg-slate-800 px-3 py-1 rounded-md text-[10px] text-blue-400 font-bold border border-white/5">AUDIO ON</div>
              <div className="bg-slate-800 px-3 py-1 rounded-md text-[10px] text-blue-400 font-bold border border-white/5">VIDEO ON</div>
              <div className="bg-slate-800 px-3 py-1 rounded-md text-[10px] text-blue-400 font-bold border border-white/5">SCREEN SHARE ON</div>
            </div>
            <p className="text-xs mt-3 text-gray-400 italic">
              *Security Note: Screen sharing browser prompt participant ko dikhega, jise unhe manually 'Confirm' karna hoga.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-bold text-white mb-2">3. Trust Layer (Persistent Control)</h3>
            <p>
              "Jab ek bar permission mil gai to kbhi bhi kar skte hai" logic:
            </p>
            <div className="bg-slate-800 p-6 rounded-2xl mt-4 border border-white/5">
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-600 px-2 py-0.5 rounded text-[10px] font-bold mt-1">STEP 1</div>
                  <p className="text-xs">Admin <strong>"Full Access"</strong> button par click karta hai.</p>
                </div>
                <div className="flex items-start gap-4 border-l-2 border-slate-700 ml-4 pl-4">
                  <div className="bg-blue-600 px-2 py-0.5 rounded text-[10px] font-bold mt-1">STEP 2</div>
                  <p className="text-xs">Participant ko clear message milta hai ki Admin Mic, Cam aur Screen teeno access kar raha hai.</p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-blue-600 px-2 py-0.5 rounded text-[10px] font-bold mt-1">STEP 3</div>
                  <p className="text-xs">Allow hone par Admin kisi bhi modality ko independenty toggle kar sakta hai bina kisi future prompt ke.</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 flex justify-center">
          <button 
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-8 rounded-lg transition-all"
          >
            I Understood
          </button>
        </div>
      </div>
    </div>
  );
};

export default Documentation;
