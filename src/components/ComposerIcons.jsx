function IconBase({
  children,
  className = "",
  viewBox = "0 0 24 24",
}) {
  return (
    <svg
      className={`composer-button__icon ${className}`}
      viewBox={viewBox}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function AttachmentIcon() {
  return (
    <IconBase>
      <path
        d="m20.5 11.5-8.7 8.7a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.3 9.3a2 2 0 0 1-2.8-2.8l8.6-8.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconBase>
  );
}

export function MicrophoneIcon() {
  return (
    <IconBase>
      <rect
        x="9"
        y="2"
        width="6"
        height="12"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconBase>
  );
}

export function StopRecordingIcon() {
  return (
    <IconBase className="composer-button__icon--stop">
      <rect
        x="5"
        y="5"
        width="14"
        height="14"
        rx="3"
        fill="currentColor"
      />
    </IconBase>
  );
}

export function SendIcon() {
  return (
    <IconBase className="composer-button__icon--send">
      <path
        d="M3.4 3.2 21 11.3c.8.4.8 1.5 0 1.9L3.4 21.3c-.8.4-1.7-.4-1.4-1.2l2.2-6.4 9.4-1.4-9.4-1.4L2 4.4c-.3-.8.6-1.6 1.4-1.2Z"
        fill="currentColor"
      />
    </IconBase>
  );
}
