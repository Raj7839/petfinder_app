import React from 'react';
import './Card.css';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'gradient' | 'glow';
  hoverable?: boolean;
  onClick?: () => void;
  padding?: 'sm' | 'md' | 'lg' | 'none';
  style?: React.CSSProperties;
}

export function Card({ children, className = '', variant = 'default', hoverable = false, onClick, padding = 'md', style }: CardProps) {
  return (
    <div
      className={`card card-${variant} card-pad-${padding} ${hoverable ? 'card-hoverable' : ''} ${onClick ? 'card-clickable' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={style}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`card-header ${className}`}>{children}</div>;
}

export function CardBody({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`card-body ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`card-footer ${className}`}>{children}</div>;
}
