/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, X, Play, Clock, Sparkles, ChevronDown } from 'lucide-react';
import { appsData } from './data';
import Phase1AppScreen from './phase1/Phase1AppScreen';
import { Category, SkillApp, CATEGORY_COLORS, DIFFICULTY_CONFIG } from './types';

const CATEGORIES: Category[] = [
  'クラウド', 'DevOps', 'バックエンド', 'セキュリティ', 
  'ネットワーク', 'CS基礎', 'インフラ', 'データベース'
];

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [sortBy, setSortBy] = useState<'recommended' | 'difficultyAsc' | 'difficultyDesc'>('recommended');
  const [selectedApp, setSelectedApp] = useState<SkillApp | null>(null);
  const [activeAppId, setActiveAppId] = useState<string | null>(null);

  const filteredApps = useMemo(() => {
    let result = appsData;

    // Filter by category
    if (selectedCategory !== 'All') {
      result = result.filter(app => app.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(app => 
        app.title.toLowerCase().includes(query) ||
        app.description.toLowerCase().includes(query) ||
        app.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === 'difficultyAsc') return a.difficulty - b.difficulty;
      if (sortBy === 'difficultyDesc') return b.difficulty - a.difficulty;
      
      // recommended: available first, then designing, then planning
      const statusWeight = { available: 0, designing: 1, planning: 2 };
      return statusWeight[a.status] - statusWeight[b.status];
    });

    return result;
  }, [searchQuery, selectedCategory, sortBy]);

  return (
    <div className="min-h-screen relative overflow-hidden font-sans">
      {/* Floating Background Elements */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-40">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-4xl"
            initial={{ 
              x: Math.random() * window.innerWidth, 
              y: Math.random() * window.innerHeight 
            }}
            animate={{ 
              y: [null, Math.random() * -100 - 50],
              x: [null, Math.random() * 50 - 25]
            }}
            transition={{ 
              duration: Math.random() * 10 + 10, 
              repeat: Infinity, 
              repeatType: "reverse",
              ease: "easeInOut"
            }}
          >
            {['☁️', '🚀', '💻', '🎮', '🧩', '✨'][Math.floor(Math.random() * 6)]}
          </motion.div>
        ))}
      </div>

      {activeAppId ? (
        <Phase1AppScreen appId={activeAppId} onExit={() => setActiveAppId(null)} />
      ) : (
        <>
          {/* Header */}
          <header className="relative z-10 bg-white/80 backdrop-blur-md border-b border-white/20 sticky top-0 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-orange-400 rounded-xl flex items-center justify-center text-white shadow-md">
                  <Sparkles size={20} />
                </div>
                <h1 className="text-2xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500 hidden sm:block">
                  Engineer Skill Lab
                </h1>
              </div>
              
              <div className="flex-1 max-w-md mx-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="アプリやスキルを検索..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-full bg-white/50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white transition-all shadow-inner"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-400 to-emerald-400 border-2 border-white shadow-sm"></div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            
            {/* Hero Section */}
            <div className="text-center mb-12 mt-4">
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl md:text-5xl font-display font-bold text-gray-800 mb-4"
              >
                エンジニアスキルを<br className="sm:hidden" />ゲームで楽しく鍛えよう！
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-gray-600 max-w-2xl mx-auto text-lg"
              >
                実践的なエンジニアリングスキルをパズル・シミュレーション・RPGで習得するポータルサイト
              </motion.p>
            </div>

            {/* Filters & Sort */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-white/60 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-white/50">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto hide-scrollbar">
                <Filter size={18} className="text-gray-500 shrink-0 mr-2" />
                <button
                  onClick={() => setSelectedCategory('All')}
                  className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    selectedCategory === 'All' 
                      ? 'bg-gray-800 text-white shadow-md' 
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  すべて
                </button>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                      selectedCategory === cat 
                        ? 'text-white shadow-md' 
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                    style={selectedCategory === cat ? { backgroundColor: CATEGORY_COLORS[cat] } : {}}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedCategory === cat ? 'white' : CATEGORY_COLORS[cat] }}></span>
                    {cat}
                  </button>
                ))}
              </div>

              <div className="relative shrink-0">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="appearance-none bg-white border border-gray-200 text-gray-700 py-1.5 pl-4 pr-10 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 shadow-sm cursor-pointer"
                >
                  <option value="recommended">おすすめ順</option>
                  <option value="difficultyAsc">難易度：やさしい順</option>
                  <option value="difficultyDesc">難易度：むずかしい順</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
            </div>

            {/* App Grid */}
            {filteredApps.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {filteredApps.map((app, index) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      key={app.id}
                      onClick={() => setSelectedApp(app)}
                      className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border border-gray-100 group flex flex-col h-full"
                    >
                      {/* Top Color Bar */}
                      <div className="h-2 w-full" style={{ backgroundColor: CATEGORY_COLORS[app.category] }}></div>
                      
                      <div className="p-6 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                          <div className="text-4xl bg-gray-50 w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-300">
                            {app.icon}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {app.status === 'available' ? (
                              <span className="px-3 py-1 bg-gradient-to-r from-pink-500 to-orange-400 text-white text-xs font-bold rounded-full shadow-sm animate-pulse">
                                PLAY NOW
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs font-medium rounded-full flex items-center gap-1">
                                <Clock size={12} />
                                Coming Soon
                              </span>
                            )}
                            <span 
                              className="px-2 py-1 rounded text-xs font-bold"
                              style={{ 
                                backgroundColor: DIFFICULTY_CONFIG[app.difficulty].bg,
                                color: DIFFICULTY_CONFIG[app.difficulty].color
                              }}
                            >
                              {DIFFICULTY_CONFIG[app.difficulty].label}
                            </span>
                          </div>
                        </div>

                        <h3 className="text-xl font-display font-bold text-gray-800 mb-2 line-clamp-2">
                          {app.title}
                        </h3>
                        <p className="text-gray-600 text-sm mb-4 flex-1 line-clamp-3">
                          {app.description}
                        </p>

                        <div className="flex flex-wrap gap-2 mt-auto">
                          {app.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="px-2 py-1 bg-gray-50 border border-gray-100 text-gray-500 text-xs rounded-md">
                              #{tag}
                            </span>
                          ))}
                          {app.tags.length > 3 && (
                            <span className="px-2 py-1 bg-gray-50 border border-gray-100 text-gray-500 text-xs rounded-md">
                              +{app.tags.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-bold text-gray-700 mb-2">見つかりませんでした</h3>
                <p className="text-gray-500">検索条件を変更して再度お試しください。</p>
              </div>
            )}

          </main>

          {/* App Detail Modal */}
          <AnimatePresence>
            {selectedApp && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedApp(null)}
                  className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[90vh]"
                >
                  <div className="h-3 w-full" style={{ backgroundColor: CATEGORY_COLORS[selectedApp.category] }}></div>
                  
                  <button 
                    onClick={() => setSelectedApp(null)}
                    className="absolute top-6 right-6 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors z-10"
                  >
                    <X size={20} />
                  </button>

                  <div className="p-8 overflow-y-auto">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="text-6xl bg-gray-50 w-24 h-24 rounded-3xl flex items-center justify-center shadow-inner">
                        {selectedApp.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span 
                            className="px-3 py-1 text-xs font-bold rounded-full text-white"
                            style={{ backgroundColor: CATEGORY_COLORS[selectedApp.category] }}
                          >
                            {selectedApp.category}
                          </span>
                          <span 
                            className="px-3 py-1 rounded-full text-xs font-bold"
                            style={{ 
                              backgroundColor: DIFFICULTY_CONFIG[selectedApp.difficulty].bg,
                              color: DIFFICULTY_CONFIG[selectedApp.difficulty].color
                            }}
                          >
                            {DIFFICULTY_CONFIG[selectedApp.difficulty].label}
                          </span>
                          {selectedApp.status !== 'available' && (
                            <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs font-medium rounded-full flex items-center gap-1">
                              <Clock size={12} />
                              Coming Soon
                            </span>
                          )}
                        </div>
                        <h2 className="text-2xl md:text-3xl font-display font-bold text-gray-800">
                          {selectedApp.title}
                        </h2>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-6 mb-6">
                      <h4 className="font-bold text-gray-700 mb-2">ミッション概要</h4>
                      <p className="text-gray-600 leading-relaxed">
                        {selectedApp.description}
                      </p>
                    </div>

                    <div className="mb-8">
                      <h4 className="font-bold text-gray-700 mb-3">習得できるスキル・タグ</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedApp.tags.map(tag => (
                          <span key={tag} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 text-sm rounded-lg shadow-sm">
                            # {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-center pt-4 border-t border-gray-100">
                      {selectedApp.status === 'available' ? (
                        <button
                          onClick={() => {
                            setActiveAppId(selectedApp.id);
                            setSelectedApp(null);
                          }}
                          className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-pink-500 to-orange-400 hover:from-pink-600 hover:to-orange-500 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2 text-lg"
                        >
                          <Play fill="currentColor" size={20} />
                          ゲームをプレイする
                        </button>
                      ) : (
                        <div className="w-full sm:w-auto px-8 py-4 bg-gray-100 text-gray-500 font-bold rounded-2xl flex items-center justify-center gap-2 text-lg border-2 border-dashed border-gray-300">
                          <Clock size={20} />
                          Coming Soon（リリースをお待ちください）
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
