import React from 'react';
import { User } from 'lucide-react';
import { resolveMediaUrl } from '../services/api';

/**
 * Avatar component that renders a profile picture or a deterministic default.
 */
export default function Avatar({ user, className, onClick }) {
  const name = user?.name || user?.displayHandle || user?.handle || user?.uid || '?';
  const avatarUrl = user?.avatar || user?.photoURL;
  
  if (avatarUrl) {
    return (
      <img
        src={resolveMediaUrl(avatarUrl)}
        alt={name}
        className={`object-cover ${className}`}
        onClick={onClick}
      />
    );
  }

  // Deterministic colors based on name string
  const colors = [
    'bg-teal-500', 'bg-blue-500', 'bg-purple-500', 
    'bg-pink-500', 'bg-amber-500', 'bg-emerald-500',
    'bg-indigo-500', 'bg-rose-500'
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % colors.length;
  const bgColor = colors[colorIndex];
  
  const initial = name.charAt(0).toUpperCase();

  return (
    <div 
      className={`flex items-center justify-center text-white font-bold select-none ${bgColor} ${className}`}
      onClick={onClick}
    >
      {initial !== '?' ? initial : <User className="w-1/2 h-1/2 opacity-75" />}
    </div>
  );
}
