interface IconProps {
  className?: string;
}

export const PencilIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={`${className} fill-current`}>
    <path d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25zM20.7 7a1 1 0 0 0 0-1.4L18.4 3.3a1 1 0 0 0-1.4 0l-1.8 1.8 3.75 3.75L20.7 7z" />
  </svg>
);

export const SearchIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={`${className} fill-current`}>
    <path d="M15.5 14h-.8l-.3-.3a6.5 6.5 0 1 0-.7.7l.3.3v.8l5 5 1.5-1.5-5-5zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z" />
  </svg>
);

export const PhoneIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={`${className} fill-current`}>
    <path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.6a1 1 0 0 1-.25 1l-2.22 2.2z" />
  </svg>
);

export const VideoIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={`${className} fill-current`}>
    <path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z" />
  </svg>
);

export const MoreIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={`${className} fill-current`}>
    <path d="M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
  </svg>
);

export const SendIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={`${className} fill-current`}>
    <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
  </svg>
);

export const PlusIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={`${className} fill-current`}>
    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
  </svg>
);

export const BackIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={`${className} fill-current`}>
    <path d="M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20v-2z" />
  </svg>
);

export const GroupIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={`${className} fill-current`}>
    <path d="M16 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3zm-8 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3zm0 2c-2.3 0-7 1.2-7 3.5V19h14v-2.5C15 14.2 10.3 13 8 13zm8 0c-.3 0-.6 0-1 .05A4.2 4.2 0 0 1 17 16.5V19h6v-2.5c0-2.3-4.7-3.5-7-3.5z" />
  </svg>
);

export const LockIcon = ({ className = "h-3 w-3" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={`${className} fill-current`}>
    <path d="M18 8h-1V6a5 5 0 0 0-10 0v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zM9 6a3 3 0 0 1 6 0v2H9V6z" />
  </svg>
);

export const CheckIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={`${className} fill-current`}>
    <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
  </svg>
);

export const ReplyIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={`${className} fill-current`}>
    <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z" />
  </svg>
);
