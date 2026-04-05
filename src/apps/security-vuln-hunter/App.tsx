/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  useEffect,
  useState,
  type CSSProperties,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { CHALLENGES } from './challenges';
import { categoryColors, floatingEmojis, getRank } from './meta';
import type { VulnChallenge } from './types';

type Screen = 'title' | 'game' | 'results';

type Particle = {
  id: number;
  x: number;
  y: number;
  emoji: string;
  delay: number;
  tx: string;
  ty: string;
};

export default function SecurityVulnHunterApp() {
  const [screen, setScreen] = useState<Screen>('title');
  const [currentChallenge, setCurrentChallenge] = useState(0);
  const [selectedLines, setSelectedLines] = useState<number[]>([]);
  const [hintIndex, setHintIndex] = useState(-1);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showFixedCode, setShowFixedCode] = useState(false);
  const [scores, setScores] = useState<number[]>([]);
  const [animateIn, setAnimateIn] = useState(false);
  const [shakeWrong, setShakeWrong] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    setAnimateIn(true);
  }, [screen, currentChallenge]);

  const challenge = CHALLENGES[currentChallenge];

  const toggleLine = (lineNum: number) => {
    if (showExplanation) return;
    setSelectedLines((prev) =>
      prev.includes(lineNum) ? prev.filter((l) => l !== lineNum) : [...prev, lineNum]
    );
  };

  const spawnParticles = (success: boolean) => {
    const newParticles: Particle[] = Array.from({ length: success ? 20 : 8 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      emoji: success
        ? ['✨', '🎉', '⭐', '🔒', '🛡️'][Math.floor(Math.random() * 5)]
        : ['💥', '❌'][Math.floor(Math.random() * 2)],
      delay: Math.random() * 0.5,
      tx: `${(Math.random() - 0.5) * 200}px`,
      ty: `${-100 - Math.random() * 150}px`,
    }));
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 2000);
  };

  const submitAnswer = () => {
    const correct = challenge.vulnerableLines;
    const selected = selectedLines;

    const hits = selected.filter((l) => correct.includes(l)).length;
    const misses = selected.filter((l) => !correct.includes(l)).length;
    const missed = correct.filter((l) => !selected.includes(l)).length;

    const hintPenalty = Math.max(0, hintIndex + 1) * 5;
    let score = Math.max(
      0,
      Math.round((hits / correct.length) * 100 - misses * 15 - missed * 10 - hintPenalty)
    );
    if (hits === 0) score = 0;

    const success = score >= 50;
    spawnParticles(success);
    if (!success) {
      setShakeWrong(true);
      setTimeout(() => setShakeWrong(false), 600);
    }

    setScores((prev) => [...prev, score]);
    setShowExplanation(true);
  };

  const nextChallenge = () => {
    setAnimateIn(false);
    setTimeout(() => {
      if (currentChallenge < CHALLENGES.length - 1) {
        setCurrentChallenge((c) => c + 1);
        setSelectedLines([]);
        setHintIndex(-1);
        setShowExplanation(false);
        setShowFixedCode(false);
      } else {
        setScreen('results');
      }
      setAnimateIn(true);
    }, 300);
  };

  const totalScore =
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  const restart = () => {
    setScreen('title');
    setCurrentChallenge(0);
    setSelectedLines([]);
    setHintIndex(-1);
    setShowExplanation(false);
    setShowFixedCode(false);
    setScores([]);
  };

  const styles: Record<string, CSSProperties> = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 30%, #0a1628 60%, #0a0a1a 100%)',
      fontFamily: "'M PLUS Rounded 1c', 'Nunito', sans-serif",
      color: '#e0e6ed',
      position: 'relative',
      overflow: 'hidden',
    },
    gridBg: {
      position: 'fixed',
      inset: 0,
      backgroundImage: `
        linear-gradient(rgba(0, 255, 136, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 255, 136, 0.03) 1px, transparent 1px)
      `,
      backgroundSize: '40px 40px',
      pointerEvents: 'none',
      zIndex: 0,
    },
    scanline: {
      position: 'fixed',
      inset: 0,
      background:
        'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.05) 2px, rgba(0,0,0,0.05) 4px)',
      pointerEvents: 'none',
      zIndex: 0,
    },
    inner: {
      position: 'relative',
      zIndex: 1,
      maxWidth: 900,
      margin: '0 auto',
      padding: '24px 16px',
    },
  };

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.15; }
          50% { transform: translateY(-30px) rotate(10deg); opacity: 0.3; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes glitch {
          0%, 100% { transform: translate(0); }
          20% { transform: translate(-2px, 2px); }
          40% { transform: translate(2px, -2px); }
          60% { transform: translate(-1px, -1px); }
          80% { transform: translate(1px, 1px); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(0, 255, 136, 0.1); }
          50% { box-shadow: 0 0 40px rgba(0, 255, 136, 0.25); }
        }
        @keyframes particle-fly {
          0% { opacity: 1; transform: translate(0, 0) scale(1); }
          100% { opacity: 0; transform: translate(var(--tx), var(--ty)) scale(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        @keyframes rank-reveal {
          0% { transform: scale(0) rotate(-180deg); opacity: 0; }
          60% { transform: scale(1.3) rotate(10deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes typing {
          from { width: 0; }
          to { width: 100%; }
        }
        .code-line { 
          cursor: pointer; 
          transition: all 0.2s; 
          border-left: 3px solid transparent;
          padding: 2px 8px 2px 12px;
          margin: 0 -8px;
          border-radius: 4px;
        }
        .code-line:hover { 
          background: rgba(0, 255, 136, 0.08);
          border-left-color: rgba(0, 255, 136, 0.3);
        }
        .code-line.selected { 
          background: rgba(255, 59, 48, 0.15);
          border-left-color: #ff3b30;
          box-shadow: inset 0 0 20px rgba(255, 59, 48, 0.05);
        }
        .code-line.correct {
          background: rgba(0, 255, 136, 0.12);
          border-left-color: #00ff88;
        }
        .code-line.missed {
          background: rgba(255, 193, 7, 0.12);
          border-left-color: #ffc107;
        }
        .btn-cyber {
          position: relative;
          padding: 12px 32px;
          border: 1px solid rgba(0, 255, 136, 0.4);
          background: rgba(0, 255, 136, 0.08);
          color: #00ff88;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          font-family: inherit;
          font-size: 15px;
          letter-spacing: 0.5px;
        }
        .btn-cyber:hover {
          background: rgba(0, 255, 136, 0.18);
          box-shadow: 0 0 25px rgba(0, 255, 136, 0.2);
          transform: translateY(-2px);
        }
        .btn-cyber:active { transform: translateY(0); }
        .btn-danger {
          border-color: rgba(255, 59, 48, 0.4);
          background: rgba(255, 59, 48, 0.08);
          color: #ff6b6b;
        }
        .btn-danger:hover {
          background: rgba(255, 59, 48, 0.18);
          box-shadow: 0 0 25px rgba(255, 59, 48, 0.2);
        }
        .btn-secondary {
          border-color: rgba(255, 255, 255, 0.15);
          background: rgba(255, 255, 255, 0.04);
          color: #aab;
        }
        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.08);
          box-shadow: 0 0 15px rgba(255,255,255,0.05);
          color: #dde;
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
        ::-webkit-scrollbar-thumb { background: rgba(0, 255, 136, 0.25); border-radius: 3px; }
      `}</style>

      <div style={styles.gridBg} />
      <div style={styles.scanline} />

      {floatingEmojis.map((emoji, i) => (
        <div
          key={i}
          style={{
            position: 'fixed',
            fontSize: 28,
            left: `${8 + i * 12}%`,
            top: `${10 + (i % 3) * 30}%`,
            animation: `float ${4 + i * 0.7}s ease-in-out infinite`,
            animationDelay: `${i * 0.5}s`,
            zIndex: 0,
            pointerEvents: 'none',
          }}
        >
          {emoji}
        </div>
      ))}

      {particles.map((p) => (
        <div
          key={p.id}
          style={
            {
              position: 'fixed',
              left: `${p.x}%`,
              top: `${p.y}%`,
              fontSize: 24,
              pointerEvents: 'none',
              zIndex: 100,
              '--tx': p.tx,
              '--ty': p.ty,
              animation: 'particle-fly 1.5s ease-out forwards',
              animationDelay: `${p.delay}s`,
            } as CSSProperties
          }
        >
          {p.emoji}
        </div>
      ))}

      <div style={styles.inner}>
        {screen === 'title' && (
          <TitleScreen
            onStart={() => setScreen('game')}
            animateIn={animateIn}
            challengeCount={CHALLENGES.length}
          />
        )}
        {screen === 'game' && (
          <GameScreen
            challenge={challenge}
            allChallenges={CHALLENGES}
            currentChallenge={currentChallenge}
            total={CHALLENGES.length}
            selectedLines={selectedLines}
            toggleLine={toggleLine}
            hintIndex={hintIndex}
            setHintIndex={setHintIndex}
            showExplanation={showExplanation}
            showFixedCode={showFixedCode}
            setShowFixedCode={setShowFixedCode}
            submitAnswer={submitAnswer}
            nextChallenge={nextChallenge}
            scores={scores}
            animateIn={animateIn}
            shakeWrong={shakeWrong}
          />
        )}
        {screen === 'results' && (
          <ResultsScreen
            scores={scores}
            challenges={CHALLENGES}
            totalScore={totalScore}
            restart={restart}
            animateIn={animateIn}
          />
        )}
      </div>
    </div>
  );
}

function TitleScreen(props: {
  onStart: () => void;
  animateIn: boolean;
  challengeCount: number;
}) {
  const { onStart, animateIn, challengeCount } = props;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '90vh',
        textAlign: 'center',
        animation: animateIn ? 'fadeUp 0.8s ease-out' : 'none',
      }}
    >
      <div
        style={{
          fontSize: 80,
          marginBottom: 16,
          filter: 'drop-shadow(0 0 30px rgba(255,59,48,0.4))',
        }}
      >
        🕵️‍♂️
      </div>
      <h1
        style={{
          fontSize: 42,
          fontWeight: 800,
          background: 'linear-gradient(135deg, #00ff88, #00d4ff, #ff3b30)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: 8,
          letterSpacing: -1,
        }}
      >
        セキュリティ脆弱性ハンター
      </h1>
      <p
        style={{
          fontSize: 16,
          color: '#7a8899',
          marginBottom: 40,
          maxWidth: 500,
          lineHeight: 1.8,
        }}
      >
        コードに潜む脆弱性を見つけ出せ！
        <br />
        {challengeCount}つのチャレンジで、セキュリティスキルを鍛えよう
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          marginBottom: 40,
          maxWidth: 500,
          width: '100%',
        }}
      >
        {Object.entries(categoryColors).map(([cat, { icon }]) => (
          <div
            key={cat}
            style={{
              padding: '10px 6px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              textAlign: 'center',
              fontSize: 11,
              color: '#889',
            }}
          >
            <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
            <div style={{ fontWeight: 600 }}>{cat}</div>
          </div>
        ))}
      </div>

      <button type="button" className="btn-cyber" onClick={onStart} style={{ fontSize: 18, padding: '16px 48px' }}>
        🔍 ハンティング開始
      </button>

      <div style={{ marginTop: 32, display: 'flex', gap: 24, color: '#556', fontSize: 13 }}>
        <span>📝 全{challengeCount}問</span>
        <span>⏱️ 制限時間なし</span>
        <span>💡 ヒントあり</span>
      </div>
    </div>
  );
}

function GameScreen(props: {
  challenge: VulnChallenge;
  allChallenges: readonly VulnChallenge[];
  currentChallenge: number;
  total: number;
  selectedLines: number[];
  toggleLine: (lineNum: number) => void;
  hintIndex: number;
  setHintIndex: Dispatch<SetStateAction<number>>;
  showExplanation: boolean;
  showFixedCode: boolean;
  setShowFixedCode: Dispatch<SetStateAction<boolean>>;
  submitAnswer: () => void;
  nextChallenge: () => void;
  scores: number[];
  animateIn: boolean;
  shakeWrong: boolean;
}) {
  const {
    challenge,
    allChallenges,
    currentChallenge,
    total,
    selectedLines,
    toggleLine,
    hintIndex,
    setHintIndex,
    showExplanation,
    showFixedCode,
    setShowFixedCode,
    submitAnswer,
    nextChallenge,
    scores,
    animateIn,
    shakeWrong,
  } = props;

  const codeLines = challenge.code.split('\n');
  const cat = categoryColors[challenge.category] ?? { bg: '#eee', fg: '#333', icon: '🔒' };
  const latestScore = showExplanation ? scores[scores.length - 1] : null;
  const rank = latestScore !== null ? getRank(latestScore) : null;

  return (
    <div style={{ animation: animateIn ? 'fadeUp 0.5s ease-out' : 'none' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            style={{
              padding: '4px 14px',
              borderRadius: 20,
              background: 'rgba(0, 255, 136, 0.1)',
              border: '1px solid rgba(0, 255, 136, 0.25)',
              color: '#00ff88',
              fontFamily: "'Fira Code', monospace",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {currentChallenge + 1} / {total}
          </span>
          <span
            style={{
              padding: '4px 12px',
              borderRadius: 20,
              background: `${cat.bg}22`,
              border: `1px solid ${cat.fg}44`,
              color: cat.fg,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {cat.icon} {challenge.category}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {allChallenges.map((ch, i) => (
            <div
              key={ch.id}
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background:
                  i < scores.length
                    ? getRank(scores[i]).color
                    : i === currentChallenge
                      ? '#00ff88'
                      : 'rgba(255,255,255,0.1)',
                transition: 'all 0.3s',
                boxShadow: i === currentChallenge ? '0 0 10px rgba(0,255,136,0.5)' : 'none',
              }}
            />
          ))}
        </div>
      </div>

      <div
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16,
          padding: 24,
          marginBottom: 20,
          animation: 'pulse-glow 4s ease-in-out infinite',
        }}
      >
        <h2
          style={{
            fontSize: 22,
            fontWeight: 800,
            marginBottom: 8,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span style={{ color: cat.fg }}>{cat.icon}</span>
          {challenge.title}
        </h2>
        <p style={{ fontSize: 14, color: '#8899aa', lineHeight: 1.7, margin: 0 }}>{challenge.description}</p>
        <div style={{ marginTop: 12, fontSize: 12, color: '#556' }}>
          脆弱性のある行をクリックして選択してください（複数選択可）
        </div>
      </div>

      <div
        style={{
          background: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14,
          overflow: 'hidden',
          marginBottom: 20,
          animation: shakeWrong ? 'shake 0.5s ease-in-out' : 'none',
        }}
      >
        <div
          style={{
            padding: '10px 16px',
            background: 'rgba(255,255,255,0.03)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840' }} />
          <span
            style={{
              marginLeft: 12,
              fontSize: 12,
              color: '#556',
              fontFamily: "'Fira Code', monospace",
            }}
          >
            vulnerable-code.js
          </span>
        </div>
        <pre
          style={{
            margin: 0,
            padding: '16px 8px',
            fontFamily: "'Fira Code', monospace",
            fontSize: 13,
            lineHeight: 1.7,
            overflowX: 'auto',
          }}
        >
          {codeLines.map((line, i) => {
            const lineNum = i;
            const isSelected = selectedLines.includes(lineNum);
            const isCorrect =
              showExplanation && challenge.vulnerableLines.includes(lineNum) && isSelected;
            const isMissed =
              showExplanation && challenge.vulnerableLines.includes(lineNum) && !isSelected;
            const isWrong =
              showExplanation && !challenge.vulnerableLines.includes(lineNum) && isSelected;

            let className = 'code-line';
            if (isCorrect) className += ' correct';
            else if (isMissed) className += ' missed';
            else if (isSelected && !showExplanation) className += ' selected';

            return (
              <div
                key={i}
                className={className}
                onClick={() => toggleLine(lineNum)}
                style={{ position: 'relative' }}
              >
                <span
                  style={{
                    color: '#445',
                    marginRight: 16,
                    userSelect: 'none',
                    fontSize: 11,
                    minWidth: 24,
                    display: 'inline-block',
                    textAlign: 'right',
                  }}
                >
                  {i + 1}
                </span>
                <span>{line || ' '}</span>
                {showExplanation && isCorrect && (
                  <span
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: 14,
                    }}
                  >
                    ✅
                  </span>
                )}
                {showExplanation && isMissed && (
                  <span
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: 14,
                    }}
                  >
                    ⚠️
                  </span>
                )}
                {showExplanation && isWrong && (
                  <span
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: 14,
                    }}
                  >
                    ❌
                  </span>
                )}
              </div>
            );
          })}
        </pre>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {!showExplanation && (
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setHintIndex((h) => Math.min(h + 1, challenge.hints.length - 1))}
              disabled={hintIndex >= challenge.hints.length - 1}
              style={{ opacity: hintIndex >= challenge.hints.length - 1 ? 0.4 : 1 }}
            >
              💡 ヒント ({hintIndex + 1}/{challenge.hints.length})
            </button>
            <button
              type="button"
              className="btn-danger"
              onClick={submitAnswer}
              disabled={selectedLines.length === 0}
              style={{ opacity: selectedLines.length === 0 ? 0.4 : 1, marginLeft: 'auto' }}
            >
              🚨 脆弱性を報告する
            </button>
          </>
        )}
        {showExplanation && (
          <button type="button" className="btn-cyber" onClick={nextChallenge} style={{ marginLeft: 'auto' }}>
            {currentChallenge < total - 1 ? '次のチャレンジへ →' : '結果を見る 🏆'}
          </button>
        )}
      </div>

      {hintIndex >= 0 && !showExplanation && (
        <div
          style={{
            background: 'rgba(255, 193, 7, 0.06)',
            border: '1px solid rgba(255, 193, 7, 0.2)',
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
          }}
        >
          {challenge.hints.slice(0, hintIndex + 1).map((hint, i) => (
            <div
              key={i}
              style={{
                fontSize: 13,
                color: '#cda',
                marginBottom: i < hintIndex ? 8 : 0,
                display: 'flex',
                gap: 8,
              }}
            >
              <span>💡</span>
              <span>{hint}</span>
            </div>
          ))}
        </div>
      )}

      {showExplanation && rank && latestScore !== null && (
        <div
          style={{
            animation: 'fadeUp 0.5s ease-out',
          }}
        >
          <div
            style={{
              background: `linear-gradient(135deg, ${rank.color}11, transparent)`,
              border: `1px solid ${rank.color}33`,
              borderRadius: 16,
              padding: 20,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 20,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: rank.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 32,
                fontWeight: 800,
                color: '#fff',
                fontFamily: "'Fira Code', monospace",
                animation: 'rank-reveal 0.6s ease-out',
                flexShrink: 0,
              }}
            >
              {rank.label}
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: rank.color }}>{latestScore}点</div>
              <div style={{ fontSize: 13, color: '#889' }}>{rank.title}</div>
            </div>
          </div>

          <div
            style={{
              background: 'rgba(0, 255, 136, 0.04)',
              border: '1px solid rgba(0, 255, 136, 0.12)',
              borderRadius: 14,
              padding: 20,
              marginBottom: 16,
            }}
          >
            <h3
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: '#00ff88',
                marginBottom: 10,
                marginTop: 0,
              }}
            >
              🔍 解説
            </h3>
            <p style={{ fontSize: 13, lineHeight: 1.8, color: '#aabbc0', margin: 0 }}>{challenge.explanation}</p>
          </div>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowFixedCode(!showFixedCode)}
            style={{ marginBottom: 16 }}
          >
            {showFixedCode ? '🔽 修正コードを閉じる' : '🔧 修正後のコードを見る'}
          </button>
          {showFixedCode && (
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(0, 255, 136, 0.15)',
                borderRadius: 14,
                overflow: 'hidden',
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  padding: '10px 16px',
                  background: 'rgba(0, 255, 136, 0.05)',
                  borderBottom: '1px solid rgba(0, 255, 136, 0.1)',
                  fontSize: 12,
                  color: '#00ff88',
                  fontFamily: "'Fira Code', monospace",
                }}
              >
                ✅ fixed-code.js
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: 16,
                  fontFamily: "'Fira Code', monospace",
                  fontSize: 13,
                  lineHeight: 1.7,
                  overflowX: 'auto',
                  color: '#a0c4a8',
                }}
              >
                {challenge.fixedCode}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResultsScreen(props: {
  scores: number[];
  challenges: readonly VulnChallenge[];
  totalScore: number;
  restart: () => void;
  animateIn: boolean;
}) {
  const { scores, challenges, totalScore, restart, animateIn } = props;
  const rank = getRank(totalScore);
  const perfectCount = scores.filter((s) => s >= 90).length;
  const avgHigh = scores.filter((s) => s >= 70).length;

  return (
    <div
      style={{
        minHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 40,
        animation: animateIn ? 'fadeUp 0.8s ease-out' : 'none',
      }}
    >
      <div style={{ fontSize: 60, marginBottom: 12 }}>🏆</div>
      <h1 style={{ fontSize: 32, fontWeight: 800, color: '#fff', marginBottom: 8 }}>ハンティング完了！</h1>
      <p style={{ color: '#778', marginBottom: 32 }}>全{challenges.length}チャレンジの結果</p>

      <div
        style={{
          background: `linear-gradient(135deg, ${rank.color}18, transparent)`,
          border: `1px solid ${rank.color}44`,
          borderRadius: 24,
          padding: '32px 48px',
          textAlign: 'center',
          marginBottom: 32,
          animation: 'rank-reveal 0.8s ease-out',
        }}
      >
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: 24,
            background: rank.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 52,
            fontWeight: 800,
            color: '#fff',
            margin: '0 auto 16px',
            fontFamily: "'Fira Code', monospace",
            boxShadow: `0 8px 32px ${rank.color}44`,
          }}
        >
          {rank.label}
        </div>
        <div style={{ fontSize: 44, fontWeight: 800, color: rank.color, marginBottom: 4 }}>{totalScore}点</div>
        <div style={{ fontSize: 16, color: '#aab' }}>{rank.title}</div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
          marginBottom: 32,
          width: '100%',
          maxWidth: 500,
        }}
      >
        {[
          { label: 'Sランク', value: perfectCount, icon: '⭐' },
          { label: 'A以上', value: avgHigh, icon: '🎯' },
          { label: '平均スコア', value: `${totalScore}%`, icon: '📊' },
        ].map(({ label, value, icon }) => (
          <div
            key={label}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 14,
              padding: 16,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>{value}</div>
            <div style={{ fontSize: 11, color: '#667' }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ width: '100%', maxWidth: 600, marginBottom: 32 }}>
        {challenges.map((ch, i) => {
          const s = scores[i];
          const r = getRank(s);
          const cat = categoryColors[ch.category];
          return (
            <div
              key={ch.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                borderRadius: 12,
                marginBottom: 8,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
                animation: 'fadeUp 0.5s ease-out',
                animationDelay: `${i * 0.08}s`,
                animationFillMode: 'both',
              }}
            >
              <span style={{ fontSize: 18 }}>{cat?.icon ?? '🔒'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#ccd' }}>{ch.title}</div>
                <div style={{ fontSize: 11, color: '#556' }}>{ch.category}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 80,
                    height: 6,
                    borderRadius: 3,
                    background: 'rgba(255,255,255,0.06)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${s}%`,
                      height: '100%',
                      borderRadius: 3,
                      background: r.bg,
                      transition: 'width 1s ease-out',
                    }}
                  />
                </div>
                <span
                  style={{
                    fontFamily: "'Fira Code', monospace",
                    fontSize: 13,
                    fontWeight: 700,
                    color: r.color,
                    minWidth: 40,
                    textAlign: 'right',
                  }}
                >
                  {r.label} {s}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <button type="button" className="btn-cyber" onClick={restart} style={{ fontSize: 16, padding: '14px 40px' }}>
          🔄 もう一度挑戦する
        </button>
      </div>
    </div>
  );
}
