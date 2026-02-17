import { motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { useNavigate } from "react-router-dom";
import { BookOpen, PenLine, Layers, ArrowRight, Upload, BookText, Settings } from "lucide-react";

const features = [
  {
    id: "flashcards",
    title: "כרטיסיות",
    subtitle: "Flashcards",
    icon: Layers,
    description: "לימוד מילים עם כרטיסיות",
    path: "/flashcards",
    gradient: "bg-gradient-primary",
  },
  {
    id: "matching",
    title: "התאמת מילה",
    subtitle: "Word Match",
    icon: BookOpen,
    description: "התאימו מילה לתרגום",
    path: "/matching",
    gradient: "bg-gradient-secondary",
  },
  {
    id: "dictation",
    title: "הכתבה",
    subtitle: "Spelling",
    icon: PenLine,
    description: "כתבו את המילה באנגלית",
    path: "/dictation",
    gradient: "bg-gradient-accent",
  },
  {
    id: "load",
    title: "טעינת מילים",
    subtitle: "Load Words",
    icon: Upload,
    description: "העלו קובץ לחילוץ אוצר מילים",
    path: "/load-vocabulary",
    gradient: "bg-gradient-primary",
  },
  {
    id: "story",
    title: "קריאת סיפור",
    subtitle: "Story Reader",
    icon: BookText,
    description: "קראו סיפור באנגלית עם תרגום ושאלות",
    path: "/story",
    gradient: "bg-gradient-secondary",
  },
  {
    id: "management",
    title: "ניהול סטים",
    subtitle: "Management",
    icon: Settings,
    description: "ניהול סטי המילים שלכם",
    path: "/management",
    gradient: "bg-gradient-accent",
  },
];

const Dashboard = () => {
  const { currentUser, setCurrentUser } = useApp();
  const navigate = useNavigate();

  if (!currentUser) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8" dir="rtl">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="text-4xl">{currentUser.avatar}</span>
            <div>
              <h1 className="text-2xl font-bold font-display text-foreground">
                שלום, {currentUser.name}!
              </h1>
              <p className="text-sm text-muted-foreground">
                {currentUser.words.length} מילים באוצר המילים
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setCurrentUser(null);
              navigate("/");
            }}
            className="rounded-xl bg-muted px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-border transition-colors"
          >
            החלף משתמש
          </button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 grid grid-cols-3 gap-3"
        >
          {[
            { label: "סה״כ מילים", value: currentUser.words.length, color: "text-foreground" },
            { label: "ידוע ✓", value: currentUser.words.filter(w => w.known === true).length, color: "text-success" },
            { label: "לא ידוע ✗", value: currentUser.words.filter(w => w.known === false).length, color: "text-destructive" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl bg-card p-4 text-center shadow-soft border border-border">
              <p className={`text-3xl font-bold font-display ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Features */}
        <div className="grid gap-4">
          {features.map((feature, i) => (
            <motion.button
              key={feature.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(feature.path)}
              className="flex items-center gap-4 rounded-2xl bg-card p-5 shadow-card border border-border cursor-pointer hover:shadow-elevated transition-shadow text-right w-full"
            >
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${feature.gradient}`}>
                <feature.icon className="h-7 w-7 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-lg font-bold font-display text-card-foreground">{feature.title}</p>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground rotate-180" />
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
