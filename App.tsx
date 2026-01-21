import React, { useState } from 'react';
import ImageUploader from './components/ImageUploader';
import ResultCard from './components/ResultCard';
import { generateRedNoteContent, analyzeImagesForDeepSeek } from './services/geminiService';
import { generateDeepSeekContent } from './services/deepseekService';
import { extractContentFromUrl } from './services/scraperService';
import { UploadedImage, RedNoteOption, GenerationSettings, LoadingState, ModelProvider, AppConfig } from './types';

function App() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [results, setResults] = useState<RedNoteOption[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  // Configuration
  // Default to empty string '' which works perfectly for Vercel (relative paths)
  const [config, setConfig] = useState<AppConfig>({
    serverUrl: '' 
  });

  // Default to Gemini
  const [provider, setProvider] = useState<ModelProvider>('gemini');
  const [deepseekKey, setDeepseekKey] = useState('');

  const [settings, setSettings] = useState<GenerationSettings>({
    mode: 'custom',
    imitateSource: 'text',
    tone: 'authentic',
    audience: 'general',
    referenceContent: '',
    referenceUrl: ''
  });

  const handleGenerate = async () => {
    if (images.length === 0) return;
    
    // Validation
    if (settings.mode === 'imitate') {
      if (settings.imitateSource === 'text' && !settings.referenceContent?.trim()) {
        setErrorMsg("请粘贴需要仿写的参考文案");
        return;
      }
      if (settings.imitateSource === 'link' && !settings.referenceUrl?.trim()) {
        setErrorMsg("请粘贴小红书笔记链接");
        return;
      }
    }

    setLoadingState(LoadingState.ANALYZING);
    setErrorMsg(null);
    setResults([]);

    try {
      // Step 0: Handle Link Extraction (if applicable)
      let finalReferenceContent = settings.referenceContent;
      
      if (settings.mode === 'imitate' && settings.imitateSource === 'link') {
         setLoadingState(LoadingState.EXTRACTING);
         
         // Call the server to get text
         const extractedText = await extractContentFromUrl(settings.referenceUrl!, config.serverUrl);
         finalReferenceContent = extractedText;
         
         if (!extractedText || extractedText.length < 5) {
             throw new Error("提取内容为空，可能是链接无效或被拦截，请尝试直接复制粘贴文案。");
         }

         setSettings(prev => ({ ...prev, referenceContent: extractedText }));
      }

      // Prepare payload with potentially updated content
      const currentSettings = {
        ...settings,
        referenceContent: finalReferenceContent
      };

      const files = images.map(img => img.file);
      let generatedOptions: RedNoteOption[] = [];

      if (provider === 'gemini') {
        setLoadingState(LoadingState.GENERATING);
        generatedOptions = await generateRedNoteContent(files, currentSettings);
      } else {
        // DeepSeek Flow
        setLoadingState(LoadingState.ANALYZING); 
        const imageDescription = await analyzeImagesForDeepSeek(files);
        
        setLoadingState(LoadingState.GENERATING);
        generatedOptions = await generateDeepSeekContent(imageDescription, currentSettings, deepseekKey);
      }
      
      setResults(generatedOptions);
      setLoadingState(LoadingState.COMPLETE);
    } catch (err: any) {
      setLoadingState(LoadingState.ERROR);
      setErrorMsg(err.message || "生成失败，请检查配置");
    }
  };

  const handleReset = () => {
    setImages([]);
    setResults([]);
    setLoadingState(LoadingState.IDLE);
    setErrorMsg(null);
  };

  const hasEnvDeepSeek = !!process.env.DEEPSEEK_API_KEY;

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-gray-800 pb-20 font-sans relative">
      {/* Navbar */}
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[#FF2442] text-2xl">✨</span>
            <h1 className="text-xl font-extrabold tracking-tight text-gray-900">
              RedNote <span className="text-[#FF2442]">AI</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
             <button 
               onClick={() => setShowConfig(!showConfig)}
               className={`p-2 rounded-full transition-colors ${showConfig ? 'bg-gray-100 text-[#FF2442]' : 'text-gray-400 hover:text-gray-600'}`}
               title="服务器配置"
             >
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
             </button>
             <div className="hidden sm:block text-xs font-medium text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
                爆款文案生成器
             </div>
          </div>
        </div>
        
        {/* Config Dropdown */}
        {showConfig && (
          <div className="absolute top-16 right-4 md:right-0 bg-white border border-gray-200 shadow-xl rounded-xl p-4 w-80 z-50 animate-fadeIn">
            <h3 className="text-sm font-bold text-gray-900 mb-2">后端配置</h3>
            <p className="text-xs text-gray-500 mb-3">使用 Vercel 部署时，无需填写地址（留空即可）。</p>
            <label className="block text-xs font-medium text-gray-700 mb-1">后端地址 (Server URL)</label>
            <input 
              type="text" 
              value={config.serverUrl}
              onChange={(e) => setConfig({...config, serverUrl: e.target.value})}
              placeholder="默认留空 (自动使用当前域名)"
              className="w-full text-sm p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF2442] focus:border-transparent outline-none"
            />
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* LEFT COLUMN: Inputs */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:space-y-8">
            
            {/* 1. Image Upload */}
            <section className="bg-white rounded-[24px] p-5 sm:p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-gray-100">
              <h2 className="text-lg font-bold mb-5 flex items-center gap-2 text-gray-900">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#FF2442] text-white text-sm font-bold shadow-sm">1</span>
                上传素材
              </h2>
              <ImageUploader 
                images={images} 
                onImagesChange={setImages} 
                disabled={loadingState !== LoadingState.IDLE && loadingState !== LoadingState.COMPLETE && loadingState !== LoadingState.ERROR}
              />
            </section>

            {/* 2. Settings */}
            <section className="bg-white rounded-[24px] p-5 sm:p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-gray-100">
               <h2 className="text-lg font-bold mb-5 flex items-center gap-2 text-gray-900">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#FF2442] text-white text-sm font-bold shadow-sm">2</span>
                定制风格
              </h2>
              
              <div className="space-y-6">
                
                {/* Model Selector */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    AI 模型
                  </label>
                  <div className="grid grid-cols-2 gap-3 p-1 bg-gray-50 rounded-xl border border-gray-200">
                     <button 
                       onClick={() => setProvider('gemini')}
                       className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                         provider === 'gemini' 
                          ? 'bg-white text-[#FF2442] shadow-sm border border-gray-100' 
                          : 'text-gray-500 hover:text-gray-700'
                       }`}
                     >
                       <span className="text-lg">⚡️</span> Gemini
                     </button>
                     <button 
                       onClick={() => setProvider('deepseek')}
                       className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                         provider === 'deepseek' 
                          ? 'bg-[#133276] text-white shadow-sm' 
                          : 'text-gray-500 hover:text-gray-700'
                       }`}
                     >
                       <span className="text-lg">🐋</span> DeepSeek
                     </button>
                  </div>
                  
                  {provider === 'deepseek' && (
                    <div className="mt-4 animate-fadeIn">
                       {!hasEnvDeepSeek && (
                          <div className="mb-3">
                            <input 
                              type="password"
                              value={deepseekKey}
                              onChange={(e) => setDeepseekKey(e.target.value)}
                              placeholder="请输入 DeepSeek API Key (sk-...)"
                              className="w-full bg-blue-50/50 border border-blue-100 text-blue-900 text-sm rounded-xl py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                          </div>
                       )}
                    </div>
                  )}
                </div>

                <div className="h-px bg-gray-100 my-4"></div>

                {/* Mode Tabs */}
                <div>
                  <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
                    <button
                      onClick={() => setSettings({ ...settings, mode: 'custom' })}
                      className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                        settings.mode === 'custom'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      ✨ 自由定制
                    </button>
                    <button
                      onClick={() => setSettings({ ...settings, mode: 'imitate' })}
                      className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                        settings.mode === 'imitate'
                          ? 'bg-white text-[#FF2442] shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      📝 爆款仿写
                    </button>
                  </div>

                  {settings.mode === 'custom' ? (
                    <div className="space-y-6 animate-fadeIn">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-3">文案语气</label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { id: 'authentic', label: '真实分享' },
                            { id: 'emotional', label: '情绪感' },
                            { id: 'humorous', label: '搞笑吐槽' },
                            { id: 'informative', label: '干货科普' },
                            { id: 'news', label: '劲爆消息' }
                          ].map((t) => (
                            <button
                              key={t.id}
                              onClick={() => setSettings({ ...settings, tone: t.id as any })}
                              className={`text-sm py-2 px-3 sm:px-4 rounded-full border transition-all duration-200 ${
                                settings.tone === t.id 
                                  ? 'bg-[#FF2442] border-[#FF2442] text-white font-medium shadow-md shadow-red-200' 
                                  : 'border-gray-200 text-gray-600 hover:bg-gray-50 bg-white'
                              }`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-3">目标人群</label>
                        <div className="relative">
                          <select 
                              value={settings.audience}
                              onChange={(e) => setSettings({...settings, audience: e.target.value as any})}
                              className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-700 rounded-xl py-3 px-4 pr-8 focus:outline-none focus:ring-2 focus:ring-[#FF2442]/20 focus:border-[#FF2442] transition-colors"
                          >
                              <option value="general">大众 (General)</option>
                              <option value="students">学生党 (Students)</option>
                              <option value="office_workers">打工人 (Office Workers)</option>
                              <option value="parents">宝妈/奶爸 (Parents)</option>
                              <option value="couples">情侣 (Couples)</option>
                              <option value="photographers">摄影师 (Photographers)</option>
                              <option value="young_women">年轻女性 (Young Women)</option>
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="animate-fadeIn">
                       {/* Imitate Source Toggle */}
                       <div className="flex gap-4 mb-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                             <input 
                               type="radio" 
                               name="imitateSource" 
                               checked={settings.imitateSource === 'text'}
                               onChange={() => setSettings({...settings, imitateSource: 'text'})}
                               className="text-[#FF2442] focus:ring-[#FF2442]" 
                             />
                             <span className="text-sm font-medium text-gray-700">粘贴文本</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                             <input 
                               type="radio" 
                               name="imitateSource" 
                               checked={settings.imitateSource === 'link'}
                               onChange={() => setSettings({...settings, imitateSource: 'link'})}
                               className="text-[#FF2442] focus:ring-[#FF2442]" 
                             />
                             <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                               粘贴链接 
                               <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded">需服务器</span>
                             </span>
                          </label>
                       </div>

                       {settings.imitateSource === 'text' ? (
                         <>
                            <textarea
                              value={settings.referenceContent}
                              onChange={(e) => setSettings({...settings, referenceContent: e.target.value})}
                              placeholder="请粘贴你想要仿写的爆款文案内容..."
                              className="w-full h-40 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF2442]/20 focus:border-[#FF2442] transition-all resize-none text-sm leading-relaxed custom-scrollbar"
                            />
                            <p className="text-xs text-gray-400 mt-2">
                              * AI 会分析参考文案的断句、语气、Emoji 密度，并应用到您的图片上。
                            </p>
                         </>
                       ) : (
                         <div className="space-y-3">
                            <input
                              type="text"
                              value={settings.referenceUrl}
                              onChange={(e) => setSettings({...settings, referenceUrl: e.target.value})}
                              placeholder="请粘贴小红书笔记链接 (例如: http://xhslink.com/...)"
                              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF2442]/20 focus:border-[#FF2442] transition-all text-sm"
                            />
                            <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg border border-blue-100 leading-relaxed">
                                <strong>💡 如何使用:</strong>
                                <ul className="list-disc list-inside mt-1 space-y-1">
                                    <li>系统会自动识别是否在 Vercel 环境。</li>
                                    <li>如果部署在 Vercel，无需配置后端地址。</li>
                                    <li>支持解析小红书分享链接。</li>
                                </ul>
                            </div>
                         </div>
                       )}
                    </div>
                  )}
                </div>

              </div>
            </section>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
                <button
                onClick={handleGenerate}
                disabled={images.length === 0 || (loadingState !== LoadingState.IDLE && loadingState !== LoadingState.COMPLETE && loadingState !== LoadingState.ERROR)}
                className={`w-full py-4 rounded-[20px] font-bold text-lg shadow-xl transition-all transform duration-200
                    ${images.length === 0 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                    : loadingState !== LoadingState.IDLE && loadingState !== LoadingState.COMPLETE && loadingState !== LoadingState.ERROR
                        ? 'bg-[#FF2442]/80 text-white cursor-wait translate-y-0'
                        : provider === 'deepseek'
                           ? 'bg-[#133276] text-white hover:bg-[#1a45a0] hover:-translate-y-1 shadow-blue-900/20'
                           : 'bg-[#FF2442] text-white hover:bg-[#ff4d67] hover:-translate-y-1 shadow-[#FF2442]/30'
                    }
                `}
                >
                <span className="flex items-center justify-center gap-2">
                    {loadingState === LoadingState.IDLE && (
                      settings.mode === 'imitate' ? <>📝 开始仿写文案</> :
                      provider === 'deepseek' ? <>🐋 DeepSeek 生成</> : <>✨ 一键生成爆款文案</>
                    )}
                    {loadingState === LoadingState.EXTRACTING && <>🔗 正在提取链接内容...</>}
                    {loadingState === LoadingState.ANALYZING && <>👀 正在识别图片 (Gemini)...</>}
                    {loadingState === LoadingState.GENERATING && (
                      provider === 'deepseek' ? <>✍️ DeepSeek 正在创作...</> : <>✍️ 正在撰写文案...</>
                    )}
                    {loadingState === LoadingState.COMPLETE && <>🔄 不满意？重新生成</>}
                    {loadingState === LoadingState.ERROR && <>❌ 重试</>}
                </span>
                </button>
                
                {loadingState === LoadingState.COMPLETE && (
                <button 
                    onClick={handleReset}
                    className="w-full py-3 rounded-[20px] text-gray-500 text-sm font-medium hover:bg-gray-100 transition-colors flex items-center justify-center gap-1"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
                    清空重置
                </button>
                )}

                {errorMsg && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100 flex items-center gap-2 animate-fadeIn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    {errorMsg}
                </div>
                )}
            </div>
          </div>

          {/* RIGHT COLUMN: Results */}
          <div className="lg:col-span-7 xl:col-span-8">
            
            {/* Empty State */}
            {loadingState === LoadingState.IDLE && results.length === 0 && (
              <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-gray-400 bg-white rounded-[32px] border-2 border-dashed border-gray-200 p-8 mx-auto w-full">
                <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-8 shadow-sm ${
                   provider === 'deepseek' ? 'bg-blue-50' : 'bg-gradient-to-br from-red-50 to-pink-50'
                }`}>
                  <span className="text-5xl drop-shadow-sm">{provider === 'deepseek' ? '🐋' : '📸'}</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3 text-center">
                  {provider === 'deepseek' ? 'DeepSeek 准备就绪' : '等待生成...'}
                </h3>
                <p className="max-w-md text-center text-gray-500 leading-relaxed mb-8">
                  {settings.mode === 'imitate' 
                    ? '粘贴爆款文案，AI 将为您完美复刻其风格'
                    : provider === 'deepseek' 
                      ? 'DeepSeek 将根据图片描述，为您创作更有深度的文案' 
                      : 'AI 将为您生成 3 种不同风格的小红书爆款笔记'
                  }
                </p>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm font-medium text-gray-500 w-full max-w-xl">
                    <div className="flex items-center justify-center gap-2 bg-gray-50 py-3 px-4 rounded-xl">
                        <span className="text-green-500">✓</span> 自动配Emoji
                    </div>
                    <div className="flex items-center justify-center gap-2 bg-gray-50 py-3 px-4 rounded-xl">
                        <span className="text-green-500">✓</span> 规避违禁词
                    </div>
                    <div className="flex items-center justify-center gap-2 bg-gray-50 py-3 px-4 rounded-xl">
                        <span className="text-green-500">✓</span> 流量词推荐
                    </div>
                 </div>
              </div>
            )}

            {/* Loading Skeleton */}
            {(loadingState === LoadingState.ANALYZING || loadingState === LoadingState.GENERATING || loadingState === LoadingState.EXTRACTING) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                 {[1, 2, 3].map(i => (
                   <div key={i} className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 h-[480px] animate-pulse flex flex-col">
                     <div className="flex justify-between mb-6">
                         <div className="h-6 bg-gray-100 rounded-full w-20"></div>
                         <div className="h-6 bg-gray-100 rounded-full w-12"></div>
                     </div>
                     <div className="h-8 bg-gray-100 rounded-lg w-3/4 mb-6"></div>
                     <div className="space-y-4 flex-grow">
                       <div className="h-3 bg-gray-50 rounded w-full"></div>
                       <div className="h-3 bg-gray-50 rounded w-full"></div>
                       <div className="h-3 bg-gray-50 rounded w-5/6"></div>
                       <div className="h-3 bg-gray-50 rounded w-full"></div>
                       <div className="h-3 bg-gray-50 rounded w-4/5"></div>
                     </div>
                     <div className="mt-6 flex gap-2">
                        <div className="h-6 bg-gray-100 rounded w-16"></div>
                        <div className="h-6 bg-gray-100 rounded w-16"></div>
                     </div>
                   </div>
                 ))}
              </div>
            )}

            {/* Results Grid */}
            {results.length > 0 && (
              <div className="space-y-6">
                 <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#FF2442] text-white text-sm font-bold shadow-sm">3</span>
                        <h2 className="text-xl font-bold text-gray-900">
                          {provider === 'deepseek' ? 'DeepSeek 生成结果' : 'Gemini 生成结果'}
                        </h2>
                    </div>
                    <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                      provider === 'deepseek' ? 'text-blue-600 bg-blue-50' : 'text-[#FF2442] bg-red-50'
                    }`}>
                        {provider === 'deepseek' ? 'DeepSeek V3' : 'Gemini Flash'}
                    </span>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                  {results.map((option, index) => (
                    <ResultCard key={option.id} option={option} index={index} />
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}

export default App;