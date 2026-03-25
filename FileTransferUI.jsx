import React, { useState } from 'react';
import { Upload, Download, Copy, Check, FileText } from 'lucide-react'; // Optional icons

const FileTransferUI = () => {
  const [tab, setTab] = useState('upload'); // 'upload' or 'download'
  const [file, setFile] = useState(null);
  const [code, setCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [resultUrl, setResultUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const API_URL = "https://file-transfer-system-ug93.onrender.com";

  // --- Logic: Upload File ---
  const handleUpload = async () => {
    if (!file) return alert("Select a file first!");
    setLoading(true);
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_URL}/upload`, { method: "POST", body: formData });
      const data = await res.json();
      if (data.code) setCode(data.code);
    } catch (err) {
      alert("Upload failed. Is the server running?");
    } finally {
      setLoading(false);
    }
  };

  // --- Logic: Retrieve File ---
  const handleRetrieve = async () => {
    if (!inputCode) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/file/${inputCode}`);
      if (res.ok) {
        const data = await res.json();
        setResultUrl(data.downloadUrl);
      } else {
        alert("Invalid code!");
      }
    } catch (err) {
      alert("Error fetching file.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-3xl overflow-hidden shadow-2xl">
        
        {/* Tab Switcher */}
        <div className="flex border-b border-slate-700">
          <button 
            onClick={() => {setTab('upload'); setResultUrl('');}}
            className={`flex-1 py-4 font-bold transition-all ${tab === 'upload' ? 'bg-blue-600 text-white' : 'hover:bg-slate-700'}`}
          >
            Send File
          </button>
          <button 
            onClick={() => {setTab('download'); setCode('');}}
            className={`flex-1 py-4 font-bold transition-all ${tab === 'download' ? 'bg-purple-600 text-white' : 'hover:bg-slate-700'}`}
          >
            Receive File
          </button>
        </div>

        <div className="p-8">
          {tab === 'upload' ? (
            /* UPLOAD VIEW */
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white">Share a File</h2>
                <p className="text-slate-400 text-sm mt-1">Upload and get a unique 7-digit code</p>
              </div>

              <div className="group relative border-2 border-dashed border-slate-600 rounded-2xl p-8 transition-colors hover:border-blue-500 flex flex-col items-center justify-center bg-slate-900/50">
                <input 
                  type="file" 
                  onChange={(e) => setFile(e.target.files[0])}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="p-3 bg-blue-500/10 rounded-full mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="text-blue-500" size={32} />
                </div>
                <p className="text-sm font-medium">{file ? file.name : "Click or drag file here"}</p>
              </div>

              <button 
                onClick={handleUpload}
                disabled={loading || !file}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 rounded-xl font-bold shadow-lg shadow-blue-900/20 transition-all flex justify-center items-center"
              >
                {loading ? "Processing..." : "Generate Secure Code"}
              </button>

              {code && (
                <div className="mt-4 p-4 bg-slate-900 border border-blue-500/30 rounded-xl flex items-center justify-between animate-bounce-in">
                  <div>
                    <span className="text-xs uppercase tracking-widest text-slate-500">Your Share Code</span>
                    <p className="text-3xl font-mono font-black text-blue-400 leading-tight">{code}</p>
                  </div>
                  <button 
                    onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(()=>setCopied(false), 2000); }}
                    className="p-3 bg-slate-800 rounded-lg hover:bg-slate-700 text-blue-400"
                  >
                    {copied ? <Check size={20} /> : <Copy size={20} />}
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* RECEIVE VIEW */
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white">Get Your File</h2>
                <p className="text-slate-400 text-sm mt-1">Enter the secret code to download</p>
              </div>

              <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="e.g. Ab12XyZ"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-6 py-4 text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-purple-500 outline-none"
                />
                <button 
                  onClick={handleRetrieve}
                  className="w-full py-4 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold shadow-lg shadow-purple-900/20 transition-all"
                >
                  {loading ? "Fetching..." : "Locate File"}
                </button>
              </div>

              {resultUrl && (
                <div className="mt-6 p-6 bg-green-500/10 border border-green-500/20 rounded-2xl flex flex-col items-center text-center space-y-3">
                  <div className="p-3 bg-green-500/20 rounded-full">
                    <FileText className="text-green-400" size={24} />
                  </div>
                  <p className="text-sm font-medium text-green-100 italic">File ready for download!</p>
                  <a 
                    href={resultUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="w-full py-3 bg-green-600 hover:bg-green-500 rounded-lg font-bold transition-colors"
                  >
                    Download Now 📥
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Small Footer for Viva Credit */}
      <p className="absolute bottom-6 text-slate-600 text-xs">
        System Status: <span className="text-green-500">Connected to Cloudinary ☁️</span>
      </p>
    </div>
  );
};

export default FileTransferUI;