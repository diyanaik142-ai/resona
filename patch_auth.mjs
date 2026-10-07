import fs from 'fs';

let content = fs.readFileSync('src/context/AuthContext.jsx', 'utf8');

// 1. Update imports
content = content.replace(
  `import { auth as firebaseAuth } from '../firebase';`,
  `import { auth as firebaseAuth, getAccountAuth } from '../firebase';`
);

// 2. Add activeAccountEmail state
content = content.replace(
  `  const [authError, setAuthError] = useState(null);`,
  `  const [authError, setAuthError] = useState(null);\n  const [activeAccountEmail, setActiveAccountEmail] = useState(() => localStorage.getItem('resona_active_account_email') || null);`
);

// 3. Update useEffect for PROD onAuthStateChanged
content = content.replace(
  `    if (import.meta.env?.PROD) {
      const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {`,
  `    if (import.meta.env?.PROD) {
      const activeAuth = activeAccountEmail ? getAccountAuth(activeAccountEmail) : firebaseAuth;
      const unsubscribe = onAuthStateChanged(activeAuth, async (firebaseUser) => {`
);

content = content.replace(
  `  }, []);`,
  `  }, [activeAccountEmail]);`
);

// 4. Implement switchAccount
content = content.replace(
  `  // Login handler`,
  `  // Switch Account handler
  const switchAccount = async (email) => {
    try {
      setLoading(true);
      const saved = JSON.parse(localStorage.getItem('resona_saved_accounts') || '[]');
      const account = saved.find(a => a.email === email);
      if (!account) throw new Error("Account not found");

      localStorage.setItem('resona_active_account_email', email);
      setActiveAccountEmail(email);
      setToken(account.token);
      localStorage.setItem('resona_session_id', account.sessionId);

      setUser(null);
      setPreferences(null);
      setShelf({ likedTrackIds: [], playlists: [], recentlyPlayed: [] });
      setCreatorData(null);
      setSocialData(null);
      
      if (!import.meta.env?.PROD) {
         await refreshAccountData();
      }
    } catch (err) {
      console.error("Switch account error", err);
    } finally {
      if (!import.meta.env?.PROD) setLoading(false);
    }
  };

  // Login handler`
);

// 5. Update login and register to use getAccountAuth and setActiveAccountEmail
content = content.replace(
  `const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);`,
  `const accountAuth = getAccountAuth(email);
        const credential = await signInWithEmailAndPassword(accountAuth, email, password);`
);

content = content.replace(
  `const credential = await createUserWithEmailAndPassword(firebaseAuth, formData.email, formData.password);`,
  `const accountAuth = getAccountAuth(formData.email);
        const credential = await createUserWithEmailAndPassword(accountAuth, formData.email, formData.password);`
);

// 6. Update localStorage.setItem('resona_saved_accounts') to also set resona_active_account_email
content = content.replace(
  `localStorage.setItem('resona_saved_accounts', JSON.stringify(updated));
      } catch (e) {}
      
      return { user: activeUser };`,
  `localStorage.setItem('resona_saved_accounts', JSON.stringify(updated));
        localStorage.setItem('resona_active_account_email', email);
        setActiveAccountEmail(email);
      } catch (e) {}
      
      return { user: activeUser };`
);

// Register has formData.email to email mapping:
content = content.replace(
  `localStorage.setItem('resona_saved_accounts', JSON.stringify(updated));
      } catch (e) {}
      
      return { user: activeUser };`,
  `localStorage.setItem('resona_saved_accounts', JSON.stringify(updated));
        localStorage.setItem('resona_active_account_email', email);
        setActiveAccountEmail(email);
      } catch (e) {}
      
      return { user: activeUser };`
);

// 7. Update logout to remove from resona_saved_accounts correctly and pick next active account
content = content.replace(
  `        try {
          const saved = JSON.parse(localStorage.getItem('resona_saved_accounts') || '[]');
          const updated = saved.filter(a => a.email !== user.email);
          localStorage.setItem('resona_saved_accounts', JSON.stringify(updated));
        } catch (e) {}
      }
      setToken(null);
      localStorage.removeItem('resona_session_id');
      setUser(null);`,
  `        try {
          const saved = JSON.parse(localStorage.getItem('resona_saved_accounts') || '[]');
          const updated = saved.filter(a => a.email !== user.email);
          localStorage.setItem('resona_saved_accounts', JSON.stringify(updated));
          
          if (updated.length > 0) {
             const nextAcc = updated[0];
             switchAccount(nextAcc.email);
             return;
          } else {
             localStorage.removeItem('resona_active_account_email');
             setActiveAccountEmail(null);
          }
        } catch (e) {}
      }
      setToken(null);
      localStorage.removeItem('resona_session_id');
      setUser(null);`
);

// 8. Add switchAccount to context value
content = content.replace(
  `    login,
    register,
    logout,`,
  `    login,
    register,
    logout,
    switchAccount,`
);

// We need to also patch the logout call to signOut from active auth instance
content = content.replace(
  `} else if (import.meta.env?.PROD) {
        await signOut(firebaseAuth);
      } else {`,
  `} else if (import.meta.env?.PROD) {
        const activeAuth = activeAccountEmail ? getAccountAuth(activeAccountEmail) : firebaseAuth;
        await signOut(activeAuth);
      } else {`
);

fs.writeFileSync('src/context/AuthContext.jsx', content, 'utf8');
console.log('Patched AuthContext.jsx');
