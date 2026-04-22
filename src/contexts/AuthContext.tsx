import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'faculty' | 'student' | 'admin';
  status: 'active' | 'pending' | 'blocked';
  emailVerified: boolean;
  rollNumber?: string;
  branch?: string;
  year?: string;
  section?: string;
  dob?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, requiredRole: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: string, extraData?: any) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  logout: () => void;
  resetPassword: (email: string) => Promise<void>;
  sendMagicLink: (email: string) => Promise<void>;
  completeMagicLinkSignIn: (email: string) => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (firebaseUser: FirebaseUser) => {
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data() as any;
      
      if (userData.status === 'blocked') {
        await signOut(auth);
        throw new Error('Your account has been blocked. Please contact the administrator.');
      }

      return {
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        emailVerified: firebaseUser.emailVerified,
        ...userData
      };
    }
    return null;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const fullUser = await fetchUserData(firebaseUser);
          setUser(fullUser);
        } catch (error) {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string, requiredRole: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    
    if (!userDoc.exists()) {
      await signOut(auth);
      throw new Error('User record not found.');
    }

    const userData = userDoc.data();
    
    // Strict Role Check
    if (userData.role !== requiredRole) {
      await signOut(auth);
      throw new Error(`Access denied. This account is registered as a ${userData.role}. Please use the correct portal.`);
    }

    if (userData.status === 'blocked') {
      await signOut(auth);
      throw new Error('Your account has been blocked. Please contact the administrator.');
    }

    if (!userCredential.user.emailVerified) {
      await sendEmailVerification(userCredential.user);
      throw new Error('Email not verified. A new verification link has been sent.');
    }
  };

  const register = async (email: string, password: string, name: string, role: string, extraData: any = {}) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    const status = role === 'faculty' ? 'pending' : 'active';
    const userData = {
      name,
      role,
      status,
      ...extraData,
      created_at: new Date().toISOString()
    };

    await setDoc(doc(db, 'users', firebaseUser.uid), userData);
    await sendEmailVerification(firebaseUser);
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.id), data);
    setUser(prev => prev ? { ...prev, ...data } : null);
  };

  const logout = () => signOut(auth);
  const resetPassword = (email: string) => sendPasswordResetEmail(auth, email);

  const sendMagicLink = (email: string) => {
    const actionCodeSettings = {
      url: window.location.origin + '/auth/callback',
      handleCodeInApp: true,
    };
    window.localStorage.setItem('emailForSignIn', email);
    return sendSignInLinkToEmail(auth, email, actionCodeSettings);
  };

  const completeMagicLinkSignIn = async (email: string) => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      const userCredential = await signInWithEmailLink(auth, email, window.location.href);
      const userDoc = await getDoc(doc(db, 'users', userCredential.user?.uid || ''));
      if (userDoc.exists() && userDoc.data().status === 'blocked') {
        await signOut(auth);
        throw new Error('Your account has been blocked. Please contact the administrator.');
      }
      window.localStorage.removeItem('emailForSignIn');
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      register, 
      updateProfile,
      logout, 
      resetPassword, 
      sendMagicLink,
      completeMagicLinkSignIn,
      loading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};