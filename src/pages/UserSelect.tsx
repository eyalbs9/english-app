import { motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { useNavigate } from "react-router-dom";

const UserSelect = () => {
  const { allUsers, setCurrentUser } = useApp();
  const navigate = useNavigate();

  const handleSelect = (user: typeof allUsers[0]) => {
    setCurrentUser(user);
    navigate("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f0f9ff] via-[#f5f3ff] to-[#f0fdf4] p-4 relative overflow-hidden" dir="rtl">
      <div className="w-full max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 text-center"
        >
          <h1 className="mb-2 text-5xl font-bold font-display text-gradient-hero">
            Let's Learn English!
          </h1>
          <p className="text-lg text-muted-foreground font-body">בחרו את המשתמש שלכם</p>
        </motion.div>

        <div className="grid gap-4">
          {allUsers.map((user, i) => (
            <motion.button
              key={user.id}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 * i }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleSelect(user)}
              className="flex items-center gap-5 rounded-2xl bg-card p-6 shadow-card transition-shadow hover:shadow-elevated cursor-pointer border border-border"
            >
              <span className="text-5xl">{user.avatar}</span>
              <div className="text-right">
                <p className="text-2xl font-bold font-display text-card-foreground">{user.name}</p>
                <p className="text-sm text-muted-foreground">{user.words.length} מילים</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserSelect;
