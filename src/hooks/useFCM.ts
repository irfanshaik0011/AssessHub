import { useEffect } from 'react';

export const useFCM = () => {
  useEffect(() => {
    // Push notifications are disabled in this version.
    console.log('FCM module is inactive.');
  }, []);
};