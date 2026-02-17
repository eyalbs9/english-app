import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { useNavigate } from "react-router-dom";
import { Upload, ArrowRight, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { VocabularyWord } from "@/data/vocabulary";
import { useToast } from "@/hooks/use-toast";

const LoadVocabulary = () => {
  const { allUsers, currentUser, addWordsToUser } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"select-user" | "name-set" | "upload" | "loading" | "preview" | "done">("select-user");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(currentUser?.id || null);
  const [setName, setSetName] = useState("");
  const [extractedWords, setExtractedWords] = useState<{ english: string; hebrew: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const processText = async (text: string) => {
    setStep("loading");
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("translate-words", {
        body: { words: text, action: "extract-and-translate" },
      });
      if (error) throw error;
      const content = data.result;
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("Could not parse response");
      setExtractedWords(JSON.parse(jsonMatch[0]));
      setStep("preview");
    } catch (err) {
      console.error("Error:", err);
      toast({ title: "שגיאה", description: "לא הצלחנו לחלץ מילים. נסה שוב.", variant: "destructive" });
      setStep("upload");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    await processText(text);
  };

  const handlePasteText = async () => {
    const text = await navigator.clipboard.readText();
    if (!text.trim()) {
      toast({ title: "הלוח ריק", variant: "destructive" });
      return;
    }
    await processText(text);
  };

  const handleConfirm = async () => {
    if (!selectedUserId || extractedWords.length === 0) return;

    const newWords: VocabularyWord[] = extractedWords.map((w, i) => ({
      id: `loaded-${Date.now()}-${i}`,
      english: w.english,
      hebrew: w.hebrew,
      known: null,
    }));

    addWordsToUser(selectedUserId, newWords);

    // Save to database as a word set
    const title = setName.trim() || `סט ${new Date().toLocaleDateString("he-IL")}`;
    await supabase.from("word_sets").insert({
      user_id: selectedUserId,
      title,
      words: extractedWords as any,
      cards_count: extractedWords.length,
    } as any);

    setStep("done");
    toast({ title: "הצלחה! 🎉", description: `${newWords.length} מילים נוספו בהצלחה` });
    setTimeout(() => navigate("/dashboard"), 1500);
  };

  const removeWord = (index: number) => {
    setExtractedWords((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8" dir="rtl">
      <div className="mx-auto max-w-2xl">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <button onClick={() => navigate("/dashboard")} className="mb-4 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowRight className="h-4 w-4" />
            <span>חזרה</span>
          </button>
          <h1 className="text-2xl font-bold font-display text-foreground">טעינת אוצר מילים</h1>
          <p className="text-sm text-muted-foreground mt-1">העלה קובץ או הדבק טקסט לחילוץ מילים אוטומטי</p>
        </motion.div>

        {/* Step: Select User */}
        {step === "select-user" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-lg font-bold font-display text-foreground">לאיזה משתמש להוסיף?</h2>
            <div className="grid gap-3">
              {allUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUserId(user.id)}
                  className={`flex items-center gap-3 rounded-2xl p-4 border transition-all ${
                    selectedUserId === user.id ? "border-primary bg-primary/10 shadow-soft" : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  <span className="text-3xl">{user.avatar}</span>
                  <div className="text-right">
                    <p className="font-bold text-card-foreground">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.words.length} מילים</p>
                  </div>
                  {selectedUserId === user.id && <Check className="h-5 w-5 text-primary mr-auto" />}
                </button>
              ))}
            </div>
            <button
              onClick={() => selectedUserId && setStep("name-set")}
              disabled={!selectedUserId}
              className="w-full rounded-2xl bg-primary py-3 text-primary-foreground font-bold font-display disabled:opacity-50 transition-opacity"
            >
              המשך
            </button>
          </motion.div>
        )}

        {/* Step: Name Set */}
        {step === "name-set" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-lg font-bold font-display text-foreground">תנו שם לסט המילים</h2>
            <input
              type="text"
              value={setName}
              onChange={(e) => setSetName(e.target.value)}
              placeholder='לדוגמה: "מבחן ינואר"'
              className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
            <button
              onClick={() => setStep("upload")}
              className="w-full rounded-2xl bg-primary py-3 text-primary-foreground font-bold font-display"
            >
              המשך
            </button>
          </motion.div>
        )}

        {/* Step: Upload */}
        {step === "upload" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".txt,.csv,.pdf,.docx" className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-10 hover:border-primary transition-colors"
            >
              <Upload className="h-12 w-12 text-primary" />
              <p className="font-bold text-foreground">העלה קובץ</p>
              <p className="text-sm text-muted-foreground">TXT, CSV</p>
            </button>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-sm text-muted-foreground">או</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <button
              onClick={handlePasteText}
              className="w-full rounded-2xl bg-card border border-border p-4 text-center font-bold text-foreground hover:bg-muted transition-colors"
            >
              📋 הדבק טקסט מהלוח
            </button>
          </motion.div>
        )}

        {/* Step: Loading */}
        {step === "loading" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4 py-16">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <p className="text-lg font-bold font-display text-foreground">מחלץ ומתרגם מילים...</p>
          </motion.div>
        )}

        {/* Step: Preview */}
        {step === "preview" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold font-display text-foreground">נמצאו {extractedWords.length} מילים</h2>
              <button onClick={() => setStep("upload")} className="text-sm text-muted-foreground hover:text-foreground">העלה מחדש</button>
            </div>
            <div className="max-h-80 overflow-y-auto rounded-2xl border border-border bg-card">
              {extractedWords.map((w, i) => (
                <div key={i} className="flex items-center justify-between border-b border-border last:border-0 px-4 py-3">
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-foreground">{w.english}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-foreground">{w.hebrew}</span>
                  </div>
                  <button onClick={() => removeWord(i)} className="text-destructive text-sm hover:underline">הסר</button>
                </div>
              ))}
            </div>
            <button
              onClick={handleConfirm}
              className="w-full rounded-2xl bg-primary py-3 text-primary-foreground font-bold font-display"
            >
              הוסף {extractedWords.length} מילים ל{allUsers.find((u) => u.id === selectedUserId)?.name}
            </button>
          </motion.div>
        )}

        {/* Step: Done */}
        {step === "done" && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4 py-16">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/20">
              <Check className="h-10 w-10 text-success" />
            </div>
            <p className="text-xl font-bold font-display text-foreground">המילים נוספו בהצלחה! 🎉</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default LoadVocabulary;
