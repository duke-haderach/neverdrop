import React, { useEffect, useState } from 'react';
import styles from './Toast.module.css';

export default function Toast({ message, type = 'info', onDone }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 300);
    }, 3000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={`${styles.toast} ${styles[type]} ${visible ? styles.show : ''}`}>
      <span className={styles.icon}>
        {type === 'success' ? '✓' : type === 'warn' ? '⚠' : type === 'danger' ? '✕' : 'ℹ'}
      </span>
      {message}
    </div>
  );
}
