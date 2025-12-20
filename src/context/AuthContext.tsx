"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
    onAuthStateChanged,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    User
} from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    login: (identifier: string, password: string, rememberMe?: boolean) => Promise<void>;
    signup: (email: string, password: string, userData: { firstName: string; lastName: string; username: string }) => Promise<void>;
    sendVerification: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthContextProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const loginWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Check if user document exists in Firestore
            const { getFirestore, doc, getDoc, setDoc } = await import("firebase/firestore");
            const db = getFirestore();
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (!userDocSnap.exists()) {
                // Create new user document
                await setDoc(userDocRef, {
                    uid: user.uid,
                    email: user.email,
                    firstName: user.displayName?.split(' ')[0] || '',
                    lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
                    username: user.email?.split('@')[0] || user.uid.substring(0, 8), // Default username
                    createdAt: new Date().toISOString(),
                    photoURL: user.photoURL || null,
                });
            }

        } catch (error) {
            console.error("Google Sign-In Error", error);
            throw error;
        }
    };

    const login = async (identifier: string, password: string, rememberMe: boolean = false) => {
        try {
            // Import persistence persistence
            const { setPersistence, browserLocalPersistence, browserSessionPersistence } = await import("firebase/auth");

            // Set persistence based on checkbox
            await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);

            let email = identifier;

            // Simple check if identifier is an email
            const isEmail = identifier.includes('@');

            if (!isEmail) {
                // If not an email, assume it's a username and look it up
                const { getFirestore, collection, query, where, getDocs } = await import("firebase/firestore");
                const db = getFirestore();
                const usersRef = collection(db, "users");
                const q = query(usersRef, where("username", "==", identifier));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    throw new Error("User not found");
                }

                // Get the email from the first matching document
                email = querySnapshot.docs[0].data().email;
            }

            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.error("Login Error", error);
            throw error;
        }
    }

    const signup = async (email: string, password: string, userData: { firstName: string; lastName: string; username: string }) => {
        try {
            const { user } = await createUserWithEmailAndPassword(auth, email, password);
            // Create user document in Firestore
            const { doc, setDoc, getFirestore } = await import("firebase/firestore");
            const db = getFirestore();
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                email: user.email,
                firstName: userData.firstName,
                lastName: userData.lastName,
                username: userData.username,
                createdAt: new Date().toISOString(),
                photoURL: user.photoURL || null,
            });

            // Send verification email
            const { sendEmailVerification } = await import("firebase/auth");
            await sendEmailVerification(user);

        } catch (error) {
            console.error("Signup Error", error);
            throw error;
        }
    }

    // Helper to manually trigger it
    const sendVerification = async () => {
        if (auth.currentUser) {
            const { sendEmailVerification } = await import("firebase/auth");
            await sendEmailVerification(auth.currentUser);
        }
    }

    const resetPassword = async (email: string) => {
        const { sendPasswordResetEmail } = await import("firebase/auth");
        await sendPasswordResetEmail(auth, email);
    }

    const logout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Sign-Out Error", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout, login, signup, sendVerification, resetPassword }}>
            {children}
        </AuthContext.Provider>
    );
};
