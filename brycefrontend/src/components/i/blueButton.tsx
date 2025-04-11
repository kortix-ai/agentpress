import React from 'react';

interface BlueButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

const BlueButton: React.FC<BlueButtonProps> = ({
  children,
  onClick,
  className = ''
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        relative
        bg-[#2463eb]
        text-white
        px-8
        py-3
        rounded-[32px]
        font-medium
        text-[17px]
        shadow-sm
        hover:bg-[#0070E9]
        active:bg-[#0058B6]
        transition-colors
        ${className}
      `}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none rounded-[32px]" />
      {children}
    </button>
  );
};

export default BlueButton;
