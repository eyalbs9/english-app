import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Trash2, Edit2, Globe, Lock, ChevronDown, ChevronUp, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/hooks/use-toast";

interface WordSet {
  id: string;
  user_id: string;
  title: string;
  words: any[];
  cards_count: number;
  is_public: boolean;
  created_at: string;
}

const Management = () => {
  const navigate = useNavigate();
  const { currentUser } = useApp();
  const { toast } = useToast();
  const [sets, setSets] = useState<WordSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSet, setExpandedSet] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      navigate("/");
      return;
    }
    fetchSets();
  }, [currentUser]);

  const fetchSets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("word_sets")
      .select("*")
      .eq("user_id", currentUser!.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setSets(data as unknown as WordSet[]);
    }
    setLoading(false);
  };

  const toggleAccess = async (set: WordSet) => {
    const { error } = await supabase
      .from("word_sets")
      .update({ is_public: !set.is_public } as any)
      .eq("id", set.id);

    if (!error) {
      setSets((prev) =>
        prev.map((s) => (s.id === set.id ? { ...s, is_public: !s.is_public } : s))
      );
    }
  };

  const deleteSet = async (id: string) => {
    const { error } = await supabase.from("word_sets").delete().eq("id", id);
    if (!error) {
      setSets((prev) => prev.filter((s) => s.id !== id));
      toast({ title: "הסט נמחק" });
    }
  };

  const deleteWordFromSet = async (set: WordSet, wordIndex: number) => {
    const updatedWords = set.words.filter((_, i) => i !== wordIndex);
    const { error } = await supabase
      .from("word_sets")
      .update({ words: updatedWords, cards_count: updatedWords.length } as any)
      .eq("id", set.id);

    if (!error) {
      setSets((prev) =>
        prev.map((s) =>
          s.id === set.id ? { ...s, words: updatedWords, cards_count: updatedWords.length } : s
        )
      );
      toast({ title: "המילה נמחקה" });
    }
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8" dir="rtl">
      <div className="mx-auto max-w-4xl">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/dashboard")} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowRight className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold font-display text-foreground">ניהול סטים</h1>
          </div>
        </motion.div>

        {loading ? (
          <p className="text-center text-muted-foreground py-12">טוען...</p>
        ) : sets.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-lg font-display text-muted-foreground">אין סטים עדיין</p>
            <button
              onClick={() => navigate("/load-vocabulary")}
              className="mt-4 rounded-2xl bg-primary px-6 py-2 text-primary-foreground font-bold"
            >
              צור סט חדש
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sets.map((set) => (
              <div key={set.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3">
                  <button
                    onClick={() => setExpandedSet(expandedSet === set.id ? null : set.id)}
                    className="flex items-center gap-2 text-right font-medium text-foreground hover:text-primary transition-colors"
                  >
                    {expandedSet === set.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    <span>{set.title}</span>
                    <span className="text-xs text-muted-foreground">({set.cards_count} כרטיסים)</span>
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleAccess(set)}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        set.is_public ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {set.is_public ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                      {set.is_public ? "ציבורי" : "פרטי"}
                    </button>
                    <span className="text-xs text-muted-foreground">{new Date(set.created_at).toLocaleDateString("he-IL")}</span>
                    <button onClick={() => deleteSet(set.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedSet === set.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-border px-4 py-3">
                        {set.words.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-2">אין מילים בסט</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {set.words.map((word: any, idx: number) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-sm text-foreground"
                              >
                                <span className="font-medium">{word.english}</span>
                                <span className="text-muted-foreground">-</span>
                                <span>{word.hebrew}</span>
                                <button
                                  onClick={() => deleteWordFromSet(set, idx)}
                                  className="mr-1 text-muted-foreground hover:text-destructive transition-colors"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Management;
