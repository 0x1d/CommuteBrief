
import React, { useState } from 'react';
import { Article, BriefLength, BriefVoice } from './types';
import { summarizeArticles, textToSpeech, extractArticleFromUrl } from './services/geminiService';
import { ArticleList } from './components/ArticleList';
import { AudioPlayer } from './components/AudioPlayer';

const App: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [audioBrief, setAudioBrief] = useState<{ text: string; data: Uint8Array } | null>(null);
  
  // Settings
  const [selectedLength, setSelectedLength] = useState<BriefLength>(BriefLength.Medium);
  const [selectedVoice, setSelectedVoice] = useState<BriefVoice>(BriefVoice.Kore);

  const handleFetchArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = urlInput.trim();
    if (!url) return;

    setIsFetching(true);
    setStatusMessage('Searching for article and bypassing restrictions...');
    try {
      const { title, content, sources } = await extractArticleFromUrl(url);
      
      const newArticle: Article = {
        id: crypto.randomUUID(),
        title,
        content,
        url,
        sources,
      };

      setArticles(prev => [...prev, newArticle]);
      setUrlInput('');
      setStatusMessage('');
    } catch (error: any) {
      console.error(error);
      setStatusMessage(error.message || 'Failed to fetch article content.');
    } finally {
      setIsFetching(false);
    }
  };

  const removeArticle = (id: string) => {
    setArticles(articles.filter(a => a.id !== id));
  };

  const generateBrief = async () => {
    if (articles.length === 0) return;
    
    setIsGenerating(true);
    setAudioBrief(null);
    try {
      setStatusMessage('Synthesizing your commute script...');
      const summaryText = await summarizeArticles(
        articles.map(a => `${a.title}: ${a.content}`),
        selectedLength
      );
      
      setStatusMessage('Creating personalized voice audio...');
      const audioData = await textToSpeech(summaryText, selectedVoice);
      
      setAudioBrief({
        text: summaryText,
        data: audioData
      });
      setStatusMessage('');
    } catch (error) {
      console.error(error);
      setStatusMessage('Error occurred during briefing generation.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-indigo-600 text-white p-2 rounded-lg">
              <i className="fa-solid fa-microphone-lines"></i>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Commute Brief</h1>
          </div>
          <div className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded">
            Powered by Gemini
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Article Input & Settings */}
        <div className="lg:col-span-2 space-y-8">
          
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center">
                <i className="fa-solid fa-link text-indigo-600 mr-2"></i>
                Import News Article
              </h2>
              <p className="text-sm text-slate-600 font-medium mt-1">Paste a public news URL. Gemini will attempt to extract the full text.</p>
            </div>
            <form onSubmit={handleFetchArticle} className="flex flex-col sm:flex-row gap-3">
              <input
                type="url"
                placeholder="https://www.bbc.com/news/world-..."
                className="flex-1 px-4 py-3 bg-white border-2 border-slate-200 text-slate-900 font-medium rounded-xl focus:border-indigo-600 focus:outline-none transition-all placeholder:text-slate-400"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                disabled={isFetching}
                required
              />
              <button 
                type="submit"
                disabled={isFetching}
                className={`px-6 py-3 font-bold rounded-xl flex items-center justify-center space-x-2 transition-all ${
                  isFetching 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-lg shadow-indigo-100'
                }`}
              >
                {isFetching ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-plus"></i>
                    <span>Add URL</span>
                  </>
                )}
              </button>
            </form>
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Your Articles</h2>
              <span className="bg-slate-200 text-slate-800 text-xs px-2.5 py-1 rounded-full font-bold">
                {articles.length} total
              </span>
            </div>
            <ArticleList articles={articles} onRemove={removeArticle} />
          </section>
        </div>

        {/* Right Column: Brief Control & Playback */}
        <div className="space-y-6">
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Briefing Settings</h2>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Duration</label>
                <div className="grid grid-cols-3 gap-2">
                  {[BriefLength.Short, BriefLength.Medium, BriefLength.Long].map(l => (
                    <button
                      key={l}
                      onClick={() => setSelectedLength(l)}
                      className={`py-2 text-xs font-black rounded-lg border-2 transition-all ${
                        selectedLength === l 
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                        : 'border-slate-100 text-slate-500 hover:border-slate-200'
                      }`}
                    >
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Voice Tone</label>
                <select 
                  className="w-full px-4 py-3 bg-white border-2 border-slate-200 text-slate-900 font-bold rounded-xl focus:border-indigo-600 focus:outline-none appearance-none"
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value as BriefVoice)}
                >
                  <option value={BriefVoice.Kore}>Kore (Deep & Authoritative)</option>
                  <option value={BriefVoice.Puck}>Puck (Warm & Friendly)</option>
                  <option value={BriefVoice.Charon}>Charon (Soft & Calm)</option>
                  <option value={BriefVoice.Fenrir}>Fenrir (Bold & Energetic)</option>
                  <option value={BriefVoice.Zephyr}>Zephyr (Smart & Professional)</option>
                </select>
              </div>

              <button
                onClick={generateBrief}
                disabled={articles.length === 0 || isGenerating}
                className={`w-full py-4 rounded-xl font-black text-white shadow-lg transition-all ${
                  articles.length === 0 || isGenerating
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                {isGenerating ? (
                  <div className="flex items-center justify-center space-x-2">
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <span>Preparing Brief...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <i className="fa-solid fa-bolt"></i>
                    <span>Generate Audio Brief</span>
                  </div>
                )}
              </button>
            </div>
          </section>

          {statusMessage && !audioBrief && (
            <div className={`p-4 rounded-xl text-sm font-bold flex items-start space-x-3 transition-colors border-2 ${
              statusMessage.toLowerCase().includes('failed') || statusMessage.toLowerCase().includes('error') || statusMessage.toLowerCase().includes('unable') || statusMessage.toLowerCase().includes('restriction')
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-indigo-50 border-indigo-200 text-indigo-800'
            }`}>
              <i className={`fa-solid ${
                statusMessage.toLowerCase().includes('failed') || statusMessage.toLowerCase().includes('error') || statusMessage.toLowerCase().includes('unable') || statusMessage.toLowerCase().includes('restriction')
                ? 'fa-circle-exclamation'
                : 'fa-circle-info'
              } mt-0.5`}></i>
              <p className="leading-tight">{statusMessage}</p>
            </div>
          )}

          {audioBrief && (
            <div className="sticky top-20">
              <AudioPlayer audioData={audioBrief.data} text={audioBrief.text} />
              <div className="mt-4 p-4 bg-emerald-50 rounded-xl border-2 border-emerald-200 flex items-center space-x-2 text-emerald-900 text-sm font-bold">
                <i className="fa-solid fa-check-circle"></i>
                <span>Brief ready for your commute!</span>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer Info */}
      <footer className="max-w-5xl mx-auto px-4 mt-20 text-center text-slate-500 text-sm pb-10 border-t border-slate-200 pt-8">
        <p className="font-medium">Commute Brief uses Gemini 3 Flash for extraction and Gemini 2.5 Flash for high-quality TTS.</p>
        <p className="mt-2 text-[10px] uppercase tracking-widest font-black text-slate-400">Source Grounding Enabled</p>
      </footer>
    </div>
  );
};

export default App;
