import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Upload, Loader2, X, HelpCircle, Languages, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Question {
  question: string;
  options: string[];
  correctIndex: number;
}

const StoryReader = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<any>(null);
  const bookRef = useRef<any>(null);

  const [bookLoaded, setBookLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [bookTitle, setBookTitle] = useState("");

  const [selectedText, setSelectedText] = useState("");
  const [translation, setTranslation] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [showQuestions, setShowQuestions] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log("Starting to load file:", file.name);
    setIsLoading(true);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      console.log("File read as ArrayBuffer, size:", arrayBuffer.byteLength);

      // Dynamically import epubjs to avoid SSR issues
      const ePubModule = await import("epubjs");
      const ePub = ePubModule.default;
      console.log("ePub module loaded");

      const book = ePub(arrayBuffer as any);
      bookRef.current = book;

      await book.ready;
      console.log("Book ready");

      const metadata = await book.loaded.metadata;
      console.log("Metadata loaded:", metadata);
      setBookTitle(metadata.title || file.name.replace(".epub", ""));
      
      // המתן קצר כדי לוודא שה-DOM מוכן
      await new Promise(resolve => setTimeout(resolve, 50));
      
      console.log("Viewer ref:", viewerRef.current);

      if (viewerRef.current) {
        // Clear previous content
        viewerRef.current.innerHTML = "";
        console.log("Viewer cleared, starting render...");

        const rendition = book.renderTo(viewerRef.current, {
          width: "100%",
          height: 600,
          spread: "none",
          flow: "scrolled-doc",
        });
        
        renditionRef.current = rendition;
        
        // הוספת event listeners לדיבוג
        rendition.on("rendered", (section: any) => {
          console.log("Section rendered:", section);
        });
        
        rendition.on("displayed", (section: any) => {
          console.log("Section displayed:", section);
        });
        
        rendition.on("relocated", (location: any) => {
          console.log("Location changed:", location);
        });
        
        await rendition.display();
        console.log("Display completed successfully!");
        
        // רק עכשיו נעדכן שהספר נטען
        setBookLoaded(true);
        
        toast({ 
          title: "הספר נטען בהצלחה! 📚", 
          description: `${metadata.title || file.name}`,
        });
      } else {
        throw new Error("Viewer element is not available");
      }
    } catch (err) {
      console.error("Error loading EPUB:", err);
      setBookLoaded(false);
      toast({ 
        title: "שגיאה בטעינת הספר", 
        description: err instanceof Error ? err.message : String(err), 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const nextPage = () => {
    if (renditionRef.current) {
      renditionRef.current.next();
      console.log("Next page called");
    }
  };
  
  const prevPage = () => {
    if (renditionRef.current) {
      renditionRef.current.prev();
      console.log("Previous page called");
    }
  };

  const getSelectedText = (): string => {
    // Try to get text from iframe (epub.js renders in iframe)
    const iframe = viewerRef.current?.querySelector("iframe");
    if (iframe?.contentWindow) {
      const sel = iframe.contentWindow.getSelection()?.toString()?.trim();
      if (sel) return sel;
    }
    // Fallback to main window
    return window.getSelection()?.toString()?.trim() ?? "";
  };

  const handleTranslateSelection = async () => {
    const sel = getSelectedText();
    if (!sel) {
      toast({ title: "סמן טקסט לתרגום", variant: "destructive" });
      return;
    }

    setSelectedText(sel);
    setIsTranslating(true);
    setShowTranslation(true);

    try {
      const { data, error } = await supabase.functions.invoke("translate-words", {
        body: { words: sel, action: "translate-text" },
      });
      if (error) throw error;
      setTranslation(data.result);
    } catch (err) {
      console.error("Translation error:", err);
      setTranslation("שגיאה בתרגום");
    } finally {
      setIsTranslating(false);
    }
  };

  const handleGenerateQuestions = async () => {
    const sel = getSelectedText();
    if (!sel || sel.length < 20) {
      toast({ title: "סמן קטע טקסט ארוך יותר ליצירת שאלות", variant: "destructive" });
      return;
    }

    setSelectedText(sel);
    setIsGeneratingQuestions(true);
    setShowQuestions(true);
    setSelectedAnswers({});

    try {
      const { data, error } = await supabase.functions.invoke("translate-words", {
        body: { words: sel, action: "generate-questions" },
      });
      if (error) throw error;
      const content = data.result;
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("Could not parse questions");
      setQuestions(JSON.parse(jsonMatch[0]));
    } catch (err) {
      console.error("Question generation error:", err);
      toast({ title: "שגיאה ביצירת שאלות", variant: "destructive" });
      setShowQuestions(false);
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const answerQuestion = (qIndex: number, optionIndex: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [qIndex]: optionIndex }));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="p-4 border-b border-border bg-card shadow-sm"
      >
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate("/dashboard")} 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
            <BookOpen className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold font-display text-foreground">
              {bookTitle || "קריאת סיפור"}
            </h1>
          </div>
          {bookLoaded && (
            <div className="flex items-center gap-2">
              <button 
                onClick={handleTranslateSelection} 
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-bold text-white shadow-lg hover:shadow-xl transition-all"
              >
                <Languages className="h-4 w-4" />
                תרגם
              </button>
              <button 
                onClick={handleGenerateQuestions} 
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-2 text-sm font-bold text-white shadow-lg hover:shadow-xl transition-all"
              >
                <HelpCircle className="h-4 w-4" />
                שאלות
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        {!bookLoaded && !isLoading && (
          <div className="flex-1 flex items-center justify-center p-8">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".epub" 
              className="hidden" 
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-primary/40 bg-gradient-to-br from-primary/5 to-primary/10 p-16 hover:border-primary hover:bg-primary/10 transition-all shadow-lg"
            >
              <Upload className="h-20 w-20 text-primary" />
              <p className="text-2xl font-black font-display text-foreground">העלה ספר EPUB</p>
              <p className="text-base text-muted-foreground">בחר קובץ EPUB לקריאה</p>
            </motion.button>
          </div>
        )}

        {isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-16 w-16 text-primary animate-spin" />
            <p className="text-lg font-bold text-muted-foreground">טוען את הספר...</p>
          </div>
        )}

        {/* EPUB Viewer - תמיד מרונדר, מוסתר כשאין ספר */}
        <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full">
          {/* EPUB Viewer with fixed styling */}
          <div 
            ref={viewerRef} 
            className={`flex-1 bg-card rounded-2xl shadow-elevated border border-border m-4 overflow-hidden ${!bookLoaded ? 'hidden' : ''}`}
            style={{ 
              minHeight: "600px",
              maxHeight: "calc(100vh - 250px)"
            }}
            dir="ltr" 
          />
          
          {/* Navigation buttons */}
          {bookLoaded && (
            <div className="flex items-center justify-center gap-4 p-4">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={prevPage} 
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-gray-600 to-gray-700 px-8 py-3 text-base font-bold text-white shadow-lg hover:shadow-xl transition-all"
              >
                ← הקודם
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={nextPage} 
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600 px-8 py-3 text-base font-bold text-white shadow-lg hover:shadow-xl transition-all"
              >
                הבא →
              </motion.button>
            </div>
          )}
        </div>
      </div>

      {/* Translation Panel */}
      <AnimatePresence>
        {showTranslation && (
          <motion.div 
            initial={{ y: 300, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: 300, opacity: 0 }} 
            className="fixed bottom-0 left-0 right-0 bg-card border-t-2 border-primary shadow-2xl p-6 rounded-t-3xl z-50"
          >
            <div className="mx-auto max-w-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-black font-display text-foreground">תרגום</h3>
                <motion.button 
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowTranslation(false)}
                >
                  <X className="h-6 w-6 text-muted-foreground" />
                </motion.button>
              </div>
              <div className="rounded-xl bg-muted p-4 mb-3">
                <p className="text-xs font-bold text-muted-foreground mb-2">אנגלית:</p>
                <p className="text-base text-foreground" dir="ltr">{selectedText}</p>
              </div>
              <div className="rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-2 border-blue-500/20 p-4">
                <p className="text-xs font-bold text-muted-foreground mb-2">עברית:</p>
                {isTranslating ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                    <span className="text-muted-foreground">מתרגם...</span>
                  </div>
                ) : (
                  <p className="text-base font-bold text-foreground">{translation}</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Questions Panel */}
      <AnimatePresence>
        {showQuestions && (
          <motion.div 
            initial={{ y: 300, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: 300, opacity: 0 }} 
            className="fixed bottom-0 left-0 right-0 bg-card border-t-2 border-purple-500 shadow-2xl p-6 rounded-t-3xl z-50 max-h-[70vh] overflow-y-auto"
          >
            <div className="mx-auto max-w-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-black font-display text-foreground">שאלות הבנה</h3>
                <motion.button 
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowQuestions(false)}
                >
                  <X className="h-6 w-6 text-muted-foreground" />
                </motion.button>
              </div>
              {isGeneratingQuestions ? (
                <div className="flex flex-col items-center gap-3 py-12">
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  <span className="text-lg font-bold text-muted-foreground">מייצר שאלות...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {questions.map((q, qi) => (
                    <motion.div 
                      key={qi}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: qi * 0.1 }}
                      className="rounded-2xl border-2 border-border bg-gradient-to-br from-card to-card/80 p-5 shadow-lg"
                    >
                      <p className="font-black text-lg text-foreground mb-4">
                        {qi + 1}. {q.question}
                      </p>
                      <div className="grid gap-3">
                        {q.options.map((opt, oi) => {
                          const isSelected = selectedAnswers[qi] === oi;
                          const isCorrect = q.correctIndex === oi;
                          const hasAnswered = selectedAnswers[qi] !== undefined;
                          
                          let optClass = "border-2 border-border bg-card hover:bg-muted hover:border-primary/50";
                          if (hasAnswered && isSelected && isCorrect) {
                            optClass = "border-2 border-green-500 bg-gradient-to-r from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30";
                          } else if (hasAnswered && isSelected && !isCorrect) {
                            optClass = "border-2 border-red-500 bg-gradient-to-r from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30";
                          } else if (hasAnswered && isCorrect) {
                            optClass = "border-2 border-green-500 bg-gradient-to-r from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30";
                          }
                          
                          return (
                            <motion.button 
                              key={oi}
                              whileHover={!hasAnswered ? { scale: 1.02, x: 5 } : {}}
                              whileTap={!hasAnswered ? { scale: 0.98 } : {}}
                              onClick={() => !hasAnswered && answerQuestion(qi, oi)} 
                              disabled={hasAnswered} 
                              className={`rounded-xl p-4 text-right font-bold transition-all ${optClass}`}
                            >
                              <span className="text-foreground">{opt}</span>
                            </motion.button>
                          );
                        })}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StoryReader;