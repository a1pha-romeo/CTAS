import { useEffect } from 'react';

export default function App() {
  useEffect(() => {
    // Redirect to CTAS vanilla frontend
    window.location.replace('/public/index.html');
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
      <p>Loading Class Timetable Automation System (CTAS)...</p>
    </div>
  );
}
