import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Shuffle, Music, VolumeX, RefreshCw, ThumbsDown, ThumbsUp, Hash, Repeat, Smile, SmilePlus, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const Flashcards = () => {
  const { currentUser, updateWordStatus, resetWords } = useApp();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sortMode, setSortMode] = useState<"default" | "random" | "alpha">("default");
  const [showEnglishFirst, setShowEnglishFirst] = useState(true);
  const [enableAudio, setEnableAudio] = useState(true);
  const [voiceGender, setVoiceGender] = useState<"boy" | "girl">("girl");

  const words = useMemo(() => {
    if (!currentUser) return [];
    const w = [...currentUser.words];
    if (sortMode === "random") {
      for (let i = w.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [w[i], w[j]] = [w[j], w[i]];
      }
    } else if (sortMode === "alpha") {
      w.sort((a, b) => a.english.localeCompare(b.english));
    }
    return w;
  }, [currentUser, sortMode]);

  const correctCount = currentUser?.words.filter(w => w.known === true).length ?? 0;
  const wrongCount = currentUser?.words.filter(w => w.known === false).length ?? 0;
  const answeredCount = currentUser?.words.filter(w => w.known !== null).length ?? 0;
  const progress = words.length > 0 ? (answeredCount / words.length) * 100 : 0;

  const currentWord = words[currentIndex];

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
    if (!enableAudio || !currentWord?.english) return;
    
    // אם המילה באנגלית מופיעה בצד הקדמי - נשמיע מיד
    if (showEnglishFirst && !flipped) {
      setTimeout(() => {
        speak(currentWord.english);
      }, 300); // השהיה קטנה אחרי הופעת הכרטיסייה
    }
  }, [currentIndex, currentWord, enableAudio, showEnglishFirst, flipped, speak]);

  // פונקציית הפיכת הכרטיסייה
  const handleFlip = useCallback(() => {
    if (flipped) return;
    
    setFlipped(true);
    
    // אם המילה באנגלית בצד האחורי - נשמיע עכשיו
    if (enableAudio && currentWord?.english && !showEnglishFirst) {
      setTimeout(() => {
        speak(currentWord.english);
      }, 50);
    }
  }, [flipped, enableAudio, currentWord, showEnglishFirst, speak]);

  const handleAnswer = (known: boolean) => {
    if (!currentWord) return;
    updateWordStatus(currentWord.id, known);
    setFlipped(false);
    if (currentIndex < words.length - 1) {
      setTimeout(() => setCurrentIndex(prev => prev + 1), 200);
    }
  };

  const startOver = () => {
    resetWords();
    setCurrentIndex(0);
    setFlipped(false);
  };

  // טעינת הקולות בעת טעינת הקומפוננטה
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  if (!currentUser) {
    navigate("/");
    return null;
  }

  const frontText = showEnglishFirst ? currentWord?.english : currentWord?.hebrew;
  const backText = showEnglishFirst ? currentWord?.hebrew : currentWord?.english;
  const frontLang = showEnglishFirst ? "en" : "he";
  const backLang = showEnglishFirst ? "he" : "en";

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
            <h1 className="text-xl font-bold font-display text-foreground">כרטיסיות</h1>
            <Sparkles className="h-5 w-5 text-yellow-500 animate-pulse" />
          </div>
          <div className="flex items-center gap-3">
            <motion.div 
              whileHover={{ scale: 1.1 }}
              className="flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 px-3 py-1"
            >
              <ThumbsUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-bold text-green-600 dark:text-green-400">{correctCount}</span>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.1 }}
              className="flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/30 px-3 py-1"
            >
              <ThumbsDown className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="text-sm font-bold text-red-600 dark:text-red-400">{wrongCount}</span>
            </motion.div>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>{answeredCount} / {words.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-3" />
        </div>

        {/* Top Controls - כפתורים צבעוניים ואנרגטיים */}
        <div className="mb-6 flex flex-wrap justify-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={startOver}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-400 to-purple-600 px-3 py-2 text-xs font-bold text-white shadow-lg transition-all hover:shadow-xl"
          >
            <RefreshCw className="h-4 w-4" />
            התחל מחדש
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSortMode(sortMode === "random" ? "default" : "random")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold shadow-lg transition-all hover:shadow-xl ${
              sortMode === "random"
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
            onClick={() => setSortMode(sortMode === "alpha" ? "default" : "alpha")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold shadow-lg transition-all hover:shadow-xl ${
              sortMode === "alpha"
                ? "bg-gradient-to-r from-blue-400 to-blue-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
            }`}
          >
            <Hash className="h-4 w-4" />
            א-ב
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowEnglishFirst(!showEnglishFirst)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-400 to-teal-600 px-3 py-2 text-xs font-bold text-white shadow-lg transition-all hover:shadow-xl"
          >
            <Repeat className="h-4 w-4" />
            {showEnglishFirst ? "EN→HE" : "HE→EN"}
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

        {/* Card */}
        {currentWord && (
          <div className="mb-6" style={{ perspective: "1000px" }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentWord.id + (flipped ? "-back" : "-front")}
                initial={{ rotateY: flipped ? -90 : 90, opacity: 0, scale: 0.8 }}
                animate={{ rotateY: 0, opacity: 1, scale: 1 }}
                exit={{ rotateY: flipped ? 90 : -90, opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.4, type: "spring" }}
                className="flex h-64 items-center justify-center rounded-3xl bg-gradient-to-br from-card to-card/80 shadow-2xl border-2 border-accent/20 cursor-pointer hover:shadow-primary/50 transition-shadow"
                onClick={handleFlip}
              >
                <div className="text-center px-6">
                  <motion.p 
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-sm font-semibold text-muted-foreground mb-3"
                  >
                    {!flipped ? (showEnglishFirst ? "English 🇬🇧" : "עברית 🇮🇱") : (showEnglishFirst ? "עברית 🇮🇱" : "English 🇬🇧")}
                  </motion.p>
                  <motion.p
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-5xl font-black font-display text-card-foreground"
                    dir={!flipped ? (frontLang === "he" ? "rtl" : "ltr") : (backLang === "he" ? "rtl" : "ltr")}
                  >
                    {!flipped ? frontText : backText}
                  </motion.p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* Action area */}
        {!flipped ? (
          <div className="flex justify-center mb-6">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleFlip}
              className="rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 px-10 py-4 text-lg font-black text-white shadow-xl hover:shadow-2xl transition-all"
            >
              ✨ הצג תשובה ✨
            </motion.button>
          </div>
        ) : (
          <div className="flex gap-4 mb-6">
            <motion.button
              whileHover={{ scale: 1.05, rotate: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleAnswer(false)}
              className="flex flex-1 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 p-5 text-lg font-black text-white shadow-xl hover:shadow-2xl transition-all"
            >
              <ThumbsDown className="h-7 w-7" />
              טעיתי 😅
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05, rotate: 2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleAnswer(true)}
              className="flex flex-1 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 p-5 text-lg font-black text-white shadow-xl hover:shadow-2xl transition-all"
            >
              <ThumbsUp className="h-7 w-7" />
              ידעתי! 🎉
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Flashcards;