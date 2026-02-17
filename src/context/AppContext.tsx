import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { UserProfile, users as defaultUsers, VocabularyWord } from "@/data/vocabulary";
import { db } from "@/firebase"; // ייבוא בסיס הנתונים שיצרנו
import { doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";

interface AppContextType {
  currentUser: UserProfile | null;
  setCurrentUser: (user: UserProfile | null) => void;
  allUsers: UserProfile[];
  updateWordStatus: (wordId: string, known: boolean | null) => void;
  resetWords: () => void;
  getUnknownWords: () => VocabularyWord[];
  addWordsToUser: (userId: string, words: VocabularyWord[]) => void;
  removeWordsFromUser: (userId: string, wordIds: string[]) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUserState] = useState<UserProfile | null>(null);

  // 1. טעינת נתונים מהענן בזמן אמת
  useEffect(() => {
    // אנחנו יוצרים מסמך אחד ב-Firebase שמרכז את כל המשתמשים
    const docRef = doc(db, "appData", "usersConfig");

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAllUsers(data.allUsers || []);
      } else {
        // אם אין עדיין נתונים בענן, נשמור את ברירת המחדל
        setDoc(docRef, { allUsers: defaultUsers });
      }
    });

    return () => unsubscribe();
  }, []);

  // פונקציית עזר לעדכון הענן
  const syncWithCloud = async (newUsers: UserProfile[]) => {
    await setDoc(doc(db, "appData", "usersConfig"), { allUsers: newUsers });
  };

  const setCurrentUser = useCallback((user: UserProfile | null) => {
    setCurrentUserState(user);
  }, []);

  const updateWordStatus = useCallback(async (wordId: string, known: boolean | null) => {
    if (!currentUser) return;
    
    const updatedUsers = allUsers.map(u =>
      u.id === currentUser.id
        ? { ...u, words: u.words.map(w => (w.id === wordId ? { ...w, known } : w)) }
        : u
    );

    setAllUsers(updatedUsers);
    // עדכון המשתמש הנוכחי כדי שהממשק יתעדכן מיד
    const updatedMe = updatedUsers.find(u => u.id === currentUser.id);
    if (updatedMe) setCurrentUserState(updatedMe);
    
    // שמירה לענן
    await syncWithCloud(updatedUsers);
  }, [currentUser, allUsers]);

  const resetWords = useCallback(async () => {
    if (!currentUser) return;
    const updatedUsers = allUsers.map(u =>
      u.id === currentUser.id
        ? { ...u, words: u.words.map(w => ({ ...w, known: null })) }
        : u
    );
    setAllUsers(updatedUsers);
    await syncWithCloud(updatedUsers);
  }, [currentUser, allUsers]);

  const getUnknownWords = useCallback(() => {
    if (!currentUser) return [];
    return currentUser.words.filter(w => w.known === false);
  }, [currentUser]);

  const addWordsToUser = useCallback(async (userId: string, words: VocabularyWord[]) => {
    const updatedUsers = allUsers.map(u =>
      u.id === userId
        ? { 
            ...u, 
            words: [
              ...u.words, 
              ...words.filter(nw => !u.words.some(ew => ew.english.toLowerCase() === nw.english.toLowerCase()))
            ] 
          }
        : u
    );
    setAllUsers(updatedUsers);
    await syncWithCloud(updatedUsers);
  }, [allUsers]);

  const removeWordsFromUser = useCallback(async (userId: string, wordIds: string[]) => {
    const updatedUsers = allUsers.map(u =>
      u.id === userId
        ? { ...u, words: u.words.filter(w => !wordIds.includes(w.id)) }
        : u
    );
    setAllUsers(updatedUsers);
    await syncWithCloud(updatedUsers);
  }, [allUsers]);

  return (
    <AppContext.Provider value={{ currentUser, setCurrentUser, allUsers, updateWordStatus, resetWords, getUnknownWords, addWordsToUser, removeWordsFromUser }}>
      {children}
    </AppContext.Provider>
  );
};