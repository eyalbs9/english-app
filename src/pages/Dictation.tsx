import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Delete, CheckCircle, Check, X, Lightbulb, Music, VolumeX, Smile, SmilePlus, Sparkles, Shuffle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { VocabularyWord } from "@/data/vocabulary";

const Dictation = () => {
  const { currentUser, updateWordStatus } = useApp();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [letters, setLetters] = useState<string[]>([]);
  const [activeBox, setActiveBox] = useState(0);
  const [checkCount, setCheckCount] = useState(0); // 0 = not checked, 1 = first check, 2 = second check
  const [scored, setScored] = useState(false);
  const [boxColors, setBoxColors] = useState<string[]>([]);
  const [retryQueue, setRetryQueue] = useState<VocabularyWord[]>([]);
  const [enableAudio, setEnableAudio] = useState(true);
  const [voiceGender, setVoiceGender] = useState<"boy" | "girl">("girl");
  const [shuffleMode, setShuffleMode] = useState(false);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [words, setWords] = useState<VocabularyWord[]>(() => {
    if (!currentUser) return [];
    return [...currentUser.words];
  });

  // פונקציה לערבוב המילים
  const shuffleWords = () => {
    setShuffleMode(!shuffleMode);
    if (!shuffleMode) {
      const shuffled = [...words].sort(() => Math.random() - 0.5);
      setWords(shuffled);
    } else {
      const original = currentUser ? [...currentUser.words] : [];
      setWords(original);
    }
    setCurrentIndex(0);
    setRetryQueue([]);
  };

  const allWords = [...words, ...retryQueue];
  const currentWord = currentIndex < words.length ? words[currentIndex] : retryQueue[currentIndex - words.length];
  const totalLength = words.length + retryQueue.length;
  const wordLength = currentWord?.english.length ?? 0;
  const progress = totalLength > 0 ? (currentIndex / totalLength) * 100 : 0;
  const correctCount = currentUser?.words.filter(w => w.known === true).length ?? 0;
  const wrongCount = currentUser?.words.filter(w => w.known === false).length ?? 0;

  // פונקציית דיבור
  const speak = useCallback((text: string) => {
    if (!text || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 0.9;
      utterance.pitch = 1.3;
      utterance.volume = 0.8;

      const voices = window.speechSynthesis.getVoices();
      const englishVoices = voices.filter(voice => voice.lang.startsWith('en'));
      
      let selectedVoice;
      if (voiceGender === "girl") {
        selectedVoice = englishVoices.find(voice => 
          voice.name.toLowerCase().includes('female') ||
          voice.name.toLowerCase().includes('woman') ||
          voice.name.toLowerCase().includes('samantha') ||
          voice.name.toLowerCase().includes('victoria') ||
          voice.name.toLowerCase().includes('zira') ||
          voice.name.toLowerCase().includes('karen')
        );
      } else {
        selectedVoice = englishVoices.find(voice => 
          voice.name.toLowerCase().includes('male') ||
          voice.name.toLowerCase().includes('man') ||
          voice.name.toLowerCase().includes('david') ||
          voice.name.toLowerCase().includes('mark') ||
          voice.name.toLowerCase().includes('daniel')
        );
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      } else if (englishVoices.length > 0) {
        utterance.voice = englishVoices[0];
      }

      window.speechSynthesis.speak(utterance);
    }, 100);
  }, [voiceGender]);

  // טעינת הקולות
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  const getExpected = useCallback((word: string) => {
    if (!word) return "";
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }, []);

  useEffect(() => {
    if (currentWord) {
      const expected = getExpected(currentWord.english);
      setLetters(Array(expected.length).fill(""));
      setActiveBox(0);
      setCheckCount(0);
      setScored(false);
      setBoxColors(Array(expected.length).fill(""));
      setShowCorrectAnswer(false);
    }
  }, [currentWord, getExpected]);

  useEffect(() => {
    containerRef.current?.focus();
  }, [activeBox, currentIndex]);

  const handleKeyInput = useCallback((key: string) => {
    if (checkCount >= 2) return; // רק אחרי בדיקה שנייה נחסום הקלדה
    if (key === "Backspace") {
      setLetters(prev => {
        const newLetters = [...prev];
        if (newLetters[activeBox] !== "") {
          newLetters[activeBox] = "";
          
          // נקה את הצבע של התיבה הזו
          if (checkCount === 1) {
            setBoxColors(prevColors => {
              const newColors = [...prevColors];
              newColors[activeBox] = "";
              return newColors;
            });
          }
        } else if (activeBox > 0) {
          newLetters[activeBox - 1] = "";
          
          // נקה את הצבע של התיבה הקודמת
          if (checkCount === 1) {
            setBoxColors(prevColors => {
              const newColors = [...prevColors];
              newColors[activeBox - 1] = "";
              return newColors;
            });
          }
          
          setActiveBox(a => a - 1);
        }
        return newLetters;
      });
      return;
    }

    if (/^[a-zA-Z]$/.test(key)) {
      setLetters(prev => {
        if (activeBox >= prev.length) return prev;
        const newLetters = [...prev];
        const char = activeBox === 0 ? key.toUpperCase() : key.toLowerCase();
        newLetters[activeBox] = char;
        return newLetters;
      });
      
      // נקה את הצבע של התיבה הנוכחית כשמקלידים אות חדשה
      if (checkCount === 1) {
        setBoxColors(prev => {
          const newColors = [...prev];
          newColors[activeBox] = "";
          return newColors;
        });
      }
      
      if (activeBox < wordLength - 1) {
        setActiveBox(prev => prev + 1);
      }
    }
  }, [checkCount, activeBox, wordLength]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && checkCount === 0 && letters.every(l => l !== "")) {
      checkWord();
      return;
    }
    handleKeyInput(e.key);
  }, [handleKeyInput, checkCount, letters]);

  const checkWord = () => {
    if (!currentWord) return;
    const expected = getExpected(currentWord.english);

    if (checkCount === 0) {
      // בדיקה ראשונה - צבע רק את הנכונות בירוק
      const colors = letters.map((l, i) => (l === expected[i] ? "success" : ""));
      setBoxColors(colors);
      setCheckCount(1);
      
      const allCorrect = letters.every((l, i) => l === expected[i]);
      if (allCorrect) {
        // צדק! השמע את המילה
        if (enableAudio) {
          setTimeout(() => speak(currentWord.english), 300);
        }
        if (!scored) {
          updateWordStatus(currentWord.id, true);
          setScored(true);
        }
        // המשך למילה הבאה
        setTimeout(() => {
          if (currentIndex < totalLength - 1) {
            setCurrentIndex(prev => prev + 1);
          }
        }, 1500);
      }
    } else if (checkCount === 1) {
      // בדיקה שנייה
      const allCorrect = letters.every((l, i) => l === expected[i]);
      
      if (allCorrect) {
        // צדק! המשך למילה הבאה
        if (enableAudio) {
          setTimeout(() => speak(currentWord.english), 300);
        }
        setTimeout(() => {
          if (currentIndex < totalLength - 1) {
            setCurrentIndex(prev => prev + 1);
          }
        }, 1500);
      } else {
        // טעה! הצג את המילה הנכונה מעל
        setShowCorrectAnswer(true);
        const colors = letters.map((l, i) => (l === expected[i] ? "success" : "destructive"));
        setBoxColors(colors);
        setCheckCount(2);
        
        // השמע את המילה
        if (enableAudio) {
          setTimeout(() => speak(currentWord.english), 300);
        }
        
        // עדכן סטטיסטיקה
        if (!scored) {
          updateWordStatus(currentWord.id, false);
          setScored(true);
        }
        
        // הוסף למילים לחזרה
        setRetryQueue(prev => [...prev, currentWord]);
        
        // עבור למילה הבאה אחרי 3 שניות (זמן לקרוא)
        setTimeout(() => {
          if (currentIndex < totalLength) {
            setCurrentIndex(prev => prev + 1);
          }
        }, 3000);
      }
    }
  };

  // כפתור רמז - מגלה אות אחת
  const showHint = () => {
    if (!currentWord || checkCount >= 2) return;
    const expected = getExpected(currentWord.english);
    
    // מצא את האות הראשונה שריקה או שגויה
    const emptyIndex = letters.findIndex((l, i) => l === "" || l !== expected[i]);
    if (emptyIndex >= 0) {
      setLetters(prev => {
        const newLetters = [...prev];
        newLetters[emptyIndex] = expected[emptyIndex];
        return newLetters;
      });
      
      // עבור לתיבה הבאה
      if (emptyIndex < wordLength - 1) {
        setActiveBox(emptyIndex + 1);
      }
    }
  };

  const nextWord = () => {
    if (currentIndex < totalLength - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  if (!currentUser) {
    navigate("/");
    return null;
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="min-h-screen bg-background p-4 md:p-8 outline-none"
      dir="rtl"
    >
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowRight className="h-5 w-5" />
            <span className="text-sm">חזרה</span>
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500 animate-pulse" />
            <h1 className="text-xl font-bold font-display text-foreground">הכתבה</h1>
            <Sparkles className="h-5 w-5 text-yellow-500 animate-pulse" />
          </div>
          <div className="flex items-center gap-3">
            <motion.div 
              whileHover={{ scale: 1.1 }}
              className="flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 px-3 py-1"
            >
              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-bold text-green-600 dark:text-green-400">{correctCount}</span>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.1 }}
              className="flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/30 px-3 py-1"
            >
              <X className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="text-sm font-bold text-red-600 dark:text-red-400">{wrongCount}</span>
            </motion.div>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>{currentIndex + 1} / {totalLength}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-3" />
        </div>

        {/* Controls */}
        <div className="mb-6 flex flex-wrap justify-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={shuffleWords}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold shadow-lg transition-all hover:shadow-xl ${
              shuffleMode
                ? "bg-gradient-to-r from-orange-400 to-orange-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
            }`}
          >
            <Shuffle className="h-4 w-4" />
            ערבב
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setEnableAudio(!enableAudio)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold shadow-lg transition-all hover:shadow-xl ${
              enableAudio
                ? "bg-gradient-to-r from-green-400 to-green-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
            }`}
          >
            {enableAudio ? <Music className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            {enableAudio ? "שמע" : "ללא שמע"}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setVoiceGender(voiceGender === "girl" ? "boy" : "girl")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold shadow-lg transition-all hover:shadow-xl ${
              enableAudio
                ? voiceGender === "girl"
                  ? "bg-gradient-to-r from-pink-400 to-pink-600 text-white"
                  : "bg-gradient-to-r from-cyan-400 to-cyan-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
            }`}
          >
            {voiceGender === "girl" ? <SmilePlus className="h-4 w-4" /> : <Smile className="h-4 w-4" />}
            {voiceGender === "girl" ? "קול ילדה" : "קול ילד"}
          </motion.button>
        </div>

        {currentWord && (
          <>
            {/* Hebrew word */}
            <motion.div
              key={currentWord.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="mb-8 flex h-40 items-center justify-center rounded-3xl bg-gradient-to-br from-card to-card/80 shadow-2xl border-2 border-accent/20"
            >
              <div className="text-center px-6">
                <motion.p 
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="text-sm font-semibold text-muted-foreground mb-3"
                >
                  תרגמו לאנגלית: 🇮🇱→🇬🇧
                </motion.p>
                <motion.p 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-5xl font-black font-display text-card-foreground"
                >
                  {currentWord.hebrew}
                </motion.p>
              </div>
            </motion.div>

            {/* Letter boxes */}
            <div className="mb-6 relative">
              {/* Correct answer above - shown when wrong */}
              {showCorrectAnswer && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute -top-20 left-0 right-0 flex justify-center"
                >
                  <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl px-6 py-3 shadow-2xl">
                    <p className="text-xs font-bold text-white/80 mb-1 text-center">✓ התשובה הנכונה:</p>
                    <p className="text-3xl font-black text-white tracking-wider" dir="ltr">
                      {getExpected(currentWord.english)}
                    </p>
                  </div>
                </motion.div>
              )}
              
              <div className="flex justify-center gap-2 flex-wrap" dir="ltr">
                {letters.map((letter, i) => {
                  let borderColor = "border-border";
                  let bg = "bg-card";
                  if (boxColors[i] === "success") { 
                    borderColor = "border-green-500"; 
                    bg = "bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30"; 
                  }
                  if (boxColors[i] === "destructive") { 
                    borderColor = "border-red-500"; 
                    bg = "bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30"; 
                  }
                  if (i === activeBox && checkCount < 2) { 
                    borderColor = "border-primary ring-2 ring-primary/50"; 
                  }

                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: i * 0.05, type: "spring" }}
                      whileHover={checkCount < 2 ? { scale: 1.1 } : {}}
                      onClick={() => { if (checkCount < 2) setActiveBox(i); }}
                      className={`flex h-16 w-14 items-center justify-center rounded-xl border-2 ${borderColor} ${bg} cursor-pointer text-2xl font-black font-display text-card-foreground shadow-lg transition-all`}
                    >
                      {letter}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-center gap-3 flex-wrap">
              {checkCount === 0 ? (
                <>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleKeyInput("Backspace")}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-gray-400 to-gray-500 px-4 py-3 text-sm font-bold text-white shadow-lg hover:shadow-xl transition-all"
                  >
                    <Delete className="h-5 w-5" />
                    מחק
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={showHint}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 px-4 py-3 text-sm font-bold text-white shadow-lg hover:shadow-xl transition-all"
                  >
                    <Lightbulb className="h-5 w-5" />
                    רמז 💡
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={checkWord}
                    disabled={letters.some(l => l === "")}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 text-sm font-black text-white shadow-xl hover:shadow-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <CheckCircle className="h-5 w-5" />
                    בדוק מילה ✓
                  </motion.button>
                </>
              ) : checkCount === 1 ? (
                <>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleKeyInput("Backspace")}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-gray-400 to-gray-500 px-4 py-3 text-sm font-bold text-white shadow-lg hover:shadow-xl transition-all"
                  >
                    <Delete className="h-5 w-5" />
                    מחק
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={showHint}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 px-4 py-3 text-sm font-bold text-white shadow-lg hover:shadow-xl transition-all"
                  >
                    <Lightbulb className="h-5 w-5" />
                    רמז 💡
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={checkWord}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-3 text-base font-black text-white shadow-xl hover:shadow-2xl transition-all"
                  >
                    <CheckCircle className="h-5 w-5" />
                    בדוק שוב ✓
                  </motion.button>
                </>
              ) : (
                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring" }}
                  onClick={nextWord}
                  disabled={currentIndex >= totalLength - 1}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600 px-8 py-3 text-base font-black text-white shadow-xl hover:shadow-2xl transition-all disabled:opacity-40"
                >
                  הבא →
                </motion.button>
              )}
            </div>

            {/* On-screen keyboard */}
            <div className="mt-8 flex flex-wrap justify-center gap-1.5" dir="ltr">
              {"QWERTYUIOPASDFGHJKLZXCVBNM".split("").map(key => (
                <motion.button
                  key={key}
                  whileHover={checkCount < 2 ? { scale: 1.1, y: -3 } : {}}
                  whileTap={checkCount < 2 ? { scale: 0.9 } : {}}
                  onClick={() => handleKeyInput(activeBox === 0 ? key.toUpperCase() : key.toLowerCase())}
                  disabled={checkCount >= 2}
                  className="flex h-12 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-card to-card/90 border-2 border-border text-base font-black text-card-foreground shadow-md hover:shadow-lg hover:border-primary/50 active:bg-primary/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {key}
                </motion.button>
              ))}
            </div>
          </>
        )}

        {/* Completion */}
        {currentIndex >= totalLength && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ type: "spring" }}
            className="mt-8 text-center"
          >
            <motion.p 
              animate={{ rotate: [0, 10, -10, 10, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
              className="text-6xl mb-4"
            >
              🎉
            </motion.p>
            <p className="text-3xl font-black font-display text-foreground mb-2">כל הכבוד!</p>
            <p className="text-muted-foreground text-lg mb-6">סיימת את כל המילים 🌟</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/dashboard")}
              className="rounded-2xl bg-gradient-to-r from-purple-500 to-pink-600 px-8 py-4 text-xl font-black text-white shadow-xl hover:shadow-2xl transition-all"
            >
              חזרה לתפריט 🏠
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Dictation;