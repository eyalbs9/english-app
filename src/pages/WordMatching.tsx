import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, X, Music, VolumeX, Smile, SmilePlus, Sparkles, Shuffle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { VocabularyWord } from "@/data/vocabulary";

const WordMatching = () => {
  const { currentUser, updateWordStatus } = useApp();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [retryQueue, setRetryQueue] = useState<VocabularyWord[]>([]);
  const [enableAudio, setEnableAudio] = useState(true);
  const [voiceGender, setVoiceGender] = useState<"boy" | "girl">("girl");
  const [shuffleMode, setShuffleMode] = useState(false);

  const [words, setWords] = useState<VocabularyWord[]>(() => {
    if (!currentUser) return [];
    return [...currentUser.words];
  });

  // פונקציה לערבוב המילים
  const shuffleWords = () => {
    setShuffleMode(!shuffleMode);
    if (!shuffleMode) {
      // ערבב את המילים
      const shuffled = [...words].sort(() => Math.random() - 0.5);
      setWords(shuffled);
    } else {
      // החזר לסדר המקורי
      const original = currentUser ? [...currentUser.words] : [];
      setWords(original);
    }
    // איפוס לכרטיסייה הראשונה
    setCurrentIndex(0);
    setRetryQueue([]);
    setSelected(null);
    setShowResult(false);
  };

  const allWords = [...words, ...retryQueue];
  const currentWord = currentIndex < words.length ? words[currentIndex] : retryQueue[currentIndex - words.length];
  const totalLength = words.length + retryQueue.length;

  // פונקציית דיבור משופרת עם בחירת קול ילד/ילדה
  const speak = useCallback((text: string) => {
    if (!text || !window.speechSynthesis) return;

    // עצירה מוחלטת של כל מה שקורה עכשיו
    window.speechSynthesis.cancel();

    // המתנה קצרה לוודא שה-cancel הסתיים
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      
      // הגדרות לקול ילדותי - מהיר יותר וגבוה יותר
      utterance.rate = 0.9;   // קצב מעט יותר מהיר ואנרגטי
      utterance.pitch = 1.3;  // טון גבוה יותר לקול ילדותי
      utterance.volume = 0.8; // עוצמה טובה

      // בחירת קול לפי ילד/ילדה
      const voices = window.speechSynthesis.getVoices();
      const englishVoices = voices.filter(voice => voice.lang.startsWith('en'));
      
      let selectedVoice;
      if (voiceGender === "girl") {
        // חיפוש קולות נשיים (ילדה)
        selectedVoice = englishVoices.find(voice => 
          voice.name.toLowerCase().includes('female') ||
          voice.name.toLowerCase().includes('woman') ||
          voice.name.toLowerCase().includes('samantha') ||
          voice.name.toLowerCase().includes('victoria') ||
          voice.name.toLowerCase().includes('zira') ||
          voice.name.toLowerCase().includes('karen')
        );
      } else {
        // חיפוש קולות גבריים (ילד)
        selectedVoice = englishVoices.find(voice => 
          voice.name.toLowerCase().includes('male') ||
          voice.name.toLowerCase().includes('man') ||
          voice.name.toLowerCase().includes('david') ||
          voice.name.toLowerCase().includes('mark') ||
          voice.name.toLowerCase().includes('daniel')
        );
      }

      // אם לא מצאנו קול ספציפי, ניקח את הראשון באנגלית
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      } else if (englishVoices.length > 0) {
        utterance.voice = englishVoices[0];
      }

      // הפעלה
      window.speechSynthesis.speak(utterance);
    }, 100);
  }, [voiceGender]);

  // השמעת המילה באנגלית מיד כשהיא מופיעה
  useEffect(() => {
    if (!enableAudio || !currentWord?.english || showResult) return;
    
    // השמעה מיד כשהמילה מופיעה
    const timeoutId = setTimeout(() => {
      speak(currentWord.english);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [currentIndex, currentWord, enableAudio, showResult, speak]);

  // טעינת הקולות בעת טעינת הקומפוננטה
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  const generateOptions = useCallback((word: VocabularyWord): string[] => {
    const pool = currentUser?.words ?? [];
    const others = pool
      .filter(w => w.id !== word.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(w => w.hebrew);
    return [...others, word.hebrew].sort(() => Math.random() - 0.5);
  }, [currentUser]);

  const [options, setOptions] = useState<string[]>([]);

  // עדכון האופציות כשהמילה משתנה
  useEffect(() => {
    if (currentWord) {
      setOptions(generateOptions(currentWord));
    }
  }, [currentWord, generateOptions]);

  const progress = totalLength > 0 ? (currentIndex / totalLength) * 100 : 0;
  const correctCount = currentUser?.words.filter(w => w.known === true).length ?? 0;
  const wrongCount = currentUser?.words.filter(w => w.known === false).length ?? 0;

  const handleSelect = (option: string) => {
    if (showResult) return;
    setSelected(option);
    setShowResult(true);
    const isCorrect = option === currentWord?.hebrew;

    if (currentWord) {
      updateWordStatus(currentWord.id, isCorrect);
      if (!isCorrect) {
        // Add back to retry queue
        setRetryQueue(prev => [...prev, currentWord]);
      }
    }

    // Speed up transition: 600ms instead of 1200ms
    setTimeout(() => {
      const nextIdx = currentIndex + 1;
      if (nextIdx < totalLength + (isCorrect ? 0 : 1)) {
        setCurrentIndex(nextIdx);
        const nextWord = nextIdx < words.length ? words[nextIdx] : retryQueue[nextIdx - words.length] ?? (isCorrect ? undefined : currentWord);
        if (nextWord) setOptions(generateOptions(nextWord));
      }
      setSelected(null);
      setShowResult(false);
    }, 600);
  };

  if (!currentUser) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8" dir="rtl">
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowRight className="h-5 w-5" />
            <span className="text-sm">חזרה</span>
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500 animate-pulse" />
            <h1 className="text-xl font-bold font-display text-foreground">התאמת מילה</h1>
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

        {/* Audio Controls - כפתורים צבעוניים */}
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
            {/* English Word Card */}
            <motion.div
              key={currentWord.id + "-" + currentIndex}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="mb-8 flex h-48 items-center justify-center rounded-3xl bg-gradient-to-br from-card to-card/80 shadow-2xl border-2 border-accent/20"
            >
              <div className="text-center">
                <motion.p 
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="text-sm font-semibold text-muted-foreground mb-3"
                >
                  English 🇬🇧
                </motion.p>
                <motion.p 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-5xl font-black font-display text-card-foreground" 
                  dir="ltr"
                >
                  {currentWord.english}
                </motion.p>
              </div>
            </motion.div>

            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-4 text-center text-base font-bold text-muted-foreground"
            >
              ✨ בחרו את התרגום הנכון: ✨
            </motion.p>

            {/* Options Grid */}
            <div className="grid grid-cols-2 gap-4">
              <AnimatePresence>
                {options.map((option, i) => {
                  const isCorrect = option === currentWord.hebrew;
                  const isSelected = selected === option;
                  let bgClass = "bg-gradient-to-br from-card to-card/90 border-border hover:border-primary/40 hover:shadow-lg";
                  if (showResult) {
                    if (isCorrect) bgClass = "bg-gradient-to-r from-green-400 to-green-500 border-green-600 text-white shadow-xl scale-105";
                    else if (isSelected && !isCorrect) bgClass = "bg-gradient-to-r from-red-400 to-red-500 border-red-600 text-white shadow-xl";
                  }
                  return (
                    <motion.button
                      key={option + i}
                      initial={{ opacity: 0, y: 20, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: i * 0.1, type: "spring" }}
                      whileHover={!showResult ? { scale: 1.05, y: -5 } : {}}
                      whileTap={!showResult ? { scale: 0.95 } : {}}
                      onClick={() => handleSelect(option)}
                      disabled={showResult}
                      className={`relative rounded-2xl border-2 p-6 text-center text-xl font-black font-display shadow-lg transition-all ${bgClass}`}
                    >
                      <span className={showResult && isCorrect ? "text-white" : showResult && isSelected ? "text-white" : "text-card-foreground"}>
                        {option}
                      </span>
                      {showResult && isCorrect && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring" }}
                        >
                          <Check className="mx-auto mt-2 h-6 w-6 text-white" />
                        </motion.div>
                      )}
                      {showResult && isSelected && !isCorrect && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring" }}
                        >
                          <X className="mx-auto mt-2 h-6 w-6 text-white" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          </>
        )}

        {/* Completion Message */}
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
              className="text-5xl mb-3"
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

export default WordMatching;